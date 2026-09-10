import express from 'express';
import {
  addAddressController,
  updateAddreesController,
  deleteAddressController,
  getAddressController,
} from '../controllers/address.controller.js';
import auth from '../middlewares/auth.js';

const addressRouter = express.Router();

addressRouter.post('/add-address', auth, addAddressController);
addressRouter.put('/update/:addressId', auth, updateAddreesController);
addressRouter.delete('/delete/:addressId', auth, deleteAddressController);
addressRouter.get('/', auth, getAddressController);

export default addressRouter;
