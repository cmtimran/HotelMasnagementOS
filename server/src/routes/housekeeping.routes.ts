import { Router, Request, Response } from 'express';
import { housekeepingService } from '../services/housekeeping.service.js';
import { requirePermission } from '../middleware/rbacGuard.js';
import { pgPool } from '../database/postgres.js';

const router = Router();

function getPropertyId(req: any): number {
    return parseInt(
        (req.headers['x-property-id'] as string) || 
        (req.query.propertyId as string) || 
        (req.body.propertyId as string) || 
        '1',
        10
    );
}

// ── 1. Housekeeping Tasks Endpoints ──────────────────────────────────────────

/**
 * GET /api/housekeeping/tasks
 * Retrieve all active / filtered tasks for a property
 */
router.get('/tasks', requirePermission('frontdesk.access'), async (req, res) => {
    try {
        const propertyId = getPropertyId(req);
        const { status, floor, cleanerId } = req.query;
        const tasks = await housekeepingService.getTasks(propertyId, {
            status: status as string,
            floor: floor ? parseInt(floor as string, 10) : undefined,
            cleanerId: cleanerId ? parseInt(cleanerId as string, 10) : undefined
        });

        res.json({
            success: true,
            count: tasks.length,
            data: tasks
        });
    } catch (err: any) {
        console.error('Error fetching housekeeping tasks:', err);
        res.status(500).json({ success: false, error: err.message || 'Failed to fetch tasks' });
    }
});

/**
 * POST /api/housekeeping/tasks
 * Create a new housekeeping work order / task
 */
router.post('/tasks', requirePermission('frontdesk.access'), async (req, res) => {
    try {
        const propertyId = getPropertyId(req);
        const { roomId, taskType, priority, cleanerEmployeeId, cleanerName, reservationId, guestName, specialRequests, creditValue } = req.body;

        if (!roomId || !taskType) {
            return res.status(400).json({ success: false, error: 'roomId and taskType are required' });
        }

        const task = await housekeepingService.createTask({
            propertyId,
            roomId: parseInt(roomId, 10),
            taskType,
            priority,
            cleanerEmployeeId: cleanerEmployeeId ? parseInt(cleanerEmployeeId, 10) : undefined,
            cleanerName,
            reservationId: reservationId ? parseInt(reservationId, 10) : undefined,
            guestName,
            specialRequests,
            creditValue: creditValue ? parseFloat(creditValue) : undefined
        });

        res.status(201).json({
            success: true,
            message: `Housekeeping task #${task.id} created successfully`,
            data: task
        });
    } catch (err: any) {
        console.error('Error creating housekeeping task:', err);
        res.status(500).json({ success: false, error: err.message || 'Failed to create task' });
    }
});

/**
 * PATCH /api/housekeeping/tasks/:id/status
 * Progress task lifecycle (PENDING -> IN_PROGRESS -> COMPLETED -> INSPECTED)
 */
router.patch('/tasks/:id/status', requirePermission('frontdesk.access'), async (req, res) => {
    try {
        const taskId = parseInt(String(req.params.id), 10);
        const { status, cleanerEmployeeId, cleanerName, inspectionNotes } = req.body;

        if (!status || !['PENDING', 'IN_PROGRESS', 'COMPLETED', 'INSPECTED'].includes(status.toUpperCase())) {
            return res.status(400).json({ success: false, error: 'Valid status (PENDING, IN_PROGRESS, COMPLETED, INSPECTED) is required' });
        }

        const result = await housekeepingService.updateTaskStatus(taskId, status.toUpperCase() as any, {
            cleanerEmployeeId: cleanerEmployeeId ? parseInt(cleanerEmployeeId, 10) : undefined,
            cleanerName,
            inspectionNotes,
            updatedBy: (req as any).user?.name || 'Staff'
        });

        res.json({
            success: true,
            message: `Task #${taskId} transitioned to ${status.toUpperCase()}`,
            data: result
        });
    } catch (err: any) {
        console.error(`Error updating housekeeping task #${req.params.id}:`, err);
        res.status(500).json({ success: false, error: err.message || 'Failed to update task' });
    }
});

