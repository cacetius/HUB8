const { Router } = require('express');
const { AppController } = require('../controllers/appController');
const { AppService } = require('../services/AppService');
const { AppRepository } = require('../repositories/AppRepository');
const { AuditRepository } = require('../repositories/AuditRepository');
const { getDatabaseAdapter } = require('../config/database');
const { requireAuth } = require('../middleware/auth');
const { requirePermission } = require('../middleware/rbac');

const db = getDatabaseAdapter();
const controller = new AppController(
  new AppService(new AppRepository(db), new AuditRepository(db))
);
const appRoutes = Router();

appRoutes.use(requireAuth);
appRoutes.get('/', requirePermission('apps.view'), controller.list);
appRoutes.get('/:id', requirePermission('apps.view'), controller.get);
appRoutes.post('/', requirePermission('apps.create'), controller.create);
appRoutes.put('/:id', requirePermission('apps.edit'), controller.update);
appRoutes.delete('/:id', requirePermission('apps.delete'), controller.remove);
appRoutes.post('/:id/restore', requirePermission('apps.delete'), controller.restore);

module.exports = { appRoutes };
