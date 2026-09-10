'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import toast from 'react-hot-toast';

import {
  fetchProductById,
  updateProduct,
  fetchComponents,
} from '../../../../lib/api';

const empty = {
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
  standardStock: [],
};

export default function EditProduct() {
  const { id } = useParams();
  const router = useRouter();

  const [f, setF] = useState(empty);

  const [bases, setBases] = useState([]);
  const [straps, setStraps] = useState([]);
  const [thumbs, setThumbs] = useState([]);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // -----------------------------
  // IMAGE STATES
  // -----------------------------

  const [mainImageFile, setMainImageFile] = useState(null);
  const [mainImagePreview, setMainImagePreview] = useState('');

  const [existingGallery, setExistingGallery] = useState([]);

  const [galleryFiles, setGalleryFiles] = useState([]);
  const [galleryPreviews, setGalleryPreviews] = useState([]);

  // -----------------------------
  // LOAD PRODUCT
  // -----------------------------

  useEffect(() => {
    if (!id) return;

    const loadProduct = async () => {
      try {
        const [p, b, s, t] = await Promise.all([
          fetchProductById(id),
          fetchComponents('base'),
          fetchComponents('strap'),
          fetchComponents('thumb'),
        ]);

        const x = p.data;

        setF({
          ...empty,
          ...x,

          basePrice: x.basePrice ?? '',

          allowedBases: (x.allowedBases || []).map((v) => v._id || v),

          allowedStraps: (x.allowedStraps || []).map((v) => v._id || v),

          allowedThumbs: (x.allowedThumbs || []).map((v) => v._id || v),

          standardStock: x.standardStock || [],

          galleryImages: x.galleryImages || [],
        });

        // Main image
        setMainImagePreview(x.mainImage || '');

        // Existing gallery
        setExistingGallery(x.galleryImages || []);

        setBases(b.data || []);
        setStraps(s.data || []);
        setThumbs(t.data || []);
      } catch (error) {
        console.error(error);

        toast.error(error.response?.data?.message || 'Failed to load product');
      } finally {
        setLoading(false);
      }
    };

    loadProduct();
  }, [id]);

  // -----------------------------
  // TOGGLE COMPONENT
  // -----------------------------

  const toggle = (key, value) => {
    setF((prev) => ({
      ...prev,

      [key]: prev[key].includes(value)
        ? prev[key].filter((item) => item !== value)
        : [...prev[key], value],
    }));
  };

  // -----------------------------
  // MAIN IMAGE
  // -----------------------------

  const handleMainImageChange = (e) => {
    const file = e.target.files?.[0];

    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file');
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      toast.error('Main image must be less than 2MB');
      return;
    }

    setMainImageFile(file);

    const preview = URL.createObjectURL(file);

    setMainImagePreview(preview);
  };

  // -----------------------------
  // ADD GALLERY IMAGES
  // -----------------------------

  const handleGalleryChange = (e) => {
    const files = Array.from(e.target.files || []);

    if (!files.length) return;

    const validFiles = [];

    for (const file of files) {
      if (!file.type.startsWith('image/')) {
        toast.error(`${file.name} is not an image`);
        continue;
      }

      if (file.size > 2 * 1024 * 1024) {
        toast.error(`${file.name} is larger than 2MB`);
        continue;
      }

      validFiles.push(file);
    }

    if (!validFiles.length) {
      e.target.value = '';
      return;
    }

    setGalleryFiles((prev) => [...prev, ...validFiles]);

    setGalleryPreviews((prev) => [
      ...prev,
      ...validFiles.map((file) => URL.createObjectURL(file)),
    ]);

    // Allow selecting same file again
    e.target.value = '';
  };

  // -----------------------------
  // REMOVE EXISTING GALLERY
  // -----------------------------

  const removeExistingGallery = (index) => {
    setExistingGallery((prev) => prev.filter((_, i) => i !== index));
  };

  // -----------------------------
  // REMOVE NEW GALLERY
  // -----------------------------

  const removeNewGallery = (index) => {
    setGalleryFiles((prev) => prev.filter((_, i) => i !== index));

    setGalleryPreviews((prev) => {
      const url = prev[index];

      if (url) {
        URL.revokeObjectURL(url);
      }

      return prev.filter((_, i) => i !== index);
    });
  };

  // -----------------------------
  // SUBMIT
  // -----------------------------

  const submit = async (e) => {
    e.preventDefault();

    if (!f.productCode.trim()) {
      toast.error('Product code is required');
      return;
    }

    if (!f.name.trim()) {
      toast.error('Product name is required');
      return;
    }

    if (!f.basePrice || Number(f.basePrice) < 0) {
      toast.error('Please enter a valid price');
      return;
    }

    setSaving(true);

    try {
      const formData = new FormData();

      // -----------------------------
      // BASIC DATA
      // -----------------------------

      formData.append('productCode', f.productCode);

      formData.append('name', f.name);

      formData.append('description', f.description || '');

      formData.append('category', f.category);

      formData.append('productType', f.productType);

      formData.append('basePrice', String(Number(f.basePrice)));

      formData.append(
        'hasThumb',
        String(f.productType === 'STANDARD' ? false : f.hasThumb),
      );

      // -----------------------------
      // MAIN IMAGE
      // -----------------------------

      if (mainImageFile) {
        formData.append('mainImageFile', mainImageFile);
      }

      // -----------------------------
      // EXISTING GALLERY
      // -----------------------------

      existingGallery.forEach((image) => {
        formData.append('existingGalleryImages', image);
      });

      // -----------------------------
      // NEW GALLERY
      // -----------------------------

      galleryFiles.forEach((file) => {
        formData.append('galleryImages', file);
      });

      // -----------------------------
      // CUSTOMIZABLE
      // -----------------------------

      if (f.productType === 'CUSTOMIZABLE') {
        f.allowedBases.forEach((componentId) => {
          formData.append('allowedBases', componentId);
        });

        f.allowedStraps.forEach((componentId) => {
          formData.append('allowedStraps', componentId);
        });

        f.allowedThumbs.forEach((componentId) => {
          formData.append('allowedThumbs', componentId);
        });
      }

      // -----------------------------
      // STANDARD
      // -----------------------------

      if (f.productType === 'STANDARD') {
        formData.append('standardStock', JSON.stringify(f.standardStock));
      }

      // -----------------------------
      // API
      // -----------------------------

      const response = await updateProduct(id, formData);

      if (response.success) {
        toast.success(response.message || 'Product updated successfully');

        router.push('/dashboard/products');
      } else {
        toast.error(response.message || 'Update failed');
      }
    } catch (error) {
      console.error('UPDATE PRODUCT ERROR:', error);

      toast.error(error.response?.data?.message || 'Update failed');
    } finally {
      setSaving(false);
    }
  };

  // -----------------------------
  // LOADING
  // -----------------------------

  if (loading) {
    return <div className="p-6">Loading product...</div>;
  }

  // -----------------------------
  // PAGE
  // -----------------------------

  return (
    <form
      onSubmit={submit}
      className="
        max-w-5xl
        mx-auto
        bg-white
        border
        rounded-xl
        p-6
        space-y-6
      "
    >
      {/* -------------------------------- */}
      {/* HEADER */}
      {/* -------------------------------- */}

      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Update Product</h1>

        <button
          type="button"
          onClick={() => router.back()}
          className="
            border
            px-4
            py-2
            rounded
            hover:bg-gray-100
          "
        >
          Back
        </button>
      </div>

      {/* -------------------------------- */}
      {/* BASIC INFORMATION */}
      {/* -------------------------------- */}

      <div className="grid md:grid-cols-2 gap-4">
        <input
          className="border p-2 rounded"
          required
          value={f.productCode}
          onChange={(e) =>
            setF({
              ...f,
              productCode: e.target.value,
            })
          }
          placeholder="Product Code"
        />

        <input
          className="border p-2 rounded"
          required
          value={f.name}
          onChange={(e) =>
            setF({
              ...f,
              name: e.target.value,
            })
          }
          placeholder="Name"
        />

        <select
          className="border p-2 rounded"
          value={f.category}
          onChange={(e) =>
            setF({
              ...f,
              category: e.target.value,
            })
          }
        >
          <option value="men">Men</option>

          <option value="women">Women</option>

          <option value="child">Child</option>

          <option value="unisex">Unisex</option>
        </select>

        <select
          className="border p-2 rounded"
          value={f.productType}
          onChange={(e) =>
            setF({
              ...f,
              productType: e.target.value,
            })
          }
        >
          <option value="CUSTOMIZABLE">CUSTOMIZABLE</option>

          <option value="STANDARD">STANDARD</option>
        </select>

        <input
          className="border p-2 rounded"
          type="number"
          min="0"
          required
          value={f.basePrice}
          onChange={(e) =>
            setF({
              ...f,
              basePrice: e.target.value,
            })
          }
          placeholder="Price"
        />
      </div>

      {/* -------------------------------- */}
      {/* DESCRIPTION */}
      {/* -------------------------------- */}

      <textarea
        className="border p-2 rounded w-full"
        rows="4"
        value={f.description || ''}
        onChange={(e) =>
          setF({
            ...f,
            description: e.target.value,
          })
        }
        placeholder="Description"
      />

      {/* ================================= */}
      {/* MAIN IMAGE */}
      {/* ================================= */}

      <div className="border rounded-xl p-5">
        <h2 className="text-lg font-bold mb-4">Main Product Image</h2>

        {mainImagePreview && (
          <div className="mb-4">
            <div className="relative w-48 h-48 border rounded-lg overflow-hidden bg-gray-50">
              <img
                src={mainImagePreview}
                alt="Main product"
                className="
                  w-full
                  h-full
                  object-contain
                "
              />

              {mainImageFile && (
                <span
                  className="
                    absolute
                    bottom-2
                    left-2
                    bg-black
                    text-white
                    text-xs
                    px-2
                    py-1
                    rounded
                  "
                >
                  New Image
                </span>
              )}
            </div>
          </div>
        )}

        <input
          type="file"
          accept="image/png,image/jpeg,image/webp"
          onChange={handleMainImageChange}
          className="
            w-full
            border
            rounded
            p-2
          "
        />

        <p className="text-xs text-gray-500 mt-2">
          Leave empty to keep the current main image. Maximum 2MB.
        </p>
      </div>

      {/* ================================= */}
      {/* GALLERY IMAGES */}
      {/* ================================= */}

      <div className="border rounded-xl p-5">
        <h2 className="text-lg font-bold mb-4">Gallery Images</h2>

        {/* EXISTING IMAGES */}

        {existingGallery.length > 0 && (
          <div className="mb-6">
            <h3 className="font-semibold mb-3">Existing Images</h3>

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
              {existingGallery.map((image, index) => (
                <div
                  key={`${image}-${index}`}
                  className="
                      relative
                      border
                      rounded-lg
                      overflow-hidden
                      bg-gray-50
                    "
                >
                  <img
                    src={image}
                    alt={`Gallery ${index + 1}`}
                    className="
                        w-full
                        h-36
                        object-contain
                      "
                  />

                  <button
                    type="button"
                    onClick={() => removeExistingGallery(index)}
                    className="
                        absolute
                        top-2
                        right-2
                        w-7
                        h-7
                        rounded-full
                        bg-red-600
                        text-white
                        flex
                        items-center
                        justify-center
                        font-bold
                        hover:bg-red-700
                      "
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>

            <p className="text-xs text-gray-500 mt-2">
              Click × to remove an existing image.
            </p>
          </div>
        )}

        {/* NEW IMAGES */}

        {galleryPreviews.length > 0 && (
          <div className="mb-6">
            <h3 className="font-semibold mb-3">New Images</h3>

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
              {galleryPreviews.map((image, index) => (
                <div
                  key={`${image}-${index}`}
                  className="
                      relative
                      border
                      rounded-lg
                      overflow-hidden
                      bg-gray-50
                    "
                >
                  <img
                    src={image}
                    alt={`New gallery ${index + 1}`}
                    className="
                        w-full
                        h-36
                        object-contain
                      "
                  />

                  <span
                    className="
                        absolute
                        bottom-2
                        left-2
                        bg-black
                        text-white
                        text-xs
                        px-2
                        py-1
                        rounded
                      "
                  >
                    New
                  </span>

                  <button
                    type="button"
                    onClick={() => removeNewGallery(index)}
                    className="
                        absolute
                        top-2
                        right-2
                        w-7
                        h-7
                        rounded-full
                        bg-red-600
                        text-white
                        flex
                        items-center
                        justify-center
                        font-bold
                        hover:bg-red-700
                      "
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* UPLOAD */}

        <div>
          <label className="block text-sm font-medium mb-2">
            Add Gallery Images
          </label>

          <input
            type="file"
            multiple
            accept="image/png,image/jpeg,image/webp"
            onChange={handleGalleryChange}
            className="
              w-full
              border
              rounded
              p-2
            "
          />

          <p className="text-xs text-gray-500 mt-2">
            Select multiple images. Maximum 2MB per image.
          </p>
        </div>
      </div>

      {/* ================================= */}
      {/* CUSTOMIZABLE */}
      {/* ================================= */}

      {f.productType === 'CUSTOMIZABLE' ? (
        <>
          <label className="flex gap-2 items-center">
            <input
              type="checkbox"
              checked={f.hasThumb}
              onChange={(e) =>
                setF({
                  ...f,
                  hasThumb: e.target.checked,
                })
              }
            />

            <span>Has Thumb</span>
          </label>

          {[
            ['allowedBases', 'Bases', bases],
            ['allowedStraps', 'Straps', straps],
            ['allowedThumbs', 'Thumbs', thumbs],
          ].map(([key, label, list]) => (
            <div
              key={key}
              className="
                  border
                  rounded
                  p-4
                "
            >
              <h3 className="font-bold mb-3">Allowed {label}</h3>

              <div className="grid md:grid-cols-2 gap-2">
                {list.map((item) => (
                  <label
                    key={item._id}
                    className="
                        flex
                        gap-2
                        items-center
                      "
                  >
                    <input
                      type="checkbox"
                      checked={f[key].includes(item._id)}
                      onChange={() => toggle(key, item._id)}
                    />

                    {item.name}
                  </label>
                ))}
              </div>
            </div>
          ))}
        </>
      ) : (
        /* ================================= */
        /* STANDARD STOCK */
        /* ================================= */

        <div className="border rounded p-4">
          <h3 className="font-bold mb-3">Standard Stock</h3>

          {f.standardStock.map((item, index) => (
            <div
              className="
                  flex
                  gap-2
                  mb-2
                "
              key={index}
            >
              <input
                className="
                    border
                    p-2
                    rounded
                    flex-1
                  "
                placeholder="Size"
                value={item.size}
                onChange={(e) =>
                  setF((prev) => ({
                    ...prev,

                    standardStock: prev.standardStock.map((row, i) =>
                      i === index
                        ? {
                            ...row,
                            size: e.target.value,
                          }
                        : row,
                    ),
                  }))
                }
              />

              <input
                className="
                    border
                    p-2
                    rounded
                    w-32
                  "
                type="number"
                min="0"
                value={item.stockQuantity}
                onChange={(e) =>
                  setF((prev) => ({
                    ...prev,

                    standardStock: prev.standardStock.map((row, i) =>
                      i === index
                        ? {
                            ...row,
                            stockQuantity: Number(e.target.value),
                          }
                        : row,
                    ),
                  }))
                }
              />

              <button
                type="button"
                onClick={() =>
                  setF((prev) => ({
                    ...prev,

                    standardStock: prev.standardStock.filter(
                      (_, i) => i !== index,
                    ),
                  }))
                }
                className="
                    px-3
                    border
                    border-red-300
                    text-red-600
                    rounded
                  "
              >
                ×
              </button>
            </div>
          ))}

          <button
            type="button"
            className="
              border
              px-3
              py-1
              rounded
              mt-2
            "
            onClick={() =>
              setF((prev) => ({
                ...prev,

                standardStock: [
                  ...prev.standardStock,

                  {
                    size: '',
                    stockQuantity: 0,
                  },
                ],
              }))
            }
          >
            + Size
          </button>
        </div>
      )}

      {/* ================================= */}
      {/* UPDATE */}
      {/* ================================= */}

      <button
        type="submit"
        disabled={saving}
        className="
          w-full
          bg-black
          text-white
          py-3
          rounded
          font-bold
          disabled:opacity-50
          disabled:cursor-not-allowed
        "
      >
        {saving ? 'Updating...' : 'Update Product'}
      </button>
    </form>
  );
}
