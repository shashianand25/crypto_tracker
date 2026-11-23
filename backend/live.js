import { EventEmitter } from 'node:events';
import WebSocket, { WebSocketServer } from 'ws';

// Shared event bus. Modules (alerts, anomalies) emit events here;
// server.js listens and forwards them to browsers. No module imports server.js.
export const bus = new EventEmitter();

const HEARTBEAT_MS = 30_000;
let wss = null;
let heartbeat = null;

// Attach the WebSocket server to the existing HTTP server on /ws/live
export function attachWebSocket(server) {
  wss = new WebSocketServer({ server, path: '/ws/live' });
  wss.on('error', (err) => console.error('WebSocket server error:', err.message));
  wss.on('connection', (socket) => {
    console.log('browser connected, total clients:', wss.clients.size);
    socket.isAlive = true;
    socket.on('pong', () => { socket.isAlive = true; });   // browser answered our ping
    socket.on('error', (err) => console.error('WebSocket client error:', err.message));
  });

  // Every 30 s: drop clients that never answered the previous ping (dead connections),
  // then ping everyone else.
  heartbeat = setInterval(() => {
    for (const socket of wss.clients) {
      if (!socket.isAlive) { socket.terminate(); continue; }
      socket.isAlive = false;
      socket.ping();
    }
  }, HEARTBEAT_MS);
  return wss;
}

// Send one JSON message to every connected browser
export function broadcast(message) {
  if (!wss) return;
  const text = JSON.stringify(message);
  for (const socket of wss.clients) {
    if (socket.readyState === WebSocket.OPEN) socket.send(text);
  }
}

// For graceful shutdown: stop the heartbeat, drop all clients, close the server
export function closeWebSocket() {
  clearInterval(heartbeat);
  if (!wss) return Promise.resolve();
  for (const socket of wss.clients) socket.terminate();
  return new Promise((resolve) => wss.close(resolve));
}
