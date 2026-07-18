// Data layer for GameEvents, backed by Upstash Redis. Everything is scoped by an
// event slug so one deployment can run many independent events.
//
// A GameEvent config is a single JSON blob at `event:<slug>:config`; the slug is
// tracked in the `events` SET. Two run modes share the same event:
//
//   offline (player_per_group == 1): one device per group enters a free-text name
//     and draws one envelope from a shared bag. Draw is UNIFORM over the cards not
//     yet at cap (flat probability), name-locked, atomic. Bag refills when empty.
//
//   online (player_per_group  > 1): every player opens the card. Openers fill
//     groups sequentially (group g = ceil(slot / player_per_group)) so a group is
//     filled before the next opens; group -> card is round-robin (g-1) mod M, which
//     is flat across groups and simply wraps ("resets") past capacity.
//
// @upstash/redis — Redis.fromEnv() reads UPSTASH_REDIS_REST_URL / _TOKEN.

import { Redis } from "@upstash/redis";
import { isValidEventSlug } from "./validate.js";

const redis = Redis.fromEnv();

const LOCK_TTL = 6 * 60 * 60; // 6h — the event window (seconds)

// ---- key schema (per-event) ----
const EVENTS_SET = "events";
const cfgKey = (slug) => `event:${slug}:config`;
const poolKey = (slug) => `event:${slug}:pool`;
const reportsKey = (slug) => `event:${slug}:reports`;
const groupLockKey = (slug, date, name) => `event:${slug}:group:${date}:${name}`; // offline name lock
const openersKey = (slug, date) => `event:${slug}:openers:${date}`; // online opener counter
const openerKey = (slug, date, pid) => `event:${slug}:opener:${date}:${pid}`; // online per-player slot
const grpPrefix = (slug, date) => `event:${slug}:grp:${date}:`; // online group -> card (dynamic suffix g)

// Server date (UTC) — scopes locks and reports to an event day.
export const today = () => new Date().toISOString().slice(0, 10);

// ---- config CRUD ----

// Apply defaults + coerce a raw config object into the canonical GameEvent shape.
export function normalizeConfig(raw = {}) {
  const ppg = Math.max(1, Math.floor(Number(raw.player_per_group) || 1));
  const cap = Math.max(1, Math.floor(Number(raw.max_group_per_mission_card) || 5));
  const report_summary = Array.isArray(raw.report_summary)
    ? raw.report_summary.map((f) => ({
        label: String(f.label || ""),
        hints: { en: String(f.hints?.en || ""), id: String(f.hints?.id || "") },
      }))
    : [];
  const missionCards = Array.isArray(raw.missionCards)
    ? raw.missionCards.map((c) => ({
        mission_slug: String(c.mission_slug || ""),
        ayat_slug: String(c.ayat_slug || ""),
        ayat: {
          ref: String(c.ayat?.ref || ""),
          arabic: String(c.ayat?.arabic || ""),
          translation: {
            en: String(c.ayat?.translation?.en || ""),
            id: String(c.ayat?.translation?.id || ""),
          },
        },
        mission_statement: {
          en: {
            title: String(c.mission_statement?.en?.title || ""),
            prompt: String(c.mission_statement?.en?.prompt || ""),
          },
          id: {
            title: String(c.mission_statement?.id?.title || ""),
            prompt: String(c.mission_statement?.id?.prompt || ""),
          },
        },
      }))
    : [];
  return {
    event_slug: String(raw.event_slug || ""),
    title: String(raw.title || ""),
    player_per_group: ppg,
    max_group_per_mission_card: cap,
    report_summary,
    missionCards,
  };
}

export async function listEvents() {
  const slugs = await redis.smembers(EVENTS_SET);
  return Array.isArray(slugs) ? slugs.sort() : [];
}

export async function getEventConfig(slug) {
  if (!isValidEventSlug(slug)) return null;
  const raw = await redis.get(cfgKey(slug));
  if (raw == null) return null;
  const obj = typeof raw === "string" ? JSON.parse(raw) : raw;
  return normalizeConfig(obj);
}

export async function saveEventConfig(cfg) {
  const norm = normalizeConfig(cfg);
  if (!isValidEventSlug(norm.event_slug)) throw new Error("invalid_slug");
  await redis.set(cfgKey(norm.event_slug), JSON.stringify(norm));
  await redis.sadd(EVENTS_SET, norm.event_slug);
  return norm;
}

export async function deleteEvent(slug) {
  if (!isValidEventSlug(slug)) throw new Error("invalid_slug");
  await redis.del(cfgKey(slug), poolKey(slug), reportsKey(slug));
  await redis.srem(EVENTS_SET, slug);
  return { ok: true };
}

