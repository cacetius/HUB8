const { CATALOGS } = require('../repositories/FactoryCatalogRepository');
const { validationError } = require('../utils/request');

function normalizeInput(resource, input, creating) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    throw validationError('O corpo da requisição deve ser um objeto.');
  }

  const { fields } = CATALOGS[resource];
  const unknown = Object.keys(input).find((key) => !fields[key]);
  if (unknown) throw validationError(`Campo não permitido: ${unknown}.`);

  const result = {};
  for (const [key, definition] of Object.entries(fields)) {
    const value = input[key];
    if (value === undefined) {
      if (creating && definition.required) {
        throw validationError(`${key} é obrigatório.`);
      }
      continue;
    }
    if (value === null && definition.nullable) {
      result[key] = null;
      continue;
    }
    if (definition.type === 'text') {
      if (typeof value !== 'string') throw validationError(`${key} deve ser texto.`);
      const normalized = value.trim();
      if (!normalized && definition.required) throw validationError(`${key} é obrigatório.`);
      if (!normalized && !definition.nullable) {
        throw validationError(`${key} não pode ficar vazio.`);
      }
      if (normalized.length > definition.max) {
        throw validationError(`${key} não pode exceder ${definition.max} caracteres.`);
      }
      result[key] = normalized || null;
      continue;
    }
    if (definition.type === 'id') {
      if (!Number.isSafeInteger(value) || value < 1) {
        throw validationError(`${key} deve ser um ID positivo.`);
      }
      result[key] = value;
      continue;
    }
    if (definition.type === 'time') {
      if (
        typeof value !== 'string' ||
        !/^(?:[01]\d|2[0-3]):[0-5]\d(?::[0-5]\d(?:\.\d{1,7})?)?$/.test(value)
      ) {
        throw validationError(`${key} deve estar no formato HH:mm ou HH:mm:ss.`);
      }
      result[key] = value;
    }
  }

  if (!creating && Object.keys(result).length === 0) {
    throw validationError('Informe pelo menos um campo para atualizar.');
  }
  return result;
}

class FactoryCatalogService {
  constructor(repo, audit) {
    this.repo = repo;
    this.audit = audit;
  }

  async list(resource, page, pageSize, search) {
    if (search !== undefined && (typeof search !== 'string' || search.length > 100)) {
      throw validationError('search deve ser texto com até 100 caracteres.');
    }
    return this.repo.findAll(resource, page, pageSize, search?.trim() || undefined);
  }

  async get(resource, id) {
    const record = await this.repo.findById(resource, id);
    if (!record) throw validationError('Registro não encontrado.');
    return record;
  }

  async currentShift() {
    const shifts = await this.repo.findActiveShifts();
    const now = new Date();
    const nowMinutes = now.getHours() * 60 + now.getMinutes();
    const toMinutes = (value) => {
      const match = String(value).match(/^(\d{2}):(\d{2})/);
      return match ? Number(match[1]) * 60 + Number(match[2]) : null;
    };

    return shifts.find((shift) => {
      const start = toMinutes(shift.START_TIME);
      const end = toMinutes(shift.END_TIME);
      if (start === null || end === null) return false;
      return start <= end
        ? nowMinutes >= start && nowMinutes < end
        : nowMinutes >= start || nowMinutes < end;
    }) ?? null;
  }

  async create(resource, input, userId, ip) {
    const values = normalizeInput(resource, input, true);
    if (resource === 'operators' && values.operationId != null) {
      const operation = await this.repo.findById('operations', values.operationId);
      if (!operation) throw validationError('A operação informada não existe ou está inativa.');
    }
    const id = await this.repo.create(resource, values, userId);
    await this.audit.record({
      userId,
      action: 'CREATE',
      entity: CATALOGS[resource].table,
      entityId: id,
      newValue: values,
      ip,
    });
    return this.get(resource, id);
  }

  async update(resource, id, input, userId, ip) {
    const before = await this.get(resource, id);
    const values = normalizeInput(resource, input, false);
    if (resource === 'operators' && values.operationId != null) {
      const operation = await this.repo.findById('operations', values.operationId);
      if (!operation) throw validationError('A operação informada não existe ou está inativa.');
    }
    await this.repo.update(resource, id, values, userId);
    await this.audit.record({
      userId,
      action: 'UPDATE',
      entity: CATALOGS[resource].table,
      entityId: id,
      oldValue: before,
      newValue: values,
      ip,
    });
    return this.get(resource, id);
  }

  async remove(resource, id, userId, ip) {
    const before = await this.get(resource, id);
    await this.repo.setActive(resource, id, false, userId);
    await this.audit.record({
      userId,
      action: 'DELETE',
      entity: CATALOGS[resource].table,
      entityId: id,
      oldValue: before,
      ip,
    });
  }

  async restore(resource, id, userId, ip) {
    const before = await this.repo.findById(resource, id, true);
    if (!before) throw validationError('Registro não encontrado.');
    await this.repo.setActive(resource, id, true, userId);
    await this.audit.record({
      userId,
      action: 'RESTORE',
      entity: CATALOGS[resource].table,
      entityId: id,
      oldValue: before,
      ip,
    });
    return this.get(resource, id);
  }
}

module.exports = { FactoryCatalogService, normalizeInput };
