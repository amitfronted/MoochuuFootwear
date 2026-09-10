import { OAuth2Client } from 'google-auth-library';
import UserModel from '../models/user.model.js';
import sendEmailFun from '../config/sendEmail.js';
import verificationEmail from '../utils/verifyEmailTemplate.js';
import generateAccessToken from '../utils/generateAccessToken.js';
import forgotPasswordTemplate from '../utils/forgotPasswordTemplate.js';
import generateRefreshToken from '../utils/generateRefreshToken.js';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';

const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

export async function registerUserController(request, response) {
  try {
    const { name, email, password } = request.body;

    if (!name || !email || !password) {
      return response.status(400).json({
        message: 'Provide name, email and password',
        error: true,
        success: false,
      });
    }

    // Check if user already exists
    const existingUser = await UserModel.findOne({ email });
    if (existingUser) {
      return response.status(400).json({
        message: 'User already registered with this email',
        error: true,
        success: false,
      });
    }

    // Generate 6-digit OTP
    const verifyCode = Math.floor(100000 + Math.random() * 900000).toString();

    // Create new user (Password will be automatically hashed by UserModel pre-save hook)
    const user = new UserModel({
      email,
      password,
      name,
      otp: verifyCode,
      otpExpires: new Date(Date.now() + 10 * 60 * 1000), // 10 minutes from now
    });

    await user.save();

    // Send verification email
    await sendEmailFun({
      sendTo: email,
      subject: 'Verify email from Moochuu India for Registration',
      text: '',
      html: verificationEmail(name, verifyCode),
    });

    // Generate Temporary Access Token
    const token = generateAccessToken(user._id);

    return response.status(201).json({
      success: true,
      error: false,
      message:
        'User registered successfully! Please verify your email via OTP.',
      token,
      userId: user._id,
    });
  } catch (error) {
    return response.status(500).json({
      success: false,
      error: true,
      message: error.message || error,
    });
  }
}

export async function verifyEmailController(request, response) {
  try {
    const { email, otp } = request.body;

    // Validate request
    if (!email || !otp) {
      return response.status(400).json({
        message: 'Provide email and OTP',
        error: true,
        success: false,
      });
    }

    // Find user and explicitly select OTP fields if they use select: false
    const user = await UserModel.findOne({ email }).select('+otp +otpExpires');

    if (!user) {
      return response.status(404).json({
        success: false,
        error: true,
        message: 'User not found',
      });
    }

    // Check whether OTP exists
    if (!user.otp || !user.otpExpires) {
      return response.status(400).json({
        message: 'OTP not found. Please request a new OTP.',
        error: true,
        success: false,
      });
    }

    // Check OTP
    const isCodeValid = user.otp === String(otp);

    if (!isCodeValid) {
      return response.status(400).json({
        message: 'Invalid OTP',
        error: true,
        success: false,
      });
    }

    // Check expiry
    const isNotExpired = new Date(user.otpExpires).getTime() > Date.now();

    if (!isNotExpired) {
      return response.status(400).json({
        message: 'OTP has expired',
        error: true,
        success: false,
      });
    }

    // Verify email and clear OTP
    await UserModel.updateOne(
      { _id: user._id },
      {
        $set: {
          verify_Email: true,
          otp: null,
          otpExpires: null,
        },
      },
    );

    return response.status(200).json({
      message: 'Email verified successfully',
      error: false,
      success: true,
    });
  } catch (error) {
    console.error('Verify email error:', error);

    return response.status(500).json({
      success: false,
      error: true,
      message: error.message || 'Something went wrong',
    });
  }
}

export async function resendOtpController(request, response) {
  try {
    const { email } = request.body;

    if (!email) {
      return response.status(400).json({
        message: 'Provide email address',
        error: true,
        success: false,
      });
    }

    const user = await UserModel.findOne({ email });

    if (!user) {
      return response.status(404).json({
        message: 'User not found with this email',
        error: true,
        success: false,
      });
    }

    if (user.verify_Email) {
      return response.status(400).json({
        message: 'Email is already verified',
        error: true,
        success: false,
      });
    }

    // Generate new 6-digit OTP
    const newVerifyCode = Math.floor(
      100000 + Math.random() * 900000,
    ).toString();
    const otpExpires = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes from now

    // Update DB bypassing pre('save') hook to avoid accidental password hashing
    await UserModel.updateOne(
      { _id: user._id },
      {
        $set: {
          otp: newVerifyCode,
          otpExpires: otpExpires,
        },
      },
    );

    // Send email with new OTP
    await sendEmailFun({
      sendTo: email,
      subject: 'New OTP - Verify email from Moochuu India',
      text: '',
      html: verificationEmail(user.name, newVerifyCode),
    });

    return response.status(200).json({
      message: 'New OTP sent successfully to your email',
      error: false,
      success: true,
    });
  } catch (error) {
    return response.status(500).json({
      message: error.message || error,
      error: true,
      success: false,
    });
  }
}

