import { useState } from 'react';
import { Calendar, ChevronDown, ChevronRight, UserPlus } from 'lucide-react';

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
        { name: 'Standard Room', rooms: ['STD-101', 'STD-102', 'STD-103', 'STD-104'], expanded: true },
        { name: 'Deluxe Room', rooms: ['DEL-201', 'DEL-202', 'DEL-203'], expanded: true },
        { name: 'Double Deluxe Room', rooms: ['DDL-301', 'DDL-302'], expanded: false },
        { name: 'Super Deluxe Room', rooms: ['SDR-401', 'SDR-402'], expanded: true },
        { name: 'Presidential Suite', rooms: ['PRS-501', 'PRS-502'], expanded: true },
    ]);

    const [bookings] = useState<Booking[]>([
        { id: 1, guestName: 'Foysal Ahmed', roomNumber: 'STD-101', checkIn: '2025-04-05', checkOut: '2025-04-08', status: 'occupied', color: '#059669' },
        { id: 2, guestName: 'Sadik Hasan', roomNumber: 'STD-102', checkIn: '2025-04-06', checkOut: '2025-04-08', status: 'checkin', color: '#0891b2' },
        { id: 3, guestName: 'Afifa Mahir', roomNumber: 'STD-103', checkIn: '2025-04-11', checkOut: '2025-04-15', status: 'ota', color: '#dc2626' },
        { id: 4, guestName: 'Mohammad Jaki', roomNumber: 'STD-104', checkIn: '2025-04-17', checkOut: '2025-04-19', status: 'expected', color: '#f97316' },
        { id: 5, guestName: 'Afifa Mahir', roomNumber: 'DEL-201', checkIn: '2025-04-08', checkOut: '2025-04-10', status: 'vip', color: '#3b82f6' },
        { id: 6, guestName: 'Shahriar Hossain', roomNumber: 'DEL-202', checkIn: '2025-04-10', checkOut: '2025-04-14', status: 'ota', color: '#dc2626' },
        { id: 7, guestName: 'Rafiqul Islam', roomNumber: 'DEL-203', checkIn: '2025-04-07', checkOut: '2025-04-11', status: 'occupied', color: '#0891b2' },
        { id: 8, guestName: 'Saikat Huda', roomNumber: 'SDR-401', checkIn: '2025-04-17', checkOut: '2025-04-22', status: 'expected', color: '#f97316' },
        { id: 9, guestName: 'Hira John', roomNumber: 'PRS-501', checkIn: '2025-04-05', checkOut: '2025-04-09', status: 'vip', color: '#3b82f6' },
        { id: 10, guestName: 'Faysal Ahmed', roomNumber: 'PRS-502', checkIn: '2025-04-19', checkOut: '2025-04-22', status: 'expected', color: '#f97316' },
    ]);

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

    const statusIndicators = [
        { label: 'Occupied', count: 18, color: '#dc2626' },
        { label: 'Due In', count: 4, color: '#ec4899' },
        { label: 'VIP', count: 2, color: '#3b82f6' },
        { label: 'OTA', count: 6, color: '#6b7280' },
        { label: 'Clean', count: 12, color: '#059669' },
        { label: 'Dirty', count: 3, color: '#eab308' },
    ];

    return (
        <div className="p-3 max-w-full mx-auto space-y-2 font-sans select-none">
            {/* Header & Controls in One Compact Toolbar */}
            <div className="bg-white p-2 rounded-lg border border-gray-200/90 shadow-2xs flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                    <div className="w-6 h-6 bg-blue-600 rounded flex items-center justify-center text-white">
                        <Calendar size={13} />
                    </div>
                    <div>
                        <h1 className="text-xs font-bold text-gray-900 leading-none">STAY VIEW / TAPE CHART</h1>
                        <span className="text-[9px] text-gray-400 font-medium">Gantt Allocation Matrix</span>
                    </div>
                </div>

                {/* Date & Range Filter */}
                <div className="flex items-center gap-2 text-xs">
                    <div className="flex items-center gap-1">
                        <span className="text-[10px] text-gray-500 font-semibold">Start:</span>
                        <input
                            type="date"
                            value={fromDate}
                            onChange={(e) => setFromDate(e.target.value)}
                            className="px-2 py-0.5 text-xs border border-gray-200 rounded focus:outline-none focus:border-blue-500 bg-white"
                        />
                    </div>
                    <div className="flex items-center gap-1">
                        <span className="text-[10px] text-gray-500 font-semibold">View:</span>
                        <select
                            value={days}
                            onChange={(e) => setDays(Number(e.target.value))}
                            className="px-2 py-0.5 text-xs border border-gray-200 rounded focus:outline-none focus:border-blue-500 bg-white font-medium"
                        >
                            <option value={7}>7 Days</option>
                            <option value={14}>14 Days</option>
                            <option value={30}>30 Days</option>
                        </select>
                    </div>
                    <button className="h-6 px-2 bg-blue-600 text-white rounded text-[11px] font-semibold hover:bg-blue-700 transition-colors shadow-2xs flex items-center gap-1">
                        <UserPlus size={11} />
                        <span>Book Room</span>
                    </button>
                </div>

                {/* Status Badges */}
                <div className="hidden xl:flex items-center gap-1.5">
                    {statusIndicators.map((status, idx) => (
                        <div key={idx} className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-gray-50 border border-gray-200/70 text-[10px]">
                            <span className="w-2 h-2 rounded-full" style={{ backgroundColor: status.color }}></span>
                            <span className="text-gray-600 font-medium">{status.label}:</span>
                            <strong className="text-gray-900">{status.count}</strong>
                        </div>
                    ))}
                </div>
            </div>

            {/* High-Density Gantt Timeline Grid */}
            <div className="bg-white rounded-lg border border-gray-200/90 shadow-2xs overflow-hidden">
                <div className="overflow-x-auto">
                    <div className="inline-block min-w-full">
                        {/* Date Header Row */}
                        <div className="flex border-b border-gray-200 sticky top-0 bg-gray-50/90 backdrop-blur-xs z-10">
                            <div className="w-32 flex-shrink-0 border-r border-gray-200 px-2 py-1 flex items-center justify-between text-[10px] font-bold text-gray-600 uppercase">
                                <span>Room</span>
                                <span>Type</span>
                            </div>
                            <div className="flex flex-1">
                                {dates.map((date, idx) => {
                                    const isWeekend = date.getDay() === 5 || date.getDay() === 6;
                                    return (
                                        <div 
                                            key={idx} 
                                            className={`flex-1 min-w-[42px] border-r border-gray-200 py-1 text-center ${isWeekend ? 'bg-blue-50/40' : ''}`}
                                        >
                                            <div className="text-[9px] font-bold text-gray-500 uppercase leading-none">
                                                {date.toLocaleDateString('en-US', { weekday: 'narrow' })}
                                            </div>
                                            <div className="text-xs font-bold text-gray-900 leading-tight mt-0.5">
                                                {date.getDate()}
                                            </div>
                                            <div className="text-[8px] text-gray-400 uppercase leading-none">
                                                {date.toLocaleDateString('en-US', { month: 'short' })}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Room Categories & Rows */}
                        {roomTypes.map((roomType, rtIdx) => (
                            <div key={rtIdx}>
                                {/* Category Header */}
                                <div
                                    className="flex border-b border-gray-200 bg-gray-100/70 cursor-pointer hover:bg-gray-100 px-2 py-1 items-center gap-1.5 transition-colors"
                                    onClick={() => toggleRoomType(rtIdx)}
                                >
                                    <div className="text-gray-500">
                                        {roomType.expanded ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
                                    </div>
                                    <span className="text-[11px] font-bold text-gray-800">{roomType.name}</span>
                                    <span className="text-[9px] text-gray-400 font-semibold px-1 py-0.2 bg-white rounded border border-gray-200">
                                        {roomType.rooms.length} units
                                    </span>
                                </div>

                                {/* Room Rows */}
                                {roomType.expanded && roomType.rooms.map((room, roomIdx) => (
                                    <div key={roomIdx} className="flex border-b border-gray-100 hover:bg-gray-50/50 relative">
                                        <div className="w-32 flex-shrink-0 border-r border-gray-200 px-2 py-1.5 flex items-center justify-between text-xs">
                                            <span className="font-bold text-gray-900 text-[11px]">{room}</span>
                                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" title="Clean & Ready"></span>
                                        </div>
                                        <div className="flex-1 relative h-7">
                                            {/* Column Guides */}
                                            <div className="absolute inset-0 flex pointer-events-none">
                                                {dates.map((_, idx) => (
                                                    <div key={idx} className="flex-1 min-w-[42px] border-r border-gray-100/80"></div>
                                                ))}
                                            </div>

                                            {/* Booking Gantt Blocks */}
                                            {bookings
                                                .filter(b => b.roomNumber === room)
                                                .map(booking => {
                                                    const style = getBookingStyle(booking);
                                                    if (!style) return null;

                                                    return (
                                                        <div
                                                            key={booking.id}
                                                            className="absolute top-0.5 bottom-0.5 rounded px-1.5 text-white text-[10px] font-semibold shadow-2xs hover:shadow-xs transition-all cursor-pointer flex items-center overflow-hidden z-1"
                                                            style={{
                                                                left: style.left,
                                                                width: style.width,
                                                                backgroundColor: booking.color,
                                                            }}
                                                            title={`${booking.guestName} (${booking.checkIn} - ${booking.checkOut})`}
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
