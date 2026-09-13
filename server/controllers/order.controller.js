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
    image: base.image || '',
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
    image: strap.image || '',
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
      image: thumb.image || '',
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
       * Currently shipping/tax are 0
       * in your project.
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
 *   "addressId": "..."
 * }
 *
 * This endpoint:
 *
 * 1. Validates user
 * 2. Validates address
 * 3. Validates cart
 * 4. Fetches ACTIVE products
 * 5. Calculates price from database
 * 6. Creates Razorpay order
 *
 * IMPORTANT:
 * Stock is NOT deducted here.
 *
 * Stock will be deducted only after successful
 * Razorpay payment verification.
 * ============================================================
 */

export const createRazorpayOrderController = async (req, res) => {
  const userId = req.userId;

  try {
    /**
     * --------------------------------------------------------
     * VALIDATE USER
     * --------------------------------------------------------
     */

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required.',
      });
    }

    const { addressId } = req.body;

    /**
     * --------------------------------------------------------
     * VALIDATE ADDRESS ID
     * --------------------------------------------------------
     */

    if (!addressId || !mongoose.Types.ObjectId.isValid(addressId)) {
      return res.status(400).json({
        success: false,
        message: 'Please select a valid delivery address.',
      });
    }

    /**
     * --------------------------------------------------------
     * GET ADDRESS
     * --------------------------------------------------------
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
     * --------------------------------------------------------
     * GET CART
     * --------------------------------------------------------
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
     * --------------------------------------------------------
     * GET PRODUCT IDS
     * --------------------------------------------------------
     */

    const productIds = cart.items.map((item) => item.productId);

    /**
     * --------------------------------------------------------
     * GET ACTIVE PRODUCTS
     * --------------------------------------------------------
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
     * --------------------------------------------------------
     * MAKE PRODUCT MAP
     * --------------------------------------------------------
     */

    const productMap = new Map(
      products.map((product) => [String(product._id), product]),
    );

    /**
     * --------------------------------------------------------
     * VALIDATE ALL PRODUCTS
     * --------------------------------------------------------
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
     * --------------------------------------------------------
     * CALCULATE SUBTOTAL
     *
     * NEVER TRUST FRONTEND TOTAL
     * --------------------------------------------------------
     */

    let subtotal = 0;

    const orderItems = [];

    for (const cartItem of cart.items) {
      const product = productMap.get(String(cartItem.productId));

      if (!product) {
        return res.status(400).json({
          success: false,
          message: `${cartItem.name || 'A product'} is no longer available.`,
        });
      }

      const quantity = Number(cartItem.quantity);

      if (!Number.isInteger(quantity) || quantity < 1) {
        return res.status(400).json({
          success: false,
          message: `Invalid quantity for ${product.name}.`,
        });
      }

      /**
       * NEVER trust frontend price
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
       * VALIDATE SIZE / OPTIONS / STOCK
       * ------------------------------------------------------
       */

      const requirements = getRequiredStock(product, cartItem);

      for (const requirement of requirements) {
        if (requirement.available < requirement.required) {
          return res.status(400).json({
            success: false,
            message: requirement.message,
          });
        }
      }

      const lineTotal = unitPrice * quantity;

      subtotal += lineTotal;

      let base = null;
      let strap = null;
      let thumb = null;

      /**
       * ------------------------------------------------------
       * CUSTOMIZABLE PRODUCT
       * ------------------------------------------------------
       */

      if (product.productType === 'CUSTOMIZABLE') {
        const baseRequirement = requirements.find(
          (item) => item.kind === 'base',
        );

        const strapRequirement = requirements.find(
          (item) => item.kind === 'strap',
        );

        const thumbRequirement = requirements.find(
          (item) => item.kind === 'thumb',
        );

        if (!baseRequirement) {
          return res.status(400).json({
            success: false,
            message: `Base inventory information is missing for ${product.name}.`,
          });
        }

        if (!strapRequirement) {
          return res.status(400).json({
            success: false,
            message: `Strap inventory information is missing for ${product.name}.`,
          });
        }

        /**
         * BASE / SOLE SNAPSHOT
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
       * CREATE PAYMENT SNAPSHOT ITEM
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
     * --------------------------------------------------------
     * SHIPPING / TAX
     *
     * Existing project currently uses 0.
     * --------------------------------------------------------
     */

    const shippingCharge = 0;

    const tax = 0;

    const totalAmount = subtotal + shippingCharge + tax;

    /**
     * --------------------------------------------------------
     * VALIDATE TOTAL
     * --------------------------------------------------------
     */

    if (!Number.isFinite(totalAmount) || totalAmount <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Invalid order amount.',
      });
    }

    /**
     * --------------------------------------------------------
     * CONVERT INR TO PAISE
     *
     * ₹299  => 29900
     * ₹999  => 99900
     * --------------------------------------------------------
     */

    const razorpayAmount = Math.round(totalAmount * 100);

    /**
     * --------------------------------------------------------
     * CREATE RECEIPT
     *
     * Maximum 40 characters.
     * --------------------------------------------------------
     */

    const receipt = `MC_${Date.now()}`;

    /**
     * --------------------------------------------------------
     * CREATE RAZORPAY ORDER
     * --------------------------------------------------------
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

    /**
     * --------------------------------------------------------
     * CREATE PAYMENT ATTEMPT
     *
     * IMPORTANT:
     *
     * We freeze the cart and price here.
     *
     * Later, during payment verification,
     * we use this snapshot instead of trusting
     * the current cart or current product price.
     * --------------------------------------------------------
     */

    await PaymentAttempt.create({
      userId,

      addressId,

      razorpayOrderId: razorpayOrder.id,

      amount: razorpayAmount,

      cartItems: orderItems,

      subtotal,

      shippingCharge,

      tax,

      totalAmount,

      currency: razorpayOrder.currency,

      status: 'CREATED',

      expiresAt: new Date(Date.now() + 30 * 60 * 1000),
    });

    /**
     * --------------------------------------------------------
     * SUCCESS
     * --------------------------------------------------------
     */

    return res.status(201).json({
      success: true,

      message: 'Razorpay order created successfully.',

      data: {
        razorpayOrderId: razorpayOrder.id,

        amount: razorpayOrder.amount,

        currency: razorpayOrder.currency,

        keyId: process.env.RAZORPAY_KEY_ID,

        receipt: razorpayOrder.receipt,
      },
    });
  } catch (error) {
    console.error('Create Razorpay order error:', error);

    return res.status(500).json({
      success: false,

      message:
        error?.error?.description ||
        error?.message ||
        'Unable to create Razorpay order.',
    });
  }
};

