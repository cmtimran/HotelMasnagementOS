import { pgPool } from '../database/postgres.js';
import { broadcastServerEvent } from '../routes/realtime.routes.js';

export interface HousekeepingTaskRow {
    id: number;
    property_id: number;
    room_id: number;
    room_number: string;
    room_type: string;
    floor_number: number;
    cleaner_employee_id: number | null;
    assigned_employee_name: string | null;
    task_type: 'TURNOVER' | 'DAILY_CLEAN' | 'DEEP_CLEAN';
    priority: 'LOW' | 'NORMAL' | 'HIGH' | 'RUSH';
    status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'INSPECTED';
    credit_value: number;
    is_rush: boolean;
    is_linen_due: boolean;
    is_dnd: boolean;
    special_requests: string | null;
    inspection_notes: string | null;
    reservation_id: number | null;
    guest_name: string | null;
    created_at: string;
    started_at: string | null;
    completed_at: string | null;
}

export interface SopInspectionPayload {
    taskId?: number;
    roomId: number;
    propertyId: number;
    supervisorId?: number;
    supervisorName: string;
    passed: boolean;
    scorePercentage?: number;
    checklistData: Record<string, boolean>;
    defectNotes?: string;
}

export interface DiscrepancyPayload {
    propertyId: number;
    roomId: number;
    roomNumber: string;
    discrepancyType: 'Sleep Discrepancy' | 'Skip Discrepancy (Skipper)' | 'Person Count Mismatch' | 'Luggage Without Guest';
    frontDeskStatus: string;
    housekeepingFound: string;
    guestName?: string;
    reportedBy: string;
    notes?: string;
}

export class HousekeepingService {
    /**
     * Fetch all active or filtered housekeeping tasks for a property
     */
    async getTasks(propertyId: number, options: { status?: string; floor?: number; cleanerId?: number } = {}) {
        let query = `
            SELECT 
                ht.id,
                ht.property_id,
                ht.room_id,
                r.room_number,
                rt.name as room_type,
                COALESCE(ht.floor_number, r.floor_id::int, 1) as floor_number,
                ht.cleaner_employee_id,
                ht.assigned_employee_name,
                ht.task_type,
                ht.priority,
                ht.status,
                ht.credit_value,
                ht.is_rush,
                ht.is_linen_due,
                ht.is_dnd,
                ht.special_requests,
                ht.inspection_notes,
                ht.reservation_id,
                ht.guest_name,
                r.housekeeping_status as room_hk_status,
                r.status as room_operational_status,
                ht.created_at,
                ht.started_at,
                ht.completed_at
            FROM housekeeping_tasks ht
            JOIN rooms r ON r.id = ht.room_id
            LEFT JOIN room_types rt ON rt.id = r.room_type_id
            WHERE ht.property_id = $1
        `;
        const params: any[] = [propertyId];

        if (options.status && options.status !== 'all') {
            params.push(options.status.toUpperCase());
            query += ` AND ht.status = $${params.length}`;
        }
        if (options.floor && options.floor > 0) {
            params.push(options.floor);
            query += ` AND COALESCE(ht.floor_number, r.floor_id::int, 1) = $${params.length}`;
        }
        if (options.cleanerId && options.cleanerId > 0) {
            params.push(options.cleanerId);
            query += ` AND ht.cleaner_employee_id = $${params.length}`;
        }

        query += ` ORDER BY CASE WHEN ht.priority = 'RUSH' THEN 1 WHEN ht.priority = 'HIGH' THEN 2 WHEN ht.priority = 'NORMAL' THEN 3 ELSE 4 END, r.room_number ASC;`;

        const res = await pgPool.query(query, params);
        return res.rows;
    }

