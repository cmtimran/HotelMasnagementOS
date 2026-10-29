import { Router, Request, Response } from 'express';
import { ChannelManagerService } from '../services/channelManager.service.js';
import { db } from '../database/db.js';

const router = Router();

// GET /api/channel-manager/ari - Live ARI Matrix for distribution
router.get('/ari', async (req: Request, res: Response) => {
    try {
        const rawPropId = req.query.propertyId || req.headers['x-property-id'] || (req as any).propertyId;
        const propertyId = Number(rawPropId);
        if (!propertyId) {
            return res.status(400).json({ success: false, error: 'Property ID is required' });
        }
        const startDate = (req.query.startDate as string) || new Date().toISOString().slice(0, 10);
        const endDate = (req.query.endDate as string) || new Date(Date.now() + 30 * 24 * 3600 * 1000).toISOString().slice(0, 10);

        const matrix = await ChannelManagerService.getARIMatrix(propertyId, startDate, endDate);
        res.json(matrix);
    } catch (err: any) {
        res.status(500).json({ success: false, error: err?.message || 'Failed to compute ARI matrix' });
    }
});

// POST /api/channel-manager/push-ari - Broadcast inventory/rates to connected OTAs
router.post('/push-ari', async (req: Request, res: Response) => {
    try {
        const rawPropId = req.body.propertyId || req.headers['x-property-id'] || (req as any).propertyId;
        const propertyId = Number(rawPropId);
        if (!propertyId) {
            return res.status(400).json({ success: false, error: 'Property ID is required' });
        }
        const channels = req.body.channels || ['BOOKING_COM', 'AGODA', 'EXPEDIA', 'AIRBNB'];

        const result = await ChannelManagerService.broadcastARIPush(propertyId, channels);
        res.json(result);
    } catch (err: any) {
        res.status(500).json({ success: false, error: err?.message || 'Failed to broadcast ARI push' });
    }
});

// POST /api/channel-manager/webhook/ota-booking - Inbound OTA booking webhook
router.post('/webhook/ota-booking', async (req: Request, res: Response) => {
    try {
        const rawPropId = req.body.propertyId || req.headers['x-property-id'] || (req as any).propertyId;
        const propertyId = Number(rawPropId);
        if (!propertyId) {
            return res.status(400).json({ success: false, error: 'Property ID is required' });
        }

        const result = await ChannelManagerService.handleInboundOTABooking({
            propertyId,
            channelName: req.body.channelName || 'OTA_GENERIC',
            otaBookingReference: req.body.otaBookingReference || `EXT-${Date.now()}`,
            guest: req.body.guest || { firstName: 'OTA', lastName: 'Guest', email: 'ota@example.com' },
            roomTypeName: req.body.roomTypeName,
            checkInDate: req.body.checkInDate,
            checkOutDate: req.body.checkOutDate,
            adults: Number(req.body.adults) || 1,
            children: Number(req.body.children) || 0,
            totalAmount: Number(req.body.totalAmount) || 0,
            commissionAmount: Number(req.body.commissionAmount) || 0,
            specialRequests: req.body.specialRequests || ''
        });

        res.json(result);
    } catch (err: any) {
        res.status(500).json({ success: false, error: err?.message || 'Failed to ingest OTA booking' });
    }
});

// GET /api/channel-manager/logs - Channel Manager sync audit trail
router.get('/logs', async (req: Request, res: Response) => {
    try {
        const rawPropId = req.query.propertyId || req.headers['x-property-id'] || (req as any).propertyId;
        const propertyId = Number(rawPropId);
        if (!propertyId) {
            return res.status(400).json({ success: false, error: 'Property ID is required' });
        }

        const logs = await db.prepare(`
            SELECT * FROM channel_manager_logs 
            WHERE property_id = ? 
            ORDER BY created_at DESC 
            LIMIT 100
        `).all(propertyId).catch(() => []) as any[];

        res.json({ success: true, count: logs.length, data: logs });
    } catch (err: any) {
        res.status(500).json({ success: false, error: err?.message || 'Failed to fetch channel manager logs' });
    }
});

export default router;