export async function loginUserController(request, response) {
  try {
    const { email, password } = request.body;
    //console.log('1. Login request:', email);

    if (!email || !password) {
      return response.status(400).json({
        message: 'Provide email and password',
        error: true,
        success: false,
      });
    }

    // Explicitly select password since it has `select: false` in UserModel
    const user = await UserModel.findOne({
      email,
    }).select('+password');
    //console.log('2. User found:', !!user);

    if (!user) {
      return response.status(400).json({
        message: 'User not registered',
        error: true,
        success: false,
      });
    }

    // console.log('3. Status:', user.status);
    // console.log('4. Email verified:', user.verify_Email);
    // console.log('5. Password exists:', !!user.password);

    if (user.status !== 'Active') {
      return response.status(400).json({
        message:
          'Your account is suspended or inactive. Please contact support.',
        error: true,
        success: false,
      });
    }

    if (!user.verify_Email) {
      return response.status(400).json({
        message: 'Email is not verified. Please verify your email first.',
        error: true,
        success: false,
      });
    }

    //console.log('6. Comparing password...');

    // Validate password using instance method on UserModel
    const isPasswordMatch = await user.comparePassword(password);

    //console.log('7. Password match:', isPasswordMatch);

    if (!isPasswordMatch) {
      return response.status(400).json({
        message: 'Invalid email or password',
        error: true,
        success: false,
      });
    }

    //console.log('8. Generating access token...');

    // Generate Tokens
    const accessToken = generateAccessToken(user._id);
    //console.log('Access token generated:', !!accessToken);

    //console.log('9. Generating refresh token...');
    const refreshToken = await generateRefreshToken(user._id);
    //console.log('Refresh token generated:', !!refreshToken);

    //console.log('10. Tokens generated successfully');
    // Update last login timestamp and saved tokens without triggering pre-save hook
    await UserModel.updateOne(
      { _id: user._id },
      {
        $set: {
          last_login_date: new Date(),
          accessToken: accessToken,
          refreshToken: refreshToken,
        },
      },
    );

    //console.log('11. User updated');

    // Cookie Options Configuration
    const cookiesOption = {
      httpOnly: true, // Prevents XSS attacks (JavaScript cannot access)
      secure: process.env.NODE_ENV === 'production', // Requires HTTPS in production
      sameSite: process.env.NODE_ENV === 'production' ? 'None' : 'Lax', // Cross-site cookie handling
    };

    // Set HTTP-Only Cookies
    response.cookie('accessToken', accessToken, {
      ...cookiesOption,
      maxAge: 24 * 60 * 60 * 1000, // 24 Hours
    });

    response.cookie('refreshToken', refreshToken, {
      ...cookiesOption,
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 Days
    });

    // Sanitized user details for response
    const userData = {
      _id: user._id,
      name: user.name,
      email: user.email,
      avatar: user.avatar,
      mobile: user.mobile,
      role: user.role,
      status: user.status,
      verify_Email: user.verify_Email,
    };

    return response.status(200).json({
      message: 'Login successfully',
      error: false,
      success: true,
      data: {
        //accessToken,
        //refreshToken,
        user: userData,
      },
    });
  } catch (error) {
    console.error('LOGIN ERROR:', error);
    return response.status(500).json({
      message: error.message || 'Internal server-error',
      error: true,
      success: false,
    });
  }
}

