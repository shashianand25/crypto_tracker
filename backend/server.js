import express from 'express';
import cors from 'cors';
import http from 'node:http';
import WebSocket, { WebSocketServer } from 'ws';
import { client, types } from './db.js';
import { startIngestor, feed, status, SYMBOLS } from './ingestor.js';

const app = express();
app.use(cors({ origin: 'http://localhost:5173', credentials: true }));
app.use(express.json());

const ASSETS = [
  { symbol: 'BTCUSDT', name: 'Bitcoin',  baseAsset: 'BTC', quoteAsset: 'USDT', status: 'TRADING' },
  { symbol: 'ETHUSDT', name: 'Ethereum', baseAsset: 'ETH', quoteAsset: 'USDT', status: 'TRADING' },
  { symbol: 'SOLUSDT', name: 'Solana',   baseAsset: 'SOL', quoteAsset: 'USDT', status: 'TRADING' },
];

// default time window when the frontend doesn't send ?from=
const LOOKBACK_HOURS = { '1m': 24, '5m': 72, '1h': 168 };
const MAX_DAYS = 14;

// ---------- helpers ----------

// accepts ISO strings, unix seconds, or unix milliseconds
function parseTime(value, fallback) {
  if (value === undefined || value === '') return fallback;
  const s = String(value);
  const d = /^\d+$/.test(s) ? new Date(s.length <= 10 ? Number(s) * 1000 : Number(s)) : new Date(s);
  return Number.isNaN(d.getTime()) ? null : d;
}

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

  const to = parseTime(req.query.to, new Date());
  if (!to) return res.status(400).json({ error: 'invalid "to" time' });
  const from = parseTime(req.query.from, new Date(to.getTime() - LOOKBACK_HOURS[interval] * 3_600_000));
  if (!from) return res.status(400).json({ error: 'invalid "from" time' });
  if (from > to) return res.status(400).json({ error: '"from" must be before "to"' });

  // Our table is partitioned by (symbol, timeframe, day), so we need one query per UTC day
  const days = [];
  for (
    let t = Date.UTC(from.getUTCFullYear(), from.getUTCMonth(), from.getUTCDate());
    t <= to.getTime();
    t += 86_400_000
  ) {
    days.push(types.LocalDate.fromString(new Date(t).toISOString().slice(0, 10)));
  }
  if (days.length > MAX_DAYS) return res.status(400).json({ error: `range too large (max ${MAX_DAYS} days)` });

  const results = await Promise.all(
    days.map((day) =>
      client.execute(
        `SELECT ts, open, high, low, close, volume FROM candles_by_symbol_day
         WHERE symbol = ? AND timeframe = ? AND day = ? AND ts >= ? AND ts <= ?`,
        [symbol, interval, day, from, to],
        { prepare: true }
      )
    )
  );

  // each partition is already oldest-to-newest, and days are in order, so the result is too
  const points = results.flatMap((r) => r.rows).map((r) => ({
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

app.get('/api/health', (req, res) => {
  const healthy = status.connected && status.dbOk;
  res.json({
    status: healthy ? 'healthy' : 'degraded',
    healthy,
    uptime: Math.floor(process.uptime()),
    dataCollectionStatus: status.connected ? 'STREAMING' : 'DISCONNECTED',
    latestDataTimestamp: status.lastTickAt,
    backendAvailability: 'HIGH_AVAILABILITY',
    services: {
      binance_feed: status.connected ? 'CONNECTED' : 'DISCONNECTED',
      database: status.dbOk ? 'OK' : 'ERROR',
      ws_broadcaster: 'ACTIVE',
    },
  });
});

// must come after all routes: catches errors thrown inside them
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: 'Internal server error' });
});

// ---------- live WebSocket ----------

const server = http.createServer(app);
const wss = new WebSocketServer({ server, path: '/ws/live' });

function broadcast(message) {
  const text = JSON.stringify(message);
  for (const socket of wss.clients) {
    if (socket.readyState === WebSocket.OPEN) socket.send(text);
  }
}

wss.on('connection', () => console.log('browser connected, total clients:', wss.clients.size));
feed.on('tick', broadcast);

server.listen(3000, () => {
  console.log('API running on http://localhost:3000');
  startIngestor();
});