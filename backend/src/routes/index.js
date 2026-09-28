const { Router } = require('express');
const { authRoutes } = require('./auth.routes');
const { appRoutes } = require('./app.routes');
const { userRoutes } = require('./user.routes');
const { auditRoutes } = require('./audit.routes');
const {
  operatorRoutes,
  operationRoutes,
  shiftRoutes,
  dashboardRoutes,
} = require('./scaffold.routes');

const apiV1 = Router();

apiV1.use('/auth', authRoutes);
apiV1.use('/apps', appRoutes);
apiV1.use('/users', userRoutes);
apiV1.use('/audit', auditRoutes);
apiV1.use('/operators', operatorRoutes);
apiV1.use('/operations', operationRoutes);
apiV1.use('/shifts', shiftRoutes);
apiV1.use('/dashboard', dashboardRoutes);

module.exports = { apiV1 };
