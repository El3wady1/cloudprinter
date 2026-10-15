// Entry point: node src/server.js
// Direct mode, no MongoDB. Flow: Flutter -> POST /api/print-jobs -> Socket.IO print-now -> Windows agent.
const http = require('http');
const config = require('./config');
const { createApp } = require('./app');
const { initSocket } = require('./socket');

const app = createApp();
const server = http.createServer(app);
initSocket(server);

server.listen(config.port, '0.0.0.0', () =>
  console.log('Cloud print backend listening (direct mode, no MongoDB)')
);
