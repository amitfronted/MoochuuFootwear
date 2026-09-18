import mongoose from 'mongoose';

const idempotencySchema = new mongoose.Schema(
  {
    key: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },

    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },

    orderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Order',
      default: null,
    },

    /**
     * ONLINE RAZORPAY CHECKOUT
     */
    paymentAttemptId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'PaymentAttempt',
      default: null,
      index: true,
    },

    razorpayOrderId: {
      type: String,
      default: '',
      trim: true,
      index: true,
    },

    status: {
      type: String,
      enum: ['PROCESSING', 'COMPLETED', 'FAILED'],
      default: 'PROCESSING',
    },
  },
  {
    timestamps: true,
  },
);

export default mongoose.model('IdempotencyKey', idempotencySchema);
