import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5000/api/v1',
  withCredentials: false,
  headers: {
    'Content-Type': 'application/json',
  }
});

// Add a request interceptor to log requests and add token
api.interceptors.request.use((config) => {
  const timestamp = new Date().toLocaleTimeString();

  console.log(`
╔════════════════════════════════════════════════════════════╗
🚀 API REQUEST OUTGOING
📍 ${config.method?.toUpperCase()} ${config.url}
🕐 ${timestamp}
╠════════════════════════════════════════════════════════════╝
`);

  // Log request body if present
  if (config.data) {
    console.log('📦 REQUEST DATA:', config.data);
  }

  // Add token if available
  const token = localStorage.getItem('accessToken');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
    console.log('🔐 Token Added:', token.substring(0, 30) + '...');
  }

  console.log(`╚════════════════════════════════════════════════════════════╝
`);

  return config;
});

// Add response interceptor for logging
api.interceptors.response.use(
  (response) => {
    const timestamp = new Date().toLocaleTimeString();

    console.log(`
╔════════════════════════════════════════════════════════════╗
✅ API RESPONSE RECEIVED
📍 ${response.config.method?.toUpperCase()} ${response.config.url}
📊 Status: ${response.status} ${response.statusText}
🕐 ${timestamp}
╠════════════════════════════════════════════════════════════╝
`);

    console.log('📄 RESPONSE DATA:', response.data);

    console.log(`╚════════════════════════════════════════════════════════════╝
`);

    return response;
  },
  (error) => {
    const timestamp = new Date().toLocaleTimeString();

    console.error(`
╔════════════════════════════════════════════════════════════╗
❌ API ERROR
📍 ${error.config?.method?.toUpperCase()} ${error.config?.url}
🕐 ${timestamp}
╠════════════════════════════════════════════════════════════╝
`);

    if (error.response) {
      // Server responded with error status
      console.error('📊 Status:', error.response.status, error.response.statusText);
      console.error('📄 Error Message:', error.response.data?.message || error.response.data);
      console.error('Error Details:', error.response.data);
    } else if (error.request) {
      // Request made but no response
      console.error('❌ No Response from Server');
      console.error('📋 Request:', error.request);
    } else {
      // Error in request setup
      console.error('❌ Request Setup Error:', error.message);
    }

    console.error(`╚════════════════════════════════════════════════════════════╝
`);

    return Promise.reject(error);
  }
);

export default api;
