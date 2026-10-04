CREATE KEYSPACE IF NOT EXISTS crypto WITH replication =
  {'class': 'SimpleStrategy', 'replication_factor': 1};

USE crypto;

-- raw ticks, for /replay (partition: one coin, one day)
CREATE TABLE IF NOT EXISTS ticks_by_symbol_day (
  symbol text, day date, ts timestamp, price decimal, volume decimal,
  PRIMARY KEY ((symbol, day), ts)
) WITH CLUSTERING ORDER BY (ts ASC);

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