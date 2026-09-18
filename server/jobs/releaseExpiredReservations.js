import mongoose from 'mongoose';

import PaymentAttempt from '../models/paymentAttempt.model.js';
import razorpay from '../config/razorpay.js';
import { releaseStockReservation } from '../utils/stockReservation.js';

const DEFAULT_INTERVAL_MS = 5 * 60 * 1000;
const DEFAULT_BATCH_SIZE = 50;

const hasSuccessfulOrPendingPayment = async (razorpayOrderId) => {
  try {
    const paymentsResponse =
      await razorpay.orders.fetchPayments(razorpayOrderId);
    const payments = Array.isArray(paymentsResponse?.items)
      ? paymentsResponse.items
      : [];

    return payments.some((payment) =>
      ['authorized', 'captured'].includes(
        String(payment?.status || '').toLowerCase(),
      ),
    );
  } catch (error) {
    console.error(
      `Unable to reconcile Razorpay payments for ${razorpayOrderId}:`,
      error?.message || error,
    );

    // Fail closed: if Razorpay cannot be checked, do not release inventory.
    return true;
  }
};

export const releaseExpiredReservations = async ({
  batchSize = DEFAULT_BATCH_SIZE,
} = {}) => {
  const now = new Date();

  const attempts = await PaymentAttempt.find({
    status: { $in: ['CREATED', 'PROCESSING'] },
    reservationStatus: 'RESERVED',
    expiresAt: { $ne: null, $lte: now },
  })
    .sort({ expiresAt: 1 })
    .limit(batchSize)
    .select(
      '_id razorpayOrderId status reservationStatus stockReservations expiresAt',
    )
    .lean();

  let released = 0;
  let skipped = 0;
  let failed = 0;

  for (const attempt of attempts) {
    const paymentExists = await hasSuccessfulOrPendingPayment(
      attempt.razorpayOrderId,
    );

    if (paymentExists) {
      skipped += 1;
      continue;
    }

    const session = await mongoose.startSession();

    try {
      let didRelease = false;

      await session.withTransaction(async () => {
        // Re-read inside the transaction so the cleanup job cannot release
        // a reservation that was committed/released after the initial scan.
        const currentAttempt = await PaymentAttempt.findOne({
          _id: attempt._id,
          reservationStatus: 'RESERVED',
          expiresAt: { $ne: null, $lte: new Date() },
          status: { $in: ['CREATED', 'PROCESSING'] },
        }).session(session);

        if (!currentAttempt) return;

        await releaseStockReservation({
          reservations: currentAttempt.stockReservations,
          session,
        });

        currentAttempt.reservationStatus = 'RELEASED';
        currentAttempt.reservationReleasedAt = new Date();
        currentAttempt.status = 'EXPIRED';
        currentAttempt.failureReason =
          currentAttempt.failureReason ||
          'Payment attempt expired before payment was completed.';

        await currentAttempt.save({ session });
        didRelease = true;
      });

      if (didRelease) released += 1;
    } catch (error) {
      failed += 1;
      console.error(
        `Failed to release expired reservation ${attempt._id}:`,
        error?.message || error,
      );
    } finally {
      await session.endSession();
    }
  }

  if (attempts.length > 0) {
    console.log(
      `Reservation cleanup: scanned=${attempts.length}, released=${released}, skipped=${skipped}, failed=${failed}`,
    );
  }

  return { scanned: attempts.length, released, skipped, failed };
};

export const startReservationExpiryJob = ({
  intervalMs = Number(process.env.RESERVATION_CLEANUP_INTERVAL_MS) ||
    DEFAULT_INTERVAL_MS,
} = {}) => {
  let running = false;

  const run = async () => {
    if (running) return;

    running = true;

    try {
      await releaseExpiredReservations();
    } catch (error) {
      console.error('Reservation expiry job failed:', error?.message || error);
    } finally {
      running = false;
    }
  };

  const timer = setInterval(run, intervalMs);
  timer.unref?.();

  // Run once shortly after the server starts instead of waiting for the
  // first interval.
  void run();

  console.log(
    `Reservation expiry job started. Interval: ${Math.round(intervalMs / 1000)}s`,
  );

  return timer;
};
