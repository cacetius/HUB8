const { Router } = require('express');
const { requireAuth } = require('../middleware/auth');
const { requirePermission } = require('../middleware/rbac');
const { ok } = require('../utils/response');
const { getDatabaseAdapter } = require('../config/database');

// These read-only routes provide the basic data used by the dashboard.
const db = getDatabaseAdapter();

const operatorRoutes = Router();
operatorRoutes.use(requireAuth);
operatorRoutes.get('/', requirePermission('operators.view'), async (req, res, next) => {
  try {
    const page = Number(req.query.page ?? 1);
    const pageSize = Math.min(Number(req.query.pageSize ?? 20), 100);
    const result = await db.paginate(
      'SELECT * FROM OPERATORS WHERE ACTIVE = 1',
      [],
      page,
      pageSize,
      'NAME'
    );
    return ok(res, result);
  } catch (error) {
    next(error);
  }
});

const operationRoutes = Router();
operationRoutes.use(requireAuth);
operationRoutes.get('/', requirePermission('operations.view'), async (req, res, next) => {
  try {
    const page = Number(req.query.page ?? 1);
    const pageSize = Math.min(Number(req.query.pageSize ?? 20), 100);
    const result = await db.paginate(
      'SELECT * FROM OPERATIONS WHERE ACTIVE = 1',
      [],
      page,
      pageSize,
      'NAME'
    );
    return ok(res, result);
  } catch (error) {
    next(error);
  }
});

const shiftRoutes = Router();
shiftRoutes.use(requireAuth);
shiftRoutes.get('/', async (_req, res, next) => {
  try {
    const { rows } = await db.query(
      'SELECT * FROM SHIFTS WHERE ACTIVE = 1 ORDER BY START_TIME'
    );
    return ok(res, rows);
  } catch (error) {
    next(error);
  }
});

shiftRoutes.get('/current', async (_req, res, next) => {
  try {
    const { rows } = await db.query('SELECT * FROM SHIFTS WHERE ACTIVE = 1');
    const now = new Date();
    const nowMinutes = now.getHours() * 60 + now.getMinutes();
    const toMinutes = (time) => {
      const [hours, minutes] = time.split(':').map(Number);
      return hours * 60 + minutes;
    };
    const current = rows.find((shift) => {
      const start = toMinutes(String(shift.START_TIME));
      const end = toMinutes(String(shift.END_TIME));
      return start <= end
        ? nowMinutes >= start && nowMinutes < end
        : nowMinutes >= start || nowMinutes < end;
    });
    return ok(res, current ?? null);
  } catch (error) {
    next(error);
  }
});

const dashboardRoutes = Router();
dashboardRoutes.use(requireAuth);
dashboardRoutes.get('/summary', async (_req, res, next) => {
  try {
    const [apps, operators, operations] = await Promise.all([
      db.query(
        "SELECT COUNT(*) AS TOTAL, SUM(CASE WHEN STATUS = 'ATIVO' THEN 1 ELSE 0 END) AS ATIVOS FROM APPS WHERE ACTIVE = 1"
      ),
      db.query('SELECT COUNT(*) AS TOTAL FROM OPERATORS WHERE ACTIVE = 1'),
      db.query('SELECT COUNT(*) AS TOTAL FROM OPERATIONS WHERE ACTIVE = 1'),
    ]);

    return ok(res, {
      apps: apps.rows[0],
      operators: operators.rows[0],
      operations: operations.rows[0],
    });
  } catch (error) {
    next(error);
  }
});

module.exports = {
  operatorRoutes,
  operationRoutes,
  shiftRoutes,
  dashboardRoutes,
};
