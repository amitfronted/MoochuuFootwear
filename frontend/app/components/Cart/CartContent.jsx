import { useCart } from '@/app/context/CartContext';
import React from 'react';
import CartItem from './CartItem';

const CartContent = ({ items, loading }) => {
  if (loading) {
    return (
      <main className="mx-auto max-w-7xl px-4 py-12">
        <div className="flex min-h-80 items-center justify-center">
          <p className="text-gray-500">Loading cart...</p>
        </div>
      </main>
    );
  }

  return (
    <div
      id="cartDrawerBox"
      className="flex-1 flex-col px-6 items-center justify-center overflow-y-scroll md:min-h-[70%] h-86"
    >
      {items.map((item) => (
        <CartItem key={item._id} item={item} />
      ))}
    </div>
  );
};

export default CartContent;
