const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const { apiV1 } = require('./routes');
const { errorHandler } = require('./middleware/errorHandler');

function createApp() {
  const app = express();

  app.use(helmet());
  app.use(cors()); // Restringir as origens em produção; veja docs/SECURITY.md.
  app.use(express.json({ limit: '2mb' }));
  app.use(
    '/api',
    rateLimit({
      windowMs: 60_000,
      max: 300,
      standardHeaders: true,
      legacyHeaders: false,
    })
  );
  app.use('/api/v1', apiV1);
  app.get('/health', (_req, res) => res.json({ status: 'ok' }));
  app.use(errorHandler);

  return app;
}

module.exports = { createApp };
