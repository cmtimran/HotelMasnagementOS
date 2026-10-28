import { generateMasterReservationNumber, generateGroupCode } from '../database/db.js';
import { pgPool } from '../database/postgres.js';
import { getActiveTenantPool } from '../database/tenantContext.js';
import { normalizePhone } from '../routes/guest.routes.js';

const getPool = () => getActiveTenantPool(pgPool);

export interface BookingRecord {
  id: string | number;
  resNo: string;
  reservationNumber: string;
  groupCode?: string;
  subBookingNumber?: string;
  registrationNumber?: string;
  registeredAt?: string;
  folioNumber?: string;
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
  isConnectingSuite?: boolean;
  specialRequests?: string;
  roomsList?: any[];
  groupRoomsList?: any[];
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
  arrived: 'IN_HOUSE',
  checked_in: 'IN_HOUSE',
  in_house: 'IN_HOUSE',
  'checked-out': 'COMPLETED',
  completed: 'COMPLETED',
  departing: 'IN_HOUSE',
  hold: 'HOLD',
  cancelled: 'CANCELLED',
  voided: 'VOIDED'
};

const resolvePropertyId = (propertyId: string | number | undefined): number => {
  if (typeof propertyId === 'number') return propertyId;
  if (!propertyId || propertyId === 'prop_grand_palace' || propertyId === '1') return 1;
  const num = Number(propertyId);
  return isNaN(num) ? 1 : num;
};

/**
 * Attaches multi-room and grouped reservations into a unified structure
 */
function attachGroupRoomsList(records: BookingRecord[]) {
  const groupCodeMap = new Map<string, any[]>();

  for (const b of records) {
    if (b.groupCode) {
      if (!groupCodeMap.has(b.groupCode)) {
        groupCodeMap.set(b.groupCode, []);
      }
      const gList = groupCodeMap.get(b.groupCode)!;
      if (b.roomsList && b.roomsList.length > 0) {
        b.roomsList.forEach((rm, idx) => {
          gList.push({
            bookingId: b.id,
            reservationNumber: rm.subBookingNumber || `${b.reservationNumber}-${String(idx + 1).padStart(2, '0')}`,
            masterReservationNumber: b.reservationNumber,
            subBookingNumber: rm.subBookingNumber || `${b.reservationNumber}-${String(idx + 1).padStart(2, '0')}`,
            registrationNumber: rm.registrationNumber || b.registrationNumber,
            folioNumber: rm.folioNumber || b.folioNumber,
            roomNumber: rm.roomNumber,
            roomType: rm.roomType || b.roomType,
            ratePlan: b.ratePlan,
            guestName: b.guestName,
            adults: rm.adults || b.adults,
            children: rm.children || b.children,
            status: rm.status || b.status,
            checkIn: rm.checkIn || b.checkIn,
            checkOut: rm.checkOut || b.checkOut,
            isPrimary: gList.length === 0,
            groupCode: b.groupCode
          });
        });
      } else {
        gList.push({
          bookingId: b.id,
          reservationNumber: b.reservationNumber,
          masterReservationNumber: b.reservationNumber,
          subBookingNumber: `${b.reservationNumber}-01`,
          registrationNumber: b.registrationNumber,
          folioNumber: b.folioNumber,
          roomNumber: b.roomNumber,
          roomType: b.roomType,
          ratePlan: b.ratePlan,
          guestName: b.guestName,
          adults: b.adults,
          children: b.children,
          status: b.status,
          checkIn: b.checkIn,
          checkOut: b.checkOut,
          isPrimary: gList.length === 0,
          groupCode: b.groupCode
        });
      }
    }
  }

  for (const b of records) {
    if (b.groupCode && groupCodeMap.has(b.groupCode)) {
      b.groupRoomsList = groupCodeMap.get(b.groupCode);
    } else if (b.roomsList && b.roomsList.length > 1) {
      b.groupRoomsList = b.roomsList.map((rm, idx) => ({
        bookingId: b.id,
        reservationNumber: rm.subBookingNumber || `${b.reservationNumber}-${String(idx + 1).padStart(2, '0')}`,
        masterReservationNumber: b.reservationNumber,
        subBookingNumber: rm.subBookingNumber || `${b.reservationNumber}-${String(idx + 1).padStart(2, '0')}`,
        registrationNumber: rm.registrationNumber || b.registrationNumber,
        folioNumber: rm.folioNumber || b.folioNumber,
        roomNumber: rm.roomNumber,
        roomType: rm.roomType || b.roomType,
        ratePlan: b.ratePlan,
        guestName: b.guestName,
        adults: rm.adults || b.adults,
        children: rm.children || b.children,
        status: rm.status || b.status,
        checkIn: rm.checkIn || b.checkIn,
        checkOut: rm.checkOut || b.checkOut,
        isPrimary: idx === 0,
        groupCode: b.groupCode
      }));
    } else {
      b.groupRoomsList = [{
        bookingId: b.id,
        reservationNumber: b.reservationNumber,
        masterReservationNumber: b.reservationNumber,
        subBookingNumber: `${b.reservationNumber}-01`,
        registrationNumber: b.registrationNumber,
        folioNumber: b.folioNumber,
        roomNumber: b.roomNumber,
        roomType: b.roomType,
        ratePlan: b.ratePlan,
        guestName: b.guestName,
        adults: b.adults,
        children: b.children,
        status: b.status,
        checkIn: b.checkIn,
        checkOut: b.checkOut,
        isPrimary: true,
        groupCode: b.groupCode
      }];
    }
  }
}

