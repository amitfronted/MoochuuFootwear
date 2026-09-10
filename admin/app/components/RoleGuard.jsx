'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

import { useAuth } from '../context/AuthContext';
import Loader from './Loader';

const RoleGuard = ({ allowedRoles, children }) => {
  const router = useRouter();
  const { user, loading } = useAuth();

  useEffect(() => {
    if (loading) return;

    if (!user) {
      router.replace('/login');
      return;
    }

    if (!allowedRoles.includes(user.role)) {
      router.replace('/unauthorized');
    }
  }, [user, loading, allowedRoles, router]);

  if (loading) {
    return <Loader />;
  }

  if (!user || !allowedRoles.includes(user.role)) {
    return null;
  }

  return children;
};

export default RoleGuard;
