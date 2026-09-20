import mongoose from 'mongoose';
import crypto from 'crypto';

import razorpay from '../config/razorpay.js';
import PaymentAttempt from '../models/paymentAttempt.model.js';

import Order from '../models/order.model.js';
import Cart from '../models/cart.model.js';
import Product from '../models/product.model.js';
import Base from '../models/base.model.js';
import Strap from '../models/strap.model.js';
import Thumb from '../models/thumb.model.js';
import AddressModel from '../models/addresh.model.js';
import UserModel from '../models/user.model.js';
import InventoryTransaction from '../models/inventoryTransaction.model.js';
import IdempotencyKey from '../models/idempotency.model.js';
import Coupon from '../models/coupon.model.js';
import Refund from '../models/refund.model.js';

import sendEmailFun from '../config/sendEmail.js';
import { orderConfirmationEmail } from '../utils/orderConfirmationTemplate.js';
import { notifyAdmins } from '../utils/createNotification.js';

import { createRazorpayRefund } from '../utils/razorpayRefund.js';
import { calculateShippingCharge } from '../utils/shipping.js';
import { calculateTax } from '../utils/tax.js';
import {
  normalizeCouponCode,
  calculateCouponDiscount,
  incrementCouponUsage,
} from '../utils/coupon.js';
import {
  reserveStock,
  releaseStockReservation,
  commitStockReservation,
} from '../utils/stockReservation.js';
import { calculateReturnRefund } from '../utils/returnRefundCalculator.js';

/**
 * Generate unique order number
 */
const makeOrderNumber = () =>
  `MC${Date.now().toString(36).toUpperCase()}${crypto
    .randomBytes(3)
    .toString('hex')
    .toUpperCase()}`;

/**
 * Find color and its parent component
 */
const findColorWithComponent = (groups = [], targetId) => {
  if (!targetId) return null;

  const target = String(targetId);

  for (const component of groups) {
    const colors = Array.isArray(component?.colors) ? component.colors : [];

    const color = colors.find((item) => String(item?._id) === target);

    if (color) {
      return {
        component,
        color,
      };
    }
  }

  return null;
};

/**
 * Find variant by size
 */
const findVariantBySize = (color, size) =>
  color?.variants?.find((variant) => String(variant.size) === String(size)) ||
  null;

/**
 * Store immutable option snapshot in order
 */
const optionSnapshot = ({ component, color, variant }) => {
  if (!component || !color || !variant) {
    return null;
  }

  return {
    componentId: component._id,
    colorId: color._id,
    variantId: variant._id,
    colorName: color.colorName || '',
    image: color.image || '',
  };
};

/**
 * Get user's cart
 */
const getCartForUser = async (userId, session) => {
  return Cart.findOne({ userId }).session(session);
};

/**
 * Get stock requirements for cart item
 *
 * STANDARD:
 * Product.standardStock
 *
 * CUSTOMIZABLE:
 * Base + Strap + Thumb
 */
const getRequiredStock = (product, cartItem) => {
  const result = [];

  const quantity = Number(cartItem.quantity);

  if (!Number.isInteger(quantity) || quantity < 1) {
    throw new Error(`Invalid quantity for ${product.name}.`);
  }

  /**
   * STANDARD PRODUCT
   */
  if (product.productType === 'STANDARD') {
    const variant = product.standardStock?.find(
      (item) => String(item.size) === String(cartItem.size),
    );

    if (!variant) {
      throw new Error(
        `Size ${cartItem.size} is no longer available for ${product.name}.`,
      );
    }

    result.push({
      kind: 'standard',
      productId: product._id,
      variantId: variant._id,
      size: String(variant.size),
      required: quantity,
      available:
        Number(variant.stockQuantity || 0) -
        Number(variant.reservedQuantity || 0),
      message: `Only ${Number(
        variant.stockQuantity,
      )} item(s) of ${product.name} are available in size ${cartItem.size}.`,
    });

    return result;
  }

  /**
   * CUSTOMIZABLE PRODUCT
   */
  if (product.productType !== 'CUSTOMIZABLE') {
    throw new Error(`Unsupported product type for ${product.name}.`);
  }

  const baseDocs = product.allowedBases || [];
  const strapDocs = product.allowedStraps || [];
  const thumbDocs = product.allowedThumbs || [];

  const baseResult = findColorWithComponent(baseDocs, cartItem.base?.colorId);

  const strapResult = findColorWithComponent(
    strapDocs,
    cartItem.strap?.colorId,
  );

  const thumbResult = cartItem.thumb
    ? findColorWithComponent(thumbDocs, cartItem.thumb.colorId)
    : null;

  const base = baseResult?.color;
  const strap = strapResult?.color;
  const thumb = thumbResult?.color;

  /**
   * Base validation
   */
  if (!base || !baseResult?.component?._id) {
    throw new Error(
      `Selected sole is no longer available for ${product.name}.`,
    );
  }

  /**
   * Strap validation
   */
  if (!strap || !strapResult?.component?._id) {
    throw new Error(
      `Selected strap is no longer available for ${product.name}.`,
    );
  }

  /**
   * Base size validation
   */
  const baseVariant = findVariantBySize(base, cartItem.size);

  if (!baseVariant) {
    throw new Error(
      `${base.colorName} sole is not available in size ${cartItem.size}.`,
    );
  }

  /**
   * Strap size validation
   */
  const strapVariant = findVariantBySize(strap, cartItem.size);

  if (!strapVariant) {
    throw new Error(
      `${strap.colorName} strap is not available in size ${cartItem.size}.`,
    );
  }

  /**
   * BASE / SOLE STOCK
   */
  result.push({
    kind: 'base',
    componentId: baseResult.component._id,
    colorId: base._id,
    variantId: baseVariant._id,
    colorName: base.colorName,
    image: base.image || '',
    size: String(baseVariant.size),
    required: quantity,
    available:
      Number(baseVariant.stockQuantity || 0) -
      Number(baseVariant.reservedQuantity || 0),
    message: `Only ${Number(
      baseVariant.stockQuantity,
    )} ${base.colorName} sole item(s) are available for size ${cartItem.size}.`,
  });

  /**
   * STRAP STOCK
   */
  result.push({
    kind: 'strap',
    componentId: strapResult.component._id,
    colorId: strap._id,
    variantId: strapVariant._id,
    colorName: strap.colorName,
    image: strap.image || '',
    size: String(strapVariant.size),
    required: quantity,
    available:
      Number(strapVariant.stockQuantity || 0) -
      Number(strapVariant.reservedQuantity || 0),
    message: `Only ${Number(
      strapVariant.stockQuantity,
    )} ${strap.colorName} strap item(s) are available for size ${cartItem.size}.`,
  });

  /**
   * THUMB STOCK
   */
  if (cartItem.thumb) {
    if (!thumb || !thumbResult?.component?._id) {
      throw new Error(
        `Selected thumb is no longer available for ${product.name}.`,
      );
    }

    const thumbVariant = findVariantBySize(thumb, cartItem.size);

    if (!thumbVariant) {
      throw new Error(
        `${thumb.colorName} thumb is not available in size ${cartItem.size}.`,
      );
    }

    result.push({
      kind: 'thumb',
      componentId: thumbResult.component._id,
      colorId: thumb._id,
      variantId: thumbVariant._id,
      colorName: thumb.colorName,
      image: thumb.image || '',
      size: String(thumbVariant.size),
      required: quantity,
      available:
        Number(thumbVariant.stockQuantity || 0) -
        Number(thumbVariant.reservedQuantity || 0),
      message: `Only ${Number(
        thumbVariant.stockQuantity,
      )} ${thumb.colorName} thumb item(s) are available for size ${cartItem.size}.`,
    });
  }

  return result;
};

/**
 * Decrement component stock
 *
 * Works for:
 * BASE
 * STRAP
 * THUMB
 */
const decrementComponentStock = async (
  Model,
  componentId,
  colorId,
  variantId,
  size,
  quantity,
  session,
) => {
  // Reservation-aware lookup: reserved stock belongs to an active online
  // checkout and must not be available to a new COD order.
  const component = await Model.findOne({
    _id: componentId,

    colors: {
      $elemMatch: {
        _id: colorId,

        variants: {
          $elemMatch: {
            _id: variantId,
            size: String(size),
          },
        },
      },
    },
  }).session(session);

  if (!component) {
    return {
      success: false,
    };
  }

  const color = component.colors.id(colorId);
  const variant = color?.variants.id(variantId);

  if (!color || !variant) {
    return {
      success: false,
    };
  }

  const previousStock = Number(variant.stockQuantity || 0);
  const reservedStock = Number(variant.reservedQuantity || 0);
  const availableStock = previousStock - reservedStock;

  // Never allow COD to consume inventory already reserved by an online
  // checkout. Negative available stock is treated as zero.
  if (availableStock < quantity) {
    return {
      success: false,
    };
  }

  const newStock = previousStock - quantity;

  variant.stockQuantity = newStock;

  await component.save({
    session,
  });

  return {
    success: true,
    componentId: component._id,
    colorId: color._id,
    variantId: variant._id,
    size: String(variant.size),
    quantity,
    previousStock,
    newStock,
  };
};

/**
 * Decrement standard product stock
 */
const decrementStandardStock = async (
  productId,
  variantId,
  size,
  quantity,
  session,
) => {
  // Reservation-aware lookup: reserved stock belongs to an active online
  // checkout and must not be available to a new COD order.
  const product = await Product.findOne({
    _id: productId,

    productType: 'STANDARD',

    standardStock: {
      $elemMatch: {
        _id: variantId,
        size: String(size),
      },
    },
  }).session(session);

  if (!product) {
    return {
      success: false,
    };
  }

  const variant = product.standardStock.id(variantId);

  if (!variant) {
    return {
      success: false,
    };
  }

  const previousStock = Number(variant.stockQuantity || 0);
  const reservedStock = Number(variant.reservedQuantity || 0);
  const availableStock = previousStock - reservedStock;

  // Never allow COD to consume inventory already reserved by an online
  // checkout. Negative available stock is treated as zero.
  if (availableStock < quantity) {
    return {
      success: false,
    };
  }

  const newStock = previousStock - quantity;

  variant.stockQuantity = newStock;

  await product.save({
    session,
  });

  return {
    success: true,
    productId: product._id,
    variantId: variant._id,
    size: String(variant.size),
    quantity,
    previousStock,
    newStock,
  };
};

/**
 * ============================================================
 * CREATE COD ORDER
 * ============================================================
 *
 * POST /api/orders
 *
 * Body:
 * {
 *   "addressId": "...",
 *   "paymentMethod": "COD"
 * }
 */
