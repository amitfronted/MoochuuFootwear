'use client';
import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

const OuterHeader = () => {
  const pathName = usePathname();
  const isActive = (href) => pathName === href;
  return (
    <section className="w-full fixed top-0 left-0 z-100 bg-white">
      <img
        src="/patern.webp"
        alt="image"
        className="w-full h-fit object-cover opacity-5"
      />
      <div className="w-full fixed top-0 left-0 py-3">
        <div className="w-[90%] m-auto flex items-center justify-between">
          <img
            src="/logo.png"
            alt="logo"
            className=" w-20 h-20"
            loading="eager"
          />
          <div className="flex items-center gap-3">
            <Link
              href={'/'}
              className={`rounded-full text-gray-700 px-6 py-2.5 border border-gray-200 hover:bg-amber-200 ${isActive('/') ? 'bg-amber-200' : 'bg-amber-100'}`}
            >
              Sign In
            </Link>
            <Link
              href={'/register'}
              className={`rounded-full text-gray-700 px-6 py-2.5 border border-gray-200 hover:bg-amber-200 ${isActive('/register') ? 'bg-amber-200' : 'bg-amber-100'}`}
            >
              Sign Up
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
};

export default OuterHeader;
