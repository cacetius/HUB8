const { fail } = require('../utils/response');

function requirePermission(permission) {
  return (req, res, next) => {
    if (!req.user) {
      return fail(res, 'Não autenticado.', 'UNAUTHENTICATED', 401);
    }
    if (!req.user.permissions.includes(permission)) {
      return fail(res, 'Permissão insuficiente para esta ação.', 'FORBIDDEN', 403);
    }
    next();
  };
}

module.exports = { requirePermission };
