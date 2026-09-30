const { Router } = require('express');
const { FactoryCatalogController } = require('../controllers/FactoryCatalogController');
const { FactoryCatalogService } = require('../services/FactoryCatalogService');
const { FactoryCatalogRepository } = require('../repositories/FactoryCatalogRepository');
const { AuditRepository } = require('../repositories/AuditRepository');
const { getDatabaseAdapter } = require('../config/database');
const { requireAuth } = require('../middleware/auth');
const { requirePermission } = require('../middleware/rbac');

const db = getDatabaseAdapter();
const service = new FactoryCatalogService(
  new FactoryCatalogRepository(db),
  new AuditRepository(db)
);

function createCatalogRoutes(resource, permissions) {
  const routes = Router();
  const controller = new FactoryCatalogController(service, resource);
  const requireView = permissions.view
    ? requirePermission(permissions.view)
    : (_req, _res, next) => next();
  routes.use(requireAuth);
  routes.get('/', requireView, controller.list);
  if (resource === 'shifts') {
    routes.get('/current', requireView, controller.current);
  }
  routes.get('/:id', requireView, controller.get);
  routes.post('/', requirePermission(permissions.create), controller.create);
  routes.put('/:id', requirePermission(permissions.edit), controller.update);
  routes.delete('/:id', requirePermission(permissions.delete), controller.remove);
  routes.post('/:id/restore', requirePermission(permissions.delete), controller.restore);
  return routes;
}

const operatorRoutes = createCatalogRoutes('operators', {
  view: 'operators.view',
  create: 'operators.create',
  edit: 'operators.edit',
  delete: 'operators.delete',
});
const operationRoutes = createCatalogRoutes('operations', {
  view: 'operations.view',
  create: 'operations.create',
  edit: 'operations.edit',
  delete: 'operations.delete',
});
const shiftRoutes = createCatalogRoutes('shifts', {
  view: 'shifts.manage',
  create: 'shifts.manage',
  edit: 'shifts.manage',
  delete: 'shifts.manage',
});

module.exports = { operatorRoutes, operationRoutes, shiftRoutes };
