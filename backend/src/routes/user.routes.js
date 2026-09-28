const { Router } = require('express');
const { AdminUserController } = require('../controllers/AdminUserController');
const { AdminUserService } = require('../services/AdminUserService');
const { AdminUserRepository } = require('../repositories/AdminUserRepository');
const { AuditRepository } = require('../repositories/AuditRepository');
const { getDatabaseAdapter } = require('../config/database');
const { requireAuth } = require('../middleware/auth');
const { requirePermission } = require('../middleware/rbac');

const db = getDatabaseAdapter();
const controller = new AdminUserController(
  new AdminUserService(new AdminUserRepository(db), new AuditRepository(db))
);
const userRoutes = Router();

userRoutes.use(requireAuth, requirePermission('users.manage'));
userRoutes.get('/roles', controller.roles);
userRoutes.get('/', controller.list);
userRoutes.get('/:id', controller.get);
userRoutes.post('/', controller.create);
userRoutes.put('/:id', controller.update);
userRoutes.delete('/:id', controller.remove);
userRoutes.post('/:id/restore', controller.restore);

module.exports = { userRoutes };
