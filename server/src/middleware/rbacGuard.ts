import type { Response, NextFunction } from 'express';
import type { AuthenticatedRequest, UserRole } from '../types/index.js';

/**
 * Role-Based Access Control (RBAC) Guard
 * Validates whether the user's role has permission to access the endpoint/slug
 */
export const requireRole = (allowedRoles: UserRole[]) => {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({
        success: false,
        error: 'Unauthorized: User authentication required',
      });
      return;
    }

    if (req.user.role === 'super_admin' || allowedRoles.includes(req.user.role)) {
      next();
      return;
    }

    res.status(403).json({
      success: false,
      error: `Forbidden: Role '${req.user.role}' lacks authorization for this resource`,
    });
  };
};

/**
 * Granular Permission Guard
 * Checks specific permission strings (e.g. 'reports.reservations.read', 'booking.create')
 */
export const requirePermission = (permission: string) => {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({
        success: false,
        error: 'Unauthorized: Authentication required',
      });
      return;
    }

    const userPerms = req.user.permissions || [];
    if (userPerms.includes('*') || userPerms.includes(permission)) {
      next();
      return;
    }

    res.status(403).json({
      success: false,
      error: `Forbidden: Missing required permission '${permission}'`,
    });
  };
};
