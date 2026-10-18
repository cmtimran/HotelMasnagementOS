import type { ReportSchema } from '../types';

export const ANALYTICS_REPORT_SCHEMAS: ReportSchema[] = [
  {
    id: 'revpar-adr-bi',
    slug: '/reports/revpar-adr-bi',
    title: 'RevPAR & ADR BI',
    categoryKey: 'analytics',
    categoryTitle: 'Analytics & BI Report',
    description: 'High-level yield analytics, Revenue Per Available Room (RevPAR), and Average Daily Rate (ADR) velocity curves.',
    permission: 'reports.analytics.read',
    minSubscriptionTier: 'enterprise',
    apiEndpoint: '/api/reports/yield-revpar',
    filters: [
      { id: 'dateRange', label: 'Analysis Window', type: 'dateRange', required: true },
      { id: 'groupBy', label: 'Group By', type: 'select', options: [{ value: 'day', label: 'Day' }, { value: 'week', label: 'Week' }, { value: 'month', label: 'Month' }] },
    ],
    columns: [
      { id: 'period', header: 'Period', type: 'text', defaultVisible: true },
      { id: 'availableRooms', header: 'Available Rooms', type: 'number', defaultVisible: true, align: 'right' },
      { id: 'occupiedRooms', header: 'Sold Rooms', type: 'number', defaultVisible: true, align: 'right' },
      { id: 'occPercentage', header: 'Occupancy %', type: 'text', defaultVisible: true, align: 'right' },
      { id: 'adr', header: 'ADR', type: 'currency', defaultVisible: true, align: 'right' },
      { id: 'revpar', header: 'RevPAR', type: 'currency', defaultVisible: true, align: 'right' },
      { id: 'totalRev', header: 'Total Room Revenue', type: 'currency', defaultVisible: true, align: 'right' },
    ],
  },
  {
    id: 'channel-productivity',
    slug: '/reports/channel-productivity',
    title: 'Channel Productivity',
    categoryKey: 'analytics',
    categoryTitle: 'Analytics & BI Report',
    description: 'Production metrics across Direct Web, Booking.com, Expedia, Agoda, and Corporate Accounts.',
    permission: 'reports.analytics.read',
    minSubscriptionTier: 'pro',
    apiEndpoint: '/api/reports/channel-productivity',
    filters: [
      { id: 'dateRange', label: 'Booking Window', type: 'dateRange', required: true },
    ],
    columns: [
      { id: 'channel', header: 'Distribution Channel', type: 'text', defaultVisible: true },
      { id: 'roomNights', header: 'Room Nights', type: 'number', defaultVisible: true, align: 'right' },
      { id: 'revenue', header: 'Gross Revenue', type: 'currency', defaultVisible: true, align: 'right' },
      { id: 'commission', header: 'OTA Commission', type: 'currency', defaultVisible: true, align: 'right' },
      { id: 'netRevenue', header: 'Net Revenue', type: 'currency', defaultVisible: true, align: 'right' },
      { id: 'share', header: 'Channel Share %', type: 'text', defaultVisible: true, align: 'right' },
    ],
  },
];
