import crypto from 'crypto';

import PaymentAttempt from '../models/paymentAttempt.model.js';
import Order from '../models/order.model.js';
import RazorpayWebhookEvent from '../models/razorpayWebhookEvent.model.js';

const getPaymentEntity = (payload) => {
  return payload?.payload?.payment?.entity || null;
};

const getOrderEntity = (payload) => {
  return payload?.payload?.order?.entity || null;
};

const getFailureReason = (payment) => {
  return (
    payment?.error_description ||
    payment?.error_reason ||
    payment?.error_code ||
    'Razorpay payment failed.'
  );
};

const getPaymentDate = (payment) => {
  if (payment?.created_at) {
    const date = new Date(payment.created_at * 1000);

    if (!Number.isNaN(date.getTime())) {
      return date;
    }
  }

  return new Date();
};

const getResourceInfo = (event, payload) => {
  const payment = getPaymentEntity(payload);
  const razorpayOrder = getOrderEntity(payload);

  if (payment?.id) {
    return {
      resourceType: 'PAYMENT',
      resourceId: payment.id,
    };
  }

  if (razorpayOrder?.id) {
    return {
      resourceType: 'ORDER',
      resourceId: razorpayOrder.id,
    };
  }

  return {
    resourceType: 'UNKNOWN',
    resourceId: '',
  };
};

const isValidAmountAndCurrency = ({ amount, currency, paymentAttempt }) => {
  if (
    amount !== undefined &&
    amount !== null &&
    Number(amount) !== Number(paymentAttempt.amount)
  ) {
    return false;
  }

  if (
    currency &&
    paymentAttempt.currency &&
    currency !== paymentAttempt.currency
  ) {
    return false;
  }

  return true;
};

const updateInternalOrderAsPaid = async ({
  paymentAttempt,
  paymentId,
  paidAt,
}) => {
  if (!paymentAttempt.orderId) {
    return;
  }

  const updateData = {
    paymentStatus: 'PAID',
    paymentPaidAt: paidAt,
  };

  if (paymentId) {
    updateData.razorpayPaymentId = paymentId;
    updateData.paymentId = paymentId;
  }

  await Order.updateOne(
    {
      _id: paymentAttempt.orderId,
    },
    {
      $set: updateData,
    },
  );
};

const processPaymentCaptured = async (payload) => {
  const payment = getPaymentEntity(payload);

  if (!payment?.id || !payment?.order_id) {
    throw new Error(
      'Invalid payment.captured webhook: payment information missing.',
    );
  }

  const paymentAttempt = await PaymentAttempt.findOne({
    razorpayOrderId: payment.order_id,
  });

  if (!paymentAttempt) {
    throw new Error(
      `PaymentAttempt not found for Razorpay order ${payment.order_id}.`,
    );
  }

  if (
    !isValidAmountAndCurrency({
      amount: payment.amount,
      currency: payment.currency,
      paymentAttempt,
    })
  ) {
    throw new Error(
      `Webhook payment amount/currency mismatch for ${payment.order_id}.`,
    );
  }

  const paidAt = getPaymentDate(payment);

  /**
   * IMPORTANT:
   *
   * If the frontend verification already created the order,
   * PaymentAttempt.status will already be PAID and orderId will exist.
   *
   * We DO NOT create another order here.
   */
  if (paymentAttempt.status === 'PAID' && paymentAttempt.orderId) {
    await updateInternalOrderAsPaid({
      paymentAttempt,
      paymentId: payment.id,
      paidAt,
    });

    return;
  }

  /**
   * payment.captured means Razorpay has captured the payment,
   * but our final order creation may still be waiting for
   * frontend verification.
   *
   * Keep PaymentAttempt as PROCESSING.
   */
  await PaymentAttempt.updateOne(
    {
      _id: paymentAttempt._id,
    },
    {
      $set: {
        razorpayPaymentId: payment.id,
        status: 'PROCESSING',
        failureReason: '',
      },
    },
  );
};

