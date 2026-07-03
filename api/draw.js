// POST /api/draw — draw one envelope from the shared pool.
// Randomness is client-agnostic here (server generates r); selection is atomic
// in Redis. Returns { claimId, mission, remaining }. The client stores claimId
// so a reload reuses this draw and the return fail-safe can target it.

import { randomUUID } from "node:crypto";
import { drawMission } from "../lib/pool.js";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    res.status(405).json({ error: "method_not_allowed" });
    return;
  }
  try {
    const claimId = randomUUID();
    const r = Math.random();
    const { mission, remaining } = await drawMission({ r, claimId });
    res.status(200).json({ claimId, mission, remaining });
  } catch (err) {
    console.error("draw failed:", err);
    res.status(500).json({ error: "draw_failed" });
  }
}