/**
 * POST /api/housekeeping/tasks/auto-assign
 * Execute automated workload credit balancing and staff allocation
 */
router.post('/tasks/auto-assign', requirePermission('frontdesk.access'), async (req, res) => {
    try {
        const propertyId = getPropertyId(req);
        const { strategy } = req.body;

        const result = await housekeepingService.autoAssignTasks(propertyId, strategy || 'by-floor');

        res.json({
            success: true,
            message: `Successfully auto-assigned ${result.assignedCount} housekeeping tasks across ${result.cleanersCount} attendants`,
            data: result
        });
    } catch (err: any) {
        console.error('Error executing auto-assign:', err);
        res.status(500).json({ success: false, error: err.message || 'Failed to execute auto-assign' });
    }
});

/**
 * POST /api/housekeeping/tasks/:id/inspect
 * POST /api/housekeeping/inspect
 * Submit 8-Point SOP Inspection and release room
 */
const handleSopInspection = async (req: Request, res: Response) => {
    try {
        const propertyId = getPropertyId(req);
        const taskId = req.params.id ? parseInt(String(req.params.id), 10) : (req.body.taskId ? parseInt(String(req.body.taskId), 10) : undefined);
        const { roomId, supervisorId, supervisorName, passed, scorePercentage, checklistData, defectNotes } = req.body;

        if (!roomId) {
            return res.status(400).json({ success: false, error: 'roomId is required' });
        }

        const result = await housekeepingService.recordSopInspection({
            taskId,
            roomId: parseInt(roomId, 10),
            propertyId,
            supervisorId: supervisorId ? parseInt(supervisorId, 10) : undefined,
            supervisorName: supervisorName || (req as any).user?.name || 'Floor Supervisor',
            passed: passed !== false,
            scorePercentage: scorePercentage !== undefined ? parseFloat(scorePercentage) : undefined,
            checklistData: checklistData || {},
            defectNotes
        });

        res.json({
            success: true,
            message: `SOP Inspection recorded. Room marked as ${result.status}`,
            data: result
        });
    } catch (err: any) {
        console.error('Error recording SOP inspection:', err);
        res.status(500).json({ success: false, error: err.message || 'Failed to record inspection' });
    }
};

router.post('/tasks/:id/inspect', requirePermission('frontdesk.access'), handleSopInspection);
router.post('/inspect', requirePermission('frontdesk.access'), handleSopInspection);

// ── 2. Room Discrepancies Endpoints ──────────────────────────────────────────

/**
 * GET /api/housekeeping/discrepancies
 * Retrieve active room discrepancies
 */
router.get('/discrepancies', requirePermission('frontdesk.access'), async (req, res) => {
    try {
        const propertyId = getPropertyId(req);
        const { status } = req.query;
        const discrepancies = await housekeepingService.getDiscrepancies(propertyId, (status as string) || 'ACTIVE');

        res.json({
            success: true,
            count: discrepancies.length,
            data: discrepancies
        });
    } catch (err: any) {
        console.error('Error fetching room discrepancies:', err);
        res.status(500).json({ success: false, error: err.message || 'Failed to fetch discrepancies' });
    }
});

/**
 * POST /api/housekeeping/discrepancies
 * Flag a new physical room discrepancy
 */
router.post('/discrepancies', requirePermission('frontdesk.access'), async (req, res) => {
    try {
        const propertyId = getPropertyId(req);
        const { roomId, roomNumber, discrepancyType, frontDeskStatus, housekeepingFound, guestName, reportedBy, notes } = req.body;

        if (!roomId || !roomNumber || !discrepancyType || !frontDeskStatus || !housekeepingFound) {
            return res.status(400).json({ 
                success: false, 
                error: 'roomId, roomNumber, discrepancyType, frontDeskStatus, and housekeepingFound are required' 
            });
        }

        const discrepancy = await housekeepingService.flagDiscrepancy({
            propertyId,
            roomId: parseInt(roomId, 10),
            roomNumber,
            discrepancyType,
            frontDeskStatus,
            housekeepingFound,
            guestName,
            reportedBy: reportedBy || (req as any).user?.name || 'Housekeeping Staff',
            notes
        });

        res.status(201).json({
            success: true,
            message: `Physical discrepancy flagged for Room ${roomNumber}. Alert dispatched to Front Desk.`,
            data: discrepancy
        });
    } catch (err: any) {
        console.error('Error flagging room discrepancy:', err);
        res.status(500).json({ success: false, error: err.message || 'Failed to flag discrepancy' });
    }
});

