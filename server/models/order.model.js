import mongoose from 'mongoose';

const orderOptionSchema = new mongoose.Schema(
  {
    componentId: {
      type: mongoose.Schema.Types.ObjectId,
      required: false,
    },

    colorId: {
      type: mongoose.Schema.Types.ObjectId,
      required: false,
    },

    variantId: {
      type: mongoose.Schema.Types.ObjectId,
      required: false,
    },

    colorName: {
      type: String,
      default: '',
    },

    image: {
      type: String,
      default: '',
    },
  },
  { _id: false },
);

const orderItemSchema = new mongoose.Schema(
  {
    productId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product',
      required: true,
    },
    productCode: {
      type: String,
      required: true,
    },
    name: {
      type: String,
      required: true,
    },
    image: {
      type: String,
      default: '',
    },
    productType: {
      type: String,
      enum: ['STANDARD', 'CUSTOMIZABLE'],
      required: true,
    },
    size: {
      type: String,
      required: true,
    },
    quantity: {
      type: Number,
      required: true,
      min: 1,
    },
    unitPrice: {
      type: Number,
      required: true,
      min: 0,
    },
    lineTotal: {
      type: Number,
      required: true,
      min: 0,
    },
    variantId: {
      type: mongoose.Schema.Types.ObjectId,
      required: false,
    },
    base: {
      type: orderOptionSchema,
      default: null,
    },
    strap: {
      type: orderOptionSchema,
      default: null,
    },
    thumb: {
      type: orderOptionSchema,
      default: null,
    },
  },
  { _id: true },
);

const shippingAddressSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    phone: { type: String, required: true },
    addressLine1: { type: String, required: true },
    city: { type: String, required: true },
    state: { type: String, required: true },
    postalCode: { type: String, required: true },
    landmark: { type: String, default: '' },
    addressType: { type: String, default: 'Home' },
    country: { type: String, default: 'India' },
  },
  { _id: false },
);

const returnRequestSchema = new mongoose.Schema(
  {
    reason: {
      type: String,
      enum: [
        'WRONG_PRODUCT',
        'DAMAGED_PRODUCT',
        'DEFECTIVE_PRODUCT',
        'SIZE_ISSUE',
        'QUALITY_ISSUE',
        'OTHER',
      ],
      default: '',
    },

    comment: {
      type: String,
      default: '',
      trim: true,
      maxlength: 500,
    },

    requestedAt: {
      type: Date,
      default: null,
    },

    approvedAt: {
      type: Date,
      default: null,
    },

    rejectedAt: {
      type: Date,
      default: null,
    },

    receivedAt: {
      type: Date,
      default: null,
    },

    conditionComment: {
      type: String,
      default: '',
      trim: true,
      maxlength: 500,
    },

    completedAt: {
      type: Date,
      default: null,
    },

    rejectionReason: {
      type: String,
      default: '',
      trim: true,
      maxlength: 500,
    },
  },
  { _id: false },
);

const shippingDetailsSchema = new mongoose.Schema(
  {
    courierName: {
      type: String,
      default: '',
      trim: true,
      maxlength: 100,
    },

    trackingNumber: {
      type: String,
      default: '',
      trim: true,
      maxlength: 100,
    },

    trackingUrl: {
      type: String,
      default: '',
      trim: true,
      maxlength: 500,
    },

    shippedAt: {
      type: Date,
      default: null,
    },
  },
  { _id: false },
);

const orderSchema = new mongoose.Schema(
  {
    orderNumber: {
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
    items: {
      type: [orderItemSchema],
      required: true,
      validate: {
        validator: (items) => Array.isArray(items) && items.length > 0,
        message: 'Order must contain at least one item',
      },
    },
    shippingAddress: {
      type: shippingAddressSchema,
      required: true,
    },
    shipping: {
      type: shippingDetailsSchema,
      default: () => ({}),
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
    paymentMethod: {
      type: String,
      enum: ['COD', 'ONLINE'],
      required: true,
      index: true,
    },
    paymentStatus: {
      type: String,
      enum: ['PENDING', 'PROCESSING', 'PAID', 'FAILED', 'REFUNDED'],
      default: 'PENDING',
      index: true,
    },
    paymentProvider: {
      type: String,
      enum: ['COD', 'RAZORPAY'],
      default: 'COD',
    },
    razorpayOrderId: {
      type: String,
      default: '',
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
    paymentId: {
      type: String,
      default: '',
    },
    paymentPaidAt: {
      type: Date,
      default: null,
    },
    paymentFailedAt: {
      type: Date,
      default: null,
    },
    paymentFailureReason: {
      type: String,
      default: '',
    },
    refundId: {
      type: String,
      default: '',
      index: true,
    },
    refundAmount: {
      type: Number,
      default: 0,
      min: 0,
    },
    refundStatus: {
      type: String,
      enum: ['NONE', 'PENDING', 'PARTIAL', 'PROCESSED', 'FAILED'],
      default: 'NONE',
      index: true,
    },

    refundFailureReason: {
      type: String,
      default: '',
      trim: true,
      maxlength: 500,
    },
    refundedAt: {
      type: Date,
      default: null,
    },
    totalRefundedAmount: {
      type: Number,
      default: 0,
      min: 0,
    },

    remainingRefundableAmount: {
      type: Number,
      default: 0,
      min: 0,
    },
    orderStatus: {
      type: String,
      enum: [
        'PLACED',
        'CONFIRMED',
        'PROCESSING',
        'SHIPPED',
        'DELIVERED',
        'CANCELLED',
      ],
      default: 'PLACED',
      index: true,
    },
    returnStatus: {
      type: String,
      enum: ['NONE', 'REQUESTED', 'APPROVED', 'REJECTED', 'COMPLETED'],
      default: 'NONE',
      index: true,
    },

    returnRequest: {
      type: returnRequestSchema,
      default: null,
    },
    cancelledAt: {
      type: Date,
      default: null,
    },
    deliveredAt: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true },
);

export default mongoose.models.Order || mongoose.model('Order', orderSchema);
