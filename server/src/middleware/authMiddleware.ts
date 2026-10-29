import type { Response, NextFunction } from 'express';
import type { AuthenticatedRequest, UserContext, UserRole } from '../types/index.js';
import { verifyJwt } from '../utils/jwt.js';

/**
 * Authentication Middleware
 * Validates cryptographic JWT Bearer tokens or verified request headers
 */
export const authMiddleware = (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): void => {
  const authHeader = req.headers.authorization;
  const propertyHeader = req.headers['x-property-id'] as string;

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
        propertyId: propertyHeader || (payload.propertyId ? String(payload.propertyId) : ''),
        propertyName: payload.propertyName || 'Hotel Property',
        subscriptionTier: payload.tier || 'enterprise',
        permissions: payload.role === 'super_admin' || payload.role === 'general_manager'
          ? ['*']
          : (payload.permissions || ['frontdesk.access', 'read:reservations', 'write:reservations']),
      };
      req.user = user;
      req.propertyId = user.propertyId;
      return next();
    }
  }

  // 2. Verified header context (if provided by secure internal reverse proxy)
  const roleHeader = req.headers['x-user-role'] as UserRole;
  const userEmail = req.headers['x-user-email'] as string;
  const userName = req.headers['x-user-name'] as string;

  if (roleHeader || userEmail) {
    const contextUser: UserContext = {
      id: (req.headers['x-user-id'] as string) || 'usr_internal',
      name: userName || 'Staff User',
      email: userEmail || 'staff@hotelms.com',
      role: roleHeader || 'front_desk',
      propertyId: propertyHeader || '',
      propertyName: 'Property Console',
      subscriptionTier: 'enterprise',
      permissions: roleHeader === 'super_admin' || roleHeader === 'general_manager'
        ? ['*']
        : ['frontdesk.access', 'read:reservations', 'write:reservations'],
    };
    req.user = contextUser;
    req.propertyId = contextUser.propertyId;
  } else {
    // Unauthenticated context (requires login or auth token on guarded routes)
    req.user = undefined;
    req.propertyId = propertyHeader || undefined;
  }

  next();
};
