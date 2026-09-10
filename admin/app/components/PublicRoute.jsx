'use client';
import { useRouter } from 'next/navigation';
import React, { useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import Loader from './Loader';

const PublicRoute = ({ children }) => {
  const router = useRouter();
  const { user, authLoading } = useAuth();

  useEffect(() => {
    if (authLoading) return;

    if (!user) return;

    if (user.role === 'ADMIN' || user.role === 'SUPER_ADMIN') {
      router.replace('/dashboard');
      return;
    }

    if (user.role === 'USER') {
      window.open(
        process.env.NEXT_PUBLIC_FRONTEND_URL,
        '_blank',
        'noopener,noreferrer',
      );

      // Keep admin app away from the normal user
      router.replace('/');
    }
  }, [user, authLoading, router]);

  if (authLoading) {
    return <Loader />;
  }

  if (user && user.role === 'USER') {
    return null;
  }

  return children;
};

export default PublicRoute;
