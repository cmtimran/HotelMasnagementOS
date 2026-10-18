// ============================================================================
// HotelManagementOS - Report Center Metadata & Schema Architecture
// Enterprise Schema-Driven Reporting Engine
// ============================================================================

import type { SubscriptionTier, UserRole } from '../types/navigation';

export type ReportCategoryKey =
  | 'reservation'
  | 'frontOffice'
  | 'backOffice'
  | 'audit'
  | 'analytics';

export type FilterFieldType =
  | 'dateRange'
  | 'singleDate'
  | 'select'
  | 'multiSelect'
  | 'checkbox'
  | 'text'
  | 'number';

export interface FilterOption {
  value: string;
  label: string;
}

export interface ReportFilterConfig {
  id: string;
  label: string;
  type: FilterFieldType;
  placeholder?: string;
  options?: FilterOption[];
  defaultValue?: any;
  required?: boolean;
}

export interface ReportColumnConfig {
  id: string;
  header: string;
  accessorKey?: string;
  type?: 'text' | 'number' | 'currency' | 'date' | 'badge' | 'status';
  defaultVisible?: boolean;
  align?: 'left' | 'center' | 'right';
  width?: string;
}

export interface ReportSchema {
  id: string;
  slug: string;
  title: string;
  categoryKey: ReportCategoryKey;
  categoryTitle: string;
  description?: string;
  helpGuide?: {
    summary: string;
    comparisonTips?: string[];
    importantNote?: string;
  };
  permission: string;
  allowedRoles?: UserRole[];
  minSubscriptionTier?: SubscriptionTier;
  apiEndpoint: string;
  filters: ReportFilterConfig[];
  columns: ReportColumnConfig[];
  defaultSort?: { columnId: string; direction: 'asc' | 'desc' };
}
