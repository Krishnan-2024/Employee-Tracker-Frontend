import axios from "axios";

// Get token from localStorage
const getToken = () => localStorage.getItem("access_token");

// Create an Axios instance
const api = axios.create({
  baseURL: "https://backend-jtcd.onrender.com/admin/api",
  headers: { "Content-Type": "application/json" },
  withCredentials: true, 
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
    if (error.response?.status === 401) {
      try {
        const refreshToken = localStorage.getItem("refresh_token");
        if (!refreshToken) throw new Error("No refresh token available");

        // Request new access token
        const res = await axios.post(
          "https://backend-jtcd.onrender.com/admin/api/user/token/refresh/",
          { refresh: refreshToken }
        );

        const newAccessToken = res.data.access;
        localStorage.setItem("access_token", newAccessToken);

        // Retry original request
        error.config.headers.Authorization = `Bearer ${newAccessToken}`;
        return api(error.config);
      } catch (refreshError) {
        console.error("Token refresh failed. Redirecting to login.");
        localStorage.removeItem("access_token");
        localStorage.removeItem("refresh_token");
        window.location.href = "/login";
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

// Profile APIs
export const getProfile = () => api.get("/user/profile/");
export const updateProfile = (formData) =>
  api.patch("/user/profile/update/", formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });

// Work Log APIs
export const getWorkLogs = () => api.get("/v1/worklogs/");
export const getWorkLogById = (id) => api.get(`/v1/worklogs/${id}/`);
export const createWorkLog = (data) => api.post("/v1/worklogs/", data);
export const updateWorkLog = (id, data) =>
  api.patch(`/v1/worklogs/${id}/`, data);
