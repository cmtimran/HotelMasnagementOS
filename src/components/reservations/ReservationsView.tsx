import React, { useState, useEffect } from 'react';
import {
    Calendar,
    Search,
    Plus,
    Download,
    Check
} from 'lucide-react';
import AddReservationModal from '../modals/AddReservationModal';

export interface ReservationItem {
    id: number;
    reservationNumber: string;
    guestName: string;
    phone: string;
    email: string;
    roomNumber: string;
    roomType: string;
    checkIn: string;
    checkOut: string;
    nights: number;
    adults: number;
    children: number;
    status: 'arriving' | 'in-house' | 'departing' | 'checked-out' | 'hold';
    totalAmount: number;
    paidAmount: number;
    dueAmount: number;
    source: string;
    vip?: string;
}

const INITIAL_RESERVATIONS: ReservationItem[] = [
    { id: 1, reservationNumber: 'RES-009281', guestName: 'Md. Tariqul Islam', phone: '+880 1711-928371', email: 'tariqul@grameen.com', roomNumber: '101', roomType: 'Deluxe Double', checkIn: '2026-07-01', checkOut: '2026-07-04', nights: 3, adults: 2, children: 0, status: 'in-house', totalAmount: 10500, paidAmount: 10500, dueAmount: 0, source: 'Direct Corporate', vip: 'VIP-1' },
    { id: 2, reservationNumber: 'RES-009282', guestName: 'Samantha Chowdhury', phone: '+880 1819-283746', email: 'samantha.c@un.org', roomNumber: '103', roomType: 'Superior King', checkIn: '2026-07-02', checkOut: '2026-07-05', nights: 3, adults: 1, children: 0, status: 'in-house', totalAmount: 13500, paidAmount: 7000, dueAmount: 6500, source: 'UN Diplomatic', vip: 'VIP-2' },
    { id: 3, reservationNumber: 'RES-009283', guestName: 'Engr. Tanvir Ahmed', phone: '+880 1912-384729', email: 'tanvir@apex.com', roomNumber: '104', roomType: 'Executive Suite', checkIn: '2026-07-03', checkOut: '2026-07-06', nights: 3, adults: 2, children: 1, status: 'arriving', totalAmount: 22500, paidAmount: 10000, dueAmount: 12500, source: 'Booking.com', vip: 'None' },
    { id: 4, reservationNumber: 'RES-009284', guestName: 'Farhan Kabir', phone: '+880 1611-293847', email: 'farhan@standardchartered.com', roomNumber: '201', roomType: 'Deluxe Double', checkIn: '2026-06-29', checkOut: '2026-07-02', nights: 3, adults: 2, children: 0, status: 'departing', totalAmount: 10500, paidAmount: 10500, dueAmount: 0, source: 'Corporate Contract', vip: 'None' },
    { id: 5, reservationNumber: 'RES-009285', guestName: 'Dr. Jean Dupont', phone: '+33 612-384920', email: 'j.dupont@paris-med.fr', roomNumber: '203', roomType: 'Executive Suite', checkIn: '2026-07-01', checkOut: '2026-07-07', nights: 6, adults: 1, children: 0, status: 'in-house', totalAmount: 45000, paidAmount: 25000, dueAmount: 20000, source: 'Direct Web', vip: 'VIP-GM' },
    { id: 6, reservationNumber: 'RES-009286', guestName: 'Nusrat Jahan', phone: '+880 1712-384729', email: 'nusrat@beximco.com', roomNumber: '202', roomType: 'Superior King', checkIn: '2026-06-28', checkOut: '2026-07-01', nights: 3, adults: 2, children: 0, status: 'checked-out', totalAmount: 13500, paidAmount: 13500, dueAmount: 0, source: 'Direct Walk-In', vip: 'None' },
    { id: 7, reservationNumber: 'RES-009287', guestName: 'Rashidul Hasan (Hold)', phone: '+880 1819-384720', email: 'rashidul@gmail.com', roomNumber: '102', roomType: 'Deluxe Double', checkIn: '2026-07-05', checkOut: '2026-07-08', nights: 3, adults: 2, children: 0, status: 'hold', totalAmount: 10500, paidAmount: 0, dueAmount: 10500, source: 'Phone Tentative', vip: 'None' }
];

