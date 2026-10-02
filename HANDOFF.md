# Backend Implementation & Integration Handoff Specification

This document provides the complete, authoritative specification for implementing the backend service to pair with the **Crypto Market Intelligence Workstation** frontend.

---

## 1. Executive Summary & Architecture Context

- **Frontend Application**: Vite + React 18 + TypeScript + Tailwind CSS + TradingView Lightweight Charts
- **Frontend Running At**: `http://localhost:5173`
- **Backend Expected Port**: `http://localhost:3000`
- **Frontend Configuration Variable**: `VITE_API_BASE_URL=http://localhost:3000` (defined in `.env`)
- **WebSocket Feed URL**: `ws://localhost:3000/ws/live` (automatically derived by replacing `http:` with `ws:`)

The frontend contains **no mock data** and **no simulated timers**. It relies entirely on:
1. **REST APIs** for bootstrap state, historical charts, comparisons, alert rule persistence, and system health telemetry.
2. **WebSocket connection** for real-time tick streaming, live triggered alerts, and detected anomalies.

---

## 2. CORS & Network Requirements

The backend **must** enable CORS to allow requests originating from the Vite frontend.

### Required HTTP Headers
```http
Access-Control-Allow-Origin: http://localhost:5173
Access-Control-Allow-Methods: GET, POST, DELETE, OPTIONS
Access-Control-Allow-Headers: Content-Type, Accept, Authorization
Access-Control-Allow-Credentials: true
```
*Handle `OPTIONS` preflight requests with `204 No Content` or `200 OK`.*

---

## 3. Data Representation Rules

To maintain high numerical precision and avoid floating-point drift across market orders:
- **Prices and Volumes**: Strings or numbers are accepted by the frontend parser, but **strings are strongly preferred** (e.g. `"64000.10"`, `"0.000412"`, `"1.42"`).
- **Symbols**: Uppercase alphanumeric strings (e.g., `"BTCUSDT"`, `"ETHUSDT"`, `"SOLUSDT"`).
- **Timestamps (`ts`)**: Standard ISO 8601 UTC strings (e.g., `"2026-10-02T13:45:00.000Z"`) or Unix millisecond/second timestamps.

---

## 4. Complete REST API Specifications

### 4.1. Tracked Assets
Retrieves the list of active cryptocurrency instruments tracked by the ingestion pipeline.

- **Endpoint**: `GET /api/assets`
- **Response Code**: `200 OK`
- **Content-Type**: `application/json`
- **Response Format**: Array of asset objects or string array (the frontend normalizes both).

**Example Response**:
```json
[
  {
    "symbol": "BTCUSDT",
    "name": "Bitcoin",
    "baseAsset": "BTC",
    "quoteAsset": "USDT",
    "status": "TRADING"
  },
  {
    "symbol": "ETHUSDT",
    "name": "Ethereum",
    "baseAsset": "ETH",
    "quoteAsset": "USDT",
    "status": "TRADING"
  },
  {
    "symbol": "SOLUSDT",
    "name": "Solana",
    "baseAsset": "SOL",
    "quoteAsset": "USDT",
    "status": "TRADING"
  }
]
```

---

### 4.2. Latest Prices (All Assets)
Retrieves the most recent price and volume snapshots across all tracked instruments.

- **Endpoint**: `GET /api/prices/latest`
- **Response Code**: `200 OK`
- **Response Format**: Array of price objects OR key-value map keyed by symbol.

**Example Response (Array Format)**:
```json
[
  {
    "symbol": "BTCUSDT",
    "price": "64000.10",
    "volume": "12.450",
    "ts": "2026-10-02T13:45:00.000Z"
  },
  {
    "symbol": "ETHUSDT",
    "price": "2431.22",
    "volume": "142.80",
    "ts": "2026-10-02T13:45:00.000Z"
  }
]
```

---

### 4.3. Latest Price (Single Asset)
Retrieves the most recent price snapshot for a specific instrument.

- **Endpoint**: `GET /api/prices/:symbol/latest`
- **Parameters**: `symbol` (e.g. `BTCUSDT`)
- **Response Code**: `200 OK`

**Example Response**:
```json
{
  "symbol": "BTCUSDT",
  "price": "64000.10",
  "volume": "12.450",
  "ts": "2026-10-02T13:45:00.000Z"
}
```

---

### 4.4. Historical Price & Volume
Returns historical time-series points for candlestick or line chart rendering.

