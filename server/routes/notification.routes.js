import express from 'express';

import auth from '../middlewares/auth.js';
import authorizeRoles from '../middlewares/authorizeRoles.js';

import {
  getNotificationsController,
  markNotificationReadController,
  markAllNotificationsReadController,
} from '../controllers/notification.controller.js';

const notificationRouter = express.Router();

const adminAuth = [auth, authorizeRoles('ADMIN', 'SUPER_ADMIN')];

notificationRouter.get('/', ...adminAuth, getNotificationsController);

notificationRouter.patch(
  '/:notificationId/read',
  ...adminAuth,
  markNotificationReadController,
);

notificationRouter.patch(
  '/read-all',
  ...adminAuth,
  markAllNotificationsReadController,
);

export default notificationRouter;