export const bookingService = {
  /**
   * Fetch all bookings for a property directly from Cloud PostgreSQL
   */
  getAllBookings: async (propertyId: string | number, status?: string): Promise<BookingRecord[]> => {
    const propId = resolvePropertyId(propertyId);

    const reservationsRes = await getPool().query(`
      SELECT 
        r.id,
        r.property_id,
        r.reservation_number,
        r.group_code,
        r.registration_number,
        r.registration_date,
        r.folio_number,
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

    const roomsRes = await getPool().query(`
      SELECT 
        rr.id,
        rr.reservation_id,
        rr.sub_booking_number,
        rr.registration_number,
        rr.registration_date,
        rr.folio_number,
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

    // Fetch active connecting suites for automatic linking
    const connSuitesRes = await getPool().query(
      `SELECT name, component_rooms FROM connecting_rooms WHERE property_id = $1 AND status = 'Active'`,
      [propId]
    ).catch(() => ({ rows: [] }));
    const activeSuites = connSuitesRes.rows || [];

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
      if (val instanceof Date) {
        const y = val.getFullYear();
        const m = String(val.getMonth() + 1).padStart(2, '0');
        const d = String(val.getDate()).padStart(2, '0');
        return `${y}-${m}-${d}`;
      }
      return String(val).slice(0, 10);
    };

    for (const r of reservationsRes.rows) {
      const rooms = roomsMap.get(r.id) || [];
      const allocatedRoomNumbers = rooms.map(rm => rm.room_number);

      const matchedSuite = activeSuites.find(s => {
        try {
          const comps = typeof s.component_rooms === 'string' ? JSON.parse(s.component_rooms) : s.component_rooms;
          const suiteNums = (comps || []).flatMap((c: any) => c.roomNumbers || []).map(String);
          return suiteNums.length > 1 && suiteNums.every((sn: string) => allocatedRoomNumbers.includes(sn));
        } catch { return false; }
      });

      const isConnSuite = Boolean(
        matchedSuite ||
        r.special_requests?.toLowerCase().includes('connecting suite') ||
        (allocatedRoomNumbers.length > 1 && (
          rooms[0]?.room_type_name?.toLowerCase().includes('connecting') ||
          rooms[0]?.room_type_name?.toLowerCase().includes('interconnecting')
        ))
      );

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

      const resolvedRoomType = matchedSuite ? matchedSuite.name : (
        isConnSuite ? `Interconnecting Suite (${allocatedRoomNumbers.join('-')})` : primaryRoom.room_type_name
      );
      const resolvedRoomNumber = (isConnSuite && allocatedRoomNumbers.length > 1) 
        ? allocatedRoomNumbers.join(' + ') 
        : primaryRoom.room_number;

      const primaryIn = formatDate(primaryRoom.check_in_date);
      const primaryOut = formatDate(primaryRoom.check_out_date);

      let uiStatus = STATUS_DB_TO_UI[r.db_status] || 'confirmed';
      if (uiStatus === 'confirmed' && primaryIn === todayStr) {
        uiStatus = 'arriving';
      } else if (uiStatus === 'in-house' && primaryOut === todayStr) {
        uiStatus = 'departing';
      }

      const guestFullName = `${r.salutation ? r.salutation + ' ' : ''}${r.first_name} ${r.last_name}`.trim();
      const regNo = r.registration_number || (uiStatus === 'in-house' || uiStatus === 'checked-out' ? `REG-${r.reservation_number.replace(/^RES-/, '')}` : undefined);
      const folioNo = r.folio_number || `FOL-${r.reservation_number.replace(/^RES-/, '')}`;

      const nightsCount = Math.max(1, Math.round((new Date(primaryOut).getTime() - new Date(primaryIn).getTime()) / 86400000) || Number(primaryRoom.nights) || 1);

      results.push({
        id: r.id,
        resNo: r.reservation_number,
        reservationNumber: r.reservation_number,
        groupCode: isConnSuite ? undefined : (r.group_code || undefined),
        subBookingNumber: isConnSuite ? r.reservation_number : (primaryRoom.sub_booking_number || (rooms.length > 1 ? `${r.reservation_number}-01` : r.reservation_number)),
        registrationNumber: regNo,
        registeredAt: r.registration_date ? (typeof r.registration_date === 'string' ? r.registration_date : r.registration_date.toISOString()) : undefined,
        folioNumber: folioNo,
        guestName: guestFullName,
        phone: r.phone || '',
        email: r.email || '',
        roomNo: resolvedRoomNumber,
        roomNumber: resolvedRoomNumber,
        allocatedRooms: allocatedRoomNumbers.length > 0 ? allocatedRoomNumbers : [primaryRoom.room_number],
        roomType: resolvedRoomType,
        isConnectingSuite: isConnSuite,
        ratePlan: r.corporate_name || r.source || 'Standard Plan',
        rateAmount: Number(r.total_amount) || 0,
        totalAmount: Number(r.total_amount) || 0,
        paidAmount: Number(r.paid_amount) || 0,
        dueAmount: Number(r.due_amount) || 0,
        arrivalDate: primaryIn,
        departureDate: primaryOut,
        checkIn: primaryIn,
        checkOut: primaryOut,
        nights: nightsCount,
        adults: Number(primaryRoom.adults) || 1,
        children: Number(primaryRoom.children) || 0,
        status: uiStatus,
        propertyId: r.property_id,
        source: r.source || 'Direct',
        channel: r.channel || 'Front Desk',
        vip: r.vip_status || 'None',
        isGroup: isConnSuite ? false : Boolean(r.is_group || r.group_code),
        specialRequests: r.special_requests || '',
        roomsList: rooms.map((rm, idx) => {
          const rIn = formatDate(rm.check_in_date);
          const rOut = formatDate(rm.check_out_date);
          const diffN = Math.round((new Date(rOut).getTime() - new Date(rIn).getTime()) / 86400000);
          const subNo = rm.sub_booking_number || (rooms.length > 1 ? `${r.reservation_number}-${String(idx + 1).padStart(2, '0')}` : `${r.reservation_number}-01`);
          const roomReg = rm.registration_number || (uiStatus === 'in-house' || uiStatus === 'checked-out' ? `REG-${subNo.replace(/^RES-/, '')}` : undefined);
          const roomFolio = rm.folio_number || `FOL-${subNo.replace(/^RES-/, '')}`;
          return {
            id: rm.id,
            subBookingNumber: subNo,
            registrationNumber: roomReg,
            registeredAt: rm.registration_date ? (typeof rm.registration_date === 'string' ? rm.registration_date : rm.registration_date.toISOString()) : undefined,
            folioNumber: roomFolio,
            roomNumber: rm.room_number,
            roomType: rm.room_type_name,
            checkIn: rIn,
            checkOut: rOut,
            checkInDate: rIn,
            checkOutDate: rOut,
            nights: diffN > 0 ? diffN : (Number(rm.nights) || 1),
            rate: Number(rm.room_rate) || 0,
            adults: Number(rm.adults) || 1,
            children: Number(rm.children) || 0,
            status: rm.room_stay_status
          };
        }),
        createdAt: r.created_at ? (typeof r.created_at === 'string' ? r.created_at : r.created_at.toISOString()) : new Date().toISOString()
      });
    }

    attachGroupRoomsList(results);

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
    const all = await bookingService.getAllBookings(propId);
    return all.find(b => String(b.id) === String(id) || b.reservationNumber === String(id)) || null;
  },

  /**
   * Create a new reservation directly inside PostgreSQL relational tables (with Zero-Overbooking SQL Guard)
   */
  createBooking: async (payload: any): Promise<BookingRecord> => {
    const propId = resolvePropertyId(payload.propertyId);

    const checkIn = payload.checkIn || payload.arrivalDate || new Date().toISOString().slice(0, 10);
    const checkOut = payload.checkOut || payload.departureDate || new Date(Date.now() + 86400000 * 2).toISOString().slice(0, 10);
    const nights = Math.max(1, Number(payload.nights) || Math.round((new Date(checkOut).getTime() - new Date(checkIn).getTime()) / (1000 * 3600 * 24)));

    // Rooms list source
    const rawRooms = (payload.roomsList && payload.roomsList.length > 0)
      ? payload.roomsList 
      : (payload.rooms && payload.rooms.length > 0)
        ? payload.rooms
        : (payload.allocatedRooms && payload.allocatedRooms.length > 0) 
          ? payload.allocatedRooms.map((rNum: string) => ({ roomNumber: rNum }))
          : [{ roomNumber: payload.roomNumber || payload.roomNo || '101' }];

    const isConnectingSuite = Boolean(
      payload.isConnectingSuite ||
      (payload.roomType && (
        String(payload.roomType).toLowerCase().includes('connecting') || 
        String(payload.roomType).toLowerCase().includes('interconnecting')
      ))
    );

    // Expand composite room numbers like "101 + 102" or multiple rooms in allocatedRooms
    const expandedRooms: any[] = [];
    if (rawRooms && rawRooms.length > 0) {
      for (const rm of rawRooms) {
        const rawNum = String(rm.roomNumber || rm.number || '').trim();
        if (rawNum.includes('+')) {
          const parts = rawNum.split('+').map((s: string) => s.trim()).filter(Boolean);
          parts.forEach(p => expandedRooms.push({ ...rm, roomNumber: p }));
        } else {
          expandedRooms.push(rm);
        }
      }
    }
    if (expandedRooms.length <= 1 && Array.isArray(payload.allocatedRooms) && payload.allocatedRooms.length > 1) {
      expandedRooms.length = 0;
      payload.allocatedRooms.forEach((p: string) => expandedRooms.push({ roomNumber: String(p).trim() }));
    }
    if (expandedRooms.length === 0) {
      expandedRooms.push({ roomNumber: payload.roomNumber || payload.roomNo || '101' });
    }
    const finalRooms = expandedRooms;

    // Acquire connection from active tenant's pool to execute ACID transaction
    const pool = getPool();
    const client = await pool.connect();
    let reservationNumber = '';

    try {
      await client.query('BEGIN');

      // 0. Strict Database-Level Pessimistic Row Lock & Overlap Check (Prevents Race Conditions)
      const seenRoomsInPayload = new Set<string>();

      for (const rm of finalRooms) {
        const roomNum = String(rm.roomNumber || rm.number || '').trim();
        if (!roomNum) continue;
        if (seenRoomsInPayload.has(roomNum)) {
          throw new Error(`Duplicate room ${roomNum} in reservation request.`);
        }
        seenRoomsInPayload.add(roomNum);

        const roomIn = String(rm.checkIn || rm.checkInDate || checkIn).slice(0, 10);
        const roomOut = String(rm.checkOut || rm.checkOutDate || checkOut).slice(0, 10);

        const conflictCheck = await client.query(`
          SELECT r.room_number, rr.check_in_date, rr.check_out_date, res.reservation_number, g.first_name, g.last_name
          FROM reservation_rooms rr
          JOIN rooms r ON r.id = rr.room_id
          JOIN reservations res ON res.id = rr.reservation_id
          LEFT JOIN guests g ON g.id = res.booker_guest_id
          WHERE r.property_id = $1
            AND r.room_number = $2
            AND res.status NOT IN ('CANCELLED', 'VOIDED', 'COMPLETED')
            AND rr.check_in_date < $4
            AND rr.check_out_date > $3
          FOR UPDATE
        `, [propId, roomNum, roomIn, roomOut]);

        if (conflictCheck.rows.length > 0) {
          const c = conflictCheck.rows[0];
          const guest = `${c.first_name || ''} ${c.last_name || ''}`.trim() || 'another guest';
          throw new Error(`Room ${roomNum} is already booked by ${guest} (${c.reservation_number}) from ${String(c.check_in_date).slice(0, 10)} to ${String(c.check_out_date).slice(0, 10)}!`);
        }
      }

      // 1. Resolve or Create Guest in PostgreSQL `guests` table
      const phone = payload.phone || payload.mobile || '+880 1711-000000';
      const email = payload.email || 'guest@hospitality.com';
      const rawName = (payload.guestName || 'Valued Guest').replace(/^(Mr|Mrs|Ms|Dr|Engr|Prof)\.?\s+/i, '').trim();
      const nameParts = rawName.split(' ');
      const firstName = nameParts[0] || 'Valued';
      const lastName = nameParts.slice(1).join(' ') || 'Guest';
      const salutation = payload.salutation || (payload.guestName?.match(/^(Mr|Mrs|Ms|Dr|Engr|Prof)\.?\s+/i)?.[1]) || 'Mr';
      const vipStatus = payload.vip || payload.vipStatus || 'NONE';

      let guestId: number;
      const pureDigits = phone.replace(/\D/g, '');
      const subscriberSuffix = pureDigits.length >= 8 ? pureDigits.slice(-8) : pureDigits;
      const cleanEmail = email ? email.trim().toLowerCase() : '';

      // Check if explicit guestId is supplied (e.g. from UI profile selection)
      let resolvedExistingGuest: any = null;
      if (payload.guestId && !isNaN(Number(payload.guestId))) {
        const explicitLookup = await client.query('SELECT id, first_name, last_name, phone, email FROM guests WHERE id = $1', [Number(payload.guestId)]);
        if (explicitLookup.rows.length > 0) {
          resolvedExistingGuest = explicitLookup.rows[0];
        }
      }

      if (!resolvedExistingGuest) {
        const guestLookup = await client.query(`
          SELECT id, first_name, last_name, phone, email FROM guests 
          WHERE (
            regexp_replace(phone, '\\D', '', 'g') = $1
            OR ($2 != '' AND length($2) >= 8 AND regexp_replace(phone, '\\D', '', 'g') LIKE '%' || $2)
            OR ($3 != '' AND $3 != 'guest@hospitality.com' AND LOWER(email) = $3)
          )
          ORDER BY id ASC
        `, [pureDigits, subscriberSuffix, cleanEmail]);

        if (guestLookup.rows.length > 0) {
          // Verify name match to prevent cross-contamination when phone is shared or recycled
          const exactNameMatch = guestLookup.rows.find(g => {
            const exFull = `${g.first_name || ''} ${g.last_name || ''}`.trim().toLowerCase();
            const newFull = `${firstName} ${lastName}`.trim().toLowerCase();
            return exFull === newFull || exFull.includes(newFull) || newFull.includes(exFull);
          });

          if (exactNameMatch) {
            resolvedExistingGuest = exactNameMatch;
          } else if (payload.updateExistingGuestName) {
            resolvedExistingGuest = guestLookup.rows[0];
            await client.query('UPDATE guests SET salutation = $1, first_name = $2, last_name = $3 WHERE id = $4', [salutation, firstName, lastName, resolvedExistingGuest.id]);
          }
        }
      }

      if (resolvedExistingGuest) {
        guestId = resolvedExistingGuest.id;
        if (cleanEmail && !cleanEmail.includes('hospitality.com')) {
          await client.query('UPDATE guests SET email = COALESCE(email, $1) WHERE id = $2', [cleanEmail, guestId]).catch(() => {});
        }
      } else {
        const gIns = await client.query(`
          INSERT INTO guests (organization_id, salutation, first_name, last_name, email, phone, vip_status)
          VALUES (1, $1, $2, $3, $4, $5, $6)
          RETURNING id
        `, [salutation, firstName, lastName, email, phone, vipStatus === 'None' ? 'NONE' : vipStatus]);
        guestId = gIns.rows[0].id;
      }

      // 2. Prepare Reservation Master
      reservationNumber = (payload.reservationNumber && !payload.reservationNumber.includes('NaN')) 
        ? payload.reservationNumber 
        : (payload.resNo || await generateMasterReservationNumber());
      const statusDb = STATUS_UI_TO_DB[payload.status] || 'CONFIRMED';
      const totalAmount = Number(payload.totalAmount || payload.rateAmount || 0);
      const paidAmount = Number(payload.paidAmount || 0);
      const dueAmount = totalAmount - paidAmount;
      const totalTaxAmount = Number(payload.totalTaxAmount || payload.vatAmount || 0);
      const baseAmount = Number(payload.baseAmount) || Math.max(0, totalAmount - totalTaxAmount);
      const isGroup = !isConnectingSuite && Boolean(payload.isGroup || finalRooms.length > 1 || (payload.roomsCount && Number(payload.roomsCount) > 1));
      const groupCode = isGroup ? (payload.groupCode || await generateGroupCode()) : null;
      const regNo = statusDb === 'IN_HOUSE' ? (payload.registrationNumber || `REG-${reservationNumber.replace(/^RES-/, '')}`) : (payload.registrationNumber || null);
      const folioNo = payload.folioNumber || `FOL-${reservationNumber.replace(/^RES-/, '')}`;

      const resInsert = await client.query(`
        INSERT INTO reservations (
          property_id, reservation_number, group_code, registration_number, registration_date, folio_number,
          booker_guest_id, source, channel, agent,
          is_group, status, total_amount, paid_amount, due_amount, special_requests
        ) VALUES ($1, $2, $3, $4, CASE WHEN $4 IS NOT NULL THEN CURRENT_TIMESTAMP ELSE NULL END, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
        RETURNING id
      `, [
        propId,
        reservationNumber,
        groupCode,
        regNo,
        folioNo,
        guestId,
        payload.source || 'Direct',
        payload.channel || 'Front Desk',
        payload.agent || null,
        isGroup,
        statusDb,
        totalAmount,
        paidAmount,
        dueAmount,
        payload.specialRequests || payload.special_requests || null
      ]);

      const reservationId = resInsert.rows[0].id;

      // 3. Allocate Rooms in `reservation_rooms`
      const roomRatePerRoom = finalRooms.length > 0 ? totalAmount / finalRooms.length : totalAmount;

      for (let i = 0; i < finalRooms.length; i++) {
        const rm = finalRooms[i];
        const roomNum = String(rm.roomNumber || rm.number || '101');
        
        let roomId: number;
        const roomLookup = await client.query('SELECT id FROM rooms WHERE property_id = $1 AND room_number = $2 LIMIT 1', [propId, roomNum]);
        if (roomLookup.rows.length > 0) {
          roomId = roomLookup.rows[0].id;
        } else {
          const fallbackRoom = await client.query('SELECT id FROM rooms WHERE property_id = $1 LIMIT 1', [propId]);
          roomId = fallbackRoom.rows[0]?.id || 1;
        }

        const roomIn = rm.checkIn || rm.checkInDate || checkIn;
        const roomOut = rm.checkOut || rm.checkOutDate || checkOut;
        const roomNights = rm.nights || nights;
        const roomRate = rm.rate || roomRatePerRoom;
        const subBookingNum = (!isConnectingSuite && (finalRooms.length > 1 || payload.subBookingNumber))
          ? (rm.subBookingNumber || `${reservationNumber}-${String(i + 1).padStart(2, '0')}`)
          : (rm.subBookingNumber || reservationNumber);

        const roomRegNo = statusDb === 'IN_HOUSE'
          ? (rm.registrationNumber || `REG-${subBookingNum.replace(/^RES-/, '')}`)
          : (rm.registrationNumber || null);
        const roomFolioNo = rm.folioNumber || `FOL-${subBookingNum.replace(/^RES-/, '')}`;

        await client.query(`
          INSERT INTO reservation_rooms (
            reservation_id, sub_booking_number, registration_number, registration_date, folio_number,
            room_id, guest_id, check_in_date, check_out_date,
            nights, room_rate, adults, children, status
          ) VALUES ($1, $2, $3, CASE WHEN $3 IS NOT NULL THEN CURRENT_TIMESTAMP ELSE NULL END, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
        `, [
          reservationId,
          subBookingNum,
          roomRegNo,
          roomFolioNo,
          roomId,
          guestId,
          roomIn,
          roomOut,
          roomNights,
          roomRate,
          Number(payload.adults) || 1,
          Number(payload.children) || 0,
          statusDb === 'IN_HOUSE' ? 'CHECKED_IN' : 'ASSIGNED'
        ]);
      }

      // 4. Create Folio in `folios`
      const folioInsert = await client.query(`
        INSERT INTO folios (reservation_id, guest_id, folio_number, folio_type, status, balance)
        VALUES ($1, $2, $3, 'GUEST', $4, $5)
        RETURNING id
      `, [
        reservationId,
        guestId,
        folioNo,
        paidAmount >= totalAmount ? 'SETTLED' : 'OPEN',
        dueAmount
      ]);

      const folioId = folioInsert.rows[0].id;

      // 4b. Record initial Room Tariff and Tax charges into `folio_charges` (USALI Accounting)
      try {
        const taxPolicyDesc = payload.taxConfigCode ? ` [${payload.taxConfigCode}]` : '';
        await client.query(`
          INSERT INTO folio_charges (
            folio_id, charge_code, description, amount, tax_amount, total_amount, charge_date
          ) VALUES ($1, 'ROOM_TARIFF', $2, $3, $4, $5, $6)
        `, [
          folioId,
          `Room Accommodation Tariff (${nights} night${nights > 1 ? 's' : ''})${taxPolicyDesc}`,
          baseAmount,
          totalTaxAmount,
          totalAmount,
          checkIn
        ]);
      } catch (chargeErr) {
        console.warn('Failed to insert initial folio charges', chargeErr);
      }

      // 5. If initial payment provided, record in `payments`
      if (paidAmount > 0) {
        await client.query(`
          INSERT INTO payments (folio_id, property_id, payment_number, payment_method, amount, reference_code)
          VALUES ($1, $2, $3, 'CASH', $4, 'FRONT_DESK_DEPOSIT')
        `, [
          folioId,
          propId,
          `PAY-${reservationNumber}`,
          paidAmount
        ]);
      }

      await client.query('COMMIT');
    } catch (txErr) {
      await client.query('ROLLBACK');
      throw txErr;
    } finally {
      client.release();
    }

    const createdBooking = await bookingService.getBookingById(reservationNumber, propId);
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

      await getPool().query(`
        UPDATE guests
        SET salutation = $1, first_name = $2, last_name = $3, email = $4, phone = $5, vip_status = $6, updated_at = CURRENT_TIMESTAMP
        WHERE id = (SELECT booker_guest_id FROM reservations WHERE id = $7 LIMIT 1)
      `, [salutation, firstName, lastName, email, phone, vip === 'None' ? 'NONE' : vip, resId]);
    }

    // 2. Update Reservation Master (Amounts, Status, Special Requests)
    const newTotal = payload.totalAmount !== undefined ? Number(payload.totalAmount) : existing.totalAmount;
    const newPaid = payload.paidAmount !== undefined ? Number(payload.paidAmount) : existing.paidAmount;
    const newDue = payload.dueAmount !== undefined ? Number(payload.dueAmount) : Math.max(0, newTotal - newPaid);
    const statusDb = payload.status ? (STATUS_UI_TO_DB[payload.status] || payload.status.toUpperCase()) : undefined;

    if (statusDb) {
      await getPool().query(`
        UPDATE reservations
        SET total_amount = $1, paid_amount = $2, due_amount = $3, status = $4, special_requests = COALESCE($5, special_requests), updated_at = CURRENT_TIMESTAMP
        WHERE id = $6
      `, [newTotal, newPaid, newDue, statusDb, payload.specialRequests ?? null, resId]);
    } else {
      await getPool().query(`
        UPDATE reservations
        SET total_amount = $1, paid_amount = $2, due_amount = $3, special_requests = COALESCE($4, special_requests), updated_at = CURRENT_TIMESTAMP
        WHERE id = $5
      `, [newTotal, newPaid, newDue, payload.specialRequests ?? null, resId]);
    }

    // Update Folio balance
    await getPool().query(`
      UPDATE folios
      SET balance = $1, status = CASE WHEN $1 <= 0 THEN 'SETTLED' ELSE 'OPEN' END
      WHERE reservation_id = $2
    `, [newDue, resId]);

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

        const roomRes = await getPool().query('SELECT id FROM rooms WHERE property_id = $1 AND room_number = $2 LIMIT 1', [propId, String(rNum)]);
        if (roomRes.rows.length > 0) {
          const physId = roomRes.rows[0].id;
          await getPool().query(`
            UPDATE reservation_rooms
            SET room_id = $1, check_in_date = $2, check_out_date = $3, nights = $4, room_rate = CASE WHEN $5 > 0 THEN $5 ELSE room_rate END
            WHERE reservation_id = $6 AND (room_id = $1 OR id = $7)
          `, [physId, rIn, rOut, rNights, rRate, resId, r.id || 0]);
        }
      }
    } else {
      const targetRoomNum = payload.roomNumber || payload.roomNo || existing.roomNumber;
      const roomRes = await getPool().query('SELECT id FROM rooms WHERE property_id = $1 AND room_number = $2 LIMIT 1', [propId, String(targetRoomNum)]);
      if (roomRes.rows.length > 0) {
        await getPool().query(`
          UPDATE reservation_rooms
          SET room_id = $1, check_in_date = $2, check_out_date = $3, nights = $4
          WHERE reservation_id = $5
        `, [roomRes.rows[0].id, newCheckIn, newCheckOut, newNights, resId]);
      } else {
        await getPool().query(`
          UPDATE reservation_rooms
          SET check_in_date = $1, check_out_date = $2, nights = $3
          WHERE reservation_id = $4
        `, [newCheckIn, newCheckOut, newNights, resId]);
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

    const targetRoomNo = String(roomNumber || existing.roomNumber);
    const targetSubRoom = existing.roomsList?.find((r: any) => String(r.roomNumber) === targetRoomNo);
    const checkInDate = targetSubRoom?.checkInDate || targetSubRoom?.checkIn || existing.checkIn;

    // Derive canonical departure date from checkInDate + newNights if needed
    const inDateObj = new Date(checkInDate);
    const derivedDepObj = new Date(inDateObj);
    derivedDepObj.setDate(derivedDepObj.getDate() + Math.max(1, Number(newNights) || 1));
    const canonicalDeparture = newDeparture && newDeparture > checkInDate ? newDeparture : derivedDepObj.toISOString().slice(0, 10);
    const canonicalNights = Math.max(1, Math.round((new Date(canonicalDeparture).getTime() - inDateObj.getTime()) / 86400000));

    // Strict Overlap / Collision Check across all active bookings
    const activeBookings = await bookingService.getAllBookings(propId);
    for (const b of activeBookings) {
      if (String(b.id) === String(resId) || b.reservationNumber === existing.reservationNumber) continue;
      const bStatus = String(b.status || '').toLowerCase();
      if (bStatus === 'cancelled' || bStatus === 'voided' || bStatus === 'checked-out' || bStatus === 'completed') continue;

      if (b.roomsList && Array.isArray(b.roomsList) && b.roomsList.length > 0) {
        for (const sub of b.roomsList) {
          if (String(sub.roomNumber) === targetRoomNo) {
            const sIn = String(sub.checkInDate || sub.checkIn || b.checkIn).slice(0, 10);
            const sOut = String(sub.checkOutDate || sub.checkOut || b.checkOut).slice(0, 10);
            if (sIn < canonicalDeparture && sOut > checkInDate) {
              throw new Error(`Room ${targetRoomNo} is already booked by ${b.guestName} (${b.reservationNumber}: ${sIn} to ${sOut})`);
            }
          }
        }
      } else if (String(b.roomNumber) === targetRoomNo) {
        const bIn = String(b.checkIn).slice(0, 10);
        const bOut = String(b.checkOut).slice(0, 10);
        if (bIn < canonicalDeparture && bOut > checkInDate) {
          throw new Error(`Room ${targetRoomNo} is already booked by ${b.guestName} (${b.reservationNumber}: ${bIn} to ${bOut})`);
        }
      }
    }

    const roomRes = await getPool().query('SELECT id FROM rooms WHERE property_id = $1 AND room_number = $2 LIMIT 1', [propId, targetRoomNo]);
    if (roomRes.rows.length > 0) {
      await getPool().query(`
        UPDATE reservation_rooms
        SET check_out_date = $1, nights = $2
        WHERE reservation_id = $3 AND room_id = $4
      `, [canonicalDeparture, canonicalNights, resId, roomRes.rows[0].id]);
    } else {
      await getPool().query(`
        UPDATE reservation_rooms
        SET check_out_date = $1, nights = $2
        WHERE reservation_id = $3
      `, [canonicalDeparture, canonicalNights, resId]);
    }

    // 2. Update amounts if provided
    if (newTotalAmount !== undefined) {
      const newTotal = Number(newTotalAmount);
      const paid = Number(existing.paidAmount || 0);
      const due = newDueAmount !== undefined ? Number(newDueAmount) : Math.max(0, newTotal - paid);

      await getPool().query(`
        UPDATE reservations
        SET total_amount = $1, due_amount = $2, updated_at = CURRENT_TIMESTAMP
        WHERE id = $3
      `, [newTotal, due, resId]);

      await getPool().query(`
        UPDATE folios
        SET balance = $1, status = CASE WHEN $1 <= 0 THEN 'SETTLED' ELSE 'OPEN' END
        WHERE reservation_id = $2
      `, [due, resId]);
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

    const targetRoomRes = await getPool().query('SELECT id FROM rooms WHERE property_id = $1 AND room_number = $2 LIMIT 1', [propId, String(newRoomNumber)]);
    if (targetRoomRes.rows.length === 0) {
      throw new Error(`Target room ${newRoomNumber} not found for property ${propId}`);
    }
    const targetRoomId = targetRoomRes.rows[0].id;

    const effFrom = newFromDate || existing.checkIn;
    const effTo = newToDate || existing.checkOut;

    // Strict Overlap / Collision Check on targetRoom before moving
    const conflictRes = await getPool().query(`
      SELECT r.reservation_number, rr.check_in_date, rr.check_out_date
      FROM reservation_rooms rr
      JOIN reservations r ON r.id = rr.reservation_id
      WHERE rr.room_id = $1
        AND rr.reservation_id != $2
        AND r.status NOT IN ('CANCELLED', 'VOIDED', 'COMPLETED')
        AND rr.check_in_date < $3
        AND rr.check_out_date > $4
      LIMIT 1
    `, [targetRoomId, resId, effTo, effFrom]);

    if (conflictRes.rows.length > 0) {
      const c = conflictRes.rows[0];
      throw new Error(`Target Room ${newRoomNumber} is already booked (${c.reservation_number}: ${c.check_in_date} to ${c.check_out_date})`);
    }

    if (oldRoomNumber) {
      const oldRoomRes = await getPool().query('SELECT id FROM rooms WHERE property_id = $1 AND room_number = $2 LIMIT 1', [propId, String(oldRoomNumber)]);
      if (oldRoomRes.rows.length > 0) {
        await getPool().query(`
          UPDATE reservation_rooms
          SET room_id = $1, 
              check_in_date = COALESCE($2, check_in_date),
              check_out_date = COALESCE($3, check_out_date)
          WHERE reservation_id = $4 AND room_id = $5
        `, [targetRoomId, newFromDate || null, newToDate || null, resId, oldRoomRes.rows[0].id]);
      }
    } else {
      await getPool().query(`
        UPDATE reservation_rooms
        SET room_id = $1, 
            check_in_date = COALESCE($2, check_in_date),
            check_out_date = COALESCE($3, check_out_date)
        WHERE reservation_id = $4
      `, [targetRoomId, newFromDate || null, newToDate || null, resId]);
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

    await getPool().query(`
      UPDATE reservations
      SET paid_amount = $1, due_amount = $2, updated_at = CURRENT_TIMESTAMP
      WHERE id = $3
    `, [newPaid, newDue, resId]);

    // Update Folio balance
    await getPool().query(`
      UPDATE folios
      SET balance = $1, status = CASE WHEN $1 <= 0 THEN 'SETTLED' ELSE 'OPEN' END
      WHERE reservation_id = $2
    `, [newDue, resId]);

    // Record Payment
    const folioRes = await getPool().query('SELECT id FROM folios WHERE reservation_id = $1 LIMIT 1', [resId]);
    const folioId = folioRes.rows[0]?.id || 1;
    const paymentMethod = (payload.paymentMethod || 'CASH').toUpperCase();
    const paymentNumber = `PAY-${Date.now()}`;

    try {
      await getPool().query(`
        INSERT INTO payments (folio_id, property_id, payment_number, payment_method, amount, reference_code)
        VALUES ($1, $2, $3, $4, $5, $6)
      `, [folioId, propId, paymentNumber, paymentMethod, amount, payload.remarks || 'FRONT_DESK_PAYMENT']);
    } catch (payErr) {
      console.warn('Payment insert warning:', payErr);
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
    await getPool().query(`
      UPDATE reservation_rooms
      SET check_out_date = $1, nights = $2
      WHERE reservation_id = $3
    `, [splitDate, nights1, resId]);

    // Insert second leg for targetRoomNumber
    const targetRoomRes = await getPool().query('SELECT id FROM rooms WHERE property_id = $1 AND room_number = $2 LIMIT 1', [propId, String(payload.targetRoomNumber)]);
    if (targetRoomRes.rows.length > 0) {
      const guestRes = await getPool().query('SELECT booker_guest_id FROM reservations WHERE id = $1', [resId]);
      await getPool().query(`
        INSERT INTO reservation_rooms (
          reservation_id, room_id, guest_id, check_in_date, check_out_date, nights, room_rate, adults, children, status
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, 1, 0, 'ASSIGNED')
      `, [resId, targetRoomRes.rows[0].id, guestRes.rows[0]?.booker_guest_id || 1, splitDate, checkOut, nights2, 3000]);

      await getPool().query('UPDATE reservations SET is_group = true WHERE id = $1', [resId]);
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

    await getPool().query(`
      UPDATE reservations
      SET status = 'VOIDED', special_requests = COALESCE(special_requests || ' | ', '') || 'Void reason: ' || $1, updated_at = CURRENT_TIMESTAMP
      WHERE id = $2
    `, [payload.reason || 'Voided by front desk', existing.id]);

    await getPool().query(`UPDATE reservation_rooms SET status = 'CANCELLED' WHERE reservation_id = $1`, [existing.id]);

    return bookingService.getBookingById(existing.id, propId);
  },

  /**
   * Hold a reservation with hold period
   */
  holdReservation: async (id: string | number, propertyId: string | number, payload: { startDate?: string; endDate?: string; reason?: string }): Promise<BookingRecord | null> => {
    const propId = resolvePropertyId(propertyId);
    const existing = await bookingService.getBookingById(id, propId);
    if (!existing) return null;

    await getPool().query(`
      UPDATE reservations
      SET status = 'HOLD', special_requests = COALESCE(special_requests || ' | ', '') || 'Hold reason: ' || $1, updated_at = CURRENT_TIMESTAMP
      WHERE id = $2
    `, [payload.reason || 'Reservation placed on hold', existing.id]);

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
      const rmRes = await getPool().query('SELECT id FROM rooms WHERE property_id = $1 AND room_number = $2 LIMIT 1', [propId, String(payload.roomNumber)]);
      if (rmRes.rows.length > 0) {
        await getPool().query(`UPDATE reservation_rooms SET status = 'CANCELLED' WHERE reservation_id = $1 AND room_id = $2`, [existing.id, rmRes.rows[0].id]);
      }
    } else {
      await getPool().query(`UPDATE reservation_rooms SET status = 'CANCELLED' WHERE reservation_id = $1`, [existing.id]);
    }

    return bookingService.getBookingById(existing.id, propId);
  },

  /**
   * Link two reservations into a shared group WITHOUT renumbering either confirmation code
   */
  linkBookingsToGroup: async (targetReservationNumber: string, reservationToLinkNumber: string, propertyId: string | number): Promise<{ success: boolean; groupCode: string; message: string }> => {
    const propId = resolvePropertyId(propertyId);
    const target = await bookingService.getBookingById(targetReservationNumber, propId);
    const toLink = await bookingService.getBookingById(reservationToLinkNumber, propId);

    if (!target) throw new Error(`Target reservation ${targetReservationNumber} not found.`);
    if (!toLink) throw new Error(`Reservation to link ${reservationToLinkNumber} not found.`);

    const groupCode = target.groupCode || toLink.groupCode || await generateGroupCode();

    await getPool().query(`
      UPDATE reservations 
      SET group_code = $1, is_group = true, updated_at = CURRENT_TIMESTAMP
      WHERE property_id = $2 AND reservation_number IN ($3, $4)
    `, [groupCode, propId, target.reservationNumber, toLink.reservationNumber]);

    return {
      success: true,
      groupCode,
      message: `Reservation ${reservationToLinkNumber} successfully linked to group ${groupCode} with ${targetReservationNumber} without renumbering.`
    };
  },

  /**
   * Unlink a reservation from its group WITHOUT altering its confirmation number
   */
  unlinkBookingFromGroup: async (reservationNumber: string, propertyId: string | number): Promise<BookingRecord | null> => {
    const propId = resolvePropertyId(propertyId);
    const existing = await bookingService.getBookingById(reservationNumber, propId);
    if (!existing) return null;

    await getPool().query(`
      UPDATE reservations 
      SET group_code = NULL, is_group = false, updated_at = CURRENT_TIMESTAMP
      WHERE property_id = $1 AND reservation_number = $2
    `, [propId, existing.reservationNumber]);

    return bookingService.getBookingById(existing.reservationNumber, propId);
  },

  /**
   * Ungroup Multi-Room Reservation
   */
  ungroupReservation: async (id: string | number, propertyId: string | number, _payload: any): Promise<BookingRecord | null> => {
    const propId = resolvePropertyId(propertyId);
    const existing = await bookingService.getBookingById(id, propId);
    if (!existing) return null;

    return bookingService.unlinkBookingFromGroup(existing.reservationNumber, propId);
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
      await getPool().query(`
        UPDATE guests SET first_name = $1, last_name = $2
        WHERE id = (SELECT booker_guest_id FROM reservations WHERE id = $3 LIMIT 1)
      `, [fName, lName, existing.id]);
    }
    return bookingService.getBookingById(existing.id, propId);
  },

  /**
   * Update status of reservation (check-in, check-out, cancel, hold)
   */
  updateBookingStatus: async (id: string | number, propertyId: string | number, status: string): Promise<BookingRecord | null> => {
    const propId = resolvePropertyId(propertyId);
    const normalizedKey = (status || '').toLowerCase().replace(/_/g, '-');
    const dbStatus = STATUS_UI_TO_DB[normalizedKey] || status.toUpperCase().replace(/-/g, '_');
    const roomStayStatus = dbStatus === 'IN_HOUSE' ? 'CHECKED_IN' : dbStatus === 'COMPLETED' ? 'CHECKED_OUT' : dbStatus === 'CANCELLED' ? 'CANCELLED' : 'ASSIGNED';

    const existing = await bookingService.getBookingById(id, propId);
    const resNum = existing?.reservationNumber || String(id);
    let autoRegNum: string | null = existing?.registrationNumber || null;
    let autoFolioNum: string | null = existing?.folioNumber || null;

    if (dbStatus === 'IN_HOUSE') {
      if (!autoRegNum) {
        autoRegNum = `REG-${resNum.replace(/^RES-/, '')}`;
      }
      if (!autoFolioNum) {
        autoFolioNum = `FOL-${resNum.replace(/^RES-/, '')}`;
      }
    }

    const numericId = isNaN(Number(id)) ? -1 : Number(id);

    if (dbStatus === 'IN_HOUSE') {
      await getPool().query(`
        UPDATE reservations 
        SET status = $1,
            registration_number = COALESCE(registration_number, $2),
            registration_date = COALESCE(registration_date, CURRENT_TIMESTAMP),
            folio_number = COALESCE(folio_number, $3),
            updated_at = CURRENT_TIMESTAMP
        WHERE property_id = $4 AND (id = $5 OR reservation_number = $6)
      `, [dbStatus, autoRegNum, autoFolioNum, propId, numericId, String(id)]);

      if (existing) {
        const pgRooms = await getPool().query('SELECT id, sub_booking_number, registration_number, folio_number FROM reservation_rooms WHERE reservation_id = $1 ORDER BY id ASC', [existing.id]);
        for (let i = 0; i < pgRooms.rows.length; i++) {
          const rRow = pgRooms.rows[i];
          const subNo = rRow.sub_booking_number || (pgRooms.rows.length > 1 ? `${resNum}-${String(i + 1).padStart(2, '0')}` : `${resNum}-01`);
          const regNo = rRow.registration_number || `REG-${subNo.replace(/^RES-/, '')}`;
          const folNo = rRow.folio_number || `FOL-${subNo.replace(/^RES-/, '')}`;
          await getPool().query(`
            UPDATE reservation_rooms
            SET status = 'CHECKED_IN',
                sub_booking_number = COALESCE(sub_booking_number, $1),
                registration_number = COALESCE(registration_number, $2),
                registration_date = COALESCE(registration_date, CURRENT_TIMESTAMP),
                folio_number = COALESCE(folio_number, $3)
            WHERE id = $4
          `, [subNo, regNo, folNo, rRow.id]);
        }

        // Ensure open folio exists in folios table
        try {
          const folioRow = await getPool().query('SELECT id FROM folios WHERE reservation_id = $1 LIMIT 1', [existing.id]);
          if (folioRow.rows.length === 0) {
            await getPool().query(`
              INSERT INTO folios (reservation_id, guest_id, folio_number, folio_type, status, balance)
              VALUES ($1, 1, $2, 'GUEST', 'OPEN', $3)
            `, [existing.id, autoFolioNum, existing.dueAmount || 0]);
          }
        } catch (folErr) {
          console.warn('Folio auto-create check notice:', folErr);
        }
      }
    } else {
      await getPool().query(`
        UPDATE reservations 
        SET status = $1, updated_at = CURRENT_TIMESTAMP
        WHERE property_id = $2 AND (id = $3 OR reservation_number = $4)
      `, [dbStatus, propId, numericId, String(id)]);

      await getPool().query(`
        UPDATE reservation_rooms
        SET status = $1
        WHERE reservation_id IN (SELECT id FROM reservations WHERE property_id = $2 AND (id = $3 OR reservation_number = $4))
      `, [roomStayStatus, propId, numericId, String(id)]);

      if (dbStatus === 'CANCELLED' || dbStatus === 'VOIDED') {
        await getPool().query(`
          UPDATE folios 
          SET status = 'CLOSED', balance = 0.00, updated_at = CURRENT_TIMESTAMP
          WHERE reservation_id IN (SELECT id FROM reservations WHERE property_id = $1 AND (id = $2 OR reservation_number = $3))
        `, [propId, numericId, String(id)]).catch(() => {});
        await getPool().query(`
          UPDATE folio_charges 
          SET is_voided = true, void_reason = 'Reservation Cancelled'
          WHERE folio_id IN (SELECT id FROM folios WHERE reservation_id IN (SELECT id FROM reservations WHERE property_id = $1 AND (id = $2 OR reservation_number = $3)))
        `, [propId, numericId, String(id)]).catch(() => {});
      }
    }

    return bookingService.getBookingById(id, propId);
  },

  /**
   * Delete or void a reservation
   */
  deleteBooking: async (id: string | number, propertyId: string | number): Promise<boolean> => {
    const propId = resolvePropertyId(propertyId);
    const targetId = isNaN(Number(id)) ? -1 : Number(id);
    await getPool().query(`
      UPDATE reservations
      SET status = 'CANCELLED', updated_at = CURRENT_TIMESTAMP
      WHERE property_id = $1 AND (id = $2 OR reservation_number = $3)
    `, [propId, targetId, String(id)]);

    await getPool().query(`
      UPDATE folios 
      SET status = 'CLOSED', balance = 0.00, updated_at = CURRENT_TIMESTAMP
      WHERE reservation_id IN (SELECT id FROM reservations WHERE property_id = $1 AND (id = $2 OR reservation_number = $3))
    `, [propId, targetId, String(id)]).catch(() => {});

    await getPool().query(`
      UPDATE folio_charges 
      SET is_voided = true, void_reason = 'Reservation Cancelled'
      WHERE folio_id IN (SELECT id FROM folios WHERE reservation_id IN (SELECT id FROM reservations WHERE property_id = $1 AND (id = $2 OR reservation_number = $3)))
    `, [propId, targetId, String(id)]).catch(() => {});

    return true;
  },

  /**
   * Empty all reservations and reset inventory completely (Vacant & Clean)
   */
  resetAllBookingsAndInventory: async (propertyId: string | number): Promise<boolean> => {
    const propId = resolvePropertyId(propertyId);
    try {
      await getPool().query('DELETE FROM folio_charges');
      await getPool().query('DELETE FROM payments');
      await getPool().query('DELETE FROM folios');
      await getPool().query('DELETE FROM reservation_rooms');
      await getPool().query('DELETE FROM reservations WHERE property_id = $1', [propId]);
      await getPool().query('DELETE FROM daily_sequences');
      await getPool().query("UPDATE rooms SET status = 'ACTIVE', housekeeping_status = 'CLEAN', remarks = NULL WHERE property_id = $1", [propId]);
      await getPool().query("UPDATE rooms SET room_type_id = 5 WHERE room_number IN ('105', '106', '205', '302', '405')");
      console.log('✅ Successfully cleared reservations and reset inventory in PostgreSQL / TiDB');
      return true;
    } catch (err: any) {
      console.warn('Postgres reset warning:', err.message);
      return false;
    }
  }
};
