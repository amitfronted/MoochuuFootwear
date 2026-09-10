import express from 'express';
import auth from '../middlewares/auth.js';
import authorizeRoles from '../middlewares/authorizeRoles.js';
import {
  createThumb,
  getAllThumbs,
  updateThumb,
  deleteThumb,
  checkThumbArchive,
} from '../controllers/thumb.controller.js';
import { updateComponentStock } from '../controllers/stock.controller.js';
const thumbRouter = express.Router();

thumbRouter.get('/all', getAllThumbs);
thumbRouter.post(
  '/create',
  auth,
  authorizeRoles('SUPER_ADMIN', 'ADMIN'),
  createThumb,
);
thumbRouter.put(
  '/update/:id',
  auth,
  authorizeRoles('SUPER_ADMIN', 'ADMIN'),
  updateThumb,
);
thumbRouter.put(
  '/stock/:componentId/:colorId/:variantId',
  auth,
  authorizeRoles('SUPER_ADMIN', 'ADMIN'),
  (req, res) =>
    updateComponentStock(
      { ...req, params: { ...req.params, type: 'thumb' } },
      res,
    ),
);
thumbRouter.get(
  '/archive-check/:id',
  auth,
  authorizeRoles('SUPER_ADMIN', 'ADMIN'),
  checkThumbArchive,
);
thumbRouter.delete(
  '/delete/:id',
  auth,
  authorizeRoles('SUPER_ADMIN', 'ADMIN'),
  deleteThumb,
);

export default thumbRouter;
