import React, { useState, useEffect, useMemo } from 'react';
import PageHeader from '../common/PageHeader';
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
    ArrowRight,
    Trash2,
    ChevronUp,
    ChevronDown,
    ArrowUpDown,
    ExternalLink,
    Edit3
} from 'lucide-react';
import AddReservationModal from '../modals/AddReservationModal';
import ReservationActionDrawer, { type DrawerMode } from '../modals/ReservationActionDrawer';
import { EditReservationModal } from '../modals/EditReservationModal';
import type { AmendBookingData } from '../modals/AmendStayModal';
import { useNavigation } from '../../context/NavigationContext';
import {
    syncReservationsFromDB,
    updateReservationStatusInDB,
    linkBookingsInDB,
    clearAllLocalReservationsAndInventory,
    getAllStoredReservations,
    getCanonicalRooms,
    getOperatingSystemDate,
    subscribeToPMSEvents,
    type StoredReservation
} from '../../utils/roomInventoryEngine';

export interface ReservationItem {
    id: number;
    reservationNumber: string;
    groupCode?: string;
    subBookingNumber?: string;
    registrationNumber?: string;
    folioNumber?: string;
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
    status: 'confirmed' | 'arriving' | 'in-house' | 'departing' | 'checked-out' | 'hold' | 'cancelled' | 'no-show';
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


export const ReservationsView: React.FC = () => {
    const { setActivePage } = useNavigation();
    
    // Active Tab: 'reservations' (Active Bookings), 'arrivals', 'departures', 'checked-out', 'in-house', 'cancelled'
    const [activeTab, setActiveTab] = useState<'reservations' | 'arrivals' | 'departures' | 'checked-out' | 'in-house' | 'cancelled'>('reservations');
    const [viewMode, setViewMode] = useState<'grid' | 'list'>('list');
    const [guestFilter, setGuestFilter] = useState<'all' | 'single' | 'group'>('all');
    const [searchQuery, setSearchQuery] = useState('');
    
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

    // Column Sorting State
    type SortField = 'reservationNumber' | 'guestName' | 'roomNumber' | 'checkIn' | 'totalAmount' | 'dueAmount' | 'status';
    const [sortField, setSortField] = useState<SortField>('checkIn');
    const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

    // Advanced Source & VIP Filters
    const [sourceFilter, setSourceFilter] = useState<string>('all');
    const [vipFilter, setVipFilter] = useState<string>('all');

    // Action Drawer State
    const [isActionDrawerOpen, setIsActionDrawerOpen] = useState(false);
    const [actionDrawerBooking, setActionDrawerBooking] = useState<AmendBookingData | null>(null);
    const [actionDrawerMode, setActionDrawerMode] = useState<DrawerMode>('overview');

    // Edit Reservation Full Modal State
    const [editingReservation, setEditingReservation] = useState<StoredReservation | null>(null);

    const handleOpenEditReservation = (r: ReservationItem | AmendBookingData | any) => {
        const all = getAllStoredReservations();
        const found = all.find(x =>
            (r.reservationNumber && x.reservationNumber === r.reservationNumber) ||
            (r.id && String(x.id) === String(r.id))
        );
        if (found) {
            setEditingReservation(found);
        } else {
            // Synthesize reservation from row
            setEditingReservation({
                id: r.id || Date.now(),
                reservationNumber: r.reservationNumber || `RES-${Date.now().toString().slice(-6)}`,
                guestName: r.guestName || '',
                phone: r.phone || '',
                email: r.email || '',
                roomNumber: r.roomNumber || '',
                roomType: r.roomType || 'Standard Room',
                checkIn: r.checkIn || r.arrivalDate || new Date().toISOString().slice(0, 10),
                checkOut: r.checkOut || r.departureDate || new Date(Date.now() + 86400000).toISOString().slice(0, 10),
                nights: Number(r.nights) || 1,
                adults: Number(r.adults) || 1,
                children: Number(r.children) || 0,
                status: (r.status || 'CONFIRMED').toUpperCase(),
                totalAmount: Number(r.totalAmount) || 0,
                paidAmount: Number(r.paidAmount) || 0,
                dueAmount: Number(r.dueAmount) || 0,
                source: r.source || 'Direct',
                allocatedRooms: [r.roomNumber]
            } as any);
        }
    };

    const allRooms = useMemo(() => {
        return getCanonicalRooms().map(r => ({
            id: String(r.id),
            roomNumber: r.number,
            type: r.roomTypeName || 'Standard Room',
            status: r.status
        }));
    }, []);

    const handleSort = (field: SortField) => {
        if (sortField === field) {
            setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc');
        } else {
            setSortField(field);
            setSortOrder('asc');
        }
    };

    const openDrawerForReservation = (r: ReservationItem) => {
        const rawStored: any = getAllStoredReservations().find(x => 
            x.reservationNumber === r.reservationNumber || String(x.id) === String(r.id)
        ) || {};

        const bookingData: AmendBookingData = {
            id: String(r.id),
            reservationNumber: r.reservationNumber,
            groupCode: r.groupCode,
            subBookingNumber: r.subBookingNumber,
            registrationNumber: r.registrationNumber,
            folioNumber: r.folioNumber,
            guestName: r.guestName,
            roomNumber: r.roomNumber,
            roomType: r.roomType,
            arrivalDate: r.checkIn,
            departureDate: r.checkOut,
            nights: r.nights,
            adults: r.adults,
            children: r.children,
            status: r.status,
            totalAmount: r.totalAmount,
            paidAmount: r.paidAmount,
            dueAmount: r.dueAmount,
            ratePlan: rawStored.ratePlan || 'Standard Tariff',
            allocatedRooms: rawStored.allocatedRooms || [r.roomNumber],
            roomsList: rawStored.roomsList,
            groupRoomsList: rawStored.groupRoomsList,
            ...rawStored
        };

        setActionDrawerBooking(bookingData);
        setActionDrawerMode('overview');
        setIsActionDrawerOpen(true);
    };

    const resolveUiStatus = (rawStatus: string, checkIn: string, checkOut: string, opDate: string): ReservationItem['status'] => {
        const s = String(rawStatus || 'confirmed').toLowerCase().replace(/_/g, '-');
        if (s === 'cancelled' || s === 'void' || s === 'voided') return 'cancelled';
        if (s === 'no-show') return 'no-show';
        if (s === 'checked-out' || s === 'completed') return 'checked-out';
        if (s === 'hold' || s === 'tentative') return 'hold';
        if (s === 'in-house' || s === 'arrived' || s === 'stayover' || s === 'checked-in') {
            return checkOut === opDate ? 'departing' : 'in-house';
        }
        if (checkIn === opDate) {
            return 'arriving';
        }
        return 'confirmed';
    };

    // Helper to expand multi-room reservations into individual sub-booking rows
    const expandReservationsForView = (rawList: any[]): ReservationItem[] => {
        if (!Array.isArray(rawList)) return [];
        const opDate = getOperatingSystemDate();
        return rawList.flatMap((r: any, idx: number) => {
            const rooms = (r.roomsList && r.roomsList.length > 0)
                ? r.roomsList
                : (r.groupRoomsList && r.groupRoomsList.length > 0)
                    ? r.groupRoomsList
                    : null;

            if (rooms && rooms.length > 1) {
                return rooms.map((rm: any, subIdx: number) => {
                    const subNum = rm.subBookingNumber || `${r.reservationNumber}-${String(subIdx + 1).padStart(2, '0')}`;
                    const regNo = rm.registrationNumber || r.registrationNumber;
                    const folioNo = rm.folioNumber || r.folioNumber || `FOL-${subNum.replace(/^RES-/, '')}`;
                    const rIn = rm.checkInDate || rm.checkIn || r.checkIn;
                    const rOut = rm.checkOutDate || rm.checkOut || r.checkOut;
                    const rNights = Number(rm.nights) || Number(r.nights) || 1;
                    const rTariff = Number(rm.totalAmount || rm.amount || (Number(r.totalAmount) / rooms.length)) || 0;
                    const rawStatus = (rm.status && rm.status !== 'ASSIGNED' && rm.status !== 'UNASSIGNED') ? rm.status : (r.status || 'confirmed');
                    const resolvedStatus = resolveUiStatus(rawStatus, rIn, rOut, opDate);

                    return {
                        id: Number(`${r.id || idx + 1}${subIdx + 1}`),
                        reservationNumber: r.reservationNumber,
                        subBookingNumber: subNum,
                        groupCode: r.groupCode,
                        registrationNumber: regNo,
                        folioNumber: folioNo,
                        guestName: rm.guestName || r.guestName || 'Valued Guest',
                        phone: r.phone || '',
                        email: r.email || '',
                        roomNumber: String(rm.roomNumber || 'Unassigned'),
                        roomType: rm.roomType || r.roomType || 'Standard Room',
                        checkIn: rIn,
                        checkOut: rOut,
                        nights: rNights,
                        adults: Number(rm.adults || r.adults || 1),
                        children: Number(rm.children || r.children || 0),
                        status: resolvedStatus,
                        totalAmount: rTariff,
                        paidAmount: subIdx === 0 ? (Number(r.paidAmount) || 0) : 0,
                        dueAmount: subIdx === 0 ? (Number(r.dueAmount) || 0) : 0,
                        source: r.source || 'Direct',
                        vip: (rm.vip && String(rm.vip).toUpperCase() !== 'NONE' && String(rm.vip).toUpperCase() !== 'REGULAR') ? rm.vip : (r.vip && String(r.vip).toUpperCase() !== 'NONE' && String(r.vip).toUpperCase() !== 'REGULAR') ? r.vip : 'None',
                        isGroup: true,
                        groupId: r.groupCode || r.groupId,
                        groupName: r.groupCode ? `Group: ${r.groupCode}` : undefined,
                        isMasterGuest: subIdx === 0
                    };
                });
            }

            const rawStatus = r.status || 'confirmed';
            const resolvedStatus = resolveUiStatus(rawStatus, r.checkIn, r.checkOut, opDate);
            const rawVip = String(r.vip || '').trim();
            const normalizedVip = (rawVip && rawVip.toUpperCase() !== 'NONE' && rawVip.toUpperCase() !== 'REGULAR' && rawVip.toLowerCase() !== 'null') ? rawVip : 'None';

            return [{
                id: r.id || idx + 1,
                reservationNumber: r.reservationNumber,
                subBookingNumber: r.subBookingNumber || `${r.reservationNumber}-01`,
                groupCode: r.groupCode,
                registrationNumber: r.registrationNumber,
                folioNumber: r.folioNumber || `FOL-${(r.reservationNumber || '').replace(/^RES-/, '')}`,
                guestName: r.guestName || 'Valued Guest',
                phone: r.phone || '',
                email: r.email || '',
                roomNumber: String(r.roomNumber || (r.allocatedRooms && r.allocatedRooms[0]) || 'Unassigned'),
                roomType: r.roomType || 'Standard Room',
                checkIn: r.checkIn,
                checkOut: r.checkOut,
                nights: Number(r.nights) || 1,
                adults: Number(r.adults) || 1,
                children: Number(r.children) || 0,
                status: resolvedStatus,
                totalAmount: Number(r.totalAmount) || 0,
                paidAmount: Number(r.paidAmount) || 0,
                dueAmount: Number(r.dueAmount) || 0,
                source: r.source || 'Direct',
                vip: normalizedVip,
                isGroup: Boolean(r.isGroup || r.groupCode),
                groupId: r.groupCode || r.groupId,
                groupName: r.groupCode ? `Group: ${r.groupCode}` : undefined,
                isMasterGuest: true
            }];
        });
    };

    // Hydrate state from localStorage, then immediately sync with PostgreSQL DB
    const [reservations, setReservations] = useState<ReservationItem[]>(() => {
        try {
            return expandReservationsForView(getAllStoredReservations());
        } catch {}
        return [];
    });

    const loadReservationsFromDB = async () => {
        try {
            const dbList = await syncReservationsFromDB();
            if (Array.isArray(dbList)) {
                setReservations(expandReservationsForView(dbList));
            }
        } catch (e) {
            console.warn('Fallback to local cache:', e);
        }
    };

    useEffect(() => {
        loadReservationsFromDB();

        const handleSync = () => {
            loadReservationsFromDB();
        };
        window.addEventListener('hotel_pms_sync_event', handleSync);
        const unsub = subscribeToPMSEvents(() => {
            loadReservationsFromDB();
        });
        return () => {
            window.removeEventListener('hotel_pms_sync_event', handleSync);
            unsub();
        };
    }, []);

    // Handle Tab Change:
    // UX FIX: Instantly clears previous selections and turns off grouping mode so no ghost selection leaks across tabs!
    const handleTabChange = (nextTab: 'reservations' | 'arrivals' | 'departures' | 'checked-out' | 'in-house' | 'cancelled') => {
        setActiveTab(nextTab);
        setSelectedIds([]);
        setIsGroupingMode(false);
    };

    // Handle check in / check out actions with direct PostgreSQL DB persistence
    const handleStatusChange = (id: number, nextStatus: ReservationItem['status']) => {
        setReservations(prev =>
            prev.map(r => r.id === id ? { ...r, status: nextStatus } : r)
        );
        updateReservationStatusInDB(id, nextStatus);
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

    // Make Group Handler - links reservations without renumbering confirmation codes
    const handleCreateGroup = async () => {
        if (!newGroupName.trim() || selectedIds.length === 0) return;

        const selectedRes = reservations.filter(r => selectedIds.includes(r.id));
        if (selectedRes.length > 0) {
            const target = selectedRes[0];
            for (let i = 1; i < selectedRes.length; i++) {
                if (selectedRes[i].reservationNumber && target.reservationNumber) {
                    await linkBookingsInDB(target.reservationNumber, selectedRes[i].reservationNumber);
                }
            }
            await loadReservationsFromDB();
        }

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
            } else if (activeTab === 'cancelled') {
                matchesTab = r.status === 'cancelled' || r.status === 'no-show';
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

            // 5. Source Filter
            const matchesSource = sourceFilter === 'all' || (r.source || 'Direct').toLowerCase().includes(sourceFilter.toLowerCase());

            // 6. VIP Filter
            const isGuestVip = Boolean(r.vip && r.vip !== 'None' && r.vip.toUpperCase() !== 'NONE' && r.vip.toUpperCase() !== 'REGULAR');
            const matchesVip = vipFilter === 'all' ? true : vipFilter === 'vip' ? isGuestVip : !isGuestVip;

            return matchesTab && matchesGuest && matchesQuery && matchesDate && matchesSource && matchesVip;
        });
    }, [reservations, activeTab, guestFilter, searchQuery, startDate, endDate, sourceFilter, vipFilter]);

    // Interactive Sorting Engine
    const sortedReservations = useMemo(() => {
        return [...filteredReservations].sort((a, b) => {
            let comp = 0;
            if (sortField === 'reservationNumber') {
                comp = a.reservationNumber.localeCompare(b.reservationNumber);
            } else if (sortField === 'guestName') {
                comp = a.guestName.localeCompare(b.guestName);
            } else if (sortField === 'roomNumber') {
                comp = a.roomNumber.localeCompare(b.roomNumber, undefined, { numeric: true });
            } else if (sortField === 'checkIn') {
                comp = a.checkIn.localeCompare(b.checkIn);
            } else if (sortField === 'totalAmount') {
                comp = a.totalAmount - b.totalAmount;
            } else if (sortField === 'dueAmount') {
                comp = a.dueAmount - b.dueAmount;
            } else if (sortField === 'status') {
                comp = a.status.localeCompare(b.status);
            }
            return sortOrder === 'asc' ? comp : -comp;
        });
    }, [filteredReservations, sortField, sortOrder]);

    // Precise Tab counts
    const countReservations = reservations.filter(r => r.status === 'confirmed' || r.status === 'arriving' || r.status === 'hold').length;
    const countArrivals = reservations.filter(r => r.status === 'arriving').length;
    const countDepartures = reservations.filter(r => r.status === 'departing').length;
    const countInHouse = reservations.filter(r => r.status === 'in-house' || r.status === 'departing').length;
    const countCheckOut = reservations.filter(r => r.status === 'checked-out').length;
    const countCancelled = reservations.filter(r => r.status === 'cancelled' || r.status === 'no-show').length;

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
        <div className="page-container text-xs text-slate-800 animate-in fade-in duration-150">
            <PageHeader
                title="Reservations Directory"
                subtitle="Manage bookings, arrivals, in-house stays, group blocks & folio balances"
                icon={<CalendarIcon size={20} />}
                badge={`${reservations.length} Bookings`}
                actions={
                    <div className="flex items-center gap-2">
                        <button
                            type="button"
                            onClick={async () => {
                                if (window.confirm('Are you sure you want to clear all test reservations and reset room inventory to vacant/clean?')) {
                                    await clearAllLocalReservationsAndInventory();
                                    await loadReservationsFromDB();
                                }
                            }}
                            className="px-2.5 py-1.5 text-xs text-rose-600 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-md font-medium transition-colors flex items-center gap-1.5 cursor-pointer shadow-2xs"
                            title="Reset all test reservations & empty inventory"
                        >
                            <Trash2 size={13} />
                            <span>Reset Inventory</span>
                        </button>
                        <button
                            type="button"
                            onClick={() => setActivePage('add-reservation')}
                            className="btn-primary"
                        >
                            <Plus size={14} className="stroke-[2.5]" />
                            <span>Add Reservation</span>
                        </button>
                    </div>
                }
            />

            {/* Top Control Bar */}
            <div className="card-container !p-4 flex flex-col gap-3 select-none">
                {/* Row 1: Unified All 5 Status Tabs */}
                <div className="flex items-center justify-between flex-wrap gap-3 pb-1 border-b border-slate-100">
                    {/* Status Tabs */}
                    <div className="flex items-center gap-4 sm:gap-6 flex-wrap">
                        {[
                            { id: 'reservations', label: 'Reservations', count: countReservations },
                            { id: 'arrivals', label: 'Arrivals', count: countArrivals },
                            { id: 'in-house', label: 'In House', count: countInHouse },
                            { id: 'departures', label: 'Departures', count: countDepartures },
                            { id: 'checked-out', label: 'Checked Out', count: countCheckOut },
                            { id: 'cancelled', label: 'Cancelled / No-Show', count: countCancelled }
                        ].map(t => {
                            const isActive = activeTab === t.id;
                            return (
                                <button
                                    key={t.id}
                                    type="button"
                                    onClick={() => handleTabChange(t.id as any)}
                                    className={`py-2 text-[13px] transition-colors relative cursor-pointer flex items-center gap-1.5 font-medium ${
                                        isActive ? 'text-[#6C5CE7] font-bold' : 'text-slate-500 hover:text-slate-900'
                                    }`}
                                >
                                    <span>{t.label}</span>
                                    <span className={`px-1.5 py-0.2 rounded-full text-[11px] ${
                                        isActive ? 'bg-purple-100 text-[#6C5CE7]' : 'bg-slate-100 text-slate-600'
                                    }`}>
                                        {t.count}
                                    </span>
                                    {isActive && (
                                        <span className="absolute bottom-[-5px] left-0 right-0 h-[2.5px] bg-[#6C5CE7] rounded-full"></span>
                                    )}
                                </button>
                            );
                        })}
                    </div>
                </div>

                {/* Row 2: Secondary Toolbar (Date Presets, Single/Group, Search, View Mode, Grouping, Export) */}
                <div className="flex items-center justify-between flex-wrap gap-2.5">
                    {/* Left: Filter Controls */}
                    <div className="flex items-center gap-2 flex-wrap">
                        {/* Interactive Date Range Picker */}
                        <div className="relative">
                            <div className="flex items-center border border-gray-200 rounded-lg px-2.5 py-0.5 gap-1.5 bg-white text-xs text-gray-700 h-8 shadow-2xs hover:border-blue-400 transition-colors">
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
                                    <div className="absolute left-0 top-9 z-40 bg-white border border-gray-200 shadow-xl rounded-lg p-2 w-44 space-y-1 animate-in fade-in zoom-in-95 duration-100 text-xs">
                                        <div className="text-[10px] text-gray-400 uppercase px-2 py-0.5">Quick Presets</div>
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
                        <div className="flex border border-gray-200 rounded-lg overflow-hidden h-8 shadow-2xs bg-white">
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

                        {/* Search Input */}
                        <div className="relative">
                            <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
                            <input
                                type="text"
                                placeholder="Search guest, res #, room, group..."
                                value={searchQuery}
                                onChange={e => setSearchQuery(e.target.value)}
                                className="h-8 pl-7 pr-2.5 text-xs border border-gray-200 rounded-lg bg-white outline-none w-52 sm:w-64 focus:border-blue-500 shadow-2xs transition-colors"
                            />
                            {searchQuery && (
                                <button
                                    type="button"
                                    onClick={() => setSearchQuery('')}
                                    className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 cursor-pointer"
                                >
                                    <X size={12} />
                                </button>
                            )}
                        </div>

                        {/* Source Filter */}
                        <select
                            value={sourceFilter}
                            onChange={e => setSourceFilter(e.target.value)}
                            className="h-8 px-2 text-xs border border-gray-200 rounded-lg bg-white outline-none focus:border-blue-500 shadow-2xs font-medium cursor-pointer text-gray-700"
                        >
                            <option value="all">All Channels</option>
                            <option value="Direct">Direct</option>
                            <option value="Booking.com">Booking.com</option>
                            <option value="Agoda">Agoda</option>
                            <option value="Expedia">Expedia</option>
                            <option value="Corporate">Corporate</option>
                            <option value="Walk-In">Walk-In</option>
                        </select>

                        {/* VIP Filter */}
                        <select
                            value={vipFilter}
                            onChange={e => setVipFilter(e.target.value)}
                            className="h-8 px-2 text-xs border border-gray-200 rounded-lg bg-white outline-none focus:border-blue-500 shadow-2xs font-medium cursor-pointer text-gray-700"
                        >
                            <option value="all">All Tiers</option>
                            <option value="vip">VIP Only</option>
                            <option value="regular">Standard</option>
                        </select>

                        {guestFilter !== 'all' && (
                            <span className="px-2 py-0.5 rounded text-[10px] bg-blue-50 text-blue-700 border border-blue-200 flex items-center gap-1">
                                <span>Filter: {guestFilter === 'single' ? 'Single Guests' : 'Group Bookings'}</span>
                                <button type="button" onClick={() => setGuestFilter('all')} className="hover:text-red-500 cursor-pointer">
                                    <X size={11} />
                                </button>
                            </span>
                        )}
                    </div>

                    {/* Right: Actions */}
                    <div className="flex items-center gap-2">
                        {/* View Mode: Card (Grid) vs Table (List) Toggle */}
                        <div className="flex border border-gray-200 rounded-lg overflow-hidden h-8 shadow-2xs bg-white">
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
                            className={`flex items-center gap-1.5 rounded-lg px-3 py-1 text-xs font-semibold transition-all h-8 cursor-pointer shadow-2xs ${
                                isGroupingMode
                                    ? 'bg-purple-700 text-white ring-2 ring-purple-300'
                                    : 'bg-white border border-gray-200 text-gray-700 hover:bg-gray-50'
                            }`}
                            title="Click to enter grouping selection mode"
                        >
                            <Users size={14} />
                            <span>{isGroupingMode ? 'Grouping Active' : 'Make Group'}</span>
                        </button>

                        {/* Export Button */}
                        <button
                            type="button"
                            onClick={exportCSV}
                            className="flex items-center gap-1.5 bg-white border border-gray-200 rounded-lg px-3 py-1 text-xs font-semibold text-gray-700 hover:bg-gray-50 transition-colors h-8 cursor-pointer shadow-2xs"
                        >
                            <Download size={13} className="text-gray-500" />
                            <span>Export CSV</span>
                        </button>
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
                            className={`px-3.5 py-1 rounded text-xs flex items-center gap-1.5 transition-colors shadow-2xs ${
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
                        <table className="w-full text-left border-collapse text-xs min-w-[1120px]">
                            <thead>
                                <tr className="bg-gray-50/80 border-b border-gray-200 text-[10.5px] text-gray-600 uppercase tracking-wider select-none">
                                    {isGroupingMode && (
                                        <th className="px-3.5 py-2.5 w-10 text-center animate-in fade-in duration-100">
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
                                    <th 
                                        onClick={() => handleSort('reservationNumber')}
                                        className="px-3.5 py-2.5 w-28 cursor-pointer hover:bg-slate-100/80 transition-colors"
                                    >
                                        <div className="flex items-center gap-1">
                                            <span>Res #</span>
                                            {sortField === 'reservationNumber' ? (
                                                sortOrder === 'asc' ? <ChevronUp size={12} className="text-blue-600" /> : <ChevronDown size={12} className="text-blue-600" />
                                            ) : (
                                                <ArrowUpDown size={11} className="text-slate-300" />
                                            )}
                                        </div>
                                    </th>
                                    <th 
                                        onClick={() => handleSort('guestName')}
                                        className="px-3.5 py-2.5 min-w-[190px] cursor-pointer hover:bg-slate-100/80 transition-colors"
                                    >
                                        <div className="flex items-center gap-1">
                                            <span>Guest &amp; Group</span>
                                            {sortField === 'guestName' ? (
                                                sortOrder === 'asc' ? <ChevronUp size={12} className="text-blue-600" /> : <ChevronDown size={12} className="text-blue-600" />
                                            ) : (
                                                <ArrowUpDown size={11} className="text-slate-300" />
                                            )}
                                        </div>
                                    </th>
                                    <th 
                                        onClick={() => handleSort('roomNumber')}
                                        className="px-3.5 py-2.5 w-28 cursor-pointer hover:bg-slate-100/80 transition-colors"
                                    >
                                        <div className="flex items-center gap-1">
                                            <span>Room</span>
                                            {sortField === 'roomNumber' ? (
                                                sortOrder === 'asc' ? <ChevronUp size={12} className="text-blue-600" /> : <ChevronDown size={12} className="text-blue-600" />
                                            ) : (
                                                <ArrowUpDown size={11} className="text-slate-300" />
                                            )}
                                        </div>
                                    </th>
                                    <th 
                                        onClick={() => handleSort('checkIn')}
                                        className="px-3.5 py-2.5 w-40 cursor-pointer hover:bg-slate-100/80 transition-colors"
                                    >
                                        <div className="flex items-center gap-1">
                                            <span>Stay Dates</span>
                                            {sortField === 'checkIn' ? (
                                                sortOrder === 'asc' ? <ChevronUp size={12} className="text-blue-600" /> : <ChevronDown size={12} className="text-blue-600" />
                                            ) : (
                                                <ArrowUpDown size={11} className="text-slate-300" />
                                            )}
                                        </div>
                                    </th>
                                    <th className="px-3.5 py-2.5 w-28">Source</th>
                                    <th 
                                        onClick={() => handleSort('totalAmount')}
                                        className="px-3.5 py-2.5 w-32 cursor-pointer hover:bg-slate-100/80 transition-colors"
                                    >
                                        <div className="flex items-center gap-1">
                                            <span>Total Tariff</span>
                                            {sortField === 'totalAmount' ? (
                                                sortOrder === 'asc' ? <ChevronUp size={12} className="text-blue-600" /> : <ChevronDown size={12} className="text-blue-600" />
                                            ) : (
                                                <ArrowUpDown size={11} className="text-slate-300" />
                                            )}
                                        </div>
                                    </th>
                                    <th 
                                        onClick={() => handleSort('dueAmount')}
                                        className="px-3.5 py-2.5 w-32 cursor-pointer hover:bg-slate-100/80 transition-colors"
                                    >
                                        <div className="flex items-center gap-1">
                                            <span>Due Balance</span>
                                            {sortField === 'dueAmount' ? (
                                                sortOrder === 'asc' ? <ChevronUp size={12} className="text-blue-600" /> : <ChevronDown size={12} className="text-blue-600" />
                                            ) : (
                                                <ArrowUpDown size={11} className="text-slate-300" />
                                            )}
                                        </div>
                                    </th>
                                    <th 
                                        onClick={() => handleSort('status')}
                                        className="px-3.5 py-2.5 w-28 cursor-pointer hover:bg-slate-100/80 transition-colors"
                                    >
                                        <div className="flex items-center gap-1">
                                            <span>Status</span>
                                            {sortField === 'status' ? (
                                                sortOrder === 'asc' ? <ChevronUp size={12} className="text-blue-600" /> : <ChevronDown size={12} className="text-blue-600" />
                                            ) : (
                                                <ArrowUpDown size={11} className="text-slate-300" />
                                            )}
                                        </div>
                                    </th>
                                    <th className="px-3.5 py-2.5 w-44 text-right pr-4">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100 text-[11.5px]">
                                {sortedReservations.map(r => {
                                    const isSelected = selectedIds.includes(r.id);

                                    return (
                                        <tr
                                            key={r.id}
                                            onClick={() => {
                                                if (isGroupingMode) {
                                                    toggleSelectRow(r.id);
                                                } else {
                                                    openDrawerForReservation(r);
                                                }
                                            }}
                                            className={`transition-colors cursor-pointer ${
                                                isSelected ? 'bg-purple-50/60' : 'hover:bg-blue-50/40'
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
                                            <td className="px-3 py-2 font-mono whitespace-nowrap">
                                                <div className="text-blue-700 font-semibold">{r.reservationNumber}</div>
                                                {r.subBookingNumber && r.subBookingNumber !== r.reservationNumber && (
                                                    <div className="text-[10px] text-slate-500 font-mono">{r.subBookingNumber}</div>
                                                )}
                                                {r.registrationNumber && (
                                                    <div className="text-[10px] text-emerald-700 font-mono font-bold bg-emerald-50 border border-emerald-200 px-1 py-0.5 rounded inline-block mt-0.5" title="Registration Number (GRC)">
                                                        {r.registrationNumber}
                                                    </div>
                                                )}
                                            </td>

                                            {/* Guest Name & Group Pill */}
                                            <td className="px-3 py-2">
                                                <div className="flex items-center gap-1.5 flex-wrap">
                                                    <span className="font-semibold text-gray-900">{r.guestName}</span>
                                                    {r.vip && r.vip !== 'None' && r.vip.toUpperCase() !== 'NONE' && r.vip.toUpperCase() !== 'REGULAR' && (
                                                        <span className="px-1 py-0.2 rounded text-[9px] bg-amber-100 text-amber-800 border border-amber-200">
                                                            {r.vip}
                                                        </span>
                                                    )}
                                                    {(r.isGroup || r.groupCode) && (
                                                        <span className="px-1.5 py-0.2 rounded text-[9px] bg-purple-50 text-purple-700 border border-purple-200 flex items-center gap-0.5 font-bold" title="Group Booking Code">
                                                            <Users size={10} />
                                                            <span>{r.groupCode || r.groupName || 'Group'}</span>
                                                        </span>
                                                    )}
                                                </div>
                                                <div className="text-[10px] text-gray-400 font-mono">{r.phone}</div>
                                            </td>

                                            {/* Room Details */}
                                            <td className="px-3 py-2">
                                                <span className="px-1.5 py-0.2 bg-blue-50 text-blue-800 rounded font-mono">
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
                                            <td className="px-3 py-2 text-gray-900 font-mono whitespace-nowrap">
                                                ৳ {r.totalAmount.toLocaleString()}
                                            </td>

                                            {/* Due Balance */}
                                            <td className="px-3 py-2 font-mono whitespace-nowrap">
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
                                                <span className={`px-2 py-0.5 rounded text-[10px] uppercase whitespace-nowrap ${
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
                                                        : r.status === 'cancelled' || r.status === 'no-show'
                                                        ? 'bg-rose-50 text-rose-700 border border-rose-200'
                                                        : 'bg-purple-50 text-purple-700 border border-purple-200'
                                                }`}>
                                                    {r.status}
                                                </span>
                                            </td>

                                            {/* Actions */}
                                            <td className="px-3.5 py-2.5 text-right whitespace-nowrap pr-4" onClick={e => e.stopPropagation()}>
                                                <div className="flex items-center justify-end gap-1.5">
                                                    <button
                                                        type="button"
                                                        onClick={() => handleOpenEditReservation(r)}
                                                        className="h-6 px-2 text-[10px] bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200/80 rounded font-semibold flex items-center gap-1 cursor-pointer transition-colors shadow-2xs"
                                                        title="Edit Complete Reservation"
                                                    >
                                                        <Edit3 size={10} />
                                                        <span>Edit</span>
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() => openDrawerForReservation(r)}
                                                        className="h-6 px-2 text-[10px] bg-slate-100 hover:bg-slate-200 text-slate-700 rounded font-semibold flex items-center gap-1 cursor-pointer transition-colors shadow-2xs"
                                                        title="Open Action Drawer & Guest Folio"
                                                    >
                                                        <span>Manage</span>
                                                        <ExternalLink size={10} />
                                                    </button>
                                                    {(r.status === 'arriving' || r.status === 'confirmed') && (
                                                        <button
                                                            type="button"
                                                            onClick={() => handleStatusChange(r.id, 'in-house')}
                                                            className="h-6 px-2.5 text-[10px] bg-emerald-600 hover:bg-emerald-700 text-white rounded cursor-pointer shadow-2xs transition-colors font-semibold"
                                                            title="Check In Guest"
                                                        >
                                                            Check In
                                                        </button>
                                                    )}
                                                    {(r.status === 'in-house' || r.status === 'departing') && (
                                                        <button
                                                            type="button"
                                                            onClick={() => handleStatusChange(r.id, 'checked-out')}
                                                            className="h-6 px-2.5 text-[10px] bg-blue-700 hover:bg-blue-800 text-white rounded cursor-pointer shadow-2xs transition-colors font-semibold"
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
                        {sortedReservations.map(r => {
                            const isSelected = selectedIds.includes(r.id);

                            return (
                                <div
                                    key={r.id}
                                    onClick={() => {
                                        if (isGroupingMode) {
                                            toggleSelectRow(r.id);
                                        } else {
                                            openDrawerForReservation(r);
                                        }
                                    }}
                                    className={`border rounded-lg p-3.5 bg-white transition-all shadow-2xs space-y-2.5 relative cursor-pointer ${
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
                                            <div className="w-8 h-8 rounded-full bg-blue-100 text-[#1e3a8a] flex items-center justify-center flex-shrink-0 text-xs">
                                                {r.guestName.slice(0, 2).toUpperCase()}
                                            </div>
                                            <div className="min-w-0">
                                                <div className="flex items-center gap-1.5">
                                                    <h4 className="text-gray-900 text-xs truncate">{r.guestName}</h4>
                                                    {r.vip && r.vip !== 'None' && r.vip.toUpperCase() !== 'NONE' && r.vip.toUpperCase() !== 'REGULAR' && (
                                                        <span className="px-1 py-0.2 rounded text-[8px] bg-amber-100 text-amber-800 border border-amber-200">
                                                            {r.vip}
                                                        </span>
                                                    )}
                                                </div>
                                                <div className="font-mono text-[10px] text-blue-700">{r.reservationNumber}</div>
                                                {r.registrationNumber && (
                                                    <div className="font-mono text-[9px] text-emerald-700 font-bold bg-emerald-50 border border-emerald-200 px-1 rounded inline-block mt-0.5">
                                                        {r.registrationNumber}
                                                    </div>
                                                )}
                                            </div>
                                        </div>

                                        <div className="flex flex-col items-end gap-1">
                                            <span className="px-2 py-0.5 rounded font-mono text-xs bg-blue-50 text-blue-800 border border-blue-200">
                                                Room {r.roomNumber}
                                            </span>
                                        </div>
                                    </div>

                                    {/* Group Tag if attached */}
                                    {(r.isGroup || r.groupCode) && (
                                        <div className="bg-purple-50 text-purple-700 border border-purple-200 rounded px-2 py-1 text-[10px] font-semibold flex items-center gap-1.5">
                                            <Users size={12} className="text-purple-600" />
                                            <span className="truncate">Group: <strong>{r.groupCode || r.groupName || 'Group'}</strong></span>
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
                                            <span className="text-gray-900 font-mono">৳ {r.totalAmount.toLocaleString()}</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-gray-400">Due:</span>
                                            <span className={`font-mono ${r.dueAmount > 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
                                                {r.dueAmount > 0 ? `৳ ${r.dueAmount.toLocaleString()}` : 'Settled'}
                                            </span>
                                        </div>
                                    </div>

                                    {/* Card Footer Actions */}
                                    <div className="pt-1 flex items-center justify-between gap-2" onClick={e => e.stopPropagation()}>
                                        <span className={`px-2 py-0.5 rounded text-[9.5px] uppercase ${
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
                                                : r.status === 'cancelled' || r.status === 'no-show'
                                                ? 'bg-rose-50 text-rose-700 border border-rose-200'
                                                : 'bg-purple-50 text-purple-700 border border-purple-200'
                                        }`}>
                                            {r.status}
                                        </span>

                                        <div className="flex items-center gap-1.5">
                                            <button
                                                type="button"
                                                onClick={() => handleOpenEditReservation(r)}
                                                className="px-2 py-1 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200/80 rounded text-[10px] font-semibold flex items-center gap-1 cursor-pointer transition-colors shadow-2xs"
                                                title="Edit Complete Reservation"
                                            >
                                                <Edit3 size={10} />
                                                <span>Edit</span>
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => openDrawerForReservation(r)}
                                                className="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded text-[10px] font-semibold flex items-center gap-1 cursor-pointer transition-colors shadow-2xs"
                                                title="Open Action Drawer & Guest Folio"
                                            >
                                                <span>Manage</span>
                                                <ExternalLink size={10} />
                                            </button>
                                            {(r.status === 'arriving' || r.status === 'confirmed') && (
                                                <button
                                                    type="button"
                                                    onClick={() => handleStatusChange(r.id, 'in-house')}
                                                    className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-[10px] cursor-pointer shadow-2xs font-semibold"
                                                >
                                                    Check In
                                                </button>
                                            )}
                                            {(r.status === 'in-house' || r.status === 'departing') && (
                                                <button
                                                    type="button"
                                                    onClick={() => handleStatusChange(r.id, 'checked-out')}
                                                    className="px-2.5 py-1 bg-blue-700 hover:bg-blue-800 text-white rounded text-[10px] cursor-pointer shadow-2xs font-semibold"
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
                                    <h3 className="text-gray-900 text-sm">Create Group Reservation</h3>
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
                                    className={`px-4 py-1.5 rounded text-xs transition-colors cursor-pointer shadow-2xs ${
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

            {/* Unified Enterprise Reservation Action Drawer */}
            <ReservationActionDrawer
                isOpen={isActionDrawerOpen}
                onClose={() => {
                    setIsActionDrawerOpen(false);
                    setActionDrawerBooking(null);
                    loadReservationsFromDB();
                }}
                booking={actionDrawerBooking}
                initialMode={actionDrawerMode}
                allRooms={allRooms}
                systemDate={getOperatingSystemDate()}
                onEdit={(b) => {
                    setIsActionDrawerOpen(false);
                    handleOpenEditReservation(b);
                }}
                onCheckIn={async (resNo) => {
                    const target = reservations.find(r => r.reservationNumber === resNo);
                    if (target) {
                        handleStatusChange(target.id, 'in-house');
                    }
                    await loadReservationsFromDB();
                }}
                onCheckOut={async (resNo) => {
                    const target = reservations.find(r => r.reservationNumber === resNo);
                    if (target) {
                        handleStatusChange(target.id, 'checked-out');
                    }
                    await loadReservationsFromDB();
                }}
            />

            {/* Complete 360-Degree Reservation Edit Modal */}
            <EditReservationModal
                isOpen={Boolean(editingReservation)}
                onClose={() => setEditingReservation(null)}
                reservation={editingReservation}
                onSaved={async () => {
                    setEditingReservation(null);
                    await loadReservationsFromDB();
                }}
            />
        </div>
    );
};

export default ReservationsView;
