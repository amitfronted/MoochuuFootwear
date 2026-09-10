import mongoose from 'mongoose';

import InventoryTransaction from '../models/inventoryTransaction.model.js';
import User from '../models/user.model.js';
import Product from '../models/product.model.js';
import Base from '../models/base.model.js';
import Strap from '../models/strap.model.js';
import Thumb from '../models/thumb.model.js';

export const getInventoryHistory = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 20,
      itemType,
      type,
      performedBy,
      search,
      startDate,
      endDate,
    } = req.query;

    const currentPage = Math.max(Number(page) || 1, 1);

    const perPage = Math.min(Math.max(Number(limit) || 20, 1), 100);

    const filter = {};

    // -----------------------------------------
    // ITEM TYPE FILTER
    // STANDARD / BASE / STRAP / THUMB
    // -----------------------------------------

    if (
      itemType &&
      ['STANDARD', 'BASE', 'STRAP', 'THUMB'].includes(itemType.toUpperCase())
    ) {
      filter.itemType = itemType.toUpperCase();
    }

    // -----------------------------------------
    // TRANSACTION TYPE FILTER
    // -----------------------------------------

    if (
      type &&
      [
        'STOCK_IN',
        'STOCK_OUT',
        'ORDER',
        'RETURN',
        'CANCEL',
        'DAMAGE',
        'ADJUSTMENT',
      ].includes(type.toUpperCase())
    ) {
      filter.type = type.toUpperCase();
    }

    // -----------------------------------------
    // ADMIN / USER FILTER
    // -----------------------------------------

    if (performedBy) {
      if (!mongoose.isValidObjectId(performedBy)) {
        return res.status(400).json({
          success: false,
          error: true,
          message: 'Invalid performedBy id',
        });
      }

      filter.performedBy = performedBy;
    }

    // -----------------------------------------
    // DATE FILTER
    // -----------------------------------------

    if (startDate || endDate) {
      filter.createdAt = {};

      if (startDate) {
        const start = new Date(startDate);

        if (Number.isNaN(start.getTime())) {
          return res.status(400).json({
            success: false,
            error: true,
            message: 'Invalid startDate',
          });
        }

        start.setHours(0, 0, 0, 0);

        filter.createdAt.$gte = start;
      }

      if (endDate) {
        const end = new Date(endDate);

        if (Number.isNaN(end.getTime())) {
          return res.status(400).json({
            success: false,
            error: true,
            message: 'Invalid endDate',
          });
        }

        end.setHours(23, 59, 59, 999);

        filter.createdAt.$lte = end;
      }
    }

    // -----------------------------------------
    // SEARCH
    // -----------------------------------------

    if (search?.trim()) {
      const searchValue = search.trim();

      const searchRegex = new RegExp(
        searchValue.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'),
        'i',
      );

      const [users, products, bases, straps, thumbs] = await Promise.all([
        User.find({
          $or: [{ name: searchRegex }, { email: searchRegex }],
        }).select('_id'),

        Product.find({
          $or: [{ name: searchRegex }, { productCode: searchRegex }],
        }).select('_id'),

        Base.find({
          name: searchRegex,
        }).select('_id'),

        Strap.find({
          name: searchRegex,
        }).select('_id'),

        Thumb.find({
          name: searchRegex,
        }).select('_id'),
      ]);

      const userIds = users.map((item) => item._id);

      const productIds = products.map((item) => item._id);

      const componentIds = [
        ...bases.map((item) => item._id),
        ...straps.map((item) => item._id),
        ...thumbs.map((item) => item._id),
      ];

      filter.$or = [{ reason: searchRegex }, { size: searchRegex }];

      if (userIds.length > 0) {
        filter.$or.push({
          performedBy: {
            $in: userIds,
          },
        });
      }

      if (productIds.length > 0) {
        filter.$or.push({
          productId: {
            $in: productIds,
          },
        });
      }

      if (componentIds.length > 0) {
        filter.$or.push({
          componentId: {
            $in: componentIds,
          },
        });
      }
    }

    // -----------------------------------------
    // PAGINATION
    // -----------------------------------------

    const skip = (currentPage - 1) * perPage;

    const [transactions, total] = await Promise.all([
      InventoryTransaction.find(filter)
        .populate('performedBy', 'name email role')
        .populate('productId', 'name productCode')
        .populate('orderId', 'orderNumber')
        .sort({
          createdAt: -1,
        })
        .skip(skip)
        .limit(perPage)
        .lean(),

      InventoryTransaction.countDocuments(filter),
    ]);

    // --------------------------------------------------
    // Add component name and color name
    // --------------------------------------------------

    const enrichedTransactions = await Promise.all(
      transactions.map(async (transaction) => {
        // STANDARD PRODUCT
        if (transaction.itemType === 'STANDARD') {
          return {
            ...transaction,
            component: null,
            color: null,
          };
        }

        // No component ID
        if (!transaction.componentId) {
          return {
            ...transaction,
            component: null,
            color: null,
          };
        }

        let ComponentModel = null;

        if (transaction.itemType === 'BASE') {
          ComponentModel = Base;
        }

        if (transaction.itemType === 'STRAP') {
          ComponentModel = Strap;
        }

        if (transaction.itemType === 'THUMB') {
          ComponentModel = Thumb;
        }

        // Unknown component type
        if (!ComponentModel) {
          return {
            ...transaction,
            component: null,
            color: null,
          };
        }

        const component = await ComponentModel.findById(
          transaction.componentId,
        ).lean();

        if (!component) {
          return {
            ...transaction,
            component: null,
            color: null,
          };
        }

        // Find selected color
        let selectedColor = null;

        if (transaction.colorId && Array.isArray(component.colors)) {
          selectedColor = component.colors.find(
            (color) => color._id?.toString() === transaction.colorId.toString(),
          );
        }

        return {
          ...transaction,

          component: {
            _id: component._id,
            name: component.name,
            status: component.status,
          },

          color: selectedColor
            ? {
                _id: selectedColor._id,
                colorName: selectedColor.colorName,
                image: selectedColor.image,
              }
            : null,
        };
      }),
    );

    // -----------------------------------------
    // RESPONSE
    // -----------------------------------------

    return res.status(200).json({
      success: true,
      error: false,
      data: enrichedTransactions,
      pagination: {
        page: currentPage,
        limit: perPage,
        total,
        totalPages: Math.ceil(total / perPage),
        hasNextPage: currentPage < Math.ceil(total / perPage),
        hasPreviousPage: currentPage > 1,
      },
    });
  } catch (error) {
    console.error('GET INVENTORY HISTORY ERROR:', error);

    return res.status(500).json({
      success: false,
      error: true,
      message: error.message || 'Failed to fetch inventory history',
    });
  }
};
