import axios from "axios";

// Get token from localStorage
const getToken = () => localStorage.getItem("access_token");

// Define the base URL using the environment variable, falling back to localhost if not set
const baseURL = process.env.REACT_APP_API_URL || "http://localhost:8000/api";

// Create an Axios instance using the baseURL from the environment variable
const api = axios.create({
  baseURL,
  headers: { "Content-Type": "application/json" },
});

// Request Interceptor: Attach Authorization Token
api.interceptors.request.use(
  (config) => {
    const token = getToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response Interceptor: Handle Expired Tokens
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // Check for 401 errors and prevent infinite loops with _retry flag
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      console.warn("Token expired. Attempting refresh...");
      try {
        const refreshToken = localStorage.getItem("refresh_token");
        if (!refreshToken) throw new Error("No refresh token available");

        // Request new access token using the environment variable
        const res = await axios.post(`${baseURL}/user/token/refresh/`, {
          refresh: refreshToken,
        });
        const newAccessToken = res.data.access;
        localStorage.setItem("access_token", newAccessToken);

        // Retry original request with new token
        originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
        return api(originalRequest);
      } catch (refreshError) {
        console.error("Token refresh failed. Redirecting to login.");
        localStorage.removeItem("access_token");
        localStorage.removeItem("refresh_token");
        window.location.href = "/login"; // Redirect to login page
      }
    }
    return Promise.reject(error);
  }
);

export default api;

// Authentication APIs
export const register = (data) => api.post("/user/register/", data);
export const verifyEmail = (token) => api.get(`/user/verify-email/${token}/`);
export const login = (data) => api.post("/user/login/", data);
export const logout = () => api.post("/user/logout/");
export const forgotPassword = (data) => api.post("/user/forgot-password/", data);
export const resetPassword = (token, data) =>
  api.post(`/user/reset-password/${token}/`, data);

// User Profile APIs
export const getProfile = async () => {
  return await api.get("/user/profile/", {
    headers: { Authorization: `Bearer ${getToken()}` },
  });
};

export const updateProfile = async (formData) => {
  return await api.patch("/user/profile/update/", formData, {
    headers: {
      "Content-Type": "multipart/form-data",
      Authorization: `Bearer ${getToken()}`,
    },
  });
};

// Work Log APIs
export const getWorkLogs = () => api.get("/v1/worklogs/");
export const getWorkLogById = (id) => api.get(`/v1/worklogs/${id}/`);
export const createWorkLog = (data) => api.post("/v1/worklogs/", data);
export const updateWorkLog = (id, data) => api.patch(`/v1/worklogs/${id}/`, data);
