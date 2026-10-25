import React, { useState, useEffect } from 'react';
import {
    Building2, Eye, CheckCircle2
} from 'lucide-react';
import { 
    getCanonicalRooms, 
    getAllStoredReservations, 
    syncRoomTypesAndRoomsFromDB, 
    syncReservationsFromDB,
    updateRoomHousekeepingInDB,
    subscribeToPMSEvents 
} from '../utils/roomInventoryEngine';

export interface ArchitecturalRoom {
    id: number;
    roomNumber: string;
    floor: number;
    roomType: 'Deluxe King' | 'Superior King' | 'Deluxe Twin' | 'Executive Suite' | 'Presidential Suite';
    status: 'VACANT_CLEAN' | 'OCCUPIED' | 'TURNOVER_DIRTY' | 'RESERVED' | 'OUT_OF_ORDER';
    guestName?: string;
    checkIn?: string;
    checkOut?: string;
    folioBalanceBDT?: number;
    housekeeper?: string;
    ratePerNight: number;
    x: number;
    y: number;
    width: number;
    height: number;
}

const deriveArchitecturalRooms = (): ArchitecturalRoom[] => {
    const canonical = getCanonicalRooms();
    const storedRes = getAllStoredReservations();

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
            const activeRes = storedRes.find(res => 
                (res.roomNumber === r.number || (res.allocatedRooms && res.allocatedRooms.includes(r.number))) &&
                (res.status === 'in-house' || res.status === 'arrived')
            );

            let status: ArchitecturalRoom['status'] = 'VACANT_CLEAN';
            if (r.status === 'Out of Order' || r.status === 'Maintenance') {
                status = 'OUT_OF_ORDER';
            } else if (activeRes) {
                status = 'OCCUPIED';
            } else if (r.housekeepingStatus === 'Dirty') {
                status = 'TURNOVER_DIRTY';
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
                roomType: (r.roomTypeName as any) || 'Deluxe King',
                status,
                guestName: activeRes?.guestName,
                checkIn: activeRes?.checkIn,
                checkOut: activeRes?.checkOut,
                folioBalanceBDT: activeRes?.dueAmount || 0,
                housekeeper: r.housekeepingStatus === 'Clean' ? 'Housekeeping Assigned' : 'Housekeeping Staff',
                ratePerNight: r.baseRate || 6500,
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

    const floorRooms = rooms.filter(r => r.floor === selectedFloor);

    // Housekeeping status update directly in Database
    const handleUpdateStatus = (newStatus: ArchitecturalRoom['status']) => {
        if (!selectedRoom) return;

        const hkStatus = newStatus === 'VACANT_CLEAN' ? 'Clean' : newStatus === 'TURNOVER_DIRTY' ? 'Dirty' : 'Inspected';
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
            case 'OUT_OF_ORDER':
                return { fill: '#f3f4f6', stroke: '#9ca3af', badge: 'bg-gray-100 text-gray-700 border-gray-300', label: 'Out of Order' };
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
                            <h1 className="text-base font-bold text-slate-900 tracking-tight">
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

                {/* Floor Switcher Buttons */}
                <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200/90 gap-1 shadow-2xs overflow-x-auto">
                    {[
                        { floor: 1, label: 'Floor 1 (Deluxe)' },
                        { floor: 2, label: 'Floor 2 (Executive)' },
                        { floor: 3, label: 'Floor 3 (Superior)' },
                        { floor: 4, label: 'Floor 4 (Suites)' },
                        { floor: 5, label: 'Floor 5 (Penthouse)' }
                    ].map(f => {
                        const isActive = selectedFloor === f.floor;
                        return (
                            <button
                                key={f.floor}
                                type="button"
                                onClick={() => {
                                    setSelectedFloor(f.floor);
                                    setSelectedRoom(null);
                                }}
                                className={`h-7 px-3 rounded-lg font-bold text-xs cursor-pointer transition-all ${
                                    isActive
                                        ? 'bg-primary text-white shadow-xs'
                                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/70'
                                }`}
                            >
                                {f.label}
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
                                        <h3 className="text-base font-bold text-gray-900 font-mono">
                                            Room {selectedRoom.roomNumber}
                                        </h3>
                                        <span className={`px-2 py-0.5 rounded text-[9.5px] font-bold ${getStatusStyle(selectedRoom.status).badge}`}>
                                            {getStatusStyle(selectedRoom.status).label}
                                        </span>
                                    </div>
                                    <p className="text-[10.5px] text-gray-500">{selectedRoom.roomType} • Floor {selectedRoom.floor}</p>
                                </div>
                                <span className="font-mono font-bold text-gray-900 text-xs">
                                    ৳ {selectedRoom.ratePerNight.toLocaleString()}/N
                                </span>
                            </div>

                            {/* Guest Details if Occupied */}
                            {selectedRoom.guestName && (
                                <div className="bg-rose-50/60 p-2.5 rounded-lg border border-rose-200/80 space-y-1.5">
                                    <span className="text-[9.5px] font-bold text-rose-800 uppercase tracking-wide">In-House Resident</span>
                                    <p className="font-bold text-gray-900 text-xs">{selectedRoom.guestName}</p>
                                    <div className="flex items-center justify-between text-[10.5px] text-gray-600 font-mono pt-1">
                                        <span>Stay: {selectedRoom.checkIn} → {selectedRoom.checkOut}</span>
                                    </div>
                                    {selectedRoom.folioBalanceBDT !== undefined && (
                                        <div className="flex justify-between items-center pt-1 border-t border-rose-200/60 text-[10.5px]">
                                            <span className="text-gray-500 font-semibold">Folio Ledger Balance:</span>
                                            <span className="font-bold font-mono text-rose-700">৳ {selectedRoom.folioBalanceBDT.toLocaleString()}</span>
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* Housekeeping Attendant */}
                            <div className="bg-gray-50 p-2.5 rounded-lg border border-gray-200 space-y-1">
                                <span className="text-[9.5px] font-bold text-gray-400 uppercase">Assigned Housekeeper</span>
                                <p className="font-bold text-gray-900 text-xs">{selectedRoom.housekeeper || 'General Housekeeping Pool'}</p>
                            </div>

                            {/* Status Change Buttons */}
                            <div className="space-y-1.5 pt-1">
                                <span className="text-[9.5px] font-bold text-gray-400 uppercase">Update Room Status</span>
                                <div className="grid grid-cols-2 gap-1.5">
                                    <button
                                        onClick={() => handleUpdateStatus('VACANT_CLEAN')}
                                        className="h-7 px-2 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 rounded text-[10.5px] font-bold border border-emerald-200 cursor-pointer transition-colors"
                                    >
                                        Mark Clean
                                    </button>
                                    <button
                                        onClick={() => handleUpdateStatus('TURNOVER_DIRTY')}
                                        className="h-7 px-2 bg-amber-50 text-amber-700 hover:bg-amber-100 rounded text-[10.5px] font-bold border border-amber-200 cursor-pointer transition-colors"
                                    >
                                        Mark Dirty
                                    </button>
                                    <button
                                        onClick={() => handleUpdateStatus('OUT_OF_ORDER')}
                                        className="h-7 px-2 bg-gray-100 text-gray-700 hover:bg-gray-200 rounded text-[10.5px] font-bold border border-gray-300 cursor-pointer transition-colors"
                                    >
                                        Mark Out of Order
                                    </button>
                                    <button
                                        onClick={() => handleUpdateStatus('RESERVED')}
                                        className="h-7 px-2 bg-blue-50 text-blue-700 hover:bg-blue-100 rounded text-[10.5px] font-bold border border-blue-200 cursor-pointer transition-colors"
                                    >
                                        Mark Reserved
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
