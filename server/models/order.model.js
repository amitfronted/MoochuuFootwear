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
    subtotal: {
      type: Number,
      required: true,
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
    },
    paymentStatus: {
      type: String,
      enum: ['PENDING', 'PAID', 'FAILED', 'REFUNDED'],
      default: 'PENDING',
    },
    paymentId: {
      type: String,
      default: '',
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
