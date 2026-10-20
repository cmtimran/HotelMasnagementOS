import React, { useState, useEffect, useMemo } from 'react';
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
    X,
    CheckSquare,
    Square,
    ArrowRight
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
    status: 'confirmed' | 'arriving' | 'in-house' | 'departing' | 'checked-out' | 'hold';
    totalAmount: number;
    paidAmount: number;
    dueAmount: number;
    source: string;
    vip?: string;
    isGroup?: boolean;
    groupId?: string;
    groupName?: string;
    isMasterGuest?: boolean;
}

const INITIAL_RESERVATIONS: ReservationItem[] = [
    // 1. Confirmed / Future Reservations (Belong to "Reservations")
    {
        id: 101,
        reservationNumber: 'RES-009288',
        guestName: 'Mr. Asif Iqbal',
        phone: '+880 1711-234567',
        email: 'asif.iqbal@brac.net',
        roomNumber: '105',
        roomType: 'Deluxe Double',
        checkIn: '2026-07-10',
        checkOut: '2026-07-13',
        nights: 3,
        adults: 2,
        children: 0,
        status: 'confirmed',
        totalAmount: 10500,
        paidAmount: 5000,
        dueAmount: 5500,
        source: 'Direct Web',
        vip: 'None',
        isGroup: false
    },
    {
        id: 102,
        reservationNumber: 'RES-009289',
        guestName: 'Mrs. Sabrina Yeasmin',
        phone: '+880 1819-876543',
        email: 'sabrina.y@gmail.com',
        roomNumber: '204',
        roomType: 'Superior King',
        checkIn: '2026-07-12',
        checkOut: '2026-07-15',
        nights: 3,
        adults: 2,
        children: 1,
        status: 'confirmed',
        totalAmount: 13500,
        paidAmount: 13500,
        dueAmount: 0,
        source: 'Booking.com',
        vip: 'VIP-1',
        isGroup: false
    },
    // 2. Arriving Bookings (Belong to "Reservations" and "Arrivals")
    {
        id: 103,
        reservationNumber: 'RES-009283',
        guestName: 'Engr. Tanvir Ahmed',
        phone: '+880 1912-384729',
        email: 'tanvir@apex.com',
        roomNumber: '104',
        roomType: 'Executive Suite',
        checkIn: '2026-07-03',
        checkOut: '2026-07-06',
        nights: 3,
        adults: 2,
        children: 1,
        status: 'arriving',
        totalAmount: 22500,
        paidAmount: 10000,
        dueAmount: 12500,
        source: 'Corporate Contract',
        vip: 'None',
        isGroup: true,
        groupId: 'GRP-APEX-2026',
        groupName: 'Apex Footwear AGM',
        isMasterGuest: true
    },
    {
        id: 104,
        reservationNumber: 'RES-009284',
        guestName: 'Farhan Kabir',
        phone: '+880 1611-293847',
        email: 'farhan@apex.com',
        roomNumber: '201',
        roomType: 'Deluxe Double',
        checkIn: '2026-07-03',
        checkOut: '2026-07-06',
        nights: 3,
        adults: 2,
        children: 0,
        status: 'arriving',
        totalAmount: 10500,
        paidAmount: 10500,
        dueAmount: 0,
        source: 'Corporate Contract',
        vip: 'None',
        isGroup: true,
        groupId: 'GRP-APEX-2026',
        groupName: 'Apex Footwear AGM'
    },
    // 3. Hold Bookings (Belongs to "Reservations")
    {
        id: 105,
        reservationNumber: 'RES-009287',
        guestName: 'Rashidul Hasan (Hold)',
        phone: '+880 1819-384720',
        email: 'rashidul@gmail.com',
        roomNumber: '102',
        roomType: 'Deluxe Double',
        checkIn: '2026-07-05',
        checkOut: '2026-07-08',
        nights: 3,
        adults: 2,
        children: 0,
        status: 'hold',
        totalAmount: 10500,
        paidAmount: 0,
        dueAmount: 10500,
        source: 'Phone Tentative',
        vip: 'None',
        isGroup: false
    },
    // 4. In-House Guests (Belongs to "In House")
    {
        id: 106,
        reservationNumber: 'RES-009281',
        guestName: 'Md. Tariqul Islam',
        phone: '+880 1711-928371',
        email: 'tariqul@grameen.com',
        roomNumber: '101',
        roomType: 'Deluxe Double',
        checkIn: '2026-07-01',
        checkOut: '2026-07-04',
        nights: 3,
        adults: 2,
        children: 0,
        status: 'in-house',
        totalAmount: 10500,
        paidAmount: 10500,
        dueAmount: 0,
        source: 'Direct Corporate',
        vip: 'VIP-1',
        isGroup: false
    },
    {
        id: 107,
        reservationNumber: 'RES-009285',
        guestName: 'Dr. Jean Dupont',
        phone: '+33 612-384920',
        email: 'j.dupont@paris-med.fr',
        roomNumber: '203',
        roomType: 'Executive Suite',
        checkIn: '2026-07-01',
        checkOut: '2026-07-07',
        nights: 6,
        adults: 1,
        children: 0,
        status: 'in-house',
        totalAmount: 45000,
        paidAmount: 25000,
        dueAmount: 20000,
        source: 'Direct Web',
        vip: 'VIP-GM',
        isGroup: true,
        groupId: 'GRP-UN-2026',
        groupName: 'UN Delegation Mission'
    },
    // 5. Departing Guest (Belongs to "Departures" and "In House")
    {
        id: 108,
        reservationNumber: 'RES-009280',
        guestName: 'Shahidul Alam',
        phone: '+880 1715-443322',
        email: 'shahidul@drik.net',
        roomNumber: '103',
        roomType: 'Superior King',
        checkIn: '2026-06-29',
        checkOut: '2026-07-01',
        nights: 2,
        adults: 1,
        children: 0,
        status: 'departing',
        totalAmount: 9000,
        paidAmount: 9000,
        dueAmount: 0,
        source: 'Direct Walk-In',
        vip: 'VIP-2',
        isGroup: false
    },
    // 6. Checked-Out Guests (Belongs to "Check Out")
    {
        id: 109,
        reservationNumber: 'RES-009282',
        guestName: 'Samantha Chowdhury',
        phone: '+880 1819-283746',
        email: 'samantha.c@un.org',
        roomNumber: '103',
        roomType: 'Superior King',
        checkIn: '2026-06-27',
        checkOut: '2026-06-30',
        nights: 3,
        adults: 1,
        children: 0,
        status: 'checked-out',
        totalAmount: 13500,
        paidAmount: 13500,
        dueAmount: 0,
        source: 'UN Diplomatic',
        vip: 'VIP-2',
        isGroup: true,
        groupId: 'GRP-UN-2026',
        groupName: 'UN Delegation Mission',
        isMasterGuest: true
    },
    {
        id: 110,
        reservationNumber: 'RES-009286',
        guestName: 'Nusrat Jahan',
        phone: '+880 1712-384729',
        email: 'nusrat@beximco.com',
        roomNumber: '202',
        roomType: 'Superior King',
        checkIn: '2026-06-28',
        checkOut: '2026-07-01',
        nights: 3,
        adults: 2,
        children: 0,
        status: 'checked-out',
        totalAmount: 13500,
        paidAmount: 13500,
        dueAmount: 0,
        source: 'Direct Walk-In',
        vip: 'None',
        isGroup: false
    }
];