- **Endpoint**: `GET /api/prices/:symbol/history`
- **Query Parameters**:
  - `from` *(string, optional)*: ISO timestamp or millisecond timestamp
  - `to` *(string, optional)*: ISO timestamp or millisecond timestamp
  - `interval` *(enum, optional)*: `'1m'` | `'5m'` | `'1h'`
- **Response Code**: `200 OK`
- **Ordering**: Ascending chronological order (oldest to newest).

**Example Response**:
```json
[
  {
    "price": "63950.00",
    "volume": "4.50",
    "ts": "2026-10-02T12:00:00.000Z"
  },
  {
    "price": "63980.50",
    "volume": "6.12",
    "ts": "2026-10-02T12:01:00.000Z"
  },
  {
    "price": "64000.10",
    "volume": "12.45",
    "ts": "2026-10-02T12:02:00.000Z"
  }
]
```

---

### 4.5. Multi-Asset Comparison
Returns concurrent time-series data for multiple instruments over a shared timeframe.

- **Endpoint**: `GET /api/compare`
- **Query Parameters**:
  - `symbols` *(string, required)*: Comma-separated list (e.g., `BTCUSDT,ETHUSDT,SOLUSDT`)
  - `from` *(string, optional)*: ISO timestamp
  - `to` *(string, optional)*: ISO timestamp
- **Response Code**: `200 OK`

**Example Response**:
```json
{
  "BTCUSDT": [
    { "price": "63000.00", "ts": "2026-10-02T00:00:00.000Z" },
    { "price": "64000.10", "ts": "2026-10-02T12:00:00.000Z" }
  ],
  "ETHUSDT": [
    { "price": "2400.00", "ts": "2026-10-02T00:00:00.000Z" },
    { "price": "2431.22", "ts": "2026-10-02T12:00:00.000Z" }
  ]
}
```

---

### 4.6. Market Replay Data
Returns sequential historical tick logs for deterministic playback debugging.

- **Endpoint**: `GET /api/replay/:symbol`
- **Parameters**: `symbol` (e.g. `BTCUSDT`)
- **Query Parameters**:
  - `from` *(string, optional)*: ISO timestamp
  - `to` *(string, optional)*: ISO timestamp
- **Response Code**: `200 OK`
- **Ordering**: Strictly chronological ascending.

**Example Response**:
```json
[
  {
    "symbol": "BTCUSDT",
    "price": "63980.10",
    "volume": "0.150",
    "ts": "2026-10-02T10:00:00.120Z"
  },
  {
    "symbol": "BTCUSDT",
    "price": "63982.50",
    "volume": "0.040",
    "ts": "2026-10-02T10:00:01.400Z"
  },
  {
    "symbol": "BTCUSDT",
    "price": "64000.10",
    "volume": "1.250",
    "ts": "2026-10-02T10:00:03.000Z"
  }
]
```

---

### 4.7. Alerts API

#### Create Alert Rule
- **Endpoint**: `POST /api/alerts`
- **Request Headers**: `Content-Type: application/json`
- **Request Body**:
  ```json
  {
    "symbol": "BTCUSDT",
    "metric": "price",
    "condition": "above",
    "threshold": 70000
  }
  ```
  - `metric`: `'price'` | `'volume'`
  - `condition`: `'above'` | `'below'`
  - `threshold`: number
- **Response Code**: `201 Created` or `200 OK`
- **Response Body**:
  ```json
  {
    "id": "alt_89324a1b",
    "symbol": "BTCUSDT",
    "metric": "price",
    "condition": "above",
    "threshold": 70000,
    "status": "ACTIVE",
    "createdAt": "2026-10-02T13:45:00.000Z"
  }
  ```

#### Get Active Alerts
- **Endpoint**: `GET /api/alerts`
- **Response Code**: `200 OK`
- **Response Body**: Array of alert objects.

#### Delete Alert Rule
- **Endpoint**: `DELETE /api/alerts/:id`
- **Parameters**: `id` (e.g. `alt_89324a1b`)
- **Response Code**: `200 OK` or `204 No Content`

#### Get Triggered Alerts History
- **Endpoint**: `GET /api/alerts/triggered`
- **Response Code**: `200 OK`
- **Response Body**:
  ```json
  [
    {
      "id": "trig_001",
      "alertId": "alt_89324a1b",
      "symbol": "BTCUSDT",
      "metric": "price",
      "condition": "above",
      "threshold": 70000,
      "value": "70050.20",
      "triggeredAt": "2026-10-02T13:40:12.000Z"
    }
  ]
  ```

---

