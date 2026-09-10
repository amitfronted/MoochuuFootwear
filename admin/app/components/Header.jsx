'use client';
import React from 'react';
import { CiLogout, CiMenuBurger, CiUser } from 'react-icons/ci';
import { useAuth } from '../context/AuthContext';
import Link from 'next/link';
import NotificationBell from './NotificationBell';

const PROFILE_MENU = [
  {
    label: 'My Profile',
    icon: <CiUser />,
  },
  {
    label: 'Logout',
    icon: <CiLogout />,
  },
];

const Header = ({
  isSidebarOpen,
  setSidebarOpen,
  isProfileOpen,
  setProfileOpen,
  profileRef,
}) => {
  const { user, logout } = useAuth();

  return (
    <header className="flex py-2 sticky top-0 w-full bg-white border-b border-slate-300 px-6 dark:border-neutral-700 dark:bg-neutral-900 min-h-17 z-20">
      <div className="flex flex-wrap items-center gap-4 w-full">
        <button
          type="button"
          onClick={() => setSidebarOpen((prev) => !prev)}
          aria-expanded={isSidebarOpen}
          className="cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 rounded"
        >
          <span className="sr-only">Toggle sidebar menu</span>

          <CiMenuBurger size={20} />
        </button>

        <h1 className="text-xl text-slate-900 font-bold dark:text-slate-50">
          {user.role} Dashboard
        </h1>

        <div className="flex items-center flex-wrap gap-4 ml-auto">
          {/* Notifications */}

          <NotificationBell />
          {/* Profile Dropdown */}
          <div className="relative w-max flex flex-col" ref={profileRef}>
            <button
              type="button"
              onClick={() => setProfileOpen((prev) => !prev)}
              aria-haspopup="true"
              aria-expanded={isProfileOpen}
              className="border border-slate-300 rounded-full cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
            >
              <img
                src={user.avatar || '/man.png'}
                alt="profile-pic"
                className="size-9 rounded-full"
              />
            </button>

            <ul
              className={`${
                isProfileOpen ? 'block' : 'hidden'
              } absolute right-0 top-full mt-2 p-2 space-y-0.5 min-w-48 w-full text-slate-800 text-sm font-medium bg-white border border-slate-300 rounded-md shadow-lg z-20 overflow-hidden dark:text-slate-400 dark:bg-neutral-800 dark:border-neutral-700`}
            >
              <li>
                <Link
                  href={'/profile'}
                  onClick={() => setProfileOpen((prev) => !prev)}
                  className="w-full p-2 flex items-center gap-2.5 rounded-md cursor-pointer transition-colors hover:text-slate-900 hover:bg-slate-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 dark:hover:text-slate-50 dark:hover:bg-neutral-700"
                >
                  <CiUser size={20} className="mr-2" /> My Profile
                </Link>
              </li>
              <li>
                <button
                  onClick={() => logout()}
                  type="button"
                  className="w-full p-2 flex items-center gap-2.5 rounded-md cursor-pointer transition-colors hover:text-slate-900 hover:bg-slate-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 dark:hover:text-slate-50 dark:hover:bg-neutral-700"
                >
                  <CiLogout size={20} className="mr-2" /> Logout
                </button>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;
