import apiClient from './apiClient';
import { API_URLS } from '../config/api';

const dashboardService = {
  async getOwnerDashboard() {
    const res = await apiClient.get(API_URLS.DASHBOARD);
    return res.data.data;
  },
};

export default dashboardService;