    /**
     * Create a new housekeeping task
     */
    async createTask(data: {
        propertyId: number;
        roomId: number;
        taskType: 'TURNOVER' | 'DAILY_CLEAN' | 'DEEP_CLEAN';
        priority?: 'LOW' | 'NORMAL' | 'HIGH' | 'RUSH';
        cleanerEmployeeId?: number;
        cleanerName?: string;
        reservationId?: number;
        guestName?: string;
        specialRequests?: string;
        creditValue?: number;
    }) {
        const priority = data.priority || 'NORMAL';
        const creditValue = data.creditValue || (data.taskType === 'TURNOVER' ? 1.0 : 0.5);

        const res = await pgPool.query(`
            INSERT INTO housekeeping_tasks (
                property_id, room_id, cleaner_employee_id, assigned_employee_name,
                task_type, priority, status, credit_value, special_requests,
                reservation_id, guest_name, created_at
            ) VALUES (
                $1, $2, $3, $4, $5, $6, 'PENDING', $7, $8, $9, $10, CURRENT_TIMESTAMP
            )
            RETURNING *;
        `, [
            data.propertyId,
            data.roomId,
            data.cleanerEmployeeId || null,
            data.cleanerName || null,
            data.taskType,
            priority,
            creditValue,
            data.specialRequests || null,
            data.reservationId || null,
            data.guestName || null
        ]);

        return res.rows[0];
    }

    /**
     * Progress task status (PENDING -> IN_PROGRESS -> COMPLETED -> INSPECTED)
     * Automatically syncs the room's housekeeping_status in rooms table.
     */
    async updateTaskStatus(taskId: number, newStatus: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'INSPECTED', meta: {
        cleanerEmployeeId?: number;
        cleanerName?: string;
        inspectionNotes?: string;
        updatedBy?: string;
    } = {}) {
        const client = await pgPool.connect();
        try {
            await client.query('BEGIN');

            const taskRes = await client.query('SELECT * FROM housekeeping_tasks WHERE id = $1 FOR UPDATE;', [taskId]);
            if (taskRes.rows.length === 0) {
                throw new Error(`Housekeeping task #${taskId} not found`);
            }
            const task = taskRes.rows[0];

            let startedAt = task.started_at;
            let completedAt = task.completed_at;

            if (newStatus === 'IN_PROGRESS' && !startedAt) {
                startedAt = new Date().toISOString();
            } else if (newStatus === 'COMPLETED' || newStatus === 'INSPECTED') {
                if (!startedAt) startedAt = new Date().toISOString();
                completedAt = new Date().toISOString();
            }

            const updatedTaskRes = await client.query(`
                UPDATE housekeeping_tasks
                SET status = $1,
                    cleaner_employee_id = COALESCE($2, cleaner_employee_id),
                    assigned_employee_name = COALESCE($3, assigned_employee_name),
                    inspection_notes = COALESCE($4, inspection_notes),
                    started_at = $5,
                    completed_at = $6
                WHERE id = $7
                RETURNING *;
            `, [
                newStatus,
                meta.cleanerEmployeeId || null,
                meta.cleanerName || null,
                meta.inspectionNotes || null,
                startedAt,
                completedAt,
                taskId
            ]);

            // Sync room status based on task progression
            let roomHkStatus = 'DIRTY';
            if (newStatus === 'COMPLETED') {
                roomHkStatus = 'CLEAN';
            } else if (newStatus === 'INSPECTED') {
                roomHkStatus = 'INSPECTED';
            }

            const roomRes = await client.query(`
                UPDATE rooms
                SET housekeeping_status = $1,
                    updated_at = CURRENT_TIMESTAMP
                WHERE id = $2
                RETURNING room_number, housekeeping_status;
            `, [roomHkStatus, task.room_id]);

            await client.query('COMMIT');

            const roomNumber = roomRes.rows[0]?.room_number;
            // Broadcast live status event across all connected terminals
            broadcastServerEvent({
                type: 'ROOM_STATUS_CHANGED',
                roomNo: roomNumber,
                hkStatus: roomHkStatus.toLowerCase()
            }, 'HOUSEKEEPING_SERVICE');

            broadcastServerEvent({
                type: 'HK_TASK_UPDATED',
                taskId,
                roomNo: roomNumber,
                status: newStatus
            }, 'HOUSEKEEPING_SERVICE');

            return {
                task: updatedTaskRes.rows[0],
                roomNumber,
                roomHkStatus
            };
        } catch (err) {
            await client.query('ROLLBACK');
            throw err;
        } finally {
            client.release();
        }
    }

