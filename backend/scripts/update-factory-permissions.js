const { getDatabaseAdapter } = require('../src/config/database');

const FACTORY_PERMISSIONS = [
  ['apps.view', 'Visualizar aplicativos'],
  ['apps.create', 'Criar aplicativos'],
  ['apps.edit', 'Editar aplicativos'],
  ['apps.delete', 'Excluir aplicativos'],
  ['operators.view', 'Visualizar operadores'],
  ['operators.create', 'Criar operadores'],
  ['operators.edit', 'Editar operadores'],
  ['operators.delete', 'Desativar operadores'],
  ['operations.view', 'Visualizar operações'],
  ['operations.create', 'Criar operações'],
  ['operations.edit', 'Editar operações'],
  ['operations.delete', 'Desativar operações'],
  ['reports.view', 'Visualizar relatórios'],
  ['shifts.manage', 'Gerenciar turnos'],
];
const FACTORY_ROLE_CODES = ['SUPERVISOR', 'LIDER', 'MONITOR'];
const REQUIRED_ROLES = ['ADMIN', ...FACTORY_ROLE_CODES];

async function run() {
  const db = getDatabaseAdapter();
  try {
    await db.connect();
    const addedPermissions = await db.transaction(async (transaction) => {
      const rolePlaceholders = REQUIRED_ROLES.map(() => '?').join(', ');
      const { rows: roles } = await transaction.query(
        `SELECT ID, CODE FROM ROLES WHERE ACTIVE = 1 AND CODE IN (${rolePlaceholders})`,
        REQUIRED_ROLES
      );
      const rolesByCode = new Map(roles.map((role) => [role.CODE, role]));
      const missingRoles = REQUIRED_ROLES.filter((code) => !rolesByCode.has(code));
      if (missingRoles.length > 0) {
        throw new Error(`Funções obrigatórias ausentes ou inativas: ${missingRoles.join(', ')}.`);
      }

      let permissionCount = 0;
      let grantCount = 0;
      for (const [code, description] of FACTORY_PERMISSIONS) {
        let { rows } = await transaction.query(
          'SELECT ID FROM PERMISSIONS WHERE CODE = ?',
          [code]
        );
        if (rows.length === 0) {
          await transaction.execute(
            'INSERT INTO PERMISSIONS (CODE, DESCRIPTION) VALUES (?, ?)',
            [code, description]
          );
          ({ rows } = await transaction.query(
            'SELECT ID FROM PERMISSIONS WHERE CODE = ?',
            [code]
          ));
          permissionCount += 1;
        }
        if (rows.length !== 1) throw new Error(`Permissão ${code} não pôde ser confirmada.`);

        for (const roleCode of REQUIRED_ROLES) {
          const roleId = rolesByCode.get(roleCode).ID;
          const permissionId = rows[0].ID;
          const { rows: links } = await transaction.query(
            'SELECT ROLE_ID FROM ROLE_PERMISSIONS WHERE ROLE_ID = ? AND PERMISSION_ID = ?',
            [roleId, permissionId]
          );
          if (links.length === 0) {
            await transaction.execute(
              'INSERT INTO ROLE_PERMISSIONS (ROLE_ID, PERMISSION_ID) VALUES (?, ?)',
              [roleId, permissionId]
            );
            grantCount += 1;
          }
        }
      }
      return { permissionCount, grantCount };
    });

    console.log(
      `[PERMISSIONS] Matriz aplicada; ${addedPermissions.permissionCount} permissões e ` +
        `${addedPermissions.grantCount} associações adicionadas.`
    );
  } finally {
    await db.disconnect();
  }
}

if (require.main === module) {
  run().catch((error) => {
    console.error('[PERMISSIONS] Falha ao aplicar permissões de fábrica:', error);
    process.exitCode = 1;
  });
}

module.exports = { FACTORY_PERMISSIONS, FACTORY_ROLE_CODES, run };
