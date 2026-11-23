# Crypto Market Intelligence Workstation: backend

Real-time cryptocurrency monitoring on Apache Cassandra (course CSAEC59). It ingests live Binance trades for BTCUSDT, ETHUSDT and SOLUSDT, stores them in Cassandra, and serves REST + WebSocket APIs to the React frontend in the repo root. The exact API contract is `../HANDOFF.md`.

## Quick start

```bash
docker start cass                                   # Cassandra 4.1 container, port 9042
docker exec -i cass cqlsh < schema.cql              # create keyspace + tables (safe to repeat)
npm install
npm run dev                                         # node --watch server.js  ->  http://localhost:3000
./scripts/smoke-test.sh                             # 33 checks, prints PASS/FAIL
node scripts/ws-check.js                            # counts live WebSocket messages for 15 s
```

## Architecture

```
  Binance public stream (wss://data-stream.binance.vision)
              |  trade events
              v
  +--------------------------- one Node.js process ----------------------------+
  |  ingestor.js                                                               |
  |   - builds 1m / 5m / 1h candles in memory                                  |
  |   - emits every trade on  feed ('tick')                                    |
  |   - once per second: upsert tick row + candles + latest price              |
  |        |                       |                        |                  |
  |        |                       v                        v                  |
  |        |                  alerts.js              anomaly.js                |
  |        |           (rules in a Map, no DB      (1-second buckets,          |
  |        |            reads per tick)             rolling z-score)           |
  |        |                       | bus 'alert'            | bus 'anomaly'    |
  |        v                       v                        v                  |
  |  server.js  ------------>  live.js: WebSocket /ws/live  (broadcast)        |
  |  Express REST: /api/...    routes.js, util.js, health.js                   |
  +----------+-------------------------------+---------------------+-----------+
             | CQL (prepared statements)     | WebSocket frames    | HTTP JSON
             v                               v                     v
        Apache Cassandra              Browser (React, :5173)  <---- same browser
```

### End-to-end data flow
1. Binance sends a trade. `ingestor.js` updates the open 1m/5m/1h candles and the current second's volume, then emits `tick`.
2. `server.js` forwards every tick to all browsers over `/ws/live`. `alerts.js` checks the tick against the in-memory rules. `anomaly.js` adds it to the current 1-second bucket.
3. Once a second the ingestor upserts into `ticks_by_symbol_day` (one row per coin per second), `candles_by_symbol_day` (3 timeframes) and `latest_price`.
4. When an alert rule is true, or a bucket is statistically unusual, the module saves a row and emits on the shared bus. `server.js` broadcasts it as `{type:"alert"}` or `{type:"anomaly"}`.
5. The frontend loads history from REST (one fast read per day partition) and keeps itself live with the WebSocket.

## Tables (query-first modelling: one table per query)

| Table | Partition key | Clustering key | Serves | Why |
|---|---|---|---|---|
| `ticks_by_symbol_day` | `(symbol, day)` | `ts ASC` | `GET /replay/:symbol` | 1 tick per coin per second caps a partition at ~86,400 rows. Clustering by time makes a time range one sequential read. 30-day TTL. |
| `candles_by_symbol_day` | `(symbol, timeframe, day)` | `ts ASC` | `GET /prices/:symbol/history`, `GET /compare` | Candles are pre-aggregated at write time, so charts never aggregate at read time. A 1m partition is 1,440 rows. |
| `latest_price` | `symbol` | none | `GET /prices/latest`, `/prices/:symbol/latest` | One row per coin, overwritten every second: a primary-key lookup. `volume` is the current 1-minute candle volume. |
| `alerts_by_id` | `id` | none | create / delete / mark triggered | Rules are looked up by id. Tiny table. `status` is ACTIVE or TRIGGERED. |
| `triggered_alerts_by_day` | `(day)` | `triggered_at DESC, id` | `GET /alerts/triggered` | Newest-first is the stored order. One partition per UTC day stays small because few alerts fire. |
| `anomalies_by_symbol_day` | `(symbol, day)` | `ts DESC, id` | `GET /anomalies` | Newest-first per coin per day. With no symbol the code queries each coin and merges. |

