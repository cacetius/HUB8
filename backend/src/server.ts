import { createApp } from './app';
import { env } from './config/env';
import { getDatabaseAdapter } from './config/database';

async function main() {
  const db = getDatabaseAdapter();
  await db.connect();

  const healthy = await db.healthCheck();
  if (!healthy) {
    // eslint-disable-next-line no-console
    console.error(`[BOOT] Falha ao conectar em ${env.DATABASE_PROVIDER}. Verifique .env / rede.`);
    process.exit(1);
  }

  const app = createApp();
  app.listen(env.PORT, () => {
    // eslint-disable-next-line no-console
    console.log(`[HUB8] API rodando na porta ${env.PORT} (DATABASE_PROVIDER=${env.DATABASE_PROVIDER})`);
  });
}

main().catch((err) => {
  // eslint-disable-next-line no-console
  console.error('[BOOT] Falha fatal ao iniciar:', err);
  process.exit(1);
});
