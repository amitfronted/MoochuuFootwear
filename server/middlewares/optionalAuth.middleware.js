import jwt from 'jsonwebtoken';
import UserModel from '../models/user.model.js';

const optionalAuth = async (req, res, next) => {
  try {
    const cookieToken = req.cookies?.accessToken;

    const headerToken = req.headers.authorization?.startsWith('Bearer ')
      ? req.headers.authorization.split(' ')[1]
      : null;

    const token = cookieToken || headerToken;

    // No login is completely valid for cart routes
    if (!token) {
      return next();
    }

    try {
      const decoded = jwt.verify(token, process.env.SECRET_KEY_ACCESS_TOKEN);

      const user = await UserModel.findById(decoded.id).select(
        '-password -refreshToken -accessToken',
      );

      if (user) {
        req.user = user;
        req.userId = decoded.id;
      }
    } catch (error) {
      // Invalid/expired token should behave as guest
      console.log('Optional auth token invalid:', error.message);
    }

    next();
  } catch (error) {
    console.error('Optional auth middleware error:', error);

    next();
  }
};

export default optionalAuth;
