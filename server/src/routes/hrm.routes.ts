import { Router, Request, Response } from 'express';
import { db } from '../database/db.js';

const router = Router();

// ==========================================
// 1. DEPARTMENTS & DESIGNATIONS
// ==========================================

// GET /api/hrm/departments - List all departments with stats
router.get('/departments', (req: Request, res: Response) => {
    try {
        const propertyId = req.query.propertyId ? Number(req.query.propertyId) : 1;
        const departments = db.prepare(`
            SELECT 
                d.*,
                p.name as property_name,
                (SELECT COUNT(*) FROM employees e WHERE e.department_id = d.id AND e.status = 'ACTIVE') as active_employees,
                (SELECT COUNT(*) FROM designations des WHERE des.department_id = d.id) as designation_count
            FROM departments d
            JOIN properties p ON p.id = d.property_id
            WHERE d.property_id = ?
            ORDER BY d.id ASC
        `).all(propertyId);

        res.json({ success: true, data: departments });
    } catch (e: any) {
        res.status(500).json({ success: false, error: e?.message || 'Failed to fetch departments' });
    }
});

// GET /api/hrm/designations - List all designations
router.get('/designations', (req: Request, res: Response) => {
    try {
        const designations = db.prepare(`
            SELECT 
                des.*,
                d.name as department_name,
                d.code as department_code
            FROM designations des
            JOIN departments d ON d.id = des.department_id
            ORDER BY d.id ASC, des.id ASC
        `).all();

        res.json({ success: true, data: designations });
    } catch (e: any) {
        res.status(500).json({ success: false, error: e?.message || 'Failed to fetch designations' });
    }
});

// ==========================================
// 2. EMPLOYEES DIRECTORY
// ==========================================

