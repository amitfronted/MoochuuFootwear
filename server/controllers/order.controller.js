import mongoose from 'mongoose';
import crypto from 'crypto';

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

import sendEmailFun from '../config/sendEmail.js';
import { orderConfirmationEmail } from '../utils/orderConfirmationTemplate.js';
import { notifyAdmins } from '../utils/createNotification.js';

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
      available: Number(variant.stockQuantity),
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
    size: String(baseVariant.size),
    required: quantity,
    available: Number(baseVariant.stockQuantity),
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
    size: String(strapVariant.size),
    required: quantity,
    available: Number(strapVariant.stockQuantity),
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
      size: String(thumbVariant.size),
      required: quantity,
      available: Number(thumbVariant.stockQuantity),
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
  const component = await Model.findOne({
    _id: componentId,

    colors: {
      $elemMatch: {
        _id: colorId,

        variants: {
          $elemMatch: {
            _id: variantId,
            size: String(size),

            stockQuantity: {
              $gte: quantity,
            },
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

  if (previousStock < quantity) {
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
  const product = await Product.findOne({
    _id: productId,

    productType: 'STANDARD',

    standardStock: {
      $elemMatch: {
        _id: variantId,
        size: String(size),

        stockQuantity: {
          $gte: quantity,
        },
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

  if (previousStock < quantity) {
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
 * CREATE ORDER
 *
 * POST /api/order/create
 *
 * Headers:
 * Idempotency-Key: unique-checkout-key
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
   * Online payment is intentionally disabled until
   * Razorpay / Stripe payment verification is implemented.
   *
   * ============================================================
   */

  if (paymentMethod === 'ONLINE') {
    return res.status(400).json({
      success: false,
      message:
        'Online payment is not configured yet. Please choose Cash on Delivery.',
    });
  }

  /**
   * ============================================================
   * CHECK EXISTING IDEMPOTENCY REQUEST
   * ============================================================
   *
   * This is the first protection against duplicate checkout.
   *
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
       *
       * Because `key` is UNIQUE in MongoDB, two simultaneous
       * requests cannot successfully create the same key.
       *
       * ========================================================
       */

      const idempotencyRecord = new IdempotencyKey({
        key: cleanIdempotencyKey,
        userId,
        status: 'PROCESSING',
      });

      await idempotencyRecord.save({ session });

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
       * IMPORTANT:
       * Never trust product information coming from frontend.
       *
       * Price and stock are taken from MongoDB.
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
           * ----------------------------------------------------
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
           * Needed for cancellation stock restoration.
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

          /**
           * Inventory audit
           */

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
       * Currently shipping/tax are 0 in your project.
       * We can implement them later.
       *
       * ========================================================
       */

      const shippingCharge = 0;

      const tax = 0;

      const totalAmount = subtotal + shippingCharge + tax;

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
       * This connects:
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
     *
     * At this point:
     *
     * Order created
     * Stock deducted
     * Inventory audited
     * Cart cleared
     * User history updated
     * Idempotency completed
     *
     * ==========================================================
     */

    /**
     * ==========================================================
     * ADMIN NOTIFICATION
     * ==========================================================
     *
     * IMPORTANT:
     * Do this AFTER transaction.
     *
     * Notification failure must NOT rollback order.
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
     *
     * MongoDB unique index protects against two requests
     * arriving at exactly the same time.
     *
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
    /**
     * ==========================================================
     * END SESSION
     * ==========================================================
     */

    await session.endSession();
  }
};

/**
 * GET MY ORDERS
 *
 * GET /api/order/my-orders
 */
/**
 * GET MY ORDERS
 *
 * GET /api/order/my-orders
 */
export const getMyOrdersController = async (req, res) => {
  try {
    const orders = await Order.find({
      userId: req.userId,
    })
      .sort({
        createdAt: -1,
      })
      .lean();

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
 * GET ALL ORDERS
 *
 * Admin
 *
 * GET /api/order/all
 */
export const getAllOrdersController = async (req, res) => {
  try {
    const orders = await Order.find()
      .populate('userId', 'name email mobile')
      .sort({
        createdAt: -1,
      })
      .lean();

    return res.status(200).json({
      success: true,
      data: orders,
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

const allowedStatusTransitions = {
  PLACED: ['CONFIRMED', 'CANCELLED'],

  CONFIRMED: ['PROCESSING', 'CANCELLED'],

  PROCESSING: ['SHIPPED', 'CANCELLED'],

  SHIPPED: ['DELIVERED'],

  DELIVERED: [],

  CANCELLED: [],
};

export const updateOrderStatusController = async (req, res) => {
  let session;
  try {
    const { orderId } = req.params;
    const { status } = req.body;

    if (!mongoose.Types.ObjectId.isValid(orderId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid order ID.',
      });
    }

    // ---------------------------------------------------------
    // Validate status
    // ---------------------------------------------------------

    const allowedStatuses = [
      'PLACED',
      'CONFIRMED',
      'PROCESSING',
      'SHIPPED',
      'DELIVERED',
      'CANCELLED',
    ];

    if (!allowedStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: `Invalid status "${status}". Allowed statuses are: ${allowedStatuses.join(
          ', ',
        )}`,
      });
    }

    // ---------------------------------------------------------
    // Find order
    // ---------------------------------------------------------

    let order = await Order.findById(orderId);

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found.',
      });
    }

    // ---------------------------------------------------------
    // Nothing to change
    // ---------------------------------------------------------

    if (order.orderStatus === status) {
      return res.status(200).json({
        success: true,
        message: `Order is already ${status}.`,
        data: order,
      });
    }

    const currentStatus = order.orderStatus;

    const allowedNextStatuses = allowedStatusTransitions[currentStatus] || [];

    if (!allowedNextStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: `Order cannot be changed from ${currentStatus} to ${status}.`,
      });
    }

    // ---------------------------------------------------------
    // CANCEL ORDER
    // ---------------------------------------------------------

    if (status === 'CANCELLED') {
      // Paid orders cannot be cancelled until refund system exists
      if (order.paymentStatus === 'PAID') {
        throw new Error(
          'Paid orders cannot be cancelled until refund processing is implemented.',
        );
      }

      let previousStatus = order.orderStatus;

      session = await mongoose.startSession();

      try {
        await session.withTransaction(async () => {
          // Always fetch fresh order inside transaction
          const freshOrder = await Order.findById(orderId).session(session);

          if (!freshOrder) {
            throw new Error('Order not found.');
          }

          previousStatus = freshOrder.orderStatus;

          if (freshOrder.paymentStatus === 'PAID') {
            throw new Error(
              'Paid orders cannot be cancelled until refund processing is implemented.',
            );
          }

          // Prevent duplicate cancellation
          if (freshOrder.orderStatus === 'CANCELLED') {
            throw new Error('Order is already cancelled.');
          }

          // Prevent cancellation after delivery
          if (freshOrder.orderStatus === 'DELIVERED') {
            throw new Error('Delivered order cannot be cancelled.');
          }

          const inventoryEntries = [];

          for (const item of freshOrder.items) {
            const quantity = Number(item.quantity);

            if (!Number.isInteger(quantity) || quantity <= 0) {
              throw new Error(`Invalid quantity for order item: ${item.name}`);
            }

            // =====================================================
            // STANDARD PRODUCT
            // =====================================================

            if (item.productType === 'STANDARD') {
              const product = await Product.findById(item.productId).session(
                session,
              );

              if (!product) {
                throw new Error(
                  `Product not found while restoring stock: ${item.name}`,
                );
              }

              const variant = product.standardStock.id(item.variantId);

              if (!variant) {
                throw new Error(
                  `Standard variant not found while restoring stock: ${item.name}`,
                );
              }

              const previousStock = Number(variant.stockQuantity || 0);

              variant.stockQuantity = previousStock + quantity;

              await product.save({ session });

              inventoryEntries.push({
                type: 'CANCEL',
                itemType: 'STANDARD',

                productId: product._id,
                variantId: variant._id,

                quantity,
                previousStock,
                newStock: variant.stockQuantity,

                performedBy: req.userId,

                orderId: freshOrder._id,

                reason: 'Stock restored after order cancellation.',
              });

              continue;
            }

            // =====================================================
            // CUSTOMIZABLE PRODUCT
            // =====================================================

            const components = [
              {
                type: 'BASE',
                model: Base,
                option: item.base,
              },
              {
                type: 'STRAP',
                model: Strap,
                option: item.strap,
              },
            ];

            // Thumb is optional
            if (item.thumb?.componentId) {
              components.push({
                type: 'THUMB',
                model: Thumb,
                option: item.thumb,
              });
            }

            for (const component of components) {
              const { componentId, colorId, variantId } =
                component.option || {};

              if (!componentId || !colorId || !variantId) {
                throw new Error(
                  `${component.type} inventory information is missing for ${item.name}.`,
                );
              }

              const componentDoc = await component.model
                .findOne({
                  _id: componentId,
                  'colors._id': colorId,
                  'colors.variants._id': variantId,
                })
                .session(session);

              if (!componentDoc) {
                throw new Error(
                  `${component.type} not found while restoring stock for ${item.name}.`,
                );
              }

              const color = componentDoc.colors.id(colorId);

              if (!color) {
                throw new Error(
                  `${component.type} color not found while restoring stock.`,
                );
              }

              const variant = color.variants.id(variantId);

              if (!variant) {
                throw new Error(
                  `${component.type} variant not found while restoring stock.`,
                );
              }

              const previousStock = Number(variant.stockQuantity || 0);

              variant.stockQuantity = previousStock + quantity;

              await componentDoc.save({ session });

              inventoryEntries.push({
                type: 'CANCEL',
                itemType: component.type,

                componentId: componentDoc._id,
                colorId: color._id,
                variantId: variant._id,

                quantity,
                previousStock,
                newStock: variant.stockQuantity,

                performedBy: req.userId,

                orderId: freshOrder._id,

                reason: `Stock restored after order cancellation - ${component.type}.`,
              });
            }
          }

          // =====================================================
          // INVENTORY AUDIT
          // =====================================================

          if (inventoryEntries.length > 0) {
            await InventoryTransaction.create(inventoryEntries, {
              session,
              ordered: true,
            });
          }

          // =====================================================
          // UPDATE ORDER
          // =====================================================

          freshOrder.orderStatus = 'CANCELLED';
          freshOrder.cancelledAt = new Date();

          await freshOrder.save({ session });

          // Update outer variable for response
          order = freshOrder;
        });
      } finally {
        await session.endSession();
        session = null;
      }

      // Notification AFTER transaction
      try {
        await notifyAdmins({
          type: 'ORDER_STATUS',

          title: 'Order Cancelled',

          message: `Order ${order.orderNumber} has been cancelled.`,

          orderId: order._id,

          orderNumber: order.orderNumber,

          data: {
            previousStatus,
            status,
          },
        });
      } catch (notificationError) {
        console.error('Cancellation notification error:', notificationError);
      }

      return res.status(200).json({
        success: true,
        message: 'Order cancelled successfully.',
        data: order,
      });
    }
    // ---------------------------------------------------------
    // NORMAL STATUS UPDATE
    // ---------------------------------------------------------

    const previousStatus = order.orderStatus;

    order.orderStatus = status;

    // Delivered date
    if (status === 'DELIVERED') {
      order.deliveredAt = new Date();
    }

    // If status is moved away from delivered
    if (status !== 'DELIVERED') {
      order.deliveredAt = null;
    }

    await order.save();

    console.log(`Order ${order.orderNumber}: ${previousStatus} → ${status}`);

    // ---------------------------------------------------------
    // Notification
    // ---------------------------------------------------------

    try {
      await notifyAdmins({
        type: 'ORDER_STATUS',

        title: 'Order Status Updated',

        message: `Order ${order.orderNumber} changed from ${previousStatus} to ${status}.`,

        orderId: order._id,

        orderNumber: order.orderNumber,

        data: {
          previousStatus,
          status,
        },
      });
    } catch (notificationError) {
      console.error('Notification error:', notificationError);
    }

    return res.status(200).json({
      success: true,

      message: 'Order status updated successfully.',

      data: order,
    });
  } catch (error) {
    console.error('UPDATE ORDER STATUS ERROR:', error);

    return res.status(400).json({
      success: false,
      message: error?.message || 'Failed to update order status.',
    });
  }
};
