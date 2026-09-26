const { createApp } = require('./app');
const { env } = require('./config/env');
const { getDatabaseAdapter } = require('./config/database');

async function main() {
  const db = getDatabaseAdapter();
  await db.connect();

  if (!(await db.healthCheck())) {
    console.error(`[BOOT] Falha ao conectar em ${env.DATABASE_PROVIDER}. Verifique .env / rede.`);
    process.exit(1);
  }

  const app = createApp();
  app.listen(env.PORT, () => {
    console.log(`[HUB8] API rodando na porta ${env.PORT} (DATABASE_PROVIDER=${env.DATABASE_PROVIDER})`);
  });
}

main().catch((error) => {
  console.error('[BOOT] Falha fatal ao iniciar:', error);
  process.exit(1);
});
