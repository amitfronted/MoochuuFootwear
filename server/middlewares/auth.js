import jwt from 'jsonwebtoken';
import UserModel from '../models/user.model.js';

const auth = async (request, response, next) => {
  try {
    const token =
      request.cookies.accessToken ||
      request.headers.authorization?.replace('Bearer ', '');

    if (!token) {
      return response.status(401).json({
        message: 'Please login first',
        error: true,
        success: false,
      });
    }

    const decoded = jwt.verify(token, process.env.SECRET_KEY_ACCESS_TOKEN);

    const user = await UserModel.findById(decoded.id).select(
      '-password -refreshToken -accessToken',
    );

    if (!user) {
      return response.status(401).json({
        message: 'User not found',
        error: true,
        success: false,
      });
    }

    request.user = user;

    request.userId = decoded.id;

    next();
  } catch (error) {
    console.error('Auth middleware error:', error);
    return response.status(401).json({
      message: 'Invalid or expired token',
      error: true,
      success: false,
    });
  }
};

export default auth;
