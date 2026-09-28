const { validationError } = require('../utils/request');

function validateDate(value, field) {
  if (value === undefined) return undefined;
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}(?:T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?Z?)?$/.test(value)) {
    throw validationError(`${field} deve ser uma data ISO válida.`);
  }
  const date = new Date(value);
  if (Number.isNaN(date.valueOf())) throw validationError(`${field} deve ser uma data ISO válida.`);
  return date.toISOString();
}

function normalizeFilters(filters) {
  const allowed = ['userId', 'action', 'entity', 'entityId', 'from', 'to'];
  const unknown = Object.keys(filters).find((key) => !allowed.includes(key));
  if (unknown) throw validationError(`Filtro não permitido: ${unknown}.`);

  const result = {};
  if (filters.userId !== undefined) {
    if (!Number.isSafeInteger(filters.userId) || filters.userId < 1) {
      throw validationError('userId deve ser um ID positivo.');
    }
    result.userId = filters.userId;
  }
  for (const field of ['action', 'entity', 'entityId']) {
    if (filters[field] === undefined) continue;
    if (
      typeof filters[field] !== 'string' ||
      !filters[field].trim() ||
      filters[field].trim().length > 60
    ) {
      throw validationError(`${field} deve conter de 1 a 60 caracteres.`);
    }
    result[field] = filters[field].trim();
  }
  result.from = validateDate(filters.from, 'from');
  result.to = validateDate(filters.to, 'to');
  if (result.from && result.to && result.from > result.to) {
    throw validationError('from não pode ser posterior a to.');
  }
  return result;
}

class AuditService {
  constructor(repo) {
    this.repo = repo;
  }

  async list(filters, page, pageSize) {
    return this.repo.findAll(normalizeFilters(filters), page, pageSize);
  }

  async get(id) {
    const record = await this.repo.findById(id);
    if (!record) throw validationError('Registro de auditoria não encontrado.');
    return record;
  }

  async findByEntity(entity, entityId, page, pageSize) {
    if (typeof entityId !== 'string' || !entityId.trim() || entityId.length > 60) {
      throw validationError('entityId deve conter de 1 a 60 caracteres.');
    }
    const filters = normalizeFilters({ entity, entityId });
    return this.repo.findByEntity(filters.entity, filters.entityId, page, pageSize);
  }
}

module.exports = { AuditService, normalizeFilters };
