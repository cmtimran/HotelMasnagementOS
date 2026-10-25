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
    Settings,
    CalendarPlus,
    CalendarX,
    CircleSlash,
    Hand,
    GitFork,
    DoorOpen,
    DoorClosed,
    RefreshCw,
    Crown,
    Info,
    Plus,
    Lock,
    ShieldCheck
} from 'lucide-react';
import type { AmendBookingData } from './AmendStayModal';
import { calculateReservationTaxes } from '../../utils/taxCalculationEngine';
import { getStandardDailyRateForRoom, getAvailableRoomsForStay } from '../../utils/roomInventoryEngine';
import { toast } from '../../context/ToastContext';

export type DrawerMode =
    | 'overview'
    | 'amend'
    | 'move'
    | 'payment'
    | 'split'
    | 'stop_move'
    | 'add_booking'
    | 'cancel'
    | 'void'
    | 'hold'
    | 'unassign'
    | 'ungroup'
    | 'change_owner';

export interface ReservationActionDrawerProps {
    isOpen: boolean;
    onClose: () => void;
    booking: AmendBookingData | null;
    initialMode?: DrawerMode;
    allRooms?: Array<{ id?: string; roomNumber: string; type: string; status: string }>;
    initialTargetDeparture?: string;
    initialTargetNights?: number;
    initialTargetRoomNumber?: string;
    // Core PMS Action Handlers
    onSaveAmendStay?: (bookingId: string, newDeparture: string, newNights: number) => void;
    onSaveRoomMove?: (bookingId: string, newRoomNumber: string, newFromDate: string, newToDate: string) => void;
    onSavePayment?: (bookingId: string, method: string, amount: number, remarks: string) => void;
    onSaveRoomSplit?: (bookingId: string, targetRoomNumber: string, fromDate: string, toDate: string) => void;
    onStopRoomMove?: (bookingId: string, allowRoomMove: boolean) => void;
    onProceedNewBooking?: (bookingId: string, ownerFolio: string, groupOwner: string) => void;
    onConfirmCancel?: (bookingId: string, fee: number, refund: number, reason: string) => void;
    onConfirmVoid?: (bookingId: string, reason: string) => void;
    onConfirmHold?: (bookingId: string, startDate: string, endDate: string, reason: string) => void;
    onConfirmUnassign?: (bookingId: string, roomNumber: string) => void;
    onConfirmUngroup?: (bookingId: string, selectedRooms: string[]) => void;
    onConfirmChangeOwner?: (bookingId: string, newOwner: string) => void;
    onEdit?: (booking: AmendBookingData) => void;
}

