'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { FiPackage, FiPlus, FiRefreshCw, FiSearch } from 'react-icons/fi';
import toast from 'react-hot-toast';

import { fetchAdminProducts, updateStandardProductStock } from '@/app/lib/api';

const StandardStockPage = () => {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState('');

  const [selectedVariant, setSelectedVariant] = useState(null);
  const [selectedProduct, setSelectedProduct] = useState(null);

  const [stockModal, setStockModal] = useState(false);

  const [quantityToAdd, setQuantityToAdd] = useState('');
  const [reason, setReason] = useState('');

  const [stockLoading, setStockLoading] = useState(false);

  // --------------------------------------------------
  // Load Standard Products
  // --------------------------------------------------

  const loadProducts = async () => {
    try {
      setLoading(true);

      const response = await fetchAdminProducts();

      if (!response?.success) {
        toast.error(response?.message || 'Failed to load products.');

        return;
      }

      const standardProducts = (response.data || []).filter(
        (product) => product.productType === 'STANDARD',
      );

      setProducts(standardProducts);
    } catch (error) {
      console.error('STANDARD STOCK LOAD ERROR:', error);

      toast.error(
        error?.response?.data?.message || 'Failed to load standard products.',
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProducts();
  }, []);

  // --------------------------------------------------
  // Flatten Product Variants
  // --------------------------------------------------

  const stockRows = useMemo(() => {
    const rows = [];

    products.forEach((product) => {
      if (!Array.isArray(product.standardStock)) {
        return;
      }

      product.standardStock.forEach((variant) => {
        rows.push({
          ...variant,
          product,
        });
      });
    });

    return rows;
  }, [products]);

  // --------------------------------------------------
  // Search
  // --------------------------------------------------

  const filteredRows = useMemo(() => {
    const value = search.trim().toLowerCase();

    if (!value) {
      return stockRows;
    }

    return stockRows.filter((row) => {
      return (
        row.product?.name?.toLowerCase().includes(value) ||
        row.product?.productCode?.toLowerCase().includes(value) ||
        String(row.size).toLowerCase().includes(value)
      );
    });
  }, [stockRows, search]);

  // --------------------------------------------------
  // Open Modal
  // --------------------------------------------------

  const openStockModal = (product, variant) => {
    setSelectedProduct(product);
    setSelectedVariant(variant);

    setQuantityToAdd('');
    setReason('');

    setStockModal(true);
  };

  // --------------------------------------------------
  // Close Modal
  // --------------------------------------------------

  const closeStockModal = () => {
    if (stockLoading) return;

    setStockModal(false);
    setSelectedProduct(null);
    setSelectedVariant(null);

    setQuantityToAdd('');
    setReason('');
  };

  // --------------------------------------------------
  // Current / New Stock
  // --------------------------------------------------

  const currentStock = Number(selectedVariant?.stockQuantity || 0);

  const addingStock = Number(quantityToAdd || 0);

  const newStock = currentStock + addingStock;

  // --------------------------------------------------
  // Update Stock
  // --------------------------------------------------

  const confirmStockUpdate = async () => {
    const quantity = Number(quantityToAdd);

    if (!Number.isInteger(quantity) || quantity <= 0) {
      toast.error('Enter a valid stock quantity greater than 0.');

      return;
    }

    if (!selectedProduct || !selectedVariant) {
      toast.error('Product or stock variant not selected.');

      return;
    }

    try {
      setStockLoading(true);

      const response = await updateStandardProductStock(
        selectedProduct._id,
        selectedVariant._id,
        quantity,
        reason,
      );

      if (!response?.success) {
        toast.error(response?.message || 'Failed to update stock.');

        return;
      }

      const stockChange = response.stockChange;

      // ----------------------------------------------
      // Update local product state
      // ----------------------------------------------

      setProducts((prevProducts) =>
        prevProducts.map((product) => {
          if (product._id !== selectedProduct._id) {
            return product;
          }

          return {
            ...product,

            standardStock: product.standardStock.map((variant) => {
              if (variant._id !== selectedVariant._id) {
                return variant;
              }

              return {
                ...variant,

                stockQuantity: stockChange.newStock,
              };
            }),
          };
        }),
      );

      toast.success(`Stock updated. New stock: ${stockChange.newStock}`);

      closeStockModal();
    } catch (error) {
      console.error('STANDARD STOCK UPDATE ERROR:', error);

      toast.error(error?.response?.data?.message || 'Failed to update stock.');
    } finally {
      setStockLoading(false);
    }
  };

  return (
    <div className="p-6">
      {/* --------------------------------------------- */}
      {/* Header */}
      {/* --------------------------------------------- */}

      <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-800">
            Standard Stock
          </h1>

          <p className="mt-1 text-sm text-gray-500">
            Manage stock for standard products.
          </p>
        </div>

        <button
          type="button"
          onClick={loadProducts}
          disabled={loading}
          className="inline-flex items-center justify-center gap-2 rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
        >
          <FiRefreshCw size={16} className={loading ? 'animate-spin' : ''} />
          Refresh
        </button>
      </div>

      {/* --------------------------------------------- */}
      {/* Search */}
      {/* --------------------------------------------- */}

      <div className="mb-5 rounded-xl border border-gray-200 bg-white p-4">
        <div className="relative max-w-md">
          <FiSearch
            size={17}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
          />

          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search product or size..."
            className="w-full rounded-lg border border-gray-200 py-2.5 pl-10 pr-3 text-sm outline-none focus:border-gray-400"
          />
        </div>
      </div>

      {/* --------------------------------------------- */}
      {/* Table */}
      {/* --------------------------------------------- */}

      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
        <div className="overflow-x-auto">
          <table className="w-full min-w-200 text-sm">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50">
                <th className="px-4 py-3 text-left font-semibold text-gray-600">
                  Product
                </th>

                <th className="px-4 py-3 text-left font-semibold text-gray-600">
                  Code
                </th>

                <th className="px-4 py-3 text-left font-semibold text-gray-600">
                  Size
                </th>

                <th className="px-4 py-3 text-right font-semibold text-gray-600">
                  Current Stock
                </th>

                <th className="px-4 py-3 text-center font-semibold text-gray-600">
                  Status
                </th>

                <th className="px-4 py-3 text-right font-semibold text-gray-600">
                  Action
                </th>
              </tr>
            </thead>

            <tbody>
              {loading ? (
                <tr>
                  <td
                    colSpan="6"
                    className="px-4 py-12 text-center text-gray-400"
                  >
                    Loading standard stock...
                  </td>
                </tr>
              ) : filteredRows.length === 0 ? (
                <tr>
                  <td
                    colSpan="6"
                    className="px-4 py-12 text-center text-gray-400"
                  >
                    No standard stock found.
                  </td>
                </tr>
              ) : (
                filteredRows.map((row) => {
                  const stock = Number(row.stockQuantity || 0);

                  const status =
                    stock === 0
                      ? 'OUT OF STOCK'
                      : stock <= 5
                        ? 'LOW STOCK'
                        : 'IN STOCK';

                  return (
                    <tr
                      key={`${row.product?._id}-${row._id}`}
                      className="border-b border-gray-100 last:border-b-0 hover:bg-gray-50"
                    >
                      {/* Product */}
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="flex h-9 w-9 items-center justify-center overflow-hidden rounded-lg border border-gray-200 bg-gray-50">
                            {row.product?.mainImage ? (
                              <img
                                src={row.product.mainImage}
                                alt={row.product.name || 'Product'}
                                className="h-full w-full object-cover"
                              />
                            ) : (
                              <FiPackage size={17} className="text-gray-400" />
                            )}
                          </div>

                          <div>
                            <p className="font-medium text-gray-700">
                              {row.product?.name || '-'}
                            </p>
                          </div>
                        </div>
                      </td>

                      {/* Code */}
                      <td className="px-4 py-3 text-gray-600">
                        {row.product?.productCode || '-'}
                      </td>

                      {/* Size */}
                      <td className="px-4 py-3 font-medium text-gray-700">
                        {row.size || '-'}
                      </td>

                      {/* Stock */}
                      <td className="px-4 py-3 text-right">
                        <span className="font-semibold text-gray-800">
                          {stock}
                        </span>
                      </td>

                      {/* Status */}
                      <td className="px-4 py-3 text-center">
                        <span
                          className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${
                            status === 'OUT OF STOCK'
                              ? 'bg-red-100 text-red-700'
                              : status === 'LOW STOCK'
                                ? 'bg-yellow-100 text-yellow-700'
                                : 'bg-green-100 text-green-700'
                          }`}
                        >
                          {status}
                        </span>
                      </td>

                      {/* Action */}
                      <td className="px-4 py-3 text-right">
                        <button
                          type="button"
                          onClick={() => openStockModal(row.product, row)}
                          className="inline-flex items-center gap-2 rounded-lg bg-black px-3 py-2 text-xs font-medium text-white hover:bg-gray-800"
                        >
                          <FiPlus size={14} />
                          Add Stock
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

      {/* --------------------------------------------- */}
      {/* Stock Modal */}
      {/* --------------------------------------------- */}

      {stockModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-xl bg-white shadow-xl">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-gray-200 px-5 py-4">
              <div>
                <h2 className="text-lg font-semibold text-gray-800">
                  Add Stock
                </h2>

                <p className="mt-0.5 text-xs text-gray-500">
                  Add inventory to this standard variant.
                </p>
              </div>

              <button
                type="button"
                onClick={closeStockModal}
                disabled={stockLoading}
                className="text-xl text-gray-400 hover:text-gray-700 disabled:opacity-50"
              >
                ×
              </button>
            </div>

            {/* Modal Body */}
            <div className="space-y-4 px-5 py-5">
              {/* Product */}
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-500">
                  Product
                </label>

                <div className="rounded-lg bg-gray-50 px-3 py-2.5 text-sm font-medium text-gray-700">
                  {selectedProduct?.name || '-'}
                </div>
              </div>

              {/* Size */}
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-500">
                  Size
                </label>

                <div className="rounded-lg bg-gray-50 px-3 py-2.5 text-sm font-medium text-gray-700">
                  {selectedVariant?.size || '-'}
                </div>
              </div>

              {/* Current Stock */}
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-500">
                  Current Stock
                </label>

                <div className="rounded-lg bg-gray-50 px-3 py-2.5 text-sm font-semibold text-gray-800">
                  {currentStock}
                </div>
              </div>

              {/* Stock to Add */}
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-700">
                  Stock to Add
                </label>

                <input
                  type="number"
                  min="1"
                  step="1"
                  value={quantityToAdd}
                  onChange={(e) => setQuantityToAdd(e.target.value)}
                  placeholder="Enter quantity"
                  disabled={stockLoading}
                  className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm outline-none focus:border-gray-400 disabled:bg-gray-100"
                />
              </div>

              {/* Reason */}
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-700">
                  Reason
                </label>

                <textarea
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  rows={3}
                  placeholder="Example: New stock received"
                  disabled={stockLoading}
                  className="w-full resize-none rounded-lg border border-gray-200 px-3 py-2.5 text-sm outline-none focus:border-gray-400 disabled:bg-gray-100"
                />
              </div>

              {/* Preview */}
              <div className="rounded-lg bg-gray-50 p-3">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-500">Current Stock</span>

                  <span className="font-medium text-gray-800">
                    {currentStock}
                  </span>
                </div>

                <div className="mt-1 flex items-center justify-between text-sm">
                  <span className="text-gray-500">Stock to Add</span>

                  <span className="font-medium text-green-600">
                    +{addingStock}
                  </span>
                </div>

                <div className="mt-2 flex items-center justify-between border-t border-gray-200 pt-2">
                  <span className="font-medium text-gray-700">New Stock</span>

                  <span className="text-lg font-semibold text-gray-900">
                    {newStock}
                  </span>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="flex justify-end gap-2 border-t border-gray-200 px-5 py-4">
              <button
                type="button"
                onClick={closeStockModal}
                disabled={stockLoading}
                className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50 disabled:opacity-50"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={confirmStockUpdate}
                disabled={
                  stockLoading || !quantityToAdd || Number(quantityToAdd) <= 0
                }
                className="rounded-lg bg-black px-4 py-2 text-sm font-medium text-white hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {stockLoading ? 'Updating...' : 'Add Stock'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default StandardStockPage;
