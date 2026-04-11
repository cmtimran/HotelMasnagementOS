import { useState } from 'react';
import { TrendingUp, Users, DollarSign, ChevronLeft, ChevronRight } from 'lucide-react';

interface DayOccupancy {
    date: string;
    occupancy: number;
    revenue: number;
    availableRooms: number;
    bookedRooms: number;
}

const OccupancyHeatmap = () => {
    const [currentMonth, setCurrentMonth] = useState(new Date(2026, 0)); // January 2026

    // Mock data - replace with API
    const occupancyData: Record<string, DayOccupancy> = {
        '2026-01-16': { date: '2026-01-16', occupancy: 75, revenue: 180000, availableRooms: 3, bookedRooms: 9 },
        '2026-01-17': { date: '2026-01-17', occupancy: 92, revenue: 220000, availableRooms: 1, bookedRooms: 11 },
        '2026-01-18': { date: '2026-01-18', occupancy: 100, revenue: 240000, availableRooms: 0, bookedRooms: 12 },
        '2026-01-19': { date: '2026-01-19', occupancy: 83, revenue: 200000, availableRooms: 2, bookedRooms: 10 },
        '2026-01-24': { date: '2026-01-24', occupancy: 67, revenue: 160000, availableRooms: 4, bookedRooms: 8 },
        '2026-01-25': { date: '2026-01-25', occupancy: 92, revenue: 220000, availableRooms: 1, bookedRooms: 11 },
        '2026-01-26': { date: '2026-01-26', occupancy: 100, revenue: 280000, availableRooms: 0, bookedRooms: 12 },
        '2026-01-31': { date: '2026-01-31', occupancy: 58, revenue: 140000, availableRooms: 5, bookedRooms: 7 },
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

    const formatDate = (date: Date) => {
        return date.toISOString().split('T')[0];
    };

    const getOccupancyColor = (occupancy: number) => {
        if (occupancy >= 95) return 'from-red-500 to-red-600';
        if (occupancy >= 80) return 'from-orange-500 to-orange-600';
        if (occupancy >= 60) return 'from-yellow-500 to-yellow-600';
        if (occupancy >= 40) return 'from-emerald-500 to-emerald-600';
        if (occupancy >= 20) return 'from-blue-400 to-blue-500';
        return 'from-gray-300 to-gray-400';
    };

    const getOccupancyLabel = (occupancy: number) => {
        if (occupancy >= 95) return 'Full';
        if (occupancy >= 80) return 'High';
        if (occupancy >= 60) return 'Good';
        if (occupancy >= 40) return 'Fair';
        if (occupancy >= 20) return 'Low';
        return 'Empty';
    };

    const previousMonth = () => {
        setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1));
    };

    const nextMonth = () => {
        setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1));
    };

    const days = getDaysInMonth(currentMonth);
    const monthName = currentMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

    // Calculate stats
    const totalOccupancy = Object.values(occupancyData).reduce((sum, day) => sum + day.occupancy, 0) / Object.keys(occupancyData).length;
    const totalRevenue = Object.values(occupancyData).reduce((sum, day) => sum + day.revenue, 0);

    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-50 via-orange-50/20 to-gray-50 p-4 md:p-6 lg:p-8">
            {/* Header */}
            <div className="mb-8">
                <div className="flex items-center gap-3 mb-2">
                    <div className="w-12 h-12 bg-gradient-to-br from-orange-600 to-orange-700 rounded-xl flex items-center justify-center shadow-lg shadow-orange-600/30">
                        <TrendingUp size={24} className="text-white" />
                    </div>
                    <div>
                        <h1 className="text-3xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent">Occupancy Heatmap</h1>
                        <p className="text-sm text-gray-500">Visual calendar showing occupancy levels</p>
                    </div>
                </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
                <div className="bg-gradient-to-br from-blue-500 to-blue-600 p-6 rounded-2xl shadow-lg shadow-blue-500/30">
                    <p className="text-blue-100 text-sm font-semibold mb-2">Avg. Occupancy</p>
                    <p className="text-4xl font-bold text-white">{totalOccupancy.toFixed(0)}%</p>
                </div>
                <div className="bg-gradient-to-br from-emerald-500 to-emerald-600 p-6 rounded-2xl shadow-lg shadow-emerald-500/30">
                    <p className="text-emerald-100 text-sm font-semibold mb-2">Total Revenue</p>
                    <p className="text-4xl font-bold text-white">৳{(totalRevenue / 1000).toFixed(0)}K</p>
                </div>
                <div className="bg-gradient-to-br from-purple-500 to-purple-600 p-6 rounded-2xl shadow-lg shadow-purple-500/30">
                    <p className="text-purple-100 text-sm font-semibold mb-2">Peak Day</p>
                    <p className="text-4xl font-bold text-white">100%</p>
                </div>
                <div className="bg-gradient-to-br from-amber-500 to-amber-600 p-6 rounded-2xl shadow-lg shadow-amber-500/30">
                    <p className="text-amber-100 text-sm font-semibold mb-2">Lowest Day</p>
                    <p className="text-4xl font-bold text-white">58%</p>
                </div>
            </div>

            {/* Controls */}
            <div className="bg-white/80 backdrop-blur-sm p-6 rounded-2xl border border-gray-200 shadow-lg mb-6">
                <div className="flex items-center justify-between">
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
                <div className="flex items-center gap-6 text-sm flex-wrap">
                    <span className="font-semibold text-gray-700">Occupancy Levels:</span>
                    <div className="flex items-center gap-2">
                        <div className="w-4 h-4 bg-gradient-to-r from-red-500 to-red-600 rounded"></div>
                        <span className="text-gray-600">Full (95-100%)</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="w-4 h-4 bg-gradient-to-r from-orange-500 to-orange-600 rounded"></div>
                        <span className="text-gray-600">High (80-94%)</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="w-4 h-4 bg-gradient-to-r from-yellow-500 to-yellow-600 rounded"></div>
                        <span className="text-gray-600">Good (60-79%)</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="w-4 h-4 bg-gradient-to-r from-emerald-500 to-emerald-600 rounded"></div>
                        <span className="text-gray-600">Fair (40-59%)</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="w-4 h-4 bg-gradient-to-r from-blue-400 to-blue-500 rounded"></div>
                        <span className="text-gray-600">Low (20-39%)</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="w-4 h-4 bg-gradient-to-r from-gray-300 to-gray-400 rounded"></div>
                        <span className="text-gray-600">Empty (&lt;20%)</span>
                    </div>
                </div>
            </div>

            {/* Heatmap Calendar */}
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

                        const dateStr = formatDate(day);
                        const dayData = occupancyData[dateStr];
                        const isToday = formatDate(new Date()) === dateStr;

                        return (
                            <div
                                key={dateStr}
                                className={`aspect-square border border-gray-200 p-3 transition-all hover:shadow-lg cursor-pointer group ${isToday ? 'ring-2 ring-blue-500 ring-inset' : ''
                                    }`}
                            >
                                {dayData ? (
                                    <div className={`h-full bg-gradient-to-br ${getOccupancyColor(dayData.occupancy)} rounded-xl p-3 flex flex-col justify-between shadow-md`}>
                                        <div className="flex items-start justify-between">
                                            <span className="text-sm font-bold text-white">{day.getDate()}</span>
                                            <span className="text-[10px] font-bold text-white/90 bg-white/20 px-2 py-0.5 rounded-full">
                                                {getOccupancyLabel(dayData.occupancy)}
                                            </span>
                                        </div>
                                        <div className="space-y-1">
                                            <div className="bg-white/20 backdrop-blur-sm rounded-lg p-2">
                                                <p className="text-2xl font-bold text-white text-center">{dayData.occupancy}%</p>
                                            </div>
                                            <div className="text-white/90 text-[10px] space-y-0.5">
                                                <div className="flex items-center justify-between">
                                                    <span className="flex items-center gap-1">
                                                        <Users size={10} />
                                                        {dayData.bookedRooms}/{dayData.bookedRooms + dayData.availableRooms}
                                                    </span>
                                                    <span className="flex items-center gap-1">
                                                        <DollarSign size={10} />
                                                        {(dayData.revenue / 1000).toFixed(0)}K
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="h-full bg-gray-50 rounded-xl p-3 flex items-start">
                                        <span className="text-sm font-semibold text-gray-400">{day.getDate()}</span>
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
};

export default OccupancyHeatmap;
