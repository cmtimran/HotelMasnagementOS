import { useState, useEffect, useCallback, useMemo } from 'react';
import {
    Search, Sparkles, BedDouble, AlertCircle, Users, CheckCircle2, XCircle,
    Clock, RefreshCw, X, Edit3, Zap, Coffee, ShieldAlert, Star,
    CheckSquare, Square, Layers, UserCheck, Filter, Wrench
} from 'lucide-react';
import {
    getCanonicalRooms, getAllStoredReservations, getOperatingSystemDate,
    broadcastPMSEvent, subscribeToPMSEvents, updateRoomHousekeepingInDB
} from '../utils/roomInventoryEngine';
import { dispatchPMSNetworkEvent } from '../utils/pmsNetworkSync';
import { getApiBaseUrl } from '../utils/apiUrl';
import { getHousekeepingSettings, getHousekeepersList, isLinenChangeDue } from '../utils/housekeepingSettingsEngine';
import PageHeader from './common/PageHeader';
import OutOfOrderModal from './modals/OutOfOrderModal';

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

// ─── Main Component ─────────────────────────────────────────────────────────

const HousekeepingGrid = () => {
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

    // Inspection Modal
    const [selectedRoomForModal, setSelectedRoomForModal] = useState<HousekeepingRoom | null>(null);
    const [modalStatus, setModalStatus] = useState<HousekeepingRoom['status']>('clean');
    const [modalAssignedTo, setModalAssignedTo] = useState<string>('');
    const [modalPriority, setModalPriority] = useState<'rush' | 'high' | 'normal' | 'low'>('normal');
    const [modalNotes, setModalNotes] = useState<string>('');
    const [modalDND, setModalDND] = useState(false);

    // Maintenance / Out of Order Modal
    const [isOooModalOpen, setIsOooModalOpen] = useState(false);
    const [oooInitialRoom, setOooInitialRoom] = useState<string | undefined>(undefined);

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
        return () => unsubscribe();
    }, [fetchRooms]);

    // ── Derived data ─────────────────────────────────────────────────────────
    const uniqueFloors = useMemo(() =>
        Array.from(new Set(rooms.map(r => r.floor))).sort((a, b) => a - b),
        [rooms]
    );

    const filteredRooms = useMemo(() => rooms.filter(room => {
        const matchesSearch =
            room.roomNumber.includes(searchTerm) ||
            (room.assignedTo?.toLowerCase().includes(searchTerm.toLowerCase()) ?? false) ||
            (room.guestName?.toLowerCase().includes(searchTerm.toLowerCase()) ?? false);
        const matchesFloor = filterFloor === 'all' || room.floor.toString() === filterFloor;
        const matchesStatus = filterStatus === 'all' || room.status === filterStatus;
        const matchesPriority = filterPriority === 'all' || room.priority === filterPriority;
        return matchesSearch && matchesFloor && matchesStatus && matchesPriority;
    }), [rooms, searchTerm, filterFloor, filterStatus, filterPriority]);

    const stats = useMemo(() => ({
        total: rooms.length,
        dirty: rooms.filter(r => r.status === 'dirty').length,
        clean: rooms.filter(r => r.status === 'clean').length,
        inspected: rooms.filter(r => r.status === 'inspected').length,
        outOfOrder: rooms.filter(r => r.status === 'out-of-order').length,
        rush: rooms.filter(r => r.isRush).length,
        dnd: rooms.filter(r => r.isDND).length,
        linenDue: rooms.filter(r => r.isLinenDue).length,
    }), [rooms]);

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
            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
                {[
                    { label: 'Total', value: stats.total, sub: 'All rooms', color: 'text-slate-900', bg: 'bg-primary-subtle text-primary', icon: <BedDouble size={15} /> },
                    { label: 'Dirty', value: stats.dirty, sub: 'Needs cleaning', color: 'text-rose-600', bg: 'bg-rose-50 text-rose-600', icon: <AlertCircle size={15} /> },
                    { label: 'Clean', value: stats.clean, sub: 'Ready', color: 'text-emerald-600', bg: 'bg-emerald-50 text-emerald-600', icon: <Sparkles size={15} /> },
                    { label: 'Inspected', value: stats.inspected, sub: 'Verified', color: 'text-amber-600', bg: 'bg-amber-50 text-amber-600', icon: <CheckCircle2 size={15} /> },
                    { label: 'OOO', value: stats.outOfOrder, sub: 'Blocked', color: 'text-slate-700', bg: 'bg-slate-100 text-slate-600', icon: <XCircle size={15} /> },
                    { label: 'Rush', value: stats.rush, sub: 'Imminent arrival', color: 'text-red-600', bg: 'bg-red-50 text-red-600', icon: <Zap size={15} /> },
                    { label: 'DND', value: stats.dnd, sub: 'Do Not Disturb', color: 'text-violet-600', bg: 'bg-violet-50 text-violet-600', icon: <ShieldAlert size={15} /> },
                    { label: 'Linen Due', value: stats.linenDue, sub: 'Long stay', color: 'text-sky-600', bg: 'bg-sky-50 text-sky-600', icon: <Coffee size={15} /> },
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
                    <div className="bg-white rounded-2xl shadow-2xl border border-slate-200/90 max-w-[560px] w-full overflow-hidden animate-in zoom-in-95 duration-150 my-auto">
                        {/* Header */}
                        <div className="px-6 py-4.5 border-b border-slate-100 flex items-center justify-between bg-slate-50/70">
                            <div className="flex items-center gap-3.5">
                                <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-[#1e3a8a] to-blue-700 text-white flex items-center justify-center font-mono font-bold text-base shadow-sm ring-2 ring-blue-100">
                                    {selectedRoomForModal.roomNumber}
                                </div>
                                <div>
                                    <div className="flex items-center gap-2 flex-wrap">
                                        <h3 className="text-sm font-bold text-slate-900">Room {selectedRoomForModal.roomNumber} — Inspection</h3>
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

                        {/* Guest Info strip (if occupied) */}
                        {selectedRoomForModal.specialRequest && (
                            <div className="mx-6 mt-4 p-3 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-800 flex items-start gap-2">
                                <Star size={13} className="shrink-0 mt-0.5 text-amber-600" />
                                <div>
                                    <span className="font-bold">Guest Special Request: </span>
                                    {selectedRoomForModal.specialRequest}
                                </div>
                            </div>
                        )}
                        {selectedRoomForModal.isLinenDue && (
                            <div className="mx-6 mt-3 p-3 rounded-xl bg-sky-50 border border-sky-200 text-xs text-sky-800 flex items-start gap-2">
                                <Coffee size={13} className="shrink-0 mt-0.5 text-sky-600" />
                                <div>
                                    <span className="font-bold">Linen Change Due</span> — Guest in-house for {selectedRoomForModal.nightsInHouse} night{selectedRoomForModal.nightsInHouse !== 1 ? 's' : ''}. Policy requires fresh linen.
                                </div>
                            </div>
                        )}

                        {/* Modal Body */}
                        <div className="p-6 space-y-4">
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
                        </div>

                        {/* Modal Footer */}
                        <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between gap-3">
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
                                <span>Save & Sync Room Status</span>
                            </button>
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
        </div>
    );
};

export default HousekeepingGrid;
