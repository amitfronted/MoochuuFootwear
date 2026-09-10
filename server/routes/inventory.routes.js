import express from 'express';

import auth from '../middlewares/auth.js';
import authorizeRoles from '../middlewares/authorizeRoles.js';

import { getInventoryHistory } from '../controllers/inventory.controller.js';

const inventoryRouter = express.Router();

inventoryRouter.get(
  '/history',
  auth,
  authorizeRoles('SUPER_ADMIN', 'ADMIN'),
  getInventoryHistory,
);

export default inventoryRouter;
