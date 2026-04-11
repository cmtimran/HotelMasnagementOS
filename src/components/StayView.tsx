import { useState } from 'react';
import { Calendar, ChevronDown, ChevronRight } from 'lucide-react';

interface Booking {
    id: number;
    guestName: string;
    roomNumber: string;
    checkIn: string;
    checkOut: string;
    status: 'occupied' | 'checkin' | 'checkout' | 'vip' | 'ota' | 'expected' | 'vacant' | 'housekeep';
    color: string;
}

interface RoomType {
    name: string;
    rooms: string[];
    expanded: boolean;
}

const StayView = () => {
    const [fromDate, setFromDate] = useState('2025-04-03');
    const [days, setDays] = useState(30);

    const [roomTypes, setRoomTypes] = useState<RoomType[]>([
        { name: 'Standard Room', rooms: ['STD-101', 'STD-101', 'STD-101', 'STD-101'], expanded: true },
        { name: 'Delux Room', rooms: ['DEL-101', 'DEL-101', 'DEL-101'], expanded: true },
        { name: 'Double Deluxe Room', rooms: [], expanded: false },
        { name: 'Super Deluxe Room', rooms: ['PRS-101', 'PRS-101'], expanded: true },
        { name: 'Presidential Suite', rooms: ['PRS-101', 'PRS-101'], expanded: true },
    ]);

    // Mock bookings data
    const [bookings] = useState<Booking[]>([
        { id: 1, guestName: 'Foysal Ahmed', roomNumber: 'STD-101', checkIn: '2025-04-05', checkOut: '2025-04-08', status: 'occupied', color: '#059669' },
        { id: 2, guestName: 'Sadik Hasan', roomNumber: 'STD-101', checkIn: '2025-04-06', checkOut: '2025-04-08', status: 'checkin', color: '#0891b2' },
        { id: 3, guestName: 'Afifa Mahir Joy', roomNumber: 'STD-101', checkIn: '2025-04-11', checkOut: '2025-04-15', status: 'ota', color: '#dc2626' },
        { id: 4, guestName: 'Mohammad Jaki', roomNumber: 'STD-101', checkIn: '2025-04-17', checkOut: '2025-04-19', status: 'expected', color: '#f97316' },
        { id: 5, guestName: 'Afifa Mahir', roomNumber: 'STD-101', checkIn: '2025-04-08', checkOut: '2025-04-10', status: 'vip', color: '#3b82f6' },
        { id: 6, guestName: 'Shahriar Hossain', roomNumber: 'STD-101', checkIn: '2025-04-10', checkOut: '2025-04-14', status: 'ota', color: '#dc2626' },
        { id: 7, guestName: 'Rafiqul Islam', roomNumber: 'DEL-101', checkIn: '2025-04-07', checkOut: '2025-04-11', status: 'occupied', color: '#0891b2' },
        { id: 8, guestName: 'Saikat Huda', roomNumber: 'DEL-101', checkIn: '2025-04-17', checkOut: '2025-04-22', status: 'expected', color: '#f97316' },
        { id: 9, guestName: 'Hira John Baidda', roomNumber: 'PRS-101', checkIn: '2025-04-05', checkOut: '2025-04-09', status: 'vip', color: '#3b82f6' },
        { id: 10, guestName: 'Faysal Ahmed', roomNumber: 'PRS-101', checkIn: '2025-04-19', checkOut: '2025-04-22', status: 'expected', color: '#f97316' },
    ]);

    // Generate date range
    const generateDates = () => {
        const dates = [];
        const start = new Date(fromDate);
        for (let i = 0; i < days; i++) {
            const date = new Date(start);
            date.setDate(start.getDate() + i);
            dates.push(date);
        }
        return dates;
    };

    const dates = generateDates();

    // Calculate booking position and width
    const getBookingStyle = (booking: Booking) => {
        const start = new Date(fromDate);
        const checkIn = new Date(booking.checkIn);
        const checkOut = new Date(booking.checkOut);

        const startDiff = Math.floor((checkIn.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
        const duration = Math.floor((checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60 * 24));

        if (startDiff + duration < 0 || startDiff >= days) return null;

        const actualStart = Math.max(0, startDiff);
        const actualDuration = Math.min(duration, days - actualStart);

        return {
            left: `${(actualStart / days) * 100}%`,
            width: `${(actualDuration / days) * 100}%`,
        };
    };

    const toggleRoomType = (index: number) => {
        setRoomTypes(roomTypes.map((rt, i) =>
            i === index ? { ...rt, expanded: !rt.expanded } : rt
        ));
    };

    // Status indicators
    const statusIndicators = [
        { label: 'Occupied', count: 18, color: '#dc2626', icon: '🔴' },
        { label: 'T Check-in', count: 1, color: '#ec4899', icon: '🟣' },
        { label: 'Back to Back', count: 1, color: '#8b5cf6', icon: '🟣' },
        { label: 'House Use', count: 1, color: '#22c55e', icon: '🟢' },
        { label: 'VIP', count: 1, color: '#3b82f6', icon: '🔵' },
        { label: 'OTA', count: 1, color: '#6b7280', icon: '⚫' },
        { label: 'Expected Departure', count: 1, color: '#ec4899', icon: '🟣' },
        { label: 'Vacant Dirty', count: 1, color: '#eab308', icon: '🟡' },
        { label: 'Expected Arrival', count: 0, color: '#f97316', icon: '🟠' },
        { label: 'Expected Departure', count: 0, color: '#ec4899', icon: '🟣' },
        { label: 'DA', count: 0, color: '#06b6d4', icon: '🔵' },
        { label: 'OOO', count: 2, color: '#eab308', icon: '🟡' },
        { label: 'OOS', count: 1, color: '#0891b2', icon: '🔵' },
        { label: 'Vacant Clean', count: 1, color: '#22c55e', icon: '🟢' },
    ];

    return (
        <div className="min-h-screen bg-gray-50 p-4">
            {/* Header */}
            <div className="bg-white rounded-lg shadow-sm p-4 mb-4">
                <div className="flex items-center justify-between mb-4">
                    <h1 className="text-2xl font-bold text-gray-900">STAY VIEW</h1>
                    <button className="px-6 py-2 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-colors">
                        Assign Room
                    </button>
                </div>

                {/* Status Indicators */}
                <div className="flex flex-wrap gap-2 mb-4">
                    <div className="flex items-center gap-2 px-3 py-1 bg-gray-100 rounded-lg">
                        <div className="w-3 h-3 bg-blue-500 rounded-sm"></div>
                        <span className="text-xs font-medium">Today</span>
                    </div>
                    <div className="flex items-center gap-2 px-3 py-1 bg-gray-100 rounded-lg">
                        <div className="w-3 h-3 bg-pink-500 rounded-sm"></div>
                        <span className="text-xs font-medium">Holiday</span>
                    </div>
                    <div className="flex items-center gap-2 px-3 py-1 bg-gray-100 rounded-lg">
                        <div className="w-3 h-3 bg-cyan-500 rounded-sm"></div>
                        <span className="text-xs font-medium">Today & Holiday</span>
                    </div>
                </div>

                {/* Status Count Badges */}
                <div className="flex flex-wrap gap-2">
                    {statusIndicators.map((status, idx) => (
                        <div key={idx} className="flex flex-col items-center">
                            <div
                                className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-sm shadow-md"
                                style={{ backgroundColor: status.color }}
                            >
                                {status.count}
                            </div>
                            <span className="text-xs text-gray-600 mt-1 text-center max-w-[60px]">{status.label}</span>
                        </div>
                    ))}
                </div>
            </div>

            {/* Date Selector */}
            <div className="bg-white rounded-lg shadow-sm p-4 mb-4">
                <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                        <label className="text-sm font-semibold text-gray-700">From Date:</label>
                        <input
                            type="date"
                            value={fromDate}
                            onChange={(e) => setFromDate(e.target.value)}
                            className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                    </div>
                    <div className="flex items-center gap-2">
                        <label className="text-sm font-semibold text-gray-700">Days:</label>
                        <select
                            value={days}
                            onChange={(e) => setDays(Number(e.target.value))}
                            className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                            <option value={7}>7 Days</option>
                            <option value={14}>14 Days</option>
                            <option value={30}>30 Days</option>
                            <option value={60}>60 Days</option>
                        </select>
                    </div>
                    <div className="flex items-center gap-2">
                        <label className="text-sm font-semibold text-gray-700">Room Type:</label>
                        <select className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500">
                            <option>All</option>
                            <option>Standard Room</option>
                            <option>Delux Room</option>
                            <option>Super Deluxe Room</option>
                        </select>
                    </div>
                </div>
            </div>

            {/* Timeline Grid */}
            <div className="bg-white rounded-lg shadow-lg overflow-hidden">
                <div className="overflow-x-auto">
                    <div className="inline-block min-w-full">
                        {/* Date Headers */}
                        <div className="flex border-b border-gray-200 sticky top-0 bg-white z-10">
                            <div className="w-40 flex-shrink-0 border-r border-gray-200 p-2">
                                <div className="text-xs font-bold text-gray-700">Bookings</div>
                                <div className="text-xs text-gray-500">Iterations</div>
                            </div>
                            <div className="flex flex-1">
                                {dates.map((date, idx) => (
                                    <div key={idx} className="flex-1 min-w-[60px] border-r border-gray-200 p-2 text-center">
                                        <div className="text-xs font-bold text-gray-700">
                                            {date.toLocaleDateString('en-US', { weekday: 'short' }).toUpperCase()}
                                        </div>
                                        <div className="text-xs text-gray-500">
                                            {date.getDate()}
                                        </div>
                                        <div className="text-xs text-gray-500">
                                            {date.toLocaleDateString('en-US', { month: 'short' }).toUpperCase()}
                                        </div>
                                        {/* Booking count badge */}
                                        <div className="mt-1 inline-block px-2 py-0.5 bg-blue-600 text-white text-xs rounded-full">
                                            {Math.floor(Math.random() * 10)}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Room Rows */}
                        {roomTypes.map((roomType, rtIdx) => (
                            <div key={rtIdx}>
                                {/* Room Type Header */}
                                <div
                                    className="flex border-b border-gray-200 bg-gray-50 cursor-pointer hover:bg-gray-100"
                                    onClick={() => toggleRoomType(rtIdx)}
                                >
                                    <div className="w-40 flex-shrink-0 border-r border-gray-200 p-2 flex items-center gap-2">
                                        {roomType.expanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                                        <span className="text-sm font-bold text-gray-900">{roomType.name}</span>
                                        <span className="text-xs text-gray-500">{roomType.rooms.length}</span>
                                    </div>
                                    <div className="flex-1"></div>
                                </div>

                                {/* Room Rows */}
                                {roomType.expanded && roomType.rooms.map((room, roomIdx) => (
                                    <div key={roomIdx} className="flex border-b border-gray-100 hover:bg-blue-50/30 relative group">
                                        <div className="w-40 flex-shrink-0 border-r border-gray-200 p-2">
                                            <div className="text-sm font-semibold text-gray-900">{room}</div>
                                            <div className="flex items-center gap-1 text-xs text-gray-500">
                                                <span>15</span>
                                                <Calendar size={12} />
                                            </div>
                                        </div>
                                        <div className="flex-1 relative h-12">
                                            {/* Grid cells */}
                                            <div className="absolute inset-0 flex">
                                                {dates.map((_, idx) => (
                                                    <div key={idx} className="flex-1 min-w-[60px] border-r border-gray-100"></div>
                                                ))}
                                            </div>

                                            {/* Booking blocks */}
                                            {bookings
                                                .filter(b => b.roomNumber === room)
                                                .map(booking => {
                                                    const style = getBookingStyle(booking);
                                                    if (!style) return null;

                                                    return (
                                                        <div
                                                            key={booking.id}
                                                            className="absolute top-1 bottom-1 rounded px-2 py-1 text-white text-xs font-semibold shadow-md hover:shadow-lg transition-all cursor-pointer flex items-center"
                                                            style={{
                                                                left: style.left,
                                                                width: style.width,
                                                                backgroundColor: booking.color,
                                                            }}
                                                        >
                                                            <span className="truncate">{booking.guestName}</span>
                                                        </div>
                                                    );
                                                })}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default StayView;
