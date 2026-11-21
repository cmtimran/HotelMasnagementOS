/**
 * HotelManagementOS - In-Room Minibar Consumption & Direct Folio Billing Engine
 * 
 * Allows Housekeepers & Front Desk staff during Room Inspection / Turnover to record consumed minibar items
 * and immediately post itemized charges directly to PostgreSQL folios.
 */

import { getAllStoredReservations, saveStoredReservations, broadcastPMSEvent } from './roomInventoryEngine';
import { getApiBaseUrl } from './apiUrl';

export interface MinibarProduct {
    id: string;
    name: string;
    category: 'Beverages' | 'Snacks' | 'Alcohol' | 'Water' | 'Essentials' | string;
    unitPrice: number;
    currency: string;
    parStock?: number;
}

export interface MinibarConsumptionItem {
    productId: string;
    name: string;
    quantity: number;
    unitPrice: number;
    subtotal: number;
}

export const STANDARD_MINIBAR_CATALOG: MinibarProduct[] = [
    { id: 'mb-01', name: 'Evian Mineral Water (500ml)', category: 'Water', unitPrice: 150, currency: 'BDT', parStock: 2 },
    { id: 'mb-02', name: 'Coca-Cola Can (330ml)', category: 'Beverages', unitPrice: 180, currency: 'BDT', parStock: 2 },
    { id: 'mb-03', name: 'Sprite Lemon-Lime Can (330ml)', category: 'Beverages', unitPrice: 180, currency: 'BDT', parStock: 2 },
    { id: 'mb-04', name: 'Red Bull Energy Drink (250ml)', category: 'Beverages', unitPrice: 350, currency: 'BDT', parStock: 2 },
    { id: 'mb-05', name: 'Heineken 0.0 Malt Can (330ml)', category: 'Beverages', unitPrice: 320, currency: 'BDT', parStock: 2 },
    { id: 'mb-06', name: 'Pringles Potato Crisps (Sour Cream)', category: 'Snacks', unitPrice: 250, currency: 'BDT', parStock: 1 },
    { id: 'mb-07', name: 'Cadbury Dairy Milk Silk (60g)', category: 'Snacks', unitPrice: 180, currency: 'BDT', parStock: 2 },
    { id: 'mb-08', name: 'Mixed Roasted Cashew Nuts Jar (100g)', category: 'Snacks', unitPrice: 280, currency: 'BDT', parStock: 1 },
    { id: 'mb-09', name: 'Gourmet Salted Almonds Jar (100g)', category: 'Snacks', unitPrice: 320, currency: 'BDT', parStock: 1 },
    { id: 'mb-10', name: 'Premium Travel Dental & Grooming Kit', category: 'Essentials', unitPrice: 220, currency: 'BDT', parStock: 1 }
];

/**
 * Fetch dynamic minibar items from backend PostgreSQL database
 */
export async function fetchMinibarCatalog(propertyId: number | string = 1): Promise<MinibarProduct[]> {
    try {
        const baseUrl = getApiBaseUrl();
        const token = localStorage.getItem('auth_token');
        const res = await fetch(`${baseUrl}/api/housekeeping/minibar-items?propertyId=${encodeURIComponent(propertyId)}`, {
            headers: {
                'Authorization': token ? `Bearer ${token}` : '',
                'X-Property-Id': String(propertyId)
            }
        });
        const data = await res.json();
        if (data.success && Array.isArray(data.data) && data.data.length > 0) {
            return data.data.map((item: any) => ({
                id: String(item.id),
                name: item.name,
                category: item.category,
                unitPrice: item.price,
                currency: 'BDT',
                parStock: item.parStock
            }));
        }
    } catch (err) {
        console.warn('Failed to fetch minibar catalog from API, using defaults:', err);
    }
    return STANDARD_MINIBAR_CATALOG;
}

/**
 * Post minibar consumption directly to the in-house guest's folio / reservation in PostgreSQL
 */
export const postMinibarToFolio = async (
    roomNumber: string,
    items: MinibarConsumptionItem[],
    staffName: string = 'Housekeeper',
    propertyId: number | string = 1
): Promise<{ success: boolean; total: number; reservationNumber?: string; message: string }> => {
    const total = items.reduce((sum, item) => sum + item.subtotal, 0);
    if (total <= 0) {
        return { success: false, total: 0, message: 'No items selected' };
    }

    const cleanRoom = roomNumber.trim();
    const token = localStorage.getItem('auth_token');
    const baseUrl = getApiBaseUrl();

    // 1. Post to PostgreSQL backend endpoint
    try {
        const res = await fetch(`${baseUrl}/api/housekeeping/minibar-post`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': token ? `Bearer ${token}` : '',
                'X-Property-Id': String(propertyId)
            },
            body: JSON.stringify({
                roomNumber: cleanRoom,
                items: items.map(i => ({
                    name: i.name,
                    quantity: i.quantity,
                    price: i.unitPrice
                })),
                attendedBy: staffName
            })
        });

        const data = await res.json();
        if (data.success) {
            return {
                success: true,
                total,
                reservationNumber: `FOLIO-${data.folioId}`,
                message: data.message || `Successfully posted ৳${total} minibar charge to Room ${cleanRoom}`
            };
        } else if (res.status === 404) {
            return {
                success: false,
                total,
                message: data.error || `No active in-house reservation found for Room ${cleanRoom}`
            };
        }
    } catch (apiErr) {
        console.warn('Housekeeping minibar API call failed, syncing locally:', apiErr);
    }

    // 2. Fallback local sync
    const reservations = getAllStoredReservations();
    const targetRes = reservations.find(r => 
        String(r.roomNumber || '').trim().toLowerCase() === cleanRoom.toLowerCase() &&
        (r.status === 'Checked-In' || r.status === 'checked-in' || r.status === 'confirmed')
    );

    if (!targetRes) {
        return {
            success: false,
            total,
            message: `No active checked-in guest found for Room ${cleanRoom}. Cannot post folio charge.`
        };
    }

    const chargeDate = new Date().toISOString();
    const itemSummary = items.map(i => `${i.quantity}x ${i.name}`).join(', ');

    const newCharge = {
        id: `CHG-MB-${Date.now()}`,
        date: chargeDate,
        title: `Minibar Consumption (${itemSummary})`,
        amount: total,
        type: 'minibar',
        recordedBy: staffName,
        items
    };

    const currentAddons = targetRes.addonCharges || {};
    const existingList = Array.isArray(currentAddons.customCharges) ? currentAddons.customCharges : [];
    
    const updatedReservation = {
        ...targetRes,
        addonCharges: {
            ...currentAddons,
            total: (Number(currentAddons.total) || 0) + total,
            customCharges: [newCharge, ...existingList]
        }
    };

    const updatedList = reservations.map(r => 
        (String(r.id) === String(targetRes.id) || r.reservationNumber === targetRes.reservationNumber)
            ? updatedReservation 
            : r
    );

    saveStoredReservations(updatedList);
    broadcastPMSEvent({
        type: 'RESERVATION_UPDATED',
        reservationId: targetRes.reservationNumber || String(targetRes.id)
    });

    return {
        success: true,
        total,
        reservationNumber: targetRes.reservationNumber || String(targetRes.id),
        message: `Successfully posted ৳${total} BDT minibar charge to Guest ${targetRes.guestName} (Room ${cleanRoom})`
    };
};
