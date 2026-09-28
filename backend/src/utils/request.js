function validationError(message) {
  const error = new Error(message);
  error.code = 'VALIDATION_ERROR';
  return error;
}

function positiveInteger(value, name, defaultValue) {
  if (value === undefined && defaultValue !== undefined) return defaultValue;
  if (typeof value !== 'string' && typeof value !== 'number') {
    throw validationError(`${name} deve ser um número inteiro positivo.`);
  }
  const text = String(value);
  if (!/^[1-9]\d*$/.test(text)) {
    throw validationError(`${name} deve ser um número inteiro positivo.`);
  }
  const parsed = Number(text);
  if (!Number.isSafeInteger(parsed)) {
    throw validationError(`${name} está fora do intervalo permitido.`);
  }
  return parsed;
}

function pagination(query) {
  const page = positiveInteger(query.page, 'page', 1);
  const pageSize = positiveInteger(query.pageSize, 'pageSize', 20);
  if (pageSize > 100) {
    throw validationError('pageSize não pode ser maior que 100.');
  }
  return { page, pageSize };
}

module.exports = { pagination, positiveInteger, validationError };
