import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import {
    X,
    Users,
    Edit3,
    Settings,
    ChevronDown,
    Calendar,
    Layers,
    Home,
    Printer,
    DollarSign,
    Calculator,
    CreditCard,
    Wallet,
    CalendarDays,
    CheckSquare,
    Receipt,
    Printer as PrintIcon,
    AlertCircle,
    MoveHorizontal
} from 'lucide-react';
import type { AmendBookingData } from './AmendStayModal';

interface ReservationDetailsDrawerProps {
    isOpen: boolean;
    onClose: () => void;
    booking: AmendBookingData | null;
    onAmendStay?: (booking: AmendBookingData) => void;
    onRoomMove?: (booking: AmendBookingData) => void;
    onEdit?: (booking: AmendBookingData) => void;
}

export const ReservationDetailsDrawer: React.FC<ReservationDetailsDrawerProps> = ({
    isOpen,
    onClose,
    booking,
    onAmendStay,
    onRoomMove,
    onEdit
}) => {
    const [isOptionsOpen, setIsOptionsOpen] = useState(false);
    const [isSelectOpen, setIsSelectOpen] = useState(false);

    if (!isOpen || !booking) return null;

    const dailyRate = booking.avgDailyRate || 3000;
    const totalAmount = booking.nights * dailyRate;

    return createPortal(
        <div className="fixed inset-0 z-[99999] overflow-hidden select-none font-sans">
            {/* Backdrop Overlay */}
            <div
                className="fixed inset-0 bg-black/40 backdrop-blur-[1px] transition-opacity animate-in fade-in duration-200"
                onClick={onClose}
            />

            {/* Right-Side Docked Single-Column Details Drawer (matching media_1792541210487_8b5ecb8d.png) */}
            <div className="fixed top-0 bottom-0 right-0 w-full sm:w-[480px] md:w-[500px] lg:w-[485px] bg-[#0e3592] text-white shadow-2xl flex flex-col border-l border-blue-900 animate-in slide-in-from-right duration-200 z-[100000]">
                {/* 1. White Top Header Bar */}
                <div className="px-4 py-3 bg-white border-b border-gray-200 flex items-center justify-between flex-shrink-0">
                    <div className="flex items-center gap-3 min-w-0">
                        <button
                            type="button"
                            onClick={onClose}
                            className="p-1 hover:bg-gray-100 rounded text-gray-500 hover:text-gray-900 transition-colors cursor-pointer flex-shrink-0"
                            title="Close"
                        >
                            <X size={18} />
                        </button>
                        <div className="text-gray-700 flex items-center justify-center flex-shrink-0">
                            <Users size={18} />
                        </div>
                        <span className="font-extrabold text-gray-900 text-[15px] tracking-wide uppercase truncate font-sans">
                            {booking.guestName}
                        </span>
                    </div>
                </div>

                {/* 2. Drawer Body Content */}
                <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-[#0e3592]">
                    {/* Top Action Pills (Edit, Options ∨, select ∨) */}
                    <div className="flex items-center gap-2 relative">
                        {/* Edit Button */}
                        <button
                            type="button"
                            onClick={() => {
                                if (onEdit) onEdit(booking);
                                else if (onAmendStay) onAmendStay(booking);
                            }}
                            className="px-3.5 py-1 bg-white hover:bg-gray-50 text-[#0e3592] rounded text-xs font-bold flex items-center gap-1.5 shadow-2xs transition-colors cursor-pointer border border-blue-200/50"
                        >
                            <Edit3 size={12} className="text-[#0e3592]" />
                            <span>Edit</span>
                        </button>

                        {/* Options ∨ Dropdown Button */}
                        <div className="relative">
                            <button
                                type="button"
                                onClick={() => {
                                    setIsOptionsOpen(!isOptionsOpen);
                                    setIsSelectOpen(false);
                                }}
                                className="px-3.5 py-1 bg-white hover:bg-gray-50 text-[#0e3592] rounded text-xs font-bold flex items-center gap-1.5 shadow-2xs transition-colors cursor-pointer border border-blue-200/50"
                            >
                                <Settings size={12} className="text-[#0e3592]" />
                                <span>Options</span>
                                <ChevronDown size={12} className={`transition-transform duration-200 ${isOptionsOpen ? 'rotate-180' : ''}`} />
                            </button>

                            {/* Options Dropdown Menu */}
                            {isOptionsOpen && (
                                <div className="absolute left-0 top-full mt-1.5 w-48 bg-white rounded-lg shadow-xl border border-gray-200 py-1 z-50 text-gray-800 animate-in fade-in zoom-in-95 duration-100">
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setIsOptionsOpen(false);
                                            if (onAmendStay) onAmendStay(booking);
                                        }}
                                        className="w-full px-3 py-2 text-left text-xs font-bold hover:bg-blue-50 text-[#0e3592] flex items-center gap-2 cursor-pointer transition-colors"
                                    >
                                        <CalendarDays size={14} className="text-blue-600" />
                                        <span>Amend Stay</span>
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setIsOptionsOpen(false);
                                            if (onRoomMove) onRoomMove(booking);
                                        }}
                                        className="w-full px-3 py-2 text-left text-xs font-bold hover:bg-blue-50 text-[#0e3592] flex items-center gap-2 cursor-pointer transition-colors"
                                    >
                                        <MoveHorizontal size={14} className="text-blue-600" />
                                        <span>Room Move</span>
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setIsOptionsOpen(false)}
                                        className="w-full px-3 py-2 text-left text-xs font-medium hover:bg-gray-50 text-gray-700 flex items-center gap-2 cursor-pointer transition-colors"
                                    >
                                        <CheckSquare size={14} className="text-emerald-600" />
                                        <span>Check In / Out</span>
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setIsOptionsOpen(false)}
                                        className="w-full px-3 py-2 text-left text-xs font-medium hover:bg-gray-50 text-gray-700 flex items-center gap-2 cursor-pointer transition-colors"
                                    >
                                        <Receipt size={14} className="text-purple-600" />
                                        <span>Folio & Billing</span>
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setIsOptionsOpen(false)}
                                        className="w-full px-3 py-2 text-left text-xs font-medium hover:bg-gray-50 text-gray-700 flex items-center gap-2 cursor-pointer transition-colors"
                                    >
                                        <PrintIcon size={14} className="text-gray-600" />
                                        <span>Registration Card</span>
                                    </button>
                                    <div className="h-px bg-gray-100 my-1" />
                                    <button
                                        type="button"
                                        onClick={() => setIsOptionsOpen(false)}
                                        className="w-full px-3 py-2 text-left text-xs font-medium hover:bg-rose-50 text-rose-600 flex items-center gap-2 cursor-pointer transition-colors"
                                    >
                                        <AlertCircle size={14} className="text-rose-600" />
                                        <span>Cancel Booking</span>
                                    </button>
                                </div>
                            )}
                        </div>

                        {/* select ∨ Dropdown Button */}
                        <div className="relative">
                            <button
                                type="button"
                                onClick={() => {
                                    setIsSelectOpen(!isSelectOpen);
                                    setIsOptionsOpen(false);
                                }}
                                className="px-3.5 py-1 bg-white hover:bg-gray-50 text-[#0e3592] rounded text-xs font-bold flex items-center gap-1.5 shadow-2xs transition-colors cursor-pointer border border-blue-200/50"
                            >
                                <span>select</span>
                                <ChevronDown size={12} className={`transition-transform duration-200 ${isSelectOpen ? 'rotate-180' : ''}`} />
                            </button>

                            {/* select Dropdown Menu */}
                            {isSelectOpen && (
                                <div className="absolute left-0 top-full mt-1.5 w-44 bg-white rounded-lg shadow-xl border border-gray-200 py-1 z-50 text-gray-800 animate-in fade-in zoom-in-95 duration-100">
                                    <button
                                        type="button"
                                        onClick={() => setIsSelectOpen(false)}
                                        className="w-full px-3 py-2 text-left text-xs font-medium hover:bg-blue-50 text-gray-800 cursor-pointer"
                                    >
                                        Change Room
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setIsSelectOpen(false)}
                                        className="w-full px-3 py-2 text-left text-xs font-medium hover:bg-blue-50 text-gray-800 cursor-pointer"
                                    >
                                        Upgrade Room Type
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setIsSelectOpen(false);
                                            if (onRoomMove) onRoomMove(booking);
                                        }}
                                        className="w-full px-3 py-2 text-left text-xs font-medium hover:bg-blue-50 text-gray-800 cursor-pointer flex items-center justify-between"
                                    >
                                        <span>Assign / Move Room</span>
                                        <MoveHorizontal size={12} className="text-blue-600" />
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Row 1: Reservation # and Status */}
                    <div className="grid grid-cols-2 gap-2.5">
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
                                <Layers size={14} />
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
                        {/* Arrival */}
                        <div className="col-span-5 bg-[#1942aa]/80 border border-blue-400/20 rounded-xl p-2.5 flex items-center gap-2">
                            <div className="w-7 h-7 rounded-lg bg-emerald-500/30 text-emerald-200 flex items-center justify-center flex-shrink-0">
                                <Calendar size={13} />
                            </div>
                            <div className="min-w-0">
                                <div className="text-[9px] uppercase font-bold text-blue-200">ARRIVAL</div>
                                <div className="text-xs font-bold text-white truncate">{booking.arrivalDate}</div>
                                <div className="text-[9px] text-blue-200 flex items-center gap-1">
                                    <span>🕒</span>
                                    <span>16:00:00</span>
                                </div>
                            </div>
                        </div>

                        {/* Nights */}
                        <div className="col-span-2 bg-[#1942aa]/80 border border-blue-400/20 rounded-xl p-1.5 flex flex-col items-center justify-center text-center">
                            <div className="text-[8.5px] uppercase font-bold text-blue-200">NIGHTS</div>
                            <div className="text-lg font-black text-white font-mono leading-none mt-0.5">
                                {booking.nights}
                            </div>
                        </div>

                        {/* Departure */}
                        <div className="col-span-5 bg-[#1942aa]/80 border border-blue-400/20 rounded-xl p-2.5 flex items-center gap-2">
                            <div className="w-7 h-7 rounded-lg bg-rose-500/30 text-rose-200 flex items-center justify-center flex-shrink-0">
                                <Calendar size={13} />
                            </div>
                            <div className="min-w-0">
                                <div className="text-[9px] uppercase font-bold text-blue-200">DEPARTURE</div>
                                <div className="text-xs font-bold text-white truncate">{booking.departureDate}</div>
                                <div className="text-[9px] text-blue-200 flex items-center gap-1">
                                    <span>🕒</span>
                                    <span>12:00:00</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Row 3: Room Details & Rate Plan */}
                    <div className="grid grid-cols-2 gap-2.5">
                        <div className="bg-[#1942aa]/80 border border-blue-400/20 rounded-xl p-2.5 flex items-center gap-2.5">
                            <div className="w-7 h-7 rounded-lg bg-indigo-500/30 text-indigo-200 flex items-center justify-center flex-shrink-0">
                                <Home size={14} />
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
                                <Printer size={14} />
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
                    <div className="grid grid-cols-2 gap-2.5">
                        <div className="bg-[#1942aa]/80 border border-blue-400/20 rounded-xl p-2.5 flex items-center gap-2.5">
                            <div className="w-7 h-7 rounded-lg bg-cyan-500/30 text-cyan-200 flex items-center justify-center flex-shrink-0">
                                <Users size={14} />
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
                                <DollarSign size={14} />
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

                    {/* Financial Summary Container (matching media_1792541210487_8b5ecb8d.png) */}
                    <div className="bg-[#1942aa]/80 border border-blue-400/20 rounded-xl p-3 space-y-2.5 text-xs">
                        <div className="flex items-center justify-between text-blue-100 text-xs">
                            <div className="flex items-center gap-2.5">
                                <div className="w-6 h-6 rounded-lg bg-blue-500/30 flex items-center justify-center text-blue-200">
                                    <Calculator size={13} />
                                </div>
                                <span>Room Total Amount</span>
                            </div>
                            <span className="font-mono font-bold text-white text-[13px]">{totalAmount.toFixed(2)}</span>
                        </div>

                        <div className="flex items-center justify-between text-blue-100 text-xs">
                            <div className="flex items-center gap-2.5">
                                <div className="w-6 h-6 rounded-lg bg-rose-500/30 flex items-center justify-center text-rose-300">
                                    <DollarSign size={13} />
                                </div>
                                <span>Room Discount</span>
                            </div>
                            <span className="font-mono font-bold text-rose-300 text-[13px]">0.00</span>
                        </div>

                        <div className="flex items-center justify-between text-blue-100 text-xs">
                            <div className="flex items-center gap-2.5">
                                <div className="w-6 h-6 rounded-lg bg-emerald-500/30 flex items-center justify-center text-emerald-300">
                                    <CreditCard size={13} />
                                </div>
                                <span>Room Paid Amount</span>
                            </div>
                            <span className="font-mono font-bold text-emerald-300 text-[13px]">0.00</span>
                        </div>
                    </div>

                    {/* Separate Room Net Balance Highlight Card (matching media_1792541210487_8b5ecb8d.png) */}
                    <div className="bg-[#1942aa]/80 border border-blue-400/20 rounded-xl p-3 flex items-center justify-between font-bold">
                        <div className="flex items-center gap-2.5 text-white">
                            <div className="w-7 h-7 rounded-lg bg-emerald-500/30 flex items-center justify-center text-emerald-400 flex-shrink-0">
                                <Wallet size={15} />
                            </div>
                            <span className="text-[13px] font-bold tracking-tight">Room Net Balance</span>
                        </div>
                        <span className="font-mono font-black text-emerald-400 text-base">
                            {totalAmount.toFixed(2)}
                        </span>
                    </div>
                </div>
            </div>
        </div>,
        document.body
    );
};

export default ReservationDetailsDrawer;
