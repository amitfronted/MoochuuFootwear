'use client';

import { useState, useEffect } from 'react';
import { fetchComponents, createProduct } from '../../../lib/api';
import { uploadSingleImage, uploadMultipleImages } from '@/app/lib/upload';
import { IoClose } from 'react-icons/io5';
import toast from 'react-hot-toast';

const initialFormState = {
  productCode: '',
  name: '',
  description: '',
  category: 'men',
  productType: 'CUSTOMIZABLE',
  basePrice: '',
  mainImage: '',
  galleryImages: [],
  hasThumb: false,
  allowedBases: [],
  allowedStraps: [],
  allowedThumbs: [],
  standardStock: [{ size: '', stockQuantity: 0 }], // Initial stock row for STANDARD
};

export default function CreateProductPage() {
  const [formData, setFormData] = useState(initialFormState);

  const [availableBases, setAvailableBases] = useState([]);
  const [availableStraps, setAvailableStraps] = useState([]);
  const [availableThumbs, setAvailableThumbs] = useState([]);
  const [isUploading, setIsUploading] = useState(false);

  // Fetch created inventory components on load
  useEffect(() => {
    const loadComponents = async () => {
      const basesRes = await fetchComponents('base');
      const strapsRes = await fetchComponents('strap');
      const thumbsRes = await fetchComponents('thumb');

      if (basesRes.success) setAvailableBases(basesRes.data);
      if (strapsRes.success) setAvailableStraps(strapsRes.data);
      if (thumbsRes.success) setAvailableThumbs(thumbsRes.data);
    };
    loadComponents();
  }, []);

  const handleCheckboxSelect = (type, id) => {
    setFormData((prev) => {
      const currentList = prev[type];
      const updatedList = currentList.includes(id)
        ? currentList.filter((item) => item !== id)
        : [...currentList, id];
      return { ...prev, [type]: updatedList };
    });
  };

  // Standard Stock Handlers
  const handleAddStockRow = () => {
    setFormData((prev) => ({
      ...prev,
      standardStock: [...prev.standardStock, { size: '', stockQuantity: 0 }],
    }));
  };

  const handleRemoveStockRow = (index) => {
    setFormData((prev) => ({
      ...prev,
      standardStock: prev.standardStock.filter((_, i) => i !== index),
    }));
  };

  const handleStockChange = (index, field, value) => {
    const updatedStock = [...formData.standardStock];
    updatedStock[index][field] =
      field === 'stockQuantity' ? Number(value) || 0 : value;
    setFormData((prev) => ({ ...prev, standardStock: updatedStock }));
  };

  // Main Image Upload Handler
  const handleMainImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setIsUploading(true);
    try {
      const url = await uploadSingleImage(file);
      setFormData((prev) => ({ ...prev, mainImage: url }));
    } catch (err) {
      alert('Error uploading image');
    } finally {
      setIsUploading(false);
    }
  };

  // Gallery Images Upload Handler
  const handleGalleryImagesUpload = async (e) => {
    const files = e.target.files;
    if (!files.length) return;
    setIsUploading(true);
    try {
      const urls = await uploadMultipleImages(files);
      setFormData((prev) => ({
        ...prev,
        galleryImages: [...prev.galleryImages, ...urls],
      }));
    } catch (err) {
      alert('Error uploading gallery images');
    } finally {
      setIsUploading(false);
    }
  };

  // Remove Main Image
  const handleRemoveMainImage = () => {
    setFormData((prev) => ({ ...prev, mainImage: '' }));
  };

  // Remove Specific Gallery Image by Index
  const handleRemoveGalleryImage = (indexToRemove) => {
    setFormData((prev) => ({
      ...prev,
      galleryImages: prev.galleryImages.filter(
        (_, idx) => idx !== indexToRemove,
      ),
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const payload = {
      ...formData,
      basePrice: Number(formData.basePrice),
    };

    try {
      const res = await createProduct(payload);
      if (res.success) {
        toast.success('Product configured and saved successfully!');
        // Reset form state to initial state
        setFormData(initialFormState);
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Error creating product');
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6 bg-white shadow rounded-lg mt-8">
      <h1 className="text-2xl font-bold mb-6">
        Configure New Footwear Product
      </h1>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Product Type Selector */}
        <div className="flex items-center gap-6 p-4 border rounded bg-gray-50">
          <span className="font-semibold text-sm">
            Product Configuration Type:
          </span>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="radio"
              name="productType"
              value="CUSTOMIZABLE"
              checked={formData.productType === 'CUSTOMIZABLE'}
              onChange={(e) =>
                setFormData({ ...formData, productType: e.target.value })
              }
            />
            <span>Customizable Footwear</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="radio"
              name="productType"
              value="STANDARD"
              checked={formData.productType === 'STANDARD'}
              onChange={(e) =>
                setFormData({ ...formData, productType: e.target.value })
              }
            />
            <span>Standard Footwear (Fixed)</span>
          </label>
        </div>

        {/* Basic Fields */}
        <div className="grid grid-cols-2 gap-4">
          <input
            type="text"
            placeholder="Product Code (e.g., MC-05)"
            value={formData.productCode}
            required
            onChange={(e) =>
              setFormData({ ...formData, productCode: e.target.value })
            }
            className="border p-2 rounded"
          />
          <input
            type="text"
            placeholder="Product Name"
            value={formData.name}
            required
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            className="border p-2 rounded"
          />
        </div>

        <textarea
          placeholder="Product Description"
          rows={3}
          value={formData.description}
          onChange={(e) =>
            setFormData({ ...formData, description: e.target.value })
          }
          className="w-full border p-2 rounded"
        />

        <div className="grid grid-cols-2 gap-4">
          <select
            value={formData.category}
            onChange={(e) =>
              setFormData({ ...formData, category: e.target.value })
            }
            className="border p-2 rounded"
          >
            <option value="men">Men</option>
            <option value="women">Women</option>
            <option value="child">Child</option>
            <option value="unisex">Unisex</option>
          </select>

          <input
            type="number"
            placeholder="Price ($)"
            value={formData.basePrice}
            required
            onChange={(e) =>
              setFormData({ ...formData, basePrice: e.target.value })
            }
            className="border p-2 rounded"
          />
        </div>

        {/* Images */}
        <div className="border p-4">
          <label className="block text-sm font-medium mb-1">Main Image</label>
          <input
            type="file"
            accept="image/*"
            onChange={handleMainImageUpload}
            disabled={isUploading}
            className="w-full cursor-pointer"
          />
          {formData.mainImage && (
            <div className="relative w-20 h-20 mt-2 flex">
              <img
                src={formData.mainImage}
                alt="Main Preview"
                className="h-20 w-20 object-cover border rounded-lg"
              />
              <button
                type="button"
                onClick={handleRemoveMainImage}
                className="absolute top-0 -right-2 bg-red-600 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs font-bold shadow hover:bg-red-700"
              >
                <IoClose size={20} />
              </button>
            </div>
          )}
        </div>

        <div className="border p-4">
          <label className="block text-sm font-medium mb-1">
            Gallery Images
          </label>
          <input
            type="file"
            accept="image/*"
            multiple
            onChange={handleGalleryImagesUpload}
            disabled={isUploading}
            className="w-full cursor-pointer"
          />
          <div className="flex gap-2 mt-2">
            {formData.galleryImages.map((url, idx) => (
              <div key={idx} className="relative w-16 h-16 inline-block">
                <img
                  src={url}
                  alt={`Gallery Preview ${idx}`}
                  className="h-16 w-16 object-cover rounded-lg border"
                />
                <button
                  type="button"
                  onClick={() => handleRemoveGalleryImage(idx)}
                  className="absolute top-0 -right-2 bg-red-600 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs font-bold shadow hover:bg-red-700"
                >
                  <IoClose size={20} />
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* CONDITIONAL UI: STANDARD PRODUCT (Fixed Stock Entry) */}
        {formData.productType === 'STANDARD' && (
          <div className="border p-4 rounded bg-gray-50 space-y-4">
            <h3 className="font-semibold text-sm">
              Standard Size & Stock Variants
            </h3>
            {formData.standardStock.map((row, idx) => (
              <div key={idx} className="flex gap-4 items-center">
                <input
                  type="text"
                  placeholder="Size (e.g. 27 or 27/28)"
                  value={row.size}
                  onChange={(e) =>
                    handleStockChange(idx, 'size', e.target.value)
                  }
                  className="border p-2 rounded flex-1 bg-white"
                  required
                />
                <input
                  type="number"
                  placeholder="Stock Quantity"
                  value={row.stockQuantity}
                  onChange={(e) =>
                    handleStockChange(idx, 'stockQuantity', e.target.value)
                  }
                  className="border p-2 rounded flex-1 bg-white"
                  required
                />
                {formData.standardStock.length > 1 && (
                  <button
                    type="button"
                    onClick={() => handleRemoveStockRow(idx)}
                    className="text-red-600 hover:text-red-800 text-sm font-semibold"
                  >
                    Remove
                  </button>
                )}
              </div>
            ))}
            <button
              type="button"
              onClick={handleAddStockRow}
              className="text-sm text-blue-600 hover:underline font-semibold"
            >
              + Add Size Variant
            </button>
          </div>
        )}

        {/* CONDITIONAL UI: CUSTOMIZABLE PRODUCT (Component Selection) */}
        {formData.productType === 'CUSTOMIZABLE' && (
          <>
            <label className="flex items-center gap-2 cursor-pointer border p-3 rounded">
              <input
                type="checkbox"
                checked={formData.hasThumb}
                onChange={(e) =>
                  setFormData({ ...formData, hasThumb: e.target.checked })
                }
              />
              <span>Requires Thumb Attachment?</span>
            </label>

            <div className="border p-4 rounded">
              <h3 className="font-semibold mb-2">
                Attach Allowed Bases (Soles)
              </h3>
              <div className="grid grid-cols-2 gap-2">
                {availableBases.map((base) => (
                  <label
                    key={base._id}
                    className="flex items-center gap-2 cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      checked={formData.allowedBases.includes(base._id)}
                      onChange={() =>
                        handleCheckboxSelect('allowedBases', base._id)
                      }
                    />
                    <span>{base.name}</span>
                  </label>
                ))}
              </div>
            </div>

            <div className="border p-4 rounded">
              <h3 className="font-semibold mb-2">Attach Allowed Straps</h3>
              <div className="grid grid-cols-2 gap-2">
                {availableStraps.map((strap) => (
                  <label
                    key={strap._id}
                    className="flex items-center gap-2 cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      checked={formData.allowedStraps.includes(strap._id)}
                      onChange={() =>
                        handleCheckboxSelect('allowedStraps', strap._id)
                      }
                    />
                    <span>{strap.name}</span>
                  </label>
                ))}
              </div>
            </div>

            {formData.hasThumb && (
              <div className="border p-4 rounded bg-amber-50">
                <h3 className="font-semibold mb-2">Attach Allowed Thumbs</h3>
                <div className="grid grid-cols-2 gap-2">
                  {availableThumbs.map((thumb) => (
                    <label
                      key={thumb._id}
                      className="flex items-center gap-2 cursor-pointer"
                    >
                      <input
                        type="checkbox"
                        checked={formData.allowedThumbs.includes(thumb._id)}
                        onChange={() =>
                          handleCheckboxSelect('allowedThumbs', thumb._id)
                        }
                      />
                      <span>{thumb.name}</span>
                    </label>
                  ))}
                </div>
              </div>
            )}
          </>
        )}

        <button
          type="submit"
          className="w-full bg-black text-white py-3 rounded font-bold hover:bg-gray-800"
        >
          Publish Product Configuration
        </button>
      </form>
    </div>
  );
}
