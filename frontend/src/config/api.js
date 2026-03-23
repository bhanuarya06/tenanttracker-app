const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5001';

export const API_URLS = {
  AUTH: {
    LOGIN: '/auth/login',
    REGISTER: '/auth/register',
    PROFILE: '/auth/profile',
    REFRESH: '/auth/token/refresh',
    LOGOUT: '/auth/logout',
    CHANGE_PASSWORD: '/auth/change-password',
    FORGOT_PASSWORD: '/auth/forgot-password',
    RESET_PASSWORD: '/auth/reset-password',
    OAUTH_CALLBACK: (provider) => `/auth/oauth/${provider}/callback`,
    OAUTH_UNLINK: (provider) => `/auth/oauth/${provider}/unlink`,
    ME: '/auth/me',
  },
  PROPERTIES: '/api/properties',
  TENANTS: '/api/tenants',
  BILLS: '/api/bills',
  PAYMENTS: '/api/payments',
  DASHBOARD: '/api/dashboard',
  UPLOADS: '/api/uploads',
};

export default API_BASE_URL;
