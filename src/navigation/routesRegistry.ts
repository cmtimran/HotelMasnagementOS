import type { RouteDefinition, ReportDefinition, GuardContext } from '../types/navigation';

// ============================================================================
// Helper Slug Utilities
// ============================================================================
export const slugify = (text: string): string => {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '');
};

// ============================================================================
// 1. MAIN PANEL ROUTE REGISTRY
// ============================================================================
export const MAIN_PANEL_ROUTES: RouteDefinition[] = [
  // Overview / Dashboard
  {
    id: 'dashboard',
    slug: '/dashboard',
    title: 'Manager Dashboard',
    panel: 'main',
    category: 'Overview',
    permission: 'dashboard.view',
    allowedRoles: ['super_admin', 'hotel_admin', 'general_manager', 'front_desk'],
    minSubscriptionTier: 'starter',
    propertyScoped: true,
  },

  // Front Office & Reception
  {
    id: 'front-desk',
    slug: '/front-desk',
    title: 'Front Desk',
    panel: 'main',
    category: 'Front Desk',
    permission: 'frontdesk.access',
    allowedRoles: ['super_admin', 'hotel_admin', 'general_manager', 'front_desk'],
    minSubscriptionTier: 'starter',
    propertyScoped: true,
  },
  {
    id: 'quick-reservation',
    slug: '/quick-reservation',
    title: 'Quick Reservation',
    panel: 'main',
    category: 'Front Desk',
    permission: 'reservation.create',
    allowedRoles: ['super_admin', 'hotel_admin', 'general_manager', 'front_desk'],
    minSubscriptionTier: 'starter',
    propertyScoped: true,
  },
  {
    id: 'folio-operations',
    slug: '/folio-operations',
    title: 'Folio Operations',
    panel: 'main',
    category: 'Front Desk',
    permission: 'folio.manage',
    allowedRoles: ['super_admin', 'hotel_admin', 'general_manager', 'front_desk', 'accountant'],
    minSubscriptionTier: 'starter',
    propertyScoped: true,
  },
  {
    id: 'guest-profile',
    slug: '/guest-profile',
    title: 'Guest Profiles',
    panel: 'main',
    category: 'Front Desk',
    permission: 'guest.manage',
    allowedRoles: ['super_admin', 'hotel_admin', 'general_manager', 'front_desk'],
    minSubscriptionTier: 'starter',
    propertyScoped: true,
  },
  {
    id: 'room-rack',
    slug: '/room-rack',
    title: 'Room Rack',
    panel: 'main',
    category: 'Front Desk',
    permission: 'frontdesk.access',
    allowedRoles: ['super_admin', 'hotel_admin', 'general_manager', 'front_desk'],
    minSubscriptionTier: 'starter',
    propertyScoped: true,
  },
  {
    id: 'reservations',
    slug: '/reservations',
    title: 'Reservations List',
    panel: 'main',
    category: 'Front Desk',
    permission: 'reservation.view',
    allowedRoles: ['super_admin', 'hotel_admin', 'general_manager', 'front_desk'],
    minSubscriptionTier: 'starter',
    propertyScoped: true,
  },
  {
    id: 'stay-view',
    slug: '/stay-view',
    title: 'Stay View Calendar',
    panel: 'main',
    category: 'Front Desk',
    permission: 'stayview.view',
    allowedRoles: ['super_admin', 'hotel_admin', 'general_manager', 'front_desk'],
    minSubscriptionTier: 'starter',
    propertyScoped: true,
  },
  {
    id: 'floor-plan',
    slug: '/floor-plan',
    title: 'Interactive Floor Plan',
    panel: 'main',
    category: 'Front Desk',
    permission: 'floorplan.view',
    allowedRoles: ['super_admin', 'hotel_admin', 'general_manager', 'front_desk'],
    minSubscriptionTier: 'pro',
    propertyScoped: true,
  },
  {
    id: 'occupancy-heatmap',
    slug: '/occupancy-heatmap',
    title: 'Occupancy Heatmap',
    panel: 'main',
    category: 'Front Desk',
    permission: 'analytics.heatmap',
    allowedRoles: ['super_admin', 'hotel_admin', 'general_manager'],
    minSubscriptionTier: 'pro',
    propertyScoped: true,
  },

  // Night Audit & Operations
  {
    id: 'night-audit',
    slug: '/night-audit',
    title: 'Night Audit Pipeline',
    panel: 'main',
    category: 'Night Audit & Ops',
    permission: 'nightaudit.execute',
    allowedRoles: ['super_admin', 'hotel_admin', 'general_manager', 'auditor'],
    minSubscriptionTier: 'pro',
    propertyScoped: true,
  },
  {
    id: 'service-vouchers',
    slug: '/service-vouchers',
    title: 'Digital Vouchers',
    panel: 'main',
    category: 'Night Audit & Ops',
    permission: 'vouchers.manage',
    allowedRoles: ['super_admin', 'hotel_admin', 'general_manager', 'front_desk'],
    minSubscriptionTier: 'pro',
    propertyScoped: true,
  },
  {
    id: 'allowance-checker',
    slug: '/allowance-checker',
    title: 'Allowance Engine',
    panel: 'main',
    category: 'Night Audit & Ops',
    permission: 'allowance.manage',
    allowedRoles: ['super_admin', 'hotel_admin', 'general_manager'],
    minSubscriptionTier: 'pro',
    propertyScoped: true,
  },

  // Housekeeping & Facilities
  {
    id: 'housekeeping',
    slug: '/housekeeping',
    title: 'Housekeeping Grid',
    panel: 'main',
    category: 'Housekeeping',
    permission: 'housekeeping.manage',
    allowedRoles: ['super_admin', 'hotel_admin', 'general_manager', 'housekeeping', 'front_desk'],
    minSubscriptionTier: 'starter',
    propertyScoped: true,
  },
  {
    id: 'maintenance',
    slug: '/maintenance',
    title: 'Maintenance Kanban',
    panel: 'main',
    category: 'Housekeeping',
    permission: 'maintenance.manage',
    allowedRoles: ['super_admin', 'hotel_admin', 'general_manager', 'maintenance'],
    minSubscriptionTier: 'starter',
    propertyScoped: true,
  },

  // F&B POS & Restaurant
  {
    id: 'pos-dashboard',
    slug: '/pos-dashboard',
    title: 'POS Dashboard',
    panel: 'main',
    category: 'F&B POS & KDS',
    permission: 'pos.dashboard',
    allowedRoles: ['super_admin', 'hotel_admin', 'general_manager', 'cashier'],
    minSubscriptionTier: 'starter',
    propertyScoped: true,
  },
  {
    id: 'pos',
    slug: '/pos',
    title: 'POS Terminal',
    panel: 'main',
    category: 'F&B POS & KDS',
    permission: 'pos.terminal',
    allowedRoles: ['super_admin', 'hotel_admin', 'general_manager', 'cashier', 'f_and_b'],
    minSubscriptionTier: 'starter',
    propertyScoped: true,
  },
  {
    id: 'categories',
    slug: '/pos/categories',
    title: 'POS Categories',
    panel: 'main',
    category: 'F&B POS & KDS',
    permission: 'pos.menu.manage',
    allowedRoles: ['super_admin', 'hotel_admin', 'general_manager'],
    minSubscriptionTier: 'starter',
    propertyScoped: true,
  },
  {
    id: 'products',
    slug: '/pos/products',
    title: 'POS Products',
    panel: 'main',
    category: 'F&B POS & KDS',
    permission: 'pos.menu.manage',
    allowedRoles: ['super_admin', 'hotel_admin', 'general_manager'],
    minSubscriptionTier: 'starter',
    propertyScoped: true,
  },
  {
    id: 'addons',
    slug: '/pos/addons',
    title: 'POS Addons',
    panel: 'main',
    category: 'F&B POS & KDS',
    permission: 'pos.menu.manage',
    allowedRoles: ['super_admin', 'hotel_admin', 'general_manager'],
    minSubscriptionTier: 'starter',
    propertyScoped: true,
  },
  {
    id: 'units',
    slug: '/pos/units',
    title: 'POS Units',
    panel: 'main',
    category: 'F&B POS & KDS',
    permission: 'pos.menu.manage',
    allowedRoles: ['super_admin', 'hotel_admin', 'general_manager'],
    minSubscriptionTier: 'starter',
    propertyScoped: true,
  },
  {
    id: 'tables',
    slug: '/pos/tables',
    title: 'Restaurant Tables',
    panel: 'main',
    category: 'F&B POS & KDS',
    permission: 'pos.tables.manage',
    allowedRoles: ['super_admin', 'hotel_admin', 'general_manager'],
    minSubscriptionTier: 'starter',
    propertyScoped: true,
  },
  {
    id: 'floor',
    slug: '/pos/floor',
    title: 'Restaurant Floor',
    panel: 'main',
    category: 'F&B POS & KDS',
    permission: 'pos.tables.manage',
    allowedRoles: ['super_admin', 'hotel_admin', 'general_manager'],
    minSubscriptionTier: 'starter',
    propertyScoped: true,
  },
  {
    id: 'counters',
    slug: '/pos/counters',
    title: 'Billing Counters',
    panel: 'main',
    category: 'F&B POS & KDS',
    permission: 'pos.counters.manage',
    allowedRoles: ['super_admin', 'hotel_admin', 'general_manager'],
    minSubscriptionTier: 'starter',
    propertyScoped: true,
  },
  {
    id: 'kitchens',
    slug: '/pos/kitchens',
    title: 'Kitchen Stations (KDS)',
    panel: 'main',
    category: 'F&B POS & KDS',
    permission: 'pos.kds.manage',
    allowedRoles: ['super_admin', 'hotel_admin', 'general_manager', 'f_and_b'],
    minSubscriptionTier: 'pro',
    propertyScoped: true,
  },
  {
    id: 'waiters',
    slug: '/pos/waiters',
    title: 'Waiters Management',
    panel: 'main',
    category: 'F&B POS & KDS',
    permission: 'pos.staff.manage',
    allowedRoles: ['super_admin', 'hotel_admin', 'general_manager'],
    minSubscriptionTier: 'starter',
    propertyScoped: true,
  },
  {
    id: 'pos-users',
    slug: '/pos/cashiers',
    title: 'POS Cashiers',
    panel: 'main',
    category: 'F&B POS & KDS',
    permission: 'pos.staff.manage',
    allowedRoles: ['super_admin', 'hotel_admin', 'general_manager'],
    minSubscriptionTier: 'starter',
    propertyScoped: true,
  },
  {
    id: 'admin-users',
    slug: '/pos/admins',
    title: 'POS Admins',
    panel: 'main',
    category: 'F&B POS & KDS',
    permission: 'pos.admin.manage',
    allowedRoles: ['super_admin', 'hotel_admin'],
    minSubscriptionTier: 'starter',
    propertyScoped: true,
  },

  // Rates, Packages & Channel Master
  {
    id: 'rate-plans',
    slug: '/rate-plans',
    title: 'Rate Plans (L3)',
    panel: 'main',
    category: 'Rate & Channel Master',
    permission: 'rates.manage',
    allowedRoles: ['super_admin', 'hotel_admin', 'general_manager'],
    minSubscriptionTier: 'starter',
    propertyScoped: true,
  },
  {
    id: 'package-builder',
    slug: '/package-builder',
    title: 'Package Builder (L2)',
    panel: 'main',
    category: 'Rate & Channel Master',
    permission: 'packages.manage',
    allowedRoles: ['super_admin', 'hotel_admin', 'general_manager'],
    minSubscriptionTier: 'starter',
    propertyScoped: true,
  },
  {
    id: 'meal-plans',
    slug: '/meal-plans',
    title: 'Meal Plans (L1)',
    panel: 'main',
    category: 'Rate & Channel Master',
    permission: 'meals.manage',
    allowedRoles: ['super_admin', 'hotel_admin', 'general_manager'],
    minSubscriptionTier: 'starter',
    propertyScoped: true,
  },
  {
    id: 'service-master',
    slug: '/service-master',
    title: 'Service Master (L1)',
    panel: 'main',
    category: 'Rate & Channel Master',
    permission: 'services.manage',
    allowedRoles: ['super_admin', 'hotel_admin', 'general_manager'],
    minSubscriptionTier: 'starter',
    propertyScoped: true,
  },
  {
    id: 'rate-calendar',
    slug: '/rate-calendar',
    title: 'Rate Calendar',
    panel: 'main',
    category: 'Rate & Channel Master',
    permission: 'rates.calendar.view',
    allowedRoles: ['super_admin', 'hotel_admin', 'general_manager', 'front_desk'],
    minSubscriptionTier: 'starter',
    propertyScoped: true,
  },

  // Room Inventory
  {
    id: 'building-floor',
    slug: '/buildings-floors',
    title: 'Buildings & Floors',
    panel: 'main',
    category: 'Room Inventory',
    permission: 'inventory.buildings.manage',
    allowedRoles: ['super_admin', 'hotel_admin', 'general_manager'],
    minSubscriptionTier: 'starter',
    propertyScoped: true,
  },
  {
    id: 'manage-room-type',
    slug: '/room-types',
    title: 'Room Types',
    panel: 'main',
    category: 'Room Inventory',
    permission: 'inventory.roomtypes.manage',
    allowedRoles: ['super_admin', 'hotel_admin', 'general_manager'],
    minSubscriptionTier: 'starter',
    propertyScoped: true,
  },
  {
    id: 'manage-room',
    slug: '/manage-rooms',
    title: 'Physical Rooms',
    panel: 'main',
    category: 'Room Inventory',
    permission: 'inventory.rooms.manage',
    allowedRoles: ['super_admin', 'hotel_admin', 'general_manager', 'front_desk'],
    minSubscriptionTier: 'starter',
    propertyScoped: true,
  },
  {
    id: 'joint-room',
    slug: '/connecting-rooms',
    title: 'Connecting Rooms',
    panel: 'main',
    category: 'Room Inventory',
    permission: 'inventory.rooms.manage',
    allowedRoles: ['super_admin', 'hotel_admin', 'general_manager'],
    minSubscriptionTier: 'starter',
    propertyScoped: true,
  },

  // Properties & Profiles
  {
    id: 'properties',
    slug: '/properties',
    title: 'All Properties',
    panel: 'main',
    category: 'Properties',
    permission: 'properties.manage',
    allowedRoles: ['super_admin', 'hotel_admin'],
    minSubscriptionTier: 'enterprise',
    propertyScoped: false,
  },
  {
    id: 'hotel-info',
    slug: '/hotel-profile',
    title: 'Hotel Profile',
    panel: 'main',
    category: 'Properties',
    permission: 'property.profile.manage',
    allowedRoles: ['super_admin', 'hotel_admin', 'general_manager'],
    minSubscriptionTier: 'starter',
    propertyScoped: true,
  },
  {
    id: 'edit-property',
    slug: '/edit-property',
    title: 'Edit Property',
    panel: 'main',
    category: 'Properties',
    permission: 'properties.manage',
    allowedRoles: ['super_admin', 'hotel_admin'],
    minSubscriptionTier: 'starter',
    propertyScoped: true,
  },

  // B2B & Revenue
  {
    id: 'corporate-profiles',
    slug: '/corporate-profiles',
    title: 'Corporate Profiles',
    panel: 'main',
    category: 'B2B & Revenue',
    permission: 'b2b.corporate.manage',
    allowedRoles: ['super_admin', 'hotel_admin', 'general_manager'],
    minSubscriptionTier: 'pro',
    propertyScoped: true,
  },
  {
    id: 'business-origins',
    slug: '/business-origins',
    title: 'Business Origins',
    panel: 'main',
    category: 'B2B & Revenue',
    permission: 'b2b.origins.manage',
    allowedRoles: ['super_admin', 'hotel_admin', 'general_manager'],
    minSubscriptionTier: 'pro',
    propertyScoped: true,
  },
  {
    id: 'advanced-reports',
    slug: '/advanced-analytics',
    title: 'Advanced Analytics',
    panel: 'main',
    category: 'B2B & Revenue',
    permission: 'analytics.advanced',
    allowedRoles: ['super_admin', 'hotel_admin', 'general_manager'],
    minSubscriptionTier: 'enterprise',
    propertyScoped: true,
  },
  {
    id: 'revenue-dashboard',
    slug: '/revenue-dashboard',
    title: 'Revenue Dashboard',
    panel: 'main',
    category: 'B2B & Revenue',
    permission: 'analytics.revenue',
    allowedRoles: ['super_admin', 'hotel_admin', 'general_manager'],
    minSubscriptionTier: 'pro',
    propertyScoped: true,
  },

  // Finance & ERP
  {
    id: 'finance-overview',
    slug: '/finance',
    title: 'General Ledger & Finance',
    panel: 'main',
    category: 'Finance & ERP',
    permission: 'finance.gl.view',
    allowedRoles: ['super_admin', 'hotel_admin', 'general_manager', 'accountant'],
    minSubscriptionTier: 'pro',
    propertyScoped: true,
  },

  // Report Center Root
  {
    id: 'reports',
    slug: '/reports',
    title: 'Report Center',
    panel: 'main',
    category: 'Audit Reports',
    permission: 'reports.view',
    allowedRoles: ['super_admin', 'hotel_admin', 'general_manager', 'auditor', 'accountant', 'front_desk'],
    minSubscriptionTier: 'starter',
    propertyScoped: true,
  },

  // Security, RBAC & Settings
  {
    id: 'user-management',
    slug: '/users',
    title: 'Users & Staff',
    panel: 'main',
    category: 'Security & Settings',
    permission: 'security.users.manage',
    allowedRoles: ['super_admin', 'hotel_admin'],
    minSubscriptionTier: 'starter',
    propertyScoped: true,
  },
  {
    id: 'roles-permissions',
    slug: '/roles-permissions',
    title: 'Roles & RBAC',
    panel: 'main',
    category: 'Security & Settings',
    permission: 'security.roles.manage',
    allowedRoles: ['super_admin', 'hotel_admin'],
    minSubscriptionTier: 'enterprise',
    propertyScoped: false,
  },
  {
    id: 'master-data',
    slug: '/master-data',
    title: 'Master Data Config',
    panel: 'main',
    category: 'Security & Settings',
    permission: 'settings.masterdata.manage',
    allowedRoles: ['super_admin', 'hotel_admin'],
    minSubscriptionTier: 'pro',
    propertyScoped: true,
  },
  {
    id: 'banking',
    slug: '/banking',
    title: 'Bank Accounts & MFS',
    panel: 'main',
    category: 'Finance & Accounting',
    permission: 'finance.banking.manage',
    allowedRoles: ['super_admin', 'hotel_admin', 'general_manager', 'accountant'],
    minSubscriptionTier: 'pro',
    propertyScoped: true,
  },
  {
    id: 'revenue-heads',
    slug: '/revenue-heads',
    title: 'Revenue Heads & Groups',
    panel: 'main',
    category: 'Finance & Accounting',
    permission: 'finance.revenue.manage',
    allowedRoles: ['super_admin', 'hotel_admin', 'general_manager', 'accountant'],
    minSubscriptionTier: 'pro',
    propertyScoped: true,
  },
  {
    id: 'extra-charges',
    slug: '/extra-charges',
    title: 'Extra Charges & Add-ons',
    panel: 'main',
    category: 'Finance & Accounting',
    permission: 'finance.charges.manage',
    allowedRoles: ['super_admin', 'hotel_admin', 'general_manager', 'accountant'],
    minSubscriptionTier: 'starter',
    propertyScoped: true,
  },
  {
    id: 'discounts',
    slug: '/discounts',
    title: 'Discounts & Rebates (GL-4990)',
    panel: 'main',
    category: 'Finance & Accounting',
    permission: 'finance.discounts.manage',
    allowedRoles: ['super_admin', 'hotel_admin', 'general_manager', 'accountant'],
    minSubscriptionTier: 'pro',
    propertyScoped: true,
  },
  {
    id: 'departments',
    slug: '/departments',
    title: 'Department Management',
    panel: 'main',
    category: 'Human Resources',
    permission: 'hrm.departments.manage',
    allowedRoles: ['super_admin', 'hotel_admin', 'general_manager'],
    minSubscriptionTier: 'starter',
    propertyScoped: true,
  },
  {
    id: 'shifts',
    slug: '/shifts',
    title: '24/7 Work Shifts & Handover',
    panel: 'main',
    category: 'Human Resources',
    permission: 'hrm.shifts.manage',
    allowedRoles: ['super_admin', 'hotel_admin', 'general_manager'],
    minSubscriptionTier: 'starter',
    propertyScoped: true,
  },
  {
    id: 'policy-management',
    slug: '/policy-settings',
    title: 'Policy Settings',
    panel: 'main',
    category: 'Security & Settings',
    permission: 'settings.policy.manage',
    allowedRoles: ['super_admin', 'hotel_admin', 'general_manager'],
    minSubscriptionTier: 'pro',
    propertyScoped: true,
  },
  {
    id: 'general-settings',
    slug: '/general-settings',
    title: 'System Settings',
    panel: 'main',
    category: 'Security & Settings',
    permission: 'settings.general.manage',
    allowedRoles: ['super_admin', 'hotel_admin'],
    minSubscriptionTier: 'starter',
    propertyScoped: true,
  },
];

