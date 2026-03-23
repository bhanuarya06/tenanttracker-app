import apiClient from './apiClient';
import { API_URLS } from '../config/api';

const tenantService = {
  async getAll(params = {}) {
    const res = await apiClient.get(API_URLS.TENANTS, { params });
    return { ...res.data.data, pagination: res.data.pagination };
  },
  async getById(id) {
    const res = await apiClient.get(`${API_URLS.TENANTS}/${id}`);
    return res.data.data;
  },
  async create(data) {
    const res = await apiClient.post(API_URLS.TENANTS, data);
    return res.data.data;
  },
  async update(id, data) {
    const res = await apiClient.put(`${API_URLS.TENANTS}/${id}`, data);
    return res.data.data;
  },
  async remove(id) {
    const res = await apiClient.delete(`${API_URLS.TENANTS}/${id}`);
    return res.data;
  },
  async getDashboard() {
    const res = await apiClient.get(`${API_URLS.TENANTS}/me/dashboard`);
    return res.data.data;
  },
  async addNote(id, content) {
    const res = await apiClient.post(`${API_URLS.TENANTS}/${id}/notes`, { content });
    return res.data.data;
  },
};

export default tenantService;
