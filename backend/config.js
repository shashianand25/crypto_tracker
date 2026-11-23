// All settings in one place. Every value has a default equal to the original
// hard-coded behaviour, so the app runs unchanged with no .env file.
import 'dotenv/config';

const str = (name, fallback) => process.env[name] || fallback;
// a positive number, otherwise the fallback (so a typo in .env can't break the app)
const num = (name, fallback) => {
  const v = Number(process.env[name]);
  return Number.isFinite(v) && v > 0 ? v : fallback;
};

export const config = {
  port: num('PORT', 3000),
  corsOrigin: str('CORS_ORIGIN', 'http://localhost:5173'),
  cassandraHosts: str('CASSANDRA_HOST', '127.0.0.1:9042').split(',').map((h) => h.trim()),
  cassandraDc: str('CASSANDRA_DC', 'datacenter1'),
  keyspace: str('CASSANDRA_KEYSPACE', 'crypto'),
  anomaly: {
    zThreshold: num('ANOMALY_Z_THRESHOLD', 4),
    warmupSeconds: num('ANOMALY_WARMUP_SECONDS', 300),
    cooldownSeconds: num('ANOMALY_COOLDOWN_SECONDS', 60),
    minMovePct: num('ANOMALY_MIN_MOVE_PCT', 0.03),
  },
};
