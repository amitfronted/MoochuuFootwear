import mongoose from 'mongoose';

import Base from '../models/base.model.js';
import Strap from '../models/strap.model.js';
import Thumb from '../models/thumb.model.js';
import Product from '../models/product.model.js';
import InventoryTransaction from '../models/inventoryTransaction.model.js';

const models = {
  base: Base,
  strap: Strap,
  thumb: Thumb,
};

// *---------------------------------------------*
// *ADD COMPONENT STOCK*
// *BASE / STRAP / THUMB
// *
// *Admin enters the quantity being added.
// *
// *Example:
// *Previous stock = 50
// *Quantity added  = 50
// *New stock      = 100
// *---------------------------------------------*

export const updateComponentStock = async (req, res) => {
  let session;

  try {
    const { type, componentId, colorId, variantId } = req.params;

    const { quantity, reason } = req.body;

    // -----------------------------------------
    // VALIDATE COMPONENT TYPE
    // -----------------------------------------

    const Model = models[type];

    if (!Model) {
      return res.status(400).json({
        success: false,
        error: true,
        message: 'Invalid component type',
      });
    }

    // -----------------------------------------
    // VALIDATE IDS
    // -----------------------------------------

    if (![componentId, colorId, variantId].every(mongoose.isValidObjectId)) {
      return res.status(400).json({
        success: false,
        error: true,
        message: 'Invalid component/color/variant id',
      });
    }

    // -----------------------------------------
    // VALIDATE QUANTITY TO ADD
    // -----------------------------------------

    const quantityToAdd = Number(quantity);

    if (!Number.isInteger(quantityToAdd) || quantityToAdd <= 0) {
      return res.status(400).json({
        success: false,
        error: true,
        message: 'Quantity to add must be a positive integer',
      });
    }

    // -----------------------------------------
    // START TRANSACTION
    // -----------------------------------------

    session = await mongoose.startSession();

    let result;

    await session.withTransaction(async () => {
      // -----------------------------------------
      // FIND COMPONENT
      // -----------------------------------------

      const component = await Model.findOne({
        _id: componentId,
        'colors._id': colorId,
        'colors.variants._id': variantId,
      }).session(session);

      if (!component) {
        throw new Error('Component/color/variant not found');
      }

      // -----------------------------------------
      // FIND COLOR
      // -----------------------------------------

      const color = component.colors.id(colorId);

      if (!color) {
        throw new Error('Color not found');
      }

      // -----------------------------------------
      // FIND VARIANT
      // -----------------------------------------

      const variant = color.variants.id(variantId);

      if (!variant) {
        throw new Error('Variant not found');
      }

      // -----------------------------------------
      // CURRENT STOCK
      // -----------------------------------------

      const previousStock = Number(variant.stockQuantity || 0);

      // -----------------------------------------
      // CALCULATE NEW STOCK
      // -----------------------------------------

      const newStock = previousStock + quantityToAdd;

      // -----------------------------------------
      // UPDATE STOCK
      // -----------------------------------------

      variant.stockQuantity = newStock;

      await component.save({
        session,
      });

      // -----------------------------------------
      // INVENTORY TRANSACTION
      // -----------------------------------------

      await InventoryTransaction.create(
        [
          {
            type: 'STOCK_IN',

            itemType: type.toUpperCase(),

            componentId: component._id,

            colorId: color._id,

            variantId: variant._id,

            size: variant.size?.toString() || null,

            quantity: quantityToAdd,

            previousStock,

            newStock,

            performedBy: req.userId,

            reason: reason?.trim() || 'Stock received',
          },
        ],
        {
          session,
        },
      );

      // -----------------------------------------
      // RESULT
      // -----------------------------------------

      result = {
        component,
        color,
        variant,

        stockChange: {
          previousStock,
          quantityAdded: quantityToAdd,
          newStock,
        },
      };
    });

    // -----------------------------------------
    // SUCCESS
    // -----------------------------------------

    return res.status(200).json({
      success: true,
      error: false,
      message: `${type} stock added successfully`,
      data: result,
    });
  } catch (error) {
    console.error('ADD COMPONENT STOCK ERROR:', error);

    return res.status(500).json({
      success: false,
      error: true,
      message: error.message || 'Failed to add stock',
    });
  } finally {
    if (session) {
      await session.endSession();
    }
  }
};

