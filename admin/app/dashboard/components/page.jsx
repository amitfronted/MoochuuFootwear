'use client';

import React, { useEffect, useState, useCallback } from 'react';
import Image from 'next/image';
import EditComponentModal from '../../components/EditComponentModal';
import DataTable from '../../components/DataTable';
import toast from 'react-hot-toast';
import {
  fetchComponents,
  deleteComponent,
  updateComponent,
} from '../../lib/api';

const Components = () => {
  const [activeTab, setActiveTab] = useState('base'); // 'base' | 'strap' | 'thumb'
  const [components, setComponents] = useState([]);
  const [loading, setLoading] = useState(true);

  //Edit model state
  const [selectedComponent, setSelectedComponent] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const loadComponents = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetchComponents(activeTab);
      if (response.success) {
        setComponents(response.data || []);
      } else {
        setComponents([]);
      }
    } catch (error) {
      console.error(`Failed to fetch ${activeTab} components:`, error);
      setComponents([]);
    } finally {
      setLoading(false);
    }
  }, [activeTab]);

  useEffect(() => {
    loadComponents();
  }, [loadComponents]);

  const handleEdit = (row) => {
    setSelectedComponent(row);
    setIsModalOpen(true);
  };

  const handleSaveUpdate = async (id, payload) => {
    try {
      const response = await toast.promise(
        updateComponent(activeTab, id, payload),
        {
          loading: `Updating ${activeTab} component...`,
          success: 'Component updated successfully',
          error: 'Failed to update component',
        },
      );
      if (response.success) {
        setComponents((prev) =>
          prev.map((item) => (item._id === id ? response.data : item)),
        );
        setIsModalOpen(false);
        setSelectedComponent(null);
      }
    } catch (error) {
      console.error(`Failed to update ${activeTab} component:`, error);
    }
  };

  const handleDelete = (row) => {
    // Archived components cannot be archived again
    if (row.status === 'ARCHIVED') {
      toast.error('This component is already archived.');
      return;
    }

    toast(
      (t) => (
        <div className="flex flex-col gap-3 min-w-70">
          <p className="font-medium text-slate-800 dark:text-slate-200">
            Are you sure you want to archive "{row.name}"?
          </p>

          <p className="text-xs text-slate-500 dark:text-slate-400">
            This component will no longer be available for new product
            configuration.
          </p>

          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => toast.dismiss(t.id)}
              className="px-3 py-1.5 text-sm rounded-md bg-slate-200 text-slate-700 hover:bg-slate-300"
            >
              Cancel
            </button>

            <button
              type="button"
              onClick={async () => {
                toast.dismiss(t.id);

                try {
                  const response = await toast.promise(
                    deleteComponent(activeTab, row._id),
                    {
                      loading: `Archiving "${row.name}"...`,
                      success: `"${row.name}" archived successfully`,
                      error: `Failed to archive "${row.name}"`,
                    },
                  );

                  if (response.success) {
                    setComponents((prev) =>
                      prev.map((item) =>
                        item._id === row._id
                          ? {
                              ...item,
                              ...response.data,
                              status: 'ARCHIVED',
                            }
                          : item,
                      ),
                    );
                  }
                } catch (error) {
                  console.error(
                    `Failed to archive ${activeTab} component:`,
                    error,
                  );
                }
              }}
              className="px-3 py-1.5 text-sm rounded-md bg-red-600 text-white hover:bg-red-700"
            >
              Archive
            </button>
          </div>
        </div>
      ),
      {
        duration: Infinity,
      },
    );
  };

  const columns = [
    {
      key: 'name',
      label: 'Component Name',
      render: (row) => (
        <span className="font-medium text-slate-800 dark:text-slate-200">
          {row.name}
        </span>
      ),
    },
    {
      key: 'status',
      label: 'Status',
      render: (row) => {
        const status = row.status || 'ACTIVE';

        return (
          <span
            className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${
              status === 'ACTIVE'
                ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                : status === 'INACTIVE'
                  ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400'
                  : 'bg-slate-100 text-slate-600 dark:bg-neutral-800 dark:text-slate-400'
            }`}
          >
            {status}
          </span>
        );
      },
    },
    {
      key: 'colors',
      label: 'Colors & Images',
      render: (row) => (
        <div className="flex flex-wrap gap-3">
          {row.colors && row.colors.length > 0 ? (
            row.colors.map((c, index) => (
              <div
                key={c._id || index}
                className="flex items-center gap-2 bg-slate-50 dark:bg-neutral-800 border border-slate-200 dark:border-neutral-700 rounded-md p-1.5"
              >
                {c.image ? (
                  <div className="relative h-8 w-8 rounded overflow-hidden border border-slate-300">
                    <Image
                      src={c.image}
                      alt={c.colorName || 'Component image'}
                      fill
                      className="object-cover"
                      sizes="32px"
                    />
                  </div>
                ) : (
                  <div
                    className="h-8 w-8 rounded border border-slate-300"
                    style={{ backgroundColor: c.colorCode || '#ccc' }}
                  />
                )}
                <div className="text-xs">
                  <p className="font-semibold text-slate-700 dark:text-slate-300">
                    {c.colorName || 'N/A'}
                  </p>
                  {c.price !== undefined && (
                    <p className="text-slate-500">${c.price}</p>
                  )}
                </div>
              </div>
            ))
          ) : (
            <span className="text-slate-400 text-xs">No color variants</span>
          )}
        </div>
      ),
    },
    {
      key: 'createdAt',
      label: 'Created At',
      render: (row) =>
        row.createdAt ? new Date(row.createdAt).toLocaleDateString() : 'N/A',
    },
  ];

  return (
    <div className="mx-auto max-w-7xl p-6 bg-white dark:bg-neutral-900 shadow rounded-lg mt-8">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">
          Component Management
        </h1>

        {/* Tab Switcher */}
        <div className="flex bg-slate-100 dark:bg-neutral-800 p-1 rounded-lg border border-slate-200 dark:border-neutral-700">
          {['base', 'strap', 'thumb'].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-1.5 text-sm font-medium rounded-md capitalize transition-all ${
                activeTab === tab
                  ? 'bg-white dark:bg-neutral-700 text-slate-900 dark:text-slate-100 shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>

      {/* Component Table */}
      <DataTable
        data={components}
        columns={columns}
        onEdit={handleEdit}
        onDelete={handleDelete}
        loading={loading}
      />
      <EditComponentModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        component={selectedComponent}
        onSave={handleSaveUpdate}
      />
    </div>
  );
};

export default Components;
