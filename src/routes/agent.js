const express = require('express');
const config = require('../config');
const { auth } = require('../utils/auth');
const { validateHeartbeat, validateAckStatus } = require('../utils/validation');
const agentStore = require('../services/agentStore');
const jobStore = require('../services/jobStore');

const router = express.Router();

// POST /api/agent/heartbeat — Windows agent registers printers every ~5s
router.post('/api/agent/heartbeat', auth('AGENT_API_KEY'), (req, res) => {
  const { error, value } = validateHeartbeat(req.body, config.agentId);
  if (error) return res.status(400).json({ error });
  agentStore.heartbeat(value.printers);
  res.json({ ok: true });
});

// POST /api/agent/claim — compat only, no queue in direct mode
router.post('/api/agent/claim', auth('AGENT_API_KEY'), (req, res) => {
  if (req.body.agentId !== config.agentId) return res.status(403).json({ error: 'Agent mismatch' });
  res.json({ job: null });
});

// POST /api/agent/jobs/:id/start — atomically claim a queued job before printing
router.post('/api/agent/jobs/:id/start', auth('AGENT_API_KEY'), (req, res) => {
  if (req.body.agentId !== config.agentId) return res.status(400).json({ error: 'Invalid agent/job' });
  const existing = jobStore.find(req.params.id);
  if (!existing) return res.status(404).json({ error: 'Job not found' });
  if (existing.status === 'cancelled') return res.status(409).json({ error: 'Job cancelled' });
  if (existing.status !== 'queued') return res.status(409).json({ error: `Job is already ${existing.status}` });
  const job = jobStore.start(req.params.id);
  res.json({ job });
});

// POST /api/agent/jobs/:id/ack — agent reports submitted/failed
router.post('/api/agent/jobs/:id/ack', auth('AGENT_API_KEY'), (req, res) => {
  if (req.body.agentId !== config.agentId) return res.status(400).json({ error: 'Invalid agent/job' });
  const err = validateAckStatus(req.body.status);
  if (err) return res.status(400).json({ error: err });
  const job = jobStore.ack(req.params.id, req.body.status, req.body.error);
  if (!job) return res.status(404).json({ error: 'Job not found (server restarted or direct mode expired)' });
  res.json({ job });
});

module.exports = router;
