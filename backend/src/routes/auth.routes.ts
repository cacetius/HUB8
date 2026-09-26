import { Router } from 'express';
import { AuthController } from '../controllers/authController';
import { AuthService } from '../services/AuthService';
import { UserRepository } from '../repositories/UserRepository';
import { AuditRepository } from '../repositories/AuditRepository';
import { getDatabaseAdapter } from '../config/database';
import { requireAuth } from '../middleware/auth';

const db = getDatabaseAdapter();
const controller = new AuthController(new AuthService(new UserRepository(db), new AuditRepository(db)));

export const authRoutes = Router();

authRoutes.post('/login', controller.login);
authRoutes.post('/logout', requireAuth, controller.logout);
authRoutes.get('/me', requireAuth, controller.me);
