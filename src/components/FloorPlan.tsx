import React, { useState, useEffect, useMemo } from 'react';
import {
    Building2, Eye, CheckCircle2, User, Calendar, ExternalLink, Plus, Sparkles
} from 'lucide-react';
import { useNavigation } from '../context/NavigationContext';
import { 
    getCanonicalRooms, 
    getAllStoredReservations, 
    syncRoomTypesAndRoomsFromDB, 
    syncReservationsFromDB,
    updateRoomHousekeepingInDB,
    updateReservationStatusInDB,
    getOperatingSystemDate,
    subscribeToPMSEvents 
} from '../utils/roomInventoryEngine';

export interface ArchitecturalRoom {
    id: number;
    roomNumber: string;
    floor: number;
    roomType: string;
    status: 'VACANT_CLEAN' | 'OCCUPIED' | 'TURNOVER_DIRTY' | 'RESERVED' | 'OUT_OF_ORDER' | 'INSPECTED' | string;
    guestName?: string;
    checkIn?: string;
    checkOut?: string;
    folioBalanceBDT?: number;
    housekeeper?: string;
    ratePerNight: number;
    reservationId?: number | string;
    reservationNumber?: string;
    x: number;
    y: number;
    width: number;
    height: number;
}

const deriveArchitecturalRooms = (): ArchitecturalRoom[] => {
    const canonical = getCanonicalRooms();
    const storedRes = getAllStoredReservations();
    const opDate = getOperatingSystemDate();

    const floorGroups: Record<number, typeof canonical> = {};
    canonical.forEach(r => {
        const floorNum = parseInt(r.floorId, 10) || parseInt(r.number[0], 10) || 1;
        if (!floorGroups[floorNum]) floorGroups[floorNum] = [];
        floorGroups[floorNum].push(r);
    });

    const result: ArchitecturalRoom[] = [];

    Object.entries(floorGroups).forEach(([floorStr, floorRooms]) => {
        const floorNum = parseInt(floorStr, 10);
        floorRooms.forEach((r, idx) => {
            const activeRes = storedRes.find(res => {
                const rawStatus = String(res.status || '').toLowerCase().replace(/_/g, '-');
                if (rawStatus === 'cancelled' || rawStatus === 'void' || rawStatus === 'checked-out' || rawStatus === 'completed' || rawStatus === 'no-show') {
                    return false;
                }
                const matchingRoom = (Array.isArray(res.roomsList) && res.roomsList.find((rm: any) => String(rm.roomNumber) === r.number)) ||
                                     (Array.isArray(res.groupRoomsList) && res.groupRoomsList.find((rm: any) => String(rm.roomNumber) === r.number));

                const matchesRoom = matchingRoom ||
                    String(res.roomNumber) === r.number ||
                    String(res.roomNo) === r.number ||
                    (Array.isArray(res.allocatedRooms) && res.allocatedRooms.some((x: any) => String(x) === r.number));

                if (!matchesRoom) return false;

                const checkIn = String(matchingRoom?.checkInDate || matchingRoom?.checkIn || res.checkIn || res.arrivalDate || '');
                const checkOut = String(matchingRoom?.checkOutDate || matchingRoom?.checkOut || res.checkOut || res.departureDate || '');
                return (checkIn <= opDate && checkOut > opDate) || (checkIn === opDate);
            });

            let status: ArchitecturalRoom['status'] = 'VACANT_CLEAN';
            if (r.status === 'Out of Order' || r.status === 'Maintenance') {
                status = 'OUT_OF_ORDER';
            } else if (activeRes) {
                const rawStatus = String(activeRes.status || '').toLowerCase().replace(/_/g, '-');
                const isInHouse = rawStatus === 'in-house' || rawStatus === 'arrived' || rawStatus === 'checked-in';
                status = isInHouse ? 'OCCUPIED' : 'RESERVED';
            } else if (r.housekeepingStatus === 'Dirty') {
                status = 'TURNOVER_DIRTY';
            } else if (r.housekeepingStatus === 'Inspected') {
                status = 'INSPECTED';
            } else {
                status = 'VACANT_CLEAN';
            }

            const col = idx % 4;
            const row = Math.floor(idx / 4);
            const x = 30 + col * 160;
            const y = 30 + row * 155;
            const width = 140;
            const height = 95;

            result.push({
                id: typeof r.id === 'number' ? r.id : parseInt(String(r.id), 10) || idx + 1,
                roomNumber: r.number,
                floor: floorNum,
                roomType: r.roomTypeName || 'Deluxe Room',
                status,
                guestName: activeRes ? activeRes.guestName : undefined,
                checkIn: activeRes ? (activeRes.checkIn || activeRes.arrivalDate) : undefined,
                checkOut: activeRes ? (activeRes.checkOut || activeRes.departureDate) : undefined,
                folioBalanceBDT: activeRes ? (activeRes.dueAmount || 0) : 0,
                housekeeper: r.housekeepingStatus === 'Clean' ? 'Fatima Begum (Floor 1)' : 'Housekeeping Duty Staff',
                ratePerNight: r.baseRate || 6500,
                reservationId: activeRes?.id,
                reservationNumber: activeRes?.reservationNumber,
                x,
                y,
                width,
                height
            });
        });
    });

    return result;
};

