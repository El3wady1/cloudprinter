const express = require('express');
const { auth } = require('../utils/auth');
const { validatePrintJob } = require('../utils/validation');
const agentStore = require('../services/agentStore');
const jobStore = require('../services/jobStore');
const { emitPrintJob } = require('../socket');

const router = express.Router();

// POST /api/print-jobs — validate, check online/printer, create in-memory, emit print-now
router.post('/api/print-jobs', auth('APP_API_KEY'), (req, res, next) => {
  try {
    const { error, value } = validatePrintJob(req.body);
    if (error) return res.status(400).json({ error });

    if (!agentStore.isOnline()) {
      return res.status(409).json({ error: 'Agent offline - Windows PC not connected' });
    }
    const { printerNames } = agentStore.getState();
    if (!printerNames.includes(value.printerName)) {
      return res.status(400).json({ error: 'Printer not registered by Windows agent' });
    }

    const job = jobStore.create(value);
    emitPrintJob(job);
    res.status(202).json({ job });
  } catch (e) { next(e); }
});

// GET /api/print-jobs — in-memory recent list (max 50, lost on restart)
router.get('/api/print-jobs', auth('APP_API_KEY'), (req, res) => {
  res.json({ jobs: jobStore.list() });
});

// POST /api/print-jobs/:id/retry — only failed jobs
router.post('/api/print-jobs/:id/retry', auth('APP_API_KEY'), (req, res) => {
  const existing = jobStore.find(req.params.id);
  if (!existing || existing.status !== 'failed') {
    return res.status(409).json({ error: 'Only failed jobs can be retried' });
  }
  if (!agentStore.isOnline()) {
    return res.status(409).json({ error: 'Agent offline - Windows PC not connected' });
  }
  const job = jobStore.retry(req.params.id);
  emitPrintJob(job);
  res.json({ job });
});

// POST /api/print-jobs/:id/cancel — queued jobs can be skipped by the agent
router.post('/api/print-jobs/:id/cancel', auth('APP_API_KEY'), (req, res) => {
  const existing = jobStore.find(req.params.id);
  if (!existing) return res.status(404).json({ error: 'Job not found' });
  if (existing.status !== 'queued') {
    return res.status(409).json({ error: `Cannot cancel a ${existing.status} job` });
  }
  const job = jobStore.cancel(req.params.id);
  return res.json({ job });
});

module.exports = router;
