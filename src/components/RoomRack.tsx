import React, { useState, useMemo, useEffect } from 'react';
import { 
    Search, BedDouble, Sparkles, User, Calendar, 
    MapPin, Plus, RefreshCw, LayoutGrid, List, CheckCircle2, 
    Wrench, ArrowRight, X, ExternalLink
} from 'lucide-react';
import { useNavigation } from '../context/NavigationContext';
import { QuickReservationModal } from './modals/QuickReservationModal';
import { 
    getCanonicalRooms, 
    getAllStoredReservations, 
    syncRoomTypesAndRoomsFromDB, 
    syncReservationsFromDB,
    updateRoomHousekeepingInDB,
    subscribeToPMSEvents
} from '../utils/roomInventoryEngine';

export interface RoomRackItem {
    id: number;
    roomNumber: string;
    floor: number;
    roomType: 'Deluxe Double' | 'Superior King' | 'Executive Suite' | 'Presidential Suite' | 'Standard Single';
    status: 'clean' | 'dirty' | 'inspected' | 'occupied' | 'ooo';
    guestName?: string;
    phone?: string;
    checkIn?: string;
    checkoutDate?: string;
    rate: number;
    bedType: 'King' | 'Queen' | 'Twin' | 'Single';
    features: string[];
    housekeeper?: string;
    maintenanceReason?: string;
}

const deriveRoomsFromInventory = (): RoomRackItem[] => {
    const canonical = getCanonicalRooms();
    const storedRes = getAllStoredReservations();

    return canonical.map(r => {
        const floorNum = parseInt(r.floorId, 10) || parseInt(r.number[0], 10) || 1;
        const activeRes = storedRes.find(res => 
            (res.roomNumber === r.number || (res.allocatedRooms && res.allocatedRooms.includes(r.number))) &&
            (res.status === 'in-house' || res.status === 'arrived')
        );

        let status: 'clean' | 'dirty' | 'inspected' | 'occupied' | 'ooo' = 'clean';
        if (r.status === 'Out of Order' || r.status === 'Maintenance') {
            status = 'ooo';
        } else if (activeRes) {
            status = 'occupied';
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
            roomType: (r.roomTypeName as any) || 'Deluxe Double',
            status,
            guestName: activeRes ? activeRes.guestName : undefined,
            phone: activeRes ? activeRes.phone : undefined,
            checkIn: activeRes ? activeRes.checkIn : undefined,
            checkoutDate: activeRes ? activeRes.checkOut : undefined,
            rate: r.baseRate || 3500,
            bedType: (r.bedConfiguration as any) || 'King',
            features,
            housekeeper: r.housekeepingStatus === 'Clean' ? 'Housekeeping Assigned' : 'Duty Staff',
            maintenanceReason: r.status === 'Out of Order' ? (r.remarks || 'Under Maintenance') : undefined
        };
    });
};

