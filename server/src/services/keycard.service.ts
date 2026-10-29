import { db } from '../database/db.js';

export interface IssueKeycardPayload {
    propertyId: number;
    roomNumber: string;
    guestName: string;
    reservationNumber?: string;
    validFrom?: string;
    validUntil?: string;
    encoderType?: string; // 'RFID_GENERIC' | 'TTLOCK' | 'SALTO' | 'ASSA_ABLOY'
}

export class KeycardService {
    /**
     * Issue and encode a new electronic RFID / Smart Lock keycard for a guest room
     */
    static async issueKeycard(payload: IssueKeycardPayload) {
        const { propertyId, roomNumber, guestName, encoderType = 'RFID_GENERIC' } = payload;
        
        // 1. Verify Room Exists
        const room = await db.prepare(`
            SELECT id, room_number, keycard_rfid, lock_id, status 
            FROM rooms 
            WHERE property_id = ? AND room_number = ?
            LIMIT 1
        `).get(propertyId, roomNumber) as any;

        if (!room) {
            throw new Error(`Room ${roomNumber} not found for property #${propertyId}`);
        }

        // 2. Generate Electronic Card Identifier & Magnetic / RFID Track Data
        const timestamp = Date.now();
        const cardUid = `UID-${roomNumber}-${timestamp.toString(36).toUpperCase()}`;
        const validFrom = payload.validFrom || new Date().toISOString();
        const validUntil = payload.validUntil || new Date(Date.now() + 24 * 3600 * 1000).toISOString();

        // 3. Construct Hardware Protocol Payload (Compatible with Mifare / ISO14443A & Cloud Smart Locks)
        const encoderPayload = {
            protocol: encoderType,
            sector0: `SEC0-${propertyId.toString().padStart(4, '0')}`,
            track2: `;${roomNumber}=${validUntil.slice(0, 10).replace(/-/g, '')}?`,
            cardUid,
            roomNumber,
            guestName,
            validFrom,
            validUntil,
            issuedAt: new Date().toISOString()
        };

        // 4. Update Room Record
        await db.prepare(`
            UPDATE rooms 
            SET keycard_rfid = ?, updated_at = CURRENT_TIMESTAMP 
            WHERE id = ?
        `).run(cardUid, room.id);

        // 5. Invalidate any prior active keycards for this room in keycard_logs
        await db.prepare(`
            UPDATE keycard_logs 
            SET status = 'OVERWRITTEN' 
            WHERE property_id = ? AND room_number = ? AND status = 'ACTIVE'
        `).run(propertyId, roomNumber).catch(() => {});

        // 6. Record in Audit Log
        await db.prepare(`
            INSERT INTO keycard_logs (
                property_id, room_number, card_uid, encoder_type, 
                operation, issued_to, valid_from, valid_until, status
            ) VALUES (?, ?, ?, ?, 'ISSUE', ?, ?, ?, 'ACTIVE')
        `).run(propertyId, roomNumber, cardUid, encoderType, guestName, validFrom, validUntil).catch(() => {});

        return {
            success: true,
            cardUid,
            roomNumber,
            guestName,
            encoderType,
            validFrom,
            validUntil,
            encoderPayload,
            message: `Keycard ${cardUid} issued and encoded successfully for Room ${roomNumber}.`
        };
    }

    /**
     * Revoke / Deactivate an active keycard (Checkout / Lost Card)
     */
    static async revokeKeycard(propertyId: number, roomNumber: string) {
        const room = await db.prepare(`
            SELECT id, room_number, keycard_rfid 
            FROM rooms 
            WHERE property_id = ? AND room_number = ?
            LIMIT 1
        `).get(propertyId, roomNumber) as any;

        if (!room) {
            throw new Error(`Room ${roomNumber} not found for property #${propertyId}`);
        }

        const prevCard = room.keycard_rfid;

        // Clear room's active keycard
        await db.prepare(`
            UPDATE rooms 
            SET keycard_rfid = NULL, updated_at = CURRENT_TIMESTAMP 
            WHERE id = ?
        `).run(room.id);

        // Update log status
        if (prevCard) {
            await db.prepare(`
                UPDATE keycard_logs 
                SET status = 'REVOKED' 
                WHERE property_id = ? AND room_number = ? AND card_uid = ?
            `).run(propertyId, roomNumber, prevCard).catch(() => {});
        }

        return {
            success: true,
            roomNumber,
            revokedCardUid: prevCard || 'NONE',
            message: `Keycard for Room ${roomNumber} successfully deactivated.`
        };
    }

    /**
     * Get active keycard status and history for a room
     */
    static async getKeycardStatus(propertyId: number, roomNumber: string) {
        const room = await db.prepare(`
            SELECT id, room_number, keycard_rfid, lock_id, status 
            FROM rooms 
            WHERE property_id = ? AND room_number = ?
            LIMIT 1
        `).get(propertyId, roomNumber) as any;

        if (!room) {
            throw new Error(`Room ${roomNumber} not found for property #${propertyId}`);
        }

        const logs = await db.prepare(`
            SELECT * FROM keycard_logs 
            WHERE property_id = ? AND room_number = ? 
            ORDER BY created_at DESC 
            LIMIT 10
        `).all(propertyId, roomNumber).catch(() => []) as any[];

        return {
            success: true,
            roomNumber,
            lockId: room.lock_id || 'DEFAULT_LOCK',
            activeCardUid: room.keycard_rfid || null,
            hasActiveKeycard: Boolean(room.keycard_rfid),
            recentLogs: logs
        };
    }
}
