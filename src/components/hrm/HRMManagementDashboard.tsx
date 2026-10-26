import React, { useState, useEffect } from 'react';
import { 
    Users, 
    Clock, 
    DollarSign, 
    UserCheck, 
    RefreshCw, 
    CheckCircle2, 
    CreditCard, 
    Search, 
    LogIn, 
    LogOut 
} from 'lucide-react';
import { getApiBaseUrl } from '../../utils/apiUrl';


interface Employee {
    id: number;
    employee_code: string;
    first_name: string;
    last_name: string;
    email: string;
    phone: string;
    department_name: string;
    designation_title: string;
    pay_grade: string;
    basic_salary: number;
    hire_date: string;
    status: string;
}

interface Shift {
    id: number;
    name: string;
    start_time: string;
    end_time: string;
    grace_period_minutes: number;
    assigned_today: number;
}

interface AttendanceRecord {
    id: number;
    employee_code: string;
    employee_name: string;
    department_name: string;
    designation_title: string;
    shift_name: string;
    attendance_date: string;
    clock_in: string | null;
    clock_out: string | null;
    work_hours: number;
    status: 'PRESENT' | 'LATE' | 'ABSENT' | 'HALF_DAY';
}

interface PayrollRun {
    id: number;
    period_month: number;
    period_year: number;
    total_gross: number;
    total_deductions: number;
    total_net: number;
    is_posted_to_gl: number;
    total_employees_paid: number;
}

