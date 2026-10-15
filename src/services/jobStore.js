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
    create({ printerName, title, lines, paper, copies }) {
      const now = new Date().toISOString();
      const job = {
        _id: crypto.randomUUID(),
        agentId,
        printerName,
        title,
        lines,
        paper,
        copies,
        status: 'processing',
        createdAt: now,
        updatedAt: now,
      };
      push(job);
      return job;
    },
    list() {
      return jobs;
    },
    find(id) {
      return jobs.find((j) => j._id === id);
    },
    ack(id, status, error) {
      const job = jobs.find((j) => j._id === id);
      if (!job) return null;
      job.status = status;
      job.updatedAt = new Date().toISOString();
      if (status === 'submitted') {
        job.submittedAt = job.updatedAt;
        job.lastError = null;
      } else {
        job.lastError = String(error || 'Unknown error').slice(0, 500);
      }
      return job;
    },
    retry(id) {
      const job = jobs.find((j) => j._id === id);
      if (!job || job.status !== 'failed') return null;
      job.status = 'processing';
      job.lastError = null;
      job.updatedAt = new Date().toISOString();
      return job;
    },
    // Shared by HTTP ack and Socket.IO print-result
    applyPrintResult({ id, status, error }) {
      const job = jobs.find((j) => j._id === id);
      if (!job) return null;
      if (status === 'submitted') {
        job.status = 'submitted';
        job.submittedAt = new Date().toISOString();
        job.updatedAt = job.submittedAt;
        job.lastError = null;
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
