import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add token to requests
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('auth-token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Auth APIs
export const authAPI = {
  register: (data) => api.post('/auth/register', data),
  login: (data) => api.post('/auth/login', data),
  getMe: () => api.get('/auth/me'),
};

// Chat APIs
export const chatAPI = {
  startSession: () => api.post('/chat/start'),
  sendMessage: (data) => api.post('/chat/message', data),
  getHistory: (sessionId) => api.get(`/chat/history/${sessionId}`),
  getSessions: () => api.get('/chat/sessions'),
  deleteSession: (sessionId) => api.delete(`/chat/session/${sessionId}`),
};

// Upload APIs
export const uploadAPI = {
  uploadFile: (formData) => api.post('/upload', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  }),
  getSessionUploads: (sessionId) => api.get(`/upload/session/${sessionId}`),
  deleteUpload: (id) => api.delete(`/upload/${id}`),
};

// Doctor APIs
export const doctorAPI = {
  getPatient: (patientId) => api.get(`/doctor/patient/${patientId}`),
  getPatientChats: (patientId) => api.get(`/doctor/patient/${patientId}/chats`),
  getPatientUploads: (patientId) => api.get(`/doctor/patient/${patientId}/uploads`),
  chatWithPatientContext: (patientId, data) => api.post(`/doctor/patient/${patientId}/chat`, data),
  searchPatients: (query) => api.get(`/doctor/search-patients?query=${query}`),
};

export default api;
