import apiClient from './apiClient';
import { API_URLS } from '../config/api';

const paymentService = {
  async getAll(params = {}) {
    const res = await apiClient.get(API_URLS.PAYMENTS, { params });
    return { ...res.data.data, pagination: res.data.pagination };
  },
  async getById(id) {
    const res = await apiClient.get(`${API_URLS.PAYMENTS}/${id}`);
    return res.data.data;
  },
  async create(data) {
    const res = await apiClient.post(API_URLS.PAYMENTS, data);
    return res.data.data;
  },
  async update(id, data) {
    const res = await apiClient.put(`${API_URLS.PAYMENTS}/${id}`, data);
    return res.data.data;
  },
  async getStats() {
    const res = await apiClient.get(`${API_URLS.PAYMENTS}/stats`);
    return res.data.data;
  },
  async createOrder(billId) {
    const res = await apiClient.post(`${API_URLS.PAYMENTS}/order`, { billId });
    return res.data.data;
  },
  async verifyPayment(data) {
    const res = await apiClient.post(`${API_URLS.PAYMENTS}/verify`, data);
    return res.data.data;
  },
};

export default paymentService;
