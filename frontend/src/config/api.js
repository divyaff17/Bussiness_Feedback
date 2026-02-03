// API Configuration for development and production
// Development: Uses Vite proxy (empty string)
// Production: Uses Railway backend URL from environment variable

const API_URL = import.meta.env.VITE_API_URL || '';

export default API_URL;