/**
 * PATCH /api/housekeeping/discrepancies/:id/resolve
 * Front Desk / Supervisory reconciliation of room discrepancy
 */
router.patch('/discrepancies/:id/resolve', requirePermission('frontdesk.access'), async (req, res) => {
    try {
        const discrepancyId = parseInt(String(req.params.id), 10);
        const { resolvedBy, resolutionNotes } = req.body;

        const resolved = await housekeepingService.resolveDiscrepancy(
            discrepancyId,
            resolvedBy || (req as any).user?.name || 'Duty Manager',
            resolutionNotes || 'Discrepancy reconciled with physical inspection and guest registration.'
        );

        res.json({
            success: true,
            message: `Discrepancy #${discrepancyId} successfully resolved and cleared.`,
            data: resolved
        });
    } catch (err: any) {
        console.error(`Error resolving discrepancy #${req.params.id}:`, err);
        res.status(500).json({ success: false, error: err.message || 'Failed to resolve discrepancy' });
    }
});

// ── 3. Housekeepers Roster & Shift Workload ──────────────────────────────────

/**
 * GET /api/housekeeping/roster
 * Fetch on-duty housekeepers from PostgreSQL employees table
 */
router.get('/roster', requirePermission('frontdesk.access'), async (req, res) => {
    try {
        const propertyId = getPropertyId(req);

        const employeesRes = await pgPool.query(`
            SELECT 
                e.id,
                e.employee_code,
                TRIM(CONCAT(e.first_name, ' ', e.last_name)) as name,
                e.phone,
                COALESCE(d.name, 'Housekeeping') as department,
                COALESCE(des.title, 'Room Attendant') as position,
                e.status,
                COALESCE(SUM(ht.credit_value) FILTER (WHERE ht.status IN ('PENDING', 'IN_PROGRESS')), 0.0) as current_credits,
                COUNT(ht.id) FILTER (WHERE ht.status IN ('PENDING', 'IN_PROGRESS')) as assigned_rooms_count
            FROM employees e
            LEFT JOIN departments d ON d.id = e.department_id
            LEFT JOIN designations des ON des.id = e.designation_id
            LEFT JOIN housekeeping_tasks ht ON ht.cleaner_employee_id = e.id AND ht.property_id = $1
            WHERE e.property_id = $1
              AND (d.name ILIKE '%housekeep%' OR des.title ILIKE '%clean%' OR des.title ILIKE '%attendant%' OR des.title ILIKE '%maid%')
            GROUP BY e.id, e.employee_code, e.first_name, e.last_name, e.phone, d.name, des.title, e.status
            ORDER BY name ASC;
        `, [propertyId]);

        let roster = employeesRes.rows;
        if (roster.length === 0) {
            // Fallback to general active employees
            const fallbackRes = await pgPool.query(`
                SELECT 
                    e.id,
                    e.employee_code,
                    TRIM(CONCAT(e.first_name, ' ', e.last_name)) as name,
                    e.phone,
                    'Housekeeping' as department,
                    'Room Attendant' as position,
                    e.status,
                    0.0 as current_credits,
                    0 as assigned_rooms_count
                FROM employees e
                WHERE e.property_id = $1 AND e.status = 'ACTIVE'
                LIMIT 6;
            `, [propertyId]);
            roster = fallbackRes.rows;
        }

        res.json({
            success: true,
            count: roster.length,
            data: roster.map((r, idx) => ({
                id: String(r.id),
                employeeId: r.employee_code || `HK-${101 + idx}`,
                name: r.name || `Attendant ${idx + 1}`,
                phone: r.phone || '+880 1711 000000',
                shift: 'Morning (07:00 - 15:30)',
                assignedZone: `Floor ${idx + 1}`,
                status: r.status ? r.status.toLowerCase() : 'active',
                maxCredits: 14.0,
                currentCredits: parseFloat(r.current_credits) || 0.0,
                assignedRoomsCount: parseInt(r.assigned_rooms_count, 10) || 0
            }))
        });
    } catch (err: any) {
        console.error('Error fetching housekeeping roster:', err);
        res.status(500).json({ success: false, error: err.message || 'Failed to fetch roster' });
    }
});

