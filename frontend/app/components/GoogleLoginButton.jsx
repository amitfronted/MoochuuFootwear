'use client';

import React, { memo, useState, useEffect } from 'react';
import { GoogleLogin } from '@react-oauth/google';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/app/context/AuthContext';
import toast from 'react-hot-toast';

const GoogleLoginButton = () => {
  const [mounted, setMounted] = useState(false);
  const { googleLogin } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirect = searchParams.get('redirect') || '/';
  useEffect(() => {
    setMounted(true);
  }, []);
  const handleGoogleSuccess = async (credentialResponse) => {
    try {
      if (!credentialResponse?.credential) {
        toast.error('Google credential not received');
        return;
      }

      const response = await googleLogin(credentialResponse.credential);

      if (response.success) {
        toast.success('Google login successful');
        router.replace(redirect);
      }
    } catch (error) {
      console.error('Google Login Error:', error);
      toast.error(error.message || 'Google login failed');
    }
  };

  const handleGoogleError = () => {
    console.error('Google Login Failed');
    toast.error('Google login failed');
  };

  if (!mounted) return null;

  return (
    <GoogleLogin
      onSuccess={handleGoogleSuccess}
      onError={handleGoogleError}
      useOneTap={false}
    />
  );
};

export default memo(GoogleLoginButton);
