'use client';

import { createContext, useCallback, useContext, useState } from 'react';
import api from '../lib/axios';

const OrderContext = createContext(null);

export const OrderProvider = ({ children }) => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(false);

  const createOrder = useCallback(
    async ({ addressId, paymentMethod = 'COD', couponCode = '' }) => {
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
            couponCode,
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

  const createRazorpayOrder = useCallback(
    async ({ addressId, couponCode = '' }) => {
      try {
        setLoading(true);
        // One key represents one Razorpay checkout attempt.
        // A customer retry automatically gets a new key.
        const idempotencyKey = `razorpay-${Date.now()}-${Math.random()
          .toString(36)
          .substring(2, 15)}`;

        const response = await api.post(
          '/orders/razorpay',
          {
            addressId,
            couponCode,
          },
          {
            headers: {
              'Idempotency-Key': idempotencyKey,
            },
          },
        );

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
    },
    [],
  );

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

  const cancelOrder = useCallback(async (orderId) => {
    try {
      setLoading(true);

      const response = await api.patch(`/orders/${orderId}/cancel`);

      if (response.data?.success && response.data?.data?.order) {
        const cancelledOrder = response.data.data.order;

        setOrders((prev) =>
          prev.map((order) =>
            order._id === cancelledOrder._id ? cancelledOrder : order,
          ),
        );
      }

      return response.data;
    } catch (error) {
      return {
        success: false,
        message:
          error.response?.data?.message ||
          error.message ||
          'Unable to cancel order.',
      };
    } finally {
      setLoading(false);
    }
  }, []);

  const requestReturn = useCallback(
    async (orderId, { reason, comment, items }) => {
      try {
        setLoading(true);

        const response = await api.post(`/orders/${orderId}/return`, {
          reason,
          comment,
          items,
        });

        if (response.data?.success && response.data?.data?.order) {
          const returnedOrder = response.data.data.order;

          setOrders((prev) =>
            prev.map((order) =>
              order._id === returnedOrder._id ? returnedOrder : order,
            ),
          );
        }

        return response.data;
      } catch (error) {
        return {
          success: false,
          message:
            error.response?.data?.message ||
            error.message ||
            'Unable to submit return request.',
        };
      } finally {
        setLoading(false);
      }
    },
    [],
  );

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
        cancelOrder,
        requestReturn,
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