export const createOrderController = async (req, res) => {
  const userId = req.userId;

  const { addressId, paymentMethod = 'COD' } = req.body;

  /**
   * ============================================================
   * VALIDATE USER
   * ============================================================
   */

  if (!userId) {
    return res.status(401).json({
      success: false,
      message: 'Authentication required.',
    });
  }

  /**
   * ============================================================
   * GET IDEMPOTENCY KEY
   * ============================================================
   *
   * Frontend must send:
   *
   * Idempotency-Key: unique-key
   *
   * This prevents duplicate orders when:
   *
   * - user double clicks
   * - network retries
   * - browser retries request
   * - frontend accidentally sends same request twice
   *
   * ============================================================
   */

  const idempotencyKey = req.headers['idempotency-key'];

  if (!idempotencyKey) {
    return res.status(400).json({
      success: false,
      message: 'Idempotency-Key header is required.',
    });
  }

  /**
   * ============================================================
   * VALIDATE IDEMPOTENCY KEY
   * ============================================================
   */

  if (
    typeof idempotencyKey !== 'string' ||
    idempotencyKey.trim().length < 10 ||
    idempotencyKey.trim().length > 200
  ) {
    return res.status(400).json({
      success: false,
      message: 'Invalid Idempotency-Key.',
    });
  }

  const cleanIdempotencyKey = idempotencyKey.trim();

  /**
   * ============================================================
   * VALIDATE ADDRESS ID
   * ============================================================
   */

  if (!addressId || !mongoose.Types.ObjectId.isValid(addressId)) {
    return res.status(400).json({
      success: false,
      message: 'Please select a valid delivery address.',
    });
  }

  /**
   * ============================================================
   * VALIDATE PAYMENT METHOD
   * ============================================================
   */

  if (!['COD', 'ONLINE'].includes(paymentMethod)) {
    return res.status(400).json({
      success: false,
      message: 'Invalid payment method.',
    });
  }

  /**
   * ============================================================
   * ONLINE PAYMENT
   * ============================================================
   *
   * Online payment is handled separately through:
   *
   * createRazorpayOrderController()
   * verifyRazorpayPaymentController()
   *
   * ============================================================
   */

  if (paymentMethod === 'ONLINE') {
    return res.status(400).json({
      success: false,
      message: 'Please use the Razorpay checkout flow for online payment.',
    });
  }

  /**
   * ============================================================
   * CHECK EXISTING IDEMPOTENCY REQUEST
   * ============================================================
   */

  try {
    const existingRequest = await IdempotencyKey.findOne({
      key: cleanIdempotencyKey,
      userId,
    }).populate('orderId');

    if (existingRequest) {
      /**
       * --------------------------------------------------------
       * REQUEST ALREADY COMPLETED
       * --------------------------------------------------------
       */

      if (existingRequest.status === 'COMPLETED' && existingRequest.orderId) {
        return res.status(200).json({
          success: true,
          message: 'Order already created.',
          idempotent: true,
          data: {
            order: existingRequest.orderId,
          },
        });
      }

      /**
       * --------------------------------------------------------
       * REQUEST CURRENTLY PROCESSING
       * --------------------------------------------------------
       */

      if (existingRequest.status === 'PROCESSING') {
        return res.status(409).json({
          success: false,
          message:
            'This checkout request is already being processed. Please wait.',
          idempotent: true,
        });
      }
    }
  } catch (error) {
    console.error('Idempotency lookup error:', error);

    return res.status(500).json({
      success: false,
      message: 'Unable to process checkout request.',
    });
  }

  /**
   * ============================================================
   * START MONGODB SESSION
   * ============================================================
   */

  const session = await mongoose.startSession();

  let createdOrder = null;

  try {
    /**
     * ==========================================================
     * ONE TRANSACTION
     * ==========================================================
     *
     * The following operations are committed together:
     *
     * 1. Idempotency record
     * 2. Address validation
     * 3. Cart validation
     * 4. Product validation
     * 5. Price calculation
     * 6. Stock validation
     * 7. Stock deduction
     * 8. Inventory transaction
     * 9. Order creation
     * 10. Cart clearing
     * 11. User order history
     *
     * If ANY operation fails:
     *
     * Everything rolls back.
     *
     * ==========================================================
     */

    await session.withTransaction(async () => {
      /**
       * ========================================================
       * CREATE IDEMPOTENCY RECORD
       * ========================================================
       */

      const idempotencyRecord = new IdempotencyKey({
        key: cleanIdempotencyKey,
        userId,
        status: 'PROCESSING',
      });

      await idempotencyRecord.save({
        session,
      });

      /**
       * ========================================================
       * GET ADDRESS
       * ========================================================
       */

      const address = await AddressModel.findOne({
        _id: addressId,
        userId,
      }).session(session);

      if (!address) {
        throw new Error('Selected delivery address was not found.');
      }

      /**
       * ========================================================
       * GET CART
       * ========================================================
       */

      const cart = await getCartForUser(userId, session);

      /**
       * ========================================================
       * VALIDATE CART
       * ========================================================
       */

      if (!cart || !Array.isArray(cart.items) || cart.items.length === 0) {
        throw new Error('Your cart is empty.');
      }

      /**
       * ========================================================
       * PRODUCT IDS
       * ========================================================
       */

      const productIds = cart.items.map((item) => item.productId);

      /**
       * ========================================================
       * GET ACTIVE PRODUCTS
       * ========================================================
       *
       * Never trust product information
       * coming from frontend.
       *
       * Price and stock are taken
       * from MongoDB.
       *
       * ========================================================
       */

      const products = await Product.find({
        _id: {
          $in: productIds,
        },
        status: 'ACTIVE',
      })
        .populate('allowedBases')
        .populate('allowedStraps')
        .populate('allowedThumbs')
        .session(session);

      /**
       * ========================================================
       * PRODUCT LOOKUP MAP
       * ========================================================
       */

      const productMap = new Map(
        products.map((product) => [String(product._id), product]),
      );

      /**
       * ========================================================
       * ORDER ITEMS
       * ========================================================
       */

      const orderItems = [];

      /**
       * ========================================================
       * STOCK REQUIREMENTS
       * ========================================================
       */

      const stockRequirements = [];

      /**
       * ========================================================
       * SUBTOTAL
       * ========================================================
       */

      let subtotal = 0;

      /**
       * ========================================================
       * VALIDATE ENTIRE CART FIRST
       * ========================================================
       *
       * NO stock is changed during this loop.
       *
       * We first validate every item.
       *
       * ========================================================
       */

      for (const cartItem of cart.items) {
        /**
         * ------------------------------------------------------
         * FIND PRODUCT
         * ------------------------------------------------------
         */

        const product = productMap.get(String(cartItem.productId));

        if (!product) {
          throw new Error(
            `${cartItem.name || 'A product'} is no longer available.`,
          );
        }

        /**
         * ------------------------------------------------------
         * QUANTITY
         * ------------------------------------------------------
         */

        const quantity = Number(cartItem.quantity);

        if (!Number.isInteger(quantity) || quantity < 1) {
          throw new Error(`Invalid quantity for ${product.name}.`);
        }

        /**
         * ------------------------------------------------------
         * PRICE
         * ------------------------------------------------------
         *
         * NEVER trust frontend price.
         *
         * ------------------------------------------------------
         */

        const unitPrice = Number(product.basePrice);

        if (!Number.isFinite(unitPrice) || unitPrice < 0) {
          throw new Error(`Invalid price for ${product.name}.`);
        }

        /**
         * ======================================================
         * GET STOCK REQUIREMENTS
         * ======================================================
         *
         * STANDARD:
         * Product.standardStock
         *
         * CUSTOMIZABLE:
         * Base + Strap + optional Thumb
         *
         * ======================================================
         */

        const requirements = getRequiredStock(product, cartItem);

        /**
         * ======================================================
         * CHECK STOCK
         * ======================================================
         */

        for (const requirement of requirements) {
          if (requirement.available < requirement.required) {
            throw new Error(requirement.message);
          }
        }

        /**
         * ======================================================
         * STORE STOCK REQUIREMENTS
         * ======================================================
         */

        stockRequirements.push(...requirements);

        /**
         * ======================================================
         * LINE TOTAL
         * ======================================================
         */

        const lineTotal = unitPrice * quantity;

        subtotal += lineTotal;

        /**
         * ======================================================
         * CUSTOMIZABLE OPTIONS
         * ======================================================
         */

        let base = null;
        let strap = null;
        let thumb = null;

        if (product.productType === 'CUSTOMIZABLE') {
          /**
           * ----------------------------------------------------
           * BASE
           * ----------------------------------------------------
           */

          const baseRequirement = requirements.find(
            (item) => item.kind === 'base',
          );

          if (!baseRequirement) {
            throw new Error(
              `Base inventory information is missing for ${product.name}.`,
            );
          }

          base = {
            componentId: baseRequirement.componentId,

            colorId: baseRequirement.colorId,

            variantId: baseRequirement.variantId,

            colorName: baseRequirement.colorName || '',

            image: cartItem.base?.image || '',
          };

          /**
           * ----------------------------------------------------
           * STRAP
           * ----------------------------------------------------
           */

          const strapRequirement = requirements.find(
            (item) => item.kind === 'strap',
          );

          if (!strapRequirement) {
            throw new Error(
              `Strap inventory information is missing for ${product.name}.`,
            );
          }

          strap = {
            componentId: strapRequirement.componentId,

            colorId: strapRequirement.colorId,

            variantId: strapRequirement.variantId,

            colorName: strapRequirement.colorName || '',

            image: cartItem.strap?.image || '',
          };

          /**
           * ----------------------------------------------------
           * THUMB
           * ----------------------------------------------------
           *
           * Optional.
           */

          const thumbRequirement = requirements.find(
            (item) => item.kind === 'thumb',
          );

          if (thumbRequirement) {
            thumb = {
              componentId: thumbRequirement.componentId,

              colorId: thumbRequirement.colorId,

              variantId: thumbRequirement.variantId,

              colorName: thumbRequirement.colorName || '',

              image: cartItem.thumb?.image || '',
            };
          }
        }

        /**
         * ======================================================
         * STANDARD VARIANT
         * ======================================================
         */

        const standardRequirement =
          product.productType === 'STANDARD'
            ? requirements.find((item) => item.kind === 'standard')
            : null;

        /**
         * ======================================================
         * CREATE ORDER ITEM
         * ======================================================
         */

        orderItems.push({
          productId: product._id,

          productCode: product.productCode,

          name: product.name,

          image:
            cartItem.image ||
            base?.image ||
            strap?.image ||
            product.mainImage ||
            '',

          productType: product.productType,

          size: String(cartItem.size),

          quantity,

          unitPrice,

          lineTotal,

          /**
           * STANDARD PRODUCT
           *
           * Needed for cancellation
           * stock restoration.
           */

          variantId: standardRequirement?.variantId || null,

          /**
           * CUSTOMIZABLE PRODUCT
           */

          base,

          strap,

          thumb,
        });
      }

      /**
       * ========================================================
       * DEDUCT STOCK
       * ========================================================
       */

      const inventoryEntries = [];

      for (const requirement of stockRequirements) {
        /**
         * ======================================================
         * STANDARD PRODUCT
         * ======================================================
         */

        if (requirement.kind === 'standard') {
          const result = await decrementStandardStock(
            requirement.productId,
            requirement.variantId,
            requirement.size,
            requirement.required,
            session,
          );

          if (!result.success) {
            throw new Error(
              `Product size ${requirement.size} just went out of stock. Please review your cart.`,
            );
          }

          inventoryEntries.push({
            type: 'ORDER',

            itemType: 'STANDARD',

            productId: result.productId,

            variantId: result.variantId,

            quantity: result.quantity,

            previousStock: result.previousStock,

            newStock: result.newStock,

            performedBy: userId,

            reason: 'Stock deducted for customer order.',
          });

          continue;
        }

        /**
         * ======================================================
         * CUSTOMIZABLE PRODUCT
         * ======================================================
         */

        let Model;

        if (requirement.kind === 'base') {
          Model = Base;
        } else if (requirement.kind === 'strap') {
          Model = Strap;
        } else if (requirement.kind === 'thumb') {
          Model = Thumb;
        } else {
          throw new Error('Invalid inventory requirement.');
        }

        /**
         * ------------------------------------------------------
         * DECREASE COMPONENT STOCK
         * ------------------------------------------------------
         */

        const result = await decrementComponentStock(
          Model,

          requirement.componentId,

          requirement.colorId,

          requirement.variantId,

          requirement.size,

          requirement.required,

          session,
        );

        if (!result.success) {
          throw new Error(
            `${requirement.colorName} ${requirement.kind} size ${requirement.size} just went out of stock. Please review your cart.`,
          );
        }

        /**
         * ------------------------------------------------------
         * INVENTORY AUDIT
         * ------------------------------------------------------
         */

        inventoryEntries.push({
          type: 'ORDER',

          itemType: requirement.kind.toUpperCase(),

          componentId: result.componentId,

          colorId: result.colorId,

          variantId: result.variantId,

          quantity: result.quantity,

          previousStock: result.previousStock,

          newStock: result.newStock,

          performedBy: userId,

          reason: 'Stock deducted for customer order.',
        });
      }

      /**
       * ========================================================
       * TOTALS
       * ========================================================
       *
       * Calculate coupon, shipping and tax
       * server-side.
       *
       * Never trust totals received from frontend.
       *
       * ========================================================
       */

      const couponCode = normalizeCouponCode(req.body.couponCode);

      let coupon = null;
      let couponDiscount = 0;

      if (couponCode) {
        coupon = await Coupon.findOne({
          code: couponCode,
        });

        if (!coupon) {
          throw new Error('Invalid coupon code.');
        }

        if (!coupon.isActive) {
          throw new Error('This coupon is inactive.');
        }

        if (coupon.expiresAt && new Date() > new Date(coupon.expiresAt)) {
          throw new Error('This coupon has expired.');
        }

        if (subtotal < Number(coupon.minimumOrderAmount || 0)) {
          throw new Error(
            `Minimum order amount is ₹${Number(
              coupon.minimumOrderAmount || 0,
            ).toFixed(2)}.`,
          );
        }

        if (
          coupon.usageLimit !== null &&
          Number(coupon.usedCount || 0) >= Number(coupon.usageLimit)
        ) {
          throw new Error('This coupon usage limit has been reached.');
        }

        const userCouponUsageCount = await Order.countDocuments({
          userId,
          couponCode: coupon.code,
          orderStatus: { $ne: 'CANCELLED' },
        }).session(session);

        if (userCouponUsageCount >= Number(coupon.perUserLimit || 1)) {
          throw new Error(
            'You have already used this coupon the maximum allowed number of times.',
          );
        }

        couponDiscount = calculateCouponDiscount(coupon, subtotal);
      }

      const discountedSubtotal = subtotal - couponDiscount;

      const shippingCharge = calculateShippingCharge(discountedSubtotal);
      const tax = calculateTax(discountedSubtotal);
      const totalAmount = discountedSubtotal + shippingCharge + tax;

      /**
       * ========================================================
       * CREATE ORDER
       * ========================================================
       */

      const orderResult = await Order.create(
        [
          {
            orderNumber: makeOrderNumber(),

            userId,

            items: orderItems,

            shippingAddress: {
              name: address.name,

              phone: address.phone,

              addressLine1: address.addressLine1,

              city: address.city,

              state: address.state,

              postalCode: address.postalCode,

              landmark: address.landmark || '',

              addressType: address.addressType || 'Home',

              country: address.country || 'India',
            },

            subtotal,

            couponCode: coupon?.code || '',

            couponDiscount,

            shippingCharge,

            tax,

            totalAmount,

            paymentMethod,

            paymentStatus: 'PENDING',

            orderStatus: 'PLACED',
          },
        ],
        {
          session,
        },
      );

      createdOrder = orderResult[0];

      /**
       * ========================================================
       * CONSUME COUPON USAGE
       * ========================================================
       */

      if (createdOrder.couponCode) {
        await incrementCouponUsage(createdOrder.couponCode, session);
      }

      /**
       * ========================================================
       * INVENTORY TRANSACTION
       * ========================================================
       */

      const entriesWithOrder = inventoryEntries.map((entry) => ({
        ...entry,

        orderId: createdOrder._id,
      }));

      if (entriesWithOrder.length > 0) {
        await InventoryTransaction.create(entriesWithOrder, {
          session,
          ordered: true,
        });
      }

      /**
       * ========================================================
       * CLEAR CART
       * ========================================================
       */

      cart.items = [];

      await cart.save({
        session,
      });

      /**
       * ========================================================
       * USER ORDER HISTORY
       * ========================================================
       */

      await UserModel.updateOne(
        {
          _id: userId,
        },

        {
          $push: {
            orderHistory: createdOrder._id,
          },
        },

        {
          session,
        },
      );

      /**
       * ========================================================
       * COMPLETE IDEMPOTENCY RECORD
       * ========================================================
       *
       * checkout key → order
       *
       * ========================================================
       */

      await IdempotencyKey.updateOne(
        {
          key: cleanIdempotencyKey,

          userId,
        },

        {
          $set: {
            orderId: createdOrder._id,

            status: 'COMPLETED',
          },
        },

        {
          session,
        },
      );
    });

    /**
     * ==========================================================
     * TRANSACTION SUCCESS
     * ==========================================================
     */

    /**
     * ==========================================================
     * ADMIN NOTIFICATION
     * ==========================================================
     *
     * Do this AFTER transaction.
     *
     * Notification failure must NOT
     * rollback order.
     *
     * ==========================================================
     */

    if (createdOrder) {
      try {
        await notifyAdmins({
          type: 'NEW_ORDER',

          title: 'New Order Received',

          message: `New order ${createdOrder.orderNumber} has been placed for ₹${createdOrder.totalAmount}.`,

          orderId: createdOrder._id,

          orderNumber: createdOrder.orderNumber,

          data: {
            totalAmount: createdOrder.totalAmount,

            itemCount: createdOrder.items?.length || 0,
          },
        });
      } catch (notificationError) {
        console.error('Notification error:', notificationError);
      }
    }

    /**
     * ==========================================================
     * ORDER CONFIRMATION EMAIL
     * ==========================================================
     */

    if (createdOrder && req.user?.email) {
      try {
        const emailSent = await sendEmailFun({
          sendTo: req.user.email,

          subject: `Order ${createdOrder.orderNumber} confirmed - Moochuu Footwear`,

          text: `Your Moochuu Footwear order ${createdOrder.orderNumber} has been placed successfully. Total: ₹${createdOrder.totalAmount}.`,

          html: orderConfirmationEmail(createdOrder),
        });

        if (!emailSent) {
          console.warn(
            `Order confirmation email could not be sent for ${createdOrder.orderNumber}`,
          );
        }
      } catch (emailError) {
        console.error('Order confirmation email error:', emailError);
      }
    }

    /**
     * ==========================================================
     * SUCCESS
     * ==========================================================
     */

    return res.status(201).json({
      success: true,

      message: 'Order placed successfully.',

      idempotent: false,

      data: {
        order: createdOrder,
      },
    });
  } catch (error) {
    console.error('CREATE ORDER ERROR:', error);

    /**
     * ==========================================================
     * DUPLICATE IDEMPOTENCY KEY
     * ==========================================================
     */

    if (error?.code === 11000) {
      try {
        const existingRequest = await IdempotencyKey.findOne({
          key: cleanIdempotencyKey,

          userId,
        }).populate('orderId');

        /**
         * Another request already completed
         */

        if (
          existingRequest?.status === 'COMPLETED' &&
          existingRequest?.orderId
        ) {
          return res.status(200).json({
            success: true,

            message: 'Order already created.',

            idempotent: true,

            data: {
              order: existingRequest.orderId,
            },
          });
        }

        /**
         * Another request is still processing
         */

        if (existingRequest?.status === 'PROCESSING') {
          return res.status(409).json({
            success: false,

            message:
              'This checkout request is already being processed. Please wait.',

            idempotent: true,
          });
        }
      } catch (duplicateLookupError) {
        console.error(
          'Duplicate idempotency lookup error:',
          duplicateLookupError,
        );
      }
    }

    /**
     * ==========================================================
     * MONGODB TRANSACTION ERROR
     * ==========================================================
     */

    const errorMessage = error?.message || '';

    const transactionError =
      errorMessage.includes('Transaction numbers are only allowed') ||
      errorMessage.includes('transaction') ||
      errorMessage.includes('replica set') ||
      errorMessage.includes('NoSuchTransaction') ||
      errorMessage.includes('TransientTransactionError') ||
      errorMessage.includes('ConflictingOperationInProgress');

    /**
     * ==========================================================
     * RESPONSE
     * ==========================================================
     */

    return res.status(transactionError ? 503 : 400).json({
      success: false,

      message: transactionError
        ? 'MongoDB transactions are required for checkout. Please use MongoDB Atlas or run your local MongoDB as a replica set.'
        : errorMessage || 'Unable to place order.',
    });
  } finally {
    await session.endSession();
  }
};

/**
 * ============================================================
 * GET MY ORDERS
 * ============================================================
 *
 * GET /api/orders/my-orders
 *
 * Returns all orders belonging to the logged-in user.
 * Latest orders are returned first.
 *
 * ============================================================
 */

export const getMyOrdersController = async (req, res) => {
  try {
    const userId = req.userId;

    /**
     * ==========================================================
     * VALIDATE USER
     * ==========================================================
     */

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required.',
      });
    }

    /**
     * ==========================================================
     * GET ORDERS
     * ==========================================================
     */

    const orders = await Order.find({
      userId,
    })
      .sort({
        createdAt: -1,
      })
      .lean();

    /**
     * ==========================================================
     * SUCCESS
     * ==========================================================
     */

    return res.status(200).json({
      success: true,
      data: orders,
    });
  } catch (error) {
    console.error('Get my orders error:', error);

    return res.status(500).json({
      success: false,
      message: 'Unable to fetch orders.',
    });
  }
};
/**
 * ============================================================
 * CREATE RAZORPAY ORDER
 * ============================================================
 *
 * POST /api/orders/razorpay
 *
 * Body:
 * {
 *   "addressId": "...",
 *   "couponCode": "..."
 * }
 *
 * Flow:
 *
 * 1. Validate user
 * 2. Validate address
 * 3. Get cart
 * 4. Get active products
 * 5. Validate products
 * 6. Validate size/options/stock
 * 7. Build stock requirements
 * 8. Calculate subtotal
 * 9. Calculate coupon
 * 10. Calculate shipping
 * 11. Calculate tax
 * 12. Create Razorpay order
 * 13. Start MongoDB transaction
 * 14. Reserve inventory
 * 15. Create PaymentAttempt
 *
 * IMPORTANT:
 *
 * stockQuantity is NOT reduced here.
 *
 * reservedQuantity is increased.
 *
 * Actual stock deduction happens only after
 * successful Razorpay payment verification.
 *
 * ============================================================
 */