const processPaymentFailed = async (payload) => {
  const payment = getPaymentEntity(payload);

  if (!payment?.id || !payment?.order_id) {
    throw new Error(
      'Invalid payment.failed webhook: payment information missing.',
    );
  }

  const paymentAttempt = await PaymentAttempt.findOne({
    razorpayOrderId: payment.order_id,
  });

  if (!paymentAttempt) {
    throw new Error(
      `PaymentAttempt not found for Razorpay order ${payment.order_id}.`,
    );
  }

  /**
   * IMPORTANT:
   *
   * Never change an already completed payment back to FAILED.
   *
   * This protects against webhook events arriving out of order.
   */
  if (paymentAttempt.status === 'PAID' && paymentAttempt.orderId) {
    return;
  }

  const failureReason = getFailureReason(payment);

  await PaymentAttempt.updateOne(
    {
      _id: paymentAttempt._id,
    },
    {
      $set: {
        razorpayPaymentId: payment.id,
        status: 'FAILED',
        failureReason,
      },
    },
  );

  /**
   * Normally your online Order is created only after successful
   * payment verification, so orderId should not exist here.
   *
   * If an order already exists, safely mark its payment as failed.
   */
  if (paymentAttempt.orderId) {
    await Order.updateOne(
      {
        _id: paymentAttempt.orderId,
      },
      {
        $set: {
          paymentStatus: 'FAILED',
          paymentFailedAt: new Date(),
          paymentFailureReason: failureReason,
          razorpayPaymentId: payment.id,
          paymentId: payment.id,
        },
      },
    );
  }
};

const processOrderPaid = async (payload) => {
  const payment = getPaymentEntity(payload);
  const razorpayOrder = getOrderEntity(payload);

  const razorpayOrderId = payment?.order_id || razorpayOrder?.id || null;

  if (!razorpayOrderId) {
    throw new Error('Invalid order.paid webhook: Razorpay order ID missing.');
  }

  const paymentAttempt = await PaymentAttempt.findOne({
    razorpayOrderId,
  });

  if (!paymentAttempt) {
    throw new Error(
      `PaymentAttempt not found for Razorpay order ${razorpayOrderId}.`,
    );
  }

  const amount = payment?.amount ?? razorpayOrder?.amount;
  const currency = payment?.currency ?? razorpayOrder?.currency;

  if (
    !isValidAmountAndCurrency({
      amount,
      currency,
      paymentAttempt,
    })
  ) {
    throw new Error(
      `Webhook order amount/currency mismatch for ${razorpayOrderId}.`,
    );
  }

  const paymentId = payment?.id || null;
  const paidAt = payment ? getPaymentDate(payment) : new Date();

  /**
   * If verification already completed the order,
   * simply reconcile the internal order.
   */
  if (paymentAttempt.status === 'PAID' && paymentAttempt.orderId) {
    await updateInternalOrderAsPaid({
      paymentAttempt,
      paymentId,
      paidAt,
    });

    return;
  }

  /**
   * The payment is confirmed by Razorpay, but our final
   * order creation can still be completed by the verification
   * endpoint.
   */
  await PaymentAttempt.updateOne(
    {
      _id: paymentAttempt._id,
    },
    {
      $set: {
        status: 'PROCESSING',
        ...(paymentId
          ? {
              razorpayPaymentId: paymentId,
            }
          : {}),
        failureReason: '',
      },
    },
  );
};

const processWebhookEvent = async (event, payload) => {
  switch (event) {
    case 'payment.captured':
      await processPaymentCaptured(payload);
      break;

    case 'payment.failed':
      await processPaymentFailed(payload);
      break;

    case 'order.paid':
      await processOrderPaid(payload);
      break;

    default:
      /**
       * We still store unknown events as PROCESSED.
       *
       * This prevents the same unsupported event from being
       * repeatedly delivered.
       */
      console.log(`Ignoring unsupported Razorpay event: ${event}`);
      break;
  }
};

