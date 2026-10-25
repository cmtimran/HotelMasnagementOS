import { db } from '../database/db.js';
import { pgPool, isPostgresConnected } from '../database/postgres.js';

export interface BookingRecord {
  id: string | number;
  resNo: string;
  reservationNumber: string;
  guestName: string;
  phone: string;
  email: string;
  roomNo: string;
  roomNumber: string;
  allocatedRooms: string[];
  roomType: string;
  ratePlan: string;
  rateAmount: number;
  totalAmount: number;
  paidAmount: number;
  dueAmount: number;
  arrivalDate: string;
  departureDate: string;
  checkIn: string;
  checkOut: string;
  nights: number;
  adults: number;
  children: number;
  status: 'confirmed' | 'arriving' | 'in-house' | 'departing' | 'checked-out' | 'hold' | 'cancelled' | 'voided';
  propertyId: string | number;
  source: string;
  channel: string;
  vip: string;
  isGroup: boolean;
  specialRequests?: string;
  roomsList?: any[];
  createdAt: string;
}

const STATUS_DB_TO_UI: Record<string, BookingRecord['status']> = {
  CONFIRMED: 'confirmed',
  IN_HOUSE: 'in-house',
  COMPLETED: 'checked-out',
  HOLD: 'hold',
  CANCELLED: 'cancelled',
  VOIDED: 'voided'
};

const STATUS_UI_TO_DB: Record<string, string> = {
  confirmed: 'CONFIRMED',
  arriving: 'CONFIRMED',
  'in-house': 'IN_HOUSE',
  checked_in: 'IN_HOUSE',
  in_house: 'IN_HOUSE',
  'checked-out': 'COMPLETED',
  checked_out: 'COMPLETED',
  completed: 'COMPLETED',
  hold: 'HOLD',
  cancelled: 'CANCELLED',
  void: 'VOIDED',
  voided: 'VOIDED'
};

const resolvePropertyId = (propertyId: string | number | undefined): number => {
  if (typeof propertyId === 'number') return propertyId;
  if (!propertyId || propertyId === 'prop_grand_palace' || propertyId === '1') return 1;
  const num = Number(propertyId);
  return isNaN(num) ? 1 : num;
};

