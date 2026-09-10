'use client';

import { useEffect, useRef } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';

const protectedRoutes = [
  '/my-account',
  '/checkout',
  '/orders-success',
  '/wishlist',
];

const ProtectedRoute = ({ children }) => {
  const { user, authLoading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  const hasShownToast = useRef(false);

  useEffect(() => {
    // Wait until authentication check is complete
    if (authLoading) return;

    // User is not logged in
    if (!user) {
      if (!hasShownToast.current) {
        toast.error('Please login first');

        hasShownToast.current = true;
      }

      router.replace(`/login?redirect=${encodeURIComponent(pathname)}`);
    }
  }, [user, authLoading, router, pathname]);

  // IMPORTANT:
  // Don't redirect while API is checking login status
  if (authLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p>Loading...</p>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return children;
};

export default ProtectedRoute;
