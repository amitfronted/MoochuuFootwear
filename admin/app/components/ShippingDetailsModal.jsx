'use client';

import { useEffect, useState } from 'react';

const ShippingDetailsModal = ({ order, onClose, onSave, saving = false }) => {
  const [courierName, setCourierName] = useState('');
  const [trackingNumber, setTrackingNumber] = useState('');
  const [trackingUrl, setTrackingUrl] = useState('');

  useEffect(() => {
    setCourierName(order?.shipping?.courierName || '');
    setTrackingNumber(order?.shipping?.trackingNumber || '');
    setTrackingUrl(order?.shipping?.trackingUrl || '');
  }, [order]);

  if (!order) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!courierName.trim()) {
      alert('Please enter courier name.');
      return;
    }

    if (!trackingNumber.trim()) {
      alert('Please enter tracking number.');
      return;
    }

    await onSave?.(order._id, {
      courierName: courierName.trim(),
      trackingNumber: trackingNumber.trim(),
      trackingUrl: trackingUrl.trim(),
    });
  };

  return (
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center bg-black/50 p-4"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget && !saving) {
          onClose();
        }
      }}
    >
      <div className="w-full max-w-2xl overflow-hidden rounded-2xl bg-white shadow-2xl">
        {/* HEADER */}
        <div className="flex items-center justify-between border-b px-6 py-4">
          <div>
            <h2 className="text-xl font-bold text-slate-900">
              Shipping Details
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              Order #{order.orderNumber}
            </p>
          </div>

          <button
            type="button"
            disabled={saving}
            onClick={onClose}
            className="flex h-9 w-9 items-center justify-center rounded-full border text-xl hover:bg-slate-100 disabled:opacity-50"
          >
            ×
          </button>
        </div>

        {/* BODY */}
        <form onSubmit={handleSubmit}>
          <div className="space-y-5 p-6">
            <div className="rounded-xl border border-blue-100 bg-blue-50 p-4">
              <p className="text-sm font-semibold text-blue-900">
                Mark Order as Shipped
              </p>

              <p className="mt-1 text-xs leading-5 text-blue-700">
                Enter the courier and tracking information. After saving, the
                order will be changed to SHIPPED.
              </p>
            </div>

            {/* COURIER */}
            <div>
              <label className="mb-1.5 block text-sm font-semibold text-slate-700">
                Courier Name <span className="text-red-500">*</span>
              </label>

              <input
                type="text"
                value={courierName}
                onChange={(e) => setCourierName(e.target.value)}
                placeholder="e.g. BlueDart"
                maxLength={100}
                disabled={saving}
                className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm outline-none transition focus:border-slate-900 disabled:bg-slate-100"
              />
            </div>

            {/* TRACKING */}
            <div>
              <label className="mb-1.5 block text-sm font-semibold text-slate-700">
                Tracking Number <span className="text-red-500">*</span>
              </label>

              <input
                type="text"
                value={trackingNumber}
                onChange={(e) => setTrackingNumber(e.target.value)}
                placeholder="Enter tracking number"
                maxLength={100}
                disabled={saving}
                className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm outline-none transition focus:border-slate-900 disabled:bg-slate-100"
              />
            </div>

            {/* TRACKING URL */}
            <div>
              <label className="mb-1.5 block text-sm font-semibold text-slate-700">
                Tracking URL
              </label>

              <input
                type="url"
                value={trackingUrl}
                onChange={(e) => setTrackingUrl(e.target.value)}
                placeholder="https://..."
                maxLength={500}
                disabled={saving}
                className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm outline-none transition focus:border-slate-900 disabled:bg-slate-100"
              />

              <p className="mt-1 text-xs text-slate-500">
                Optional. Customer can use this URL to track the shipment.
              </p>
            </div>
          </div>

          {/* FOOTER */}
          <div className="flex justify-end gap-3 border-t bg-slate-50 px-6 py-4">
            <button
              type="button"
              disabled={saving}
              onClick={onClose}
              className="rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-100 disabled:opacity-50"
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={saving}
              className="rounded-lg bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {saving ? 'Saving...' : 'Save & Mark Shipped'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ShippingDetailsModal;
