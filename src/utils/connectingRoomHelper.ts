/**
 * Connecting Rooms Resolution Helper
 * Integrates Connecting Rooms configuration from General Settings with StayView,
 * Room Inventory Engine, and Reservation workflows.
 */

export interface ConnectingRoomPairInfo {
    partnerRoom: string;
    doorType: string;
    mutualBlock: boolean;
    name: string;
}

export const getConnectingRoomsMap = (): Map<string, ConnectingRoomPairInfo> => {
    const map = new Map<string, ConnectingRoomPairInfo>();
    try {
        const saved = localStorage.getItem('hotel_connecting_rooms_v1') || 
                      localStorage.getItem('hotel_connecting_rooms_inventory_v1');
        if (saved) {
            const list = JSON.parse(saved);
            if (Array.isArray(list)) {
                list.forEach((item: any) => {
                    if (item.status === 'Inactive') return;
                    // Format A: componentRooms with arrays of roomNumbers
                    if (Array.isArray(item.componentRooms)) {
                        const allNumbers: string[] = [];
                        item.componentRooms.forEach((cr: any) => {
                            if (Array.isArray(cr.roomNumbers)) {
                                cr.roomNumbers.forEach((num: any) => allNumbers.push(String(num).trim()));
                            }
                        });
                        if (allNumbers.length >= 2) {
                            for (let i = 0; i < allNumbers.length; i++) {
                                const current = allNumbers[i];
                                const partners = allNumbers.filter((_, idx) => idx !== i);
                                map.set(current, {
                                    partnerRoom: partners.join(', '),
                                    doorType: item.doorType || 'Connecting Door',
                                    mutualBlock: Boolean(item.inventoryLogic === 'Auto-Sync' || item.inventoryLogic?.includes('Deduct') || item.mutualBlock),
                                    name: item.name || `Connecting (${partners.join(', ')})`
                                });
                            }
                        }
                    } 
                    // Format B: primaryRoom & secondaryRoom direct keys
                    else if (item.primaryRoom && item.secondaryRoom) {
                        const p = String(item.primaryRoom).trim();
                        const s = String(item.secondaryRoom).trim();
                        map.set(p, { 
                            partnerRoom: s, 
                            doorType: item.doorType || 'Double Soundproof Door', 
                            mutualBlock: Boolean(item.mutualBlock !== false), 
                            name: item.name || `Connecting (${p} & ${s})` 
                        });
                        map.set(s, { 
                            partnerRoom: p, 
                            doorType: item.doorType || 'Double Soundproof Door', 
                            mutualBlock: Boolean(item.mutualBlock !== false), 
                            name: item.name || `Connecting (${p} & ${s})` 
                        });
                    }
                });
            }
        }
    } catch {}

    // Return map populated strictly from General Settings configuration
    return map;

    return map;
};
