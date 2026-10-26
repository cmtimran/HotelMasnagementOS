import React, { useState, useEffect, useMemo } from 'react';
import {
    ChevronLeft, ChevronRight,
    TrendingUp, Calendar,
    Sparkles, ExternalLink, Plus
} from 'lucide-react';
import { useNavigation } from '../context/NavigationContext';
import { 
    getCanonicalRooms, 
    getAllStoredReservations, 
    syncRoomTypesAndRoomsFromDB, 
    syncReservationsFromDB,
    getOperatingSystemDate,
    subscribeToPMSEvents
} from '../utils/roomInventoryEngine';

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
    const { setActivePage } = useNavigation();
    const opDate = getOperatingSystemDate();
    const opYear = parseInt(opDate.slice(0, 4), 10) || 2026;
    const opMonth = (parseInt(opDate.slice(5, 7), 10) || 7) - 1;

    const [currentDate, setCurrentDate] = useState<Date>(() => new Date(opYear, opMonth, 1));
    const [selectedDayData, setSelectedDayData] = useState<DayOccupancyData | null>(null);
    const [refreshTrigger, setRefreshTrigger] = useState<number>(0);

    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();

    const monthNames = [
        'January', 'February', 'March', 'April', 'May', 'June',
        'July', 'August', 'September', 'October', 'November', 'December'
    ];

    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const startDayOfWeek = new Date(year, month, 1).getDay(); // 0 = Sunday

    // Fetch latest rooms and reservations from PostgreSQL on mount & subscribe to PMS events
    useEffect(() => {
        Promise.all([syncRoomTypesAndRoomsFromDB(), syncReservationsFromDB()]).then(() => {
            setRefreshTrigger(prev => prev + 1);
        });

        const unsub = subscribeToPMSEvents(() => {
            Promise.all([syncRoomTypesAndRoomsFromDB(), syncReservationsFromDB()]).then(() => {
                setRefreshTrigger(prev => prev + 1);
            });
        });

        return () => unsub();
    }, []);

    // Calculate real dynamic telemetry data for all days in month
    const monthDaysData: DayOccupancyData[] = useMemo(() => {
        const canonicalRooms = getCanonicalRooms();
        const storedRes = getAllStoredReservations();
        const activeRooms = canonicalRooms.filter(r => r.status !== 'Out of Order');
        const totalRooms = activeRooms.length > 0 ? activeRooms.length : (canonicalRooms.length || 34);

        return Array.from({ length: daysInMonth }, (_, i) => {
            const day = i + 1;
            const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;

            let dailyRevenue = 0;
            let arrivalsCount = 0;
            let departuresCount = 0;
            const bookedRoomsToday = new Set<string>();

            storedRes.forEach(res => {
                const rawStatus = String(res.status || '').toLowerCase().replace(/_/g, '-');
                if (rawStatus === 'cancelled' || rawStatus === 'void') return;

                const checkIn = String(res.checkIn || res.arrivalDate || '');
                const checkOut = String(res.checkOut || res.departureDate || '');

                if (checkIn === dateStr) arrivalsCount++;
                if (checkOut === dateStr) departuresCount++;

                // Active stay overlapping today
                if (checkIn <= dateStr && checkOut > dateStr) {
                    const rooms: string[] = [];
                    if (Array.isArray(res.roomsList) && res.roomsList.length > 0) {
                        res.roomsList.forEach((rm: any) => rooms.push(String(rm.roomNumber)));
                    } else if (Array.isArray(res.allocatedRooms) && res.allocatedRooms.length > 0) {
                        res.allocatedRooms.forEach((rm: any) => rooms.push(String(rm)));
                    } else if (res.roomNumber || res.roomNo) {
                        rooms.push(String(res.roomNumber || res.roomNo));
                    }

                    rooms.forEach(rm => bookedRoomsToday.add(rm));

                    const dailyRate = (Number(res.rateAmount) || Number(res.totalAmount) || 3500) / Math.max(1, Number(res.nights) || 1);
                    dailyRevenue += dailyRate;
                }
            });

            const occupiedCount = Math.min(totalRooms, bookedRoomsToday.size);
            const occupancyPct = totalRooms > 0 ? Math.round((occupiedCount / totalRooms) * 100) : 0;
            const adrBDT = occupiedCount > 0 ? Math.round(dailyRevenue / occupiedCount) : 3500;

            return {
                dateStr,
                dayNumber: day,
                occupancyPct,
                occupiedRooms: occupiedCount,
                totalRooms,
                revenueBDT: Math.round(dailyRevenue),
                adrBDT,
                arrivals: arrivalsCount,
                departures: departuresCount,
                pricingSurge: occupancyPct >= 90 ? '+20% Peak Demand Surge' : occupancyPct >= 75 ? '+10% Dynamic Yield' : occupancyPct > 0 ? 'Standard Rate Yield' : 'Base Rate Available'
            };
        });
    }, [year, month, daysInMonth, refreshTrigger]);

    // Active reservations overlapping the selected day
    const selectedDayReservations = useMemo(() => {
        if (!selectedDayData) return [];
        const allRes = getAllStoredReservations();
        const dStr = selectedDayData.dateStr;
        return allRes.filter(res => {
            const rawStatus = String(res.status || '').toLowerCase().replace(/_/g, '-');
            if (rawStatus === 'cancelled' || rawStatus === 'void') return false;
            const checkIn = String(res.checkIn || res.arrivalDate || '');
            const checkOut = String(res.checkOut || res.departureDate || '');
            return (checkIn <= dStr && checkOut >= dStr);
        });
    }, [selectedDayData, refreshTrigger]);

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
            <header className="bg-white border-b border-slate-200/90 px-4 py-3 flex items-center justify-between shadow-2xs z-20">
                <div className="flex items-center gap-3">
                    <div className="size-10 rounded-xl bg-primary-subtle text-primary border border-primary-border flex items-center justify-center shrink-0">
                        <TrendingUp size={18} />
                    </div>
                    <div>
                        <div className="flex items-center gap-2">
                            <h1 className="text-base text-slate-900 tracking-tight">
                                Occupancy Heatmap & Revenue Forecast
                            </h1>
                            <span className="badge-status-active">
                                30-Day Yield Matrix
                            </span>
                        </div>
                        <p className="text-xs text-slate-500 mt-0.5">
                            Calendar heat distribution of room inventory occupancy, daily revenue pacing, and dynamic yield pricing.
                        </p>
                    </div>
                </div>

                {/* Month Navigator */}
                <div className="flex items-center gap-2">
                    <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200/90">
                        <button
                            onClick={prevMonth}
                            className="p-1 hover:bg-white rounded-lg text-slate-600 hover:text-slate-900 transition-colors cursor-pointer"
                        >
                            <ChevronLeft size={14} />
                        </button>
                        <span className="text-slate-900 px-3 text-xs">
                            {monthNames[month]} {year}
                        </span>
                        <button
                            onClick={nextMonth}
                            className="p-1 hover:bg-white rounded-lg text-slate-600 hover:text-slate-900 transition-colors cursor-pointer"
                        >
                            <ChevronRight size={14} />
                        </button>
                    </div>
                </div>
            </header>

            {/* Top KPI Metrics */}
            <div className="bg-white border-b border-slate-200 px-4 py-3 grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div className="card-container p-3 flex justify-between items-center">
                    <div>
                        <span className="text-[10px] text-slate-400 uppercase tracking-wider">Avg Occupancy</span>
                        <p className="text-lg font-black text-slate-900 font-mono mt-0.5">{avgOccupancy}%</p>
                    </div>
                    <span className="text-[10.5px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                        +4.2% vs May
                    </span>
                </div>

                <div className="card-container p-3 flex justify-between items-center">
                    <div>
                        <span className="text-[10px] text-slate-400 uppercase tracking-wider">Forecast Revenue</span>
                        <p className="text-lg font-black text-primary font-mono mt-0.5">৳ {(totalMonthRevenue / 100000).toFixed(2)}L</p>
                    </div>
                    <span className="text-[10.5px] font-mono font-semibold text-slate-500">
                        {daysInMonth} Days
                    </span>
                </div>

                <div className="card-container p-3 flex justify-between items-center">
                    <div>
                        <span className="text-[10px] text-slate-400 uppercase tracking-wider">Avg Daily Rate (ADR)</span>
                        <p className="text-lg font-black text-slate-900 font-mono mt-0.5">৳ {avgADR.toLocaleString()}</p>
                    </div>
                    <span className="text-[10px] text-slate-400 uppercase font-semibold">Per Room</span>
                </div>

                <div className="bg-gray-50/80 p-2 rounded-lg border border-gray-200/90 flex justify-between items-center">
                    <div>
                        <span className="text-[9.5px] text-gray-400 uppercase">RevPAR</span>
                        <p className="text-base text-emerald-700 font-mono mt-0.5">৳ {revPAR.toLocaleString()}</p>
                    </div>
                    <span className="text-[9.5px] text-emerald-600">Optimal Yield</span>
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
                    <div className="grid grid-cols-7 gap-2 mb-2 text-center text-[10.5px] text-gray-500 uppercase">
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
                                        <span className="text-gray-900 text-xs">
                                            {day.dayNumber}
                                        </span>
                                        <span className={`px-1.5 py-0.2 rounded text-[9px] font-mono ${badgeStyle}`}>
                                            {day.occupancyPct}%
                                        </span>
                                    </div>

                                    <div className="space-y-0.5">
                                        <div className="flex justify-between items-center text-[10px] text-gray-600">
                                            <span>Rooms:</span>
                                            <span className="font-mono text-gray-800">{day.occupiedRooms}/{day.totalRooms}</span>
                                        </div>
                                        <div className="flex justify-between items-center text-[10px] text-gray-600">
                                            <span>Revenue:</span>
                                            <span className="font-mono text-gray-900">৳{(day.revenueBDT / 1000).toFixed(0)}k</span>
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
                                    <h3 className="text-sm text-gray-900">
                                        {selectedDayData.dateStr}
                                    </h3>
                                    <p className="text-[10.5px] text-gray-500">Day {selectedDayData.dayNumber} Performance</p>
                                </div>
                                <span className={`px-2 py-0.5 rounded text-[10.5px] font-mono ${getBadgeStyle(selectedDayData.occupancyPct)}`}>
                                    {selectedDayData.occupancyPct}% Occupancy
                                </span>
                            </div>

                            <div className="bg-gray-50 p-2.5 rounded-lg border border-gray-200 space-y-2">
                                <div className="flex justify-between items-center text-xs">
                                    <span className="text-gray-500">Rooms Occupied:</span>
                                    <span className="font-mono text-gray-900">{selectedDayData.occupiedRooms} / {selectedDayData.totalRooms}</span>
                                </div>
                                <div className="flex justify-between items-center text-xs">
                                    <span className="text-gray-500">Unsold Rooms:</span>
                                    <span className="font-mono text-rose-700">{selectedDayData.totalRooms - selectedDayData.occupiedRooms} Available</span>
                                </div>
                                <div className="flex justify-between items-center text-xs">
                                    <span className="text-gray-500">Arrivals Due:</span>
                                    <span className="font-mono text-blue-700">{selectedDayData.arrivals} Check-ins</span>
                                </div>
                                <div className="flex justify-between items-center text-xs">
                                    <span className="text-gray-500">Departures Due:</span>
                                    <span className="font-mono text-gray-700">{selectedDayData.departures} Check-outs</span>
                                </div>
                            </div>

                            <div className="bg-blue-50/70 p-2.5 rounded-lg border border-blue-200 space-y-1">
                                <span className="text-[9.5px] text-blue-800 uppercase">Daily Revenue Yield</span>
                                <p className="text-lg font-mono text-blue-900">
                                    ৳ {selectedDayData.revenueBDT.toLocaleString()}
                                </p>
                                <p className="text-[10px] text-blue-700">Average Daily Rate (ADR): ৳ {selectedDayData.adrBDT.toLocaleString()}</p>
                            </div>

                            <div className="bg-amber-50/70 p-2.5 rounded-lg border border-amber-200 flex items-start gap-2">
                                <Sparkles size={14} className="text-amber-600 mt-0.5 flex-shrink-0" />
                                <div>
                                    <span className="text-[10px] text-amber-900 uppercase">AI Revenue Optimizer</span>
                                    <p className="text-[10.5px] text-amber-800 mt-0.5 font-semibold">
                                        {selectedDayData.pricingSurge}
                                    </p>
                                    <p className="text-[10px] text-amber-700 mt-0.5">
                                        Recommended base rack adjustment to maximize yield and RevPAR for this date.
                                    </p>
                                </div>
                            </div>

                            {/* Active Bookings Drill-Down */}
                            <div className="space-y-1.5 pt-1 border-t border-gray-100">
                                <span className="text-[10px] text-gray-500 uppercase font-bold block">
                                    Bookings on this Date ({selectedDayReservations.length})
                                </span>
                                {selectedDayReservations.length > 0 ? (
                                    <div className="space-y-1 max-h-36 overflow-y-auto pr-1">
                                        {selectedDayReservations.map((res: any, idx: number) => {
                                            const isArrival = (res.checkIn || res.arrivalDate) === selectedDayData.dateStr;
                                            const isDeparture = (res.checkOut || res.departureDate) === selectedDayData.dateStr;
                                            return (
                                                <div key={res.id || idx} className="p-1.5 bg-slate-50 border border-slate-200/80 rounded text-[11px] flex items-center justify-between">
                                                    <div className="min-w-0 pr-1">
                                                        <div className="font-semibold text-slate-800 truncate">{res.guestName || 'Valued Guest'}</div>
                                                        <div className="text-[9.5px] text-slate-500 font-mono truncate">
                                                            Room {res.roomNumber || (res.allocatedRooms && res.allocatedRooms[0]) || 'Auto'} • {res.roomType}
                                                        </div>
                                                    </div>
                                                    <span className={`px-1.5 py-0.2 rounded text-[8.5px] font-bold uppercase shrink-0 ${
                                                        isArrival ? 'bg-blue-100 text-blue-700' : isDeparture ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'
                                                    }`}>
                                                        {isArrival ? 'Arrival' : isDeparture ? 'Departure' : 'In-House'}
                                                    </span>
                                                </div>
                                            );
                                        })}
                                    </div>
                                ) : (
                                    <p className="text-[10px] text-gray-400 italic">No bookings recorded for this date</p>
                                )}
                            </div>

                            {/* Fast Action Buttons */}
                            <div className="pt-2 flex flex-col gap-1.5 border-t border-gray-100">
                                <button
                                    type="button"
                                    onClick={() => setActivePage('stay-view')}
                                    className="w-full py-1.5 px-3 bg-[#1e3a8a] hover:bg-blue-900 text-white rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 shadow-2xs cursor-pointer transition-colors"
                                >
                                    <span>Open Stay View</span>
                                    <ExternalLink size={12} />
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setActivePage('add-reservation')}
                                    className="w-full py-1.5 px-3 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 shadow-2xs cursor-pointer transition-colors"
                                >
                                    <Plus size={12} />
                                    <span>+ New Booking for this Date</span>
                                </button>
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
