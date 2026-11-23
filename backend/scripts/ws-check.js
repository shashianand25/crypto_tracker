// Listens to /ws/live for about 15 seconds and prints how many messages of each type arrived.
// Usage: node scripts/ws-check.js [ws-url]
import WebSocket from 'ws';

const URL = process.argv[2] || 'ws://localhost:3000/ws/live';
const SECONDS = 15;
const counts = { tick: 0, alert: 0, anomaly: 0, other: 0 };

const ws = new WebSocket(URL);
ws.on('open', () => console.log(`Connected to ${URL}, listening for ${SECONDS} seconds...`));
ws.on('message', (raw) => {
  let type = 'other';
  try { type = JSON.parse(raw).type; } catch { /* not JSON: counted as other */ }
  counts[type in counts ? type : 'other']++;
  if (type === 'alert' || type === 'anomaly') console.log(`  ${type}:`, raw.toString());
});
ws.on('error', (err) => { console.error('WebSocket error:', err.message); process.exit(1); });

setTimeout(() => {
  console.log('Received:', counts);
  ws.close();
  // a feed with zero ticks means the backend is up but Binance is not delivering
  process.exit(counts.tick > 0 ? 0 : 1);
}, SECONDS * 1000);
