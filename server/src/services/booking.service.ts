import { db } from '../database/db.js';

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
   * Fetch all bookings for a property directly from SQLite database
   */
  getAllBookings: async (propertyId: string | number, status?: string): Promise<BookingRecord[]> => {
    const propId = resolvePropertyId(propertyId);

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
