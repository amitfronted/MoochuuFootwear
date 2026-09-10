import api from './axios'; // Adjust import path to your axios instance

// Fetch all products with optional filters
export const fetchAllProducts = async (filters = {}) => {
  const response = await api.get('/products/all', { params: filters });
  return response.data;
};

// Fetch a single product by ID (populated with allowed component details)
export const fetchProductById = async (productId) => {
  const response = await api.get(`/products/${productId}`);
  return response.data;
};
