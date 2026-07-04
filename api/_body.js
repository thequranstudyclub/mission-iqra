// Shared JSON body reader. Vercel's Node runtime usually parses a JSON body into
// req.body, but it can arrive as a string (or be undefined) depending on
// headers. Normalize to an object. Files under api/ that start with `_` are not
// exposed as routes by Vercel.
export function readJsonBody(req) {
  let body = req.body;
  if (body == null) return {};
  if (typeof body === "string") {
    try {
      return JSON.parse(body);
    } catch {
      return {};
    }
  }
  return body;
}
