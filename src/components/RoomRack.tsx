import { useState } from 'react';
import { Search, Filter, BedDouble, Sparkles, User, Calendar, MapPin } from 'lucide-react';

interface Room {
    id: number;
    roomNumber: string;
    floor: number;
    roomType: 'Deluxe' | 'Suite' | 'Standard' | 'Executive';
    status: 'clean' | 'dirty' | 'inspected' | 'occupied';
    guestName?: string;
    checkoutDate?: string;
    rate?: number;
    features?: string[];
}

const RoomRack = () => {
    const [searchTerm, setSearchTerm] = useState('');
    const [filterFloor, setFilterFloor] = useState('all');
    const [filterType, setFilterType] = useState('all');
    const [filterStatus, setFilterStatus] = useState('all');

    const [rooms] = useState<Room[]>([
        { id: 1, roomNumber: '101', floor: 1, roomType: 'Deluxe', status: 'occupied', guestName: 'John Doe', checkoutDate: '2026-01-18', rate: 5000, features: ['Sea View', 'Balcony'] },
        { id: 2, roomNumber: '102', floor: 1, roomType: 'Standard', status: 'clean', rate: 3000, features: ['City View'] },
        { id: 3, roomNumber: '103', floor: 1, roomType: 'Suite', status: 'dirty', rate: 8000, features: ['Sea View', 'Jacuzzi'] },
        { id: 4, roomNumber: '104', floor: 1, roomType: 'Deluxe', status: 'inspected', rate: 5000, features: ['Garden View'] },
        { id: 5, roomNumber: '201', floor: 2, roomType: 'Executive', status: 'occupied', guestName: 'Jane Smith', checkoutDate: '2026-01-20', rate: 10000, features: ['Penthouse', 'Sea View'] },
        { id: 6, roomNumber: '202', floor: 2, roomType: 'Deluxe', status: 'clean', rate: 5000, features: ['Sea View'] },
        { id: 7, roomNumber: '203', floor: 2, roomType: 'Standard', status: 'dirty', rate: 3000, features: ['City View'] },
        { id: 8, roomNumber: '204', floor: 2, roomType: 'Suite', status: 'occupied', guestName: 'Bob Wilson', checkoutDate: '2026-01-17', rate: 8000, features: ['Sea View', 'Balcony'] },
        { id: 9, roomNumber: '301', floor: 3, roomType: 'Deluxe', status: 'clean', rate: 5000, features: ['Sea View'] },
        { id: 10, roomNumber: '302', floor: 3, roomType: 'Standard', status: 'inspected', rate: 3000, features: ['City View'] },
        { id: 11, roomNumber: '303', floor: 3, roomType: 'Executive', status: 'occupied', guestName: 'Alice Brown', checkoutDate: '2026-01-19', rate: 10000, features: ['Penthouse'] },
        { id: 12, roomNumber: '304', floor: 3, roomType: 'Suite', status: 'clean', rate: 8000, features: ['Sea View', 'Jacuzzi'] },
    ]);

    const filteredRooms = rooms.filter(room => {
        const matchesSearch = room.roomNumber.includes(searchTerm) ||
            (room.guestName?.toLowerCase().includes(searchTerm.toLowerCase()) ?? false);
        const matchesFloor = filterFloor === 'all' || room.floor.toString() === filterFloor;
        const matchesType = filterType === 'all' || room.roomType === filterType;
        const matchesStatus = filterStatus === 'all' || room.status === filterStatus;

        return matchesSearch && matchesFloor && matchesType && matchesStatus;
    });

    const stats = {
        total: rooms.length,
        occupied: rooms.filter(r => r.status === 'occupied').length,
        clean: rooms.filter(r => r.status === 'clean').length,
        dirty: rooms.filter(r => r.status === 'dirty').length,
        inspected: rooms.filter(r => r.status === 'inspected').length,
        available: rooms.filter(r => r.status === 'clean' || r.status === 'inspected').length,
    };

    const getStatusColor = (status: Room['status']) => {
        switch (status) {
            case 'clean': return 'from-emerald-500 to-emerald-600';
            case 'dirty': return 'from-rose-500 to-rose-600';
            case 'inspected': return 'from-amber-500 to-amber-600';
            case 'occupied': return 'from-blue-600 to-blue-700';
            default: return 'from-gray-400 to-gray-500';
        }
    };

    const getStatusBadge = (status: Room['status']) => {
        switch (status) {
            case 'clean': return { bg: 'bg-emerald-50 text-emerald-700 border-emerald-200', icon: <Sparkles size={11} />, label: 'Clean' };
            case 'dirty': return { bg: 'bg-rose-50 text-rose-700 border-rose-200', icon: <BedDouble size={11} />, label: 'Dirty' };
            case 'inspected': return { bg: 'bg-amber-50 text-amber-700 border-amber-200', icon: <Filter size={11} />, label: 'Inspected' };
            case 'occupied': return { bg: 'bg-blue-50 text-blue-700 border-blue-200', icon: <User size={11} />, label: 'Occupied' };
            default: return { bg: 'bg-gray-50 text-gray-700 border-gray-200', icon: null, label: status };
        }
    };

    return (
        <div className="p-3 sm:p-4 max-w-7xl mx-auto space-y-2.5 font-sans">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-gray-200">
                <div className="flex items-center gap-2">
                    <div className="w-7 h-7 bg-blue-600 rounded-md flex items-center justify-center text-white shadow-xs">
                        <BedDouble size={15} />
                    </div>
                    <div>
                        <h1 className="text-base font-bold text-gray-900 tracking-tight leading-none">Interactive Room Rack</h1>
                        <p className="text-[11px] text-gray-500 font-medium leading-none mt-1">Live room availability, housekeeping states & rates</p>
                    </div>
                </div>

                <div className="flex items-center gap-2 text-xs">
                    <span className="text-gray-500 font-medium">Capacity:</span>
                    <span className="px-2 py-0.5 bg-blue-50 text-blue-700 rounded font-bold border border-blue-100">
                        {((stats.occupied / stats.total) * 100).toFixed(0)}% Occupied
                    </span>
                </div>
            </div>

            {/* Stats Bar */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
                <div className="bg-white p-2.5 rounded-lg border border-gray-200/80 shadow-2xs">
                    <p className="text-[10px] font-bold text-gray-400 uppercase">Total Rooms</p>
                    <p className="text-lg font-bold text-gray-900 mt-0.5">{stats.total}</p>
                </div>
                <div className="bg-blue-50/70 p-2.5 rounded-lg border border-blue-200 shadow-2xs">
                    <p className="text-[10px] font-bold text-blue-700 uppercase">Occupied</p>
                    <p className="text-lg font-bold text-blue-900 mt-0.5">{stats.occupied}</p>
                </div>
                <div className="bg-emerald-50/70 p-2.5 rounded-lg border border-emerald-200 shadow-2xs">
                    <p className="text-[10px] font-bold text-emerald-700 uppercase">Clean & Ready</p>
                    <p className="text-lg font-bold text-emerald-900 mt-0.5">{stats.clean}</p>
                </div>
                <div className="bg-rose-50/70 p-2.5 rounded-lg border border-rose-200 shadow-2xs">
                    <p className="text-[10px] font-bold text-rose-700 uppercase">Dirty / Turnover</p>
                    <p className="text-lg font-bold text-rose-900 mt-0.5">{stats.dirty}</p>
                </div>
                <div className="bg-amber-50/70 p-2.5 rounded-lg border border-amber-200 shadow-2xs">
                    <p className="text-[10px] font-bold text-amber-700 uppercase">Inspected</p>
                    <p className="text-lg font-bold text-amber-900 mt-0.5">{stats.inspected}</p>
                </div>
                <div className="bg-white p-2.5 rounded-lg border-2 border-emerald-300 shadow-2xs">
                    <p className="text-[10px] font-bold text-emerald-600 uppercase">Available</p>
                    <p className="text-lg font-bold text-emerald-700 mt-0.5">{stats.available}</p>
                </div>
            </div>

            {/* Compact Filter Toolbar */}
            <div className="bg-white p-2 rounded-lg border border-gray-200/80 shadow-2xs">
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2">
                    <div className="relative flex items-center">
                        <Search className="absolute left-2.5 text-gray-400 pointer-events-none" size={13} />
                        <input
                            type="text"
                            placeholder="Filter by room or guest..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-7 pr-3 py-1 text-xs border border-gray-200 rounded-md focus:border-blue-500 focus:outline-none"
                        />
                    </div>
                    <select
                        value={filterFloor}
                        onChange={(e) => setFilterFloor(e.target.value)}
                        className="px-2 py-1 border border-gray-200 rounded-md text-xs font-medium text-gray-700 focus:border-blue-500 focus:outline-none bg-white"
                    >
                        <option value="all">All Floors</option>
                        <option value="1">1st Floor</option>
                        <option value="2">2nd Floor</option>
                        <option value="3">3rd Floor</option>
                    </select>
                    <select
                        value={filterType}
                        onChange={(e) => setFilterType(e.target.value)}
                        className="px-2 py-1 border border-gray-200 rounded-md text-xs font-medium text-gray-700 focus:border-blue-500 focus:outline-none bg-white"
                    >
                        <option value="all">All Room Types</option>
                        <option value="Standard">Standard</option>
                        <option value="Deluxe">Deluxe</option>
                        <option value="Suite">Suite</option>
                        <option value="Executive">Executive</option>
                    </select>
                    <select
                        value={filterStatus}
                        onChange={(e) => setFilterStatus(e.target.value)}
                        className="px-2 py-1 border border-gray-200 rounded-md text-xs font-medium text-gray-700 focus:border-blue-500 focus:outline-none bg-white"
                    >
                        <option value="all">All Operational Statuses</option>
                        <option value="clean">Clean</option>
                        <option value="dirty">Dirty</option>
                        <option value="inspected">Inspected</option>
                        <option value="occupied">Occupied</option>
                    </select>
                </div>
            </div>

            {/* High-Density Room Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 2xl:grid-cols-6 gap-2.5">
                {filteredRooms.map(room => {
                    const badge = getStatusBadge(room.status);

                    return (
                        <div
                            key={room.id}
                            className="bg-white rounded-lg border border-gray-200/90 overflow-hidden shadow-2xs hover:shadow-xs hover:border-blue-300 transition-all cursor-pointer flex flex-col justify-between"
                        >
                            {/* Accent Top Bar */}
                            <div className={`h-1 bg-gradient-to-r ${getStatusColor(room.status)}`} />

                            <div className="p-2.5 flex flex-col justify-between flex-1 space-y-2">
                                {/* Header: Room & Status */}
                                <div className="flex items-start justify-between">
                                    <div>
                                        <div className="flex items-center gap-1 text-[10px] text-gray-400">
                                            <MapPin size={10} />
                                            <span>Floor {room.floor}</span>
                                        </div>
                                        <h3 className="text-base font-bold text-gray-900 leading-tight">{room.roomNumber}</h3>
                                    </div>
                                    <span className={`px-1.5 py-0.5 rounded text-[10px] font-semibold border flex items-center gap-1 ${badge.bg}`}>
                                        {badge.icon}
                                        <span>{badge.label}</span>
                                    </span>
                                </div>

                                {/* Room Type & Features */}
                                <div>
                                    <span className="text-[10px] font-bold px-1.5 py-0.2 bg-gray-100 text-gray-700 rounded">
                                        {room.roomType}
                                    </span>
                                    {room.features && room.features.length > 0 && (
                                        <div className="flex flex-wrap gap-1 mt-1">
                                            {room.features.slice(0, 2).map((feature, idx) => (
                                                <span key={idx} className="text-[9px] px-1 py-0.2 bg-gray-50 text-gray-500 rounded border border-gray-100">
                                                    {feature}
                                                </span>
                                            ))}
                                        </div>
                                    )}
                                </div>

                                {/* Occupant / Vacant State */}
                                {room.status === 'occupied' && room.guestName ? (
                                    <div className="bg-blue-50/70 p-1.5 rounded-md border border-blue-100 text-[11px]">
                                        <p className="font-bold text-blue-900 truncate">{room.guestName}</p>
                                        <p className="text-[9px] text-blue-600 flex items-center gap-1 mt-0.5">
                                            <Calendar size={9} /> Checkout: {room.checkoutDate}
                                        </p>
                                    </div>
                                ) : (
                                    <div className="bg-gray-50 p-1 rounded-md text-[10px] text-gray-400 text-center">
                                        Available for booking
                                    </div>
                                )}

                                {/* Rate & Action */}
                                <div className="pt-1.5 border-t border-gray-100 flex items-center justify-between">
                                    <div>
                                        <p className="text-[8px] text-gray-400 uppercase font-bold leading-none">Rate</p>
                                        <p className="text-xs font-bold text-blue-600 leading-none mt-0.5">৳ {room.rate?.toLocaleString()}</p>
                                    </div>
                                    <button className="h-6 px-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded text-[10px] font-semibold transition-colors shadow-2xs">
                                        {room.status === 'occupied' ? 'Folio' : 'Assign'}
                                    </button>
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>

            {filteredRooms.length === 0 && (
                <div className="text-center py-10 bg-white border border-gray-200 rounded-lg">
                    <p className="text-xs font-bold text-gray-600">No rooms match filter criteria</p>
                    <p className="text-[10px] text-gray-400 mt-0.5">Clear search or choose a different floor</p>
                </div>
            )}
        </div>
    );
};

export default RoomRack;
