// POST /api/draw { group } — claim a group name and draw one envelope.
// The draw is keyed by group name + server date and is atomic: a name that's
// already taken returns 409 group_name_in_use. Returns { mission, remaining }.

import { drawMission, today } from "../lib/pool.js";
import { readJsonBody } from "./_body.js";

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
  if (group.length > 50) {
    res.status(400).json({ error: "group_too_long" });
    return;
  }
  try {
    const r = Math.random();
    const result = await drawMission({ r, group, date: today() });
    if (result.inUse) {
      res.status(409).json({ error: "group_name_in_use" });
      return;
    }
    res.status(200).json({ mission: result.mission, remaining: result.remaining });
  } catch (err) {
    console.error("draw failed:", err);
    res.status(500).json({ error: "draw_failed" });
  }
}