    /**
     * Record 8-Point SOP Inspection and update room status
     */
    async recordSopInspection(payload: SopInspectionPayload) {
        const client = await pgPool.connect();
        try {
            await client.query('BEGIN');

            const score = payload.scorePercentage !== undefined 
                ? payload.scorePercentage 
                : (payload.passed ? 100.0 : 50.0);

            const inspRes = await client.query(`
                INSERT INTO housekeeping_sop_inspections (
                    task_id, room_id, property_id, supervisor_id, supervisor_name,
                    passed, score_percentage, checklist_data, defect_notes, inspected_at
                ) VALUES (
                    $1, $2, $3, $4, $5, $6, $7, $8, $9, CURRENT_TIMESTAMP
                )
                RETURNING *;
            `, [
                payload.taskId || null,
                payload.roomId,
                payload.propertyId,
                payload.supervisorId || null,
                payload.supervisorName,
                payload.passed,
                score,
                JSON.stringify(payload.checklistData || {}),
                payload.defectNotes || null
            ]);

            // If passed, mark room INSPECTED; if failed, mark room DIRTY and task PENDING
            const targetHkStatus = payload.passed ? 'INSPECTED' : 'DIRTY';
            const roomRes = await client.query(`
                UPDATE rooms 
                SET housekeeping_status = $1,
                    updated_at = CURRENT_TIMESTAMP
                WHERE id = $2
                RETURNING room_number;
            `, [targetHkStatus, payload.roomId]);

            if (payload.taskId) {
                const targetTaskStatus = payload.passed ? 'INSPECTED' : 'PENDING';
                await client.query(`
                    UPDATE housekeeping_tasks
                    SET status = $1,
                        inspection_notes = $2,
                        completed_at = CASE WHEN $1 = 'INSPECTED' THEN CURRENT_TIMESTAMP ELSE completed_at END
                    WHERE id = $3;
                `, [
                    targetTaskStatus,
                    payload.defectNotes ? `Inspection Result (${score}%): ${payload.defectNotes}` : `Inspection Passed (${score}%)`,
                    payload.taskId
                ]);
            }

            await client.query('COMMIT');

            const roomNo = roomRes.rows[0]?.room_number;
            broadcastServerEvent({
                type: 'ROOM_STATUS_CHANGED',
                roomNo,
                hkStatus: targetHkStatus.toLowerCase()
            }, 'SOP_INSPECTION');

            return {
                inspection: inspRes.rows[0],
                roomNumber: roomNo,
                status: targetHkStatus
            };
        } catch (err) {
            await client.query('ROLLBACK');
            throw err;
        } finally {
            client.release();
        }
    }

