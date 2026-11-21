import { Router, Request, Response } from 'express';
import { ChannelManagerService } from '../services/channelManager.service.js';
import { pgPool } from '../database/postgres.js';

const router = Router();

function getPropertyId(req: Request): number {
    const raw = req.query.propertyId || req.headers['x-property-id'] || req.body?.propertyId || (req as any).propertyId;
    return Number(raw) || 1;
}

// 1. GET /api/channel-manager/channels - List all connected OTA channels
router.get('/channels', async (req: Request, res: Response) => {
    try {
        const propertyId = getPropertyId(req);
        const result = await ChannelManagerService.getChannelConnections(propertyId);
        res.json(result);
    } catch (err: any) {
        res.status(500).json({ success: false, error: err?.message || 'Failed to fetch channels' });
    }
});

// 1b. POST /api/channel-manager/channels - Onboard / Create a new OTA Channel
router.post('/channels', async (req: Request, res: Response) => {
    try {
        const propertyId = getPropertyId(req);
        const result = await ChannelManagerService.createChannelConnection(propertyId, req.body);
        res.json(result);
    } catch (err: any) {
        res.status(500).json({ success: false, error: err?.message || 'Failed to onboard channel' });
    }
});

// 2. PUT /api/channel-manager/channels/:id - Update channel settings
router.put('/channels/:id', async (req: Request, res: Response) => {
    try {
        const propertyId = getPropertyId(req);
        const channelId = String(req.params.id);
        const result = await ChannelManagerService.updateChannelConnection(propertyId, channelId, req.body);
        res.json(result);
    } catch (err: any) {
        res.status(500).json({ success: false, error: err?.message || 'Failed to update channel' });
    }
});

// 3. POST /api/channel-manager/channels/:id/toggle - Toggle channel active status
router.post('/channels/:id/toggle', async (req: Request, res: Response) => {
    try {
        const propertyId = getPropertyId(req);
        const channelId = String(req.params.id);
        const result = await ChannelManagerService.toggleChannel(propertyId, channelId);
        res.json(result);
    } catch (err: any) {
        res.status(500).json({ success: false, error: err?.message || 'Failed to toggle channel status' });
    }
});

// 4. GET /api/channel-manager/kpi - Summary KPIs
router.get('/kpi', async (req: Request, res: Response) => {
    try {
        const propertyId = getPropertyId(req);
        const result = await ChannelManagerService.getKPIs(propertyId);
        res.json(result);
    } catch (err: any) {
        res.status(500).json({ success: false, error: err?.message || 'Failed to compute KPIs' });
    }
});

// 5. GET /api/channel-manager/ari - Live ARI Matrix for distribution
router.get('/ari', async (req: Request, res: Response) => {
    try {
        const propertyId = getPropertyId(req);
        const startDate = (req.query.startDate as string) || new Date().toISOString().slice(0, 10);
        const endDate = (req.query.endDate as string) || new Date(Date.now() + 14 * 24 * 3600 * 1000).toISOString().slice(0, 10);

        const matrix = await ChannelManagerService.getARIMatrix(propertyId, startDate, endDate);
        res.json(matrix);
    } catch (err: any) {
        res.status(500).json({ success: false, error: err?.message || 'Failed to compute ARI matrix' });
    }
});

// 6. POST /api/channel-manager/bulk-update - Distribution Wizard Bulk Update
router.post('/bulk-update', async (req: Request, res: Response) => {
    try {
        const propertyId = getPropertyId(req);
        const {
            channelIds,
            roomTypeIds,
            startDate,
            endDate,
            daysOfWeek = [0, 1, 2, 3, 4, 5, 6],
            rateAction = 'NONE',
            rateValue = 0,
            stopSellAction = 'NO_CHANGE',
            minStay,
            ctaAction = 'NO_CHANGE',
            ctdAction = 'NO_CHANGE'
        } = req.body;

        if (!roomTypeIds || !Array.isArray(roomTypeIds) || roomTypeIds.length === 0) {
            return res.status(400).json({ success: false, error: 'At least one Room Type is required' });
        }
        if (!startDate || !endDate) {
            return res.status(400).json({ success: false, error: 'Start Date and End Date are required' });
        }

        const result = await ChannelManagerService.bulkUpdateARI({
            propertyId,
            channelIds,
            roomTypeIds: roomTypeIds.map(Number),
            startDate,
            endDate,
            daysOfWeek: Array.isArray(daysOfWeek) ? daysOfWeek.map(Number) : [0, 1, 2, 3, 4, 5, 6],
            rateAction,
            rateValue: Number(rateValue) || 0,
            stopSellAction,
            minStay: minStay ? Number(minStay) : undefined,
            ctaAction,
            ctdAction
        });

        res.json(result);
    } catch (err: any) {
        res.status(500).json({ success: false, error: err?.message || 'Bulk update failed' });
    }
});

// 7. GET /api/channel-manager/mappings - Room & Rate mappings
router.get('/mappings', async (req: Request, res: Response) => {
    try {
        const propertyId = getPropertyId(req);
        const channelId = req.query.channelId as string | undefined;
        const result = await ChannelManagerService.getChannelMappings(propertyId, channelId);
        res.json(result);
    } catch (err: any) {
        res.status(500).json({ success: false, error: err?.message || 'Failed to fetch mappings' });
    }
});

