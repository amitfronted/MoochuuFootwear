import mongoose from 'mongoose';

const cartVariantSchema = new mongoose.Schema(
  {
    size: {
      type: String,
      required: true,
    },
    stockQuantity: {
      type: Number,
      required: true,
      default: 0,
    },
  },
  { _id: false },
);

const cartOptionSchema = new mongoose.Schema(
  {
    colorId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
    },
    colorName: {
      type: String,
      required: true,
    },
    image: {
      type: String,
      default: '',
    },
    variant: {
      type: cartVariantSchema,
      required: false,
    },
  },
  { _id: false },
);

const cartItemSchema = new mongoose.Schema(
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
      default: 1,
    },
    basePrice: {
      type: Number,
      required: true,
      min: 0,
    },
    // STANDARD product
    standardVariant: {
      size: String,
      stockQuantity: Number,
    },
    // CUSTOMIZABLE product
    base: {
      type: cartOptionSchema,
      default: null,
    },
    strap: {
      type: cartOptionSchema,
      default: null,
    },
    thumb: {
      type: cartOptionSchema,
      default: null,
    },
  },
  {
    _id: true,
  },
);

const cartSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    guestId: {
      type: String,
      default: null,
    },
    items: {
      type: [cartItemSchema],
      default: [],
    },
  },
  {
    timestamps: true,
  },
);

cartSchema.index(
  { userId: 1 },
  {
    unique: true,
    partialFilterExpression: {
      userId: { $ne: null },
    },
  },
);

cartSchema.index(
  { guestId: 1 },
  {
    unique: true,
    partialFilterExpression: {
      guestId: { $ne: null },
    },
  },
);

const Cart = mongoose.model('Cart', cartSchema);

export default Cart;