export const verifyRazorpayPaymentController = async (req, res) => {
  const userId = req.userId;

  const { razorpay_order_id, razorpay_payment_id, razorpay_signature } =
    req.body;

  if (!userId) {
    return res.status(401).json({
      success: false,
      message: 'Unauthorized.',
    });
  }

  if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
    return res.status(400).json({
      success: false,
      message: 'Payment verification data is incomplete.',
    });
  }

  try {
    /**
     * ==========================================================
     * 1. VERIFY RAZORPAY SIGNATURE
     * ==========================================================
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
     * ==========================================================
     * 2. FETCH RAZORPAY PAYMENT
     * ==========================================================
     */

    const razorpayPayment = await razorpay.payments.fetch(razorpay_payment_id);

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
     * --------------------------------------------------------
     * PAYMENT ALREADY PROCESSED
     * --------------------------------------------------------
     */

    if (paymentAttempt.status === 'PAID' && paymentAttempt.orderId) {
      const existingOrder = await Order.findById(paymentAttempt.orderId);

      return res.status(200).json({
        success: true,
        message: 'Payment already processed.',
        data: {
          order: existingOrder,
        },
      });
    }

    if (!razorpayPayment) {
      return res.status(400).json({
        success: false,
        message: 'Unable to verify Razorpay payment.',
      });
    }

    /**
     * --------------------------------------------------------
     * VERIFY RAZORPAY ORDER ID
     * --------------------------------------------------------
     */

    if (razorpayPayment.order_id !== razorpay_order_id) {
      return res.status(400).json({
        success: false,
        message: 'Payment order mismatch.',
      });
    }

    /**
     * --------------------------------------------------------
     * VERIFY PAYMENT STATUS
     * --------------------------------------------------------
     */

    if (razorpayPayment.status !== 'captured') {
      return res.status(400).json({
        success: false,
        message: `Payment is not captured. Current status: ${razorpayPayment.status}.`,
      });
    }

    /**
     * --------------------------------------------------------
     * VERIFY PAYMENT AMOUNT
     * --------------------------------------------------------
     */

    if (Number(razorpayPayment.amount) !== Number(paymentAttempt.amount)) {
      return res.status(400).json({
        success: false,
        message: 'Payment amount does not match the payment attempt.',
      });
    }

    // --------------------------------------------------------
    // VERIFY PAYMENT CURRENCY
    // --------------------------------------------------------

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
     * ==========================================================
     * 3. START MONGODB TRANSACTION
     * ==========================================================
     */

    const session = await mongoose.startSession();

    let createdOrder = null;

    try {
      await session.withTransaction(async () => {
        /**
         * ------------------------------------------------------
         * PAYMENT ATTEMPT
         * ------------------------------------------------------
         */

        const paymentAttemptInTransaction = await PaymentAttempt.findOne({
          _id: paymentAttempt._id,
          userId,
        }).session(session);

        if (!paymentAttemptInTransaction) {
          throw new Error('Payment attempt not found.');
        }

        /**
         * Prevent duplicate processing
         */

        if (
          paymentAttemptInTransaction.status === 'PAID' &&
          paymentAttemptInTransaction.orderId
        ) {
          throw new Error('Payment has already been processed.');
        }

        /**
         * ------------------------------------------------------
         * ADDRESS
         * ------------------------------------------------------
         */

        const address = await AddressModel.findOne({
          _id: paymentAttemptInTransaction.addressId,
          userId,
        }).session(session);

        if (!address) {
          throw new Error('Selected delivery address was not found.');
        }

        /**
         * ------------------------------------------------------
         * GET FROZEN CART SNAPSHOT
         * ------------------------------------------------------
         *
         * We DO NOT use the current frontend cart
         * for price calculation.
         *
         * PaymentAttempt contains the snapshot created
         * when Razorpay order was created.
         * ------------------------------------------------------
         */

        const snapshotItems = paymentAttemptInTransaction.cartItems;

        if (!snapshotItems?.length) {
          throw new Error('Payment attempt contains no order items.');
        }

        /**
         * ------------------------------------------------------
         * LOAD PRODUCTS
         * ------------------------------------------------------
         */

        const productIds = snapshotItems.map((item) => item.productId);

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

        const productMap = new Map(
          products.map((product) => [String(product._id), product]),
        );

        /**
         * ------------------------------------------------------
         * BUILD ORDER ITEMS
         * ------------------------------------------------------
         */

        const orderItems = [];

        const stockRequirements = [];

        let subtotal = 0;

        for (const snapshotItem of snapshotItems) {
          const product = productMap.get(String(snapshotItem.productId));

          if (!product) {
            throw new Error(
              `${snapshotItem.name || 'A product'} is no longer available.`,
            );
          }

          const quantity = Number(snapshotItem.quantity);

          if (!Number.isInteger(quantity) || quantity < 1) {
            throw new Error(`Invalid quantity for ${product.name}.`);
          }

          /**
           * IMPORTANT:
           *
           * Use the frozen price stored
           * in PaymentAttempt.
           *
           * Do NOT recalculate the customer's
           * paid amount from current product price.
           */

          const unitPrice = Number(snapshotItem.unitPrice);

          if (!Number.isFinite(unitPrice) || unitPrice < 0) {
            throw new Error(`Invalid price for ${product.name}.`);
          }

          /**
           * --------------------------------------------------
           * CHECK CURRENT STOCK
           * --------------------------------------------------
           */

          const requirements = getRequiredStock(product, snapshotItem);

          for (const requirement of requirements) {
            if (requirement.available < requirement.required) {
              throw new Error(requirement.message);
            }
          }

          stockRequirements.push(...requirements);

          /**
           * --------------------------------------------------
           * CALCULATE FROM FROZEN PRICE
           * --------------------------------------------------
           */

          const lineTotal = unitPrice * quantity;

          subtotal += lineTotal;

          /**
           * --------------------------------------------------
           * CUSTOMIZABLE OPTIONS
           * --------------------------------------------------
           */

          let base = null;
          let strap = null;
          let thumb = null;

          if (product.productType === 'CUSTOMIZABLE') {
            const baseRequirement = requirements.find(
              (item) => item.kind === 'base',
            );

            const strapRequirement = requirements.find(
              (item) => item.kind === 'strap',
            );

            const thumbRequirement = requirements.find(
              (item) => item.kind === 'thumb',
            );

            if (!baseRequirement) {
              throw new Error(
                `Base inventory information is missing for ${product.name}.`,
              );
            }

            if (!strapRequirement) {
              throw new Error(
                `Strap inventory information is missing for ${product.name}.`,
              );
            }

            base = snapshotItem.base || null;

            strap = snapshotItem.strap || null;

            thumb = snapshotItem.thumb || null;
          }

          /**
           * --------------------------------------------------
           * CREATE ORDER ITEM SNAPSHOT
           * --------------------------------------------------
           */

          orderItems.push({
            productId: product._id,

            productCode: snapshotItem.productCode || product.productCode,

            name: snapshotItem.name || product.name,

            image:
              snapshotItem.image ||
              snapshotItem.base?.image ||
              snapshotItem.strap?.image ||
              product.mainImage ||
              '',

            productType: snapshotItem.productType,

            size: String(snapshotItem.size),

            quantity,

            unitPrice,

            lineTotal: Number(snapshotItem.lineTotal),

            variantId: snapshotItem.variantId || null,

            base: base || snapshotItem.base || null,

            strap: strap || snapshotItem.strap || null,

            thumb: thumb || snapshotItem.thumb || null,
          });
        }

        /**
         * ======================================================
         * PAYMENT AMOUNT CHECK
         * ======================================================
         */

        const shippingCharge = 0;

        const tax = 0;

        const totalAmount = subtotal + shippingCharge + tax;

        const expectedAmountPaise = Math.round(totalAmount * 100);

        if (Number(razorpayPayment.amount) !== expectedAmountPaise) {
          throw new Error('Payment amount does not match the order amount.');
        }

        /**
         * ======================================================
         * DEDUCT INVENTORY
         * ======================================================
         */

        const inventoryEntries = [];

        for (const requirement of stockRequirements) {
          /**
           * --------------------------------------------------
           * STANDARD PRODUCT
           * --------------------------------------------------
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

              reason: 'Stock deducted for paid customer order.',
            });

            continue;
          }

          /**
           * --------------------------------------------------
           * CUSTOMIZABLE PRODUCT
           * --------------------------------------------------
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

            reason: 'Stock deducted for paid customer order.',
          });
        }

        /**
         * ======================================================
         * CREATE FINAL ORDER
         * ======================================================
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
         * ======================================================
         * INVENTORY TRANSACTIONS
         * ======================================================
         */

        const entriesWithOrder = inventoryEntries.map((entry) => ({
          ...entry,

          orderId: createdOrder._id,
        }));

        if (entriesWithOrder.length) {
          await InventoryTransaction.insertMany(entriesWithOrder, {
            session,
          });
        }

        /**
         * ======================================================
         * CLEAR CART
         * ======================================================
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
         * ======================================================
         * USER ORDER HISTORY
         * ======================================================
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
         * ======================================================
         * MARK PAYMENT ATTEMPT AS PAID
         * ======================================================
         */

        paymentAttemptInTransaction.status = 'PAID';

        paymentAttemptInTransaction.razorpayPaymentId = razorpay_payment_id;

        paymentAttemptInTransaction.razorpaySignature = razorpay_signature;

        paymentAttemptInTransaction.orderId = createdOrder._id;

        paymentAttemptInTransaction.paidAt = new Date();

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
      },
    });
  } catch (error) {
    console.error('Verify Razorpay payment error:', error);

    const errorMessage = error?.message || '';

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
     * UPDATE STATUS
     * ==========================================================
     */

    order.orderStatus = status;

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
