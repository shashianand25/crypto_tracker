CREATE KEYSPACE IF NOT EXISTS crypto WITH replication =
  {'class': 'SimpleStrategy', 'replication_factor': 1};

USE crypto;

-- raw ticks, for /replay (partition: one coin, one day)
CREATE TABLE IF NOT EXISTS ticks_by_symbol_day (
  symbol text, day date, ts timestamp, price decimal, volume decimal,
  PRIMARY KEY ((symbol, day), ts)
) WITH CLUSTERING ORDER BY (ts ASC)
  AND default_time_to_live = 2592000;   -- raw ticks expire after 30 days

-- pre-aggregated candles, for /history and /compare
CREATE TABLE IF NOT EXISTS candles_by_symbol_day (
  symbol text, timeframe text, day date, ts timestamp,
  open decimal, high decimal, low decimal, close decimal, volume decimal,
  PRIMARY KEY ((symbol, timeframe, day), ts)
) WITH CLUSTERING ORDER BY (ts ASC);

-- one row per coin, always the newest, for /prices/latest
CREATE TABLE IF NOT EXISTS latest_price (
  symbol text PRIMARY KEY,
  price decimal, volume decimal, ts timestamp
);

-- alert rules, looked up by id (create / delete / mark triggered)
CREATE TABLE IF NOT EXISTS alerts_by_id (
  id text PRIMARY KEY,
  symbol text, metric text, condition text, threshold decimal,
  status text,                 -- ACTIVE or TRIGGERED
  created_at timestamp, triggered_at timestamp
);

-- history of fired alerts, newest first, for /alerts/triggered
-- (partition: one UTC day; tiny because only a few alerts fire per day)
CREATE TABLE IF NOT EXISTS triggered_alerts_by_day (
  day date, triggered_at timestamp, id text,
  alert_id text, symbol text, metric text, condition text, threshold decimal, value decimal,
  PRIMARY KEY ((day), triggered_at, id)
) WITH CLUSTERING ORDER BY (triggered_at DESC, id ASC);


-- detected anomalies, newest first, for /anomalies (partition: one coin, one day)
CREATE TABLE IF NOT EXISTS anomalies_by_symbol_day (
  symbol text, day date, ts timestamp, id text,
  metric text, event text, description text, price decimal, volume decimal, severity text,
  PRIMARY KEY ((symbol, day), ts, id)
) WITH CLUSTERING ORDER BY (ts DESC, id ASC);


-- for a ticks table created before the TTL existed (harmless to repeat).
-- Only applies to rows written AFTER this runs; older rows keep no expiry.
ALTER TABLE ticks_by_symbol_day WITH default_time_to_live = 2592000;
