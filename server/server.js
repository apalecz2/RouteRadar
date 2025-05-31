import express from 'express';
import http from 'http';
import { WebSocketServer } from 'ws';
import fetch from 'node-fetch';
import cors from 'cors';

const DATA_URL = 'http://gtfs.ltconline.ca/Vehicle/VehiclePositions.json';
const POLL_INTERVAL = 5000; // 5 seconds

const app = express();
const server = http.createServer(app);
const wss = new WebSocketServer({ server });

app.use(cors());
app.get('/', (_, res) => res.send('LTC WebSocket server running'));

// Store connected clients
const clients = new Set();

// Poll the LTC feed every few seconds and broadcast
async function pollAndBroadcast() {
  try {
    const response = await fetch(DATA_URL);
    const data = await response.json();

    const message = JSON.stringify(data);
    for (const ws of clients) {
      if (ws.readyState === ws.OPEN) {
        ws.send(message);
      }
    }
  } catch (err) {
    console.error('Polling error:', err.message);
  }
}

// Start polling
setInterval(pollAndBroadcast, POLL_INTERVAL);

// Handle WebSocket connections
wss.on('connection', (ws) => {
  clients.add(ws);
  console.log('Client connected. Total:', clients.size);

  ws.on('close', () => {
    clients.delete(ws);
    console.log('Client disconnected. Total:', clients.size);
  });

  ws.send(JSON.stringify({ message: 'Connected to LTC live feed' }));
});

// Start server
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server listening on http://localhost:${PORT}`);
});
