import mongoose from 'mongoose';

import Cart from '../models/cart.model.js';
import Product from '../models/product.model.js';

/* ============================================================
   CART OWNER
============================================================ */

const getCartOwner = (req) => {
  if (req.user?._id) {
    return {
      userId: req.user._id,
      guestId: null,
    };
  }

  const guestId = req.headers['x-guest-id'];

  if (!guestId) {
    return null;
  }

  return {
    userId: null,
    guestId,
  };
};

/* ============================================================
   FIND VARIANT BY SIZE
============================================================ */

const findVariantBySize = (color, size) => {
  if (!color?.variants || !size) {
    return null;
  }

  return (
    color.variants.find((variant) => String(variant.size) === String(size)) ||
    null
  );
};

/* ============================================================
   FIND COLOR
   Searches all colors inside all Base/Strap/Thumb documents.
============================================================ */

const findColor = (groups = [], targetId) => {
  if (!targetId || !Array.isArray(groups)) {
    return null;
  }

  const target = String(targetId);

  for (const group of groups) {
    if (!Array.isArray(group?.colors)) {
      continue;
    }

    const found = group.colors.find(
      (color) =>
        String(color?._id || '') === target ||
        String(color?.colorId || '') === target,
    );

    if (found) {
      return found;
    }
  }

  return null;
};

/* ============================================================
   GET ALL COLORS
============================================================ */

const getAllColors = (groups = []) => {
  if (!Array.isArray(groups)) {
    return [];
  }

  return groups.flatMap((group) =>
    Array.isArray(group?.colors) ? group.colors : [],
  );
};

/* ============================================================
   CART ITEM COMPARISON
============================================================ */

const isSameCartItem = (item, data) => {
  if (String(item.productId) !== String(data.productId)) {
    return false;
  }

  if (String(item.size) !== String(data.size)) {
    return false;
  }

  const itemType = item.productType;
  const dataType = data.productType;

  if (dataType && itemType !== dataType) {
    return false;
  }

  /* STANDARD PRODUCT */

  if (itemType === 'STANDARD') {
    return true;
  }

  /* CUSTOMIZABLE PRODUCT */

  const itemBase = item.base?.colorId ? String(item.base.colorId) : null;

  const dataBase = data.baseId ? String(data.baseId) : null;

  const itemStrap = item.strap?.colorId ? String(item.strap.colorId) : null;

  const dataStrap = data.strapId ? String(data.strapId) : null;

  const itemThumb = item.thumb?.colorId ? String(item.thumb.colorId) : null;

  const dataThumb = data.thumbId ? String(data.thumbId) : null;

  return (
    itemBase === dataBase && itemStrap === dataStrap && itemThumb === dataThumb
  );
};

/* ============================================================
   GET POPULATED PRODUCT
============================================================ */

const getPopulatedProduct = async (productId) => {
  return Product.findById(productId)
    .populate('allowedBases')
    .populate('allowedStraps')
    .populate('allowedThumbs');
};

/* ============================================================
   GET CART
============================================================ */

export const getCart = async (req, res) => {
  try {
    const owner = getCartOwner(req);

    if (!owner) {
      return res.status(200).json({
        success: true,
        message: 'Cart is empty',
        cart: {
          items: [],
        },
      });
    }

    const query = owner.userId
      ? { userId: owner.userId }
      : { guestId: owner.guestId };

    const cart = await Cart.findOne(query);

    return res.status(200).json({
      success: true,
      cart: cart || {
        items: [],
      },
    });
  } catch (error) {
    console.error('Get cart error:', error);

    return res.status(500).json({
      success: false,
      message: 'Failed to get cart',
    });
  }
};

/* ============================================================
   ADD TO CART
============================================================ */

