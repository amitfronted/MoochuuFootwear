const FREE_SHIPPING_THRESHOLD = 999;
const FLAT_SHIPPING_CHARGE = 99;

export const calculateShippingCharge = (subtotal) => {
  const amount = Number(subtotal);

  if (!Number.isFinite(amount) || amount < 0) {
    throw new Error('Invalid subtotal for shipping calculation.');
  }

  if (amount >= FREE_SHIPPING_THRESHOLD) {
    return 0;
  }

  return FLAT_SHIPPING_CHARGE;
};

export { FREE_SHIPPING_THRESHOLD, FLAT_SHIPPING_CHARGE };