export const bookingService = {
  /**
   * Fetch all bookings for a property directly from PostgreSQL Cloud or embedded SQLite database
   */
  getAllBookings: async (propertyId: string | number, status?: string): Promise<BookingRecord[]> => {
    const propId = resolvePropertyId(propertyId);

    // 1. Query Cloud PostgreSQL (TiDB) if connected
    if (isPostgresConnected()) {
      try {
        const reservationsRes = await pgPool.query(`
          SELECT 
            r.id,
            r.property_id,
            r.reservation_number,
            r.source,
            r.channel,
            r.agent,
            r.is_group,
            r.status as db_status,
            r.total_amount,
            r.paid_amount,
            r.due_amount,
            r.special_requests,
            r.created_at,
            g.id as guest_id,
            g.salutation,
            g.first_name,
            g.last_name,
            g.email,
            g.phone,
            g.vip_status,
            ca.company_name as corporate_name
          FROM reservations r
          JOIN guests g ON g.id = r.booker_guest_id
          LEFT JOIN corporate_accounts ca ON ca.id = r.corporate_account_id
          WHERE r.property_id = $1
          ORDER BY r.id DESC
        `, [propId]);

        const roomsRes = await pgPool.query(`
          SELECT 
            rr.id,
            rr.reservation_id,
            rr.room_id,
            rr.check_in_date,
            rr.check_out_date,
            rr.nights,
            rr.room_rate,
            rr.adults,
            rr.children,
            rr.status as room_stay_status,
            rm.room_number,
            rm.name as room_name,
            rt.name as room_type_name,
            rt.code as room_type_code
          FROM reservation_rooms rr
          JOIN rooms rm ON rm.id = rr.room_id
          JOIN room_types rt ON rt.id = rm.room_type_id
          ORDER BY rr.id ASC
        `);

        if (reservationsRes.rows.length > 0) {
          const roomsMap = new Map<number | string, any[]>();
          for (const rm of roomsRes.rows) {
            const list = roomsMap.get(rm.reservation_id);
            if (list) list.push(rm);
            else roomsMap.set(rm.reservation_id, [rm]);
          }

          const results: BookingRecord[] = [];
          const todayStr = new Date().toISOString().slice(0, 10);

          const formatDate = (val: any): string => {
            if (!val) return todayStr;
            if (typeof val === 'string') return val.slice(0, 10);
            if (val instanceof Date) return val.toISOString().slice(0, 10);
            return String(val).slice(0, 10);
          };

          for (const r of reservationsRes.rows) {
            const rooms = roomsMap.get(r.id) || [];
            const allocatedRoomNumbers = rooms.map(rm => rm.room_number);
            const primaryRoom = rooms[0] || {
              room_number: 'Unassigned',
              room_type_name: 'Standard Single',
              check_in_date: todayStr,
              check_out_date: todayStr,
              nights: 1,
              adults: 1,
              children: 0,
              room_rate: r.total_amount || 0
            };

            const primaryCheckIn = formatDate(primaryRoom.check_in_date);
            const primaryCheckOut = formatDate(primaryRoom.check_out_date);

            let uiStatus = STATUS_DB_TO_UI[r.db_status] || 'confirmed';
            if (uiStatus === 'confirmed' && primaryCheckIn === todayStr) {
              uiStatus = 'arriving';
            } else if (uiStatus === 'in-house' && primaryCheckOut === todayStr) {
              uiStatus = 'departing';
            }

            const guestFullName = `${r.salutation ? r.salutation + ' ' : ''}${r.first_name} ${r.last_name}`.trim();

            results.push({
              id: r.id,
              resNo: r.reservation_number,
              reservationNumber: r.reservation_number,
              guestName: guestFullName,
              phone: r.phone || '',
              email: r.email || '',
              roomNo: primaryRoom.room_number,
              roomNumber: primaryRoom.room_number,
              allocatedRooms: allocatedRoomNumbers.length > 0 ? allocatedRoomNumbers : [primaryRoom.room_number],
              roomType: primaryRoom.room_type_name,
              ratePlan: r.corporate_name || r.source || 'Standard Plan',
              rateAmount: Number(r.total_amount) || 0,
              totalAmount: Number(r.total_amount) || 0,
              paidAmount: Number(r.paid_amount) || 0,
              dueAmount: Number(r.due_amount) || 0,
              arrivalDate: primaryCheckIn,
              departureDate: primaryCheckOut,
              checkIn: primaryCheckIn,
              checkOut: primaryCheckOut,
              nights: Number(primaryRoom.nights) || 1,
              adults: Number(primaryRoom.adults) || 1,
              children: Number(primaryRoom.children) || 0,
              status: uiStatus,
              propertyId: r.property_id,
              source: r.source || 'Direct',
              channel: r.channel || 'Front Desk',
              vip: r.vip_status || 'None',
              isGroup: Boolean(r.is_group),
              specialRequests: r.special_requests || '',
              roomsList: rooms.map(rm => {
                const inD = formatDate(rm.check_in_date);
                const outD = formatDate(rm.check_out_date);
                return {
                  id: rm.id,
                  roomNumber: rm.room_number,
                  roomType: rm.room_type_name,
                  checkIn: inD,
                  checkOut: outD,
                  checkInDate: inD,
                  checkOutDate: outD,
                  nights: rm.nights,
                  rate: rm.room_rate,
                  adults: rm.adults,
                  children: rm.children,
                  status: rm.room_stay_status
                };
              }),
              createdAt: r.created_at ? (typeof r.created_at === 'string' ? r.created_at : r.created_at.toISOString()) : new Date().toISOString()
            });
          }

          if (status && status !== 'all') {
            const target = status.toLowerCase();
            return results.filter(b => b.status === target || (target === 'reservations' && b.status !== 'cancelled' && b.status !== 'voided'));
          }
          return results;
        }
      } catch (err: any) {
        console.warn('Postgres query notice in getAllBookings, falling back to SQLite:', err.message);
      }
    }

    // 2. High-speed Fallback to embedded SQLite
    const reservationsQuery = `
      SELECT 
        r.id,
        r.property_id,
        r.reservation_number,
        r.source,
        r.channel,
        r.agent,
        r.is_group,
        r.status as db_status,
        r.total_amount,
        r.paid_amount,
        r.due_amount,
        r.special_requests,
        r.created_at,
        g.id as guest_id,
        g.salutation,
        g.first_name,
        g.last_name,
        g.email,
        g.phone,
        g.vip_status,
        ca.company_name as corporate_name
      FROM reservations r
      JOIN guests g ON g.id = r.booker_guest_id
      LEFT JOIN corporate_accounts ca ON ca.id = r.corporate_account_id
      WHERE r.property_id = ?
      ORDER BY r.id DESC
    `;

    const reservations = db.prepare(reservationsQuery).all(propId) as any[];

    const results: BookingRecord[] = [];

    for (const r of reservations) {
      // Query allocated sub-stay rooms
      const rooms = db.prepare(`
        SELECT 
          rr.id,
          rr.room_id,
          rr.check_in_date,
          rr.check_out_date,
          rr.nights,
          rr.room_rate,
          rr.adults,
          rr.children,
          rr.status as room_stay_status,
          rm.room_number,
          rm.name as room_name,
          rt.name as room_type_name,
          rt.code as room_type_code
        FROM reservation_rooms rr
        JOIN rooms rm ON rm.id = rr.room_id
        JOIN room_types rt ON rt.id = rm.room_type_id
        WHERE rr.reservation_id = ?
        ORDER BY rr.id ASC
      `).all(r.id) as any[];

      const allocatedRoomNumbers = rooms.map(rm => rm.room_number);
      const primaryRoom = rooms[0] || {
        room_number: 'Unassigned',
        room_type_name: 'Standard Single',
        check_in_date: new Date().toISOString().slice(0, 10),
        check_out_date: new Date().toISOString().slice(0, 10),
        nights: 1,
        adults: 1,
        children: 0,
        room_rate: r.total_amount || 0
      };

      // Determine smart status for arrival vs departure vs in-house
      const todayStr = new Date().toISOString().slice(0, 10);
      let uiStatus = STATUS_DB_TO_UI[r.db_status] || 'confirmed';
      if (uiStatus === 'confirmed' && primaryRoom.check_in_date === todayStr) {
        uiStatus = 'arriving';
      } else if (uiStatus === 'in-house' && primaryRoom.check_out_date === todayStr) {
        uiStatus = 'departing';
      }

      const guestFullName = `${r.salutation ? r.salutation + ' ' : ''}${r.first_name} ${r.last_name}`.trim();

      const bookingDto: BookingRecord = {
        id: r.id,
        resNo: r.reservation_number,
        reservationNumber: r.reservation_number,
        guestName: guestFullName,
        phone: r.phone || '',
        email: r.email || '',
        roomNo: primaryRoom.room_number,
        roomNumber: primaryRoom.room_number,
        allocatedRooms: allocatedRoomNumbers.length > 0 ? allocatedRoomNumbers : [primaryRoom.room_number],
        roomType: primaryRoom.room_type_name,
        ratePlan: r.corporate_name || r.source || 'Standard Plan',
        rateAmount: Number(r.total_amount) || 0,
        totalAmount: Number(r.total_amount) || 0,
        paidAmount: Number(r.paid_amount) || 0,
        dueAmount: Number(r.due_amount) || 0,
        arrivalDate: primaryRoom.check_in_date,
        departureDate: primaryRoom.check_out_date,
        checkIn: primaryRoom.check_in_date,
        checkOut: primaryRoom.check_out_date,
        nights: Number(primaryRoom.nights) || 1,
        adults: Number(primaryRoom.adults) || 1,
        children: Number(primaryRoom.children) || 0,
        status: uiStatus,
        propertyId: r.property_id,
        source: r.source || 'Direct',
        channel: r.channel || 'Front Desk',
        vip: r.vip_status || 'None',
        isGroup: Boolean(r.is_group),
        specialRequests: r.special_requests || '',
        roomsList: rooms.map(rm => ({
          id: rm.id,
          roomNumber: rm.room_number,
          roomType: rm.room_type_name,
          checkIn: rm.check_in_date,
          checkOut: rm.check_out_date,
          checkInDate: rm.check_in_date,
          checkOutDate: rm.check_out_date,
          nights: rm.nights,
          rate: rm.room_rate,
          adults: rm.adults,
          children: rm.children,
          status: rm.room_stay_status
        })),
        createdAt: r.created_at || new Date().toISOString()
      };

      results.push(bookingDto);
    }

    if (status && status !== 'all') {
      const target = status.toLowerCase();
      return results.filter(b => b.status === target || (target === 'reservations' && b.status !== 'cancelled' && b.status !== 'voided'));
    }

    return results;
  },

  /**
   * Get single booking by ID or reservation number
   */
  getBookingById: async (id: string | number, propertyId: string | number): Promise<BookingRecord | null> => {
    const propId = resolvePropertyId(propertyId);
    const row = db.prepare(`
      SELECT 
        r.id,
        r.property_id,
        r.reservation_number,
        r.source,
        r.channel,
        r.agent,
        r.is_group,
        r.status as db_status,
        r.total_amount,
        r.paid_amount,
        r.due_amount,
        r.special_requests,
        r.created_at,
        g.id as guest_id,
        g.salutation,
        g.first_name,
        g.last_name,
        g.email,
        g.phone,
        g.vip_status,
        ca.company_name as corporate_name
      FROM reservations r
      JOIN guests g ON g.id = r.booker_guest_id
      LEFT JOIN corporate_accounts ca ON ca.id = r.corporate_account_id
      WHERE r.property_id = ? AND (r.id = ? OR r.reservation_number = ?)
    `).get(propId, id, String(id)) as any;

    if (!row) return null;

    const all = await bookingService.getAllBookings(propId);
    return all.find(b => String(b.id) === String(row.id) || b.reservationNumber === row.reservation_number) || null;
  },

  /**
   * Create a new reservation directly inside SQLite relational tables
   */
  createBooking: async (payload: any): Promise<BookingRecord> => {
    const propId = resolvePropertyId(payload.propertyId);

    // 1. Resolve or Create Guest in `guests` table
    const phone = payload.phone || payload.mobile || '+880 1711-000000';
    const email = payload.email || 'guest@hospitality.com';
    const rawName = (payload.guestName || 'Valued Guest').replace(/^(Mr|Mrs|Ms|Dr)\.?\s+/i, '').trim();
    const nameParts = rawName.split(' ');
    const firstName = nameParts[0] || 'Valued';
    const lastName = nameParts.slice(1).join(' ') || 'Guest';
    const salutation = payload.salutation || (payload.guestName?.match(/^(Mr|Mrs|Ms|Dr)\.?\s+/i)?.[1]) || 'Mr';
    const vipStatus = payload.vip || payload.vipStatus || 'NONE';

    let guest = db.prepare('SELECT id FROM guests WHERE phone = ? LIMIT 1').get(phone) as any;
    if (!guest) {
      const guestInsert = db.prepare(`
        INSERT INTO guests (organization_id, salutation, first_name, last_name, email, phone, vip_status)
        VALUES (1, ?, ?, ?, ?, ?, ?)
      `).run(salutation, firstName, lastName, email, phone, vipStatus === 'None' ? 'NONE' : vipStatus);
      guest = { id: Number(guestInsert.lastInsertRowid) };
    }

    // 2. Prepare Reservation Master
    const reservationNumber = payload.reservationNumber || payload.resNo || `RES-${Math.floor(100000 + Math.random() * 900000)}`;
    const statusDb = STATUS_UI_TO_DB[payload.status] || 'CONFIRMED';
    const totalAmount = Number(payload.totalAmount || payload.rateAmount || 0);
    const paidAmount = Number(payload.paidAmount || 0);
    const dueAmount = totalAmount - paidAmount;
    const totalTaxAmount = Number(payload.totalTaxAmount || payload.vatAmount || 0);
    const baseAmount = Number(payload.baseAmount) || Math.max(0, totalAmount - totalTaxAmount);
    const isGroup = Boolean(payload.isGroup || (payload.allocatedRooms && payload.allocatedRooms.length > 1));

    const resInsert = db.prepare(`
      INSERT INTO reservations (
        property_id, reservation_number, booker_guest_id, source, channel, agent,
        is_group, status, total_amount, paid_amount, due_amount, special_requests
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      propId,
      reservationNumber,
      guest.id,
      payload.source || 'Direct',
      payload.channel || 'Front Desk',
      payload.agent || null,
      isGroup ? 1 : 0,
      statusDb,
      totalAmount,
      paidAmount,
      dueAmount,
      payload.specialRequests || payload.special_requests || null
    );

    const reservationId = Number(resInsert.lastInsertRowid);

    // 3. Allocate Rooms in `reservation_rooms` (1NF-4NF)
    const checkIn = payload.checkIn || payload.arrivalDate || new Date().toISOString().slice(0, 10);
    const checkOut = payload.checkOut || payload.departureDate || new Date(Date.now() + 86400000 * 2).toISOString().slice(0, 10);
    const nights = Math.max(1, Number(payload.nights) || Math.round((new Date(checkOut).getTime() - new Date(checkIn).getTime()) / (1000 * 3600 * 24)));

    // Rooms list source
    const rawRooms = payload.roomsList && payload.roomsList.length > 0 
      ? payload.roomsList 
      : payload.allocatedRooms && payload.allocatedRooms.length > 0 
        ? payload.allocatedRooms.map((rNum: string) => ({ roomNumber: rNum }))
        : [{ roomNumber: payload.roomNumber || payload.roomNo || '101' }];

    const roomRatePerRoom = rawRooms.length > 0 ? totalAmount / rawRooms.length : totalAmount;

    for (const rm of rawRooms) {
      const roomNum = rm.roomNumber || rm.number || '101';
      // Look up physical room id
      let physicalRoom = db.prepare('SELECT id FROM rooms WHERE property_id = ? AND room_number = ?').get(propId, String(roomNum)) as any;
      if (!physicalRoom) {
        physicalRoom = db.prepare('SELECT id FROM rooms WHERE property_id = ? LIMIT 1').get(propId) as any;
      }

      if (physicalRoom) {
        const roomIn = rm.checkIn || rm.checkInDate || checkIn;
        const roomOut = rm.checkOut || rm.checkOutDate || checkOut;
        const roomNights = rm.nights || nights;
        const roomRate = rm.rate || roomRatePerRoom;

        db.prepare(`
          INSERT INTO reservation_rooms (
            reservation_id, room_id, guest_id, check_in_date, check_out_date,
            nights, room_rate, adults, children, status
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).run(
          reservationId,
          physicalRoom.id,
          guest.id,
          roomIn,
          roomOut,
          roomNights,
          roomRate,
          Number(payload.adults) || 1,
          Number(payload.children) || 0,
          statusDb === 'IN_HOUSE' ? 'CHECKED_IN' : 'ASSIGNED'
        );
      }
    }

    // 4. Create Folio in `folios`
    const folioInsert = db.prepare(`
      INSERT INTO folios (reservation_id, guest_id, folio_number, folio_type, status, balance)
      VALUES (?, ?, ?, 'GUEST', ?, ?)
    `).run(
      reservationId,
      guest.id,
      `FOL-${reservationNumber}-1`,
      paidAmount >= totalAmount ? 'SETTLED' : 'OPEN',
      dueAmount
    );

    const folioId = Number(folioInsert.lastInsertRowid);

    // 4b. Record initial Room Tariff and Tax charges into `folio_charges` (USALI Accounting)
    try {
      const taxPolicyDesc = payload.taxConfigCode ? ` [${payload.taxConfigCode}]` : '';
      db.prepare(`
        INSERT INTO folio_charges (
          folio_id, charge_code, description, amount, tax_amount, total_amount, charge_date
        ) VALUES (?, 'ROOM_TARIFF', ?, ?, ?, ?, ?)
      `).run(
        folioId,
        `Room Accommodation Tariff (${nights} night${nights > 1 ? 's' : ''})${taxPolicyDesc}`,
        baseAmount,
        totalTaxAmount,
        totalAmount,
        checkIn
      );
    } catch (chargeErr) {
      console.warn('Failed to insert initial folio charges', chargeErr);
    }

    // 5. If initial payment provided, record in `payments`
    if (paidAmount > 0) {
      db.prepare(`
        INSERT INTO payments (folio_id, property_id, payment_number, payment_method, amount, reference_code)
        VALUES (?, ?, ?, 'CASH', ?, ?)
      `).run(
        folioId,
        propId,
        `PAY-${reservationNumber}`,
        paidAmount,
        'FRONT_DESK_DEPOSIT'
      );
    }

    const createdBooking = await bookingService.getBookingById(reservationId, propId);
    return createdBooking!;
  },

  /**
   * Comprehensive Reservation Update (Guest, Amounts, Dates, Rooms, Status)
   */
  updateBooking: async (id: string | number, propertyId: string | number, payload: any): Promise<BookingRecord | null> => {
    const propId = resolvePropertyId(propertyId);
    const existing = await bookingService.getBookingById(id, propId);
    if (!existing) return null;

    const resId = existing.id;

    // 1. Update Guest Details if provided
    if (payload.guestName || payload.phone || payload.email || payload.salutation || payload.vip) {
      const rawName = (payload.guestName || existing.guestName).replace(/^(Mr|Mrs|Ms|Dr)\.?\s+/i, '').trim();
      const nameParts = rawName.split(' ');
      const firstName = nameParts[0] || 'Valued';
      const lastName = nameParts.slice(1).join(' ') || 'Guest';
      const salutation = payload.salutation || (payload.guestName?.match(/^(Mr|Mrs|Ms|Dr)\.?\s+/i)?.[1]) || 'Mr';
      const phone = payload.phone || existing.phone;
      const email = payload.email || existing.email;
      const vip = payload.vip || existing.vip || 'NONE';

      db.prepare(`
        UPDATE guests
        SET salutation = ?, first_name = ?, last_name = ?, email = ?, phone = ?, vip_status = ?, updated_at = CURRENT_TIMESTAMP
        WHERE id = (SELECT booker_guest_id FROM reservations WHERE id = ? LIMIT 1)
      `).run(salutation, firstName, lastName, email, phone, vip === 'None' ? 'NONE' : vip, resId);
    }

    // 2. Update Reservation Master (Amounts, Status, Special Requests)
    const newTotal = payload.totalAmount !== undefined ? Number(payload.totalAmount) : existing.totalAmount;
    const newPaid = payload.paidAmount !== undefined ? Number(payload.paidAmount) : existing.paidAmount;
    const newDue = payload.dueAmount !== undefined ? Number(payload.dueAmount) : Math.max(0, newTotal - newPaid);
    const statusDb = payload.status ? (STATUS_UI_TO_DB[payload.status] || payload.status.toUpperCase()) : undefined;

    if (statusDb) {
      db.prepare(`
        UPDATE reservations
        SET total_amount = ?, paid_amount = ?, due_amount = ?, status = ?, special_requests = COALESCE(?, special_requests), updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `).run(newTotal, newPaid, newDue, statusDb, payload.specialRequests ?? null, resId);
    } else {
      db.prepare(`
        UPDATE reservations
        SET total_amount = ?, paid_amount = ?, due_amount = ?, special_requests = COALESCE(?, special_requests), updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `).run(newTotal, newPaid, newDue, payload.specialRequests ?? null, resId);
    }

    // Update Folio balance
    db.prepare(`
      UPDATE folios
      SET balance = ?, status = CASE WHEN ? <= 0 THEN 'SETTLED' ELSE 'OPEN' END
      WHERE reservation_id = ?
    `).run(newDue, newDue, resId);

    // 3. Update reservation_rooms (Dates, Nights, Room Assignment)
    const newCheckIn = payload.checkIn || payload.arrivalDate || existing.checkIn;
    const newCheckOut = payload.checkOut || payload.departureDate || existing.checkOut;
    const newNights = Number(payload.nights) || Math.max(1, Math.round((new Date(newCheckOut).getTime() - new Date(newCheckIn).getTime()) / (1000 * 3600 * 24)));

    if (payload.roomsList && Array.isArray(payload.roomsList) && payload.roomsList.length > 0) {
      for (const r of payload.roomsList) {
        const rNum = r.roomNumber || r.roomNo;
        const rIn = r.checkInDate || r.checkIn || newCheckIn;
        const rOut = r.checkOutDate || r.checkOut || newCheckOut;
        const rNights = Number(r.nights) || newNights;
        const rRate = Number(r.rate) || 0;

        const physicalRoom = db.prepare('SELECT id FROM rooms WHERE property_id = ? AND room_number = ? LIMIT 1').get(propId, String(rNum)) as any;
        if (physicalRoom) {
          db.prepare(`
            UPDATE reservation_rooms
            SET room_id = ?, check_in_date = ?, check_out_date = ?, nights = ?, room_rate = CASE WHEN ? > 0 THEN ? ELSE room_rate END
            WHERE reservation_id = ? AND (room_id = ? OR id = ?)
          `).run(physicalRoom.id, rIn, rOut, rNights, rRate, rRate, resId, physicalRoom.id, r.id || 0);
        }
      }
    } else {
      const targetRoomNum = payload.roomNumber || payload.roomNo || existing.roomNumber;
      const physicalRoom = db.prepare('SELECT id FROM rooms WHERE property_id = ? AND room_number = ? LIMIT 1').get(propId, String(targetRoomNum)) as any;
      if (physicalRoom) {
        db.prepare(`
          UPDATE reservation_rooms
          SET room_id = ?, check_in_date = ?, check_out_date = ?, nights = ?
          WHERE reservation_id = ?
        `).run(physicalRoom.id, newCheckIn, newCheckOut, newNights, resId);
      } else {
        db.prepare(`
          UPDATE reservation_rooms
          SET check_in_date = ?, check_out_date = ?, nights = ?
          WHERE reservation_id = ?
        `).run(newCheckIn, newCheckOut, newNights, resId);
      }
    }

    // Mirror to Postgres Cloud if connected
    if (isPostgresConnected()) {
      try {
        await pgPool.query(
          `UPDATE reservations SET total_amount = $1, paid_amount = $2, due_amount = $3 WHERE id = $4`,
          [newTotal, newPaid, newDue, resId]
        );
        await pgPool.query(
          `UPDATE reservation_rooms SET check_in_date = $1, check_out_date = $2, nights = $3 WHERE reservation_id = $4`,
          [newCheckIn, newCheckOut, newNights, resId]
        );
      } catch (err: any) {
        console.warn('Postgres mirror sync notice:', err.message);
      }
    }

    return bookingService.getBookingById(resId, propId);
  },

  /**
   * Amend Stay (Extend or Shorten Stay in Stay View)
   */
  amendStay: async (id: string | number, propertyId: string | number, payload: {
    roomNumber?: string;
    newDeparture: string;
    newNights: number;
    newBaseAmount?: number;
    newTotalAmount?: number;
    newDueAmount?: number;
    taxDetails?: any;
  }): Promise<BookingRecord | null> => {
    const propId = resolvePropertyId(propertyId);
    const existing = await bookingService.getBookingById(id, propId);
    if (!existing) return null;

    const resId = existing.id;
    const { roomNumber, newDeparture, newNights, newTotalAmount, newDueAmount } = payload;

    // 1. Update reservation_rooms
    if (roomNumber) {
      const roomRow = db.prepare('SELECT id FROM rooms WHERE property_id = ? AND room_number = ? LIMIT 1').get(propId, String(roomNumber)) as any;
      if (roomRow) {
        db.prepare(`
          UPDATE reservation_rooms
          SET check_out_date = ?, nights = ?
          WHERE reservation_id = ? AND room_id = ?
        `).run(newDeparture, newNights, resId, roomRow.id);
      }
    }
    // Also ensure reservation_rooms row for this reservation is updated
    db.prepare(`
      UPDATE reservation_rooms
      SET check_out_date = ?, nights = ?
      WHERE reservation_id = ?
    `).run(newDeparture, newNights, resId);

    // 2. Update amounts if provided
    if (newTotalAmount !== undefined) {
      const newTotal = Number(newTotalAmount);
      const paid = Number(existing.paidAmount || 0);
      const due = newDueAmount !== undefined ? Number(newDueAmount) : Math.max(0, newTotal - paid);

      db.prepare(`
        UPDATE reservations
        SET total_amount = ?, due_amount = ?, updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `).run(newTotal, due, resId);

      db.prepare(`
        UPDATE folios
        SET balance = ?, status = CASE WHEN ? <= 0 THEN 'SETTLED' ELSE 'OPEN' END
        WHERE reservation_id = ?
      `).run(due, due, resId);
    }

    // Mirror to Postgres Cloud if connected
    if (isPostgresConnected()) {
      try {
        await pgPool.query(
          `UPDATE reservation_rooms SET check_out_date = $1, nights = $2 WHERE reservation_id = $3`,
          [newDeparture, newNights, resId]
        );
        if (newTotalAmount !== undefined) {
          await pgPool.query(
            `UPDATE reservations SET total_amount = $1, due_amount = $2 WHERE id = $3`,
            [newTotalAmount, newDueAmount ?? (Number(newTotalAmount) - Number(existing.paidAmount || 0)), resId]
          );
        }
      } catch (err: any) {
        console.warn('Postgres amend mirror warning:', err.message);
      }
    }

    return bookingService.getBookingById(resId, propId);
  },

  /**
   * Room Move (Move Reservation from one Room to another Room)
   */
  moveRoom: async (id: string | number, propertyId: string | number, payload: {
    oldRoomNumber?: string;
    newRoomNumber: string;
    newFromDate?: string;
    newToDate?: string;
  }): Promise<BookingRecord | null> => {
    const propId = resolvePropertyId(propertyId);
    const existing = await bookingService.getBookingById(id, propId);
    if (!existing) return null;

    const resId = existing.id;
    const { oldRoomNumber, newRoomNumber, newFromDate, newToDate } = payload;

    const targetRoom = db.prepare('SELECT id FROM rooms WHERE property_id = ? AND room_number = ? LIMIT 1').get(propId, String(newRoomNumber)) as any;
    if (!targetRoom) {
      throw new Error(`Target room ${newRoomNumber} not found for property ${propId}`);
    }

    if (oldRoomNumber) {
      const oldRoom = db.prepare('SELECT id FROM rooms WHERE property_id = ? AND room_number = ? LIMIT 1').get(propId, String(oldRoomNumber)) as any;
      if (oldRoom) {
        db.prepare(`
          UPDATE reservation_rooms
          SET room_id = ?, 
              check_in_date = COALESCE(?, check_in_date),
              check_out_date = COALESCE(?, check_out_date)
          WHERE reservation_id = ? AND room_id = ?
        `).run(targetRoom.id, newFromDate || null, newToDate || null, resId, oldRoom.id);
      }
    } else {
      db.prepare(`
        UPDATE reservation_rooms
        SET room_id = ?, 
            check_in_date = COALESCE(?, check_in_date),
            check_out_date = COALESCE(?, check_out_date)
        WHERE reservation_id = ?
      `).run(targetRoom.id, newFromDate || null, newToDate || null, resId);
    }

    if (isPostgresConnected()) {
      try {
        await pgPool.query(
          `UPDATE reservation_rooms SET room_id = (SELECT id FROM rooms WHERE property_id = $1 AND room_number = $2 LIMIT 1), check_in_date = COALESCE($3, check_in_date), check_out_date = COALESCE($4, check_out_date) WHERE reservation_id = $5`,
          [propId, String(newRoomNumber), newFromDate || null, newToDate || null, resId]
        );
      } catch (err: any) {
        console.warn('Postgres move room sync warning:', err.message);
      }
    }

    return bookingService.getBookingById(resId, propId);
  },

  /**
   * Record Payment on Reservation Folio
   */
  recordPayment: async (id: string | number, propertyId: string | number, payload: {
    amount: number;
    paymentMethod?: string;
    remarks?: string;
  }): Promise<BookingRecord | null> => {
    const propId = resolvePropertyId(propertyId);
    const existing = await bookingService.getBookingById(id, propId);
    if (!existing) return null;

    const resId = existing.id;
    const amount = Number(payload.amount);
    const newPaid = Number(existing.paidAmount || 0) + amount;
    const newDue = Math.max(0, Number(existing.totalAmount || 0) - newPaid);

    db.prepare(`
      UPDATE reservations
      SET paid_amount = ?, due_amount = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(newPaid, newDue, resId);

    // Update Folio balance
    db.prepare(`
      UPDATE folios
      SET balance = ?, status = CASE WHEN ? <= 0 THEN 'SETTLED' ELSE 'OPEN' END
      WHERE reservation_id = ?
    `).run(newDue, newDue, resId);

    // Record Payment
    const folio = db.prepare('SELECT id FROM folios WHERE reservation_id = ? LIMIT 1').get(resId) as any;
    const folioId = folio ? folio.id : 1;
    const paymentMethod = (payload.paymentMethod || 'CASH').toUpperCase();
    const paymentNumber = `PAY-${Date.now()}`;

    try {
      db.prepare(`
        INSERT INTO payments (folio_id, property_id, payment_number, payment_method, amount, reference_code)
        VALUES (?, ?, ?, ?, ?, ?)
      `).run(folioId, propId, paymentNumber, paymentMethod, amount, payload.remarks || 'FRONT_DESK_PAYMENT');
    } catch (payErr) {
      console.warn('Payment insert warning:', payErr);
    }

    if (isPostgresConnected()) {
      try {
        await pgPool.query(
          `UPDATE reservations SET paid_amount = $1, due_amount = $2 WHERE id = $3`,
          [newPaid, newDue, resId]
        );
      } catch (err: any) {
        console.warn('Postgres payment sync warning:', err.message);
      }
    }

    return bookingService.getBookingById(resId, propId);
  },

  /**
   * Split Stay across two rooms
   */
  splitStay: async (id: string | number, propertyId: string | number, payload: {
    targetRoomNumber: string;
    splitDate?: string;
    fromDate?: string;
    toDate?: string;
  }): Promise<BookingRecord | null> => {
    const propId = resolvePropertyId(propertyId);
    const existing = await bookingService.getBookingById(id, propId);
    if (!existing) return null;

    const resId = existing.id;
    const checkIn = payload.fromDate || existing.checkIn;
    const checkOut = payload.toDate || existing.checkOut;

    let splitDate = payload.splitDate;
    if (!splitDate) {
      const inD = new Date(checkIn);
      const half = Math.max(1, Math.floor(existing.nights / 2));
      inD.setDate(inD.getDate() + half);
      splitDate = inD.toISOString().slice(0, 10);
    }

    const nights1 = Math.max(1, Math.round((new Date(splitDate).getTime() - new Date(checkIn).getTime()) / 86400000));
    const nights2 = Math.max(1, Math.round((new Date(checkOut).getTime() - new Date(splitDate).getTime()) / 86400000));

    // Update existing room stay to end at splitDate
    db.prepare(`
      UPDATE reservation_rooms
      SET check_out_date = ?, nights = ?
      WHERE reservation_id = ?
    `).run(splitDate, nights1, resId);

    // Insert second leg for targetRoomNumber
    const targetRoom = db.prepare('SELECT id FROM rooms WHERE property_id = ? AND room_number = ? LIMIT 1').get(propId, String(payload.targetRoomNumber)) as any;
    if (targetRoom) {
      const guest = db.prepare('SELECT booker_guest_id FROM reservations WHERE id = ?').get(resId) as any;
      db.prepare(`
        INSERT INTO reservation_rooms (
          reservation_id, room_id, guest_id, check_in_date, check_out_date, nights, room_rate, adults, children, status
        ) VALUES (?, ?, ?, ?, ?, ?, ?, 1, 0, 'ASSIGNED')
      `).run(resId, targetRoom.id, guest?.booker_guest_id || 1, splitDate, checkOut, nights2, 3000);

      db.prepare(`
        UPDATE reservations SET is_group = 1 WHERE id = ?
      `).run(resId);
    }

    return bookingService.getBookingById(resId, propId);
  },

  /**
   * Void a reservation with audit reason
   */
  voidReservation: async (id: string | number, propertyId: string | number, payload: { reason?: string }): Promise<BookingRecord | null> => {
    const propId = resolvePropertyId(propertyId);
    const existing = await bookingService.getBookingById(id, propId);
    if (!existing) return null;

    db.prepare(`
      UPDATE reservations
      SET status = 'VOIDED', special_requests = COALESCE(special_requests || ' | ', '') || 'Void reason: ' || ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(payload.reason || 'Voided by front desk', existing.id);

    db.prepare(`
      UPDATE reservation_rooms SET status = 'CANCELLED' WHERE reservation_id = ?
    `).run(existing.id);

    if (isPostgresConnected()) {
      try {
        await pgPool.query(`UPDATE reservations SET status = 'VOIDED' WHERE id = $1`, [existing.id]);
        await pgPool.query(`UPDATE reservation_rooms SET status = 'CANCELLED' WHERE reservation_id = $1`, [existing.id]);
      } catch (err: any) {
        console.warn('Postgres void sync warning:', err.message);
      }
    }

    return bookingService.getBookingById(existing.id, propId);
  },

  /**
   * Hold a reservation with hold period
   */
  holdReservation: async (id: string | number, propertyId: string | number, payload: { startDate?: string; endDate?: string; reason?: string }): Promise<BookingRecord | null> => {
    const propId = resolvePropertyId(propertyId);
    const existing = await bookingService.getBookingById(id, propId);
    if (!existing) return null;

    db.prepare(`
      UPDATE reservations
      SET status = 'HOLD', special_requests = COALESCE(special_requests || ' | ', '') || 'Hold reason: ' || ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(payload.reason || 'Reservation placed on hold', existing.id);

    if (isPostgresConnected()) {
      try {
        await pgPool.query(`UPDATE reservations SET status = 'HOLD' WHERE id = $1`, [existing.id]);
      } catch (err: any) {
        console.warn('Postgres hold sync warning:', err.message);
      }
    }

    return bookingService.getBookingById(existing.id, propId);
  },

  /**
   * Unassign Room allocation
   */
  unassignRoom: async (id: string | number, propertyId: string | number, payload: { roomNumber?: string }): Promise<BookingRecord | null> => {
    const propId = resolvePropertyId(propertyId);
    const existing = await bookingService.getBookingById(id, propId);
    if (!existing) return null;

    if (payload.roomNumber) {
      const rm = db.prepare('SELECT id FROM rooms WHERE property_id = ? AND room_number = ? LIMIT 1').get(propId, String(payload.roomNumber)) as any;
      if (rm) {
        db.prepare(`UPDATE reservation_rooms SET status = 'CANCELLED' WHERE reservation_id = ? AND room_id = ?`).run(existing.id, rm.id);
      }
    } else {
      db.prepare(`UPDATE reservation_rooms SET status = 'CANCELLED' WHERE reservation_id = ?`).run(existing.id);
    }

    return bookingService.getBookingById(existing.id, propId);
  },

  /**
   * Ungroup Multi-Room Reservation
   */
  ungroupReservation: async (id: string | number, propertyId: string | number, _payload: any): Promise<BookingRecord | null> => {
    const propId = resolvePropertyId(propertyId);
    const existing = await bookingService.getBookingById(id, propId);
    if (!existing) return null;

    db.prepare(`UPDATE reservations SET is_group = 0 WHERE id = ?`).run(existing.id);
    return bookingService.getBookingById(existing.id, propId);
  },

  /**
   * Change Group Owner / Booker Guest
   */
  changeGroupOwner: async (id: string | number, propertyId: string | number, payload: { newOwner?: string }): Promise<BookingRecord | null> => {
    const propId = resolvePropertyId(propertyId);
    const existing = await bookingService.getBookingById(id, propId);
    if (!existing) return null;

    if (payload.newOwner) {
      const raw = payload.newOwner.replace(/^(Mr|Mrs|Ms|Dr)\.?\s+/i, '').trim();
      const parts = raw.split(' ');
      const fName = parts[0] || 'Valued';
      const lName = parts.slice(1).join(' ') || 'Guest';
      db.prepare(`
        UPDATE guests SET first_name = ?, last_name = ?
        WHERE id = (SELECT booker_guest_id FROM reservations WHERE id = ? LIMIT 1)
      `).run(fName, lName, existing.id);
    }
    return bookingService.getBookingById(existing.id, propId);
  },

  /**
   * Update status of reservation (check-in, check-out, cancel, hold)
   */
  updateBookingStatus: async (id: string | number, propertyId: string | number, status: string): Promise<BookingRecord | null> => {
    const propId = resolvePropertyId(propertyId);
    const dbStatus = STATUS_UI_TO_DB[status] || status.toUpperCase();

    // Update reservation
    db.prepare(`
      UPDATE reservations 
      SET status = ?, updated_at = CURRENT_TIMESTAMP
      WHERE property_id = ? AND (id = ? OR reservation_number = ?)
    `).run(dbStatus, propId, id, String(id));

    // Update reservation_rooms status
    const roomStayStatus = dbStatus === 'IN_HOUSE' ? 'CHECKED_IN' : dbStatus === 'COMPLETED' ? 'CHECKED_OUT' : dbStatus === 'CANCELLED' ? 'CANCELLED' : 'ASSIGNED';
    db.prepare(`
      UPDATE reservation_rooms
      SET status = ?
      WHERE reservation_id = (SELECT id FROM reservations WHERE property_id = ? AND (id = ? OR reservation_number = ?) LIMIT 1)
    `).run(roomStayStatus, propId, id, String(id));

    return bookingService.getBookingById(id, propId);
  },

  /**
   * Delete or void a reservation
   */
  deleteBooking: async (id: string | number, propertyId: string | number): Promise<boolean> => {
    const propId = resolvePropertyId(propertyId);
    db.prepare(`
      UPDATE reservations
      SET status = 'CANCELLED', updated_at = CURRENT_TIMESTAMP
      WHERE property_id = ? AND (id = ? OR reservation_number = ?)
    `).run(propId, id, String(id));
    return true;
  }
};
