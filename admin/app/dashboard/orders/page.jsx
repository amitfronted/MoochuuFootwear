'use client';

import { useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';

import { fetchAllOrders, updateOrderStatus } from '../../lib/api';

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

const formatDateTime = (date) => {
  if (!date) return '-';

  return new Date(date).toLocaleString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

const OrdersPage = () => {
  const [orders, setOrders] = useState([]);

  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState('');

  const [statusFilter, setStatusFilter] = useState('');

  const [selectedOrder, setSelectedOrder] = useState(null);

  const [updatingOrderId, setUpdatingOrderId] = useState(null);

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

      return matchesSearch && matchesStatus;
    });
  }, [orders, search, statusFilter]);

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

        await loadOrders();
      }
    } catch (error) {
      console.error('STATUS ERROR:', error.response?.data);

      toast.error(error.response?.data?.message || 'Failed to update status');
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
                    colSpan="8"
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
                        onClick={() => setSelectedOrder(order)}
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
                    </td>

                    {/* AMOUNT */}

                    <td className="px-4 py-4 font-semibold">
                      ₹{Number(order.totalAmount || 0).toLocaleString('en-IN')}
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
                        onClick={() => setSelectedOrder(order)}
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

      {/* ================================= */}
      {/* ORDER DETAILS MODAL */}
      {/* ================================= */}

      {selectedOrder && (
        <div
          className="
            fixed
            inset-0
            z-50
            bg-black/40
            flex
            justify-center
            items-start
            p-4
            md:p-8
            overflow-y-auto
          "
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) {
              setSelectedOrder(null);
            }
          }}
        >
          <div
            className="
              bg-white
              rounded-2xl
              w-full
              max-w-4xl
              shadow-xl
              overflow-hidden
            "
          >
            {/* MODAL HEADER */}

            <div
              className="
                flex
                justify-between
                items-center
                border-b
                px-5
                py-4
              "
            >
              <div>
                <h2 className="text-xl font-bold">
                  Order #{selectedOrder.orderNumber}
                </h2>

                <p className="text-xs text-slate-500 mt-1">
                  {formatDateTime(selectedOrder.createdAt)}
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => printInvoice(selectedOrder)}
                  className="rounded-lg border px-3 py-2 text-sm font-semibold hover:bg-slate-100"
                >
                  Print Invoice
                </button>

                <button
                  type="button"
                  onClick={() => setSelectedOrder(null)}
                  className="
                    w-9
                    h-9
                    rounded-full
                    border
                    text-xl
                    hover:bg-slate-100
                  "
                >
                  ×
                </button>
              </div>
            </div>

            <div className="p-5 space-y-6">
              {/* STATUS */}

              <div className="border rounded-xl p-4">
                <h3 className="font-bold mb-3">Order Status</h3>

                <div className="flex flex-col sm:flex-row gap-3">
                  <select
                    value={selectedOrder.orderStatus}
                    disabled={
                      updatingOrderId === selectedOrder._id ||
                      selectedOrder.orderStatus === 'CANCELLED'
                    }
                    onChange={(e) =>
                      handleStatusChange(selectedOrder._id, e.target.value)
                    }
                    className="
                      border
                      rounded-lg
                      px-3
                      py-2
                      flex-1
                    "
                  >
                    {STATUS_OPTIONS.map((status) => (
                      <option key={status} value={status}>
                        {status}
                      </option>
                    ))}
                  </select>

                  {updatingOrderId === selectedOrder._id && (
                    <div className="flex items-center text-sm text-slate-500">
                      Updating...
                    </div>
                  )}
                </div>
              </div>

              {/* CUSTOMER + ADDRESS */}

              <div className="grid md:grid-cols-2 gap-4">
                <div className="border rounded-xl p-4">
                  <h3 className="font-bold mb-3">Customer</h3>

                  <div className="space-y-1 text-sm">
                    <p>
                      <b>Name:</b> {selectedOrder.userId?.name || '-'}
                    </p>

                    <p>
                      <b>Email:</b> {selectedOrder.userId?.email || '-'}
                    </p>

                    <p>
                      <b>Mobile:</b> {selectedOrder.userId?.mobile || '-'}
                    </p>
                  </div>
                </div>

                <div className="border rounded-xl p-4">
                  <h3 className="font-bold mb-3">Shipping Address</h3>

                  <div className="text-sm text-slate-700 space-y-1">
                    <p>{selectedOrder.shippingAddress?.name}</p>

                    <p>{selectedOrder.shippingAddress?.phone}</p>

                    <p>{selectedOrder.shippingAddress?.addressLine1}</p>

                    <p>
                      {selectedOrder.shippingAddress?.city},{' '}
                      {selectedOrder.shippingAddress?.state}
                    </p>

                    <p>{selectedOrder.shippingAddress?.postalCode}</p>

                    {selectedOrder.shippingAddress?.landmark && (
                      <p>Landmark: {selectedOrder.shippingAddress.landmark}</p>
                    )}
                  </div>
                </div>
              </div>

              {/* ITEMS */}

              <div className="border rounded-xl overflow-hidden">
                <div className="px-4 py-3 border-b">
                  <h3 className="font-bold">Order Items</h3>
                </div>

                <div className="divide-y">
                  {selectedOrder.items?.map((item) => (
                    <div
                      key={item._id}
                      className="
                          p-4
                          flex
                          flex-col
                          md:flex-row
                          gap-4
                        "
                    >
                      <img
                        src={item.image || '/placeholder.png'}
                        alt={item.name}
                        className="
                            w-20
                            h-20
                            rounded-lg
                            border
                            object-contain
                            bg-slate-50
                          "
                      />

                      <div className="flex-1">
                        <h4 className="font-semibold">{item.name}</h4>

                        <p className="text-xs text-slate-500">
                          Code: {item.productCode}
                        </p>

                        <div className="flex flex-wrap gap-4 text-sm mt-2">
                          <span>
                            Size: <b>{item.size}</b>
                          </span>

                          <span>
                            Qty: <b>{item.quantity}</b>
                          </span>

                          <span>
                            Price: ₹
                            {Number(item.unitPrice || 0).toLocaleString(
                              'en-IN',
                            )}
                          </span>
                        </div>

                        {/* CUSTOMIZATION */}

                        {item.productType === 'CUSTOMIZABLE' && (
                          <div className="mt-3 flex flex-wrap gap-2">
                            {item.base && (
                              <span className="px-2 py-1 bg-slate-100 rounded text-xs">
                                Sole: {item.base.colorName}
                              </span>
                            )}

                            {item.strap && (
                              <span className="px-2 py-1 bg-slate-100 rounded text-xs">
                                Strap: {item.strap.colorName}
                              </span>
                            )}

                            {item.thumb && (
                              <span className="px-2 py-1 bg-slate-100 rounded text-xs">
                                Thumb: {item.thumb.colorName}
                              </span>
                            )}
                          </div>
                        )}
                      </div>

                      <div className="font-bold">
                        ₹{Number(item.lineTotal || 0).toLocaleString('en-IN')}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* PAYMENT + TOTAL */}

              <div className="grid md:grid-cols-2 gap-4">
                <div className="border rounded-xl p-4">
                  <h3 className="font-bold mb-3">Payment</h3>

                  <div className="space-y-2 text-sm">
                    <p>
                      Method: <b>{selectedOrder.paymentMethod}</b>
                    </p>

                    <p>
                      Status: <b>{selectedOrder.paymentStatus}</b>
                    </p>

                    {selectedOrder.paymentId && (
                      <p>Payment ID: {selectedOrder.paymentId}</p>
                    )}
                  </div>
                </div>

                <div className="border rounded-xl p-4">
                  <h3 className="font-bold mb-3">Order Summary</h3>

                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span>Subtotal</span>

                      <span>
                        ₹
                        {Number(selectedOrder.subtotal || 0).toLocaleString(
                          'en-IN',
                        )}
                      </span>
                    </div>

                    <div className="flex justify-between">
                      <span>Shipping</span>

                      <span>
                        ₹
                        {Number(
                          selectedOrder.shippingCharge || 0,
                        ).toLocaleString('en-IN')}
                      </span>
                    </div>

                    <div className="flex justify-between">
                      <span>Tax</span>

                      <span>
                        ₹
                        {Number(selectedOrder.tax || 0).toLocaleString('en-IN')}
                      </span>
                    </div>

                    <div className="border-t pt-2 flex justify-between font-bold text-base">
                      <span>Total</span>

                      <span>
                        ₹
                        {Number(selectedOrder.totalAmount || 0).toLocaleString(
                          'en-IN',
                        )}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* TIMESTAMPS */}

              {(selectedOrder.deliveredAt || selectedOrder.cancelledAt) && (
                <div className="border rounded-xl p-4 text-sm">
                  {selectedOrder.deliveredAt && (
                    <p>
                      Delivered: {formatDateTime(selectedOrder.deliveredAt)}
                    </p>
                  )}

                  {selectedOrder.cancelledAt && (
                    <p className="text-red-600">
                      Cancelled: {formatDateTime(selectedOrder.cancelledAt)}
                    </p>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default OrdersPage;
