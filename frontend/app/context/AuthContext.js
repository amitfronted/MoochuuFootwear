'use client';
import { createContext, useContext, useEffect, useState } from 'react';
import api from '../lib/axios';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const getUserDetails = async () => {
    try {
      setError(null);
      const response = await api.get('/user/user-details');
      if (response.data?.success) {
        setUser(response.data.data.user);
      } else {
        setUser(null);
      }
    } catch (error) {
      if (error.response?.status === 401) {
        setUser(null);
      } else {
        console.error('Error fetching user details:', error);
      }
    } finally {
      setAuthLoading(false);
    }
  };

  useEffect(() => {
    getUserDetails();
  }, []);

  // Register User
  const register = async (name, email, password) => {
    try {
      setLoading(true);
      setError(null);
      const response = await api.post('/user/register', {
        name,
        email,
        password,
      });
      return response.data;
    } catch (error) {
      const message = error.response?.data?.message || 'Registration failed';

      setError(message);
      throw new Error(message);
    } finally {
      setLoading(false);
    }
  };

  // Verify Email OTP
  const verifyEmail = async (email, otp) => {
    setLoading(true);
    setError(null);
    try {
      const response = await api.post('/user/verifyEmail', { email, otp });
      return response.data;
    } catch (error) {
      const message = error.response?.data?.message || 'verification failed';
      setError(message);
      throw new Error(message);
    } finally {
      setLoading(false);
    }
  };

  // resend Email OTP
  const resendOtp = async (email) => {
    try {
      setLoading(true);
      setError(null);
      const response = await api.post('/user/resend-otp', { email });
      return response.data;
    } catch (error) {
      const message = error.response?.data?.message || 'Failed to resend otp';
      setError(message);
      throw new Error(message);
    } finally {
      setLoading(false);
    }
  };

  // merg guest cart

  const mergeGuestCart = async () => {
    if (typeof window === 'undefined') return null;

    const guestId = localStorage.getItem('guestId');

    if (!guestId) return null;

    try {
      const response = await api.post(
        '/cart/merge',
        { guestId },
        {
          headers: {
            'x-guest-id': guestId,
          },
        },
      );

      return response.data;
    } catch (error) {
      console.error('Guest cart merge failed:', error?.response?.data || error);

      return {
        success: false,
        message: error?.response?.data?.message || 'Guest cart merge failed',
      };
    }
  };

  // login User
  const login = async (email, password) => {
    try {
      setLoading(true);
      setError(null);
      const response = await api.post('/user/login', { email, password });
      if (response.data.success) {
        await mergeGuestCart();
        setUser(response.data.data.user);
        window.dispatchEvent(new Event('cart-updated'));
      }
      return response.data;
    } catch (error) {
      const message = error.response?.data?.message || 'Login Failed';
      setError(message);
      throw new Error(message);
    } finally {
      setLoading(false);
    }
  };

  // 5. Logout User
  const logout = async () => {
    try {
      await api.get('/user/logout');
    } finally {
      setUser(null);
    }
  };

  // 6. Forgot Password
  const forgotPassword = async (email) => {
    try {
      setLoading(true);
      setError(null);
      const response = await api.post('/user/forgot-password', { email });
      return response.data;
    } catch (error) {
      const message = error.response?.data?.message || 'Failed to send OTP';
      setError(message);
      throw new Error(message);
    } finally {
      setLoading(false);
    }
  };

  // 7. Verify Forgot Password OTP
  const verifyForgotPasswordOtp = async (email, otp) => {
    try {
      setLoading(true);
      setError(null);

      const response = await api.post('/user/verify-forgot-password-otp', {
        email,
        otp,
      });
      return response.data;
    } catch (error) {
      const message =
        error.response?.data?.message || 'OTP verification failed';

      setError(message);

      throw new Error(message);
    } finally {
      setLoading(false);
    }
  };

  // 8. Reset Password
  const resetPassword = async (email, newPassword, confirmPassword) => {
    try {
      setLoading(true);
      setError(null);

      const response = await api.post('/user/reset-password', {
        email,
        newPassword,
        confirmPassword,
      });
      return response.data;
    } catch (error) {
      const message = error.response?.data?.message || 'Password reset failed';

      setError(message);

      throw new Error(message);
    } finally {
      setLoading(false);
    }
  };

  // 9. google Login
  const googleLogin = async (credential) => {
    try {
      setLoading(true);
      const response = await api.post('/user/google-login', { credential });
      if (response.data.success) {
        await mergeGuestCart();
        setUser(response.data.data.user);
        window.dispatchEvent(new Event('cart-updated'));
      }
      return response.data;
    } catch (error) {
      const message = error.response?.data?.message || 'Google login failed';
      throw new Error(message);
    } finally {
      setLoading(false);
    }
  };

  const updateAvatar = async (file) => {
    try {
      setLoading(true);
      setError(null);

      const formData = new FormData();

      formData.append('avatar', file);

      const response = await api.put('/user/update-avatar', formData);

      if (response.data.success) {
        setUser(response.data.data.user);
      }

      return response.data;
    } catch (error) {
      const message =
        error.response?.data?.message ||
        error.message ||
        'Failed to update avatar';

      setError(message);

      throw new Error(message);
    } finally {
      setLoading(false);
    }
  };

  const updateProfile = async (name, mobile) => {
    try {
      setLoading(true);
      setError(null);

      const response = await api.post('/user/update-profile', {
        name,
        mobile,
      });

      if (response.data.success) {
        setUser(response.data.data.user);
      }

      return response.data;
    } catch (error) {
      const message = error.response?.data?.message || 'Profile update failed';

      setError(message);

      throw new Error(message);
    } finally {
      setLoading(false);
    }
  };

  const updatePassword = async (oldPassword, newPassword, confirmPassword) => {
    try {
      setLoading(true);
      setError(null);
      const response = await api.post('/user/update-password', {
        oldPassword,
        newPassword,
        confirmPassword,
      });
      return response.data;
    } catch (error) {
      const message =
        error.response?.data?.message || 'Failed to update password';

      setError(message);

      throw new Error(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        loading,
        user,
        error,
        authLoading,
        login,
        register,
        verifyEmail,
        resendOtp,
        resetPassword,
        verifyForgotPasswordOtp,
        logout,
        forgotPassword,
        getUserDetails,
        googleLogin,
        updateAvatar,
        updateProfile,
        updatePassword,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
