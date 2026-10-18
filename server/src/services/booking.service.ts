export interface BookingRecord {
  id: string;
  resNo: string;
  guestName: string;
  roomNo: string;
  roomType: string;
  ratePlan: string;
  rateAmount: number;
  arrivalDate: string;
  departureDate: string;
  status: 'confirmed' | 'checked_in' | 'checked_out' | 'cancelled' | 'no_show';
  propertyId: string;
  createdAt: string;
}

// In-memory operational mock store for development
const BOOKINGS_STORE: BookingRecord[] = [
  {
    id: 'bkg_101',
    resNo: 'RES-9041',
    guestName: 'Eleanor Vance',
    roomNo: '204',
    roomType: 'Deluxe Suite',
    ratePlan: 'Rack Rate',
    rateAmount: 185.0,
    arrivalDate: '2026-10-18',
    departureDate: '2026-10-22',
    status: 'checked_in',
    propertyId: 'prop_grand_palace',
    createdAt: '2026-10-15T10:00:00Z',
  },
  {
    id: 'bkg_102',
    resNo: 'RES-9042',
    guestName: 'Marcus Holloway',
    roomNo: '301',
    roomType: 'Standard King',
    ratePlan: 'Corporate',
    rateAmount: 145.0,
    arrivalDate: '2026-10-19',
    departureDate: '2026-10-21',
    status: 'confirmed',
    propertyId: 'prop_grand_palace',
    createdAt: '2026-10-16T14:30:00Z',
  },
  {
    id: 'bkg_103',
    resNo: 'RES-9043',
    guestName: 'Sophia Loren',
    roomNo: '105',
    roomType: 'Presidential Suite',
    ratePlan: 'VIP Package',
    rateAmount: 450.0,
    arrivalDate: '2026-10-17',
    departureDate: '2026-10-19',
    status: 'cancelled',
    propertyId: 'prop_grand_palace',
    createdAt: '2026-10-10T09:15:00Z',
  },
];

export const bookingService = {
  getAllBookings: async (propertyId: string, status?: string) => {
    let result = BOOKINGS_STORE.filter((b) => b.propertyId === propertyId);
    if (status && status !== 'all') {
      result = result.filter((b) => b.status === status);
    }
    return result;
  },

  getBookingById: async (id: string, propertyId: string) => {
    return BOOKINGS_STORE.find((b) => b.id === id && b.propertyId === propertyId);
  },

  createBooking: async (payload: Omit<BookingRecord, 'id' | 'createdAt'>) => {
    const newBooking: BookingRecord = {
      ...payload,
      id: `bkg_${Date.now()}`,
      createdAt: new Date().toISOString(),
    };
    BOOKINGS_STORE.push(newBooking);
    return newBooking;
  },

  updateBookingStatus: async (id: string, propertyId: string, status: BookingRecord['status']) => {
    const index = BOOKINGS_STORE.findIndex((b) => b.id === id && b.propertyId === propertyId);
    if (index === -1) return null;
    BOOKINGS_STORE[index].status = status;
    return BOOKINGS_STORE[index];
  },
};
