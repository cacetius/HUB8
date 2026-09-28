const { FactoryCatalogService } = require('../../backend/src/services/FactoryCatalogService');

describe('FactoryCatalogService', () => {
  function buildService() {
    const repo = {
      findAll: jest.fn(),
      findById: jest.fn(),
      findActiveShifts: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      setActive: jest.fn(),
    };
    const audit = { record: jest.fn() };
    return { service: new FactoryCatalogService(repo, audit), repo, audit };
  }

  it('valida campos e associa o operador a uma operação ativa', async () => {
    const { service, repo, audit } = buildService();
    repo.findById
      .mockResolvedValueOnce({ ID: 8, NAME: 'Montagem' })
      .mockResolvedValueOnce({ ID: 21, NAME: 'Ana', OPERATION_ID: 8 });
    repo.create.mockResolvedValue(21);

    const result = await service.create(
      'operators',
      { name: ' Ana ', operationId: 8, status: 'ATIVO' },
      3,
      '127.0.0.1'
    );

    expect(repo.create).toHaveBeenCalledWith(
      'operators',
      { name: 'Ana', operationId: 8, status: 'ATIVO' },
      3
    );
    expect(audit.record).toHaveBeenCalledWith(expect.objectContaining({
      entity: 'OPERATORS',
      entityId: 21,
    }));
    expect(result.ID).toBe(21);
  });

  it('rejeita horários inválidos e campos que não pertencem à tabela', async () => {
    const { service } = buildService();
    await expect(service.create(
      'shifts',
      { name: 'Noite', startTime: '25:00', endTime: '06:00' },
      1
    )).rejects.toThrow('startTime deve estar no formato');
    await expect(service.create(
      'operations',
      { name: 'Linha', arbitrarySql: 'DROP TABLE USERS' },
      1
    )).rejects.toThrow('Campo não permitido');
  });

  it('encontra corretamente um turno que atravessa a meia-noite', async () => {
    const { service, repo } = buildService();
    jest.useFakeTimers().setSystemTime(new Date(2024, 0, 2, 1, 0));
    repo.findActiveShifts.mockResolvedValue([
      { ID: 4, START_TIME: '22:00:00', END_TIME: '06:00:00' },
    ]);

    try {
      await expect(service.currentShift()).resolves.toEqual({
        ID: 4,
        START_TIME: '22:00:00',
        END_TIME: '06:00:00',
      });
    } finally {
      jest.useRealTimers();
    }
  });
});
