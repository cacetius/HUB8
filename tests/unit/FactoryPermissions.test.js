const mockDatabase = {};

jest.mock('../../backend/src/config/database', () => ({
  getDatabaseAdapter: () => mockDatabase,
}));

const {
  FACTORY_PERMISSIONS,
  FACTORY_ROLE_CODES,
  run,
} = require('../../backend/scripts/update-factory-permissions');

describe('atualização idempotente de permissões da fábrica', () => {
  it('associa CRUD operacional aos três perfis sem conceder gestão de usuários', async () => {
    const roleCodes = ['ADMIN', ...FACTORY_ROLE_CODES];
    const permissionsByCode = new Map(
      FACTORY_PERMISSIONS.map(([code], index) => [code, index + 1])
    );
    const query = jest.fn(async (sql, params = []) => {
      if (sql.includes('FROM ROLES WHERE ACTIVE')) {
        return { rows: roleCodes.map((CODE, ID) => ({ CODE, ID: ID + 1 })) };
      }
      if (sql.includes('FROM PERMISSIONS WHERE CODE')) {
        return { rows: [{ ID: permissionsByCode.get(params[0]) }] };
      }
      if (sql.includes('FROM ROLE_PERMISSIONS')) return { rows: [] };
      throw new Error(`Consulta inesperada no teste: ${sql}`);
    });
    const execute = jest.fn();
    const transaction = { query, execute };
    Object.assign(mockDatabase, {
      connect: jest.fn(),
      disconnect: jest.fn(),
      transaction: (callback) => callback(transaction),
    });
    const log = jest.spyOn(console, 'log').mockImplementation(() => {});

    try {
      await run();
    } finally {
      log.mockRestore();
    }

    expect(execute).toHaveBeenCalledTimes(FACTORY_PERMISSIONS.length * roleCodes.length);
    const managerRoleIds = FACTORY_ROLE_CODES.map((code) => roleCodes.indexOf(code) + 1);
    const managerGrants = execute.mock.calls.filter(([, params]) => managerRoleIds.includes(params[0]));
    expect(managerGrants).toHaveLength(FACTORY_PERMISSIONS.length * FACTORY_ROLE_CODES.length);
    expect(managerGrants.some(([, params]) => params[1] === permissionsByCode.get('shifts.manage'))).toBe(true);
    expect(FACTORY_PERMISSIONS.map(([code]) => code)).not.toContain('users.manage');
    expect(FACTORY_PERMISSIONS.map(([code]) => code)).not.toContain('system.manage');
    expect(mockDatabase.disconnect).toHaveBeenCalled();
  });
});
