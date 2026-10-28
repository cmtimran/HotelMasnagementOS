import { useState, useEffect, useCallback, useMemo } from 'react';
import {
    Search, Sparkles, BedDouble, AlertCircle, Users, CheckCircle2, XCircle,
    Clock, RefreshCw, X, Edit3, Zap, Coffee, ShieldAlert, Star,
    CheckSquare, Square, Layers, UserCheck, Filter, Wrench, PackageSearch, Plus,
    Printer, ShoppingBag, AlertTriangle, FileCheck, Hammer
} from 'lucide-react';
import { useNavigation } from '../context/NavigationContext';
import { createLostAndFoundItem } from '../utils/lostAndFoundEngine';
import {
    getCanonicalRooms, getAllStoredReservations, getOperatingSystemDate,
    broadcastPMSEvent, subscribeToPMSEvents, updateRoomHousekeepingInDB
} from '../utils/roomInventoryEngine';
import { dispatchPMSNetworkEvent } from '../utils/pmsNetworkSync';
import { getApiBaseUrl } from '../utils/apiUrl';
import { getHousekeepingSettings, getHousekeepersList, isLinenChangeDue } from '../utils/housekeepingSettingsEngine';
import PageHeader from './common/PageHeader';
import OutOfOrderModal from './modals/OutOfOrderModal';
import { createMaintenanceTask, type MaintenanceTask } from '../utils/maintenanceEngine';
import {
    getStoredDiscrepancies, flagRoomDiscrepancy, resolveRoomDiscrepancy,
    type RoomDiscrepancy, type DiscrepancyType
} from '../utils/housekeepingDiscrepancyEngine';
import {
    STANDARD_MINIBAR_CATALOG, postMinibarToFolio,
    type MinibarConsumptionItem
} from '../utils/minibarEngine';

interface HousekeepingRoom {
    id: number | string;
    roomNumber: string;
    floor: number;
    roomType: string;
    status: 'dirty' | 'clean' | 'inspected' | 'out-of-order';
    assignedTo?: string;
    priority: 'rush' | 'high' | 'normal' | 'low';
    lastCleaned?: string;
    notes?: string;
    // Enhanced fields
    isRush: boolean;               // Arrival within rushAlertMinutes
    isDND: boolean;                // Do Not Disturb
    isLinenDue: boolean;           // Long stay — linen change due
    specialRequest?: string;       // Guest special requests from reservation
    guestName?: string;            // Current in-house / arriving guest
    reservationStatus?: string;    // in-house | arriving | stayover | vacant
    checkInDate?: string;          // For linen-due calculation
    nightsInHouse?: number;        // How long the current guest has been in
}

const API_BASE = getApiBaseUrl();

// ─── Helpers ────────────────────────────────────────────────────────────────

const minutesUntilArrival = (checkIn: string): number => {
    // checkIn is a date string like "2026-10-28"
    const now = new Date();
    const arrivalMidnight = new Date(checkIn + 'T14:00:00'); // assume 2 PM standard arrival
    return Math.floor((arrivalMidnight.getTime() - now.getTime()) / 60000);
};

const nightsSince = (checkInDate: string): number => {
    const ci = new Date(checkInDate);
    const now = new Date();
    return Math.floor((now.getTime() - ci.getTime()) / 86400000);
};

// ─── SOP Checklist Standard Items ───────────────────────────────────────────
const SOP_ITEMS = [
    { key: 'linen', label: 'Bedding & Linen', desc: 'Fresh crisp sheets, mattress taut, duvet fluffed, pillow protectors clean' },
    { key: 'bathroom', label: 'Bathroom Sanitation', desc: 'Commode & bidet disinfected, tiles wiped, shower glass & chrome polished' },
    { key: 'amenities', label: 'Toiletries & Towels', desc: 'Bath & hand towels fresh, organic soaps, shampoo, conditioner & lotion restocked' },
    { key: 'hvac', label: 'Climate & Thermostat', desc: 'AC cooling verified at 22°C, return vent spotless, remote controls responsive' },
    { key: 'lighting', label: 'Lighting & Electronics', desc: 'All bulbs operational, bedside master switches & keycard energy slot working' },
    { key: 'cleanliness', label: 'Surfaces & Flooring', desc: 'Wardrobe dusted, desk smudge-free, carpet vacuumed, balcony swept' },
    { key: 'appliances', label: 'TV, Fridge & Safe', desc: 'Samsung smart TV HDMI channels clear, mini-fridge chilled, digital safe unlocked' },
    { key: 'safety', label: 'Safety & Hardware', desc: 'Smoke detector green pulse, main door peephole clear, deadbolt engaging smoothly' }
];

// ─── Main Component ─────────────────────────────────────────────────────────