export const createRazorpayOrderController = async (req, res) => {
  const userId = req.userId;

  try {
    /**
     * ========================================================
     * 1. VALIDATE USER
     * ========================================================
     */

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required.',
      });
    }

    /**
     * ========================================================
     * 2. IDEMPOTENCY KEY
     * ========================================================
     *
     * One Idempotency-Key represents one Razorpay checkout
     * attempt. A payment retry must use a new key.
     *
     * ========================================================
     */

    const idempotencyKey = req.headers['idempotency-key'];

    if (!idempotencyKey) {
      return res.status(400).json({
        success: false,
        message: 'Idempotency-Key header is required.',
      });
    }

    if (
      typeof idempotencyKey !== 'string' ||
      idempotencyKey.trim().length < 10 ||
      idempotencyKey.trim().length > 200
    ) {
      return res.status(400).json({
        success: false,
        message: 'Invalid Idempotency-Key.',
      });
    }

    const cleanIdempotencyKey = idempotencyKey.trim();

    /**
     * ========================================================
     * 2. GET REQUEST DATA
     * ========================================================
     */

    const { addressId } = req.body;

    /**
     * ========================================================
     * 3. VALIDATE ADDRESS ID
     * ========================================================
     */

    if (!addressId || !mongoose.Types.ObjectId.isValid(addressId)) {
      return res.status(400).json({
        success: false,
        message: 'Please select a valid delivery address.',
      });
    }

    /**
     * ========================================================
     * 4. GET ADDRESS
     * ========================================================
     */

    const address = await AddressModel.findOne({
      _id: addressId,
      userId,
    }).lean();

    if (!address) {
      return res.status(404).json({
        success: false,
        message: 'Selected delivery address was not found.',
      });
    }

    /**
     * ========================================================
     * 5. GET CART
     * ========================================================
     */

    const cart = await Cart.findOne({
      userId,
    }).lean();

    if (!cart || !Array.isArray(cart.items) || cart.items.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Your cart is empty.',
      });
    }

    /**
     * ========================================================
     * 6. GET PRODUCT IDS
     * ========================================================
     */

    const productIds = cart.items.map((item) => item.productId);

    /**
     * ========================================================
     * 7. GET ACTIVE PRODUCTS
     * ========================================================
     *
     * Never trust product information from frontend.
     */

    const products = await Product.find({
      _id: {
        $in: productIds,
      },

      status: 'ACTIVE',
    })
      .populate('allowedBases')
      .populate('allowedStraps')
      .populate('allowedThumbs')
      .lean();

    /**
     * ========================================================
     * 8. PRODUCT MAP
     * ========================================================
     */

    const productMap = new Map(
      products.map((product) => [String(product._id), product]),
    );

    /**
     * ========================================================
     * 9. VALIDATE ALL PRODUCTS
     * ========================================================
     */

    for (const cartItem of cart.items) {
      const product = productMap.get(String(cartItem.productId));

      if (!product) {
        return res.status(400).json({
          success: false,
          message: 'One or more products in your cart are no longer available.',
        });
      }
    }

    /**
     * ========================================================
     * 10. PREPARE CHECKOUT DATA
     * ========================================================
     */

    let subtotal = 0;

    const orderItems = [];

    const stockRequirements = [];

    /**
     * ========================================================
     * 11. VALIDATE EACH CART ITEM
     * ========================================================
     */

    for (const cartItem of cart.items) {
      const product = productMap.get(String(cartItem.productId));

      if (!product) {
        return res.status(400).json({
          success: false,
          message: `${cartItem.name || 'A product'} is no longer available.`,
        });
      }

      /**
       * ------------------------------------------------------
       * QUANTITY
       * ------------------------------------------------------
       */

      const quantity = Number(cartItem.quantity);

      if (!Number.isInteger(quantity) || quantity < 1) {
        return res.status(400).json({
          success: false,
          message: `Invalid quantity for ${product.name}.`,
        });
      }

      /**
       * ------------------------------------------------------
       * SERVER-SIDE PRICE
       * ------------------------------------------------------
       */

      const unitPrice = Number(product.basePrice);

      if (!Number.isFinite(unitPrice) || unitPrice < 0) {
        return res.status(400).json({
          success: false,
          message: `Invalid price for ${product.name}.`,
        });
      }

      /**
       * ------------------------------------------------------
       * GET STOCK REQUIREMENTS
       * ------------------------------------------------------
       *
       * Uses your existing getRequiredStock().
       *
       * STANDARD:
       * Product.standardStock
       *
       * CUSTOMIZABLE:
       * Base + Strap + optional Thumb
       */

      const requirements = getRequiredStock(product, cartItem);

      /**
       * ------------------------------------------------------
       * CHECK AVAILABLE STOCK
       * ------------------------------------------------------
       */

      for (const requirement of requirements) {
        if (requirement.available < requirement.required) {
          return res.status(400).json({
            success: false,
            message: requirement.message,
          });
        }
      }

      /**
       * ------------------------------------------------------
       * STORE REQUIREMENTS
       * ------------------------------------------------------
       */

      stockRequirements.push(...requirements);

      /**
       * ------------------------------------------------------
       * LINE TOTAL
       * ------------------------------------------------------
       */

      const lineTotal = unitPrice * quantity;

      subtotal += lineTotal;

      /**
       * ------------------------------------------------------
       * CUSTOMIZABLE OPTIONS
       * ------------------------------------------------------
       */

      let base = null;
      let strap = null;
      let thumb = null;

      if (product.productType === 'CUSTOMIZABLE') {
        /**
         * BASE
         */

        const baseRequirement = requirements.find(
          (item) => item.kind === 'base',
        );

        /**
         * STRAP
         */

        const strapRequirement = requirements.find(
          (item) => item.kind === 'strap',
        );

        /**
         * THUMB
         */

        const thumbRequirement = requirements.find(
          (item) => item.kind === 'thumb',
        );

        /**
         * BASE REQUIRED
         */

        if (!baseRequirement) {
          return res.status(400).json({
            success: false,
            message: `Base inventory information is missing for ${product.name}.`,
          });
        }

        /**
         * STRAP REQUIRED
         */

        if (!strapRequirement) {
          return res.status(400).json({
            success: false,
            message: `Strap inventory information is missing for ${product.name}.`,
          });
        }

        /**
         * BASE SNAPSHOT
         */

        base = {
          componentId: baseRequirement.componentId,

          colorId: baseRequirement.colorId,

          variantId: baseRequirement.variantId,

          colorName: baseRequirement.colorName || '',

          image: baseRequirement.image || '',
        };

        /**
         * STRAP SNAPSHOT
         */

        strap = {
          componentId: strapRequirement.componentId,

          colorId: strapRequirement.colorId,

          variantId: strapRequirement.variantId,

          colorName: strapRequirement.colorName || '',

          image: strapRequirement.image || '',
        };

        /**
         * THUMB SNAPSHOT
         */

        if (thumbRequirement) {
          thumb = {
            componentId: thumbRequirement.componentId,

            colorId: thumbRequirement.colorId,

            variantId: thumbRequirement.variantId,

            colorName: thumbRequirement.colorName || '',

            image: thumbRequirement.image || '',
          };
        }
      }

      /**
       * ------------------------------------------------------
       * STANDARD PRODUCT
       * ------------------------------------------------------
       */

      const standardRequirement =
        product.productType === 'STANDARD'
          ? requirements.find((item) => item.kind === 'standard')
          : null;

      /**
       * ------------------------------------------------------
       * CREATE FROZEN PAYMENT SNAPSHOT
       * ------------------------------------------------------
       */

      orderItems.push({
        productId: product._id,

        productCode: product.productCode || cartItem.productCode,

        name: product.name,

        image:
          cartItem.image ||
          base?.image ||
          strap?.image ||
          product.mainImage ||
          '',

        productType: product.productType,

        size: String(cartItem.size),

        quantity,

        unitPrice,

        lineTotal,

        /**
         * STANDARD INVENTORY
         */

        variantId: standardRequirement?.variantId || null,

        /**
         * CUSTOMIZABLE INVENTORY
         */

        base,

        strap,

        thumb,
      });
    }

    /**
     * ========================================================
     * 12. COUPON
     * ========================================================
     */

    const couponCode = normalizeCouponCode(req.body.couponCode);

    let coupon = null;

    let couponDiscount = 0;

    if (couponCode) {
      coupon = await Coupon.findOne({
        code: couponCode,
      });

      if (!coupon) {
        return res.status(400).json({
          success: false,
          message: 'Invalid coupon code.',
        });
      }

      if (!coupon.isActive) {
        return res.status(400).json({
          success: false,
          message: 'This coupon is inactive.',
        });
      }

      if (coupon.expiresAt && new Date() > new Date(coupon.expiresAt)) {
        return res.status(400).json({
          success: false,
          message: 'This coupon has expired.',
        });
      }

      if (subtotal < Number(coupon.minimumOrderAmount || 0)) {
        return res.status(400).json({
          success: false,
          message: `Minimum order amount is ₹${Number(
            coupon.minimumOrderAmount || 0,
          ).toFixed(2)}.`,
        });
      }

      if (
        coupon.usageLimit !== null &&
        Number(coupon.usedCount || 0) >= Number(coupon.usageLimit)
      ) {
        return res.status(400).json({
          success: false,
          message: 'This coupon usage limit has been reached.',
        });
      }

      const userCouponUsageCount = await Order.countDocuments({
        userId,

        couponCode: coupon.code,

        orderStatus: {
          $ne: 'CANCELLED',
        },
      });

      if (userCouponUsageCount >= Number(coupon.perUserLimit || 1)) {
        return res.status(400).json({
          success: false,
          message:
            'You have already used this coupon the maximum allowed number of times.',
        });
      }

      couponDiscount = calculateCouponDiscount(coupon, subtotal);
    }

    /**
     * ========================================================
     * 13. SHIPPING + TAX
     * ========================================================
     */

    const discountedSubtotal = subtotal - couponDiscount;

    if (discountedSubtotal < 0) {
      return res.status(400).json({
        success: false,
        message: 'Invalid coupon discount.',
      });
    }

    const shippingCharge = calculateShippingCharge(discountedSubtotal);

    const tax = calculateTax(discountedSubtotal);

    const totalAmount = discountedSubtotal + shippingCharge + tax;

    /**
     * ========================================================
     * 14. VALIDATE TOTAL
     * ========================================================
     */

    if (!Number.isFinite(totalAmount) || totalAmount <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Invalid order amount.',
      });
    }

    /**
     * ========================================================
     * 15. CONVERT TO PAISE
     * ========================================================
     */

    const razorpayAmount = Math.round(totalAmount * 100);

    /**
     * ========================================================
     * 16. CREATE RAZORPAY RECEIPT
     * ========================================================
     */

    const receipt = `MC_${Date.now()}`;

    /**
     * ========================================================
     * CLAIM IDEMPOTENCY KEY
     * ========================================================
     *
     * This is intentionally done after checkout validation so an
     * invalid checkout does not consume the customer's key.
     *
     * ========================================================
     */

    let idempotencyRecord = await IdempotencyKey.findOne({
      key: cleanIdempotencyKey,
    });

    if (idempotencyRecord) {
      if (String(idempotencyRecord.userId) !== String(userId)) {
        return res.status(409).json({
          success: false,
          message: 'This Idempotency-Key is already in use.',
        });
      }

      if (
        idempotencyRecord.status === 'COMPLETED' &&
        idempotencyRecord.paymentAttemptId &&
        idempotencyRecord.razorpayOrderId
      ) {
        return res.status(200).json({
          success: true,
          message: 'Razorpay checkout already created.',
          idempotent: true,
          data: {
            razorpayOrderId: idempotencyRecord.razorpayOrderId,
            paymentAttemptId: idempotencyRecord.paymentAttemptId,
            keyId: process.env.RAZORPAY_KEY_ID,
          },
        });
      }

      if (idempotencyRecord.status === 'PROCESSING') {
        return res.status(409).json({
          success: false,
          message:
            'This checkout request is already being processed. Please wait.',
          idempotent: true,
        });
      }

      if (idempotencyRecord.status === 'FAILED') {
        const reclaimedRecord = await IdempotencyKey.findOneAndUpdate(
          {
            _id: idempotencyRecord._id,
            userId,
            status: 'FAILED',
          },
          {
            $set: {
              status: 'PROCESSING',
              orderId: null,
              paymentAttemptId: null,
              razorpayOrderId: '',
            },
          },
          { new: true },
        );

        if (!reclaimedRecord) {
          return res.status(409).json({
            success: false,
            message:
              'This checkout request is already being processed. Please wait.',
            idempotent: true,
          });
        }

        idempotencyRecord = reclaimedRecord;
      }

      if (idempotencyRecord.status === 'COMPLETED') {
        return res.status(409).json({
          success: false,
          message: 'This Idempotency-Key has already been used.',
          idempotent: true,
        });
      }
    } else {
      try {
        idempotencyRecord = await IdempotencyKey.create({
          key: cleanIdempotencyKey,
          userId,
          orderId: null,
          paymentAttemptId: null,
          razorpayOrderId: '',
          status: 'PROCESSING',
        });
      } catch (error) {
        if (error?.code !== 11000) {
          throw error;
        }

        const existingRequest = await IdempotencyKey.findOne({
          key: cleanIdempotencyKey,
        });

        if (!existingRequest) {
          throw error;
        }

        if (String(existingRequest.userId) !== String(userId)) {
          return res.status(409).json({
            success: false,
            message: 'This Idempotency-Key is already in use.',
          });
        }

        if (
          existingRequest.status === 'COMPLETED' &&
          existingRequest.paymentAttemptId &&
          existingRequest.razorpayOrderId
        ) {
          return res.status(200).json({
            success: true,
            message: 'Razorpay checkout already created.',
            idempotent: true,
            data: {
              razorpayOrderId: existingRequest.razorpayOrderId,
              paymentAttemptId: existingRequest.paymentAttemptId,
              keyId: process.env.RAZORPAY_KEY_ID,
            },
          });
        }

        return res.status(409).json({
          success: false,
          message:
            'This checkout request is already being processed. Please wait.',
          idempotent: true,
        });
      }
    }

    /**
     * ========================================================
     * 17. CREATE RAZORPAY ORDER
     * ========================================================
     */

    const razorpayOrder = await razorpay.orders.create({
      amount: razorpayAmount,

      currency: 'INR',

      receipt,

      partial_payment: false,

      notes: {
        userId: String(userId),

        addressId: String(addressId),
      },
    });

    await IdempotencyKey.updateOne(
      {
        _id: idempotencyRecord._id,
        userId,
        status: 'PROCESSING',
      },
      {
        $set: {
          razorpayOrderId: razorpayOrder.id,
        },
      },
    );

    /**
     * ========================================================
     * 18. START MONGODB TRANSACTION
     * ========================================================
     */

    const session = await mongoose.startSession();

    let paymentAttempt = null;

    try {
      await session.withTransaction(async () => {
        /**
         * ==================================================
         * RESERVE INVENTORY
         * ==================================================
         *
         * IMPORTANT:
         *
         * stockQuantity does NOT decrease.
         *
         * reservedQuantity increases.
         */

        const stockReservations = await reserveStock({
          requirements: stockRequirements,

          session,
        });

        /**
         * ==================================================
         * CREATE PAYMENT ATTEMPT
         * ==================================================
         */

        const attempts = await PaymentAttempt.create(
          [
            {
              userId,

              addressId,

              razorpayOrderId: razorpayOrder.id,

              razorpayPaymentId: '',

              razorpaySignature: '',

              amount: razorpayAmount,

              /**
               * Frozen checkout snapshot
               */

              cartItems: orderItems,

              subtotal,

              couponCode: coupon?.code || '',

              couponDiscount,

              shippingCharge,

              tax,

              totalAmount,

              currency: razorpayOrder.currency,

              status: 'CREATED',

              failureReason: '',

              orderId: null,

              /**
               * Reservation snapshot
               */

              stockReservations,

              reservationStatus: 'RESERVED',

              reservationReleasedAt: null,

              reservationCommittedAt: null,

              paidAt: null,

              /**
               * Reservation expires
               * after 30 minutes.
               */

              expiresAt: new Date(Date.now() + 30 * 60 * 1000),
            },
          ],
          {
            session,
          },
        );

        paymentAttempt = attempts[0];
        await IdempotencyKey.updateOne(
          {
            _id: idempotencyRecord._id,
            userId,
            status: 'PROCESSING',
          },
          {
            $set: {
              paymentAttemptId: paymentAttempt._id,
              razorpayOrderId: razorpayOrder.id,
              status: 'COMPLETED',
            },
          },
          { session },
        );
      });
    } finally {
      await session.endSession();
    }

    /**
     * ========================================================
     * SUCCESS
     * ========================================================
     */

    return res.status(201).json({
      success: true,

      message: 'Razorpay order created successfully.',

      idempotent: false,

      data: {
        razorpayOrderId: razorpayOrder.id,

        paymentAttemptId: paymentAttempt._id,

        amount: razorpayOrder.amount,

        currency: razorpayOrder.currency,

        keyId: process.env.RAZORPAY_KEY_ID,

        receipt: razorpayOrder.receipt,
      },
    });
  } catch (error) {
    console.error('Create Razorpay order error:', error);

    if (idempotencyRecord?._id) {
      try {
        await IdempotencyKey.updateOne(
          {
            _id: idempotencyRecord._id,
            userId,
            status: 'PROCESSING',
          },
          {
            $set: {
              status: 'FAILED',
            },
          },
        );
      } catch (idempotencyError) {
        console.error(
          'Failed to update Razorpay idempotency status:',
          idempotencyError,
        );
      }
    }

    return res.status(500).json({
      success: false,

      message:
        error?.error?.description ||
        error?.message ||
        'Unable to create Razorpay order.',
    });
  }
};

/**
 * ============================================================
 * VERIFY RAZORPAY PAYMENT
 * ============================================================
 *
 * POST /api/orders/razorpay/verify
 *
 * Body:
 *
 * {
 *   razorpay_order_id,
 *   razorpay_payment_id,
 *   razorpay_signature
 * }
 *
 * Flow:
 *
 * 1. Validate user
 * 2. Validate request
 * 3. Verify Razorpay signature
 * 4. Fetch Razorpay payment
 * 5. Find PaymentAttempt
 * 6. Check payment status
 * 7. Check payment amount
 * 8. Check payment currency
 * 9. Start MongoDB transaction
 * 10. Load PaymentAttempt
 * 11. Verify reservation
 * 12. Commit reservation
 * 13. Create order
 * 14. Consume coupon
 * 15. Create InventoryTransaction
 * 16. Clear cart
 * 17. Update user order history
 * 18. Mark PaymentAttempt PAID
 * 19. Mark reservation COMMITTED
 * 20. Send notifications/email
 *
 * ============================================================
 */

