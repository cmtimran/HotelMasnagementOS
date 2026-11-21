import type { Response, NextFunction } from 'express';
import type { AuthenticatedRequest, UserContext, UserRole } from '../types/index.js';
import { verifyJwt } from '../utils/jwt.js';
import { getDefaultActivePropertyId } from '../database/postgres.js';

/**
 * Public routes that do not require authentication
 */
const isPublicEndpoint = (req: AuthenticatedRequest): boolean => {
  const url = (req.originalUrl || req.url || '').split('?')[0].toLowerCase();
  return (
    url === '/health' ||
    url === '/api/health' ||
    url.startsWith('/auth/login') ||
    url.startsWith('/api/auth/login') ||
    url.startsWith('/central/tenant-lookup') ||
    url.startsWith('/api/central/tenant-lookup') ||
    url.startsWith('/api/cx') ||
    url.startsWith('/cx') ||
    url.startsWith('/realtime/stream') ||
    url.startsWith('/api/realtime/stream')
  );
};

/**
 * Authentication Middleware
 * Validates cryptographic JWT Bearer tokens or verified request headers.
 * Rejects anonymous and invalid requests with 401 Unauthorized.
 */
export const authMiddleware = (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): void => {
  // Allow public endpoints without credentials
  if (isPublicEndpoint(req)) {
    return next();
  }

  const authHeader = req.headers.authorization;
  const requestedProperty = (req.headers['x-property-id'] as string) || (req.query?.propertyId as string) || '';
  const effectivePropertyId = requestedProperty || getDefaultActivePropertyId() || '';

  // 1. Verify cryptographic JWT Bearer token if provided
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.substring(7).trim();
    const payload = verifyJwt(token);
    if (payload) {
      const user: UserContext = {
        id: payload.sub || payload.id || 'usr_jwt',
        name: payload.name || 'Authenticated User',
        email: payload.email || 'user@hotelos.com',
        role: (payload.role as UserRole) || 'front_desk',
        propertyId: effectivePropertyId || (payload.propertyId ? String(payload.propertyId) : ''),
        propertyName: payload.propertyName || 'Hotel Property',
        subscriptionTier: payload.tier || 'enterprise',
        permissions: payload.role === 'super_admin' || payload.role === 'general_manager'
          ? ['*']
          : (payload.permissions || ['frontdesk.access', 'read:reservations', 'write:reservations', 'reservation.view', 'reservation.manage', 'room.view']),
      };
      req.user = user;
      req.propertyId = user.propertyId;
      return next();
    }

    // Invalid or expired token: Reject with 401 without privilege escalation fallthrough
    res.status(401).json({ success: false, error: 'Invalid or expired authentication token' });
    return;
  }

  // 2. Verified header context (only when provided with matching internal proxy secret)
  const internalSecret = req.headers['x-internal-secret'] as string | undefined;
  const expectedSecret = process.env.INTERNAL_PROXY_SECRET;
  const roleHeader = req.headers['x-user-role'] as UserRole;
  const userEmail = req.headers['x-user-email'] as string;
  const userName = req.headers['x-user-name'] as string;

  if (expectedSecret && internalSecret === expectedSecret && (roleHeader || userEmail)) {
    const contextUser: UserContext = {
      id: (req.headers['x-user-id'] as string) || 'usr_internal',
      name: userName || 'Staff User',
      email: userEmail || 'staff@hotelms.com',
      role: roleHeader || 'front_desk',
      propertyId: effectivePropertyId,
      propertyName: 'Property Console',
      subscriptionTier: 'enterprise',
      permissions: roleHeader === 'super_admin' || roleHeader === 'general_manager'
        ? ['*']
        : ['frontdesk.access', 'read:reservations', 'write:reservations', 'reservation.view', 'reservation.manage'],
    };
    req.user = contextUser;
    req.propertyId = contextUser.propertyId;
    return next();
  }

  // 3. Local Development Terminal Mock ONLY when explicitly enabled via environment variable
  if (process.env.ALLOW_ANONYMOUS_DEV_TERMINAL === 'true' && process.env.NODE_ENV !== 'production') {
    const terminalUser: UserContext = {
      id: 'usr_frontdesk_dev',
      name: 'Front Desk Local Terminal',
      email: 'terminal@hotelms.local',
      role: 'front_desk',
      propertyId: effectivePropertyId || '1',
      propertyName: 'Front Desk Console',
      subscriptionTier: 'enterprise',
      permissions: [
        'frontdesk.access',
        'read:reservations',
        'write:reservations',
        'reservation.view',
        'reservation.manage',
        'room.view'
      ],
    };
    req.user = terminalUser;
    req.propertyId = terminalUser.propertyId;
    return next();
  }

  // 4. Default: Missing credentials return 401 Unauthorized
  res.status(401).json({ success: false, error: 'Authentication required' });
  return;
};
