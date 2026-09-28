const { AuditRepository } = require('../../backend/src/repositories/AuditRepository');

describe('AuditRepository', () => {
  it('monta filtros SQL parametrizados e ordena eventos mais recentes primeiro', async () => {
    const db = {
      paginate: jest.fn().mockResolvedValue({ rows: [], total: 0, page: 1, pageSize: 20 }),
    };
    const repository = new AuditRepository(db);

    await repository.findAll({
      userId: 8,
      action: 'UPDATE',
      entity: 'OPERATORS',
      entityId: '27',
      from: '2026-09-01T00:00:00.000Z',
      to: '2026-09-30T23:59:59.000Z',
    }, 1, 20);

    expect(db.paginate).toHaveBeenCalledWith(
      expect.stringContaining(
        'WHERE USER_ID = ? AND ACTION = ? AND ENTITY = ? AND ENTITY_ID = ? AND DATE_TIME >= ? AND DATE_TIME <= ?'
      ),
      [8, 'UPDATE', 'OPERATORS', '27', '2026-09-01T00:00:00.000Z', '2026-09-30T23:59:59.000Z'],
      1,
      20,
      'DATE_TIME DESC, ID DESC'
    );
  });

  it('retorna erro claro ao consultar um evento inexistente', async () => {
    const repository = new AuditRepository({
      query: jest.fn().mockResolvedValue({ rows: [] }),
    });
    await expect(repository.findById(404)).resolves.toBeNull();
  });
});
