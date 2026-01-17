import { useState } from 'react';
import { UtensilsCrossed, Users, Clock, DollarSign } from 'lucide-react';

interface Table {
    id: number;
    number: string;
    x: number;
    y: number;
    seats: number;
    shape: 'square' | 'round' | 'rectangle';
    status: 'available' | 'occupied' | 'reserved';
    guests?: number;
    orderAmount?: number;
    duration?: string;
}

const TableLayout = () => {
    const [selectedTable, setSelectedTable] = useState<Table | null>(null);

    // Mock table data with positions
    const [tables] = useState<Table[]>([
        // Square tables
        { id: 1, number: '1', x: 50, y: 50, seats: 4, shape: 'square', status: 'occupied', guests: 3, orderAmount: 2500, duration: '45 min' },
        { id: 2, number: '2', x: 200, y: 50, seats: 4, shape: 'square', status: 'available' },
        { id: 3, number: '3', x: 350, y: 50, seats: 4, shape: 'square', status: 'reserved', guests: 4 },
        { id: 4, number: '4', x: 500, y: 50, seats: 4, shape: 'square', status: 'occupied', guests: 2, orderAmount: 1800, duration: '20 min' },

        // Round tables
        { id: 5, number: '5', x: 100, y: 200, seats: 6, shape: 'round', status: 'available' },
        { id: 6, number: '6', x: 300, y: 200, seats: 6, shape: 'round', status: 'occupied', guests: 5, orderAmount: 4200, duration: '1h 10min' },
        { id: 7, number: '7', x: 500, y: 200, seats: 6, shape: 'round', status: 'reserved', guests: 6 },

        // Rectangle tables
        { id: 8, number: '8', x: 50, y: 350, seats: 8, shape: 'rectangle', status: 'occupied', guests: 7, orderAmount: 6500, duration: '55 min' },
        { id: 9, number: '9', x: 350, y: 350, seats: 8, shape: 'rectangle', status: 'available' },
    ]);

    const getStatusColor = (status: Table['status']) => {
        switch (status) {
            case 'available': return '#10b981'; // emerald-500
            case 'occupied': return '#ef4444'; // red-500
            case 'reserved': return '#f59e0b'; // amber-500
        }
    };

    const getStatusBg = (status: Table['status']) => {
        switch (status) {
            case 'available': return 'from-emerald-500 to-emerald-600';
            case 'occupied': return 'from-red-500 to-red-600';
            case 'reserved': return 'from-amber-500 to-amber-600';
        }
    };

    const getStatusLabel = (status: Table['status']) => {
        switch (status) {
            case 'available': return 'Available';
            case 'occupied': return 'Occupied';
            case 'reserved': return 'Reserved';
        }
    };

    const renderTable = (table: Table) => {
        const color = getStatusColor(table.status);

        if (table.shape === 'square') {
            return (
                <g key={table.id} onClick={() => setSelectedTable(table)} className="cursor-pointer transition-all hover:opacity-80">
                    <rect
                        x={table.x}
                        y={table.y}
                        width="100"
                        height="100"
                        fill={color}
                        stroke="#fff"
                        strokeWidth="3"
                        rx="8"
                    />
                    <text x={table.x + 50} y={table.y + 45} textAnchor="middle" fill="white" fontSize="24" fontWeight="bold">
                        {table.number}
                    </text>
                    <text x={table.x + 50} y={table.y + 70} textAnchor="middle" fill="white" fontSize="14">
                        {table.seats} seats
                    </text>
                </g>
            );
        } else if (table.shape === 'round') {
            return (
                <g key={table.id} onClick={() => setSelectedTable(table)} className="cursor-pointer transition-all hover:opacity-80">
                    <circle
                        cx={table.x + 60}
                        cy={table.y + 60}
                        r="60"
                        fill={color}
                        stroke="#fff"
                        strokeWidth="3"
                    />
                    <text x={table.x + 60} y={table.y + 55} textAnchor="middle" fill="white" fontSize="24" fontWeight="bold">
                        {table.number}
                    </text>
                    <text x={table.x + 60} y={table.y + 75} textAnchor="middle" fill="white" fontSize="14">
                        {table.seats} seats
                    </text>
                </g>
            );
        } else {
            return (
                <g key={table.id} onClick={() => setSelectedTable(table)} className="cursor-pointer transition-all hover:opacity-80">
                    <rect
                        x={table.x}
                        y={table.y}
                        width="200"
                        height="80"
                        fill={color}
                        stroke="#fff"
                        strokeWidth="3"
                        rx="8"
                    />
                    <text x={table.x + 100} y={table.y + 40} textAnchor="middle" fill="white" fontSize="24" fontWeight="bold">
                        Table {table.number}
                    </text>
                    <text x={table.x + 100} y={table.y + 60} textAnchor="middle" fill="white" fontSize="14">
                        {table.seats} seats
                    </text>
                </g>
            );
        }
    };

    const stats = {
        total: tables.length,
        available: tables.filter(t => t.status === 'available').length,
        occupied: tables.filter(t => t.status === 'occupied').length,
        reserved: tables.filter(t => t.status === 'reserved').length,
        totalRevenue: tables.filter(t => t.orderAmount).reduce((sum, t) => sum + (t.orderAmount || 0), 0),
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-50 via-orange-50/20 to-gray-50 p-4 md:p-6 lg:p-8">
            {/* Header */}
            <div className="mb-8">
                <div className="flex items-center gap-3 mb-2">
                    <div className="w-12 h-12 bg-gradient-to-br from-orange-600 to-orange-700 rounded-xl flex items-center justify-center shadow-lg shadow-orange-600/30">
                        <UtensilsCrossed size={24} className="text-white" />
                    </div>
                    <div>
                        <h1 className="text-3xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent">Table Layout View</h1>
                        <p className="text-sm text-gray-500">Restaurant seating and table management</p>
                    </div>
                </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
                <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm">
                    <p className="text-xs font-semibold text-gray-500 uppercase mb-2">Total Tables</p>
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
                    <p className="text-xs font-semibold text-amber-100 uppercase mb-2">Reserved</p>
                    <p className="text-3xl font-bold text-white">{stats.reserved}</p>
                </div>
                <div className="bg-gradient-to-br from-blue-500 to-blue-600 p-5 rounded-2xl shadow-lg shadow-blue-500/30">
                    <p className="text-xs font-semibold text-blue-100 uppercase mb-2">Revenue</p>
                    <p className="text-3xl font-bold text-white">৳{(stats.totalRevenue / 1000).toFixed(1)}K</p>
                </div>
            </div>

            {/* Table Layout */}
            <div className="bg-white rounded-2xl border border-gray-200 shadow-xl p-8">
                <div className="flex gap-8">
                    {/* SVG Layout */}
                    <div className="flex-1">
                        <svg viewBox="0 0 650 500" className="w-full border-2 border-gray-200 rounded-xl bg-gradient-to-br from-gray-50 to-gray-100">
                            {/* Background elements */}
                            <rect x="0" y="0" width="650" height="500" fill="url(#grid)" />
                            <defs>
                                <pattern id="grid" width="50" height="50" patternUnits="userSpaceOnUse">
                                    <path d="M 50 0 L 0 0 0 50" fill="none" stroke="#e5e7eb" strokeWidth="1" />
                                </pattern>
                            </defs>

                            {/* Tables */}
                            {tables.map(table => renderTable(table))}
                        </svg>

                        {/* Legend */}
                        <div className="mt-6 flex items-center gap-6 text-sm">
                            <span className="font-semibold text-gray-700">Status:</span>
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
                                <span className="text-gray-600">Reserved</span>
                            </div>
                        </div>
                    </div>

                    {/* Table Details Panel */}
                    <div className="w-80">
                        {selectedTable ? (
                            <div className={`bg-gradient-to-br ${getStatusBg(selectedTable.status)} rounded-2xl p-6 text-white shadow-xl`}>
                                <h3 className="text-2xl font-bold mb-4 flex items-center gap-2">
                                    <UtensilsCrossed size={24} />
                                    Table {selectedTable.number}
                                </h3>
                                <div className="space-y-4">
                                    <div className="bg-white/20 backdrop-blur-sm rounded-xl p-4">
                                        <p className="text-white/80 text-xs font-medium mb-1">Status</p>
                                        <p className="text-xl font-bold">{getStatusLabel(selectedTable.status)}</p>
                                    </div>
                                    <div className="bg-white/20 backdrop-blur-sm rounded-xl p-4">
                                        <p className="text-white/80 text-xs font-medium mb-1">Capacity</p>
                                        <div className="flex items-center gap-2">
                                            <Users size={20} />
                                            <p className="text-xl font-bold">{selectedTable.seats} seats</p>
                                        </div>
                                    </div>
                                    {selectedTable.guests && (
                                        <div className="bg-white/20 backdrop-blur-sm rounded-xl p-4">
                                            <p className="text-white/80 text-xs font-medium mb-1">Current Guests</p>
                                            <p className="text-xl font-bold">{selectedTable.guests} guests</p>
                                        </div>
                                    )}
                                    {selectedTable.orderAmount && (
                                        <div className="bg-white/20 backdrop-blur-sm rounded-xl p-4">
                                            <p className="text-white/80 text-xs font-medium mb-1">Order Amount</p>
                                            <div className="flex items-center gap-2">
                                                <DollarSign size={20} />
                                                <p className="text-xl font-bold">৳{selectedTable.orderAmount.toLocaleString()}</p>
                                            </div>
                                        </div>
                                    )}
                                    {selectedTable.duration && (
                                        <div className="bg-white/20 backdrop-blur-sm rounded-xl p-4">
                                            <p className="text-white/80 text-xs font-medium mb-1">Duration</p>
                                            <div className="flex items-center gap-2">
                                                <Clock size={20} />
                                                <p className="text-xl font-bold">{selectedTable.duration}</p>
                                            </div>
                                        </div>
                                    )}
                                </div>
                                <div className="mt-6 space-y-2">
                                    {selectedTable.status === 'available' && (
                                        <button className="w-full py-3 bg-white text-gray-900 rounded-xl font-bold hover:bg-gray-100 transition-all shadow-lg">
                                            Reserve Table
                                        </button>
                                    )}
                                    {selectedTable.status === 'occupied' && (
                                        <>
                                            <button className="w-full py-3 bg-white text-gray-900 rounded-xl font-bold hover:bg-gray-100 transition-all shadow-lg">
                                                View Order
                                            </button>
                                            <button className="w-full py-3 bg-white/20 backdrop-blur-sm border-2 border-white text-white rounded-xl font-bold hover:bg-white/30 transition-all">
                                                Generate Bill
                                            </button>
                                        </>
                                    )}
                                    {selectedTable.status === 'reserved' && (
                                        <button className="w-full py-3 bg-white text-gray-900 rounded-xl font-bold hover:bg-gray-100 transition-all shadow-lg">
                                            Check-in Guests
                                        </button>
                                    )}
                                </div>
                            </div>
                        ) : (
                            <div className="bg-gray-50 rounded-2xl p-6 border border-gray-200 h-full flex items-center justify-center">
                                <div className="text-center">
                                    <UtensilsCrossed size={48} className="text-gray-300 mx-auto mb-3" />
                                    <p className="text-sm text-gray-500">Click on a table to view details</p>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default TableLayout;