// ============================================================================
// 2. REPORT CENTER ROUTE REGISTRY (All 5 Categories & 50+ Reports)
// ============================================================================
const RAW_REPORT_CATEGORIES: {
  key: ReportDefinition['categoryKey'];
  title: string;
  reports: string[];
}[] = [
  {
    key: 'reservation',
    title: 'Reservation Report',
    reports: [
      'Arrival List',
      'Cancelled Reservation',
      'Country Wise Reservation Statistics',
      'Departure List',
      'Forecast Report',
      'No Show Reservation',
      'Release Reservation List',
      'Reservation Activity',
      'Void Reservation',
    ],
  },
  {
    key: 'frontOffice',
    title: 'Front Office Report',
    reports: [
      'Guest Checked In',
      'Guest Checked Out',
      'Guest List',
      'Guest Message',
      'Inclusion Report',
      'Inventory By Room Type',
      'Invoice Breakdown',
      'Night Audit',
      'Pickup Dropoff',
      'Room Availability',
      'Room Status Report',
      'Task List Report',
    ],
  },
  {
    key: 'backOffice',
    title: 'Back Office Report',
    reports: [
      'Advance Deposit Ledger',
      'Ageing Debtors - Summary',
      'Ageing Debtors - Detail',
      'Cashier Sales Report',
      'City Ledger - Detail',
      'City Ledger - Summary',
      'Complimentary Room Report',
      'Credit Card Process - Detail',
      'Daily Extra Charge - Detail',
      'Daily Receipt - Detail',
      'Daily Receipt - Summary',
      'Daily Refund Report',
      'Daily Revenue',
      'Detail Discount Report',
      'Detail Revenue Report',
      'Expense Voucher',
      'Financial Report',
      'Folio List',
      'Foreign Exchange',
      'Monthly Extra Charge Summary',
      'Monthly Revenue',
      'Paid Out Summary',
      'Payment Summary',
      'Plan Wise Daily Revenue',
      'Sales Report',
      'Sales Settlement Summary',
      'Summary Discount Report',
      'Tax Report',
      'Travel Agent Commission - Detail',
      'Travel Agent Commission - Summary',
      'Weekly Manager Report',
      'Weekly Meal Plan Report',
      'Work Order List',
    ],
  },
  {
    key: 'audit',
    title: 'Audit Report',
    reports: [
      'Audit Trails',
      'IP Report',
      'Void Charge',
      'Void Payment',
      'Void Transaction',
    ],
  },
  {
    key: 'analytics',
    title: 'Analytics & BI',
    reports: [
      'Advanced Revenue Analytics',
      'Room Type Wise Daily Room Revenue',
      'Revenue By Rate Type',
      'Revenue By Room Type',
    ],
  },
];

