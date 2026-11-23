# Contract notes for the frontend

Where the backend goes beyond, or differs from, `HANDOFF.md`. The frontend parses leniently, so none of these need a code change; they are listed for awareness.

| Area | Backend behaviour | HANDOFF says |
|---|---|---|
| WebSocket `anomaly` event | Includes `severity` ("LOW" / "MEDIUM" / "HIGH"). The frontend type `AnomalyMessage` already accepts it. | Example has no `severity` |
| WebSocket `alert` event | Includes an extra `alertId` (the rule that fired). | Not listed |
| `GET /api/health` | Adds `dataFreshness` (seconds since last tick, or null). `backendAvailability` is `"SINGLE_NODE"` (not displayed anywhere in the UI). `dataCollectionStatus` can be `STREAMING`, `STALE` or `DISCONNECTED`. | `HIGH_AVAILABILITY` example |
| `DELETE /api/alerts/:id` | 204 with no body; unknown id gives 404 JSON. | 200 or 204 |
| `POST /api/alerts` | 201. Threshold also accepted as a numeric string. Max 100 active alerts. | 201 or 200 |
| History points | Also contain `open`, `high`, `low`, `close`. | Only price/volume/ts |
| Limits | history/compare max 14 days; replay max 6 h (default 10 min); anomalies max 7 days (limit 200); triggered alerts default 7 days (limit 100). A larger range gives 400 `{"error": "range too large ..."}`. | No limits stated |
| Compare | Candle size depends on the range (<= 6 h 1m, <= 48 h 5m, else 1 h); `price` is the candle close; no `volume` field. | Not specified |
| Replay | One tick per coin per second is stored, so replay has one-second resolution. Live WebSocket ticks are every trade. | Not specified |

Questions for the frontend owner: is the 6-hour replay cap acceptable for the Replay page's custom window (the default 4 hours fits), and does the UI want `triggeredAt` and `ts` on triggered alerts (only `triggeredAt` is sent)?
