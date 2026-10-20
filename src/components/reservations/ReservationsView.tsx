import React, { useState, useEffect } from 'react';
import {
    Calendar as CalendarIcon,
    Search,
    Download,
    Plus,
    Users,
    User,
    LayoutGrid,
    List,
    Check,
    X
} from 'lucide-react';
import AddReservationModal from '../modals/AddReservationModal';
import { useNavigation } from '../../context/NavigationContext';

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
    { id: 3, reservationNumber: 'RES-009286', guestName: 'Nusrat Jahan', phone: '+880 1712-384729', email: 'nusrat@beximco.com', roomNumber: '202', roomType: 'Superior King', checkIn: '2026-06-28', checkOut: '2026-07-01', nights: 3, adults: 2, children: 0, status: 'checked-out', totalAmount: 13500, paidAmount: 13500, dueAmount: 0, source: 'Direct Walk-In', vip: 'None' }
];

export const ReservationsView: React.FC = () => {
    const { setActivePage } = useNavigation();
    const [activeTab, setActiveTab] = useState<'all' | 'arrivals' | 'departures' | 'checked-out' | 'in-house'>('all');
    const [viewMode, setViewMode] = useState<'grid' | 'list'>('list');
    const [guestMode, setGuestMode] = useState<'single' | 'group'>('single');
    const [searchQuery, setSearchQuery] = useState('');
    const [isSearchOpen, setIsSearchOpen] = useState(false);
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);

    // Hydrate state from localStorage or initial
    const [reservations, setReservations] = useState<ReservationItem[]>(() => {
        try {
            const saved = localStorage.getItem('hotel_reservations_v2');
            return saved ? JSON.parse(saved) : INITIAL_RESERVATIONS;
        } catch {
            return INITIAL_RESERVATIONS;
        }
    });

    useEffect(() => {
        try {
            localStorage.setItem('hotel_reservations_v2', JSON.stringify(reservations));
        } catch (e) {
            console.error(e);
        }
    }, [reservations]);

    // Handle check in / check out actions
    const handleStatusChange = (id: number, nextStatus: ReservationItem['status']) => {
        setReservations(prev =>
            prev.map(r => r.id === id ? { ...r, status: nextStatus } : r)
        );
    };

    // Tab counts
    const countAll = reservations.length;
    const countArrivals = reservations.filter(r => r.status === 'arriving').length;
    const countDepartures = reservations.filter(r => r.status === 'departing').length;
    const countCheckOut = reservations.filter(r => r.status === 'checked-out').length;
    const countInHouse = reservations.filter(r => r.status === 'in-house').length;

    // Filter
    const filteredReservations = reservations.filter(r => {
        const matchesTab =
            activeTab === 'all' ? true :
            activeTab === 'arrivals' ? r.status === 'arriving' :
            activeTab === 'departures' ? r.status === 'departing' :
            activeTab === 'checked-out' ? r.status === 'checked-out' :
            r.status === 'in-house';

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
        <div className="p-4 sm:p-6 bg-[#f0f4f8] min-h-full flex flex-col gap-4 font-sans text-xs text-gray-800 animate-in fade-in duration-150">
            {/* Top Control Bar (Exact 2-Row Design matching hotel-management) */}
            <div className="bg-white rounded-lg p-4 sm:px-6 sm:py-3.5 flex flex-col gap-2.5 shadow-xs border border-gray-200/70 select-none">
                {/* Row 1: Primary Tabs & Primary Action Controls */}
                <div className="flex items-center justify-between flex-wrap gap-3">
                    {/* Primary Tabs */}
                    <div className="flex items-center gap-6 border-b border-gray-200 flex-1 min-w-[280px]">
                        <button
                            type="button"
                            onClick={() => setActiveTab('all')}
                            className={`py-2 text-[13px] font-medium transition-colors relative cursor-pointer flex items-center gap-1.5 ${
                                activeTab === 'all' ? 'text-[#312e81] font-bold' : 'text-gray-500 hover:text-gray-800'
                            }`}
                        >
                            <span>Reservations</span>
                            <span className="text-xs font-semibold">{countAll}</span>
                            {activeTab === 'all' && (
                                <span className="absolute bottom-[-1px] left-0 right-0 h-[2px] bg-[#312e81]"></span>
                            )}
                        </button>

                        <button
                            type="button"
                            onClick={() => setActiveTab('arrivals')}
                            className={`py-2 text-[13px] font-medium transition-colors relative cursor-pointer flex items-center gap-1.5 ${
                                activeTab === 'arrivals' ? 'text-[#312e81] font-bold' : 'text-gray-500 hover:text-gray-800'
                            }`}
                        >
                            <span>Arrivals</span>
                            <span className="text-xs font-semibold">{countArrivals}</span>
                            {activeTab === 'arrivals' && (
                                <span className="absolute bottom-[-1px] left-0 right-0 h-[2px] bg-[#312e81]"></span>
                            )}
                        </button>

                        <button
                            type="button"
                            onClick={() => setActiveTab('departures')}
                            className={`py-2 text-[13px] font-medium transition-colors relative cursor-pointer flex items-center gap-1.5 ${
                                activeTab === 'departures' ? 'text-[#312e81] font-bold' : 'text-gray-500 hover:text-gray-800'
                            }`}
                        >
                            <span>Departures</span>
                            <span className="text-xs font-semibold">{countDepartures}</span>
                            {activeTab === 'departures' && (
                                <span className="absolute bottom-[-1px] left-0 right-0 h-[2px] bg-[#312e81]"></span>
                            )}
                        </button>
                    </div>

                    {/* Primary Right Actions */}
                    <div className="flex items-center gap-2.5 flex-wrap">
                        {/* Date Range Picker */}
                        <div className="flex items-center border border-gray-200 rounded-md px-2.5 py-1 gap-1.5 bg-white text-xs text-gray-400 h-8">
                            <input
                                type="text"
                                placeholder="Start Date"
                                value={startDate}
                                onChange={e => setStartDate(e.target.value)}
                                className="w-16 border-0 outline-none text-gray-700 placeholder-gray-300 text-xs"
                            />
                            <span className="text-gray-300">→</span>
                            <input
                                type="text"
                                placeholder="End Date"
                                value={endDate}
                                onChange={e => setEndDate(e.target.value)}
                                className="w-16 border-0 outline-none text-gray-700 placeholder-gray-300 text-xs"
                            />
                            <CalendarIcon size={14} className="text-gray-400 ml-1" />
                        </div>

                        {/* Guest / Group Mode */}
                        <div className="flex border border-gray-200 rounded-md overflow-hidden h-8">
                            <button
                                type="button"
                                onClick={() => setGuestMode('single')}
                                className={`px-2 flex items-center justify-center cursor-pointer transition-colors ${
                                    guestMode === 'single' ? 'bg-[#f8fafc] text-[#312e81]' : 'bg-white text-gray-400 hover:text-gray-600'
                                }`}
                                title="Single Guest"
                            >
                                <User size={14} />
                            </button>
                            <button
                                type="button"
                                onClick={() => setGuestMode('group')}
                                className={`px-2 border-l border-gray-200 flex items-center justify-center cursor-pointer transition-colors ${
                                    guestMode === 'group' ? 'bg-[#f8fafc] text-[#312e81]' : 'bg-white text-gray-400 hover:text-gray-600'
                                }`}
                                title="Group Guests"
                            >
                                <Users size={14} />
                            </button>
                        </div>

                        {/* View Mode (Card / Table) */}
                        <div className="flex border border-gray-200 rounded-md overflow-hidden h-8">
                            <button
                                type="button"
                                onClick={() => setViewMode('grid')}
                                className={`px-2 flex items-center justify-center cursor-pointer transition-colors ${
                                    viewMode === 'grid' ? 'bg-[#f8fafc] text-[#312e81]' : 'bg-white text-gray-400 hover:text-gray-600'
                                }`}
                                title="Grid View"
                            >
                                <LayoutGrid size={14} />
                            </button>
                            <button
                                type="button"
                                onClick={() => setViewMode('list')}
                                className={`px-2 border-l border-gray-200 flex items-center justify-center cursor-pointer transition-colors ${
                                    viewMode === 'list' ? 'bg-[#f8fafc] text-[#312e81]' : 'bg-white text-gray-400 hover:text-gray-600'
                                }`}
                                title="List View"
                            >
                                <List size={14} />
                            </button>
                        </div>

                        {/* Make Group Action Button */}
                        <button
                            type="button"
                            className="flex items-center gap-1.5 bg-white border border-gray-200 rounded-md px-3 py-1 text-xs font-medium text-gray-700 hover:bg-gray-50 transition-colors h-8 cursor-pointer shadow-2xs"
                        >
                            <Users size={14} className="text-gray-500" />
                            <span>Make Group</span>
                        </button>

                        {/* Add New Reservation Button */}
                        <button
                            type="button"
                            onClick={() => setActivePage('add-reservation')}
                            className="flex items-center gap-1 bg-[#1e3a8a] hover:bg-blue-900 text-white rounded-md px-3 py-1 text-xs font-semibold transition-colors h-8 cursor-pointer shadow-2xs"
                        >
                            <Plus size={14} />
                            <span>Add Reservation</span>
                        </button>
                    </div>
                </div>

                {/* Row 2: Secondary Tabs & Secondary Actions (Export & Search) */}
                <div className="flex items-center justify-between flex-wrap gap-3 pt-1">
                    {/* Secondary Tabs */}
                    <div className="flex items-center gap-6 border-b border-gray-200 flex-1 min-w-[200px]">
                        <button
                            type="button"
                            onClick={() => setActiveTab('checked-out')}
                            className={`py-1.5 text-xs font-medium transition-colors relative cursor-pointer flex items-center gap-1.5 ${
                                activeTab === 'checked-out' ? 'text-[#312e81] font-bold' : 'text-gray-500 hover:text-gray-800'
                            }`}
                        >
                            <span>Check Out</span>
                            <span className="text-[11px] font-semibold">{countCheckOut}</span>
                            {activeTab === 'checked-out' && (
                                <span className="absolute bottom-[-1px] left-0 right-0 h-[2px] bg-[#312e81]"></span>
                            )}
                        </button>

                        <button
                            type="button"
                            onClick={() => setActiveTab('in-house')}
                            className={`py-1.5 text-xs font-medium transition-colors relative cursor-pointer flex items-center gap-1.5 ${
                                activeTab === 'in-house' ? 'text-[#312e81] font-bold' : 'text-gray-500 hover:text-gray-800'
                            }`}
                        >
                            <span>In House</span>
                            <span className="text-[11px] font-semibold">{countInHouse}</span>
                            {activeTab === 'in-house' && (
                                <span className="absolute bottom-[-1px] left-0 right-0 h-[2px] bg-[#312e81]"></span>
                            )}
                        </button>
                    </div>

                    {/* Secondary Right Actions */}
                    <div className="flex items-center gap-2">
                        {/* Export Button */}
                        <button
                            type="button"
                            onClick={exportCSV}
                            className="flex items-center gap-1.5 bg-white border border-gray-200 rounded-md px-3 py-1 text-xs font-medium text-gray-700 hover:bg-gray-50 transition-colors h-8 cursor-pointer shadow-2xs"
                        >
                            <Download size={14} className="text-gray-500" />
                            <span>Export</span>
                        </button>

                        {/* Search Box / Toggle */}
                        {isSearchOpen ? (
                            <div className="flex items-center border border-blue-400 rounded-md px-2 bg-white h-8 w-56 animate-in fade-in duration-150">
                                <Search size={14} className="text-gray-400 mr-1.5 flex-shrink-0" />
                                <input
                                    type="text"
                                    autoFocus
                                    placeholder="Search guest, res #..."
                                    value={searchQuery}
                                    onChange={e => setSearchQuery(e.target.value)}
                                    className="w-full border-0 outline-none text-xs text-gray-800"
                                />
                                <button
                                    type="button"
                                    onClick={() => {
                                        setIsSearchOpen(false);
                                        setSearchQuery('');
                                    }}
                                    className="text-gray-400 hover:text-gray-600 p-0.5 cursor-pointer"
                                >
                                    <X size={13} />
                                </button>
                            </div>
                        ) : (
                            <button
                                type="button"
                                onClick={() => setIsSearchOpen(true)}
                                className="w-8 h-8 rounded-md border border-gray-200 flex items-center justify-center text-gray-400 hover:text-gray-700 bg-white hover:bg-gray-50 cursor-pointer transition-colors shadow-2xs"
                                title="Search"
                            >
                                <Search size={14} />
                            </button>
                        )}
                    </div>
                </div>
            </div>

            {/* Main Content Area */}
            <div className="bg-white rounded-lg border border-gray-200/80 shadow-xs flex-1 flex flex-col overflow-hidden min-h-[380px]">
                {filteredReservations.length === 0 ? (
                    /* Exact Empty State matching hotel-management */
                    <div className="flex-1 flex flex-col items-center justify-center py-16 gap-3 select-none">
                        <div className="opacity-80">
                            {/* Exact Folder/Records SVG from hotel-management */}
                            <svg width="64" height="64" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
                                <rect x="18" y="22" width="28" height="32" rx="2" fill="#E5E7EB" />
                                <rect x="24" y="16" width="16" height="14" rx="1" fill="#F3F4F6" />
                                <path d="M26 22H38V24H26V22Z" fill="#D1D5DB" />
                                <path d="M26 26H38V28H26V26Z" fill="#D1D5DB" />
                                <path d="M26 30H32V32H26V30Z" fill="#D1D5DB" />

                                <path d="M12 40L16 34H48L52 40V52C52 53.1046 51.1046 54 50 54H14C12.8954 54 12 53.1046 12 52V40Z" fill="#D1D5DB" />
                                <path d="M12 40H22L24 44H40L42 40H52" stroke="#9CA3AF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />

                                <circle cx="36" cy="18" r="8" fill="#D1D5DB" />
                                <path d="M33 18H39" stroke="white" strokeWidth="2" strokeLinecap="round" />
                                <path d="M33 21H37" stroke="white" strokeWidth="2" strokeLinecap="round" />
                            </svg>
                        </div>
                        <p className="text-gray-400 font-medium text-sm">No records found</p>
                        <button
                            type="button"
                            onClick={() => setActivePage('add-reservation')}
                            className="mt-2 px-3 py-1.5 bg-[#1e3a8a] hover:bg-blue-900 text-white rounded text-xs font-semibold cursor-pointer shadow-2xs transition-colors flex items-center gap-1.5"
                        >
                            <Plus size={13} />
                            <span>Create New Reservation</span>
                        </button>
                    </div>
                ) : viewMode === 'list' ? (
                    /* Table View */
                    <div className="overflow-x-auto flex-1">
                        <table className="w-full text-left border-collapse text-xs">
                            <thead>
                                <tr className="bg-gray-50/80 border-b border-gray-200 text-[10.5px] font-bold text-gray-600 uppercase tracking-wider">
                                    <th className="px-4 py-2.5">Res #</th>
                                    <th className="px-4 py-2.5">Guest Name</th>
                                    <th className="px-4 py-2.5">Room</th>
                                    <th className="px-4 py-2.5">Stay Dates</th>
                                    <th className="px-4 py-2.5">Source</th>
                                    <th className="px-4 py-2.5">Total Tariff</th>
                                    <th className="px-4 py-2.5">Due Balance</th>
                                    <th className="px-4 py-2.5">Status</th>
                                    <th className="px-4 py-2.5 text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100 text-[11.5px]">
                                {filteredReservations.map(r => (
                                    <tr key={r.id} className="hover:bg-blue-50/20 transition-colors">
                                        <td className="px-4 py-2 font-mono font-bold text-blue-700">
                                            {r.reservationNumber}
                                        </td>
                                        <td className="px-4 py-2">
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
                                        <td className="px-4 py-2">
                                            <span className="px-1.5 py-0.2 bg-blue-50 text-blue-800 rounded font-bold font-mono">
                                                {r.roomNumber}
                                            </span>
                                            <div className="text-[10px] text-gray-500">{r.roomType}</div>
                                        </td>
                                        <td className="px-4 py-2 whitespace-nowrap">
                                            <div className="font-medium text-gray-800">
                                                {r.checkIn} → {r.checkOut}
                                            </div>
                                            <div className="text-[10px] text-gray-400">{r.nights} Night{r.nights > 1 ? 's' : ''}</div>
                                        </td>
                                        <td className="px-4 py-2 text-gray-600 font-medium">
                                            {r.source}
                                        </td>
                                        <td className="px-4 py-2 font-bold text-gray-900 font-mono">
                                            ৳ {r.totalAmount.toLocaleString()}
                                        </td>
                                        <td className="px-4 py-2 font-mono font-bold">
                                            {r.dueAmount > 0 ? (
                                                <span className="text-rose-600">৳ {r.dueAmount.toLocaleString()}</span>
                                            ) : (
                                                <span className="text-emerald-600 font-semibold flex items-center gap-1">
                                                    <Check size={11} /> Settled
                                                </span>
                                            )}
                                        </td>
                                        <td className="px-4 py-2">
                                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                                                r.status === 'in-house'
                                                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
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
                                        <td className="px-4 py-2 text-right whitespace-nowrap">
                                            <div className="flex items-center justify-end gap-1.5">
                                                {r.status === 'arriving' && (
                                                    <button
                                                        type="button"
                                                        onClick={() => handleStatusChange(r.id, 'in-house')}
                                                        className="h-6 px-2.5 text-[10px] font-bold bg-emerald-600 hover:bg-emerald-700 text-white rounded cursor-pointer shadow-2xs transition-colors"
                                                        title="Check In Guest"
                                                    >
                                                        Check In
                                                    </button>
                                                )}
                                                {r.status === 'in-house' && (
                                                    <button
                                                        type="button"
                                                        onClick={() => handleStatusChange(r.id, 'checked-out')}
                                                        className="h-6 px-2.5 text-[10px] font-bold bg-blue-700 hover:bg-blue-800 text-white rounded cursor-pointer shadow-2xs transition-colors"
                                                        title="Check Out Guest"
                                                    >
                                                        Check Out
                                                    </button>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                ) : (
                    /* Card / Grid View */
                    <div className="p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5 overflow-y-auto">
                        {filteredReservations.map(r => (
                            <div key={r.id} className="border border-gray-200 rounded-lg p-3.5 bg-white hover:border-blue-400 transition-all shadow-2xs space-y-2.5">
                                <div className="flex items-start justify-between">
                                    <div>
                                        <span className="font-mono text-xs font-bold text-blue-700">{r.reservationNumber}</span>
                                        <h4 className="font-bold text-gray-900 text-sm">{r.guestName}</h4>
                                    </div>
                                    <span className="px-2 py-0.5 rounded font-mono font-bold text-xs bg-blue-50 text-blue-800 border border-blue-200">
                                        Room {r.roomNumber}
                                    </span>
                                </div>
                                <div className="text-[11px] text-gray-500 space-y-1">
                                    <div>Type: <strong className="text-gray-700">{r.roomType}</strong></div>
                                    <div>Stay: <strong className="text-gray-700">{r.checkIn} → {r.checkOut} ({r.nights}N)</strong></div>
                                    <div>Tariff: <strong className="text-gray-900 font-mono">৳ {r.totalAmount.toLocaleString()}</strong></div>
                                </div>
                                <div className="pt-2 border-t border-gray-100 flex items-center justify-between">
                                    <span className={`px-1.5 py-0.5 rounded text-[9.5px] font-bold uppercase ${
                                        r.status === 'in-house' ? 'bg-emerald-50 text-emerald-700' : 'bg-blue-50 text-blue-700'
                                    }`}>
                                        {r.status}
                                    </span>
                                    {r.status === 'arriving' && (
                                        <button
                                            type="button"
                                            onClick={() => handleStatusChange(r.id, 'in-house')}
                                            className="px-2 py-1 bg-emerald-600 text-white rounded text-[10px] font-bold cursor-pointer"
                                        >
                                            Check In
                                        </button>
                                    )}
                                    {r.status === 'in-house' && (
                                        <button
                                            type="button"
                                            onClick={() => handleStatusChange(r.id, 'checked-out')}
                                            className="px-2 py-1 bg-blue-700 text-white rounded text-[10px] font-bold cursor-pointer"
                                        >
                                            Check Out
                                        </button>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
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
