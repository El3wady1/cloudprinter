// Centralized env config. Reusable: require('./config') in any script.
// Throws/exits if required keys are missing so Railway fails fast.
require('dotenv').config();

const required = ['APP_API_KEY', 'AGENT_API_KEY', 'AGENT_ID'];
for (const key of required) {
  if (!process.env[key] || process.env[key].startsWith('CHANGE_')) {
    console.error(`Missing ${key}`);
    process.exit(1);
  }
}

const rawCors = process.env.CORS_ORIGIN ?? '*';
const corsOrigin = rawCors === '*' ? '*' : rawCors.split(',').map((s) => s.trim()).filter(Boolean);

module.exports = {
  port: Number(process.env.PORT) || 4001,
  appApiKey: process.env.APP_API_KEY,
  agentApiKey: process.env.AGENT_API_KEY,
  agentId: process.env.AGENT_ID,
  corsOrigin,
  onlineTimeoutMs: 30000,
  maxJobs: 50,
};
