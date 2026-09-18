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

  if (!Number.isInteger(amount) || amount <= 0) {
    throw new Error(
      'Refund amount must be a positive integer in currency subunits.',
    );
  }

  if (!idempotencyKey || idempotencyKey.length < 10) {
    throw new Error('Valid Razorpay refund idempotency key is required');
  }

  const payload = {
    amount,
    speed,
    ...(receipt ? { receipt } : {}),
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

export const fetchRazorpayRefund = async (refundId) => {
  if (!refundId) {
    throw new Error('Razorpay refund ID is required');
  }

  const response = await fetch(
    `https://api.razorpay.com/v1/refunds/${encodeURIComponent(refundId)}`,
    {
      method: 'GET',
      headers: {
        Authorization: `Basic ${createBasicAuth()}`,
        'Content-Type': 'application/json',
      },
    },
  );

  const data = await response.json().catch(() => null);

  if (!response.ok) {
    const error = new Error(
      data?.error?.description ||
        data?.error?.reason ||
        `Failed to fetch Razorpay refund with status ${response.status}`,
    );

    error.statusCode = response.status;
    error.razorpay = data;

    throw error;
  }

  return data;
};

export const fetchRazorpayPayment = async (paymentId) => {
  if (!paymentId) {
    throw new Error('Razorpay payment ID is required');
  }

  const response = await fetch(
    `https://api.razorpay.com/v1/payments/${encodeURIComponent(paymentId)}`,
    {
      method: 'GET',
      headers: {
        Authorization: `Basic ${createBasicAuth()}`,
        'Content-Type': 'application/json',
      },
    },
  );

  const data = await response.json().catch(() => null);

  if (!response.ok) {
    const error = new Error(
      data?.error?.description ||
        data?.error?.reason ||
        `Failed to fetch Razorpay payment with status ${response.status}`,
    );

    error.statusCode = response.status;
    error.razorpay = data;

    throw error;
  }

  return data;
};

export const reconcileRazorpayPayment = async (paymentId) => {
  if (!paymentId) {
    throw new Error('Razorpay payment ID is required');
  }

  const payment = await fetchRazorpayPayment(paymentId);

  return {
    paymentId: payment.id,
    status: payment.status,
    amount: Number(payment.amount) || 0,
    amountRefunded: Number(payment.amount_refunded) || 0,
    refundStatus: payment.refund_status || null,
    currency: payment.currency || 'INR',
  };
};
