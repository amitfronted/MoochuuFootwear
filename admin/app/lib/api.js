import api from './axios';

// --- COMPONENTS API ---
export const fetchComponents = async (type) => {
  // type can be 'base', 'strap', or 'thumb'
  const res = await api.get(`/${type}/all`);
  return res.data;
};

export const createComponent = async (type, payload) => {
  const res = await api.post(`/${type}/create`, payload);
  return res.data;
};

export const deleteComponent = async (type, id) => {
  const res = await api.delete(`/${type}/delete/${id}`);
  return res.data;
};

export const checkComponentArchive = async (type, id) => {
  const res = await api.get(`/${type}/archive-check/${id}`);
  return res.data;
};

export const updateComponent = async (type, id, payload) => {
  const res = await api.put(`/${type}/update/${id}`, payload);
  return res.data;
};

// --- PRODUCT API ---
export const createProduct = async (payload) => {
  const res = await api.post('/products/create', payload);
  return res.data;
};

export const fetchProducts = async (params = {}) => {
  const res = await api.get('/products/all', { params });
  return res.data;
};

export const fetchAdminProducts = async (params = {}) => {
  const res = await api.get('/products/admin/all', { params });
  return res.data;
};

export const fetchProductById = async (id) => {
  const res = await api.get(`/products/${id}`);
  return res.data;
};

export const updateProduct = async (id, data) => {
  const res = await api.put(`/products/update/${id}`, data);
  return res.data;
};

export const checkProductActivation = async (id) => {
  const res = await api.get(`/products/activation-check/${id}`);
  return res.data;
};

export const updateProductStatus = async (id, status) => {
  const res = await api.patch(`/products/status/${id}`, {
    status,
  });

  return res.data;
};

export const deleteProduct = async (id) => {
  const res = await api.delete(`/products/delete/${id}`);
  return res.data;
};

export const fetchUsers = async () => {
  const res = await api.get('/user/all-user');
  return res.data;
};

export const updateUserRole = async (userId, role) => {
  const res = await api.put(`/user/update-role/${userId}`, { role });
  return res.data;
};

export const updateComponentStock = async (
  type,
  componentId,
  colorId,
  variantId,
  payload,
) => {
  const res = await api.put(
    `/${type}/stock/${componentId}/${colorId}/${variantId}`,
    payload,
  );

  return res.data;
};

// ---------------------------------------------
// STANDARD PRODUCT STOCK API
// ---------------------------------------------

export const updateStandardProductStock = async (
  productId,
  variantId,
  quantity,
  reason = '',
) => {
  const res = await api.put(
    `/products/${productId}/standard-stock/${variantId}`,
    {
      quantity,
      reason,
    },
  );

  return res.data;
};

// ---------------------------------------------
// ORDER API
// ---------------------------------------------

export const fetchAllOrders = async () => {
  const res = await api.get('/orders/admin/all');
  return res.data;
};

export const updateOrderShipping = async (orderId, payload) => {
  const res = await api.patch(`/orders/admin/${orderId}/shipping`, payload);

  return res.data;
};

export const updateOrderStatus = async (orderId, status) => {
  const res = await api.patch(`/orders/admin/${orderId}/status`, { status });

  return res.data;
};

// ---------------------------------------------
// NOTIFICATION API
// ---------------------------------------------

export const fetchNotifications = async () => {
  const res = await api.get('/notifications');

  return res.data;
};

export const markNotificationRead = async (notificationId) => {
  const res = await api.patch(`/notifications/${notificationId}/read`);

  return res.data;
};

export const markAllNotificationsRead = async () => {
  const res = await api.patch('/notifications/read-all');

  return res.data;
};

// *---------------------------------------------*
// * DASHBOARD API
// *---------------------------------------------*

export const fetchDashboardStats = async () => {
  const res = await api.get('/dashboard/stats');

  return res.data;
};

// *---------------------------------------------*
// * INVENTORY / STOCK HISTORY API
// *---------------------------------------------*

export const fetchInventoryHistory = async (params = {}) => {
  const res = await api.get('/inventory/history', {
    params,
  });

  return res.data;
};

export const markCodPaymentAsPaid = async (orderId) => {
  const response = await api.patch(`/orders/admin/${orderId}/cod-paid`);

  return response.data;
};

// =====================================================
// REFUND API
// =====================================================

export const fetchRefundSummary = async (orderId) => {
  const res = await api.get(`/orders/admin/${orderId}/refund/summary`);

  return res.data;
};

export const createOrderRefund = async (
  orderId,
  { amount, reason = '' },
  idempotencyKey,
) => {
  if (!idempotencyKey) {
    throw new Error('Refund idempotency key is required.');
  }

  const res = await api.post(
    `/orders/admin/${orderId}/refund`,
    {
      amount,
      reason,
    },
    {
      headers: {
        'Idempotency-Key': idempotencyKey,
      },
    },
  );

  return res.data;
};

export const reconcileOrderRefund = async (orderId) => {
  const res = await api.post(`/orders/admin/${orderId}/refund/reconcile`);

  return res.data;
};

// *--- RETURN MANAGEMENT API ---*

export const fetchReturnRequests = async () => {
  const res = await api.get('/orders/admin/returns');
  return res.data;
};

export const approveOrderReturn = async (orderId) => {
  const res = await api.patch(`/orders/admin/${orderId}/return/approve`);

  return res.data;
};

export const rejectOrderReturn = async (orderId, rejectionReason) => {
  const res = await api.patch(`/orders/admin/${orderId}/return/reject`, {
    rejectionReason,
  });

  return res.data;
};

export const completeOrderReturn = async (
  orderId,
  { condition, conditionComment = '' },
) => {
  const res = await api.patch(`/orders/admin/${orderId}/return/complete`, {
    condition,
    conditionComment,
  });

  return res.data;
};
// =====================================================
// COUPON API
// =====================================================

// Create coupon
export const createCoupon = async (data) => {
  const res = await api.post('/coupons/admin', data);
  return res.data;
};

// Get all coupons
export const fetchCoupons = async () => {
  const res = await api.get('/coupons/admin');
  return res.data;
};

// Get single coupon
export const fetchCouponById = async (couponId) => {
  const res = await api.get(`/coupons/admin/${couponId}`);
  return res.data;
};

// Update coupon
export const updateCoupon = async (couponId, data) => {
  const res = await api.patch(`/coupons/admin/${couponId}`, data);
  return res.data;
};

// Delete coupon
export const deleteCoupon = async (couponId) => {
  const res = await api.delete(`/coupons/admin/${couponId}`);
  return res.data;
};
