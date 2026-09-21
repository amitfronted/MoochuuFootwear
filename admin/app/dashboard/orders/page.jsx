'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import toast from 'react-hot-toast';
import OrderDetailsModal from '@/app/components/OrderDetailsModal';

import {
  fetchAllOrders,
  updateOrderStatus,
  updateOrderShipping,
  markCodPaymentAsPaid,
  fetchRefundSummary,
  createOrderRefund,
  reconcileOrderRefund,
} from '../../lib/api';

const STATUS_OPTIONS = [
  'PLACED',
  'CONFIRMED',
  'PROCESSING',
  'SHIPPED',
  'DELIVERED',
  'CANCELLED',
];

const statusClasses = {
  PLACED: 'bg-yellow-100 text-yellow-700',

  CONFIRMED: 'bg-blue-100 text-blue-700',

  PROCESSING: 'bg-purple-100 text-purple-700',

  SHIPPED: 'bg-indigo-100 text-indigo-700',

  DELIVERED: 'bg-green-100 text-green-700',

  CANCELLED: 'bg-red-100 text-red-700',
};

const formatDate = (date) => {
  if (!date) return '-';

  return new Date(date).toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
};

const OrdersPage = () => {
  const [orders, setOrders] = useState([]);

  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState('');

  const [statusFilter, setStatusFilter] = useState('');

  const [paymentFilter, setPaymentFilter] = useState('');

  const [selectedOrder, setSelectedOrder] = useState(null);

  const [updatingOrderId, setUpdatingOrderId] = useState(null);

  // -----------------------------------------
  // REFUND STATE
  // -----------------------------------------

  const [refundSummary, setRefundSummary] = useState(null);

  const [refundLoading, setRefundLoading] = useState(false);

  const [refundSubmitting, setRefundSubmitting] = useState(false);

  const [refundReconciling, setRefundReconciling] = useState(false);

  // Keep the same idempotency key for a refund attempt.
  // This prevents generating a new refund request key if the
  // request needs to be retried after a timeout/network issue.
  const refundIdempotencyKeys = useRef({});

  // -----------------------------------------
  // LOAD ORDERS
  // -----------------------------------------

  const loadOrders = async () => {
    setLoading(true);

    try {
      const response = await fetchAllOrders();

      if (response.success) {
        const ordersData = response.data;

        const ordersArray = Array.isArray(ordersData)
          ? ordersData
          : Array.isArray(ordersData?.orders)
            ? ordersData.orders
            : [];

        setOrders(ordersArray);
      } else {
        setOrders([]);

        toast.error(response.message || 'Failed to load orders');
      }
    } catch (error) {
      console.error('LOAD ORDERS ERROR:', error);

      setOrders([]);

      toast.error(
        error.response?.data?.message ||
          error.message ||
          'Failed to load orders',
      );
    } finally {
      setLoading(false);
    }
  };

  // -----------------------------------------
  // SELECT ORDER / LOAD REFUND SUMMARY
  // -----------------------------------------

  const handleOrderSelect = async (order) => {
    if (!order) return;

    setSelectedOrder(order);
    setRefundSummary(null);

    const isRazorpayOrder =
      order.paymentMethod === 'ONLINE' && order.paymentProvider === 'RAZORPAY';

    if (!isRazorpayOrder) {
      return;
    }

    try {
      setRefundLoading(true);

      const response = await fetchRefundSummary(order._id);

      if (response.success) {
        setRefundSummary(response.data);
      } else {
        toast.error(response.message || 'Failed to load refund summary');
      }
    } catch (error) {
      console.error('REFUND SUMMARY ERROR:', error.response?.data || error);

      toast.error(
        error.response?.data?.message ||
          error.message ||
          'Failed to load refund summary',
      );
    } finally {
      setRefundLoading(false);
    }
  };

  // -----------------------------------------
  // CREATE REFUND
  // -----------------------------------------

  const handleCreateRefund = async (orderId, { amount, reason = '' }) => {
    if (!orderId) return;

    setRefundSubmitting(true);

    let idempotencyKey = refundIdempotencyKeys.current[orderId];

    if (!idempotencyKey) {
      const randomPart =
        typeof crypto !== 'undefined' && crypto.randomUUID
          ? crypto.randomUUID()
          : `${Date.now()}-${Math.random().toString(36).slice(2)}`;

      idempotencyKey = `refund-${orderId}-${randomPart}`;

      refundIdempotencyKeys.current[orderId] = idempotencyKey;
    }

    // --------------------------------------------------
    // 1. CREATE REFUND
    // --------------------------------------------------
    try {
      const response = await createOrderRefund(
        orderId,
        {
          amount,
          reason,
        },
        idempotencyKey,
      );

      if (!response?.success) {
        toast.error(response?.message || 'Failed to create refund');

        return;
      }

      // -----------------------------------------------
      // Refund request succeeded.
      // This idempotency key must NEVER be reused
      // for a future refund.
      // -----------------------------------------------
      delete refundIdempotencyKeys.current[orderId];

      toast.success(
        response.message || 'Refund request submitted successfully',
      );
    } catch (error) {
      console.error('CREATE REFUND ERROR:', error.response?.data || error);

      const status = error.response?.status;

      const message =
        error.response?.data?.message ||
        error.message ||
        'Failed to create refund';

      toast.error(message);

      /*
       * Network/unknown errors:
       * keep the same idempotency key so the user can retry
       * without accidentally creating another refund.
       *
       * Definite server-side failure:
       * the backend may have created a FAILED refund record.
       * A new attempt needs a new idempotency key.
       */
      if (status && status !== 409) {
        delete refundIdempotencyKeys.current[orderId];
      }

      /*
       * 409 is intentionally kept for now.
       *
       * Your backend uses 409 for an existing PENDING/FAILED
       * idempotency record. We should inspect the exact response
       * body before deciding whether a 409 means "reuse key"
       * or "generate a new key".
       */

      throw error;
    } finally {
      setRefundSubmitting(false);
    }

    // --------------------------------------------------
    // 2. REFRESH ADMIN UI
    // --------------------------------------------------
    //
    // IMPORTANT:
    // If this fails, the refund itself has already succeeded.
    // Therefore DO NOT throw this error back to the modal.
    //
    try {
      await loadOrders();

      const summaryResponse = await fetchRefundSummary(orderId);

      if (summaryResponse?.success) {
        setRefundSummary(summaryResponse.data);
      } else {
        setRefundSummary(null);

        toast.error(
          summaryResponse?.message ||
            'Refund created, but refund summary could not be refreshed.',
        );
      }
    } catch (refreshError) {
      console.error(
        'REFUND UI REFRESH ERROR:',
        refreshError.response?.data || refreshError,
      );

      toast.error(
        'Refund was created, but the order information could not be refreshed. Please reopen the order.',
      );
    }
  };

  // -----------------------------------------
  // RECONCILE REFUND
  // -----------------------------------------

  const handleReconcileRefund = async (orderId) => {
    if (!orderId) return;

    try {
      setRefundReconciling(true);

      const response = await reconcileOrderRefund(orderId);

      if (response.success) {
        toast.success(response.message || 'Refund reconciliation completed');

        await loadOrders();

        const summaryResponse = await fetchRefundSummary(orderId);

        if (summaryResponse.success) {
          setRefundSummary(summaryResponse.data);
        } else {
          setRefundSummary(null);
        }
      } else {
        toast.error(response.message || 'Refund reconciliation failed');
      }
    } catch (error) {
      console.error('REFUND RECONCILE ERROR:', error.response?.data || error);

      toast.error(
        error.response?.data?.message ||
          error.message ||
          'Refund reconciliation failed',
      );
    } finally {
      setRefundReconciling(false);
    }
  };

  useEffect(() => {
    loadOrders();
  }, []);

  // -----------------------------------------
  // FILTER
  // -----------------------------------------

  const filteredOrders = useMemo(() => {
    const value = search.trim().toLowerCase();

    return orders.filter((order) => {
      const customerName = order.userId?.name || '';
      const customerEmail = order.userId?.email || '';
      const orderNumber = order.orderNumber || '';

      const matchesSearch =
        !value ||
        orderNumber.toLowerCase().includes(value) ||
        customerName.toLowerCase().includes(value) ||
        customerEmail.toLowerCase().includes(value);

      const matchesStatus = !statusFilter || order.orderStatus === statusFilter;

      const matchesPayment =
        !paymentFilter || order.paymentMethod === paymentFilter;

      return matchesSearch && matchesStatus && matchesPayment;
    });
  }, [orders, search, statusFilter, paymentFilter]);

  // -----------------------------------------
  // STATUS UPDATE
  // -----------------------------------------

  const handleStatusChange = async (orderId, status) => {
    console.log('STATUS CHANGE:', {
      orderId,
      status,
    });

    try {
      const response = await updateOrderStatus(orderId, status);

      console.log('STATUS RESPONSE:', response);

      if (response.success) {
        toast.success('Order status updated');

        const updatedOrder = response.data?.order || response.data;

        if (selectedOrder?._id === orderId && updatedOrder) {
          setSelectedOrder(updatedOrder);
        }

        await loadOrders();
      }
    } catch (error) {
      console.error('STATUS ERROR:', error.response?.data);

      toast.error(error.response?.data?.message || 'Failed to update status');
    }
  };

  const handleShippingUpdate = async (orderId, shippingDetails) => {
    if (!orderId) return;

    try {
      setUpdatingOrderId(orderId);

      const response = await updateOrderShipping(orderId, shippingDetails);

      if (response.success) {
        toast.success('Shipping details updated');

        const updatedOrder = response.data?.order || response.data;

        if (selectedOrder?._id === orderId && updatedOrder) {
          setSelectedOrder(updatedOrder);
        }

        await loadOrders();
      } else {
        toast.error(response.message || 'Failed to update shipping details');
      }
    } catch (error) {
      console.error('SHIPPING UPDATE ERROR:', error.response?.data || error);

      toast.error(
        error.response?.data?.message || 'Failed to update shipping details',
      );
    } finally {
      setUpdatingOrderId(null);
    }
  };

  // -----------------------------------------
  // MARK COD PAYMENT AS PAID
  // -----------------------------------------

  const handleMarkCodPaid = async (orderId) => {
    if (!orderId) return;

    try {
      setUpdatingOrderId(orderId);

      const response = await markCodPaymentAsPaid(orderId);

      if (response.success) {
        toast.success('COD payment marked as paid');

        await loadOrders();

        // Close/update selected order modal state if open
        if (selectedOrder?._id === orderId) {
          setSelectedOrder((current) =>
            current
              ? {
                  ...current,
                  paymentStatus: 'PAID',
                  paymentPaidAt:
                    response.data?.order?.paymentPaidAt ||
                    new Date().toISOString(),
                }
              : current,
          );
        }
      } else {
        toast.error(response.message || 'Failed to mark COD as paid');
      }
    } catch (error) {
      console.error('MARK COD PAID ERROR:', error.response?.data);

      toast.error(
        error.response?.data?.message ||
          error.message ||
          'Failed to mark COD payment as paid',
      );
    } finally {
      setUpdatingOrderId(null);
    }
  };
  // -----------------------------------------
  // PRINT INVOICE
  // -----------------------------------------

  const printInvoice = (order) => {
    if (!order) return;

    const money = (value) =>
      `₹${Number(value || 0).toLocaleString('en-IN', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })}`;

    const escapeHtml = (value) =>
      String(value ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');

    const formatDate = (value) => {
      if (!value) return '-';
      const date = new Date(value);
      if (Number.isNaN(date.getTime())) return '-';
      return date.toLocaleDateString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      });
    };

    const items = Array.isArray(order.items) ? order.items : [];

    const rows = items
      .map((item) => {
        const custom =
          String(item.productType || '').toUpperCase() === 'CUSTOMIZABLE';
        const configuration = custom
          ? [
              item.base?.colorName ? `Sole: ${item.base.colorName}` : '',
              item.strap?.colorName ? `Strap: ${item.strap.colorName}` : '',
              item.thumb?.colorName ? `Thumb: ${item.thumb.colorName}` : '',
            ]
              .filter(Boolean)
              .join('<br>') || '-'
          : item.standardVariant?.colorName ||
            item.standard?.colorName ||
            'Standard';

        return `
          <tr>
            <td><b>${escapeHtml(item.name || 'Product')}</b><br><small>Code: ${escapeHtml(item.productCode || '-')}<br>Size: ${escapeHtml(item.size || '-')}</small></td>
            <td>${escapeHtml(configuration).replace(/&lt;br&gt;/g, '<br>')}</td>
            <td class="center">${escapeHtml(item.quantity || 0)}</td>
            <td class="right">${money(item.unitPrice)}</td>
            <td class="right"><b>${money(item.lineTotal)}</b></td>
          </tr>`;
      })
      .join('');

    const popup = window.open('', '_blank', 'width=1000,height=800');
    if (!popup) {
      toast.error('Please allow pop-ups to print the invoice.');
      return;
    }

    popup.document
      .write(`<!doctype html><html><head><title>Invoice ${escapeHtml(order.orderNumber)}</title>
      <style>
        *{box-sizing:border-box} body{font-family:Arial,sans-serif;color:#111;margin:0;padding:32px} .wrap{max-width:900px;margin:auto} .top{display:flex;justify-content:space-between;border-bottom:1px solid #ddd;padding-bottom:20px}.brand{font-size:26px;font-weight:700}.muted{color:#666;font-size:13px;line-height:1.6}.title{text-align:right}.title h1{margin:0;font-size:30px}.grid{display:grid;grid-template-columns:1fr 1fr;gap:30px;padding:22px 0;border-bottom:1px solid #ddd}.label{font-size:11px;text-transform:uppercase;letter-spacing:1px;color:#777;font-weight:bold}.table{width:100%;border-collapse:collapse;margin-top:25px;font-size:13px}.table th{background:#f7f7f7;text-align:left}.table th,.table td{border:1px solid #ddd;padding:10px;vertical-align:top}.center{text-align:center}.right{text-align:right}.summary{margin:25px 0 0 auto;width:320px;font-size:13px}.summary div{display:flex;justify-content:space-between;padding:6px 0}.summary .total{border-top:1px solid #111;margin-top:6px;padding-top:10px;font-size:18px;font-weight:bold}.footer{margin-top:40px;border-top:1px solid #ddd;padding-top:18px;text-align:center;color:#777;font-size:12px}@media print{body{padding:0}@page{size:A4;margin:12mm}}
      </style></head><body><div class="wrap">
      <div class="top"><div><div class="brand">MOOCHUU</div><div class="muted">Footwear</div></div><div class="title"><h1>INVOICE</h1><div class="muted">Invoice No: <b>INV-${escapeHtml(order.orderNumber || String(order._id).slice(-8).toUpperCase())}</b><br>Order No: <b>${escapeHtml(order.orderNumber || order._id)}</b><br>Date: ${formatDate(order.createdAt)}</div></div></div>
      <div class="grid"><div><div class="label">Bill To</div><div class="muted"><b>${escapeHtml(order.shippingAddress?.name || '-')}</b><br>${escapeHtml(order.shippingAddress?.phone || '-')}</div></div><div><div class="label">Delivery Address</div><div class="muted">${escapeHtml(order.shippingAddress?.addressLine1 || '-')}<br>${escapeHtml([order.shippingAddress?.city, order.shippingAddress?.state].filter(Boolean).join(', '))}<br>${escapeHtml(order.shippingAddress?.postalCode || '')}<br>${escapeHtml(order.shippingAddress?.landmark ? `Landmark: ${order.shippingAddress.landmark}` : '')}</div></div></div>
      <h3>Order Items</h3><table class="table"><thead><tr><th>Product</th><th>Configuration</th><th>Qty</th><th class="right">Price</th><th class="right">Total</th></tr></thead><tbody>${rows}</tbody></table>
      <div class="summary"><div><span>Subtotal</span><span>${money(order.subtotal)}</span></div><div><span>Shipping</span><span>${Number(order.shippingCharge) > 0 ? money(order.shippingCharge) : 'FREE'}</span></div><div><span>Tax</span><span>${money(order.tax)}</span></div><div class="total"><span>Total</span><span>${money(order.totalAmount)}</span></div></div>
      <div class="grid"><div class="muted"><b>Payment Method:</b> ${escapeHtml(order.paymentMethod || 'COD')}<br><b>Payment Status:</b> ${escapeHtml(order.paymentStatus || 'PENDING')}</div><div class="muted" style="text-align:right"><b>Order Status:</b> ${escapeHtml(order.orderStatus || 'PLACED')}</div></div><div class="footer">Thank you for shopping with Moochuu Footwear.</div></div><script>window.onload=function(){window.print();}</script></body></html>`);
    popup.document.close();
  };

  // -----------------------------------------
  // TOTALS
  // -----------------------------------------

  const totalOrders = orders.length;

  const pendingOrders = orders.filter(
    (order) => order.orderStatus === 'PLACED',
  ).length;

  const processingOrders = orders.filter((order) =>
    ['CONFIRMED', 'PROCESSING'].includes(order.orderStatus),
  ).length;

  const deliveredOrders = orders.filter(
    (order) => order.orderStatus === 'DELIVERED',
  ).length;

  // -----------------------------------------
  // PAGE
  // -----------------------------------------

  return (
    <>
      <div className="max-w-7xl mx-auto space-y-6">
        {/* HEADER */}

        <div>
          <h1 className="text-2xl font-bold">Orders</h1>

          <p className="text-sm text-slate-500">
            Manage customer orders and update order status.
          </p>
        </div>

        {/* SUMMARY */}

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white border rounded-xl p-4">
            <p className="text-sm text-slate-500">Total Orders</p>

            <p className="text-2xl font-bold mt-1">{totalOrders}</p>
          </div>

          <div className="bg-white border rounded-xl p-4">
            <p className="text-sm text-slate-500">New Orders</p>

            <p className="text-2xl font-bold mt-1">{pendingOrders}</p>
          </div>

          <div className="bg-white border rounded-xl p-4">
            <p className="text-sm text-slate-500">Processing</p>

            <p className="text-2xl font-bold mt-1">{processingOrders}</p>
          </div>

          <div className="bg-white border rounded-xl p-4">
            <p className="text-sm text-slate-500">Delivered</p>

            <p className="text-2xl font-bold mt-1">{deliveredOrders}</p>
          </div>
        </div>

        {/* FILTER */}

        <div className="bg-white border rounded-xl p-4">
          <div className="flex flex-col md:flex-row gap-3">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search order number, customer or email..."
              className="
              flex-1
              border
              rounded-lg
              px-3
              py-2
              outline-none
              focus:border-black
            "
            />

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="
              border
              rounded-lg
              px-3
              py-2
              min-w-48
            "
            >
              <option value="">All Status</option>

              {STATUS_OPTIONS.map((status) => (
                <option key={status} value={status}>
                  {status}
                </option>
              ))}
            </select>

            <select
              value={paymentFilter}
              onChange={(e) => setPaymentFilter(e.target.value)}
              className="
              border
              rounded-lg
              px-3
              py-2
              min-w-40
            "
            >
              <option value="">All Payments</option>
              <option value="COD">COD</option>
              <option value="ONLINE">ONLINE</option>
            </select>

            <button
              type="button"
              onClick={loadOrders}
              className="
              border
              px-4
              py-2
              rounded-lg
              hover:bg-slate-50
            "
            >
              Refresh
            </button>
          </div>
        </div>

        {/* ORDER TABLE */}

        <div className="bg-white border rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr
                  className="
                  border-b
                  bg-slate-50
                  text-left
                  text-sm
                "
                >
                  <th className="px-4 py-4">Order</th>

                  <th className="px-4 py-4">Customer</th>

                  <th className="px-4 py-4">Items</th>

                  <th className="px-4 py-4">Payment</th>

                  <th className="px-4 py-4">Amount</th>

                  <th className="px-4 py-4">Refund</th>

                  <th className="px-4 py-4">Status</th>

                  <th className="px-4 py-4">Date</th>

                  <th className="px-4 py-4">Action</th>
                </tr>
              </thead>

              <tbody className="text-sm divide-y">
                {loading ? (
                  <tr>
                    <td colSpan="8" className="p-10 text-center">
                      Loading orders...
                    </td>
                  </tr>
                ) : filteredOrders.length === 0 ? (
                  <tr>
                    <td
                      colSpan="9"
                      className="
                      p-10
                      text-center
                      text-slate-500
                    "
                    >
                      No orders found.
                    </td>
                  </tr>
                ) : (
                  filteredOrders.map((order) => (
                    <tr
                      key={order._id}
                      className="
                        hover:bg-slate-50
                      "
                    >
                      {/* ORDER */}

                      <td className="px-4 py-4">
                        <button
                          type="button"
                          onClick={() => handleOrderSelect(order)}
                          className="
                            font-semibold
                            text-blue-600
                            hover:underline
                          "
                        >
                          #{order.orderNumber}
                        </button>
                      </td>

                      {/* CUSTOMER */}

                      <td className="px-4 py-4">
                        <div className="font-medium">
                          {order.userId?.name || 'Guest'}
                        </div>

                        <div className="text-xs text-slate-500">
                          {order.userId?.email || '-'}
                        </div>
                      </td>

                      {/* ITEMS */}

                      <td className="px-4 py-4">{order.items?.length || 0}</td>

                      {/* PAYMENT */}

                      <td className="px-4 py-4">
                        <div>{order.paymentMethod}</div>

                        <span
                          className={`
                            text-xs
                            font-medium
                            ${
                              order.paymentStatus === 'PAID'
                                ? 'text-green-600'
                                : 'text-yellow-600'
                            }
                          `}
                        >
                          {order.paymentStatus}
                        </span>

                        {/* MARK COD AS PAID */}
                        {order.paymentMethod === 'COD' &&
                          order.paymentStatus === 'PENDING' &&
                          order.orderStatus === 'DELIVERED' && (
                            <button
                              type="button"
                              disabled={updatingOrderId === order._id}
                              onClick={() => handleMarkCodPaid(order._id)}
                              className="
                                  mt-2
                                  block
                                  rounded-lg
                                  border
                                  border-green-600
                                  px-2
                                  py-1
                                  text-xs
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
                          )}
                      </td>

                      {/* AMOUNT */}

                      <td className="px-4 py-4 font-semibold">
                        ₹
                        {Number(order.totalAmount || 0).toLocaleString(
                          'en-IN',
                          {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                          },
                        )}
                      </td>
                      <td className="px-4 py-4">
                        {order.paymentMethod === 'ONLINE' &&
                        order.paymentProvider === 'RAZORPAY' ? (
                          <div className="min-w-37 space-y-1">
                            {/* REFUND STATUS */}

                            <span
                              className={`
                              inline-flex
                              rounded-full
                              px-2.5
                              py-1
                              text-xs
                              font-bold
                              ${
                                order.refundStatus === 'PROCESSED'
                                  ? 'bg-green-100 text-green-700'
                                  : order.refundStatus === 'PARTIAL'
                                    ? 'bg-blue-100 text-blue-700'
                                    : order.refundStatus === 'PENDING'
                                      ? 'bg-yellow-100 text-yellow-700'
                                      : order.refundStatus === 'FAILED'
                                        ? 'bg-red-100 text-red-700'
                                        : 'bg-slate-100 text-slate-600'
                              }
                            `}
                            >
                              {order.refundStatus === 'PROCESSED'
                                ? 'FULLY REFUNDED'
                                : order.refundStatus === 'PARTIAL'
                                  ? 'PARTIAL'
                                  : order.refundStatus === 'PENDING'
                                    ? 'PENDING'
                                    : order.refundStatus === 'FAILED'
                                      ? 'FAILED'
                                      : 'NONE'}
                            </span>

                            {/* REFUNDED */}

                            {Number(order.totalRefundedAmount || 0) > 0 && (
                              <div className="text-xs text-slate-600">
                                Refunded: ₹
                                {Number(
                                  order.totalRefundedAmount || 0,
                                ).toLocaleString('en-IN', {
                                  minimumFractionDigits: 2,
                                  maximumFractionDigits: 2,
                                })}
                              </div>
                            )}

                            {/* REMAINING */}

                            {order.refundStatus !== 'PROCESSED' &&
                              Number(order.remainingRefundableAmount || 0) >
                                0 && (
                                <div className="text-xs text-slate-500">
                                  Remaining: ₹
                                  {Number(
                                    order.remainingRefundableAmount || 0,
                                  ).toLocaleString('en-IN', {
                                    minimumFractionDigits: 2,
                                    maximumFractionDigits: 2,
                                  })}
                                </div>
                              )}
                          </div>
                        ) : (
                          <span className="text-xs text-slate-400">—</span>
                        )}
                      </td>

                      {/* STATUS */}

                      <td className="px-4 py-4">
                        <select
                          value={order.orderStatus}
                          onChange={(e) =>
                            handleStatusChange(order._id, e.target.value)
                          }
                        >
                          <option value="PLACED">Placed</option>

                          <option value="CONFIRMED">Confirmed</option>

                          <option value="PROCESSING">Processing</option>

                          <option value="SHIPPED">Shipped</option>

                          <option value="DELIVERED">Delivered</option>

                          <option value="CANCELLED">Cancelled</option>
                        </select>
                      </td>

                      {/* DATE */}

                      <td className="px-4 py-4 whitespace-nowrap">
                        {formatDate(order.createdAt)}
                      </td>

                      {/* ACTION */}

                      <td className="px-4 py-4">
                        <button
                          type="button"
                          onClick={() => handleOrderSelect(order)}
                          className="
                            border
                            px-3
                            py-1.5
                            rounded-lg
                            hover:bg-slate-100
                          "
                        >
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
      </div>
      <OrderDetailsModal
        order={selectedOrder}
        onClose={() => {
          setSelectedOrder(null);
          setRefundSummary(null);
        }}
        onStatusChange={handleStatusChange}
        onMarkCodPaid={handleMarkCodPaid}
        onShippingUpdate={handleShippingUpdate}
        updatingOrderId={updatingOrderId}
        onPrintInvoice={printInvoice}
        refundSummary={refundSummary}
        refundLoading={refundLoading}
        refundSubmitting={refundSubmitting}
        refundReconciling={refundReconciling}
        onCreateRefund={handleCreateRefund}
        onReconcileRefund={handleReconcileRefund}
      />
    </>
  );
};

export default OrdersPage;