export const ReservationActionDrawer: React.FC<ReservationActionDrawerProps> = ({
    isOpen,
    onClose,
    booking,
    initialMode = 'overview',
    allRooms = [],
    initialTargetDeparture,
    initialTargetNights,
    initialTargetRoomNumber,
    onSaveAmendStay,
    onSaveRoomMove,
    onSavePayment,
    onSaveRoomSplit,
    onStopRoomMove,
    onProceedNewBooking,
    onConfirmCancel,
    onConfirmVoid,
    onConfirmHold,
    onConfirmUnassign,
    onConfirmUngroup,
    onConfirmChangeOwner,
    onEdit
}) => {
    // Current Active Mode State
    const [mode, setMode] = useState<DrawerMode>(initialMode);
    const [isOptionsOpen, setIsOptionsOpen] = useState(false);

    // Synchronize mode when initialMode or booking changes
    useEffect(() => {
        if (isOpen) {
            setMode(initialMode);
            setIsOptionsOpen(false);
        }
    }, [isOpen, initialMode, booking?.id]);

    // =========================================================================
    // LOCAL FORM STATES FOR ALL 12 MODES
    // =========================================================================

    // 1. Amend Stay Form States
    const [amendSelectedRoom, setAmendSelectedRoom] = useState(true);
    const [departureDate, setDepartureDate] = useState<string>('');
    const [nights, setNights] = useState<number>(1);

    // 2. Room Move Form States
    const [moveSelectedRoom, setMoveSelectedRoom] = useState<string>('');
    const [moveFromDate, setMoveFromDate] = useState<string>('');
    const [moveToDate, setToDate] = useState<string>('');
    const [moveRoomType, setMoveRoomType] = useState<string>('Winter Rate Plan');
    const [moveRateType, setMoveRateType] = useState<string>('Summer Vacation');

    // 3. Add Payment Form States
    const [paymentFolio, setPaymentFolio] = useState<string>('');
    const [paymentMethod, setPaymentMethod] = useState<string>('Cash');
    const [paymentAmount, setPaymentAmount] = useState<number>(0);
    const [paymentRemarks, setPaymentRemarks] = useState<string>('');

    // 4. Room Split Form States
    const [splitRoom, setSplitRoom] = useState<string>('');
    const [splitFromDate, setSplitFromDate] = useState<string>('');
    const [splitToDate, setSplitToDate] = useState<string>('');

    // 5. Stop Room Move Form States
    const [allowRoomMove, setAllowRoomMove] = useState(true);

    // 6. Add New Booking Form States
    const [newBookingFolio, setNewBookingFolio] = useState<string>('');
    const [newBookingGroupOwner, setNewBookingGroupOwner] = useState<string>('');

    // 7. Cancel Reservation Form States
    const [cancelScope, setCancelScope] = useState<'full' | 'room'>('full');
    const [cancelFee, setCancelFee] = useState<number>(1200);
    const [cancelRefund, setCancelRefund] = useState<number>(0);
    const [cancelReason, setCancelReason] = useState<string>('');

    // 8. Void Reservation Form States
    const [voidScope, setVoidScope] = useState<'group' | 'selected'>('group');
    const [voidReason, setVoidReason] = useState<string>('');

    // 9. Reservation Hold Form States
    const [holdStartDate, setHoldStartDate] = useState<string>('');
    const [holdEndDate, setHoldEndDate] = useState<string>('');
    const [holdReason, setHoldReason] = useState<string>('');

    // 10. Unassign Room Form States
    const [unassignRoom, setUnassignRoom] = useState<string>('');

    // 11. Ungroup Reservation Form States
    const [ungroupScope, setUngroupScope] = useState<'group' | 'selected'>('selected');
    const [selectedUngroupRooms, setSelectedUngroupRooms] = useState<string[]>([]);

    // 12. Change Group Owner Form States
    const [selectedNewOwner, setSelectedNewOwner] = useState<string>('');

    // Hydrate form states when booking loads
    useEffect(() => {
        if (booking) {
            const arr = booking.arrivalDate || '2026-07-01';
            const dep = initialTargetDeparture || booking.departureDate || '2026-07-03';
            const n = initialTargetNights || booking.nights || 2;
            const daily = booking.avgDailyRate || getStandardDailyRateForRoom(booking.roomNumber, booking.roomType);
            const total = booking.totalAmount !== undefined ? booking.totalAmount : (n * daily);
            const due = booking.dueAmount !== undefined 
                ? booking.dueAmount 
                : Math.max(0, total - (booking.paidAmount || 0));

            setDepartureDate(dep);
            setNights(n);
            setAmendSelectedRoom(true);

            setMoveSelectedRoom(initialTargetRoomNumber || booking.roomNumber);
            setMoveFromDate(arr);
            setToDate(dep);
            setMoveRoomType(booking.roomType || 'Winter Rate Plan');
            setMoveRateType(booking.ratePlan || 'Summer Vacation');

            setPaymentFolio(`${booking.guestName} - FOL-${booking.reservationNumber}`);
            setPaymentMethod('Cash');
            setPaymentAmount(due > 0 ? due : total);
            setPaymentRemarks('');

            setSplitRoom(booking.roomNumber);
            setSplitFromDate(arr);
            setSplitToDate(dep);

            setAllowRoomMove(true);

            setNewBookingFolio(`FN~012607004 - ${booking.guestName}`);
            setNewBookingGroupOwner(`${booking.guestName} (${booking.roomNumber})`);

            setCancelScope('full');
            setCancelFee(1200);
            setCancelRefund(0);
            setCancelReason('');

            setVoidScope('group');
            setVoidReason('');

            setHoldStartDate(arr);
            setHoldEndDate(dep);
            setHoldReason('');

            setUnassignRoom(booking.roomNumber);
            setSelectedUngroupRooms([booking.roomNumber]);
            setSelectedNewOwner(`${booking.guestName} - ${booking.roomNumber} (Current Owner)`);
        }
    }, [booking, initialTargetDeparture, initialTargetNights, initialTargetRoomNumber]);

    if (!isOpen || !booking) return null;

    const isTaxApplicable = booking.taxApplicable !== false;
    const taxConfigId = booking.taxConfigId;
    const taxConfigCode = booking.taxConfigCode || 'HOSP-STD';
    
    // Original values from booking record
    const origNights = booking.nights || 1;
    const standardDaily = booking.avgDailyRate || getStandardDailyRateForRoom(booking.roomNumber, booking.roomType);
    const origTotal = booking.totalAmount !== undefined ? booking.totalAmount : (origNights * standardDaily);
    const origTax = booking.totalTaxAmount !== undefined ? booking.totalTaxAmount : 0;
    const origBase = booking.baseAmount !== undefined ? booking.baseAmount : Math.max(0, origTotal - origTax);
    const dailyBaseRate = Math.max(0, Math.round(origBase / Math.max(1, origNights)));

    // When amending stay nights, calculate dynamic stay totals using central taxCalculationEngine
    const isAmendingNights = mode === 'amend' && nights !== origNights;
    const currentBaseAmount = isAmendingNights ? (dailyBaseRate * nights) : origBase;
    
    // Evaluate taxes with central taxCalculationEngine
    const activeTaxCalc = isAmendingNights 
        ? calculateReservationTaxes(currentBaseAmount, isTaxApplicable, taxConfigId)
        : (booking.taxDetails || calculateReservationTaxes(currentBaseAmount, isTaxApplicable, taxConfigId));

    const totalAmount = isAmendingNights ? activeTaxCalc.grandTotal : origTotal;
    const paidAmount = Number(booking.paidAmount || 0);
    const dueAmount = isAmendingNights 
        ? Math.max(0, totalAmount - paidAmount) 
        : (booking.dueAmount !== undefined ? booking.dueAmount : Math.max(0, totalAmount - paidAmount));
    const serviceCharge = activeTaxCalc.serviceChargeAmount || 0;
    const vatAmount = activeTaxCalc.vatAmount || 0;
    const otherTax = activeTaxCalc.otherTaxesAmount || 0;
    const totalTax = activeTaxCalc.totalTaxAmount || 0;
    const baseAmount = currentBaseAmount;
    const dailyRate = Math.round(baseAmount / Math.max(1, nights));

    // Handle departure change in amend mode (with overbooking collision guard)
    const handleDepartureChange = (newDep: string) => {
        if (!booking?.arrivalDate) return;
        const start = new Date(booking.arrivalDate);
        const end = new Date(newDep);
        const diff = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
        if (diff < 1) {
            toast.warning('Departure date must be at least 1 night after arrival date.');
            return;
        }
        const avail = getAvailableRoomsForStay(booking.arrivalDate, newDep, undefined, {
            excludeReservationId: booking.reservationNumber || booking.id
        });
        const rmStatus = avail.allRoomsStatus.find(s => String(s.room.number) === String(booking.roomNumber));
        if (rmStatus && !rmStatus.isAvailable && rmStatus.conflictingReservation) {
            const cr = rmStatus.conflictingReservation;
            toast.error(`Cannot extend Room ${booking.roomNumber}: Already booked by ${cr.guestName} (${cr.reservationNumber}) from ${cr.checkIn}!`);
            return;
        }
        setDepartureDate(newDep);
        setNights(diff);
    };

    // Handle nights change in amend mode (with overbooking collision guard)
    const handleNightsChange = (newNights: number) => {
        const n = Math.max(1, newNights);
        if (!booking?.arrivalDate) return;
        const start = new Date(booking.arrivalDate);
        start.setDate(start.getDate() + n);
        const candidateDep = start.toISOString().split('T')[0];

        const avail = getAvailableRoomsForStay(booking.arrivalDate, candidateDep, undefined, {
            excludeReservationId: booking.reservationNumber || booking.id
        });
        const rmStatus = avail.allRoomsStatus.find(s => String(s.room.number) === String(booking.roomNumber));
        if (rmStatus && !rmStatus.isAvailable && rmStatus.conflictingReservation) {
            const cr = rmStatus.conflictingReservation;
            toast.error(`Cannot extend Room ${booking.roomNumber}: Already booked by ${cr.guestName} (${cr.reservationNumber}) from ${cr.checkIn}!`);
            return;
        }
        setNights(n);
        setDepartureDate(candidateDep);
    };

    // Primary Action Execution based on active mode
    const handlePrimaryAction = () => {
        switch (mode) {
            case 'amend': {
                const avail = getAvailableRoomsForStay(booking.arrivalDate, departureDate, undefined, {
                    excludeReservationId: booking.reservationNumber || booking.id
                });
                const rmStatus = avail.allRoomsStatus.find(s => String(s.room.number) === String(booking.roomNumber));
                if (rmStatus && !rmStatus.isAvailable && rmStatus.conflictingReservation) {
                    const cr = rmStatus.conflictingReservation;
                    toast.error(`Cannot extend Room ${booking.roomNumber}: Already booked by ${cr.guestName} (${cr.reservationNumber}) from ${cr.checkIn}!`);
                    return;
                }
                if (onSaveAmendStay) onSaveAmendStay(booking.id, departureDate, nights);
                break;
            }
            case 'move': {
                const avail = getAvailableRoomsForStay(moveFromDate, moveToDate, undefined, {
                    excludeReservationId: booking.reservationNumber || booking.id
                });
                const rmStatus = avail.allRoomsStatus.find(s => String(s.room.number) === String(moveSelectedRoom));
                if (rmStatus && !rmStatus.isAvailable) {
                    const cr = rmStatus.conflictingReservation;
                    toast.error(
                        cr
                            ? `Cannot move to Room ${moveSelectedRoom}: Already booked by ${cr.guestName} (${cr.reservationNumber}) from ${cr.checkIn} to ${cr.checkOut}!`
                            : `Cannot move to Room ${moveSelectedRoom}: Room is ${rmStatus.reason || 'unavailable'}!`
                    );
                    return;
                }
                if (onSaveRoomMove) onSaveRoomMove(booking.id, moveSelectedRoom, moveFromDate, moveToDate);
                break;
            }
            case 'payment':
                if (onSavePayment) onSavePayment(booking.id, paymentMethod, paymentAmount, paymentRemarks);
                break;
            case 'split': {
                const avail = getAvailableRoomsForStay(splitFromDate, splitToDate, undefined, {
                    excludeReservationId: booking.reservationNumber || booking.id
                });
                const rmStatus = avail.allRoomsStatus.find(s => String(s.room.number) === String(splitRoom));
                if (rmStatus && !rmStatus.isAvailable && String(splitRoom) !== String(booking.roomNumber)) {
                    const cr = rmStatus.conflictingReservation;
                    toast.error(
                        cr
                            ? `Cannot split into Room ${splitRoom}: Already booked by ${cr.guestName} (${cr.reservationNumber})!`
                            : `Cannot split into Room ${splitRoom}: Room is ${rmStatus.reason || 'unavailable'}!`
                    );
                    return;
                }
                if (onSaveRoomSplit) onSaveRoomSplit(booking.id, splitRoom, splitFromDate, splitToDate);
                break;
            }
            case 'stop_move':
                if (onStopRoomMove) onStopRoomMove(booking.id, allowRoomMove);
                break;
            case 'add_booking':
                if (onProceedNewBooking) onProceedNewBooking(booking.id, newBookingFolio, newBookingGroupOwner);
                break;
            case 'cancel':
                if (onConfirmCancel) onConfirmCancel(booking.id, cancelFee, cancelRefund, cancelReason);
                break;
            case 'void':
                if (onConfirmVoid) onConfirmVoid(booking.id, voidReason);
                break;
            case 'hold':
                if (onConfirmHold) onConfirmHold(booking.id, holdStartDate, holdEndDate, holdReason);
                break;
            case 'unassign':
                if (onConfirmUnassign) onConfirmUnassign(booking.id, unassignRoom);
                break;
            case 'ungroup':
                if (onConfirmUngroup) onConfirmUngroup(booking.id, selectedUngroupRooms);
                break;
            case 'change_owner':
                if (onConfirmChangeOwner) onConfirmChangeOwner(booking.id, selectedNewOwner);
                break;
            default:
                break;
        }
        onClose();
    };

    // Dynamic Labels & Titles for active mode
    const getModeMeta = () => {
        switch (mode) {
            case 'amend':
                return { title: 'Amend Stay', buttonText: 'Save Changes', buttonIcon: <Edit3 size={13} />, buttonClass: 'bg-[#1a73e8] hover:bg-blue-600' };
            case 'move':
                return { title: 'Room Move', buttonText: 'Save Room Move', buttonIcon: <Home size={13} />, buttonClass: 'bg-[#1a73e8] hover:bg-blue-600' };
            case 'payment':
                return { title: 'Add Payment', buttonText: 'Save Payment', buttonIcon: <CreditCard size={13} />, buttonClass: 'bg-[#1a73e8] hover:bg-blue-600' };
            case 'split':
                return { title: 'Room Split', buttonText: 'Save Room Split', buttonIcon: <GitFork size={13} />, buttonClass: 'bg-[#1a73e8] hover:bg-blue-600' };
            case 'stop_move':
                return { title: 'Stop Room Move', buttonText: 'Submit', buttonIcon: <Hand size={13} />, buttonClass: 'bg-[#1a73e8] hover:bg-blue-600' };
            case 'add_booking':
                return { title: 'Add New Booking', buttonText: 'Proceed to Full Form', buttonIcon: <CalendarPlus size={13} />, buttonClass: 'bg-[#1a73e8] hover:bg-blue-600' };
            case 'cancel':
                return { title: 'Cancel Reservation', buttonText: 'Confirm Cancellation', buttonIcon: <CalendarX size={13} />, buttonClass: 'bg-[#1a73e8] hover:bg-blue-600' };
            case 'void':
                return { title: 'Void Reservation', buttonText: 'Confirm Void', buttonIcon: <CircleSlash size={13} />, buttonClass: 'bg-[#c62828] hover:bg-red-700' };
            case 'hold':
                return { title: 'Reservation Hold', buttonText: 'Confirm Hold', buttonIcon: <CircleSlash size={13} />, buttonClass: 'bg-[#1a73e8] hover:bg-blue-600' };
            case 'unassign':
                return { title: 'Unassign Room', buttonText: 'Submit', buttonIcon: <DoorClosed size={13} />, buttonClass: 'bg-[#1a73e8] hover:bg-blue-600' };
            case 'ungroup':
                return { title: 'Ungroup Reservation', buttonText: 'Confirm Ungroup', buttonIcon: <RefreshCw size={13} />, buttonClass: 'bg-[#1a73e8] hover:bg-blue-600' };
            case 'change_owner':
                return { title: 'Change Group Owner', buttonText: 'Confirm Change', buttonIcon: <RefreshCw size={13} />, buttonClass: 'bg-[#1a73e8] hover:bg-blue-600' };
            default:
                return { title: 'Reservation Details', buttonText: 'Close', buttonIcon: null, buttonClass: 'bg-[#1a73e8] hover:bg-blue-600' };
        }
    };

    const modeMeta = getModeMeta();
    const isSingleColumn = mode === 'overview';

    // 9 Standard Options List (matching media_1792542819332_c56d27e8.png)
    const optionsList = [
        { key: 'payment', label: 'Add Payment', icon: CreditCard },
        { key: 'amend', label: 'Amend Stay', icon: Calendar },
        { key: 'move', label: 'Room Move', icon: DoorOpen },
        { key: 'split', label: 'Room Split', icon: GitFork },
        { key: 'stop_move', label: 'Stop Room Move', icon: Hand },
        { key: 'add_booking', label: 'Add New Booking', icon: CalendarPlus },
        { key: 'cancel', label: 'Cancel Reservation', icon: CalendarX },
        { key: 'hold', label: 'Reservation Hold', icon: CircleSlash },
        { key: 'unassign', label: 'Unassign', icon: DoorClosed },
        { key: 'void', label: 'Void Reservation', icon: CircleSlash },
        { key: 'ungroup', label: 'Ungroup Reservation', icon: RefreshCw },
        { key: 'change_owner', label: 'Change Group Owner', icon: Crown }
    ];

    return createPortal(
        <div className="fixed inset-0 z-[99999] overflow-hidden select-none font-sans">
            {/* Backdrop Overlay */}
            <div
                className="fixed inset-0 bg-black/40 backdrop-blur-[1px] transition-opacity animate-in fade-in duration-200"
                onClick={onClose}
            />

            {/* Right-Side Docked Reusable Drawer */}
            <div
                className={`fixed top-0 bottom-0 right-0 ${
                    isSingleColumn
                        ? 'w-full sm:w-[470px] md:w-[490px] lg:w-[480px]'
                        : 'w-full md:w-[62%] lg:w-[58%] min-w-[700px] max-w-[960px]'
                } bg-[#0e3592] text-white shadow-2xl flex flex-col border-l border-blue-900 animate-in slide-in-from-right duration-200 z-[100000]`}
            >
                {/* 1. White Top Header Bar with Edit & Dynamic Action Dropdown */}
                <div className="px-3.5 py-2.5 bg-white border-b border-gray-200 flex items-center justify-between flex-shrink-0">
                    {/* Left: Close X, User Icon, Guest Name, Status */}
                    <div className="flex items-center gap-2.5 min-w-0">
                        <button
                            type="button"
                            onClick={onClose}
                            className="p-1 hover:bg-gray-100 rounded text-gray-500 hover:text-gray-900 transition-colors cursor-pointer flex-shrink-0"
                            title="Close"
                        >
                            <X size={17} />
                        </button>
                        <div className="w-6 h-6 rounded-full bg-blue-100 text-blue-900 flex items-center justify-center font-bold flex-shrink-0">
                            <Users size={14} />
                        </div>
                        <span className="font-extrabold text-gray-900 text-sm tracking-wide uppercase truncate font-sans">
                            {booking.guestName}
                        </span>
                        <span className="bg-emerald-100 text-emerald-800 font-extrabold text-[9.5px] px-2 py-0.5 rounded uppercase shadow-2xs ml-1">
                            {booking.status || 'CONFIRMED'}
                        </span>
                    </div>

                    {/* Right: Top Action Buttons (Edit + Dynamic Action Dropdown) */}
                    <div className="flex items-center gap-1.5 flex-shrink-0">
                        <button
                            type="button"
                            disabled={Boolean(booking?.isPast)}
                            onClick={() => {
                                if (booking?.isPast) return;
                                if (onEdit) onEdit(booking);
                                else setMode('amend');
                            }}
                            className={`h-7 px-2.5 rounded text-xs font-bold flex items-center gap-1 shadow-2xs transition-colors ${
                                booking?.isPast
                                    ? 'bg-gray-100 text-gray-400 border border-gray-200 cursor-not-allowed opacity-60'
                                    : 'bg-white hover:bg-gray-50 text-[#0e3592] border border-blue-300/80 cursor-pointer'
                            }`}
                            title={booking?.isPast ? 'Historical reservations cannot be edited' : 'Edit reservation'}
                        >
                            <Edit3 size={11} className={booking?.isPast ? 'text-gray-400' : 'text-[#0e3592]'} />
                            <span>Edit</span>
                        </button>

                        <div className="relative">
                            <button
                                type="button"
                                disabled={Boolean(booking?.isPast)}
                                onClick={() => {
                                    if (booking?.isPast) return;
                                    setIsOptionsOpen(!isOptionsOpen);
                                }}
                                className={`h-7 px-2.5 rounded text-xs font-bold flex items-center gap-1.5 shadow-2xs transition-colors ${
                                    booking?.isPast
                                        ? 'bg-gray-100 text-gray-400 border border-gray-200 cursor-not-allowed opacity-60'
                                        : 'bg-white hover:bg-gray-50 text-[#0e3592] border border-blue-300/80 cursor-pointer'
                                }`}
                                title={booking?.isPast ? 'Historical reservations cannot be modified' : 'Options & Actions'}
                            >
                                {booking?.isPast ? (
                                    <>
                                        <Lock size={11} className="text-gray-400" />
                                        <span>Read Only</span>
                                    </>
                                ) : mode === 'overview' ? (
                                    <>
                                        <Settings size={11} className="text-[#0e3592]" />
                                        <span>Options</span>
                                        <ChevronDown size={11} className={`transition-transform duration-200 ${isOptionsOpen ? 'rotate-180' : ''}`} />
                                    </>
                                ) : (
                                    <>
                                        <span className="text-blue-700 font-extrabold">{modeMeta.title}</span>
                                        <ChevronDown size={11} className={`transition-transform duration-200 ${isOptionsOpen ? 'rotate-180' : ''}`} />
                                    </>
                                )}
                            </button>

                            {/* Dropdown Menu (all 12 PMS Actions matching screenshots) */}
                            {isOptionsOpen && (
                                <div className="absolute right-0 top-full mt-1.5 w-54 bg-white rounded-md shadow-2xl border border-gray-200 py-1 z-[100002] text-gray-800 animate-in fade-in zoom-in-95 duration-100 max-h-[440px] overflow-y-auto">
                                    {optionsList.map(opt => {
                                        const IconComponent = opt.icon;
                                        const isActive = mode === opt.key;
                                        return (
                                            <button
                                                key={opt.key}
                                                type="button"
                                                onClick={() => {
                                                    setIsOptionsOpen(false);
                                                    setMode(opt.key as DrawerMode);
                                                }}
                                                className={`w-full px-3.5 py-1.5 text-left text-xs font-medium hover:bg-gray-100 flex items-center gap-2.5 cursor-pointer transition-colors ${
                                                    isActive ? 'bg-blue-50 text-blue-700 font-bold' : 'text-gray-800'
                                                }`}
                                            >
                                                <IconComponent size={14} className={isActive ? 'text-blue-600' : 'text-gray-600'} />
                                                <span className="truncate">{opt.label}</span>
                                            </button>
                                        );
                                    })}
                                    <div className="h-px bg-gray-100 my-1" />
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setIsOptionsOpen(false);
                                            setMode('overview');
                                        }}
                                        className="w-full px-3.5 py-1.5 text-left text-xs font-medium hover:bg-gray-100 text-gray-500 flex items-center gap-2.5 cursor-pointer"
                                    >
                                        <Layers size={13} className="text-gray-400" />
                                        <span>Reset to Overview</span>
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Audit Lock Historical Warning Banner */}
                {booking.isPast && (
                    <div className="bg-amber-50 border-b border-amber-200 px-3.5 py-2 flex items-center gap-2.5 text-amber-950 text-xs flex-shrink-0 animate-in fade-in duration-150">
                        <div className="w-5 h-5 rounded-full bg-amber-200 text-amber-900 flex items-center justify-center flex-shrink-0">
                            <Lock size={12} />
                        </div>
                        <div className="min-w-0">
                            <span className="font-extrabold text-[11px] uppercase tracking-wide text-amber-900 mr-1.5">
                                Audit Locked (Read Only):
                            </span>
                            <span className="text-[10.5px] text-amber-800">
                                This reservation is in past dates. Historical records cannot be modified or moved for audit & financial compliance.
                            </span>
                        </div>
                    </div>
                )}

                {/* 2. Drawer Body */}
                {isSingleColumn ? (
                    /* SINGLE-COLUMN OVERVIEW (matching media_1792541210487_8b5ecb8d.png) */
                    <div className="flex-1 overflow-y-auto p-3.5 space-y-2.5 bg-[#0e3592]">
                        {/* Row 1: Reservation # & Status */}
                        <div className="grid grid-cols-2 gap-2">
                            <div className="bg-[#1942aa]/80 border border-blue-400/20 rounded-xl p-2.5 flex items-center gap-2 shadow-2xs">
                                <div className="w-6 h-6 rounded bg-blue-500/30 text-blue-200 flex items-center justify-center font-bold text-xs flex-shrink-0">
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

                            <div className="bg-[#1942aa]/80 border border-blue-400/20 rounded-xl p-2.5 flex items-center gap-2 shadow-2xs">
                                <div className="w-6 h-6 rounded bg-amber-500/30 text-amber-200 flex items-center justify-center flex-shrink-0">
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
                            <div className="col-span-5 bg-[#1942aa]/80 border border-blue-400/20 rounded-xl p-2 flex items-center gap-2 shadow-2xs">
                                <div className="w-6 h-6 rounded bg-emerald-500/30 text-emerald-200 flex items-center justify-center flex-shrink-0">
                                    <Calendar size={12} />
                                </div>
                                <div className="min-w-0">
                                    <div className="text-[8.5px] uppercase font-bold text-blue-200">ARRIVAL</div>
                                    <div className="text-[11.5px] font-bold text-white truncate">{booking.arrivalDate}</div>
                                    <div className="text-[8.5px] text-blue-200">🕒 16:00:00</div>
                                </div>
                            </div>

                            <div className="col-span-2 bg-[#1942aa]/80 border border-blue-400/20 rounded-xl p-1.5 flex flex-col items-center justify-center text-center shadow-2xs">
                                <div className="text-[8px] uppercase font-bold text-blue-200">NIGHTS</div>
                                <div className="text-base font-black text-white font-mono leading-none">{nights}</div>
                            </div>

                            <div className="col-span-5 bg-[#1942aa]/80 border border-blue-400/20 rounded-xl p-2 flex items-center gap-2 shadow-2xs">
                                <div className="w-6 h-6 rounded bg-rose-500/30 text-rose-200 flex items-center justify-center flex-shrink-0">
                                    <Calendar size={12} />
                                </div>
                                <div className="min-w-0">
                                    <div className="text-[8.5px] uppercase font-bold text-blue-200">DEPARTURE</div>
                                    <div className="text-[11.5px] font-bold text-white truncate">{departureDate}</div>
                                    <div className="text-[8.5px] text-blue-200">🕒 12:00:00</div>
                                </div>
                            </div>
                        </div>

                        {/* Row 3: Room Details & Rate Plan */}
                        <div className="grid grid-cols-2 gap-2">
                            <div className="bg-[#1942aa]/80 border border-blue-400/20 rounded-xl p-2.5 flex items-center gap-2 shadow-2xs">
                                <div className="w-6 h-6 rounded bg-indigo-500/30 text-indigo-200 flex items-center justify-center flex-shrink-0">
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

                            <div className="bg-[#1942aa]/80 border border-blue-400/20 rounded-xl p-2.5 flex items-center gap-2 shadow-2xs">
                                <div className="w-6 h-6 rounded bg-amber-500/30 text-amber-200 flex items-center justify-center flex-shrink-0">
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
                            <div className="bg-[#1942aa]/80 border border-blue-400/20 rounded-xl p-2.5 flex items-center gap-2 shadow-2xs">
                                <div className="w-6 h-6 rounded bg-cyan-500/30 text-cyan-200 flex items-center justify-center flex-shrink-0">
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

                            <div className="bg-[#1942aa]/80 border border-blue-400/20 rounded-xl p-2.5 flex items-center gap-2 shadow-2xs">
                                <div className="w-6 h-6 rounded bg-emerald-500/30 text-emerald-200 flex items-center justify-center flex-shrink-0">
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

                        {/* Financial & Statutory Tax Overview Card */}
                        <div className="bg-[#1942aa]/80 border border-blue-400/20 rounded-xl p-3 space-y-2 text-xs shadow-2xs">
                            <div className="flex items-center justify-between text-blue-100 text-xs">
                                <div className="flex items-center gap-2">
                                    <div className="w-5 h-5 rounded bg-blue-500/30 flex items-center justify-center text-blue-200">
                                        <Calculator size={11} />
                                    </div>
                                    <span>Base Room Tariff (Taxable)</span>
                                </div>
                                <span className="font-mono font-bold text-white text-xs">৳ {baseAmount.toFixed(2)}</span>
                            </div>

                            {/* Statutory Tax & VAT Itemized Breakdown */}
                            {isTaxApplicable && totalTax > 0 ? (
                                <div className="bg-black/20 rounded-lg p-2.5 space-y-1.5 border border-blue-400/20 text-[11px]">
                                    <div className="flex items-center justify-between font-bold text-blue-200 pb-1 border-b border-blue-400/20">
                                        <span className="flex items-center gap-1.5">
                                            <ShieldCheck size={12} className="text-emerald-400" />
                                            <span>Statutory Taxes ({taxConfigCode})</span>
                                        </span>
                                        <span className="font-mono text-emerald-300 font-bold">+৳ {totalTax.toFixed(2)}</span>
                                    </div>
                                    {serviceCharge > 0 && (
                                        <div className="flex justify-between text-blue-200/90 text-[10.5px]">
                                            <span>Hotel Service Charge (10%):</span>
                                            <span className="font-mono text-white">+৳ {serviceCharge.toFixed(2)}</span>
                                        </div>
                                    )}
                                    {vatAmount > 0 && (
                                        <div className="flex justify-between text-blue-200/90 text-[10.5px]">
                                            <span>Standard VAT Mushak-6.3 (15%):</span>
                                            <span className="font-mono text-white">+৳ {vatAmount.toFixed(2)}</span>
                                        </div>
                                    )}
                                    {otherTax > 0 && (
                                        <div className="flex justify-between text-blue-200/90 text-[10.5px]">
                                            <span>City Tourism Levy (2%):</span>
                                            <span className="font-mono text-white">+৳ {otherTax.toFixed(2)}</span>
                                        </div>
                                    )}
                                </div>
                            ) : (
                                <div className="flex items-center justify-between text-amber-200 text-[11px] bg-amber-500/10 px-2.5 py-1 rounded border border-amber-400/20">
                                    <span>Tax Policy:</span>
                                    <span className="font-bold">Tax Exempt (৳ 0.00)</span>
                                </div>
                            )}

                            <div className="flex items-center justify-between text-blue-100 text-xs pt-1.5 border-t border-blue-400/20">
                                <div className="flex items-center gap-2 font-bold text-white">
                                    <div className="w-5 h-5 rounded bg-indigo-500/30 flex items-center justify-center text-indigo-300">
                                        <Calculator size={11} />
                                    </div>
                                    <span>Grand Total (Payable)</span>
                                </div>
                                <span className="font-mono font-black text-white text-xs">৳ {totalAmount.toFixed(2)}</span>
                            </div>

                            <div className="flex items-center justify-between text-blue-100 text-xs">
                                <div className="flex items-center gap-2">
                                    <div className="w-5 h-5 rounded bg-emerald-500/30 flex items-center justify-center text-emerald-300">
                                        <CreditCard size={11} />
                                    </div>
                                    <span>Advance / Total Paid</span>
                                </div>
                                <span className="font-mono font-bold text-emerald-300 text-xs">৳ {paidAmount.toFixed(2)}</span>
                            </div>
                        </div>

                        {/* Room Net Balance Highlight Card */}
                        <div className="bg-[#1942aa]/80 border border-blue-400/20 rounded-xl p-3 flex items-center justify-between font-bold shadow-2xs">
                            <div className="flex items-center gap-2.5 text-white">
                                <div className="w-6 h-6 rounded bg-emerald-500/30 flex items-center justify-center text-emerald-400 flex-shrink-0">
                                    <Wallet size={13} />
                                </div>
                                <span className="text-xs font-bold tracking-tight">Net Balance Due</span>
                            </div>
                            <span className={`font-mono font-black text-base ${dueAmount > 0 ? 'text-rose-300' : 'text-emerald-400'}`}>
                                ৳ {dueAmount.toFixed(2)}
                            </span>
                        </div>

                        {/* Single-Column Overview Bottom Footer */}
                        <div className="pt-2 flex items-center justify-end gap-2 border-t border-blue-800/40">
                            <button
                                type="button"
                                onClick={() => window.print()}
                                className="h-8 px-3.5 bg-white/10 hover:bg-white/20 text-white rounded text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
                            >
                                <Printer size={12} />
                                <span>Print Folio</span>
                            </button>
                            <button
                                type="button"
                                onClick={onClose}
                                className="h-8 px-5 bg-white hover:bg-gray-100 text-[#0e3592] rounded text-xs font-bold transition-all cursor-pointer shadow-xs"
                            >
                                Close
                            </button>
                        </div>
                    </div>
                ) : (
                    /* 2-COLUMN VIEW WITH INDEPENDENT SCROLL & FIXED BOTTOM FOOTER */
                    <div className="flex-1 min-h-0 grid grid-cols-12 bg-[#0e3592] overflow-hidden">
                        {/* LEFT COLUMN: Overview & Financial Cards (Independent Scroll) */}
                        <div className="col-span-7 h-full overflow-y-auto p-3.5 space-y-2 border-r border-blue-800/40">
                            {/* Row 1: Reservation # & Status */}
                            <div className="grid grid-cols-2 gap-2">
                                <div className="bg-[#1942aa]/80 border border-blue-400/20 rounded-xl p-2.5 flex items-center gap-2 shadow-2xs">
                                    <div className="w-6 h-6 rounded bg-blue-500/30 text-blue-200 flex items-center justify-center font-bold text-xs flex-shrink-0">
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

                                <div className="bg-[#1942aa]/80 border border-blue-400/20 rounded-xl p-2.5 flex items-center gap-2 shadow-2xs">
                                    <div className="w-6 h-6 rounded bg-amber-500/30 text-amber-200 flex items-center justify-center flex-shrink-0">
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
                                <div className="col-span-5 bg-[#1942aa]/80 border border-blue-400/20 rounded-xl p-2 flex items-center gap-2 shadow-2xs">
                                    <div className="w-6 h-6 rounded bg-emerald-500/30 text-emerald-200 flex items-center justify-center flex-shrink-0">
                                        <Calendar size={12} />
                                    </div>
                                    <div className="min-w-0">
                                        <div className="text-[8.5px] uppercase font-bold text-blue-200">ARRIVAL</div>
                                        <div className="text-[11.5px] font-bold text-white truncate">{booking.arrivalDate}</div>
                                        <div className="text-[8.5px] text-blue-200">🕒 16:00:00</div>
                                    </div>
                                </div>

                                <div className="col-span-2 bg-[#1942aa]/80 border border-blue-400/20 rounded-xl p-1.5 flex flex-col items-center justify-center text-center shadow-2xs">
                                    <div className="text-[8px] uppercase font-bold text-blue-200">NIGHTS</div>
                                    <div className="text-base font-black text-white font-mono leading-none">{nights}</div>
                                </div>

                                <div className="col-span-5 bg-[#1942aa]/80 border border-blue-400/20 rounded-xl p-2 flex items-center gap-2 shadow-2xs">
                                    <div className="w-6 h-6 rounded bg-rose-500/30 text-rose-200 flex items-center justify-center flex-shrink-0">
                                        <Calendar size={12} />
                                    </div>
                                    <div className="min-w-0">
                                        <div className="text-[8.5px] uppercase font-bold text-blue-200">DEPARTURE</div>
                                        <div className="text-[11.5px] font-bold text-white truncate">{departureDate}</div>
                                        <div className="text-[8.5px] text-blue-200">🕒 12:00:00</div>
                                    </div>
                                </div>
                            </div>

                            {/* Row 3: Room Details & Rate Plan */}
                            <div className="grid grid-cols-2 gap-2">
                                <div className="bg-[#1942aa]/80 border border-blue-400/20 rounded-xl p-2.5 flex items-center gap-2 shadow-2xs">
                                    <div className="w-6 h-6 rounded bg-indigo-500/30 text-indigo-200 flex items-center justify-center flex-shrink-0">
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

                                <div className="bg-[#1942aa]/80 border border-blue-400/20 rounded-xl p-2.5 flex items-center gap-2 shadow-2xs">
                                    <div className="w-6 h-6 rounded bg-amber-500/30 text-amber-200 flex items-center justify-center flex-shrink-0">
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
                                <div className="bg-[#1942aa]/80 border border-blue-400/20 rounded-xl p-2.5 flex items-center gap-2 shadow-2xs">
                                    <div className="w-6 h-6 rounded bg-cyan-500/30 text-cyan-200 flex items-center justify-center flex-shrink-0">
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

                                <div className="bg-[#1942aa]/80 border border-blue-400/20 rounded-xl p-2.5 flex items-center gap-2 shadow-2xs">
                                    <div className="w-6 h-6 rounded bg-emerald-500/30 text-emerald-200 flex items-center justify-center flex-shrink-0">
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

                            {/* Financial & Statutory Tax Overview Card */}
                            <div className="bg-[#1942aa]/80 border border-blue-400/20 rounded-xl p-2.5 space-y-1.5 text-xs shadow-2xs">
                                <div className="flex items-center justify-between text-blue-100 text-[11px]">
                                    <div className="flex items-center gap-2">
                                        <div className="w-5 h-5 rounded bg-blue-500/30 flex items-center justify-center text-blue-200">
                                            <Calculator size={11} />
                                        </div>
                                        <span>Base Tariff (Taxable)</span>
                                    </div>
                                    <span className="font-mono font-bold text-white">৳ {baseAmount.toFixed(2)}</span>
                                </div>

                                {/* Statutory Tax & VAT Breakdown */}
                                {isTaxApplicable && totalTax > 0 ? (
                                    <div className="bg-black/20 rounded-lg p-2 space-y-1 border border-blue-400/20 text-[10.5px]">
                                        <div className="flex items-center justify-between font-bold text-blue-200 pb-0.5 border-b border-blue-400/20 text-[10px]">
                                            <span className="flex items-center gap-1">
                                                <ShieldCheck size={11} className="text-emerald-400" />
                                                <span>Taxes &amp; VAT ({taxConfigCode})</span>
                                            </span>
                                            <span className="font-mono text-emerald-300 font-bold">+৳ {totalTax.toFixed(2)}</span>
                                        </div>
                                        {serviceCharge > 0 && (
                                            <div className="flex justify-between text-blue-200/90 text-[10px]">
                                                <span>Service Charge (10%):</span>
                                                <span className="font-mono text-white">+৳ {serviceCharge.toFixed(2)}</span>
                                            </div>
                                        )}
                                        {vatAmount > 0 && (
                                            <div className="flex justify-between text-blue-200/90 text-[10px]">
                                                <span>VAT Mushak-6.3 (15%):</span>
                                                <span className="font-mono text-white">+৳ {vatAmount.toFixed(2)}</span>
                                            </div>
                                        )}
                                    </div>
                                ) : (
                                    <div className="flex items-center justify-between text-amber-200 text-[10px] bg-amber-500/10 px-2 py-0.5 rounded border border-amber-400/20">
                                        <span>Tax Policy:</span>
                                        <span className="font-bold">Tax Exempt</span>
                                    </div>
                                )}

                                <div className="flex items-center justify-between text-blue-100 text-[11px] pt-1 border-t border-blue-400/20 font-bold">
                                    <span className="text-white">Grand Total (Payable)</span>
                                    <span className="font-mono font-black text-white">৳ {totalAmount.toFixed(2)}</span>
                                </div>

                                <div className="flex items-center justify-between text-blue-100 text-[11px]">
                                    <div className="flex items-center gap-2">
                                        <div className="w-5 h-5 rounded bg-emerald-500/30 flex items-center justify-center text-emerald-300">
                                            <CreditCard size={11} />
                                        </div>
                                        <span>Advance Paid</span>
                                    </div>
                                    <span className="font-mono font-bold text-emerald-300">৳ {paidAmount.toFixed(2)}</span>
                                </div>
                            </div>

                            {/* Room Net Balance Highlight Card */}
                            <div className="bg-[#1942aa]/80 border border-blue-400/20 rounded-xl p-2.5 flex items-center justify-between font-bold shadow-2xs">
                                <div className="flex items-center gap-2 text-white">
                                    <div className="w-5 h-5 rounded bg-emerald-500/30 flex items-center justify-center text-emerald-400">
                                        <Wallet size={12} />
                                    </div>
                                    <span className="text-xs">Net Balance Due</span>
                                </div>
                                <span className={`font-mono font-black text-sm ${dueAmount > 0 ? 'text-rose-300' : 'text-emerald-400'}`}>
                                    ৳ {dueAmount.toFixed(2)}
                                </span>
                            </div>
                        </div>

                        {/* RIGHT COLUMN: Active Action Mode Form + Fixed Bottom Action Footer */}
                        <div className="col-span-5 h-full flex flex-col min-h-0 bg-[#0e3592]">
                            {/* Panel Header */}
                            <div className="px-4 py-2.5 flex items-center justify-between border-b border-blue-400/20 flex-shrink-0">
                                <h2 className="text-sm font-bold text-white tracking-wide">{modeMeta.title}</h2>
                                <button
                                    type="button"
                                    onClick={() => setMode('overview')}
                                    className="p-1 text-blue-200 hover:text-white rounded transition-colors cursor-pointer"
                                    title="Close Panel"
                                >
                                    <X size={15} />
                                </button>
                            </div>

                            {/* Scrollable Form Body */}
                            <div className="flex-1 overflow-y-auto p-4 space-y-3 min-h-0">
                                {/* MODE 1: AMEND STAY (media_1792541010797_b7d6f151.png) */}
                                {mode === 'amend' && (
                                    <div className="space-y-3">
                                        <div className="space-y-1">
                                            <div className="flex items-center justify-between text-[11px] font-semibold text-white">
                                                <span>Rooms</span>
                                                <button
                                                    type="button"
                                                    onClick={() => setAmendSelectedRoom(!amendSelectedRoom)}
                                                    className="text-[10px] px-2 py-0.5 border border-white/40 hover:bg-white/10 rounded font-medium text-white transition-colors cursor-pointer"
                                                >
                                                    {amendSelectedRoom ? 'Unselect All' : 'Select All'}
                                                </button>
                                            </div>
                                            <div className="bg-[#1b43aa]/80 border border-blue-400/20 rounded-lg p-2.5 flex items-center gap-2">
                                                <input
                                                    type="checkbox"
                                                    checked={amendSelectedRoom}
                                                    onChange={e => setAmendSelectedRoom(e.target.checked)}
                                                    className="w-3.5 h-3.5 rounded text-blue-600 bg-white cursor-pointer accent-blue-500"
                                                />
                                                <span className="text-xs font-bold text-white font-mono truncate">
                                                    {booking.roomNumber} - {booking.reservationNumber}
                                                </span>
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-2 gap-2 pt-1">
                                            <div className="flex flex-col gap-1">
                                                <label className="text-[10px] font-semibold text-blue-100">Arrival:</label>
                                                <input
                                                    type="date"
                                                    value={booking.arrivalDate}
                                                    disabled
                                                    className="w-full h-8 px-2 border border-blue-400/30 rounded text-[11px] bg-[#122e75] text-gray-300 cursor-not-allowed outline-none font-medium"
                                                />
                                            </div>
                                            <div className="flex flex-col gap-1">
                                                <label className="text-[10px] font-semibold text-white">Departure:</label>
                                                <input
                                                    type="date"
                                                    value={departureDate}
                                                    onChange={e => handleDepartureChange(e.target.value)}
                                                    className="w-full h-8 px-2 border border-blue-300 rounded text-[11px] bg-white text-gray-900 font-bold outline-none focus:ring-2 focus:ring-blue-400 cursor-pointer"
                                                />
                                            </div>
                                        </div>

                                        <div className="flex flex-col gap-1 w-1/2">
                                            <label className="text-[10px] font-semibold text-white">Nights:</label>
                                            <input
                                                type="number"
                                                min={1}
                                                value={nights}
                                                onChange={e => handleNightsChange(Number(e.target.value))}
                                                className="w-full h-8 px-2 border border-blue-300 rounded text-xs bg-white text-gray-900 font-bold outline-none focus:ring-2 focus:ring-blue-400"
                                            />
                                        </div>
                                    </div>
                                )}

                                {/* MODE 2: ROOM MOVE (media_1792541566827_b05dc667.png) */}
                                {mode === 'move' && (
                                    <div className="space-y-3">
                                        <div className="text-xs font-bold text-white">New Room Assignment:</div>
                                        <div className="grid grid-cols-2 gap-2">
                                            <div className="flex flex-col gap-1">
                                                <label className="text-[10px] font-semibold text-blue-100">Select Room</label>
                                                <div className="relative">
                                                    <select
                                                        value={booking.roomNumber}
                                                        disabled
                                                        className="w-full h-8 px-2 border border-blue-300/40 rounded text-xs bg-white text-gray-900 font-bold outline-none cursor-not-allowed appearance-none pr-6"
                                                    >
                                                        <option value={booking.roomNumber}>{booking.roomNumber}</option>
                                                    </select>
                                                    <ChevronDown size={12} className="absolute right-2 top-2.5 text-gray-600 pointer-events-none" />
                                                </div>
                                            </div>
                                            <div className="flex flex-col gap-1">
                                                <label className="text-[10px] font-semibold text-blue-100">Select Guest</label>
                                                <div className="relative">
                                                    <select
                                                        value={booking.guestName}
                                                        disabled
                                                        className="w-full h-8 px-2 border border-blue-300/40 rounded text-xs bg-white text-gray-900 font-bold outline-none cursor-not-allowed appearance-none pr-6 truncate"
                                                    >
                                                        <option value={booking.guestName}>{booking.guestName}</option>
                                                    </select>
                                                    <ChevronDown size={12} className="absolute right-2 top-2.5 text-gray-600 pointer-events-none" />
                                                </div>
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-2 gap-2">
                                            <div className="flex flex-col gap-1">
                                                <label className="text-[10px] font-semibold text-blue-100">From Date</label>
                                                <input
                                                    type="date"
                                                    value={moveFromDate}
                                                    onChange={e => setMoveFromDate(e.target.value)}
                                                    className="w-full h-8 px-2 border border-blue-300 rounded text-[11px] bg-white text-gray-900 font-bold outline-none focus:ring-2 focus:ring-blue-400 cursor-pointer"
                                                />
                                            </div>
                                            <div className="flex flex-col gap-1">
                                                <label className="text-[10px] font-semibold text-blue-100">To Date</label>
                                                <input
                                                    type="date"
                                                    value={moveToDate}
                                                    onChange={e => setToDate(e.target.value)}
                                                    className="w-full h-8 px-2 border border-blue-300 rounded text-[11px] bg-white text-gray-900 font-bold outline-none focus:ring-2 focus:ring-blue-400 cursor-pointer"
                                                />
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-2 gap-2">
                                            <div className="flex flex-col gap-1">
                                                <label className="text-[10px] font-semibold text-blue-100">Room Type</label>
                                                <div className="relative">
                                                    <select
                                                        value={moveRoomType}
                                                        onChange={e => setMoveRoomType(e.target.value)}
                                                        className="w-full h-8 px-2 border border-blue-300 rounded text-[11px] bg-white text-gray-900 font-bold outline-none focus:ring-2 focus:ring-blue-400 cursor-pointer appearance-none pr-6"
                                                    >
                                                        <option value="Winter Rate Plan">Winter Rate Plan</option>
                                                        <option value="Deluxe Double">Deluxe Double</option>
                                                        <option value="Superior King">Superior King</option>
                                                        <option value="Executive Suite">Executive Suite</option>
                                                    </select>
                                                    <ChevronDown size={12} className="absolute right-2 top-2.5 text-gray-600 pointer-events-none" />
                                                </div>
                                            </div>
                                            <div className="flex flex-col gap-1">
                                                <label className="text-[10px] font-semibold text-blue-100">Rate Type</label>
                                                <div className="relative">
                                                    <select
                                                        value={moveRateType}
                                                        onChange={e => setMoveRateType(e.target.value)}
                                                        className="w-full h-8 px-2 border border-blue-300 rounded text-[11px] bg-white text-gray-900 font-bold outline-none focus:ring-2 focus:ring-blue-400 cursor-pointer appearance-none pr-6"
                                                    >
                                                        <option value="Summer Vacation">Summer Vacation</option>
                                                        <option value="Standard EP Rate">Standard EP Rate</option>
                                                        <option value="Corporate CP">Corporate CP</option>
                                                        <option value="Weekend Special">Weekend Special</option>
                                                    </select>
                                                    <ChevronDown size={12} className="absolute right-2 top-2.5 text-gray-600 pointer-events-none" />
                                                </div>
                                            </div>
                                        </div>

                                        <div className="flex flex-col gap-1">
                                            <label className="text-[10px] font-semibold text-blue-100">Room</label>
                                            <div className="relative">
                                                <select
                                                    value={moveSelectedRoom}
                                                    onChange={e => setMoveSelectedRoom(e.target.value)}
                                                    className="w-full h-8 px-2.5 border border-blue-300 rounded text-xs bg-white text-gray-900 font-bold outline-none focus:ring-2 focus:ring-blue-400 cursor-pointer appearance-none pr-6"
                                                >
                                                    {(() => {
                                                        const moveAvail = getAvailableRoomsForStay(moveFromDate, moveToDate, undefined, {
                                                            excludeReservationId: booking.reservationNumber || booking.id
                                                        });
                                                        return allRooms.map(r => {
                                                            const st = moveAvail.allRoomsStatus.find(s => String(s.room.number) === String(r.roomNumber));
                                                            const isBooked = st ? !st.isAvailable : false;
                                                            const guestNote = st?.conflictingReservation ? `Booked: ${st.conflictingReservation.guestName}` : (st?.reason || 'Occupied');
                                                            return (
                                                                <option
                                                                    key={r.id || r.roomNumber}
                                                                    value={r.roomNumber}
                                                                    disabled={isBooked && String(r.roomNumber) !== String(moveSelectedRoom)}
                                                                >
                                                                    A-({r.roomNumber}) {r.type ? `• ${r.type}` : ''} {isBooked ? `[${guestNote}]` : '[Available]'}
                                                                </option>
                                                            );
                                                        });
                                                    })()}
                                                </select>
                                                <ChevronDown size={12} className="absolute right-2 top-2.5 text-gray-600 pointer-events-none" />
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {/* MODE 3: ADD PAYMENT (01-add-payment-modal.png) */}
                                {mode === 'payment' && (
                                    <div className="space-y-3">
                                        <div className="flex flex-col gap-1">
                                            <label className="text-[10.5px] font-bold text-white">Select Folio *</label>
                                            <div className="relative">
                                                <select
                                                    value={paymentFolio}
                                                    onChange={e => setPaymentFolio(e.target.value)}
                                                    className="w-full h-8 px-2.5 border border-blue-300/40 rounded text-xs bg-white text-gray-900 font-bold outline-none cursor-pointer appearance-none pr-6"
                                                >
                                                    <option value={`${booking.guestName} - FN~012607004`}>
                                                        {booking.guestName} - FN~012607004
                                                    </option>
                                                </select>
                                                <ChevronDown size={12} className="absolute right-2.5 top-2.5 text-gray-600 pointer-events-none" />
                                            </div>
                                        </div>

                                        <div className="bg-[#1b43aa]/80 border border-blue-400/20 rounded-xl p-3 space-y-2.5">
                                            <div className="flex items-center justify-between">
                                                <span className="text-xs font-bold text-white">Payment Method</span>
                                                <button
                                                    type="button"
                                                    className="h-6 px-2.5 bg-white/10 hover:bg-white/20 border border-white/20 rounded text-[10.5px] font-bold text-white flex items-center gap-1 cursor-pointer transition-colors"
                                                >
                                                    <Plus size={11} />
                                                    <span>Add</span>
                                                </button>
                                            </div>

                                            <div className="grid grid-cols-2 gap-2 pt-1">
                                                <div className="flex flex-col gap-1">
                                                    <label className="text-[10px] font-semibold text-blue-100">Method</label>
                                                    <div className="relative">
                                                        <select
                                                            value={paymentMethod}
                                                            onChange={e => setPaymentMethod(e.target.value)}
                                                            className="w-full h-8 px-2 border border-blue-300 rounded text-xs bg-white text-gray-900 font-bold outline-none cursor-pointer appearance-none pr-6"
                                                        >
                                                            <option value="Cash">Cash</option>
                                                            <option value="Credit Card">Credit Card</option>
                                                            <option value="Debit Card">Debit Card</option>
                                                            <option value="bKash">bKash</option>
                                                            <option value="Nagad">Nagad</option>
                                                            <option value="Bank Transfer">Bank Transfer</option>
                                                        </select>
                                                        <ChevronDown size={12} className="absolute right-2 top-2.5 text-gray-600 pointer-events-none" />
                                                    </div>
                                                </div>

                                                <div className="flex flex-col gap-1">
                                                    <label className="text-[10px] font-semibold text-blue-100">Amount</label>
                                                    <input
                                                        type="number"
                                                        value={paymentAmount}
                                                        onChange={e => setPaymentAmount(Number(e.target.value))}
                                                        className="w-full h-8 px-2 border border-blue-300 rounded text-xs bg-white text-gray-900 font-bold outline-none focus:ring-2 focus:ring-blue-400 font-mono"
                                                    />
                                                </div>
                                            </div>
                                        </div>

                                        <div className="bg-[#1b43aa]/80 border border-blue-400/20 rounded-xl p-3 space-y-1.5 text-xs shadow-2xs">
                                            <div className="flex items-center justify-between text-xs font-bold text-white pb-1 border-b border-blue-400/20">
                                                <span>Settlement &amp; Tax Summary</span>
                                                <span className="text-[10px] text-blue-200 font-mono">[{taxConfigCode}]</span>
                                            </div>
                                            <div className="flex justify-between text-blue-100 text-[11px] pt-0.5">
                                                <span>Base Room Tariff</span>
                                                <span className="font-mono font-bold text-white">৳ {baseAmount.toFixed(2)}</span>
                                            </div>
                                            {isTaxApplicable && totalTax > 0 && (
                                                <div className="flex justify-between text-emerald-300 text-[11px]">
                                                    <span>Statutory Taxes &amp; VAT</span>
                                                    <span className="font-mono font-bold">+৳ {totalTax.toFixed(2)}</span>
                                                </div>
                                            )}
                                            <div className="flex justify-between text-blue-100 text-[11px] pt-0.5 border-t border-blue-400/20">
                                                <span>Total Payable</span>
                                                <span className="font-mono font-bold text-white">৳ {totalAmount.toFixed(2)}</span>
                                            </div>
                                            <div className="flex justify-between text-blue-100 text-[11px]">
                                                <span>Total Paid</span>
                                                <span className="font-mono font-bold text-emerald-300">৳ {paidAmount.toFixed(2)}</span>
                                            </div>
                                            <div className="flex justify-between text-blue-100 text-[11px] font-bold">
                                                <span className="text-white">Current Balance Due</span>
                                                <span className="font-mono text-rose-300 font-bold">৳ {dueAmount.toFixed(2)}</span>
                                            </div>
                                            <div className="flex justify-between text-blue-100 text-[11px] pt-1 border-t border-blue-400/20 font-bold">
                                                <span className="text-white">Payment Amount</span>
                                                <span className="font-mono text-emerald-300 text-xs">৳ {paymentAmount.toFixed(2)}</span>
                                            </div>
                                            {/* Quick Pay Buttons */}
                                            {dueAmount > 0 && (
                                                <div className="pt-1 flex items-center gap-1.5">
                                                    <button
                                                        type="button"
                                                        onClick={() => setPaymentAmount(dueAmount)}
                                                        className="flex-1 py-1 bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-400/30 rounded text-[10px] font-bold text-emerald-200 transition-colors cursor-pointer text-center"
                                                    >
                                                        Pay Full Due (৳{dueAmount.toFixed(0)})
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() => setPaymentAmount(Math.round(dueAmount / 2))}
                                                        className="py-1 px-2.5 bg-blue-500/20 hover:bg-blue-500/30 border border-blue-400/30 rounded text-[10px] font-bold text-blue-200 transition-colors cursor-pointer text-center"
                                                    >
                                                        50% (৳{Math.round(dueAmount / 2)})
                                                    </button>
                                                </div>
                                            )}
                                        </div>

                                        <div className="flex flex-col gap-1">
                                            <label className="text-[10px] font-bold text-white">Payment Remarks</label>
                                            <textarea
                                                value={paymentRemarks}
                                                onChange={e => setPaymentRemarks(e.target.value)}
                                                rows={2}
                                                placeholder="Add any notes or transaction details here..."
                                                className="w-full p-2 border border-blue-300 rounded text-xs bg-white text-gray-900 outline-none focus:ring-2 focus:ring-blue-400"
                                            />
                                        </div>
                                    </div>
                                )}

                                {/* MODE 4: ROOM SPLIT (02-room-split-modal.png) */}
                                {mode === 'split' && (
                                    <div className="space-y-3">
                                        <div className="text-xs font-bold text-white">New Room Assignment:</div>
                                        <div className="grid grid-cols-2 gap-2">
                                            <div className="flex flex-col gap-1">
                                                <label className="text-[10px] font-semibold text-blue-100">Select Room</label>
                                                <input
                                                    type="text"
                                                    value={booking.roomNumber}
                                                    disabled
                                                    className="w-full h-8 px-2 border border-blue-300/40 rounded text-xs bg-white text-gray-900 font-bold"
                                                />
                                            </div>
                                            <div className="flex flex-col gap-1">
                                                <label className="text-[10px] font-semibold text-blue-100">Select Guest</label>
                                                <input
                                                    type="text"
                                                    value={booking.guestName}
                                                    disabled
                                                    className="w-full h-8 px-2 border border-blue-300/40 rounded text-xs bg-white text-gray-900 font-bold"
                                                />
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-2 gap-2">
                                            <div className="flex flex-col gap-1">
                                                <label className="text-[10px] font-semibold text-blue-100">From Date</label>
                                                <input
                                                    type="date"
                                                    value={splitFromDate}
                                                    onChange={e => setSplitFromDate(e.target.value)}
                                                    className="w-full h-8 px-2 border border-blue-300 rounded text-[11px] bg-white text-gray-900 font-bold outline-none"
                                                />
                                            </div>
                                            <div className="flex flex-col gap-1">
                                                <label className="text-[10px] font-semibold text-blue-100">To Date</label>
                                                <input
                                                    type="date"
                                                    value={splitToDate}
                                                    onChange={e => setSplitToDate(e.target.value)}
                                                    className="w-full h-8 px-2 border border-blue-300 rounded text-[11px] bg-white text-gray-900 font-bold outline-none"
                                                />
                                            </div>
                                        </div>

                                        <div className="flex flex-col gap-1">
                                            <label className="text-[10px] font-semibold text-blue-100">Target Split Room</label>
                                            <select
                                                value={splitRoom}
                                                onChange={e => setSplitRoom(e.target.value)}
                                                className="w-full h-8 px-2 border border-blue-300 rounded text-xs bg-white text-gray-900 font-bold outline-none"
                                            >
                                                {allRooms.map(r => (
                                                    <option key={r.id || r.roomNumber} value={r.roomNumber}>
                                                        Room {r.roomNumber} ({r.type})
                                                    </option>
                                                ))}
                                            </select>
                                        </div>

                                        <button
                                            type="button"
                                            className="h-7 px-3 border border-blue-300/60 hover:bg-white/10 rounded text-xs font-bold text-white flex items-center gap-1.5 cursor-pointer transition-colors"
                                        >
                                            <Plus size={13} />
                                            <span>Add Room</span>
                                        </button>
                                    </div>
                                )}

                                {/* MODE 5: STOP ROOM MOVE (03-stop-room-move-modal.png) */}
                                {mode === 'stop_move' && (
                                    <div className="space-y-4">
                                        <p className="text-xs text-blue-100 leading-relaxed">
                                            This action will stop all pending room moves for the selected reservations.
                                        </p>
                                        <div className="bg-[#1b43aa]/80 border border-blue-400/20 rounded-xl p-3 flex items-start gap-2.5">
                                            <input
                                                type="checkbox"
                                                id="allow_move"
                                                checked={allowRoomMove}
                                                onChange={e => setAllowRoomMove(e.target.checked)}
                                                className="w-4 h-4 rounded text-blue-600 bg-white cursor-pointer mt-0.5 accent-blue-500"
                                            />
                                            <label htmlFor="allow_move" className="cursor-pointer">
                                                <div className="text-xs font-bold text-white">Allow room move</div>
                                                <div className="text-[10px] text-blue-200">Sends allow_room_move as true.</div>
                                            </label>
                                        </div>
                                    </div>
                                )}

                                {/* MODE 6: ADD NEW BOOKING (04-add-new-booking-modal.png) */}
                                {mode === 'add_booking' && (
                                    <div className="space-y-3">
                                        <div className="flex flex-col gap-1">
                                            <label className="text-[10px] font-semibold text-blue-100">Owner Folio</label>
                                            <select
                                                value={newBookingFolio}
                                                onChange={e => setNewBookingFolio(e.target.value)}
                                                className="w-full h-8 px-2 border border-blue-300 rounded text-xs bg-white text-gray-900 font-bold outline-none"
                                            >
                                                <option value={newBookingFolio}>{newBookingFolio}</option>
                                            </select>
                                        </div>

                                        <div className="flex flex-col gap-1">
                                            <label className="text-[10px] font-semibold text-blue-100">Group Owner</label>
                                            <select
                                                value={newBookingGroupOwner}
                                                onChange={e => setNewBookingGroupOwner(e.target.value)}
                                                className="w-full h-8 px-2 border border-blue-300 rounded text-xs bg-white text-gray-900 font-bold outline-none"
                                            >
                                                <option value={newBookingGroupOwner}>{newBookingGroupOwner}</option>
                                            </select>
                                        </div>
                                    </div>
                                )}

                                {/* MODE 7: CANCEL RESERVATION (08-cancel-reservation-modal.png) */}
                                {mode === 'cancel' && (
                                    <div className="space-y-3">
                                        <div className="flex items-center justify-between">
                                            <span className="text-xs font-bold text-white">Cancellation Type</span>
                                            <span className="text-[10px] text-blue-200 flex items-center gap-1">
                                                <Info size={11} /> Policy
                                            </span>
                                        </div>

                                        <div className="flex items-center gap-4 text-xs text-white">
                                            <label className="flex items-center gap-1.5 cursor-pointer">
                                                <input
                                                    type="radio"
                                                    name="cancelType"
                                                    checked={cancelScope === 'full'}
                                                    onChange={() => setCancelScope('full')}
                                                    className="accent-blue-500"
                                                />
                                                <span>Full Reservation</span>
                                            </label>
                                            <label className="flex items-center gap-1.5 cursor-pointer">
                                                <input
                                                    type="radio"
                                                    name="cancelType"
                                                    checked={cancelScope === 'room'}
                                                    onChange={() => setCancelScope('room')}
                                                    className="accent-blue-500"
                                                />
                                                <span>Select Room</span>
                                            </label>
                                        </div>

                                        <div className="bg-[#1b43aa]/80 border border-blue-400/20 rounded-xl p-2.5 space-y-1.5">
                                            <label className="flex items-center gap-2 text-xs text-white cursor-pointer">
                                                <input type="checkbox" defaultChecked className="accent-blue-500 rounded" />
                                                <span>{booking.reservationNumber} - {booking.roomType || 'WRP'} - {booking.roomNumber}</span>
                                            </label>
                                        </div>

                                        <div className="grid grid-cols-2 gap-2">
                                            <div className="flex flex-col gap-1">
                                                <label className="text-[10px] font-semibold text-blue-100">Cancellation Fee *</label>
                                                <input
                                                    type="number"
                                                    value={cancelFee}
                                                    onChange={e => setCancelFee(Number(e.target.value))}
                                                    className="w-full h-8 px-2 border border-blue-300 rounded text-xs bg-white text-gray-900 font-bold outline-none font-mono"
                                                />
                                            </div>
                                            <div className="flex flex-col gap-1">
                                                <label className="text-[10px] font-semibold text-blue-100">Refund Amount *</label>
                                                <input
                                                    type="number"
                                                    value={cancelRefund}
                                                    onChange={e => setCancelRefund(Number(e.target.value))}
                                                    className="w-full h-8 px-2 border border-blue-300 rounded text-xs bg-white text-gray-900 font-bold outline-none font-mono"
                                                />
                                            </div>
                                        </div>

                                        <div className="flex flex-col gap-1">
                                            <label className="text-[10px] font-semibold text-blue-100">Cancellation Reason *</label>
                                            <textarea
                                                value={cancelReason}
                                                onChange={e => setCancelReason(e.target.value)}
                                                rows={2}
                                                placeholder="e.g., Guest requested to cancel due to a change in plans."
                                                className="w-full p-2 border border-blue-300 rounded text-xs bg-white text-gray-900 outline-none"
                                            />
                                        </div>
                                    </div>
                                )}

                                {/* MODE 8: VOID RESERVATION (05-void-reservation-modal.png) */}
                                {mode === 'void' && (
                                    <div className="space-y-3">
                                        <div className="text-xs font-bold text-white">Apply Changes On:</div>
                                        <div className="flex items-center gap-4 text-xs text-white">
                                            <label className="flex items-center gap-1.5 cursor-pointer">
                                                <input
                                                    type="radio"
                                                    name="voidScope"
                                                    checked={voidScope === 'group'}
                                                    onChange={() => setVoidScope('group')}
                                                    className="accent-blue-500"
                                                />
                                                <span>On Group</span>
                                            </label>
                                            <label className="flex items-center gap-1.5 cursor-pointer">
                                                <input
                                                    type="radio"
                                                    name="voidScope"
                                                    checked={voidScope === 'selected'}
                                                    onChange={() => setVoidScope('selected')}
                                                    className="accent-blue-500"
                                                />
                                                <span>Selected Reservations</span>
                                            </label>
                                        </div>

                                        <div className="bg-[#1b43aa]/80 border border-blue-400/20 rounded-xl p-2.5 space-y-1.5">
                                            <label className="flex items-center gap-2 text-xs text-white cursor-pointer">
                                                <input type="checkbox" defaultChecked className="accent-blue-500 rounded" />
                                                <span>{booking.reservationNumber}-1 - {booking.roomType || 'WRP'} - {booking.roomNumber}</span>
                                            </label>
                                        </div>

                                        <div className="flex flex-col gap-1">
                                            <label className="text-[10px] font-semibold text-rose-300 font-bold">Reason for Voiding *</label>
                                            <textarea
                                                value={voidReason}
                                                onChange={e => setVoidReason(e.target.value)}
                                                rows={3}
                                                placeholder="Please enter the reason for voiding this reservation..."
                                                className="w-full p-2 border border-rose-300 rounded text-xs bg-white text-gray-900 outline-none"
                                            />
                                        </div>
                                    </div>
                                )}

                                {/* MODE 9: RESERVATION HOLD (09-reservation-hold-modal.png) */}
                                {mode === 'hold' && (
                                    <div className="space-y-3">
                                        <div className="grid grid-cols-2 gap-2">
                                            <div className="flex flex-col gap-1">
                                                <label className="text-[10px] font-semibold text-blue-100">Hold Start Date *</label>
                                                <input
                                                    type="date"
                                                    value={holdStartDate}
                                                    onChange={e => setHoldStartDate(e.target.value)}
                                                    className="w-full h-8 px-2 border border-blue-300 rounded text-[11px] bg-white text-gray-900 font-bold outline-none"
                                                />
                                            </div>
                                            <div className="flex flex-col gap-1">
                                                <label className="text-[10px] font-semibold text-blue-100">Hold End Date *</label>
                                                <input
                                                    type="date"
                                                    value={holdEndDate}
                                                    onChange={e => setHoldEndDate(e.target.value)}
                                                    className="w-full h-8 px-2 border border-blue-300 rounded text-[11px] bg-white text-gray-900 font-bold outline-none"
                                                />
                                            </div>
                                        </div>

                                        <div className="flex flex-col gap-1">
                                            <label className="text-[10px] font-semibold text-blue-100">Hold Reason *</label>
                                            <textarea
                                                value={holdReason}
                                                onChange={e => setHoldReason(e.target.value)}
                                                rows={3}
                                                placeholder="e.g., Waiting for guest confirmation."
                                                className="w-full p-2 border border-blue-300 rounded text-xs bg-white text-gray-900 outline-none"
                                            />
                                        </div>
                                    </div>
                                )}

                                {/* MODE 10: UNASSIGN ROOM (10-unassign-room-modal.png) */}
                                {mode === 'unassign' && (
                                    <div className="space-y-3">
                                        <p className="text-xs text-blue-100 leading-relaxed">
                                            Select a room and submit to unassign it from this reservation.
                                        </p>
                                        <div className="bg-[#1b43aa]/80 border border-blue-400/20 rounded-xl p-3 space-y-2">
                                            <div className="flex items-center gap-2 text-xs font-bold text-white">
                                                <Home size={13} className="text-blue-300" />
                                                <span>Room</span>
                                            </div>
                                            <div className="relative">
                                                <select
                                                    value={unassignRoom}
                                                    onChange={e => setUnassignRoom(e.target.value)}
                                                    className="w-full h-8 px-2.5 border border-blue-300 rounded text-xs bg-white text-gray-900 font-bold outline-none cursor-pointer appearance-none pr-6"
                                                >
                                                    <option value={booking.roomNumber}>
                                                        {booking.roomNumber} ({booking.roomType || 'Winter Rate Plan'})
                                                    </option>
                                                </select>
                                                <ChevronDown size={12} className="absolute right-2.5 top-2.5 text-gray-600 pointer-events-none" />
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {/* MODE 11: UNGROUP RESERVATION (06-ungroup-reservation-modal.png) */}
                                {mode === 'ungroup' && (
                                    <div className="space-y-3">
                                        <div className="text-xs font-bold text-white">Apply Changes On:</div>
                                        <div className="flex items-center gap-4 text-xs text-white">
                                            <label className="flex items-center gap-1.5 cursor-pointer">
                                                <input
                                                    type="radio"
                                                    name="ungroupScope"
                                                    checked={ungroupScope === 'group'}
                                                    onChange={() => setUngroupScope('group')}
                                                    className="accent-blue-500"
                                                />
                                                <span>On Group</span>
                                            </label>
                                            <label className="flex items-center gap-1.5 cursor-pointer">
                                                <input
                                                    type="radio"
                                                    name="ungroupScope"
                                                    checked={ungroupScope === 'selected'}
                                                    onChange={() => setUngroupScope('selected')}
                                                    className="accent-blue-500"
                                                />
                                                <span>Selected Reservations</span>
                                            </label>
                                        </div>

                                        <div className="bg-[#1b43aa]/80 border border-blue-400/20 rounded-xl p-2.5 space-y-2">
                                            <label className="flex items-center gap-2 text-xs text-white cursor-pointer">
                                                <input type="checkbox" defaultChecked className="accent-blue-500 rounded" />
                                                <span>{booking.reservationNumber} ({booking.roomNumber}, {booking.roomType || 'WRP'})</span>
                                            </label>
                                        </div>
                                    </div>
                                )}

                                {/* MODE 12: CHANGE GROUP OWNER (07-change-group-owner-modal.png) */}
                                {mode === 'change_owner' && (
                                    <div className="space-y-3">
                                        <div className="flex flex-col gap-1">
                                            <label className="text-[10.5px] font-bold text-white">Select New Group Owner</label>
                                            <div className="relative">
                                                <select
                                                    value={selectedNewOwner}
                                                    onChange={e => setSelectedNewOwner(e.target.value)}
                                                    className="w-full h-8 px-2.5 border border-blue-300 rounded text-xs bg-white text-gray-900 font-bold outline-none cursor-pointer appearance-none pr-6"
                                                >
                                                    <option value={`${booking.guestName} - ${booking.roomNumber} (Current Owner)`}>
                                                        {booking.guestName} - {booking.roomNumber} (Current Owner)
                                                    </option>
                                                </select>
                                                <ChevronDown size={12} className="absolute right-2.5 top-2.5 text-gray-600 pointer-events-none" />
                                            </div>
                                        </div>

                                        <div className="bg-[#1b43aa]/80 border border-blue-400/20 rounded-xl p-3 flex items-start gap-2.5 text-xs text-blue-100">
                                            <Crown size={15} className="text-amber-400 flex-shrink-0 mt-0.5" />
                                            <p className="leading-relaxed">
                                                This updates the reservation owner at group level using the selected guest and their folio.
                                            </p>
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* FIXED PINNED BOTTOM ACTION FOOTER (ALWAYS VISIBLE & PERFECTLY STYLED) */}
                            <div className="flex-shrink-0 px-4 py-3 bg-[#0c2e7a]/80 border-t border-blue-400/20 flex items-center justify-end gap-2.5">
                                <button
                                    type="button"
                                    onClick={onClose}
                                    className="h-9 px-5 bg-white hover:bg-gray-100 text-gray-800 font-bold rounded-md text-xs cursor-pointer shadow-xs transition-all active:scale-[0.98]"
                                >
                                    {booking?.isPast ? 'Close' : 'Cancel'}
                                </button>
                                {!booking?.isPast && (
                                    <button
                                        type="button"
                                        onClick={handlePrimaryAction}
                                        className={`h-9 px-5 text-white font-bold rounded-md text-xs flex items-center gap-1.5 cursor-pointer shadow-md transition-all active:scale-[0.98] ${modeMeta.buttonClass}`}
                                    >
                                        {modeMeta.buttonIcon}
                                        <span>{modeMeta.buttonText}</span>
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>,
        document.body
    );
};

export default ReservationActionDrawer;
