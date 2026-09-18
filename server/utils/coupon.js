import Coupon from '../models/coupon.model.js';

export const normalizeCouponCode = (code) => {
  return String(code || '')
    .trim()
    .toUpperCase();
};

export const calculateCouponDiscount = (coupon, subtotal) => {
  const amount = Number(subtotal);

  if (!coupon) {
    return 0;
  }

  if (!Number.isFinite(amount) || amount < 0) {
    throw new Error('Invalid subtotal for coupon calculation.');
  }

  let discount = 0;

  if (coupon.discountType === 'PERCENTAGE') {
    discount = (amount * Number(coupon.discountValue)) / 100;

    if (
      coupon.maximumDiscountAmount !== null &&
      coupon.maximumDiscountAmount !== undefined
    ) {
      discount = Math.min(discount, Number(coupon.maximumDiscountAmount));
    }
  }

  if (coupon.discountType === 'FIXED') {
    discount = Number(coupon.discountValue);
  }

  discount = Math.min(discount, amount);

  return Number(discount.toFixed(2));
};

export const incrementCouponUsage = async (couponCode, session) => {
  const code = normalizeCouponCode(couponCode);

  if (!code) {
    return null;
  }

  const coupon = await Coupon.findOneAndUpdate(
    {
      code,
      isActive: true,
      $or: [
        { usageLimit: null },
        { $expr: { $lt: ['$usedCount', '$usageLimit'] } },
      ],
    },
    {
      $inc: {
        usedCount: 1,
      },
    },
    {
      session,
      returnDocument: 'after',
    },
  );

  if (!coupon) {
    throw new Error('This coupon usage limit has been reached.');
  }

  return coupon;
};
