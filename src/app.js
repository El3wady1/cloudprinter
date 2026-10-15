// Express app factory. Reusable: const app = createApp() in tests or other servers.
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const config = require('./config');

function createApp() {
  const app = express();
  app.use(helmet());
  app.use(cors({ origin: config.corsOrigin }));
  app.use(express.json({ limit: '64kb' }));

  app.use(require('./routes/health'));
  app.use(require('./routes/printers'));
  app.use(require('./routes/printJobs'));
  app.use(require('./routes/agent'));

  // eslint-disable-next-line no-unused-vars
  app.use((err, req, res, next) => {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  });

  return app;
}

module.exports = { createApp };
