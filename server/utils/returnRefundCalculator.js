const roundMoney = (value) => Number((Number(value) || 0).toFixed(2));

/**
 * Calculates the refund amount for returned order items.
 *
 * Pricing model:
 * - Item value comes from the order item snapshots.
 * - Coupon discount is allocated proportionally.
 * - GST is allocated proportionally from the order tax.
 * - Original shipping is NOT automatically refunded for partial returns.
 * - FULL return refunds the complete order total.
 */
export const calculateReturnRefund = (order) => {
  if (!order) {
    throw new Error('Order is required for refund calculation.');
  }

  const items = Array.isArray(order.items) ? order.items : [];
  const returnItems = order.returnRequest?.items || [];

  if (!items.length) {
    throw new Error('Order items are missing.');
  }

  if (!returnItems.length) {
    throw new Error('Return items are missing.');
  }

  const subtotal = roundMoney(order.subtotal);
  const couponDiscount = roundMoney(order.couponDiscount);
  const shippingCharge = roundMoney(order.shippingCharge);
  const tax = roundMoney(order.tax);
  const totalAmount = roundMoney(order.totalAmount);

  if (subtotal < 0) {
    throw new Error('Invalid order subtotal.');
  }

  if (couponDiscount < 0 || couponDiscount > subtotal) {
    throw new Error('Invalid order coupon discount.');
  }

  if (shippingCharge < 0) {
    throw new Error('Invalid order shipping charge.');
  }

  if (tax < 0) {
    throw new Error('Invalid order tax.');
  }

  if (totalAmount <= 0) {
    throw new Error('Invalid order total amount.');
  }

  // FULL return:
  // Refund the original paid order total.
  if (order.returnRequest.returnType === 'FULL') {
    return {
      returnType: 'FULL',
      returnedSubtotal: subtotal,
      allocatedCouponDiscount: couponDiscount,
      refundableSubtotal: roundMoney(subtotal - couponDiscount),
      allocatedTax: tax,
      refundableShipping: shippingCharge,
      refundAmount: totalAmount,
    };
  }

  // ---------------------------------------------------------
  // PARTIAL RETURN
  // ---------------------------------------------------------

  let returnedGrossValue = 0;

  for (const returnItem of returnItems) {
    const orderItem = items.find(
      (item) => String(item._id) === String(returnItem.orderItemId),
    );

    if (!orderItem) {
      throw new Error(
        `Returned order item ${returnItem.orderItemId} was not found.`,
      );
    }

    const orderedQuantity = Number(orderItem.quantity);
    const returnedQuantity = Number(returnItem.quantity);

    if (!Number.isInteger(returnedQuantity) || returnedQuantity < 1) {
      throw new Error('Invalid returned item quantity.');
    }

    if (returnedQuantity > orderedQuantity) {
      throw new Error(
        `Return quantity cannot exceed ordered quantity for item ${orderItem.name}.`,
      );
    }

    const unitPrice = Number(orderItem.unitPrice);

    if (!Number.isFinite(unitPrice) || unitPrice < 0) {
      throw new Error(
        `Invalid unit price for returned item ${orderItem.name}.`,
      );
    }

    returnedGrossValue += unitPrice * returnedQuantity;
  }

  returnedGrossValue = roundMoney(returnedGrossValue);

  if (returnedGrossValue <= 0) {
    throw new Error('Returned item value must be greater than zero.');
  }

  if (returnedGrossValue > subtotal) {
    throw new Error('Returned item value cannot exceed order subtotal.');
  }

  // Allocate the order-level coupon proportionally
  // according to the returned item's gross value.
  const returnRatio = returnedGrossValue / subtotal;

  const allocatedCouponDiscount = roundMoney(couponDiscount * returnRatio);

  const refundableSubtotal = roundMoney(
    returnedGrossValue - allocatedCouponDiscount,
  );

  // Allocate GST proportionally.
  const allocatedTax = roundMoney(tax * returnRatio);

  // Shipping is intentionally NOT automatically refunded
  // for partial returns.
  const refundableShipping = 0;

  const refundAmount = roundMoney(
    refundableSubtotal + allocatedTax + refundableShipping,
  );

  if (refundAmount <= 0) {
    throw new Error('Calculated refund amount must be greater than zero.');
  }

  return {
    returnType: 'PARTIAL',
    returnedSubtotal: returnedGrossValue,
    allocatedCouponDiscount,
    refundableSubtotal,
    allocatedTax,
    refundableShipping,
    refundAmount,
  };
};