### 4.8. Anomalies API
Returns detected statistical anomalies (e.g., volume spikes, sudden volatility outliers).

- **Endpoint**: `GET /api/anomalies`
- **Query Parameters**:
  - `symbol` *(string, optional)*: Filter by symbol
  - `from` *(string, optional)*: ISO timestamp
  - `to` *(string, optional)*: ISO timestamp
- **Response Code**: `200 OK`

**Example Response**:
```json
[
  {
    "id": "anom_9921",
    "symbol": "BTCUSDT",
    "metric": "volume",
    "event": "Unusual Volume Surge",
    "description": "5.4x standard deviation above 30m moving average",
    "price": "64000.10",
    "volume": "48.20",
    "severity": "HIGH",
    "ts": "2026-10-02T13:42:13.000Z"
  }
]
```

---

### 4.9. Data Pipeline Health API
Engineering telemetry endpoint consumed by `/health` monitor.

- **Endpoint**: `GET /api/health`
- **Response Code**: `200 OK`

**Example Response**:
```json
{
  "status": "healthy",
  "healthy": true,
  "uptime": 86400,
  "dataCollectionStatus": "STREAMING",
  "latestDataTimestamp": "2026-10-02T13:58:32.000Z",
  "backendAvailability": "HIGH_AVAILABILITY",
  "services": {
    "binance_feed": "CONNECTED",
    "database": "OK",
    "ws_broadcaster": "ACTIVE"
  }
}
```

---

## 5. Live WebSocket Specification

- **Connection URL**: `ws://localhost:3000/ws/live`
- **Protocol**: Raw JSON frames over standard WebSocket.

The WebSocket broadcaster pushes three event types: `tick`, `alert`, and `anomaly`.

### 5.1. Live Tick Event (`type: "tick"`)
Broadcast whenever a price/trade update occurs for any tracked instrument.

```json
{
  "type": "tick",
  "symbol": "BTCUSDT",
  "price": "64000.10",
  "volume": "0.025",
  "ts": "2026-10-02T13:58:45.102Z"
}
```

### 5.2. Live Alert Event (`type: "alert"`)
Broadcast in real time when an alert threshold evaluates to true.

```json
{
  "type": "alert",
  "id": "trig_002",
  "symbol": "BTCUSDT",
  "metric": "price",
  "condition": "above",
  "threshold": 70000,
  "value": "70005.10",
  "message": "BTCUSDT crossed above $70,000",
  "ts": "2026-10-02T13:59:00.000Z"
}
```

### 5.3. Live Anomaly Event (`type: "anomaly"`)
Broadcast immediately when an outlier detector flags anomalous activity.

```json
{
  "type": "anomaly",
  "id": "anom_9930",
  "symbol": "ETHUSDT",
  "metric": "volume",
  "event": "Unusual volume activity",
  "description": "Rapid trade concentration detected",
  "price": "2431.22",
  "volume": "125.40",
  "ts": "2026-10-02T13:59:05.000Z"
}
```

---

## 6. Recommended Backend Implementation Path

For your teammate's AI agent building the backend, any standard backend framework will work cleanly.

### Option A: Node.js (Fastify / Express + `ws`)
1. Create `server.js` listening on port `3000`.
2. Attach `ws` server on path `/ws/live`.
3. In-memory data store for alert rules, triggered history, and rolling 10,000 tick buffer.
4. An ingestion worker (connecting to Binance public WebSocket or mock price random walk for development).

### Option B: Python (FastAPI + Uvicorn + WebSockets)
1. Use `fastapi.FastAPI()` with `CORSMiddleware`.
2. Implement `@app.websocket("/ws/live")` with `ConnectionManager`.
3. Background `asyncio.create_task` emitting ticks and evaluating active alert rules.

---

## 7. Verification & Smoke Test Commands

Run these terminal commands to verify that your backend implementation fulfills the contract:

```bash
# 1. Health check
curl -s http://localhost:3000/api/health

# 2. Tracked assets
curl -s http://localhost:3000/api/assets

# 3. Latest prices
curl -s http://localhost:3000/api/prices/latest

# 4. Symbol history
curl -s "http://localhost:3000/api/prices/BTCUSDT/history?interval=1m"

# 5. Create alert
curl -s -X POST http://localhost:3000/api/alerts \
  -H "Content-Type: application/json" \
  -d '{"symbol":"BTCUSDT","metric":"price","condition":"above","threshold":70000}'

# 6. Test WebSocket stream with wscat
npx wscat -c ws://localhost:3000/ws/live
```
