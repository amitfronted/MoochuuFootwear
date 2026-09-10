'use client';

import Link from 'next/link';
import { IoMdClose } from 'react-icons/io';
import CartContent from './CartContent';

const CartDrawer = ({ cartOpen, toggleCart, items, subtotal, totalItem }) => {
  return (
    <>
      {/* Overlay */}
      <div
        onClick={toggleCart}
        className={`
          fixed inset-0 bg-black/40 z-40
          transition-all duration-300
          ${
            cartOpen
              ? 'opacity-100 visible'
              : 'opacity-0 invisible pointer-events-none'
          }
        `}
      />

      {/* Drawer */}
      <aside
        className={`
          fixed
          top-0
          right-0
          h-screen
          w-full
          sm:w-1/2
          md:w-2/6
          bg-white
          z-50
          shadow-xl
          flex
          flex-col
          transition-transform
          duration-300
          ${cartOpen ? 'translate-x-0' : 'translate-x-full'}
        `}
      >
        {/* Header */}
        <div className="flex justify-between items-center p-5 border-b border-black">
          <h2 className="text-xl font-bold">Your Cart</h2>

          <button
            type="button"
            onClick={toggleCart}
            className="text-2xl cursor-pointer"
            aria-label="Close cart"
          >
            <IoMdClose />
          </button>
        </div>
        <div className="flex-1 flex-col items-center justify-center">
          {/* Content */}
          {items.length === 0 ? (
            <p className="text-gray-500">Your cart is empty.</p>
          ) : (
            <>
              <CartContent items={items} />
              <div className="border-t border-black p-5">
                <div className="flex justify-between mb-4">
                  <span className="font-semibold">
                    Total {totalItem} {totalItem === 1 ? 'item' : 'items'}
                  </span>

                  <span className="font-bold">₹{subtotal}</span>
                </div>
                <div className="flex flex-col gap-2 items-center justify-center">
                  <Link
                    href="/shop"
                    onClick={toggleCart}
                    className="w-full bg-yellow text-black py-2.5 font-medium rounded flex items-center justify-center"
                  >
                    Continue to Shopping
                  </Link>
                  <p className="text-sm">/Or</p>
                  <Link
                    href="/checkout"
                    onClick={toggleCart}
                    className="w-full bg-yellow text-black py-2.5 font-medium rounded flex items-center justify-center"
                  >
                    Checkout
                  </Link>
                </div>
              </div>
            </>
          )}
        </div>
        {/* Footer */}
      </aside>
    </>
  );
};

export default CartDrawer;
