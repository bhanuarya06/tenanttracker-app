import apiClient from './apiClient';
import { API_URLS } from '../config/api';
import tokenManager from './tokenManager';

const authService = {
  async register(data) {
    const res = await apiClient.post(API_URLS.AUTH.REGISTER, data);
    tokenManager.setToken(res.data.data.accessToken);
    return res.data.data;
  },

  async login(data) {
    const res = await apiClient.post(API_URLS.AUTH.LOGIN, data);
    tokenManager.setToken(res.data.data.accessToken);
    return res.data.data;
  },

  async getProfile() {
    const res = await apiClient.get(API_URLS.AUTH.PROFILE);
    return res.data.data;
  },

  async updateProfile(data) {
    const res = await apiClient.put(API_URLS.AUTH.PROFILE, data);
    return res.data.data;
  },

  async changePassword(data) {
    const res = await apiClient.put(API_URLS.AUTH.CHANGE_PASSWORD, data);
    return res.data;
  },

  async forgotPassword(email) {
    const res = await apiClient.post(API_URLS.AUTH.FORGOT_PASSWORD, { email });
    return res.data;
  },

  async resetPassword(data) {
    const res = await apiClient.post(API_URLS.AUTH.RESET_PASSWORD, data);
    return res.data;
  },

  async logout() {
    try {
      await apiClient.post(API_URLS.AUTH.LOGOUT);
    } finally {
      tokenManager.clearToken();
    }
  },
};

export default authService;
