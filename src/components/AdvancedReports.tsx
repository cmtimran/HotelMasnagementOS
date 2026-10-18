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
        <div className="min-h-screen bg-slate-50/60 p-2.5 sm:p-3 space-y-2.5 font-sans text-xs text-slate-700">
            {/* Header */}
            <div className="bg-white rounded-lg border border-slate-200/80 px-3 py-2 flex flex-wrap items-center justify-between gap-2 shadow-2xs">
                <div className="flex items-center gap-2">
                    <div className="w-7 h-7 bg-indigo-600 rounded-md flex items-center justify-center text-white shadow-2xs">
                        <BarChart3 size={15} />
                    </div>
                    <div>
                        <div className="flex items-center gap-2">
                            <h1 className="text-sm font-bold text-slate-900 tracking-tight">Advanced Revenue Analytics</h1>
                            <span className="hidden sm:inline-flex px-1.5 py-0.5 rounded text-[10px] font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200/60">
                                BI & Yield Engine
                            </span>
                        </div>
                        <p className="text-[11px] text-slate-500">Channel distribution, OTA commissions & market segmentation</p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <label className="text-xs font-semibold text-slate-600">Period:</label>
                    <input
                        type="month"
                        value={selectedMonth}
                        onChange={(e) => setSelectedMonth(e.target.value)}
                        className="h-7 px-2.5 border border-slate-200 rounded-md text-xs focus:ring-1 focus:ring-indigo-500 outline-none bg-white font-medium shadow-2xs"
                    />
                </div>
            </div>

            {/* Summary Stats - 4 Compact Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                <div className="bg-gradient-to-br from-blue-600 to-blue-700 p-2.5 rounded-lg shadow-2xs text-white">
                    <div className="flex items-center justify-between mb-1">
                        <p className="text-[10px] font-bold text-blue-100 uppercase tracking-wider">Total Revenue</p>
                        <DollarSign size={13} className="text-blue-100 opacity-90" />
                    </div>
                    <p className="text-lg font-bold text-white tracking-tight">৳{(totalRevenue / 1000).toFixed(0)}K</p>
                    <p className="text-[10px] text-blue-100 mt-0.5">{totalBookings} total bookings</p>
                </div>

                <div className="bg-gradient-to-br from-rose-600 to-rose-700 p-2.5 rounded-lg shadow-2xs text-white">
                    <div className="flex items-center justify-between mb-1">
                        <p className="text-[10px] font-bold text-rose-100 uppercase tracking-wider">Total Commission</p>
                        <Percent size={13} className="text-rose-100 opacity-90" />
                    </div>
                    <p className="text-lg font-bold text-white tracking-tight">৳{(totalCommission / 1000).toFixed(0)}K</p>
                    <p className="text-[10px] text-rose-100 mt-0.5">{((totalCommission / totalRevenue) * 100).toFixed(1)}% OTA cost</p>
                </div>

                <div className="bg-gradient-to-br from-emerald-600 to-emerald-700 p-2.5 rounded-lg shadow-2xs text-white">
                    <div className="flex items-center justify-between mb-1">
                        <p className="text-[10px] font-bold text-emerald-100 uppercase tracking-wider">Net Revenue</p>
                        <TrendingUp size={13} className="text-emerald-100 opacity-90" />
                    </div>
                    <p className="text-lg font-bold text-white tracking-tight">৳{(totalNetRevenue / 1000).toFixed(0)}K</p>
                    <p className="text-[10px] text-emerald-100 mt-0.5">Retained earnings</p>
                </div>

                <div className="bg-gradient-to-br from-purple-600 to-purple-700 p-2.5 rounded-lg shadow-2xs text-white">
                    <div className="flex items-center justify-between mb-1">
                        <p className="text-[10px] font-bold text-purple-100 uppercase tracking-wider">Avg. Booking</p>
                        <Calendar size={13} className="text-purple-100 opacity-90" />
                    </div>
                    <p className="text-lg font-bold text-white tracking-tight">৳{(totalRevenue / totalBookings / 1000).toFixed(1)}K</p>
                    <p className="text-[10px] text-purple-100 mt-0.5">Average revenue per reservation</p>
                </div>
            </div>

            {/* Revenue by Source Table */}
            <div className="bg-white rounded-lg border border-slate-200/80 shadow-2xs overflow-hidden">
                <div className="px-3 py-2 border-b border-slate-100 flex items-center justify-between bg-slate-50/40">
                    <div className="flex items-center gap-1.5">
                        <BarChart3 size={13} className="text-indigo-600" />
                        <h2 className="text-xs font-bold text-slate-800 uppercase tracking-wider">Revenue Breakdown by Source & Channel</h2>
                    </div>
                    <span className="text-[10px] text-slate-400 font-mono">Sorted by Volume</span>
                </div>

                <div className="overflow-x-auto no-scrollbar">
                    <table className="w-full text-xs">
                        <thead className="bg-slate-50/90 border-b border-slate-200">
                            <tr>
                                <th className="px-3 py-1.5 text-left text-[10px] font-bold text-slate-600 uppercase tracking-wider">Source</th>
                                <th className="px-3 py-1.5 text-right text-[10px] font-bold text-slate-600 uppercase tracking-wider">Gross Rev</th>
                                <th className="px-3 py-1.5 text-right text-[10px] font-bold text-slate-600 uppercase tracking-wider">Bookings</th>
                                <th className="px-3 py-1.5 text-right text-[10px] font-bold text-slate-600 uppercase tracking-wider">Commission</th>
                                <th className="px-3 py-1.5 text-right text-[10px] font-bold text-slate-600 uppercase tracking-wider">Net Rev</th>
                                <th className="px-3 py-1.5 text-right text-[10px] font-bold text-slate-600 uppercase tracking-wider w-24">% Share</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {revenueBySource.map((item, index) => (
                                <tr key={index} className="hover:bg-indigo-50/30 transition-colors">
                                    <td className="px-3 py-1.5 font-bold text-slate-800">
                                        {item.source}
                                    </td>
                                    <td className="px-3 py-1.5 text-right font-semibold text-slate-800">
                                        ৳{item.revenue.toLocaleString()}
                                    </td>
                                    <td className="px-3 py-1.5 text-right text-slate-600 font-medium">
                                        {item.bookings}
                                    </td>
                                    <td className="px-3 py-1.5 text-right font-semibold text-rose-600">
                                        ৳{item.commission.toLocaleString()}
                                    </td>
                                    <td className="px-3 py-1.5 text-right font-bold text-emerald-700">
                                        ৳{item.netRevenue.toLocaleString()}
                                    </td>
                                    <td className="px-3 py-1.5 text-right">
                                        <div className="flex items-center justify-end gap-1.5">
                                            <span className="text-[11px] font-bold text-slate-700 w-8 text-right">{item.percentage}%</span>
                                            <div className="w-12 bg-slate-100 rounded-full h-1.5 overflow-hidden">
                                                <div
                                                    className="bg-indigo-600 h-1.5 rounded-full"
                                                    style={{ width: `${item.percentage}%` }}
                                                />
                                            </div>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                        <tfoot className="bg-slate-100/90 border-t-2 border-slate-300 font-bold text-xs">
                            <tr>
                                <td className="px-3 py-1.5 text-slate-900">TOTAL</td>
                                <td className="px-3 py-1.5 text-right text-slate-900">৳{totalRevenue.toLocaleString()}</td>
                                <td className="px-3 py-1.5 text-right text-slate-900">{totalBookings}</td>
                                <td className="px-3 py-1.5 text-right text-rose-700">৳{totalCommission.toLocaleString()}</td>
                                <td className="px-3 py-1.5 text-right text-emerald-800">৳{totalNetRevenue.toLocaleString()}</td>
                                <td className="px-3 py-1.5 text-right text-slate-900">100%</td>
                            </tr>
                        </tfoot>
                    </table>
                </div>
            </div>

            {/* Revenue by Market Segment */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-2.5">
                {/* Segment Table */}
                <div className="bg-white rounded-lg border border-slate-200/80 shadow-2xs p-3">
                    <div className="flex items-center gap-1.5 mb-2.5 pb-1.5 border-b border-slate-100">
                        <PieChart size={13} className="text-purple-600" />
                        <h2 className="text-xs font-bold text-slate-800 uppercase tracking-wider">Revenue by Market Segment</h2>
                    </div>

                    <div className="space-y-1.5">
                        {revenueBySegment.map((item, index) => (
                            <div key={index} className="border border-slate-100 rounded-md p-2 hover:bg-slate-50/70 transition-colors">
                                <div className="flex items-center justify-between mb-1">
                                    <div className="flex items-center gap-2">
                                        <div
                                            className="w-6 h-6 rounded flex items-center justify-center font-bold text-[10px]"
                                            style={{ backgroundColor: item.color + '20', color: item.color }}
                                        >
                                            {item.segment}
                                        </div>
                                        <div>
                                            <p className="text-xs font-bold text-slate-800 leading-tight">{item.segment}</p>
                                            <p className="text-[10px] text-slate-500 leading-tight">{item.bookings} reservations</p>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-xs font-bold text-slate-900">৳{(item.revenue / 1000).toFixed(0)}K</p>
                                        <p className="text-[10px] text-slate-500">{item.percentage}% share</p>
                                    </div>
                                </div>
                                <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                                    <div
                                        className="h-1.5 rounded-full transition-all"
                                        style={{ width: `${item.percentage}%`, backgroundColor: item.color }}
                                    />
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Metrics & Performance Breakdown */}
                <div className="bg-white rounded-lg border border-slate-200/80 shadow-2xs p-3 flex flex-col justify-between">
                    <div>
                        <div className="flex items-center justify-between mb-2 pb-1.5 border-b border-slate-100">
                            <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">Segment ADR & Yield Metrics</h3>
                            <span className="text-[10px] text-slate-400 font-mono">Performance Index</span>
                        </div>

                        <div className="space-y-2">
                            {revenueBySegment.slice(0, 4).map((item, index) => (
                                <div key={index} className="bg-slate-50/70 p-2 rounded-md border border-slate-100">
                                    <div className="flex items-center justify-between mb-1">
                                        <span className="text-xs font-bold text-slate-800">{item.segment}</span>
                                        <span className="text-xs font-bold text-blue-700">৳{item.avgRate.toLocaleString()} ADR</span>
                                    </div>
                                    <div className="grid grid-cols-3 gap-1.5 text-center">
                                        <div className="bg-white p-1 rounded border border-slate-200/60">
                                            <p className="text-[9px] text-slate-500 font-medium">Revenue</p>
                                            <p className="text-[11px] font-bold text-blue-600">৳{(item.revenue / 1000).toFixed(0)}K</p>
                                        </div>
                                        <div className="bg-white p-1 rounded border border-slate-200/60">
                                            <p className="text-[9px] text-slate-500 font-medium">Bookings</p>
                                            <p className="text-[11px] font-bold text-emerald-600">{item.bookings}</p>
                                        </div>
                                        <div className="bg-white p-1 rounded border border-slate-200/60">
                                            <p className="text-[9px] text-slate-500 font-medium">Share</p>
                                            <p className="text-[11px] font-bold text-purple-600">{item.percentage}%</p>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Key Strategic Insights */}
                    <div className="mt-2.5 pt-2 border-t border-slate-100">
                        <h4 className="text-[10px] font-bold text-slate-700 uppercase tracking-wider mb-1">Executive Yield Insights</h4>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-1 text-[11px] text-slate-600">
                            <p className="flex items-center gap-1">• <span className="font-semibold text-slate-700">Corporate (CORP):</span> 40% total revenue</p>
                            <p className="flex items-center gap-1">• <span className="font-semibold text-slate-700">Leisure (LEIS):</span> 30% guest volume</p>
                            <p className="flex items-center gap-1">• <span className="font-semibold text-slate-700">Group (GRP):</span> Prime ADR expansion</p>
                            <p className="flex items-center gap-1">• <span className="font-semibold text-slate-700">OTA Commission:</span> ৳67.5K on Booking.com</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AdvancedReports;
