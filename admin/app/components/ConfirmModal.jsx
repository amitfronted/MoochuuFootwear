'use client';

import React, { useEffect } from 'react';

const ConfirmModal = ({
  isOpen,
  title = 'Are you sure?',
  message = '',
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  onConfirm,
  onCancel,
  loading = false,
  type = 'danger',
}) => {
  // Prevent background scrolling while modal is open
  useEffect(() => {
    if (!isOpen) return;

    const originalOverflow = document.body.style.overflow;

    document.body.style.overflow = 'hidden';

    return () => {
      document.body.style.overflow = originalOverflow;
    };
  }, [isOpen]);

  // Close with Escape
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (event) => {
      if (event.key === 'Escape' && !loading) {
        onCancel();
      }
    };

    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, loading, onCancel]);

  if (!isOpen) {
    return null;
  }

  const confirmButtonClass =
    type === 'danger'
      ? 'bg-red-600 hover:bg-red-700 focus-visible:ring-red-500'
      : type === 'warning'
        ? 'bg-yellow-600 hover:bg-yellow-700 focus-visible:ring-yellow-500'
        : 'bg-blue-600 hover:bg-blue-700 focus-visible:ring-blue-500';

  const iconClass =
    type === 'danger'
      ? 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400'
      : type === 'warning'
        ? 'bg-yellow-100 text-yellow-600 dark:bg-yellow-900/30 dark:text-yellow-400'
        : 'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400';

  return (
    <div
      className="fixed inset-0 z-9999 flex items-center justify-center bg-black/50 px-4"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !loading) {
          onCancel();
        }
      }}
    >
      <div
        className="w-full max-w-md rounded-xl bg-white p-6 shadow-2xl dark:bg-neutral-900"
        role="dialog"
        aria-modal="true"
        aria-labelledby="confirm-modal-title"
        aria-describedby="confirm-modal-message"
      >
        {/* ICON */}

        <div
          className={`mb-4 flex h-12 w-12 items-center justify-center rounded-full ${iconClass}`}
        >
          {type === 'danger' ? (
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-6 w-6"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 9v4m0 4h.01M10.29 3.86l-8.18 14A2 2 0 003.82 21h16.36a2 2 0 001.71-3.14l-8.18-14a2 2 0 00-3.42 0z"
              />
            </svg>
          ) : (
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-6 w-6"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M13 16h-1v-4h-1m1-4h.01M12 3a9 9 0 100 18 9 9 0 000-18z"
              />
            </svg>
          )}
        </div>

        {/* TITLE */}

        <h2
          id="confirm-modal-title"
          className="text-xl font-semibold text-slate-900 dark:text-slate-100"
        >
          {title}
        </h2>

        {/* MESSAGE */}

        <p
          id="confirm-modal-message"
          className="mt-3 text-sm leading-6 text-slate-600 dark:text-slate-400"
        >
          {message}
        </p>

        {/* BUTTONS */}

        <div className="mt-6 flex justify-end gap-3">
          <button
            type="button"
            onClick={onCancel}
            disabled={loading}
            className="rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 disabled:cursor-not-allowed disabled:opacity-50 dark:border-neutral-700 dark:bg-neutral-800 dark:text-slate-300 dark:hover:bg-neutral-700"
          >
            {cancelText}
          </button>

          <button
            type="button"
            onClick={onConfirm}
            disabled={loading}
            className={`rounded-md px-4 py-2 text-sm font-medium text-white transition focus:outline-none focus-visible:ring-2 disabled:cursor-not-allowed disabled:opacity-50 ${confirmButtonClass}`}
          >
            {loading ? 'Processing...' : confirmText}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmModal;
