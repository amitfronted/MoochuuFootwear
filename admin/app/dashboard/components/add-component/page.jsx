'use client';
import { createComponent } from '@/app/lib/api';
import { uploadSingleImage } from '@/app/lib/upload';
import { useState } from 'react';
import { IoClose } from 'react-icons/io5';
import toast from 'react-hot-toast';

const AddComponentPage = () => {
  const [componentType, setComponentType] = useState('base'); // 'base' | 'strap' | 'thumb'
  const [name, setName] = useState('');
  const [colors, setColors] = useState([
    {
      colorName: '',
      image: '',
      variants: [{ size: '', stockQuantity: 0 }],
    },
  ]);
  const [loading, setLoading] = useState(false);
  const [uploadingIndex, setUploadingIndex] = useState(null);

  // Handle color & variant fields
  const handleColorChange = (index, field, value) => {
    const updated = [...colors];
    updated[index][field] = value;
    setColors(updated);
  };

  const handleVariantChange = (colorIndex, variantIndex, field, value) => {
    const updated = [...colors];
    if (field === 'size') {
      updated[colorIndex].variants[variantIndex][field] = String(value);
    } else if (field === 'stockQuantity') {
      updated[colorIndex].variants[variantIndex][field] = Number(value) || 0;
    }
    setColors(updated);
  };

  const addVariantRow = (colorIndex) => {
    const updated = [...colors];
    const lastSize = updated[colorIndex].variants.slice(-1)[0]?.size || 35;
    updated[colorIndex].variants.push({
      size: Number(lastSize) + 1,
      stockQuantity: 0,
    });
    setColors(updated);
  };

  const removeVariantRow = (colorIndex, variantIndex) => {
    const updated = [...colors];
    if (updated[colorIndex].variants.length > 1) {
      updated[colorIndex].variants.splice(variantIndex, 1);
      setColors(updated);
    }
  };

  const addColorBlock = () => {
    setColors([
      ...colors,
      { colorName: '', image: '', variants: [{ size: 35, stockQuantity: 0 }] },
    ]);
  };

  const removeColorBlock = (index) => {
    if (colors.length > 1) {
      setColors(colors.filter((_, i) => i !== index));
    }
  };

  // Upload Single Image to Backend/Cloudinary
  const handleImageUpload = async (colorIndex, file) => {
    if (!file) return;
    try {
      setUploadingIndex(colorIndex);
      const response = await uploadSingleImage(file);
      const imageUrl = response?.url || response; // Handles both object responses ({ url: "..." }) or plain string URLs

      const updatedColors = [...colors];
      updatedColors[colorIndex].image = imageUrl;
      setColors(updatedColors);
    } catch (err) {
      alert(err.response?.data?.message || 'Image upload failed');
    } finally {
      setUploadingIndex(null);
    }
  };

  // Clear image URL for a specific color block
  const handleRemoveColorImage = (colorIndex) => {
    const updatedColors = [...colors];
    updatedColors[colorIndex].image = '';
    setColors(updatedColors);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await createComponent(componentType, { name, colors });
      if (response?.success || response) {
        toast.success(
          `${componentType.toUpperCase()} component added successfully!`,
        );
        setName('');
        setColors([
          {
            colorName: '',
            image: '',
            variants: [{ size: 35, stockQuantity: 0 }],
          },
        ]);
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to create component');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6 bg-white shadow rounded-lg mt-8">
      <h1 className="text-2xl font-bold mb-6">Add Component Inventory</h1>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label className="block text-sm font-medium">Component Type</label>
          <select
            value={componentType}
            onChange={(e) => setComponentType(e.target.value)}
            className="w-full border p-2 rounded mt-1"
          >
            <option value="base">Base / Sole</option>
            <option value="strap">Strap</option>
            <option value="thumb">Thumb</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium">Component Name</label>
          <input
            type="text"
            required
            placeholder="e.g., EVA Rubber Sole"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full border p-2 rounded mt-1"
          />
        </div>

        {/* Dynamic Color Blocks */}
        {colors.map((color, cIdx) => (
          <div
            key={cIdx}
            className="border p-4 rounded bg-gray-50 space-y-4 relative"
          >
            <div className="flex justify-between items-center">
              <h3 className="font-semibold text-lg">Color #{cIdx + 1}</h3>
              {colors.length > 1 && (
                <button
                  type="button"
                  onClick={() => removeColorBlock(cIdx)}
                  className="text-red-500 text-sm font-semibold hover:underline"
                >
                  Remove Color
                </button>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  Color Name
                </label>
                <input
                  type="text"
                  placeholder="e.g., Matte Black"
                  value={color.colorName}
                  onChange={(e) =>
                    handleColorChange(cIdx, 'colorName', e.target.value)
                  }
                  className="w-full border p-2 rounded bg-white"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  Color Image
                </label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => handleImageUpload(cIdx, e.target.files[0])}
                  className="w-full border p-1 rounded bg-white"
                  disabled={uploadingIndex === cIdx}
                />
                {uploadingIndex === cIdx && (
                  <p className="text-xs text-blue-500 mt-1">
                    Uploading image...
                  </p>
                )}
                {color.image && (
                  <div className="relative w-16 h-16 mt-2 inline-block">
                    <img
                      src={color.image}
                      alt="Preview"
                      className="h-16 w-16 object-cover mt-2 rounded border"
                    />
                    <button
                      type="button"
                      onClick={() => handleRemoveColorImage(cIdx)}
                      className="absolute top-0 cursor-pointer -right-2 bg-red-600 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs font-bold shadow hover:bg-red-700"
                    >
                      <IoClose size={20} />
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Size & Stock Matrix */}
            <div className="space-y-2 pt-2 border-t">
              <h4 className="text-sm font-medium text-gray-700">
                Size & Stock Variants
              </h4>
              {color.variants.map((v, vIdx) => (
                <div key={vIdx} className="flex gap-4 items-center">
                  <div className="w-1/2">
                    <input
                      type="text"
                      placeholder="Size (e.g., 27 or 27/28)"
                      value={v.size}
                      onChange={(e) =>
                        handleVariantChange(cIdx, vIdx, 'size', e.target.value)
                      }
                      className="w-full border p-2 rounded bg-white"
                      required
                    />
                  </div>
                  <div className="w-1/2">
                    <input
                      type="number"
                      placeholder="Stock Quantity"
                      value={v.stockQuantity}
                      onChange={(e) =>
                        handleVariantChange(
                          cIdx,
                          vIdx,
                          'stockQuantity',
                          e.target.value,
                        )
                      }
                      className="w-full border p-2 rounded bg-white"
                      required
                    />
                  </div>
                  {color.variants.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeVariantRow(cIdx, vIdx)}
                      className="text-red-500 text-sm font-bold px-2"
                    >
                      ×
                    </button>
                  )}
                </div>
              ))}
              <button
                type="button"
                onClick={() => addVariantRow(cIdx)}
                className="text-sm text-blue-600 font-semibold mt-1 inline-block hover:underline"
              >
                + Add Another Size
              </button>
            </div>
          </div>
        ))}

        <button
          type="button"
          onClick={addColorBlock}
          className="w-full border border-dashed border-gray-400 py-2 rounded text-gray-600 font-medium hover:bg-gray-50"
        >
          + Add New Color Group
        </button>

        <button
          type="submit"
          disabled={loading || uploadingIndex !== null}
          className="w-full bg-black text-white py-3 rounded hover:bg-gray-800 transition disabled:bg-gray-400 font-semibold"
        >
          {loading ? 'Saving Component...' : 'Save Component'}
        </button>
      </form>
    </div>
  );
};

export default AddComponentPage;
