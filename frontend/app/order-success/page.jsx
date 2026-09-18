'use client';

import React, { Suspense, useEffect, useState } from 'react';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';

import { FiCheckCircle, FiMapPin, FiPackage, FiTruck } from 'react-icons/fi';

import { useOrders } from '../context/OrderContext';

/**
 * Format currency
 */
const money = (value) => {
  const amount = Number(value);

  if (!Number.isFinite(amount)) {
    return '₹0';
  }

  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(amount);
};

/**
 * Simple loading component
 */
const Loader = () => {
  return (
    <div
      className="h-10 w-10 animate-spin rounded-full border-4 border-gray-200 border-t-black"
      aria-label="Loading"
    />
  );
};

const OrderContent = () => {
  const searchParams = useSearchParams();

  const orderId = searchParams.get('orderId');

  /**
   * IMPORTANT:
   *
   * useOrders() returns an object.
   *
   * ❌ Wrong:
   * const [getOrder, loading] = useOrders();
   *
   * ✅ Correct:
   * const { getOrder, loading } = useOrders();
   */
  const { getOrder, loading } = useOrders();

  const [order, setOrder] = useState(null);

  const [error, setError] = useState('');

  useEffect(() => {
    /**
     * No order ID
     */
    if (!orderId) {
      setError('Order ID is missing.');

      return;
    }

    let active = true;

    const loadOrder = async () => {
      setError('');

      try {
        const result = await getOrder(orderId);

        /**
         * Component may have
         * unmounted while request
         * was running.
         */
        if (!active) {
          return;
        }

        if (result?.success) {
          /**
           * Backend response:
           *
           * {
           *   success: true,
           *   data: {
           *     ...order
           *   }
           * }
           *
           * So result.data is the
           * actual order object.
           */
          const orderData = result.data;

          if (
            orderData &&
            typeof orderData === 'object' &&
            !Array.isArray(orderData)
          ) {
            setOrder(orderData);
          } else {
            setError('Invalid order data received.');
          }
        } else {
          setError(result?.message || 'Unable to load order.');
        }
      } catch (err) {
        if (!active) {
          return;
        }

        setError(err?.message || 'Unable to load order.');
      }
    };

    loadOrder();

    /**
     * IMPORTANT:
     *
     * The old code had:
     *
     * active: false;
     *
     * That is a label, not an assignment.
     *
     * It must be:
     */
    return () => {
      active = false;
    };
  }, [orderId, getOrder]);

  /**
   * Loading
   */
  if (loading && !order) {
    return (
      <section className="min-h-[70vh] bg-gray-100 px-4 py-20">
        <div className="flex justify-center py-20">
          <Loader />
        </div>
      </section>
    );
  }

  /**
   * Error / no order
   */
  if (error || !order) {
    return (
      <section className="min-h-[70vh] bg-gray-100 px-4 py-20">
        <div className="mx-auto max-w-xl rounded-md bg-white p-10 text-center shadow-sm">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-red-50">
            <span className="text-3xl text-red-500">!</span>
          </div>

          <h1 className="mt-5 text-2xl font-semibold text-gray-900">
            Unable to load order
          </h1>

          <p className="mt-2 text-gray-500">
            {error || 'Order information is not available.'}
          </p>

          <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-center">
            <Link
              href="/my-account/my-orders"
              className="rounded-md bg-black px-6 py-3 font-semibold text-white"
            >
              View My Orders
            </Link>

            <Link
              href="/shop"
              className="rounded-md bg-yellow px-6 py-3 font-semibold text-black"
            >
              Continue Shopping
            </Link>
          </div>
        </div>
      </section>
    );
  }

  /**
   * Safe values
   */
  const items = Array.isArray(order.items) ? order.items : [];

  const shippingAddress = order.shippingAddress || {};

  return (
    <section className="mt-22 min-h-screen px-4 py-16 md:px-8">
      <div className="mx-auto max-w-4xl">
        {/* -------------------------------- */}
        {/* SUCCESS HEADER */}
        {/* -------------------------------- */}

        <div className="rounded-md bg-white p-8 text-center shadow-sm">
          <FiCheckCircle className="mx-auto text-6xl text-green-500" />

          <h1 className="mt-5 text-3xl font-bold text-gray-900">
            Order Placed Successfully!
          </h1>

          <p className="mt-2 text-gray-500">
            Thank you for shopping with Moochuu Footwear.
          </p>

          {/* Order Number */}
          <div className="mx-auto mt-6 max-w-md rounded-md bg-gray-50 p-4">
            <p className="text-sm text-gray-500">Order Number</p>

            <p className="mt-1 text-lg font-bold text-gray-900">
              {order.orderNumber || order._id || 'N/A'}
            </p>
          </div>

          {/* Status */}
          <div className="mt-4 flex flex-wrap justify-center gap-2">
            {order.orderStatus && (
              <span className="rounded-full bg-green-100 px-4 py-1 text-sm font-medium text-green-700">
                {order.orderStatus}
              </span>
            )}

            {order.paymentMethod && (
              <span className="rounded-full bg-gray-100 px-4 py-1 text-sm font-medium text-gray-700">
                {order.paymentMethod}
              </span>
            )}
          </div>
        </div>

        {/* -------------------------------- */}
        {/* ORDER + ADDRESS */}
        {/* -------------------------------- */}

        <div className="mt-6 grid gap-6 md:grid-cols-2">
          {/* -------------------------------- */}
          {/* ORDER DETAILS */}
          {/* -------------------------------- */}

          <div className="rounded-md bg-white p-6 shadow-sm">
            <h2 className="flex items-center gap-2 text-lg font-semibold text-gray-900">
              <FiPackage />
              Order Details
            </h2>

            <div className="mt-5 space-y-4">
              {items.length === 0 ? (
                <p className="text-sm text-gray-500">
                  No items found in this order.
                </p>
              ) : (
                items.map((item, index) => (
                  <div
                    key={item._id || `${item.productId}-${item.size}-${index}`}
                    className="border-b border-gray-100 pb-4 last:border-0"
                  >
                    <div className="flex justify-between gap-4">
                      {/* Product information */}
                      <div className="min-w-0">
                        <p className="font-semibold text-gray-900">
                          {item.name || 'Product'}
                        </p>

                        <p className="mt-1 text-sm text-gray-500">
                          Size {item.size || 'N/A'} · Qty {item.quantity || 0}
                        </p>

                        {/* Product code */}
                        {item.productCode && (
                          <p className="mt-1 text-xs text-gray-400">
                            Code: {item.productCode}
                          </p>
                        )}

                        {/* Sole */}
                        {item.base && (
                          <p className="mt-1 text-xs text-gray-500">
                            Sole: {item.base.colorName || 'N/A'}
                          </p>
                        )}

                        {/* Strap */}
                        {item.strap && (
                          <p className="text-xs text-gray-500">
                            Strap: {item.strap.colorName || 'N/A'}
                          </p>
                        )}

                        {/* Thumb */}
                        {item.thumb && (
                          <p className="text-xs text-gray-500">
                            Thumb: {item.thumb.colorName || 'N/A'}
                          </p>
                        )}
                      </div>

                      {/* Price */}
                      <div className="shrink-0 text-right">
                        <span className="font-semibold text-gray-900">
                          {money(item.lineTotal)}
                        </span>

                        {item.quantity > 1 && (
                          <p className="mt-1 text-xs text-gray-400">
                            {money(item.unitPrice)} each
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* -------------------------------- */}
            {/* TOTALS */}
            {/* -------------------------------- */}

            <div className="mt-5 space-y-2 border-t border-gray-200 pt-4 text-sm text-gray-700">
              <div className="flex justify-between">
                <span>Subtotal</span>

                <span>{money(order.subtotal)}</span>
              </div>

              {Number(order.couponDiscount) > 0 && (
                <div className="flex justify-between">
                  <span>
                    Coupon Discount
                    {order.couponCode ? ` (${order.couponCode})` : ''}
                  </span>

                  <span className="text-green-600">
                    -{money(order.couponDiscount)}
                  </span>
                </div>
              )}

              <div className="flex justify-between">
                <span>Shipping</span>

                <span>
                  {Number(order.shippingCharge) > 0
                    ? money(order.shippingCharge)
                    : 'FREE'}
                </span>
              </div>

              <div className="flex justify-between">
                <span>Tax</span>

                <span>{money(order.tax)}</span>
              </div>

              <div className="flex justify-between border-t border-gray-200 pt-3 text-base font-bold text-gray-900">
                <span>Total</span>

                <span>{money(order.totalAmount)}</span>
              </div>
            </div>
          </div>

          {/* -------------------------------- */}
          {/* DELIVERY ADDRESS */}
          {/* -------------------------------- */}

          <div className="rounded-md bg-white p-6 shadow-sm">
            <h2 className="flex items-center gap-2 text-lg font-semibold text-gray-900">
              <FiMapPin />
              Delivery Address
            </h2>

            <div className="mt-5 text-sm leading-6 text-gray-700">
              {shippingAddress.name && (
                <p className="font-semibold text-gray-900">
                  {shippingAddress.name}
                </p>
              )}

              {shippingAddress.addressLine1 && (
                <p>{shippingAddress.addressLine1}</p>
              )}

              {(shippingAddress.city ||
                shippingAddress.state ||
                shippingAddress.postalCode) && (
                <p>
                  {shippingAddress.city}
                  {shippingAddress.city && shippingAddress.state && ', '}
                  {shippingAddress.state}

                  {shippingAddress.postalCode && ' - '}

                  {shippingAddress.postalCode}
                </p>
              )}

              {shippingAddress.landmark && (
                <p>Landmark: {shippingAddress.landmark}</p>
              )}

              {shippingAddress.phone && <p>{shippingAddress.phone}</p>}

              {shippingAddress.country && <p>{shippingAddress.country}</p>}
            </div>

            {/* -------------------------------- */}
            {/* ORDER STATUS */}
            {/* -------------------------------- */}

            <div className="mt-6 rounded-md bg-green-50 p-4 text-sm text-green-900">
              <p>
                <strong>Status:</strong> {order.orderStatus || 'PLACED'}
              </p>

              <p>
                <strong>Payment:</strong> {order.paymentMethod || 'COD'}
              </p>

              <p>
                <strong>Payment Status:</strong>{' '}
                {order.paymentStatus || 'PENDING'}
              </p>
            </div>
          </div>
        </div>

        {/* SHIPPING TRACKING */}

        {(order.shipping?.courierName ||
          order.shipping?.trackingNumber ||
          order.shipping?.trackingUrl) && (
          <div className="rounded-md bg-white p-6 shadow-sm mt-4">
            <h2 className="flex items-center gap-2 text-lg font-semibold text-gray-900">
              <FiTruck />
              Shipment Tracking
            </h2>

            <div className="mt-4 space-y-2 text-sm text-gray-700">
              {order.shipping?.courierName && (
                <p>
                  <strong>Courier:</strong> {order.shipping.courierName}
                </p>
              )}

              {order.shipping?.trackingNumber && (
                <p>
                  <strong>Tracking Number:</strong>{' '}
                  {order.shipping.trackingNumber}
                </p>
              )}

              {order.shipping?.shippedAt && (
                <p>
                  <strong>Shipped:</strong>{' '}
                  {new Date(order.shipping.shippedAt).toLocaleString('en-IN')}
                </p>
              )}

              {order.shipping?.trackingUrl && (
                <a
                  href={order.shipping.trackingUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-3 inline-flex rounded-md bg-black px-4 py-2 font-semibold text-white hover:bg-gray-800"
                >
                  Track Shipment
                </a>
              )}
            </div>
          </div>
        )}

        {/* -------------------------------- */}
        {/* ACTION BUTTONS */}
        {/* -------------------------------- */}

        <div className="mt-6 flex flex-col justify-center gap-3 sm:flex-row">
          <Link
            href={`/invoice?orderId=${order._id}`}
            className="rounded-md border border-black bg-white px-6 py-3 text-center font-semibold text-black transition hover:bg-gray-50"
          >
            Print / Save Invoice
          </Link>

          <Link
            href="/my-account/my-orders"
            className="rounded-md bg-black px-6 py-3 text-center font-semibold text-white transition hover:bg-gray-800"
          >
            View My Orders
          </Link>

          <Link
            href="/shop"
            className="rounded-md bg-yellow px-6 py-3 text-center font-semibold text-black transition hover:opacity-90"
          >
            Continue Shopping
          </Link>
        </div>
      </div>
    </section>
  );
};

const OrderSuccess = () => {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center">
          <Loader />
        </div>
      }
    >
      <OrderContent />
    </Suspense>
  );
};

export default OrderSuccess;