export const ReservationsView: React.FC = () => {
    const [activeTab, setActiveTab] = useState<'all' | 'arrivals' | 'departures' | 'in-house' | 'checked-out'>('all');
    const [searchQuery, setSearchQuery] = useState('');
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);

    // Hydrate state from localStorage or initial
    const [reservations, setReservations] = useState<ReservationItem[]>(() => {
        const saved = localStorage.getItem('hotel_reservations_v2');
        return saved ? JSON.parse(saved) : INITIAL_RESERVATIONS;
    });

    useEffect(() => {
        localStorage.setItem('hotel_reservations_v2', JSON.stringify(reservations));
    }, [reservations]);

    // Handle check in / check out actions
    const handleStatusChange = (id: number, nextStatus: ReservationItem['status']) => {
        setReservations(prev =>
            prev.map(r => r.id === id ? { ...r, status: nextStatus } : r)
        );
    };

    // Filter
    const filteredReservations = reservations.filter(r => {
        const matchesTab =
            activeTab === 'all' ? true :
            activeTab === 'arrivals' ? r.status === 'arriving' :
            activeTab === 'departures' ? r.status === 'departing' :
            activeTab === 'in-house' ? r.status === 'in-house' :
            r.status === 'checked-out';

        const matchesQuery =
            r.guestName.toLowerCase().includes(searchQuery.toLowerCase()) ||
            r.reservationNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
            r.roomNumber.includes(searchQuery) ||
            r.phone.includes(searchQuery);

        return matchesTab && matchesQuery;
    });

    const exportCSV = () => {
        const headers = ['Reservation #', 'Guest Name', 'Room', 'Room Type', 'Check-In', 'Check-Out', 'Nights', 'Total Amount', 'Due Amount', 'Status'];
        const rows = filteredReservations.map(r => [
            r.reservationNumber,
            `"${r.guestName}"`,
            r.roomNumber,
            r.roomType,
            r.checkIn,
            r.checkOut,
            r.nights,
            r.totalAmount,
            r.dueAmount,
            r.status
        ]);
        const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
        const encodedUri = encodeURI(csvContent);
        const link = document.createElement('a');
        link.setAttribute('href', encodedUri);
        link.setAttribute('download', `reservations_${activeTab}_${Date.now()}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    return (
        <div className="p-3 sm:p-4 max-w-full space-y-2.5 animate-in fade-in duration-150 text-xs">
            {/* Compact Header Bar */}
            <div className="bg-white rounded-lg border border-gray-200/90 shadow-2xs px-3.5 py-2 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-700 border border-blue-200 flex items-center justify-center flex-shrink-0">
                        <Calendar size={18} />
                    </div>
                    <div className="min-w-0">
                        <div className="flex items-center gap-2">
                            <h1 className="text-sm font-bold text-gray-900 tracking-tight truncate">
                                Reservations Master Registry
                            </h1>
                            <span className="px-1.5 py-0.2 text-[9.5px] font-bold rounded bg-blue-50 text-blue-700 border border-blue-200">
                                Live PMS Folios
                            </span>
                        </div>
                        <p className="text-[11px] text-gray-500 truncate">
                            All arrivals, in-house guests, departures, and pending balances.
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-2 flex-shrink-0">
                    <button
                        type="button"
                        onClick={exportCSV}
                        className="h-7 px-2.5 text-[11px] font-semibold bg-white border border-gray-200 hover:bg-gray-50 rounded text-gray-700 flex items-center gap-1 shadow-2xs cursor-pointer"
                    >
                        <Download size={12} />
                        <span>Export CSV</span>
                    </button>
                    <button
                        type="button"
                        onClick={() => setIsAddModalOpen(true)}
                        className="h-7 px-3 text-[11px] font-bold bg-[#1e3a8a] hover:bg-blue-900 text-white rounded shadow-2xs flex items-center gap-1 transition-colors cursor-pointer"
                    >
                        <Plus size={13} />
                        <span>Add Reservation</span>
                    </button>
                </div>
            </div>

            {/* Compact Tabs & Search Row */}
            <div className="bg-white rounded-lg border border-gray-200 shadow-2xs px-3 py-1.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="flex items-center gap-1 flex-wrap">
                    {[
                        { id: 'all', label: 'All', count: reservations.length },
                        { id: 'arrivals', label: 'Arrivals', count: reservations.filter(r => r.status === 'arriving').length },
                        { id: 'in-house', label: 'In-House', count: reservations.filter(r => r.status === 'in-house').length },
                        { id: 'departures', label: 'Departures', count: reservations.filter(r => r.status === 'departing').length },
                        { id: 'checked-out', label: 'Checked Out', count: reservations.filter(r => r.status === 'checked-out').length },
                    ].map(tab => (
                        <button
                            key={tab.id}
                            type="button"
                            onClick={() => setActiveTab(tab.id as any)}
                            className={`h-6 px-2.5 rounded text-[11px] font-semibold flex items-center gap-1.5 transition-colors cursor-pointer ${
                                activeTab === tab.id
                                    ? 'bg-[#1e3a8a] text-white shadow-2xs'
                                    : 'text-gray-600 hover:bg-gray-100'
                            }`}
                        >
                            <span>{tab.label}</span>
                            <span className={`px-1.5 py-0.2 rounded-full text-[9px] font-bold ${
                                activeTab === tab.id ? 'bg-blue-900 text-white' : 'bg-gray-200 text-gray-700'
                            }`}>
                                {tab.count}
                            </span>
                        </button>
                    ))}
                </div>

                {/* Compact Search Bar */}
                <div className="relative">
                    <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input
                        type="text"
                        placeholder="Search guest, res #, room..."
                        value={searchQuery}
                        onChange={e => setSearchQuery(e.target.value)}
                        className="h-7 pl-7 pr-2.5 text-[11px] border border-gray-200 rounded-md bg-white outline-none w-52 sm:w-60 focus:border-blue-500"
                    />
                </div>
            </div>

            {/* Compact Table View */}
            <div className="bg-white rounded-lg border border-gray-200 shadow-2xs overflow-hidden">
                <div className="overflow-x-auto no-scrollbar">
                    <table className="w-full text-left min-w-[900px] border-collapse">
                        <thead>
                            <tr className="bg-gray-50/80 border-b border-gray-200 text-[10.5px] font-bold text-gray-600 uppercase tracking-wider">
                                <th className="px-3 py-2">Res #</th>
                                <th className="px-3 py-2">Guest Name</th>
                                <th className="px-3 py-2">Room</th>
                                <th className="px-3 py-2">Stay Dates</th>
                                <th className="px-3 py-2">Source</th>
                                <th className="px-3 py-2">Total Tariff</th>
                                <th className="px-3 py-2">Due Balance</th>
                                <th className="px-3 py-2">Status</th>
                                <th className="px-3 py-2 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 text-[11.5px]">
                            {filteredReservations.length === 0 ? (
                                <tr>
                                    <td colSpan={9} className="px-4 py-6 text-center text-gray-400">
                                        No reservations found matching your criteria.
                                    </td>
                                </tr>
                            ) : (
                                filteredReservations.map(r => (
                                    <tr key={r.id} className="hover:bg-blue-50/20 transition-colors">
                                        <td className="px-3 py-1.5 font-mono font-bold text-blue-700">
                                            {r.reservationNumber}
                                        </td>
                                        <td className="px-3 py-1.5">
                                            <div className="flex items-center gap-1.5">
                                                <span className="font-semibold text-gray-900">{r.guestName}</span>
                                                {r.vip && r.vip !== 'None' && (
                                                    <span className="px-1 py-0.2 rounded text-[9px] font-bold bg-amber-100 text-amber-800 border border-amber-200">
                                                        {r.vip}
                                                    </span>
                                                )}
                                            </div>
                                            <div className="text-[10px] text-gray-400 font-mono">{r.phone}</div>
                                        </td>
                                        <td className="px-3 py-1.5">
                                            <span className="px-1.5 py-0.2 bg-blue-50 text-blue-800 rounded font-bold font-mono">
                                                {r.roomNumber}
                                            </span>
                                            <div className="text-[10px] text-gray-500">{r.roomType}</div>
                                        </td>
                                        <td className="px-3 py-1.5 whitespace-nowrap">
                                            <div className="font-medium text-gray-800">
                                                {r.checkIn} → {r.checkOut}
                                            </div>
                                            <div className="text-[10px] text-gray-400">{r.nights} Night{r.nights > 1 ? 's' : ''}</div>
                                        </td>
                                        <td className="px-3 py-1.5 text-gray-600 font-medium">
                                            {r.source}
                                        </td>
                                        <td className="px-3 py-1.5 font-bold text-gray-900 font-mono">
                                            ৳ {r.totalAmount.toLocaleString()}
                                        </td>
                                        <td className="px-3 py-1.5 font-mono font-bold">
                                            {r.dueAmount > 0 ? (
                                                <span className="text-rose-600">৳ {r.dueAmount.toLocaleString()}</span>
                                            ) : (
                                                <span className="text-emerald-600 font-semibold flex items-center gap-1">
                                                    <Check size={11} /> Settled
                                                </span>
                                            )}
                                        </td>
                                        <td className="px-3 py-1.5">
                                            <span className={`px-1.5 py-0.2 rounded text-[9.5px] font-bold uppercase ${
                                                r.status === 'in-house'
                                                    ? 'bg-indigo-50 text-indigo-700 border border-indigo-200'
                                                    : r.status === 'arriving'
                                                    ? 'bg-blue-50 text-blue-700 border border-blue-200'
                                                    : r.status === 'departing'
                                                    ? 'bg-amber-50 text-amber-700 border border-amber-200'
                                                    : r.status === 'checked-out'
                                                    ? 'bg-gray-100 text-gray-600'
                                                    : 'bg-purple-50 text-purple-700 border border-purple-200'
                                            }`}>
                                                {r.status}
                                            </span>
                                        </td>
                                        <td className="px-3 py-1.5 text-right whitespace-nowrap">
                                            <div className="flex items-center justify-end gap-1.5">
                                                {r.status === 'arriving' && (
                                                    <button
                                                        type="button"
                                                        onClick={() => handleStatusChange(r.id, 'in-house')}
                                                        className="h-5 px-2 text-[10px] font-bold bg-emerald-600 hover:bg-emerald-700 text-white rounded cursor-pointer"
                                                        title="Check In Guest"
                                                    >
                                                        Check In
                                                    </button>
                                                )}
                                                {r.status === 'in-house' && (
                                                    <button
                                                        type="button"
                                                        onClick={() => handleStatusChange(r.id, 'checked-out')}
                                                        className="h-5 px-2 text-[10px] font-bold bg-blue-700 hover:bg-blue-800 text-white rounded cursor-pointer"
                                                        title="Check Out Guest"
                                                    >
                                                        Check Out
                                                    </button>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Add Reservation Modal */}
            <AddReservationModal
                isOpen={isAddModalOpen}
                onClose={() => setIsAddModalOpen(false)}
                onReservationCreated={(newRes) => {
                    setReservations(prev => [newRes, ...prev]);
                    setIsAddModalOpen(false);
                }}
            />
        </div>
    );
};

export default ReservationsView;
