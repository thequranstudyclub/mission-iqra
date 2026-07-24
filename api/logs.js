// GET /api/logs?slug=<event_slug> — public list of an event's report summaries.
// Powers the public /mission-logs page. Same data as the admin reports view, but
// unauthenticated by design. HGETALL cost note: this reads the whole event report
// hash on each call, so the logs page must NOT auto-poll (manual load only).

import { getReports } from "../lib/pool.js";

const DEFAULT_SLUG = "operation-iqra";

export default async function handler(req, res) {
  const slug = (req.query?.slug || DEFAULT_SLUG).toString().trim();
  try {
    const reports = await getReports(slug);
    res.status(200).json({ reports });
  } catch (err) {
    console.error("logs failed:", err);
    res.status(500).json({ error: "logs_failed" });
  }
}
