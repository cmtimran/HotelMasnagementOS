import { Router, Request, Response } from 'express';
import { pgPool } from '../database/postgres.js';
import { requireRole } from '../middleware/rbacGuard.js';

const router = Router();

const getReqPropertyId = (req: Request): number | null => {
    const raw = req.query?.propertyId || req.headers?.['x-property-id'] || req.body?.propertyId;
    if (!raw || raw === 'all' || raw === 'prop_grand_palace') return null;
    const num = Number(raw);
    return isNaN(num) ? null : num;
};

// ==========================================
// 1. DEPARTMENTS & DESIGNATIONS
// ==========================================

// GET /api/hrm/departments - List all departments with stats
router.get('/departments', async (req: Request, res: Response) => {
    try {
        const propertyId = getReqPropertyId(req);
        if (!propertyId) {
            return res.json({ success: true, data: [] });
        }
        const result = await pgPool.query(`
            SELECT 
                d.*,
                p.name as property_name,
                (SELECT COUNT(*) FROM employees e WHERE e.department_id = d.id AND e.status = 'ACTIVE') as active_employees,
                (SELECT COUNT(*) FROM designations des WHERE des.department_id = d.id) as designation_count
            FROM departments d
            JOIN properties p ON p.id = d.property_id
            WHERE d.property_id = $1
            ORDER BY d.id ASC
        `, [propertyId]);

        res.json({ success: true, data: result.rows });
    } catch (e: any) {
        res.status(500).json({ success: false, error: e?.message || 'Failed to fetch departments' });
    }
});

// POST /api/hrm/departments - Create department
router.post('/departments', async (req: Request, res: Response) => {
    try {
        const propertyId = getReqPropertyId(req);
        if (!propertyId) {
            return res.status(400).json({ success: false, error: 'Property ID is required' });
        }
        const { code, name, costCenterCode } = req.body;
        if (!code || !name) {
            return res.status(400).json({ success: false, error: 'code and name are required' });
        }
        const result = await pgPool.query(`
            INSERT INTO departments (property_id, code, name, cost_center_code)
            VALUES ($1, $2, $3, $4)
            RETURNING id
        `, [propertyId, code.toUpperCase(), name, costCenterCode || `CC-${code.toUpperCase()}`]);

        res.status(201).json({ success: true, id: Number(result.rows[0]?.id), message: 'Department created successfully' });
    } catch (e: any) {
        res.status(500).json({ success: false, error: e?.message || 'Failed to create department' });
    }
});

// PUT /api/hrm/departments/:id - Update department
router.put('/departments/:id', async (req: Request, res: Response) => {
    try {
        const id = Number(req.params.id);
        const { code, name, costCenterCode } = req.body;
        await pgPool.query(`
            UPDATE departments
            SET code = COALESCE($1, code),
                name = COALESCE($2, name),
                cost_center_code = COALESCE($3, cost_center_code)
            WHERE id = $4
        `, [code ? code.toUpperCase() : null, name || null, costCenterCode || null, id]);

        res.json({ success: true, message: 'Department updated successfully' });
    } catch (e: any) {
        res.status(500).json({ success: false, error: e?.message || 'Failed to update department' });
    }
});

// DELETE /api/hrm/departments/:id - Delete department
router.delete('/departments/:id', async (req: Request, res: Response) => {
    try {
        const id = Number(req.params.id);
        await pgPool.query('DELETE FROM departments WHERE id = $1', [id]);
        res.json({ success: true, message: 'Department deleted successfully' });
    } catch (e: any) {
        res.status(500).json({ success: false, error: e?.message || 'Failed to delete department' });
    }
});

// GET /api/hrm/designations - List all designations
router.get('/designations', async (req: Request, res: Response) => {
    try {
        const result = await pgPool.query(`
            SELECT 
                des.*,
                d.name as department_name,
                d.code as department_code
            FROM designations des
            JOIN departments d ON d.id = des.department_id
            ORDER BY d.id ASC, des.id ASC
        `);

        res.json({ success: true, data: result.rows });
    } catch (e: any) {
        res.status(500).json({ success: false, error: e?.message || 'Failed to fetch designations' });
    }
});