// 8. POST /api/channel-manager/mappings - Create or update mapping
router.post('/mappings', async (req: Request, res: Response) => {
    try {
        const propertyId = getPropertyId(req);
        const result = await ChannelManagerService.saveChannelMapping(propertyId, req.body);
        res.json(result);
    } catch (err: any) {
        res.status(500).json({ success: false, error: err?.message || 'Failed to save mapping' });
    }
});

// 9. DELETE /api/channel-manager/mappings/:id - Remove mapping
router.delete('/mappings/:id', async (req: Request, res: Response) => {
    try {
        const propertyId = getPropertyId(req);
        const id = Number(req.params.id);
        const result = await ChannelManagerService.deleteChannelMapping(propertyId, id);
        res.json(result);
    } catch (err: any) {
        res.status(500).json({ success: false, error: err?.message || 'Failed to delete mapping' });
    }
});

// 10. GET /api/channel-manager/bookings - Inbound channel bookings queue
router.get('/bookings', async (req: Request, res: Response) => {
    try {
        const propertyId = getPropertyId(req);
        const channelId = req.query.channelId as string | undefined;
        const result = await ChannelManagerService.getChannelBookings(propertyId, channelId);
        res.json(result);
    } catch (err: any) {
        res.status(500).json({ success: false, error: err?.message || 'Failed to fetch channel bookings' });
    }
});

// 11. POST /api/channel-manager/bookings/fetch-live - Fetch pending bookings from OTA extranets
router.post('/bookings/fetch-live', async (req: Request, res: Response) => {
    try {
        const propertyId = getPropertyId(req);
        const result = await ChannelManagerService.fetchLiveBookingsFromOTA(propertyId);
        res.json(result);
    } catch (err: any) {
        res.status(500).json({ success: false, error: err?.message || 'Failed to fetch live OTA bookings' });
    }
});

// 12. POST /api/channel-manager/bookings/:ref/unassign - Revert a channel booking's room to UNASSIGNED
router.post('/bookings/:ref/unassign', async (req: Request, res: Response) => {
    try {
        const propertyId = getPropertyId(req);
        const rawRef = req.params.ref;
        const ref = String(Array.isArray(rawRef) ? rawRef[0] : (rawRef || ''));
        const result = await ChannelManagerService.unassignChannelBooking(propertyId, ref);
        res.json(result);
    } catch (err: any) {
        res.status(500).json({ success: false, error: err?.message || 'Failed to unassign channel booking' });
    }
});

// 12b. POST /api/channel-manager/bookings/:ref/resolve - Resolve overbooking deficit via Upgrade/Relocate/OTA Notice
router.post('/bookings/:ref/resolve', async (req: Request, res: Response) => {
    try {
        const propertyId = getPropertyId(req);
        const rawRef = req.params.ref;
        const ref = String(Array.isArray(rawRef) ? rawRef[0] : (rawRef || ''));
        const { resolutionType, upgradeRoomTypeId, upgradeRoomTypeName, sisterHotelName, notes } = req.body;
        const result = await ChannelManagerService.resolveOverbookingDeficit(propertyId, ref, {
            resolutionType: resolutionType || 'UPGRADE',
            upgradeRoomTypeId,
            upgradeRoomTypeName,
            sisterHotelName,
            notes
        });
        res.json(result);
    } catch (err: any) {
        res.status(500).json({ success: false, error: err?.message || 'Failed to resolve overbooking deficit' });
    }
});

// 12c. POST /api/channel-manager/emergency-stop-sell - Emergency Kill-Switch to halt all OTA sales
router.post('/emergency-stop-sell', async (req: Request, res: Response) => {
    try {
        const propertyId = getPropertyId(req);
        const { roomTypeId, startDate, endDate } = req.body;
        const result = await ChannelManagerService.emergencyStopSell(propertyId, {
            roomTypeId,
            startDate,
            endDate
        });
        res.json(result);
    } catch (err: any) {
        res.status(500).json({ success: false, error: err?.message || 'Failed to execute emergency stop-sell' });
    }
});

// 12. POST /api/channel-manager/push-ari - Broadcast inventory/rates to connected OTAs
router.post('/push-ari', async (req: Request, res: Response) => {
    try {
        const propertyId = getPropertyId(req);
        const channels = req.body.channels;
        const result = await ChannelManagerService.broadcastARIPush(propertyId, channels);
        res.json(result);
    } catch (err: any) {
        res.status(500).json({ success: false, error: err?.message || 'Failed to broadcast ARI push' });
    }
});

// 13. POST /api/channel-manager/webhook/ota-booking - Inbound OTA booking webhook
router.post('/webhook/ota-booking', async (req: Request, res: Response) => {
    try {
        const propertyId = getPropertyId(req);

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

// 14. GET /api/channel-manager/logs - Channel Manager sync audit trail
router.get('/logs', async (req: Request, res: Response) => {
    try {
        const propertyId = getPropertyId(req);

        let logs: any[] = [];
        try {
            const result = await pgPool.query(`
                SELECT * FROM channel_manager_logs 
                WHERE property_id = $1 
                ORDER BY created_at DESC 
                LIMIT 100
            `, [propertyId]);
            logs = result.rows;
        } catch {
            logs = [];
        }

        res.json({ success: true, count: logs.length, data: logs });
    } catch (err: any) {
        res.status(500).json({ success: false, error: err?.message || 'Failed to fetch channel manager logs' });
    }
});

export default router;
