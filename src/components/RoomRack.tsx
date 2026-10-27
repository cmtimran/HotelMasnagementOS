import React, { useState, useMemo, useEffect } from 'react';
import { 
    Search, BedDouble, Sparkles, User, Calendar, 
    MapPin, Plus, RefreshCw, LayoutGrid, List, CheckCircle2, 
    Wrench, ArrowRight, X, ExternalLink, Phone, Building2, Clock
} from 'lucide-react';
import { useNavigation } from '../context/NavigationContext';
import { QuickReservationModal } from './modals/QuickReservationModal';
import { 
    getCanonicalRooms, 
    getAllStoredReservations, 
    syncRoomTypesAndRoomsFromDB, 
    syncReservationsFromDB,
    updateRoomHousekeepingInDB,
    updateReservationStatusInDB,
    getDynamicRoomTypes,
    getOperatingSystemDate,
    subscribeToPMSEvents
} from '../utils/roomInventoryEngine';

export interface RoomRackItem {
    id: number;
    roomNumber: string;
    floor: number;
    roomType: string;
    status: 'clean' | 'dirty' | 'inspected' | 'occupied' | 'ooo' | 'reserved' | string;
    guestName?: string;
    phone?: string;
    checkIn?: string;
    checkoutDate?: string;
    rate: number;
    bedType: string;
    features: string[];
    housekeeper?: string;
    maintenanceReason?: string;
    reservationId?: number | string;
    reservationNumber?: string;
    buildingId?: string;
    buildingName?: string;
    upcomingGuestName?: string;
    upcomingCheckIn?: string;
    upcomingCheckOut?: string;
    upcomingReservationId?: number | string;
    upcomingReservationNumber?: string;
}

const getBuildingNameById = (bId: string): string => {
    try {
        const raw = localStorage.getItem('hotel_buildings_v2');
        if (raw) {
            const list = JSON.parse(raw);
            const found = list.find((b: any) => String(b.id) === String(bId));
            if (found && (found.title || found.name)) return found.title || found.name;
        }
    } catch {}
    if (bId === '2') return 'Suites & Annex Wing';
    return 'Main Tower';
};

const deriveRoomsFromInventory = (targetDate?: string): RoomRackItem[] => {
    const canonical = getCanonicalRooms();
    const storedRes = getAllStoredReservations();
    const opDate = targetDate || getOperatingSystemDate();

    return canonical.map(r => {
        const floorNum = parseInt(r.floorId, 10) || parseInt(r.number[0], 10) || 1;
        const buildingId = String(r.buildingId || (parseInt(String(r.number)[0], 10) >= 4 ? '2' : '1'));
        const buildingName = (r as any).buildingName || getBuildingNameById(buildingId);
        
        // Match active reservations covering target date or arriving target date
        const activeRes = storedRes.find(res => {
            const rawStatus = String(res.status || '').toLowerCase().replace(/_/g, '-');
            if (rawStatus === 'cancelled' || rawStatus === 'void' || rawStatus === 'checked-out' || rawStatus === 'completed') {
                return false;
            }
            const matchesRoom = String(res.roomNumber) === r.number ||
                String(res.roomNo) === r.number ||
                (Array.isArray(res.allocatedRooms) && res.allocatedRooms.some((x: any) => String(x) === r.number)) ||
                (Array.isArray(res.roomsList) && res.roomsList.some((rm: any) => String(rm.roomNumber) === r.number)) ||
                (Array.isArray(res.groupRoomsList) && res.groupRoomsList.some((rm: any) => String(rm.roomNumber) === r.number));

            if (!matchesRoom) return false;

            const checkIn = String(res.checkIn || res.arrivalDate || '');
            const checkOut = String(res.checkOut || res.departureDate || '');
            return (checkIn <= opDate && checkOut > opDate) || (checkIn === opDate);
        });

        // Match upcoming future reservations arriving after opDate (sorted earliest first)
        const upcomingRes = !activeRes ? storedRes.filter(res => {
            const rawStatus = String(res.status || '').toLowerCase().replace(/_/g, '-');
            if (rawStatus === 'cancelled' || rawStatus === 'void' || rawStatus === 'checked-out' || rawStatus === 'completed') {
                return false;
            }
            const matchesRoom = String(res.roomNumber) === r.number ||
                String(res.roomNo) === r.number ||
                (Array.isArray(res.allocatedRooms) && res.allocatedRooms.some((x: any) => String(x) === r.number)) ||
                (Array.isArray(res.roomsList) && res.roomsList.some((rm: any) => String(rm.roomNumber) === r.number)) ||
                (Array.isArray(res.groupRoomsList) && res.groupRoomsList.some((rm: any) => String(rm.roomNumber) === r.number));

            if (!matchesRoom) return false;

            const checkIn = String(res.checkIn || res.arrivalDate || '');
            return checkIn > opDate;
        }).sort((a, b) => String(a.checkIn || '').localeCompare(String(b.checkIn || '')))[0] : undefined;

        let status: RoomRackItem['status'] = 'clean';
        if (r.status === 'Out of Order' || r.status === 'Maintenance') {
            status = 'ooo';
        } else if (activeRes) {
            const rawStatus = String(activeRes.status || '').toLowerCase().replace(/_/g, '-');
            const isInHouse = rawStatus === 'in-house' || rawStatus === 'arrived' || rawStatus === 'checked-in';
            status = isInHouse ? 'occupied' : 'reserved';
        } else {
            const hk = (r.housekeepingStatus || 'Clean').toLowerCase();
            status = hk === 'dirty' ? 'dirty' : hk === 'inspected' ? 'inspected' : 'clean';
        }

        const features = [
            r.viewType || 'Scenic View',
            r.isConnecting ? 'Connecting Door' : 'Soundproof',
            r.smokingAllowed ? 'Smoking Permitted' : 'Non-Smoking'
        ];

        return {
            id: typeof r.id === 'number' ? r.id : parseInt(String(r.id), 10) || 1,
            roomNumber: r.number,
            floor: floorNum,
            buildingId,
            buildingName,
            roomType: (r.roomTypeName as any) || 'Deluxe Double',
            status,
            guestName: activeRes ? activeRes.guestName : undefined,
            phone: activeRes ? activeRes.phone : undefined,
            checkIn: activeRes ? (activeRes.checkIn || activeRes.arrivalDate) : undefined,
            checkoutDate: activeRes ? (activeRes.checkOut || activeRes.departureDate) : undefined,
            rate: r.baseRate || 3500,
            bedType: (r.bedConfiguration as any) || 'King',
            features,
            housekeeper: r.housekeepingStatus === 'Clean' ? 'Housekeeping Assigned' : 'Duty Staff',
            maintenanceReason: r.status === 'Out of Order' ? (r.remarks || 'Under Maintenance') : undefined,
            reservationId: activeRes?.id,
            reservationNumber: activeRes?.reservationNumber,
            upcomingGuestName: upcomingRes?.guestName,
            upcomingCheckIn: upcomingRes ? (upcomingRes.checkIn || upcomingRes.arrivalDate) : undefined,
            upcomingCheckOut: upcomingRes ? (upcomingRes.checkOut || upcomingRes.departureDate) : undefined,
            upcomingReservationId: upcomingRes?.id,
            upcomingReservationNumber: upcomingRes?.reservationNumber
        };
    });
};

