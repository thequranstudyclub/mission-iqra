# Seeding & managing GameEvents

A **GameEvent** is a single JSON blob at Redis key `event:<slug>:config`, plus the slug
tracked in the `events` SET. One deployment serves many events via `/?event=<slug>`.

## 1. Seed the original Al-Alaq event (`operation-iqra`)

This restores the pre-refactor content and keeps existing links (`/` and
`/?event=operation-iqra`) working.

```bash
cd qsc_himmah_missions
# print the config (dry run)
node scripts/seed-operation-iqra.mjs
# write it to Redis (needs UPSTASH_REDIS_REST_URL / _TOKEN in env or .env)
node scripts/seed-operation-iqra.mjs --write
```

## 2. Create / edit events in the UI (recommended)

`/admin` → **Manage GameEvents** → `/events` (both gated by `ADMIN_PASSWORD`).
There you can create events, set `player_per_group` + `max_group_per_mission_card`,
add mission cards (pick surah + ayat, **Fetch ayat text** auto-fills Arabic/EN/ID,
all editable), and edit the event-level report-summary fields.

## 3. Create / edit events programmatically

### a) Via the admin API

```bash
curl -X POST https://<host>/api/admin \
  -H 'content-type: application/json' \
  -d '{"password":"'"$ADMIN_PASSWORD"'","action":"saveEvent","event": <CONFIG_JSON> }'
```

`saveEvent` validates the slug (`^[a-z0-9]+(?:-[a-z0-9]+)*$`, else `400 invalid_slug`),
stores the blob, and adds the slug to `events`. Get the ayat text first if you don't
have it:

```bash
curl -X POST https://<host>/api/admin -H 'content-type: application/json' \
  -d '{"password":"'"$ADMIN_PASSWORD"'","action":"fetchAyat","ayat_slug":"96.Al-Alaq: 1"}'
# -> { "ref":"QS. Al-Alaq: 1", "arabic":"…", "translation":{ "en":"…","id":"…" } }
```

### b) Directly via Upstash (REST or console)

Because ayat text is **denormalized into the blob**, a direct write must include the
derived `ayat` fields (use `fetchAyat` above, or copy from another card).

```bash
# set the config blob
curl https://<UPSTASH_REST_URL>/set/event:my-slug:config \
  -H "Authorization: Bearer $UPSTASH_REDIS_REST_TOKEN" \
  -d '<CONFIG_JSON>'
# register the slug
curl https://<UPSTASH_REST_URL>/sadd/events/my-slug \
  -H "Authorization: Bearer $UPSTASH_REDIS_REST_TOKEN"
```

## GameEvent config shape

```jsonc
{
  "event_slug": "operation-iqra",           // ^[a-z0-9]+(?:-[a-z0-9]+)*$
  "title": "QSC × HIMMAH — Operation Iqra",
  "player_per_group": 1,                     // 1 = offline (name draw), >1 = online (group number)
  "max_group_per_mission_card": 5,           // capacity = this × missionCards.length
  "report_summary": [                        // event-level; one report form for all cards
    { "label": "The Reveal", "hints": { "en": "…", "id": "…" } }
  ],
  "missionCards": [
    {
      "mission_slug": "Mission 01",
      "ayat_slug": "96.Al-Alaq: 1",          // "{surah_number}.{surah_name}: {ayat|range}"
      "ayat": { "ref": "QS. Al-Alaq: 1", "arabic": "…", "translation": { "en": "…", "id": "…" } },
      "mission_statement": { "en": { "title": "…", "prompt": "…" }, "id": { "title": "…", "prompt": "…" } }
    }
  ]
}
```

## Redis keys (per event)

| Key | Type | Purpose |
|---|---|---|
| `events` | SET | all event slugs |
| `event:<slug>:config` | STRING | the GameEvent JSON above |
| `event:<slug>:pool` | HASH | `m0..m(M-1)` remaining copies (offline bag) |
| `event:<slug>:reports` | HASH | `<date>:<groupKey>` → report JSON |
| `event:<slug>:group:<date>:<name>` | STRING | offline name → card idx (TTL 6h) |
| `event:<slug>:openers:<date>` | STRING | online opener counter |
| `event:<slug>:opener:<date>:<pid>` | STRING | online player → slot (TTL 6h) |
| `event:<slug>:grp:<date>:<g>` | STRING | online group → card idx (TTL 6h) |

## Legacy data

Old flat `himmah:*` keys (pre-refactor pool and `himmah:reports`) are not read by the
new code. Existing live reports there can be left as-is (low traffic) or one-time copied
into `event:operation-iqra:reports`. Not required to launch.
