/**
 * Connecting Rooms Resolution & Booking Helper
 * Integrates Connecting Rooms configuration from General Settings & Backend DB
 * with StayView, QuickReservationModal, AddReservationModal, AddReservation, and MultiRoomSelectorModal.
 */

import { getApiBaseUrl } from './apiUrl';
import { getCanonicalRooms, getActivePropertyId } from './roomInventoryEngine';

export interface ConnectingRoomPairInfo {
    suiteId?: string | number;
    partnerRoom: string;
    partnerRooms: string[];
    allSuiteRooms: string[];
    doorType: string;
    mutualBlock: boolean;
    name: string;
    pricingStrategy: 'Sum of Rates' | 'Fixed Rate';
    fixedPrice?: number;
}

export interface ConnectingSuiteConfig {
    id: string | number;
    name: string;
    roomNumbers: string[];
    inventoryLogic: string;
    pricingStrategy: 'Sum of Rates' | 'Fixed Rate';
    fixedPrice?: number;
    status: string;
}

const STORAGE_KEY = 'hotel_connecting_rooms_v1';

/**
 * Syncs connecting room suites from the backend database into localStorage
 * and dispatches a custom event so UI components update automatically.
 */
export const syncConnectingRoomsFromDB = async (propertyId?: number): Promise<ConnectingSuiteConfig[]> => {
    const propId = propertyId || getActivePropertyId() || 1;
    try {
        const res = await fetch(`${getApiBaseUrl()}/api/connecting-rooms?propertyId=${propId}`);
        if (!res.ok) return getActiveConnectingSuites();
        const json = await res.json();
        if (json.success && Array.isArray(json.data)) {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(json.data));
            window.dispatchEvent(new CustomEvent('hotel_connecting_rooms_updated'));
            return getActiveConnectingSuites();
        }
    } catch {
        // Offline or unreachable — fall back to localStorage
    }
    return getActiveConnectingSuites();
};

/**
 * Returns all active Connecting Room Suites configured in General Settings
 * (plus any physical room connecting pairs defined in Room Management).
 */
export const getActiveConnectingSuites = (): ConnectingSuiteConfig[] => {
    const suites: ConnectingSuiteConfig[] = [];
    const coveredRooms = new Set<string>();

    try {
        const saved =
            localStorage.getItem(STORAGE_KEY) ||
            localStorage.getItem('hotel_connecting_rooms_inventory_v1');
        if (saved) {
            const list = JSON.parse(saved);
            if (Array.isArray(list)) {
                list.forEach((item: any, idx: number) => {
                    if (item.status === 'Inactive') return;

                    const allNumbers: string[] = [];
                    if (Array.isArray(item.componentRooms)) {
                        item.componentRooms.forEach((cr: any) => {
                            if (Array.isArray(cr.roomNumbers)) {
                                cr.roomNumbers.forEach((num: any) => {
                                    const clean = String(num).trim();
                                    if (clean && !allNumbers.includes(clean)) {
                                        allNumbers.push(clean);
                                    }
                                });
                            }
                        });
                    } else if (item.primaryRoom && item.secondaryRoom) {
                        allNumbers.push(String(item.primaryRoom).trim(), String(item.secondaryRoom).trim());
                    }

                    if (allNumbers.length >= 2) {
                        allNumbers.forEach(rn => coveredRooms.add(rn));
                        suites.push({
                            id: item.id ?? idx + 1,
                            name: item.name || `Connecting Suite (${allNumbers.join(' & ')})`,
                            roomNumbers: allNumbers,
                            inventoryLogic: item.inventoryLogic || 'Auto-Sync',
                            pricingStrategy: item.pricingStrategy === 'Fixed Rate' ? 'Fixed Rate' : 'Sum of Rates',
                            fixedPrice: Number(item.fixedPrice) || undefined,
                            status: item.status || 'Active'
                        });
                    }
                });
            }
        }
    } catch {}

    // Also include physical rooms marked isConnecting + connectedTo in Room Management
    try {
        const canonicalRooms = getCanonicalRooms();
        canonicalRooms.forEach(rm => {
            if (rm.isConnecting && rm.connectedTo) {
                const a = String(rm.number).trim();
                const b = String(rm.connectedTo).trim();
                if (a && b && (!coveredRooms.has(a) || !coveredRooms.has(b))) {
                    coveredRooms.add(a);
                    coveredRooms.add(b);
                    suites.push({
                        id: `pair_${a}_${b}`,
                        name: `Connecting Pair (${a} & ${b})`,
                        roomNumbers: [a, b],
                        inventoryLogic: 'Auto-Sync',
                        pricingStrategy: 'Sum of Rates',
                        status: 'Active'
                    });
                }
            }
        });
    } catch {}

    return suites;
};

/**
 * Returns a lookup map from roomNumber -> ConnectingRoomPairInfo
 */
export const getConnectingRoomsMap = (): Map<string, ConnectingRoomPairInfo> => {
    const map = new Map<string, ConnectingRoomPairInfo>();
    const suites = getActiveConnectingSuites();

    suites.forEach(suite => {
        const allNumbers = suite.roomNumbers;
        for (let i = 0; i < allNumbers.length; i++) {
            const current = allNumbers[i];
            const partners = allNumbers.filter((_, idx) => idx !== i);
            map.set(current, {
                suiteId: suite.id,
                partnerRoom: partners.join(', '),
                partnerRooms: partners,
                allSuiteRooms: allNumbers,
                doorType: 'Interconnecting Door',
                mutualBlock: Boolean(
                    suite.inventoryLogic === 'Auto-Sync' ||
                    suite.inventoryLogic?.includes('Deduct')
                ),
                name: suite.name,
                pricingStrategy: suite.pricingStrategy,
                fixedPrice: suite.fixedPrice
            });
        }
    });

    return map;
};
