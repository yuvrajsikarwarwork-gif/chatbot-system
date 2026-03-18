import axios from "axios";

// Standardize the URL. Ensure this matches your backend server.ts port.
const BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000/api";

export const apiClient = axios.create({
  baseURL: BASE_URL,
});

// INTERCEPTOR: Attach JWT to requests
apiClient.interceptors.request.use((config) => {
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem("token");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    
    // Add the bot context if available in local storage or a store
    const activeBotId = localStorage.getItem("activeBotId");
    if (activeBotId) {
      config.headers['x-bot-id'] = activeBotId;
    }
  }
  return config;
}, (error) => {
  return Promise.reject(error);
});

// RESPONSE INTERCEPTOR: Handle 401 Unauthorized and Network Errors
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    // Check if it's a network-level error (no response)
    if (!error.response) {
      console.error(`❌ API UNREACHABLE: Is the backend running at ${BASE_URL}?`);
    }

    if (error.response?.status === 401 && typeof window !== 'undefined') {
      localStorage.removeItem("token");
      if (window.location.pathname !== "/login") {
        window.location.href = "/login";
      }
    }
    return Promise.reject(error);
  }
);

export default apiClient;