import mongoose from 'mongoose';
import Coupon from '../models/coupon.model.js';
import Order from '../models/order.model.js';
import {
  normalizeCouponCode,
  calculateCouponDiscount,
} from '../utils/coupon.js';

const validateCouponValues = ({
  discountType,
  discountValue,
  maximumDiscountAmount,
  minimumOrderAmount,
  usageLimit,
  perUserLimit,
}) => {
  if (!['PERCENTAGE', 'FIXED'].includes(discountType)) {
    return 'Invalid discount type.';
  }

  if (!Number.isFinite(Number(discountValue)) || Number(discountValue) <= 0) {
    return 'Discount value must be greater than 0.';
  }

  if (discountType === 'PERCENTAGE' && Number(discountValue) > 100) {
    return 'Percentage discount cannot exceed 100%.';
  }

  if (
    maximumDiscountAmount !== null &&
    maximumDiscountAmount !== undefined &&
    (!Number.isFinite(Number(maximumDiscountAmount)) ||
      Number(maximumDiscountAmount) < 0)
  ) {
    return 'Invalid maximum discount amount.';
  }

  if (
    !Number.isFinite(Number(minimumOrderAmount)) ||
    Number(minimumOrderAmount) < 0
  ) {
    return 'Invalid minimum order amount.';
  }

  if (
    usageLimit !== null &&
    usageLimit !== undefined &&
    (!Number.isInteger(Number(usageLimit)) || Number(usageLimit) < 1)
  ) {
    return 'Usage limit must be a positive integer.';
  }

  if (!Number.isInteger(Number(perUserLimit)) || Number(perUserLimit) < 1) {
    return 'Per-user limit must be a positive integer.';
  }

  return null;
};

/**
 * CREATE COUPON
 */
export const createCouponController = async (req, res) => {
  try {
    const {
      code,
      description = '',
      discountType,
      discountValue,
      minimumOrderAmount = 0,
      maximumDiscountAmount = null,
      usageLimit = null,
      perUserLimit = 1,
      expiresAt = null,
      isActive = true,
    } = req.body;

    const normalizedCode = String(code || '')
      .trim()
      .toUpperCase();

    if (!normalizedCode) {
      return res.status(400).json({
        success: false,
        message: 'Coupon code is required.',
      });
    }

    const validationError = validateCouponValues({
      discountType,
      discountValue,
      maximumDiscountAmount,
      minimumOrderAmount,
      usageLimit,
      perUserLimit,
    });

    if (validationError) {
      return res.status(400).json({
        success: false,
        message: validationError,
      });
    }

    if (expiresAt && Number.isNaN(new Date(expiresAt).getTime())) {
      return res.status(400).json({
        success: false,
        message: 'Invalid expiry date.',
      });
    }

    const existingCoupon = await Coupon.findOne({
      code: normalizedCode,
    });

    if (existingCoupon) {
      return res.status(409).json({
        success: false,
        message: 'Coupon code already exists.',
      });
    }

    const coupon = await Coupon.create({
      code: normalizedCode,
      description: String(description || '').trim(),
      discountType,
      discountValue: Number(discountValue),
      minimumOrderAmount: Number(minimumOrderAmount),
      maximumDiscountAmount:
        maximumDiscountAmount === null ||
        maximumDiscountAmount === undefined ||
        maximumDiscountAmount === ''
          ? null
          : Number(maximumDiscountAmount),
      usageLimit:
        usageLimit === null || usageLimit === undefined || usageLimit === ''
          ? null
          : Number(usageLimit),
      perUserLimit: Number(perUserLimit),
      expiresAt: expiresAt ? new Date(expiresAt) : null,
      isActive: Boolean(isActive),
    });

    return res.status(201).json({
      success: true,
      message: 'Coupon created successfully.',
      data: {
        coupon,
      },
    });
  } catch (error) {
    console.error('Create coupon error:', error);

    return res.status(500).json({
      success: false,
      message: 'Unable to create coupon.',
    });
  }
};

