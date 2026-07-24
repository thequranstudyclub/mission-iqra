// POST /api/draw { slug, name?, playerId? }
// Dispatches on the event's run mode:
//   offline (player_per_group == 1): needs `name`. Uniform draw, name-locked.
//     -> { mission, remaining }  (409 group_name_in_use if the name is taken)
//   online  (player_per_group  > 1): needs `playerId`. Sequential-fill join.
//     -> { group, mission }      (idempotent per playerId)

import { getEventConfig, drawOffline, joinOnline, today } from "../lib/pool.js";
import { readJsonBody } from "./_body.js";

const DEFAULT_SLUG = "operation-iqra";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    res.status(405).json({ error: "method_not_allowed" });
    return;
  }
  const body = readJsonBody(req);
  const slug = (body.slug || DEFAULT_SLUG).toString().trim();

  try {
    const cfg = await getEventConfig(slug);
    if (!cfg) {
      res.status(404).json({ error: "event_not_found" });
      return;
    }
    if (!cfg.missionCards.length) {
      res.status(409).json({ error: "no_mission_cards" });
      return;
    }

    const online = cfg.player_per_group > 1;
    if (online) {
      const playerId = (body.playerId || "").toString().trim();
      if (!playerId) {
        res.status(400).json({ error: "player_id_required" });
        return;
      }
      if (playerId.length > 100) {
        res.status(400).json({ error: "player_id_too_long" });
        return;
      }
      const result = await joinOnline({ slug, playerId, cfg, date: today() });
      res.status(200).json({ group: result.group, mission: result.mission });
      return;
    }

    // offline
    const name = (body.name || "").toString().trim();
    if (!name) {
      res.status(400).json({ error: "group_required" });
      return;
    }
    if (name.length > 50) {
      res.status(400).json({ error: "group_too_long" });
      return;
    }
    const result = await drawOffline({ slug, name, cfg, date: today() });
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
