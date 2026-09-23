'use client';

import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import Logo from './Logo';
import Navbar from './Navbar';
import CartNavbar from './CartNavbar';
import MobileHeader from './MobileHeader';
import CartDrawer from '../Cart/CartDrawer';
import UserNavbar from './UserNavbar';
import { useCart } from '@/app/context/CartContext';

const Header = () => {
  const { cart, cartLoading, totalItems, subtotal } = useCart();
  const [sticky, setSticky] = useState(false);
  const [cartOpen, setCartOpen] = useState(false);
  const [userDrawerOpen, setUserDrawerOpen] = useState(false);
  const items = cart?.items || [];
  const pathname = usePathname();
  const isInnerPage = pathname !== '/';
  useEffect(() => {
    const handleScroll = () => {
      setSticky(window.scrollY > 100);
    };

    window.addEventListener('scroll', handleScroll);

    return () => {
      window.removeEventListener('scroll', handleScroll);
    };
  }, []);

  useEffect(() => {
    // Close both drawers whenever route changes
    setUserDrawerOpen(false);
    setCartOpen(false);
  }, [pathname]);

  const toggleCart = () => {
    setCartOpen((prev) => !prev);
  };

  const toggleUserdrawer = () => {
    setUserDrawerOpen((prev) => !prev);
  };

  return (
    <>
      <header
        className={`
          fixed
          top-0
          left-0
          w-full
          z-40          
          transition-all
          duration-500
          ease-in-out
           ${isInnerPage ? 'bg-[#fdea07]' : ''}
          ${
            sticky
              ? 'fixed top-0 left-0 bg-[rgb(253_234_7/0.50)] backdrop-blur-sm shadow-md border-b border-black animate-slideDown'
              : 'fixed bg-[#fdea07]'
          }
        `}
      >
        <div
          className={`
            relative
            container
            mx-auto
            md:py-6
            py-4
            md:px-4
            px-2.5
            flex
            justify-between
            items-center
            ${sticky ? '' : 'border-b border-black'}
          `}
        >
          <div className="md:w-1/3 hidden md:flex">
            <Navbar />
          </div>
          <div className="md:w-1/3 w-2/3 flex md:justify-center md:items-center justify-start items-center gap-1 sm:gap-2 md:gap-0">
            <MobileHeader />
            <Logo />
          </div>
          <div className="md:w-1/3 w-auto flex justify-end items-end">
            <div className="flex items-center gap-2 sm:gap-4 md:gap-6">
              <CartNavbar toggleCart={toggleCart} totalItem={totalItems} />

              <UserNavbar
                toggleUserdrawer={toggleUserdrawer}
                userDrawerOpen={userDrawerOpen}
              />
            </div>
          </div>
        </div>
      </header>

      {/* Cart Drawer */}
      <CartDrawer
        cartOpen={cartOpen}
        toggleCart={toggleCart}
        items={items}
        loading={cartLoading}
        subtotal={subtotal}
        totalItem={totalItems}
      />
    </>
  );
};

export default Header;