export const addToCart = async (req, res) => {
  try {
    /* --------------------------------------------------------
       CART OWNER
    -------------------------------------------------------- */

    const owner = getCartOwner(req);

    if (!owner) {
      return res.status(400).json({
        success: false,
        message: 'Guest ID or authenticated user is required',
      });
    }

    /* --------------------------------------------------------
       REQUEST DATA
    -------------------------------------------------------- */

    const {
      productId,
      size,
      quantity = 1,
      baseId,
      strapId,
      thumbId,
    } = req.body;

    // console.log('ADD TO CART REQUEST:', {
    //   productId,
    //   size,
    //   quantity,
    //   baseId,
    //   strapId,
    //   thumbId,
    // });

    /* --------------------------------------------------------
       BASIC VALIDATION
    -------------------------------------------------------- */

    if (!productId || !size) {
      return res.status(400).json({
        success: false,
        message: 'Product ID and size are required',
      });
    }

    if (!Number.isInteger(quantity) || quantity < 1) {
      return res.status(400).json({
        success: false,
        message: 'Invalid quantity',
      });
    }

    if (!mongoose.Types.ObjectId.isValid(productId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid product ID',
      });
    }

    /* --------------------------------------------------------
       PRODUCT

       IMPORTANT:
       Product contains references to Base, Strap and Thumb.
       Therefore we MUST populate them.
    -------------------------------------------------------- */

    const product = await getPopulatedProduct(productId);

    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found',
      });
    }

    /* --------------------------------------------------------
       CART
    -------------------------------------------------------- */

    let cart = await Cart.findOne(owner);

    if (!cart) {
      cart = new Cart(owner);
    }

    /* ========================================================
       STANDARD PRODUCT
    ======================================================== */

    if (product.productType === 'STANDARD') {
      const standardVariant = product.standardStock?.find(
        (item) => String(item.size) === String(size),
      );

      if (!standardVariant) {
        return res.status(400).json({
          success: false,
          message: `Size ${size} is not available`,
        });
      }

      if (Number(standardVariant.stockQuantity) < quantity) {
        return res.status(400).json({
          success: false,
          message: `Only ${standardVariant.stockQuantity} item(s) available for size ${size}`,
        });
      }

      const existingItem = cart.items.find((item) =>
        isSameCartItem(item, {
          productId,
          productType: product.productType,
          size,
        }),
      );

      if (existingItem) {
        const newQuantity = existingItem.quantity + quantity;

        if (newQuantity > Number(standardVariant.stockQuantity)) {
          return res.status(400).json({
            success: false,
            message: `Only ${standardVariant.stockQuantity} item(s) available`,
          });
        }

        existingItem.quantity = newQuantity;

        if (existingItem.standardVariant) {
          existingItem.standardVariant.stockQuantity =
            standardVariant.stockQuantity;
        }
      } else {
        cart.items.push({
          productId: product._id,
          productCode: product.productCode,
          name: product.name,
          productType: product.productType,
          size: String(size),
          quantity,
          basePrice: product.basePrice,
          image: product.mainImage || '',

          standardVariant: {
            size: String(standardVariant.size),
            stockQuantity: standardVariant.stockQuantity,
          },

          base: null,
          strap: null,
          thumb: null,
        });
      }

      await cart.save();

      return res.status(200).json({
        success: true,
        message: 'Product added to cart',
        cart,
      });
    }

    /* ========================================================
       CUSTOMIZABLE PRODUCT
    ======================================================== */

    if (product.productType === 'CUSTOMIZABLE') {
      /* ------------------------------------------------------
         REQUIRED SELECTIONS
      ------------------------------------------------------ */

      if (!baseId || !strapId) {
        return res.status(400).json({
          success: false,
          message: 'Sole and Strap selections are required',
        });
      }

      /* ------------------------------------------------------
         ALL BASE / STRAP / THUMB COLORS

         Product:

         allowedBases -> Base document -> colors[]
         allowedStraps -> Strap document -> colors[]
         allowedThumbs -> Thumb document -> colors[]
      ------------------------------------------------------ */

      const baseColors = getAllColors(product.allowedBases);

      const strapColors = getAllColors(product.allowedStraps);

      const thumbColors = getAllColors(product.allowedThumbs);

      //console.log('CUSTOMIZABLE PRODUCT DATA');

      //console.log('Base documents:', product.allowedBases?.length || 0);

      // console.log(
      //   'Base colors:',
      //   baseColors.map((color) => ({
      //     id: color._id?.toString(),
      //     name: color.colorName,
      //   })),
      // );

      //console.log('Requested baseId:', baseId);

      //console.log('Requested strapId:', strapId);

      //console.log('Requested thumbId:', thumbId);

      /* ======================================================
         FIND SOLE
      ====================================================== */

      const baseColor = findColor(product.allowedBases, baseId);

      if (!baseColor) {
        // console.log('❌ SOLE NOT FOUND');

        // console.log('Requested baseId:', baseId);

        // console.log(
        //   'Available sole color IDs:',
        //   baseColors.map((color) => color._id?.toString()),
        // );

        return res.status(400).json({
          success: false,
          message: 'Selected sole not found',
        });
      }

      /* ======================================================
         SOLE SIZE / STOCK
      ====================================================== */

      const baseVariant = findVariantBySize(baseColor, size);

      if (!baseVariant) {
        return res.status(400).json({
          success: false,
          message: `${baseColor.colorName} sole is not available in size ${size}`,
        });
      }

      if (Number(baseVariant.stockQuantity) < quantity) {
        return res.status(400).json({
          success: false,
          message: `${baseColor.colorName} sole is out of stock in size ${size}`,
        });
      }

      /* ======================================================
         FIND STRAP
      ====================================================== */

      const strapColor = findColor(product.allowedStraps, strapId);

      if (!strapColor) {
        console.log('❌ STRAP NOT FOUND');

        console.log('Requested strapId:', strapId);

        console.log(
          'Available strap color IDs:',
          strapColors.map((color) => color._id?.toString()),
        );

        return res.status(400).json({
          success: false,
          message: 'Selected strap not found',
        });
      }

      /* ======================================================
         STRAP SIZE / STOCK
      ====================================================== */

      const strapVariant = findVariantBySize(strapColor, size);

      if (!strapVariant) {
        return res.status(400).json({
          success: false,
          message: `${strapColor.colorName} strap is not available in size ${size}`,
        });
      }

      if (Number(strapVariant.stockQuantity) < quantity) {
        return res.status(400).json({
          success: false,
          message: `${strapColor.colorName} strap is out of stock in size ${size}`,
        });
      }

      /* ======================================================
         FIND THUMB
      ====================================================== */

      let thumbColor = null;
      let thumbVariant = null;

      if (thumbId) {
        thumbColor = findColor(product.allowedThumbs, thumbId);

        if (!thumbColor) {
          return res.status(400).json({
            success: false,
            message: 'Selected thumb not found',
          });
        }

        /* ----------------------------------------------------
           THUMB SIZE
        ---------------------------------------------------- */

        thumbVariant = findVariantBySize(thumbColor, size);

        if (!thumbVariant) {
          return res.status(400).json({
            success: false,
            message: `${thumbColor.colorName} thumb is not available in size ${size}`,
          });
        }

        /* ----------------------------------------------------
           THUMB STOCK
        ---------------------------------------------------- */

        if (Number(thumbVariant.stockQuantity) < quantity) {
          return res.status(400).json({
            success: false,
            message: `${thumbColor.colorName} thumb is out of stock in size ${size}`,
          });
        }
      }

      /* ======================================================
         CART DATA
      ====================================================== */

      const cartData = {
        productId: product._id,
        productType: product.productType,
        size: String(size),

        baseId: String(baseColor._id),

        strapId: String(strapColor._id),

        thumbId: thumbColor ? String(thumbColor._id) : null,
      };

      /* ======================================================
         EXISTING CART ITEM
      ====================================================== */

      const existingItem = cart.items.find((item) =>
        isSameCartItem(item, cartData),
      );

      /* ======================================================
         EXISTING ITEM
      ====================================================== */

      if (existingItem) {
        const newQuantity = existingItem.quantity + quantity;

        /* ----------------------------------------------------
           SOLE STOCK
        ---------------------------------------------------- */

        if (newQuantity > Number(baseVariant.stockQuantity)) {
          return res.status(400).json({
            success: false,
            message: `Only ${baseVariant.stockQuantity} ${baseColor.colorName} sole item(s) available`,
          });
        }

        /* ----------------------------------------------------
           STRAP STOCK
        ---------------------------------------------------- */

        if (newQuantity > Number(strapVariant.stockQuantity)) {
          return res.status(400).json({
            success: false,
            message: `Only ${strapVariant.stockQuantity} ${strapColor.colorName} strap item(s) available`,
          });
        }

        /* ----------------------------------------------------
           THUMB STOCK
        ---------------------------------------------------- */

        if (thumbVariant && newQuantity > Number(thumbVariant.stockQuantity)) {
          return res.status(400).json({
            success: false,
            message: `Only ${thumbVariant.stockQuantity} ${thumbColor.colorName} thumb item(s) available`,
          });
        }

        existingItem.quantity = newQuantity;

        /* ----------------------------------------------------
           UPDATE SAVED STOCK SNAPSHOT
        ---------------------------------------------------- */

        if (existingItem.base?.variant) {
          existingItem.base.variant.stockQuantity = baseVariant.stockQuantity;
        }

        if (existingItem.strap?.variant) {
          existingItem.strap.variant.stockQuantity = strapVariant.stockQuantity;
        }

        if (existingItem.thumb?.variant && thumbVariant) {
          existingItem.thumb.variant.stockQuantity = thumbVariant.stockQuantity;
        }
      } else {
        /* ======================================================
         NEW CART ITEM
      ====================================================== */
        cart.items.push({
          productId: product._id,
          productCode: product.productCode,
          name: product.name,
          productType: product.productType,
          size: String(size),
          quantity,
          basePrice: product.basePrice,

          standardVariant: null,

          /* --------------------------------------------------
             SOLE
          -------------------------------------------------- */

          base: {
            colorId: baseColor._id,
            colorName: baseColor.colorName,
            image: baseColor.image || '',

            variant: {
              size: String(baseVariant.size),

              stockQuantity: baseVariant.stockQuantity,
            },
          },

          /* --------------------------------------------------
             STRAP
          -------------------------------------------------- */

          strap: {
            colorId: strapColor._id,
            colorName: strapColor.colorName,
            image: strapColor.image || '',

            variant: {
              size: String(strapVariant.size),

              stockQuantity: strapVariant.stockQuantity,
            },
          },

          /* --------------------------------------------------
             THUMB
          -------------------------------------------------- */

          thumb: thumbColor
            ? {
                colorId: thumbColor._id,
                colorName: thumbColor.colorName,
                image: thumbColor.image || '',

                variant: {
                  size: String(thumbVariant.size),

                  stockQuantity: thumbVariant.stockQuantity,
                },
              }
            : null,
        });
      }

      /* ======================================================
         SAVE CART
      ====================================================== */

      await cart.save();

      return res.status(200).json({
        success: true,
        message: 'Product added to cart',
        cart,
      });
    }

    /* ========================================================
       UNSUPPORTED PRODUCT
    ======================================================== */

    return res.status(400).json({
      success: false,
      message: 'Unsupported product type',
    });
  } catch (error) {
    console.error('Add to cart error:', error);

    return res.status(500).json({
      success: false,
      message: 'Failed to add product to cart',
    });
  }
};