export const REPORT_PANEL_ROUTES: ReportDefinition[] = RAW_REPORT_CATEGORIES.flatMap((cat) =>
  cat.reports.map((reportTitle) => {
    const reportSlugPart = slugify(reportTitle);
    return {
      id: reportSlugPart,
      slug: `/reports/${reportSlugPart}`,
      title: reportTitle,
      panel: 'reports' as const,
      category: cat.title,
      categoryKey: cat.key,
      permission: `reports.${cat.key}.${reportSlugPart}`,
      allowedRoles: ['super_admin', 'hotel_admin', 'general_manager', 'auditor', 'accountant'],
      minSubscriptionTier: cat.key === 'analytics' ? 'pro' : 'starter',
      propertyScoped: true,
    };
  })
);

// Combined List of All Routes
export const ALL_ROUTES: RouteDefinition[] = [...MAIN_PANEL_ROUTES, ...REPORT_PANEL_ROUTES];

// Fast O(1) Lookup Maps
export const SLUG_TO_ROUTE_MAP = new Map<string, RouteDefinition>();
export const ID_TO_MAIN_ROUTE_MAP = new Map<string, RouteDefinition>();
export const TITLE_TO_REPORT_MAP = new Map<string, ReportDefinition>();
export const SLUG_TO_REPORT_MAP = new Map<string, ReportDefinition>();

