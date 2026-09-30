const { Router } = require('express');
const { requireAuth } = require('../middleware/auth');
const { requirePermission } = require('../middleware/rbac');
const { ok } = require('../utils/response');
const { getDatabaseAdapter } = require('../config/database');

const db = getDatabaseAdapter();
const dashboardRoutes = Router();

dashboardRoutes.use(requireAuth);
dashboardRoutes.get('/summary', requirePermission('reports.view'), async (_req, res, next) => {
  try {
    const [apps, operators, operations, shifts] = await Promise.all([
      db.query(
        "SELECT COUNT(*) AS TOTAL, COALESCE(SUM(CASE WHEN STATUS = 'ATIVO' THEN 1 ELSE 0 END), 0) AS ATIVOS FROM APPS WHERE ACTIVE = 1"
      ),
      db.query(
        "SELECT COUNT(*) AS TOTAL, COALESCE(SUM(CASE WHEN STATUS = 'ATIVO' THEN 1 ELSE 0 END), 0) AS ATIVOS FROM OPERATORS WHERE ACTIVE = 1"
      ),
      db.query('SELECT COUNT(*) AS TOTAL FROM OPERATIONS WHERE ACTIVE = 1'),
      db.query('SELECT COUNT(*) AS TOTAL FROM SHIFTS WHERE ACTIVE = 1'),
    ]);

    return ok(res, {
      apps: apps.rows[0],
      operators: operators.rows[0],
      operations: operations.rows[0],
      shifts: shifts.rows[0],
    });
  } catch (error) {
    return next(error);
  }
});

module.exports = { dashboardRoutes };