/* ============================================================
   MERGE GUEST CART INTO USER CART
   POST /api/cart/merge
============================================================ */
export const mergeGuestCart = async (req, res) => {
  try {
    const userId = req.userId;
    const guestId = req.body?.guestId || req.headers['x-guest-id'];

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Please login first',
      });
    }

    if (!guestId) {
      const userCart = await Cart.findOne({ userId });

      return res.status(200).json({
        success: true,
        message: 'No guest cart to merge',
        cart: userCart || { userId, guestId: null, items: [] },
      });
    }

    const guestCart = await Cart.findOne({ guestId });

    if (!guestCart || !guestCart.items?.length) {
      const userCart = await Cart.findOne({ userId });

      return res.status(200).json({
        success: true,
        message: 'No guest cart to merge',
        cart: userCart || { userId, guestId: null, items: [] },
      });
    }

    let userCart = await Cart.findOne({ userId });

    if (!userCart) {
      userCart = new Cart({
        userId,
        guestId: null,
        items: [],
      });
    }

    for (const guestItem of guestCart.items) {
      const matchData = {
        productId: guestItem.productId,
        productType: guestItem.productType,
        size: guestItem.size,
        baseId: guestItem.base?.colorId ? String(guestItem.base.colorId) : null,
        strapId: guestItem.strap?.colorId
          ? String(guestItem.strap.colorId)
          : null,
        thumbId: guestItem.thumb?.colorId
          ? String(guestItem.thumb.colorId)
          : null,
      };

      const existingItem = userCart.items.find((item) =>
        isSameCartItem(item, matchData),
      );

      if (existingItem) {
        existingItem.quantity += Number(guestItem.quantity || 0);

        // Refresh the stock snapshot with the newest guest snapshot.
        if (guestItem.standardVariant) {
          existingItem.standardVariant = guestItem.standardVariant;
        }

        if (guestItem.base) existingItem.base = guestItem.base;
        if (guestItem.strap) existingItem.strap = guestItem.strap;
        if (guestItem.thumb) existingItem.thumb = guestItem.thumb;
      } else {
        const item = guestItem.toObject();
        delete item._id;
        userCart.items.push(item);
      }
    }

    userCart.userId = userId;
    userCart.guestId = null;

    await userCart.save();
    await Cart.deleteOne({ _id: guestCart._id });

    return res.status(200).json({
      success: true,
      message: 'Guest cart merged successfully',
      cart: userCart,
    });
  } catch (error) {
    console.error('Merge guest cart error:', error);

    return res.status(500).json({
      success: false,
      message: 'Failed to merge guest cart',
    });
  }
};

