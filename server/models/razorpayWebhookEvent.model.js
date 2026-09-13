import mongoose from 'mongoose';

const razorpayWebhookEventSchema = new mongoose.Schema(
  {
    eventId: {
      type: String,
      required: true,
      unique: true,
      index: true,
      trim: true,
    },

    event: {
      type: String,
      required: true,
      index: true,
      trim: true,
    },

    resourceType: {
      type: String,
      enum: ['PAYMENT', 'ORDER', 'UNKNOWN'],
      default: 'UNKNOWN',
    },

    resourceId: {
      type: String,
      default: '',
      index: true,
    },

    status: {
      type: String,
      enum: ['PROCESSING', 'PROCESSED', 'FAILED'],
      default: 'PROCESSING',
      index: true,
    },

    attempts: {
      type: Number,
      default: 1,
      min: 1,
    },

    processedAt: {
      type: Date,
      default: null,
    },

    error: {
      type: String,
      default: '',
    },
  },
  {
    timestamps: true,
  },
);

const RazorpayWebhookEvent =
  mongoose.models.RazorpayWebhookEvent ||
  mongoose.model('RazorpayWebhookEvent', razorpayWebhookEventSchema);

export default RazorpayWebhookEvent;
