import type { ReportSchema } from '../types';

export const AUDIT_REPORT_SCHEMAS: ReportSchema[] = [
  {
    id: 'night-audit-summary',
    slug: '/reports/night-audit-summary',
    title: 'Night Audit Summary',
    categoryKey: 'audit',
    categoryTitle: 'Audit Report',
    description: 'System rollover verification, automated room charge postings, and daily closing sanity ledger.',
    permission: 'reports.audit.read',
    minSubscriptionTier: 'starter',
    apiEndpoint: '/api/reports/night-audit-summary',
    filters: [
      { id: 'auditDate', label: 'Audit Business Date', type: 'singleDate', required: true },
    ],
    columns: [
      { id: 'step', header: 'Audit Verification Step', type: 'text', defaultVisible: true },
      { id: 'status', header: 'Result Status', type: 'badge', defaultVisible: true },
      { id: 'postedCount', header: 'Transactions Posted', type: 'number', defaultVisible: true, align: 'right' },
      { id: 'postedAmount', header: 'Total Value', type: 'currency', defaultVisible: true, align: 'right' },
      { id: 'auditor', header: 'Executed By', type: 'text', defaultVisible: true },
    ],
  },
  {
    id: 'rate-override-audit',
    slug: '/reports/rate-override-audit',
    title: 'Rate Override Audit',
    categoryKey: 'audit',
    categoryTitle: 'Audit Report',
    description: 'Tracks manual price adjustments, discounts, and overrides given during check-in or booking.',
    permission: 'reports.audit.read',
    minSubscriptionTier: 'pro',
    apiEndpoint: '/api/reports/rate-overrides',
    filters: [
      { id: 'dateRange', label: 'Date Range', type: 'dateRange', required: true },
    ],
    columns: [
      { id: 'resNo', header: 'Res #', type: 'text', defaultVisible: true },
      { id: 'roomNo', header: 'Room #', type: 'text', defaultVisible: true },
      { id: 'rackRate', header: 'Standard Rate', type: 'currency', defaultVisible: true, align: 'right' },
      { id: 'appliedRate', header: 'Adjusted Rate', type: 'currency', defaultVisible: true, align: 'right' },
      { id: 'variance', header: 'Discount / Variance', type: 'currency', defaultVisible: true, align: 'right' },
      { id: 'authorizedBy', header: 'Authorized By', type: 'text', defaultVisible: true },
      { id: 'reason', header: 'Justification Reason', type: 'text', defaultVisible: true },
    ],
  },
];