// ── 4. Housekeeping Settings ─────────────────────────────────────────────────

/**
 * GET /api/housekeeping/settings
 * Retrieve property-scoped housekeeping configuration
 */
router.get('/settings', requirePermission('frontdesk.access'), async (req, res) => {
    try {
        const propertyId = getPropertyId(req);
        const settings = await housekeepingService.getSettings(propertyId);
        res.json({ success: true, data: settings });
    } catch (err: any) {
        console.error('Error fetching housekeeping settings:', err);
        res.status(500).json({ success: false, error: err.message || 'Failed to fetch settings' });
    }
});

/**
 * PUT /api/housekeeping/settings
 * Update property-scoped housekeeping configuration
 */
router.put('/settings', requirePermission('frontdesk.access'), async (req, res) => {
    try {
        const propertyId = getPropertyId(req);
        const updated = await housekeepingService.updateSettings(propertyId, req.body);
        res.json({
            success: true,
            message: 'Housekeeping settings updated successfully',
            data: updated
        });
    } catch (err: any) {
        console.error('Error updating housekeeping settings:', err);
        res.status(500).json({ success: false, error: err.message || 'Failed to update settings' });
    }
});

// ── 5. Minibar In-Room Billing & Dynamic Catalog Management ─────────────────

/**
 * GET /api/housekeeping/minibar-items
 * Retrieve all active minibar items from dynamic catalog
 */
router.get('/minibar-items', async (req: Request, res: Response) => {
    try {
        const propertyId = getPropertyId(req);
        const { category } = req.query;

        let query = `
            SELECT id, property_id, name, category, price, par_stock, is_active, created_at, updated_at
            FROM minibar_items
            WHERE property_id = $1 AND is_active = TRUE
        `;
        const params: any[] = [propertyId];

        if (category && category !== 'ALL') {
            params.push(category);
            query += ` AND category = $${params.length}`;
        }

        query += ` ORDER BY category ASC, name ASC;`;

        const result = await pgPool.query(query, params);
        res.json({
            success: true,
            count: result.rows.length,
            data: result.rows.map(row => ({
                id: String(row.id),
                name: row.name,
                category: row.category,
                price: parseFloat(row.price),
                parStock: row.par_stock,
                isActive: row.is_active
            }))
        });
    } catch (err: any) {
        console.error('Error fetching minibar items:', err);
        res.status(500).json({ success: false, error: err.message || 'Failed to fetch minibar catalog' });
    }
});

/**
 * POST /api/housekeeping/minibar-items
 * Dynamically register a new item in the minibar catalog
 */
router.post('/minibar-items', async (req: Request, res: Response) => {
    try {
        const propertyId = getPropertyId(req);
        const { name, category = 'Beverage', price, parStock = 2 } = req.body;

        if (!name || typeof name !== 'string' || name.trim().length === 0) {
            return res.status(400).json({ success: false, error: 'Item name is required' });
        }
        const numericPrice = Number(price);
        if (isNaN(numericPrice) || numericPrice < 0) {
            return res.status(400).json({ success: false, error: 'Valid non-negative price is required' });
        }

        const insertRes = await pgPool.query(`
            INSERT INTO minibar_items (property_id, name, category, price, par_stock, is_active)
            VALUES ($1, $2, $3, $4, $5, TRUE)
            RETURNING id, property_id, name, category, price, par_stock, is_active, created_at;
        `, [propertyId, name.trim(), category.trim(), numericPrice, Math.max(1, Number(parStock) || 2)]);

        const created = insertRes.rows[0];
        res.status(201).json({
            success: true,
            data: {
                id: String(created.id),
                name: created.name,
                category: created.category,
                price: parseFloat(created.price),
                parStock: created.par_stock,
                isActive: created.is_active
            },
            message: `Added "${created.name}" to Minibar Catalog`
        });
    } catch (err: any) {
        console.error('Error creating minibar item:', err);
        res.status(500).json({ success: false, error: err.message || 'Failed to create minibar item' });
    }
});

