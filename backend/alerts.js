import { randomBytes } from 'node:crypto';
import { client, types } from './db.js';
import { feed, getMinuteVolume } from './ingestor.js';
import { bus } from './live.js';
import { utcDay, utcDays } from './util.js';

const MAX_ACTIVE = 100;

// ACTIVE rules live here so the per-tick checker never touches Cassandra.
// Map: id -> { id, symbol, metric, condition, threshold (number), createdAt (Date) }
const active = new Map();

const newId = (prefix) => prefix + randomBytes(4).toString('hex');   // e.g. alt_89324a1b
const dec = (x) => types.BigDecimal.fromString(Number(x).toFixed(8));

const toApi = (r) => ({
  id: r.id, symbol: r.symbol, metric: r.metric, condition: r.condition,
  threshold: r.threshold, status: 'ACTIVE', createdAt: r.createdAt.toISOString(),
});

// ---------- startup ----------

// One-time full scan of alerts_by_id. Acceptable ONLY because the table is tiny
// (at most a few hundred rules). At scale a full-table scan touches every node and
// every partition, so you would instead keep an index table or shard rules by symbol.
export async function loadActiveAlerts() {
  const { rows } = await client.execute('SELECT id, symbol, metric, condition, threshold, status, created_at FROM alerts_by_id');
  for (const r of rows) {
    if (r.status !== 'ACTIVE') continue;   // filter in code, so no ALLOW FILTERING
    active.set(r.id, {
      id: r.id, symbol: r.symbol, metric: r.metric, condition: r.condition,
      threshold: Number(r.threshold.toString()), createdAt: r.created_at,
    });
  }
  console.log(`loaded ${active.size} active alert(s)`);
}

// Start listening to ticks. Call once, after loadActiveAlerts().
export function startAlerts() {
  feed.on('tick', checkTick);
}

// ---------- the checker (runs on every tick: memory only, no DB reads) ----------

function checkTick(tick) {
  for (const rule of active.values()) {
    if (rule.symbol !== tick.symbol) continue;
    const value = rule.metric === 'price' ? Number(tick.price) : getMinuteVolume(tick.symbol);
    const hit = rule.condition === 'above' ? value > rule.threshold : value < rule.threshold;
    if (!hit) continue;

    // Remove from the Map BEFORE any await, so the next tick can't fire it again.
    active.delete(rule.id);
    const shown = rule.metric === 'price' ? tick.price : value.toFixed(8);
    fire(rule, shown).catch((e) => console.error('alert fire failed:', e.message));
  }
}

const fmt = (n) => Number(n).toLocaleString('en-US', { maximumFractionDigits: 8 });

function buildMessage(rule) {
  const dir = rule.condition === 'above' ? 'above' : 'below';
  return rule.metric === 'price'
    ? `${rule.symbol} crossed ${dir} $${fmt(rule.threshold)}`
    : `${rule.symbol} 1-minute volume went ${dir} ${fmt(rule.threshold)}`;
}

async function fire(rule, value) {
  const id = newId('trig_');
  const now = new Date();
  try {
    await Promise.all([
      client.execute(
        'UPDATE alerts_by_id SET status = ?, triggered_at = ? WHERE id = ?',
        ['TRIGGERED', now, rule.id], { prepare: true }
      ),
      client.execute(
        `INSERT INTO triggered_alerts_by_day
           (day, triggered_at, id, alert_id, symbol, metric, condition, threshold, value)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [utcDay(now), now, id, rule.id, rule.symbol, rule.metric, rule.condition,
         dec(rule.threshold), dec(value)],
        { prepare: true }
      ),
    ]);
  } catch (e) {
    console.error('could not save triggered alert:', e.message);   // still notify the user below
  }
  bus.emit('alert', {
    type: 'alert', id, alertId: rule.id, symbol: rule.symbol, metric: rule.metric,
    condition: rule.condition, threshold: rule.threshold, value: String(value),
    message: buildMessage(rule), ts: now.toISOString(),
  });
}

// ---------- used by the REST routes ----------

export const listActive = () =>
  [...active.values()].sort((a, b) => b.createdAt - a.createdAt).map(toApi);

// Returns the new alert, or null if the cap is reached
export async function createAlert({ symbol, metric, condition, threshold }) {
  if (active.size >= MAX_ACTIVE) return null;
  let id = newId('alt_');
  while (active.has(id)) id = newId('alt_');
  const rule = { id, symbol, metric, condition, threshold, createdAt: new Date() };

  await client.execute(
    `INSERT INTO alerts_by_id (id, symbol, metric, condition, threshold, status, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [id, symbol, metric, condition, dec(threshold), 'ACTIVE', rule.createdAt],
    { prepare: true }
  );
  active.set(id, rule);   // only after the DB write succeeded
  return toApi(rule);
}

// Returns false if the id is not an active alert
export async function deleteAlert(id) {
  if (!active.delete(id)) return false;
  await client.execute('DELETE FROM alerts_by_id WHERE id = ?', [id], { prepare: true });
  return true;
}

// Fired alerts in [from, to], newest first. One query per UTC day, newest day first.
export async function listTriggered(from, to, limit) {
  const days = utcDays(from, to).reverse();
  const results = await Promise.all(
    days.map((day) =>
      client.execute(
        `SELECT id, alert_id, symbol, metric, condition, threshold, value, triggered_at
         FROM triggered_alerts_by_day
         WHERE day = ? AND triggered_at >= ? AND triggered_at <= ? LIMIT ?`,
        [day, from, to, limit],
        { prepare: true }
      )
    )
  );
  return results.flatMap((r) => r.rows).slice(0, limit).map((r) => ({
    id: r.id, alertId: r.alert_id, symbol: r.symbol, metric: r.metric, condition: r.condition,
    threshold: Number(r.threshold.toString()), value: r.value.toString(),
    triggeredAt: r.triggered_at.toISOString(),
  }));
}