export const HRMManagementDashboard: React.FC = () => {
    const [activeTab, setActiveTab] = useState<'employees' | 'shifts' | 'attendance' | 'payroll'>('employees');
    const [loading, setLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);

    // Data States
    const [employees, setEmployees] = useState<Employee[]>([]);
    const [shifts, setShifts] = useState<Shift[]>([]);
    const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
    const [payrollRuns, setPayrollRuns] = useState<PayrollRun[]>([]);
    const [departments, setDepartments] = useState<any[]>([]);

    // Search & Filter
    const [searchTerm, setSearchTerm] = useState('');

    // Attendance Clock Action Modal / State
    const [selectedEmployeeForClock, setSelectedEmployeeForClock] = useState<number | null>(null);
    const [selectedShiftForClock, setSelectedShiftForClock] = useState<number>(1);
    const [clockActionLoading, setClockActionLoading] = useState(false);

    // Payroll Processing Modal
    const [isPayrollModalOpen, setIsPayrollModalOpen] = useState(false);
    const [payrollMonth, setPayrollMonth] = useState(7); // July
    const [payrollYear, setPayrollYear] = useState(2026);
    const [processingPayroll, setProcessingPayroll] = useState(false);

    // Fetch HRM Data
    const loadHRMData = async () => {
        setLoading(true);
        setError(null);
        try {
            // 1. Fetch Employees
            const empRes = await fetch(`${getApiBaseUrl()}/api/hrm/employees?propertyId=1`);
            const empData = await empRes.json();
            if (empData.success) {
                setEmployees(empData.data);
                if (empData.data.length > 0 && !selectedEmployeeForClock) {
                    setSelectedEmployeeForClock(empData.data[0].id);
                }
            }

            // 2. Fetch Shifts
            const shiftsRes = await fetch(`${getApiBaseUrl()}/api/hrm/shifts?propertyId=1`);
            const shiftsData = await shiftsRes.json();
            if (shiftsData.success) {
                setShifts(shiftsData.data);
            }

            // 3. Fetch Today's Attendance
            const attRes = await fetch(`${getApiBaseUrl()}/api/hrm/attendance?propertyId=1&date=2026-07-01`);
            const attData = await attRes.json();
            if (attData.success) {
                setAttendance(attData.data);
            }

            // 4. Fetch Payroll Runs
            const payRes = await fetch(`${getApiBaseUrl()}/api/hrm/payroll?propertyId=1`);
            const payData = await payRes.json();
            if (payData.success) {
                setPayrollRuns(payData.data);
            }

            // 5. Fetch Departments
            const deptRes = await fetch(`${getApiBaseUrl()}/api/hrm/departments?propertyId=1`);
            const deptData = await deptRes.json();
            if (deptData.success) {
                setDepartments(deptData.data);
            }
        } catch (err: any) {
            setError(err.message || 'Error fetching HRM data');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadHRMData();
    }, []);

    // Clock Punch Handler
    const handleClockPunch = async (action: 'CLOCK_IN' | 'CLOCK_OUT') => {
        if (!selectedEmployeeForClock) return;
        setClockActionLoading(true);
        try {
            const res = await fetch(`${getApiBaseUrl()}/api/hrm/attendance/clock`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    employeeId: selectedEmployeeForClock,
                    shiftId: selectedShiftForClock,
                    action,
                    date: '2026-07-01'
                })
            });

            const data = await res.json();
            if (data.success) {
                alert(`✅ ${data.message}`);
                loadHRMData();
            } else {
                alert(`Error: ${data.error}`);
            }
        } catch (err: any) {
            alert(`Failed: ${err.message}`);
        } finally {
            setClockActionLoading(false);
        }
    };

    // Run Payroll
    const handleProcessPayroll = async (e: React.FormEvent) => {
        e.preventDefault();
        setProcessingPayroll(true);
        try {
            const res = await fetch(`${getApiBaseUrl()}/api/hrm/payroll/process`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    propertyId: 1,
                    month: Number(payrollMonth),
                    year: Number(payrollYear)
                })
            });

            const data = await res.json();
            if (data.success) {
                alert(`🎉 ${data.message}\nTotal Net Paid: ৳ ${data.summary.totalNet.toLocaleString()} (${data.summary.headcount} Staff)`);
                setIsPayrollModalOpen(false);
                loadHRMData();
            } else {
                alert(`Error: ${data.error}`);
            }
        } catch (err: any) {
            alert(`Payroll processing failed: ${err.message}`);
        } finally {
            setProcessingPayroll(false);
        }
    };

    const filteredEmployees = employees.filter(e => 
        e.first_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        e.last_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        e.employee_code.toLowerCase().includes(searchTerm.toLowerCase()) ||
        e.department_name.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const totalMonthlyPayrollExpense = employees.reduce((sum, e) => sum + (Number(e.basic_salary) || 0), 0);

    return (
        <div className="p-6 bg-slate-50 min-h-screen text-slate-800">
            {/* Top Bar */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center pb-6 border-b border-slate-200 gap-4">
                <div className="flex items-center gap-3">
                    <div className="p-2.5 bg-purple-600 text-white rounded-xl shadow-md">
                        <Users size={24} />
                    </div>
                    <div>
                        <h1 className="text-2xl text-slate-900 tracking-tight flex items-center gap-2">
                            HRM & 24/7 Workforce Suite
                            <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-purple-100 text-purple-800 border border-purple-300">
                                24/7 Shift Rostering & Payroll GL
                            </span>
                        </h1>
                        <p className="text-sm text-slate-500 mt-0.5">
                            Front Office, Housekeeping, Dining & Accounts Staffing with Automated GL Payroll Postings
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    <button 
                        onClick={loadHRMData}
                        className="flex items-center gap-2 px-3 py-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-lg text-sm font-medium shadow-sm transition"
                    >
                        <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
                        Refresh
                    </button>
                    <button 
                        onClick={() => setIsPayrollModalOpen(true)}
                        className="flex items-center gap-2 px-3.5 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-sm font-semibold shadow transition"
                    >
                        <DollarSign size={16} />
                        Run Monthly Payroll & Post GL
                    </button>
                </div>
            </div>

            {/* Error Message */}
            {error && (
                <div className="mt-4 p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs">
                    {error}
                </div>
            )}

            {/* Metrics Ribbon */}
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 mt-6">
                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                    <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Total Active Staff</div>
                    <div className="text-2xl text-slate-900 mt-1">{employees.length} Personnel</div>
                    <div className="text-[11px] text-slate-400 mt-0.5">Across {departments.length} Cost Center Departments</div>
                </div>
                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                    <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Monthly Base Payroll</div>
                    <div className="text-2xl text-purple-600 mt-1">৳ {totalMonthlyPayrollExpense.toLocaleString()}</div>
                </div>
                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                    <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Operational Shifts</div>
                    <div className="text-2xl text-slate-900 mt-1">4 Rotations (24/7)</div>
                </div>
                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                    <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Today's Attendance</div>
                    <div className="text-base text-emerald-600 mt-1 flex items-center gap-1.5">
                        <CheckCircle2 size={16} /> {attendance.filter(a => a.status === 'PRESENT' || a.status === 'LATE').length} Staff Clocked In
                    </div>
                </div>
            </div>

            {/* Tab Controls */}
            <div className="flex bg-slate-200/80 p-1 rounded-xl text-xs font-semibold mt-6 max-w-fit">
                <button
                    onClick={() => setActiveTab('employees')}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg transition ${
                        activeTab === 'employees' ? 'bg-white text-purple-700 shadow-sm' : 'text-slate-600 hover:text-slate-900'
                    }`}
                >
                    <Users size={14} /> Employee Directory ({employees.length})
                </button>
                <button
                    onClick={() => setActiveTab('attendance')}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg transition ${
                        activeTab === 'attendance' ? 'bg-white text-purple-700 shadow-sm' : 'text-slate-600 hover:text-slate-900'
                    }`}
                >
                    <UserCheck size={14} /> Live Attendance Punch Clock
                </button>
                <button
                    onClick={() => setActiveTab('shifts')}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg transition ${
                        activeTab === 'shifts' ? 'bg-white text-purple-700 shadow-sm' : 'text-slate-600 hover:text-slate-900'
                    }`}
                >
                    <Clock size={14} /> 24/7 Hotel Shifts ({shifts.length})
                </button>
                <button
                    onClick={() => setActiveTab('payroll')}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg transition ${
                        activeTab === 'payroll' ? 'bg-white text-purple-700 shadow-sm' : 'text-slate-600 hover:text-slate-900'
                    }`}
                >
                    <CreditCard size={14} /> Payroll Runs & GL ({payrollRuns.length})
                </button>
            </div>

            {/* TAB 1: EMPLOYEE DIRECTORY */}
            {activeTab === 'employees' && (
                <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden mt-6">
                    <div className="p-4 border-b border-slate-100 flex flex-wrap items-center justify-between gap-3">
                        <div className="relative w-72">
                            <Search className="absolute left-3 top-2.5 text-slate-400" size={14} />
                            <input 
                                type="text"
                                placeholder="Search employees by name, code..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-purple-500"
                            />
                        </div>
                        <div className="text-xs text-slate-500 font-medium">
                            Showing {filteredEmployees.length} of {employees.length} employees
                        </div>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs border-collapse">
                            <thead>
                                <tr className="bg-slate-100 text-slate-700 border-b border-slate-200 font-semibold">
                                    <th className="p-3">Staff Code</th>
                                    <th className="p-3">Full Name</th>
                                    <th className="p-3">Department</th>
                                    <th className="p-3">Designation</th>
                                    <th className="p-3">Pay Grade</th>
                                    <th className="p-3 text-right">Basic Salary</th>
                                    <th className="p-3">Contact</th>
                                    <th className="p-3">Status</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {filteredEmployees.map(emp => (
                                    <tr key={emp.id} className="hover:bg-slate-50 transition">
                                        <td className="p-3 font-mono text-purple-700">{emp.employee_code}</td>
                                        <td className="p-3 font-semibold text-slate-900">{emp.first_name} {emp.last_name}</td>
                                        <td className="p-3 text-slate-700">{emp.department_name}</td>
                                        <td className="p-3 text-slate-800 font-medium">{emp.designation_title}</td>
                                        <td className="p-3 font-mono text-[11px] text-slate-600">{emp.pay_grade}</td>
                                        <td className="p-3 text-right font-mono text-slate-900">
                                            ৳ {Number(emp.basic_salary).toLocaleString()}
                                        </td>
                                        <td className="p-3 text-slate-500 text-[11px]">
                                            <div>{emp.phone}</div>
                                            <div className="text-slate-400">{emp.email}</div>
                                        </td>
                                        <td className="p-3">
                                            <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-100 text-emerald-800">
                                                {emp.status}
                                            </span>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* TAB 2: LIVE ATTENDANCE & PUNCH CLOCK */}
            {activeTab === 'attendance' && (
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 mt-6">
                    {/* Punch Clock Station */}
                    <div className="lg:col-span-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between">
                        <div>
                            <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
                                <Clock className="text-purple-600" size={20} />
                                <div>
                                    <h2 className="text-sm text-slate-900">Front Desk Staff Punch Clock</h2>
                                    <p className="text-[11px] text-slate-400">Record Shift Clock-In / Clock-Out</p>
                                </div>
                            </div>

                            <div className="mt-4 space-y-3">
                                <div>
                                    <label className="block text-xs font-semibold text-slate-700 mb-1">Select Employee</label>
                                    <select
                                        value={selectedEmployeeForClock || ''}
                                        onChange={(e) => setSelectedEmployeeForClock(Number(e.target.value))}
                                        className="w-full text-xs p-2.5 border border-slate-200 rounded-lg focus:ring-1 focus:ring-purple-500 font-medium"
                                    >
                                        {employees.map(e => (
                                            <option key={e.id} value={e.id}>
                                                {e.employee_code} - {e.first_name} {e.last_name} ({e.department_name})
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-xs font-semibold text-slate-700 mb-1">Target Shift</label>
                                    <select
                                        value={selectedShiftForClock}
                                        onChange={(e) => setSelectedShiftForClock(Number(e.target.value))}
                                        className="w-full text-xs p-2.5 border border-slate-200 rounded-lg focus:ring-1 focus:ring-purple-500 font-medium"
                                    >
                                        {shifts.map(s => (
                                            <option key={s.id} value={s.id}>
                                                {s.name} ({s.start_time} - {s.end_time})
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-3 mt-6 pt-4 border-t border-slate-100">
                            <button
                                onClick={() => handleClockPunch('CLOCK_IN')}
                                disabled={clockActionLoading}
                                className="flex items-center justify-center gap-2 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs shadow transition"
                            >
                                <LogIn size={15} /> Clock IN
                            </button>
                            <button
                                onClick={() => handleClockPunch('CLOCK_OUT')}
                                disabled={clockActionLoading}
                                className="flex items-center justify-center gap-2 py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs shadow transition"
                            >
                                <LogOut size={15} /> Clock OUT
                            </button>
                        </div>
                    </div>

                    {/* Attendance Records List */}
                    <div className="lg:col-span-8 bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                        <div className="p-4 border-b border-slate-100 flex items-center justify-between">
                            <div>
                                <h2 className="text-sm text-slate-900">Today's Shift Attendance Logs</h2>
                                <p className="text-xs text-slate-500">Date: 2026-07-01 (Grand Palace Dhaka)</p>
                            </div>
                        </div>

                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-xs border-collapse">
                                <thead>
                                    <tr className="bg-slate-100 text-slate-700 border-b border-slate-200 font-semibold">
                                        <th className="p-3">Staff Code</th>
                                        <th className="p-3">Name & Role</th>
                                        <th className="p-3">Shift</th>
                                        <th className="p-3 font-mono">Clock In</th>
                                        <th className="p-3 font-mono">Clock Out</th>
                                        <th className="p-3 text-right">Hours</th>
                                        <th className="p-3">Status</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {attendance.map(a => (
                                        <tr key={a.id} className="hover:bg-slate-50 transition">
                                            <td className="p-3 font-mono text-purple-700">{a.employee_code}</td>
                                            <td className="p-3">
                                                <div className="font-semibold text-slate-900">{a.employee_name}</div>
                                                <div className="text-[10px] text-slate-400">{a.department_name} • {a.designation_title}</div>
                                            </td>
                                            <td className="p-3 font-medium text-slate-700">{a.shift_name}</td>
                                            <td className="p-3 font-mono text-[11px] text-emerald-700 font-medium">
                                                {a.clock_in ? a.clock_in.slice(11, 16) : '-'}
                                            </td>
                                            <td className="p-3 font-mono text-[11px] text-rose-700 font-medium">
                                                {a.clock_out ? a.clock_out.slice(11, 16) : '-'}
                                            </td>
                                            <td className="p-3 text-right font-mono text-slate-900">
                                                {a.work_hours ? `${a.work_hours}h` : '-'}
                                            </td>
                                            <td className="p-3">
                                                <span className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                                                    a.status === 'PRESENT' ? 'bg-emerald-100 text-emerald-800' :
                                                    a.status === 'LATE' ? 'bg-amber-100 text-amber-800' :
                                                    'bg-slate-100 text-slate-600'
                                                }`}>
                                                    {a.status}
                                                </span>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}

            {/* TAB 3: 24/7 SHIFTS */}
            {activeTab === 'shifts' && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mt-6">
                    {shifts.map(shift => (
                        <div key={shift.id} className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between">
                            <div>
                                <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                                    <span className="text-sm text-slate-900">{shift.name}</span>
                                    <Clock size={16} className="text-purple-600" />
                                </div>
                                <div className="mt-4 space-y-2">
                                    <div className="flex items-center justify-between text-xs">
                                        <span className="text-slate-400">Timings:</span>
                                        <span className="font-mono text-slate-800 text-sm">
                                            {shift.start_time} - {shift.end_time}
                                        </span>
                                    </div>
                                    <div className="flex items-center justify-between text-xs">
                                        <span className="text-slate-400">Grace Buffer:</span>
                                        <span className="text-slate-700 font-medium">{shift.grace_period_minutes} mins</span>
                                    </div>
                                    <div className="flex items-center justify-between text-xs">
                                        <span className="text-slate-400">Coverage:</span>
                                        <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-purple-100 text-purple-800">
                                            24/7 Continuous PMS
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* TAB 4: PAYROLL RUNS */}
            {activeTab === 'payroll' && (
                <div className="space-y-4 mt-6">
                    {payrollRuns.map(run => (
                        <div key={run.id} className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
                            <div className="flex flex-wrap items-center justify-between pb-3 border-b border-slate-100 gap-2">
                                <div className="flex items-center gap-3">
                                    <span className="text-sm text-slate-900">
                                        Month: {run.period_month}/{run.period_year} (Payroll Run #{run.id})
                                    </span>
                                    <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200 flex items-center gap-1">
                                        <CheckCircle2 size={12} /> Posted to General Ledger
                                    </span>
                                </div>
                                <div className="text-xs text-slate-500 font-medium">
                                    {run.total_employees_paid} Staff Processed
                                </div>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-4">
                                <div className="p-3 bg-slate-50 rounded-xl">
                                    <div className="text-[11px] text-slate-400 uppercase font-semibold">Total Gross Salaries</div>
                                    <div className="text-base font-mono text-slate-900 mt-0.5">
                                        ৳ {Number(run.total_gross).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                    </div>
                                </div>
                                <div className="p-3 bg-slate-50 rounded-xl">
                                    <div className="text-[11px] text-slate-400 uppercase font-semibold">Tax & PF Deductions</div>
                                    <div className="text-base font-mono text-rose-600 mt-0.5">
                                        ৳ {Number(run.total_deductions).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                    </div>
                                </div>
                                <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-100">
                                    <div className="text-[11px] text-emerald-800 uppercase font-semibold">Net Bank Disbursement</div>
                                    <div className="text-base font-mono text-emerald-700 mt-0.5">
                                        ৳ {Number(run.total_net).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Modal: Process Monthly Payroll */}
            {isPayrollModalOpen && (
                <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
                    <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl border border-slate-200 overflow-hidden">
                        <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50">
                            <div>
                                <h3 className="text-base text-slate-900">Run Monthly Payroll Automation</h3>
                                <p className="text-xs text-slate-500">Computes payslips and creates balanced JV in General Ledger</p>
                            </div>
                            <button 
                                onClick={() => setIsPayrollModalOpen(false)}
                                className="text-slate-400 hover:text-slate-600 text-sm p-1"
                            >
                                ✕
                            </button>
                        </div>

                        <form onSubmit={handleProcessPayroll} className="p-5 space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-semibold text-slate-700 mb-1">Period Month</label>
                                    <select
                                        value={payrollMonth}
                                        onChange={(e) => setPayrollMonth(Number(e.target.value))}
                                        className="w-full text-xs p-2.5 border border-slate-200 rounded-lg focus:ring-1 focus:ring-purple-500"
                                    >
                                        <option value={6}>June (06)</option>
                                        <option value={7}>July (07)</option>
                                        <option value={8}>August (08)</option>
                                        <option value={9}>September (09)</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-slate-700 mb-1">Period Year</label>
                                    <input 
                                        type="number"
                                        value={payrollYear}
                                        onChange={(e) => setPayrollYear(Number(e.target.value))}
                                        className="w-full text-xs p-2.5 border border-slate-200 rounded-lg font-mono"
                                        required
                                    />
                                </div>
                            </div>

                            <div className="p-3 bg-purple-50 rounded-xl border border-purple-100 text-xs space-y-1.5 text-purple-900">
                                <div className="flex items-center gap-1.5">
                                    <CheckCircle2 size={14} /> Automated USALI Accounting Journal Entry:
                                </div>
                                <div>• <strong>Debit:</strong> Account 5010 (Salaries & Staff Wages Expense)</div>
                                <div>• <strong>Credit:</strong> Account 1020 (Operating Bank Account)</div>
                                <div>• <strong>Credit:</strong> Account 2020 (Taxes & Deductions Withheld)</div>
                            </div>

                            <div className="flex justify-end gap-3 pt-3 border-t border-slate-100">
                                <button
                                    type="button"
                                    onClick={() => setIsPayrollModalOpen(false)}
                                    className="px-4 py-2 border border-slate-200 text-slate-600 text-xs font-semibold rounded-lg hover:bg-slate-50"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={processingPayroll}
                                    className="px-5 py-2 text-xs font-semibold text-white bg-purple-600 hover:bg-purple-700 rounded-lg shadow"
                                >
                                    {processingPayroll ? 'Processing & Posting...' : 'Confirm & Post to GL'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default HRMManagementDashboard;
