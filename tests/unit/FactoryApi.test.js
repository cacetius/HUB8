const mockDatabase = {};

jest.mock('../../backend/src/config/database', () => ({
  getDatabaseAdapter: () => mockDatabase,
}));
jest.mock('../../backend/src/utils/password', () => ({
  verifyPassword: jest.fn().mockResolvedValue(true),
}));

const { AuthService } = require('../../backend/src/services/AuthService');
const { createApp } = require('../../backend/src/app');

describe('API de fábrica', () => {
  let server;

  afterEach(async () => {
    if (server) {
      await new Promise((resolve, reject) => {
        server.close((error) => error ? reject(error) : resolve());
      });
      server = undefined;
    }
  });

  it('recarrega permissão e autoriza supervisor a criar operador', async () => {
    const query = jest.fn(async (sql) => {
      if (sql.includes('SELECT ID, USERNAME, DISPLAY_NAME FROM USERS')) {
        return { rows: [{ ID: 7, USERNAME: 'admin', DISPLAY_NAME: 'Admin' }] };
      }
      if (sql.includes('SELECT R.CODE FROM ROLES')) return { rows: [{ CODE: 'SUPERVISOR' }] };
      if (sql.includes('SELECT DISTINCT P.CODE')) {
        return { rows: [{ CODE: 'operators.create' }, { CODE: 'operators.view' }] };
      }
      if (sql.includes('FROM OPERATORS WHERE ID')) {
        return { rows: [{ ID: 23, NAME: 'Ana', ACTIVE: 1 }] };
      }
      throw new Error(`Consulta inesperada no teste: ${sql}`);
    });
    Object.assign(mockDatabase, {
      query,
      insert: jest.fn().mockResolvedValue({ insertId: 23 }),
      execute: jest.fn().mockResolvedValue({ affectedRows: 1 }),
    });
    server = createApp().listen(0);
    await new Promise((resolve) => server.once('listening', resolve));

    const login = await new AuthService(
      {
        findByUsername: jest.fn().mockResolvedValue({
          ID: 7,
          USERNAME: 'admin',
          DISPLAY_NAME: 'Admin',
          PASSWORD_HASH: 'test-hash',
        }),
        getRolesAndPermissions: jest.fn().mockResolvedValue({
          roles: ['ADMIN'],
          permissions: ['operators.create', 'operators.view'],
        }),
      },
      { record: jest.fn() }
    ).login('admin', 'test-password');
    const response = await fetch(
      `http://127.0.0.1:${server.address().port}/api/v1/operators`,
      {
        method: 'POST',
        headers: {
          authorization: `Bearer ${login.token}`,
          'content-type': 'application/json',
        },
        body: JSON.stringify({ name: 'Ana', status: 'ATIVO' }),
      }
    );
    const body = await response.json();

    expect(response.status).toBe(201);
    expect(body.success).toBe(true);
    expect(body.data).toEqual({ ID: 23, NAME: 'Ana', ACTIVE: 1 });
    expect(mockDatabase.insert).toHaveBeenCalledWith(
      expect.stringContaining('INSERT INTO OPERATORS'),
      expect.arrayContaining(['Ana', 'ATIVO', 7, 7])
    );
    expect(mockDatabase.execute).toHaveBeenCalledWith(
      expect.stringContaining('INSERT INTO AUDIT_LOG'),
      expect.any(Array)
    );
  });
});
