'use client';

import Link from 'next/link';
import { LiaAngleDownSolid } from 'react-icons/lia';
import { CiUser, CiLogout } from 'react-icons/ci';
import { useAuth } from '@/app/context/AuthContext';
import { useRouter } from 'next/navigation';
import { FaRegUser } from 'react-icons/fa';

const UserNavbar = ({ toggleUserdrawer, userDrawerOpen }) => {
  const { user, logout } = useAuth();
  const router = useRouter();

  if (!user)
    return (
      <Link href={'/login'} className="cursor-pointer group">
        <FaRegUser className="transition-all duration-1000 w-5 h-5 group-hover:w-5.5 group-hover:h-5.5" />
      </Link>
    );

  const handleLogout = async () => {
    try {
      await logout();
      router.push('/');
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  return (
    <div className="relative">
      {/* User Button */}
      <button
        type="button"
        className="relative cursor-pointer flex gap-1 items-center justify-end"
        onClick={toggleUserdrawer}
      >
        <img
          src={user?.avatar || '/man.png'}
          alt={user.name || 'user'}
          className="w-9 h-9 md:w-12 md:h-12 rounded-full border border-yellow object-cover"
          loading="eager"
        />

        <LiaAngleDownSolid
          size={20}
          className={`transition-transform duration-300 ${
            userDrawerOpen ? 'rotate-180' : ''
          }`}
        />
      </button>

      {/* Dropdown */}
      <div
        className={`absolute top-full mt-3 w-52 sm:min-w-60 bg-white border rounded-md border-gray-300 right-0 sm:-right-4 max-w-[calc(100vw-2rem)] shadow-lg transition-all duration-300 ${
          userDrawerOpen
            ? 'opacity-100 visible translate-y-0 z-50'
            : 'opacity-0 invisible -translate-y-2 z-0'
        }`}
      >
        {/* User Info */}
        <div className="p-3 border-b border-gray-200">
          <p className="font-semibold text-gray-800">{user.name}</p>

          <p className="text-sm text-gray-500 truncate">{user.email}</p>
        </div>

        <ul className="flex flex-col w-full">
          <li>
            <Link
              href="/my-account"
              onClick={toggleUserdrawer}
              className="p-3 border-b border-gray-200 w-full flex items-center gap-2 font-medium hover:bg-gray-100 transition"
            >
              <CiUser size={20} />
              My Profile
            </Link>
          </li>

          <li>
            <button
              type="button"
              onClick={handleLogout}
              className="p-3 w-full flex items-center gap-2 font-medium hover:bg-gray-100 transition cursor-pointer text-left"
            >
              <CiLogout size={20} />
              Log Out
            </button>
          </li>
        </ul>
      </div>
    </div>
  );
};

export default UserNavbar;
