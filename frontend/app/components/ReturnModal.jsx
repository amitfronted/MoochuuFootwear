'use client';

const ReturnModal = ({
  open,
  onClose,
  onSubmit,
  reason,
  setReason,
  comment,
  setComment,
  submitting,
}) => {
  if (!open) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl">
        <h2 className="mb-5 text-xl font-semibold text-gray-900">
          Return Order
        </h2>

        <div className="space-y-4">
          {/* Return Reason */}
          <div>
            <label
              htmlFor="return-reason"
              className="mb-2 block text-sm font-medium text-gray-700"
            >
              Return Reason
            </label>

            <select
              id="return-reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              disabled={submitting}
              className="w-full rounded-lg border border-gray-300 bg-white px-3 py-3 text-sm outline-none focus:border-gray-500"
            >
              <option value="">Select reason</option>
              <option value="WRONG_PRODUCT">Wrong Product</option>
              <option value="DAMAGED_PRODUCT">Damaged Product</option>
              <option value="DEFECTIVE_PRODUCT">Defective Product</option>
              <option value="SIZE_ISSUE">Size Issue</option>
              <option value="QUALITY_ISSUE">Quality Issue</option>
              <option value="OTHER">Other</option>
            </select>
          </div>

          {/* Comment */}
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
              onChange={(e) => setComment(e.target.value)}
              disabled={submitting}
              maxLength={500}
              rows={5}
              placeholder="Please explain the reason for return..."
              className="w-full resize-none rounded-lg border border-gray-300 px-3 py-3 text-sm outline-none focus:border-gray-500"
            />

            <div className="mt-1 text-right text-xs text-gray-500">
              {comment.length}/500
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="mt-6 flex justify-end gap-3">
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
            disabled={submitting || !reason}
            className="rounded-lg bg-black px-4 py-2 text-sm font-medium text-white transition hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {submitting ? 'Submitting...' : 'Submit Return'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ReturnModal;
