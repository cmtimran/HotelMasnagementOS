/**
 * HotelManagementOS - Centralized API URL Resolution
 * 
 * Automatically resolves the correct backend API base URL depending on the environment:
 * - In Production (HTTPS / Vercel / Cloud): Uses relative URL `""` so all calls go to 
 *   the same HTTPS origin (e.g. `/api/bookings`). Completely prevents Mixed Content
 *   (HTTP over HTTPS) and CORS errors.
 * - In Development (Localhost / 127.0.0.1): Uses `http://localhost:3001` (or window.location.hostname:3001).
 * - Custom overrides: Respected via `import.meta.env.VITE_API_BASE_URL`.
 */

export const getApiBaseUrl = (): string => {
  // 1. Explicit environment variable takes highest priority
  const envUrl = (import.meta as any).env?.VITE_API_BASE_URL;
  if (envUrl && typeof envUrl === 'string' && envUrl.trim().length > 0) {
    return envUrl.trim().replace(/\/+$/, '');
  }

  // 2. Client-side browser execution
  if (typeof window !== 'undefined') {
    const isHttps = window.location.protocol === 'https:';
    const hostname = window.location.hostname;
    const isLocalhost = hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '[::1]';

    // When running locally in Vite dev server (e.g. http://localhost:5173), target port 3001
    if (isLocalhost) {
      return `http://${hostname}:3001`;
    }

    // When running on HTTPS (Vercel, custom domain, or cloud deployment):
    // Use relative path "" so requests route to `https://<domain>/api/...`
    // This avoids port 3001 blocks and Mixed Content issues completely.
    if (isHttps) {
      return '';
    }

    // Default for plain HTTP on a local LAN IP (e.g. 192.168.1.X)
    return `http://${hostname}:3001`;
  }

  // Fallback for SSR or non-browser execution
  return 'http://localhost:3001';
};

export const API_BASE_URL = getApiBaseUrl();
