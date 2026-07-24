// Ayat helpers: parse the configurable ayat_slug, build a display ref, and fetch
// Arabic + EN/ID translation text so a GameEvent's mission cards can be
// denormalized at config-save time (no Quran API call at game runtime).
//
// ayat_slug format: "{surah_number}.{surah_name}: {ayat_number|range}"
//   e.g. "96.Al-Alaq: 1"  or  "96.Al-Alaq: 4-5"
//
// Text source: alquran.cloud (public, no key). Editions:
//   quran-uthmani (Arabic), en.sahih (Saheeh International), id.indonesian.

import { SURAH_BY_N } from "./surahs.js";

const AYAT_SLUG_RE = /^\s*(\d{1,3})\.(.+?):\s*(\d{1,3})(?:\s*-\s*(\d{1,3}))?\s*$/;

// Parse a slug into { surah, name, start, end }. Returns null if malformed.
export function parseAyatSlug(slug) {
  const m = AYAT_SLUG_RE.exec(String(slug || ""));
  if (!m) return null;
  const surah = Number(m[1]);
  const name = m[2].trim();
  const start = Number(m[3]);
  const end = m[4] != null ? Number(m[4]) : start;
  if (surah < 1 || surah > 114 || start < 1 || end < start) return null;
  return { surah, name, start, end };
}

// Validate a slug against the canonical surah table (number in range, ayat within count).
export function isValidAyatSlug(slug) {
  const p = parseAyatSlug(slug);
  if (!p) return false;
  const s = SURAH_BY_N[p.surah];
  return !!s && p.end <= s.ayahs;
}

// Human-readable reference, matching the original data style: "QS. Al-Alaq: 4-5".
export function formatRef(slug) {
  const p = parseAyatSlug(slug);
  if (!p) return "";
  const span = p.end > p.start ? `${p.start}-${p.end}` : `${p.start}`;
  return `QS. ${p.name}: ${span}`;
}

// Build a canonical slug from a surah number + ayat span (used by the config UI).
export function buildAyatSlug(surahN, start, end) {
  const s = SURAH_BY_N[Number(surahN)];
  const name = s ? s.name : String(surahN);
  const span = end && Number(end) > Number(start) ? `${start}-${end}` : `${start}`;
  return `${Number(surahN)}.${name}: ${span}`;
}

const EDITIONS = "quran-uthmani,en.sahih,id.indonesian";

async function fetchOneAyah(surah, ayah) {
  const url = `https://api.alquran.cloud/v1/ayah/${surah}:${ayah}/editions/${EDITIONS}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`alquran.cloud ${res.status} for ${surah}:${ayah}`);
  const json = await res.json();
  const out = { arabic: "", en: "", id: "" };
  for (const ed of json.data || []) {
    const id = ed.edition?.identifier;
    if (id === "quran-uthmani") out.arabic = ed.text;
    else if (id === "en.sahih") out.en = ed.text;
    else if (id === "id.indonesian") out.id = ed.text;
  }
  return out;
}

// Fetch Arabic + EN + ID for a slug (ranges concatenated in order).
// Returns { ref, arabic, translation: { en, id } }.
export async function fetchAyat(slug) {
  const p = parseAyatSlug(slug);
  if (!p) throw new Error("invalid_ayat_slug");
  const parts = [];
  for (let a = p.start; a <= p.end; a++) parts.push(await fetchOneAyah(p.surah, a));
  const join = (key) => parts.map((x) => x[key]).filter(Boolean).join(" ");
  return {
    ref: formatRef(slug),
    arabic: join("arabic"),
    translation: { en: join("en"), id: join("id") },
  };
}
