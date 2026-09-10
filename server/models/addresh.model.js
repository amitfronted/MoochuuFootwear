import mongoose from 'mongoose';

const addreshSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    name: {
      type: String,
      required: [true, 'Provide name'],
      trim: true,
    },
    phone: {
      type: String,
      required: [true, 'Provide phone number'],
      trim: true,
    },
    addressLine1: {
      type: String,
      required: [true, 'Provide address'],
      trim: true,
    },
    city: {
      type: String,
      required: [true, 'Provide city'],
      trim: true,
    },
    state: {
      type: String,
      required: [true, 'Provide state'],
      trim: true,
    },
    postalCode: {
      type: String,
      required: [true, 'Provide postal code'],
      trim: true,
    },
    addressType: {
      type: String,
      enum: ['Home', 'Office', 'Other'],
      default: 'Home',
    },
    country: {
      type: String,
      default: 'India',
      immutable: true,
    },
    landmark: {
      type: String,
      default: '',
      trim: true,
    },
    isDefault: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true },
);

const AddressModel = mongoose.model('Address', addreshSchema);

export default AddressModel;