/* ============================================================
   UPDATE CART ITEM
============================================================ */

export const updateCartItem = async (req, res) => {
  try {
    /* --------------------------------------------------------
       OWNER
    -------------------------------------------------------- */

    const owner = getCartOwner(req);

    if (!owner) {
      return res.status(400).json({
        success: false,
        message: 'Cart owner not found',
      });
    }

    /* --------------------------------------------------------
       REQUEST
    -------------------------------------------------------- */

    const { itemId } = req.params;
    const { quantity } = req.body;

    if (!mongoose.Types.ObjectId.isValid(itemId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid cart item ID',
      });
    }

    if (!Number.isInteger(quantity) || quantity < 1) {
      return res.status(400).json({
        success: false,
        message: 'Quantity must be at least 1',
      });
    }

    /* --------------------------------------------------------
       CART
    -------------------------------------------------------- */

    const cart = await Cart.findOne(owner);

    if (!cart) {
      return res.status(404).json({
        success: false,
        message: 'Cart not found',
      });
    }

    /* --------------------------------------------------------
       CART ITEM
    -------------------------------------------------------- */

    const cartItem = cart.items.id(itemId);

    if (!cartItem) {
      return res.status(404).json({
        success: false,
        message: 'Cart item not found',
      });
    }

    /* --------------------------------------------------------
       PRODUCT

       IMPORTANT:
       Populate all component references.
    -------------------------------------------------------- */

    const product = await getPopulatedProduct(cartItem.productId);

    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found',
      });
    }

    /* ========================================================
       STANDARD
    ======================================================== */

    if (product.productType === 'STANDARD') {
      const variant = product.standardStock?.find(
        (item) => String(item.size) === String(cartItem.size),
      );

      if (!variant || quantity > Number(variant.stockQuantity)) {
        return res.status(400).json({
          success: false,
          message: `Only ${variant?.stockQuantity ?? 0} item(s) available`,
        });
      }
    }

    /* ========================================================
       CUSTOMIZABLE
    ======================================================== */

    if (product.productType === 'CUSTOMIZABLE') {
      /* ------------------------------------------------------
         ALL COLORS

         IMPORTANT:
         Do NOT use [0] here.
      ------------------------------------------------------ */

      const baseColors = getAllColors(product.allowedBases);

      const strapColors = getAllColors(product.allowedStraps);

      const thumbColors = getAllColors(product.allowedThumbs);

      /* ------------------------------------------------------
         FIND SOLE
      ------------------------------------------------------ */

      const baseColor = findColor(product.allowedBases, cartItem.base?.colorId);

      /* ------------------------------------------------------
         FIND STRAP
      ------------------------------------------------------ */

      const strapColor = findColor(
        product.allowedStraps,
        cartItem.strap?.colorId,
      );

      if (!baseColor || !strapColor) {
        return res.status(400).json({
          success: false,
          message: 'Selected customization is no longer available',
        });
      }

      /* ------------------------------------------------------
         SOLE VARIANT
      ------------------------------------------------------ */

      const baseVariant = findVariantBySize(baseColor, cartItem.size);

      if (!baseVariant || quantity > Number(baseVariant.stockQuantity)) {
        return res.status(400).json({
          success: false,
          message: `Only ${
            baseVariant?.stockQuantity ?? 0
          } sole item(s) available`,
        });
      }

      /* ------------------------------------------------------
         STRAP VARIANT
      ------------------------------------------------------ */

      const strapVariant = findVariantBySize(strapColor, cartItem.size);

      if (!strapVariant || quantity > Number(strapVariant.stockQuantity)) {
        return res.status(400).json({
          success: false,
          message: `Only ${
            strapVariant?.stockQuantity ?? 0
          } strap item(s) available`,
        });
      }

      /* ------------------------------------------------------
         THUMB
      ------------------------------------------------------ */

      if (cartItem.thumb) {
        const thumbColor = findColor(
          product.allowedThumbs,
          cartItem.thumb.colorId,
        );

        if (!thumbColor) {
          return res.status(400).json({
            success: false,
            message: 'Selected thumb is no longer available',
          });
        }

        const thumbVariant = findVariantBySize(thumbColor, cartItem.size);

        if (!thumbVariant || quantity > Number(thumbVariant.stockQuantity)) {
          return res.status(400).json({
            success: false,
            message: `Only ${
              thumbVariant?.stockQuantity ?? 0
            } thumb item(s) available`,
          });
        }
      }

      /* ------------------------------------------------------
         UPDATE SAVED STOCK SNAPSHOT
      ------------------------------------------------------ */

      if (cartItem.base?.variant) {
        cartItem.base.variant.stockQuantity = baseVariant.stockQuantity;
      }

      if (cartItem.strap?.variant) {
        cartItem.strap.variant.stockQuantity = strapVariant.stockQuantity;
      }

      if (cartItem.thumb?.variant) {
        const thumbColor = findColor(
          product.allowedThumbs,
          cartItem.thumb.colorId,
        );

        const thumbVariant = findVariantBySize(thumbColor, cartItem.size);

        if (thumbVariant) {
          cartItem.thumb.variant.stockQuantity = thumbVariant.stockQuantity;
        }
      }
    }

    /* --------------------------------------------------------
       UPDATE QUANTITY
    -------------------------------------------------------- */

    cartItem.quantity = quantity;

    await cart.save();

    return res.status(200).json({
      success: true,
      message: 'Cart updated',
      cart,
    });
  } catch (error) {
    console.error('Update cart error:', error);

    return res.status(500).json({
      success: false,
      message: 'Failed to update cart',
    });
  }
};

