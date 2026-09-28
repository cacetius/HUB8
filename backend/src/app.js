const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const { apiV1 } = require('./routes');
const { errorHandler } = require('./middleware/errorHandler');
const { getDatabaseAdapter } = require('./config/database');
const { env } = require('./config/env');

function createApp() {
  const app = express();

  app.use(helmet());
  app.use(cors({
    origin: env.APP_ENV === 'production' ? env.ALLOWED_APP_ORIGINS : true,
  }));
  app.use(express.json({ limit: '2mb' }));

  // Limita a quantidade de chamadas à API por endereço IP.
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
  app.get('/ready', async (_req, res, next) => {
    try {
      const ready = await getDatabaseAdapter().healthCheck();
      return res.status(ready ? 200 : 503).json({ status: ready ? 'ok' : 'unavailable' });
    } catch (error) {
      return next(error);
    }
  });
  app.use(errorHandler);

  return app;
}

module.exports = { createApp };