    /**
     * Auto-Assign Tasks based on Floor Zoning and Workload Credit Balancing
     */
    async autoAssignTasks(propertyId: number, strategy: 'by-floor' | 'by-credits' | 'equal-count' = 'by-floor') {
        const client = await pgPool.connect();
        try {
            await client.query('BEGIN');

            // 1. Fetch active housekeepers from employees table or active roster
            const empRes = await client.query(`
                SELECT 
                    e.id, 
                    TRIM(CONCAT(e.first_name, ' ', e.last_name)) as name, 
                    e.phone, 
                    COALESCE(d.name, 'Housekeeping') as department, 
                    COALESCE(des.title, 'Room Attendant') as position, 
                    e.status
                FROM employees e 
                LEFT JOIN departments d ON d.id = e.department_id
                LEFT JOIN designations des ON des.id = e.designation_id
                WHERE e.property_id = $1 
                  AND (d.name ILIKE '%housekeep%' OR des.title ILIKE '%clean%' OR des.title ILIKE '%attendant%' OR des.title ILIKE '%maid%')
                  AND e.status = 'ACTIVE'
                ORDER BY e.id ASC;
            `, [propertyId]);

            let cleaners = empRes.rows;
            // Fallback: If no employees marked as housekeeping, use any active employees or staff pool
            if (cleaners.length === 0) {
                const fallbackEmps = await client.query(`
                    SELECT 
                        e.id, 
                        TRIM(CONCAT(e.first_name, ' ', e.last_name)) as name, 
                        e.phone, 
                        'Housekeeping' as department, 
                        'Room Attendant' as position, 
                        e.status
                    FROM employees e 
                    WHERE e.property_id = $1 AND e.status = 'ACTIVE'
                    ORDER BY e.id ASC
                    LIMIT 5;
                `, [propertyId]);
                cleaners = fallbackEmps.rows;
            }

            if (cleaners.length === 0) {
                throw new Error('No active housekeeping staff found in employee directory to assign rooms to.');
            }

            // 2. Fetch pending tasks requiring assignment
            const tasksRes = await client.query(`
                SELECT 
                    ht.id, ht.room_id, r.room_number,
                    COALESCE(ht.floor_number, r.floor_id::int, 1) as floor_number,
                    ht.credit_value, ht.priority
                FROM housekeeping_tasks ht
                JOIN rooms r ON r.id = ht.room_id
                WHERE ht.property_id = $1 AND ht.status = 'PENDING'
                ORDER BY 
                    CASE WHEN ht.priority = 'RUSH' THEN 1 WHEN ht.priority = 'HIGH' THEN 2 ELSE 3 END,
                    COALESCE(ht.floor_number, r.floor_id::int, 1) ASC,
                    r.room_number ASC;
            `, [propertyId]);

            const tasks = tasksRes.rows;
            if (tasks.length === 0) {
                await client.query('COMMIT');
                return { assignedCount: 0, message: 'No pending housekeeping tasks to assign.' };
            }

            // 3. Workload balancing: Map cleaner loads
            const cleanerLoads = cleaners.map((c, idx) => ({
                id: c.id,
                name: c.name,
                assignedFloor: idx + 1, // Default floor zone preference (Cleaner 1 -> Floor 1, etc.)
                currentCredits: 0.0,
                assignedTaskIds: [] as number[]
            }));

            const MAX_CREDITS_PER_CLEANER = 14.0;

            for (const task of tasks) {
                const credit = parseFloat(task.credit_value) || 1.0;
                let chosenCleaner = null;

                if (strategy === 'by-floor') {
                    // Try to find cleaner matching this floor zone who still has credit capacity
                    chosenCleaner = cleanerLoads.find(c => 
                        c.assignedFloor === task.floor_number && (c.currentCredits + credit <= MAX_CREDITS_PER_CLEANER)
                    );
                }

                // If not found or by-credits: find cleaner with lowest current workload
                if (!chosenCleaner) {
                    chosenCleaner = cleanerLoads.reduce((min, curr) => 
                        curr.currentCredits < min.currentCredits ? curr : min
                    , cleanerLoads[0]);
                }

                chosenCleaner.currentCredits += credit;
                chosenCleaner.assignedTaskIds.push(task.id);
            }

            // 4. Batch update task assignments
            let assignedCount = 0;
            for (const c of cleanerLoads) {
                if (c.assignedTaskIds.length > 0) {
                    await client.query(`
                        UPDATE housekeeping_tasks
                        SET cleaner_employee_id = $1,
                            assigned_employee_name = $2
                        WHERE id = ANY($3::bigint[]);
                    `, [c.id, c.name, c.assignedTaskIds]);
                    assignedCount += c.assignedTaskIds.length;
                }
            }

            await client.query('COMMIT');

            broadcastServerEvent({
                type: 'HK_TASKS_AUTO_ASSIGNED',
                propertyId,
                assignedCount
            }, 'AUTO_ASSIGN');

            return {
                assignedCount,
                cleanersCount: cleaners.length,
                allocations: cleanerLoads.map(c => ({
                    cleanerId: c.id,
                    cleanerName: c.name,
                    assignedRooms: c.assignedTaskIds.length,
                    totalCredits: c.currentCredits
                }))
            };
        } catch (err) {
            await client.query('ROLLBACK');
            throw err;
        } finally {
            client.release();
        }
    }

