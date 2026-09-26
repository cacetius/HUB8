import { Request, Response, NextFunction } from 'express';
import { fail } from '../utils/response';

/**
 * Último middleware. Garante que nenhum erro de banco/driver (que pode
 * conter nomes de tabela, host, etc.) chegue ao cliente — apenas loga
 * no servidor e devolve uma mensagem genérica com um código estável.
 */
export function errorHandler(err: any, req: Request, res: Response, _next: NextFunction) {
  // eslint-disable-next-line no-console
  console.error(`[ERROR] ${req.method} ${req.path}:`, err);

  if (err?.code === 'VALIDATION_ERROR') {
    return fail(res, err.message ?? 'Dados inválidos.', 'VALIDATION_ERROR', 422);
  }

  return fail(res, 'Erro interno do servidor.', 'INTERNAL_ERROR', 500);
}