Rules that hold everywhere: the day bucket is always **UTC**; every read names the full partition key (no `ALLOW FILTERING`, no scans at request time); writes are idempotent upserts; multi-day ranges run one query per day in parallel (`Promise.all`) and merge in code; reads above 5,000 rows set `fetchSize`.

## Why Cassandra for this workload
- Write-heavy time series: three coins, every second, forever. Cassandra's log-structured storage makes appends cheap.
- Access patterns are known in advance ("this coin, this time range"), which is what Cassandra's partition + clustering model is built for.
- Built-in TTL expires old ticks without delete jobs.
- It scales horizontally: more coins or more history means more nodes, not a rewrite.
- Trade-off: no joins, no ad-hoc filters, and every new question may need a new table.

## Why REST plus WebSocket
REST is the right fit for "give me this range" requests: cacheable, easy to test with curl, and stateless. WebSocket is the right fit for the live feed: the server pushes hundreds of trades per second without the browser polling. Alerts and anomalies ride the same socket so the UI updates the moment they fire.

## Environment variables (all optional, see `.env.example`)

| Variable | Default | Meaning |
|---|---|---|
| `PORT` | `3000` | HTTP + WebSocket port |
| `CORS_ORIGIN` | `http://localhost:5173` | Allowed frontend origin |
| `CASSANDRA_HOST` | `127.0.0.1:9042` | Contact point(s), comma separated |
| `CASSANDRA_DC` | `datacenter1` | Local data centre name |
| `CASSANDRA_KEYSPACE` | `crypto` | Keyspace |
| `ANOMALY_Z_THRESHOLD` | `4` | Std-deviations that count as unusual |
| `ANOMALY_WARMUP_SECONDS` | `300` | History needed before detection starts |
| `ANOMALY_COOLDOWN_SECONDS` | `60` | Min gap between anomalies per symbol + metric |
| `ANOMALY_MIN_MOVE_PCT` | `0.03` | Smallest 1-second move (percent) that can be a price anomaly |

## Endpoints

| Method + path | Notes |
|---|---|
| `GET /api/assets` | The three tracked coins |
| `GET /api/prices/latest` | Array, one entry per coin |
| `GET /api/prices/:symbol/latest` | 404 for an unknown symbol |
| `GET /api/prices/:symbol/history?interval=1m\|5m\|1h&from&to` | Candles oldest first; also returns open/high/low/close. Max 14 days |
| `GET /api/compare?symbols=A,B&from&to` | Object keyed by symbol of `{price, ts}`; candle size chosen from the range (<=6h 1m, <=48h 5m, else 1h). Max 14 days; default 24 h |
| `GET /api/replay/:symbol?from&to` | Raw ticks ascending. Default last 10 min, max 6 h |
| `POST /api/alerts` | Body `{symbol, metric, condition, threshold}` -> 201. Max 100 active |
| `GET /api/alerts` | Active alerts |
| `DELETE /api/alerts/:id` | 204, or 404 for an unknown id |
| `GET /api/alerts/triggered?from&to&limit` | Newest first. Default 7 days, limit 100 |
| `GET /api/anomalies?symbol&from&to` | Newest first. Default 24 h, max 7 days, limit 200 |
| `GET /api/health` | Real DB check (cached 10 s), `STALE` after 15 s without a tick |
| `WS /ws/live` | Messages of type `tick`, `alert`, `anomaly` |

Times accept ISO 8601, unix seconds or unix milliseconds. Errors are always `{"error": "..."}` with 400 or 404.

## Anomaly detection in short
Trades are summed into 1-second buckets. A ring buffer keeps the last 1,800 buckets (30 min), including empty seconds. A finished bucket is compared with the window **before** it joins it: `z = (value - mean) / std`. Volume uses the bucket volume; price uses the absolute return versus the previous second and must also exceed `ANOMALY_MIN_MOVE_PCT`. Guards: warm-up, cooldown, and a std floor so a zero std never divides by zero. Severity: z >= 6 HIGH, z >= 5 MEDIUM, otherwise LOW.

