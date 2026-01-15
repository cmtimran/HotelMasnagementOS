import { useState } from 'react';
import { DollarSign, ShoppingBag, ArrowUpRight, Plus, Calendar, ChevronDown, MoreHorizontal, LayoutGrid, UtensilsCrossed, Globe, Receipt, Utensils } from 'lucide-react';

const POSDashboard = () => {
    const [timeRange, setTimeRange] = useState('Weekly');

    // Mock Data for Stats Cards
    const stats = [
        { title: 'Total Revenue', value: '৳ 24,500', change: '+12%', isPositive: true, icon: <DollarSign size={20} className="text-white" />, bg: 'bg-blue-600' },
        { title: 'Live Table Status', value: '12 / 20', change: 'Occupied', isPositive: true, icon: <LayoutGrid size={20} className="text-white" />, bg: 'bg-green-500' },
        { title: 'Kitchen Pending', value: '8', change: 'Active KOTs', isPositive: false, icon: <Utensils size={20} className="text-white" />, bg: 'bg-orange-500' },
        { title: 'Avg Bill Value', value: '৳ 1,250', change: '+5%', isPositive: true, icon: <Receipt size={20} className="text-white" />, bg: 'bg-purple-500' },
    ];





    const topSellingItems = [
        { name: 'Chicken BBQ Pizza', sold: 120, revenue: '৳ 54,000' },
        { name: 'Spicy Burger', sold: 95, revenue: '৳ 23,750' },
        { name: 'Cold Coffee', sold: 210, revenue: '৳ 16,800' },
        { name: 'Italian Pasta', sold: 85, revenue: '৳ 18,500' },
    ];
    return (
        <div className="p-6 max-w-7xl mx-auto space-y-8">
            {/* Page Header & Quick Actions */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
                    <p className="text-gray-500 text-sm">Welcome back, overview of your restaurant performance.</p>
                </div>
                <div className="flex items-center gap-3">
                    <button className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 text-gray-700 rounded-lg hover:bg-gray-50 text-sm font-medium transition-colors">
                        <Calendar size={16} />
                        <span>{new Date().toLocaleDateString()}</span>
                        <ChevronDown size={14} className="text-gray-400" />
                    </button>
                    <button className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium shadow-sm transition-colors">
                        <Plus size={18} />
                        New Order
                    </button>
                </div>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {stats.map((stat, index) => (
                    <div key={index} className="bg-white p-5 rounded-xl shadow-sm border border-gray-200 transition-all hover:shadow-md">
                        <div className="flex justify-between items-start mb-4">
                            <div className={`p-3 rounded-xl shadow-sm ${stat.bg} shadow-blue-100`}>
                                {stat.icon}
                            </div>
                            <span className={`flex items-center text-xs font-bold px-2 py-1 rounded-full ${stat.isPositive ? 'bg-green-50 text-green-600' : 'bg-gray-100 text-gray-600'}`}>
                                {stat.isPositive && stat.change.includes('%') ? <ArrowUpRight size={14} className="mr-1" /> : null}
                                {stat.change}
                            </span>
                        </div>
                        <div>
                            <p className="text-gray-500 text-sm font-medium">{stat.title}</p>
                            <h3 className="text-2xl font-bold text-gray-900 mt-1">{stat.value}</h3>
                        </div>
                    </div>
                ))}
            </div>

            {/* Charts Section */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

                {/* Revenue Chart (Triggers 2 cols) */}
                <div className="lg:col-span-2 bg-white p-6 rounded-xl shadow-sm border border-gray-200">
                    <div className="flex justify-between items-center mb-6">
                        <h2 className="text-lg font-bold text-gray-900">Revenue Trends</h2>
                        <div className="flex bg-gray-100 p-1 rounded-lg">
                            {['Monthly', 'Weekly', 'Today'].map((range) => (
                                <button
                                    key={range}
                                    onClick={() => setTimeRange(range)}
                                    className={`px-3 py-1 text-xs font-medium rounded-md transition-all ${timeRange === range ? 'bg-black text-white shadow-sm' : 'text-gray-500 hover:text-gray-900'}`}
                                >
                                    {range}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Hand-crafted SVG Chart */}
                    <div className="relative h-64 w-full">
                        <svg viewBox="0 0 100 50" className="w-full h-full overflow-visible" preserveAspectRatio="none">
                            {/* Grid Lines */}
                            <line x1="0" y1="0" x2="100" y2="0" stroke="#f3f4f6" strokeWidth="0.5" />
                            <line x1="0" y1="12.5" x2="100" y2="12.5" stroke="#f3f4f6" strokeWidth="0.5" />
                            <line x1="0" y1="25" x2="100" y2="25" stroke="#f3f4f6" strokeWidth="0.5" />
                            <line x1="0" y1="37.5" x2="100" y2="37.5" stroke="#f3f4f6" strokeWidth="0.5" />
                            <line x1="0" y1="50" x2="100" y2="50" stroke="#f3f4f6" strokeWidth="0.5" />

                            {/* Area Fill */}
                            <defs>
                                <linearGradient id="revenueGradient" x1="0" x2="0" y1="0" y2="1">
                                    <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.1" />
                                    <stop offset="100%" stopColor="#3b82f6" stopOpacity="0" />
                                </linearGradient>
                            </defs>
                            <path
                                d="M0,40 C10,38 20,35 30,36 C40,37 50,30 60,25 C70,20 80,22 90,15 L100,10 L100,50 L0,50 Z"
                                fill="url(#revenueGradient)"
                            />

                            {/* Line Path */}
                            <path
                                d="M0,40 C10,38 20,35 30,36 C40,37 50,30 60,25 C70,20 80,22 90,15 L100,10"
                                fill="none"
                                stroke="#000"
                                strokeWidth="1"
                                strokeLinecap="round"
                            />

                            {/* Data Point with Tooltip Simulation */}
                            <circle cx="60" cy="25" r="2" fill="white" stroke="#000" strokeWidth="1" />
                            <circle cx="60" cy="25" r="4" fill="none" stroke="#000" strokeWidth="0.2" strokeOpacity="0.3" className="animate-pulse" />
                        </svg>

                        {/* Axis Labels */}
                        <div className="flex justify-between text-xs text-gray-400 mt-2 px-1">
                            <span>Jan</span><span>Feb</span><span>Mar</span><span>Apr</span><span>May</span><span>Jun</span><span>Jul</span>
                        </div>
                    </div>
                </div>

                {/* Orders Statistic Chart (Dark Theme) */}
                <div className="bg-gray-900 p-6 rounded-xl shadow-sm border border-gray-800 text-white relative overflow-hidden group">
                    <div className="flex justify-between items-start mb-2">
                        <div>
                            <h2 className="text-lg font-bold">Orders Statistic</h2>
                            <p className="text-gray-400 text-sm">180 orders on this month</p>
                        </div>
                        <button className="text-gray-400 hover:text-white transition-colors">
                            <MoreHorizontal size={20} />
                        </button>
                    </div>

                    <div className="relative h-48 w-full mt-4">
                        <svg viewBox="0 0 100 50" className="w-full h-full overflow-visible" preserveAspectRatio="none">
                            <defs>
                                <linearGradient id="ordersGradient" x1="0" x2="0" y1="0" y2="1">
                                    <stop offset="0%" stopColor="#fbbf24" stopOpacity="0.3" />
                                    <stop offset="100%" stopColor="#fbbf24" stopOpacity="0" />
                                </linearGradient>
                            </defs>
                            <path
                                d="M0,35 Q15,40 25,20 T50,35 T75,25 T100,30 L100,50 L0,50 Z"
                                fill="url(#ordersGradient)"
                            />
                            <path
                                d="M0,35 Q15,40 25,20 T50,35 T75,25 T100,30"
                                fill="none"
                                stroke="#fbbf24"
                                strokeWidth="1"
                                strokeLinecap="round"
                            />
                            <line
                                x1="75" y1="25" x2="75" y2="50"
                                stroke="#fbbf24"
                                strokeWidth="0.5"
                                strokeDasharray="2 2"
                                opacity="0.6"
                            />
                            <circle cx="75" cy="25" r="3" fill="#1f2937" stroke="#fbbf24" strokeWidth="1.5" />
                            <foreignObject x="65" y="5" width="20" height="14">
                                <div className="bg-gray-800 border border-gray-700 text-amber-400 text-[8px] font-bold text-center rounded py-0.5 shadow-lg">
                                    180
                                </div>
                            </foreignObject>
                        </svg>
                        <div className="flex justify-between text-xs text-gray-500 mt-2 px-2 font-medium">
                            <span>Jan</span><span>Feb</span><span>Mar</span><span className="text-white">May</span><span>June</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Bottom Section: Recent Orders & Popular Items */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

                {/* Low Stock Alerts & Top Selling */}
                <div className="lg:col-span-2 space-y-6">
                    {/* Top Selling Items (Moved here) */}
                    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                        <div className="p-6 border-b border-gray-200 flex justify-between items-center">
                            <h2 className="text-lg font-bold text-gray-900">Top Selling Items</h2>
                            <button className="text-sm text-blue-600 hover:underline">View All</button>
                        </div>
                        <div className="p-4">
                            <div className="space-y-4">
                                {topSellingItems.map((item, idx) => (
                                    <div key={idx} className="flex items-center justify-between p-3 hover:bg-gray-50 rounded-xl transition-colors">
                                        <div className="flex items-center gap-4">
                                            <div className="w-10 h-10 rounded-full bg-orange-100 flex items-center justify-center text-orange-600 font-bold text-sm">
                                                #{idx + 1}
                                            </div>
                                            <div>
                                                <h4 className="font-semibold text-gray-900 text-sm">{item.name}</h4>
                                                <p className="text-xs text-gray-500">{item.sold} sold</p>
                                            </div>
                                        </div>
                                        <span className="font-bold text-gray-900 text-sm">{item.revenue}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>


                </div>

                {/* Right Column: Payment, Top Categories & Order Types */}
                <div className="space-y-6">

                    {/* Payment Mode */}
                    <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
                        <div className="flex justify-between items-center mb-6">
                            <h2 className="text-lg font-bold text-gray-900">Payment Mode</h2>
                            <MoreHorizontal size={18} className="text-gray-400" />
                        </div>
                        <div className="flex flex-col items-center">
                            {/* CSS Conic Gradient Pie */}
                            <div className="relative w-40 h-40 rounded-full" style={{ background: 'conic-gradient(#22c55e 0% 40%, #3b82f6 40% 75%, #a855f7 75% 100%)' }}>
                            </div>
                            <div className="grid grid-cols-2 gap-x-4 gap-y-2 mt-6 w-full px-2">
                                <div className="flex items-center gap-2 text-xs font-medium text-gray-600"><span className="w-2 h-2 rounded-full bg-green-500"></span> Cash 40%</div>
                                <div className="flex items-center gap-2 text-xs font-medium text-gray-600"><span className="w-2 h-2 rounded-full bg-blue-500"></span> Card 35%</div>
                                <div className="flex items-center gap-2 text-xs font-medium text-gray-600"><span className="w-2 h-2 rounded-full bg-purple-500"></span> Mobile 25%</div>
                            </div>
                        </div>
                    </div>

                    {/* Top Categories Donut */}
                    <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
                        <div className="flex justify-between items-center mb-6">
                            <h2 className="text-lg font-bold text-gray-900">Top Categories</h2>
                            <span className="text-xs text-gray-500">This Month <ChevronDown size={12} className="inline" /></span>
                        </div>
                        <div className="flex flex-col items-center">
                            {/* CSS Conic Gradient Donut */}
                            <div className="relative w-40 h-40 rounded-full" style={{ background: 'conic-gradient(#f97316 0% 30%, #fcd34d 30% 55%, #fb923c 55% 75%, #374151 75% 100%)' }}>
                                <div className="absolute inset-4 bg-white rounded-full"></div>
                            </div>

                            <div className="grid grid-cols-2 gap-x-8 gap-y-2 mt-6 w-full px-2">
                                <div className="flex items-center gap-2 text-xs font-medium text-gray-600"><span className="w-2 h-2 rounded-full bg-orange-500"></span> Seafood 30%</div>
                                <div className="flex items-center gap-2 text-xs font-medium text-gray-600"><span className="w-2 h-2 rounded-full bg-amber-200"></span> Beverages 25%</div>
                                <div className="flex items-center gap-2 text-xs font-medium text-gray-600"><span className="w-2 h-2 rounded-full bg-gray-700"></span> Dessert 25%</div>
                                <div className="flex items-center gap-2 text-xs font-medium text-gray-600"><span className="w-2 h-2 rounded-full bg-orange-400"></span> Pasta 20%</div>
                            </div>
                        </div>
                    </div>

                    {/* Order Types */}
                    <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                        <div className="flex justify-between items-center mb-6">
                            <h2 className="text-lg font-bold text-gray-900">Order Types</h2>
                            <span className="text-xs text-gray-500">This Month <ChevronDown size={12} className="inline" /></span>
                        </div>
                        <div className="space-y-5">
                            {/* Type 1 */}
                            <div>
                                <div className="flex items-center justify-between mb-2">
                                    <div className="flex items-center gap-3">
                                        <div className="p-2 bg-orange-50 rounded-lg text-orange-500">
                                            <UtensilsCrossed size={18} />
                                        </div>
                                        <span className="font-semibold text-gray-700 text-sm">Dine-In <span className="text-gray-400 font-normal ml-1">45%</span></span>
                                    </div>
                                    <span className="font-bold text-gray-900 text-sm">900</span>
                                </div>
                                <div className="h-1.5 w-full bg-gray-100 rounded-full overflow-hidden">
                                    <div className="h-full bg-gray-800 w-[45%] rounded-full"></div>
                                </div>
                            </div>

                            {/* Type 2 */}
                            <div>
                                <div className="flex items-center justify-between mb-2">
                                    <div className="flex items-center gap-3">
                                        <div className="p-2 bg-orange-50 rounded-lg text-orange-500">
                                            <ShoppingBag size={18} />
                                        </div>
                                        <span className="font-semibold text-gray-700 text-sm">Takeaway <span className="text-gray-400 font-normal ml-1">30%</span></span>
                                    </div>
                                    <span className="font-bold text-gray-900 text-sm">600</span>
                                </div>
                                <div className="h-1.5 w-full bg-gray-100 rounded-full overflow-hidden">
                                    <div className="h-full bg-gray-700 w-[30%] rounded-full"></div>
                                </div>
                            </div>

                            {/* Type 3 */}
                            <div>
                                <div className="flex items-center justify-between mb-2">
                                    <div className="flex items-center gap-3">
                                        <div className="p-2 bg-orange-50 rounded-lg text-orange-500">
                                            <Globe size={18} />
                                        </div>
                                        <span className="font-semibold text-gray-700 text-sm">Online <span className="text-gray-400 font-normal ml-1">25%</span></span>
                                    </div>
                                    <span className="font-bold text-gray-800 text-sm">500</span>
                                </div>
                                <div className="h-1.5 w-full bg-gray-100 rounded-full overflow-hidden">
                                    <div className="h-full bg-gray-600 w-[25%] rounded-full"></div>
                                </div>
                            </div>
                        </div>
                    </div>

                </div>
            </div>
        </div>
    );
};

export default POSDashboard;
