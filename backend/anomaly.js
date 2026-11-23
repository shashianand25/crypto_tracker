import { randomBytes } from 'node:crypto';
import { client, types } from './db.js';
import { feed, SYMBOLS } from './ingestor.js';
import { bus } from './live.js';
import { utcDay, utcDays } from './util.js';
import { config } from './config.js';

// ---------- settings (from config.js / .env) ----------
const Z_THRESHOLD = config.anomaly.zThreshold;          // how many std-devs counts as unusual
const WARMUP_SECONDS = config.anomaly.warmupSeconds;    // no detection until this much history
const COOLDOWN_SECONDS = config.anomaly.cooldownSeconds; // max 1 anomaly per symbol+metric per this
const MIN_MOVE = config.anomaly.minMovePct / 100;       // ignore smaller 1-second moves (percent -> fraction)

const WINDOW = 1800;   // 30 minutes of 1-second buckets
const LIMIT = 200;
const MAX_RANGE_MS = 7 * 86_400_000;

// ---------- small maths helpers ----------

// mean and standard deviation of the first n numbers of a buffer
export function meanStd(buf, n) {
  let sum = 0;
  for (let i = 0; i < n; i++) sum += buf[i];
  const mean = sum / n;
  let sq = 0;
  for (let i = 0; i < n; i++) sq += (buf[i] - mean) ** 2;
  return { mean, std: Math.sqrt(sq / n) };
}

// Severity bands on the z-score (HIGH >= 6, MEDIUM >= 5, otherwise LOW, i.e. 4 to 5 by default)
export const severityFor = (z) => (z >= 6 ? 'HIGH' : z >= 5 ? 'MEDIUM' : 'LOW');

// ---------- per-symbol state ----------
// ring buffers hold the last WINDOW closed seconds: volume, and absolute price return
const state = {};
for (const s of SYMBOLS) {
  state[s] = {
    sec: null,              // the unix second currently being filled
    vol: 0, price: null,    // summed volume and last price inside that second
    prevClose: null,        // price at the end of the previous second
    volBuf: new Float64Array(WINDOW), retBuf: new Float64Array(WINDOW),
    head: 0, n: 0,          // next write slot, and how many slots hold data
    lastFired: {},          // 'volume' | 'price' -> unix second of last anomaly (cooldown)
  };
}

export function startAnomalyDetector() {
  feed.on('tick', onTick);
}

function onTick(t) {
  const s = state[t.symbol];
  if (!s) return;
  const sec = Math.floor(Date.parse(t.ts) / 1000);
  if (s.sec === null) s.sec = sec;

  if (sec > s.sec) {
    closeBucket(t.symbol, s, s.sec);
    // seconds with no trades are real data too (volume 0), so they must be in the window
    const gap = Math.min(sec - s.sec - 1, WINDOW);
    for (let i = 1; i <= gap; i++) closeBucket(t.symbol, s, s.sec + i);
    s.sec = sec;
    s.vol = 0;
  }
  // (a late tick from an earlier second is just added to the current bucket)
  s.vol += Number(t.volume);
  s.price = Number(t.price);
}

// A second just ended: test it against the window, THEN add it to the window.
function closeBucket(symbol, s, sec) {
  const vol = sec === s.sec ? s.vol : 0;     // gap buckets carry no volume
  const price = s.price;
  const ret = s.prevClose ? Math.abs(price - s.prevClose) / s.prevClose : 0;

  if (s.n >= WARMUP_SECONDS) {
    const v = meanStd(s.volBuf, s.n);
    // std floor: never divide by ~0 when the market was dead quiet
    const volZ = (vol - v.mean) / Math.max(v.std, 0.1 * v.mean, 1e-9);
    if (volZ >= Z_THRESHOLD) {
      fire(symbol, s, sec, 'volume', volZ, vol, v.mean, price);
    }
    const r = meanStd(s.retBuf, s.n);
    const retZ = (ret - r.mean) / Math.max(r.std, 1e-6);
    if (retZ >= Z_THRESHOLD && ret >= MIN_MOVE) {
      fire(symbol, s, sec, 'price', retZ, ret, r.mean, price);
    }
  }

  s.volBuf[s.head] = vol;
  s.retBuf[s.head] = ret;
  s.head = (s.head + 1) % WINDOW;
  s.n = Math.min(s.n + 1, WINDOW);
  s.prevClose = price;
}

function fire(symbol, s, sec, metric, z, observed, mean, price) {
  if (sec - (s.lastFired[metric] ?? -Infinity) < COOLDOWN_SECONDS) return;   // cooldown
  s.lastFired[metric] = sec;

  const window = `${Math.round(Math.min(s.n, WINDOW) / 60)}m`;
  const anomaly = {
    id: 'anom_' + randomBytes(4).toString('hex'),
    symbol, metric,
    event: metric === 'volume' ? 'Unusual Volume Surge' : 'Sudden Price Move',
    description: metric === 'volume'
      ? `${z.toFixed(1)}x standard deviation above ${window} average (volume ${observed.toFixed(4)} vs avg ${mean.toFixed(4)} per second)`
      : `${z.toFixed(1)}x standard deviation above ${window} average (1-second move ${(observed * 100).toFixed(3)}% vs avg ${(mean * 100).toFixed(3)}%)`,
    price: String(price),
    volume: s.vol.toFixed(8),
    severity: severityFor(z),
    ts: new Date(),
  };
  save(anomaly).catch((e) => console.error('could not save anomaly:', e.message));
  bus.emit('anomaly', { type: 'anomaly', ...anomaly, ts: anomaly.ts.toISOString() });
}

function save(a) {
  return client.execute(
    `INSERT INTO anomalies_by_symbol_day
       (symbol, day, ts, id, metric, event, description, price, volume, severity)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [a.symbol, utcDay(a.ts), a.ts, a.id, a.metric, a.event, a.description,
     types.BigDecimal.fromString(a.price), types.BigDecimal.fromString(a.volume), a.severity],
    { prepare: true }
  );
}

// ---------- read side (for GET /api/anomalies) ----------

export const ANOMALY_DEFAULT_MS = 24 * 3_600_000;
export { MAX_RANGE_MS };

// symbols: array of symbols. One query per (symbol, day) partition, merged newest first.
export async function listAnomalies(symbols, from, to) {
  const days = utcDays(from, to);
  const queries = symbols.flatMap((symbol) =>
    days.map((day) =>
      client.execute(
        `SELECT id, symbol, metric, event, description, price, volume, severity, ts
         FROM anomalies_by_symbol_day
         WHERE symbol = ? AND day = ? AND ts >= ? AND ts <= ? LIMIT ?`,
        [symbol, day, from, to, LIMIT],
        { prepare: true }
      )
    )
  );
  const rows = (await Promise.all(queries)).flatMap((r) => r.rows);
  rows.sort((a, b) => b.ts - a.ts);
  return rows.slice(0, LIMIT).map((r) => ({
    id: r.id, symbol: r.symbol, metric: r.metric, event: r.event, description: r.description,
    price: r.price.toString(), volume: r.volume.toString(), severity: r.severity,
    ts: r.ts.toISOString(),
  }));
}
