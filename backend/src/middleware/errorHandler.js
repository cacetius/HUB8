const { fail } = require('../utils/response');

function errorHandler(error, req, res, _next) {
  console.error(`[ERROR] ${req.method} ${req.path}:`, error);

  if (error?.code === 'VALIDATION_ERROR') {
    return fail(res, error.message ?? 'Dados inválidos.', 'VALIDATION_ERROR', 422);
  }

  return fail(res, 'Erro interno do servidor.', 'INTERNAL_ERROR', 500);
}

module.exports = { errorHandler };