export const verifyRazorpayPaymentController = async (req, res) => {
  const userId = req.userId;

  /**
   * ========================================================
   * 1. VALIDATE USER
   * ========================================================
   */

  if (!userId) {
    return res.status(401).json({
      success: false,
      message: 'Unauthorized.',
    });
  }

  /**
   * ========================================================
   * 2. GET REQUEST DATA
   * ========================================================
   */

  const { razorpay_order_id, razorpay_payment_id, razorpay_signature } =
    req.body;

  /**
   * ========================================================
   * 3. VALIDATE REQUEST
   * ========================================================
   */

  if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
    return res.status(400).json({
      success: false,
      message: 'Payment verification data is incomplete.',
    });
  }

  try {
    /**
     * ========================================================
     * 4. VERIFY RAZORPAY SIGNATURE
     * ========================================================
     */

    const generatedSignature = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
      .update(`${razorpay_order_id}|${razorpay_payment_id}`)
      .digest('hex');

    if (generatedSignature !== razorpay_signature) {
      return res.status(400).json({
        success: false,
        message: 'Payment verification failed.',
      });
    }

    /**
     * ========================================================
     * 5. FETCH RAZORPAY PAYMENT
     * ========================================================
     */

    const razorpayPayment = await razorpay.payments.fetch(razorpay_payment_id);

    if (!razorpayPayment) {
      return res.status(400).json({
        success: false,
        message: 'Unable to verify Razorpay payment.',
      });
    }

    /**
     * ========================================================
     * 6. FIND PAYMENT ATTEMPT
     * ========================================================
     */

    const paymentAttempt = await PaymentAttempt.findOne({
      razorpayOrderId: razorpay_order_id,

      userId,
    });

    if (!paymentAttempt) {
      return res.status(404).json({
        success: false,
        message: 'Payment attempt not found.',
      });
    }

    /**
     * ========================================================
     * 7. IDEMPOTENCY
     * ========================================================
     *
     * If payment was already processed,
     * never commit inventory again.
     */

    if (paymentAttempt.status === 'PAID' && paymentAttempt.orderId) {
      const existingOrder = await Order.findById(paymentAttempt.orderId);

      return res.status(200).json({
        success: true,

        message: 'Payment already processed.',

        data: {
          order: existingOrder,

          idempotent: true,
        },
      });
    }

    /**
     * ========================================================
     * 8. VERIFY RAZORPAY ORDER ID
     * ========================================================
     */

    if (razorpayPayment.order_id !== razorpay_order_id) {
      return res.status(400).json({
        success: false,
        message: 'Payment order mismatch.',
      });
    }

    /**
     * ========================================================
     * 9. VERIFY PAYMENT STATUS
     * ========================================================
     */

    if (razorpayPayment.status !== 'captured') {
      return res.status(400).json({
        success: false,

        message: `Payment is not captured. Current status: ${razorpayPayment.status}.`,
      });
    }

    /**
     * ========================================================
     * 10. VERIFY PAYMENT AMOUNT
     * ========================================================
     */

    if (Number(razorpayPayment.amount) !== Number(paymentAttempt.amount)) {
      return res.status(400).json({
        success: false,
        message: 'Payment amount does not match the payment attempt.',
      });
    }

    /**
     * ========================================================
     * 11. VERIFY PAYMENT CURRENCY
     * ========================================================
     */

    if (
      razorpayPayment.currency &&
      paymentAttempt.currency &&
      razorpayPayment.currency !== paymentAttempt.currency
    ) {
      return res.status(400).json({
        success: false,
        message: 'Payment currency does not match the payment attempt.',
      });
    }

    /**
     * ========================================================
     * 12. START MONGODB TRANSACTION
     * ========================================================
     */

    const session = await mongoose.startSession();

    let createdOrder = null;

    try {
      await session.withTransaction(async () => {
        /**
         * ==================================================
         * PAYMENT ATTEMPT
         * ==================================================
         */

        const paymentAttemptInTransaction = await PaymentAttempt.findOne({
          _id: paymentAttempt._id,

          userId,
        }).session(session);

        if (!paymentAttemptInTransaction) {
          throw new Error('Payment attempt not found.');
        }

        /**
         * ==================================================
         * IDEMPOTENCY CHECK INSIDE TRANSACTION
         * ==================================================
         */

        if (
          paymentAttemptInTransaction.status === 'PAID' &&
          paymentAttemptInTransaction.orderId
        ) {
          throw new Error('Payment has already been processed.');
        }

        /**
         * ==================================================
         * RESERVATION STATUS
         * ==================================================
         */

        if (
          !['CREATED', 'PROCESSING'].includes(
            paymentAttemptInTransaction.status,
          )
        ) {
          throw new Error(
            `Payment attempt cannot be completed from status ${paymentAttemptInTransaction.status}.`,
          );
        }

        if (paymentAttemptInTransaction.reservationStatus !== 'RESERVED') {
          throw new Error('Payment inventory reservation is no longer valid.');
        }

        /**
         * ==================================================
         * RESERVATIONS
         * ==================================================
         */

        const reservations = paymentAttemptInTransaction.stockReservations;

        if (!Array.isArray(reservations) || reservations.length === 0) {
          throw new Error('No inventory reservation found for this payment.');
        }

        /**
         * ==================================================
         * CHECK RESERVATION EXPIRY
         * ==================================================
         */

        if (
          paymentAttemptInTransaction.expiresAt &&
          new Date() >= new Date(paymentAttemptInTransaction.expiresAt)
        ) {
          throw new Error(
            'Payment reservation has expired. Please create a new payment.',
          );
        }

        /**
         * ==================================================
         * ADDRESS
         * ==================================================
         */

        const address = await AddressModel.findOne({
          _id: paymentAttemptInTransaction.addressId,

          userId,
        }).session(session);

        if (!address) {
          throw new Error('Selected delivery address was not found.');
        }

        /**
         * ==================================================
         * FROZEN PAYMENT SNAPSHOT
         * ==================================================
         *
         * IMPORTANT:
         *
         * We use PaymentAttempt.cartItems.
         *
         * We DO NOT use the current frontend cart.
         */

        const snapshotItems = paymentAttemptInTransaction.cartItems;

        if (!Array.isArray(snapshotItems) || snapshotItems.length === 0) {
          throw new Error('Payment attempt contains no order items.');
        }

        /**
         * ==================================================
         * LOAD PRODUCTS
         * ==================================================
         *
         * We only need the product documents for
         * validation/reference.
         *
         * We DO NOT use current product price.
         *
         * The customer already paid the frozen price.
         */

        const productIds = snapshotItems.map((item) => item.productId);

        const products = await Product.find({
          _id: {
            $in: productIds,
          },
        })
          .populate('allowedBases')
          .populate('allowedStraps')
          .populate('allowedThumbs')
          .session(session);

        const productMap = new Map(
          products.map((product) => [String(product._id), product]),
        );

        /**
         * ==================================================
         * BUILD FINAL ORDER ITEMS
         * ==================================================
         */

        const orderItems = [];

        let subtotal = 0;

        for (const snapshotItem of snapshotItems) {
          const product = productMap.get(String(snapshotItem.productId));

          /**
           * Product must still exist.
           *
           * We do NOT require status ACTIVE here.
           *
           * The customer has already paid.
           */

          if (!product) {
            throw new Error(
              `${snapshotItem.name || 'A product'} could not be found while completing the paid order.`,
            );
          }

          /**
           * ------------------------------------------------
           * QUANTITY
           * ------------------------------------------------
           */

          const quantity = Number(snapshotItem.quantity);

          if (!Number.isInteger(quantity) || quantity < 1) {
            throw new Error(`Invalid quantity for ${product.name}.`);
          }

          /**
           * ------------------------------------------------
           * FROZEN UNIT PRICE
           * ------------------------------------------------
           *
           * NEVER use product.basePrice here.
           */

          const unitPrice = Number(snapshotItem.unitPrice);

          if (!Number.isFinite(unitPrice) || unitPrice < 0) {
            throw new Error(`Invalid frozen price for ${product.name}.`);
          }

          /**
           * ------------------------------------------------
           * FROZEN LINE TOTAL
           * ------------------------------------------------
           */

          const lineTotal = unitPrice * quantity;

          subtotal += lineTotal;

          /**
           * ------------------------------------------------
           * CUSTOMIZABLE OPTIONS
           * ------------------------------------------------
           */

          let base = snapshotItem.base || null;

          let strap = snapshotItem.strap || null;

          let thumb = snapshotItem.thumb || null;

          /**
           * ------------------------------------------------
           * CREATE ORDER ITEM
           * ------------------------------------------------
           */

          orderItems.push({
            productId: product._id,

            productCode: snapshotItem.productCode || product.productCode || '',

            name: snapshotItem.name || product.name,

            image:
              snapshotItem.image ||
              snapshotItem.base?.image ||
              snapshotItem.strap?.image ||
              product.mainImage ||
              '',

            productType: snapshotItem.productType || product.productType,

            size: String(snapshotItem.size),

            quantity,

            unitPrice,

            lineTotal,

            /**
             * STANDARD
             */

            variantId: snapshotItem.variantId || null,

            /**
             * CUSTOMIZABLE
             */

            base,

            strap,

            thumb,
          });
        }

        /**
         * ==================================================
         * VERIFY PAYMENT TOTAL
         * ==================================================
         *
         * Coupon discount is frozen in PaymentAttempt.
         */

        const couponDiscount = Number(
          paymentAttemptInTransaction.couponDiscount || 0,
        );

        const discountedSubtotal = subtotal - couponDiscount;

        if (discountedSubtotal < 0) {
          throw new Error('Invalid coupon discount.');
        }

        const shippingCharge = calculateShippingCharge(discountedSubtotal);

        const tax = calculateTax(discountedSubtotal);

        const totalAmount = discountedSubtotal + shippingCharge + tax;

        /**
         * ------------------------------------------------
         * Compare with PaymentAttempt
         * ------------------------------------------------
         */

        if (
          Number(totalAmount.toFixed(2)) !==
          Number(Number(paymentAttemptInTransaction.totalAmount).toFixed(2))
        ) {
          throw new Error(
            'Payment attempt total does not match the calculated order total.',
          );
        }

        /**
         * ------------------------------------------------
         * Compare Razorpay amount
         * ------------------------------------------------
         */

        const expectedAmountPaise = Math.round(totalAmount * 100);

        if (Number(razorpayPayment.amount) !== expectedAmountPaise) {
          throw new Error('Payment amount does not match the order amount.');
        }

        /**
         * ==================================================
         * COMMIT RESERVED INVENTORY
         * ==================================================
         *
         * THIS IS THE IMPORTANT CHANGE.
         *
         * DO NOT call:
         *
         * decrementStandardStock()
         *
         * DO NOT call:
         *
         * decrementComponentStock()
         *
         * The inventory was already RESERVED.
         *
         * commitStockReservation():
         *
         * stockQuantity -= quantity
         *
         * reservedQuantity -= quantity
         */

        const inventoryEntries = await commitStockReservation({
          reservations,

          session,
        });

        if (!Array.isArray(inventoryEntries) || inventoryEntries.length === 0) {
          throw new Error('Unable to commit reserved inventory.');
        }

        /**
         * ==================================================
         * CREATE FINAL ORDER
         * ==================================================
         */

        const order = await Order.create(
          [
            {
              orderNumber: makeOrderNumber(),

              userId,

              items: orderItems,

              shippingAddress: {
                name: address.name,

                phone: address.phone,

                addressLine1: address.addressLine1,

                city: address.city,

                state: address.state,

                postalCode: address.postalCode,

                landmark: address.landmark || '',

                addressType: address.addressType || 'Home',

                country: address.country || 'India',
              },

              subtotal,

              couponCode: paymentAttemptInTransaction.couponCode || '',

              couponDiscount,

              shippingCharge,

              tax,

              totalAmount,

              paymentMethod: 'ONLINE',

              paymentStatus: 'PAID',

              paymentProvider: 'RAZORPAY',

              razorpayOrderId: razorpay_order_id,

              razorpayPaymentId: razorpay_payment_id,

              razorpaySignature: razorpay_signature,

              paymentId: razorpay_payment_id,

              paymentPaidAt: new Date(),

              orderStatus: 'PLACED',
            },
          ],
          {
            session,
          },
        );

        createdOrder = order[0];

        /**
         * ==================================================
         * CONSUME COUPON
         * ==================================================
         */

        if (createdOrder.couponCode) {
          await incrementCouponUsage(createdOrder.couponCode, session);
        }

        /**
         * ==================================================
         * INVENTORY TRANSACTION
         * ==================================================
         *
         * commitStockReservation()
         * already returned:
         *
         * previousStock
         * newStock
         *
         * which are required by your
         * InventoryTransaction schema.
         */

        const entriesWithOrder = inventoryEntries.map((entry) => ({
          ...entry,

          orderId: createdOrder._id,

          performedBy: userId,

          reason: 'Stock committed from Razorpay payment reservation.',
        }));

        if (entriesWithOrder.length) {
          await InventoryTransaction.insertMany(entriesWithOrder, {
            session,
          });
        }

        /**
         * ==================================================
         * CLEAR CART
         * ==================================================
         */

        const cart = await Cart.findOne({
          userId,
        }).session(session);

        if (cart) {
          cart.items = [];

          await cart.save({
            session,
          });
        }

        /**
         * ==================================================
         * USER ORDER HISTORY
         * ==================================================
         */

        await UserModel.updateOne(
          {
            _id: userId,
          },

          {
            $push: {
              orderHistory: createdOrder._id,
            },
          },

          {
            session,
          },
        );

        /**
         * ==================================================
         * MARK PAYMENT ATTEMPT PAID
         * ==================================================
         */

        paymentAttemptInTransaction.status = 'PAID';

        paymentAttemptInTransaction.razorpayPaymentId = razorpay_payment_id;

        paymentAttemptInTransaction.razorpaySignature = razorpay_signature;

        paymentAttemptInTransaction.orderId = createdOrder._id;

        paymentAttemptInTransaction.paidAt = new Date();

        /**
         * ==================================================
         * RESERVATION LIFECYCLE
         * ==================================================
         */

        paymentAttemptInTransaction.reservationStatus = 'COMMITTED';

        paymentAttemptInTransaction.reservationCommittedAt = new Date();

        paymentAttemptInTransaction.reservationReleasedAt = null;

        await paymentAttemptInTransaction.save({
          session,
        });
      });
    } finally {
      await session.endSession();
    }

    /**
     * ========================================================
     * ADMIN NOTIFICATION
     * ========================================================
     *
     * Outside transaction.
     *
     * Notification failure must never rollback
     * an already-paid order.
     */

    if (createdOrder) {
      try {
        await notifyAdmins({
          type: 'NEW_ORDER',

          title: 'New Online Order Received',

          message: `New order ${createdOrder.orderNumber} has been paid for ₹${createdOrder.totalAmount}.`,

          orderId: createdOrder._id,

          orderNumber: createdOrder.orderNumber,

          data: {
            totalAmount: createdOrder.totalAmount,

            itemCount: createdOrder.items?.length || 0,

            paymentMethod: 'ONLINE',

            paymentProvider: 'RAZORPAY',
          },
        });
      } catch (notificationError) {
        console.error('Admin notification failed:', notificationError);
      }
    }

    /**
     * ========================================================
     * ORDER CONFIRMATION EMAIL
     * ========================================================
     */

    if (createdOrder && req.user?.email) {
      try {
        const emailSent = await sendEmailFun({
          sendTo: req.user.email,

          subject: `Order ${createdOrder.orderNumber} confirmed - Moochuu Footwear`,

          text: `Your Moochuu Footwear order ${createdOrder.orderNumber} has been paid successfully. Total: ₹${createdOrder.totalAmount}.`,

          html: orderConfirmationEmail(createdOrder),
        });

        if (!emailSent) {
          console.warn(
            `Order confirmation email could not be sent for ${createdOrder.orderNumber}`,
          );
        }
      } catch (emailError) {
        console.error('Online order confirmation email failed:', emailError);
      }
    }

    /**
     * ========================================================
     * SUCCESS
     * ========================================================
     */

    return res.status(200).json({
      success: true,

      message: 'Payment verified and order placed successfully.',

      data: {
        order: createdOrder,

        idempotent: false,
      },
    });
  } catch (error) {
    console.error('Verify Razorpay payment error:', error);

    const errorMessage = error?.message || '';

    /**
     * ========================================================
     * MONGODB TRANSACTION ERROR
     * ========================================================
     */

    const transactionError =
      errorMessage.includes('Transaction numbers are only allowed') ||
      errorMessage.includes('transaction') ||
      errorMessage.includes('replica set') ||
      errorMessage.includes('NoSuchTransaction') ||
      errorMessage.includes('TransientTransactionError') ||
      errorMessage.includes('ConflictingOperationInProgress');

    return res.status(transactionError ? 503 : 400).json({
      success: false,

      message: transactionError
        ? 'MongoDB transactions are required for checkout. Please use MongoDB Atlas or run your local MongoDB as a replica set.'
        : errorMessage || 'Unable to verify payment.',
    });
  }
};

/**
 * GET SINGLE ORDER
 *
 * GET /api/order/:orderId
 */
export const getOrderByIdController = async (req, res) => {
  try {
    const { orderId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(orderId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid order ID.',
      });
    }

    const order = await Order.findOne({
      _id: orderId,
      userId: req.userId,
    }).lean();

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found.',
      });
    }

    return res.status(200).json({
      success: true,
      data: order,
    });
  } catch (error) {
    console.error('Get order by ID error:', error);

    return res.status(500).json({
      success: false,
      message: 'Unable to fetch order.',
    });
  }
};

/**
 * ============================================================
 * CANCEL MY ORDER
 * ============================================================
 *
 * PATCH /api/orders/:orderId/cancel
 *
 * Rules:
 * - Customer can cancel only their own order
 * - Allowed: PLACED, CONFIRMED, PROCESSING
 * - SHIPPED / DELIVERED cannot be cancelled
 * - COD cancellation restores inventory
 * - PAID ONLINE cancellation is blocked for now
 *   until Razorpay refund flow is implemented
 *
 * ============================================================
 */

