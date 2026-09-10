'use client';

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';

import api from '../lib/axios';
import { useAuth } from './AuthContext';

const CartContext = createContext(null);

/*
|--------------------------------------------------------------------------
| GET / CREATE GUEST ID
|--------------------------------------------------------------------------
*/

const getGuestId = () => {
  if (typeof window === 'undefined') {
    return null;
  }

  let guestId = localStorage.getItem('guestId');

  if (!guestId) {
    guestId = crypto.randomUUID();
    localStorage.setItem('guestId', guestId);
  }

  return guestId;
};

/*
|--------------------------------------------------------------------------
| CART PROVIDER
|--------------------------------------------------------------------------
*/

export const CartProvider = ({ children }) => {
  const [cart, setCart] = useState({
    items: [],
  });

  const [loading, setLoading] = useState(false);
  const [cartLoading, setCartLoading] = useState(true);
  const [error, setError] = useState(null);
  const { user, authLoading } = useAuth();

  /*
  |--------------------------------------------------------------------------
  | CART REQUEST CONFIG
  |--------------------------------------------------------------------------
  */

  const getCartConfig = useCallback(() => {
    const guestId = getGuestId();

    return {
      headers: {
        'x-guest-id': guestId,
      },
    };
  }, []);

  /*
  |--------------------------------------------------------------------------
  | GET CART
  |--------------------------------------------------------------------------
  */

  const getCart = useCallback(async () => {
    try {
      setCartLoading(true);
      setError(null);

      const response = await api.get('/cart', getCartConfig());

      /*
       * Backend response:
       *
       * {
       *   success: true,
       *   cart: {...}
       * }
       */

      const cartData = response?.data?.cart;

      setCart(
        cartData || {
          items: [],
        },
      );

      return {
        success: true,
        data: cartData,
      };
    } catch (error) {
      console.error('Get cart error:', error);

      const message = error?.response?.data?.message || 'Unable to load cart';

      setError(message);

      setCart({
        items: [],
      });

      return {
        success: false,
        message,
      };
    } finally {
      setCartLoading(false);
    }
  }, [getCartConfig]);

  /*
  |--------------------------------------------------------------------------
  | ADD TO CART
  |--------------------------------------------------------------------------
  */

  const addToCart = useCallback(
    async (payload) => {
      try {
        setLoading(true);
        setError(null);

        console.log('ADD TO CART PAYLOAD:', payload);

        const response = await api.post('/cart/add', payload, getCartConfig());

        console.log('ADD TO CART RESPONSE:', response.data);

        /*
         * Backend response:
         *
         * {
         *   success: true,
         *   message: 'Product added to cart',
         *   cart: {...}
         * }
         */

        const cartData = response?.data?.cart;

        if (cartData) {
          setCart(cartData);
        } else {
          await getCart();
        }

        return {
          success: true,
          message: response?.data?.message || 'Product added to cart',
          data: cartData,
        };
      } catch (error) {
        console.error('Add to cart error:', error?.response?.data || error);

        const message =
          error?.response?.data?.message || 'Unable to add product to cart';

        setError(message);

        return {
          success: false,
          message,
        };
      } finally {
        setLoading(false);
      }
    },
    [getCart, getCartConfig],
  );

  /*
  |--------------------------------------------------------------------------
  | UPDATE CART ITEM
  |--------------------------------------------------------------------------
  */

  const updateCartItem = useCallback(
    async (itemId, quantity) => {
      if (!itemId) {
        return {
          success: false,
          message: 'Cart item ID is required',
        };
      }

      if (!Number.isInteger(quantity) || quantity < 1) {
        return removeCartItem(itemId);
      }

      try {
        setLoading(true);
        setError(null);

        const response = await api.patch(
          `/cart/item/${itemId}`,
          {
            quantity,
          },
          getCartConfig(),
        );

        const cartData = response?.data?.cart;

        if (cartData) {
          setCart(cartData);
        } else {
          await getCart();
        }

        return {
          success: true,
          message: response?.data?.message || 'Cart updated',
          data: cartData,
        };
      } catch (error) {
        console.error(
          'Update cart item error:',
          error?.response?.data || error,
        );

        const message =
          error?.response?.data?.message || 'Unable to update cart';

        setError(message);

        return {
          success: false,
          message,
        };
      } finally {
        setLoading(false);
      }
    },
    [getCart, getCartConfig],
  );

  /*
  |--------------------------------------------------------------------------
  | INCREASE QUANTITY
  |--------------------------------------------------------------------------
  */

  const increaseQuantity = useCallback(
    async (item) => {
      if (!item?._id) {
        return {
          success: false,
          message: 'Invalid cart item',
        };
      }

      const currentQuantity = Number(item.quantity || 0);

      let availableStock = 0;

      const getStock = (option) => {
        if (!option) return null;

        const stock = option.variant?.stockQuantity ?? option.stockQuantity;

        return stock == null ? null : Number(stock);
      };

      if (item.productType === 'CUSTOMIZABLE') {
        const stocks = [];

        const baseStock = getStock(item.base);

        const strapStock = getStock(item.strap);

        const thumbStock = getStock(item.thumb);

        if (baseStock !== null && Number.isFinite(baseStock)) {
          stocks.push(baseStock);
        }

        if (strapStock !== null && Number.isFinite(strapStock)) {
          stocks.push(strapStock);
        }

        if (item.thumb && thumbStock !== null && Number.isFinite(thumbStock)) {
          stocks.push(thumbStock);
        }

        availableStock = stocks.length ? Math.min(...stocks) : 0;
      } else {
        availableStock = Number(
          item.standardVariant?.variant?.stockQuantity ??
            item.standardVariant?.stockQuantity ??
            item.stockQuantity ??
            0,
        );
      }

      if (currentQuantity >= availableStock) {
        return {
          success: false,
          message: `Only ${availableStock} item${
            availableStock === 1 ? '' : 's'
          } available`,
        };
      }

      return updateCartItem(item._id, currentQuantity + 1);
    },
    [updateCartItem],
  );

  /*
  |--------------------------------------------------------------------------
  | DECREASE QUANTITY
  |--------------------------------------------------------------------------
  */

  const decreaseQuantity = useCallback(
    async (item) => {
      if (!item?._id) {
        return {
          success: false,
          message: 'Invalid cart item',
        };
      }

      const currentQuantity = Number(item.quantity || 1);

      if (currentQuantity <= 1) {
        return removeCartItem(item._id);
      }

      return updateCartItem(item._id, currentQuantity - 1);
    },
    [updateCartItem],
  );

  /*
  |--------------------------------------------------------------------------
  | REMOVE CART ITEM
  |--------------------------------------------------------------------------
  */

  const removeCartItem = useCallback(
    async (itemId) => {
      if (!itemId) {
        return {
          success: false,
          message: 'Cart item ID is required',
        };
      }

      try {
        setLoading(true);
        setError(null);

        const response = await api.delete(
          `/cart/item/${itemId}`,
          getCartConfig(),
        );

        const cartData = response?.data?.cart;

        if (cartData) {
          setCart(cartData);
        } else {
          await getCart();
        }

        return {
          success: true,
          message: response?.data?.message || 'Item removed from cart',
          data: cartData,
        };
      } catch (error) {
        console.error(
          'Remove cart item error:',
          error?.response?.data || error,
        );

        const message =
          error?.response?.data?.message || 'Unable to remove item';

        setError(message);

        return {
          success: false,
          message,
        };
      } finally {
        setLoading(false);
      }
    },
    [getCart, getCartConfig],
  );

  /*
  |--------------------------------------------------------------------------
  | CLEAR CART
  |--------------------------------------------------------------------------
  */

  const clearCart = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await api.delete('/cart/clear', getCartConfig());

      const cartData = response?.data?.cart;

      setCart(
        cartData || {
          items: [],
        },
      );

      return {
        success: true,
        message: response?.data?.message || 'Cart cleared',
      };
    } catch (error) {
      console.error('Clear cart error:', error?.response?.data || error);

      const message = error?.response?.data?.message || 'Unable to clear cart';

      setError(message);

      return {
        success: false,
        message,
      };
    } finally {
      setLoading(false);
    }
  }, [getCartConfig]);

  /*
  |--------------------------------------------------------------------------
  | FETCH CART ON FIRST LOAD
  |--------------------------------------------------------------------------
  */

  useEffect(() => {
    getGuestId();
    getCart();
    const handleCartUpdated = () => {
      getCart();
    };

    window.addEventListener('cart-updated', handleCartUpdated);

    return () => {
      window.removeEventListener('cart-updated', handleCartUpdated);
    };
  }, [getCart]);

  // After login, fetch the authenticated user's cart.
  // The AuthContext merges the old guest cart before updating `user`.
  useEffect(() => {
    if (!authLoading && user) {
      getCart();
    }
  }, [user, authLoading, getCart]);

  /*
  |--------------------------------------------------------------------------
  | TOTAL ITEMS
  |--------------------------------------------------------------------------
  */

  const totalItems = useMemo(() => {
    return (cart?.items || []).reduce(
      (total, item) => total + Number(item.quantity || 0),
      0,
    );
  }, [cart]);

  /*
  |--------------------------------------------------------------------------
  | SUBTOTAL
  |--------------------------------------------------------------------------
  */

  const subtotal = useMemo(() => {
    return (cart?.items || []).reduce(
      (total, item) =>
        total + Number(item.basePrice || 0) * Number(item.quantity || 0),
      0,
    );
  }, [cart]);

  /*
  |--------------------------------------------------------------------------
  | CONTEXT VALUE
  |--------------------------------------------------------------------------
  */

  const value = useMemo(
    () => ({
      cart,

      items: cart?.items || [],

      loading,

      cartLoading,

      error,

      totalItems,

      subtotal,

      getCart,

      addToCart,

      updateCartItem,

      increaseQuantity,

      decreaseQuantity,

      removeCartItem,

      clearCart,
    }),
    [
      cart,
      loading,
      cartLoading,
      error,
      totalItems,
      subtotal,
      getCart,
      addToCart,
      updateCartItem,
      increaseQuantity,
      decreaseQuantity,
      removeCartItem,
      clearCart,
    ],
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
};

/*
|--------------------------------------------------------------------------
| USE CART
|--------------------------------------------------------------------------
*/

export const useCart = () => {
  const context = useContext(CartContext);

  if (!context) {
    throw new Error('useCart must be used inside CartProvider');
  }

  return context;
};

export default CartProvider;
