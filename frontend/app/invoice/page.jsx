'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { FiArrowLeft, FiPrinter } from 'react-icons/fi';
import { useOrders } from '../context/OrderContext';

const money = (value) =>
  `₹${Number(value || 0).toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

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

const optionName = (option) =>
  option?.colorName || option?.name || option?.color || '';

export default function InvoicePage() {
  const searchParams = useSearchParams();
  const orderId = searchParams.get('orderId');
  const { getOrder, loading } = useOrders();
  const [order, setOrder] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!orderId) {
      setError('Order ID is missing.');
      return;
    }

    let active = true;

    const load = async () => {
      const result = await getOrder(orderId);
      if (!active) return;

      if (result?.success && result?.data) {
        setOrder(result.data);
      } else {
        setError(result?.message || 'Unable to load invoice.');
      }
    };

    load();
    return () => {
      active = false;
    };
  }, [orderId, getOrder]);

  if (loading && !order) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center">
        Loading invoice...
      </div>
    );
  }

  if (error || !order) {
    return (
      <section className="min-h-[70vh] px-4 py-20">
        <div className="mx-auto max-w-xl rounded-xl bg-white p-10 text-center shadow-sm">
          <h1 className="text-2xl font-bold">Unable to load invoice</h1>
          <p className="mt-2 text-gray-500">
            {error || 'Invoice is not available.'}
          </p>
          <Link
            href="/my-account/my-orders"
            className="mt-6 inline-flex rounded-md bg-black px-6 py-3 font-semibold text-white"
          >
            Back to My Orders
          </Link>
        </div>
      </section>
    );
  }

  const items = Array.isArray(order.items) ? order.items : [];
  const address = order.shippingAddress || {};
  const invoiceNumber = `INV-${order.orderNumber || String(order._id).slice(-8).toUpperCase()}`;

  return (
    <section className="invoice-page min-h-screen px-3 py-8 md:px-6 md:py-12">
      <div className="invoice-actions mx-auto mb-5 flex max-w-4xl items-center justify-between gap-3">
        <Link
          href={`/order-success?orderId=${order._id}`}
          className="inline-flex items-center gap-2 rounded-md border bg-white px-4 py-2 text-sm font-semibold"
        >
          <FiArrowLeft /> Back
        </Link>
        <button
          type="button"
          onClick={() => window.print()}
          className="inline-flex items-center gap-2 rounded-md bg-black px-5 py-2.5 text-sm font-semibold text-white"
        >
          <FiPrinter /> Print / Save PDF
        </button>
      </div>

      <div
        id="invoice"
        className="invoice-document mx-auto max-w-4xl bg-white p-6 shadow-sm md:p-10"
      >
        <div className="flex flex-col gap-6 border-b pb-6 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <img
              src="/logo.png"
              alt="Moochuu Footwear"
              className="h-12 w-auto object-contain"
            />
            <p className="mt-2 text-sm text-gray-500">Footwear</p>
          </div>
          <div className="text-left sm:text-right">
            <h1 className="text-3xl font-bold tracking-wide text-gray-900">
              INVOICE
            </h1>
            <p className="mt-2 text-sm text-gray-600">
              Invoice No: <b>{invoiceNumber}</b>
            </p>
            <p className="text-sm text-gray-600">
              Order No: <b>{order.orderNumber || order._id}</b>
            </p>
            <p className="text-sm text-gray-600">
              Date: {formatDate(order.createdAt)}
            </p>
          </div>
        </div>

        <div className="grid gap-6 border-b py-6 sm:grid-cols-2">
          <div>
            <h2 className="text-xs font-bold uppercase tracking-wider text-gray-500">
              Bill To
            </h2>
            <div className="mt-2 text-sm leading-6 text-gray-700">
              <p className="font-semibold text-gray-900">
                {address.name || '-'}
              </p>
              <p>{address.phone || '-'}</p>
            </div>
          </div>
          <div>
            <h2 className="text-xs font-bold uppercase tracking-wider text-gray-500">
              Delivery Address
            </h2>
            <div className="mt-2 text-sm leading-6 text-gray-700">
              <p>{address.addressLine1 || '-'}</p>
              <p>{[address.city, address.state].filter(Boolean).join(', ')}</p>
              <p>{address.postalCode || ''}</p>
              {address.landmark && <p>Landmark: {address.landmark}</p>}
              <p>{address.country || 'India'}</p>
            </div>
          </div>
        </div>

        <div className="py-6">
          <h2 className="mb-3 text-lg font-bold">Order Items</h2>
          <div className="overflow-hidden rounded-lg border">
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="bg-gray-50 text-left">
                  <th className="border-b px-3 py-3">Product</th>
                  <th className="border-b px-3 py-3">Configuration</th>
                  <th className="border-b px-3 py-3 text-center">Qty</th>
                  <th className="border-b px-3 py-3 text-right">Price</th>
                  <th className="border-b px-3 py-3 text-right">Total</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item, index) => {
                  const custom =
                    String(item.productType).toUpperCase() === 'CUSTOMIZABLE';
                  return (
                    <tr key={item._id || index} className="align-top">
                      <td className="border-b px-3 py-4">
                        <p className="font-semibold">
                          {item.name || 'Product'}
                        </p>
                        {item.productCode && (
                          <p className="mt-1 text-xs text-gray-500">
                            Code: {item.productCode}
                          </p>
                        )}
                        <p className="mt-1 text-xs text-gray-500">
                          Size: {item.size || '-'}
                        </p>
                      </td>
                      <td className="border-b px-3 py-4 text-xs text-gray-600">
                        {custom ? (
                          <div className="space-y-1">
                            {item.base && (
                              <p>Sole: {optionName(item.base) || '-'}</p>
                            )}
                            {item.strap && (
                              <p>Strap: {optionName(item.strap) || '-'}</p>
                            )}
                            {item.thumb && (
                              <p>Thumb: {optionName(item.thumb) || '-'}</p>
                            )}
                          </div>
                        ) : (
                          <p>
                            {optionName(
                              item.standardVariant || item.standard,
                            ) || 'Standard'}
                          </p>
                        )}
                      </td>
                      <td className="border-b px-3 py-4 text-center">
                        {item.quantity || 0}
                      </td>
                      <td className="border-b px-3 py-4 text-right">
                        {money(item.unitPrice)}
                      </td>
                      <td className="border-b px-3 py-4 text-right font-semibold">
                        {money(item.lineTotal)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        <div className="ml-auto max-w-sm border-t pt-5 text-sm">
          <div className="flex justify-between py-1.5">
            <span>Subtotal</span>
            <span>{money(order.subtotal)}</span>
          </div>
          <div className="flex justify-between py-1.5">
            <span>Shipping</span>
            <span>
              {Number(order.shippingCharge) > 0
                ? money(order.shippingCharge)
                : 'FREE'}
            </span>
          </div>
          <div className="flex justify-between py-1.5">
            <span>Tax</span>
            <span>{money(order.tax)}</span>
          </div>
          <div className="mt-2 flex justify-between border-t pt-3 text-lg font-bold">
            <span>Total</span>
            <span>{money(order.totalAmount)}</span>
          </div>
        </div>

        <div className="mt-8 grid gap-4 border-t pt-6 text-sm sm:grid-cols-2">
          <div>
            <p>
              <b>Payment Method:</b> {order.paymentMethod || 'COD'}
            </p>
            <p className="mt-1">
              <b>Payment Status:</b> {order.paymentStatus || 'PENDING'}
            </p>
          </div>
          <div className="sm:text-right">
            <p>
              <b>Order Status:</b> {order.orderStatus || 'PLACED'}
            </p>
          </div>
        </div>

        <div className="mt-10 border-t pt-5 text-center text-xs text-gray-500">
          Thank you for shopping with Moochuu Footwear.
        </div>
      </div>

      <style jsx global>{`
        @media print {
          @page {
            size: A4;
            margin: 12mm;
          }
          body {
            background: #fff !important;
          }
          body > * {
            background: #fff !important;
          }
          header,
          footer,
          .invoice-actions {
            display: none !important;
          }
          main {
            margin: 0 !important;
            background: #fff !important;
          }
          .invoice-page {
            padding: 0 !important;
            min-height: 0 !important;
          }
          .invoice-document {
            max-width: none !important;
            box-shadow: none !important;
            padding: 0 !important;
          }
        }
      `}</style>
    </section>
  );
}