export const cancelMyOrderController = async (req, res) => {
  const userId = req.userId;
  const { orderId } = req.params;

  /*
   * ------------------------------------------------------------
   * STEP 1: AUTHENTICATION
   * ------------------------------------------------------------
   */

  if (!userId) {
    return res.status(401).json({
      success: false,
      message: 'Authentication required.',
    });
  }

  /*
   * ------------------------------------------------------------
   * STEP 2: VALIDATE ORDER ID
   * ------------------------------------------------------------
   */

  if (!orderId || !mongoose.Types.ObjectId.isValid(orderId)) {
    return res.status(400).json({
      success: false,
      message: 'Invalid order ID.',
    });
  }

  /*
   * ------------------------------------------------------------
   * STEP 3: START TRANSACTION
   * ------------------------------------------------------------
   *
   * IMPORTANT:
   *
   * For paid online orders:
   *
   * MongoDB transaction completes FIRST.
   *
   * Razorpay refund is created AFTER transaction commit.
   *
   * This prevents:
   *
   * Razorpay refund SUCCESS
   * +
   * MongoDB transaction ROLLBACK
   *
   * from creating an inconsistent order.
   *
   * ------------------------------------------------------------
   */

  const session = await mongoose.startSession();

  let cancelledOrder = null;
  let shouldCreateRefund = false;
  let refundAmountPaise = 0;

  try {
    await session.withTransaction(async () => {
      /*
       * ----------------------------------------------------------
       * STEP 4: RE-READ ORDER INSIDE TRANSACTION
       * ----------------------------------------------------------
       *
       * Never trust the order snapshot loaded before the
       * transaction because another request may have changed it.
       *
       * ----------------------------------------------------------
       */

      const currentOrder = await Order.findOne({
        _id: orderId,
        userId,
      }).session(session);

      if (!currentOrder) {
        throw new Error('Order not found.');
      }

      /*
       * ----------------------------------------------------------
       * STEP 5: PREVENT DUPLICATE CANCELLATION
       * ----------------------------------------------------------
       */

      if (currentOrder.orderStatus === 'CANCELLED') {
        throw new Error('Order is already cancelled.');
      }

      /*
       * ----------------------------------------------------------
       * STEP 6: VALIDATE CANCELLATION WINDOW
       * ----------------------------------------------------------
       */

      if (
        !['PLACED', 'CONFIRMED', 'PROCESSING'].includes(
          currentOrder.orderStatus,
        )
      ) {
        throw new Error(
          `Order cannot be cancelled after it reaches ${currentOrder.orderStatus}.`,
        );
      }

      /*
       * ----------------------------------------------------------
       * STEP 7: DETECT PAID ONLINE ORDER
       * ----------------------------------------------------------
       */

      const currentIsPaidOnline =
        currentOrder.paymentMethod === 'ONLINE' &&
        currentOrder.paymentProvider === 'RAZORPAY' &&
        currentOrder.paymentStatus === 'PAID';

      /*
       * ----------------------------------------------------------
       * STEP 8: ONLINE PAYMENT VALIDATION
       * ----------------------------------------------------------
       */

      if (currentIsPaidOnline) {
        /*
         * Razorpay payment ID is required to create refund later.
         */

        if (!currentOrder.razorpayPaymentId) {
          throw new Error('Razorpay payment ID is missing.');
        }

        /*
         * Refund amount is calculated from server-side order
         * total only.
         */

        refundAmountPaise = Math.round(Number(currentOrder.totalAmount) * 100);

        if (!Number.isFinite(refundAmountPaise) || refundAmountPaise <= 0) {
          throw new Error('Invalid refund amount.');
        }

        /*
         * --------------------------------------------------------
         * ALREADY REFUNDED
         * --------------------------------------------------------
         */

        if (
          currentOrder.refundStatus === 'PROCESSED' ||
          currentOrder.paymentStatus === 'REFUNDED'
        ) {
          throw new Error('This order has already been refunded.');
        }

        /*
         * --------------------------------------------------------
         * REFUND ALREADY PENDING
         * --------------------------------------------------------
         *
         * A previous cancellation/refund attempt may already be
         * in progress.
         *
         * --------------------------------------------------------
         */

        if (currentOrder.refundStatus === 'PENDING' && currentOrder.refundId) {
          throw new Error('Refund is already being processed for this order.');
        }

        /*
         * --------------------------------------------------------
         * PREPARE REFUND
         * --------------------------------------------------------
         *
         * Do NOT call Razorpay here.
         *
         * We only mark the order as refund pending.
         *
         * The actual Razorpay API call happens after MongoDB
         * transaction successfully commits.
         *
         * --------------------------------------------------------
         */

        currentOrder.refundAmount = refundAmountPaise / 100;
        currentOrder.refundStatus = 'PENDING';
        currentOrder.refundFailureReason = '';

        shouldCreateRefund = true;
      }

      /*
       * ----------------------------------------------------------
       * STEP 9: RESTORE INVENTORY
       * ----------------------------------------------------------
       */

      const inventoryEntries = [];

      for (const item of currentOrder.items) {
        const quantity = Number(item.quantity);

        /*
         * --------------------------------------------------------
         * VALIDATE QUANTITY
         * --------------------------------------------------------
         */

        if (!Number.isInteger(quantity) || quantity < 1) {
          throw new Error(`Invalid quantity for ${item.name}.`);
        }

        /*
         * ========================================================
         * STANDARD PRODUCT
         * ========================================================
         */

        if (item.productType === 'STANDARD') {
          if (!item.variantId) {
            throw new Error(
              `Inventory information is missing for ${item.name}.`,
            );
          }

          /*
           * Re-read exact product + exact variant inside
           * transaction.
           */

          const product = await Product.findOne({
            _id: item.productId,
            productType: 'STANDARD',
            standardStock: {
              $elemMatch: {
                _id: item.variantId,
                size: String(item.size),
              },
            },
          }).session(session);

          if (!product) {
            throw new Error(`Unable to restore inventory for ${item.name}.`);
          }

          const variant = product.standardStock.id(item.variantId);

          if (!variant) {
            throw new Error(`Inventory variant not found for ${item.name}.`);
          }

          const previousStock = Number(variant.stockQuantity || 0);

          const newStock = previousStock + quantity;

          variant.stockQuantity = newStock;

          await product.save({
            session,
          });

          /*
           * Inventory audit
           */

          inventoryEntries.push({
            type: 'CANCEL',
            itemType: 'STANDARD',
            productId: product._id,
            variantId: variant._id,
            size: String(item.size),
            quantity,
            previousStock,
            newStock,
            performedBy: userId,
            orderId: currentOrder._id,
            reason: 'Stock restored after customer order cancellation.',
          });

          continue;
        }

        /*
         * ========================================================
         * CUSTOMIZABLE PRODUCT
         * ========================================================
         */

        if (item.productType !== 'CUSTOMIZABLE') {
          throw new Error(`Unsupported product type for ${item.name}.`);
        }

        /*
         * Base + Strap + optional Thumb
         */

        const components = [
          {
            type: 'BASE',
            model: Base,
            data: item.base,
          },
          {
            type: 'STRAP',
            model: Strap,
            data: item.strap,
          },
          {
            type: 'THUMB',
            model: Thumb,
            data: item.thumb,
          },
        ];

        for (const component of components) {
          /*
           * Thumb is optional.
           */

          if (!component.data) {
            continue;
          }

          const { componentId, colorId, variantId } = component.data;

          /*
           * Validate immutable inventory references stored
           * inside the order snapshot.
           */

          if (!componentId || !colorId || !variantId) {
            throw new Error(
              `Inventory information is missing for ${item.name}.`,
            );
          }

          /*
           * Re-read exact component + color + variant inside
           * transaction.
           */

          const componentDoc = await component.model
            .findOne({
              _id: componentId,
              colors: {
                $elemMatch: {
                  _id: colorId,
                  variants: {
                    $elemMatch: {
                      _id: variantId,
                      size: String(item.size),
                    },
                  },
                },
              },
            })
            .session(session);

          if (!componentDoc) {
            throw new Error(
              `Unable to restore ${component.type.toLowerCase()} inventory for ${item.name}.`,
            );
          }

          const color = componentDoc.colors.id(colorId);

          const variant = color?.variants.id(variantId);

          if (!color || !variant) {
            throw new Error(
              `${component.type} inventory variant not found for ${item.name}.`,
            );
          }

          const previousStock = Number(variant.stockQuantity || 0);

          const newStock = previousStock + quantity;

          variant.stockQuantity = newStock;

          await componentDoc.save({
            session,
          });

          /*
           * Inventory audit
           */

          inventoryEntries.push({
            type: 'CANCEL',
            itemType: component.type,
            componentId: componentDoc._id,
            colorId: color._id,
            variantId: variant._id,
            size: String(item.size),
            quantity,
            previousStock,
            newStock,
            performedBy: userId,
            orderId: currentOrder._id,
            reason: 'Stock restored after customer order cancellation.',
          });
        }
      }

      /*
       * ----------------------------------------------------------
       * STEP 10: CREATE INVENTORY AUDIT RECORDS
       * ----------------------------------------------------------
       */

      if (inventoryEntries.length > 0) {
        await InventoryTransaction.create(inventoryEntries, {
          session,
          ordered: true,
        });
      }

      /*
       * ----------------------------------------------------------
       * STEP 11: FINAL STATUS RECHECK
       * ----------------------------------------------------------
       *
       * Keep this check immediately before the order mutation.
       *
       * This protects against accidental reuse of this transaction
       * logic if more cancellation states are added later.
       *
       * ----------------------------------------------------------
       */

      if (
        !['PLACED', 'CONFIRMED', 'PROCESSING'].includes(
          currentOrder.orderStatus,
        )
      ) {
        throw new Error(
          `Order cannot be cancelled because its status is ${currentOrder.orderStatus}.`,
        );
      }

      /*
       * ----------------------------------------------------------
       * STEP 12: CANCEL ORDER
       * ----------------------------------------------------------
       */

      currentOrder.orderStatus = 'CANCELLED';
      currentOrder.cancelledAt = new Date();

      /*
       * ----------------------------------------------------------
       * STEP 13: REFUND STATE
       * ----------------------------------------------------------
       *
       * IMPORTANT:
       *
       * For online payment:
       *
       * refundStatus = PENDING
       * paymentStatus = PAID
       *
       * Razorpay refund.processed webhook will later change:
       *
       * refundStatus  -> PROCESSED
       * paymentStatus -> REFUNDED
       *
       * ----------------------------------------------------------
       */

      if (currentIsPaidOnline) {
        currentOrder.refundStatus = 'PENDING';

        /*
         * NEVER set:
         *
         * currentOrder.paymentStatus = 'REFUNDED';
         *
         * here.
         */
      }

      /*
       * ----------------------------------------------------------
       * SAVE ORDER
       * ----------------------------------------------------------
       */

      await currentOrder.save({
        session,
      });

      cancelledOrder = currentOrder;
    });

    /*
     * ------------------------------------------------------------
     * STEP 14: MONGODB TRANSACTION COMMITTED
     * ------------------------------------------------------------
     *
     * At this point:
     *
     * - Inventory restored
     * - Inventory audit created
     * - Order cancelled
     * - Online refund marked PENDING
     *
     * Only NOW call Razorpay.
     *
     * ------------------------------------------------------------
     */

    let razorpayRefund = null;

    if (shouldCreateRefund) {
      /*
       * ----------------------------------------------------------
       * STEP 15: RE-READ ORDER BEFORE RAZORPAY REFUND
       * ----------------------------------------------------------
       *
       * A webhook or another process could have changed the
       * refund state after the transaction committed.
       *
       * Never blindly use the earlier transaction snapshot.
       *
       * ----------------------------------------------------------
       */

      const refundOrder = await Order.findOne({
        _id: orderId,
        userId,
      });

      if (!refundOrder) {
        return res.status(404).json({
          success: false,
          message:
            'Order was cancelled, but could not be found before refund processing.',
        });
      }

      /*
       * ----------------------------------------------------------
       * ALREADY REFUNDED
       * ----------------------------------------------------------
       */

      if (
        refundOrder.refundStatus === 'PROCESSED' ||
        refundOrder.paymentStatus === 'REFUNDED'
      ) {
        return res.status(200).json({
          success: true,
          message: 'Order cancelled and refund has already been processed.',
          data: {
            order: refundOrder,
            refund: null,
          },
        });
      }

      /*
       * ----------------------------------------------------------
       * REFUND ALREADY CREATED
       * ----------------------------------------------------------
       */

      if (refundOrder.refundStatus === 'PENDING' && refundOrder.refundId) {
        return res.status(200).json({
          success: true,
          message: 'Order cancelled and refund is currently being processed.',
          data: {
            order: refundOrder,
            refund: {
              id: refundOrder.refundId,
              amount: Math.round(Number(refundOrder.refundAmount || 0) * 100),
              currency: 'INR',
              status: 'pending',
            },
          },
        });
      }

      /*
       * ----------------------------------------------------------
       * VALIDATE PAYMENT AGAIN
       * ----------------------------------------------------------
       */

      if (
        refundOrder.paymentMethod !== 'ONLINE' ||
        refundOrder.paymentProvider !== 'RAZORPAY'
      ) {
        throw new Error('Invalid payment configuration for online refund.');
      }

      if (
        refundOrder.paymentStatus !== 'PAID' &&
        refundOrder.paymentStatus !== 'REFUNDED'
      ) {
        throw new Error(
          `Online payment cannot be refunded because its current status is ${refundOrder.paymentStatus}.`,
        );
      }

      if (!refundOrder.razorpayPaymentId) {
        throw new Error('Razorpay payment ID is missing.');
      }

      const finalRefundAmountPaise = Math.round(
        Number(refundOrder.refundAmount || refundOrder.totalAmount) * 100,
      );

      if (
        !Number.isFinite(finalRefundAmountPaise) ||
        finalRefundAmountPaise <= 0
      ) {
        throw new Error('Invalid refund amount.');
      }

      /*
       * ----------------------------------------------------------
       * STEP 16: CREATE RAZORPAY REFUND
       * ----------------------------------------------------------
       *
       * Deterministic idempotency key:
       *
       * CANCEL_<orderId>
       *
       * If the HTTP response is lost after Razorpay accepts the
       * refund, retrying with the same key will not intentionally
       * create a second refund request.
       *
       * ----------------------------------------------------------
       */

      try {
        razorpayRefund = await createRazorpayRefund({
          paymentId: refundOrder.razorpayPaymentId,
          amount: finalRefundAmountPaise,
          speed: 'normal',
          receipt: `CANCEL_${refundOrder.orderNumber}`,
          idempotencyKey: `CANCEL_${refundOrder._id}`,
          notes: {
            orderId: String(refundOrder._id),
            orderNumber: refundOrder.orderNumber,
            reason: 'Customer cancelled order',
          },
        });

        if (!razorpayRefund?.id) {
          throw new Error('Razorpay did not return a refund ID.');
        }
      } catch (refundError) {
        /*
         * --------------------------------------------------------
         * STEP 17: REFUND CREATION FAILED
         * --------------------------------------------------------
         *
         * IMPORTANT:
         *
         * The order is ALREADY cancelled and inventory is ALREADY
         * restored.
         *
         * Therefore we must NOT rollback the cancellation.
         *
         * Mark refund FAILED so it can be retried/reconciled.
         *
         * --------------------------------------------------------
         */

        console.error(
          'Customer cancellation Razorpay refund error:',
          refundError,
        );

        await Order.updateOne(
          {
            _id: orderId,
            userId,
            orderStatus: 'CANCELLED',
            refundStatus: 'PENDING',
          },
          {
            $set: {
              refundStatus: 'FAILED',
              refundFailureReason:
                refundError?.message || 'Unable to create Razorpay refund.',
            },
          },
        );

        return res.status(502).json({
          success: false,
          message:
            'Order was cancelled successfully, but the Razorpay refund could not be initiated. Refund status is marked FAILED for retry.',
          data: {
            order: await Order.findOne({
              _id: orderId,
              userId,
            }),
          },
        });
      }

      /*
       * ----------------------------------------------------------
       * STEP 18: SAVE RAZORPAY REFUND ID
       * ----------------------------------------------------------
       *
       * IMPORTANT:
       *
       * Do NOT change paymentStatus to REFUNDED here.
       *
       * The refund.processed webhook is authoritative for the
       * final refund state.
       *
       * ----------------------------------------------------------
       */

      const refundUpdate = await Order.findOneAndUpdate(
        {
          _id: orderId,
          userId,
          orderStatus: 'CANCELLED',
          refundStatus: 'PENDING',
        },
        {
          $set: {
            refundId: razorpayRefund.id,
            refundAmount: Number(razorpayRefund.amount || 0) / 100,
            refundFailureReason: '',
          },
        },
        {
          new: true,
        },
      );

      /*
       * ----------------------------------------------------------
       * WEBHOOK WON THE RACE
       * ----------------------------------------------------------
       *
       * If the refund webhook already changed the state, do not
       * overwrite PROCESSED / REFUNDED with PENDING.
       * ----------------------------------------------------------
       */

      if (!refundUpdate) {
        const latestOrder = await Order.findOne({
          _id: orderId,
          userId,
        });

        if (
          latestOrder?.refundStatus === 'PROCESSED' ||
          latestOrder?.paymentStatus === 'REFUNDED'
        ) {
          return res.status(200).json({
            success: true,
            message: 'Order cancelled and refund has been processed.',
            data: {
              order: latestOrder,
              refund: null,
            },
          });
        }

        /*
         * Refund exists at Razorpay but local refund ID was not
         * saved. Do not create another refund automatically.
         */

        return res.status(409).json({
          success: false,
          message:
            'Order was cancelled and Razorpay refund was created, but the refund state could not be saved locally. Please reconcile the refund before retrying.',
          data: {
            refundId: razorpayRefund.id,
          },
        });
      }

      cancelledOrder = refundUpdate;
    }

    /*
     * ------------------------------------------------------------
     * STEP 19: FINAL ORDER
     * ------------------------------------------------------------
     */

    const finalOrder = await Order.findOne({
      _id: orderId,
      userId,
    });

    /*
     * ------------------------------------------------------------
     * STEP 20: SUCCESS RESPONSE
     * ------------------------------------------------------------
     */

    return res.status(200).json({
      success: true,
      message: shouldCreateRefund
        ? 'Order cancelled and refund initiated successfully.'
        : 'Order cancelled successfully.',
      data: {
        order: finalOrder || cancelledOrder,
        refund: shouldCreateRefund
          ? {
              id: razorpayRefund?.id || finalOrder?.refundId || null,
              amount:
                razorpayRefund?.amount ||
                Math.round(Number(finalOrder?.refundAmount || 0) * 100),
              currency: razorpayRefund?.currency || 'INR',
              status: razorpayRefund?.status || 'pending',
            }
          : null,
      },
    });
  } catch (error) {
    /*
     * ------------------------------------------------------------
     * STEP 21: ERROR HANDLING
     * ------------------------------------------------------------
     */

    console.error('Cancel order error:', error);

    const errorMessage = error?.message || '';

    /*
     * ----------------------------------------------------------
     * TRANSACTION / MONGODB ERROR
     * ----------------------------------------------------------
     */

    const transactionError =
      errorMessage.includes('Transaction numbers are only allowed') ||
      errorMessage.includes('transaction') ||
      errorMessage.includes('replica set') ||
      errorMessage.includes('NoSuchTransaction') ||
      errorMessage.includes('TransientTransactionError') ||
      errorMessage.includes('ConflictingOperationInProgress');

    return res.status(transactionError ? 503 : 400).json({
      success: false,
      message: transactionError
        ? 'MongoDB transactions are required for order cancellation. Please use MongoDB Atlas or run local MongoDB as a replica set.'
        : errorMessage || 'Unable to cancel order.',
    });
  } finally {
    await session.endSession();
  }
};

/**
 * ============================================================
 * GET ALL ORDERS - ADMIN
 * ============================================================
 *
 * GET /api/orders/admin/all
 *
 * Only ADMIN / SUPER_ADMIN can access this endpoint.
 *
 * ============================================================
 */

export const getAllOrdersController = async (req, res) => {
  try {
    /**
     * ==========================================================
     * FETCH ALL ORDERS
     * ==========================================================
     */

    const orders = await Order.find({})
      .populate('userId', 'name email phone')
      .sort({
        createdAt: -1,
      })
      .lean();

    /**
     * ==========================================================
     * SUCCESS
     * ==========================================================
     */

    return res.status(200).json({
      success: true,

      data: {
        orders,
      },
    });
  } catch (error) {
    console.error('Get all orders error:', error);

    return res.status(500).json({
      success: false,
      message: 'Unable to fetch orders.',
    });
  }
};

/**
 * ============================================================
 * ORDER STATUS TRANSITIONS
 * ============================================================
 *
 * PLACED
 *   ↓
 * CONFIRMED
 *   ↓
 * PROCESSING
 *   ↓
 * SHIPPED
 *   ↓
 * DELIVERED
 *
 * Cancellation:
 * PLACED     → CANCELLED
 * CONFIRMED  → CANCELLED
 * PROCESSING → CANCELLED
 *
 * SHIPPED / DELIVERED cannot be cancelled.
 * CANCELLED cannot be changed.
 */

export const updateOrderShippingController = async (req, res) => {
  try {
    const { orderId } = req.params;
    const { courierName, trackingNumber, trackingUrl } = req.body || {};

    if (!orderId || !mongoose.Types.ObjectId.isValid(orderId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid order ID.',
      });
    }

    const order = await Order.findById(orderId);

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found.',
      });
    }

    if (order.orderStatus === 'CANCELLED') {
      return res.status(400).json({
        success: false,
        message: 'Shipping details cannot be updated for a cancelled order.',
      });
    }

    const cleanCourierName = String(courierName || '').trim();
    const cleanTrackingNumber = String(trackingNumber || '').trim();
    const cleanTrackingUrl = String(trackingUrl || '').trim();

    if (cleanCourierName.length > 100) {
      return res.status(400).json({
        success: false,
        message: 'Courier name is too long.',
      });
    }

    if (cleanTrackingNumber.length > 100) {
      return res.status(400).json({
        success: false,
        message: 'Tracking number is too long.',
      });
    }

    if (cleanTrackingUrl.length > 500) {
      return res.status(400).json({
        success: false,
        message: 'Tracking URL is too long.',
      });
    }

    if (cleanTrackingUrl) {
      let parsedUrl;

      try {
        parsedUrl = new URL(cleanTrackingUrl);
      } catch {
        return res.status(400).json({
          success: false,
          message: 'Tracking URL must be a valid URL.',
        });
      }

      if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
        return res.status(400).json({
          success: false,
          message: 'Tracking URL must start with http:// or https://.',
        });
      }
    }

    order.shipping = {
      courierName: cleanCourierName,
      trackingNumber: cleanTrackingNumber,
      trackingUrl: cleanTrackingUrl,
      shippedAt:
        order.shipping?.shippedAt ||
        (order.orderStatus === 'SHIPPED' ? new Date() : null),
    };

    await order.save();

    return res.status(200).json({
      success: true,
      message: 'Shipping details updated successfully.',
      data: {
        order,
      },
    });
  } catch (error) {
    console.error('Update order shipping error:', error);

    return res.status(500).json({
      success: false,
      message: 'Unable to update shipping details.',
    });
  }
};

const allowedStatusTransitions = {
  PLACED: ['CONFIRMED', 'CANCELLED'],

  CONFIRMED: ['PROCESSING', 'CANCELLED'],

  PROCESSING: ['SHIPPED', 'CANCELLED'],

  SHIPPED: ['DELIVERED'],

  DELIVERED: [],

  CANCELLED: [],
};

/**
 * ============================================================
 * UPDATE ORDER STATUS - ADMIN
 * ============================================================
 *
 * PATCH /api/orders/admin/:orderId/status
 *
 * Body:
 * {
 *   "status": "CONFIRMED"
 * }
 *
 * ============================================================
 */

export const updateOrderStatusController = async (req, res) => {
  try {
    const { orderId } = req.params;
    const { status } = req.body;

    /**
     * ==========================================================
     * VALIDATE ORDER ID
     * ==========================================================
     */

    if (!orderId || !mongoose.Types.ObjectId.isValid(orderId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid order ID.',
      });
    }

    /**
     * ==========================================================
     * VALIDATE STATUS
     * ==========================================================
     *
     * Keep these values synchronized with the
     * orderStatus enum in your Order model.
     *
     * ==========================================================
     */

    const allowedStatuses = [
      'PLACED',
      'CONFIRMED',
      'PROCESSING',
      'SHIPPED',
      'DELIVERED',
      'CANCELLED',
    ];

    if (!status || !allowedStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid order status.',
      });
    }

    /**
     * ==========================================================
     * FIND ORDER
     * ==========================================================
     */

    const order = await Order.findById(orderId);

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found.',
      });
    }

    /**
     * ==========================================================
     * PREVENT UNNECESSARY UPDATE
     * ==========================================================
     */

    if (order.orderStatus === status) {
      return res.status(200).json({
        success: true,
        message: 'Order status is already set to this value.',
        data: {
          order,
        },
      });
    }

    /**
     * ==========================================================
     * VALIDATE STATUS TRANSITION
     * ==========================================================
     */

    const allowedNextStatuses =
      allowedStatusTransitions[order.orderStatus] || [];

    if (!allowedNextStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: `Cannot change order status from ${order.orderStatus} to ${status}.`,
      });
    }

    /**
     * ==========================================================
     * UPDATE STATUS
     * ==========================================================
     */

    order.orderStatus = status;

    // Store the exact delivery time.
    // This becomes the starting point for the return window.

    if (status === 'SHIPPED') {
      order.shipping = {
        ...(order.shipping?.toObject?.() || order.shipping || {}),
        shippedAt: order.shipping?.shippedAt || new Date(),
      };
    }

    if (status === 'DELIVERED') {
      order.deliveredAt = new Date();
    }

    await order.save();

    /**
     * ==========================================================
     * SUCCESS
     * ==========================================================
     */

    return res.status(200).json({
      success: true,

      message: 'Order status updated successfully.',

      data: {
        order,
      },
    });
  } catch (error) {
    console.error('Update order status error:', error);

    return res.status(500).json({
      success: false,
      message: 'Unable to update order status.',
    });
  }
};

/**
 * ============================================================
 * MARK COD PAYMENT AS PAID - ADMIN
 * ============================================================
 *
 * PATCH /api/orders/admin/:orderId/cod-paid
 *
 * Rules:
 * - Only COD orders
 * - Payment must currently be PENDING
 * - Order must be DELIVERED
 * - Only ADMIN / SUPER_ADMIN can access
 *
 * ============================================================
 */

export const markCodPaymentAsPaidController = async (req, res) => {
  try {
    const { orderId } = req.params;

    /**
     * ==========================================================
     * VALIDATE ORDER ID
     * ==========================================================
     */

    if (!orderId || !mongoose.Types.ObjectId.isValid(orderId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid order ID.',
      });
    }

    /**
     * ==========================================================
     * ATOMIC UPDATE
     * ==========================================================
     *
     * The conditions below make the operation idempotent and
     * prevent accidentally marking an ONLINE order as COD paid.
     *
     * ==========================================================
     */

    const updatedOrder = await Order.findOneAndUpdate(
      {
        _id: orderId,
        paymentMethod: 'COD',
        paymentStatus: 'PENDING',
        orderStatus: 'DELIVERED',
      },
      {
        $set: {
          paymentStatus: 'PAID',
          paymentPaidAt: new Date(),
        },
      },
      {
        new: true,
        runValidators: true,
      },
    );

    /**
     * ==========================================================
     * ORDER NOT ELIGIBLE
     * ==========================================================
     */

    if (!updatedOrder) {
      const order = await Order.findById(orderId).select(
        'orderNumber paymentMethod paymentStatus orderStatus',
      );

      if (!order) {
        return res.status(404).json({
          success: false,
          message: 'Order not found.',
        });
      }

      if (order.paymentMethod !== 'COD') {
        return res.status(400).json({
          success: false,
          message: 'Only COD orders can be marked as paid.',
        });
      }

      if (order.paymentStatus === 'PAID') {
        return res.status(400).json({
          success: false,
          message: 'COD payment is already marked as paid.',
        });
      }

      if (order.orderStatus !== 'DELIVERED') {
        return res.status(400).json({
          success: false,
          message: 'COD payment can only be marked as paid after delivery.',
        });
      }

      return res.status(400).json({
        success: false,
        message: 'COD payment cannot be marked as paid.',
      });
    }

    /**
     * ==========================================================
     * SUCCESS
     * ==========================================================
     */

    console.log(
      `COD payment marked as PAID: ${updatedOrder.orderNumber} by ${req.userId}`,
    );

    return res.status(200).json({
      success: true,
      message: 'COD payment marked as paid successfully.',
      data: {
        order: updatedOrder,
      },
    });
  } catch (error) {
    console.error('Mark COD payment as paid error:', error);

    return res.status(500).json({
      success: false,
      message: 'Unable to mark COD payment as paid.',
    });
  }
};

