import { Router } from 'express';
import {
  deleteUser,
  forgotPasswordController,
  getAllUsers,
  googleLoginController,
  loginUserController,
  logoutUserController,
  refreshTokenController,
  registerUserController,
  resendOtpController,
  resetPasswordController,
  updatePassword,
  updateProfile,
  updateUserRole,
  userDetailsController,
  verifyEmailController,
  verifyForgotPasswordOtpController,
} from '../controllers/user.controller.js';
import auth from '../middlewares/auth.js';
import { updateAvatarController } from '../controllers/updateAvatarController.js';
import upload from '../middlewares/upload.js';
import authorizeRoles from '../middlewares/authorizeRoles.js';
import {
  loginLimiter,
  otpLimiter,
  passwordResetLimiter,
} from '../middlewares/authRateLimiter.js';

const userRouter = Router();
userRouter.post('/register', loginLimiter, registerUserController);
userRouter.post('/verifyEmail', otpLimiter, verifyEmailController);
userRouter.post('/resend-otp', otpLimiter, resendOtpController);
userRouter.post('/login', loginLimiter, loginUserController);
userRouter.post('/google-login', loginLimiter, googleLoginController);

userRouter.post('/refresh-token', refreshTokenController);

// Password Reset Routes
userRouter.post(
  '/forgot-password',
  passwordResetLimiter,
  forgotPasswordController,
);
userRouter.post(
  '/verify-forgot-password-otp',
  passwordResetLimiter,
  verifyForgotPasswordOtpController,
);
userRouter.post(
  '/reset-password',
  passwordResetLimiter,
  resetPasswordController,
);

//protected routes
userRouter.get('/logout', auth, logoutUserController);
userRouter.get('/user-details', auth, userDetailsController);
userRouter.put(
  '/update-avatar',
  auth,
  upload.single('avatar'),
  updateAvatarController,
);
userRouter.post('/update-profile', auth, updateProfile);
userRouter.post('/update-password', auth, updatePassword);

// get user
userRouter.get(
  '/all-user',
  auth,
  authorizeRoles('SUPER_ADMIN', 'ADMIN'),
  getAllUsers,
);

userRouter.put(
  '/update-role/:userId',
  auth,
  authorizeRoles('SUPER_ADMIN'),
  updateUserRole,
);

userRouter.delete(
  '/delete-user/:userId',
  auth,
  authorizeRoles('SUPER_ADMIN'),
  deleteUser,
);

export default userRouter;
