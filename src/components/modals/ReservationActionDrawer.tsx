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
    Link as LinkIcon,
    FileText,
    Key,
    ArrowRight,
    ArrowLeft,
    ArrowRightLeft,
    Sparkles,
    CheckCircle2,
    RotateCcw,
    Undo2,
    Clock,
    LogOut,
    Percent
} from 'lucide-react';
import { getApiBaseUrl, getActivePropertyId } from '../../utils/apiUrl';
import { getCurrencySymbol } from '../../utils/currencyUtils';
import type { AmendBookingData } from './AmendStayModal';
import { calculateReservationTaxes } from '../../utils/taxCalculationEngine';
import {
    getStandardDailyRateForRoom,
    getAvailableRoomsForStay,
    getRoomTypeCapacity,
    calculateTariffForRatePlan,
    getOperatingSystemDate,
    getAllStoredReservations,
    updateStopRoomMoveInDB,
    executeRoomSwapInDB,
    linkBookingsInDB,
    unlinkBookingInDB,
    generateRegistrationNumber,
    getConnectingPartnerMap,
    isRoomUnassigned,
    getDynamicRoomTypes,
    getDynamicRatePlans,
    getDynamicPackages,
    syncRatePlansAndPackagesFromDB
} from '../../utils/roomInventoryEngine';
import { toast } from '../../context/ToastContext';

import { DrawerFolioOperations } from '../folio/DrawerFolioOperations';
import { DigitalRegCardModal } from './DigitalRegCardModal';

