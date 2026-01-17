import { useState } from 'react';
import { BarChart3, PieChart, TrendingUp, DollarSign, Percent, Calendar } from 'lucide-react';

interface RevenueBySource {
    source: string;
    revenue: number;
    bookings: number;
    commission: number;
    netRevenue: number;
    percentage: number;
}

interface RevenueBySegment {
    segment: string;
    revenue: number;
    bookings: number;
    avgRate: number;
    percentage: number;
    color: string;
}

const AdvancedReports = () => {
    const [selectedMonth, setSelectedMonth] = useState('2026-01');

    // Mock data - Revenue by Source
    const revenueBySource: RevenueBySource[] = [
        { source: 'Booking.com', revenue: 450000, bookings: 85, commission: 67500, netRevenue: 382500, percentage: 35 },
        { source: 'Direct Website', revenue: 320000, bookings: 62, commission: 0, netRevenue: 320000, percentage: 25 },
        { source: 'Walk-in', revenue: 280000, bookings: 54, commission: 0, netRevenue: 280000, percentage: 22 },
        { source: 'Agoda', revenue: 150000, bookings: 28, commission: 27000, netRevenue: 123000, percentage: 12 },
        { source: 'Amadeus GDS', revenue: 80000, bookings: 15, commission: 8000, netRevenue: 72000, percentage: 6 },
    ];

    // Mock data - Revenue by Market Segment
    const revenueBySegment: RevenueBySegment[] = [
        { segment: 'CORP', revenue: 520000, bookings: 95, avgRate: 5474, percentage: 40, color: '#3b82f6' },
        { segment: 'LEIS', revenue: 390000, bookings: 78, avgRate: 5000, percentage: 30, color: '#10b981' },
        { segment: 'GRP', revenue: 260000, bookings: 52, avgRate: 5000, percentage: 20, color: '#f59e0b' },
        { segment: 'NGO', revenue: 65000, bookings: 13, avgRate: 5000, percentage: 5, color: '#8b5cf6' },
        { segment: 'GOVT', revenue: 45000, bookings: 9, avgRate: 5000, percentage: 3.5, color: '#ef4444' },
        { segment: 'COMP', revenue: 20000, bookings: 4, avgRate: 0, percentage: 1.5, color: '#ec4899' },
    ];

    const totalRevenue = revenueBySource.reduce((sum, s) => sum + s.revenue, 0);
    const totalCommission = revenueBySource.reduce((sum, s) => sum + s.commission, 0);
    const totalNetRevenue = totalRevenue - totalCommission;
    const totalBookings = revenueBySource.reduce((sum, s) => sum + s.bookings, 0);

    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-50 via-indigo-50/20 to-gray-50 p-4 md:p-6 lg:p-8">
            {/* Header */}
            <div className="mb-8">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-12 h-12 bg-gradient-to-br from-indigo-600 to-indigo-700 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-600/30">
                            <BarChart3 size={24} className="text-white" />
                        </div>
                        <div>
                            <h1 className="text-3xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent">Advanced Revenue Reports</h1>
                            <p className="text-sm text-gray-500">Detailed analytics by source, segment, and commission</p>
                        </div>
                    </div>
                    <div>
                        <label className="text-sm font-semibold text-gray-700 mr-3">Month:</label>
                        <input
                            type="month"
                            value={selectedMonth}
                            onChange={(e) => setSelectedMonth(e.target.value)}
                            className="px-4 py-2 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        />
                    </div>
                </div>
            </div>

            {/* Summary Stats */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
                <div className="bg-gradient-to-br from-blue-500 to-blue-600 p-6 rounded-2xl shadow-lg shadow-blue-500/30">
                    <div className="flex items-center justify-between mb-2">
                        <p className="text-sm font-semibold text-blue-100">Total Revenue</p>
                        <DollarSign size={20} className="text-blue-100" />
                    </div>
                    <p className="text-3xl font-bold text-white">৳{(totalRevenue / 1000).toFixed(0)}K</p>
                    <p className="text-xs text-blue-100 mt-1">{totalBookings} bookings</p>
                </div>

                <div className="bg-gradient-to-br from-red-500 to-red-600 p-6 rounded-2xl shadow-lg shadow-red-500/30">
                    <div className="flex items-center justify-between mb-2">
                        <p className="text-sm font-semibold text-red-100">Total Commission</p>
                        <Percent size={20} className="text-red-100" />
                    </div>
                    <p className="text-3xl font-bold text-white">৳{(totalCommission / 1000).toFixed(0)}K</p>
                    <p className="text-xs text-red-100 mt-1">{((totalCommission / totalRevenue) * 100).toFixed(1)}% of revenue</p>
                </div>

                <div className="bg-gradient-to-br from-emerald-500 to-emerald-600 p-6 rounded-2xl shadow-lg shadow-emerald-500/30">
                    <div className="flex items-center justify-between mb-2">
                        <p className="text-sm font-semibold text-emerald-100">Net Revenue</p>
                        <TrendingUp size={20} className="text-emerald-100" />
                    </div>
                    <p className="text-3xl font-bold text-white">৳{(totalNetRevenue / 1000).toFixed(0)}K</p>
                    <p className="text-xs text-emerald-100 mt-1">After commissions</p>
                </div>

                <div className="bg-gradient-to-br from-purple-500 to-purple-600 p-6 rounded-2xl shadow-lg shadow-purple-500/30">
                    <div className="flex items-center justify-between mb-2">
                        <p className="text-sm font-semibold text-purple-100">Avg. Booking Value</p>
                        <Calendar size={20} className="text-purple-100" />
                    </div>
                    <p className="text-3xl font-bold text-white">৳{(totalRevenue / totalBookings / 1000).toFixed(1)}K</p>
                    <p className="text-xs text-purple-100 mt-1">Per booking</p>
                </div>
            </div>

            {/* Revenue by Source */}
            <div className="bg-white rounded-2xl border border-gray-200 shadow-xl p-8 mb-8">
                <div className="flex items-center gap-3 mb-6">
                    <BarChart3 size={24} className="text-indigo-600" />
                    <h2 className="text-2xl font-bold text-gray-900">Revenue Breakdown by Source</h2>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead className="bg-gradient-to-r from-gray-50 to-gray-100 border-b-2 border-gray-200">
                            <tr>
                                <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase">Source</th>
                                <th className="px-6 py-4 text-right text-xs font-bold text-gray-700 uppercase">Revenue</th>
                                <th className="px-6 py-4 text-right text-xs font-bold text-gray-700 uppercase">Bookings</th>
                                <th className="px-6 py-4 text-right text-xs font-bold text-gray-700 uppercase">Commission</th>
                                <th className="px-6 py-4 text-right text-xs font-bold text-gray-700 uppercase">Net Revenue</th>
                                <th className="px-6 py-4 text-right text-xs font-bold text-gray-700 uppercase">% Share</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {revenueBySource.map((item, index) => (
                                <tr key={index} className="hover:bg-indigo-50/50 transition-colors">
                                    <td className="px-6 py-4">
                                        <p className="text-sm font-bold text-gray-900">{item.source}</p>
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <p className="text-sm font-bold text-gray-900">৳{item.revenue.toLocaleString()}</p>
                                        <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
                                            <div
                                                className="bg-gradient-to-r from-blue-500 to-blue-600 h-2 rounded-full transition-all"
                                                style={{ width: `${item.percentage}%` }}
                                            />
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <span className="text-sm font-semibold text-gray-700">{item.bookings}</span>
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <p className="text-sm font-bold text-red-600">৳{item.commission.toLocaleString()}</p>
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <p className="text-sm font-bold text-emerald-600">৳{item.netRevenue.toLocaleString()}</p>
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <span className="px-3 py-1 bg-indigo-100 text-indigo-700 rounded-full text-xs font-bold">
                                            {item.percentage}%
                                        </span>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                        <tfoot className="bg-gradient-to-r from-gray-100 to-gray-200 border-t-2 border-gray-300">
                            <tr>
                                <td className="px-6 py-4">
                                    <p className="text-sm font-bold text-gray-900">TOTAL</p>
                                </td>
                                <td className="px-6 py-4 text-right">
                                    <p className="text-sm font-bold text-gray-900">৳{totalRevenue.toLocaleString()}</p>
                                </td>
                                <td className="px-6 py-4 text-right">
                                    <p className="text-sm font-bold text-gray-900">{totalBookings}</p>
                                </td>
                                <td className="px-6 py-4 text-right">
                                    <p className="text-sm font-bold text-red-600">৳{totalCommission.toLocaleString()}</p>
                                </td>
                                <td className="px-6 py-4 text-right">
                                    <p className="text-sm font-bold text-emerald-600">৳{totalNetRevenue.toLocaleString()}</p>
                                </td>
                                <td className="px-6 py-4 text-right">
                                    <p className="text-sm font-bold text-gray-900">100%</p>
                                </td>
                            </tr>
                        </tfoot>
                    </table>
                </div>
            </div>

            {/* Revenue by Market Segment */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Table View */}
                <div className="bg-white rounded-2xl border border-gray-200 shadow-xl p-8">
                    <div className="flex items-center gap-3 mb-6">
                        <PieChart size={24} className="text-purple-600" />
                        <h2 className="text-2xl font-bold text-gray-900">Revenue by Market Segment</h2>
                    </div>

                    <div className="space-y-4">
                        {revenueBySegment.map((item, index) => (
                            <div key={index} className="border border-gray-200 rounded-xl p-4 hover:shadow-md transition-all">
                                <div className="flex items-center justify-between mb-3">
                                    <div className="flex items-center gap-3">
                                        <div
                                            className="w-10 h-10 rounded-lg flex items-center justify-center"
                                            style={{ backgroundColor: item.color + '20' }}
                                        >
                                            <span className="text-lg font-bold" style={{ color: item.color }}>
                                                {item.segment}
                                            </span>
                                        </div>
                                        <div>
                                            <p className="text-sm font-bold text-gray-900">{item.segment}</p>
                                            <p className="text-xs text-gray-500">{item.bookings} bookings</p>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-lg font-bold text-gray-900">৳{(item.revenue / 1000).toFixed(0)}K</p>
                                        <p className="text-xs text-gray-500">{item.percentage}%</p>
                                    </div>
                                </div>
                                <div className="w-full bg-gray-200 rounded-full h-2">
                                    <div
                                        className="h-2 rounded-full transition-all"
                                        style={{ width: `${item.percentage}%`, backgroundColor: item.color }}
                                    />
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Visual Chart */}
                <div className="bg-white rounded-2xl border border-gray-200 shadow-xl p-8">
                    <h3 className="text-xl font-bold text-gray-900 mb-6">Segment Performance Metrics</h3>

                    <div className="space-y-6">
                        {revenueBySegment.map((item, index) => (
                            <div key={index}>
                                <div className="flex items-center justify-between mb-2">
                                    <span className="text-sm font-semibold text-gray-700">{item.segment}</span>
                                    <span className="text-sm font-bold text-gray-900">৳{item.avgRate.toLocaleString()} avg</span>
                                </div>
                                <div className="grid grid-cols-3 gap-3">
                                    <div className="bg-blue-50 p-3 rounded-lg">
                                        <p className="text-xs text-gray-600 mb-1">Revenue</p>
                                        <p className="text-sm font-bold text-blue-600">৳{(item.revenue / 1000).toFixed(0)}K</p>
                                    </div>
                                    <div className="bg-emerald-50 p-3 rounded-lg">
                                        <p className="text-xs text-gray-600 mb-1">Bookings</p>
                                        <p className="text-sm font-bold text-emerald-600">{item.bookings}</p>
                                    </div>
                                    <div className="bg-purple-50 p-3 rounded-lg">
                                        <p className="text-xs text-gray-600 mb-1">Share</p>
                                        <p className="text-sm font-bold text-purple-600">{item.percentage}%</p>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Summary */}
                    <div className="mt-8 pt-6 border-t border-gray-200">
                        <h4 className="text-sm font-bold text-gray-700 mb-4">Key Insights</h4>
                        <div className="space-y-2 text-sm text-gray-600">
                            <p>• Corporate (CORP) generates the highest revenue at 40%</p>
                            <p>• Leisure (LEIS) accounts for 30% of total bookings</p>
                            <p>• Group bookings (GRP) have strong potential for growth</p>
                            <p>• Complimentary stays are minimal at 1.5%</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AdvancedReports;
