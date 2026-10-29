import { Router, type Request, type Response } from 'express';
import { NightAuditService } from '../services/nightAudit.service.js';
import { db } from '../database/db.js';

export const nightAuditRoutes = Router();

/**
 * GET /api/night-audit/status
 * Retrieve operational business date and verify pre-flight readiness (pending arrivals, departures, cash drawers)
 */
nightAuditRoutes.get('/status', async (req: Request, res: Response) => {
    try {
        const rawPropId = req.query.propertyId || req.headers['x-property-id'] || (req as any).propertyId;
        const propertyId = rawPropId ? Number(rawPropId) : 1;

        const status = await NightAuditService.getPreFlightStatus(propertyId);
        res.json({
            success: true,
            data: status
        });
    } catch (err: any) {
        console.error('❌ [Night Audit Routes] Status Error:', err);
        res.status(500).json({
            success: false,
            error: err.message || 'Failed to retrieve night audit pre-flight status'
        });
    }
});

/**
 * POST /api/night-audit/execute
 * Execute Authoritative ACID Night Audit Transaction
 */
nightAuditRoutes.post('/execute', async (req: Request, res: Response) => {
    try {
        const rawPropId = req.body.propertyId || req.headers['x-property-id'] || (req as any).propertyId;
        const propertyId = rawPropId ? Number(rawPropId) : 1;

        const { forceOverride, autoDirtyRooms, performedBy } = req.body;

        const result = await NightAuditService.executeNightAudit(propertyId, {
            forceOverride: Boolean(forceOverride),
            autoDirtyRooms: autoDirtyRooms !== false,
            performedBy: performedBy || 'System Admin'
        });

        res.json({
            success: true,
            message: `Night audit successfully completed. Business date advanced to ${result.newBusinessDate}.`,
            data: result
        });
    } catch (err: any) {
        console.error('❌ [Night Audit Routes] Execution Error:', err);
        res.status(400).json({
            success: false,
            error: err.message || 'Night audit execution encountered an error'
        });
    }
});

/**
 * GET /api/night-audit/logs
 * Retrieve historical night audit execution logs
 */
nightAuditRoutes.get('/logs', async (req: Request, res: Response) => {
    try {
        const rawPropId = req.query.propertyId || req.headers['x-property-id'] || (req as any).propertyId;
        const propertyId = rawPropId ? Number(rawPropId) : 1;

        const logs = await db.prepare(`
            SELECT id, property_id, audit_date, performed_by, rooms_posted, 
                   total_room_revenue, total_tax_posted, in_house_count, 
                   arrivals_pending, departures_pending, status, details_json, created_at
            FROM night_audit_logs
            WHERE property_id = ?
            ORDER BY created_at DESC
            LIMIT 30;
        `).all(propertyId).catch(() => []);

        res.json({
            success: true,
            count: logs.length,
            data: logs
        });
    } catch (err: any) {
        res.status(500).json({
            success: false,
            error: err.message || 'Failed to fetch night audit logs'
        });
    }
});
