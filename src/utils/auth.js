// Pure auth helpers. Reusable in any Express/Socket.IO project.
// No dependency on app state, only on config secrets.
const crypto = require('crypto');
const config = require('../config');

function safeEq(a, b) {
  if (typeof a !== 'string' || typeof b !== 'string') return false;
  const x = Buffer.from(a);
  const y = Buffer.from(b);
  return x.length === y.length && crypto.timingSafeEqual(x, y);
}

function bearerToken(req) {
  return (req.headers.authorization || '').replace(/^Bearer\s+/i, '');
}

// Express middleware factory. Usage: app.get('/x', auth('APP_API_KEY'), handler)
function auth(keyName) {
  const secret = keyName === 'AGENT_API_KEY' ? config.agentApiKey : config.appApiKey;
  return (req, res, next) =>
    safeEq(bearerToken(req), secret) ? next() : res.status(401).json({ error: 'Unauthorized' });
}

// Socket.IO middleware. Expects handshake.auth = { token, agentId }
function socketAuth(socket, next) {
  const { token, agentId } = socket.handshake.auth || {};
  if (safeEq(token, config.agentApiKey) && agentId === config.agentId) next();
  else next(new Error('Unauthorized'));
}

module.exports = { safeEq, bearerToken, auth, socketAuth };
