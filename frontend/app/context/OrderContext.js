'use client';

import { createContext, useCallback, useContext, useState } from 'react';
import api from '../lib/axios';

const OrderContext = createContext(null);

export const OrderProvider = ({ children }) => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(false);

  const createOrder = useCallback(
    async ({ addressId, paymentMethod = 'COD' }) => {
      try {
        setLoading(true);

        // Generate a unique idempotency key for this checkout attempt
        const idempotencyKey = `order-${Date.now()}-${Math.random()
          .toString(36)
          .substring(2, 15)}`;

        const response = await api.post(
          '/orders',
          {
            addressId,
            paymentMethod,
          },
          {
            headers: {
              'Idempotency-Key': idempotencyKey,
            },
          },
        );

        if (response.data?.success && response.data?.data?.order) {
          setOrders((prev) => [response.data.data.order, ...prev]);
        }

        return response.data;
      } catch (error) {
        return {
          success: false,
          message:
            error.response?.data?.message ||
            error.message ||
            'Unable to place order.',
        };
      } finally {
        setLoading(false);
      }
    },
    [],
  );

  const createRazorpayOrder = useCallback(async ({ addressId }) => {
    try {
      setLoading(true);

      const response = await api.post('/orders/razorpay', {
        addressId,
      });

      return response.data;
    } catch (error) {
      return {
        success: false,
        message:
          error.response?.data?.message ||
          error.message ||
          'Unable to create online payment order.',
      };
    } finally {
      setLoading(false);
    }
  }, []);

  const verifyRazorpayPayment = useCallback(
    async ({
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
      addressId,
    }) => {
      try {
        setLoading(true);

        const response = await api.post('/orders/razorpay/verify', {
          razorpay_order_id,
          razorpay_payment_id,
          razorpay_signature,
          addressId,
        });

        if (response.data?.success && response.data?.data?.order) {
          setOrders((prev) => [response.data.data.order, ...prev]);
        }

        return response.data;
      } catch (error) {
        return {
          success: false,
          message:
            error.response?.data?.message ||
            error.message ||
            'Unable to verify payment.',
        };
      } finally {
        setLoading(false);
      }
    },
    [],
  );

  const getMyOrders = useCallback(async () => {
    try {
      setLoading(true);
      const response = await api.get('/orders/my-orders');

      if (response.data?.success) {
        setOrders(response.data.data || []);
      }

      return response.data;
    } catch (error) {
      return {
        success: false,
        message:
          error.response?.data?.message || 'Unable to fetch your orders.',
      };
    } finally {
      setLoading(false);
    }
  }, []);

  const getOrder = useCallback(async (orderId) => {
    try {
      setLoading(true);
      const response = await api.get(`/orders/${orderId}`);
      return response.data;
    } catch (error) {
      return {
        success: false,
        message: error.response?.data?.message || 'Unable to fetch order.',
      };
    } finally {
      setLoading(false);
    }
  }, []);

  return (
    <OrderContext.Provider
      value={{
        orders,
        loading,
        createOrder,
        createRazorpayOrder,
        verifyRazorpayPayment,
        getMyOrders,
        getOrder,
      }}
    >
      {children}
    </OrderContext.Provider>
  );
};

export const useOrders = () => {
  const context = useContext(OrderContext);

  if (!context) {
    throw new Error('useOrders must be used inside OrderProvider');
  }

  return context;
};

export default OrderProvider;