// ---- offline draw (uniform among available cards) ----
// -2 sentinel => group name already taken (no draw happened).
const DRAW_OFFLINE_LUA = `
local pool = KEYS[1]
local gkey = KEYS[2]
local n = tonumber(ARGV[1])
local cap = tonumber(ARGV[2])
if redis.call('EXISTS', gkey) == 1 then return { -2, -2 } end
local avail = {}
local total = 0
for i = 0, n - 1 do
  local v = tonumber(redis.call('HGET', pool, 'm' .. i))
  if v == nil then v = cap; redis.call('HSET', pool, 'm' .. i, cap) end
  if v > 0 then avail[#avail + 1] = i end
  total = total + v
end
if #avail == 0 then
  total = 0
  for i = 0, n - 1 do redis.call('HSET', pool, 'm' .. i, cap); avail[#avail + 1] = i; total = total + cap end
end
local idx = math.floor(tonumber(ARGV[3]) * #avail) + 1
if idx > #avail then idx = #avail end
local chosen = avail[idx]
redis.call('HINCRBY', pool, 'm' .. chosen, -1)
redis.call('SET', gkey, chosen, 'EX', tonumber(ARGV[4]))
return { chosen, total - 1 }
`;

export async function drawOffline({ slug, name, cfg, date = today(), r }) {
  const n = cfg.missionCards.length;
  const cap = cfg.max_group_per_mission_card;
  const rnd = typeof r === "number" ? r : Math.random();
  const res = await redis.eval(
    DRAW_OFFLINE_LUA,
    [poolKey(slug), groupLockKey(slug, date, name)],
    [String(n), String(cap), String(rnd), String(LOCK_TTL)]
  );
  const [chosen, remaining] = res;
  if (Number(chosen) === -2) return { inUse: true };
  return { mission: Number(chosen), remaining: Number(remaining) };
}

// ---- online join (sequential fill + round-robin card) ----
// Idempotent per playerId (a refresh returns the same slot/group/card).
const JOIN_ONLINE_LUA = `
local openers = KEYS[1]
local opener = KEYS[2]
local prefix = ARGV[1]
local P = tonumber(ARGV[2])
local M = tonumber(ARGV[3])
local ttl = tonumber(ARGV[4])
local slot
local existing = redis.call('GET', opener)
if existing then
  slot = tonumber(existing)
else
  slot = redis.call('INCR', openers)
  redis.call('EXPIRE', openers, ttl)
  redis.call('SET', opener, slot, 'EX', ttl)
end
local g = math.floor((slot - 1) / P) + 1
local gkey = prefix .. g
local card = redis.call('GET', gkey)
if not card then
  card = (g - 1) % M
  redis.call('SET', gkey, card, 'EX', ttl)
end
return { g, tonumber(card), slot }
`;

export async function joinOnline({ slug, playerId, cfg, date = today() }) {
  const P = cfg.player_per_group;
  const M = cfg.missionCards.length;
  const res = await redis.eval(
    JOIN_ONLINE_LUA,
    [openersKey(slug, date), openerKey(slug, date, playerId)],
    [grpPrefix(slug, date), String(P), String(M), String(LOCK_TTL)]
  );
  const [group, card] = res;
  return { group: Number(group), mission: Number(card) };
}

// The card a group is locked to (or null). `online` picks which lock to read.
export async function getGroupCard({ slug, date, groupKey: gk, online }) {
  const key = online ? grpPrefix(slug, date) + gk : groupLockKey(slug, date, gk);
  const v = await redis.get(key);
  return v == null ? null : Number(v);
}

// ---- reports ----
// One per group per day (latest wins). `group` is the display label.
export async function saveReport({ slug, date, groupKey: gk, group, fields, mission, ref }) {
  const submittedAt = new Date().toISOString();
  const record = { group, fields, mission, ref, submittedAt };
  await redis.hset(reportsKey(slug), { [`${date}:${gk}`]: JSON.stringify(record) });
  return record;
}

// All reports for an event, newest first. @upstash/redis may auto-parse JSON.
export async function getReports(slug) {
  const all = await redis.hgetall(reportsKey(slug));
  if (!all) return [];
  const parse = (v) => (typeof v === "string" ? JSON.parse(v) : v);
  return Object.values(all)
    .map(parse)
    .sort((a, b) => (a.submittedAt < b.submittedAt ? 1 : -1));
}

// Admin: reset the offline bag — every mission count back to cap.
export async function resetPool({ slug, cfg }) {
  const fields = {};
  for (let i = 0; i < cfg.missionCards.length; i++) fields[`m${i}`] = cfg.max_group_per_mission_card;
  await redis.hset(poolKey(slug), fields);
  return { ok: true };
}
