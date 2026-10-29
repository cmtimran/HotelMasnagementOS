import { db } from '../../database/db.js';
import type { ReportFilterQuery } from '../../types/index.js';

const resolvePropertyId = (propertyId: string | number | undefined): number | null => {
  if (typeof propertyId === 'number') return propertyId;
  if (!propertyId || propertyId === 'prop_grand_palace' || propertyId === 'all') return null;
  const num = Number(propertyId);
  return isNaN(num) ? null : num;
};

export const reservationReportsService = {
  /**
   * Cancelled reservations query from PostgreSQL database
   */
  getCancelledReservations: async (propertyId: string, _query: ReportFilterQuery) => {
    const propId = resolvePropertyId(propertyId);
    if (!propId) return [];

    const rows = await db.prepare(`
      SELECT 
        r.reservation_number as "resNo",
        g.first_name || ' ' || g.last_name as "guestName",
        r.total_amount as rate,
        COALESCE(
          (SELECT rm.room_number || ' - ' || rt.name 
           FROM reservation_rooms rr 
           JOIN rooms rm ON rm.id = rr.room_id 
           JOIN room_types rt ON rt.id = rm.room_type_id 
           WHERE rr.reservation_id = r.id LIMIT 1),
          'Unassigned'
        ) as room,
        COALESCE((SELECT MIN(check_in_date) FROM reservation_rooms WHERE reservation_id = r.id), (r.created_at)::date) as arrival,
        COALESCE((SELECT MAX(check_out_date) FROM reservation_rooms WHERE reservation_id = r.id), (r.created_at + INTERVAL '2 days')::date) as departure,
        (r.updated_at)::date as "cancelledDate",
        COALESCE(r.agent, 'Front Desk') as "cancelledBy",
        COALESCE(r.special_requests, 'Guest Request / Travel Plan Change') as reason,
        r.paid_amount as charge
      FROM reservations r
      JOIN guests g ON g.id = r.booker_guest_id
      WHERE r.property_id = ? AND r.status = 'CANCELLED'
      ORDER BY r.updated_at DESC
    `).all(propId) as any[];

    return rows || [];
  },

  /**
   * Expected & today's arrivals query from PostgreSQL database
   */
  getArrivalList: async (propertyId: string, _query: ReportFilterQuery) => {
    const propId = resolvePropertyId(propertyId);
    if (!propId) return [];

    const rows = await db.prepare(`
      SELECT 
        r.reservation_number as "resNo",
        g.first_name || ' ' || g.last_name as "guestName",
        COALESCE(rt.name, 'Room') as "roomType",
        COALESCE(rm.room_number, 'TBD') as "roomNo",
        '14:00' as eta,
        COALESCE(rr.room_rate, r.total_amount) as rate,
        r.due_amount as balance,
        COALESCE(g.vip_status, 'Regular') as vip
      FROM reservations r
      JOIN guests g ON g.id = r.booker_guest_id
      LEFT JOIN reservation_rooms rr ON rr.reservation_id = r.id
      LEFT JOIN rooms rm ON rm.id = rr.room_id
      LEFT JOIN room_types rt ON rt.id = rm.room_type_id
      WHERE r.property_id = ? AND r.status IN ('CONFIRMED', 'HOLD')
      ORDER BY r.id DESC
      LIMIT 20
    `).all(propId) as any[];

    return rows || [];
  },

  /**
   * Departures & Due Out query from PostgreSQL database
   */
  getDepartureList: async (propertyId: string, _query: ReportFilterQuery) => {
    const propId = resolvePropertyId(propertyId);
    if (!propId) return [];

    const rows = await db.prepare(`
      SELECT 
        r.reservation_number as "resNo",
        COALESCE(rm.room_number, 'TBD') as "roomNo",
        g.first_name || ' ' || g.last_name as "guestName",
        '12:00 PM' as "checkOutTime",
        r.due_amount as "folioBalance",
        CASE WHEN r.due_amount <= 0 THEN 'Settled' ELSE 'Balance Outstanding' END as status
      FROM reservations r
      JOIN guests g ON g.id = r.booker_guest_id
      LEFT JOIN reservation_rooms rr ON rr.reservation_id = r.id
      LEFT JOIN rooms rm ON rm.id = rr.room_id
      WHERE r.property_id = ? AND r.status = 'IN_HOUSE'
      ORDER BY r.id DESC
      LIMIT 20
    `).all(propId) as any[];

    return rows || [];
  },
};
