// Shared envelope pool backed by Upstash Redis.
// The pool is 20 envelopes = 4 missions × 5 copies, stored as a hash
// `himmah:pool` with fields m0..m3 (counts). All mutation happens inside atomic
// Lua scripts via redis.eval(script, keys, args) so concurrent draws/returns
// from many devices can never race (double-draw the "last" envelope or drift
// the count). @upstash/redis v1.38 — Redis.fromEnv() reads
// UPSTASH_REDIS_REST_URL / UPSTASH_REDIS_REST_TOKEN.

import { Redis } from "@upstash/redis";

const redis = Redis.fromEnv();

const POOL_KEY = "himmah:pool";
const N_MISSIONS = 4;
const COPIES = 5;
const CLAIM_TTL = 6 * 60 * 60; // 6h — the event window
const claimKeyFor = (id) => `himmah:claim:${id}`;

// Draw one envelope. Fair without replacement: pick mission i with probability
// count[i]/total (cumulative-weight select against a client-supplied random
// r∈[0,1)). Refills to a full bag of 20 when empty. Records the claim so the
// same device's reload (and the return fail-safe) can reference it.
// Returns { chosen, remaining }.  ARGV: r, claimId, ttl.
const DRAW_LUA = `
local pool = KEYS[1]
local claimKey = KEYS[2]
local n = ${N_MISSIONS}
local copies = ${COPIES}
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
redis.call('SET', claimKey, chosen, 'EX', tonumber(ARGV[3]))
return { chosen, total - 1 }
`;

// Return an envelope. Idempotent: only if the claim still exists do we give the
// copy back (capped at 5) and delete the claim; a double-tap or a press after
// reload is a no-op (returns mission -1). Returns { mission, remaining }.
const RETURN_LUA = `
local pool = KEYS[1]
local claimKey = KEYS[2]
local n = ${N_MISSIONS}
local copies = ${COPIES}
local mission = redis.call('GET', claimKey)
if not mission then return { -1, -1 } end
mission = tonumber(mission)
local cur = tonumber(redis.call('HGET', pool, 'm' .. mission)) or 0
if cur < copies then redis.call('HINCRBY', pool, 'm' .. mission, 1) end
redis.call('DEL', claimKey)
local total = 0
for i = 0, n - 1 do
  total = total + (tonumber(redis.call('HGET', pool, 'm' .. i)) or 0)
end
return { mission, total }
`;

export async function drawMission({ r, claimId }) {
  const res = await redis.eval(
    DRAW_LUA,
    [POOL_KEY, claimKeyFor(claimId)],
    [String(r), claimId, String(CLAIM_TTL)]
  );
  const [chosen, remaining] = res;
  return { mission: Number(chosen), remaining: Number(remaining) };
}

export async function returnMission({ claimId }) {
  const res = await redis.eval(RETURN_LUA, [POOL_KEY, claimKeyFor(claimId)], []);
  const [mission, remaining] = res;
  return { mission: Number(mission), remaining: Number(remaining) };
}
