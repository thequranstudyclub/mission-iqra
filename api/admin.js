// POST /api/admin { password, action, ... }
// Password-gated admin + GameEvent management. Checked server-side against
// ADMIN_PASSWORD (never shipped to the client); 500 if unset, 401 on mismatch.
//
// Actions:
//   reports    { slug }            -> { reports }              (an event's report summaries)
//   reset      { slug }            -> { ok }                   (reset the offline bag to cap)
//   listEvents                     -> { events: [slug...] }
//   getEvent   { slug }            -> { event }                (full config, or 404)
//   saveEvent  { event }           -> { event }               (create/update; 400 invalid_slug)
//   deleteEvent{ slug }            -> { ok }
//   fetchAyat  { ayat_slug }       -> { ref, arabic, translation:{en,id} }  (config autofill)

import { timingSafeEqual } from "node:crypto";
import {
  getReports,
  resetPool,
  listEvents,
  getEventConfig,
  saveEventConfig,
  deleteEvent,
} from "../lib/pool.js";
import { fetchAyat } from "../lib/quran.js";
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

  const action = body.action || "reports";
  const slug = (body.slug || "").toString().trim();

  try {
    switch (action) {
      case "listEvents": {
        res.status(200).json({ events: await listEvents() });
        return;
      }
      case "getEvent": {
        const event = await getEventConfig(slug);
        if (!event) {
          res.status(404).json({ error: "event_not_found" });
          return;
        }
        res.status(200).json({ event });
        return;
      }
      case "saveEvent": {
        try {
          const event = await saveEventConfig(body.event || {});
          res.status(200).json({ event });
        } catch (e) {
          if (e && e.message === "invalid_slug") {
            res.status(400).json({ error: "invalid_slug" });
            return;
          }
          throw e;
        }
        return;
      }
      case "deleteEvent": {
        await deleteEvent(slug);
        res.status(200).json({ ok: true });
        return;
      }
      case "fetchAyat": {
        try {
          const data = await fetchAyat((body.ayat_slug || "").toString());
          res.status(200).json(data);
        } catch (e) {
          res.status(400).json({ error: "invalid_ayat_slug" });
          return;
        }
        return;
      }
      case "reset": {
        const cfg = await getEventConfig(slug);
        if (!cfg) {
          res.status(404).json({ error: "event_not_found" });
          return;
        }
        await resetPool({ slug, cfg });
        res.status(200).json({ ok: true });
        return;
      }
      case "reports":
      default: {
        const reports = await getReports(slug);
        res.status(200).json({ reports });
        return;
      }
    }
  } catch (err) {
    console.error("admin failed:", err);
    res.status(500).json({ error: "admin_failed" });
  }
}
