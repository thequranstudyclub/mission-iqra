// Distribution simulation + acceptance test for the mission-card draw.
// Replicates the two offline selection algorithms in plain JS (faithful to the
// Lua) so we can Monte-Carlo them without Redis, and checks the online
// round-robin. Acceptance: the NEW uniform selector keeps every mission within
// tolerance of N/M over many draws (feedback item 2 — flat distribution).
//
// Usage: node scripts/sim-draw.mjs [draws] [M] [cap]

const DRAWS = Number(process.argv[2]) || 20000;
const M = Number(process.argv[3]) || 4;
const CAP = Number(process.argv[4]) || 5;

// OLD: weighted-by-remaining, default index = last (mirrors the original Lua).
function drawOld(bag) {
  let total = bag.reduce((a, b) => a + b, 0);
  if (total <= 0) {
    for (let i = 0; i < M; i++) bag[i] = CAP;
    total = M * CAP;
  }
  const r = Math.random() * total;
  let acc = 0;
  let chosen = M - 1; // default = last bucket
  for (let i = 0; i < M; i++) {
    acc += bag[i];
    if (r < acc) {
      chosen = i;
      break;
    }
  }
  bag[chosen]--;
  return chosen;
}

// NEW: uniform over cards with remaining > 0; refill when all empty.
function drawNew(bag) {
  let avail = [];
  for (let i = 0; i < M; i++) if (bag[i] > 0) avail.push(i);
  if (avail.length === 0) {
    for (let i = 0; i < M; i++) bag[i] = CAP;
    avail = [...Array(M).keys()];
  }
  let idx = Math.floor(Math.random() * avail.length);
  if (idx >= avail.length) idx = avail.length - 1;
  const chosen = avail[idx];
  bag[chosen]--;
  return chosen;
}

function run(fn) {
  const bag = Array(M).fill(CAP);
  const counts = Array(M).fill(0);
  for (let i = 0; i < DRAWS; i++) counts[fn(bag)]++;
  return counts;
}

function online() {
  // group g -> card (g-1) mod M, one group per draw
  const counts = Array(M).fill(0);
  for (let g = 1; g <= DRAWS; g++) counts[(g - 1) % M]++;
  return counts;
}

function report(name, counts) {
  const expected = DRAWS / M;
  const pct = counts.map((c) => ((c / DRAWS) * 100).toFixed(1) + "%");
  const maxDev = Math.max(...counts.map((c) => Math.abs(c - expected) / expected));
  console.log(`${name.padEnd(22)} counts=[${counts.join(", ")}] pct=[${pct.join(", ")}] maxDev=${(maxDev * 100).toFixed(2)}%`);
  return maxDev;
}

console.log(`Simulating ${DRAWS} draws, M=${M} cards, cap=${CAP} (expected ${DRAWS / M} each)\n`);
report("OLD weighted-remaining", run(drawOld));
const devNew = report("NEW uniform-available", run(drawNew));
report("ONLINE round-robin", online());

// Acceptance: new uniform selector within 5% relative of flat.
const TOL = 0.05;
if (devNew > TOL) {
  console.error(`\nFAIL: uniform selector deviation ${(devNew * 100).toFixed(2)}% exceeds ${TOL * 100}%`);
  process.exit(1);
}
console.log(`\nPASS: uniform selector within ${TOL * 100}% of flat.`);
