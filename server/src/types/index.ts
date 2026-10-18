import type { Request } from 'express';

export type UserRole =
  | 'super_admin'
  | 'hotel_admin'
  | 'general_manager'
  | 'front_desk'
  | 'cashier'
  | 'housekeeping'
  | 'accountant'
  | 'auditor'
  | 'maintenance'
  | 'f_and_b';

export type SubscriptionTier = 'starter' | 'pro' | 'enterprise';

export interface UserContext {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  propertyId: string;
  propertyName: string;
  subscriptionTier: SubscriptionTier;
  permissions: string[];
}

export interface AuthenticatedRequest extends Request {
  user?: UserContext;
  propertyId?: string;
}

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
  metadata?: {
    totalRecords?: number;
    page?: number;
    limit?: number;
    timestamp?: string;
  };
}

export interface ReportFilterQuery {
  startDate?: string;
  endDate?: string;
  propertyId?: string;
  roomType?: string;
  status?: string;
  page?: string;
  limit?: string;
  format?: 'json' | 'excel' | 'pdf';
}
