import { client, types } from './db.js';

const HOUR = 3_600_000;
const DAY = 24 * HOUR;
export { HOUR, DAY };

// Accepts ISO strings, unix seconds or unix milliseconds.
// Returns the fallback if the value is missing, or null if it is invalid.
export function parseTime(value, fallback) {
  if (value === undefined || value === '') return fallback;
  const s = String(value);
  const d = /^\d+$/.test(s) ? new Date(s.length <= 10 ? Number(s) * 1000 : Number(s)) : new Date(s);
  return Number.isNaN(d.getTime()) ? null : d;
}

// Reads ?from and ?to from a query object.
//   defaultMs: window used when "from" is missing (counted back from "to")
//   maxMs:     the longest range we allow
// Returns { from, to } or { error } (the caller answers 400 with the message).
export function parseRange(query, { defaultMs, maxMs }) {
  const to = parseTime(query.to, new Date());
  if (!to) return { error: 'invalid "to" time' };
  const from = parseTime(query.from, new Date(to.getTime() - defaultMs));
  if (!from) return { error: 'invalid "from" time' };
  if (from > to) return { error: '"from" must be before "to"' };
  if (to - from > maxMs) {
    return { error: `range too large (max ${Math.round(maxMs / HOUR)} hours)` };
  }
  return { from, to };
}

// Cassandra's `day` column is a calendar date. Always computed in UTC (never laptop time).
export const utcDay = (d) => types.LocalDate.fromString(d.toISOString().slice(0, 10));

// Every UTC day touched by [from, to], oldest first. One partition per day.
export function utcDays(from, to) {
  const days = [];
  const start = Date.UTC(from.getUTCFullYear(), from.getUTCMonth(), from.getUTCDate());
  for (let t = start; t <= to.getTime(); t += DAY) days.push(utcDay(new Date(t)));
  return days;
}

// Candle rows (oldest first) for one symbol and timeframe.
// One query per day partition, run in parallel, merged in order.
export async function fetchCandles(symbol, timeframe, from, to) {
  const results = await Promise.all(
    utcDays(from, to).map((day) =>
      client.execute(
        `SELECT ts, open, high, low, close, volume FROM candles_by_symbol_day
         WHERE symbol = ? AND timeframe = ? AND day = ? AND ts >= ? AND ts <= ?`,
        [symbol, timeframe, day, from, to],
        { prepare: true }
      )
    )
  );
  return results.flatMap((r) => r.rows);
}
