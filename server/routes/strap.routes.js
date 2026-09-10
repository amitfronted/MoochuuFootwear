import express from 'express';
import auth from '../middlewares/auth.js';
import authorizeRoles from '../middlewares/authorizeRoles.js';

import {
  createStrap,
  getAllStraps,
  updateStrap,
  deleteStrap,
  checkStrapArchive,
} from '../controllers/strap.controller.js';
import { updateComponentStock } from '../controllers/stock.controller.js';
const strapRouter = express.Router();

strapRouter.get('/all', getAllStraps);
strapRouter.post(
  '/create',
  auth,
  authorizeRoles('SUPER_ADMIN', 'ADMIN'),
  createStrap,
);
strapRouter.put(
  '/update/:id',
  auth,
  authorizeRoles('SUPER_ADMIN', 'ADMIN'),
  updateStrap,
);
strapRouter.put(
  '/stock/:componentId/:colorId/:variantId',
  auth,
  authorizeRoles('SUPER_ADMIN', 'ADMIN'),
  (req, res) =>
    updateComponentStock(
      { ...req, params: { ...req.params, type: 'strap' } },
      res,
    ),
);

strapRouter.get(
  '/archive-check/:id',
  auth,
  authorizeRoles('SUPER_ADMIN', 'ADMIN'),
  checkStrapArchive,
);
strapRouter.delete(
  '/delete/:id',
  auth,
  authorizeRoles('SUPER_ADMIN', 'ADMIN'),
  deleteStrap,
);

export default strapRouter;
