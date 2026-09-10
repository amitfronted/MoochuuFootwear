'use client';
import { createContext, useContext, useEffect, useState, useMemo } from 'react';
import api from '../lib/axios';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [user, setUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);

  const getUserDetails = async () => {
    try {
      setError(null);
      const response = await api.get('/user/user-details');
      if (response.data?.success) {
        const loggedUser = response.data.data.user;
        setUser(loggedUser);
        return loggedUser;
      }
      setUser(null);
      return null;
    } catch (error) {
      if (error.response?.status === 401) {
        setUser(null);
      } else {
        console.error('Error fetching user details:', error);
        setUser(null);
      }

      return null;
    } finally {
      setAuthLoading(false);
    }
  };

  useEffect(() => {
    getUserDetails();
  }, []);

  //register user
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
      const message =
        error.response?.data?.message ||
        error.response?.data?.error ||
        'Register Failed';

      setError(message);

      throw new Error(message);
    } finally {
      setLoading(false);
    }
  };

  // Veerify Email otp
  const verifyEmail = async (email, otp) => {
    try {
      setLoading(true);
      setError(null);
      const response = await api.post('/user/verifyEmail', { email, otp });
      return response.data;
    } catch (error) {
      const message = error.response?.data?.message || 'Verifaction Failed';
      setError(message);
      throw new Error(message);
    } finally {
      setLoading(false);
    }
  };

  //resend Otp
  const resendOtp = async (email) => {
    try {
      setLoading(true);
      setError(null);
      const response = await api.post('user/resend-otp', { email });
      return response.data;
    } catch (error) {
      const message = error.response?.data?.message || 'Failed to resend otp';
      setError(message);
      throw new Error(message);
    } finally {
      setLoading(false);
    }
  };

  // Login User
  const login = async (email, password) => {
    try {
      setLoading(true);
      setError(null);
      const response = await api.post('/user/login', { email, password });
      if (response.data.success) {
        setUser(response.data.data.user);
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

  // Log Out User
  const logout = async () => {
    try {
      await api.get('/user/logout');
    } catch (error) {
      return error;
    } finally {
      setUser(null);
    }
  };

  //forgot password
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

  // Verify forgot password otp
  const verifyForgotPasswordOtp = async (email, otp) => {
    try {
      setLoading(true);
      setError(false);
      const response = await api.post('/user/verify-forgot-password-otp', {
        email,
        otp,
      });
      return response.data;
    } catch (error) {
      const message =
        error.response?.data?.message || 'OTP Verification Failed';
      setError(message);
      throw new Error(message);
    } finally {
      setLoading(false);
    }
  };

  // Reset Password
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
      const message = error.response?.data?.message || 'Password Reset Failed';
      setError(message);
      throw new Error(message);
    } finally {
      setLoading(false);
    }
  };

  // google Login
  const googleLogin = async (credential) => {
    try {
      setLoading(true);
      const response = await api.post('/user/google-login', { credential });
      if (response.data.success) {
        setUser(response.data.data.user);
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
  const value = useMemo(
    () => ({
      loading,
      error,
      user,
      authLoading,
      register,
      login,
      verifyEmail,
      resendOtp,
      resetPassword,
      verifyForgotPasswordOtp,
      logout,
      forgotPassword,
      googleLogin,
      updateAvatar,
      updateProfile,
      updatePassword,
    }),
    [
      loading,
      error,
      user,
      authLoading,
      register,
      login,
      verifyEmail,
      resendOtp,
      resetPassword,
      verifyForgotPasswordOtp,
      logout,
      forgotPassword,
      googleLogin,
      updateAvatar,
      updateProfile,
      updatePassword,
    ],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used inside an AuthProvider');
  }
  return context;
};
