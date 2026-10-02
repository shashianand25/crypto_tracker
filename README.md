# Crypto Market Intelligence Workstation

A production-quality real-time cryptocurrency market intelligence dashboard engineered for financial analytics, trading workstations, and observability consoles.

## Architecture

```
src/
├── api/
│   └── client.ts              # Centralized REST API client & WS URL derivation
├── charts/
│   ├── FinancialPriceChart.tsx # Lightweight Charts (TradingView) price & volume time-series
│   ├── ComparisonChart.tsx    # Multi-asset normalized % (base=100) & absolute price charts
│   └── ReplayChart.tsx        # Progressive tick-by-tick market replay visualization
├── components/
│   ├── alerts/
│   │   ├── ActiveAlertsTable.tsx
│   │   ├── AlertForm.tsx
│   │   └── TriggeredAlertsTable.tsx
│   ├── anomalies/
│   │   ├── AnomalyInspector.tsx
│   │   └── AnomalyTable.tsx
│   ├── common/
│   │   ├── ConnectionStatus.tsx
│   │   ├── DataFreshness.tsx
│   │   ├── EmptyState.tsx
│   │   ├── ErrorState.tsx
│   │   ├── LoadingSkeleton.tsx
│   │   └── MetricStrip.tsx
│   ├── markets/
│   │   └── AssetTable.tsx
│   ├── navigation/
│   │   ├── AssetSearchModal.tsx
│   │   ├── Sidebar.tsx
│   │   └── TopBar.tsx
│   └── replay/
│       ├── ReplayControls.tsx
│       └── ReplayTape.tsx
├── context/
│   └── WebSocketContext.tsx   # Singleton WebSocket lifecycle & subscriber bus
├── hooks/
│   ├── useAlerts.ts
│   ├── useAnomalies.ts
│   ├── useAssets.ts
│   ├── useDataFreshness.ts
│   ├── useHealth.ts
│   ├── useLatestPrices.ts
│   ├── usePriceHistory.ts
│   └── useWebSocket.ts
├── layouts/
│   └── AppShell.tsx
├── pages/
│   ├── AlertsPage.tsx
│   ├── AnomaliesPage.tsx
│   ├── AssetDetailPage.tsx
│   ├── ComparePage.tsx
│   ├── DataHealthPage.tsx
│   ├── MarketOverviewPage.tsx
│   └── ReplayPage.tsx
├── types/
│   ├── alert.ts
│   ├── anomaly.ts
│   ├── health.ts
│   ├── market.ts
│   └── websocket.ts
└── utils/
    ├── cn.ts
    └── formatters.ts
```

## Setup & Running

### 1. Environment Configuration

Copy `.env.example` to `.env` (already configured by default):

```env
VITE_API_BASE_URL=http://localhost:3000
```

### 2. Development Mode

```bash
npm install
npm run dev
```

The application will start at `http://localhost:5173`.

### 3. Production Build

```bash
npm run build
npm run preview
```

## Features

- **Light Mode Workstation Aesthetic**: High-contrast, dense tabular layout with zero AI clichés.
- **WebSocket Lifecycle**: Full state tracking (`CONNECTING`, `CONNECTED`, `DISCONNECTED`, `RECONNECTING`, `RECONNECTED`) with exponential backoff.
- **Live Directional Flashes**: Subtle 400ms background highlights on price ticks.
- **TradingView Charts**: High-performance canvas-based financial charts via `lightweight-charts`.
- **Market Replay Engine**: Progressive tick disclosure, timeline scrubber, and speed controls (`0.5x` to `10x`).
- **Alerts & Anomalies**: Real-time push notification toasts and investigation console.
- **System Telemetry**: Round-trip ping latency and pipeline health observability.
