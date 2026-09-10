'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import { fetchComponents, updateComponent } from '@/app/lib/api';
import { uploadSingleImage } from '@/app/lib/upload';
import { IoClose } from 'react-icons/io5';

const createEmptyColor = () => ({
  colorName: '',
  image: '',
  variants: [{ size: '', stockQuantity: 0 }],
});

const normalizeColors = (colors = []) =>
  colors.map((color) => ({
    _id: color._id,
    colorName: color.colorName || '',
    image: color.image || '',
    variants: (color.variants || []).map((variant) => ({
      _id: variant._id,
      size: String(variant.size ?? ''),
      stockQuantity: Number(variant.stockQuantity ?? 0),
    })),
  }));

export default function ComponentEditForm({ type, id }) {
  const router = useRouter();
  const [component, setComponent] = useState(null);
  const [name, setName] = useState('');
  const [colors, setColors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingKey, setUploadingKey] = useState(null);

  const label = type.charAt(0).toUpperCase() + type.slice(1);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      setLoading(true);
      try {
        const response = await fetchComponents(type);
        const found = (response?.data || []).find(
          (item) => String(item._id) === String(id),
        );

        if (cancelled) return;

        if (!found) {
          toast.error(`${label} not found`);
          router.replace(`/dashboard/components/${type}`);
          return;
        }

        setComponent(found);
        setName(found.name || '');
        setColors(normalizeColors(found.colors));
      } catch (error) {
        console.error(`Failed to load ${type}:`, error);
        toast.error(`Failed to load ${type}`);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    load();
    return () => {
      cancelled = true;
    };
  }, [type, id, label, router]);

  const updateColor = (colorIndex, field, value) => {
    setColors((prev) =>
      prev.map((color, index) =>
        index === colorIndex ? { ...color, [field]: value } : color,
      ),
    );
  };

  const updateVariant = (colorIndex, variantIndex, field, value) => {
    setColors((prev) =>
      prev.map((color, index) => {
        if (index !== colorIndex) return color;
        return {
          ...color,
          variants: color.variants.map((variant, vIndex) =>
            vIndex === variantIndex
              ? {
                  ...variant,
                  [field]:
                    field === 'stockQuantity'
                      ? Math.max(0, Number(value) || 0)
                      : value,
                }
              : variant,
          ),
        };
      }),
    );
  };

  const addColor = () => setColors((prev) => [...prev, createEmptyColor()]);

  const removeColor = (colorIndex) => {
    if (colors.length === 1) {
      toast.error('At least one color is required');
      return;
    }
    setColors((prev) => prev.filter((_, index) => index !== colorIndex));
  };

  const addVariant = (colorIndex) => {
    setColors((prev) =>
      prev.map((color, index) =>
        index === colorIndex
          ? {
              ...color,
              variants: [
                ...color.variants,
                { size: '', stockQuantity: 0 },
              ],
            }
          : color,
      ),
    );
  };

  const removeVariant = (colorIndex, variantIndex) => {
    setColors((prev) =>
      prev.map((color, index) => {
        if (index !== colorIndex) return color;
        if (color.variants.length === 1) {
          toast.error('At least one size variant is required');
          return color;
        }
        return {
          ...color,
          variants: color.variants.filter((_, vIndex) => vIndex !== variantIndex),
        };
      }),
    );
  };

  const handleImageUpload = async (colorIndex, file) => {
    if (!file) return;
    const key = `${colorIndex}`;
    try {
      setUploadingKey(key);
      const imageUrl = await uploadSingleImage(file);
      updateColor(colorIndex, 'image', imageUrl?.url || imageUrl || '');
      toast.success('Image uploaded');
    } catch (error) {
      console.error(error);
      toast.error(error?.response?.data?.message || 'Image upload failed');
    } finally {
      setUploadingKey(null);
    }
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!name.trim()) {
      toast.error(`${label} name is required`);
      return;
    }

    for (const color of colors) {
      if (!color.colorName.trim()) {
        toast.error('Every color must have a color name');
        return;
      }
      if (!color.image) {
        toast.error(`Please upload image for ${color.colorName}`);
        return;
      }
      if (!color.variants.length) {
        toast.error(`${color.colorName} needs at least one size`);
        return;
      }
      if (color.variants.some((variant) => !String(variant.size).trim())) {
        toast.error(`Every ${color.colorName} variant needs a size`);
        return;
      }
    }

    try {
      setSaving(true);
      const response = await updateComponent(type, id, {
        name: name.trim(),
        colors,
      });

      if (!response?.success) {
        throw new Error(response?.message || `Failed to update ${label}`);
      }

      setComponent(response.data);
      setName(response.data?.name || name);
      setColors(normalizeColors(response.data?.colors));
      toast.success(`${label} updated successfully`);
    } catch (error) {
      console.error(`Failed to update ${type}:`, error);
      toast.error(
        error?.response?.data?.message ||
          error?.message ||
          `Failed to update ${label}`,
      );
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="p-8 text-center text-slate-500">Loading {type}...</div>;
  }

  if (!component) return null;

  return (
    <div className="mx-auto max-w-6xl rounded-xl bg-white p-6 shadow dark:bg-neutral-900">
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
            Edit {label}
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Update name, colors, images, sizes and stock for this {type}.
          </p>
        </div>
        <button
          type="button"
          onClick={() => router.push(`/dashboard/components/${type}`)}
          className="rounded-md border px-4 py-2 text-sm font-medium hover:bg-slate-50 dark:hover:bg-neutral-800"
        >
          Back to {label}s
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label className="mb-1 block text-sm font-medium">{label} Name</label>
          <input
            value={name}
            onChange={(event) => setName(event.target.value)}
            className="w-full rounded-md border p-3 outline-none focus:ring-2 focus:ring-blue-500"
            placeholder={`Enter ${type} name`}
            required
          />
        </div>

        {colors.map((color, colorIndex) => (
          <section
            key={color._id || `new-${colorIndex}`}
            className="rounded-xl border bg-slate-50 p-5 dark:bg-neutral-800"
          >
            <div className="mb-4 flex items-center justify-between">
              <h2 className="font-semibold">Color #{colorIndex + 1}</h2>
              <button
                type="button"
                onClick={() => removeColor(colorIndex)}
                className="text-sm font-medium text-red-600 hover:underline"
              >
                Remove Color
              </button>
            </div>

            <div className="grid gap-5 md:grid-cols-[1fr_280px]">
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-600">
                  Color Name
                </label>
                <input
                  value={color.colorName}
                  onChange={(event) =>
                    updateColor(colorIndex, 'colorName', event.target.value)
                  }
                  className="w-full rounded-md border bg-white p-3"
                  placeholder="e.g. Hot Pink"
                  required
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-medium text-slate-600">
                  Color Image
                </label>
                <input
                  type="file"
                  accept="image/*"
                  disabled={uploadingKey === String(colorIndex)}
                  onChange={(event) =>
                    handleImageUpload(colorIndex, event.target.files?.[0])
                  }
                  className="w-full rounded-md border bg-white p-2 text-sm"
                />
                {color.image && (
                  <div className="relative mt-3 h-28 w-28 overflow-hidden rounded-lg border bg-white">
                    <img
                      src={color.image}
                      alt={color.colorName || 'Color'}
                      className="h-full w-full object-contain"
                    />
                    <button
                      type="button"
                      onClick={() => updateColor(colorIndex, 'image', '')}
                      className="absolute right-1 top-1 flex h-6 w-6 items-center justify-center rounded-full bg-red-600 text-white"
                      aria-label="Remove image"
                    >
                      <IoClose size={16} />
                    </button>
                  </div>
                )}
              </div>
            </div>

            <div className="mt-6 border-t pt-5">
              <div className="mb-3 flex items-center justify-between">
                <h3 className="text-sm font-semibold">Size & Stock Variants</h3>
                <button
                  type="button"
                  onClick={() => addVariant(colorIndex)}
                  className="text-sm font-semibold text-blue-600 hover:underline"
                >
                  + Add Size
                </button>
              </div>

              <div className="space-y-3">
                {color.variants.map((variant, variantIndex) => (
                  <div
                    key={variant._id || `${colorIndex}-${variantIndex}`}
                    className="grid gap-3 sm:grid-cols-[1fr_1fr_auto]"
                  >
                    <input
                      value={variant.size}
                      onChange={(event) =>
                        updateVariant(
                          colorIndex,
                          variantIndex,
                          'size',
                          event.target.value,
                        )
                      }
                      placeholder="Size (e.g. 35)"
                      className="rounded-md border bg-white p-3"
                      required
                    />
                    <input
                      type="number"
                      min="0"
                      value={variant.stockQuantity}
                      onChange={(event) =>
                        updateVariant(
                          colorIndex,
                          variantIndex,
                          'stockQuantity',
                          event.target.value,
                        )
                      }
                      placeholder="Stock Quantity"
                      className="rounded-md border bg-white p-3"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => removeVariant(colorIndex, variantIndex)}
                      className="rounded-md border border-red-200 px-4 text-sm font-medium text-red-600 hover:bg-red-50"
                    >
                      Remove
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </section>
        ))}

        <button
          type="button"
          onClick={addColor}
          className="w-full rounded-lg border border-dashed border-slate-400 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50"
        >
          + Add New Color
        </button>

        <div className="flex justify-end gap-3 border-t pt-5">
          <button
            type="button"
            onClick={() => router.push(`/dashboard/components/${type}`)}
            className="rounded-md border px-5 py-2.5 text-sm font-medium"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={saving || uploadingKey !== null}
            className="rounded-md bg-black px-6 py-2.5 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"
          >
            {saving ? 'Saving...' : `Update ${label}`}
          </button>
        </div>
      </form>
    </div>
  );
}
