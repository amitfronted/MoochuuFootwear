import rateLimit from 'express-rate-limit';

export const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10,

  standardHeaders: true,
  legacyHeaders: false,

  message: {
    success: false,
    error: true,
    message: 'Too many login attempts. Please try again after 15 minutes.',
  },
});

export const otpLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,

  standardHeaders: true,
  legacyHeaders: false,

  message: {
    success: false,
    error: true,
    message: 'Too many OTP requests. Please try again later.',
  },
});

export const passwordResetLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,

  standardHeaders: true,
  legacyHeaders: false,

  message: {
    success: false,
    error: true,
    message: 'Too many password reset attempts. Please try again later.',
  },
});
