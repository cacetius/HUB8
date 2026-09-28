const { AuditService } = require('../../backend/src/services/AuditService');

describe('AuditService', () => {
  it('normaliza filtros e pagina a consulta sem expor operações de escrita', async () => {
    const repo = {
      findAll: jest.fn().mockResolvedValue({ rows: [], total: 0, page: 1, pageSize: 20 }),
    };
    const service = new AuditService(repo);

    await service.list({
      userId: 3,
      entity: 'OPERATORS',
      from: '2026-09-01',
      to: '2026-09-30',
    }, 1, 20);

    expect(repo.findAll).toHaveBeenCalledWith({
      userId: 3,
      entity: 'OPERATORS',
      from: '2026-09-01T00:00:00.000Z',
      to: '2026-09-30T00:00:00.000Z',
    }, 1, 20);
    expect(service).not.toHaveProperty('create');
    expect(service).not.toHaveProperty('update');
    expect(service).not.toHaveProperty('delete');
  });

  it('rejeita intervalos invertidos, datas inválidas e filtros não permitidos', async () => {
    const service = new AuditService({});

    await expect(service.list({
      from: '2026-09-30',
      to: '2026-09-01',
    }, 1, 20)).rejects.toThrow('from não pode ser posterior');
    await expect(service.list({ from: 'ontem' }, 1, 20))
      .rejects.toThrow('from deve ser uma data ISO válida');
    await expect(service.list({ password: 'abc' }, 1, 20))
      .rejects.toThrow('Filtro não permitido');
  });
});
