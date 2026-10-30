import React, { useState, useEffect, useMemo, useRef } from 'react';
import { createPortal } from 'react-dom';
import {
    Calendar as CalendarIcon,
    ChevronDown,
    ChevronRight,
    ChevronLeft,
    Building2,
    BedDouble,
    BedSingle,
    X,
    Crown,
    Users,
    DollarSign,
    Star,
    Lock,
    Home,
    Printer,
    Wallet,
    Link as LinkIcon,
    Wrench,
    Cigarette,
    CigaretteOff,
    Search,
    ArrowRight,
    Clock
} from 'lucide-react';
import { useProperty } from '../context/PropertyContext';
import { useNavigation } from '../context/NavigationContext';
import QuickReservationModal from './modals/QuickReservationModal';
import AddReservationModal from './modals/AddReservationModal';
import OutOfOrderModal from './modals/OutOfOrderModal';
import {
    getStoredOOOBlocks,
    isBlockOverdue,
    syncOOOBlocksFromBackend,
    isDateRangeOverlapping,
    type OutOfOrderBlock
} from '../utils/outOfOrderEngine';
import type { AmendBookingData } from './modals/AmendStayModal';
import ReservationActionDrawer, { type DrawerMode } from './modals/ReservationActionDrawer';
import { toast } from '../context/ToastContext';
import {
    subscribeToPMSEvents,
    broadcastPMSEvent,
    getAllStoredReservations,
    saveStoredReservations,
    getActiveLocks,
    getCanonicalRooms,
    syncConnectingSuitesFromDB,
    validateAndCommitReservation,
    syncReservationsFromDB,
    syncRoomTypesAndRoomsFromDB,
    getStandardDailyRateForRoom,
    resolveReservationDailyBaseRate,
    getRoomTypeCapacity,
    calculateTariffForRatePlan,
    amendStayInDB,
    moveRoomInDB,
    recordPaymentInDB,
    splitStayInDB,
    holdReservationInDB,
    voidReservationInDB,
    unassignRoomInDB,
    ungroupReservationInDB,
    changeGroupOwnerInDB,
    deleteReservationInDB,
    getOperatingSystemDate,
    formatToISODate,
    updateReservationStatusInDB,
    updateRoomHousekeepingInDB,
    generateRegistrationNumber,
    generateFolioNumber,
    isRoomUnassigned,
    type RoomLock,
    type StoredReservation
} from '../utils/roomInventoryEngine';
import {
    initNetworkSync,
    subscribeToSyncStatus,
    type SyncStatus
} from '../utils/pmsNetworkSync';
import {
    calculateReservationTaxes
} from '../utils/taxCalculationEngine';
import {
    getDayHolidayDetails
} from '../utils/holidayHelper';

interface TimelineBooking {
    id: string;
    reservationNumber: string;
    subBookingNumber?: string;
    groupCode?: string;
    registrationNumber?: string;
    registeredAt?: string;
    folioNumber?: string;
    guestName: string;
    roomNumber: string;
    roomType?: string;
    ratePlan?: string;
    rate?: number;
    startIndex: number;
    endIndex: number;
    checkInDate?: string;        // Exact ISO check-in
    checkOutDate?: string;       // Exact ISO check-out
    nights?: number;             // Exact stay nights
    status: 'arrived' | 'stayover' | 'confirmed' | 'reserved' | 'hold' | 'due-out' | 'checked-out' | 'day-use' | 'out-of-order';
    // 4 Key Indicators requested by User:
    isGroupOwner?: boolean;      // 1. Group Owner (👑)
    isGroupBooking?: boolean;    // 2. Group Booking (👥)
    isConnectingSuite?: boolean; // Interconnecting Suite (🔗)
    connectedTo?: string;
    isPaymentDue?: boolean;      // 3. Payment Due ($)
    isVipOrSingleLady?: boolean; // 4. VIP or Single Lady (⭐)
    indicator?: string;
    isPast?: boolean;            // Historical / Backdated flag for read-only audit lock
    // Financial & Statutory Tax Awareness
    totalAmount?: number;
    paidAmount?: number;
    dueAmount?: number;
    baseAmount?: number;
    totalTaxAmount?: number;
    taxConfigCode?: string;
    taxApplicable?: boolean;
    adults?: number;
    children?: number;
}

export interface RoomNode {
    id: string;
    roomNumber: string;
    type: string;
    floor: string;
    building: string;
    status: string;
    wing?: string;
    isConnecting?: boolean;
    connectedTo?: string;
    smokingStatus?: string;
    smokingAllowed?: boolean;
    smokingPolicy?: string;
    bedType?: string;
    bedCount?: number;
}

export interface FloorNode {
    id: string;
    name: string;
    rooms: RoomNode[];
}

export interface BuildingNode {
    id: string;
    name: string;
    floors: FloorNode[];
}

export interface UnassignedBooking {
    id: string;
    reservationNumber: string;
    guestName: string;
    roomType: string;
    checkIn: string;
    checkOut: string;
    nights: number;
    totalRooms: number;
    source: string;
    totalAmount: number;
    status: 'unassigned';
}

const deriveUnassignedFromStored = (stored: StoredReservation[]): UnassignedBooking[] => {
    const list: UnassignedBooking[] = [];
    stored.forEach((res: any) => {
        const st = String(res?.status || '').toLowerCase();
        if (st === 'cancelled' || st === 'checked out' || st === 'checked-out' || st === 'voided') return;
        const rooms = Array.isArray(res?.rooms) ? res.rooms : Array.isArray(res?.roomsList) ? res.roomsList : [];
        const flatRoomNo = res?.roomNumber ? String(res.roomNumber) : '';
        const unassignedRooms = rooms.filter((rm: any) => {
            const rNo = rm?.roomNo || rm?.roomNumber || (Array.isArray(rm?.assignedRooms) ? rm.assignedRooms[0] : '');
            return !rNo || rNo === 'Unassigned' || rNo === 'TBA';
        });
        const isFlatUnassigned = !flatRoomNo || flatRoomNo === 'Unassigned' || flatRoomNo === 'TBA';
        if (unassignedRooms.length > 0 || (rooms.length === 0 && isFlatUnassigned)) {
            const firstRm = unassignedRooms[0] || rooms[0] || {};
            list.push({
                id: `un-${res?.id || res?.reservationNumber || Math.random()}`,
                reservationNumber: res?.reservationNumber || `RES-${res?.id || '100'}`,
                guestName: res?.guest?.fullName || res?.guestName || 'Guest',
                roomType: firstRm?.category || firstRm?.roomType || res?.roomType || 'Deluxe Double',
                checkIn: firstRm?.checkIn || firstRm?.checkInDate || res?.checkIn || res?.createdAt?.split('T')[0] || '2026-07-01',
                checkOut: firstRm?.checkOut || firstRm?.checkOutDate || res?.checkOut || '2026-07-03',
                nights: Math.max(1, Number(firstRm?.nights || res?.nights) || 2),
                totalRooms: Math.max(1, unassignedRooms.length || Number(res?.roomsCount) || 1),
                source: res?.guest?.reservationType || res?.source || 'Direct Booking',
                totalAmount: Number(res?.summary?.grandTotal ?? res?.totalAmount) || 0,
                status: 'unassigned'
            });
        }
    });
    return list;
};

/**
 * Calculates start date of Stay View grid (always exactly 3 days before PMS operating date)
 * using local midday date objects to avoid timezone shifts.
 */
const calculateStayViewStartDate = (sysDateISO?: string): string => {
    const rawDate = sysDateISO || getOperatingSystemDate();
    const iso = formatToISODate(rawDate);
    const parts = (iso || '').split('-').map(Number);
    if (parts.length === 3 && !isNaN(parts[0]) && !isNaN(parts[1]) && !isNaN(parts[2])) {
        const d = new Date(parts[0], parts[1] - 1, parts[2] - 3, 12, 0, 0);
        const y = d.getFullYear();
        const m = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        return `${y}-${m}-${day}`;
    }
    const fallbackSys = getOperatingSystemDate();
    const fallbackParts = fallbackSys.split('-').map(Number);
    const d = new Date(fallbackParts[0] || 2026, (fallbackParts[1] || 7) - 1, (fallbackParts[2] || 1) - 3, 12, 0, 0);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
};

/**
 * Dynamically renders the correct Bed Type Icon to the left of the room number:
 * - Single Bed -> BedSingle
 * - Double Bed -> BedDouble
 * - King Bed   -> BedDouble with Crown
 * - Queen Bed  -> BedDouble in Queen purple
 * - Twin Bed   -> Dual BedSingle
 */
const renderRoomBedIcon = (bedType?: string, roomType?: string) => {
    const raw = `${bedType || ''} ${roomType || ''}`.toLowerCase();
    if (raw.includes('single')) {
        return (
            <span className="flex-shrink-0" title={`Single Bed (${bedType || 'Single'})`}>
                <BedSingle size={12} className="text-sky-600" />
            </span>
        );
    }
    if (raw.includes('twin')) {
        return (
            <span className="inline-flex items-center -space-x-1 flex-shrink-0" title={`Twin Bed (${bedType || 'Twin'})`}>
                <BedSingle size={10} className="text-teal-600" />
                <BedSingle size={10} className="text-teal-600" />
            </span>
        );
    }
    if (raw.includes('king')) {
        return (
            <span className="relative inline-flex items-center justify-center flex-shrink-0" title={`King Bed (${bedType || 'King'})`}>
                <BedDouble size={12} className="text-indigo-600" />
                <Crown size={6} className="absolute -top-1 -right-1 text-amber-500 fill-amber-400" />
            </span>
        );
    }
    if (raw.includes('queen')) {
        return (
            <span className="flex-shrink-0" title={`Queen Bed (${bedType || 'Queen'})`}>
                <BedDouble size={12} className="text-purple-600" />
            </span>
        );
    }
    return (
        <span className="flex-shrink-0" title={`Double Bed (${bedType || 'Double'})`}>
            <BedDouble size={12} className="text-gray-400" />
        </span>
    );
};