export const RoomRack: React.FC = () => {
    const { setActivePage } = useNavigation();

    // Operating System Date & Rack Date
    const [rackDate, setRackDate] = useState<string>(() => getOperatingSystemDate());

    // Rooms State dynamically synchronized with central database
    const [rooms, setRooms] = useState<RoomRackItem[]>(() => deriveRoomsFromInventory(rackDate));

    useEffect(() => {
        const handleSync = (e: any) => {
            if (e?.detail?.type === 'SYSTEM_DATE_CHANGED' && e?.detail?.systemDate) {
                setRackDate(e.detail.systemDate);
            }
        };
        window.addEventListener('hotel_pms_sync_event', handleSync);
        return () => window.removeEventListener('hotel_pms_sync_event', handleSync);
    }, []);

    useEffect(() => {
        setRooms(deriveRoomsFromInventory(rackDate));
    }, [rackDate]);

    useEffect(() => {
        Promise.all([syncRoomTypesAndRoomsFromDB(), syncReservationsFromDB()]).then(() => {
            setRooms(deriveRoomsFromInventory(rackDate));
        });

        const unsub = subscribeToPMSEvents(() => {
            setRooms(deriveRoomsFromInventory(rackDate));
        });
        return () => unsub();
    }, [rackDate]);

    const persistRooms = (updated: RoomRackItem[]) => {
        setRooms(updated);
        try {
            localStorage.setItem('hotel_rooms_rack_v1', JSON.stringify(updated));
        } catch (e) {
            console.error(e);
        }
    };

    // View Options & Filters
    const [viewMode, setViewMode] = useState<'grid' | 'dense'>('grid');
    const [searchTerm, setSearchTerm] = useState('');
    const [filterBuilding, setFilterBuilding] = useState<string>('all');
    const [filterFloor, setFilterFloor] = useState<string>('all');
    const [filterType, setFilterType] = useState<string>('all');
    const [filterStatus, setFilterStatus] = useState<string>('all');

    // Modals
    const [selectedRoom, setSelectedRoom] = useState<RoomRackItem | null>(null);
    const [isQuickReserveOpen, setIsQuickReserveOpen] = useState(false);
    const [prefilledRoomNumber, setPrefilledRoomNumber] = useState<string>('');

    // Metrics & Counts
    const stats = useMemo(() => {
        const total = rooms.length;
        const occupied = rooms.filter(r => r.status === 'occupied').length;
        const reserved = rooms.filter(r => r.status === 'reserved').length;
        const clean = rooms.filter(r => r.status === 'clean').length;
        const dirty = rooms.filter(r => r.status === 'dirty').length;
        const inspected = rooms.filter(r => r.status === 'inspected').length;
        const ooo = rooms.filter(r => r.status === 'ooo').length;
        const available = clean + inspected;
        const occupancyRate = total > 0 ? Math.round(((occupied + reserved) / total) * 100) : 0;

        return { total, occupied, reserved, clean, dirty, inspected, ooo, available, occupancyRate };
    }, [rooms]);

    // Dynamic Buildings (derived from database, localStorage, and room mapping)
    const availableBuildings = useMemo(() => {
        const bMap = new Map<string, string>();
        bMap.set('1', 'Main Tower');
        bMap.set('2', 'Suites & Annex Wing');

        try {
            const raw = localStorage.getItem('hotel_buildings_v2');
            if (raw) {
                const parsed = JSON.parse(raw);
                if (Array.isArray(parsed)) {
                    parsed.forEach((b: any) => {
                        const id = String(b.id);
                        const name = b.title || b.name || `Building ${id}`;
                        bMap.set(id, name);
                    });
                }
            }
        } catch {}

        rooms.forEach(r => {
            if (r.buildingId) {
                bMap.set(r.buildingId, r.buildingName || getBuildingNameById(r.buildingId));
            }
        });

        return Array.from(bMap.entries()).map(([id, name]) => ({ id, name }));
    }, [rooms]);

    // Dynamic Floors and Room Types (derived dynamically from database & rooms, scoped to building if filtered)
    const availableFloors = useMemo(() => {
        const relevantRooms = filterBuilding === 'all'
            ? rooms
            : rooms.filter(r => r.buildingId === filterBuilding || r.buildingName === filterBuilding);
        const list = Array.from(new Set(relevantRooms.map(r => r.floor))).sort((a, b) => a - b);
        return list.length > 0 ? list : [1, 2, 3, 4, 5];
    }, [rooms, filterBuilding]);

    // Auto reset floor if selected floor does not exist in selected building
    useEffect(() => {
        if (filterFloor !== 'all' && !availableFloors.includes(parseInt(filterFloor, 10))) {
            setFilterFloor('all');
        }
    }, [filterBuilding, availableFloors, filterFloor]);

    const availableRoomTypes = useMemo(() => {
        const fromRooms = Array.from(new Set(rooms.map(r => r.roomType).filter(Boolean)));
        const fromEngine = getDynamicRoomTypes().map(t => t.name);
        return Array.from(new Set([...fromRooms, ...fromEngine])).filter(Boolean);
    }, [rooms]);

    // Filter Logic
    const filteredRooms = useMemo(() => {
        return rooms.filter(room => {
            const matchesSearch = 
                room.roomNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
                (room.guestName?.toLowerCase().includes(searchTerm.toLowerCase()) ?? false) ||
                room.roomType.toLowerCase().includes(searchTerm.toLowerCase()) ||
                (room.buildingName?.toLowerCase().includes(searchTerm.toLowerCase()) ?? false);
            
            const matchesBuilding = filterBuilding === 'all' || room.buildingId === filterBuilding || room.buildingName === filterBuilding;
            const matchesFloor = filterFloor === 'all' || room.floor.toString() === filterFloor;
            const matchesType = filterType === 'all' || room.roomType === filterType;
            const matchesStatus = filterStatus === 'all' || room.status === filterStatus;

            return matchesSearch && matchesBuilding && matchesFloor && matchesType && matchesStatus;
        });
    }, [rooms, searchTerm, filterBuilding, filterFloor, filterType, filterStatus]);

    // Group Rooms by Floor
    const floorsMap = useMemo(() => {
        const map = new Map<number, RoomRackItem[]>();
        filteredRooms.forEach(room => {
            const list = map.get(room.floor) || [];
            list.push(room);
            map.set(room.floor, list);
        });
        // Sort floors ascending
        return Array.from(map.entries()).sort((a, b) => a[0] - b[0]);
    }, [filteredRooms]);

    // Status helpers
    const getStatusTheme = (status: RoomRackItem['status']) => {
        switch (status) {
            case 'clean':
                return {
                    badge: 'bg-emerald-50 text-emerald-700 border-emerald-200',
                    dot: 'bg-emerald-500',
                    bar: 'bg-emerald-500',
                    border: 'hover:border-emerald-400',
                    label: 'Vacant Clean',
                    icon: <Sparkles size={11} />
                };
            case 'inspected':
                return {
                    badge: 'bg-blue-50 text-blue-700 border-blue-200',
                    dot: 'bg-blue-500',
                    bar: 'bg-blue-500',
                    border: 'hover:border-blue-400',
                    label: 'Inspected',
                    icon: <CheckCircle2 size={11} />
                };
            case 'occupied':
                return {
                    badge: 'bg-indigo-50 text-indigo-700 border-indigo-200',
                    dot: 'bg-indigo-600',
                    bar: 'bg-indigo-600',
                    border: 'hover:border-indigo-400',
                    label: 'Occupied',
                    icon: <User size={11} />
                };
            case 'reserved':
                return {
                    badge: 'bg-amber-50 text-amber-700 border-amber-200',
                    dot: 'bg-amber-500',
                    bar: 'bg-amber-500',
                    border: 'hover:border-amber-400',
                    label: 'Reserved (Arriving)',
                    icon: <Calendar size={11} />
                };
            case 'dirty':
                return {
                    badge: 'bg-rose-50 text-rose-700 border-rose-200',
                    dot: 'bg-rose-500',
                    bar: 'bg-rose-500',
                    border: 'hover:border-rose-400',
                    label: 'Turnover Dirty',
                    icon: <BedDouble size={11} />
                };
            case 'ooo':
                return {
                    badge: 'bg-slate-100 text-slate-700 border-slate-300',
                    dot: 'bg-slate-500',
                    bar: 'bg-slate-500',
                    border: 'hover:border-slate-400',
                    label: 'Out of Order',
                    icon: <Wrench size={11} />
                };
            default:
                return {
                    badge: 'bg-emerald-50 text-emerald-700 border-emerald-200',
                    dot: 'bg-emerald-500',
                    bar: 'bg-emerald-500',
                    border: 'hover:border-emerald-400',
                    label: 'Vacant Clean',
                    icon: <Sparkles size={11} />
                };
        }
    };

    // Quick status updater for selected room with direct Database & PMS Sync
    const handleUpdateRoomStatus = (roomId: number, newStatus: RoomRackItem['status']) => {
        const targetRoom = rooms.find(r => r.id === roomId);
        if (targetRoom) {
            if (newStatus === 'clean' || newStatus === 'dirty' || newStatus === 'inspected') {
                const titleCase = newStatus === 'clean' ? 'Clean' : newStatus === 'dirty' ? 'Dirty' : 'Inspected';
                updateRoomHousekeepingInDB(targetRoom.roomNumber, titleCase);
            } else if (newStatus === 'ooo') {
                updateRoomHousekeepingInDB(targetRoom.roomNumber, 'Dirty');
            }
        }

        const updated = rooms.map(r => {
            if (r.id === roomId) {
                return {
                    ...r,
                    status: newStatus,
                    guestName: newStatus === 'occupied' ? (r.guestName || 'Walk-In Guest') : undefined
                };
            }
            return r;
        });
        persistRooms(updated);
        if (selectedRoom && selectedRoom.id === roomId) {
            setSelectedRoom({ ...selectedRoom, status: newStatus });
        }
    };

    // Handle book room trigger
    const handleBookRoom = (room: RoomRackItem) => {
        setPrefilledRoomNumber(room.roomNumber);
        setIsQuickReserveOpen(true);
    };

    return (
        <div className="p-2 sm:p-3 max-w-[1440px] mx-auto space-y-2.5 font-sans select-none animate-in fade-in duration-150">
            {/* Top Operational Header */}
            <div className="bg-white rounded-lg border border-gray-200/80 shadow-2xs px-3 py-1.5 flex items-center justify-between gap-2.5 flex-shrink-0">
                <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-7 h-7 rounded-lg bg-[#1e3a8a] text-white flex items-center justify-center shadow-xs flex-shrink-0">
                        <BedDouble size={14} />
                    </div>
                    <div>
                        <div className="flex items-center gap-2">
                            <h1 className="text-xs font-bold text-gray-900 tracking-tight leading-none">
                                Interactive Room Rack Grid
                            </h1>
                            <span className="px-1.5 py-0.2 text-[8.5px] rounded bg-blue-50 text-blue-700 border border-blue-200 leading-none">
                                {stats.occupancyRate}% Occupied
                            </span>
                        </div>
                        <p className="text-[10px] text-gray-500 mt-0.5 leading-tight">
                            Live physical room inventory, housekeeping status &amp; direct allocation matrix
                        </p>
                    </div>
                </div>

                {/* Header Actions */}
                <div className="flex items-center gap-2 flex-wrap shrink-0">
                    {/* Operating Date Selector */}
                    <div className="flex items-center gap-1.5 bg-slate-50 rounded-lg border border-slate-200 px-2.5 h-8 text-xs font-semibold text-slate-700 shadow-2xs">
                        <Calendar size={13} className="text-blue-700" />
                        <span className="text-[11px] text-slate-500">Date:</span>
                        <input
                            type="date"
                            value={rackDate}
                            onChange={(e) => {
                                if (e.target.value) setRackDate(e.target.value);
                            }}
                            className="bg-transparent text-xs font-mono font-bold text-slate-900 outline-none cursor-pointer"
                            title="Select date to inspect room rack occupancy"
                        />
                    </div>

                    {/* View Switcher */}
                    <div className="flex p-0.5 bg-slate-100 rounded-lg border border-slate-200 h-8 items-center">
                        <button
                            type="button"
                            onClick={() => setViewMode('grid')}
                            className={`h-7 px-2.5 rounded-md text-xs flex items-center gap-1 cursor-pointer transition-all ${
                                viewMode === 'grid' ? 'bg-white text-blue-900 shadow-2xs font-semibold' : 'text-slate-500 hover:text-slate-800'
                            }`}
                            title="Floor Grid View"
                        >
                            <LayoutGrid size={13} />
                            <span className="hidden sm:inline">Grid</span>
                        </button>
                        <button
                            type="button"
                            onClick={() => setViewMode('dense')}
                            className={`h-7 px-2.5 rounded-md text-xs flex items-center gap-1 cursor-pointer transition-all ${
                                viewMode === 'dense' ? 'bg-white text-blue-900 shadow-2xs font-semibold' : 'text-slate-500 hover:text-slate-800'
                            }`}
                            title="Dense Matrix View"
                        >
                            <List size={13} />
                            <span className="hidden sm:inline">Dense</span>
                        </button>
                    </div>

                    <button
                        type="button"
                        onClick={() => setActivePage('front-desk')}
                        className="btn-secondary"
                    >
                        <span>Front Desk Hub</span>
                        <ArrowRight size={13} />
                    </button>

                    <button
                        type="button"
                        onClick={() => {
                            setPrefilledRoomNumber('');
                            setIsQuickReserveOpen(true);
                        }}
                        className="h-8 px-3.5 bg-[#1e3a8a] hover:bg-blue-900 text-white rounded-lg text-xs flex items-center gap-1.5 cursor-pointer transition-all shadow-xs"
                    >
                        <Plus size={14} className="stroke-[2.5]" />
                        <span>Walk-In / Booking</span>
                    </button>
                </div>
            </div>

            {/* Interactive KPI Filter Pills (Clicking instantly filters the grid) */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
                <div
                    onClick={() => setFilterStatus('all')}
                    className={`bg-white p-2.5 rounded-xl border transition-all cursor-pointer shadow-2xs ${
                        filterStatus === 'all' ? 'border-blue-600 ring-2 ring-blue-500/20 bg-blue-50/20' : 'border-slate-200/90 hover:border-slate-300'
                    }`}
                >
                    <div className="flex items-center justify-between text-slate-500">
                        <span className="text-[10px] uppercase tracking-wider">Total Rooms</span>
                        <BedDouble size={13} className="text-slate-600" />
                    </div>
                    <div className="text-lg font-black text-slate-900 font-mono mt-0.5">{stats.total}</div>
                    <span className="text-[9.5px] text-slate-400 font-medium">100% Total Inventory</span>
                </div>

                <div
                    onClick={() => setFilterStatus('occupied')}
                    className={`bg-white p-2.5 rounded-xl border transition-all cursor-pointer shadow-2xs ${
                        filterStatus === 'occupied' ? 'border-indigo-600 ring-2 ring-indigo-500/20 bg-indigo-50/20' : 'border-slate-200/90 hover:border-slate-300'
                    }`}
                >
                    <div className="flex items-center justify-between text-indigo-700">
                        <span className="text-[10px] uppercase tracking-wider">Occupied</span>
                        <User size={13} className="text-indigo-600" />
                    </div>
                    <div className="text-lg font-black text-indigo-900 font-mono mt-0.5">{stats.occupied}</div>
                    <span className="text-[9.5px] text-indigo-600 font-semibold">{stats.occupancyRate}% In-House Guests</span>
                </div>

                <div
                    onClick={() => setFilterStatus('clean')}
                    className={`bg-white p-2.5 rounded-xl border transition-all cursor-pointer shadow-2xs ${
                        filterStatus === 'clean' ? 'border-emerald-600 ring-2 ring-emerald-500/20 bg-emerald-50/20' : 'border-slate-200/90 hover:border-slate-300'
                    }`}
                >
                    <div className="flex items-center justify-between text-emerald-700">
                        <span className="text-[10px] uppercase tracking-wider">Vacant Clean</span>
                        <Sparkles size={13} className="text-emerald-600" />
                    </div>
                    <div className="text-lg font-black text-emerald-900 font-mono mt-0.5">{stats.clean}</div>
                    <span className="text-[9.5px] text-emerald-600 font-semibold">Ready for Check-In</span>
                </div>

                <div
                    onClick={() => setFilterStatus('inspected')}
                    className={`bg-white p-2.5 rounded-xl border transition-all cursor-pointer shadow-2xs ${
                        filterStatus === 'inspected' ? 'border-blue-600 ring-2 ring-blue-500/20 bg-blue-50/20' : 'border-slate-200/90 hover:border-slate-300'
                    }`}
                >
                    <div className="flex items-center justify-between text-blue-700">
                        <span className="text-[10px] uppercase tracking-wider">Inspected</span>
                        <CheckCircle2 size={13} className="text-blue-600" />
                    </div>
                    <div className="text-lg font-black text-blue-900 font-mono mt-0.5">{stats.inspected}</div>
                    <span className="text-[9.5px] text-blue-600 font-semibold">Supervisor Verified</span>
                </div>

                <div
                    onClick={() => setFilterStatus('dirty')}
                    className={`bg-white p-2.5 rounded-xl border transition-all cursor-pointer shadow-2xs ${
                        filterStatus === 'dirty' ? 'border-rose-600 ring-2 ring-rose-500/20 bg-rose-50/20' : 'border-slate-200/90 hover:border-slate-300'
                    }`}
                >
                    <div className="flex items-center justify-between text-rose-700">
                        <span className="text-[10px] uppercase tracking-wider">Turnover Dirty</span>
                        <BedDouble size={13} className="text-rose-600" />
                    </div>
                    <div className="text-lg font-black text-rose-900 font-mono mt-0.5">{stats.dirty}</div>
                    <span className="text-[9.5px] text-rose-600 font-semibold">Requires Housekeeping</span>
                </div>

                <div
                    onClick={() => setFilterStatus('ooo')}
                    className={`bg-white p-2.5 rounded-xl border transition-all cursor-pointer shadow-2xs ${
                        filterStatus === 'ooo' ? 'border-slate-600 ring-2 ring-slate-500/20 bg-slate-100' : 'border-slate-200/90 hover:border-slate-300'
                    }`}
                >
                    <div className="flex items-center justify-between text-slate-700">
                        <span className="text-[10px] uppercase tracking-wider">Out of Order</span>
                        <Wrench size={13} className="text-slate-600" />
                    </div>
                    <div className="text-lg font-black text-slate-900 font-mono mt-0.5">{stats.ooo}</div>
                    <span className="text-[9.5px] text-slate-500 font-medium">Under Maintenance</span>
                </div>
            </div>

            {/* Filter Toolbar */}
            <div className="bg-white p-2.5 rounded-xl border border-slate-200/90 shadow-2xs flex flex-col md:flex-row items-center justify-between gap-2.5">
                <div className="relative w-full md:w-72">
                    <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                        type="text"
                        placeholder="Search Room #, Guest, Type, Building..."
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                        className="w-full h-8 pl-8 pr-3 bg-slate-50/60 border border-slate-200 rounded-lg text-xs text-slate-800 placeholder-slate-400 outline-none focus:bg-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500/20 transition-all font-medium"
                    />
                </div>

                <div className="flex items-center gap-2 w-full md:w-auto flex-wrap sm:flex-nowrap">
                    {/* Building Filter */}
                    <div className="flex items-center gap-1.5">
                        <span className="text-[10px] text-slate-400 uppercase font-semibold">Building:</span>
                        <select
                            value={filterBuilding}
                            onChange={e => setFilterBuilding(e.target.value)}
                            className="h-8 px-2 bg-white border border-slate-200 rounded-lg text-xs font-semibold text-slate-700 outline-none cursor-pointer focus:border-blue-500"
                        >
                            <option value="all">All Buildings</option>
                            {availableBuildings.map(b => (
                                <option key={b.id} value={b.id}>{b.name}</option>
                            ))}
                        </select>
                    </div>

                    <div className="flex items-center gap-1.5">
                        <span className="text-[10px] text-slate-400 uppercase font-semibold">Floor:</span>
                        <select
                            value={filterFloor}
                            onChange={e => setFilterFloor(e.target.value)}
                            className="h-8 px-2 bg-white border border-slate-200 rounded-lg text-xs font-semibold text-slate-700 outline-none cursor-pointer focus:border-blue-500"
                        >
                            <option value="all">All Floors</option>
                            {availableFloors.map(fl => (
                                <option key={fl} value={fl.toString()}>Floor {fl}</option>
                            ))}
                        </select>
                    </div>

                    <div className="flex items-center gap-1.5">
                        <span className="text-[10px] text-slate-400 uppercase font-semibold">Type:</span>
                        <select
                            value={filterType}
                            onChange={e => setFilterType(e.target.value)}
                            className="h-8 px-2 bg-white border border-slate-200 rounded-lg text-xs font-semibold text-slate-700 outline-none cursor-pointer focus:border-blue-500"
                        >
                            <option value="all">All Room Types</option>
                            {availableRoomTypes.map(t => (
                                <option key={t} value={t}>{t}</option>
                            ))}
                        </select>
                    </div>

                    <div className="flex items-center gap-1.5">
                        <span className="text-[10px] text-slate-400 uppercase font-semibold">Status:</span>
                        <select
                            value={filterStatus}
                            onChange={e => setFilterStatus(e.target.value)}
                            className="h-8 px-2 bg-white border border-slate-200 rounded-lg text-xs font-semibold text-slate-700 outline-none cursor-pointer focus:border-blue-500"
                        >
                            <option value="all">All Statuses</option>
                            <option value="clean">Vacant Clean</option>
                            <option value="inspected">Inspected</option>
                            <option value="occupied">Occupied</option>
                            <option value="dirty">Turnover Dirty</option>
                            <option value="ooo">Out of Order</option>
                        </select>
                    </div>

                    <button
                        type="button"
                        onClick={() => {
                            setSearchTerm('');
                            setFilterBuilding('all');
                            setFilterFloor('all');
                            setFilterType('all');
                            setFilterStatus('all');
                        }}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
                        title="Reset Filters"
                    >
                        <RefreshCw size={13} />
                    </button>
                </div>
            </div>

            {/* Display: Floor-by-Floor Matrix */}
            {floorsMap.length > 0 ? (
                floorsMap.map(([floorNum, floorRooms]) => {
                    const bName = floorRooms[0]?.buildingName;
                    return (
                        <div key={floorNum} className="space-y-2">
                            {/* Floor Header Badge */}
                            <div className="flex items-center justify-between px-1">
                                <div className="flex items-center gap-2">
                                    <div className="w-5 h-5 rounded-md bg-[#1e3a8a] text-white flex items-center justify-center font-black text-[10px]">
                                        {floorNum}
                                    </div>
                                    <h2 className="text-xs font-black text-slate-800 uppercase tracking-wider">
                                        {floorNum === 1 ? 'Floor 1 — Lobby & Executive Wing' : 
                                         floorNum === 5 ? 'Floor 5 — Penthouse & Presidential Suites' : 
                                         `Floor ${floorNum} Guest Rooms`}
                                    </h2>
                                    {bName && (
                                        <span className="text-[10px] font-bold text-blue-700 bg-blue-50 border border-blue-200/80 px-2 py-0.5 rounded-md flex items-center gap-1">
                                            <Building2 size={10} className="text-blue-600" />
                                            {bName}
                                        </span>
                                    )}
                                    <span className="text-[10.5px] text-slate-400 font-medium">({floorRooms.length} Rooms)</span>
                                </div>

                                <span className="text-[10px] text-slate-500 font-semibold">
                                    {floorRooms.filter(r => r.status === 'clean' || r.status === 'inspected').length} Available • {floorRooms.filter(r => r.status === 'occupied').length} Occupied
                                </span>
                            </div>

                        {/* Rooms Grid */}
                        {viewMode === 'grid' ? (
                            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 2xl:grid-cols-6 gap-2.5">
                                {floorRooms.map(room => {
                                    const theme = getStatusTheme(room.status);
                                    const isAvailable = room.status === 'clean' || room.status === 'inspected';

                                    return (
                                        <div
                                            key={room.id}
                                            onClick={() => setSelectedRoom(room)}
                                            className={`bg-white rounded-xl border border-slate-200/90 shadow-2xs hover:shadow-xs transition-all cursor-pointer flex flex-col justify-between overflow-hidden relative group ${theme.border}`}
                                        >
                                            {/* Top Color Accent Line */}
                                            <div className={`h-1 w-full ${theme.bar}`} />

                                            <div className="p-2.5 flex-1 flex flex-col justify-between space-y-2">
                                                {/* Card Header: Room Number & Status Badge */}
                                                <div className="flex items-start justify-between">
                                                    <div>
                                                        <div className="flex items-center gap-1 text-[10px] text-slate-400 font-medium">
                                                            <MapPin size={9} />
                                                            <span>Floor {room.floor}</span>
                                                            {room.buildingName && (
                                                                <span className="text-[9px] text-slate-400">• {room.buildingName}</span>
                                                            )}
                                                        </div>
                                                        <h3 className="text-base font-black text-slate-900 leading-tight font-mono tracking-tight">
                                                            {room.roomNumber}
                                                        </h3>
                                                    </div>

                                                    <span className={`px-2 py-0.5 rounded-full text-[10px] border flex items-center gap-1 ${theme.badge}`}>
                                                        {theme.icon}
                                                        <span>{theme.label}</span>
                                                    </span>
                                                </div>

                                                {/* Room Type & Bed */}
                                                <div>
                                                    <div className="flex items-center justify-between">
                                                        <span className="text-[10.5px] text-slate-800">
                                                            {room.roomType}
                                                        </span>
                                                        <span className="text-[9.5px] font-medium text-slate-500">
                                                            {room.bedType} Bed
                                                        </span>
                                                    </div>

                                                    {/* Features */}
                                                    <div className="flex flex-wrap gap-1 mt-1">
                                                        {room.features.slice(0, 2).map((feat, idx) => (
                                                            <span key={idx} className="text-[9px] px-1.5 py-0.2 rounded bg-slate-100 text-slate-600 font-medium">
                                                                {feat}
                                                            </span>
                                                        ))}
                                                    </div>
                                                </div>

                                                {/* Middle State: Guest Info if Occupied vs Available Note */}
                                                {room.status === 'occupied' && room.guestName ? (
                                                    <div className="bg-indigo-50/70 border border-indigo-100 p-2 rounded-lg text-xs">
                                                        <p className="text-indigo-950 truncate flex items-center gap-1">
                                                            <User size={11} className="text-indigo-600 flex-shrink-0" />
                                                            <span>{room.guestName}</span>
                                                        </p>
                                                        <p className="text-[10px] text-indigo-700 flex items-center gap-1 mt-0.5 font-medium">
                                                            <Calendar size={10} /> Departs: {room.checkoutDate}
                                                        </p>
                                                    </div>
                                                ) : room.status === 'reserved' && room.guestName ? (
                                                    <div className="bg-amber-50/80 border border-amber-200/90 p-2 rounded-lg text-xs">
                                                        <div className="flex items-center justify-between">
                                                            <span className="text-[9.5px] font-bold text-amber-800 uppercase tracking-wider flex items-center gap-1">
                                                                <Clock size={10} /> Arriving Today
                                                            </span>
                                                            <span className="text-[9px] font-mono bg-amber-100 text-amber-900 px-1 py-0.2 rounded font-semibold">
                                                                {room.reservationNumber || 'RES'}
                                                            </span>
                                                        </div>
                                                        <p className="text-amber-950 truncate font-semibold flex items-center gap-1 mt-1">
                                                            <User size={11} className="text-amber-700 shrink-0" />
                                                            <span>{room.guestName}</span>
                                                        </p>
                                                    </div>
                                                ) : room.upcomingGuestName ? (
                                                    <div className="bg-blue-50/80 border border-blue-200/90 p-2 rounded-lg text-xs">
                                                        <div className="flex items-center justify-between">
                                                            <span className="text-[9.5px] font-bold text-blue-700 uppercase tracking-wider flex items-center gap-1">
                                                                <Clock size={10} /> Upcoming Arrival
                                                            </span>
                                                            <span className="text-[9px] font-mono bg-blue-100 text-blue-800 px-1 py-0.2 rounded font-semibold">
                                                                {room.upcomingCheckIn}
                                                            </span>
                                                        </div>
                                                        <p className="text-blue-950 truncate font-semibold flex items-center gap-1 mt-1">
                                                            <User size={11} className="text-blue-600 shrink-0" />
                                                            <span>{room.upcomingGuestName}</span>
                                                        </p>
                                                        <p className="text-[9.5px] text-blue-600 font-mono mt-0.5">
                                                            {room.upcomingReservationNumber}
                                                        </p>
                                                    </div>
                                                ) : room.status === 'ooo' ? (
                                                    <div className="bg-slate-100 p-1.5 rounded-lg text-[10px] text-slate-600 flex items-center gap-1.5">
                                                        <Wrench size={11} className="text-slate-500" />
                                                        <span className="truncate">{room.maintenanceReason || 'Maintenance in progress'}</span>
                                                    </div>
                                                ) : room.status === 'dirty' ? (
                                                    <div className="bg-rose-50 p-1.5 rounded-lg text-[10px] text-rose-700 font-semibold flex items-center justify-between">
                                                        <span>Housekeeper: {room.housekeeper || 'Unassigned'}</span>
                                                    </div>
                                                ) : (
                                                    <div className="bg-emerald-50/70 p-1.5 rounded-lg text-[10px] text-emerald-800 flex items-center justify-between">
                                                        <span>Ready for Check-In</span>
                                                        <Sparkles size={11} className="text-emerald-600" />
                                                    </div>
                                                )}

                                                {/* Card Footer: Rate & Action Button */}
                                                <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                                                    <div>
                                                        <span className="text-[8px] text-slate-400 uppercase leading-none block">Tariff</span>
                                                        <span className="text-xs font-black text-slate-900 font-mono">
                                                            ৳{room.rate.toLocaleString()}
                                                        </span>
                                                    </div>

                                                    <div className="flex items-center gap-1">
                                                        {isAvailable ? (
                                                            <button
                                                                type="button"
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    handleBookRoom(room);
                                                                }}
                                                                className="h-6.5 px-2.5 bg-[#1e3a8a] hover:bg-blue-900 text-white rounded-md text-[10px] cursor-pointer transition-colors shadow-2xs"
                                                            >
                                                                Assign
                                                            </button>
                                                        ) : (
                                                            <button
                                                                type="button"
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    setSelectedRoom(room);
                                                                }}
                                                                className="h-6.5 px-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-md text-[10px] font-semibold cursor-pointer transition-colors shadow-2xs"
                                                            >
                                                                Details
                                                            </button>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        ) : (
                            /* Dense Matrix / Tape Row */
                            <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-1.5">
                                {floorRooms.map(room => {
                                    const theme = getStatusTheme(room.status);
                                    return (
                                        <div
                                            key={room.id}
                                            onClick={() => setSelectedRoom(room)}
                                            className={`p-2 rounded-lg border bg-white shadow-2xs cursor-pointer hover:shadow-xs transition-all flex flex-col justify-between ${theme.border}`}
                                        >
                                            <div className="flex items-center justify-between">
                                                <span className="text-xs font-black text-slate-900 font-mono">{room.roomNumber}</span>
                                                <span className={`w-2 h-2 rounded-full ${theme.dot}`}></span>
                                            </div>
                                            <p className="text-[9.5px] font-medium text-slate-500 truncate mt-1">
                                                {room.status === 'occupied' ? (room.guestName || 'Occupied') : room.upcomingGuestName ? `Next: ${room.upcomingCheckIn?.slice(5)} (${room.upcomingGuestName.split(' ')[0]})` : room.roomType}
                                            </p>
                                            <div className="flex items-center justify-between text-[9px] mt-1 pt-1 border-t border-slate-100">
                                                <span className="text-slate-700">৳{room.rate}</span>
                                                <span className={`px-1 rounded text-[8px] ${theme.badge}`}>
                                                    {theme.label.split(' ')[0]}
                                                </span>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                    );
                })
            ) : (
                <div className="text-center py-12 bg-white rounded-xl border border-slate-200">
                    <BedDouble size={28} className="text-slate-300 mx-auto mb-2" />
                    <p className="text-xs text-slate-700">No rooms match filter criteria</p>
                    <p className="text-[11px] text-slate-400 mt-0.5">Try clearing the search query or selecting All Buildings / Floors</p>
                </div>
            )}

            {/* Room Details & Housekeeping Action Drawer / Modal */}
            {selectedRoom && (
                <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 sm:p-6 overflow-y-auto animate-in fade-in duration-150">
                    <div className="bg-white rounded-2xl shadow-2xl border border-slate-200/90 max-w-[540px] w-full overflow-hidden animate-in zoom-in-95 duration-150 my-auto">
                        {/* Header */}
                        <div className="px-6 py-4.5 border-b border-slate-100 flex items-center justify-between bg-slate-50/70">
                            <div className="flex items-center gap-3.5">
                                <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-[#1e3a8a] to-blue-700 text-white flex items-center justify-center font-mono font-bold text-base shadow-sm ring-2 ring-blue-100">
                                    {selectedRoom.roomNumber}
                                </div>
                                <div>
                                    <div className="flex items-center gap-2">
                                        <h3 className="text-sm font-bold text-slate-900">Room {selectedRoom.roomNumber} Operations</h3>
                                        <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-semibold border ${getStatusTheme(selectedRoom.status).badge}`}>
                                            {getStatusTheme(selectedRoom.status).label}
                                        </span>
                                    </div>
                                    <p className="text-xs text-slate-500 font-medium mt-0.5">
                                        {selectedRoom.buildingName ? `${selectedRoom.buildingName} • ` : ''}Floor {selectedRoom.floor} • {selectedRoom.roomType} ({selectedRoom.bedType} Bed)
                                    </p>
                                </div>
                            </div>
                            <button
                                type="button"
                                onClick={() => setSelectedRoom(null)}
                                className="w-8 h-8 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 flex items-center justify-center cursor-pointer transition-colors"
                            >
                                <X size={18} />
                            </button>
                        </div>

                        {/* Modal Body */}
                        <div className="p-6 space-y-4">
                            {/* Room Specifications Table */}
                            <div className="bg-slate-50/80 rounded-xl p-3.5 border border-slate-200/80 grid grid-cols-2 gap-3 text-xs">
                                <div>
                                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Tariff (Rate Plan)</span>
                                    <div className="flex items-baseline gap-1 mt-1">
                                        <span className="font-mono text-slate-900 text-base font-bold">৳{selectedRoom.rate.toLocaleString()}</span>
                                        <span className="text-[11px] text-slate-500 font-medium">/ night</span>
                                    </div>
                                </div>
                                <div>
                                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">Housekeeper In-Charge</span>
                                    <select
                                        value={selectedRoom.housekeeper || 'Fatima Begum (Floor 1)'}
                                        onChange={(e) => {
                                            const val = e.target.value;
                                            setSelectedRoom({ ...selectedRoom, housekeeper: val });
                                            const updated = rooms.map(r => r.id === selectedRoom.id ? { ...r, housekeeper: val } : r);
                                            persistRooms(updated);
                                        }}
                                        className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-semibold text-slate-800 outline-none cursor-pointer focus:border-blue-500 shadow-2xs"
                                    >
                                        <option value="Fatima Begum (Floor 1)">Fatima Begum (Floor 1)</option>
                                        <option value="Rahima Khatun (Floor 2)">Rahima Khatun (Floor 2)</option>
                                        <option value="Salma Akter (Floor 3)">Salma Akter (Floor 3)</option>
                                        <option value="Akhtar Hossain (Floor 4/5)">Akhtar Hossain (Floor 4/5)</option>
                                        <option value="Duty Housekeeping Team">Duty Housekeeping Team</option>
                                    </select>
                                </div>
                                <div className="col-span-2 pt-2 border-t border-slate-200/60">
                                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Room Amenities</span>
                                    <div className="flex flex-wrap gap-1.5 mt-1.5">
                                        {selectedRoom.features.map((feat, i) => (
                                            <span key={i} className="px-2.5 py-0.5 bg-white border border-slate-200 rounded-md text-[11px] text-slate-700 font-medium shadow-2xs">
                                                {feat}
                                            </span>
                                        ))}
                                    </div>
                                </div>
                            </div>

                            {/* Occupant Information - If in-house occupied */}
                            {selectedRoom.status === 'occupied' && selectedRoom.guestName && (
                                <div className="bg-indigo-50/90 border border-indigo-200/90 rounded-xl p-3.5 space-y-2 text-xs text-indigo-950 shadow-2xs">
                                    <div className="flex items-center justify-between">
                                        <span className="text-[10px] text-indigo-800 font-bold uppercase tracking-wider flex items-center gap-1.5">
                                            <User size={13} className="text-indigo-700" />
                                            <span>In-House Resident</span>
                                        </span>
                                        <span className="px-2 py-0.5 bg-indigo-200/60 text-indigo-900 rounded-full text-[10px] font-bold">
                                            Occupied
                                        </span>
                                    </div>
                                    <div className="flex items-center justify-between pt-1">
                                        <div className="flex items-center gap-2.5">
                                            <div className="w-8 h-8 rounded-full bg-indigo-200 text-indigo-800 flex items-center justify-center font-bold text-xs">
                                                {selectedRoom.guestName ? selectedRoom.guestName.slice(0, 2).toUpperCase() : 'GS'}
                                            </div>
                                            <div>
                                                <div className="font-bold text-slate-900 text-sm leading-tight">{selectedRoom.guestName}</div>
                                                <div className="text-[11px] text-slate-500 font-mono flex items-center gap-1 mt-0.5">
                                                    <Phone size={11} className="text-slate-400" />
                                                    <span>{selectedRoom.phone || '+880 1711-000000'}</span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="pt-2 border-t border-indigo-200/60 flex items-center justify-between text-[11px] text-indigo-900 font-medium">
                                        <span>Stay Period:</span>
                                        <span className="font-mono font-bold text-slate-800">{selectedRoom.checkIn} → {selectedRoom.checkoutDate}</span>
                                    </div>
                                </div>
                            )}

                            {/* Occupant Information - If reserved (arriving today) */}
                            {selectedRoom.status === 'reserved' && (
                                <div className="bg-amber-50/90 border border-amber-200/90 rounded-xl p-3.5 space-y-2.5 text-xs text-amber-950 shadow-2xs">
                                    <div className="flex items-center justify-between">
                                        <span className="text-[10px] text-amber-800 font-bold uppercase tracking-wider flex items-center gap-1.5">
                                            <Calendar size={13} className="text-amber-700" />
                                            <span>Incoming Reserved Guest</span>
                                        </span>
                                        <span className="px-2 py-0.5 bg-amber-200/70 text-amber-900 rounded-full text-[10px] font-bold">
                                            Arriving Today
                                        </span>
                                    </div>
                                    <div className="flex items-center justify-between pt-0.5">
                                        <div className="flex items-center gap-2.5">
                                            <div className="w-8 h-8 rounded-full bg-amber-200 text-amber-800 flex items-center justify-center font-bold text-xs">
                                                {selectedRoom.guestName ? selectedRoom.guestName.slice(0, 2).toUpperCase() : 'GU'}
                                            </div>
                                            <div>
                                                <div className="font-bold text-slate-900 text-sm leading-tight">{selectedRoom.guestName || 'Valued Guest'}</div>
                                                <div className="text-[11px] text-slate-500 font-mono flex items-center gap-1 mt-0.5">
                                                    <Phone size={11} className="text-slate-400" />
                                                    <span>{selectedRoom.phone || '+880 1711-000000'}</span>
                                                </div>
                                            </div>
                                        </div>
                                        {selectedRoom.reservationNumber && (
                                            <div className="text-right">
                                                <span className="text-[10px] text-slate-500 block uppercase font-medium">Booking Ref</span>
                                                <span className="font-mono font-bold text-blue-700 text-xs bg-blue-50 px-2 py-0.5 rounded border border-blue-200 inline-block">
                                                    {selectedRoom.reservationNumber}
                                                </span>
                                            </div>
                                        )}
                                    </div>
                                    <div className="pt-2 border-t border-amber-200/60 flex items-center justify-between text-[11px] text-amber-900 font-medium">
                                        <span>Expected Stay:</span>
                                        <span className="font-mono font-bold text-slate-800">{selectedRoom.checkIn} → {selectedRoom.checkoutDate}</span>
                                    </div>
                                </div>
                            )}

                            {/* Scheduled Future Reservation Information */}
                            {selectedRoom.status !== 'occupied' && selectedRoom.status !== 'reserved' && selectedRoom.upcomingGuestName && (
                                <div className="bg-blue-50/90 border border-blue-200/90 rounded-xl p-3.5 space-y-2.5 text-xs text-blue-950 shadow-2xs">
                                    <div className="flex items-center justify-between">
                                        <span className="text-[10px] text-blue-800 font-bold uppercase tracking-wider flex items-center gap-1.5">
                                            <Clock size={13} className="text-blue-700" />
                                            <span>Scheduled Future Reservation</span>
                                        </span>
                                        <span className="px-2 py-0.5 bg-blue-200/70 text-blue-900 rounded-full text-[10px] font-bold">
                                            Arr: {selectedRoom.upcomingCheckIn}
                                        </span>
                                    </div>
                                    <div className="flex items-center justify-between pt-0.5">
                                        <div className="flex items-center gap-2.5">
                                            <div className="w-8 h-8 rounded-full bg-blue-200 text-blue-800 flex items-center justify-center font-bold text-xs">
                                                {selectedRoom.upcomingGuestName ? selectedRoom.upcomingGuestName.slice(0, 2).toUpperCase() : 'GU'}
                                            </div>
                                            <div>
                                                <div className="font-bold text-slate-900 text-sm leading-tight">{selectedRoom.upcomingGuestName}</div>
                                                <div className="text-[11px] text-slate-500 font-mono flex items-center gap-1 mt-0.5">
                                                    <span>Ref: {selectedRoom.upcomingReservationNumber}</span>
                                                </div>
                                            </div>
                                        </div>
                                        <button
                                            type="button"
                                            onClick={() => setActivePage('front-desk')}
                                            className="px-2.5 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-[10.5px] font-semibold cursor-pointer shadow-2xs"
                                        >
                                            View Front Desk
                                        </button>
                                    </div>
                                    <div className="pt-2 border-t border-blue-200/60 flex items-center justify-between text-[11px] text-blue-900 font-medium">
                                        <span>Scheduled Period:</span>
                                        <span className="font-mono font-bold text-slate-800">{selectedRoom.upcomingCheckIn} → {selectedRoom.upcomingCheckOut}</span>
                                    </div>
                                </div>
                            )}

                            {/* Turnover Notice - If dirty */}
                            {selectedRoom.status === 'dirty' && (
                                <div className="bg-rose-50 border border-rose-200 rounded-xl p-3 text-xs text-rose-800 flex items-center gap-2.5">
                                    <div className="w-7 h-7 rounded-lg bg-rose-100 text-rose-700 flex items-center justify-center flex-shrink-0">
                                        <BedDouble size={14} />
                                    </div>
                                    <div>
                                        <p className="font-bold text-rose-900">Turnover Cleaning Pending</p>
                                        <p className="text-[11px] text-rose-700 mt-0.5">Room must be sanitized and inspected before admitting incoming arrivals.</p>
                                    </div>
                                </div>
                            )}

                            {/* Maintenance Notice - If OOO */}
                            {selectedRoom.status === 'ooo' && (
                                <div className="bg-slate-100 border border-slate-300 rounded-xl p-3 text-xs text-slate-800 flex items-center gap-2.5">
                                    <div className="w-7 h-7 rounded-lg bg-slate-200 text-slate-700 flex items-center justify-center flex-shrink-0">
                                        <Wrench size={14} />
                                    </div>
                                    <div>
                                        <p className="font-bold text-slate-900">Out of Order Maintenance</p>
                                        <p className="text-[11px] text-slate-600 mt-0.5">{selectedRoom.maintenanceReason || 'Under technical maintenance overhaul'}</p>
                                    </div>
                                </div>
                            )}

                            {/* Fast Status Change Actions */}
                            <div className="space-y-1.5 pt-1">
                                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                                    Quick Housekeeping Status Override
                                </label>
                                <div className="grid grid-cols-4 gap-2">
                                    {[
                                        { id: 'clean', label: 'Clean', icon: <Sparkles size={13} />, activeClass: 'bg-emerald-600 text-white border-emerald-600 shadow-sm font-bold ring-2 ring-emerald-200', inactiveClass: 'bg-emerald-50/70 text-emerald-800 border-emerald-200 hover:bg-emerald-100/80 font-medium' },
                                        { id: 'inspected', label: 'Inspected', icon: <CheckCircle2 size={13} />, activeClass: 'bg-blue-600 text-white border-blue-600 shadow-sm font-bold ring-2 ring-blue-200', inactiveClass: 'bg-blue-50/70 text-blue-800 border-blue-200 hover:bg-blue-100/80 font-medium' },
                                        { id: 'dirty', label: 'Dirty', icon: <BedDouble size={13} />, activeClass: 'bg-rose-600 text-white border-rose-600 shadow-sm font-bold ring-2 ring-rose-200', inactiveClass: 'bg-rose-50/70 text-rose-800 border-rose-200 hover:bg-rose-100/80 font-medium' },
                                        { id: 'ooo', label: 'OOO', icon: <Wrench size={13} />, activeClass: 'bg-slate-700 text-white border-slate-700 shadow-sm font-bold ring-2 ring-slate-300', inactiveClass: 'bg-slate-100 text-slate-700 border-slate-200 hover:bg-slate-200/80 font-medium' }
                                    ].map((btn) => (
                                        <button
                                            key={btn.id}
                                            type="button"
                                            onClick={() => handleUpdateRoomStatus(selectedRoom.id, btn.id as any)}
                                            className={`py-2 rounded-xl text-xs border flex flex-col items-center gap-1 cursor-pointer transition-all ${
                                                selectedRoom.status === btn.id ? btn.activeClass : btn.inactiveClass
                                            }`}
                                        >
                                            {btn.icon}
                                            <span>{btn.label}</span>
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>

                        {/* Modal Footer */}
                        <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between gap-3">
                            <button
                                type="button"
                                onClick={() => setSelectedRoom(null)}
                                className="h-9 px-4 border border-slate-200 bg-white hover:bg-slate-100 text-slate-700 rounded-xl text-xs font-semibold cursor-pointer transition-colors shadow-2xs"
                            >
                                Close
                            </button>

                            <div className="flex items-center gap-2">
                                {selectedRoom.status === 'reserved' ? (
                                    <>
                                        <button
                                            type="button"
                                            onClick={() => {
                                                if (selectedRoom.reservationId) {
                                                    updateReservationStatusInDB(selectedRoom.reservationId, 'in-house');
                                                }
                                                handleUpdateRoomStatus(selectedRoom.id, 'occupied');
                                                setSelectedRoom(null);
                                            }}
                                            className="h-9 px-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs flex items-center gap-1.5 cursor-pointer shadow-sm font-bold transition-all"
                                        >
                                            <CheckCircle2 size={14} />
                                            <span>Check In Guest</span>
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => {
                                                setSelectedRoom(null);
                                                setActivePage('front-desk');
                                            }}
                                            className="h-9 px-3.5 bg-[#1e3a8a] hover:bg-blue-900 text-white rounded-xl text-xs flex items-center gap-1.5 cursor-pointer shadow-sm font-semibold transition-all"
                                        >
                                            <span>Front Desk Hub</span>
                                            <ExternalLink size={12} />
                                        </button>
                                    </>
                                ) : selectedRoom.status === 'occupied' ? (
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setSelectedRoom(null);
                                            setActivePage('front-desk');
                                        }}
                                        className="h-9 px-4 bg-[#1e3a8a] hover:bg-blue-900 text-white rounded-xl text-xs flex items-center gap-1.5 cursor-pointer shadow-sm font-semibold transition-all"
                                    >
                                        <span>Front Desk / Guest Folio</span>
                                        <ExternalLink size={12} />
                                    </button>
                                ) : selectedRoom.status === 'dirty' ? (
                                    <button
                                        type="button"
                                        onClick={() => handleUpdateRoomStatus(selectedRoom.id, 'clean')}
                                        className="h-9 px-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs flex items-center gap-1.5 cursor-pointer shadow-sm font-semibold transition-all"
                                    >
                                        <Sparkles size={13} />
                                        <span>Mark Clean & Ready</span>
                                    </button>
                                ) : selectedRoom.status === 'ooo' ? (
                                    <button
                                        type="button"
                                        onClick={() => handleUpdateRoomStatus(selectedRoom.id, 'inspected')}
                                        className="h-9 px-4 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs flex items-center gap-1.5 cursor-pointer shadow-sm font-semibold transition-all"
                                    >
                                        <CheckCircle2 size={13} />
                                        <span>Release to Service</span>
                                    </button>
                                ) : (
                                    <button
                                        type="button"
                                        onClick={() => {
                                            const rm = selectedRoom;
                                            setSelectedRoom(null);
                                            handleBookRoom(rm);
                                        }}
                                        className="h-9 px-4 bg-[#1e3a8a] hover:bg-blue-900 text-white rounded-xl text-xs flex items-center gap-1.5 cursor-pointer shadow-sm font-semibold transition-all"
                                    >
                                        <Plus size={14} className="stroke-[2.5]" />
                                        <span>Walk-In Book Room {selectedRoom.roomNumber}</span>
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Quick Reservation Express Modal */}
            <QuickReservationModal
                isOpen={isQuickReserveOpen}
                roomInfo={prefilledRoomNumber ? {
                    room: prefilledRoomNumber,
                    startDate: '2026-07-01',
                    endDate: '2026-07-02',
                    nights: 1
                } : undefined}
                onClose={() => {
                    setIsQuickReserveOpen(false);
                    setPrefilledRoomNumber('');
                }}
            />
        </div>
    );
};

export default RoomRack;
