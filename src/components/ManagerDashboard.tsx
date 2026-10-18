import {
    TrendingUp, AlertTriangle, Package, Star, Briefcase, CalendarCheck
} from 'lucide-react';

const ManagerDashboard = () => {
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
        <div className="p-3 sm:p-4 max-w-7xl mx-auto space-y-3 font-sans">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-gray-200">
                <div className="flex items-center gap-2">
                    <div className="w-7 h-7 bg-blue-600 rounded-md flex items-center justify-center text-white shadow-xs">
                        <Briefcase size={15} />
                    </div>
                    <div>
                        <h1 className="text-base font-bold text-gray-900 tracking-tight leading-none">Manager KPI & Operational Oversight</h1>
                        <p className="text-[11px] text-gray-500 font-medium leading-none mt-1">Daily P&L estimates, loss prevention, staff performance & procurement</p>
                    </div>
                </div>
                <div className="flex items-center gap-1.5 h-7 px-2.5 bg-white border border-gray-200 rounded-md text-xs font-medium text-gray-700 shadow-2xs">
                    <CalendarCheck size={13} className="text-gray-400" />
                    <span>{new Date().toLocaleDateString()}</span>
                </div>
            </div>

            {/* Row 1: High-Level Financials */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
                {/* Sales vs Target (Gauge) */}
                <div className="bg-white p-3 rounded-lg shadow-2xs border border-gray-200/80 flex flex-col items-center justify-between">
                    <div className="flex items-center justify-between w-full mb-1">
                        <span className="text-gray-500 text-[10px] font-bold uppercase tracking-wider">Sales Achievement</span>
                        <span className="text-[10px] text-emerald-600 font-semibold bg-emerald-50 px-1.5 py-0.2 rounded">85% Hit</span>
                    </div>
                    <div className="relative w-24 h-24 flex items-center justify-center my-1">
                        <svg className="w-full h-full transform -rotate-90">
                            <circle cx="48" cy="48" r="40" stroke="currentColor" strokeWidth="8" fill="transparent" className="text-gray-100" />
                            <circle cx="48" cy="48" r="40" stroke="currentColor" strokeWidth="8" fill="transparent" strokeDasharray={251.32} strokeDashoffset={251.32 * (1 - 0.85)} className="text-emerald-500 transition-all duration-500" />
                        </svg>
                        <div className="absolute flex flex-col items-center">
                            <span className="text-xl font-bold text-gray-900 leading-none">85%</span>
                            <span className="text-[9px] text-gray-400 font-medium mt-0.5">Target</span>
                        </div>
                    </div>
                    <div className="w-full flex justify-between text-[10px] text-gray-500 pt-1 border-t border-gray-100">
                        <span>Goal: ৳500k</span>
                        <span className="font-bold text-gray-900">Current: ৳425k</span>
                    </div>
                </div>

                {/* Profit & Loss Estimate */}
                <div className="bg-white p-3 rounded-lg shadow-2xs border border-gray-200/80 flex flex-col justify-between">
                    <span className="text-gray-500 text-[10px] font-bold uppercase tracking-wider mb-1">P&L Estimate (MTD)</span>
                    <div className="space-y-1.5 text-xs">
                        <div className="flex justify-between">
                            <span className="text-gray-500">Gross Revenue</span>
                            <span className="font-bold text-gray-900">৳ 425,000</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-gray-500">COGS (32%)</span>
                            <span className="text-rose-600 font-medium">- ৳ 136,000</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-gray-500">Opex & Staff</span>
                            <span className="text-rose-600 font-medium">- ৳ 120,000</span>
                        </div>
                        <div className="h-px bg-gray-100 my-1"></div>
                        <div className="flex justify-between text-xs font-bold">
                            <span className="text-gray-900">Net Margin</span>
                            <span className="text-emerald-600">৳ 169,000 (39%)</span>
                        </div>
                    </div>
                </div>

                {/* Inventory Value */}
                <div className="bg-white p-3 rounded-lg shadow-2xs border border-gray-200/80 flex flex-col justify-between">
                    <div className="flex items-center gap-2">
                        <div className="w-7 h-7 bg-blue-50 text-blue-600 rounded-md flex items-center justify-center">
                            <Package size={14} />
                        </div>
                        <span className="text-gray-500 text-[10px] font-bold uppercase tracking-wider">Inventory Value</span>
                    </div>
                    <div>
                        <h2 className="text-xl font-bold text-gray-900 leading-tight">৳ 1,250,500</h2>
                        <span className="text-[10px] text-emerald-600 font-semibold flex items-center mt-0.5">
                            <TrendingUp size={10} className="mr-0.5" /> +12% vs last month
                        </span>
                    </div>
                    <p className="text-[10px] text-gray-400">Top Valuation: <span className="font-semibold text-gray-700">F&B Spirits</span></p>
                </div>

                {/* Customer Satisfaction */}
                <div className="bg-white p-3 rounded-lg shadow-2xs border border-gray-200/80 flex flex-col items-center justify-between">
                    <span className="text-gray-500 text-[10px] font-bold uppercase tracking-wider w-full text-left mb-1">Guest Score</span>
                    <div className="text-3xl font-bold text-gray-900 leading-none">4.6</div>
                    <div className="flex gap-1 my-1">
                        {[1, 2, 3, 4].map(i => <Star key={i} size={14} className="fill-amber-400 text-amber-400" />)}
                        <Star size={14} className="fill-amber-400 text-amber-400" style={{ clipPath: 'inset(0 40% 0 0)' }} />
                    </div>
                    <div className="w-full grid grid-cols-3 gap-1 text-center text-[9px] text-gray-500">
                        <div className="bg-gray-50 p-1 rounded font-medium">Food 4.8</div>
                        <div className="bg-gray-50 p-1 rounded font-medium">Svc 4.5</div>
                        <div className="bg-gray-50 p-1 rounded font-medium">Amb 4.6</div>
                    </div>
                </div>
            </div>

            {/* Row 2: Analysis & Tracking */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
                {/* Purchase vs Sales Chart */}
                <div className="lg:col-span-2 bg-white p-3.5 rounded-lg shadow-2xs border border-gray-200/80">
                    <div className="flex justify-between items-center mb-2">
                        <h3 className="text-gray-900 font-bold text-xs">Procurement vs Sales Trend</h3>
                        <div className="flex gap-3 text-[10px] font-medium text-gray-500">
                            <div className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-blue-600"></span> Sales</div>
                            <div className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-rose-400"></span> Purchase</div>
                        </div>
                    </div>
                    <div className="relative h-32 w-full mt-2">
                        <svg viewBox="0 0 100 50" className="w-full h-full overflow-visible" preserveAspectRatio="none">
                            <line x1="0" y1="0" x2="100" y2="0" stroke="#f3f4f6" strokeWidth="0.5" />
                            <line x1="0" y1="50" x2="100" y2="50" stroke="#f3f4f6" strokeWidth="0.5" />

                            <path d="M0,40 Q10,35 20,38 T40,20 T60,25 T80,15 T100,10" fill="none" stroke="#2563eb" strokeWidth="1.5" />
                            <path d="M0,40 Q10,35 20,38 T40,20 T60,25 T80,15 T100,10 L100,50 L0,50 Z" fill="#2563eb" fillOpacity="0.05" />

                            <path d="M0,45 Q15,42 30,44 T50,35 T70,38 T90,30 T100,28" fill="none" stroke="#f87171" strokeWidth="1.5" strokeDasharray="3,2" />
                        </svg>
                        <div className="flex justify-between text-[9px] text-gray-400 mt-1">
                            <span>1 Jan</span><span>5 Jan</span><span>10 Jan</span><span>15 Jan</span><span>20 Jan</span><span>25 Jan</span>
                        </div>
                    </div>
                </div>

                {/* Expense Breakdown */}
                <div className="bg-white p-3.5 rounded-lg shadow-2xs border border-gray-200/80">
                    <div className="flex justify-between items-center mb-2">
                        <h3 className="text-gray-900 font-bold text-xs">Expense Breakdown</h3>
                    </div>
                    <div className="flex items-center gap-3">
                        <div className="relative w-20 h-20 rounded-full flex-shrink-0"
                            style={{ background: 'conic-gradient(#f87171 0% 40%, #fbbf24 40% 65%, #60a5fa 65% 85%, #9ca3af 85% 100%)' }}>
                            <div className="absolute inset-4 bg-white rounded-full"></div>
                        </div>
                        <div className="space-y-1 flex-1 text-[10.5px]">
                            <div className="flex justify-between text-gray-700"><span className="flex items-center gap-1.5"><span className="w-1.5 h-1.5 bg-rose-400 rounded-full"></span> Payroll</span> <span className="font-bold">40%</span></div>
                            <div className="flex justify-between text-gray-700"><span className="flex items-center gap-1.5"><span className="w-1.5 h-1.5 bg-amber-400 rounded-full"></span> Raw Mat.</span> <span className="font-bold">25%</span></div>
                            <div className="flex justify-between text-gray-700"><span className="flex items-center gap-1.5"><span className="w-1.5 h-1.5 bg-blue-400 rounded-full"></span> Utilities</span> <span className="font-bold">20%</span></div>
                            <div className="flex justify-between text-gray-700"><span className="flex items-center gap-1.5"><span className="w-1.5 h-1.5 bg-gray-400 rounded-full"></span> Maint.</span> <span className="font-bold">15%</span></div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Row 3: Staff, Lists & Loss Prevention */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
                {/* Staff Performance */}
                <div className="bg-white p-3 rounded-lg shadow-2xs border border-gray-200/80">
                    <h3 className="text-gray-900 font-bold text-xs mb-2">Top Performing Staff</h3>
                    <div className="space-y-1.5">
                        {topStaff.map((staff, idx) => (
                            <div key={staff.id} className="flex items-center justify-between p-1.5 bg-gray-50/70 rounded-md border border-gray-100">
                                <div className="flex items-center gap-2">
                                    <span className="w-5 h-5 rounded-md bg-blue-100 text-blue-700 font-bold text-[10px] flex items-center justify-center">
                                        {idx + 1}
                                    </span>
                                    <div>
                                        <h4 className="text-xs font-semibold text-gray-900 leading-none">{staff.name}</h4>
                                        <p className="text-[10px] text-gray-400 mt-0.5">{staff.position}</p>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <span className="text-xs font-bold text-gray-900 leading-none">{staff.sales}</span>
                                    <p className="text-[9px] text-gray-400">{staff.orders} Orders</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Loss Prevention */}
                <div className="bg-white p-3 rounded-lg shadow-2xs border border-gray-200/80">
                    <div className="flex justify-between items-center mb-2">
                        <h3 className="text-gray-900 font-bold text-xs">Loss Prevention & Audit</h3>
                        <span className="text-[9px] text-rose-600 font-bold bg-rose-50 px-1.5 py-0.2 rounded border border-rose-200">3 Alerts</span>
                    </div>
                    <div className="space-y-1.5">
                        {lossPrevention.map((item) => (
                            <div key={item.id} className="flex items-start gap-2 p-1.5 bg-rose-50/30 rounded-md border border-rose-100">
                                <AlertTriangle size={13} className="text-rose-500 mt-0.5 flex-shrink-0" />
                                <div className="flex-1 min-w-0">
                                    <div className="flex justify-between items-center">
                                        <span className="text-[11px] font-bold text-gray-800 truncate">{item.type}: {item.item}</span>
                                        <span className="text-[11px] font-bold text-rose-600">{item.amount}</span>
                                    </div>
                                    <p className="text-[10px] text-gray-500 truncate">{item.reason}</p>
                                    <p className="text-[9px] text-gray-400">{item.time}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Top Suppliers */}
                <div className="bg-white p-3 rounded-lg shadow-2xs border border-gray-200/80">
                    <h3 className="text-gray-900 font-bold text-xs mb-2">Top Suppliers & Volume</h3>
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs">
                            <thead>
                                <tr className="border-b border-gray-100 text-[10px] text-gray-400 uppercase font-bold">
                                    <th className="pb-1.5">Vendor</th>
                                    <th className="pb-1.5">Category</th>
                                    <th className="pb-1.5 text-right">Volume</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50 text-[11px]">
                                {suppliers.map((supplier) => (
                                    <tr key={supplier.id} className="hover:bg-gray-50/60">
                                        <td className="py-1.5 font-semibold text-gray-800">{supplier.name}</td>
                                        <td className="py-1.5 text-gray-500">{supplier.category}</td>
                                        <td className="py-1.5 text-right font-bold text-gray-900">{supplier.volume}</td>
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
