const FREE_SHIPPING_THRESHOLD = 999;
const FLAT_SHIPPING_CHARGE = 99;

export const calculateShippingCharge = (subtotal) => {
  const amount = Number(subtotal);

  if (!Number.isFinite(amount) || amount < 0) {
    return 0;
  }

  return amount >= FREE_SHIPPING_THRESHOLD ? 0 : FLAT_SHIPPING_CHARGE;
};

export { FREE_SHIPPING_THRESHOLD, FLAT_SHIPPING_CHARGE };
