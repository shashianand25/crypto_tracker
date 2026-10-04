import { client, types } from './db.js';

const symbol = 'BTCUSDT';
const day = types.LocalDate.fromString('2026-10-04');

await client.execute(
  'INSERT INTO ticks_by_symbol_day (symbol, day, ts, price, volume) VALUES (?, ?, ?, ?, ?)',
  [symbol, day, new Date(), types.BigDecimal.fromString('64010.50'), types.BigDecimal.fromString('0.010')],
  { prepare: true }
);

const result = await client.execute(
  'SELECT ts, price, volume FROM ticks_by_symbol_day WHERE symbol = ? AND day = ?',
  [symbol, day],
  { prepare: true }
);

for (const row of result.rows) {
  console.log(row.ts.toISOString(), row.price.toString(), row.volume.toString());
}

await client.shutdown();