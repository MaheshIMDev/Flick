import axios from 'axios';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL ;

 API_BASE_URL);

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 10000,
});


api.interceptors.request.use(
  (config) => {
    
    if (typeof window !== 'undefined') {
      const token = localStorage.getItem('accessToken');
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
        
      } else {
        
      }
    }
    
    
    return config;
  },
  (error) => {
    
    return Promise.reject(error);
  }
);

// Response interceptor
api.interceptors.response.use(
  (response) => {
    
    return response;
  },
  (error) => {
    
    
    if (error.response?.status === 401) {
      
      if (typeof window !== 'undefined') {
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
        window.location.href = '/login';
      }
    }
    
    return Promise.reject(error);
  }
);

export default api;