export const FloorPlan: React.FC = () => {
    const { setActivePage } = useNavigation();
    const [rooms, setRooms] = useState<ArchitecturalRoom[]>(() => deriveArchitecturalRooms());

    useEffect(() => {
        Promise.all([syncRoomTypesAndRoomsFromDB(), syncReservationsFromDB()]).then(() => {
            setRooms(deriveArchitecturalRooms());
        });

        const unsub = subscribeToPMSEvents(() => {
            setRooms(deriveArchitecturalRooms());
        });
        return () => unsub();
    }, []);

    const [selectedFloor, setSelectedFloor] = useState<number>(1);
    const [selectedRoom, setSelectedRoom] = useState<ArchitecturalRoom | null>(null);
    const [toastMessage, setToastMessage] = useState<string | null>(null);

    const showToast = (msg: string) => {
        setToastMessage(msg);
        setTimeout(() => setToastMessage(null), 3500);
    };

    // Dynamically derive available floors from canonical room data
    const availableFloors = useMemo(() => {
        const fls = Array.from(new Set(rooms.map(r => r.floor))).sort((a, b) => a - b);
        return fls.length > 0 ? fls : [1];
    }, [rooms]);

    const floorRooms = rooms.filter(r => r.floor === selectedFloor);

    // Housekeeping status update directly in Database
    const handleUpdateStatus = (newStatus: ArchitecturalRoom['status']) => {
        if (!selectedRoom) return;

        const hkStatus = newStatus === 'VACANT_CLEAN' ? 'Clean' : newStatus === 'TURNOVER_DIRTY' ? 'Dirty' : newStatus === 'INSPECTED' ? 'Inspected' : 'Dirty';
        updateRoomHousekeepingInDB(selectedRoom.roomNumber, hkStatus);

        setRooms(prev => prev.map(r => {
            if (r.id === selectedRoom.id) {
                const updated = { ...r, status: newStatus };
                setSelectedRoom(updated);
                return updated;
            }
            return r;
        }));

        showToast(`Room ${selectedRoom.roomNumber} updated to ${newStatus.replace('_', ' ')}.`);
    };

    const getStatusStyle = (status: ArchitecturalRoom['status']) => {
        switch (status) {
            case 'VACANT_CLEAN':
                return { fill: '#ecfdf5', stroke: '#10b981', badge: 'bg-emerald-50 text-emerald-700 border-emerald-200', label: 'Vacant Clean' };
            case 'OCCUPIED':
                return { fill: '#fff1f2', stroke: '#f43f5e', badge: 'bg-rose-50 text-rose-700 border-rose-200', label: 'Occupied' };
            case 'TURNOVER_DIRTY':
                return { fill: '#fffbeb', stroke: '#f59e0b', badge: 'bg-amber-50 text-amber-700 border-amber-200', label: 'Turnover Dirty' };
            case 'RESERVED':
                return { fill: '#eff6ff', stroke: '#3b82f6', badge: 'bg-blue-50 text-blue-700 border-blue-200', label: 'Reserved' };
            case 'INSPECTED':
                return { fill: '#eff6ff', stroke: '#2563eb', badge: 'bg-blue-50 text-blue-700 border-blue-200', label: 'Inspected' };
            case 'OUT_OF_ORDER':
                return { fill: '#f3f4f6', stroke: '#9ca3af', badge: 'bg-gray-100 text-gray-700 border-gray-300', label: 'Out of Order' };
            default:
                return { fill: '#f8fafc', stroke: '#cbd5e1', badge: 'bg-gray-50 text-gray-700 border-gray-200', label: status };
        }
    };

    const stats = {
        total: floorRooms.length,
        clean: floorRooms.filter(r => r.status === 'VACANT_CLEAN').length,
        occupied: floorRooms.filter(r => r.status === 'OCCUPIED').length,
        dirty: floorRooms.filter(r => r.status === 'TURNOVER_DIRTY').length,
        reserved: floorRooms.filter(r => r.status === 'RESERVED').length,
        ooo: floorRooms.filter(r => r.status === 'OUT_OF_ORDER').length
    };

    return (
        <div className="h-full min-h-[calc(100vh-48px)] bg-gray-50 flex flex-col font-sans text-xs select-none animate-in fade-in duration-150">
            {toastMessage && (
                <div className="fixed top-4 right-4 z-50 bg-gray-900 text-white px-3.5 py-2 rounded-lg shadow-lg border border-gray-700 text-xs font-semibold flex items-center gap-2">
                    <CheckCircle2 size={14} className="text-emerald-400" />
                    <span>{toastMessage}</span>
                </div>
            )}

            {/* Header */}
            <header className="bg-white border-b border-slate-200/90 px-4 py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs z-20">
                <div className="flex items-center gap-3">
                    <div className="size-10 rounded-xl bg-primary-subtle text-primary border border-primary-border flex items-center justify-center shrink-0">
                        <Building2 size={18} />
                    </div>
                    <div>
                        <div className="flex items-center gap-2">
                            <h1 className="text-base text-slate-900 tracking-tight">
                                Floor Plan Architectural CAD View
                            </h1>
                            <span className="badge-status-active">
                                Live Spatial Map
                            </span>
                        </div>
                        <p className="text-xs text-slate-500 mt-0.5">
                            Spatial visualization of room occupancy, corridor logistics, turnover status, and quick room inspection.
                        </p>
                    </div>
                </div>

                {/* Dynamic Floor Switcher Buttons */}
                <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200/90 gap-1 shadow-2xs overflow-x-auto">
                    {availableFloors.map(floorNum => {
                        const isActive = selectedFloor === floorNum;
                        const floorCount = rooms.filter(r => r.floor === floorNum).length;
                        return (
                            <button
                                key={floorNum}
                                type="button"
                                onClick={() => {
                                    setSelectedFloor(floorNum);
                                    setSelectedRoom(null);
                                }}
                                className={`h-7 px-3 rounded-lg text-xs cursor-pointer transition-all whitespace-nowrap ${
                                    isActive
                                        ? 'bg-primary text-white shadow-xs font-bold'
                                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/70'
                                }`}
                            >
                                Floor {floorNum} ({floorCount} Rooms)
                            </button>
                        );
                    })}
                </div>
            </header>

            {/* KPI Status Strip */}
            <div className="bg-white border-b border-gray-200 px-3.5 py-1.5 flex items-center justify-between flex-wrap gap-2 text-[11px]">
                <div className="flex items-center gap-4">
                    <span className="text-gray-500">
                        Floor {selectedFloor} Inventory: <strong className="text-gray-900">{stats.total} Rooms</strong>
                    </span>
                    <span className="flex items-center gap-1.5">
                        <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                        <strong className="text-gray-900">{stats.clean}</strong> Vacant Clean
                    </span>
                    <span className="flex items-center gap-1.5">
                        <span className="w-2.5 h-2.5 rounded-full bg-rose-500" />
                        <strong className="text-gray-900">{stats.occupied}</strong> Occupied
                    </span>
                    <span className="flex items-center gap-1.5">
                        <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
                        <strong className="text-gray-900">{stats.dirty}</strong> Turnover Dirty
                    </span>
                    <span className="flex items-center gap-1.5">
                        <span className="w-2.5 h-2.5 rounded-full bg-blue-500" />
                        <strong className="text-gray-900">{stats.reserved}</strong> Reserved
                    </span>
                    {stats.ooo > 0 && (
                        <span className="flex items-center gap-1.5">
                            <span className="w-2.5 h-2.5 rounded-full bg-gray-400" />
                            <strong className="text-gray-900">{stats.ooo}</strong> OOO
                        </span>
                    )}
                </div>

                <div className="text-gray-400 text-[10px]">
                    Click any architectural room cell to inspect guest telemetry or update status
                </div>
            </div>

            {/* Main Interactive CAD Blueprint Canvas */}
            <div className="flex-1 p-3.5 flex gap-3 overflow-hidden">
                {/* SVG Blueprint Board */}
                <div className="flex-1 bg-white rounded-xl border border-gray-200 shadow-2xs p-3 flex flex-col justify-center items-center overflow-auto relative">
                    <svg
                        viewBox="0 0 680 310"
                        className="w-full max-w-4xl h-auto border border-gray-300 rounded-lg bg-slate-50/50 shadow-inner"
                    >
                        {/* Corridor / Hallway */}
                        <rect x="20" y="135" width="640" height="40" fill="#e2e8f0" stroke="#cbd5e1" strokeWidth="1.5" rx="3" />
                        <text x="340" y="159" textAnchor="middle" fill="#64748b" fontSize="11" fontWeight="bold" letterSpacing="3">
                            CENTRAL LOGISTICS CORRIDOR
                        </text>

                        {/* Elevator Lobby on Left */}
                        <rect x="5" y="130" width="18" height="50" fill="#94a3b8" rx="2" />
                        <text x="14" y="157" textAnchor="middle" fill="#ffffff" fontSize="8" fontWeight="bold" transform="rotate(-90 14 157)">
                            ELEVATOR
                        </text>

                        {/* Emergency Fire Stairs on Right */}
                        <rect x="657" y="130" width="18" height="50" fill="#f87171" rx="2" />
                        <text x="666" y="157" textAnchor="middle" fill="#ffffff" fontSize="8" fontWeight="bold" transform="rotate(90 666 157)">
                            FIRE STAIRS
                        </text>

                        {/* Architectural Rooms */}
                        {floorRooms.map(room => {
                            const isSelected = selectedRoom?.id === room.id;
                            const style = getStatusStyle(room.status);

                            return (
                                <g
                                    key={room.id}
                                    onClick={() => setSelectedRoom(room)}
                                    className="cursor-pointer transition-all hover:opacity-90"
                                >
                                    {/* Room Box */}
                                    <rect
                                        x={room.x}
                                        y={room.y}
                                        width={room.width}
                                        height={room.height}
                                        fill={style.fill}
                                        stroke={isSelected ? '#2563eb' : style.stroke}
                                        strokeWidth={isSelected ? 3 : 1.5}
                                        rx={4}
                                        className="transition-all"
                                    />

                                    {/* Room Number Header */}
                                    <text
                                        x={room.x + 10}
                                        y={room.y + 20}
                                        fill="#0f172a"
                                        fontSize="13"
                                        fontWeight="bold"
                                        fontFamily="monospace"
                                    >
                                        Rm {room.roomNumber}
                                    </text>

                                    {/* Category Subtitle */}
                                    <text
                                        x={room.x + 10}
                                        y={room.y + 36}
                                        fill="#64748b"
                                        fontSize="9.5"
                                        fontWeight="600"
                                    >
                                        {room.roomType}
                                    </text>

                                    {/* Occupant / Status text */}
                                    {room.guestName ? (
                                        <g>
                                            <text
                                                x={room.x + 10}
                                                y={room.y + 58}
                                                fill="#1e293b"
                                                fontSize="10"
                                                fontWeight="bold"
                                            >
                                                {room.guestName.length > 17 ? room.guestName.slice(0, 16) + '…' : room.guestName}
                                            </text>
                                            <text
                                                x={room.x + 10}
                                                y={room.y + 72}
                                                fill="#94a3b8"
                                                fontSize="8.5"
                                                fontFamily="monospace"
                                            >
                                                {room.checkOut ? `Out: ${room.checkOut}` : ''}
                                            </text>
                                        </g>
                                    ) : (
                                        <text
                                            x={room.x + 10}
                                            y={room.y + 64}
                                            fill={style.stroke}
                                            fontSize="10"
                                            fontWeight="bold"
                                        >
                                            {style.label}
                                        </text>
                                    )}

                                    {/* Rate Chip bottom right */}
                                    <text
                                        x={room.x + room.width - 8}
                                        y={room.y + room.height - 8}
                                        textAnchor="end"
                                        fill="#64748b"
                                        fontSize="8.5"
                                        fontFamily="monospace"
                                        fontWeight="600"
                                    >
                                        ৳{room.ratePerNight.toLocaleString()}
                                    </text>

                                    {/* Door Swing Marker */}
                                    {room.y < 135 ? (
                                        <line
                                            x1={room.x + room.width / 2 - 10}
                                            y1={room.y + room.height}
                                            x2={room.x + room.width / 2 + 10}
                                            y2={room.y + room.height}
                                            stroke="#64748b"
                                            strokeWidth="2"
                                        />
                                    ) : (
                                        <line
                                            x1={room.x + room.width / 2 - 10}
                                            y1={room.y}
                                            x2={room.x + room.width / 2 + 10}
                                            y2={room.y}
                                            stroke="#64748b"
                                            strokeWidth="2"
                                        />
                                    )}
                                </g>
                            );
                        })}
                    </svg>
                </div>

                {/* Right Inspection Drawer */}
                <div className="w-80 bg-white rounded-xl border border-gray-200 shadow-2xs p-3.5 flex flex-col justify-between flex-shrink-0">
                    {selectedRoom ? (
                        <div className="space-y-3">
                            <div className="flex items-center justify-between pb-2 border-b border-gray-200">
                                <div>
                                    <div className="flex items-center gap-2">
                                        <h3 className="text-base text-gray-900 font-mono">
                                            Room {selectedRoom.roomNumber}
                                        </h3>
                                        <span className={`px-2 py-0.5 rounded text-[9.5px] ${getStatusStyle(selectedRoom.status).badge}`}>
                                            {getStatusStyle(selectedRoom.status).label}
                                        </span>
                                    </div>
                                    <p className="text-[10.5px] text-gray-500">{selectedRoom.roomType} • Floor {selectedRoom.floor}</p>
                                </div>
                                <span className="font-mono text-gray-900 text-xs">
                                    ৳ {selectedRoom.ratePerNight.toLocaleString()}/N
                                </span>
                            </div>

                            {/* Guest Details - If Reserved (Incoming Arriving Guest) */}
                            {selectedRoom.status === 'RESERVED' && (
                                <div className="bg-amber-50/80 p-2.5 rounded-lg border border-amber-200 space-y-1.5">
                                    <span className="text-[9.5px] text-amber-800 uppercase tracking-wide font-bold flex items-center gap-1.5">
                                        <Calendar size={12} className="text-amber-700" />
                                        <span>Incoming Reservation (Arriving)</span>
                                    </span>
                                    <p className="text-gray-900 text-xs font-bold">{selectedRoom.guestName || 'Valued Guest'}</p>
                                    <div className="flex items-center justify-between text-[10.5px] text-gray-600 font-mono pt-1">
                                        <span>Stay: {selectedRoom.checkIn} → {selectedRoom.checkOut}</span>
                                    </div>
                                    {selectedRoom.reservationNumber && (
                                        <div className="text-[10px] text-blue-700 font-mono font-semibold pt-1 border-t border-amber-200/60">
                                            Booking Ref: {selectedRoom.reservationNumber}
                                        </div>
                                    )}
                                    <div className="pt-2 flex items-center gap-1.5">
                                        <button
                                            type="button"
                                            onClick={() => {
                                                if (selectedRoom.reservationId) {
                                                    updateReservationStatusInDB(selectedRoom.reservationId, 'in-house');
                                                }
                                                handleUpdateStatus('OCCUPIED');
                                            }}
                                            className="flex-1 py-1 px-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-[10.5px] font-bold cursor-pointer transition-colors shadow-2xs"
                                        >
                                            Check In Guest
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setActivePage('front-desk')}
                                            className="py-1 px-2 bg-[#1e3a8a] hover:bg-blue-900 text-white rounded text-[10.5px] cursor-pointer shadow-2xs flex items-center gap-1"
                                        >
                                            <span>Front Desk</span>
                                            <ExternalLink size={11} />
                                        </button>
                                    </div>
                                </div>
                            )}

                            {/* Guest Details - If In-House Occupied */}
                            {selectedRoom.status === 'OCCUPIED' && selectedRoom.guestName && (
                                <div className="bg-rose-50/60 p-2.5 rounded-lg border border-rose-200/80 space-y-1.5">
                                    <span className="text-[9.5px] text-rose-800 uppercase tracking-wide font-bold flex items-center gap-1.5">
                                        <User size={12} className="text-rose-700" />
                                        <span>In-House Resident</span>
                                    </span>
                                    <p className="text-gray-900 text-xs font-bold">{selectedRoom.guestName}</p>
                                    <div className="flex items-center justify-between text-[10.5px] text-gray-600 font-mono pt-1">
                                        <span>Stay: {selectedRoom.checkIn} → {selectedRoom.checkOut}</span>
                                    </div>
                                    {selectedRoom.folioBalanceBDT !== undefined && (
                                        <div className="flex justify-between items-center pt-1 border-t border-rose-200/60 text-[10.5px]">
                                            <span className="text-gray-500 font-semibold">Folio Ledger Balance:</span>
                                            <span className="font-mono text-rose-700 font-bold">৳ {selectedRoom.folioBalanceBDT.toLocaleString()}</span>
                                        </div>
                                    )}
                                    <div className="pt-2">
                                        <button
                                            type="button"
                                            onClick={() => setActivePage('front-desk')}
                                            className="w-full py-1 px-2 bg-[#1e3a8a] hover:bg-blue-900 text-white rounded text-[10.5px] font-semibold cursor-pointer shadow-2xs flex items-center justify-center gap-1"
                                        >
                                            <span>Open Guest Folio &amp; Billing</span>
                                            <ExternalLink size={11} />
                                        </button>
                                    </div>
                                </div>
                            )}

                            {/* Vacant Clean Info & Direct Booking */}
                            {selectedRoom.status === 'VACANT_CLEAN' && (
                                <div className="bg-emerald-50/60 p-2.5 rounded-lg border border-emerald-200 space-y-1.5">
                                    <span className="text-[9.5px] text-emerald-800 uppercase tracking-wide font-bold flex items-center gap-1.5">
                                        <Sparkles size={12} className="text-emerald-700" />
                                        <span>Vacant Clean — Ready</span>
                                    </span>
                                    <p className="text-[10.5px] text-emerald-900">Room is sanitized and inspected. Immediate walk-in check-in is available.</p>
                                    <button
                                        type="button"
                                        onClick={() => setActivePage('add-reservation')}
                                        className="w-full mt-1 py-1 px-2 bg-[#1e3a8a] hover:bg-blue-900 text-white rounded text-[10.5px] font-semibold cursor-pointer shadow-2xs flex items-center justify-center gap-1"
                                    >
                                        <Plus size={12} />
                                        <span>+ Walk-In Booking</span>
                                    </button>
                                </div>
                            )}

                            {/* Housekeeping Attendant */}
                            <div className="bg-gray-50 p-2.5 rounded-lg border border-gray-200 space-y-1">
                                <span className="text-[9.5px] text-gray-500 uppercase font-semibold">Assigned Housekeeper</span>
                                <select
                                    value={selectedRoom.housekeeper || 'Fatima Begum (Floor 1)'}
                                    onChange={(e) => {
                                        const hk = e.target.value;
                                        setSelectedRoom({ ...selectedRoom, housekeeper: hk });
                                        setRooms(prev => prev.map(r => r.id === selectedRoom.id ? { ...r, housekeeper: hk } : r));
                                        showToast(`Assigned ${hk} to Room ${selectedRoom.roomNumber}`);
                                    }}
                                    className="w-full px-2 py-1 bg-white border border-gray-200 rounded text-xs font-semibold text-gray-800 outline-none cursor-pointer focus:border-blue-500"
                                >
                                    <option value="Fatima Begum (Floor 1)">Fatima Begum (Floor 1)</option>
                                    <option value="Rahima Khatun (Floor 2)">Rahima Khatun (Floor 2)</option>
                                    <option value="Salma Akter (Floor 3)">Salma Akter (Floor 3)</option>
                                    <option value="Akhtar Hossain (General)">Akhtar Hossain (General)</option>
                                    <option value="Duty Housekeeping Team">Duty Housekeeping Team</option>
                                </select>
                            </div>

                            {/* Status Change Buttons */}
                            <div className="space-y-1.5 pt-1">
                                <span className="text-[9.5px] text-gray-400 uppercase font-semibold">Update Room Status</span>
                                <div className="grid grid-cols-2 gap-1.5">
                                    <button
                                        onClick={() => handleUpdateStatus('VACANT_CLEAN')}
                                        className="h-7 px-2 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 rounded text-[10.5px] border border-emerald-200 cursor-pointer transition-colors font-medium"
                                    >
                                        Mark Clean
                                    </button>
                                    <button
                                        onClick={() => handleUpdateStatus('INSPECTED')}
                                        className="h-7 px-2 bg-blue-50 text-blue-700 hover:bg-blue-100 rounded text-[10.5px] border border-blue-200 cursor-pointer transition-colors font-medium"
                                    >
                                        Mark Inspected
                                    </button>
                                    <button
                                        onClick={() => handleUpdateStatus('TURNOVER_DIRTY')}
                                        className="h-7 px-2 bg-amber-50 text-amber-700 hover:bg-amber-100 rounded text-[10.5px] border border-amber-200 cursor-pointer transition-colors font-medium"
                                    >
                                        Mark Dirty
                                    </button>
                                    <button
                                        onClick={() => handleUpdateStatus('OUT_OF_ORDER')}
                                        className="h-7 px-2 bg-gray-100 text-gray-700 hover:bg-gray-200 rounded text-[10.5px] border border-gray-300 cursor-pointer transition-colors font-medium"
                                    >
                                        Mark Out of Order
                                    </button>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="h-full flex flex-col items-center justify-center text-center p-4 text-gray-400 space-y-2">
                            <Eye size={28} className="text-gray-300" />
                            <p className="font-semibold text-xs text-gray-600">No Room Selected</p>
                            <p className="text-[11px] text-gray-400">Click any room on Floor {selectedFloor} layout to view occupant telemetry, rate plans, and housekeeping status.</p>
                        </div>
                    )}

                    <div className="pt-3 border-t border-gray-200 text-center text-[10px] text-gray-400">
                        Floor Plan CAD Module • HotelOS 2026
                    </div>
                </div>
            </div>
        </div>
    );
};

export default FloorPlan;
