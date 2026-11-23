import { Router, Request, Response } from 'express';
import { pgPool } from '../database/postgres.js';
import { bookingService } from '../services/booking.service.js';
import { broadcastServerEvent } from './realtime.routes.js';
import { NotificationService } from '../services/notification.service.js';

const router = Router();

function getPropertyId(req: Request): number {
    return parseInt(
        (req.headers['x-property-id'] as string) || 
        (req.query.propertyId as string) || 
        (req.body.propertyId as string) || 
        '1',
        10
    );
}

/**
 * GET /api/booking-engine/property-info
 * Public metadata for hotel header, contact, policies
 */
router.get('/property-info', async (req: Request, res: Response) => {
    try {
        const propertyId = getPropertyId(req);
        const propRes = await pgPool.query(`
            SELECT id, name, code, address, city, country, phone, email, currency as base_currency, star_rating
            FROM properties
            WHERE id = $1 LIMIT 1;
        `, [propertyId]);

        const prop = propRes.rows[0] || {
            id: 1,
            name: 'Grand Palace Hotel & Resort',
            code: 'GPHR',
            address: 'Plot 14, Diplomatic Enclave, Gulshan-2',
            city: 'Dhaka',
            country: 'Bangladesh',
            phone: '+880 2 988-5500',
            email: 'reservations@grandpalacedhaka.com',
            base_currency: 'BDT',
            star_rating: 5
        };

        res.json({
            success: true,
            data: {
                ...prop,
                checkInTime: '14:00',
                checkOutTime: '12:00',
                cancellationPolicy: 'Free cancellation up to 48 hours prior to arrival',
                taxes: { vat: 15, serviceCharge: 10 }
            }
        });
    } catch (err: any) {
        console.error('Error in /property-info:', err);
        res.status(500).json({ success: false, error: err.message || 'Failed to fetch property details' });
    }
});

/**
 * GET /api/booking-engine/room-types
 * Returns published room types, occupancies, pricing, and amenities
 */
router.get('/room-types', async (req: Request, res: Response) => {
    try {
        const propertyId = getPropertyId(req);
        const result = await pgPool.query(`
            SELECT id, name, code, base_rate, base_occupancy, max_adults, max_children, 
                   bed_type, view_type, description, amenities, photos
            FROM room_types
            WHERE property_id = $1
            ORDER BY base_rate ASC;
        `, [propertyId]);

        // Rich fallback room types if database table has fewer than 2 rows
        let rooms = result.rows;
        if (rooms.length === 0) {
            rooms = [
                {
                    id: 1,
                    name: 'Deluxe City View King',
                    code: 'DELU',
                    base_rate: '12500.00',
                    base_occupancy: 2,
                    max_adults: 2,
                    max_children: 1,
                    bed_type: 'King Bed',
                    view_type: 'City View',
                    description: 'Elegantly appointed room featuring Italian marble bath, high-speed Wi-Fi, workspace, and floor-to-ceiling city views.',
                    amenities: 'King Bed, Free High-Speed WiFi, 55" Smart TV, Rain Shower, Coffee Maker, Luxury Toiletries, Safe Locker',
                    photos: ''
                },
                {
                    id: 2,
                    name: 'Superior Ocean & Pool Suite',
                    code: 'SUPK',
                    base_rate: '18500.00',
                    base_occupancy: 2,
                    max_adults: 3,
                    max_children: 2,
                    bed_type: 'Super King',
                    view_type: 'Pool & Garden View',
                    description: 'Spacious suite with dedicated lounge area, private balcony, walk-in closet, and deep soaking bathtub.',
                    amenities: 'Super King Bed, Balcony, Bathtub, Living Lounge, Espresso Machine, Mini Bar, 24/7 Room Service, Bathrobes',
                    photos: ''
                },
                {
                    id: 3,
                    name: 'Presidential Diplomatic Suite',
                    code: 'PRES',
                    base_rate: '45000.00',
                    base_occupancy: 4,
                    max_adults: 4,
                    max_children: 2,
                    bed_type: '2 King Beds',
                    view_type: 'Panoramic View',
                    description: 'Ultimate 5-star luxury with master bedroom, private dining boardroom, personal butler service, and jacuzzi.',
                    amenities: 'Master Jacuzzi, Private Dining Table, Butler Pantry, Executive Lounge Access, Airport Limousine, Premium Bar',
                    photos: ''
                }
            ];
        }

        res.json({
            success: true,
            count: rooms.length,
            data: rooms.map(r => ({
                id: String(r.id),
                name: r.name,
                code: r.code,
                baseRate: parseFloat(r.base_rate),
                baseOccupancy: r.base_occupancy || 2,
                maxAdults: r.max_adults || 2,
                maxChildren: r.max_children || 0,
                bedType: r.bed_type || 'King Bed',
                viewType: r.view_type || 'City View',
                description: r.description || '',
                amenities: typeof r.amenities === 'string' 
                    ? r.amenities.split(',').map((s: string) => s.trim()).filter(Boolean)
                    : ['Free WiFi', 'Air Conditioning', 'Flat-screen TV', 'Ensuite Bathroom'],
                photos: r.photos ? (Array.isArray(r.photos) ? r.photos : [r.photos]) : []
            }))
        });
    } catch (err: any) {
        console.error('Error in /room-types:', err);
        res.status(500).json({ success: false, error: err.message || 'Failed to fetch room types' });
    }
});