/**
 * ============================================================
 * REFUND RAZORPAY ORDER
 * ============================================================
 *
 * POST /api/orders/admin/:orderId/refund
 *
 * Only ADMIN / SUPER_ADMIN can access this endpoint.
 *
 * This currently supports FULL REFUND only.
 *
 * Flow:
 * 1. Validate order ID
 * 2. Find order
 * 3. Verify Razorpay payment
 * 4. Verify payment is PAID
 * 5. Verify refund has not already been created
 * 6. Create Razorpay refund
 * 7. Save refund ID
 * 8. Mark payment as REFUNDED
 *
 * ============================================================
 */

export const refundRazorpayOrderController = async (req, res) => {
  const session = await mongoose.startSession();

  try {
    const { orderId } = req.params;
    const { amount, reason = '' } = req.body || {};

    /**
     * ==========================================================
     * 1. VALIDATE ORDER ID
     * ==========================================================
     */
    if (!orderId || !mongoose.Types.ObjectId.isValid(orderId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid order ID.',
      });
    }

    /**
     * ==========================================================
     * 2. VALIDATE REFUND IDEMPOTENCY KEY
     * ==========================================================
     *
     * One refund request = one unique key.
     *
     * Reusing the same key returns the same local refund record
     * instead of creating another refund.
     */
    const rawIdempotencyKey =
      req.get('Idempotency-Key') || req.get('X-Idempotency-Key');

    const idempotencyKey = rawIdempotencyKey?.trim();

    if (!idempotencyKey || idempotencyKey.length < 10) {
      return res.status(400).json({
        success: false,
        message: 'Valid Idempotency-Key header is required.',
      });
    }

    /**
     * ==========================================================
     * 3. CHECK EXISTING IDEMPOTENCY RECORD
     * ==========================================================
     */
    const existingRefund = await Refund.findOne({
      idempotencyKey,
    });

    if (existingRefund) {
      if (existingRefund.status === 'PROCESSED') {
        return res.status(200).json({
          success: true,
          message: 'Refund already processed for this idempotency key.',
          data: {
            refund: existingRefund,
          },
        });
      }

      if (existingRefund.status === 'PENDING') {
        return res.status(409).json({
          success: false,
          message:
            'A refund request with this idempotency key is already pending.',
          data: {
            refund: existingRefund,
          },
        });
      }

      if (existingRefund.status === 'FAILED') {
        return res.status(409).json({
          success: false,
          message:
            'This refund request has already failed. Use a new Idempotency-Key to retry.',
          data: {
            refund: existingRefund,
          },
        });
      }
    }

    /**
     * ==========================================================
     * 4. FIND ORDER
     * ==========================================================
     */
    const order = await Order.findById(orderId);

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found.',
      });
    }

    /**
     * ==========================================================
     * 5. VERIFY PAYMENT METHOD
     * ==========================================================
     */
    if (order.paymentMethod !== 'ONLINE') {
      return res.status(400).json({
        success: false,
        message: 'Only online Razorpay orders can be refunded.',
      });
    }

    /**
     * ==========================================================
     * 6. VERIFY PAYMENT PROVIDER
     * ==========================================================
     */
    if (order.paymentProvider !== 'RAZORPAY') {
      return res.status(400).json({
        success: false,
        message: 'This order was not paid through Razorpay.',
      });
    }

    /**
     * ==========================================================
     * 7. VERIFY PAYMENT STATUS
     * ==========================================================
     *
     * PARTIAL refunds keep paymentStatus = PAID.
     *
     * Therefore we only reject states that cannot be refunded.
     */
    if (order.paymentStatus !== 'PAID') {
      return res.status(400).json({
        success: false,
        message: `Order payment status is ${order.paymentStatus}. Only PAID orders can be refunded.`,
      });
    }

    /**
     * ==========================================================
     * 8. VERIFY RAZORPAY PAYMENT ID
     * ==========================================================
     */
    if (!order.razorpayPaymentId) {
      return res.status(400).json({
        success: false,
        message: 'Razorpay payment ID is missing.',
      });
    }

    /**
     * ==========================================================
     * 9. VALIDATE REQUESTED AMOUNT
     * ==========================================================
     *
     * amount is received in RUPEES from our API.
     *
     * Example:
     *
     * 500     -> 50000 paise
     * 968.82  -> 96882 paise
     *
     * If amount is omitted, refund the complete remaining
     * refundable amount.
     */
    let requestedAmountPaise = null;

    if (amount !== undefined && amount !== null && amount !== '') {
      const amountString = String(amount).trim();

      /**
       * INR supports 2 decimal places.
       *
       * Valid:
       * 100
       * 100.5
       * 100.50
       *
       * Invalid:
       * 100.001
       * 1e3
       * abc
       * -100
       */
      if (!/^\d+(\.\d{1,2})?$/.test(amountString)) {
        return res.status(400).json({
          success: false,
          message:
            'Refund amount must be a valid INR amount with up to 2 decimal places.',
        });
      }

      const requestedAmount = Number(amountString);

      if (!Number.isFinite(requestedAmount) || requestedAmount <= 0) {
        return res.status(400).json({
          success: false,
          message: 'Refund amount must be greater than zero.',
        });
      }

      requestedAmountPaise = Math.round(requestedAmount * 100);

      if (requestedAmountPaise <= 0) {
        return res.status(400).json({
          success: false,
          message: 'Invalid refund amount.',
        });
      }
    }

    /**
     * ==========================================================
     * 10. RESERVE REFUND AMOUNT LOCALLY
     * ==========================================================
     *
     * IMPORTANT:
     *
     * Pending refunds are included in the reserved amount.
     *
     * Example:
     *
     * Order total       ₹1768.82
     * Refund #1 pending ₹500
     *
     * Remaining available:
     * ₹1268.82
     *
     * This prevents another refund request from using the same
     * amount while the first refund is still pending.
     */
    let refundRecord;
    let refundAmountPaise;
    let remainingAfterReservationPaise;

    await session.withTransaction(async () => {
      const lockedOrder = await Order.findById(orderId).session(session);

      if (!lockedOrder) {
        throw new Error('ORDER_NOT_FOUND');
      }

      if (lockedOrder.paymentStatus !== 'PAID') {
        throw new Error(`ORDER_PAYMENT_STATUS_${lockedOrder.paymentStatus}`);
      }

      /**
       * --------------------------------------------------------
       * Calculate captured order amount in paise
       * --------------------------------------------------------
       */
      const totalAmountPaise = Math.round(
        Number(lockedOrder.totalAmount) * 100,
      );

      if (!Number.isFinite(totalAmountPaise) || totalAmountPaise <= 0) {
        throw new Error('INVALID_ORDER_AMOUNT');
      }

      /**
       * --------------------------------------------------------
       * Read all local refunds
       * --------------------------------------------------------
       *
       * PENDING + PROCESSED both consume refundable capacity.
       *
       * FAILED refunds do not consume capacity.
       */
      const refundTotals = await Refund.aggregate([
        {
          $match: {
            orderId: lockedOrder._id,
            status: {
              $in: ['PENDING', 'PROCESSED'],
            },
          },
        },
        {
          $group: {
            _id: null,
            totalPaise: {
              $sum: {
                $round: [
                  {
                    $multiply: ['$amount', 100],
                  },
                  0,
                ],
              },
            },
          },
        },
      ]).session(session);

      let reservedRefundedPaise = Number(refundTotals?.[0]?.totalPaise) || 0;

      /**
       * --------------------------------------------------------
       * Backward compatibility with legacy refund fields
       * --------------------------------------------------------
       *
       * Existing old refunds may exist only on Order.
       *
       * We only use the legacy amount when there are no ledger
       * refunds yet.
       */
      if (
        reservedRefundedPaise === 0 &&
        lockedOrder.refundId &&
        Number(lockedOrder.refundAmount) > 0
      ) {
        reservedRefundedPaise = Math.round(
          Number(lockedOrder.refundAmount) * 100,
        );
      }

      const currentRemainingPaise = Math.max(
        totalAmountPaise - reservedRefundedPaise,
        0,
      );

      /**
       * --------------------------------------------------------
       * Determine this refund amount
       * --------------------------------------------------------
       */
      refundAmountPaise = requestedAmountPaise ?? currentRemainingPaise;

      if (!Number.isFinite(refundAmountPaise) || refundAmountPaise <= 0) {
        throw new Error('NO_REFUNDABLE_AMOUNT');
      }

      /**
       * --------------------------------------------------------
       * Prevent over-refund
       * --------------------------------------------------------
       */
      if (refundAmountPaise > currentRemainingPaise) {
        const remainingAmount = currentRemainingPaise / 100;

        const error = new Error('REFUND_AMOUNT_EXCEEDS_REMAINING');
        error.remainingAmount = remainingAmount;

        throw error;
      }

      /**
       * --------------------------------------------------------
       * Calculate remaining amount after this reservation
       * --------------------------------------------------------
       */
      remainingAfterReservationPaise =
        currentRemainingPaise - refundAmountPaise;

      /**
       * --------------------------------------------------------
       * Create local refund ledger entry
       * --------------------------------------------------------
       */
      const receipt = `REFUND_${lockedOrder._id}_${Date.now()}`;

      const createdRefund = await Refund.create(
        [
          {
            orderId: lockedOrder._id,
            userId: lockedOrder.userId,
            paymentId: lockedOrder.razorpayPaymentId,

            amount: refundAmountPaise / 100,

            currency: 'INR',

            status: 'PENDING',

            source: 'ADMIN',

            reason: String(reason || '').trim(),

            idempotencyKey: idempotencyKey.trim(),

            razorpayReceipt: receipt,

            requestedAt: new Date(),
          },
        ],
        { session },
      );

      refundRecord = createdRefund[0];

      /**
       * --------------------------------------------------------
       * Update Order summary
       * --------------------------------------------------------
       *
       * totalRefundedAmount represents completed refunds only.
       *
       * remainingRefundableAmount includes this pending
       * reservation.
       */
      lockedOrder.totalRefundedAmount = Math.max(
        Number(lockedOrder.totalRefundedAmount) || 0,
        reservedRefundedPaise / 100,
      );

      lockedOrder.remainingRefundableAmount =
        remainingAfterReservationPaise / 100;

      lockedOrder.refundStatus = 'PENDING';

      /**
       * Keep legacy fields updated for existing admin/order
       * screens until those screens are migrated to Refund ledger.
       */
      lockedOrder.refundAmount = refundAmountPaise / 100;

      await lockedOrder.save({ session });
    });

    /**
     * ==========================================================
     * 11. CREATE RAZORPAY REFUND
     * ==========================================================
     *
     * MongoDB reservation is already committed.
     *
     * We deliberately call Razorpay AFTER the transaction.
     */
    const refund = await createRazorpayRefund({
      paymentId: order.razorpayPaymentId,

      amount: refundAmountPaise,

      speed: 'normal',

      receipt: refundRecord.razorpayReceipt,

      idempotencyKey: idempotencyKey.trim(),

      notes: {
        orderId: String(order._id),
        orderNumber: order.orderNumber,
        refundId: String(refundRecord._id),
      },
    });

    /**
     * ==========================================================
     * 12. VALIDATE RAZORPAY RESPONSE
     * ==========================================================
     */
    if (!refund?.id) {
      throw new Error('Razorpay did not return a refund ID.');
    }

    /**
     * ==========================================================
     * 13. SAVE RAZORPAY REFUND ID
     * ==========================================================
     */
    refundRecord.razorpayRefundId = refund.id;

    /**
     * Razorpay can return pending or processed.
     *
     * We keep our local record PENDING until the webhook
     * confirms the final state.
     */
    refundRecord.status = 'PENDING';

    await refundRecord.save();

    /**
     * Keep legacy Order fields synchronized.
     */
    await Order.updateOne(
      { _id: order._id },
      {
        $set: {
          refundId: refund.id,
          refundAmount: refundRecord.amount,
          refundStatus: 'PENDING',
          refundFailureReason: '',
        },
      },
    );

    /**
     * ==========================================================
     * 14. SUCCESS
     * ==========================================================
     */
    return res.status(200).json({
      success: true,

      message: 'Refund initiated successfully.',

      data: {
        refund: {
          id: refund.id,

          localRefundId: refundRecord._id,

          orderId: order._id,

          paymentId: refund.payment_id,

          amount: refund.amount,

          currency: refund.currency,

          status: refund.status,

          speed: refund.speed_requested || 'normal',

          requestedAmount: refundRecord.amount,

          remainingRefundableAmount: remainingAfterReservationPaise / 100,
        },
      },
    });
  } catch (error) {
    console.error('RAZORPAY REFUND ERROR:', error);

    /**
     * ==========================================================
     * HANDLE IDEMPOTENCY RACE
     * ==========================================================
     *
     * Two requests with the same Idempotency-Key can pass the
     * initial findOne() before either request creates the Refund.
     *
     * MongoDB's unique index is the final protection.
     * If it rejects the second insert, return the existing
     * refund record instead of returning a generic 500.
     */
    if (error?.code === 11000) {
      const duplicateRefund = await Refund.findOne({
        idempotencyKey,
      });

      if (duplicateRefund) {
        if (duplicateRefund.status === 'PROCESSED') {
          return res.status(200).json({
            success: true,
            message: 'Refund already processed for this idempotency key.',
            data: {
              refund: duplicateRefund,
            },
          });
        }

        if (duplicateRefund.status === 'PENDING') {
          return res.status(409).json({
            success: false,
            message:
              'A refund request with this idempotency key is already pending.',
            data: {
              refund: duplicateRefund,
            },
          });
        }

        if (duplicateRefund.status === 'FAILED') {
          return res.status(409).json({
            success: false,
            message:
              'This refund request has already failed. Use a new Idempotency-Key to retry.',
            data: {
              refund: duplicateRefund,
            },
          });
        }
      }
    }

    /**
     * ==========================================================
     * Handle known validation errors
     * ==========================================================
     */
    if (error?.message === 'ORDER_NOT_FOUND') {
      return res.status(404).json({
        success: false,
        message: 'Order not found.',
      });
    }

    if (error?.message?.startsWith('ORDER_PAYMENT_STATUS_')) {
      return res.status(400).json({
        success: false,
        message: `Order payment status is ${error.message.replace(
          'ORDER_PAYMENT_STATUS_',
          '',
        )}. Only PAID orders can be refunded.`,
      });
    }

    if (error?.message === 'INVALID_ORDER_AMOUNT') {
      return res.status(400).json({
        success: false,
        message: 'Invalid order amount.',
      });
    }

    if (error?.message === 'NO_REFUNDABLE_AMOUNT') {
      return res.status(400).json({
        success: false,
        message: 'No refundable amount remains for this order.',
      });
    }

    if (error?.message === 'REFUND_AMOUNT_EXCEEDS_REMAINING') {
      return res.status(400).json({
        success: false,
        message: 'Refund amount exceeds the remaining refundable amount.',
        data: {
          remainingRefundableAmount: error.remainingAmount,
        },
      });
    }

    /**
     * ==========================================================
     * IMPORTANT:
     * If Razorpay fails after our local reservation,
     * we keep the Refund record PENDING for now.
     *
     * The next reconciliation/webhook hardening step will
     * handle uncertain external outcomes.
     *
     * For a definite Razorpay API rejection, mark it FAILED.
     * ==========================================================
     */
    if (error?.razorpay) {
      const existingPendingRefund = await Refund.findOne({
        idempotencyKey:
          req.get('Idempotency-Key') || req.get('X-Idempotency-Key'),
        status: 'PENDING',
      });

      if (existingPendingRefund) {
        existingPendingRefund.status = 'FAILED';

        existingPendingRefund.failureReason =
          error?.error?.description ||
          error?.error?.reason ||
          error?.message ||
          'Razorpay refund failed.';

        existingPendingRefund.failedAt = new Date();

        await existingPendingRefund.save();

        /**
         * ----------------------------------------------------------
         * Recalculate refund totals.
         *
         * FAILED refunds do not consume refundable capacity.
         * ----------------------------------------------------------
         */
        const orderForRecalculation = await Order.findById(
          existingPendingRefund.orderId,
        );

        if (orderForRecalculation) {
          const refundTotals = await Refund.aggregate([
            {
              $match: {
                orderId: orderForRecalculation._id,
                status: {
                  $in: ['PENDING', 'PROCESSED'],
                },
              },
            },
            {
              $group: {
                _id: null,

                reservedPaise: {
                  $sum: {
                    $round: [
                      {
                        $multiply: ['$amount', 100],
                      },
                      0,
                    ],
                  },
                },

                processedPaise: {
                  $sum: {
                    $cond: [
                      {
                        $eq: ['$status', 'PROCESSED'],
                      },
                      {
                        $round: [
                          {
                            $multiply: ['$amount', 100],
                          },
                          0,
                        ],
                      },
                      0,
                    ],
                  },
                },
              },
            },
          ]);

          const reservedPaise = Number(refundTotals?.[0]?.reservedPaise) || 0;

          const processedPaise = Number(refundTotals?.[0]?.processedPaise) || 0;

          const totalAmountPaise = Math.round(
            Number(orderForRecalculation.totalAmount) * 100,
          );

          const remainingPaise = Math.max(totalAmountPaise - reservedPaise, 0);

          let refundStatus = 'NONE';

          if (processedPaise >= totalAmountPaise && totalAmountPaise > 0) {
            refundStatus = 'PROCESSED';
          } else if (processedPaise > 0) {
            refundStatus = 'PARTIAL';
          } else if (reservedPaise > 0) {
            refundStatus = 'PENDING';
          } else {
            refundStatus = 'FAILED';
          }

          await Order.updateOne(
            {
              _id: orderForRecalculation._id,
            },
            {
              $set: {
                totalRefundedAmount: processedPaise / 100,

                remainingRefundableAmount: remainingPaise / 100,

                refundStatus,

                refundFailureReason: existingPendingRefund.failureReason,

                refundAmount: existingPendingRefund.amount,
              },
            },
          );
        }
      }
    }

    return res.status(error?.razorpay?.statusCode || 500).json({
      success: false,
      message:
        error?.error?.description ||
        error?.error?.reason ||
        error?.message ||
        'Unable to process refund.',
    });
  } finally {
    await session.endSession();
  }
};

/**
 * ============================================================
 * REQUEST ORDER RETURN
 * ============================================================
 *
 * POST /api/orders/:orderId/return
 *
 * Customer can request a return only for:
 * - Their own order
 * - Delivered order
 * - No existing return request
 *
 * ============================================================
 */

