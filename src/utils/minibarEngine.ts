/**
 * HotelManagementOS - In-Room Minibar Consumption & Direct Folio Billing Engine
 * 
 * Allows Housekeepers during Room Inspection / Turnover to record consumed minibar items
 * and immediately post the itemized charges directly to the guest's folio / reservation.
 */

import { getAllStoredReservations, saveStoredReservations, broadcastPMSEvent } from './roomInventoryEngine';
import { getApiBaseUrl } from './apiUrl';

export interface MinibarProduct {
    id: string;
    name: string;
    category: 'Beverages' | 'Snacks' | 'Alcohol' | 'Water';
    unitPrice: number;
    currency: string;
}

export interface MinibarConsumptionItem {
    productId: string;
    name: string;
    quantity: number;
    unitPrice: number;
    subtotal: number;
}

export const STANDARD_MINIBAR_CATALOG: MinibarProduct[] = [];

/**
 * Post minibar consumption directly to the in-house guest's folio / reservation
 */
export const postMinibarToFolio = async (
    roomNumber: string,
    items: MinibarConsumptionItem[],
    staffName: string = 'Housekeeper'
): Promise<{ success: boolean; total: number; reservationNumber?: string; message: string }> => {
    const total = items.reduce((sum, item) => sum + item.subtotal, 0);
    if (total <= 0) {
        return { success: false, total: 0, message: 'No items selected' };
    }

    const reservations = getAllStoredReservations();
    const cleanRoom = roomNumber.trim().toLowerCase();

    // Look for active in-house guest
    const targetRes = reservations.find(r => 
        String(r.roomNumber || '').trim().toLowerCase() === cleanRoom &&
        (r.status === 'Checked-In' || r.status === 'checked-in' || r.status === 'confirmed')
    );

    if (!targetRes) {
        return {
            success: false,
            total,
            message: `No active checked-in guest found for Room ${roomNumber}. Cannot post folio charge.`
        };
    }

    const chargeDate = new Date().toISOString();
    const itemSummary = items.map(i => `${i.quantity}x ${i.name}`).join(', ');

    // Add minibar charge entry
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

    // Try posting to backend API if available
    try {
        const baseUrl = getApiBaseUrl();
        await fetch(`${baseUrl}/api/accounting/folios/${targetRes.id}/charges`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                chargeType: 'Minibar',
                description: `Minibar: ${itemSummary}`,
                amount: total,
                postedBy: staffName
            })
        });
    } catch {
        // Preserved in local storage
    }

    return {
        success: true,
        total,
        reservationNumber: targetRes.reservationNumber || String(targetRes.id),
        message: `Successfully posted ${total} BDT minibar charge to Guest ${targetRes.guestName} (Room ${roomNumber})`
    };
};
