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
];

api.interceptors.response.use(
  (response) => response,

  async (error) => {
    const originalRequest = error.config;

    if (!originalRequest) {
      return Promise.reject(error);
    }

    const requestUrl = originalRequest.url || '';

    const shouldSkipRefresh = skipRefreshUrls.some((url) =>
      requestUrl.includes(url),
    );

    if (
      error.response?.status === 401 &&
      !originalRequest._retry &&
      !shouldSkipRefresh
    ) {
      return Promise.reject(error);
    }

    originalRequest._retry = true;

    try {
      if (!refreshPromise) {
        refreshPromise = api.post('/user/refresh-token').finally(() => {
          refreshPromise = null;
        });
      }

      await refreshPromise;

      return api(originalRequest);
    } catch (refreshError) {
      return Promise.reject(refreshError);
    }
  },
);

export default api;
