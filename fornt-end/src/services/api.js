import axios from 'axios';

const API_BASE_URL = 'http://localhost:3001/api';

// Create axios instance
const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add token to requests if available
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('doctorToken');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle response errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('doctorToken');
      localStorage.removeItem('doctorInfo');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// Auth API
export const authAPI = {
  register: (userData) => api.post('/auth/register', userData),
  login: (credentials) => api.post('/auth/login', credentials),
  getProfile: () => api.get('/auth/profile'),
};

// Rooms API
export const roomsAPI = {
  createRoom: (roomData) => api.post('/rooms/create', roomData),
  getMyRooms: () => api.get('/rooms/my-rooms'),
  joinRoom: (roomId, patientData) => api.post(`/rooms/join/${roomId}`, patientData),
  getRoomDetails: (roomId) => api.get(`/rooms/${roomId}`),
  deleteRoom: (roomId) => api.delete(`/rooms/${roomId}`),
};

// Consultations API
export const consultationsAPI = {
  createConsultation: (consultationData) => api.post('/consultations/create', consultationData),
  updateConsultation: (consultationId, updateData) => api.put(`/consultations/${consultationId}`, updateData),
  saveImages: (consultationId, images) => api.post(`/consultations/${consultationId}/images`, { images }),
  saveSignature: (consultationId, signature) => api.post(`/consultations/${consultationId}/signature`, { signature }),
  completeConsultation: (consultationId, data) => api.post(`/consultations/${consultationId}/complete`, data),
  getMyConsultations: () => api.get('/consultations/my-consultations'),
  getConsultationDetails: (consultationId) => api.get(`/consultations/${consultationId}`),
};

// Media API
export const mediaAPI = {
  getRoomMedia: (roomId, role, userId) => api.get(`/media/room/${roomId}?role=${role}&userId=${userId}`),
  captureImage: (imageData) => api.post('/media/capture-image', imageData),
  saveSignature: (signatureData) => api.post('/media/save-signature', signatureData),
  startRecording: (recordingData) => api.post('/media/start-recording', recordingData),
  saveRecording: (recordingData) => api.post('/media/save-recording', recordingData),
};

// Location API
export const locationAPI = {
  saveLocation: (locationData) => api.post('/location/save', locationData),
  getRoomLocation: (roomId) => api.get(`/location/room/${roomId}`),
  getCurrentLocation: (coords) => api.post('/location/get-current', coords),
  updateStatus: (statusData) => api.patch('/location/status', statusData),
  getAllRoomsLocation: () => api.get('/location/all-rooms'),
};

// Health check
export const healthCheck = () => api.get('/health');

export default api;