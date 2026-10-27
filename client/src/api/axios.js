import axios from 'axios'

export const AUTH_TOKEN_KEY = 'photocollect.authToken'
export const AUTH_USER_KEY = 'photocollect.user'

const getBaseURL = () => {
  let url = import.meta.env.VITE_API_URL;
  if (url) {
    if (!url.endsWith('/api') && !url.endsWith('/api/')) {
      url = url.endsWith('/') ? `${url}api` : `${url}/api`;
    }
    return url;
  }
  const hostname = window.location.hostname;
  if (hostname !== "localhost" && hostname !== "127.0.0.1") {
    // Connect to the backend on the same host IP
    return `${window.location.protocol}//${hostname}:5000/api`;
  }
  return "http://localhost:5000/api";
};

const api = axios.create({
  baseURL: getBaseURL(),
  withCredentials: true, // Crucial for sending/receiving HttpOnly cookies
})

api.interceptors.request.use((config) => {
  const token = localStorage.getItem(AUTH_TOKEN_KEY)
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// Queue to hold pending requests while the access token is being refreshed
let isRefreshing = false;
let failedQueue = [];

const processQueue = (error, token = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });
  failedQueue = [];
};

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // Check if error is 401 and corresponds to an expired access token
    const isExpiredError = error.response?.status === 401 && 
      error.response?.data?.code === "ACCESS_TOKEN_EXPIRED";

    if (isExpiredError && !originalRequest._retry) {
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then((token) => {
            originalRequest.headers.Authorization = `Bearer ${token}`;
            return api(originalRequest);
          })
          .catch((err) => Promise.reject(err));
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        // Request token refresh (the browser automatically sends the pc_sid cookie)
        const refreshResponse = await axios.post(
          `${getBaseURL()}/auth/refresh`,
          {},
          { withCredentials: true }
        );

        const { accessToken } = refreshResponse.data;
        localStorage.setItem(AUTH_TOKEN_KEY, accessToken);
        
        // Update authorization headers
        api.defaults.headers.common['Authorization'] = `Bearer ${accessToken}`;
        originalRequest.headers.Authorization = `Bearer ${accessToken}`;

        processQueue(null, accessToken);
        return api(originalRequest);
      } catch (refreshErr) {
        processQueue(refreshErr, null);
        // Clear auth tokens on refresh failure to force user login
        localStorage.removeItem(AUTH_TOKEN_KEY);
        localStorage.removeItem(AUTH_USER_KEY);
        
        // Trigger page reload to auth or login route if applicable
        if (typeof window !== "undefined") {
          window.dispatchEvent(new Event("auth_session_expired"));
        }
        return Promise.reject(refreshErr);
      } finally {
        isRefreshing = false;
      }
    } else if (
      error.response?.status === 401 && 
      !originalRequest.url?.includes('/auth/login') && 
      !originalRequest.url?.includes('/auth/register')
    ) {
      localStorage.removeItem(AUTH_TOKEN_KEY);
      localStorage.removeItem(AUTH_USER_KEY);
      if (typeof window !== "undefined") {
        window.dispatchEvent(new Event("auth_session_expired"));
      }
    }

    return Promise.reject(error);
  }
);

export default api;
