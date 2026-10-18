// ============================================================================
// HotelManagementOS - Master Report Configuration Registry
// Dynamically maps 50+ Hospitality Reports to schema configs
// ============================================================================

import type { ReportSchema, ReportCategoryKey } from '../types';
import { RESERVATION_REPORT_SCHEMAS } from './reservationReports';
import { FRONT_OFFICE_REPORT_SCHEMAS } from './frontOfficeReports';
import { FINANCIAL_REPORT_SCHEMAS } from './financialReports';
import { AUDIT_REPORT_SCHEMAS } from './auditReports';
import { ANALYTICS_REPORT_SCHEMAS } from './analyticsReports';
import { slugify } from '../../navigation/routesRegistry';

const EXPLICIT_SCHEMAS: ReportSchema[] = [
  ...RESERVATION_REPORT_SCHEMAS,
  ...FRONT_OFFICE_REPORT_SCHEMAS,
  ...FINANCIAL_REPORT_SCHEMAS,
  ...AUDIT_REPORT_SCHEMAS,
  ...ANALYTICS_REPORT_SCHEMAS,
];

// Lookup Maps
const SCHEMA_BY_SLUG_MAP = new Map<string, ReportSchema>();
const SCHEMA_BY_TITLE_MAP = new Map<string, ReportSchema>();

EXPLICIT_SCHEMAS.forEach((schema) => {
  SCHEMA_BY_SLUG_MAP.set(schema.slug.toLowerCase(), schema);
  SCHEMA_BY_TITLE_MAP.set(schema.title.toLowerCase().trim(), schema);
});

/**
 * Creates an intelligent fallback schema for any of the 54 reports
 * ensuring seamless runtime execution without manual boilerplate.
 */
export const createDefaultReportSchema = (
  title: string,
  categoryKey: ReportCategoryKey = 'reservation'
): ReportSchema => {
  const slug = `/reports/${slugify(title)}`;
  return {
    id: slugify(title),
    slug,
    title,
    categoryKey,
    categoryTitle: categoryKey === 'reservation' ? 'Reservation Report'
      : categoryKey === 'frontOffice' ? 'Front Office Report'
      : categoryKey === 'backOffice' ? 'Back Office & GL Report'
      : categoryKey === 'audit' ? 'Audit Report'
      : 'Analytics & BI Report',
    description: `Standardized enterprise report for ${title}.`,
    permission: `reports.${categoryKey}.read`,
    minSubscriptionTier: 'starter',
    apiEndpoint: `/api/reports/${slugify(title)}`,
    filters: [
      { id: 'dateRange', label: 'Date Range', type: 'dateRange', required: true },
      { id: 'roomType', label: 'Room Type', type: 'select', options: [{ value: 'all', label: 'All Room Types' }] },
      { id: 'status', label: 'Status', type: 'select', options: [{ value: 'all', label: 'All Statuses' }] },
    ],
    columns: [
      { id: 'resNo', header: 'Res. No', type: 'text', defaultVisible: true },
      { id: 'guestName', header: 'Guest Name', type: 'text', defaultVisible: true },
      { id: 'rate', header: 'Rate', type: 'currency', defaultVisible: true, align: 'right' },
      { id: 'room', header: 'Room', type: 'text', defaultVisible: true },
      { id: 'arrival', header: 'Arrival', type: 'date', defaultVisible: true },
      { id: 'departure', header: 'Departure', type: 'date', defaultVisible: true },
    ],
  };
};

export const getReportSchemaBySlug = (slug: string): ReportSchema | undefined => {
  const normalized = slug.toLowerCase().trim();
  const direct = SCHEMA_BY_SLUG_MAP.get(normalized);
  if (direct) return direct;
  
  // Strip '/reports/' and try slug match
  const stripped = normalized.replace(/^\/reports\//, '');
  return Array.from(SCHEMA_BY_SLUG_MAP.values()).find(
    (s) => s.id === stripped || s.slug.endsWith(stripped)
  );
};

export const getReportSchemaByTitle = (title: string, categoryKey?: ReportCategoryKey): ReportSchema => {
  const normalized = title.toLowerCase().trim();
  const direct = SCHEMA_BY_TITLE_MAP.get(normalized);
  if (direct) return direct;

  // Fallback schema
  return createDefaultReportSchema(title, categoryKey);
};

export const getAllConfiguredSchemas = (): ReportSchema[] => {
  return EXPLICIT_SCHEMAS;
};