export async function googleLoginController(request, response) {
  try {
    const { credential } = request.body;

    if (!credential) {
      return response.status(400).json({
        message: 'Google credential token is required',
        error: true,
        success: false,
      });
    }

    // Verify Google ID Token
    const ticket = await client.verifyIdToken({
      idToken: credential,
      audience: process.env.GOOGLE_CLIENT_ID,
    });

    const payload = ticket.getPayload();

    const { email, name, picture, sub: googleId, email_verified } = payload;

    // Check Google email verification
    if (!email_verified) {
      return response.status(400).json({
        message: 'Google email is not verified',
        error: true,
        success: false,
      });
    }

    // First find user using Google ID
    let user = await UserModel.findOne({
      googleId,
    });

    // If not found, check by email
    if (!user) {
      user = await UserModel.findOne({
        email,
      });
    }

    // =========================
    // GOOGLE SIGNUP
    // =========================
    if (!user) {
      user = new UserModel({
        name,
        email,
        googleId,
        avatar: picture,
        verify_Email: true,
        signUpWithGoogle: true,
        status: 'Active',
      });

      await user.save();
    }

    // =========================
    // EXISTING USER
    // =========================
    else {
      // Connect Google ID if user doesn't already have one
      if (!user.googleId) {
        await UserModel.updateOne(
          { _id: user._id },
          {
            $set: {
              googleId,
            },
          },
        );

        user.googleId = googleId;
      }

      // Update Google profile image if needed
      if (!user.avatar && picture) {
        await UserModel.updateOne(
          { _id: user._id },
          {
            $set: {
              avatar: picture,
            },
          },
        );

        user.avatar = picture;
      }
    }

    // Check account status
    if (user.status !== 'Active') {
      return response.status(400).json({
        message: 'Your account is suspended or inactive',
        error: true,
        success: false,
      });
    }

    // =========================
    // GENERATE TOKENS
    // =========================
    const accessToken = generateAccessToken(user._id);

    const refreshToken = generateRefreshToken(user._id);

    // Update user login details
    await UserModel.updateOne(
      { _id: user._id },
      {
        $set: {
          last_login_date: new Date(),
          accessToken,
          refreshToken,
          verify_Email: true,
        },
      },
    );

    // =========================
    // COOKIE OPTIONS
    // =========================
    const cookiesOption = {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: process.env.NODE_ENV === 'production' ? 'None' : 'Lax',
    };

    response.cookie('accessToken', accessToken, {
      ...cookiesOption,
      maxAge: 24 * 60 * 60 * 1000,
    });

    response.cookie('refreshToken', refreshToken, {
      ...cookiesOption,
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    // User data
    const userData = {
      _id: user._id,
      name: user.name,
      email: user.email,
      avatar: user.avatar,
      mobile: user.mobile,
      role: user.role,
      status: user.status,
      verify_Email: true,
      signUpWithGoogle: user.signUpWithGoogle,
    };

    return response.status(200).json({
      message: 'Google login successful',
      error: false,
      success: true,
      data: {
        user: userData,
      },
    });
  } catch (error) {
    console.error('GOOGLE LOGIN ERROR:', error);

    return response.status(500).json({
      message: error.message || 'Google authentication failed',
      error: true,
      success: false,
    });
  }
}

export async function logoutUserController(request, response) {
  try {
    const userid = request.userId; // Provided by auth middleware

    const cookiesOption = {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: process.env.NODE_ENV === 'production' ? 'None' : 'Lax',
    };

    // Clear cookies on client side
    response.clearCookie('accessToken', cookiesOption);
    response.clearCookie('refreshToken', cookiesOption);

    // Clear stored tokens in database
    await UserModel.updateOne(
      { _id: userid },
      {
        $set: {
          accessToken: '',
          refreshToken: '',
        },
      },
    );

    return response.status(200).json({
      message: 'Logged out successfully',
      error: false,
      success: true,
    });
  } catch (error) {
    return response.status(500).json({
      message: error.message || error,
      error: true,
      success: false,
    });
  }
}

export async function refreshTokenController(request, response) {
  try {
    // Extract token from HTTP-only cookie, header, or body
    const refreshToken =
      request.cookies?.refreshToken ||
      request.headers?.authorization?.split(' ')[1] ||
      request.body?.refreshToken;

    if (!refreshToken) {
      return response.status(401).json({
        message: 'Refresh token is missing. Please log in again.',
        error: true,
        success: false,
      });
    }

    // Verify token signature & expiry
    let verifyToken;
    try {
      verifyToken = jwt.verify(
        refreshToken,
        process.env.SECRET_KEY_REFRESH_TOKEN,
      );
    } catch (err) {
      return response.status(401).json({
        message: 'Invalid or expired refresh token',
        error: true,
        success: false,
      });
    }

    const userId = verifyToken.id;

    // Find user and verify token matches what is stored in DB
    const user = await UserModel.findById(userId);

    if (!user || user.refreshToken !== refreshToken) {
      return response.status(401).json({
        message: 'Invalid session or refresh token has been revoked',
        error: true,
        success: false,
      });
    }

    // Generate new Access Token
    const newAccessToken = await generateAccessToken(user._id);

    // Save updated token to user document
    await UserModel.updateOne(
      { _id: user._id },
      { $set: { accessToken: newAccessToken } },
    );

    const cookiesOption = {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: process.env.NODE_ENV === 'production' ? 'None' : 'Lax',
    };

    // Update Access Token cookie
    response.cookie('accessToken', newAccessToken, {
      ...cookiesOption,
      maxAge: 24 * 60 * 60 * 1000, // 24 Hours
    });

    return response.status(200).json({
      message: 'Access token refreshed successfully',
      error: false,
      success: true,
      data: {
        accessToken: newAccessToken,
      },
    });
  } catch (error) {
    return response.status(500).json({
      message: error.message || error,
      error: true,
      success: false,
    });
  }
}

export async function forgotPasswordController(request, response) {
  try {
    const email = request.body.email?.trim().toLowerCase();

    if (!email) {
      return response.status(400).json({
        message: 'Provide email address',
        error: true,
        success: false,
      });
    }

    const user = await UserModel.findOne({ email });

    // Do not reveal whether an email exists
    if (!user) {
      return response.status(200).json({
        message:
          'If an account exists with this email, a password reset OTP has been sent.',
        error: false,
        success: true,
      });
    }

    // Google-only accounts should not use password reset
    if (user.signUpWithGoogle && !user.password) {
      return response.status(200).json({
        message:
          'If an account exists with this email, a password reset OTP has been sent.',
        error: false,
        success: true,
      });
    }

    const otp = crypto.randomInt(100000, 1000000).toString();

    const otpExpires = new Date(Date.now() + 10 * 60 * 1000);

    await UserModel.updateOne(
      { _id: user._id },
      {
        $set: {
          otp,
          otpExpires,
          forgotPasswordVerified: false,

          // Clear any previous reset token
          passwordResetTokenHash: null,
          passwordResetTokenExpires: null,
        },
      },
    );

    await sendEmailFun({
      sendTo: email,
      subject: 'Password Reset OTP - Moochuu India',
      text: '',
      html: forgotPasswordTemplate(user.name, otp),
    });

    return response.status(200).json({
      message:
        'If an account exists with this email, a password reset OTP has been sent.',
      error: false,
      success: true,
    });
  } catch (error) {
    return response.status(500).json({
      message: 'Unable to process password reset request.',
      error: true,
      success: false,
    });
  }
}

export async function verifyForgotPasswordOtpController(request, response) {
  try {
    const email = request.body.email?.trim().toLowerCase();
    const otp = request.body.otp?.trim();

    if (!email || !otp) {
      return response.status(400).json({
        message: 'Provide email and OTP',
        error: true,
        success: false,
      });
    }

    const user = await UserModel.findOne({ email }).select(
      '+otp +otpExpires +forgotPasswordVerified',
    );

    if (!user) {
      return response.status(400).json({
        message: 'Invalid email or OTP',
        error: true,
        success: false,
      });
    }

    const isCodeValid = user.otp === otp;

    const isNotExpired =
      user.otpExpires && new Date(user.otpExpires).getTime() > Date.now();

    if (!isCodeValid) {
      return response.status(400).json({
        message: 'Invalid OTP',
        error: true,
        success: false,
      });
    }

    if (!isNotExpired) {
      return response.status(400).json({
        message: 'OTP has expired',
        error: true,
        success: false,
      });
    }

    // Generate secure one-time reset token
    const resetToken = crypto.randomBytes(32).toString('hex');

    // Store only hash in DB
    const passwordResetTokenHash = crypto
      .createHash('sha256')
      .update(resetToken)
      .digest('hex');

    const passwordResetTokenExpires = new Date(Date.now() + 10 * 60 * 1000);

    await UserModel.updateOne(
      {
        _id: user._id,
        otp,
        otpExpires: { $gt: new Date() },
      },
      {
        $set: {
          forgotPasswordVerified: true,
          passwordResetTokenHash,
          passwordResetTokenExpires,

          // OTP cannot be reused
          otp: null,
          otpExpires: null,
        },
      },
    );

    return response.status(200).json({
      message: 'OTP verified successfully',
      error: false,
      success: true,

      data: {
        resetToken,
        expiresIn: 10 * 60,
      },
    });
  } catch (error) {
    return response.status(500).json({
      message: 'Unable to verify OTP',
      error: true,
      success: false,
    });
  }
}

export async function resetPasswordController(request, response) {
  try {
    const email = request.body.email?.trim().toLowerCase();
    const resetToken = request.body.resetToken?.trim();
    const newPassword = request.body.newPassword;
    const confirmPassword = request.body.confirmPassword;

    if (!email || !resetToken || !newPassword || !confirmPassword) {
      return response.status(400).json({
        message:
          'Provide email, reset token, new password and confirm password',
        error: true,
        success: false,
      });
    }

    if (newPassword !== confirmPassword) {
      return response.status(400).json({
        message: 'New password and confirm password do not match',
        error: true,
        success: false,
      });
    }

    if (newPassword.length < 8) {
      return response.status(400).json({
        message: 'Password must be at least 8 characters long',
        error: true,
        success: false,
      });
    }

    // Hash token received from frontend
    const resetTokenHash = crypto
      .createHash('sha256')
      .update(resetToken)
      .digest('hex');

    const user = await UserModel.findOne({
      email,
    }).select(
      '+passwordResetTokenHash +passwordResetTokenExpires +forgotPasswordVerified',
    );

    if (!user) {
      return response.status(400).json({
        message: 'Invalid or expired reset token',
        error: true,
        success: false,
      });
    }

    // Google-only account
    if (user.signUpWithGoogle && !user.password) {
      return response.status(400).json({
        message: 'Google registered accounts cannot reset passwords.',
        error: true,
        success: false,
      });
    }

    if (!user.forgotPasswordVerified) {
      return response.status(403).json({
        message: 'Please verify your OTP first',
        error: true,
        success: false,
      });
    }

    if (!user.passwordResetTokenHash || !user.passwordResetTokenExpires) {
      return response.status(400).json({
        message: 'Invalid or expired reset token',
        error: true,
        success: false,
      });
    }

    if (new Date(user.passwordResetTokenExpires).getTime() <= Date.now()) {
      return response.status(400).json({
        message: 'Reset token has expired',
        error: true,
        success: false,
      });
    }

    // Constant-time token comparison
    const storedHash = Buffer.from(user.passwordResetTokenHash, 'hex');

    const suppliedHash = Buffer.from(resetTokenHash, 'hex');

    const tokenValid =
      storedHash.length === suppliedHash.length &&
      crypto.timingSafeEqual(storedHash, suppliedHash);

    if (!tokenValid) {
      return response.status(400).json({
        message: 'Invalid or expired reset token',
        error: true,
        success: false,
      });
    }

    // Hash password manually because we use findOneAndUpdate
    const salt = await bcrypt.genSalt(10);

    const hashedPassword = await bcrypt.hash(newPassword, salt);

    /*
     * Atomic update:
     * The token can only be used once.
     */
    const updatedUser = await UserModel.findOneAndUpdate(
      {
        _id: user._id,
        passwordResetTokenHash: resetTokenHash,
        passwordResetTokenExpires: {
          $gt: new Date(),
        },
        forgotPasswordVerified: true,
      },
      {
        $set: {
          password: hashedPassword,

          // Invalidate all existing sessions
          accessToken: '',
          refreshToken: '',

          // Clear reset state
          passwordResetTokenHash: null,
          passwordResetTokenExpires: null,
          forgotPasswordVerified: false,

          // Clear OTP state
          otp: null,
          otpExpires: null,
        },
      },
      {
        new: true,
      },
    );

    if (!updatedUser) {
      return response.status(400).json({
        message: 'Invalid or expired reset token',
        error: true,
        success: false,
      });
    }

    // Clear authentication cookies
    response.clearCookie('accessToken');
    response.clearCookie('refreshToken');

    return response.status(200).json({
      message: 'Password reset successfully. Please login again.',
      error: false,
      success: true,
    });
  } catch (error) {
    console.error('resetPasswordController error:', error);

    return response.status(500).json({
      message: 'Unable to reset password',
      error: true,
      success: false,
    });
  }
}

export async function userDetailsController(request, response) {
  try {
    const user = request.user;

    return response.status(200).json({
      message: 'User details fetched successfully',
      error: false,
      success: true,
      data: {
        user,
      },
    });
  } catch (error) {
    return response.status(500).json({
      message: error.message || 'Something went wrong',
      error: true,
      success: false,
    });
  }
}

export async function updateProfile(request, response) {
  try {
    const userId = request.userId; // Extracted from your auth middleware

    const { name, mobile } = request.body;

    if (!name?.trim() || !mobile?.trim()) {
      return response.status(400).json({
        message: 'Please provide name or mobile no to update',
        error: true,
        success: false,
      });
    }
    const user = await UserModel.findById(userId);

    if (!user) {
      return response.status(400).json({
        success: false,
        error: true,
        message: 'user not found',
      });
    }

    user.name = name.trim();
    user.mobile = mobile.trim();

    await user.save();

    return response.status(200).json({
      success: true,
      error: false,
      message: 'Profile Update Successfully',
      data: {
        user: {
          _id: user._id,
          name: user.name,
          email: user.email,
          mobile: user.mobile,
          avatar: user.avatar,
          role: user.role,
          signUpWithGoogle: user.signUpWithGoogle,
        },
      },
    });
  } catch (error) {
    return response.status(500).json({
      success: false,
      error: true,
      message: error.message || 'Failed to update profile',
    });
  }
}

export const updatePassword = async (req, res) => {
  try {
    const userId = req.userId; // Extracted from auth middleware
    const { oldPassword, newPassword, confirmPassword } = req.body;

    // 1. Validate required fields
    if (!oldPassword || !newPassword || !confirmPassword) {
      return res.status(400).json({
        success: false,
        error: true,
        message:
          'Please provide old password, new password, and confirm password.',
      });
    }

    // 2. Check if new passwords match
    if (newPassword !== confirmPassword) {
      return res.status(400).json({
        success: false,
        error: true,
        message: 'New password and confirm password do not match.',
      });
    }

    // 3. Fetch user including hidden password field
    const user = await UserModel.findById(userId).select('+password');

    if (!user) {
      return res.status(404).json({
        success: false,
        error: true,
        message: 'User not found.',
      });
    }

    // 4. Block Google OAuth users from password operations
    if (user.signUpWithGoogle) {
      return res.status(400).json({
        success: false,
        error: true,
        message: 'Google registered accounts cannot change passwords.',
      });
    }

    // 5. Verify old password using schema method
    const isMatch = await user.comparePassword(oldPassword);
    if (!isMatch) {
      return res.status(400).json({
        success: false,
        error: true,
        message: 'Incorrect current password.',
      });
    }

    // 6. Update password (pre-save middleware automatically hashes this)
    user.password = newPassword;
    await user.save();

    return res.status(200).json({
      success: true,
      error: false,
      message: 'Password updated successfully.',
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: true,
      message: error.message || 'Failed to update password.',
    });
  }
};

export const getAllUsers = async (req, res) => {
  try {
    const users = await UserModel.find().select(
      '-password -accessToken -refreshToken -otp',
    );
    return res.status(200).json({
      success: true,
      message: 'Users fatched Successfully',
      data: users,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

export const updateUserRole = async (req, res) => {
  try {
    const { userId } = req.params;
    const { role } = req.body;
    const allowedRoles = ['ADMIN', 'USER'];
    if (!allowedRoles.includes(role)) {
      return res.status(400).json({
        success: false,
        message: 'Invaloid role',
      });
    }
    const user = await UserModel.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User Not Found',
      });
    }

    //prevent changing Super Admin role
    if (user.role === 'SUPER_ADMIN') {
      return res.status(403).json({
        success: false,
        message: 'Super Admin role cannot be changed',
      });
    }
    user.role = role;
    await user.save();

    return res.status(200).json({
      success: true,
      message: `User role update to ${role}`,
      data: user,
    });
  } catch (error) {
    return res.status(500).json({
      success: true,
      message: error.message,
    });
  }
};

export const deleteUser = async (req, res) => {
  try {
    const { userId } = req.params;
    const user = await UserModel.findById(userId);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User Not Found',
      });
    }

    //Prevent deleting Super Admin
    if (user.role === 'SUPER_ADMIN') {
      return res.status(403).json({
        success: false,
        message: 'Super Admin cannot be deleted',
      });
    }

    // Prevent Super Admin from deleting themselves
    if (user._id.toString() === req.user._id.toString()) {
      return res.status(400).json({
        success: false,
        message: 'You cannot delete your own account',
      });
    }

    await UserModel.findByIdAndDelete(userId);

    return res.status(200).json({
      success: true,
      message: 'User deleted successfully',
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};
