const { createApp } = require('./app');
const { env } = require('./config/env');
const { getDatabaseAdapter } = require('./config/database');

async function main() {
  const db = getDatabaseAdapter();
  try {
    await db.connect();
    if (!(await db.healthCheck())) {
      throw new Error(`Falha ao conectar em ${env.DATABASE_PROVIDER}. Verifique a configuração e a rede.`);
    }

    const app = createApp();
    const server = await new Promise((resolve, reject) => {
      const listener = app.listen(env.PORT, () => resolve(listener));
      listener.once('error', reject);
    });
    console.log(`[HUB8] API rodando na porta ${env.PORT} (DATABASE_PROVIDER=${env.DATABASE_PROVIDER})`);

    let shuttingDown = false;
    const shutdown = (signal) => {
      if (shuttingDown) return;
      shuttingDown = true;
      console.log(`[HUB8] Encerrando após ${signal}.`);
      server.close(async (error) => {
        try {
          await db.disconnect();
        } catch (disconnectError) {
          console.error('[HUB8] Falha ao fechar a conexão com o banco:', disconnectError);
          process.exitCode = 1;
        }
        if (error) {
          console.error('[HUB8] Falha ao encerrar o servidor HTTP:', error);
          process.exitCode = 1;
        }
      });
    };

    process.once('SIGINT', () => shutdown('SIGINT'));
    process.once('SIGTERM', () => shutdown('SIGTERM'));
  } catch (error) {
    try {
      await db.disconnect();
    } catch (disconnectError) {
      console.error('[BOOT] Falha ao fechar a conexão com o banco:', disconnectError);
    }
    throw error;
  }
}

main().catch((error) => {
  console.error('[BOOT] Falha fatal ao iniciar:', error);
  process.exitCode = 1;
});
