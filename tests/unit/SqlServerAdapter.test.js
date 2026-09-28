const { SqlServerAdapter } = require('../../backend/src/adapters/sqlserver/SqlServerAdapter');

describe('SqlServerAdapter', () => {
  it('converte os parâmetros do repositório para o formato do SQL Server', () => {
    const adapter = new SqlServerAdapter({
      host: 'localhost',
      port: 1433,
      database: 'hub8',
      user: 'sa',
      password: 'test',
    });

    const sql = adapter.addParameterNames('SELECT * FROM APPS WHERE ID = ? AND NAME = ?');

    expect(sql).toBe('SELECT * FROM APPS WHERE ID = @p0 AND NAME = @p1');
  });

  it('retorna o identity gerado sem alterar o schema', async () => {
    const query = jest.fn().mockResolvedValue({
      recordset: [{ ID: 42 }],
      rowsAffected: [1],
    });
    const adapter = new SqlServerAdapter({
      host: 'localhost',
      port: 1433,
      database: 'hub8',
      user: 'sa',
      password: 'test',
    });
    adapter.pool = {
      request: () => ({ input: jest.fn(), query }),
    };

    await expect(adapter.insert(
      'INSERT INTO APPS (NAME) VALUES (?)',
      ['VCP']
    )).resolves.toEqual({ affectedRows: 1, insertId: 42 });
    expect(query.mock.calls[0][0]).toContain('SCOPE_IDENTITY()');
    expect(query.mock.calls[0][0]).toContain('VALUES (@p0)');
  });
});