export const StayView: React.FC = () => {
    const { activeProperty } = useProperty();
    const activePropertyId = activeProperty?.id || 1;
    const { setActivePage } = useNavigation();
    const currencySymbol = useMemo(() => {
        const code = activeProperty?.currency || 'BDT';
        switch (code.toUpperCase()) {
            case 'USD': return '$';
            case 'EUR': return '€';
            case 'GBP': return '£';
            case 'INR': return '₹';
            case 'AED': return 'AED ';
            case 'BDT':
            default: return '৳';
        }
    }, [activeProperty?.currency]);

    // Dynamic Canonical Rooms Version
    const [roomsVersion, setRoomsVersion] = useState(0);

    // Current System Operating Date state (realtime synchronized with Header & Night Audit)
    const [operatingDateStr, setOperatingDateStr] = useState<string>(() => getOperatingSystemDate());

    // Current date state - starts 3 days before system date to show backdates (historical) like WingsCRM
    const [startDate, setStartDate] = useState<string>(() => calculateStayViewStartDate(getOperatingSystemDate()));
    const [daysWindow, setDaysWindow] = useState<number>(15);

    // Tree Expansion State - All floors 1-5 across Buildings 1 & 2 expanded by default
    const [expandedNodes, setExpandedNodes] = useState<Record<string, boolean>>({
        'b-1': true,
        'f-1': true,
        'f-2': true,
        'f-3': true,
        'b-2': true,
        'f-4': true,
        'f-5': true
    });

    const toggleNode = (nodeId: string) => {
        setExpandedNodes(prev => ({ ...prev, [nodeId]: !prev[nodeId] }));
    };

    // Information Popover (Legend) State
    const [isInfoPopoverOpen, setIsInfoPopoverOpen] = useState(false);

    // Modals & Selection
    const [isAddReservationOpen, setIsAddReservationOpen] = useState(false);
    const [isQuickReservationOpen, setIsQuickReservationOpen] = useState(false);
    const [editingReservation, setEditingReservation] = useState<StoredReservation | null>(null);
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

    // =========================================================================
    // UNIFIED RESERVATION ACTION DRAWER (ALL 12 MODES & FIXED PINNED FOOTER)
    // =========================================================================
    const [isActionDrawerOpen, setIsActionDrawerOpen] = useState(false);
    const [actionDrawerBooking, setActionDrawerBooking] = useState<AmendBookingData | null>(null);
    const [actionDrawerMode, setActionDrawerMode] = useState<DrawerMode>('overview');
    const [actionDrawerTargetDep, setActionDrawerTargetDep] = useState<string | undefined>();
    const [actionDrawerTargetNights, setActionDrawerTargetNights] = useState<number | undefined>();
    const [actionDrawerTargetRoom, setActionDrawerTargetRoom] = useState<string | undefined>();

    // =========================================================================
    // ROOM MAINTENANCE & OUT OF ORDER (OOO / OOS) STATE
    // =========================================================================
    const [isOOOModalOpen, setIsOOOModalOpen] = useState(false);
    const [selectedOOORoom, setSelectedOOORoom] = useState<string | undefined>(undefined);
    const [selectedOOOStart, setSelectedOOOStart] = useState<string | undefined>(undefined);
    const [selectedOOOEnd, setSelectedOOOEnd] = useState<string | undefined>(undefined);
    const [oooVersion, setOooVersion] = useState(0);

    const oooBlocks = useMemo(() => {
        return getStoredOOOBlocks(activePropertyId);
    }, [oooVersion, activePropertyId]);

    const activeOOOBlocksByRoom = useMemo(() => {
        const map = new Map<string, OutOfOrderBlock[]>();
        oooBlocks.filter(b => b.status === 'active' || b.status === 'extended').forEach(b => {
            const list = map.get(b.roomNumber) || [];
            list.push(b);
            map.set(b.roomNumber, list);
        });
        return map;
    }, [oooBlocks]);

    const activeOOOCount = useMemo(() => {
        return oooBlocks.filter(b => b.status === 'active' || b.status === 'extended').length;
    }, [oooBlocks]);

    const overdueOOOCount = useMemo(() => {
        return oooBlocks.filter(b => isBlockOverdue(b, operatingDateStr)).length;
    }, [oooBlocks, operatingDateStr]);

    useEffect(() => {
        const handleOOOUpdate = () => {
            setOooVersion(v => v + 1);
            setRoomsVersion(v => v + 1);
        };
        window.addEventListener('hotel_ooo_blocks_updated', handleOOOUpdate);
        syncOOOBlocksFromBackend(activePropertyId).then(() => {
            setOooVersion(v => v + 1);
        });
        return () => {
            window.removeEventListener('hotel_ooo_blocks_updated', handleOOOUpdate);
        };
    }, [activePropertyId]);

    // Extend / Shorten Drag State
    const [extendDrag, setExtendDrag] = useState<{
        booking: TimelineBooking;
        startX: number;
        originalEndIndex: number;
        currentEndIndex: number;
        attemptedEndIndex?: number;
        hasMoved?: boolean;
    } | null>(null);

    // Move Reservation Drag State
    const [moveDrag, setMoveDrag] = useState<{
        booking: TimelineBooking;
        startX: number;
        startY: number;
        currentX: number;
        currentY: number;
        grabOffsetCols?: number;
        isDragging: boolean;
        targetRoomNumber: string;
        targetStartIndex: number;
        targetEndIndex: number;
    } | null>(null);

    // Active drag indicator for suppressing hover popovers and unwanted interactions
    const isAnyDragActive = Boolean(dragState || extendDrag || (moveDrag && moveDrag.isDragging));

    // Helper: Identify in-house checked-in guests whose stay dates are historical fact and cannot be moved across dates
    const isInHouseBooking = React.useCallback((b: TimelineBooking) => {
        return b.status === 'arrived' || b.status === 'stayover' || (b as any).status === 'in-house';
    }, []);

    // =========================================================================
    // ASSIGN ROOMS DRAWER STATE (SLIM & COMPACT)
    // =========================================================================
    const [isAssignRoomsOpen, setIsAssignRoomsOpen] = useState(false);
    const [modalDateStartIndex, setModalDateStartIndex] = useState(0);
    const [selectedModalDateIndex, setSelectedModalDateIndex] = useState(0);
    const [expandedAccordions, setExpandedAccordions] = useState<Record<string, boolean>>({});
    const [activeAssigningId, setActiveAssigningId] = useState<string | null>(null);
    const [selectedRoomNumber, setSelectedRoomNumber] = useState<string>('');
    const [assignDrawerSearch, setAssignDrawerSearch] = useState('');

    const showToast = (msg: string) => {
        if (msg.includes('🔒') || msg.toLowerCase().includes('cannot') || msg.toLowerCase().includes('locked')) {
            toast.warning(msg);
        } else if (msg.toLowerCase().includes('cancelled') || msg.toLowerCase().includes('voided')) {
            toast.error(msg);
        } else {
            toast.success(msg);
        }
    };

    const toggleAccordion = (id: string) => {
        setExpandedAccordions(prev => ({ ...prev, [id]: !prev[id] }));
    };

    // Hydrate Unassigned Bookings dynamically from stored reservations - Zero Mock Fallback
    const [unassignedList, setUnassignedList] = useState<UnassignedBooking[]>(() => {
        if (typeof window !== 'undefined') {
            try {
                localStorage.removeItem('hotel_unassigned_v2');
                localStorage.removeItem('hotel_unassigned_queue');
            } catch {}
        }
        return deriveUnassignedFromStored(getAllStoredReservations());
    });

    useEffect(() => {
        if (typeof window !== 'undefined') {
            try {
                localStorage.removeItem('hotel_unassigned_v2');
            } catch {}
        }
    }, [unassignedList]);

    // Generate days array based on startDate and daysWindow with full Holiday awareness
    const days = useMemo(() => {
        const list = [];
        const parts = startDate.split('-').map(Number);
        const startY = parts[0] || 2026;
        const startM = (parts[1] || 7) - 1;
        const startD = parts[2] || 1;

        for (let i = 0; i < daysWindow; i++) {
            const current = new Date(startY, startM, startD + i, 12, 0, 0);
            const y = current.getFullYear();
            const m = String(current.getMonth() + 1).padStart(2, '0');
            const d = String(current.getDate()).padStart(2, '0');
            const iso = `${y}-${m}-${d}`;
            const holidayDetails = getDayHolidayDetails(iso);
            const isToday = iso === operatingDateStr;
            const isPast = iso < operatingDateStr;
            const isFuture = iso > operatingDateStr;

            list.push({
                index: i,
                date: iso,
                dayName: holidayDetails.dayName,
                num: holidayDetails.dayNum,
                monthShort: holidayDetails.monthName,
                fullDateStr: holidayDetails.fullFormattedDate,
                isWeekend: holidayDetails.isWeekend,
                weekendName: holidayDetails.weekendName,
                calendarHoliday: holidayDetails.calendarHoliday,
                isHoliday: holidayDetails.isHoliday,
                holidayTitle: holidayDetails.holidayTitle,
                categoryBadge: holidayDetails.categoryBadge,
                hasSurgeRate: holidayDetails.hasSurgeRate,
                rateMultiplier: holidayDetails.rateMultiplier,
                holidayDescription: holidayDetails.description,
                isToday,
                isPast,
                isFuture
            });
        }
        return list;
    }, [startDate, daysWindow, operatingDateStr]);

    // Anchor Assign Rooms drawer to Application Operating Date when opened
    useEffect(() => {
        if (isAssignRoomsOpen) {
            const appDate = operatingDateStr || getOperatingSystemDate();
            const foundIdx = days.findIndex(d => d.date === appDate);
            if (foundIdx >= 0) {
                setSelectedModalDateIndex(foundIdx);
                // Position carousel so that 3 days before today are visible if available, or start at index 0
                setModalDateStartIndex(Math.max(0, Math.min(days.length - 7, foundIdx - 3)));
            } else {
                setSelectedModalDateIndex(0);
                setModalDateStartIndex(0);
            }
        }
    }, [isAssignRoomsOpen]);

    // =========================================================================
    // DYNAMIC TIMELINE GRID RESPONSIVENESS (15 DAYS FIT ON SCREEN WITHOUT SCROLL)
    // =========================================================================
    const timelineContainerRef = useRef<HTMLDivElement>(null);
    const [containerWidth, setContainerWidth] = useState<number>(0);

    useEffect(() => {
        const el = timelineContainerRef.current;
        if (!el) return;

        const updateSize = () => {
            if (el.clientWidth > 0) {
                setContainerWidth(el.clientWidth);
            }
        };

        updateSize();

        const resizeObserver = new ResizeObserver((entries) => {
            for (const entry of entries) {
                const width = entry.contentRect.width;
                if (width > 0) {
                    setContainerWidth(Math.floor(width));
                }
            }
        });

        resizeObserver.observe(el);
        window.addEventListener('resize', updateSize);

        return () => {
            resizeObserver.disconnect();
            window.removeEventListener('resize', updateSize);
        };
    }, []);

    const TREE_COL_WIDTH = 230; // matches w-44 (11rem = 176px)

    const colWidth = useMemo(() => {
        if (!containerWidth || containerWidth <= TREE_COL_WIDTH) {
            return daysWindow === 7 ? 96 : daysWindow === 15 ? 54 : 44;
        }
        const available = containerWidth - TREE_COL_WIDTH;
        if (daysWindow === 7) {
            // Stretch across full width, min 70px
            return Math.max(70, Math.floor(available / 7));
        }
        if (daysWindow === 15) {
            // Math.floor ensures 15 * colWidth <= available, guaranteeing 100% fit on screen with 0 horizontal scroll!
            return Math.max(38, Math.floor(available / 15));
        }
        // 30 days: minimum 42px for clean readable layout
        return Math.max(42, Math.floor(available / 30));
    }, [containerWidth, daysWindow]);

    const gridWidth = useMemo(() => {
        return colWidth * daysWindow;
    }, [colWidth, daysWindow]);

    // Dynamic Canonical Rooms Structure (All 34 Rooms across 5 Floors)
    const roomTree: BuildingNode[] = useMemo(() => {
        const canonical = getCanonicalRooms(activePropertyId);
        const buildingNames: Record<string, string> = {
            '1': 'Building 1',
            '2': 'Building 2'
        };
        const floorNames: Record<string, string> = {
            '1': 'Floor 1',
            '2': 'Floor 2',
            '3': 'Floor 3',
            '4': 'Floor 4',
            '5': 'Floor 5'
        };

        try {
            const savedB = localStorage.getItem('hotel_buildings_v2');
            if (savedB) {
                const bList = JSON.parse(savedB);
                if (Array.isArray(bList)) {
                    bList.forEach((b: any) => {
                        const k = String(b.id || '');
                        if (k && (b.title || b.name)) buildingNames[k] = b.title || b.name;
                    });
                }
            }
            const savedF = localStorage.getItem('hotel_floors_v2');
            if (savedF) {
                const fList = JSON.parse(savedF);
                if (Array.isArray(fList)) {
                    fList.forEach((f: any) => {
                        const k = String(f.id || f.number || '');
                        if (k && f.name) floorNames[k] = f.name;
                    });
                }
            }
        } catch { }

        const buildingMap = new Map<string, Map<string, RoomNode[]>>();

        canonical.forEach(r => {
            const bId = String(r.buildingId || '1');
            const fId = String(r.floorId || '1');
            if (!buildingMap.has(bId)) {
                buildingMap.set(bId, new Map());
            }
            const floorMap = buildingMap.get(bId)!;
            if (!floorMap.has(fId)) {
                floorMap.set(fId, []);
            }
            const rawStatus = String(r.status || '').trim();
            const hkStatus = String(r.housekeepingStatus || '').trim().toLowerCase();
            const normalizedStatus = rawStatus.toLowerCase().includes('out of order') || rawStatus === 'out-of-order' || rawStatus === 'ooo'
                ? 'out-of-order'
                : rawStatus.toLowerCase().includes('out of service') || rawStatus === 'out-of-service' || rawStatus === 'oos'
                    ? 'out-of-service'
                    : hkStatus === 'inspected'
                        ? 'inspected'
                        : hkStatus === 'dirty'
                            ? 'dirty'
                            : 'clean';

            const isConn = Boolean(r.isConnecting || r.connectedTo);
            const connTo = r.connectedTo || undefined;

            floorMap.get(fId)!.push({
                id: `r-${r.number}`,
                roomNumber: String(r.number),
                type: r.roomTypeName,
                floor: fId,
                building: buildingNames[bId] || `Building ${bId}`,
                status: normalizedStatus,
                isConnecting: isConn,
                connectedTo: connTo,
                smokingStatus: r.smokingStatus || 'Non-Smoking',
                smokingAllowed: Boolean(r.smokingAllowed || r.smokingStatus === 'Smoking'),
                smokingPolicy: r.smokingPolicy || r.smokingStatus || 'Non-Smoking',
                bedType: (r as any).bedType || (r.roomTypeName?.includes('King') ? 'King' : r.roomTypeName?.includes('Queen') ? 'Queen' : r.roomTypeName?.includes('Twin') ? 'Twin' : 'King'),
                bedCount: (r as any).bedCount || 1
            });
        });

        const tree: BuildingNode[] = [];
        Array.from(buildingMap.keys()).sort().forEach(bId => {
            const floorMap = buildingMap.get(bId)!;
            const floors: FloorNode[] = [];
            Array.from(floorMap.keys()).sort().forEach(fId => {
                const rooms = floorMap.get(fId)!.sort((a, b) => a.roomNumber.localeCompare(b.roomNumber, undefined, { numeric: true }));
                floors.push({
                    id: `f-${fId}`,
                    name: floorNames[fId] || `Floor ${fId}`,
                    rooms
                });
            });
            tree.push({
                id: `b-${bId}`,
                name: buildingNames[bId] || `Building ${bId}`,
                floors
            });
        });

        return tree;
    }, [roomsVersion, activePropertyId]);

    // Total rooms count across entire hotel
    const totalRoomsCount = useMemo(() => {
        return roomTree.reduce((acc: number, b: BuildingNode) => acc + b.floors.reduce((facc: number, f: FloorNode) => facc + f.rooms.length, 0), 0);
    }, [roomTree]);

    // Flattened room list for assignment dropdowns
    const allRooms = useMemo(() => {
        const list: { roomNumber: string; type: string; floor: string; building: string; status: string }[] = [];
        roomTree.forEach(b => {
            b.floors.forEach(f => {
                f.rooms.forEach(r => {
                    list.push({ ...r, floor: f.name, building: b.name });
                });
            });
        });
        return list;
    }, [roomTree]);

    // Canonical timeline bookings derived directly from database and centralized storage
    const [bookings, setBookings] = useState<TimelineBooking[]>([]);

    // =========================================================================
    // HIGH-PERFORMANCE PRE-COMPUTED CACHES (EVENT-DRIVEN O(1) LOOKUPS)
    // =========================================================================

    // Multi-PC Network Real-Time Sync Status
    const [syncStatus, setSyncStatus] = useState<SyncStatus>({
        isConnected: false,
        mode: 'Local Browser Only',
        terminalId: 'Terminal-1',
        connectedTerminalsCount: 1,
        lastSyncedAt: Date.now()
    });

    useEffect(() => {
        initNetworkSync();
        const unsub = subscribeToSyncStatus(setSyncStatus);
        return () => unsub();
    }, []);

    // Active temporary soft locks on rooms across all executives/tabs
    const [activeLocks, setActiveLocks] = useState<RoomLock[]>(() => getActiveLocks());

    // Single source of truth: Sync stored reservations to timeline bookings dynamically by date
    const syncStoredReservations = React.useCallback(() => {
        const stored = getAllStoredReservations();
        const baseDate = new Date(days[0]?.date || calculateStayViewStartDate(operatingDateStr));
        const syncedList: TimelineBooking[] = [];

        for (const res of stored) {
            const rawStatus = String(res.status || '').toLowerCase().replace(/_/g, '-');
            if (rawStatus === 'cancelled' || rawStatus === 'voided' || rawStatus === 'no-show') {
                continue;
            }

            const isConnSuite = Boolean(
                res.isConnectingSuite ||
                (res.roomType && (res.roomType.toLowerCase().includes('connecting') || res.roomType.toLowerCase().includes('interconnecting'))) ||
                (typeof res.roomNumber === 'string' && res.roomNumber.includes('+'))
            );
            const isGroup = !isConnSuite && Boolean(
                res.isGroup ||
                res.groupCode ||
                ((res.roomsList && res.roomsList.length > 1) || (res.allocatedRooms && res.allocatedRooms.length > 1))
            );
            const totalAmt = Number(res.totalAmount) || 0;
            const paidAmt = Number(res.paidAmount) || 0;
            const dueAmt = Number(res.dueAmount !== undefined ? res.dueAmount : Math.max(0, totalAmt - paidAmt));
            const totalTax = Number(res.totalTaxAmount || res.taxDetails?.totalTaxAmount || 0);
            const baseAmt = Number(res.baseAmount || Math.max(0, totalAmt - totalTax));
            const taxCode = res.taxConfigCode || res.taxDetails?.configCode || 'HOSP-STD';
            const isTaxApp = res.taxApplicable !== false;
            const isPastBooking = Boolean(res.isPast || rawStatus === 'completed' || rawStatus === 'checked-out');
            const isInHouse = rawStatus === 'in-house' || rawStatus === 'arrived' || rawStatus === 'checked-in';
            const isHold = rawStatus === 'hold' || rawStatus === 'tentative';
            const isReserved = rawStatus === 'reserved' || rawStatus === 'reserve';
            const timelineStatus: TimelineBooking['status'] = isPastBooking ? 'checked-out' : isInHouse ? 'arrived' : isHold ? 'hold' : isReserved ? 'reserved' : 'confirmed';
            const regNo = res.registrationNumber || (isInHouse ? `REG-${res.reservationNumber.replace(/^RES-/, '')}` : undefined);
            const folioNo = res.folioNumber || `FOL-${res.reservationNumber.replace(/^RES-/, '')}-1`;

            if (isConnSuite) {
                const connRooms = (res.allocatedRooms && res.allocatedRooms.length > 0)
                    ? res.allocatedRooms.map(String)
                    : (typeof res.roomNumber === 'string' && res.roomNumber.includes('+')
                        ? res.roomNumber.split('+').map((s: string) => s.trim())
                        : (res.roomsList && res.roomsList.length > 0
                            ? res.roomsList.flatMap((rm: any) => String(rm.roomNumber).split('+').map((s: string) => s.trim()))
                            : (res.roomNumber ? [String(res.roomNumber)] : [])));

                connRooms.forEach((rNum: string) => {
                    const rIn = res.checkIn;
                    const rOut = res.checkOut;
                    const rNights = Number(res.nights || 1);
                    const sIdx = days.findIndex(d => d.date === rIn);
                    const curInDate = new Date(rIn);
                    const diffFromStart = Math.round((curInDate.getTime() - baseDate.getTime()) / (1000 * 60 * 60 * 24));
                    const start = sIdx !== -1 ? sIdx : diffFromStart;
                    const end = start + Math.max(1, rNights) - 1;

                    syncedList.push({
                        id: `res-${res.id}-suite-${rNum}`,
                        reservationNumber: res.reservationNumber,
                        subBookingNumber: res.reservationNumber,
                        groupCode: undefined,
                        registrationNumber: regNo,
                        registeredAt: res.registeredAt,
                        folioNumber: folioNo,
                        guestName: res.guestName,
                        roomNumber: rNum,
                        roomType: res.roomType || 'Interconnecting Suite',
                        ratePlan: res.ratePlan || 'Standard Rate',
                        rate: Number(res.rateAmount || res.totalAmount || 0),
                        startIndex: start,
                        endIndex: end,
                        checkInDate: rIn,
                        checkOutDate: rOut,
                        nights: rNights,
                        status: timelineStatus,
                        isPast: isPastBooking,
                        isGroupOwner: false,
                        isGroupBooking: false,
                        isConnectingSuite: true,
                        connectedTo: connRooms.filter((r: string) => r !== rNum).join(', '),
                        isPaymentDue: dueAmt > 0,
                        isVipOrSingleLady: Boolean(res.vip && res.vip !== 'None' && res.vip !== 'none'),
                        totalAmount: totalAmt,
                        paidAmount: paidAmt,
                        dueAmount: dueAmt,
                        baseAmount: baseAmt,
                        totalTaxAmount: totalTax,
                        taxConfigCode: taxCode,
                        taxApplicable: isTaxApp,
                        adults: Number(res.adults !== undefined ? res.adults : 2),
                        children: Number(res.children !== undefined ? res.children : 0)
                    });
                });
                continue;
            }

            if (res.roomsList && Array.isArray(res.roomsList) && res.roomsList.length > 0) {
                res.roomsList.forEach((r: any, idx: number) => {
                    const rNum = String(r.roomNumber || res.roomNumber);
                    const rIn = r.checkInDate || r.checkIn || res.checkIn;
                    const rOut = r.checkOutDate || r.checkOut || res.checkOut;
                    const rNights = Number(r.nights || res.nights || 1);
                    const rAdults = Number(r.adults !== undefined ? r.adults : (res.adults !== undefined ? res.adults : 2));
                    const rChildren = Number(r.children !== undefined ? r.children : (res.children !== undefined ? res.children : 0));

                    const sIdx = days.findIndex(d => d.date === rIn);
                    const curInDate = new Date(rIn);
                    const diffFromStart = Math.round((curInDate.getTime() - baseDate.getTime()) / (1000 * 60 * 60 * 24));
                    const start = sIdx !== -1 ? sIdx : diffFromStart;
                    const end = start + Math.max(1, rNights) - 1;

                    syncedList.push({
                        id: `res-${res.id}-${r.id || idx}-${rNum}`,
                        reservationNumber: res.reservationNumber,
                        subBookingNumber: r.subBookingNumber || ((res.roomsList?.length || 0) > 1 ? `${res.reservationNumber}-${String(idx + 1).padStart(2, '0')}` : res.reservationNumber),
                        groupCode: res.groupCode,
                        registrationNumber: r.registrationNumber || regNo,
                        registeredAt: res.registeredAt,
                        folioNumber: r.folioNumber || folioNo,
                        guestName: isGroup ? `${res.guestName} (${rNum})` : res.guestName,
                        roomNumber: rNum,
                        roomType: r.roomType || res.roomType || 'Standard Room',
                        ratePlan: r.ratePlan || res.ratePlan || 'Standard Rate',
                        rate: Number(r.rate || r.price || res.rateAmount || 0),
                        startIndex: start,
                        endIndex: end,
                        checkInDate: rIn,
                        checkOutDate: rOut,
                        nights: rNights,
                        status: timelineStatus,
                        isPast: isPastBooking,
                        isGroupOwner: isGroup && idx === 0,
                        isGroupBooking: isGroup,
                        isPaymentDue: dueAmt > 0,
                        isVipOrSingleLady: Boolean(res.vip && res.vip !== 'None' && res.vip !== 'none'),
                        totalAmount: totalAmt,
                        paidAmount: paidAmt,
                        dueAmount: dueAmt,
                        baseAmount: baseAmt,
                        totalTaxAmount: totalTax,
                        taxConfigCode: taxCode,
                        taxApplicable: isTaxApp,
                        adults: rAdults,
                        children: rChildren
                    });
                });
            } else {
                const rNum = String(res.roomNumber || (res.allocatedRooms && res.allocatedRooms[0]) || '101');
                const rIn = res.checkIn;
                const rOut = res.checkOut;
                const rNights = Number(res.nights || 1);
                const rAdults = Number(res.adults !== undefined ? res.adults : 2);
                const rChildren = Number(res.children !== undefined ? res.children : 0);

                const sIdx = days.findIndex(d => d.date === rIn);
                const curInDate = new Date(rIn);
                const diffFromStart = Math.round((curInDate.getTime() - baseDate.getTime()) / (1000 * 60 * 60 * 24));
                const start = sIdx !== -1 ? sIdx : diffFromStart;
                const end = start + Math.max(1, rNights) - 1;

                syncedList.push({
                    id: `res-${res.id}-${rNum}`,
                    reservationNumber: res.reservationNumber,
                    subBookingNumber: res.subBookingNumber || `${res.reservationNumber}-01`,
                    groupCode: res.groupCode,
                    registrationNumber: regNo,
                    registeredAt: res.registeredAt,
                    folioNumber: folioNo,
                    guestName: res.guestName,
                    roomNumber: rNum,
                    roomType: res.roomType || 'Standard Room',
                    ratePlan: res.ratePlan || 'Standard Rate',
                    rate: Number(res.rateAmount || res.totalAmount || 0),
                    startIndex: start,
                    endIndex: end,
                    checkInDate: rIn,
                    checkOutDate: rOut,
                    nights: rNights,
                    status: timelineStatus,
                    isPast: isPastBooking,
                    isGroupOwner: isGroup,
                    isGroupBooking: isGroup,
                    isPaymentDue: dueAmt > 0,
                    isVipOrSingleLady: Boolean(res.vip && res.vip !== 'None' && res.vip !== 'none'),
                    totalAmount: totalAmt,
                    paidAmount: paidAmt,
                    dueAmount: dueAmt,
                    baseAmount: baseAmt,
                    totalTaxAmount: totalTax,
                    taxConfigCode: taxCode,
                    taxApplicable: isTaxApp,
                    adults: rAdults,
                    children: rChildren
                });
            }
        }

        setBookings(syncedList);
    }, [days]);

    // Keep ref to latest syncStoredReservations to avoid re-triggering subscriptions on date change
    const syncStoredReservationsRef = useRef(syncStoredReservations);
    syncStoredReservationsRef.current = syncStoredReservations;

    // Automatically re-calculate booking bars whenever timeline days change
    useEffect(() => {
        syncStoredReservations();
    }, [syncStoredReservations]);

    // Subscribe to cross-tab PMS real-time synchronization events
    useEffect(() => {
        // Refresh unassigned bookings dynamically from central PMS store
        setUnassignedList(deriveUnassignedFromStored(getAllStoredReservations()));

        // Sync initially on mount from local cache and live DB (PostgreSQL)
        syncStoredReservationsRef.current();
        Promise.all([
            syncRoomTypesAndRoomsFromDB(),
            syncReservationsFromDB(),
            syncConnectingSuitesFromDB(activePropertyId)
        ]).then(() => {
            setRoomsVersion(v => v + 1);
            syncStoredReservationsRef.current();
        });

        const unsubscribe = subscribeToPMSEvents((event) => {
            setActiveLocks(getActiveLocks());

            if (event.type === 'SYSTEM_DATE_CHANGED') {
                const newSys = (event as any).systemDate || getOperatingSystemDate();
                setOperatingDateStr(newSys);
                setStartDate(calculateStayViewStartDate(newSys));
            }

            if (event.type === 'RESERVATION_COMMITTED' || event.type === 'RESERVATION_UPDATED' || event.type === 'INVENTORY_REFRESH') {
                setRoomsVersion(v => v + 1);
                syncStoredReservationsRef.current();
            }
        });

        const handleRoomsUpdated = () => {
            setRoomsVersion(v => v + 1);
        };
        window.addEventListener('hotel_rooms_updated', handleRoomsUpdated);

        const handleStorage = (e: StorageEvent) => {
            if (e.key === 'hotel_system_date' || e.key === 'hotel_system_date_iso') {
                const newSys = getOperatingSystemDate();
                setOperatingDateStr(newSys);
                setStartDate(calculateStayViewStartDate(newSys));
            }
            if (e.key === 'hotel_connecting_rooms_v1' || (e.key && e.key.startsWith('hotel_rooms'))) {
                setRoomsVersion(v => v + 1);
            }
        };
        window.addEventListener('storage', handleStorage);

        const timer = setInterval(() => {
            setActiveLocks(getActiveLocks());
        }, 4000);

        return () => {
            unsubscribe();
            window.removeEventListener('hotel_rooms_updated', handleRoomsUpdated);
            window.removeEventListener('storage', handleStorage);
            clearInterval(timer);
        };
    }, [activePropertyId]);

    // O(1) Pre-calculated Bookings Lookup Map by Room Number
    const bookingsByRoom = useMemo(() => {
        const map = new Map<string, TimelineBooking[]>();
        for (const b of bookings) {
            const list = map.get(b.roomNumber);
            if (list) list.push(b);
            else map.set(b.roomNumber, [b]);
        }
        return map;
    }, [bookings]);

    // Memoized Room Info for Quick Reservation Modal
    const quickReservationRoomInfo = useMemo(() => {
        if (!isQuickReservationOpen) return undefined;
        const startIso = selectedRange ? days[selectedRange.startIndex]?.date : startDate;
        const stayNights = selectedRange ? Math.max(1, selectedRange.endIndex - selectedRange.startIndex + 1) : 1;
        const baseStart = new Date(startIso || '2026-07-01');
        const baseEnd = new Date(baseStart);
        baseEnd.setDate(baseEnd.getDate() + stayNights);
        const endIso = baseEnd.toISOString().split('T')[0];
        return {
            room: selectedRange?.room || '101',
            roomNumber: selectedRange?.room || '101',
            startDate: startIso,
            checkIn: startIso,
            endDate: endIso,
            checkOut: endIso,
            nights: stayNights,
            startIndex: selectedRange?.startIndex,
            endIndex: selectedRange?.endIndex
        };
    }, [isQuickReservationOpen, selectedRange, days, startDate]);

    // Check if a target room and inclusive column range [startCol, endCol] conflicts with any existing booking OR Out of Order block
    const findRoomConflict = React.useCallback((
        roomNum: string,
        startCol: number,
        endCol: number,
        excludeBookingId?: string
    ): TimelineBooking | undefined => {
        const roomBookings = bookingsByRoom.get(String(roomNum)) || [];
        const bookingConflict = roomBookings.find(other => {
            if (excludeBookingId && (other.id === excludeBookingId || other.reservationNumber === excludeBookingId)) {
                return false;
            }
            return other.startIndex <= endCol && other.endIndex >= startCol;
        });
        if (bookingConflict) return bookingConflict;

        // Check if room has an active Out Of Order block for this date window
        const blocks = activeOOOBlocksByRoom.get(String(roomNum)) || [];
        const startDateStr = days[startCol]?.date;
        const endDateStr = days[endCol]?.date;
        if (startDateStr && endDateStr) {
            const oooMatch = blocks.find(b => b.blockType === 'OOO' && isDateRangeOverlapping(b.startDate, b.endDate, startDateStr, endDateStr));
            if (oooMatch) {
                return {
                    id: oooMatch.id,
                    reservationNumber: `OOO-${oooMatch.roomNumber}`,
                    guestName: `[Out of Order: ${oooMatch.reasonCategory}]`,
                    roomNumber: oooMatch.roomNumber,
                    roomType: oooMatch.roomType,
                    startIndex: startCol,
                    endIndex: endCol,
                    status: 'out-of-order',
                    nights: endCol - startCol + 1,
                    rate: 0
                };
            }
        }
        return undefined;
    }, [bookingsByRoom, activeOOOBlocksByRoom, days]);

    // O(1) Pre-calculated Soft Locks Lookup Map by Room Number
    const locksByRoom = useMemo(() => {
        const map = new Map<string, RoomLock[]>();
        for (const lock of activeLocks) {
            const list = map.get(lock.roomNumber);
            if (list) list.push(lock);
            else map.set(lock.roomNumber, [lock]);
        }
        return map;
    }, [activeLocks]);

    // O(1) Pre-calculated Floor Daily Breakdown Matrix [Available, Assigned, Unassigned]
    const floorDailyBreakdown = useMemo(() => {
        const breakdown: Record<string, { available: number; assigned: number; unassigned: number }[]> = {};
        for (const building of roomTree) {
            for (const floor of building.floors) {
                const floorRooms = floor.rooms;
                const floorRoomTypes = new Set(floorRooms.map((r: RoomNode) => r.type));
                const roomNumbersSet = new Set(floorRooms.map((r: RoomNode) => r.roomNumber));

                breakdown[floor.id] = days.map(d => {
                    const assignedCount = bookings.filter(b =>
                        roomNumbersSet.has(b.roomNumber) && d.index >= b.startIndex && d.index <= b.endIndex
                    ).length;
                    const availableCount = Math.max(0, floorRooms.length - assignedCount);

                    const unassignedCount = unassignedList.filter(u => {
                        const matchesType = floorRoomTypes.has(u.roomType) || u.roomType.includes(floor.name) || floorRooms.some((r: RoomNode) => u.roomType.includes(r.type));
                        if (!matchesType) return false;
                        const startIdx = days.findIndex(x => x.date === u.checkIn);
                        const s = startIdx >= 0 ? startIdx : 0;
                        const e = s + u.nights;
                        return d.index >= s && d.index < e;
                    }).length;

                    return { available: availableCount, assigned: assignedCount, unassigned: unassignedCount };
                });
            }
        }
        return breakdown;
    }, [roomTree, days, bookings, unassignedList]);

    // O(1) Pre-calculated Daily Occupancy Breakdown for Summary Bar & Badges
    const dailyOccupancy = useMemo(() => {
        return days.map(d => {
            const occupied = bookings.filter(b => d.index >= b.startIndex && d.index <= b.endIndex).length;
            const available = Math.max(0, totalRoomsCount - occupied);
            const percent = totalRoomsCount > 0 ? Math.round((occupied / totalRoomsCount) * 100) : 0;
            return { occupied, available, percent };
        });
    }, [days, bookings, totalRoomsCount]);

    // Check available rooms for an unassigned reservation during its stay dates
    const getAvailableRoomsForBooking = (booking: UnassignedBooking) => {
        const bStart = days.findIndex(d => d.date === booking.checkIn);
        const bEnd = days.findIndex(d => d.date === booking.checkOut);
        const startIdx = bStart >= 0 ? bStart : 0;
        const endIdx = bEnd >= 0 ? Math.max(startIdx, bEnd - 1) : startIdx + Math.max(1, booking.nights) - 1;

        return allRooms.filter(room => {
            const conflict = findRoomConflict(room.roomNumber, startIdx, endIdx);
            return !conflict;
        });
    };

    // Perform room allocation with atomic commit to central reservation repository
    const handleConfirmAssign = (booking: UnassignedBooking) => {
        const available = getAvailableRoomsForBooking(booking);
        const targetRoom = selectedRoomNumber || available[0]?.roomNumber || '102';
        const taxCalc = calculateReservationTaxes(booking.totalAmount, true);
        const finalPayable = taxCalc.grandTotal;

        const commitRes = validateAndCommitReservation({
            id: Date.now(),
            reservationNumber: booking.reservationNumber,
            guestName: booking.guestName,
            phone: '+880 1711-000000',
            email: 'guest@hospitality.com',
            roomNumber: targetRoom,
            roomType: booking.roomType,
            allocatedRooms: [targetRoom],
            roomsCount: 1,
            checkIn: booking.checkIn,
            checkOut: booking.checkOut,
            nights: booking.nights,
            status: 'confirmed',
            baseAmount: booking.totalAmount,
            taxApplicable: true,
            taxConfigId: taxCalc.configId,
            taxConfigCode: taxCalc.configCode,
            taxConfigName: taxCalc.configName,
            serviceChargeAmount: taxCalc.serviceChargeAmount,
            vatAmount: taxCalc.vatAmount,
            otherTaxesAmount: taxCalc.otherTaxesAmount,
            totalTaxAmount: taxCalc.totalTaxAmount,
            taxDetails: taxCalc,
            totalAmount: finalPayable,
            paidAmount: 0,
            dueAmount: finalPayable,
            source: booking.source || 'OTA Channel',
            roomsList: [{
                id: 1,
                roomNumber: targetRoom,
                roomType: booking.roomType,
                checkInDate: booking.checkIn,
                checkOutDate: booking.checkOut,
                nights: booking.nights,
                roomsCount: 1,
                assignedRooms: [targetRoom],
                rate: Math.round(booking.totalAmount / Math.max(1, booking.nights))
            }]
        });

        if (!commitRes.success) {
            showToast(`Cannot assign Room ${targetRoom}: ${commitRes.errorMessage || 'Room conflict detected!'}`);
            return;
        }

        setUnassignedList(prev => prev.filter(u => u.id !== booking.id));
        setActiveAssigningId(null);
        setSelectedRoomNumber('');
        showToast(`Room ${targetRoom} successfully assigned to ${booking.guestName} (${booking.reservationNumber})!`);
        syncStoredReservations();
    };

    // Date carousel days for the drawer
    const modalDays = days;
    const selectedDateObj = modalDays[selectedModalDateIndex] || modalDays[0];

    // Filter unassigned reservations for selected date in carousel
    const unassignedForSelectedDate = useMemo(() => {
        if (!selectedDateObj) return [];
        return unassignedList.filter(u => u.checkIn === selectedDateObj.date);
    }, [unassignedList, selectedDateObj]);

    const handleJumpToBooking = (booking: UnassignedBooking) => {
        if (!booking) return;
        const targetDate = booking.checkIn;
        const targetIdx = modalDays.findIndex(d => d.date === targetDate);
        if (targetIdx >= 0) {
            setSelectedModalDateIndex(targetIdx);
            setModalDateStartIndex(Math.max(0, Math.min(modalDays.length - 7, targetIdx)));
        } else {
            setStartDate(targetDate);
            setSelectedModalDateIndex(0);
            setModalDateStartIndex(0);
        }
        setExpandedAccordions(prev => ({ ...prev, [booking.id]: true }));
        setActiveAssigningId(booking.id);
        const freeRooms = getAvailableRoomsForBooking(booking);
        if (freeRooms.length > 0) {
            setSelectedRoomNumber(freeRooms[0].roomNumber);
        }
    };

    const searchMatchingUnassigned = useMemo(() => {
        if (!assignDrawerSearch.trim()) return [];
        const q = assignDrawerSearch.toLowerCase().trim();
        return unassignedList.filter(u =>
            (u.reservationNumber && u.reservationNumber.toLowerCase().includes(q)) ||
            (u.guestName && u.guestName.toLowerCase().includes(q)) ||
            (u.roomType && u.roomType.toLowerCase().includes(q)) ||
            (u.checkIn && u.checkIn.includes(q))
        );
    }, [unassignedList, assignDrawerSearch]);

    // Date formatting helpers
    const formatDayNum = (dateStr: string) => {
        if (!dateStr) return '01';
        const parts = dateStr.split('-');
        if (parts.length >= 3) return parts[2];
        const d = new Date(dateStr);
        return String(d.getDate()).padStart(2, '0');
    };

    const formatMonth = (dateStr: string) => {
        if (!dateStr) return 'Jul';
        const parts = dateStr.split('-');
        if (parts.length >= 2) {
            const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
            const mIdx = parseInt(parts[1], 10) - 1;
            if (mIdx >= 0 && mIdx < 12) return months[mIdx];
        }
        const d = new Date(dateStr);
        return d.toLocaleDateString('en-US', { month: 'short' });
    };

    // Today counts from pre-calculated dailyOccupancy
    const todayAssignedCount = useMemo(() => {
        const todayIndex = days.findIndex(d => d.isToday);
        const targetIdx = todayIndex >= 0 ? todayIndex : 0;
        return dailyOccupancy[targetIdx]?.occupied ?? 0;
    }, [dailyOccupancy, days]);

    const todayAvailableCount = useMemo(() => {
        const todayIndex = days.findIndex(d => d.isToday);
        const targetIdx = todayIndex >= 0 ? todayIndex : 0;
        return dailyOccupancy[targetIdx]?.available ?? totalRoomsCount;
    }, [dailyOccupancy, days, totalRoomsCount]);

    // Helper to enrich a timeline booking with live folio and financial calculations
    const getEnrichedBookingDetails = (booking: TimelineBooking): AmendBookingData => {
        let arrivalDateStr = booking.checkInDate || days[booking.startIndex]?.date || '2026-07-01';
        let currentDepDateStr = booking.checkOutDate;
        let currentNights = booking.nights;

        if (!currentDepDateStr || !currentNights) {
            const startD = new Date(arrivalDateStr);
            const spanNights = Math.max(1, booking.endIndex - booking.startIndex + 1);
            currentNights = spanNights;
            const endD = new Date(startD);
            endD.setDate(endD.getDate() + spanNights);
            currentDepDateStr = endD.toISOString().split('T')[0];
        }

        const stored = getAllStoredReservations();
        const originalRes = stored.find(r => r.reservationNumber === booking.reservationNumber);

        const nightsCount = currentNights;
        const dailyBaseRate = resolveReservationDailyBaseRate(originalRes, booking.roomNumber);
        const isTaxApp = originalRes?.taxApplicable !== false;
        const taxConfigId = originalRes?.taxConfigId;

        // If originalRes has full tax details, use them; otherwise compute accurately
        const taxCalc = calculateReservationTaxes(dailyBaseRate * nightsCount, isTaxApp, taxConfigId);
        const totalAmt = originalRes && originalRes.totalAmount ? Number(originalRes.totalAmount) : taxCalc.grandTotal;
        const paidAmt = originalRes ? Number(originalRes.paidAmount || 0) : 0;
        const dueAmt = originalRes ? Number(originalRes.dueAmount !== undefined ? originalRes.dueAmount : Math.max(0, totalAmt - paidAmt)) : Math.max(0, totalAmt - paidAmt);
        const totalTax = originalRes && originalRes.totalTaxAmount ? Number(originalRes.totalTaxAmount) : taxCalc.totalTaxAmount;
        const baseAmt = originalRes && originalRes.baseAmount ? Number(originalRes.baseAmount) : taxCalc.baseAmount;
        const taxCode = originalRes?.taxConfigCode || originalRes?.taxDetails?.configCode || 'HOSP-STD';

        const matchingRoomRow = originalRes?.roomsList?.find((r: any) => String(r.roomNumber) === String(booking.roomNumber));
        const resolvedAdults = Number(matchingRoomRow?.adults ?? originalRes?.adults ?? booking.adults ?? 2);
        const resolvedChildren = Number(matchingRoomRow?.children ?? originalRes?.children ?? booking.children ?? 0);
        const resolvedChildrenAges = matchingRoomRow?.childrenAges || originalRes?.childrenAges || [];

        const isConn = Boolean(
            booking.isConnectingSuite ||
            originalRes?.isConnectingSuite ||
            (originalRes?.roomType && (originalRes.roomType.toLowerCase().includes('connecting') || originalRes.roomType.toLowerCase().includes('interconnecting'))) ||
            (typeof originalRes?.roomNumber === 'string' && originalRes.roomNumber.includes('+'))
        );

        const subBookingNo = isConn
            ? booking.reservationNumber
            : (matchingRoomRow?.subBookingNumber || originalRes?.subBookingNumber || (originalRes?.roomsList && originalRes.roomsList.length > 1 ? `${booking.reservationNumber}-01` : booking.reservationNumber));
        const regNo = isConn
            ? (originalRes?.registrationNumber || booking.registrationNumber)
            : (matchingRoomRow?.registrationNumber || booking.registrationNumber || originalRes?.registrationNumber || (booking.status === 'arrived' ? `REG-${subBookingNo.replace(/^RES-/, '')}` : undefined));
        const folioNo = isConn
            ? (originalRes?.folioNumber || booking.folioNumber || `FOL-${booking.reservationNumber.replace(/^RES-/, '')}`)
            : (matchingRoomRow?.folioNumber || booking.folioNumber || originalRes?.folioNumber || `FOL-${subBookingNo.replace(/^RES-/, '')}`);

        // Build dynamic groupRoomsList if present on originalRes or by cross-referencing stored reservations
        let groupRoomsList = isConn ? undefined : originalRes?.groupRoomsList;
        if (!isConn && (!groupRoomsList || groupRoomsList.length === 0)) {
            if (originalRes?.groupCode) {
                const linkedRes = stored.filter(r => r.groupCode === originalRes.groupCode);
                groupRoomsList = linkedRes.flatMap((lr, lIdx) => {
                    const rooms = lr.roomsList && lr.roomsList.length > 0 ? lr.roomsList : [{
                        roomNumber: lr.roomNumber,
                        roomType: lr.roomType,
                        ratePlan: lr.ratePlan || 'Standard Rate',
                        guestName: lr.guestName,
                        adults: lr.adults,
                        children: lr.children,
                        status: lr.status,
                        subBookingNumber: lr.subBookingNumber || lr.reservationNumber,
                        registrationNumber: lr.registrationNumber,
                        folioNumber: lr.folioNumber,
                        isPrimary: lIdx === 0
                    }];
                    return rooms.map((rm: any, rIdx: number) => ({
                        ...rm,
                        reservationNumber: rm.subBookingNumber || lr.reservationNumber,
                        guestName: rm.guestName || lr.guestName,
                        ratePlan: lr.ratePlan || 'Standard Rate',
                        isPrimary: lIdx === 0 && rIdx === 0
                    }));
                });
            } else if (originalRes?.roomsList && originalRes.roomsList.length > 1) {
                groupRoomsList = originalRes.roomsList.map((rm: any, idx: number) => ({
                    ...rm,
                    reservationNumber: rm.subBookingNumber || `${booking.reservationNumber}-${String(idx + 1).padStart(2, '0')}`,
                    guestName: originalRes.guestName,
                    ratePlan: originalRes.ratePlan || 'Standard Rate',
                    isPrimary: idx === 0
                }));
            }
        }

        const connRoomsDisplay = isConn && originalRes?.allocatedRooms && originalRes.allocatedRooms.length > 1
            ? originalRes.allocatedRooms.join(' + ')
            : (isConn && typeof originalRes?.roomNumber === 'string' && originalRes.roomNumber.includes('+')
                ? originalRes.roomNumber
                : booking.roomNumber);

        return {
            id: booking.id,
            reservationNumber: booking.reservationNumber,
            groupCode: isConn ? undefined : originalRes?.groupCode,
            isConnectingSuite: isConn,
            subBookingNumber: isConn ? booking.reservationNumber : subBookingNo,
            registrationNumber: regNo,
            registeredAt: booking.registeredAt || originalRes?.registeredAt,
            folioNumber: folioNo,
            groupRoomsList,
            roomsList: isConn ? undefined : originalRes?.roomsList,
            allocatedRooms: originalRes?.allocatedRooms,
            guestName: booking.guestName,
            roomNumber: connRoomsDisplay,
            roomType: isConn ? (originalRes?.roomType || 'Interconnecting Suite') : (originalRes?.roomType || 'Deluxe Double'),
            ratePlan: originalRes?.ratePlan || 'Standard Rate',
            arrivalDate: arrivalDateStr,
            departureDate: currentDepDateStr,
            nights: currentNights,
            avgDailyRate: Math.round(baseAmt / Math.max(1, currentNights)),
            status: booking.status.toUpperCase(),
            isPast: booking.isPast,
            totalAmount: totalAmt,
            paidAmount: paidAmt,
            dueAmount: dueAmt,
            baseAmount: baseAmt,
            taxApplicable: isTaxApp,
            taxConfigId: originalRes?.taxConfigId,
            taxConfigCode: taxCode,
            taxConfigName: originalRes?.taxConfigName || originalRes?.taxDetails?.configName || 'Standard Hospitality Rule',
            serviceChargeAmount: originalRes?.serviceChargeAmount || originalRes?.taxDetails?.serviceChargeAmount || 0,
            vatAmount: originalRes?.vatAmount || originalRes?.taxDetails?.vatAmount || 0,
            otherTaxesAmount: originalRes?.otherTaxesAmount || originalRes?.taxDetails?.otherTaxesAmount || 0,
            totalTaxAmount: totalTax,
            taxDetails: originalRes?.taxDetails,
            phone: originalRes?.phone,
            email: originalRes?.email,
            vip: originalRes?.vip,
            source: originalRes?.source,
            adults: resolvedAdults,
            children: resolvedChildren,
            childrenAges: resolvedChildrenAges
        };
    };

    // Hover tooltip state for StayView booking bars
    const [hoveredBooking, setHoveredBooking] = useState<{
        booking: TimelineBooking;
        enriched: AmendBookingData;
        rect: { top: number; left: number; right: number; bottom: number; width: number; height: number };
    } | null>(null);
    const hoverTimerRef = useRef<any>(null);

    // Dismiss hover tooltip on window scroll or resize
    useEffect(() => {
        const handleDismissHover = () => {
            if (hoveredBooking) setHoveredBooking(null);
        };
        window.addEventListener('scroll', handleDismissHover, true);
        window.addEventListener('resize', handleDismissHover);
        return () => {
            window.removeEventListener('scroll', handleDismissHover, true);
            window.removeEventListener('resize', handleDismissHover);
        };
    }, [hoveredBooking]);

    // Hover tooltip state for StayView date column headers & holidays
    const [hoveredDate, setHoveredDate] = useState<{
        day: (typeof days)[0];
        rect: { top: number; left: number; right: number; bottom: number; width: number; height: number };
    } | null>(null);
    const dateHoverTimerRef = useRef<any>(null);

    // Dismiss date hover tooltip on window scroll or resize
    useEffect(() => {
        const handleDismissDateHover = () => {
            if (hoveredDate) setHoveredDate(null);
        };
        window.addEventListener('scroll', handleDismissDateHover, true);
        window.addEventListener('resize', handleDismissDateHover);
        return () => {
            window.removeEventListener('scroll', handleDismissDateHover, true);
            window.removeEventListener('resize', handleDismissDateHover);
        };
    }, [hoveredDate]);

    // Open Unified Reservation Action Drawer on Normal Click
    const handleOpenDetailsDrawer = (booking: TimelineBooking) => {
        if (hoverTimerRef.current) clearTimeout(hoverTimerRef.current);
        setHoveredBooking(null);
        const bData = getEnrichedBookingDetails(booking);
        setActionDrawerBooking(bData);
        setActionDrawerMode('overview');
        setIsActionDrawerOpen(true);
    };

    // Open Unified Action Drawer in Amend Stay Mode on Drag-to-Extend or Resize Handle Click
    const handleOpenAmendModal = (booking: TimelineBooking, customTargetDep?: string, customTargetNights?: number) => {
        let arrivalDateStr = booking.checkInDate || days[booking.startIndex]?.date || '2026-07-01';
        let currentDepDateStr = booking.checkOutDate;
        let currentNights = booking.nights;

        if (!currentDepDateStr || !currentNights) {
            const startD = new Date(arrivalDateStr);
            const spanNights = Math.max(1, booking.endIndex - booking.startIndex + 1);
            currentNights = spanNights;
            const endD = new Date(startD);
            endD.setDate(endD.getDate() + spanNights);
            currentDepDateStr = endD.toISOString().split('T')[0];
        }

        let targetDeparture = customTargetDep;
        let targetNights = customTargetNights;

        if (!targetDeparture) {
            const d = new Date(currentDepDateStr);
            d.setDate(d.getDate() + 1);
            targetDeparture = d.toISOString().split('T')[0];
            targetNights = currentNights + 1;
        }

        // Guard against extending into an already booked slot on this room
        const desiredEndCol = booking.startIndex + Math.max(1, targetNights || currentNights + 1) - 1;
        if (desiredEndCol > booking.endIndex) {
            const conflict = findRoomConflict(booking.roomNumber, booking.startIndex, desiredEndCol, booking.id);
            if (conflict) {
                toast.error(`Cannot extend Room ${booking.roomNumber}: Already booked by ${conflict.guestName} (${conflict.reservationNumber}) from ${conflict.checkInDate}!`);
                return;
            }
        }

        const stored = getAllStoredReservations();
        const originalRes = stored.find(r => r.reservationNumber === booking.reservationNumber);

        const nightsCount = currentNights;
        const dailyBaseRate = resolveReservationDailyBaseRate(originalRes, booking.roomNumber);
        const isTaxApp = originalRes?.taxApplicable !== false;
        const taxConfigId = originalRes?.taxConfigId;

        // If originalRes has full tax details, use them; otherwise compute accurately
        const taxCalc = calculateReservationTaxes(dailyBaseRate * nightsCount, isTaxApp, taxConfigId);
        const totalAmt = originalRes && originalRes.totalAmount ? Number(originalRes.totalAmount) : taxCalc.grandTotal;
        const paidAmt = originalRes ? Number(originalRes.paidAmount || 0) : 0;
        const dueAmt = originalRes ? Number(originalRes.dueAmount !== undefined ? originalRes.dueAmount : Math.max(0, totalAmt - paidAmt)) : Math.max(0, totalAmt - paidAmt);
        const totalTax = originalRes && originalRes.totalTaxAmount ? Number(originalRes.totalTaxAmount) : taxCalc.totalTaxAmount;
        const baseAmt = originalRes && originalRes.baseAmount ? Number(originalRes.baseAmount) : taxCalc.baseAmount;
        const taxCode = originalRes?.taxConfigCode || originalRes?.taxDetails?.configCode || 'HOSP-STD';

        const matchingRoomRow = originalRes?.roomsList?.find((r: any) => String(r.roomNumber) === String(booking.roomNumber));
        const resolvedAdults = Number(matchingRoomRow?.adults ?? originalRes?.adults ?? booking.adults ?? 2);
        const resolvedChildren = Number(matchingRoomRow?.children ?? originalRes?.children ?? booking.children ?? 0);
        const resolvedChildrenAges = matchingRoomRow?.childrenAges || originalRes?.childrenAges || [];

        const bData: AmendBookingData = {
            id: booking.id,
            reservationNumber: booking.reservationNumber,
            guestName: booking.guestName,
            roomNumber: booking.roomNumber,
            roomType: originalRes?.roomType || 'Deluxe Double',
            ratePlan: originalRes?.ratePlan || 'Standard Rate',
            arrivalDate: arrivalDateStr,
            departureDate: currentDepDateStr,
            nights: currentNights,
            avgDailyRate: Math.round(baseAmt / Math.max(1, currentNights)),
            status: booking.status.toUpperCase(),
            totalAmount: totalAmt,
            paidAmount: paidAmt,
            dueAmount: dueAmt,
            baseAmount: baseAmt,
            taxApplicable: isTaxApp,
            taxConfigId: originalRes?.taxConfigId,
            taxConfigCode: taxCode,
            taxConfigName: originalRes?.taxConfigName || originalRes?.taxDetails?.configName || 'Standard Hospitality Rule',
            serviceChargeAmount: originalRes?.serviceChargeAmount || originalRes?.taxDetails?.serviceChargeAmount || 0,
            vatAmount: originalRes?.vatAmount || originalRes?.taxDetails?.vatAmount || 0,
            otherTaxesAmount: originalRes?.otherTaxesAmount || originalRes?.taxDetails?.otherTaxesAmount || 0,
            totalTaxAmount: totalTax,
            taxDetails: originalRes?.taxDetails,
            phone: originalRes?.phone,
            email: originalRes?.email,
            vip: originalRes?.vip,
            source: originalRes?.source,
            adults: resolvedAdults,
            children: resolvedChildren,
            childrenAges: resolvedChildrenAges
        };

        setActionDrawerBooking(bData);
        setActionDrawerMode('amend');
        setActionDrawerTargetDep(targetDeparture);
        setActionDrawerTargetNights(targetNights || currentNights + 1);
        setIsActionDrawerOpen(true);
    };

    // Save Extended / Shortened Stay to Central PMS Storage & Database
    const handleSaveAmendStay = (bookingId: string, _newDeparture: string, newNights: number, newAdults?: number, newChildren?: number) => {
        const targetB = bookings.find(b => b.id === bookingId);
        if (!targetB) return;

        // Derive canonical nights and departure date from checkInDate + canonicalNights
        const arrivalDateStr = targetB.checkInDate || days[targetB.startIndex]?.date || '2026-07-01';
        const canonicalNights = Math.max(1, Number(newNights) || 1);
        const depDateObj = new Date(arrivalDateStr);
        depDateObj.setDate(depDateObj.getDate() + canonicalNights);
        const canonicalDeparture = depDateObj.toISOString().split('T')[0];
        const calculatedEndCol = targetB.startIndex + canonicalNights - 1;

        // Strict Double-Booking Collision Check before amending stay
        const conflict = findRoomConflict(targetB.roomNumber, targetB.startIndex, calculatedEndCol, targetB.id);
        if (conflict) {
            toast.error(`Cannot extend Room ${targetB.roomNumber} to ${canonicalDeparture}: Already booked by ${conflict.guestName} (${conflict.reservationNumber}) from ${conflict.checkInDate}!`);
            return;
        }

        // Persist to central reservation storage & Database
        const stored = getAllStoredReservations();
        const resIdx = stored.findIndex(r => r.reservationNumber === targetB.reservationNumber);
        if (resIdx !== -1) {
            const res = stored[resIdx];
            const updated = { ...res };
            updated.checkOut = canonicalDeparture;
            updated.nights = canonicalNights;
            if (newAdults !== undefined) updated.adults = newAdults;
            if (newChildren !== undefined) updated.children = newChildren;

            if (updated.roomsList && Array.isArray(updated.roomsList)) {
                updated.roomsList = updated.roomsList.map((r: any) => {
                    if (String(r.roomNumber) === String(targetB.roomNumber)) {
                        const rowAdults = newAdults !== undefined ? newAdults : (r.adults ?? 2);
                        const rowChildren = newChildren !== undefined ? newChildren : (r.children ?? 0);
                        const standardRate = getStandardDailyRateForRoom(targetB.roomNumber, r.roomType || res.roomType);
                        const updatedRate = calculateTariffForRatePlan(r.ratePlan || res.ratePlan, r.roomType || res.roomType, standardRate, rowAdults, rowChildren);
                        return {
                            ...r,
                            checkOut: canonicalDeparture,
                            checkOutDate: canonicalDeparture,
                            nights: canonicalNights,
                            adults: rowAdults,
                            children: rowChildren,
                            rate: updatedRate
                        };
                    }
                    return r;
                });
            }

            // Calculate base daily rate with updated occupancy
            const matchingRow = updated.roomsList?.find((r: any) => String(r.roomNumber) === String(targetB.roomNumber));
            const dailyBase = matchingRow?.rate || resolveReservationDailyBaseRate(updated, targetB.roomNumber);
            const newBaseAmount = dailyBase * canonicalNights;

            // Recalculate multi-tier taxes & VAT with central engine (/taxes-vat)
            const isTaxApp = res.taxApplicable !== false;
            const newTaxCalc = calculateReservationTaxes(newBaseAmount, isTaxApp, res.taxConfigId);

            updated.baseAmount = newBaseAmount;
            updated.taxDetails = newTaxCalc;
            updated.totalTaxAmount = newTaxCalc.totalTaxAmount;
            updated.serviceChargeAmount = newTaxCalc.serviceChargeAmount;
            updated.vatAmount = newTaxCalc.vatAmount;
            updated.otherTaxesAmount = newTaxCalc.otherTaxesAmount;
            updated.taxConfigCode = newTaxCalc.configCode;
            updated.taxConfigName = newTaxCalc.configName;
            updated.totalAmount = newTaxCalc.grandTotal;
            updated.dueAmount = Math.max(0, newTaxCalc.grandTotal - (updated.paidAmount || 0));

            stored[resIdx] = updated;
            saveStoredReservations(stored);

            // Persist to Relational Database via API
            amendStayInDB(targetB.reservationNumber, canonicalDeparture, canonicalNights, {
                roomNumber: targetB.roomNumber,
                newTotalAmount: newTaxCalc.grandTotal,
                newDueAmount: Math.max(0, newTaxCalc.grandTotal - (updated.paidAmount || 0)),
                newBaseAmount: newBaseAmount,
                taxDetails: newTaxCalc
            });

            broadcastPMSEvent({ type: 'RESERVATION_COMMITTED', reservation: updated });
        } else {
            // Also call API directly with reservation number or ID
            amendStayInDB(targetB.reservationNumber || bookingId, canonicalDeparture, canonicalNights, {
                roomNumber: targetB.roomNumber
            });
        }

        setBookings(prev => prev.map(b => {
            if (b.id !== bookingId) return b;
            return {
                ...b,
                endIndex: calculatedEndCol,
                checkOutDate: canonicalDeparture,
                nights: canonicalNights
            };
        }));

        showToast(`Reservation ${targetB.reservationNumber} (${targetB.guestName}) updated to ${canonicalDeparture} (${canonicalNights} Nights)!`);
    };

    // Save Room Move to Central PMS Storage & Database
    const handleSaveRoomMove = (bookingId: string, newRoomNumber: string, newFromDate: string, newToDate: string) => {
        const targetB = bookings.find(b => b.id === bookingId);
        if (!targetB) return;

        const isGuestInHouse = isInHouseBooking(targetB);
        // For in-house bookings, move cannot be backdated before System Date!
        const validatedFromDate = isGuestInHouse && newFromDate < operatingDateStr
            ? operatingDateStr
            : newFromDate;

        const baseDate = new Date(days[0]?.date || calculateStayViewStartDate(operatingDateStr));
        const fromIdx = days.findIndex(d => d.date === validatedFromDate);
        const startCol = fromIdx >= 0 ? fromIdx : Math.round((new Date(validatedFromDate).getTime() - baseDate.getTime()) / 86400000);
        const stayNights = Math.max(1, Math.round((new Date(newToDate).getTime() - new Date(validatedFromDate).getTime()) / 86400000) || (targetB.endIndex - targetB.startIndex + 1));
        const endCol = isGuestInHouse ? targetB.endIndex : (startCol + stayNights - 1);

        // Strict Double-Booking Collision Check on target room before moving
        const conflict = findRoomConflict(newRoomNumber, isGuestInHouse ? targetB.startIndex : startCol, endCol, targetB.id);
        if (conflict) {
            toast.error(`Cannot move to Room ${newRoomNumber}: Already booked by ${conflict.guestName} (${conflict.reservationNumber}) from ${conflict.checkInDate} to ${conflict.checkOutDate}!`);
            return;
        }

        const stored = getAllStoredReservations();
        const resIdx = stored.findIndex(r => r.reservationNumber === targetB.reservationNumber);
        if (resIdx !== -1) {
            const res = stored[resIdx];
            const updated = { ...res };

            if (updated.roomsList && Array.isArray(updated.roomsList)) {
                updated.roomsList = updated.roomsList.map((r: any) => {
                    if (String(r.roomNumber) === String(targetB.roomNumber)) {
                        return {
                            ...r,
                            roomNumber: newRoomNumber,
                            assignedRooms: [newRoomNumber],
                            checkIn: isGuestInHouse ? (r.checkIn || r.checkInDate || res.checkIn) : validatedFromDate,
                            checkOut: newToDate,
                            checkInDate: isGuestInHouse ? (r.checkIn || r.checkInDate || res.checkIn) : validatedFromDate,
                            checkOutDate: newToDate,
                            nights: isGuestInHouse ? (r.nights || res.nights || stayNights) : stayNights
                        };
                    }
                    return r;
                });
            }

            if (String(updated.roomNumber) === String(targetB.roomNumber)) {
                updated.roomNumber = newRoomNumber;
                if (!isGuestInHouse) {
                    updated.checkIn = validatedFromDate;
                }
                updated.checkOut = newToDate;
                if (!isGuestInHouse) {
                    updated.nights = stayNights;
                }
            }
            if (updated.allocatedRooms && Array.isArray(updated.allocatedRooms)) {
                updated.allocatedRooms = updated.allocatedRooms.map((rm: string) => rm === targetB.roomNumber ? newRoomNumber : rm);
            }

            stored[resIdx] = updated;
            saveStoredReservations(stored);

            // Persist to Relational Database via API
            moveRoomInDB(targetB.reservationNumber, newRoomNumber, validatedFromDate, newToDate, targetB.roomNumber);

            // Auto-mark vacated room as Dirty if in-house guest moved
            if (isGuestInHouse && targetB.roomNumber) {
                updateRoomHousekeepingInDB(targetB.roomNumber, 'Dirty');
            }

            broadcastPMSEvent({ type: 'RESERVATION_COMMITTED', reservation: updated });
        } else {
            moveRoomInDB(targetB.reservationNumber || bookingId, newRoomNumber, validatedFromDate, newToDate, targetB.roomNumber);
            if (isGuestInHouse && targetB.roomNumber) {
                updateRoomHousekeepingInDB(targetB.roomNumber, 'Dirty');
            }
        }

        setBookings(prev => prev.map(b => {
            if (b.id !== bookingId) return b;
            return {
                ...b,
                roomNumber: newRoomNumber,
                startIndex: isGuestInHouse ? b.startIndex : startCol,
                endIndex: isGuestInHouse ? b.endIndex : endCol,
                checkInDate: isGuestInHouse ? b.checkInDate : validatedFromDate,
                checkOutDate: newToDate,
                nights: isGuestInHouse ? b.nights : stayNights
            };
        }));

        showToast(`Reservation ${targetB.reservationNumber} (${targetB.guestName}) moved to Room ${newRoomNumber} (${newFromDate} to ${newToDate})!`);
    };

    // Core PMS Live Action Handlers for Unified Action Drawer
    const handleSavePayment = (bookingId: string, method: string, amount: number, remarks: string = '') => {
        const targetB = bookings.find(item => item.id === bookingId);
        if (!targetB) return;

        const stored = getAllStoredReservations();
        const resIdx = stored.findIndex(r => r.reservationNumber === targetB.reservationNumber);
        let newDue = 0;
        if (resIdx !== -1) {
            const res = stored[resIdx];
            const updated = { ...res };
            updated.paidAmount = (updated.paidAmount || 0) + amount;
            updated.dueAmount = Math.max(0, (updated.totalAmount || 0) - updated.paidAmount);
            newDue = updated.dueAmount;
            stored[resIdx] = updated;
            localStorage.setItem('hotel_reservations_v2', JSON.stringify(stored));
            localStorage.setItem('hotel_reservations_v3', JSON.stringify(stored));

            // Persist to Database via API
            recordPaymentInDB(targetB.reservationNumber, amount, method, remarks);

            broadcastPMSEvent({ type: 'RESERVATION_COMMITTED', reservation: updated });
        } else {
            recordPaymentInDB(targetB.reservationNumber || bookingId, amount, method, remarks);
        }

        setBookings(prev => prev.map(b => b.id === bookingId ? { ...b, paidAmount: (b.paidAmount || 0) + amount, dueAmount: newDue, isPaymentDue: newDue > 0 } : b));
        showToast(`Payment of ${currencySymbol}${amount.toLocaleString()} received via ${method} for ${targetB.guestName}!`);
    };

    const handleSaveRoomSplit = (bookingId: string, targetRoomNumber: string, splitFromDate?: string, splitToDate?: string) => {
        const target = bookings.find(b => b.id === bookingId);
        if (!target) return;

        const stored = getAllStoredReservations();
        const resIdx = stored.findIndex(r => r.reservationNumber === target.reservationNumber);
        if (resIdx === -1) return;

        const res = stored[resIdx];
        const checkIn = target.checkInDate || res.checkIn;
        const checkOut = splitToDate || target.checkOutDate || res.checkOut;
        const totalNights = target.nights || res.nights || 2;

        let effectiveSplitDate = splitFromDate;
        if (!effectiveSplitDate) {
            const inD = new Date(checkIn);
            const midNights = Math.max(1, Math.floor(totalNights / 2));
            inD.setDate(inD.getDate() + midNights);
            effectiveSplitDate = inD.toISOString().split('T')[0];
        }

        const nights1 = Math.max(1, Math.round((new Date(effectiveSplitDate).getTime() - new Date(checkIn).getTime()) / (1000 * 60 * 60 * 24)));
        const nights2 = Math.max(1, Math.round((new Date(checkOut).getTime() - new Date(effectiveSplitDate).getTime()) / (1000 * 60 * 60 * 24)));

        const baseDate = new Date(days[0]?.date || calculateStayViewStartDate(operatingDateStr));
        const splitIdx = days.findIndex(d => d.date === effectiveSplitDate);
        const startCol2 = splitIdx >= 0 ? splitIdx : Math.round((new Date(effectiveSplitDate).getTime() - baseDate.getTime()) / 86400000);
        const endCol2 = startCol2 + nights2 - 1;
        const splitConflict = findRoomConflict(targetRoomNumber, startCol2, endCol2, target.id);
        if (splitConflict) {
            toast.error(`Cannot split to Room ${targetRoomNumber}: Already occupied by ${splitConflict.guestName} (${splitConflict.reservationNumber}) from ${splitConflict.checkInDate}!`);
            return;
        }

        const splitRoomsList = [
            {
                id: 1,
                roomNumber: target.roomNumber,
                roomType: res.roomType,
                checkInDate: checkIn,
                checkOutDate: effectiveSplitDate,
                nights: nights1,
                roomsCount: 1,
                assignedRooms: [target.roomNumber]
            },
            {
                id: 2,
                roomNumber: targetRoomNumber,
                roomType: res.roomType,
                checkInDate: effectiveSplitDate,
                checkOutDate: checkOut,
                nights: nights2,
                roomsCount: 1,
                assignedRooms: [targetRoomNumber]
            }
        ];

        const updated = {
            ...res,
            allocatedRooms: [target.roomNumber, targetRoomNumber],
            roomsList: splitRoomsList
        };

        stored[resIdx] = updated;
        saveStoredReservations(stored);

        // Persist to Database via API
        splitStayInDB(target.reservationNumber, targetRoomNumber, effectiveSplitDate, checkIn, checkOut);

        broadcastPMSEvent({ type: 'RESERVATION_COMMITTED', reservation: updated });
        syncStoredReservations();
        showToast(`Reservation ${target.reservationNumber} split between Room ${target.roomNumber} (until ${effectiveSplitDate}) & Room ${targetRoomNumber}!`);
    };

    const handleStopRoomMove = (bookingId: string, allow: boolean) => {
        const target = bookings.find(b => b.id === bookingId);
        showToast(`Room move status updated for ${target?.guestName || 'reservation'} (Allow: ${allow})`);
    };

    const handleProceedNewBooking = () => {
        setIsActionDrawerOpen(false);
        setEditingReservation(null);
        setIsAddReservationOpen(true);
    };

    const handleConfirmCancel = (bookingId: string, fee: number, refund: number) => {
        const target = bookings.find(b => b.id === bookingId);
        if (!target) return;

        const stored = getAllStoredReservations();
        const resIdx = stored.findIndex(r => r.reservationNumber === target.reservationNumber);
        if (resIdx !== -1) {
            const res = stored[resIdx];
            const updated = {
                ...res,
                status: 'cancelled',
                cancellationFee: fee,
                refundAmount: refund,
                cancelledAt: new Date().toISOString()
            };
            stored[resIdx] = updated;
            localStorage.setItem('hotel_reservations_v2', JSON.stringify(stored));
            localStorage.setItem('hotel_reservations_v3', JSON.stringify(stored));

            // Persist to Database via API
            deleteReservationInDB(target.reservationNumber);

            broadcastPMSEvent({ type: 'RESERVATION_COMMITTED', reservation: updated });
        } else {
            deleteReservationInDB(target.reservationNumber || bookingId);
        }

        setBookings(prev => prev.filter(b => b.reservationNumber !== target.reservationNumber));
        showToast(`Reservation ${target.reservationNumber} cancelled (Fee: ${currencySymbol}${fee}, Refund: ${currencySymbol}${refund})`);
    };

    const handleConfirmVoid = (bookingId: string, reason: string) => {
        const target = bookings.find(b => b.id === bookingId);
        if (!target) return;

        const stored = getAllStoredReservations();
        const resIdx = stored.findIndex(r => r.reservationNumber === target.reservationNumber);
        if (resIdx !== -1) {
            const res = stored[resIdx];
            const updated = {
                ...res,
                status: 'voided',
                voidReason: reason || 'Voided by front desk executive',
                voidedAt: new Date().toISOString()
            };
            stored[resIdx] = updated;
            localStorage.setItem('hotel_reservations_v2', JSON.stringify(stored));
            localStorage.setItem('hotel_reservations_v3', JSON.stringify(stored));

            // Persist to Database via API
            voidReservationInDB(target.reservationNumber, reason);

            broadcastPMSEvent({ type: 'RESERVATION_COMMITTED', reservation: updated });
        } else {
            voidReservationInDB(target.reservationNumber || bookingId, reason);
        }

        setBookings(prev => prev.filter(b => b.reservationNumber !== target.reservationNumber));
        showToast(`Reservation ${target.reservationNumber} voided: "${reason || 'No reason specified'}"`);
    };

    const handleConfirmHold = (bookingId: string, _startDate: string, endDate: string, reason: string = '') => {
        const target = bookings.find(b => b.id === bookingId);
        if (!target) return;

        const stored = getAllStoredReservations();
        const resIdx = stored.findIndex(r => r.reservationNumber === target.reservationNumber);
        if (resIdx !== -1) {
            const res = stored[resIdx];
            const updated = {
                ...res,
                status: 'hold',
                holdUntil: endDate
            };
            stored[resIdx] = updated;
            localStorage.setItem('hotel_reservations_v2', JSON.stringify(stored));
            localStorage.setItem('hotel_reservations_v3', JSON.stringify(stored));

            try {
                const existingHolds = JSON.parse(localStorage.getItem('hotel_holds_v2') || '[]');
                existingHolds.unshift({
                    id: Date.now(),
                    reservationNumber: target.reservationNumber,
                    guestName: target.guestName,
                    status: 'Hold',
                    holdStartDate: res.checkIn,
                    holdEndDate: endDate,
                    reason: reason || 'Tentative booking held from StayView',
                    reservationDate: new Date().toISOString().split('T')[0],
                    checkInDate: res.checkIn,
                    checkOutDate: endDate,
                    roomType: res.roomType,
                    estimatedAmount: res.totalAmount
                });
                localStorage.setItem('hotel_holds_v2', JSON.stringify(existingHolds));
            } catch { }

            // Persist to Database via API
            holdReservationInDB(target.reservationNumber, res.checkIn, endDate, reason);

            broadcastPMSEvent({ type: 'RESERVATION_COMMITTED', reservation: updated });
        } else {
            holdReservationInDB(target.reservationNumber || bookingId, undefined, endDate, reason);
        }

        setBookings(prev => prev.map(b => b.id === bookingId ? { ...b, status: 'hold' } : b));
        showToast(`Reservation ${target.reservationNumber} placed on HOLD until ${endDate}!`);
    };

    const handleConfirmUnassign = (bookingId: string, roomNum: string) => {
        const target = bookings.find(b => b.id === bookingId);
        if (!target) return;

        const stored = getAllStoredReservations();
        const res = stored.find(r => r.reservationNumber === target.reservationNumber);

        const checkIn = target.checkInDate || days[target.startIndex]?.date || '2026-07-01';
        const nights = target.nights || Math.max(1, target.endIndex - target.startIndex + 1);
        const checkOut = target.checkOutDate || (() => {
            const d = new Date(checkIn);
            d.setDate(d.getDate() + nights);
            return d.toISOString().split('T')[0];
        })();

        const dailyBase = resolveReservationDailyBaseRate(res, target.roomNumber);
        const unassignTaxCalc = calculateReservationTaxes(dailyBase * nights, res?.taxApplicable !== false, res?.taxConfigId);

        const unItem: UnassignedBooking = {
            id: `un-${Date.now()}`,
            reservationNumber: target.reservationNumber,
            guestName: res?.guestName || target.guestName,
            roomType: res?.roomType || 'Deluxe Double',
            checkIn,
            checkOut,
            nights,
            totalRooms: 1,
            source: res?.source || 'Front Desk',
            totalAmount: res?.totalAmount ? Number(res.totalAmount) : unassignTaxCalc.grandTotal,
            status: 'unassigned'
        };

        setUnassignedList(prev => [unItem, ...prev]);

        if (res) {
            const updated = stored.filter(r => r.reservationNumber !== target.reservationNumber);
            localStorage.setItem('hotel_reservations_v2', JSON.stringify(updated));
            localStorage.setItem('hotel_reservations_v3', JSON.stringify(updated));
            broadcastPMSEvent({ type: 'INVENTORY_REFRESH' });
        }

        // Persist to Database via API
        unassignRoomInDB(target.reservationNumber || bookingId, roomNum);

        setBookings(prev => prev.filter(b => b.id !== bookingId));
        showToast(`Reservation ${target.reservationNumber} unassigned from Room ${roomNum}!`);
    };

    const handleConfirmUngroup = (bookingId: string, selectedRooms?: string[]) => {
        const target = bookings.find(b => b.id === bookingId);
        if (target) {
            ungroupReservationInDB(target.reservationNumber, selectedRooms);
        }
        setBookings(prev => prev.map(b => b.id === bookingId ? { ...b, isGroupBooking: false, isGroupOwner: false } : b));
        showToast(`Reservation ungrouped successfully!`);
    };

    const handleConfirmChangeOwner = (bookingId: string, newOwner: string) => {
        const target = bookings.find(b => b.id === bookingId);
        if (target) {
            changeGroupOwnerInDB(target.reservationNumber, newOwner);
        }
        setBookings(prev => prev.map(b => b.id === bookingId ? { ...b, guestName: newOwner } : b));
        showToast(`Group owner changed to ${newOwner}!`);
    };

    const handleDrawerCheckIn = async (reservationNumber: string) => {
        try {
            const targetB = actionDrawerBooking || bookings.find(b => b.reservationNumber === reservationNumber || b.id.includes(reservationNumber));
            const storedTarget = getAllStoredReservations().find(r => r.reservationNumber === reservationNumber || String(r.id) === reservationNumber);
            const rNo = (targetB as any)?.roomNumber || storedTarget?.roomNumber;
            const alloc = (targetB as any)?.allocatedRooms || storedTarget?.allocatedRooms;

            if (isRoomUnassigned(rNo, alloc)) {
                toast.error(`Cannot check in reservation ${reservationNumber}: Room is unassigned. Please assign a room first.`);
                return;
            }

            const targetArrival = (targetB as any)?.checkInDate || (targetB as any)?.arrivalDate || storedTarget?.checkIn;
            if (targetArrival && targetArrival !== operatingDateStr) {
                toast.error(`Check-in is only permitted on the PMS Business Date (${operatingDateStr}). Arrival date is ${targetArrival}.`);
                return;
            }

            const regNo = generateRegistrationNumber(reservationNumber);
            const folioNo = generateFolioNumber(reservationNumber);
            const ok = await updateReservationStatusInDB(reservationNumber, 'in-house');
            if (!ok) {
                toast.error(`Cannot check in reservation ${reservationNumber}: Room is unassigned. Please assign a room first.`);
                return;
            }
            // Direct optimistic in-memory booking update for 0-latency instant feedback
            setBookings(prev => prev.map(b => (b.reservationNumber === reservationNumber || b.id.includes(reservationNumber) || reservationNumber.startsWith(b.reservationNumber)) ? {
                ...b,
                status: 'arrived',
                registrationNumber: regNo,
                folioNumber: folioNo
            } : b));
            toast.success(`Guest Checked In! Reg: ${regNo} | Folio: ${folioNo}`);
            setIsActionDrawerOpen(false);
            syncStoredReservations();
            await syncReservationsFromDB();
            syncStoredReservations();
        } catch {
            toast.error('Failed to check in reservation');
        }
    };

    const handleDrawerCheckOut = async (reservationNumber: string) => {
        try {
            await updateReservationStatusInDB(reservationNumber, 'completed');
            setBookings(prev => prev.map(b => (b.reservationNumber === reservationNumber || b.id.includes(reservationNumber) || reservationNumber.startsWith(b.reservationNumber)) ? { ...b, status: 'checked-out', isPast: true } : b));
            const targetB = bookings.find(b => b.reservationNumber === reservationNumber || b.id.includes(reservationNumber));
            if (targetB) {
                await updateRoomHousekeepingInDB(targetB.roomNumber, 'Dirty');
            }
            toast.success(`Reservation ${reservationNumber} checked out successfully!`);
            setIsActionDrawerOpen(false);
            syncStoredReservations();
            await syncReservationsFromDB();
            syncStoredReservations();
        } catch {
            toast.error('Failed to check out reservation');
        }
    };

    // Global mousemove and mouseup listeners for drag-to-select, extend/shorten drag, and move drag
    useEffect(() => {
        const handleMouseMove = (e: MouseEvent) => {
            // Smooth pixel-accurate Extend & Shorten calculation during drag
            if (extendDrag) {
                const deltaX = e.clientX - extendDrag.startX;
                const moved = Math.abs(deltaX) > 6 || Boolean(extendDrag.hasMoved);
                const deltaCols = Math.round(deltaX / colWidth);
                const minCol = extendDrag.booking.startIndex;
                const rawTargetCol = Math.max(minCol, extendDrag.originalEndIndex + deltaCols);

                const roomBookings = bookingsByRoom.get(extendDrag.booking.roomNumber) || [];
                const nextBookings = roomBookings.filter(
                    other => other.id !== extendDrag.booking.id && other.startIndex > extendDrag.booking.startIndex
                );
                const maxAllowedCol = nextBookings.length > 0
                    ? Math.min(...nextBookings.map(nb => nb.startIndex - 1))
                    : daysWindow - 1;

                const clampedCol = Math.min(maxAllowedCol, rawTargetCol);

                if (
                    clampedCol !== extendDrag.currentEndIndex ||
                    rawTargetCol !== extendDrag.attemptedEndIndex ||
                    moved !== extendDrag.hasMoved
                ) {
                    setExtendDrag(prev => prev ? ({
                        ...prev,
                        currentEndIndex: clampedCol,
                        attemptedEndIndex: rawTargetCol,
                        hasMoved: moved
                    }) : null);
                }
            }

            if (moveDrag) {
                const dist = Math.hypot(e.clientX - moveDrag.startX, e.clientY - moveDrag.startY);
                if (!moveDrag.isDragging && dist > 5) {
                    const isGuestInHouse = isInHouseBooking(moveDrag.booking);
                    const deltaCols = Math.round((e.clientX - moveDrag.startX) / colWidth);
                    const stayDuration = moveDrag.booking.endIndex - moveDrag.booking.startIndex;
                    // Checked-in/In-house guests cannot change dates! Keep targetStartIndex locked to booking.startIndex
                    const newStart = isGuestInHouse
                        ? moveDrag.booking.startIndex
                        : Math.max(0, Math.min(daysWindow - 1 - stayDuration, moveDrag.booking.startIndex + deltaCols));
                    setMoveDrag(prev => prev ? ({
                        ...prev,
                        isDragging: true,
                        currentX: e.clientX,
                        currentY: e.clientY,
                        targetStartIndex: newStart,
                        targetEndIndex: newStart + stayDuration
                    }) : null);
                } else if (moveDrag.isDragging) {
                    setMoveDrag(prev => prev ? ({
                        ...prev,
                        currentX: e.clientX,
                        currentY: e.clientY
                    }) : null);
                }
            }
        };

        const handleMouseUp = () => {
            if (dragState) {
                const start = Math.min(dragState.startIndex, dragState.endIndex);
                const end = Math.max(dragState.startIndex, dragState.endIndex);

                // Audit Lock check: cannot create reservations covering past dates
                const hasPast = days.slice(start, end + 1).some(d => d.isPast);
                if (hasPast) {
                    showToast('🔒 Cannot create reservations on past dates (Historical Audit Locked).');
                    setDragState(null);
                    return;
                }

                // Double-Booking check: cannot drag-select over an existing reservation in this room
                const cellConflict = findRoomConflict(dragState.room, start, end);
                if (cellConflict) {
                    toast.error(`Room ${dragState.room} is already occupied by ${cellConflict.guestName} (${cellConflict.reservationNumber}) on selected dates!`);
                    setDragState(null);
                    return;
                }

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
                // Launch Quick Reservation Modal upon drag selection release
                setIsQuickReservationOpen(true);
            }

            // Handle Extend OR Shorten Stay Drag Release (or Resize Handle Click)
            if (extendDrag) {
                const b = extendDrag.booking;
                if (b.isPast) {
                    showToast('🔒 Historical Reservation: cannot extend or shorten.');
                    setExtendDrag(null);
                    return;
                }

                const minCol = b.startIndex;
                // If user clicked the resize handle without dragging, treat as +1 night extend request
                const desiredCol = extendDrag.hasMoved
                    ? Math.max(minCol, extendDrag.attemptedEndIndex ?? extendDrag.currentEndIndex)
                    : (b.endIndex + 1);

                // Check for room collision across [b.startIndex, desiredCol]
                const conflict = findRoomConflict(b.roomNumber, b.startIndex, desiredCol, b.id);
                if (conflict) {
                    toast.error(`Cannot extend Room ${b.roomNumber}: Already booked by ${conflict.guestName} (${conflict.reservationNumber}) from ${conflict.checkInDate}!`);
                    setExtendDrag(null);
                    return;
                }

                // If user dragged and returned to the exact original night, do nothing
                if (extendDrag.hasMoved && desiredCol === b.endIndex) {
                    setExtendDrag(null);
                    return;
                }

                const targetCol = Math.max(minCol, extendDrag.hasMoved ? extendDrag.currentEndIndex : desiredCol);
                const targetNights = Math.max(1, targetCol - b.startIndex + 1);
                const arrivalDateStr = b.checkInDate || days[b.startIndex]?.date || '2026-07-04';
                const depDateObj = new Date(arrivalDateStr);
                depDateObj.setDate(depDateObj.getDate() + targetNights);
                const targetDepDateStr = depDateObj.toISOString().split('T')[0];

                handleOpenAmendModal(b, targetDepDateStr, targetNights);
                setExtendDrag(null);
            }

            // Handle Move Reservation Drag Release
            if (moveDrag) {
                const b = moveDrag.booking;
                const isGuestInHouse = isInHouseBooking(b);
                const actuallyMovedCell =
                    moveDrag.isDragging &&
                    (moveDrag.targetRoomNumber !== b.roomNumber || (!isGuestInHouse && moveDrag.targetStartIndex !== b.startIndex));

                if (actuallyMovedCell) {
                    if (b.isPast) {
                        showToast('🔒 Historical Reservation: cannot move.');
                        setMoveDrag(null);
                        return;
                    }

                    // For in-house bookings, dragging horizontally to other dates is strictly prevented
                    if (isGuestInHouse && moveDrag.targetRoomNumber === b.roomNumber) {
                        handleOpenDetailsDrawer(b);
                        setMoveDrag(null);
                        return;
                    }

                    const targetStartDay = days[moveDrag.targetStartIndex];
                    if (targetStartDay?.isPast && !isGuestInHouse) {
                        showToast('🔒 Cannot move reservations into past audit-locked dates.');
                        setMoveDrag(null);
                        return;
                    }

                    // Strict Room Collision Check before allowing drop
                    const moveConflict = findRoomConflict(
                        moveDrag.targetRoomNumber,
                        moveDrag.targetStartIndex,
                        moveDrag.targetEndIndex,
                        b.id
                    );
                    if (moveConflict) {
                        toast.error(`Cannot move to Room ${moveDrag.targetRoomNumber}: Already occupied by ${moveConflict.guestName} (${moveConflict.reservationNumber}) from ${moveConflict.checkInDate} to ${moveConflict.checkOutDate}!`);
                        setMoveDrag(null);
                        return;
                    }

                    // Room Status Check: Guard against moving into Out of Order rooms
                    const targetCanonical = getCanonicalRooms().find(r => String(r.number) === String(moveDrag.targetRoomNumber));
                    if (targetCanonical && (targetCanonical.status === 'Out of Order' || String(targetCanonical.status).toLowerCase().includes('out of order'))) {
                        toast.error(`Cannot move to Room ${moveDrag.targetRoomNumber}: Room is currently Out of Order (Under Maintenance)!`);
                        setMoveDrag(null);
                        return;
                    }

                    const bNights = Math.max(1, (moveDrag.targetEndIndex - moveDrag.targetStartIndex + 1) || (b.endIndex - b.startIndex + 1));
                    // For in-house guests, Room Move applies from current System Date onwards
                    const targetFromDate = isGuestInHouse
                        ? (b.checkInDate && b.checkInDate > operatingDateStr ? b.checkInDate : operatingDateStr)
                        : (targetStartDay?.date || b.checkInDate || days[b.startIndex]?.date || '2026-07-01');
                    const toDateObj = new Date(targetFromDate);
                    toDateObj.setDate(toDateObj.getDate() + bNights);
                    const targetToDate = b.checkOutDate || toDateObj.toISOString().split('T')[0];
                    const originalRes = getAllStoredReservations().find(r => r.reservationNumber === b.reservationNumber);
                    const matchingRoomRow = originalRes?.roomsList?.find((r: any) => String(r.roomNumber) === String(b.roomNumber));
                    const resolvedAdults = Number(matchingRoomRow?.adults ?? originalRes?.adults ?? b.adults ?? 2);
                    const resolvedChildren = Number(matchingRoomRow?.children ?? originalRes?.children ?? b.children ?? 0);
                    const dailyBase = resolveReservationDailyBaseRate(originalRes, b.roomNumber);

                    // Room Type Capacity Check: Prevent assigning bookings with more guests than allowed by target room
                    const targetCap = targetCanonical ? getRoomTypeCapacity(targetCanonical.roomTypeId || targetCanonical.roomTypeName) : null;
                    const totalGuests = resolvedAdults + resolvedChildren;
                    if (targetCap && targetCap.maxOccupancy > 0 && totalGuests > targetCap.maxOccupancy) {
                        toast.error(`Cannot move to Room ${moveDrag.targetRoomNumber}: Exceeds capacity! (Room max: ${targetCap.maxOccupancy} guests, Booking has: ${totalGuests} guests)`);
                        setMoveDrag(null);
                        return;
                    }

                    // Room Type Upgrade Tariff Difference Alert
                    const targetBase = targetCanonical?.baseRate || (targetCap ? targetCap.baseRate : dailyBase);
                    if (targetBase > dailyBase) {
                        const rateDiff = (targetBase - dailyBase) * bNights;
                        showToast(`Room Move: Upgrading to ${targetCanonical?.roomTypeName || 'higher category'} (+${currencySymbol}${rateDiff.toLocaleString()} tariff delta).`);
                    }

                    const bData: AmendBookingData = {
                        id: b.id,
                        reservationNumber: b.reservationNumber,
                        guestName: b.guestName,
                        roomNumber: b.roomNumber,
                        roomType: originalRes?.roomType || 'Deluxe Double',
                        ratePlan: originalRes?.ratePlan || 'Standard Rate',
                        arrivalDate: targetFromDate,
                        departureDate: targetToDate,
                        nights: bNights,
                        avgDailyRate: dailyBase,
                        status: b.status.toUpperCase(),
                        isPast: b.isPast,
                        totalAmount: originalRes?.totalAmount,
                        paidAmount: originalRes?.paidAmount,
                        dueAmount: originalRes?.dueAmount,
                        baseAmount: originalRes?.baseAmount,
                        taxApplicable: originalRes?.taxApplicable,
                        taxConfigId: originalRes?.taxConfigId,
                        taxConfigCode: originalRes?.taxConfigCode,
                        totalTaxAmount: originalRes?.totalTaxAmount,
                        adults: resolvedAdults,
                        children: resolvedChildren
                    };

                    setActionDrawerBooking(bData);
                    setActionDrawerMode('move');
                    setActionDrawerTargetRoom(moveDrag.targetRoomNumber);
                    setActionDrawerTargetDep(targetToDate);
                    setIsActionDrawerOpen(true);
                } else {
                    handleOpenDetailsDrawer(moveDrag.booking);
                }
                setMoveDrag(null);
            }
        };

        window.addEventListener('mousemove', handleMouseMove);
        window.addEventListener('mouseup', handleMouseUp);
        return () => {
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('mouseup', handleMouseUp);
        };
    }, [dragState, extendDrag, moveDrag, days, colWidth, daysWindow, bookingsByRoom, findRoomConflict]);

    const minStayViewDate = useMemo(() => calculateStayViewStartDate(operatingDateStr), [operatingDateStr]);

    // Ensure StayView always stays anchored at least 3 days prior to the PMS business date
    useEffect(() => {
        if (startDate < minStayViewDate) {
            setStartDate(minStayViewDate);
        }
    }, [minStayViewDate, startDate]);

    const handleDateJump = (direction: 'prev' | 'next' | 'today') => {
        if (direction === 'today') {
            const sysIso = getOperatingSystemDate();
            setOperatingDateStr(sysIso);
            setStartDate(calculateStayViewStartDate(sysIso));
            return;
        }
        const parts = startDate.split('-').map(Number);
        const shift = direction === 'next' ? 1 : -1;
        const cur = new Date(parts[0], parts[1] - 1, parts[2] + shift, 12, 0, 0);
        const y = cur.getFullYear();
        const m = String(cur.getMonth() + 1).padStart(2, '0');
        const day = String(cur.getDate()).padStart(2, '0');
        const targetDate = `${y}-${m}-${day}`;

        // Never navigate before 3 days prior to PMS Business Date
        if (direction === 'prev' && targetDate < minStayViewDate) {
            setStartDate(minStayViewDate);
            return;
        }
        setStartDate(targetDate);
    };

    // Standard PMS status colors: Blue for Confirmed/Reserved, Emerald for Arrived/In-House
    const getStatusBadgeColor = (status: TimelineBooking['status']) => {
        switch (status) {
            case 'confirmed': return 'bg-blue-600 text-white';
            case 'reserved': return 'bg-slate-700 text-white border border-slate-500';
            case 'arrived': return 'bg-emerald-600 text-white';
            case 'stayover': return 'bg-teal-600 text-white';
            case 'due-out': return 'bg-orange-500 text-white';
            case 'checked-out': return 'bg-slate-600 text-white';
            case 'hold': return 'bg-amber-600 text-white border border-amber-500';
            case 'day-use': return 'bg-indigo-600 text-white';
            case 'out-of-order': return 'bg-red-600 text-white';
            default: return 'bg-blue-600 text-white';
        }
    };

    return (
        <div className="p-2 space-y-1.5 max-w-full h-full flex flex-col overflow-hidden animate-in fade-in duration-150 select-none relative">
            {/* Header Controls Bar */}
            <div className="bg-white rounded-lg border border-gray-200/80 shadow-2xs px-2.5 py-1.5 flex items-center justify-between gap-2 flex-shrink-0">
                {/* Left Title - Clean without extra badges as requested */}
                <div className="flex items-center gap-2 min-w-0">
                    <div className="w-6 h-6 rounded bg-[#1e3a8a] text-white flex items-center justify-center shadow-2xs flex-shrink-0">
                        <CalendarIcon size={13} />
                    </div>
                    <div className="flex items-center gap-1.5 min-w-0">
                        <h1 className="text-xs text-gray-900 tracking-tight whitespace-nowrap">
                            Stay View
                        </h1>
                        {/* Real-Time Cross-PC Sync Indicator */}
                        <div
                            className={`hidden sm:inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-semibold border transition-all ${syncStatus.isConnected
                                ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                                : 'bg-slate-50 text-slate-600 border-slate-200'
                                }`}
                            title={`Real-Time Synchronization: ${syncStatus.mode}. Current Terminal ID: ${syncStatus.terminalId}. Connected Terminals: ${syncStatus.connectedTerminalsCount}.`}
                        >
                            <span className={`w-1.5 h-1.5 rounded-full ${syncStatus.isConnected ? 'bg-emerald-500 animate-pulse' : 'bg-slate-400'}`} />
                            <span className="tracking-tight">{syncStatus.isConnected ? 'Sync: Live' : 'Local Sync: Ready'}</span>
                        </div>
                    </div>
                </div>

                {/* Date Controls & Action Buttons */}
                <div className="flex items-center gap-1.5 flex-shrink-0">
                    {/* Navigation */}
                    <div className="flex items-center bg-gray-50 border border-gray-200 rounded p-0.5 text-xs h-7">
                        <button
                            type="button"
                            disabled={startDate <= minStayViewDate}
                            onClick={() => handleDateJump('prev')}
                            className={`px-1.5 py-0.5 rounded text-gray-600 transition-colors ${
                                startDate <= minStayViewDate
                                    ? 'opacity-30 cursor-not-allowed text-gray-400'
                                    : 'hover:bg-white hover:shadow-2xs cursor-pointer'
                            }`}
                            title={startDate <= minStayViewDate ? 'At historical limit (3 days prior to PMS Business Date)' : 'Previous Day'}
                        >
                            <ChevronLeft size={13} />
                        </button>
                        <button
                            type="button"
                            onClick={() => handleDateJump('today')}
                            className="px-2 py-0.5 text-[10px] font-semibold text-[#1e3a8a] hover:bg-white hover:shadow-2xs rounded transition-colors cursor-pointer"
                            title="Reset to 3 days prior to PMS Business Date"
                        >
                            Today
                        </button>
                        <button
                            type="button"
                            onClick={() => handleDateJump('next')}
                            className="px-1.5 py-0.5 hover:bg-white hover:shadow-2xs rounded text-gray-600 transition-colors cursor-pointer"
                            title="Next Day"
                        >
                            <ChevronRight size={13} />
                        </button>
                    </div>

                    {/* From Date Picker */}
                    <div className="flex items-center gap-1 bg-white border border-gray-200 rounded px-2 text-[10px] h-7">
                        <span className="text-gray-400 font-medium">From:</span>
                        <input
                            type="date"
                            value={startDate}
                            min={minStayViewDate}
                            onChange={(e) => {
                                const picked = e.target.value;
                                if (picked && picked < minStayViewDate) {
                                    setStartDate(minStayViewDate);
                                    toast.info(`Stay View displays data from 3 days prior to PMS Business Date (${minStayViewDate}) onwards.`);
                                } else if (picked) {
                                    setStartDate(picked);
                                }
                            }}
                            className="border-none p-0 text-[10px] font-semibold text-gray-800 outline-none cursor-pointer bg-transparent"
                        />
                    </div>

                    {/* Window Selector */}
                    <select
                        value={daysWindow}
                        onChange={(e) => setDaysWindow(Number(e.target.value))}
                        className="h-7 px-2 border border-gray-200 rounded text-[10px] font-semibold text-gray-700 bg-white hover:border-gray-300 outline-none cursor-pointer"
                    >
                        <option value={7}>7 Days</option>
                        <option value={15}>15 Days</option>
                        <option value={30}>30 Days</option>
                    </select>

                    {/* Status Legend & Counts */}
                    <div className="flex items-center gap-1">
                        {/* Legend Info Popover Button */}
                        <div className="relative">
                            <button
                                type="button"
                                onClick={() => setIsInfoPopoverOpen(!isInfoPopoverOpen)}
                                className={`h-7 px-2 rounded border text-[10px] flex items-center gap-1 transition-colors cursor-pointer ${isInfoPopoverOpen ? 'bg-blue-600 text-white border-blue-600' : 'bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100'
                                    }`}
                                title="Click to view Status & Indicator Legend"
                            >
                                <span className="w-3.5 h-3.5 rounded-full bg-blue-600 text-white flex items-center justify-center text-[9px] font-black">i</span>
                                <span className="hidden sm:inline">Info</span>
                            </button>

                            {/* Legend Popover Box */}
                            {isInfoPopoverOpen && (
                                <>
                                    <div className="fixed inset-0 z-40" onClick={() => setIsInfoPopoverOpen(false)}></div>
                                    <div className="absolute right-0 top-8 z-50 w-80 bg-white rounded-lg shadow-xl border border-gray-200 p-3 text-xs animate-in fade-in zoom-in-95">
                                        <div className="flex items-center justify-between pb-2 mb-2 border-b border-gray-100 text-gray-800 text-[11.5px]">
                                            <span>Legend &amp; Color Coding</span>
                                            <button onClick={() => setIsInfoPopoverOpen(false)} className="text-gray-400 hover:text-gray-600">
                                                <X size={13} />
                                            </button>
                                        </div>

                                        <div className="space-y-3">
                                            {/* Floor Counters Info */}
                                            <div>
                                                <div className="text-[10px] uppercase text-gray-400 mb-1.5">Floor Daily Counters [1][3][1]</div>
                                                <div className="grid grid-cols-3 gap-1 text-[10px]">
                                                    <div className="flex items-center gap-1">
                                                        <span className="w-3.5 h-3.5 rounded-xs bg-[#00cc00] text-white flex items-center justify-center text-[8.5px]">A</span>
                                                        <span className="text-gray-700">Available</span>
                                                    </div>
                                                    <div className="flex items-center gap-1">
                                                        <span className="w-3.5 h-3.5 rounded-xs bg-[#1e3a8a] text-white flex items-center justify-center text-[8.5px]">B</span>
                                                        <span className="text-gray-700">Assigned</span>
                                                    </div>
                                                    <div className="flex items-center gap-1">
                                                        <span className="w-3.5 h-3.5 rounded-xs bg-[#ff3333] text-white flex items-center justify-center text-[8.5px]">U</span>
                                                        <span className="text-gray-700">Unassigned</span>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Booking Status Colors */}
                                            <div className="pt-2 border-t border-gray-100">
                                                <div className="text-[10px] uppercase text-gray-400 mb-1.5">Reservation Status</div>
                                                <div className="grid grid-cols-2 gap-1.5 text-[10px]">
                                                    <div className="flex items-center gap-1.5">
                                                        <span className="w-3 h-3 rounded-xs bg-emerald-600 inline-block shadow-2xs"></span>
                                                        <span className="text-gray-700">Arrived / In-House</span>
                                                    </div>
                                                    <div className="flex items-center gap-1.5">
                                                        <span className="w-3 h-3 rounded-xs bg-blue-600 inline-block shadow-2xs"></span>
                                                        <span className="text-gray-700">Confirmed</span>
                                                    </div>
                                                    <div className="flex items-center gap-1.5">
                                                        <span className="w-3 h-3 rounded-xs bg-teal-600 inline-block shadow-2xs"></span>
                                                        <span className="text-gray-700">Stayover</span>
                                                    </div>
                                                    <div className="flex items-center gap-1.5">
                                                        <span className="w-3 h-3 rounded-xs bg-orange-500 inline-block shadow-2xs"></span>
                                                        <span className="text-gray-700">Due Out</span>
                                                    </div>
                                                    <div className="flex items-center gap-1.5">
                                                        <span className="w-3 h-3 rounded-xs bg-purple-600 inline-block shadow-2xs"></span>
                                                        <span className="text-gray-700">Hold</span>
                                                    </div>
                                                    <div className="flex items-center gap-1.5">
                                                        <span className="w-3 h-3 rounded-xs bg-slate-600 inline-block shadow-2xs"></span>
                                                        <span className="text-gray-700">Checked Out</span>
                                                    </div>
                                                    <div className="flex items-center gap-1.5">
                                                        <span className="w-3 h-3 rounded-xs bg-amber-600 inline-block shadow-2xs"></span>
                                                        <span className="text-gray-700">Day Use</span>
                                                    </div>
                                                    <div className="flex items-center gap-1.5">
                                                        <span className="w-3 h-3 rounded-xs bg-red-600 inline-block shadow-2xs"></span>
                                                        <span className="text-gray-700">Out of Order</span>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Booking Floating Indicators */}
                                            <div className="pt-2 border-t border-gray-100">
                                                <div className="text-[10px] uppercase text-gray-400 mb-1.5">4 Booking Floating Icons</div>
                                                <div className="grid grid-cols-2 gap-1.5 text-[10px]">
                                                    <div className="flex items-center gap-1.5">
                                                        <span className="w-4 h-4 rounded-full bg-amber-400 text-amber-950 border border-white flex items-center justify-center shadow-xs flex-shrink-0">
                                                            <Crown size={9} className="stroke-[2.5]" />
                                                        </span>
                                                        <span className="text-gray-700">Group Owner</span>
                                                    </div>
                                                    <div className="flex items-center gap-1.5">
                                                        <span className="w-4 h-4 rounded-full bg-rose-500 text-white border border-white flex items-center justify-center shadow-xs flex-shrink-0">
                                                            <Users size={9} className="stroke-[2.5]" />
                                                        </span>
                                                        <span className="text-gray-700">Group Booking</span>
                                                    </div>
                                                    <div className="flex items-center gap-1.5">
                                                        <span className="w-4 h-4 rounded-full bg-red-600 text-white border border-white flex items-center justify-center shadow-xs flex-shrink-0">
                                                            <DollarSign size={9} className="stroke-[3]" />
                                                        </span>
                                                        <span className="text-gray-700">Payment Due</span>
                                                    </div>
                                                    <div className="flex items-center gap-1.5">
                                                        <span className="w-4 h-4 rounded-full bg-amber-500 text-white border border-white flex items-center justify-center shadow-xs flex-shrink-0">
                                                            <Star size={9} className="fill-white stroke-[1.5]" />
                                                        </span>
                                                        <span className="text-gray-700">VIP / Single Lady</span>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </>
                            )}
                        </div>

                        {/* Available Badge */}
                        <div className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-emerald-50 border border-emerald-200 text-emerald-800 text-[10px] h-7" title="Today Available Rooms">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                            <span>{todayAvailableCount}</span>
                            <span className="hidden md:inline font-medium text-emerald-600">Avail</span>
                        </div>

                        {/* Assigned Badge */}
                        <div className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-amber-50 border border-amber-200 text-amber-800 text-[10px] h-7" title="Today Assigned Rooms">
                            <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
                            <span>{todayAssignedCount}</span>
                            <span className="hidden md:inline font-medium text-amber-600">Assigned</span>
                        </div>

                        {/* Unassigned Badge (Clickable to open Assign Rooms drawer) */}
                        <button
                            type="button"
                            onClick={() => setIsAssignRoomsOpen(true)}
                            className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-cyan-50 hover:bg-cyan-100 border border-cyan-200 text-cyan-800 text-[10px] h-7 cursor-pointer transition-colors"
                            title="Click to view Unassigned Reservations"
                        >
                            <span className="w-1.5 h-1.5 rounded-full bg-cyan-500"></span>
                            <span>{unassignedList.length}</span>
                            <span className="hidden lg:inline font-medium text-cyan-600">Unassigned</span>
                        </button>
                    </div>

                    {/* ASSIGN ROOMS BUTTON */}
                    <button
                        type="button"
                        onClick={() => setIsAssignRoomsOpen(true)}
                        className="h-7 px-2.5 bg-[#1e3a8a] hover:bg-blue-900 text-white rounded text-[10px] font-semibold shadow-2xs flex items-center gap-1.5 cursor-pointer transition-colors whitespace-nowrap ml-1 active:scale-[0.98]"
                        title="Open Unassigned Reservations Drawer"
                    >
                        <BedDouble size={13} />
                        <span>Assign Rooms</span>
                        {unassignedList.length > 0 && (
                            <span className="px-1.5 py-0.2 bg-amber-400 text-gray-900 font-extrabold text-[9.5px] rounded-full shadow-2xs">
                                {unassignedList.length}
                            </span>
                        )}
                    </button>

                    {/* ROOM MAINTENANCE (OOO / OOS) BUTTON */}
                    <button
                        type="button"
                        onClick={() => {
                            setSelectedOOORoom(undefined);
                            setIsOOOModalOpen(true);
                        }}
                        className={`h-7 px-2.5 rounded text-[10px] font-semibold shadow-2xs flex items-center gap-1.5 cursor-pointer transition-colors whitespace-nowrap ml-1 active:scale-[0.98] ${overdueOOOCount > 0
                            ? 'bg-rose-600 hover:bg-rose-700 text-white animate-pulse'
                            : 'bg-slate-700 hover:bg-slate-800 text-white'
                            }`}
                        title="Open Room Out of Order & Out of Service Manager"
                    >
                        <Wrench size={12} />
                        <span>Maintenance</span>
                        {overdueOOOCount > 0 ? (
                            <span className="px-1.5 py-0.2 bg-white text-rose-700 font-extrabold text-[9px] rounded-full shadow-2xs">
                                {overdueOOOCount} Overdue
                            </span>
                        ) : activeOOOCount > 0 ? (
                            <span className="px-1.5 py-0.2 bg-amber-400 text-slate-900 font-extrabold text-[9px] rounded-full shadow-2xs">
                                {activeOOOCount}
                            </span>
                        ) : null}
                    </button>
                </div>
            </div>

            {/* Stay View Interactive Timeline Board */}
            <div className="bg-white rounded-lg border border-gray-200/80 shadow-2xs overflow-hidden text-xs flex-1 min-h-0 flex flex-col">
                <div ref={timelineContainerRef} className="overflow-auto flex-1 min-h-0 relative select-none">
                    <div style={{ width: `${TREE_COL_WIDTH + gridWidth}px`, minWidth: '100%' }} className="flex flex-col min-h-full">
                        {/* Header Row: Room Info Column + Date Columns */}
                        <div className="flex border-b border-gray-200 bg-gray-50/95 sticky top-0 z-30 shadow-xs">
                            {/* Room Info Header */}
                            <div style={{ width: `${TREE_COL_WIDTH}px`, flex: `0 0 ${TREE_COL_WIDTH}px` }} className="px-2 py-1 border-r border-gray-200 flex items-center justify-between text-gray-700 text-[10px] sticky left-0 z-40 bg-gray-100 flex-shrink-0">
                                <span>Rooms &amp; Types</span>
                            </div>

                            {/* Date Columns with exact Legend Colors */}
                            <div className="flex flex-1" style={{ width: `${gridWidth}px` }}>
                                {days.map((d) => (
                                    <div
                                        key={d.index}
                                        style={{ width: `${colWidth}px`, flex: `0 0 ${colWidth}px` }}
                                        onMouseEnter={(e) => {
                                            if (dateHoverTimerRef.current) clearTimeout(dateHoverTimerRef.current);
                                            const rect = e.currentTarget.getBoundingClientRect();
                                            setHoveredDate({
                                                day: d,
                                                rect: {
                                                    top: rect.top,
                                                    left: rect.left,
                                                    right: rect.right,
                                                    bottom: rect.bottom,
                                                    width: rect.width,
                                                    height: rect.height
                                                }
                                            });
                                        }}
                                        onMouseLeave={() => {
                                            if (dateHoverTimerRef.current) clearTimeout(dateHoverTimerRef.current);
                                            dateHoverTimerRef.current = setTimeout(() => {
                                                setHoveredDate(null);
                                            }, 100);
                                        }}
                                        className={`px-0.5 py-0.5 border-r text-center flex-shrink-0 transition-colors overflow-hidden cursor-pointer select-none relative group ${d.isToday
                                            ? 'bg-blue-100/95 text-blue-900 font-black border-b-2 border-b-blue-600 border-r-blue-200'
                                            : d.isPast
                                                ? 'bg-slate-200/95 text-slate-600 font-semibold border-b border-slate-300 border-r-slate-300/80'
                                                : (d.isWeekend || d.isHoliday)
                                                    ? 'bg-[#ffcccc] text-[#991b1b] border-b border-rose-300 border-r-rose-200'
                                                    : 'bg-gray-50/90 text-gray-700 font-medium border-b border-gray-200 border-r-gray-200'
                                            }`}
                                    >
                                        <div className="text-[8.5px] uppercase tracking-wider font-semibold opacity-85 leading-none truncate flex items-center justify-center gap-0.5">
                                            <span>{d.dayName}</span>
                                            {d.calendarHoliday && <span className="text-[7.5px] text-amber-700 leading-none" title={d.holidayTitle || undefined}>★</span>}
                                        </div>
                                        <div className="text-[12px] leading-tight mt-0.5 font-bold">
                                            {d.num}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Room Hierarchy Tree & Timeline Grid */}
                        <div className="divide-y divide-gray-100 flex-1">
                            {roomTree.map(building => (
                                <React.Fragment key={building.id}>
                                    {/* Building Header Row */}
                                    <div className="flex bg-slate-50/90 border-b border-gray-200/90 text-gray-800 sticky left-0 z-20">
                                        <div
                                            onClick={() => toggleNode(building.id)}
                                            style={{ width: `${TREE_COL_WIDTH}px`, flex: `0 0 ${TREE_COL_WIDTH}px` }}
                                            className="px-2 py-1 border-r border-gray-200 flex items-center gap-1.5 cursor-pointer hover:bg-slate-100 transition-colors sticky left-0 z-20 bg-slate-50 flex-shrink-0"
                                        >
                                            {expandedNodes[building.id] ? <ChevronDown size={13} className="text-gray-500" /> : <ChevronRight size={13} className="text-gray-500" />}
                                            <Building2 size={13} className="text-blue-700 flex-shrink-0" />
                                            <span className="text-[10px] truncate tracking-tight">{building.name}</span>
                                        </div>
                                        <div className="flex flex-1" style={{ width: `${gridWidth}px` }}>
                                            {days.map(d => (
                                                <div
                                                    key={d.index}
                                                    style={{ width: `${colWidth}px`, flex: `0 0 ${colWidth}px` }}
                                                    className="border-r border-gray-100/80 bg-slate-50/40 flex-shrink-0"
                                                ></div>
                                            ))}
                                        </div>
                                    </div>

                                    {/* Floors and Rooms */}
                                    {expandedNodes[building.id] && building.floors.map((floor: FloorNode) => (
                                        <React.Fragment key={floor.id}>
                                            {/* Floor Header Row with Daily Breakdown Counters [Available][Assigned][Unassigned] */}
                                            <div className="flex bg-gray-50/80 border-b border-gray-100 text-gray-700 font-semibold">
                                                <div
                                                    onClick={() => toggleNode(floor.id)}
                                                    style={{ width: `${TREE_COL_WIDTH}px`, flex: `0 0 ${TREE_COL_WIDTH}px` }}
                                                    className="px-2 py-0.5 pl-4 border-r border-gray-200 flex items-center gap-1 cursor-pointer hover:bg-gray-100 transition-colors sticky left-0 z-20 bg-gray-50/90 flex-shrink-0"
                                                >
                                                    {expandedNodes[floor.id] ? <ChevronDown size={11} className="text-gray-400" /> : <ChevronRight size={11} className="text-gray-400" />}
                                                    <span className="text-[10.5px] text-gray-700 tracking-tight">{floor.name}</span>
                                                </div>

                                                {/* Floor Daily Breakdown Badges: O(1) Precomputed [Available] [Assigned] [Unassigned] */}
                                                <div className="flex flex-1" style={{ width: `${gridWidth}px` }}>
                                                    {days.map(d => {
                                                        const counts = floorDailyBreakdown[floor.id]?.[d.index] || { available: 0, assigned: 0, unassigned: 0 };
                                                        const { available: availableCount, assigned: assignedCount, unassigned: unassignedCount } = counts;

                                                        return (
                                                            <div
                                                                key={d.index}
                                                                style={{ width: `${colWidth}px`, flex: `0 0 ${colWidth}px` }}
                                                                title={d.isHoliday ? `${d.holidayTitle} • ${d.date}` : undefined}
                                                                className={`px-0.5 border-r flex items-center justify-center flex-shrink-0 min-h-[22px] overflow-hidden ${d.isToday ? 'bg-blue-50/40 border-r-blue-100' : d.isPast ? 'bg-slate-200/50 border-r-slate-200' : (d.isWeekend || d.isHoliday) ? 'bg-[#ffebeb]/50 border-r-rose-100' : 'bg-gray-50/30 border-r-gray-100'
                                                                    }`}
                                                            >
                                                                <div className="flex items-center justify-center gap-[2px]">
                                                                    {/* 1. Available Badge (Green) */}
                                                                    {availableCount > 0 && (
                                                                        <span
                                                                            className="min-w-[13px] h-3.5 px-0.5 rounded-xs bg-[#00cc00] text-white font-black text-[8px] flex items-center justify-center leading-none shadow-2xs"
                                                                            title={`${floor.name}: ${availableCount} Available`}
                                                                        >
                                                                            {availableCount}
                                                                        </span>
                                                                    )}
                                                                    {/* 2. Assigned Badge (Blue) */}
                                                                    {assignedCount > 0 && (
                                                                        <span
                                                                            className="min-w-[13px] h-3.5 px-0.5 rounded-xs bg-[#1e3a8a] text-white font-black text-[8px] flex items-center justify-center leading-none shadow-2xs"
                                                                            title={`${floor.name}: ${assignedCount} Assigned`}
                                                                        >
                                                                            {assignedCount}
                                                                        </span>
                                                                    )}
                                                                    {/* 3. Unassigned Badge (Red) */}
                                                                    {unassignedCount > 0 && (
                                                                        <span
                                                                            className="min-w-[13px] h-3.5 px-0.5 rounded-xs bg-[#ff3333] text-white font-black text-[8px] flex items-center justify-center leading-none shadow-2xs"
                                                                            title={`${floor.name}: ${unassignedCount} Unassigned`}
                                                                        >
                                                                            {unassignedCount}
                                                                        </span>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            </div>

                                            {/* Rooms */}
                                            {expandedNodes[floor.id] && floor.rooms.map((room: RoomNode) => (
                                                <div key={room.id} className="flex border-b border-gray-100/90 hover:bg-blue-50/20 transition-colors group relative overflow-visible min-h-[36px]">
                                                    {/* Room Info Cell */}
                                                    <div
                                                        style={{ width: `${TREE_COL_WIDTH}px`, flex: `0 0 ${TREE_COL_WIDTH}px` }}
                                                        className={`px-2 py-1 pl-6 border-r border-gray-200 flex items-center justify-between sticky left-0 z-20 bg-white group-hover:bg-blue-50/30 flex-shrink-0 transition-colors min-h-[36px] ${moveDrag && moveDrag.isDragging && moveDrag.targetRoomNumber === room.roomNumber ? 'bg-blue-100 ring-2 ring-blue-500' : ''
                                                            }`}
                                                    >
                                                        <div className="flex items-center gap-1.5 min-w-0 flex-1">
                                                            {renderRoomBedIcon(room.bedType, room.type)}
                                                            <div className="truncate flex items-center gap-1 min-w-0">
                                                                <span className="text-[10px] text-gray-900 font-semibold font-mono">
                                                                    {room.roomNumber}
                                                                </span>
                                                                <span className="text-[9.5px] text-gray-500 truncate ml-0.5" title={`${room.type} • Bed: ${room.bedType || 'Double'}`}>
                                                                    {room.type}
                                                                </span>
                                                            </div>
                                                        </div>
                                                        <div className="flex items-center gap-1.5 flex-shrink-0">
                                                            {/* Room Smoking Policy Icon */}
                                                            {room.smokingStatus === 'Smoking' ? (
                                                                <span
                                                                    className="inline-flex items-center justify-center p-0.5 rounded text-amber-600 hover:text-amber-800 hover:bg-amber-50 transition-colors cursor-help flex-shrink-0"
                                                                    title="Smoking Permitted in Room"
                                                                >
                                                                    <Cigarette size={10} className="stroke-[2.2]" />
                                                                </span>
                                                            ) : room.smokingStatus === 'Balcony Smoking Only' ? (
                                                                <span
                                                                    className="inline-flex items-center justify-center p-0.5 rounded text-blue-600 hover:text-blue-800 hover:bg-blue-50 transition-colors cursor-help flex-shrink-0"
                                                                    title="Balcony Smoking Only (No Indoor Smoking)"
                                                                >
                                                                    <Cigarette size={10} className="stroke-[2.2]" />
                                                                </span>
                                                            ) : (
                                                                <span
                                                                    className="inline-flex items-center justify-center p-0.5 rounded text-slate-300 hover:text-emerald-700 hover:bg-emerald-50 transition-colors cursor-help flex-shrink-0"
                                                                    title="Strict Non-Smoking Room (BDT 5,000 deep cleaning violation fine)"
                                                                >
                                                                    <CigaretteOff size={10} className="stroke-[2]" />
                                                                </span>
                                                            )}
                                                            {room.isConnecting && (
                                                                <span
                                                                    className="inline-flex items-center justify-center p-0.5 rounded text-indigo-600 hover:text-indigo-800 hover:bg-indigo-50 transition-colors cursor-help flex-shrink-0"
                                                                    title={`Connecting Room: Connected with Room ${room.connectedTo || 'Adjoining Room'} (Soundproof Interconnecting Door)`}
                                                                >
                                                                    <LinkIcon size={10} className="stroke-[2.5]" />
                                                                </span>
                                                            )}
                                                            <button
                                                                type="button"
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    setSelectedOOORoom(room.roomNumber);
                                                                    setIsOOOModalOpen(true);
                                                                }}
                                                                className="opacity-0 group-hover:opacity-100 p-0.5 text-slate-400 hover:text-rose-600 transition-opacity rounded hover:bg-slate-100"
                                                                title={`Place Room ${room.roomNumber} Out of Order / Out of Service`}
                                                            >
                                                                <Wrench size={10} />
                                                            </button>
                                                            <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${room.status === 'out-of-order'
                                                                ? 'bg-rose-600 ring-2 ring-rose-200'
                                                                : room.status === 'out-of-service'
                                                                    ? 'bg-amber-600 ring-1 ring-amber-300'
                                                                    : room.status === 'inspected'
                                                                        ? 'bg-blue-500'
                                                                        : room.status === 'dirty'
                                                                            ? 'bg-yellow-500'
                                                                            : 'bg-emerald-500'
                                                                }`} title={`Room ${room.roomNumber} is ${room.status.replace(/-/g, ' ')}`}></span>
                                                        </div>
                                                    </div>

                                                    {/* Day Cells & Bookings Overlay */}
                                                    <div className="flex flex-1 relative min-h-[36px] overflow-visible" style={{ width: `${gridWidth}px` }}>
                                                        {days.map(d => (
                                                            <div
                                                                key={d.index}
                                                                style={{ width: `${colWidth}px`, flex: `0 0 ${colWidth}px` }}
                                                                onMouseDown={(e) => {
                                                                    const dateOOO = (activeOOOBlocksByRoom.get(room.roomNumber) || []).find(b =>
                                                                        b.blockType === 'OOO' && isDateRangeOverlapping(b.startDate, b.endDate, d.date, d.date)
                                                                    );
                                                                    if (dateOOO) {
                                                                        showToast(`⚠️ Room ${room.roomNumber} is Out of Order on ${d.date} (${dateOOO.reasonCategory}). Cannot allocate reservations.`);
                                                                        return;
                                                                    }
                                                                    if (room.status === 'out-of-order') {
                                                                        showToast(`⚠️ Room ${room.roomNumber} is Out of Order (Under Maintenance). Cannot allocate reservations.`);
                                                                        return;
                                                                    }
                                                                    if (d.isPast) {
                                                                        showToast("🔒 Historical Dates: Past dates are audit locked (Read Only).");
                                                                        return;
                                                                    }
                                                                    const rect = e.currentTarget.getBoundingClientRect();
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
                                                                        if (d.isPast) return;
                                                                        const rect = e.currentTarget.getBoundingClientRect();
                                                                        setDragState(prev => prev ? ({
                                                                            ...prev,
                                                                            endIndex: d.index,
                                                                            endRect: rect
                                                                        }) : null);
                                                                    }
                                                                    // Extend OR Shorten Stay Drag (Clamped to prevent overlapping next booking in same room)
                                                                    if (extendDrag) {
                                                                        const minCol = extendDrag.booking.startIndex;
                                                                        const roomBookings = bookingsByRoom.get(extendDrag.booking.roomNumber) || [];
                                                                        const nextBookings = roomBookings.filter(
                                                                            other => other.id !== extendDrag.booking.id && other.startIndex > extendDrag.booking.startIndex
                                                                        );
                                                                        const maxAllowedCol = nextBookings.length > 0
                                                                            ? Math.min(...nextBookings.map(nb => nb.startIndex - 1))
                                                                            : daysWindow - 1;
                                                                        const rawCol = Math.max(minCol, d.index);
                                                                        const clampedCol = Math.min(maxAllowedCol, rawCol);
                                                                        setExtendDrag(prev => prev ? ({
                                                                            ...prev,
                                                                            currentEndIndex: clampedCol,
                                                                            attemptedEndIndex: rawCol,
                                                                            hasMoved: true
                                                                        }) : null);
                                                                    }
                                                                    // Move Reservation Drag (Drag-and-Drop to any room or date)
                                                                    if (moveDrag && moveDrag.isDragging) {
                                                                        const stayDuration = moveDrag.booking.endIndex - moveDrag.booking.startIndex;
                                                                        const isGuestInHouse = isInHouseBooking(moveDrag.booking);
                                                                        const offset = moveDrag.grabOffsetCols || 0;
                                                                        // In-house guests cannot change stay dates! Keep targetStartIndex locked to booking.startIndex
                                                                        const newStart = isGuestInHouse
                                                                            ? moveDrag.booking.startIndex
                                                                            : Math.max(0, Math.min(daysWindow - 1 - stayDuration, d.index - offset));
                                                                        setMoveDrag(prev => prev ? ({
                                                                            ...prev,
                                                                            targetRoomNumber: room.roomNumber,
                                                                            targetStartIndex: newStart,
                                                                            targetEndIndex: newStart + stayDuration
                                                                        }) : null);
                                                                    }
                                                                }}
                                                                className={`border-r flex-shrink-0 transition-colors relative ${d.isToday
                                                                    ? 'bg-blue-50/50 border-r-blue-100/80 cursor-pointer hover:bg-blue-100/40'
                                                                    : d.isPast
                                                                        ? 'bg-[#e2e8f0]/80 border-r-slate-300/60 cursor-not-allowed'
                                                                        : (d.isWeekend || d.isHoliday)
                                                                            ? 'bg-[#ffebeb]/70 border-r-rose-100/80 cursor-pointer hover:bg-rose-100/40'
                                                                            : 'border-r-gray-100 cursor-pointer hover:bg-blue-100/40'
                                                                    }`}
                                                            ></div>
                                                        ))}

                                                        {/* Live Move Reservation Target Ghost Preview */}
                                                        {moveDrag && moveDrag.isDragging && moveDrag.targetRoomNumber === room.roomNumber && (() => {
                                                            const hasMoveConflict = Boolean(findRoomConflict(
                                                                room.roomNumber,
                                                                moveDrag.targetStartIndex,
                                                                moveDrag.targetEndIndex,
                                                                moveDrag.booking.id
                                                            ));
                                                            return (
                                                                <div
                                                                    style={{
                                                                        left: `${moveDrag.targetStartIndex * colWidth + 2}px`,
                                                                        width: `${Math.max(20, (moveDrag.targetEndIndex - moveDrag.targetStartIndex + 1) * colWidth - 4)}px`
                                                                    }}
                                                                    className={`absolute top-[6px] bottom-[4px] border-2 border-dashed border-white text-white rounded px-2 py-0.5 text-[10px] flex items-center gap-1 shadow-lg z-20 pointer-events-none animate-pulse ${hasMoveConflict ? 'bg-red-600/85' : 'bg-blue-600/70'
                                                                        }`}
                                                                >
                                                                    <span className="truncate">
                                                                        {hasMoveConflict
                                                                            ? `🚫 Conflict: Room ${room.roomNumber} Occupied`
                                                                            : `Move: ${moveDrag.booking.guestName} → Room ${room.roomNumber}`}
                                                                    </span>
                                                                </div>
                                                            );
                                                        })()}

                                                        {/* Render Active Maintenance (OOO / OOS) Blocks */}
                                                        {(activeOOOBlocksByRoom.get(room.roomNumber) || []).map(block => {
                                                            const isOverdue = isBlockOverdue(block, operatingDateStr);

                                                            let startCol = days.findIndex(d => d.date === block.startDate);
                                                            let endCol = days.findIndex(d => d.date === block.endDate);

                                                            if (startCol === -1) {
                                                                if (block.startDate < days[0]?.date && block.endDate >= days[0]?.date) {
                                                                    startCol = 0;
                                                                } else {
                                                                    return null;
                                                                }
                                                            }
                                                            if (endCol === -1) {
                                                                if (block.endDate > days[days.length - 1]?.date) {
                                                                    endCol = daysWindow - 1;
                                                                } else {
                                                                    return null;
                                                                }
                                                            }
                                                            if (startCol > daysWindow - 1 || endCol < 0 || startCol > endCol) return null;

                                                            const left = startCol * colWidth + 1;
                                                            const width = Math.max(20, (endCol - startCol + 1) * colWidth - 2);
                                                            const isOOO = block.blockType === 'OOO';

                                                            return (
                                                                <div
                                                                    key={block.id}
                                                                    onClick={(e) => {
                                                                        e.stopPropagation();
                                                                        setSelectedOOORoom(block.roomNumber);
                                                                        setIsOOOModalOpen(true);
                                                                    }}
                                                                    style={{
                                                                        left: `${left}px`,
                                                                        width: `${width}px`,
                                                                        background: isOOO
                                                                            ? 'repeating-linear-gradient(45deg, #e11d48, #e11d48 8px, #be123c 8px, #be123c 16px)'
                                                                            : 'repeating-linear-gradient(45deg, #d97706, #d97706 8px, #b45309 8px, #b45309 16px)'
                                                                    }}
                                                                    className={`absolute top-[4px] bottom-[4px] rounded px-1.5 py-0.5 text-[9.5px] text-white flex items-center justify-between shadow-xs z-15 cursor-pointer hover:brightness-110 transition-all ${isOverdue ? 'ring-2 ring-rose-400 animate-pulse' : ''
                                                                        }`}
                                                                    title={`Room ${block.roomNumber} ${block.blockType} (${block.reasonCategory}): ${block.description}\nPeriod: ${block.startDate} to ${block.endDate}${isOverdue ? ' [OVERDUE]' : ''}\nClick to Manage / Extend / Release`}
                                                                >
                                                                    <div className="flex items-center gap-1 truncate">
                                                                        <Wrench size={10} className="flex-shrink-0" />
                                                                        <span className="font-bold tracking-tight truncate">
                                                                            {block.blockType}: {block.reasonCategory} {isOverdue ? '⚠️ OVERDUE' : ''}
                                                                        </span>
                                                                    </div>
                                                                    <span className="text-[8.5px] font-mono opacity-80 hidden md:inline ml-1 flex-shrink-0">
                                                                        {block.endDate.slice(5)}
                                                                    </span>
                                                                </div>
                                                            );
                                                        })}

                                                        {/* Render Booking Bars with O(1) Precomputed Room Lookup */}
                                                        {(bookingsByRoom.get(room.roomNumber) || [])
                                                            .map(booking => {
                                                                const isBeingExtended = extendDrag && extendDrag.booking.id === booking.id;
                                                                const isExtendBlocked = Boolean(
                                                                    isBeingExtended &&
                                                                    extendDrag.attemptedEndIndex !== undefined &&
                                                                    extendDrag.attemptedEndIndex > extendDrag.currentEndIndex
                                                                );
                                                                const isBeingMoved = moveDrag && moveDrag.booking.id === booking.id && moveDrag.isDragging;
                                                                const isAnyDragActive = Boolean(dragState || extendDrag || (moveDrag && moveDrag.isDragging));

                                                                const effectiveEnd = isBeingExtended
                                                                    ? extendDrag.currentEndIndex
                                                                    : booking.endIndex;
                                                                const start = Math.max(0, booking.startIndex);
                                                                const end = Math.min(daysWindow - 1, effectiveEnd);
                                                                if (start > daysWindow - 1 || end < 0) return null;

                                                                const left = start * colWidth + 2;
                                                                const width = Math.max(20, (end - start + 1) * colWidth - 4);
                                                                const colorClass = getStatusBadgeColor(booking.status);

                                                                return (
                                                                    <div
                                                                        key={booking.id}
                                                                        style={{ left: `${left}px`, width: `${width}px` }}
                                                                        onMouseEnter={(e) => {
                                                                            if (isAnyDragActive) return;
                                                                            const target = e.currentTarget;
                                                                            if (hoverTimerRef.current) clearTimeout(hoverTimerRef.current);
                                                                            hoverTimerRef.current = setTimeout(() => {
                                                                                const rect = target.getBoundingClientRect();
                                                                                const enriched = getEnrichedBookingDetails(booking);
                                                                                setHoveredBooking({
                                                                                    booking,
                                                                                    enriched,
                                                                                    rect: {
                                                                                        top: rect.top,
                                                                                        left: rect.left,
                                                                                        right: rect.right,
                                                                                        bottom: rect.bottom,
                                                                                        width: rect.width,
                                                                                        height: rect.height
                                                                                    }
                                                                                });
                                                                            }, 80);
                                                                        }}
                                                                        onMouseLeave={() => {
                                                                            if (hoverTimerRef.current) clearTimeout(hoverTimerRef.current);
                                                                            setHoveredBooking(null);
                                                                        }}
                                                                        onMouseDown={(e) => {
                                                                            if (hoverTimerRef.current) clearTimeout(hoverTimerRef.current);
                                                                            setHoveredBooking(null);
                                                                            if (e.button !== 0) return;
                                                                            if (booking.isPast) {
                                                                                // Historical stays: read-only overview modal directly!
                                                                                handleOpenDetailsDrawer(booking);
                                                                                return;
                                                                            }
                                                                            const barRect = e.currentTarget.getBoundingClientRect();
                                                                            const grabOffset = Math.max(
                                                                                0,
                                                                                Math.min(
                                                                                    booking.endIndex - booking.startIndex,
                                                                                    Math.floor((e.clientX - barRect.left) / colWidth)
                                                                                )
                                                                            );
                                                                            setMoveDrag({
                                                                                booking,
                                                                                startX: e.clientX,
                                                                                startY: e.clientY,
                                                                                currentX: e.clientX,
                                                                                currentY: e.clientY,
                                                                                grabOffsetCols: grabOffset,
                                                                                isDragging: false,
                                                                                targetRoomNumber: booking.roomNumber,
                                                                                targetStartIndex: booking.startIndex,
                                                                                targetEndIndex: booking.endIndex
                                                                            });
                                                                        }}
                                                                        className={`absolute top-[6px] bottom-[4px] ${colorClass} rounded px-1.5 py-0.5 text-[10px] flex items-center justify-between shadow-2xs z-10 overflow-visible transition-all select-none ${isAnyDragActive ? 'pointer-events-none' : 'pointer-events-auto cursor-grab hover:brightness-105'
                                                                            } ${isBeingExtended ? (isExtendBlocked ? 'ring-2 ring-red-500 shadow-lg z-30' : 'ring-2 ring-white shadow-lg z-30') : ''} ${isBeingMoved ? 'opacity-40 ring-2 ring-dashed ring-amber-300' : ''
                                                                            } ${booking.isPast ? 'opacity-90 ring-1 ring-slate-400/60' : ''}`}
                                                                    >
                                                                        {/* Floating Indicators Cluster: [👑 Group Owner] [👥 Group] [$ Due] [⭐ VIP/Single Lady] [EX Exempt] */}
                                                                        <div className={`flex items-center -space-x-1 absolute -top-2 left-1.5 z-20 ${isAnyDragActive ? 'pointer-events-none' : 'pointer-events-auto'}`}>
                                                                            {booking.isPast && (
                                                                                <span
                                                                                    className="w-4 h-4 rounded-full bg-slate-900/90 text-white border-[1.5px] border-white flex items-center justify-center shadow-xs flex-shrink-0"
                                                                                    title="Historical Reservation • Audit Locked (Read Only)"
                                                                                >
                                                                                    <Lock size={8} />
                                                                                </span>
                                                                            )}
                                                                            {booking.isConnectingSuite ? (
                                                                                <span
                                                                                    className="w-4 h-4 rounded-full bg-indigo-600 text-white border-[1.5px] border-white flex items-center justify-center shadow-xs flex-shrink-0 text-[8px] font-bold"
                                                                                    title={`Interconnecting Suite • Adjoining Room ${booking.connectedTo || ''}`}
                                                                                >
                                                                                    🔗
                                                                                </span>
                                                                            ) : (
                                                                                <>
                                                                                    {booking.isGroupOwner && (
                                                                                        <span
                                                                                            className="w-4 h-4 rounded-full bg-amber-400 text-amber-950 border-[1.5px] border-white flex items-center justify-center shadow-xs flex-shrink-0"
                                                                                            title="Group Owner / Leader"
                                                                                        >
                                                                                            <Crown size={9} className="stroke-[2.5]" />
                                                                                        </span>
                                                                                    )}
                                                                                    {booking.isGroupBooking && (
                                                                                        <span
                                                                                            className="w-4 h-4 rounded-full bg-rose-500 text-white border-[1.5px] border-white flex items-center justify-center shadow-xs flex-shrink-0"
                                                                                            title="Group Booking"
                                                                                        >
                                                                                            <Users size={9} className="stroke-[2.5]" />
                                                                                        </span>
                                                                                    )}
                                                                                </>
                                                                            )}
                                                                            {booking.status === 'hold' && (
                                                                                <span
                                                                                    className="w-4 h-4 rounded-full bg-amber-500 text-white border-[1.5px] border-white flex items-center justify-center shadow-xs flex-shrink-0"
                                                                                    title="Tentative Hold Booking"
                                                                                >
                                                                                    <Clock size={9} className="stroke-[2.5]" />
                                                                                </span>
                                                                            )}
                                                                            {booking.status === 'reserved' && (
                                                                                <span
                                                                                    className="w-4 h-4 rounded-full bg-slate-800 text-amber-300 border-[1.5px] border-white flex items-center justify-center shadow-xs flex-shrink-0 text-[8px] font-bold"
                                                                                    title="Reserve (Unpaid Non-Guaranteed Booking)"
                                                                                >
                                                                                    R
                                                                                </span>
                                                                            )}
                                                                            {booking.isPaymentDue && (
                                                                                <span
                                                                                    className="w-4 h-4 rounded-full bg-red-600 text-white border-[1.5px] border-white flex items-center justify-center shadow-xs flex-shrink-0"
                                                                                    title={`Payment Due: ${currencySymbol}${(booking.dueAmount || 0).toLocaleString()} (Includes Tax: ${currencySymbol}${(booking.totalTaxAmount || 0).toLocaleString()})`}
                                                                                >
                                                                                    <DollarSign size={9} className="stroke-[3]" />
                                                                                </span>
                                                                            )}
                                                                            {booking.isVipOrSingleLady && (
                                                                                <span
                                                                                    className="w-4 h-4 rounded-full bg-amber-500 text-white border-[1.5px] border-white flex items-center justify-center shadow-xs flex-shrink-0"
                                                                                    title="VIP / Single Lady"
                                                                                >
                                                                                    <Star size={9} className="fill-white stroke-[1.5]" />
                                                                                </span>
                                                                            )}
                                                                            {booking.taxApplicable === false && (
                                                                                <span
                                                                                    className="w-4 h-4 rounded-full bg-emerald-600 text-white border-[1.5px] border-white flex items-center justify-center shadow-xs flex-shrink-0 text-[7px] font-black"
                                                                                    title="Tax Exempt Reservation (0% VAT & SC)"
                                                                                >
                                                                                    EX
                                                                                </span>
                                                                            )}
                                                                        </div>

                                                                        <div className="flex items-center gap-1 min-w-0 flex-1 truncate">
                                                                            <span className="truncate">{booking.guestName}</span>
                                                                            <span
                                                                                className="text-[8.5px] font-semibold bg-black/20 text-white/90 px-1 py-0.5 rounded flex items-center gap-0.5 shrink-0"
                                                                                title={`Occupancy: ${booking.adults || 2} Adult(s)${(booking.children || 0) > 0 ? `, ${booking.children} Child(ren)` : ''}`}
                                                                            >
                                                                                <Users size={8} className="opacity-80" />
                                                                                {booking.adults || 2}A{(booking.children || 0) > 0 ? ` ${booking.children}C` : ''}
                                                                            </span>
                                                                        </div>
                                                                        {booking.indicator && (
                                                                            <span className="text-[9px] bg-black/20 px-1 rounded flex-shrink-0 ml-1">
                                                                                {booking.indicator}
                                                                            </span>
                                                                        )}

                                                                        {/* Extend Stay Drag Handle (Hidden for historical past stays) */}
                                                                        {!booking.isPast && (
                                                                            <div
                                                                                onMouseDown={(e) => {
                                                                                    e.stopPropagation();
                                                                                    e.preventDefault();
                                                                                    setExtendDrag({
                                                                                        booking,
                                                                                        startX: e.clientX,
                                                                                        originalEndIndex: booking.endIndex,
                                                                                        currentEndIndex: booking.endIndex,
                                                                                        attemptedEndIndex: booking.endIndex,
                                                                                        hasMoved: false
                                                                                    });
                                                                                }}
                                                                                onClick={(e) => {
                                                                                    e.stopPropagation();
                                                                                }}
                                                                                className={`absolute right-0 top-0 bottom-0 w-3.5 cursor-ew-resize flex items-center justify-center hover:bg-black/25 group/resize z-30 transition-colors ${isAnyDragActive ? 'pointer-events-none' : 'pointer-events-auto'
                                                                                    }`}
                                                                                title="Drag left/right to shorten or extend stay."
                                                                            >
                                                                                <div className="w-[3px] h-3.5 bg-white/70 rounded-full group-hover/resize:bg-white group-hover/resize:h-4.5 transition-all shadow-xs" />
                                                                                {isExtendBlocked ? (
                                                                                    <div className="block absolute -top-6 right-0 bg-red-600 text-white border border-white shadow-lg rounded px-2 py-0.5 text-[10px] font-sans whitespace-nowrap z-50 pointer-events-none select-none">
                                                                                        🚫 Already Booked
                                                                                    </div>
                                                                                ) : isBeingExtended ? (
                                                                                    <div className="block absolute -top-6 right-0 bg-slate-900 text-white border border-white/40 shadow-lg rounded px-2 py-0.5 text-[10px] font-sans whitespace-nowrap z-50 pointer-events-none select-none">
                                                                                        {Math.max(1, extendDrag.currentEndIndex - booking.startIndex + 1)} Night(s)
                                                                                    </div>
                                                                                ) : (
                                                                                    <div className="hidden group-hover/resize:block absolute top-full right-0 mt-1.5 bg-white text-gray-900 border border-black shadow-lg rounded-xs px-2 py-0.5 text-[10px] font-sans font-medium whitespace-nowrap z-50 pointer-events-none select-none">
                                                                                        Extend / Shorten stay
                                                                                    </div>
                                                                                )}
                                                                            </div>
                                                                        )}
                                                                    </div>
                                                                );
                                                            })}

                                                        {/* Render Active Soft Hold / Locks on Room */}
                                                        {(locksByRoom.get(room.roomNumber) || []).map(lock => {
                                                            const sIdx = days.findIndex(d => d.date === lock.checkIn);
                                                            const eIdx = days.findIndex(d => d.date === lock.checkOut);
                                                            const start = sIdx !== -1 ? sIdx : 0;
                                                            const end = eIdx !== -1 ? Math.max(start, eIdx - 1) : Math.min(daysWindow - 1, start + 1);
                                                            if (start > daysWindow - 1 || end < 0) return null;

                                                            const left = start * colWidth + 2;
                                                            const width = Math.max(24, (end - start + 1) * colWidth - 4);
                                                            const remainingSec = Math.max(0, Math.round((lock.expiresAt - Date.now()) / 1000));
                                                            const remainingMin = Math.floor(remainingSec / 60);

                                                            return (
                                                                <div
                                                                    key={lock.lockId}
                                                                    style={{ left: `${left}px`, width: `${width}px` }}
                                                                    className="absolute top-[7px] bottom-[5px] z-15 rounded border-2 border-dashed border-amber-400 bg-amber-100/90 text-amber-900 px-2 flex items-center justify-between shadow-xs select-none cursor-not-allowed group transition-all"
                                                                    title={`🔒 Held by ${lock.heldBy} (${remainingMin}m ${remainingSec % 60}s remaining)`}
                                                                >
                                                                    <div className="flex items-center gap-1.5 truncate">
                                                                        <Lock size={10} className="text-amber-700 flex-shrink-0 animate-pulse" />
                                                                        <span className="text-[9.5px] tracking-tight truncate">
                                                                            Held by {lock.heldBy}
                                                                        </span>
                                                                    </div>
                                                                    <span className="text-[8.5px] font-mono px-1 rounded bg-amber-300 text-amber-950 ml-1 flex-shrink-0">
                                                                        {remainingMin}m
                                                                    </span>
                                                                </div>
                                                            );
                                                        })}

                                                        {/* Drag Selection Visual Overlay */}
                                                        {dragState && dragState.room === room.roomNumber && (
                                                            <div
                                                                style={{
                                                                    left: `${Math.min(dragState.startIndex, dragState.endIndex) * colWidth}px`,
                                                                    width: `${(Math.abs(dragState.endIndex - dragState.startIndex) + 1) * colWidth}px`
                                                                }}
                                                                className="absolute top-1 bottom-1 bg-blue-500/30 border-2 border-blue-600 rounded z-20 pointer-events-none animate-pulse"
                                                            ></div>
                                                        )}
                                                    </div>
                                                </div>
                                            ))}
                                        </React.Fragment>
                                    ))}
                                </React.Fragment>
                            ))}
                        </div>

                        {/* Occupancy Summary Strip (O(1) Precomputed, Fixed at Bottom of Timeline) */}
                        <div className="bg-[#1e3a8a] text-white flex border-t border-blue-900 sticky bottom-0 z-30 select-none shadow-md">
                            <div style={{ width: `${TREE_COL_WIDTH}px`, flex: `0 0 ${TREE_COL_WIDTH}px` }} className="px-2 py-1 border-r border-blue-800 text-[10.5px] sticky left-0 z-40 bg-[#1e3a8a] flex-shrink-0 flex flex-col justify-center">
                                <div className="leading-tight">Occupancy (%)</div>
                                <div className="text-[9px] font-normal text-blue-200">Available</div>
                            </div>
                            <div className="flex flex-1" style={{ width: `${gridWidth}px` }}>
                                {days.map(d => {
                                    const occ = dailyOccupancy[d.index] || { occupied: 0, available: totalRoomsCount, percent: 0 };

                                    return (
                                        <div
                                            key={d.index}
                                            style={{ width: `${colWidth}px`, flex: `0 0 ${colWidth}px` }}
                                            className="px-0.5 py-1 border-r border-blue-800/80 text-center flex-shrink-0 flex flex-col justify-center overflow-hidden"
                                        >
                                            <div className="text-[10px] leading-tight">{occ.percent}%</div>
                                            <div className="text-[8.5px] font-mono text-blue-200 leading-tight">[{occ.available}]</div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* ========================================================================= */}
            {/* COMPACT & SLIM ASSIGN ROOMS DRAWER (PORTAL TO DOCUMENT.BODY WITH 0px TOP GAP) */}
            {/* ========================================================================= */}
            {isAssignRoomsOpen && typeof document !== 'undefined' && createPortal(
                <div className="fixed inset-0 z-[99999] overflow-hidden select-none">
                    {/* Backdrop Overlay covering entire viewport */}
                    <div
                        className="fixed inset-0 bg-black/40 backdrop-blur-[1px] transition-opacity animate-in fade-in"
                        onClick={() => setIsAssignRoomsOpen(false)}
                    />

                    {/* Right-Side Slim Drawer - Exact Full Viewport Height top-0 bottom-0 with 0px gap */}
                    <div className="fixed top-0 bottom-0 right-0 w-full sm:w-[370px] bg-white shadow-2xl flex flex-col border-l border-gray-200 animate-in slide-in-from-right duration-200 z-[100000]">
                        {/* Drawer Header - Compact & Slim */}
                        <div className="px-3.5 py-2.5 flex items-center justify-between border-b border-gray-100 flex-shrink-0">
                            <div className="flex items-center gap-2">
                                <h2 className="text-[13.5px] text-gray-900 tracking-tight font-semibold">Assign Rooms</h2>
                                <label
                                    className="w-6 h-6 rounded border border-gray-200 text-gray-600 flex items-center justify-center hover:bg-gray-50 transition-colors shadow-2xs cursor-pointer relative"
                                    title="Pick Date to Jump"
                                >
                                    <CalendarIcon size={12} />
                                    <input
                                        type="date"
                                        value={modalDays[selectedModalDateIndex]?.date || startDate}
                                        onChange={(e) => {
                                            const pickedDate = e.target.value;
                                            if (!pickedDate) return;
                                            const foundIdx = modalDays.findIndex(d => d.date === pickedDate);
                                            if (foundIdx >= 0) {
                                                setSelectedModalDateIndex(foundIdx);
                                                setModalDateStartIndex(Math.max(0, Math.min(modalDays.length - 7, foundIdx)));
                                            } else {
                                                setStartDate(pickedDate);
                                                setSelectedModalDateIndex(0);
                                                setModalDateStartIndex(0);
                                            }
                                        }}
                                        className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                                    />
                                </label>
                            </div>
                            <button
                                type="button"
                                onClick={() => setIsAssignRoomsOpen(false)}
                                className="text-gray-400 hover:text-gray-700 p-0.5 rounded-md transition-colors cursor-pointer"
                                title="Close"
                            >
                                <X size={16} />
                            </button>
                        </div>

                        {/* Quick Reservation Search in Assign Drawer */}
                        <div className="p-2.5 bg-slate-50 border-b border-gray-200 relative flex-shrink-0">
                            <div className="relative flex items-center">
                                <Search size={12} className="absolute left-2.5 text-slate-400 pointer-events-none" />
                                <input
                                    type="text"
                                    placeholder="Search reservation #, guest name..."
                                    value={assignDrawerSearch}
                                    onChange={(e) => setAssignDrawerSearch(e.target.value)}
                                    className="w-full h-7 pl-7 pr-6 bg-white border border-slate-200 rounded-md text-[11px] text-slate-800 placeholder-slate-400 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 shadow-2xs"
                                />
                                {assignDrawerSearch && (
                                    <button
                                        type="button"
                                        onClick={() => setAssignDrawerSearch('')}
                                        className="absolute right-2 text-slate-400 hover:text-slate-600 p-0.5 cursor-pointer"
                                    >
                                        <X size={11} />
                                    </button>
                                )}
                            </div>

                            {/* Dropdown of search matches */}
                            {assignDrawerSearch.trim() && (
                                <div className="absolute left-2.5 right-2.5 top-full mt-1 bg-white border border-slate-200 rounded-lg shadow-xl z-50 max-h-[220px] overflow-y-auto divide-y divide-slate-100 animate-in fade-in">
                                    {searchMatchingUnassigned.length > 0 ? (
                                        searchMatchingUnassigned.map(match => (
                                            <div
                                                key={match.id}
                                                onClick={() => {
                                                    handleJumpToBooking(match);
                                                    setAssignDrawerSearch('');
                                                }}
                                                className="p-2 hover:bg-blue-50/70 cursor-pointer transition-colors flex items-center justify-between text-left group"
                                            >
                                                <div className="min-w-0 flex-1 pr-2">
                                                    <div className="flex items-center gap-1.5">
                                                        <span className="text-[11px] font-bold text-blue-700 font-mono">
                                                            {match.reservationNumber}
                                                        </span>
                                                        <span className="text-[9px] px-1 py-0.2 bg-slate-100 text-slate-600 rounded">
                                                            {match.checkIn}
                                                        </span>
                                                    </div>
                                                    <p className="text-[10.5px] text-slate-800 font-medium truncate mt-0.5">
                                                        {match.guestName} • <span className="text-slate-500">{match.roomType}</span>
                                                    </p>
                                                </div>
                                                <div className="flex items-center gap-1 text-[9.5px] font-semibold text-blue-600 group-hover:text-blue-800 shrink-0">
                                                    <span>Assign</span>
                                                    <ArrowRight size={11} />
                                                </div>
                                            </div>
                                        ))
                                    ) : (
                                        <div className="p-3 text-center text-[10.5px] text-slate-400">
                                            No unassigned reservations match "{assignDrawerSearch}"
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>

                        {/* Date Carousel Bar - Slim Height 52px */}
                        <div className="flex items-stretch border-b border-gray-200/90 h-[52px] bg-white flex-shrink-0">
                            {/* Left Carousel Arrow */}
                            <button
                                type="button"
                                onClick={() => {
                                    if (modalDateStartIndex > 0) {
                                        const nextStart = modalDateStartIndex - 1;
                                        setModalDateStartIndex(nextStart);
                                        if (selectedModalDateIndex > nextStart + 6) {
                                            setSelectedModalDateIndex(nextStart + 6);
                                        } else if (selectedModalDateIndex < nextStart) {
                                            setSelectedModalDateIndex(nextStart);
                                        }
                                    } else {
                                        const parts = startDate.split('-').map(Number);
                                        const cur = new Date(parts[0], parts[1] - 1, parts[2] - 1, 12, 0, 0);
                                        const y = cur.getFullYear();
                                        const m = String(cur.getMonth() + 1).padStart(2, '0');
                                        const day = String(cur.getDate()).padStart(2, '0');
                                        setStartDate(`${y}-${m}-${day}`);
                                        setSelectedModalDateIndex(0);
                                        setModalDateStartIndex(0);
                                    }
                                }}
                                className="w-7 flex items-center justify-center text-gray-600 hover:bg-gray-100 hover:text-blue-600 active:bg-gray-200 cursor-pointer border-r border-gray-100 transition-colors"
                                title="Previous Date"
                            >
                                <ChevronLeft size={14} />
                            </button>

                            {/* 7 Visible Date Items */}
                            <div className="flex-1 flex overflow-hidden divide-x divide-gray-100">
                                {modalDays.slice(modalDateStartIndex, modalDateStartIndex + 7).map((d, index) => {
                                    const actualIndex = modalDateStartIndex + index;
                                    const isActive = selectedModalDateIndex === actualIndex;
                                    const hasUnassignedOnDate = unassignedList.some(u => u.checkIn === d.date);

                                    return (
                                        <div
                                            key={actualIndex}
                                            onClick={() => setSelectedModalDateIndex(actualIndex)}
                                            className={`flex-1 flex flex-col items-center justify-center cursor-pointer transition-all relative ${isActive
                                                ? 'bg-[#f0f7ff] text-[#3b82f6] border-b-2 border-b-[#3b82f6] font-bold'
                                                : 'text-gray-600 hover:bg-gray-50'
                                                }`}
                                        >
                                            {/* Blue dot indicator for unassigned items */}
                                            {hasUnassignedOnDate && (
                                                <span className="w-1.5 h-1.5 rounded-full bg-[#3b82f6] absolute top-1"></span>
                                            )}
                                            <span className={`text-[9.5px] font-semibold leading-none ${isActive ? 'text-[#3b82f6]' : 'text-gray-500'}`}>
                                                {d.dayName}
                                            </span>
                                            <span className={`text-xs font-black leading-none my-0.5 ${isActive ? 'text-[#3b82f6]' : 'text-gray-900'}`}>
                                                {d.num}
                                            </span>
                                            <span className={`text-[8.5px] leading-none ${isActive ? 'text-[#3b82f6]' : 'text-gray-400'}`}>
                                                {d.monthShort}
                                            </span>
                                        </div>
                                    );
                                })}
                            </div>

                            {/* Right Carousel Arrow */}
                            <button
                                type="button"
                                onClick={() => {
                                    if (modalDateStartIndex < modalDays.length - 7) {
                                        const nextStart = modalDateStartIndex + 1;
                                        setModalDateStartIndex(nextStart);
                                        if (selectedModalDateIndex < nextStart) {
                                            setSelectedModalDateIndex(nextStart);
                                        } else if (selectedModalDateIndex > nextStart + 6) {
                                            setSelectedModalDateIndex(nextStart + 6);
                                        }
                                    } else {
                                        const parts = startDate.split('-').map(Number);
                                        const cur = new Date(parts[0], parts[1] - 1, parts[2] + 1, 12, 0, 0);
                                        const y = cur.getFullYear();
                                        const m = String(cur.getMonth() + 1).padStart(2, '0');
                                        const day = String(cur.getDate()).padStart(2, '0');
                                        setStartDate(`${y}-${m}-${day}`);
                                    }
                                }}
                                className="w-7 flex items-center justify-center text-gray-600 hover:bg-gray-100 hover:text-blue-600 active:bg-gray-200 cursor-pointer border-l border-gray-100 transition-colors"
                                title="Next Date"
                            >
                                <ChevronRight size={14} />
                            </button>
                        </div>

                        {/* Drawer Body: Unassigned Reservations for Selected Date */}
                        <div className="flex-1 overflow-y-auto p-3 space-y-2 bg-[#fafafa]">
                            {unassignedForSelectedDate.length > 0 ? (
                                unassignedForSelectedDate.map(item => {
                                    const isExpanded = expandedAccordions[item.id] !== false;
                                    const availableRooms = getAvailableRoomsForBooking(item);
                                    const isAssigning = activeAssigningId === item.id;

                                    return (
                                        <div key={item.id} className="bg-white border border-gray-200/90 rounded-lg overflow-hidden shadow-2xs">
                                            {/* Accordion Header */}
                                            <div
                                                onClick={() => toggleAccordion(item.id)}
                                                className="px-3 py-2 flex items-center justify-between cursor-pointer hover:bg-gray-50 transition-colors border-b border-gray-100"
                                            >
                                                <div className="flex items-center gap-1.5">
                                                    {isExpanded ? (
                                                        <ChevronDown size={13} className="text-gray-500" />
                                                    ) : (
                                                        <ChevronRight size={13} className="text-gray-500" />
                                                    )}
                                                    <span className="text-[10px] text-gray-900 tracking-tight">
                                                        Reservation Number : {item.reservationNumber}
                                                    </span>
                                                </div>
                                            </div>

                                            {/* Reservation Card Details */}
                                            {isExpanded && (
                                                <div className="p-2.5">
                                                    <div className="flex items-start justify-between gap-2.5">
                                                        {/* Dates Left Column */}
                                                        <div className="flex flex-col items-center justify-between text-center min-w-[34px] pr-2 border-r border-gray-100">
                                                            <div>
                                                                <span className="text-xs font-black text-gray-800 leading-tight block">
                                                                    {formatDayNum(item.checkIn)}
                                                                </span>
                                                                <span className="text-[8.5px] font-semibold text-gray-400 uppercase block">
                                                                    {formatMonth(item.checkIn)}
                                                                </span>
                                                            </div>
                                                            <div className="w-px h-2.5 bg-gray-200 my-1"></div>
                                                            <div>
                                                                <span className="text-xs font-black text-gray-800 leading-tight block">
                                                                    {formatDayNum(item.checkOut)}
                                                                </span>
                                                                <span className="text-[8.5px] font-semibold text-gray-400 uppercase block">
                                                                    {formatMonth(item.checkOut)}
                                                                </span>
                                                            </div>
                                                        </div>

                                                        {/* Center Information */}
                                                        <div className="flex-1 min-w-0">
                                                            <h4 className="text-xs text-gray-900 leading-tight truncate">
                                                                {item.guestName}
                                                            </h4>
                                                            <p className="text-[9.5px] text-gray-400 font-medium mt-0.5">
                                                                Total Rooms: {item.totalRooms || 1}
                                                            </p>

                                                            <div className="mt-1.5">
                                                                <span className="text-[9px] text-gray-400 font-medium block">Room Type</span>
                                                                <span className="text-[10.5px] text-gray-800 block truncate">
                                                                    {item.roomType}
                                                                </span>
                                                            </div>
                                                        </div>

                                                        {/* Right Action Column */}
                                                        <div className="flex flex-col items-end flex-shrink-0">
                                                            <span className="text-[9.5px] text-gray-400 font-medium mb-1">Room</span>

                                                            {isAssigning ? (
                                                                <div className="flex flex-col items-end gap-1 animate-in fade-in">
                                                                    <select
                                                                        value={selectedRoomNumber || availableRooms[0]?.roomNumber || ''}
                                                                        onChange={(e) => setSelectedRoomNumber(e.target.value)}
                                                                        className="h-6 px-1.5 border border-blue-500 rounded text-[10.5px] font-semibold text-gray-800 bg-white focus:outline-none focus:ring-1 focus:ring-blue-500 max-w-[140px]"
                                                                    >
                                                                        {(() => {
                                                                            const matching = availableRooms.filter(r => r.type.toLowerCase().trim() === item.roomType.toLowerCase().trim());
                                                                            const other = availableRooms.filter(r => r.type.toLowerCase().trim() !== item.roomType.toLowerCase().trim());
                                                                            return (
                                                                                <>
                                                                                    {matching.length > 0 && (
                                                                                        <optgroup label={`✓ Exact Match (${item.roomType})`}>
                                                                                            {matching.map(r => (
                                                                                                <option key={r.roomNumber} value={r.roomNumber}>
                                                                                                    Room {r.roomNumber} (Match)
                                                                                                </option>
                                                                                            ))}
                                                                                        </optgroup>
                                                                                    )}
                                                                                    {other.length > 0 && (
                                                                                        <optgroup label="↕ Other Available Rooms">
                                                                                            {other.map(r => (
                                                                                                <option key={r.roomNumber} value={r.roomNumber}>
                                                                                                    Room {r.roomNumber} ({r.type.split(' ')[0]})
                                                                                                </option>
                                                                                            ))}
                                                                                        </optgroup>
                                                                                    )}
                                                                                </>
                                                                            );
                                                                        })()}
                                                                    </select>
                                                                    <div className="flex items-center gap-1">
                                                                        <button
                                                                            type="button"
                                                                            onClick={() => handleConfirmAssign(item)}
                                                                            className="h-5 px-2 bg-[#1e3a8a] hover:bg-blue-900 text-white rounded text-[9.5px] cursor-pointer transition-colors"
                                                                        >
                                                                            Confirm
                                                                        </button>
                                                                        <button
                                                                            type="button"
                                                                            onClick={() => setActiveAssigningId(null)}
                                                                            className="h-5 px-1 text-gray-500 hover:text-gray-700 text-[9.5px] font-semibold cursor-pointer"
                                                                        >
                                                                            Cancel
                                                                        </button>
                                                                    </div>
                                                                </div>
                                                            ) : (
                                                                <button
                                                                    type="button"
                                                                    onClick={() => {
                                                                        setActiveAssigningId(item.id);
                                                                        setSelectedRoomNumber(availableRooms[0]?.roomNumber || '102');
                                                                    }}
                                                                    className="h-6 px-2.5 border border-gray-300 hover:border-gray-400 rounded bg-white hover:bg-gray-50 text-gray-700 text-[10.5px] font-semibold shadow-2xs transition-colors cursor-pointer select-none active:scale-[0.98]"
                                                                >
                                                                    Assign Room
                                                                </button>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    );
                                })
                            ) : (
                                /* Empty state matching reference */
                                <div className="h-full min-h-[220px] flex flex-col items-center justify-center text-center p-4 text-gray-400">
                                    <svg xmlns="http://www.w3.org/2000/svg" className="w-12 h-12 opacity-30 mb-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                                    </svg>
                                    <span className="text-xs font-semibold text-gray-500">No Unassigned Bookings</span>
                                    <p className="text-[10px] text-gray-400 mt-0.5">
                                        No unassigned rooms for {selectedDateObj?.dayName} {selectedDateObj?.num} {selectedDateObj?.monthShort}.
                                    </p>
                                    {unassignedList.length > 0 && (
                                        <button
                                            type="button"
                                            onClick={() => {
                                                handleJumpToBooking(unassignedList[0]);
                                            }}
                                            className="mt-2.5 px-2.5 py-1 bg-blue-50 text-blue-700 hover:bg-blue-100 text-[10px] font-medium rounded transition-colors border border-blue-200 cursor-pointer"
                                        >
                                            Jump to next ({unassignedList[0]?.reservationNumber})
                                        </button>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                </div>,
                document.body
            )}

            {/* Quick Reservation Modal */}
            <QuickReservationModal
                isOpen={isQuickReservationOpen}
                onClose={() => {
                    setIsQuickReservationOpen(false);
                    setSelectedRange(null);
                }}
                roomInfo={quickReservationRoomInfo}
                onReserve={(_newBooking) => {
                    setIsQuickReservationOpen(false);
                    setSelectedRange(null);
                    syncStoredReservations();
                }}
                onReservationCreated={(_newRes) => {
                    setIsQuickReservationOpen(false);
                    setSelectedRange(null);
                    syncStoredReservations();
                }}
            />

            {/* Add Full Reservation Modal */}
            <AddReservationModal
                isOpen={isAddReservationOpen}
                onClose={() => {
                    setIsAddReservationOpen(false);
                    setSelectedRange(null);
                    setEditingReservation(null);
                }}
                initialRoom={selectedRange?.room || '101'}
                initialStartDate={selectedRange ? days[selectedRange.startIndex]?.date : startDate}
                initialEndDate={(() => {
                    const startIso = selectedRange ? days[selectedRange.startIndex]?.date : startDate;
                    const stayNights = selectedRange ? Math.max(1, selectedRange.endIndex - selectedRange.startIndex + 1) : 1;
                    const baseStart = new Date(startIso || '2026-07-01');
                    const baseEnd = new Date(baseStart);
                    baseEnd.setDate(baseEnd.getDate() + stayNights);
                    return baseEnd.toISOString().split('T')[0];
                })()}
                editingReservation={editingReservation}
                onReservationCreated={(_res) => {
                    setIsAddReservationOpen(false);
                    setSelectedRange(null);
                    setEditingReservation(null);
                    syncStoredReservations();
                }}
            />

            {/* Unified Reusable Reservation Action Drawer (matching all WingsCRM reference screens) */}
            <ReservationActionDrawer
                isOpen={isActionDrawerOpen}
                onClose={() => {
                    setIsActionDrawerOpen(false);
                    setActionDrawerBooking(null);
                }}
                booking={actionDrawerBooking}
                initialMode={actionDrawerMode}
                allRooms={allRooms}
                initialTargetDeparture={actionDrawerTargetDep}
                initialTargetNights={actionDrawerTargetNights}
                initialTargetRoomNumber={actionDrawerTargetRoom}
                onSaveAmendStay={handleSaveAmendStay}
                onSaveRoomMove={handleSaveRoomMove}
                onSavePayment={handleSavePayment}
                onSaveRoomSplit={handleSaveRoomSplit}
                onStopRoomMove={handleStopRoomMove}
                onProceedNewBooking={handleProceedNewBooking}
                onConfirmCancel={handleConfirmCancel}
                onConfirmVoid={handleConfirmVoid}
                onConfirmHold={handleConfirmHold}
                onConfirmUnassign={handleConfirmUnassign}
                onConfirmUngroup={handleConfirmUngroup}
                onConfirmChangeOwner={handleConfirmChangeOwner}
                onCheckIn={handleDrawerCheckIn}
                onCheckOut={handleDrawerCheckOut}
                systemDate={operatingDateStr}
                onEdit={(b) => {
                    setIsActionDrawerOpen(false);
                    sessionStorage.setItem('hotel_edit_reservation_id', b?.reservationNumber || String(b?.id));
                    setActivePage('add-reservation');
                }}
            />

            {/* Floating Mouse Cursor Badge during Room Move Drag */}
            {moveDrag && moveDrag.isDragging && (
                <div
                    style={{ left: `${moveDrag.currentX + 16}px`, top: `${moveDrag.currentY + 16}px` }}
                    className="fixed z-[100001] pointer-events-none bg-gray-900/95 text-white border border-blue-400/80 rounded-md px-3 py-1.5 text-xs shadow-2xl flex items-center gap-2 backdrop-blur-xs"
                >
                    {isInHouseBooking(moveDrag.booking) ? (
                        <>
                            <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
                            <span>Transfer In-House to Room {moveDrag.targetRoomNumber}</span>
                            <span className="text-amber-300">(Effective: {operatingDateStr})</span>
                        </>
                    ) : (
                        <>
                            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                            <span>Move to Room {moveDrag.targetRoomNumber}</span>
                            <span className="text-blue-300">({days[moveDrag.targetStartIndex]?.date || ''})</span>
                        </>
                    )}
                </div>
            )}

            {/* Rich Floating Luxury Hover Card Preview */}
            {hoveredBooking && !isAnyDragActive && createPortal(
                <div
                    className="fixed z-[99999] pointer-events-none select-none transition-opacity duration-150 animate-in fade-in zoom-in-95"
                    style={(() => {
                        const cardWidth = 320;
                        const cardHeight = 220;
                        const rect = hoveredBooking.rect;
                        const showAbove = rect.top > cardHeight + 16;
                        const top = showAbove
                            ? rect.top - cardHeight - 8
                            : rect.bottom + 8;
                        const left = Math.max(12, Math.min(window.innerWidth - cardWidth - 12, rect.left + rect.width / 2 - cardWidth / 2));
                        return { top: `${top}px`, left: `${left}px`, width: `${cardWidth}px` };
                    })()}
                >
                    <div className="bg-slate-900/95 backdrop-blur-md text-white rounded-xl shadow-2xl border border-slate-700/80 p-3 text-xs space-y-2">
                        {/* Header: Guest Name & Status Badge */}
                        <div className="flex items-start justify-between gap-2 pb-2 border-b border-slate-800">
                            <div className="min-w-0">
                                <div className="flex items-center gap-1.5">
                                    <span className="font-extrabold text-[12.5px] text-white tracking-tight truncate">
                                        {hoveredBooking.enriched?.guestName || hoveredBooking.booking?.guestName}
                                    </span>
                                    {hoveredBooking.booking?.isVipOrSingleLady && (
                                        <span className="px-1 py-0.2 bg-amber-500/20 border border-amber-400/40 text-amber-300 rounded text-[8.5px] font-bold">
                                            ⭐ VIP
                                        </span>
                                    )}
                                    {Boolean(hoveredBooking.booking?.isConnectingSuite || hoveredBooking.enriched?.isConnectingSuite) && (
                                        <span className="px-1.5 py-0.2 bg-indigo-500/30 border border-indigo-400/50 text-indigo-200 rounded text-[8.5px] font-bold">
                                            🔗 Connecting Suite
                                        </span>
                                    )}
                                    {!hoveredBooking.booking?.isConnectingSuite && hoveredBooking.booking?.isGroupOwner && (
                                        <span className="px-1 py-0.2 bg-purple-500/20 border border-purple-400/40 text-purple-300 rounded text-[8.5px] font-bold">
                                            👑 Leader
                                        </span>
                                    )}
                                </div>
                                <div className="flex items-center gap-1.5 mt-0.5 text-[10px] text-slate-400 font-mono flex-wrap">
                                    <span className="font-bold text-white">#{hoveredBooking.enriched?.subBookingNumber || hoveredBooking.booking?.subBookingNumber || hoveredBooking.enriched?.reservationNumber || hoveredBooking.booking?.reservationNumber}</span>
                                    {Boolean(hoveredBooking.booking?.isConnectingSuite || hoveredBooking.enriched?.isConnectingSuite) ? (
                                        <span className="text-indigo-300 font-bold bg-indigo-950/80 border border-indigo-500/40 px-1.5 py-0.2 rounded text-[8.5px] flex items-center gap-1">
                                            🔗 Interconnected
                                        </span>
                                    ) : (hoveredBooking.enriched?.groupCode || hoveredBooking.booking?.groupCode) && (
                                        <span className="text-purple-300 font-semibold bg-purple-950/60 border border-purple-500/30 px-1 py-0.2 rounded text-[8.5px]">
                                            {hoveredBooking.enriched?.groupCode || hoveredBooking.booking?.groupCode}
                                        </span>
                                    )}
                                    {hoveredBooking.enriched?.registrationNumber && (
                                        <>
                                            <span>•</span>
                                            <span className="text-emerald-300 font-bold bg-emerald-950/60 border border-emerald-500/30 px-1 py-0.2 rounded text-[9px]">
                                                {hoveredBooking.enriched.registrationNumber}
                                            </span>
                                        </>
                                    )}
                                    <span>•</span>
                                    <span className="text-blue-300 font-bold">
                                        Room {hoveredBooking.enriched?.roomNumber || hoveredBooking.booking?.roomNumber}
                                        {Boolean(hoveredBooking.booking?.isConnectingSuite || hoveredBooking.enriched?.isConnectingSuite) && (
                                            <span className="text-emerald-300 ml-1 font-semibold text-[9px]">
                                                (Adjoining Door)
                                            </span>
                                        )}
                                    </span>
                                </div>
                            </div>

                            <span className={`px-2 py-0.5 rounded text-[9.5px] font-black uppercase tracking-wide border shadow-2xs shrink-0 ${(hoveredBooking.enriched?.status || hoveredBooking.booking?.status) === 'CONFIRMED'
                                ? 'bg-blue-500/25 text-blue-300 border-blue-500/40'
                                : (hoveredBooking.enriched?.status || hoveredBooking.booking?.status) === 'ARRIVED' || (hoveredBooking.enriched?.status || hoveredBooking.booking?.status) === 'IN-HOUSE'
                                    ? 'bg-emerald-500/25 text-emerald-300 border-emerald-500/40'
                                    : (hoveredBooking.enriched?.status || hoveredBooking.booking?.status) === 'STAYOVER'
                                        ? 'bg-teal-500/25 text-teal-300 border-teal-500/40'
                                        : (hoveredBooking.enriched?.status || hoveredBooking.booking?.status) === 'DUE-OUT'
                                            ? 'bg-orange-500/25 text-orange-300 border-orange-500/40'
                                            : (hoveredBooking.enriched?.status || hoveredBooking.booking?.status) === 'HOLD'
                                                ? 'bg-purple-500/25 text-purple-300 border-purple-500/40'
                                                : 'bg-slate-700/60 text-slate-300 border-slate-600'
                                }`}>
                                {hoveredBooking.enriched?.status || hoveredBooking.booking?.status || 'CONFIRMED'}
                            </span>
                        </div>

                        {/* 2x2 Details Grid */}
                        <div className="grid grid-cols-2 gap-1.5 text-[10px]">
                            {/* Stay Dates */}
                            <div className="bg-slate-800/80 rounded-lg p-2 border border-slate-700/60">
                                <div className="text-[8.5px] text-slate-400 uppercase tracking-wider flex items-center gap-1">
                                    <CalendarIcon size={10} className="text-blue-400" />
                                    <span>Stay Period</span>
                                </div>
                                <div className="text-slate-200 mt-0.5 text-[10.5px]">
                                    {(hoveredBooking.enriched?.arrivalDate || hoveredBooking.booking?.checkInDate || '').slice(5)} ➔ {(hoveredBooking.enriched?.departureDate || hoveredBooking.booking?.checkOutDate || '').slice(5)}
                                </div>
                                <div className="text-[9px] text-blue-300 font-semibold font-mono">
                                    {hoveredBooking.enriched?.nights ?? hoveredBooking.booking?.nights ?? 1} Night{(hoveredBooking.enriched?.nights ?? hoveredBooking.booking?.nights ?? 1) > 1 ? 's' : ''}
                                </div>
                            </div>

                            {/* Room & Category */}
                            <div className="bg-slate-800/80 rounded-lg p-2 border border-slate-700/60">
                                <div className="text-[8.5px] text-slate-400 uppercase tracking-wider flex items-center gap-1">
                                    <Home size={10} className="text-emerald-400" />
                                    <span>Category &amp; Pax</span>
                                </div>
                                <div className="text-slate-200 mt-0.5 text-[10.5px] truncate" title={hoveredBooking.enriched?.roomType || hoveredBooking.booking?.roomType}>
                                    {hoveredBooking.enriched?.roomType || hoveredBooking.booking?.roomType || 'Standard'}
                                </div>
                                <div className="text-[9px] text-slate-400">
                                    {hoveredBooking.enriched?.adults ?? hoveredBooking.booking?.adults ?? 2} Adult{(hoveredBooking.enriched?.adults ?? hoveredBooking.booking?.adults ?? 2) > 1 ? 's' : ''}{(hoveredBooking.enriched?.children ?? hoveredBooking.booking?.children ?? 0) > 0 ? `, ${hoveredBooking.enriched?.children ?? hoveredBooking.booking?.children} Child` : ''}
                                </div>
                            </div>

                            {/* Rate Plan */}
                            <div className="bg-slate-800/80 rounded-lg p-2 border border-slate-700/60">
                                <div className="text-[8.5px] text-slate-400 uppercase tracking-wider flex items-center gap-1">
                                    <Printer size={10} className="text-amber-400" />
                                    <span>Rate Plan</span>
                                </div>
                                <div className="text-slate-200 mt-0.5 text-[10.5px] truncate" title={hoveredBooking.enriched?.ratePlan || hoveredBooking.booking?.ratePlan}>
                                    {hoveredBooking.enriched?.ratePlan || hoveredBooking.booking?.ratePlan || 'Standard Rate'}
                                </div>
                                <div className="text-[9px] text-slate-400 font-mono">
                                    {currencySymbol}{(hoveredBooking.enriched?.avgDailyRate ?? hoveredBooking.booking?.rate ?? 0).toLocaleString()}/night
                                </div>
                            </div>

                            {/* Folio Financials */}
                            <div className="bg-slate-800/80 rounded-lg p-2 border border-slate-700/60">
                                <div className="text-[8.5px] text-slate-400 uppercase tracking-wider flex items-center justify-between">
                                    <div className="flex items-center gap-1">
                                        <Wallet size={10} className="text-cyan-400" />
                                        <span>Total &amp; Balance</span>
                                    </div>
                                    {hoveredBooking.enriched?.folioNumber && (
                                        <span className="text-[8px] font-mono text-cyan-300">
                                            {hoveredBooking.enriched.folioNumber}
                                        </span>
                                    )}
                                </div>
                                <div className="text-white mt-0.5 text-[10.5px] font-mono">
                                    {currencySymbol}{(hoveredBooking.enriched?.totalAmount ?? hoveredBooking.booking?.totalAmount ?? 0).toLocaleString()}
                                </div>
                                <div className={`text-[9px] font-mono ${(hoveredBooking.enriched?.dueAmount ?? 0) > 0 ? 'text-rose-400' : 'text-emerald-400'
                                    }`}>
                                    {(hoveredBooking.enriched?.dueAmount ?? 0) > 0
                                        ? `Due: ${currencySymbol}${(hoveredBooking.enriched?.dueAmount || 0).toLocaleString()}`
                                        : '✓ Settled'}
                                </div>
                            </div>
                        </div>

                        {/* Micro Quick Hint */}
                        <div className="pt-1.5 flex items-center justify-between text-[8.5px] text-slate-400 border-t border-slate-800/80">
                            <span className="flex items-center gap-1">
                                <span className="size-1.5 rounded-full bg-blue-400 animate-pulse" />
                                Click bar for drawer actions
                            </span>
                            <span>Drag edge to resize Stay</span>
                        </div>
                    </div>
                </div>,
                document.body
            )}

            {/* Hover Tooltip for Date Headers / Holidays */}
            {hoveredDate && createPortal(
                <div
                    className="fixed z-50 pointer-events-none transition-all duration-150 animate-in fade-in zoom-in-95"
                    style={{
                        top: `${Math.min(window.innerHeight - 170, hoveredDate.rect.bottom + 6)}px`,
                        left: `${Math.min(Math.max(12, hoveredDate.rect.left + hoveredDate.rect.width / 2 - 130), window.innerWidth - 275)}px`,
                        width: '260px'
                    }}
                >
                    <div className="bg-slate-900/95 backdrop-blur-md text-white rounded-xl shadow-2xl border border-slate-700/80 p-3 text-xs">
                        {/* Header badge & ISO date */}
                        <div className="flex items-center justify-between pb-1.5 border-b border-slate-800">
                            <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider ${hoveredDate.day.calendarHoliday
                                ? 'bg-amber-500/25 text-amber-300 border border-amber-500/40'
                                : hoveredDate.day.isWeekend
                                    ? 'bg-rose-500/25 text-rose-300 border border-rose-500/40'
                                    : 'bg-blue-500/20 text-blue-300 border border-blue-500/40'
                                }`}>
                                {hoveredDate.day.categoryBadge}
                            </span>
                            <span className="text-[10px] text-slate-400 font-mono">
                                {hoveredDate.day.date}
                            </span>
                        </div>

                        {/* Holiday Title / Body */}
                        <div className="mt-2 space-y-1">
                            {hoveredDate.day.isHoliday ? (
                                <>
                                    <div className="text-[12px] font-bold text-amber-300 flex items-start gap-1.5 leading-snug">
                                        <span className="text-sm">🎉</span>
                                        <span>{hoveredDate.day.holidayTitle}</span>
                                    </div>
                                    {hoveredDate.day.holidayDescription && (
                                        <p className="text-[10px] text-slate-300 mt-1 leading-relaxed">
                                            {hoveredDate.day.holidayDescription}
                                        </p>
                                    )}
                                    {hoveredDate.day.hasSurgeRate && (
                                        <div className="mt-2 inline-flex items-center gap-1 px-2 py-0.5 rounded bg-amber-400/20 text-amber-200 text-[10px] font-semibold border border-amber-400/30">
                                            <span>⚡</span>
                                            <span>Surge Rate Multiplier: {hoveredDate.day.rateMultiplier}x</span>
                                        </div>
                                    )}
                                </>
                            ) : (
                                <div className="text-[11.5px] font-semibold text-slate-200">
                                    {hoveredDate.day.fullDateStr}
                                </div>
                            )}
                        </div>

                        {/* Footer day and operating indicator */}
                        <div className="mt-2.5 pt-1.5 border-t border-slate-800 text-[9.5px] text-slate-400 flex items-center justify-between">
                            <span>{hoveredDate.day.dayName}, {hoveredDate.day.num} {hoveredDate.day.monthShort}</span>
                            {hoveredDate.day.isToday && (
                                <span className="text-blue-400 font-bold flex items-center gap-1">
                                    <span className="size-1.5 rounded-full bg-blue-400 animate-ping"></span>
                                    System Today
                                </span>
                            )}
                        </div>
                    </div>
                </div>,
                document.body
            )}

            {/* Out Of Order & Out Of Service Management Modal */}
            <OutOfOrderModal
                isOpen={isOOOModalOpen}
                onClose={() => {
                    setIsOOOModalOpen(false);
                    setSelectedOOORoom(undefined);
                    setSelectedOOOStart(undefined);
                    setSelectedOOOEnd(undefined);
                }}
                initialRoomNumber={selectedOOORoom}
                initialStartDate={selectedOOOStart}
                initialEndDate={selectedOOOEnd}
                onBlockUpdated={() => {
                    setOooVersion(v => v + 1);
                    setRoomsVersion(v => v + 1);
                }}
            />
        </div>
    );
};

export default StayView;