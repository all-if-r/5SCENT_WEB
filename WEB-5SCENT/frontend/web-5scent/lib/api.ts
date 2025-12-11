import axios, { AxiosError } from 'axios';

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api',
  headers: {
    'Accept': 'application/json',
  },
  withCredentials: false, // Set to false for public endpoints, will be overridden for auth endpoints
});

/**
 * Enhanced error logging function
 * Logs detailed information about the error including URL, type, and response status
 * Skips verbose logging for expected client errors (4xx) that are handled by the application
 */
function logApiError(endpoint: string, error: any) {
  const timestamp = new Date().toISOString();
  
  // Skip verbose logging for expected client errors (4xx) - these are handled by application logic
  if (error.response?.status && error.response.status >= 400 && error.response.status < 500) {
    // Only log minimal info for client errors (validation, auth, not found, etc.)
    console.debug(`[${timestamp}] Client Error ${error.response.status} on ${endpoint}`);
    return;
  }
  
  // Only log verbose errors for server errors (5xx) and network issues
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
    // Try admin token first, then regular user token
    const adminToken = localStorage.getItem('admin_token');
    const userToken = localStorage.getItem('token');
    const token = adminToken || userToken;
    
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
      // Not using withCredentials since we're using token-based auth, not cookie-based
    }
    
    // Check if data is FormData
    if (config.data instanceof FormData) {
      // IMPORTANT: For FormData, DELETE Content-Type header so browser sets it with correct boundary
      delete config.headers['Content-Type'];
    } else if (!(config.data instanceof FormData)) {
      // Only set Content-Type for JSON if data is not FormData
      config.headers['Content-Type'] = 'application/json';
    }
    
    const fullUrl = `${config.baseURL}${config.url}`;
    console.log(`[API Request] ${config.method?.toUpperCase()} ${fullUrl}`);
    if (config.data instanceof FormData) {
      console.log('[API Request] FormData detected - content-type will be set by browser');
    }
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
      // IMPORTANT: Don't auto-redirect on auth pages (/login, /register, etc.)
      // This prevents infinite redirect loops when user is trying to log in
      const authPages = ['/login', '/register', '/forgot-password', '/reset-password'];
      const currentPath = typeof window !== 'undefined' ? window.location.pathname : '';
      const isAuthPage = authPages.some(page => currentPath.startsWith(page));
      
      // Only auto-redirect if NOT on an auth page
      if (!isAuthPage) {
        // Handle 401 for both admin and user contexts
        const adminToken = localStorage.getItem('admin_token');
        const userToken = localStorage.getItem('token');
        
        if (adminToken) {
          // Admin logout
          localStorage.removeItem('admin_token');
          localStorage.removeItem('admin');
          if (typeof window !== 'undefined') {
            window.location.href = '/admin/login';
          }
        } else if (userToken) {
          // User logout - but only if not on a page where we expect 401
          localStorage.removeItem('token');
          localStorage.removeItem('user');
          if (typeof window !== 'undefined') {
            window.location.href = '/login';
          }
        }
      }
      // If on auth page, let the error propagate so the component can handle it
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

