// API URL configuration for development vs production
// In development: uses Vite proxy (/api -> localhost:8080)
// In production: uses environment variable VITE_API_URL

const API_URL = import.meta.env.VITE_API_URL || '';

export default API_URL;
