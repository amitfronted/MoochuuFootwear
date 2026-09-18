import mongoose from 'mongoose';

const refundSchema = new mongoose.Schema(
  {
    orderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Order',
      required: true,
      index: true,
    },

    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },

    paymentId: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },

    razorpayRefundId: {
      type: String,
      default: '',
      trim: true,
    },

    amount: {
      type: Number,
      required: true,
      min: 0.01,
    },

    currency: {
      type: String,
      default: 'INR',
      uppercase: true,
      trim: true,
    },

    status: {
      type: String,
      enum: ['PENDING', 'PROCESSED', 'FAILED'],
      default: 'PENDING',
      index: true,
    },

    source: {
      type: String,
      enum: ['ADMIN', 'CANCEL', 'RETURN', 'SYSTEM'],
      default: 'ADMIN',
      index: true,
    },

    reason: {
      type: String,
      default: '',
      trim: true,
      maxlength: 500,
    },

    failureReason: {
      type: String,
      default: '',
      trim: true,
      maxlength: 500,
    },

    idempotencyKey: {
      type: String,
      required: true,
      trim: true,
    },

    razorpayReceipt: {
      type: String,
      default: '',
      trim: true,
    },

    requestedAt: {
      type: Date,
      default: Date.now,
    },

    processedAt: {
      type: Date,
      default: null,
    },

    failedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  },
);

/*
 * One local refund request must have one unique idempotency key.
 * This prevents accidental duplicate refund creation from
 * repeated requests.
 */
refundSchema.index({ idempotencyKey: 1 }, { unique: true });

/*
 * Razorpay refund IDs are unique when present.
 * sparse allows multiple documents where the value is still empty.
 */
refundSchema.index(
  { razorpayRefundId: 1 },
  {
    unique: true,
    sparse: true,
  },
);

/*
 * Useful for refund history and reconciliation.
 */
refundSchema.index({
  orderId: 1,
  createdAt: -1,
});

refundSchema.index({
  paymentId: 1,
  status: 1,
});

export default mongoose.models.Refund || mongoose.model('Refund', refundSchema);
