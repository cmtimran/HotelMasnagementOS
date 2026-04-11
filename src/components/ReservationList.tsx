import { useState } from 'react';
import { Search, Calendar, Users, MapPin, Phone, Mail, Download, CheckCircle, ArrowUpDown } from 'lucide-react';
import GuestProfile360 from './GuestProfile360';

interface Reservation {
    id: number;
    guestName: string;
    roomNumber: string;
    roomType: string;
    checkIn: string;
    checkOut: string;
    nights: number;
    adults: number;
    children: number;
    status: 'arriving' | 'in-house' | 'departing' | 'checked-out';
    phone: string;
    email: string;
    totalAmount: number;
    source: string;
}

const ReservationList = () => {
    const [activeTab, setActiveTab] = useState<'arrivals' | 'in-house' | 'departures' | 'all'>('arrivals');
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedReservations, setSelectedReservations] = useState<number[]>([]);
    const [showGuestProfile, setShowGuestProfile] = useState(false);

    // Mock data
    const [reservations] = useState<Reservation[]>([
        { id: 1, guestName: 'John Doe', roomNumber: '101', roomType: 'Deluxe', checkIn: '2026-01-16', checkOut: '2026-01-18', nights: 2, adults: 2, children: 0, status: 'arriving', phone: '+880 1711-123456', email: 'john@email.com', totalAmount: 10000, source: 'Booking.com' },
        { id: 2, guestName: 'Jane Smith', roomNumber: '201', roomType: 'Executive', checkIn: '2026-01-15', checkOut: '2026-01-20', nights: 5, adults: 2, children: 1, status: 'in-house', phone: '+880 1712-234567', email: 'jane@email.com', totalAmount: 50000, source: 'Direct' },
        { id: 3, guestName: 'Bob Wilson', roomNumber: '204', roomType: 'Suite', checkIn: '2026-01-14', checkOut: '2026-01-16', nights: 2, adults: 1, children: 0, status: 'departing', phone: '+880 1713-345678', email: 'bob@email.com', totalAmount: 16000, source: 'Agoda' },
        { id: 4, guestName: 'Alice Brown', roomNumber: '303', roomType: 'Executive', checkIn: '2026-01-15', checkOut: '2026-01-19', nights: 4, adults: 2, children: 2, status: 'in-house', phone: '+880 1714-456789', email: 'alice@email.com', totalAmount: 40000, source: 'Direct' },
        { id: 5, guestName: 'Charlie Davis', roomNumber: '102', roomType: 'Standard', checkIn: '2026-01-16', checkOut: '2026-01-17', nights: 1, adults: 1, children: 0, status: 'arriving', phone: '+880 1715-567890', email: 'charlie@email.com', totalAmount: 3000, source: 'Walk-in' },
        { id: 6, guestName: 'Diana Evans', roomNumber: '203', roomType: 'Deluxe', checkIn: '2026-01-13', checkOut: '2026-01-16', nights: 3, adults: 2, children: 0, status: 'departing', phone: '+880 1716-678901', email: 'diana@email.com', totalAmount: 15000, source: 'Booking.com' },
    ]);

    const filteredReservations = reservations.filter(res => {
        const matchesTab = activeTab === 'all' || res.status === activeTab ||
            (activeTab === 'arrivals' && res.status === 'arriving') ||
            (activeTab === 'departures' && res.status === 'departing') ||
            (activeTab === 'in-house' && res.status === 'in-house');
        const matchesSearch = res.guestName.toLowerCase().includes(searchTerm.toLowerCase()) ||
            res.roomNumber.includes(searchTerm) ||
            res.phone.includes(searchTerm);
        return matchesTab && matchesSearch;
    });

    const stats = {
        arrivals: reservations.filter(r => r.status === 'arriving').length,
        inHouse: reservations.filter(r => r.status === 'in-house').length,
        departures: reservations.filter(r => r.status === 'departing').length,
        total: reservations.length,
    };

    const toggleSelection = (id: number) => {
        setSelectedReservations(prev =>
            prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
        );
    };

    const toggleSelectAll = () => {
        if (selectedReservations.length === filteredReservations.length) {
            setSelectedReservations([]);
        } else {
            setSelectedReservations(filteredReservations.map(r => r.id));
        }
    };

    const getStatusColor = (status: Reservation['status']) => {
        switch (status) {
            case 'arriving': return 'bg-blue-100 text-blue-700 border-blue-200';
            case 'in-house': return 'bg-emerald-100 text-emerald-700 border-emerald-200';
            case 'departing': return 'bg-amber-100 text-amber-700 border-amber-200';
            case 'checked-out': return 'bg-gray-100 text-gray-700 border-gray-200';
            default: return 'bg-gray-100 text-gray-700 border-gray-200';
        }
    };

    const getStatusLabel = (status: Reservation['status']) => {
        switch (status) {
            case 'arriving': return 'Arriving Today';
            case 'in-house': return 'In-House';
            case 'departing': return 'Departing Today';
            case 'checked-out': return 'Checked Out';
            default: return status;
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50/20 to-gray-50 p-4 md:p-6 lg:p-8">
            {/* Header */}
            <div className="mb-8">
                <div className="flex items-center gap-3 mb-2">
                    <div className="w-12 h-12 bg-gradient-to-br from-indigo-600 to-indigo-700 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-600/30">
                        <Calendar size={24} className="text-white" />
                    </div>
                    <div>
                        <h1 className="text-3xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent">Reservations</h1>
                        <p className="text-sm text-gray-500">Manage arrivals, departures, and in-house guests</p>
                    </div>
                </div>
            </div>

            {/* Tabs */}
            <div className="bg-white/80 backdrop-blur-sm p-2 rounded-2xl border border-gray-200 shadow-lg mb-6 inline-flex gap-2">
                <button
                    onClick={() => setActiveTab('arrivals')}
                    className={`px-6 py-3 rounded-xl text-sm font-semibold transition-all ${activeTab === 'arrivals'
                        ? 'bg-gradient-to-r from-blue-600 to-blue-700 text-white shadow-lg shadow-blue-600/30'
                        : 'text-gray-600 hover:bg-gray-100'
                        }`}
                >
                    Arrivals <span className="ml-2 px-2 py-0.5 bg-white/20 rounded-full text-xs">{stats.arrivals}</span>
                </button>
                <button
                    onClick={() => setActiveTab('in-house')}
                    className={`px-6 py-3 rounded-xl text-sm font-semibold transition-all ${activeTab === 'in-house'
                        ? 'bg-gradient-to-r from-emerald-600 to-emerald-700 text-white shadow-lg shadow-emerald-600/30'
                        : 'text-gray-600 hover:bg-gray-100'
                        }`}
                >
                    In-House <span className="ml-2 px-2 py-0.5 bg-white/20 rounded-full text-xs">{stats.inHouse}</span>
                </button>
                <button
                    onClick={() => setActiveTab('departures')}
                    className={`px-6 py-3 rounded-xl text-sm font-semibold transition-all ${activeTab === 'departures'
                        ? 'bg-gradient-to-r from-amber-600 to-amber-700 text-white shadow-lg shadow-amber-600/30'
                        : 'text-gray-600 hover:bg-gray-100'
                        }`}
                >
                    Departures <span className="ml-2 px-2 py-0.5 bg-white/20 rounded-full text-xs">{stats.departures}</span>
                </button>
                <button
                    onClick={() => setActiveTab('all')}
                    className={`px-6 py-3 rounded-xl text-sm font-semibold transition-all ${activeTab === 'all'
                        ? 'bg-gradient-to-r from-gray-700 to-gray-800 text-white shadow-lg shadow-gray-700/30'
                        : 'text-gray-600 hover:bg-gray-100'
                        }`}
                >
                    All <span className="ml-2 px-2 py-0.5 bg-white/20 rounded-full text-xs">{stats.total}</span>
                </button>
            </div>

            {/* Search & Actions */}
            <div className="bg-white/80 backdrop-blur-sm p-6 rounded-2xl border border-gray-200 shadow-lg mb-6">
                <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
                    <div className="relative flex-1 max-w-md">
                        <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
                        <input
                            type="text"
                            placeholder="Search by name, room, or phone..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-12 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none text-sm bg-white shadow-sm"
                        />
                    </div>
                    <div className="flex gap-3">
                        {selectedReservations.length > 0 && (
                            <button className="px-5 py-3 bg-gradient-to-r from-emerald-600 to-emerald-700 text-white rounded-xl text-sm font-semibold hover:from-emerald-700 hover:to-emerald-800 transition-all shadow-lg shadow-emerald-600/30 flex items-center gap-2">
                                <CheckCircle size={18} />
                                Group Check-in ({selectedReservations.length})
                            </button>
                        )}
                        <button className="px-5 py-3 bg-white border border-gray-300 text-gray-700 rounded-xl text-sm font-semibold hover:bg-gray-50 transition-all shadow-sm flex items-center gap-2">
                            <Download size={18} />
                            Export
                        </button>
                    </div>
                </div>
            </div>

            {/* Table */}
            <div className="bg-white rounded-2xl border border-gray-200 shadow-xl overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead className="bg-gradient-to-r from-gray-50 to-gray-100 border-b border-gray-200">
                            <tr>
                                <th className="px-6 py-4 text-left">
                                    <input
                                        type="checkbox"
                                        checked={selectedReservations.length === filteredReservations.length && filteredReservations.length > 0}
                                        onChange={toggleSelectAll}
                                        className="w-4 h-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                                    />
                                </th>
                                <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                                    <div className="flex items-center gap-2">
                                        Guest <ArrowUpDown size={14} />
                                    </div>
                                </th>
                                <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Room</th>
                                <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Check-in</th>
                                <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Check-out</th>
                                <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Guests</th>
                                <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Amount</th>
                                <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Status</th>
                                <th className="px-6 py-4 text-right text-xs font-bold text-gray-700 uppercase tracking-wider">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {filteredReservations.map(res => (
                                <tr key={res.id} className="hover:bg-blue-50/50 transition-colors group">
                                    <td className="px-6 py-4">
                                        <input
                                            type="checkbox"
                                            checked={selectedReservations.includes(res.id)}
                                            onChange={() => toggleSelection(res.id)}
                                            className="w-4 h-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                                        />
                                    </td>
                                    <td className="px-6 py-4">
                                        <div>
                                            <button
                                                onClick={() => setShowGuestProfile(true)}
                                                className="text-sm font-bold text-blue-600 hover:text-blue-700 hover:underline text-left"
                                            >
                                                {res.guestName}
                                            </button>
                                            <div className="flex items-center gap-3 mt-1">
                                                <div className="flex items-center gap-1 text-xs text-gray-500">
                                                    <Phone size={12} />
                                                    {res.phone}
                                                </div>
                                                <div className="flex items-center gap-1 text-xs text-gray-500">
                                                    <Mail size={12} />
                                                    {res.email}
                                                </div>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-2">
                                            <MapPin size={14} className="text-gray-400" />
                                            <span className="text-sm font-bold text-gray-900">{res.roomNumber}</span>
                                        </div>
                                        <p className="text-xs text-gray-500 mt-0.5">{res.roomType}</p>
                                    </td>
                                    <td className="px-6 py-4">
                                        <p className="text-sm font-medium text-gray-900">{res.checkIn}</p>
                                    </td>
                                    <td className="px-6 py-4">
                                        <p className="text-sm font-medium text-gray-900">{res.checkOut}</p>
                                        <p className="text-xs text-gray-500 mt-0.5">{res.nights} nights</p>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-2">
                                            <Users size={14} className="text-gray-400" />
                                            <span className="text-sm font-medium text-gray-900">{res.adults}A {res.children > 0 && `+ ${res.children}C`}</span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <p className="text-sm font-bold text-gray-900">৳ {res.totalAmount.toLocaleString()}</p>
                                        <p className="text-xs text-gray-500">{res.source}</p>
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className={`px-3 py-1.5 rounded-full text-xs font-semibold border ${getStatusColor(res.status)}`}>
                                            {getStatusLabel(res.status)}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <button className="px-4 py-2 bg-gradient-to-r from-indigo-600 to-indigo-700 text-white rounded-lg text-xs font-semibold hover:from-indigo-700 hover:to-indigo-800 transition-all shadow-md opacity-0 group-hover:opacity-100">
                                            {res.status === 'arriving' ? 'Check-in' : res.status === 'departing' ? 'Check-out' : 'View'}
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Empty State */}
            {filteredReservations.length === 0 && (
                <div className="text-center py-20">
                    <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-6">
                        <Calendar size={40} className="text-gray-300" />
                    </div>
                    <h3 className="text-xl font-bold text-gray-700 mb-2">No reservations found</h3>
                    <p className="text-sm text-gray-500">Try adjusting your search or filters</p>
                </div>
            )}

            {/* Guest Profile Modal */}
            {showGuestProfile && <GuestProfile360 onClose={() => setShowGuestProfile(false)} />}
        </div>
    );
};

export default ReservationList;
