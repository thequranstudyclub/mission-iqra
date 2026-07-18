// POST /api/report { slug, groupKey, fields }
// Logs a group's Report Summary (one per group per day, latest wins). `fields` is
// an array of string values aligned by index to the event's report_summary. The
// drawn mission + ayat ref are looked up server-side from the group's lock so the
// admin can see which ayat the report is about. submittedAt is set server-side.

import { getEventConfig, getGroupCard, saveReport, today } from "../lib/pool.js";
import { readJsonBody } from "./_body.js";

const DEFAULT_SLUG = "operation-iqra";
const clip = (s) => String(s == null ? "" : s).slice(0, 4000);

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    res.status(405).json({ error: "method_not_allowed" });
    return;
  }
  const body = readJsonBody(req);
  const slug = (body.slug || DEFAULT_SLUG).toString().trim();
  const groupKey = (body.groupKey || "").toString().trim();
  if (!groupKey) {
    res.status(400).json({ error: "group_required" });
    return;
  }
  try {
    const cfg = await getEventConfig(slug);
    if (!cfg) {
      res.status(404).json({ error: "event_not_found" });
      return;
    }
    const online = cfg.player_per_group > 1;
    const date = today();
    const mission = await getGroupCard({ slug, date, groupKey, online });
    const card = mission != null ? cfg.missionCards[mission] : null;
    const ref = card ? card.ayat.ref : null;

    const incoming = Array.isArray(body.fields) ? body.fields : [];
    const fields = cfg.report_summary.map((f, i) => ({ label: f.label, value: clip(incoming[i]) }));
    const group = online ? `Group ${groupKey}` : groupKey;

    const record = await saveReport({ slug, date, groupKey, group, fields, mission, ref });
    res.status(200).json({ ok: true, submittedAt: record.submittedAt });
  } catch (err) {
    console.error("report failed:", err);
    res.status(500).json({ error: "report_failed" });
  }
}
