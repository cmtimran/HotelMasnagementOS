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

    const [rooms, setRooms] = useState<HousekeepingRoom[]>([
        { id: 1, roomNumber: '101', floor: 1, roomType: 'Deluxe', status: 'dirty', assignedTo: 'Fatima', priority: 'high', notes: 'Guest checked out 30m ago' },
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
                    case 'dirty': newStatus = 'clean'; break;
                    case 'clean': newStatus = 'inspected'; break;
                    case 'inspected': newStatus = 'out-of-order'; break;
                    case 'out-of-order': newStatus = 'dirty'; break;
                    default: newStatus = 'clean';
                }
                return { ...room, status: newStatus };
            }
            return room;
        }));
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
        <div className="p-3 sm:p-4 max-w-7xl mx-auto space-y-2.5 font-sans">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-gray-200">
                <div className="flex items-center gap-2">
                    <div className="w-7 h-7 bg-emerald-600 rounded-md flex items-center justify-center text-white shadow-xs">
                        <Sparkles size={15} />
                    </div>
                    <div>
                        <h1 className="text-base font-bold text-gray-900 tracking-tight leading-none">Housekeeping Grid & Task Board</h1>
                        <p className="text-[11px] text-gray-500 font-medium leading-none mt-1">Room cleanliness states, supervisor inspections & staff turnover</p>
                    </div>
                </div>

                <div className="text-xs text-gray-500 font-medium flex items-center gap-2">
                    <span>Turnover Queue:</span>
                    <span className="px-2 py-0.5 bg-rose-50 text-rose-700 font-bold rounded border border-rose-200">
                        {stats.dirty} Pending Cleaning
                    </span>
                </div>
            </div>

            {/* Compact Stats Bar */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
                <div className="bg-white p-2.5 rounded-lg border border-gray-200/80 shadow-2xs">
                    <p className="text-[10px] font-bold text-gray-400 uppercase">Total Inventory</p>
                    <p className="text-base font-bold text-gray-900 mt-0.5">{stats.total}</p>
                </div>
                <div className="bg-rose-50/70 p-2.5 rounded-lg border border-rose-200 shadow-2xs">
                    <p className="text-[10px] font-bold text-rose-700 uppercase">Dirty (Turnover)</p>
                    <p className="text-base font-bold text-rose-900 mt-0.5">{stats.dirty}</p>
                </div>
                <div className="bg-emerald-50/70 p-2.5 rounded-lg border border-emerald-200 shadow-2xs">
                    <p className="text-[10px] font-bold text-emerald-700 uppercase">Clean & Ready</p>
                    <p className="text-base font-bold text-emerald-900 mt-0.5">{stats.clean}</p>
                </div>
                <div className="bg-amber-50/70 p-2.5 rounded-lg border border-amber-200 shadow-2xs">
                    <p className="text-[10px] font-bold text-amber-700 uppercase">Inspected</p>
                    <p className="text-base font-bold text-amber-900 mt-0.5">{stats.inspected}</p>
                </div>
                <div className="bg-gray-50 p-2.5 rounded-lg border border-gray-300 shadow-2xs">
                    <p className="text-[10px] font-bold text-gray-600 uppercase">Out of Order</p>
                    <p className="text-base font-bold text-gray-900 mt-0.5">{stats.outOfOrder}</p>
                </div>
            </div>

            {/* Filter Bar */}
            <div className="bg-white p-2 rounded-lg border border-gray-200/80 shadow-2xs">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    <div className="relative flex items-center">
                        <Search className="absolute left-2.5 text-gray-400 pointer-events-none" size={13} />
                        <input
                            type="text"
                            placeholder="Search room or assigned housekeeper..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-7 pr-3 py-1 text-xs border border-gray-200 rounded-md focus:border-emerald-500 focus:outline-none"
                        />
                    </div>
                    <select
                        value={filterFloor}
                        onChange={(e) => setFilterFloor(e.target.value)}
                        className="px-2 py-1 border border-gray-200 rounded-md text-xs font-medium text-gray-700 bg-white"
                    >
                        <option value="all">All Floors</option>
                        <option value="1">1st Floor</option>
                        <option value="2">2nd Floor</option>
                        <option value="3">3rd Floor</option>
                    </select>
                    <select
                        value={filterStatus}
                        onChange={(e) => setFilterStatus(e.target.value)}
                        className="px-2 py-1 border border-gray-200 rounded-md text-xs font-medium text-gray-700 bg-white"
                    >
                        <option value="all">All Housekeeping Statuses</option>
                        <option value="dirty">Dirty</option>
                        <option value="clean">Clean</option>
                        <option value="inspected">Inspected</option>
                        <option value="out-of-order">Out of Order</option>
                    </select>
                </div>
            </div>

            {/* High-Density Housekeeping Table */}
            <div className="bg-white rounded-lg border border-gray-200/90 shadow-2xs overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead className="bg-gray-50 border-b border-gray-200 text-[10px] font-bold text-gray-500 uppercase tracking-wider">
                            <tr>
                                <th className="px-3 py-2">Room</th>
                                <th className="px-3 py-2">Type</th>
                                <th className="px-3 py-2">Status (Click to cycle)</th>
                                <th className="px-3 py-2">Housekeeper</th>
                                <th className="px-3 py-2">Priority</th>
                                <th className="px-3 py-2">Last Cleaned</th>
                                <th className="px-3 py-2">Turnover Notes</th>
                                <th className="px-3 py-2 text-right">Action</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 text-xs">
                            {filteredRooms.map(room => (
                                <tr key={room.id} className="hover:bg-gray-50/70 transition-colors">
                                    <td className="px-3 py-1.5 font-bold text-gray-900">
                                        {room.roomNumber}
                                    </td>
                                    <td className="px-3 py-1.5 text-gray-600 font-medium">
                                        {room.roomType}
                                    </td>
                                    <td className="px-3 py-1.5">
                                        <button
                                            onClick={() => cycleStatus(room.id)}
                                            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold border transition-all hover:shadow-2xs ${getStatusStyle(room.status)}`}
                                            title="Click to advance status"
                                        >
                                            {getStatusIcon(room.status)}
                                            <span className="capitalize">{room.status}</span>
                                        </button>
                                    </td>
                                    <td className="px-3 py-1.5">
                                        {room.assignedTo ? (
                                            <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-gray-800">
                                                <Users size={12} className="text-blue-500" />
                                                {room.assignedTo}
                                            </span>
                                        ) : (
                                            <span className="text-[10px] text-gray-400 italic">Unassigned</span>
                                        )}
                                    </td>
                                    <td className="px-3 py-1.5">
                                        <span className={`px-1.5 py-0.2 rounded text-[9px] font-bold uppercase ${room.priority === 'high' ? 'bg-rose-100 text-rose-700' : 'bg-gray-100 text-gray-600'}`}>
                                            {room.priority}
                                        </span>
                                    </td>
                                    <td className="px-3 py-1.5 text-gray-500 text-[11px]">
                                        {room.lastCleaned ? (
                                            <span className="flex items-center gap-1">
                                                <Clock size={11} className="text-gray-400" /> {room.lastCleaned}
                                            </span>
                                        ) : '-'}
                                    </td>
                                    <td className="px-3 py-1.5 text-gray-500 text-[11px]">
                                        {room.notes ? (
                                            <span className="flex items-center gap-1 text-amber-700">
                                                <AlertCircle size={11} className="flex-shrink-0" />
                                                <span className="truncate max-w-[180px]">{room.notes}</span>
                                            </span>
                                        ) : '-'}
                                    </td>
                                    <td className="px-3 py-1.5 text-right">
                                        <button className="h-6 px-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-[10px] font-semibold transition-colors shadow-2xs">
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
