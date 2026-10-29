import { useState, useEffect, useMemo } from 'react';
import { DollarSign, ShoppingBag, ArrowUpRight, Plus, Calendar, ChevronDown, MoreHorizontal, LayoutGrid, UtensilsCrossed, Receipt, Utensils } from 'lucide-react';
import PageHeader from './common/PageHeader';
import { getAllStoredReservations, getCanonicalRooms, syncReservationsFromDB } from '../utils/roomInventoryEngine';
import { formatMoney } from '../utils/currencyUtils';

const POSDashboard = () => {
    const [timeRange, setTimeRange] = useState('Weekly');
    const [reservations, setReservations] = useState(() => getAllStoredReservations());
    const [rooms] = useState(() => getCanonicalRooms());

    useEffect(() => {
        syncReservationsFromDB().then(res => {
            if (res.length > 0) setReservations(res);
        }).catch(() => {});
    }, []);

    const { stats, topSellingItems } = useMemo(() => {
        const active = reservations.filter(r => r.status !== 'CANCELLED');
        const inHouse = active.filter(r => r.status === 'CHECKED_IN');
        let fnbRevenue = 0;
        const itemTracker = new Map<string, { sold: number; revenue: number }>();

        active.forEach(r => {
            if (Array.isArray(r.selectedExtras)) {
                r.selectedExtras.forEach((ex: any) => {
                    const price = Number(ex.price) || 0;
                    fnbRevenue += price;
                    const curr = itemTracker.get(ex.name) || { sold: 0, revenue: 0 };
                    curr.sold += 1;
                    curr.revenue += price;
                    itemTracker.set(ex.name, curr);
                });
            }
            // Add estimated dining/breakfast allocation from room rate plan
            const mealShare = Math.round((Number(r.totalRate) || 0) * 0.18);
            fnbRevenue += mealShare;
            const planName = r.ratePlan ? `${r.ratePlan} Dining` : 'Buffet Breakfast & Room Service';
            const curr = itemTracker.get(planName) || { sold: 0, revenue: 0 };
            curr.sold += Math.max(1, Number(r.adults) || 1);
            curr.revenue += mealShare;
            itemTracker.set(planName, curr);
        });

        const avgCheck = active.length > 0 ? Math.round(fnbRevenue / active.length) : 0;

        const computedStats = [
            { title: 'F&B & Add-on Revenue', value: formatMoney(fnbRevenue), change: '+12%', isPositive: true, icon: <DollarSign size={14} className="text-white" />, bg: 'bg-blue-600' },
            { title: 'In-House Dining Covers', value: `${inHouse.length} / ${Math.max(20, rooms.length)}`, change: 'Active', isPositive: true, icon: <LayoutGrid size={14} className="text-white" />, bg: 'bg-emerald-600' },
            { title: 'Active Room Folios', value: `${active.length} Open`, change: 'Live Queue', isPositive: false, icon: <Utensils size={14} className="text-white" />, bg: 'bg-amber-500' },
            { title: 'Avg Folio F&B Check', value: formatMoney(avgCheck), change: '+5%', isPositive: true, icon: <Receipt size={14} className="text-white" />, bg: 'bg-purple-600' },
        ];

        const topItems = Array.from(itemTracker.entries())
            .map(([name, val]) => ({
                name,
                sold: val.sold,
                revenue: formatMoney(val.revenue)
            }))
            .sort((a, b) => b.sold - a.sold)
            .slice(0, 4);

        return { stats: computedStats, topSellingItems: topItems };
    }, [reservations, rooms]);

    return (
        <div className="page-container">
            <PageHeader
                title="F&B POS Operations Dashboard"
                subtitle="Live restaurant tables, KOT status & folio revenue analytics"
                icon={<UtensilsCrossed size={20} />}
                actions={
                    <>
                        <button className="btn-secondary">
                            <Calendar size={13} className="text-slate-400" />
                            <span>{new Date().toLocaleDateString()}</span>
                            <ChevronDown size={11} className="text-slate-400" />
                        </button>
                        <button className="btn-primary">
                            <Plus size={14} />
                            <span>New Order</span>
                        </button>
                    </>
                }
            />

            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {stats.map((stat, index) => (
                    <div key={index} className="card-container !p-4">
                        <div className="flex justify-between items-center mb-2">
                            <div className={`size-8 rounded-xl flex items-center justify-center ${stat.bg}`}>
                                {stat.icon}
                            </div>
                            <span className={`flex items-center text-[10px] px-2 py-0.5 rounded-full ${stat.isPositive ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-slate-100 text-slate-600'}`}>
                                {stat.isPositive && stat.change.includes('%') ? <ArrowUpRight size={11} className="mr-0.5" /> : null}
                                {stat.change}
                            </span>
                        </div>
                        <div>
                            <p className="text-slate-400 text-[10.5px] uppercase tracking-wider">{stat.title}</p>
                            <h3 className="text-xl text-slate-900 leading-tight mt-0.5">{stat.value}</h3>
                        </div>
                    </div>
                ))}
            </div>

            {/* Charts Section */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
                {/* Revenue Chart */}
                <div className="lg:col-span-2 bg-white p-3.5 rounded-lg shadow-2xs border border-gray-200/80">
                    <div className="flex justify-between items-center mb-3">
                        <h2 className="text-xs text-gray-900">Revenue Trends</h2>
                        <div className="flex bg-gray-100 p-0.5 rounded-md">
                            {['Monthly', 'Weekly', 'Today'].map((range) => (
                                <button
                                    key={range}
                                    onClick={() => setTimeRange(range)}
                                    className={`px-2 py-0.5 text-[10px] font-semibold rounded transition-all ${timeRange === range ? 'bg-white text-gray-900 shadow-xs' : 'text-gray-500 hover:text-gray-900'}`}
                                >
                                    {range}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="relative h-36 w-full">
                        <svg viewBox="0 0 100 50" className="w-full h-full overflow-visible" preserveAspectRatio="none">
                            <line x1="0" y1="12.5" x2="100" y2="12.5" stroke="#f3f4f6" strokeWidth="0.5" />
                            <line x1="0" y1="25" x2="100" y2="25" stroke="#f3f4f6" strokeWidth="0.5" />
                            <line x1="0" y1="37.5" x2="100" y2="37.5" stroke="#f3f4f6" strokeWidth="0.5" />
                            <line x1="0" y1="50" x2="100" y2="50" stroke="#f3f4f6" strokeWidth="0.5" />

                            <defs>
                                <linearGradient id="posRevenueGradient" x1="0" x2="0" y1="0" y2="1">
                                    <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.15" />
                                    <stop offset="100%" stopColor="#3b82f6" stopOpacity="0" />
                                </linearGradient>
                            </defs>
                            <path
                                d="M0,40 C10,38 20,35 30,36 C40,37 50,30 60,25 C70,20 80,22 90,15 L100,10 L100,50 L0,50 Z"
                                fill="url(#posRevenueGradient)"
                            />
                            <path
                                d="M0,40 C10,38 20,35 30,36 C40,37 50,30 60,25 C70,20 80,22 90,15 L100,10"
                                fill="none"
                                stroke="#2563eb"
                                strokeWidth="1.5"
                                strokeLinecap="round"
                            />
                            <circle cx="60" cy="25" r="2" fill="white" stroke="#2563eb" strokeWidth="1.5" />
                        </svg>

                        <div className="flex justify-between text-[10px] text-gray-400 mt-2 px-1">
                            <span>Jan</span><span>Feb</span><span>Mar</span><span>Apr</span><span>May</span><span>Jun</span><span>Jul</span>
                        </div>
                    </div>
                </div>

                {/* Orders Statistic Chart (Dark Theme) */}
                <div className="bg-slate-900 p-3.5 rounded-lg shadow-2xs border border-slate-800 text-white flex flex-col justify-between">
                    <div className="flex justify-between items-start">
                        <div>
                            <h2 className="text-xs font-bold">Active Folios & Covers</h2>
                            <p className="text-slate-400 text-[10px]">{reservations.length} folios synchronized</p>
                        </div>
                        <MoreHorizontal size={14} className="text-slate-500" />
                    </div>

                    <div className="relative h-28 w-full my-2">
                        <svg viewBox="0 0 100 50" className="w-full h-full overflow-visible" preserveAspectRatio="none">
                            <defs>
                                <linearGradient id="posOrdersGradient" x1="0" x2="0" y1="0" y2="1">
                                    <stop offset="0%" stopColor="#fbbf24" stopOpacity="0.25" />
                                    <stop offset="100%" stopColor="#fbbf24" stopOpacity="0" />
                                </linearGradient>
                            </defs>
                            <path
                                d="M0,35 Q15,40 25,20 T50,35 T75,25 T100,30 L100,50 L0,50 Z"
                                fill="url(#posOrdersGradient)"
                            />
                            <path
                                d="M0,35 Q15,40 25,20 T50,35 T75,25 T100,30"
                                fill="none"
                                stroke="#f59e0b"
                                strokeWidth="1.5"
                                strokeLinecap="round"
                            />
                            <circle cx="75" cy="25" r="2" fill="#0f172a" stroke="#f59e0b" strokeWidth="1.5" />
                        </svg>
                    </div>

                    <div className="flex justify-between text-[9px] text-slate-400 px-1 font-medium">
                        <span>W1</span><span>W2</span><span>W3</span><span className="text-amber-400 font-bold">W4 (Peak)</span>
                    </div>
                </div>
            </div>

            {/* Bottom Section: Top Selling Items & Payment Modes */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
                {/* Top Selling Items */}
                <div className="lg:col-span-2 bg-white rounded-lg shadow-2xs border border-gray-200/80 p-3">
                    <div className="flex justify-between items-center pb-2 mb-2 border-b border-gray-100">
                        <h2 className="text-xs text-gray-900">Top Packages & Add-on Services</h2>
                        <span className="text-[10px] text-blue-600 font-semibold hover:underline cursor-pointer">Live Folio Data →</span>
                    </div>
                    <div className="space-y-1.5">
                        {topSellingItems.map((item, idx) => (
                            <div key={idx} className="flex items-center justify-between p-1.5 hover:bg-gray-50 rounded-md transition-colors border border-gray-100">
                                <div className="flex items-center gap-2.5">
                                    <span className="w-5 h-5 rounded-md bg-amber-50 text-amber-700 flex items-center justify-center text-[10px]">
                                        #{idx + 1}
                                    </span>
                                    <div>
                                        <h4 className="font-semibold text-gray-800 text-xs leading-none">{item.name}</h4>
                                        <p className="text-[10px] text-gray-400 mt-0.5">{item.sold} covers/units</p>
                                    </div>
                                </div>
                                <span className="text-gray-900 text-xs">{item.revenue}</span>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Right Column: Payment & Order Types */}
                <div className="bg-white rounded-lg shadow-2xs border border-gray-200/80 p-3 space-y-3">
                    <div>
                        <div className="flex justify-between items-center mb-2">
                            <h2 className="text-xs text-gray-900">Settlement Modes</h2>
                            <MoreHorizontal size={13} className="text-gray-400" />
                        </div>
                        <div className="flex items-center gap-3">
                            <div className="relative w-16 h-16 rounded-full flex-shrink-0" style={{ background: 'conic-gradient(#16a34a 0% 40%, #2563eb 40% 75%, #9333ea 75% 100%)' }}>
                                <div className="absolute inset-3.5 bg-white rounded-full"></div>
                            </div>
                            <div className="space-y-1 flex-1 text-[10.5px]">
                                <div className="flex justify-between text-gray-700"><span className="flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-emerald-600"></span> Cash</span> <span className="font-bold">40%</span></div>
                                <div className="flex justify-between text-gray-700"><span className="flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-blue-600"></span> Card</span> <span className="font-bold">35%</span></div>
                                <div className="flex justify-between text-gray-700"><span className="flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-purple-600"></span> Mobile</span> <span className="font-bold">25%</span></div>
                            </div>
                        </div>
                    </div>

                    <div className="border-t border-gray-100 pt-2 space-y-1.5 text-[10.5px]">
                        <div className="flex justify-between items-center text-gray-700">
                            <span className="flex items-center gap-1.5 font-medium"><UtensilsCrossed size={12} className="text-orange-500" /> Dine-In</span>
                            <span className="font-bold">65%</span>
                        </div>
                        <div className="h-1 w-full bg-gray-100 rounded-full overflow-hidden">
                            <div className="h-full bg-orange-500 w-[65%]"></div>
                        </div>

                        <div className="flex justify-between items-center text-gray-700 pt-1">
                            <span className="flex items-center gap-1.5 font-medium"><ShoppingBag size={12} className="text-blue-500" /> Room Service</span>
                            <span className="font-bold">35%</span>
                        </div>
                        <div className="h-1 w-full bg-gray-100 rounded-full overflow-hidden">
                            <div className="h-full bg-blue-500 w-[35%]"></div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default POSDashboard;
