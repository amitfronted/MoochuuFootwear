const GST_RATE = 0.18;

export const calculateTax = (subtotal) => {
  const amount = Number(subtotal);

  if (!Number.isFinite(amount) || amount < 0) {
    throw new Error('Invalid subtotal for tax calculation.');
  }

  return Number((amount * GST_RATE).toFixed(2));
};

export { GST_RATE };