// ==========================================
// 2. EMPLOYEES DIRECTORY
// ==========================================

// GET /api/hrm/employees - List employees
router.get('/employees', async (req: Request, res: Response) => {
    try {
        const propertyId = getReqPropertyId(req);
        if (!propertyId) {
            return res.json({ success: true, data: [], count: 0 });
        }
        const status = req.query.status as string;

        let query = `
            SELECT 
                e.*,
                d.name as department_name,
                d.code as department_code,
                des.title as designation_title,
                des.pay_grade,
                p.name as property_name
            FROM employees e
            JOIN departments d ON d.id = e.department_id
            JOIN designations des ON des.id = e.designation_id
            JOIN properties p ON p.id = e.property_id
            WHERE e.property_id = $1
        `;
        const params: any[] = [propertyId];

        if (status) {
            query += ' AND e.status = $2';
            params.push(status);
        }

        query += ' ORDER BY e.id ASC';

        const result = await pgPool.query(query, params);

        res.json({
            success: true,
            data: result.rows,
            count: result.rows.length
        });
    } catch (e: any) {
        res.status(500).json({ success: false, error: e?.message || 'Failed to fetch employees' });
    }
});

// POST /api/hrm/employees - Add new employee
router.post('/employees', async (req: Request, res: Response) => {
    try {
        const propertyId = getReqPropertyId(req);
        if (!propertyId) {
            return res.status(400).json({ success: false, error: 'Property ID is required' });
        }
        const {
            departmentId,
            designationId,
            employeeCode,
            firstName,
            lastName,
            email,
            phone,
            nid,
            hireDate,
            basicSalary,
            status = 'ACTIVE'
        } = req.body;

        if (!departmentId || !designationId || !employeeCode || !firstName || !lastName || !basicSalary) {
            return res.status(400).json({ success: false, error: 'Missing required employee fields' });
        }

        const result = await pgPool.query(`
            INSERT INTO employees (
                property_id, department_id, designation_id, employee_code,
                first_name, last_name, email, phone, nid, hire_date, basic_salary, status
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
            RETURNING id
        `, [
            propertyId,
            departmentId,
            designationId,
            employeeCode,
            firstName,
            lastName,
            email || null,
            phone || null,
            nid || null,
            hireDate || new Date().toISOString().slice(0, 10),
            basicSalary,
            status
        ]);

        res.status(201).json({
            success: true,
            message: 'Employee registered successfully',
            employeeId: Number(result.rows[0]?.id)
        });
    } catch (e: any) {
        res.status(500).json({ success: false, error: e?.message || 'Failed to create employee' });
    }
});

// PUT /api/hrm/employees/:id - Update employee
router.put('/employees/:id', async (req: Request, res: Response) => {
    try {
        const id = Number(req.params.id);
        const {
            departmentId,
            designationId,
            employeeCode,
            firstName,
            lastName,
            email,
            phone,
            basicSalary,
            status
        } = req.body;

        await pgPool.query(`
            UPDATE employees
            SET department_id = COALESCE($1, department_id),
                designation_id = COALESCE($2, designation_id),
                employee_code = COALESCE($3, employee_code),
                first_name = COALESCE($4, first_name),
                last_name = COALESCE($5, last_name),
                email = COALESCE($6, email),
                phone = COALESCE($7, phone),
                basic_salary = COALESCE($8, basic_salary),
                status = COALESCE($9, status),
                updated_at = CURRENT_TIMESTAMP
            WHERE id = $10
        `, [
            departmentId || null,
            designationId || null,
            employeeCode || null,
            firstName || null,
            lastName || null,
            email || null,
            phone || null,
            basicSalary !== undefined ? basicSalary : null,
            status || null,
            id
        ]);

        res.json({ success: true, message: 'Employee updated successfully' });
    } catch (e: any) {
        res.status(500).json({ success: false, error: e?.message || 'Failed to update employee' });
    }
});

