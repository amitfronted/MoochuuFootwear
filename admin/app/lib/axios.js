import axios from 'axios';

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL,
  withCredentials: true,
});

let refreshPromise = null;

const skipRefreshUrls = [
  '/user/login',
  '/user/register',
  '/user/google-login',
  '/user/refresh-token',
  '/user/verifyEmail',
  '/user/resend-otp',
  '/user/forgot-password',
  '/user/verify-forgot-password-otp',
  '/user/reset-password',
];

api.interceptors.response.use(
  (response) => response,

  async (error) => {
    const originalRequest = error.config;

    if (!originalRequest) {
      return Promise.reject(error);
    }

    // Only handle 401 Unauthorized
    if (error.response?.status !== 401) {
      return Promise.reject(error);
    }

    const requestUrl = originalRequest.url || '';

    const shouldSkipRefresh = skipRefreshUrls.some((url) =>
      requestUrl.includes(url),
    );

    // Don't refresh authentication-related requests
    if (shouldSkipRefresh) {
      return Promise.reject(error);
    }

    // Don't retry the same request more than once
    if (originalRequest._retry) {
      return Promise.reject(error);
    }

    originalRequest._retry = true;

    try {
      // Prevent multiple simultaneous requests from
      // creating multiple refresh requests.
      if (!refreshPromise) {
        refreshPromise = api.post('/user/refresh-token').finally(() => {
          refreshPromise = null;
        });
      }

      await refreshPromise;

      // Retry original request with the new access-token cookie
      return api(originalRequest);
    } catch (refreshError) {
      return Promise.reject(refreshError);
    }
  },
);

export default api;