    /**
     * Flag a physical room discrepancy
     */
    async flagDiscrepancy(payload: DiscrepancyPayload) {
        const client = await pgPool.connect();
        try {
            await client.query('BEGIN');

            const res = await client.query(`
                INSERT INTO room_discrepancies (
                    property_id, room_id, room_number, discrepancy_type,
                    front_desk_status, housekeeping_found, guest_name,
                    reported_by, notes, status, reported_at
                ) VALUES (
                    $1, $2, $3, $4, $5, $6, $7, $8, $9, 'ACTIVE', CURRENT_TIMESTAMP
                )
                RETURNING *;
            `, [
                payload.propertyId,
                payload.roomId,
                payload.roomNumber,
                payload.discrepancyType,
                payload.frontDeskStatus,
                payload.housekeepingFound,
                payload.guestName || null,
                payload.reportedBy,
                payload.notes || null
            ]);

            await client.query('COMMIT');

            const discrepancy = res.rows[0];

            // Real-time broadcast to Front Desk & Room Rack
            broadcastServerEvent({
                type: 'ROOM_DISCREPANCY_FLAGGED',
                discrepancyId: discrepancy.id,
                roomNumber: payload.roomNumber,
                discrepancyType: payload.discrepancyType,
                reportedBy: payload.reportedBy
            }, 'HOUSEKEEPING_DISCREPANCY');

            return discrepancy;
        } catch (err) {
            await client.query('ROLLBACK');
            throw err;
        } finally {
            client.release();
        }
    }

    /**
     * Fetch discrepancies for property
     */
    async getDiscrepancies(propertyId: number, status: string = 'ACTIVE') {
        let query = `
            SELECT * FROM room_discrepancies
            WHERE property_id = $1
        `;
        const params: any[] = [propertyId];
        if (status && status !== 'all') {
            params.push(status.toUpperCase());
            query += ` AND status = $${params.length}`;
        }
        query += ` ORDER BY reported_at DESC;`;

        const res = await pgPool.query(query, params);
        return res.rows;
    }

    /**
     * Reconcile & Resolve room discrepancy
     */
    async resolveDiscrepancy(discrepancyId: number, resolvedBy: string, resolutionNotes: string) {
        const res = await pgPool.query(`
            UPDATE room_discrepancies
            SET status = 'RESOLVED',
                resolved_by = $1,
                resolution_notes = $2,
                resolved_at = CURRENT_TIMESTAMP
            WHERE id = $3
            RETURNING *;
        `, [resolvedBy, resolutionNotes, discrepancyId]);

        if (res.rows.length === 0) {
            throw new Error(`Room discrepancy #${discrepancyId} not found`);
        }

        const discrepancy = res.rows[0];
        broadcastServerEvent({
            type: 'ROOM_DISCREPANCY_RESOLVED',
            discrepancyId,
            roomNumber: discrepancy.room_number,
            resolvedBy
        }, 'HOUSEKEEPING_DISCREPANCY');

        return discrepancy;
    }

    /**
     * Get property-scoped housekeeping settings
     */
    async getSettings(propertyId: number) {
        const res = await pgPool.query(`
            SELECT * FROM housekeeping_settings WHERE property_id = $1;
        `, [propertyId]);

        if (res.rows.length > 0) {
            return res.rows[0];
        }

        // Return default settings
        return {
            property_id: propertyId,
            auto_dirty_on_checkout: true,
            auto_dirty_on_night_audit: true,
            require_inspection_before_checkin: true,
            auto_mark_clean_on_inspection: true,
            default_stayover_frequency: 'daily',
            linen_change_frequency_days: 3,
            deep_clean_interval_days: 30,
            credit_per_standard_room: 1.0,
            credit_per_suite: 2.0,
            credit_per_connecting_suite: 3.0,
            max_credits_per_housekeeper: 14.0,
            auto_assign_strategy: 'by-credits',
            rush_room_alert_minutes: 120,
            dnd_max_hours_alert: 24,
            status_workflow: 'standard'
        };
    }