// DELETE /api/hrm/employees/:id - Delete employee (Privileged HR / Management Only)
router.delete('/employees/:id', requireRole(['super_admin', 'general_manager']), async (req: Request, res: Response) => {
    try {
        const id = Number(req.params.id);
        await pgPool.query('DELETE FROM employees WHERE id = $1', [id]);
        res.json({ success: true, message: 'Employee deleted successfully' });
    } catch (e: any) {
        res.status(500).json({ success: false, error: e?.message || 'Failed to delete employee' });
    }
});

// ==========================================
// 3. 24/7 SHIFTS & ROSTER
// ==========================================

// GET /api/hrm/shifts - List hotel work shifts
router.get('/shifts', async (req: Request, res: Response) => {
    try {
        const propertyId = getReqPropertyId(req);
        if (!propertyId) {
            return res.json({ success: true, data: [] });
        }
        const result = await pgPool.query(`
            SELECT 
                s.*,
                (SELECT COUNT(*) FROM employee_shift_rosters esr WHERE esr.shift_id = s.id AND esr.roster_date = CURRENT_DATE) as assigned_today
            FROM shifts s
            WHERE s.property_id = $1
            ORDER BY s.start_time ASC
        `, [propertyId]);

        res.json({ success: true, data: result.rows });
    } catch (e: any) {
        res.status(500).json({ success: false, error: e?.message || 'Failed to fetch shifts' });
    }
});

// POST /api/hrm/shifts - Create shift
router.post('/shifts', async (req: Request, res: Response) => {
    try {
        const propertyId = getReqPropertyId(req);
        if (!propertyId) {
            return res.status(400).json({ success: false, error: 'Property ID is required' });
        }
        const { name, startTime, endTime, gracePeriodMinutes = 15 } = req.body;
        if (!name || !startTime || !endTime) {
            return res.status(400).json({ success: false, error: 'name, startTime, and endTime are required' });
        }
        const result = await pgPool.query(`
            INSERT INTO shifts (property_id, name, start_time, end_time, grace_period_minutes)
            VALUES ($1, $2, $3, $4, $5)
            RETURNING id
        `, [propertyId, name, startTime, endTime, gracePeriodMinutes]);

        res.status(201).json({ success: true, id: Number(result.rows[0]?.id), message: 'Shift created successfully' });
    } catch (e: any) {
        res.status(500).json({ success: false, error: e?.message || 'Failed to create shift' });
    }
});

// PUT /api/hrm/shifts/:id - Update shift
router.put('/shifts/:id', async (req: Request, res: Response) => {
    try {
        const id = Number(req.params.id);
        const { name, startTime, endTime, gracePeriodMinutes } = req.body;
        await pgPool.query(`
            UPDATE shifts
            SET name = COALESCE($1, name),
                start_time = COALESCE($2, start_time),
                end_time = COALESCE($3, end_time),
                grace_period_minutes = COALESCE($4, grace_period_minutes)
            WHERE id = $5
        `, [name || null, startTime || null, endTime || null, gracePeriodMinutes !== undefined ? gracePeriodMinutes : null, id]);

        res.json({ success: true, message: 'Shift updated successfully' });
    } catch (e: any) {
        res.status(500).json({ success: false, error: e?.message || 'Failed to update shift' });
    }
});

// DELETE /api/hrm/shifts/:id - Delete shift
router.delete('/shifts/:id', async (req: Request, res: Response) => {
    try {
        const id = Number(req.params.id);
        await pgPool.query('DELETE FROM shifts WHERE id = $1', [id]);
        res.json({ success: true, message: 'Shift deleted successfully' });
    } catch (e: any) {
        res.status(500).json({ success: false, error: e?.message || 'Failed to delete shift' });
    }
});

