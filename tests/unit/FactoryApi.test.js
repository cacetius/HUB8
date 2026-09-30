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

  it('exige permissões específicas para consultar o dashboard e os turnos', async () => {
    Object.assign(mockDatabase, {
      query: jest.fn(async (sql) => {
        if (sql.includes('SELECT ID, USERNAME, DISPLAY_NAME FROM USERS')) {
          return { rows: [{ ID: 7, USERNAME: 'admin', DISPLAY_NAME: 'Admin' }] };
        }
        if (sql.includes('SELECT R.CODE FROM ROLES')) return { rows: [{ CODE: 'OPERADOR' }] };
        if (sql.includes('SELECT DISTINCT P.CODE')) return { rows: [] };
        throw new Error(`Consulta inesperada no teste: ${sql}`);
      }),
    });
    server = createApp().listen(0);
    await new Promise((resolve) => server.once('listening', resolve));

    const login = await new AuthService(
      {
        findByUsername: jest.fn().mockResolvedValue({
          ID: 7,
          USERNAME: 'operator',
          DISPLAY_NAME: 'Operator',
          PASSWORD_HASH: 'test-hash',
        }),
        getRolesAndPermissions: jest.fn().mockResolvedValue({
          roles: ['OPERADOR'],
          permissions: [],
        }),
      },
      { record: jest.fn() }
    ).login('operator', 'test-password');
    const headers = { authorization: `Bearer ${login.token}` };
    const baseUrl = `http://127.0.0.1:${server.address().port}`;

    const dashboard = await fetch(`${baseUrl}/api/v1/dashboard/summary`, { headers });
    const shifts = await fetch(`${baseUrl}/api/v1/shifts/current`, { headers });

    expect(dashboard.status).toBe(403);
    expect(shifts.status).toBe(403);
    await expect(dashboard.json()).resolves.toMatchObject({
      success: false,
      code: 'FORBIDDEN',
    });
    await expect(shifts.json()).resolves.toMatchObject({
      success: false,
      code: 'FORBIDDEN',
    });
  });
});