// Populate Maps
for (const route of MAIN_PANEL_ROUTES) {
  SLUG_TO_ROUTE_MAP.set(route.slug, route);
  ID_TO_MAIN_ROUTE_MAP.set(route.id, route);
}

// Aliases for resilient direct URL access across all settings sub-modules
const userRoute = SLUG_TO_ROUTE_MAP.get('/users');
if (userRoute) {
  SLUG_TO_ROUTE_MAP.set('/user-management', userRoute);
  SLUG_TO_ROUTE_MAP.set('/staff', userRoute);
}

const rolesRoute = SLUG_TO_ROUTE_MAP.get('/roles-permissions');
if (rolesRoute) {
  SLUG_TO_ROUTE_MAP.set('/roles', rolesRoute);
  SLUG_TO_ROUTE_MAP.set('/permissions', rolesRoute);
}

const masterDataRoute = SLUG_TO_ROUTE_MAP.get('/master-data');
if (masterDataRoute) {
  SLUG_TO_ROUTE_MAP.set('/master-data-config', masterDataRoute);
}

const revenueHeadsRoute = SLUG_TO_ROUTE_MAP.get('/revenue-heads');
if (revenueHeadsRoute) {
  SLUG_TO_ROUTE_MAP.set('/revenue-groups', revenueHeadsRoute);
}

