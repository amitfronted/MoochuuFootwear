import express from 'express';
import auth from '../middlewares/auth.js';
import authorizeRoles from '../middlewares/authorizeRoles.js';

import {
  createStore,
  getAllStores,
  getAllStoresAdmin,
  getStoreById,
  updateStore,
  updateStoreStatus,
  deleteStore,
} from '../controllers/store.controller.js';

const storeRouter = express.Router();

// Public / E-commerce routes
storeRouter.get('/all', getAllStores);

// Admin-only routes
storeRouter.get(
  '/admin/all',
  auth,
  authorizeRoles('SUPER_ADMIN', 'ADMIN'),
  getAllStoresAdmin,
);

storeRouter.post(
  '/create',
  auth,
  authorizeRoles('SUPER_ADMIN', 'ADMIN'),
  createStore,
);

storeRouter.put(
  '/update/:id',
  auth,
  authorizeRoles('SUPER_ADMIN', 'ADMIN'),
  updateStore,
);

storeRouter.patch(
  '/status/:id',
  auth,
  authorizeRoles('SUPER_ADMIN', 'ADMIN'),
  updateStoreStatus,
);

storeRouter.delete(
  '/delete/:id',
  auth,
  authorizeRoles('SUPER_ADMIN', 'ADMIN'),
  deleteStore,
);

// Keep this parameterized route after the named routes.
storeRouter.get('/:id', getStoreById);

export default storeRouter;
