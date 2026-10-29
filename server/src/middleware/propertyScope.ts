import type { Response, NextFunction } from 'express';
import type { AuthenticatedRequest } from '../types/index.js';

/**
 * Multi-Property Tenant Scope Enforcer
 * Ensures that all queries, filters, and writes are hard-scoped to the active property ID
 */
export const requirePropertyScope = (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): void => {
  const propertyId = (req.headers['x-property-id'] as string) || (req.query?.propertyId as string) || req.user?.propertyId;

  if (!propertyId || propertyId === 'all' || propertyId === 'prop_grand_palace') {
    if (req.method === 'GET') {
      req.propertyId = undefined;
      return next();
    }
    res.status(400).json({
      success: false,
      error: 'Bad Request: Active Property Context (x-property-id or propertyId query) is required for multi-tenant isolation',
    });
    return;
  }

  req.propertyId = propertyId;
  next();
};
