import { Request, Response, NextFunction } from 'express';
import { fail } from '../utils/response';

/**
 * Verificação de permissão sempre no backend — nunca confiar no frontend
 * (item 13 do escopo). Uso: router.post('/apps', requireAuth, requirePermission('apps.create'), ...)
 */
export function requirePermission(permission: string) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return fail(res, 'Não autenticado.', 'UNAUTHENTICATED', 401);
    }
    if (!req.user.permissions.includes(permission)) {
      return fail(res, 'Permissão insuficiente para esta ação.', 'FORBIDDEN', 403);
    }
    next();
  };
}
