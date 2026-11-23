# Browser end-to-end checklist

Setup: Cassandra container running, `npm run dev` in `backend/`, and the frontend running (`npm run dev` in the repo root). Open http://localhost:5173.

**Always have DevTools open (Cmd+Option+I): check the Console for red errors and the Network tab for failed (red) requests. If something fails, copy the request URL and the response body and paste them to me.**

## 1. Overview (Market Overview)
- Three rows: BTCUSDT, ETHUSDT, SOLUSDT with prices that tick several times a second and flash up/down.
- Volumes are non-zero.
- Network: `/api/assets`, `/api/prices/latest` are 200; one WebSocket connection to `/ws/live` is open (Messages tab shows ticks).
- Top bar connection badge says CONNECTED.

## 2. Asset Detail
- Open BTCUSDT. A candlestick/price chart draws with the default 24H range and 1m interval.
- Switch the interval to 5m and 1h, and the range to 1H, 6H, 24H, 7D. Each change makes a request to `/api/prices/BTCUSDT/history?...` that returns 200.
- Note: data only exists from when the backend first ran, so long ranges may look short. That is expected.
- The last candle keeps moving live.

## 3. Compare
- Select two or three coins. A normalised comparison chart draws.
- Request: `/api/compare?symbols=...` returns 200 with one array per symbol.
- Change the range (1H, 6H, 24H, 7D). Short ranges use 1m candles, longer ones 5m or 1h.

## 4. Replay
- Default window is the last 4 hours. Press Play: the price tape fills and the chart advances. Try the speed buttons.
- Request: `/api/replay/BTCUSDT?from=...&to=...` returns 200.
- Set a window longer than 6 hours: you should see an error message ("range too large (max 6 hours)"), not a blank crash.
- Set a window with no data (before the backend first ran): you should see the empty state.

## 5. Alerts
- Create an alert: SOLUSDT, price, above, a value just below the current price. Within a second a notification toast appears, and the row shows up under Triggered Alerts. The Active list does not keep it.
- Create an alert far away (for example BTCUSDT price above 1000000): it appears under Active. Delete it with the delete button; it disappears.
- Try an invalid threshold (0 or empty): the form shows an error instead of creating it.
- Network: `POST /api/alerts` is 201, `DELETE /api/alerts/alt_...` is 204, `GET /api/alerts/triggered` is 200.

## 6. Anomalies
- The table shows past anomalies (may be empty on a calm market: "No anomalous activity detected" is correct).
- To see real ones during a demo, lower the thresholds in `backend/.env` (see `.env.example`), restart the backend, wait for the warm-up, then restore the defaults afterwards.
- A live anomaly shows a notification and a new row at the top, with a severity badge (LOW/MEDIUM/HIGH). Clicking a row opens the inspector panel.
- Filter by symbol: request `/api/anomalies?symbol=...` returns 200.

## 7. Data Health
- System state badge: Healthy (green), "Collector: STREAMING", a recent Server TS, freshness FRESH.
- The raw payload box shows `database: "OK"`, `binance_feed: "CONNECTED"`, `backendAvailability: "SINGLE_NODE"`.
- Stop the backend (Ctrl+C): the badge goes Disconnected and the connection badge shows RECONNECTING. Start it again: it recovers to RECONNECTED, then CONNECTED.
