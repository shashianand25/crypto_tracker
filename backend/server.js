import express from 'express';
import cors from 'cors';
import http from 'node:http';
import { client, connectDb } from './db.js';
import { config } from './config.js';
import { startIngestor, stopIngestor, feed, SYMBOLS } from './ingestor.js';
import { getHealth } from './health.js';
import { HOUR, DAY, parseRange, fetchCandles } from './util.js';
import { router } from './routes.js';
import { attachWebSocket, broadcast, bus, closeWebSocket } from './live.js';
import { loadActiveAlerts, startAlerts } from './alerts.js';
import { startAnomalyDetector } from './anomaly.js';

const app = express();
app.use(cors({ origin: config.corsOrigin, credentials: true }));
app.use(express.json({ limit: '10kb' }));   // alert bodies are tiny; reject anything bigger

const ASSETS = [
  { symbol: 'BTCUSDT', name: 'Bitcoin',  baseAsset: 'BTC', quoteAsset: 'USDT', status: 'TRADING' },
  { symbol: 'ETHUSDT', name: 'Ethereum', baseAsset: 'ETH', quoteAsset: 'USDT', status: 'TRADING' },
  { symbol: 'SOLUSDT', name: 'Solana',   baseAsset: 'SOL', quoteAsset: 'USDT', status: 'TRADING' },
];

// default time window when the frontend doesn't send ?from=
const LOOKBACK_HOURS = { '1m': 24, '5m': 72, '1h': 168 };

// ---------- helpers ----------

async function getLatest(symbol) {
  const { rows } = await client.execute(
    'SELECT symbol, price, volume, ts FROM latest_price WHERE symbol = ?',
    [symbol],
    { prepare: true }
  );
  if (!rows.length) return null;
  const r = rows[0];
  return { symbol: r.symbol, price: r.price.toString(), volume: r.volume.toString(), ts: r.ts.toISOString() };
}

// ---------- REST endpoints ----------

app.get('/api/assets', (req, res) => res.json(ASSETS));

app.get('/api/prices/latest', async (req, res) => {
  const all = await Promise.all(SYMBOLS.map(getLatest));
  res.json(all.filter(Boolean));
});

app.get('/api/prices/:symbol/latest', async (req, res) => {
  const symbol = req.params.symbol.toUpperCase();
  if (!SYMBOLS.includes(symbol)) return res.status(404).json({ error: `Unknown symbol ${symbol}` });
  const latest = await getLatest(symbol);
  if (!latest) return res.status(404).json({ error: 'No data yet for this symbol' });
  res.json(latest);
});

app.get('/api/prices/:symbol/history', async (req, res) => {
  const symbol = req.params.symbol.toUpperCase();
  if (!SYMBOLS.includes(symbol)) return res.status(404).json({ error: `Unknown symbol ${symbol}` });

  const interval = req.query.interval ?? '1m';
  if (!Object.hasOwn(LOOKBACK_HOURS, interval)) {
    return res.status(400).json({ error: 'interval must be 1m, 5m or 1h' });
  }

  const range = parseRange(req.query, { defaultMs: LOOKBACK_HOURS[interval] * HOUR, maxMs: 14 * DAY });
  if (range.error) return res.status(400).json({ error: range.error });

  // one query per UTC day partition, merged oldest-to-newest (see util.js)
  const rows = await fetchCandles(symbol, interval, range.from, range.to);
  const points = rows.map((r) => ({
    price: r.close.toString(),
    volume: r.volume.toString(),
    ts: r.ts.toISOString(),
    open: r.open.toString(),
    high: r.high.toString(),
    low: r.low.toString(),
    close: r.close.toString(),
  }));
  res.json(points);
});

app.get('/api/health', async (req, res) => res.json(await getHealth()));

// compare + replay live in routes.js
app.use('/api', router);

// any other /api/... URL: JSON 404 instead of Express's default HTML page
app.use('/api', (req, res) => res.status(404).json({ error: 'Not found' }));

// must come after all routes: catches errors thrown inside them
app.use((err, req, res, next) => {
  if (err.status >= 400 && err.status < 500) {   // e.g. malformed JSON body
    return res.status(err.status).json({ error: err.type === 'entity.parse.failed' ? 'Invalid JSON body' : err.message });
  }
  console.error(err);
  res.status(500).json({ error: 'Internal server error' });
});

// ---------- startup ----------

process.on('unhandledRejection', (reason) => console.error('unhandled rejection:', reason));

const server = http.createServer(app);
attachWebSocket(server);
feed.on('tick', broadcast);            // every trade goes to browsers
bus.on('alert', broadcast);            // fired alerts too
bus.on('anomaly', broadcast);          // and detected anomalies
server.on('error', (err) => { console.error('HTTP server error:', err.message); process.exit(1); });

try {
  await connectDb();                   // do not accept requests until Cassandra works
  await loadActiveAlerts();
} catch (err) {
  console.error(err.message);
  process.exit(1);
}

server.listen(config.port, () => {
  console.log(`API running on http://localhost:${config.port}`);
  startAlerts();
  startAnomalyDetector();
  startIngestor();
});

// ---------- graceful shutdown (Ctrl+C or kill) ----------

let shuttingDown = false;
async function shutdown(signal) {
  if (shuttingDown) return;
  shuttingDown = true;
  console.log(`${signal} received, shutting down...`);
  setTimeout(() => process.exit(1), 10_000).unref();   // failsafe if something hangs
  try {
    await stopIngestor();              // timers, Binance socket, final flush
    await closeWebSocket();            // browsers
    await new Promise((resolve) => server.close(resolve));   // HTTP
    await client.shutdown();           // Cassandra connections
  } catch (err) {
    console.error('error during shutdown:', err.message);
  }
  process.exit(0);
}
process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));
