export interface RoomRecord {
  id: string;
  roomNo: string;
  roomType: string;
  floor: number;
  building: string;
  hkStatus: 'clean' | 'dirty' | 'inspected' | 'ooo';
  foStatus: 'vacant' | 'occupied' | 'reserved' | 'due_out';
  baseRate: number;
  propertyId: string;
}

const ROOMS_STORE: RoomRecord[] = [
  { id: 'rm_101', roomNo: '101', roomType: 'Standard King', floor: 1, building: 'Main Wing', hkStatus: 'clean', foStatus: 'vacant', baseRate: 140, propertyId: 'prop_grand_palace' },
  { id: 'rm_102', roomNo: '102', roomType: 'Standard King', floor: 1, building: 'Main Wing', hkStatus: 'clean', foStatus: 'occupied', baseRate: 140, propertyId: 'prop_grand_palace' },
  { id: 'rm_204', roomNo: '204', roomType: 'Deluxe Suite', floor: 2, building: 'Main Wing', hkStatus: 'dirty', foStatus: 'occupied', baseRate: 210, propertyId: 'prop_grand_palace' },
  { id: 'rm_301', roomNo: '301', roomType: 'Presidential Suite', floor: 3, building: 'VIP Tower', hkStatus: 'inspected', foStatus: 'reserved', baseRate: 490, propertyId: 'prop_grand_palace' },
  { id: 'rm_302', roomNo: '302', roomType: 'Presidential Suite', floor: 3, building: 'VIP Tower', hkStatus: 'ooo', foStatus: 'vacant', baseRate: 490, propertyId: 'prop_grand_palace' },
];

export const roomService = {
  getAllRooms: async (propertyId: string, filter?: { hkStatus?: string; foStatus?: string }) => {
    let result = ROOMS_STORE.filter((r) => r.propertyId === propertyId);
    if (filter?.hkStatus && filter.hkStatus !== 'all') {
      result = result.filter((r) => r.hkStatus === filter.hkStatus);
    }
    if (filter?.foStatus && filter.foStatus !== 'all') {
      result = result.filter((r) => r.foStatus === filter.foStatus);
    }
    return result;
  },

  updateHousekeepingStatus: async (roomNo: string, propertyId: string, status: RoomRecord['hkStatus']) => {
    const room = ROOMS_STORE.find((r) => r.roomNo === roomNo && r.propertyId === propertyId);
    if (!room) return null;
    room.hkStatus = status;
    return room;
  },
};