export const razorpayWebhookController = async (req, res) => {
  let webhookEvent = null;

  try {
    const webhookSignature = req.headers['x-razorpay-signature'];

    const eventId = req.headers['x-razorpay-event-id'];

    if (!webhookSignature) {
      return res.status(400).json({
        success: false,
        message: 'Missing Razorpay webhook signature.',
      });
    }

    if (!eventId) {
      return res.status(400).json({
        success: false,
        message: 'Missing Razorpay webhook event ID.',
      });
    }

    if (!process.env.RAZORPAY_WEBHOOK_SECRET) {
      console.error('RAZORPAY_WEBHOOK_SECRET is not configured.');

      return res.status(500).json({
        success: false,
        message: 'Webhook configuration error.',
      });
    }

    /**
     * IMPORTANT:
     *
     * req.body MUST be the raw Buffer.
     *
     * Your server/index.js already mounts express.raw()
     * before express.json() for this route.
     */
    if (!Buffer.isBuffer(req.body)) {
      return res.status(400).json({
        success: false,
        message: 'Webhook body must be a raw Buffer.',
      });
    }

    const expectedSignature = crypto
      .createHmac('sha256', process.env.RAZORPAY_WEBHOOK_SECRET)
      .update(req.body)
      .digest('hex');

    const expectedSignatureBuffer = Buffer.from(expectedSignature, 'utf8');

    const webhookSignatureBuffer = Buffer.from(webhookSignature, 'utf8');

    /**
     * timingSafeEqual throws if buffer lengths differ,
     * so check the lengths first.
     */
    if (expectedSignatureBuffer.length !== webhookSignatureBuffer.length) {
      return res.status(400).json({
        success: false,
        message: 'Invalid webhook signature.',
      });
    }

    if (
      !crypto.timingSafeEqual(expectedSignatureBuffer, webhookSignatureBuffer)
    ) {
      return res.status(400).json({
        success: false,
        message: 'Invalid webhook signature.',
      });
    }

    let payload;

    try {
      payload = JSON.parse(req.body.toString('utf8'));
    } catch (parseError) {
      console.error('Razorpay webhook JSON parse error:', parseError);

      return res.status(400).json({
        success: false,
        message: 'Invalid webhook JSON.',
      });
    }

    const event = payload?.event;

    if (!event) {
      return res.status(400).json({
        success: false,
        message: 'Webhook event is missing.',
      });
    }

    const resourceInfo = getResourceInfo(event, payload);

    console.log('RAZORPAY WEBHOOK:', event, eventId, resourceInfo.resourceId);

    /**
     * ---------------------------------------------------------
     * DUPLICATE EVENT PROTECTION
     * ---------------------------------------------------------
     */

    webhookEvent = await RazorpayWebhookEvent.findOne({
      eventId,
    });

    if (webhookEvent) {
      /**
       * Already completely processed.
       */
      if (webhookEvent.status === 'PROCESSED') {
        return res.status(200).json({
          success: true,
          received: true,
          duplicate: true,
        });
      }

      /**
       * If another request is currently processing this event,
       * acknowledge it.
       */
      if (webhookEvent.status === 'PROCESSING') {
        const processingAge =
          Date.now() - new Date(webhookEvent.updatedAt).getTime();

        /**
         * Less than 2 minutes old:
         * another request is probably still processing it.
         */
        if (processingAge < 2 * 60 * 1000) {
          return res.status(200).json({
            success: true,
            received: true,
            duplicate: true,
            processing: true,
          });
        }

        /**
         * Older PROCESSING record:
         * consider it stale and retry processing.
         */
      }

      webhookEvent.status = 'PROCESSING';
      webhookEvent.attempts += 1;
      webhookEvent.error = '';
      webhookEvent.processedAt = null;
      webhookEvent.event = event;
      webhookEvent.resourceType = resourceInfo.resourceType;
      webhookEvent.resourceId = resourceInfo.resourceId;

      await webhookEvent.save();
    } else {
      try {
        webhookEvent = await RazorpayWebhookEvent.create({
          eventId,
          event,
          resourceType: resourceInfo.resourceType,
          resourceId: resourceInfo.resourceId,
          status: 'PROCESSING',
          attempts: 1,
        });
      } catch (createError) {
        /**
         * Two identical webhook requests can arrive at
         * almost exactly the same time.
         *
         * The unique eventId index protects us.
         */
        if (createError?.code === 11000) {
          webhookEvent = await RazorpayWebhookEvent.findOne({
            eventId,
          });

          if (webhookEvent?.status === 'PROCESSED') {
            return res.status(200).json({
              success: true,
              received: true,
              duplicate: true,
            });
          }

          if (webhookEvent?.status === 'PROCESSING') {
            return res.status(200).json({
              success: true,
              received: true,
              duplicate: true,
              processing: true,
            });
          }

          webhookEvent.status = 'PROCESSING';

          webhookEvent.attempts += 1;
          webhookEvent.error = '';

          await webhookEvent.save();
        } else {
          throw createError;
        }
      }
    }

    /**
     * ---------------------------------------------------------
     * PROCESS RAZORPAY EVENT
     * ---------------------------------------------------------
     */

    await processWebhookEvent(event, payload);

    /**
     * Mark event successfully processed.
     */
    await RazorpayWebhookEvent.updateOne(
      {
        _id: webhookEvent._id,
      },
      {
        $set: {
          status: 'PROCESSED',
          processedAt: new Date(),
          error: '',
        },
      },
    );

    return res.status(200).json({
      success: true,
      received: true,
    });
  } catch (error) {
    console.error('Razorpay webhook error:', error);

    /**
     * Save failure so Razorpay's retry can process
     * the same event again.
     */
    if (webhookEvent?._id) {
      try {
        await RazorpayWebhookEvent.updateOne(
          {
            _id: webhookEvent._id,
          },
          {
            $set: {
              status: 'FAILED',
              error: error?.message || 'Webhook processing failed.',
            },
          },
        );
      } catch (updateError) {
        console.error('Failed to update webhook event status:', updateError);
      }
    }

    /**
     * 500 tells Razorpay that processing failed and
     * the webhook may need to be retried.
     */
    return res.status(500).json({
      success: false,
      message: 'Webhook processing failed.',
    });
  }
};
