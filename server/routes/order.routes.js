import express from 'express';

import auth from '../middlewares/auth.js';
import authorizeRoles from '../middlewares/authorizeRoles.js';
import {
  createOrderController,
  createRazorpayOrderController,
  verifyRazorpayPaymentController,
  getMyOrdersController,
  getOrderByIdController,
  getAllOrdersController,
  updateOrderStatusController,
  markCodPaymentAsPaidController,
  cancelMyOrderController,
  refundRazorpayOrderController,
  requestOrderReturnController,
  getAllReturnRequestsController,
  approveOrderReturnController,
  rejectOrderReturnController,
  completeOrderReturnController,
  updateOrderShippingController,
} from '../controllers/order.controller.js';

import { reconcileRefundController } from '../controllers/refundReconciliation.controller.js';

const orderRouter = express.Router();

orderRouter.get('/my-orders', auth, getMyOrdersController);

orderRouter.get(
  '/admin/all',
  auth,
  authorizeRoles('SUPER_ADMIN', 'ADMIN'),
  getAllOrdersController,
);

orderRouter.get(
  '/admin/returns',
  auth,
  authorizeRoles('SUPER_ADMIN', 'ADMIN'),
  getAllReturnRequestsController,
);

orderRouter.patch(
  '/admin/:orderId/return/approve',
  auth,
  authorizeRoles('SUPER_ADMIN', 'ADMIN'),
  approveOrderReturnController,
);

orderRouter.patch(
  '/admin/:orderId/return/reject',
  auth,
  authorizeRoles('SUPER_ADMIN', 'ADMIN'),
  rejectOrderReturnController,
);

orderRouter.patch(
  '/admin/:orderId/return/complete',
  auth,
  authorizeRoles('SUPER_ADMIN'),
  completeOrderReturnController,
);

orderRouter.post('/razorpay', auth, createRazorpayOrderController);

orderRouter.post('/razorpay/verify', auth, verifyRazorpayPaymentController);

orderRouter.post('/:orderId/return', auth, requestOrderReturnController);

orderRouter.patch('/:orderId/cancel', auth, cancelMyOrderController);

orderRouter.get('/:orderId', auth, getOrderByIdController);

orderRouter.post('/', auth, createOrderController);

orderRouter.patch(
  '/admin/:orderId/shipping',
  auth,
  authorizeRoles('SUPER_ADMIN', 'ADMIN'),
  updateOrderShippingController,
);

orderRouter.patch(
  '/admin/:orderId/status',
  auth,
  authorizeRoles('SUPER_ADMIN', 'ADMIN'),
  updateOrderStatusController,
);

orderRouter.patch(
  '/admin/:orderId/cod-paid',
  auth,
  authorizeRoles('SUPER_ADMIN', 'ADMIN'),
  markCodPaymentAsPaidController,
);

orderRouter.post(
  '/admin/:orderId/refund',
  auth,
  authorizeRoles('SUPER_ADMIN'),
  refundRazorpayOrderController,
);

orderRouter.post(
  '/admin/:orderId/refund/reconcile',
  auth,
  authorizeRoles('SUPER_ADMIN'),
  reconcileRefundController,
);

export default orderRouter;
