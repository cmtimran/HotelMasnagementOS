import type { ReportFilterQuery } from '../../types/index.js';

export const reservationReportsService = {
  getCancelledReservations: async (propertyId: string, query: ReportFilterQuery) => {
    // Enterprise SQL / DB aggregation simulation
    return [
      {
        resNo: 'RES-8910',
        guestName: 'Jonathan Davis',
        rate: 175.0,
        room: '208 - Deluxe',
        arrival: '2026-10-18',
        departure: '2026-10-22',
        cancelledDate: '2026-10-17',
        cancelledBy: 'Front Desk (Alice)',
        reason: 'Guest Flight Delayed / Cancelled',
        charge: 50.0,
      },
      {
        resNo: 'RES-8924',
        guestName: 'Claire Redfield',
        rate: 220.0,
        room: '312 - Executive Suite',
        arrival: '2026-10-19',
        departure: '2026-10-23',
        cancelledDate: '2026-10-18',
        cancelledBy: 'OTA Channel (Booking.com)',
        reason: 'Change of Travel Plans',
        charge: 0.0,
      },
      {
        resNo: 'RES-8931',
        guestName: 'Leon S. Kennedy',
        rate: 195.0,
        room: '104 - Standard King',
        arrival: '2026-10-20',
        departure: '2026-10-25',
        cancelledDate: '2026-10-18',
        cancelledBy: 'Guest Self-Service',
        reason: 'Personal Emergency',
        charge: 75.0,
      },
    ];
  },

  getArrivalList: async (propertyId: string, query: ReportFilterQuery) => {
    return [
      {
        resNo: 'RES-9011',
        guestName: 'Dr. Robert Neville',
        roomType: 'Deluxe Suite',
        roomNo: '204',
        eta: '14:00',
        rate: 190.0,
        balance: 190.0,
        vip: 'VIP 2',
      },
      {
        resNo: 'RES-9015',
        guestName: 'Sarah Connor',
        roomType: 'Standard King',
        roomNo: '108',
        eta: '16:30',
        rate: 140.0,
        balance: 0.0,
        vip: 'Regular',
      },
    ];
  },

  getDepartureList: async (propertyId: string, query: ReportFilterQuery) => {
    return [
      {
        resNo: 'RES-8850',
        roomNo: '302',
        guestName: 'Arthur Dent',
        checkOutTime: '11:00 AM',
        folioBalance: 0.0,
        status: 'Settled',
      },
    ];
  },
};
