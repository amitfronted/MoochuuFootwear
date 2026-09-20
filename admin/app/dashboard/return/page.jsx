'use client';

import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { FiCheck, FiEye, FiRefreshCw, FiSearch, FiX } from 'react-icons/fi';

import {
  fetchReturnRequests,
  approveOrderReturn,
  rejectOrderReturn,
  completeOrderReturn,
} from '../../lib/api';

const reasonLabels = {
  WRONG_PRODUCT: 'Wrong Product',
  DAMAGED_PRODUCT: 'Damaged Product',
  DEFECTIVE_PRODUCT: 'Defective Product',
  SIZE_ISSUE: 'Size Issue',
  QUALITY_ISSUE: 'Quality Issue',
  OTHER: 'Other',
};

const statusStyles = {
  REQUESTED: 'bg-yellow-100 text-yellow-700',
  APPROVED: 'bg-blue-100 text-blue-700',
  REJECTED: 'bg-red-100 text-red-700',
  COMPLETED: 'bg-green-100 text-green-700',
};

const formatDate = (date) => {
  if (!date) return '-';

  return new Date(date).toLocaleString('en-IN', {
    dateStyle: 'medium',
    timeStyle: 'short',
  });
};

export default function ReturnsPage() {
  const [returns, setReturns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState(null);

  const [search, setSearch] = useState('');

  const [selectedReturn, setSelectedReturn] = useState(null);

  const [rejectModal, setRejectModal] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');
  const [completeModal, setCompleteModal] = useState(false);
  const [completeReturnData, setCompleteReturnData] = useState(null);
  const [inspectionCondition, setInspectionCondition] = useState('');
  const [inspectionComment, setInspectionComment] = useState('');

  const loadReturns = async () => {
    try {
      setLoading(true);

      const response = await fetchReturnRequests();

      if (response?.success) {
        setReturns(response.data || []);
      } else {
        toast.error(response?.message || 'Unable to fetch return requests.');
      }
    } catch (error) {
      toast.error(
        error.response?.data?.message ||
          error.message ||
          'Unable to fetch return requests.',
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadReturns();
  }, []);

  const handleApprove = async (orderId) => {
    try {
      setProcessingId(orderId);

      const response = await approveOrderReturn(orderId);

      if (!response?.success) {
        toast.error(response?.message || 'Unable to approve return.');
        return;
      }

      toast.success('Return request approved.');

      setSelectedReturn(null);

      await loadReturns();
    } catch (error) {
      toast.error(
        error.response?.data?.message ||
          error.message ||
          'Unable to approve return.',
      );
    } finally {
      setProcessingId(null);
    }
  };

  const openRejectModal = (returnRequest) => {
    setSelectedReturn(returnRequest);
    setRejectionReason('');
    setRejectModal(true);
  };

  const handleReject = async () => {
    if (!selectedReturn?._id) return;

    const reason = rejectionReason.trim();

    if (!reason) {
      toast.error('Please enter rejection reason.');
      return;
    }

    if (reason.length > 500) {
      toast.error('Rejection reason cannot exceed 500 characters.');
      return;
    }

    try {
      setProcessingId(selectedReturn._id);

      const response = await rejectOrderReturn(selectedReturn._id, reason);

      if (!response?.success) {
        toast.error(response?.message || 'Unable to reject return.');
        return;
      }

      toast.success('Return request rejected.');

      setRejectModal(false);
      setSelectedReturn(null);
      setRejectionReason('');

      await loadReturns();
    } catch (error) {
      toast.error(
        error.response?.data?.message ||
          error.message ||
          'Unable to reject return.',
      );
    } finally {
      setProcessingId(null);
    }
  };

  const openCompleteModal = (returnData) => {
    setCompleteReturnData(returnData);
    setInspectionCondition('');
    setInspectionComment('');
    setCompleteModal(true);
  };

  const closeCompleteModal = () => {
    if (processingId) return;

    setCompleteModal(false);
    setCompleteReturnData(null);
    setInspectionCondition('');
    setInspectionComment('');
  };

  const handleComplete = async () => {
    if (!completeReturnData?._id) return;

    if (!inspectionCondition) {
      toast.error('Please select the returned product condition.');
      return;
    }

    if (inspectionCondition === 'DAMAGED' && !inspectionComment.trim()) {
      toast.error('Please provide a comment for the damaged product.');
      return;
    }

    try {
      setProcessingId(completeReturnData._id);

      const response = await completeOrderReturn(completeReturnData._id, {
        condition: inspectionCondition,
        conditionComment: inspectionComment.trim(),
      });

      if (!response?.success) {
        throw new Error(response?.message || 'Unable to complete return.');
      }

      toast.success(response.message || 'Return completed successfully.');

      closeCompleteModal();
      setSelectedReturn(null);

      await loadReturns();
    } catch (error) {
      toast.error(
        error.response?.data?.message ||
          error.message ||
          'Unable to complete return.',
      );
    } finally {
      setProcessingId(null);
    }
  };

  const filteredReturns = returns.filter((item) => {
    const searchText = search.trim().toLowerCase();

    if (!searchText) return true;

    const orderNumber = item.orderNumber?.toLowerCase() || '';

    const userName = item.userId?.name?.toLowerCase() || '';

    const userEmail = item.userId?.email?.toLowerCase() || '';

    return (
      orderNumber.includes(searchText) ||
      userName.includes(searchText) ||
      userEmail.includes(searchText)
    );
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">
            Return Requests
          </h1>

          <p className="mt-1 text-sm text-gray-500">
            Manage customer return requests.
          </p>
        </div>

        <button
          type="button"
          onClick={loadReturns}
          disabled={loading}
          className="inline-flex items-center justify-center gap-2 rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <FiRefreshCw className={loading ? 'animate-spin' : ''} />
          Refresh
        </button>
      </div>

      {/* Search */}
      <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
        <div className="relative max-w-md">
          <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />

          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search order, customer or email..."
            className="w-full rounded-lg border border-gray-200 py-2.5 pl-10 pr-4 text-sm outline-none transition focus:border-gray-400"
          />
        </div>
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                  Order
                </th>

                <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                  Customer
                </th>

                <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                  Return
                </th>

                <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                  Refund
                </th>

                <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                  Requested
                </th>

                <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                  Status
                </th>

                <th className="px-6 py-4 text-right text-xs font-semibold uppercase tracking-wide text-gray-500">
                  Action
                </th>
              </tr>
            </thead>

            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr>
                  <td
                    colSpan={7}
                    className="px-6 py-12 text-center text-sm text-gray-500"
                  >
                    Loading return requests...
                  </td>
                </tr>
              ) : filteredReturns.length === 0 ? (
                <tr>
                  <td
                    colSpan={7}
                    className="px-6 py-12 text-center text-sm text-gray-500"
                  >
                    No return requests found.
                  </td>
                </tr>
              ) : (
                filteredReturns.map((item) => (
                  <tr key={item._id} className="hover:bg-gray-50">
                    <td className="whitespace-nowrap px-6 py-4">
                      <div className="text-sm font-semibold text-gray-900">
                        {item.orderNumber || '-'}
                      </div>

                      <div className="mt-1 text-xs text-gray-500">
                        ₹{Number(item.totalAmount || 0).toFixed(2)}
                      </div>
                    </td>

                    <td className="px-6 py-4">
                      <div className="text-sm font-medium text-gray-900">
                        {item.userId?.name || '-'}
                      </div>

                      <div className="mt-1 text-xs text-gray-500">
                        {item.userId?.email || '-'}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-col items-center gap-1">
                        <span
                          className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${
                            item.returnRequest?.returnType === 'FULL'
                              ? 'bg-purple-100 text-purple-700'
                              : 'bg-orange-100 text-orange-700'
                          }`}
                        >
                          {item.returnRequest?.returnType || '-'}
                        </span>

                        <span className="text-xs text-gray-500">
                          {item.returnRequest?.items?.length || 0} item
                          {item.returnRequest?.items?.length === 1 ? '' : 's'}
                        </span>
                      </div>
                    </td>

                    <td className="px-6 py-4">
                      {item.refundPreview?.error ? (
                        <span className="text-xs text-red-600">
                          Calculation error
                        </span>
                      ) : item.paymentMethod === 'ONLINE' ? (
                        <div>
                          <div className="text-sm font-semibold text-gray-900">
                            ₹
                            {Number(
                              item.refundPreview?.refundAmount || 0,
                            ).toFixed(2)}
                          </div>

                          <div className="mt-1 text-xs text-gray-500">
                            Remaining: ₹
                            {Number(
                              item.refundPreview?.remainingRefundableAmount ||
                                0,
                            ).toFixed(2)}
                          </div>
                        </div>
                      ) : (
                        <div>
                          <div className="text-sm font-semibold text-gray-700">
                            ₹
                            {Number(
                              item.refundPreview?.refundAmount || 0,
                            ).toFixed(2)}
                          </div>

                          <div className="mt-1 text-xs text-gray-500">COD</div>
                        </div>
                      )}
                    </td>

                    <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-600">
                      {formatDate(item.returnRequest?.requestedAt)}
                    </td>

                    <td className="px-6 py-4">
                      <span
                        className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${
                          statusStyles[item.returnStatus] ||
                          'bg-gray-100 text-gray-700'
                        }`}
                      >
                        {item.returnStatus || 'NONE'}
                      </span>
                    </td>

                    <td className="px-6 py-4 text-right">
                      <button
                        type="button"
                        onClick={() => setSelectedReturn(item)}
                        className="inline-flex items-center gap-2 rounded-lg border border-gray-200 px-3 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-50"
                      >
                        <FiEye />
                        View
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Return Details Modal */}
      {selectedReturn && !rejectModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-4xl rounded-xl bg-white shadow-xl max-h-3/4 overflow-y-scroll">
            <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">
                  Return Details
                </h2>

                <p className="mt-1 text-sm text-gray-500">
                  {selectedReturn.orderNumber}
                </p>
              </div>

              <button
                type="button"
                onClick={() => setSelectedReturn(null)}
                className="rounded-lg p-2 text-gray-500 hover:bg-gray-100 hover:text-gray-700"
              >
                <FiX size={20} />
              </button>
            </div>

            <div className="space-y-5 p-6">
              {/* Customer */}
              <div>
                <h3 className="mb-2 text-sm font-semibold text-gray-900">
                  Customer
                </h3>

                <div className="rounded-lg bg-gray-50 p-4">
                  <p className="text-sm font-medium text-gray-900">
                    {selectedReturn.userId?.name || '-'}
                  </p>

                  <p className="mt-1 text-sm text-gray-500">
                    {selectedReturn.userId?.email || '-'}
                  </p>
                </div>
              </div>

              {/* Order */}
              <div>
                <h3 className="mb-2 text-sm font-semibold text-gray-900">
                  Order Information
                </h3>

                <div className="grid gap-4 rounded-lg bg-gray-50 p-4 sm:grid-cols-2">
                  <div>
                    <p className="text-xs text-gray-500">Order Number</p>

                    <p className="mt-1 text-sm font-medium text-gray-900">
                      {selectedReturn.orderNumber || '-'}
                    </p>
                  </div>

                  <div>
                    <p className="text-xs text-gray-500">Order Status</p>

                    <p className="mt-1 text-sm font-medium text-gray-900">
                      {selectedReturn.orderStatus || '-'}
                    </p>
                  </div>

                  <div>
                    <p className="text-xs text-gray-500">Payment Method</p>

                    <p className="mt-1 text-sm font-medium text-gray-900">
                      {selectedReturn.paymentMethod || '-'}
                    </p>
                  </div>

                  <div>
                    <p className="text-xs text-gray-500">Payment Status</p>

                    <p className="mt-1 text-sm font-medium text-gray-900">
                      {selectedReturn.paymentStatus || '-'}
                    </p>
                  </div>
                  {selectedReturn.paymentStatus === 'REFUNDED' && (
                    <div>
                      <p className="text-xs text-gray-500">Refund ID</p>

                      <p className="mt-1 break-all text-sm font-medium text-gray-900">
                        {selectedReturn.refundId || '-'}
                      </p>
                    </div>
                  )}

                  <div>
                    <p className="text-xs text-gray-500">Total Amount</p>

                    <p className="mt-1 text-sm font-medium text-gray-900">
                      ₹{Number(selectedReturn.totalAmount || 0).toFixed(2)}
                    </p>
                  </div>

                  <div>
                    <p className="text-xs text-gray-500">Delivered At</p>

                    <p className="mt-1 text-sm font-medium text-gray-900">
                      {formatDate(selectedReturn.deliveredAt)}
                    </p>
                  </div>
                </div>
              </div>

              {/* Return */}
              <div>
                <h3 className="mb-2 text-sm font-semibold text-gray-900">
                  Return Request
                </h3>
                <div className="mb-4 flex flex-wrap items-center gap-3">
                  <span className="text-sm font-medium text-gray-900">
                    Return Type:
                  </span>

                  <span
                    className={`rounded-full px-3 py-1 text-xs font-semibold ${
                      selectedReturn.returnRequest?.returnType === 'FULL'
                        ? 'bg-purple-100 text-purple-700'
                        : 'bg-orange-100 text-orange-700'
                    }`}
                  >
                    {selectedReturn.returnRequest?.returnType || '-'}
                  </span>
                </div>
                <div className="rounded-lg border border-gray-200 p-4">
                  <div className="flex flex-wrap items-center gap-3">
                    <span className="text-sm font-medium text-gray-900">
                      Reason:
                    </span>

                    <span className="text-sm text-gray-600">
                      {reasonLabels[selectedReturn.returnRequest?.reason] ||
                        selectedReturn.returnRequest?.reason ||
                        '-'}
                    </span>

                    <span
                      className={`rounded-full px-3 py-1 text-xs font-semibold ${
                        statusStyles[selectedReturn.returnStatus] ||
                        'bg-gray-100 text-gray-700'
                      }`}
                    >
                      {selectedReturn.returnStatus}
                    </span>
                  </div>

                  <div className="mt-4">
                    <p className="text-xs font-medium text-gray-500">
                      Customer Comment
                    </p>

                    <p className="mt-1 whitespace-pre-wrap text-sm text-gray-700">
                      {selectedReturn.returnRequest?.comment ||
                        'No comment provided.'}
                    </p>
                  </div>

                  {selectedReturn.returnRequest?.rejectionReason && (
                    <div className="mt-4 rounded-lg bg-red-50 p-3">
                      <p className="text-xs font-medium text-red-600">
                        Rejection Reason
                      </p>

                      <p className="mt-1 text-sm text-red-700">
                        {selectedReturn.returnRequest.rejectionReason}
                      </p>
                    </div>
                  )}
                </div>
              </div>
              {/* Returned Items */}
              <div>
                <h3 className="mb-2 text-sm font-semibold text-gray-900">
                  Returned Items
                </h3>

                {Array.isArray(selectedReturn.returnRequest?.items) &&
                selectedReturn.returnRequest.items.length > 0 ? (
                  <div className="space-y-3">
                    {selectedReturn.returnRequest.items.map(
                      (returnItem, index) => {
                        const orderItem = selectedReturn.items?.find(
                          (item) =>
                            String(item._id) === String(returnItem.orderItemId),
                        );

                        return (
                          <div
                            key={`${returnItem.orderItemId}-${index}`}
                            className="rounded-lg border border-gray-200 bg-gray-50 p-4"
                          >
                            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                              <div>
                                <p className="text-sm font-semibold text-gray-900">
                                  {orderItem?.name || 'Product'}
                                </p>

                                <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-500">
                                  <span>
                                    Size:{' '}
                                    <strong className="text-gray-700">
                                      {orderItem?.size || 'N/A'}
                                    </strong>
                                  </span>

                                  <span>
                                    Ordered Qty:{' '}
                                    <strong className="text-gray-700">
                                      {orderItem?.quantity || 0}
                                    </strong>
                                  </span>

                                  <span>
                                    Return Qty:{' '}
                                    <strong className="text-gray-700">
                                      {returnItem.quantity}
                                    </strong>
                                  </span>
                                </div>
                              </div>

                              <span className="rounded-full bg-blue-100 px-3 py-1 text-xs font-semibold text-blue-700">
                                {reasonLabels[returnItem.reason] ||
                                  returnItem.reason ||
                                  'Other'}
                              </span>
                            </div>

                            <div className="mt-3 border-t border-gray-200 pt-3">
                              <p className="text-xs font-medium text-gray-500">
                                Item Details
                              </p>

                              <p className="mt-1 whitespace-pre-wrap text-sm text-gray-700">
                                {returnItem.comment ||
                                  'No item comment provided.'}
                              </p>
                            </div>
                          </div>
                        );
                      },
                    )}
                  </div>
                ) : (
                  <div className="rounded-lg bg-gray-50 p-4 text-sm text-gray-500">
                    No item-level return details available.
                  </div>
                )}
              </div>
              {/* Refund Preview */}
              {selectedReturn.refundPreview &&
                !selectedReturn.refundPreview.error && (
                  <div className="rounded-xl border border-green-200 bg-green-50 p-4">
                    <div className="flex items-center justify-between">
                      <h3 className="text-sm font-semibold text-green-900">
                        Refund Preview
                      </h3>

                      <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-green-700">
                        {selectedReturn.returnRequest?.returnType || '-'}
                      </span>
                    </div>

                    <div className="mt-4 space-y-2 text-sm">
                      <div className="flex justify-between gap-4">
                        <span className="text-gray-600">Order Total</span>

                        <span className="font-medium text-gray-900">
                          ₹
                          {Number(
                            selectedReturn.refundPreview.orderTotal || 0,
                          ).toFixed(2)}
                        </span>
                      </div>

                      <div className="flex justify-between gap-4">
                        <span className="text-gray-600">
                          Returned Item Value
                        </span>

                        <span className="font-medium text-gray-900">
                          ₹
                          {Number(
                            selectedReturn.refundPreview.returnedSubtotal || 0,
                          ).toFixed(2)}
                        </span>
                      </div>

                      <div className="flex justify-between gap-4">
                        <span className="text-gray-600">
                          Coupon Discount Allocated
                        </span>

                        <span className="font-medium text-red-600">
                          - ₹
                          {Number(
                            selectedReturn.refundPreview
                              .allocatedCouponDiscount || 0,
                          ).toFixed(2)}
                        </span>
                      </div>

                      <div className="flex justify-between gap-4">
                        <span className="text-gray-600">
                          Refundable Subtotal
                        </span>

                        <span className="font-medium text-gray-900">
                          ₹
                          {Number(
                            selectedReturn.refundPreview.refundableSubtotal ||
                              0,
                          ).toFixed(2)}
                        </span>
                      </div>

                      <div className="flex justify-between gap-4">
                        <span className="text-gray-600">Allocated Tax</span>

                        <span className="font-medium text-gray-900">
                          ₹
                          {Number(
                            selectedReturn.refundPreview.allocatedTax || 0,
                          ).toFixed(2)}
                        </span>
                      </div>

                      <div className="flex justify-between gap-4">
                        <span className="text-gray-600">Shipping Refund</span>

                        <span className="font-medium text-gray-900">
                          ₹
                          {Number(
                            selectedReturn.refundPreview.refundableShipping ||
                              0,
                          ).toFixed(2)}
                        </span>
                      </div>

                      <div className="my-3 border-t border-green-200" />

                      <div className="flex justify-between gap-4">
                        <span className="font-semibold text-green-900">
                          Refund Amount
                        </span>

                        <span className="text-lg font-bold text-green-700">
                          ₹
                          {Number(
                            selectedReturn.refundPreview.refundAmount || 0,
                          ).toFixed(2)}
                        </span>
                      </div>

                      <div className="flex justify-between gap-4">
                        <span className="text-xs text-gray-500">
                          Already Refunded
                        </span>

                        <span className="text-xs font-medium text-gray-700">
                          ₹
                          {Number(
                            selectedReturn.refundPreview.totalRefundedAmount ||
                              0,
                          ).toFixed(2)}
                        </span>
                      </div>

                      <div className="flex justify-between gap-4">
                        <span className="text-xs text-gray-500">
                          Remaining Refundable
                        </span>

                        <span className="text-xs font-medium text-gray-700">
                          ₹
                          {Number(
                            selectedReturn.refundPreview
                              .remainingRefundableAmount || 0,
                          ).toFixed(2)}
                        </span>
                      </div>
                    </div>

                    {selectedReturn.refundPreview.exceedsRemaining && (
                      <div className="mt-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                        The calculated return refund exceeds the remaining
                        refundable amount for this order. Completion must be
                        blocked until this is resolved.
                      </div>
                    )}
                  </div>
                )}
            </div>

            {/* Actions */}
            <div className="flex flex-wrap justify-end gap-3 border-t border-gray-200 px-6 py-4">
              <button
                type="button"
                onClick={() => setSelectedReturn(null)}
                disabled={processingId === selectedReturn._id}
                className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
              >
                Close
              </button>

              {selectedReturn.returnStatus === 'REQUESTED' && (
                <>
                  <button
                    type="button"
                    onClick={() => openRejectModal(selectedReturn)}
                    disabled={processingId === selectedReturn._id}
                    className="inline-flex items-center gap-2 rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <FiX />
                    Reject
                  </button>

                  <button
                    type="button"
                    onClick={() => handleApprove(selectedReturn._id)}
                    disabled={processingId === selectedReturn._id}
                    className="inline-flex items-center gap-2 rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <FiCheck />
                    {processingId === selectedReturn._id
                      ? 'Processing...'
                      : 'Approve'}
                  </button>
                </>
              )}

              {selectedReturn.returnStatus === 'APPROVED' && (
                <button
                  type="button"
                  onClick={() => openCompleteModal(selectedReturn)}
                  disabled={processingId === selectedReturn._id}
                  className="inline-flex items-center gap-2 rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <FiCheck />

                  {processingId === selectedReturn._id
                    ? 'Processing...'
                    : 'Complete Return'}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Reject Modal */}
      {rejectModal && selectedReturn && (
        <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900">
                Reject Return
              </h2>

              <button
                type="button"
                onClick={() => {
                  setRejectModal(false);
                  setRejectionReason('');
                }}
                disabled={processingId === selectedReturn._id}
                className="rounded-lg p-2 text-gray-500 hover:bg-gray-100"
              >
                <FiX size={20} />
              </button>
            </div>

            <p className="mt-2 text-sm text-gray-500">
              Enter the reason for rejecting this return request.
            </p>

            <textarea
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              maxLength={500}
              rows={5}
              disabled={processingId === selectedReturn._id}
              placeholder="Enter rejection reason..."
              className="mt-4 w-full rounded-lg border border-gray-200 p-3 text-sm outline-none focus:border-gray-400 disabled:bg-gray-100"
            />

            <div className="mt-1 text-right text-xs text-gray-400">
              {rejectionReason.length}/500
            </div>

            <div className="mt-5 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => {
                  setRejectModal(false);
                  setRejectionReason('');
                }}
                disabled={processingId === selectedReturn._id}
                className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={handleReject}
                disabled={
                  processingId === selectedReturn._id || !rejectionReason.trim()
                }
                className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {processingId === selectedReturn._id
                  ? 'Rejecting...'
                  : 'Reject Return'}
              </button>
            </div>
          </div>
        </div>
      )}
      {completeModal && completeReturnData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-2xl rounded-2xl bg-white shadow-xl max-h-3/4 overflow-y-scroll">
            {/* Header */}
            <div className="flex items-center justify-between border-b px-6 py-4">
              <div>
                <h2 className="text-lg font-bold text-gray-900">
                  Complete Return
                </h2>

                <p className="text-sm text-gray-500">
                  Inspect the returned product before completing the return.
                </p>
              </div>

              <button
                type="button"
                onClick={closeCompleteModal}
                disabled={!!processingId}
                className="rounded-lg p-2 text-gray-500 hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <FiX size={20} />
              </button>
            </div>

            {/* Body */}
            <div className="space-y-4 px-6 py-5">
              {/* Order */}
              <div className="rounded-xl border bg-gray-50 p-4">
                <div className="flex justify-between gap-4">
                  <span className="text-sm text-gray-500">Order</span>

                  <span className="font-semibold text-gray-900">
                    #{completeReturnData.orderNumber || '-'}
                  </span>
                </div>

                <div className="mt-2 flex justify-between gap-4">
                  <span className="text-sm text-gray-500">Customer</span>

                  <span className="text-sm font-medium text-gray-900">
                    {completeReturnData.userId?.name || '-'}
                  </span>
                </div>
              </div>

              {/* Payment Information */}
              {completeReturnData.paymentMethod === 'ONLINE' ? (
                <div className="rounded-xl border border-blue-200 bg-blue-50 p-4">
                  <h3 className="font-semibold text-blue-900">
                    Online Payment
                  </h3>

                  <div className="mt-3 space-y-2 text-sm">
                    <div className="flex justify-between gap-4">
                      <span className="text-gray-600">Payment Provider</span>

                      <span className="font-medium">
                        {completeReturnData.paymentProvider || 'RAZORPAY'}
                      </span>
                    </div>

                    {completeReturnData.refundId && (
                      <div className="flex justify-between gap-4">
                        <span className="text-gray-600">Refund ID</span>

                        <span className="break-all text-right font-medium">
                          {completeReturnData.refundId}
                        </span>
                      </div>
                    )}
                  </div>

                  {completeReturnData.refundPreview &&
                    !completeReturnData.refundPreview.error && (
                      <div className="mt-4 rounded-lg border border-blue-200 bg-white p-4">
                        <h4 className="font-semibold text-blue-900">
                          Refund Breakdown
                        </h4>

                        <div className="mt-3 space-y-2 text-sm">
                          <div className="flex justify-between">
                            <span className="text-gray-600">Return Type</span>

                            <span className="font-semibold">
                              {completeReturnData.refundPreview.returnType}
                            </span>
                          </div>

                          <div className="flex justify-between">
                            <span className="text-gray-600">
                              Returned Item Value
                            </span>

                            <span>
                              ₹
                              {Number(
                                completeReturnData.refundPreview
                                  .returnedSubtotal || 0,
                              ).toFixed(2)}
                            </span>
                          </div>

                          <div className="flex justify-between">
                            <span className="text-gray-600">
                              Coupon Discount
                            </span>

                            <span className="text-red-600">
                              - ₹
                              {Number(
                                completeReturnData.refundPreview
                                  .allocatedCouponDiscount || 0,
                              ).toFixed(2)}
                            </span>
                          </div>

                          <div className="flex justify-between">
                            <span className="text-gray-600">
                              Refundable Subtotal
                            </span>

                            <span>
                              ₹
                              {Number(
                                completeReturnData.refundPreview
                                  .refundableSubtotal || 0,
                              ).toFixed(2)}
                            </span>
                          </div>

                          <div className="flex justify-between">
                            <span className="text-gray-600">Tax</span>

                            <span>
                              ₹
                              {Number(
                                completeReturnData.refundPreview.allocatedTax ||
                                  0,
                              ).toFixed(2)}
                            </span>
                          </div>

                          <div className="flex justify-between">
                            <span className="text-gray-600">
                              Shipping Refund
                            </span>

                            <span>
                              ₹
                              {Number(
                                completeReturnData.refundPreview
                                  .refundableShipping || 0,
                              ).toFixed(2)}
                            </span>
                          </div>

                          <div className="border-t border-gray-200 pt-2" />

                          <div className="flex justify-between">
                            <span className="font-semibold text-gray-900">
                              Refund Amount
                            </span>

                            <span className="text-lg font-bold text-blue-700">
                              ₹
                              {Number(
                                completeReturnData.refundPreview.refundAmount ||
                                  0,
                              ).toFixed(2)}
                            </span>
                          </div>

                          <div className="flex justify-between text-xs">
                            <span className="text-gray-500">
                              Remaining Refundable
                            </span>

                            <span className="font-medium text-gray-700">
                              ₹
                              {Number(
                                completeReturnData.refundPreview
                                  .remainingRefundableAmount || 0,
                              ).toFixed(2)}
                            </span>
                          </div>
                        </div>

                        {completeReturnData.refundPreview.exceedsRemaining && (
                          <div className="mt-3 rounded-lg bg-red-50 p-3 text-sm text-red-700">
                            Refund cannot be processed because the calculated
                            amount exceeds the remaining refundable amount.
                          </div>
                        )}
                      </div>
                    )}
                </div>
              ) : (
                <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
                  <h3 className="font-semibold text-gray-900">
                    Cash on Delivery
                  </h3>

                  <p className="mt-2 text-sm text-gray-600">
                    No online payment refund is required for this order.
                    Completing the return will process the returned inventory
                    according to the inspection result.
                  </p>
                </div>
              )}

              {/* Return Inspection */}
              <div className="rounded-xl border border-purple-200 bg-purple-50 p-4">
                <h3 className="font-semibold text-purple-900">
                  Return Inspection
                </h3>

                <p className="mt-1 text-sm text-purple-700">
                  Select the condition of the returned product.
                </p>

                <div className="mt-4 grid grid-cols-2 gap-3">
                  {/* Resellable */}
                  <button
                    type="button"
                    onClick={() => setInspectionCondition('RESELLABLE')}
                    disabled={!!processingId}
                    className={`rounded-lg border px-4 py-3 text-sm font-medium transition ${
                      inspectionCondition === 'RESELLABLE'
                        ? 'border-green-500 bg-green-100 text-green-700'
                        : 'border-gray-300 bg-white text-gray-700 hover:bg-gray-50'
                    } disabled:cursor-not-allowed disabled:opacity-50`}
                  >
                    <div className="font-semibold">Resellable</div>

                    <div className="mt-1 text-xs">
                      Product can return to inventory
                    </div>
                  </button>

                  {/* Damaged */}
                  <button
                    type="button"
                    onClick={() => setInspectionCondition('DAMAGED')}
                    disabled={!!processingId}
                    className={`rounded-lg border px-4 py-3 text-sm font-medium transition ${
                      inspectionCondition === 'DAMAGED'
                        ? 'border-red-500 bg-red-100 text-red-700'
                        : 'border-gray-300 bg-white text-gray-700 hover:bg-gray-50'
                    } disabled:cursor-not-allowed disabled:opacity-50`}
                  >
                    <div className="font-semibold">Damaged</div>

                    <div className="mt-1 text-xs">
                      Product will not return to sellable stock
                    </div>
                  </button>
                </div>

                {/* Inspection Comment */}
                <div className="mt-4">
                  <label className="mb-2 block text-sm font-medium text-gray-700">
                    Inspection Comment
                    {inspectionCondition === 'DAMAGED' && (
                      <span className="text-red-500"> *</span>
                    )}
                  </label>

                  <textarea
                    value={inspectionComment}
                    onChange={(e) => setInspectionComment(e.target.value)}
                    maxLength={500}
                    rows={4}
                    disabled={!!processingId}
                    placeholder={
                      inspectionCondition === 'DAMAGED'
                        ? 'Describe the damage found on the returned product...'
                        : 'Add inspection notes...'
                    }
                    className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm outline-none transition focus:border-purple-500 focus:ring-1 focus:ring-purple-500 disabled:cursor-not-allowed disabled:bg-gray-100"
                  />

                  <div className="mt-1 text-right text-xs text-gray-500">
                    {inspectionComment.length}/500
                  </div>
                </div>
              </div>

              {/* After Completion */}
              <div className="rounded-xl border border-green-200 bg-green-50 p-4">
                <h3 className="font-semibold text-green-900">
                  After Completion
                </h3>

                <ul className="mt-2 space-y-1 text-sm text-green-800">
                  <li>• Return will be marked as COMPLETED.</li>

                  <li>
                    • Only the returned items and quantities will be processed.
                  </li>

                  <li>• Resellable items will be restored to inventory.</li>

                  <li>
                    • Damaged items will be recorded as damaged inventory.
                  </li>

                  {completeReturnData.paymentMethod === 'ONLINE' && (
                    <li>
                      • Refund processing will be handled according to the
                      returned-item amount.
                    </li>
                  )}
                </ul>
              </div>

              {/* Warning */}
              <div className="rounded-xl border border-yellow-200 bg-yellow-50 p-3 text-sm text-yellow-800">
                Make sure the returned product has been received and physically
                inspected before completing this return.
              </div>
            </div>

            {/* Footer */}
            <div className="flex justify-end gap-3 border-t px-6 py-4">
              <button
                type="button"
                onClick={closeCompleteModal}
                disabled={!!processingId}
                className="rounded-lg border px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={handleComplete}
                disabled={
                  !!processingId ||
                  !inspectionCondition ||
                  (completeReturnData.paymentMethod === 'ONLINE' &&
                    (!completeReturnData.refundPreview ||
                      completeReturnData.refundPreview.error ||
                      completeReturnData.refundPreview.exceedsRemaining))
                }
                className="rounded-lg bg-green-600 px-4 py-2 text-sm font-semibold text-white hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {processingId
                  ? 'Processing...'
                  : completeReturnData.paymentMethod === 'ONLINE'
                    ? `Complete Return & Refund ₹${Number(
                        completeReturnData.refundPreview?.refundAmount || 0,
                      ).toFixed(2)}`
                    : 'Complete Return'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
