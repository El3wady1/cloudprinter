const express = require('express');
const config = require('../config');
const { auth } = require('../utils/auth');
const agentStore = require('../services/agentStore');

const router = express.Router();

router.get('/api/printers', auth('APP_API_KEY'), (req, res) => {
  const { printerNames } = agentStore.getState();
  res.json({ agentId: config.agentId, online: agentStore.isOnline(), printers: printerNames || [] });
});

module.exports = router;