/**
 * GET ALL COUPONS
 */
export const getAllCouponsController = async (req, res) => {
  try {
    const coupons = await Coupon.find({}).sort({ createdAt: -1 }).lean();

    return res.status(200).json({
      success: true,
      data: {
        coupons,
      },
    });
  } catch (error) {
    console.error('Get coupons error:', error);

    return res.status(500).json({
      success: false,
      message: 'Unable to fetch coupons.',
    });
  }
};

/**
 * GET SINGLE COUPON
 */
export const getCouponByIdController = async (req, res) => {
  try {
    const { couponId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(couponId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid coupon ID.',
      });
    }

    const coupon = await Coupon.findById(couponId);

    if (!coupon) {
      return res.status(404).json({
        success: false,
        message: 'Coupon not found.',
      });
    }

    return res.status(200).json({
      success: true,
      data: {
        coupon,
      },
    });
  } catch (error) {
    console.error('Get coupon error:', error);

    return res.status(500).json({
      success: false,
      message: 'Unable to fetch coupon.',
    });
  }
};

/**
 * UPDATE COUPON
 */
export const updateCouponController = async (req, res) => {
  try {
    const { couponId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(couponId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid coupon ID.',
      });
    }

    const coupon = await Coupon.findById(couponId);

    if (!coupon) {
      return res.status(404).json({
        success: false,
        message: 'Coupon not found.',
      });
    }

    const {
      code,
      description,
      discountType,
      discountValue,
      minimumOrderAmount,
      maximumDiscountAmount,
      usageLimit,
      perUserLimit,
      expiresAt,
      isActive,
    } = req.body;

    const nextDiscountType = discountType ?? coupon.discountType;

    const nextDiscountValue = discountValue ?? coupon.discountValue;

    const nextMinimumOrderAmount =
      minimumOrderAmount ?? coupon.minimumOrderAmount;

    const nextMaximumDiscountAmount =
      maximumDiscountAmount !== undefined
        ? maximumDiscountAmount
        : coupon.maximumDiscountAmount;

    const nextUsageLimit =
      usageLimit !== undefined ? usageLimit : coupon.usageLimit;

    const nextPerUserLimit = perUserLimit ?? coupon.perUserLimit;

    const validationError = validateCouponValues({
      discountType: nextDiscountType,
      discountValue: nextDiscountValue,
      maximumDiscountAmount: nextMaximumDiscountAmount,
      minimumOrderAmount: nextMinimumOrderAmount,
      usageLimit: nextUsageLimit,
      perUserLimit: nextPerUserLimit,
    });

    if (validationError) {
      return res.status(400).json({
        success: false,
        message: validationError,
      });
    }

    if (
      expiresAt !== undefined &&
      expiresAt !== null &&
      Number.isNaN(new Date(expiresAt).getTime())
    ) {
      return res.status(400).json({
        success: false,
        message: 'Invalid expiry date.',
      });
    }

    if (code !== undefined) {
      const normalizedCode = String(code).trim().toUpperCase();

      if (!normalizedCode) {
        return res.status(400).json({
          success: false,
          message: 'Coupon code cannot be empty.',
        });
      }

      const duplicateCoupon = await Coupon.findOne({
        code: normalizedCode,
        _id: { $ne: couponId },
      });

      if (duplicateCoupon) {
        return res.status(409).json({
          success: false,
          message: 'Coupon code already exists.',
        });
      }

      coupon.code = normalizedCode;
    }

    if (description !== undefined) {
      coupon.description = String(description).trim();
    }

    coupon.discountType = nextDiscountType;
    coupon.discountValue = Number(nextDiscountValue);
    coupon.minimumOrderAmount = Number(nextMinimumOrderAmount);

    coupon.maximumDiscountAmount =
      nextMaximumDiscountAmount === null || nextMaximumDiscountAmount === ''
        ? null
        : Number(nextMaximumDiscountAmount);

    coupon.usageLimit =
      nextUsageLimit === null || nextUsageLimit === ''
        ? null
        : Number(nextUsageLimit);

    coupon.perUserLimit = Number(nextPerUserLimit);

    if (expiresAt !== undefined) {
      coupon.expiresAt = expiresAt ? new Date(expiresAt) : null;
    }

    if (isActive !== undefined) {
      coupon.isActive = Boolean(isActive);
    }

    await coupon.save();

    return res.status(200).json({
      success: true,
      message: 'Coupon updated successfully.',
      data: {
        coupon,
      },
    });
  } catch (error) {
    console.error('Update coupon error:', error);

    return res.status(500).json({
      success: false,
      message: 'Unable to update coupon.',
    });
  }
};