    /**
     * Update property-scoped housekeeping settings
     */
    async updateSettings(propertyId: number, data: any) {
        const res = await pgPool.query(`
            INSERT INTO housekeeping_settings (
                property_id, auto_dirty_on_checkout, auto_dirty_on_night_audit,
                require_inspection_before_checkin, auto_mark_clean_on_inspection,
                default_stayover_frequency, linen_change_frequency_days, deep_clean_interval_days,
                credit_per_standard_room, credit_per_suite, credit_per_connecting_suite,
                max_credits_per_housekeeper, auto_assign_strategy, rush_room_alert_minutes,
                dnd_max_hours_alert, status_workflow, updated_at
            ) VALUES (
                $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, CURRENT_TIMESTAMP
            )
            ON CONFLICT (property_id) DO UPDATE SET
                auto_dirty_on_checkout = EXCLUDED.auto_dirty_on_checkout,
                auto_dirty_on_night_audit = EXCLUDED.auto_dirty_on_night_audit,
                require_inspection_before_checkin = EXCLUDED.require_inspection_before_checkin,
                auto_mark_clean_on_inspection = EXCLUDED.auto_mark_clean_on_inspection,
                default_stayover_frequency = EXCLUDED.default_stayover_frequency,
                linen_change_frequency_days = EXCLUDED.linen_change_frequency_days,
                deep_clean_interval_days = EXCLUDED.deep_clean_interval_days,
                credit_per_standard_room = EXCLUDED.credit_per_standard_room,
                credit_per_suite = EXCLUDED.credit_per_suite,
                credit_per_connecting_suite = EXCLUDED.credit_per_connecting_suite,
                max_credits_per_housekeeper = EXCLUDED.max_credits_per_housekeeper,
                auto_assign_strategy = EXCLUDED.auto_assign_strategy,
                rush_room_alert_minutes = EXCLUDED.rush_room_alert_minutes,
                dnd_max_hours_alert = EXCLUDED.dnd_max_hours_alert,
                status_workflow = EXCLUDED.status_workflow,
                updated_at = CURRENT_TIMESTAMP
            RETURNING *;
        `, [
            propertyId,
            data.auto_dirty_on_checkout ?? data.autoDirtyOnCheckout ?? true,
            data.auto_dirty_on_night_audit ?? data.autoDirtyOnNightAudit ?? true,
            data.require_inspection_before_checkin ?? data.requireInspectionBeforeCheckIn ?? true,
            data.auto_mark_clean_on_inspection ?? data.autoMarkCleanOnInspection ?? true,
            data.default_stayover_frequency ?? data.defaultStayoverFrequency ?? 'daily',
            data.linen_change_frequency_days ?? data.linenChangeFrequencyDays ?? 3,
            data.deep_clean_interval_days ?? data.deepCleanIntervalDays ?? 30,
            data.credit_per_standard_room ?? data.creditPerStandardRoom ?? 1.0,
            data.credit_per_suite ?? data.creditPerSuite ?? 2.0,
            data.credit_per_connecting_suite ?? data.creditPerConnectingSuite ?? 3.0,
            data.max_credits_per_housekeeper ?? data.maxCreditsPerHousekeeper ?? 14.0,
            data.auto_assign_strategy ?? data.autoAssignStrategy ?? 'by-credits',
            data.rush_room_alert_minutes ?? data.rushRoomAlertMinutes ?? 120,
            data.dnd_max_hours_alert ?? data.dndMaxHoursAlert ?? 24,
            data.status_workflow ?? data.statusWorkflow ?? 'standard'
        ]);

        return res.rows[0];
    }
}

export const housekeepingService = new HousekeepingService();
