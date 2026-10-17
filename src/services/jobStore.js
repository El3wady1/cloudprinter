// In-memory print-job store (direct mode, no MongoDB).
// Reusable: copy this file to any project needing a capped recent-jobs list.
// Pure logic, no Express/Socket dependency. Jobs lost on restart by design.
const crypto = require('crypto');
const config = require('../config');

function createJobStore({ maxJobs = config.maxJobs, agentId = config.agentId } = {}) {
  const jobs = []; // newest first

  function push(job) {
    jobs.unshift(job);
    if (jobs.length > maxJobs) jobs.length = maxJobs;
  }

  return {
    create({ printerName, title, lines, paper, copies, kind = 'receipt', sticker, html, page }) {
      const now = new Date().toISOString();
      const job = {
        _id: crypto.randomUUID(),
        agentId,
        printerName,
        title,
        lines,
        paper,
        copies,
        kind,
        status: 'queued',
        createdAt: now,
        updatedAt: now,
      };
      if (sticker) job.sticker = sticker;
      if (kind === 'html') { job.html = html; job.page = page; }
      push(job);
      return job;
    },
    list() {
      return jobs;
    },
    find(id) {
      return jobs.find((j) => j._id === id);
    },
    start(id) {
      const job = jobs.find((j) => j._id === id);
      if (!job || job.status !== 'queued') return null;
      job.status = 'processing';
      job.startedAt = new Date().toISOString();
      job.updatedAt = job.startedAt;
      return job;
    },
    cancel(id) {
      const job = jobs.find((j) => j._id === id);
      if (!job || job.status !== 'queued') return null;
      job.status = 'cancelled';
      job.cancelledAt = new Date().toISOString();
      job.updatedAt = job.cancelledAt;
      delete job.html;
      return job;
    },
    ack(id, status, error) {
      const job = jobs.find((j) => j._id === id);
      if (!job) return null;
      if (job.status === 'cancelled') return job;
      job.status = status;
      job.updatedAt = new Date().toISOString();
      if (status === 'submitted') {
        job.submittedAt = job.updatedAt;
        job.lastError = null;
        delete job.html; // free RAM: submitted jobs are never retried
      } else {
        job.lastError = String(error || 'Unknown error').slice(0, 500);
      }
      return job;
    },
    retry(id) {
      const job = jobs.find((j) => j._id === id);
      if (!job || job.status !== 'failed') return null;
      job.status = 'queued';
      job.lastError = null;
      job.updatedAt = new Date().toISOString();
      return job;
    },
    // Shared by HTTP ack and Socket.IO print-result
    applyPrintResult({ id, status, error }) {
      const job = jobs.find((j) => j._id === id);
      if (!job) return null;
      if (job.status === 'cancelled') return job;
      if (status === 'submitted') {
        job.status = 'submitted';
        job.submittedAt = new Date().toISOString();
        job.updatedAt = job.submittedAt;
        job.lastError = null;
        delete job.html; // free RAM: submitted jobs are never retried
      } else if (status === 'failed') {
        job.status = 'failed';
        job.lastError = String(error || 'Unknown error').slice(0, 500);
        job.updatedAt = new Date().toISOString();
      }
      return job;
    },
    reset() {
      jobs.length = 0;
    },
  };
}

const singleton = createJobStore();

module.exports = { createJobStore, ...singleton, list: singleton.list, find: singleton.find };
