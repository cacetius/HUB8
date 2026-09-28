const fs = require('node:fs/promises');
const path = require('node:path');
const { env } = require('../src/config/env');
const { getDatabaseAdapter } = require('../src/config/database');

function splitStatements(sql) {
  return sql
    .replace(/--.*$/gm, '')
    .split(';')
    .map((statement) => statement.trim())
    .filter(Boolean);
}

async function tableAlreadyExists(db, provider) {
  const query = provider === 'db2'
    ? "SELECT TABNAME FROM SYSCAT.TABLES WHERE TABNAME = 'USERS' AND TABSCHEMA = CURRENT SCHEMA"
    : "SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME = 'USERS'";
  const { rows } = await db.query(query);
  return rows.length > 0;
}

async function run() {
  const provider = process.argv[2];
  if (!['db2', 'sqlserver'].includes(provider)) {
    throw new Error('Informe o banco: npm run migrate:db2 ou npm run migrate:sqlserver.');
  }
  if (env.DATABASE_PROVIDER !== provider) {
    throw new Error(`DATABASE_PROVIDER precisa ser "${provider}" para executar esta migração.`);
  }

  const db = getDatabaseAdapter();
  try {
    await db.connect();
    if (await tableAlreadyExists(db, provider)) {
      throw new Error('A tabela USERS já existe. As migrações iniciais só podem ser usadas em um banco vazio.');
    }

    const root = path.resolve(__dirname, '..', '..');
    const schemaPath = path.join(root, 'database', 'migrations', provider, '001_initial_schema.sql');
    const seedPath = path.join(root, 'database', 'seeds', '002_roles_permissions.sql');

    for (const filePath of [schemaPath, seedPath]) {
      const sql = await fs.readFile(filePath, 'utf8');
      for (const statement of splitStatements(sql)) {
        await db.execute(statement);
      }
      console.log(`[MIGRATION] Aplicado: ${path.relative(root, filePath)}`);
    }
  } finally {
    await db.disconnect();
  }
}

if (require.main === module) {
  run().catch((error) => {
    console.error('[MIGRATION] Falha ao aplicar o schema inicial:', error);
    process.exitCode = 1;
  });
}

module.exports = { splitStatements, tableAlreadyExists, run };
