import { useState } from 'react';
import { Calendar, TrendingUp, Save, RotateCcw, ChevronLeft, ChevronRight, X, Check } from 'lucide-react';

interface DayRate {
    date: string;
    rate: number;
    occupancy: number;
    isWeekend: boolean;
    isHoliday: boolean;
    eventName?: string;
}

const STORAGE_KEY = 'hotel_rate_calendar_v2';

const ROOM_TYPE_DEFAULTS: Record<string, { weekday: number; weekend: number }> = {
    'Deluxe Double': { weekday: 3000, weekend: 3800 },
    'Superior King': { weekday: 4500, weekend: 5500 },
    'Executive Suite': { weekday: 6500, weekend: 8000 },
    'Standard Single': { weekday: 2200, weekend: 2700 },
    'Presidential Suite': { weekday: 18000, weekend: 22000 },
};

const formatDate = (date: Date): string => {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
};

const parseDateString = (dateStr: string): Date => {
    const [y, m, d] = dateStr.split('-').map(Number);
    return new Date(y, m - 1, d);
};

export default function RateCalendar() {
    // Hotel operational date is July 2026
    const [currentMonth, setCurrentMonth] = useState(() => new Date(2026, 6, 1));
    const [selectedRoomType, setSelectedRoomType] = useState('Deluxe Double');
    const [editingDate, setEditingDate] = useState<string | null>(null);
    const [tempRate, setTempRate] = useState('');

    // Bulk Update Modal State
    const [isBulkOpen, setIsBulkOpen] = useState(false);
    const [bulkStartDate, setBulkStartDate] = useState('2026-07-01');
    const [bulkEndDate, setBulkEndDate] = useState('2026-07-31');
    const [bulkRate, setBulkRate] = useState('3500');
    const [bulkDayFilter, setBulkDayFilter] = useState<'all' | 'weekends' | 'weekdays'>('all');

    // Room-type scoped rates state
    const [ratesByRoomType, setRatesByRoomType] = useState<Record<string, Record<string, DayRate>>>(() => {
        try {
            const saved = localStorage.getItem(STORAGE_KEY);
            if (saved) return JSON.parse(saved);
        } catch {
            // fallback
        }
        return {
            'Deluxe Double': {
                '2026-07-01': { date: '2026-07-01', rate: 3000, occupancy: 85, isWeekend: false, isHoliday: false },
                '2026-07-03': { date: '2026-07-03', rate: 3800, occupancy: 95, isWeekend: true, isHoliday: false },
                '2026-07-04': { date: '2026-07-04', rate: 3800, occupancy: 92, isWeekend: true, isHoliday: false },
                '2026-07-15': { date: '2026-07-15', rate: 4200, occupancy: 100, isWeekend: false, isHoliday: true, eventName: 'Summer Fest' },
            }
        };
    });

    const currentRates = ratesByRoomType[selectedRoomType] || {};

    const persistRates = (updated: Record<string, Record<string, DayRate>>) => {
        setRatesByRoomType(updated);
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
        } catch {
            // fallback
        }
    };

    const getDaysInMonth = (date: Date) => {
        const year = date.getFullYear();
        const month = date.getMonth();
        const firstDay = new Date(year, month, 1);
        const lastDay = new Date(year, month + 1, 0);
        const daysInMonth = lastDay.getDate();
        const startingDayOfWeek = firstDay.getDay();

        const days: (Date | null)[] = [];

        for (let i = 0; i < startingDayOfWeek; i++) {
            days.push(null);
        }

        for (let day = 1; day <= daysInMonth; day++) {
            days.push(new Date(year, month, day));
        }

        return days;
    };

    const getDefaultRate = (date: Date) => {
        const dayOfWeek = date.getDay();
        const isWeekend = dayOfWeek === 5 || dayOfWeek === 6; // Friday/Saturday weekend in BD
        const defaults = ROOM_TYPE_DEFAULTS[selectedRoomType] || { weekday: 3000, weekend: 3800 };
        return isWeekend ? defaults.weekend : defaults.weekday;
    };

    const getRateForDate = (date: Date): DayRate => {
        const dateStr = formatDate(date);
        if (currentRates[dateStr]) {
            return currentRates[dateStr];
        }
        const dayOfWeek = date.getDay();
        return {
            date: dateStr,
            rate: getDefaultRate(date),
            occupancy: 0,
            isWeekend: dayOfWeek === 5 || dayOfWeek === 6,
            isHoliday: false,
        };
    };

    const getRateColor = (rate: number) => {
        if (rate >= 10000) return 'bg-purple-600 text-white';
        if (rate >= 5000) return 'bg-blue-600 text-white';
        if (rate >= 3000) return 'bg-emerald-600 text-white';
        return 'bg-gray-600 text-white';
    };

    const getOccupancyColor = (occupancy: number) => {
        if (occupancy >= 90) return 'bg-rose-500';
        if (occupancy >= 75) return 'bg-amber-500';
        if (occupancy >= 50) return 'bg-emerald-500';
        return 'bg-gray-300';
    };

    const handleCellClick = (date: Date) => {
        const dateStr = formatDate(date);
        const currentRate = getRateForDate(date);
        setEditingDate(dateStr);
        setTempRate(currentRate.rate.toString());
    };

    const handleSaveRate = () => {
        if (editingDate && tempRate) {
            const newRate = parseInt(tempRate, 10);
            if (isNaN(newRate)) return;
            const parsedDate = parseDateString(editingDate);
            const dayOfWeek = parsedDate.getDay();

            const updatedRoomRates = {
                ...currentRates,
                [editingDate]: {
                    ...currentRates[editingDate],
                    date: editingDate,
                    rate: newRate,
                    isWeekend: dayOfWeek === 5 || dayOfWeek === 6,
                    isHoliday: currentRates[editingDate]?.isHoliday || false,
                    occupancy: currentRates[editingDate]?.occupancy || 0,
                },
            };

            persistRates({
                ...ratesByRoomType,
                [selectedRoomType]: updatedRoomRates,
            });

            setEditingDate(null);
            setTempRate('');
        }
    };

    const handleBulkApply = () => {
        const rateVal = parseInt(bulkRate, 10);
        if (isNaN(rateVal) || rateVal <= 0) {
            alert('Please enter a valid rate in BDT.');
            return;
        }

        const start = parseDateString(bulkStartDate);
        const end = parseDateString(bulkEndDate);

        if (start > end) {
            alert('Start date must be before or equal to End date.');
            return;
        }

        const newRates = { ...currentRates };
        const cursor = new Date(start);

        while (cursor <= end) {
            const dayOfWeek = cursor.getDay();
            const isWeekend = dayOfWeek === 5 || dayOfWeek === 6;

            let shouldApply = true;
            if (bulkDayFilter === 'weekends' && !isWeekend) shouldApply = false;
            if (bulkDayFilter === 'weekdays' && isWeekend) shouldApply = false;

            if (shouldApply) {
                const dateKey = formatDate(cursor);
                newRates[dateKey] = {
                    date: dateKey,
                    rate: rateVal,
                    occupancy: newRates[dateKey]?.occupancy || 0,
                    isWeekend,
                    isHoliday: newRates[dateKey]?.isHoliday || false,
                };
            }

            cursor.setDate(cursor.getDate() + 1);
        }

        persistRates({
            ...ratesByRoomType,
            [selectedRoomType]: newRates,
        });

        setIsBulkOpen(false);
    };

    const previousMonth = () => {
        setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1));
    };

    const nextMonth = () => {
        setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1));
    };

    const resetToOperationalMonth = () => {
        setCurrentMonth(new Date(2026, 6, 1));
    };

    const days = getDaysInMonth(currentMonth);
    const monthName = currentMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

    return (
        <div className="p-3 sm:p-5 max-w-7xl mx-auto space-y-3 font-sans select-none">
            {/* Header & Controls Toolbar */}
            <div className="bg-white p-3 rounded-xl border border-gray-200/90 shadow-2xs flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 bg-purple-600 rounded-lg flex items-center justify-center text-white font-bold shadow-2xs">
                        <span>৳</span>
                    </div>
                    <div>
                        <h1 className="text-base sm:text-lg font-bold text-gray-900 tracking-tight leading-none">Rate & ARI Distribution Calendar</h1>
                        <p className="text-[11px] text-gray-500 font-medium leading-none mt-1">Multi-channel dynamic rate management, surge pricing & weekend adjustments</p>
                    </div>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                    {/* Room Type Selector */}
                    <div className="flex items-center gap-1.5 bg-gray-50 px-2 py-1 rounded-lg border border-gray-200">
                        <span className="text-[11px] font-bold text-gray-500">Category:</span>
                        <select
                            value={selectedRoomType}
                            onChange={(e) => setSelectedRoomType(e.target.value)}
                            className="bg-transparent text-xs font-bold text-gray-800 outline-none cursor-pointer"
                        >
                            {Object.keys(ROOM_TYPE_DEFAULTS).map(rt => (
                                <option key={rt} value={rt}>{rt}</option>
                            ))}
                        </select>
                    </div>

                    {/* Month Navigator */}
                    <div className="flex items-center gap-1 bg-gray-50 border border-gray-200 rounded-lg p-0.5">
                        <button
                            onClick={previousMonth}
                            className="p-1 hover:bg-white rounded-md text-gray-600 hover:shadow-2xs transition-all"
                            title="Previous Month"
                        >
                            <ChevronLeft size={14} />
                        </button>
                        <span className="text-xs font-bold text-gray-800 px-2 min-w-[120px] text-center">{monthName}</span>
                        <button
                            onClick={nextMonth}
                            className="p-1 hover:bg-white rounded-md text-gray-600 hover:shadow-2xs transition-all"
                            title="Next Month"
                        >
                            <ChevronRight size={14} />
                        </button>
                    </div>

                    <button
                        onClick={resetToOperationalMonth}
                        className="h-7 px-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-xs font-bold transition-colors"
                        title="Jump to Current Operations Month (July 2026)"
                    >
                        July 2026
                    </button>

                    <button
                        onClick={() => setIsBulkOpen(true)}
                        className="h-7 px-3 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-xs font-bold shadow-2xs flex items-center gap-1.5 transition-colors"
                    >
                        <Calendar size={13} />
                        <span>Bulk Update</span>
                    </button>
                </div>
            </div>

            {/* Compact Legend Bar */}
            <div className="bg-white px-3.5 py-2 rounded-xl border border-gray-200/80 shadow-2xs flex flex-wrap items-center justify-between text-[11px] text-gray-500 gap-2">
                <div className="flex flex-wrap items-center gap-4">
                    <span className="font-bold text-gray-700 text-[10px] uppercase">Tariff Legend:</span>
                    <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded bg-purple-600"></span> Suite / VIP (৳10k+)</span>
                    <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded bg-blue-600"></span> Premium (৳5k-10k)</span>
                    <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded bg-emerald-600"></span> Standard (৳3k-5k)</span>
                    <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded bg-gray-600"></span> Base (&lt;৳3k)</span>
                </div>
                <div className="flex items-center gap-2 text-[10px] text-purple-700 font-bold bg-purple-50 px-2 py-0.5 rounded-md border border-purple-100">
                    <TrendingUp size={12} />
                    <span>Dynamic ARI Engine Synchronized with Channels</span>
                </div>
            </div>

            {/* Calendar Grid */}
            <div className="bg-white rounded-xl border border-gray-200/90 shadow-2xs overflow-hidden">
                <div className="grid grid-cols-7 bg-gray-50 border-b border-gray-200 text-center text-[11px] font-bold text-gray-600 uppercase tracking-wider py-2">
                    {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri (W)', 'Sat (W)'].map(day => (
                        <div key={day}>{day}</div>
                    ))}
                </div>

                <div className="grid grid-cols-7 divide-x divide-y divide-gray-100">
                    {days.map((day, index) => {
                        if (!day) {
                            return <div key={`empty-${index}`} className="h-20 bg-gray-50/40" />;
                        }

                        const dayRate = getRateForDate(day);
                        const dateStr = formatDate(day);
                        const isEditing = editingDate === dateStr;
                        const isToday = '2026-07-01' === dateStr;

                        return (
                            <div
                                key={dateStr}
                                onClick={() => !isEditing && handleCellClick(day)}
                                className={`h-20 p-2 cursor-pointer transition-all hover:bg-blue-50/30 ${
                                    isToday ? 'bg-purple-50/30 ring-1 ring-purple-500 inset-0' : 'bg-white'
                                }`}
                            >
                                <div className="h-full flex flex-col justify-between">
                                    <div className="flex items-center justify-between leading-none">
                                        <span className={`text-xs font-bold ${isToday ? 'text-purple-700' : 'text-gray-800'}`}>
                                            {day.getDate()}
                                        </span>
                                        {dayRate.occupancy > 0 && (
                                            <span className="flex items-center gap-1 text-[9px] text-gray-400 font-semibold">
                                                <span className={`w-1.5 h-1.5 rounded-full ${getOccupancyColor(dayRate.occupancy)}`} />
                                                {dayRate.occupancy}%
                                            </span>
                                        )}
                                    </div>

                                    {isEditing ? (
                                        <div className="space-y-1" onClick={(e) => e.stopPropagation()}>
                                            <div className="relative">
                                                <span className="absolute left-1 top-0.5 text-[10px] text-gray-400 font-bold">৳</span>
                                                <input
                                                    type="number"
                                                    value={tempRate}
                                                    onChange={(e) => setTempRate(e.target.value)}
                                                    className="w-full pl-3.5 pr-1 py-0.5 border border-purple-500 rounded text-xs font-bold outline-none"
                                                    autoFocus
                                                    onKeyDown={(e) => {
                                                        if (e.key === 'Enter') handleSaveRate();
                                                        if (e.key === 'Escape') setEditingDate(null);
                                                    }}
                                                />
                                            </div>
                                            <div className="flex gap-1">
                                                <button
                                                    onClick={handleSaveRate}
                                                    className="flex-1 py-0.5 bg-emerald-600 text-white rounded text-[9px] font-bold hover:bg-emerald-700"
                                                >
                                                    <Save size={10} className="mx-auto" />
                                                </button>
                                                <button
                                                    onClick={() => setEditingDate(null)}
                                                    className="flex-1 py-0.5 bg-gray-200 text-gray-700 rounded text-[9px] font-bold hover:bg-gray-300"
                                                >
                                                    <RotateCcw size={10} className="mx-auto" />
                                                </button>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="space-y-1">
                                            <div className={`px-1.5 py-0.5 ${getRateColor(dayRate.rate)} rounded-md text-center shadow-2xs`}>
                                                <p className="text-[11px] font-bold leading-none font-mono">৳{dayRate.rate.toLocaleString()}</p>
                                            </div>
                                            {dayRate.eventName && (
                                                <p className="text-[8px] text-rose-600 font-bold truncate leading-none">{dayRate.eventName}</p>
                                            )}
                                        </div>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Bulk Update Modal */}
            {isBulkOpen && (
                <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl shadow-xl border border-gray-200 max-w-md w-full p-6 space-y-5 animate-in fade-in duration-200">
                        <div className="flex justify-between items-center border-b pb-3">
                            <div className="flex items-center gap-2">
                                <span className="p-1.5 bg-purple-50 text-purple-600 rounded-lg">
                                    <Calendar size={18} />
                                </span>
                                <div>
                                    <h3 className="text-base font-bold text-gray-900">Bulk Rate Adjustment</h3>
                                    <p className="text-xs text-gray-500">Apply rates across a date range for {selectedRoomType}</p>
                                </div>
                            </div>
                            <button
                                onClick={() => setIsBulkOpen(false)}
                                className="p-1 text-gray-400 hover:text-gray-600 rounded-lg"
                            >
                                <X size={18} />
                            </button>
                        </div>

                        <div className="space-y-4">
                            <div className="grid grid-cols-2 gap-3">
                                <div className="space-y-1">
                                    <label className="text-xs font-semibold text-gray-700">Start Date</label>
                                    <input
                                        type="date"
                                        value={bulkStartDate}
                                        onChange={(e) => setBulkStartDate(e.target.value)}
                                        className="w-full px-3 py-1.5 text-xs border border-gray-200 rounded-lg outline-none"
                                    />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-xs font-semibold text-gray-700">End Date</label>
                                    <input
                                        type="date"
                                        value={bulkEndDate}
                                        onChange={(e) => setBulkEndDate(e.target.value)}
                                        className="w-full px-3 py-1.5 text-xs border border-gray-200 rounded-lg outline-none"
                                    />
                                </div>
                            </div>

                            <div className="space-y-1">
                                <label className="text-xs font-semibold text-gray-700">Target Rate (BDT)</label>
                                <div className="relative">
                                    <span className="absolute left-3 top-2 text-gray-500 font-bold text-xs">৳</span>
                                    <input
                                        type="number"
                                        value={bulkRate}
                                        onChange={(e) => setBulkRate(e.target.value)}
                                        className="w-full pl-7 pr-3 py-1.5 text-sm border border-gray-200 rounded-lg outline-none font-bold text-purple-700 font-mono focus:ring-2 focus:ring-purple-500"
                                        placeholder="e.g. 3500"
                                    />
                                </div>
                            </div>

                            <div className="space-y-1">
                                <label className="text-xs font-semibold text-gray-700">Days Applicable</label>
                                <div className="grid grid-cols-3 gap-2">
                                    {[
                                        { id: 'all', label: 'All Days' },
                                        { id: 'weekends', label: 'Fri & Sat' },
                                        { id: 'weekdays', label: 'Sun - Thu' },
                                    ].map(filter => (
                                        <button
                                            key={filter.id}
                                            type="button"
                                            onClick={() => setBulkDayFilter(filter.id as any)}
                                            className={`py-1.5 text-xs font-bold rounded-lg border transition-all ${
                                                bulkDayFilter === filter.id
                                                    ? 'bg-purple-600 text-white border-purple-600 shadow-2xs'
                                                    : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'
                                            }`}
                                        >
                                            {filter.label}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>

                        <div className="flex justify-end gap-2 pt-3 border-t">
                            <button
                                onClick={() => setIsBulkOpen(false)}
                                className="px-4 py-2 border border-gray-200 text-gray-600 text-xs font-semibold rounded-lg hover:bg-gray-50"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleBulkApply}
                                className="px-5 py-2 bg-purple-600 text-white text-xs font-bold rounded-lg hover:bg-purple-700 shadow-xs flex items-center gap-1.5"
                            >
                                <Check size={14} />
                                <span>Apply to Calendar</span>
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
