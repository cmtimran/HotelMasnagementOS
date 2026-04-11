import { TrendingUp, DollarSign, Users, Calendar, ArrowUp, ArrowDown, Percent } from 'lucide-react';

const RevenueDashboard = () => {
    // Mock data - replace with API
    const stats = {
        todayRevenue: 245000,
        monthRevenue: 6800000,
        yearRevenue: 45000000,
        todayGrowth: 12.5,
        monthGrowth: 8.3,
        yearGrowth: 15.2,
        occupancyRate: 87,
        adr: 5200, // Average Daily Rate
        revpar: 4524, // Revenue Per Available Room
    };

    const revenueByDepartment = [
        { name: 'Room Revenue', amount: 4200000, percentage: 62, color: 'from-blue-500 to-blue-600' },
        { name: 'F&B Revenue', amount: 1800000, percentage: 26, color: 'from-emerald-500 to-emerald-600' },
        { name: 'Other Services', amount: 800000, percentage: 12, color: 'from-purple-500 to-purple-600' },
    ];

    const monthlyTrend = [
        { month: 'Jan', revenue: 6800000, occupancy: 87 },
        { month: 'Dec', revenue: 6200000, occupancy: 82 },
        { month: 'Nov', revenue: 5800000, occupancy: 78 },
        { month: 'Oct', revenue: 6500000, occupancy: 85 },
        { month: 'Sep', revenue: 7200000, occupancy: 92 },
        { month: 'Aug', revenue: 7500000, occupancy: 95 },
    ];

    const topRoomTypes = [
        { type: 'Executive Suite', revenue: 2400000, bookings: 180, avgRate: 13333 },
        { type: 'Deluxe', revenue: 1500000, bookings: 300, avgRate: 5000 },
        { type: 'Suite', revenue: 1200000, bookings: 150, avgRate: 8000 },
        { type: 'Standard', revenue: 1100000, bookings: 367, avgRate: 3000 },
    ];

    const maxRevenue = Math.max(...monthlyTrend.map(m => m.revenue));

    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-50 via-green-50/20 to-gray-50 p-4 md:p-6 lg:p-8">
            {/* Header */}
            <div className="mb-8">
                <div className="flex items-center gap-3 mb-2">
                    <div className="w-12 h-12 bg-gradient-to-br from-green-600 to-green-700 rounded-xl flex items-center justify-center shadow-lg shadow-green-600/30">
                        <TrendingUp size={24} className="text-white" />
                    </div>
                    <div>
                        <h1 className="text-3xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent">Revenue Dashboard</h1>
                        <p className="text-sm text-gray-500">Financial performance and analytics</p>
                    </div>
                </div>
            </div>

            {/* Key Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                <div className="bg-gradient-to-br from-blue-500 to-blue-600 p-6 rounded-2xl shadow-xl shadow-blue-500/30 text-white">
                    <div className="flex items-center justify-between mb-4">
                        <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
                            <DollarSign size={24} />
                        </div>
                        <div className={`flex items-center gap-1 px-3 py-1 rounded-full text-sm font-bold ${stats.todayGrowth >= 0 ? 'bg-emerald-500' : 'bg-red-500'
                            }`}>
                            {stats.todayGrowth >= 0 ? <ArrowUp size={14} /> : <ArrowDown size={14} />}
                            {Math.abs(stats.todayGrowth)}%
                        </div>
                    </div>
                    <p className="text-blue-100 text-sm font-medium mb-2">Today's Revenue</p>
                    <p className="text-4xl font-bold">৳{(stats.todayRevenue / 1000).toFixed(0)}K</p>
                </div>

                <div className="bg-gradient-to-br from-emerald-500 to-emerald-600 p-6 rounded-2xl shadow-xl shadow-emerald-500/30 text-white">
                    <div className="flex items-center justify-between mb-4">
                        <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
                            <Calendar size={24} />
                        </div>
                        <div className={`flex items-center gap-1 px-3 py-1 rounded-full text-sm font-bold ${stats.monthGrowth >= 0 ? 'bg-emerald-700' : 'bg-red-500'
                            }`}>
                            {stats.monthGrowth >= 0 ? <ArrowUp size={14} /> : <ArrowDown size={14} />}
                            {Math.abs(stats.monthGrowth)}%
                        </div>
                    </div>
                    <p className="text-emerald-100 text-sm font-medium mb-2">This Month</p>
                    <p className="text-4xl font-bold">৳{(stats.monthRevenue / 1000000).toFixed(1)}M</p>
                </div>

                <div className="bg-gradient-to-br from-purple-500 to-purple-600 p-6 rounded-2xl shadow-xl shadow-purple-500/30 text-white">
                    <div className="flex items-center justify-between mb-4">
                        <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
                            <TrendingUp size={24} />
                        </div>
                        <div className={`flex items-center gap-1 px-3 py-1 rounded-full text-sm font-bold ${stats.yearGrowth >= 0 ? 'bg-purple-700' : 'bg-red-500'
                            }`}>
                            {stats.yearGrowth >= 0 ? <ArrowUp size={14} /> : <ArrowDown size={14} />}
                            {Math.abs(stats.yearGrowth)}%
                        </div>
                    </div>
                    <p className="text-purple-100 text-sm font-medium mb-2">This Year</p>
                    <p className="text-4xl font-bold">৳{(stats.yearRevenue / 1000000).toFixed(0)}M</p>
                </div>
            </div>

            {/* Performance Indicators */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-lg">
                    <div className="flex items-center gap-3 mb-4">
                        <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                            <Percent size={20} className="text-blue-600" />
                        </div>
                        <div>
                            <p className="text-sm text-gray-500 font-medium">Occupancy Rate</p>
                            <p className="text-2xl font-bold text-gray-900">{stats.occupancyRate}%</p>
                        </div>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-3">
                        <div className="bg-gradient-to-r from-blue-500 to-blue-600 h-3 rounded-full" style={{ width: `${stats.occupancyRate}%` }} />
                    </div>
                </div>

                <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-lg">
                    <div className="flex items-center gap-3 mb-4">
                        <div className="w-10 h-10 bg-emerald-100 rounded-lg flex items-center justify-center">
                            <DollarSign size={20} className="text-emerald-600" />
                        </div>
                        <div>
                            <p className="text-sm text-gray-500 font-medium">ADR (Avg Daily Rate)</p>
                            <p className="text-2xl font-bold text-gray-900">৳{stats.adr.toLocaleString()}</p>
                        </div>
                    </div>
                    <p className="text-xs text-gray-500">Average rate per occupied room</p>
                </div>

                <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-lg">
                    <div className="flex items-center gap-3 mb-4">
                        <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                            <Users size={20} className="text-purple-600" />
                        </div>
                        <div>
                            <p className="text-sm text-gray-500 font-medium">RevPAR</p>
                            <p className="text-2xl font-bold text-gray-900">৳{stats.revpar.toLocaleString()}</p>
                        </div>
                    </div>
                    <p className="text-xs text-gray-500">Revenue per available room</p>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
                {/* Revenue by Department */}
                <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-lg">
                    <h3 className="text-lg font-bold text-gray-900 mb-6">Revenue by Department</h3>
                    <div className="space-y-4">
                        {revenueByDepartment.map((dept, idx) => (
                            <div key={idx}>
                                <div className="flex items-center justify-between mb-2">
                                    <span className="text-sm font-semibold text-gray-700">{dept.name}</span>
                                    <span className="text-sm font-bold text-gray-900">৳{(dept.amount / 1000000).toFixed(1)}M ({dept.percentage}%)</span>
                                </div>
                                <div className="w-full bg-gray-200 rounded-full h-3">
                                    <div className={`bg-gradient-to-r ${dept.color} h-3 rounded-full transition-all`} style={{ width: `${dept.percentage}%` }} />
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Monthly Trend */}
                <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-lg">
                    <h3 className="text-lg font-bold text-gray-900 mb-6">6-Month Revenue Trend</h3>
                    <div className="flex items-end justify-between gap-2 h-48">
                        {monthlyTrend.reverse().map((month, idx) => (
                            <div key={idx} className="flex-1 flex flex-col items-center gap-2">
                                <div className="w-full bg-gradient-to-t from-blue-500 to-blue-600 rounded-t-lg transition-all hover:from-blue-600 hover:to-blue-700 cursor-pointer relative group"
                                    style={{ height: `${(month.revenue / maxRevenue) * 100}%` }}>
                                    <div className="absolute -top-8 left-1/2 transform -translate-x-1/2 bg-gray-900 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                                        ৳{(month.revenue / 1000000).toFixed(1)}M
                                    </div>
                                </div>
                                <span className="text-xs font-semibold text-gray-600">{month.month}</span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Top Performing Room Types */}
            <div className="bg-white rounded-2xl border border-gray-200 shadow-lg overflow-hidden">
                <div className="p-6 border-b border-gray-200 bg-gradient-to-r from-gray-50 to-gray-100">
                    <h3 className="text-lg font-bold text-gray-900">Top Performing Room Types</h3>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead className="bg-gray-50 border-b border-gray-200">
                            <tr>
                                <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase">Room Type</th>
                                <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase">Revenue</th>
                                <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase">Bookings</th>
                                <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase">Avg Rate</th>
                                <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase">Performance</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {topRoomTypes.map((room, idx) => (
                                <tr key={idx} className="hover:bg-blue-50/50 transition-colors">
                                    <td className="px-6 py-4">
                                        <span className="text-sm font-bold text-gray-900">{room.type}</span>
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className="text-sm font-bold text-emerald-600">৳{(room.revenue / 1000000).toFixed(2)}M</span>
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className="text-sm font-semibold text-gray-700">{room.bookings}</span>
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className="text-sm font-semibold text-gray-700">৳{room.avgRate.toLocaleString()}</span>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="w-full bg-gray-200 rounded-full h-2">
                                            <div className="bg-gradient-to-r from-emerald-500 to-emerald-600 h-2 rounded-full"
                                                style={{ width: `${(room.revenue / topRoomTypes[0].revenue) * 100}%` }} />
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default RevenueDashboard;