// *---------------------------------------------*
// *UPDATE STANDARD PRODUCT STOCK*
// *---------------------------------------------*

export const updateStandardProductStock = async (req, res) => {
  const session = await mongoose.startSession();

  try {
    const { productId, variantId } = req.params;
    const { quantity, reason } = req.body;

    // ---------------------------------------------
    // Validate quantity
    // ---------------------------------------------

    const quantityToAdd = Number(quantity);

    if (!Number.isInteger(quantityToAdd) || quantityToAdd <= 0) {
      return res.status(400).json({
        success: false,
        error: true,
        message: 'Stock quantity to add must be a positive integer.',
      });
    }

    // ---------------------------------------------
    // Validate Product ID
    // ---------------------------------------------

    if (!mongoose.Types.ObjectId.isValid(productId)) {
      return res.status(400).json({
        success: false,
        error: true,
        message: 'Invalid product ID.',
      });
    }

    // ---------------------------------------------
    // Validate Variant ID
    // ---------------------------------------------

    if (!mongoose.Types.ObjectId.isValid(variantId)) {
      return res.status(400).json({
        success: false,
        error: true,
        message: 'Invalid variant ID.',
      });
    }

    // ---------------------------------------------
    // Start transaction
    // ---------------------------------------------

    session.startTransaction();

    const product = await Product.findById(productId).session(session);

    if (!product) {
      await session.abortTransaction();

      return res.status(404).json({
        success: false,
        error: true,
        message: 'Product not found.',
      });
    }

    // ---------------------------------------------
    // Only STANDARD products
    // ---------------------------------------------

    if (product.productType !== 'STANDARD') {
      await session.abortTransaction();

      return res.status(400).json({
        success: false,
        error: true,
        message: 'This product is not a standard product.',
      });
    }

    // ---------------------------------------------
    // Find standard variant
    // ---------------------------------------------

    const variant = product.standardStock?.id(variantId);

    if (!variant) {
      await session.abortTransaction();

      return res.status(404).json({
        success: false,
        error: true,
        message: 'Standard stock variant not found.',
      });
    }

    // ---------------------------------------------
    // Calculate new stock
    // ---------------------------------------------

    const previousStock = Number(variant.stockQuantity || 0);

    const newStock = previousStock + quantityToAdd;

    // ---------------------------------------------
    // Update stock
    // ---------------------------------------------

    variant.stockQuantity = newStock;

    await product.save({ session });

    // ---------------------------------------------
    // Create inventory transaction
    // ---------------------------------------------

    await InventoryTransaction.create(
      [
        {
          type: 'STOCK_IN',

          itemType: 'STANDARD',

          productId: product._id,

          variantId: variant._id,

          size: variant.size?.toString() || null,

          quantity: quantityToAdd,

          previousStock,

          newStock,

          performedBy: req.userId,

          reason: reason?.trim() || 'Stock received',
        },
      ],
      { session },
    );

    // ---------------------------------------------
    // Commit
    // ---------------------------------------------

    await session.commitTransaction();

    return res.status(200).json({
      success: true,
      error: false,

      message: 'Standard product stock updated successfully.',

      stockChange: {
        previousStock,
        quantityAdded: quantityToAdd,
        newStock,
      },
    });
  } catch (error) {
    await session.abortTransaction();

    console.error('UPDATE STANDARD PRODUCT STOCK ERROR:', error);

    return res.status(500).json({
      success: false,
      error: true,
      message: error.message || 'Failed to update standard product stock.',
    });
  } finally {
    session.endSession();
  }
};