/**
 * PUT /api/housekeeping/minibar-items/:id
 * Update an existing minibar catalog item
 */
router.put('/minibar-items/:id', async (req: Request, res: Response) => {
    try {
        const propertyId = getPropertyId(req);
        const { id } = req.params;
        const { name, category, price, parStock, isActive } = req.body;

        const updateRes = await pgPool.query(`
            UPDATE minibar_items
            SET 
                name = COALESCE($1, name),
                category = COALESCE($2, category),
                price = COALESCE($3, price),
                par_stock = COALESCE($4, par_stock),
                is_active = COALESCE($5, is_active),
                updated_at = CURRENT_TIMESTAMP
            WHERE id = $6 AND property_id = $7
            RETURNING id, name, category, price, par_stock, is_active;
        `, [
            name ? name.trim() : null,
            category ? category.trim() : null,
            price !== undefined ? Number(price) : null,
            parStock !== undefined ? Number(parStock) : null,
            isActive !== undefined ? Boolean(isActive) : null,
            id,
            propertyId
        ]);

        if (updateRes.rows.length === 0) {
            return res.status(404).json({ success: false, error: 'Minibar item not found' });
        }

        res.json({
            success: true,
            data: updateRes.rows[0],
            message: 'Minibar item updated successfully'
        });
    } catch (err: any) {
        console.error('Error updating minibar item:', err);
        res.status(500).json({ success: false, error: err.message || 'Failed to update minibar item' });
    }
});

/**
 * DELETE /api/housekeeping/minibar-items/:id
 * Soft delete a minibar catalog item
 */
router.delete('/minibar-items/:id', async (req: Request, res: Response) => {
    try {
        const propertyId = getPropertyId(req);
        const { id } = req.params;

        const deleteRes = await pgPool.query(`
            UPDATE minibar_items
            SET is_active = FALSE, updated_at = CURRENT_TIMESTAMP
            WHERE id = $1 AND property_id = $2
            RETURNING id, name;
        `, [id, propertyId]);

        if (deleteRes.rows.length === 0) {
            return res.status(404).json({ success: false, error: 'Minibar item not found' });
        }

        res.json({
            success: true,
            message: `Deactivated minibar item "${deleteRes.rows[0].name}"`
        });
    } catch (err: any) {
        console.error('Error deleting minibar item:', err);
        res.status(500).json({ success: false, error: err.message || 'Failed to deactivate minibar item' });
    }
});

/**
 * POST /api/housekeeping/minibar-post
 * Real-time In-Room Minibar Consumption Audit & Instant Folio Charge Posting
 */