export const requestOrderReturnController = async (req, res) => {
  try {
    const { orderId } = req.params;
    const { items, reason, comment = '' } = req.body;

    // --------------------------------------------------
    // 1. Validate Order ID
    // --------------------------------------------------
    if (!orderId || !mongoose.Types.ObjectId.isValid(orderId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid order ID.',
      });
    }

    // --------------------------------------------------
    // 2. Allowed Return Reasons
    // --------------------------------------------------
    const allowedReasons = [
      'WRONG_PRODUCT',
      'DAMAGED_PRODUCT',
      'DEFECTIVE_PRODUCT',
      'SIZE_ISSUE',
      'QUALITY_ISSUE',
      'OTHER',
    ];

    // --------------------------------------------------
    // 3. Validate Top-Level Reason
    // --------------------------------------------------
    if (!reason || !allowedReasons.includes(reason)) {
      return res.status(400).json({
        success: false,
        message: 'Please provide a valid return reason.',
      });
    }

    // --------------------------------------------------
    // 4. Validate Comment
    // --------------------------------------------------
    if (typeof comment !== 'string') {
      return res.status(400).json({
        success: false,
        message: 'Return comment must be a string.',
      });
    }

    if (comment.length > 500) {
      return res.status(400).json({
        success: false,
        message: 'Return comment cannot exceed 500 characters.',
      });
    }

    // --------------------------------------------------
    // 5. Validate Return Items
    // --------------------------------------------------
    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Please select at least one item for return.',
      });
    }

    // --------------------------------------------------
    // 6. Find Order Owned By Logged-In User
    // --------------------------------------------------
    const order = await Order.findOne({
      _id: orderId,
      userId: req.user._id,
    });

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found.',
      });
    }

    // --------------------------------------------------
    // 7. Only Delivered Orders Can Be Returned
    // --------------------------------------------------
    if (order.orderStatus !== 'DELIVERED') {
      return res.status(400).json({
        success: false,
        message: 'Only delivered orders can be returned.',
      });
    }

    // --------------------------------------------------
    // 8. Delivery Date Required
    // --------------------------------------------------
    if (!order.deliveredAt) {
      return res.status(400).json({
        success: false,
        message:
          'Delivery date is not available for this order. Please contact support.',
      });
    }

    // --------------------------------------------------
    // 9. Seven-Day Return Window
    // --------------------------------------------------
    const RETURN_WINDOW_DAYS = 7;

    const deliveredAt = new Date(order.deliveredAt);

    const returnDeadline = new Date(deliveredAt);
    returnDeadline.setDate(returnDeadline.getDate() + RETURN_WINDOW_DAYS);

    const now = new Date();

    if (now > returnDeadline) {
      return res.status(400).json({
        success: false,
        message: 'The 7-day return window has expired.',
        data: {
          deliveredAt,
          returnDeadline,
        },
      });
    }

    // --------------------------------------------------
    // 10. Prevent Duplicate Return Request
    // --------------------------------------------------
    if (order.returnStatus !== 'NONE') {
      return res.status(400).json({
        success: false,
        message: `Return request already exists with status ${order.returnStatus}.`,
      });
    }

    // --------------------------------------------------
    // 11. Validate Return Items
    // --------------------------------------------------
    const returnItems = [];
    const selectedOrderItemIds = new Set();

    for (const item of items) {
      if (!item || typeof item !== 'object') {
        return res.status(400).json({
          success: false,
          message: 'Invalid return item.',
        });
      }

      const {
        orderItemId,
        quantity,
        reason: itemReason,
        comment: itemComment = '',
      } = item;

      // ----------------------------------------------
      // Validate orderItemId
      // ----------------------------------------------
      if (!orderItemId || !mongoose.Types.ObjectId.isValid(orderItemId)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid order item ID.',
        });
      }

      // ----------------------------------------------
      // Prevent Duplicate Item IDs
      // ----------------------------------------------
      const orderItemKey = String(orderItemId);

      if (selectedOrderItemIds.has(orderItemKey)) {
        return res.status(400).json({
          success: false,
          message: 'Duplicate order item found in return request.',
        });
      }

      selectedOrderItemIds.add(orderItemKey);

      // ----------------------------------------------
      // Validate Quantity
      // ----------------------------------------------
      if (!Number.isInteger(quantity) || quantity < 1) {
        return res.status(400).json({
          success: false,
          message: 'Return quantity must be a positive integer.',
        });
      }

      // ----------------------------------------------
      // Find Original Order Item
      // ----------------------------------------------
      const orderItem = order.items.find(
        (orderItem) => String(orderItem._id) === orderItemKey,
      );

      if (!orderItem) {
        return res.status(400).json({
          success: false,
          message: 'One or more selected order items were not found.',
        });
      }

      // ----------------------------------------------
      // Prevent Returning More Than Ordered
      // ----------------------------------------------
      if (quantity > orderItem.quantity) {
        return res.status(400).json({
          success: false,
          message: `Return quantity cannot exceed ordered quantity for ${orderItem.name}.`,
        });
      }

      // ----------------------------------------------
      // Validate Item-Level Reason
      // ----------------------------------------------
      let normalizedItemReason = itemReason || reason;

      if (!allowedReasons.includes(normalizedItemReason)) {
        return res.status(400).json({
          success: false,
          message: `Invalid return reason for ${orderItem.name}.`,
        });
      }

      // ----------------------------------------------
      // Validate Item-Level Comment
      // ----------------------------------------------
      if (typeof itemComment !== 'string') {
        return res.status(400).json({
          success: false,
          message: `Return comment for ${orderItem.name} must be a string.`,
        });
      }

      if (itemComment.length > 500) {
        return res.status(400).json({
          success: false,
          message: `Return comment for ${orderItem.name} cannot exceed 500 characters.`,
        });
      }

      // ----------------------------------------------
      // Store Validated Return Item
      // ----------------------------------------------
      returnItems.push({
        orderItemId: orderItem._id,
        quantity,
        reason: normalizedItemReason,
        comment: itemComment.trim(),
      });
    }

    // --------------------------------------------------
    // 12. Calculate Return Type SERVER-SIDE
    // --------------------------------------------------
    //
    // FULL:
    // Every order item is selected AND the complete
    // quantity of every item is being returned.
    //
    // PARTIAL:
    // Anything less than the complete order.
    // --------------------------------------------------

    const isFullReturn =
      returnItems.length === order.items.length &&
      returnItems.every((returnItem) => {
        const orderItem = order.items.find(
          (item) => String(item._id) === String(returnItem.orderItemId),
        );

        return orderItem && returnItem.quantity === orderItem.quantity;
      });

    const returnType = isFullReturn ? 'FULL' : 'PARTIAL';

    // --------------------------------------------------
    // 13. Update Order Return State
    // --------------------------------------------------
    order.returnStatus = 'REQUESTED';

    order.returnRequest = {
      returnType,
      items: returnItems,

      reason,
      comment: comment.trim(),

      requestedAt: new Date(),

      approvedAt: null,
      rejectedAt: null,
      receivedAt: null,

      condition: null,
      conditionComment: '',

      completedAt: null,
      rejectionReason: '',
    };

    // --------------------------------------------------
    // 14. Save Order
    // --------------------------------------------------
    await order.save();

    // --------------------------------------------------
    // 15. Response
    // --------------------------------------------------
    return res.status(201).json({
      success: true,
      message: 'Return request submitted successfully.',
      data: {
        returnType,
        returnStatus: order.returnStatus,
        returnRequest: order.returnRequest,
        order,
      },
    });
  } catch (error) {
    console.error('REQUEST RETURN ERROR:', error);

    // Mongoose validation errors should be treated as
    // client-side validation errors.
    if (error?.name === 'ValidationError') {
      return res.status(400).json({
        success: false,
        message: error.message,
      });
    }

    return res.status(500).json({
      success: false,
      message: error?.message || 'Unable to submit return request.',
    });
  }
};

/**
 * ============================================================
 * GET ALL RETURN REQUESTS
 * ============================================================
 *
 * GET /api/orders/admin/returns
 *
 * Only ADMIN / SUPER_ADMIN can access.
 *
 * Returns:
 * - Return type FULL / PARTIAL
 * - Returned item information
 * - Refund calculation preview
 * - Existing refund totals
 *
 * IMPORTANT:
 * This is only a PREVIEW.
 * No refund is created here.
 *
 * ============================================================
 */

export const getAllReturnRequestsController = async (req, res) => {
  try {
    const orders = await Order.find({
      returnStatus: {
        $in: ['REQUESTED', 'APPROVED', 'REJECTED', 'COMPLETED'],
      },
    })
      .populate('userId', 'name email')
      .sort({ 'returnRequest.requestedAt': -1 });

    const data = orders.map((order) => {
      const orderObject = order.toObject();

      let refundPreview = null;

      /**
       * --------------------------------------------------------
       * Calculate return refund preview
       * --------------------------------------------------------
       */
      if (
        order.returnRequest &&
        Array.isArray(order.returnRequest.items) &&
        order.returnRequest.items.length > 0
      ) {
        try {
          const calculation = calculateReturnRefund(order);

          const orderTotal = Number(order.totalAmount) || 0;

          const totalRefundedAmount = Number(order.totalRefundedAmount || 0);

          const storedRemainingRefundable = Number(
            order.remainingRefundableAmount,
          );

          const fallbackRemainingRefundable = Math.max(
            orderTotal - totalRefundedAmount,
            0,
          );

          /**
           * --------------------------------------------------------
           * Determine remaining refundable amount
           * --------------------------------------------------------
           *
           * Some older orders may have:
           *
           *   remainingRefundableAmount = 0
           *   totalRefundedAmount = 0
           *
           * even though no refund has actually consumed
           * the refundable balance.
           *
           * In that case, treat the stored zero as
           * uninitialized and calculate from the order total.
           *
           * Once a real refund reservation/refund exists,
           * the stored remaining amount remains authoritative.
           * --------------------------------------------------------
           */
          const hasActualRefundActivity =
            totalRefundedAmount > 0 ||
            order.refundStatus === 'PENDING' ||
            order.refundStatus === 'PARTIAL' ||
            order.refundStatus === 'PROCESSED';

          const remainingRefundableAmount =
            Number.isFinite(storedRemainingRefundable) &&
            storedRemainingRefundable > 0
              ? storedRemainingRefundable
              : hasActualRefundActivity
                ? Math.max(storedRemainingRefundable || 0, 0)
                : fallbackRemainingRefundable;

          refundPreview = {
            orderTotal,

            returnType:
              order.returnRequest.returnType || calculation.returnType,

            returnedSubtotal: calculation.returnedSubtotal,

            allocatedCouponDiscount: calculation.allocatedCouponDiscount,

            refundableSubtotal: calculation.refundableSubtotal,

            allocatedTax: calculation.allocatedTax,

            refundableShipping: calculation.refundableShipping,

            refundAmount: calculation.refundAmount,

            totalRefundedAmount,

            remainingRefundableAmount,

            exceedsRemaining:
              calculation.refundAmount > remainingRefundableAmount + 0.01,
          };
        } catch (error) {
          console.error(`RETURN REFUND PREVIEW ERROR ${order._id}:`, error);

          refundPreview = {
            error: error?.message || 'Unable to calculate refund preview.',
          };
        }
      }

      return {
        ...orderObject,
        refundPreview,
      };
    });

    return res.status(200).json({
      success: true,
      message: 'Return requests fetched successfully.',
      data,
    });
  } catch (error) {
    console.error('GET RETURN REQUESTS ERROR:', error);

    return res.status(500).json({
      success: false,
      message: error?.message || 'Unable to fetch return requests.',
    });
  }
};

/**
 * ============================================================
 * APPROVE ORDER RETURN
 * ============================================================
 *
 * PATCH /api/orders/admin/:orderId/return/approve
 *
 * Only ADMIN / SUPER_ADMIN can access.
 *
 * IMPORTANT:
 * - Only REQUESTED returns can be approved.
 * - No refund happens here.
 * - No inventory is restored here.
 * - Inventory/refund will happen when the returned product
 *   is actually received and the return is completed.
 *
 * ============================================================
 */

export const approveOrderReturnController = async (req, res) => {
  try {
    const { orderId } = req.params;

    // --------------------------------------------------------
    // 1. Validate order ID
    // --------------------------------------------------------

    if (!orderId || !mongoose.Types.ObjectId.isValid(orderId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid order ID.',
      });
    }

    // --------------------------------------------------------
    // 2. Find order
    // --------------------------------------------------------

    const order = await Order.findById(orderId);

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found.',
      });
    }

    // --------------------------------------------------------
    // 3. Verify return request exists
    // --------------------------------------------------------

    if (order.returnStatus !== 'REQUESTED') {
      return res.status(400).json({
        success: false,
        message: `Return cannot be approved because its current status is ${order.returnStatus}.`,
      });
    }

    if (!order.returnRequest) {
      return res.status(400).json({
        success: false,
        message: 'Return request details are missing.',
      });
    }

    // --------------------------------------------------------
    // 4. Order must still be delivered
    // --------------------------------------------------------

    if (order.orderStatus !== 'DELIVERED') {
      return res.status(400).json({
        success: false,
        message: 'Only delivered orders can have an approved return.',
      });
    }

    // --------------------------------------------------------
    // 5. Approve return
    // --------------------------------------------------------

    order.returnStatus = 'APPROVED';

    order.returnRequest.approvedAt = new Date();

    await order.save();

    // --------------------------------------------------------
    // 6. Response
    // --------------------------------------------------------

    return res.status(200).json({
      success: true,
      message: 'Return request approved successfully.',
      data: {
        order,
      },
    });
  } catch (error) {
    console.error('APPROVE RETURN ERROR:', error);

    return res.status(500).json({
      success: false,
      message: error?.message || 'Unable to approve return request.',
    });
  }
};

/**
 * ============================================================
 * REJECT ORDER RETURN
 * ============================================================
 *
 * PATCH /api/orders/admin/:orderId/return/reject
 *
 * Only ADMIN / SUPER_ADMIN can access.
 *
 * Body:
 * {
 *   "rejectionReason": "Reason for rejection"
 * }
 *
 * ============================================================
 */

export const rejectOrderReturnController = async (req, res) => {
  try {
    const { orderId } = req.params;
    const { rejectionReason = '' } = req.body;

    // --------------------------------------------------------
    // 1. Validate order ID
    // --------------------------------------------------------

    if (!orderId || !mongoose.Types.ObjectId.isValid(orderId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid order ID.',
      });
    }

    // --------------------------------------------------------
    // 2. Validate rejection reason
    // --------------------------------------------------------

    if (!rejectionReason || !rejectionReason.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Rejection reason is required.',
      });
    }

    if (rejectionReason.trim().length > 500) {
      return res.status(400).json({
        success: false,
        message: 'Rejection reason cannot exceed 500 characters.',
      });
    }

    // --------------------------------------------------------
    // 3. Find order
    // --------------------------------------------------------

    const order = await Order.findById(orderId);

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found.',
      });
    }

    // --------------------------------------------------------
    // 4. Verify return request
    // --------------------------------------------------------

    if (order.returnStatus !== 'REQUESTED') {
      return res.status(400).json({
        success: false,
        message: `Return cannot be rejected because its current status is ${order.returnStatus}.`,
      });
    }

    if (!order.returnRequest) {
      return res.status(400).json({
        success: false,
        message: 'Return request details are missing.',
      });
    }

    // --------------------------------------------------------
    // 5. Order must still be delivered
    // --------------------------------------------------------

    if (order.orderStatus !== 'DELIVERED') {
      return res.status(400).json({
        success: false,
        message: 'Only delivered orders can have a rejected return.',
      });
    }

    // --------------------------------------------------------
    // 6. Reject return
    // --------------------------------------------------------

    order.returnStatus = 'REJECTED';

    order.returnRequest.rejectedAt = new Date();

    order.returnRequest.rejectionReason = rejectionReason.trim();

    await order.save();

    // --------------------------------------------------------
    // 7. Response
    // --------------------------------------------------------

    return res.status(200).json({
      success: true,
      message: 'Return request rejected successfully.',
      data: {
        order,
      },
    });
  } catch (error) {
    console.error('REJECT RETURN ERROR:', error);

    return res.status(500).json({
      success: false,
      message: error?.message || 'Unable to reject return request.',
    });
  }
};

