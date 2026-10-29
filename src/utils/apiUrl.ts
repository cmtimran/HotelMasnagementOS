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

    // When running locally in Vite dev server (e.g. http://localhost:5173), target port 3002
    if (isLocalhost) {
      return `http://${hostname}:3002`;
    }

    // When running on HTTPS (Vercel, custom domain, or cloud deployment):
    // Use relative path "" so requests route to `https://<domain>/api/...`
    // This avoids port blocks and Mixed Content issues completely.
    if (isHttps) {
      return '';
    }

    // Default for plain HTTP on a local LAN IP (e.g. 192.168.1.X)
    return `http://${hostname}:3002`;
  }

  // Fallback for SSR or non-browser execution
  return 'http://localhost:3002';
};

export const API_BASE_URL = getApiBaseUrl();

/**
 * Resolves the currently active property ID from localStorage
 */
export const getActivePropertyId = (): number => {
  if (typeof window !== 'undefined') {
    const saved = localStorage.getItem('hotel_active_property_id');
    if (saved) {
      const parsed = Number(saved);
      if (!isNaN(parsed) && parsed > 0) return parsed;
    }
  }
  return 0;
};

/**
 * Resolves the currently active tenant slug from localStorage
 */
export const getActiveTenantSlug = (): string => {
  if (typeof window !== 'undefined') {
    const slug = localStorage.getItem('hotel_active_tenant_slug');
    if (!slug || slug === 'gpd' || slug === 'default' || slug === 'hq-corp') {
      return '';
    }
    return slug;
  }
  return '';
};

/**
 * Generates HTTP headers for Multi-Tenant database routing
 */
export const getTenantHeaders = (): Record<string, string> => {
  const tenantSlug = getActiveTenantSlug();
  const propId = getActivePropertyId();
  const headers: Record<string, string> = {};
  if (tenantSlug) headers['X-Tenant-Id'] = tenantSlug;
  if (propId > 0) headers['x-property-id'] = String(propId);
  return headers;
};

/**
 * Global Automatic Fetch Enhancer for Multi-Tenant & Multi-Property Header Injection
 * Injects 'X-Tenant-Id' and 'x-property-id' headers for all backend API calls so every component
 * automatically routes to the active property.
 */
if (typeof window !== 'undefined' && !(window as any).__hotelTenantFetchInstalled) {
  (window as any).__hotelTenantFetchInstalled = true;
  const originalFetch = window.fetch;
  window.fetch = function (input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
    const urlStr = typeof input === 'string' 
      ? input 
      : input instanceof URL 
        ? input.toString() 
        : (input as Request).url;

    // Auth endpoints authenticate against the central platform database directly
    if (urlStr && (urlStr.includes('/api/auth/') || urlStr.endsWith('/api/auth/login') || urlStr.endsWith('/auth/login'))) {
      return originalFetch.call(this, input, init);
    }

    // Only inject for API routes targeting backend (excluding external CDNs/assets)
    if (urlStr && (urlStr.includes('/api/') || urlStr.startsWith('/api'))) {
      const tenantSlug = getActiveTenantSlug();
      const propId = getActivePropertyId();
      const modifiedInit: RequestInit = { ...(init || {}) };
      const headers = new Headers(
        modifiedInit.headers || 
        (typeof input === 'object' && input && 'headers' in input ? (input as Request).headers : undefined) || 
        {}
      );

      const authToken = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null;
      if (authToken && !headers.has('Authorization')) {
        headers.set('Authorization', `Bearer ${authToken}`);
      }
      if (tenantSlug && !headers.has('X-Tenant-Id')) {
        headers.set('X-Tenant-Id', tenantSlug);
      }
      if (propId > 0 && !headers.has('x-property-id')) {
        headers.set('x-property-id', String(propId));
      }
      modifiedInit.headers = headers;
      return originalFetch.call(this, input, modifiedInit);
    }
    return originalFetch.call(this, input, init);
  };
}