// ==========================================
// 4. ATTENDANCE & LIVE CLOCK-IN / OUT
// ==========================================

// GET /api/hrm/attendance - List attendance records
router.get('/attendance', async (req: Request, res: Response) => {
    try {
        const propertyId = getReqPropertyId(req);
        if (!propertyId) {
            return res.json({ success: true, data: [], date: new Date().toISOString().slice(0, 10) });
        }
        const date = req.query.date as string || new Date().toISOString().slice(0, 10);

        const result = await pgPool.query(`
            SELECT 
                a.*,
                e.employee_code,
                e.first_name || ' ' || e.last_name as employee_name,
                d.name as department_name,
                des.title as designation_title,
                s.name as shift_name,
                s.start_time as shift_start,
                s.end_time as shift_end
            FROM attendance_records a
            JOIN employees e ON e.id = a.employee_id
            JOIN departments d ON d.id = e.department_id
            JOIN designations des ON des.id = e.designation_id
            JOIN shifts s ON s.id = a.shift_id
            WHERE e.property_id = $1 AND (a.attendance_date)::date = ($2)::date
            ORDER BY a.clock_in ASC
        `, [propertyId, date]);

        res.json({ success: true, data: result.rows, date });
    } catch (e: any) {
        res.status(500).json({ success: false, error: e?.message || 'Failed to fetch attendance' });
    }
});

// POST /api/hrm/attendance/clock - Clock in or Clock out terminal
router.post('/attendance/clock', async (req: Request, res: Response) => {
    try {
        const { employeeId, shiftId = 1, action, date = '2026-07-01' } = req.body;

        if (!employeeId || !action) {
            return res.status(400).json({ success: false, error: 'employeeId and action (CLOCK_IN | CLOCK_OUT) are required' });
        }

        const now = new Date();
        const timeStr = `${date} ${now.toTimeString().slice(0, 8)}`;

        const existingRes = await pgPool.query(`
            SELECT * FROM attendance_records 
            WHERE employee_id = $1 AND (attendance_date)::date = ($2)::date
        `, [employeeId, date]);
        const existing = existingRes.rows[0];

        if (action === 'CLOCK_IN') {
            if (existing && existing.clock_in) {
                return res.status(400).json({ success: false, error: 'Employee is already clocked in for this date' });
            }

            if (existing) {
                await pgPool.query(`
                    UPDATE attendance_records
                    SET clock_in = $1, status = 'PRESENT', shift_id = $2
                    WHERE id = $3
                `, [timeStr, shiftId, existing.id]);
            } else {
                await pgPool.query(`
                    INSERT INTO attendance_records (employee_id, shift_id, attendance_date, clock_in, status)
                    VALUES ($1, $2, $3, $4, 'PRESENT')
                `, [employeeId, shiftId, date, timeStr]);
            }

            return res.json({ success: true, message: `Clock-in successful at ${timeStr}` });
        } else if (action === 'CLOCK_OUT') {
            if (!existing || !existing.clock_in) {
                return res.status(400).json({ success: false, error: 'Cannot clock out without prior clock-in record' });
            }

            // Calculate hours worked
            const inTime = new Date(existing.clock_in).getTime();
            const outTime = new Date(timeStr).getTime();
            const hours = Number(((outTime - inTime) / (1000 * 60 * 60)).toFixed(2));

            await pgPool.query(`
                UPDATE attendance_records
                SET clock_out = $1, work_hours = $2
                WHERE id = $3
            `, [timeStr, hours > 0 ? hours : 8.0, existing.id]);

            return res.json({ success: true, message: `Clock-out recorded. Hours logged: ${hours > 0 ? hours : 8.0}h` });
        }

        res.status(400).json({ success: false, error: 'Invalid clock action' });
    } catch (e: any) {
        res.status(500).json({ success: false, error: e?.message || 'Clock action failed' });
    }
});

