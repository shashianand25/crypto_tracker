import { Router } from 'express';
import { client } from './db.js';
import { SYMBOLS } from './ingestor.js';
import { HOUR, DAY, parseRange, utcDays, fetchCandles } from './util.js';
import { listAnomalies, ANOMALY_DEFAULT_MS, MAX_RANGE_MS } from './anomaly.js';
import { createAlert, deleteAlert, listActive, listTriggered } from './alerts.js';

export const router = Router();

// ---------- GET /api/compare?symbols=BTCUSDT,ETHUSDT&from&to ----------
// Returns { BTCUSDT: [{price, ts}], ETHUSDT: [...] } where price = candle close.

// Longer range -> bigger candles, so the chart never gets more than ~400 points.
function pickTimeframe(spanMs) {
  if (spanMs <= 6 * HOUR) return '1m';
  if (spanMs <= 48 * HOUR) return '5m';
  return '1h';
}

router.get('/compare', async (req, res) => {
  if (!req.query.symbols) return res.status(400).json({ error: 'symbols is required' });

  // "btcusdt, ETHUSDT" -> ['BTCUSDT', 'ETHUSDT'] (no duplicates)
  const symbols = [...new Set(String(req.query.symbols).split(',').map((s) => s.trim().toUpperCase()))];
  const unknown = symbols.find((s) => !SYMBOLS.includes(s));
  if (unknown !== undefined) return res.status(404).json({ error: `Unknown symbol ${unknown}` });

  const range = parseRange(req.query, { defaultMs: 24 * HOUR, maxMs: 14 * DAY });
  if (range.error) return res.status(400).json({ error: range.error });
  const { from, to } = range;

  const timeframe = pickTimeframe(to - from);
  const lists = await Promise.all(symbols.map((s) => fetchCandles(s, timeframe, from, to)));

  const out = {};
  symbols.forEach((s, i) => {
    out[s] = lists[i].map((r) => ({ price: r.close.toString(), ts: r.ts.toISOString() }));
  });
  res.json(out);
});

// ---------- GET /api/replay/:symbol?from&to ----------
// Raw ticks (1 per second) in strict ascending time order.

router.get('/replay/:symbol', async (req, res) => {
  const symbol = req.params.symbol.toUpperCase();
  if (!SYMBOLS.includes(symbol)) return res.status(404).json({ error: `Unknown symbol ${symbol}` });

  const range = parseRange(req.query, { defaultMs: 10 * 60_000, maxMs: 6 * HOUR });
  if (range.error) return res.status(400).json({ error: range.error });
  const { from, to } = range;

  // 6 hours = 21,600 rows. The driver pages at 5000 by default, so raise fetchSize
  // or the result would be silently cut short.
  const results = await Promise.all(
    utcDays(from, to).map((day) =>
      client.execute(
        `SELECT ts, price, volume FROM ticks_by_symbol_day
         WHERE symbol = ? AND day = ? AND ts >= ? AND ts <= ?`,
        [symbol, day, from, to],
        { prepare: true, fetchSize: 25000 }
      )
    )
  );

  // days come back in order and each partition is already ascending
  res.json(
    results.flatMap((r) => r.rows).map((r) => ({
      symbol,
      price: r.price.toString(),
      volume: r.volume.toString(),
      ts: r.ts.toISOString(),
    }))
  );
});

// ---------- alerts ----------

const METRICS = ['price', 'volume'];
const CONDITIONS = ['above', 'below'];

// accepts a number or a plain numeric string ("70000", "0.5"); returns NaN otherwise
function parseThreshold(v) {
  if (typeof v === 'string' && /^\d+(\.\d+)?$/.test(v.trim())) return Number(v);
  return typeof v === 'number' ? v : NaN;
}

router.post('/alerts', async (req, res) => {
  const b = req.body;
  if (!b || typeof b !== 'object' || Array.isArray(b)) {
    return res.status(400).json({ error: 'JSON body required' });
  }
  const symbol = typeof b.symbol === 'string' ? b.symbol.toUpperCase() : '';
  if (!SYMBOLS.includes(symbol)) return res.status(400).json({ error: `symbol must be one of ${SYMBOLS.join(', ')}` });
  if (!METRICS.includes(b.metric)) return res.status(400).json({ error: 'metric must be "price" or "volume"' });
  if (!CONDITIONS.includes(b.condition)) return res.status(400).json({ error: 'condition must be "above" or "below"' });
  const threshold = parseThreshold(b.threshold);
  if (!Number.isFinite(threshold) || threshold <= 0 || threshold > 1e12) {
    return res.status(400).json({ error: 'threshold must be a number greater than 0' });
  }

  const created = await createAlert({ symbol, metric: b.metric, condition: b.condition, threshold });
  if (!created) return res.status(400).json({ error: 'too many active alerts (max 100)' });
  res.status(201).json(created);
});

router.get('/alerts', (req, res) => res.json(listActive()));

// must be declared before anything matching /alerts/:id
router.get('/alerts/triggered', async (req, res) => {
  const range = parseRange(req.query, { defaultMs: 7 * DAY, maxMs: 30 * DAY });
  if (range.error) return res.status(400).json({ error: range.error });
  const limit = req.query.limit === undefined ? 100 : Number(req.query.limit);
  if (!Number.isInteger(limit) || limit < 1 || limit > 500) {
    return res.status(400).json({ error: 'limit must be an integer from 1 to 500' });
  }
  res.json(await listTriggered(range.from, range.to, limit));
});

router.delete('/alerts/:id', async (req, res) => {
  if (!/^alt_[0-9a-f]{8}$/.test(req.params.id) || !(await deleteAlert(req.params.id))) {
    return res.status(404).json({ error: 'Unknown alert id' });
  }
  res.status(204).end();
});

// ---------- anomalies ----------

// GET /api/anomalies?symbol&from&to  (newest first; no symbol = every tracked symbol)
router.get('/anomalies', async (req, res) => {
  let symbols = SYMBOLS;
  if (req.query.symbol !== undefined && req.query.symbol !== '') {
    const symbol = String(req.query.symbol).toUpperCase();
    if (!SYMBOLS.includes(symbol)) return res.status(404).json({ error: `Unknown symbol ${symbol}` });
    symbols = [symbol];
  }
  const range = parseRange(req.query, { defaultMs: ANOMALY_DEFAULT_MS, maxMs: MAX_RANGE_MS });
  if (range.error) return res.status(400).json({ error: range.error });
  res.json(await listAnomalies(symbols, range.from, range.to));
});
