import { Router } from 'express';
import { AppController } from '../controllers/appController';
import { AppService } from '../services/AppService';
import { AppRepository } from '../repositories/AppRepository';
import { AuditRepository } from '../repositories/AuditRepository';
import { getDatabaseAdapter } from '../config/database';
import { requireAuth } from '../middleware/auth';
import { requirePermission } from '../middleware/rbac';

const db = getDatabaseAdapter();
const controller = new AppController(new AppService(new AppRepository(db), new AuditRepository(db)));

export const appRoutes = Router();

appRoutes.use(requireAuth);
appRoutes.get('/', requirePermission('apps.view'), controller.list);
appRoutes.get('/:id', requirePermission('apps.view'), controller.get);
appRoutes.post('/', requirePermission('apps.create'), controller.create);
appRoutes.put('/:id', requirePermission('apps.edit'), controller.update);
appRoutes.delete('/:id', requirePermission('apps.delete'), controller.remove);
appRoutes.post('/:id/restore', requirePermission('apps.delete'), controller.restore);
