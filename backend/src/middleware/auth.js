const jwt = require('jsonwebtoken');
const { env } = require('../config/env');
const { fail } = require('../utils/response');

function requireAuth(req, res, next) {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    return fail(res, 'Não autenticado.', 'UNAUTHENTICATED', 401);
  }

  try {
    req.user = jwt.verify(header.slice('Bearer '.length), env.JWT_SECRET);
    next();
  } catch {
    return fail(res, 'Sessão inválida ou expirada.', 'SESSION_EXPIRED', 401);
  }
}

module.exports = { requireAuth };
