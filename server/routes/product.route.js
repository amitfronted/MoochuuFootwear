import express from 'express';
import auth from '../middlewares/auth.js';
import authorizeRoles from '../middlewares/authorizeRoles.js';
import {
  createProduct,
  getAllProducts,
  getAllProductsAdmin,
  getProductById,
  updateProduct,
  deleteProduct,
  updateProductStatus,
  checkProductActivation,
} from '../controllers/product.controller.js';
import { updateStandardProductStock } from '../controllers/stock.controller.js';
import upload from '../middlewares/upload.js';

const productRouter = express.Router();

// Public / E-commerce Routes
productRouter.get('/all', getAllProducts);
// *Admin Product List*
productRouter.get(
  '/admin/all',
  auth,
  authorizeRoles('SUPER_ADMIN', 'ADMIN'),
  getAllProductsAdmin,
);
productRouter.get('/:id', getProductById);

// Admin-Only Routes
productRouter.post(
  '/create',
  auth,
  authorizeRoles('SUPER_ADMIN', 'ADMIN'),
  createProduct,
);
productRouter.put(
  '/update/:id',
  auth,
  authorizeRoles('SUPER_ADMIN', 'ADMIN'),
  upload.fields([
    {
      name: 'mainImageFile',
      maxCount: 1,
    },
    {
      name: 'galleryImages',
      maxCount: 20,
    },
  ]),
  updateProduct,
);

productRouter.get(
  '/activation-check/:id',
  auth,
  authorizeRoles('SUPER_ADMIN', 'ADMIN'),
  checkProductActivation,
);

productRouter.patch(
  '/status/:id',
  auth,
  authorizeRoles('SUPER_ADMIN', 'ADMIN'),
  updateProductStatus,
  checkProductActivation,
);

productRouter.delete(
  '/delete/:id',
  auth,
  authorizeRoles('SUPER_ADMIN', 'ADMIN'),
  deleteProduct,
);

productRouter.put(
  '/:productId/standard-stock/:variantId',
  auth,
  authorizeRoles('SUPER_ADMIN', 'ADMIN'),
  updateStandardProductStock,
);

export default productRouter;
