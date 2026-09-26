import { Router } from 'express';
import { requireAuth } from '../middleware/auth';
import { requirePermission } from '../middleware/rbac';
import { ok } from '../utils/response';
import { getDatabaseAdapter } from '../config/database';

/**
 * SCAFFOLD — Operators, Operations, Shifts, Dashboard.
 *
 * Estes módulos seguem exatamente o mesmo padrão de `app.routes.ts` +
 * `AppRepository`/`AppService`/`appController` (Fase 4 completa). Por volume,
 * nesta entrega eles expõem apenas leitura básica direto do banco para
 * o Dashboard funcionar; o CRUD completo (create/update/soft-delete) deve
 * ser copiado do módulo Apps — é o mesmo formato de Repository → Service →
 * Controller para cada tabela (OPERATORS, OPERATIONS, SHIFTS).
 *
 * Próximo passo (Fase 6 continuação): criar
 *   repositories/OperatorRepository.ts, repositories/OperationRepository.ts, repositories/ShiftRepository.ts
 *   services/OperatorService.ts, services/OperationService.ts, services/ShiftService.ts
 *   controllers/operatorController.ts, controllers/operationController.ts, controllers/shiftController.ts
 * espelhando app*.ts linha a linha, trocando a tabela e os campos.
 */
const db = getDatabaseAdapter();

export const operatorRoutes = Router();
operatorRoutes.use(requireAuth);
operatorRoutes.get('/', requirePermission('operators.view'), async (req, res, next) => {
  try {
    const page = Number(req.query.page ?? 1);
    const pageSize = Math.min(Number(req.query.pageSize ?? 20), 100);
    const result = await db.paginate('SELECT * FROM OPERATORS WHERE ACTIVE = 1', [], page, pageSize, 'NAME');
    return ok(res, result);
  } catch (e) { next(e); }
});

export const operationRoutes = Router();
operationRoutes.use(requireAuth);
operationRoutes.get('/', requirePermission('operations.view'), async (req, res, next) => {
  try {
    const page = Number(req.query.page ?? 1);
    const pageSize = Math.min(Number(req.query.pageSize ?? 20), 100);
    const result = await db.paginate('SELECT * FROM OPERATIONS WHERE ACTIVE = 1', [], page, pageSize, 'NAME');
    return ok(res, result);
  } catch (e) { next(e); }
});

export const shiftRoutes = Router();
shiftRoutes.use(requireAuth);
shiftRoutes.get('/', async (req, res, next) => {
  try {
    const { rows } = await db.query('SELECT * FROM SHIFTS WHERE ACTIVE = 1 ORDER BY START_TIME');
    return ok(res, rows);
  } catch (e) { next(e); }
});
/** Identifica o turno atual comparando a hora do servidor com START_TIME/END_TIME de cada turno. */
shiftRoutes.get('/current', async (req, res, next) => {
  try {
    const { rows } = await db.query('SELECT * FROM SHIFTS WHERE ACTIVE = 1');
    const now = new Date();
    const nowMinutes = now.getHours() * 60 + now.getMinutes();
    const toMinutes = (t: string) => {
      const [h, m] = t.split(':').map(Number);
      return h * 60 + m;
    };
    const current = rows.find((s: any) => {
      const start = toMinutes(String(s.START_TIME));
      const end = toMinutes(String(s.END_TIME));
      return start <= end ? nowMinutes >= start && nowMinutes < end : nowMinutes >= start || nowMinutes < end; // cruza a meia-noite
    });
    return ok(res, current ?? null);
  } catch (e) { next(e); }
});

export const dashboardRoutes = Router();
dashboardRoutes.use(requireAuth);
dashboardRoutes.get('/summary', async (req, res, next) => {
  try {
    const [apps, operators, operations] = await Promise.all([
      db.query('SELECT COUNT(*) AS TOTAL, SUM(CASE WHEN STATUS = \'ATIVO\' THEN 1 ELSE 0 END) AS ATIVOS FROM APPS WHERE ACTIVE = 1'),
      db.query('SELECT COUNT(*) AS TOTAL FROM OPERATORS WHERE ACTIVE = 1'),
      db.query('SELECT COUNT(*) AS TOTAL FROM OPERATIONS WHERE ACTIVE = 1'),
    ]);
    return ok(res, {
      apps: apps.rows[0],
      operators: operators.rows[0],
      operations: operations.rows[0],
      // MTBF/MTTR/produção/perdas dependem das tabelas PRODUCTION/LOSSES/MAINTENANCE/DOWNTIME
      // do item 10 do escopo original — ainda não modeladas porque não há evidência delas no HUB 7 atual;
      // ver docs/DATABASE.md "Tabelas não incluídas nesta fase".
    });
  } catch (e) { next(e); }
});
