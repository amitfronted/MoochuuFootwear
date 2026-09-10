'use client';

import React from 'react';

import { useCart } from '../../context/CartContext';

const CartSummary = () => {
  const { totalItems, subtotal } = useCart();

  return (
    <div className="rounded-xl border bg-white p-5">
      <h2 className="text-lg font-semibold">Order Summary</h2>

      <div className="mt-5 space-y-3">
        <div className="flex justify-between text-sm">
          <span>Items ({totalItems})</span>

          <span>₹{subtotal.toLocaleString('en-IN')}</span>
        </div>

        <div className="flex justify-between text-sm">
          <span>Shipping</span>

          <span>Calculated at checkout</span>
        </div>

        <div className="border-t pt-4">
          <div className="flex justify-between">
            <span className="font-semibold">Total</span>

            <span className="text-xl font-bold">
              ₹{subtotal.toLocaleString('en-IN')}
            </span>
          </div>
        </div>
      </div>

      <Link
        href="/checkout"
        type="button"
        className="mt-6 w-full rounded-lg bg-black px-5 py-3 font-medium text-white transition hover:opacity-90"
      >
        Proceed to Checkout
      </Link>
    </div>
  );
};

export default CartSummary;