/**
 * GET /api/booking-engine/meal-plans
 * Returns available dining enhancements / meal plans
 */
router.get('/meal-plans', async (req: Request, res: Response) => {
    try {
        const propertyId = getPropertyId(req);
        const result = await pgPool.query(`
            SELECT id, name, short_code, description, selling_price_adult, has_breakfast, has_lunch, has_dinner
            FROM meal_plans
            WHERE property_id = $1
            ORDER BY id ASC;
        `, [propertyId]);

        let plans = result.rows;
        if (plans.length === 0) {
            plans = [
                {
                    id: 'ep',
                    name: 'European Plan (Room Only)',
                    short_code: 'EP',
                    description: 'Standard room rate without meal inclusions. Dinners & drinks billed on consumption.',
                    selling_price_adult: '0.00',
                    has_breakfast: false,
                    has_lunch: false,
                    has_dinner: false
                },
                {
                    id: 'cp',
                    name: 'Continental Plan (Buffet Breakfast Included)',
                    short_code: 'CP',
                    description: 'Includes lavish daily international breakfast buffet at The Grand Feast.',
                    selling_price_adult: '1200.00',
                    has_breakfast: true,
                    has_lunch: false,
                    has_dinner: false
                },
                {
                    id: 'map',
                    name: 'Modified American Plan (Breakfast + Gourmet Dinner)',
                    short_code: 'MAP',
                    description: 'Daily breakfast buffet plus chef special 4-course dinner.',
                    selling_price_adult: '2800.00',
                    has_breakfast: true,
                    has_lunch: false,
                    has_dinner: true
                }
            ];
        }

        res.json({
            success: true,
            data: plans.map(p => ({
                id: String(p.id),
                name: p.name,
                code: p.short_code,
                description: p.description,
                pricePerPerson: parseFloat(p.selling_price_adult || '0'),
                hasBreakfast: Boolean(p.has_breakfast),
                hasLunch: Boolean(p.has_lunch),
                hasDinner: Boolean(p.has_dinner)
            }))
        });
    } catch (err: any) {
        console.error('Error in /meal-plans:', err);
        res.status(500).json({ success: false, error: err.message || 'Failed to fetch meal plans' });
    }
});

/**
 * POST /api/booking-engine/reserve
 * Public Direct Web Booking Submission
 */
