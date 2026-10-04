import express from 'express';
import cors from 'cors';

const app = express();

app.use(cors({ origin: 'http://localhost:5173', credentials: true }));
app.use(express.json());

const ASSETS = [
  { symbol: 'BTCUSDT', name: 'Bitcoin',  baseAsset: 'BTC', quoteAsset: 'USDT', status: 'TRADING' },
  { symbol: 'ETHUSDT', name: 'Ethereum', baseAsset: 'ETH', quoteAsset: 'USDT', status: 'TRADING' },
  { symbol: 'SOLUSDT', name: 'Solana',   baseAsset: 'SOL', quoteAsset: 'USDT', status: 'TRADING' },
];

app.get('/api/assets', (req, res) => res.json(ASSETS));

// Placeholder values for now. We'll replace them with real state later.
app.get('/api/health', (req, res) => {
  res.json({
    status: 'healthy',
    healthy: true,
    uptime: Math.floor(process.uptime()),
    dataCollectionStatus: 'STARTING',
    latestDataTimestamp: new Date().toISOString(),
    backendAvailability: 'HIGH_AVAILABILITY',
    services: { binance_feed: 'DISCONNECTED', database: 'UNKNOWN', ws_broadcaster: 'INACTIVE' },
  });
});

app.listen(3000, () => console.log('API running on http://localhost:3000'));