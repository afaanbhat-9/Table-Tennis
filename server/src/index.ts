import express from 'express';
import http from 'http';
import fs from 'fs';
import { Server } from 'socket.io';
import path from 'path';
import { fileURLToPath } from 'url';
import {
  ClientToServerEvents,
  ServerToClientEvents
} from '../../shared/types.js';
import { RoomManager } from './roomManager.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const server = http.createServer(app);

const io = new Server<ClientToServerEvents, ServerToClientEvents>(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

const PORT = Number(process.env.PORT) || 3001;
const roomManager = new RoomManager(io);

// Serve static client assets if built
const cwdClientPath = path.resolve(process.cwd(), 'dist/client');
const relClientPath = path.resolve(__dirname, '../../../../dist/client');
const clientDistPath = fs.existsSync(cwdClientPath) ? cwdClientPath : relClientPath;
app.use(express.static(clientDistPath));

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', time: Date.now() });
});

// For client-side routing fallback
app.get('*', (_req, res) => {
  res.sendFile(path.join(clientDistPath, 'index.html'), (err) => {
    if (err) {
      res.status(200).send('Table Tennis Server is running. Client build will be served here once built.');
    }
  });
});

io.on('connection', (socket) => {
  // Party creation
  socket.on('party:create', (data, callback) => {
    const res = roomManager.createParty(socket, data.playerName, data.flag);
    callback(res);
  });

  // Party joining
  socket.on('party:join', (data, callback) => {
    const res = roomManager.joinParty(socket, data.code, data.playerName, data.flag);
    callback(res);
  });

  // Ready toggle
  socket.on('party:ready', (data) => {
    roomManager.setReady(socket, data.isReady);
  });

  // Host starts match
  socket.on('party:start', () => {
    roomManager.startMatch(socket);
  });

  // Rematch
  socket.on('party:rematch', () => {
    roomManager.rematch(socket);
  });

  // Leave party
  socket.on('party:leave', () => {
    roomManager.leaveParty(socket);
  });

  // Real-time paddle input
  socket.on('game:input', (input) => {
    roomManager.handleInput(socket, input);
  });

  // Ping for clock synchronization & latency check
  socket.on('ping', (clientTime, callback) => {
    if (typeof callback === 'function') {
      callback(clientTime);
    }
  });

  // Disconnect
  socket.on('disconnect', () => {
    roomManager.handleDisconnect(socket);
  });
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`[Table Tennis Server] Running on http://0.0.0.0:${PORT}`);
});
