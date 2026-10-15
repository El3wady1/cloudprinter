// In-memory agent presence. Reusable: copy this file to any project needing
// "is Windows PC online + which printers" without a database.
// For multi-instance use createAgentStore(); default export is a singleton.
const config = require('../config');

function createAgentStore({ onlineTimeoutMs = config.onlineTimeoutMs } = {}) {
  const state = { printerNames: [], lastSeen: null };

  return {
    heartbeat(printers) {
      state.printerNames = printers;
      state.lastSeen = new Date().toISOString();
    },
    isOnline(now = Date.now()) {
      return !!state.lastSeen && now - new Date(state.lastSeen).getTime() < onlineTimeoutMs;
    },
    getState() {
      return { printerNames: [...state.printerNames], lastSeen: state.lastSeen };
    },
    reset() {
      state.printerNames = [];
      state.lastSeen = null;
    },
  };
}

const singleton = createAgentStore();

module.exports = { createAgentStore, ...singleton };
