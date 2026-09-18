const RAZORPAY_REFUND_URL = 'https://api.razorpay.com/v1/payments';

const createBasicAuth = () => {
  const keyId = process.env.RAZORPAY_KEY_ID;
  const keySecret = process.env.RAZORPAY_KEY_SECRET;

  if (!keyId || !keySecret) {
    throw new Error('RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET are required');
  }

  return Buffer.from(`${keyId}:${keySecret}`).toString('base64');
};

export const createRazorpayRefund = async ({
  paymentId,
  amount,
  speed = 'normal',
  receipt,
  notes = {},
  idempotencyKey,
}) => {
  if (!paymentId) {
    throw new Error('Razorpay payment ID is required');
  }

  if (!idempotencyKey || idempotencyKey.length < 10) {
    throw new Error('Valid Razorpay refund idempotency key is required');
  }

  const payload = {
    amount,
    speed,
    receipt,
    notes,
  };

  const response = await fetch(
    `${RAZORPAY_REFUND_URL}/${encodeURIComponent(paymentId)}/refund`,
    {
      method: 'POST',
      headers: {
        Authorization: `Basic ${createBasicAuth()}`,
        'Content-Type': 'application/json',
        'X-Refund-Idempotency': idempotencyKey,
      },
      body: JSON.stringify(payload),
    },
  );

  const data = await response.json().catch(() => null);

  if (!response.ok) {
    const error = new Error(
      data?.error?.description ||
        data?.error?.reason ||
        `Razorpay refund failed with status ${response.status}`,
    );

    error.statusCode = response.status;
    error.razorpay = data;

    throw error;
  }

  return data;
};
