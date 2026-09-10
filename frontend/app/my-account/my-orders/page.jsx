'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { useOrders } from '../../context/OrderContext';
import Loader from '../../components/Loader';

import { FiPackage, FiChevronRight, FiMapPin } from 'react-icons/fi';

const money = (value) =>
  `₹${Number(value || 0).toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

/**
 * Safely get an image from an option.
 */
const getOptionImage = (option) => {
  if (!option) return '';

  return (
    option.image || option.img || option.colorImage || option.imageUrl || ''
  );
};

/**
 * Safely get color name.
 */
const getColorName = (option) => {
  if (!option) return '';

  return option.colorName || option.name || option.color || '';
};

/**
 * Product image
 */
const ProductImage = ({ item, large = false }) => {
  const isCustomizable =
    String(item?.productType || '').toUpperCase() === 'CUSTOMIZABLE';

  const productImage =
    item?.image || item?.productImage || item?.mainImage || '';

  const baseImage = getOptionImage(item?.base);
  const strapImage = getOptionImage(item?.strap);
  const thumbImage = getOptionImage(item?.thumb);

  const size = large ? 'h-28 w-28 sm:h-32 sm:w-32' : 'h-16 w-16';

  return (
    <div
      className={`${size} shrink-0 overflow-hidden rounded-lg border border-gray-200 bg-white`}
    >
      {isCustomizable ? (
        <div className="relative h-28 w-28 shrink-0 overflow-hidden">
          {/* BASE */}
          {baseImage && (
            <img
              src={baseImage}
              alt={getColorName(item?.base) || 'Base'}
              className="absolute inset-0 h-full w-full object-contain"
            />
          )}

          {/* STRAP */}
          {strapImage && (
            <img
              src={strapImage}
              alt={getColorName(item?.strap) || 'Strap'}
              className="absolute inset-0 h-full w-full object-contain"
            />
          )}

          {/* THUMB */}
          {thumbImage && (
            <img
              src={thumbImage}
              alt={getColorName(item?.thumb) || 'Thumb'}
              className="absolute inset-0 h-full w-full object-contain"
            />
          )}

          {!baseImage && !strapImage && !thumbImage && (
            <div className="flex h-full w-full items-center justify-center bg-gray-100">
              <FiPackage className="text-2xl text-gray-400" />
            </div>
          )}
        </div>
      ) : (
        <img
          src={productImage}
          alt={item?.name || 'Product'}
          className="h-full w-full object-contain"
        />
      )}
    </div>
  );
};

/**
 * Small configuration item
 *
 * Used for:
 * Sole
 * Strip
 * Thumb
 * Standard Color
 */
const ConfigItem = ({ label, option }) => {
  if (!option) return null;

  const image = getOptionImage(option);

  const colorName = getColorName(option);

  return (
    <div className="flex min-w-0 items-center gap-3">
      <div className="h-14 w-14 shrink-0 overflow-hidden rounded-lg border border-gray-200 bg-white">
        {image ? (
          <img
            src={image}
            alt={colorName || label}
            className="h-full w-full object-contain"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-gray-100">
            <span className="text-[10px] text-gray-400">No image</span>
          </div>
        )}
      </div>

      <div className="min-w-0">
        <p className="text-xs text-gray-500">{label}</p>

        <p className="truncate text-sm font-medium text-gray-900">
          {colorName || 'N/A'}
        </p>
      </div>
    </div>
  );
};

/**
 * Status badge
 */
const StatusBadge = ({ status }) => {
  const value = String(status || 'PLACED').toUpperCase();

  const styles = {
    DELIVERED: 'bg-green-100 text-green-700',

    SHIPPED: 'bg-blue-100 text-blue-700',

    PROCESSING: 'bg-purple-100 text-purple-700',

    CONFIRMED: 'bg-indigo-100 text-indigo-700',

    PLACED: 'bg-gray-100 text-gray-700',

    CANCELLED: 'bg-red-100 text-red-700',

    RETURNED: 'bg-orange-100 text-orange-700',
  };

  return (
    <span
      className={`rounded-full px-3 py-1 text-xs font-semibold ${
        styles[value] || 'bg-gray-100 text-gray-700'
      }`}
    >
      {value}
    </span>
  );
};

/**
 * Payment badge
 */
const PaymentBadge = ({ method, status }) => {
  const payment = String(method || 'COD').toUpperCase();

  const isPaid = String(status || '').toUpperCase() === 'PAID';

  return (
    <span
      className={`rounded-full px-3 py-1 text-xs font-semibold ${
        isPaid
          ? 'bg-green-100 text-green-700'
          : payment === 'COD'
            ? 'bg-blue-100 text-blue-700'
            : 'bg-amber-100 text-amber-700'
      }`}
    >
      {isPaid ? `${payment} PAID` : payment}
    </span>
  );
};

/**
 * Format order date
 */
const formatOrderDate = (date) => {
  if (!date) return 'N/A';

  const parsed = new Date(date);

  if (Number.isNaN(parsed.getTime())) {
    return 'N/A';
  }

  return parsed.toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
};

/**
 * Single order item
 */
const OrderItem = ({ item }) => {
  const isStandard =
    String(item.productType || '').toUpperCase() === 'STANDARD';

  const isCustomizable =
    String(item.productType || '').toUpperCase() === 'CUSTOMIZABLE';

  /**
   * Main product image
   */
  const productImage = item.image || item.productImage || item.mainImage || '';

  /**
   * Standard color
   *
   * Depending on your cart/order structure,
   * it can be in standard or standardVariant.
   */
  const standardOption = item.standard || item.standardVariant || null;

  return (
    <div className="rounded-xl bg-gray-50 p-4 sm:p-5">
      <div className="flex flex-col gap-5 xl:flex-row xl:items-center">
        {/* ================================= */}
        {/* PRODUCT */}
        {/* ================================= */}

        <div className="flex min-w-0 flex-1 items-center gap-4">
          <ProductImage item={item} large />

          <div className="min-w-0">
            <h3 className="truncate text-base font-bold text-gray-900 sm:text-lg">
              {item.name || 'Product'}
            </h3>

            <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-sm text-gray-500">
              <span>
                Size{' '}
                <strong className="text-gray-700">{item.size || 'N/A'}</strong>
              </span>

              <span>
                Qty{' '}
                <strong className="text-gray-700">{item.quantity || 0}</strong>
              </span>
            </div>

            {item.productCode && (
              <p className="mt-1 text-xs text-gray-400">{item.productCode}</p>
            )}
          </div>
        </div>

        {/* ================================= */}
        {/* OPTIONS */}
        {/* ================================= */}

        <div className="flex flex-1 flex-wrap gap-x-7 gap-y-4">
          {/* STANDARD */}
          {isStandard && <ConfigItem label="Color" option={standardOption} />}

          {/* CUSTOMIZABLE */}
          {isCustomizable && (
            <>
              <ConfigItem label="Sole" option={item.base} />

              <ConfigItem label="Strip" option={item.strap} />

              {item.thumb && <ConfigItem label="Thumb" option={item.thumb} />}
            </>
          )}
        </div>

        {/* ================================= */}
        {/* PRICE */}
        {/* ================================= */}

        <div className="shrink-0 border-t border-gray-200 pt-3 text-left xl:border-l xl:border-t-0 xl:pl-6 xl:pt-0 xl:text-right">
          <p className="text-xs text-gray-500">Item Total</p>

          <p className="mt-1 text-base font-bold text-gray-900 sm:text-lg">
            {money(item.lineTotal)}
          </p>
        </div>
      </div>
    </div>
  );
};

/**
 * Order card
 */
const OrderCard = ({ order }) => {
  const items = Array.isArray(order.items) ? order.items : [];

  return (
    <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm transition hover:shadow-md">
      {/* ================================= */}
      {/* ORDER HEADER */}
      {/* ================================= */}

      <div className="border-b border-gray-200 p-5 sm:p-6">
        <div className="grid gap-5 md:grid-cols-[1.2fr_1fr_auto] md:items-center">
          {/* Order Number */}
          <div>
            <p className="text-xs uppercase tracking-wide text-gray-500">
              Order Number
            </p>

            <p className="mt-1 text-base font-bold text-gray-900 sm:text-lg">
              #{order.orderNumber || order._id}
            </p>

            <p className="mt-1 text-xs text-gray-500">
              Placed on {formatOrderDate(order.createdAt)}
            </p>
          </div>

          {/* Status */}
          <div className="flex flex-wrap gap-2">
            <StatusBadge status={order.orderStatus} />

            <PaymentBadge
              method={order.paymentMethod}
              status={order.paymentStatus}
            />
          </div>

          {/* Total */}
          <div className="flex items-center justify-between gap-5 md:block md:text-right">
            <div>
              <p className="text-xs text-gray-500">Total</p>

              <p className="mt-1 text-lg font-bold text-gray-900 sm:text-xl">
                {money(order.totalAmount)}
              </p>
            </div>

            <FiChevronRight className="text-xl text-gray-400 md:ml-auto md:mt-2" />
          </div>
        </div>
      </div>

      {/* ================================= */}
      {/* ORDER ITEMS */}
      {/* ================================= */}

      <div className="space-y-3 p-4 sm:p-5">
        {items.length ? (
          items.map((item, index) => (
            <OrderItem
              key={item._id || `${item.productId}-${item.size}-${index}`}
              item={item}
            />
          ))
        ) : (
          <div className="rounded-lg bg-gray-50 p-5 text-center text-sm text-gray-500">
            No items found in this order.
          </div>
        )}
      </div>

      {/* ================================= */}
      {/* ORDER FOOTER */}
      {/* ================================= */}

      <div className="flex flex-col gap-3 border-t border-gray-200 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2 text-sm text-gray-500">
          <FiMapPin />

          {order.shippingAddress?.city ? (
            <span>
              Delivering to{' '}
              <strong className="text-gray-700">
                {order.shippingAddress.city}
              </strong>
            </span>
          ) : (
            <span>Delivery address</span>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-4">
          <Link
            href={`/order-success?orderId=${order._id}`}
            className="text-sm font-semibold text-gray-900 underline underline-offset-4"
          >
            View Order Details
          </Link>

          <Link
            href={`/invoice?orderId=${order._id}`}
            className="text-sm font-semibold text-gray-900 underline underline-offset-4"
          >
            Invoice
          </Link>
        </div>
      </div>
    </div>
  );
};

/**
 * My Orders Page
 */
const MyOrdersPage = () => {
  const { orders, loading, getMyOrders } = useOrders();

  useEffect(() => {
    getMyOrders();
  }, [getMyOrders]);

  const orderList = Array.isArray(orders) ? orders : [];

  return (
    <div className="w-full">
      {/* ================================= */}
      {/* PAGE HEADER */}
      {/* ================================= */}

      <div className="rounded-xl border border-gray-200 bg-white shadow-sm">
        <div className="border-b border-gray-200 p-5 sm:p-6">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="text-xl font-bold text-gray-900 sm:text-2xl">
                My Orders
              </h1>

              <p className="mt-1 text-sm text-gray-500">
                {orderList.length} order
                {orderList.length === 1 ? '' : 's'}
              </p>
            </div>

            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gray-100">
              <FiPackage className="text-lg text-gray-700" />
            </div>
          </div>
        </div>

        {/* ================================= */}
        {/* LOADING */}
        {/* ================================= */}

        {loading ? (
          <div className="flex justify-center py-20">
            <Loader />
          </div>
        ) : !orderList.length ? (
          /* ================================= */
          /* EMPTY */
          /* ================================= */

          <div className="p-12 text-center sm:p-16">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-gray-100">
              <FiPackage className="text-2xl text-gray-400" />
            </div>

            <h2 className="mt-5 text-lg font-bold text-gray-900">
              No orders yet
            </h2>

            <p className="mx-auto mt-2 max-w-md text-sm text-gray-500">
              Your placed orders will appear here.
            </p>

            <Link
              href="/shop"
              className="mt-6 inline-flex rounded-md bg-yellow px-6 py-3 font-semibold text-black transition hover:opacity-90"
            >
              Start Shopping
            </Link>
          </div>
        ) : (
          /* ================================= */
          /* ORDERS */
          /* ================================= */

          <div
            id="yourOrder"
            className="space-y-4 m-3 p-2 sm:m-5 sm:p-3 overflow-y-scroll min-h-120 max-h-120"
          >
            {orderList.map((order) => (
              <OrderCard key={order._id} order={order} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default MyOrdersPage;
