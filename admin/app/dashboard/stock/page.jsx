'use client';

import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { fetchComponents, updateComponentStock } from '../../lib/api';
import toast from 'react-hot-toast';
import StockUpdateModal from '@/app/components/StockUpdateModal';
import Link from 'next/link';
import { FiClock, FiPackage } from 'react-icons/fi';

const STOCK_TYPES = ['base', 'strap', 'thumb'];

export default function Stock() {
  const searchParams = useSearchParams();

  const [type, setType] = useState(searchParams.get('type') || 'base');

  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);

  const [selectedComponentId, setSelectedComponentId] = useState('');

  const [selectedColorId, setSelectedColorId] = useState('');

  const [stockModal, setStockModal] = useState({
    open: false,
    component: null,
    color: null,
    variant: null,
  });

  const [stockLoading, setStockLoading] = useState(false);

  // -----------------------------------------
  // LOAD COMPONENTS
  // -----------------------------------------

  const load = async () => {
    setLoading(true);

    try {
      const response = await fetchComponents(type);

      const components = response?.data || [];

      setList(components);

      // Select first component automatically
      if (components.length > 0) {
        setSelectedComponentId(components[0]._id);

        const firstColor = components[0]?.colors?.[0];

        setSelectedColorId(firstColor?._id || '');
      } else {
        setSelectedComponentId('');
        setSelectedColorId('');
      }
    } catch (error) {
      console.error('LOAD STOCK ERROR:', error);

      toast.error(error?.response?.data?.message || 'Failed to load stock');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const queryType = searchParams.get('type');

    if (STOCK_TYPES.includes(queryType)) {
      setType(queryType);
    }
  }, [searchParams]);

  useEffect(() => {
    load();
  }, [type]);

  // -----------------------------------------
  // SELECTED COMPONENT
  // -----------------------------------------

  const selectedComponent = useMemo(() => {
    return list.find((component) => component._id === selectedComponentId);
  }, [list, selectedComponentId]);

  // -----------------------------------------
  // SELECTED COLOR
  // -----------------------------------------

  const selectedColor = useMemo(() => {
    return selectedComponent?.colors?.find(
      (color) => color._id === selectedColorId,
    );
  }, [selectedComponent, selectedColorId]);

  // -----------------------------------------
  // COMPONENT CHANGE
  // -----------------------------------------

  const handleComponentChange = (componentId) => {
    setSelectedComponentId(componentId);

    const component = list.find((item) => item._id === componentId);

    const firstColor = component?.colors?.[0];

    setSelectedColorId(firstColor?._id || '');
  };

  // -----------------------------------------
  // TYPE CHANGE
  // -----------------------------------------

  const handleTypeChange = (newType) => {
    setType(newType);

    setSelectedComponentId('');
    setSelectedColorId('');
  };

  // -----------------------------------------
  // OPEN STOCK MODAL
  // -----------------------------------------

  const openStockModal = (variant) => {
    if (!selectedComponent || !selectedColor) {
      return;
    }

    setStockModal({
      open: true,
      component: selectedComponent,
      color: selectedColor,
      variant,
    });
  };

  // -----------------------------------------
  // CLOSE STOCK MODAL
  // -----------------------------------------

  const closeStockModal = () => {
    if (stockLoading) return;

    setStockModal({
      open: false,
      component: null,
      color: null,
      variant: null,
    });
  };

  // -----------------------------------------
  // UPDATE STOCK
  // -----------------------------------------

  const confirmStockUpdate = async ({ quantityToAdd, reason }) => {
    const { component, color, variant } = stockModal;

    if (!component || !color || !variant) {
      return;
    }

    setStockLoading(true);

    try {
      const response = await updateComponentStock(
        type,
        component._id,
        color._id,
        variant._id,
        {
          quantity: quantityToAdd,
          reason,
        },
      );

      toast.success(`${quantityToAdd} stock added successfully`);

      // -----------------------------------------
      // USE SERVER RESULT
      // -----------------------------------------

      const updatedStock = response?.data?.stockChange?.newStock;

      // -----------------------------------------
      // UPDATE UI
      // -----------------------------------------

      setList((previousList) =>
        previousList.map((item) => {
          if (item._id !== component._id) {
            return item;
          }

          return {
            ...item,

            colors: item.colors?.map((itemColor) => {
              if (itemColor._id !== color._id) {
                return itemColor;
              }

              return {
                ...itemColor,

                variants: itemColor.variants?.map((itemVariant) => {
                  if (itemVariant._id !== variant._id) {
                    return itemVariant;
                  }

                  return {
                    ...itemVariant,

                    stockQuantity: updatedStock,
                  };
                }),
              };
            }),
          };
        }),
      );

      closeStockModal();
    } catch (error) {
      console.error('STOCK UPDATE ERROR:', error);

      toast.error(error?.response?.data?.message || 'Failed to add stock');
    } finally {
      setStockLoading(false);
    }
  };
  // -----------------------------------------
  // STOCK STATUS
  // -----------------------------------------

  const getStockStatus = (quantity) => {
    if (quantity === 0) {
      return {
        label: 'Out of Stock',
        className: 'bg-red-100 text-red-700',
      };
    }

    if (quantity <= 5) {
      return {
        label: 'Low Stock',
        className: 'bg-amber-100 text-amber-700',
      };
    }

    return {
      label: 'In Stock',
      className: 'bg-green-100 text-green-700',
    };
  };

  // -----------------------------------------
  // RENDER
  // -----------------------------------------

  return (
    <>
      <div className="mb-6 flex items-center gap-2 border-b border-gray-200">
        <Link
          href="/dashboard/stock"
          className="inline-flex items-center gap-2 border-b-2 border-black px-4 py-3 text-sm font-medium text-gray-900"
        >
          <FiPackage size={16} />
          Stock List
        </Link>

        <Link
          href="/dashboard/stock/history"
          className="inline-flex items-center gap-2 border-b-2 border-transparent px-4 py-3 text-sm font-medium text-gray-500 hover:border-gray-300 hover:text-gray-900"
        >
          <FiClock size={16} />
          Stock History
        </Link>
      </div>
      <div className="mx-auto max-w-7xl space-y-6">
        {/* HEADER */}
        <div>
          <h1 className="text-2xl font-bold text-slate-900">
            Stock Management
          </h1>

          <p className="mt-1 text-sm text-slate-500">
            Manage component stock by color and size.
          </p>
        </div>

        {/* TYPE TABS */}
        <div className="flex w-fit gap-1 rounded-xl border bg-white p-1">
          {STOCK_TYPES.map((stockType) => (
            <button
              key={stockType}
              type="button"
              onClick={() => handleTypeChange(stockType)}
              className={`rounded-lg px-5 py-2 text-sm font-medium capitalize transition ${
                type === stockType
                  ? 'bg-black text-white'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              {stockType}
            </button>
          ))}
        </div>

        {/* LOADING */}
        {loading ? (
          <div className="rounded-xl border bg-white p-10 text-center text-sm text-slate-500">
            Loading stock...
          </div>
        ) : list.length === 0 ? (
          <div className="rounded-xl border bg-white p-10 text-center">
            <p className="font-medium text-slate-700">
              No {type} components found.
            </p>

            <p className="mt-1 text-sm text-slate-500">
              Create a component first.
            </p>
          </div>
        ) : (
          <>
            {/* FILTER SECTION */}
            <div className="grid grid-cols-1 gap-4 rounded-xl border bg-white p-5 md:grid-cols-2">
              {/* COMPONENT */}
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">
                  Component
                </label>

                <select
                  value={selectedComponentId}
                  onChange={(e) => handleComponentChange(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 bg-white px-4 py-3 text-sm outline-none focus:border-black"
                >
                  {list.map((component) => (
                    <option key={component._id} value={component._id}>
                      {component.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* COLOR */}
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">
                  Color
                </label>

                <select
                  value={selectedColorId}
                  onChange={(e) => setSelectedColorId(e.target.value)}
                  disabled={!selectedComponent?.colors?.length}
                  className="w-full rounded-lg border border-slate-300 bg-white px-4 py-3 text-sm outline-none focus:border-black disabled:bg-slate-100"
                >
                  {selectedComponent?.colors?.map((color) => (
                    <option key={color._id} value={color._id}>
                      {color.colorName}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* SELECTED COMPONENT INFO */}
            {selectedComponent && selectedColor && (
              <div className="rounded-xl border bg-white">
                {/* COLOR HEADER */}
                <div className="flex items-center justify-between border-b bg-slate-50 px-5 py-4">
                  <div className="flex items-center gap-3">
                    {selectedColor.image && (
                      <img
                        src={selectedColor.image}
                        alt={selectedColor.colorName}
                        className="h-12 w-12 rounded-lg border bg-white object-contain"
                      />
                    )}

                    <div>
                      <h2 className="font-semibold text-slate-900">
                        {selectedComponent.name}
                      </h2>

                      <p className="text-sm text-slate-500">
                        {selectedColor.colorName}
                      </p>
                    </div>
                  </div>

                  <div className="text-right">
                    <p className="text-xs text-slate-500">Total Variants</p>

                    <p className="font-semibold">
                      {selectedColor.variants?.length || 0}
                    </p>
                  </div>
                </div>

                {/* STOCK TABLE */}
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b bg-white">
                        <th className="px-5 py-3 text-left font-semibold text-slate-600">
                          Size
                        </th>

                        <th className="px-5 py-3 text-left font-semibold text-slate-600">
                          Current Stock
                        </th>

                        <th className="px-5 py-3 text-left font-semibold text-slate-600">
                          Status
                        </th>

                        <th className="px-5 py-3 text-right font-semibold text-slate-600">
                          Action
                        </th>
                      </tr>
                    </thead>

                    <tbody>
                      {(selectedColor.variants || []).map((variant) => {
                        const status = getStockStatus(
                          Number(variant.stockQuantity),
                        );

                        return (
                          <tr
                            key={variant._id}
                            className="border-b last:border-0 hover:bg-slate-50"
                          >
                            <td className="px-5 py-4 font-medium">
                              {variant.size}
                            </td>

                            <td className="px-5 py-4 font-semibold">
                              {variant.stockQuantity}
                            </td>

                            <td className="px-5 py-4">
                              <span
                                className={`inline-flex rounded-full px-3 py-1 text-xs font-medium ${status.className}`}
                              >
                                {status.label}
                              </span>
                            </td>

                            <td className="px-5 py-4 text-right">
                              <button
                                type="button"
                                onClick={() => openStockModal(variant)}
                                className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 transition hover:border-black hover:bg-black hover:text-white"
                              >
                                Update Stock
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {/* EMPTY VARIANTS */}
                {!selectedColor.variants?.length && (
                  <div className="p-8 text-center text-sm text-slate-500">
                    No size variants available for this color.
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>

      {/* STOCK UPDATE MODAL */}
      <StockUpdateModal
        isOpen={stockModal.open}
        title="Update Component Stock"
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
