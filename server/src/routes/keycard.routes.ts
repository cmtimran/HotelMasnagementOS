import { Router, Request, Response } from 'express';
import { KeycardService } from '../services/keycard.service.js';
import { db } from '../database/db.js';

const router = Router();

// POST /api/keycard/issue - Encode and issue guest keycard
router.post('/issue', async (req: Request, res: Response) => {
    try {
        const rawPropId = req.body.propertyId || req.headers['x-property-id'] || (req as any).propertyId;
        const propertyId = Number(rawPropId);
        if (!propertyId) {
            return res.status(400).json({ success: false, error: 'Property ID is required' });
        }
        const { roomNumber, guestName, validFrom, validUntil, encoderType } = req.body;
        if (!roomNumber) {
            return res.status(400).json({ success: false, error: 'Room number is required' });
        }

        const result = await KeycardService.issueKeycard({
            propertyId,
            roomNumber,
            guestName: guestName || 'Guest',
            validFrom,
            validUntil,
            encoderType
        });

        res.json(result);
    } catch (err: any) {
        res.status(500).json({ success: false, error: err?.message || 'Failed to issue keycard' });
    }
});

// POST /api/keycard/revoke - Deactivate a keycard
router.post('/revoke', async (req: Request, res: Response) => {
    try {
        const rawPropId = req.body.propertyId || req.headers['x-property-id'] || (req as any).propertyId;
        const propertyId = Number(rawPropId);
        if (!propertyId) {
            return res.status(400).json({ success: false, error: 'Property ID is required' });
        }
        const { roomNumber } = req.body;
        if (!roomNumber) {
            return res.status(400).json({ success: false, error: 'Room number is required' });
        }

        const result = await KeycardService.revokeKeycard(propertyId, roomNumber);
        res.json(result);
    } catch (err: any) {
        res.status(500).json({ success: false, error: err?.message || 'Failed to revoke keycard' });
    }
});

// GET /api/keycard/:roomNumber/status - Check keycard lock state
router.get('/:roomNumber/status', async (req: Request, res: Response) => {
    try {
        const rawPropId = req.query.propertyId || req.headers['x-property-id'] || (req as any).propertyId;
        const propertyId = Number(rawPropId);
        if (!propertyId) {
            return res.status(400).json({ success: false, error: 'Property ID is required' });
        }
        const roomNumber = String(req.params.roomNumber);

        const result = await KeycardService.getKeycardStatus(propertyId, roomNumber);
        res.json(result);
    } catch (err: any) {
        res.status(500).json({ success: false, error: err?.message || 'Failed to get keycard status' });
    }
});

// GET /api/keycard/logs - Audit trail of all keycard issues and revokes
router.get('/logs', async (req: Request, res: Response) => {
    try {
        const rawPropId = req.query.propertyId || req.headers['x-property-id'] || (req as any).propertyId;
        const propertyId = Number(rawPropId);
        if (!propertyId) {
            return res.status(400).json({ success: false, error: 'Property ID is required' });
        }

        const logs = await db.prepare(`
            SELECT * FROM keycard_logs 
            WHERE property_id = ? 
            ORDER BY created_at DESC 
            LIMIT 100
        `).all(propertyId).catch(() => []) as any[];

        res.json({ success: true, count: logs.length, data: logs });
    } catch (err: any) {
        res.status(500).json({ success: false, error: err?.message || 'Failed to fetch keycard logs' });
    }
});

export default router;
