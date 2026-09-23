'use client';

import Image from 'next/image';
import { useState, useEffect, useRef } from 'react';

import RelatedProducts from './RelatedProducts';
import { useCart } from '@/app/context/CartContext';
import toast from 'react-hot-toast';

const SingleProduct = ({ product }) => {
  const { addToCart, cart, loading: cartLoading } = useCart();

  /*
   * IMPORTANT:
   *
   * React state does not update synchronously.
   *
   * If user clicks Add to Cart 5 times very quickly,
   * cartLoading may still be false for all clicks before
   * React re-renders.
   *
   * useRef gives us an immediate synchronous lock.
   */
  const addToCartLock = useRef(false);

  /* =========================================================
     PRODUCT TYPE
  ========================================================= */

  const isStandard = product?.productType === 'STANDARD';

  const isCustomizable = product?.productType === 'CUSTOMIZABLE';

  /* =========================================================
     DATA
  ========================================================= */

  const baseColors = product?.allowedBases?.[0]?.colors || [];

  const strapColors = product?.allowedStraps?.[0]?.colors || [];

  const thumbColors = product?.allowedThumbs?.[0]?.colors || [];

  const standardStock = product?.standardStock || [];

  /* =========================================================
     STATE
  ========================================================= */

  const [selectedSize, setSelectedSize] = useState('');

  const [selectedBase, setSelectedBase] = useState('');

  const [selectedStrap, setSelectedStrap] = useState('');

  const [selectedThumb, setSelectedThumb] = useState('');

  /* =========================================================
     SYNC CUSTOMIZATION OPTIONS
  ========================================================= */

  useEffect(() => {
    if (!isCustomizable) {
      return;
    }

    if (baseColors.length > 0 && !selectedBase) {
      setSelectedBase(String(baseColors[0]._id));
    }

    if (strapColors.length > 0 && !selectedStrap) {
      setSelectedStrap(String(strapColors[0]._id));
    }

    if (thumbColors.length > 0 && !selectedThumb) {
      setSelectedThumb(String(thumbColors[0]._id));
    }
  }, [
    product,
    isCustomizable,
    baseColors,
    strapColors,
    thumbColors,
    selectedBase,
    selectedStrap,
    selectedThumb,
  ]);

  /* =========================================================
     SELECTED CUSTOMIZATION DATA
  ========================================================= */

  const selectedBaseData = baseColors.find(
    (item) => String(item._id) === String(selectedBase),
  );

  const selectedStrapData = strapColors.find(
    (item) => String(item._id) === String(selectedStrap),
  );

  const selectedThumbData = thumbColors.find(
    (item) => String(item._id) === String(selectedThumb),
  );

  /* =========================================================
     HELPERS
  ========================================================= */

  const getVariantBySize = (item, size) => {
    if (!item || !size) {
      return null;
    }

    return (
      item.variants?.find((variant) => String(variant.size) === String(size)) ||
      null
    );
  };

  const getStockBySize = (item, size) => {
    const variant = getVariantBySize(item, size);

    return Number(variant?.stockQuantity ?? 0);
  };

  const isAvailableBySize = (item, size) => {
    return getStockBySize(item, size) > 0;
  };

  /* =========================================================
     STANDARD PRODUCT HELPERS
  ========================================================= */

  const getStandardVariantBySize = (size) => {
    if (!size) {
      return null;
    }

    return (
      standardStock.find((item) => String(item?.size) === String(size)) || null
    );
  };

  const getStandardStockBySize = (size) => {
    const variant = getStandardVariantBySize(size);

    return Number(variant?.stockQuantity ?? 0);
  };

  const isStandardSizeAvailable = (size) => {
    return getStandardStockBySize(size) > 0;
  };

  /* =========================================================
     SIZES
  ========================================================= */

  const sizes = isStandard
    ? [...new Set(standardStock.map((item) => String(item?.size)))].sort(
        (a, b) => Number(a) - Number(b),
      )
    : [
        ...new Set(
          baseColors.flatMap(
            (color) =>
              color.variants?.map((variant) => String(variant.size)) || [],
          ),
        ),
      ].sort((a, b) => Number(a) - Number(b));

  /* =========================================================
     CURRENT VARIANTS
  ========================================================= */

  const selectedBaseVariant = getVariantBySize(selectedBaseData, selectedSize);

  const selectedStrapVariant = getVariantBySize(
    selectedStrapData,
    selectedSize,
  );

  const selectedThumbVariant = getVariantBySize(
    selectedThumbData,
    selectedSize,
  );

  /* =========================================================
     CURRENT STOCK
  ========================================================= */

  const standardVariant = isStandard
    ? getStandardVariantBySize(selectedSize)
    : null;

  const standardStockQuantity = Number(standardVariant?.stockQuantity ?? 0);

  const baseStock = Number(selectedBaseVariant?.stockQuantity ?? 0);

  const strapStock = Number(selectedStrapVariant?.stockQuantity ?? 0);

  /*
   * Thumb is optional.
   *
   * If there is no selected thumb,
   * Infinity means it does not limit
   * the combination stock.
   */
  const thumbStock = selectedThumbData
    ? Number(selectedThumbVariant?.stockQuantity ?? 0)
    : Infinity;

  /* =========================================================
     ACTUAL COMBINATION STOCK
  ========================================================= */

  /*
   * This is VERY important.
   *
   * Example:
   *
   * Sole  = 50
   * Strap = 20
   * Thumb = 30
   *
   * You can only make 20 complete pairs.
   */

  const customizableAvailableStock =
    isCustomizable && selectedSize && selectedBaseData && selectedStrapData
      ? Math.min(baseStock, strapStock, thumbStock)
      : 0;

  const availableStock = isStandard
    ? standardStockQuantity
    : customizableAvailableStock;

  /* =========================================================
     STOCK STATUS
  ========================================================= */

  const standardOutOfStock =
    isStandard && Boolean(selectedSize) && standardStockQuantity <= 0;

  const baseOutOfStock =
    isCustomizable && Boolean(selectedSize) && baseStock <= 0;

  const strapOutOfStock =
    isCustomizable && Boolean(selectedSize) && strapStock <= 0;

  const thumbOutOfStock =
    isCustomizable &&
    Boolean(selectedSize) &&
    Boolean(selectedThumbData) &&
    thumbStock <= 0;

  const combinationOutOfStock = isStandard
    ? standardOutOfStock
    : Boolean(selectedSize) &&
      (baseOutOfStock || strapOutOfStock || thumbOutOfStock);

  /* =========================================================
     CUSTOMIZABLE SIZE AVAILABILITY
  ========================================================= */

  const isCustomizableSizeAvailable = (size) => {
    if (!size) {
      return false;
    }

    const hasAvailableBase = baseColors.some((base) =>
      isAvailableBySize(base, size),
    );

    const hasAvailableStrap = strapColors.some((strap) =>
      isAvailableBySize(strap, size),
    );

    const hasAvailableThumb = selectedThumbData
      ? isAvailableBySize(selectedThumbData, size)
      : true;

    return hasAvailableBase && hasAvailableStrap && hasAvailableThumb;
  };

  const isSizeAvailable = (size) => {
    if (isStandard) {
      return isStandardSizeAvailable(size);
    }

    return isCustomizableSizeAvailable(size);
  };

  /* =========================================================
     AUTO SELECTION HELPERS
  ========================================================= */

  const findAvailableBase = (size) => {
    if (!size) {
      return null;
    }

    return baseColors.find((base) => isAvailableBySize(base, size)) || null;
  };

  const findAvailableStrap = (size) => {
    if (!size) {
      return null;
    }

    return strapColors.find((strap) => isAvailableBySize(strap, size)) || null;
  };

  const findAvailableThumb = (size) => {
    if (!size) {
      return null;
    }

    return thumbColors.find((thumb) => isAvailableBySize(thumb, size)) || null;
  };

  /* =========================================================
     HANDLERS
  ========================================================= */

  const handleProductSize = (size) => {
    const normalizedSize = String(size);

    setSelectedSize(normalizedSize);

    if (isStandard) {
      return;
    }

    const currentBaseAvailable = isAvailableBySize(
      selectedBaseData,
      normalizedSize,
    );

    if (!currentBaseAvailable) {
      const availableBase = findAvailableBase(normalizedSize);

      setSelectedBase(availableBase?._id ? String(availableBase._id) : '');
    }

    const currentStrapAvailable = isAvailableBySize(
      selectedStrapData,
      normalizedSize,
    );

    if (!currentStrapAvailable) {
      const availableStrap = findAvailableStrap(normalizedSize);

      setSelectedStrap(availableStrap?._id ? String(availableStrap._id) : '');
    }

    if (selectedThumbData) {
      const currentThumbAvailable = isAvailableBySize(
        selectedThumbData,
        normalizedSize,
      );

      if (!currentThumbAvailable) {
        const availableThumb = findAvailableThumb(normalizedSize);

        setSelectedThumb(availableThumb?._id ? String(availableThumb._id) : '');
      }
    }
  };

  const handleSelectBase = (id) => {
    setSelectedBase(String(id));
  };

  const handleSelectStrap = (id) => {
    setSelectedStrap(String(id));
  };

  const handleSelectThumb = (id) => {
    setSelectedThumb(String(id));
  };

  /* =========================================================
     FIND EXISTING CART ITEM
  ========================================================= */

  const findExistingCartItem = () => {
    const items = cart?.items || [];

    return (
      items.find((item) => {
        /*
         * PRODUCT
         */
        if (String(item.productId) !== String(product._id)) {
          return false;
        }

        /*
         * SIZE
         */
        if (String(item.size) !== String(selectedSize)) {
          return false;
        }

        /*
         * STANDARD
         *
         * Standard product is uniquely
         * identified by product + size.
         */
        if (isStandard) {
          return item.productType === 'STANDARD';
        }

        /*
         * CUSTOMIZABLE
         *
         * Must match:
         * product
         * size
         * sole
         * strap
         * thumb
         */
        if (item.productType !== 'CUSTOMIZABLE') {
          return false;
        }

        const itemBase = item.base?.colorId ? String(item.base.colorId) : '';

        const itemStrap = item.strap?.colorId ? String(item.strap.colorId) : '';

        const itemThumb = item.thumb?.colorId ? String(item.thumb.colorId) : '';

        const currentBase = String(
          selectedBaseData?._id || selectedBaseData?.colorId || selectedBase,
        );

        const currentStrap = String(
          selectedStrapData?._id || selectedStrapData?.colorId || selectedStrap,
        );

        const currentThumb = selectedThumbData
          ? String(
              selectedThumbData?._id ||
                selectedThumbData?.colorId ||
                selectedThumb,
            )
          : '';

        return (
          itemBase === currentBase &&
          itemStrap === currentStrap &&
          itemThumb === currentThumb
        );
      }) || null
    );
  };

  /* =========================================================
     ADD TO CART
  ========================================================= */

  const handleAddToCart = async () => {
    /*
     * ======================================
     * SYNCHRONOUS CLICK LOCK
     * ======================================
     *
     * This executes BEFORE React can render.
     *
     * So 10 very fast clicks result in
     * only ONE API request.
     */

    if (addToCartLock.current) {
      return;
    }

    addToCartLock.current = true;

    try {
      /* ====================================
           SIZE
        ==================================== */

      if (!selectedSize) {
        toast.error('Please select a size before adding to cart.');

        return;
      }

      /* ====================================
           STANDARD
        ==================================== */

      if (isStandard) {
        const variant = getStandardVariantBySize(selectedSize);

        if (!variant) {
          toast.error(`Size ${selectedSize} is not available.`);

          return;
        }

        const stockQuantity = Number(variant.stockQuantity ?? 0);

        if (stockQuantity <= 0) {
          toast.error(`Size ${selectedSize} is out of stock.`);

          return;
        }

        /*
         * Find same product + size
         * already in cart.
         */
        const existingItem = findExistingCartItem();

        const existingQuantity = Number(existingItem?.quantity || 0);

        /*
         * We are adding ONE more.
         */
        const requestedQuantity = existingQuantity + 1;

        /*
         * STOP BEFORE API CALL
         */
        if (requestedQuantity > stockQuantity) {
          toast.error(
            `Only ${stockQuantity} item${
              stockQuantity === 1 ? '' : 's'
            } available`,
          );

          return;
        }

        const result = await addToCart({
          productId: product._id,
          size: selectedSize,
          quantity: 1,
        });

        if (!result?.success) {
          toast.error(result?.message || 'Failed to add product to cart.');

          return;
        }

        toast.success('Product added to cart.');

        return;
      }

      /* ====================================
           CUSTOMIZABLE
        ==================================== */

      if (isCustomizable) {
        if (!selectedBase) {
          toast.error('Please select a sole.');

          return;
        }

        if (!selectedStrap) {
          toast.error('Please select a strap.');

          return;
        }

        if (!selectedBaseData) {
          toast.error('Selected sole is not available.');

          return;
        }

        if (!selectedStrapData) {
          toast.error('Selected strap is not available.');

          return;
        }

        /* ==================================
             SOLE STOCK
          ================================== */

        if (!selectedBaseVariant || baseStock <= 0) {
          toast.error(
            `${
              selectedBaseData.colorName || 'Selected sole'
            } is out of stock in size ${selectedSize}.`,
          );

          return;
        }

        /* ==================================
             STRAP STOCK
          ================================== */

        if (!selectedStrapVariant || strapStock <= 0) {
          toast.error(
            `${
              selectedStrapData.colorName || 'Selected strap'
            } is out of stock in size ${selectedSize}.`,
          );

          return;
        }

        /* ==================================
             THUMB STOCK
          ================================== */

        if (selectedThumbData && (!selectedThumbVariant || thumbStock <= 0)) {
          toast.error(
            `${
              selectedThumbData.colorName || 'Selected thumb'
            } is out of stock in size ${selectedSize}.`,
          );

          return;
        }

        /* ==================================
             COMBINATION STOCK
          ================================== */

        const combinationStock = Math.min(baseStock, strapStock, thumbStock);

        if (combinationStock <= 0) {
          toast.error('Selected combination is out of stock.');

          return;
        }

        /*
         * Find EXACT same customization
         * already in cart.
         */
        const existingItem = findExistingCartItem();

        const existingQuantity = Number(existingItem?.quantity || 0);

        /*
         * We are adding one more.
         */
        const requestedQuantity = existingQuantity + 1;

        /*
         * THIS IS THE IMPORTANT FIX.
         *
         * If:
         *
         * Sole = 5
         * Strap = 10
         * Thumb = 8
         *
         * Combination stock = 5.
         *
         * If cart already contains 5,
         * another click is stopped here.
         *
         * NO API REQUEST.
         */
        if (requestedQuantity > combinationStock) {
          toast.error(
            `Only ${combinationStock} item${
              combinationStock === 1 ? '' : 's'
            } available for this combination.`,
          );

          return;
        }

        /* ==================================
             PAYLOAD
          ================================== */

        const payload = {
          productId: String(product._id),

          size: String(selectedSize),

          quantity: 1,

          baseId: String(
            selectedBaseData?._id || selectedBaseData?.colorId || selectedBase,
          ),

          strapId: String(
            selectedStrapData?._id ||
              selectedStrapData?.colorId ||
              selectedStrap,
          ),

          thumbId: selectedThumbData
            ? String(
                selectedThumbData?._id ||
                  selectedThumbData?.colorId ||
                  selectedThumb,
              )
            : null,
        };

        /*
         * Do not console.error here.
         * This is a normal request log.
         */
        // console.log('FINAL CART PAYLOAD:', payload);

        /* ==================================
             API
          ================================== */

        const result = await addToCart(payload);

        if (!result?.success) {
          toast.error(result?.message || 'Failed to add product to cart.');

          return;
        }

        toast.success('Product added to cart.');
      }
    } finally {
      /*
       * Release synchronous lock
       * AFTER request finishes.
       */
      addToCartLock.current = false;
    }
  };

  /* =========================================================
     RENDER
  ========================================================= */

  return (
    <>
      <div className="mx-auto grid max-w-360 grid-cols-1 md:gap-6 gap-0 md:pt-8 md:pb-8 mt-0 pb-0 lg:grid-cols-12 px-4 lg:px-0 md:px-0">
        {/* =========================================
            GALLERY
        ========================================= */}

        <div className="flex gap-3 lg:sticky lg:top-6 lg:col-span-4 lg:max-h-[calc(100vh-3rem)] lg:self-start">
          <div className="flex-1/2">
            <div className="sm:hidden md:hidden flex items-center justify-between pb-2">
              <h2 className="text-xl font-bold text-gray-900 md:text-3xl">
                {product.name}
              </h2>
              <p className="text-xl font-semibold text-gray-900">
                ₹{product.basePrice}
              </p>
            </div>
            <div className="relative flex items-center justify-center overflow-hidden rounded-xl border border-gray-400 bg-white">
              <div className="relative lg:h-140 md:h-140 h-60 w-full" />
              {isStandard && product.mainImage && (
                <Image
                  src={product.mainImage}
                  alt={product.name}
                  fill
                  sizes="(max-width: 768px) 100vw, 50vw"
                  className="object-contain"
                  loading="eager"
                />
              )}

              {isCustomizable && (
                <>
                  {selectedBaseData?.image && (
                    <Image
                      src={selectedBaseData.image}
                      alt={`${product.name} ${
                        selectedBaseData.colorName || 'sole'
                      }`}
                      fill
                      sizes="(max-width: 768px) 100vw, 50vw"
                      className="object-contain"
                      loading="eager"
                    />
                  )}

                  {selectedStrapData?.image && (
                    <Image
                      src={selectedStrapData.image}
                      alt={`${product.name} ${
                        selectedStrapData.colorName || 'strap'
                      }`}
                      fill
                      sizes="(max-width: 768px) 100vw, 50vw"
                      className="object-contain"
                      loading="eager"
                    />
                  )}

                  {selectedThumbData?.image && (
                    <Image
                      src={selectedThumbData.image}
                      alt={`${product.name} ${
                        selectedThumbData.colorName || 'thumb'
                      }`}
                      fill
                      sizes="(max-width: 768px) 100vw, 50vw"
                      className="object-contain"
                      loading="eager"
                    />
                  )}
                </>
              )}
            </div>
          </div>
        </div>
        <div className="lg:col-span-4">
          <div className="md:flex hidden flex-row overflow-x-auto gap-2 lg:flex-col md:flex-col">
            {product.galleryImages?.map((image, index) => (
              <div
                key={image || index}
                className="relative mb-2 h-120 w-full shrink-0 snap-start overflow-hidden rounded-md"
              >
                <Image
                  src={image}
                  alt={`${product.name} product image ${index + 1}`}
                  fill
                  sizes="(max-width: 768px) 100vw, 50vw"
                  className="rounded-md object-cover"
                  loading="eager"
                />
              </div>
            ))}
          </div>
        </div>

        {/* =========================================
            PRODUCT DETAILS
        ========================================= */}

        <div className="lg:sticky lg:top-6 lg:col-span-4 lg:max-h-[calc(100vh-3rem)] lg:self-start">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 md:text-3xl sm:block md:block hidden">
              {product.name}
            </h2>

            {/* <p className="mt-2 text-sm text-gray-500 hidden md:block lg:block">
              Product Code: {product.productCode}
            </p> */}

            <p className="mt-3 text-2xl font-semibold text-gray-900 sm:block md:block hidden">
              ₹{product.basePrice}
            </p>

            {/* <p className="mt-2 text-xs font-medium uppercase tracking-wide text-gray-400 md:block lg:block hidden">
              {product.productType}
            </p> */}

            {/* =====================================
                SIZES
            ===================================== */}

            <div className="md:mt-4 mt-2 flex gap-4 items-center justify-start">
              <h3 className="font-semibold text-gray-900">Select Size</h3>

              <div className="flex md:flex-wrap flex-row gap-3">
                {/* {sizes.map((size) => {
                  const available = isSizeAvailable(size);

                  return (
                    <button
                      key={size}
                      type="button"
                      disabled={!available}
                      onClick={() => handleProductSize(size)}
                      className={`relative md:h-10 md:min-w-10 h-6 text-[10px] md:text-sm min-w-6 rounded-md border md:px-3 px-1 transition ${
                        selectedSize === size
                          ? 'border-black bg-black text-white'
                          : available
                            ? 'border-gray-300 bg-white text-black hover:border-black'
                            : 'cursor-not-allowed border-gray-200 bg-gray-100 text-gray-400 line-through'
                      }`}
                    >
                      {size}
                    </button>
                  );
                })} */}
                <select
                  value={selectedSize || ''}
                  onChange={(e) => handleProductSize(e.target.value)}
                  className="h-10 w-36 rounded-md bg-black px-1 text-sm text-white outline-none focus:border-black"
                >
                  <option value="" disabled>
                    Select Size
                  </option>

                  {sizes.map((size) => {
                    const available = isSizeAvailable(size);

                    return (
                      <option key={size} value={size} disabled={!available}>
                        {size}
                        {!available ? ' - Out of Stock' : ''}
                      </option>
                    );
                  })}
                </select>
              </div>
            </div>

            {/* =====================================
                CUSTOMIZABLE
            ===================================== */}

            {isCustomizable && (
              <>
                {/* SOLE */}

                <div className="md:mt-4 mt-2">
                  <h3 className="mb-3 font-semibold text-gray-900">
                    Select Sole
                  </h3>

                  <div className="flex md:flex-wrap flex-row overflow-x-auto overflow-y-hidden md:overflow-hidden gap-3 pb-2">
                    {baseColors.map((sole) => {
                      const available = selectedSize
                        ? isAvailableBySize(sole, selectedSize)
                        : true;

                      return (
                        <button
                          key={sole._id}
                          type="button"
                          disabled={!available}
                          onClick={() => handleSelectBase(sole._id)}
                          className={`flex flex-col items-center gap-2 ${
                            !available ? 'cursor-not-allowed opacity-40' : ''
                          }`}
                        >
                          {sole.image ? (
                            <div
                              className={`relative md:h-12 md:w-12 h-10 w-10 overflow-hidden rounded-full ${
                                String(selectedBase) === String(sole._id)
                                  ? 'border-2 border-black'
                                  : 'border border-gray-500'
                              }`}
                            >
                              <Image
                                src={sole.image}
                                alt={sole.colorName || 'Sole'}
                                fill
                                sizes="48px"
                                className="object-cover"
                                loading="eager"
                              />
                            </div>
                          ) : (
                            <div
                              className="h-8 w-8 rounded-full border"
                              style={{
                                backgroundColor: sole.colorName,
                              }}
                            />
                          )}

                          <span
                            className={`text-sm ${
                              String(selectedBase) === String(sole._id)
                                ? 'font-medium text-black'
                                : 'text-gray-500'
                            }`}
                          >
                            {sole.colorName}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* STRAP */}

                <div className="md:mt-4 mt-2">
                  <h3 className="mb-3 font-semibold text-gray-900">
                    Select Strap
                  </h3>

                  <div className="flex md:flex-wrap flex-row overflow-x-auto overflow-y-hidden md:overflow-hidden md:gap-3 gap-2 pb-2">
                    {strapColors.map((strap) => {
                      const available = selectedSize
                        ? isAvailableBySize(strap, selectedSize)
                        : true;

                      return (
                        <button
                          key={strap._id}
                          type="button"
                          disabled={!available}
                          onClick={() => handleSelectStrap(strap._id)}
                          className={`flex flex-col items-center justify-start gap-2 ${
                            !available ? 'cursor-not-allowed opacity-40' : ''
                          }`}
                        >
                          {strap.image ? (
                            <div
                              className={`relative md:h-12 md:w-12 h-10 w-10 overflow-hidden rounded-full ${
                                String(selectedStrap) === String(strap._id)
                                  ? 'border-2 border-black'
                                  : 'border-2 border-gray-300'
                              }`}
                            >
                              <Image
                                src={strap.image}
                                alt={strap.colorName || 'Strap'}
                                fill
                                sizes="30"
                                className="object-cover"
                                loading="eager"
                              />
                            </div>
                          ) : (
                            <div
                              className="h-8 w-8 rounded-full border"
                              style={{
                                backgroundColor: strap.colorName,
                              }}
                            />
                          )}

                          <span
                            className={`md:text-sm text-[10px] ${
                              String(selectedStrap) === String(strap._id)
                                ? 'font-medium text-black'
                                : 'text-gray-500'
                            }`}
                          >
                            {strap.colorName}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* THUMB */}

                {thumbColors.length > 0 && (
                  <div className="mt-8">
                    <h3 className="mb-3 font-semibold text-gray-900">
                      Select Thumb
                    </h3>

                    <div className="flex md:flex-wrap flex-row overflow-x-auto overflow-y-hidden md:overflow-hidden gap-3 pb-2">
                      {thumbColors.map((thumb) => {
                        const available = selectedSize
                          ? isAvailableBySize(thumb, selectedSize)
                          : true;

                        return (
                          <button
                            key={thumb._id}
                            type="button"
                            disabled={!available}
                            onClick={() => handleSelectThumb(thumb._id)}
                            className={`flex flex-col items-center gap-2 ${
                              !available ? 'cursor-not-allowed opacity-40' : ''
                            }`}
                          >
                            {thumb.image ? (
                              <div
                                className={`relative h-4 w-8 flex items-center justify-center overflow-hidden rounded ${
                                  String(selectedThumb) === String(thumb._id)
                                    ? 'border-2 border-black'
                                    : 'border border-gray-300'
                                }`}
                              >
                                <div
                                  className="h-8 w-8 rounded-full border"
                                  style={{
                                    backgroundColor: thumb.colorName
                                      ?.replace(/\s+/g, '')
                                      .toLowerCase(),
                                  }}
                                />
                              </div>
                            ) : (
                              <div
                                className="h-8 w-8 rounded-full border"
                                style={{
                                  backgroundColor: thumb.colorName,
                                }}
                              />
                            )}

                            <span
                              className={`text-sm ${
                                String(selectedThumb) === String(thumb._id)
                                  ? 'font-medium text-black'
                                  : 'text-gray-500'
                              }`}
                            >
                              {thumb.colorName}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </>
            )}

            {/* =====================================
                STOCK FEEDBACK
            ===================================== */}

            {selectedSize && (
              <div className="mt-5 space-y-1">
                {isStandard && standardOutOfStock && (
                  <p className="text-sm font-medium text-red-600">
                    Size {selectedSize} is out of stock.
                  </p>
                )}

                {isCustomizable && baseOutOfStock && (
                  <p className="text-sm font-medium text-red-600">
                    {selectedBaseData?.colorName || 'Selected sole'} sole is out
                    of stock in size {selectedSize}.
                  </p>
                )}

                {isCustomizable && strapOutOfStock && (
                  <p className="text-sm font-medium text-red-600">
                    {selectedStrapData?.colorName || 'Selected strap'} strap is
                    out of stock in size {selectedSize}.
                  </p>
                )}

                {isCustomizable && thumbOutOfStock && (
                  <p className="text-sm font-medium text-red-600">
                    {selectedThumbData?.colorName || 'Selected thumb'} thumb is
                    out of stock in size {selectedSize}.
                  </p>
                )}

                {!combinationOutOfStock && availableStock > 0 && (
                  <p className="text-sm font-medium text-green-600">
                    {availableStock} available
                  </p>
                )}
              </div>
            )}

            {/* =====================================
                ADD TO CART
            ===================================== */}

            <button
              type="button"
              disabled={
                !selectedSize ||
                combinationOutOfStock ||
                cartLoading ||
                addToCartLock.current
              }
              onClick={handleAddToCart}
              className="mt-8 w-full rounded-md bg-black px-6 py-3 font-semibold text-white transition hover:bg-gray-800 disabled:cursor-not-allowed disabled:bg-gray-300 sticky bottom-4 z-20 md:static"
            >
              {cartLoading
                ? 'Adding...'
                : !selectedSize
                  ? 'Select Size'
                  : combinationOutOfStock
                    ? 'Out of Stock'
                    : 'Add to Cart'}
            </button>
          </div>
          <div>
            {product.description && (
              <p className="mt-4 text-sm leading-6 text-gray-600">
                {product.description}
              </p>
            )}
          </div>
        </div>
      </div>

      <RelatedProducts />
    </>
  );
};

export default SingleProduct;