## Known limitations and what I would change at scale
- **Single node, replication factor 1** and SimpleStrategy: no fault tolerance. At scale: 3+ nodes, RF 3, NetworkTopologyStrategy, consistency LOCAL_QUORUM.
- **Ingestor runs inside the API process.** A crash or restart of the API pauses collection, and the detector's 30-minute window restarts empty. At scale: a separate ingestor process publishing to a message queue (e.g. Kafka) that the API, alert checker and anomaly detector consume.
- **Alert rules live in one process's memory**, so a second API instance would not see them. The startup full-table scan of `alerts_by_id` only works because the table is tiny.
- **No authentication.** Anyone who can reach port 3000 can create alerts. At scale: auth, per-user alerts, rate limiting, TLS.
- **Only 1 raw tick per second is stored.** Browsers still get every trade live, but replay is per-second resolution.
- **Queries that need other filters** (for example "all ticks with price > X") are deliberately not supported. With Cassandra 5 SAI indexes or materialized views, some could be added without a new hand-written table.
- Raw ticks written before the TTL was added never expire.

## Viva questions

**1. Why did you pick Cassandra for this project?**
It is a write-heavy, time-ordered workload with query patterns known in advance ("this coin over this range"). Cassandra appends cheaply, stores each partition sorted by time, scales by adding nodes, and expires data with TTL.

**2. What is a partition key and why does yours include a day?**
The partition key decides which node stores a row and groups rows read together. Without the day, one coin's partition would grow forever. With `(symbol, day)` each partition stays bounded (~86,400 tick rows).

**3. Why not use `ALLOW FILTERING`?**
It makes Cassandra scan many partitions and filter afterwards, which is slow and gets worse as data grows. Cassandra is designed so each query hits one partition. If I need a new question answered, I model a new table.

**4. How does a time-range query that spans midnight work?**
The range touches two or more day partitions, so the code runs one query per UTC day in parallel with `Promise.all` and concatenates the results, which are already in order.

**5. Why store pre-built candles instead of computing them from ticks?**
Reads are the hot path for charts. Building candles once while writing makes history and compare a single partition read instead of aggregating thousands of ticks per request, because Cassandra has no GROUP BY over time buckets.

**6. What is a tombstone, and how do you avoid problems with them?**
A tombstone is a marker that says a cell or row was deleted. Deletions are writes, and the data is purged only after `gc_grace_seconds`. Many tombstones slow reads. I use idempotent upserts and TTL instead of deleting. The only deletes are alert rules, in a tiny table.

**7. How do you make sure an alert fires only once?**
The rule is removed from the in-memory Map synchronously, before any `await`. Node runs JavaScript one task at a time, so no other tick can see the rule afterwards. Then the database writes happen.

**8. Why are alert rules held in memory when Cassandra is the database?**
The checker runs on every trade. A database read per tick would be slow and wasteful. Cassandra is the durable copy, loaded once at startup; the in-memory Map is the working copy. That is fine for one process, but would need shared state (or a queue) for several.

**9. How does anomaly detection work, and how do you avoid false alarms?**
Rolling 30-minute window of 1-second buckets; the z-score of volume and of the absolute price return. It does not run until 5 minutes of history exist, has a 60-second cooldown per symbol and metric, a floor on the standard deviation, and a minimum price move. The thresholds are environment variables.

**10. Why does the same data go over both REST and WebSocket?**
REST answers "give me this range" and is easy to cache and test. WebSocket pushes live trades, alerts and anomalies as they happen without polling. On page load the UI fetches history by REST, then stays current with the socket.

**11. What happens if Cassandra or Binance goes down?**
Binance: the ingestor reconnects with exponential backoff, and `/api/health` reports `DISCONNECTED` or `STALE`. Cassandra: at startup the server retries and then exits with a clear message; while running, failed writes are logged and retried by the next second's flush, and health reports `database: ERROR`.

**12. What would you change to run this in production?**
Multi-node Cassandra with RF 3, a message queue between ingestor and consumers, a separate ingestor process, authentication, and SAI indexes or materialized views for extra query shapes.
