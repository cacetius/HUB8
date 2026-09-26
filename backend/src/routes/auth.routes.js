const { Router } = require('express');
const { AuthController } = require('../controllers/authController');
const { AuthService } = require('../services/AuthService');
const { UserRepository } = require('../repositories/UserRepository');
const { AuditRepository } = require('../repositories/AuditRepository');
const { getDatabaseAdapter } = require('../config/database');
const { requireAuth } = require('../middleware/auth');

const db = getDatabaseAdapter();
const controller = new AuthController(
  new AuthService(new UserRepository(db), new AuditRepository(db))
);
const authRoutes = Router();

authRoutes.post('/login', controller.login);
authRoutes.post('/logout', requireAuth, controller.logout);
authRoutes.get('/me', requireAuth, controller.me);

module.exports = { authRoutes };
