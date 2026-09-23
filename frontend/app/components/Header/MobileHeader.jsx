'use client';

import { useState } from 'react';
import Logo from './Logo';
import Link from 'next/link';

const MobileHeader = () => {
  const [openMenu, setOpenMenu] = useState(false);

  const handleOpenMenu = () => {
    setOpenMenu((prev) => !prev);
  };

  return (
    <>
      <button
        onClick={handleOpenMenu}
        className="relative w-6 h-6 flex z-50 md:hidden"
      >
        <span
          className={`absolute left-0 w-6 h-0.5 bg-black transition-all duration-300 ${
            openMenu ? 'rotate-45 top-3' : 'top-2'
          }`}
        />

        <span
          className={`absolute left-0 w-6 h-0.5 bg-black transition-all duration-300 ${
            openMenu ? '-rotate-45 top-3' : 'top-4'
          }`}
        />
      </button>

      <div
        className={`pt-16 md:hidden flex flex-col justify-start items-center bg-white w-full z-40 min-h-screen overflow-scroll fixed top-0 left-0 duration-300 transition-transform transform ${openMenu ? 'translate-x-0' : '-translate-x-full'}`}
      >
        <div className="border-b border-black w-full py-4 flex justify-end items-center px-4">
          <Logo />
        </div>
        <div className="pt-2 pb-2 pl-4 pr-4 flex flex-col justify-start items-start w-full">
          <h2 className="text-md font-semibold mb-4">Menu</h2>
          <nav className="flex flex-col justify-start items-start w-full">
            <Link
              href="/"
              onClick={handleOpenMenu}
              className="flex w-full text-grey-600 hover:text-black py-3"
            >
              Home
            </Link>
            <Link
              href="/about"
              onClick={handleOpenMenu}
              className="flex w-full text-grey-600 hover:text-black py-3"
            >
              About
            </Link>
            <Link
              href="/shop"
              onClick={handleOpenMenu}
              className="flex w-full text-grey-600 hover:text-black py-3"
            >
              Shops
            </Link>
            <Link
              href="/"
              onClick={handleOpenMenu}
              className="flex w-full text-grey-600 hover:text-black py-3"
            >
              Customize
            </Link>
          </nav>
        </div>
      </div>
    </>
  );
};

export default MobileHeader;
