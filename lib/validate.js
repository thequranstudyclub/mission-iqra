// Shared validation helpers (browser-safe, no imports).

// URL-friendly event slug: lowercase alphanumeric words joined by single hyphens.
// e.g. "operation-iqra", "ramadan-week2". No leading/trailing/double hyphens,
// no spaces, no uppercase, no punctuation.
export const EVENT_SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export function isValidEventSlug(slug) {
  return typeof slug === "string" && slug.length >= 1 && slug.length <= 64 && EVENT_SLUG_RE.test(slug);
}
