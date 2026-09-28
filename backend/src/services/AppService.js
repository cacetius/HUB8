const { validationError } = require('../utils/request');

const APP_FIELDS = {
  name: { type: 'text', required: true, max: 160 },
  subtitle: { type: 'text', nullable: true, max: 200 },
  description: { type: 'text', nullable: true, max: 500 },
  category: { type: 'text', nullable: true, max: 60 },
  icon: { type: 'text', nullable: true, max: 120 },
  url: { type: 'text', required: true, max: 255 },
  status: { type: 'text', max: 20 },
  sortOrder: { type: 'number' },
  minRoleId: { type: 'id', nullable: true },
};

function normalizeApp(input, creating) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    throw validationError('O corpo da requisição deve ser um objeto.');
  }
  const unknown = Object.keys(input).find((key) => !APP_FIELDS[key]);
  if (unknown) throw validationError(`Campo não permitido: ${unknown}.`);
  if (creating && (
    typeof input.name !== 'string' ||
    !input.name.trim() ||
    typeof input.url !== 'string' ||
    !input.url.trim()
  )) {
    throw validationError('Nome e URL são obrigatórios.');
  }

  const result = {};
  for (const [key, definition] of Object.entries(APP_FIELDS)) {
    const value = input[key];
    if (value === undefined) {
      if (creating && definition.required) throw validationError(`${key} é obrigatório.`);
      continue;
    }
    if (value === null && definition.nullable) {
      result[key] = null;
      continue;
    }
    if (definition.type === 'text') {
      if (typeof value !== 'string') throw validationError(`${key} deve ser texto.`);
      const text = value.trim();
      if (definition.required && !text) throw validationError(`${key} é obrigatório.`);
      if (!text && !definition.nullable) {
        throw validationError(`${key} não pode ficar vazio.`);
      }
      if (text.length > definition.max) {
        throw validationError(`${key} não pode exceder ${definition.max} caracteres.`);
      }
      result[key] = text || null;
    } else if (definition.type === 'number') {
      if (!Number.isSafeInteger(value)) throw validationError(`${key} deve ser um número inteiro.`);
      result[key] = value;
    } else if (definition.type === 'id') {
      if (!Number.isSafeInteger(value) || value < 1) {
        throw validationError(`${key} deve ser um ID positivo.`);
      }
      result[key] = value;
    }
  }
  if (creating) result.status ??= 'ATIVO';
  if (creating) result.sortOrder ??= 0;
  if (!creating && Object.keys(result).length === 0) {
    throw validationError('Informe pelo menos um campo para atualizar.');
  }
  return result;
}

class AppService {
  constructor(repo, audit) {
    this.repo = repo;
    this.audit = audit;
  }

  list(page, pageSize, search) {
    if (search !== undefined && (typeof search !== 'string' || search.length > 100)) {
      throw validationError('search deve ser texto com até 100 caracteres.');
    }
    return this.repo.findAll(page, pageSize, search?.trim() || undefined);
  }

  async create(input, userId, ip) {
    const values = normalizeApp(input, true);
    const id = await this.repo.create(values, userId);
    await this.audit.record({
      userId,
      action: 'CREATE',
      entity: 'APPS',
      entityId: id,
      newValue: values,
      ip,
    });
    return this.repo.findById(id);
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

  async update(id, input, userId, ip) {
    const before = await this.get(id);
    const values = normalizeApp(input, false);
    await this.repo.update(id, values, userId);
    await this.audit.record({
      userId,
      action: 'UPDATE',
      entity: 'APPS',
      entityId: id,
      oldValue: before,
      newValue: values,
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
    const before = await this.repo.findAnyById(id);
    if (!before) throw validationError('Aplicativo não encontrado.');
    await this.repo.restore(id, userId);
    await this.audit.record({
      userId,
      action: 'RESTORE',
      entity: 'APPS',
      entityId: id,
      oldValue: before,
      ip,
    });
    return this.repo.findById(id);
  }
}

module.exports = { AppService, normalizeApp };
