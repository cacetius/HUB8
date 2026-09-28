const { AdminUserRepository } = require('../../backend/src/repositories/AdminUserRepository');

describe('AdminUserRepository', () => {
  it('protege o último administrador ativo', async () => {
    const query = jest.fn(async (sql) => {
      if (sql.includes('SELECT ID, ACTIVE FROM USERS')) {
        return { rows: [{ ID: 1, ACTIVE: 1 }] };
      }
      if (sql.includes('SELECT ID, USERNAME, EMAIL')) {
        return {
          rows: [{
            ID: 1,
            USERNAME: 'admin',
            EMAIL: null,
            DISPLAY_NAME: 'Admin',
            ACTIVE: 1,
          }],
        };
      }
      if (sql.includes('SELECT UR.USER_ID, R.CODE')) return { rows: [{ USER_ID: 1, CODE: 'ADMIN' }] };
      if (sql.includes('COUNT(*) AS TOTAL')) return { rows: [{ TOTAL: 0 }] };
      throw new Error(`Consulta inesperada no teste: ${sql}`);
    });
    const execute = jest.fn();
    const transaction = { query, execute };
    const db = { transaction: (callback) => callback(transaction) };
    const repository = new AdminUserRepository(db);

    await expect(repository.update(1, { active: false }, 1))
      .rejects.toThrow('último administrador ativo');
    expect(execute).not.toHaveBeenCalled();
  });
});
