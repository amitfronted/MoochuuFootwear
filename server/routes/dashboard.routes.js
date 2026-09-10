import express from 'express';

import auth from '../middlewares/auth.js';
import authorizeRoles from '../middlewares/authorizeRoles.js';

import { getDashboardStatsController } from '../controllers/dashboard.controller.js';

const dashboardRouter = express.Router();

dashboardRouter.get(
  '/stats',
  auth,
  authorizeRoles('SUPER_ADMIN', 'ADMIN'),
  getDashboardStatsController,
);

export default dashboardRouter;
