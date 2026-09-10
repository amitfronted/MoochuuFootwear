import express from 'express';

import auth from '../middlewares/auth.js';
import authorizeRoles from '../middlewares/authorizeRoles.js';
import {
  createOrderController,
  getMyOrdersController,
  getOrderByIdController,
  getAllOrdersController,
  updateOrderStatusController,
} from '../controllers/order.controller.js';

const orderRouter = express.Router();

orderRouter.get('/my-orders', auth, getMyOrdersController);
orderRouter.get(
  '/admin/all',
  auth,
  authorizeRoles('SUPER_ADMIN', 'ADMIN'),
  getAllOrdersController,
);
orderRouter.get('/:orderId', auth, getOrderByIdController);

orderRouter.post('/', auth, createOrderController);

orderRouter.patch(
  '/admin/:orderId/status',
  auth,
  authorizeRoles('SUPER_ADMIN', 'ADMIN'),
  updateOrderStatusController,
);

export default orderRouter;
