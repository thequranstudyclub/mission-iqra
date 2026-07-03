// POST /api/return { claimId } — return a drawn envelope to the shared pool.
// Fail-safe for when two people in one group both draw. Idempotent: only the
// first valid return for a claim moves the count; later presses are no-ops.

import { returnMission } from "../lib/pool.js";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    res.status(405).json({ error: "method_not_allowed" });
    return;
  }
  // Vercel parses a JSON body into req.body; guard for string/undefined too.
  let body = req.body;
  if (typeof body === "string") {
    try {
      body = JSON.parse(body);
    } catch {
      body = {};
    }
  }
  const claimId = body && body.claimId;
  if (!claimId) {
    res.status(400).json({ error: "missing_claim_id" });
    return;
  }
  try {
    const { mission, remaining } = await returnMission({ claimId });
    res.status(200).json({ mission, remaining });
  } catch (err) {
    console.error("return failed:", err);
    res.status(500).json({ error: "return_failed" });
  }
}
