import UserModel from '../models/user.model.js';
import jwt from 'jsonwebtoken';

const generateRefreshToken = (userId) => {
  if (!process.env.SECRET_KEY_REFRESH_TOKEN) {
    throw new Error('SECRET_KEY_REFRESH_TOKEN is not defined');
  }
  const token = jwt.sign({ id: userId }, process.env.SECRET_KEY_REFRESH_TOKEN, {
    expiresIn: '7d',
  });

  // await UserModel.updateOne(
  //   { _id: userId },
  //   {
  //     $set: {
  //       refreshToken: token,
  //     },
  //   },
  // );

  return token;
};

export default generateRefreshToken;
