require('dotenv/config');

function required(name, fallback) {
  const value = process.env[name] ?? fallback;
  if (value === undefined) {
    throw new Error(`Variável de ambiente ausente: ${name}`);
  }
  return value;
}

const env = {
  APP_ENV: process.env.APP_ENV ?? 'development',
  PORT: Number(process.env.PORT ?? 3000),
  DATABASE_PROVIDER: process.env.DATABASE_PROVIDER ?? 'sqlserver',
  DB_HOST: required('DB_HOST', 'localhost'),
  DB_PORT: required('DB_PORT', '1433'),
  DB_NAME: required('DB_NAME', 'hub8'),
  DB_USER: required('DB_USER', 'sa'),
  DB_PASSWORD: required('DB_PASSWORD', 'changeme'),
  JWT_SECRET: required('JWT_SECRET', 'dev-only-change-me'),
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN ?? '8h',
  ALLOWED_APP_ORIGINS: (process.env.ALLOWED_APP_ORIGINS ?? '').split(',').filter(Boolean),
};

module.exports = { env };
