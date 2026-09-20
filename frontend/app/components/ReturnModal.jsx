'use client';

const RETURN_REASONS = [
  {
    value: 'WRONG_PRODUCT',
    label: 'Wrong Product',
  },
  {
    value: 'DAMAGED_PRODUCT',
    label: 'Damaged Product',
  },
  {
    value: 'DEFECTIVE_PRODUCT',
    label: 'Defective Product',
  },
  {
    value: 'SIZE_ISSUE',
    label: 'Size Issue',
  },
  {
    value: 'QUALITY_ISSUE',
    label: 'Quality Issue',
  },
  {
    value: 'OTHER',
    label: 'Other',
  },
];

const ReturnModal = ({
  open,
  onClose,
  onSubmit,

  order,

  selectedItems,
  onToggleItem,
  onQuantityChange,
  onReasonChange,
  onItemCommentChange,

  comment,
  setComment,

  submitting,
}) => {
  if (!open || !order) {
    return null;
  }

  const items = Array.isArray(order.items) ? order.items : [];

  const selectedCount = Array.isArray(selectedItems) ? selectedItems.length : 0;

  const canSubmit = selectedCount > 0 && !submitting;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-xl bg-white shadow-xl">
        {/* ========================================= */}
        {/* HEADER */}
        {/* ========================================= */}

        <div className="shrink-0 border-b border-gray-200 p-5 sm:p-6">
          <h2 className="text-xl font-semibold text-gray-900">Return Order</h2>

          <p className="mt-1 text-sm text-gray-500">
            Order #{order.orderNumber || order._id}
          </p>

          <p className="mt-2 text-sm text-gray-600">
            Select the item(s) you want to return.
          </p>
        </div>

        {/* ========================================= */}
        {/* BODY */}
        {/* ========================================= */}

        <div className="flex-1 space-y-5 overflow-y-auto p-5 sm:p-6">
          {/* ======================================= */}
          {/* ORDER ITEMS */}
          {/* ======================================= */}

          <div>
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-gray-900">Items</h3>

              <span className="text-xs text-gray-500">
                {selectedCount} selected
              </span>
            </div>

            <div className="space-y-3">
              {items.length === 0 ? (
                <div className="rounded-lg border border-gray-200 bg-gray-50 p-4 text-center text-sm text-gray-500">
                  No items found in this order.
                </div>
              ) : (
                items.map((item) => {
                  const itemId = String(item?._id || '');

                  if (!itemId) {
                    return null;
                  }

                  const selectedItem = selectedItems?.find(
                    (selected) => String(selected.orderItemId) === itemId,
                  );

                  const isSelected = Boolean(selectedItem);

                  return (
                    <div
                      key={itemId}
                      className={`rounded-xl border p-4 transition ${
                        isSelected
                          ? 'border-gray-900 bg-gray-50'
                          : 'border-gray-200 bg-white'
                      }`}
                    >
                      {/* ITEM HEADER */}
                      <label className="flex cursor-pointer items-start gap-3">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => onToggleItem(item)}
                          disabled={submitting}
                          className="mt-1 h-4 w-4 rounded border-gray-300"
                        />

                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-semibold text-gray-900">
                            {item.name || 'Product'}
                          </p>

                          <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-500">
                            <span>
                              Size:{' '}
                              <strong className="text-gray-700">
                                {item.size || 'N/A'}
                              </strong>
                            </span>

                            <span>
                              Ordered Qty:{' '}
                              <strong className="text-gray-700">
                                {item.quantity || 0}
                              </strong>
                            </span>
                          </div>
                        </div>
                      </label>

                      {/* SELECTED ITEM DETAILS */}
                      {isSelected && (
                        <div className="mt-4 space-y-4 border-t border-gray-200 pt-4">
                          {/* QUANTITY */}
                          <div>
                            <label
                              htmlFor={`return-quantity-${itemId}`}
                              className="mb-2 block text-sm font-medium text-gray-700"
                            >
                              Return Quantity
                            </label>

                            <select
                              id={`return-quantity-${itemId}`}
                              value={selectedItem.quantity}
                              onChange={(event) =>
                                onQuantityChange(
                                  itemId,
                                  Number(event.target.value),
                                )
                              }
                              disabled={submitting}
                              className="w-full rounded-lg border border-gray-300 bg-white px-3 py-3 text-sm outline-none focus:border-gray-500"
                            >
                              {Array.from(
                                {
                                  length: Number(item.quantity) || 0,
                                },
                                (_, index) => index + 1,
                              ).map((quantity) => (
                                <option key={quantity} value={quantity}>
                                  {quantity}
                                </option>
                              ))}
                            </select>
                          </div>

                          {/* REASON */}
                          <div>
                            <label
                              htmlFor={`return-reason-${itemId}`}
                              className="mb-2 block text-sm font-medium text-gray-700"
                            >
                              Return Reason
                            </label>

                            <select
                              id={`return-reason-${itemId}`}
                              value={selectedItem.reason || ''}
                              onChange={(event) =>
                                onReasonChange(itemId, event.target.value)
                              }
                              disabled={submitting}
                              className="w-full rounded-lg border border-gray-300 bg-white px-3 py-3 text-sm outline-none focus:border-gray-500"
                            >
                              <option value="">Select reason</option>

                              {RETURN_REASONS.map((reason) => (
                                <option key={reason.value} value={reason.value}>
                                  {reason.label}
                                </option>
                              ))}
                            </select>
                          </div>

                          {/* ITEM COMMENT */}
                          <div>
                            <label
                              htmlFor={`return-item-comment-${itemId}`}
                              className="mb-2 block text-sm font-medium text-gray-700"
                            >
                              Item Details
                            </label>

                            <textarea
                              id={`return-item-comment-${itemId}`}
                              value={selectedItem.comment || ''}
                              onChange={(event) =>
                                onItemCommentChange(itemId, event.target.value)
                              }
                              disabled={submitting}
                              maxLength={500}
                              rows={3}
                              placeholder="Explain the issue with this item..."
                              className="w-full resize-none rounded-lg border border-gray-300 px-3 py-3 text-sm outline-none focus:border-gray-500"
                            />

                            <div className="mt-1 text-right text-xs text-gray-500">
                              {(selectedItem.comment || '').length}/500
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* ======================================= */}
          {/* OVERALL COMMENT */}
          {/* ======================================= */}

          <div>
            <label
              htmlFor="return-comment"
              className="mb-2 block text-sm font-medium text-gray-700"
            >
              Additional Details
            </label>

            <textarea
              id="return-comment"
              value={comment}
              onChange={(event) => setComment(event.target.value)}
              disabled={submitting}
              maxLength={500}
              rows={4}
              placeholder="Any additional information about your return..."
              className="w-full resize-none rounded-lg border border-gray-300 px-3 py-3 text-sm outline-none focus:border-gray-500"
            />

            <div className="mt-1 text-right text-xs text-gray-500">
              {comment.length}/500
            </div>
          </div>
        </div>

        {/* ========================================= */}
        {/* ACTIONS */}
        {/* ========================================= */}

        <div className="shrink-0 border-t border-gray-200 bg-white p-5 sm:p-6">
          <div className="flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Cancel
            </button>

            <button
              type="button"
              onClick={onSubmit}
              disabled={!canSubmit}
              className="rounded-lg bg-black px-4 py-2 text-sm font-medium text-white transition hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {submitting ? 'Submitting...' : 'Submit Return'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ReturnModal;
