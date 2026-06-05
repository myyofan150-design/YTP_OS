// src/lib/api.ts
// Axios instance pointing to the Express backend.
// Automatically attaches JWT token from localStorage and handles 401 redirects.

import axios from "axios";

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api",
});

// Attach Bearer token from localStorage on every request
api.interceptors.request.use((config) => {
  if (typeof window !== "undefined") {
    const token = localStorage.getItem("agency_token");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  }
  return config;
});

// On 401, only redirect if the user had an active session (token existed).
// Public endpoints like /2fa/verify also return 401 for wrong codes — don't redirect those.
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401 && typeof window !== "undefined") {
      const hadToken = !!localStorage.getItem("agency_token");
      localStorage.removeItem("agency_token");
      localStorage.removeItem("agency_user");
      if (hadToken) window.location.href = "/login";
    }
    return Promise.reject(error);
  }
);

export default api;
