import { useState } from 'react';
import { Search, Sparkles, BedDouble, AlertCircle, Users, CheckCircle2, XCircle, Clock } from 'lucide-react';

interface HousekeepingRoom {
    id: number;
    roomNumber: string;
    floor: number;
    roomType: string;
    status: 'dirty' | 'clean' | 'inspected' | 'out-of-order';
    assignedTo?: string;
    priority: 'high' | 'normal' | 'low';
    lastCleaned?: string;
    notes?: string;
}

const HousekeepingGrid = () => {
    const [searchTerm, setSearchTerm] = useState('');
    const [filterFloor, setFilterFloor] = useState('all');
    const [filterStatus, setFilterStatus] = useState('all');

    // Mock data
    const [rooms, setRooms] = useState<HousekeepingRoom[]>([
        { id: 1, roomNumber: '101', floor: 1, roomType: 'Deluxe', status: 'dirty', assignedTo: 'Fatima', priority: 'high', notes: 'Guest checked out 30 min ago' },
        { id: 2, roomNumber: '102', floor: 1, roomType: 'Standard', status: 'clean', assignedTo: 'Fatima', priority: 'normal', lastCleaned: '10:30 AM' },
        { id: 3, roomNumber: '103', floor: 1, roomType: 'Suite', status: 'dirty', priority: 'high', notes: 'VIP arrival at 2 PM' },
        { id: 4, roomNumber: '104', floor: 1, roomType: 'Deluxe', status: 'inspected', assignedTo: 'Fatima', priority: 'normal', lastCleaned: '11:00 AM' },
        { id: 5, roomNumber: '201', floor: 2, roomType: 'Executive', status: 'clean', assignedTo: 'Rahima', priority: 'normal', lastCleaned: '09:45 AM' },
        { id: 6, roomNumber: '202', floor: 2, roomType: 'Deluxe', status: 'dirty', assignedTo: 'Rahima', priority: 'normal' },
        { id: 7, roomNumber: '203', floor: 2, roomType: 'Standard', status: 'out-of-order', priority: 'high', notes: 'AC repair pending' },
        { id: 8, roomNumber: '204', floor: 2, roomType: 'Suite', status: 'clean', assignedTo: 'Rahima', priority: 'normal', lastCleaned: '10:15 AM' },
        { id: 9, roomNumber: '301', floor: 3, roomType: 'Deluxe', status: 'dirty', priority: 'normal' },
        { id: 10, roomNumber: '302', floor: 3, roomType: 'Standard', status: 'inspected', assignedTo: 'Salma', priority: 'normal', lastCleaned: '11:30 AM' },
        { id: 11, roomNumber: '303', floor: 3, roomType: 'Executive', status: 'clean', assignedTo: 'Salma', priority: 'normal', lastCleaned: '09:00 AM' },
        { id: 12, roomNumber: '304', floor: 3, roomType: 'Suite', status: 'dirty', assignedTo: 'Salma', priority: 'high', notes: 'Deep cleaning required' },
    ]);

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


    const cycleStatus = (id: number) => {
        setRooms(rooms.map(room => {
            if (room.id === id) {
                let newStatus: HousekeepingRoom['status'];
                switch (room.status) {
                    case 'dirty':
                        newStatus = 'clean';
                        break;
                    case 'clean':
                        newStatus = 'inspected';
                        break;
                    case 'inspected':
                        newStatus = 'dirty';
                        break;
                    default:
                        newStatus = room.status;
                }
                return { ...room, status: newStatus, lastCleaned: newStatus === 'clean' ? new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }) : room.lastCleaned };
            }
            return room;
        }));
    };

    const getStatusColor = (status: HousekeepingRoom['status']) => {
        switch (status) {
            case 'dirty': return 'bg-rose-500';
            case 'clean': return 'bg-emerald-500';
            case 'inspected': return 'bg-amber-500';
            case 'out-of-order': return 'bg-gray-500';
            default: return 'bg-gray-500';
        }
    };

    const getStatusBg = (status: HousekeepingRoom['status']) => {
        switch (status) {
            case 'dirty': return 'bg-rose-50 border-rose-200';
            case 'clean': return 'bg-emerald-50 border-emerald-200';
            case 'inspected': return 'bg-amber-50 border-amber-200';
            case 'out-of-order': return 'bg-gray-50 border-gray-300';
            default: return 'bg-gray-50 border-gray-200';
        }
    };

    const getStatusIcon = (status: HousekeepingRoom['status']) => {
        switch (status) {
            case 'dirty': return <BedDouble size={16} className="text-rose-700" />;
            case 'clean': return <Sparkles size={16} className="text-emerald-700" />;
            case 'inspected': return <CheckCircle2 size={16} className="text-amber-700" />;
            case 'out-of-order': return <XCircle size={16} className="text-gray-700" />;
            default: return null;
        }
    };

    const getPriorityColor = (priority: HousekeepingRoom['priority']) => {
        switch (priority) {
            case 'high': return 'bg-red-100 text-red-700 border-red-300';
            case 'normal': return 'bg-blue-100 text-blue-700 border-blue-300';
            case 'low': return 'bg-gray-100 text-gray-700 border-gray-300';
            default: return 'bg-gray-100 text-gray-700 border-gray-300';
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-50 via-emerald-50/20 to-gray-50 p-4 md:p-6 lg:p-8">
            {/* Header */}
            <div className="mb-8">
                <div className="flex items-center gap-3 mb-2">
                    <div className="w-12 h-12 bg-gradient-to-br from-emerald-600 to-emerald-700 rounded-xl flex items-center justify-center shadow-lg shadow-emerald-600/30">
                        <Sparkles size={24} className="text-white" />
                    </div>
                    <div>
                        <h1 className="text-3xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent">Housekeeping</h1>
                        <p className="text-sm text-gray-500">Room status and cleaning assignments</p>
                    </div>
                </div>
            </div>

            {/* Stats Bar */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
                <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm hover:shadow-md transition-all">
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Total Rooms</p>
                    <p className="text-3xl font-bold text-gray-900">{stats.total}</p>
                </div>
                <div className="bg-gradient-to-br from-rose-500 to-rose-600 p-5 rounded-2xl shadow-lg shadow-rose-500/30">
                    <p className="text-xs font-semibold text-rose-100 uppercase tracking-wide mb-2">Dirty</p>
                    <p className="text-3xl font-bold text-white">{stats.dirty}</p>
                </div>
                <div className="bg-gradient-to-br from-emerald-500 to-emerald-600 p-5 rounded-2xl shadow-lg shadow-emerald-500/30">
                    <p className="text-xs font-semibold text-emerald-100 uppercase tracking-wide mb-2">Clean</p>
                    <p className="text-3xl font-bold text-white">{stats.clean}</p>
                </div>
                <div className="bg-gradient-to-br from-amber-500 to-amber-600 p-5 rounded-2xl shadow-lg shadow-amber-500/30">
                    <p className="text-xs font-semibold text-amber-100 uppercase tracking-wide mb-2">Inspected</p>
                    <p className="text-3xl font-bold text-white">{stats.inspected}</p>
                </div>
                <div className="bg-gradient-to-br from-gray-500 to-gray-600 p-5 rounded-2xl shadow-lg shadow-gray-500/30">
                    <p className="text-xs font-semibold text-gray-100 uppercase tracking-wide mb-2">Out of Order</p>
                    <p className="text-3xl font-bold text-white">{stats.outOfOrder}</p>
                </div>
            </div>

            {/* Filters */}
            <div className="bg-white/80 backdrop-blur-sm p-6 rounded-2xl border border-gray-200 shadow-lg mb-8">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="relative">
                        <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
                        <input
                            type="text"
                            placeholder="Search room or staff..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-12 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none text-sm bg-white shadow-sm"
                        />
                    </div>
                    <select
                        value={filterFloor}
                        onChange={(e) => setFilterFloor(e.target.value)}
                        className="px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none text-sm bg-white shadow-sm font-medium"
                    >
                        <option value="all">All Floors</option>
                        <option value="1">1st Floor</option>
                        <option value="2">2nd Floor</option>
                        <option value="3">3rd Floor</option>
                    </select>
                    <select
                        value={filterStatus}
                        onChange={(e) => setFilterStatus(e.target.value)}
                        className="px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none text-sm bg-white shadow-sm font-medium"
                    >
                        <option value="all">All Status</option>
                        <option value="dirty">Dirty</option>
                        <option value="clean">Clean</option>
                        <option value="inspected">Inspected</option>
                        <option value="out-of-order">Out of Order</option>
                    </select>
                </div>
            </div>

            {/* Housekeeping Grid */}
            <div className="bg-white rounded-2xl border border-gray-200 shadow-xl overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead className="bg-gradient-to-r from-gray-50 to-gray-100 border-b border-gray-200">
                            <tr>
                                <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Room</th>
                                <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Type</th>
                                <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Status</th>
                                <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Assigned To</th>
                                <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Priority</th>
                                <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Last Cleaned</th>
                                <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Notes</th>
                                <th className="px-6 py-4 text-right text-xs font-bold text-gray-700 uppercase tracking-wider">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {filteredRooms.map(room => (
                                <tr key={room.id} className={`transition-all hover:shadow-md ${getStatusBg(room.status)}`}>
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-3">
                                            <div className={`w-3 h-3 rounded-full ${getStatusColor(room.status)}`} />
                                            <span className="text-lg font-bold text-gray-900">{room.roomNumber}</span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className="text-sm font-medium text-gray-700">{room.roomType}</span>
                                    </td>
                                    <td className="px-6 py-4">
                                        <button
                                            onClick={() => cycleStatus(room.id)}
                                            className="flex items-center gap-2 px-3 py-1.5 rounded-lg border font-semibold text-xs uppercase transition-all hover:scale-105"
                                            style={{
                                                backgroundColor: room.status === 'dirty' ? '#fee2e2' : room.status === 'clean' ? '#d1fae5' : room.status === 'inspected' ? '#fef3c7' : '#f3f4f6',
                                                borderColor: room.status === 'dirty' ? '#fecaca' : room.status === 'clean' ? '#a7f3d0' : room.status === 'inspected' ? '#fde68a' : '#e5e7eb',
                                                color: room.status === 'dirty' ? '#991b1b' : room.status === 'clean' ? '#065f46' : room.status === 'inspected' ? '#92400e' : '#374151'
                                            }}
                                        >
                                            {getStatusIcon(room.status)}
                                            {room.status}
                                        </button>
                                    </td>
                                    <td className="px-6 py-4">
                                        {room.assignedTo ? (
                                            <div className="flex items-center gap-2">
                                                <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center">
                                                    <Users size={14} className="text-white" />
                                                </div>
                                                <span className="text-sm font-semibold text-gray-900">{room.assignedTo}</span>
                                            </div>
                                        ) : (
                                            <span className="text-sm text-gray-400 italic">Unassigned</span>
                                        )}
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className={`px-3 py-1 rounded-full text-xs font-bold border uppercase ${getPriorityColor(room.priority)}`}>
                                            {room.priority}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4">
                                        {room.lastCleaned ? (
                                            <div className="flex items-center gap-1.5 text-sm text-gray-600">
                                                <Clock size={14} className="text-gray-400" />
                                                {room.lastCleaned}
                                            </div>
                                        ) : (
                                            <span className="text-sm text-gray-400">-</span>
                                        )}
                                    </td>
                                    <td className="px-6 py-4">
                                        {room.notes ? (
                                            <div className="flex items-start gap-1.5 max-w-xs">
                                                <AlertCircle size={14} className="text-amber-500 mt-0.5 flex-shrink-0" />
                                                <span className="text-xs text-gray-600">{room.notes}</span>
                                            </div>
                                        ) : (
                                            <span className="text-sm text-gray-400">-</span>
                                        )}
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <button className="px-4 py-2 bg-gradient-to-r from-emerald-600 to-emerald-700 text-white rounded-lg text-xs font-semibold hover:from-emerald-700 hover:to-emerald-800 transition-all shadow-md">
                                            Assign
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
