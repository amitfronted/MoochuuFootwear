'use client';

import Link from 'next/link';
import Image from 'next/image';
import React from 'react';
import { usePathname, useRouter } from 'next/navigation';

import { FaCloudUploadAlt, FaMapPin, FaRegUser } from 'react-icons/fa';
import { MdFormatListNumbered } from 'react-icons/md';
import { HiOutlineShoppingBag } from 'react-icons/hi2';
import { HiOutlineLogout } from 'react-icons/hi';
import { useAuth } from '@/app/context/AuthContext';
import toast from 'react-hot-toast';

const navLinks = [
  {
    name: 'My Profile',
    href: '/my-account',
    icon: <FaRegUser size={20} />,
  },
  {
    name: 'Address',
    href: '/my-account/address',
    icon: <FaMapPin size={20} />,
  },

  {
    name: 'My Orders',
    href: '/my-account/my-orders',
    icon: <HiOutlineShoppingBag size={20} />,
  },
];

const AccountSidebar = () => {
  const pathname = usePathname();
  const { logout, user, updateAvatar } = useAuth();
  const router = useRouter();

  const handleLogout = async () => {
    try {
      await logout();
      router.push('/login');
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  const handleAvatarChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) {
      toast.error('Please select an image');
      return;
    }
    // Optional image validation
    if (!file.type.startsWith('image/')) {
      toast.error('Please select a valid image');
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      toast.error('Image size must be less than 2MB');
      return;
    }
    try {
      const response = await updateAvatar(file);
      if (response.success) {
        toast.success(response.message || 'Image Upload Successfully');
      } else {
        toast.error(response.message || 'Image Not uploaded');
      }
    } catch (error) {
      toast.error(error.message || 'Something went wrong');
    } finally {
      // Allows selecting the same image again
      e.target.value = '';
    }
  };

  return (
    <aside className="h-max w-full overflow-hidden rounded-md border border-gray-400">
      {/* Profile */}
      <div className="flex flex-col items-center justify-center p-4">
        <div className="group relative mt-3 h-24 w-24 overflow-hidden rounded-full">
          <Image
            src={user?.avatar || '/man.png'}
            alt="Amit Kumar Singh"
            fill
            sizes="96px"
            className="object-cover"
            loading="eager"
          />

          {/* Upload Overlay */}
          <div className="absolute left-0 top-0 z-20 flex h-full w-full items-center justify-center rounded-full bg-gray-900/60 opacity-0 transition-all group-hover:opacity-100">
            <FaCloudUploadAlt size={20} className="text-white" />

            <input
              type="file"
              accept="image/*"
              onChange={handleAvatarChange}
              className="absolute left-0 top-0 z-50 h-full w-full cursor-pointer opacity-0"
            />
          </div>
        </div>

        <h3 className="pt-3 text-lg font-medium text-gray-700">{user?.name}</h3>

        <p className="text-md font-medium text-gray-600">{user?.email}</p>
      </div>

      {/* Navigation */}
      <nav>
        {navLinks.map((item) => {
          const isActive = pathname === item.href;

          return (
            <Link
              key={item.name}
              href={item.href}
              className={`relative flex w-full items-center justify-start border-b border-gray-400 px-4 py-4 font-bold text-black transition-all ${
                isActive
                  ? 'border-l-4 border-l-black bg-[#fff200] text-amber-600'
                  : 'border-l-4 border-l-transparent hover:bg-[#fff200]'
              }`}
            >
              {item.icon}

              <span className="ml-2">{item.name}</span>
            </Link>
          );
        })}
        <button
          type="button"
          onClick={handleLogout}
          className="relative flex w-full items-center justify-start border-b border-gray-400 px-4 py-4 font-bold text-black transition-all border-l-4 border-l-transparent hover:bg-[#fff200] cursor-pointer"
        >
          <HiOutlineLogout size={20} />
          <span className="ml-2">Logout</span>
        </button>
      </nav>
    </aside>
  );
};

export default AccountSidebar;
