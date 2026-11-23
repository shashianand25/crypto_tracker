import { client } from './db.js';
import { status } from './ingestor.js';

const STALE_AFTER_MS = 15_000;   // no tick for this long => STALE
const DB_CACHE_MS = 10_000;      // /api/health must not hit Cassandra on every poll

let dbCache = { ok: true, at: 0, pending: null };

// Real but cheap check: read one row from a tiny system table, cached for 10 s.
async function checkDb() {
  if (Date.now() - dbCache.at < DB_CACHE_MS) return dbCache.ok;
  if (!dbCache.pending) {                       // share one in-flight check between callers
    dbCache.pending = client.execute('SELECT release_version FROM system.local')
      .then(() => true, () => false)
      .then((ok) => { dbCache = { ok, at: Date.now(), pending: null }; return ok; });
  }
  return dbCache.pending;
}

export async function getHealth() {
  const dbOk = (await checkDb()) && status.dbOk;   // status.dbOk = did the last flush succeed
  const ageMs = status.lastTickAt ? Date.now() - Date.parse(status.lastTickAt) : Infinity;
  const stale = status.connected && ageMs > STALE_AFTER_MS;

  const healthy = status.connected && dbOk && !stale;
  return {
    status: healthy ? 'healthy' : 'degraded',
    healthy,
    uptime: Math.floor(process.uptime()),
    dataCollectionStatus: !status.connected ? 'DISCONNECTED' : stale ? 'STALE' : 'STREAMING',
    latestDataTimestamp: status.lastTickAt,
    dataFreshness: Number.isFinite(ageMs) ? Math.round(ageMs / 1000) : null,   // seconds since last tick
    backendAvailability: 'SINGLE_NODE',   // honest: one process, one Cassandra node
    services: {
      binance_feed: status.connected ? 'CONNECTED' : 'DISCONNECTED',
      database: dbOk ? 'OK' : 'ERROR',
      ws_broadcaster: 'ACTIVE',
    },
  };
}
