import type { ReportFilterQuery } from '../../types/index.js';

export const financialReportsService = {
  getManagerReport: async (propertyId: string, query: ReportFilterQuery) => {
    return [
      { kpi: 'Total Rooms Available', today: 120, mtd: 3600, ytd: 43200 },
      { kpi: 'Rooms Sold / Occupied', today: 98, mtd: 2940, ytd: 35100 },
      { kpi: 'Occupancy Percentage (%)', today: 81.67, mtd: 81.67, ytd: 81.25 },
      { kpi: 'Total Room Revenue ($)', today: 18450.0, mtd: 553500.0, ytd: 6642000.0 },
      { kpi: 'Average Daily Rate - ADR ($)', today: 188.27, mtd: 188.27, ytd: 189.23 },
      { kpi: 'RevPAR ($)', today: 153.75, mtd: 153.75, ytd: 153.75 },
      { kpi: 'F&B POS Revenue ($)', today: 4120.0, mtd: 123600.0, ytd: 1483200.0 },
      { kpi: 'Total Hotel Gross Revenue ($)', today: 22570.0, mtd: 677100.0, ytd: 8125200.0 },
    ];
  },

  getTrialBalance: async (propertyId: string, query: ReportFilterQuery) => {
    return [
      { accountCode: 'GL-1010', accountName: 'Cash in Hand (Front Desk)', debit: 4200.0, credit: 0.0, balance: 4200.0 },
      { accountCode: 'GL-1020', accountName: 'Guest Ledger (In-House Folios)', debit: 28450.0, credit: 0.0, balance: 28450.0 },
      { accountCode: 'GL-1030', accountName: 'City Ledger (B2B / Corporate Receivables)', debit: 41200.0, credit: 0.0, balance: 41200.0 },
      { accountCode: 'GL-2010', accountName: 'Advance Deposit Ledger', debit: 0.0, credit: 15600.0, balance: -15600.0 },
      { accountCode: 'GL-4010', accountName: 'Room Revenue', debit: 0.0, credit: 48950.0, balance: -48950.0 },
      { accountCode: 'GL-4020', accountName: 'F&B Revenue', debit: 0.0, credit: 9300.0, balance: -9300.0 },
    ];
  },

  getAdvanceDepositLedger: async (propertyId: string, query: ReportFilterQuery) => {
    return [
      { resNo: 'RES-9201', guestName: 'Global Tech Summit Group', depositDate: '2026-10-15', paymentMethod: 'Bank Wire', arrivalDate: '2026-11-01', depositAmount: 5000.0 },
      { resNo: 'RES-9214', guestName: 'Victoria Secret Fashion Show', depositDate: '2026-10-16', paymentMethod: 'Corporate Card', arrivalDate: '2026-11-12', depositAmount: 7500.0 },
      { resNo: 'RES-9220', guestName: 'Dr. Bruce Banner', depositDate: '2026-10-17', paymentMethod: 'MasterCard', arrivalDate: '2026-10-25', depositAmount: 600.0 },
    ];
  },
};
