import { useState } from 'react';
import { Calendar, TrendingUp, Save, RotateCcw, ChevronLeft, ChevronRight, DollarSign } from 'lucide-react';

interface DayRate {
    date: string;
    rate: number;
    occupancy: number;
    isWeekend: boolean;
    isHoliday: boolean;
    eventName?: string;
}

const RateCalendar = () => {
    const [currentMonth, setCurrentMonth] = useState(new Date(2026, 0));
    const [selectedRoomType, setSelectedRoomType] = useState('Deluxe');
    const [editingDate, setEditingDate] = useState<string | null>(null);
    const [tempRate, setTempRate] = useState('');

    const [rates, setRates] = useState<Record<string, DayRate>>({
        '2026-01-16': { date: '2026-01-16', rate: 5000, occupancy: 85, isWeekend: false, isHoliday: false },
        '2026-01-17': { date: '2026-01-17', rate: 6000, occupancy: 92, isWeekend: true, isHoliday: false },
        '2026-01-18': { date: '2026-01-18', rate: 6000, occupancy: 95, isWeekend: true, isHoliday: false },
        '2026-01-26': { date: '2026-01-26', rate: 8000, occupancy: 100, isWeekend: false, isHoliday: true, eventName: 'Republic Day' },
    });

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

    const formatDate = (date: Date) => {
        return date.toISOString().split('T')[0];
    };

    const getDefaultRate = (date: Date) => {
        const dayOfWeek = date.getDay();
        const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
        return isWeekend ? 6000 : 5000;
    };

    const getRateForDate = (date: Date): DayRate => {
        const dateStr = formatDate(date);
        if (rates[dateStr]) {
            return rates[dateStr];
        }
        const dayOfWeek = date.getDay();
        return {
            date: dateStr,
            rate: getDefaultRate(date),
            occupancy: 0,
            isWeekend: dayOfWeek === 0 || dayOfWeek === 6,
            isHoliday: false,
        };
    };

    const getRateColor = (rate: number) => {
        if (rate >= 8000) return 'bg-purple-600 text-white';
        if (rate >= 6000) return 'bg-blue-600 text-white';
        if (rate >= 5000) return 'bg-emerald-600 text-white';
        return 'bg-gray-500 text-white';
    };

    const getOccupancyColor = (occupancy: number) => {
        if (occupancy >= 95) return 'bg-rose-500';
        if (occupancy >= 80) return 'bg-amber-500';
        if (occupancy >= 60) return 'bg-yellow-500';
        if (occupancy >= 40) return 'bg-emerald-500';
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
            const newRate = parseInt(tempRate);
            const date = new Date(editingDate);
            const dayOfWeek = date.getDay();
            setRates({
                ...rates,
                [editingDate]: {
                    ...rates[editingDate],
                    date: editingDate,
                    rate: newRate,
                    isWeekend: dayOfWeek === 0 || dayOfWeek === 6,
                    isHoliday: rates[editingDate]?.isHoliday || false,
                    occupancy: rates[editingDate]?.occupancy || 0,
                },
            });
            setEditingDate(null);
            setTempRate('');
        }
    };

    const previousMonth = () => {
        setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1));
    };

    const nextMonth = () => {
        setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1));
    };

    const days = getDaysInMonth(currentMonth);
    const monthName = currentMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

    return (
        <div className="p-3 sm:p-4 max-w-7xl mx-auto space-y-2.5 font-sans select-none">
            {/* Header & Controls Toolbar */}
            <div className="bg-white p-2.5 rounded-lg border border-gray-200/90 shadow-2xs flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                    <div className="w-7 h-7 bg-purple-600 rounded-md flex items-center justify-center text-white shadow-xs">
                        <DollarSign size={15} />
                    </div>
                    <div>
                        <h1 className="text-base font-bold text-gray-900 tracking-tight leading-none">Rate & ARI Distribution Calendar</h1>
                        <p className="text-[11px] text-gray-500 font-medium leading-none mt-1">Multi-channel daily rates, minimum stay & surge pricing</p>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    <select
                        value={selectedRoomType}
                        onChange={(e) => setSelectedRoomType(e.target.value)}
                        className="h-7 px-2 border border-gray-200 rounded-md text-xs font-semibold text-gray-700 bg-white"
                    >
                        <option>Deluxe</option>
                        <option>Suite</option>
                        <option>Executive</option>
                        <option>Standard</option>
                    </select>

                    <div className="flex items-center gap-1 bg-gray-50 border border-gray-200 rounded-md p-0.5">
                        <button
                            onClick={previousMonth}
                            className="p-1 hover:bg-white rounded text-gray-600 hover:shadow-xs transition-all"
                        >
                            <ChevronLeft size={13} />
                        </button>
                        <span className="text-xs font-bold text-gray-800 px-2 min-w-[120px] text-center">{monthName}</span>
                        <button
                            onClick={nextMonth}
                            className="p-1 hover:bg-white rounded text-gray-600 hover:shadow-xs transition-all"
                        >
                            <ChevronRight size={13} />
                        </button>
                    </div>

                    <button className="h-7 px-2.5 bg-purple-600 hover:bg-purple-700 text-white rounded text-xs font-semibold shadow-2xs flex items-center gap-1 transition-colors">
                        <Calendar size={12} />
                        <span>Bulk Update</span>
                    </button>
                </div>
            </div>

            {/* Compact Legend Bar */}
            <div className="bg-white px-3 py-1.5 rounded-lg border border-gray-200/80 shadow-2xs flex flex-wrap items-center justify-between text-[11px] text-gray-500 gap-2">
                <div className="flex items-center gap-4">
                    <span className="font-bold text-gray-700 text-[10px] uppercase">Rate Tiers:</span>
                    <span className="flex items-center gap-1"><span className="w-2 h-2 rounded bg-purple-600"></span> Premium (৳8k+)</span>
                    <span className="flex items-center gap-1"><span className="w-2 h-2 rounded bg-blue-600"></span> High (৳6k-8k)</span>
                    <span className="flex items-center gap-1"><span className="w-2 h-2 rounded bg-emerald-600"></span> Standard (৳5k-6k)</span>
                    <span className="flex items-center gap-1"><span className="w-2 h-2 rounded bg-gray-500"></span> Base (&lt;৳5k)</span>
                </div>
                <div className="flex items-center gap-2 text-[10px] text-purple-700 font-semibold bg-purple-50 px-2 py-0.5 rounded border border-purple-100">
                    <TrendingUp size={11} />
                    <span>Dynamic Pricing Engine Active</span>
                </div>
            </div>

            {/* Calendar Grid */}
            <div className="bg-white rounded-lg border border-gray-200/90 shadow-2xs overflow-hidden">
                <div className="grid grid-cols-7 bg-gray-50 border-b border-gray-200 text-center text-[10px] font-bold text-gray-600 uppercase tracking-wider py-1.5">
                    {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                        <div key={day}>{day}</div>
                    ))}
                </div>

                <div className="grid grid-cols-7 divide-x divide-y divide-gray-100">
                    {days.map((day, index) => {
                        if (!day) {
                            return <div key={`empty-${index}`} className="h-18 bg-gray-50/50" />;
                        }

                        const dayRate = getRateForDate(day);
                        const dateStr = formatDate(day);
                        const isEditing = editingDate === dateStr;
                        const isToday = formatDate(new Date()) === dateStr;

                        return (
                            <div
                                key={dateStr}
                                onClick={() => !isEditing && handleCellClick(day)}
                                className={`h-18 p-1.5 cursor-pointer transition-all hover:bg-blue-50/20 ${isToday ? 'bg-blue-50/30 ring-1 ring-blue-500 inset-0' : 'bg-white'}`}
                            >
                                <div className="h-full flex flex-col justify-between">
                                    <div className="flex items-center justify-between leading-none">
                                        <span className={`text-xs font-bold ${isToday ? 'text-blue-600' : 'text-gray-800'}`}>
                                            {day.getDate()}
                                        </span>
                                        {dayRate.occupancy > 0 && (
                                            <span className="flex items-center gap-1 text-[9px] text-gray-400 font-medium">
                                                <span className={`w-1.5 h-1.5 rounded-full ${getOccupancyColor(dayRate.occupancy)}`} />
                                                {dayRate.occupancy}%
                                            </span>
                                        )}
                                    </div>

                                    {isEditing ? (
                                        <div className="space-y-1">
                                            <input
                                                type="number"
                                                value={tempRate}
                                                onChange={(e) => setTempRate(e.target.value)}
                                                className="w-full px-1.5 py-0.5 border border-purple-400 rounded text-xs font-bold outline-none"
                                                autoFocus
                                                onKeyDown={(e) => {
                                                    if (e.key === 'Enter') handleSaveRate();
                                                    if (e.key === 'Escape') setEditingDate(null);
                                                }}
                                            />
                                            <div className="flex gap-1">
                                                <button onClick={handleSaveRate} className="flex-1 py-0.5 bg-emerald-600 text-white rounded text-[9px] hover:bg-emerald-700">
                                                    <Save size={10} className="mx-auto" />
                                                </button>
                                                <button onClick={() => setEditingDate(null)} className="flex-1 py-0.5 bg-gray-200 text-gray-700 rounded text-[9px] hover:bg-gray-300">
                                                    <RotateCcw size={10} className="mx-auto" />
                                                </button>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="space-y-0.5">
                                            <div className={`px-1.5 py-0.5 ${getRateColor(dayRate.rate)} rounded text-center shadow-2xs`}>
                                                <p className="text-[10px] font-bold leading-none">৳{(dayRate.rate / 1000).toFixed(1)}k</p>
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
        </div>
    );
};

export default RateCalendar;