export type DrawerMode =
    | 'overview'
    | 'folio'
    | 'amend'
    | 'move'
    | 'swap'
    | 'reg_card'
    | 'payment'
    | 'split'
    | 'stop_move'
    | 'add_booking'
    | 'cancel'
    | 'void'
    | 'hold'
    | 'confirm_hold'
    | 'release_hold'
    | 'reinstate'
    | 'undo_checkin'
    | 'unassign'
    | 'ungroup'
    | 'link_group'
    | 'change_owner'
    | 'checkout'
    | 'checkin'
    | 'tax_exemption';

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
    onSaveRoomMove?: (
        bookingId: string,
        newRoomNumber: string,
        newFromDate: string,
        newToDate: string,
        newRoomType?: string,
        newRatePlan?: string,
        upgradeAdjustment?: { mode: 'complimentary' | 'charge'; amount: number }
    ) => void;
    onSavePayment?: (bookingId: string, method: string, amount: number, remarks: string) => void;
    onSaveRoomSplit?: (bookingId: string, targetRoomNumber: string, fromDate: string, toDate: string) => void;
    onStopRoomMove?: (bookingId: string, allowRoomMove: boolean) => void;
    onProceedNewBooking?: (bookingId: string, ownerFolio: string, groupOwner: string, sourceBooking?: AmendBookingData) => void;
    onConfirmCancel?: (bookingId: string, fee: number, refund: number, reason: string) => void;
    onConfirmVoid?: (bookingId: string, reason: string) => void;
    onConfirmHold?: (
        bookingId: string,
        startDate: string,
        endDate: string,
        reason: string,
        holdUntilTime?: string,
        holdTier?: string,
        depositRequired?: number
    ) => void;
    onConfirmHoldBooking?: (bookingId: string, depositAmount?: number, paymentMethod?: string, notes?: string) => void;
    onReleaseHeldRoom?: (bookingId: string, reason?: string) => void;
    onReinstateReservation?: (bookingId: string) => void;
    onUndoCheckIn?: (reservationNumber: string) => void;
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
    onConfirmHoldBooking,
    onReleaseHeldRoom,
    onReinstateReservation,
    onUndoCheckIn,
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
    const currencySymbol = useMemo(() => getCurrencySymbol(), []);

    // Current Active Mode State
    const [mode, setMode] = useState<DrawerMode>(initialMode);
    const [isOptionsOpen, setIsOptionsOpen] = useState(false);
    const [isTaxExemptionModalOpen, setIsTaxExemptionModalOpen] = useState(false);

    // Status-Driven Document Printing States
    const [isPrintMenuOpen, setIsPrintMenuOpen] = useState(false);
    const [activePrintDoc, setActivePrintDoc] = useState<
        | 'reg_card'
        | 'voucher'
        | 'folio'
        | 'cancellation'
        | 'group_invoice'
        | 'group_voucher'
        | 'group_prereg'
        | 'batch_grc'
        | null
    >(null);

    // Synchronize mode when initialMode or booking changes
    useEffect(() => {
        if (isOpen) {
            setMode(initialMode);
            setIsOptionsOpen(false);
            setIsPrintMenuOpen(false);
            setActivePrintDoc(null);
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
    const [moveRoomType, setMoveRoomType] = useState<string>('All');
    const [moveRateType, setMoveRateType] = useState<string>('BAR');
    const [upgradeBillingMode, setUpgradeBillingMode] = useState<'complimentary' | 'charge'>('complimentary');

    // 3. Add Payment Form States
    const [paymentFolio, setPaymentFolio] = useState<string>('');
    const [paymentMethod, setPaymentMethod] = useState<string>('Cash');
    const [paymentAmount, setPaymentAmount] = useState<number>(0);
    const [paymentRemarks, setPaymentRemarks] = useState<string>('');

    // 4. Room Split Form States
    const [splitRoom, setSplitRoom] = useState<string>('');
    const [splitFromDate, setSplitFromDate] = useState<string>('');
    const [splitToDate, setSplitToDate] = useState<string>('');

    // 5. Stop Room Move Form States (Yanolja PMS Lock & Move Guard)
    const [stopMoveLocked, setStopMoveLocked] = useState(false);
    const [stopMoveReason, setStopMoveReason] = useState('Guest requested fixed room assignment');
    const [stopMovePreset, setStopMovePreset] = useState('Guest Special Request');
    const [isSavingStopMove, setIsSavingStopMove] = useState(false);
    const [supervisorOverrideMove, setSupervisorOverrideMove] = useState(false);

    // 5b. Atomic Room Swap States
    const [swapTargetBookingId, setSwapTargetBookingId] = useState('');
    const [swapReason, setSwapReason] = useState('Mutual room change requested by guests');
    const [isSwapping, setIsSwapping] = useState(false);

    // 5c. Digital Reg Card Modal State
    const [isRegCardModalOpen, setIsRegCardModalOpen] = useState(false);

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
    const [holdUntilTime, setHoldUntilTime] = useState<string>('18:00:00');
    const [holdTier, setHoldTier] = useState<'courtesy' | 'corporate' | 'vip'>('courtesy');
    const [holdPreset, setHoldPreset] = useState<string>('6pm');
    const [holdReason, setHoldReason] = useState<string>('');
    const [confirmHoldDeposit, setConfirmHoldDeposit] = useState<number>(0);
    const [confirmHoldMethod, setConfirmHoldMethod] = useState<string>('Cash');
    const [confirmHoldNotes, setConfirmHoldNotes] = useState<string>('');
    const [releaseHoldReason, setReleaseHoldReason] = useState<string>('Cut-off time reached / Expired');

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
    const [isIssuingKeycard, setIsIssuingKeycard] = useState(false);
    const [ratesVersion, setRatesVersion] = useState(0);

    // Proactively sync rate plans & packages dynamically from database
    useEffect(() => {
        syncRatePlansAndPackagesFromDB().then(() => {
            setRatesVersion(v => v + 1);
        }).catch(() => {});
    }, []);

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

            const initialTargetRoom = initialTargetRoomNumber || booking.roomNumber;
            setMoveSelectedRoom(initialTargetRoom);
            const targetRoomObj = allRooms.find(r => String(r.roomNumber) === String(initialTargetRoom));
            const targetRoomType = targetRoomObj?.type || booking.roomType || 'All';
            setMoveRoomType(targetRoomType);
            const initialPlan = (booking.ratePlan && booking.ratePlan !== 'Direct' && booking.ratePlan !== 'Summer Vacation')
                ? booking.ratePlan
                : 'BAR';
            setMoveRateType(initialPlan);
            setUpgradeBillingMode('complimentary');
            const isGuestInHouse = booking.status === 'IN-HOUSE' || booking.status === 'ARRIVED' || booking.status === 'STAYOVER';
            // For in-house guests, room move is strictly locked to take effect from System Date onwards
            const effectiveMoveStart = isGuestInHouse
                ? (arr > operatingSystemDate ? arr : operatingSystemDate)
                : arr;
            setMoveFromDate(effectiveMoveStart);
            setToDate(dep);

            setPaymentFolio(`${booking.guestName} - ${booking.folioNumber || `FOL-${booking.reservationNumber}-1`}`);
            setPaymentMethod('Cash');
            setPaymentAmount(due > 0 ? due : total);
            setPaymentRemarks('');

            setSplitRoom(booking.roomNumber);
            setSplitFromDate(arr);
            setSplitToDate(dep);

            const isLocked = Boolean((booking as any).stopRoomMove);
            setStopMoveLocked(isLocked);
            setStopMoveReason((booking as any).stopRoomMoveReason || 'Guest requested fixed room assignment');
            setSupervisorOverrideMove(false);
            setSwapTargetBookingId('');

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
            setHoldUntilTime('18:00:00');
            setHoldTier('courtesy');
            setHoldPreset('6pm');
            setHoldReason('');

            setConfirmHoldDeposit(booking.depositRequired || 0);
            setConfirmHoldMethod('Cash');
            setConfirmHoldNotes('');
            setReleaseHoldReason('Cut-off time reached / Expired');

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

        // Special case: Interconnecting Suite with component rooms
        const isConn = Boolean(
            booking.isConnectingSuite ||
            (booking.roomType && (booking.roomType.toLowerCase().includes('connecting') || booking.roomType.toLowerCase().includes('interconnecting'))) ||
            (typeof booking.roomNumber === 'string' && booking.roomNumber.includes('+')) ||
            (Array.isArray(booking.allocatedRooms) && booking.allocatedRooms.length > 1)
        );

        if (isConn) {
            let rooms: string[] = [];
            if (Array.isArray(booking.allocatedRooms) && booking.allocatedRooms.length > 1) {
                rooms = booking.allocatedRooms;
            } else if (typeof booking.roomNumber === 'string' && booking.roomNumber.includes('+')) {
                rooms = booking.roomNumber.split('+').map((s: string) => s.trim());
            } else if (booking.roomNumber) {
                const partnerMap = getConnectingPartnerMap();
                const partner = booking.connectedTo || partnerMap.get(String(booking.roomNumber).trim());
                rooms = partner ? [String(booking.roomNumber), partner] : [String(booking.roomNumber)];
            } else {
                rooms = ['Suite'];
            }
            const roomDisplay = rooms.join(' + ');

            return [{
                roomNumber: roomDisplay,
                allocatedRooms: rooms,
                roomType: booking.roomType || 'Interconnecting Suite',
                ratePlan: booking.ratePlan || 'Standard Rate',
                guestName: booking.guestName,
                adults: booking.adults ?? 2,
                children: booking.children ?? 0,
                status: booking.status,
                reservationNumber: booking.reservationNumber,
                subBookingNumber: booking.reservationNumber,
                registrationNumber: booking.registrationNumber,
                folioNumber: booking.folioNumber,
                isPrimary: true,
                isConnecting: true,
                connectedTo: rooms.join(' & ')
            }];
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

    // All active other reservations eligible for Atomic Room Swap
    const allOtherBookings = useMemo(() => {
        if (!booking) return [];
        const stored = getAllStoredReservations();
        return stored.filter(r => {
            const isDifferent = String(r.id) !== String(booking.id) && r.reservationNumber !== booking.reservationNumber;
            const notCancelled = String(r.status || '').toLowerCase() !== 'cancelled' && String(r.status || '').toLowerCase() !== 'voided';
            const hasRoom = r.roomNumber && r.roomNumber !== 'Unassigned' && r.roomNumber !== booking.roomNumber;
            return isDifferent && notCancelled && hasRoom;
        });
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

    // Dynamic Room Types available for selection
    const dynamicRoomTypes = useMemo(() => {
        const listFromRooms = Array.from(new Set(allRooms.map(r => r.type).filter(Boolean)));
        const listFromEngine = getDynamicRoomTypes().map(t => t.name).filter(Boolean);
        const combined = Array.from(new Set([...listFromRooms, ...listFromEngine]));
        return combined.length > 0 ? combined : ['Deluxe Suite', 'Deluxe Double', 'Superior King', 'Executive Suite'];
    }, [allRooms]);

    // Dynamic Rate Plans and Packages available for selection
    const dynamicRatePlansAndPackages = useMemo(() => {
        const sanitizeLabel = (str?: string) => {
            if (!str) return '';
            return str
                .replace(/[\uD800-\uDBFF][\uDC00-\uDFFF]/g, '') // remove emojis
                .replace(/[^\x20-\x7E]/g, '') // remove non-ascii/mojibake bytes
                .replace(/\s+/g, ' ')
                .trim();
        };

        const plans = getDynamicRatePlans();
        const pkgs = getDynamicPackages();
        const result: Array<{ label: string; value: string; isPackage?: boolean }> = [];

        // Map active rate plans from database
        plans.forEach(p => {
            const rawPlanName = p.name || p.shortCode || p.code;
            const planName = sanitizeLabel(rawPlanName) || rawPlanName;
            if (planName && planName !== 'Direct' && planName !== 'Summer Vacation' && !result.some(r => r.value === planName)) {
                result.push({ label: planName, value: planName });
            }
        });

        // Add booking's current rate plan if valid and unique
        const rawCurrentPlan = booking?.ratePlan;
        const currentPlan = sanitizeLabel(rawCurrentPlan) || rawCurrentPlan;
        if (currentPlan && currentPlan !== 'Direct' && currentPlan !== 'Summer Vacation') {
            if (!result.some(r => r.value.toLowerCase() === currentPlan.toLowerCase())) {
                result.unshift({ label: currentPlan, value: currentPlan });
            }
        }

        // Map active hotel packages
        pkgs.forEach(pkg => {
            const rawPkgName = pkg.name || pkg.shortCode || pkg.code;
            const pkgName = sanitizeLabel(rawPkgName) || rawPkgName;
            if (pkgName && !result.some(r => r.value === pkgName)) {
                result.push({ label: `${pkgName} (Package)`, value: pkgName, isPackage: true });
            }
        });

        if (result.length === 0) {
            result.push({ label: 'Standard Rate', value: 'Standard Rate' });
        }
        return result;
    }, [booking?.ratePlan, ratesVersion]);

    // Comprehensive Room Move & Upgrade Analysis Engine
    const roomMoveAnalysis = useMemo(() => {
        if (!booking) return null;
        const currentRoomObj = allRooms.find(r => String(r.roomNumber) === String(booking.roomNumber));
        const currentRoomType = booking.roomType || currentRoomObj?.type || 'Standard';
        const targetRoomObj = allRooms.find(r => String(r.roomNumber) === String(moveSelectedRoom));
        const targetRoomType = targetRoomObj?.type || (moveRoomType !== 'All' ? moveRoomType : currentRoomType);

        const currentDailyRate = getStandardDailyRateForRoom(booking.roomNumber, currentRoomType);
        const targetDailyRate = getStandardDailyRateForRoom(moveSelectedRoom, targetRoomType);
        const dailyDiff = targetDailyRate - currentDailyRate;

        const stayNights = Math.max(1, Math.round((new Date(moveToDate).getTime() - new Date(moveFromDate).getTime()) / 86400000) || (booking.nights || 1));
        const totalDiff = dailyDiff * stayNights;

        const isDifferentRoom = String(moveSelectedRoom) !== String(booking.roomNumber);
        const isDifferentCategory = targetRoomType !== currentRoomType;

        // Smart Category Hierarchy Check (Suite > Executive > Deluxe > Superior > Standard)
        const isHigherCategory = (() => {
            if (dailyDiff > 0) return true;
            const normTarget = targetRoomType.toLowerCase();
            const normCurrent = currentRoomType.toLowerCase();
            if (normTarget.includes('suite') && !normCurrent.includes('suite')) return true;
            if (normTarget.includes('executive') && !normCurrent.includes('executive')) return true;
            if (normTarget.includes('deluxe') && (normCurrent.includes('standard') || normCurrent.includes('single'))) return true;
            return false;
        })();

        const isUpgrade = isDifferentRoom && (isHigherCategory || (isDifferentCategory && dailyDiff >= 0));
        const isDowngrade = isDifferentRoom && isDifferentCategory && !isHigherCategory && dailyDiff < 0;
        const isSameCategory = isDifferentRoom && !isDifferentCategory;

        return {
            currentRoomType,
            targetRoomType,
            currentDailyRate,
            targetDailyRate,
            dailyDiff: Math.abs(dailyDiff),
            totalDiff: Math.abs(totalDiff),
            rawDailyDiff: dailyDiff,
            rawTotalDiff: totalDiff,
            stayNights,
            isDifferentRoom,
            isUpgrade,
            isDowngrade,
            isSameCategory,
        };
    }, [booking, allRooms, moveSelectedRoom, moveRoomType, moveToDate, moveFromDate]);

    // Derived status and flags for hook execution order compliance
    const activeStatus = ((activeRoom?.status || booking?.status) || 'CONFIRMED').toUpperCase();
    const isConnectingSuite = Boolean(
        booking?.isConnectingSuite ||
        (booking?.roomType && (booking.roomType.toLowerCase().includes('connecting') || booking.roomType.toLowerCase().includes('interconnecting'))) ||
        (typeof booking?.roomNumber === 'string' && booking.roomNumber.includes('+')) ||
        (Array.isArray(booking?.allocatedRooms) && booking.allocatedRooms.length > 1)
    );

    // Dynamic Status-Driven Categorized Options List (matching Yanolja Cloud / eZee / Wings PMS standards)
    const groupedOptions = useMemo(() => {
        if (!booking) return [];

        const s = activeStatus;
        const isHold = s === 'HOLD' || s === 'TENTATIVE';
        const isInHouse = s === 'IN-HOUSE' || s === 'ARRIVED' || s === 'STAYOVER';
        const isCheckedOut = s === 'CHECKED-OUT' || s === 'COMPLETED' || s === 'DEPARTED';
        const isCancelled = s === 'CANCELLED';
        const isVoid = s === 'VOID' || s === 'VOIDED';

        if (booking.isPast || isVoid) {
            return [];
        }

        const groups: Array<{
            title: string;
            items: Array<{
                key: DrawerMode;
                label: string;
                icon: React.ElementType;
                badge?: string;
                badgeColor?: string;
                isDanger?: boolean;
                isSpecial?: boolean;
            }>;
        }> = [];

        // ==========================================
        // 1. CHECKED-OUT
        // ==========================================
        if (isCheckedOut) {
            groups.push({
                title: 'Financial Reconciliation',
                items: [
                    { key: 'folio', label: 'Folio Operations', icon: FileText, badge: 'Folio', badgeColor: 'bg-blue-100 text-blue-700 font-bold' },
                    { key: 'payment', label: 'Settle / Refund Folio', icon: CreditCard, badge: 'Folio', badgeColor: 'bg-blue-100 text-blue-700' }
                ]
            });
            return groups;
        }

        // ==========================================
        // 2. CANCELLED
        // ==========================================
        if (isCancelled) {
            groups.push({
                title: 'Financial',
                items: [
                    { key: 'folio', label: 'Folio Operations', icon: FileText, badge: 'Folio', badgeColor: 'bg-blue-100 text-blue-700 font-bold' },
                    { key: 'payment', label: 'Settle / Refund Cancellation Fee', icon: CreditCard }
                ]
            });
            groups.push({
                title: 'Lifecycle',
                items: [
                    { key: 'reinstate', label: 'Reinstate Reservation', icon: RotateCcw, badge: 'Restore', badgeColor: 'bg-emerald-100 text-emerald-800 font-bold', isSpecial: true }
                ]
            });
            return groups;
        }

        // ==========================================
        // 3. IN-HOUSE
        // ==========================================
        if (isInHouse) {
            groups.push({
                title: 'Financial Operations',
                items: [
                    { key: 'folio', label: 'Folio Operations', icon: FileText, badge: 'Folio', badgeColor: 'bg-blue-100 text-blue-700 font-bold' },
                    { key: 'payment', label: 'Add Payment / Post Charge', icon: CreditCard },
                    { key: 'checkout', label: 'Check Out Guest', icon: LogOut, badge: 'Depart', badgeColor: 'bg-emerald-100 text-emerald-800 font-bold', isSpecial: true },
                    { key: 'tax_exemption', label: 'Tax Operation / Exemption', icon: Percent }
                ]
            });

            groups.push({
                title: 'Room & Stay Operations',
                items: [
                    { key: 'amend', label: 'Amend Stay (Extend/Shorten)', icon: Calendar },
                    { key: 'move', label: 'Room Move & Upgrade', icon: DoorOpen, badge: 'Transfer', badgeColor: 'bg-blue-100 text-blue-700' },
                    { key: 'swap', label: 'Swap Rooms (Atomic)', icon: ArrowRightLeft, badge: 'Atomic', badgeColor: 'bg-emerald-100 text-emerald-700' },
                    { key: 'split', label: 'Room Split (Multi-Room)', icon: GitFork, badge: 'Split Stay', badgeColor: 'bg-purple-100 text-purple-700' },
                    { key: 'stop_move', label: 'Stop Room Move (Lock)', icon: Hand, badge: (booking as any)?.stopRoomMove ? 'Locked' : undefined, badgeColor: 'bg-amber-100 text-amber-800' },
                    { key: 'reg_card', label: 'Digital Reg Card (e-Reg Card)', icon: FileText, badge: 'e-Sign', badgeColor: 'bg-indigo-100 text-indigo-700' },
                    { key: 'add_booking', label: 'Add Companion Room', icon: CalendarPlus }
                ]
            });

            const groupItems: Array<any> = [];
            if (!isConnectingSuite) {
                if (booking.isGroup || booking.groupCode) {
                    groupItems.push({ key: 'ungroup', label: 'Ungroup Reservation', icon: RefreshCw });
                    if ((booking.roomsList && booking.roomsList.length > 1) || (booking.groupRoomsList && booking.groupRoomsList.length > 1)) {
                        groupItems.push({ key: 'change_owner', label: 'Change Group Owner', icon: Crown });
                    }
                } else {
                    groupItems.push({ key: 'link_group', label: 'Link to Group', icon: LinkIcon });
                }
            }
            if (groupItems.length > 0) {
                groups.push({ title: 'Group Management', items: groupItems });
            }

            groups.push({
                title: 'Exceptions',
                items: [
                    { key: 'undo_checkin', label: 'Undo Check-In', icon: Undo2, badge: 'Reverse', badgeColor: 'bg-amber-100 text-amber-800' }
                ]
            });

            return groups;
        }

        // ==========================================
        // 4. HOLD / TENTATIVE
        // ==========================================
        if (isHold) {
            groups.push({
                title: 'Financial Operations',
                items: [
                    { key: 'folio', label: 'Folio Operations', icon: FileText, badge: 'Folio', badgeColor: 'bg-blue-100 text-blue-700 font-bold' },
                    { key: 'payment', label: 'Collect Deposit / Guarantee', icon: CreditCard },
                    { key: 'tax_exemption', label: 'Tax Operation / Exemption', icon: Percent }
                ]
            });

            groups.push({
                title: 'Hold Resolution',
                items: [
                    { key: 'confirm_hold', label: 'Confirm Reservation (Release Hold)', icon: CheckCircle2, badge: 'Confirm', badgeColor: 'bg-emerald-100 text-emerald-800 font-bold', isSpecial: true }
                ]
            });

            groups.push({
                title: 'Room & Stay Operations',
                items: [
                    { key: 'amend', label: 'Amend Dates & Pax', icon: Calendar },
                    { key: 'move', label: 'Change Held Room', icon: DoorOpen },
                    { key: 'swap', label: 'Swap Rooms (Atomic)', icon: ArrowRightLeft, badge: 'Atomic', badgeColor: 'bg-emerald-100 text-emerald-700' },
                    { key: 'stop_move', label: 'Stop Room Move (Lock)', icon: Hand, badge: (booking as any)?.stopRoomMove ? 'Locked' : undefined, badgeColor: 'bg-amber-100 text-amber-800' },
                    { key: 'reg_card', label: 'Digital Reg Card (e-Reg Card)', icon: FileText, badge: 'e-Sign', badgeColor: 'bg-indigo-100 text-indigo-700' },
                    { key: 'unassign', label: 'Unassign Room', icon: DoorClosed },
                    { key: 'add_booking', label: 'Add New Booking', icon: CalendarPlus }
                ]
            });

            const groupItems: Array<any> = [];
            if (!isConnectingSuite) {
                if (booking.isGroup || booking.groupCode) {
                    groupItems.push({ key: 'ungroup', label: 'Ungroup Reservation', icon: RefreshCw });
                } else {
                    groupItems.push({ key: 'link_group', label: 'Link to Group', icon: LinkIcon });
                }
            }
            if (groupItems.length > 0) {
                groups.push({ title: 'Group Management', items: groupItems });
            }

            groups.push({
                title: 'Cancellation & Exception',
                items: [
                    { key: 'release_hold', label: 'Release / Cancel Held Room', icon: CircleSlash, isDanger: true },
                    { key: 'void', label: 'Void Record', icon: CircleSlash, isDanger: true }
                ]
            });

            return groups;
        }

        // ==========================================
        // 5. CONFIRMED / ARRIVING
        // ==========================================
        groups.push({
            title: 'Financial Operations',
            items: [
                { key: 'folio', label: 'Folio Operations', icon: FileText, badge: 'Folio', badgeColor: 'bg-blue-100 text-blue-700 font-bold' },
                { key: 'payment', label: 'Add Advance / Deposit', icon: CreditCard },
                { key: 'tax_exemption', label: 'Tax Operation / Exemption', icon: Percent }
            ]
        });

        groups.push({
            title: 'Room & Stay Operations',
            items: [
                { key: 'amend', label: 'Amend Stay (Dates/Pax)', icon: Calendar },
                { key: 'move', label: 'Assign / Change Room', icon: DoorOpen, badge: 'Transfer', badgeColor: 'bg-blue-100 text-blue-700' },
                { key: 'swap', label: 'Swap Rooms (Atomic)', icon: ArrowRightLeft, badge: 'Atomic', badgeColor: 'bg-emerald-100 text-emerald-700' },
                { key: 'split', label: 'Room Split (Multi-Room)', icon: GitFork, badge: 'Split Stay', badgeColor: 'bg-purple-100 text-purple-700' },
                { key: 'stop_move', label: 'Stop Room Move (Lock)', icon: Hand, badge: (booking as any)?.stopRoomMove ? 'Locked' : undefined, badgeColor: 'bg-amber-100 text-amber-800' },
                { key: 'reg_card', label: 'Digital Reg Card (e-Reg Card)', icon: FileText, badge: 'e-Sign', badgeColor: 'bg-indigo-100 text-indigo-700' },
                { key: 'add_booking', label: 'Add New Booking', icon: CalendarPlus },
                { key: 'unassign', label: 'Unassign Room', icon: DoorClosed }
            ]
        });

        const groupItems: Array<any> = [];
        if (!isConnectingSuite) {
            if (booking.isGroup || booking.groupCode) {
                groupItems.push({ key: 'ungroup', label: 'Ungroup Reservation', icon: RefreshCw });
                if ((booking.roomsList && booking.roomsList.length > 1) || (booking.groupRoomsList && booking.groupRoomsList.length > 1)) {
                    groupItems.push({ key: 'change_owner', label: 'Change Group Owner', icon: Crown });
                }
            } else {
                groupItems.push({ key: 'link_group', label: 'Link to Group', icon: LinkIcon });
            }
        }
        if (groupItems.length > 0) {
            groups.push({ title: 'Group Management', items: groupItems });
        }

        groups.push({
            title: 'Lifecycle & Exceptions',
            items: [
                { key: 'hold', label: 'Place Reservation on Hold', icon: CircleSlash },
                { key: 'cancel', label: 'Cancel Reservation', icon: CalendarX, isDanger: true },
                { key: 'void', label: 'Void Reservation', icon: CircleSlash, isDanger: true }
            ]
        });

        return groups;
    }, [activeStatus, booking, isConnectingSuite]);

    if (!isOpen || !booking || !activeRoom) return null;

    const activeRoomNum = String(activeRoom.roomNumber || booking.roomNumber);
    const activeRoomType = activeRoom.roomType || booking.roomType || (dynamicRoomTypes[0] || 'Standard');
    const rawActivePlan = activeRoom.ratePlan || booking.ratePlan;
    const activeRatePlan = (rawActivePlan && rawActivePlan !== 'Direct' && rawActivePlan !== 'Summer Vacation')
        ? rawActivePlan
        : (dynamicRatePlansAndPackages[0]?.value || 'Standard Rate');
    const activeSubBookingNo = activeRoom.reservationNumber || activeRoom.subBookingNumber || booking.subBookingNumber || booking.reservationNumber;
    const isCurrentActiveInHouse = activeStatus === 'IN-HOUSE' || activeStatus === 'ARRIVED' || activeStatus === 'STAYOVER';
    const isCurrentActiveConfirmed = activeStatus === 'CONFIRMED' || activeStatus === 'ARRIVING';
    const isCurrentActiveCheckedOut = activeStatus === 'CHECKED-OUT' || activeStatus === 'COMPLETED' || activeStatus === 'DEPARTED';
    const isCurrentActiveCancelled = activeStatus === 'CANCELLED' || activeStatus === 'VOID';
    const isRoomUnassignedActive = isRoomUnassigned(activeRoom?.roomNumber || booking?.roomNumber, (booking as any)?.allocatedRooms);
    const activeRegNo = activeRoom.registrationNumber || (isCurrentActiveInHouse ? (booking.registrationNumber || generateRegistrationNumber(activeSubBookingNo)) : booking.registrationNumber);
    const activeGuestName = activeRoom.guestName || booking.guestName;
    const bookingAny = booking as any;

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
    const baseCapacity = getRoomTypeCapacity(booking.roomType);
    const capacity = isConnectingSuite ? {
        maxOccupancy: Math.max(baseCapacity.maxOccupancy * 2, 6),
        maxAdults: Math.max(baseCapacity.maxAdults * 2, 4),
        maxChildren: Math.max(baseCapacity.maxChildren * 2, 2)
    } : baseCapacity;
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

    const totalAmount = isAmendingStay
        ? activeTaxCalc.grandTotal
        : (isTaxApplicable && activeTaxCalc.totalTaxAmount > 0 ? (currentBaseAmount + activeTaxCalc.totalTaxAmount) : origTotal);
    const paidAmount = Number(booking.paidAmount || 0);
    const dueAmount = isAmendingStay
        ? Math.max(0, totalAmount - paidAmount)
        : (booking.dueAmount !== undefined ? booking.dueAmount : Math.max(0, totalAmount - paidAmount));
    const serviceCharge = activeTaxCalc.serviceChargeAmount || 0;
    const vatAmount = activeTaxCalc.vatAmount || 0;
    const totalTax = activeTaxCalc.totalTaxAmount || 0;
    const baseAmount = currentBaseAmount;
    const dailyRate = Math.round(baseAmount / Math.max(1, nights));

    // Multi-Room / Group Reservation Flag & Financial Aggregates
    const isMultiRoomGroup = Boolean(booking.groupCode) || (booking.roomsList && booking.roomsList.length > 1) || resolvedGroupRooms.length > 1;

    const groupFinancials = (() => {
        if (!isMultiRoomGroup) {
            return {
                totalRooms: 1,
                totalPax: (activeRoom.adults ?? booking.adults ?? 2) + (activeRoom.children ?? booking.children ?? 0),
                totalNights: origNights,
                totalBase: baseAmount,
                totalTax: totalTax,
                serviceCharge: serviceCharge,
                vatAmount: vatAmount,
                grandTotal: totalAmount,
                paidAmount: paidAmount,
                dueAmount: dueAmount,
                rooms: [{
                    ...activeRoom,
                    effectiveRate: standardDaily,
                    effectiveNights: origNights,
                    effectiveBase: baseAmount,
                    effectivePax: (activeRoom.adults ?? booking.adults ?? 2) + (activeRoom.children ?? booking.children ?? 0),
                    displayResNo: activeSubBookingNo
                }]
            };
        }

        let totalBase = 0;
        let totalPax = 0;
        const roomRows = resolvedGroupRooms.map((rm: any, idx: number) => {
            const rRate = Number(rm.rate || rm.avgDailyRate || booking.avgDailyRate || getStandardDailyRateForRoom(rm.roomNumber, rm.roomType));
            const rNights = Number(rm.nights || booking.nights || 1);
            const rBase = rRate * rNights;
            const rPax = Number(rm.adults ?? 2) + Number(rm.children ?? 0);
            totalBase += rBase;
            totalPax += rPax;
            const rResNo = rm.reservationNumber || rm.subBookingNumber || (resolvedGroupRooms.length > 1 ? `${booking.reservationNumber}-${String(idx + 1).padStart(2, '0')}` : booking.reservationNumber);
            return {
                ...rm,
                effectiveRate: rRate,
                effectiveNights: rNights,
                effectiveBase: rBase,
                effectivePax: rPax,
                displayResNo: rResNo
            };
        });

        const taxCalc = calculateReservationTaxes(totalBase, isTaxApplicable, taxConfigId);
        const grpPaid = Number(booking.paidAmount || 0);
        const grpTotal = taxCalc.grandTotal;
        const grpDue = Math.max(0, grpTotal - grpPaid);

        return {
            totalRooms: resolvedGroupRooms.length,
            totalPax,
            totalNights: origNights,
            totalBase,
            totalTax: taxCalc.totalTaxAmount,
            serviceCharge: taxCalc.serviceChargeAmount,
            vatAmount: taxCalc.vatAmount,
            grandTotal: grpTotal,
            paidAmount: grpPaid,
            dueAmount: grpDue,
            rooms: roomRows
        };
    })();

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

    const handlePrimaryAction = async () => {
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
                if (Boolean((booking as any)?.stopRoomMove) && !supervisorOverrideMove) {
                    toast.error(`🔒 Cannot move room: Stop Room Move is active for ${booking.guestName}! Check supervisor override to proceed.`);
                    return;
                }

                const avail = getAvailableRoomsForStay(moveFromDate, moveToDate, undefined, {
                    excludeReservationId: booking.reservationNumber || booking.id
                });
                const rmStatus = avail.allRoomsStatus.find(s => String(s.room.number) === String(moveSelectedRoom));
                if (rmStatus && !rmStatus.isAvailable && String(moveSelectedRoom) !== String(booking.roomNumber)) {
                    const cr = rmStatus.conflictingReservation;
                    toast.error(
                        cr
                            ? `Cannot move to Room ${moveSelectedRoom}: Already booked by ${cr.guestName} (${cr.reservationNumber}) from ${cr.checkIn} to ${cr.checkOut}!`
                            : `Cannot move to Room ${moveSelectedRoom}: Room is ${rmStatus.reason || 'unavailable'}!`
                    );
                    return;
                }

                const targetRoomObj = allRooms.find(r => String(r.roomNumber) === String(moveSelectedRoom));
                const resolvedTargetType = targetRoomObj?.type || (moveRoomType !== 'All' ? moveRoomType : booking.roomType);

                const upgradeAdj = roomMoveAnalysis?.isUpgrade ? {
                    mode: upgradeBillingMode,
                    amount: upgradeBillingMode === 'charge' ? (roomMoveAnalysis.totalDiff || 0) : 0
                } : undefined;

                if (onSaveRoomMove) {
                    onSaveRoomMove(
                        booking.id,
                        moveSelectedRoom,
                        moveFromDate,
                        moveToDate,
                        resolvedTargetType,
                        moveRateType || booking.ratePlan,
                        upgradeAdj
                    );
                }
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
            case 'stop_move': {
                setIsSavingStopMove(true);
                try {
                    const ok = await updateStopRoomMoveInDB(booking.id, stopMoveLocked, stopMoveReason);
                    if (ok) {
                        toast.success(`Stop Room Move set to ${stopMoveLocked ? 'LOCKED' : 'UNLOCKED'}`);
                        (booking as any).stopRoomMove = stopMoveLocked;
                        (booking as any).stopRoomMoveReason = stopMoveReason;
                        if (onStopRoomMove) onStopRoomMove(booking.id, !stopMoveLocked);
                    } else {
                        toast.error('Failed to update Stop Room Move');
                    }
                } catch (e: any) {
                    toast.error(e?.message || 'Error updating Stop Room Move');
                } finally {
                    setIsSavingStopMove(false);
                }
                break;
            }
            case 'swap': {
                if (!swapTargetBookingId) {
                    toast.error('Please select an eligible target room to swap with.');
                    return;
                }
                setIsSwapping(true);
                try {
                    const res = await executeRoomSwapInDB(booking.id, swapTargetBookingId, swapReason);
                    if (res && res.success) {
                        toast.success(res.message || 'Rooms swapped successfully!');
                        onClose();
                        window.location.reload();
                    } else {
                        toast.error(res?.error || 'Failed to swap rooms');
                    }
                } catch (e: any) {
                    toast.error(e?.message || 'Error executing room swap');
                } finally {
                    setIsSwapping(false);
                }
                break;
            }
            case 'reg_card': {
                setIsRegCardModalOpen(true);
                return;
            }
            case 'add_booking':
                if (onProceedNewBooking) onProceedNewBooking(booking.id, newBookingFolio, newBookingGroupOwner, booking);
                break;
            case 'cancel':
                if (onConfirmCancel) onConfirmCancel(booking.id, cancelFee, cancelRefund, cancelReason);
                break;
            case 'void':
                if (onConfirmVoid) onConfirmVoid(booking.id, voidReason);
                break;
            case 'hold':
                if (onConfirmHold) onConfirmHold(booking.id, holdStartDate, holdEndDate, holdReason, holdUntilTime, holdTier, Math.round(Number(totalAmount) * 0.3));
                break;
            case 'confirm_hold':
                if (onConfirmHoldBooking) onConfirmHoldBooking(booking.id, confirmHoldDeposit, confirmHoldMethod, confirmHoldNotes);
                break;
            case 'release_hold':
                if (onReleaseHeldRoom) onReleaseHeldRoom(booking.id, releaseHoldReason);
                break;
            case 'reinstate':
                if (onReinstateReservation) onReinstateReservation(booking.id);
                break;
            case 'undo_checkin':
                if (onUndoCheckIn) onUndoCheckIn(booking.reservationNumber || booking.id);
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
            case 'folio':
                return { title: 'Folio Operations', buttonText: 'Close Folio', buttonIcon: <FileText size={13} />, buttonClass: 'bg-[#1a73e8] hover:bg-blue-600' };
            case 'amend':
                return { title: 'Amend Stay', buttonText: 'Save Changes', buttonIcon: <Edit3 size={13} />, buttonClass: 'bg-[#1a73e8] hover:bg-blue-600' };
            case 'move':
                return {
                    title: 'Room Move',
                    buttonText: roomMoveAnalysis?.isUpgrade ? 'Save Room Move & Upgrade' : 'Save Room Move',
                    buttonIcon: roomMoveAnalysis?.isUpgrade ? <Sparkles size={13} className="text-amber-300" /> : <Home size={13} />,
                    buttonClass: roomMoveAnalysis?.isUpgrade ? 'bg-gradient-to-r from-amber-600 via-blue-600 to-emerald-600 hover:brightness-110 font-bold shadow-md' : 'bg-[#1a73e8] hover:bg-blue-600'
                };
            case 'payment':
                return { title: 'Add Payment', buttonText: 'Save Payment', buttonIcon: <CreditCard size={13} />, buttonClass: 'bg-[#1a73e8] hover:bg-blue-600' };
            case 'split':
                return { title: 'Room Split', buttonText: 'Save Room Split', buttonIcon: <GitFork size={13} />, buttonClass: 'bg-[#1a73e8] hover:bg-blue-600' };
            case 'swap':
                return { title: 'Swap Rooms (Atomic Transfer)', buttonText: isSwapping ? 'Swapping Rooms...' : 'Execute Atomic Swap', buttonIcon: <ArrowRightLeft size={13} />, buttonClass: 'bg-emerald-600 hover:bg-emerald-700 font-bold' };
            case 'stop_move':
                return { title: 'Stop Room Move & Lock Status', buttonText: isSavingStopMove ? 'Saving...' : 'Save Lock Status', buttonIcon: <Hand size={13} />, buttonClass: 'bg-amber-600 hover:bg-amber-700 font-bold' };
            case 'reg_card':
                return { title: 'Digital Registration Card', buttonText: 'Open e-Reg Card', buttonIcon: <FileText size={13} />, buttonClass: 'bg-indigo-600 hover:bg-indigo-700 font-bold' };
            case 'add_booking':
                return { title: 'Add New Booking', buttonText: 'Proceed to Full Form', buttonIcon: <CalendarPlus size={13} />, buttonClass: 'bg-[#1a73e8] hover:bg-blue-600' };
            case 'cancel':
                return { title: 'Cancel Reservation', buttonText: 'Confirm Cancellation', buttonIcon: <CalendarX size={13} />, buttonClass: 'bg-[#1a73e8] hover:bg-blue-600' };
            case 'void':
                return { title: 'Void Reservation', buttonText: 'Confirm Void', buttonIcon: <CircleSlash size={13} />, buttonClass: 'bg-[#c62828] hover:bg-red-700' };
            case 'hold':
                return { title: 'Reservation Hold', buttonText: 'Confirm Hold', buttonIcon: <CircleSlash size={13} />, buttonClass: 'bg-[#1a73e8] hover:bg-blue-600' };
            case 'confirm_hold':
                return { title: 'Confirm Hold', buttonText: 'Confirm Reservation', buttonIcon: <CheckCircle2 size={13} />, buttonClass: 'bg-emerald-600 hover:bg-emerald-700 font-bold' };
            case 'release_hold':
                return { title: 'Release Held Room', buttonText: 'Release Room Block', buttonIcon: <CircleSlash size={13} />, buttonClass: 'bg-rose-600 hover:bg-rose-700 font-bold' };
            case 'reinstate':
                return { title: 'Reinstate Reservation', buttonText: 'Restore to Confirmed', buttonIcon: <RotateCcw size={13} />, buttonClass: 'bg-emerald-600 hover:bg-emerald-700 font-bold' };
            case 'undo_checkin':
                return { title: 'Undo Check-In', buttonText: 'Reverse Check-In', buttonIcon: <Undo2 size={13} />, buttonClass: 'bg-amber-600 hover:bg-amber-700 font-bold' };
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

    const handleIssueKeycard = async () => {
        try {
            setIsIssuingKeycard(true);
            const targetRoom = activeRoomNumber || booking.roomNumber;
            const res = await fetch(`${getApiBaseUrl()}/api/keycard/issue`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    propertyId: getActivePropertyId(),
                    roomNumber: targetRoom,
                    guestName: activeGuestName || booking.guestName || 'Guest',
                    validUntil: booking.departureDate || (booking as any).checkOut
                })
            });
            const data = await res.json();
            if (data.success) {
                toast.success(`RFID Keycard encoded for Room ${targetRoom}! Card UID: ${data.cardUid}`);
            } else {
                toast.error(data.error || 'Failed to issue keycard');
            }
        } catch (e: any) {
            toast.error(`Keycard Error: ${e.message}`);
        } finally {
            setIsIssuingKeycard(false);
        }
    };

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
                    mode === 'folio'
                        ? 'w-full md:w-[90%] lg:w-[88%] min-w-[1000px] max-w-[1400px]'
                        : 'w-full md:w-[70%] lg:w-[68%] min-w-[860px] max-w-[1150px]'
                } bg-[#0e3592] text-white shadow-2xl flex flex-col border-l border-blue-900 animate-in slide-in-from-right duration-200 z-[100000]`}
            >
                {/* 1. White Top Header Bar with Edit & Dynamic Action Dropdown */}
                <div className="px-2.5 py-1.5 bg-white border-b border-gray-200 flex items-center justify-between flex-shrink-0">
                    {/* Left: Close X, Back to Overview (if in folio mode), User Icon, Guest Name, Status */}
                    <div className="flex items-center gap-1.5 min-w-0">
                        <button
                            type="button"
                            onClick={onClose}
                            className="p-1 hover:bg-gray-100 rounded text-gray-500 hover:text-gray-900 transition-colors cursor-pointer flex-shrink-0"
                            title="Close"
                        >
                            <X size={12} />
                        </button>
                        {mode === 'folio' && (
                            <button
                                type="button"
                                onClick={() => setMode('overview')}
                                className="h-6 px-2 rounded-md bg-white hover:bg-gray-100 border border-gray-300 text-blue-700 font-semibold text-xs flex items-center gap-1 shadow-2xs transition-colors cursor-pointer flex-shrink-0 mr-0.5"
                                title="Back to Reservation Overview"
                            >
                                <ArrowLeft size={13} />
                                <span>Drawer Overview</span>
                            </button>
                        )}
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
                        {isConnectingSuite && (
                            <span className="text-[8px] px-1.5 py-0.5 rounded font-bold shadow-2xs ml-1 bg-indigo-50 text-indigo-800 border border-indigo-300 flex items-center gap-1" title="Interconnecting Suite Booking">
                                Interconnecting Suite
                            </span>
                        )}
                    </div>

                    {/* Right: Top Action Buttons (Folio + Edit + Dynamic Action Dropdown) */}
                    <div className="flex items-center gap-1.5 flex-shrink-0">
                        <button
                            type="button"
                            onClick={() => {
                                setMode(mode === 'folio' ? 'overview' : 'folio');
                            }}
                            className={`h-5 px-2 rounded text-[8px] flex items-center gap-1 shadow-2xs transition-colors cursor-pointer ${
                                mode === 'folio'
                                    ? 'bg-blue-600 text-white font-bold border border-blue-600'
                                    : 'bg-white hover:bg-gray-50 text-[#0e3592] border border-blue-300/80 font-semibold'
                            }`}
                            title="Folio Operations Suite"
                        >
                            <FileText size={10} className={mode === 'folio' ? 'text-white' : 'text-[#0e3592]'} />
                            <span>Folio</span>
                        </button>

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
                                ) : (mode === 'overview' || mode === 'folio') ? (
                                    <>
                                        <Settings size={11} className="text-[#0e3592]" />
                                        <span>Actions</span>
                                        <ChevronDown size={11} className={`transition-transform duration-200 ${isOptionsOpen ? 'rotate-180' : ''}`} />
                                    </>
                                ) : (
                                    <>
                                        <span className="text-blue-700 font-extrabold">{modeMeta.title}</span>
                                        <ChevronDown size={11} className={`transition-transform duration-200 ${isOptionsOpen ? 'rotate-180' : ''}`} />
                                    </>
                                )}
                            </button>

                            {/* Dropdown Menu (Status-Driven & Categorized) */}
                            {isOptionsOpen && (
                                <>
                                    <div
                                        className="fixed inset-0 z-[100001]"
                                        onClick={() => setIsOptionsOpen(false)}
                                    />
                                    <div className="absolute right-0 top-full mt-1.5 w-60 bg-white rounded-lg shadow-2xl border border-gray-200 py-1 z-[100002] text-gray-800 animate-in fade-in zoom-in-95 duration-100 max-h-[400px] overflow-y-auto divide-y divide-gray-100">
                                        {groupedOptions.map((grp) => (
                                            <div key={grp.title} className="py-1">
                                                <div className="px-3 py-1 text-[7.5px] font-bold uppercase tracking-wider text-gray-400 bg-gray-50/70 select-none">
                                                    {grp.title}
                                                </div>
                                                <div className="space-y-0.5 mt-0.5">
                                                    {grp.items.map(opt => {
                                                        const IconComponent = opt.icon;
                                                        const isActive = mode === opt.key;
                                                        return (
                                                            <button
                                                                key={opt.key}
                                                                type="button"
                                                                onClick={() => {
                                                                    setIsOptionsOpen(false);
                                                                    if (opt.key === 'checkout') {
                                                                        if (onCheckOut && activeSubBookingNo) {
                                                                            onCheckOut(activeSubBookingNo);
                                                                        }
                                                                        return;
                                                                    }
                                                                    if (opt.key === 'checkin') {
                                                                        if (onCheckIn && activeSubBookingNo) {
                                                                            onCheckIn(activeSubBookingNo);
                                                                        }
                                                                        return;
                                                                    }
                                                                    if (opt.key === 'tax_exemption') {
                                                                        setMode('folio');
                                                                        setIsTaxExemptionModalOpen(true);
                                                                        return;
                                                                    }
                                                                    setMode(opt.key);
                                                                }}
                                                                className={`w-full px-3 py-1.5 text-left text-[9px] font-medium flex items-center justify-between cursor-pointer transition-colors ${
                                                                    isActive
                                                                        ? 'bg-blue-600 text-white font-bold'
                                                                        : opt.isDanger
                                                                        ? 'text-red-600 hover:bg-red-50 font-semibold'
                                                                        : opt.isSpecial
                                                                        ? 'text-emerald-700 hover:bg-emerald-50 font-semibold'
                                                                        : 'text-gray-700 hover:bg-gray-100'
                                                                }`}
                                                            >
                                                                <div className="flex items-center gap-2 truncate">
                                                                    <IconComponent
                                                                        size={13}
                                                                        className={`shrink-0 ${
                                                                            isActive
                                                                                ? 'text-white'
                                                                                : opt.isDanger
                                                                                ? 'text-red-500'
                                                                                : opt.isSpecial
                                                                                ? 'text-emerald-600'
                                                                                : 'text-gray-500'
                                                                        }`}
                                                                    />
                                                                    <span className="truncate">{opt.label}</span>
                                                                </div>
                                                                {opt.badge && (
                                                                    <span className={`text-[7px] px-1.5 py-0.2 rounded font-bold shrink-0 ml-1.5 ${
                                                                        isActive
                                                                            ? 'bg-white/20 text-white'
                                                                            : opt.badgeColor || 'bg-gray-100 text-gray-600'
                                                                    }`}>
                                                                        {opt.badge}
                                                                    </span>
                                                                )}
                                                            </button>
                                                        );
                                                    })}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </>
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

                {/* 2. Drawer Body (Folio Operations Mode OR Standard 2-Column Overview & Action Form) */}
                {mode === 'folio' ? (
                    <div className="flex-1 min-h-0 bg-slate-50 overflow-hidden flex flex-col">
                        <DrawerFolioOperations
                            booking={booking}
                            resolvedGroupRooms={resolvedGroupRooms}
                            onOpenAddPayment={() => setMode('payment')}
                            onOpenAmendStay={() => {
                                setMode('amend');
                                if (onEdit) onEdit(booking);
                            }}
                            onOpenRoomMove={() => setMode('move')}
                            onOpenRoomSplit={() => setMode('split')}
                            onOpenCheckOut={() => onCheckOut && activeSubBookingNo && onCheckOut(activeSubBookingNo)}
                            isTaxExemptionOpen={isTaxExemptionModalOpen}
                            onToggleTaxExemption={setIsTaxExemptionModalOpen}
                        />
                    </div>
                ) : (
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
                                    <div className="text-[8px] text-blue-200/70 font-mono flex items-center gap-0.5"><Clock size={9} className="opacity-70" /><span>16:00:00</span></div>
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
                                    <div className="text-[8px] text-blue-200/70 font-mono flex items-center gap-0.5"><Clock size={9} className="opacity-70" /><span>12:00:00</span></div>
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
                                    <div className="text-[8px] uppercase text-blue-200/80 tracking-wider flex items-center gap-1">
                                        <span>Room Details</span>
                                        {isConnectingSuite && (
                                            <span className="text-[7px] px-1 py-0.2 rounded bg-indigo-500/50 text-white font-bold border border-indigo-400/40">
                                                Connected
                                            </span>
                                        )}
                                    </div>
                                    <div className="text-[8px] font-bold text-white truncate">
                                        {isConnectingSuite
                                            ? `${resolvedGroupRooms.map((r: any) => r.roomNumber).join(' + ') || activeRoomNum} (${activeRoomType})`
                                            : `${activeRoomNum} (${activeRoomType})`}
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
                                            {currencySymbol} {dailyRate.toFixed(2)}
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
                                    <span className="font-mono  text-white">{currencySymbol} {baseAmount.toFixed(2)}</span>
                                </div>

                                {/* Statutory Tax & VAT Breakdown */}
                                {isTaxApplicable && totalTax > 0 ? (
                                    <div className="bg-black/25 rounded-lg p-2 space-y-1 border border-white/10 text-[10.5px]">
                                        <div className="flex items-center justify-between  text-blue-200 pb-0.5 border-b border-white/10 text-[8px]">
                                            <span className="flex items-center gap-1">
                                                <ShieldCheck size={11} className="text-emerald-400" />
                                                <span>Taxes ({taxConfigCode})</span>
                                            </span>
                                            <span className="font-mono text-emerald-300 ">+{currencySymbol} {totalTax.toFixed(2)}</span>
                                        </div>
                                        {serviceCharge > 0 && (
                                            <div className="flex justify-between text-blue-200/80 text-[8px]">
                                                <span>Service Charge:</span>
                                                <span className="font-mono text-white">+{currencySymbol} {serviceCharge.toFixed(2)}</span>
                                            </div>
                                        )}
                                        {vatAmount > 0 && (
                                            <div className="flex justify-between text-blue-200/80 text-[8px]">
                                                <span>VAT:</span>
                                                <span className="font-mono text-white">+{currencySymbol} {vatAmount.toFixed(2)}</span>
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
                                    <span className="font-mono font-black text-white">{currencySymbol} {totalAmount.toFixed(2)}</span>
                                </div>

                                <div className="flex items-center justify-between text-blue-100 text-[8px]">
                                    <div className="flex items-center gap-1.5">
                                        <div className="w-4.5 h-4.5 rounded bg-emerald-500/25 flex items-center justify-center text-emerald-300">
                                            <CreditCard size={10} />
                                        </div>
                                        <span>Advance Paid</span>
                                    </div>
                                    <span className="font-mono  text-emerald-300">{currencySymbol} {paidAmount.toFixed(2)}</span>
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
                                    {currencySymbol} {dueAmount.toFixed(2)}
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
                                            <h2 className="text-[11px] font-bold text-white tracking-wide truncate flex items-center gap-1.5">
                                                {isConnectingSuite ? (
                                                    <>
                                                        <span className="px-1.5 py-0.5 rounded bg-indigo-500/40 border border-indigo-400/40 text-indigo-100 text-[9px] font-extrabold flex items-center gap-1">
                                                            Interconnecting Suite
                                                        </span>
                                                        <span>(1 Booking | Rooms {resolvedGroupRooms[0]?.roomNumber || activeRoomNum})</span>
                                                    </>
                                                ) : (
                                                    `${activeRatePlan} (${resolvedGroupRooms.length})`
                                                )}
                                            </h2>
                                            {isConnectingSuite ? (
                                                <div className="text-[8.5px] font-medium text-emerald-300 mt-0.5 flex items-center gap-1">
                                                    <span>Adjoining door connected ({resolvedGroupRooms[0]?.roomNumber || (booking.allocatedRooms && booking.allocatedRooms.length > 1 ? booking.allocatedRooms.join(' & ') : (booking.roomNumber ? `Rooms ${booking.roomNumber}` : 'Adjoining Rooms'))})</span>
                                                </div>
                                            ) : booking.groupCode ? (
                                                <div className="text-[8.5px] font-mono text-blue-200/90 mt-0.5">
                                                    Group Code: <span className="font-bold text-white">{booking.groupCode}</span>
                                                </div>
                                            ) : null}
                                        </div>
                                        {!isConnectingSuite && (
                                            <div className="flex items-center gap-1.5 flex-shrink-0">
                                                <button
                                                    type="button"
                                                    onClick={() => setMode('link_group')}
                                                    className="h-6 px-2.5 bg-blue-500/25 hover:bg-blue-500/40 text-blue-100 border border-blue-400/30 rounded text-[9px] font-bold flex items-center gap-1 transition-colors cursor-pointer shadow-2xs"
                                                    title="Link an existing reservation into this group without modifying its confirmation number"
                                                >
                                                    <LinkIcon size={10} />
                                                    <span>Link Group</span>
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => setMode('add_booking')}
                                                    className="h-6 px-2.5 bg-white/10 hover:bg-white/20 text-white border border-white/20 rounded text-[9px] font-bold flex items-center gap-1 transition-colors cursor-pointer shadow-2xs"
                                                    title="Add a new room booking"
                                                >
                                                    <Plus size={10} />
                                                    <span>Add Room</span>
                                                </button>
                                            </div>
                                        )}
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
                                            const hasExplicitPrimary = resolvedGroupRooms.some((r: any) => Boolean(r.isPrimary));
                                            const isPrimaryOwner = hasExplicitPrimary ? Boolean(rm.isPrimary) : idx === 0;

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
                                                            {isPrimaryOwner && (
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
                                                        {rm.isConnecting ? (
                                                            <span className="px-2 py-0.5 rounded-md bg-indigo-500/30 text-indigo-100 border border-indigo-400/40 font-bold flex items-center gap-1">
                                                                Rooms {rm.roomNumber}
                                                            </span>
                                                        ) : (
                                                            <span className="px-2 py-0.5 rounded-md bg-blue-500/25 text-blue-100 border border-blue-400/30 font-medium">
                                                                Room {rm.roomNumber || 'Unassigned'}
                                                            </span>
                                                        )}
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
                                    <div className="flex-shrink-0 px-3.5 py-2.5 bg-[#0c2e7a]/80 border-t border-blue-400/20 flex items-center justify-between gap-1.5 relative">
                                        {/* Status-Aware Dynamic Print Action Button */}
                                        <div className="relative">
                                            <div className="inline-flex rounded-md shadow-xs">
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        if (isCurrentActiveInHouse || isCurrentActiveCheckedOut) {
                                                            setActivePrintDoc('folio');
                                                        } else if (isCurrentActiveCancelled) {
                                                            setActivePrintDoc('cancellation');
                                                        } else {
                                                            setActivePrintDoc('reg_card');
                                                        }
                                                    }}
                                                    className="h-8 px-3 bg-white/10 hover:bg-white/20 text-white rounded-l-md text-[9.5px] font-semibold flex items-center gap-1.5 transition-colors cursor-pointer border-r border-white/10"
                                                    title={
                                                        isCurrentActiveInHouse
                                                            ? 'Print Running Folio & Bill'
                                                            : isCurrentActiveCheckedOut
                                                            ? 'Print Tax Invoice & Final Folio'
                                                            : isCurrentActiveCancelled
                                                            ? 'Print Cancellation Receipt'
                                                            : 'Print Guest Registration Card (GRC) for Check-in signature'
                                                    }
                                                >
                                                    <Printer size={12} />
                                                    <span>
                                                        {isCurrentActiveInHouse
                                                            ? 'Print Folio'
                                                            : isCurrentActiveCheckedOut
                                                            ? 'Print Tax Invoice'
                                                            : isCurrentActiveCancelled
                                                            ? 'Print Cancellation'
                                                            : 'Print Reg Card'}
                                                    </span>
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => setIsPrintMenuOpen(prev => !prev)}
                                                    className="h-8 px-1.5 bg-white/10 hover:bg-white/20 text-white rounded-r-md text-[9.5px] flex items-center justify-center transition-colors cursor-pointer"
                                                    title="More print document options"
                                                >
                                                    <ChevronDown size={11} className={`transition-transform duration-150 ${isPrintMenuOpen ? 'rotate-180' : ''}`} />
                                                </button>
                                            </div>

                                            {/* Status-Driven Dropdown Menu */}
                                            {isPrintMenuOpen && (
                                                <div className="absolute left-0 bottom-full mb-1.5 w-72 bg-[#0a235c] border border-blue-400/30 rounded-xl shadow-2xl py-1.5 z-50 animate-in fade-in zoom-in-95 duration-100 text-[10px]">
                                                    {/* Room Level Section */}
                                                    <div className="px-3 py-1 text-[8.5px] uppercase tracking-wider font-bold text-blue-200/80 border-b border-blue-400/20 flex items-center justify-between">
                                                        <span>Room {activeRoomNum} Documents</span>
                                                        <span className="px-1.5 py-0.2 rounded bg-blue-500/20 text-blue-200 font-mono text-[8px]">{activeStatus}</span>
                                                    </div>
                                                    <button
                                                        type="button"
                                                        onClick={() => {
                                                            setActivePrintDoc('reg_card');
                                                            setIsPrintMenuOpen(false);
                                                        }}
                                                        className="w-full px-3 py-1.5 text-left text-white hover:bg-blue-600/50 flex items-center gap-2 cursor-pointer transition-colors border-b border-blue-500/10"
                                                    >
                                                        <FileText size={13} className="text-emerald-300 shrink-0" />
                                                        <div>
                                                            <div className="font-semibold text-white">Registration Card (GRC)</div>
                                                            <div className="text-[8.5px] text-blue-200/70 leading-tight">Arrival registration form for Room {activeRoomNum}</div>
                                                        </div>
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() => {
                                                            setActivePrintDoc('voucher');
                                                            setIsPrintMenuOpen(false);
                                                        }}
                                                        className="w-full px-3 py-1.5 text-left text-white hover:bg-blue-600/50 flex items-center gap-2 cursor-pointer transition-colors border-b border-blue-500/10"
                                                    >
                                                        <FileText size={13} className="text-amber-300 shrink-0" />
                                                        <div>
                                                            <div className="font-semibold text-white">Confirmation Voucher</div>
                                                            <div className="text-[8.5px] text-blue-200/70 leading-tight">Official booking confirmation & tariff slip</div>
                                                        </div>
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() => {
                                                            setActivePrintDoc('folio');
                                                            setIsPrintMenuOpen(false);
                                                        }}
                                                        className={`w-full px-3 py-1.5 text-left text-white hover:bg-blue-600/50 flex items-center gap-2 cursor-pointer transition-colors ${isMultiRoomGroup ? 'border-b border-blue-500/10' : ''}`}
                                                    >
                                                        <Printer size={13} className="text-blue-300 shrink-0" />
                                                        <div>
                                                            <div className="font-semibold text-white">
                                                                {isCurrentActiveCheckedOut ? 'Tax Invoice / Settled Bill' : 'Guest Folio Statement'}
                                                            </div>
                                                            <div className="text-[8.5px] text-blue-200/70 leading-tight">Room tariff, postings & payment ledger</div>
                                                        </div>
                                                    </button>

                                                    {/* Group Level Documents Section */}
                                                    {isMultiRoomGroup && (
                                                        <>
                                                            <div className="mt-1 px-3 py-1 text-[8.5px] uppercase tracking-wider font-bold text-amber-300 bg-amber-500/15 border-y border-amber-400/20 flex items-center justify-between">
                                                                <span>Group Documents ({resolvedGroupRooms.length} Rooms)</span>
                                                                <span className="font-mono text-[8px] text-amber-200">{booking.groupCode || 'GROUP'}</span>
                                                            </div>
                                                            <button
                                                                type="button"
                                                                onClick={() => {
                                                                    setActivePrintDoc('group_invoice');
                                                                    setIsPrintMenuOpen(false);
                                                                }}
                                                                className="w-full px-3 py-1.5 text-left text-white hover:bg-indigo-600/40 flex items-center gap-2 cursor-pointer transition-colors border-b border-blue-500/10"
                                                            >
                                                                <Layers size={13} className="text-indigo-300 shrink-0" />
                                                                <div>
                                                                    <div className="font-semibold text-white">Group Master Invoice</div>
                                                                    <div className="text-[8.5px] text-blue-200/70 leading-tight">Consolidated tax bill for all {resolvedGroupRooms.length} rooms</div>
                                                                </div>
                                                            </button>
                                                            <button
                                                                type="button"
                                                                onClick={() => {
                                                                    setActivePrintDoc('group_voucher');
                                                                    setIsPrintMenuOpen(false);
                                                                }}
                                                                className="w-full px-3 py-1.5 text-left text-white hover:bg-indigo-600/40 flex items-center gap-2 cursor-pointer transition-colors border-b border-blue-500/10"
                                                            >
                                                                <FileText size={13} className="text-sky-300 shrink-0" />
                                                                <div>
                                                                    <div className="font-semibold text-white">Group Confirmation Voucher</div>
                                                                    <div className="text-[8.5px] text-blue-200/70 leading-tight">Rooming summary & corporate booking slip</div>
                                                                </div>
                                                            </button>
                                                            <button
                                                                type="button"
                                                                onClick={() => {
                                                                    setActivePrintDoc('group_prereg');
                                                                    setIsPrintMenuOpen(false);
                                                                }}
                                                                className="w-full px-3 py-1.5 text-left text-white hover:bg-indigo-600/40 flex items-center gap-2 cursor-pointer transition-colors border-b border-blue-500/10"
                                                            >
                                                                <Users size={13} className="text-emerald-300 shrink-0" />
                                                                <div>
                                                                    <div className="font-semibold text-white">Group Pre-Reg & Rooming List</div>
                                                                    <div className="text-[8.5px] text-blue-200/70 leading-tight">Tabular arrival sign-off sheet for rapid check-in</div>
                                                                </div>
                                                            </button>
                                                            <button
                                                                type="button"
                                                                onClick={() => {
                                                                    setActivePrintDoc('batch_grc');
                                                                    setIsPrintMenuOpen(false);
                                                                }}
                                                                className="w-full px-3 py-1.5 text-left text-white hover:bg-purple-600/40 flex items-center gap-2 cursor-pointer transition-colors"
                                                            >
                                                                <Printer size={13} className="text-purple-300 shrink-0" />
                                                                <div>
                                                                    <div className="font-semibold text-white">Batch Print All GRCs</div>
                                                                    <div className="text-[8.5px] text-blue-200/70 leading-tight">1-click print individual GRC for each room</div>
                                                                </div>
                                                            </button>
                                                        </>
                                                    )}
                                                </div>
                                            )}
                                        </div>

                                        <div className="flex items-center gap-1.5">
                                            {(() => {
                                                const arrivalDateVal = activeRoom.checkInDate || booking.arrivalDate || (booking as any)?.checkIn;
                                                const isArrivalToday = arrivalDateVal === (systemDate || getOperatingSystemDate());
                                                return isCurrentActiveConfirmed && !booking?.isPast && onCheckIn && isArrivalToday ? (
                                                    <button
                                                        type="button"
                                                        disabled={isRoomUnassignedActive}
                                                        onClick={() => {
                                                            if (isRoomUnassignedActive) {
                                                                toast.error('Cannot check in: Room is unassigned. Please assign a room first.');
                                                                return;
                                                            }
                                                            onCheckIn(activeSubBookingNo || booking.reservationNumber);
                                                        }}
                                                        className={`h-8 px-3.5 rounded-md text-[9.5px] font-semibold flex items-center gap-1 transition-colors shadow-xs ${
                                                            isRoomUnassignedActive
                                                                ? 'bg-slate-300 text-slate-500 cursor-not-allowed opacity-60'
                                                                : 'bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer'
                                                        }`}
                                                        title={isRoomUnassignedActive ? 'Cannot check in: Room is unassigned. Assign a room first.' : 'Check In active room'}
                                                    >
                                                        <DoorOpen size={11} />
                                                        <span>Check In</span>
                                                        {isRoomUnassignedActive && <span className="text-[8px] px-1 py-0.2 rounded bg-amber-100 text-amber-800">Unassigned</span>}
                                                    </button>
                                                ) : null;
                                            })()}
                                            {isCurrentActiveInHouse && !booking?.isPast && onCheckOut && (
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        if (dueAmount > 0) {
                                                            toast.error(`Cannot Check Out: Guest has an outstanding balance of ${currencySymbol}${dueAmount.toLocaleString()}. Please settle payment before checkout.`);
                                                            setMode('payment');
                                                            return;
                                                        }
                                                        onCheckOut(activeSubBookingNo || booking.reservationNumber);
                                                    }}
                                                    className="h-8 px-3.5 bg-amber-600 hover:bg-amber-700 text-white rounded-md text-[9.5px] font-semibold flex items-center gap-1 cursor-pointer transition-colors shadow-xs"
                                                    title="Check Out active room"
                                                >
                                                    <DoorClosed size={11} />
                                                    <span>Check Out</span>
                                                </button>
                                            )}
                                            {isCurrentActiveInHouse && (
                                                <button
                                                    type="button"
                                                    disabled={isIssuingKeycard}
                                                    onClick={handleIssueKeycard}
                                                    className="h-8 px-3 bg-teal-600 hover:bg-teal-700 text-white rounded-md text-[9.5px] font-semibold flex items-center gap-1 cursor-pointer transition-colors shadow-xs"
                                                    title="Encode RFID Keycard"
                                                >
                                                    <Key size={11} />
                                                    <span>{isIssuingKeycard ? 'Encoding...' : 'Keycard'}</span>
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

                                {/* MODE 2: ROOM MOVE (Enhanced with Dynamic Inventory & Upgrade Detection Engine) */}
                                {mode === 'move' && (
                                    <div className="space-y-3">
                                        {/* Stop Room Move Warning Guard */}
                                        {Boolean((booking as any)?.stopRoomMove) && (
                                            <div className="bg-amber-500/20 border-2 border-amber-400 rounded-xl p-3 text-amber-200 text-xs space-y-2 shadow-md">
                                                <div className="flex items-start gap-2 font-bold text-amber-100">
                                                    <Lock size={16} className="text-amber-400 shrink-0 mt-0.5" />
                                                    <div>
                                                        <div>STOP ROOM MOVE IS ACTIVE FOR THIS RESERVATION</div>
                                                        <div className="text-[10px] font-normal text-amber-200/90 mt-0.5">
                                                            Reason: {(booking as any)?.stopRoomMoveReason || 'Locked by Front Desk Supervisor'}
                                                        </div>
                                                    </div>
                                                </div>
                                                <label className="flex items-center gap-2 pt-1 border-t border-amber-400/30 cursor-pointer select-none text-[11px] font-semibold text-white">
                                                    <input
                                                        type="checkbox"
                                                        checked={supervisorOverrideMove}
                                                        onChange={e => setSupervisorOverrideMove(e.target.checked)}
                                                        className="w-4 h-4 rounded text-amber-600 bg-white cursor-pointer accent-amber-500"
                                                    />
                                                    <span>Supervisor Override: I confirm authorization to bypass the Room Move Lock.</span>
                                                </label>
                                            </div>
                                        )}

                                        {isBookingInHouse && (
                                            <div className="bg-emerald-500/15 border border-emerald-400/30 rounded-lg p-2 text-emerald-200 text-[10px] flex items-center gap-1.5 font-medium shadow-xs">
                                                <ShieldCheck size={13} className="text-emerald-400 shrink-0" />
                                                <span>In-House Guest: Room Move applies from current System Date ({operatingSystemDate}) for the remaining stay.</span>
                                            </div>
                                        )}

                                        {/* Current Room & Guest Information Card */}
                                        <div className="bg-slate-900/50 border border-blue-400/25 rounded-lg p-2.5 flex items-center justify-between text-[10px]">
                                            <div className="flex items-center gap-2">
                                                <div className="w-8 h-8 rounded-lg bg-blue-500/20 border border-blue-400/30 text-blue-300 flex items-center justify-center font-bold text-xs">
                                                    {booking.roomNumber}
                                                </div>
                                                <div>
                                                    <div className="text-white font-semibold flex items-center gap-1.5">
                                                        <span>{booking.guestName}</span>
                                                        <span className="text-[8.5px] bg-blue-500/30 text-blue-200 px-1.5 py-0.5 rounded font-mono">
                                                            {booking.reservationNumber}
                                                        </span>
                                                    </div>
                                                    <div className="text-slate-300 text-[9px] mt-0.5">
                                                        Current: Room <strong className="text-white">{booking.roomNumber}</strong> ({roomMoveAnalysis?.currentRoomType || booking.roomType}) | Rate: <span className="font-mono text-emerald-300">{currencySymbol} {(roomMoveAnalysis?.currentDailyRate || standardDaily).toFixed(2)}/nt</span>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Date Range Selection */}
                                        <div className="grid grid-cols-2 gap-2">
                                            <div className="flex flex-col gap-1">
                                                <div className="flex items-center justify-between">
                                                    <label className="text-[9px] font-semibold text-blue-100">From Date</label>
                                                    {isBookingInHouse && (
                                                        <span className="text-[7.5px] text-emerald-300 bg-emerald-500/20 px-1 rounded">Locked (In-House)</span>
                                                    )}
                                                </div>
                                                <input
                                                    type="date"
                                                    value={moveFromDate}
                                                    disabled={isBookingInHouse}
                                                    min={isBookingInHouse ? operatingSystemDate : undefined}
                                                    onChange={e => setMoveFromDate(e.target.value)}
                                                    className={`w-full h-8 px-2 border border-blue-300 rounded text-[9.5px] outline-none focus:ring-2 focus:ring-blue-400 ${
                                                        isBookingInHouse
                                                            ? 'bg-blue-900/60 text-blue-200 cursor-not-allowed opacity-90 border-blue-400/30'
                                                            : 'bg-white text-gray-900 cursor-pointer'
                                                    }`}
                                                />
                                            </div>
                                            <div className="flex flex-col gap-1">
                                                <label className="text-[9px] font-semibold text-blue-100">To Date</label>
                                                <input
                                                    type="date"
                                                    value={moveToDate}
                                                    min={moveFromDate}
                                                    onChange={e => setToDate(e.target.value)}
                                                    className="w-full h-8 px-2 border border-blue-300 rounded text-[9.5px] bg-white text-gray-900 outline-none focus:ring-2 focus:ring-blue-400 cursor-pointer"
                                                />
                                            </div>
                                        </div>

                                        {/* Room Type Filter & Rate Plan / Package */}
                                        <div className="grid grid-cols-2 gap-2">
                                            <div className="flex flex-col gap-1">
                                                <label className="text-[9px] font-semibold text-blue-100">Filter by Room Type</label>
                                                <div className="relative">
                                                    <select
                                                        value={moveRoomType}
                                                        onChange={e => {
                                                            const selectedType = e.target.value;
                                                            setMoveRoomType(selectedType);
                                                            if (selectedType !== 'All') {
                                                                const moveAvail = getAvailableRoomsForStay(moveFromDate, moveToDate, undefined, {
                                                                    excludeReservationId: booking.reservationNumber || booking.id
                                                                });
                                                                const firstAvail = allRooms.find(r => 
                                                                    r.type === selectedType && 
                                                                    (moveAvail.allRoomsStatus.find(s => String(s.room.number) === String(r.roomNumber))?.isAvailable || String(r.roomNumber) === String(booking.roomNumber))
                                                                );
                                                                if (firstAvail) {
                                                                    setMoveSelectedRoom(firstAvail.roomNumber);
                                                                }
                                                            }
                                                        }}
                                                        className="w-full h-8 px-2 border border-blue-300 rounded text-[9.5px] bg-white text-gray-900 outline-none focus:ring-2 focus:ring-blue-400 cursor-pointer appearance-none pr-6 font-medium"
                                                    >
                                                        <option value="All">All Room Types</option>
                                                        {dynamicRoomTypes.map(t => (
                                                            <option key={t} value={t}>{t}</option>
                                                        ))}
                                                    </select>
                                                    <ChevronDown size={12} className="absolute right-2 top-2.5 text-gray-600 pointer-events-none" />
                                                </div>
                                            </div>
                                            <div className="flex flex-col gap-1">
                                                <label className="text-[9px] font-semibold text-blue-100">Rate Plan / Package</label>
                                                <div className="relative">
                                                    <select
                                                        value={moveRateType}
                                                        onChange={e => setMoveRateType(e.target.value)}
                                                        className="w-full h-8 px-2 border border-blue-300 rounded text-[9.5px] bg-white text-gray-900 outline-none focus:ring-2 focus:ring-blue-400 cursor-pointer appearance-none pr-6 font-medium"
                                                    >
                                                        {dynamicRatePlansAndPackages.map(p => (
                                                            <option key={p.value} value={p.value}>{p.label}</option>
                                                        ))}
                                                    </select>
                                                    <ChevronDown size={12} className="absolute right-2 top-2.5 text-gray-600 pointer-events-none" />
                                                </div>
                                            </div>
                                        </div>

                                        {/* Target Room Dropdown */}
                                        <div className="flex flex-col gap-1">
                                            <div className="flex items-center justify-between">
                                                <label className="text-[9px] font-semibold text-blue-100">Assign Target Room</label>
                                                {roomMoveAnalysis?.targetRoomType && (
                                                    <span className="text-[8px] bg-emerald-400/20 text-emerald-300 px-1.5 py-0.5 rounded font-medium">
                                                        Category: {roomMoveAnalysis.targetRoomType}
                                                    </span>
                                                )}
                                            </div>
                                            <div className="relative">
                                                <select
                                                    value={moveSelectedRoom}
                                                    onChange={e => {
                                                        const roomNo = e.target.value;
                                                        setMoveSelectedRoom(roomNo);
                                                        const rObj = allRooms.find(r => String(r.roomNumber) === String(roomNo));
                                                        if (rObj?.type) {
                                                            setMoveRoomType(rObj.type);
                                                        }
                                                    }}
                                                    className="w-full h-8.5 px-2.5 border border-blue-300 rounded text-[9.5px] bg-white text-gray-900 outline-none focus:ring-2 focus:ring-blue-400 cursor-pointer appearance-none pr-6 font-semibold"
                                                >
                                                    {(() => {
                                                        const moveAvail = getAvailableRoomsForStay(moveFromDate, moveToDate, undefined, {
                                                            excludeReservationId: booking.reservationNumber || booking.id
                                                        });
                                                        const roomsToShow = moveRoomType === 'All' 
                                                            ? allRooms 
                                                            : allRooms.filter(r => r.type === moveRoomType);

                                                        return roomsToShow.map(r => {
                                                            const st = moveAvail.allRoomsStatus.find(s => String(s.room.number) === String(r.roomNumber));
                                                            const isBooked = st ? !st.isAvailable : false;
                                                            const guestNote = st?.conflictingReservation ? `Booked: ${st.conflictingReservation.guestName}` : (st?.reason || 'Occupied');
                                                            const isCurrent = String(r.roomNumber) === String(booking.roomNumber);
                                                            return (
                                                                <option
                                                                    key={r.id || r.roomNumber}
                                                                    value={r.roomNumber}
                                                                    disabled={isBooked && !isCurrent}
                                                                >
                                                                    Room {r.roomNumber} | {r.type} {isCurrent ? '(Current Room)' : isBooked ? `[${guestNote}]` : '[Available]'}
                                                                </option>
                                                            );
                                                        });
                                                    })()}
                                                </select>
                                                <ChevronDown size={12} className="absolute right-2 top-2.5 text-gray-600 pointer-events-none" />
                                            </div>
                                        </div>

                                        {/* PROMINENT ROOM UPGRADE DETECTED CARD */}
                                        {roomMoveAnalysis?.isUpgrade && (
                                            <div className="bg-gradient-to-r from-amber-500/20 via-blue-900/50 to-emerald-500/20 border border-amber-400/60 rounded-xl p-3 shadow-md space-y-2.5 animate-in fade-in zoom-in-95">
                                                <div className="flex items-center justify-between">
                                                    <div className="flex items-center gap-1.5 text-amber-300 font-bold text-[10.5px] tracking-wide uppercase">
                                                        <Sparkles size={14} className="text-amber-400 animate-pulse shrink-0" />
                                                        <span>Room Upgrade Detected</span>
                                                    </div>
                                                    <span className="text-[9px] bg-amber-400/25 text-amber-200 border border-amber-400/40 px-2 py-0.5 rounded-full font-mono font-bold">
                                                        +{currencySymbol} {roomMoveAnalysis.dailyDiff.toFixed(2)} / night
                                                    </span>
                                                </div>

                                                <div className="bg-slate-900/70 border border-white/10 rounded-lg p-2.5 flex items-center justify-between text-[9.5px]">
                                                    <div>
                                                        <span className="text-slate-400 block text-[7.5px] uppercase tracking-wider font-semibold">Current Category</span>
                                                        <span className="text-white font-semibold">Room {booking.roomNumber}</span>
                                                        <span className="text-blue-200 block text-[8.5px]">({roomMoveAnalysis.currentRoomType})</span>
                                                    </div>
                                                    <div className="flex flex-col items-center px-2">
                                                        <span className="text-[7.5px] text-amber-300 uppercase tracking-widest font-black">Upgrade</span>
                                                        <ArrowRight size={16} className="text-amber-400 my-0.5 animate-pulse" />
                                                    </div>
                                                    <div className="text-right">
                                                        <span className="text-emerald-400 block text-[7.5px] uppercase tracking-wider font-semibold">New Category</span>
                                                        <span className="text-emerald-200 font-bold text-[11px]">Room {moveSelectedRoom}</span>
                                                        <span className="text-emerald-300 block text-[8.5px] font-medium">({roomMoveAnalysis.targetRoomType})</span>
                                                    </div>
                                                </div>

                                                {/* Upgrade Billing Selector */}
                                                <div className="pt-2 border-t border-white/10 flex items-center justify-between text-[9.5px]">
                                                    <span className="text-blue-100 font-medium">Upgrade Tariff Policy:</span>
                                                    <div className="flex items-center gap-2">
                                                        <button
                                                            type="button"
                                                            onClick={() => setUpgradeBillingMode('complimentary')}
                                                            className={`px-2.5 py-1 rounded text-[8.5px] transition-all flex items-center gap-1 cursor-pointer ${
                                                                upgradeBillingMode === 'complimentary'
                                                                    ? 'bg-emerald-600 text-white shadow-sm ring-1 ring-emerald-300 font-bold'
                                                                    : 'bg-white/10 text-slate-300 hover:bg-white/20'
                                                            }`}
                                                        >
                                                            <span>Complimentary (Free)</span>
                                                        </button>
                                                        <button
                                                            type="button"
                                                            onClick={() => setUpgradeBillingMode('charge')}
                                                            className={`px-2.5 py-1 rounded text-[8.5px] transition-all flex items-center gap-1 cursor-pointer ${
                                                                upgradeBillingMode === 'charge'
                                                                    ? 'bg-amber-500 text-slate-950 font-black shadow-sm ring-1 ring-amber-300'
                                                                    : 'bg-white/10 text-slate-300 hover:bg-white/20'
                                                            }`}
                                                        >
                                                            <span>+ Charge Diff (+{currencySymbol} {roomMoveAnalysis.totalDiff.toFixed(2)})</span>
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>
                                        )}

                                        {/* DOWNGRADE WARNING CARD */}
                                        {roomMoveAnalysis?.isDowngrade && (
                                            <div className="bg-rose-500/15 border border-rose-400/40 rounded-xl p-2.5 text-[9.5px] text-rose-200 space-y-1">
                                                <div className="flex items-center gap-1.5 font-bold text-rose-300">
                                                    <Info size={13} />
                                                    <span>Room Downgrade Warning</span>
                                                </div>
                                                <div className="text-slate-300 flex items-center justify-between">
                                                    <span>{roomMoveAnalysis.currentRoomType} (Room {booking.roomNumber})</span>
                                                    <ArrowRight size={12} className="text-rose-400 mx-1" />
                                                    <span className="text-white font-semibold">{roomMoveAnalysis.targetRoomType} (Room {moveSelectedRoom})</span>
                                                </div>
                                            </div>
                                        )}

                                        {/* SAME CATEGORY TRANSFER */}
                                        {roomMoveAnalysis?.isSameCategory && (
                                            <div className="bg-blue-500/15 border border-blue-400/30 rounded-xl p-2.5 text-[9.5px] text-blue-200 flex items-center justify-between">
                                                <div className="flex items-center gap-1.5 font-medium">
                                                    <RefreshCw size={12} className="text-blue-400" />
                                                    <span>Lateral Transfer: Room {booking.roomNumber} -&gt; Room {moveSelectedRoom}</span>
                                                </div>
                                                <span className="text-[8px] bg-blue-400/20 text-blue-200 px-1.5 py-0.5 rounded font-medium">
                                                    Same Type ({roomMoveAnalysis.currentRoomType})
                                                </span>
                                            </div>
                                        )}
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
                                                <span className="font-mono  text-white">{currencySymbol} {baseAmount.toFixed(2)}</span>
                                            </div>
                                            {isTaxApplicable && totalTax > 0 && (
                                                <div className="flex justify-between text-emerald-300 text-[8px]">
                                                    <span>Statutory Taxes &amp; VAT</span>
                                                    <span className="font-mono ">+{currencySymbol} {totalTax.toFixed(2)}</span>
                                                </div>
                                            )}
                                            <div className="flex justify-between text-blue-100 text-[8px] pt-0.5 border-t border-blue-400/20">
                                                <span>Total Payable</span>
                                                <span className="font-mono  text-white">{currencySymbol} {totalAmount.toFixed(2)}</span>
                                            </div>
                                            <div className="flex justify-between text-blue-100 text-[8px]">
                                                <span>Total Paid</span>
                                                <span className="font-mono  text-emerald-300">{currencySymbol} {paidAmount.toFixed(2)}</span>
                                            </div>
                                            <div className="flex justify-between text-blue-100 text-[8px] ">
                                                <span className="text-white">Current Balance Due</span>
                                                <span className="font-mono text-rose-300 ">{currencySymbol} {dueAmount.toFixed(2)}</span>
                                            </div>
                                            <div className="flex justify-between text-blue-100 text-[8px] pt-1 border-t border-blue-400/20 ">
                                                <span className="text-white">Payment Amount</span>
                                                <span className="font-mono text-emerald-300 text-[8px]">{currencySymbol} {paymentAmount.toFixed(2)}</span>
                                            </div>
                                            {/* Quick Pay Buttons */}
                                            {dueAmount > 0 && (
                                                <div className="pt-1 flex items-center gap-1.5">
                                                    <button
                                                        type="button"
                                                        onClick={() => setPaymentAmount(dueAmount)}
                                                        className="flex-1 py-1 bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-400/30 rounded text-[8px]  text-emerald-200 transition-colors cursor-pointer text-center"
                                                    >
                                                        Pay Full Due ({currencySymbol}{dueAmount.toFixed(0)})
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() => setPaymentAmount(Math.round(dueAmount / 2))}
                                                        className="py-1 px-2.5 bg-blue-500/20 hover:bg-blue-500/30 border border-blue-400/30 rounded text-[8px]  text-blue-200 transition-colors cursor-pointer text-center"
                                                    >
                                                        50% ({currencySymbol}{Math.round(dueAmount / 2)})
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

                                {/* MODE 5: STOP ROOM MOVE (03-stop-room-move-modal.png & Yanolja PMS) */}
                                {mode === 'stop_move' && (
                                    <div className="space-y-4">
                                        {/* Status indicator banner */}
                                        <div className={`p-3 rounded-xl border flex items-center justify-between ${
                                            stopMoveLocked
                                                ? 'bg-amber-500/15 border-amber-400/40 text-amber-200'
                                                : 'bg-emerald-500/15 border-emerald-400/40 text-emerald-200'
                                        }`}>
                                            <div className="flex items-center gap-2">
                                                {stopMoveLocked ? <Lock size={18} className="text-amber-400" /> : <ShieldCheck size={18} className="text-emerald-400" />}
                                                <div>
                                                    <div className="text-xs font-bold text-white">
                                                        {stopMoveLocked ? 'Room Move is Currently LOCKED' : 'Room Move is Allowed'}
                                                    </div>
                                                    <div className="text-[10px] text-blue-200">
                                                        {stopMoveLocked ? 'All automatic & manual room moves are blocked for this stay.' : 'Room can be moved or upgraded freely.'}
                                                    </div>
                                                </div>
                                            </div>
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    const nextLocked = !stopMoveLocked;
                                                    setStopMoveLocked(nextLocked);
                                                }}
                                                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all shadow-xs cursor-pointer ${
                                                    stopMoveLocked
                                                        ? 'bg-amber-500 text-slate-900 hover:bg-amber-400'
                                                        : 'bg-emerald-600 text-white hover:bg-emerald-500'
                                                }`}
                                            >
                                                {stopMoveLocked ? 'Unlock Move' : 'Lock Room Move'}
                                            </button>
                                        </div>

                                        {/* Lock Reasons Configuration */}
                                        {stopMoveLocked && (
                                            <div className="bg-[#1b43aa]/80 border border-blue-400/20 rounded-xl p-3 space-y-3">
                                                <div>
                                                    <label className="block text-xs font-semibold text-blue-100 mb-1">
                                                        Reason Category
                                                    </label>
                                                    <select
                                                        value={stopMovePreset}
                                                        onChange={e => {
                                                            setStopMovePreset(e.target.value);
                                                            if (e.target.value !== 'Other') {
                                                                setStopMoveReason(e.target.value);
                                                            }
                                                        }}
                                                        className="w-full h-8 px-2 border border-blue-300 rounded text-xs bg-white text-gray-900 outline-none"
                                                    >
                                                        <option value="Guest Special Request">Guest Special Request (Specific Room Allocated)</option>
                                                        <option value="Connecting / Adjoining Room Requirement">Connecting / Adjoining Room Requirement</option>
                                                        <option value="VIP / High Profile Guest Preference">VIP / High Profile Guest Preference</option>
                                                        <option value="Accessibility / Medical Assistance">Accessibility / Medical Assistance</option>
                                                        <option value="Maintenance / Deep Clean Scheduled">Maintenance / Deep Clean Scheduled</option>
                                                        <option value="Group Master / Tour Coordinator Room">Group Master / Tour Coordinator Room</option>
                                                        <option value="Other">Other Custom Reason</option>
                                                    </select>
                                                </div>

                                                <div>
                                                    <label className="block text-xs font-semibold text-blue-100 mb-1">
                                                        Lock Explanation &amp; Audit Notes
                                                    </label>
                                                    <textarea
                                                        rows={2}
                                                        value={stopMoveReason}
                                                        onChange={e => setStopMoveReason(e.target.value)}
                                                        placeholder="Provide details on why this room assignment cannot be moved..."
                                                        className="w-full p-2 border border-blue-300 rounded text-xs bg-white text-gray-900 outline-none"
                                                    />
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                )}

                                {/* MODE: ATOMIC ROOM SWAP (Yanolja PMS) */}
                                {mode === 'swap' && (
                                    <div className="space-y-3">
                                        {/* Source Room Box */}
                                        <div className="bg-[#1b43aa]/80 border border-blue-400/20 rounded-xl p-3 space-y-2">
                                            <span className="text-[10px] font-bold text-amber-300 uppercase tracking-wider">Source Room (Current Reservation)</span>
                                            <div className="flex items-center justify-between text-xs text-white">
                                                <div>
                                                    <div className="font-bold text-sm">Room {booking.roomNumber} - {booking.roomType}</div>
                                                    <div className="text-blue-200 text-[11px]">{booking.guestName} ({booking.reservationNumber})</div>
                                                </div>
                                                <div className="text-right font-mono text-xs text-blue-200">
                                                    <div>{booking.arrivalDate} ➔ {booking.departureDate}</div>
                                                    <div className="text-emerald-300 font-bold">{currencySymbol} {Number(booking.avgDailyRate || 0).toFixed(2)}/nt</div>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Swap Arrow Icon */}
                                        <div className="flex items-center justify-center">
                                            <div className="w-8 h-8 rounded-full bg-emerald-500/20 border border-emerald-400/40 text-emerald-300 flex items-center justify-center shadow-xs">
                                                <ArrowRightLeft size={16} />
                                            </div>
                                        </div>

                                        {/* Target Room Selector */}
                                        <div className="bg-[#1b43aa]/80 border border-blue-400/20 rounded-xl p-3 space-y-3">
                                            <label className="block text-xs font-bold text-white uppercase tracking-wider">
                                                Select Target Room to Swap With
                                            </label>
                                            <select
                                                value={swapTargetBookingId}
                                                onChange={e => setSwapTargetBookingId(e.target.value)}
                                                className="w-full h-9 px-2 border border-blue-300 rounded text-xs bg-white text-gray-900 outline-none"
                                            >
                                                <option value="">-- Choose Occupied / Reserved Room --</option>
                                                {allOtherBookings.map(ob => (
                                                    <option key={ob.id} value={ob.id}>
                                                        Room {ob.roomNumber} - {ob.guestName} ({ob.roomType || 'Standard'}) [{ob.arrivalDate} to {ob.departureDate}]
                                                    </option>
                                                ))}
                                            </select>

                                            <div>
                                                <label className="block text-xs font-semibold text-blue-100 mb-1">
                                                    Swap Reason &amp; Audit Trail
                                                </label>
                                                <input
                                                    type="text"
                                                    value={swapReason}
                                                    onChange={e => setSwapReason(e.target.value)}
                                                    placeholder="e.g. Mutual room change requested by guests, AC issue, etc."
                                                    className="w-full h-8 px-2 border border-blue-300 rounded text-xs bg-white text-gray-900 outline-none"
                                                />
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {/* MODE: DIGITAL REG CARD (Yanolja PMS e-Reg Card) */}
                                {mode === 'reg_card' && (
                                    <div className="p-4 bg-[#1b43aa]/80 border border-blue-400/20 rounded-xl text-center space-y-3">
                                        <FileText size={36} className="text-indigo-300 mx-auto" />
                                        <h4 className="text-sm font-bold text-white">e-Registration Card (Digital Sign-In)</h4>
                                        <p className="text-xs text-blue-200">
                                            Generate, sign, and print digital hotel check-in registration card with guest tariff breakdown and digital signature capture.
                                        </p>
                                        <button
                                            type="button"
                                            onClick={() => setIsRegCardModalOpen(true)}
                                            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-lg text-xs shadow-md transition-all cursor-pointer"
                                        >
                                            Launch Digital Signature Pad
                                        </button>
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
                                        {/* 1. Unified Hold Date Range */}
                                        <div className="space-y-1">
                                            <div className="flex items-center justify-between">
                                                <label className="text-[9.5px] font-bold text-blue-100 flex items-center gap-1">
                                                    <span className="text-rose-400">*</span> Hold Date Range
                                                </label>
                                                <span className="text-[8px] text-blue-200/70">Inventory blocked during this period</span>
                                            </div>
                                            <div className="flex items-center gap-1.5 bg-white border border-blue-300 rounded-lg px-2.5 py-1.5 shadow-2xs">
                                                <Calendar size={13} className="text-blue-600 shrink-0" />
                                                <input
                                                    type="date"
                                                    value={holdStartDate}
                                                    onChange={e => setHoldStartDate(e.target.value)}
                                                    className="w-28 bg-transparent text-[9.5px] font-mono font-semibold text-slate-900 outline-none cursor-pointer"
                                                />
                                                <ArrowRight size={12} className="text-slate-400 shrink-0" />
                                                <input
                                                    type="date"
                                                    min={holdStartDate}
                                                    value={holdEndDate}
                                                    onChange={e => {
                                                        setHoldEndDate(e.target.value);
                                                        setHoldPreset('custom');
                                                    }}
                                                    className="w-28 bg-transparent text-[9.5px] font-mono font-semibold text-slate-900 outline-none cursor-pointer"
                                                />
                                                <div className="flex-1" />
                                                {(holdStartDate !== booking.arrivalDate || holdEndDate !== booking.departureDate) && (
                                                    <button
                                                        type="button"
                                                        onClick={() => {
                                                            setHoldStartDate(booking.arrivalDate);
                                                            setHoldEndDate(booking.departureDate);
                                                        }}
                                                        className="p-1 text-slate-400 hover:text-slate-700 rounded-full hover:bg-slate-100 cursor-pointer"
                                                        title="Reset Date Range"
                                                    >
                                                        <X size={12} />
                                                    </button>
                                                )}
                                            </div>
                                        </div>

                                        {/* 2. Cut-Off Release Time with Presets */}
                                        <div className="space-y-1">
                                            <label className="text-[9.5px] font-bold text-blue-100 flex items-center gap-1">
                                                <span className="text-rose-400">*</span> Cut-Off Release Time
                                            </label>
                                            <div className="flex items-center gap-1.5 flex-wrap">
                                                <div className="flex items-center gap-1 bg-white border border-blue-300 rounded px-2 py-1 w-28">
                                                    <Clock size={12} className="text-slate-500 shrink-0" />
                                                    <input
                                                        type="time"
                                                        step="1"
                                                        value={holdUntilTime}
                                                        onChange={e => {
                                                            setHoldUntilTime(e.target.value);
                                                            setHoldPreset('custom');
                                                        }}
                                                        className="w-full bg-transparent text-[9.5px] font-mono font-bold text-slate-900 outline-none cursor-pointer"
                                                    />
                                                </div>
                                                <div className="flex items-center gap-1 flex-wrap">
                                                    <button
                                                        type="button"
                                                        onClick={() => {
                                                            setHoldPreset('6pm');
                                                            setHoldUntilTime('18:00:00');
                                                        }}
                                                        className={`px-2 py-1 rounded text-[8.5px] font-semibold transition-all cursor-pointer ${
                                                            holdPreset === '6pm'
                                                                ? 'bg-blue-500 text-white font-bold shadow-2xs'
                                                                : 'bg-white/10 text-blue-100 hover:bg-white/20'
                                                        }`}
                                                    >
                                                        6:00 PM Release
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() => {
                                                            setHoldPreset('4pm');
                                                            setHoldUntilTime('16:00:00');
                                                        }}
                                                        className={`px-2 py-1 rounded text-[8.5px] font-semibold transition-all cursor-pointer ${
                                                            holdPreset === '4pm'
                                                                ? 'bg-blue-500 text-white font-bold shadow-2xs'
                                                                : 'bg-white/10 text-blue-100 hover:bg-white/20'
                                                        }`}
                                                    >
                                                        4:00 PM
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() => {
                                                            setHoldPreset('24h');
                                                            const now = new Date();
                                                            const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
                                                            setHoldEndDate(tomorrow.toISOString().slice(0, 10));
                                                            setHoldUntilTime(tomorrow.toTimeString().slice(0, 8));
                                                        }}
                                                        className={`px-2 py-1 rounded text-[8.5px] font-semibold transition-all cursor-pointer ${
                                                            holdPreset === '24h'
                                                                ? 'bg-blue-500 text-white font-bold shadow-2xs'
                                                                : 'bg-white/10 text-blue-100 hover:bg-white/20'
                                                        }`}
                                                    >
                                                        24h Window
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() => {
                                                            setHoldPreset('48h_prior');
                                                            const inDate = new Date(booking.arrivalDate);
                                                            const prior = new Date(inDate.getTime() - 48 * 60 * 60 * 1000);
                                                            setHoldEndDate(prior.toISOString().slice(0, 10));
                                                            setHoldUntilTime('18:00:00');
                                                        }}
                                                        className={`px-2 py-1 rounded text-[8.5px] font-semibold transition-all cursor-pointer ${
                                                            holdPreset === '48h_prior'
                                                                ? 'bg-blue-500 text-white font-bold shadow-2xs'
                                                                : 'bg-white/10 text-blue-100 hover:bg-white/20'
                                                        }`}
                                                    >
                                                        48h Prior
                                                    </button>
                                                </div>
                                            </div>
                                        </div>

                                        {/* 3. Guarantee Tier */}
                                        <div className="space-y-1">
                                            <label className="text-[9.5px] font-bold text-blue-100">Hold Guarantee Tier</label>
                                            <div className="grid grid-cols-3 gap-1.5">
                                                <label className={`rounded p-1.5 flex flex-col gap-0.5 cursor-pointer border transition-all ${
                                                    holdTier === 'courtesy'
                                                        ? 'bg-amber-500/30 border-amber-400 text-white'
                                                        : 'bg-white/10 border-white/10 text-blue-100 hover:bg-white/15'
                                                }`}>
                                                    <div className="flex items-center justify-between text-[9px] font-bold">
                                                        <span>Courtesy FIT</span>
                                                        <input
                                                            type="radio"
                                                            name="drawerHoldTier"
                                                            checked={holdTier === 'courtesy'}
                                                            onChange={() => setHoldTier('courtesy')}
                                                            className="accent-amber-500"
                                                        />
                                                    </div>
                                                    <span className="text-[7.5px] text-blue-200/80 leading-tight">Auto-release at cut-off</span>
                                                </label>
                                                <label className={`rounded p-1.5 flex flex-col gap-0.5 cursor-pointer border transition-all ${
                                                    holdTier === 'corporate'
                                                        ? 'bg-blue-500/30 border-blue-400 text-white'
                                                        : 'bg-white/10 border-white/10 text-blue-100 hover:bg-white/15'
                                                }`}>
                                                    <div className="flex items-center justify-between text-[9px] font-bold">
                                                        <span>Corporate</span>
                                                        <input
                                                            type="radio"
                                                            name="drawerHoldTier"
                                                            checked={holdTier === 'corporate'}
                                                            onChange={() => setHoldTier('corporate')}
                                                            className="accent-blue-500"
                                                        />
                                                    </div>
                                                    <span className="text-[7.5px] text-blue-200/80 leading-tight">Sales desk PO pending</span>
                                                </label>
                                                <label className={`rounded p-1.5 flex flex-col gap-0.5 cursor-pointer border transition-all ${
                                                    holdTier === 'vip'
                                                        ? 'bg-purple-500/30 border-purple-400 text-white'
                                                        : 'bg-white/10 border-white/10 text-blue-100 hover:bg-white/15'
                                                }`}>
                                                    <div className="flex items-center justify-between text-[9px] font-bold">
                                                        <span>VIP Block</span>
                                                        <input
                                                            type="radio"
                                                            name="drawerHoldTier"
                                                            checked={holdTier === 'vip'}
                                                            onChange={() => setHoldTier('vip')}
                                                            className="accent-purple-500"
                                                        />
                                                    </div>
                                                    <span className="text-[7.5px] text-blue-200/80 leading-tight">Protected. No auto drop</span>
                                                </label>
                                            </div>
                                        </div>

                                        {/* 4. Reason and Quick Pills */}
                                        <div className="flex flex-col gap-1">
                                            <label className="text-[9.5px] font-semibold text-blue-100">Hold Reason *</label>
                                            <textarea
                                                value={holdReason}
                                                onChange={e => setHoldReason(e.target.value)}
                                                rows={2}
                                                placeholder="Enter hold reason (e.g. Waiting for guest deposit confirmation)"
                                                className="w-full p-2 border border-blue-300 rounded text-[9.5px] bg-white text-gray-900 outline-none leading-relaxed resize-none"
                                            />
                                            <div className="flex items-center gap-1 flex-wrap pt-0.5">
                                                {[
                                                    'Awaiting bKash / Bank Deposit',
                                                    'Corporate PO Pending',
                                                    'Delayed Flight Transit',
                                                    'VIP Courtesy Block'
                                                ].map(r => (
                                                    <button
                                                        key={r}
                                                        type="button"
                                                        onClick={() => setHoldReason(r)}
                                                        className={`px-1.5 py-0.5 rounded text-[8px] transition-colors cursor-pointer border ${
                                                            holdReason === r
                                                                ? 'bg-amber-400 text-slate-900 font-bold border-amber-300'
                                                                : 'bg-white/10 text-blue-200 border-white/15 hover:bg-white/20'
                                                        }`}
                                                    >
                                                        {r}
                                                    </button>
                                                ))}
                                            </div>
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
                                                        {booking.roomNumber} ({booking.roomType || 'Standard'})
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

                                {/* MODE 14: CONFIRM HOLD (PROVISIONAL TO GUARANTEED CONFIRMED) */}
                                {mode === 'confirm_hold' && (
                                    <div className="space-y-3">
                                        <div className="bg-emerald-500/15 border border-emerald-400/30 rounded-xl p-3 space-y-1.5 text-emerald-100">
                                            <div className="flex items-center gap-1.5 text-white font-bold text-[10.5px]">
                                                <CheckCircle2 size={14} className="text-emerald-400" />
                                                <span>Confirm & Guarantee Reservation</span>
                                            </div>
                                            <p className="text-[9px] leading-relaxed text-emerald-200">
                                                This will release the provisional hold and convert reservation <strong className="text-white">{booking.reservationNumber}</strong> into a fully confirmed booking.
                                            </p>
                                        </div>

                                        <div className="bg-[#1b43aa]/80 border border-blue-400/20 rounded-xl p-2.5 space-y-2 text-[9.5px]">
                                            <div className="flex justify-between items-center text-slate-200">
                                                <span>Guest:</span>
                                                <span className="font-bold text-white">{booking.guestName}</span>
                                            </div>
                                            <div className="flex justify-between items-center text-slate-200">
                                                <span>Room Assigned:</span>
                                                <span className="font-bold text-white">Room {booking.roomNumber} ({booking.roomType})</span>
                                            </div>
                                            <div className="flex justify-between items-center text-slate-200">
                                                <span>Stay Dates:</span>
                                                <span className="font-mono text-amber-300">{booking.arrivalDate} to {booking.departureDate} ({booking.nights} nights)</span>
                                            </div>
                                            <div className="flex justify-between items-center text-slate-200 border-t border-white/10 pt-1.5">
                                                <span>Total Tariff:</span>
                                                <span className="font-mono font-bold text-emerald-300">{currencySymbol} {Number(totalAmount).toFixed(2)}</span>
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-2 gap-2">
                                            <div className="flex flex-col gap-1">
                                                <label className="text-[9px] font-semibold text-blue-100">Advance Deposit ({currencySymbol})</label>
                                                <input
                                                    type="number"
                                                    min="0"
                                                    step="0.01"
                                                    value={confirmHoldDeposit}
                                                    onChange={e => setConfirmHoldDeposit(Math.max(0, parseFloat(e.target.value) || 0))}
                                                    className="w-full h-8 px-2.5 border border-blue-300 rounded text-[9.5px] bg-white text-gray-900 font-mono outline-none"
                                                    placeholder="0.00"
                                                />
                                            </div>
                                            <div className="flex flex-col gap-1">
                                                <label className="text-[9px] font-semibold text-blue-100">Payment Method</label>
                                                <select
                                                    value={confirmHoldMethod}
                                                    onChange={e => setConfirmHoldMethod(e.target.value)}
                                                    className="w-full h-8 px-2 border border-blue-300 rounded text-[9.5px] bg-white text-gray-900 outline-none cursor-pointer"
                                                >
                                                    <option value="Cash">Cash</option>
                                                    <option value="Credit Card">Credit Card</option>
                                                    <option value="Debit Card">Debit Card</option>
                                                    <option value="Bank Transfer">Bank Transfer</option>
                                                    <option value="UPI / QR">UPI / QR Code</option>
                                                    <option value="Online Gateway">Online Gateway</option>
                                                </select>
                                            </div>
                                        </div>

                                        <div className="flex flex-col gap-1">
                                            <label className="text-[9px] font-semibold text-blue-100">Confirmation Notes (Optional)</label>
                                            <textarea
                                                value={confirmHoldNotes}
                                                onChange={e => setConfirmHoldNotes(e.target.value)}
                                                rows={2}
                                                placeholder="e.g. Deposit received, room block confirmed by guest."
                                                className="w-full p-2 border border-blue-300 rounded text-[9.5px] bg-white text-gray-900 outline-none"
                                            />
                                        </div>
                                    </div>
                                )}

                                {/* MODE 15: RELEASE HELD ROOM */}
                                {mode === 'release_hold' && (
                                    <div className="space-y-3">
                                        <div className="bg-rose-500/15 border border-rose-400/30 rounded-xl p-3 space-y-1.5 text-rose-100">
                                            <div className="flex items-center gap-1.5 text-white font-bold text-[10.5px]">
                                                <CircleSlash size={14} className="text-rose-400" />
                                                <span>Release Held Room Block</span>
                                            </div>
                                            <p className="text-[9px] leading-relaxed text-rose-200">
                                                Are you sure you want to release Room <strong className="text-white">{booking.roomNumber}</strong>? This will cancel the tentative hold and return the room to available inventory.
                                            </p>
                                        </div>

                                        <div className="flex flex-col gap-1">
                                            <label className="text-[9px] font-semibold text-blue-100">Release Reason *</label>
                                            <textarea
                                                value={releaseHoldReason}
                                                onChange={e => setReleaseHoldReason(e.target.value)}
                                                rows={3}
                                                placeholder="e.g. Cut-off time reached, guest did not provide guarantee deposit."
                                                className="w-full p-2 border border-blue-300 rounded text-[9.5px] bg-white text-gray-900 outline-none"
                                            />
                                        </div>
                                    </div>
                                )}

                                {/* MODE 16: REINSTATE CANCELLED RESERVATION */}
                                {mode === 'reinstate' && (
                                    <div className="space-y-3">
                                        <div className="bg-emerald-500/15 border border-emerald-400/30 rounded-xl p-3 space-y-1.5 text-emerald-100">
                                            <div className="flex items-center gap-1.5 text-white font-bold text-[10.5px]">
                                                <RotateCcw size={14} className="text-emerald-400" />
                                                <span>Reinstate Cancelled Reservation</span>
                                            </div>
                                            <p className="text-[9px] leading-relaxed text-emerald-200">
                                                This will un-cancel reservation <strong className="text-white">{booking.reservationNumber}</strong> and restore it to Confirmed status.
                                            </p>
                                        </div>

                                        <div className="bg-[#1b43aa]/80 border border-blue-400/20 rounded-xl p-2.5 space-y-1.5 text-[9.5px]">
                                            <div className="flex justify-between items-center text-slate-200">
                                                <span>Guest Name:</span>
                                                <span className="font-bold text-white">{booking.guestName}</span>
                                            </div>
                                            <div className="flex justify-between items-center text-slate-200">
                                                <span>Target Room:</span>
                                                <span className="font-bold text-white">Room {booking.roomNumber} ({booking.roomType})</span>
                                            </div>
                                            <div className="flex justify-between items-center text-slate-200">
                                                <span>Stay Dates:</span>
                                                <span className="font-mono text-emerald-300">{booking.arrivalDate} to {booking.departureDate} ({booking.nights} nights)</span>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {/* MODE 17: UNDO CHECK-IN */}
                                {mode === 'undo_checkin' && (
                                    <div className="space-y-3">
                                        <div className="bg-amber-500/15 border border-amber-400/30 rounded-xl p-3 space-y-1.5 text-amber-100">
                                            <div className="flex items-center gap-1.5 text-white font-bold text-[10.5px]">
                                                <Undo2 size={14} className="text-amber-400" />
                                                <span>Reverse Guest Check-In</span>
                                            </div>
                                            <p className="text-[9px] leading-relaxed text-amber-200">
                                                Reverses the in-house check-in status back to <strong className="text-white">Confirmed</strong>. The guest will be moved back to the pre-arrival arrivals list.
                                            </p>
                                        </div>

                                        <div className="bg-[#1b43aa]/80 border border-blue-400/20 rounded-xl p-2.5 space-y-1.5 text-[9.5px]">
                                            <div className="flex justify-between items-center text-slate-200">
                                                <span>Guest:</span>
                                                <span className="font-bold text-white">{booking.guestName}</span>
                                            </div>
                                            <div className="flex justify-between items-center text-slate-200">
                                                <span>Assigned Room:</span>
                                                <span className="font-bold text-white">Room {booking.roomNumber} ({booking.roomType})</span>
                                            </div>
                                            <div className="flex justify-between items-center text-slate-200">
                                                <span>Registration No:</span>
                                                <span className="font-mono text-emerald-300">{activeRegNo || 'REG-PENDING'}</span>
                                            </div>
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
            )}

            {/* Status-Driven Printable Document Modal (GRC, Voucher, Folio Statement, Group Master Invoice, Group Pre-Reg) */}
            {activePrintDoc && (
                <div className="fixed inset-0 z-[120] bg-slate-950/75 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5 overflow-y-auto animate-in fade-in duration-150">
                    <style>{`
                        @media print {
                            body * {
                                visibility: hidden !important;
                            }
                            #hotel-printable-document, #hotel-printable-document * {
                                visibility: visible !important;
                            }
                            #hotel-printable-document {
                                position: absolute !important;
                                left: 0 !important;
                                top: 0 !important;
                                width: 100% !important;
                                margin: 0 !important;
                                padding: 20px !important;
                                background: white !important;
                                color: black !important;
                                border: none !important;
                                box-shadow: none !important;
                            }
                            .page-break {
                                page-break-after: always !important;
                                break-after: page !important;
                            }
                            .no-print {
                                display: none !important;
                            }
                        }
                    `}</style>

                    <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-4xl w-full overflow-hidden flex flex-col my-auto max-h-[92vh] animate-in zoom-in-95 duration-150">
                        {/* Modal Header Bar (no-print) */}
                        <div className="px-5 py-3 bg-slate-900 text-white flex flex-wrap items-center justify-between gap-3 no-print border-b border-slate-800 flex-shrink-0">
                            <div className="flex items-center gap-2">
                                <Printer size={15} className="text-blue-400" />
                                <span className="text-xs font-bold uppercase tracking-wider">Document Preview</span>
                                <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-300 border border-blue-400/30 font-semibold font-mono">
                                    {activePrintDoc === 'reg_card'
                                        ? `Room ${activeRoomNum} GRC`
                                        : activePrintDoc === 'voucher'
                                        ? `Room ${activeRoomNum} Voucher`
                                        : activePrintDoc === 'cancellation'
                                        ? 'Cancellation Slip'
                                        : activePrintDoc === 'group_invoice'
                                        ? `Group Master Tax Invoice (${groupFinancials.totalRooms} Rooms)`
                                        : activePrintDoc === 'group_voucher'
                                        ? `Group Confirmation Voucher (${groupFinancials.totalRooms} Rooms)`
                                        : activePrintDoc === 'group_prereg'
                                        ? `Group Pre-Reg & Rooming Sheet (${groupFinancials.totalRooms} Rooms)`
                                        : activePrintDoc === 'batch_grc'
                                        ? `Batch Print All GRCs (${groupFinancials.totalRooms} Rooms)`
                                        : isCurrentActiveCheckedOut
                                        ? 'Tax Invoice'
                                        : 'Guest Folio Statement'}
                                </span>
                            </div>

                            {/* Document Switcher Tabs */}
                            <div className="flex flex-wrap items-center gap-1 bg-slate-800 p-1 rounded-lg text-[10px]">
                                {/* Room Specific Tabs */}
                                <div className="flex items-center gap-0.5 pr-1 border-r border-slate-700">
                                    <span className="text-[8.5px] text-slate-400 font-semibold px-1">Room {activeRoomNum}:</span>
                                    <button
                                        type="button"
                                        onClick={() => setActivePrintDoc('reg_card')}
                                        className={`px-2 py-0.5 rounded font-semibold transition-all cursor-pointer ${
                                            activePrintDoc === 'reg_card' ? 'bg-blue-600 text-white shadow-xs' : 'text-slate-300 hover:text-white hover:bg-slate-700'
                                        }`}
                                    >
                                        Reg Card
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setActivePrintDoc('voucher')}
                                        className={`px-2 py-0.5 rounded font-semibold transition-all cursor-pointer ${
                                            activePrintDoc === 'voucher' ? 'bg-blue-600 text-white shadow-xs' : 'text-slate-300 hover:text-white hover:bg-slate-700'
                                        }`}
                                    >
                                        Voucher
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setActivePrintDoc('folio')}
                                        className={`px-2 py-0.5 rounded font-semibold transition-all cursor-pointer ${
                                            activePrintDoc === 'folio' ? 'bg-blue-600 text-white shadow-xs' : 'text-slate-300 hover:text-white hover:bg-slate-700'
                                        }`}
                                    >
                                        Folio Bill
                                    </button>
                                </div>

                                {/* Group Specific Tabs */}
                                {isMultiRoomGroup && (
                                    <div className="flex items-center gap-0.5 pl-1">
                                        <span className="text-[8.5px] text-amber-300 font-semibold px-1">Group ({resolvedGroupRooms.length}R):</span>
                                        <button
                                            type="button"
                                            onClick={() => setActivePrintDoc('group_invoice')}
                                            className={`px-2 py-0.5 rounded font-semibold transition-all cursor-pointer ${
                                                activePrintDoc === 'group_invoice' ? 'bg-indigo-600 text-white shadow-xs' : 'text-amber-200 hover:text-white hover:bg-slate-700'
                                            }`}
                                        >
                                            Master Invoice
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setActivePrintDoc('group_voucher')}
                                            className={`px-2 py-0.5 rounded font-semibold transition-all cursor-pointer ${
                                                activePrintDoc === 'group_voucher' ? 'bg-indigo-600 text-white shadow-xs' : 'text-amber-200 hover:text-white hover:bg-slate-700'
                                            }`}
                                        >
                                            Group Voucher
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setActivePrintDoc('group_prereg')}
                                            className={`px-2 py-0.5 rounded font-semibold transition-all cursor-pointer ${
                                                activePrintDoc === 'group_prereg' ? 'bg-indigo-600 text-white shadow-xs' : 'text-amber-200 hover:text-white hover:bg-slate-700'
                                            }`}
                                        >
                                            Rooming Pre-Reg
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setActivePrintDoc('batch_grc')}
                                            className={`px-2 py-0.5 rounded font-semibold transition-all cursor-pointer ${
                                                activePrintDoc === 'batch_grc' ? 'bg-purple-600 text-white shadow-xs' : 'text-purple-200 hover:text-white hover:bg-slate-700'
                                            }`}
                                            title="Print individual registration cards for all rooms with page breaks"
                                        >
                                            Batch GRCs
                                        </button>
                                    </div>
                                )}
                            </div>

                            <div className="flex items-center gap-2">
                                <button
                                    type="button"
                                    onClick={() => window.print()}
                                    className="h-7.5 px-3.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-xs transition-colors"
                                >
                                    <Printer size={13} />
                                    <span>Print Document</span>
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setActivePrintDoc(null)}
                                    className="w-7.5 h-7.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white flex items-center justify-center cursor-pointer transition-colors"
                                    title="Close Preview"
                                >
                                    <X size={15} />
                                </button>
                            </div>
                        </div>

                        {/* Printable Paper Area */}
                        <div className="p-6 overflow-y-auto bg-slate-100 flex-1">
                            <div id="hotel-printable-document" className="bg-white p-8 rounded-xl border border-slate-300 shadow-xs max-w-3xl mx-auto text-slate-800 font-sans text-xs space-y-4">
                                
                                {/* 1. SINGLE ROOM REGISTRATION CARD (GRC) */}
                                {activePrintDoc === 'reg_card' && (
                                    <div className="space-y-4">
                                        <div className="flex justify-between items-start border-b-2 border-slate-900 pb-4">
                                            <div>
                                                <h1 className="text-base font-black text-slate-900 tracking-tight font-serif uppercase">GRAND PALACE HOTEL & RESORT</h1>
                                                <p className="text-[10.5px] text-slate-600 mt-0.5">Plot 12, Road 45, Gulshan-2, Dhaka-1212, Bangladesh</p>
                                                <p className="text-[10px] text-slate-500">Tel: +880 2 9882200 | Email: frontdesk@grandpalace.com</p>
                                                <p className="text-[10px] text-slate-500 font-mono">BIN / VAT Registration: 1234567890123</p>
                                            </div>
                                            <div className="text-right">
                                                <span className="inline-block px-2.5 py-1 rounded bg-slate-900 text-white font-mono font-bold text-[11px] uppercase tracking-wider">
                                                    GUEST REGISTRATION CARD (GRC)
                                                </span>
                                                <div className="font-mono text-xs font-bold text-slate-900 mt-1">Ref: {activeSubBookingNo}</div>
                                                {activeRegNo && <div className="font-mono text-[10.5px] text-emerald-700 font-semibold">Reg: {activeRegNo}</div>}
                                                <div className="text-[10px] text-slate-500 mt-0.5">Date: {operatingSystemDate}</div>
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-2 gap-4 bg-slate-50 p-4 rounded-lg border border-slate-200">
                                            <div className="space-y-1">
                                                <span className="text-[10px] uppercase font-bold text-slate-500 block">Guest Personal Details</span>
                                                <p className="text-sm font-bold text-slate-900">{activeGuestName}</p>
                                                <p className="text-xs text-slate-700">Phone: {booking.phone || bookingAny.mobile || '-'}</p>
                                                <p className="text-xs text-slate-700">Email: {booking.email || '-'}</p>
                                                <p className="text-xs text-slate-700">Pax: {activeRoom.adults ?? booking.adults ?? 2} Adults, {activeRoom.children ?? booking.children ?? 0} Children</p>
                                            </div>
                                            <div className="space-y-1">
                                                <span className="text-[10px] uppercase font-bold text-slate-500 block">Stay Allocation</span>
                                                <p className="text-sm font-bold text-blue-700 font-mono">Room {activeRoomNum} - {activeRoomType}</p>
                                                <p className="text-xs text-slate-700">Rate Plan: {activeRatePlan}</p>
                                                <p className="text-xs text-slate-700 font-medium">Check-In: <span className="font-bold">{booking.arrivalDate || bookingAny.checkIn}</span> (14:00)</p>
                                                <p className="text-xs text-slate-700 font-medium">Check-Out: <span className="font-bold">{booking.departureDate || bookingAny.checkOut}</span> (12:00)</p>
                                                <p className="text-xs text-slate-700">Nights: {booking.nights || 1} Night(s)</p>
                                            </div>
                                        </div>

                                        <div className="bg-slate-50/70 p-3 rounded-lg border border-slate-200 text-[10px] text-slate-600 space-y-1 leading-relaxed">
                                            <p className="font-bold text-slate-700 uppercase">Terms, Conditions & Hotel Regulations:</p>
                                            <p>1. Check-out time is 12:00 PM. Late check-out is subject to room availability and standard tariff.</p>
                                            <p>2. The hotel reserves the right to charge registered payment methods for unsettled food, beverage, minibar, or damages.</p>
                                            <p>3. Safe deposit lockers are provided in all rooms. The hotel does not accept liability for money or valuables left in rooms.</p>
                                            <p>4. I certify that all personal and identification details stated above are accurate and valid.</p>
                                        </div>

                                        <div className="pt-10 flex justify-between items-end border-t border-slate-300">
                                            <div className="text-center w-48 border-t border-slate-500 pt-1.5 text-[10px] text-slate-600 font-semibold">
                                                Front Desk Receptionist
                                            </div>
                                            <div className="text-center w-48 border-t border-slate-500 pt-1.5 text-[10px] text-slate-600 font-bold">
                                                Guest Signature
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {/* 2. SINGLE ROOM CONFIRMATION VOUCHER */}
                                {activePrintDoc === 'voucher' && (
                                    <div className="space-y-4">
                                        <div className="flex justify-between items-start border-b-2 border-slate-900 pb-4">
                                            <div>
                                                <h1 className="text-base font-black text-slate-900 tracking-tight font-serif uppercase">GRAND PALACE HOTEL & RESORT</h1>
                                                <p className="text-[10.5px] text-slate-600 mt-0.5">Plot 12, Road 45, Gulshan-2, Dhaka-1212, Bangladesh</p>
                                                <p className="text-[10px] text-slate-500">Tel: +880 2 9882200 | Email: frontdesk@grandpalace.com</p>
                                                <p className="text-[10px] text-slate-500 font-mono">BIN / VAT Registration: 1234567890123</p>
                                            </div>
                                            <div className="text-right">
                                                <span className="inline-block px-2.5 py-1 rounded bg-slate-900 text-white font-mono font-bold text-[11px] uppercase tracking-wider">
                                                    BOOKING CONFIRMATION VOUCHER
                                                </span>
                                                <div className="font-mono text-xs font-bold text-slate-900 mt-1">Ref: {activeSubBookingNo}</div>
                                                <div className="text-[10px] text-slate-500 mt-0.5">Date: {operatingSystemDate}</div>
                                            </div>
                                        </div>

                                        <div className="bg-blue-50/60 p-4 rounded-lg border border-blue-200 grid grid-cols-2 gap-4">
                                            <div className="space-y-1">
                                                <span className="text-[10px] uppercase font-bold text-blue-800 block">Lead Guest</span>
                                                <p className="text-sm font-bold text-slate-900">{activeGuestName}</p>
                                                <p className="text-xs text-slate-700">Phone: {booking.phone || bookingAny.mobile || '-'}</p>
                                                <p className="text-xs text-slate-700">Email: {booking.email || '-'}</p>
                                            </div>
                                            <div className="space-y-1">
                                                <span className="text-[10px] uppercase font-bold text-blue-800 block">Booking Reference</span>
                                                <p className="text-sm font-bold font-mono text-blue-900">{activeSubBookingNo}</p>
                                                <p className="text-xs text-slate-700">Booking Status: <span className="font-bold text-emerald-700">{activeStatus}</span></p>
                                                <p className="text-xs text-slate-700">Booked On: {bookingAny.bookedOn || operatingSystemDate}</p>
                                            </div>
                                        </div>

                                        <table className="w-full text-xs border border-slate-200 rounded-lg overflow-hidden">
                                            <thead className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
                                                <tr>
                                                    <th className="p-2.5 text-left">Room #</th>
                                                    <th className="p-2.5 text-left">Category & Rate Plan</th>
                                                    <th className="p-2.5 text-center">Stay Period</th>
                                                    <th className="p-2.5 text-right">Tariff / Night</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                <tr className="border-b border-slate-100">
                                                    <td className="p-2.5 font-mono font-bold text-blue-800">{activeRoomNum}</td>
                                                    <td className="p-2.5">
                                                        <div className="font-bold">{activeRoomType}</div>
                                                        <div className="text-[10px] text-slate-500">{activeRatePlan}</div>
                                                    </td>
                                                    <td className="p-2.5 text-center font-mono text-[11px]">
                                                        {booking.arrivalDate || bookingAny.checkIn} to {booking.departureDate || bookingAny.checkOut} ({booking.nights || 1}N)
                                                    </td>
                                                    <td className="p-2.5 text-right font-mono font-bold">
                                                        {currencySymbol} {Number(booking.avgDailyRate || getStandardDailyRateForRoom(activeRoomNum, activeRoomType)).toLocaleString()}
                                                    </td>
                                                </tr>
                                            </tbody>
                                        </table>

                                        <div className="flex justify-end">
                                            <div className="w-64 space-y-1.5 text-xs bg-slate-50 p-3 rounded-lg border border-slate-200">
                                                <div className="flex justify-between">
                                                    <span className="text-slate-600">Total Billed:</span>
                                                    <span className="font-mono font-bold">{currencySymbol} {Number(booking.totalAmount || 0).toLocaleString()}</span>
                                                </div>
                                                <div className="flex justify-between text-emerald-700 font-semibold">
                                                    <span>Advance Deposited:</span>
                                                    <span className="font-mono">{currencySymbol} {Number(booking.paidAmount || 0).toLocaleString()}</span>
                                                </div>
                                                <div className="flex justify-between text-rose-700 font-bold border-t border-slate-200 pt-1">
                                                    <span>Payable at Check-In:</span>
                                                    <span className="font-mono">{currencySymbol} {Number(booking.dueAmount || 0).toLocaleString()}</span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {/* 3. SINGLE ROOM FOLIO STATEMENT / TAX INVOICE */}
                                {(activePrintDoc === 'folio' || activePrintDoc === 'cancellation') && (
                                    <div className="space-y-4">
                                        <div className="flex justify-between items-start border-b-2 border-slate-900 pb-4">
                                            <div>
                                                <h1 className="text-base font-black text-slate-900 tracking-tight font-serif uppercase">GRAND PALACE HOTEL & RESORT</h1>
                                                <p className="text-[10.5px] text-slate-600 mt-0.5">Plot 12, Road 45, Gulshan-2, Dhaka-1212, Bangladesh</p>
                                                <p className="text-[10px] text-slate-500">Tel: +880 2 9882200 | Email: frontdesk@grandpalace.com</p>
                                                <p className="text-[10px] text-slate-500 font-mono">BIN / VAT Registration: 1234567890123</p>
                                            </div>
                                            <div className="text-right">
                                                <span className="inline-block px-2.5 py-1 rounded bg-slate-900 text-white font-mono font-bold text-[11px] uppercase tracking-wider">
                                                    {activePrintDoc === 'cancellation'
                                                        ? 'CANCELLATION SLIP'
                                                        : isCurrentActiveCheckedOut
                                                        ? 'TAX INVOICE & FINAL FOLIO'
                                                        : 'GUEST FOLIO STATEMENT'}
                                                </span>
                                                <div className="font-mono text-xs font-bold text-slate-900 mt-1">Ref: {activeSubBookingNo}</div>
                                                <div className="text-[10px] text-slate-500 mt-0.5">Date: {operatingSystemDate}</div>
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-2 gap-4 bg-slate-50 p-3.5 rounded-lg border border-slate-200">
                                            <div className="space-y-1">
                                                <span className="text-[10px] uppercase font-bold text-slate-500 block">Guest Details</span>
                                                <p className="text-sm font-bold text-slate-900">{activeGuestName}</p>
                                                <p className="text-xs text-slate-700">Room: <span className="font-mono font-bold text-blue-800">{activeRoomNum}</span> ({activeRoomType})</p>
                                                <p className="text-xs text-slate-700">Stay: {booking.arrivalDate || bookingAny.checkIn} to {booking.departureDate || bookingAny.checkOut}</p>
                                            </div>
                                            <div className="text-right space-y-1">
                                                <span className="text-[10px] uppercase font-bold text-slate-500 block">Folio & Account</span>
                                                <p className="text-sm font-bold font-mono text-slate-900">{booking.folioNumber || `FOL-${activeSubBookingNo}-1`}</p>
                                                <p className="text-xs text-slate-700">Billing Status: <span className="font-bold text-blue-700">{activeStatus}</span></p>
                                                <p className="text-xs text-slate-700">Currency: {currencySymbol}</p>
                                            </div>
                                        </div>

                                        <table className="w-full text-xs border border-slate-200 rounded-lg overflow-hidden">
                                            <thead className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
                                                <tr>
                                                    <th className="p-2.5 text-left">Description</th>
                                                    <th className="p-2.5 text-center">Ref Date</th>
                                                    <th className="p-2.5 text-right">Debit (Charge)</th>
                                                    <th className="p-2.5 text-right">Credit (Payment)</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-slate-100">
                                                <tr>
                                                    <td className="p-2.5">
                                                        <div className="font-semibold">Room Accommodation Tariff ({booking.nights || 1} Nights)</div>
                                                        <div className="text-[10px] text-slate-500">Room {activeRoomNum} - {activeRatePlan}</div>
                                                    </td>
                                                    <td className="p-2.5 text-center font-mono text-[11px]">{booking.arrivalDate || bookingAny.checkIn}</td>
                                                    <td className="p-2.5 text-right font-mono font-bold">{currencySymbol} {Number(booking.totalAmount || 0).toLocaleString()}</td>
                                                    <td className="p-2.5 text-right font-mono text-slate-400">-</td>
                                                </tr>
                                                {Number(booking.paidAmount || 0) > 0 && (
                                                    <tr>
                                                        <td className="p-2.5">
                                                            <div className="font-semibold text-emerald-800">Payment Received ({bookingAny.paymentMethod || 'Cash'})</div>
                                                            <div className="text-[10px] text-emerald-600">Settled at Front Desk</div>
                                                        </td>
                                                        <td className="p-2.5 text-center font-mono text-[11px]">{operatingSystemDate}</td>
                                                        <td className="p-2.5 text-right font-mono text-slate-400">-</td>
                                                        <td className="p-2.5 text-right font-mono font-bold text-emerald-700">{currencySymbol} {Number(booking.paidAmount || 0).toLocaleString()}</td>
                                                    </tr>
                                                )}
                                            </tbody>
                                        </table>

                                        <div className="flex justify-end">
                                            <div className="w-64 space-y-1.5 text-xs bg-slate-50 p-3 rounded-lg border border-slate-200">
                                                <div className="flex justify-between">
                                                    <span className="text-slate-600">Total Charges:</span>
                                                    <span className="font-mono font-bold">{currencySymbol} {Number(booking.totalAmount || 0).toLocaleString()}</span>
                                                </div>
                                                <div className="flex justify-between text-emerald-700 font-semibold">
                                                    <span>Total Credits (Paid):</span>
                                                    <span className="font-mono font-bold">{currencySymbol} {Number(booking.paidAmount || 0).toLocaleString()}</span>
                                                </div>
                                                <div className="flex justify-between text-slate-900 font-black border-t border-slate-300 pt-1.5 text-sm">
                                                    <span>Balance Outstanding:</span>
                                                    <span className="font-mono text-rose-700">{currencySymbol} {Number(booking.dueAmount || 0).toLocaleString()}</span>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="pt-10 flex justify-between items-end border-t border-slate-300">
                                            <div className="text-center w-48 border-t border-slate-500 pt-1.5 text-[10px] text-slate-600 font-semibold">
                                                Authorized Cashier Signature
                                            </div>
                                            <div className="text-center w-48 border-t border-slate-500 pt-1.5 text-[10px] text-slate-600 font-bold">
                                                Guest Signature
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {/* 4. GROUP MASTER TAX INVOICE & FOLIO */}
                                {activePrintDoc === 'group_invoice' && (
                                    <div className="space-y-4">
                                        <div className="flex justify-between items-start border-b-2 border-slate-900 pb-4">
                                            <div>
                                                <h1 className="text-base font-black text-slate-900 tracking-tight font-serif uppercase">GRAND PALACE HOTEL & RESORT</h1>
                                                <p className="text-[10.5px] text-slate-600 mt-0.5">Plot 12, Road 45, Gulshan-2, Dhaka-1212, Bangladesh</p>
                                                <p className="text-[10px] text-slate-500">Tel: +880 2 9882200 | Email: accounts@grandpalace.com</p>
                                                <p className="text-[10px] text-slate-500 font-mono">BIN / VAT Registration: 1234567890123</p>
                                            </div>
                                            <div className="text-right">
                                                <span className="inline-block px-2.5 py-1 rounded bg-indigo-900 text-white font-mono font-bold text-[11px] uppercase tracking-wider">
                                                    GROUP MASTER TAX INVOICE
                                                </span>
                                                <div className="font-mono text-xs font-bold text-slate-900 mt-1">
                                                    Group Ref: {booking.groupCode || `GRP-${booking.reservationNumber}`}
                                                </div>
                                                <div className="text-[10px] text-slate-500 mt-0.5">Invoice Date: {operatingSystemDate}</div>
                                                <div className="text-[10px] text-indigo-700 font-semibold font-mono">Total Inventory: {groupFinancials.totalRooms} Rooms</div>
                                            </div>
                                        </div>

                                        <div className="bg-slate-50 p-4 rounded-lg border border-slate-200 grid grid-cols-2 gap-4">
                                            <div className="space-y-1">
                                                <span className="text-[10px] uppercase font-bold text-slate-500 block">Billed To (Group / Corporate Account)</span>
                                                <p className="text-sm font-bold text-slate-900">{booking.companyName || booking.guestName}</p>
                                                <p className="text-xs text-slate-700">Lead Contact: {booking.guestName}</p>
                                                <p className="text-xs text-slate-700">Phone: {booking.phone || bookingAny.mobile || '-'}</p>
                                                <p className="text-xs text-slate-700">Email: {booking.email || '-'}</p>
                                            </div>
                                            <div className="space-y-1 text-right">
                                                <span className="text-[10px] uppercase font-bold text-slate-500 block">Master Group Stay Details</span>
                                                <p className="text-xs text-slate-800">
                                                    Check-In: <span className="font-bold font-mono">{booking.arrivalDate || bookingAny.checkIn}</span>
                                                </p>
                                                <p className="text-xs text-slate-800">
                                                    Check-Out: <span className="font-bold font-mono">{booking.departureDate || bookingAny.checkOut}</span>
                                                </p>
                                                <p className="text-xs text-slate-700">Stay Duration: {origNights} Nights</p>
                                                <p className="text-xs text-slate-700 font-medium">Total Guest Pax: {groupFinancials.totalPax} Guests</p>
                                            </div>
                                        </div>

                                        {/* Itemized Room Charges Table */}
                                        <div className="space-y-1.5">
                                            <div className="text-[11px] font-bold text-slate-900 uppercase tracking-wide">
                                                Itemized Room Tariff Breakdown ({groupFinancials.totalRooms} Rooms)
                                            </div>
                                            <table className="w-full text-xs border border-slate-200 rounded-lg overflow-hidden">
                                                <thead className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
                                                    <tr>
                                                        <th className="p-2 text-left w-14">Room #</th>
                                                        <th className="p-2 text-left">Category & Rate Plan</th>
                                                        <th className="p-2 text-left">Lead Occupant</th>
                                                        <th className="p-2 text-center">Pax</th>
                                                        <th className="p-2 text-center">Nights</th>
                                                        <th className="p-2 text-right">Daily Rate</th>
                                                        <th className="p-2 text-right">Total Tariff</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-slate-100">
                                                    {groupFinancials.rooms.map((rm: any, idx: number) => (
                                                        <tr key={idx} className="hover:bg-slate-50/50">
                                                            <td className="p-2 font-mono font-bold text-blue-800">
                                                                {rm.roomNumber || `Unassigned (${idx + 1})`}
                                                            </td>
                                                            <td className="p-2">
                                                                <div className="font-semibold text-slate-800">{rm.roomType}</div>
                                                                <div className="text-[9.5px] text-slate-500">{rm.ratePlan || 'Standard Rate'}</div>
                                                            </td>
                                                            <td className="p-2 text-slate-800">
                                                                <div className="font-medium">{rm.guestName || booking.guestName}</div>
                                                                <div className="text-[9px] font-mono text-slate-400">{rm.displayResNo}</div>
                                                            </td>
                                                            <td className="p-2 text-center text-slate-600 font-mono text-[11px]">
                                                                {rm.effectivePax}
                                                            </td>
                                                            <td className="p-2 text-center text-slate-600 font-mono text-[11px]">
                                                                {rm.effectiveNights}
                                                            </td>
                                                            <td className="p-2 text-right font-mono text-slate-700">
                                                                {currencySymbol} {rm.effectiveRate.toLocaleString()}
                                                            </td>
                                                            <td className="p-2 text-right font-mono font-bold text-slate-900">
                                                                {currencySymbol} {rm.effectiveBase.toLocaleString()}
                                                            </td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>

                                        {/* Financial Summary */}
                                        <div className="flex justify-between items-start pt-2">
                                            <div className="max-w-xs text-[10px] text-slate-500 space-y-1">
                                                <p className="font-semibold text-slate-700 uppercase">Payment Instructions / Remittance:</p>
                                                <p>Prime Bank Ltd, Gulshan Branch, Dhaka</p>
                                                <p className="font-mono">Account: 1100-2233-4401 (BDT)</p>
                                                <p className="font-mono">Routing No: 175272635 | Swift: PRBLBDDH</p>
                                            </div>

                                            <div className="w-72 space-y-1.5 text-xs bg-slate-50 p-3.5 rounded-lg border border-slate-200">
                                                <div className="flex justify-between">
                                                    <span className="text-slate-600">Total Room Tariff:</span>
                                                    <span className="font-mono font-bold">{currencySymbol} {groupFinancials.totalBase.toLocaleString()}</span>
                                                </div>
                                                <div className="flex justify-between text-slate-600">
                                                    <span>Service Charge (10%):</span>
                                                    <span className="font-mono">{currencySymbol} {groupFinancials.serviceCharge.toLocaleString()}</span>
                                                </div>
                                                <div className="flex justify-between text-slate-600">
                                                    <span>VAT / Tax (15%):</span>
                                                    <span className="font-mono">{currencySymbol} {groupFinancials.vatAmount.toLocaleString()}</span>
                                                </div>
                                                <div className="flex justify-between font-bold text-slate-900 border-t border-slate-300 pt-1">
                                                    <span>Master Gross Amount:</span>
                                                    <span className="font-mono">{currencySymbol} {groupFinancials.grandTotal.toLocaleString()}</span>
                                                </div>
                                                <div className="flex justify-between text-emerald-700 font-semibold">
                                                    <span>Master Paid / Deposit:</span>
                                                    <span className="font-mono">{currencySymbol} {groupFinancials.paidAmount.toLocaleString()}</span>
                                                </div>
                                                <div className="flex justify-between text-rose-700 font-black border-t border-slate-300 pt-1 text-sm">
                                                    <span>Balance Outstanding:</span>
                                                    <span className="font-mono">{currencySymbol} {groupFinancials.dueAmount.toLocaleString()}</span>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="pt-10 flex justify-between items-end border-t border-slate-300">
                                            <div className="text-center w-48 border-t border-slate-500 pt-1.5 text-[10px] text-slate-600 font-semibold">
                                                Authorized Accounts / Cashier
                                            </div>
                                            <div className="text-center w-48 border-t border-slate-500 pt-1.5 text-[10px] text-slate-600 font-bold">
                                                Group Representative Signature
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {/* 5. GROUP BOOKING CONFIRMATION VOUCHER */}
                                {activePrintDoc === 'group_voucher' && (
                                    <div className="space-y-4">
                                        <div className="flex justify-between items-start border-b-2 border-slate-900 pb-4">
                                            <div>
                                                <h1 className="text-base font-black text-slate-900 tracking-tight font-serif uppercase">GRAND PALACE HOTEL & RESORT</h1>
                                                <p className="text-[10.5px] text-slate-600 mt-0.5">Plot 12, Road 45, Gulshan-2, Dhaka-1212, Bangladesh</p>
                                                <p className="text-[10px] text-slate-500">Tel: +880 2 9882200 | Email: reservations@grandpalace.com</p>
                                            </div>
                                            <div className="text-right">
                                                <span className="inline-block px-2.5 py-1 rounded bg-slate-900 text-white font-mono font-bold text-[11px] uppercase tracking-wider">
                                                    GROUP CONFIRMATION VOUCHER
                                                </span>
                                                <div className="font-mono text-xs font-bold text-slate-900 mt-1">
                                                    Group Ref: {booking.groupCode || `GRP-${booking.reservationNumber}`}
                                                </div>
                                                <div className="text-[10px] text-slate-500 mt-0.5">Date: {operatingSystemDate}</div>
                                                <div className="text-[10px] text-emerald-700 font-bold">Status: CONFIRMED</div>
                                            </div>
                                        </div>

                                        <div className="bg-sky-50/70 p-4 rounded-lg border border-sky-200 grid grid-cols-2 gap-4">
                                            <div className="space-y-1">
                                                <span className="text-[10px] uppercase font-bold text-sky-800 block">Organizer / Corporate Entity</span>
                                                <p className="text-sm font-bold text-slate-900">{booking.companyName || booking.guestName}</p>
                                                <p className="text-xs text-slate-700">Contact Person: {booking.guestName}</p>
                                                <p className="text-xs text-slate-700">Phone: {booking.phone || bookingAny.mobile || '-'}</p>
                                                <p className="text-xs text-slate-700">Email: {booking.email || '-'}</p>
                                            </div>
                                            <div className="space-y-1 text-right">
                                                <span className="text-[10px] uppercase font-bold text-sky-800 block">Group Stay Period</span>
                                                <p className="text-xs text-slate-800 font-medium">
                                                    Arrival: <span className="font-bold font-mono">{booking.arrivalDate || bookingAny.checkIn}</span> (14:00)
                                                </p>
                                                <p className="text-xs text-slate-800 font-medium">
                                                    Departure: <span className="font-bold font-mono">{booking.departureDate || bookingAny.checkOut}</span> (12:00)
                                                </p>
                                                <p className="text-xs text-slate-700">Duration: {origNights} Nights | Total Rooms: {groupFinancials.totalRooms}</p>
                                                <p className="text-xs text-slate-700 font-medium">Total Occupancy: {groupFinancials.totalPax} Guests</p>
                                            </div>
                                        </div>

                                        <div className="space-y-1.5">
                                            <div className="text-[11px] font-bold text-slate-900 uppercase tracking-wide">
                                                Consolidated Group Rooming & Allocation List
                                            </div>
                                            <table className="w-full text-xs border border-slate-200 rounded-lg overflow-hidden">
                                                <thead className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
                                                    <tr>
                                                        <th className="p-2 text-left w-14">Room #</th>
                                                        <th className="p-2 text-left">Room Category</th>
                                                        <th className="p-2 text-left">Rate Plan</th>
                                                        <th className="p-2 text-left">Assigned Guest</th>
                                                        <th className="p-2 text-center">Pax</th>
                                                        <th className="p-2 text-right">Daily Tariff</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-slate-100">
                                                    {groupFinancials.rooms.map((rm: any, idx: number) => (
                                                        <tr key={idx} className="hover:bg-slate-50/50">
                                                            <td className="p-2 font-mono font-bold text-blue-800">
                                                                {rm.roomNumber || `Unassigned (${idx + 1})`}
                                                            </td>
                                                            <td className="p-2 font-semibold text-slate-800">{rm.roomType}</td>
                                                            <td className="p-2 text-slate-600">{rm.ratePlan || 'Standard Rate'}</td>
                                                            <td className="p-2 font-medium text-slate-800">{rm.guestName || booking.guestName}</td>
                                                            <td className="p-2 text-center font-mono text-[11px]">{rm.effectivePax}</td>
                                                            <td className="p-2 text-right font-mono font-bold text-slate-900">
                                                                {currencySymbol} {rm.effectiveRate.toLocaleString()}
                                                            </td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>

                                        <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 text-[10px] text-slate-600 space-y-1 leading-relaxed">
                                            <p className="font-bold text-slate-700 uppercase">Group Check-In & Hotel Rules:</p>
                                            <p>1. Fast Check-in: Please present the Group Pre-Registration Sheet signed by the coordinator at reception.</p>
                                            <p>2. Buffet breakfast is included for registered guests at The Palm Restaurant (06:30 AM - 10:30 AM).</p>
                                            <p>3. Baggage handling and luggage tags will be coordinated at the concierge desk upon coach arrival.</p>
                                        </div>

                                        <div className="pt-8 flex justify-between items-end border-t border-slate-300">
                                            <div className="text-center w-48 border-t border-slate-500 pt-1.5 text-[10px] text-slate-600 font-semibold">
                                                Head of Reservations
                                            </div>
                                            <div className="text-center w-48 border-t border-slate-500 pt-1.5 text-[10px] text-slate-600 font-bold">
                                                Group Tour Leader / Escort
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {/* 6. GROUP PRE-REGISTRATION & ROOMING ARRIVAL LIST */}
                                {activePrintDoc === 'group_prereg' && (
                                    <div className="space-y-4">
                                        <div className="flex justify-between items-start border-b-2 border-slate-900 pb-4">
                                            <div>
                                                <h1 className="text-base font-black text-slate-900 tracking-tight font-serif uppercase">GRAND PALACE HOTEL & RESORT</h1>
                                                <p className="text-[10.5px] text-slate-600 mt-0.5">Plot 12, Road 45, Gulshan-2, Dhaka-1212, Bangladesh</p>
                                                <p className="text-[10px] text-slate-500">Front Office Operations | Express Group Check-In</p>
                                            </div>
                                            <div className="text-right">
                                                <span className="inline-block px-2.5 py-1 rounded bg-emerald-900 text-white font-mono font-bold text-[11px] uppercase tracking-wider">
                                                    GROUP PRE-REGISTRATION SHEET
                                                </span>
                                                <div className="font-mono text-xs font-bold text-slate-900 mt-1">
                                                    Group: {booking.groupCode || `GRP-${booking.reservationNumber}`}
                                                </div>
                                                <div className="text-[10px] text-slate-500 mt-0.5">Arrival Date: {booking.arrivalDate || bookingAny.checkIn}</div>
                                                <div className="text-[10px] text-emerald-800 font-bold font-mono">
                                                    {groupFinancials.totalRooms} Rooms | {groupFinancials.totalPax} Guests
                                                </div>
                                            </div>
                                        </div>

                                        <div className="bg-emerald-50/50 p-3 rounded-lg border border-emerald-200 flex justify-between items-center text-xs">
                                            <div>
                                                <span className="text-[10px] uppercase font-bold text-emerald-800 block">Group / Entity Name</span>
                                                <span className="font-bold text-slate-900 text-sm">{booking.companyName || booking.guestName}</span>
                                            </div>
                                            <div className="text-right">
                                                <span className="text-[10px] uppercase font-bold text-emerald-800 block">Tour Escort / Lead</span>
                                                <span className="font-semibold text-slate-800">{booking.guestName} ({booking.phone || bookingAny.mobile || '-'})</span>
                                            </div>
                                        </div>

                                        <div className="space-y-1.5">
                                            <div className="text-[10.5px] font-bold text-slate-900 uppercase tracking-wide flex justify-between items-center">
                                                <span>Fast Check-in Rooming & Signature List</span>
                                                <span className="text-[9.5px] text-slate-500 font-normal">All occupants must verify ID & sign below</span>
                                            </div>
                                            <table className="w-full text-xs border border-slate-300 rounded-lg overflow-hidden">
                                                <thead className="bg-slate-100 text-slate-800 font-bold border-b border-slate-300">
                                                    <tr>
                                                        <th className="p-2 text-center w-8">#</th>
                                                        <th className="p-2 text-center w-14">Room</th>
                                                        <th className="p-2 text-left">Room Category</th>
                                                        <th className="p-2 text-left">Guest Name</th>
                                                        <th className="p-2 text-center w-10">Pax</th>
                                                        <th className="p-2 text-left w-32">NID / Passport #</th>
                                                        <th className="p-2 text-left w-28">Mobile Contact</th>
                                                        <th className="p-2 text-center w-32">Guest Signature</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-slate-200">
                                                    {groupFinancials.rooms.map((rm: any, idx: number) => (
                                                        <tr key={idx} className="h-9">
                                                            <td className="p-1.5 text-center font-mono text-[11px] text-slate-500">{idx + 1}</td>
                                                            <td className="p-1.5 text-center font-mono font-bold text-blue-900 bg-blue-50/30">
                                                                {rm.roomNumber || `RM-${idx + 1}`}
                                                            </td>
                                                            <td className="p-1.5 font-medium text-slate-700">{rm.roomType}</td>
                                                            <td className="p-1.5 font-bold text-slate-900">{rm.guestName || booking.guestName}</td>
                                                            <td className="p-1.5 text-center font-mono text-[11px]">{rm.effectivePax}</td>
                                                            <td className="p-1.5 border-b border-dotted border-slate-300 text-slate-400 font-mono text-[10px]">
                                                                ________________
                                                            </td>
                                                            <td className="p-1.5 border-b border-dotted border-slate-300 text-slate-400 font-mono text-[10px]">
                                                                ________________
                                                            </td>
                                                            <td className="p-1.5 border-b border-dotted border-slate-400 text-center text-slate-300">
                                                                X
                                                            </td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>

                                        <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 text-[10px] text-slate-600 leading-relaxed">
                                            <p className="font-bold text-slate-700 uppercase">Coordinator Declaration & Room Handover:</p>
                                            <p>
                                                I, the undersigned Group Leader / Organizer, confirm receipt of keycards for the above-listed {groupFinancials.totalRooms} rooms. I undertake responsibility for adhering to hotel safety policies, checkout schedule (12:00 PM), and incidental settlements.
                                            </p>
                                        </div>

                                        <div className="pt-8 flex justify-between items-end border-t border-slate-300">
                                            <div className="text-center w-48 border-t border-slate-500 pt-1.5 text-[10px] text-slate-600 font-semibold">
                                                Duty Manager / Front Office
                                            </div>
                                            <div className="text-center w-48 border-t border-slate-500 pt-1.5 text-[10px] text-slate-600 font-bold">
                                                Group Tour Leader Signature
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {/* 7. BATCH PRINT ALL INDIVIDUAL GRCs */}
                                {activePrintDoc === 'batch_grc' && (
                                    <div className="space-y-6">
                                        {groupFinancials.rooms.map((rm: any, rIdx: number) => {
                                            const rmNum = rm.roomNumber || `Unassigned (${rIdx + 1})`;
                                            const rmGuest = rm.guestName || booking.guestName;
                                            const rmRes = rm.displayResNo || `${booking.reservationNumber}-${String(rIdx + 1).padStart(2, '0')}`;
                                            return (
                                                <div key={rIdx} className="space-y-4">
                                                    <div className="flex justify-between items-start border-b-2 border-slate-900 pb-4">
                                                        <div>
                                                            <h1 className="text-base font-black text-slate-900 tracking-tight font-serif uppercase">GRAND PALACE HOTEL & RESORT</h1>
                                                            <p className="text-[10.5px] text-slate-600 mt-0.5">Plot 12, Road 45, Gulshan-2, Dhaka-1212, Bangladesh</p>
                                                            <p className="text-[10px] text-slate-500 font-mono">BIN / VAT Registration: 1234567890123</p>
                                                        </div>
                                                        <div className="text-right">
                                                            <span className="inline-block px-2.5 py-1 rounded bg-slate-900 text-white font-mono font-bold text-[11px] uppercase tracking-wider">
                                                                GUEST REGISTRATION CARD (GRC)
                                                            </span>
                                                            <div className="font-mono text-xs font-bold text-slate-900 mt-1">Ref: {rmRes}</div>
                                                            <div className="text-[10px] text-purple-700 font-semibold font-mono">
                                                                Group Room {rIdx + 1} of {groupFinancials.totalRooms}
                                                            </div>
                                                        </div>
                                                    </div>

                                                    <div className="grid grid-cols-2 gap-4 bg-slate-50 p-4 rounded-lg border border-slate-200">
                                                        <div className="space-y-1">
                                                            <span className="text-[10px] uppercase font-bold text-slate-500 block">Guest Personal Details</span>
                                                            <p className="text-sm font-bold text-slate-900">{rmGuest}</p>
                                                            <p className="text-xs text-slate-700">Group Ref: {booking.groupCode || booking.reservationNumber}</p>
                                                            <p className="text-xs text-slate-700">Pax: {rm.effectivePax} Guest(s)</p>
                                                            <p className="text-xs text-slate-700">Phone: _______________________</p>
                                                        </div>
                                                        <div className="space-y-1">
                                                            <span className="text-[10px] uppercase font-bold text-slate-500 block">Stay Allocation</span>
                                                            <p className="text-sm font-bold text-blue-700 font-mono">Room {rmNum} - {rm.roomType}</p>
                                                            <p className="text-xs text-slate-700">Rate Plan: {rm.ratePlan || 'Standard Rate'}</p>
                                                            <p className="text-xs text-slate-700 font-medium">
                                                                Check-In: <span className="font-bold">{booking.arrivalDate || bookingAny.checkIn}</span> (14:00)
                                                            </p>
                                                            <p className="text-xs text-slate-700 font-medium">
                                                                Check-Out: <span className="font-bold">{booking.departureDate || bookingAny.checkOut}</span> (12:00)
                                                            </p>
                                                        </div>
                                                    </div>

                                                    <div className="bg-slate-50/70 p-3 rounded-lg border border-slate-200 text-[10px] text-slate-600 space-y-1 leading-relaxed">
                                                        <p className="font-bold text-slate-700 uppercase">Terms, Conditions & Hotel Regulations:</p>
                                                        <p>1. Check-out time is 12:00 PM. Late check-out is subject to room availability and standard tariff.</p>
                                                        <p>2. Safe deposit lockers are provided in all rooms. The hotel does not accept liability for money or valuables left in rooms.</p>
                                                        <p>3. I certify that all personal and identification details stated above are accurate and valid.</p>
                                                    </div>

                                                    <div className="pt-8 flex justify-between items-end border-t border-slate-300">
                                                        <div className="text-center w-48 border-t border-slate-500 pt-1.5 text-[10px] text-slate-600 font-semibold">
                                                            Front Desk Receptionist
                                                        </div>
                                                        <div className="text-center w-48 border-t border-slate-500 pt-1.5 text-[10px] text-slate-600 font-bold">
                                                            Guest Signature
                                                        </div>
                                                    </div>

                                                    {/* Page break element for batch print */}
                                                    {rIdx < groupFinancials.rooms.length - 1 && (
                                                        <>
                                                            <div className="hidden print:block page-break" style={{ pageBreakAfter: 'always', breakAfter: 'page', height: 0 }} />
                                                            <div className="block print:hidden my-6 border-b-2 border-dashed border-slate-300 relative text-center">
                                                                <span className="bg-slate-100 px-3 text-[10px] font-mono text-slate-500 uppercase">
                                                                    - Page Break for Room {rIdx + 1} of {groupFinancials.totalRooms} -
                                                                </span>
                                                            </div>
                                                        </>
                                                    )}
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}

                            </div>
                        </div>
                    </div>
                </div>
            )}
            {/* Digital e-Registration Card Modal (Yanolja PMS) */}
            <DigitalRegCardModal
                isOpen={isRegCardModalOpen}
                onClose={() => setIsRegCardModalOpen(false)}
                booking={booking}
                onSuccess={() => {
                    if (booking) {
                        (booking as any).registrationCardSigned = true;
                    }
                }}
            />
        </div>
    </div>,
    document.body
);
};

export default ReservationActionDrawer;
