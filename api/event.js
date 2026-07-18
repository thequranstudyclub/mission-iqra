// GET /api/event?slug=<event_slug>
// Public, read-only. Returns the GameEvent config the player game renders from
// (mission cards with denormalized ayat text, report fields, group scheme). No
// secrets live in the config, so it is safe to serve unauthenticated.

import { getEventConfig } from "../lib/pool.js";

const DEFAULT_SLUG = "operation-iqra";

export default async function handler(req, res) {
  const slug = (req.query?.slug || DEFAULT_SLUG).toString().trim();
  try {
    const cfg = await getEventConfig(slug);
    if (!cfg) {
      res.status(404).json({ error: "event_not_found" });
      return;
    }
    res.status(200).json({ event: cfg });
  } catch (err) {
    console.error("event failed:", err);
    res.status(500).json({ error: "event_failed" });
  }
}