export const completeOrderReturnController = async (req, res) => {
  const { orderId } = req.params;
  const { condition, conditionComment = '' } = req.body;

  // ------------------------------------------------------------
  // 1. Validate order ID
  // ------------------------------------------------------------

  if (!orderId || !mongoose.Types.ObjectId.isValid(orderId)) {
    return res.status(400).json({
      success: false,
      message: 'Invalid order ID.',
    });
  }

  // ------------------------------------------------------------
  // 2. Validate return condition
  // ------------------------------------------------------------

  const allowedConditions = ['RESELLABLE', 'DAMAGED'];

  if (!allowedConditions.includes(condition)) {
    return res.status(400).json({
      success: false,
      message: 'Return condition must be RESELLABLE or DAMAGED.',
    });
  }

  if (
    typeof conditionComment !== 'string' ||
    conditionComment.trim().length > 500
  ) {
    return res.status(400).json({
      success: false,
      message: 'Condition comment must not exceed 500 characters.',
    });
  }

  if (condition === 'DAMAGED' && !conditionComment.trim()) {
    return res.status(400).json({
      success: false,
      message: 'Condition comment is required for damaged returns.',
    });
  }

  const normalizedConditionComment = conditionComment.trim();

  const session = await mongoose.startSession();

  let refund = null;
  let completedOrder = null;
  let shouldCreateRefund = false;

  try {
    // ----------------------------------------------------------
    // 3. Read order
    // ----------------------------------------------------------

    const order = await Order.findById(orderId);

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found.',
      });
    }

    // ----------------------------------------------------------
    // 4. Validate return state
    // ----------------------------------------------------------

    const isNewCompletion = order.returnStatus === 'APPROVED';

    const isRefundRetry =
      order.returnStatus === 'COMPLETED' &&
      order.paymentMethod === 'ONLINE' &&
      order.refundStatus !== 'PROCESSED' &&
      order.paymentStatus !== 'REFUNDED';

    if (!isNewCompletion && !isRefundRetry) {
      return res.status(400).json({
        success: false,
        message: `Return cannot be completed because its current status is ${order.returnStatus}.`,
      });
    }

    if (!order.returnRequest) {
      return res.status(400).json({
        success: false,
        message: 'Return request details are missing.',
      });
    }

    // ----------------------------------------------------------
    // 5. Order must be delivered
    // ----------------------------------------------------------

    if (order.orderStatus !== 'DELIVERED') {
      return res.status(400).json({
        success: false,
        message: 'Only delivered orders can be completed as returned.',
      });
    }

    // ----------------------------------------------------------
    // 6. Online payment validation
    // ----------------------------------------------------------

    if (order.paymentMethod === 'ONLINE') {
      if (order.paymentProvider !== 'RAZORPAY') {
        return res.status(400).json({
          success: false,
          message: 'Unsupported online payment provider.',
        });
      }

      if (!order.razorpayPaymentId) {
        return res.status(400).json({
          success: false,
          message: 'Razorpay payment ID is missing.',
        });
      }

      if (
        order.paymentStatus !== 'PAID' &&
        order.paymentStatus !== 'REFUNDED'
      ) {
        return res.status(400).json({
          success: false,
          message: `Online payment cannot be refunded because its current status is ${order.paymentStatus}.`,
        });
      }

      // --------------------------------------------------------
      // If refund already processed, nothing more to refund.
      // --------------------------------------------------------

      if (
        order.refundStatus === 'PROCESSED' ||
        order.paymentStatus === 'REFUNDED'
      ) {
        shouldCreateRefund = false;
      }

      // --------------------------------------------------------
      // Existing pending refund
      // Do NOT create another refund.
      // --------------------------------------------------------
      else if (order.refundStatus === 'PENDING' && order.refundId) {
        shouldCreateRefund = false;
      }

      // --------------------------------------------------------
      // New refund
      // --------------------------------------------------------
      else if (order.paymentStatus === 'PAID' && !order.refundId) {
        shouldCreateRefund = true;
      }

      // --------------------------------------------------------
      // Previous refund failed.
      //
      // We allow another attempt using a new receipt/idempotency
      // value because the previous refund reached FAILED state.
      // --------------------------------------------------------
      else if (order.refundStatus === 'FAILED') {
        shouldCreateRefund = true;
      }
    }

    // ----------------------------------------------------------
    // 7. For an already completed return, only refund retry
    // ----------------------------------------------------------

    if (!isNewCompletion) {
      if (order.paymentMethod !== 'ONLINE') {
        return res.status(400).json({
          success: false,
          message: 'This return has already been completed.',
        });
      }

      if (!shouldCreateRefund) {
        return res.status(200).json({
          success: true,
          message:
            order.refundStatus === 'PENDING'
              ? 'Return is completed and refund is currently being processed.'
              : 'Return and refund have already been completed.',
          data: {
            order,
            refund: null,
          },
        });
      }
    }

    // ----------------------------------------------------------
    // 8. Start MongoDB transaction
    //
    // IMPORTANT:
    // Razorpay is NOT called inside this transaction.
    //
    // This prevents an external Razorpay refund from being
    // created while the MongoDB transaction can still roll back.
    // ----------------------------------------------------------

    if (isNewCompletion) {
      await session.withTransaction(async () => {
        // ------------------------------------------------------
        // Re-read order inside transaction
        // ------------------------------------------------------

        const currentOrder = await Order.findById(orderId).session(session);

        if (!currentOrder) {
          throw new Error('Order not found.');
        }

        if (currentOrder.returnStatus !== 'APPROVED') {
          throw new Error(
            `Return cannot be completed because its current status is ${currentOrder.returnStatus}.`,
          );
        }

        if (!currentOrder.returnRequest) {
          throw new Error('Return request details are missing.');
        }

        if (currentOrder.orderStatus !== 'DELIVERED') {
          throw new Error(
            'Only delivered orders can be completed as returned.',
          );
        }

        const inventoryEntries = [];

        // ------------------------------------------------------
        // 9. Process ONLY requested return items
        //
        // IMPORTANT:
        // Do not restore the complete order quantity.
        // Only restore the quantity actually returned.
        // ------------------------------------------------------

        const returnItems = currentOrder.returnRequest.items || [];

        if (!returnItems.length) {
          throw new Error('Return items are missing.');
        }

        for (const returnItem of returnItems) {
          const item = currentOrder.items.id(returnItem.orderItemId);

          if (!item) {
            throw new Error('Returned order item not found.');
          }

          const quantity = Number(returnItem.quantity);

          if (!Number.isInteger(quantity) || quantity < 1) {
            throw new Error(`Invalid quantity for ${item.name}.`);
          }

          if (quantity > Number(item.quantity)) {
            throw new Error(
              `Returned quantity cannot exceed ordered quantity for ${item.name}.`,
            );
          }

          // ====================================================
          // STANDARD PRODUCT
          // ====================================================

          if (item.productType === 'STANDARD') {
            if (!item.variantId) {
              throw new Error(
                `Inventory information is missing for ${item.name}.`,
              );
            }

            const product = await Product.findOne({
              _id: item.productId,
              productType: 'STANDARD',
              standardStock: {
                $elemMatch: {
                  _id: item.variantId,
                  size: String(item.size),
                },
              },
            }).session(session);

            if (!product) {
              throw new Error(`Unable to process inventory for ${item.name}.`);
            }

            const variant = product.standardStock.id(item.variantId);

            if (!variant) {
              throw new Error(`Inventory variant not found for ${item.name}.`);
            }

            const previousStock = Number(variant.stockQuantity || 0);

            // --------------------------------------------------
            // RESELLABLE
            // --------------------------------------------------

            if (condition === 'RESELLABLE') {
              const newStock = previousStock + quantity;

              variant.stockQuantity = newStock;

              await product.save({
                session,
              });

              inventoryEntries.push({
                type: 'RETURN',
                itemType: 'STANDARD',
                productId: product._id,
                variantId: variant._id,
                size: String(item.size),
                quantity,
                previousStock,
                newStock,
                performedBy: req.userId,
                orderId: currentOrder._id,
                reason:
                  normalizedConditionComment ||
                  'Stock restored after customer return.',
              });
            }

            // --------------------------------------------------
            // DAMAGED
            // --------------------------------------------------
            else {
              inventoryEntries.push({
                type: 'DAMAGE',
                itemType: 'STANDARD',
                productId: product._id,
                variantId: variant._id,
                size: String(item.size),
                quantity,
                previousStock,
                newStock: previousStock,
                performedBy: req.userId,
                orderId: currentOrder._id,
                reason: normalizedConditionComment,
              });
            }

            continue;
          }

          // ====================================================
          // CUSTOMIZABLE PRODUCT
          // ====================================================

          if (item.productType !== 'CUSTOMIZABLE') {
            throw new Error(`Unsupported product type for ${item.name}.`);
          }

          const components = [
            {
              type: 'BASE',
              model: Base,
              data: item.base,
            },
            {
              type: 'STRAP',
              model: Strap,
              data: item.strap,
            },
            {
              type: 'THUMB',
              model: Thumb,
              data: item.thumb,
            },
          ];

          // ----------------------------------------------------
          // BASE / STRAP / THUMB
          // ----------------------------------------------------

          for (const component of components) {
            // Thumb is optional.
            if (!component.data) {
              continue;
            }

            const { componentId, colorId, variantId } = component.data;

            if (!componentId || !colorId || !variantId) {
              throw new Error(
                `Inventory information is missing for ${item.name}.`,
              );
            }

            const componentDoc = await component.model
              .findOne({
                _id: componentId,
                colors: {
                  $elemMatch: {
                    _id: colorId,
                    variants: {
                      $elemMatch: {
                        _id: variantId,
                        size: String(item.size),
                      },
                    },
                  },
                },
              })
              .session(session);

            if (!componentDoc) {
              throw new Error(
                `Unable to process ${component.type.toLowerCase()} inventory for ${item.name}.`,
              );
            }

            const color = componentDoc.colors.id(colorId);
            const variant = color?.variants.id(variantId);

            if (!color || !variant) {
              throw new Error(
                `${component.type} inventory variant not found for ${item.name}.`,
              );
            }

            const previousStock = Number(variant.stockQuantity || 0);

            // --------------------------------------------------
            // RESELLABLE
            // --------------------------------------------------

            if (condition === 'RESELLABLE') {
              const newStock = previousStock + quantity;

              variant.stockQuantity = newStock;

              await componentDoc.save({
                session,
              });

              inventoryEntries.push({
                type: 'RETURN',
                itemType: component.type,
                componentId: componentDoc._id,
                colorId: color._id,
                variantId: variant._id,
                size: String(item.size),
                quantity,
                previousStock,
                newStock,
                performedBy: req.userId,
                orderId: currentOrder._id,
                reason:
                  normalizedConditionComment ||
                  'Stock restored after customer return.',
              });
            }

            // --------------------------------------------------
            // DAMAGED
            // --------------------------------------------------
            else {
              // IMPORTANT:
              // Do NOT increase stockQuantity.
              // This item is not sellable.

              inventoryEntries.push({
                type: 'DAMAGE',
                itemType: component.type,
                componentId: componentDoc._id,
                colorId: color._id,
                variantId: variant._id,
                size: String(item.size),
                quantity,
                previousStock,
                newStock: previousStock,
                performedBy: req.userId,
                orderId: currentOrder._id,
                reason: normalizedConditionComment,
              });
            }
          }
        }

        // ------------------------------------------------------
        // 10. Create inventory audit records
        // ------------------------------------------------------

        if (inventoryEntries.length > 0) {
          await InventoryTransaction.create(inventoryEntries, {
            session,
            ordered: true,
          });
        }

        // ------------------------------------------------------
        // 11. Save return information
        // ------------------------------------------------------

        currentOrder.returnRequest.receivedAt =
          currentOrder.returnRequest.receivedAt || new Date();

        currentOrder.returnRequest.condition = condition;

        currentOrder.returnRequest.conditionComment =
          normalizedConditionComment;

        currentOrder.returnRequest.completedAt = new Date();

        currentOrder.returnStatus = 'COMPLETED';

        // ------------------------------------------------------
        // 12. Calculate exact return refund amount
        //
        // IMPORTANT:
        // For partial returns this is NOT the complete order total.
        // The calculator allocates:
        // - returned item value
        // - coupon discount
        // - tax
        //
        // Full return uses original totalAmount.
        // ------------------------------------------------------

        if (currentOrder.paymentMethod === 'ONLINE') {
          const refundCalculation = calculateReturnRefund(currentOrder);

          const refundAmount = Number(refundCalculation.refundAmount);

          if (!Number.isFinite(refundAmount) || refundAmount <= 0) {
            throw new Error('Invalid calculated refund amount.');
          }

          const currentRemainingRefundable = Number(
            currentOrder.remainingRefundableAmount,
          );

          const totalRefundedAmount = Number(
            currentOrder.totalRefundedAmount || 0,
          );

          const fallbackRemainingRefundable = Math.max(
            Number(currentOrder.totalAmount || 0) - totalRefundedAmount,
            0,
          );

          /**
           * --------------------------------------------------------
           * Determine remaining refundable amount
           * --------------------------------------------------------
           *
           * A zero remaining amount with zero actual refund activity
           * can represent an uninitialized legacy order.
           *
           * Once refund activity has actually started, the stored
           * remaining amount must be respected.
           * --------------------------------------------------------
           */
          const hasActualRefundActivity =
            totalRefundedAmount > 0 ||
            currentOrder.refundStatus === 'PENDING' ||
            currentOrder.refundStatus === 'PARTIAL' ||
            currentOrder.refundStatus === 'PROCESSED';

          const remainingRefundableAmount =
            Number.isFinite(currentRemainingRefundable) &&
            currentRemainingRefundable > 0
              ? currentRemainingRefundable
              : hasActualRefundActivity
                ? Math.max(currentRemainingRefundable || 0, 0)
                : fallbackRemainingRefundable;

          if (
            !Number.isFinite(remainingRefundableAmount) ||
            remainingRefundableAmount <= 0
          ) {
            throw new Error('No refundable amount remains for this order.');
          }

          if (refundAmount > Number(remainingRefundableAmount.toFixed(2))) {
            throw new Error(
              `Calculated refund amount ₹${refundAmount.toFixed(
                2,
              )} exceeds the remaining refundable amount ₹${remainingRefundableAmount.toFixed(
                2,
              )}.`,
            );
          }

          const refundAmountPaise = Math.round(refundAmount * 100);

          if (!Number.isInteger(refundAmountPaise) || refundAmountPaise <= 0) {
            throw new Error('Invalid refund amount in paise.');
          }

          // Save the exact amount that will be requested
          // from Razorpay.
          const reservedRemainingAmount = Math.max(
            Number((remainingRefundableAmount - refundAmount).toFixed(2)),
            0,
          );

          currentOrder.refundAmount = refundAmount;

          currentOrder.remainingRefundableAmount = reservedRemainingAmount;

          currentOrder.refundStatus = 'PENDING';

          currentOrder.refundFailureReason = '';

          // Do not set paymentStatus = REFUNDED here.
          //
          // Razorpay webhook will do that after
          // refund.processed.
        }

        await currentOrder.save({
          session,
        });

        completedOrder = currentOrder;
      });
    }

    // ----------------------------------------------------------
    // 13. Create Razorpay refund AFTER MongoDB transaction
    //
    // This avoids:
    //
    // Razorpay refund SUCCESS
    // +
    // MongoDB transaction ROLLBACK
    //
    // which would leave the system inconsistent.
    // ----------------------------------------------------------

    if (order.paymentMethod === 'ONLINE' && shouldCreateRefund) {
      // --------------------------------------------------------
      // Calculate refund from the latest completed/order data.
      //
      // For a new completion use the transaction result.
      // For a failed refund retry use the existing order.
      // --------------------------------------------------------

      const refundSourceOrder = completedOrder || order;

      const refundCalculation = calculateReturnRefund(refundSourceOrder);

      const refundAmount = Number(refundCalculation.refundAmount);

      if (!Number.isFinite(refundAmount) || refundAmount <= 0) {
        throw new Error('Invalid calculated refund amount.');
      }

      // --------------------------------------------------------
      // Determine remaining refundable amount.
      // --------------------------------------------------------

      const orderRemainingRefundable = Number(
        refundSourceOrder.remainingRefundableAmount,
      );

      const fallbackRemainingRefundable =
        Number(refundSourceOrder.totalAmount || 0) -
        Number(refundSourceOrder.totalRefundedAmount || 0);

      const remainingRefundableAmount =
        Number.isFinite(orderRemainingRefundable) &&
        orderRemainingRefundable > 0
          ? orderRemainingRefundable
          : fallbackRemainingRefundable;

      if (
        !Number.isFinite(remainingRefundableAmount) ||
        remainingRefundableAmount <= 0
      ) {
        throw new Error('No refundable amount remains for this order.');
      }

      // --------------------------------------------------------
      // Never allow refund to exceed remaining refundable value.
      // --------------------------------------------------------

      if (refundAmount > Number(remainingRefundableAmount.toFixed(2))) {
        throw new Error(
          `Calculated refund amount ₹${refundAmount.toFixed(
            2,
          )} exceeds the remaining refundable amount ₹${remainingRefundableAmount.toFixed(
            2,
          )}.`,
        );
      }

      const refundAmountPaise = Math.round(refundAmount * 100);

      if (!Number.isInteger(refundAmountPaise) || refundAmountPaise <= 0) {
        throw new Error('Invalid refund amount in paise.');
      }

      let refundIdempotencyKey = `RETURN_${order._id}`;

      let refundReceipt = `RETURN_${order.orderNumber}`;

      // --------------------------------------------------------
      // If previous refund attempt FAILED, create a new unique
      // refund request identifier.
      //
      // This avoids treating a previous failed refund as the
      // same new attempt.
      // --------------------------------------------------------

      if (order.refundStatus === 'FAILED') {
        const retryToken = new Date().getTime();

        refundIdempotencyKey = `RETURN_${order._id}_${retryToken}`;

        refundReceipt = `RETURN_${order.orderNumber}_${retryToken}`;
      }

      try {
        refund = await createRazorpayRefund({
          paymentId: order.razorpayPaymentId,

          // IMPORTANT:
          // This is now the calculated PARTIAL/FULL
          // return refund amount.
          amount: refundAmountPaise,

          speed: 'normal',

          receipt: refundReceipt,

          idempotencyKey: refundIdempotencyKey,

          notes: {
            orderId: String(order._id),
            orderNumber: order.orderNumber,
            reason: 'Customer return completed',
            condition,
            returnType: order.returnRequest?.returnType || 'UNKNOWN',
            refundAmount: refundAmount.toFixed(2),
          },
        });

        if (!refund?.id) {
          throw new Error('Razorpay did not return a refund ID.');
        }

        // ------------------------------------------------------
        // Save refund ID and amount.
        //
        // IMPORTANT:
        // Do not mark payment REFUNDED here.
        // Webhook handles final state.
        // ------------------------------------------------------

        const refundUpdate = {
          refundId: refund.id,

          refundAmount: Number(refund.amount || refundAmountPaise) / 100,

          refundStatus: 'PENDING',

          refundFailureReason: '',
        };

        // --------------------------------------------------------
        // Create Refund ledger record
        // --------------------------------------------------------
        // IMPORTANT:
        // Razorpay refund has now been successfully created.
        //
        // Create our internal Refund ledger record so:
        // - Refund History can display it
        // - reconciliation can find it
        // - webhook/reconciliation can later move it
        //   from PENDING -> PROCESSED
        // --------------------------------------------------------

        const refundLedgerAmount =
          Number(refund.amount || refundAmountPaise) / 100;

        const existingRefund = await Refund.findOne({
          razorpayRefundId: refund.id,
        });

        if (!existingRefund) {
          await Refund.create({
            orderId: order._id,
            userId: order.userId,

            razorpayPaymentId: order.razorpayPaymentId,
            razorpayRefundId: refund.id,

            amount: refundLedgerAmount,

            currency: refund.currency || 'INR',

            status: 'PENDING',

            source: 'RETURN',

            returnRequestId: order.returnRequest?._id || null,

            reason: 'Customer return completed',

            metadata: {
              orderNumber: order.orderNumber,
              condition,
              returnType: order.returnRequest?.returnType || 'UNKNOWN',
            },
          });
        }

        // ------------------------------------------------------
        // Do not overwrite a webhook that already moved the
        // refund to PROCESSED / paymentStatus REFUNDED.
        // ------------------------------------------------------

        const latestOrder = await Order.findById(orderId);

        if (latestOrder) {
          if (
            latestOrder.refundStatus !== 'PROCESSED' &&
            latestOrder.paymentStatus !== 'REFUNDED'
          ) {
            await Order.findByIdAndUpdate(
              orderId,
              {
                $set: refundUpdate,
              },
              {
                new: true,
              },
            );
          }
        }
      } catch (refundError) {
        console.error('RETURN RAZORPAY REFUND ERROR:', refundError);

        // ------------------------------------------------------
        // Return is already completed and inventory transaction
        // has already committed.
        //
        // Mark refund as FAILED so it can be retried/reconciled.
        // ------------------------------------------------------

        await Order.findByIdAndUpdate(orderId, {
          $set: {
            refundStatus: 'FAILED',
            refundFailureReason:
              refundError?.message || 'Razorpay refund creation failed.',
          },
        });

        return res.status(502).json({
          success: false,
          message:
            'Return was completed, but the Razorpay refund could not be initiated. Refund status is marked FAILED for retry.',
          data: {
            order: await Order.findById(orderId),
          },
        });
      }
    }

    // ----------------------------------------------------------
    // 14. Get final order
    // ----------------------------------------------------------

    const finalOrder = await Order.findById(orderId);

    if (!finalOrder) {
      return res.status(404).json({
        success: false,
        message: 'Order not found after return completion.',
      });
    }

    // ----------------------------------------------------------
    // 15. Build refund response
    // ----------------------------------------------------------

    let refundResponse = null;

    if (refund) {
      refundResponse = {
        id: refund.id,
        paymentId: refund.payment_id,
        amount: refund.amount,
        currency: refund.currency,
        status: refund.status,
        speed: refund.speed_requested || 'normal',
      };
    }

    // ----------------------------------------------------------
    // 16. Final response
    // ----------------------------------------------------------

    return res.status(200).json({
      success: true,

      message:
        finalOrder.paymentMethod === 'ONLINE'
          ? finalOrder.refundStatus === 'PROCESSED' ||
            finalOrder.paymentStatus === 'REFUNDED'
            ? 'Return completed and refund processed successfully.'
            : 'Return completed successfully. Refund is being processed.'
          : 'Return completed successfully.',

      data: {
        order: finalOrder,
        refund: refundResponse,
      },
    });
  } catch (error) {
    console.error('COMPLETE RETURN ERROR:', error);

    if (error.statusCode === 409) {
      return res.status(409).json({
        success: false,
        message:
          'The refund is currently being processed by Razorpay. Please try again shortly.',
      });
    }

    return res.status(500).json({
      success: false,
      message: error?.message || 'Failed to complete return request.',
    });
  } finally {
    await session.endSession();
  }
};