// GET /api/hrm/employees - List employees
router.get('/employees', (req: Request, res: Response) => {
    try {
        const propertyId = req.query.propertyId ? Number(req.query.propertyId) : 1;
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
            WHERE e.property_id = ?
        `;
        const params: any[] = [propertyId];

        if (status) {
            query += ' AND e.status = ?';
            params.push(status);
        }

        query += ' ORDER BY e.id ASC';

        const employees = db.prepare(query).all(...params);

        res.json({
            success: true,
            data: employees,
            count: employees.length
        });
    } catch (e: any) {
        res.status(500).json({ success: false, error: e?.message || 'Failed to fetch employees' });
    }
});

// POST /api/hrm/employees - Add new employee
router.post('/employees', (req: Request, res: Response) => {
    try {
        const {
            propertyId = 1,
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

        const insertStmt = db.prepare(`
            INSERT INTO employees (
                property_id, department_id, designation_id, employee_code,
                first_name, last_name, email, phone, nid, hire_date, basic_salary, status
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `);

        const result = insertStmt.run(
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
        );

        res.status(201).json({
            success: true,
            message: 'Employee registered successfully',
            employeeId: Number(result.lastInsertRowid)
        });
    } catch (e: any) {
        res.status(500).json({ success: false, error: e?.message || 'Failed to create employee' });
    }
});

// ==========================================
// 3. 24/7 SHIFTS & ROSTER
// ==========================================

// GET /api/hrm/shifts - List hotel work shifts
router.get('/shifts', (req: Request, res: Response) => {
    try {
        const propertyId = req.query.propertyId ? Number(req.query.propertyId) : 1;
        const shifts = db.prepare(`
            SELECT 
                s.*,
                (SELECT COUNT(*) FROM employee_shift_rosters esr WHERE esr.shift_id = s.id AND esr.roster_date = CURRENT_DATE) as assigned_today
            FROM shifts s
            WHERE s.property_id = ?
            ORDER BY s.start_time ASC
        `).all(propertyId);

        res.json({ success: true, data: shifts });
    } catch (e: any) {
        res.status(500).json({ success: false, error: e?.message || 'Failed to fetch shifts' });
    }
});

// ==========================================
// 4. ATTENDANCE & LIVE CLOCK-IN / OUT
// ==========================================

// GET /api/hrm/attendance - List attendance records
router.get('/attendance', (req: Request, res: Response) => {
    try {
        const propertyId = req.query.propertyId ? Number(req.query.propertyId) : 1;
        const date = req.query.date as string || '2026-07-01'; // Default to active seeded date

        const attendance = db.prepare(`
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
            WHERE e.property_id = ? AND a.attendance_date = ?
            ORDER BY a.clock_in ASC
        `).all(propertyId, date);

        res.json({ success: true, data: attendance, date });
    } catch (e: any) {
        res.status(500).json({ success: false, error: e?.message || 'Failed to fetch attendance' });
    }
});

// POST /api/hrm/attendance/clock - Clock in or Clock out terminal
router.post('/attendance/clock', (req: Request, res: Response) => {
    try {
        const { employeeId, shiftId = 1, action, date = '2026-07-01' } = req.body;

        if (!employeeId || !action) {
            return res.status(400).json({ success: false, error: 'employeeId and action (CLOCK_IN | CLOCK_OUT) are required' });
        }

        const now = new Date();
        const timeStr = `${date} ${now.toTimeString().slice(0, 8)}`;

        const existing = db.prepare(`
            SELECT * FROM attendance_records 
            WHERE employee_id = ? AND attendance_date = ?
        `).get(employeeId, date) as any;

        if (action === 'CLOCK_IN') {
            if (existing && existing.clock_in) {
                return res.status(400).json({ success: false, error: 'Employee is already clocked in for this date' });
            }

            if (existing) {
                db.prepare(`
                    UPDATE attendance_records
                    SET clock_in = ?, status = 'PRESENT', shift_id = ?
                    WHERE id = ?
                `).run(timeStr, shiftId, existing.id);
            } else {
                db.prepare(`
                    INSERT INTO attendance_records (employee_id, shift_id, attendance_date, clock_in, status)
                    VALUES (?, ?, ?, ?, 'PRESENT')
                `).run(employeeId, shiftId, date, timeStr);
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

            db.prepare(`
                UPDATE attendance_records
                SET clock_out = ?, work_hours = ?
                WHERE id = ?
            `).run(timeStr, hours > 0 ? hours : 8.0, existing.id);

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
router.get('/payroll', (req: Request, res: Response) => {
    try {
        const propertyId = req.query.propertyId ? Number(req.query.propertyId) : 1;
        const runs = db.prepare(`
            SELECT 
                pr.*,
                (SELECT COUNT(*) FROM payroll_items pi WHERE pi.payroll_run_id = pr.id) as total_employees_paid
            FROM payroll_runs pr
            WHERE pr.property_id = ?
            ORDER BY pr.period_year DESC, pr.period_month DESC
        `).all(propertyId);

        res.json({ success: true, data: runs });
    } catch (e: any) {
        res.status(500).json({ success: false, error: e?.message || 'Failed to fetch payroll runs' });
    }
});

// GET /api/hrm/payroll/:id/items - Itemized payslips for a run
router.get('/payroll/:id/items', (req: Request, res: Response) => {
    try {
        const runId = Number(req.params.id);
        const items = db.prepare(`
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
            WHERE pi.payroll_run_id = ?
            ORDER BY e.employee_code ASC
        `).all(runId);

        res.json({ success: true, data: items });
    } catch (e: any) {
        res.status(500).json({ success: false, error: e?.message || 'Failed to fetch payroll items' });
    }
});

// POST /api/hrm/payroll/process - Run Monthly Payroll & Post to General Ledger
router.post('/payroll/process', (req: Request, res: Response) => {
    try {
        const { propertyId = 1, month, year } = req.body;

        if (!month || !year) {
            return res.status(400).json({ success: false, error: 'month and year are required' });
        }

        // Check if payroll already run for this month/year
        const existing = db.prepare(`
            SELECT id FROM payroll_runs 
            WHERE property_id = ? AND period_month = ? AND period_year = ?
        `).get(propertyId, month, year) as any;

        if (existing) {
            return res.status(400).json({ success: false, error: `Payroll for ${month}/${year} has already been generated (Run #${existing.id})` });
        }

        // Fetch all active employees
        const employees = db.prepare(`
            SELECT id, basic_salary FROM employees
            WHERE property_id = ? AND status = 'ACTIVE'
        `).all(propertyId) as any[];

        if (employees.length === 0) {
            return res.status(400).json({ success: false, error: 'No active employees found to process payroll' });
        }

        let totalGross = 0;
        let totalDeductions = 0;
        let totalNet = 0;

        const itemsToInsert: any[] = [];

        employees.forEach(emp => {
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
        const runStmt = db.prepare(`
            INSERT INTO payroll_runs (property_id, period_month, period_year, total_gross, total_deductions, total_net, is_posted_to_gl)
            VALUES (?, ?, ?, ?, ?, ?, 1)
        `);
        const runResult = runStmt.run(propertyId, month, year, totalGross, totalDeductions, totalNet);
        const payrollRunId = Number(runResult.lastInsertRowid);

        // 2. Insert Payroll Items
        const itemStmt = db.prepare(`
            INSERT INTO payroll_items (
                payroll_run_id, employee_id, basic_salary, allowances, overtime_pay, deductions, tax_deductions, net_salary, payment_status
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'PAID')
        `);

        for (const item of itemsToInsert) {
            itemStmt.run(
                payrollRunId,
                item.employeeId,
                item.basic,
                item.allowance,
                item.overtime,
                item.deductions,
                item.tax,
                item.net
            );
        }

        // 3. Post Balanced Double-Entry Journal to General Ledger:
        // Dr: Salaries & Staff Wages Expense (5010) [totalGross]
        // Cr: Operating Bank Account (1020) [totalNet]
        // Cr: Government VAT / Tax Payable (2020) [totalDeductions]
        const salaryAccount = db.prepare("SELECT id FROM chart_of_accounts WHERE account_code = '5010'").get() as any;
        const bankAccount = db.prepare("SELECT id FROM chart_of_accounts WHERE account_code = '1020'").get() as any;
        const taxAccount = db.prepare("SELECT id FROM chart_of_accounts WHERE account_code = '2020'").get() as any;

        if (salaryAccount && bankAccount) {
            const entryNumber = `JV-PR-${year}${String(month).padStart(2, '0')}-${payrollRunId}`;
            const jvStmt = db.prepare(`
                INSERT INTO journal_entries (
                    organization_id, property_id, entry_number, entry_date, description, reference_type, reference_id, is_posted
                ) VALUES (1, ?, ?, CURRENT_DATE, ?, 'PAYROLL', ?, 1)
            `);
            const jvResult = jvStmt.run(
                propertyId,
                entryNumber,
                `Monthly Payroll Settlement for ${month}/${year} (${itemsToInsert.length} Staff)`,
                payrollRunId
            );
            const jvId = Number(jvResult.lastInsertRowid);

            const lineStmt = db.prepare(`
                INSERT INTO journal_lines (journal_entry_id, account_id, debit, credit, memo)
                VALUES (?, ?, ?, ?, ?)
            `);

            // Debit Salary Expense
            lineStmt.run(jvId, salaryAccount.id, totalGross, 0.00, `Staff Salary Expense ${month}/${year}`);

            // Credit Bank Account
            lineStmt.run(jvId, bankAccount.id, 0.00, totalNet, `Net Salary Disbursement via City Bank`);

            // Credit Tax/Deductions Payable if any
            if (totalDeductions > 0 && taxAccount) {
                lineStmt.run(jvId, taxAccount.id, 0.00, totalDeductions, `Tax & PF Deductions Withheld`);
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
