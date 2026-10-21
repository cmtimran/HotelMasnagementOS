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
    CalendarPlus,
    CalendarX,
    CircleSlash,
    Hand,
    GitFork,
    DoorOpen,
    DoorClosed
} from 'lucide-react';
import type { AmendBookingData } from './AmendStayModal';

export interface ReservationDrawerActions {
    onAddPayment?: (booking: AmendBookingData) => void;
    onAmendStay?: (booking: AmendBookingData) => void;
    onRoomMove?: (booking: AmendBookingData) => void;
    onRoomSplit?: (booking: AmendBookingData) => void;
    onStopRoomMove?: (booking: AmendBookingData) => void;
    onAddNewBooking?: (booking: AmendBookingData) => void;
    onCancelReservation?: (booking: AmendBookingData) => void;
    onReservationHold?: (booking: AmendBookingData) => void;
    onUnassign?: (booking: AmendBookingData) => void;
    onEdit?: (booking: AmendBookingData) => void;
}

interface ReservationDetailsDrawerProps extends ReservationDrawerActions {
    isOpen: boolean;
    onClose: () => void;
    booking: AmendBookingData | null;
}

export const ReservationDetailsDrawer: React.FC<ReservationDetailsDrawerProps> = ({
    isOpen,
    onClose,
    booking,
    onAddPayment,
    onAmendStay,
    onRoomMove,
    onRoomSplit,
    onStopRoomMove,
    onAddNewBooking,
    onCancelReservation,
    onReservationHold,
    onUnassign,
    onEdit
}) => {
    const [isOptionsOpen, setIsOptionsOpen] = useState(false);

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

            {/* Right-Side Docked Single-Column Details Drawer */}
            <div className="fixed top-0 bottom-0 right-0 w-full sm:w-[470px] md:w-[490px] lg:w-[480px] bg-[#0e3592] text-white shadow-2xl flex flex-col border-l border-blue-900 animate-in slide-in-from-right duration-200 z-[100000]">
                {/* 1. White Top Header Bar with Edit & Options Actions */}
                <div className="px-3.5 py-2.5 bg-white border-b border-gray-200 flex items-center justify-between flex-shrink-0">
                    {/* Left: Close, Icon & Guest Name */}
                    <div className="flex items-center gap-2.5 min-w-0">
                        <button
                            type="button"
                            onClick={onClose}
                            className="p-1 hover:bg-gray-100 rounded text-gray-500 hover:text-gray-900 transition-colors cursor-pointer flex-shrink-0"
                            title="Close"
                        >
                            <X size={17} />
                        </button>
                        <div className="w-6 h-6 rounded-full bg-blue-50 text-blue-900 flex items-center justify-center font-bold flex-shrink-0">
                            <Users size={14} />
                        </div>
                        <span className="font-extrabold text-gray-900 text-sm tracking-wide uppercase truncate font-sans">
                            {booking.guestName}
                        </span>
                    </div>

                    {/* Right: Top Action Buttons (Edit + Options ∨) */}
                    <div className="flex items-center gap-1.5 flex-shrink-0">
                        {/* Edit Button */}
                        <button
                            type="button"
                            onClick={() => {
                                if (onEdit) onEdit(booking);
                                else if (onAmendStay) onAmendStay(booking);
                            }}
                            className="h-7 px-2.5 bg-white hover:bg-gray-50 text-[#0e3592] border border-blue-300/80 rounded text-xs font-bold flex items-center gap-1 shadow-2xs transition-colors cursor-pointer"
                        >
                            <Edit3 size={11} className="text-[#0e3592]" />
                            <span>Edit</span>
                        </button>

                        {/* Options ∨ Dropdown Button */}
                        <div className="relative">
                            <button
                                type="button"
                                onClick={() => setIsOptionsOpen(!isOptionsOpen)}
                                className="h-7 px-2.5 bg-white hover:bg-gray-50 text-[#0e3592] border border-blue-300/80 rounded text-xs font-bold flex items-center gap-1 shadow-2xs transition-colors cursor-pointer"
                            >
                                <Settings size={11} className="text-[#0e3592]" />
                                <span>Options</span>
                                <ChevronDown size={11} className={`transition-transform duration-200 ${isOptionsOpen ? 'rotate-180' : ''}`} />
                            </button>

                            {/* Options Dropdown Menu (Exact 9 options matching media_1792542819332_c56d27e8.png) */}
                            {isOptionsOpen && (
                                <div className="absolute right-0 top-full mt-1.5 w-52 bg-white rounded-md shadow-2xl border border-gray-200 py-1 z-[100002] text-gray-800 animate-in fade-in zoom-in-95 duration-100">
                                    {/* 1. Add Payment */}
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setIsOptionsOpen(false);
                                            if (onAddPayment) onAddPayment(booking);
                                        }}
                                        className="w-full px-3.5 py-1.5 text-left text-xs font-medium hover:bg-gray-100 text-gray-800 flex items-center gap-2.5 cursor-pointer transition-colors"
                                    >
                                        <CreditCard size={14} className="text-gray-700 flex-shrink-0" />
                                        <span>Add Payment</span>
                                    </button>

                                    {/* 2. Amend Stay */}
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setIsOptionsOpen(false);
                                            if (onAmendStay) onAmendStay(booking);
                                        }}
                                        className="w-full px-3.5 py-1.5 text-left text-xs font-medium hover:bg-gray-100 text-gray-800 flex items-center gap-2.5 cursor-pointer transition-colors"
                                    >
                                        <Calendar size={14} className="text-gray-700 flex-shrink-0" />
                                        <span>Amend Stay</span>
                                    </button>

                                    {/* 3. Room Move */}
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setIsOptionsOpen(false);
                                            if (onRoomMove) onRoomMove(booking);
                                        }}
                                        className="w-full px-3.5 py-1.5 text-left text-xs font-medium hover:bg-gray-100 text-gray-800 flex items-center gap-2.5 cursor-pointer transition-colors"
                                    >
                                        <DoorOpen size={14} className="text-gray-700 flex-shrink-0" />
                                        <span>Room Move</span>
                                    </button>

                                    {/* 4. Room Split */}
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setIsOptionsOpen(false);
                                            if (onRoomSplit) onRoomSplit(booking);
                                        }}
                                        className="w-full px-3.5 py-1.5 text-left text-xs font-medium hover:bg-gray-100 text-gray-800 flex items-center gap-2.5 cursor-pointer transition-colors"
                                    >
                                        <GitFork size={14} className="text-gray-700 flex-shrink-0" />
                                        <span>Room Split</span>
                                    </button>

                                    {/* 5. Stop Room Move */}
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setIsOptionsOpen(false);
                                            if (onStopRoomMove) onStopRoomMove(booking);
                                        }}
                                        className="w-full px-3.5 py-1.5 text-left text-xs font-medium hover:bg-gray-100 text-gray-800 flex items-center gap-2.5 cursor-pointer transition-colors"
                                    >
                                        <Hand size={14} className="text-gray-700 flex-shrink-0" />
                                        <span>Stop Room Move</span>
                                    </button>

                                    {/* 6. Add New Booking */}
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setIsOptionsOpen(false);
                                            if (onAddNewBooking) onAddNewBooking(booking);
                                        }}
                                        className="w-full px-3.5 py-1.5 text-left text-xs font-medium hover:bg-gray-100 text-gray-800 flex items-center gap-2.5 cursor-pointer transition-colors"
                                    >
                                        <CalendarPlus size={14} className="text-gray-700 flex-shrink-0" />
                                        <span>Add New Booking</span>
                                    </button>

                                    {/* 7. Cancel Reservation */}
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setIsOptionsOpen(false);
                                            if (onCancelReservation) onCancelReservation(booking);
                                        }}
                                        className="w-full px-3.5 py-1.5 text-left text-xs font-medium hover:bg-gray-100 text-gray-800 flex items-center gap-2.5 cursor-pointer transition-colors"
                                    >
                                        <CalendarX size={14} className="text-gray-700 flex-shrink-0" />
                                        <span>Cancel Reservation</span>
                                    </button>

                                    {/* 8. Reservation Hold */}
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setIsOptionsOpen(false);
                                            if (onReservationHold) onReservationHold(booking);
                                        }}
                                        className="w-full px-3.5 py-1.5 text-left text-xs font-medium hover:bg-gray-100 text-gray-800 flex items-center gap-2.5 cursor-pointer transition-colors"
                                    >
                                        <CircleSlash size={14} className="text-gray-700 flex-shrink-0" />
                                        <span>Reservation Hold</span>
                                    </button>

                                    {/* 9. Unassign */}
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setIsOptionsOpen(false);
                                            if (onUnassign) onUnassign(booking);
                                        }}
                                        className="w-full px-3.5 py-1.5 text-left text-xs font-medium hover:bg-gray-100 text-gray-800 flex items-center gap-2.5 cursor-pointer transition-colors"
                                    >
                                        <DoorClosed size={14} className="text-gray-700 flex-shrink-0" />
                                        <span>Unassign</span>
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* 2. Drawer Body Content: Starts directly with Compact Cards */}
                <div className="flex-1 overflow-y-auto p-3.5 space-y-2.5 bg-[#0e3592]">
                    {/* Row 1: Reservation # and Status */}
                    <div className="grid grid-cols-2 gap-2">
                        <div className="bg-[#1942aa]/80 border border-blue-400/20 rounded-xl p-2.5 flex items-center gap-2.5 shadow-2xs">
                            <div className="w-7 h-7 rounded-lg bg-blue-500/30 text-blue-200 flex items-center justify-center font-bold text-xs flex-shrink-0">
                                #
                            </div>
                            <div className="min-w-0">
                                <div className="text-[9px] uppercase font-bold text-blue-200 tracking-wider">
                                    Reservation #
                                </div>
                                <div className="text-xs font-bold text-white truncate font-mono">
                                    {booking.reservationNumber}
                                </div>
                            </div>
                        </div>

                        <div className="bg-[#1942aa]/80 border border-blue-400/20 rounded-xl p-2.5 flex items-center gap-2.5 shadow-2xs">
                            <div className="w-7 h-7 rounded-lg bg-amber-500/30 text-amber-200 flex items-center justify-center flex-shrink-0">
                                <Layers size={13} />
                            </div>
                            <div className="min-w-0">
                                <div className="text-[9px] uppercase font-bold text-blue-200 tracking-wider">
                                    Status
                                </div>
                                <div className="mt-0.5">
                                    <span className="bg-white text-emerald-600 font-black text-[9.5px] px-2 py-0.5 rounded shadow-2xs uppercase">
                                        {booking.status || 'CONFIRMED'}
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Row 2: Arrival, Nights, Departure */}
                    <div className="grid grid-cols-12 gap-2">
                        {/* Arrival */}
                        <div className="col-span-5 bg-[#1942aa]/80 border border-blue-400/20 rounded-xl p-2 flex items-center gap-2 shadow-2xs">
                            <div className="w-6 h-6 rounded bg-emerald-500/30 text-emerald-200 flex items-center justify-center flex-shrink-0">
                                <Calendar size={12} />
                            </div>
                            <div className="min-w-0">
                                <div className="text-[8.5px] uppercase font-bold text-blue-200">ARRIVAL</div>
                                <div className="text-[11.5px] font-bold text-white truncate">{booking.arrivalDate}</div>
                                <div className="text-[8.5px] text-blue-200 flex items-center gap-1">
                                    <span>🕒 16:00:00</span>
                                </div>
                            </div>
                        </div>

                        {/* Nights */}
                        <div className="col-span-2 bg-[#1942aa]/80 border border-blue-400/20 rounded-xl p-1.5 flex flex-col items-center justify-center text-center shadow-2xs">
                            <div className="text-[8px] uppercase font-bold text-blue-200">NIGHTS</div>
                            <div className="text-base font-black text-white font-mono leading-none mt-0.5">
                                {booking.nights}
                            </div>
                        </div>

                        {/* Departure */}
                        <div className="col-span-5 bg-[#1942aa]/80 border border-blue-400/20 rounded-xl p-2 flex items-center gap-2 shadow-2xs">
                            <div className="w-6 h-6 rounded bg-rose-500/30 text-rose-200 flex items-center justify-center flex-shrink-0">
                                <Calendar size={12} />
                            </div>
                            <div className="min-w-0">
                                <div className="text-[8.5px] uppercase font-bold text-blue-200">DEPARTURE</div>
                                <div className="text-[11.5px] font-bold text-white truncate">{booking.departureDate}</div>
                                <div className="text-[8.5px] text-blue-200 flex items-center gap-1">
                                    <span>🕒 12:00:00</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Row 3: Room Details & Rate Plan */}
                    <div className="grid grid-cols-2 gap-2">
                        <div className="bg-[#1942aa]/80 border border-blue-400/20 rounded-xl p-2.5 flex items-center gap-2.5 shadow-2xs">
                            <div className="w-7 h-7 rounded-lg bg-indigo-500/30 text-indigo-200 flex items-center justify-center flex-shrink-0">
                                <Home size={13} />
                            </div>
                            <div className="min-w-0">
                                <div className="text-[9px] uppercase font-bold text-blue-200 tracking-wider">
                                    Room Details
                                </div>
                                <div className="text-xs font-bold text-white truncate">
                                    {booking.roomNumber} ({booking.roomType || 'Winter Rate Plan'})
                                </div>
                            </div>
                        </div>

                        <div className="bg-[#1942aa]/80 border border-blue-400/20 rounded-xl p-2.5 flex items-center gap-2.5 shadow-2xs">
                            <div className="w-7 h-7 rounded-lg bg-amber-500/30 text-amber-200 flex items-center justify-center flex-shrink-0">
                                <Printer size={13} />
                            </div>
                            <div className="min-w-0">
                                <div className="text-[9px] uppercase font-bold text-blue-200 tracking-wider">
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
                        <div className="bg-[#1942aa]/80 border border-blue-400/20 rounded-xl p-2.5 flex items-center gap-2.5 shadow-2xs">
                            <div className="w-7 h-7 rounded-lg bg-cyan-500/30 text-cyan-200 flex items-center justify-center flex-shrink-0">
                                <Users size={13} />
                            </div>
                            <div className="min-w-0">
                                <div className="text-[9px] uppercase font-bold text-blue-200 tracking-wider">
                                    Guests (Pax)
                                </div>
                                <div className="text-xs font-bold text-white truncate">
                                    2 Adults, 1 Child
                                </div>
                            </div>
                        </div>

                        <div className="bg-[#1942aa]/80 border border-blue-400/20 rounded-xl p-2.5 flex items-center gap-2.5 shadow-2xs">
                            <div className="w-7 h-7 rounded-lg bg-emerald-500/30 text-emerald-200 flex items-center justify-center flex-shrink-0">
                                <DollarSign size={13} />
                            </div>
                            <div className="min-w-0">
                                <div className="text-[9px] uppercase font-bold text-blue-200 tracking-wider">
                                    Avg Daily Rate
                                </div>
                                <div className="text-xs font-bold text-white font-mono">
                                    {dailyRate.toFixed(2)}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Financial Summary Container */}
                    <div className="bg-[#1942aa]/80 border border-blue-400/20 rounded-xl p-3 space-y-2 text-xs shadow-2xs">
                        <div className="flex items-center justify-between text-blue-100 text-xs">
                            <div className="flex items-center gap-2">
                                <div className="w-5 h-5 rounded bg-blue-500/30 flex items-center justify-center text-blue-200">
                                    <Calculator size={11} />
                                </div>
                                <span>Room Total Amount</span>
                            </div>
                            <span className="font-mono font-bold text-white text-xs">{totalAmount.toFixed(2)}</span>
                        </div>

                        <div className="flex items-center justify-between text-blue-100 text-xs">
                            <div className="flex items-center gap-2">
                                <div className="w-5 h-5 rounded bg-rose-500/30 flex items-center justify-center text-rose-300">
                                    <DollarSign size={11} />
                                </div>
                                <span>Room Discount</span>
                            </div>
                            <span className="font-mono font-bold text-rose-300 text-xs">0.00</span>
                        </div>

                        <div className="flex items-center justify-between text-blue-100 text-xs">
                            <div className="flex items-center gap-2">
                                <div className="w-5 h-5 rounded bg-emerald-500/30 flex items-center justify-center text-emerald-300">
                                    <CreditCard size={11} />
                                </div>
                                <span>Room Paid Amount</span>
                            </div>
                            <span className="font-mono font-bold text-emerald-300 text-xs">0.00</span>
                        </div>
                    </div>

                    {/* Separate Room Net Balance Highlight Card */}
                    <div className="bg-[#1942aa]/80 border border-blue-400/20 rounded-xl p-3 flex items-center justify-between font-bold shadow-2xs">
                        <div className="flex items-center gap-2.5 text-white">
                            <div className="w-6 h-6 rounded bg-emerald-500/30 flex items-center justify-center text-emerald-400 flex-shrink-0">
                                <Wallet size={13} />
                            </div>
                            <span className="text-xs font-bold tracking-tight">Room Net Balance</span>
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
