'use client';

import { useEffect, useState } from 'react';

export default function StockUpdateModal({
  isOpen,
  title = 'Add Stock',
  currentStock = 0,
  size,
  colorName,
  onConfirm,
  onCancel,
  loading = false,
}) {
  const [stockToAdd, setStockToAdd] = useState('');
  const [reason, setReason] = useState('');

  useEffect(() => {
    if (isOpen) {
      setStockToAdd('');
      setReason('');
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && !loading) {
        onCancel();
      }
    };

    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, loading, onCancel]);

  if (!isOpen) return null;

  const quantityToAdd = Number(stockToAdd) || 0;

  const finalStock = Number(currentStock) + quantityToAdd;

  const handleSubmit = (e) => {
    e.preventDefault();

    if (stockToAdd === '' || quantityToAdd <= 0) {
      return;
    }

    onConfirm({
      quantityToAdd,
      reason: reason.trim() || 'Stock received',
    });
  };

  return (
    <div
      className="fixed inset-0 z-9999 flex items-center justify-center bg-black/50 px-4"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget && !loading) {
          onCancel();
        }
      }}
    >
      <div
        className="w-full max-w-md rounded-xl bg-white shadow-2xl"
        role="dialog"
        aria-modal="true"
        aria-labelledby="stock-modal-title"
      >
        {/* HEADER */}
        <div className="border-b px-6 py-4">
          <h2
            id="stock-modal-title"
            className="text-lg font-semibold text-gray-900"
          >
            {title}
          </h2>

          {(colorName || size) && (
            <p className="mt-1 text-sm text-gray-500">
              {colorName}

              {colorName && size && ' • '}

              {size && `Size ${size}`}
            </p>
          )}
        </div>

        {/* FORM */}
        <form onSubmit={handleSubmit}>
          <div className="space-y-5 px-6 py-5">
            {/* CURRENT STOCK */}
            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700">
                Current Stock
              </label>

              <div className="rounded-lg bg-gray-100 px-4 py-3 font-semibold text-gray-800">
                {currentStock}
              </div>
            </div>

            {/* STOCK TO ADD */}
            <div>
              <label
                htmlFor="stock-to-add"
                className="mb-2 block text-sm font-medium text-gray-700"
              >
                Stock to Add
              </label>

              <input
                id="stock-to-add"
                type="number"
                min="1"
                value={stockToAdd}
                onChange={(e) => setStockToAdd(e.target.value)}
                disabled={loading}
                placeholder="Enter quantity received"
                className="w-full rounded-lg border border-gray-300 px-4 py-3 outline-none focus:border-black"
                autoFocus
              />
            </div>

            {/* REASON */}
            <div>
              <label
                htmlFor="stock-reason"
                className="mb-2 block text-sm font-medium text-gray-700"
              >
                Reason
              </label>

              <textarea
                id="stock-reason"
                rows={3}
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                disabled={loading}
                placeholder="e.g. New stock received"
                className="w-full resize-none rounded-lg border border-gray-300 px-4 py-3 outline-none focus:border-black"
              />
            </div>

            {/* STOCK CALCULATION */}
            <div className="rounded-lg border bg-gray-50 p-4">
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Current Stock</span>

                <span className="font-medium">{currentStock}</span>
              </div>

              <div className="mt-2 flex justify-between text-sm">
                <span className="text-gray-500">Stock to Add</span>

                <span className="font-medium text-green-600">
                  +{quantityToAdd}
                </span>
              </div>

              <div className="mt-2 flex justify-between border-t pt-2">
                <span className="font-medium text-gray-700">Updated Stock</span>

                <span className="font-bold text-gray-900">{finalStock}</span>
              </div>
            </div>
          </div>

          {/* FOOTER */}
          <div className="flex justify-end gap-3 border-t px-6 py-4">
            <button
              type="button"
              onClick={onCancel}
              disabled={loading}
              className="rounded-lg border border-gray-300 px-5 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={loading || stockToAdd === '' || quantityToAdd <= 0}
              className="rounded-lg bg-black px-5 py-2.5 text-sm font-medium text-white hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loading ? 'Adding...' : 'Add Stock'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
