import {
    TrendingUp, AlertTriangle, Package, Star
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
        <div className="p-6 max-w-7xl mx-auto space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Manager Dashboard</h1>
                    <p className="text-gray-500 text-sm">Business performance and operational oversight.</p>
                </div>
                <div className="bg-white border invalid:border-gray-200 rounded-lg px-3 py-1 text-sm font-medium text-gray-600 shadow-sm">
                    {new Date().toLocaleDateString()}
                </div>
            </div>

            {/* Row 1: High-Level Financials */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">

                {/* Sales vs Target (Gauge) */}
                <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-200 flex flex-col items-center relative overflow-hidden">
                    <h3 className="text-gray-500 text-xs font-bold uppercase tracking-wider w-full text-left mb-2">Sales Achievement</h3>
                    <div className="relative w-32 h-32 flex items-center justify-center">
                        <svg className="w-full h-full transform -rotate-90">
                            <circle cx="64" cy="64" r="56" stroke="currentColor" strokeWidth="12" fill="transparent" className="text-gray-100" />
                            <circle cx="64" cy="64" r="56" stroke="currentColor" strokeWidth="12" fill="transparent" strokeDasharray={351.86} strokeDashoffset={351.86 * (1 - 0.85)} className="text-green-500" />
                        </svg>
                        <div className="absolute flex flex-col items-center">
                            <span className="text-2xl font-bold text-gray-900">85%</span>
                            <span className="text-[10px] text-gray-400">Target hit</span>
                        </div>
                    </div>
                    <div className="w-full flex justify-between text-xs mt-2 px-2">
                        <span className="text-gray-500">Goal: ৳ 500k</span>
                        <span className="font-bold text-gray-900">Current: ৳ 425k</span>
                    </div>
                </div>

                {/* Profit & Loss Estimate */}
                <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-200 flex flex-col justify-between">
                    <h3 className="text-gray-500 text-xs font-bold uppercase tracking-wider mb-4">P&L Estimate (Month)</h3>
                    <div className="space-y-3">
                        <div className="flex justify-between text-sm">
                            <span className="text-gray-600">Total Revenue</span>
                            <span className="font-bold text-gray-900">৳ 425,000</span>
                        </div>
                        <div className="flex justify-between text-sm">
                            <span className="text-gray-600">COGS (32%)</span>
                            <span className="text-red-500">- ৳ 136,000</span>
                        </div>
                        <div className="flex justify-between text-sm">
                            <span className="text-gray-600">Expenses</span>
                            <span className="text-red-500">- ৳ 120,000</span>
                        </div>
                        <div className="h-px bg-gray-200 my-2"></div>
                        <div className="flex justify-between text-base font-bold">
                            <span className="text-gray-900">Net Profit</span>
                            <span className="text-green-600">৳ 169,000</span>
                        </div>
                    </div>
                </div>

                {/* Inventory Value */}
                <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-200 flex flex-col justify-center">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="p-2 bg-blue-50 rounded-lg text-blue-600">
                            <Package size={20} />
                        </div>
                        <h3 className="text-gray-500 text-xs font-bold uppercase tracking-wider">Inventory Value</h3>
                    </div>
                    <div className="mt-2">
                        <h2 className="text-3xl font-bold text-gray-900">৳ 1,250,500</h2>
                        <span className="text-xs text-green-600 flex items-center mt-1"><TrendingUp size={12} className="mr-1" /> +12% vs Last Month</span>
                    </div>
                    <div className="mt-4 text-xs text-gray-500">
                        Top Cat: <span className="font-medium text-gray-700">Imported Spirits</span>
                    </div>
                </div>

                {/* Customer Feedback */}
                <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-200 flex flex-col items-center justify-center">
                    <h3 className="text-gray-500 text-xs font-bold uppercase tracking-wider mb-4 w-full text-left">Guest Satisfaction</h3>
                    <div className="text-5xl font-bold text-gray-900 mb-1">4.6</div>
                    <div className="flex gap-1 mb-2">
                        {[1, 2, 3, 4].map(i => <Star key={i} size={20} className="fill-yellow-400 text-yellow-400" />)}
                        <Star size={20} className="fill-yellow-400 text-yellow-400" style={{ clipPath: 'inset(0 40% 0 0)' }} />
                    </div>
                    <div className="w-full grid grid-cols-3 gap-1 text-center mt-4 text-[10px] text-gray-500">
                        <div className="bg-gray-50 p-1 rounded">Food 4.8</div>
                        <div className="bg-gray-50 p-1 rounded">Svc 4.5</div>
                        <div className="bg-gray-50 p-1 rounded">Amb 4.6</div>
                    </div>
                </div>
            </div>

            {/* Row 2: Analysis & Tracking */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

                {/* Purchase vs Sales Chart */}
                <div className="lg:col-span-2 bg-white p-5 rounded-xl shadow-sm border border-gray-200">
                    <div className="flex justify-between items-center mb-4">
                        <h3 className="text-gray-900 font-bold text-sm">Purchase vs Sales Trend</h3>
                        <div className="flex gap-4 text-xs">
                            <div className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-blue-500"></span> Sales</div>
                            <div className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-red-400"></span> Purchase</div>
                        </div>
                    </div>
                    <div className="relative h-64 w-full">
                        <svg viewBox="0 0 100 50" className="w-full h-full overflow-visible" preserveAspectRatio="none">
                            {/* Grid */}
                            <line x1="0" y1="0" x2="100" y2="0" stroke="#f3f4f6" strokeWidth="0.5" />
                            <line x1="0" y1="50" x2="100" y2="50" stroke="#f3f4f6" strokeWidth="0.5" />

                            {/* Sales Line */}
                            <path d="M0,40 Q10,35 20,38 T40,20 T60,25 T80,15 T100,10" fill="none" stroke="#3b82f6" strokeWidth="2" />
                            {/* Sales Area */}
                            <path d="M0,40 Q10,35 20,38 T40,20 T60,25 T80,15 T100,10 L100,50 L0,50 Z" fill="#3b82f6" fillOpacity="0.05" />

                            {/* Purchase Line */}
                            <path d="M0,45 Q15,42 30,44 T50,35 T70,38 T90,30 T100,28" fill="none" stroke="#f87171" strokeWidth="2" strokeDasharray="4,2" />
                        </svg>
                        <div className="flex justify-between text-xs text-gray-400 mt-2">
                            <span>1 Jan</span><span>5 Jan</span><span>10 Jan</span><span>15 Jan</span><span>20 Jan</span><span>25 Jan</span>
                        </div>
                    </div>
                </div>

                {/* Expense Breakdown */}
                <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-200">
                    <div className="flex justify-between items-center mb-4">
                        <h3 className="text-gray-900 font-bold text-sm">Expense Breakdown</h3>
                    </div>
                    <div className="flex items-center gap-4">
                        {/* Donut Chart */}
                        <div className="relative w-32 h-32 rounded-full flex-shrink-0"
                            style={{ background: 'conic-gradient(#f87171 0% 40%, #fbbf24 40% 65%, #60a5fa 65% 85%, #9ca3af 85% 100%)' }}>
                            <div className="absolute inset-8 bg-white rounded-full"></div>
                        </div>
                        <div className="space-y-2 flex-1 text-xs">
                            <div className="flex justify-between"><div className="flex items-center gap-2"><span className="w-2 h-2 bg-red-400 rounded-full"></span> Salaries</div> <span className="font-bold">40%</span></div>
                            <div className="flex justify-between"><div className="flex items-center gap-2"><span className="w-2 h-2 bg-amber-400 rounded-full"></span> Raw Mat.</div> <span className="font-bold">25%</span></div>
                            <div className="flex justify-between"><div className="flex items-center gap-2"><span className="w-2 h-2 bg-blue-400 rounded-full"></span> Utilities</div> <span className="font-bold">20%</span></div>
                            <div className="flex justify-between"><div className="flex items-center gap-2"><span className="w-2 h-2 bg-gray-400 rounded-full"></span> Maint.</div> <span className="font-bold">15%</span></div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Row 3: Staff, Lists & Tables */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

                {/* Staff Performance */}
                <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-200">
                    <h3 className="text-gray-900 font-bold text-sm mb-4">Top Staff (Sales)</h3>
                    <div className="space-y-4">
                        {topStaff.map((staff, idx) => (
                            <div key={staff.id} className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 font-bold text-xs">{idx + 1}</div>
                                    <div>
                                        <h4 className="text-sm font-semibold text-gray-900">{staff.name}</h4>
                                        <p className="text-[11px] text-gray-500">{staff.position}</p>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <div className="text-sm font-bold text-gray-900">{staff.sales}</div>
                                    <div className="text-[10px] text-gray-500">{staff.orders} Orders</div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Loss Prevention */}
                <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-200">
                    <div className="flex justify-between items-center mb-4">
                        <h3 className="text-gray-900 font-bold text-sm">Loss Prevention / Audit</h3>
                        <span className="text-xs text-red-500 font-medium bg-red-50 px-2 py-0.5 rounded">3 Alerts</span>
                    </div>
                    <div className="space-y-3">
                        {lossPrevention.map((item) => (
                            <div key={item.id} className="flex items-start gap-3 p-2 bg-red-50/30 rounded-lg border border-red-50">
                                <AlertTriangle size={16} className="text-red-500 mt-0.5" />
                                <div className="flex-1">
                                    <div className="flex justify-between">
                                        <span className="text-xs font-bold text-gray-800">{item.type}: {item.item}</span>
                                        <span className="text-xs font-bold text-red-600">{item.amount}</span>
                                    </div>
                                    <p className="text-[11px] text-gray-600 mt-0.5">{item.reason}</p>
                                    <p className="text-[10px] text-gray-400 mt-1">{item.time}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Top Suppliers */}
                <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-200">
                    <h3 className="text-gray-900 font-bold text-sm mb-4">Top Suppliers</h3>
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs">
                            <thead>
                                <tr className="border-b border-gray-100 text-gray-500">
                                    <th className="pb-2 font-medium">Supplier</th>
                                    <th className="pb-2 font-medium">Category</th>
                                    <th className="pb-2 font-medium text-right">Volume</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50">
                                {suppliers.map((supplier) => (
                                    <tr key={supplier.id}>
                                        <td className="py-2.5 font-medium text-gray-800">{supplier.name}</td>
                                        <td className="py-2.5 text-gray-500">{supplier.category}</td>
                                        <td className="py-2.5 text-right font-bold text-gray-900">{supplier.volume}</td>
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