/**
 * DELETE COUPON
 */
export const deleteCouponController = async (req, res) => {
  try {
    const { couponId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(couponId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid coupon ID.',
      });
    }

    const coupon = await Coupon.findById(couponId);

    if (!coupon) {
      return res.status(404).json({
        success: false,
        message: 'Coupon not found.',
      });
    }

    await coupon.deleteOne();

    return res.status(200).json({
      success: true,
      message: 'Coupon deleted successfully.',
    });
  } catch (error) {
    console.error('Delete coupon error:', error);

    return res.status(500).json({
      success: false,
      message: 'Unable to delete coupon.',
    });
  }
};

/**
 * =====================================================
 * VALIDATE COUPON - CUSTOMER
 * =====================================================
 */
export const validateCouponController = async (req, res) => {
  try {
    const { code, subtotal } = req.body;

    const couponCode = normalizeCouponCode(code);
    const orderSubtotal = Number(subtotal);

    if (!couponCode) {
      return res.status(400).json({
        success: false,
        message: 'Coupon code is required.',
      });
    }

    if (!Number.isFinite(orderSubtotal) || orderSubtotal < 0) {
      return res.status(400).json({
        success: false,
        message: 'Invalid order subtotal.',
      });
    }

    const coupon = await Coupon.findOne({
      code: couponCode,
    });

    if (!coupon) {
      return res.status(404).json({
        success: false,
        message: 'Invalid coupon code.',
      });
    }

    if (!coupon.isActive) {
      return res.status(400).json({
        success: false,
        message: 'This coupon is inactive.',
      });
    }

    if (coupon.expiresAt && new Date() > new Date(coupon.expiresAt)) {
      return res.status(400).json({
        success: false,
        message: 'This coupon has expired.',
      });
    }

    if (orderSubtotal < Number(coupon.minimumOrderAmount || 0)) {
      return res.status(400).json({
        success: false,
        message: `Minimum order amount is ₹${Number(
          coupon.minimumOrderAmount || 0,
        ).toFixed(2)}.`,
      });
    }

    if (
      coupon.usageLimit !== null &&
      Number(coupon.usedCount || 0) >= Number(coupon.usageLimit)
    ) {
      return res.status(400).json({
        success: false,
        message: 'This coupon usage limit has been reached.',
      });
    }

    // Check per-user coupon usage limit
    const userCouponUsageCount = await Order.countDocuments({
      userId: req.user._id,
      couponCode: coupon.code,
      orderStatus: { $ne: 'CANCELLED' },
    });

    if (userCouponUsageCount >= Number(coupon.perUserLimit || 1)) {
      return res.status(400).json({
        success: false,
        message:
          'You have already used this coupon the maximum allowed number of times.',
      });
    }

    const discount = calculateCouponDiscount(coupon, orderSubtotal);

    return res.status(200).json({
      success: true,
      message: 'Coupon applied successfully.',
      data: {
        coupon: {
          _id: coupon._id,
          code: coupon.code,
          discountType: coupon.discountType,
          discountValue: coupon.discountValue,
          minimumOrderAmount: coupon.minimumOrderAmount,
          maximumDiscountAmount: coupon.maximumDiscountAmount,
        },
        discount,
      },
    });
  } catch (error) {
    console.error('Validate coupon error:', error);

    return res.status(500).json({
      success: false,
      message: 'Unable to validate coupon.',
    });
  }
};
