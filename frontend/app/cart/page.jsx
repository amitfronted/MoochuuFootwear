'use client';

import React from 'react';
import Link from 'next/link';

import { FiShoppingBag } from 'react-icons/fi';

import { useCart } from '../context/CartContext';

import CartItem from '../components/Cart/CartItem';
import CartSummary from '../components/Cart/CartSummary';

const CartPage = () => {
  const { cart, cartLoading, clearCart } = useCart();

  const items = cart?.items || [];
  /*
  |--------------------------------------------------------------------------
  | Loading
  |--------------------------------------------------------------------------
  */

  if (cartLoading) {
    return (
      <main className="mx-auto max-w-7xl px-4 py-12">
        <div className="flex min-h-80 items-center justify-center">
          <p className="text-gray-500">Loading cart...</p>
        </div>
      </main>
    );
  }

  /*
  |--------------------------------------------------------------------------
  | Empty Cart
  |--------------------------------------------------------------------------
  */

  if (items.length === 0) {
    return (
      <main className="mx-auto max-w-7xl px-4 py-16">
        <div className="flex min-h-96 flex-col items-center justify-center text-center">
          <div className="mb-5 rounded-full bg-gray-100 p-5">
            <FiShoppingBag size={35} />
          </div>

          <h1 className="text-2xl font-semibold">Your cart is empty</h1>

          <p className="mt-2 text-gray-500">
            Looks like you haven't added anything to your cart yet.
          </p>

          <Link
            href="/shop"
            className="mt-6 rounded-lg bg-black px-6 py-3 text-white"
          >
            Continue Shopping
          </Link>
        </div>
      </main>
    );
  }

  /*
  |--------------------------------------------------------------------------
  | Cart
  |--------------------------------------------------------------------------
  */

  return (
    <main className="mx-auto max-w-7xl px-4 py-10">
      {/* Header */}

      <div className="mb-8 flex flex-col sm:flex-row sm:items-center justify-between gap-4 sm:gap-0">
        <div>
          <h1 className="text-3xl font-bold">Shopping Cart</h1>

          <p className="mt-1 text-gray-500">
            {items.length} {items.length === 1 ? 'item' : 'items'} in your cart
          </p>
        </div>

        <button
          type="button"
          onClick={clearCart}
          className="font-medium bg-black px-6 py-3 text-white rounded-lg self-start sm:self-auto"
        >
          Clear Cart
        </button>
      </div>

      <div className="grid gap-8 md:grid-cols-[1fr_300px] lg:grid-cols-[1fr_380px]">
        {/* Cart Items */}

        <section className="rounded-xl border bg-white px-4">
          {items.map((item) => (
            <CartItem key={item._id} item={item} />
          ))}
        </section>

        {/* Summary */}

        <aside>
          <div className="sticky top-24">
            <CartSummary />
          </div>
        </aside>
      </div>
    </main>
  );
};

export default CartPage;
