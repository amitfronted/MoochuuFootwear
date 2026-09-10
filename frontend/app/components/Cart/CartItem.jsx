'use client';

import React from 'react';

import Image from 'next/image';

import { FiMinus, FiPlus, FiTrash2 } from 'react-icons/fi';

import toast from 'react-hot-toast';

import { useCart } from '../../context/CartContext';

const CartItem = ({ item }) => {
  const { increaseQuantity, decreaseQuantity, removeCartItem, loading } =
    useCart();

  /* =========================================
     IMAGES
  ========================================= */

  const standardImage = item.image || '/placeholder.png';

  const baseImage = item.base?.image || '/placeholder.png';

  const strapImage = item.strap?.image || '/placeholder.png';

  /* =========================================
     PRODUCT TYPE
  ========================================= */

  const isCustomizable = item.productType === 'CUSTOMIZABLE';

  /* =========================================
     GET STOCK
     
     Standard:
       standardVariant.variant.stockQuantity
       OR standardVariant.stockQuantity
       OR item.stockQuantity

     Customizable:
       available stock =
       minimum of Sole / Strap / Thumb
  ========================================= */

  const getStock = (option) => {
    if (!option) return null;

    const stock = option.variant?.stockQuantity ?? option.stockQuantity;

    if (stock === undefined || stock === null) {
      return null;
    }

    return Number(stock);
  };

  let availableStock = 0;

  if (isCustomizable) {
    const stocks = [];

    const baseStock = getStock(item.base);

    const strapStock = getStock(item.strap);

    const thumbStock = getStock(item.thumb);

    if (baseStock !== null && Number.isFinite(baseStock)) {
      stocks.push(baseStock);
    }

    if (strapStock !== null && Number.isFinite(strapStock)) {
      stocks.push(strapStock);
    }

    /*
     * Thumb is optional.
     * Only include it if the item actually
     * has a thumb selected.
     */
    if (item.thumb && thumbStock !== null && Number.isFinite(thumbStock)) {
      stocks.push(thumbStock);
    }

    /*
     * A complete customizable product can
     * only be made as many times as the
     * component with the lowest stock.
     */
    availableStock = stocks.length > 0 ? Math.min(...stocks) : 0;
  } else {
    /*
     * STANDARD PRODUCT
     */

    availableStock = Number(
      item.standardVariant?.variant?.stockQuantity ??
        item.standardVariant?.stockQuantity ??
        item.stockQuantity ??
        0,
    );
  }

  /* =========================================
     CURRENT QUANTITY
  ========================================= */

  const currentQuantity = Number(item.quantity || 0);

  const canIncrease = currentQuantity < availableStock;

  /* =========================================
     INCREASE
  ========================================= */

  const handleIncrease = async () => {
    /*
     * Stop BEFORE making API request.
     */

    if (currentQuantity >= availableStock) {
      toast.error(
        `Only ${availableStock} item${
          availableStock === 1 ? '' : 's'
        } available`,
      );

      return;
    }

    const result = await increaseQuantity(item);

    /*
     * This handles a stock change that
     * happened on the server after the
     * cart was loaded.
     */
    if (result && result.success === false) {
      toast.error(result.message || 'Unable to update quantity');
    }
  };

  /* =========================================
     DECREASE
  ========================================= */

  const handleDecrease = async () => {
    if (currentQuantity <= 1) {
      return;
    }

    const result = await decreaseQuantity(item);

    if (result && result.success === false) {
      toast.error(result.message || 'Unable to update quantity');
    }
  };

  /* =========================================
     REMOVE
  ========================================= */

  const handleRemove = async () => {
    const result = await removeCartItem(item._id);

    if (result && result.success === false) {
      toast.error(result.message || 'Unable to remove item');
    }
  };

  /* =========================================
     PRICE
  ========================================= */

  const itemTotal = Number(item.basePrice || 0) * currentQuantity;

  return (
    <div className="flex gap-4 border-b py-5">
      {/* =====================================
          IMAGE
      ===================================== */}

      <div className="relative h-28 w-28 shrink-0 overflow-hidden rounded-lg bg-gray-100">
        {isCustomizable ? (
          <>
            {item.base?.image && (
              <Image
                src={baseImage}
                alt={item.base?.colorName || item.name}
                fill
                sizes="112px"
                className="object-cover"
              />
            )}

            {item.strap?.image && (
              <Image
                src={strapImage}
                alt={item.strap?.colorName || item.name}
                fill
                sizes="112px"
                className="object-cover"
              />
            )}
          </>
        ) : (
          <Image
            src={standardImage}
            alt={item.name}
            fill
            sizes="112px"
            className="object-cover"
          />
        )}
      </div>

      {/* =====================================
          CONTENT
      ===================================== */}

      <div className="flex min-w-0 flex-1 flex-col">
        {/* PRODUCT HEADER */}

        <div className="flex justify-between gap-4">
          <div>
            <h3 className="font-medium">{item.name}</h3>

            <p className="mt-1 text-sm text-gray-500">
              Code: {item.productCode}
            </p>

            <p className="mt-1 text-sm">
              Size: <strong>{item.size}</strong>
            </p>
          </div>

          <button
            type="button"
            onClick={handleRemove}
            disabled={loading}
            className="text-gray-500 hover:text-red-500 disabled:opacity-40"
          >
            <FiTrash2 size={18} />
          </button>
        </div>

        {/* =====================================
            CUSTOMIZATION
        ===================================== */}

        {isCustomizable && (
          <div className="mt-3 space-y-2 text-sm text-gray-600">
            {/* SOLE */}

            {item.base && (
              <div className="flex items-center gap-2">
                {item.base.image && (
                  <div className="relative h-8 w-8 overflow-hidden rounded border bg-white">
                    <Image
                      src={item.base.image}
                      alt={item.base.colorName || 'Sole'}
                      fill
                      sizes="32px"
                      className="object-contain"
                    />
                  </div>
                )}

                <p>
                  Sole:{' '}
                  <span className="font-medium">{item.base.colorName}</span>
                </p>
              </div>
            )}

            {/* STRAP */}

            {item.strap && (
              <div className="flex items-center gap-2">
                {item.strap.image && (
                  <div className="relative h-8 w-8 overflow-hidden rounded border bg-white">
                    <Image
                      src={item.strap.image}
                      alt={item.strap.colorName || 'Strap'}
                      fill
                      sizes="32px"
                      className="object-contain"
                    />
                  </div>
                )}

                <p>
                  Strap:{' '}
                  <span className="font-medium">{item.strap.colorName}</span>
                </p>
              </div>
            )}

            {/* THUMB */}

            {item.thumb && (
              <div className="flex items-center gap-2">
                {item.thumb.image && (
                  <div className="relative h-8 w-8 overflow-hidden rounded border bg-white">
                    <Image
                      src={item.thumb.image}
                      alt={item.thumb.colorName || 'Thumb'}
                      fill
                      sizes="32px"
                      className="object-contain"
                    />
                  </div>
                )}

                <p>
                  Thumb:{' '}
                  <span className="font-medium">{item.thumb.colorName}</span>
                </p>
              </div>
            )}
          </div>
        )}

        {/* =====================================
            BOTTOM
        ===================================== */}

        <div className="mt-auto flex items-center justify-between pt-3">
          {/* QUANTITY */}

          <div>
            <div className="flex items-center rounded-lg border">
              {/* MINUS */}

              <button
                type="button"
                disabled={loading || currentQuantity <= 1}
                onClick={handleDecrease}
                className="cursor-pointer p-2 disabled:cursor-not-allowed disabled:opacity-40"
              >
                <FiMinus size={14} />
              </button>

              {/* CURRENT */}

              <span className="min-w-8 text-center text-sm">
                {currentQuantity}
              </span>

              {/* PLUS */}

              <button
                type="button"
                disabled={loading || !canIncrease}
                onClick={handleIncrease}
                className="cursor-pointer p-2 disabled:cursor-not-allowed disabled:opacity-40"
              >
                <FiPlus size={14} />
              </button>
            </div>

            {/* STOCK MESSAGE */}

            <p className="mt-1 text-xs text-gray-500">
              {availableStock > 0
                ? `${availableStock} available`
                : 'Out of stock'}
            </p>
          </div>

          {/* PRICE */}

          <div className="text-right">
            <p className="text-sm text-gray-500">
              ₹{Number(item.basePrice || 0).toLocaleString('en-IN')} ×{' '}
              {currentQuantity}
            </p>

            <p className="font-semibold">
              ₹{itemTotal.toLocaleString('en-IN')}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CartItem;
