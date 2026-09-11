import axios from 'axios';

const api = axios.create({
  baseURL:
    process.env.NEXT_PUBLIC_API_URL ||
    'https://moochuufootwear.onrender.com/api',
  withCredentials: true,
});

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (!originalRequest) {
      return Promise.reject(error);
    }

    const requestUrl = originalRequest.url || '';

    // Don't refresh for authentication-related requests
    const skipRefreshUrls = [
      '/user/login',
      '/user/register',
      '/user/google-login',
      '/user/user-details',
      '/user/refresh-token',
      '/user/verifyEmail',
      '/user/resend-otp',
    ];

    const shouldSkipRefresh = skipRefreshUrls.some((url) =>
      requestUrl.includes(url),
    );

    if (
      error.response?.status === 401 &&
      !originalRequest._retry &&
      !shouldSkipRefresh
    ) {
      originalRequest._retry = true;

      try {
        await api.post('/user/refresh-token');

        return api(originalRequest);
      } catch (refreshError) {
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  },
);

export default api;
