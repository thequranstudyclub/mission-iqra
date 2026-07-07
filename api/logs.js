// GET /api/logs — public list of submitted report summaries (no auth).
// Powers the public /mission-logs page. Same data as the admin reports view,
// but unauthenticated by design.

import { getAllReports } from "../lib/pool.js";

export default async function handler(req, res) {
  try {
    const reports = await getAllReports();
    res.status(200).json({ reports });
  } catch (err) {
    console.error("logs failed:", err);
    res.status(500).json({ error: "logs_failed" });
  }
}
