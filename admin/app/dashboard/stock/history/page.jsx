'use client';

import React, { useEffect, useState } from 'react';
import {
  FiSearch,
  FiRefreshCw,
  FiChevronLeft,
  FiChevronRight,
  FiFilter,
  FiClock,
  FiPackage,
} from 'react-icons/fi';
import Link from 'next/link';

import { fetchInventoryHistory } from '@/app/lib/api';

const ITEM_TYPES = [
  { value: '', label: 'All Stock' },
  { value: 'STANDARD', label: 'Standard Product' },
  { value: 'BASE', label: 'Base / Sole' },
  { value: 'STRAP', label: 'Strap' },
  { value: 'THUMB', label: 'Thumb' },
];

const TRANSACTION_TYPES = [
  { value: '', label: 'All Transactions' },
  { value: 'STOCK_IN', label: 'Stock In' },
  { value: 'STOCK_OUT', label: 'Stock Out' },
  { value: 'ORDER', label: 'Order' },
  { value: 'RETURN', label: 'Return' },
  { value: 'CANCEL', label: 'Cancel' },
  { value: 'DAMAGE', label: 'Damage' },
  { value: 'ADJUSTMENT', label: 'Adjustment' },
];

const getItemName = (item) => {
  if (item.itemType === 'STANDARD') {
    return item.productId?.name || item.productId?.productCode || '-';
  }

  return item.component?.name || '-';
};

const getItemTypeLabel = (type) => {
  switch (type) {
    case 'STANDARD':
      return 'Standard';
    case 'BASE':
      return 'Base';
    case 'STRAP':
      return 'Strap';
    case 'THUMB':
      return 'Thumb';
    default:
      return type || '-';
  }
};

const getTransactionLabel = (type) => {
  switch (type) {
    case 'STOCK_IN':
      return 'Stock In';
    case 'STOCK_OUT':
      return 'Stock Out';
    case 'ORDER':
      return 'Order';
    case 'RETURN':
      return 'Return';
    case 'CANCEL':
      return 'Cancel';
    case 'DAMAGE':
      return 'Damage';
    case 'ADJUSTMENT':
      return 'Adjustment';
    default:
      return type || '-';
  }
};

