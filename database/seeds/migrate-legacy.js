/**
 * Importa o backup JSON do HUB 7 para DB2 ou SQL Server.
 *
 * Para exportar os dados, abra o HUB 7 no navegador e execute:
 *   copy(localStorage.getItem('fhw4'))
 *
 * Depois rode:
 *   node database/seeds/migrate-legacy.js ./legacy-export.json
 *
 * Registros com nomes que já existem são ignorados para evitar duplicatas.
 */
const fs = require('node:fs');
const { getDatabaseAdapter } = require('../../backend/src/config/database');

const MIGRATION_USER_ID = 1; // Usuário técnico criado pelo seed de administração.

function readBackup(filePath) {
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf-8'));
  } catch (error) {
    throw new Error('Não foi possível ler o backup JSON.', { cause: error });
  }
}

function validateBackup(data) {
  if (!data.apps && !data.operadores && !data.operacoes) {
    throw new Error('O arquivo não contém aplicativos, operadores ou operações.');
  }
}

async function nameExists(db, table, name) {
  const { rows } = await db.query(`SELECT ID FROM ${table} WHERE NAME = ?`, [name]);
  return rows.length > 0;
}

async function importApps(db, apps) {
  let imported = 0;
  let skipped = 0;

  for (const app of apps ?? []) {
    if (!app.name?.trim() || !app.filename?.trim() || await nameExists(db, 'APPS', app.name)) {
      skipped++;
      continue;
    }

    await db.execute(
      `INSERT INTO APPS (NAME, SUBTITLE, DESCRIPTION, CATEGORY, ICON, URL, STATUS, CREATED_BY, UPDATED_BY)
       VALUES (?, ?, ?, ?, ?, ?, 'ATIVO', ?, ?)`,
      [
        app.name,
        app.subtitle ?? null,
        app.desc ?? null,
        app.category ?? null,
        app.icon ?? null,
        app.filename,
        MIGRATION_USER_ID,
        MIGRATION_USER_ID,
      ]
    );
    imported++;
  }

  return { imported, skipped };
}

async function importOperators(db, operators) {
  let imported = 0;
  let skipped = 0;

  for (const operator of operators ?? []) {
    if (!operator.nome?.trim() || await nameExists(db, 'OPERATORS', operator.nome)) {
      skipped++;
      continue;
    }

    await db.execute(
      `INSERT INTO OPERATORS (NAME, STATUS, CREATED_BY, UPDATED_BY)
       VALUES (?, 'ATIVO', ?, ?)`,
      [operator.nome, MIGRATION_USER_ID, MIGRATION_USER_ID]
    );
    imported++;
  }

  return { imported, skipped };
}

async function importOperations(db, operations) {
  let imported = 0;
  let skipped = 0;

  for (const operation of operations ?? []) {
    if (!operation.nome?.trim() || await nameExists(db, 'OPERATIONS', operation.nome)) {
      skipped++;
      continue;
    }

    await db.execute(
      'INSERT INTO OPERATIONS (NAME, CREATED_BY, UPDATED_BY) VALUES (?, ?, ?)',
      [operation.nome, MIGRATION_USER_ID, MIGRATION_USER_ID]
    );
    imported++;
  }

  return { imported, skipped };
}

async function readTotals(db) {
  const [apps, operators, operations] = await Promise.all([
    db.query('SELECT COUNT(*) AS C FROM APPS'),
    db.query('SELECT COUNT(*) AS C FROM OPERATORS'),
    db.query('SELECT COUNT(*) AS C FROM OPERATIONS'),
  ]);

  return {
    apps: apps.rows[0].C,
    operators: operators.rows[0].C,
    operations: operations.rows[0].C,
  };
}

async function main() {
  const filePath = process.argv[2];
  if (!filePath) {
    throw new Error('Uso: node migrate-legacy.js <arquivo-exportado.json>');
  }

  const data = readBackup(filePath);
  validateBackup(data);

  const db = getDatabaseAdapter();
  await db.connect();

  const apps = await importApps(db, data.apps);
  const operators = await importOperators(db, data.operadores);
  const operations = await importOperations(db, data.operacoes);
  const totals = await readTotals(db);

  const skippedCount = apps.skipped + operators.skipped + operations.skipped;
  console.log('Migração concluída.');
  console.log(
    `Apps migrados: ${apps.imported} | Operadores: ${operators.imported} | Operações: ${operations.imported} | Ignorados (duplicados/inválidos): ${skippedCount}`
  );
  console.log(
    `Total no banco — APPS: ${totals.apps}, OPERATORS: ${totals.operators}, OPERATIONS: ${totals.operations}.`
  );

  await db.disconnect();
}

main().catch((error) => {
  console.error(error.message);
  if (error.cause) console.error(error.cause);
  process.exitCode = 1;
});
