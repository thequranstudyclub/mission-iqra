// POST /api/admin { password, action }
//   action "reports" → all submitted report summaries
//   action "reset"   → reset every mission count back to 5
// Password is checked server-side against ADMIN_PASSWORD (never shipped to the
// client). Returns 500 if the env is unset, 401 on mismatch.

import { timingSafeEqual } from "node:crypto";
import { getAllReports, resetPool } from "../lib/pool.js";
import { readJsonBody } from "./_body.js";

function passwordOk(supplied) {
  const expected = process.env.ADMIN_PASSWORD;
  if (!expected) return { configured: false, ok: false };
  const a = Buffer.from(String(supplied || ""));
  const b = Buffer.from(expected);
  const ok = a.length === b.length && timingSafeEqual(a, b);
  return { configured: true, ok };
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    res.status(405).json({ error: "method_not_allowed" });
    return;
  }
  const body = readJsonBody(req);
  const { configured, ok } = passwordOk(body.password);
  if (!configured) {
    res.status(500).json({ error: "admin_not_configured" });
    return;
  }
  if (!ok) {
    res.status(401).json({ error: "unauthorized" });
    return;
  }
  try {
    if (body.action === "reset") {
      await resetPool();
      res.status(200).json({ ok: true });
      return;
    }
    // default: reports
    const reports = await getAllReports();
    res.status(200).json({ reports });
  } catch (err) {
    console.error("admin failed:", err);
    res.status(500).json({ error: "admin_failed" });
  }
}
