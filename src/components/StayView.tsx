import React, { useState, useEffect } from 'react';
import {
    Calendar as CalendarIcon,
    ChevronDown,
    ChevronRight,
    ChevronLeft,
    Plus,
    Info,
    Building2,
    X
} from 'lucide-react';
import QuickReservationModal from './modals/QuickReservationModal';
import AddReservationModal from './modals/AddReservationModal';

interface TimelineBooking {
    id: string;
    reservationNumber: string;
    guestName: string;
    roomNumber: string;
    startIndex: number; // Index in the active days array
    endIndex: number;
    status: 'arrived' | 'stayover' | 'confirmed' | 'hold' | 'due-out' | 'checked-out' | 'day-use';
    vip?: boolean;
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

    // Information Popover State
    const [isInfoPopoverOpen, setIsInfoPopoverOpen] = useState(false);

    // Modals
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
    const days = React.useMemo(() => {
        const list = [];
        const base = new Date(startDate);
        const todayStr = new Date().toISOString().split('T')[0];

        for (let i = 0; i < daysWindow; i++) {
            const current = new Date(base);
            current.setDate(base.getDate() + i);
            const iso = current.toISOString().split('T')[0];
            const dayOfWeek = current.toLocaleDateString('en-US', { weekday: 'short' }).toUpperCase();
            const dayNum = current.getDate();
            const isWeekend = current.getDay() === 5 || current.getDay() === 6; // Fri or Sat in BD
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
    const roomTree = [
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
    ];

    // Seed bookings on the timeline
    const [bookings, setBookings] = useState<TimelineBooking[]>([
        { id: 'b1', reservationNumber: 'RES-109281', guestName: 'A. Rahman', roomNumber: '101', startIndex: 1, endIndex: 4, status: 'stayover', vip: true },
        { id: 'b2', reservationNumber: 'RES-109282', guestName: 'S. Chowdhury', roomNumber: '103', startIndex: 0, endIndex: 2, status: 'arrived' },
        { id: 'b3', reservationNumber: 'RES-109283', guestName: 'T. Hasan (Hold)', roomNumber: '104', startIndex: 3, endIndex: 6, status: 'hold' },
        { id: 'b4', reservationNumber: 'RES-109284', guestName: 'F. Kabir', roomNumber: '201', startIndex: 5, endIndex: 8, status: 'confirmed' },
        { id: 'b5', reservationNumber: 'RES-109285', guestName: 'Dr. Jean Dupont', roomNumber: '203', startIndex: 2, endIndex: 5, status: 'stayover', vip: true }
    ]);

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

    const getStatusBadgeColor = (status: TimelineBooking['status']) => {
        switch (status) {
            case 'arrived': return 'bg-blue-600 text-white';
            case 'stayover': return 'bg-indigo-600 text-white';
            case 'confirmed': return 'bg-emerald-600 text-white';
            case 'hold': return 'bg-purple-600 text-white';
            case 'due-out': return 'bg-amber-600 text-white';
            case 'checked-out': return 'bg-gray-600 text-white';
            case 'day-use': return 'bg-teal-600 text-white';
            default: return 'bg-blue-500 text-white';
        }
    };

    return (
        <div className="p-4 md:p-6 max-w-full space-y-4 animate-in fade-in duration-150 select-none">
            {/* Header Controls Bar */}
            <div className="bg-white rounded-2xl border border-gray-200/90 shadow-2xs p-4 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-700 to-indigo-800 text-white flex items-center justify-center shadow-md flex-shrink-0">
                        <CalendarIcon size={20} />
                    </div>
                    <div>
                        <div className="flex items-center gap-2">
                            <h1 className="text-base md:text-lg font-bold text-gray-900 tracking-tight">
                                Stay View (Interactive Front Office Timeline)
                            </h1>
                            <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-blue-50 text-blue-700 border border-blue-200">
                                Drag-to-Book
                            </span>
                        </div>
                        <p className="text-xs text-gray-500 mt-0.5">
                            Visual 24/7 tape chart for room occupancy, stayover tracking, hold reservations, and drag-and-drop bookings.
                        </p>
                    </div>
                </div>

                {/* Date Controls & Action Buttons */}
                <div className="flex flex-wrap items-center gap-2.5">
                    <div className="flex items-center bg-gray-50 border border-gray-200 rounded-lg p-1 text-xs">
                        <button
                            type="button"
                            onClick={() => handleDateJump('prev')}
                            className="p-1 hover:bg-gray-200 rounded cursor-pointer"
                            title="Previous 7 Days"
                        >
                            <ChevronLeft size={16} />
                        </button>
                        <button
                            type="button"
                            onClick={() => handleDateJump('today')}
                            className="px-2.5 py-0.5 font-bold text-blue-700 hover:bg-white rounded cursor-pointer"
                        >
                            Today
                        </button>
                        <button
                            type="button"
                            onClick={() => handleDateJump('next')}
                            className="p-1 hover:bg-gray-200 rounded cursor-pointer"
                            title="Next 7 Days"
                        >
                            <ChevronRight size={16} />
                        </button>
                    </div>

                    <div className="flex items-center gap-1.5 bg-gray-50 border border-gray-200 rounded-lg px-2.5 py-1 text-xs">
                        <span className="text-gray-500 font-semibold">From:</span>
                        <input
                            type="date"
                            value={startDate}
                            onChange={e => setStartDate(e.target.value)}
                            className="bg-transparent font-medium outline-none text-gray-800"
                        />
                        <select
                            value={daysWindow}
                            onChange={e => setDaysWindow(Number(e.target.value))}
                            className="bg-white border border-gray-200 rounded px-1.5 py-0.5 font-semibold text-gray-700 outline-none"
                        >
                            <option value={7}>7 Days</option>
                            <option value={15}>15 Days</option>
                            <option value={30}>30 Days</option>
                        </select>
                    </div>

                    {/* Information / Legend Button */}
                    <div className="relative">
                        <button
                            type="button"
                            onClick={() => setIsInfoPopoverOpen(!isInfoPopoverOpen)}
                            className="h-8 px-2.5 bg-white border border-gray-200 hover:bg-gray-50 rounded-lg text-xs font-semibold text-gray-700 flex items-center gap-1.5 shadow-2xs cursor-pointer"
                        >
                            <Info size={14} className="text-blue-600" />
                            <span>Legend</span>
                        </button>

                        {/* Legend Popover */}
                        {isInfoPopoverOpen && (
                            <>
                                <div className="fixed inset-0 z-40" onClick={() => setIsInfoPopoverOpen(false)}></div>
                                <div className="absolute right-0 top-10 z-50 bg-white rounded-xl border border-gray-200 shadow-xl p-3.5 w-72 text-xs space-y-3">
                                    <div>
                                        <h4 className="font-bold text-gray-900 border-b border-gray-100 pb-1 text-[11px] uppercase tracking-wider">
                                            Date Header Colors
                                        </h4>
                                        <div className="grid grid-cols-2 gap-2 mt-2 text-[11px]">
                                            <div className="flex items-center gap-1.5">
                                                <div className="w-4 h-4 rounded bg-rose-100 border border-rose-300"></div>
                                                <span>Weekend</span>
                                            </div>
                                            <div className="flex items-center gap-1.5">
                                                <div className="w-4 h-4 rounded bg-blue-100 border border-blue-400"></div>
                                                <span>Today</span>
                                            </div>
                                        </div>
                                    </div>

                                    <div>
                                        <h4 className="font-bold text-gray-900 border-b border-gray-100 pb-1 text-[11px] uppercase tracking-wider">
                                            Booking Statuses
                                        </h4>
                                        <div className="grid grid-cols-2 gap-1.5 mt-2 text-[10.5px]">
                                            <div className="flex items-center gap-1.5">
                                                <div className="w-3 h-3 rounded bg-blue-600"></div>
                                                <span>Arrived</span>
                                            </div>
                                            <div className="flex items-center gap-1.5">
                                                <div className="w-3 h-3 rounded bg-indigo-600"></div>
                                                <span>Stayover</span>
                                            </div>
                                            <div className="flex items-center gap-1.5">
                                                <div className="w-3 h-3 rounded bg-emerald-600"></div>
                                                <span>Confirmed</span>
                                            </div>
                                            <div className="flex items-center gap-1.5">
                                                <div className="w-3 h-3 rounded bg-purple-600"></div>
                                                <span>Temporary Hold</span>
                                            </div>
                                            <div className="flex items-center gap-1.5">
                                                <div className="w-3 h-3 rounded bg-amber-600"></div>
                                                <span>Due Out</span>
                                            </div>
                                            <div className="flex items-center gap-1.5">
                                                <div className="w-3 h-3 rounded bg-gray-600"></div>
                                                <span>Checked Out</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </>
                        )}
                    </div>

                    {/* Action Buttons */}
                    <button
                        type="button"
                        onClick={() => setIsAddReservationOpen(true)}
                        className="h-8 px-3.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold shadow-2xs flex items-center gap-1.5 cursor-pointer"
                    >
                        <Plus size={14} />
                        <span>+ Add Reservation</span>
                    </button>
                </div>
            </div>

            {/* Stay View Interactive Timeline Board */}
            <div className="bg-white rounded-2xl border border-gray-200 shadow-2xs overflow-hidden text-xs">
                <div className="overflow-x-auto no-scrollbar">
                    <div className="min-w-[1100px]">
                        {/* Header Row: Room Info Column + Date Columns */}
                        <div className="flex border-b border-gray-200 bg-gray-50/90 font-bold sticky top-0 z-20">
                            {/* Room Info Header */}
                            <div className="w-64 p-3 border-r border-gray-200 flex items-center justify-between text-gray-700">
                                <span>Rooms & Categories</span>
                                <span className="text-[10px] text-gray-400 font-mono">Tree View</span>
                            </div>

                            {/* Date Columns */}
                            <div className="flex-1 grid" style={{ gridTemplateColumns: `repeat(${days.length}, minmax(48px, 1fr))` }}>
                                {days.map(d => (
                                    <div
                                        key={d.index}
                                        className={`p-2 border-r border-gray-200 text-center flex flex-col items-center justify-center transition-colors ${d.isToday ? 'bg-blue-100/70 border-b-2 border-b-blue-600' : d.isWeekend ? 'bg-rose-50/70' : 'bg-gray-50/50'}`}
                                    >
                                        <span className={`text-[10px] font-bold ${d.isWeekend ? 'text-rose-600' : 'text-gray-500'}`}>
                                            {d.dayName}
                                        </span>
                                        <span className={`text-xs font-extrabold mt-0.5 ${d.isToday ? 'text-blue-800' : 'text-gray-900'}`}>
                                            {d.num}
                                        </span>
                                        <span className="text-[9px] text-gray-400 font-medium">
                                            {d.monthShort}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Hierarchical Room Tree and Timeline Rows */}
                        <div className="divide-y divide-gray-100">
                            {roomTree.map(building => (
                                <div key={building.id}>
                                    {/* Building Header Row */}
                                    <div
                                        onClick={() => toggleNode(building.id)}
                                        className="flex items-center bg-gray-100/80 px-3 py-1.5 border-b border-gray-200 font-bold text-gray-800 cursor-pointer hover:bg-gray-200/70 transition-colors"
                                    >
                                        <div className="flex items-center gap-1.5 w-64">
                                            {expandedNodes[building.id] ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                                            <Building2 size={13} className="text-blue-700" />
                                            <span className="text-xs">{building.name}</span>
                                        </div>
                                    </div>

                                    {/* Floors and Rooms */}
                                    {expandedNodes[building.id] && building.floors.map(floor => (
                                        <div key={floor.id}>
                                            {/* Floor Header Row */}
                                            <div
                                                onClick={() => toggleNode(floor.id)}
                                                className="flex items-center bg-gray-50/70 pl-6 pr-3 py-1 border-b border-gray-100 text-[11px] font-semibold text-gray-600 cursor-pointer hover:bg-gray-100 transition-colors"
                                            >
                                                <div className="flex items-center gap-1.5 w-64">
                                                    {expandedNodes[floor.id] ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
                                                    <span>{floor.name}</span>
                                                    <span className="text-[10px] text-gray-400">({floor.rooms.length} rooms)</span>
                                                </div>
                                            </div>

                                            {/* Physical Room Timeline Rows */}
                                            {expandedNodes[floor.id] && floor.rooms.map(room => (
                                                <div
                                                    key={room.id}
                                                    className="flex items-stretch hover:bg-blue-50/20 transition-colors group relative"
                                                >
                                                    {/* Room Identifier */}
                                                    <div className="w-64 pl-9 pr-3 py-2 border-r border-gray-200 flex items-center justify-between bg-white z-10">
                                                        <div className="flex items-center gap-2">
                                                            <span className="font-mono font-bold text-xs text-blue-800 bg-blue-50 px-2 py-0.5 rounded border border-blue-100">
                                                                {room.roomNumber}
                                                            </span>
                                                            <div className="text-[11px] font-medium text-gray-800 truncate max-w-[120px]">
                                                                {room.type}
                                                            </div>
                                                        </div>
                                                        <span className={`w-2 h-2 rounded-full ${room.status === 'clean' ? 'bg-emerald-500' : room.status === 'inspected' ? 'bg-blue-500' : 'bg-amber-500'}`} title={`Status: ${room.status}`}></span>
                                                    </div>

                                                    {/* Timeline Day Grid for this Room */}
                                                    <div
                                                        className="flex-1 grid relative"
                                                        style={{ gridTemplateColumns: `repeat(${days.length}, minmax(48px, 1fr))` }}
                                                    >
                                                        {days.map(d => {
                                                            const isDraggingThis = dragState && dragState.room === room.roomNumber &&
                                                                d.index >= Math.min(dragState.startIndex, dragState.endIndex) &&
                                                                d.index <= Math.max(dragState.startIndex, dragState.endIndex);

                                                            return (
                                                                <div
                                                                    key={d.index}
                                                                    onMouseDown={(e) => {
                                                                        const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
                                                                        setDragState({
                                                                            room: room.roomNumber,
                                                                            startIndex: d.index,
                                                                            endIndex: d.index,
                                                                            startRect: rect,
                                                                            endRect: rect
                                                                        });
                                                                    }}
                                                                    onMouseEnter={(e) => {
                                                                        if (dragState && dragState.room === room.roomNumber) {
                                                                            const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
                                                                            setDragState(prev => prev ? { ...prev, endIndex: d.index, endRect: rect } : null);
                                                                        }
                                                                    }}
                                                                    className={`border-r border-gray-100 min-h-[38px] transition-colors relative cursor-crosshair ${isDraggingThis ? 'bg-blue-300/60 ring-2 ring-blue-500/50' : d.isWeekend ? 'bg-rose-50/30' : 'bg-transparent hover:bg-gray-100/50'}`}
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
                                                                        className={`absolute top-1 bottom-1 mx-0.5 rounded-lg px-2 flex items-center justify-between font-semibold shadow-xs z-10 cursor-pointer hover:brightness-105 transition-all text-[11px] ${getStatusBadgeColor(booking.status)}`}
                                                                    >
                                                                        <div className="flex items-center gap-1.5 truncate">
                                                                            {booking.vip && (
                                                                                <span className="bg-amber-400 text-amber-950 px-1 rounded text-[9px] font-bold">
                                                                                    VIP
                                                                                </span>
                                                                            )}
                                                                            <span className="truncate">{booking.guestName}</span>
                                                                        </div>
                                                                        <span className="text-[10px] opacity-80 font-mono hidden md:inline">
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
                    </div>
                </div>
            </div>

            {/* Selection Floating Popover */}
            {selectedRange && selectedRange.rect && (
                <>
                    <div
                        className="fixed inset-0 z-30"
                        onClick={() => setSelectedRange(null)}
                    ></div>
                    <div
                        className="fixed z-40 bg-white rounded-xl border border-gray-200 shadow-2xl p-4 w-72 text-xs space-y-3 animate-in fade-in zoom-in-95 duration-100"
                        style={{
                            top: `${Math.min(window.innerHeight - 200, selectedRange.rect.bottom + 10)}px`,
                            left: `${Math.max(10, Math.min(window.innerWidth - 300, selectedRange.rect.left))}px`
                        }}
                    >
                        <div className="flex items-center justify-between border-b border-gray-100 pb-2">
                            <h4 className="font-bold text-gray-900 text-xs">New Booking Selection</h4>
                            <button
                                type="button"
                                onClick={() => setSelectedRange(null)}
                                className="text-gray-400 hover:text-gray-600"
                            >
                                <X size={15} />
                            </button>
                        </div>

                        <div className="space-y-1.5 text-gray-600">
                            <div className="flex justify-between">
                                <span>Room Number:</span>
                                <span className="font-bold text-blue-700 font-mono">{selectedRange.room}</span>
                            </div>
                            <div className="flex justify-between">
                                <span>Dates:</span>
                                <span className="font-medium text-gray-900">
                                    {days[selectedRange.startIndex]?.date} → {days[selectedRange.endIndex]?.date}
                                </span>
                            </div>
                            <div className="flex justify-between">
                                <span>Stay Duration:</span>
                                <span className="font-bold text-gray-900">
                                    {selectedRange.endIndex - selectedRange.startIndex + 1} Night(s)
                                </span>
                            </div>
                        </div>

                        <div className="flex items-center gap-2 pt-1 border-t border-gray-100">
                            <button
                                type="button"
                                onClick={() => {
                                    setIsQuickReservationOpen(true);
                                }}
                                className="flex-1 h-8 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold shadow-2xs cursor-pointer text-center"
                            >
                                Quick Walk-In
                            </button>
                            <button
                                type="button"
                                onClick={() => {
                                    setIsAddReservationOpen(true);
                                }}
                                className="h-8 px-2.5 border border-gray-200 hover:bg-gray-50 rounded-lg font-semibold text-gray-700 cursor-pointer"
                            >
                                Full Wizard
                            </button>
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
                roomInfo={{
                    room: selectedRange?.room || '101',
                    startDate: selectedRange ? days[selectedRange.startIndex]?.date : startDate,
                    endDate: selectedRange ? days[selectedRange.endIndex]?.date : startDate,
                    nights: selectedRange ? (selectedRange.endIndex - selectedRange.startIndex + 1) : 1,
                    startIndex: selectedRange?.startIndex,
                    endIndex: selectedRange?.endIndex
                }}
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
