import React, { useState, useEffect, useMemo } from 'react';
import {
    Calendar as CalendarIcon,
    ChevronDown,
    ChevronRight,
    ChevronLeft,
    Plus,
    Building2,
    BedDouble,
    X
} from 'lucide-react';
import QuickReservationModal from './modals/QuickReservationModal';
import AddReservationModal from './modals/AddReservationModal';

interface TimelineBooking {
    id: string;
    reservationNumber: string;
    guestName: string;
    roomNumber: string;
    startIndex: number;
    endIndex: number;
    status: 'arrived' | 'stayover' | 'confirmed' | 'hold' | 'due-out' | 'checked-out' | 'day-use' | 'out-of-order';
    vip?: boolean;
    indicator?: string;
}

export const StayView: React.FC = () => {
    // Current date state
    const [startDate, setStartDate] = useState<string>(() => {
        const d = new Date();
        return d.toISOString().split('T')[0];
    });
    const [daysWindow, setDaysWindow] = useState<number>(15);

    // Tree Expansion State
    const [expandedNodes, setExpandedNodes] = useState<Record<string, boolean>>({
        'b-1': true,
        'f-1': true,
        'f-2': true,
        'b-2': false
    });

    const toggleNode = (nodeId: string) => {
        setExpandedNodes(prev => ({ ...prev, [nodeId]: !prev[nodeId] }));
    };

    // Information Popover (Legend) State
    const [isInfoPopoverOpen, setIsInfoPopoverOpen] = useState(false);

    // Modals & Selection
    const [isAddReservationOpen, setIsAddReservationOpen] = useState(false);
    const [isQuickReservationOpen, setIsQuickReservationOpen] = useState(false);
    const [selectedRange, setSelectedRange] = useState<{
        room: string;
        startIndex: number;
        endIndex: number;
        rect?: DOMRect;
    } | null>(null);

    // Drag-to-select range state
    const [dragState, setDragState] = useState<{
        room: string;
        startIndex: number;
        endIndex: number;
        startRect?: DOMRect;
        endRect?: DOMRect;
    } | null>(null);

    // Generate days array based on startDate and daysWindow
    const days = useMemo(() => {
        const list = [];
        const base = new Date(startDate);
        const todayStr = new Date().toISOString().split('T')[0];

        for (let i = 0; i < daysWindow; i++) {
            const current = new Date(base);
            current.setDate(base.getDate() + i);
            const iso = current.toISOString().split('T')[0];
            const dayOfWeek = current.toLocaleDateString('en-US', { weekday: 'short' }).toUpperCase();
            const dayNum = current.getDate();
            const isWeekend = current.getDay() === 5 || current.getDay() === 6; // Friday or Saturday (BD standard)
            const isToday = iso === todayStr;

            list.push({
                index: i,
                date: iso,
                dayName: dayOfWeek,
                num: dayNum,
                isWeekend,
                isToday,
                monthShort: current.toLocaleDateString('en-US', { month: 'short' })
            });
        }
        return list;
    }, [startDate, daysWindow]);

    // Initial Rooms Structure
    const roomTree = useMemo(() => [
        {
            id: 'b-1',
            name: 'Building 1 (Main Tower)',
            floors: [
                {
                    id: 'f-1',
                    name: 'Floor 1 (Executive)',
                    rooms: [
                        { id: 'r-101', roomNumber: '101', type: 'Deluxe Double', floor: '1', building: 'Building 1', status: 'clean' },
                        { id: 'r-102', roomNumber: '102', type: 'Deluxe Double', floor: '1', building: 'Building 1', status: 'clean' },
                        { id: 'r-103', roomNumber: '103', type: 'Superior King', floor: '1', building: 'Building 1', status: 'inspected' },
                        { id: 'r-104', roomNumber: '104', type: 'Executive Suite', floor: '1', building: 'Building 1', status: 'clean' }
                    ]
                },
                {
                    id: 'f-2',
                    name: 'Floor 2 (Standard & Deluxe)',
                    rooms: [
                        { id: 'r-201', roomNumber: '201', type: 'Deluxe Double', floor: '2', building: 'Building 1', status: 'clean' },
                        { id: 'r-202', roomNumber: '202', type: 'Superior King', floor: '2', building: 'Building 1', status: 'dirty' },
                        { id: 'r-203', roomNumber: '203', type: 'Executive Suite', floor: '2', building: 'Building 1', status: 'clean' }
                    ]
                }
            ]
        },
        {
            id: 'b-2',
            name: 'Building 2 (Annex & Suites)',
            floors: [
                {
                    id: 'f-3',
                    name: 'Floor 5 (Presidential)',
                    rooms: [
                        { id: 'r-501', roomNumber: '501', type: 'Presidential Suite', floor: '5', building: 'Building 2', status: 'clean' },
                        { id: 'r-508', roomNumber: '508', type: 'Superior King', floor: '5', building: 'Building 2', status: 'clean' }
                    ]
                }
            ]
        }
    ], []);

    // Total rooms count across entire hotel
    const totalRoomsCount = useMemo(() => {
        return roomTree.reduce((acc, b) => acc + b.floors.reduce((facc, f) => facc + f.rooms.length, 0), 0);
    }, [roomTree]);

    // Seed bookings on the timeline
    const [bookings, setBookings] = useState<TimelineBooking[]>([
        { id: 'b1', reservationNumber: 'RES-109281', guestName: 'A. Rahman', roomNumber: '101', startIndex: 1, endIndex: 4, status: 'stayover', vip: true, indicator: '⭐' },
        { id: 'b2', reservationNumber: 'RES-109282', guestName: 'S. Chowdhury', roomNumber: '103', startIndex: 0, endIndex: 2, status: 'arrived', indicator: '👑' },
        { id: 'b3', reservationNumber: 'RES-109283', guestName: 'T. Hasan (Hold)', roomNumber: '104', startIndex: 3, endIndex: 6, status: 'hold', indicator: '$' },
        { id: 'b4', reservationNumber: 'RES-109284', guestName: 'F. Kabir', roomNumber: '201', startIndex: 5, endIndex: 8, status: 'confirmed', indicator: '👥' },
        { id: 'b5', reservationNumber: 'RES-109285', guestName: 'Dr. Jean Dupont', roomNumber: '203', startIndex: 2, endIndex: 5, status: 'stayover', vip: true, indicator: '⭐' }
    ]);

    // Today counts
    const todayAssignedCount = useMemo(() => {
        const todayIndex = days.findIndex(d => d.isToday);
        const targetIdx = todayIndex >= 0 ? todayIndex : 0;
        return bookings.filter(b => targetIdx >= b.startIndex && targetIdx <= b.endIndex).length;
    }, [bookings, days]);

    const todayAvailableCount = Math.max(0, totalRoomsCount - todayAssignedCount);

    // Handle Mouse Up to finish drag selection
    useEffect(() => {
        const handleMouseUp = () => {
            if (dragState) {
                const start = Math.min(dragState.startIndex, dragState.endIndex);
                const end = Math.max(dragState.startIndex, dragState.endIndex);

                let mergedRect = dragState.startRect;
                if (dragState.startRect && dragState.endRect) {
                    const left = Math.min(dragState.startRect.left, dragState.endRect.left);
                    const right = Math.max(dragState.startRect.right, dragState.endRect.right);
                    mergedRect = {
                        ...dragState.startRect,
                        left,
                        right,
                        width: right - left,
                        x: left
                    } as DOMRect;
                }

                setSelectedRange({
                    room: dragState.room,
                    startIndex: start,
                    endIndex: end,
                    rect: mergedRect || dragState.startRect
                });
                setDragState(null);
                // Directly launch the Quick Reservation Modal upon drag selection release
                setIsQuickReservationOpen(true);
            }
        };

        window.addEventListener('mouseup', handleMouseUp);
        return () => window.removeEventListener('mouseup', handleMouseUp);
    }, [dragState]);

    const handleDateJump = (direction: 'prev' | 'next' | 'today') => {
        if (direction === 'today') {
            setStartDate(new Date().toISOString().split('T')[0]);
            return;
        }
        const cur = new Date(startDate);
        const shift = direction === 'next' ? 7 : -7;
        cur.setDate(cur.getDate() + shift);
        setStartDate(cur.toISOString().split('T')[0]);
    };

    // Exact status colors matching hotel-management Legend
    const getStatusBadgeColor = (status: TimelineBooking['status']) => {
        switch (status) {
            case 'arrived': return 'bg-[#4d79ff] text-white';
            case 'stayover': return 'bg-[#668cff] text-white';
            case 'checked-out': return 'bg-[#2d8659] text-white';
            case 'due-out': return 'bg-[#ffb31a] text-white';
            case 'confirmed': return 'bg-[#00cc00] text-white';
            case 'hold': return 'bg-[#b366ff] text-white';
            case 'day-use': return 'bg-[#d9b326] text-white';
            case 'out-of-order': return 'bg-[#cc0000] text-white';
            default: return 'bg-[#4d79ff] text-white';
        }
    };

    return (
        <div className="p-2 space-y-1.5 max-w-full h-full flex flex-col overflow-hidden animate-in fade-in duration-150 select-none">
            {/* Header Controls Bar */}
            <div className="bg-white rounded-lg border border-gray-200/80 shadow-2xs px-2.5 py-1.5 flex items-center justify-between gap-2 flex-shrink-0">
                {/* Left Title */}
                <div className="flex items-center gap-2 min-w-0">
                    <div className="w-6 h-6 rounded bg-[#1e3a8a] text-white flex items-center justify-center shadow-2xs flex-shrink-0">
                        <CalendarIcon size={13} />
                    </div>
                    <div className="flex items-center gap-1.5 min-w-0">
                        <h1 className="text-xs font-bold text-gray-900 tracking-tight whitespace-nowrap">
                            Stay View
                        </h1>
                        <span className="hidden xl:inline-block px-1.5 py-0.5 text-[9px] font-bold rounded bg-blue-50 text-blue-700 border border-blue-200 whitespace-nowrap">
                            Interactive Timeline
                        </span>
                        <span className="px-1.5 py-0.5 text-[9px] font-bold rounded bg-emerald-50 text-emerald-700 border border-emerald-200 whitespace-nowrap">
                            Drag-to-Book
                        </span>
                    </div>
                </div>

                {/* Date Controls & Action Buttons */}
                <div className="flex items-center gap-1.5 flex-shrink-0">
                    {/* Navigation */}
                    <div className="flex items-center bg-gray-50 border border-gray-200 rounded p-0.5 text-xs h-7">
                        <button
                            type="button"
                            onClick={() => handleDateJump('prev')}
                            className="p-1 hover:bg-gray-200 rounded cursor-pointer text-gray-600"
                            title="Previous 7 Days"
                        >
                            <ChevronLeft size={13} />
                        </button>
                        <button
                            type="button"
                            onClick={() => handleDateJump('today')}
                            className="px-1.5 py-0.5 font-bold text-blue-700 hover:bg-white rounded cursor-pointer text-[10px]"
                        >
                            Today
                        </button>
                        <button
                            type="button"
                            onClick={() => handleDateJump('next')}
                            className="p-1 hover:bg-gray-200 rounded cursor-pointer text-gray-600"
                            title="Next 7 Days"
                        >
                            <ChevronRight size={13} />
                        </button>
                    </div>

                    {/* From Date & Days Window */}
                    <div className="flex items-center gap-1 bg-gray-50 border border-gray-200 rounded px-1.5 py-0.5 text-xs h-7">
                        <span className="text-gray-500 font-semibold text-[10px]">From:</span>
                        <input
                            type="date"
                            value={startDate}
                            onChange={e => setStartDate(e.target.value)}
                            className="bg-transparent font-medium outline-none text-gray-800 text-[10px] w-24 cursor-pointer"
                        />
                        <select
                            value={daysWindow}
                            onChange={e => setDaysWindow(Number(e.target.value))}
                            className="bg-white border border-gray-200 rounded px-1 py-0.5 font-semibold text-gray-700 outline-none text-[10px] cursor-pointer"
                        >
                            <option value={7}>7 Days</option>
                            <option value={15}>15 Days</option>
                            <option value={30}>30 Days</option>
                        </select>
                    </div>

                    {/* Status Indicators from hotel-management */}
                    <div className="flex items-center gap-1.5 border-l border-gray-200 pl-1.5">
                        {/* Information / Legend Button */}
                        <div className="relative">
                            <button
                                type="button"
                                onClick={() => setIsInfoPopoverOpen(!isInfoPopoverOpen)}
                                className="flex items-center gap-1 px-1.5 py-1 rounded hover:bg-gray-100 cursor-pointer text-gray-700 text-[10px] font-semibold h-7 transition-colors"
                                title="View Legend & Information"
                            >
                                <div className="w-4 h-4 rounded-full bg-[#3b82f6] text-white font-serif font-bold text-[10px] flex items-center justify-center">
                                    i
                                </div>
                                <span className="hidden sm:inline">Info</span>
                            </button>

                            {/* Complete 3-Part Legend Popover matching hotel-management */}
                            {isInfoPopoverOpen && (
                                <>
                                    <div className="fixed inset-0 z-40" onClick={() => setIsInfoPopoverOpen(false)}></div>
                                    <div
                                        onClick={e => e.stopPropagation()}
                                        className="absolute right-0 top-9 z-50 bg-white rounded-lg border border-[#e0e0e0] shadow-2xl p-4 w-[380px] sm:w-[420px] text-xs space-y-3 animate-in fade-in zoom-in-95 duration-150"
                                    >
                                        <div className="flex items-center justify-between border-b border-gray-100 pb-2">
                                            <h4 className="font-bold text-gray-900 text-xs uppercase tracking-wider">Stay View Legend</h4>
                                            <button
                                                type="button"
                                                onClick={() => setIsInfoPopoverOpen(false)}
                                                className="text-gray-400 hover:text-gray-600 p-0.5 rounded cursor-pointer"
                                            >
                                                <X size={15} />
                                            </button>
                                        </div>

                                        {/* Date Colors */}
                                        <div className="space-y-1.5">
                                            <div className="font-bold text-[#1e293b] text-[11px] uppercase tracking-wider">Date Colors</div>
                                            <div className="grid grid-cols-3 gap-2">
                                                <div className="flex items-center gap-2">
                                                    <div className="w-4 h-4 rounded-[3px] bg-[#ffb3b3] text-gray-800 text-[10px] font-bold flex items-center justify-center flex-shrink-0">
                                                        1
                                                    </div>
                                                    <span className="text-[11px] text-gray-700 font-medium">Weekend</span>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <div className="w-4 h-4 rounded-[3px] bg-[#cce5ff] text-[#333] text-[10px] font-bold flex items-center justify-center flex-shrink-0">
                                                        2
                                                    </div>
                                                    <span className="text-[11px] text-gray-700 font-medium">Today</span>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <div className="w-4 h-4 rounded-[3px] bg-[#00ccb3] text-white text-[10px] font-bold flex items-center justify-center flex-shrink-0">
                                                        3
                                                    </div>
                                                    <span className="text-[11px] text-gray-700 font-medium">Today &amp; Weekend</span>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="h-px bg-gray-100"></div>

                                        {/* Booking Status - All 8 Colors */}
                                        <div className="space-y-1.5">
                                            <div className="font-bold text-[#1e293b] text-[11px] uppercase tracking-wider">Booking Status</div>
                                            <div className="grid grid-cols-2 gap-x-3 gap-y-1.5 text-[11px]">
                                                <div className="flex items-center gap-2">
                                                    <div className="w-3.5 h-3.5 rounded-[3px] bg-[#4d79ff] flex-shrink-0"></div>
                                                    <span className="text-gray-700">Arrived</span>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <div className="w-3.5 h-3.5 rounded-[3px] bg-[#668cff] flex-shrink-0"></div>
                                                    <span className="text-gray-700">Stayover</span>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <div className="w-3.5 h-3.5 rounded-[3px] bg-[#2d8659] flex-shrink-0"></div>
                                                    <span className="text-gray-700">Checked Out</span>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <div className="w-3.5 h-3.5 rounded-[3px] bg-[#ffb31a] flex-shrink-0"></div>
                                                    <span className="text-gray-700">Due Out</span>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <div className="w-3.5 h-3.5 rounded-[3px] bg-[#00cc00] flex-shrink-0"></div>
                                                    <span className="text-gray-700">Confirmed Reservation</span>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <div className="w-3.5 h-3.5 rounded-[3px] bg-[#b366ff] flex-shrink-0"></div>
                                                    <span className="text-gray-700">Temporary Reserve</span>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <div className="w-3.5 h-3.5 rounded-[3px] bg-[#cc0000] flex-shrink-0"></div>
                                                    <span className="text-gray-700">Out of Order / Service</span>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <div className="w-3.5 h-3.5 rounded-[3px] bg-[#d9b326] flex-shrink-0"></div>
                                                    <span className="text-gray-700">Dayuse Reservation</span>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="h-px bg-gray-100"></div>

                                        {/* Booking Indicators - All 6 Indicators */}
                                        <div className="space-y-1.5">
                                            <div className="font-bold text-[#1e293b] text-[11px] uppercase tracking-wider">Booking Indicators</div>
                                            <div className="grid grid-cols-2 gap-x-3 gap-y-1.5 text-[11px]">
                                                <div className="flex items-center gap-2">
                                                    <span className="text-sm">👑</span>
                                                    <span className="text-gray-700">Master Guest</span>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <span className="text-sm">👥</span>
                                                    <span className="text-gray-700">Group Booking</span>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <span className="text-sm font-bold text-[#cc0000]">$</span>
                                                    <span className="text-gray-700">Payment Pending</span>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <span className="text-sm">⚠️</span>
                                                    <span className="text-gray-700">Stop Room Move</span>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <span className="text-sm">⭐</span>
                                                    <span className="text-gray-700">VIP Guest</span>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <span className="text-sm font-bold text-[#00cccc]">⑂</span>
                                                    <span className="text-gray-700">Split Reservation</span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </>
                            )}
                        </div>

                        {/* Available Badge */}
                        <div className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-emerald-50 border border-emerald-200 text-emerald-800 text-[10px] font-bold h-7" title="Today Available Rooms">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                            <span>{todayAvailableCount}</span>
                            <span className="hidden md:inline font-medium text-emerald-600">Avail</span>
                        </div>

                        {/* Assigned Badge */}
                        <div className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-amber-50 border border-amber-200 text-amber-800 text-[10px] font-bold h-7" title="Today Assigned Rooms">
                            <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
                            <span>{todayAssignedCount}</span>
                            <span className="hidden md:inline font-medium text-amber-600">Assigned</span>
                        </div>

                        {/* Unassigned Badge */}
                        <div className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-cyan-50 border border-cyan-200 text-cyan-800 text-[10px] font-bold h-7" title="Unassigned Bookings">
                            <span className="w-1.5 h-1.5 rounded-full bg-cyan-500"></span>
                            <span>0</span>
                            <span className="hidden lg:inline font-medium text-cyan-600">Unassigned</span>
                        </div>
                    </div>

                    {/* Action Button */}
                    <button
                        type="button"
                        onClick={() => setIsAddReservationOpen(true)}
                        className="h-7 px-2.5 bg-[#1e3a8a] hover:bg-blue-900 text-white rounded text-[11px] font-semibold shadow-2xs flex items-center gap-1 cursor-pointer transition-colors whitespace-nowrap ml-1"
                    >
                        <Plus size={13} />
                        <span>Add Reservation</span>
                    </button>
                </div>
            </div>

            {/* Stay View Interactive Timeline Board */}
            <div className="bg-white rounded-lg border border-gray-200/80 shadow-2xs overflow-hidden text-xs flex-1 min-h-0 flex flex-col">
                <div className="overflow-auto flex-1 min-h-0 relative select-none">
                    <div className="w-full min-w-full">
                        {/* Header Row: Room Info Column + Date Columns */}
                        <div className="flex border-b border-gray-200 bg-gray-50/95 font-bold sticky top-0 z-30 shadow-xs">
                            {/* Room Info Header */}
                            <div className="w-44 px-2 py-1 border-r border-gray-200 flex items-center justify-between text-gray-700 text-[11px] sticky left-0 z-40 bg-gray-100 flex-shrink-0">
                                <span>Rooms &amp; Types</span>
                                <span className="text-[9px] text-gray-400 font-mono">Tree</span>
                            </div>

                            {/* Date Columns with exact Legend Colors */}
                            <div className="flex-1 grid" style={{ gridTemplateColumns: `repeat(${days.length}, minmax(${daysWindow === 30 ? '28px' : daysWindow === 15 ? '32px' : '44px'}, 1fr))` }}>
                                {days.map(d => {
                                    const isTodayAndWeekend = d.isToday && d.isWeekend;
                                    const headerBg = isTodayAndWeekend
                                        ? 'bg-[#00ccb3] text-white'
                                        : d.isToday
                                        ? 'bg-[#cce5ff] text-[#1e3a8a] border-b-2 border-b-blue-600'
                                        : d.isWeekend
                                        ? 'bg-[#ffb3b3] text-rose-950'
                                        : 'bg-gray-50/80 text-gray-700';

                                    const dayNameColor = isTodayAndWeekend
                                        ? 'text-white/90'
                                        : d.isWeekend
                                        ? 'text-rose-700 font-bold'
                                        : 'text-gray-500 font-semibold';

                                    const numColor = isTodayAndWeekend
                                        ? 'text-white'
                                        : d.isToday
                                        ? 'text-[#1e3a8a]'
                                        : d.isWeekend
                                        ? 'text-rose-950'
                                        : 'text-gray-900';

                                    return (
                                        <div
                                            key={d.index}
                                            className={`py-1 px-0.5 border-r border-gray-200 text-center flex flex-col items-center justify-center transition-colors ${headerBg}`}
                                        >
                                            <span className={`text-[9px] uppercase tracking-tight leading-none ${dayNameColor}`}>
                                                {d.dayName}
                                            </span>
                                            <span className={`text-[11px] font-black my-0.5 leading-none ${numColor}`}>
                                                {d.num}
                                            </span>
                                            <span className="text-[8px] opacity-75 font-medium leading-none">
                                                {d.monthShort}
                                            </span>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Hierarchical Room Tree and Timeline Rows */}
                        <div className="divide-y divide-gray-100">
                            {roomTree.map(building => (
                                <div key={building.id}>
                                    {/* Building Header Row */}
                                    <div
                                        onClick={() => toggleNode(building.id)}
                                        className="flex items-center bg-gray-100/90 px-2 py-1 border-b border-gray-200 font-bold text-gray-800 cursor-pointer hover:bg-gray-200/70 transition-colors"
                                    >
                                        <div className="flex items-center gap-1.5 w-44 sticky left-0 z-20 bg-gray-100/90 flex-shrink-0">
                                            {expandedNodes[building.id] ? <ChevronDown size={13} /> : <ChevronRight size={13} />}
                                            <Building2 size={12} className="text-blue-700 flex-shrink-0" />
                                            <span className="text-[11px] truncate">{building.name}</span>
                                        </div>
                                    </div>

                                    {/* Floors and Rooms */}
                                    {expandedNodes[building.id] && building.floors.map(floor => (
                                        <div key={floor.id}>
                                            {/* Floor Header Row */}
                                            <div
                                                onClick={() => toggleNode(floor.id)}
                                                className="flex items-center bg-gray-50/90 pl-4 pr-2 py-0.5 border-b border-gray-100 text-[10px] font-semibold text-gray-600 cursor-pointer hover:bg-gray-100 transition-colors"
                                            >
                                                <div className="flex items-center gap-1.5 w-44 sticky left-0 z-20 bg-gray-50/90 flex-shrink-0">
                                                    {expandedNodes[floor.id] ? <ChevronDown size={11} /> : <ChevronRight size={11} />}
                                                    <span className="truncate">{floor.name}</span>
                                                    <span className="text-[9px] text-gray-400 font-mono">({floor.rooms.length})</span>
                                                </div>
                                            </div>

                                            {/* Physical Room Timeline Rows */}
                                            {expandedNodes[floor.id] && floor.rooms.map(room => (
                                                <div
                                                    key={room.id}
                                                    className="flex items-stretch hover:bg-blue-50/20 transition-colors group relative"
                                                >
                                                    {/* Room Identifier */}
                                                    <div className="w-44 pl-3 pr-2 py-0.5 border-r border-gray-200 flex items-center justify-between bg-white sticky left-0 z-20 shadow-2xs flex-shrink-0">
                                                        <div className="flex items-center gap-1.5 min-w-0">
                                                            <span className="font-mono font-bold text-[10px] text-blue-800 bg-blue-50 px-1.5 py-0.5 rounded border border-blue-100 flex-shrink-0">
                                                                {room.roomNumber}
                                                            </span>
                                                            <div className="text-[10px] font-medium text-gray-800 truncate" title={room.type}>
                                                                {room.type}
                                                            </div>
                                                        </div>
                                                        <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${room.status === 'clean' ? 'bg-emerald-500' : room.status === 'inspected' ? 'bg-blue-500' : 'bg-amber-500'}`} title={`Status: ${room.status}`}></span>
                                                    </div>

                                                    {/* Timeline Day Grid for this Room */}
                                                    <div
                                                        className="flex-1 grid relative"
                                                        style={{ gridTemplateColumns: `repeat(${days.length}, minmax(${daysWindow === 30 ? '28px' : daysWindow === 15 ? '32px' : '44px'}, 1fr))` }}
                                                    >
                                                        {days.map(d => {
                                                            const isCellOccupied = bookings.some(
                                                                b => b.roomNumber === room.roomNumber && d.index >= b.startIndex && d.index <= b.endIndex
                                                            );
                                                            const isDraggingThis = dragState && dragState.room === room.roomNumber &&
                                                                d.index >= Math.min(dragState.startIndex, dragState.endIndex) &&
                                                                d.index <= Math.max(dragState.startIndex, dragState.endIndex);
                                                            const isSelectedRange = selectedRange && selectedRange.room === room.roomNumber &&
                                                                d.index >= selectedRange.startIndex && d.index <= selectedRange.endIndex;

                                                            return (
                                                                <div
                                                                    key={d.index}
                                                                    onMouseDown={(e) => {
                                                                        if (e.button === 0 && !isCellOccupied) {
                                                                            e.preventDefault();
                                                                            const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
                                                                            setDragState({
                                                                                room: room.roomNumber,
                                                                                startIndex: d.index,
                                                                                endIndex: d.index,
                                                                                startRect: rect,
                                                                                endRect: rect
                                                                            });
                                                                        }
                                                                    }}
                                                                    onMouseEnter={() => {
                                                                        if (dragState && dragState.room === room.roomNumber && !isCellOccupied) {
                                                                            setDragState(prev => prev ? { ...prev, endIndex: d.index } : null);
                                                                        }
                                                                    }}
                                                                    className={`border-r border-gray-100 min-h-[30px] h-[30px] transition-colors relative cursor-crosshair ${
                                                                        isDraggingThis
                                                                            ? 'bg-blue-300/70 ring-2 ring-blue-500/60'
                                                                            : isSelectedRange
                                                                            ? 'bg-blue-100/90 border-y-2 border-blue-500'
                                                                            : d.isWeekend
                                                                            ? 'bg-rose-50/30'
                                                                            : 'bg-transparent hover:bg-gray-100/50'
                                                                    }`}
                                                                ></div>
                                                            );
                                                        })}

                                                        {/* Render Bookings Spanning Columns */}
                                                        {bookings
                                                            .filter(b => b.roomNumber === room.roomNumber)
                                                            .map(booking => {
                                                                const leftCol = Math.max(0, booking.startIndex);
                                                                const span = Math.max(1, booking.endIndex - booking.startIndex + 1);

                                                                return (
                                                                    <div
                                                                        key={booking.id}
                                                                        style={{
                                                                            left: `${(leftCol / days.length) * 100}%`,
                                                                            width: `${(span / days.length) * 100}%`
                                                                        }}
                                                                        className={`absolute top-0.5 bottom-0.5 mx-0.5 rounded px-1.5 flex items-center justify-between font-semibold shadow-2xs z-10 cursor-pointer hover:brightness-105 transition-all text-[10px] ${getStatusBadgeColor(booking.status)}`}
                                                                        title={`${booking.guestName} (${booking.reservationNumber}) - ${booking.status}`}
                                                                    >
                                                                        <div className="flex items-center gap-1 truncate min-w-0">
                                                                            {booking.indicator && (
                                                                                <span className="text-[10px]" title={`Indicator: ${booking.indicator}`}>
                                                                                    {booking.indicator}
                                                                                </span>
                                                                            )}
                                                                            {booking.vip && !booking.indicator && (
                                                                                <span className="bg-amber-400 text-amber-950 px-0.5 rounded text-[8px] font-bold">
                                                                                    VIP
                                                                                </span>
                                                                            )}
                                                                            <span className="truncate">{booking.guestName}</span>
                                                                        </div>
                                                                        <span className="text-[9px] opacity-80 font-mono hidden xl:inline ml-1 flex-shrink-0">
                                                                            {booking.reservationNumber}
                                                                        </span>
                                                                    </div>
                                                                );
                                                            })}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    ))}
                                </div>
                            ))}
                        </div>

                        {/* Grid Footer: Occupancy (%) & Available from hotel-management */}
                        <div className="flex bg-[#1e3a8a] text-white border-t-2 border-[#1e3a8a] font-semibold sticky bottom-0 z-30 shadow-md">
                            {/* Left Label */}
                            <div className="w-44 px-2 py-0.5 border-r border-[#3b82f6] flex flex-col justify-center flex-shrink-0 sticky left-0 z-40 bg-[#1e3a8a]">
                                <span className="text-[10px] font-bold text-white tracking-wide leading-tight">Occupancy (%)</span>
                                <span className="text-[9px] text-blue-200 font-medium leading-tight">Available</span>
                            </div>

                            {/* Day Cells */}
                            <div className="flex-1 grid" style={{ gridTemplateColumns: `repeat(${days.length}, minmax(${daysWindow === 30 ? '28px' : daysWindow === 15 ? '32px' : '44px'}, 1fr))` }}>
                                {days.map(d => {
                                    const occupiedCount = bookings.filter(b => d.index >= b.startIndex && d.index <= b.endIndex).length;
                                    const availableCount = Math.max(0, totalRoomsCount - occupiedCount);
                                    const occupancyPct = totalRoomsCount > 0 ? Math.round((occupiedCount / totalRoomsCount) * 100) : 0;

                                    return (
                                        <div
                                            key={d.index}
                                            className="py-0.5 px-0.5 border-r border-[#3b82f6]/50 text-center flex flex-col items-center justify-center"
                                        >
                                            <span className="font-bold text-white text-[10px] leading-tight">
                                                {occupancyPct}%
                                            </span>
                                            <span className="text-[9px] text-blue-200 font-medium leading-tight">
                                                [{availableCount}]
                                            </span>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Selection Floating Popover (Only when quick reservation is not already open) */}
            {!isQuickReservationOpen && selectedRange && selectedRange.rect && (
                <>
                    <div
                        className="fixed inset-0 z-30"
                        onClick={() => setSelectedRange(null)}
                    ></div>
                    <div
                        className="fixed z-40 bg-white rounded-lg border border-[#e2e8f0] shadow-2xl w-[280px] overflow-hidden animate-in fade-in zoom-in-95 duration-100"
                        style={{
                            top: `${Math.min(window.innerHeight - 220, Math.max(10, selectedRange.rect.bottom + 10))}px`,
                            left: `${Math.min(window.innerWidth - 300, Math.max(10, selectedRange.rect.left + (selectedRange.rect.width / 2) - 140))}px`
                        }}
                    >
                        {/* Popover Header */}
                        <div className="flex items-center justify-between px-3.5 py-2 border-b border-[#f1f5f9] bg-white">
                            <h4 className="font-semibold text-[#0f172a] text-xs m-0">New Booking Selection</h4>
                            <button
                                type="button"
                                onClick={() => setSelectedRange(null)}
                                className="text-[#64748b] hover:bg-[#f1f5f9] p-1 rounded cursor-pointer transition-colors"
                                title="Close"
                            >
                                <X size={14} />
                            </button>
                        </div>

                        {/* Popover Body */}
                        <div className="p-3 flex flex-col gap-2 text-xs">
                            <div className="flex items-center gap-2 text-[#475569]">
                                <BedDouble size={14} className="text-[#3b82f6] flex-shrink-0" />
                                <span>Room: <strong className="text-gray-900 font-mono font-bold">{selectedRange.room}</strong></span>
                            </div>

                            <div className="flex items-center gap-2 text-[#475569]">
                                <CalendarIcon size={14} className="text-[#3b82f6] flex-shrink-0" />
                                <span>
                                    Dates: {days[selectedRange.startIndex]?.monthShort} {days[selectedRange.startIndex]?.num} - {days[selectedRange.endIndex]?.monthShort} {days[selectedRange.endIndex]?.num}
                                </span>
                            </div>

                            <div className="pl-5 text-[#475569]">
                                <strong>Duration:</strong> {selectedRange.endIndex - selectedRange.startIndex + 1} night(s)
                            </div>

                            {/* Popover Actions */}
                            <div className="flex items-center gap-1.5 pt-2 border-t border-[#f1f5f9]">
                                <button
                                    type="button"
                                    onClick={() => {
                                        setIsQuickReservationOpen(true);
                                    }}
                                    className="flex-1 py-1 px-2 bg-[#2643a6] hover:bg-[#1e3687] text-white rounded text-[11px] font-semibold cursor-pointer shadow-xs transition-colors text-center"
                                >
                                    Quick Reservation
                                </button>
                                <button
                                    type="button"
                                    onClick={() => {
                                        setIsAddReservationOpen(true);
                                    }}
                                    className="py-1 px-2 bg-white border border-[#cbd5e1] hover:bg-[#f8fafc] text-[#3b82f6] rounded text-[11px] font-medium cursor-pointer transition-colors"
                                    title="Open Full Wizard"
                                >
                                    Wizard
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setSelectedRange(null)}
                                    className="py-1 px-2 bg-white border border-[#cbd5e1] hover:bg-[#f8fafc] text-[#64748b] rounded text-[11px] font-medium cursor-pointer transition-colors"
                                >
                                    Cancel
                                </button>
                            </div>
                        </div>
                    </div>
                </>
            )}

            {/* Quick Reservation Modal */}
            <QuickReservationModal
                isOpen={isQuickReservationOpen}
                onClose={() => {
                    setIsQuickReservationOpen(false);
                    setSelectedRange(null);
                }}
                roomInfo={(() => {
                    const startIso = selectedRange ? days[selectedRange.startIndex]?.date : startDate;
                    const stayNights = selectedRange ? (selectedRange.endIndex - selectedRange.startIndex + 1) : 1;
                    const endD = new Date(startIso);
                    endD.setDate(endD.getDate() + stayNights);
                    const endIso = endD.toISOString().split('T')[0];

                    return {
                        room: selectedRange?.room || '101',
                        startDate: startIso,
                        endDate: endIso,
                        nights: stayNights,
                        startIndex: selectedRange?.startIndex,
                        endIndex: selectedRange?.endIndex
                    };
                })()}
                onReserve={(newBooking) => {
                    setBookings(prev => [
                        ...prev,
                        {
                            id: `b-${Date.now()}`,
                            reservationNumber: `RES-${Date.now().toString().slice(-6)}`,
                            guestName: newBooking.guestName,
                            roomNumber: newBooking.room,
                            startIndex: newBooking.startIndex,
                            endIndex: newBooking.endIndex,
                            status: newBooking.status as any
                        }
                    ]);
                    setIsQuickReservationOpen(false);
                    setSelectedRange(null);
                }}
            />

            {/* Add Full Reservation Modal */}
            <AddReservationModal
                isOpen={isAddReservationOpen}
                onClose={() => {
                    setIsAddReservationOpen(false);
                    setSelectedRange(null);
                }}
                initialRoom={selectedRange?.room || '101'}
                initialStartDate={selectedRange ? days[selectedRange.startIndex]?.date : startDate}
                initialEndDate={selectedRange ? days[selectedRange.endIndex]?.date : undefined}
                onReservationCreated={(res) => {
                    const startIdx = selectedRange?.startIndex || 0;
                    const endIdx = selectedRange?.endIndex || Math.min(days.length - 1, startIdx + (res.nights || 2) - 1);
                    setBookings(prev => [
                        ...prev,
                        {
                            id: `b-${Date.now()}`,
                            reservationNumber: res.reservationNumber,
                            guestName: res.guestName,
                            roomNumber: res.roomNumber,
                            startIndex: startIdx,
                            endIndex: endIdx,
                            status: res.status === 'in-house' ? 'arrived' : res.status === 'hold' ? 'hold' : 'confirmed',
                            vip: res.vip && res.vip !== 'None'
                        }
                    ]);
                    setIsAddReservationOpen(false);
                    setSelectedRange(null);
                }}
            />
        </div>
    );
};

export default StayView;
