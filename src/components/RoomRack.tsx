import { useState } from 'react';
import { Search, Filter, BedDouble, Users, Sparkles, User, Calendar, DollarSign, MapPin, Star } from 'lucide-react';

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

    // Mock data - replace with API call
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

    // Filter logic
    const filteredRooms = rooms.filter(room => {
        const matchesSearch = room.roomNumber.includes(searchTerm) ||
            (room.guestName?.toLowerCase().includes(searchTerm.toLowerCase()) ?? false);
        const matchesFloor = filterFloor === 'all' || room.floor.toString() === filterFloor;
        const matchesType = filterType === 'all' || room.roomType === filterType;
        const matchesStatus = filterStatus === 'all' || room.status === filterStatus;

        return matchesSearch && matchesFloor && matchesType && matchesStatus;
    });

    // Stats calculation
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
            case 'clean': return 'from-emerald-400 to-emerald-600';
            case 'dirty': return 'from-rose-400 to-rose-600';
            case 'inspected': return 'from-amber-400 to-amber-600';
            case 'occupied': return 'from-blue-400 to-blue-600';
            default: return 'from-gray-400 to-gray-600';
        }
    };

    const getStatusBadgeColor = (status: Room['status']) => {
        switch (status) {
            case 'clean': return 'bg-emerald-500/10 text-emerald-700 border-emerald-200';
            case 'dirty': return 'bg-rose-500/10 text-rose-700 border-rose-200';
            case 'inspected': return 'bg-amber-500/10 text-amber-700 border-amber-200';
            case 'occupied': return 'bg-blue-500/10 text-blue-700 border-blue-200';
            default: return 'bg-gray-500/10 text-gray-700 border-gray-200';
        }
    };

    const getStatusIcon = (status: Room['status']) => {
        switch (status) {
            case 'clean': return <Sparkles size={14} />;
            case 'dirty': return <BedDouble size={14} />;
            case 'inspected': return <Filter size={14} />;
            case 'occupied': return <User size={14} />;
            default: return null;
        }
    };

    const getStatusLabel = (status: Room['status']) => {
        switch (status) {
            case 'clean': return 'Clean';
            case 'dirty': return 'Dirty';
            case 'inspected': return 'Inspected';
            case 'occupied': return 'Occupied';
            default: return status;
        }
    };

    const getRoomTypeColor = (type: Room['roomType']) => {
        switch (type) {
            case 'Executive': return 'text-purple-600 bg-purple-50';
            case 'Suite': return 'text-indigo-600 bg-indigo-50';
            case 'Deluxe': return 'text-blue-600 bg-blue-50';
            case 'Standard': return 'text-gray-600 bg-gray-50';
            default: return 'text-gray-600 bg-gray-50';
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50/30 to-gray-50 p-4 md:p-6 lg:p-8">
            {/* Header */}
            <div className="mb-8">
                <div className="flex items-center gap-3 mb-2">
                    <div className="w-12 h-12 bg-gradient-to-br from-blue-600 to-blue-700 rounded-xl flex items-center justify-center shadow-lg shadow-blue-600/30">
                        <BedDouble size={24} className="text-white" />
                    </div>
                    <div>
                        <h1 className="text-3xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent">Room Rack</h1>
                        <p className="text-sm text-gray-500">Real-time room status and availability</p>
                    </div>
                </div>
            </div>

            {/* Stats Bar */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
                <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm hover:shadow-md transition-all group">
                    <div className="flex items-center justify-between mb-2">
                        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Total</p>
                        <div className="w-8 h-8 bg-gray-100 rounded-lg flex items-center justify-center group-hover:bg-gray-200 transition-colors">
                            <BedDouble size={16} className="text-gray-600" />
                        </div>
                    </div>
                    <p className="text-3xl font-bold text-gray-900">{stats.total}</p>
                </div>

                <div className="bg-gradient-to-br from-blue-500 to-blue-600 p-5 rounded-2xl shadow-lg shadow-blue-500/30 hover:shadow-xl hover:shadow-blue-500/40 transition-all group">
                    <div className="flex items-center justify-between mb-2">
                        <p className="text-xs font-semibold text-blue-100 uppercase tracking-wide">Occupied</p>
                        <div className="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center group-hover:bg-white/30 transition-colors">
                            <Users size={16} className="text-white" />
                        </div>
                    </div>
                    <p className="text-3xl font-bold text-white">{stats.occupied}</p>
                    <p className="text-xs text-blue-100 mt-1">{((stats.occupied / stats.total) * 100).toFixed(0)}% occupancy</p>
                </div>

                <div className="bg-gradient-to-br from-emerald-500 to-emerald-600 p-5 rounded-2xl shadow-lg shadow-emerald-500/30 hover:shadow-xl hover:shadow-emerald-500/40 transition-all group">
                    <div className="flex items-center justify-between mb-2">
                        <p className="text-xs font-semibold text-emerald-100 uppercase tracking-wide">Clean</p>
                        <div className="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center group-hover:bg-white/30 transition-colors">
                            <Sparkles size={16} className="text-white" />
                        </div>
                    </div>
                    <p className="text-3xl font-bold text-white">{stats.clean}</p>
                </div>

                <div className="bg-gradient-to-br from-rose-500 to-rose-600 p-5 rounded-2xl shadow-lg shadow-rose-500/30 hover:shadow-xl hover:shadow-rose-500/40 transition-all group">
                    <div className="flex items-center justify-between mb-2">
                        <p className="text-xs font-semibold text-rose-100 uppercase tracking-wide">Dirty</p>
                        <div className="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center group-hover:bg-white/30 transition-colors">
                            <BedDouble size={16} className="text-white" />
                        </div>
                    </div>
                    <p className="text-3xl font-bold text-white">{stats.dirty}</p>
                </div>

                <div className="bg-gradient-to-br from-amber-500 to-amber-600 p-5 rounded-2xl shadow-lg shadow-amber-500/30 hover:shadow-xl hover:shadow-amber-500/40 transition-all group">
                    <div className="flex items-center justify-between mb-2">
                        <p className="text-xs font-semibold text-amber-100 uppercase tracking-wide">Inspected</p>
                        <div className="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center group-hover:bg-white/30 transition-colors">
                            <Filter size={16} className="text-white" />
                        </div>
                    </div>
                    <p className="text-3xl font-bold text-white">{stats.inspected}</p>
                </div>

                <div className="bg-white p-5 rounded-2xl border-2 border-emerald-200 shadow-sm hover:shadow-md transition-all group">
                    <div className="flex items-center justify-between mb-2">
                        <p className="text-xs font-semibold text-emerald-600 uppercase tracking-wide">Available</p>
                        <div className="w-8 h-8 bg-emerald-100 rounded-lg flex items-center justify-center group-hover:bg-emerald-200 transition-colors">
                            <Star size={16} className="text-emerald-600" />
                        </div>
                    </div>
                    <p className="text-3xl font-bold text-emerald-600">{stats.available}</p>
                </div>
            </div>

            {/* Filters */}
            <div className="bg-white/80 backdrop-blur-sm p-6 rounded-2xl border border-gray-200 shadow-lg mb-8">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div className="relative">
                        <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
                        <input
                            type="text"
                            placeholder="Search room or guest..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-12 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-sm bg-white shadow-sm"
                        />
                    </div>
                    <select
                        value={filterFloor}
                        onChange={(e) => setFilterFloor(e.target.value)}
                        className="px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-sm bg-white shadow-sm font-medium"
                    >
                        <option value="all">All Floors</option>
                        <option value="1">1st Floor</option>
                        <option value="2">2nd Floor</option>
                        <option value="3">3rd Floor</option>
                    </select>
                    <select
                        value={filterType}
                        onChange={(e) => setFilterType(e.target.value)}
                        className="px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-sm bg-white shadow-sm font-medium"
                    >
                        <option value="all">All Types</option>
                        <option value="Standard">Standard</option>
                        <option value="Deluxe">Deluxe</option>
                        <option value="Suite">Suite</option>
                        <option value="Executive">Executive</option>
                    </select>
                    <select
                        value={filterStatus}
                        onChange={(e) => setFilterStatus(e.target.value)}
                        className="px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-sm bg-white shadow-sm font-medium"
                    >
                        <option value="all">All Status</option>
                        <option value="clean">Clean</option>
                        <option value="dirty">Dirty</option>
                        <option value="inspected">Inspected</option>
                        <option value="occupied">Occupied</option>
                    </select>
                </div>
            </div>

            {/* Room Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-6">
                {filteredRooms.map(room => (
                    <div
                        key={room.id}
                        className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-md hover:shadow-2xl hover:scale-105 transition-all duration-300 cursor-pointer group"
                    >
                        {/* Status Header with Gradient */}
                        <div className={`h-2 bg-gradient-to-r ${getStatusColor(room.status)}`} />

                        <div className="p-6">
                            {/* Room Number & Status */}
                            <div className="flex items-start justify-between mb-4">
                                <div>
                                    <div className="flex items-center gap-2 mb-1">
                                        <MapPin size={16} className="text-gray-400" />
                                        <span className="text-xs font-medium text-gray-500">Floor {room.floor}</span>
                                    </div>
                                    <h3 className="text-3xl font-bold text-gray-900">{room.roomNumber}</h3>
                                </div>
                                <span className={`px-3 py-1.5 rounded-full text-xs font-semibold border flex items-center gap-1.5 ${getStatusBadgeColor(room.status)}`}>
                                    {getStatusIcon(room.status)}
                                    {getStatusLabel(room.status)}
                                </span>
                            </div>

                            {/* Room Type */}
                            <div className={`inline-flex items-center px-3 py-1.5 rounded-lg text-xs font-semibold mb-4 ${getRoomTypeColor(room.roomType)}`}>
                                {room.roomType}
                            </div>

                            {/* Features */}
                            {room.features && room.features.length > 0 && (
                                <div className="flex flex-wrap gap-1.5 mb-4">
                                    {room.features.map((feature, idx) => (
                                        <span key={idx} className="px-2 py-1 bg-gray-100 text-gray-600 rounded-md text-xs font-medium">
                                            {feature}
                                        </span>
                                    ))}
                                </div>
                            )}

                            {/* Guest Info (if occupied) */}
                            {room.status === 'occupied' && room.guestName ? (
                                <div className="bg-gradient-to-r from-blue-50 to-blue-100/50 p-4 rounded-xl mb-4 border border-blue-200">
                                    <div className="flex items-center gap-2 mb-2">
                                        <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center">
                                            <User size={14} className="text-white" />
                                        </div>
                                        <p className="text-sm font-bold text-blue-900">{room.guestName}</p>
                                    </div>
                                    <div className="flex items-center gap-2 text-xs text-blue-700">
                                        <Calendar size={12} />
                                        <span className="font-medium">Checkout: {room.checkoutDate}</span>
                                    </div>
                                </div>
                            ) : (
                                <div className="bg-gray-50 p-4 rounded-xl mb-4 border border-gray-100">
                                    <p className="text-xs text-gray-500 text-center font-medium">Available for booking</p>
                                </div>
                            )}

                            {/* Rate */}
                            <div className="flex items-center justify-between pt-4 border-t border-gray-100 mb-4">
                                <div className="flex items-center gap-1.5 text-gray-500">
                                    <DollarSign size={14} />
                                    <span className="text-xs font-medium">Rate/Night</span>
                                </div>
                                <span className="text-lg font-bold bg-gradient-to-r from-blue-600 to-blue-700 bg-clip-text text-transparent">
                                    ৳ {room.rate?.toLocaleString()}
                                </span>
                            </div>

                            {/* Quick Action Button */}
                            <button className="w-full py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-xl text-sm font-semibold hover:from-blue-700 hover:to-blue-800 transition-all shadow-lg shadow-blue-600/30 hover:shadow-xl hover:shadow-blue-600/40 transform hover:-translate-y-0.5">
                                {room.status === 'occupied' ? 'View Details' : 'Assign Guest'}
                            </button>
                        </div>
                    </div>
                ))}
            </div>

            {/* Empty State */}
            {filteredRooms.length === 0 && (
                <div className="text-center py-20">
                    <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-6">
                        <BedDouble size={40} className="text-gray-300" />
                    </div>
                    <h3 className="text-xl font-bold text-gray-700 mb-2">No rooms found</h3>
                    <p className="text-sm text-gray-500">Try adjusting your filters or search term</p>
                </div>
            )}
        </div>
    );
};

export default RoomRack;
