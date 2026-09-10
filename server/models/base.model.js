import mongoose from 'mongoose';

const baseVariantSchema = new mongoose.Schema({
  size: { type: String, required: true, trim: true },
  stockQuantity: { type: Number, required: true, default: 0 },
});

const baseColorSchema = new mongoose.Schema({
  colorName: { type: String, required: true, trim: true },
  image: { type: String, required: true },
  variants: [baseVariantSchema],
});

const baseSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    colors: [baseColorSchema],
    status: {
      type: String,
      enum: ['ACTIVE', 'INACTIVE', 'ARCHIVED'],
      default: 'ACTIVE',
      index: true,
    },
  },
  { timestamps: true },
);

export default mongoose.models.Base || mongoose.model('Base', baseSchema);
