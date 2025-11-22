import axios, { AxiosError } from 'axios';

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api',
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  },
  withCredentials: false, // Set to false for public endpoints, will be overridden for auth endpoints
});

/**
 * Enhanced error logging function
 * Logs detailed information about the error including URL, type, and response status
 */
function logApiError(endpoint: string, error: any) {
  const timestamp = new Date().toISOString();
  
  console.error(`[${timestamp}] API Error on ${endpoint}:`);
  console.error(`Base URL: ${api.defaults.baseURL}`);
  console.error(`Full URL: ${api.defaults.baseURL}${endpoint}`);
  
  if (error.response) {
    // Server responded with error status
    console.error(`Response Error - Status: ${error.response.status}`);
    console.error(`Response Data:`, error.response.data);
    console.error(`Response Headers:`, error.response.headers);
  } else if (error.request) {
    // Request made but no response
    console.error('Request Error - No response from server');
    console.error('Request Config:', error.request);
    console.error('This might indicate:');
    console.error('  - Backend server is not running');
    console.error('  - Backend URL is incorrect');
    console.error('  - Network/CORS issues');
  } else {
    // Error in request setup
    console.error('Setup Error:', error.message);
  }
}

// Request interceptor
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
      config.withCredentials = true; // Enable credentials for authenticated requests
    }
    const fullUrl = `${config.baseURL}${config.url}`;
    console.log(`[API Request] ${config.method?.toUpperCase()} ${fullUrl}`);
    return config;
  },
  (error) => {
    console.error('[API Request Error]', error);
    return Promise.reject(error);
  }
);

// Response interceptor
api.interceptors.response.use(
  (response) => {
    console.log(`[API Response] ${response.status} from ${response.config.url}`);
    return response;
  },
  (error: AxiosError) => {
    const endpoint = error.config?.url || 'unknown';
    logApiError(endpoint, error);
    
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      if (typeof window !== 'undefined') {
        window.location.href = '/login';
      }
    }
    
    return Promise.reject(error);
  }
);

export default api;

// Helper function for fetching products
export async function getProducts(params?: { category?: string; search?: string }) {
  const queryParams = new URLSearchParams();
  if (params?.category) queryParams.append('category', params.category);
  if (params?.search) queryParams.append('search', params.search);
  
  const url = `/products${queryParams.toString() ? '?' + queryParams.toString() : ''}`;
  const response = await api.get(url);
  return response.data.data || response.data;
}

