const { Db2Adapter } = require('../adapters/db2/Db2Adapter');
const { SqlServerAdapter } = require('../adapters/sqlserver/SqlServerAdapter');
const { env } = require('./env');

let instance;

function getDatabaseAdapter() {
  if (instance) return instance;

  const config = {
    host: env.DB_HOST,
    port: env.DB_PORT,
    database: env.DB_NAME,
    user: env.DB_USER,
    password: env.DB_PASSWORD,
  };

  switch (env.DATABASE_PROVIDER) {
    case 'db2':
      instance = new Db2Adapter(config);
      break;
    case 'sqlserver':
      instance = new SqlServerAdapter(config);
      break;
    default:
      throw new Error(`DATABASE_PROVIDER inválido: ${env.DATABASE_PROVIDER}`);
  }

  return instance;
}

module.exports = { getDatabaseAdapter };
