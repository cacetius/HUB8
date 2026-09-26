import { Router } from 'express';
import { authRoutes } from './auth.routes';
import { appRoutes } from './app.routes';
import { operatorRoutes, operationRoutes, shiftRoutes, dashboardRoutes } from './scaffold.routes';

export const apiV1 = Router();

apiV1.use('/auth', authRoutes);
apiV1.use('/apps', appRoutes);
apiV1.use('/operators', operatorRoutes);
apiV1.use('/operations', operationRoutes);
apiV1.use('/shifts', shiftRoutes);
apiV1.use('/dashboard', dashboardRoutes);
