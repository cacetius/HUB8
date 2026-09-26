class AppService {
  constructor(repo, audit) {
    this.repo = repo;
    this.audit = audit;
  }

  list(page, pageSize, search) {
    return this.repo.findAll(page, pageSize, search);
  }

  async get(id) {
    const app = await this.repo.findById(id);
    if (!app) {
      const error = new Error('Aplicativo não encontrado.');
      error.code = 'VALIDATION_ERROR';
      throw error;
    }
    return app;
  }

  async create(input, userId, ip) {
    if (!input.name?.trim() || !input.url?.trim()) {
      const error = new Error('Nome e URL são obrigatórios.');
      error.code = 'VALIDATION_ERROR';
      throw error;
    }

    const id = await this.repo.create(input, userId);
    await this.audit.record({
      userId,
      action: 'CREATE',
      entity: 'APPS',
      entityId: id,
      newValue: input,
      ip,
    });
    return this.repo.findById(id);
  }

  async update(id, input, userId, ip) {
    const before = await this.get(id);
    await this.repo.update(id, input, userId);
    await this.audit.record({
      userId,
      action: 'UPDATE',
      entity: 'APPS',
      entityId: id,
      oldValue: before,
      newValue: input,
      ip,
    });
    return this.repo.findById(id);
  }

  async remove(id, userId, ip) {
    const before = await this.get(id);
    await this.repo.softDelete(id, userId);
    await this.audit.record({
      userId,
      action: 'DELETE',
      entity: 'APPS',
      entityId: id,
      oldValue: before,
      ip,
    });
  }

  async restore(id, userId, ip) {
    await this.repo.restore(id, userId);
    await this.audit.record({ userId, action: 'RESTORE', entity: 'APPS', entityId: id, ip });
    return this.repo.findById(id);
  }
}

module.exports = { AppService };
