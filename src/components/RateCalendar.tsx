import { useState, useEffect, useMemo } from 'react';
import { 
    Calendar, TrendingUp, Save, RotateCcw, ChevronLeft, ChevronRight, X, Check,
    BedDouble, DollarSign, Flame
} from 'lucide-react';
import PageHeader from './common/PageHeader';
import { getApiBaseUrl } from '../utils/apiUrl';
import { broadcastPMSEvent, getDynamicRoomTypes } from '../utils/roomInventoryEngine';

interface DayRate {
    date: string;
    rate: number;
    occupancy: number;
    isWeekend: boolean;
    isHoliday: boolean;
    eventName?: string;
}

const STORAGE_KEY = 'hotel_rate_calendar_v2';

const getDynamicRoomTypeRate = (typeName: string) => {
    const types = getDynamicRoomTypes();
    const match = types.find(t => t.name.toLowerCase() === typeName.toLowerCase() || t.code.toLowerCase() === typeName.toLowerCase());
    const base = match ? Number(match.baseRate) : 3000;
    return {
        weekday: base,
        weekend: Math.round(base * 1.25)
    };
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
    const dynamicTypes = useMemo(() => getDynamicRoomTypes(), []);
    const availableRoomTypes = useMemo(() => {
        return dynamicTypes.length > 0 ? dynamicTypes.map(t => t.name) : ['Deluxe Double'];
    }, [dynamicTypes]);
    const [selectedRoomType, setSelectedRoomType] = useState(() => availableRoomTypes[0] || 'Deluxe Double');
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
        return {};
    });

    const currentRates = ratesByRoomType[selectedRoomType] || {};

    useEffect(() => {
        fetch(`${getApiBaseUrl()}/api/rates/calendar?propertyId=1`)
            .then(res => res.json())
            .then(json => {
                if (json.success && json.data) {
                    setRatesByRoomType(prev => {
                        const merged = { ...prev };
                        for (const [rt, days] of Object.entries(json.data as Record<string, Record<string, DayRate>>)) {
                            merged[rt] = { ...(merged[rt] || {}), ...days };
                        }
                        localStorage.setItem(STORAGE_KEY, JSON.stringify(merged));
                        return merged;
                    });
                }
            })
            .catch(() => {});
    }, []);

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
        const defaults = getDynamicRoomTypeRate(selectedRoomType);
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

    const handleSaveRate = async () => {
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

            try {
                await fetch(`${getApiBaseUrl()}/api/rates/calendar/override`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        propertyId: 1,
                        roomType: selectedRoomType,
                        date: editingDate,
                        rate: newRate,
                        occupancy: currentRates[editingDate]?.occupancy || 0,
                        isWeekend: dayOfWeek === 5 || dayOfWeek === 6,
                        isHoliday: currentRates[editingDate]?.isHoliday || false,
                        eventName: currentRates[editingDate]?.eventName || null
                    })
                });
                broadcastPMSEvent({ type: 'INVENTORY_REFRESH' });
            } catch {}

            setEditingDate(null);
            setTempRate('');
        }
    };

    const handleBulkApply = async () => {
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

        try {
            await fetch(`${getApiBaseUrl()}/api/rates/calendar/bulk-override`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    propertyId: 1,
                    roomType: selectedRoomType,
                    startDate: bulkStartDate,
                    endDate: bulkEndDate,
                    rate: rateVal,
                    dayFilter: bulkDayFilter
                })
            });
            broadcastPMSEvent({ type: 'INVENTORY_REFRESH' });
        } catch {}

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

    const activeDays = days.filter((d): d is Date => d !== null);
    const dayRates = activeDays.map(d => getRateForDate(d));
    const maxRate = dayRates.length > 0 ? Math.max(...dayRates.map(r => r.rate)) : 0;
    const avgRate = dayRates.length > 0 ? Math.round(dayRates.reduce((acc, r) => acc + r.rate, 0) / dayRates.length) : 0;
    const highOccupancyDays = dayRates.filter(r => r.occupancy >= 80).length;

    return (
        <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-6 select-none animate-in fade-in duration-300">
            {/* Header */}
            <PageHeader
                title="Rate & ARI Distribution Calendar"
                subtitle="Multi-channel dynamic rate management, surge pricing, weekend adjustments, and occupancy distribution."
                icon={<Calendar className="size-6 text-primary" />}
                actions={
                    <div className="flex flex-wrap items-center gap-2.5">
                        <button
                            onClick={resetToOperationalMonth}
                            className="btn-secondary"
                            title="Jump to Current Operations Month (July 2026)"
                        >
                            July 2026
                        </button>
                        <button
                            onClick={() => setIsBulkOpen(true)}
                            className="btn-primary"
                        >
                            <Calendar className="size-4 mr-1.5" />
                            Bulk Rate Adjustment
                        </button>
                    </div>
                }
            />

            {/* KPI Metric Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-white border border-slate-200/90 rounded-2xl p-4 shadow-2xs hover:shadow-xs transition">
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-semibold text-slate-500">Selected Room</span>
                        <div className="size-8 rounded-xl bg-primary-subtle text-primary flex items-center justify-center font-bold">
                            <BedDouble className="size-4" />
                        </div>
                    </div>
                    <div className="text-base text-slate-900 truncate tracking-tight">{selectedRoomType}</div>
                    <div className="text-[11px] text-slate-500 font-medium mt-1">
                        WD: ৳{getDynamicRoomTypeRate(selectedRoomType).weekday.toLocaleString()} | WE: ৳{getDynamicRoomTypeRate(selectedRoomType).weekend.toLocaleString()}
                    </div>
                </div>

                <div className="bg-white border border-slate-200/90 rounded-2xl p-4 shadow-2xs hover:shadow-xs transition">
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-semibold text-slate-500">Avg Monthly Tariff</span>
                        <div className="size-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
                            <DollarSign className="size-4" />
                        </div>
                    </div>
                    <div className="text-2xl font-black text-slate-900 tracking-tight font-mono">৳{avgRate.toLocaleString()}</div>
                    <div className="text-[11px] text-emerald-600 font-semibold mt-1">Dynamic ARI average</div>
                </div>

                <div className="bg-white border border-slate-200/90 rounded-2xl p-4 shadow-2xs hover:shadow-xs transition">
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-semibold text-slate-500">Peak Yield Rate</span>
                        <div className="size-8 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center font-bold">
                            <Flame className="size-4" />
                        </div>
                    </div>
                    <div className="text-2xl font-black text-slate-900 tracking-tight font-mono">৳{maxRate.toLocaleString()}</div>
                    <div className="text-[11px] text-slate-500 font-medium mt-1">Maximum surge rate</div>
                </div>

                <div className="bg-white border border-slate-200/90 rounded-2xl p-4 shadow-2xs hover:shadow-xs transition">
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-semibold text-slate-500">Peak Occupancy Days</span>
                        <div className="size-8 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold">
                            <TrendingUp className="size-4" />
                        </div>
                    </div>
                    <div className="text-2xl font-black text-slate-900 tracking-tight">{highOccupancyDays} Days</div>
                    <div className="text-[11px] text-indigo-600 font-semibold mt-1">&ge;80% occupancy threshold</div>
                </div>
            </div>

            {/* Controls & Category Toolbar */}
            <div className="bg-white p-3.5 rounded-2xl border border-slate-200/90 shadow-2xs flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold text-slate-500">Room Category:</span>
                        <select
                            value={selectedRoomType}
                            onChange={(e) => setSelectedRoomType(e.target.value)}
                            className="select-standard text-xs py-1.5 px-3 min-w-[180px]"
                        >
                            {availableRoomTypes.map(rt => (
                                <option key={rt} value={rt}>{rt}</option>
                            ))}
                        </select>
                    </div>
                </div>

                {/* Month Navigator */}
                <div className="flex items-center gap-2">
                    <div className="flex items-center bg-slate-50 border border-slate-200/90 rounded-xl p-0.5 shadow-2xs">
                        <button
                            onClick={previousMonth}
                            className="p-1.5 hover:bg-white rounded-lg text-slate-600 hover:text-slate-900 transition"
                            title="Previous Month"
                        >
                            <ChevronLeft className="size-4" />
                        </button>
                        <span className="text-xs text-slate-800 px-3 min-w-[130px] text-center">{monthName}</span>
                        <button
                            onClick={nextMonth}
                            className="p-1.5 hover:bg-white rounded-lg text-slate-600 hover:text-slate-900 transition"
                            title="Next Month"
                        >
                            <ChevronRight className="size-4" />
                        </button>
                    </div>
                </div>
            </div>

            {/* Compact Legend Bar */}
            <div className="bg-white px-4 py-2.5 rounded-2xl border border-slate-200/80 shadow-2xs flex flex-wrap items-center justify-between text-xs text-slate-500 gap-3">
                <div className="flex flex-wrap items-center gap-4">
                    <span className="text-slate-700 text-[10px] uppercase tracking-wider">Tariff Legend:</span>
                    <span className="flex items-center gap-1.5"><span className="size-2.5 rounded bg-purple-600"></span> Suite / VIP (৳10k+)</span>
                    <span className="flex items-center gap-1.5"><span className="size-2.5 rounded bg-primary"></span> Premium (৳5k-10k)</span>
                    <span className="flex items-center gap-1.5"><span className="size-2.5 rounded bg-emerald-600"></span> Standard (৳3k-5k)</span>
                    <span className="flex items-center gap-1.5"><span className="size-2.5 rounded bg-slate-500"></span> Base (&lt;৳3k)</span>
                </div>
                <div className="flex items-center gap-1.5 text-xs text-primary font-semibold bg-primary-subtle px-2.5 py-1 rounded-lg border border-primary-border/40">
                    <TrendingUp className="size-3.5" />
                    <span>Dynamic ARI Engine Synchronized with Channels</span>
                </div>
            </div>

            {/* Calendar Grid */}
            <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs overflow-hidden">
                <div className="overflow-x-auto">
                    <div className="min-w-[760px]">
                        <div className="grid grid-cols-7 bg-slate-50/80 border-b border-slate-200/80 text-center text-[11px] font-semibold text-slate-500 uppercase tracking-wider py-2.5">
                            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri (Weekend)', 'Sat (Weekend)'].map(day => (
                                <div key={day}>{day}</div>
                            ))}
                        </div>

                        <div className="grid grid-cols-7 divide-x divide-y divide-slate-100">
                            {days.map((day, index) => {
                                if (!day) {
                                    return <div key={`empty-${index}`} className="h-24 bg-slate-50/40" />;
                                }

                                const dayRate = getRateForDate(day);
                                const dateStr = formatDate(day);
                                const isEditing = editingDate === dateStr;
                                const isToday = '2026-07-01' === dateStr;

                                return (
                                    <div
                                        key={dateStr}
                                        onClick={() => !isEditing && handleCellClick(day)}
                                        className={`h-24 p-2.5 cursor-pointer transition hover:bg-slate-50/80 ${
                                            isToday ? 'bg-primary-subtle/30 ring-1 ring-primary inset-0' : 'bg-white'
                                        }`}
                                    >
                                        <div className="h-full flex flex-col justify-between">
                                            <div className="flex items-center justify-between leading-none">
                                                <span className={`text-xs ${isToday ? 'text-primary' : 'text-slate-800'}`}>
                                                    {day.getDate()}
                                                </span>
                                                {dayRate.occupancy > 0 && (
                                                    <span className="flex items-center gap-1 text-[10px] text-slate-500 font-medium">
                                                        <span className={`size-1.5 rounded-full ${getOccupancyColor(dayRate.occupancy)}`} />
                                                        {dayRate.occupancy}%
                                                    </span>
                                                )}
                                            </div>

                                            {isEditing ? (
                                                <div className="space-y-1.5" onClick={(e) => e.stopPropagation()}>
                                                    <div className="relative">
                                                        <span className="absolute left-2 top-1 text-[11px] text-slate-400 font-bold">৳</span>
                                                        <input
                                                            type="number"
                                                            value={tempRate}
                                                            onChange={(e) => setTempRate(e.target.value)}
                                                            className="w-full pl-5 pr-1 py-1 border border-primary rounded-lg text-xs outline-none"
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
                                                            className="flex-1 py-1 bg-emerald-600 text-white rounded-lg text-[10px] hover:bg-emerald-700 transition"
                                                        >
                                                            <Save className="size-3 mx-auto" />
                                                        </button>
                                                        <button
                                                            onClick={() => setEditingDate(null)}
                                                            className="flex-1 py-1 bg-slate-100 text-slate-600 rounded-lg text-[10px] hover:bg-slate-200 transition"
                                                        >
                                                            <RotateCcw className="size-3 mx-auto" />
                                                        </button>
                                                    </div>
                                                </div>
                                            ) : (
                                                <div className="space-y-1">
                                                    <div className={`px-2 py-1 ${getRateColor(dayRate.rate)} rounded-lg text-center shadow-2xs`}>
                                                        <p className="text-xs leading-none font-mono">৳{dayRate.rate.toLocaleString()}</p>
                                                    </div>
                                                    {dayRate.eventName && (
                                                        <p className="text-[10px] text-rose-600 font-semibold truncate leading-none mt-1">{dayRate.eventName}</p>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>
            </div>

            {/* Bulk Update Modal */}
            {isBulkOpen && (
                <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
                    <div className="card-container max-w-md w-full p-6 space-y-5 animate-in fade-in duration-200 shadow-xl">
                        <div className="flex justify-between items-center border-b border-slate-100 pb-3">
                            <div className="flex items-center gap-2.5">
                                <div className="size-9 rounded-xl bg-primary-subtle text-primary flex items-center justify-center font-bold">
                                    <Calendar className="size-5" />
                                </div>
                                <div>
                                    <h3 className="text-base text-slate-900">Bulk Rate Adjustment</h3>
                                    <p className="text-xs text-slate-500">Apply uniform rates for {selectedRoomType}</p>
                                </div>
                            </div>
                            <button
                                onClick={() => setIsBulkOpen(false)}
                                className="btn-secondary p-1.5"
                            >
                                <X className="size-4 text-slate-500" />
                            </button>
                        </div>

                        <div className="space-y-4">
                            <div className="grid grid-cols-2 gap-3">
                                <div className="space-y-1.5">
                                    <label className="text-xs font-semibold text-slate-700">Start Date</label>
                                    <input
                                        type="date"
                                        value={bulkStartDate}
                                        onChange={(e) => setBulkStartDate(e.target.value)}
                                        className="input-standard text-xs py-1.5"
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-xs font-semibold text-slate-700">End Date</label>
                                    <input
                                        type="date"
                                        value={bulkEndDate}
                                        onChange={(e) => setBulkEndDate(e.target.value)}
                                        className="input-standard text-xs py-1.5"
                                    />
                                </div>
                            </div>

                            <div className="space-y-1.5">
                                <label className="text-xs font-semibold text-slate-700">Target Rate (BDT)</label>
                                <div className="relative">
                                    <span className="absolute left-3 top-2 text-slate-400 text-xs">৳</span>
                                    <input
                                        type="number"
                                        value={bulkRate}
                                        onChange={(e) => setBulkRate(e.target.value)}
                                        className="input-standard pl-7 font-mono font-bold"
                                        placeholder="e.g. 3500"
                                    />
                                </div>
                            </div>

                            <div className="space-y-1.5">
                                <label className="text-xs font-semibold text-slate-700">Days Applicable</label>
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
                                            className={`py-2 text-xs font-semibold rounded-xl border transition ${
                                                bulkDayFilter === filter.id
                                                    ? 'bg-primary text-white border-primary shadow-xs'
                                                    : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                                            }`}
                                        >
                                            {filter.label}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>

                        <div className="flex justify-end gap-2.5 pt-3 border-t border-slate-100">
                            <button
                                onClick={() => setIsBulkOpen(false)}
                                className="btn-secondary"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleBulkApply}
                                className="btn-primary"
                            >
                                <Check className="size-4 mr-1.5" />
                                Apply to Calendar
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
