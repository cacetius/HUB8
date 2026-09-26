import { IDatabaseAdapter } from '../adapters/DatabaseAdapter';
import { Db2Adapter } from '../adapters/db2/Db2Adapter';
import { SqlServerAdapter } from '../adapters/sqlserver/SqlServerAdapter';
import { env } from './env';

/**
 * Único ponto do sistema que decide qual banco está por trás.
 * Trocar de banco = mudar DATABASE_PROVIDER no .env. Nada mais.
 */
let instance: IDatabaseAdapter | null = null;

export function getDatabaseAdapter(): IDatabaseAdapter {
  if (instance) return instance;

  const cfg = {
    host: env.DB_HOST,
    port: env.DB_PORT,
    database: env.DB_NAME,
    user: env.DB_USER,
    password: env.DB_PASSWORD,
  };

  if (env.DATABASE_PROVIDER === 'db2') {
    instance = new Db2Adapter(cfg);
  } else if (env.DATABASE_PROVIDER === 'sqlserver') {
    instance = new SqlServerAdapter(cfg);
  } else {
    throw new Error(`DATABASE_PROVIDER inválido: ${env.DATABASE_PROVIDER}`);
  }

  return instance;
}