const policyRoute = SLUG_TO_ROUTE_MAP.get('/policy-settings');
if (policyRoute) {
  SLUG_TO_ROUTE_MAP.set('/policy-management', policyRoute);
  SLUG_TO_ROUTE_MAP.set('/policies', policyRoute);
}

const generalRoute = SLUG_TO_ROUTE_MAP.get('/general-settings');
if (generalRoute) {
  SLUG_TO_ROUTE_MAP.set('/system-settings', generalRoute);
  SLUG_TO_ROUTE_MAP.set('/settings', generalRoute);
}

for (const report of REPORT_PANEL_ROUTES) {
  SLUG_TO_ROUTE_MAP.set(report.slug, report);
  TITLE_TO_REPORT_MAP.set(report.title.toLowerCase(), report);
  SLUG_TO_REPORT_MAP.set(report.slug, report);
  // Also register shorthand without /reports/
  SLUG_TO_REPORT_MAP.set(report.id, report);
}

// ============================================================================
// Helper Resolution Functions
// ============================================================================

export const getRouteBySlug = (slug: string): RouteDefinition | undefined => {
  const normalized = slug.startsWith('/') ? slug : `/${slug}`;
  return SLUG_TO_ROUTE_MAP.get(normalized);
};

export const getRouteByPageId = (pageId: string): RouteDefinition | undefined => {
  return ID_TO_MAIN_ROUTE_MAP.get(pageId);
};

