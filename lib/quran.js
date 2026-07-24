// Ayat helpers: parse the configurable ayat_slug, build a display ref, and fetch
// Arabic + EN/ID translation text so a GameEvent's mission cards can be
// denormalized at config-save time (no Quran API call at game runtime).
//
// ayat_slug format: "{surah_number}.{surah_name}: {ayat_number|range}"
//   e.g. "96.Al-Alaq: 1"  or  "96.Al-Alaq: 4-5"
//
// Text source: Quran Foundation Content API v4 via the @quranjs/api server SDK
// (createServerClient handles OAuth2 client-credentials token retrieval + caching).
// Needs QF_CLIENT_ID / QF_CLIENT_SECRET (server-side only). Defaults to production.
//   Arabic: text_uthmani. Translations: The Clear Quran (EN) + Kemenag (ID).

import { createServerClient } from "@quranjs/api/server";
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

// QF Content API v4 translation resource_ids (confirmed via
// resources.translations.list()). Note: QF has no Clear Quran / Khattab edition,
// so EN uses Saheeh International (the same source the original alquran.cloud
// fetch used: en.sahih).
//   20 = Saheeh International (EN)
//   33 = Indonesian Islamic Affairs Ministry / Kemenag (ID)
const TRANSLATION_EN = 20;
const TRANSLATION_ID = 33;

// Lazy module-scoped singleton so the SDK's OAuth token cache survives across
// calls within a warm serverless instance.
let _client = null;
function qfClient() {
  if (!_client) {
    const clientId = process.env.QF_CLIENT_ID;
    const clientSecret = process.env.QF_CLIENT_SECRET;
    if (!clientId || !clientSecret) throw new Error("qf_credentials_missing");
    _client = createServerClient({ clientId, clientSecret });
  }
  return _client;
}

// Strip QF translation HTML (footnote <sup foot_note=...>, <a> markers) so the
// stored text stays plain, matching the previous alquran.cloud output.
function stripHtml(s) {
  return String(s || "")
    .replace(/<[^>]*>/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

// Fetch Arabic + EN + ID for a slug (ranges concatenated in order).
// Returns { ref, arabic, translation: { en, id } }.
export async function fetchAyat(slug) {
  const p = parseAyatSlug(slug);
  if (!p) throw new Error("invalid_ayat_slug");

  const from = `${p.surah}:${p.start}`;
  const to = `${p.surah}:${p.end}`;
  // Single by-range call covers the whole span (start === end -> one verse).
  const verses = await qfClient().content.v4.verses.byRange(from, to, {
    fields: { textUthmani: true },
    translations: [TRANSLATION_EN, TRANSLATION_ID],
  });

  const pickTranslation = (verse, resourceId) => {
    const t = (verse.translations || []).find((x) => x.resourceId === resourceId);
    return t ? stripHtml(t.text) : "";
  };
  const join = (fn) => (verses || []).map(fn).filter(Boolean).join(" ");

  return {
    ref: formatRef(slug),
    arabic: join((v) => (v.textUthmani || "").trim()),
    translation: {
      en: join((v) => pickTranslation(v, TRANSLATION_EN)),
      id: join((v) => pickTranslation(v, TRANSLATION_ID)),
    },
  };
}
