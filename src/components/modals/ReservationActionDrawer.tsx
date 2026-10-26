import React, { useState, useEffect, useMemo } from 'react';
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
    ShieldCheck,
    Link as LinkIcon
} from 'lucide-react';
import type { AmendBookingData } from './AmendStayModal';
import { calculateReservationTaxes } from '../../utils/taxCalculationEngine';
import {
    getStandardDailyRateForRoom,
    getAvailableRoomsForStay,
    getRoomTypeCapacity,
    calculateTariffForRatePlan,
    getOperatingSystemDate,
    getAllStoredReservations,
    linkBookingsInDB,
    unlinkBookingInDB,
    generateRegistrationNumber
} from '../../utils/roomInventoryEngine';
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
    | 'link_group'
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
    onSaveAmendStay?: (bookingId: string, newDeparture: string, newNights: number, newAdults?: number, newChildren?: number) => void;
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
    onCheckIn?: (reservationNumber: string) => void;
    onCheckOut?: (reservationNumber: string) => void;
    systemDate?: string;
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
    onEdit,
    onCheckIn,
    onCheckOut,
    systemDate
}) => {
    const operatingSystemDate = systemDate || getOperatingSystemDate();
    const isBookingInHouse = booking?.status === 'IN-HOUSE' || booking?.status === 'ARRIVED' || booking?.status === 'STAYOVER';

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
    const [amendAdults, setAmendAdults] = useState<number>(2);
    const [amendChildren, setAmendChildren] = useState<number>(0);

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
    const [_ungroupScope, _setUngroupScope] = useState<'group' | 'selected'>('selected');
    const [selectedUngroupRooms, setSelectedUngroupRooms] = useState<string[]>([]);

    // 12. Change Group Owner Form States
    const [selectedNewOwner, setSelectedNewOwner] = useState<string>('');

    // Active room selection in "Reservation List" panel
    const [activeRoomNumber, setActiveRoomNumber] = useState<string>(booking?.roomNumber || '');

    // 13. Link to Group Form States
    const [linkTargetResNo, setLinkTargetResNo] = useState<string>('');
    const [isLinking, setIsLinking] = useState(false);

    // Hydrate form states when booking loads
    useEffect(() => {
        if (booking) {
            setActiveRoomNumber(booking.roomNumber);
            setLinkTargetResNo('');
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
            setAmendAdults(booking.adults ?? 2);
            setAmendChildren(booking.children ?? 0);
            setAmendSelectedRoom(true);

            setMoveSelectedRoom(initialTargetRoomNumber || booking.roomNumber);
            const isGuestInHouse = booking.status === 'IN-HOUSE' || booking.status === 'ARRIVED' || booking.status === 'STAYOVER';
            // For in-house guests, room move is strictly locked to take effect from System Date onwards
            const effectiveMoveStart = isGuestInHouse
                ? (arr > operatingSystemDate ? arr : operatingSystemDate)
                : arr;
            setMoveFromDate(effectiveMoveStart);
            setToDate(dep);
            setMoveRoomType(booking.roomType || 'Winter Rate Plan');
            setMoveRateType(booking.ratePlan || 'Summer Vacation');

            setPaymentFolio(`${booking.guestName} - ${booking.folioNumber || `FOL-${booking.reservationNumber}-1`}`);
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

    // Resolve all room bookings associated with this group or multi-room reservation
    const resolvedGroupRooms = useMemo(() => {
        if (!booking) return [];
        if (booking.groupRoomsList && booking.groupRoomsList.length > 0) {
            return booking.groupRoomsList;
        }
        const stored = getAllStoredReservations();
        // 1. Group code matching
        if (booking.groupCode) {
            const matching = stored.filter(r => r.groupCode === booking.groupCode);
            if (matching.length > 0) {
                return matching.flatMap((mr, mIdx) => {
                    if (mr.roomsList && mr.roomsList.length > 0) {
                        return mr.roomsList.map((rm: any, rIdx: number) => ({
                            ...rm,
                            reservationNumber: rm.subBookingNumber || mr.reservationNumber,
                            subBookingNumber: rm.subBookingNumber || mr.reservationNumber,
                            guestName: rm.guestName || mr.guestName,
                            ratePlan: rm.ratePlan || mr.ratePlan || 'Standard Rate',
                            status: rm.status || mr.status,
                            isPrimary: mIdx === 0 && rIdx === 0,
                            registrationNumber: rm.registrationNumber || mr.registrationNumber,
                            folioNumber: rm.folioNumber || mr.folioNumber
                        }));
                    }
                    return [{
                        roomNumber: mr.roomNumber,
                        roomType: mr.roomType,
                        ratePlan: mr.ratePlan || 'Standard Rate',
                        guestName: mr.guestName,
                        adults: mr.adults ?? 2,
                        children: mr.children ?? 0,
                        status: mr.status,
                        reservationNumber: mr.subBookingNumber || mr.reservationNumber,
                        subBookingNumber: mr.subBookingNumber || mr.reservationNumber,
                        registrationNumber: mr.registrationNumber,
                        folioNumber: mr.folioNumber,
                        isPrimary: mIdx === 0
                    }];
                });
            }
        }
        // 2. Multi-room list within same reservation
        if (booking.roomsList && booking.roomsList.length > 1) {
            return booking.roomsList.map((rm: any, idx: number) => ({
                ...rm,
                reservationNumber: rm.subBookingNumber || `${booking.reservationNumber}-${String(idx + 1).padStart(2, '0')}`,
                subBookingNumber: rm.subBookingNumber || `${booking.reservationNumber}-${String(idx + 1).padStart(2, '0')}`,
                guestName: rm.guestName || booking.guestName,
                ratePlan: rm.ratePlan || booking.ratePlan || 'Standard Rate',
                isPrimary: idx === 0,
                status: rm.status || booking.status,
                registrationNumber: rm.registrationNumber || booking.registrationNumber,
                folioNumber: rm.folioNumber || booking.folioNumber
            }));
        }
        // 3. Single room fallback
        return [{
            roomNumber: booking.roomNumber,
            roomType: booking.roomType,
            ratePlan: booking.ratePlan || 'Standard Rate',
            guestName: booking.guestName,
            adults: booking.adults ?? 2,
            children: booking.children ?? 0,
            status: booking.status,
            reservationNumber: booking.subBookingNumber || booking.reservationNumber,
            subBookingNumber: booking.subBookingNumber || booking.reservationNumber,
            registrationNumber: booking.registrationNumber,
            folioNumber: booking.folioNumber,
            isPrimary: true
        }];
    }, [booking]);

    // Active room data currently selected in the "Reservation List" panel
    const activeRoom = useMemo(() => {
        if (!booking) return null;
        const found = resolvedGroupRooms.find((r: any) => String(r.roomNumber) === String(activeRoomNumber));
        return found || resolvedGroupRooms[0] || {
            roomNumber: booking.roomNumber,
            roomType: booking.roomType,
            ratePlan: booking.ratePlan,
            guestName: booking.guestName,
            adults: booking.adults ?? 2,
            children: booking.children ?? 0,
            status: booking.status,
            reservationNumber: booking.subBookingNumber || booking.reservationNumber,
            registrationNumber: booking.registrationNumber,
            folioNumber: booking.folioNumber,
            isPrimary: true
        };
    }, [resolvedGroupRooms, activeRoomNumber, booking]);

    // Candidate reservations that can be linked to this group without renumbering
    const linkCandidates = useMemo(() => {
        if (!booking) return [];
        const stored = getAllStoredReservations();
        return stored.filter((r: any) =>
            r.reservationNumber !== booking.reservationNumber &&
            (!booking.groupCode || r.groupCode !== booking.groupCode)
        );
    }, [booking]);

    if (!isOpen || !booking || !activeRoom) return null;

    const activeRoomNum = String(activeRoom.roomNumber || booking.roomNumber);
    const activeRoomType = activeRoom.roomType || booking.roomType || 'Winter Rate Plan';
    const activeRatePlan = activeRoom.ratePlan || booking.ratePlan || 'Summer Vacation';
    const activeSubBookingNo = activeRoom.reservationNumber || activeRoom.subBookingNumber || booking.subBookingNumber || booking.reservationNumber;
    const activeStatus = (activeRoom.status || booking.status || 'CONFIRMED').toUpperCase();
    const isCurrentActiveInHouse = activeStatus === 'IN-HOUSE' || activeStatus === 'ARRIVED' || activeStatus === 'STAYOVER';
    const isCurrentActiveConfirmed = activeStatus === 'CONFIRMED' || activeStatus === 'ARRIVING';
    const activeRegNo = activeRoom.registrationNumber || (isCurrentActiveInHouse ? (booking.registrationNumber || generateRegistrationNumber(activeSubBookingNo)) : booking.registrationNumber);
    const activeGuestName = activeRoom.guestName || booking.guestName;

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

    // Capacity & Occupancy Checks
    const capacity = getRoomTypeCapacity(booking.roomType);
    const isAmendingOccupancy = mode === 'amend' && (amendAdults !== (booking.adults ?? 2) || amendChildren !== (booking.children ?? 0));
    const isAmendingNights = mode === 'amend' && nights !== origNights;
    const isAmendingStay = isAmendingNights || isAmendingOccupancy;

    // Recalculate daily base rate dynamically when adult or child count is adjusted
    const effectiveDailyBase = isAmendingOccupancy
        ? calculateTariffForRatePlan(booking.ratePlan || '', booking.roomType || '', getStandardDailyRateForRoom(booking.roomNumber, booking.roomType), amendAdults, amendChildren)
        : dailyBaseRate;

    const currentBaseAmount = isAmendingStay ? (effectiveDailyBase * nights) : origBase;

    // Evaluate taxes with central taxCalculationEngine
    const activeTaxCalc = isAmendingStay
        ? calculateReservationTaxes(currentBaseAmount, isTaxApplicable, taxConfigId)
        : (booking.taxDetails || calculateReservationTaxes(currentBaseAmount, isTaxApplicable, taxConfigId));

    const totalAmount = isAmendingStay ? activeTaxCalc.grandTotal : origTotal;
    const paidAmount = Number(booking.paidAmount || 0);
    const dueAmount = isAmendingStay
        ? Math.max(0, totalAmount - paidAmount)
        : (booking.dueAmount !== undefined ? booking.dueAmount : Math.max(0, totalAmount - paidAmount));
    const serviceCharge = activeTaxCalc.serviceChargeAmount || 0;
    const vatAmount = activeTaxCalc.vatAmount || 0;
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
    const handleLinkGroup = async () => {
        if (!linkTargetResNo.trim()) {
            toast.warning('Please enter or select a reservation confirmation number to link.');
            return;
        }
        if (linkTargetResNo.trim().toUpperCase() === booking.reservationNumber.toUpperCase()) {
            toast.warning('Cannot link a reservation to itself.');
            return;
        }
        setIsLinking(true);
        try {
            const res = await linkBookingsInDB(booking.reservationNumber, linkTargetResNo.trim(), 1);
            if (res.success) {
                toast.success(`Successfully linked ${linkTargetResNo.trim()} to group ${res.groupCode || ''} without renumbering!`);
                setLinkTargetResNo('');
                setMode('overview');
            } else {
                toast.error(res.message || 'Failed to link reservations');
            }
        } catch (err: any) {
            toast.error(err?.message || 'Error linking reservations');
        } finally {
            setIsLinking(false);
        }
    };

    const handleUngroup = async () => {
        setIsLinking(true);
        try {
            const res = await unlinkBookingInDB(booking.reservationNumber, 1);
            if (res.success) {
                toast.success(`Successfully unlinked ${booking.reservationNumber} from group. Confirmation number remains unchanged.`);
                if (onConfirmUngroup) onConfirmUngroup(booking.id, selectedUngroupRooms);
                setMode('overview');
            } else {
                toast.error(res.message || 'Failed to unlink reservation');
            }
        } catch (err: any) {
            toast.error(err?.message || 'Error unlinking reservation');
        } finally {
            setIsLinking(false);
        }
    };

    const handlePrimaryAction = () => {
        switch (mode) {
            case 'link_group':
                handleLinkGroup();
                return;
            case 'ungroup':
                handleUngroup();
                return;
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
                if (onSaveAmendStay) onSaveAmendStay(booking.id, departureDate, nights, amendAdults, amendChildren);
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
            case 'link_group':
                return { title: 'Link to Group', buttonText: isLinking ? 'Linking...' : 'Link to Group', buttonIcon: <LinkIcon size={13} />, buttonClass: 'bg-[#1a73e8] hover:bg-blue-600' };
            case 'ungroup':
                return { title: 'Ungroup Reservation', buttonText: isLinking ? 'Unlinking...' : 'Confirm Ungroup', buttonIcon: <RefreshCw size={13} />, buttonClass: 'bg-amber-600 hover:bg-amber-700' };
            case 'change_owner':
                return { title: 'Change Group Owner', buttonText: 'Confirm Change', buttonIcon: <RefreshCw size={13} />, buttonClass: 'bg-[#1a73e8] hover:bg-blue-600' };
            default:
                return { title: 'Reservation Details', buttonText: 'Close', buttonIcon: null, buttonClass: 'bg-[#1a73e8] hover:bg-blue-600' };
        }
    };

    const modeMeta = getModeMeta();

    // Standard Options List (matching media_1792542819332_c56d27e8.png)
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
        { key: 'link_group', label: 'Link to Group', icon: LinkIcon },
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
                className="fixed top-0 bottom-0 right-0 w-full md:w-[65%] lg:w-[60%] min-w-[760px] max-w-[1050px] bg-[#0e3592] text-white shadow-2xl flex flex-col border-l border-blue-900 animate-in slide-in-from-right duration-200 z-[100000]"
            >
                {/* 1. White Top Header Bar with Edit & Dynamic Action Dropdown */}
                <div className="px-2.5 py-1.5 bg-white border-b border-gray-200 flex items-center justify-between flex-shrink-0">
                    {/* Left: Close X, User Icon, Guest Name, Status */}
                    <div className="flex items-center gap-1.5 min-w-0">
                        <button
                            type="button"
                            onClick={onClose}
                            className="p-1 hover:bg-gray-100 rounded text-gray-500 hover:text-gray-900 transition-colors cursor-pointer flex-shrink-0"
                            title="Close"
                        >
                            <X size={12} />
                        </button>
                        <div className="w-5 h-5 rounded-full bg-blue-100 text-blue-900 flex items-center justify-center flex-shrink-0">
                            <Users size={13} />
                        </div>
                        <span className="text-[11px] font-bold text-gray-900 tracking-wide uppercase truncate font-sans">
                            {activeGuestName}
                        </span>
                        {activeRegNo && (
                            <span className="text-[8.5px] px-1.5 py-0.5 rounded font-mono shadow-2xs ml-1 bg-emerald-50 text-emerald-800 border border-emerald-300 font-bold" title="Registration Number">
                                {activeRegNo}
                            </span>
                        )}
                        <span className={`text-[8px] px-2 py-0.5 rounded uppercase font-semibold shadow-2xs ml-1 ${isCurrentActiveInHouse
                            ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                            : isCurrentActiveConfirmed
                                ? 'bg-blue-100 text-blue-800 border border-blue-200'
                                : activeStatus === 'HOLD'
                                    ? 'bg-purple-100 text-purple-800 border border-purple-200'
                                    : activeStatus === 'CHECKED-OUT'
                                        ? 'bg-slate-100 text-slate-700 border border-slate-200'
                                        : 'bg-blue-100 text-blue-800 border border-blue-200'
                            }`}>
                            {activeStatus}
                        </span>
                    </div>

                    {/* Right: Top Action Buttons (Check In / Check Out + Edit + Dynamic Action Dropdown) */}
                    <div className="flex items-center gap-1.5 flex-shrink-0">
                        {isCurrentActiveConfirmed && !booking?.isPast && onCheckIn && (
                            <button
                                type="button"
                                onClick={() => onCheckIn(activeSubBookingNo || booking.reservationNumber)}
                                className="h-5 px-2 rounded text-[8px] font-semibold flex items-center gap-1 shadow-2xs bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer transition-colors"
                                title="Check In guest immediately"
                            >
                                <DoorOpen size={10} />
                                <span>Check In</span>
                            </button>
                        )}

                        {isCurrentActiveInHouse && !booking?.isPast && onCheckOut && (
                            <button
                                type="button"
                                onClick={() => onCheckOut(activeSubBookingNo || booking.reservationNumber)}
                                className="h-5 px-2 rounded text-[8px] font-semibold flex items-center gap-1 shadow-2xs bg-amber-600 hover:bg-amber-700 text-white cursor-pointer transition-colors"
                                title="Check Out guest"
                            >
                                <DoorClosed size={10} />
                                <span>Check Out</span>
                            </button>
                        )}

                        <button
                            type="button"
                            disabled={Boolean(booking?.isPast)}
                            onClick={() => {
                                if (booking?.isPast) return;
                                setMode('amend');
                                if (onEdit) onEdit(booking);
                            }}
                            className={`h-5 px-2 rounded text-[8px] flex items-center gap-1 shadow-2xs transition-colors ${booking?.isPast
                                ? 'bg-gray-100 text-gray-400 border border-gray-200 cursor-not-allowed opacity-60'
                                : 'bg-white hover:bg-gray-50 text-[#0e3592] border border-blue-300/80 cursor-pointer'
                                }`}
                            title={booking?.isPast ? 'Historical reservations cannot be edited' : 'Edit reservation (Amend Stay)'}
                        >
                            <Edit3 size={10} className={booking?.isPast ? 'text-gray-400' : 'text-[#0e3592]'} />
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
                                className={`h-5 px-2 rounded text-[8px]  flex items-center gap-1.5 shadow-2xs transition-colors ${booking?.isPast
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
                                <div className="absolute right-5 top-full mt-1.5 w-54 bg-white rounded-md shadow-2xl border border-gray-200 py-1 z-[100002] text-gray-800 animate-in fade-in zoom-in-95 duration-100 max-h-[350px] overflow-y-auto">
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
                                                className={`w-full px-3.5 py-1.5 text-left text-[8px] font-medium hover:bg-gray-100 flex items-center gap-1 cursor-pointer transition-colors ${isActive ? 'bg-blue-50 text-blue-700 ' : 'text-gray-800'
                                                    }`}
                                            >
                                                <IconComponent size={12} className={isActive ? 'text-blue-600' : 'text-gray-600'} />
                                                <span className="truncate">{opt.label}</span>
                                            </button>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Audit Lock Historical Warning Banner */}
                {booking.isPast && (
                    <div className="bg-amber-50 border-b border-amber-200 px-3.5 py-2 flex items-center gap-1 text-amber-950 text-[8px] flex-shrink-0 animate-in fade-in duration-150">
                        <div className="w-5 h-5 rounded-full bg-amber-200 text-amber-900 flex items-center justify-center flex-shrink-0">
                            <Lock size={12} />
                        </div>
                        <div className="min-w-0">
                            <span className="font-extrabold text-[8px] uppercase tracking-wide text-amber-900 mr-1.5">
                                Audit Locked (Read Only):
                            </span>
                            <span className="text-[10.5px] text-amber-800">
                                This reservation is in past dates. Historical records cannot be modified or moved for audit & financial compliance.
                            </span>
                        </div>
                    </div>
                )}

                {/* 2. Drawer Body (Always 2-Column: Left = Room Details & Financials, Right = Reservation List or Action Form) */}
                <div className="flex-1 min-h-0 grid grid-cols-12 bg-[#0e3592] overflow-hidden">
                    {/* LEFT COLUMN: Overview & Financial Cards (Independent Scroll) */}
                    <div className="col-span-7 h-full overflow-y-auto p-3 space-y-2 border-r border-blue-800/40">
                        {/* Row 1: Reservation # & Status & Registration # */}
                        <div className={`grid ${activeRegNo ? 'grid-cols-3' : 'grid-cols-2'} gap-1`}>
                            <div className="bg-white/[0.08] hover:bg-white/[0.12] border border-white/10 rounded-xl p-2 flex items-center gap-1 shadow-xs transition-colors">
                                <div className="w-6 h-6 rounded-md bg-blue-500/25 border border-blue-400/20 text-blue-200 flex items-center justify-center text-[8px] flex-shrink-0">
                                    #
                                </div>
                                <div className="min-w-0">
                                    <div className="text-[8px] uppercase text-blue-200/80 tracking-wider">
                                        Reservation #
                                    </div>
                                    <div className="text-[8px] text-white truncate font-mono font-bold">
                                        {activeSubBookingNo}
                                    </div>
                                </div>
                            </div>

                            {activeRegNo && (
                                <div className="bg-emerald-950/40 hover:bg-emerald-950/60 border border-emerald-400/30 rounded-xl p-2 flex items-center gap-1 shadow-xs transition-colors">
                                    <div className="w-6 h-6 rounded-md bg-emerald-500/25 border border-emerald-400/30 text-emerald-300 flex items-center justify-center text-[8px] flex-shrink-0 font-bold">
                                        REG
                                    </div>
                                    <div className="min-w-0">
                                        <div className="text-[8px] uppercase text-emerald-300/80 tracking-wider font-semibold">
                                            Reg No (GRC)
                                        </div>
                                        <div className="text-[8px] text-emerald-200 truncate font-mono font-bold">
                                            {activeRegNo}
                                        </div>
                                    </div>
                                </div>
                            )}

                            <div className="bg-white/[0.08] hover:bg-white/[0.12] border border-white/10 rounded-xl p-2 flex items-center gap-1 shadow-xs transition-colors">
                                <div className="w-6 h-6 rounded-md bg-amber-500/25 border border-amber-400/20 text-amber-200 flex items-center justify-center flex-shrink-0">
                                    <Layers size={12} />
                                </div>
                                <div className="min-w-0">
                                    <div className="text-[8px] uppercase text-blue-200/80 tracking-wider">
                                        Status
                                    </div>
                                    <div>
                                        <span className="bg-emerald-500/25 border border-emerald-400/30 text-emerald-200 font-extrabold text-[9px] px-2 py-0.5 rounded shadow-2xs uppercase">
                                            {activeStatus}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Row 2: Arrival, Nights, Departure */}
                        <div className="grid grid-cols-12 gap-1">
                            <div className="col-span-5 bg-white/[0.08] hover:bg-white/[0.12] border border-white/10 rounded-xl p-2 flex items-center gap-1 shadow-xs transition-colors">
                                <div className="w-6 h-6 rounded-md bg-emerald-500/25 border border-emerald-400/20 text-emerald-200 flex items-center justify-center flex-shrink-0">
                                    <Calendar size={11} />
                                </div>
                                <div className="min-w-0">
                                    <div className="text-[8px] uppercase  text-blue-200/80">ARRIVAL</div>
                                    <div className="text-[8px]  text-white truncate">{activeRoom.checkInDate || booking.arrivalDate}</div>
                                    <div className="text-[8px] text-blue-200/70 font-mono">🕒 16:00:00</div>
                                </div>
                            </div>

                            <div className="col-span-2 bg-white/[0.08] border border-white/10 rounded-xl p-1.5 flex flex-col items-center justify-center text-center shadow-xs">
                                <div className="text-[8px] uppercase  text-blue-200/80">NIGHTS</div>
                                <div className="text-[8px] font-black text-white font-mono leading-none">{activeRoom.nights || nights}</div>
                            </div>

                            <div className="col-span-5 bg-white/[0.08] hover:bg-white/[0.12] border border-white/10 rounded-xl p-2 flex items-center gap-1 shadow-xs transition-colors">
                                <div className="w-6 h-6 rounded-md bg-rose-500/25 border border-rose-400/20 text-rose-200 flex items-center justify-center flex-shrink-0">
                                    <Calendar size={11} />
                                </div>
                                <div className="min-w-0">
                                    <div className="text-[8px] uppercase  text-blue-200/80">DEPARTURE</div>
                                    <div className="text-[8px]  text-white truncate">{activeRoom.checkOutDate || departureDate}</div>
                                    <div className="text-[8px] text-blue-200/70 font-mono">🕒 12:00:00</div>
                                </div>
                            </div>
                        </div>

                        {/* Row 3: Room Details & Rate Plan */}
                        <div className="grid grid-cols-2 gap-1">
                            <div className="bg-white/[0.08] hover:bg-white/[0.12] border border-white/10 rounded-xl p-2 flex items-center gap-1 shadow-xs transition-colors">
                                <div className="w-6 h-6 rounded-md bg-indigo-500/25 border border-indigo-400/20 text-indigo-200 flex items-center justify-center flex-shrink-0">
                                    <Home size={12} />
                                </div>
                                <div className="min-w-0">
                                    <div className="text-[8px] uppercase  text-blue-200/80 tracking-wider">
                                        Room Details
                                    </div>
                                    <div className="text-[8px]  text-white truncate">
                                        {activeRoomNum} ({activeRoomType})
                                    </div>
                                </div>
                            </div>

                            <div className="bg-white/[0.08] hover:bg-white/[0.12] border border-white/10 rounded-xl p-2 flex items-center gap-1 shadow-xs transition-colors">
                                <div className="w-6 h-6 rounded-md bg-amber-500/25 border border-amber-400/20 text-amber-200 flex items-center justify-center flex-shrink-0">
                                    <Printer size={12} />
                                </div>
                                <div className="min-w-0">
                                    <div className="text-[8px] uppercase  text-blue-200/80 tracking-wider">
                                        Rate Plan
                                    </div>
                                    <div className="text-[8px]  text-white truncate">
                                        {activeRatePlan}
                                    </div>
                                </div>
                            </div>
                        </div>

                            {/* Row 4: Guests & Avg Daily Rate */}
                            <div className="grid grid-cols-2 gap-1">
                                <div className="bg-white/[0.08] hover:bg-white/[0.12] border border-white/10 rounded-xl p-2 flex flex-col justify-between shadow-xs transition-colors">
                                    <div className="flex items-center justify-between pb-1 border-b border-white/10">
                                        <div className="flex items-center gap-1.5">
                                            <div className="w-5 h-5 rounded-md bg-cyan-500/25 text-cyan-200 flex items-center justify-center flex-shrink-0">
                                                <Users size={11} />
                                            </div>
                                            <div className="text-[8px] uppercase  text-blue-200/80 tracking-wider">
                                                Occupancy (Pax)
                                            </div>
                                        </div>
                                        <span className="text-[8px] font-mono text-cyan-200/90" title="Max Room Capacity">
                                            Max {capacity.maxOccupancy}
                                        </span>
                                    </div>
                                    <div className="grid grid-cols-2 gap-1.5 mt-1.5">
                                        {/* Adult Controls */}
                                        <div className="bg-black/25 rounded-md px-1.5 py-1 border border-white/10 flex items-center justify-between">
                                            <div>
                                                <div className="text-[8px] text-blue-200/80 uppercase ">Adults</div>
                                                <div className="text-[8px] font-black text-white">{amendAdults}</div>
                                            </div>
                                            <div className="flex flex-col gap-0.5">
                                                <button
                                                    type="button"
                                                    disabled={amendAdults >= capacity.maxAdults}
                                                    onClick={() => setAmendAdults(a => Math.min(capacity.maxAdults, a + 1))}
                                                    className="w-4 h-3 bg-blue-500/40 hover:bg-blue-500/60 disabled:opacity-20 rounded text-[9px]  text-white flex items-center justify-center cursor-pointer disabled:cursor-not-allowed"
                                                    title={`Max ${capacity.maxAdults} Adults`}
                                                >+</button>
                                                <button
                                                    type="button"
                                                    disabled={amendAdults <= 1}
                                                    onClick={() => setAmendAdults(a => Math.max(1, a - 1))}
                                                    className="w-4 h-3 bg-blue-500/40 hover:bg-blue-500/60 disabled:opacity-20 rounded text-[9px]  text-white flex items-center justify-center cursor-pointer disabled:cursor-not-allowed"
                                                    title="Min 1 Adult"
                                                >-</button>
                                            </div>
                                        </div>

                                        {/* Children Controls */}
                                        <div className="bg-black/25 rounded-md px-1.5 py-1 border border-white/10 flex items-center justify-between">
                                            <div>
                                                <div className="text-[8px] text-blue-200/80 uppercase ">Child</div>
                                                <div className="text-[8px] font-black text-white">{amendChildren}</div>
                                            </div>
                                            <div className="flex flex-col gap-0.5">
                                                <button
                                                    type="button"
                                                    disabled={amendChildren >= capacity.maxChildren}
                                                    onClick={() => setAmendChildren(c => Math.min(capacity.maxChildren, c + 1))}
                                                    className="w-4 h-3 bg-blue-500/40 hover:bg-blue-500/60 disabled:opacity-20 rounded text-[9px]  text-white flex items-center justify-center cursor-pointer disabled:cursor-not-allowed"
                                                    title={`Max ${capacity.maxChildren} Children`}
                                                >+</button>
                                                <button
                                                    type="button"
                                                    disabled={amendChildren <= 0}
                                                    onClick={() => setAmendChildren(c => Math.max(0, c - 1))}
                                                    className="w-4 h-3 bg-blue-500/40 hover:bg-blue-500/60 disabled:opacity-20 rounded text-[9px]  text-white flex items-center justify-center cursor-pointer disabled:cursor-not-allowed"
                                                    title="Min 0 Children"
                                                >-</button>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div className="bg-white/[0.08] hover:bg-white/[0.12] border border-white/10 rounded-xl p-2 flex items-center gap-1 shadow-xs transition-colors">
                                    <div className="w-6 h-6 rounded-md bg-emerald-500/25 border border-emerald-400/20 text-emerald-200 flex items-center justify-center flex-shrink-0">
                                        <DollarSign size={12} />
                                    </div>
                                    <div className="min-w-0">
                                        <div className="text-[8px] uppercase  text-blue-200/80 tracking-wider">
                                            Avg Daily Rate
                                        </div>
                                        <div className="text-[8px]  text-white font-mono">
                                            ৳ {dailyRate.toFixed(2)}
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Financial & Statutory Tax Overview Card */}
                            <div className="bg-white/[0.08] border border-white/10 rounded-xl p-2.5 space-y-1.5 text-[8px] shadow-xs">
                                <div className="flex items-center justify-between text-blue-100 text-[8px]">
                                    <div className="flex items-center gap-1.5">
                                        <div className="w-4.5 h-4.5 rounded bg-blue-500/25 flex items-center justify-center text-blue-200">
                                            <Calculator size={10} />
                                        </div>
                                        <span>Base Tariff</span>
                                    </div>
                                    <span className="font-mono  text-white">৳ {baseAmount.toFixed(2)}</span>
                                </div>

                                {/* Statutory Tax & VAT Breakdown */}
                                {isTaxApplicable && totalTax > 0 ? (
                                    <div className="bg-black/25 rounded-lg p-2 space-y-1 border border-white/10 text-[10.5px]">
                                        <div className="flex items-center justify-between  text-blue-200 pb-0.5 border-b border-white/10 text-[8px]">
                                            <span className="flex items-center gap-1">
                                                <ShieldCheck size={11} className="text-emerald-400" />
                                                <span>Taxes ({taxConfigCode})</span>
                                            </span>
                                            <span className="font-mono text-emerald-300 ">+৳ {totalTax.toFixed(2)}</span>
                                        </div>
                                        {serviceCharge > 0 && (
                                            <div className="flex justify-between text-blue-200/80 text-[8px]">
                                                <span>Service Charge:</span>
                                                <span className="font-mono text-white">+৳ {serviceCharge.toFixed(2)}</span>
                                            </div>
                                        )}
                                        {vatAmount > 0 && (
                                            <div className="flex justify-between text-blue-200/80 text-[8px]">
                                                <span>VAT:</span>
                                                <span className="font-mono text-white">+৳ {vatAmount.toFixed(2)}</span>
                                            </div>
                                        )}
                                    </div>
                                ) : (
                                    <div className="flex items-center justify-between text-amber-200 text-[8px] bg-amber-500/10 px-2 py-0.5 rounded border border-amber-400/20">
                                        <span>Tax Policy:</span>
                                        <span className="">Tax Exempt</span>
                                    </div>
                                )}

                                <div className="flex items-center justify-between text-blue-100 text-[8px] pt-1 border-t border-white/10 ">
                                    <span className="text-white">Grand Total (Payable)</span>
                                    <span className="font-mono font-black text-white">৳ {totalAmount.toFixed(2)}</span>
                                </div>

                                <div className="flex items-center justify-between text-blue-100 text-[8px]">
                                    <div className="flex items-center gap-1.5">
                                        <div className="w-4.5 h-4.5 rounded bg-emerald-500/25 flex items-center justify-center text-emerald-300">
                                            <CreditCard size={10} />
                                        </div>
                                        <span>Advance Paid</span>
                                    </div>
                                    <span className="font-mono  text-emerald-300">৳ {paidAmount.toFixed(2)}</span>
                                </div>
                            </div>

                            {/* Room Net Balance Highlight Card */}
                            <div className="bg-white/[0.08] hover:bg-white/[0.12] border border-white/10 rounded-xl p-2.5 flex items-center justify-between  shadow-xs transition-colors">
                                <div className="flex items-center gap-1 text-white">
                                    <div className="w-6 h-6 rounded-md bg-emerald-500/25 border border-emerald-400/20 flex items-center justify-center text-emerald-400">
                                        <Wallet size={12} />
                                    </div>
                                    <span className="text-[8px]">Net Balance Due</span>
                                </div>
                                <span className={`font-mono font-black text-[8px] ${dueAmount > 0 ? 'text-rose-300' : 'text-emerald-400'}`}>
                                    ৳ {dueAmount.toFixed(2)}
                                </span>
                            </div>
                        </div>

                        {/* RIGHT COLUMN: Reservation List Panel OR Active Action Mode Form */}
                        <div className="col-span-5 h-full flex flex-col min-h-0 bg-[#0e3592]">
                            {mode === 'overview' ? (
                                /* RESERVATION LIST PANEL (matching media_1792966125811_cc345f83.png) */
                                <div className="h-full flex flex-col min-h-0">
                                    {/* Header: ${ratePlan} (${count}) + Action Buttons */}
                                    <div className="px-3.5 py-2.5 flex items-center justify-between border-b border-blue-400/20 flex-shrink-0 bg-[#0c2e7a]/50">
                                        <div className="min-w-0">
                                            <h2 className="text-[11px] font-bold text-white tracking-wide truncate">
                                                {activeRatePlan} ({resolvedGroupRooms.length})
                                            </h2>
                                            {booking.groupCode && (
                                                <div className="text-[8.5px] font-mono text-blue-200/90 mt-0.5">
                                                    Group Code: <span className="font-bold text-white">{booking.groupCode}</span>
                                                </div>
                                            )}
                                        </div>
                                        <div className="flex items-center gap-1.5 flex-shrink-0">
                                            <button
                                                type="button"
                                                onClick={() => setMode('link_group')}
                                                className="h-6 px-2.5 bg-blue-500/25 hover:bg-blue-500/40 text-blue-100 border border-blue-400/30 rounded text-[9px] font-bold flex items-center gap-1 transition-colors cursor-pointer shadow-2xs"
                                                title="Link an existing reservation into this group without modifying its confirmation number"
                                            >
                                                <LinkIcon size={10} />
                                                <span>+ Link Group</span>
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => setMode('add_booking')}
                                                className="h-6 px-2.5 bg-white/10 hover:bg-white/20 text-white border border-white/20 rounded text-[9px] font-bold flex items-center gap-1 transition-colors cursor-pointer shadow-2xs"
                                                title="Add a new room booking"
                                            >
                                                <Plus size={10} />
                                                <span>+ Add Room</span>
                                            </button>
                                        </div>
                                    </div>

                                    {/* Scrollable Room Cards List (matching media_1792966125811_cc345f83.png) */}
                                    <div className="flex-1 overflow-y-auto p-3 space-y-2.5 min-h-0">
                                        {resolvedGroupRooms.map((rm: any, idx: number) => {
                                            const isSelected = String(rm.roomNumber) === String(activeRoomNum);
                                            const rmStatus = (rm.status || 'CONFIRMED').toUpperCase();
                                            const isRoomInHouse = rmStatus === 'IN-HOUSE' || rmStatus === 'ARRIVED' || rmStatus === 'STAYOVER';
                                            const isRoomConfirmed = rmStatus === 'CONFIRMED' || rmStatus === 'ARRIVING';
                                            const rmResNo = rm.reservationNumber || rm.subBookingNumber || (resolvedGroupRooms.length > 1 ? `${booking.reservationNumber}-${String(idx + 1).padStart(2, '0')}` : booking.reservationNumber);
                                            const rmRegNo = rm.registrationNumber || (isRoomInHouse ? generateRegistrationNumber(rmResNo) : undefined);

                                            return (
                                                <div
                                                    key={`${rm.roomNumber}-${rmResNo}-${idx}`}
                                                    onClick={() => setActiveRoomNumber(String(rm.roomNumber))}
                                                    className={`p-3 rounded-xl border transition-all cursor-pointer select-none ${
                                                        isSelected
                                                            ? 'bg-blue-600/35 border-blue-300 ring-2 ring-blue-400/70 shadow-lg'
                                                            : 'bg-white/[0.07] hover:bg-white/[0.12] border-white/10'
                                                    }`}
                                                >
                                                    <div className="flex items-center justify-between">
                                                        <div className="flex items-center gap-1.5 min-w-0">
                                                            <span className="text-[11px] font-bold text-white truncate">
                                                                {rm.guestName || booking.guestName}
                                                            </span>
                                                            {(rm.isPrimary || idx === 0) && (
                                                                <span title="Primary Booker / Group Owner">
                                                                    <Crown size={12} className="text-amber-300 fill-amber-300 shrink-0" />
                                                                </span>
                                                            )}
                                                        </div>
                                                        <span className={`text-[8px] px-2 py-0.5 rounded uppercase font-semibold shadow-2xs ${
                                                            isRoomInHouse
                                                                ? 'bg-emerald-500/25 text-emerald-200 border border-emerald-400/30'
                                                                : isRoomConfirmed
                                                                    ? 'bg-blue-500/25 text-blue-200 border border-blue-400/30'
                                                                    : 'bg-slate-500/25 text-slate-200 border border-slate-400/30'
                                                        }`}>
                                                            {rmStatus}
                                                        </span>
                                                    </div>

                                                    <div className="text-[9.5px] text-blue-200/90 font-mono mt-1">
                                                        Reservation: <span className="text-white font-semibold">{rmResNo}</span>
                                                    </div>

                                                    <div className="flex items-center gap-1.5 mt-2 flex-wrap text-[9px]">
                                                        <span className="px-2 py-0.5 rounded-md bg-blue-500/25 text-blue-100 border border-blue-400/30 font-medium">
                                                            Room {rm.roomNumber || 'Unassigned'}
                                                        </span>
                                                        <span className="px-2 py-0.5 rounded-md bg-white/10 text-blue-100 border border-white/10 font-medium">
                                                            Pax {rm.adults ?? 2}, {rm.children ?? 0}
                                                        </span>
                                                        {rmRegNo && (
                                                            <span className="px-2 py-0.5 rounded-md bg-emerald-500/20 text-emerald-200 border border-emerald-400/30 font-mono font-bold">
                                                                {rmRegNo}
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>

                                    {/* Overview Footer */}
                                    <div className="flex-shrink-0 px-3.5 py-2.5 bg-[#0c2e7a]/80 border-t border-blue-400/20 flex items-center justify-between gap-1.5">
                                        <button
                                            type="button"
                                            onClick={() => window.print()}
                                            className="h-8 px-3.5 bg-white/10 hover:bg-white/20 text-white rounded-md text-[9.5px] font-semibold flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs"
                                            title="Print Folio for active room"
                                        >
                                            <Printer size={12} />
                                            <span>Print Folio</span>
                                        </button>

                                        <div className="flex items-center gap-1.5">
                                            {isCurrentActiveConfirmed && !booking?.isPast && onCheckIn && (
                                                <button
                                                    type="button"
                                                    onClick={() => onCheckIn(activeSubBookingNo || booking.reservationNumber)}
                                                    className="h-8 px-3.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-md text-[9.5px] font-semibold flex items-center gap-1 cursor-pointer transition-colors shadow-xs"
                                                    title="Check In active room"
                                                >
                                                    <DoorOpen size={11} />
                                                    <span>Check In</span>
                                                </button>
                                            )}
                                            {isCurrentActiveInHouse && !booking?.isPast && onCheckOut && (
                                                <button
                                                    type="button"
                                                    onClick={() => onCheckOut(activeSubBookingNo || booking.reservationNumber)}
                                                    className="h-8 px-3.5 bg-amber-600 hover:bg-amber-700 text-white rounded-md text-[9.5px] font-semibold flex items-center gap-1 cursor-pointer transition-colors shadow-xs"
                                                    title="Check Out active room"
                                                >
                                                    <DoorClosed size={11} />
                                                    <span>Check Out</span>
                                                </button>
                                            )}
                                            <button
                                                type="button"
                                                onClick={onClose}
                                                className="h-8 px-4 bg-white hover:bg-gray-100 text-[#0e3592] rounded-md text-[9.5px] font-bold transition-all cursor-pointer shadow-xs"
                                            >
                                                Close
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                /* ACTIVE ACTION MODE FORM */
                                <div className="h-full flex flex-col min-h-0">
                                    {/* Panel Header */}
                                    <div className="px-4 py-2.5 flex items-center justify-between border-b border-blue-400/20 flex-shrink-0 bg-[#0c2e7a]/50">
                                        <h2 className="text-[11px] font-bold text-white tracking-wide">{modeMeta.title}</h2>
                                        <button
                                            type="button"
                                            onClick={() => setMode('overview')}
                                            className="p-1 text-blue-200 hover:text-white rounded transition-colors cursor-pointer"
                                            title="Back to Reservation List"
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
                                            <div className="flex items-center justify-between text-[8px] font-semibold text-white">
                                                <span>Rooms</span>
                                                <button
                                                    type="button"
                                                    onClick={() => setAmendSelectedRoom(!amendSelectedRoom)}
                                                    className="text-[8px] px-2 py-0.5 border border-white/40 hover:bg-white/10 rounded font-medium text-white transition-colors cursor-pointer"
                                                >
                                                    {amendSelectedRoom ? 'Unselect All' : 'Select All'}
                                                </button>
                                            </div>
                                            <div className="bg-[#1b43aa]/80 border border-blue-400/20 rounded-lg p-2.5 flex items-center gap-1">
                                                <input
                                                    type="checkbox"
                                                    checked={amendSelectedRoom}
                                                    onChange={e => setAmendSelectedRoom(e.target.checked)}
                                                    className="w-3.5 h-3.5 rounded text-blue-600 bg-white cursor-pointer accent-blue-500"
                                                />
                                                <span className="text-[8px]  text-white font-mono truncate">
                                                    {booking.roomNumber} - {booking.reservationNumber}
                                                </span>
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-2 gap-1 pt-1">
                                            <div className="flex flex-col gap-1">
                                                <label className="text-[8px] font-semibold text-blue-100">Arrival:</label>
                                                <input
                                                    type="date"
                                                    value={booking.arrivalDate}
                                                    disabled
                                                    className="w-full h-8 px-2 border border-blue-400/30 rounded text-[8px] bg-[#122e75] text-gray-300 cursor-not-allowed outline-none font-medium"
                                                />
                                            </div>
                                            <div className="flex flex-col gap-1">
                                                <label className="text-[8px] font-semibold text-white">Departure:</label>
                                                <input
                                                    type="date"
                                                    value={departureDate}
                                                    onChange={e => handleDepartureChange(e.target.value)}
                                                    className="w-full h-8 px-2 border border-blue-300 rounded text-[8px] bg-white text-gray-900  outline-none focus:ring-2 focus:ring-blue-400 cursor-pointer"
                                                />
                                            </div>
                                        </div>

                                        <div className="flex flex-col gap-1 w-1/2">
                                            <label className="text-[8px] font-semibold text-white">Nights:</label>
                                            <input
                                                type="number"
                                                min={1}
                                                value={nights}
                                                onChange={e => handleNightsChange(Number(e.target.value))}
                                                className="w-full h-8 px-2 border border-blue-300 rounded text-[8px] bg-white text-gray-900  outline-none focus:ring-2 focus:ring-blue-400"
                                            />
                                        </div>
                                    </div>
                                )}

                                {/* MODE 2: ROOM MOVE (media_1792541566827_b05dc667.png) */}
                                {mode === 'move' && (
                                    <div className="space-y-3">
                                        {isBookingInHouse && (
                                            <div className="bg-emerald-500/15 border border-emerald-400/30 rounded-lg p-2 text-emerald-200 text-[10.5px] flex items-center gap-1.5 font-medium shadow-xs">
                                                <ShieldCheck size={12} className="text-emerald-400 shrink-0" />
                                                <span>In-House Guest: Room Move applies from current System Date ({operatingSystemDate}) for the remaining stay.</span>
                                            </div>
                                        )}
                                        <div className="text-[8px]  text-white">New Room Assignment:</div>
                                        <div className="grid grid-cols-2 gap-1">
                                            <div className="flex flex-col gap-1">
                                                <label className="text-[8px] font-semibold text-blue-100">Select Room</label>
                                                <div className="relative">
                                                    <select
                                                        value={booking.roomNumber}
                                                        disabled
                                                        className="w-full h-8 px-2 border border-blue-300/40 rounded text-[8px] bg-white text-gray-900  outline-none cursor-not-allowed appearance-none pr-6"
                                                    >
                                                        <option value={booking.roomNumber}>{booking.roomNumber}</option>
                                                    </select>
                                                    <ChevronDown size={12} className="absolute right-2 top-2.5 text-gray-600 pointer-events-none" />
                                                </div>
                                            </div>
                                            <div className="flex flex-col gap-1">
                                                <label className="text-[8px] font-semibold text-blue-100">Select Guest</label>
                                                <div className="relative">
                                                    <select
                                                        value={booking.guestName}
                                                        disabled
                                                        className="w-full h-8 px-2 border border-blue-300/40 rounded text-[8px] bg-white text-gray-900  outline-none cursor-not-allowed appearance-none pr-6 truncate"
                                                    >
                                                        <option value={booking.guestName}>{booking.guestName}</option>
                                                    </select>
                                                    <ChevronDown size={12} className="absolute right-2 top-2.5 text-gray-600 pointer-events-none" />
                                                </div>
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-2 gap-1">
                                            <div className="flex flex-col gap-1">
                                                <div className="flex items-center justify-between">
                                                    <label className="text-[8px] font-semibold text-blue-100">From Date</label>
                                                    {isBookingInHouse && (
                                                        <span className="text-[8px] text-emerald-300 bg-emerald-500/20 px-1 rounded">System Date Locked</span>
                                                    )}
                                                </div>
                                                <input
                                                    type="date"
                                                    value={moveFromDate}
                                                    disabled={isBookingInHouse}
                                                    min={isBookingInHouse ? operatingSystemDate : undefined}
                                                    onChange={e => setMoveFromDate(e.target.value)}
                                                    className={`w-full h-8 px-2 border border-blue-300 rounded text-[8px] outline-none focus:ring-2 focus:ring-blue-400 ${isBookingInHouse
                                                        ? 'bg-blue-900/60 text-blue-200 cursor-not-allowed opacity-90 border-blue-400/30'
                                                        : 'bg-white text-gray-900 cursor-pointer'
                                                        }`}
                                                />
                                            </div>
                                            <div className="flex flex-col gap-1">
                                                <label className="text-[8px] font-semibold text-blue-100">To Date</label>
                                                <input
                                                    type="date"
                                                    value={moveToDate}
                                                    min={moveFromDate}
                                                    onChange={e => setToDate(e.target.value)}
                                                    className="w-full h-8 px-2 border border-blue-300 rounded text-[8px] bg-white text-gray-900 outline-none focus:ring-2 focus:ring-blue-400 cursor-pointer"
                                                />
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-2 gap-1">
                                            <div className="flex flex-col gap-1">
                                                <label className="text-[8px] font-semibold text-blue-100">Room Type</label>
                                                <div className="relative">
                                                    <select
                                                        value={moveRoomType}
                                                        onChange={e => setMoveRoomType(e.target.value)}
                                                        className="w-full h-8 px-2 border border-blue-300 rounded text-[8px] bg-white text-gray-900  outline-none focus:ring-2 focus:ring-blue-400 cursor-pointer appearance-none pr-6"
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
                                                <label className="text-[8px] font-semibold text-blue-100">Rate Type</label>
                                                <div className="relative">
                                                    <select
                                                        value={moveRateType}
                                                        onChange={e => setMoveRateType(e.target.value)}
                                                        className="w-full h-8 px-2 border border-blue-300 rounded text-[8px] bg-white text-gray-900  outline-none focus:ring-2 focus:ring-blue-400 cursor-pointer appearance-none pr-6"
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
                                            <label className="text-[8px] font-semibold text-blue-100">Room</label>
                                            <div className="relative">
                                                <select
                                                    value={moveSelectedRoom}
                                                    onChange={e => setMoveSelectedRoom(e.target.value)}
                                                    className="w-full h-8 px-2.5 border border-blue-300 rounded text-[8px] bg-white text-gray-900  outline-none focus:ring-2 focus:ring-blue-400 cursor-pointer appearance-none pr-6"
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
                                            <label className="text-[10.5px]  text-white">Select Folio *</label>
                                            <div className="relative">
                                                <select
                                                    value={paymentFolio}
                                                    onChange={e => setPaymentFolio(e.target.value)}
                                                    className="w-full h-8 px-2.5 border border-blue-300/40 rounded text-[8px] bg-white text-gray-900  outline-none cursor-pointer appearance-none pr-6"
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
                                                <span className="text-[8px]  text-white">Payment Method</span>
                                                <button
                                                    type="button"
                                                    className="h-6 px-2.5 bg-white/10 hover:bg-white/20 border border-white/20 rounded text-[10.5px]  text-white flex items-center gap-1 cursor-pointer transition-colors"
                                                >
                                                    <Plus size={11} />
                                                    <span>Add</span>
                                                </button>
                                            </div>

                                            <div className="grid grid-cols-2 gap-1 pt-1">
                                                <div className="flex flex-col gap-1">
                                                    <label className="text-[8px] font-semibold text-blue-100">Method</label>
                                                    <div className="relative">
                                                        <select
                                                            value={paymentMethod}
                                                            onChange={e => setPaymentMethod(e.target.value)}
                                                            className="w-full h-8 px-2 border border-blue-300 rounded text-[8px] bg-white text-gray-900  outline-none cursor-pointer appearance-none pr-6"
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
                                                    <label className="text-[8px] font-semibold text-blue-100">Amount</label>
                                                    <input
                                                        type="number"
                                                        value={paymentAmount}
                                                        onChange={e => setPaymentAmount(Number(e.target.value))}
                                                        className="w-full h-8 px-2 border border-blue-300 rounded text-[8px] bg-white text-gray-900  outline-none focus:ring-2 focus:ring-blue-400 font-mono"
                                                    />
                                                </div>
                                            </div>
                                        </div>

                                        <div className="bg-[#1b43aa]/80 border border-blue-400/20 rounded-xl p-3 space-y-1.5 text-[8px] shadow-2xs">
                                            <div className="flex items-center justify-between text-[8px]  text-white pb-1 border-b border-blue-400/20">
                                                <span>Settlement &amp; Tax Summary</span>
                                                <span className="text-[8px] text-blue-200 font-mono">[{taxConfigCode}]</span>
                                            </div>
                                            <div className="flex justify-between text-blue-100 text-[8px] pt-0.5">
                                                <span>Base Room Tariff</span>
                                                <span className="font-mono  text-white">৳ {baseAmount.toFixed(2)}</span>
                                            </div>
                                            {isTaxApplicable && totalTax > 0 && (
                                                <div className="flex justify-between text-emerald-300 text-[8px]">
                                                    <span>Statutory Taxes &amp; VAT</span>
                                                    <span className="font-mono ">+৳ {totalTax.toFixed(2)}</span>
                                                </div>
                                            )}
                                            <div className="flex justify-between text-blue-100 text-[8px] pt-0.5 border-t border-blue-400/20">
                                                <span>Total Payable</span>
                                                <span className="font-mono  text-white">৳ {totalAmount.toFixed(2)}</span>
                                            </div>
                                            <div className="flex justify-between text-blue-100 text-[8px]">
                                                <span>Total Paid</span>
                                                <span className="font-mono  text-emerald-300">৳ {paidAmount.toFixed(2)}</span>
                                            </div>
                                            <div className="flex justify-between text-blue-100 text-[8px] ">
                                                <span className="text-white">Current Balance Due</span>
                                                <span className="font-mono text-rose-300 ">৳ {dueAmount.toFixed(2)}</span>
                                            </div>
                                            <div className="flex justify-between text-blue-100 text-[8px] pt-1 border-t border-blue-400/20 ">
                                                <span className="text-white">Payment Amount</span>
                                                <span className="font-mono text-emerald-300 text-[8px]">৳ {paymentAmount.toFixed(2)}</span>
                                            </div>
                                            {/* Quick Pay Buttons */}
                                            {dueAmount > 0 && (
                                                <div className="pt-1 flex items-center gap-1.5">
                                                    <button
                                                        type="button"
                                                        onClick={() => setPaymentAmount(dueAmount)}
                                                        className="flex-1 py-1 bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-400/30 rounded text-[8px]  text-emerald-200 transition-colors cursor-pointer text-center"
                                                    >
                                                        Pay Full Due (৳{dueAmount.toFixed(0)})
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() => setPaymentAmount(Math.round(dueAmount / 2))}
                                                        className="py-1 px-2.5 bg-blue-500/20 hover:bg-blue-500/30 border border-blue-400/30 rounded text-[8px]  text-blue-200 transition-colors cursor-pointer text-center"
                                                    >
                                                        50% (৳{Math.round(dueAmount / 2)})
                                                    </button>
                                                </div>
                                            )}
                                        </div>

                                        <div className="flex flex-col gap-1">
                                            <label className="text-[8px]  text-white">Payment Remarks</label>
                                            <textarea
                                                value={paymentRemarks}
                                                onChange={e => setPaymentRemarks(e.target.value)}
                                                rows={2}
                                                placeholder="Add any notes or transaction details here..."
                                                className="w-full p-2 border border-blue-300 rounded text-[8px] bg-white text-gray-900 outline-none focus:ring-2 focus:ring-blue-400"
                                            />
                                        </div>
                                    </div>
                                )}

                                {/* MODE 4: ROOM SPLIT (02-room-split-modal.png) */}
                                {mode === 'split' && (
                                    <div className="space-y-3">
                                        <div className="text-[8px]  text-white">New Room Assignment:</div>
                                        <div className="grid grid-cols-2 gap-1">
                                            <div className="flex flex-col gap-1">
                                                <label className="text-[8px] font-semibold text-blue-100">Select Room</label>
                                                <input
                                                    type="text"
                                                    value={booking.roomNumber}
                                                    disabled
                                                    className="w-full h-8 px-2 border border-blue-300/40 rounded text-[8px] bg-white text-gray-900 "
                                                />
                                            </div>
                                            <div className="flex flex-col gap-1">
                                                <label className="text-[8px] font-semibold text-blue-100">Select Guest</label>
                                                <input
                                                    type="text"
                                                    value={booking.guestName}
                                                    disabled
                                                    className="w-full h-8 px-2 border border-blue-300/40 rounded text-[8px] bg-white text-gray-900 "
                                                />
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-2 gap-1">
                                            <div className="flex flex-col gap-1">
                                                <label className="text-[8px] font-semibold text-blue-100">From Date</label>
                                                <input
                                                    type="date"
                                                    value={splitFromDate}
                                                    onChange={e => setSplitFromDate(e.target.value)}
                                                    className="w-full h-8 px-2 border border-blue-300 rounded text-[8px] bg-white text-gray-900  outline-none"
                                                />
                                            </div>
                                            <div className="flex flex-col gap-1">
                                                <label className="text-[8px] font-semibold text-blue-100">To Date</label>
                                                <input
                                                    type="date"
                                                    value={splitToDate}
                                                    onChange={e => setSplitToDate(e.target.value)}
                                                    className="w-full h-8 px-2 border border-blue-300 rounded text-[8px] bg-white text-gray-900  outline-none"
                                                />
                                            </div>
                                        </div>

                                        <div className="flex flex-col gap-1">
                                            <label className="text-[8px] font-semibold text-blue-100">Target Split Room</label>
                                            <select
                                                value={splitRoom}
                                                onChange={e => setSplitRoom(e.target.value)}
                                                className="w-full h-8 px-2 border border-blue-300 rounded text-[8px] bg-white text-gray-900  outline-none"
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
                                            className="h-7 px-3 border border-blue-300/60 hover:bg-white/10 rounded text-[8px]  text-white flex items-center gap-1.5 cursor-pointer transition-colors"
                                        >
                                            <Plus size={13} />
                                            <span>Add Room</span>
                                        </button>
                                    </div>
                                )}

                                {/* MODE 5: STOP ROOM MOVE (03-stop-room-move-modal.png) */}
                                {mode === 'stop_move' && (
                                    <div className="space-y-4">
                                        <p className="text-[8px] text-blue-100 leading-relaxed">
                                            This action will stop all pending room moves for the selected reservations.
                                        </p>
                                        <div className="bg-[#1b43aa]/80 border border-blue-400/20 rounded-xl p-3 flex items-start gap-1">
                                            <input
                                                type="checkbox"
                                                id="allow_move"
                                                checked={allowRoomMove}
                                                onChange={e => setAllowRoomMove(e.target.checked)}
                                                className="w-4 h-4 rounded text-blue-600 bg-white cursor-pointer mt-0.5 accent-blue-500"
                                            />
                                            <label htmlFor="allow_move" className="cursor-pointer">
                                                <div className="text-[8px]  text-white">Allow room move</div>
                                                <div className="text-[8px] text-blue-200">Sends allow_room_move as true.</div>
                                            </label>
                                        </div>
                                    </div>
                                )}

                                {/* MODE 6: ADD NEW BOOKING (04-add-new-booking-modal.png) */}
                                {mode === 'add_booking' && (
                                    <div className="space-y-3">
                                        <div className="flex flex-col gap-1">
                                            <label className="text-[8px] font-semibold text-blue-100">Owner Folio</label>
                                            <select
                                                value={newBookingFolio}
                                                onChange={e => setNewBookingFolio(e.target.value)}
                                                className="w-full h-8 px-2 border border-blue-300 rounded text-[8px] bg-white text-gray-900  outline-none"
                                            >
                                                <option value={newBookingFolio}>{newBookingFolio}</option>
                                            </select>
                                        </div>

                                        <div className="flex flex-col gap-1">
                                            <label className="text-[8px] font-semibold text-blue-100">Group Owner</label>
                                            <select
                                                value={newBookingGroupOwner}
                                                onChange={e => setNewBookingGroupOwner(e.target.value)}
                                                className="w-full h-8 px-2 border border-blue-300 rounded text-[8px] bg-white text-gray-900  outline-none"
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
                                            <span className="text-[8px]  text-white">Cancellation Type</span>
                                            <span className="text-[8px] text-blue-200 flex items-center gap-1">
                                                <Info size={11} /> Policy
                                            </span>
                                        </div>

                                        <div className="flex items-center gap-4 text-[8px] text-white">
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
                                            <label className="flex items-center gap-1 text-[8px] text-white cursor-pointer">
                                                <input type="checkbox" defaultChecked className="accent-blue-500 rounded" />
                                                <span>{booking.reservationNumber} - {booking.roomType || 'WRP'} - {booking.roomNumber}</span>
                                            </label>
                                        </div>

                                        <div className="grid grid-cols-2 gap-1">
                                            <div className="flex flex-col gap-1">
                                                <label className="text-[8px] font-semibold text-blue-100">Cancellation Fee *</label>
                                                <input
                                                    type="number"
                                                    value={cancelFee}
                                                    onChange={e => setCancelFee(Number(e.target.value))}
                                                    className="w-full h-8 px-2 border border-blue-300 rounded text-[8px] bg-white text-gray-900  outline-none font-mono"
                                                />
                                            </div>
                                            <div className="flex flex-col gap-1">
                                                <label className="text-[8px] font-semibold text-blue-100">Refund Amount *</label>
                                                <input
                                                    type="number"
                                                    value={cancelRefund}
                                                    onChange={e => setCancelRefund(Number(e.target.value))}
                                                    className="w-full h-8 px-2 border border-blue-300 rounded text-[8px] bg-white text-gray-900  outline-none font-mono"
                                                />
                                            </div>
                                        </div>

                                        <div className="flex flex-col gap-1">
                                            <label className="text-[8px] font-semibold text-blue-100">Cancellation Reason *</label>
                                            <textarea
                                                value={cancelReason}
                                                onChange={e => setCancelReason(e.target.value)}
                                                rows={2}
                                                placeholder="e.g., Guest requested to cancel due to a change in plans."
                                                className="w-full p-2 border border-blue-300 rounded text-[8px] bg-white text-gray-900 outline-none"
                                            />
                                        </div>
                                    </div>
                                )}

                                {/* MODE 8: VOID RESERVATION (05-void-reservation-modal.png) */}
                                {mode === 'void' && (
                                    <div className="space-y-3">
                                        <div className="text-[8px]  text-white">Apply Changes On:</div>
                                        <div className="flex items-center gap-4 text-[8px] text-white">
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
                                            <label className="flex items-center gap-1 text-[8px] text-white cursor-pointer">
                                                <input type="checkbox" defaultChecked className="accent-blue-500 rounded" />
                                                <span>{booking.reservationNumber}-1 - {booking.roomType || 'WRP'} - {booking.roomNumber}</span>
                                            </label>
                                        </div>

                                        <div className="flex flex-col gap-1">
                                            <label className="text-[8px] font-semibold text-rose-300 ">Reason for Voiding *</label>
                                            <textarea
                                                value={voidReason}
                                                onChange={e => setVoidReason(e.target.value)}
                                                rows={3}
                                                placeholder="Please enter the reason for voiding this reservation..."
                                                className="w-full p-2 border border-rose-300 rounded text-[8px] bg-white text-gray-900 outline-none"
                                            />
                                        </div>
                                    </div>
                                )}

                                {/* MODE 9: RESERVATION HOLD (09-reservation-hold-modal.png) */}
                                {mode === 'hold' && (
                                    <div className="space-y-3">
                                        <div className="grid grid-cols-2 gap-1">
                                            <div className="flex flex-col gap-1">
                                                <label className="text-[8px] font-semibold text-blue-100">Hold Start Date *</label>
                                                <input
                                                    type="date"
                                                    value={holdStartDate}
                                                    onChange={e => setHoldStartDate(e.target.value)}
                                                    className="w-full h-8 px-2 border border-blue-300 rounded text-[8px] bg-white text-gray-900  outline-none"
                                                />
                                            </div>
                                            <div className="flex flex-col gap-1">
                                                <label className="text-[8px] font-semibold text-blue-100">Hold End Date *</label>
                                                <input
                                                    type="date"
                                                    value={holdEndDate}
                                                    onChange={e => setHoldEndDate(e.target.value)}
                                                    className="w-full h-8 px-2 border border-blue-300 rounded text-[8px] bg-white text-gray-900  outline-none"
                                                />
                                            </div>
                                        </div>

                                        <div className="flex flex-col gap-1">
                                            <label className="text-[8px] font-semibold text-blue-100">Hold Reason *</label>
                                            <textarea
                                                value={holdReason}
                                                onChange={e => setHoldReason(e.target.value)}
                                                rows={3}
                                                placeholder="e.g., Waiting for guest confirmation."
                                                className="w-full p-2 border border-blue-300 rounded text-[8px] bg-white text-gray-900 outline-none"
                                            />
                                        </div>
                                    </div>
                                )}

                                {/* MODE 10: UNASSIGN ROOM (10-unassign-room-modal.png) */}
                                {mode === 'unassign' && (
                                    <div className="space-y-3">
                                        <p className="text-[8px] text-blue-100 leading-relaxed">
                                            Select a room and submit to unassign it from this reservation.
                                        </p>
                                        <div className="bg-[#1b43aa]/80 border border-blue-400/20 rounded-xl p-3 space-y-2">
                                            <div className="flex items-center gap-1 text-[8px]  text-white">
                                                <Home size={13} className="text-blue-300" />
                                                <span>Room</span>
                                            </div>
                                            <div className="relative">
                                                <select
                                                    value={unassignRoom}
                                                    onChange={e => setUnassignRoom(e.target.value)}
                                                    className="w-full h-8 px-2.5 border border-blue-300 rounded text-[8px] bg-white text-gray-900  outline-none cursor-pointer appearance-none pr-6"
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

                                {/* MODE 11: UNGROUP RESERVATION */}
                                {mode === 'ungroup' && (
                                    <div className="space-y-3">
                                        <div className="bg-amber-500/15 border border-amber-400/30 rounded-xl p-3 space-y-1.5 text-amber-100">
                                            <div className="flex items-center gap-1.5 text-white font-bold text-[10.5px]">
                                                <RefreshCw size={13} className="text-amber-300" />
                                                <span>Ungroup Reservation</span>
                                            </div>
                                            <p className="text-[9px] leading-relaxed text-amber-200">
                                                Unlink this reservation ({booking.reservationNumber}) from group {booking.groupCode || ''}. Its confirmation code will remain 100% untouched.
                                            </p>
                                        </div>

                                        <div className="bg-[#1b43aa]/80 border border-blue-400/20 rounded-xl p-2.5 space-y-1">
                                            <div className="text-[8px] text-blue-200/80 uppercase font-semibold">Booking to Unlink</div>
                                            <div className="text-[9.5px] font-mono font-bold text-white">
                                                {booking.reservationNumber} - {booking.guestName} (Room {booking.roomNumber})
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {/* MODE 12: CHANGE GROUP OWNER (07-change-group-owner-modal.png) */}
                                {mode === 'change_owner' && (
                                    <div className="space-y-3">
                                        <div className="flex flex-col gap-1">
                                            <label className="text-[10.5px]  text-white">Select New Group Owner</label>
                                            <div className="relative">
                                                <select
                                                    value={selectedNewOwner}
                                                    onChange={e => setSelectedNewOwner(e.target.value)}
                                                    className="w-full h-8 px-2.5 border border-blue-300 rounded text-[8px] bg-white text-gray-900  outline-none cursor-pointer appearance-none pr-6"
                                                >
                                                    <option value={`${booking.guestName} - ${booking.roomNumber} (Current Owner)`}>
                                                        {booking.guestName} - {booking.roomNumber} (Current Owner)
                                                    </option>
                                                </select>
                                                <ChevronDown size={12} className="absolute right-2.5 top-2.5 text-gray-600 pointer-events-none" />
                                            </div>
                                        </div>

                                        <div className="bg-[#1b43aa]/80 border border-blue-400/20 rounded-xl p-3 flex items-start gap-1 text-[8px] text-blue-100">
                                            <Crown size={15} className="text-amber-400 flex-shrink-0 mt-0.5" />
                                            <p className="leading-relaxed">
                                                This updates the reservation owner at group level using the selected guest and their folio.
                                            </p>
                                        </div>
                                    </div>
                                )}

                                {/* MODE 13: LINK TO GROUP WITHOUT RENUMBERING */}
                                {mode === 'link_group' && (
                                    <div className="space-y-3">
                                        <div className="bg-blue-500/15 border border-blue-400/30 rounded-xl p-3 space-y-1.5 text-blue-100">
                                            <div className="flex items-center gap-1.5 text-white font-bold text-[10.5px]">
                                                <LinkIcon size={13} className="text-blue-300" />
                                                <span>Link to Group (Without Renumbering)</span>
                                            </div>
                                            <p className="text-[9px] leading-relaxed text-blue-200">
                                                Link another existing reservation into this group. Confirmation numbers already sent to guests will <strong>NEVER</strong> be altered or invalidated.
                                            </p>
                                        </div>

                                        <div className="bg-[#1b43aa]/80 border border-blue-400/20 rounded-xl p-2.5 space-y-1">
                                            <div className="text-[8px] text-blue-200/80 uppercase font-semibold">Group Code</div>
                                            <div className="text-[9.5px] font-mono font-bold text-white">
                                                {booking.groupCode || 'Will be auto-generated (GRP-YYYYMMDD-XXXX)'}
                                            </div>
                                        </div>

                                        <div className="space-y-1.5">
                                            <label className="text-[9.5px] font-semibold text-white block">
                                                Reservation Confirmation # to Link *
                                            </label>
                                            <input
                                                type="text"
                                                value={linkTargetResNo}
                                                onChange={e => setLinkTargetResNo(e.target.value.toUpperCase())}
                                                placeholder="e.g. RES-202610260002"
                                                className="w-full h-8 px-2.5 border border-blue-300 rounded text-[9.5px] bg-white text-gray-900 font-mono font-semibold outline-none focus:ring-2 focus:ring-blue-400"
                                            />
                                            {linkCandidates.length > 0 && (
                                                <div className="mt-2 space-y-1">
                                                    <span className="text-[8px] text-blue-200/80 block">Or select from existing bookings:</span>
                                                    <div className="relative">
                                                        <select
                                                            onChange={e => {
                                                                if (e.target.value) setLinkTargetResNo(e.target.value);
                                                            }}
                                                            className="w-full h-8 px-2 border border-blue-300 rounded text-[8px] bg-white text-gray-900 outline-none cursor-pointer appearance-none pr-6"
                                                        >
                                                            <option value="">-- Choose Candidate Reservation --</option>
                                                            {linkCandidates.map((c: any) => (
                                                                <option key={c.reservationNumber} value={c.reservationNumber}>
                                                                    {c.reservationNumber} - {c.guestName} (Room {c.roomNumber || 'N/A'})
                                                                </option>
                                                            ))}
                                                        </select>
                                                        <ChevronDown size={12} className="absolute right-2 top-2.5 text-gray-600 pointer-events-none" />
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* FIXED PINNED BOTTOM ACTION FOOTER */}
                            <div className="flex-shrink-0 px-4 py-3 bg-[#0c2e7a]/80 border-t border-blue-400/20 flex items-center justify-end gap-1.5">
                                <button
                                    type="button"
                                    onClick={() => setMode('overview')}
                                    className="h-8 px-4 bg-white hover:bg-gray-100 text-gray-800 rounded-md text-[9.5px] font-semibold cursor-pointer shadow-xs transition-all active:scale-[0.98]"
                                >
                                    Cancel
                                </button>
                                {!booking?.isPast && (
                                    <button
                                        type="button"
                                        onClick={handlePrimaryAction}
                                        className={`h-8 px-4 text-white rounded-md text-[9.5px] font-semibold flex items-center gap-1.5 cursor-pointer shadow-md transition-all active:scale-[0.98] ${modeMeta.buttonClass}`}
                                    >
                                        {modeMeta.buttonIcon}
                                        <span>{modeMeta.buttonText}</span>
                                    </button>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    </div>,
    document.body
);
};

export default ReservationActionDrawer;
