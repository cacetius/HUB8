const { AdminUserService } = require('../../backend/src/services/AdminUserService');

describe('AdminUserService', () => {
  it('armazena hash e nunca registra a senha em auditoria', async () => {
    const repo = {
      create: jest.fn().mockResolvedValue(12),
      findById: jest.fn().mockResolvedValue({
        ID: 12,
        USERNAME: 'supervisor',
        DISPLAY_NAME: 'Supervisor',
        roles: ['SUPERVISOR'],
      }),
    };
    const audit = { record: jest.fn() };
    const service = new AdminUserService(repo, audit);

    await service.create({
      username: 'supervisor',
      displayName: 'Supervisor',
      password: 'A-strong-initial-pass-9',
      roleCodes: ['supervisor'],
    }, 1, '127.0.0.1');

    expect(repo.create.mock.calls[0][1]).toMatch(/^\$2[aby]\$/);
    expect(repo.create.mock.calls[0][1]).not.toBe('A-strong-initial-pass-9');
    expect(audit.record.mock.calls[0][0].newValue).not.toHaveProperty('password');
    expect(audit.record.mock.calls[0][0].newValue).not.toHaveProperty('PASSWORD_HASH');
  });

  it('não permite ao administrador desativar a própria conta', async () => {
    const repo = { findById: jest.fn().mockResolvedValue({ ID: 5, roles: ['ADMIN'] }) };
    const service = new AdminUserService(repo, { record: jest.fn() });

    await expect(service.setActive(5, false, 5)).rejects.toThrow('Não é possível desativar');
  });
});
