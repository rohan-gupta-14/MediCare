/**
 * api.js — Axios instance (Phase 07 will populate this)
 *
 * This file creates a pre-configured Axios instance that:
 * - Points to the backend API base URL (from VITE_API_URL env var)
 * - Automatically attaches the JWT token to every request
 * - Handles 401 responses (logout on token expiry)
 *
 * Full implementation in Phase 07.
 */

import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5000/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor — attach JWT token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('medicare_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor — handle auth errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('medicare_token');
      localStorage.removeItem('medicare_user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export default api;
