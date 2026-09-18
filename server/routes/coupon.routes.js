import express from 'express';
import auth from '../middlewares/auth.js';
import authorizeRoles from '../middlewares/authorizeRoles.js';

import {
  createCouponController,
  getAllCouponsController,
  getCouponByIdController,
  updateCouponController,
  deleteCouponController,
  validateCouponController,
} from '../controllers/coupon.controller.js';

const couponRouter = express.Router();

// =====================================================
// ADMIN COUPON ROUTES
// =====================================================

// Create coupon
couponRouter.post(
  '/admin',
  auth,
  authorizeRoles('SUPER_ADMIN'),
  createCouponController,
);

// Get all coupons
couponRouter.get(
  '/admin',
  auth,
  authorizeRoles('SUPER_ADMIN'),
  getAllCouponsController,
);

// Get single coupon
couponRouter.get(
  '/admin/:couponId',
  auth,
  authorizeRoles('SUPER_ADMIN'),
  getCouponByIdController,
);

// Update coupon
couponRouter.patch(
  '/admin/:couponId',
  auth,
  authorizeRoles('SUPER_ADMIN'),
  updateCouponController,
);

// Delete coupon
couponRouter.delete(
  '/admin/:couponId',
  auth,
  authorizeRoles('SUPER_ADMIN'),
  deleteCouponController,
);

couponRouter.post('/validate', auth, validateCouponController);

export default couponRouter;