router.post('/reserve', async (req: Request, res: Response) => {
    try {
        const propertyId = getPropertyId(req);
        const {
            guestName,
            phone,
            email,
            roomTypeId,
            roomTypeName,
            checkIn,
            checkOut,
            adults = 1,
            children = 0,
            mealPlanCode = 'EP',
            mealPlanPrice = 0,
            specialRequests = '',
            paymentMethod = 'PAY_AT_HOTEL'
        } = req.body;

        if (!guestName || !phone || !checkIn || !checkOut || !roomTypeName) {
            return res.status(400).json({
                success: false,
                error: 'Required fields missing: guestName, phone, checkIn, checkOut, and roomTypeName are mandatory.'
            });
        }

        // Calculate nights
        const inDate = new Date(checkIn);
        const outDate = new Date(checkOut);
        const diffTime = outDate.getTime() - inDate.getTime();
        const nights = Math.max(1, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));

        // Find room rate
        let roomRate = 12500;
        const roomTypeRes = await pgPool.query(`
            SELECT base_rate, name FROM room_types 
            WHERE property_id = $1 AND (id::text = $2 OR name ILIKE $3) LIMIT 1;
        `, [propertyId, String(roomTypeId || ''), `%${roomTypeName}%`]);

        if (roomTypeRes.rows.length > 0) {
            roomRate = parseFloat(roomTypeRes.rows[0].base_rate);
        }

        // Calculate financials
        const roomTotal = roomRate * nights;
        const mealsTotal = Number(mealPlanPrice) * Number(adults) * nights;
        const subtotal = roomTotal + mealsTotal;
        const serviceCharge = subtotal * 0.10; // 10%
        const vat = (subtotal + serviceCharge) * 0.15; // 15%
        const totalAmount = Math.round(subtotal + serviceCharge + vat);

        // Find available physical room or assign buffer room
        let assignedRoomNumber = 'UNASSIGNED';
        const freeRoom = await pgPool.query(`
            SELECT r.room_number, r.id 
            FROM rooms r
            JOIN room_types rt ON rt.id = r.room_type_id
            WHERE r.property_id = $1 
              AND (rt.id::text = $2 OR rt.name ILIKE $3)
              AND r.status = 'ACTIVE'
              AND r.id NOT IN (
                  SELECT rr.room_id 
                  FROM reservation_rooms rr
                  JOIN reservations res ON res.id = rr.reservation_id
                  WHERE res.status NOT IN ('CANCELLED', 'VOID', 'CHECKED_OUT')
                    AND rr.check_in_date < $5 AND rr.check_out_date > $4
              )
            ORDER BY r.room_number ASC LIMIT 1;
        `, [propertyId, String(roomTypeId || ''), `%${roomTypeName}%`, checkIn, checkOut]);

        if (freeRoom.rows.length > 0) {
            assignedRoomNumber = freeRoom.rows[0].room_number;
        }

        // Generate sequential web reservation number
        const randHex = Math.floor(1000 + Math.random() * 9000);
        const resNumber = `WEB-${Date.now().toString().slice(-6)}-${randHex}`;

        // Create booking in database via booking service
        const newBooking = await bookingService.createBooking({
            propertyId,
            reservationNumber: resNumber,
            guestName: guestName.trim(),
            phone: phone.trim(),
            email: (email || '').trim().toLowerCase(),
            roomType: roomTypeName,
            roomNumber: assignedRoomNumber,
            checkIn,
            checkOut,
            nights,
            adults: Number(adults) || 1,
            children: Number(children) || 0,
            mealPlan: mealPlanCode,
            channel: 'DIRECT_WEB',
            bookingSource: 'Direct Hotel Website',
            status: paymentMethod === 'PAY_AT_HOTEL' ? 'CONFIRMED' : 'GUARANTEED',
            paymentMethod,
            totalAmount,
            dailyBaseRate: roomRate,
            specialRequests: specialRequests ? `[Web Guest Request]: ${specialRequests}` : ''
        });

        // Broadcast real-time SSE event to Front Desk staff
        try {
            broadcastServerEvent({
                type: 'RESERVATION_COMMITTED',
                reservation: newBooking,
                propertyId
            });
            broadcastServerEvent({
                type: 'INVENTORY_REFRESH',
                propertyId
            });
        } catch {}

        // Dispatch Confirmation
        try {
            await NotificationService.dispatchBookingConfirmationNotification({
                propertyId,
                reservationId: newBooking.id,
                reservationNumber: resNumber,
                guestName,
                guestEmail: email,
                guestPhone: phone,
                roomNumber: assignedRoomNumber,
                roomTypeName,
                checkInDate: checkIn,
                checkOutDate: checkOut,
                nights,
                adults: Number(adults),
                totalAmount,
                channels: {
                    email: Boolean(email),
                    whatsapp: Boolean(phone),
                    sms: false
                }
            });
        } catch {}

        res.status(201).json({
            success: true,
            confirmationNumber: resNumber,
            bookingId: newBooking.id,
            guestName,
            roomType: roomTypeName,
            assignedRoom: assignedRoomNumber,
            checkIn,
            checkOut,
            nights,
            adults,
            totalAmount,
            paymentMethod,
            status: newBooking.status,
            message: `Reservation confirmed! Confirmation Number: ${resNumber}`
        });

    } catch (err: any) {
        console.error('Error in /booking-engine/reserve:', err);
        res.status(500).json({ success: false, error: err.message || 'Failed to process web reservation' });
    }
});

export default router;
