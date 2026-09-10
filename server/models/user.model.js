import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Provide the user name'],
      trim: true,
    },
    email: {
      type: String,
      required: [true, 'Provide the Email Id'],
      unique: true,
      lowercase: true,
      trim: true,
    },
    password: {
      type: String,
      required: function () {
        return !this.signUpWithGoogle;
      },
      select: false,
    },
    avatar: {
      type: String,
      default: '',
    },
    mobile: {
      type: String,
      default: '',
    },
    verify_Email: {
      type: Boolean,
      default: false,
    },
    accessToken: {
      type: String,
      default: '',
    },
    refreshToken: {
      type: String,
      default: '',
    },
    last_login_date: {
      type: Date,
      default: null,
    },
    status: {
      type: String,
      enum: ['Active', 'InActive', 'Suspended'],
      default: 'Active',
    },
    address_details: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Address',
      },
    ],
    orderHistory: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Order',
      },
    ],
    otp: {
      type: String,
      default: null,
      select: false,
    },
    otpExpires: {
      type: Date,
      default: null,
      select: false,
    },
    forgotPasswordVerified: {
      type: Boolean,
      default: false,
      select: false,
    },
    passwordResetTokenHash: {
      type: String,
      default: null,
      select: false,
    },

    passwordResetTokenExpires: {
      type: Date,
      default: null,
      select: false,
    },
    role: {
      type: String,
      enum: ['SUPER_ADMIN', 'ADMIN', 'USER'],
      default: 'USER',
      index: true,
    },
    googleId: {
      type: String,
      unique: true,
      sparse: true,
    },
    signUpWithGoogle: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true },
);

// Pre-save middleware to automatically hash passwords before saving
userSchema.pre('save', async function () {
  if (!this.password || !this.isModified('password')) return;
  this.password = await bcrypt.hash(this.password, 10);
});

// Helper instance method to compare passwords during login
userSchema.methods.comparePassword = async function (enteredPassword) {
  if (!this.password) return false;
  return await bcrypt.compare(enteredPassword, this.password);
};

const UserModel = mongoose.model('User', userSchema);

export default UserModel;