const formatDate = (date) => {
  if (!date) return '-';

  return new Date(date).toLocaleString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

const getTransactionClass = (type) => {
  if (type === 'STOCK_IN' || type === 'RETURN' || type === 'CANCEL') {
    return 'bg-green-100 text-green-700';
  }

  if (type === 'STOCK_OUT' || type === 'ORDER' || type === 'DAMAGE') {
    return 'bg-red-100 text-red-700';
  }

  return 'bg-yellow-100 text-yellow-700';
};

export default function StockHistoryPage() {
  const [history, setHistory] = useState([]);

  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState('');
  const [itemType, setItemType] = useState('');
  const [transactionType, setTransactionType] = useState('');

  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const [page, setPage] = useState(1);

  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0,
    hasNextPage: false,
    hasPreviousPage: false,
  });

  const loadHistory = async () => {
    try {
      setLoading(true);

      const response = await fetchInventoryHistory({
        page,
        limit: 20,
        search: search.trim() || undefined,
        itemType: itemType || undefined,
        type: transactionType || undefined,
        startDate: startDate || undefined,
        endDate: endDate || undefined,
      });

      if (response?.success) {
        setHistory(response.data || []);
        setPagination(
          response.pagination || {
            page: 1,
            limit: 20,
            total: 0,
            totalPages: 0,
            hasNextPage: false,
            hasPreviousPage: false,
          },
        );
      } else {
        setHistory([]);
      }
    } catch (error) {
      console.error('Failed to load stock history:', error);

      setHistory([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadHistory();
  }, [page, itemType, transactionType, startDate, endDate]);

  const handleSearch = (e) => {
    e.preventDefault();

    setPage(1);
    loadHistory();
  };

  const clearFilters = () => {
    setSearch('');
    setItemType('');
    setTransactionType('');
    setStartDate('');
    setEndDate('');
    setPage(1);
  };

  return (
    <>
      <div className="mb-6 flex items-center gap-2 border-b border-gray-200">
        <Link
          href="/dashboard/stock"
          className="inline-flex items-center gap-2 border-b-2 border-transparent px-4 py-3 text-sm font-medium text-gray-500 hover:border-gray-300 hover:text-gray-900"
        >
          <FiPackage size={16} />
          Stock List
        </Link>

        <Link
          href="/dashboard/stock/history"
          className="inline-flex items-center gap-2 border-b-2 border-black px-4 py-3 text-sm font-medium text-gray-900"
        >
          <FiClock size={16} />
          Stock History
        </Link>
      </div>
      <div className="p-6">
        {/* Header */}
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between mb-6">
          <div>
            <h1 className="text-2xl font-semibold text-gray-800">
              Stock History
            </h1>

            <p className="text-sm text-gray-500 mt-1">
              Track stock updates, changes and inventory transactions.
            </p>
          </div>

          <button
            type="button"
            onClick={loadHistory}
            disabled={loading}
            className="inline-flex items-center justify-center gap-2 rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
          >
            <FiRefreshCw size={16} className={loading ? 'animate-spin' : ''} />
            Refresh
          </button>
        </div>

        {/* Filters */}
        <div className="bg-white border border-gray-200 rounded-xl p-4 mb-5">
          <div className="flex items-center gap-2 mb-4">
            <FiFilter size={17} className="text-gray-600" />

            <h2 className="text-sm font-semibold text-gray-700">Filters</h2>
          </div>

          <form
            onSubmit={handleSearch}
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-3"
          >
            {/* Search */}
            <div className="relative lg:col-span-2">
              <FiSearch
                size={17}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
              />

              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search product, component, user..."
                className="w-full rounded-lg border border-gray-200 py-2.5 pl-10 pr-3 text-sm outline-none focus:border-gray-400"
              />
            </div>

            {/* Item type */}
            <select
              value={itemType}
              onChange={(e) => {
                setItemType(e.target.value);
                setPage(1);
              }}
              className="rounded-lg border border-gray-200 px-3 py-2.5 text-sm text-gray-700 outline-none focus:border-gray-400"
            >
              {ITEM_TYPES.map((item) => (
                <option key={item.value} value={item.value}>
                  {item.label}
                </option>
              ))}
            </select>

            {/* Transaction */}
            <select
              value={transactionType}
              onChange={(e) => {
                setTransactionType(e.target.value);
                setPage(1);
              }}
              className="rounded-lg border border-gray-200 px-3 py-2.5 text-sm text-gray-700 outline-none focus:border-gray-400"
            >
              {TRANSACTION_TYPES.map((item) => (
                <option key={item.value} value={item.value}>
                  {item.label}
                </option>
              ))}
            </select>

            {/* Search button */}
            <button
              type="submit"
              className="rounded-lg bg-black px-4 py-2.5 text-sm font-medium text-white hover:bg-gray-800"
            >
              Search
            </button>

            {/* Start date */}
            <div>
              <label className="block text-xs text-gray-500 mb-1">
                Start Date
              </label>

              <input
                type="date"
                value={startDate}
                onChange={(e) => {
                  setStartDate(e.target.value);
                  setPage(1);
                }}
                className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm outline-none focus:border-gray-400"
              />
            </div>

            {/* End date */}
            <div>
              <label className="block text-xs text-gray-500 mb-1">
                End Date
              </label>

              <input
                type="date"
                value={endDate}
                onChange={(e) => {
                  setEndDate(e.target.value);
                  setPage(1);
                }}
                className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm outline-none focus:border-gray-400"
              />
            </div>

            {/* Clear */}
            <button
              type="button"
              onClick={clearFilters}
              className="self-end rounded-lg border border-gray-200 bg-white px-4 py-2.5 text-sm font-medium text-gray-600 hover:bg-gray-50"
            >
              Clear Filters
            </button>
          </form>
        </div>

        {/* Summary */}
        <div className="flex items-center justify-between mb-3">
          <p className="text-sm text-gray-500">
            {pagination.total || 0} transaction
            {pagination.total === 1 ? '' : 's'} found
          </p>

          {loading && <p className="text-sm text-gray-400">Loading...</p>}
        </div>

        {/* Table */}
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-300 text-sm">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50">
                  <th className="text-left px-4 py-3 font-semibold text-gray-600">
                    Date
                  </th>

                  <th className="text-left px-4 py-3 font-semibold text-gray-600">
                    Updated By
                  </th>

                  <th className="text-left px-4 py-3 font-semibold text-gray-600">
                    Stock Type
                  </th>

                  <th className="text-left px-4 py-3 font-semibold text-gray-600">
                    Product / Component
                  </th>

                  <th className="text-left px-4 py-3 font-semibold text-gray-600">
                    Color
                  </th>

                  <th className="text-left px-4 py-3 font-semibold text-gray-600">
                    Size
                  </th>

                  <th className="text-right px-4 py-3 font-semibold text-gray-600">
                    Previous
                  </th>

                  <th className="text-right px-4 py-3 font-semibold text-gray-600">
                    Change
                  </th>

                  <th className="text-right px-4 py-3 font-semibold text-gray-600">
                    New Stock
                  </th>

                  <th className="text-left px-4 py-3 font-semibold text-gray-600">
                    Transaction
                  </th>

                  <th className="text-left px-4 py-3 font-semibold text-gray-600">
                    Reason
                  </th>
                </tr>
              </thead>

              <tbody>
                {loading ? (
                  <tr>
                    <td
                      colSpan="11"
                      className="px-4 py-12 text-center text-gray-400"
                    >
                      Loading stock history...
                    </td>
                  </tr>
                ) : history.length === 0 ? (
                  <tr>
                    <td
                      colSpan="11"
                      className="px-4 py-12 text-center text-gray-400"
                    >
                      No stock history found.
                    </td>
                  </tr>
                ) : (
                  history.map((item) => {
                    const quantity = Number(item.quantity || 0);

                    const isAddition =
                      item.type === 'STOCK_IN' ||
                      item.type === 'RETURN' ||
                      item.type === 'CANCEL';

                    return (
                      <tr
                        key={item._id}
                        className="border-b border-gray-100 last:border-b-0 hover:bg-gray-50"
                      >
                        {/* Date */}
                        <td className="px-4 py-3 text-gray-600 whitespace-nowrap">
                          {formatDate(item.createdAt)}
                        </td>

                        {/* User */}
                        <td className="px-4 py-3">
                          <div className="font-medium text-gray-700">
                            {item.performedBy?.name || 'System'}
                          </div>

                          {item.performedBy?.email && (
                            <div className="text-xs text-gray-400 mt-0.5">
                              {item.performedBy.email}
                            </div>
                          )}
                        </td>

                        {/* Item type */}
                        <td className="px-4 py-3">
                          <span className="inline-flex rounded-md bg-gray-100 px-2 py-1 text-xs font-medium text-gray-700">
                            {getItemTypeLabel(item.itemType)}
                          </span>
                        </td>

                        {/* Product / Component */}
                        <td className="px-4 py-3">
                          <div className="font-medium text-gray-700">
                            {getItemName(item)}
                          </div>

                          {item.productId?.productCode && (
                            <div className="text-xs text-gray-400 mt-0.5">
                              {item.productId.productCode}
                            </div>
                          )}
                        </td>

                        {/* Color */}
                        <td className="px-4 py-3 text-gray-600">
                          {item.color?.colorName || '-'}
                        </td>

                        {/* Size */}
                        <td className="px-4 py-3 text-gray-600">
                          {item.size || '-'}
                        </td>

                        {/* Previous */}
                        <td className="px-4 py-3 text-right font-medium text-gray-700">
                          {item.previousStock ?? 0}
                        </td>

                        {/* Change */}
                        <td className="px-4 py-3 text-right">
                          <span
                            className={
                              isAddition
                                ? 'font-semibold text-green-600'
                                : 'font-semibold text-red-600'
                            }
                          >
                            {isAddition ? '+' : '-'}
                            {quantity}
                          </span>
                        </td>

                        {/* New */}
                        <td className="px-4 py-3 text-right font-semibold text-gray-800">
                          {item.newStock ?? 0}
                        </td>

                        {/* Transaction */}
                        <td className="px-4 py-3">
                          <span
                            className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${getTransactionClass(
                              item.type,
                            )}`}
                          >
                            {getTransactionLabel(item.type)}
                          </span>
                        </td>

                        {/* Reason */}
                        <td
                          className="px-4 py-3 text-gray-500 max-w-55"
                          title={item.reason || ''}
                        >
                          <span className="line-clamp-2">
                            {item.reason || '-'}
                          </span>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {!loading && pagination.totalPages > 0 && (
            <div className="flex items-center justify-between border-t border-gray-200 px-4 py-3">
              <div className="text-sm text-gray-500">
                Page {pagination.page} of {pagination.totalPages}
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={!pagination.hasPreviousPage}
                  onClick={() => setPage((prev) => Math.max(prev - 1, 1))}
                  className="inline-flex items-center gap-1 rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-600 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <FiChevronLeft size={16} />
                  Previous
                </button>

                <button
                  type="button"
                  disabled={!pagination.hasNextPage}
                  onClick={() => setPage((prev) => prev + 1)}
                  className="inline-flex items-center gap-1 rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-600 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Next
                  <FiChevronRight size={16} />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
