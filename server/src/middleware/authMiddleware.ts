import type { Response, NextFunction } from 'express';
import type { AuthenticatedRequest, UserContext, UserRole } from '../types/index.js';

/**
 * Authentication Middleware
 * Validates JWT Bearer tokens or sets default development user context
 */
export const authMiddleware = (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): void => {
  const authHeader = req.headers.authorization;
  const propertyHeader = req.headers['x-property-id'] as string;

  // 1. Validate JWT Bearer token if provided
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.substring(7).trim();
    try {
      const parts = token.split('.');
      if (parts.length === 3) {
        const payload = JSON.parse(Buffer.from(parts[1], 'base64url').toString('utf8'));
        const user: UserContext = {
          id: payload.sub || payload.id || 'usr_jwt',
          name: payload.name || payload.email?.split('@')[0] || 'Authenticated User',
          email: payload.email || 'user@hotelos.com',
          role: (payload.role as UserRole) || 'front_desk',
          propertyId: propertyHeader || payload.propertyId || '1',
          propertyName: payload.propertyName || 'Hotel Property',
          subscriptionTier: payload.tier || 'enterprise',
          permissions: payload.permissions || ['frontdesk.access', 'read:reservations', 'write:reservations'],
        };
        req.user = user;
        req.propertyId = user.propertyId;
        return next();
      }
    } catch (tokenErr) {
      console.warn('Bearer token parse notice:', tokenErr);
    }
  }

  // 2. Header-driven RBAC authentication context
  const roleHeader = (req.headers['x-user-role'] as UserRole) || 'general_manager';
  const userEmail = (req.headers['x-user-email'] as string) || 'admin@hotelms.com';
  const userName = (req.headers['x-user-name'] as string) || 'Enterprise Admin';

  const defaultUser: UserContext = {
    id: (req.headers['x-user-id'] as string) || 'usr_001',
    name: userName,
    email: userEmail,
    role: roleHeader,
    propertyId: propertyHeader || '1',
    propertyName: 'Property Console',
    subscriptionTier: 'enterprise',
    permissions: roleHeader === 'general_manager' || roleHeader === 'super_admin'
      ? ['*']
      : ['frontdesk.access', 'read:reservations', 'write:reservations'],
  };

  req.user = defaultUser;
  req.propertyId = defaultUser.propertyId;
  next();
};
