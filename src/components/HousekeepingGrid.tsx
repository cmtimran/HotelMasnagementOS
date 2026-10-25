import { useState, useEffect, useCallback } from 'react';
import { Search, Sparkles, BedDouble, AlertCircle, Users, CheckCircle2, XCircle, Clock, RefreshCw } from 'lucide-react';
import { getCanonicalRooms, broadcastPMSEvent, subscribeToPMSEvents } from '../utils/roomInventoryEngine';
import { dispatchPMSNetworkEvent } from '../utils/pmsNetworkSync';
import { getApiBaseUrl } from '../utils/apiUrl';
import PageHeader from './common/PageHeader';


interface HousekeepingRoom {
    id: number | string;
    roomNumber: string;
    floor: number;
    roomType: string;
    status: 'dirty' | 'clean' | 'inspected' | 'out-of-order';
    assignedTo?: string;
    priority: 'high' | 'normal' | 'low';
    lastCleaned?: string;
    notes?: string;
}

const API_BASE = getApiBaseUrl();

const HousekeepingGrid = () => {
    const [searchTerm, setSearchTerm] = useState('');
    const [filterFloor, setFilterFloor] = useState('all');
    const [filterStatus, setFilterStatus] = useState('all');
    const [isSyncing, setIsSyncing] = useState(false);
    const [rooms, setRooms] = useState<HousekeepingRoom[]>([]);

    const mapStatus = (status: string): HousekeepingRoom['status'] => {
        const s = (status || '').toLowerCase();
        if (s === 'ooo' || s === 'out-of-order' || s === 'out_of_order') return 'out-of-order';
        if (s === 'dirty') return 'dirty';
        if (s === 'inspected') return 'inspected';
        return 'clean';
    };

    const fetchRooms = useCallback(async () => {
        setIsSyncing(true);
        try {
            const res = await fetch(`${API_BASE}/api/rooms`, {
                headers: { 'x-property-id': '1' }
            });
            const json = await res.json();
            if (json.success && Array.isArray(json.data) && json.data.length > 0) {
                const mapped: HousekeepingRoom[] = json.data.map((r: any) => ({
                    id: r.id,
                    roomNumber: String(r.roomNo),
                    floor: Number(r.floor) || 1,
                    roomType: r.roomType || 'Standard Room',
                    status: mapStatus(r.hkStatus),
                    assignedTo: r.floor === 1 ? 'Fatima' : r.floor === 2 ? 'Rahima' : r.floor === 3 ? 'Salma' : 'Akhtar',
                    priority: r.hkStatus === 'dirty' ? 'high' : 'normal',
                    lastCleaned: r.hkStatus === 'clean' ? '10:30 AM' : undefined,
                    notes: r.foStatus === 'occupied' ? 'In-House Guest' : r.foStatus === 'due_out' ? 'Departure Today' : undefined
                }));
                setRooms(mapped);
                setIsSyncing(false);
                return;
            }
        } catch (err) {
            console.warn('Backend rooms fetch error, falling back to canonical:', err);
        }

        // Fallback to local canonical rooms
        const canonical = getCanonicalRooms();
        const fallback: HousekeepingRoom[] = canonical.map((r, i) => ({
            id: r.id,
            roomNumber: r.number,
            floor: parseInt(r.floorId, 10) || 1,
            roomType: r.roomTypeName || 'Standard Room',
            status: mapStatus(r.housekeepingStatus),
            assignedTo: r.floorId === '1' ? 'Fatima' : r.floorId === '2' ? 'Rahima' : 'Salma',
            priority: i % 4 === 0 ? 'high' : 'normal'
        }));
        setRooms(fallback);
        setIsSyncing(false);
    }, []);

    useEffect(() => {
        fetchRooms();

        // Subscribe to real-time sync events from SSE & local channels
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

    const uniqueFloors = Array.from(new Set(rooms.map(r => r.floor))).sort((a, b) => a - b);

    const filteredRooms = rooms.filter(room => {
        const matchesSearch = room.roomNumber.includes(searchTerm) ||
            (room.assignedTo?.toLowerCase().includes(searchTerm.toLowerCase()) ?? false);
        const matchesFloor = filterFloor === 'all' || room.floor.toString() === filterFloor;
        const matchesStatus = filterStatus === 'all' || room.status === filterStatus;
        return matchesSearch && matchesFloor && matchesStatus;
    });

    const stats = {
        total: rooms.length,
        dirty: rooms.filter(r => r.status === 'dirty').length,
        clean: rooms.filter(r => r.status === 'clean').length,
        inspected: rooms.filter(r => r.status === 'inspected').length,
        outOfOrder: rooms.filter(r => r.status === 'out-of-order').length,
    };

    const cycleStatus = async (roomNumber: string) => {
        const target = rooms.find(r => r.roomNumber === roomNumber);
        if (!target) return;

        let newStatus: HousekeepingRoom['status'];
        switch (target.status) {
            case 'dirty': newStatus = 'clean'; break;
            case 'clean': newStatus = 'inspected'; break;
            case 'inspected': newStatus = 'out-of-order'; break;
            case 'out-of-order': newStatus = 'dirty'; break;
            default: newStatus = 'clean';
        }

        // Optimistic UI update
        setRooms(rooms.map(room => {
            if (room.roomNumber === roomNumber) {
                return { ...room, status: newStatus };
            }
            return room;
        }));

        // Persist directly to SQLite Relational DB
        try {
            await fetch(`${API_BASE}/api/rooms/${roomNumber}/housekeeping`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json', 'x-property-id': '1' },
                body: JSON.stringify({ status: newStatus })
            });

            // Disseminate to all other PC terminals over SSE network
            const broadcastPayload = {
                type: 'ROOM_STATUS_CHANGED' as any,
                roomNo: roomNumber,
                hkStatus: newStatus
            };
            broadcastPMSEvent(broadcastPayload);
            dispatchPMSNetworkEvent(broadcastPayload);
        } catch (err) {
            console.warn('Failed to patch housekeeping status to DB:', err);
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

    const getStatusStyle = (status: HousekeepingRoom['status']) => {
        switch (status) {
            case 'dirty': return 'bg-rose-50 text-rose-700 border-rose-200';
            case 'clean': return 'bg-emerald-50 text-emerald-700 border-emerald-200';
            case 'inspected': return 'bg-amber-50 text-amber-700 border-amber-200';
            case 'out-of-order': return 'bg-gray-100 text-gray-700 border-gray-200';
        }
    };

    return (
        <div className="page-container">
            <PageHeader
                title="Housekeeping & Room Turnover"
                subtitle="Live room cleanliness states, supervisor inspections & real-time front-desk sync"
                icon={<Sparkles size={20} />}
                badge={
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
                        {stats.dirty} Pending Cleaning
                    </span>
                }
                actions={
                    <button
                        type="button"
                        onClick={fetchRooms}
                        title="Reload canonical room states from database"
                        className="btn-secondary"
                    >
                        <RefreshCw size={13} className={isSyncing ? 'animate-spin text-primary' : 'text-slate-400'} />
                        <span>Sync Inventory</span>
                    </button>
                }
            />

            {/* Standardized KPI Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
                <div className="kpi-card">
                    <div>
                        <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Total Inventory</p>
                        <p className="text-xl sm:text-2xl font-bold text-slate-900 mt-1">{stats.total} Rooms</p>
                        <p className="text-[11px] text-slate-500 mt-0.5">Physical keys</p>
                    </div>
                    <div className="size-9 rounded-xl bg-primary-subtle text-primary flex items-center justify-center shrink-0">
                        <BedDouble size={17} />
                    </div>
                </div>
                <div className="kpi-card">
                    <div>
                        <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Dirty (Turnover)</p>
                        <p className="text-xl sm:text-2xl font-bold text-rose-600 mt-1">{stats.dirty}</p>
                        <p className="text-[11px] text-rose-600 font-medium mt-0.5">Needs housekeeping</p>
                    </div>
                    <div className="size-9 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center shrink-0">
                        <AlertCircle size={17} />
                    </div>
                </div>
                <div className="kpi-card">
                    <div>
                        <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Clean & Ready</p>
                        <p className="text-xl sm:text-2xl font-bold text-emerald-600 mt-1">{stats.clean}</p>
                        <p className="text-[11px] text-emerald-600 font-medium mt-0.5">Ready for check-in</p>
                    </div>
                    <div className="size-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                        <Sparkles size={17} />
                    </div>
                </div>
                <div className="kpi-card">
                    <div>
                        <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Inspected</p>
                        <p className="text-xl sm:text-2xl font-bold text-amber-600 mt-1">{stats.inspected}</p>
                        <p className="text-[11px] text-slate-500 mt-0.5">Supervisor verified</p>
                    </div>
                    <div className="size-9 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
                        <CheckCircle2 size={17} />
                    </div>
                </div>
                <div className="kpi-card">
                    <div>
                        <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Out of Order</p>
                        <p className="text-xl sm:text-2xl font-bold text-slate-700 mt-1">{stats.outOfOrder}</p>
                        <p className="text-[11px] text-slate-500 mt-0.5">Maintenance block</p>
                    </div>
                    <div className="size-9 rounded-xl bg-slate-100 text-slate-600 flex items-center justify-center shrink-0">
                        <XCircle size={17} />
                    </div>
                </div>
            </div>

            {/* Filter Bar */}
            <div className="card-container !p-3.5">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="relative flex items-center">
                        <Search className="absolute left-3 text-slate-400 pointer-events-none" size={14} />
                        <input
                            type="text"
                            placeholder="Search room or assigned housekeeper..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="input-standard pl-9"
                        />
                    </div>
                    <select
                        value={filterFloor}
                        onChange={(e) => setFilterFloor(e.target.value)}
                        className="select-standard"
                    >
                        <option value="all">All Floors</option>
                        {uniqueFloors.map(fl => (
                            <option key={fl} value={fl.toString()}>Floor {fl}</option>
                        ))}
                    </select>
                    <select
                        value={filterStatus}
                        onChange={(e) => setFilterStatus(e.target.value)}
                        className="select-standard"
                    >
                        <option value="all">All Housekeeping Statuses</option>
                        <option value="dirty">Dirty</option>
                        <option value="clean">Clean</option>
                        <option value="inspected">Inspected</option>
                        <option value="out-of-order">Out of Order</option>
                    </select>
                </div>
            </div>

            {/* Standardized Housekeeping Table */}
            <div className="table-container">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr>
                                <th>Room</th>
                                <th>Type</th>
                                <th>Status (Click to cycle)</th>
                                <th>Housekeeper</th>
                                <th>Priority</th>
                                <th>Last Cleaned</th>
                                <th>Turnover Notes</th>
                                <th className="text-right">Action</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredRooms.map(room => (
                                <tr key={room.id} className="hover:bg-slate-50/70 transition-colors">
                                    <td className="font-bold text-slate-900">
                                        {room.roomNumber}
                                    </td>
                                    <td className="text-slate-600 font-medium">
                                        {room.roomType}
                                    </td>
                                    <td>
                                        <button
                                            type="button"
                                            onClick={() => cycleStatus(room.roomNumber)}
                                            className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold border transition-all hover:shadow-2xs cursor-pointer ${getStatusStyle(room.status)}`}
                                            title="Click to cycle status in database"
                                        >
                                            {getStatusIcon(room.status)}
                                            <span className="capitalize">{room.status}</span>
                                        </button>
                                    </td>
                                    <td>
                                        {room.assignedTo ? (
                                            <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-800">
                                                <Users size={13} className="text-primary" />
                                                {room.assignedTo}
                                            </span>
                                        ) : (
                                            <span className="text-xs text-slate-400 italic">Unassigned</span>
                                        )}
                                    </td>
                                    <td>
                                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${room.priority === 'high' ? 'bg-rose-50 text-rose-700 border border-rose-200' : 'bg-slate-100 text-slate-600 border border-slate-200'}`}>
                                            {room.priority}
                                        </span>
                                    </td>
                                    <td className="text-slate-500 text-xs">
                                        {room.lastCleaned ? (
                                            <span className="flex items-center gap-1">
                                                <Clock size={12} className="text-slate-400" /> {room.lastCleaned}
                                            </span>
                                        ) : '-'}
                                    </td>
                                    <td className="text-slate-500 text-xs">
                                        {room.notes ? (
                                            <span className="flex items-center gap-1 text-amber-700 font-medium">
                                                <AlertCircle size={12} className="flex-shrink-0" />
                                                <span className="truncate max-w-[180px]">{room.notes}</span>
                                            </span>
                                        ) : '-'}
                                    </td>
                                    <td className="text-right">
                                        <button
                                            type="button"
                                            onClick={() => cycleStatus(room.roomNumber)}
                                            className="btn-secondary !py-1 !px-2.5 !text-[11px]"
                                        >
                                            Cycle Status
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default HousekeepingGrid;
