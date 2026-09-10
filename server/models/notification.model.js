import mongoose from 'mongoose';

const notificationSchema = new mongoose.Schema(
  {
    recipient: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },

    type: {
      type: String,
      enum: [
        'NEW_ORDER',
        'ORDER_STATUS',
        'ORDER_CANCELLED',
        'LOW_STOCK',
        'PAYMENT',
      ],
      required: true,
    },

    title: {
      type: String,
      required: true,
    },

    message: {
      type: String,
      required: true,
    },

    orderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Order',
      default: null,
    },

    orderNumber: {
      type: String,
      default: '',
    },

    isRead: {
      type: Boolean,
      default: false,
      index: true,
    },

    data: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
  },
  {
    timestamps: true,
  },
);

notificationSchema.index({
  recipient: 1,
  isRead: 1,
  createdAt: -1,
});

export default mongoose.models.Notification ||
  mongoose.model('Notification', notificationSchema);
