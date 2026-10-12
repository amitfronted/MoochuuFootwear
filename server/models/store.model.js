import mongoose from 'mongoose';

const storeSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },

    slug: {
      type: String,
      trim: true,
      lowercase: true,
      unique: true,
      sparse: true,
    },

    address: {
      type: String,
      required: true,
      trim: true,
    },

    city: {
      type: String,
      required: true,
      trim: true,
    },

    state: {
      type: String,
      required: true,
      trim: true,
    },

    pincode: {
      type: String,
      trim: true,
      default: '',
    },

    phone: {
      type: String,
      trim: true,
      default: '',
    },

    email: {
      type: String,
      trim: true,
      lowercase: true,
      default: '',
    },

    openingTime: {
      type: String,
      default: '10:00 AM',
    },

    closingTime: {
      type: String,
      default: '09:00 PM',
    },

    openingDays: {
      type: [String],
      default: [
        'Monday',
        'Tuesday',
        'Wednesday',
        'Thursday',
        'Friday',
        'Saturday',
        'Sunday',
      ],
    },

    latitude: {
      type: Number,
      required: true,
      min: -90,
      max: 90,
    },

    longitude: {
      type: Number,
      required: true,
      min: -180,
      max: 180,
    },

    status: {
      type: String,
      enum: ['ACTIVE', 'INACTIVE', 'ARCHIVED'],
      default: 'ACTIVE',
    },
  },
  { timestamps: true },
);

storeSchema.index({ status: 1, city: 1 });

const Store = mongoose.models.Store || mongoose.model('Store', storeSchema);

export default Store;
