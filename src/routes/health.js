const express = require('express');
const agentStore = require('../services/agentStore');

const router = express.Router();

router.get('/health', (req, res) => {
  res.json({ ok: true, mode: 'direct', agentOnline: agentStore.isOnline() });
});

module.exports = router;