// ==========================================
// 5. PAYROLL RUNS & GENERAL LEDGER POSTING
// ==========================================

// GET /api/hrm/payroll - List payroll runs
router.get('/payroll', async (req: Request, res: Response) => {
    try {
        const propertyId = getReqPropertyId(req);
        if (!propertyId) {
            return res.json({ success: true, data: [] });
        }
        const runs = await pgPool.query(`
            SELECT 
                pr.*,
                (SELECT COUNT(*) FROM payroll_items pi WHERE pi.payroll_run_id = pr.id) as total_employees_paid
            FROM payroll_runs pr
            WHERE pr.property_id = $1
            ORDER BY pr.period_year DESC, pr.period_month DESC
        `, [propertyId]);

        res.json({ success: true, data: runs.rows });
    } catch (e: any) {
        res.status(500).json({ success: false, error: e?.message || 'Failed to fetch payroll runs' });
    }
});

// GET /api/hrm/payroll/:id/items - Itemized payslips for a run
router.get('/payroll/:id/items', async (req: Request, res: Response) => {
    try {
        const runId = Number(req.params.id);
        const items = await pgPool.query(`
            SELECT 
                pi.*,
                e.employee_code,
                e.first_name || ' ' || e.last_name as employee_name,
                d.name as department_name,
                des.title as designation_title
            FROM payroll_items pi
            JOIN employees e ON e.id = pi.employee_id
            JOIN departments d ON d.id = e.department_id
            JOIN designations des ON des.id = e.designation_id
            WHERE pi.payroll_run_id = $1
            ORDER BY e.employee_code ASC
        `, [runId]);

        res.json({ success: true, data: items.rows });
    } catch (e: any) {
        res.status(500).json({ success: false, error: e?.message || 'Failed to fetch payroll items' });
    }
});

