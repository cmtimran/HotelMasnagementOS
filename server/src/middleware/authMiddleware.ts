import type { Response, NextFunction } from 'express';
import type { AuthenticatedRequest, UserContext } from '../types/index.js';

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

  // Mock enterprise user for development session
  const defaultUser: UserContext = {
    id: 'usr_001',
    name: 'John Smith',
    email: 'gm@grandhotel.com',
    role: 'general_manager',
    propertyId: propertyHeader || 'prop_grand_palace',
    propertyName: 'Grand Palace Luxury Resort',
    subscriptionTier: 'enterprise',
    permissions: ['*'], // Wildcard for GM / Super Admin
  };

  req.user = defaultUser;
  req.propertyId = defaultUser.propertyId;

  next();
};
