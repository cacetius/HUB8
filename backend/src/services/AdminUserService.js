const { hashPassword } = require('../utils/password');
const { validationError } = require('../utils/request');

function normalizeUser(input, creating) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    throw validationError('O corpo da requisição deve ser um objeto.');
  }
  const allowedFields = ['username', 'displayName', 'email', 'password', 'roleCodes', 'active'];
  const unknown = Object.keys(input).find((key) => !allowedFields.includes(key));
  if (unknown) throw validationError(`Campo não permitido: ${unknown}.`);

  const result = {};
  for (const [field, maxLength] of [['username', 80], ['displayName', 160]]) {
    const value = input[field];
    if (value === undefined) {
      if (creating) throw validationError(`${field} é obrigatório.`);
      continue;
    }
    if (typeof value !== 'string' || !value.trim() || value.trim().length > maxLength) {
      throw validationError(`${field} deve conter de 1 a ${maxLength} caracteres.`);
    }
    result[field] = value.trim();
  }

  if (input.email !== undefined) {
    if (input.email === null || input.email === '') {
      result.email = null;
    } else if (
      typeof input.email !== 'string' ||
      input.email.trim().length > 160 ||
      /\s/.test(input.email)
    ) {
      throw validationError('email deve conter no máximo 160 caracteres e não pode ter espaços.');
    } else {
      result.email = input.email.trim();
    }
  }

  if (input.password !== undefined || creating) {
    const password = input.password;
    if (
      typeof password !== 'string' ||
      password.length < 14 ||
      Buffer.byteLength(password, 'utf8') > 72
    ) {
      throw validationError('password deve ter pelo menos 14 e no máximo 72 bytes.');
    }
    result.password = password;
  }

  if (input.roleCodes !== undefined || creating) {
    if (!Array.isArray(input.roleCodes) || input.roleCodes.length === 0) {
      throw validationError('Informe pelo menos uma função para o usuário.');
    }
    const roleCodes = input.roleCodes.map((code) => {
      if (typeof code !== 'string' || !code.trim() || code.trim().length > 40) {
        throw validationError('Cada função deve ser um código válido.');
      }
      return code.trim().toUpperCase();
    });
    if (new Set(roleCodes).size !== roleCodes.length) {
      throw validationError('Não repita funções no mesmo usuário.');
    }
    result.roleCodes = roleCodes;
  }

  if (input.active !== undefined) {
    if (typeof input.active !== 'boolean') throw validationError('active deve ser true ou false.');
    result.active = input.active;
  }
  if (!creating && Object.keys(result).length === 0) {
    throw validationError('Informe pelo menos um campo para atualizar.');
  }
  return result;
}

function publicChanges(input) {
  const { password, ...safeInput } = input;
  return safeInput;
}

class AdminUserService {
  constructor(repo, audit) {
    this.repo = repo;
    this.audit = audit;
  }

  async list(page, pageSize, search) {
    if (search !== undefined && (typeof search !== 'string' || search.length > 100)) {
      throw validationError('search deve ser texto com até 100 caracteres.');
    }
    return this.repo.findAll(page, pageSize, search?.trim() || undefined);
  }

  async get(id) {
    const user = await this.repo.findById(id);
    if (!user) throw validationError('Usuário não encontrado.');
    return user;
  }

  listRoles() {
    return this.repo.listRoles();
  }

  async create(input, actorId, ip) {
    const values = normalizeUser(input, true);
    const passwordHash = await hashPassword(values.password);
    const id = await this.repo.create(
      publicChanges(values),
      passwordHash,
      values.roleCodes,
      actorId
    );
    const user = await this.get(id);
    await this.audit.record({
      userId: actorId,
      action: 'CREATE',
      entity: 'USERS',
      entityId: id,
      newValue: user,
      ip,
    });
    return user;
  }

  async update(id, input, actorId, ip) {
    const before = await this.get(id);
    const values = normalizeUser(input, false);
    if (id === actorId && values.active === false) {
      throw validationError('Não é possível desativar a própria conta.');
    }
    if (id === actorId && values.roleCodes && !values.roleCodes.includes('ADMIN')) {
      throw validationError('Não é possível remover a função ADMIN da própria conta.');
    }

    const safeChanges = publicChanges(values);
    if (values.password !== undefined) {
      safeChanges.passwordHash = await hashPassword(values.password);
      delete safeChanges.password;
    }
    await this.repo.update(id, safeChanges, actorId);
    const user = await this.get(id);
    await this.audit.record({
      userId: actorId,
      action: 'UPDATE',
      entity: 'USERS',
      entityId: id,
      oldValue: before,
      newValue: user,
      ip,
    });
    return user;
  }

  async setActive(id, active, actorId, ip) {
    return this.update(id, { active }, actorId, ip);
  }
}

module.exports = { AdminUserService, normalizeUser };
