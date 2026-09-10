import Order from '../models/order.model.js';
import Product from '../models/product.model.js';
import UserModel from '../models/user.model.js';
import Base from '../models/base.model.js';
import Strap from '../models/strap.model.js';
import Thumb from '../models/thumb.model.js';

const LOW_STOCK_LIMIT = 5;

export const getDashboardStatsController = async (req, res) => {
  try {
    // =====================================================
    // DATE RANGE - TODAY
    // =====================================================

    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);

    const endOfToday = new Date();
    endOfToday.setHours(23, 59, 59, 999);

    // =====================================================
    // ORDER COUNTS
    // =====================================================

    const [
      totalOrders,
      pendingOrders,
      processingOrders,
      shippedOrders,
      deliveredOrders,
      cancelledOrders,
      todayOrders,
      todaySalesResult,
    ] = await Promise.all([
      // Total orders
      Order.countDocuments(),

      // Pending = PLACED + CONFIRMED
      Order.countDocuments({
        orderStatus: {
          $in: ['PLACED', 'CONFIRMED'],
        },
      }),

      // Processing
      Order.countDocuments({
        orderStatus: 'PROCESSING',
      }),

      // Shipped
      Order.countDocuments({
        orderStatus: 'SHIPPED',
      }),

      // Delivered
      Order.countDocuments({
        orderStatus: 'DELIVERED',
      }),

      // Cancelled
      Order.countDocuments({
        orderStatus: 'CANCELLED',
      }),

      // Today's orders
      Order.countDocuments({
        createdAt: {
          $gte: startOfToday,
          $lte: endOfToday,
        },
      }),

      // Today's sales
      Order.aggregate([
        {
          $match: {
            createdAt: {
              $gte: startOfToday,
              $lte: endOfToday,
            },
            orderStatus: {
              $ne: 'CANCELLED',
            },
          },
        },
        {
          $group: {
            _id: null,
            total: {
              $sum: '$totalAmount',
            },
          },
        },
      ]),
    ]);

    // =====================================================
    // PRODUCT COUNTS
    // =====================================================

    const [
      totalProducts,
      activeProducts,
      draftProducts,
      inactiveProducts,
      archivedProducts,
    ] = await Promise.all([
      Product.countDocuments(),

      Product.countDocuments({
        status: 'ACTIVE',
      }),

      Product.countDocuments({
        status: 'DRAFT',
      }),

      Product.countDocuments({
        status: 'INACTIVE',
      }),

      Product.countDocuments({
        status: 'ARCHIVED',
      }),
    ]);

    // =====================================================
    // CUSTOMERS
    // =====================================================

    const totalCustomers = await UserModel.countDocuments({
      role: 'USER',
    });

    // =====================================================
    // STANDARD PRODUCT STOCK
    // =====================================================

    const standardProducts = await Product.find({
      productType: 'STANDARD',
      status: {
        $ne: 'ARCHIVED',
      },
    }).select('standardStock');

    let standardLowStock = 0;
    let standardOutOfStock = 0;

    standardProducts.forEach((product) => {
      product.standardStock.forEach((variant) => {
        const stock = Number(variant.stockQuantity || 0);

        if (stock === 0) {
          standardOutOfStock++;
        } else if (stock <= LOW_STOCK_LIMIT) {
          standardLowStock++;
        }
      });
    });

    // =====================================================
    // COMPONENT STOCK
    // BASE
    // =====================================================

    const bases = await Base.find({}).select('colors');

    let baseLowStock = 0;
    let baseOutOfStock = 0;

    bases.forEach((base) => {
      base.colors.forEach((color) => {
        color.variants.forEach((variant) => {
          const stock = Number(variant.stockQuantity || 0);

          if (stock === 0) {
            baseOutOfStock++;
          } else if (stock <= LOW_STOCK_LIMIT) {
            baseLowStock++;
          }
        });
      });
    });

    // =====================================================
    // STRAP STOCK
    // =====================================================

    const straps = await Strap.find({}).select('colors');

    let strapLowStock = 0;
    let strapOutOfStock = 0;

    straps.forEach((strap) => {
      strap.colors.forEach((color) => {
        color.variants.forEach((variant) => {
          const stock = Number(variant.stockQuantity || 0);

          if (stock === 0) {
            strapOutOfStock++;
          } else if (stock <= LOW_STOCK_LIMIT) {
            strapLowStock++;
          }
        });
      });
    });

    // =====================================================
    // THUMB STOCK
    // =====================================================

    const thumbs = await Thumb.find({}).select('colors');

    let thumbLowStock = 0;
    let thumbOutOfStock = 0;

    thumbs.forEach((thumb) => {
      thumb.colors.forEach((color) => {
        color.variants.forEach((variant) => {
          const stock = Number(variant.stockQuantity || 0);

          if (stock === 0) {
            thumbOutOfStock++;
          } else if (stock <= LOW_STOCK_LIMIT) {
            thumbLowStock++;
          }
        });
      });
    });

    // =====================================================
    // FINAL STOCK COUNTS
    // =====================================================

    const lowStock =
      standardLowStock + baseLowStock + strapLowStock + thumbLowStock;

    const outOfStock =
      standardOutOfStock + baseOutOfStock + strapOutOfStock + thumbOutOfStock;

    // =====================================================
    // TODAY SALES
    // =====================================================

    const todaySales =
      todaySalesResult.length > 0 ? todaySalesResult[0].total : 0;

    // =====================================================
    // RESPONSE
    // =====================================================

    return res.status(200).json({
      success: true,
      error: false,

      data: {
        // Orders
        totalOrders,
        pendingOrders,
        processingOrders,
        shippedOrders,
        deliveredOrders,
        cancelledOrders,

        // Products
        totalProducts,
        activeProducts,
        draftProducts,
        inactiveProducts,
        archivedProducts,

        // Customers
        totalCustomers,

        // Today
        todayOrders,
        todaySales,

        // Inventory
        lowStock,
        outOfStock,

        // Detailed inventory
        standardLowStock,
        standardOutOfStock,

        baseLowStock,
        baseOutOfStock,

        strapLowStock,
        strapOutOfStock,

        thumbLowStock,
        thumbOutOfStock,
      },
    });
  } catch (error) {
    console.error('DASHBOARD STATS ERROR:', error);

    return res.status(500).json({
      success: false,
      error: true,
      message: error.message || 'Failed to fetch dashboard statistics.',
    });
  }
};
