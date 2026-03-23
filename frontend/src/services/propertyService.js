import apiClient from './apiClient';
import { API_URLS } from '../config/api';

const propertyService = {
  async getAll(params = {}) {
    const res = await apiClient.get(API_URLS.PROPERTIES, { params });
    return { ...res.data.data, pagination: res.data.pagination };
  },
  async getById(id) {
    const res = await apiClient.get(`${API_URLS.PROPERTIES}/${id}`);
    return res.data.data;
  },
  async create(data) {
    const res = await apiClient.post(API_URLS.PROPERTIES, data);
    return res.data.data;
  },
  async update(id, data) {
    const res = await apiClient.put(`${API_URLS.PROPERTIES}/${id}`, data);
    return res.data.data;
  },
  async remove(id) {
    const res = await apiClient.delete(`${API_URLS.PROPERTIES}/${id}`);
    return res.data;
  },
  async getStats() {
    const res = await apiClient.get(`${API_URLS.PROPERTIES}/stats`);
    return res.data.data;
  },
};

export default propertyService;
