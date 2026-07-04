// POST /api/report { group, reveal, logic, action }
// Logs a group's Report Summary (one per group per day, latest wins). The drawn
// mission is looked up from the group's lock so the admin can see which ayat the
// report is about. submittedAt is set server-side.

import { saveReport, getGroupMission, today } from "../lib/pool.js";
import { MISSIONS } from "../lib/strings.js";
import { readJsonBody } from "./_body.js";

const clip = (s) => String(s || "").slice(0, 4000);

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    res.status(405).json({ error: "method_not_allowed" });
    return;
  }
  const body = readJsonBody(req);
  const group = (body.group || "").trim();
  if (!group) {
    res.status(400).json({ error: "group_required" });
    return;
  }
  try {
    const date = today();
    const mission = await getGroupMission({ date, group });
    const ref = mission != null && MISSIONS[mission] ? MISSIONS[mission].ref : null;
    const record = await saveReport({
      date,
      group,
      reveal: clip(body.reveal),
      logic: clip(body.logic),
      action: clip(body.action),
      mission,
      ref,
    });
    res.status(200).json({ ok: true, submittedAt: record.submittedAt });
  } catch (err) {
    console.error("report failed:", err);
    res.status(500).json({ error: "report_failed" });
  }
}
