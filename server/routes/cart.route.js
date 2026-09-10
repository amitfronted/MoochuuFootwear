import express from 'express';

import {
  getCart,
  addToCart,
  updateCartItem,
  removeCartItem,
  clearCart,
  mergeGuestCart,
} from '../controllers/cart.controller.js';

import optionalAuth from '../middlewares/optionalAuth.middleware.js';
import auth from '../middlewares/auth.js';

const cartRouter = express.Router();

cartRouter.get('/', optionalAuth, getCart);

cartRouter.post('/add', optionalAuth, addToCart);

cartRouter.patch('/item/:itemId', optionalAuth, updateCartItem);

cartRouter.delete('/item/:itemId', optionalAuth, removeCartItem);

cartRouter.delete('/clear', optionalAuth, clearCart);

// Guest -> authenticated user cart merge
cartRouter.post('/merge', auth, mergeGuestCart);

export default cartRouter;
