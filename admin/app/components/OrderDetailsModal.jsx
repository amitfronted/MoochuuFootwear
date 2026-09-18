'use client';

import { useEffect, useState } from 'react';

const formatDateTime = (date) => {
  if (!date) return '-';

  return new Date(date).toLocaleString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

const OrderDetailsModal = ({
  order,
  onClose,
  onStatusChange,
  onMarkCodPaid,
  onShippingUpdate,
  updatingOrderId,
  onPrintInvoice,
}) => {
  const [courierName, setCourierName] = useState('');
  const [trackingNumber, setTrackingNumber] = useState('');
  const [trackingUrl, setTrackingUrl] = useState('');

  useEffect(() => {
    setCourierName(order?.shipping?.courierName || '');
    setTrackingNumber(order?.shipping?.trackingNumber || '');
    setTrackingUrl(order?.shipping?.trackingUrl || '');
  }, [order]);

  if (!order) return null;

  const isCodPending =
    order.paymentMethod === 'COD' &&
    order.paymentStatus === 'PENDING' &&
    order.orderStatus === 'DELIVERED';

  return (
    <div
      className="
        fixed
        inset-0
        z-50
        bg-black/40
        flex
        justify-center
        items-start
        p-4
        md:p-8
        overflow-y-auto
      "
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
    >
      <div
        className="
          bg-white
          rounded-2xl
          w-full
          max-w-4xl
          shadow-xl
          overflow-hidden
        "
      >
        {/* HEADER */}

        <div
          className="
            flex
            justify-between
            items-center
            border-b
            px-5
            py-4
          "
        >
          <div>
            <h2 className="text-xl font-bold">Order #{order.orderNumber}</h2>

            <p className="text-xs text-slate-500 mt-1">
              {formatDateTime(order.createdAt)}
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => onPrintInvoice(order)}
              className="
                rounded-lg
                border
                px-3
                py-2
                text-sm
                font-semibold
                hover:bg-slate-100
              "
            >
              Print Invoice
            </button>

            <button
              type="button"
              onClick={onClose}
              className="
                w-9
                h-9
                rounded-full
                border
                text-xl
                hover:bg-slate-100
              "
            >
              ×
            </button>
          </div>
        </div>

        <div className="p-5 space-y-6">
          {/* ORDER STATUS */}

          <div className="border rounded-xl p-4">
            <h3 className="font-bold mb-3">Order Status</h3>

            <div className="flex flex-col sm:flex-row gap-3">
              <select
                value={order.orderStatus}
                disabled={
                  updatingOrderId === order._id ||
                  order.orderStatus === 'CANCELLED'
                }
                onChange={(e) => onStatusChange(order._id, e.target.value)}
                className="
                  border
                  rounded-lg
                  px-3
                  py-2
                  flex-1
                "
              >
                <option value="PLACED">PLACED</option>
                <option value="CONFIRMED">CONFIRMED</option>
                <option value="PROCESSING">PROCESSING</option>
                <option value="SHIPPED">SHIPPED</option>
                <option value="DELIVERED">DELIVERED</option>
                <option value="CANCELLED">CANCELLED</option>
              </select>

              {updatingOrderId === order._id && (
                <div className="flex items-center text-sm text-slate-500">
                  Updating...
                </div>
              )}
            </div>
          </div>

          {/* PAYMENT ACTION */}

          {isCodPending && (
            <div className="border border-yellow-200 bg-yellow-50 rounded-xl p-4">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div>
                  <h3 className="font-bold text-yellow-800">
                    COD Payment Pending
                  </h3>

                  <p className="text-sm text-yellow-700 mt-1">
                    This order has been delivered but the COD payment is still
                    pending.
                  </p>
                </div>

                <button
                  type="button"
                  disabled={updatingOrderId === order._id}
                  onClick={() => onMarkCodPaid(order._id)}
                  className="
                    rounded-lg
                    border
                    border-green-600
                    px-4
                    py-2
                    text-sm
                    font-semibold
                    text-green-700
                    hover:bg-green-50
                    disabled:opacity-50
                    disabled:cursor-not-allowed
                  "
                >
                  {updatingOrderId === order._id
                    ? 'Updating...'
                    : 'Mark COD as Paid'}
                </button>
              </div>
            </div>
          )}

          {/* CUSTOMER + ADDRESS */}

          <div className="grid md:grid-cols-2 gap-4">
            <div className="border rounded-xl p-4">
              <h3 className="font-bold mb-3">Customer</h3>

              <div className="space-y-1 text-sm">
                <p>
                  <b>Name:</b> {order.userId?.name || '-'}
                </p>

                <p>
                  <b>Email:</b> {order.userId?.email || '-'}
                </p>

                <p>
                  <b>Mobile:</b> {order.userId?.mobile || '-'}
                </p>
              </div>
            </div>

            <div className="border rounded-xl p-4">
              <h3 className="font-bold mb-3">Shipping Address</h3>

              <div className="text-sm text-slate-700 space-y-1">
                <p>{order.shippingAddress?.name}</p>

                <p>{order.shippingAddress?.phone}</p>

                <p>{order.shippingAddress?.addressLine1}</p>

                <p>
                  {order.shippingAddress?.city}, {order.shippingAddress?.state}
                </p>

                <p>{order.shippingAddress?.postalCode}</p>

                {order.shippingAddress?.landmark && (
                  <p>Landmark: {order.shippingAddress.landmark}</p>
                )}
              </div>
            </div>
          </div>

          {/* ITEMS */}

          <div className="border rounded-xl overflow-hidden">
            <div className="px-4 py-3 border-b">
              <h3 className="font-bold">Order Items</h3>
            </div>

            <div className="divide-y">
              {order.items?.map((item) => (
                <div
                  key={item._id}
                  className="
                    p-4
                    flex
                    flex-col
                    md:flex-row
                    gap-4
                  "
                >
                  <img
                    src={item.image || '/placeholder.png'}
                    alt={item.name}
                    className="
                      w-20
                      h-20
                      rounded-lg
                      border
                      object-contain
                      bg-slate-50
                    "
                  />

                  <div className="flex-1">
                    <h4 className="font-semibold">{item.name}</h4>

                    <p className="text-xs text-slate-500">
                      Code: {item.productCode}
                    </p>

                    <div className="flex flex-wrap gap-4 text-sm mt-2">
                      <span>
                        Size: <b>{item.size}</b>
                      </span>

                      <span>
                        Qty: <b>{item.quantity}</b>
                      </span>

                      <span>
                        Price: ₹
                        {Number(item.unitPrice || 0).toLocaleString('en-IN')}
                      </span>
                    </div>

                    {/* CUSTOMIZATION */}

                    {item.productType === 'CUSTOMIZABLE' && (
                      <div className="mt-3 flex flex-wrap gap-2">
                        {item.base && (
                          <span className="px-2 py-1 bg-slate-100 rounded text-xs">
                            Sole: {item.base.colorName}
                          </span>
                        )}

                        {item.strap && (
                          <span className="px-2 py-1 bg-slate-100 rounded text-xs">
                            Strap: {item.strap.colorName}
                          </span>
                        )}

                        {item.thumb && (
                          <span className="px-2 py-1 bg-slate-100 rounded text-xs">
                            Thumb: {item.thumb.colorName}
                          </span>
                        )}
                      </div>
                    )}
                  </div>

                  <div className="font-bold">
                    ₹{Number(item.lineTotal || 0).toLocaleString('en-IN')}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* SHIPPING DETAILS */}

          {['PROCESSING', 'SHIPPED', 'DELIVERED'].includes(
            order.orderStatus,
          ) && (
            <div className="border rounded-xl p-4">
              <div className="mb-4">
                <h3 className="font-bold">Shipping Details</h3>

                <p className="mt-1 text-xs text-slate-500">
                  Courier information can be added when the courier is assigned.
                </p>
              </div>

              <div className="grid gap-3 md:grid-cols-3">
                <div>
                  <label className="mb-1 block text-xs font-semibold text-slate-600">
                    Courier Name
                  </label>

                  <input
                    value={courierName}
                    onChange={(e) => setCourierName(e.target.value)}
                    placeholder="Courier company"
                    maxLength={100}
                    className="w-full rounded-lg border px-3 py-2 text-sm"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-xs font-semibold text-slate-600">
                    Tracking Number
                  </label>

                  <input
                    value={trackingNumber}
                    onChange={(e) => setTrackingNumber(e.target.value)}
                    placeholder="Tracking number"
                    maxLength={100}
                    className="w-full rounded-lg border px-3 py-2 text-sm"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-xs font-semibold text-slate-600">
                    Tracking URL
                  </label>

                  <input
                    type="url"
                    value={trackingUrl}
                    onChange={(e) => setTrackingUrl(e.target.value)}
                    placeholder="https://..."
                    maxLength={500}
                    className="w-full rounded-lg border px-3 py-2 text-sm"
                  />
                </div>
              </div>

              <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-xs text-slate-500">
                  {order.shipping?.shippedAt
                    ? `Shipped: ${formatDateTime(order.shipping.shippedAt)}`
                    : order.shipping?.courierName ||
                        order.shipping?.trackingNumber ||
                        order.shipping?.trackingUrl
                      ? 'Shipping details saved. Order is not marked as shipped yet.'
                      : 'Shipping information not assigned yet.'}
                </p>

                <button
                  type="button"
                  disabled={updatingOrderId === order._id}
                  onClick={() =>
                    onShippingUpdate?.(order._id, {
                      courierName,
                      trackingNumber,
                      trackingUrl,
                    })
                  }
                  className="rounded-lg border border-slate-900 px-4 py-2 text-sm font-semibold hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {updatingOrderId === order._id
                    ? 'Saving...'
                    : 'Save Shipping Details'}
                </button>
              </div>
            </div>
          )}

          {/* PAYMENT + TOTAL */}

          <div className="grid md:grid-cols-2 gap-4">
            <div className="border rounded-xl p-4">
              <h3 className="font-bold mb-3">Payment</h3>

              <div className="space-y-2 text-sm">
                <p>
                  Method: <b>{order.paymentMethod}</b>
                </p>

                <p>
                  Status:{' '}
                  <b
                    className={
                      order.paymentStatus === 'PAID'
                        ? 'text-green-600'
                        : 'text-yellow-600'
                    }
                  >
                    {order.paymentStatus}
                  </b>
                </p>

                {order.paymentId && <p>Payment ID: {order.paymentId}</p>}

                {order.paymentPaidAt && (
                  <p>Paid At: {formatDateTime(order.paymentPaidAt)}</p>
                )}
              </div>
            </div>

            <div className="border rounded-xl p-4">
              <h3 className="font-bold mb-3">Order Summary</h3>

              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span>Subtotal</span>
                  <span>
                    ₹{Number(order.subtotal || 0).toLocaleString('en-IN')}
                  </span>
                </div>
                {Number(order.couponDiscount || 0) > 0 && (
                  <div className="flex justify-between text-green-600">
                    <span>
                      Coupon Discount
                      {order.couponCode ? ` (${order.couponCode})` : ''}
                    </span>

                    <span>
                      -₹{Number(order.couponDiscount).toLocaleString('en-IN')}
                    </span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span>Shipping</span>
                  <span>
                    ₹{Number(order.shippingCharge || 0).toLocaleString('en-IN')}
                  </span>
                </div>

                <div className="flex justify-between">
                  <span>GST (18%)</span>
                  <span>₹{Number(order.tax || 0).toLocaleString('en-IN')}</span>
                </div>

                <div
                  className="
                    border-t
                    pt-2
                    flex
                    justify-between
                    font-bold
                    text-base
                  "
                >
                  <span>Total</span>

                  <span>
                    ₹{Number(order.totalAmount || 0).toLocaleString('en-IN')}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* TIMESTAMPS */}

          {(order.deliveredAt || order.cancelledAt) && (
            <div className="border rounded-xl p-4 text-sm">
              {order.deliveredAt && (
                <p>Delivered: {formatDateTime(order.deliveredAt)}</p>
              )}

              {order.cancelledAt && (
                <p className="text-red-600">
                  Cancelled: {formatDateTime(order.cancelledAt)}
                </p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default OrderDetailsModal;
