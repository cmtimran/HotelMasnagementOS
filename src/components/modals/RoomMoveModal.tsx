import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import {
    X,
    Users,
    Edit3,
    Calendar,
    ChevronDown,
    Calculator,
    DollarSign,
    CreditCard,
    Wallet,
    Layers,
    Home,
    Printer,
    MoveHorizontal
} from 'lucide-react';
import type { AmendBookingData } from './AmendStayModal';

export interface RoomMoveData {
    booking: AmendBookingData;
    targetRoomNumber: string;
    targetFromDate: string;
    targetToDate: string;
    targetRoomType?: string;
    targetRateType?: string;
}

interface RoomMoveModalProps {
    isOpen: boolean;
    onClose: () => void;
    data: RoomMoveData | null;
    allRooms: Array<{ id?: string; roomNumber: string; type: string; status: string }>;
    onSaveRoomMove: (bookingId: string, newRoomNumber: string, newFromDate: string, newToDate: string) => void;
}

export const RoomMoveModal: React.FC<RoomMoveModalProps> = ({
    isOpen,
    onClose,
    data,
    allRooms,
    onSaveRoomMove
}) => {
    if (!isOpen || !data) return null;

    const { booking } = data;

    // Form states
    const [selectedRoom, setSelectedRoom] = useState<string>(() => data.targetRoomNumber || booking.roomNumber);
    const [fromDate, setFromDate] = useState<string>(() => data.targetFromDate || booking.arrivalDate);
    const [toDate, setToDate] = useState<string>(() => data.targetToDate || booking.departureDate);
    const [roomType, setRoomType] = useState<string>(() => data.targetRoomType || booking.roomType || 'Winter Rate Plan');
    const [rateType, setRateType] = useState<string>(() => data.targetRateType || booking.ratePlan || 'Summer Vacation');

    useEffect(() => {
        if (data) {
            setSelectedRoom(data.targetRoomNumber || data.booking.roomNumber);
            setFromDate(data.targetFromDate || data.booking.arrivalDate);
            setToDate(data.targetToDate || data.booking.departureDate);
            setRoomType(data.targetRoomType || data.booking.roomType || 'Winter Rate Plan');
            setRateType(data.targetRateType || data.booking.ratePlan || 'Summer Vacation');
        }
    }, [data]);

    // Calculate nights between fromDate and toDate
    const calcNights = () => {
        if (!fromDate || !toDate) return booking.nights;
        const start = new Date(fromDate);
        const end = new Date(toDate);
        const diff = Math.round((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
        return Math.max(1, diff);
    };

    const nights = calcNights();
    const dailyRate = booking.avgDailyRate || 3000;
    const totalAmount = nights * dailyRate;

    const handleSave = () => {
        onSaveRoomMove(booking.id, selectedRoom, fromDate, toDate);
        onClose();
    };

    return createPortal(
        <div className="fixed inset-0 z-[99999] overflow-hidden select-none font-sans">
            {/* Backdrop Overlay */}
            <div
                className="fixed inset-0 bg-black/40 backdrop-blur-[1px] transition-opacity animate-in fade-in duration-200"
                onClick={onClose}
            />

            {/* Right-Side Docked Drawer - Exact 2-Column Layout matching media_1792541566827_b05dc667.png */}
            <div className="fixed top-0 bottom-0 right-0 w-full md:w-[62%] lg:w-[58%] min-w-[700px] max-w-[960px] bg-[#0e3592] text-white shadow-2xl flex flex-col border-l border-blue-900 animate-in slide-in-from-right duration-200 z-[100000]">
                {/* 1. White Top Header Bar */}
                <div className="px-4 py-2.5 bg-white border-b border-gray-200 flex items-center justify-between flex-shrink-0">
                    <div className="flex items-center gap-2.5 min-w-0">
                        <button
                            type="button"
                            onClick={onClose}
                            className="p-1 hover:bg-gray-100 rounded text-gray-500 hover:text-gray-900 transition-colors cursor-pointer flex-shrink-0"
                            title="Close"
                        >
                            <X size={17} />
                        </button>
                        <div className="text-gray-700 flex items-center justify-center flex-shrink-0">
                            <Users size={16} />
                        </div>
                        <span className="font-extrabold text-gray-900 text-sm tracking-wide uppercase truncate font-sans">
                            {booking.guestName}
                        </span>
                    </div>
                </div>

                {/* 2. Drawer Body: 2 Columns Side-by-Side */}
                <div className="flex-1 overflow-y-auto p-4 grid grid-cols-12 gap-4 bg-[#0e3592]">
                    {/* LEFT COLUMN (~55% width): Action Pills, Overview Cards & Financial Card */}
                    <div className="col-span-7 flex flex-col gap-2.5">
                        {/* Action Pills: Edit, Room Move ∨, select ∨ */}
                        <div className="flex items-center gap-1.5">
                            <button
                                type="button"
                                className="px-3 py-1 bg-white hover:bg-gray-100 text-[#0e3592] rounded text-xs font-bold flex items-center gap-1 shadow-2xs transition-colors cursor-pointer"
                            >
                                <Edit3 size={11} />
                                <span>Edit</span>
                            </button>
                            <button
                                type="button"
                                className="px-3 py-1 bg-white hover:bg-gray-100 text-[#0e3592] rounded text-xs font-bold flex items-center gap-1 shadow-2xs transition-colors cursor-pointer"
                            >
                                <MoveHorizontal size={11} />
                                <span>Room Move</span>
                                <ChevronDown size={11} />
                            </button>
                            <button
                                type="button"
                                className="px-3 py-1 bg-white hover:bg-gray-100 text-[#0e3592] rounded text-xs font-bold flex items-center gap-1 shadow-2xs transition-colors cursor-pointer"
                            >
                                <span>select</span>
                                <ChevronDown size={11} />
                            </button>
                        </div>

                        {/* Row 1: Reservation # & Status */}
                        <div className="grid grid-cols-2 gap-2">
                            <div className="bg-[#1942aa]/80 border border-blue-400/20 rounded-xl p-2.5 flex items-center gap-2.5">
                                <div className="w-7 h-7 rounded-lg bg-blue-500/30 text-blue-200 flex items-center justify-center font-bold text-xs flex-shrink-0">
                                    #
                                </div>
                                <div className="min-w-0">
                                    <div className="text-[9.5px] uppercase font-bold text-blue-200 tracking-wider">
                                        Reservation #
                                    </div>
                                    <div className="text-xs font-bold text-white truncate font-mono">
                                        {booking.reservationNumber}
                                    </div>
                                </div>
                            </div>

                            <div className="bg-[#1942aa]/80 border border-blue-400/20 rounded-xl p-2.5 flex items-center gap-2.5">
                                <div className="w-7 h-7 rounded-lg bg-amber-500/30 text-amber-200 flex items-center justify-center flex-shrink-0">
                                    <Layers size={13} />
                                </div>
                                <div className="min-w-0">
                                    <div className="text-[9.5px] uppercase font-bold text-blue-200 tracking-wider">
                                        Status
                                    </div>
                                    <div className="mt-0.5">
                                        <span className="bg-white text-emerald-600 font-black text-[10px] px-2 py-0.5 rounded shadow-2xs uppercase">
                                            {booking.status || 'CONFIRMED'}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Row 2: Arrival, Nights, Departure */}
                        <div className="grid grid-cols-12 gap-2">
                            <div className="col-span-5 bg-[#1942aa]/80 border border-blue-400/20 rounded-xl p-2 flex items-center gap-2">
                                <div className="w-6 h-6 rounded bg-emerald-500/30 text-emerald-200 flex items-center justify-center flex-shrink-0">
                                    <Calendar size={12} />
                                </div>
                                <div className="min-w-0">
                                    <div className="text-[9px] uppercase font-bold text-blue-200">ARRIVAL</div>
                                    <div className="text-[11.5px] font-bold text-white truncate">{booking.arrivalDate}</div>
                                    <div className="text-[8.5px] text-blue-200">🕒 16:00:00</div>
                                </div>
                            </div>

                            <div className="col-span-2 bg-[#1942aa]/80 border border-blue-400/20 rounded-xl p-1.5 flex flex-col items-center justify-center text-center">
                                <div className="text-[8.5px] uppercase font-bold text-blue-200">NIGHTS</div>
                                <div className="text-base font-black text-white font-mono leading-none">{booking.nights}</div>
                            </div>

                            <div className="col-span-5 bg-[#1942aa]/80 border border-blue-400/20 rounded-xl p-2 flex items-center gap-2">
                                <div className="w-6 h-6 rounded bg-rose-500/30 text-rose-200 flex items-center justify-center flex-shrink-0">
                                    <Calendar size={12} />
                                </div>
                                <div className="min-w-0">
                                    <div className="text-[9px] uppercase font-bold text-blue-200">DEPARTURE</div>
                                    <div className="text-[11.5px] font-bold text-white truncate">{booking.departureDate}</div>
                                    <div className="text-[8.5px] text-blue-200">🕒 12:00:00</div>
                                </div>
                            </div>
                        </div>

                        {/* Row 3: Room Details & Rate Plan */}
                        <div className="grid grid-cols-2 gap-2">
                            <div className="bg-[#1942aa]/80 border border-blue-400/20 rounded-xl p-2.5 flex items-center gap-2.5">
                                <div className="w-7 h-7 rounded-lg bg-indigo-500/30 text-indigo-200 flex items-center justify-center flex-shrink-0">
                                    <Home size={13} />
                                </div>
                                <div className="min-w-0">
                                    <div className="text-[9.5px] uppercase font-bold text-blue-200 tracking-wider">
                                        Room Details
                                    </div>
                                    <div className="text-xs font-bold text-white truncate">
                                        {booking.roomNumber} ({booking.roomType || 'Winter Rate Plan'})
                                    </div>
                                </div>
                            </div>

                            <div className="bg-[#1942aa]/80 border border-blue-400/20 rounded-xl p-2.5 flex items-center gap-2.5">
                                <div className="w-7 h-7 rounded-lg bg-amber-500/30 text-amber-200 flex items-center justify-center flex-shrink-0">
                                    <Printer size={13} />
                                </div>
                                <div className="min-w-0">
                                    <div className="text-[9.5px] uppercase font-bold text-blue-200 tracking-wider">
                                        Rate Plan
                                    </div>
                                    <div className="text-xs font-bold text-white truncate">
                                        {booking.ratePlan || 'Summer Vacation'}
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Row 4: Guests & Avg Daily Rate */}
                        <div className="grid grid-cols-2 gap-2">
                            <div className="bg-[#1942aa]/80 border border-blue-400/20 rounded-xl p-2.5 flex items-center gap-2.5">
                                <div className="w-7 h-7 rounded-lg bg-cyan-500/30 text-cyan-200 flex items-center justify-center flex-shrink-0">
                                    <Users size={13} />
                                </div>
                                <div className="min-w-0">
                                    <div className="text-[9.5px] uppercase font-bold text-blue-200 tracking-wider">
                                        Guests (Pax)
                                    </div>
                                    <div className="text-xs font-bold text-white truncate">
                                        2 Adults, 1 Child
                                    </div>
                                </div>
                            </div>

                            <div className="bg-[#1942aa]/80 border border-blue-400/20 rounded-xl p-2.5 flex items-center gap-2.5">
                                <div className="w-7 h-7 rounded-lg bg-emerald-500/30 text-emerald-200 flex items-center justify-center flex-shrink-0">
                                    <DollarSign size={13} />
                                </div>
                                <div className="min-w-0">
                                    <div className="text-[9.5px] uppercase font-bold text-blue-200 tracking-wider">
                                        Avg Daily Rate
                                    </div>
                                    <div className="text-xs font-bold text-white font-mono">
                                        {dailyRate.toFixed(2)}
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Financial Overview Card */}
                        <div className="bg-[#1942aa]/80 border border-blue-400/20 rounded-xl p-3 space-y-2 text-xs">
                            <div className="flex items-center justify-between text-blue-100 text-[11px]">
                                <div className="flex items-center gap-2">
                                    <div className="w-5 h-5 rounded bg-blue-500/30 flex items-center justify-center text-blue-200">
                                        <Calculator size={11} />
                                    </div>
                                    <span>Room Total Amount</span>
                                </div>
                                <span className="font-mono font-bold text-white">{totalAmount.toFixed(2)}</span>
                            </div>

                            <div className="flex items-center justify-between text-blue-100 text-[11px]">
                                <div className="flex items-center gap-2">
                                    <div className="w-5 h-5 rounded bg-rose-500/30 flex items-center justify-center text-rose-300">
                                        <DollarSign size={11} />
                                    </div>
                                    <span>Room Discount</span>
                                </div>
                                <span className="font-mono font-bold text-rose-300">0.00</span>
                            </div>

                            <div className="flex items-center justify-between text-blue-100 text-[11px]">
                                <div className="flex items-center gap-2">
                                    <div className="w-5 h-5 rounded bg-emerald-500/30 flex items-center justify-center text-emerald-300">
                                        <CreditCard size={11} />
                                    </div>
                                    <span>Room Paid Amount</span>
                                </div>
                                <span className="font-mono font-bold text-emerald-300">0.00</span>
                            </div>
                        </div>

                        {/* Separate Room Net Balance Card */}
                        <div className="bg-[#1942aa]/80 border border-blue-400/20 rounded-xl p-3 flex items-center justify-between font-bold">
                            <div className="flex items-center gap-2 text-white">
                                <div className="w-6 h-6 rounded bg-emerald-500/30 flex items-center justify-center text-emerald-400">
                                    <Wallet size={13} />
                                </div>
                                <span className="text-xs">Room Net Balance</span>
                            </div>
                            <span className="font-mono font-black text-emerald-400 text-sm">
                                {totalAmount.toFixed(2)}
                            </span>
                        </div>
                    </div>

                    {/* RIGHT COLUMN (~45% width): Room Move Form (matching media_1792541566827_b05dc667.png) */}
                    <div className="col-span-5 flex flex-col justify-between space-y-3">
                        <div className="space-y-3">
                            {/* Header Row */}
                            <div className="flex items-center justify-between border-b border-blue-400/20 pb-2">
                                <h2 className="text-base font-bold text-white">Room Move</h2>
                                <button
                                    type="button"
                                    onClick={onClose}
                                    className="p-1 text-blue-200 hover:text-white rounded transition-colors cursor-pointer"
                                    title="Close"
                                >
                                    <X size={16} />
                                </button>
                            </div>

                            <div className="text-xs font-bold text-white">
                                New Room Assignment:
                            </div>

                            {/* Row 1: Select Room & Select Guest */}
                            <div className="grid grid-cols-2 gap-2">
                                <div className="flex flex-col gap-1">
                                    <label className="text-[10px] font-semibold text-blue-100">Select Room</label>
                                    <div className="relative">
                                        <select
                                            value={booking.roomNumber}
                                            disabled
                                            className="w-full h-7 px-2 border border-blue-300/40 rounded text-xs bg-white text-gray-900 font-bold outline-none cursor-not-allowed appearance-none pr-6"
                                        >
                                            <option value={booking.roomNumber}>{booking.roomNumber}</option>
                                        </select>
                                        <ChevronDown size={12} className="absolute right-2 top-2 text-gray-600 pointer-events-none" />
                                    </div>
                                </div>

                                <div className="flex flex-col gap-1">
                                    <label className="text-[10px] font-semibold text-blue-100">Select Guest</label>
                                    <div className="relative">
                                        <select
                                            value={booking.guestName}
                                            disabled
                                            className="w-full h-7 px-2 border border-blue-300/40 rounded text-xs bg-white text-gray-900 font-bold outline-none cursor-not-allowed appearance-none pr-6 truncate"
                                        >
                                            <option value={booking.guestName}>{booking.guestName}</option>
                                        </select>
                                        <ChevronDown size={12} className="absolute right-2 top-2 text-gray-600 pointer-events-none" />
                                    </div>
                                </div>
                            </div>

                            {/* Row 2: From Date & To Date */}
                            <div className="grid grid-cols-2 gap-2">
                                <div className="flex flex-col gap-1">
                                    <label className="text-[10px] font-semibold text-blue-100">From Date</label>
                                    <input
                                        type="date"
                                        value={fromDate}
                                        onChange={e => setFromDate(e.target.value)}
                                        className="w-full h-7 px-2 border border-blue-300 rounded text-[11px] bg-white text-gray-900 font-bold outline-none focus:ring-2 focus:ring-blue-400 cursor-pointer"
                                    />
                                </div>

                                <div className="flex flex-col gap-1">
                                    <label className="text-[10px] font-semibold text-blue-100">To Date</label>
                                    <input
                                        type="date"
                                        value={toDate}
                                        onChange={e => setToDate(e.target.value)}
                                        className="w-full h-7 px-2 border border-blue-300 rounded text-[11px] bg-white text-gray-900 font-bold outline-none focus:ring-2 focus:ring-blue-400 cursor-pointer"
                                    />
                                </div>
                            </div>

                            {/* Row 3: Room Type & Rate Type */}
                            <div className="grid grid-cols-2 gap-2">
                                <div className="flex flex-col gap-1">
                                    <label className="text-[10px] font-semibold text-blue-100">Room Type</label>
                                    <div className="relative">
                                        <select
                                            value={roomType}
                                            onChange={e => setRoomType(e.target.value)}
                                            className="w-full h-7 px-2 border border-blue-300 rounded text-[11px] bg-white text-gray-900 font-bold outline-none focus:ring-2 focus:ring-blue-400 cursor-pointer appearance-none pr-6"
                                        >
                                            <option value="Winter Rate Plan">Winter Rate Plan</option>
                                            <option value="Deluxe Double">Deluxe Double</option>
                                            <option value="Superior King">Superior King</option>
                                            <option value="Executive Suite">Executive Suite</option>
                                        </select>
                                        <ChevronDown size={12} className="absolute right-2 top-2 text-gray-600 pointer-events-none" />
                                    </div>
                                </div>

                                <div className="flex flex-col gap-1">
                                    <label className="text-[10px] font-semibold text-blue-100">Rate Type</label>
                                    <div className="relative">
                                        <select
                                            value={rateType}
                                            onChange={e => setRateType(e.target.value)}
                                            className="w-full h-7 px-2 border border-blue-300 rounded text-[11px] bg-white text-gray-900 font-bold outline-none focus:ring-2 focus:ring-blue-400 cursor-pointer appearance-none pr-6"
                                        >
                                            <option value="Summer Vacation">Summer Vacation</option>
                                            <option value="Standard EP Rate">Standard EP Rate</option>
                                            <option value="Corporate CP">Corporate CP</option>
                                            <option value="Weekend Special">Weekend Special</option>
                                        </select>
                                        <ChevronDown size={12} className="absolute right-2 top-2 text-gray-600 pointer-events-none" />
                                    </div>
                                </div>
                            </div>

                            {/* Row 4: Target Room Selection */}
                            <div className="flex flex-col gap-1">
                                <label className="text-[10px] font-semibold text-blue-100">Room</label>
                                <div className="relative">
                                    <select
                                        value={selectedRoom}
                                        onChange={e => setSelectedRoom(e.target.value)}
                                        className="w-full h-7 px-2.5 border border-blue-300 rounded text-xs bg-white text-gray-900 font-bold outline-none focus:ring-2 focus:ring-blue-400 cursor-pointer appearance-none pr-6"
                                    >
                                        {allRooms.map(r => (
                                            <option key={r.id || r.roomNumber} value={r.roomNumber}>
                                                A-({r.roomNumber}) {r.type ? `• ${r.type}` : ''}
                                            </option>
                                        ))}
                                    </select>
                                    <ChevronDown size={12} className="absolute right-2 top-2 text-gray-600 pointer-events-none" />
                                </div>
                            </div>
                        </div>

                        {/* Bottom Action Buttons (Pinned Right) */}
                        <div className="flex items-center justify-end gap-2 pt-3 border-t border-blue-400/20">
                            <button
                                type="button"
                                onClick={onClose}
                                className="h-7.5 px-4 border border-white/60 bg-[#153b9a] hover:bg-[#1e4ac5] text-white font-bold rounded text-xs cursor-pointer transition-colors shadow-2xs"
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                onClick={handleSave}
                                className="h-7.5 px-4 bg-[#0052cc] hover:bg-blue-600 text-white font-bold rounded text-xs flex items-center gap-1.5 cursor-pointer transition-colors shadow-md"
                            >
                                <Home size={12} />
                                <span>Save Room Move</span>
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>,
        document.body
    );
};

export default RoomMoveModal;
