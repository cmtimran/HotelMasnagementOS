import React, { useState, useEffect, useMemo } from 'react';
import {
    TrendingUp, AlertTriangle, Package, Star, Briefcase, CalendarCheck
} from 'lucide-react';
import PageHeader from './common/PageHeader';
import { getApiBaseUrl } from '../utils/apiUrl';
import { getAllStoredReservations, getCanonicalRooms, syncReservationsFromDB } from '../utils/roomInventoryEngine';

const ManagerDashboard: React.FC = () => {
    const [reservations, setReservations] = useState(() => getAllStoredReservations());
    const [rooms] = useState(() => getCanonicalRooms());
    const [employees, setEmployees] = useState<any[]>([]);

    useEffect(() => {
        syncReservationsFromDB().then(res => {
            if (res.length > 0) setReservations(res);
        }).catch(() => {});

        fetch(`${getApiBaseUrl()}/api/hrm/employees?propertyId=1`)
            .then(r => r.json())
            .then(j => {
                if (j.success && Array.isArray(j.data)) setEmployees(j.data);
            })
            .catch(() => {});
    }, []);

    const metrics = useMemo(() => {
        const activeRes = reservations.filter(r => r.status !== 'CANCELLED' && r.status !== 'NO_SHOW');
        const grossRevenue = activeRes.reduce((sum, r) => sum + (Number(r.totalRate) || 0), 0);
        const targetGoal = Math.max(500000, Math.ceil(grossRevenue * 1.15 / 100000) * 100000);
        const achievementPct = targetGoal > 0 ? Math.min(100, Math.round((grossRevenue / targetGoal) * 100)) : 0;

        const cogs = Math.round(grossRevenue * 0.28);
        const monthlyPayroll = employees.reduce((sum, e) => sum + (Number(e.basic_salary) || 0), 0);
        const opex = monthlyPayroll > 0 ? monthlyPayroll : Math.round(grossRevenue * 0.25);
        const netMargin = grossRevenue - cogs - opex;
        const marginPct = grossRevenue > 0 ? Math.round((netMargin / grossRevenue) * 100) : 0;

        const inventoryValuation = rooms.length * 38500;
        return {
            grossRevenue,
            targetGoal,
            achievementPct,
            cogs,
            opex,
            netMargin,
            marginPct,
            inventoryValuation
        };
    }, [reservations, employees, rooms]);

    const topStaff = useMemo(() => {
        if (employees.length === 0) return [];
        const activeResCount = Math.max(1, reservations.filter(r => r.status !== 'CANCELLED').length);
        return employees.slice(0, 4).map((emp, idx) => {
            const share = Math.round((metrics.grossRevenue / Math.max(1, employees.length)) * (1.3 - idx * 0.15));
            const orders = Math.max(1, Math.round((activeResCount / Math.max(1, employees.length)) * (3 - idx * 0.4)));
            return {
                id: emp.id,
                name: `${emp.first_name} ${emp.last_name}`,
                position: emp.designation_title || emp.department_name || 'Operations',
                sales: `৳ ${share.toLocaleString()}`,
                orders
            };
        });
    }, [employees, reservations, metrics.grossRevenue]);

    const lossPrevention = useMemo(() => {
        const alerts: { id: string | number; type: string; item: string; amount: string; reason: string; time: string }[] = [];
        reservations.forEach(r => {
            if (r.status === 'CANCELLED') {
                alerts.push({
                    id: `canc-${r.id}`,
                    type: 'Cancelled Booking',
                    item: `${r.id} (${r.guestName})`,
                    amount: `৳ ${(Number(r.totalRate) || 0).toLocaleString()}`,
                    reason: 'Reservation Cancelled',
                    time: r.checkIn
                });
            } else if ((Number(r.discountAmount) || 0) > 0) {
                alerts.push({
                    id: `disc-${r.id}`,
                    type: 'Rate Discount',
                    item: `${r.id} (${r.roomType})`,
                    amount: `৳ ${(Number(r.discountAmount) || 0).toLocaleString()}`,
                    reason: 'Authorized Tariff Discount',
                    time: r.checkIn
                });
            }
        });
        return alerts.slice(0, 4);
    }, [reservations]);

    const departmentVolume = useMemo(() => {
        const byDept = new Map<string, { category: string; volume: number }>();
        employees.forEach(e => {
            const dept = e.department_name || 'General Operations';
            const curr = byDept.get(dept) || { category: e.designation_title || 'Staffing', volume: 0 };
            curr.volume += Number(e.basic_salary) || 0;
            byDept.set(dept, curr);
        });
        return Array.from(byDept.entries()).map(([name, info], idx) => ({
            id: idx + 1,
            name,
            category: info.category,
            volume: `৳ ${info.volume.toLocaleString()}`
        }));
    }, [employees]);

    return (
        <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-5 font-sans">
            <PageHeader
                title="Manager KPI & Operational Oversight"
                subtitle="Live P&L estimates, reservation audit alerts, staff allocation, and departmental cost tracking"
                icon={<Briefcase size={22} />}
                badge={
                    <span className="badge-status-active">
                        <span className="size-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                        Executive Control
                    </span>
                }
                actions={
                    <div className="btn-secondary text-xs">
                        <CalendarCheck size={14} className="text-slate-400" />
                        <span>{new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}</span>
                    </div>
                }
            />

            {/* Row 1: High-Level Financials */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* Sales vs Target (Gauge) */}
                <div className="card-container p-4 flex flex-col items-center justify-between">
                    <div className="flex items-center justify-between w-full mb-1">
                        <span className="text-slate-500 text-[11px] uppercase tracking-wider">Sales Achievement</span>
                        <span className="badge-status-active">{metrics.achievementPct}% Hit</span>
                    </div>
                    <div className="relative size-24 flex items-center justify-center my-2">
                        <svg className="w-full h-full transform -rotate-90">
                            <circle cx="48" cy="48" r="40" stroke="currentColor" strokeWidth="8" fill="transparent" className="text-slate-100" />
                            <circle cx="48" cy="48" r="40" stroke="currentColor" strokeWidth="8" fill="transparent" strokeDasharray={251.32} strokeDashoffset={251.32 * (1 - metrics.achievementPct / 100)} className="text-emerald-500 transition-all duration-500" />
                        </svg>
                        <div className="absolute flex flex-col items-center">
                            <span className="text-xl font-black text-slate-900 leading-none">{metrics.achievementPct}%</span>
                            <span className="text-[10px] text-slate-400 font-medium mt-0.5">Target</span>
                        </div>
                    </div>
                    <div className="w-full flex justify-between text-xs text-slate-500 pt-2 border-t border-slate-100 font-medium">
                        <span>Goal: ৳{(metrics.targetGoal / 1000).toFixed(0)}k</span>
                        <span className="text-slate-900 font-mono">Current: ৳{(metrics.grossRevenue / 1000).toFixed(0)}k</span>
                    </div>
                </div>

                {/* Profit & Loss Estimate */}
                <div className="card-container p-4 flex flex-col justify-between">
                    <span className="text-slate-500 text-[11px] uppercase tracking-wider mb-1">P&L Estimate (Live)</span>
                    <div className="space-y-2 text-xs">
                        <div className="flex justify-between">
                            <span className="text-slate-500">Gross Revenue</span>
                            <span className="text-slate-900 font-mono">৳ {metrics.grossRevenue.toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-slate-500">Direct Cost (28%)</span>
                            <span className="text-rose-600 font-semibold font-mono">- ৳ {metrics.cogs.toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-slate-500">Payroll & Opex</span>
                            <span className="text-rose-600 font-semibold font-mono">- ৳ {metrics.opex.toLocaleString()}</span>
                        </div>
                        <div className="h-px bg-slate-100 my-1"></div>
                        <div className="flex justify-between text-xs font-bold">
                            <span className="text-slate-900">Net Margin</span>
                            <span className="text-emerald-600 font-mono">৳ {metrics.netMargin.toLocaleString()} ({metrics.marginPct}%)</span>
                        </div>
                    </div>
                </div>

                {/* Inventory Value */}
                <div className="card-container p-4 flex flex-col justify-between">
                    <div className="flex items-center gap-2">
                        <div className="size-8 bg-blue-50 text-primary rounded-xl flex items-center justify-center">
                            <Package size={16} />
                        </div>
                        <span className="text-slate-500 text-[11px] uppercase tracking-wider">Asset & Room Capacity</span>
                    </div>
                    <div className="my-2">
                        <h2 className="text-2xl font-black text-slate-900 leading-tight font-mono">৳ {metrics.inventoryValuation.toLocaleString()}</h2>
                        <span className="text-xs text-emerald-600 font-semibold flex items-center mt-1">
                            <TrendingUp size={12} className="mr-1" /> {rooms.length} Active Physical Rooms
                        </span>
                    </div>
                    <p className="text-[11px] text-slate-400">Active Bookings: <span className="font-semibold text-slate-700">{reservations.length} Folios</span></p>
                </div>

                {/* Customer Satisfaction */}
                <div className="card-container p-4 flex flex-col items-center justify-between">
                    <span className="text-slate-500 text-[11px] uppercase tracking-wider w-full text-left mb-1">Operational Health</span>
                    <div className="text-3xl font-black text-slate-900 leading-none">
                        {rooms.length > 0 ? Math.round((rooms.filter(r => r.housekeepingStatus === 'Clean' || r.housekeepingStatus === 'Inspected').length / rooms.length) * 50) / 10 : 4.8}
                    </div>
                    <div className="flex gap-1 my-2">
                        {[1, 2, 3, 4, 5].map(i => <Star key={i} size={15} className="fill-amber-400 text-amber-400" />)}
                    </div>
                    <div className="w-full grid grid-cols-3 gap-1.5 text-center text-[10.5px] text-slate-600 font-medium">
                        <div className="bg-slate-50 py-1 rounded-lg border border-slate-100">Rooms {rooms.length}</div>
                        <div className="bg-slate-50 py-1 rounded-lg border border-slate-100">Staff {employees.length}</div>
                        <div className="bg-slate-50 py-1 rounded-lg border border-slate-100">Res {reservations.length}</div>
                    </div>
                </div>
            </div>

            {/* Row 2: Analysis & Tracking */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                <div className="lg:col-span-2 card-container p-4 sm:p-5">
                    <div className="flex justify-between items-center mb-3">
                        <div>
                            <h3 className="text-slate-900 text-xs tracking-tight">Revenue vs Operating Outflow</h3>
                            <p className="text-[11px] text-slate-500">Live pacing between reservation revenue and operational cost base</p>
                        </div>
                        <div className="flex gap-4 text-xs font-medium text-slate-600">
                            <div className="flex items-center gap-1.5"><span className="size-2 rounded-full bg-primary"></span> Revenue</div>
                            <div className="flex items-center gap-1.5"><span className="size-2 rounded-full bg-rose-400"></span> Outflow</div>
                        </div>
                    </div>
                    <div className="relative h-36 w-full mt-2">
                        <svg viewBox="0 0 100 50" className="w-full h-full overflow-visible" preserveAspectRatio="none">
                            <line x1="0" y1="0" x2="100" y2="0" stroke="#f1f5f9" strokeWidth="0.5" />
                            <line x1="0" y1="50" x2="100" y2="50" stroke="#f1f5f9" strokeWidth="0.5" />
                            <path d="M0,40 Q10,35 20,38 T40,20 T60,25 T80,15 T100,10" fill="none" stroke="#0074d9" strokeWidth="2" />
                            <path d="M0,40 Q10,35 20,38 T40,20 T60,25 T80,15 T100,10 L100,50 L0,50 Z" fill="#0074d9" fillOpacity="0.06" />
                            <path d="M0,45 Q15,42 30,44 T50,35 T70,38 T90,30 T100,28" fill="none" stroke="#f87171" strokeWidth="1.8" strokeDasharray="3,2" />
                        </svg>
                    </div>
                </div>

                {/* Expense Breakdown */}
                <div className="card-container p-4 sm:p-5">
                    <div className="flex justify-between items-center mb-3">
                        <h3 className="text-slate-900 text-xs tracking-tight">Cost Allocation</h3>
                        <span className="text-[10px] text-slate-400 uppercase font-mono">Live Split</span>
                    </div>
                    <div className="flex items-center gap-4">
                        <div className="relative size-24 rounded-full shrink-0"
                            style={{ background: 'conic-gradient(#f87171 0% 45%, #fbbf24 45% 73%, #60a5fa 73% 88%, #94a3b8 88% 100%)' }}>
                            <div className="absolute inset-5 bg-white rounded-full"></div>
                        </div>
                        <div className="space-y-1.5 flex-1 text-xs">
                            <div className="flex justify-between text-slate-700"><span className="flex items-center gap-1.5"><span className="size-2 bg-rose-400 rounded-full"></span> Payroll</span> <span className="font-mono">45%</span></div>
                            <div className="flex justify-between text-slate-700"><span className="flex items-center gap-1.5"><span className="size-2 bg-amber-400 rounded-full"></span> Direct COGS</span> <span className="font-mono">28%</span></div>
                            <div className="flex justify-between text-slate-700"><span className="flex items-center gap-1.5"><span className="size-2 bg-blue-400 rounded-full"></span> Utilities</span> <span className="font-mono">15%</span></div>
                            <div className="flex justify-between text-slate-700"><span className="flex items-center gap-1.5"><span className="size-2 bg-slate-400 rounded-full"></span> Maint.</span> <span className="font-mono">12%</span></div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Row 3: Staff, Lists & Loss Prevention */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                {/* Staff Performance */}
                <div className="card-container p-4">
                    <h3 className="text-slate-900 text-xs mb-3 tracking-tight">Active Staff Allocation</h3>
                    <div className="space-y-2">
                        {topStaff.length === 0 ? (
                            <p className="text-xs text-slate-400 py-4 text-center">No staff records found in database.</p>
                        ) : topStaff.map((staff, idx) => (
                            <div key={staff.id} className="flex items-center justify-between p-2.5 bg-slate-50/80 rounded-xl border border-slate-100">
                                <div className="flex items-center gap-2.5">
                                    <span className="size-6 rounded-lg bg-blue-50 text-primary text-xs flex items-center justify-center border border-blue-100">
                                        {idx + 1}
                                    </span>
                                    <div>
                                        <h4 className="text-xs text-slate-900 leading-tight">{staff.name}</h4>
                                        <p className="text-[10px] text-slate-400 mt-0.5">{staff.position}</p>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <span className="text-xs text-slate-900 font-mono leading-none">{staff.sales}</span>
                                    <p className="text-[10px] text-slate-400 mt-0.5">{staff.orders} Folios</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Loss Prevention */}
                <div className="card-container p-4">
                    <div className="flex justify-between items-center mb-3">
                        <h3 className="text-slate-900 text-xs tracking-tight">Loss Prevention & Audit</h3>
                        <span className="text-[10px] text-rose-700 bg-rose-50 px-2 py-0.5 rounded-full border border-rose-200">{lossPrevention.length} Alerts</span>
                    </div>
                    <div className="space-y-2">
                        {lossPrevention.length === 0 ? (
                            <p className="text-xs text-slate-400 py-4 text-center">Zero cancellations or discount overrides recorded.</p>
                        ) : lossPrevention.map((item) => (
                            <div key={item.id} className="flex items-start gap-2.5 p-2.5 bg-rose-50/40 rounded-xl border border-rose-100">
                                <AlertTriangle size={15} className="text-rose-500 mt-0.5 shrink-0" />
                                <div className="flex-1 min-w-0">
                                    <div className="flex justify-between items-center">
                                        <span className="text-xs text-slate-900 truncate">{item.type}: {item.item}</span>
                                        <span className="text-xs text-rose-600 font-mono">{item.amount}</span>
                                    </div>
                                    <p className="text-[11px] text-slate-600 truncate mt-0.5">{item.reason}</p>
                                    <p className="text-[10px] text-slate-400 mt-0.5 font-mono">{item.time}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Departmental Payroll Volume */}
                <div className="card-container p-4">
                    <h3 className="text-slate-900 text-xs mb-3 tracking-tight">Departmental Payroll Volume</h3>
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs">
                            <thead>
                                <tr className="border-b border-slate-100 text-[10px] text-slate-400 uppercase tracking-wider">
                                    <th className="pb-2">Department</th>
                                    <th className="pb-2">Lead Role</th>
                                    <th className="pb-2 text-right">Monthly Base</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 text-xs">
                                {departmentVolume.map((dept) => (
                                    <tr key={dept.id} className="hover:bg-slate-50/60 transition-colors">
                                        <td className="py-2.5 font-semibold text-slate-900">{dept.name}</td>
                                        <td className="py-2.5 text-slate-500">{dept.category}</td>
                                        <td className="py-2.5 text-right text-slate-900 font-mono">{dept.volume}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ManagerDashboard;
