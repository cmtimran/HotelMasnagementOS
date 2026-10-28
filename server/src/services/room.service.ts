import { db } from '../database/db.js';
import { broadcastServerEvent } from '../routes/realtime.routes.js';

export interface RoomRecord {
  id: string | number;
  roomNo: string;
  roomType: string;
  floor: number;
  building: string;
  hkStatus: 'clean' | 'dirty' | 'inspected' | 'ooo';
  foStatus: 'vacant' | 'occupied' | 'reserved' | 'due_out';
  baseRate: number;
  propertyId: string | number;
  isConnecting?: boolean;
  connectedTo?: string;
}

const resolvePropertyId = (propertyId: string | number | undefined): number => {
  if (typeof propertyId === 'number') return propertyId;
  if (!propertyId || propertyId === 'prop_grand_palace' || propertyId === '1') return 1;
  const num = Number(propertyId);
  return isNaN(num) ? 1 : num;
};

export const roomService = {
  /**
   * Fetch all 34 rooms for property directly from relational Cloud PostgreSQL DB
   */
  getAllRooms: async (propertyId: string | number, filter?: { hkStatus?: string; foStatus?: string }): Promise<RoomRecord[]> => {
    const propId = resolvePropertyId(propertyId);

    const rows = await db.prepare(`
      SELECT 
        r.id,
        r.room_number as "roomNo",
        r.status as room_status,
        r.housekeeping_status as db_hk,
        r.is_connecting as "isConnecting",
        r.connected_to as "connectedTo",
        b.name as building,
        f.floor_number as floor,
        rt.name as "roomType",
        rt.base_rate as "baseRate",
        (
          SELECT rr.status 
          FROM reservation_rooms rr 
          JOIN reservations res ON res.id = rr.reservation_id 
          WHERE rr.room_id = r.id 
            AND res.property_id = ?
            AND res.status IN ('CONFIRMED', 'IN_HOUSE', 'confirmed', 'in-house', 'arrived')
            AND CURRENT_DATE >= (rr.check_in_date)::date
            AND CURRENT_DATE < (rr.check_out_date)::date
          ORDER BY rr.id DESC LIMIT 1
        ) as active_stay_status,
        (
          SELECT CASE WHEN (rr.check_out_date)::date = CURRENT_DATE THEN 1 ELSE 0 END
          FROM reservation_rooms rr 
          JOIN reservations res ON res.id = rr.reservation_id 
          WHERE rr.room_id = r.id 
            AND res.property_id = ?
            AND res.status IN ('IN_HOUSE', 'in-house', 'arrived')
          ORDER BY rr.id DESC LIMIT 1
        ) as is_due_out
      FROM rooms r
      JOIN buildings b ON b.id = r.building_id
      JOIN floors f ON f.id = r.floor_id
      JOIN room_types rt ON rt.id = r.room_type_id
      WHERE r.property_id = ?
      ORDER BY f.floor_number ASC, CAST(r.room_number AS INTEGER) ASC, r.room_number ASC
    `).all(propId, propId, propId) as any[];

    const result: RoomRecord[] = rows.map(row => {
      // 1. Housekeeping status mapping
      let hkStatus: RoomRecord['hkStatus'] = 'clean';
      if (row.room_status === 'OUT_OF_ORDER' || row.room_status === 'MAINTENANCE') {
        hkStatus = 'ooo';
      } else if (row.db_hk === 'DIRTY') {
        hkStatus = 'dirty';
      } else if (row.db_hk === 'INSPECTED') {
        hkStatus = 'inspected';
      } else {
        hkStatus = 'clean';
      }

      // 2. Front Office status mapping
      let foStatus: RoomRecord['foStatus'] = 'vacant';
      const stayStat = String(row.active_stay_status || '').toUpperCase();
      if (row.room_status === 'OUT_OF_ORDER' || row.room_status === 'MAINTENANCE') {
        foStatus = 'vacant';
      } else if (stayStat === 'CHECKED_IN' || stayStat === 'IN_HOUSE' || stayStat === 'IN-HOUSE') {
        foStatus = row.is_due_out === 1 ? 'due_out' : 'occupied';
      } else if (stayStat === 'ASSIGNED' || stayStat === 'CONFIRMED' || stayStat === 'ARRIVING') {
        foStatus = 'reserved';
      } else {
        foStatus = 'vacant';
      }

      return {
        id: row.id,
        roomNo: String(row.roomNo || row.roomno || row.room_number),
        roomType: row.roomType || row.roomtype || 'Standard Room',
        floor: Number(row.floor) || 1,
        building: row.building || 'Main Tower',
        hkStatus,
        foStatus,
        baseRate: Number(row.baseRate || row.baserate) || 3000,
        propertyId: propId,
        isConnecting: Boolean(row.isConnecting || row.is_connecting),
        connectedTo: row.connectedTo || row.connected_to || undefined
      };
    });

    let filtered = result;
    if (filter?.hkStatus && filter.hkStatus !== 'all') {
      filtered = filtered.filter(r => r.hkStatus === filter.hkStatus);
    }
    if (filter?.foStatus && filter.foStatus !== 'all') {
      filtered = filtered.filter(r => r.foStatus === filter.foStatus);
    }

    return filtered;
  },

  /**
   * Get single room record by room number
   */
  getRoomByNumber: async (roomNo: string, propertyId: string | number): Promise<RoomRecord | null> => {
    const all = await roomService.getAllRooms(propertyId);
    return all.find(r => r.roomNo === String(roomNo)) || null;
  },

  /**
   * Update housekeeping cleanliness status and persist to PostgreSQL DB + SSE Realtime Broadcast
   */
  updateHousekeepingStatus: async (roomNo: string, propertyId: string | number, status: string): Promise<RoomRecord | null> => {
    const propId = resolvePropertyId(propertyId);
    const normalized = (status || '').toLowerCase();

    let dbHk = 'CLEAN';
    let dbStatus = 'ACTIVE';

    if (normalized === 'ooo' || normalized === 'out-of-order' || normalized === 'out_of_order') {
      dbHk = 'DIRTY';
      dbStatus = 'OUT_OF_ORDER';
    } else if (normalized === 'dirty') {
      dbHk = 'DIRTY';
      dbStatus = 'ACTIVE';
    } else if (normalized === 'inspected') {
      dbHk = 'INSPECTED';
      dbStatus = 'ACTIVE';
    } else {
      dbHk = 'CLEAN';
      dbStatus = 'ACTIVE';
    }

    const info = await db.prepare(`
      UPDATE rooms
      SET housekeeping_status = ?,
          status = ?,
          updated_at = CURRENT_TIMESTAMP
      WHERE property_id = ? AND room_number = ?
    `).run(dbHk, dbStatus, propId, String(roomNo));

    if (info.rowCount === 0) {
      return null;
    }

    // Server-side Event-Driven Broadcast to all connected terminals
    try {
      broadcastServerEvent({
        type: 'ROOM_STATUS_CHANGED',
        roomNo: String(roomNo),
        hkStatus: normalized === 'out-of-order' ? 'ooo' : normalized,
        propertyId: propId
      });
      broadcastServerEvent({
        type: 'INVENTORY_REFRESH',
        propertyId: propId
      });
    } catch (e) {
      console.warn('Failed to broadcast room status change', e);
    }

    return roomService.getRoomByNumber(roomNo, propId);
  }
};
