// ============================================================================
// HotelManagementOS - Navigation, Slugs & Enterprise Guard Type System
// Prepared for: Multi-Panel Routing, Theme, RBAC, Multi-Property & SaaS Tiers
// ============================================================================

export type PanelType = 'main' | 'reports';

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

export type ThemeMode = 'light' | 'dark' | 'system';

export interface RouteDefinition {
  id: string;                      // Internal ID (e.g. 'front-desk', 'cancelled-reservation')
  slug: string;                    // URL Path (e.g. '/front-desk', '/reports/cancelled-reservation')
  title: string;                   // Human readable label
  panel: PanelType;                // 'main' or 'reports'
  category?: string;               // Menu category
  parentSlug?: string;             // For nested hierarchy
  
  // Future RBAC & Permission Architecture
  permission?: string;             // e.g. 'frontdesk.read', 'reports.financial'
  allowedRoles?: UserRole[];       // Roles allowed to access
  
  // Future SaaS Subscription Guard
  minSubscriptionTier?: SubscriptionTier; // 'starter' | 'pro' | 'enterprise'
  
  // Future Multi-Property Scoping
  propertyScoped?: boolean;        // Requires active property context
  
  // UI Metadata
  iconName?: string;
  badge?: string;
  isNewTab?: boolean;
}

export interface ReportDefinition extends RouteDefinition {
  panel: 'reports';
  categoryKey: 'reservation' | 'frontOffice' | 'backOffice' | 'audit' | 'analytics';
}

export interface NavigationState {
  currentSlug: string;
  activePanel: PanelType;
  activePage: string;
  activeReport?: string;
  searchParams?: Record<string, string>;
}

export interface GuardContext {
  role?: UserRole;
  permissions?: string[];
  subscriptionTier?: SubscriptionTier;
  propertyId?: string;
  theme?: ThemeMode;
}
