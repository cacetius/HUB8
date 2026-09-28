const { Db2Adapter } = require('../../backend/src/adapters/db2/Db2Adapter');

describe('Db2Adapter', () => {
  it('escapa a senha na connection string do driver', () => {
    const adapter = new Db2Adapter({
      host: 'localhost',
      port: '50000',
      database: 'HUB8',
      user: 'db2inst1',
      password: 'part;one}',
    });

    expect(adapter.connectionString).toContain('PWD={part;one}}};');
  });

  it('obtém o identity gerado na mesma conexão da inserção', async () => {
    const query = jest.fn((sql, _params, callback) => {
      if (sql.startsWith('INSERT')) return callback(null, {});
      callback(null, [{ ID: '19' }]);
    });
    const adapter = new Db2Adapter({
      host: 'localhost',
      port: '50000',
      database: 'HUB8',
      user: 'db2inst1',
      password: 'test',
    });
    adapter.withConnection = (callback) => callback({ query });

    await expect(adapter.insert('INSERT INTO APPS (NAME) VALUES (?)', ['VCP']))
      .resolves.toEqual({ affectedRows: 1, insertId: 19 });
    expect(query).toHaveBeenNthCalledWith(
      2,
      'SELECT IDENTITY_VAL_LOCAL() AS ID FROM SYSIBM.SYSDUMMY1',
      [],
      expect.any(Function)
    );
  });
});
