import { useState } from 'react';
import { Calendar, DollarSign, TrendingUp, Save, RotateCcw, ChevronLeft, ChevronRight } from 'lucide-react';

interface DayRate {
    date: string;
    rate: number;
    occupancy: number;
    isWeekend: boolean;
    isHoliday: boolean;
    eventName?: string;
}

const RateCalendar = () => {
    const [currentMonth, setCurrentMonth] = useState(new Date(2026, 0)); // January 2026
    const [selectedRoomType, setSelectedRoomType] = useState('Deluxe');
    const [editingDate, setEditingDate] = useState<string | null>(null);
    const [tempRate, setTempRate] = useState('');

    // Mock data - replace with API
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

        // Add empty cells for days before month starts
        for (let i = 0; i < startingDayOfWeek; i++) {
            days.push(null);
        }

        // Add all days in month
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
        if (rate >= 8000) return 'from-purple-500 to-purple-600';
        if (rate >= 6000) return 'from-blue-500 to-blue-600';
        if (rate >= 5000) return 'from-emerald-500 to-emerald-600';
        return 'from-gray-400 to-gray-500';
    };

    const getOccupancyColor = (occupancy: number) => {
        if (occupancy >= 95) return 'bg-red-500';
        if (occupancy >= 80) return 'bg-orange-500';
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
        <div className="min-h-screen bg-gradient-to-br from-gray-50 via-purple-50/20 to-gray-50 p-4 md:p-6 lg:p-8">
            {/* Header */}
            <div className="mb-8">
                <div className="flex items-center gap-3 mb-2">
                    <div className="w-12 h-12 bg-gradient-to-br from-purple-600 to-purple-700 rounded-xl flex items-center justify-center shadow-lg shadow-purple-600/30">
                        <DollarSign size={24} className="text-white" />
                    </div>
                    <div>
                        <h1 className="text-3xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent">Rate Calendar</h1>
                        <p className="text-sm text-gray-500">Manage room rates and pricing strategy</p>
                    </div>
                </div>
            </div>

            {/* Controls */}
            <div className="bg-white/80 backdrop-blur-sm p-6 rounded-2xl border border-gray-200 shadow-lg mb-6">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <select
                            value={selectedRoomType}
                            onChange={(e) => setSelectedRoomType(e.target.value)}
                            className="px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none text-sm bg-white shadow-sm font-semibold"
                        >
                            <option>Deluxe</option>
                            <option>Suite</option>
                            <option>Executive</option>
                            <option>Standard</option>
                        </select>
                        <div className="flex items-center gap-2 bg-purple-50 px-4 py-2 rounded-xl border border-purple-200">
                            <TrendingUp size={18} className="text-purple-600" />
                            <span className="text-sm font-semibold text-purple-700">Dynamic Pricing Active</span>
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        <button
                            onClick={previousMonth}
                            className="w-10 h-10 bg-white border border-gray-300 rounded-xl flex items-center justify-center hover:bg-gray-50 transition-all"
                        >
                            <ChevronLeft size={20} />
                        </button>
                        <span className="text-lg font-bold text-gray-900 min-w-[200px] text-center">{monthName}</span>
                        <button
                            onClick={nextMonth}
                            className="w-10 h-10 bg-white border border-gray-300 rounded-xl flex items-center justify-center hover:bg-gray-50 transition-all"
                        >
                            <ChevronRight size={20} />
                        </button>
                    </div>
                </div>
            </div>

            {/* Legend */}
            <div className="bg-white/80 backdrop-blur-sm p-4 rounded-2xl border border-gray-200 shadow-lg mb-6">
                <div className="flex items-center gap-6 text-sm">
                    <span className="font-semibold text-gray-700">Rate Levels:</span>
                    <div className="flex items-center gap-2">
                        <div className="w-4 h-4 bg-gradient-to-r from-purple-500 to-purple-600 rounded"></div>
                        <span className="text-gray-600">Premium (৳8000+)</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="w-4 h-4 bg-gradient-to-r from-blue-500 to-blue-600 rounded"></div>
                        <span className="text-gray-600">High (৳6000-7999)</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="w-4 h-4 bg-gradient-to-r from-emerald-500 to-emerald-600 rounded"></div>
                        <span className="text-gray-600">Standard (৳5000-5999)</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="w-4 h-4 bg-gradient-to-r from-gray-400 to-gray-500 rounded"></div>
                        <span className="text-gray-600">Low (&lt;৳5000)</span>
                    </div>
                </div>
            </div>

            {/* Calendar Grid */}
            <div className="bg-white rounded-2xl border border-gray-200 shadow-xl overflow-hidden">
                <div className="grid grid-cols-7 bg-gradient-to-r from-gray-50 to-gray-100 border-b border-gray-200">
                    {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                        <div key={day} className="p-4 text-center text-xs font-bold text-gray-700 uppercase tracking-wider">
                            {day}
                        </div>
                    ))}
                </div>
                <div className="grid grid-cols-7">
                    {days.map((day, index) => {
                        if (!day) {
                            return <div key={`empty-${index}`} className="aspect-square border border-gray-100 bg-gray-50" />;
                        }

                        const dayRate = getRateForDate(day);
                        const dateStr = formatDate(day);
                        const isEditing = editingDate === dateStr;
                        const isToday = formatDate(new Date()) === dateStr;

                        return (
                            <div
                                key={dateStr}
                                onClick={() => !isEditing && handleCellClick(day)}
                                className={`aspect-square border border-gray-200 p-3 cursor-pointer transition-all hover:shadow-lg ${isToday ? 'ring-2 ring-blue-500 ring-inset' : ''
                                    } ${dayRate.isHoliday ? 'bg-red-50' : 'bg-white hover:bg-gray-50'}`}
                            >
                                <div className="h-full flex flex-col justify-between">
                                    <div className="flex items-start justify-between">
                                        <span className={`text-sm font-bold ${isToday ? 'text-blue-600' : 'text-gray-900'}`}>
                                            {day.getDate()}
                                        </span>
                                        {dayRate.occupancy > 0 && (
                                            <div className={`w-2 h-2 rounded-full ${getOccupancyColor(dayRate.occupancy)}`} />
                                        )}
                                    </div>

                                    {isEditing ? (
                                        <div className="space-y-2">
                                            <input
                                                type="number"
                                                value={tempRate}
                                                onChange={(e) => setTempRate(e.target.value)}
                                                className="w-full px-2 py-1 border border-purple-300 rounded text-sm font-bold focus:ring-2 focus:ring-purple-500 outline-none"
                                                autoFocus
                                                onKeyDown={(e) => {
                                                    if (e.key === 'Enter') handleSaveRate();
                                                    if (e.key === 'Escape') setEditingDate(null);
                                                }}
                                            />
                                            <div className="flex gap-1">
                                                <button
                                                    onClick={handleSaveRate}
                                                    className="flex-1 p-1 bg-emerald-600 text-white rounded text-xs hover:bg-emerald-700"
                                                >
                                                    <Save size={12} className="mx-auto" />
                                                </button>
                                                <button
                                                    onClick={() => setEditingDate(null)}
                                                    className="flex-1 p-1 bg-gray-300 text-gray-700 rounded text-xs hover:bg-gray-400"
                                                >
                                                    <RotateCcw size={12} className="mx-auto" />
                                                </button>
                                            </div>
                                        </div>
                                    ) : (
                                        <>
                                            <div className={`px-2 py-1 bg-gradient-to-r ${getRateColor(dayRate.rate)} rounded-lg text-center`}>
                                                <p className="text-xs font-bold text-white">৳{(dayRate.rate / 1000).toFixed(1)}K</p>
                                            </div>
                                            {dayRate.eventName && (
                                                <p className="text-[10px] text-red-600 font-semibold truncate">{dayRate.eventName}</p>
                                            )}
                                            {dayRate.occupancy > 0 && (
                                                <p className="text-[10px] text-gray-500 font-medium">{dayRate.occupancy}% occ</p>
                                            )}
                                        </>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Quick Actions */}
            <div className="mt-6 flex gap-4">
                <button className="px-6 py-3 bg-gradient-to-r from-purple-600 to-purple-700 text-white rounded-xl font-semibold hover:from-purple-700 hover:to-purple-800 transition-all shadow-lg shadow-purple-600/30 flex items-center gap-2">
                    <Calendar size={18} />
                    Bulk Update Rates
                </button>
                <button className="px-6 py-3 bg-white border border-gray-300 text-gray-700 rounded-xl font-semibold hover:bg-gray-50 transition-all flex items-center gap-2">
                    <TrendingUp size={18} />
                    Apply Dynamic Pricing
                </button>
            </div>
        </div>
    );
};

export default RateCalendar;
