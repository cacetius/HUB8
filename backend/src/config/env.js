const path = require('node:path');
require('dotenv').config({ path: path.resolve(__dirname, '../../../.env') });

const VALID_ENVIRONMENTS = ['development', 'test', 'production'];
const VALID_DATABASES = ['db2', 'sqlserver'];

function loadEnv(source = process.env) {
  const appEnv = source.APP_ENV ?? 'development';
  const databaseProvider = source.DATABASE_PROVIDER ?? 'sqlserver';
  const port = Number(source.PORT ?? 3000);

  if (!VALID_ENVIRONMENTS.includes(appEnv)) {
    throw new Error('APP_ENV deve ser development, test ou production.');
  }
  if (!VALID_DATABASES.includes(databaseProvider)) {
    throw new Error('DATABASE_PROVIDER deve ser db2 ou sqlserver.');
  }
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error('PORT deve ser um número entre 1 e 65535.');
  }

  if (appEnv === 'production') {
    for (const name of ['DB_HOST', 'DB_PORT', 'DB_NAME', 'DB_USER', 'DB_PASSWORD', 'JWT_SECRET']) {
      if (!source[name]?.trim()) {
        throw new Error(`A variável ${name} precisa estar configurada em produção.`);
      }
    }
    if (
      source.JWT_SECRET.length < 32 ||
      new Set(source.JWT_SECRET).size < 12 ||
      ['dev-only-change-me', 'troque-isto-por-um-segredo-forte-de-32+chars'].includes(source.JWT_SECRET)
    ) {
      throw new Error('JWT_SECRET precisa ter pelo menos 32 caracteres em produção.');
    }
    if (['changeme', 'password', 'sa'].includes(source.DB_PASSWORD.toLowerCase())) {
      throw new Error('DB_PASSWORD ainda contém uma senha padrão; configure um segredo exclusivo.');
    }
  }
  const dbPort = source.DB_PORT ?? (databaseProvider === 'db2' ? '50000' : '1433');
  if (!/^\d+$/.test(dbPort) || Number(dbPort) < 1 || Number(dbPort) > 65535) {
    throw new Error('DB_PORT deve ser um número entre 1 e 65535.');
  }

  const allowedAppOrigins = (source.ALLOWED_APP_ORIGINS ?? '')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);

  for (const origin of allowedAppOrigins) {
    let parsed;
    try {
      parsed = new URL(origin);
    } catch {
      throw new Error(`Origem inválida em ALLOWED_APP_ORIGINS: ${origin}`);
    }
    if (parsed.origin !== origin || (appEnv === 'production' && parsed.protocol !== 'https:')) {
      throw new Error(`Origem não permitida em ALLOWED_APP_ORIGINS: ${origin}`);
    }
  }
  if (appEnv === 'production' && allowedAppOrigins.length === 0) {
    throw new Error('Configure ALLOWED_APP_ORIGINS com as origens HTTPS da fábrica.');
  }

  return {
    APP_ENV: appEnv,
    PORT: port,
    DATABASE_PROVIDER: databaseProvider,
    DB_HOST: source.DB_HOST ?? 'localhost',
    DB_PORT: dbPort,
    DB_NAME: source.DB_NAME ?? (databaseProvider === 'db2' ? 'HUB8' : 'hub8'),
    DB_USER: source.DB_USER ?? (databaseProvider === 'db2' ? 'db2inst1' : 'sa'),
    DB_PASSWORD: source.DB_PASSWORD ?? 'changeme',
    JWT_SECRET: source.JWT_SECRET ?? 'dev-only-change-me',
    JWT_EXPIRES_IN: source.JWT_EXPIRES_IN ?? '8h',
    ALLOWED_APP_ORIGINS: allowedAppOrigins,
  };
}

const env = loadEnv();

module.exports = { env, loadEnv };
