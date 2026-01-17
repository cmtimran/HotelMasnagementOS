import { useState } from 'react';
import { Building2, BedDouble, Users, Wrench } from 'lucide-react';

interface Room {
    id: number;
    number: string;
    floor: number;
    x: number;
    y: number;
    width: number;
    height: number;
    status: 'available' | 'occupied' | 'cleaning' | 'maintenance';
    guests?: number;
}

const FloorPlan = () => {
    const [selectedFloor, setSelectedFloor] = useState(1);
    const [selectedRoom, setSelectedRoom] = useState<Room | null>(null);

    // Mock room data with positions
    const rooms: Room[] = [
        // Floor 1
        { id: 1, number: '101', floor: 1, x: 50, y: 50, width: 120, height: 80, status: 'occupied', guests: 2 },
        { id: 2, number: '102', floor: 1, x: 200, y: 50, width: 120, height: 80, status: 'available' },
        { id: 3, number: '103', floor: 1, x: 350, y: 50, width: 120, height: 80, status: 'cleaning' },
        { id: 4, number: '104', floor: 1, x: 500, y: 50, width: 120, height: 80, status: 'occupied', guests: 1 },
        { id: 5, number: '105', floor: 1, x: 50, y: 160, width: 120, height: 80, status: 'available' },
        { id: 6, number: '106', floor: 1, x: 200, y: 160, width: 120, height: 80, status: 'maintenance' },
        { id: 7, number: '107', floor: 1, x: 350, y: 160, width: 120, height: 80, status: 'occupied', guests: 2 },
        { id: 8, number: '108', floor: 1, x: 500, y: 160, width: 120, height: 80, status: 'available' },
        // Floor 2
        { id: 9, number: '201', floor: 2, x: 50, y: 50, width: 120, height: 80, status: 'occupied', guests: 2 },
        { id: 10, number: '202', floor: 2, x: 200, y: 50, width: 120, height: 80, status: 'available' },
        { id: 11, number: '203', floor: 2, x: 350, y: 50, width: 120, height: 80, status: 'occupied', guests: 3 },
        { id: 12, number: '204', floor: 2, x: 500, y: 50, width: 120, height: 80, status: 'cleaning' },
        { id: 13, number: '205', floor: 2, x: 50, y: 160, width: 120, height: 80, status: 'available' },
        { id: 14, number: '206', floor: 2, x: 200, y: 160, width: 120, height: 80, status: 'occupied', guests: 2 },
        { id: 15, number: '207', floor: 2, x: 350, y: 160, width: 120, height: 80, status: 'available' },
        { id: 16, number: '208', floor: 2, x: 500, y: 160, width: 120, height: 80, status: 'maintenance' },
    ];

    const floorRooms = rooms.filter(r => r.floor === selectedFloor);

    const getStatusColor = (status: Room['status']) => {
        switch (status) {
            case 'available': return '#10b981'; // emerald-500
            case 'occupied': return '#ef4444'; // red-500
            case 'cleaning': return '#f59e0b'; // amber-500
            case 'maintenance': return '#6b7280'; // gray-500
        }
    };

    const getStatusLabel = (status: Room['status']) => {
        switch (status) {
            case 'available': return 'Available';
            case 'occupied': return 'Occupied';
            case 'cleaning': return 'Cleaning';
            case 'maintenance': return 'Maintenance';
        }
    };

    const stats = {
        total: floorRooms.length,
        available: floorRooms.filter(r => r.status === 'available').length,
        occupied: floorRooms.filter(r => r.status === 'occupied').length,
        cleaning: floorRooms.filter(r => r.status === 'cleaning').length,
        maintenance: floorRooms.filter(r => r.status === 'maintenance').length,
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50/20 to-gray-50 p-4 md:p-6 lg:p-8">
            {/* Header */}
            <div className="mb-8">
                <div className="flex items-center gap-3 mb-2">
                    <div className="w-12 h-12 bg-gradient-to-br from-blue-600 to-blue-700 rounded-xl flex items-center justify-center shadow-lg shadow-blue-600/30">
                        <Building2 size={24} className="text-white" />
                    </div>
                    <div>
                        <h1 className="text-3xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent">Floor Plan View</h1>
                        <p className="text-sm text-gray-500">Interactive room layout and status</p>
                    </div>
                </div>
            </div>

            {/* Floor Selector */}
            <div className="bg-white/80 backdrop-blur-sm p-6 rounded-2xl border border-gray-200 shadow-lg mb-6">
                <div className="flex items-center justify-between">
                    <div className="flex gap-3">
                        {[1, 2, 3].map(floor => (
                            <button
                                key={floor}
                                onClick={() => setSelectedFloor(floor)}
                                className={`px-6 py-3 rounded-xl font-semibold transition-all ${selectedFloor === floor
                                        ? 'bg-gradient-to-r from-blue-600 to-blue-700 text-white shadow-lg shadow-blue-600/30'
                                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                    }`}
                            >
                                Floor {floor}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
                <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm">
                    <p className="text-xs font-semibold text-gray-500 uppercase mb-2">Total Rooms</p>
                    <p className="text-3xl font-bold text-gray-900">{stats.total}</p>
                </div>
                <div className="bg-gradient-to-br from-emerald-500 to-emerald-600 p-5 rounded-2xl shadow-lg shadow-emerald-500/30">
                    <p className="text-xs font-semibold text-emerald-100 uppercase mb-2">Available</p>
                    <p className="text-3xl font-bold text-white">{stats.available}</p>
                </div>
                <div className="bg-gradient-to-br from-red-500 to-red-600 p-5 rounded-2xl shadow-lg shadow-red-500/30">
                    <p className="text-xs font-semibold text-red-100 uppercase mb-2">Occupied</p>
                    <p className="text-3xl font-bold text-white">{stats.occupied}</p>
                </div>
                <div className="bg-gradient-to-br from-amber-500 to-amber-600 p-5 rounded-2xl shadow-lg shadow-amber-500/30">
                    <p className="text-xs font-semibold text-amber-100 uppercase mb-2">Cleaning</p>
                    <p className="text-3xl font-bold text-white">{stats.cleaning}</p>
                </div>
                <div className="bg-gradient-to-br from-gray-500 to-gray-600 p-5 rounded-2xl shadow-lg shadow-gray-500/30">
                    <p className="text-xs font-semibold text-gray-100 uppercase mb-2">Maintenance</p>
                    <p className="text-3xl font-bold text-white">{stats.maintenance}</p>
                </div>
            </div>

            {/* Floor Plan */}
            <div className="bg-white rounded-2xl border border-gray-200 shadow-xl p-8">
                <div className="flex gap-8">
                    {/* SVG Floor Plan */}
                    <div className="flex-1">
                        <svg viewBox="0 0 700 300" className="w-full border-2 border-gray-200 rounded-xl bg-gray-50">
                            {/* Corridor */}
                            <rect x="0" y="130" width="700" height="40" fill="#e5e7eb" />
                            <text x="350" y="155" textAnchor="middle" fill="#6b7280" fontSize="14" fontWeight="600">
                                CORRIDOR
                            </text>

                            {/* Rooms */}
                            {floorRooms.map(room => (
                                <g
                                    key={room.id}
                                    onClick={() => setSelectedRoom(room)}
                                    className="cursor-pointer transition-all hover:opacity-80"
                                >
                                    <rect
                                        x={room.x}
                                        y={room.y}
                                        width={room.width}
                                        height={room.height}
                                        fill={getStatusColor(room.status)}
                                        stroke="#fff"
                                        strokeWidth="3"
                                        rx="8"
                                    />
                                    <text
                                        x={room.x + room.width / 2}
                                        y={room.y + room.height / 2 - 10}
                                        textAnchor="middle"
                                        fill="white"
                                        fontSize="20"
                                        fontWeight="bold"
                                    >
                                        {room.number}
                                    </text>
                                    {room.guests && (
                                        <text
                                            x={room.x + room.width / 2}
                                            y={room.y + room.height / 2 + 15}
                                            textAnchor="middle"
                                            fill="white"
                                            fontSize="14"
                                        >
                                            👥 {room.guests}
                                        </text>
                                    )}
                                </g>
                            ))}
                        </svg>

                        {/* Legend */}
                        <div className="mt-6 flex items-center gap-6 text-sm">
                            <span className="font-semibold text-gray-700">Legend:</span>
                            <div className="flex items-center gap-2">
                                <div className="w-4 h-4 bg-emerald-500 rounded"></div>
                                <span className="text-gray-600">Available</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <div className="w-4 h-4 bg-red-500 rounded"></div>
                                <span className="text-gray-600">Occupied</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <div className="w-4 h-4 bg-amber-500 rounded"></div>
                                <span className="text-gray-600">Cleaning</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <div className="w-4 h-4 bg-gray-500 rounded"></div>
                                <span className="text-gray-600">Maintenance</span>
                            </div>
                        </div>
                    </div>

                    {/* Room Details Panel */}
                    <div className="w-80">
                        {selectedRoom ? (
                            <div className="bg-gradient-to-br from-blue-50 to-blue-100/50 rounded-2xl p-6 border border-blue-200">
                                <h3 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                                    <BedDouble size={20} className="text-blue-600" />
                                    Room {selectedRoom.number}
                                </h3>
                                <div className="space-y-3">
                                    <div className="flex items-center justify-between">
                                        <span className="text-sm text-gray-600">Status</span>
                                        <span className={`px-3 py-1 rounded-full text-xs font-bold`} style={{ backgroundColor: getStatusColor(selectedRoom.status), color: 'white' }}>
                                            {getStatusLabel(selectedRoom.status)}
                                        </span>
                                    </div>
                                    <div className="flex items-center justify-between">
                                        <span className="text-sm text-gray-600">Floor</span>
                                        <span className="text-sm font-semibold text-gray-900">{selectedRoom.floor}</span>
                                    </div>
                                    {selectedRoom.guests && (
                                        <div className="flex items-center justify-between">
                                            <span className="text-sm text-gray-600">Guests</span>
                                            <div className="flex items-center gap-1">
                                                <Users size={14} className="text-gray-500" />
                                                <span className="text-sm font-semibold text-gray-900">{selectedRoom.guests}</span>
                                            </div>
                                        </div>
                                    )}
                                </div>
                                <div className="mt-6 space-y-2">
                                    <button className="w-full py-2 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-xl font-semibold hover:from-blue-700 hover:to-blue-800 transition-all shadow-md">
                                        View Details
                                    </button>
                                    {selectedRoom.status === 'available' && (
                                        <button className="w-full py-2 bg-white border border-blue-300 text-blue-700 rounded-xl font-semibold hover:bg-blue-50 transition-all">
                                            Quick Book
                                        </button>
                                    )}
                                    {selectedRoom.status === 'maintenance' && (
                                        <button className="w-full py-2 bg-white border border-gray-300 text-gray-700 rounded-xl font-semibold hover:bg-gray-50 transition-all flex items-center justify-center gap-2">
                                            <Wrench size={16} />
                                            Maintenance Log
                                        </button>
                                    )}
                                </div>
                            </div>
                        ) : (
                            <div className="bg-gray-50 rounded-2xl p-6 border border-gray-200 h-full flex items-center justify-center">
                                <div className="text-center">
                                    <BedDouble size={48} className="text-gray-300 mx-auto mb-3" />
                                    <p className="text-sm text-gray-500">Click on a room to view details</p>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default FloorPlan;