// POST /api/hrm/payroll/process - Run Monthly Payroll & Post to General Ledger (Accountant / GM / SuperAdmin Only)
router.post('/payroll/process', requireRole(['super_admin', 'general_manager', 'accountant']), async (req: Request, res: Response) => {
    try {
        const propertyId = getReqPropertyId(req);
        if (!propertyId) {
            return res.status(400).json({ success: false, error: 'Property ID is required' });
        }
        const { month, year } = req.body;

        if (!month || !year) {
            return res.status(400).json({ success: false, error: 'month and year are required' });
        }

        // Check if payroll already run for this month/year
        const existingRes = await pgPool.query(`
            SELECT id FROM payroll_runs 
            WHERE property_id = $1 AND period_month = $2 AND period_year = $3
        `, [propertyId, month, year]);
        const existing = existingRes.rows[0];

        if (existing) {
            return res.status(400).json({ success: false, error: `Payroll for ${month}/${year} has already been generated (Run #${existing.id})` });
        }

        // Fetch all active employees
        const empRes = await pgPool.query(`
            SELECT id, basic_salary FROM employees
            WHERE property_id = $1 AND status = 'ACTIVE'
        `, [propertyId]);
        const employees = empRes.rows;

        if (employees.length === 0) {
            return res.status(400).json({ success: false, error: 'No active employees found to process payroll' });
        }

        let totalGross = 0;
        let totalDeductions = 0;
        let totalNet = 0;

        const itemsToInsert: any[] = [];

        employees.forEach((emp: any) => {
            const basic = Number(emp.basic_salary);
            const allowance = Math.round(basic * 0.10); // 10% standard housing/food allowance
            const overtime = 0;
            const deductions = Math.round(basic * 0.05); // 5% provident fund
            const tax = basic > 30000 ? Math.round(basic * 0.05) : 0; // Tax withholding
            const gross = basic + allowance + overtime;
            const deductionTotal = deductions + tax;
            const net = gross - deductionTotal;

            totalGross += gross;
            totalDeductions += deductionTotal;
            totalNet += net;

            itemsToInsert.push({
                employeeId: emp.id,
                basic,
                allowance,
                overtime,
                deductions,
                tax,
                net
            });
        });

        // 1. Insert Payroll Run
        const runResult = await pgPool.query(`
            INSERT INTO payroll_runs (property_id, period_month, period_year, total_gross, total_deductions, total_net, is_posted_to_gl)
            VALUES ($1, $2, $3, $4, $5, $6, 1)
            RETURNING id
        `, [propertyId, month, year, totalGross, totalDeductions, totalNet]);
        const payrollRunId = Number(runResult.rows[0]?.id);

        // 2. Insert Payroll Items
        for (const item of itemsToInsert) {
            await pgPool.query(`
                INSERT INTO payroll_items (
                    payroll_run_id, employee_id, basic_salary, allowances, overtime_pay, deductions, tax_deductions, net_salary, payment_status
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'PAID')
            `, [
                payrollRunId,
                item.employeeId,
                item.basic,
                item.allowance,
                item.overtime,
                item.deductions,
                item.tax,
                item.net
            ]);
        }

        // 3. Post Balanced Double-Entry Journal to General Ledger
        const salRes = await pgPool.query("SELECT id FROM chart_of_accounts WHERE account_code = '5010'");
        const salaryAccount = salRes.rows[0];
        const bankRes = await pgPool.query("SELECT id FROM chart_of_accounts WHERE account_code = '1020'");
        const bankAccount = bankRes.rows[0];
        const taxRes = await pgPool.query("SELECT id FROM chart_of_accounts WHERE account_code = '2020'");
        const taxAccount = taxRes.rows[0];

        if (salaryAccount && bankAccount) {
            const entryNumber = `JV-PR-${year}${String(month).padStart(2, '0')}-${payrollRunId}`;
            const jvResult = await pgPool.query(`
                INSERT INTO journal_entries (
                    organization_id, property_id, entry_number, entry_date, description, reference_type, reference_id, is_posted
                ) VALUES (1, $1, $2, CURRENT_DATE, $3, 'PAYROLL', $4, 1)
                RETURNING id
            `, [
                propertyId,
                entryNumber,
                `Monthly Payroll Settlement for ${month}/${year} (${itemsToInsert.length} Staff)`,
                payrollRunId
            ]);
            const jvId = Number(jvResult.rows[0]?.id);

            // Debit Salary Expense
            await pgPool.query(`
                INSERT INTO journal_lines (journal_entry_id, account_id, debit, credit, memo)
                VALUES ($1, $2, $3, $4, $5)
            `, [jvId, salaryAccount.id, totalGross, 0.00, `Staff Salary Expense ${month}/${year}`]);

            // Credit Bank Account
            await pgPool.query(`
                INSERT INTO journal_lines (journal_entry_id, account_id, debit, credit, memo)
                VALUES ($1, $2, $3, $4, $5)
            `, [jvId, bankAccount.id, 0.00, totalNet, `Net Salary Disbursement via City Bank`]);

            // Credit Tax/Deductions Payable if any
            if (totalDeductions > 0 && taxAccount) {
                await pgPool.query(`
                    INSERT INTO journal_lines (journal_entry_id, account_id, debit, credit, memo)
                    VALUES ($1, $2, $3, $4, $5)
                `, [jvId, taxAccount.id, 0.00, totalDeductions, `Tax & PF Deductions Withheld`]);
            }
        }

        res.status(201).json({
            success: true,
            message: `Monthly payroll processed successfully for ${itemsToInsert.length} employees and posted to General Ledger!`,
            payrollRunId,
            summary: {
                totalGross,
                totalDeductions,
                totalNet,
                headcount: itemsToInsert.length
            }
        });
    } catch (e: any) {
        res.status(500).json({ success: false, error: e?.message || 'Payroll processing failed' });
    }
});

export default router;
