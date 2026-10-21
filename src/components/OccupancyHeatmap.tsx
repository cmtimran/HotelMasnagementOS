import React, { useState } from 'react';
import {
    ChevronLeft, ChevronRight,
    TrendingUp, Calendar,
    Sparkles
} from 'lucide-react';

interface DayOccupancyData {
    dateStr: string; // YYYY-MM-DD
    dayNumber: number;
    occupancyPct: number;
    occupiedRooms: number;
    totalRooms: number;
    revenueBDT: number;
    adrBDT: number;
    arrivals: number;
    departures: number;
    pricingSurge: string;
}

export const OccupancyHeatmap: React.FC = () => {
    const [currentDate, setCurrentDate] = useState<Date>(new Date(2026, 5, 1)); // June 2026
    const [selectedDayData, setSelectedDayData] = useState<DayOccupancyData | null>(null);

    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();

    const monthNames = [
        'January', 'February', 'March', 'April', 'May', 'June',
        'July', 'August', 'September', 'October', 'November', 'December'
    ];

    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const startDayOfWeek = new Date(year, month, 1).getDay(); // 0 = Sunday

    // Generate simulated high-fidelity telemetry data for all days in month
    const monthDaysData: DayOccupancyData[] = Array.from({ length: daysInMonth }, (_, i) => {
        const day = i + 1;
        const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        
        // Dynamic weekend & corporate surge simulation
        const dayOfWeek = (startDayOfWeek + i) % 7;
        const isWeekend = dayOfWeek === 5 || dayOfWeek === 6; // Fri, Sat in BD

        let occupancyPct: number;
        if (day >= 24 && day <= 28) {
            occupancyPct = 92 + (day % 3) * 4; // Peak conference block
        } else if (isWeekend) {
            occupancyPct = 85 + (day % 4) * 3;
        } else {
            occupancyPct = 65 + (day % 5) * 5;
        }
        if (occupancyPct > 100) occupancyPct = 100;

        const totalRooms = 28;
        const occupiedRooms = Math.round((occupancyPct / 100) * totalRooms);
        const adrBDT = 7200 + (occupancyPct > 85 ? 1200 : 0);
        const revenueBDT = occupiedRooms * adrBDT;

        return {
            dateStr,
            dayNumber: day,
            occupancyPct,
            occupiedRooms,
            totalRooms,
            revenueBDT,
            adrBDT,
            arrivals: Math.round(occupiedRooms * 0.35) + 1,
            departures: Math.round(occupiedRooms * 0.3) + 1,
            pricingSurge: occupancyPct >= 90 ? '+20% Peak Demand Surge' : occupancyPct >= 75 ? '+10% Dynamic Yield' : 'Standard Base Rate'
        };
    });

    const prevMonth = () => {
        setCurrentDate(new Date(year, month - 1, 1));
        setSelectedDayData(null);
    };

    const nextMonth = () => {
        setCurrentDate(new Date(year, month + 1, 1));
        setSelectedDayData(null);
    };

    const avgOccupancy = Math.round(
        monthDaysData.reduce((acc, d) => acc + d.occupancyPct, 0) / monthDaysData.length
    );
    const totalMonthRevenue = monthDaysData.reduce((acc, d) => acc + d.revenueBDT, 0);
    const avgADR = Math.round(
        monthDaysData.reduce((acc, d) => acc + d.adrBDT, 0) / monthDaysData.length
    );
    const revPAR = Math.round((avgOccupancy / 100) * avgADR);

    const getOccupancyHeatColor = (pct: number) => {
        if (pct >= 90) return 'bg-rose-50 border-rose-300 text-rose-900';
        if (pct >= 75) return 'bg-amber-50 border-amber-300 text-amber-900';
        if (pct >= 50) return 'bg-emerald-50 border-emerald-300 text-emerald-900';
        return 'bg-blue-50 border-blue-200 text-blue-900';
    };

    const getBadgeStyle = (pct: number) => {
        if (pct >= 90) return 'bg-rose-600 text-white';
        if (pct >= 75) return 'bg-amber-500 text-white';
        if (pct >= 50) return 'bg-emerald-600 text-white';
        return 'bg-blue-500 text-white';
    };

    return (
        <div className="h-full min-h-[calc(100vh-48px)] bg-gray-50 flex flex-col font-sans text-xs select-none animate-in fade-in duration-150">
            {/* Master Header */}
            <header className="bg-white border-b border-gray-200 px-3.5 py-2 flex items-center justify-between shadow-2xs z-20">
                <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-orange-50 text-orange-700 border border-orange-200 flex items-center justify-center flex-shrink-0">
                        <TrendingUp size={18} />
                    </div>
                    <div>
                        <div className="flex items-center gap-2">
                            <h1 className="text-sm font-bold text-gray-900 tracking-tight">
                                Occupancy Heatmap & Revenue Forecast
                            </h1>
                            <span className="px-1.5 py-0.2 text-[9.5px] font-bold rounded bg-orange-50 text-orange-700 border border-orange-200">
                                30-Day Yield Matrix
                            </span>
                        </div>
                        <p className="text-[11px] text-gray-500">
                            Calendar heat distribution of room inventory occupancy, daily revenue pacing, and dynamic yield pricing.
                        </p>
                    </div>
                </div>

                {/* Month Navigator */}
                <div className="flex items-center gap-2">
                    <div className="flex items-center bg-gray-100 p-0.5 rounded-lg border border-gray-200">
                        <button
                            onClick={prevMonth}
                            className="p-1 hover:bg-white rounded text-gray-600 hover:text-gray-900 transition-colors cursor-pointer"
                        >
                            <ChevronLeft size={14} />
                        </button>
                        <span className="font-bold text-gray-900 px-3 text-xs">
                            {monthNames[month]} {year}
                        </span>
                        <button
                            onClick={nextMonth}
                            className="p-1 hover:bg-white rounded text-gray-600 hover:text-gray-900 transition-colors cursor-pointer"
                        >
                            <ChevronRight size={14} />
                        </button>
                    </div>
                </div>
            </header>

            {/* Top KPI Metrics */}
            <div className="bg-white border-b border-gray-200 px-3.5 py-2 grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                <div className="bg-gray-50/80 p-2 rounded-lg border border-gray-200/90 flex justify-between items-center">
                    <div>
                        <span className="text-[9.5px] font-bold text-gray-400 uppercase">Avg Occupancy</span>
                        <p className="text-base font-bold text-gray-900 mt-0.5">{avgOccupancy}%</p>
                    </div>
                    <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
                        +4.2% vs May
                    </span>
                </div>

                <div className="bg-gray-50/80 p-2 rounded-lg border border-gray-200/90 flex justify-between items-center">
                    <div>
                        <span className="text-[9.5px] font-bold text-gray-400 uppercase">Forecast Revenue</span>
                        <p className="text-base font-bold text-blue-700 font-mono mt-0.5">৳ {(totalMonthRevenue / 100000).toFixed(2)}L</p>
                    </div>
                    <span className="text-[10px] font-mono font-bold text-gray-500">
                        {daysInMonth} Days
                    </span>
                </div>

                <div className="bg-gray-50/80 p-2 rounded-lg border border-gray-200/90 flex justify-between items-center">
                    <div>
                        <span className="text-[9.5px] font-bold text-gray-400 uppercase">Avg Daily Rate (ADR)</span>
                        <p className="text-base font-bold text-gray-900 font-mono mt-0.5">৳ {avgADR.toLocaleString()}</p>
                    </div>
                    <span className="text-[9.5px] text-gray-400 uppercase">Per Room</span>
                </div>

                <div className="bg-gray-50/80 p-2 rounded-lg border border-gray-200/90 flex justify-between items-center">
                    <div>
                        <span className="text-[9.5px] font-bold text-gray-400 uppercase">RevPAR</span>
                        <p className="text-base font-bold text-emerald-700 font-mono mt-0.5">৳ {revPAR.toLocaleString()}</p>
                    </div>
                    <span className="text-[9.5px] font-bold text-emerald-600">Optimal Yield</span>
                </div>
            </div>

            {/* Heatmap Legend */}
            <div className="bg-gray-50 px-3.5 py-1.5 border-b border-gray-200 flex items-center justify-between text-[10.5px]">
                <div className="flex items-center gap-4">
                    <span className="font-semibold text-gray-500">Density Scale:</span>
                    <span className="flex items-center gap-1.5">
                        <span className="w-3 h-3 rounded bg-blue-100 border border-blue-300" />
                        <span>Low (0-49%)</span>
                    </span>
                    <span className="flex items-center gap-1.5">
                        <span className="w-3 h-3 rounded bg-emerald-100 border border-emerald-300" />
                        <span>Healthy (50-74%)</span>
                    </span>
                    <span className="flex items-center gap-1.5">
                        <span className="w-3 h-3 rounded bg-amber-100 border border-amber-300" />
                        <span>High Demand (75-89%)</span>
                    </span>
                    <span className="flex items-center gap-1.5">
                        <span className="w-3 h-3 rounded bg-rose-100 border border-rose-300" />
                        <span>Sold Out / Surge (90-100%)</span>
                    </span>
                </div>

                <span className="text-gray-400 text-[10px]">
                    Click any day cell to open daily yield telemetry & pricing recommendations
                </span>
            </div>

            {/* Main Heatmap Grid & Inspection Drawer */}
            <div className="flex-1 p-3 flex gap-3 overflow-hidden">
                {/* 7-column Calendar Matrix */}
                <div className="flex-1 bg-white rounded-xl border border-gray-200 shadow-2xs p-3 overflow-y-auto">
                    {/* Weekday Headers */}
                    <div className="grid grid-cols-7 gap-2 mb-2 text-center text-[10.5px] font-bold text-gray-500 uppercase">
                        <div>Sun</div>
                        <div>Mon</div>
                        <div>Tue</div>
                        <div>Wed</div>
                        <div>Thu</div>
                        <div className="text-blue-600">Fri</div>
                        <div className="text-blue-600">Sat</div>
                    </div>

                    {/* Cells Grid */}
                    <div className="grid grid-cols-7 gap-2">
                        {/* Empty padding cells for start of month */}
                        {Array.from({ length: startDayOfWeek }).map((_, idx) => (
                            <div key={`empty-${idx}`} className="h-20 bg-gray-50/40 rounded-lg border border-dashed border-gray-200" />
                        ))}

                        {/* Actual Day Cells */}
                        {monthDaysData.map(day => {
                            const isSelected = selectedDayData?.dayNumber === day.dayNumber;
                            const heatStyle = getOccupancyHeatColor(day.occupancyPct);
                            const badgeStyle = getBadgeStyle(day.occupancyPct);

                            return (
                                <button
                                    key={day.dayNumber}
                                    onClick={() => setSelectedDayData(day)}
                                    className={`h-20 p-2 rounded-lg border text-left flex flex-col justify-between transition-all cursor-pointer relative ${heatStyle} ${
                                        isSelected ? 'ring-2 ring-blue-600 shadow-md scale-[1.02]' : 'hover:shadow-2xs'
                                    }`}
                                >
                                    <div className="flex items-center justify-between">
                                        <span className="font-bold text-gray-900 text-xs">
                                            {day.dayNumber}
                                        </span>
                                        <span className={`px-1.5 py-0.2 rounded text-[9px] font-bold font-mono ${badgeStyle}`}>
                                            {day.occupancyPct}%
                                        </span>
                                    </div>

                                    <div className="space-y-0.5">
                                        <div className="flex justify-between items-center text-[10px] text-gray-600">
                                            <span>Rooms:</span>
                                            <span className="font-bold font-mono text-gray-800">{day.occupiedRooms}/{day.totalRooms}</span>
                                        </div>
                                        <div className="flex justify-between items-center text-[10px] text-gray-600">
                                            <span>Revenue:</span>
                                            <span className="font-bold font-mono text-gray-900">৳{(day.revenueBDT / 1000).toFixed(0)}k</span>
                                        </div>
                                    </div>
                                </button>
                            );
                        })}
                    </div>
                </div>

                {/* Day Inspector Drawer */}
                <div className="w-80 bg-white rounded-xl border border-gray-200 shadow-2xs p-3.5 flex flex-col justify-between flex-shrink-0">
                    {selectedDayData ? (
                        <div className="space-y-3.5">
                            <div className="flex items-center justify-between pb-2 border-b border-gray-200">
                                <div>
                                    <h3 className="text-sm font-bold text-gray-900">
                                        {selectedDayData.dateStr}
                                    </h3>
                                    <p className="text-[10.5px] text-gray-500">Day {selectedDayData.dayNumber} Performance</p>
                                </div>
                                <span className={`px-2 py-0.5 rounded text-[10.5px] font-bold font-mono ${getBadgeStyle(selectedDayData.occupancyPct)}`}>
                                    {selectedDayData.occupancyPct}% Occupancy
                                </span>
                            </div>

                            <div className="bg-gray-50 p-2.5 rounded-lg border border-gray-200 space-y-2">
                                <div className="flex justify-between items-center text-xs">
                                    <span className="text-gray-500">Rooms Occupied:</span>
                                    <span className="font-bold font-mono text-gray-900">{selectedDayData.occupiedRooms} / {selectedDayData.totalRooms}</span>
                                </div>
                                <div className="flex justify-between items-center text-xs">
                                    <span className="text-gray-500">Unsold Rooms:</span>
                                    <span className="font-bold font-mono text-rose-700">{selectedDayData.totalRooms - selectedDayData.occupiedRooms} Available</span>
                                </div>
                                <div className="flex justify-between items-center text-xs">
                                    <span className="text-gray-500">Arrivals Due:</span>
                                    <span className="font-bold font-mono text-blue-700">{selectedDayData.arrivals} Check-ins</span>
                                </div>
                                <div className="flex justify-between items-center text-xs">
                                    <span className="text-gray-500">Departures Due:</span>
                                    <span className="font-bold font-mono text-gray-700">{selectedDayData.departures} Check-outs</span>
                                </div>
                            </div>

                            <div className="bg-blue-50/70 p-2.5 rounded-lg border border-blue-200 space-y-1">
                                <span className="text-[9.5px] font-bold text-blue-800 uppercase">Daily Revenue Yield</span>
                                <p className="text-lg font-bold font-mono text-blue-900">
                                    ৳ {selectedDayData.revenueBDT.toLocaleString()}
                                </p>
                                <p className="text-[10px] text-blue-700">Average Daily Rate (ADR): ৳ {selectedDayData.adrBDT.toLocaleString()}</p>
                            </div>

                            <div className="bg-amber-50/70 p-2.5 rounded-lg border border-amber-200 flex items-start gap-2">
                                <Sparkles size={14} className="text-amber-600 mt-0.5 flex-shrink-0" />
                                <div>
                                    <span className="text-[10px] font-bold text-amber-900 uppercase">AI Revenue Optimizer</span>
                                    <p className="text-[10.5px] text-amber-800 mt-0.5 font-semibold">
                                        {selectedDayData.pricingSurge}
                                    </p>
                                    <p className="text-[10px] text-amber-700 mt-0.5">
                                        Recommended base rack adjustment to maximize yield and RevPAR for this date.
                                    </p>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="h-full flex flex-col items-center justify-center text-center p-4 text-gray-400 space-y-2">
                            <Calendar size={28} className="text-gray-300" />
                            <p className="font-semibold text-xs text-gray-600">Select Date</p>
                            <p className="text-[11px] text-gray-400">Click on any calendar day in the heatmap to view detailed room pacing, ADR, and revenue yield.</p>
                        </div>
                    )}

                    <div className="pt-3 border-t border-gray-200 text-center text-[10px] text-gray-400">
                        Occupancy Heatmap Engine • HotelOS 2026
                    </div>
                </div>
            </div>
        </div>
    );
};

export default OccupancyHeatmap;