export const getReportBySlug = (slug: string): ReportDefinition | undefined => {
  const normalized = slug.startsWith('/') ? slug : `/${slug}`;
  return SLUG_TO_REPORT_MAP.get(normalized) || SLUG_TO_REPORT_MAP.get(slug.replace('/reports/', ''));
};

export const getReportByTitle = (title: string): ReportDefinition | undefined => {
  return TITLE_TO_REPORT_MAP.get(title.toLowerCase().trim());
};

export const reportTitleToSlug = (title: string): string => {
  const report = getReportByTitle(title);
  if (report) return report.slug;
  return `/reports/${slugify(title)}`;
};

export const slugToReportTitle = (slug: string): string => {
  const report = getReportBySlug(slug);
  if (report) return report.title;
  // Fallback: reverse slugify
  return slug.replace(/^\/reports\//, '').split('-').map(s => s.charAt(0).toUpperCase() + s.slice(1)).join(' ');
};

// ============================================================================
// Future Feature Guard & RBAC Checker
// ============================================================================
export const canAccessRoute = (
  route: RouteDefinition,
  guardContext?: GuardContext
): { allowed: boolean; reason?: 'role' | 'permission' | 'tier' | 'property' } => {
  if (!guardContext) return { allowed: true };

  // 1. Subscription Tier Guard
  if (route.minSubscriptionTier && guardContext.subscriptionTier) {
    const tierRanks: Record<string, number> = { starter: 1, pro: 2, enterprise: 3 };
    const currentRank = tierRanks[guardContext.subscriptionTier] || 1;
    const requiredRank = tierRanks[route.minSubscriptionTier] || 1;
    if (currentRank < requiredRank) {
      return { allowed: false, reason: 'tier' };
    }
  }

  // 2. Role Guard
  if (route.allowedRoles && guardContext.role) {
    if (!route.allowedRoles.includes(guardContext.role)) {
      return { allowed: false, reason: 'role' };
    }
  }

  // 3. Permission Guard
  if (route.permission && guardContext.permissions) {
    if (!guardContext.permissions.includes(route.permission) && !guardContext.permissions.includes('*')) {
      return { allowed: false, reason: 'permission' };
    }
  }

  return { allowed: true };
};
