import apiClient from './apiClient';
import { API_URLS } from '../config/api';

const billService = {
  async getAll(params = {}) {
    const res = await apiClient.get(API_URLS.BILLS, { params });
    return { ...res.data.data, pagination: res.data.pagination };
  },
  async getById(id) {
    const res = await apiClient.get(`${API_URLS.BILLS}/${id}`);
    return res.data.data;
  },
  async getByTenant(tenantId, params = {}) {
    const res = await apiClient.get(`${API_URLS.BILLS}/tenant/${tenantId}`, { params });
    return res.data.data;
  },
  async create(data) {
    const res = await apiClient.post(API_URLS.BILLS, data);
    return res.data.data;
  },
  async update(id, data) {
    const res = await apiClient.put(`${API_URLS.BILLS}/${id}`, data);
    return res.data.data;
  },
  async remove(id) {
    const res = await apiClient.delete(`${API_URLS.BILLS}/${id}`);
    return res.data;
  },
  async send(id) {
    const res = await apiClient.post(`${API_URLS.BILLS}/${id}/send`);
    return res.data.data;
  },
  async getSummary() {
    const res = await apiClient.get(`${API_URLS.BILLS}/summary`);
    return res.data.data;
  },
  async generateRecurring(data) {
    const res = await apiClient.post(`${API_URLS.BILLS}/generate`, data);
    return res.data.data;
  },
};

export default billService;
