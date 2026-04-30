import apiClient from './apiClient';
import { API_URLS } from '../config/api';

const maintenanceService = {
  async create(data) {
    const res = await apiClient.post(API_URLS.MAINTENANCE, data);
    return res.data.data;
  },
  async getAll(params = {}) {
    const res = await apiClient.get(API_URLS.MAINTENANCE, { params });
    return { ...res.data.data, pagination: res.data.pagination };
  },
  async getById(id) {
    const res = await apiClient.get(`${API_URLS.MAINTENANCE}/${id}`);
    return res.data.data;
  },
  async updateStatus(id, data) {
    const res = await apiClient.put(`${API_URLS.MAINTENANCE}/${id}/status`, data);
    return res.data.data;
  },
};

export default maintenanceService;
