import type { Response } from 'express';
import type { AuthenticatedRequest, ApiResponse } from '../types/index.js';
import { reservationReportsService } from '../services/reports/reservationReports.service.js';
import { financialReportsService } from '../services/reports/financialReports.service.js';

const getReqPropertyId = (req: AuthenticatedRequest): string => {
  const p = (req.query?.propertyId as string) || (req.headers?.['x-property-id'] as string) || (req.body?.propertyId as string) || req.propertyId;
  return (!p || p === 'prop_grand_palace' || p === 'all') ? '' : String(p);
};

export const reportController = {
  /**
   * Executive Reporting Overview KPIs
   */
  getOverviewMetrics: async (req: AuthenticatedRequest, res: Response) => {
    try {
      const propertyId = getReqPropertyId(req);
      
      const metrics = {
        totalReports: 54,
        totalModules: 5,
        domainStats: {
          reservations: { count: 9, label: 'Reservations', status: 'Healthy' },
          frontOffice: { count: 12, label: 'Front Office', status: 'Healthy' },
          backOffice: { count: 33, label: 'Back Office & GL', status: 'Healthy' },
          audit: { count: 5, label: 'Audit & Compliance', status: 'Verified' },
          analytics: { count: 4, label: 'Analytics & Yield BI', status: 'Optimized' },
        },
        propertyContext: propertyId || 'None',
      };

      res.json({ success: true, data: metrics });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  },

  /**
   * Dynamic Report Query Handler
   * Dispatches slug to corresponding business report generator
   */
  getReportBySlug: async (req: AuthenticatedRequest, res: Response) => {
    try {
      const propertyId = getReqPropertyId(req);
      const rawSlug = Array.isArray(req.params.slug) ? req.params.slug[0] : req.params.slug;
      const slug = (rawSlug || '').toLowerCase();
      const query = req.query;

      let reportData: any[] = [];
      if (!propertyId) {
        return res.json({ success: true, data: [] });
      }

      switch (slug) {
        case 'cancelled-reservation':
        case 'cancelled-reservations':
          reportData = await reservationReportsService.getCancelledReservations(propertyId, query);
          break;

        case 'arrival-list':
          reportData = await reservationReportsService.getArrivalList(propertyId, query);
          break;

        case 'departure-list':
          reportData = await reservationReportsService.getDepartureList(propertyId, query);
          break;

        case 'manager-report':
          reportData = await financialReportsService.getManagerReport(propertyId, query);
          break;

        case 'trial-balance':
          reportData = await financialReportsService.getTrialBalance(propertyId, query);
          break;

        case 'advance-deposit-ledger':
          reportData = await financialReportsService.getAdvanceDepositLedger(propertyId, query);
          break;

        default:
          // Standard generic fallback dataset
          reportData = [
            { id: 1, resNo: 'RES-9100', guestName: 'Sample Guest A', rate: 150.0, room: '101', arrival: '2026-10-18', departure: '2026-10-20' },
            { id: 2, resNo: 'RES-9101', guestName: 'Sample Guest B', rate: 210.0, room: '202', arrival: '2026-10-19', departure: '2026-10-22' },
          ];
          break;
      }

      const response: ApiResponse = {
        success: true,
        data: reportData,
        metadata: {
          totalRecords: reportData.length,
          timestamp: new Date().toISOString(),
        },
      };

      res.json(response);
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  },
};
