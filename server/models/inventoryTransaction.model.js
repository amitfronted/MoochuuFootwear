import mongoose from 'mongoose';

const inventoryTransactionSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      enum: [
        'STOCK_IN',
        'STOCK_OUT',
        'ORDER',
        'RETURN',
        'CANCEL',
        'DAMAGE',
        'ADJUSTMENT',
      ],
      required: true,
      index: true,
    },

    // STANDARD / BASE / STRAP / THUMB
    itemType: {
      type: String,
      enum: ['STANDARD', 'BASE', 'STRAP', 'THUMB'],
      required: true,
      index: true,
    },

    // Product reference when applicable
    productId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product',
      default: null,
      index: true,
    },

    // Component reference when applicable
    componentId: {
      type: mongoose.Schema.Types.ObjectId,
      default: null,
      index: true,
    },

    colorId: {
      type: mongoose.Schema.Types.ObjectId,
      default: null,
    },

    variantId: {
      type: mongoose.Schema.Types.ObjectId,
      default: null,
    },

    // Size affected by the transaction
    size: {
      type: String,
      default: null,
      trim: true,
    },

    // Quantity changed
    quantity: {
      type: Number,
      required: true,
      min: 1,
    },

    // Stock before transaction
    previousStock: {
      type: Number,
      required: true,
      min: 0,
    },

    // Stock after transaction
    newStock: {
      type: Number,
      required: true,
      min: 0,
    },

    // Optional order reference
    orderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Order',
      default: null,
      index: true,
    },

    // Admin/user who caused the transaction
    performedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },

    // Optional explanation
    reason: {
      type: String,
      trim: true,
      default: null,
    },
  },
  {
    timestamps: true,
  },
);

export default mongoose.models.InventoryTransaction ||
  mongoose.model('InventoryTransaction', inventoryTransactionSchema);