/* ============================================================
   REMOVE CART ITEM
============================================================ */

export const removeCartItem = async (req, res) => {
  try {
    const owner = getCartOwner(req);

    if (!owner) {
      return res.status(400).json({
        success: false,
        message: 'Cart owner not found',
      });
    }

    const { itemId } = req.params;

    const cart = await Cart.findOne(owner);

    if (!cart) {
      return res.status(404).json({
        success: false,
        message: 'Cart not found',
      });
    }

    const initialCount = cart.items.length;

    cart.items = cart.items.filter((item) => item._id.toString() !== itemId);

    if (cart.items.length === initialCount) {
      return res.status(404).json({
        success: false,
        message: 'Cart item not found',
      });
    }

    await cart.save();

    return res.status(200).json({
      success: true,
      message: 'Item removed from cart',
      cart,
    });
  } catch (error) {
    console.error('Remove cart item error:', error);

    return res.status(500).json({
      success: false,
      message: 'Failed to remove cart item',
    });
  }
};

/* ============================================================
   CLEAR CART
============================================================ */

export const clearCart = async (req, res) => {
  try {
    const owner = getCartOwner(req);

    if (!owner) {
      return res.status(200).json({
        success: true,
        message: 'Cart already empty',
      });
    }

    const cart = await Cart.findOne(owner);

    if (!cart) {
      return res.status(200).json({
        success: true,
        message: 'Cart already empty',
      });
    }

    cart.items = [];

    await cart.save();

    return res.status(200).json({
      success: true,
      message: 'Cart cleared',
      cart,
    });
  } catch (error) {
    console.error('Clear cart error:', error);

    return res.status(500).json({
      success: false,
      message: 'Failed to clear cart',
    });
  }
};
