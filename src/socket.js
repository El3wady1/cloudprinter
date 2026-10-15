// Socket.IO layer. Reusable: initSocket(server) + emitPrintJob(job).
// Handles agent auth, room join, and print-result updates via jobStore.
const { Server } = require('socket.io');
const config = require('./config');
const { socketAuth } = require('./utils/auth');
const jobStore = require('./services/jobStore');

let ioRef = null;

function agentRoom() {
  return `agent:${config.agentId}`;
}

function initSocket(server) {
  const io = new Server(server, { cors: { origin: config.corsOrigin }, maxHttpBufferSize: 1e7 });
  io.use(socketAuth);
  io.on('connection', (socket) => {
    socket.join(agentRoom());
    socket.emit('connected', { ok: true, mode: 'direct' });

    socket.on('print-result', (payload = {}) => {
      if (payload.id && ['submitted', 'failed'].includes(payload.status)) {
        jobStore.applyPrintResult(payload);
      }
    });
  });
  ioRef = io;
  return io;
}

function getIo() {
  return ioRef;
}

function emitPrintJob(job) {
  if (!ioRef) return false;
  ioRef.to(agentRoom()).emit('print-now', job);
  return true;
}

module.exports = { initSocket, getIo, emitPrintJob, agentRoom };
