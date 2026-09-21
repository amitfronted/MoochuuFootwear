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
  onPrintInvoice,
  refundSummary,
  refundLoading,
  onOpenRefund,
}) => {
  if (!order) return null;

  const isCodPending =
    order.paymentMethod === 'COD' &&
    order.paymentStatus === 'PENDING' &&
    order.orderStatus === 'DELIVERED';

  const isRazorpayOrder =
    order.paymentMethod === 'ONLINE' && order.paymentProvider === 'RAZORPAY';

  const totalRefundedAmount = Number(refundSummary?.totalRefundedAmount || 0);

  const pendingRefundAmount = Number(refundSummary?.pendingRefundAmount || 0);

  const remainingRefundableAmount = Math.max(
    Number(refundSummary?.remainingRefundableAmount || 0),
    0,
  );

  const refundStatus = refundSummary?.refundStatus || 'NONE';

  const refundHistory = Array.isArray(refundSummary?.refunds)
    ? refundSummary.refunds
    : [];

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
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h3 className="font-bold">Order Status</h3>
                <p className="mt-1 text-xs text-slate-500">
                  Current status of this order.
                </p>
              </div>
              <span
                className={`
                      inline-flex
                      w-fit
                      rounded-full
                      px-3
                      py-1.5
                      text-xs
                      font-bold
                      ${
                        order.orderStatus === 'DELIVERED'
                          ? 'bg-green-100 text-green-700'
                          : order.orderStatus === 'SHIPPED'
                            ? 'bg-indigo-100 text-indigo-700'
                            : order.orderStatus === 'CANCELLED'
                              ? 'bg-red-100 text-red-700'
                              : order.orderStatus === 'PROCESSING'
                                ? 'bg-purple-100 text-purple-700'
                                : order.orderStatus === 'CONFIRMED'
                                  ? 'bg-blue-100 text-blue-700'
                                  : 'bg-yellow-100 text-yellow-700'
                      }
                    `}
              >
                {order.orderStatus}
              </span>
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

            {/* SHIPPING INFORMATION - READ ONLY */}

            <div className="border rounded-xl p-4">
              <div className="mb-4">
                <h3 className="font-bold">Shipping Information</h3>

                <p className="mt-1 text-xs text-slate-500">
                  Shipment information for this order.
                </p>
              </div>

              {order.shipping?.courierName ||
              order.shipping?.trackingNumber ||
              order.shipping?.trackingUrl ? (
                <div className="grid gap-4 md:grid-cols-3">
                  <div>
                    <p className="text-xs font-semibold text-slate-500">
                      Courier
                    </p>

                    <p className="mt-1 text-sm font-medium text-slate-900">
                      {order.shipping?.courierName || '-'}
                    </p>
                  </div>

                  <div>
                    <p className="text-xs font-semibold text-slate-500">
                      Tracking Number
                    </p>

                    <p className="mt-1 break-all text-sm font-medium text-slate-900">
                      {order.shipping?.trackingNumber || '-'}
                    </p>
                  </div>

                  <div>
                    <p className="text-xs font-semibold text-slate-500">
                      Tracking URL
                    </p>

                    {order.shipping?.trackingUrl ? (
                      <a
                        href={order.shipping.trackingUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="mt-1 block break-all text-sm font-medium text-blue-600 hover:underline"
                      >
                        Track Shipment
                      </a>
                    ) : (
                      <p className="mt-1 text-sm text-slate-500">-</p>
                    )}
                  </div>
                </div>
              ) : (
                <div className="rounded-lg bg-slate-50 p-4 text-sm text-slate-500">
                  Shipping information has not been assigned yet.
                </div>
              )}

              {order.shipping?.shippedAt && (
                <div className="mt-4 border-t pt-4">
                  <p className="text-xs font-semibold text-slate-500">
                    Shipped At
                  </p>

                  <p className="mt-1 text-sm text-slate-700">
                    {formatDateTime(order.shipping.shippedAt)}
                  </p>
                </div>
              )}
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

          {/* REFUND INFORMATION - READ ONLY */}

          {order.paymentMethod === 'ONLINE' &&
            order.paymentProvider === 'RAZORPAY' && (
              <div className="border rounded-xl p-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <h3 className="font-bold">Refund Information</h3>

                    <p className="mt-1 text-xs text-slate-500">
                      Refund status and amounts for this order.
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => onOpenRefund?.(order)}
                    className="
            rounded-lg
            border
            border-slate-800
            px-4
            py-2
            text-sm
            font-semibold
            text-slate-800
            hover:bg-slate-100
          "
                  >
                    Manage Refund
                  </button>
                </div>

                {refundLoading ? (
                  <div className="mt-4 rounded-lg bg-slate-50 p-4 text-sm text-slate-500">
                    Loading refund information...
                  </div>
                ) : (
                  <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-4">
                    <div className="rounded-lg border bg-slate-50 p-3">
                      <p className="text-xs text-slate-500">Order Total</p>

                      <p className="mt-1 font-bold">
                        ₹
                        {Number(
                          refundSummary?.totalAmount || order.totalAmount || 0,
                        ).toLocaleString('en-IN', {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })}
                      </p>
                    </div>

                    <div className="rounded-lg border bg-slate-50 p-3">
                      <p className="text-xs text-slate-500">Refunded</p>

                      <p className="mt-1 font-bold text-green-700">
                        ₹
                        {Number(
                          refundSummary?.totalRefundedAmount || 0,
                        ).toLocaleString('en-IN', {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })}
                      </p>
                    </div>

                    <div className="rounded-lg border bg-slate-50 p-3">
                      <p className="text-xs text-slate-500">Pending</p>

                      <p className="mt-1 font-bold text-yellow-700">
                        ₹
                        {Number(
                          refundSummary?.pendingRefundAmount || 0,
                        ).toLocaleString('en-IN', {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })}
                      </p>
                    </div>

                    <div className="rounded-lg border bg-slate-50 p-3">
                      <p className="text-xs text-slate-500">Remaining</p>

                      <p className="mt-1 font-bold">
                        ₹
                        {Number(
                          refundSummary?.remainingRefundableAmount || 0,
                        ).toLocaleString('en-IN', {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })}
                      </p>
                    </div>
                  </div>
                )}

                <div className="mt-4 flex items-center gap-2">
                  <span className="text-sm font-semibold">Refund Status:</span>

                  <span
                    className={`
            rounded-full
            px-3
            py-1
            text-xs
            font-bold
            ${
              refundSummary?.refundStatus === 'PROCESSED'
                ? 'bg-green-100 text-green-700'
                : refundSummary?.refundStatus === 'PARTIAL'
                  ? 'bg-blue-100 text-blue-700'
                  : refundSummary?.refundStatus === 'PENDING'
                    ? 'bg-yellow-100 text-yellow-700'
                    : refundSummary?.refundStatus === 'FAILED'
                      ? 'bg-red-100 text-red-700'
                      : 'bg-slate-100 text-slate-700'
            }
          `}
                  >
                    {refundSummary?.refundStatus || 'NONE'}
                  </span>
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