const HousekeepingGrid = () => {
    const { setActivePage } = useNavigation();
    const settings = useMemo(() => getHousekeepingSettings(), []);
    const housekeepers = useMemo(() => getHousekeepersList(), []);

    const [searchTerm, setSearchTerm] = useState('');
    const [filterFloor, setFilterFloor] = useState('all');
    const [filterStatus, setFilterStatus] = useState('all');
    const [filterPriority, setFilterPriority] = useState('all');
    const [isSyncing, setIsSyncing] = useState(false);
    const [rooms, setRooms] = useState<HousekeepingRoom[]>([]);

    // Bulk select
    const [selectedRooms, setSelectedRooms] = useState<Set<string>>(new Set());
    const [bulkStatus, setBulkStatus] = useState<HousekeepingRoom['status']>('clean');
    const [showBulkBar, setShowBulkBar] = useState(false);

    // Inspection Modal Navigation & Tab
    const [selectedRoomForModal, setSelectedRoomForModal] = useState<HousekeepingRoom | null>(null);
    const [modalActiveTab, setModalActiveTab] = useState<'status' | 'sop' | 'minibar' | 'discrepancy'>('status');
    const [modalStatus, setModalStatus] = useState<HousekeepingRoom['status']>('clean');
    const [modalAssignedTo, setModalAssignedTo] = useState<string>('');
    const [modalPriority, setModalPriority] = useState<'rush' | 'high' | 'normal' | 'low'>('normal');
    const [modalNotes, setModalNotes] = useState<string>('');
    const [modalDND, setModalDND] = useState(false);

    // SOP Inspection Checks state
    const [sopChecks, setSopChecks] = useState<Record<string, boolean>>({
        linen: true, bathroom: true, amenities: true, hvac: true,
        lighting: true, cleanliness: true, appliances: true, safety: true
    });

    // 1-Click Defect Escalation Form (inside SOP Tab)
    const [isDefectFormOpen, setIsDefectFormOpen] = useState(false);
    const [defectTitle, setDefectTitle] = useState('');
    const [defectPriority, setDefectPriority] = useState<MaintenanceTask['priority']>('medium');
    const [defectDesc, setDefectDesc] = useState('');
    const [defectAlsoMarkOOO, setDefectAlsoMarkOOO] = useState(false);

    // Minibar Folio Billing state
    const [minibarQuantities, setMinibarQuantities] = useState<Record<string, number>>({});
    const [isPostingMinibar, setIsPostingMinibar] = useState(false);

    // Room Discrepancies state & forms
    const [discrepancies, setDiscrepancies] = useState<RoomDiscrepancy[]>(() => getStoredDiscrepancies());
    const [selectedDiscrepancyForResolve, setSelectedDiscrepancyForResolve] = useState<RoomDiscrepancy | null>(null);
    const [discrepancyResolveNotes, setDiscrepancyResolveNotes] = useState('');
    const [discType, setDiscType] = useState<DiscrepancyType>('Sleep Discrepancy');
    const [discObservation, setDiscObservation] = useState('');

    // Printable Daily Housekeeper Maid Worksheet modal
    const [isWorksheetOpen, setIsWorksheetOpen] = useState(false);
    const [worksheetHousekeeper, setWorksheetHousekeeper] = useState('all');
    const [worksheetFloor, setWorksheetFloor] = useState('all');
    const [worksheetShift, setWorksheetShift] = useState('Morning Shift (08:00 - 16:00)');
    const [worksheetStatusFilter, setWorksheetStatusFilter] = useState<'all' | 'dirty_only'>('all');

    // Maintenance / Out of Order Modal
    const [isOooModalOpen, setIsOooModalOpen] = useState(false);
    const [oooInitialRoom, setOooInitialRoom] = useState<string | undefined>(undefined);

    // Quick Lost & Found Logging
    const [isQuickLostModalOpen, setIsQuickLostModalOpen] = useState(false);
    const [quickLostItemName, setQuickLostItemName] = useState('');
    const [quickLostDescription, setQuickLostDescription] = useState('');
    const [quickLostIsValuable, setQuickLostIsValuable] = useState(false);

    const [toastMessage, setToastMessage] = useState<string | null>(null);

    const showToast = (msg: string) => {
        setToastMessage(msg);
        setTimeout(() => setToastMessage(null), 3500);
    };

    // ── Derive housekeeper name list ─────────────────────────────────────────
    const housekeeperNames = useMemo(() => {
        const fromSettings = housekeepers.map(h => h.name);
        if (fromSettings.length > 0) return fromSettings;
        return ['Fatima Begum', 'Rahima Khatun', 'Salma Akter', 'Akhtar Hossain', 'Duty Housekeeping Team'];
    }, [housekeepers]);

    const defaultAssignee = housekeeperNames[0] || 'Unassigned';

    // ── Open modal ────────────────────────────────────────────────────────────
    const openInspectionModal = (room: HousekeepingRoom) => {
        setSelectedRoomForModal(room);
        setModalStatus(room.status);
        setModalAssignedTo(room.assignedTo || defaultAssignee);
        setModalPriority(room.priority);
        setModalNotes(room.notes || '');
        setModalDND(room.isDND);
        setModalActiveTab('status');
        setIsDefectFormOpen(false);
        setDefectTitle('');
        setDefectDesc('');
        setDefectAlsoMarkOOO(false);
        setMinibarQuantities({});
        setDiscType('Sleep Discrepancy');
        setDiscObservation('');
        const isCleanOrInspected = room.status === 'clean' || room.status === 'inspected';
        setSopChecks({
            linen: isCleanOrInspected,
            bathroom: isCleanOrInspected,
            amenities: isCleanOrInspected,
            hvac: isCleanOrInspected,
            lighting: isCleanOrInspected,
            cleanliness: isCleanOrInspected,
            appliances: isCleanOrInspected,
            safety: isCleanOrInspected
        });
    };

    // ── Save modal ───────────────────────────────────────────────────────────
    const handleSaveModal = async () => {
        if (!selectedRoomForModal) return;
        const roomNumber = selectedRoomForModal.roomNumber;

        setRooms(prev => prev.map(r => {
            if (r.roomNumber === roomNumber) {
                return {
                    ...r,
                    status: modalStatus,
                    assignedTo: modalAssignedTo,
                    priority: modalPriority,
                    notes: modalNotes,
                    isDND: modalDND,
                    lastCleaned: (modalStatus === 'clean' || modalStatus === 'inspected')
                        ? new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                        : r.lastCleaned
                };
            }
            return r;
        }));

        try {
            const titleCase = modalStatus === 'dirty' ? 'Dirty' : modalStatus === 'inspected' ? 'Inspected' : modalStatus === 'out-of-order' ? 'Dirty' : 'Clean';
            await updateRoomHousekeepingInDB(roomNumber, titleCase);

            const broadcastPayload = {
                type: 'ROOM_STATUS_CHANGED' as any,
                roomNo: roomNumber,
                hkStatus: modalStatus
            };
            broadcastPMSEvent(broadcastPayload);
            dispatchPMSNetworkEvent(broadcastPayload);
        } catch (e) {
            console.warn('Failed to sync housekeeping modal changes:', e);
        }

        showToast(`Room ${roomNumber} updated & synced to database.`);
        setSelectedRoomForModal(null);
    };

    // ── Defect Escalation to Maintenance ──────────────────────────────────────
    const handleDispatchDefect = () => {
        if (!selectedRoomForModal) return;
        if (!defectTitle.trim()) {
            showToast('Please enter defect title or select a preset');
            return;
        }

        const newTask = createMaintenanceTask({
            title: defectTitle.trim(),
            room: selectedRoomForModal.roomNumber,
            priority: defectPriority,
            description: defectDesc.trim() || `Reported during SOP inspection of Room ${selectedRoomForModal.roomNumber}`,
            source: 'inspection',
            reportedBy: modalAssignedTo || 'Housekeeper'
        });

        if (defectAlsoMarkOOO) {
            setModalStatus('out-of-order');
        }

        showToast(`Work Order #${newTask.id} created for Room ${selectedRoomForModal.roomNumber}`);
        setIsDefectFormOpen(false);
        setDefectTitle('');
        setDefectDesc('');
    };

    // ── Minibar Direct Folio Billing ──────────────────────────────────────────
    const handlePostMinibarBilling = async () => {
        if (!selectedRoomForModal) return;
        const items: MinibarConsumptionItem[] = Object.entries(minibarQuantities)
            .filter(([_, qty]) => qty > 0)
            .map(([id, qty]) => {
                const product = STANDARD_MINIBAR_CATALOG.find(p => p.id === id)!;
                return {
                    productId: id,
                    name: product.name,
                    quantity: qty,
                    unitPrice: product.unitPrice,
                    subtotal: product.unitPrice * qty
                };
            });

        if (items.length === 0) {
            showToast('Please select at least 1 minibar item with quantity > 0');
            return;
        }

        setIsPostingMinibar(true);
        try {
            const res = await postMinibarToFolio(selectedRoomForModal.roomNumber, items, modalAssignedTo);
            if (res.success) {
                showToast(`৳${res.total} BDT Minibar charged to Room ${selectedRoomForModal.roomNumber} folio!`);
                setMinibarQuantities({});
            } else {
                showToast(res.message);
            }
        } finally {
            setIsPostingMinibar(false);
        }
    };

    // ── Flag Room Discrepancy ─────────────────────────────────────────────────
    const handleFlagDiscrepancy = () => {
        if (!selectedRoomForModal) return;
        if (!discObservation.trim()) {
            showToast('Please enter observation notes describing physical room condition');
            return;
        }

        const frontDeskDesc = selectedRoomForModal.guestName 
            ? `Occupied (${selectedRoomForModal.guestName})` 
            : 'Vacant in PMS';

        flagRoomDiscrepancy({
            roomNumber: selectedRoomForModal.roomNumber,
            discrepancyType: discType,
            frontDeskStatus: frontDeskDesc,
            housekeepingFound: discObservation.trim(),
            guestName: selectedRoomForModal.guestName,
            reportedBy: modalAssignedTo || 'Housekeeper',
            notes: `Discrepancy flagged during Housekeeping turnover inspection.`
        });

        setDiscrepancies(getStoredDiscrepancies());
        showToast(`Discrepancy flagged for Room ${selectedRoomForModal.roomNumber}. Front Desk notified.`);
        setDiscObservation('');
    };

    // ── Resolve Room Discrepancy ──────────────────────────────────────────────
    const handleResolveDiscrepancy = () => {
        if (!selectedDiscrepancyForResolve) return;
        resolveRoomDiscrepancy(
            selectedDiscrepancyForResolve.id,
            'Housekeeping Supervisor',
            discrepancyResolveNotes.trim() || 'Physical inspection reconciled with Front Desk registry.'
        );
        setDiscrepancies(getStoredDiscrepancies());
        showToast(`Discrepancy #${selectedDiscrepancyForResolve.id} resolved.`);
        setSelectedDiscrepancyForResolve(null);
        setDiscrepancyResolveNotes('');
    };

    // ── Status map ───────────────────────────────────────────────────────────
    const mapStatus = (status: string): HousekeepingRoom['status'] => {
        const s = (status || '').toLowerCase();
        if (s === 'ooo' || s === 'out-of-order' || s === 'out_of_order') return 'out-of-order';
        if (s === 'dirty') return 'dirty';
        if (s === 'inspected') return 'inspected';
        return 'clean';
    };

    // ── Fetch rooms ──────────────────────────────────────────────────────────
    const fetchRooms = useCallback(async () => {
        setIsSyncing(true);
        const storedRes = getAllStoredReservations();
        const opDate = getOperatingSystemDate();
        const rushMinutes = settings.rushRoomAlertMinutes ?? 60;

        const getRoomReservationInfo = (roomNum: string) => {
            // Active reservation: checked in or arriving today
            const active = storedRes.find(res => {
                const rawStatus = String(res.status || '').toLowerCase().replace(/_/g, '-');
                if (['cancelled', 'void', 'checked-out', 'completed'].includes(rawStatus)) return false;
                const matches =
                    String(res.roomNumber) === roomNum ||
                    String(res.roomNo) === roomNum ||
                    (Array.isArray(res.allocatedRooms) && res.allocatedRooms.some((x: any) => String(x) === roomNum)) ||
                    (Array.isArray(res.roomsList) && res.roomsList.some((rm: any) => String(rm.roomNumber) === roomNum)) ||
                    (Array.isArray(res.groupRoomsList) && res.groupRoomsList.some((rm: any) => String(rm.roomNumber) === roomNum));
                if (!matches) return false;
                const checkIn = String(res.checkIn || res.arrivalDate || '');
                const checkOut = String(res.checkOut || res.departureDate || '');
                return (checkIn <= opDate && checkOut > opDate) || checkIn === opDate;
            });

            if (active) {
                const rawStatus = String(active.status || '').toLowerCase();
                const isInHouse = rawStatus === 'in-house' || rawStatus === 'arrived';
                const checkInDate = String(active.checkIn || active.arrivalDate || '');
                const nights = checkInDate ? nightsSince(checkInDate) : 0;
                const minsUntil = !isInHouse && checkInDate ? minutesUntilArrival(checkInDate) : Infinity;
                const isRush = !isInHouse && minsUntil >= 0 && minsUntil <= rushMinutes;
                const linenDue = isInHouse && checkInDate ? isLinenChangeDue(checkInDate, opDate, settings.linenChangeFrequencyDays || 3) : false;
                const isDND = String(active.notes || active.specialRequests || '').toLowerCase().includes('dnd') ||
                    String(active.notes || active.specialRequests || '').toLowerCase().includes('do not disturb');

                return {
                    guestName: active.guestName || 'Guest',
                    reservationStatus: isInHouse ? 'in-house' : 'arriving',
                    specialRequest: active.specialRequests || active.guestRequests || undefined,
                    checkInDate,
                    nightsInHouse: nights,
                    isRush,
                    isLinenDue: linenDue,
                    isDND,
                    note: isInHouse ? `In-House: ${active.guestName}` : `Arrival Today: ${active.guestName}`
                };
            }

            // Upcoming
            const upcoming = storedRes.find(res => {
                const rawStatus = String(res.status || '').toLowerCase().replace(/_/g, '-');
                if (['cancelled', 'void', 'checked-out', 'completed'].includes(rawStatus)) return false;
                const matches =
                    String(res.roomNumber) === roomNum ||
                    String(res.roomNo) === roomNum ||
                    (Array.isArray(res.allocatedRooms) && res.allocatedRooms.some((x: any) => String(x) === roomNum)) ||
                    (Array.isArray(res.roomsList) && res.roomsList.some((rm: any) => String(rm.roomNumber) === roomNum)) ||
                    (Array.isArray(res.groupRoomsList) && res.groupRoomsList.some((rm: any) => String(rm.roomNumber) === roomNum));
                if (!matches) return false;
                const checkIn = String(res.checkIn || res.arrivalDate || '');
                return checkIn > opDate;
            });

            if (upcoming) {
                const dateLabel = (upcoming.checkIn || upcoming.arrivalDate)?.slice(5);
                return {
                    guestName: upcoming.guestName || 'Guest',
                    reservationStatus: 'upcoming',
                    specialRequest: upcoming.specialRequests || undefined,
                    checkInDate: upcoming.checkIn || upcoming.arrivalDate || '',
                    nightsInHouse: 0,
                    isRush: false,
                    isLinenDue: false,
                    isDND: false,
                    note: `Upcoming (${dateLabel}): ${upcoming.guestName}`
                };
            }

            return null;
        };

        const getDefaultHousekeeper = (floor: number | string, idx: number): string => {
            // Prefer housekeeper assigned to that floor zone from settings
            const floorNum = Number(floor);
            const zoneHk = housekeepers.find(h =>
                h.assignedZone && (h.assignedZone.toLowerCase().includes(`floor ${floorNum}`) || h.assignedZone.includes(String(floorNum)))
            );
            if (zoneHk) return zoneHk.name;
            return housekeeperNames[idx % housekeeperNames.length] || defaultAssignee;
        };

        try {
            const res = await fetch(`${API_BASE}/api/rooms`, { headers: { 'x-property-id': '1' } });
            const json = await res.json();
            if (json.success && Array.isArray(json.data) && json.data.length > 0) {
                const mapped: HousekeepingRoom[] = json.data.map((r: any, idx: number) => {
                    const rNum = String(r.roomNo || r.room_number || r.number);
                    const info = getRoomReservationInfo(rNum);
                    const hkStatus = mapStatus(r.hkStatus);
                    return {
                        id: r.id,
                        roomNumber: rNum,
                        floor: Number(r.floor) || 1,
                        roomType: r.roomType || 'Standard Room',
                        status: hkStatus,
                        assignedTo: getDefaultHousekeeper(r.floor || 1, idx),
                        priority: info?.isRush ? 'rush' : (hkStatus === 'dirty' ? 'high' : 'normal'),
                        lastCleaned: r.hkStatus === 'clean' || r.hkStatus === 'Clean' ? '10:30 AM' : undefined,
                        notes: info?.note || (r.foStatus === 'occupied' ? 'In-House Guest' : r.foStatus === 'due_out' ? 'Departure Today' : undefined),
                        isRush: info?.isRush ?? false,
                        isDND: info?.isDND ?? false,
                        isLinenDue: info?.isLinenDue ?? false,
                        specialRequest: info?.specialRequest,
                        guestName: info?.guestName,
                        reservationStatus: info?.reservationStatus || 'vacant',
                        checkInDate: info?.checkInDate,
                        nightsInHouse: info?.nightsInHouse ?? 0,
                    };
                });
                setRooms(mapped);
                setIsSyncing(false);
                return;
            }
        } catch (err) {
            console.warn('Backend rooms fetch error, falling back to canonical:', err);
        }

        // Fallback to local canonical rooms
        const canonical = getCanonicalRooms();
        const fallback: HousekeepingRoom[] = canonical.map((r, idx) => {
            const info = getRoomReservationInfo(r.number);
            const hkStatus = mapStatus(r.housekeepingStatus);
            return {
                id: r.id,
                roomNumber: r.number,
                floor: parseInt(r.floorId, 10) || 1,
                roomType: r.roomTypeName || 'Standard Room',
                status: hkStatus,
                assignedTo: getDefaultHousekeeper(r.floorId, idx),
                priority: info?.isRush ? 'rush' : (hkStatus === 'dirty' ? 'high' : 'normal'),
                notes: info?.note,
                isRush: info?.isRush ?? false,
                isDND: info?.isDND ?? false,
                isLinenDue: info?.isLinenDue ?? false,
                specialRequest: info?.specialRequest,
                guestName: info?.guestName,
                reservationStatus: info?.reservationStatus || 'vacant',
                checkInDate: info?.checkInDate,
                nightsInHouse: info?.nightsInHouse ?? 0,
            };
        });
        setRooms(fallback);
        setIsSyncing(false);
    }, [settings, housekeepers, housekeeperNames, defaultAssignee]);

    useEffect(() => {
        fetchRooms();
        const handleDiscrepanciesUpdate = () => {
            setDiscrepancies(getStoredDiscrepancies());
        };
        window.addEventListener('pms_discrepancy_updated', handleDiscrepanciesUpdate);

        const unsubscribe = subscribeToPMSEvents((msg) => {
            if (msg.type === 'INVENTORY_REFRESH') {
                fetchRooms();
            } else if ((msg as any).type === 'ROOM_STATUS_CHANGED') {
                const eventMsg = msg as any;
                setRooms(prev => prev.map(r => {
                    if (r.roomNumber === String(eventMsg.roomNo)) {
                        return { ...r, status: mapStatus(eventMsg.hkStatus) };
                    }
                    return r;
                }));
            }
        });
        return () => {
            unsubscribe();
            window.removeEventListener('pms_discrepancy_updated', handleDiscrepanciesUpdate);
        };
    }, [fetchRooms]);

    // ── Derived data ─────────────────────────────────────────────────────────
    const uniqueFloors = useMemo(() =>
        Array.from(new Set(rooms.map(r => r.floor))).sort((a, b) => a - b),
        [rooms]
    );

    const activeDiscrepancies = useMemo(() =>
        discrepancies.filter(d => d.status === 'active' || d.status === 'investigating'),
        [discrepancies]
    );

    const filteredRooms = useMemo(() => rooms.filter(room => {
        const matchesSearch =
            room.roomNumber.includes(searchTerm) ||
            (room.assignedTo?.toLowerCase().includes(searchTerm.toLowerCase()) ?? false) ||
            (room.guestName?.toLowerCase().includes(searchTerm.toLowerCase()) ?? false);
        const matchesFloor = filterFloor === 'all' || room.floor.toString() === filterFloor;
        const matchesStatus = filterStatus === 'all'
            ? true
            : filterStatus === 'discrepancy'
            ? activeDiscrepancies.some(d => d.roomNumber === room.roomNumber)
            : room.status === filterStatus;
        const matchesPriority = filterPriority === 'all' || room.priority === filterPriority;
        return matchesSearch && matchesFloor && matchesStatus && matchesPriority;
    }), [rooms, searchTerm, filterFloor, filterStatus, filterPriority, activeDiscrepancies]);

    const stats = useMemo(() => ({
        total: rooms.length,
        dirty: rooms.filter(r => r.status === 'dirty').length,
        clean: rooms.filter(r => r.status === 'clean').length,
        inspected: rooms.filter(r => r.status === 'inspected').length,
        outOfOrder: rooms.filter(r => r.status === 'out-of-order').length,
        rush: rooms.filter(r => r.isRush).length,
        dnd: rooms.filter(r => r.isDND).length,
        linenDue: rooms.filter(r => r.isLinenDue).length,
        discrepancies: activeDiscrepancies.length,
    }), [rooms, activeDiscrepancies]);

    // ── Cycle status (with safe OOO check) ──────────────────────────────────
    const cycleStatus = async (roomNumber: string) => {
        const target = rooms.find(r => r.roomNumber === roomNumber);
        if (!target) return;

        // If room is Out of Order, prevent silent cycle and prompt official unlock
        if (target.status === 'out-of-order') {
            if (window.confirm(`Room ${roomNumber} is currently Out of Order. Unlock and release to Housekeeping as Clean?`)) {
                setRooms(prev => prev.map(r => r.roomNumber === roomNumber ? { ...r, status: 'clean' } : r));
                try {
                    await updateRoomHousekeepingInDB(roomNumber, 'Clean');
                    const payload = { type: 'ROOM_STATUS_CHANGED' as any, roomNo: roomNumber, hkStatus: 'clean' };
                    broadcastPMSEvent(payload);
                    dispatchPMSNetworkEvent(payload);
                    showToast(`Room ${roomNumber} unlocked and restored to Clean.`);
                } catch (err) {
                    console.warn(err);
                }
            }
            return;
        }

        // If room is Inspected, ask before placing into Out of Order
        if (target.status === 'inspected') {
            setOooInitialRoom(roomNumber);
            setIsOooModalOpen(true);
            return;
        }

        const next: Record<HousekeepingRoom['status'], HousekeepingRoom['status']> = {
            dirty: 'clean', clean: 'inspected', inspected: 'out-of-order', 'out-of-order': 'dirty'
        };
        const newStatus = next[target.status];
        setRooms(prev => prev.map(r => r.roomNumber === roomNumber ? { ...r, status: newStatus } : r));
        try {
            const titleCase = newStatus === 'dirty' ? 'Dirty' : newStatus === 'inspected' ? 'Inspected' : 'Clean';
            await updateRoomHousekeepingInDB(roomNumber, titleCase);
            const payload = { type: 'ROOM_STATUS_CHANGED' as any, roomNo: roomNumber, hkStatus: newStatus };
            broadcastPMSEvent(payload);
            dispatchPMSNetworkEvent(payload);
        } catch (err) {
            console.warn('Failed to patch housekeeping status to DB:', err);
        }
    };

    // ── Mark All Dirty as Clean (eZee / YCS PMS standard) ─────────────────────
    const handleMarkAllDirtyAsClean = async () => {
        const dirtyRooms = rooms.filter(r => r.status === 'dirty');
        if (dirtyRooms.length === 0) {
            showToast('All rooms are already clean or inspected!');
            return;
        }
        if (!window.confirm(`Are you sure you want to set the housekeeping status to "Clean" for all ${dirtyRooms.length} dirty rooms?`)) {
            return;
        }

        // Optimistic UI update
        const nowTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        setRooms(prev => prev.map(r => r.status === 'dirty' ? { ...r, status: 'clean', lastCleaned: nowTime } : r));

        // Persist to Relational DB and Broadcast
        await Promise.allSettled(dirtyRooms.map(async r => {
            try {
                await updateRoomHousekeepingInDB(r.roomNumber, 'Clean');
                const payload = { type: 'ROOM_STATUS_CHANGED' as any, roomNo: r.roomNumber, hkStatus: 'clean' };
                broadcastPMSEvent(payload);
                dispatchPMSNetworkEvent(payload);
            } catch (err) {
                console.warn(`Failed to update room ${r.roomNumber}`, err);
            }
        }));

        showToast(`Successfully marked all ${dirtyRooms.length} dirty rooms as Clean.`);
    };

    // ── Select All Dirty Rooms (Quick bulk filter) ───────────────────────────
    const handleSelectAllDirty = () => {
        const dirtyIds = rooms.filter(r => r.status === 'dirty').map(r => r.roomNumber);
        if (dirtyIds.length === 0) {
            showToast('No rooms currently dirty.');
            return;
        }
        setSelectedRooms(new Set(dirtyIds));
        setBulkStatus('clean');
        setShowBulkBar(true);
    };

    // ── Bulk update ──────────────────────────────────────────────────────────
    const handleBulkUpdate = async () => {
        if (selectedRooms.size === 0) return;
        const toUpdate = Array.from(selectedRooms);
        setRooms(prev => prev.map(r =>
            toUpdate.includes(r.roomNumber) ? { ...r, status: bulkStatus } : r
        ));
        await Promise.allSettled(toUpdate.map(async rn => {
            try {
                const titleCase = bulkStatus === 'dirty' ? 'Dirty' : bulkStatus === 'inspected' ? 'Inspected' : 'Clean';
                await updateRoomHousekeepingInDB(rn, titleCase);
                const payload = { type: 'ROOM_STATUS_CHANGED' as any, roomNo: rn, hkStatus: bulkStatus };
                broadcastPMSEvent(payload);
                dispatchPMSNetworkEvent(payload);
            } catch { /* individual failures are non-critical */ }
        }));
        showToast(`${toUpdate.length} rooms marked as ${bulkStatus}.`);
        setSelectedRooms(new Set());
        setShowBulkBar(false);
    };

    // ── Auto-Assign ──────────────────────────────────────────────────────────
    const handleAutoAssign = () => {
        if (housekeeperNames.length === 0) {
            showToast('No housekeepers configured. Add them in General Settings → Housekeeping.');
            return;
        }
        // Distribute dirty rooms by floor zone, round-robin over available housekeepers
        let hkIdx = 0;
        setRooms(prev => prev.map(r => {
            if (r.status !== 'dirty') return r;
            // Try floor-zone match first
            const floorHk = housekeepers.find(h =>
                h.assignedZone && (h.assignedZone.toLowerCase().includes(`floor ${r.floor}`) || h.assignedZone.includes(String(r.floor)))
            );
            if (floorHk) return { ...r, assignedTo: floorHk.name };
            // Round-robin
            const assigned = housekeeperNames[hkIdx % housekeeperNames.length];
            hkIdx++;
            return { ...r, assignedTo: assigned };
        }));
        showToast(`Auto-assigned ${stats.dirty} dirty rooms to ${housekeeperNames.length} housekeepers.`);
    };

    // ── Checkbox helpers ─────────────────────────────────────────────────────
    const toggleSelect = (roomNumber: string) => {
        setSelectedRooms(prev => {
            const next = new Set(prev);
            next.has(roomNumber) ? next.delete(roomNumber) : next.add(roomNumber);
            return next;
        });
    };

    const toggleSelectAll = () => {
        if (selectedRooms.size === filteredRooms.length) {
            setSelectedRooms(new Set());
        } else {
            setSelectedRooms(new Set(filteredRooms.map(r => r.roomNumber)));
        }
    };

    // ── Status styles ────────────────────────────────────────────────────────
    const getStatusStyle = (status: HousekeepingRoom['status']) => {
        switch (status) {
            case 'dirty': return 'bg-rose-50 text-rose-700 border-rose-200';
            case 'clean': return 'bg-emerald-50 text-emerald-700 border-emerald-200';
            case 'inspected': return 'bg-amber-50 text-amber-700 border-amber-200';
            case 'out-of-order': return 'bg-gray-100 text-gray-700 border-gray-200';
        }
    };

    const getStatusIcon = (status: HousekeepingRoom['status']) => {
        switch (status) {
            case 'dirty': return <BedDouble size={12} className="text-rose-700" />;
            case 'clean': return <Sparkles size={12} className="text-emerald-700" />;
            case 'inspected': return <CheckCircle2 size={12} className="text-amber-700" />;
            case 'out-of-order': return <XCircle size={12} className="text-gray-700" />;
        }
    };

    const getPriorityBadge = (room: HousekeepingRoom) => {
        if (room.isRush) {
            return (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] bg-red-600 text-white border border-red-700 font-bold animate-pulse">
                    <Zap size={9} /> RUSH
                </span>
            );
        }
        if (room.priority === 'high') {
            return <span className="px-2 py-0.5 rounded-full text-[10px] bg-rose-50 text-rose-700 border border-rose-200 font-bold">High</span>;
        }
        if (room.priority === 'low') {
            return <span className="px-2 py-0.5 rounded-full text-[10px] bg-slate-100 text-slate-500 border border-slate-200">Low</span>;
        }
        return <span className="px-2 py-0.5 rounded-full text-[10px] bg-slate-100 text-slate-600 border border-slate-200">Normal</span>;
    };

    // ─────────────────────────────────────────────────────────────────────────
    return (
        <div className="page-container">
            <PageHeader
                title="Housekeeping & Room Turnover"
                subtitle="Live room cleanliness states, supervisor inspections & real-time front-desk sync"
                icon={<Sparkles size={20} />}
                badge={
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] bg-rose-50 text-rose-700 border border-rose-200">
                        {stats.dirty} Pending
                    </span>
                }
                actions={
                    <div className="flex items-center gap-2">
                        <button
                            type="button"
                            onClick={handleMarkAllDirtyAsClean}
                            disabled={stats.dirty === 0}
                            className="btn-secondary flex items-center gap-1.5 text-emerald-700 hover:text-emerald-800 hover:bg-emerald-50 border-emerald-200 disabled:opacity-40 cursor-pointer"
                            title="Set housekeeping status for all dirty rooms to Clean in 1 click (eZee PMS standard)"
                        >
                            <CheckCircle2 size={13} className="text-emerald-600" />
                            <span>Mark All Clean ({stats.dirty})</span>
                        </button>
                        <button
                            type="button"
                            onClick={handleAutoAssign}
                            className="btn-secondary flex items-center gap-1.5 cursor-pointer"
                            title="Auto-assign dirty rooms to housekeepers by floor zone"
                        >
                            <UserCheck size={13} className="text-primary" />
                            <span>Auto-Assign</span>
                        </button>
                        <button
                            type="button"
                            onClick={() => {
                                setOooInitialRoom(undefined);
                                setIsOooModalOpen(true);
                            }}
                            className={`btn-secondary flex items-center gap-1.5 cursor-pointer ${stats.outOfOrder > 0 ? 'text-rose-700 border-rose-200 bg-rose-50/50' : ''}`}
                            title="Manage Out of Order & Out of Service Maintenance Blocks"
                        >
                            <Wrench size={13} className="text-rose-600" />
                            <span>Maintenance {stats.outOfOrder > 0 && `(${stats.outOfOrder})`}</span>
                        </button>
                        <button
                            type="button"
                            onClick={() => setActivePage('lost-and-found')}
                            className="btn-secondary flex items-center gap-1.5 cursor-pointer text-slate-700 hover:text-blue-700"
                            title="Open Lost & Found Registry (AHLA/Opera Cloud Standard)"
                        >
                            <PackageSearch size={13} className="text-amber-600" />
                            <span>Lost & Found</span>
                        </button>
                        <button
                            type="button"
                            onClick={() => setIsWorksheetOpen(true)}
                            className="btn-secondary flex items-center gap-1.5 cursor-pointer text-slate-700 hover:text-indigo-700"
                            title="Print Daily Housekeeper Assignment Worksheets (Enterprise SOP)"
                        >
                            <Printer size={13} className="text-indigo-600" />
                            <span>Maid Worksheet</span>
                        </button>
                        <button
                            type="button"
                            onClick={() => setShowBulkBar(v => !v)}
                            className={`btn-secondary flex items-center gap-1.5 cursor-pointer ${showBulkBar ? 'ring-1 ring-primary' : ''}`}
                        >
                            <Layers size={13} className="text-slate-400" />
                            <span>Bulk Update</span>
                        </button>
                        <button
                            type="button"
                            onClick={fetchRooms}
                            title="Reload canonical room states from database"
                            className="btn-secondary cursor-pointer"
                        >
                            <RefreshCw size={13} className={isSyncing ? 'animate-spin text-primary' : 'text-slate-400'} />
                            <span>Sync</span>
                        </button>
                    </div>
                }
            />

            {/* ── KPI Cards ──────────────────────────────────────────────── */}
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 lg:grid-cols-9 gap-3">
                {[
                    { label: 'Total', value: stats.total, sub: 'All rooms', color: 'text-slate-900', bg: 'bg-primary-subtle text-primary', icon: <BedDouble size={15} /> },
                    { label: 'Dirty', value: stats.dirty, sub: 'Needs cleaning', color: 'text-rose-600', bg: 'bg-rose-50 text-rose-600', icon: <AlertCircle size={15} /> },
                    { label: 'Clean', value: stats.clean, sub: 'Ready', color: 'text-emerald-600', bg: 'bg-emerald-50 text-emerald-600', icon: <Sparkles size={15} /> },
                    { label: 'Inspected', value: stats.inspected, sub: 'Verified', color: 'text-amber-600', bg: 'bg-amber-50 text-amber-600', icon: <CheckCircle2 size={15} /> },
                    { label: 'OOO', value: stats.outOfOrder, sub: 'Blocked', color: 'text-slate-700', bg: 'bg-slate-100 text-slate-600', icon: <XCircle size={15} /> },
                    { label: 'Rush', value: stats.rush, sub: 'Imminent arrival', color: 'text-red-600', bg: 'bg-red-50 text-red-600', icon: <Zap size={15} /> },
                    { label: 'DND', value: stats.dnd, sub: 'Do Not Disturb', color: 'text-violet-600', bg: 'bg-violet-50 text-violet-600', icon: <ShieldAlert size={15} /> },
                    { label: 'Linen Due', value: stats.linenDue, sub: 'Long stay', color: 'text-sky-600', bg: 'bg-sky-50 text-sky-600', icon: <Coffee size={15} /> },
                    { label: 'Discrepancy', value: stats.discrepancies, sub: 'Audit mismatch', color: stats.discrepancies > 0 ? 'text-rose-600 font-bold' : 'text-slate-600', bg: stats.discrepancies > 0 ? 'bg-rose-100 text-rose-700 animate-pulse' : 'bg-slate-100 text-slate-500', icon: <AlertTriangle size={15} /> },
                ].map(kpi => (
                    <div key={kpi.label} className="kpi-card !py-3">
                        <div className="flex-1 min-w-0">
                            <p className="text-[10px] text-slate-400 uppercase tracking-wider truncate">{kpi.label}</p>
                            <p className={`text-xl font-bold mt-0.5 ${kpi.color}`}>{kpi.value}</p>
                            <p className="text-[10px] text-slate-400 mt-0.5 truncate">{kpi.sub}</p>
                        </div>
                        <div className={`size-8 rounded-xl flex items-center justify-center shrink-0 ${kpi.bg}`}>
                            {kpi.icon}
                        </div>
                    </div>
                ))}
            </div>

            {/* ── Bulk Action Bar ─────────────────────────────────────────── */}
            {showBulkBar && (
                <div className="card-container !p-3 flex items-center gap-3 flex-wrap bg-blue-50/60 border-blue-200">
                    <span className="text-xs font-semibold text-blue-800 flex items-center gap-1.5">
                        <Layers size={13} /> Bulk Update Mode
                    </span>
                    <button
                        type="button"
                        onClick={handleSelectAllDirty}
                        className="text-xs text-indigo-700 hover:underline font-bold flex items-center gap-1 cursor-pointer"
                        title="Click to automatically check all dirty rooms"
                    >
                        <BedDouble size={12} />
                        Select All Dirty ({stats.dirty})
                    </button>
                    <span className="text-xs text-blue-600 font-mono">({selectedRooms.size} room{selectedRooms.size !== 1 ? 's' : ''} selected)</span>
                    <select
                        value={bulkStatus}
                        onChange={e => setBulkStatus(e.target.value as any)}
                        className="select-standard !w-36 !h-8"
                    >
                        <option value="clean">Mark Clean</option>
                        <option value="inspected">Mark Inspected</option>
                        <option value="dirty">Mark Dirty</option>
                        <option value="out-of-order">Mark OOO</option>
                    </select>
                    <button
                        type="button"
                        onClick={handleBulkUpdate}
                        disabled={selectedRooms.size === 0}
                        className="btn-primary !py-1.5 !px-3 !text-xs disabled:opacity-40 cursor-pointer"
                    >
                        Apply to Selected
                    </button>
                    <button
                        type="button"
                        onClick={() => { setSelectedRooms(new Set()); setShowBulkBar(false); }}
                        className="text-xs text-slate-500 hover:text-slate-800 transition-colors ml-auto cursor-pointer"
                    >
                        Cancel
                    </button>
                </div>
            )}

            {/* ── Filter Bar ─────────────────────────────────────────────── */}
            <div className="card-container !p-3.5">
                <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-5 gap-3">
                    <div className="relative flex items-center lg:col-span-2">
                        <Search className="absolute left-3 text-slate-400 pointer-events-none" size={14} />
                        <input
                            type="text"
                            placeholder="Search room, housekeeper, guest..."
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                            className="input-standard pl-9"
                        />
                    </div>
                    <select value={filterFloor} onChange={e => setFilterFloor(e.target.value)} className="select-standard">
                        <option value="all">All Floors</option>
                        {uniqueFloors.map(fl => (
                            <option key={fl} value={fl.toString()}>Floor {fl}</option>
                        ))}
                    </select>
                    <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} className="select-standard">
                        <option value="all">All Statuses</option>
                        <option value="dirty">Dirty</option>
                        <option value="clean">Clean</option>
                        <option value="inspected">Inspected</option>
                        <option value="out-of-order">Out of Order</option>
                        <option value="discrepancy">Discrepancies ({stats.discrepancies})</option>
                    </select>
                    <select value={filterPriority} onChange={e => setFilterPriority(e.target.value)} className="select-standard">
                        <option value="all">All Priorities</option>
                        <option value="rush">Rush Only</option>
                        <option value="high">High</option>
                        <option value="normal">Normal</option>
                        <option value="low">Low</option>
                    </select>
                </div>
            </div>

            {/* ── Housekeeping Table ─────────────────────────────────────── */}
            <div className="table-container">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr>
                                {showBulkBar && (
                                    <th className="w-8 pr-0">
                                        <button
                                            type="button"
                                            onClick={toggleSelectAll}
                                            className="flex items-center justify-center text-slate-500 hover:text-primary cursor-pointer"
                                        >
                                            {selectedRooms.size === filteredRooms.length && filteredRooms.length > 0
                                                ? <CheckSquare size={14} className="text-primary" />
                                                : <Square size={14} />}
                                        </button>
                                    </th>
                                )}
                                <th>Room</th>
                                <th>Type</th>
                                <th>Status</th>
                                <th>Housekeeper</th>
                                <th>Priority</th>
                                <th>Flags</th>
                                <th>Guest / Notes</th>
                                <th>Last Cleaned</th>
                                <th className="text-right">Action</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredRooms.length === 0 ? (
                                <tr>
                                    <td colSpan={showBulkBar ? 10 : 9} className="text-center py-10 text-slate-400 text-xs">
                                        <Filter size={20} className="mx-auto mb-2 text-slate-300" />
                                        No rooms match your current filters
                                    </td>
                                </tr>
                            ) : filteredRooms.map(room => (
                                <tr
                                    key={room.id}
                                    onClick={() => openInspectionModal(room)}
                                    className={`hover:bg-slate-50/80 transition-colors cursor-pointer ${room.isRush ? 'bg-red-50/40' : ''} ${room.isDND ? 'bg-violet-50/30' : ''}`}
                                >
                                    {showBulkBar && (
                                        <td className="pr-0" onClick={e => e.stopPropagation()}>
                                            <button
                                                type="button"
                                                onClick={() => toggleSelect(room.roomNumber)}
                                                className="flex items-center justify-center text-slate-400 hover:text-primary cursor-pointer"
                                            >
                                                {selectedRooms.has(room.roomNumber)
                                                    ? <CheckSquare size={14} className="text-primary" />
                                                    : <Square size={14} />}
                                            </button>
                                        </td>
                                    )}
                                    <td className="text-slate-900 font-bold font-mono">
                                        {room.roomNumber}
                                        {room.floor && (
                                            <span className="text-[9px] text-slate-400 block font-normal">Floor {room.floor}</span>
                                        )}
                                    </td>
                                    <td className="text-slate-600 font-medium">{room.roomType}</td>
                                    <td onClick={e => e.stopPropagation()}>
                                        <button
                                            type="button"
                                            onClick={() => cycleStatus(room.roomNumber)}
                                            className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] border transition-all hover:shadow-2xs cursor-pointer ${getStatusStyle(room.status)}`}
                                            title="Click to cycle status"
                                        >
                                            {getStatusIcon(room.status)}
                                            <span className="capitalize">{room.status === 'out-of-order' ? 'OOO' : room.status}</span>
                                        </button>
                                    </td>
                                    <td>
                                        {room.assignedTo ? (
                                            <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-800">
                                                <Users size={13} className="text-primary shrink-0" />
                                                {room.assignedTo}
                                            </span>
                                        ) : (
                                            <span className="text-xs text-slate-400 italic">Unassigned</span>
                                        )}
                                    </td>
                                    <td>{getPriorityBadge(room)}</td>
                                    <td>
                                        <div className="flex items-center gap-1.5 flex-wrap">
                                            {(() => {
                                                const roomDisc = activeDiscrepancies.find(d => d.roomNumber === room.roomNumber);
                                                if (!roomDisc) return null;
                                                return (
                                                    <button
                                                        type="button"
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            setSelectedDiscrepancyForResolve(roomDisc);
                                                            setDiscrepancyResolveNotes('');
                                                        }}
                                                        className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[9px] bg-red-600 hover:bg-red-700 text-white font-bold animate-pulse cursor-pointer shadow-2xs"
                                                        title={`Audit Discrepancy: ${roomDisc.discrepancyType}. Click to inspect & resolve.`}
                                                    >
                                                        <AlertTriangle size={9} /> DISC
                                                    </button>
                                                );
                                            })()}
                                            {room.isDND && (
                                                <span title="Do Not Disturb" className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[9px] bg-violet-50 text-violet-700 border border-violet-200 font-bold">
                                                    <ShieldAlert size={9} /> DND
                                                </span>
                                            )}
                                            {room.isLinenDue && (
                                                <span title={`Linen change due — ${room.nightsInHouse} nights in house`} className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[9px] bg-sky-50 text-sky-700 border border-sky-200 font-bold">
                                                    <Coffee size={9} /> Linen
                                                </span>
                                            )}
                                            {room.specialRequest && (
                                                <span title={room.specialRequest} className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[9px] bg-amber-50 text-amber-700 border border-amber-200 font-bold">
                                                    <Star size={9} /> Req
                                                </span>
                                            )}
                                        </div>
                                    </td>
                                    <td className="text-slate-500 text-xs max-w-[200px]">
                                        {room.guestName ? (
                                            <div>
                                                <span className={`font-semibold text-[11px] ${room.reservationStatus === 'in-house' ? 'text-emerald-700' : room.reservationStatus === 'arriving' ? 'text-amber-700' : 'text-slate-600'}`}>
                                                    {room.guestName}
                                                </span>
                                                {room.reservationStatus && (
                                                    <span className="block text-[10px] text-slate-400 capitalize">{room.reservationStatus}</span>
                                                )}
                                                {room.specialRequest && (
                                                    <span className="block text-[10px] text-amber-600 truncate" title={room.specialRequest}>
                                                        ★ {room.specialRequest}
                                                    </span>
                                                )}
                                            </div>
                                        ) : room.notes ? (
                                            <span className="flex items-center gap-1 text-amber-700 font-medium">
                                                <AlertCircle size={11} className="shrink-0" />
                                                <span className="truncate">{room.notes}</span>
                                            </span>
                                        ) : (
                                            <span className="text-slate-300 italic">Vacant</span>
                                        )}
                                    </td>
                                    <td className="text-slate-500 text-xs">
                                        {room.lastCleaned ? (
                                            <span className="flex items-center gap-1 font-mono">
                                                <Clock size={11} className="text-slate-400" /> {room.lastCleaned}
                                            </span>
                                        ) : '-'}
                                    </td>
                                    <td className="text-right whitespace-nowrap" onClick={e => e.stopPropagation()}>
                                        <div className="flex items-center justify-end gap-1.5">
                                            <button
                                                type="button"
                                                onClick={() => openInspectionModal(room)}
                                                className="btn-secondary !py-1 !px-2 !text-[11px] flex items-center gap-1"
                                                title="Inspect & Assign Room"
                                            >
                                                <Edit3 size={11} />
                                                <span>Inspect</span>
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => cycleStatus(room.roomNumber)}
                                                className="btn-secondary !py-1 !px-2.5 !text-[11px]"
                                                title="Quick Cycle Status"
                                            >
                                                Cycle
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* ── Toast ──────────────────────────────────────────────────── */}
            {toastMessage && (
                <div className="fixed top-4 right-4 z-50 bg-slate-900 text-white px-3.5 py-2 rounded-lg shadow-lg border border-slate-700 text-xs font-semibold flex items-center gap-2">
                    <CheckCircle2 size={14} className="text-emerald-400" />
                    <span>{toastMessage}</span>
                </div>
            )}

            {/* ── Inspection & Assignment Modal ───────────────────────────── */}
            {selectedRoomForModal && (
                <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 sm:p-6 overflow-y-auto animate-in fade-in duration-150">
                    <div className="bg-white rounded-2xl shadow-2xl border border-slate-200/90 max-w-[760px] w-full overflow-hidden animate-in zoom-in-95 duration-150 my-auto max-h-[92vh] flex flex-col">
                        {/* Header */}
                        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/70 shrink-0">
                            <div className="flex items-center gap-3.5">
                                <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-[#1e3a8a] to-blue-700 text-white flex items-center justify-center font-mono font-bold text-base shadow-sm ring-2 ring-blue-100 shrink-0">
                                    {selectedRoomForModal.roomNumber}
                                </div>
                                <div>
                                    <div className="flex items-center gap-2 flex-wrap">
                                        <h3 className="text-sm font-bold text-slate-900">Room {selectedRoomForModal.roomNumber} — Inspection Hub</h3>
                                        <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-semibold border capitalize ${getStatusStyle(modalStatus)}`}>
                                            {modalStatus === 'out-of-order' ? 'Out of Order' : modalStatus}
                                        </span>
                                        {selectedRoomForModal.isRush && (
                                            <span className="px-2 py-0.5 rounded-full text-[10px] bg-red-600 text-white font-bold flex items-center gap-0.5">
                                                <Zap size={9} /> RUSH
                                            </span>
                                        )}
                                    </div>
                                    <p className="text-xs text-slate-500 font-medium mt-0.5">
                                        Floor {selectedRoomForModal.floor} • {selectedRoomForModal.roomType}
                                        {selectedRoomForModal.guestName && (
                                            <> • <span className="text-emerald-700 font-semibold">{selectedRoomForModal.guestName}</span>
                                                {selectedRoomForModal.nightsInHouse != null && selectedRoomForModal.nightsInHouse > 0 && (
                                                    <> ({selectedRoomForModal.nightsInHouse}N in-house)</>
                                                )}
                                            </>
                                        )}
                                    </p>
                                </div>
                            </div>
                            <button
                                type="button"
                                onClick={() => setSelectedRoomForModal(null)}
                                className="w-8 h-8 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 flex items-center justify-center cursor-pointer transition-colors"
                            >
                                <X size={18} />
                            </button>
                        </div>

                        {/* Navigation Tabs */}
                        <div className="flex border-b border-slate-200 px-6 bg-slate-50/50 gap-4 text-xs font-bold shrink-0 overflow-x-auto">
                            <button
                                type="button"
                                onClick={() => setModalActiveTab('status')}
                                className={`py-3 border-b-2 transition-all cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
                                    modalActiveTab === 'status'
                                        ? 'border-[#1e3a8a] text-[#1e3a8a]'
                                        : 'border-transparent text-slate-500 hover:text-slate-800'
                                }`}
                            >
                                <Sparkles size={14} />
                                Status &amp; Turnover
                            </button>
                            <button
                                type="button"
                                onClick={() => setModalActiveTab('sop')}
                                className={`py-3 border-b-2 transition-all cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
                                    modalActiveTab === 'sop'
                                        ? 'border-[#1e3a8a] text-[#1e3a8a]'
                                        : 'border-transparent text-slate-500 hover:text-slate-800'
                                }`}
                            >
                                <FileCheck size={14} />
                                SOP Inspection
                                <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${
                                    Object.values(sopChecks).filter(Boolean).length === 8
                                        ? 'bg-emerald-100 text-emerald-800 font-bold'
                                        : 'bg-amber-100 text-amber-800'
                                }`}>
                                    {Object.values(sopChecks).filter(Boolean).length}/8
                                </span>
                            </button>
                            <button
                                type="button"
                                onClick={() => setModalActiveTab('minibar')}
                                className={`py-3 border-b-2 transition-all cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
                                    modalActiveTab === 'minibar'
                                        ? 'border-[#1e3a8a] text-[#1e3a8a]'
                                        : 'border-transparent text-slate-500 hover:text-slate-800'
                                }`}
                            >
                                <ShoppingBag size={14} />
                                Minibar Billing
                                {Object.values(minibarQuantities).some(q => q > 0) && (
                                    <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-emerald-100 text-emerald-800 font-bold">
                                        ৳{Object.entries(minibarQuantities).reduce((acc, [id, qty]) => {
                                            const prod = STANDARD_MINIBAR_CATALOG.find(p => p.id === id);
                                            return acc + (prod ? prod.unitPrice * qty : 0);
                                        }, 0)}
                                    </span>
                                )}
                            </button>
                            <button
                                type="button"
                                onClick={() => setModalActiveTab('discrepancy')}
                                className={`py-3 border-b-2 transition-all cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
                                    modalActiveTab === 'discrepancy'
                                        ? 'border-red-600 text-red-600'
                                        : 'border-transparent text-slate-500 hover:text-slate-800'
                                }`}
                            >
                                <AlertTriangle size={14} className={modalActiveTab === 'discrepancy' ? 'text-red-600' : 'text-slate-400'} />
                                Discrepancy Audit
                            </button>
                        </div>

                        {/* Modal Scrollable Body */}
                        <div className="p-6 overflow-y-auto space-y-4 flex-1">
                            {/* ── TAB 1: STATUS & TURNOVER ────────────────────────────── */}
                            {modalActiveTab === 'status' && (
                                <div className="space-y-4">
                                    {/* Guest Info strip (if occupied) */}
                                    {selectedRoomForModal.specialRequest && (
                                        <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-800 flex items-start gap-2">
                                            <Star size={13} className="shrink-0 mt-0.5 text-amber-600" />
                                            <div>
                                                <span className="font-bold">Guest Special Request: </span>
                                                {selectedRoomForModal.specialRequest}
                                            </div>
                                        </div>
                                    )}
                                    {selectedRoomForModal.isLinenDue && (
                                        <div className="p-3 rounded-xl bg-sky-50 border border-sky-200 text-xs text-sky-800 flex items-start gap-2">
                                            <Coffee size={13} className="shrink-0 mt-0.5 text-sky-600" />
                                            <div>
                                                <span className="font-bold">Linen Change Due</span> — Guest in-house for {selectedRoomForModal.nightsInHouse} night{selectedRoomForModal.nightsInHouse !== 1 ? 's' : ''}. Policy requires fresh linen.
                                            </div>
                                        </div>
                                    )}

                                    {/* Status Selector */}
                                    <div className="space-y-1.5">
                                        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                                            Housekeeping Status
                                        </label>
                                        <div className="grid grid-cols-4 gap-2">
                                            {[
                                                { id: 'clean', label: 'Clean', icon: <Sparkles size={13} />, activeStyle: 'bg-emerald-600 text-white border-emerald-600 font-bold ring-2 ring-emerald-200', inactiveStyle: 'bg-emerald-50/70 text-emerald-800 border-emerald-200 hover:bg-emerald-100/80 font-medium' },
                                                { id: 'inspected', label: 'Inspected', icon: <CheckCircle2 size={13} />, activeStyle: 'bg-blue-600 text-white border-blue-600 font-bold ring-2 ring-blue-200', inactiveStyle: 'bg-blue-50/70 text-blue-800 border-blue-200 hover:bg-blue-100/80 font-medium' },
                                                { id: 'dirty', label: 'Dirty', icon: <BedDouble size={13} />, activeStyle: 'bg-rose-600 text-white border-rose-600 font-bold ring-2 ring-rose-200', inactiveStyle: 'bg-rose-50/70 text-rose-800 border-rose-200 hover:bg-rose-100/80 font-medium' },
                                                { id: 'out-of-order', label: 'OOO', icon: <XCircle size={13} />, activeStyle: 'bg-slate-700 text-white border-slate-700 font-bold ring-2 ring-slate-300', inactiveStyle: 'bg-slate-100 text-slate-700 border-slate-200 hover:bg-slate-200/80 font-medium' }
                                            ].map(st => (
                                                <button
                                                    key={st.id}
                                                    type="button"
                                                    onClick={() => setModalStatus(st.id as any)}
                                                    className={`py-2 rounded-xl text-xs border flex flex-col items-center gap-1 cursor-pointer transition-all ${modalStatus === st.id ? st.activeStyle : st.inactiveStyle}`}
                                                >
                                                    {st.icon}
                                                    <span>{st.label}</span>
                                                </button>
                                            ))}
                                        </div>
                                    </div>

                                    {/* Housekeeper / Priority / DND */}
                                    <div className="grid grid-cols-3 gap-3 text-xs">
                                        <div>
                                            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">Assign Housekeeper</label>
                                            <select
                                                value={modalAssignedTo}
                                                onChange={e => setModalAssignedTo(e.target.value)}
                                                className="w-full px-2.5 py-2 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 outline-none cursor-pointer focus:border-blue-500 shadow-2xs"
                                            >
                                                {housekeeperNames.map(name => (
                                                    <option key={name} value={name}>{name}</option>
                                                ))}
                                                <option value="Duty Housekeeping Team">Duty Housekeeping Team</option>
                                            </select>
                                        </div>
                                        <div>
                                            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">Priority</label>
                                            <select
                                                value={modalPriority}
                                                onChange={e => setModalPriority(e.target.value as any)}
                                                className="w-full px-2.5 py-2 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 outline-none cursor-pointer focus:border-blue-500 shadow-2xs"
                                            >
                                                <option value="rush">Rush (VIP / Imminent)</option>
                                                <option value="high">High Priority</option>
                                                <option value="normal">Normal Routine</option>
                                                <option value="low">Low Priority</option>
                                            </select>
                                        </div>
                                        <div>
                                            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">Guest Flags</label>
                                            <button
                                                type="button"
                                                onClick={() => setModalDND(v => !v)}
                                                className={`w-full px-2.5 py-2 rounded-xl text-xs font-bold border flex items-center gap-1.5 cursor-pointer transition-all ${modalDND ? 'bg-violet-600 text-white border-violet-700 ring-2 ring-violet-200' : 'bg-white text-slate-700 border-slate-200 hover:bg-violet-50'}`}
                                            >
                                                <ShieldAlert size={12} />
                                                {modalDND ? 'DND Active' : 'Set DND'}
                                            </button>
                                        </div>
                                    </div>

                                    {/* Notes */}
                                    <div className="space-y-1.5">
                                        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                                            Turnover & Maintenance Notes
                                        </label>
                                        <textarea
                                            rows={2}
                                            value={modalNotes}
                                            onChange={e => setModalNotes(e.target.value)}
                                            placeholder="e.g. VIP arriving at 2 PM, extra towels placed, minibar restocked..."
                                            className="w-full p-3 bg-white border border-slate-200 rounded-xl text-xs outline-none focus:border-blue-500 resize-none shadow-2xs placeholder:text-slate-400"
                                        />
                                    </div>

                                    {/* OOO Defect Closure Action */}
                                    {modalStatus === 'out-of-order' && (
                                        <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl flex items-center justify-between">
                                            <div className="text-xs text-rose-900">
                                                <span className="font-bold block">Out of Order Maintenance Block</span>
                                                <span className="text-[11px] text-rose-700">Set start/end dates, reason & vendor lock</span>
                                            </div>
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    setOooInitialRoom(selectedRoomForModal.roomNumber);
                                                    setIsOooModalOpen(true);
                                                }}
                                                className="px-3 py-1.5 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-lg shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer"
                                            >
                                                <Wrench size={12} />
                                                Configure Block Dates
                                            </button>
                                        </div>
                                    )}

                                    {/* Quick Lost & Found Logging Action */}
                                    <div className="p-3 bg-amber-50/70 border border-amber-200/90 rounded-xl flex items-center justify-between">
                                        <div className="text-xs text-amber-950">
                                            <span className="font-bold flex items-center gap-1.5">
                                                <PackageSearch size={14} className="text-amber-700" />
                                                Guest Property Left Behind?
                                            </span>
                                            <span className="text-[11px] text-amber-700">Auto-link room {selectedRoomForModal.roomNumber} guest profile & log item</span>
                                        </div>
                                        <button
                                            type="button"
                                            onClick={() => {
                                                setQuickLostItemName('');
                                                setQuickLostDescription('');
                                                setQuickLostIsValuable(false);
                                                setIsQuickLostModalOpen(true);
                                            }}
                                            className="px-3 py-1.5 text-xs font-bold text-amber-900 bg-amber-200/90 hover:bg-amber-300 rounded-lg shadow-2xs transition-colors flex items-center gap-1.5 cursor-pointer"
                                        >
                                            <Plus size={12} />
                                            Report Item
                                        </button>
                                    </div>
                                </div>
                            )}

                            {/* ── TAB 2: SOP INSPECTION (8-POINT CHECKLIST & DEFECT ESCALATION) */}
                            {modalActiveTab === 'sop' && (
                                <div className="space-y-4">
                                    <div className="flex items-center justify-between p-3 rounded-xl bg-blue-50/60 border border-blue-200">
                                        <div>
                                            <p className="text-xs font-bold text-blue-900 flex items-center gap-1.5">
                                                <FileCheck size={14} className="text-primary" />
                                                AHLA / 5-Star SOP Turnover Checklist
                                            </p>
                                            <p className="text-[11px] text-blue-700 mt-0.5">
                                                {Object.values(sopChecks).filter(Boolean).length} of 8 inspection checkpoints verified
                                            </p>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    setSopChecks({
                                                        linen: true, bathroom: true, amenities: true, hvac: true,
                                                        lighting: true, cleanliness: true, appliances: true, safety: true
                                                    });
                                                }}
                                                className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold shadow-xs cursor-pointer flex items-center gap-1"
                                            >
                                                <CheckCircle2 size={12} />
                                                Pass All 8
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    setSopChecks({
                                                        linen: false, bathroom: false, amenities: false, hvac: false,
                                                        lighting: false, cleanliness: false, appliances: false, safety: false
                                                    });
                                                }}
                                                className="px-2.5 py-1.5 text-xs text-slate-500 hover:text-slate-700 border border-slate-200 rounded-lg bg-white cursor-pointer"
                                            >
                                                Reset
                                            </button>
                                        </div>
                                    </div>

                                    {/* 8 Checkpoints Grid */}
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                                        {SOP_ITEMS.map((item) => {
                                            const isChecked = !!sopChecks[item.key];
                                            return (
                                                <div
                                                    key={item.key}
                                                    onClick={() => setSopChecks(prev => ({ ...prev, [item.key]: !prev[item.key] }))}
                                                    className={`p-3 rounded-xl border transition-all cursor-pointer flex items-start gap-2.5 ${
                                                        isChecked
                                                            ? 'bg-emerald-50/40 border-emerald-200'
                                                            : 'bg-white border-slate-200 hover:border-slate-300'
                                                    }`}
                                                >
                                                    <div className="mt-0.5">
                                                        {isChecked ? (
                                                            <CheckSquare size={16} className="text-emerald-600" />
                                                        ) : (
                                                            <Square size={16} className="text-slate-400" />
                                                        )}
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <div className="flex items-center justify-between gap-1">
                                                            <p className={`text-xs font-bold ${isChecked ? 'text-emerald-900' : 'text-slate-800'}`}>
                                                                {item.label}
                                                            </p>
                                                            <span className={`text-[9px] px-1.5 py-0.2 rounded font-bold ${
                                                                isChecked ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-500'
                                                            }`}>
                                                                {isChecked ? 'Pass' : 'Pending'}
                                                            </span>
                                                        </div>
                                                        <p className="text-[11px] text-slate-500 mt-0.5 leading-snug">
                                                            {item.desc}
                                                        </p>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>

                                    {/* Defect Escalation to Maintenance */}
                                    <div className="p-4 bg-rose-50/70 border border-rose-200 rounded-xl space-y-3">
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-2">
                                                <Hammer size={16} className="text-rose-600" />
                                                <div>
                                                    <p className="text-xs font-bold text-rose-950">
                                                        Room Defect Escalation → Maintenance Kanban
                                                    </p>
                                                    <p className="text-[11px] text-rose-700">
                                                        Dispatch instant work order to engineering duty team
                                                    </p>
                                                </div>
                                            </div>
                                            <button
                                                type="button"
                                                onClick={() => setIsDefectFormOpen(v => !v)}
                                                className="px-3 py-1 bg-white hover:bg-rose-100 text-rose-700 border border-rose-300 rounded-lg text-xs font-bold cursor-pointer transition-colors shadow-2xs"
                                            >
                                                {isDefectFormOpen ? 'Close Ticket Form' : '+ New Work Order'}
                                            </button>
                                        </div>

                                        {isDefectFormOpen && (
                                            <div className="pt-2 border-t border-rose-200 space-y-3 animate-in fade-in-50">
                                                <div>
                                                    <p className="text-[10px] font-bold text-rose-800 uppercase tracking-wider mb-1">Common Quick-Pick Presets:</p>
                                                    <div className="flex flex-wrap gap-1.5">
                                                        {[
                                                            'AC Cooling Weak / Leaking Water',
                                                            'Bathroom Basin Faucet Continuous Drip',
                                                            'Bedside Reading Lamp Bulb Burnt Out',
                                                            'Electronic Keycard Lock Low Battery',
                                                            'TV Remote Unresponsive / Needs Batteries',
                                                            'Shower Drain Water Stagnation'
                                                        ].map(preset => (
                                                            <button
                                                                key={preset}
                                                                type="button"
                                                                onClick={() => setDefectTitle(preset)}
                                                                className="px-2 py-0.5 bg-white border border-rose-200 hover:border-rose-400 text-rose-900 rounded text-[10px] font-medium transition cursor-pointer"
                                                            >
                                                                {preset}
                                                            </button>
                                                        ))}
                                                    </div>
                                                </div>

                                                <div className="grid grid-cols-3 gap-2">
                                                    <div className="col-span-2">
                                                        <label className="text-[10px] font-bold text-slate-700 block mb-1">Defect Title *</label>
                                                        <input
                                                            type="text"
                                                            value={defectTitle}
                                                            onChange={e => setDefectTitle(e.target.value)}
                                                            placeholder="e.g. Broken towel rail"
                                                            className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-xs outline-none focus:ring-1 focus:ring-rose-500"
                                                        />
                                                    </div>
                                                    <div>
                                                        <label className="text-[10px] font-bold text-slate-700 block mb-1">Priority</label>
                                                        <select
                                                            value={defectPriority}
                                                            onChange={e => setDefectPriority(e.target.value as any)}
                                                            className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-xs outline-none bg-white"
                                                        >
                                                            <option value="urgent">Urgent</option>
                                                            <option value="high">High</option>
                                                            <option value="medium">Medium</option>
                                                            <option value="low">Low</option>
                                                        </select>
                                                    </div>
                                                </div>

                                                <div>
                                                    <label className="text-[10px] font-bold text-slate-700 block mb-1">Observation Details</label>
                                                    <textarea
                                                        rows={2}
                                                        value={defectDesc}
                                                        onChange={e => setDefectDesc(e.target.value)}
                                                        placeholder="Provide technical details, location, or severity..."
                                                        className="w-full p-2 bg-white border border-slate-300 rounded-lg text-xs outline-none resize-none focus:ring-1 focus:ring-rose-500"
                                                    />
                                                </div>

                                                <div className="flex items-center justify-between pt-1">
                                                    <label className="flex items-center gap-2 cursor-pointer text-xs text-rose-900 font-medium">
                                                        <input
                                                            type="checkbox"
                                                            checked={defectAlsoMarkOOO}
                                                            onChange={e => setDefectAlsoMarkOOO(e.target.checked)}
                                                            className="rounded border-slate-300 text-rose-600 focus:ring-rose-500"
                                                        />
                                                        Lock room as Out of Order (OOO)
                                                    </label>

                                                    <button
                                                        type="button"
                                                        onClick={handleDispatchDefect}
                                                        disabled={!defectTitle.trim()}
                                                        className="px-3.5 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-bold shadow-xs cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
                                                    >
                                                        <Wrench size={12} />
                                                        Dispatch Work Order
                                                    </button>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}

                            {/* ── TAB 3: MINIBAR FOLIO BILLING ────────────────────────── */}
                            {modalActiveTab === 'minibar' && (
                                <div className="space-y-4">
                                    <div className="p-3 rounded-xl bg-emerald-50/70 border border-emerald-200 flex items-center justify-between">
                                        <div>
                                            <p className="text-xs font-bold text-emerald-950 flex items-center gap-1.5">
                                                <ShoppingBag size={14} className="text-emerald-700" />
                                                In-Room Minibar Direct Folio Billing
                                            </p>
                                            <p className="text-[11px] text-emerald-700 mt-0.5">
                                                {selectedRoomForModal.guestName ? (
                                                    <>Active Guest: <strong className="text-emerald-900">{selectedRoomForModal.guestName}</strong> (Auto-posts itemized bill to guest ledger)</>
                                                ) : (
                                                    <span className="text-slate-500">Room is currently vacant. Restock counts logged for turnover audit.</span>
                                                )}
                                            </p>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-[10px] text-emerald-700 uppercase tracking-wider font-bold">Total Consumption</p>
                                            <p className="text-lg font-mono font-bold text-emerald-900">
                                                ৳{Object.entries(minibarQuantities).reduce((acc, [id, qty]) => {
                                                    const prod = STANDARD_MINIBAR_CATALOG.find(p => p.id === id);
                                                    return acc + (prod ? prod.unitPrice * qty : 0);
                                                }, 0)}
                                            </p>
                                        </div>
                                    </div>

                                    {/* Catalog Grid */}
                                    <div className="border border-slate-200 rounded-xl overflow-hidden shadow-2xs">
                                        <table className="w-full text-left text-xs border-collapse">
                                            <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 text-[10px] uppercase font-bold">
                                                <tr>
                                                    <th className="py-2.5 px-3">Item Description</th>
                                                    <th className="py-2.5 px-2">Category</th>
                                                    <th className="py-2.5 px-2 text-right">Unit Price</th>
                                                    <th className="py-2.5 px-3 text-center w-28">Quantity</th>
                                                    <th className="py-2.5 px-3 text-right">Subtotal</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-slate-100">
                                                {STANDARD_MINIBAR_CATALOG.map(prod => {
                                                    const qty = minibarQuantities[prod.id] || 0;
                                                    const subtotal = prod.unitPrice * qty;
                                                    return (
                                                        <tr key={prod.id} className={qty > 0 ? 'bg-emerald-50/30' : 'hover:bg-slate-50/60'}>
                                                            <td className="py-2 px-3 font-semibold text-slate-800">{prod.name}</td>
                                                            <td className="py-2 px-2">
                                                                <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 font-medium">
                                                                    {prod.category}
                                                                </span>
                                                            </td>
                                                            <td className="py-2 px-2 text-right font-mono text-slate-600">৳{prod.unitPrice}</td>
                                                            <td className="py-2 px-3">
                                                                <div className="flex items-center justify-center gap-1.5">
                                                                    <button
                                                                        type="button"
                                                                        onClick={() => setMinibarQuantities(prev => ({
                                                                            ...prev,
                                                                            [prod.id]: Math.max(0, (prev[prod.id] || 0) - 1)
                                                                        }))}
                                                                        className="w-6 h-6 rounded-md bg-slate-100 hover:bg-slate-200 text-slate-700 flex items-center justify-center font-bold text-xs cursor-pointer"
                                                                    >
                                                                        -
                                                                    </button>
                                                                    <span className="w-6 text-center font-mono font-bold text-slate-900 text-xs">
                                                                        {qty}
                                                                    </span>
                                                                    <button
                                                                        type="button"
                                                                        onClick={() => setMinibarQuantities(prev => ({
                                                                            ...prev,
                                                                            [prod.id]: (prev[prod.id] || 0) + 1
                                                                        }))}
                                                                        className="w-6 h-6 rounded-md bg-slate-100 hover:bg-slate-200 text-slate-700 flex items-center justify-center font-bold text-xs cursor-pointer"
                                                                    >
                                                                        +
                                                                    </button>
                                                                </div>
                                                            </td>
                                                            <td className="py-2 px-3 text-right font-mono font-bold text-slate-900">
                                                                {qty > 0 ? `৳${subtotal}` : '-'}
                                                            </td>
                                                        </tr>
                                                    );
                                                })}
                                            </tbody>
                                        </table>
                                    </div>

                                    {/* Action Post Button */}
                                    <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-200">
                                        <p className="text-xs text-slate-600">
                                            Recorded by: <span className="font-semibold text-slate-800">{modalAssignedTo || 'Duty Housekeeper'}</span>
                                        </p>
                                        <button
                                            type="button"
                                            onClick={handlePostMinibarBilling}
                                            disabled={isPostingMinibar || !Object.values(minibarQuantities).some(q => q > 0)}
                                            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-xs cursor-pointer disabled:opacity-40 transition flex items-center gap-1.5"
                                        >
                                            <ShoppingBag size={13} />
                                            {isPostingMinibar ? 'Posting to Folio...' : `Post Charge to Guest Folio (৳${Object.entries(minibarQuantities).reduce((acc, [id, qty]) => {
                                                const prod = STANDARD_MINIBAR_CATALOG.find(p => p.id === id);
                                                return acc + (prod ? prod.unitPrice * qty : 0);
                                            }, 0)})`}
                                        </button>
                                    </div>
                                </div>
                            )}

                            {/* ── TAB 4: ROOM DISCREPANCY AUDIT ───────────────────────── */}
                            {modalActiveTab === 'discrepancy' && (
                                <div className="space-y-4">
                                    <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-900 space-y-1">
                                        <div className="flex items-center gap-1.5 font-bold">
                                            <AlertTriangle size={15} className="text-rose-600" />
                                            AHLA &amp; Opera Cloud Discrepancy Standard
                                        </div>
                                        <p className="text-[11px] text-rose-700">
                                            Flag when physical room conditions observed by Housekeeping contradict the Front Desk system records (e.g. unregistered sleeper, skipped guest, or unauthorized baggage).
                                        </p>
                                    </div>

                                    {/* Status Comparison */}
                                    <div className="grid grid-cols-2 gap-3 text-xs">
                                        <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                                            <p className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Front Desk Record</p>
                                            <p className="text-sm font-bold text-slate-900 mt-1">
                                                {selectedRoomForModal.guestName ? `Occupied (${selectedRoomForModal.guestName})` : 'Vacant in PMS'}
                                            </p>
                                            <p className="text-[11px] text-slate-500 mt-0.5 capitalize">
                                                Status: {selectedRoomForModal.reservationStatus || 'Vacant'}
                                            </p>
                                        </div>
                                        <div className="p-3 rounded-xl bg-amber-50 border border-amber-200">
                                            <p className="text-[10px] text-amber-600 uppercase font-bold tracking-wider">Housekeeper Current Status</p>
                                            <p className="text-sm font-bold text-amber-900 mt-1 capitalize">
                                                {modalStatus} Room
                                            </p>
                                            <p className="text-[11px] text-amber-700 mt-0.5">
                                                Inspector: {modalAssignedTo}
                                            </p>
                                        </div>
                                    </div>

                                    {/* Discrepancy Type */}
                                    <div className="space-y-1.5">
                                        <label className="text-[10px] font-bold text-slate-700 uppercase tracking-wider block">
                                            Discrepancy Category *
                                        </label>
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                            {[
                                                { id: 'Sleep Discrepancy' as DiscrepancyType, title: 'Sleep Discrepancy', desc: 'Front Desk shows VACANT, but luggage or slept bed found' },
                                                { id: 'Skip Discrepancy (Skipper)' as DiscrepancyType, title: 'Skip Discrepancy (Skipper)', desc: 'Front Desk shows OCCUPIED, but room is empty & guest left' },
                                                { id: 'Person Count Mismatch' as DiscrepancyType, title: 'Person Count Mismatch', desc: 'More occupants detected than registered in system' },
                                                { id: 'Luggage Without Guest' as DiscrepancyType, title: 'Luggage Without Guest', desc: 'Checkout time exceeded, room vacant of guests but bags left' }
                                            ].map(opt => (
                                                <button
                                                    key={opt.id}
                                                    type="button"
                                                    onClick={() => setDiscType(opt.id)}
                                                    className={`p-3 text-left rounded-xl border transition-all cursor-pointer ${
                                                        discType === opt.id
                                                            ? 'border-red-600 bg-red-50 text-red-900 font-bold ring-2 ring-red-200'
                                                            : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                                                    }`}
                                                >
                                                    <p className="text-xs">{opt.title}</p>
                                                    <p className="text-[10px] text-slate-500 font-normal mt-0.5">{opt.desc}</p>
                                                </button>
                                            ))}
                                        </div>
                                    </div>

                                    {/* Observation Notes */}
                                    <div className="space-y-1.5">
                                        <label className="text-[10px] font-bold text-slate-700 uppercase tracking-wider block">
                                            Housekeeper Physical Room Observation *
                                        </label>
                                        <textarea
                                            rows={3}
                                            value={discObservation}
                                            onChange={e => setDiscObservation(e.target.value)}
                                            placeholder="Describe evidence found (e.g. 2 open suitcases and laptop found on desk, bed unmade, door card on vanity...)"
                                            className="w-full p-3 bg-white border border-slate-200 rounded-xl text-xs outline-none focus:border-red-500 shadow-2xs resize-none"
                                        />
                                    </div>

                                    <div className="pt-2 border-t border-slate-200 flex items-center justify-between">
                                        <p className="text-[11px] text-slate-500">
                                            Reporting staff: <strong className="text-slate-700">{modalAssignedTo}</strong>
                                        </p>
                                        <button
                                            type="button"
                                            onClick={handleFlagDiscrepancy}
                                            disabled={!discObservation.trim()}
                                            className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold shadow-xs cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
                                        >
                                            <AlertTriangle size={13} />
                                            Flag Discrepancy &amp; Alert Front Desk
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Modal Footer */}
                        <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between gap-3 shrink-0">
                            <button
                                type="button"
                                onClick={() => setSelectedRoomForModal(null)}
                                className="h-9 px-4 border border-slate-200 bg-white hover:bg-slate-100 text-slate-700 rounded-xl text-xs font-semibold cursor-pointer transition-colors shadow-2xs"
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                onClick={handleSaveModal}
                                className="h-9 px-4.5 bg-[#1e3a8a] hover:bg-blue-900 text-white rounded-xl text-xs font-bold flex items-center gap-2 cursor-pointer shadow-sm transition-all"
                            >
                                <CheckCircle2 size={14} />
                                <span>Save &amp; Sync Room Status</span>
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ── Discrepancy Resolution Modal ─────────────────────────────── */}
            {selectedDiscrepancyForResolve && (
                <div className="fixed inset-0 z-60 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-lg w-full overflow-hidden animate-in zoom-in-95 duration-150">
                        <div className="px-6 py-4 bg-red-600 text-white flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <AlertTriangle size={18} />
                                <div>
                                    <h3 className="text-sm font-bold">Resolve Discrepancy — Room {selectedDiscrepancyForResolve.roomNumber}</h3>
                                    <p className="text-[11px] text-red-100">{selectedDiscrepancyForResolve.discrepancyType}</p>
                                </div>
                            </div>
                            <button
                                type="button"
                                onClick={() => setSelectedDiscrepancyForResolve(null)}
                                className="text-red-100 hover:text-white cursor-pointer"
                            >
                                <X size={18} />
                            </button>
                        </div>

                        <div className="p-6 space-y-4">
                            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-1.5 text-xs text-slate-700">
                                <p><span className="text-slate-400 uppercase text-[10px] font-bold block">Front Desk Record</span> <strong>{selectedDiscrepancyForResolve.frontDeskStatus}</strong></p>
                                <p><span className="text-slate-400 uppercase text-[10px] font-bold block">Housekeeper Physical Observation</span> {selectedDiscrepancyForResolve.housekeepingFound}</p>
                                <p className="text-[11px] text-slate-500 pt-1 border-t border-slate-200">
                                    Reported by: <strong>{selectedDiscrepancyForResolve.reportedBy}</strong> • {new Date(selectedDiscrepancyForResolve.reportedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </p>
                            </div>

                            <div>
                                <label className="text-[10px] font-bold text-slate-700 uppercase tracking-wider block mb-1">
                                    Supervisor Investigation &amp; Resolution Notes *
                                </label>
                                <textarea
                                    rows={3}
                                    value={discrepancyResolveNotes}
                                    onChange={e => setDiscrepancyResolveNotes(e.target.value)}
                                    placeholder="e.g. Front Desk confirmed guest checked in late without scanning keycard. Folio updated and room marked Occupied Clean."
                                    className="w-full p-3 bg-white border border-slate-200 rounded-xl text-xs outline-none focus:border-red-500 shadow-2xs resize-none"
                                />
                            </div>

                            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                                <button
                                    type="button"
                                    onClick={() => setSelectedDiscrepancyForResolve(null)}
                                    className="px-3.5 py-2 text-xs text-slate-600 hover:bg-slate-100 rounded-xl cursor-pointer"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="button"
                                    onClick={handleResolveDiscrepancy}
                                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-xs cursor-pointer flex items-center gap-1.5"
                                >
                                    <CheckCircle2 size={13} />
                                    Reconcile &amp; Clear Discrepancy
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* ── Daily Housekeeper Maid Worksheet Modal (Printable) ────────── */}
            {isWorksheetOpen && (
                <div className="fixed inset-0 z-60 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
                    <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-5xl w-full overflow-hidden animate-in zoom-in-95 duration-150 max-h-[95vh] flex flex-col">
                        {/* Header & Print Filter Bar */}
                        <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between shrink-0 print:hidden">
                            <div className="flex items-center gap-2">
                                <Printer size={18} className="text-blue-400" />
                                <div>
                                    <h3 className="text-sm font-bold">Daily Housekeeper Maid Assignment Worksheet</h3>
                                    <p className="text-[11px] text-slate-400">Opera Cloud / 5-Star Hotel Turnaround Clipboard Standard</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                <button
                                    type="button"
                                    onClick={() => window.print()}
                                    className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-sm flex items-center gap-1.5 cursor-pointer"
                                >
                                    <Printer size={13} />
                                    Print / Save PDF
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setIsWorksheetOpen(false)}
                                    className="text-slate-400 hover:text-white cursor-pointer p-1"
                                >
                                    <X size={18} />
                                </button>
                            </div>
                        </div>

                        {/* Filter Bar (Screen only) */}
                        <div className="px-6 py-3 bg-slate-50 border-b border-slate-200 flex items-center gap-3 flex-wrap text-xs print:hidden shrink-0">
                            <div className="flex items-center gap-1.5">
                                <span className="text-slate-500 font-semibold">Housekeeper:</span>
                                <select
                                    value={worksheetHousekeeper}
                                    onChange={e => setWorksheetHousekeeper(e.target.value)}
                                    className="px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-semibold outline-none"
                                >
                                    <option value="all">All Housekeepers</option>
                                    {housekeeperNames.map(hk => (
                                        <option key={hk} value={hk}>{hk}</option>
                                    ))}
                                </select>
                            </div>
                            <div className="flex items-center gap-1.5">
                                <span className="text-slate-500 font-semibold">Floor:</span>
                                <select
                                    value={worksheetFloor}
                                    onChange={e => setWorksheetFloor(e.target.value)}
                                    className="px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-semibold outline-none"
                                >
                                    <option value="all">All Floors</option>
                                    {uniqueFloors.map(fl => (
                                        <option key={fl} value={String(fl)}>Floor {fl}</option>
                                    ))}
                                </select>
                            </div>
                            <div className="flex items-center gap-1.5">
                                <span className="text-slate-500 font-semibold">Shift:</span>
                                <select
                                    value={worksheetShift}
                                    onChange={e => setWorksheetShift(e.target.value)}
                                    className="px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-semibold outline-none"
                                >
                                    <option>Morning Shift (08:00 - 16:00)</option>
                                    <option>Evening Shift (16:00 - 00:00)</option>
                                    <option>Night Shift (00:00 - 08:00)</option>
                                </select>
                            </div>
                            <div className="flex items-center gap-1.5">
                                <span className="text-slate-500 font-semibold">Filter:</span>
                                <select
                                    value={worksheetStatusFilter}
                                    onChange={e => setWorksheetStatusFilter(e.target.value as any)}
                                    className="px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-semibold outline-none"
                                >
                                    <option value="all">All Assigned Rooms</option>
                                    <option value="dirty_only">Dirty Rooms Only</option>
                                </select>
                            </div>
                        </div>

                        {/* Printable Document Area */}
                        <div id="printable-maid-worksheet" className="p-6 overflow-y-auto space-y-4 flex-1 bg-white text-slate-900 font-sans">
                            {/* Worksheet Header */}
                            <div className="border-b-2 border-slate-900 pb-3 flex items-start justify-between">
                                <div>
                                    <h1 className="text-xl font-black tracking-tight text-slate-900 uppercase">
                                        HotelManagementOS • Housekeeping Maid Worksheet
                                    </h1>
                                    <p className="text-xs text-slate-600 mt-0.5">
                                        Daily Room Turnover &amp; Linen Control Clipboard Sheet
                                    </p>
                                </div>
                                <div className="text-right text-xs">
                                    <p><strong>Date:</strong> {getOperatingSystemDate()} ({new Date().toLocaleDateString('en-US', { weekday: 'short' })})</p>
                                    <p><strong>Shift:</strong> {worksheetShift}</p>
                                    <p><strong>Attendant:</strong> {worksheetHousekeeper === 'all' ? 'Floor Team' : worksheetHousekeeper}</p>
                                </div>
                            </div>

                            {/* Summary Metrics */}
                            {(() => {
                                const wsRooms = rooms.filter(r => {
                                    const matchHk = worksheetHousekeeper === 'all' || r.assignedTo === worksheetHousekeeper;
                                    const matchFl = worksheetFloor === 'all' || String(r.floor) === worksheetFloor;
                                    const matchSt = worksheetStatusFilter === 'all' || r.status === 'dirty';
                                    return matchHk && matchFl && matchSt;
                                });
                                const dirtyC = wsRooms.filter(r => r.status === 'dirty').length;
                                const cleanC = wsRooms.filter(r => r.status === 'clean' || r.status === 'inspected').length;
                                const inHouseC = wsRooms.filter(r => r.reservationStatus === 'in-house').length;
                                const arrivingC = wsRooms.filter(r => r.reservationStatus === 'arriving').length;
                                const linenC = wsRooms.filter(r => r.isLinenDue).length;

                                return (
                                    <>
                                        <div className="grid grid-cols-5 gap-2 text-center text-xs py-1">
                                            <div className="p-2 border border-slate-300 rounded font-semibold">Total: {wsRooms.length}</div>
                                            <div className="p-2 border border-slate-300 rounded font-semibold text-rose-700 bg-rose-50/50">Dirty: {dirtyC}</div>
                                            <div className="p-2 border border-slate-300 rounded font-semibold text-emerald-700 bg-emerald-50/50">Ready: {cleanC}</div>
                                            <div className="p-2 border border-slate-300 rounded font-semibold text-blue-700 bg-blue-50/50">In-House: {inHouseC} | Arr: {arrivingC}</div>
                                            <div className="p-2 border border-slate-300 rounded font-semibold text-sky-700 bg-sky-50/50">Linen Due: {linenC}</div>
                                        </div>

                                        {/* Table */}
                                        <table className="w-full text-left text-xs border border-slate-300 border-collapse">
                                            <thead>
                                                <tr className="bg-slate-100 text-slate-800 text-[10px] uppercase font-bold border-b border-slate-300">
                                                    <th className="p-2 border-r border-slate-300 w-12 text-center">Room</th>
                                                    <th className="p-2 border-r border-slate-300 w-14">Floor</th>
                                                    <th className="p-2 border-r border-slate-300 w-28">Type</th>
                                                    <th className="p-2 border-r border-slate-300">Guest / Front Desk</th>
                                                    <th className="p-2 border-r border-slate-300 w-16 text-center">HK Status</th>
                                                    <th className="p-2 border-r border-slate-300 w-14 text-center">Linen?</th>
                                                    <th className="p-2 border-r border-slate-300 w-24">VIP / Requests</th>
                                                    <th className="p-2 border-r border-slate-300 w-16 text-center">Minibar</th>
                                                    <th className="p-2 border-r border-slate-300 w-16 text-center">Maid Sign</th>
                                                    <th className="p-2 text-center w-16">Supv Ok</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-slate-200">
                                                {wsRooms.map(r => (
                                                    <tr key={r.id} className="hover:bg-slate-50">
                                                        <td className="p-2 border-r border-slate-300 font-mono font-bold text-center text-slate-900">{r.roomNumber}</td>
                                                        <td className="p-2 border-r border-slate-300 text-slate-600">Fl {r.floor}</td>
                                                        <td className="p-2 border-r border-slate-300 text-slate-600">{r.roomType}</td>
                                                        <td className="p-2 border-r border-slate-300 text-slate-800">
                                                            {r.guestName ? (
                                                                <span className="font-semibold">{r.guestName} <span className="text-[10px] text-slate-500 font-normal">({r.reservationStatus})</span></span>
                                                            ) : (
                                                                <span className="text-slate-400 italic">Vacant</span>
                                                            )}
                                                        </td>
                                                        <td className="p-2 border-r border-slate-300 text-center font-bold uppercase text-[10px]">
                                                            {r.status}
                                                        </td>
                                                        <td className="p-2 border-r border-slate-300 text-center text-slate-700">
                                                            {r.isLinenDue ? <strong className="text-blue-700 font-bold">YES</strong> : '—'}
                                                        </td>
                                                        <td className="p-2 border-r border-slate-300 text-[10px] text-slate-600">
                                                            {r.specialRequest || (r.isRush ? 'RUSH ARRIVAL' : '—')}
                                                        </td>
                                                        <td className="p-2 border-r border-slate-300 text-center">
                                                            <div className="w-4 h-4 border border-slate-400 mx-auto rounded-xs"></div>
                                                        </td>
                                                        <td className="p-2 border-r border-slate-300 text-center">
                                                            <div className="w-4 h-4 border border-slate-400 mx-auto rounded-xs"></div>
                                                        </td>
                                                        <td className="p-2 text-center">
                                                            <div className="w-4 h-4 border border-slate-400 mx-auto rounded-xs"></div>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </>
                                );
                            })()}

                            {/* Sign-off Footer */}
                            <div className="pt-6 mt-4 border-t border-slate-300 grid grid-cols-2 gap-8 text-xs text-slate-700">
                                <div className="border-t border-slate-400 pt-1 text-center">
                                    <p className="font-bold">Housekeeper Attendant Signature</p>
                                    <p className="text-[10px] text-slate-500">Date &amp; Time completed</p>
                                </div>
                                <div className="border-t border-slate-400 pt-1 text-center">
                                    <p className="font-bold">Floor Supervisor Inspection Sign-off</p>
                                    <p className="text-[10px] text-slate-500">Verified and approved to Front Desk</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Out of Order & Maintenance Modal */}
            <OutOfOrderModal
                isOpen={isOooModalOpen}
                onClose={() => {
                    setIsOooModalOpen(false);
                    setOooInitialRoom(undefined);
                }}
                initialRoomNumber={oooInitialRoom}
                onBlockUpdated={() => {
                    fetchRooms();
                }}
            />

            {/* ── Quick Lost & Found Modal (from Room Inspection) ────────────── */}
            {isQuickLostModalOpen && selectedRoomForModal && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4">
                    <div className="bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-md overflow-hidden animate-in fade-in-50 zoom-in-95">
                        <div className="px-4 py-3 bg-amber-600 text-white flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <PackageSearch size={16} />
                                <div>
                                    <h3 className="text-sm font-bold">Report Found Item — Room {selectedRoomForModal.roomNumber}</h3>
                                    <p className="text-[11px] text-amber-100">
                                        {selectedRoomForModal.guestName ? `Guest: ${selectedRoomForModal.guestName}` : 'Auto-links to room guest profile'}
                                    </p>
                                </div>
                            </div>
                            <button onClick={() => setIsQuickLostModalOpen(false)} className="text-amber-100 hover:text-white">
                                <X size={16} />
                            </button>
                        </div>

                        <div className="p-4 space-y-3">
                            <div>
                                <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                                    Item Name <span className="text-rose-500">*</span>
                                </label>
                                <input
                                    type="text"
                                    placeholder="e.g. Apple iPhone 15, Black Wallet, Gold Earrings"
                                    value={quickLostItemName}
                                    onChange={(e) => setQuickLostItemName(e.target.value)}
                                    className="w-full text-xs px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-md focus:bg-white focus:outline-none focus:ring-1 focus:ring-amber-500"
                                    autoFocus
                                />
                            </div>

                            <div>
                                <label className="block text-[11px] font-semibold text-slate-700 mb-1">Description (Color, Brand, Marks)</label>
                                <textarea
                                    rows={2}
                                    placeholder="e.g. Black leather case, initials R.K. engraved..."
                                    value={quickLostDescription}
                                    onChange={(e) => setQuickLostDescription(e.target.value)}
                                    className="w-full text-xs px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-md focus:bg-white"
                                />
                            </div>

                            <label className="flex items-center gap-2 cursor-pointer p-2 rounded-lg bg-amber-50 border border-amber-200">
                                <input
                                    type="checkbox"
                                    checked={quickLostIsValuable}
                                    onChange={(e) => setQuickLostIsValuable(e.target.checked)}
                                    className="rounded text-amber-600"
                                />
                                <span className="text-xs font-semibold text-amber-900">High-Value Item (Jewellery, Currency, Passport, Device)</span>
                            </label>

                            {selectedRoomForModal.guestName && (
                                <div className="p-2.5 bg-emerald-50 border border-emerald-200 rounded-lg text-[11px]">
                                    <p className="font-bold text-emerald-800">✓ Guest Auto-Linked</p>
                                    <p className="text-emerald-700">{selectedRoomForModal.guestName}</p>
                                </div>
                            )}

                            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-200">
                                <button
                                    type="button"
                                    onClick={() => setIsQuickLostModalOpen(false)}
                                    className="px-3 py-1.5 text-xs font-medium text-slate-600"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="button"
                                    onClick={async () => {
                                        if (!quickLostItemName.trim()) return;
                                        await createLostAndFoundItem({
                                            itemName: quickLostItemName.trim(),
                                            description: quickLostDescription.trim(),
                                            locationType: 'Guest Room',
                                            roomNumber: selectedRoomForModal.roomNumber,
                                            isValuable: quickLostIsValuable,
                                            guestName: selectedRoomForModal.guestName || '',
                                            foundBy: 'Housekeeper',
                                            finderRole: 'Housekeeper',
                                            storageLocation: quickLostIsValuable
                                                ? 'Duty Manager High-Security Vault #01'
                                                : 'Housekeeping Department Locker',
                                            notifiedStatus: selectedRoomForModal.guestName ? 'pending' : 'pending'
                                        });
                                        setIsQuickLostModalOpen(false);
                                        setSelectedRoomForModal(null);
                                        // Navigate to full L&F for full context
                                        setActivePage('lost-and-found');
                                    }}
                                    disabled={!quickLostItemName.trim()}
                                    className="px-4 py-1.5 text-xs font-semibold text-white bg-amber-600 hover:bg-amber-700 rounded-md shadow-xs transition disabled:opacity-50"
                                >
                                    Log & Open Registry
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default HousekeepingGrid;
