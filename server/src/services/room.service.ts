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
}

const resolvePropertyId = (propertyId: string | number | undefined): number => {
  if (typeof propertyId === 'number') return propertyId;
  if (!propertyId || propertyId === 'prop_grand_palace' || propertyId === '1') return 1;
  const num = Number(propertyId);
  return isNaN(num) ? 1 : num;
};

export const roomService = {
  /**
   * Fetch all 34 rooms for property directly from relational SQLite DB
   */
  getAllRooms: async (propertyId: string | number, filter?: { hkStatus?: string; foStatus?: string }): Promise<RoomRecord[]> => {
    const propId = resolvePropertyId(propertyId);

    const rows = db.prepare(`
      SELECT 
        r.id,
        r.room_number as roomNo,
        r.status as room_status,
        r.housekeeping_status as db_hk,
        b.name as building,
        f.floor_number as floor,
        rt.name as roomType,
        rt.base_rate as baseRate,
        (
          SELECT rr.status 
          FROM reservation_rooms rr 
          JOIN reservations res ON res.id = rr.reservation_id 
          WHERE rr.room_id = r.id 
            AND res.property_id = ?
            AND res.status IN ('CONFIRMED', 'IN_HOUSE')
            AND date('now') >= date(rr.check_in_date)
            AND date('now') < date(rr.check_out_date)
          ORDER BY rr.id DESC LIMIT 1
        ) as active_stay_status,
        (
          SELECT CASE WHEN date(rr.check_out_date) = date('now') THEN 1 ELSE 0 END
          FROM reservation_rooms rr 
          JOIN reservations res ON res.id = rr.reservation_id 
          WHERE rr.room_id = r.id 
            AND res.property_id = ?
            AND res.status = 'IN_HOUSE'
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
      if (row.room_status === 'OUT_OF_ORDER') {
        foStatus = 'vacant';
      } else if (row.active_stay_status === 'CHECKED_IN') {
        foStatus = row.is_due_out === 1 ? 'due_out' : 'occupied';
      } else if (row.active_stay_status === 'ASSIGNED') {
        foStatus = 'reserved';
      } else {
        foStatus = 'vacant';
      }

      return {
        id: row.id,
        roomNo: String(row.roomNo),
        roomType: row.roomType || 'Standard Room',
        floor: Number(row.floor) || 1,
        building: row.building || 'Main Tower',
        hkStatus,
        foStatus,
        baseRate: Number(row.baseRate) || 3000,
        propertyId: propId
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
   * Update housekeeping cleanliness status and persist to SQLite DB + SSE Realtime Broadcast
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

    const info = db.prepare(`
      UPDATE rooms
      SET housekeeping_status = ?,
          status = ?,
          updated_at = CURRENT_TIMESTAMP
      WHERE property_id = ? AND room_number = ?
    `).run(dbHk, dbStatus, propId, String(roomNo));

    if (info.changes === 0) {
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
