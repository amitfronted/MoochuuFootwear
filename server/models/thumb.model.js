import mongoose from 'mongoose';

const thumbVariantSchema = new mongoose.Schema({
  size: { type: Number, required: true },
  stockQuantity: { type: Number, required: true, default: 0 },
});

const thumbColorSchema = new mongoose.Schema({
  colorName: { type: String, required: true, trim: true },
  image: { type: String, required: true },
  variants: [thumbVariantSchema],
});

const thumbSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    colors: [thumbColorSchema],
    status: {
      type: String,
      enum: ['ACTIVE', 'INACTIVE', 'ARCHIVED'],
      default: 'ACTIVE',
      index: true,
    },
  },
  { timestamps: true },
);

export default mongoose.models.Thumb || mongoose.model('Thumb', thumbSchema);
