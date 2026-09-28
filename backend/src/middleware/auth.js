const jwt = require('jsonwebtoken');
const { env } = require('../config/env');
const { getDatabaseAdapter } = require('../config/database');
const { UserRepository } = require('../repositories/UserRepository');
const { fail } = require('../utils/response');

async function requireAuth(req, res, next) {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    return fail(res, 'Não autenticado.', 'UNAUTHENTICATED', 401);
  }

  let token;
  try {
    token = jwt.verify(header.slice('Bearer '.length), env.JWT_SECRET);
  } catch {
    return fail(res, 'Sessão inválida ou expirada.', 'SESSION_EXPIRED', 401);
  }

  try {
    const db = getDatabaseAdapter();
    const { rows } = await db.query(
      'SELECT ID, USERNAME, DISPLAY_NAME FROM USERS WHERE ID = ? AND ACTIVE = 1',
      [token.id]
    );
    if (rows.length !== 1) {
      return fail(res, 'Conta inexistente ou desativada.', 'SESSION_EXPIRED', 401);
    }

    const { roles, permissions } = await new UserRepository(db).getRolesAndPermissions(token.id);
    req.user = {
      id: rows[0].ID,
      username: rows[0].USERNAME,
      displayName: rows[0].DISPLAY_NAME,
      roles,
      permissions,
    };
    return next();
  } catch (error) {
    return next(error);
  }
}

module.exports = { requireAuth };
