import { useState, useEffect, useCallback } from 'react';
import { Search, Sparkles, BedDouble, AlertCircle, Users, CheckCircle2, XCircle, Clock, RefreshCw, X, Edit3 } from 'lucide-react';
import { getCanonicalRooms, getAllStoredReservations, getOperatingSystemDate, broadcastPMSEvent, subscribeToPMSEvents, updateRoomHousekeepingInDB } from '../utils/roomInventoryEngine';
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

    // Inspection & Staff Assignment Modal State
    const [selectedRoomForModal, setSelectedRoomForModal] = useState<HousekeepingRoom | null>(null);
    const [modalStatus, setModalStatus] = useState<HousekeepingRoom['status']>('clean');
    const [modalAssignedTo, setModalAssignedTo] = useState<string>('Fatima Begum');
    const [modalPriority, setModalPriority] = useState<HousekeepingRoom['priority']>('normal');
    const [modalNotes, setModalNotes] = useState<string>('');
    const [toastMessage, setToastMessage] = useState<string | null>(null);

    const showToast = (msg: string) => {
        setToastMessage(msg);
        setTimeout(() => setToastMessage(null), 3500);
    };

    const openInspectionModal = (room: HousekeepingRoom) => {
        setSelectedRoomForModal(room);
        setModalStatus(room.status);
        setModalAssignedTo(room.assignedTo || 'Fatima Begum');
        setModalPriority(room.priority || 'normal');
        setModalNotes(room.notes || '');
    };

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
                    lastCleaned: (modalStatus === 'clean' || modalStatus === 'inspected') ? new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : r.lastCleaned
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

    const mapStatus = (status: string): HousekeepingRoom['status'] => {
        const s = (status || '').toLowerCase();
        if (s === 'ooo' || s === 'out-of-order' || s === 'out_of_order') return 'out-of-order';
        if (s === 'dirty') return 'dirty';
        if (s === 'inspected') return 'inspected';
        return 'clean';
    };

    const fetchRooms = useCallback(async () => {
        setIsSyncing(true);
        const storedRes = getAllStoredReservations();
        const opDate = getOperatingSystemDate();

        const getRoomBookingNote = (roomNum: string) => {
            const active = storedRes.find(res => {
                const rawStatus = String(res.status || '').toLowerCase().replace(/_/g, '-');
                if (rawStatus === 'cancelled' || rawStatus === 'void' || rawStatus === 'checked-out' || rawStatus === 'completed') {
                    return false;
                }
                const matches = String(res.roomNumber) === roomNum ||
                    String(res.roomNo) === roomNum ||
                    (Array.isArray(res.allocatedRooms) && res.allocatedRooms.some((x: any) => String(x) === roomNum)) ||
                    (Array.isArray(res.roomsList) && res.roomsList.some((rm: any) => String(rm.roomNumber) === roomNum)) ||
                    (Array.isArray(res.groupRoomsList) && res.groupRoomsList.some((rm: any) => String(rm.roomNumber) === roomNum));
                if (!matches) return false;
                const checkIn = String(res.checkIn || res.arrivalDate || '');
                const checkOut = String(res.checkOut || res.departureDate || '');
                return (checkIn <= opDate && checkOut > opDate) || (checkIn === opDate);
            });
            if (active) {
                const rawStatus = String(active.status || '').toLowerCase();
                const isInHouse = rawStatus === 'in-house' || rawStatus === 'arrived';
                return isInHouse ? `In-House: ${active.guestName}` : `Arrival Today: ${active.guestName}`;
            }

            const upcoming = storedRes.find(res => {
                const rawStatus = String(res.status || '').toLowerCase().replace(/_/g, '-');
                if (rawStatus === 'cancelled' || rawStatus === 'void' || rawStatus === 'checked-out' || rawStatus === 'completed') {
                    return false;
                }
                const matches = String(res.roomNumber) === roomNum ||
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
                return `Upcoming (${dateLabel}): ${upcoming.guestName}`;
            }
            return undefined;
        };

        try {
            const res = await fetch(`${API_BASE}/api/rooms`, {
                headers: { 'x-property-id': '1' }
            });
            const json = await res.json();
            if (json.success && Array.isArray(json.data) && json.data.length > 0) {
                const mapped: HousekeepingRoom[] = json.data.map((r: any) => {
                    const rNum = String(r.roomNo || r.room_number || r.number);
                    const bookingNote = getRoomBookingNote(rNum);
                    return {
                        id: r.id,
                        roomNumber: rNum,
                        floor: Number(r.floor) || 1,
                        roomType: r.roomType || 'Standard Room',
                        status: mapStatus(r.hkStatus),
                        assignedTo: r.floor === 1 ? 'Fatima' : r.floor === 2 ? 'Rahima' : r.floor === 3 ? 'Salma' : 'Akhtar',
                        priority: r.hkStatus === 'dirty' ? 'high' : 'normal',
                        lastCleaned: r.hkStatus === 'clean' ? '10:30 AM' : undefined,
                        notes: bookingNote || (r.foStatus === 'occupied' ? 'In-House Guest' : r.foStatus === 'due_out' ? 'Departure Today' : r.foStatus === 'reserved' ? 'Reserved' : undefined)
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
        const fallback: HousekeepingRoom[] = canonical.map((r, i) => {
            const bookingNote = getRoomBookingNote(r.number);
            return {
                id: r.id,
                roomNumber: r.number,
                floor: parseInt(r.floorId, 10) || 1,
                roomType: r.roomTypeName || 'Standard Room',
                status: mapStatus(r.housekeepingStatus),
                assignedTo: r.floorId === '1' ? 'Fatima' : r.floorId === '2' ? 'Rahima' : 'Salma',
                priority: i % 4 === 0 ? 'high' : 'normal',
                notes: bookingNote
            };
        });
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

        // Persist directly to PostgreSQL Relational DB and Local Canonical cache
        try {
            const titleCase = newStatus === 'dirty' ? 'Dirty' : newStatus === 'inspected' ? 'Inspected' : 'Clean';
            await updateRoomHousekeepingInDB(roomNumber, titleCase);

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
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] bg-rose-50 text-rose-700 border border-rose-200">
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
                        <p className="text-[11px] text-slate-400 uppercase tracking-wider">Total Inventory</p>
                        <p className="text-xl sm:text-2xl text-slate-900 mt-1">{stats.total} Rooms</p>
                        <p className="text-[11px] text-slate-500 mt-0.5">Physical keys</p>
                    </div>
                    <div className="size-9 rounded-xl bg-primary-subtle text-primary flex items-center justify-center shrink-0">
                        <BedDouble size={17} />
                    </div>
                </div>
                <div className="kpi-card">
                    <div>
                        <p className="text-[11px] text-slate-400 uppercase tracking-wider">Dirty (Turnover)</p>
                        <p className="text-xl sm:text-2xl text-rose-600 mt-1">{stats.dirty}</p>
                        <p className="text-[11px] text-rose-600 font-medium mt-0.5">Needs housekeeping</p>
                    </div>
                    <div className="size-9 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center shrink-0">
                        <AlertCircle size={17} />
                    </div>
                </div>
                <div className="kpi-card">
                    <div>
                        <p className="text-[11px] text-slate-400 uppercase tracking-wider">Clean & Ready</p>
                        <p className="text-xl sm:text-2xl text-emerald-600 mt-1">{stats.clean}</p>
                        <p className="text-[11px] text-emerald-600 font-medium mt-0.5">Ready for check-in</p>
                    </div>
                    <div className="size-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                        <Sparkles size={17} />
                    </div>
                </div>
                <div className="kpi-card">
                    <div>
                        <p className="text-[11px] text-slate-400 uppercase tracking-wider">Inspected</p>
                        <p className="text-xl sm:text-2xl text-amber-600 mt-1">{stats.inspected}</p>
                        <p className="text-[11px] text-slate-500 mt-0.5">Supervisor verified</p>
                    </div>
                    <div className="size-9 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
                        <CheckCircle2 size={17} />
                    </div>
                </div>
                <div className="kpi-card">
                    <div>
                        <p className="text-[11px] text-slate-400 uppercase tracking-wider">Out of Order</p>
                        <p className="text-xl sm:text-2xl text-slate-700 mt-1">{stats.outOfOrder}</p>
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
                                <tr 
                                    key={room.id} 
                                    onClick={() => openInspectionModal(room)}
                                    className="hover:bg-slate-50/80 transition-colors cursor-pointer"
                                >
                                    <td className="text-slate-900 font-bold font-mono">
                                        {room.roomNumber}
                                    </td>
                                    <td className="text-slate-600 font-medium">
                                        {room.roomType}
                                    </td>
                                    <td onClick={e => e.stopPropagation()}>
                                        <button
                                            type="button"
                                            onClick={() => cycleStatus(room.roomNumber)}
                                            className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] border transition-all hover:shadow-2xs cursor-pointer ${getStatusStyle(room.status)}`}
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
                                        <span className={`px-2 py-0.5 rounded-full text-[10px] uppercase ${room.priority === 'high' ? 'bg-rose-50 text-rose-700 border border-rose-200 font-bold' : 'bg-slate-100 text-slate-600 border border-slate-200'}`}>
                                            {room.priority}
                                        </span>
                                    </td>
                                    <td className="text-slate-500 text-xs">
                                        {room.lastCleaned ? (
                                            <span className="flex items-center gap-1 font-mono">
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

            {/* Toast Notification */}
            {toastMessage && (
                <div className="fixed top-4 right-4 z-50 bg-slate-900 text-white px-3.5 py-2 rounded-lg shadow-lg border border-slate-700 text-xs font-semibold flex items-center gap-2">
                    <CheckCircle2 size={14} className="text-emerald-400" />
                    <span>{toastMessage}</span>
                </div>
            )}

            {/* Housekeeping Inspection & Staff Assignment Modal */}
            {selectedRoomForModal && (
                <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 sm:p-6 overflow-y-auto animate-in fade-in duration-150">
                    <div className="bg-white rounded-2xl shadow-2xl border border-slate-200/90 max-w-[520px] w-full overflow-hidden animate-in zoom-in-95 duration-150 my-auto">
                        {/* Header */}
                        <div className="px-6 py-4.5 border-b border-slate-100 flex items-center justify-between bg-slate-50/70">
                            <div className="flex items-center gap-3.5">
                                <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-[#1e3a8a] to-blue-700 text-white flex items-center justify-center font-mono font-bold text-base shadow-sm ring-2 ring-blue-100">
                                    {selectedRoomForModal.roomNumber}
                                </div>
                                <div>
                                    <div className="flex items-center gap-2">
                                        <h3 className="text-sm font-bold text-slate-900">Room {selectedRoomForModal.roomNumber} Inspection &amp; Turnover</h3>
                                        <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-semibold border capitalize ${getStatusStyle(modalStatus)}`}>
                                            {modalStatus}
                                        </span>
                                    </div>
                                    <p className="text-xs text-slate-500 font-medium mt-0.5">
                                        Floor {selectedRoomForModal.floor} • {selectedRoomForModal.roomType}
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

                        {/* Modal Body */}
                        <div className="p-6 space-y-4">
                            {/* Status Selector */}
                            <div className="space-y-1.5">
                                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                                    Housekeeping Status (Direct Relational DB Sync)
                                </label>
                                <div className="grid grid-cols-4 gap-2">
                                    {[
                                        { id: 'clean', label: 'Clean', icon: <Sparkles size={13} />, activeStyle: 'bg-emerald-600 text-white border-emerald-600 shadow-sm font-bold ring-2 ring-emerald-200', inactiveStyle: 'bg-emerald-50/70 text-emerald-800 border-emerald-200 hover:bg-emerald-100/80 font-medium' },
                                        { id: 'inspected', label: 'Inspected', icon: <CheckCircle2 size={13} />, activeStyle: 'bg-blue-600 text-white border-blue-600 shadow-sm font-bold ring-2 ring-blue-200', inactiveStyle: 'bg-blue-50/70 text-blue-800 border-blue-200 hover:bg-blue-100/80 font-medium' },
                                        { id: 'dirty', label: 'Dirty', icon: <BedDouble size={13} />, activeStyle: 'bg-rose-600 text-white border-rose-600 shadow-sm font-bold ring-2 ring-rose-200', inactiveStyle: 'bg-rose-50/70 text-rose-800 border-rose-200 hover:bg-rose-100/80 font-medium' },
                                        { id: 'out-of-order', label: 'Out of Order', icon: <XCircle size={13} />, activeStyle: 'bg-slate-700 text-white border-slate-700 shadow-sm font-bold ring-2 ring-slate-300', inactiveStyle: 'bg-slate-100 text-slate-700 border-slate-200 hover:bg-slate-200/80 font-medium' }
                                    ].map(st => (
                                        <button
                                            key={st.id}
                                            type="button"
                                            onClick={() => setModalStatus(st.id as any)}
                                            className={`py-2 rounded-xl text-xs border flex flex-col items-center gap-1 cursor-pointer transition-all ${
                                                modalStatus === st.id ? st.activeStyle : st.inactiveStyle
                                            }`}
                                        >
                                            {st.icon}
                                            <span>{st.label}</span>
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Housekeeper Assignment & Priority */}
                            <div className="grid grid-cols-2 gap-3 text-xs">
                                <div>
                                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
                                        Assign Housekeeper
                                    </label>
                                    <select
                                        value={modalAssignedTo}
                                        onChange={e => setModalAssignedTo(e.target.value)}
                                        className="w-full px-2.5 py-2 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 outline-none cursor-pointer focus:border-blue-500 shadow-2xs"
                                    >
                                        <option value="Fatima Begum">Fatima Begum (Floor 1)</option>
                                        <option value="Rahima Khatun">Rahima Khatun (Floor 2)</option>
                                        <option value="Salma Akter">Salma Akter (Floor 3)</option>
                                        <option value="Akhtar Hossain">Akhtar Hossain (General)</option>
                                        <option value="Duty Housekeeping Team">Duty Housekeeping Team</option>
                                    </select>
                                </div>

                                <div>
                                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
                                        Turnover Priority
                                    </label>
                                    <select
                                        value={modalPriority}
                                        onChange={e => setModalPriority(e.target.value as any)}
                                        className="w-full px-2.5 py-2 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 outline-none cursor-pointer focus:border-blue-500 shadow-2xs"
                                    >
                                        <option value="high">High (Rush VIP Arrival)</option>
                                        <option value="normal">Normal Routine</option>
                                        <option value="low">Low Priority</option>
                                    </select>
                                </div>
                            </div>

                            {/* Notes / Special Requests */}
                            <div className="space-y-1.5">
                                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                                    Turnover &amp; Maintenance Notes
                                </label>
                                <textarea
                                    rows={2}
                                    value={modalNotes}
                                    onChange={e => setModalNotes(e.target.value)}
                                    placeholder="e.g. VIP guest arriving at 2 PM, bathroom amenities restocked, extra towels..."
                                    className="w-full p-3 bg-white border border-slate-200 rounded-xl text-xs outline-none focus:border-blue-500 resize-none shadow-2xs placeholder:text-slate-400"
                                />
                            </div>
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
                                <span>Save &amp; Sync Room Status</span>
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default HousekeepingGrid;
