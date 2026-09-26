/**
 * Migração dos dados do HUB 7 (chave "fhw4" do localStorage) para o
 * banco relacional (DB2 ou SQL Server, via IDatabaseAdapter).
 *
 * Uso:
 *   1. No navegador com o HUB 7 aberto, rode no console:
 *        copy(localStorage.getItem('fhw4'))
 *      e salve o conteúdo em legacy-export.json
 *   2. ts-node database/seeds/migrate-legacy.ts ./legacy-export.json
 *
 * Fluxo (item 9 do escopo): Leitura → Validação → Conversão → API/Adapter → Validação final.
 * Idempotente: usa MERGE/checagem por NAME para não duplicar em reexecuções.
 */
import * as fs from 'fs';
import { getDatabaseAdapter } from '../../backend/src/config/database';

interface LegacyApp {
  id: string;
  icon: string;
  name: string;
  subtitle?: string;
  desc?: string;
  category?: string;
  filename: string;
  ops?: string[];
}

interface LegacyData {
  config?: { setor?: string; turno?: string; monitor?: string; lider?: string };
  apps?: LegacyApp[];
  operadores?: { id: string; nome: string }[];
  operacoes?: { id: string; nome: string }[];
}

async function main() {
  const filePath = process.argv[2];
  if (!filePath) {
    console.error('Uso: ts-node migrate-legacy.ts <arquivo-exportado.json>');
    process.exit(1);
  }

  // 1. Leitura
  const raw = fs.readFileSync(filePath, 'utf-8');
  let data: LegacyData;
  try {
    data = JSON.parse(raw);
  } catch (e) {
    console.error('Falha ao ler JSON legado — arquivo corrompido?', e);
    process.exit(1);
  }

  // 2. Validação básica
  if (!data.apps && !data.operadores && !data.operacoes) {
    console.error('Nenhum dado reconhecível encontrado no export legado.');
    process.exit(1);
  }

  const db = getDatabaseAdapter();
  await db.connect();

  const SYSTEM_USER_ID = 1; // usuário técnico "migration" — criar previamente via seed de ADMIN

  let migratedApps = 0, migratedOperators = 0, migratedOperations = 0, skipped = 0;

  // 3+4. Conversão + gravação (idempotente por NAME)
  for (const app of data.apps ?? []) {
    if (!app.name?.trim() || !app.filename?.trim()) { skipped++; continue; }
    const existing = await db.query('SELECT ID FROM APPS WHERE NAME = ?', [app.name]);
    if (existing.rows.length > 0) { skipped++; continue; }
    await db.execute(
      `INSERT INTO APPS (NAME, SUBTITLE, DESCRIPTION, CATEGORY, ICON, URL, STATUS, CREATED_BY, UPDATED_BY)
       VALUES (?, ?, ?, ?, ?, ?, 'ATIVO', ?, ?)`,
      [app.name, app.subtitle ?? null, app.desc ?? null, app.category ?? null, app.icon ?? null, app.filename, SYSTEM_USER_ID, SYSTEM_USER_ID]
    );
    migratedApps++;
  }

  for (const op of data.operadores ?? []) {
    if (!op.nome?.trim()) { skipped++; continue; }
    const existing = await db.query('SELECT ID FROM OPERATORS WHERE NAME = ?', [op.nome]);
    if (existing.rows.length > 0) { skipped++; continue; }
    await db.execute(
      `INSERT INTO OPERATORS (NAME, STATUS, CREATED_BY, UPDATED_BY) VALUES (?, 'ATIVO', ?, ?)`,
      [op.nome, SYSTEM_USER_ID, SYSTEM_USER_ID]
    );
    migratedOperators++;
  }

  for (const oc of data.operacoes ?? []) {
    if (!oc.nome?.trim()) { skipped++; continue; }
    const existing = await db.query('SELECT ID FROM OPERATIONS WHERE NAME = ?', [oc.nome]);
    if (existing.rows.length > 0) { skipped++; continue; }
    await db.execute(
      `INSERT INTO OPERATIONS (NAME, CREATED_BY, UPDATED_BY) VALUES (?, ?, ?)`,
      [oc.nome, SYSTEM_USER_ID, SYSTEM_USER_ID]
    );
    migratedOperations++;
  }

  // 5. Validação final
  const totals = await Promise.all([
    db.query('SELECT COUNT(*) AS C FROM APPS'),
    db.query('SELECT COUNT(*) AS C FROM OPERATORS'),
    db.query('SELECT COUNT(*) AS C FROM OPERATIONS'),
  ]);

  console.log('Migração concluída.');
  console.log(`  Apps migrados: ${migratedApps} | Operadores: ${migratedOperators} | Operações: ${migratedOperations} | Ignorados (duplicados/inválidos): ${skipped}`);
  console.log(`  Totais atuais no banco -> APPS: ${totals[0].rows[0].C}, OPERATORS: ${totals[1].rows[0].C}, OPERATIONS: ${totals[2].rows[0].C}`);

  await db.disconnect();
}

main().catch((e) => {
  console.error('Falha fatal na migração:', e);
  process.exit(1);
});
