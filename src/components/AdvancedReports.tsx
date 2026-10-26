import { useState, useEffect, useMemo } from 'react';
import { BarChart3, PieChart, TrendingUp, DollarSign, Percent, Calendar } from 'lucide-react';
import PageHeader from './common/PageHeader';
import { getAllStoredReservations, syncReservationsFromDB } from '../utils/roomInventoryEngine';

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

const SEGMENT_COLORS: Record<string, string> = {
    CORP: '#3b82f6',
    LEIS: '#10b981',
    GRP: '#f59e0b',
    OTA: '#8b5cf6',
    DIRECT: '#ef4444',
    VIP: '#ec4899'
};

const COMMISSION_RATES: Record<string, number> = {
    'Booking.com': 0.15,
    'Agoda': 0.18,
    'Expedia': 0.16,
    'OTA': 0.15,
    'Travel Agent': 0.10
};

const AdvancedReports = () => {
    const [selectedMonth, setSelectedMonth] = useState(() => new Date().toISOString().slice(0, 7));
    const [reservations, setReservations] = useState(() => getAllStoredReservations());

    useEffect(() => {
        syncReservationsFromDB().then(res => {
            if (res.length > 0) setReservations(res);
        }).catch(() => {});
    }, []);

    const { revenueBySource, revenueBySegment } = useMemo(() => {
        const active = reservations.filter(r => r.status !== 'CANCELLED' && r.status !== 'NO_SHOW');
        const monthFiltered = active.filter(r => r.checkIn.startsWith(selectedMonth) || r.checkOut.startsWith(selectedMonth));
        const dataset = monthFiltered.length > 0 ? monthFiltered : active;

        const grandTotal = Math.max(1, dataset.reduce((sum, r) => sum + (Number(r.totalRate) || 0), 0));

        // Group by Booking Source
        const sourceMap = new Map<string, { revenue: number; bookings: number }>();
        dataset.forEach(r => {
            const src = r.bookingSource || 'Direct Walk-In';
            const curr = sourceMap.get(src) || { revenue: 0, bookings: 0 };
            curr.revenue += Number(r.totalRate) || 0;
            curr.bookings += 1;
            sourceMap.set(src, curr);
        });

        const bySource: RevenueBySource[] = Array.from(sourceMap.entries())
            .map(([source, val]) => {
                const commRate = COMMISSION_RATES[source] ?? (source.toLowerCase().includes('ota') || source.toLowerCase().includes('booking') ? 0.15 : 0);
                const commission = Math.round(val.revenue * commRate);
                return {
                    source,
                    revenue: val.revenue,
                    bookings: val.bookings,
                    commission,
                    netRevenue: val.revenue - commission,
                    percentage: Math.round((val.revenue / grandTotal) * 100)
                };
            })
            .sort((a, b) => b.revenue - a.revenue);

        // Group by Market Segment derived from ratePlan / bookingSource
        const segMap = new Map<string, { revenue: number; bookings: number; rateSum: number }>();
        dataset.forEach(r => {
            const src = (r.bookingSource || '').toLowerCase();
            let seg = 'LEIS';
            if (src.includes('corp')) seg = 'CORP';
            else if (src.includes('group') || (Number(r.adults) || 1) > 2) seg = 'GRP';
            else if (src.includes('ota') || src.includes('booking') || src.includes('agoda')) seg = 'OTA';
            else if (src.includes('walk') || src.includes('direct')) seg = 'DIRECT';

            const curr = segMap.get(seg) || { revenue: 0, bookings: 0, rateSum: 0 };
            curr.revenue += Number(r.totalRate) || 0;
            curr.bookings += 1;
            curr.rateSum += Number(r.ratePerNight) || Number(r.totalRate) || 0;
            segMap.set(seg, curr);
        });

        const bySegment: RevenueBySegment[] = Array.from(segMap.entries())
            .map(([segment, val]) => ({
                segment,
                revenue: val.revenue,
                bookings: val.bookings,
                avgRate: val.bookings > 0 ? Math.round(val.rateSum / val.bookings) : 0,
                percentage: Math.round((val.revenue / grandTotal) * 100),
                color: SEGMENT_COLORS[segment] || '#3b82f6'
            }))
            .sort((a, b) => b.revenue - a.revenue);

        return { revenueBySource: bySource, revenueBySegment: bySegment };
    }, [reservations, selectedMonth]);

    const totalRevenue = revenueBySource.reduce((sum, s) => sum + s.revenue, 0);
    const totalCommission = revenueBySource.reduce((sum, s) => sum + s.commission, 0);
    const totalNetRevenue = totalRevenue - totalCommission;
    const totalBookings = revenueBySource.reduce((sum, s) => sum + s.bookings, 0);

    return (
        <div className="page-container">
            <PageHeader
                title="Advanced Revenue Analytics"
                subtitle="Live channel distribution, OTA commissions & market segmentation"
                icon={<BarChart3 size={20} />}
                badge={<span className="badge-status-active">BI & Yield Engine</span>}
                actions={
                    <div className="flex items-center gap-2">
                        <label className="text-xs font-semibold text-slate-600">Period:</label>
                        <input
                            type="month"
                            value={selectedMonth}
                            onChange={(e) => setSelectedMonth(e.target.value)}
                            className="input-standard !w-auto !py-1.5"
                        />
                    </div>
                }
            />

            {/* Summary Stats - 4 Standardized KPI Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="kpi-card">
                    <div>
                        <p className="text-[11px] text-slate-400 uppercase tracking-wider">Total Revenue</p>
                        <p className="text-xl text-slate-900 mt-1">৳{totalRevenue.toLocaleString()}</p>
                        <p className="text-[10px] text-slate-500 mt-0.5">{totalBookings} total bookings</p>
                    </div>
                    <div className="size-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                        <DollarSign size={16} />
                    </div>
                </div>

                <div className="kpi-card">
                    <div>
                        <p className="text-[11px] text-slate-400 uppercase tracking-wider">Total Commission</p>
                        <p className="text-xl text-rose-600 mt-1">৳{totalCommission.toLocaleString()}</p>
                        <p className="text-[10px] text-slate-500 mt-0.5">{totalRevenue > 0 ? ((totalCommission / totalRevenue) * 100).toFixed(1) : '0.0'}% OTA cost</p>
                    </div>
                    <div className="size-9 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center">
                        <Percent size={16} />
                    </div>
                </div>

                <div className="kpi-card">
                    <div>
                        <p className="text-[11px] text-slate-400 uppercase tracking-wider">Net Revenue</p>
                        <p className="text-xl text-emerald-600 mt-1">৳{totalNetRevenue.toLocaleString()}</p>
                        <p className="text-[10px] text-slate-500 mt-0.5">Retained earnings</p>
                    </div>
                    <div className="size-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                        <TrendingUp size={16} />
                    </div>
                </div>

                <div className="kpi-card">
                    <div>
                        <p className="text-[11px] text-slate-400 uppercase tracking-wider">Avg. Booking</p>
                        <p className="text-xl text-slate-900 mt-1">৳{Math.round(totalRevenue / Math.max(1, totalBookings)).toLocaleString()}</p>
                        <p className="text-[10px] text-slate-500 mt-0.5">Average revenue per stay</p>
                    </div>
                    <div className="size-9 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
                        <Calendar size={16} />
                    </div>
                </div>
            </div>

            {/* Revenue by Source Table */}
            <div className="table-container">
                <div className="px-4 py-3 border-b border-slate-200 flex items-center justify-between bg-slate-50/50">
                    <div className="flex items-center gap-1.5">
                        <BarChart3 size={14} className="text-primary" />
                        <h2 className="text-xs text-slate-800 uppercase tracking-wider">Revenue Breakdown by Source & Channel</h2>
                    </div>
                    <span className="text-[10px] text-slate-400 font-mono">Sorted by Volume</span>
                </div>

                <div className="overflow-x-auto no-scrollbar">
                    <table className="w-full text-xs">
                        <thead className="bg-slate-50/90 border-b border-slate-200">
                            <tr>
                                <th className="px-3 py-1.5 text-left text-[10px] text-slate-600 uppercase tracking-wider">Source</th>
                                <th className="px-3 py-1.5 text-right text-[10px] text-slate-600 uppercase tracking-wider">Gross Rev</th>
                                <th className="px-3 py-1.5 text-right text-[10px] text-slate-600 uppercase tracking-wider">Bookings</th>
                                <th className="px-3 py-1.5 text-right text-[10px] text-slate-600 uppercase tracking-wider">Commission</th>
                                <th className="px-3 py-1.5 text-right text-[10px] text-slate-600 uppercase tracking-wider">Net Rev</th>
                                <th className="px-3 py-1.5 text-right text-[10px] text-slate-600 uppercase tracking-wider w-24">% Share</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {revenueBySource.map((item, index) => (
                                <tr key={index} className="hover:bg-indigo-50/30 transition-colors">
                                    <td className="px-3 py-1.5 text-slate-800">
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
                                    <td className="px-3 py-1.5 text-right text-emerald-700">
                                        ৳{item.netRevenue.toLocaleString()}
                                    </td>
                                    <td className="px-3 py-1.5 text-right">
                                        <div className="flex items-center justify-end gap-1.5">
                                            <span className="text-[11px] text-slate-700 w-8 text-right">{item.percentage}%</span>
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
                        <tfoot className="bg-slate-100/90 border-t-2 border-slate-300 text-xs">
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
                        <h2 className="text-xs text-slate-800 uppercase tracking-wider">Revenue by Market Segment</h2>
                    </div>

                    <div className="space-y-1.5">
                        {revenueBySegment.map((item, index) => (
                            <div key={index} className="border border-slate-100 rounded-md p-2 hover:bg-slate-50/70 transition-colors">
                                <div className="flex items-center justify-between mb-1">
                                    <div className="flex items-center gap-2">
                                        <div
                                            className="w-6 h-6 rounded flex items-center justify-center text-[10px]"
                                            style={{ backgroundColor: item.color + '20', color: item.color }}
                                        >
                                            {item.segment}
                                        </div>
                                        <div>
                                            <p className="text-xs text-slate-800 leading-tight">{item.segment}</p>
                                            <p className="text-[10px] text-slate-500 leading-tight">{item.bookings} reservations</p>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-xs text-slate-900">৳{item.revenue.toLocaleString()}</p>
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
                            <h3 className="text-xs text-slate-800 uppercase tracking-wider">Segment ADR & Yield Metrics</h3>
                            <span className="text-[10px] text-slate-400 font-mono">Performance Index</span>
                        </div>

                        <div className="space-y-2">
                            {revenueBySegment.slice(0, 4).map((item, index) => (
                                <div key={index} className="bg-slate-50/70 p-2 rounded-md border border-slate-100">
                                    <div className="flex items-center justify-between mb-1">
                                        <span className="text-xs text-slate-800">{item.segment}</span>
                                        <span className="text-xs text-blue-700">৳{item.avgRate.toLocaleString()} ADR</span>
                                    </div>
                                    <div className="grid grid-cols-3 gap-1.5 text-center">
                                        <div className="bg-white p-1 rounded border border-slate-200/60">
                                            <p className="text-[9px] text-slate-500 font-medium">Revenue</p>
                                            <p className="text-[11px] text-blue-600">৳{item.revenue.toLocaleString()}</p>
                                        </div>
                                        <div className="bg-white p-1 rounded border border-slate-200/60">
                                            <p className="text-[9px] text-slate-500 font-medium">Bookings</p>
                                            <p className="text-[11px] text-emerald-600">{item.bookings}</p>
                                        </div>
                                        <div className="bg-white p-1 rounded border border-slate-200/60">
                                            <p className="text-[9px] text-slate-500 font-medium">Share</p>
                                            <p className="text-[11px] text-purple-600">{item.percentage}%</p>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Key Strategic Insights */}
                    <div className="mt-2.5 pt-2 border-t border-slate-100">
                        <h4 className="text-[10px] text-slate-700 uppercase tracking-wider mb-1">Executive Yield Insights</h4>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-1 text-[11px] text-slate-600">
                            <p className="flex items-center gap-1">• <span className="font-semibold text-slate-700">Active Folios:</span> {totalBookings} reservations</p>
                            <p className="flex items-center gap-1">• <span className="font-semibold text-slate-700">Net Retained:</span> ৳{totalNetRevenue.toLocaleString()}</p>
                            <p className="flex items-center gap-1">• <span className="font-semibold text-slate-700">Top Channel:</span> {revenueBySource[0]?.source || 'Direct'}</p>
                            <p className="flex items-center gap-1">• <span className="font-semibold text-slate-700">OTA Commission:</span> ৳{totalCommission.toLocaleString()}</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AdvancedReports;
