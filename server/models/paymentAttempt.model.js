import mongoose from 'mongoose';

const paymentAttemptSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },

    addressId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Address',
      required: true,
    },

    razorpayOrderId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },

    razorpayPaymentId: {
      type: String,
      default: '',
      index: true,
    },

    razorpaySignature: {
      type: String,
      default: '',
    },

    amount: {
      type: Number,
      required: true,
      min: 1,
    },
    cartItems: {
      type: [mongoose.Schema.Types.Mixed],
      required: true,
      default: [],
    },

    subtotal: {
      type: Number,
      required: true,
      min: 0,
    },
    couponCode: {
      type: String,
      default: '',
      trim: true,
      uppercase: true,
    },

    couponDiscount: {
      type: Number,
      default: 0,
      min: 0,
    },
    shippingCharge: {
      type: Number,
      default: 0,
      min: 0,
    },

    tax: {
      type: Number,
      default: 0,
      min: 0,
    },

    totalAmount: {
      type: Number,
      required: true,
      min: 0,
    },
    currency: {
      type: String,
      default: 'INR',
    },

    status: {
      type: String,
      enum: ['CREATED', 'PROCESSING', 'PAID', 'FAILED', 'EXPIRED'],
      default: 'CREATED',
      index: true,
    },

    failureReason: {
      type: String,
      default: '',
    },

    orderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Order',
      default: null,
      index: true,
    },

    reservationStatus: {
      type: String,
      enum: ['NONE', 'RESERVED', 'RELEASED', 'COMMITTED'],
      default: 'NONE',
      index: true,
    },

    stockReservations: {
      type: [mongoose.Schema.Types.Mixed],
      default: [],
    },

    reservationReleasedAt: {
      type: Date,
      default: null,
    },

    reservationCommittedAt: {
      type: Date,
      default: null,
    },

    paidAt: {
      type: Date,
      default: null,
    },

    expiresAt: {
      type: Date,
      default: null,
      index: true,
    },
  },
  {
    timestamps: true,
  },
);

paymentAttemptSchema.index({
  reservationStatus: 1,
  status: 1,
  expiresAt: 1,
});

export default mongoose.model('PaymentAttempt', paymentAttemptSchema);
