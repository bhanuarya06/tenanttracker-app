import apiClient from './apiClient';
import { API_URLS } from '../config/api';

const uploadService = {
  async uploadImage(file) {
    const formData = new FormData();
    formData.append('image', file);
    const res = await apiClient.post(API_URLS.UPLOADS, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return res.data.data;
  },
};

export default uploadService;
