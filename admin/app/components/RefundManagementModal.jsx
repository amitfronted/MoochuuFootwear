'use client';

const formatDateTime = (date) => {
  if (!date) return '-';

  const value = new Date(date);

  if (Number.isNaN(value.getTime())) return '-';

  return value.toLocaleString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

const money = (value) =>
  `₹${Number(value || 0).toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

const RefundManagementModal = ({
  order,
  refundSummary,
  refundLoading,
  refundReconciling,
  onClose,
  onReconcile,
}) => {
  if (!order) return null;

  const totalAmount = Number(
    refundSummary?.totalAmount || order.totalAmount || 0,
  );

  const refundedAmount = Number(refundSummary?.totalRefundedAmount || 0);

  const pendingAmount = Number(refundSummary?.pendingRefundAmount || 0);

  const remainingAmount = Math.max(
    Number(refundSummary?.remainingRefundableAmount || 0),
    0,
  );

  const refundStatus = refundSummary?.refundStatus || 'NONE';

  const refunds = Array.isArray(refundSummary?.refunds)
    ? refundSummary.refunds
    : [];

  const canReconcile =
    !refundLoading &&
    !refundReconciling &&
    (refundStatus === 'PENDING' || pendingAmount > 0);

  return (
    <div
      className="fixed inset-0 z-[80] flex items-center justify-center bg-black/50 p-4"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget && !refundReconciling) {
          onClose();
        }
      }}
    >
      <div className="max-h-[90vh] w-full max-w-3xl overflow-hidden rounded-2xl bg-white shadow-2xl">
        {/* HEADER */}
        <div className="flex items-center justify-between border-b px-6 py-4">
          <div>
            <h2 className="text-xl font-bold text-slate-900">
              Refund Management
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              Order #{order.orderNumber}
            </p>
          </div>

          <button
            type="button"
            disabled={refundReconciling}
            onClick={onClose}
            className="flex h-9 w-9 items-center justify-center rounded-full border text-xl hover:bg-slate-100 disabled:opacity-50"
          >
            ×
          </button>
        </div>

        {/* BODY */}
        <div className="max-h-[calc(90vh-145px)] overflow-y-auto p-6">
          {/* INFO */}
          <div className="mb-5 rounded-xl border border-blue-100 bg-blue-50 p-4">
            <p className="text-sm font-semibold text-blue-900">
              Razorpay Refund
            </p>

            <p className="mt-1 text-xs leading-5 text-blue-700">
              This screen is used to verify and reconcile an existing refund. It
              does not create another refund.
            </p>
          </div>

          {/* SUMMARY */}
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            <div className="rounded-xl border bg-slate-50 p-4">
              <p className="text-xs text-slate-500">Order Total</p>

              <p className="mt-1 text-lg font-bold text-slate-900">
                {money(totalAmount)}
              </p>
            </div>

            <div className="rounded-xl border bg-slate-50 p-4">
              <p className="text-xs text-slate-500">Refunded</p>

              <p className="mt-1 text-lg font-bold text-green-700">
                {money(refundedAmount)}
              </p>
            </div>

            <div className="rounded-xl border bg-slate-50 p-4">
              <p className="text-xs text-slate-500">Pending</p>

              <p className="mt-1 text-lg font-bold text-yellow-700">
                {money(pendingAmount)}
              </p>
            </div>

            <div className="rounded-xl border bg-slate-50 p-4">
              <p className="text-xs text-slate-500">Remaining</p>

              <p className="mt-1 text-lg font-bold text-slate-900">
                {money(remainingAmount)}
              </p>
            </div>
          </div>

          {/* STATUS */}
          <div className="mt-5 flex items-center justify-between rounded-xl border p-4">
            <div>
              <p className="text-sm font-semibold text-slate-700">
                Refund Status
              </p>

              <p className="mt-1 text-xs text-slate-500">
                Current local refund state
              </p>
            </div>

            <span
              className={`
                rounded-full px-3 py-1.5 text-xs font-bold
                ${
                  refundStatus === 'PROCESSED'
                    ? 'bg-green-100 text-green-700'
                    : refundStatus === 'PARTIAL'
                      ? 'bg-blue-100 text-blue-700'
                      : refundStatus === 'PENDING'
                        ? 'bg-yellow-100 text-yellow-700'
                        : refundStatus === 'FAILED'
                          ? 'bg-red-100 text-red-700'
                          : 'bg-slate-100 text-slate-700'
                }
              `}
            >
              {refundStatus}
            </span>
          </div>

          {/* RECONCILE */}
          <div className="mt-5 rounded-xl border border-slate-200 p-4">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h3 className="font-semibold text-slate-900">
                  Reconcile Refund
                </h3>

                <p className="mt-1 text-xs leading-5 text-slate-500">
                  Check Razorpay and synchronize the existing refund with the
                  local Refund and Order records.
                </p>
              </div>

              <button
                type="button"
                disabled={!canReconcile}
                onClick={() => onReconcile?.(order._id)}
                className="shrink-0 rounded-lg border border-slate-900 px-4 py-2.5 text-sm font-semibold text-slate-900 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {refundReconciling ? 'Reconciling...' : 'Reconcile Refund'}
              </button>
            </div>

            {refundStatus === 'PROCESSED' && (
              <div className="mt-3 rounded-lg bg-green-50 p-3 text-xs font-medium text-green-700">
                This refund is already processed. No reconciliation is currently
                required.
              </div>
            )}

            {refundStatus === 'NONE' && (
              <div className="mt-3 rounded-lg bg-slate-50 p-3 text-xs text-slate-600">
                No refund ledger is currently associated with this order.
              </div>
            )}
          </div>

          {/* HISTORY */}
          <div className="mt-6">
            <h3 className="font-semibold text-slate-900">Refund History</h3>

            {refundLoading ? (
              <div className="mt-3 rounded-xl border bg-slate-50 p-5 text-center text-sm text-slate-500">
                Loading refund information...
              </div>
            ) : refunds.length === 0 ? (
              <div className="mt-3 rounded-xl border bg-slate-50 p-5 text-sm text-slate-500">
                No refunds have been created for this order.
              </div>
            ) : (
              <div className="mt-3 space-y-3">
                {refunds.map((refund) => (
                  <div key={refund._id} className="rounded-xl border p-4">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div>
                        <p className="text-lg font-bold text-slate-900">
                          {money(refund.amount)}
                        </p>

                        <p className="mt-1 text-xs text-slate-500">
                          Requested:{' '}
                          {formatDateTime(
                            refund.requestedAt || refund.createdAt,
                          )}
                        </p>

                        {refund.reason && (
                          <p className="mt-2 text-sm text-slate-700">
                            <b>Reason:</b> {refund.reason}
                          </p>
                        )}
                      </div>

                      <span
                        className={`
                          self-start rounded-full px-3 py-1 text-xs font-bold
                          ${
                            refund.status === 'PROCESSED'
                              ? 'bg-green-100 text-green-700'
                              : refund.status === 'PENDING'
                                ? 'bg-yellow-100 text-yellow-700'
                                : 'bg-red-100 text-red-700'
                          }
                        `}
                      >
                        {refund.status}
                      </span>
                    </div>

                    {refund.source && (
                      <p className="mt-2 text-xs text-slate-500">
                        Source: <b>{refund.source}</b>
                      </p>
                    )}

                    {refund.razorpayRefundId && (
                      <p className="mt-1 break-all text-xs text-slate-500">
                        Razorpay Refund ID: {refund.razorpayRefundId}
                      </p>
                    )}

                    {refund.failureReason && (
                      <p className="mt-2 text-xs text-red-600">
                        <b>Failure:</b> {refund.failureReason}
                      </p>
                    )}

                    {refund.processedAt && (
                      <p className="mt-1 text-xs text-slate-500">
                        Processed: {formatDateTime(refund.processedAt)}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* FOOTER */}
        <div className="flex justify-end items-center border-t bg-slate-50 px-6 py-4">
          <button
            type="button"
            disabled={refundReconciling}
            onClick={onClose}
            className="rounded-lg border border-slate-300 bg-white px-5 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-100 disabled:opacity-50"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default RefundManagementModal;
