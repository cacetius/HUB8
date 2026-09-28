const { Router } = require('express');
const { AuditController } = require('../controllers/AuditController');
const { AuditService } = require('../services/AuditService');
const { AuditRepository } = require('../repositories/AuditRepository');
const { getDatabaseAdapter } = require('../config/database');
const { requireAuth } = require('../middleware/auth');
const { requirePermission } = require('../middleware/rbac');

const db = getDatabaseAdapter();
const controller = new AuditController(new AuditService(new AuditRepository(db)));
const auditRoutes = Router();

auditRoutes.use(requireAuth, requirePermission('audit.view'));
auditRoutes.get('/', controller.list);
auditRoutes.get('/entity/:entity/:entityId', controller.byEntity);
auditRoutes.get('/:id', controller.get);

module.exports = { auditRoutes };
