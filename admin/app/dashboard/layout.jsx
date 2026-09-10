'use client';
import React, { useEffect, useRef, useState } from 'react';
import SideBar from '../components/SideBar';
import Header from '../components/Header';
import { useRouter } from 'next/navigation';
import { useAuth } from '../context/AuthContext';
import Loader from '../components/Loader';

const layout = ({ children }) => {
  const router = useRouter();
  const { user, authLoading } = useAuth();

  const [isSidebarOpen, setSidebarOpen] = useState(true);
  const [isProfileOpen, setProfileOpen] = useState(false);
  const [openSubMenus, setOpenSubMenus] = useState({ dashboard: true });

  const profileRef = useRef(null);

  useEffect(() => {
    if (authLoading) return;

    // Not logged in
    if (!user) {
      router.replace('/');
      return;
    }

    // Logged in but not an admin
    if (user.role !== 'ADMIN' && user.role !== 'SUPER_ADMIN') {
      window.open(
        process.env.NEXT_PUBLIC_FRONTEND_URL,
        '_blank',
        'noopener,noreferrer',
      );

      router.replace('/');
    }
  }, [user, authLoading, router]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (profileRef.current && !profileRef.current.contains(event.target))
        setProfileOpen(false);
    };
    const handleEsc = (event) => {
      if (event.key === 'Escape') setProfileOpen(false);
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEsc);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEsc);
    };
  }, []);

  const toggleSubMenu = (id) => {
    setOpenSubMenus((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  if (authLoading) {
    return <Loader />;
  }

  if (!user) {
    return null;
  }

  return (
    <div className="flex items-start h-full">
      <SideBar
        isSidebarOpen={isSidebarOpen}
        openSubMenus={openSubMenus}
        toggleSubMenu={toggleSubMenu}
      />
      <div className="w-full h-full overflow-y-scroll">
        <Header
          isSidebarOpen={isSidebarOpen}
          setSidebarOpen={setSidebarOpen}
          isProfileOpen={isProfileOpen}
          setProfileOpen={setProfileOpen}
          profileRef={profileRef}
        />
        <section className="p-6">{children}</section>
      </div>
    </div>
  );
};

export default layout;
