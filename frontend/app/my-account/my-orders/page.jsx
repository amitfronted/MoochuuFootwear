'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import toast from 'react-hot-toast';

import { useOrders } from '../../context/OrderContext';
import Loader from '../../components/Loader';
import ConfirmModal from '../../components/ConfirmModal';
import ReturnModal from '../../components/ReturnModal';

import {
  FiPackage,
  FiChevronRight,
  FiMapPin,
  FiXCircle,
  FiRotateCcw,
  FiTruck,
} from 'react-icons/fi';

const money = (value) =>
  `₹${Number(value || 0).toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

const getReturnDeadline = (deliveredAt) => {
  if (!deliveredAt) return null;

  const deadline = new Date(deliveredAt);

  if (Number.isNaN(deadline.getTime())) {
    return null;
  }

  deadline.setDate(deadline.getDate() + 7);

  return deadline;
};

const formatReturnDeadline = (deliveredAt) => {
  const deadline = getReturnDeadline(deliveredAt);

  if (!deadline) return null;

  return deadline.toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
};

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
const OrderCard = ({
  order,
  onCancelOrder,
  cancellingOrderId,
  onReturnOrder,
  returningOrderId,
}) => {
  const items = Array.isArray(order.items) ? order.items : [];
  const canCancel = ['PLACED', 'CONFIRMED', 'PROCESSING'].includes(
    order.orderStatus,
  );
  const isCancelling = cancellingOrderId === order._id;

  const returnDeadline = getReturnDeadline(order.deliveredAt);
  const returnDeadlineText = formatReturnDeadline(order.deliveredAt);

  const isReturnExpired =
    order.orderStatus === 'DELIVERED' &&
    order.returnStatus === 'NONE' &&
    returnDeadline &&
    new Date() > returnDeadline;

  const canReturn =
    order.orderStatus === 'DELIVERED' &&
    order.returnStatus === 'NONE' &&
    Boolean(order.deliveredAt) &&
    !isReturnExpired;

  const isReturning = returningOrderId === order._id;

  return (
    <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm transition hover:shadow-md">
      {/* ================================= */}
      {/* ORDER HEADER */}
      {/* ================================= */}

      <div className="border-b border-gray-200 p-5 sm:p-6">
        <div className="grid gap-5 md:grid-cols-[1fr_1.5fr_auto] md:items-center">
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
          <div className="flex flex-wrap gap-2 justify-center items-center">
            <StatusBadge status={order.orderStatus} />

            <PaymentBadge
              method={order.paymentMethod}
              status={order.paymentStatus}
            />
            <div>
              {order.orderStatus === 'DELIVERED' &&
                order.returnStatus === 'NONE' &&
                order.deliveredAt && (
                  <div className="text-xs text-gray-500">
                    {isReturnExpired ? (
                      <span className="font-medium text-red-600">
                        Return window expired
                      </span>
                    ) : (
                      <span>
                        Return available until{' '}
                        <strong className="text-gray-700">
                          {returnDeadlineText}
                        </strong>
                      </span>
                    )}
                  </div>
                )}
            </div>
            {order.returnStatus && order.returnStatus !== 'NONE' && (
              <span
                className={`rounded-full px-3 py-1 text-xs font-semibold ${
                  order.returnStatus === 'REQUESTED'
                    ? 'bg-amber-100 text-amber-700'
                    : order.returnStatus === 'APPROVED'
                      ? 'bg-blue-100 text-blue-700'
                      : order.returnStatus === 'COMPLETED'
                        ? 'bg-green-100 text-green-700'
                        : order.returnStatus === 'REJECTED'
                          ? 'bg-red-100 text-red-700'
                          : 'bg-gray-100 text-gray-700'
                }`}
              >
                RETURN {order.returnStatus}
              </span>
            )}
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

      {(order.shipping?.courierName ||
        order.shipping?.trackingNumber ||
        order.shipping?.trackingUrl) && (
        <div className="mx-4 mb-4 rounded-xl border border-gray-200 bg-gray-50 p-4 sm:mx-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-3">
              <FiTruck className="mt-0.5 text-lg text-gray-700" />

              <div>
                <p className="text-sm font-semibold text-gray-900">Shipment</p>

                <div className="mt-1 space-y-1 text-sm text-gray-600">
                  {order.shipping?.courierName && (
                    <p>
                      Courier:{' '}
                      <strong className="text-gray-800">
                        {order.shipping.courierName}
                      </strong>
                    </p>
                  )}

                  {order.shipping?.trackingNumber && (
                    <p>
                      Tracking No:{' '}
                      <strong className="text-gray-800">
                        {order.shipping.trackingNumber}
                      </strong>
                    </p>
                  )}

                  {order.shipping?.shippedAt && (
                    <p>Shipped: {formatOrderDate(order.shipping.shippedAt)}</p>
                  )}
                </div>
              </div>
            </div>

            {order.shipping?.trackingUrl && (
              <a
                href={order.shipping.trackingUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center rounded-md border border-gray-900 px-4 py-2 text-sm font-semibold text-gray-900 transition hover:bg-gray-900 hover:text-white"
              >
                Track Shipment
              </a>
            )}
          </div>
        </div>
      )}

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
          {canReturn && (
            <button
              type="button"
              disabled={isReturning}
              onClick={() => onReturnOrder(order)}
              className="
                inline-flex
                items-center
                gap-2
                rounded-md
                border
                border-orange-200
                px-4
                py-2
                text-sm
                font-semibold
                text-orange-600
                transition
                hover:bg-orange-50
                disabled:cursor-not-allowed
                disabled:opacity-50
              "
            >
              <FiRotateCcw />

              {isReturning ? 'Submitting...' : 'Return Order'}
            </button>
          )}
          {canCancel && (
            <button
              type="button"
              disabled={isCancelling}
              onClick={() => onCancelOrder(order)}
              className="
                  inline-flex
                  items-center
                  gap-2
                  rounded-md
                  border
                  border-red-200
                  px-4
                  py-2
                  text-sm
                  font-semibold
                  text-red-600
                  transition
                  hover:bg-red-50
                  disabled:cursor-not-allowed
                  disabled:opacity-50
                "
            >
              <FiXCircle />

              {isCancelling ? 'Cancelling...' : 'Cancel Order'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

/**
 * My Orders Page
 */
const MyOrdersPage = () => {
  const { orders, loading, getMyOrders, cancelOrder, requestReturn } =
    useOrders();
  const [cancellingOrderId, setCancellingOrderId] = useState(null);
  const [orderToCancel, setOrderToCancel] = useState(null);

  const [returningOrderId, setReturningOrderId] = useState(null);
  const [orderToReturn, setOrderToReturn] = useState(null);
  const [returnItems, setReturnItems] = useState([]);
  const [returnComment, setReturnComment] = useState('');

  const handleCancelOrder = (order) => {
    if (!order?._id) return;

    setOrderToCancel(order);
  };

  const confirmCancelOrder = async () => {
    if (!orderToCancel?._id) return;

    try {
      setCancellingOrderId(orderToCancel._id);

      const response = await cancelOrder(orderToCancel._id);

      if (response.success) {
        toast.success('Order cancelled successfully.');
        setOrderToCancel(null);
      } else {
        toast.error(response.message || 'Unable to cancel order.');
      }
    } catch (error) {
      console.error('CANCEL ORDER ERROR:', error);

      toast.error(error?.message || 'Unable to cancel order.');
    } finally {
      setCancellingOrderId(null);
    }
  };

  const handleReturnOrder = (order) => {
    if (!order?._id) return;

    setOrderToReturn(order);
    setReturnItems([]);
    setReturnComment('');
  };

  const handleToggleReturnItem = (item) => {
    const itemId = String(item?._id || '');

    if (!itemId) return;

    setReturnItems((prev) => {
      const exists = prev.some(
        (selected) => String(selected.orderItemId) === itemId,
      );

      if (exists) {
        return prev.filter(
          (selected) => String(selected.orderItemId) !== itemId,
        );
      }

      return [
        ...prev,
        {
          orderItemId: itemId,
          quantity: 1,
          reason: '',
          comment: '',
        },
      ];
    });
  };

  const handleReturnItemQuantityChange = (orderItemId, quantity) => {
    setReturnItems((prev) =>
      prev.map((item) =>
        String(item.orderItemId) === String(orderItemId)
          ? {
              ...item,
              quantity,
            }
          : item,
      ),
    );
  };

  const handleReturnItemReasonChange = (orderItemId, reason) => {
    setReturnItems((prev) =>
      prev.map((item) =>
        String(item.orderItemId) === String(orderItemId)
          ? {
              ...item,
              reason,
            }
          : item,
      ),
    );
  };

  const handleReturnItemCommentChange = (orderItemId, comment) => {
    setReturnItems((prev) =>
      prev.map((item) =>
        String(item.orderItemId) === String(orderItemId)
          ? {
              ...item,
              comment,
            }
          : item,
      ),
    );
  };

  const submitReturnRequest = async () => {
    if (!orderToReturn?._id) return;

    if (!returnItems.length) {
      toast.error('Please select at least one item to return.');
      return;
    }

    const hasMissingReason = returnItems.some((item) => !item.reason);

    if (hasMissingReason) {
      toast.error('Please select a return reason for every selected item.');
      return;
    }

    try {
      setReturningOrderId(orderToReturn._id);

      /*
       * The backend still requires the legacy top-level
       * `reason` field. Use the first selected item's reason
       * for that compatibility field.
       *
       * The actual item-level reasons are sent inside `items`.
       */
      const firstReason = returnItems[0]?.reason || 'OTHER';

      const response = await requestReturn(orderToReturn._id, {
        reason: firstReason,
        comment: returnComment.trim(),

        items: returnItems.map((item) => ({
          orderItemId: item.orderItemId,
          quantity: Number(item.quantity),
          reason: item.reason,
          comment: String(item.comment || '').trim(),
        })),
      });

      if (response.success) {
        toast.success('Return request submitted successfully.');

        setOrderToReturn(null);
        setReturnItems([]);
        setReturnComment('');

        await getMyOrders();
      } else {
        toast.error(response.message || 'Unable to submit return request.');
      }
    } catch (error) {
      console.error('RETURN ORDER ERROR:', error);

      toast.error(error?.message || 'Unable to submit return request.');
    } finally {
      setReturningOrderId(null);
    }
  };

  useEffect(() => {
    getMyOrders();
  }, [getMyOrders]);

  useEffect(() => {
    console.log('RETURN ITEMS STATE:', returnItems);
  }, [returnItems]);

  const orderList = Array.isArray(orders) ? orders : [];

  return (
    <>
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
                <OrderCard
                  key={order._id}
                  order={order}
                  onCancelOrder={handleCancelOrder}
                  cancellingOrderId={cancellingOrderId}
                  onReturnOrder={handleReturnOrder}
                  returningOrderId={returningOrderId}
                />
              ))}
            </div>
          )}
        </div>
      </div>
      <ConfirmModal
        open={Boolean(orderToCancel)}
        title="Cancel Order?"
        message={
          orderToCancel
            ? `Are you sure you want to cancel order #${orderToCancel.orderNumber}? This action cannot be undone.`
            : ''
        }
        confirmText="Cancel Order"
        cancelText="Keep Order"
        loading={cancellingOrderId === orderToCancel?._id}
        onCancel={() => {
          if (!cancellingOrderId) {
            setOrderToCancel(null);
          }
        }}
        onConfirm={confirmCancelOrder}
      />
      <ReturnModal
        open={Boolean(orderToReturn)}
        onClose={() => {
          if (!returningOrderId) {
            setOrderToReturn(null);
            setReturnItems([]);
            setReturnComment('');
          }
        }}
        onSubmit={submitReturnRequest}
        order={orderToReturn}
        selectedItems={returnItems}
        onToggleItem={handleToggleReturnItem}
        onQuantityChange={handleReturnItemQuantityChange}
        onReasonChange={handleReturnItemReasonChange}
        onItemCommentChange={handleReturnItemCommentChange}
        comment={returnComment}
        setComment={setReturnComment}
        submitting={Boolean(returningOrderId)}
      />
    </>
  );
};

export default MyOrdersPage;
