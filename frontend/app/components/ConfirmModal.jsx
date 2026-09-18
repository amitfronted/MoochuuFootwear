'use client';

import { FiAlertTriangle, FiX } from 'react-icons/fi';

const ConfirmModal = ({
  open,
  title = 'Confirm Action',
  message = 'Are you sure you want to continue?',
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  onConfirm,
  onCancel,
  loading = false,
}) => {
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-100 flex items-center justify-center bg-black/50 p-4"
      onClick={onCancel}
    >
      <div
        className="relative w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* CLOSE */}
        <button
          type="button"
          onClick={onCancel}
          disabled={loading}
          className="
            absolute
            right-4
            top-4
            rounded-full
            p-2
            text-gray-400
            transition
            hover:bg-gray-100
            hover:text-gray-700
            disabled:cursor-not-allowed
            disabled:opacity-50
          "
          aria-label="Close"
        >
          <FiX className="text-xl" />
        </button>

        {/* ICON */}
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-red-100">
          <FiAlertTriangle className="text-xl text-red-600" />
        </div>

        {/* CONTENT */}
        <div className="mt-5">
          <h2 className="text-lg font-bold text-gray-900">{title}</h2>

          <p className="mt-2 text-sm leading-6 text-gray-500">{message}</p>
        </div>

        {/* ACTIONS */}
        <div className="mt-6 flex justify-end gap-3">
          <button
            type="button"
            onClick={onCancel}
            disabled={loading}
            className="
              rounded-lg
              border
              border-gray-200
              px-4
              py-2.5
              text-sm
              font-semibold
              text-gray-700
              transition
              hover:bg-gray-50
              disabled:cursor-not-allowed
              disabled:opacity-50
            "
          >
            {cancelText}
          </button>

          <button
            type="button"
            onClick={onConfirm}
            disabled={loading}
            className="
              rounded-lg
              bg-red-600
              px-4
              py-2.5
              text-sm
              font-semibold
              text-white
              transition
              hover:bg-red-700
              disabled:cursor-not-allowed
              disabled:opacity-50
            "
          >
            {loading ? 'Cancelling...' : confirmText}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmModal;