export const RoomRack: React.FC = () => {
    const { setActivePage } = useNavigation();

    // Rooms State dynamically synchronized with central database
    const [rooms, setRooms] = useState<RoomRackItem[]>(() => deriveRoomsFromInventory());

    useEffect(() => {
        Promise.all([syncRoomTypesAndRoomsFromDB(), syncReservationsFromDB()]).then(() => {
            setRooms(deriveRoomsFromInventory());
        });

        const unsub = subscribeToPMSEvents(() => {
            setRooms(deriveRoomsFromInventory());
        });
        return () => unsub();
    }, []);

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
        const clean = rooms.filter(r => r.status === 'clean').length;
        const dirty = rooms.filter(r => r.status === 'dirty').length;
        const inspected = rooms.filter(r => r.status === 'inspected').length;
        const ooo = rooms.filter(r => r.status === 'ooo').length;
        const available = clean + inspected;
        const occupancyRate = Math.round((occupied / total) * 100);

        return { total, occupied, clean, dirty, inspected, ooo, available, occupancyRate };
    }, [rooms]);

    // Filter Logic
    const filteredRooms = useMemo(() => {
        return rooms.filter(room => {
            const matchesSearch = 
                room.roomNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
                (room.guestName?.toLowerCase().includes(searchTerm.toLowerCase()) ?? false) ||
                room.roomType.toLowerCase().includes(searchTerm.toLowerCase());
            
            const matchesFloor = filterFloor === 'all' || room.floor.toString() === filterFloor;
            const matchesType = filterType === 'all' || room.roomType === filterType;
            const matchesStatus = filterStatus === 'all' || room.status === filterStatus;

            return matchesSearch && matchesFloor && matchesType && matchesStatus;
        });
    }, [rooms, searchTerm, filterFloor, filterType, filterStatus]);

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
        }
    };

    // Quick status updater for selected room with direct Database & PMS Sync
    const handleUpdateRoomStatus = (roomId: number, newStatus: RoomRackItem['status']) => {
        const targetRoom = rooms.find(r => r.id === roomId);
        if (targetRoom && (newStatus === 'clean' || newStatus === 'dirty' || newStatus === 'inspected')) {
            const titleCase = newStatus === 'clean' ? 'Clean' : newStatus === 'dirty' ? 'Dirty' : 'Inspected';
            updateRoomHousekeepingInDB(targetRoom.roomNumber, titleCase);
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
        <div className="p-3 sm:p-4 max-w-[1440px] mx-auto space-y-3 font-sans select-none animate-in fade-in duration-150">
            {/* Top Operational Header */}
            <div className="bg-white rounded-xl border border-slate-200/90 p-3 sm:p-3.5 shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#1e3a8a] to-blue-700 text-white flex items-center justify-center font-bold shadow-xs flex-shrink-0">
                        <BedDouble size={20} />
                    </div>
                    <div>
                        <div className="flex items-center gap-2">
                            <h1 className="text-base sm:text-lg font-black text-slate-900 tracking-tight leading-none">
                                Interactive Room Rack Grid
                            </h1>
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
                                {stats.occupancyRate}% Occupied
                            </span>
                        </div>
                        <p className="text-[11px] text-slate-500 font-medium leading-none mt-1">
                            Live physical room inventory, housekeeping status &amp; direct allocation matrix
                        </p>
                    </div>
                </div>

                {/* Header Actions */}
                <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
                    {/* View Switcher */}
                    <div className="flex p-0.5 bg-slate-100 rounded-lg border border-slate-200">
                        <button
                            type="button"
                            onClick={() => setViewMode('grid')}
                            className={`p-1.5 rounded-md text-xs font-bold flex items-center gap-1 cursor-pointer transition-all ${
                                viewMode === 'grid' ? 'bg-white text-blue-900 shadow-2xs' : 'text-slate-500 hover:text-slate-800'
                            }`}
                            title="Floor Grid View"
                        >
                            <LayoutGrid size={13} />
                            <span className="hidden sm:inline">Grid</span>
                        </button>
                        <button
                            type="button"
                            onClick={() => setViewMode('dense')}
                            className={`p-1.5 rounded-md text-xs font-bold flex items-center gap-1 cursor-pointer transition-all ${
                                viewMode === 'dense' ? 'bg-white text-blue-900 shadow-2xs' : 'text-slate-500 hover:text-slate-800'
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
                        className="h-8 px-3 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 font-bold rounded-lg text-xs flex items-center gap-1.5 cursor-pointer transition-all shadow-2xs"
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
                        className="h-8 px-3.5 bg-[#1e3a8a] hover:bg-blue-900 text-white font-bold rounded-lg text-xs flex items-center gap-1.5 cursor-pointer transition-all shadow-xs"
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
                        <span className="text-[10px] font-bold uppercase tracking-wider">Total Rooms</span>
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
                        <span className="text-[10px] font-bold uppercase tracking-wider">Occupied</span>
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
                        <span className="text-[10px] font-bold uppercase tracking-wider">Vacant Clean</span>
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
                        <span className="text-[10px] font-bold uppercase tracking-wider">Inspected</span>
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
                        <span className="text-[10px] font-bold uppercase tracking-wider">Turnover Dirty</span>
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
                        <span className="text-[10px] font-bold uppercase tracking-wider">Out of Order</span>
                        <Wrench size={13} className="text-slate-600" />
                    </div>
                    <div className="text-lg font-black text-slate-900 font-mono mt-0.5">{stats.ooo}</div>
                    <span className="text-[9.5px] text-slate-500 font-medium">Under Maintenance</span>
                </div>
            </div>

            {/* Filter Toolbar */}
            <div className="bg-white p-2.5 rounded-xl border border-slate-200/90 shadow-2xs flex flex-col md:flex-row items-center justify-between gap-2.5">
                <div className="relative w-full md:w-80">
                    <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                        type="text"
                        placeholder="Search Room #, Guest, or Type..."
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                        className="w-full h-8 pl-8 pr-3 bg-slate-50/60 border border-slate-200 rounded-lg text-xs text-slate-800 placeholder-slate-400 outline-none focus:bg-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500/20 transition-all font-medium"
                    />
                </div>

                <div className="flex items-center gap-2 w-full md:w-auto flex-wrap sm:flex-nowrap">
                    <div className="flex items-center gap-1.5">
                        <span className="text-[10px] font-bold text-slate-400 uppercase">Floor:</span>
                        <select
                            value={filterFloor}
                            onChange={e => setFilterFloor(e.target.value)}
                            className="h-8 px-2 bg-white border border-slate-200 rounded-lg text-xs font-semibold text-slate-700 outline-none cursor-pointer focus:border-blue-500"
                        >
                            <option value="all">All Floors (1 - 5)</option>
                            <option value="1">Floor 1 (Lobby &amp; Deluxe)</option>
                            <option value="2">Floor 2 (Superior)</option>
                            <option value="3">Floor 3 (Executive)</option>
                            <option value="4">Floor 4 (Business Wing)</option>
                            <option value="5">Floor 5 (Penthouse &amp; VIP)</option>
                        </select>
                    </div>

                    <div className="flex items-center gap-1.5">
                        <span className="text-[10px] font-bold text-slate-400 uppercase">Type:</span>
                        <select
                            value={filterType}
                            onChange={e => setFilterType(e.target.value)}
                            className="h-8 px-2 bg-white border border-slate-200 rounded-lg text-xs font-semibold text-slate-700 outline-none cursor-pointer focus:border-blue-500"
                        >
                            <option value="all">All Room Types</option>
                            <option value="Deluxe Double">Deluxe Double</option>
                            <option value="Superior King">Superior King</option>
                            <option value="Executive Suite">Executive Suite</option>
                            <option value="Presidential Suite">Presidential Suite</option>
                            <option value="Standard Single">Standard Single</option>
                        </select>
                    </div>

                    <div className="flex items-center gap-1.5">
                        <span className="text-[10px] font-bold text-slate-400 uppercase">Status:</span>
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
                floorsMap.map(([floorNum, floorRooms]) => (
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
                                                        </div>
                                                        <h3 className="text-base font-black text-slate-900 leading-tight font-mono tracking-tight">
                                                            {room.roomNumber}
                                                        </h3>
                                                    </div>

                                                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border flex items-center gap-1 ${theme.badge}`}>
                                                        {theme.icon}
                                                        <span>{theme.label}</span>
                                                    </span>
                                                </div>

                                                {/* Room Type & Bed */}
                                                <div>
                                                    <div className="flex items-center justify-between">
                                                        <span className="text-[10.5px] font-bold text-slate-800">
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
                                                        <p className="font-bold text-indigo-950 truncate flex items-center gap-1">
                                                            <User size={11} className="text-indigo-600 flex-shrink-0" />
                                                            <span>{room.guestName}</span>
                                                        </p>
                                                        <p className="text-[10px] text-indigo-700 flex items-center gap-1 mt-0.5 font-medium">
                                                            <Calendar size={10} /> Departs: {room.checkoutDate}
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
                                                    <div className="bg-emerald-50/70 p-1.5 rounded-lg text-[10px] text-emerald-800 font-bold flex items-center justify-between">
                                                        <span>Ready for Check-In</span>
                                                        <Sparkles size={11} className="text-emerald-600" />
                                                    </div>
                                                )}

                                                {/* Card Footer: Rate & Action Button */}
                                                <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                                                    <div>
                                                        <span className="text-[8px] font-bold text-slate-400 uppercase leading-none block">Tariff</span>
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
                                                                className="h-6.5 px-2.5 bg-[#1e3a8a] hover:bg-blue-900 text-white rounded-md text-[10px] font-bold cursor-pointer transition-colors shadow-2xs"
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
                                                {room.status === 'occupied' ? (room.guestName || 'Occupied') : room.roomType}
                                            </p>
                                            <div className="flex items-center justify-between text-[9px] mt-1 pt-1 border-t border-slate-100">
                                                <span className="font-bold text-slate-700">৳{room.rate}</span>
                                                <span className={`px-1 rounded text-[8px] font-bold ${theme.badge}`}>
                                                    {theme.label.split(' ')[0]}
                                                </span>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                ))
            ) : (
                <div className="text-center py-12 bg-white rounded-xl border border-slate-200">
                    <BedDouble size={28} className="text-slate-300 mx-auto mb-2" />
                    <p className="text-xs font-bold text-slate-700">No rooms match filter criteria</p>
                    <p className="text-[11px] text-slate-400 mt-0.5">Try clearing the search query or selecting All Floors</p>
                </div>
            )}

            {/* Room Details & Housekeeping Action Drawer / Modal */}
            {selectedRoom && (
                <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-3 animate-in fade-in duration-150">
                    <div className="bg-white rounded-xl shadow-2xl border border-slate-200 max-w-[500px] w-full p-4.5 space-y-4 animate-in zoom-in-95 duration-150">
                        {/* Header */}
                        <div className="flex items-center justify-between pb-2.5 border-b border-slate-100">
                            <div className="flex items-center gap-2.5">
                                <div className="w-10 h-10 rounded-xl bg-[#1e3a8a] text-white flex items-center justify-center font-mono font-bold text-base shadow-xs">
                                    {selectedRoom.roomNumber}
                                </div>
                                <div>
                                    <div className="flex items-center gap-2">
                                        <h3 className="text-sm font-bold text-slate-900">Room {selectedRoom.roomNumber} Operations</h3>
                                        <span className={`px-2 py-0.2 rounded-full text-[10px] font-bold border ${getStatusTheme(selectedRoom.status).badge}`}>
                                            {getStatusTheme(selectedRoom.status).label}
                                        </span>
                                    </div>
                                    <p className="text-[11px] text-slate-500 font-medium mt-0.5">
                                        Floor {selectedRoom.floor} • {selectedRoom.roomType} ({selectedRoom.bedType} Bed)
                                    </p>
                                </div>
                            </div>
                            <button
                                type="button"
                                onClick={() => setSelectedRoom(null)}
                                className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg cursor-pointer transition-colors"
                            >
                                <X size={18} />
                            </button>
                        </div>

                        {/* Room Specifications Table */}
                        <div className="bg-slate-50 rounded-lg p-3 border border-slate-200/80 grid grid-cols-2 gap-2 text-xs">
                            <div>
                                <span className="text-[10px] font-bold text-slate-400 uppercase">Tariff (Rate Plan)</span>
                                <p className="font-mono font-bold text-slate-900 text-sm">৳{selectedRoom.rate.toLocaleString()} / night</p>
                            </div>
                            <div>
                                <span className="text-[10px] font-bold text-slate-400 uppercase">Housekeeper In-Charge</span>
                                <p className="font-semibold text-slate-800">{selectedRoom.housekeeper || 'General Housekeeping'}</p>
                            </div>
                            <div className="col-span-2 pt-1 border-t border-slate-200/60">
                                <span className="text-[10px] font-bold text-slate-400 uppercase">Room Amenities</span>
                                <div className="flex flex-wrap gap-1 mt-1">
                                    {selectedRoom.features.map((feat, i) => (
                                        <span key={i} className="px-2 py-0.5 bg-white border border-slate-200 rounded text-[10px] text-slate-700 font-medium">
                                            {feat}
                                        </span>
                                    ))}
                                </div>
                            </div>
                        </div>

                        {/* Occupant Information (If occupied) */}
                        {selectedRoom.status === 'occupied' && selectedRoom.guestName && (
                            <div className="bg-indigo-50/70 border border-indigo-200 rounded-lg p-3 space-y-1.5 text-xs text-indigo-950">
                                <span className="text-[10px] font-bold text-indigo-700 uppercase tracking-wider block">In-House Guest Details</span>
                                <div className="flex justify-between">
                                    <span className="text-indigo-800">Guest Name:</span>
                                    <strong className="font-bold">{selectedRoom.guestName}</strong>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-indigo-800">Phone:</span>
                                    <span className="font-medium">{selectedRoom.phone || '+880 1711-000000'}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-indigo-800">Stay Period:</span>
                                    <span className="font-medium">{selectedRoom.checkIn} to {selectedRoom.checkoutDate}</span>
                                </div>
                            </div>
                        )}

                        {/* Fast Status Change Actions */}
                        <div className="space-y-1.5">
                            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                                Quick Housekeeping Status Override
                            </span>
                            <div className="grid grid-cols-4 gap-1.5">
                                <button
                                    type="button"
                                    onClick={() => handleUpdateRoomStatus(selectedRoom.id, 'clean')}
                                    className={`py-1.5 rounded-lg text-xs font-bold border flex flex-col items-center gap-0.5 cursor-pointer transition-all ${
                                        selectedRoom.status === 'clean'
                                            ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                                            : 'bg-emerald-50 text-emerald-800 border-emerald-200 hover:bg-emerald-100'
                                    }`}
                                >
                                    <Sparkles size={12} />
                                    <span>Clean</span>
                                </button>

                                <button
                                    type="button"
                                    onClick={() => handleUpdateRoomStatus(selectedRoom.id, 'inspected')}
                                    className={`py-1.5 rounded-lg text-xs font-bold border flex flex-col items-center gap-0.5 cursor-pointer transition-all ${
                                        selectedRoom.status === 'inspected'
                                            ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                                            : 'bg-blue-50 text-blue-800 border-blue-200 hover:bg-blue-100'
                                    }`}
                                >
                                    <CheckCircle2 size={12} />
                                    <span>Inspected</span>
                                </button>

                                <button
                                    type="button"
                                    onClick={() => handleUpdateRoomStatus(selectedRoom.id, 'dirty')}
                                    className={`py-1.5 rounded-lg text-xs font-bold border flex flex-col items-center gap-0.5 cursor-pointer transition-all ${
                                        selectedRoom.status === 'dirty'
                                            ? 'bg-rose-600 text-white border-rose-600 shadow-xs'
                                            : 'bg-rose-50 text-rose-800 border-rose-200 hover:bg-rose-100'
                                    }`}
                                >
                                    <BedDouble size={12} />
                                    <span>Dirty</span>
                                </button>

                                <button
                                    type="button"
                                    onClick={() => handleUpdateRoomStatus(selectedRoom.id, 'ooo')}
                                    className={`py-1.5 rounded-lg text-xs font-bold border flex flex-col items-center gap-0.5 cursor-pointer transition-all ${
                                        selectedRoom.status === 'ooo'
                                            ? 'bg-slate-700 text-white border-slate-700 shadow-xs'
                                            : 'bg-slate-100 text-slate-700 border-slate-300 hover:bg-slate-200'
                                    }`}
                                >
                                    <Wrench size={12} />
                                    <span>OOO</span>
                                </button>
                            </div>
                        </div>

                        {/* Primary Action Buttons */}
                        <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-2">
                            <button
                                type="button"
                                onClick={() => setSelectedRoom(null)}
                                className="h-8 px-3 border border-slate-200 hover:bg-slate-50 text-slate-700 font-bold rounded-lg text-xs cursor-pointer"
                            >
                                Close
                            </button>

                            <div className="flex items-center gap-2">
                                {selectedRoom.status === 'occupied' ? (
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setSelectedRoom(null);
                                            setActivePage('front-desk');
                                        }}
                                        className="h-8 px-3.5 bg-[#1e3a8a] hover:bg-blue-900 text-white font-bold rounded-lg text-xs flex items-center gap-1.5 cursor-pointer shadow-xs"
                                    >
                                        <span>View in Front Desk</span>
                                        <ExternalLink size={12} />
                                    </button>
                                ) : (
                                    <button
                                        type="button"
                                        onClick={() => {
                                            const rm = selectedRoom;
                                            setSelectedRoom(null);
                                            handleBookRoom(rm);
                                        }}
                                        className="h-8 px-4 bg-[#1e3a8a] hover:bg-blue-900 text-white font-bold rounded-lg text-xs flex items-center gap-1.5 cursor-pointer shadow-xs"
                                    >
                                        <Plus size={13} className="stroke-[2.5]" />
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
