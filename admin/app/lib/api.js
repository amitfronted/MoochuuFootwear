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
