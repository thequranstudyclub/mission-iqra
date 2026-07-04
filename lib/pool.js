// Shared envelope pool + group locks + report log, backed by Upstash Redis.
//
// Pool: 20 envelopes = 4 missions × 5 copies, hash `himmah:pool` fields m0..m3.
// The draw is keyed by group name + date: the first draw for a name atomically
// locks it (himmah:group:<date>:<name>) AND pulls one envelope from the pool, in
// a single Lua script so concurrent same-name draws can't both succeed. A second
// attempt on a taken name returns the -2 sentinel → "group name already in use".
// This replaces the old per-device return fail-safe.
//
// @upstash/redis v1.38 — Redis.fromEnv() reads UPSTASH_REDIS_REST_URL / _TOKEN.

import { Redis } from "@upstash/redis";

const redis = Redis.fromEnv();

const POOL_KEY = "himmah:pool";
const REPORTS_KEY = "himmah:reports";
const N_MISSIONS = 4;
const COPIES = 5;
const LOCK_TTL = 6 * 60 * 60; // 6h — the event window
const groupKeyFor = (date, name) => `himmah:group:${date}:${name}`;

// Server date (UTC) — scopes group locks and reports to an event day so names
// are reusable on a different day.
export const today = () => new Date().toISOString().slice(0, 10);

// Draw one envelope, keyed by group name.
//   -2 => group name already taken (no draw happened)
// Otherwise: fair weighted-by-remaining select against client random r∈[0,1);
// refills to a full bag of 20 when empty; locks the name to the chosen mission.
// ARGV: r, ttl.  Returns { chosen, remaining }.
const DRAW_LUA = `
local pool = KEYS[1]
local groupKey = KEYS[2]
local n = ${N_MISSIONS}
local copies = ${COPIES}
if redis.call('EXISTS', groupKey) == 1 then return { -2, -2 } end
local c = {}
local total = 0
for i = 0, n - 1 do
  local v = tonumber(redis.call('HGET', pool, 'm' .. i))
  if v == nil then v = copies; redis.call('HSET', pool, 'm' .. i, copies) end
  c[i] = v
  total = total + v
end
if total <= 0 then
  for i = 0, n - 1 do c[i] = copies; redis.call('HSET', pool, 'm' .. i, copies) end
  total = n * copies
end
local r = tonumber(ARGV[1]) * total
local acc = 0
local chosen = n - 1
for i = 0, n - 1 do
  acc = acc + c[i]
  if r < acc then chosen = i; break end
end
redis.call('HINCRBY', pool, 'm' .. chosen, -1)
redis.call('SET', groupKey, chosen, 'EX', tonumber(ARGV[2]))
return { chosen, total - 1 }
`;

export async function drawMission({ r, group, date }) {
  const res = await redis.eval(
    DRAW_LUA,
    [POOL_KEY, groupKeyFor(date, group)],
    [String(r), String(LOCK_TTL)]
  );
  const [chosen, remaining] = res;
  if (Number(chosen) === -2) return { inUse: true };
  return { mission: Number(chosen), remaining: Number(remaining) };
}

// The mission a group is currently locked to (or null if none / expired).
export async function getGroupMission({ date, group }) {
  const v = await redis.get(groupKeyFor(date, group));
  return v == null ? null : Number(v);
}

// Save (overwrite) a group's report. One per group per day; refreshes submittedAt.
export async function saveReport({ date, group, reveal, logic, action, mission, ref }) {
  const submittedAt = new Date().toISOString();
  const record = { group, reveal, logic, action, mission, ref, submittedAt };
  await redis.hset(REPORTS_KEY, { [`${date}:${group}`]: JSON.stringify(record) });
  return record;
}

// All reports as an array (newest first). @upstash/redis auto-parses JSON string
// values into objects on HGETALL, so guard for both string and object.
export async function getAllReports() {
  const all = await redis.hgetall(REPORTS_KEY);
  if (!all) return [];
  const parse = (v) => (typeof v === "string" ? JSON.parse(v) : v);
  return Object.values(all)
    .map(parse)
    .sort((a, b) => (a.submittedAt < b.submittedAt ? 1 : -1));
}

// Admin: reset every mission count back to 5.
export async function resetPool() {
  await redis.hset(POOL_KEY, { m0: 5, m1: 5, m2: 5, m3: 5 });
}
