import mongoose from 'mongoose';

const strapVariantSchema = new mongoose.Schema({
  size: { type: String, required: true, trim: true },
  stockQuantity: { type: Number, required: true, default: 0, min: 0 },
  reservedQuantity: {
    type: Number,
    required: true,
    default: 0,
    min: 0,
  },
});

const strapColorSchema = new mongoose.Schema({
  colorName: { type: String, required: true, trim: true },
  image: { type: String, required: true },
  variants: [strapVariantSchema],
});

const strapSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    colors: [strapColorSchema],
    status: {
      type: String,
      enum: ['ACTIVE', 'INACTIVE', 'ARCHIVED'],
      default: 'ACTIVE',
      index: true,
    },
  },
  { timestamps: true },
);

export default mongoose.models.Strap || mongoose.model('Strap', strapSchema);
