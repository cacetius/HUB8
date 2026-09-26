const { Router } = require('express');
const { authRoutes } = require('./auth.routes');
const { appRoutes } = require('./app.routes');
const {
  operatorRoutes,
  operationRoutes,
  shiftRoutes,
  dashboardRoutes,
} = require('./scaffold.routes');

const apiV1 = Router();

apiV1.use('/auth', authRoutes);
apiV1.use('/apps', appRoutes);
apiV1.use('/operators', operatorRoutes);
apiV1.use('/operations', operationRoutes);
apiV1.use('/shifts', shiftRoutes);
apiV1.use('/dashboard', dashboardRoutes);

module.exports = { apiV1 };
