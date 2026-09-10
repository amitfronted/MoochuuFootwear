'use client';

import { useEffect, useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import toast from 'react-hot-toast';

import {
  fetchProductById,
  updateComponentStock,
  updateStandardProductStock,
} from '../../../lib/api';
import StockUpdateModal from '@/app/components/StockUpdateModal';

export default function ProductStock() {
  const params = useParams();
  const router = useRouter();

  // IMPORTANT:
  // Folder is [id], therefore use params.id
  const productId = params?.id;

  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState('');
  const [stockLoading, setStockLoading] = useState(false);

  const [stockModal, setStockModal] = useState({
    open: false,
    type: '',
    component: null,
    color: null,
    variant: null,
  });

  // CUSTOMIZABLE filters
  const [componentType, setComponentType] = useState('base');

  const [selectedColor, setSelectedColor] = useState('all');

  const [selectedSize, setSelectedSize] = useState('all');

  const [colorSort, setColorSort] = useState('asc');

  const [sizeSort, setSizeSort] = useState('asc');

  // ---------------------------------------------
  // LOAD PRODUCT
  // ---------------------------------------------

  const loadProduct = async () => {
    if (!productId) return;

    setLoading(true);

    try {
      const response = await fetchProductById(productId);

      if (!response?.success) {
        throw new Error(response?.message || 'Failed to load product');
      }

      const productData = response?.data?.product || response?.data;

      setProduct(productData || null);
    } catch (error) {
      console.error(error);

      toast.error(
        error?.response?.data?.message ||
          error?.message ||
          'Failed to load product',
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProduct();
  }, [productId]);

  // ---------------------------------------------
  // RESET FILTERS WHEN COMPONENT CHANGES
  // ---------------------------------------------

  useEffect(() => {
    setSelectedColor('all');
    setSelectedSize('all');
  }, [componentType]);

  // ---------------------------------------------
  // COMPONENT LIST
  // ---------------------------------------------

  const components = useMemo(() => {
    if (!product) return [];

    if (componentType === 'base') {
      return product.allowedBases || [];
    }

    if (componentType === 'strap') {
      return product.allowedStraps || [];
    }

    if (componentType === 'thumb') {
      return product.allowedThumbs || [];
    }

    return [];
  }, [product, componentType]);

  // ---------------------------------------------
  // ALL COLORS
  // ---------------------------------------------

  const colors = useMemo(() => {
    const map = new Map();

    components.forEach((component) => {
      (component.colors || []).forEach((color) => {
        if (!map.has(color._id)) {
          map.set(color._id, color);
        }
      });
    });

    return Array.from(map.values()).sort((a, b) => {
      const result = String(a.colorName || '').localeCompare(
        String(b.colorName || ''),
      );

      return colorSort === 'asc' ? result : -result;
    });
  }, [components, colorSort]);

  // ---------------------------------------------
  // ALL SIZES
  // ---------------------------------------------

  const sizes = useMemo(() => {
    const values = new Set();

    components.forEach((component) => {
      (component.colors || []).forEach((color) => {
        (color.variants || []).forEach((variant) => {
          values.add(String(variant.size));
        });
      });
    });

    return Array.from(values).sort((a, b) => {
      const result = Number(a) - Number(b);

      return sizeSort === 'asc' ? result : -result;
    });
  }, [components, sizeSort]);

  // ---------------------------------------------
  // UPDATE CUSTOMIZABLE STOCK
  // ---------------------------------------------

  const openComponentStockModal = (component, color, variant) => {
    setStockModal({
      open: true,
      type: 'COMPONENT',
      component,
      color,
      variant,
    });
  };

  // ---------------------------------------------
  // UPDATE STANDARD STOCK
  // ---------------------------------------------

  const openStandardStockModal = (variant) => {
    setStockModal({
      open: true,
      type: 'STANDARD',
      component: null,
      color: null,
      variant,
    });
  };

  const closeStockModal = () => {
    if (stockLoading) return;

    setStockModal({
      open: false,
      type: '',
      component: null,
      color: null,
      variant: null,
    });
  };

  const confirmStockUpdate = async ({ quantityToAdd, reason }) => {
    const quantity = Number(quantityToAdd);

    if (!Number.isInteger(quantity) || quantity <= 0) {
      toast.error('Enter a valid stock quantity greater than 0.');
      return;
    }

    if (!stockModal.variant) {
      toast.error('Stock variant not selected.');
      return;
    }

    const isComponent = stockModal.type === 'COMPONENT';

    try {
      setStockLoading(true);

      let response;

      if (isComponent) {
        response = await updateComponentStock(
          componentType,
          stockModal.component._id,
          stockModal.color._id,
          stockModal.variant._id,
          {
            quantity,
            reason: reason || 'Stock received',
          },
        );
      } else {
        response = await updateStandardProductStock(
          productId,
          stockModal.variant._id,
          quantity,
          reason || 'Stock received',
        );
      }

      if (!response?.success) {
        toast.error(response?.message || 'Failed to update stock.');
        return;
      }

      const stockChange = response.stockChange;

      toast.success(`Stock updated. New stock: ${stockChange?.newStock ?? ''}`);

      closeStockModal();

      await loadProduct();
    } catch (error) {
      console.error('STOCK UPDATE ERROR:', error);

      toast.error(
        error?.response?.data?.message ||
          error?.message ||
          'Failed to update stock.',
      );
    } finally {
      setStockLoading(false);
    }
  };

  // ---------------------------------------------
  // FILTER COMPONENTS
  // ---------------------------------------------

  const filteredComponents = useMemo(() => {
    return components
      .map((component) => {
        const filteredColors = (component.colors || [])
          .filter((color) => {
            if (selectedColor === 'all') {
              return true;
            }

            return color._id === selectedColor;
          })
          .map((color) => {
            const filteredVariants = (color.variants || []).filter(
              (variant) => {
                if (selectedSize === 'all') {
                  return true;
                }

                return String(variant.size) === String(selectedSize);
              },
            );

            return {
              ...color,
              variants: filteredVariants,
            };
          })
          .filter((color) => color.variants.length > 0);

        return {
          ...component,
          colors: filteredColors,
        };
      })
      .filter((component) => component.colors.length > 0);
  }, [components, selectedColor, selectedSize]);

  // ---------------------------------------------
  // LOADING
  // ---------------------------------------------

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto p-6">Loading product stock...</div>
    );
  }

  // ---------------------------------------------
  // PRODUCT NOT FOUND
  // ---------------------------------------------

  if (!product) {
    return (
      <div className="max-w-7xl mx-auto p-6">
        <p className="text-red-600">Product not found.</p>

        <button
          onClick={() => router.push('/dashboard/products')}
          className="mt-4 bg-black text-white px-4 py-2 rounded-lg"
        >
          Back to Products
        </button>
      </div>
    );
  }

  const isStandard = product.productType === 'STANDARD';

  // ---------------------------------------------
  // STANDARD PRODUCT
  // ---------------------------------------------

  if (isStandard) {
    const standardStock = [...(product.standardStock || [])].sort((a, b) => {
      return Number(a.size) - Number(b.size);
    });

    return (
      <div className="max-w-7xl mx-auto space-y-5">
        {/* HEADER */}

        <div className="flex flex-wrap justify-between gap-3 items-center">
          <div>
            <h1 className="text-2xl font-bold">{product.name}</h1>

            <p className="text-sm text-slate-500">{product.productCode}</p>

            <p className="text-sm mt-1">Standard Product Stock</p>
          </div>

          <button
            onClick={() => router.push('/dashboard/products')}
            className="border px-4 py-2 rounded-lg"
          >
            Back
          </button>
        </div>

        {/* STANDARD STOCK */}

        <div className="bg-white border rounded-xl overflow-hidden">
          <div className="p-5 bg-slate-50 border-b">
            <h2 className="font-bold text-lg">Size Stock</h2>

            <p className="text-sm text-slate-500">
              Update stock quantity for each product size.
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="p-4 text-left">Size</th>

                  <th className="p-4 text-left">Stock Quantity</th>

                  <th className="p-4 text-left">Action</th>
                </tr>
              </thead>

              <tbody>
                {standardStock.length === 0 ? (
                  <tr>
                    <td colSpan="3" className="p-8 text-center text-slate-500">
                      No standard stock variants found.
                    </td>
                  </tr>
                ) : (
                  standardStock.map((variant) => {
                    const key = `standard-${variant._id}`;

                    return (
                      <tr key={variant._id} className="border-b last:border-0">
                        <td className="p-4 font-medium">{variant.size}</td>

                        <td className="p-4">
                          <span
                            className={
                              Number(variant.stockQuantity) === 0
                                ? 'text-red-600 font-semibold'
                                : ''
                            }
                          >
                            {variant.stockQuantity}
                          </span>
                        </td>

                        <td className="p-4">
                          <button
                            disabled={saving === key}
                            onClick={() => openStandardStockModal(variant)}
                            className="bg-black text-white px-4 py-2 rounded-lg text-xs disabled:opacity-50"
                          >
                            {saving === key ? 'Updating...' : 'Update Stock'}
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  }

  // ---------------------------------------------
  // CUSTOMIZABLE PRODUCT
  // ---------------------------------------------

  return (
    <>
      <div className="max-w-7xl mx-auto space-y-5">
        {/* HEADER */}

        <div className="flex flex-wrap justify-between gap-3 items-center">
          <div>
            <h1 className="text-2xl font-bold">{product.name}</h1>

            <p className="text-sm text-slate-500">{product.productCode}</p>

            <p className="text-sm mt-1">Customizable Product Stock</p>
          </div>

          <button
            onClick={() => router.push('/dashboard/products')}
            className="border px-4 py-2 rounded-lg"
          >
            Back
          </button>
        </div>

        {/* COMPONENT TABS */}

        <div className="flex flex-wrap gap-2 bg-white border p-2 rounded-xl w-fit">
          {['base', 'strap', 'thumb'].map((type) => (
            <button
              key={type}
              onClick={() => setComponentType(type)}
              className={`px-5 py-2 rounded-lg capitalize ${
                componentType === type
                  ? 'bg-black text-white'
                  : 'hover:bg-slate-100'
              }`}
            >
              {type}
            </button>
          ))}
        </div>

        {/* FILTERS */}

        <div className="bg-white border rounded-xl p-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            {/* COLOR */}

            <div>
              <label className="block text-sm font-medium mb-1">Color</label>

              <select
                value={selectedColor}
                onChange={(e) => setSelectedColor(e.target.value)}
                className="border rounded-lg p-2 w-full"
              >
                <option value="all">All Colors</option>

                {colors.map((color) => (
                  <option key={color._id} value={color._id}>
                    {color.colorName}
                  </option>
                ))}
              </select>
            </div>

            {/* SIZE */}

            <div>
              <label className="block text-sm font-medium mb-1">Size</label>

              <select
                value={selectedSize}
                onChange={(e) => setSelectedSize(e.target.value)}
                className="border rounded-lg p-2 w-full"
              >
                <option value="all">All Sizes</option>

                {sizes.map((size) => (
                  <option key={size} value={size}>
                    {size}
                  </option>
                ))}
              </select>
            </div>

            {/* COLOR SORT */}

            <div>
              <label className="block text-sm font-medium mb-1">
                Sort Color
              </label>

              <select
                value={colorSort}
                onChange={(e) => setColorSort(e.target.value)}
                className="border rounded-lg p-2 w-full"
              >
                <option value="asc">A → Z</option>

                <option value="desc">Z → A</option>
              </select>
            </div>

            {/* SIZE SORT */}

            <div>
              <label className="block text-sm font-medium mb-1">
                Sort Size
              </label>

              <select
                value={sizeSort}
                onChange={(e) => setSizeSort(e.target.value)}
                className="border rounded-lg p-2 w-full"
              >
                <option value="asc">Small → Large</option>

                <option value="desc">Large → Small</option>
              </select>
            </div>
          </div>
        </div>

        {/* COMPONENTS */}

        {filteredComponents.length === 0 ? (
          <div className="bg-white border rounded-xl p-10 text-center text-slate-500">
            No stock found for the selected filters.
          </div>
        ) : (
          filteredComponents.map((component) => (
            <div
              key={component._id}
              className="bg-white border rounded-xl p-5 space-y-5"
            >
              <h2 className="font-bold text-lg">{component.name}</h2>

              {component.colors.map((color) => (
                <div
                  key={color._id}
                  className="border rounded-lg overflow-hidden"
                >
                  {/* COLOR */}

                  <div className="p-3 bg-slate-50 flex items-center gap-3">
                    {color.image && (
                      <img
                        src={color.image}
                        alt={color.colorName}
                        className="w-10 h-10 object-contain rounded border"
                      />
                    )}

                    <b>{color.colorName}</b>
                  </div>

                  {/* VARIANTS */}

                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b">
                          <th className="p-3 text-left">Size</th>

                          <th className="p-3 text-left">Stock Quantity</th>

                          <th className="p-3 text-left">Action</th>
                        </tr>
                      </thead>

                      <tbody>
                        {[...(color.variants || [])]
                          .sort((a, b) => {
                            const result = Number(a.size) - Number(b.size);

                            return sizeSort === 'asc' ? result : -result;
                          })
                          .map((variant) => {
                            const key = `${component._id}-${color._id}-${variant._id}`;

                            return (
                              <tr
                                key={variant._id}
                                className="border-b last:border-0"
                              >
                                <td className="p-3">{variant.size}</td>

                                <td className="p-3">
                                  <span
                                    className={
                                      Number(variant.stockQuantity) === 0
                                        ? 'text-red-600 font-semibold'
                                        : ''
                                    }
                                  >
                                    {variant.stockQuantity}
                                  </span>
                                </td>

                                <td className="p-3">
                                  <button
                                    disabled={saving === key}
                                    onClick={() =>
                                      openComponentStockModal(
                                        component,
                                        color,
                                        variant,
                                      )
                                    }
                                    className="bg-black text-white px-4 py-2 rounded-lg text-xs disabled:opacity-50"
                                  >
                                    {saving === key
                                      ? 'Updating...'
                                      : 'Update Stock'}
                                  </button>
                                </td>
                              </tr>
                            );
                          })}
                      </tbody>
                    </table>
                  </div>
                </div>
              ))}
            </div>
          ))
        )}
      </div>
      <StockUpdateModal
        isOpen={stockModal.open}
        title={
          stockModal.type === 'STANDARD'
            ? 'Update Standard Product Stock'
            : 'Update Component Stock'
        }
        currentStock={stockModal.variant?.stockQuantity ?? 0}
        colorName={stockModal.color?.colorName}
        size={stockModal.variant?.size}
        onConfirm={confirmStockUpdate}
        onCancel={closeStockModal}
        loading={stockLoading}
      />
    </>
  );
}