router.post('/minibar-post', async (req: Request, res: Response) => {
    const client = await pgPool.connect();
    try {
        await client.query('BEGIN');
        const propertyId = getPropertyId(req);
        const { roomNumber, items = [], attendedBy = 'Housekeeping Staff' } = req.body;

        if (!roomNumber) {
            return res.status(400).json({ success: false, error: 'Room number is required' });
        }
        if (!items || !Array.isArray(items) || items.length === 0) {
            return res.status(400).json({ success: false, error: 'Consumed items cannot be empty' });
        }

        // 1. Locate active in-house reservation for this room
        const resRes = await client.query(`
            SELECT r.id as res_id, r.guest_name, f.id as folio_id, f.folio_number
            FROM reservation_rooms rr
            JOIN rooms rm ON rm.id = rr.room_id
            JOIN reservations r ON r.id = rr.reservation_id
            LEFT JOIN folios f ON f.reservation_id = r.id AND f.status = 'OPEN'
            WHERE rm.room_number = $1
              AND rr.status IN ('CHECKED_IN', 'IN_HOUSE', 'CONFIRMED')
            ORDER BY rr.id DESC LIMIT 1;
        `, [String(roomNumber).trim()]);

        if (resRes.rows.length === 0) {
            await client.query('ROLLBACK');
            return res.status(404).json({ success: false, error: `No active in-house reservation found for Room ${roomNumber}. Cannot post minibar charge.` });
        }

        const activeReservation = resRes.rows[0];
        let folioId = activeReservation.folio_id;

        if (!folioId) {
            const anyFolio = await client.query('SELECT id, folio_number FROM folios WHERE reservation_id = $1 LIMIT 1', [activeReservation.res_id]);
            folioId = anyFolio.rows[0]?.id;
        }

        if (!folioId) {
            await client.query('ROLLBACK');
            return res.status(400).json({ success: false, error: `No open folio found for Room ${roomNumber}` });
        }

        // 2. Calculate consumed total and item descriptions
        let totalAmount = 0;
        const descriptions: string[] = [];
        for (const it of items) {
            const qty = Math.max(1, Math.floor(Number(it.quantity) || 1));
            const price = Math.max(0, Number(it.price) || 0);
            const itemTotal = qty * price;
            totalAmount += itemTotal;
            descriptions.push(`${qty}x ${it.name} (৳${itemTotal})`);
        }

        if (totalAmount <= 0) {
            await client.query('ROLLBACK');
            return res.status(400).json({ success: false, error: 'Total minibar amount must be greater than zero' });
        }

        const summaryDesc = `Minibar Consumption: ${descriptions.join(', ')}`;
        const dateStr = new Date().toISOString().split('T')[0];
        const refNo = `MB-${Date.now().toString().slice(-6)}`;
        const authenticatedUser = (req as any).user?.name || attendedBy;

        // 3. Insert Charge into folio_charges
        const chargeInsert = await client.query(`
            INSERT INTO folio_charges (
                folio_id, charge_code, revenue_head, ref_no, description,
                amount, discount_amount, service_charge, vat, city_tax,
                total_tax, total_amount, charge_date, is_tax_applicable, user_name
            ) VALUES ($1, 'MINIBAR', '10020-03', $2, $3, $4, 0.00, 0.00, 0.00, 0.00, 0.00, $5, $6, FALSE, $7)
            RETURNING id;
        `, [folioId, refNo, summaryDesc, totalAmount, totalAmount, dateStr, authenticatedUser]);

        const chargeId = chargeInsert.rows[0]?.id;

        // 4. Update Folio Balance
        await client.query(`
            UPDATE folios 
            SET balance = balance + $1, updated_at = CURRENT_TIMESTAMP
            WHERE id = $2;
        `, [totalAmount, folioId]);

        // 5. Audit Trail
        await client.query(`
            INSERT INTO folio_audit_trail (folio_id, reservation_id, action_type, description, user_name)
            VALUES ($1, $2, 'CHARGE_POSTED', $3, $4);
        `, [folioId, activeReservation.res_id, `Posted Minibar charge for Room ${roomNumber}: ৳${totalAmount.toFixed(2)} [${summaryDesc}]`, authenticatedUser]);

        await client.query('COMMIT');

        // Broadcast real-time event to Front Desk
        try {
            const { broadcastServerEvent } = await import('./realtime.routes.js');
            broadcastServerEvent({
                type: 'FOLIO_UPDATED',
                propertyId,
                folioId,
                amount: totalAmount,
                reason: 'MINIBAR'
            });
        } catch {}

        res.status(201).json({
            success: true,
            chargeId,
            refNo,
            totalAmount,
            folioId,
            guestName: activeReservation.guest_name,
            message: `Minibar charge of ৳${totalAmount.toFixed(2)} posted directly to Room ${roomNumber} (Folio #${folioId})`
        });
    } catch (err: any) {
        await client.query('ROLLBACK');
        console.error('Error posting minibar charge:', err);
        res.status(500).json({ success: false, error: err.message || 'Failed to post minibar charge' });
    } finally {
        client.release();
    }
});

export default router;
