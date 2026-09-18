import Order from '../models/order.model.js';
import Refund from '../models/refund.model.js';
import {
  fetchRazorpayPayment,
  fetchRazorpayRefund,
} from '../utils/razorpayRefund.js';

export const reconcileRefundController = async (req, res) => {
  try {
    const { orderId } = req.params;

    if (!orderId) {
      return res.status(400).json({
        success: false,
        message: 'Order ID is required.',
      });
    }

    const order = await Order.findById(orderId);

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found.',
      });
    }

    if (
      order.paymentMethod !== 'ONLINE' ||
      order.paymentProvider !== 'RAZORPAY'
    ) {
      return res.status(400).json({
        success: false,
        message:
          'Refund reconciliation is only supported for Razorpay online orders.',
      });
    }

    const paymentId = order.razorpayPaymentId || order.paymentId;

    if (!paymentId) {
      return res.status(400).json({
        success: false,
        message: 'Razorpay payment ID not found.',
      });
    }

    /**
     * ---------------------------------------------------------
     * 1. Fetch current Razorpay payment state
     * ---------------------------------------------------------
     */
    const payment = await fetchRazorpayPayment(paymentId);

    /**
     * ---------------------------------------------------------
     * 2. Find local refunds for this order
     * ---------------------------------------------------------
     */
    const localRefunds = await Refund.find({
      orderId: order._id,
    }).sort({ createdAt: 1 });

    /**
     * ---------------------------------------------------------
     * 3. Reconcile each local refund
     * ---------------------------------------------------------
     */
    for (const localRefund of localRefunds) {
      if (!localRefund.razorpayRefundId) {
        continue;
      }

      let razorpayRefund;

      try {
        razorpayRefund = await fetchRazorpayRefund(
          localRefund.razorpayRefundId,
        );
      } catch (error) {
        /**
         * If an individual refund cannot be fetched,
         * do not destroy the local state.
         *
         * The payment-level information is still available.
         */
        console.error(
          `Failed to fetch Razorpay refund ${localRefund.razorpayRefundId}:`,
          error.message,
        );

        continue;
      }

      const razorpayStatus = String(razorpayRefund?.status || '').toLowerCase();

      if (razorpayStatus === 'processed') {
        localRefund.status = 'PROCESSED';
        localRefund.failureReason = '';
        localRefund.processedAt = razorpayRefund.processed_at
          ? new Date(razorpayRefund.processed_at * 1000)
          : localRefund.processedAt || new Date();
        localRefund.failedAt = null;
      } else if (razorpayStatus === 'failed') {
        /**
         * Never downgrade a successfully processed local refund.
         */
        if (localRefund.status !== 'PROCESSED') {
          localRefund.status = 'FAILED';
          localRefund.failureReason =
            razorpayRefund.error_description ||
            razorpayRefund.error_reason ||
            'Razorpay refund failed.';
          localRefund.failedAt = new Date();
        }
      } else {
        /**
         * created / pending / processing
         */
        if (localRefund.status !== 'PROCESSED') {
          localRefund.status = 'PENDING';
          localRefund.failureReason = '';
        }
      }

      await localRefund.save();
    }

    /**
     * ---------------------------------------------------------
     * 4. Recalculate local order refund summary
     * ---------------------------------------------------------
     */
    const processedRefunds = await Refund.aggregate([
      {
        $match: {
          orderId: order._id,
          status: 'PROCESSED',
        },
      },
      {
        $group: {
          _id: null,
          totalRefunded: {
            $sum: '$amount',
          },
        },
      },
    ]);

    const totalRefundedAmount =
      Number(processedRefunds?.[0]?.totalRefunded) || 0;

    const orderTotalAmount = Number(order.totalAmount) || 0;

    const remainingRefundableAmount = Math.max(
      orderTotalAmount - totalRefundedAmount,
      0,
    );

    const isFullyRefunded = remainingRefundableAmount <= 0.01;

    let refundStatus = 'PENDING';

    if (isFullyRefunded) {
      refundStatus = 'PROCESSED';
    } else if (totalRefundedAmount > 0) {
      refundStatus = 'PARTIAL';
    }

    /**
     * ---------------------------------------------------------
     * 5. Update order
     * ---------------------------------------------------------
     */
    order.totalRefundedAmount = totalRefundedAmount;
    order.remainingRefundableAmount = remainingRefundableAmount;
    order.refundStatus = refundStatus;

    if (totalRefundedAmount > 0) {
      const latestProcessedRefund = await Refund.findOne({
        orderId: order._id,
        status: 'PROCESSED',
      }).sort({ processedAt: -1 });

      if (latestProcessedRefund) {
        order.refundId = latestProcessedRefund.razorpayRefundId;
        order.refundAmount = latestProcessedRefund.amount;
        order.refundedAt = latestProcessedRefund.processedAt || new Date();
      }
    }

    order.paymentStatus = isFullyRefunded ? 'REFUNDED' : 'PAID';

    order.refundFailureReason = '';

    await order.save();

    return res.status(200).json({
      success: true,
      message: 'Refund reconciliation completed.',
      data: {
        orderId: order._id,
        paymentId,
        razorpayPaymentStatus: payment.status,
        razorpayAmountRefunded: Number(payment.amount_refunded) || 0,
        razorpayRefundStatus: payment.refund_status || null,
        totalRefundedAmount,
        remainingRefundableAmount,
        refundStatus,
        paymentStatus: order.paymentStatus,
      },
    });
  } catch (error) {
    console.error('Refund reconciliation error:', error);

    return res.status(500).json({
      success: false,
      message: error?.message || 'Refund reconciliation failed.',
    });
  }
};
