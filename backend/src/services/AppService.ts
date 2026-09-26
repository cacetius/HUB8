import { AppRepository, AppInput } from '../repositories/AppRepository';
import { AuditRepository } from '../repositories/AuditRepository';

export class AppService {
  constructor(private repo: AppRepository, private audit: AuditRepository) {}

  list(page: number, pageSize: number, search?: string) {
    return this.repo.findAll(page, pageSize, search);
  }

  async get(id: number) {
    const app = await this.repo.findById(id);
    if (!app) {
      const err: any = new Error('Aplicativo não encontrado.');
      err.code = 'VALIDATION_ERROR';
      throw err;
    }
    return app;
  }

  async create(input: AppInput, userId: number, ip?: string) {
    if (!input.name?.trim() || !input.url?.trim()) {
      const err: any = new Error('Nome e URL são obrigatórios.');
      err.code = 'VALIDATION_ERROR';
      throw err;
    }
    const id = await this.repo.create(input, userId);
    await this.audit.record({ userId, action: 'CREATE', entity: 'APPS', entityId: id, newValue: input, ip });
    return this.repo.findById(id);
  }

  async update(id: number, input: Partial<AppInput>, userId: number, ip?: string) {
    const before = await this.get(id);
    await this.repo.update(id, input, userId);
    await this.audit.record({ userId, action: 'UPDATE', entity: 'APPS', entityId: id, oldValue: before, newValue: input, ip });
    return this.repo.findById(id);
  }

  async remove(id: number, userId: number, ip?: string) {
    const before = await this.get(id);
    await this.repo.softDelete(id, userId);
    await this.audit.record({ userId, action: 'DELETE', entity: 'APPS', entityId: id, oldValue: before, ip });
  }

  async restore(id: number, userId: number, ip?: string) {
    await this.repo.restore(id, userId);
    await this.audit.record({ userId, action: 'RESTORE', entity: 'APPS', entityId: id, ip });
    return this.repo.findById(id);
  }
}
