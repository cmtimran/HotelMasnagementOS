import React, { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import {
    X,
    Users,
    Edit3,
    Calendar,
    ChevronDown,
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
    CheckCircle2,
    RotateCcw,
    Mail,
    MessageSquare,
    MessageCircle,
    Tag,
    Send,
    Undo2,
    Clock,
    LogOut,
    LogIn,
    Wine,
    Moon,
    Receipt,
    BedDouble,
    Globe,
    Percent,
    Camera,
    Phone,
    Bell,
    Sparkles,
    AlertTriangle,
    Scissors,
    GitMerge,
    Minus,
    Landmark,
    Smartphone
} from 'lucide-react';
import { getApiBaseUrl, getActivePropertyId } from '../../utils/apiUrl';
import { useActiveCurrency } from '../../utils/currencyUtils';
import type { AmendBookingData } from './AmendStayModal';
import { calculateReservationTaxes } from '../../utils/taxCalculationEngine';
import {
    resolveDynamicPropertyId,
    getPropertyPaymentConfig,
    getPaymentMethodsForOutlet,
    calculateMdrCommission,
    detectPaymentCategory,
    getDynamicTaxVatRate,
    getDynamicExpenseGlCode,
    getDynamicMasterBanks,
    type PaymentMethodItem,
    type PropertyPaymentConfig
} from '../../utils/propertyPaymentMethodEngine';
import {
    getStandardDailyRateForRoom,
    resolveReservationDailyBaseRate,
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
    syncRatePlansAndPackagesFromDB,
    sanitizeRatePlanName,
    broadcastPMSEvent
} from '../../utils/roomInventoryEngine';
import { toast } from '../../context/ToastContext';
import { classifyReservation } from '../../utils/reservationNumbering';

import { DrawerFolioOperations } from '../folio/DrawerFolioOperations';
import { DigitalRegCardModal } from './DigitalRegCardModal';
import { PassportIdScannerModal } from './PassportIdScannerModal';
import { KeycardEncoderModal } from './KeycardEncoderModal';
import { MinibarAuditModal } from './MinibarAuditModal';

export type DrawerMode =
    | 'overview'
    | 'folio'
    | 'amend'
    | 'move'
    | 'swap'
    | 'keycard'
    | 'minibar'
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
    | 'tax_exemption'
    | 'scan_id'
    | 'send_confirmation';

export interface MoveStaySegment {
    id: string;
    fromDate: string;
    toDate: string;
    roomType: string;
    roomNumber: string;
    dailyRate?: number;
    nights?: number;
}

export interface ReservationActionDrawerProps {
    isOpen: boolean;
    onClose: () => void;
    booking: AmendBookingData | null;
    initialMode?: DrawerMode;
    allRooms?: Array<{ id?: string; roomNumber: string; type: string; status: string }>;
    initialTargetArrival?: string;
    initialTargetDeparture?: string;
    initialTargetNights?: number;
    initialTargetRoomNumber?: string;
    // Core PMS Action Handlers
    onSaveAmendStay?: (bookingId: string, newDeparture: string, newNights: number, newAdults?: number, newChildren?: number, notificationConfig?: any, newArrival?: string, customSegments?: any[]) => void;
    onSaveRoomMove?: (
        bookingId: string,
        newRoomNumber: string,
        newFromDate: string,
        newToDate: string,
        newRoomType?: string,
        newRatePlan?: string,
        upgradeAdjustment?: { mode: 'complimentary' | 'charge'; amount: number },
        notificationConfig?: any,
        multiSegments?: MoveStaySegment[],
        overrideRoomRate?: boolean
    ) => void;
    onSavePayment?: (bookingId: string, method: string, amount: number, remarks: string) => void;
    onSaveRoomSplit?: (bookingId: string, targetRoomNumber: string, fromDate?: string, toDate?: string, customSegments?: any[]) => void;
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
    initialTargetArrival,
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
    const { currencySymbol } = useActiveCurrency();

    // Strict PMS Filter: Physical rooms only (Never allow virtual UNASSIGNED buffer rooms in room moves, swaps, or assignments)
    const validRooms = useMemo(() => {
        return (allRooms || [])
            .filter(r => !isRoomUnassigned(r.roomNumber) && !String(r.type || '').toLowerCase().includes('buffer') && !String(r.roomNumber || '').toLowerCase().includes('unassign'));
    }, [allRooms]);

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
    const [splitViewMode, setSplitViewMode] = useState<'total' | 'segment'>('total');
    // Guest Communication & Notification States
    const [notifSendEmail, setNotifSendEmail] = useState<boolean>(true);
    const [notifSendSms, setNotifSendSms] = useState<boolean>(true);
    const [notifSendWhatsApp, setNotifSendWhatsApp] = useState<boolean>(false);
    const [notifSilentUpdate, setNotifSilentUpdate] = useState<boolean>(false);
    const [notifReason, setNotifReason] = useState<string>('Guest Requested Extension');
    const [notifCustomEmail, setNotifCustomEmail] = useState<string>('');
    const [notifCustomPhone, setNotifCustomPhone] = useState<string>('');
    const [arrivalDate, setArrivalDate] = useState<string>('');
    const [departureDate, setDepartureDate] = useState<string>('');
    const [nights, setNights] = useState<number>(1);
    const [amendAdults, setAmendAdults] = useState<number>(2);
    const [amendChildren, setAmendChildren] = useState<number>(0);

    // 2. Room Move Form States (Enterprise Split Stay Supported)
    const [moveSelectedRoom, setMoveSelectedRoom] = useState<string>('');
    const [moveFromDate, setMoveFromDate] = useState<string>('');
    const [moveToDate, setToDate] = useState<string>('');
    const [moveRoomType, setMoveRoomType] = useState<string>('All');
    const [moveRateType, setMoveRateType] = useState<string>('BAR');
    const [upgradeBillingMode, setUpgradeBillingMode] = useState<'complimentary' | 'charge'>('complimentary');
    const [moveSegments, setMoveSegments] = useState<MoveStaySegment[]>([]);
    const [overrideRoomRate, setOverrideRoomRate] = useState<boolean>(false);

    // 3. Add Payment Form States (Full Dynamic Tender Architecture)
    const activePropertyId = useMemo(() => resolveDynamicPropertyId(), []);
    const [paymentConfig, setPaymentConfig] = useState<PropertyPaymentConfig>(() => getPropertyPaymentConfig(activePropertyId));
    const [frontOfficePaymentMethods, setFrontOfficePaymentMethods] = useState<PaymentMethodItem[]>(() => getPaymentMethodsForOutlet(activePropertyId, 'FRONT_OFFICE'));

    useEffect(() => {
        const handleSync = () => {
            try {
                setPaymentConfig(getPropertyPaymentConfig(activePropertyId));
                setFrontOfficePaymentMethods(getPaymentMethodsForOutlet(activePropertyId, 'FRONT_OFFICE'));
            } catch {}
        };
        window.addEventListener('hotel_payment_methods_updated', handleSync);
        return () => window.removeEventListener('hotel_payment_methods_updated', handleSync);
    }, [activePropertyId]);

    const [paymentFolio, setPaymentFolio] = useState<string>('');
    const [paymentMethod, setPaymentMethod] = useState<string>('Cash');
    const [paymentAmount, setPaymentAmount] = useState<number>(0);
    const [paymentRemarks, setPaymentRemarks] = useState<string>('');
    const [paymentAcquiringBank, setPaymentAcquiringBank] = useState<string>('');
    const [paymentPosTerminalId, setPaymentPosTerminalId] = useState<string>('');
    const [paymentReferenceCode, setPaymentReferenceCode] = useState<string>('');

    const matchedPaymentMethod = useMemo(() => {
        return frontOfficePaymentMethods.find(m => m.displayName === paymentMethod || m.subType === paymentMethod);
    }, [frontOfficePaymentMethods, paymentMethod]);

    const activePaymentCategory = useMemo(() => {
        return detectPaymentCategory(paymentMethod, frontOfficePaymentMethods);
    }, [paymentMethod, frontOfficePaymentMethods]);

    const drawerDynamicVatRate = useMemo(() => getDynamicTaxVatRate(), []);
    const drawerDynamicExpenseGl = useMemo(() => getDynamicExpenseGlCode('BANK_CHARGES'), []);

    const attachedAcquiringBanks = useMemo(() => {
        if (matchedPaymentMethod?.acquiringBanks && matchedPaymentMethod.acquiringBanks.length > 0) {
            return matchedPaymentMethod.acquiringBanks;
        }
        const availableBanks = (paymentConfig.registeredBanks && paymentConfig.registeredBanks.length > 0)
            ? paymentConfig.registeredBanks
            : getDynamicMasterBanks(activePropertyId);

        if (availableBanks.length > 0) {
            return availableBanks.map(b => ({
                id: `dyn-${b.id}`,
                bankName: b.bankName,
                commissionRule: {
                    commissionRatePercent: matchedPaymentMethod?.defaultCommissionRate ?? 0,
                    flatFeeBdt: 0,
                    vatOnCommissionPercent: drawerDynamicVatRate,
                    feeAbsorbedBy: 'HOTEL' as const,
                    expenseGlCode: b.linkedGlCode || drawerDynamicExpenseGl
                },
                settlementAccount: b.accountTitle ? `${b.accountTitle} (${b.accountNumber})` : b.accountNumber,
                enabled: true
            }));
        }
        return [];
    }, [matchedPaymentMethod, paymentConfig.registeredBanks, activePropertyId, drawerDynamicVatRate, drawerDynamicExpenseGl]);

    useEffect(() => {
        if (attachedAcquiringBanks.length > 0 && !paymentAcquiringBank) {
            setPaymentAcquiringBank(attachedAcquiringBanks[0].bankName);
        }
    }, [attachedAcquiringBanks, paymentAcquiringBank]);

    const availablePosTerminals = useMemo(() => {
        return (paymentConfig.posTerminals || []).filter(t =>
            t.status === 'Active' &&
            (!paymentAcquiringBank || t.bankName.toLowerCase() === paymentAcquiringBank.toLowerCase())
        );
    }, [paymentConfig.posTerminals, paymentAcquiringBank]);

    const drawerMdrCalc = useMemo(() => {
        const amt = Number(paymentAmount) || 0;
        if (amt <= 0) return null;
        const bankObj = attachedAcquiringBanks.find(b => b.bankName === paymentAcquiringBank) || attachedAcquiringBanks[0];
        const rule = bankObj?.commissionRule || (matchedPaymentMethod?.defaultCommissionRate !== undefined ? {
            commissionRatePercent: matchedPaymentMethod.defaultCommissionRate,
            flatFeeBdt: 0,
            vatOnCommissionPercent: drawerDynamicVatRate,
            feeAbsorbedBy: 'HOTEL' as const,
            expenseGlCode: drawerDynamicExpenseGl
        } : null);
        return rule ? calculateMdrCommission(amt, rule) : null;
    }, [paymentAmount, attachedAcquiringBanks, paymentAcquiringBank, matchedPaymentMethod, drawerDynamicVatRate, drawerDynamicExpenseGl]);

    // 4. Room Split & Split Stay Journey States
    const [splitRoom, setSplitRoom] = useState<string>('');
    const [splitFromDate, setSplitFromDate] = useState<string>('');
    const [splitToDate, setSplitToDate] = useState<string>('');
    const [splitStaySegments, setSplitStaySegments] = useState<MoveStaySegment[]>([]);

    // 5. Stop Room Move Form States (HotelManagementOS Lock & Move Guard)
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

    // 5d. Passport & ID Card Auto-Scanner Modal State
    const [isScannerOpen, setIsScannerOpen] = useState(false);

    // 5e. Keycard Hardware Encoder Modal State
    const [isKeycardModalOpen, setIsKeycardModalOpen] = useState(false);

    // 5f. In-Room Minibar Billing Modal State
    const [isMinibarModalOpen, setIsMinibarModalOpen] = useState(false);

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

    // 14. Send Confirmation Voucher Form States
    const [confirmSendPhone, setConfirmSendPhone] = useState<string>('');
    const [confirmSendEmail, setConfirmSendEmail] = useState<string>('');
    const [confirmChannelWhatsApp, setConfirmChannelWhatsApp] = useState<boolean>(true);
    const [confirmChannelEmail, setConfirmChannelEmail] = useState<boolean>(true);
    const [showManualContactEntry, setShowManualContactEntry] = useState<boolean>(false);
    const [showAddPhoneInput, setShowAddPhoneInput] = useState<boolean>(false);
    const [showAddEmailInput, setShowAddEmailInput] = useState<boolean>(false);
    const [isSendingConfirmation, setIsSendingConfirmation] = useState<boolean>(false);
    const [lastDispatchedInfo, setLastDispatchedInfo] = useState<{ time: string; channels: string } | null>(null);

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
            const arr = initialTargetArrival || booking.arrivalDate || '2026-07-01';
            const dep = initialTargetDeparture || booking.departureDate || '2026-07-03';
            const n = initialTargetNights || booking.nights || 2;
            const daily = resolveReservationDailyBaseRate(booking, booking.roomNumber);
            const total = booking.totalAmount !== undefined ? booking.totalAmount : (n * daily);
            const due = booking.dueAmount !== undefined
                ? booking.dueAmount
                : Math.max(0, total - (booking.paidAmount || 0));

            setArrivalDate(arr);
            setDepartureDate(dep);
            setNights(n);
            setAmendAdults(booking.adults ?? 2);
            setAmendChildren(booking.children ?? 0);
            setAmendSelectedRoom(true);
            const cleanPhoneVal = (val?: any): string => {
                if (!val) return '';
                const s = String(val).trim();
                if (s === '-' || s.toLowerCase() === 'null' || s.toLowerCase() === 'undefined') return '';
                return s;
            };
            const cleanEmailVal = (val?: any): string => {
                if (!val) return '';
                const s = String(val).trim();
                if (s === '-' || s.toLowerCase() === 'null' || s.toLowerCase() === 'undefined') return '';
                return s;
            };

            let gEmail = cleanEmailVal((booking as any)?.guestEmail || (booking as any)?.email || (booking as any)?.guest_email);
            let gPhone = cleanPhoneVal((booking as any)?.guestPhone || (booking as any)?.phone || (booking as any)?.mobile || (booking as any)?.guest_phone);
            setNotifCustomEmail(gEmail);
            setNotifCustomPhone(gPhone);
            setNotifSendEmail(Boolean(gEmail));
            setNotifSendSms(Boolean(gPhone));
            setNotifSendWhatsApp(Boolean(gPhone));
            setNotifSilentUpdate(false);

            // Hydrate confirmation voucher state (100% dynamic from reservation record)
            setConfirmSendPhone(gPhone);
            setConfirmSendEmail(gEmail);
            setConfirmChannelWhatsApp(Boolean(gPhone));
            setConfirmChannelEmail(Boolean(gEmail));
            setShowManualContactEntry(false);
            setShowAddPhoneInput(false);
            setShowAddEmailInput(false);
            setLastDispatchedInfo(null);

            const isUnassigned = isRoomUnassigned(booking.roomNumber);
            const targetRoomObj = validRooms.find(r => String(r.roomNumber) === String(booking.roomNumber));
            const bookedType = (booking.roomType && !booking.roomType.toLowerCase().includes('unassigned') && !booking.roomType.toLowerCase().includes('buffer'))
                ? booking.roomType
                : 'Deluxe Suite';

            const targetRoomType = isUnassigned ? bookedType : (targetRoomObj?.type || bookedType || 'All');
            setMoveRoomType(targetRoomType);

            if (isUnassigned) {
                const moveAvail = getAvailableRoomsForStay(arr, dep, undefined, {
                    excludeReservationId: booking.reservationNumber || booking.id
                });
                const firstRealAvail = validRooms.find(r => 
                    (r.type === targetRoomType || targetRoomType === 'All') &&
                    moveAvail.allRoomsStatus.find(s => String(s.room.number) === String(r.roomNumber))?.isAvailable
                ) || validRooms.find(r => 
                    moveAvail.allRoomsStatus.find(s => String(s.room.number) === String(r.roomNumber))?.isAvailable
                ) || validRooms[0];

                setMoveSelectedRoom(firstRealAvail ? firstRealAvail.roomNumber : '');
            } else {
                const initialTargetRoom = initialTargetRoomNumber || booking.roomNumber;
                setMoveSelectedRoom(initialTargetRoom);
            }
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
            let validatedMoveDep = dep;
            if (!validatedMoveDep || validatedMoveDep <= effectiveMoveStart) {
                const d = new Date(effectiveMoveStart);
                d.setDate(d.getDate() + Math.max(1, n));
                validatedMoveDep = d.toISOString().split('T')[0];
            }
            setMoveFromDate(effectiveMoveStart);
            setToDate(validatedMoveDep);

            // Initialize Multi-Segment Stay (Split Stay Pattern)
            const initialTargetRoomVal = initialTargetRoomNumber || booking.roomNumber || '';

            const hasMultiRooms = Array.isArray(booking.roomsList) && booking.roomsList.length > 1;
            if (hasMultiRooms) {
                const mappedSegs: MoveStaySegment[] = (booking.roomsList || []).map((r: any, idx: number) => ({
                    id: r.id || `seg-${Date.now()}-${idx}`,
                    fromDate: r.checkInDate || r.fromDate || effectiveMoveStart,
                    toDate: r.checkOutDate || r.toDate || validatedMoveDep,
                    roomType: r.roomType || booking.roomType || 'Deluxe Suite',
                    roomNumber: String(r.roomNumber || booking.roomNumber),
                    dailyRate: r.dailyRate || resolveReservationDailyBaseRate(booking, r.roomNumber),
                    nights: r.nights || 1
                }));
                setMoveSegments(mappedSegs);
            } else {
                setMoveSegments([
                    {
                        id: `seg-${Date.now()}-0`,
                        fromDate: effectiveMoveStart,
                        toDate: validatedMoveDep,
                        roomType: targetRoomType !== 'All' ? targetRoomType : (booking.roomType || 'Deluxe Suite'),
                        roomNumber: initialTargetRoomVal,
                        dailyRate: resolveReservationDailyBaseRate(booking, initialTargetRoomVal),
                        nights: Math.max(1, n)
                    }
                ]);
            }
            setOverrideRoomRate(false);

            setPaymentFolio(`${booking.guestName} - ${booking.folioNumber || `FOL-${booking.reservationNumber}-1`}`);
            setPaymentMethod('Cash');
            setPaymentAmount(due > 0 ? due : total);
            setPaymentRemarks('');

            setSplitRoom(booking.roomNumber);
            setSplitFromDate(arr);
            setSplitToDate(dep);

            const allStored = getAllStoredReservations();
            const storedMatch = allStored.find(r => r.reservationNumber === booking.reservationNumber);
            const candidateRoomsList = (booking.roomsList && booking.roomsList.length > 1)
                ? booking.roomsList
                : (storedMatch?.roomsList && storedMatch.roomsList.length > 1)
                    ? storedMatch.roomsList
                    : null;

            if (candidateRoomsList && candidateRoomsList.length > 0) {
                const sorted = [...candidateRoomsList].sort((a: any, b: any) => {
                    const da = a.checkInDate || a.checkIn || a.fromDate || '';
                    const db = b.checkInDate || b.checkIn || b.fromDate || '';
                    return da.localeCompare(db);
                });
                setSplitStaySegments(sorted.map((r: any, idx: number) => {
                    const sIn = r.checkInDate || r.checkIn || r.fromDate || arr;
                    const sOut = r.checkOutDate || r.checkOut || r.toDate || dep;
                    const sNights = Number(r.nights) || Math.max(1, Math.round((new Date(sOut).getTime() - new Date(sIn).getTime()) / 86400000));
                    const sRm = String(r.roomNumber || booking.roomNumber);
                    const sType = r.roomType || booking.roomType || 'Superior King Room';
                    return {
                        id: r.id ? String(r.id) : `split-seg-${Date.now()}-${idx}`,
                        fromDate: sIn,
                        toDate: sOut,
                        roomNumber: sRm,
                        roomType: sType,
                        nights: sNights,
                        dailyRate: Number(r.rate || r.price || resolveReservationDailyBaseRate(booking, sRm))
                    };
                }));
            } else {
                setSplitStaySegments([{
                    id: `split-seg-${Date.now()}-0`,
                    fromDate: arr,
                    toDate: dep,
                    roomNumber: String(booking.roomNumber),
                    roomType: booking.roomType || 'Superior King Room',
                    nights: Math.max(1, n),
                    dailyRate: resolveReservationDailyBaseRate(booking, booking.roomNumber)
                }]);
            }

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
    }, [booking, initialTargetArrival, initialTargetDeparture, initialTargetNights, initialTargetRoomNumber]);

    // Resolve all room bookings associated with this group or multi-room reservation
    const resolvedGroupRooms = useMemo(() => {
        if (!booking) return [];
        if (booking.groupRoomsList && booking.groupRoomsList.length > 0) {
            return booking.groupRoomsList;
        }

        // Check if this is a Split Stay (single guest moving between rooms across sequential dates)
        const hasMultipleRooms = (booking.roomsList && booking.roomsList.length > 1) || (booking.groupRoomsList && booking.groupRoomsList.length > 1);
        const isSplitStayRes = Boolean(
            !booking.isGroup &&
            !booking.groupCode &&
            hasMultipleRooms &&
            (
                Boolean((booking as any).isSplitStay) ||
                (booking.roomsList && booking.roomsList.length > 1 && booking.roomsList.some((rm: any) => {
                    const first = booking.roomsList![0];
                    const rmIn = rm.checkInDate || rm.checkIn;
                    const rmOut = rm.checkOutDate || rm.checkOut;
                    const fIn = first.checkInDate || first.checkIn;
                    const fOut = first.checkOutDate || first.checkOut;
                    return (rmIn && fIn && rmIn !== fIn) || (rmOut && fOut && rmOut !== fOut);
                })) ||
                (booking.groupRoomsList && booking.groupRoomsList.length > 1 && booking.groupRoomsList.some((rm: any) => {
                    const first = booking.groupRoomsList![0];
                    const rmIn = rm.checkIn || rm.checkInDate;
                    const rmOut = rm.checkOut || rm.checkOutDate;
                    const fIn = first.checkIn || first.checkInDate;
                    const fOut = first.checkOut || first.checkOutDate;
                    return (rmIn && fIn && rmIn !== fIn) || (rmOut && fOut && rmOut !== fOut);
                }))
            )
        );

        // Special case: Interconnecting Suite with component rooms
        const isConn = !isSplitStayRes && Boolean(
            booking.isConnectingSuite ||
            (booking.roomType && (booking.roomType.toLowerCase().includes('connecting') || booking.roomType.toLowerCase().includes('interconnecting'))) ||
            (typeof booking.roomNumber === 'string' && booking.roomNumber.includes('+'))
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
                ratePlan: sanitizeRatePlanName(booking.ratePlan, 'Best Available Rate (BAR)'),
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
                            ratePlan: sanitizeRatePlanName(rm.ratePlan || mr.ratePlan, 'Best Available Rate (BAR)'),
                            status: rm.status || mr.status,
                            isPrimary: mIdx === 0 && rIdx === 0,
                            registrationNumber: rm.registrationNumber || mr.registrationNumber,
                            folioNumber: rm.folioNumber || mr.folioNumber
                        }));
                    }
                    return [{
                        roomNumber: mr.roomNumber,
                        roomType: mr.roomType,
                        ratePlan: sanitizeRatePlanName(mr.ratePlan, 'Best Available Rate (BAR)'),
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
            const isSplitStay = classifyReservation((booking as any) || {}) === 'SPLIT_STAY';
            return booking.roomsList.map((rm: any, idx: number) => ({
                ...rm,
                reservationNumber: isSplitStay ? booking.reservationNumber : (rm.subBookingNumber || `${booking.reservationNumber}-${String(idx + 1).padStart(2, '0')}`),
                subBookingNumber: isSplitStay ? `${booking.reservationNumber}-L${idx + 1}` : (rm.subBookingNumber || `${booking.reservationNumber}-${String(idx + 1).padStart(2, '0')}`),
                guestName: rm.guestName || booking.guestName,
                ratePlan: sanitizeRatePlanName(rm.ratePlan || booking.ratePlan, 'Best Available Rate (BAR)'),
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
            ratePlan: sanitizeRatePlanName(booking.ratePlan, 'Best Available Rate (BAR)'),
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

    // Dynamic Room Types available for selection (excludes internal unassigned buffer rooms)
    const dynamicRoomTypes = useMemo(() => {
        const listFromRooms = Array.from(new Set(validRooms.map(r => r.type).filter(Boolean)));
        const listFromEngine = getDynamicRoomTypes().map(t => t.name).filter(Boolean);
        const combined = Array.from(new Set([...listFromRooms, ...listFromEngine]))
            .filter(t => !t.toLowerCase().includes('buffer') && !t.toLowerCase().includes('unassigned'));
        return combined.length > 0 ? combined : ['Deluxe Suite'];
    }, [validRooms]);

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
        const isChannelLeak = (str?: string) => {
            if (!str) return false;
            const s = str.toLowerCase().trim();
            return ['whatsapp', 'booking_com', 'booking.com', 'agoda', 'airbnb', 'expedia', 'direct', 'front desk', 'staypulse', 'staypulse ai', 'ota', 'walk-in', 'walk in'].includes(s);
        };
        if (currentPlan && !isChannelLeak(currentPlan) && currentPlan !== 'Direct' && currentPlan !== 'Summer Vacation') {
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
        const currentRoomObj = validRooms.find(r => String(r.roomNumber) === String(booking.roomNumber));
        const currentRoomType = booking.roomType || currentRoomObj?.type || 'Standard';
        const targetRoomObj = validRooms.find(r => String(r.roomNumber) === String(moveSelectedRoom));
        const targetRoomType = targetRoomObj?.type || (moveRoomType !== 'All' ? moveRoomType : currentRoomType);

        const isDifferentRoom = String(moveSelectedRoom) !== String(booking.roomNumber);
        const isDifferentCategory = targetRoomType !== currentRoomType;

        const currentDailyRate = resolveReservationDailyBaseRate(booking, booking.roomNumber);
        const currentRackRate = getStandardDailyRateForRoom(booking.roomNumber, currentRoomType);
        const targetRackRate = getStandardDailyRateForRoom(moveSelectedRoom, targetRoomType);

        // If target room is in the same category or target is the same room, rate stays identical
        const targetDailyRate = !isDifferentCategory
            ? currentDailyRate
            : targetRackRate;

        const rawDailyDiff = !isDifferentCategory
            ? 0
            : (targetRackRate - (currentRackRate > 0 ? currentRackRate : currentDailyRate));
        const dailyDiff = Math.abs(rawDailyDiff);

        const stayNights = Math.max(1, Math.round((new Date(moveToDate).getTime() - new Date(moveFromDate).getTime()) / 86400000) || (booking.nights || 1));
        const totalDiff = dailyDiff * stayNights;

        // Smart Category Hierarchy Check (Suite > Executive > Deluxe > Superior > Standard)
        const isHigherCategory = (() => {
            if (rawDailyDiff > 0) return true;
            const normTarget = targetRoomType.toLowerCase();
            const normCurrent = currentRoomType.toLowerCase();
            if (normTarget.includes('suite') && !normCurrent.includes('suite')) return true;
            if (normTarget.includes('executive') && !normCurrent.includes('executive')) return true;
            if (normTarget.includes('deluxe') && (normCurrent.includes('standard') || normCurrent.includes('single'))) return true;
            return false;
        })();

        const isUpgrade = isDifferentRoom && (isHigherCategory || (isDifferentCategory && rawDailyDiff >= 0));
        const isDowngrade = isDifferentRoom && isDifferentCategory && !isHigherCategory && rawDailyDiff < 0;
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
    const stayClassification = useMemo(() => {
        return classifyReservation((booking as any) || {});
    }, [booking]);
    const isSplitStay = stayClassification === 'SPLIT_STAY';

    const isConnectingSuite = !isSplitStay && Boolean(
        booking?.isConnectingSuite ||
        (booking?.roomType && (booking.roomType.toLowerCase().includes('connecting') || booking.roomType.toLowerCase().includes('interconnecting'))) ||
        (typeof booking?.roomNumber === 'string' && booking.roomNumber.includes('+'))
    );

    // Dynamic Status-Driven Categorized Options List (Enterprise PMS Standard)
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
            groups.push({
                title: 'Guest Communications',
                items: [
                    { key: 'send_confirmation', label: 'Send Confirmation / Folio Voucher', icon: Send, badge: 'WhatsApp / Email', badgeColor: 'bg-emerald-100 text-emerald-800 font-bold' }
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
                title: 'Guest Communications',
                items: [
                    { key: 'send_confirmation', label: 'Send Cancellation / Voucher Copy', icon: Send, badge: 'WhatsApp / Email', badgeColor: 'bg-emerald-100 text-emerald-800 font-bold' }
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
                    { key: 'keycard', label: 'Issue / Encode Keycard', icon: Key, badge: 'RFID', badgeColor: 'bg-amber-100 text-amber-800' },
                    { key: 'minibar', label: 'Minibar Audit & Billing', icon: Wine, badge: 'In-Room', badgeColor: 'bg-orange-100 text-orange-800' },
                    { key: 'swap', label: 'Swap Rooms (Atomic)', icon: ArrowRightLeft, badge: 'Atomic', badgeColor: 'bg-emerald-100 text-emerald-700' },
                    { key: 'split', label: 'Room Split (Multi-Room)', icon: GitFork, badge: 'Split Stay', badgeColor: 'bg-purple-100 text-purple-700' },
                    { key: 'stop_move', label: 'Stop Room Move (Lock)', icon: Hand, badge: (booking as any)?.stopRoomMove ? 'Locked' : undefined, badgeColor: 'bg-amber-100 text-amber-800' },
                    { key: 'scan_id', label: 'Scan Passport / ID (Fast Profile)', icon: Camera, badge: 'Fast ID', badgeColor: 'bg-emerald-100 text-emerald-800' },
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

            groups.push({
                title: 'Guest Communications',
                items: [
                    { key: 'send_confirmation', label: 'Send Confirmation Voucher', icon: Send, badge: 'WhatsApp / Email', badgeColor: 'bg-emerald-100 text-emerald-800 font-bold' }
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
                    { key: 'scan_id', label: 'Scan Passport / ID (Fast Profile)', icon: Camera, badge: 'Fast ID', badgeColor: 'bg-emerald-100 text-emerald-800' },
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
                title: 'Guest Communications',
                items: [
                    { key: 'send_confirmation', label: 'Send Hold & Booking Voucher', icon: Send, badge: 'WhatsApp / Email', badgeColor: 'bg-emerald-100 text-emerald-800 font-bold' }
                ]
            });

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
            title: 'Guest Communications',
            items: [
                { key: 'send_confirmation', label: 'Send Confirmation Voucher', icon: Send, badge: 'WhatsApp / Email', badgeColor: 'bg-emerald-100 text-emerald-800 font-bold' }
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
                { key: 'scan_id', label: 'Scan Passport / ID (Fast Profile)', icon: Camera, badge: 'Fast ID', badgeColor: 'bg-emerald-100 text-emerald-800' },
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

    const activeRoomNum = String(activeRoom?.roomNumber || booking?.roomNumber || '');
    const activeRoomType = activeRoom?.roomType || booking?.roomType || (dynamicRoomTypes[0] || 'Standard');

    // Split Stay Journey Metadata & Cumulative Calculation (Must remain above early returns to adhere to React Hook rules)
    const splitStayMeta = useMemo(() => {
        if (!booking || !isSplitStay || resolvedGroupRooms.length <= 1) {
            return {
                isSplit: false,
                overallArrival: activeRoom?.checkInDate || booking?.arrivalDate || '',
                overallDeparture: activeRoom?.checkOutDate || booking?.departureDate || '',
                totalStayNights: Number(booking?.nights || nights || 1),
                roomSequence: activeRoom ? [{
                    roomNumber: String(activeRoomNum),
                    roomType: activeRoomType,
                    checkIn: activeRoom.checkInDate || booking?.arrivalDate || '',
                    checkOut: activeRoom.checkOutDate || booking?.departureDate || '',
                    nights: Number(booking?.nights || nights || 1)
                }] : []
            };
        }

        const ins = resolvedGroupRooms.map((r: any) => r.checkIn || r.checkInDate || booking.arrivalDate).filter(Boolean).sort();
        const outs = resolvedGroupRooms.map((r: any) => r.checkOut || r.checkOutDate || booking.departureDate).filter(Boolean).sort();
        const overallArrival = ins[0] || booking.arrivalDate || '';
        const overallDeparture = outs[outs.length - 1] || booking.departureDate || '';

        let totalNightsAcc = 0;
        const seq = resolvedGroupRooms.map((r: any) => {
            const sIn = r.checkIn || r.checkInDate;
            const sOut = r.checkOut || r.checkOutDate;
            const n = (sIn && sOut)
                ? Math.max(1, Math.round((new Date(sOut).getTime() - new Date(sIn).getTime()) / (1000 * 3600 * 24)))
                : Number(r.nights || 1);
            totalNightsAcc += n;
            return {
                roomNumber: String(r.roomNumber),
                roomType: r.roomType || 'Standard',
                checkIn: sIn || overallArrival,
                checkOut: sOut || overallDeparture,
                nights: n
            };
        });

        const diffNights = Math.max(1, Math.round((new Date(overallDeparture).getTime() - new Date(overallArrival).getTime()) / (1000 * 3600 * 24)));
        const finalNights = totalNightsAcc > 0 ? totalNightsAcc : diffNights;

        return {
            isSplit: true,
            overallArrival,
            overallDeparture,
            totalStayNights: finalNights,
            roomSequence: seq
        };
    }, [isSplitStay, resolvedGroupRooms, booking, activeRoom, nights, activeRoomNum, activeRoomType]);

    if (!isOpen || !booking || !activeRoom) return null;

    const rawActivePlan = activeRoom.ratePlan || booking.ratePlan;
    const activeRatePlan = sanitizeRatePlanName(
        rawActivePlan,
        dynamicRatePlansAndPackages.find(p => sanitizeRatePlanName(p.value, '') !== '')?.value || 'Best Available Rate (BAR)'
    );
    const isWhatsAppBooking = booking?.source?.toUpperCase() === 'WHATSAPP' || 
        booking?.channel?.toUpperCase() === 'WHATSAPP' || 
        booking?.channel === 'StayPulse AI' || 
        Boolean(booking?.specialRequests && booking.specialRequests.includes('AI Inbound'));
    const channelDisplayName = isWhatsAppBooking
        ? 'WhatsApp AI'
        : (booking?.channel || booking?.source || 'Direct Walk-In');
    const activeSubBookingNo = activeRoom.reservationNumber || activeRoom.subBookingNumber || booking.subBookingNumber || booking.reservationNumber;
    const isCurrentActiveInHouse = activeStatus === 'IN-HOUSE' || activeStatus === 'ARRIVED' || activeStatus === 'STAYOVER';
    const isCurrentActiveConfirmed = activeStatus === 'CONFIRMED' || activeStatus === 'ARRIVING';
    const isCurrentActiveCheckedOut = activeStatus === 'CHECKED-OUT' || activeStatus === 'COMPLETED' || activeStatus === 'DEPARTED';
    const isCurrentActiveCancelled = activeStatus === 'CANCELLED' || activeStatus === 'VOID';
    const isRoomUnassignedActive = isRoomUnassigned(activeRoom?.roomNumber || booking?.roomNumber, (booking as any)?.allocatedRooms);
    const activeRegNo = activeRoom.registrationNumber || (isCurrentActiveInHouse ? (booking.registrationNumber || generateRegistrationNumber(activeSubBookingNo)) : booking.registrationNumber);
    const activeGuestName = activeRoom.guestName || booking.guestName;
    const bookingAny = booking as any;

    const statusBadgeConfig = (() => {
        const s = (activeStatus || 'CONFIRMED').toUpperCase();
        if (s === 'IN-HOUSE' || s === 'ARRIVED' || s === 'STAYOVER') {
            return {
                bg: 'bg-emerald-500/20 border-emerald-400/40 text-emerald-200',
                dot: 'bg-emerald-400',
                label: activeStatus
            };
        }
        if (s === 'CONFIRMED' || s === 'ASSIGNED' || s === 'ARRIVING') {
            return {
                bg: 'bg-teal-500/20 border-teal-400/40 text-teal-200',
                dot: 'bg-teal-400',
                label: activeStatus
            };
        }
        if (s === 'HOLD') {
            return {
                bg: 'bg-amber-500/20 border-amber-400/40 text-amber-200',
                dot: 'bg-amber-400',
                label: activeStatus
            };
        }
        if (s === 'CANCELLED' || s === 'VOID') {
            return {
                bg: 'bg-rose-500/20 border-rose-400/40 text-rose-200',
                dot: 'bg-rose-400',
                label: activeStatus
            };
        }
        if (s === 'CHECKED-OUT' || s === 'COMPLETED' || s === 'DEPARTED') {
            return {
                bg: 'bg-slate-500/20 border-slate-400/40 text-slate-200',
                dot: 'bg-slate-400',
                label: activeStatus
            };
        }
        return {
            bg: 'bg-blue-500/20 border-blue-400/40 text-blue-200',
            dot: 'bg-blue-400',
            label: activeStatus || 'CONFIRMED'
        };
    })();

    const activeRoomObj = (allRooms || []).find((r: any) => String(r.roomNumber) === String(activeRoomNum));
    const housekeepingStatus = activeRoomObj?.status || 'Clean & Inspected';
    const roomFloorDisplay = (activeRoomObj as any)?.floor ? `${(activeRoomObj as any).floor}` : '';

    const boardBasisCode = (() => {
        const p = (activeRatePlan || '').toUpperCase();
        if (p.includes('AP') || p.includes('FULL BOARD')) return { code: 'AP', name: 'Full Board (All Meals)', color: 'text-purple-300 bg-purple-500/20 border-purple-400/30' };
        if (p.includes('MAP') || p.includes('HALF BOARD')) return { code: 'MAP', name: 'Half Board (Breakfast + Dinner)', color: 'text-indigo-300 bg-indigo-500/20 border-indigo-400/30' };
        if (p.includes('EP') || p.includes('ROOM ONLY')) return { code: 'EP', name: 'Room Only (No Meals)', color: 'text-slate-300 bg-slate-500/20 border-slate-400/30' };
        return { code: 'CP', name: 'Bed & Breakfast (CP)', color: 'text-emerald-300 bg-emerald-500/20 border-emerald-400/30' };
    })();

    const isTaxApplicable = booking.taxApplicable !== false;
    const taxConfigId = booking.taxConfigId;
    const taxConfigCode = booking.taxConfigCode || 'HOSP-STD';

    // Original values from booking record
    const origNights = booking.nights || 1;
    const standardDaily = resolveReservationDailyBaseRate(booking, booking.roomNumber);
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
    const calculatedTaxes = calculateReservationTaxes(currentBaseAmount, isTaxApplicable, taxConfigId);
    const activeTaxCalc = isAmendingStay
        ? calculatedTaxes
        : (booking.taxDetails && Array.isArray((booking.taxDetails as any).breakdown) && (booking.taxDetails as any).breakdown.length > 0
            ? booking.taxDetails
            : calculatedTaxes);

    const totalAmount = isAmendingStay
        ? activeTaxCalc.grandTotal
        : (isTaxApplicable && activeTaxCalc.totalTaxAmount > 0 ? (currentBaseAmount + activeTaxCalc.totalTaxAmount) : origTotal);
    const advancePaymentsList = Array.isArray((booking as any).paymentRows) && (booking as any).paymentRows.length > 0
        ? (booking as any).paymentRows
        : (Array.isArray((booking as any).advancePayments) && (booking as any).advancePayments.length > 0
            ? (booking as any).advancePayments
            : []);
    const paidAmount = advancePaymentsList.reduce((acc: number, p: any) => acc + (Number(p.amount) || 0), 0) || Number(booking.paidAmount || 0);
    const dueAmount = Math.max(0, totalAmount - paidAmount);
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
                taxBreakdown: activeTaxCalc.breakdown || [],
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
        let sumNights = 0;
        const roomRows = resolvedGroupRooms.map((rm: any, idx: number) => {
            const rRate = Number(rm.rate || rm.avgDailyRate || booking.avgDailyRate || getStandardDailyRateForRoom(rm.roomNumber, rm.roomType));
            const sIn = rm.checkIn || rm.checkInDate;
            const sOut = rm.checkOut || rm.checkOutDate;
            const rNights = (sIn && sOut)
                ? Math.max(1, Math.round((new Date(sOut).getTime() - new Date(sIn).getTime()) / (1000 * 3600 * 24)))
                : Number(rm.nights || booking.nights || 1);
            const rBase = rRate * rNights;
            const rPax = Number(rm.adults ?? 2) + Number(rm.children ?? 0);
            totalBase += rBase;
            totalPax += rPax;
            sumNights += rNights;
            const isSplitStaySegment = isSplitStay;
            const rResNo = rm.reservationNumber || rm.subBookingNumber || (isSplitStaySegment ? `${booking.reservationNumber}-L${idx + 1}` : (resolvedGroupRooms.length > 1 ? `${booking.reservationNumber}-${String(idx + 1).padStart(2, '0')}` : booking.reservationNumber));
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
            totalNights: sumNights > 0 ? sumNights : origNights,
            totalBase,
            totalTax: taxCalc.totalTaxAmount,
            serviceCharge: taxCalc.serviceChargeAmount,
            vatAmount: taxCalc.vatAmount,
            grandTotal: grpTotal,
            paidAmount: grpPaid,
            dueAmount: grpDue,
            taxBreakdown: taxCalc.breakdown || [],
            rooms: roomRows
        };
    })();

    // Active Display values (Switches seamlessly between Split Stay Master Total and Single Segment)
    const showSplitTotal = isSplitStay && splitViewMode === 'total';
    const displayArrival = showSplitTotal ? splitStayMeta.overallArrival : (activeRoom.checkInDate || booking.arrivalDate);
    const displayDeparture = showSplitTotal ? splitStayMeta.overallDeparture : (activeRoom.checkOutDate || departureDate);
    const displayNights = showSplitTotal ? splitStayMeta.totalStayNights : (activeRoom.nights || nights);
    const displayBase = showSplitTotal ? groupFinancials.totalBase : baseAmount;
    const displayTax = showSplitTotal ? groupFinancials.totalTax : totalTax;
    const displayServiceCharge = showSplitTotal ? groupFinancials.serviceCharge : serviceCharge;
    const displayVat = showSplitTotal ? groupFinancials.vatAmount : vatAmount;
    const displayTaxBreakdown = showSplitTotal ? ((groupFinancials as any).taxBreakdown || []) : (activeTaxCalc.breakdown || []);
    const displayGrandTotal = showSplitTotal ? groupFinancials.grandTotal : totalAmount;
    const displayPaid = showSplitTotal ? groupFinancials.paidAmount : paidAmount;
    const displayDue = showSplitTotal ? groupFinancials.dueAmount : dueAmount;
    const displayDailyRate = showSplitTotal ? Math.round(displayBase / Math.max(1, displayNights)) : dailyRate;

    // Handle arrival date change in amend mode (with collision validation)
    const handleArrivalChange = (newArr: string) => {
        if (!newArr) return;
        const curDep = departureDate || booking?.departureDate || '2026-07-03';
        const start = new Date(newArr);
        const end = new Date(curDep);
        const diff = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
        if (diff < 1) {
            toast.warning('Check-in date must be at least 1 night before departure date.');
            return;
        }
        const avail = getAvailableRoomsForStay(newArr, curDep, undefined, {
            excludeReservationId: booking.reservationNumber || booking.id
        });
        const rmStatus = avail.allRoomsStatus.find(s => String(s.room.number) === String(booking.roomNumber));
        if (rmStatus && !rmStatus.isAvailable && rmStatus.conflictingReservation) {
            const cr = rmStatus.conflictingReservation;
            toast.error(`Cannot change Check-In for Room ${booking.roomNumber}: Already booked by ${cr.guestName} (${cr.reservationNumber}) until ${cr.checkOut}!`);
            return;
        }
        setArrivalDate(newArr);
        setNights(diff);
    };

    // Handle departure change in amend mode (with overbooking collision guard)
    const handleDepartureChange = (newDep: string) => {
        if (!booking?.arrivalDate) return;
        const sysDate = getOperatingSystemDate();
        if (isBookingInHouse && newDep < sysDate) {
            toast.warning(`Cannot shorten stay before current PMS Business Date (${sysDate}) for an in-house guest.`);
            return;
        }
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

    // Helper to calculate nights between 2 dates
    const calcSegmentNights = (from: string, to: string) => {
        if (!from || !to) return 1;
        const d1 = new Date(from);
        const d2 = new Date(to);
        const diff = Math.round((d2.getTime() - d1.getTime()) / (1000 * 60 * 60 * 24));
        return Math.max(1, diff);
    };

    // Multi-Segment (Split Stay Pattern) Handlers
    const handleAddRoomSegment = () => {
        setMoveSegments(prev => {
            if (prev.length === 0) {
                return [{
                    id: `seg-${Date.now()}`,
                    fromDate: moveFromDate || booking?.arrivalDate || '',
                    toDate: moveToDate || booking?.departureDate || '',
                    roomType: booking?.roomType || 'Deluxe Suite',
                    roomNumber: booking?.roomNumber || '',
                    nights: 1,
                    dailyRate: resolveReservationDailyBaseRate(booking, booking?.roomNumber)
                }];
            }
            const lastIdx = prev.length - 1;
            const last = prev[lastIdx];
            const d1 = new Date(last.fromDate);
            const d2 = new Date(last.toDate);
            const diffDays = Math.max(1, Math.round((d2.getTime() - d1.getTime()) / (1000 * 60 * 60 * 24)));

            if (diffDays >= 2) {
                // Split the last segment into two
                const midDays = Math.floor(diffDays / 2);
                const midDate = new Date(d1);
                midDate.setDate(midDate.getDate() + midDays);
                const midDateStr = midDate.toISOString().split('T')[0];

                const updatedLast: MoveStaySegment = {
                    ...last,
                    toDate: midDateStr,
                    nights: midDays
                };

                const otherType = dynamicRoomTypes.find(t => t !== last.roomType) || last.roomType;
                const availRooms = validRooms.filter(r => r.type === otherType);
                const targetRoom = availRooms.find(r => String(r.roomNumber) !== String(last.roomNumber)) || availRooms[0] || validRooms[0];

                const newSeg: MoveStaySegment = {
                    id: `seg-${Date.now()}-${prev.length}`,
                    fromDate: midDateStr,
                    toDate: last.toDate,
                    roomType: otherType,
                    roomNumber: targetRoom ? targetRoom.roomNumber : '',
                    nights: diffDays - midDays,
                    dailyRate: getStandardDailyRateForRoom(targetRoom ? targetRoom.roomNumber : '', otherType)
                };

                const nextList = [...prev];
                nextList[lastIdx] = updatedLast;
                nextList.push(newSeg);
                return nextList;
            } else {
                // Last segment is 1 night, extend by 1 night
                const nextEnd = new Date(d2);
                nextEnd.setDate(nextEnd.getDate() + 1);
                const nextEndStr = nextEnd.toISOString().split('T')[0];

                const otherType = dynamicRoomTypes.find(t => t !== last.roomType) || last.roomType;
                const availRooms = validRooms.filter(r => r.type === otherType);
                const targetRoom = availRooms.find(r => String(r.roomNumber) !== String(last.roomNumber)) || availRooms[0] || validRooms[0];

                const newSeg: MoveStaySegment = {
                    id: `seg-${Date.now()}-${prev.length}`,
                    fromDate: last.toDate,
                    toDate: nextEndStr,
                    roomType: otherType,
                    roomNumber: targetRoom ? targetRoom.roomNumber : '',
                    nights: 1,
                    dailyRate: getStandardDailyRateForRoom(targetRoom ? targetRoom.roomNumber : '', otherType)
                };
                return [...prev, newSeg];
            }
        });
    };

    const handleRemoveRoomSegment = (idx: number) => {
        setMoveSegments(prev => {
            if (prev.length <= 1) return prev;
            const nextList = [...prev];
            const removed = nextList.splice(idx, 1)[0];
            if (idx > 0 && nextList[idx - 1]) {
                nextList[idx - 1] = {
                    ...nextList[idx - 1],
                    toDate: removed.toDate,
                    nights: calcSegmentNights(nextList[idx - 1].fromDate, removed.toDate)
                };
            } else if (nextList[0]) {
                nextList[0] = {
                    ...nextList[0],
                    fromDate: removed.fromDate,
                    nights: calcSegmentNights(removed.fromDate, nextList[0].toDate)
                };
            }
            return nextList;
        });
    };

    // =========================================================================
    // SPLIT STAY JOURNEY & MULTI-SEGMENT AMEND CONTROLLERS
    // =========================================================================
    const handleUpdateSplitStaySegmentNights = (idx: number, newNights: number) => {
        const safeNights = Math.max(1, newNights);
        setSplitStaySegments(prev => {
            if (!prev[idx]) return prev;
            const nextList = prev.map(s => ({ ...s }));
            nextList[idx].nights = safeNights;
            const d1 = new Date(nextList[idx].fromDate);
            d1.setDate(d1.getDate() + safeNights);
            nextList[idx].toDate = d1.toISOString().split('T')[0];

            // Contiguous Ripple forward to subsequent legs
            for (let k = idx + 1; k < nextList.length; k++) {
                if (nextList[k] && nextList[k - 1]) {
                    nextList[k].fromDate = nextList[k - 1].toDate;
                    const dk = new Date(nextList[k].fromDate);
                    dk.setDate(dk.getDate() + (nextList[k].nights || 1));
                    nextList[k].toDate = dk.toISOString().split('T')[0];
                }
            }

            const finalDep = nextList[nextList.length - 1]?.toDate || '';
            const totalNts = nextList.reduce((sum, s) => sum + (s.nights || 1), 0);
            if (finalDep) setDepartureDate(finalDep);
            setNights(totalNts);

            return nextList;
        });
    };

    const handleUpdateSplitStayArrival = (newArrival: string) => {
        setArrivalDate(newArrival);
        setSplitStaySegments(prev => {
            if (prev.length === 0 || !prev[0]) return prev;
            const nextList = prev.map(s => ({ ...s }));
            nextList[0].fromDate = newArrival;
            const d0 = new Date(newArrival);
            d0.setDate(d0.getDate() + (nextList[0].nights || 1));
            nextList[0].toDate = d0.toISOString().split('T')[0];

            for (let k = 1; k < nextList.length; k++) {
                if (nextList[k] && nextList[k - 1]) {
                    nextList[k].fromDate = nextList[k - 1].toDate;
                    const dk = new Date(nextList[k].fromDate);
                    dk.setDate(dk.getDate() + (nextList[k].nights || 1));
                    nextList[k].toDate = dk.toISOString().split('T')[0];
                }
            }

            const finalDep = nextList[nextList.length - 1]?.toDate || '';
            if (finalDep) setDepartureDate(finalDep);
            return nextList;
        });
    };

    const handleUpdateSplitStaySegmentRoom = (idx: number, newRoomNumber: string) => {
        setSplitStaySegments(prev => {
            if (!prev[idx]) return prev;
            const nextList = prev.map(s => ({ ...s }));
            const rmObj = validRooms.find(r => String(r.roomNumber) === String(newRoomNumber));
            const rmType = rmObj?.type || nextList[idx].roomType;
            nextList[idx].roomNumber = String(newRoomNumber);
            nextList[idx].roomType = rmType;
            nextList[idx].dailyRate = getStandardDailyRateForRoom(newRoomNumber, rmType);
            return nextList;
        });
    };

    const handleSubSplitLeg = (idx: number) => {
        setSplitStaySegments(prev => {
            if (!prev[idx] || (prev[idx].nights || 1) < 2) return prev;
            const target = prev[idx];
            const targetNts = target.nights || 2;
            const half1 = Math.floor(targetNts / 2);
            const half2 = targetNts - half1;

            const dMid = new Date(target.fromDate);
            dMid.setDate(dMid.getDate() + half1);
            const midDateStr = dMid.toISOString().split('T')[0];

            const leg1: MoveStaySegment = {
                ...target,
                toDate: midDateStr,
                nights: half1
            };

            const otherRooms = validRooms.filter(r => String(r.roomNumber) !== String(target.roomNumber));
            const nextRm = otherRooms[0] || validRooms[0];

            const leg2: MoveStaySegment = {
                id: `split-seg-${Date.now()}-${idx + 1}`,
                fromDate: midDateStr,
                toDate: target.toDate,
                roomNumber: nextRm ? String(nextRm.roomNumber) : target.roomNumber,
                roomType: nextRm?.type || target.roomType,
                nights: half2,
                dailyRate: getStandardDailyRateForRoom(nextRm ? String(nextRm.roomNumber) : target.roomNumber, nextRm?.type || target.roomType)
            };

            const nextList = [...prev];
            nextList.splice(idx, 1, leg1, leg2);
            return nextList;
        });
    };

    const handleMergeLegWithPrevious = (idx: number) => {
        setSplitStaySegments(prev => {
            if (idx <= 0 || !prev[idx] || !prev[idx - 1]) return prev;
            const nextList = [...prev];
            const legToRemove = nextList[idx];
            const prevLeg = nextList[idx - 1];

            nextList[idx - 1] = {
                ...prevLeg,
                toDate: legToRemove.toDate,
                nights: (prevLeg.nights || 1) + (legToRemove.nights || 1)
            };
            nextList.splice(idx, 1);

            const totalNts = nextList.reduce((sum, s) => sum + (s.nights || 1), 0);
            setNights(totalNts);
            const finalDep = nextList[nextList.length - 1]?.toDate || '';
            if (finalDep) setDepartureDate(finalDep);

            return nextList;
        });
    };

    const handleAddSplitStayMove = () => {
        setSplitStaySegments(prev => {
            if (prev.length === 0) return prev;
            const last = prev[prev.length - 1];
            const dEnd = new Date(last.toDate);
            dEnd.setDate(dEnd.getDate() + 1);
            const nextEndStr = dEnd.toISOString().split('T')[0];

            const otherRooms = validRooms.filter(r => String(r.roomNumber) !== String(last.roomNumber));
            const nextRm = otherRooms[0] || validRooms[0];

            const newLeg: MoveStaySegment = {
                id: `split-seg-${Date.now()}-${prev.length}`,
                fromDate: last.toDate,
                toDate: nextEndStr,
                roomNumber: nextRm ? String(nextRm.roomNumber) : last.roomNumber,
                roomType: nextRm?.type || last.roomType,
                nights: 1,
                dailyRate: getStandardDailyRateForRoom(nextRm ? String(nextRm.roomNumber) : last.roomNumber, nextRm?.type || last.roomType)
            };

            const nextList = [...prev, newLeg];
            const totalNts = nextList.reduce((sum, s) => sum + (s.nights || 1), 0);
            setNights(totalNts);
            setDepartureDate(nextEndStr);
            return nextList;
        });
    };

    const handleUpdateSegment = (idx: number, field: keyof MoveStaySegment, value: any) => {
        setMoveSegments(prev => {
            const nextList = prev.map(s => ({ ...s }));
            if (!nextList[idx]) return prev;

            if (field === 'toDate') {
                const newTo = value;
                nextList[idx].toDate = newTo;
                nextList[idx].nights = calcSegmentNights(nextList[idx].fromDate, newTo);
                if (idx === 0) setToDate(newTo);
                // Auto-chain with subsequent segment if it exists
                if (nextList[idx + 1]) {
                    nextList[idx + 1].fromDate = newTo;
                    if (nextList[idx + 1].toDate <= newTo) {
                        const d = new Date(newTo);
                        d.setDate(d.getDate() + 1);
                        nextList[idx + 1].toDate = d.toISOString().split('T')[0];
                    }
                    nextList[idx + 1].nights = calcSegmentNights(nextList[idx + 1].fromDate, nextList[idx + 1].toDate);
                }
            } else if (field === 'fromDate') {
                const newFrom = value;
                nextList[idx].fromDate = newFrom;
                nextList[idx].nights = calcSegmentNights(newFrom, nextList[idx].toDate);
                if (idx === 0) setMoveFromDate(newFrom);
                // If previous segment exists, sync its toDate
                if (idx > 0 && nextList[idx - 1]) {
                    nextList[idx - 1].toDate = newFrom;
                    nextList[idx - 1].nights = calcSegmentNights(nextList[idx - 1].fromDate, newFrom);
                }
            } else if (field === 'roomType') {
                nextList[idx].roomType = value;
                if (idx === 0) setMoveRoomType(value);
                const availRooms = validRooms.filter(r => r.type === value);
                const firstAvail = availRooms[0];
                if (firstAvail) {
                    nextList[idx].roomNumber = firstAvail.roomNumber;
                    nextList[idx].dailyRate = getStandardDailyRateForRoom(firstAvail.roomNumber, value);
                    if (idx === 0) setMoveSelectedRoom(firstAvail.roomNumber);
                }
            } else if (field === 'roomNumber') {
                nextList[idx].roomNumber = value;
                if (idx === 0) setMoveSelectedRoom(value);
                const rObj = validRooms.find(r => String(r.roomNumber) === String(value));
                if (rObj?.type) {
                    nextList[idx].roomType = rObj.type;
                    nextList[idx].dailyRate = getStandardDailyRateForRoom(value, rObj.type);
                    if (idx === 0) setMoveRoomType(rObj.type);
                }
            }
            return nextList;
        });
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

    const handleSendConfirmation = async () => {
        if (!booking) return;
        const targetId = booking.id || booking.reservationNumber;
        if (!targetId) {
            toast.error('Reservation ID not found');
            return;
        }
        if (!confirmChannelWhatsApp && !confirmChannelEmail) {
            toast.error('Please select at least one delivery channel (WhatsApp or Email)');
            return;
        }
        if (confirmChannelWhatsApp && !confirmSendPhone) {
            toast.error('Please provide a valid WhatsApp phone number');
            return;
        }

        try {
            setIsSendingConfirmation(true);
            const token = localStorage.getItem('token');
            const propertyId = getActivePropertyId() || 1;
            const res = await fetch(`${getApiBaseUrl()}/api/bookings/${targetId}/send-confirmation`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
                    'x-property-id': String(propertyId)
                },
                body: JSON.stringify({
                    phone: confirmSendPhone,
                    email: confirmSendEmail,
                    channels: {
                        whatsapp: confirmChannelWhatsApp,
                        email: confirmChannelEmail,
                        sms: false
                    }
                })
            });

            const data = await res.json();
            if (data.success) {
                toast.success('Official Booking Confirmation Voucher dispatched successfully!');
                const channelNames = [];
                if (confirmChannelWhatsApp) channelNames.push('WhatsApp');
                if (confirmChannelEmail) channelNames.push('Email');
                setLastDispatchedInfo({
                    time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                    channels: channelNames.join(' & ')
                });
            } else {
                toast.error(data.message || 'Failed to dispatch confirmation voucher');
            }
        } catch (err: any) {
            console.error('Error sending confirmation voucher:', err);
            toast.error('Network error dispatching voucher. Please try again.');
        } finally {
            setIsSendingConfirmation(false);
        }
    };

    const handlePrimaryAction = async () => {
        switch (mode) {
            case 'send_confirmation':
                await handleSendConfirmation();
                return;
            case 'link_group':
                handleLinkGroup();
                return;
            case 'ungroup':
                handleUngroup();
                return;
            case 'amend': {
                const effectiveArr = arrivalDate || booking.arrivalDate;

                // Split Stay Multi-Segment Itinerary
                if (splitStaySegments.length > 1) {
                    for (let i = 0; i < splitStaySegments.length; i++) {
                        const seg = splitStaySegments[i];
                        const avail = getAvailableRoomsForStay(seg.fromDate, seg.toDate, undefined, {
                            excludeReservationId: booking.reservationNumber || booking.id
                        });
                        const rmStatus = avail.allRoomsStatus.find(s => String(s.room.number) === String(seg.roomNumber));
                        if (rmStatus && !rmStatus.isAvailable && rmStatus.conflictingReservation) {
                            const cr = rmStatus.conflictingReservation;
                            toast.error(`Cannot amend Split Stay: Room ${seg.roomNumber} (Leg ${i + 1}/${splitStaySegments.length}) collides with ${cr.guestName} (${cr.reservationNumber}) from ${cr.checkIn} to ${cr.checkOut}!`);
                            return;
                        }
                    }

                    const masterDep = splitStaySegments[splitStaySegments.length - 1].toDate;
                    const masterNts = splitStaySegments.reduce((sum, s) => sum + (s.nights || 1), 0);
                    const masterArr = splitStaySegments[0].fromDate;

                    if (onSaveAmendStay) {
                        onSaveAmendStay(booking.id, masterDep, masterNts, amendAdults, amendChildren, {
                            sendEmail: notifSendEmail,
                            sendSms: notifSendSms,
                            sendWhatsApp: notifSendWhatsApp,
                            guestEmail: notifCustomEmail,
                            guestPhone: notifCustomPhone,
                            reason: notifReason,
                            isSilent: notifSilentUpdate
                        }, masterArr, splitStaySegments);
                    }
                    break;
                }

                // Standard Single Room Amend
                const avail = getAvailableRoomsForStay(effectiveArr, departureDate, undefined, {
                    excludeReservationId: booking.reservationNumber || booking.id
                });
                const rmStatus = avail.allRoomsStatus.find(s => String(s.room.number) === String(booking.roomNumber));
                if (rmStatus && !rmStatus.isAvailable && rmStatus.conflictingReservation) {
                    const cr = rmStatus.conflictingReservation;
                    toast.error(`Cannot amend Room ${booking.roomNumber}: Already booked by ${cr.guestName} (${cr.reservationNumber}) from ${cr.checkIn} to ${cr.checkOut}!`);
                    return;
                }
                if (onSaveAmendStay) {
                    onSaveAmendStay(booking.id, departureDate, nights, amendAdults, amendChildren, {
                        sendEmail: notifSendEmail,
                        sendSms: notifSendSms,
                        sendWhatsApp: notifSendWhatsApp,
                        guestEmail: notifCustomEmail,
                        guestPhone: notifCustomPhone,
                        reason: notifReason,
                        isSilent: notifSilentUpdate
                    }, effectiveArr);
                }
                break;
            }
            case 'move': {
                if (Boolean((booking as any)?.stopRoomMove) && !supervisorOverrideMove) {
                    toast.error(`🔒 Cannot move room: Stop Room Move is active for ${booking.guestName}! Check supervisor override to proceed.`);
                    return;
                }

                // If multi-segments configured (Split Stay Engine)
                const segmentsToSave: MoveStaySegment[] = moveSegments.length > 0 ? moveSegments : [
                    {
                        id: `seg-0`,
                        fromDate: moveFromDate,
                        toDate: moveToDate,
                        roomType: (moveRoomType !== 'All' ? moveRoomType : booking.roomType) || 'Deluxe Suite',
                        roomNumber: moveSelectedRoom,
                        nights: Math.max(1, Math.round((new Date(moveToDate).getTime() - new Date(moveFromDate).getTime()) / (1000 * 60 * 60 * 24))),
                        dailyRate: resolveReservationDailyBaseRate(booking, moveSelectedRoom)
                    }
                ];

                // Validate each segment for availability & collisions
                for (let i = 0; i < segmentsToSave.length; i++) {
                    const seg = segmentsToSave[i];
                    if (!seg.roomNumber) {
                        toast.error(`Please select a room for Segment ${i + 1} (${seg.fromDate} to ${seg.toDate})`);
                        return;
                    }
                    const avail = getAvailableRoomsForStay(seg.fromDate, seg.toDate, undefined, {
                        excludeReservationId: booking.reservationNumber || booking.id
                    });
                    const rmStatus = avail.allRoomsStatus.find(s => String(s.room.number) === String(seg.roomNumber));
                    if (rmStatus && !rmStatus.isAvailable && String(seg.roomNumber) !== String(booking.roomNumber)) {
                        const cr = rmStatus.conflictingReservation;
                        toast.error(
                            cr
                                ? `Cannot allocate Room ${seg.roomNumber} for Segment ${i + 1} (${seg.fromDate} to ${seg.toDate}): Already booked by ${cr.guestName} (${cr.reservationNumber})!`
                                : `Cannot allocate Room ${seg.roomNumber} for Segment ${i + 1}: Room is ${rmStatus.reason || 'unavailable'}!`
                        );
                        return;
                    }
                }

                const primarySegment = segmentsToSave[0];
                const lastSegment = segmentsToSave[segmentsToSave.length - 1];
                const targetRoomObj = validRooms.find(r => String(r.roomNumber) === String(primarySegment.roomNumber));
                const resolvedTargetType = primarySegment.roomType || targetRoomObj?.type || booking.roomType;

                const upgradeAdj = roomMoveAnalysis?.isUpgrade ? {
                    mode: upgradeBillingMode,
                    amount: upgradeBillingMode === 'charge' ? (roomMoveAnalysis.totalDiff || 0) : 0
                } : undefined;

                const notifConfig = !notifSilentUpdate ? {
                    isSilent: false,
                    sendEmail: notifSendEmail,
                    sendSms: notifSendSms,
                    sendWhatsApp: notifSendWhatsApp,
                    guestEmail: notifCustomEmail,
                    guestPhone: notifCustomPhone,
                    customEmail: notifCustomEmail,
                    customPhone: notifCustomPhone,
                    oldRoomNumber: booking.roomNumber,
                    newRoomNumber: primarySegment.roomNumber,
                    oldRoomTypeName: booking.roomType,
                    newRoomTypeName: resolvedTargetType,
                    isUpgrade: roomMoveAnalysis?.isUpgrade,
                    upgradeDailyDiff: roomMoveAnalysis?.dailyDiff,
                    upgradeBillingMode: upgradeBillingMode,
                    reason: notifReason || (segmentsToSave.length > 1 ? `Split Stay Multi-Segment Move (${segmentsToSave.length} segments)` : `Room Move to Room ${primarySegment.roomNumber}`),
                    segments: segmentsToSave,
                    overrideRoomRate: overrideRoomRate
                } : { isSilent: true };

                if (onSaveRoomMove) {
                    onSaveRoomMove(
                        booking.id,
                        primarySegment.roomNumber,
                        primarySegment.fromDate,
                        lastSegment.toDate,
                        resolvedTargetType,
                        moveRateType || booking.ratePlan,
                        upgradeAdj,
                        notifConfig,
                        segmentsToSave,
                        overrideRoomRate
                    );
                }
                break;
            }
            case 'payment': {
                if (paymentAmount <= 0) {
                    toast.error('Please enter a valid payment amount greater than zero.');
                    return;
                }
                if (onSavePayment) {
                    const tenderMeta = [
                        paymentRemarks ? paymentRemarks.trim() : '',
                        paymentAcquiringBank ? `Bank: ${paymentAcquiringBank}` : '',
                        paymentReferenceCode ? `Ref: ${paymentReferenceCode}` : '',
                        paymentPosTerminalId ? `TID: ${paymentPosTerminalId}` : ''
                    ].filter(Boolean).join(' | ');
                    onSavePayment(booking.id, paymentMethod, paymentAmount, tenderMeta);
                }
                toast.success(`Payment of ${currencySymbol}${paymentAmount.toFixed(2)} via ${paymentMethod} posted successfully.`);
                setMode('overview');
                break;
            }
            case 'split': {
                // Multi-Segment Split Journey Mode
                if (splitStaySegments.length > 1) {
                    for (let i = 0; i < splitStaySegments.length; i++) {
                        const seg = splitStaySegments[i];
                        const avail = getAvailableRoomsForStay(seg.fromDate, seg.toDate, undefined, {
                            excludeReservationId: booking.reservationNumber || booking.id
                        });
                        const rmStatus = avail.allRoomsStatus.find(s => String(s.room.number) === String(seg.roomNumber));
                        if (rmStatus && !rmStatus.isAvailable && rmStatus.conflictingReservation) {
                            const cr = rmStatus.conflictingReservation;
                            toast.error(`Cannot save Split Stay Journey: Room ${seg.roomNumber} (Leg ${i + 1}/${splitStaySegments.length}) collides with ${cr.guestName} (${cr.reservationNumber}) from ${cr.checkIn} to ${cr.checkOut}!`);
                            return;
                        }
                    }

                    if (onSaveRoomSplit) {
                        onSaveRoomSplit(
                            booking.id,
                            splitStaySegments[0].roomNumber,
                            splitStaySegments[0].fromDate,
                            splitStaySegments[splitStaySegments.length - 1].toDate,
                            splitStaySegments
                        );
                    }
                    break;
                }

                // Standard 2-Room Split Fallback
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
                return {
                    title: (splitStaySegments.length > 1 || booking.isSplitStay)
                        ? `Amend Split Stay (${splitStaySegments.length} Legs)`
                        : 'Amend Stay',
                    buttonText: (splitStaySegments.length > 1 || booking.isSplitStay)
                        ? 'Save Revised Split Stay'
                        : 'Save Changes',
                    buttonIcon: <Edit3 size={13} />,
                    buttonClass: 'bg-[#1a73e8] hover:bg-blue-600 font-bold'
                };
            case 'move': {
                const isCurrentlyUnassigned = isRoomUnassigned(booking.roomNumber);
                return {
                    title: isCurrentlyUnassigned ? 'Assign Room' : 'Room Move',
                    buttonText: isCurrentlyUnassigned ? 'Assign Room & Confirm' : 'Save Room Move',
                    buttonIcon: isCurrentlyUnassigned ? <CheckCircle2 size={13} className="text-emerald-300" /> : <Home size={13} />,
                    buttonClass: isCurrentlyUnassigned ? 'bg-emerald-600 hover:bg-emerald-700 font-bold' : 'bg-[#1a73e8] hover:bg-blue-600 font-bold shadow-md'
                };
            }
            case 'payment':
                return { title: 'Add Payment', buttonText: 'Save Payment', buttonIcon: <CreditCard size={13} />, buttonClass: 'bg-[#1a73e8] hover:bg-blue-600' };
            case 'split':
                return {
                    title: (splitStaySegments.length > 1 || booking.isSplitStay)
                        ? `Split Stay Journey Manager (${splitStaySegments.length} Rooms)`
                        : 'Room Split',
                    buttonText: (splitStaySegments.length > 1 || booking.isSplitStay)
                        ? 'Save Split Journey'
                        : 'Save Room Split',
                    buttonIcon: <GitFork size={13} />,
                    buttonClass: 'bg-[#1a73e8] hover:bg-blue-600 font-bold'
                };
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
            case 'send_confirmation':
                return {
                    title: 'Send Confirmation Voucher',
                    buttonText: isSendingConfirmation ? 'Dispatching Voucher...' : 'Dispatch Voucher Now',
                    buttonIcon: <Send size={13} />,
                    buttonClass: 'bg-emerald-600 hover:bg-emerald-700 font-bold shadow-md'
                };
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

    const handlePassportProfileResolved = (guest: any, isNew: boolean) => {
        if (!guest) return;
        const resolvedName = guest.name || guest.fullName;
        if (resolvedName) {
            if (booking) {
                booking.guestName = resolvedName;
                if (guest.phone) booking.phone = guest.phone;
                if (guest.nationality) (booking as any).nationality = guest.nationality;
                if (guest.id_number) (booking as any).idNumber = guest.id_number;
                if (guest.vip_status) (booking as any).vipStatus = guest.vip_status;
            }
            if (activeRoom) {
                activeRoom.guestName = resolvedName;
            }
        }
        toast.success(
            isNew
                ? `New profile created and attached for ${resolvedName}!`
                : `Verified guest ${resolvedName} (${guest.vip_status || 'Regular'}) attached to this reservation!`
        );
        broadcastPMSEvent({
            type: 'RESERVATION_UPDATED',
            reservationId: booking?.id
        });
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
                        : mode === 'move'
                        ? 'w-full md:w-[82%] lg:w-[80%] min-w-[960px] max-w-[1280px]'
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
                        {/* GuestFlow AI Origin Badge */}
                        {(booking?.source === 'WHATSAPP' || booking?.channel === 'StayPulse AI' || booking?.channel?.includes('StayPulse') || (booking?.specialRequests && booking.specialRequests.includes('AI Inbound'))) && (
                            <span className="text-[8px] px-1.5 py-0.5 rounded font-bold shadow-2xs ml-1 bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 flex items-center gap-1" title="Automated WhatsApp Reservation via GuestFlow AI Concierge">
                                <MessageSquare size={10} className="text-emerald-400" />
                                GuestFlow AI
                            </span>
                        )}
                        {isConnectingSuite && (
                            <span className="text-[8px] px-1.5 py-0.5 rounded font-bold shadow-2xs ml-1 bg-indigo-50 text-indigo-800 border border-indigo-300 flex items-center gap-1" title="Interconnecting Suite Booking">
                                Interconnecting Suite
                            </span>
                        )}
                        {isSplitStay && (
                            <span className="text-[8px] px-1.5 py-0.5 rounded font-bold shadow-2xs ml-1 bg-purple-50 text-purple-800 border border-purple-300 flex items-center gap-1" title="Split Stay: Single guest moving between rooms across sequential dates">
                                <GitFork size={10} className="text-purple-600 shrink-0" />
                                <span>Split Stay ({resolvedGroupRooms.length} Segments)</span>
                            </span>
                        )}
                    </div>

                    {/* Right: Top Action Buttons (Folio + Edit + Dynamic Action Dropdown) */}
                    <div className="flex items-center gap-1.5 flex-shrink-0">
                        {(booking?.source === 'WHATSAPP' || booking?.channel === 'StayPulse AI' || booking?.channel?.includes('StayPulse') || (booking?.specialRequests && booking.specialRequests.includes('AI Inbound'))) && (
                            <button
                                type="button"
                                onClick={() => {
                                    window.location.href = `/guestflow?guestPhone=${encodeURIComponent(booking?.phone || '')}`;
                                }}
                                className="h-5 px-2 rounded text-[8px] flex items-center gap-1 shadow-2xs transition-colors bg-emerald-600 hover:bg-emerald-700 text-white font-bold cursor-pointer"
                                title="Open guest conversation in GuestFlow Omnichannel Inbox"
                            >
                                <MessageCircle size={10} />
                                <span>View Chat</span>
                            </button>
                        )}

                        <button
                            type="button"
                            onClick={() => setIsScannerOpen(true)}
                            className="h-5 px-2 rounded text-[8px] flex items-center gap-1 shadow-2xs transition-colors bg-white hover:bg-emerald-50 text-emerald-800 border border-emerald-300 font-semibold cursor-pointer"
                            title="Scan Passport or National ID Card to auto-fill guest profile"
                        >
                            <Camera size={10} className="text-emerald-700" />
                            <span>Scan ID</span>
                        </button>

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
                                                                    if (opt.key === 'scan_id') {
                                                                        setIsScannerOpen(true);
                                                                        return;
                                                                    }
                                                                    if (opt.key === 'reg_card') {
                                                                        setIsRegCardModalOpen(true);
                                                                        return;
                                                                    }
                                                                    if (opt.key === 'keycard') {
                                                                        setIsKeycardModalOpen(true);
                                                                        return;
                                                                    }
                                                                    if (opt.key === 'minibar') {
                                                                        setIsMinibarModalOpen(true);
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
                            onOpenAmendStay={() => {
                                setMode('amend');
                                if (onEdit) onEdit(booking);
                            }}
                            onOpenRoomMove={() => setMode('move')}
                            onOpenCheckOut={() => onCheckOut && activeSubBookingNo && onCheckOut(activeSubBookingNo)}
                            isTaxExemptionOpen={isTaxExemptionModalOpen}
                            onToggleTaxExemption={setIsTaxExemptionModalOpen}
                        />
                    </div>
                ) : (
                    <div className="flex-1 min-h-0 grid grid-cols-12 bg-[#0e3592] overflow-hidden">
                    {/* LEFT COLUMN: Overview & Financial Cards (Independent Scroll) */}
                    <div className={`${mode === 'move' ? 'col-span-6' : 'col-span-7'} h-full overflow-y-auto custom-scrollbar p-3 space-y-2 border-r border-blue-800/40`}>
                        {/* Split Stay View Mode Selector (Master Journey Total vs Single Leg Inspection) */}
                        {isSplitStay && (
                            <div className="bg-purple-950/40 border border-purple-500/30 rounded-xl p-2 space-y-1.5 shadow-xs">
                                <div className="flex items-center justify-between gap-2">
                                    <div className="flex items-center gap-1.5 min-w-0">
                                        <div className="w-5 h-5 rounded-md bg-purple-500/25 border border-purple-400/30 flex items-center justify-center text-purple-200 shrink-0">
                                            <GitFork size={11} />
                                        </div>
                                        <span className="text-[9px] font-bold text-white">Split Stay Route</span>
                                        <span className="text-[7.5px] px-1.5 py-0.2 rounded bg-purple-500/25 text-purple-200 border border-purple-400/30 font-semibold font-mono">
                                            {resolvedGroupRooms.length} Rooms • {splitStayMeta.totalStayNights} Nts
                                        </span>
                                    </div>

                                    {/* View Mode Segmented Switch */}
                                    <div className="flex items-center gap-0.5 bg-black/40 p-0.5 rounded-lg border border-white/10 shrink-0 text-[8px] font-bold">
                                        <button
                                            type="button"
                                            onClick={() => setSplitViewMode('total')}
                                            className={`px-2 py-0.5 rounded transition-all cursor-pointer ${
                                                splitViewMode === 'total'
                                                    ? 'bg-purple-600 text-white shadow-2xs'
                                                    : 'text-purple-200/70 hover:text-white'
                                            }`}
                                            title="View cumulative total across all rooms"
                                        >
                                            Full Total
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setSplitViewMode('segment')}
                                            className={`px-2 py-0.5 rounded transition-all cursor-pointer ${
                                                splitViewMode === 'segment'
                                                    ? 'bg-blue-600 text-white shadow-2xs'
                                                    : 'text-blue-200/70 hover:text-white'
                                            }`}
                                            title={`View details for current active room ${activeRoomNum}`}
                                        >
                                            Room {activeRoomNum}
                                        </button>
                                    </div>
                                </div>

                                {/* Full-Width Sequence Route Stepper (Never Cuts Off) */}
                                <div className="flex items-center gap-1 overflow-x-auto custom-scrollbar pb-0.5">
                                    {splitStayMeta.roomSequence.map((r, i) => {
                                        const isCurrent = String(r.roomNumber) === String(activeRoomNum);
                                        return (
                                            <React.Fragment key={r.roomNumber + i}>
                                                {i > 0 && <ArrowRight size={8.5} className="text-purple-400/60 shrink-0" />}
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        setActiveRoomNumber(String(r.roomNumber));
                                                        setSplitViewMode('segment');
                                                    }}
                                                    className={`px-1.5 py-0.5 rounded-md border text-[8px] font-mono font-bold flex items-center gap-1 transition-all cursor-pointer shrink-0 ${
                                                        isCurrent
                                                            ? 'bg-purple-600 text-white border-purple-300 ring-1 ring-purple-300/50 shadow-xs'
                                                            : 'bg-white/5 hover:bg-white/10 text-purple-200 border-white/10'
                                                    }`}
                                                    title={`Switch to Room ${r.roomNumber} (${r.nights} Nights)`}
                                                >
                                                    <span>Rm {r.roomNumber}</span>
                                                    <span className="text-[7px] opacity-75 font-sans">({r.nights}N)</span>
                                                </button>
                                            </React.Fragment>
                                        );
                                    })}
                                </div>
                            </div>
                        )}

                        {/* GuestFlow AI Courtesy Hold & Channel Origin Banner */}
                        {(activeStatus === 'HOLD' || booking?.source === 'WHATSAPP' || booking?.channel === 'StayPulse AI' || booking?.channel?.includes('StayPulse') || (booking?.specialRequests && booking.specialRequests.includes('AI Inbound'))) && (
                            <div className="bg-gradient-to-r from-emerald-950/75 via-blue-950/75 to-indigo-950/75 border border-emerald-400/40 rounded-xl p-2.5 flex items-center justify-between shadow-xs">
                                <div className="flex items-center gap-2 min-w-0">
                                    <div className="w-7 h-7 rounded-lg bg-emerald-500/25 border border-emerald-400/30 flex items-center justify-center text-emerald-300 flex-shrink-0">
                                        <MessageSquare size={13} />
                                    </div>
                                    <div className="min-w-0">
                                        <div className="flex items-center gap-1.5 flex-wrap">
                                            <span className="text-[9px] font-bold text-emerald-300 uppercase tracking-wider">
                                                GuestFlow AI Concierge
                                            </span>
                                            <span className="text-[7.5px] px-1.5 py-0.2 rounded-full bg-emerald-500/20 text-emerald-200 border border-emerald-400/30 font-medium">
                                                WhatsApp Business Line
                                            </span>
                                            {booking?.specialRequests && (
                                                <span className="text-[7.5px] text-blue-200/80 truncate max-w-[200px]" title={booking.specialRequests}>
                                                    • {booking.specialRequests}
                                                </span>
                                            )}
                                        </div>
                                        <div className="text-[8.5px] text-blue-200/90 flex items-center gap-1.5 mt-0.5">
                                            <span>Hold Validity:</span>
                                            <span className="font-semibold text-amber-300 font-mono">
                                                {booking?.holdUntil ? new Date(booking.holdUntil).toLocaleString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '24 Hours'}
                                            </span>
                                            {booking?.holdUntil && new Date(booking.holdUntil) > new Date() && (
                                                <span className="text-[7.5px] px-1 rounded bg-amber-500/20 text-amber-200 border border-amber-400/30 font-mono">
                                                    {Math.max(1, Math.round((new Date(booking.holdUntil).getTime() - Date.now()) / (1000 * 60 * 60)))}h left
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                </div>
                                <div className="flex items-center gap-1 flex-shrink-0 ml-2">
                                    <button
                                        type="button"
                                        onClick={() => {
                                            window.location.href = `/guestflow?guestPhone=${encodeURIComponent(booking?.phone || '')}`;
                                        }}
                                        className="h-6 px-2 bg-emerald-600/30 hover:bg-emerald-600/50 text-emerald-200 border border-emerald-400/40 rounded text-[8.5px] font-bold flex items-center gap-1 transition-colors cursor-pointer"
                                        title="View live WhatsApp conversation in GuestFlow Inbox"
                                    >
                                        <MessageCircle size={10} />
                                        <span>View Chat</span>
                                    </button>
                                </div>
                            </div>
                        )}

                        {/* Section 1: Master Identity & Status Strip */}
                        <div className="bg-white/[0.06] hover:bg-white/[0.08] backdrop-blur-md border border-white/10 rounded-xl p-2.5 flex items-center justify-between gap-2 shadow-xs transition-colors">
                            <div className="flex items-center gap-2 min-w-0 flex-wrap">
                                {/* Reservation Number Badge */}
                                <div className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-blue-500/20 border border-blue-400/30">
                                    <span className="text-[9px] font-bold text-blue-300">#</span>
                                    <span className="text-[10px] font-mono font-bold text-white tracking-wide">{activeSubBookingNo}</span>
                                </div>

                                {/* Booking Channel Pill */}
                                <div className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-indigo-500/15 border border-indigo-400/25">
                                    {isWhatsAppBooking ? (
                                        <>
                                            <MessageSquare size={11} className="text-emerald-400 shrink-0" />
                                            <span className="text-[9.5px] font-medium text-emerald-200 flex items-center gap-1">
                                                <span>{channelDisplayName}</span>
                                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                                            </span>
                                        </>
                                    ) : (
                                        <>
                                            <Globe size={11} className="text-indigo-300 shrink-0" />
                                            <span className="text-[9.5px] font-medium text-indigo-200">{channelDisplayName}</span>
                                        </>
                                    )}
                                </div>

                                {/* Optional GRC Registration Badge */}
                                {activeRegNo && (
                                    <div className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-emerald-500/20 border border-emerald-400/30">
                                        <span className="text-[8px] uppercase tracking-wider text-emerald-300 font-bold">GRC</span>
                                        <span className="text-[9.5px] font-mono font-bold text-emerald-200">{activeRegNo}</span>
                                    </div>
                                )}

                                {/* Optional VIP Loyalty Tier Badge */}
                                {booking?.vip && (
                                    <div className="flex items-center gap-1 px-2 py-1 rounded-lg bg-amber-500/20 border border-amber-400/30 text-amber-200 text-[9px] font-bold shadow-2xs">
                                        <Crown size={10} className="text-amber-300 fill-amber-300" />
                                        <span>{booking.vip === 'VIP' ? 'VIP Guest' : booking.vip}</span>
                                    </div>
                                )}

                                {/* Quick Direct Phone Contact */}
                                {Boolean(booking?.phone && String(booking.phone).trim() && String(booking.phone).trim() !== '-' && String(booking.phone).trim() !== 'null' && String(booking.phone).trim() !== 'undefined') && (
                                    <a
                                        href={`tel:${booking.phone}`}
                                        className="flex items-center gap-1 px-2 py-1 rounded-lg bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-400/30 text-emerald-200 text-[9px] font-mono transition-colors"
                                        title={`Call Guest (${booking.phone})`}
                                    >
                                        <Phone size={10} className="text-emerald-300" />
                                        <span>{booking.phone}</span>
                                    </a>
                                )}
                            </div>

                            {/* Status Indicator */}
                            <div className="flex items-center gap-1.5 flex-shrink-0">
                                <span className={`px-2.5 py-1 rounded-lg border text-[9.5px] font-black uppercase tracking-wider flex items-center gap-1.5 shadow-2xs ${statusBadgeConfig.bg}`}>
                                    <span className={`w-1.5 h-1.5 rounded-full ${statusBadgeConfig.dot} animate-pulse`} />
                                    <span>{activeStatus}</span>
                                </span>
                            </div>
                        </div>

                        {/* Section 2: Stay Timeline & Journey Card */}
                        <div className="bg-gradient-to-r from-blue-950/60 via-slate-900/60 to-blue-950/60 border border-white/10 rounded-xl p-2.5 shadow-xs">
                            <div className="grid grid-cols-12 items-center gap-2">
                                {/* Check-In Arrival */}
                                <div className="col-span-5 flex items-center gap-2 min-w-0">
                                    <div className="w-7 h-7 rounded-lg bg-emerald-500/20 border border-emerald-400/30 flex items-center justify-center text-emerald-300 flex-shrink-0">
                                        <LogIn size={13} />
                                    </div>
                                    <div className="min-w-0">
                                        <div className="text-[8px] uppercase tracking-wider text-blue-200/80 font-bold flex items-center gap-1">
                                            <span>Check-In</span>
                                            {showSplitTotal && <span className="text-[7px] text-emerald-300 font-bold">(1st Leg)</span>}
                                        </div>
                                        <div className="text-[10px] font-mono font-bold text-white truncate">{displayArrival}</div>
                                        <div className="text-[8px] text-emerald-200/80 font-mono flex items-center gap-0.5">
                                            <Clock size={8.5} className="opacity-80" />
                                            <span>16:00 Check-In</span>
                                        </div>
                                    </div>
                                </div>

                                {/* Center Duration & Journey Connector */}
                                <div className="col-span-2 flex flex-col items-center justify-center text-center">
                                    <div className="px-2 py-0.5 rounded-full bg-white/10 border border-white/15 flex items-center gap-1 shadow-2xs">
                                        <Moon size={9} className="text-amber-300" />
                                        <span className="text-[9px] font-black text-white font-mono">{displayNights}</span>
                                        <span className="text-[7.5px] text-blue-200 uppercase font-medium">{displayNights === 1 ? 'Nt' : 'Nts'}</span>
                                    </div>
                                    <div className="flex items-center justify-center w-full mt-1 text-blue-300/60">
                                        <div className="h-[1px] w-3 bg-blue-300/30" />
                                        <ArrowRight size={10} className="mx-0.5 text-blue-300/80" />
                                        <div className="h-[1px] w-3 bg-blue-300/30" />
                                    </div>
                                    {showSplitTotal && <span className="text-[6.5px] text-purple-200 uppercase font-bold mt-0.5">Total Stay</span>}
                                </div>

                                {/* Check-Out Departure */}
                                <div className="col-span-5 flex items-center justify-end gap-2 min-w-0 text-right">
                                    <div className="min-w-0">
                                        <div className="text-[8px] uppercase tracking-wider text-blue-200/80 font-bold flex items-center justify-end gap-1">
                                            {showSplitTotal && <span className="text-[7px] text-rose-300 font-bold">(Final)</span>}
                                            <span>Check-Out</span>
                                        </div>
                                        <div className="text-[10px] font-mono font-bold text-white truncate">{displayDeparture}</div>
                                        <div className="text-[8px] text-rose-200/80 font-mono flex items-center justify-end gap-0.5">
                                            <Clock size={8.5} className="opacity-80" />
                                            <span>12:00 Check-Out</span>
                                        </div>
                                    </div>
                                    <div className="w-7 h-7 rounded-lg bg-rose-500/20 border border-rose-400/30 flex items-center justify-center text-rose-300 flex-shrink-0">
                                        <LogOut size={13} />
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Section 3: Room, Rate Plan & Occupancy Specification Grid */}
                        <div className="grid grid-cols-2 gap-2">
                            {/* Column 1: Room & Occupancy */}
                            <div className="bg-white/[0.06] hover:bg-white/[0.08] border border-white/10 rounded-xl p-2.5 flex flex-col justify-between shadow-xs transition-colors">
                                <div>
                                    <div className="flex items-center justify-between pb-1.5 border-b border-white/10">
                                        <div className="flex items-center gap-1.5 min-w-0">
                                            <div className="w-5 h-5 rounded-md bg-blue-500/20 text-blue-200 flex items-center justify-center shrink-0">
                                                <BedDouble size={11} />
                                            </div>
                                            <span className="text-[8px] uppercase tracking-wider text-blue-200/80 font-bold">Room Allocation</span>
                                        </div>
                                        {isSplitStay ? (
                                            <span className="text-[7.5px] px-1.5 py-0.2 rounded bg-purple-500/30 text-purple-200 border border-purple-400/30 font-bold">
                                                {showSplitTotal ? `${resolvedGroupRooms.length} Rooms` : 'Split Leg'}
                                            </span>
                                        ) : isConnectingSuite ? (
                                            <span className="text-[7.5px] px-1.5 py-0.2 rounded bg-indigo-500/30 text-indigo-200 border border-indigo-400/30 font-bold">
                                                Connected
                                            </span>
                                        ) : null}
                                    </div>
                                    <div className="mt-1.5">
                                        <div className="text-[10px] font-bold text-white truncate">
                                            {showSplitTotal
                                                ? `Sequential: ${splitStayMeta.roomSequence.map(r => r.roomNumber).join(' ➔ ')}`
                                                : isConnectingSuite
                                                    ? `${resolvedGroupRooms.map((r: any) => r.roomNumber).join(' + ') || activeRoomNum} (${activeRoomType})`
                                                    : `Room ${activeRoomNum} • ${activeRoomType}`}
                                        </div>
                                        {/* Room Readiness & Floor Tag */}
                                        <div className="flex items-center gap-1 mt-1 flex-wrap">
                                            <span className={`text-[7.5px] px-1.5 py-0.2 rounded font-bold border flex items-center gap-1 ${
                                                housekeepingStatus.toUpperCase().includes('DIRTY')
                                                    ? 'bg-amber-500/20 text-amber-200 border-amber-400/30'
                                                    : housekeepingStatus.toUpperCase().includes('MAINT') || housekeepingStatus.toUpperCase().includes('OUT')
                                                        ? 'bg-rose-500/20 text-rose-200 border-rose-400/30'
                                                        : 'bg-emerald-500/20 text-emerald-200 border-emerald-400/30'
                                            }`}>
                                                <Sparkles size={8.5} />
                                                <span>{housekeepingStatus.toUpperCase().includes('DIRTY') ? 'Dirty (Cleaning)' : 'Clean & Inspected'}</span>
                                            </span>
                                            {roomFloorDisplay && (
                                                <span className="text-[7.5px] px-1.5 py-0.2 rounded bg-white/10 text-blue-200 border border-white/10 font-medium">
                                                    {roomFloorDisplay}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                {/* Occupancy Specification Row */}
                                <div className="mt-2 pt-1.5 border-t border-white/10 flex items-center justify-between">
                                    <div className="flex items-center gap-1.5 min-w-0">
                                        <Users size={11} className="text-cyan-300 shrink-0" />
                                        <span className="text-[8px] text-blue-200/80 uppercase font-semibold tracking-wider">
                                            Occupancy
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-1.5 shrink-0">
                                        <span className="text-[9.5px] font-bold text-white font-mono">
                                            {amendAdults} {amendAdults === 1 ? 'Adult' : 'Adults'}{amendChildren > 0 ? `, ${amendChildren} ${amendChildren === 1 ? 'Child' : 'Children'}` : ''}
                                        </span>
                                        <span className="text-[7.5px] px-1.5 py-0.2 rounded bg-white/10 text-cyan-200 border border-white/15 font-mono">
                                            Max {capacity.maxOccupancy}
                                        </span>
                                    </div>
                                </div>
                            </div>

                            {/* Column 2: Rate Plan & Tariff */}
                            <div className="bg-white/[0.06] hover:bg-white/[0.08] border border-white/10 rounded-xl p-2.5 flex flex-col justify-between shadow-xs transition-colors">
                                <div>
                                    <div className="flex items-center justify-between pb-1.5 border-b border-white/10">
                                        <div className="flex items-center gap-1.5 min-w-0">
                                            <div className="w-5 h-5 rounded-md bg-amber-500/20 text-amber-200 flex items-center justify-center shrink-0">
                                                <Tag size={11} />
                                            </div>
                                            <span className="text-[8px] uppercase tracking-wider text-blue-200/80 font-bold">Rate Plan</span>
                                        </div>
                                        <span className="text-[7.5px] px-1.5 py-0.2 rounded bg-amber-400/20 text-amber-200 border border-amber-400/30 font-bold">
                                            BAR
                                        </span>
                                    </div>
                                    <div className="mt-1.5">
                                        <div className="text-[10px] font-bold text-white truncate" title={activeRatePlan}>
                                            {activeRatePlan}
                                        </div>
                                        <div className="text-[7.5px] text-blue-200/70 truncate mt-0.5">
                                            Buffet Breakfast & Wi-Fi Incl.
                                        </div>
                                        {/* Board Basis & Meal Plan Tag */}
                                        <div className="mt-1 flex items-center gap-1">
                                            <span className={`text-[7.5px] px-1.5 py-0.2 rounded border font-bold flex items-center gap-1 ${boardBasisCode.color}`}>
                                                <span>{boardBasisCode.name}</span>
                                            </span>
                                        </div>
                                    </div>
                                </div>

                                {/* ADR Section */}
                                <div className="mt-2 pt-1.5 border-t border-white/10 flex items-center justify-between">
                                    <div className="flex items-center gap-1.5">
                                        <DollarSign size={11} className="text-emerald-300" />
                                        <span className="text-[8px] text-blue-200/80 uppercase font-semibold">
                                            {showSplitTotal ? 'Blended ADR' : 'Daily Rate (ADR)'}
                                        </span>
                                    </div>
                                    <div className="font-mono font-bold text-[9.5px] text-white">
                                        {currencySymbol} {displayDailyRate.toFixed(2)} <span className="text-[7.5px] font-normal text-blue-200/70">/ nt</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Guest Special Request & Preferences Banner */}
                        {booking?.specialRequests && (
                            <div className="bg-amber-500/10 border border-amber-400/30 rounded-xl px-2.5 py-2 flex items-center gap-2 shadow-xs">
                                <div className="w-5 h-5 rounded-md bg-amber-500/25 border border-amber-400/30 flex items-center justify-center text-amber-300 shrink-0">
                                    <Bell size={11} />
                                </div>
                                <div className="min-w-0 flex-1">
                                    <div className="text-[7.5px] uppercase tracking-wider font-bold text-amber-300 flex items-center justify-between">
                                        <span>Special Requests & Preferences</span>
                                        <span className="text-[7px] px-1 rounded bg-amber-400/20 text-amber-200 font-mono">HIGH PRIORITY</span>
                                    </div>
                                    <div className="text-[8.5px] text-amber-100 font-medium truncate mt-0.5" title={booking.specialRequests}>
                                        {booking.specialRequests}
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Section 4: Executive Financial Folio Breakdown Card */}
                        <div className="bg-white/[0.06] border border-white/10 rounded-xl p-2.5 space-y-2 text-[8px] shadow-xs">
                            {/* Card Header */}
                            <div className="flex items-center justify-between pb-1.5 border-b border-white/10">
                                <div className="flex items-center gap-1.5">
                                    <div className="w-5 h-5 rounded-md bg-blue-500/20 flex items-center justify-center text-blue-200 shrink-0">
                                        <Receipt size={11} />
                                    </div>
                                    <span className="text-[9px] font-bold text-white">
                                        {showSplitTotal
                                            ? 'Master Folio Financial Summary'
                                            : (isSplitStay && resolvedGroupRooms.length > 1 ? 'Leg Tariff & Folio Breakdown' : 'Folio Tariff Breakdown')}
                                    </span>
                                </div>
                                <div className="flex items-center gap-1">
                                    {isTaxApplicable ? (
                                        <span className="text-[7px] px-1.5 py-0.2 rounded font-mono font-bold bg-emerald-500/20 text-emerald-200 border border-emerald-400/30">
                                            TAX: {taxConfigCode}
                                        </span>
                                    ) : (
                                        <span className="text-[7px] px-1.5 py-0.2 rounded font-bold bg-amber-500/20 text-amber-200 border border-amber-400/30">
                                            TAX EXEMPT
                                        </span>
                                    )}
                                    {showSplitTotal && resolvedGroupRooms.length > 1 && (
                                        <span className="text-[7px] px-1.5 py-0.2 rounded font-mono font-bold bg-purple-500/30 text-purple-200 border border-purple-400/30">
                                            {resolvedGroupRooms.length} Rooms Total
                                        </span>
                                    )}
                                </div>
                            </div>

                            {/* Line Items */}
                            <div className="space-y-1.5">
                                {/* Base Tariff */}
                                <div className="flex items-center justify-between text-blue-100">
                                    <span className="flex items-center gap-1">
                                        <span>Base Accommodation</span>
                                        <span className="text-blue-300/70 font-mono text-[7.5px]">({displayNights} {displayNights === 1 ? 'Night' : 'Nights'} × {currencySymbol}{displayDailyRate.toFixed(2)})</span>
                                    </span>
                                    <span className="font-mono text-white font-bold">{currencySymbol} {displayBase.toFixed(2)}</span>
                                </div>

                                {/* Taxes & Levies */}
                                {isTaxApplicable && displayTax > 0 ? (
                                    <div className="bg-black/25 rounded-lg p-2 border border-white/10 space-y-1.5">
                                        <div className="flex items-center justify-between text-blue-200">
                                            <span className="flex items-center gap-1 font-bold text-emerald-300 text-[8.5px]">
                                                <ShieldCheck size={11} className="text-emerald-400" />
                                                <span>Statutory Taxes &amp; Levies</span>
                                            </span>
                                            <span className="font-mono font-bold text-emerald-300 text-[9px]">+{currencySymbol} {displayTax.toFixed(2)}</span>
                                        </div>
                                        {displayTaxBreakdown && displayTaxBreakdown.length > 0 ? (
                                            <div className="flex flex-wrap items-center gap-1.5 text-blue-200 text-[8px] border-t border-white/10 pt-1">
                                                {displayTaxBreakdown.map((item: any, idx: number) => (
                                                    <span key={idx} className="inline-flex items-center gap-1 bg-white/[0.08] px-1.5 py-0.5 rounded border border-white/10">
                                                        <span className="text-blue-200 font-medium">{item.name || item.code} ({item.rate}%):</span>
                                                        <strong className="text-white font-mono font-bold">+{currencySymbol}{Number(item.amount).toFixed(2)}</strong>
                                                    </span>
                                                ))}
                                            </div>
                                        ) : (
                                            <div className="flex items-center justify-between text-blue-200/90 text-[8px] border-t border-white/10 pt-1">
                                                {displayServiceCharge > 0 && (
                                                    <span>Service Charge: <strong className="text-white font-mono">+{currencySymbol} {displayServiceCharge.toFixed(2)}</strong></span>
                                                )}
                                                {displayVat > 0 && (
                                                    <span>VAT: <strong className="text-white font-mono">+{currencySymbol} {displayVat.toFixed(2)}</strong></span>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                ) : (
                                    <div className="flex items-center justify-between text-amber-200 text-[7.5px] bg-amber-500/10 px-2 py-0.5 rounded border border-amber-400/20">
                                        <span>Tax Exemption Policy:</span>
                                        <span className="font-semibold">0.00% Zero-Rated</span>
                                    </div>
                                )}

                                {/* Grand Total & Advance Paid */}
                                <div className="flex items-center justify-between text-white font-bold pt-1 border-t border-white/10">
                                    <span className="text-[8.5px]">Grand Total (Gross Folio)</span>
                                    <span className="font-mono text-[10px] text-white font-black">{currencySymbol} {displayGrandTotal.toFixed(2)}</span>
                                </div>

                                <div className="flex items-center justify-between text-blue-200/90">
                                    <div className="flex items-center gap-1">
                                        <CreditCard size={9.5} className="text-emerald-400" />
                                        <span>Advance Deposits Paid</span>
                                    </div>
                                    <span className="font-mono text-emerald-300 font-bold">-{currencySymbol} {displayPaid.toFixed(2)}</span>
                                </div>
                            </div>

                            {/* High-Visibility Net Due Ribbon */}
                            <div className={`p-2 rounded-xl flex items-center justify-between border transition-all ${
                                displayDue > 0
                                    ? 'bg-gradient-to-r from-amber-950/40 via-blue-950/50 to-amber-950/40 border-amber-400/40 shadow-xs'
                                    : 'bg-gradient-to-r from-emerald-950/40 via-blue-950/50 to-emerald-950/40 border-emerald-400/40 shadow-xs'
                            }`}>
                                <div className="flex items-center gap-2">
                                    <div className={`w-6 h-6 rounded-lg flex items-center justify-center shrink-0 ${
                                        displayDue > 0 ? 'bg-amber-500/25 text-amber-300' : 'bg-emerald-500/25 text-emerald-300'
                                    }`}>
                                        <Wallet size={12} />
                                    </div>
                                    <div>
                                        <div className="text-[7.5px] uppercase tracking-wider text-blue-200/80 font-bold">
                                            Net Balance Due
                                        </div>
                                        <div className="flex items-center gap-1 mt-0.2">
                                            <span className={`text-[7px] px-1 py-0.2 rounded font-extrabold uppercase ${
                                                displayDue > 0 ? 'bg-amber-500/20 text-amber-300 border border-amber-400/30' : 'bg-emerald-500/20 text-emerald-300 border border-emerald-400/30'
                                            }`}>
                                                {displayDue > 0 ? 'Payment Pending' : 'Fully Settled'}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <div className={`font-mono font-black text-[12px] tracking-tight ${
                                        displayDue > 0 ? 'text-amber-300' : 'text-emerald-400'
                                    }`}>
                                        {currencySymbol} {displayDue.toFixed(2)}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* RIGHT COLUMN: Reservation List Panel OR Active Action Mode Form */}
                        <div className={`${mode === 'move' ? 'col-span-6' : 'col-span-5'} h-full flex flex-col min-h-0 bg-[#0e3592]`}>
                            {mode === 'overview' ? (
                                /* RESERVATION LIST PANEL (matching media_1792966125811_cc345f83.png) */
                                <div className="h-full flex flex-col min-h-0">
                                    {/* Header: Rate Plan / Split Stay Title + Compact Actions */}
                                    <div className="px-3 py-2 flex items-center justify-between border-b border-blue-400/20 flex-shrink-0 bg-[#0c2e7a]/50">
                                        <div className="min-w-0 pr-1.5">
                                            <div className="flex items-center gap-1.5 flex-wrap">
                                                {isConnectingSuite ? (
                                                    <>
                                                        <span className="px-1.5 py-0.5 rounded bg-indigo-500/40 border border-indigo-400/40 text-indigo-100 text-[8.5px] font-extrabold flex items-center gap-1 shrink-0">
                                                            Connected Suite
                                                        </span>
                                                        <span className="text-[9.5px] font-bold text-white truncate">Rooms {resolvedGroupRooms[0]?.roomNumber || activeRoomNum}</span>
                                                    </>
                                                ) : isSplitStay ? (
                                                    <>
                                                        <span className="px-1.5 py-0.5 rounded bg-purple-500/40 border border-purple-400/40 text-purple-100 text-[8.5px] font-extrabold flex items-center gap-1 shrink-0">
                                                            <GitFork size={10} className="text-purple-200" />
                                                            <span>Split Stay</span>
                                                        </span>
                                                        <span className="text-[9.5px] font-bold text-white truncate">({resolvedGroupRooms.length} Segments)</span>
                                                    </>
                                                ) : (
                                                    <span className="text-[10px] font-bold text-white truncate">
                                                        {(booking.source?.toUpperCase() === 'WHATSAPP' || booking.channel?.toUpperCase() === 'WHATSAPP') ? 'GUESTFLOW AI' : (booking.source?.toUpperCase() || 'DIRECT')} ({resolvedGroupRooms.length})
                                                    </span>
                                                )}
                                            </div>
                                            {isSplitStay ? (
                                                <div className="text-[7.5px] font-mono text-purple-200/80 mt-0.5 truncate">
                                                    Res #{booking.reservationNumber} • Sequential Move
                                                </div>
                                            ) : booking.groupCode ? (
                                                <div className="text-[7.5px] font-mono text-blue-200/90 mt-0.5 truncate">
                                                    Group Code: <span className="font-bold text-white">{booking.groupCode}</span>
                                                </div>
                                            ) : null}
                                        </div>
                                        {!isConnectingSuite && (
                                            <div className="flex items-center gap-1 flex-shrink-0">
                                                <button
                                                    type="button"
                                                    onClick={() => setMode('link_group')}
                                                    className="h-5.5 px-2 bg-blue-500/25 hover:bg-blue-500/40 text-blue-100 border border-blue-400/30 rounded text-[8.5px] font-bold flex items-center gap-1 transition-colors cursor-pointer shadow-2xs"
                                                    title="Link an existing reservation into this group without modifying its confirmation number"
                                                >
                                                    <LinkIcon size={9} />
                                                    <span>Link</span>
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => setMode('add_booking')}
                                                    className="h-5.5 px-2 bg-white/10 hover:bg-white/20 text-white border border-white/20 rounded text-[8.5px] font-bold flex items-center gap-1 transition-colors cursor-pointer shadow-2xs"
                                                    title="Add a new room booking"
                                                >
                                                    <Plus size={9} />
                                                    <span>+ Room</span>
                                                </button>
                                            </div>
                                        )}
                                    </div>

                                    {/* Scrollable Room Cards List (matching media_1792966125811_cc345f83.png) */}
                                    <div className="flex-1 overflow-y-auto custom-scrollbar p-3 space-y-2.5 min-h-0">
                                        {resolvedGroupRooms.map((rm: any, idx: number) => {
                                            const isSelected = String(rm.roomNumber) === String(activeRoomNum);
                                            const rmStatus = (rm.status || 'CONFIRMED').toUpperCase();
                                            const isRoomInHouse = rmStatus === 'IN-HOUSE' || rmStatus === 'ARRIVED' || rmStatus === 'STAYOVER';
                                            const isRoomConfirmed = rmStatus === 'CONFIRMED' || rmStatus === 'ARRIVING';
                                            // Split Stay Rule: same guest moving rooms → same master reservation number
                                            const isDrawerSplitStay = isSplitStay && resolvedGroupRooms.length > 1;
                                            const rmResNo = rm.reservationNumber || rm.subBookingNumber || (isDrawerSplitStay ? booking.reservationNumber : (resolvedGroupRooms.length > 1 ? `${booking.reservationNumber}-${String(idx + 1).padStart(2, '0')}` : booking.reservationNumber));
                                            const rmRegNo = rm.registrationNumber || (isRoomInHouse ? generateRegistrationNumber(rmResNo) : undefined);
                                            const hasExplicitPrimary = resolvedGroupRooms.some((r: any) => Boolean(r.isPrimary));
                                            const isPrimaryOwner = hasExplicitPrimary ? Boolean(rm.isPrimary) : idx === 0;

                                            return (
                                                <div
                                                    key={`${rm.roomNumber}-${rmResNo}-${idx}`}
                                                    onClick={() => setActiveRoomNumber(String(rm.roomNumber))}
                                                    className={`p-2.5 rounded-xl border transition-all cursor-pointer select-none relative overflow-hidden ${
                                                        isSelected
                                                            ? 'bg-blue-600/35 border-blue-300 ring-2 ring-blue-400/70 shadow-md'
                                                            : 'bg-white/[0.06] hover:bg-white/[0.12] border-white/10'
                                                    }`}
                                                >
                                                    {/* Active Selection Glow Accent */}
                                                    {isSelected && (
                                                        <div className="absolute top-0 left-0 bottom-0 w-1 bg-gradient-to-b from-blue-300 via-indigo-400 to-blue-500 rounded-l-xl" />
                                                    )}

                                                    <div className="flex items-center justify-between gap-1.5">
                                                        <div className="flex items-center gap-1.5 min-w-0">
                                                            <span className="text-[10.5px] font-bold text-white truncate">
                                                                {rm.guestName || booking.guestName}
                                                            </span>
                                                            {!isDrawerSplitStay && resolvedGroupRooms.length > 1 && isPrimaryOwner && (
                                                                <span title="Primary Booker / Group Owner">
                                                                    <Crown size={11} className="text-amber-300 fill-amber-300 shrink-0" />
                                                                </span>
                                                            )}
                                                            {isDrawerSplitStay && resolvedGroupRooms.length > 1 && (
                                                                <span className="text-[7.5px] px-1.5 py-0.2 rounded bg-purple-500/30 text-purple-200 border border-purple-400/30 font-bold shrink-0">
                                                                    Leg {idx + 1}/{resolvedGroupRooms.length}
                                                                </span>
                                                            )}
                                                        </div>
                                                        <span className={`text-[7.5px] px-2 py-0.5 rounded uppercase font-black tracking-wider shadow-2xs shrink-0 ${
                                                            isRoomInHouse
                                                                ? 'bg-emerald-500/25 text-emerald-200 border border-emerald-400/30'
                                                                : isRoomConfirmed
                                                                    ? 'bg-blue-500/25 text-blue-200 border border-blue-400/30'
                                                                    : 'bg-slate-500/25 text-slate-200 border border-slate-400/30'
                                                        }`}>
                                                            {rmStatus}
                                                        </span>
                                                    </div>

                                                    <div className="flex items-center justify-between text-[8.5px] text-blue-200/90 font-mono mt-1">
                                                        <div className="flex items-center gap-1 truncate">
                                                            <span className="text-blue-300/70 text-[7.5px] uppercase font-sans">Reservation:</span>
                                                            <span className="text-white font-semibold">{rmResNo}</span>
                                                        </div>
                                                        {(() => {
                                                            const segIn = rm.checkIn || rm.checkInDate || booking.arrivalDate;
                                                            const segOut = rm.checkOut || rm.checkOutDate || booking.departureDate;
                                                            const calcNights = segIn && segOut
                                                                ? Math.max(1, Math.round((new Date(segOut).getTime() - new Date(segIn).getTime()) / (1000 * 3600 * 24)))
                                                                : (rm.nights || 1);
                                                            return segIn ? (
                                                                <div className="text-[8.5px] text-blue-200 font-sans flex items-center gap-1 shrink-0">
                                                                    <Calendar size={9} className="text-blue-400" />
                                                                    <span>{segIn.slice(5)} → {(segOut || '').slice(5)}</span>
                                                                    <span className="text-[7px] px-1 py-0.2 rounded bg-white/10 text-white font-bold font-mono">
                                                                        {calcNights} {calcNights === 1 ? 'nt' : 'nts'}
                                                                    </span>
                                                                </div>
                                                            ) : null;
                                                        })()}
                                                    </div>

                                                    <div className="flex items-center gap-1.5 mt-2 flex-wrap text-[8.5px]">
                                                        {rm.isConnecting ? (
                                                            <span className="px-2 py-0.5 rounded-md bg-indigo-500/30 text-indigo-100 border border-indigo-400/40 font-bold flex items-center gap-1">
                                                                <BedDouble size={10} className="text-indigo-300" />
                                                                <span>Rooms {rm.roomNumber}</span>
                                                            </span>
                                                        ) : (
                                                            <span className={`px-2 py-0.5 rounded-md border font-semibold flex items-center gap-1 ${
                                                                isSelected
                                                                    ? 'bg-blue-500/30 text-white border-blue-400/50'
                                                                    : 'bg-white/10 text-blue-100 border-white/15'
                                                            }`}>
                                                                <BedDouble size={10} className="text-blue-300" />
                                                                <span>Room {rm.roomNumber || 'Unassigned'} ({rm.roomType || activeRoomType || 'Deluxe Suite'})</span>
                                                            </span>
                                                        )}
                                                        <span className="px-1.5 py-0.5 rounded-md bg-white/10 text-blue-200 border border-white/10 font-medium flex items-center gap-1">
                                                            <Users size={9.5} className="text-cyan-300" />
                                                            <span>Pax {rm.adults ?? 2}{rm.children ? `, ${rm.children}` : ''}</span>
                                                        </span>
                                                        {rmRegNo && (
                                                            <span className="px-1.5 py-0.5 rounded-md bg-emerald-500/20 text-emerald-200 border border-emerald-400/30 font-mono font-bold">
                                                                GRC: {rmRegNo}
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>

                                    {/* Overview Footer */}
                                    <div className="flex-shrink-0 px-2.5 py-2 bg-gradient-to-r from-[#0a235c] via-[#0d2f7d] to-[#0a235c] border-t border-blue-400/30 shadow-lg flex items-center justify-between gap-1.5 relative z-20 overflow-x-auto no-scrollbar">
                                        {/* Status-Aware Dynamic Print Action Button */}
                                        <div className="relative shrink-0">
                                            <div className="inline-flex rounded-md shadow-xs overflow-hidden border border-white/20">
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
                                                    className="h-7 px-2 bg-white/10 hover:bg-white/20 text-white text-[8.5px] font-semibold flex items-center gap-1 transition-colors cursor-pointer border-r border-white/15 shrink-0"
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
                                                    <Printer size={11} />
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
                                                    className="h-7 px-1.5 bg-white/10 hover:bg-white/20 text-white text-[8.5px] flex items-center justify-center transition-colors cursor-pointer shrink-0"
                                                    title="More print document options"
                                                >
                                                    <ChevronDown size={10} className={`transition-transform duration-150 ${isPrintMenuOpen ? 'rotate-180' : ''}`} />
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

                                        <div className="flex items-center gap-1.5 shrink-0 ml-auto flex-nowrap">
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
                                                        className={`h-7 px-2.5 rounded-md text-[8.5px] font-bold flex items-center gap-1 transition-all shadow-xs cursor-pointer shrink-0 ${
                                                            isRoomUnassignedActive
                                                                ? 'bg-slate-300 text-slate-500 cursor-not-allowed opacity-60'
                                                                : 'bg-emerald-600 hover:bg-emerald-500 text-white active:scale-95'
                                                        }`}
                                                        title={isRoomUnassignedActive ? 'Cannot check in: Room is unassigned. Assign a room first.' : 'Check In active room'}
                                                    >
                                                        <DoorOpen size={11} />
                                                        <span>Check In</span>
                                                        {isRoomUnassignedActive && <span className="text-[7.5px] px-1 py-0.2 rounded bg-amber-100 text-amber-800">Unassigned</span>}
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
                                                    className="h-7 px-2.5 bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-500 hover:to-amber-400 text-white rounded-md text-[8.5px] font-bold flex items-center gap-1 cursor-pointer transition-all shadow-xs active:scale-95 shrink-0"
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
                                                    className="h-7 px-2 bg-teal-600 hover:bg-teal-500 text-white rounded-md text-[8.5px] font-bold flex items-center gap-1 cursor-pointer transition-all shadow-xs active:scale-95 shrink-0"
                                                    title="Encode RFID Keycard"
                                                >
                                                    <Key size={11} />
                                                    <span>{isIssuingKeycard ? 'Encoding...' : 'Keycard'}</span>
                                                </button>
                                            )}
                                            <button
                                                type="button"
                                                onClick={() => setMode('send_confirmation')}
                                                className="h-7 px-2 bg-emerald-700 hover:bg-emerald-600 text-white rounded-md text-[8.5px] font-bold flex items-center gap-1 cursor-pointer transition-all shadow-xs active:scale-95 shrink-0"
                                                title="Send Official Confirmation Voucher via WhatsApp & Email"
                                            >
                                                <Send size={10} />
                                                <span>Send Voucher</span>
                                            </button>
                                            <button
                                                type="button"
                                                onClick={onClose}
                                                className="h-7 px-2.5 bg-white/15 hover:bg-white/25 text-white border border-white/25 rounded-md text-[8.5px] font-bold transition-all cursor-pointer shadow-xs active:scale-95 flex items-center gap-1 shrink-0"
                                            >
                                                <X size={11} />
                                                <span>Close</span>
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
                                    <div className="flex-1 overflow-y-auto custom-scrollbar p-3 space-y-2.5 min-h-0">
                                {/* MODE 1: AMEND STAY (media_1792541010797_b7d6f151.png) */}
                                {mode === 'amend' && (
                                    <div className="space-y-2">
                                        {/* SPLIT STAY MULTI-SEGMENT ITINERARY EDITOR */}
                                        {splitStaySegments.length > 1 ? (
                                            <div className="space-y-2">
                                                {/* Route Overview Header */}
                                                <div className="bg-[#1b43aa]/90 border border-purple-400/30 rounded-lg p-2 space-y-1.5 shadow-sm">
                                                    <div className="flex items-center justify-between text-[9px]">
                                                        <span className="font-bold text-white flex items-center gap-1">
                                                            <GitFork size={12} className="text-purple-300" />
                                                            <span>Split Stay Itinerary ({splitStaySegments.length} Rooms • {splitStaySegments.reduce((sum, s) => sum + (s.nights || 1), 0)} Nights)</span>
                                                        </span>
                                                        <span className="px-1.5 py-0.5 rounded text-[8px] font-bold bg-purple-500/30 text-purple-200 border border-purple-400/40">
                                                            Contiguous Ripple Active
                                                        </span>
                                                    </div>

                                                    {/* Sequential Route Flow Pills */}
                                                    <div className="flex items-center gap-1 overflow-x-auto no-scrollbar py-0.5">
                                                        {splitStaySegments.map((s, idx) => (
                                                            <React.Fragment key={s.id || idx}>
                                                                <div className="px-2 py-0.5 rounded bg-blue-900/80 border border-blue-400/40 text-white font-mono text-[8px] shrink-0 font-semibold flex items-center gap-1">
                                                                    <span>Rm {s.roomNumber}</span>
                                                                    <span className="text-purple-300">({s.nights || 1}N)</span>
                                                                </div>
                                                                {idx < splitStaySegments.length - 1 && (
                                                                    <ArrowRight size={10} className="text-purple-300 shrink-0" />
                                                                )}
                                                            </React.Fragment>
                                                        ))}
                                                    </div>
                                                </div>

                                                {/* Interactive Leg-by-Leg Cards */}
                                                <div className="space-y-1.5 max-h-[220px] overflow-y-auto custom-scrollbar pr-0.5">
                                                    {splitStaySegments.map((seg, idx) => {
                                                        const avail = getAvailableRoomsForStay(seg.fromDate, seg.toDate, undefined, {
                                                            excludeReservationId: booking.reservationNumber || booking.id
                                                        });
                                                        const rmStatus = avail.allRoomsStatus.find(s => String(s.room.number) === String(seg.roomNumber));
                                                        const isAvail = rmStatus?.isAvailable ?? true;
                                                        const isFirst = idx === 0;
                                                        const isLast = idx === splitStaySegments.length - 1;

                                                        return (
                                                            <div key={seg.id || idx} className="bg-[#1b43aa]/90 border border-blue-400/30 rounded-lg p-2 space-y-1.5 shadow-xs">
                                                                {/* Leg Header & Live Availability */}
                                                                <div className="flex items-center justify-between gap-1">
                                                                    <div className="flex items-center gap-1.5 min-w-0">
                                                                        <span className="px-1.5 py-0.5 rounded text-[8px] font-bold bg-purple-500/30 text-purple-200 border border-purple-400/40 shrink-0 flex items-center gap-1">
                                                                            <GitFork size={9} className="text-purple-300" />
                                                                            <span>Leg {idx + 1} of {splitStaySegments.length}</span>
                                                                        </span>
                                                                        <span className="text-[9.5px] font-bold text-white font-mono truncate">
                                                                            Room {seg.roomNumber}
                                                                        </span>
                                                                        <span className="text-[8px] text-blue-200 truncate">
                                                                            ({seg.roomType})
                                                                        </span>
                                                                    </div>
                                                                    <span className={`px-1.5 py-0.5 rounded text-[7.5px] font-bold shrink-0 border ${
                                                                        isAvail
                                                                            ? 'bg-emerald-500/20 text-emerald-300 border-emerald-400/40'
                                                                            : 'bg-rose-500/20 text-rose-300 border-rose-400/40'
                                                                    }`}>
                                                                        {isAvail ? 'Available ✓' : 'Collision ⚠️'}
                                                                    </span>
                                                                </div>

                                                                {/* 3-Column Dates & Nights Stepper */}
                                                                <div className="grid grid-cols-[1fr_1fr_84px] gap-1.5 items-end">
                                                                    <div className="flex flex-col gap-0.5">
                                                                        <label className="text-[7.5px] text-blue-200 font-semibold">
                                                                            Check-In {isFirst && isBookingInHouse && <span className="text-amber-300">(Locked)</span>}:
                                                                        </label>
                                                                        {isFirst ? (
                                                                            <input
                                                                                type="date"
                                                                                value={seg.fromDate}
                                                                                disabled={isBookingInHouse}
                                                                                onChange={e => handleUpdateSplitStayArrival(e.target.value)}
                                                                                className={`w-full h-6 px-1.5 rounded text-[8.5px] font-bold outline-none border ${
                                                                                    isBookingInHouse
                                                                                        ? 'bg-[#122e75] text-gray-300 border-blue-400/30 cursor-not-allowed'
                                                                                        : 'bg-white text-gray-900 border-blue-300 cursor-pointer'
                                                                                }`}
                                                                            />
                                                                        ) : (
                                                                            <div className="h-6 px-1.5 rounded bg-blue-950/60 border border-blue-400/20 text-white font-mono text-[8.5px] flex items-center">
                                                                                {seg.fromDate}
                                                                            </div>
                                                                        )}
                                                                    </div>

                                                                    <div className="flex flex-col gap-0.5">
                                                                        <label className="text-[7.5px] text-blue-200 font-semibold">Check-Out:</label>
                                                                        <div className="h-6 px-1.5 rounded bg-blue-950/60 border border-blue-400/20 text-white font-mono text-[8.5px] flex items-center">
                                                                            {seg.toDate}
                                                                        </div>
                                                                    </div>

                                                                    <div className="flex flex-col gap-0.5">
                                                                        <label className="text-[7.5px] text-blue-200 font-semibold text-center">Nights:</label>
                                                                        <div className="flex items-center h-6 rounded border border-blue-300 bg-white overflow-hidden shadow-2xs">
                                                                            <button
                                                                                type="button"
                                                                                disabled={(seg.nights || 1) <= 1}
                                                                                onClick={() => handleUpdateSplitStaySegmentNights(idx, (seg.nights || 1) - 1)}
                                                                                className="w-5 h-full bg-gray-100 hover:bg-gray-200 text-gray-700 flex items-center justify-center disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer transition-colors"
                                                                            >
                                                                                <Minus size={10} />
                                                                            </button>
                                                                            <span className="flex-1 text-center text-[9px] font-bold text-gray-900">
                                                                                {seg.nights || 1}N
                                                                            </span>
                                                                            <button
                                                                                type="button"
                                                                                onClick={() => handleUpdateSplitStaySegmentNights(idx, (seg.nights || 1) + 1)}
                                                                                className="w-5 h-full bg-gray-100 hover:bg-gray-200 text-gray-700 flex items-center justify-center cursor-pointer transition-colors"
                                                                            >
                                                                                <Plus size={10} />
                                                                            </button>
                                                                        </div>
                                                                    </div>
                                                                </div>

                                                                {/* Contiguous Ripple Note */}
                                                                {!isLast && (
                                                                    <div className="text-[7.5px] text-purple-200/90 flex items-center gap-1 pt-0.5 border-t border-blue-400/10">
                                                                        <span>⚡ Ripple: Next leg ({splitStaySegments[idx + 1]?.roomNumber}) automatically starts on {seg.toDate}</span>
                                                                    </div>
                                                                )}
                                                            </div>
                                                        );
                                                    })}
                                                </div>

                                                {/* Master Stay Trip Summary Banner */}
                                                <div className="bg-blue-950/70 border border-blue-400/30 rounded-lg p-2 text-[8.5px] flex items-center justify-between text-white font-medium">
                                                    <div>
                                                        <span className="text-blue-300">Total Stay: </span>
                                                        <span className="font-bold text-white">{splitStaySegments[0]?.fromDate} → {splitStaySegments[splitStaySegments.length - 1]?.toDate} ({splitStaySegments.reduce((sum, s) => sum + (s.nights || 1), 0)} Nights)</span>
                                                    </div>
                                                    <div>
                                                        <span className="text-blue-300">Folio Total: </span>
                                                        <span className="font-bold text-emerald-300">{currencySymbol} {splitStaySegments.reduce((sum, s) => sum + ((s.dailyRate || 0) * (s.nights || 1)), 0).toLocaleString()}</span>
                                                    </div>
                                                </div>
                                            </div>
                                        ) : (
                                            /* STANDARD SINGLE ROOM AMEND VIEW */
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
                                                <div className="bg-[#1b43aa]/80 border border-blue-400/20 rounded-lg p-2 flex items-center justify-between gap-1.5">
                                                    <div className="flex items-center gap-1.5 min-w-0">
                                                        <input
                                                            type="checkbox"
                                                            checked={amendSelectedRoom}
                                                            onChange={e => setAmendSelectedRoom(e.target.checked)}
                                                            className="w-3.5 h-3.5 rounded text-blue-600 bg-white cursor-pointer accent-blue-500 shrink-0"
                                                        />
                                                        <span className="text-[8.5px] text-white font-mono truncate font-semibold">
                                                            Room {booking.roomNumber} • {booking.reservationNumber}
                                                        </span>
                                                    </div>
                                                </div>

                                                {/* 1-Line Compact Stay Period: Arrival, Departure & Nights */}
                                                <div className="grid grid-cols-[1fr_1fr_64px] gap-2 pt-0.5">
                                                    <div className="flex flex-col gap-0.5">
                                                        <label className={`text-[8.5px] font-semibold ${isBookingInHouse ? 'text-blue-100' : 'text-white'}`}>
                                                            Arrival: {isBookingInHouse && <span className="text-[7.5px] text-amber-300 font-normal">(In-House Locked)</span>}
                                                        </label>
                                                        <input
                                                            type="date"
                                                            value={arrivalDate || booking.arrivalDate}
                                                            disabled={isBookingInHouse}
                                                            onChange={e => handleArrivalChange(e.target.value)}
                                                            className={`w-full h-7 px-2 border rounded text-[9.5px] outline-none font-medium ${
                                                                isBookingInHouse
                                                                    ? 'border-blue-400/30 bg-[#122e75] text-gray-300 cursor-not-allowed'
                                                                    : 'border-blue-300 bg-white text-gray-900 focus:ring-2 focus:ring-blue-400 cursor-pointer font-bold'
                                                            }`}
                                                        />
                                                    </div>
                                                    <div className="flex flex-col gap-0.5">
                                                        <label className="text-[8.5px] font-semibold text-white">Departure:</label>
                                                        <input
                                                            type="date"
                                                            value={departureDate}
                                                            min={isBookingInHouse ? (getOperatingSystemDate() || booking.arrivalDate) : booking.arrivalDate}
                                                            onChange={e => handleDepartureChange(e.target.value)}
                                                            className="w-full h-7 px-2 border border-blue-300 rounded text-[9.5px] bg-white text-gray-900 outline-none focus:ring-2 focus:ring-blue-400 cursor-pointer font-medium"
                                                        />
                                                    </div>
                                                    <div className="flex flex-col gap-0.5">
                                                        <label className="text-[8.5px] font-semibold text-white text-center">Nights:</label>
                                                        <input
                                                            type="number"
                                                            min={1}
                                                            value={nights}
                                                            onChange={e => handleNightsChange(Number(e.target.value))}
                                                            className="w-full h-7 px-1 text-center border border-blue-300 rounded text-[9.5px] bg-white text-gray-900 outline-none focus:ring-2 focus:ring-blue-400 font-bold"
                                                        />
                                                    </div>
                                                </div>
                                            </div>
                                        )}

                                        {/* ULTRA-COMPACT GUEST NOTIFICATION (EMAIL, SMS, WHATSAPP) */}
                                        <div className="bg-[#1b43aa]/80 border border-blue-400/30 rounded-lg p-2 space-y-1.5 mt-1 shadow-inner">
                                            {/* Header */}
                                            <div className="flex items-center justify-between border-b border-blue-400/20 pb-1">
                                                <div className="flex items-center gap-1.5 text-[10px] font-bold text-white">
                                                    <Send size={11} className="text-emerald-400 shrink-0" />
                                                    <span>Guest Notification</span>
                                                </div>
                                                <label className="flex items-center gap-1 text-[9px] text-amber-200 cursor-pointer hover:text-white transition-colors">
                                                    <input
                                                        type="checkbox"
                                                        checked={notifSilentUpdate}
                                                        onChange={e => {
                                                            const silent = e.target.checked;
                                                            setNotifSilentUpdate(silent);
                                                            if (silent) {
                                                                setNotifSendEmail(false);
                                                                setNotifSendSms(false);
                                                                setNotifSendWhatsApp(false);
                                                            } else {
                                                                setNotifSendEmail(Boolean(notifCustomEmail));
                                                                setNotifSendSms(Boolean(notifCustomPhone));
                                                                setNotifSendWhatsApp(Boolean(notifCustomPhone));
                                                            }
                                                        }}
                                                        className="w-3 h-3 rounded accent-amber-500 cursor-pointer"
                                                    />
                                                    <span className="font-semibold text-amber-200">Silent Mode</span>
                                                </label>
                                            </div>

                                            {!notifSilentUpdate ? (
                                                <div className="space-y-1.5">
                                                    {/* Row 1: Email Voucher */}
                                                    <div className={`flex items-center gap-1.5 px-2 py-1 rounded-md border transition-all ${
                                                        notifSendEmail ? 'bg-blue-900/90 border-emerald-400/50 text-white' : 'bg-blue-950/40 border-blue-400/10 text-blue-300'
                                                    }`}>
                                                        <label className="flex items-center gap-1 min-w-[65px] cursor-pointer font-bold text-[9.5px] shrink-0">
                                                            <input
                                                                type="checkbox"
                                                                checked={notifSendEmail}
                                                                onChange={e => setNotifSendEmail(e.target.checked)}
                                                                className="w-3 h-3 rounded accent-emerald-500 cursor-pointer"
                                                            />
                                                            <Mail size={11} className={notifSendEmail ? "text-emerald-400" : "text-blue-400"} />
                                                            <span>Email</span>
                                                        </label>
                                                        <input
                                                            type="email"
                                                            value={notifCustomEmail}
                                                            onChange={e => {
                                                                setNotifCustomEmail(e.target.value);
                                                                if (e.target.value && !notifSendEmail) setNotifSendEmail(true);
                                                            }}
                                                            placeholder="guest@example.com"
                                                            className="flex-1 h-5.5 px-1.5 bg-black/40 border border-blue-400/30 rounded text-[9.5px] text-white outline-none focus:border-emerald-400 transition-colors"
                                                        />
                                                    </div>

                                                    {/* Row 2: Mobile Channels (SMS & WhatsApp Shared Phone) */}
                                                    <div className={`flex items-center gap-1.5 px-2 py-1 rounded-md border transition-all ${
                                                        (notifSendSms || notifSendWhatsApp) ? 'bg-blue-900/90 border-emerald-400/50 text-white' : 'bg-blue-950/40 border-blue-400/10 text-blue-300'
                                                    }`}>
                                                        <div className="flex items-center gap-2 shrink-0">
                                                            <label className="flex items-center gap-1 cursor-pointer font-bold text-[9.5px]">
                                                                <input
                                                                    type="checkbox"
                                                                    checked={notifSendSms}
                                                                    onChange={e => setNotifSendSms(e.target.checked)}
                                                                    className="w-3 h-3 rounded accent-emerald-500 cursor-pointer"
                                                                />
                                                                <MessageSquare size={11} className={notifSendSms ? "text-emerald-400" : "text-blue-400"} />
                                                                <span>SMS</span>
                                                            </label>
                                                            <label className="flex items-center gap-1 cursor-pointer font-bold text-[9.5px]">
                                                                <input
                                                                    type="checkbox"
                                                                    checked={notifSendWhatsApp}
                                                                    onChange={e => setNotifSendWhatsApp(e.target.checked)}
                                                                    className="w-3 h-3 rounded accent-emerald-500 cursor-pointer"
                                                                />
                                                                <MessageCircle size={11} className={notifSendWhatsApp ? "text-emerald-400" : "text-blue-400"} />
                                                                <span>WhatsApp</span>
                                                            </label>
                                                        </div>
                                                        <input
                                                            type="tel"
                                                            value={notifCustomPhone}
                                                            onChange={e => {
                                                                setNotifCustomPhone(e.target.value);
                                                                if (e.target.value && !notifSendSms && !notifSendWhatsApp) setNotifSendSms(true);
                                                            }}
                                                            placeholder="+8801XXXXXXXXX"
                                                            className="flex-1 h-5.5 px-1.5 bg-black/40 border border-blue-400/30 rounded text-[9.5px] text-white outline-none focus:border-emerald-400 font-mono transition-colors"
                                                        />
                                                    </div>

                                                    {/* Row 3: Single-line Reason Dropdown */}
                                                    <div className="flex items-center gap-1.5 pt-0.5">
                                                        <span className="text-[8.5px] font-semibold text-blue-200 shrink-0">Reason:</span>
                                                        <select
                                                            value={notifReason}
                                                            onChange={e => setNotifReason(e.target.value)}
                                                            className="flex-1 h-6 px-1.5 bg-[#0f2458] border border-blue-400/40 rounded text-[9px] text-white outline-none focus:border-blue-300 cursor-pointer"
                                                        >
                                                            <option value="Guest Requested Extension">Guest Requested Extension</option>
                                                            <option value="Early Departure / Shortened Stay">Early Departure / Shortened Stay</option>
                                                            <option value="Flight / Travel Schedule Rescheduled">Flight / Travel Schedule Rescheduled</option>
                                                            <option value="Operational Room Shift / Maintenance">Operational Room Shift / Maintenance</option>
                                                            <option value="Administrative Date Correction">Administrative Date Correction</option>
                                                        </select>
                                                    </div>
                                                </div>
                                            ) : (
                                                <div className="p-1.5 bg-amber-500/10 border border-amber-400/30 rounded text-[9px] text-amber-200 flex items-center gap-1.5">
                                                    <Lock size={11} className="text-amber-400 shrink-0" />
                                                    <span>Silent Mode Active: Saved to PMS without sending notifications.</span>
                                                </div>
                                            )}
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
                                            <div className="bg-emerald-500/15 border border-emerald-400/30 rounded-lg p-2 text-emerald-200 text-[9.5px] flex items-center gap-1.5 font-medium shadow-xs">
                                                <ShieldCheck size={13} className="text-emerald-400 shrink-0" />
                                                <span>In-House Guest: Room Move applies from current System Date ({operatingSystemDate}) for the remaining stay.</span>
                                            </div>
                                        )}
                                        {/* Current Room Context Bar (Sleek, 1-Line Status Pill) */}
                                        <div className="bg-[#122e75]/90 border border-blue-400/30 rounded-lg px-3 py-1.5 flex items-center justify-between text-[10px] shadow-xs">
                                            <div className="flex items-center gap-2 text-blue-200 min-w-0">
                                                <Home size={12} className="text-blue-300 shrink-0" />
                                                <span className="truncate">
                                                    Current Room: <strong className="text-white font-mono font-bold">{isRoomUnassigned(booking.roomNumber) ? 'Unassigned' : `Room ${booking.roomNumber}`}</strong> ({booking.roomType})
                                                </span>
                                            </div>
                                            <div className="flex items-center gap-2 shrink-0">
                                                <span className="text-[8px] bg-blue-500/30 border border-blue-400/30 text-blue-200 px-1.5 py-0.5 rounded font-mono font-bold uppercase">
                                                    {booking.status}
                                                </span>
                                                <span className="text-emerald-300 font-mono font-bold text-[9.5px]">
                                                    Current Rate: {currencySymbol}{Number(booking.avgDailyRate || dailyBaseRate || 3000).toFixed(2)}/nt
                                                </span>
                                            </div>
                                        </div>

                                        {/* Clean Tabular Room Move Grid (Exact Pixel-Perfect Match to Reference Image 6) */}
                                        <div className="bg-[#102a6b]/95 border border-blue-400/30 rounded-xl p-3 space-y-2.5 shadow-xs">
                                            {/* Table Column Headers */}
                                            <div className="grid grid-cols-12 gap-2 text-[10px] font-semibold text-blue-200 px-0.5 pb-1 border-b border-blue-400/20">
                                                <div className="col-span-3">From Date</div>
                                                <div className="col-span-3">To Date</div>
                                                <div className="col-span-3">Room Type</div>
                                                <div className={moveSegments.length > 1 ? "col-span-2" : "col-span-3"}>Room</div>
                                                {moveSegments.length > 1 && <div className="col-span-1 text-center"></div>}
                                            </div>

                                            {/* Table Rows (1 clean line per segment) */}
                                            <div className="space-y-2">
                                                {moveSegments.map((seg, idx) => (
                                                    <div key={seg.id || idx} className="grid grid-cols-12 gap-2 items-center">
                                                        {/* From Date */}
                                                        <div className="col-span-3">
                                                            <input
                                                                type="date"
                                                                value={seg.fromDate}
                                                                disabled={idx === 0 && isBookingInHouse}
                                                                min={idx === 0 && isBookingInHouse ? operatingSystemDate : undefined}
                                                                onChange={e => handleUpdateSegment(idx, 'fromDate', e.target.value)}
                                                                className={`w-full h-8 px-2 rounded text-[10px] font-medium outline-none focus:ring-1 focus:ring-blue-400 border border-blue-300 ${
                                                                    idx === 0 && isBookingInHouse
                                                                        ? 'bg-blue-950/60 text-blue-200 cursor-not-allowed opacity-90 border-blue-400/30'
                                                                        : 'bg-white text-gray-900 cursor-pointer shadow-2xs'
                                                                }`}
                                                            />
                                                        </div>

                                                        {/* To Date */}
                                                        <div className="col-span-3">
                                                            <input
                                                                type="date"
                                                                value={seg.toDate}
                                                                min={seg.fromDate}
                                                                onChange={e => handleUpdateSegment(idx, 'toDate', e.target.value)}
                                                                className="w-full h-8 px-2 bg-white text-gray-900 border border-blue-300 rounded text-[10px] font-medium outline-none focus:ring-1 focus:ring-blue-400 cursor-pointer shadow-2xs"
                                                            />
                                                        </div>

                                                        {/* Room Type */}
                                                        <div className="col-span-3 relative">
                                                            <select
                                                                value={seg.roomType || 'Deluxe Suite'}
                                                                onChange={e => handleUpdateSegment(idx, 'roomType', e.target.value)}
                                                                className="w-full h-8 px-2 bg-white text-gray-900 border border-blue-300 rounded text-[10px] font-semibold outline-none focus:ring-1 focus:ring-blue-400 cursor-pointer appearance-none pr-5 truncate shadow-2xs"
                                                            >
                                                                {dynamicRoomTypes.map(t => (
                                                                    <option key={t} value={t}>{t}</option>
                                                                ))}
                                                            </select>
                                                            <ChevronDown size={11} className="absolute right-1.5 top-2.5 text-gray-600 pointer-events-none" />
                                                        </div>

                                                        {/* Target Room */}
                                                        <div className={`${moveSegments.length > 1 ? 'col-span-2' : 'col-span-3'} relative`}>
                                                            <select
                                                                value={seg.roomNumber}
                                                                onChange={e => handleUpdateSegment(idx, 'roomNumber', e.target.value)}
                                                                className="w-full h-8 px-2 bg-white text-gray-900 border border-blue-300 rounded text-[10px] font-bold outline-none focus:ring-1 focus:ring-blue-400 cursor-pointer appearance-none pr-5 shadow-2xs"
                                                            >
                                                                {(() => {
                                                                    const segAvail = getAvailableRoomsForStay(seg.fromDate, seg.toDate, undefined, {
                                                                        excludeReservationId: booking.reservationNumber || booking.id
                                                                    });
                                                                    const roomsToShow = seg.roomType && seg.roomType !== 'All'
                                                                        ? validRooms.filter(r => r.type === seg.roomType)
                                                                        : validRooms;

                                                                    return roomsToShow.map(r => {
                                                                        const st = segAvail.allRoomsStatus.find(s => String(s.room.number) === String(r.roomNumber));
                                                                        const isBooked = st ? !st.isAvailable : false;
                                                                        const isCurrent = String(r.roomNumber) === String(booking.roomNumber);
                                                                        return (
                                                                            <option
                                                                                key={r.id || r.roomNumber}
                                                                                value={r.roomNumber}
                                                                                disabled={isBooked && !isCurrent}
                                                                            >
                                                                                Room {r.roomNumber} {isCurrent ? '(Current)' : isBooked ? '[Occupied]' : '[Available]'}
                                                                            </option>
                                                                        );
                                                                    });
                                                                })()}
                                                            </select>
                                                            <ChevronDown size={11} className="absolute right-1.5 top-2.5 text-gray-600 pointer-events-none" />
                                                        </div>

                                                        {/* Delete X icon for split segment (Item 4 in Image 6) */}
                                                        {moveSegments.length > 1 && (
                                                             <div className="col-span-1 flex items-center justify-center">
                                                                 {idx > 0 && (
                                                                     <button
                                                                         type="button"
                                                                         onClick={() => handleRemoveRoomSegment(idx)}
                                                                         title="Remove this split segment"
                                                                         className="w-6 h-6 rounded hover:bg-rose-500/30 text-rose-300 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
                                                                     >
                                                                         <X size={13} />
                                                                     </button>
                                                                 )}
                                                             </div>
                                                         )}
                                                    </div>
                                                ))}
                                            </div>

                                            {/* Controls below rows: [ Add Room ] (Item 3 in Image 6) and [ ] Override Room Rate */}
                                            <div className="flex items-center justify-between pt-2 border-t border-blue-400/20">
                                                <button
                                                    type="button"
                                                    onClick={handleAddRoomSegment}
                                                    className="h-7 px-3 bg-white/10 hover:bg-white/20 border border-white/30 text-white rounded text-[10px] font-semibold flex items-center gap-1 transition-colors cursor-pointer shadow-xs active:scale-95"
                                                >
                                                    <Plus size={11} className="text-emerald-400" />
                                                    <span>Add Room</span>
                                                </button>

                                                <label className="flex items-center gap-1.5 text-[10px] text-blue-100 cursor-pointer select-none hover:text-white transition-colors">
                                                    <input
                                                        type="checkbox"
                                                        checked={overrideRoomRate}
                                                        onChange={e => setOverrideRoomRate(e.target.checked)}
                                                        className="w-3.5 h-3.5 rounded bg-white text-blue-600 accent-blue-500 cursor-pointer"
                                                    />
                                                    <span className="font-semibold">Override Room Rate</span>
                                                </label>
                                            </div>
                                        </div>

                                        {/* ULTRA-COMPACT GUEST NOTIFICATION FOR ROOM MOVE */}
                                        <div className="bg-[#102a6b]/95 border border-blue-400/30 rounded-xl p-2.5 space-y-1.5 shadow-xs">
                                            <div className="flex items-center justify-between border-b border-blue-400/20 pb-1">
                                                <div className="flex items-center gap-1.5 text-[10px] font-bold text-white">
                                                    <Send size={11} className="text-emerald-400 shrink-0" />
                                                    <span>Guest Notification</span>
                                                </div>
                                                <label className="flex items-center gap-1 text-[9px] text-blue-200 cursor-pointer hover:text-white transition-colors">
                                                    <input
                                                        type="checkbox"
                                                        checked={notifSilentUpdate}
                                                        onChange={e => {
                                                            const silent = e.target.checked;
                                                            setNotifSilentUpdate(silent);
                                                            if (silent) {
                                                                setNotifSendEmail(false);
                                                                setNotifSendSms(false);
                                                                setNotifSendWhatsApp(false);
                                                            } else {
                                                                setNotifSendEmail(Boolean(notifCustomEmail));
                                                                setNotifSendSms(Boolean(notifCustomPhone));
                                                                setNotifSendWhatsApp(Boolean(notifCustomPhone));
                                                            }
                                                        }}
                                                        className="w-3 h-3 rounded accent-amber-500 cursor-pointer"
                                                    />
                                                    <span className="font-semibold text-amber-200">Silent Mode</span>
                                                </label>
                                            </div>

                                            {!notifSilentUpdate && (
                                                <div className="space-y-1.5 pt-0.5">
                                                    <div className="flex items-center gap-2">
                                                        <label className="flex items-center gap-1 cursor-pointer font-bold text-[9px] text-blue-100 min-w-[55px] shrink-0">
                                                            <input
                                                                type="checkbox"
                                                                checked={notifSendEmail}
                                                                onChange={e => setNotifSendEmail(e.target.checked)}
                                                                className="w-3 h-3 rounded accent-emerald-500 cursor-pointer"
                                                            />
                                                            <Mail size={11} className={notifSendEmail ? "text-emerald-400" : "text-blue-400"} />
                                                            <span>Email</span>
                                                        </label>
                                                        <input
                                                            type="email"
                                                            value={notifCustomEmail}
                                                            onChange={e => {
                                                                setNotifCustomEmail(e.target.value);
                                                                if (e.target.value && !notifSendEmail) setNotifSendEmail(true);
                                                            }}
                                                            placeholder="guest@example.com"
                                                            className="flex-1 h-6 px-2 bg-white text-gray-900 border border-blue-300 rounded text-[9.5px] font-medium outline-none focus:ring-1 focus:ring-blue-400 shadow-2xs"
                                                        />
                                                    </div>
                                                    <div className="flex items-center gap-2">
                                                        <label className="flex items-center gap-1 cursor-pointer font-bold text-[9px] text-blue-100 min-w-[55px] shrink-0">
                                                            <input
                                                                type="checkbox"
                                                                checked={notifSendSms}
                                                                onChange={e => setNotifSendSms(e.target.checked)}
                                                                className="w-3 h-3 rounded accent-emerald-500 cursor-pointer"
                                                            />
                                                            <MessageSquare size={11} className={notifSendSms ? "text-emerald-400" : "text-blue-400"} />
                                                            <span>SMS</span>
                                                        </label>
                                                        <input
                                                            type="tel"
                                                            value={notifCustomPhone}
                                                            onChange={e => {
                                                                setNotifCustomPhone(e.target.value);
                                                                if (e.target.value && !notifSendSms && !notifSendWhatsApp) setNotifSendSms(true);
                                                            }}
                                                            placeholder="+8801XXXXXXXXX"
                                                            className="flex-1 h-6 px-2 bg-white text-gray-900 border border-blue-300 rounded text-[9.5px] font-mono outline-none focus:ring-1 focus:ring-blue-400 shadow-2xs"
                                                        />
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                )}

                                {/* MODE 3: ADD PAYMENT (Full Dynamic Payment Tender Architecture) */}
                                {mode === 'payment' && (
                                    <div className="space-y-3">
                                        {/* Folio Selector */}
                                        <div className="flex flex-col gap-1">
                                            <label className="text-[10px] font-bold text-white flex items-center justify-between">
                                                <span>Select Folio *</span>
                                                <span className="text-[8px] font-mono text-emerald-300 font-normal">Active Room: {activeRoomNum}</span>
                                            </label>
                                            <div className="relative">
                                                <select
                                                    value={paymentFolio}
                                                    onChange={e => setPaymentFolio(e.target.value)}
                                                    className="w-full h-8 px-2.5 border border-blue-300/40 rounded-lg text-[9px] bg-white text-gray-900 font-semibold outline-none cursor-pointer appearance-none pr-7 shadow-xs"
                                                >
                                                    {resolvedGroupRooms && resolvedGroupRooms.length > 1 ? (
                                                        resolvedGroupRooms.map((rm: any, idx: number) => {
                                                            const fNum = rm.folioNumber || (booking.folioNumber ? `${booking.folioNumber}-${idx + 1}` : `FOL-${booking.reservationNumber}-${String(idx + 1).padStart(2, '0')}`);
                                                            const rmNum = rm.roomNumber || `Rm ${idx + 1}`;
                                                            return (
                                                                <option key={fNum + idx} value={`${booking.guestName} - ${fNum}`}>
                                                                    Room {rmNum} — {fNum} (Due: {currencySymbol}{displayDue.toFixed(2)})
                                                                </option>
                                                            );
                                                        })
                                                    ) : (
                                                        <option value={`${booking.guestName} - ${booking.folioNumber || `FOL-${booking.reservationNumber}`}`}>
                                                            Room {activeRoomNum} — {booking.folioNumber || `FOL-${booking.reservationNumber}`} (Due: {currencySymbol}{displayDue.toFixed(2)})
                                                        </option>
                                                    )}
                                                </select>
                                                <ChevronDown size={13} className="absolute right-2.5 top-2.5 text-gray-600 pointer-events-none" />
                                            </div>
                                        </div>

                                        {/* Tender & Amount Box */}
                                        <div className="bg-[#1b43aa]/90 border border-blue-400/30 rounded-xl p-3 space-y-2.5 shadow-sm">
                                            <div className="flex items-center justify-between border-b border-blue-400/20 pb-1.5">
                                                <span className="text-[9px] font-bold text-white flex items-center gap-1.5">
                                                    <Wallet size={12} className="text-emerald-300" />
                                                    <span>Payment Tender &amp; Amount</span>
                                                </span>
                                                <span className="text-[8px] font-mono px-1.5 py-0.2 rounded bg-blue-500/30 text-blue-200 border border-blue-400/30 font-bold uppercase">
                                                    Front Office Outlet
                                                </span>
                                            </div>

                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                                <div className="flex flex-col gap-1">
                                                    <label className="text-[8.5px] font-bold text-blue-100 flex items-center justify-between">
                                                        <span>Payment Method *</span>
                                                        <span className="text-[7.5px] text-blue-300 font-mono">[{activePaymentCategory}]</span>
                                                    </label>
                                                    <div className="relative">
                                                        <select
                                                            value={paymentMethod}
                                                            onChange={e => {
                                                                const newMethod = e.target.value;
                                                                setPaymentMethod(newMethod);
                                                                const matched = frontOfficePaymentMethods.find(m => m.displayName === newMethod || m.subType === newMethod);
                                                                if (matched?.acquiringBanks && matched.acquiringBanks.length > 0) {
                                                                    setPaymentAcquiringBank(matched.acquiringBanks[0].bankName);
                                                                }
                                                            }}
                                                            className="w-full h-8 px-2.5 border border-blue-300 rounded-lg text-[9px] bg-white text-gray-900 font-bold outline-none cursor-pointer appearance-none pr-7 shadow-xs"
                                                        >
                                                            {/* Physical Cash */}
                                                            <optgroup label="💵 Physical Cash (Counter Till)">
                                                                {frontOfficePaymentMethods.filter(m => m.category === 'CASH').map(m => (
                                                                    <option key={m.id} value={m.displayName}>{m.displayName}</option>
                                                                ))}
                                                                {frontOfficePaymentMethods.filter(m => m.category === 'CASH').length === 0 && (
                                                                    <option value="Cash">Cash (Counter Till)</option>
                                                                )}
                                                            </optgroup>

                                                            {/* Card Schemes */}
                                                            <optgroup label="💳 Credit &amp; Debit Card Schemes">
                                                                {frontOfficePaymentMethods.filter(m => m.category === 'CARD').map(m => (
                                                                    <option key={m.id} value={m.displayName}>
                                                                        {m.displayName} {m.defaultCommissionRate ? `(${m.defaultCommissionRate}% MDR)` : ''}
                                                                    </option>
                                                                ))}
                                                            </optgroup>

                                                            {/* Mobile Financial Services */}
                                                            <optgroup label="📱 Mobile Banking (MFS)">
                                                                {frontOfficePaymentMethods.filter(m => m.category === 'MOBILE_BANKING').map(m => (
                                                                    <option key={m.id} value={m.displayName}>
                                                                        {m.displayName} {m.walletNumber ? `[${m.walletNumber}]` : ''} {m.defaultCommissionRate ? `(${m.defaultCommissionRate}%)` : ''}
                                                                    </option>
                                                                ))}
                                                            </optgroup>

                                                            {/* Direct Bank Wire */}
                                                            <optgroup label="🏦 Direct Bank Wire &amp; Cheque">
                                                                {frontOfficePaymentMethods.filter(m => m.category === 'BANK_TRANSFER').map(m => (
                                                                    <option key={m.id} value={m.displayName}>{m.displayName}</option>
                                                                ))}
                                                            </optgroup>

                                                            {/* Corporate Billing */}
                                                            {frontOfficePaymentMethods.filter(m => m.category === 'COMPANY_ACCOUNT').length > 0 && (
                                                                <optgroup label="🏢 Corporate Direct Billing">
                                                                    {frontOfficePaymentMethods.filter(m => m.category === 'COMPANY_ACCOUNT').map(m => (
                                                                        <option key={m.id} value={m.displayName}>{m.displayName}</option>
                                                                    ))}
                                                                </optgroup>
                                                            )}
                                                        </select>
                                                        <ChevronDown size={13} className="absolute right-2.5 top-2.5 text-gray-600 pointer-events-none" />
                                                    </div>
                                                </div>

                                                <div className="flex flex-col gap-1">
                                                    <label className="text-[8.5px] font-bold text-blue-100 flex items-center justify-between">
                                                        <span>Amount Received *</span>
                                                        <span className="text-[7.5px] font-mono text-emerald-300">Due: {currencySymbol}{dueAmount.toFixed(0)}</span>
                                                    </label>
                                                    <div className="relative">
                                                        <span className="absolute left-2.5 top-2 text-gray-400 font-bold text-[9px]">{currencySymbol}</span>
                                                        <input
                                                            type="number"
                                                            step="0.01"
                                                            min="0"
                                                            value={paymentAmount}
                                                            onChange={e => setPaymentAmount(Math.max(0, parseFloat(e.target.value) || 0))}
                                                            className="w-full h-8 pl-6 pr-2 border border-blue-300 rounded-lg text-[9px] bg-white text-gray-900 outline-none focus:ring-2 focus:ring-blue-400 font-mono font-bold shadow-xs"
                                                        />
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Conditional Card Options: Acquiring Bank + POS Terminal + MDR */}
                                            {activePaymentCategory === 'CARD' && (
                                                <div className="p-2.5 rounded-lg bg-indigo-950/60 border border-indigo-400/40 space-y-2 text-[8px] animate-in fade-in duration-150">
                                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                                        <div className="flex flex-col gap-1">
                                                            <label className="font-bold text-indigo-200 flex items-center gap-1">
                                                                <Landmark size={10} className="text-indigo-300" />
                                                                <span>Settlement Bank:</span>
                                                            </label>
                                                            <select
                                                                value={paymentAcquiringBank}
                                                                onChange={e => setPaymentAcquiringBank(e.target.value)}
                                                                className="w-full h-7 px-2 bg-white text-indigo-950 font-bold rounded border border-indigo-300 outline-none cursor-pointer text-[8px]"
                                                            >
                                                                {attachedAcquiringBanks.map(b => (
                                                                    <option key={b.id} value={b.bankName}>
                                                                        {b.bankName} {b.commissionRule?.commissionRatePercent ? `(${b.commissionRule.commissionRatePercent}% MDR)` : ''}
                                                                    </option>
                                                                ))}
                                                            </select>
                                                        </div>

                                                        <div className="flex flex-col gap-1">
                                                            <label className="font-bold text-indigo-200 flex items-center gap-1">
                                                                <CreditCard size={10} className="text-indigo-300" />
                                                                <span>POS EDC Terminal:</span>
                                                            </label>
                                                            <select
                                                                value={paymentPosTerminalId}
                                                                onChange={e => setPaymentPosTerminalId(e.target.value)}
                                                                className="w-full h-7 px-2 bg-white text-indigo-950 font-bold rounded border border-indigo-300 outline-none cursor-pointer text-[8px]"
                                                            >
                                                                <option value="">Counter EDC (Auto-Detect)</option>
                                                                {availablePosTerminals.map(t => (
                                                                    <option key={t.id} value={t.id}>
                                                                        {t.terminalName} (TID: {t.tid})
                                                                    </option>
                                                                ))}
                                                            </select>
                                                        </div>
                                                    </div>

                                                    {drawerMdrCalc && drawerMdrCalc.totalFee > 0 && (
                                                        <div className="flex items-center justify-between pt-1 border-t border-indigo-400/30 font-mono text-[8px]">
                                                            <span className="text-indigo-200 font-semibold flex items-center gap-1">
                                                                <Percent size={9} />
                                                                <span>Bank MDR Fee: -{currencySymbol}{drawerMdrCalc.totalFee.toFixed(2)} ({drawerMdrCalc.commissionRatePercent}%)</span>
                                                            </span>
                                                            <span className="text-emerald-300 font-bold flex items-center gap-1">
                                                                <CheckCircle2 size={9} className="text-emerald-400" />
                                                                <span>Net Settlement: {currencySymbol}{drawerMdrCalc.netSettlement.toFixed(2)}</span>
                                                            </span>
                                                        </div>
                                                    )}
                                                </div>
                                            )}

                                            {/* Conditional MFS Options: Wallet details + TrxID */}
                                            {activePaymentCategory === 'MOBILE_BANKING' && (
                                                <div className="p-2.5 rounded-lg bg-pink-950/60 border border-pink-400/40 space-y-1.5 text-[8px] animate-in fade-in duration-150">
                                                    <div className="flex items-center justify-between">
                                                        <span className="font-bold text-pink-200 flex items-center gap-1">
                                                            <Smartphone size={11} className="text-pink-400" />
                                                            <span>Merchant Wallet:</span>
                                                        </span>
                                                        <span className="font-mono font-bold text-white bg-pink-900/60 border border-pink-400/30 px-2 py-0.5 rounded">
                                                            {matchedPaymentMethod?.walletNumber || '01712-000000'} ({matchedPaymentMethod?.accountType || 'MERCHANT'})
                                                        </span>
                                                    </div>
                                                    {drawerMdrCalc && drawerMdrCalc.totalFee > 0 && (
                                                        <div className="flex items-center justify-between pt-1 border-t border-pink-400/30 font-mono text-[8px]">
                                                            <span className="text-pink-200">MFS Charge: -{currencySymbol}{drawerMdrCalc.totalFee.toFixed(2)} ({drawerMdrCalc.commissionRatePercent}%)</span>
                                                            <span className="text-emerald-300 font-bold">Net: {currencySymbol}{drawerMdrCalc.netSettlement.toFixed(2)}</span>
                                                        </div>
                                                    )}
                                                </div>
                                            )}

                                            {/* Reference / Transaction / Approval Code */}
                                            <div className="flex flex-col gap-1">
                                                <label className="text-[8px] font-bold text-blue-100 uppercase tracking-wide">
                                                    {activePaymentCategory === 'CARD' ? 'Card Last 4 & Authorization Code' :
                                                     activePaymentCategory === 'MOBILE_BANKING' ? 'MFS TrxID / Transaction Code' :
                                                     activePaymentCategory === 'BANK_TRANSFER' ? 'BEFTN Ref / Cheque Number' :
                                                     'Payment Reference / Receipt Memo'}
                                                </label>
                                                <input
                                                    type="text"
                                                    value={paymentReferenceCode}
                                                    onChange={e => setPaymentReferenceCode(e.target.value)}
                                                    placeholder={
                                                        activePaymentCategory === 'CARD' ? 'e.g. 4242 / Auth: 991823' :
                                                        activePaymentCategory === 'MOBILE_BANKING' ? 'e.g. TrxID 9B82AX12' :
                                                        activePaymentCategory === 'BANK_TRANSFER' ? 'e.g. BEFTN-991823 / Cheque #109283' :
                                                        'e.g. Desk Receipt / Cash Till Memo'
                                                    }
                                                    className="w-full h-7 px-2.5 border border-blue-300 rounded-lg text-[8.5px] bg-white text-gray-900 outline-none focus:ring-1 focus:ring-blue-400 font-mono shadow-xs"
                                                />
                                            </div>
                                        </div>

                                        {/* Settlement & Tax Summary Card */}
                                        <div className="bg-[#1b43aa]/80 border border-blue-400/20 rounded-xl p-3 space-y-1.5 text-[8px] shadow-2xs">
                                            <div className="flex items-center justify-between text-[8px] text-white pb-1 border-b border-blue-400/20">
                                                <span className="font-bold">Settlement &amp; Tax Summary</span>
                                                <span className="text-[8px] text-blue-200 font-mono">[{taxConfigCode}]</span>
                                            </div>
                                            <div className="flex justify-between text-blue-100 text-[8px] pt-0.5">
                                                <span>Base Room Tariff</span>
                                                <span className="font-mono text-white font-bold">{currencySymbol} {baseAmount.toFixed(2)}</span>
                                            </div>
                                            {isTaxApplicable && totalTax > 0 && (
                                                <div className="space-y-1.5 bg-black/25 rounded-lg p-2 border border-white/10">
                                                    <div className="flex justify-between text-emerald-300 text-[8.5px] font-bold">
                                                        <span className="flex items-center gap-1">
                                                            <ShieldCheck size={10} />
                                                            <span>Statutory Taxes &amp; Levies</span>
                                                        </span>
                                                        <span className="font-mono font-bold">+{currencySymbol} {totalTax.toFixed(2)}</span>
                                                    </div>
                                                    {displayTaxBreakdown && displayTaxBreakdown.length > 0 && (
                                                        <div className="flex flex-wrap items-center gap-1.5 text-blue-200 text-[8px] pt-1 border-t border-white/10">
                                                            {displayTaxBreakdown.map((item: any, idx: number) => (
                                                                <span key={idx} className="inline-flex items-center gap-1 bg-white/[0.08] px-1.5 py-0.5 rounded border border-white/10">
                                                                    <span className="text-blue-200 font-medium">{item.name || item.code} ({item.rate}%):</span>
                                                                    <strong className="text-white font-mono font-bold">+{currencySymbol}{Number(item.amount).toFixed(2)}</strong>
                                                                </span>
                                                            ))}
                                                        </div>
                                                    )}
                                                </div>
                                            )}
                                            <div className="flex justify-between text-blue-100 text-[8px] pt-0.5 border-t border-blue-400/20">
                                                <span>Total Payable</span>
                                                <span className="font-mono text-white font-bold">{currencySymbol} {totalAmount.toFixed(2)}</span>
                                            </div>
                                            <div className="flex justify-between text-blue-100 text-[8px]">
                                                <span>Total Paid</span>
                                                <span className="font-mono text-emerald-300 font-bold">{currencySymbol} {paidAmount.toFixed(2)}</span>
                                            </div>
                                            <div className="flex justify-between text-blue-100 text-[8px] pt-0.5 border-t border-blue-400/20">
                                                <span className="text-white font-bold">Current Balance Due</span>
                                                <span className="font-mono font-black text-rose-300 text-[9px]">{currencySymbol} {dueAmount.toFixed(2)}</span>
                                            </div>

                                            {/* Quick Pay Buttons */}
                                            {dueAmount > 0 && (
                                                <div className="pt-1.5 flex items-center gap-1.5">
                                                    <button
                                                        type="button"
                                                        onClick={() => setPaymentAmount(dueAmount)}
                                                        className="flex-1 py-1.5 bg-emerald-600/30 hover:bg-emerald-600/50 border border-emerald-400/40 rounded-lg text-[8px] font-bold text-emerald-200 transition-colors cursor-pointer text-center active:scale-95 shadow-xs"
                                                    >
                                                        Pay Full Due ({currencySymbol}{dueAmount.toFixed(0)})
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() => setPaymentAmount(Math.round(dueAmount / 2))}
                                                        className="py-1.5 px-3 bg-blue-500/30 hover:bg-blue-500/50 border border-blue-400/40 rounded-lg text-[8px] font-bold text-blue-200 transition-colors cursor-pointer text-center active:scale-95 shadow-xs"
                                                    >
                                                        50% ({currencySymbol}{Math.round(dueAmount / 2)})
                                                    </button>
                                                </div>
                                            )}
                                        </div>

                                        {/* Remarks */}
                                        <div className="flex flex-col gap-1">
                                            <label className="text-[8px] font-bold text-white uppercase tracking-wide">Payment Remarks</label>
                                            <textarea
                                                value={paymentRemarks}
                                                onChange={e => setPaymentRemarks(e.target.value)}
                                                rows={2}
                                                placeholder="Add any internal audit notes or transaction details here..."
                                                className="w-full p-2 border border-blue-300 rounded-lg text-[8.5px] bg-white text-gray-900 outline-none focus:ring-1 focus:ring-blue-400 shadow-xs"
                                            />
                                        </div>
                                    </div>
                                )}

                                {/* MODE 4: ROOM SPLIT & SPLIT STAY JOURNEY MANAGER */}
                                {mode === 'split' && (
                                    <div className="space-y-2.5">
                                        {splitStaySegments.length > 1 ? (
                                            <div className="space-y-2">
                                                {/* Header route overview */}
                                                <div className="bg-[#1b43aa]/90 border border-purple-400/30 rounded-lg p-2 space-y-1.5 shadow-sm">
                                                    <div className="flex items-center justify-between text-[9px]">
                                                        <span className="font-bold text-white flex items-center gap-1">
                                                            <GitFork size={12} className="text-purple-300" />
                                                            <span>Split Stay Journey Manager ({splitStaySegments.length} Rooms)</span>
                                                        </span>
                                                        <span className="px-1.5 py-0.5 rounded text-[8px] font-bold bg-purple-500/30 text-purple-200 border border-purple-400/40">
                                                            Sequential Stay
                                                        </span>
                                                    </div>
                                                    <p className="text-[8px] text-blue-200/90 leading-tight">
                                                        Re-assign rooms for any leg, sub-split nights into additional rooms, or merge consecutive legs.
                                                    </p>
                                                </div>

                                                {/* List of Journey Legs */}
                                                <div className="space-y-1.5 max-h-[260px] overflow-y-auto custom-scrollbar pr-0.5">
                                                    {splitStaySegments.map((seg, idx) => {
                                                        const avail = getAvailableRoomsForStay(seg.fromDate, seg.toDate, undefined, {
                                                            excludeReservationId: booking.reservationNumber || booking.id
                                                        });
                                                        const isAvail = avail.allRoomsStatus.find(s => String(s.room.number) === String(seg.roomNumber))?.isAvailable ?? true;

                                                        return (
                                                            <div key={seg.id || idx} className="bg-[#1b43aa]/90 border border-blue-400/30 rounded-lg p-2 space-y-2 shadow-xs">
                                                                {/* Leg Title & Date Badge */}
                                                                <div className="flex items-center justify-between gap-1 border-b border-blue-400/20 pb-1">
                                                                    <div className="flex items-center gap-1.5 min-w-0">
                                                                        <span className="px-1.5 py-0.5 rounded text-[8px] font-bold bg-purple-500/30 text-purple-200 border border-purple-400/40 shrink-0">
                                                                            Leg {idx + 1} of {splitStaySegments.length}
                                                                        </span>
                                                                        <span className="text-[9px] font-bold text-white truncate font-mono">
                                                                            {seg.fromDate} → {seg.toDate}
                                                                        </span>
                                                                        <span className="text-[8px] px-1 py-0.2 rounded bg-blue-900 text-blue-200 font-bold shrink-0">
                                                                            {seg.nights || 1}N
                                                                        </span>
                                                                    </div>
                                                                    <span className={`px-1.5 py-0.5 rounded text-[7.5px] font-bold shrink-0 border ${
                                                                        isAvail
                                                                            ? 'bg-emerald-500/20 text-emerald-300 border-emerald-400/40'
                                                                            : 'bg-rose-500/20 text-rose-300 border-rose-400/40'
                                                                    }`}>
                                                                        {isAvail ? 'Available ✓' : 'Collision ⚠️'}
                                                                    </span>
                                                                </div>

                                                                {/* Room Selection for this Leg */}
                                                                <div className="flex flex-col gap-0.5">
                                                                    <label className="text-[7.5px] font-semibold text-blue-200">
                                                                        Assigned Room for Leg {idx + 1}:
                                                                    </label>
                                                                    <select
                                                                        value={seg.roomNumber}
                                                                        onChange={e => handleUpdateSplitStaySegmentRoom(idx, e.target.value)}
                                                                        className="w-full h-7 px-2 border border-blue-300 rounded text-[9px] bg-white text-gray-900 font-bold outline-none cursor-pointer focus:ring-1 focus:ring-blue-400 shadow-2xs"
                                                                    >
                                                                        {validRooms.map(r => {
                                                                            const rAvail = avail.allRoomsStatus.find(s => String(s.room.number) === String(r.roomNumber))?.isAvailable ?? true;
                                                                            return (
                                                                                <option key={r.id || r.roomNumber} value={r.roomNumber}>
                                                                                    Room {r.roomNumber} ({r.type}) {rAvail ? '' : '— [⚠️ Occupied]'}
                                                                                </option>
                                                                            );
                                                                        })}
                                                                    </select>
                                                                </div>

                                                                {/* Actions on Leg: Sub-Split & Merge */}
                                                                <div className="flex items-center gap-1.5 pt-0.5">
                                                                    {(seg.nights || 1) >= 2 && (
                                                                        <button
                                                                            type="button"
                                                                            onClick={() => handleSubSplitLeg(idx)}
                                                                            className="px-2 py-1 rounded bg-purple-600/30 hover:bg-purple-600/50 text-purple-200 border border-purple-400/40 text-[8px] font-semibold flex items-center gap-1 transition-colors cursor-pointer"
                                                                            title="Divide this leg into two consecutive room moves"
                                                                        >
                                                                            <Scissors size={10} className="text-purple-300" />
                                                                            <span>Split This Leg ({Math.floor((seg.nights || 1) / 2)}N + {(seg.nights || 1) - Math.floor((seg.nights || 1) / 2)}N)</span>
                                                                        </button>
                                                                    )}

                                                                    {idx > 0 && (
                                                                        <button
                                                                            type="button"
                                                                            onClick={() => handleMergeLegWithPrevious(idx)}
                                                                            className="px-2 py-1 rounded bg-amber-600/30 hover:bg-amber-600/50 text-amber-200 border border-amber-400/40 text-[8px] font-semibold flex items-center gap-1 transition-colors cursor-pointer"
                                                                            title="Merge this leg back into the previous room"
                                                                        >
                                                                            <GitMerge size={10} className="text-amber-300" />
                                                                            <span>Merge into Room {splitStaySegments[idx - 1]?.roomNumber}</span>
                                                                        </button>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        );
                                                    })}
                                                </div>

                                                {/* + Add Another Room Move */}
                                                <button
                                                    type="button"
                                                    onClick={handleAddSplitStayMove}
                                                    className="w-full h-7 border border-dashed border-blue-400/60 hover:bg-white/10 rounded text-[9px] font-semibold text-white flex items-center justify-center gap-1.5 cursor-pointer transition-colors shadow-2xs"
                                                >
                                                    <Plus size={12} className="text-blue-300" />
                                                    <span>+ Add Room Move (Leg {splitStaySegments.length + 1})</span>
                                                </button>
                                            </div>
                                        ) : (
                                            /* SINGLE ROOM SPLIT INITIAL FORM */
                                            <div className="space-y-3">
                                                <div className="text-[8px] text-white font-semibold">New Room Assignment:</div>
                                                <div className="grid grid-cols-2 gap-1.5">
                                                    <div className="flex flex-col gap-0.5">
                                                        <label className="text-[7.5px] font-semibold text-blue-100">Current Room</label>
                                                        <input
                                                            type="text"
                                                            value={booking.roomNumber}
                                                            disabled
                                                            className="w-full h-7 px-2 border border-blue-300/40 rounded text-[8.5px] bg-white text-gray-900 font-bold"
                                                        />
                                                    </div>
                                                    <div className="flex flex-col gap-0.5">
                                                        <label className="text-[7.5px] font-semibold text-blue-100">Guest Name</label>
                                                        <input
                                                            type="text"
                                                            value={booking.guestName}
                                                            disabled
                                                            className="w-full h-7 px-2 border border-blue-300/40 rounded text-[8.5px] bg-white text-gray-900 font-bold"
                                                        />
                                                    </div>
                                                </div>

                                                <div className="grid grid-cols-2 gap-1.5">
                                                    <div className="flex flex-col gap-0.5">
                                                        <label className="text-[7.5px] font-semibold text-blue-100">From Date</label>
                                                        <input
                                                            type="date"
                                                            value={splitFromDate}
                                                            onChange={e => setSplitFromDate(e.target.value)}
                                                            className="w-full h-7 px-2 border border-blue-300 rounded text-[8.5px] bg-white text-gray-900 outline-none font-medium"
                                                        />
                                                    </div>
                                                    <div className="flex flex-col gap-0.5">
                                                        <label className="text-[7.5px] font-semibold text-blue-100">To Date</label>
                                                        <input
                                                            type="date"
                                                            value={splitToDate}
                                                            onChange={e => setSplitToDate(e.target.value)}
                                                            className="w-full h-7 px-2 border border-blue-300 rounded text-[8.5px] bg-white text-gray-900 outline-none font-medium"
                                                        />
                                                    </div>
                                                </div>

                                                <div className="flex flex-col gap-0.5">
                                                    <label className="text-[7.5px] font-semibold text-blue-100">Target Split Room</label>
                                                    <select
                                                        value={splitRoom}
                                                        onChange={e => setSplitRoom(e.target.value)}
                                                        className="w-full h-7 px-2 border border-blue-300 rounded text-[8.5px] bg-white text-gray-900 font-bold outline-none"
                                                    >
                                                        {validRooms.map(r => (
                                                            <option key={r.id || r.roomNumber} value={r.roomNumber}>
                                                                Room {r.roomNumber} ({r.type})
                                                            </option>
                                                        ))}
                                                    </select>
                                                </div>

                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        const totalNts = Math.max(2, nights || 2);
                                                        const half = Math.floor(totalNts / 2);
                                                        const d1 = new Date(arrivalDate || booking.arrivalDate);
                                                        d1.setDate(d1.getDate() + half);
                                                        const midStr = d1.toISOString().split('T')[0];
                                                        const nextRm = validRooms.find(r => String(r.roomNumber) !== String(booking.roomNumber)) || validRooms[0];

                                                        setSplitStaySegments([
                                                            {
                                                                id: `seg-1`,
                                                                fromDate: arrivalDate || booking.arrivalDate,
                                                                toDate: midStr,
                                                                roomNumber: String(booking.roomNumber),
                                                                roomType: booking.roomType || 'Superior King Room',
                                                                nights: half,
                                                                dailyRate: resolveReservationDailyBaseRate(booking, booking.roomNumber)
                                                            },
                                                            {
                                                                id: `seg-2`,
                                                                fromDate: midStr,
                                                                toDate: departureDate || booking.departureDate,
                                                                roomNumber: nextRm ? String(nextRm.roomNumber) : '101',
                                                                roomType: nextRm?.type || booking.roomType || 'Deluxe Suite',
                                                                nights: totalNts - half,
                                                                dailyRate: getStandardDailyRateForRoom(nextRm ? String(nextRm.roomNumber) : '101', nextRm?.type || booking.roomType)
                                                            }
                                                        ]);
                                                    }}
                                                    className="h-7 px-3 border border-blue-300/60 hover:bg-white/10 rounded text-[8.5px] font-semibold text-white flex items-center gap-1.5 cursor-pointer transition-colors shadow-2xs"
                                                >
                                                    <Plus size={13} />
                                                    <span>+ Add Room</span>
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                )}

                                {/* MODE 5: STOP ROOM MOVE (Lock & Guard) */}
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

                                {/* MODE: ATOMIC ROOM SWAP */}
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

                                {/* MODE: DIGITAL REG CARD (Digital e-Reg Card) */}
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

                                {/* MODE 18: SEND CONFIRMATION VOUCHER */}
                                {mode === 'send_confirmation' && (() => {
                                    const hasPhone = Boolean(confirmSendPhone && confirmSendPhone.trim());
                                    const hasEmail = Boolean(confirmSendEmail && confirmSendEmail.trim());
                                    const hasAnyContact = hasPhone || hasEmail;

                                    return (
                                        <div className="space-y-2.5">
                                            {/* Compact Luxury Header */}
                                            <div className="bg-gradient-to-r from-emerald-950/80 via-slate-900/80 to-blue-950/80 border border-emerald-500/30 rounded-xl px-3 py-2 text-emerald-100 shadow-xs flex items-center justify-between">
                                                <div className="flex items-center gap-2 min-w-0">
                                                    <div className="w-7 h-7 rounded-lg bg-emerald-500/20 border border-emerald-400/30 flex items-center justify-center text-emerald-400 shrink-0">
                                                        <Send size={13} />
                                                    </div>
                                                    <div className="min-w-0">
                                                        <div className="flex items-center gap-2">
                                                            <span className="text-[11px] font-bold text-white tracking-wide truncate">
                                                                Send Confirmation Voucher
                                                            </span>
                                                            <span className="px-1.5 py-0.5 rounded text-[8px] font-mono font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                                                                Fast-Pass KYC
                                                            </span>
                                                        </div>
                                                        <p className="text-[9px] text-emerald-200/80 truncate">
                                                            Instant dispatch for <strong className="text-white">{booking.guestName}</strong>
                                                        </p>
                                                    </div>
                                                </div>
                                                {lastDispatchedInfo && (
                                                    <span className="px-2 py-0.5 rounded-full text-[8px] font-bold bg-emerald-500/30 text-emerald-200 border border-emerald-400/40 font-mono shrink-0">
                                                        SENT {lastDispatchedInfo.time}
                                                    </span>
                                                )}
                                            </div>

                                            {/* Dispatched feedback if sent in this session */}
                                            {lastDispatchedInfo && (
                                                <div className="px-2.5 py-1.5 rounded-lg bg-emerald-500/20 border border-emerald-400/40 text-emerald-100 flex items-center justify-between text-[9px] animate-in fade-in duration-150">
                                                    <div className="flex items-center gap-1.5">
                                                        <CheckCircle2 size={13} className="text-emerald-400 shrink-0" />
                                                        <span>Voucher successfully sent via <strong className="text-white">{lastDispatchedInfo.channels}</strong></span>
                                                    </div>
                                                    <span className="text-[7.5px] bg-emerald-500/30 text-emerald-200 px-1.5 py-0.2 rounded font-mono font-bold">DELIVERED</span>
                                                </div>
                                            )}

                                            {/* Delivery Channels & Contact Info */}
                                            {!hasAnyContact && !showManualContactEntry ? (
                                                /* Clean empty notice when guest has no phone and no email */
                                                <div className="bg-[#102a6b]/80 border border-amber-500/30 rounded-xl p-3 text-center space-y-2">
                                                    <div className="flex items-center justify-center gap-1.5 text-amber-300 text-[10.5px] font-bold">
                                                        <AlertTriangle size={13} />
                                                        <span>No Phone or Email on Guest Profile</span>
                                                    </div>
                                                    <p className="text-[9px] text-blue-200/80 leading-snug">
                                                        This reservation has no registered mobile number or email address on file.
                                                    </p>
                                                    <button
                                                        type="button"
                                                        onClick={() => {
                                                            setShowManualContactEntry(true);
                                                            setShowAddPhoneInput(true);
                                                            setShowAddEmailInput(true);
                                                        }}
                                                        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-[9px] font-bold shadow-xs transition-colors cursor-pointer"
                                                    >
                                                        <Plus size={11} />
                                                        <span>Add Contact Number / Email</span>
                                                    </button>
                                                </div>
                                            ) : (
                                                <div className="space-y-2">
                                                    {/* WhatsApp Channel Card - Rendered ONLY if guest has phone, or user opted to add */}
                                                    {(hasPhone || showManualContactEntry || showAddPhoneInput) && (
                                                        <div className={`p-2.5 rounded-xl border transition-all ${
                                                            confirmChannelWhatsApp ? 'bg-[#0f2c73]/90 border-emerald-500/40 shadow-xs' : 'bg-[#0f2c73]/40 border-white/10 opacity-70'
                                                        }`}>
                                                            <div className="flex items-center justify-between mb-1.5">
                                                                <label className="flex items-center gap-2 cursor-pointer select-none">
                                                                    <input
                                                                        type="checkbox"
                                                                        checked={confirmChannelWhatsApp}
                                                                        onChange={e => setConfirmChannelWhatsApp(e.target.checked)}
                                                                        className="accent-emerald-500 w-3.5 h-3.5 rounded cursor-pointer"
                                                                    />
                                                                    <span className="text-[10px] font-bold text-white flex items-center gap-1.5">
                                                                        <MessageSquare size={12} className="text-emerald-400" />
                                                                        <span>WhatsApp Cloud API</span>
                                                                    </span>
                                                                </label>
                                                                <span className="text-[8px] font-bold px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                                                                    Instant Delivery
                                                                </span>
                                                            </div>
                                                            {confirmChannelWhatsApp && (
                                                                <div className="flex items-center gap-2">
                                                                    <div className="relative flex-1">
                                                                        <Phone size={10} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-emerald-400/70" />
                                                                        <input
                                                                            type="text"
                                                                            value={confirmSendPhone}
                                                                            onChange={e => setConfirmSendPhone(e.target.value)}
                                                                            placeholder="WhatsApp mobile number (+880...)"
                                                                            className="w-full h-7 pl-7 pr-2.5 rounded-lg bg-black/40 border border-emerald-500/30 text-white font-mono text-[10px] outline-none focus:border-emerald-400 transition-colors"
                                                                        />
                                                                    </div>
                                                                    <span className="text-[8px] text-emerald-300/80 font-mono shrink-0 hidden sm:inline">
                                                                        Voucher & Map
                                                                    </span>
                                                                </div>
                                                            )}
                                                        </div>
                                                    )}

                                                    {/* Email Channel Card - Rendered ONLY if guest has email, or user opted to add */}
                                                    {(hasEmail || showManualContactEntry || showAddEmailInput) && (
                                                        <div className={`p-2.5 rounded-xl border transition-all ${
                                                            confirmChannelEmail ? 'bg-[#0f2c73]/90 border-blue-400/40 shadow-xs' : 'bg-[#0f2c73]/40 border-white/10 opacity-70'
                                                        }`}>
                                                            <div className="flex items-center justify-between mb-1.5">
                                                                <label className="flex items-center gap-2 cursor-pointer select-none">
                                                                    <input
                                                                        type="checkbox"
                                                                        checked={confirmChannelEmail}
                                                                        onChange={e => setConfirmChannelEmail(e.target.checked)}
                                                                        className="accent-blue-500 w-3.5 h-3.5 rounded cursor-pointer"
                                                                    />
                                                                    <span className="text-[10px] font-bold text-white flex items-center gap-1.5">
                                                                        <Mail size={12} className="text-blue-300" />
                                                                        <span>Official Email</span>
                                                                    </span>
                                                                </label>
                                                                <span className="text-[8px] font-bold px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-300 border border-blue-400/30">
                                                                    HTML Voucher
                                                                </span>
                                                            </div>
                                                            {confirmChannelEmail && (
                                                                <div className="flex items-center gap-2">
                                                                    <div className="relative flex-1">
                                                                        <Mail size={10} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-blue-300/70" />
                                                                        <input
                                                                            type="email"
                                                                            value={confirmSendEmail}
                                                                            onChange={e => setConfirmSendEmail(e.target.value)}
                                                                            placeholder="guest@example.com"
                                                                            className="w-full h-7 pl-7 pr-2.5 rounded-lg bg-black/40 border border-blue-400/30 text-white font-mono text-[10px] outline-none focus:border-blue-400 transition-colors"
                                                                        />
                                                                    </div>
                                                                    <span className="text-[8px] text-blue-200/80 font-mono shrink-0 hidden sm:inline">
                                                                        PDF & Receipt
                                                                    </span>
                                                                </div>
                                                            )}
                                                        </div>
                                                    )}

                                                    {/* Subtle optional add buttons for whichever channel is missing on profile */}
                                                    {hasPhone && !hasEmail && !showAddEmailInput && (
                                                        <div className="flex justify-end pt-0.5">
                                                            <button
                                                                type="button"
                                                                onClick={() => {
                                                                    setShowAddEmailInput(true);
                                                                    setConfirmChannelEmail(true);
                                                                }}
                                                                className="text-[8.5px] text-blue-300 hover:text-white flex items-center gap-1 transition-colors cursor-pointer"
                                                            >
                                                                <Plus size={10} />
                                                                <span>Add Email address to voucher</span>
                                                            </button>
                                                        </div>
                                                    )}

                                                    {hasEmail && !hasPhone && !showAddPhoneInput && (
                                                        <div className="flex justify-end pt-0.5">
                                                            <button
                                                                type="button"
                                                                onClick={() => {
                                                                    setShowAddPhoneInput(true);
                                                                    setConfirmChannelWhatsApp(true);
                                                                }}
                                                                className="text-[8.5px] text-emerald-300 hover:text-white flex items-center gap-1 transition-colors cursor-pointer"
                                                            >
                                                                <Plus size={10} />
                                                                <span>Add WhatsApp mobile to voucher</span>
                                                            </button>
                                                        </div>
                                                    )}
                                                </div>
                                            )}

                                            {/* Voucher Summary Preview */}
                                            <div className="bg-[#102a6b]/90 border border-blue-400/30 rounded-xl p-2.5 space-y-2 text-[9.5px] shadow-xs">
                                                <div className="flex items-center justify-between border-b border-blue-400/20 pb-1.5">
                                                    <span className="font-bold text-blue-200 uppercase tracking-wider text-[8.5px]">Live Voucher Details</span>
                                                    <span className="font-mono font-bold text-amber-300 text-[10px]">{booking.reservationNumber}</span>
                                                </div>
                                                <div className="grid grid-cols-2 gap-x-2 gap-y-1.5 text-slate-200">
                                                    <div>
                                                        <span className="text-slate-400 text-[8px] block uppercase font-medium">Guest</span>
                                                        <strong className="text-white text-[9.5px] truncate block">{booking.guestName}</strong>
                                                    </div>
                                                    <div>
                                                        <span className="text-slate-400 text-[8px] block uppercase font-medium">Room & Category</span>
                                                        <strong className="text-white text-[9.5px] truncate block">Room {booking.roomNumber} ({booking.roomType || 'Standard'})</strong>
                                                    </div>
                                                    <div>
                                                        <span className="text-slate-400 text-[8px] block uppercase font-medium">Stay Journey</span>
                                                        <strong className="text-emerald-300 text-[9.5px] font-mono block">{booking.arrivalDate} ➔ {booking.departureDate} ({booking.nights || 1}N)</strong>
                                                    </div>
                                                    <div>
                                                        <span className="text-slate-400 text-[8px] block uppercase font-medium">Timings</span>
                                                        <strong className="text-slate-300 text-[9px] block">Check-in 2:00 PM • Check-out 12:00 PM</strong>
                                                    </div>
                                                </div>
                                                <div className="border-t border-blue-400/20 pt-1.5 grid grid-cols-3 gap-1 text-center bg-black/20 rounded-lg p-1.5">
                                                    <div>
                                                        <span className="text-slate-400 text-[7.5px] uppercase block">Grand Total</span>
                                                        <span className="font-bold text-white text-[10px] font-mono">{currencySymbol} {Number(totalAmount).toFixed(2)}</span>
                                                    </div>
                                                    <div className="border-x border-white/10">
                                                        <span className="text-slate-400 text-[7.5px] uppercase block">Deposit / Paid</span>
                                                        <span className="font-bold text-emerald-400 text-[10px] font-mono">{currencySymbol} {Number(paidAmount).toFixed(2)}</span>
                                                    </div>
                                                    <div>
                                                        <span className="text-slate-400 text-[7.5px] uppercase block">Balance Due</span>
                                                        <span className={`font-bold text-[10px] font-mono ${dueAmount > 0 ? 'text-amber-400' : 'text-slate-300'}`}>
                                                            {currencySymbol} {Number(dueAmount).toFixed(2)}
                                                        </span>
                                                    </div>
                                                </div>
                                                <div className="pt-1 border-t border-blue-400/20 text-[8px] text-slate-300 flex items-center justify-between">
                                                    <span className="px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-200 font-bold shrink-0">Fast-Pass Link</span>
                                                    <span className="truncate text-slate-300 font-mono text-[8px] ml-1.5">Encrypted Fast-Pass URL ({booking.reservationNumber})</span>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })()}
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
                                {(!booking?.isPast || mode === 'send_confirmation') && (
                                    <button
                                        type="button"
                                        onClick={handlePrimaryAction}
                                        disabled={mode === 'send_confirmation' && (!confirmChannelWhatsApp && !confirmChannelEmail)}
                                        className={`h-8 px-4 text-white rounded-md text-[9.5px] font-semibold flex items-center gap-1.5 cursor-pointer shadow-md transition-all active:scale-[0.98] ${
                                            mode === 'send_confirmation' && (!confirmChannelWhatsApp && !confirmChannelEmail)
                                                ? 'bg-slate-600/60 opacity-50 cursor-not-allowed text-slate-300'
                                                : modeMeta.buttonClass
                                        }`}
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
                                                        {currencySymbol} {Number(resolveReservationDailyBaseRate(booking, activeRoomNum)).toLocaleString()}
                                                    </td>
                                                </tr>
                                            </tbody>
                                        </table>

                                        <div className="flex justify-end">
                                            <div className="w-64 space-y-1.5 text-xs bg-slate-50 p-3 rounded-lg border border-slate-200">
                                                <div className="flex justify-between">
                                                    <span className="text-slate-600">{isMultiRoomGroup ? `Room ${activeRoomNum} Billed:` : 'Total Billed:'}</span>
                                                    <span className="font-mono font-bold">
                                                        {currencySymbol} {Number(
                                                            isMultiRoomGroup && groupFinancials.totalRooms > 1
                                                                ? Math.round((booking.totalAmount || groupFinancials.grandTotal) / groupFinancials.totalRooms)
                                                                : (booking.totalAmount || 0)
                                                        ).toLocaleString()}
                                                    </span>
                                                </div>
                                                <div className="flex justify-between text-emerald-700 font-semibold">
                                                    <span>Advance Deposited:</span>
                                                    <span className="font-mono">
                                                        {currencySymbol} {Number(
                                                            isMultiRoomGroup && groupFinancials.totalRooms > 1
                                                                ? Math.round(paidAmount / groupFinancials.totalRooms)
                                                                : paidAmount
                                                        ).toLocaleString()}
                                                    </span>
                                                </div>
                                                <div className="flex justify-between text-rose-700 font-bold border-t border-slate-200 pt-1">
                                                    <span>Payable at Check-In:</span>
                                                    <span className="font-mono">
                                                        {currencySymbol} {Number(
                                                            isMultiRoomGroup && groupFinancials.totalRooms > 1
                                                                ? Math.max(0, Math.round((booking.totalAmount || groupFinancials.grandTotal) / groupFinancials.totalRooms) - Math.round(paidAmount / groupFinancials.totalRooms))
                                                                : dueAmount
                                                        ).toLocaleString()}
                                                    </span>
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
                                            const rmRes = rm.displayResNo || (booking.isGroup || booking.groupCode ? `${booking.reservationNumber}-${String(rIdx + 1).padStart(2, '0')}` : booking.reservationNumber);
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
            {/* Digital e-Registration Card Modal (HotelManagementOS) */}
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

            {/* Passport & ID Card Fast Auto-Scanner Modal */}
            <PassportIdScannerModal
                isOpen={isScannerOpen}
                onClose={() => setIsScannerOpen(false)}
                reservationNumber={booking?.reservationNumber}
                reservationId={booking?.id}
                onProfileResolved={(guest, isNew) => {
                    handlePassportProfileResolved(guest, isNew);
                }}
            />

            {/* Keycard Encoder & Hardware Smart Lock Bridge Modal */}
            <KeycardEncoderModal
                isOpen={isKeycardModalOpen}
                onClose={() => setIsKeycardModalOpen(false)}
                propertyId={getActivePropertyId()}
                roomNumber={String(booking?.roomNumber || '')}
                guestName={booking?.guestName || ''}
                reservationNumber={booking?.reservationNumber}
                checkInDate={booking?.arrivalDate}
                checkOutDate={booking?.departureDate}
                onKeycardIssued={(data) => {
                    toast.success(`Keycard issued for Room ${booking?.roomNumber}! UID: ${data.cardUid || 'SUCCESS'}`);
                }}
            />

            {/* Dynamic In-Room Minibar Billing Modal */}
            <MinibarAuditModal
                isOpen={isMinibarModalOpen}
                onClose={() => setIsMinibarModalOpen(false)}
                propertyId={getActivePropertyId()}
                roomNumber={String(booking?.roomNumber || '')}
                guestName={booking?.guestName || ''}
                onChargePosted={(data) => {
                    toast.success(`Minibar charge of ৳${data.totalAmount} posted to Room ${booking?.roomNumber}!`);
                }}
            />
        </div>
    </div>,
    document.body
);
};

export default ReservationActionDrawer;
