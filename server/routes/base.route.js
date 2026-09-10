import express from 'express';
import auth from '../middlewares/auth.js';
import authorizeRoles from '../middlewares/authorizeRoles.js';
import {
  createBase,
  getAllBases,
  updateBase,
  deleteBase,
  checkBaseArchive,
} from '../controllers/base.controller.js';
import { updateComponentStock } from '../controllers/stock.controller.js';
const baseRouter = express.Router();

baseRouter.get('/all', getAllBases);
baseRouter.post(
  '/create',
  auth,
  authorizeRoles('SUPER_ADMIN', 'ADMIN'),
  createBase,
);
baseRouter.put(
  '/update/:id',
  auth,
  authorizeRoles('SUPER_ADMIN', 'ADMIN'),
  updateBase,
);
baseRouter.put(
  '/stock/:componentId/:colorId/:variantId',
  auth,
  authorizeRoles('SUPER_ADMIN', 'ADMIN'),
  (req, res) =>
    updateComponentStock(
      { ...req, params: { ...req.params, type: 'base' } },
      res,
    ),
);
baseRouter.get(
  '/archive-check/:id',
  auth,
  authorizeRoles('SUPER_ADMIN', 'ADMIN'),
  checkBaseArchive,
);
baseRouter.delete(
  '/delete/:id',
  auth,
  authorizeRoles('SUPER_ADMIN', 'ADMIN'),
  deleteBase,
);

export default baseRouter;
