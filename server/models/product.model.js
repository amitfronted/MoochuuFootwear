import mongoose from 'mongoose';

const productSchema = new mongoose.Schema(
  {
    productCode: { type: String, required: true, unique: true },

    name: { type: String, required: true },

    description: { type: String },

    category: {
      type: String,
      enum: ['men', 'women', 'child', 'unisex'],
      required: true,
    },

    productType: {
      type: String,
      enum: ['STANDARD', 'CUSTOMIZABLE'],
      default: 'CUSTOMIZABLE',
    },
    status: {
      type: String,
      enum: ['DRAFT', 'ACTIVE', 'INACTIVE', 'ARCHIVED'],
      default: 'DRAFT',
      index: true,
    },

    basePrice: { type: Number, required: true },

    mainImage: { type: String, required: true },

    galleryImages: [{ type: String }],

    // Component References for Customization
    hasThumb: { type: Boolean, default: false },

    allowedBases: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Base' }],
    allowedStraps: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Strap' }],
    allowedThumbs: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Thumb' }],

    // Standard Product Fallback Stock (used only if productType === 'STANDARD')
    standardStock: [
      {
        size: { type: String, trim: true }, // Changed from Number to String
        stockQuantity: { type: Number, default: 0 },
      },
    ],
  },
  { timestamps: true },
);

export default mongoose.models.Product ||
  mongoose.model('Product', productSchema);
