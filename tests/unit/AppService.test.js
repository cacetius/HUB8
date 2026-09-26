const { AppService } = require('../../backend/src/services/AppService');

describe('AppService', () => {
  function buildService() {
    const repo = {
      findAll: jest.fn(),
      findById: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      softDelete: jest.fn(),
      restore: jest.fn(),
    };
    const audit = { record: jest.fn() };

    return { service: new AppService(repo, audit), repo, audit };
  }

  it('rejeita criação sem nome ou URL', async () => {
    const { service } = buildService();
    await expect(service.create({ name: '', url: '' }, 1)).rejects.toThrow('Nome e URL são obrigatórios.');
  });

  it('cria um app válido e registra auditoria', async () => {
    const { service, repo, audit } = buildService();
    repo.create.mockResolvedValue(42);
    repo.findById.mockResolvedValue({ ID: 42, NAME: 'VCP' });

    const result = await service.create({ name: 'VCP', url: 'vcp-monitor.html' }, 1, '127.0.0.1');

    expect(repo.create).toHaveBeenCalled();
    expect(audit.record).toHaveBeenCalledWith(expect.objectContaining({ action: 'CREATE', entity: 'APPS', entityId: 42 }));
    expect(result).toEqual({ ID: 42, NAME: 'VCP' });
  });

  it('exclusão é soft delete, não apaga de verdade', async () => {
    const { service, repo } = buildService();
    repo.findById.mockResolvedValue({ ID: 5, NAME: 'LIP' });

    await service.remove(5, 1);

    expect(repo.softDelete).toHaveBeenCalledWith(5, 1);
  });
});
