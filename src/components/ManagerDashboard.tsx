import React from 'react';
import {
    TrendingUp, AlertTriangle, Package, Star, Briefcase, CalendarCheck
} from 'lucide-react';
import PageHeader from './common/PageHeader';

const ManagerDashboard: React.FC = () => {
    // Mock Data
    const topStaff = [
        { id: 1, name: 'Rahim Ahmed', position: 'Waiter', sales: '৳ 45,000', orders: 120 },
        { id: 2, name: 'Karim Ullah', position: 'Waiter', sales: '৳ 38,500', orders: 95 },
        { id: 3, name: 'Suma Akter', position: 'Host', sales: '৳ 22,000', orders: 60 },
    ];

    const lossPrevention = [
        { id: 1, type: 'Void', item: 'Spicy Pasta', amount: '৳ 450', reason: 'Customer complained', time: '12:30 PM' },
        { id: 2, type: 'Discount', item: 'Family Platter', amount: '৳ 200', reason: 'Manager Override', time: '02:15 PM' },
        { id: 3, type: 'Cancel', item: 'Cold Coffee', amount: '৳ 120', reason: 'Mistake Entry', time: '04:00 PM' },
    ];

    const suppliers = [
        { id: 1, name: 'Fresh Foods Ltd', category: 'Vegetables', volume: '৳ 25,000' },
        { id: 2, name: 'City Meats', category: 'Meat', volume: '৳ 45,000' },
        { id: 3, name: 'Global Bev', category: 'Beverages', volume: '৳ 15,000' },
    ];

    return (
        <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-5 font-sans">
            {/* Standardized Thesis Page Header */}
            <PageHeader
                title="Manager KPI & Operational Oversight"
                subtitle="Daily P&L estimates, loss prevention telemetry, staff performance, and procurement tracking"
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
                        <span className="text-slate-500 text-[11px] font-bold uppercase tracking-wider">Sales Achievement</span>
                        <span className="badge-status-active">85% Hit</span>
                    </div>
                    <div className="relative size-24 flex items-center justify-center my-2">
                        <svg className="w-full h-full transform -rotate-90">
                            <circle cx="48" cy="48" r="40" stroke="currentColor" strokeWidth="8" fill="transparent" className="text-slate-100" />
                            <circle cx="48" cy="48" r="40" stroke="currentColor" strokeWidth="8" fill="transparent" strokeDasharray={251.32} strokeDashoffset={251.32 * (1 - 0.85)} className="text-emerald-500 transition-all duration-500" />
                        </svg>
                        <div className="absolute flex flex-col items-center">
                            <span className="text-xl font-black text-slate-900 leading-none">85%</span>
                            <span className="text-[10px] text-slate-400 font-medium mt-0.5">Target</span>
                        </div>
                    </div>
                    <div className="w-full flex justify-between text-xs text-slate-500 pt-2 border-t border-slate-100 font-medium">
                        <span>Goal: ৳500k</span>
                        <span className="font-bold text-slate-900 font-mono">Current: ৳425k</span>
                    </div>
                </div>

                {/* Profit & Loss Estimate */}
                <div className="card-container p-4 flex flex-col justify-between">
                    <span className="text-slate-500 text-[11px] font-bold uppercase tracking-wider mb-1">P&L Estimate (MTD)</span>
                    <div className="space-y-2 text-xs">
                        <div className="flex justify-between">
                            <span className="text-slate-500">Gross Revenue</span>
                            <span className="font-bold text-slate-900 font-mono">৳ 425,000</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-slate-500">COGS (32%)</span>
                            <span className="text-rose-600 font-semibold font-mono">- ৳ 136,000</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-slate-500">Opex & Staff</span>
                            <span className="text-rose-600 font-semibold font-mono">- ৳ 120,000</span>
                        </div>
                        <div className="h-px bg-slate-100 my-1"></div>
                        <div className="flex justify-between text-xs font-bold">
                            <span className="text-slate-900">Net Margin</span>
                            <span className="text-emerald-600 font-mono">৳ 169,000 (39%)</span>
                        </div>
                    </div>
                </div>

                {/* Inventory Value */}
                <div className="card-container p-4 flex flex-col justify-between">
                    <div className="flex items-center gap-2">
                        <div className="size-8 bg-blue-50 text-primary rounded-xl flex items-center justify-center">
                            <Package size={16} />
                        </div>
                        <span className="text-slate-500 text-[11px] font-bold uppercase tracking-wider">Inventory Value</span>
                    </div>
                    <div className="my-2">
                        <h2 className="text-2xl font-black text-slate-900 leading-tight font-mono">৳ 1,250,500</h2>
                        <span className="text-xs text-emerald-600 font-semibold flex items-center mt-1">
                            <TrendingUp size={12} className="mr-1" /> +12% vs last month
                        </span>
                    </div>
                    <p className="text-[11px] text-slate-400">Top Valuation: <span className="font-semibold text-slate-700">F&B Spirits</span></p>
                </div>

                {/* Customer Satisfaction */}
                <div className="card-container p-4 flex flex-col items-center justify-between">
                    <span className="text-slate-500 text-[11px] font-bold uppercase tracking-wider w-full text-left mb-1">Guest Score</span>
                    <div className="text-3xl font-black text-slate-900 leading-none">4.6</div>
                    <div className="flex gap-1 my-2">
                        {[1, 2, 3, 4].map(i => <Star key={i} size={15} className="fill-amber-400 text-amber-400" />)}
                        <Star size={15} className="fill-amber-400 text-amber-400" style={{ clipPath: 'inset(0 40% 0 0)' }} />
                    </div>
                    <div className="w-full grid grid-cols-3 gap-1.5 text-center text-[10.5px] text-slate-600 font-medium">
                        <div className="bg-slate-50 py-1 rounded-lg border border-slate-100">Food 4.8</div>
                        <div className="bg-slate-50 py-1 rounded-lg border border-slate-100">Svc 4.5</div>
                        <div className="bg-slate-50 py-1 rounded-lg border border-slate-100">Amb 4.6</div>
                    </div>
                </div>
            </div>

            {/* Row 2: Analysis & Tracking */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                {/* Purchase vs Sales Chart */}
                <div className="lg:col-span-2 card-container p-4 sm:p-5">
                    <div className="flex justify-between items-center mb-3">
                        <div>
                            <h3 className="text-slate-900 font-bold text-xs tracking-tight">Procurement vs Sales Trend</h3>
                            <p className="text-[11px] text-slate-500">Monthly pacing between hotel revenue and vendor outflow</p>
                        </div>
                        <div className="flex gap-4 text-xs font-medium text-slate-600">
                            <div className="flex items-center gap-1.5"><span className="size-2 rounded-full bg-primary"></span> Sales</div>
                            <div className="flex items-center gap-1.5"><span className="size-2 rounded-full bg-rose-400"></span> Purchase</div>
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
                        <div className="flex justify-between text-[10px] text-slate-400 font-mono mt-1.5">
                            <span>1 Jan</span><span>5 Jan</span><span>10 Jan</span><span>15 Jan</span><span>20 Jan</span><span>25 Jan</span>
                        </div>
                    </div>
                </div>

                {/* Expense Breakdown */}
                <div className="card-container p-4 sm:p-5">
                    <div className="flex justify-between items-center mb-3">
                        <h3 className="text-slate-900 font-bold text-xs tracking-tight">Expense Breakdown</h3>
                        <span className="text-[10px] text-slate-400 uppercase font-mono">Actuals</span>
                    </div>
                    <div className="flex items-center gap-4">
                        <div className="relative size-24 rounded-full shrink-0"
                            style={{ background: 'conic-gradient(#f87171 0% 40%, #fbbf24 40% 65%, #60a5fa 65% 85%, #94a3b8 85% 100%)' }}>
                            <div className="absolute inset-5 bg-white rounded-full"></div>
                        </div>
                        <div className="space-y-1.5 flex-1 text-xs">
                            <div className="flex justify-between text-slate-700"><span className="flex items-center gap-1.5"><span className="size-2 bg-rose-400 rounded-full"></span> Payroll</span> <span className="font-bold font-mono">40%</span></div>
                            <div className="flex justify-between text-slate-700"><span className="flex items-center gap-1.5"><span className="size-2 bg-amber-400 rounded-full"></span> Raw Mat.</span> <span className="font-bold font-mono">25%</span></div>
                            <div className="flex justify-between text-slate-700"><span className="flex items-center gap-1.5"><span className="size-2 bg-blue-400 rounded-full"></span> Utilities</span> <span className="font-bold font-mono">20%</span></div>
                            <div className="flex justify-between text-slate-700"><span className="flex items-center gap-1.5"><span className="size-2 bg-slate-400 rounded-full"></span> Maint.</span> <span className="font-bold font-mono">15%</span></div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Row 3: Staff, Lists & Loss Prevention */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                {/* Staff Performance */}
                <div className="card-container p-4">
                    <h3 className="text-slate-900 font-bold text-xs mb-3 tracking-tight">Top Performing Staff</h3>
                    <div className="space-y-2">
                        {topStaff.map((staff, idx) => (
                            <div key={staff.id} className="flex items-center justify-between p-2.5 bg-slate-50/80 rounded-xl border border-slate-100">
                                <div className="flex items-center gap-2.5">
                                    <span className="size-6 rounded-lg bg-blue-50 text-primary font-bold text-xs flex items-center justify-center border border-blue-100">
                                        {idx + 1}
                                    </span>
                                    <div>
                                        <h4 className="text-xs font-bold text-slate-900 leading-tight">{staff.name}</h4>
                                        <p className="text-[10px] text-slate-400 mt-0.5">{staff.position}</p>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <span className="text-xs font-bold text-slate-900 font-mono leading-none">{staff.sales}</span>
                                    <p className="text-[10px] text-slate-400 mt-0.5">{staff.orders} Orders</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Loss Prevention */}
                <div className="card-container p-4">
                    <div className="flex justify-between items-center mb-3">
                        <h3 className="text-slate-900 font-bold text-xs tracking-tight">Loss Prevention & Audit</h3>
                        <span className="text-[10px] text-rose-700 font-bold bg-rose-50 px-2 py-0.5 rounded-full border border-rose-200">3 Alerts</span>
                    </div>
                    <div className="space-y-2">
                        {lossPrevention.map((item) => (
                            <div key={item.id} className="flex items-start gap-2.5 p-2.5 bg-rose-50/40 rounded-xl border border-rose-100">
                                <AlertTriangle size={15} className="text-rose-500 mt-0.5 shrink-0" />
                                <div className="flex-1 min-w-0">
                                    <div className="flex justify-between items-center">
                                        <span className="text-xs font-bold text-slate-900 truncate">{item.type}: {item.item}</span>
                                        <span className="text-xs font-bold text-rose-600 font-mono">{item.amount}</span>
                                    </div>
                                    <p className="text-[11px] text-slate-600 truncate mt-0.5">{item.reason}</p>
                                    <p className="text-[10px] text-slate-400 mt-0.5 font-mono">{item.time}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Top Suppliers */}
                <div className="card-container p-4">
                    <h3 className="text-slate-900 font-bold text-xs mb-3 tracking-tight">Top Suppliers & Volume</h3>
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs">
                            <thead>
                                <tr className="border-b border-slate-100 text-[10px] text-slate-400 uppercase font-bold tracking-wider">
                                    <th className="pb-2">Vendor</th>
                                    <th className="pb-2">Category</th>
                                    <th className="pb-2 text-right">Volume</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 text-xs">
                                {suppliers.map((supplier) => (
                                    <tr key={supplier.id} className="hover:bg-slate-50/60 transition-colors">
                                        <td className="py-2.5 font-semibold text-slate-900">{supplier.name}</td>
                                        <td className="py-2.5 text-slate-500">{supplier.category}</td>
                                        <td className="py-2.5 text-right font-bold text-slate-900 font-mono">{supplier.volume}</td>
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
