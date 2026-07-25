// Guards for lib/quran.js. The critical invariant: this module is imported IN THE
// BROWSER by events.html (for the slug helpers), so its top-level static imports
// must all be relative. A bare specifier like `@quranjs/api/server` resolves fine
// in Node but throws "Failed to resolve module specifier" in the browser, which
// kills the whole events.html module script (regression fixed in 063a441). Node's
// own import cannot detect this, so we assert it at the source level.

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const quranPath = fileURLToPath(new URL("../lib/quran.js", import.meta.url));
const source = readFileSync(quranPath, "utf8");

test("top-level static imports are all relative (browser-safe)", () => {
  // Match `import ... from "<spec>"` / `import "<spec>"` at the start of a line
  // (top-level). Comments start with `//` so they never match `^\s*import`.
  const importRe = /^\s*import\s+(?:[^"']*?\sfrom\s+)?["']([^"']+)["']/gm;
  const bare = [];
  for (const m of source.matchAll(importRe)) {
    const spec = m[1];
    if (!spec.startsWith("./") && !spec.startsWith("../") && !spec.startsWith("/")) {
      bare.push(spec);
    }
  }
  assert.deepEqual(
    bare,
    [],
    `lib/quran.js has top-level static import(s) of bare specifier(s): ${bare.join(", ")}. ` +
      `This module is imported in the browser by events.html — bare specifiers break there. ` +
      `Import server-only packages dynamically inside a function instead (see qfClient).`
  );
});

test("the QF SDK is imported dynamically (server-only), not statically", () => {
  assert.match(
    source,
    /await import\(\s*["']@quranjs\/api\/server["']\s*\)/,
    "expected `await import(\"@quranjs/api/server\")` inside a function so the SDK never enters the browser module graph"
  );
});

test("slug helpers work with no network and no SDK/creds", async () => {
  const { parseAyatSlug, isValidAyatSlug, formatRef, buildAyatSlug } = await import("../lib/quran.js");
  assert.deepEqual(parseAyatSlug("57.Al-Hadid: 20"), { surah: 57, name: "Al-Hadid", start: 20, end: 20 });
  assert.deepEqual(parseAyatSlug("96.Al-Alaq: 4-5"), { surah: 96, name: "Al-Alaq", start: 4, end: 5 });
  assert.equal(parseAyatSlug("garbage"), null);
  assert.equal(isValidAyatSlug("96.Al-Alaq: 4-5"), true);
  assert.equal(isValidAyatSlug("96.Al-Alaq: 999"), false); // beyond surah ayah count
  assert.equal(formatRef("96.Al-Alaq: 4-5"), "QS. Al-Alaq: 4-5");
  assert.equal(buildAyatSlug(96, 1), "96.Al-Alaq: 1");
});

test("fetchAyat rejects a bad slug before touching the SDK", async () => {
  const { fetchAyat } = await import("../lib/quran.js");
  await assert.rejects(() => fetchAyat("not a slug"), /invalid_ayat_slug/);
});

test("fetchAyat throws qf_credentials_missing when QF creds are unset (no SDK crash on import)", async () => {
  const prevId = process.env.QF_CLIENT_ID;
  const prevSecret = process.env.QF_CLIENT_SECRET;
  delete process.env.QF_CLIENT_ID;
  delete process.env.QF_CLIENT_SECRET;
  try {
    const { fetchAyat } = await import("../lib/quran.js");
    await assert.rejects(() => fetchAyat("96.Al-Alaq: 1"), /qf_credentials_missing/);
  } finally {
    if (prevId !== undefined) process.env.QF_CLIENT_ID = prevId;
    if (prevSecret !== undefined) process.env.QF_CLIENT_SECRET = prevSecret;
  }
});
