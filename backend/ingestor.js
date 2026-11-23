import WebSocket from 'ws';
import { EventEmitter } from 'node:events';
import { client, types } from './db.js';

export const SYMBOLS = ['BTCUSDT', 'ETHUSDT', 'SOLUSDT'];
export const feed = new EventEmitter();             // other modules listen for 'tick'
export const status = { connected: false, lastTickAt: null, dbOk: true };

const TIMEFRAMES = { '1m': 60_000, '5m': 300_000, '1h': 3_600_000 };
const URL =
  'wss://data-stream.binance.vision/stream?streams=' +
  SYMBOLS.map((s) => s.toLowerCase() + '@trade').join('/');

// working memory: one entry per coin
const state = {};
for (const s of SYMBOLS) {
  state[s] = { lastPrice: null, lastTs: null, secVolume: 0, dirty: false, candles: {} };
}

// current (still-forming) 1-minute candle volume; used by volume alerts
export const getMinuteVolume = (symbol) => state[symbol]?.candles['1m']?.volume ?? 0;

// Cassandra's `day` column is a calendar date; always compute it in UTC
const utcDay = (d) => types.LocalDate.fromString(d.toISOString().slice(0, 10));
const dec = (x) => types.BigDecimal.fromString(String(x));

function writeCandle(symbol, tf, c) {
  return client.execute(
    `INSERT INTO candles_by_symbol_day
       (symbol, timeframe, day, ts, open, high, low, close, volume)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [symbol, tf, utcDay(new Date(c.start)), new Date(c.start),
     dec(c.open), dec(c.high), dec(c.low), dec(c.close), dec(c.volume.toFixed(8))],
    { prepare: true }
  );
}

function updateCandles(symbol, st, price, qty, tsMs) {
  const p = Number(price);
  for (const [tf, ms] of Object.entries(TIMEFRAMES)) {
    const start = Math.floor(tsMs / ms) * ms;      // start of this candle's time bucket
    let c = st.candles[tf];
    if (c && c.start !== start) {                   // bucket rolled over: save the finished candle
      writeCandle(symbol, tf, c).catch((e) => console.error('candle write failed:', e.message));
      c = null;
    }
    if (!c) {
      c = st.candles[tf] = { start, open: price, high: price, low: price, close: price, volume: 0 };
    }
    if (p > Number(c.high)) c.high = price;
    if (p < Number(c.low)) c.low = price;
    c.close = price;
    c.volume += qty;
  }
}

function handleTrade(t) {
  const st = state[t.s];
  if (!st) return;
  const qty = Number(t.q);

  st.lastPrice = t.p;
  st.lastTs = t.T;
  st.secVolume += qty;
  st.dirty = true;
  updateCandles(t.s, st, t.p, qty, t.T);

  status.lastTickAt = new Date().toISOString();
  feed.emit('tick', {
    type: 'tick', symbol: t.s, price: t.p, volume: t.q, ts: new Date(t.T).toISOString(),
  });
}

// once per second: persist the latest state of each coin
let flushing = false;
async function flush() {
  if (flushing) return;          // previous flush still running (slow DB): skip this round
  flushing = true;
  try {
    await flushAll();
  } catch (err) {                // never let one bad round stop the loop
    console.error('flush failed:', err.message);
  } finally {
    flushing = false;
  }
}

async function flushAll() {
  for (const symbol of SYMBOLS) {
    const st = state[symbol];
    if (!st.dirty) continue;
    st.dirty = false;

    const ts = new Date(st.lastTs);
    const secVolume = st.secVolume;
    st.secVolume = 0;

    try {
      await Promise.all([
        client.execute(
          'INSERT INTO ticks_by_symbol_day (symbol, day, ts, price, volume) VALUES (?, ?, ?, ?, ?)',
          [symbol, utcDay(ts), ts, dec(st.lastPrice), dec(secVolume.toFixed(8))],
          { prepare: true }
        ),
        client.execute(
          'INSERT INTO latest_price (symbol, price, volume, ts) VALUES (?, ?, ?, ?)',
          [symbol, dec(st.lastPrice), dec(st.candles['1m'].volume.toFixed(8)), ts],
          { prepare: true }
        ),
        ...Object.keys(TIMEFRAMES).map((tf) => writeCandle(symbol, tf, st.candles[tf])),
      ]);
      status.dbOk = true;
    } catch (err) {
      status.dbOk = false;
      console.error(`write failed for ${symbol}:`, err.message);
    }
  }
}

let retry = 0;
let ws = null;
let flushTimer = null;
let reconnectTimer = null;
let stopped = false;

function connect() {
  ws = new WebSocket(URL);
  ws.on('open', () => { status.connected = true; retry = 0; console.log('Binance feed connected'); });
  ws.on('message', (raw) => {
    try {
      const msg = JSON.parse(raw);
      if (msg.data && msg.data.e === 'trade') handleTrade(msg.data);
    } catch (err) {              // one bad message must not crash the process
      console.error('bad Binance message:', err.message);
    }
  });
  ws.on('error', (err) => console.error('Binance feed error:', err.message));
  ws.on('close', () => {
    status.connected = false;
    if (stopped) return;         // shutting down: do not reconnect
    const wait = Math.min(30_000, 1000 * 2 ** retry++);
    console.log(`Binance feed closed, reconnecting in ${wait} ms`);
    reconnectTimer = setTimeout(connect, wait);
  });
}

export function startIngestor() {
  connect();
  flushTimer = setInterval(flush, 1000);
}

// Graceful shutdown: stop timers, close the Binance socket, write what is still in memory
export async function stopIngestor() {
  stopped = true;
  clearInterval(flushTimer);
  clearTimeout(reconnectTimer);
  if (ws) ws.close();
  while (flushing) await new Promise((r) => setTimeout(r, 50));   // let a running flush finish
  await flush();
}
