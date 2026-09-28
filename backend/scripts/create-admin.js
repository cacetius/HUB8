const { env } = require('../src/config/env');
const { getDatabaseAdapter } = require('../src/config/database');
const { hashPassword } = require('../src/utils/password');

async function run() {
  const username = process.env.ADMIN_USERNAME?.trim();
  const displayName = process.env.ADMIN_DISPLAY_NAME?.trim();
  const password = process.env.ADMIN_INITIAL_PASSWORD;

  if (!username || username.length > 80) {
    throw new Error('Defina ADMIN_USERNAME (até 80 caracteres).');
  }
  if (!displayName || displayName.length > 160) {
    throw new Error('Defina ADMIN_DISPLAY_NAME (até 160 caracteres).');
  }
  if (!password || Buffer.byteLength(password, 'utf8') > 72 || password.length < 14) {
    throw new Error('ADMIN_INITIAL_PASSWORD deve ter pelo menos 14 e no máximo 72 bytes.');
  }

  const db = getDatabaseAdapter();
  try {
    await db.connect();
    const passwordHash = await hashPassword(password);
    await db.transaction(async (transaction) => {
      const { rows: existingUsers } = await transaction.query(
        'SELECT ID FROM USERS WHERE USERNAME = ?',
        [username]
      );
      if (existingUsers.length > 0) {
        throw new Error('Esse nome de usuário já existe; nenhum dado foi alterado.');
      }

      const { rows: adminRoles } = await transaction.query(
        "SELECT ID FROM ROLES WHERE CODE = 'ADMIN' AND ACTIVE = 1"
      );
      if (adminRoles.length !== 1) {
        throw new Error('O papel ADMIN não está provisionado. Execute as migrations e seeds primeiro.');
      }

      await transaction.execute(
        'INSERT INTO USERS (USERNAME, PASSWORD_HASH, DISPLAY_NAME) VALUES (?, ?, ?)',
        [username, passwordHash, displayName]
      );
      const { rows: newUsers } = await transaction.query(
        'SELECT ID FROM USERS WHERE USERNAME = ?',
        [username]
      );
      if (newUsers.length !== 1) {
        throw new Error('Não foi possível confirmar a criação do usuário administrador.');
      }
      await transaction.execute(
        'INSERT INTO USER_ROLES (USER_ID, ROLE_ID) VALUES (?, ?)',
        [newUsers[0].ID, adminRoles[0].ID]
      );
    });

    console.log(`[BOOTSTRAP] Administrador "${username}" criado.`);
  } finally {
    await db.disconnect();
  }
}

if (require.main === module) {
  run().catch((error) => {
    console.error('[BOOTSTRAP] Falha ao criar o administrador:', error);
    process.exitCode = 1;
  });
}

module.exports = { run };
