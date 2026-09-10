'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import toast from 'react-hot-toast';
import ConfirmModal from '../ConfirmModal';

import {
  fetchComponents,
  deleteComponent,
  checkComponentArchive,
} from '@/app/lib/api';

export default function ComponentList({ type }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  // -----------------------------------------
  // ARCHIVE MODAL
  // -----------------------------------------

  const [archiveModal, setArchiveModal] = useState({
    open: false,
    item: null,
  });

  const [archiveLoading, setArchiveLoading] = useState(false);

  const label = type.charAt(0).toUpperCase() + type.slice(1);

  // -----------------------------------------
  // LOAD COMPONENTS
  // -----------------------------------------

  const load = useCallback(async () => {
    setLoading(true);

    try {
      const response = await fetchComponents(type);

      setItems(response?.data || []);
    } catch (error) {
      console.error(error);

      toast.error(`Failed to load ${type}s`);
    } finally {
      setLoading(false);
    }
  }, [type]);

  useEffect(() => {
    load();
  }, [load]);

  // -----------------------------------------
  // CLICK ARCHIVE
  // -----------------------------------------

  const handleArchiveClick = async (item) => {
    const status = item.status || 'ACTIVE';

    if (status === 'ARCHIVED') {
      toast.error(`${item.name} is already archived.`);
      return;
    }

    try {
      // First check whether component is used
      // by an ACTIVE product.

      const response = await checkComponentArchive(type, item._id);

      // Component is being used by an ACTIVE product.

      if (!response?.canArchive) {
        toast.error(response?.message || `${item.name} cannot be archived.`, {
          duration: 5000,
        });

        return;
      }

      // Safe to archive.
      // Open React confirmation modal.

      setArchiveModal({
        open: true,
        item,
      });
    } catch (error) {
      console.error('CHECK COMPONENT ARCHIVE ERROR:', error);

      const message =
        error?.response?.data?.message || `Unable to check ${item.name}`;

      toast.error(message, {
        duration: 5000,
      });
    }
  };

  // -----------------------------------------
  // CLOSE ARCHIVE MODAL
  // -----------------------------------------

  const closeArchiveModal = () => {
    if (archiveLoading) return;

    setArchiveModal({
      open: false,
      item: null,
    });
  };

  // -----------------------------------------
  // CONFIRM ARCHIVE
  // -----------------------------------------

  const confirmArchive = async () => {
    const item = archiveModal.item;

    if (!item) return;

    setArchiveLoading(true);

    try {
      const response = await toast.promise(deleteComponent(type, item._id), {
        loading: `Archiving ${item.name}...`,
        success: `${item.name} archived successfully`,
        error: `Failed to archive ${item.name}`,
      });

      if (response?.success) {
        setItems((prev) =>
          prev.map((x) =>
            x._id === item._id
              ? {
                  ...x,
                  ...response.data,
                  status: 'ARCHIVED',
                }
              : x,
          ),
        );

        setArchiveModal({
          open: false,
          item: null,
        });
      }
    } catch (error) {
      console.error('ARCHIVE COMPONENT ERROR:', error);

      const message =
        error?.response?.data?.message || `Unable to archive ${item.name}`;

      toast.error(message, {
        duration: 5000,
      });
    } finally {
      setArchiveLoading(false);
    }
  };

  // -----------------------------------------
  // STATUS
  // -----------------------------------------

  const getStatus = (item) => {
    return item.status || 'ACTIVE';
  };

  const getStatusClass = (status) => {
    switch (status) {
      case 'ACTIVE':
        return 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400';

      case 'INACTIVE':
        return 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400';

      case 'ARCHIVED':
        return 'bg-slate-100 text-slate-600 dark:bg-neutral-800 dark:text-slate-400';

      default:
        return 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400';
    }
  };

  return (
    <>
      <div className="mx-auto max-w-7xl rounded-xl bg-white p-6 shadow dark:bg-neutral-900">
        {/* HEADER */}

        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">
              {label} Management
            </h1>

            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              Manage {type} components separately.
            </p>
          </div>

          <Link
            href="/dashboard/components/add-component"
            className="rounded-md bg-black px-4 py-2 text-sm font-semibold text-white"
          >
            + Add Component
          </Link>
        </div>

        {/* TABLE */}

        {loading ? (
          <div className="py-12 text-center text-slate-500">
            Loading {type}s...
          </div>
        ) : items.length === 0 ? (
          <div className="rounded-lg border border-dashed py-12 text-center text-slate-500">
            No {type}s found.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-212.5 text-left text-sm">
              <thead className="border-b bg-slate-50 dark:bg-neutral-800">
                <tr>
                  <th className="px-4 py-3">Name</th>

                  <th className="px-4 py-3">Status</th>

                  <th className="px-4 py-3">Colors</th>

                  <th className="px-4 py-3">Sizes / Stock</th>

                  <th className="px-4 py-3">Updated</th>

                  <th className="px-4 py-3">Actions</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-200 dark:divide-neutral-700">
                {items.map((item) => {
                  const status = getStatus(item);

                  return (
                    <tr key={item._id}>
                      {/* NAME */}

                      <td className="px-4 py-4 align-top font-semibold text-slate-800 dark:text-slate-200">
                        {item.name}
                      </td>

                      {/* STATUS */}

                      <td className="px-4 py-4 align-top">
                        <span
                          className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${getStatusClass(
                            status,
                          )}`}
                        >
                          {status}
                        </span>
                      </td>

                      {/* COLORS */}

                      <td className="px-4 py-4 align-top">
                        <div className="flex max-w-90 flex-wrap gap-2">
                          {(item.colors || []).map((color) => (
                            <div
                              key={color._id}
                              className="flex items-center gap-2 rounded-md border border-slate-200 px-2 py-1 dark:border-neutral-700"
                            >
                              {color.image ? (
                                <div className="relative h-8 w-8 overflow-hidden rounded border">
                                  <Image
                                    src={color.image}
                                    alt={color.colorName || 'Component color'}
                                    fill
                                    sizes="32px"
                                    className="object-contain"
                                  />
                                </div>
                              ) : (
                                <div className="h-8 w-8 rounded border bg-slate-200" />
                              )}

                              <span className="text-slate-700 dark:text-slate-300">
                                {color.colorName}
                              </span>
                            </div>
                          ))}
                        </div>
                      </td>

                      {/* SIZE / STOCK */}

                      <td className="px-4 py-4 align-top text-slate-600 dark:text-slate-400">
                        <div className="space-y-1">
                          {(item.colors || []).map((color) => (
                            <div key={color._id}>
                              <span className="font-medium text-slate-700 dark:text-slate-300">
                                {color.colorName}:
                              </span>{' '}
                              {(color.variants || [])
                                .map(
                                  (variant) =>
                                    `${variant.size} (${variant.stockQuantity})`,
                                )
                                .join(', ')}
                            </div>
                          ))}
                        </div>
                      </td>

                      {/* UPDATED */}

                      <td className="px-4 py-4 align-top text-slate-500">
                        {item.updatedAt
                          ? new Date(item.updatedAt).toLocaleDateString()
                          : '-'}
                      </td>

                      {/* ACTIONS */}

                      <td className="px-4 py-4 align-top">
                        <div className="flex flex-col items-center justify-center gap-3">
                          {/* EDIT */}

                          <Link
                            href={`/dashboard/components/${type}/edit/${item._id}`}
                            className={`w-40 rounded-md p-2 text-center font-medium text-white ${
                              status === 'ARCHIVED'
                                ? 'pointer-events-none cursor-not-allowed bg-slate-400'
                                : 'bg-blue-600 hover:bg-blue-700'
                            }`}
                          >
                            {status === 'ARCHIVED' ? 'Archived' : 'Edit Full'}
                          </Link>

                          {/* ARCHIVE */}

                          {status !== 'ARCHIVED' && (
                            <button
                              type="button"
                              onClick={() => handleArchiveClick(item)}
                              className="w-40 rounded-md bg-red-600 p-2 text-center font-medium text-white hover:bg-red-700"
                            >
                              Archive
                            </button>
                          )}

                          {/* ARCHIVED */}

                          {status === 'ARCHIVED' && (
                            <span className="font-medium text-slate-500 dark:text-slate-400">
                              Component Archived
                            </span>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
      <ConfirmModal
        isOpen={archiveModal.open}
        title={`Archive ${label}?`}
        message={
          archiveModal.item
            ? `Are you sure you want to archive "${archiveModal.item.name}"? This component will no longer be available for new product configuration. Existing product and order references will be preserved.`
            : ''
        }
        confirmText="Yes, Archive"
        cancelText="Cancel"
        onConfirm={confirmArchive}
        onCancel={closeArchiveModal}
        loading={archiveLoading}
        type="danger"
      />
    </>
  );
}
