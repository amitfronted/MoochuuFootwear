import express from 'express';
import upload from '../middlewares/upload.js'; // Your multer file
import auth from '../middlewares/auth.js';
import authorizeRoles from '../middlewares/authorizeRoles.js';
import {
  uploadSingleImage,
  uploadMultipleImages,
} from '../controllers/upload.controller.js';

const uploadRouter = express.Router();

// Single file route
uploadRouter.post(
  '/single',
  auth,
  authorizeRoles('ADMIN', 'SUPER_ADMIN'),
  upload.single('image'),
  uploadSingleImage,
);

// Multiple files route (Up to 10 images for gallery)
uploadRouter.post(
  '/multiple',
  auth,
  authorizeRoles('ADMIN', 'SUPER_ADMIN'),
  upload.array('images', 10),
  uploadMultipleImages,
);

// Express Error Handler for Multer (File size & non-image rejection)
uploadRouter.use((error, req, res, next) => {
  if (error) {
    return res.status(400).json({
      success: false,
      error: true,
      message: error.message,
    });
  }
  next();
});

export default uploadRouter;
