import axios from "axios";

const baseURL =
  (import.meta.env.VITE_API_URL as string | undefined)?.replace(/\/$/, "") ||
  "http://localhost:3001/api";

const api = axios.create({
  baseURL,
  headers: { "Content-Type": "application/json" },
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("assistdoc_token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem("assistdoc_token");
      localStorage.removeItem("assistdoc_user");
      window.dispatchEvent(new Event("assistdoc:unauthorized"));
    }
    return Promise.reject(error);
  },
);

export default api;
