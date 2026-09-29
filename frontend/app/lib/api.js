import api from './axios'; // Adjust import path to your axios instance
import productOrder from '../data/productOrder.json';

// Fetch all products with optional filters
export const fetchAllProducts = async (filters = {}) => {
  const response = await api.get('/products/all', {
    params: {
      ...filters,
      // Important:
      // don't paginate at backend when using custom order
      page: 1,
      limit: 1000,
    },
  });

  const result = response.data;

  if (!result?.success || !Array.isArray(result.data)) {
    return result;
  }

  const orderMap = new Map(
    productOrder.map((item, index) => [
      String(item.productCode || '')
        .trim()
        .toUpperCase(),
      index,
    ]),
  );

  const sortedProducts = [...result.data].sort((a, b) => {
    const codeA = String(a.productCode || '')
      .trim()
      .toUpperCase();

    const codeB = String(b.productCode || '')
      .trim()
      .toUpperCase();

    const orderA = orderMap.get(codeA);
    const orderB = orderMap.get(codeB);

    // Both exist in productOrder.json
    if (orderA !== undefined && orderB !== undefined) {
      return orderA - orderB;
    }

    // A exists, B doesn't
    if (orderA !== undefined) {
      return -1;
    }

    // B exists, A doesn't
    if (orderB !== undefined) {
      return 1;
    }

    // Neither exists
    return 0;
  });

  return {
    ...result,
    data: sortedProducts,
    total: sortedProducts.length,
    totalPages: 1,
    page: 1,
    limit: sortedProducts.length,
  };
};

// Fetch a single product by ID (populated with allowed component details)
export const fetchProductById = async (productId) => {
  const response = await api.get(`/products/${productId}`);
  return response.data;
};

// Validate customer coupon
export const validateCoupon = async ({ code, subtotal }) => {
  const response = await api.post('/coupons/validate', {
    code,
    subtotal,
  });

  return response.data;
};