export const ReservationsView: React.FC = () => {
    const { setActivePage } = useNavigation();
    
    // Active Tab: 'reservations' (Active Bookings), 'arrivals', 'departures', 'checked-out', 'in-house'
    const [activeTab, setActiveTab] = useState<'reservations' | 'arrivals' | 'departures' | 'checked-out' | 'in-house'>('reservations');
    const [viewMode, setViewMode] = useState<'grid' | 'list'>('list');
    const [guestFilter, setGuestFilter] = useState<'all' | 'single' | 'group'>('all');
    const [searchQuery, setSearchQuery] = useState('');
    const [isSearchOpen, setIsSearchOpen] = useState(false);
    
    // Dates Range State
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [isDatePopoverOpen, setIsDatePopoverOpen] = useState(false);

    // Grouping Mode & Multi-Selection
    // UX FIX: Only active when user explicitly clicks "Make Group"
    const [isGroupingMode, setIsGroupingMode] = useState(false);
    const [selectedIds, setSelectedIds] = useState<number[]>([]);
    const [isMakeGroupModalOpen, setIsMakeGroupModalOpen] = useState(false);
    const [newGroupName, setNewGroupName] = useState('');
    const [newGroupCompany, setNewGroupCompany] = useState('');

    const [isAddModalOpen, setIsAddModalOpen] = useState(false);

    // Hydrate state from localStorage or initial
    const [reservations, setReservations] = useState<ReservationItem[]>(() => {
        try {
            const saved = localStorage.getItem('hotel_reservations_v3');
            return saved ? JSON.parse(saved) : INITIAL_RESERVATIONS;
        } catch {
            return INITIAL_RESERVATIONS;
        }
    });

    useEffect(() => {
        try {
            localStorage.setItem('hotel_reservations_v3', JSON.stringify(reservations));
        } catch (e) {
            console.error(e);
        }
    }, [reservations]);

    // Handle Tab Change:
    // UX FIX: Instantly clears previous selections and turns off grouping mode so no ghost selection leaks across tabs!
    const handleTabChange = (nextTab: 'reservations' | 'arrivals' | 'departures' | 'checked-out' | 'in-house') => {
        setActiveTab(nextTab);
        setSelectedIds([]);
        setIsGroupingMode(false);
    };

    // Handle check in / check out actions
    const handleStatusChange = (id: number, nextStatus: ReservationItem['status']) => {
        setReservations(prev =>
            prev.map(r => r.id === id ? { ...r, status: nextStatus } : r)
        );
    };

    // Toggle Selection of row in grouping mode
    const toggleSelectRow = (id: number) => {
        setSelectedIds(prev =>
            prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
        );
    };

    const toggleSelectAll = (items: ReservationItem[]) => {
        if (selectedIds.length === items.length) {
            setSelectedIds([]);
        } else {
            setSelectedIds(items.map(r => r.id));
        }
    };

    // Make Group Handler
    const handleCreateGroup = () => {
        if (!newGroupName.trim()) return;

        const generatedGroupId = `GRP-${Date.now().toString().slice(-6)}`;
        setReservations(prev =>
            prev.map(r => {
                if (selectedIds.includes(r.id)) {
                    return {
                        ...r,
                        isGroup: true,
                        groupId: generatedGroupId,
                        groupName: newGroupName.trim(),
                        source: newGroupCompany.trim() ? `Corporate: ${newGroupCompany.trim()}` : r.source
                    };
                }
                return r;
            })
        );

        setSelectedIds([]);
        setIsGroupingMode(false);
        setIsMakeGroupModalOpen(false);
        setNewGroupName('');
        setNewGroupCompany('');
    };

    // Filter Logic
    // PMS RULE:
    // 'reservations' -> Only active bookings: 'confirmed', 'arriving', 'hold' (NOT already in-house or checked-out)
    // 'arrivals' -> Arriving bookings scheduled for arrival ('arriving')
    // 'departures' -> Departing bookings scheduled to depart ('departing')
    // 'in-house' -> Currently occupied / in-house guests ('in-house', 'departing')
    // 'checked-out' -> Completed stays ('checked-out')
    const filteredReservations = useMemo(() => {
        return reservations.filter(r => {
            // 1. Status Matching
            let matchesTab = false;
            if (activeTab === 'reservations') {
                matchesTab = r.status === 'confirmed' || r.status === 'arriving' || r.status === 'hold';
            } else if (activeTab === 'arrivals') {
                matchesTab = r.status === 'arriving';
            } else if (activeTab === 'departures') {
                matchesTab = r.status === 'departing';
            } else if (activeTab === 'in-house') {
                matchesTab = r.status === 'in-house' || r.status === 'departing';
            } else if (activeTab === 'checked-out') {
                matchesTab = r.status === 'checked-out';
            }

            // 2. Single vs Group Guest Filter
            const matchesGuest =
                guestFilter === 'all' ? true :
                guestFilter === 'single' ? !r.isGroup :
                Boolean(r.isGroup);

            // 3. Search Query
            const matchesQuery =
                !searchQuery.trim() ||
                r.guestName.toLowerCase().includes(searchQuery.toLowerCase()) ||
                r.reservationNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
                r.roomNumber.includes(searchQuery) ||
                r.phone.includes(searchQuery) ||
                (r.groupName && r.groupName.toLowerCase().includes(searchQuery.toLowerCase()));

            // 4. Date Range Filter
            let matchesDate = true;
            if (startDate) {
                matchesDate = matchesDate && r.checkOut >= startDate;
            }
            if (endDate) {
                matchesDate = matchesDate && r.checkIn <= endDate;
            }

            return matchesTab && matchesGuest && matchesQuery && matchesDate;
        });
    }, [reservations, activeTab, guestFilter, searchQuery, startDate, endDate]);

    // Precise Tab counts
    const countReservations = reservations.filter(r => r.status === 'confirmed' || r.status === 'arriving' || r.status === 'hold').length;
    const countArrivals = reservations.filter(r => r.status === 'arriving').length;
    const countDepartures = reservations.filter(r => r.status === 'departing').length;
    const countInHouse = reservations.filter(r => r.status === 'in-house' || r.status === 'departing').length;
    const countCheckOut = reservations.filter(r => r.status === 'checked-out').length;

    // Quick Date Presets
    const setDatePreset = (preset: 'today' | 'week' | 'month' | 'clear') => {
        const today = new Date();
        const isoToday = today.toISOString().split('T')[0];

        if (preset === 'today') {
            setStartDate(isoToday);
            setEndDate(isoToday);
        } else if (preset === 'week') {
            setStartDate(isoToday);
            const nextWeek = new Date();
            nextWeek.setDate(today.getDate() + 7);
            setEndDate(nextWeek.toISOString().split('T')[0]);
        } else if (preset === 'month') {
            const firstDay = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().split('T')[0];
            const lastDay = new Date(today.getFullYear(), today.getMonth() + 1, 0).toISOString().split('T')[0];
            setStartDate(firstDay);
            setEndDate(lastDay);
        } else {
            setStartDate('');
            setEndDate('');
        }
        setIsDatePopoverOpen(false);
    };

    const exportCSV = () => {
        const headers = ['Reservation #', 'Guest Name', 'Group', 'Room', 'Room Type', 'Check-In', 'Check-Out', 'Nights', 'Total Amount', 'Due Amount', 'Status'];
        const rows = filteredReservations.map(r => [
            r.reservationNumber,
            `"${r.guestName}"`,
            `"${r.groupName || 'Individual'}"`,
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
        <div className="p-3 sm:p-5 bg-[#f0f4f8] min-h-full flex flex-col gap-3 font-sans text-xs text-gray-800 animate-in fade-in duration-150">
            {/* Top Control Bar (Exact 2-Row Design matching hotel-management) */}
            <div className="bg-white rounded-lg p-3 sm:px-5 sm:py-2.5 flex flex-col gap-2.5 shadow-2xs border border-gray-200/80 select-none">
                {/* Row 1: Primary Tabs & Primary Action Controls */}
                <div className="flex items-center justify-between flex-wrap gap-2.5">
                    {/* Primary Tabs */}
                    <div className="flex items-center gap-5 border-b border-gray-200 flex-1 min-w-[260px]">
                        <button
                            type="button"
                            onClick={() => handleTabChange('reservations')}
                            className={`py-2 text-[13px] font-medium transition-colors relative cursor-pointer flex items-center gap-1.5 ${
                                activeTab === 'reservations' ? 'text-[#312e81] font-bold' : 'text-gray-500 hover:text-gray-800'
                            }`}
                        >
                            <span>Reservations</span>
                            <span className="text-xs font-semibold">{countReservations}</span>
                            {activeTab === 'reservations' && (
                                <span className="absolute bottom-[-1px] left-0 right-0 h-[2px] bg-[#312e81]"></span>
                            )}
                        </button>

                        <button
                            type="button"
                            onClick={() => handleTabChange('arrivals')}
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
                            onClick={() => handleTabChange('departures')}
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
                    <div className="flex items-center gap-2 flex-wrap">
                        {/* Interactive Date Range Picker */}
                        <div className="relative">
                            <div className="flex items-center border border-gray-200 rounded-md px-2 py-0.5 gap-1.5 bg-white text-xs text-gray-700 h-8 shadow-2xs hover:border-blue-400 transition-colors">
                                <input
                                    type="date"
                                    value={startDate}
                                    onChange={e => setStartDate(e.target.value)}
                                    className="border-0 outline-none text-gray-700 text-[11px] bg-transparent cursor-pointer font-medium w-28"
                                    title="From Date"
                                />
                                <span className="text-gray-400 font-bold">→</span>
                                <input
                                    type="date"
                                    value={endDate}
                                    onChange={e => setEndDate(e.target.value)}
                                    className="border-0 outline-none text-gray-700 text-[11px] bg-transparent cursor-pointer font-medium w-28"
                                    title="To Date"
                                />
                                {(startDate || endDate) && (
                                    <button
                                        type="button"
                                        onClick={() => setDatePreset('clear')}
                                        className="text-gray-400 hover:text-red-500 p-0.5 rounded cursor-pointer"
                                        title="Clear Date Filter"
                                    >
                                        <X size={12} />
                                    </button>
                                )}
                                <button
                                    type="button"
                                    onClick={() => setIsDatePopoverOpen(!isDatePopoverOpen)}
                                    className="text-gray-400 hover:text-blue-600 p-0.5 rounded cursor-pointer"
                                    title="Quick Date Presets"
                                >
                                    <CalendarIcon size={14} />
                                </button>
                            </div>

                            {/* Quick Date Presets Dropdown */}
                            {isDatePopoverOpen && (
                                <>
                                    <div className="fixed inset-0 z-30" onClick={() => setIsDatePopoverOpen(false)}></div>
                                    <div className="absolute right-0 top-9 z-40 bg-white border border-gray-200 shadow-xl rounded-md p-2 w-44 space-y-1 animate-in fade-in zoom-in-95 duration-100 text-xs">
                                        <div className="text-[10px] font-bold text-gray-400 uppercase px-2 py-0.5">Quick Presets</div>
                                        <button
                                            type="button"
                                            onClick={() => setDatePreset('today')}
                                            className="w-full text-left px-2 py-1 rounded hover:bg-blue-50 hover:text-blue-700 cursor-pointer text-gray-700 font-medium"
                                        >
                                            Today
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setDatePreset('week')}
                                            className="w-full text-left px-2 py-1 rounded hover:bg-blue-50 hover:text-blue-700 cursor-pointer text-gray-700 font-medium"
                                        >
                                            Next 7 Days
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setDatePreset('month')}
                                            className="w-full text-left px-2 py-1 rounded hover:bg-blue-50 hover:text-blue-700 cursor-pointer text-gray-700 font-medium"
                                        >
                                            This Month
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setDatePreset('clear')}
                                            className="w-full text-left px-2 py-1 rounded hover:bg-red-50 text-red-600 cursor-pointer font-medium border-t border-gray-100 mt-1"
                                        >
                                            Clear Dates
                                        </button>
                                    </div>
                                </>
                            )}
                        </div>

                        {/* Single Guest / Group Guest Mode Toggle */}
                        <div className="flex border border-gray-200 rounded-md overflow-hidden h-8 shadow-2xs bg-white">
                            <button
                                type="button"
                                onClick={() => setGuestFilter(prev => prev === 'single' ? 'all' : 'single')}
                                className={`px-2.5 flex items-center gap-1 cursor-pointer transition-colors text-[11px] font-semibold ${
                                    guestFilter === 'single'
                                        ? 'bg-[#1e3a8a] text-white'
                                        : 'bg-white text-gray-600 hover:bg-gray-50'
                                }`}
                                title={guestFilter === 'single' ? 'Showing Single Guests (Click to show all)' : 'Filter by Single Guests only'}
                            >
                                <User size={13} />
                                <span className="hidden md:inline">Single</span>
                            </button>
                            <button
                                type="button"
                                onClick={() => setGuestFilter(prev => prev === 'group' ? 'all' : 'group')}
                                className={`px-2.5 border-l border-gray-200 flex items-center gap-1 cursor-pointer transition-colors text-[11px] font-semibold ${
                                    guestFilter === 'group'
                                        ? 'bg-[#1e3a8a] text-white'
                                        : 'bg-white text-gray-600 hover:bg-gray-50'
                                }`}
                                title={guestFilter === 'group' ? 'Showing Group Bookings (Click to show all)' : 'Filter by Group Bookings only'}
                            >
                                <Users size={13} />
                                <span className="hidden md:inline">Group</span>
                            </button>
                        </div>

                        {/* View Mode: Card (Grid) vs Table (List) Toggle */}
                        <div className="flex border border-gray-200 rounded-md overflow-hidden h-8 shadow-2xs bg-white">
                            <button
                                type="button"
                                onClick={() => setViewMode('grid')}
                                className={`px-2.5 flex items-center justify-center cursor-pointer transition-colors ${
                                    viewMode === 'grid'
                                        ? 'bg-[#1e3a8a] text-white'
                                        : 'bg-white text-gray-500 hover:bg-gray-50'
                                }`}
                                title="Switch to Card View"
                            >
                                <LayoutGrid size={14} />
                            </button>
                            <button
                                type="button"
                                onClick={() => setViewMode('list')}
                                className={`px-2.5 border-l border-gray-200 flex items-center justify-center cursor-pointer transition-colors ${
                                    viewMode === 'list'
                                        ? 'bg-[#1e3a8a] text-white'
                                        : 'bg-white text-gray-500 hover:bg-gray-50'
                                }`}
                                title="Switch to List View"
                            >
                                <List size={14} />
                            </button>
                        </div>

                        {/* Make Group Action Button */}
                        <button
                            type="button"
                            onClick={() => {
                                if (filteredReservations.length === 0) {
                                    setIsMakeGroupModalOpen(true);
                                } else {
                                    setIsGroupingMode(!isGroupingMode);
                                }
                            }}
                            className={`flex items-center gap-1.5 rounded-md px-3 py-1 text-xs font-semibold transition-all h-8 cursor-pointer shadow-2xs ${
                                isGroupingMode
                                    ? 'bg-purple-700 text-white ring-2 ring-purple-300'
                                    : 'bg-white border border-gray-200 text-gray-700 hover:bg-gray-50'
                            }`}
                            title="Click to enter grouping selection mode"
                        >
                            <Users size={14} />
                            <span>{isGroupingMode ? 'Grouping Active' : 'Make Group'}</span>
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
                <div className="flex items-center justify-between flex-wrap gap-2.5 pt-1">
                    {/* Secondary Tabs */}
                    <div className="flex items-center gap-5 border-b border-gray-200 flex-1 min-w-[200px]">
                        <button
                            type="button"
                            onClick={() => handleTabChange('checked-out')}
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
                            onClick={() => handleTabChange('in-house')}
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
                        {/* Active Filter Indicators */}
                        {guestFilter !== 'all' && (
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200 flex items-center gap-1">
                                <span>Filter: {guestFilter === 'single' ? 'Single Guests' : 'Group Bookings'}</span>
                                <button type="button" onClick={() => setGuestFilter('all')} className="hover:text-red-500 cursor-pointer">
                                    <X size={11} />
                                </button>
                            </span>
                        )}

                        {/* Export Button */}
                        <button
                            type="button"
                            onClick={exportCSV}
                            className="flex items-center gap-1.5 bg-white border border-gray-200 rounded-md px-3 py-1 text-xs font-medium text-gray-700 hover:bg-gray-50 transition-colors h-8 cursor-pointer shadow-2xs"
                        >
                            <Download size={13} className="text-gray-500" />
                            <span>Export</span>
                        </button>

                        {/* Search Box / Toggle */}
                        {isSearchOpen ? (
                            <div className="flex items-center border border-blue-400 rounded-md px-2 bg-white h-8 w-60 animate-in fade-in duration-150 shadow-2xs">
                                <Search size={13} className="text-gray-400 mr-1.5 flex-shrink-0" />
                                <input
                                    type="text"
                                    autoFocus
                                    placeholder="Search guest, res #, group..."
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
                                    <X size={12} />
                                </button>
                            </div>
                        ) : (
                            <button
                                type="button"
                                onClick={() => setIsSearchOpen(true)}
                                className="w-8 h-8 rounded-md border border-gray-200 flex items-center justify-center text-gray-500 hover:text-gray-800 bg-white hover:bg-gray-50 cursor-pointer transition-colors shadow-2xs"
                                title="Search Reservations"
                            >
                                <Search size={14} />
                            </button>
                        )}
                    </div>
                </div>
            </div>

            {/* Grouping Selection Mode Action Banner */}
            {isGroupingMode && (
                <div className="bg-purple-50 border border-purple-200 rounded-lg px-4 py-2 flex items-center justify-between gap-3 text-xs shadow-2xs animate-in fade-in duration-150 select-none">
                    <div className="flex items-center gap-2 text-purple-900 font-semibold">
                        <Users size={16} className="text-purple-700 flex-shrink-0" />
                        <span>Select the reservations you want to bundle into a group:</span>
                        <span className="bg-purple-700 text-white px-2 py-0.5 rounded-full text-[11px] font-bold">
                            {selectedIds.length} Selected
                        </span>
                    </div>

                    <div className="flex items-center gap-2">
                        <button
                            type="button"
                            onClick={() => {
                                setIsGroupingMode(false);
                                setSelectedIds([]);
                            }}
                            className="px-3 py-1 bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 rounded text-xs font-semibold cursor-pointer"
                        >
                            Cancel
                        </button>
                        <button
                            type="button"
                            disabled={selectedIds.length === 0}
                            onClick={() => setIsMakeGroupModalOpen(true)}
                            className={`px-3.5 py-1 rounded text-xs font-bold flex items-center gap-1.5 transition-colors shadow-2xs ${
                                selectedIds.length > 0
                                    ? 'bg-purple-700 hover:bg-purple-800 text-white cursor-pointer'
                                    : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                            }`}
                        >
                            <span>Bundle Selected ({selectedIds.length})</span>
                            <ArrowRight size={13} />
                        </button>
                    </div>
                </div>
            )}

            {/* Main Content Area */}
            <div className="bg-white rounded-lg border border-gray-200/80 shadow-2xs flex-1 flex flex-col overflow-hidden min-h-[380px]">
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
                        <div className="flex items-center gap-2 mt-1">
                            {(startDate || endDate || guestFilter !== 'all' || searchQuery) && (
                                <button
                                    type="button"
                                    onClick={() => {
                                        setStartDate('');
                                        setEndDate('');
                                        setGuestFilter('all');
                                        setSearchQuery('');
                                    }}
                                    className="px-3 py-1.5 bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 rounded text-xs font-semibold cursor-pointer shadow-2xs transition-colors"
                                >
                                    Reset Filters
                                </button>
                            )}
                            <button
                                type="button"
                                onClick={() => setActivePage('add-reservation')}
                                className="px-3 py-1.5 bg-[#1e3a8a] hover:bg-blue-900 text-white rounded text-xs font-semibold cursor-pointer shadow-2xs transition-colors flex items-center gap-1.5"
                            >
                                <Plus size={13} />
                                <span>Create New Reservation</span>
                            </button>
                        </div>
                    </div>
                ) : viewMode === 'list' ? (
                    /* Table (List) View */
                    <div className="overflow-x-auto flex-1">
                        <table className="w-full text-left border-collapse text-xs">
                            <thead>
                                <tr className="bg-gray-50/80 border-b border-gray-200 text-[10.5px] font-bold text-gray-600 uppercase tracking-wider select-none">
                                    {isGroupingMode && (
                                        <th className="px-3 py-2.5 w-10 text-center animate-in fade-in duration-100">
                                            <button
                                                type="button"
                                                onClick={() => toggleSelectAll(filteredReservations)}
                                                className="text-purple-700 hover:text-purple-900 cursor-pointer"
                                                title="Select all"
                                            >
                                                {selectedIds.length > 0 && selectedIds.length === filteredReservations.length ? (
                                                    <CheckSquare size={15} />
                                                ) : (
                                                    <Square size={15} />
                                                )}
                                            </button>
                                        </th>
                                    )}
                                    <th className="px-3 py-2.5">Res #</th>
                                    <th className="px-3 py-2.5">Guest &amp; Group</th>
                                    <th className="px-3 py-2.5">Room</th>
                                    <th className="px-3 py-2.5">Stay Dates</th>
                                    <th className="px-3 py-2.5">Source</th>
                                    <th className="px-3 py-2.5">Total Tariff</th>
                                    <th className="px-3 py-2.5">Due Balance</th>
                                    <th className="px-3 py-2.5">Status</th>
                                    <th className="px-3 py-2.5 text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100 text-[11.5px]">
                                {filteredReservations.map(r => {
                                    const isSelected = selectedIds.includes(r.id);

                                    return (
                                        <tr
                                            key={r.id}
                                            onClick={() => {
                                                if (isGroupingMode) toggleSelectRow(r.id);
                                            }}
                                            className={`transition-colors ${
                                                isGroupingMode ? 'cursor-pointer' : ''
                                            } ${
                                                isSelected ? 'bg-purple-50/60' : 'hover:bg-blue-50/20'
                                            }`}
                                        >
                                            {/* Row Checkbox (Visible only when Grouping Mode is Active) */}
                                            {isGroupingMode && (
                                                <td className="px-3 py-2 text-center animate-in fade-in duration-100">
                                                    <button
                                                        type="button"
                                                        onClick={e => {
                                                            e.stopPropagation();
                                                            toggleSelectRow(r.id);
                                                        }}
                                                        className="text-purple-700 cursor-pointer"
                                                    >
                                                        {isSelected ? (
                                                            <CheckSquare size={15} />
                                                        ) : (
                                                            <Square size={15} className="text-gray-300" />
                                                        )}
                                                    </button>
                                                </td>
                                            )}

                                            {/* Reservation Number */}
                                            <td className="px-3 py-2 font-mono font-bold text-blue-700 whitespace-nowrap">
                                                {r.reservationNumber}
                                            </td>

                                            {/* Guest Name & Group Pill */}
                                            <td className="px-3 py-2">
                                                <div className="flex items-center gap-1.5 flex-wrap">
                                                    <span className="font-semibold text-gray-900">{r.guestName}</span>
                                                    {r.vip && r.vip !== 'None' && (
                                                        <span className="px-1 py-0.2 rounded text-[9px] font-bold bg-amber-100 text-amber-800 border border-amber-200">
                                                            {r.vip}
                                                        </span>
                                                    )}
                                                    {r.isGroup && (
                                                        <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-purple-50 text-purple-700 border border-purple-200 flex items-center gap-0.5">
                                                            <Users size={10} />
                                                            <span>{r.groupName || 'Group'}</span>
                                                        </span>
                                                    )}
                                                </div>
                                                <div className="text-[10px] text-gray-400 font-mono">{r.phone}</div>
                                            </td>

                                            {/* Room Details */}
                                            <td className="px-3 py-2">
                                                <span className="px-1.5 py-0.2 bg-blue-50 text-blue-800 rounded font-bold font-mono">
                                                    {r.roomNumber}
                                                </span>
                                                <div className="text-[10px] text-gray-500">{r.roomType}</div>
                                            </td>

                                            {/* Stay Dates */}
                                            <td className="px-3 py-2 whitespace-nowrap">
                                                <div className="font-medium text-gray-800">
                                                    {r.checkIn} → {r.checkOut}
                                                </div>
                                                <div className="text-[10px] text-gray-400">{r.nights} Night{r.nights > 1 ? 's' : ''}</div>
                                            </td>

                                            {/* Source */}
                                            <td className="px-3 py-2 text-gray-600 font-medium">
                                                {r.source}
                                            </td>

                                            {/* Total Tariff */}
                                            <td className="px-3 py-2 font-bold text-gray-900 font-mono whitespace-nowrap">
                                                ৳ {r.totalAmount.toLocaleString()}
                                            </td>

                                            {/* Due Balance */}
                                            <td className="px-3 py-2 font-mono font-bold whitespace-nowrap">
                                                {r.dueAmount > 0 ? (
                                                    <span className="text-rose-600">৳ {r.dueAmount.toLocaleString()}</span>
                                                ) : (
                                                    <span className="text-emerald-600 font-semibold flex items-center gap-1">
                                                        <Check size={11} /> Settled
                                                    </span>
                                                )}
                                            </td>

                                            {/* Status Badge */}
                                            <td className="px-3 py-2">
                                                <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase whitespace-nowrap ${
                                                    r.status === 'in-house'
                                                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                                        : r.status === 'confirmed'
                                                        ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
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

                                            {/* Actions */}
                                            <td className="px-3 py-2 text-right whitespace-nowrap" onClick={e => e.stopPropagation()}>
                                                <div className="flex items-center justify-end gap-1.5">
                                                    {(r.status === 'arriving' || r.status === 'confirmed') && (
                                                        <button
                                                            type="button"
                                                            onClick={() => handleStatusChange(r.id, 'in-house')}
                                                            className="h-6 px-2.5 text-[10px] font-bold bg-emerald-600 hover:bg-emerald-700 text-white rounded cursor-pointer shadow-2xs transition-colors"
                                                            title="Check In Guest"
                                                        >
                                                            Check In
                                                        </button>
                                                    )}
                                                    {(r.status === 'in-house' || r.status === 'departing') && (
                                                        <button
                                                            type="button"
                                                            onClick={() => handleStatusChange(r.id, 'checked-out')}
                                                            className="h-6 px-2.5 text-[10px] font-bold bg-blue-700 hover:bg-blue-800 text-white rounded cursor-pointer shadow-2xs transition-colors"
                                                            title="Check Out Guest"
                                                        >
                                                            Check Out
                                                        </button>
                                                    )}
                                                    {r.status === 'hold' && (
                                                        <button
                                                            type="button"
                                                            onClick={() => handleStatusChange(r.id, 'confirmed')}
                                                            className="h-6 px-2 text-[10px] font-semibold bg-purple-600 hover:bg-purple-700 text-white rounded cursor-pointer shadow-2xs"
                                                            title="Confirm Hold"
                                                        >
                                                            Confirm
                                                        </button>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                ) : (
                    /* Card (Grid) View */
                    <div className="p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5 overflow-y-auto flex-1">
                        {filteredReservations.map(r => {
                            const isSelected = selectedIds.includes(r.id);

                            return (
                                <div
                                    key={r.id}
                                    onClick={() => {
                                        if (isGroupingMode) toggleSelectRow(r.id);
                                    }}
                                    className={`border rounded-lg p-3.5 bg-white transition-all shadow-2xs space-y-2.5 relative ${
                                        isGroupingMode ? 'cursor-pointer' : ''
                                    } ${
                                        isSelected
                                            ? 'border-purple-600 ring-2 ring-purple-500/20 bg-purple-50/10'
                                            : 'border-gray-200 hover:border-blue-300'
                                    }`}
                                >
                                    <div className="flex items-start justify-between gap-2">
                                        <div className="flex items-start gap-2 min-w-0">
                                            {isGroupingMode && (
                                                <button
                                                    type="button"
                                                    onClick={e => {
                                                        e.stopPropagation();
                                                        toggleSelectRow(r.id);
                                                    }}
                                                    className="mt-0.5 text-purple-700"
                                                >
                                                    {isSelected ? <CheckSquare size={15} /> : <Square size={15} className="text-gray-300" />}
                                                </button>
                                            )}
                                            <div className="w-8 h-8 rounded-full bg-blue-100 text-[#1e3a8a] font-bold flex items-center justify-center flex-shrink-0 text-xs">
                                                {r.guestName.slice(0, 2).toUpperCase()}
                                            </div>
                                            <div className="min-w-0">
                                                <div className="flex items-center gap-1.5">
                                                    <h4 className="font-bold text-gray-900 text-xs truncate">{r.guestName}</h4>
                                                    {r.vip && r.vip !== 'None' && (
                                                        <span className="px-1 py-0.2 rounded text-[8px] font-bold bg-amber-100 text-amber-800 border border-amber-200">
                                                            {r.vip}
                                                        </span>
                                                    )}
                                                </div>
                                                <div className="font-mono text-[10px] text-blue-700">{r.reservationNumber}</div>
                                            </div>
                                        </div>

                                        <div className="flex flex-col items-end gap-1">
                                            <span className="px-2 py-0.5 rounded font-mono font-bold text-xs bg-blue-50 text-blue-800 border border-blue-200">
                                                Room {r.roomNumber}
                                            </span>
                                        </div>
                                    </div>

                                    {/* Group Tag if attached */}
                                    {r.isGroup && (
                                        <div className="bg-purple-50 text-purple-700 border border-purple-200 rounded px-2 py-1 text-[10px] font-semibold flex items-center gap-1.5">
                                            <Users size={12} className="text-purple-600" />
                                            <span className="truncate">Group: <strong>{r.groupName}</strong></span>
                                        </div>
                                    )}

                                    {/* Card Details */}
                                    <div className="text-[11px] text-gray-600 space-y-1 bg-gray-50/70 p-2 rounded border border-gray-100">
                                        <div className="flex justify-between">
                                            <span className="text-gray-400">Type:</span>
                                            <span className="font-medium text-gray-800">{r.roomType}</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-gray-400">Stay:</span>
                                            <span className="font-medium text-gray-800">{r.checkIn} → {r.checkOut} ({r.nights}N)</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-gray-400">Tariff:</span>
                                            <span className="font-bold text-gray-900 font-mono">৳ {r.totalAmount.toLocaleString()}</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-gray-400">Due:</span>
                                            <span className={`font-mono font-bold ${r.dueAmount > 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
                                                {r.dueAmount > 0 ? `৳ ${r.dueAmount.toLocaleString()}` : 'Settled'}
                                            </span>
                                        </div>
                                    </div>

                                    {/* Card Footer Actions */}
                                    <div className="pt-1 flex items-center justify-between gap-2" onClick={e => e.stopPropagation()}>
                                        <span className={`px-2 py-0.5 rounded text-[9.5px] font-bold uppercase ${
                                            r.status === 'in-house'
                                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                                : r.status === 'confirmed'
                                                ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
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

                                        <div className="flex items-center gap-1.5">
                                            {(r.status === 'arriving' || r.status === 'confirmed') && (
                                                <button
                                                    type="button"
                                                    onClick={() => handleStatusChange(r.id, 'in-house')}
                                                    className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-[10px] font-bold cursor-pointer shadow-2xs"
                                                >
                                                    Check In
                                                </button>
                                            )}
                                            {(r.status === 'in-house' || r.status === 'departing') && (
                                                <button
                                                    type="button"
                                                    onClick={() => handleStatusChange(r.id, 'checked-out')}
                                                    className="px-2.5 py-1 bg-blue-700 hover:bg-blue-800 text-white rounded text-[10px] font-bold cursor-pointer shadow-2xs"
                                                >
                                                    Check Out
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* Make Group Modal */}
            {isMakeGroupModalOpen && (
                <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150">
                    <div className="bg-white rounded-xl shadow-2xl border border-gray-200 max-w-[480px] w-full p-5 space-y-4 animate-in zoom-in-95 duration-150">
                        <div className="flex items-center justify-between border-b border-gray-100 pb-3">
                            <div className="flex items-center gap-2">
                                <div className="w-8 h-8 rounded-lg bg-purple-100 text-purple-700 flex items-center justify-center">
                                    <Users size={16} />
                                </div>
                                <div>
                                    <h3 className="font-bold text-gray-900 text-sm">Create Group Reservation</h3>
                                    <p className="text-[11px] text-gray-500">
                                        Bundle {selectedIds.length} selected reservation(s) into a unified corporate/event group
                                    </p>
                                </div>
                            </div>
                            <button
                                type="button"
                                onClick={() => setIsMakeGroupModalOpen(false)}
                                className="text-gray-400 hover:text-gray-600 p-1 rounded cursor-pointer"
                            >
                                <X size={16} />
                            </button>
                        </div>

                        <div className="space-y-3.5">
                            <div className="p-2.5 bg-purple-50 border border-purple-200 rounded-md text-xs text-purple-900">
                                Selected <strong>{selectedIds.length}</strong> reservation(s):
                                <div className="mt-1 flex flex-wrap gap-1 max-h-20 overflow-y-auto">
                                    {reservations.filter(r => selectedIds.includes(r.id)).map(r => (
                                        <span key={r.id} className="bg-white border border-purple-200 px-1.5 py-0.5 rounded text-[10px] font-semibold text-purple-800">
                                            {r.guestName} (Room {r.roomNumber})
                                        </span>
                                    ))}
                                </div>
                            </div>

                            <div className="flex flex-col gap-1.5">
                                <label className="text-xs font-semibold text-gray-700">
                                    Group / Event Name <span className="text-red-500">*</span>
                                </label>
                                <input
                                    type="text"
                                    autoFocus
                                    placeholder="e.g. Apex Annual Retreat 2026, Tech Summit Delegation"
                                    value={newGroupName}
                                    onChange={e => setNewGroupName(e.target.value)}
                                    className="h-9 px-3 border border-gray-300 rounded-md text-xs outline-none focus:border-purple-500"
                                />
                            </div>

                            <div className="flex flex-col gap-1.5">
                                <label className="text-xs font-semibold text-gray-700">
                                    Company / Sponsoring Organization
                                </label>
                                <input
                                    type="text"
                                    placeholder="e.g. Apex Footwear Ltd., Beximco Pharma"
                                    value={newGroupCompany}
                                    onChange={e => setNewGroupCompany(e.target.value)}
                                    className="h-9 px-3 border border-gray-300 rounded-md text-xs outline-none focus:border-purple-500"
                                />
                            </div>

                            <div className="pt-2 flex justify-end gap-2 border-t border-gray-100">
                                <button
                                    type="button"
                                    onClick={() => setIsMakeGroupModalOpen(false)}
                                    className="px-3 py-1.5 bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 rounded text-xs font-semibold cursor-pointer"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="button"
                                    disabled={!newGroupName.trim()}
                                    onClick={handleCreateGroup}
                                    className={`px-4 py-1.5 rounded text-xs font-bold transition-colors cursor-pointer shadow-2xs ${
                                        newGroupName.trim()
                                            ? 'bg-purple-700 hover:bg-purple-800 text-white'
                                            : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                                    }`}
                                >
                                    Confirm &amp; Create Group
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

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
