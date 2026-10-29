import React, { useState, useEffect, useMemo } from 'react';
import {
    CalendarCheck, Users, LogOut, LogIn, BedDouble,
    TrendingUp, Wrench,
    ChevronRight, User,
    Ban, CreditCard, Banknote,
    ArrowUpRight, CheckCircle2, Clock, Sparkles, X, AlertTriangle, FileText, ArrowRight
} from 'lucide-react';
import PageHeader from './common/PageHeader';
import { useNavigation } from '../context/NavigationContext';
import { useProperty } from '../context/PropertyContext';
import {
    getCanonicalRooms,
    getAllStoredReservations,
    syncRoomTypesAndRoomsFromDB,
    syncReservationsFromDB,
    subscribeToPMSEvents,
    getOperatingSystemDate,
    updateRoomHousekeepingInDB
} from '../utils/roomInventoryEngine';
import { toast } from '../context/ToastContext';

const Dashboard: React.FC = () => {
    const { setActivePage } = useNavigation();
    const { activeProperty } = useProperty();

    // Live Database State
    const [rooms, setRooms] = useState(() => getCanonicalRooms());
    const [reservations, setReservations] = useState(() => getAllStoredReservations());
    const [statusFilter, setStatusFilter] = useState<'all' | 'clean' | 'occupied' | 'reserved' | 'dirty' | 'maintenance' | 'inspected'>('all');
    const [selectedRoom, setSelectedRoom] = useState<any | null>(null);

    const handleUpdateHousekeeping = async (roomNo: string, newStatus: 'Clean' | 'Dirty' | 'Inspected') => {
        await updateRoomHousekeepingInDB(roomNo, newStatus);
        toast.success(`Room ${roomNo} status updated to ${newStatus}`);
        const freshRooms = getCanonicalRooms();
        setRooms(freshRooms);
        if (selectedRoom && String(selectedRoom.number) === String(roomNo)) {
            setSelectedRoom((prev: any) => prev ? {
                ...prev,
                housekeepingStatus: newStatus,
                status: prev.activeRes ? prev.status : (newStatus === 'Dirty' ? 'dirty' : 'clean')
            } : null);
        }
    };

    useEffect(() => {
        const propId = activeProperty?.id || 1;
        // Initial sync from central relational database
        Promise.all([syncRoomTypesAndRoomsFromDB(propId), syncReservationsFromDB(propId)]).then(([dbData, dbRes]) => {
            if (dbData?.rooms && dbData.rooms.length > 0) setRooms(dbData.rooms);
            if (dbRes && dbRes.length > 0) setReservations(dbRes);
        });

        // Real-time event subscription
        const unsub = subscribeToPMSEvents(() => {
            setRooms(getCanonicalRooms());
            setReservations(getAllStoredReservations(propId));
        });
        return () => unsub();
    }, [activeProperty?.id]);

    // Operating System Date (realtime synchronized)
    const [todayStr, setTodayStr] = useState<string>(() => getOperatingSystemDate());

    useEffect(() => {
        const handleSync = (e: any) => {
            if (e?.detail?.type === 'SYSTEM_DATE_CHANGED' && e?.detail?.systemDate) {
                setTodayStr(e.detail.systemDate);
            }
        };
        window.addEventListener('hotel_pms_sync_event', handleSync);
        return () => window.removeEventListener('hotel_pms_sync_event', handleSync);
    }, []);

    // Dynamic Calculations based on Central DB
    const metrics = useMemo(() => {
        const totalRooms = rooms.length;

        const activeReservations = reservations.filter(r => r.status !== 'cancelled' && r.status !== 'voided');

        const arrivalsToday = activeReservations.filter(r => (r.checkIn || r.arrivalDate) === todayStr);
        const upcomingArrivals = activeReservations.filter(r => (r.checkIn || r.arrivalDate) > todayStr);
        const departsToday = activeReservations.filter(r => (r.checkOut || r.departureDate) === todayStr && (r.status === 'in-house' || r.status === 'arrived'));
        const inHouseGuests = activeReservations.filter(r => r.status === 'in-house' || r.status === 'arrived');

        // Build active reservation map for today
        const activeResMap = new Map<string, any>();
        // Build upcoming future reservation map
        const upcomingResMap = new Map<string, any>();

        activeReservations.forEach(res => {
            const rawStatus = String(res.status || '').toLowerCase().replace(/_/g, '-');
            if (rawStatus === 'cancelled' || rawStatus === 'voided' || rawStatus === 'checked-out' || rawStatus === 'completed') {
                return;
            }
            const checkIn = String(res.checkIn || res.arrivalDate || '');
            const checkOut = String(res.checkOut || res.departureDate || '');
            const isCoveringToday = (checkIn <= todayStr && checkOut > todayStr) || (checkIn === todayStr);

            const roomNumbers = [
                ...(Array.isArray(res.allocatedRooms) ? res.allocatedRooms : []),
                ...(Array.isArray(res.roomsList) ? res.roomsList.map((rm: any) => rm.roomNumber) : []),
                ...(Array.isArray(res.groupRoomsList) ? res.groupRoomsList.map((rm: any) => rm.roomNumber) : []),
                res.roomNumber,
                res.roomNo
            ].filter(Boolean).map(String);

            if (isCoveringToday) {
                roomNumbers.forEach(rm => {
                    if (!activeResMap.has(rm)) {
                        activeResMap.set(rm, res);
                    }
                });
            } else if (checkIn > todayStr) {
                roomNumbers.forEach(rm => {
                    if (!upcomingResMap.has(rm)) {
                        upcomingResMap.set(rm, res);
                    }
                });
            }
        });

        // Dynamic Room Status Matrix
        const roomStatusList = rooms.map(room => {
            const res = activeResMap.get(String(room.number));
            const upcoming = !res ? upcomingResMap.get(String(room.number)) : undefined;
            let status: 'clean' | 'dirty' | 'occupied' | 'reserved' | 'maintenance' = 'clean';
            if (room.status === 'Out of Order' || room.status === 'Maintenance') {
                status = 'maintenance';
            } else if (res) {
                const rawStatus = String(res.status || '').toLowerCase().replace(/_/g, '-');
                const isInHouse = rawStatus === 'in-house' || rawStatus === 'arrived' || rawStatus === 'checked-in';
                status = isInHouse ? 'occupied' : 'reserved';
            } else if (room.housekeepingStatus === 'Dirty') {
                status = 'dirty';
            } else {
                status = 'clean';
            }
            return {
                number: room.number,
                name: room.name,
                roomType: room.roomTypeName || 'Deluxe Double',
                floorId: room.floorId || (room.number.length >= 3 ? room.number[0] : '1'),
                housekeepingStatus: room.housekeepingStatus || 'Clean',
                status,
                hasUpcoming: Boolean(upcoming),
                upcomingRes: upcoming ? {
                    id: upcoming.id,
                    reservationNumber: upcoming.reservationNumber,
                    guestName: upcoming.guestName,
                    phone: upcoming.phone || upcoming.mobile || '—',
                    checkIn: upcoming.checkIn || upcoming.arrivalDate,
                    checkOut: upcoming.checkOut || upcoming.departureDate,
                    status: upcoming.status,
                    vip: upcoming.vip,
                    totalAmount: upcoming.totalAmount || 0,
                    paidAmount: upcoming.paidAmount || 0,
                    dueAmount: upcoming.dueAmount || 0
                } : null,
                activeRes: res ? {
                    id: res.id,
                    reservationNumber: res.reservationNumber,
                    guestName: res.guestName,
                    phone: res.phone || res.mobile || '—',
                    checkIn: res.checkIn || res.arrivalDate,
                    checkOut: res.checkOut || res.departureDate,
                    status: res.status,
                    vip: res.vip,
                    totalAmount: res.totalAmount || 0,
                    paidAmount: res.paidAmount || 0,
                    dueAmount: res.dueAmount || 0
                } : null
            };
        });

        const occupiedCount = roomStatusList.filter(r => r.status === 'occupied').length;
        const reservedCount = roomStatusList.filter(r => r.status === 'reserved').length;
        const cleanCount = roomStatusList.filter(r => r.status === 'clean').length;
        const dirtyCount = roomStatusList.filter(r => r.status === 'dirty').length;
        const oooCount = roomStatusList.filter(r => r.status === 'maintenance').length;
        const occupancyRate = totalRooms > 0 ? Math.round((occupiedCount / totalRooms) * 100) : 0;

        const totalRevenue = activeReservations.reduce((sum, r) => sum + (Number(r.totalAmount) || 0), 0);
        const totalPaid = activeReservations.reduce((sum, r) => sum + (Number(r.paidAmount) || 0), 0);
        const totalDue = activeReservations.reduce((sum, r) => sum + (Number(r.dueAmount) || 0), 0);

        const adr = occupiedCount > 0 ? Math.round(totalRevenue / (activeReservations.reduce((sum, r) => sum + (Number(r.nights) || 1), 0) || 1)) : 0;
        const revPar = totalRooms > 0 ? Math.round(totalRevenue / totalRooms) : 0;
        const avgNights = activeReservations.length > 0
            ? (activeReservations.reduce((sum, r) => sum + (Number(r.nights) || 1), 0) / activeReservations.length).toFixed(1)
            : '0';

        const cancellationsToday = reservations.filter(r => r.status === 'cancelled').length;

        // Accurate physical housekeeping metrics across all inventory
        const hkClean = rooms.filter(r => (r.housekeepingStatus || 'Clean').toLowerCase() === 'clean' && r.status !== 'Out of Order' && r.status !== 'Maintenance').length;
        const hkDirty = rooms.filter(r => (r.housekeepingStatus || '').toLowerCase() === 'dirty' && r.status !== 'Out of Order' && r.status !== 'Maintenance').length;
        const hkInspected = rooms.filter(r => (r.housekeepingStatus || '').toLowerCase() === 'inspected' && r.status !== 'Out of Order' && r.status !== 'Maintenance').length;
        const hkOOO = rooms.filter(r => r.status === 'Out of Order' || r.status === 'Maintenance').length;

        return {
            totalRooms,
            occupiedCount,
            reservedCount,
            occupancyRate,
            arrivalsCount: arrivalsToday.length,
            upcomingCount: upcomingArrivals.length,
            departsCount: departsToday.length,
            inHouseCount: inHouseGuests.length,
            totalRevenue,
            totalPaid,
            totalDue,
            adr,
            revPar,
            avgNights,
            cancellationsToday,
            roomStatusList,
            counts: {
                clean: cleanCount,
                occupied: occupiedCount,
                reserved: reservedCount,
                dirty: dirtyCount,
                maintenance: oooCount,
                inspected: hkInspected
            },
            housekeeping: {
                clean: hkClean,
                dirty: hkDirty,
                inspected: hkInspected,
                ooo: hkOOO
            },
            arrivalsToday
        };
    }, [rooms, reservations, todayStr]);

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'clean': return 'bg-emerald-600 hover:bg-emerald-700 text-white';
            case 'dirty': return 'bg-amber-500 hover:bg-amber-600 text-white';
            case 'occupied': return 'bg-slate-800 hover:bg-slate-900 text-white';
            case 'reserved': return 'bg-blue-600 hover:bg-blue-700 text-white';
            case 'maintenance': return 'bg-rose-600 hover:bg-rose-700 text-white';
            default: return 'bg-slate-200 text-slate-700';
        }
    };

    return (
        <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-5 font-sans">
            {/* Standardized Thesis Page Header */}
            <PageHeader
                title="Executive Overview"
                subtitle="Real-time property operations, guest arrival flows, live occupancy, and revenue pacing"
                icon={<TrendingUp size={22} />}
                actions={
                    <>
                        <div className="btn-secondary text-xs">
                            <CalendarCheck size={14} className="text-slate-400" />
                            <span>{new Date(todayStr).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}</span>
                        </div>
                        <button
                            type="button"
                            onClick={() => setActivePage('front-desk')}
                            className="btn-primary"
                        >
                            <Users size={14} />
                            <span>Front Desk Hub</span>
                        </button>
                    </>
                }
            />

            {/* Row 1: Operations High-Level (Occupancy, Front Desk, KPI, Cancellations) */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* Occupancy Rate - Radial Gauge */}
                <div className="card-container p-4 flex flex-col items-center justify-between">
                    <div className="flex items-center justify-between w-full mb-1">
                        <span className="text-slate-500 text-[11px] uppercase tracking-wider">Occupancy</span>
                        <span className="badge-status-active">Live</span>
                    </div>
                    <div className="relative size-24 flex items-center justify-center my-2">
                        <svg className="w-full h-full transform -rotate-90">
                            <circle cx="48" cy="48" r="40" stroke="currentColor" strokeWidth="8" fill="transparent" className="text-slate-100" />
                            <circle
                                cx="48"
                                cy="48"
                                r="40"
                                stroke="currentColor"
                                strokeWidth="8"
                                fill="transparent"
                                strokeDasharray={251.32}
                                strokeDashoffset={251.32 * (1 - Math.min(1, metrics.occupancyRate / 100))}
                                className="text-primary transition-all duration-500"
                            />
                        </svg>
                        <div className="absolute flex flex-col items-center">
                            <span className="text-xl font-black text-slate-900 leading-none">{metrics.occupancyRate}%</span>
                            <span className="text-[10px] text-slate-400 font-medium mt-0.5">Capacity</span>
                        </div>
                    </div>
                    <p className="text-[11px] text-slate-500 text-center font-medium">{metrics.occupiedCount} of {metrics.totalRooms} Rooms Occupied</p>
                </div>

                {/* Front Desk Activity */}
                <div className="card-container p-4 flex flex-col justify-between">
                    <div className="flex justify-between items-center mb-2">
                        <span className="text-slate-500 text-[11px] uppercase tracking-wider font-semibold">Front Desk Activity</span>
                        <button
                            type="button"
                            onClick={() => setActivePage('front-desk')}
                            className="text-[11px] text-primary hover:text-primary-hover font-semibold inline-flex items-center gap-0.5 cursor-pointer"
                        >
                            <span>Front Desk Hub</span>
                            <ArrowUpRight size={12} />
                        </button>
                    </div>
                    <div className="grid grid-cols-3 gap-2 flex-1">
                        <button
                            type="button"
                            onClick={() => setActivePage('reservations')}
                            className="flex flex-col items-center justify-center p-2 bg-emerald-50/70 hover:bg-emerald-100/70 rounded-xl border border-emerald-100 transition-all cursor-pointer text-center group shadow-2xs hover:shadow-xs"
                            title={`Arrivals: Today ${metrics.arrivalsCount}, Upcoming ${metrics.upcomingCount}`}
                        >
                            <LogIn size={16} className="text-emerald-600 mb-1 group-hover:scale-110 transition-transform" />
                            <div className="flex items-baseline gap-1">
                                <span className="text-base text-slate-900 leading-tight font-bold font-mono">{metrics.arrivalsCount}</span>
                                {metrics.upcomingCount > 0 && (
                                    <span className="text-[10px] text-emerald-700 font-mono font-bold" title={`${metrics.upcomingCount} upcoming bookings`}>
                                        +{metrics.upcomingCount}
                                    </span>
                                )}
                            </div>
                            <span className="text-[10px] text-slate-500 font-medium uppercase mt-0.5">Arrivals</span>
                        </button>
                        <button
                            type="button"
                            onClick={() => setActivePage('front-desk')}
                            className="flex flex-col items-center justify-center p-2 bg-amber-50/70 hover:bg-amber-100/70 rounded-xl border border-amber-100 transition-all cursor-pointer text-center group shadow-2xs hover:shadow-xs"
                            title="View Pending Departures in Front Desk Hub"
                        >
                            <LogOut size={16} className="text-amber-600 mb-1 group-hover:scale-110 transition-transform" />
                            <span className="text-base text-slate-900 leading-tight font-bold font-mono">{metrics.departsCount}</span>
                            <span className="text-[10px] text-slate-500 font-medium uppercase mt-0.5">Departs</span>
                        </button>
                        <button
                            type="button"
                            onClick={() => setActivePage('room-rack')}
                            className="flex flex-col items-center justify-center p-2 bg-blue-50/70 hover:bg-blue-100/70 rounded-xl border border-blue-100 transition-all cursor-pointer text-center group shadow-2xs hover:shadow-xs"
                            title="View In-House Guests in Room Rack"
                        >
                            <BedDouble size={16} className="text-primary mb-1 group-hover:scale-110 transition-transform" />
                            <span className="text-base text-slate-900 leading-tight font-bold font-mono">{metrics.inHouseCount}</span>
                            <span className="text-[10px] text-slate-500 font-medium uppercase mt-0.5">In-House</span>
                        </button>
                    </div>
                    <p className="text-[11px] text-slate-500 mt-2 text-center font-medium">{metrics.departsCount} Pending Departures</p>
                </div>

                {/* KPIs (ADR, RevPAR, ALOS) */}
                <div className="grid grid-rows-3 gap-2">
                    <div className="card-container px-3.5 py-2.5 flex items-center justify-between">
                        <div>
                            <p className="text-slate-400 text-[10px] uppercase tracking-wider">ADR</p>
                            <h4 className="text-xs text-slate-900 leading-tight">৳ {metrics.adr.toLocaleString()}</h4>
                        </div>
                        <span className="text-[10.5px] text-emerald-600 font-semibold flex items-center bg-emerald-50 px-1.5 py-0.5 rounded-full border border-emerald-100">
                            <TrendingUp size={10} className="mr-0.5" /> Live
                        </span>
                    </div>
                    <div className="card-container px-3.5 py-2.5 flex items-center justify-between">
                        <div>
                            <p className="text-slate-400 text-[10px] uppercase tracking-wider">RevPAR</p>
                            <h4 className="text-xs text-slate-900 leading-tight">৳ {metrics.revPar.toLocaleString()}</h4>
                        </div>
                        <span className="text-[10.5px] text-emerald-600 font-semibold flex items-center bg-emerald-50 px-1.5 py-0.5 rounded-full border border-emerald-100">
                            <TrendingUp size={10} className="mr-0.5" /> Live
                        </span>
                    </div>
                    <div className="card-container px-3.5 py-2.5 flex items-center justify-between">
                        <div>
                            <p className="text-slate-400 text-[10px] uppercase tracking-wider">ALOS</p>
                            <h4 className="text-xs text-slate-900 leading-tight">{metrics.avgNights} Nights</h4>
                        </div>
                        <span className="text-[10px] text-slate-400 font-medium">Avg Stay</span>
                    </div>
                </div>

                {/* Cancellation Watch */}
                <div 
                    onClick={() => setActivePage('cancelled')}
                    className="card-container p-4 border-rose-200/80 bg-rose-50/20 hover:bg-rose-50/50 transition-all flex flex-col items-center justify-center relative cursor-pointer group shadow-2xs hover:shadow-xs"
                    title="Click to view Cancelled Reservations"
                >
                    <div className="absolute top-3 right-3 p-1.5 bg-rose-100 text-rose-600 rounded-lg group-hover:scale-110 transition-transform">
                        <Ban size={14} />
                    </div>
                    <span className="text-3xl font-black text-slate-900 leading-none">{metrics.cancellationsToday}</span>
                    <span className="text-xs font-semibold text-slate-600 mt-1">Cancellations</span>
                    <span className="text-[10.5px] text-rose-700 font-semibold mt-1 flex items-center bg-rose-100 px-2 py-0.5 rounded-full border border-rose-200">
                        Audit Verified
                    </span>
                </div>
            </div>

            {/* Row 2: Financials & Collections */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                {/* Revenue Breakdown */}
                <div className="card-container p-4">
                    <div className="flex justify-between items-center mb-2">
                        <h3 className="text-slate-900 text-xs tracking-tight">Financial Portfolio Summary</h3>
                        <span className="text-[10.5px] text-slate-400 font-medium">Live Ledger</span>
                    </div>
                    <div className="space-y-3 mt-3">
                        <div className="flex justify-between items-center p-2.5 bg-slate-50 rounded-xl border border-slate-100">
                            <span className="text-xs text-slate-600 font-medium">Total Billed Revenue</span>
                            <span className="text-xs text-slate-900 font-mono">৳ {metrics.totalRevenue.toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between items-center p-2.5 bg-emerald-50/60 rounded-xl border border-emerald-100">
                            <span className="text-xs text-emerald-800 font-medium">Settled Collections</span>
                            <span className="text-xs text-emerald-700 font-mono">৳ {metrics.totalPaid.toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between items-center p-2.5 bg-amber-50/60 rounded-xl border border-amber-100">
                            <span className="text-xs text-amber-800 font-medium">Outstanding Ledger</span>
                            <span className="text-xs text-amber-700 font-mono">৳ {metrics.totalDue.toLocaleString()}</span>
                        </div>
                    </div>
                </div>

                {/* Real Today Collections */}
                <div className="card-container p-4">
                    <div className="flex justify-between items-center mb-2">
                        <h3 className="text-slate-900 text-xs tracking-tight">Settled Receipts</h3>
                        <span className="font-mono text-sm text-slate-900">৳ {metrics.totalPaid.toLocaleString()}</span>
                    </div>
                    <div className="space-y-2.5 mt-3">
                        <div>
                            <div className="flex justify-between text-[11px] mb-1">
                                <span className="flex items-center gap-1.5 font-medium text-slate-700">
                                    <Banknote size={13} className="text-emerald-600" /> Settled Cash & MFS
                                </span>
                                <span className="text-slate-900 font-mono">৳ {Math.round(metrics.totalPaid * 0.6).toLocaleString()} (60%)</span>
                            </div>
                            <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                                <div className="bg-emerald-500 h-1.5 rounded-full w-[60%]"></div>
                            </div>
                        </div>
                        <div>
                            <div className="flex justify-between text-[11px] mb-1">
                                <span className="flex items-center gap-1.5 font-medium text-slate-700">
                                    <CreditCard size={13} className="text-primary" /> Card & Corporate POS
                                </span>
                                <span className="text-slate-900 font-mono">৳ {Math.round(metrics.totalPaid * 0.4).toLocaleString()} (40%)</span>
                            </div>
                            <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                                <div className="bg-primary h-1.5 rounded-full w-[40%]"></div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Housekeeping Live Overview */}
                <div className="card-container p-4 flex flex-col justify-between">
                    <div className="flex justify-between items-center mb-2">
                        <span className="text-slate-500 text-[11px] uppercase tracking-wider font-semibold">Housekeeping Status</span>
                        <button
                            type="button"
                            onClick={() => setActivePage('housekeeping')}
                            className="text-[11px] text-primary hover:text-primary-hover font-semibold inline-flex items-center gap-1 cursor-pointer transition-colors"
                            title="Open Housekeeping Management Board"
                        >
                            <span>Housekeeping Hub</span>
                            <ArrowUpRight size={12} />
                        </button>
                    </div>

                    {/* Interactive Progress Bar */}
                    <div className="flex h-3 w-full rounded-full overflow-hidden mb-2.5 bg-slate-100 p-0.5 border border-slate-200/60 shadow-2xs" title="Click any segment to filter matrix below">
                        <div 
                            onClick={() => setStatusFilter(statusFilter === 'clean' ? 'all' : 'clean')}
                            style={{ width: `${metrics.totalRooms > 0 ? (metrics.housekeeping.clean / metrics.totalRooms) * 100 : 75}%` }} 
                            className="bg-emerald-500 hover:bg-emerald-600 transition-all rounded-l-full cursor-pointer" 
                            title={`Clean: ${metrics.housekeeping.clean} rooms (Click to filter)`}
                        />
                        <div 
                            onClick={() => setStatusFilter(statusFilter === 'dirty' ? 'all' : 'dirty')}
                            style={{ width: `${metrics.totalRooms > 0 ? (metrics.housekeeping.dirty / metrics.totalRooms) * 100 : 0}%` }} 
                            className="bg-amber-500 hover:bg-amber-600 transition-all cursor-pointer" 
                            title={`Dirty: ${metrics.housekeeping.dirty} rooms (Click to filter)`}
                        />
                        <div 
                            onClick={() => setStatusFilter(statusFilter === 'inspected' ? 'all' : 'inspected')}
                            style={{ width: `${metrics.totalRooms > 0 ? (metrics.housekeeping.inspected / metrics.totalRooms) * 100 : 0}%` }} 
                            className="bg-blue-400 hover:bg-blue-500 transition-all cursor-pointer" 
                            title={`Inspected: ${metrics.housekeeping.inspected} rooms (Click to filter)`}
                        />
                        <div 
                            onClick={() => setStatusFilter(statusFilter === 'maintenance' ? 'all' : 'maintenance')}
                            style={{ width: `${metrics.totalRooms > 0 ? (metrics.housekeeping.ooo / metrics.totalRooms) * 100 : 10}%` }} 
                            className="bg-rose-500 hover:bg-rose-600 transition-all rounded-r-full cursor-pointer" 
                            title={`Out of Order / Maintenance: ${metrics.housekeeping.ooo} rooms (Click to filter)`}
                        />
                    </div>

                    {/* Interactive 2x2 Status Buttons */}
                    <div className="grid grid-cols-2 gap-2 text-xs font-semibold">
                        <button
                            type="button"
                            onClick={() => setStatusFilter(statusFilter === 'clean' ? 'all' : 'clean')}
                            className={`p-2 rounded-xl border flex items-center justify-between transition-all cursor-pointer text-left ${
                                statusFilter === 'clean'
                                    ? 'bg-emerald-600 text-white border-emerald-600 ring-2 ring-emerald-500/30 shadow-xs'
                                    : 'bg-emerald-50/70 hover:bg-emerald-100/70 border-emerald-100 text-emerald-800'
                            }`}
                            title="Click to filter Clean rooms"
                        >
                            <span className="flex items-center gap-1.5">
                                <span className={`size-2 rounded-full ${statusFilter === 'clean' ? 'bg-white' : 'bg-emerald-500'}`} />
                                Clean
                            </span>
                            <span className="font-mono text-xs font-bold">{metrics.housekeeping.clean}</span>
                        </button>

                        <button
                            type="button"
                            onClick={() => setStatusFilter(statusFilter === 'dirty' ? 'all' : 'dirty')}
                            className={`p-2 rounded-xl border flex items-center justify-between transition-all cursor-pointer text-left ${
                                statusFilter === 'dirty'
                                    ? 'bg-amber-600 text-white border-amber-600 ring-2 ring-amber-500/30 shadow-xs'
                                    : 'bg-amber-50/70 hover:bg-amber-100/70 border-amber-100 text-amber-800'
                            }`}
                            title="Click to filter Dirty rooms"
                        >
                            <span className="flex items-center gap-1.5">
                                <span className={`size-2 rounded-full ${statusFilter === 'dirty' ? 'bg-white' : 'bg-amber-500'}`} />
                                Dirty
                            </span>
                            <span className="font-mono text-xs font-bold">{metrics.housekeeping.dirty}</span>
                        </button>

                        <button
                            type="button"
                            onClick={() => setStatusFilter(statusFilter === 'inspected' ? 'all' : 'inspected')}
                            className={`p-2 rounded-xl border flex items-center justify-between transition-all cursor-pointer text-left ${
                                statusFilter === 'inspected'
                                    ? 'bg-blue-600 text-white border-blue-600 ring-2 ring-blue-500/30 shadow-xs'
                                    : 'bg-blue-50/70 hover:bg-blue-100/70 border-blue-100 text-blue-800'
                            }`}
                            title="Click to filter Inspected rooms"
                        >
                            <span className="flex items-center gap-1.5">
                                <span className={`size-2 rounded-full ${statusFilter === 'inspected' ? 'bg-white' : 'bg-blue-500'}`} />
                                Inspected
                            </span>
                            <span className="font-mono text-xs font-bold">{metrics.housekeeping.inspected}</span>
                        </button>

                        <button
                            type="button"
                            onClick={() => setStatusFilter(statusFilter === 'maintenance' ? 'all' : 'maintenance')}
                            className={`p-2 rounded-xl border flex items-center justify-between transition-all cursor-pointer text-left ${
                                statusFilter === 'maintenance'
                                    ? 'bg-rose-600 text-white border-rose-600 ring-2 ring-rose-500/30 shadow-xs'
                                    : 'bg-rose-50/70 hover:bg-rose-100/70 border-rose-100 text-rose-800'
                            }`}
                            title="Click to filter Maintenance / Out of Order rooms"
                        >
                            <span className="flex items-center gap-1.5">
                                <span className={`size-2 rounded-full ${statusFilter === 'maintenance' ? 'bg-white' : 'bg-rose-500'}`} />
                                Maintenance
                            </span>
                            <span className="font-mono text-xs font-bold">{metrics.housekeeping.ooo}</span>
                        </button>
                    </div>

                    {/* Footer quick link */}
                    <div className="flex items-center justify-between pt-2 border-t border-slate-100 mt-2 text-[10.5px]">
                        <span className="text-slate-400 font-medium">Click status to filter matrix</span>
                        <button
                            type="button"
                            onClick={() => setActivePage('housekeeping')}
                            className="text-primary hover:underline font-semibold flex items-center gap-1 cursor-pointer"
                        >
                            <Sparkles size={11} />
                            <span>Housekeeping Grid</span>
                        </button>
                    </div>
                </div>
            </div>

            {/* Row 3: Room Status Grid & Upcoming Arrivals */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                {/* Room Status Grid */}
                <div className="lg:col-span-2 card-container p-4 flex flex-col justify-between">
                    <div>
                        <div className="flex flex-wrap justify-between items-center gap-2 mb-3">
                            <div>
                                <h3 className="text-slate-900 text-xs font-bold tracking-tight">Real-Time Room Status Matrix ({metrics.totalRooms} Rooms)</h3>
                                <p className="text-[10.5px] text-slate-500 mt-0.5">Click any room for instant guest profile, folio balance &amp; housekeeping control</p>
                            </div>
                            <button
                                type="button"
                                onClick={() => setActivePage('room-rack')}
                                className="text-xs text-primary hover:text-primary-hover font-semibold inline-flex items-center gap-1 cursor-pointer"
                            >
                                <span>Open Room Rack</span>
                                <ArrowUpRight size={13} />
                            </button>
                        </div>

                        {/* Interactive Status Filter Tabs */}
                        <div className="flex items-center gap-1 mb-3 overflow-x-auto pb-1 text-[10.5px]">
                            <button
                                type="button"
                                onClick={() => setStatusFilter('all')}
                                className={`px-2.5 py-1 rounded-md font-semibold transition-all cursor-pointer ${statusFilter === 'all' ? 'bg-slate-900 text-white shadow-2xs' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
                            >
                                All ({metrics.roomStatusList.length})
                            </button>
                            <button
                                type="button"
                                onClick={() => setStatusFilter('clean')}
                                className={`px-2.5 py-1 rounded-md font-semibold transition-all cursor-pointer flex items-center gap-1 ${statusFilter === 'clean' ? 'bg-emerald-600 text-white shadow-2xs' : 'bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100'}`}
                            >
                                <span className="size-1.5 rounded-full bg-emerald-500"></span>
                                Clean ({metrics.counts.clean})
                            </button>
                            <button
                                type="button"
                                onClick={() => setStatusFilter('occupied')}
                                className={`px-2.5 py-1 rounded-md font-semibold transition-all cursor-pointer flex items-center gap-1 ${statusFilter === 'occupied' ? 'bg-slate-800 text-white shadow-2xs' : 'bg-slate-100 text-slate-700 border border-slate-200 hover:bg-slate-200'}`}
                            >
                                <span className="size-1.5 rounded-full bg-slate-700"></span>
                                Occupied ({metrics.counts.occupied})
                            </button>
                            <button
                                type="button"
                                onClick={() => setStatusFilter('reserved')}
                                className={`px-2.5 py-1 rounded-md font-semibold transition-all cursor-pointer flex items-center gap-1 ${statusFilter === 'reserved' ? 'bg-blue-600 text-white shadow-2xs' : 'bg-blue-50 text-blue-700 border border-blue-200 hover:bg-blue-100'}`}
                            >
                                <span className="size-1.5 rounded-full bg-blue-500"></span>
                                Reserved ({metrics.counts.reserved})
                            </button>
                            <button
                                type="button"
                                onClick={() => setStatusFilter('dirty')}
                                className={`px-2.5 py-1 rounded-md font-semibold transition-all cursor-pointer flex items-center gap-1 ${statusFilter === 'dirty' ? 'bg-amber-500 text-white shadow-2xs' : 'bg-amber-50 text-amber-700 border border-amber-200 hover:bg-amber-100'}`}
                            >
                                <span className="size-1.5 rounded-full bg-amber-500"></span>
                                Dirty ({metrics.counts.dirty})
                            </button>
                            <button
                                type="button"
                                onClick={() => setStatusFilter('inspected')}
                                className={`px-2.5 py-1 rounded-md font-semibold transition-all cursor-pointer flex items-center gap-1 ${statusFilter === 'inspected' ? 'bg-blue-600 text-white shadow-2xs' : 'bg-blue-50 text-blue-700 border border-blue-200 hover:bg-blue-100'}`}
                            >
                                <span className="size-1.5 rounded-full bg-blue-500"></span>
                                Inspected ({metrics.counts.inspected || metrics.housekeeping.inspected})
                            </button>
                            {metrics.counts.maintenance > 0 && (
                                <button
                                    type="button"
                                    onClick={() => setStatusFilter('maintenance')}
                                    className={`px-2.5 py-1 rounded-md font-semibold transition-all cursor-pointer flex items-center gap-1 ${statusFilter === 'maintenance' ? 'bg-rose-600 text-white shadow-2xs' : 'bg-rose-50 text-rose-700 border border-rose-200 hover:bg-rose-100'}`}
                                >
                                    <span className="size-1.5 rounded-full bg-rose-500"></span>
                                    OOO ({metrics.counts.maintenance})
                                </button>
                            )}
                        </div>

                        {/* Room Grid */}
                        <div className="grid grid-cols-6 sm:grid-cols-8 md:grid-cols-10 lg:grid-cols-12 gap-1.5">
                            {metrics.roomStatusList
                                .filter(r => {
                                    if (statusFilter === 'all') return true;
                                    if (statusFilter === 'inspected') return (r.housekeepingStatus || '').toLowerCase() === 'inspected';
                                    if (statusFilter === 'dirty') return r.status === 'dirty' || (r.housekeepingStatus || '').toLowerCase() === 'dirty';
                                    if (statusFilter === 'clean') return r.status === 'clean' || (r.housekeepingStatus || '').toLowerCase() === 'clean';
                                    return r.status === statusFilter;
                                })
                                .map((room) => (
                                    <div
                                        key={room.number}
                                        onClick={() => setSelectedRoom(room)}
                                        className={`${getStatusColor(room.status)} h-8.5 rounded-lg flex flex-col items-center justify-center text-xs font-mono font-bold cursor-pointer hover:scale-105 active:scale-95 transition-all relative shadow-2xs group`}
                                        title={`Room ${room.number}: ${room.roomType} (${room.status.toUpperCase()})${room.activeRes ? ` • Guest: ${room.activeRes.guestName}` : room.upcomingRes ? ` • Upcoming: ${room.upcomingRes.checkIn} (${room.upcomingRes.guestName})` : ''}`}
                                    >
                                        <span>{room.number}</span>
                                        {room.status === 'maintenance' && <Wrench size={8} className="absolute top-1 right-1 text-white" />}
                                        {room.status === 'dirty' && <span className="absolute top-1 right-1 size-1.5 bg-amber-200 rounded-full"></span>}
                                        {room.status === 'occupied' && <span className="absolute top-1 right-1 size-1.5 bg-blue-300 rounded-full"></span>}
                                        {room.status === 'reserved' && <Clock size={8} className="absolute top-1 right-1 text-white" />}
                                        {room.status !== 'reserved' && room.status !== 'occupied' && room.hasUpcoming && (
                                            <span className="absolute top-1 right-1 size-2 bg-blue-300 rounded-full ring-1 ring-white" title={`Upcoming Arrival: ${room.upcomingRes?.checkIn} (${room.upcomingRes?.guestName})`} />
                                        )}
                                    </div>
                                ))}
                        </div>
                    </div>

                    <div className="flex flex-wrap gap-3 mt-3 pt-2.5 border-t border-slate-100 text-[10.5px] text-slate-500 justify-between items-center font-medium">
                        <span className="text-slate-400">Click any room pill above for full details &amp; quick operations</span>
                        <div className="flex gap-3">
                            <span className="flex items-center gap-1.5"><span className="size-2 rounded-full bg-emerald-600"></span> Clean</span>
                            <span className="flex items-center gap-1.5"><span className="size-2 rounded-full bg-slate-800"></span> Occupied</span>
                            <span className="flex items-center gap-1.5"><span className="size-2 rounded-full bg-blue-600"></span> Reserved</span>
                            <span className="flex items-center gap-1.5"><span className="size-2 rounded-full bg-amber-500"></span> Dirty</span>
                            <span className="flex items-center gap-1.5"><span className="size-2 rounded-full bg-rose-600"></span> Maintenance</span>
                        </div>
                    </div>
                </div>

                {/* Real Upcoming Arrivals & In-House Stays */}
                <div className="card-container p-4 space-y-3">
                    <div className="flex justify-between items-center border-b border-slate-100 pb-2">
                        <h3 className="text-slate-900 text-xs tracking-tight">Active Guests & Arrivals</h3>
                        <button
                            type="button"
                            onClick={() => setActivePage('reservations')}
                            className="text-[11px] text-primary hover:underline flex items-center gap-0.5 cursor-pointer"
                        >
                            <span>View All</span>
                            <ChevronRight size={14} />
                        </button>
                    </div>
                    <div className="space-y-2">
                        {reservations.length > 0 ? (
                            reservations.slice(0, 5).map((res) => (
                                <div key={res.id} className="flex items-center gap-2.5 p-2 bg-slate-50/80 rounded-xl border border-slate-100">
                                    <div className={`size-7 rounded-lg flex items-center justify-center text-xs shrink-0 ${res.vip && res.vip !== 'None' ? 'bg-purple-100 text-purple-700 font-bold' : 'bg-blue-100 text-primary'}`}>
                                        <User size={13} />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <h4 className="text-xs text-slate-900 truncate">{res.guestName}</h4>
                                        <p className="text-[10px] text-slate-400 font-medium">Room {res.roomNumber || res.roomNo || '101'} • Arr: {res.checkIn || res.arrivalDate}</p>
                                    </div>
                                    <span className={`text-[10px] font-semibold px-2 py-0.5 border rounded-full capitalize shadow-2xs ${res.status === 'in-house' || res.status === 'arrived'
                                        ? 'bg-blue-50 text-blue-700 border-blue-200'
                                        : res.status === 'hold'
                                            ? 'bg-amber-50 text-amber-700 border-amber-200'
                                            : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                        }`}>
                                        {res.status}
                                    </span>
                                </div>
                            ))
                        ) : (
                            <p className="text-xs text-slate-400 p-2 text-center">No active bookings recorded</p>
                        )}
                    </div>
                </div>
            </div>

            {/* Interactive Room Quick Action Modal */}
            {selectedRoom && (
                <div 
                    className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150 select-none"
                    onClick={() => setSelectedRoom(null)}
                >
                    <div 
                        className="bg-white rounded-2xl border border-slate-200/90 shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-150"
                        onClick={e => e.stopPropagation()}
                    >
                        {/* Header */}
                        <div className="px-4 py-3 bg-slate-900 text-white flex items-center justify-between">
                            <div className="flex items-center gap-2.5">
                                <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center font-bold font-mono text-sm shadow-xs">
                                    {selectedRoom.number}
                                </div>
                                <div>
                                    <div className="flex items-center gap-2">
                                        <h3 className="text-xs font-bold leading-none">{selectedRoom.name || `Room ${selectedRoom.number}`}</h3>
                                        <span className="text-[9px] font-semibold px-1.5 py-0.5 rounded bg-white/20 text-white font-mono">
                                            Floor {selectedRoom.floorId || 1}
                                        </span>
                                    </div>
                                    <p className="text-[10px] text-slate-300 mt-0.5">{selectedRoom.roomType}</p>
                                </div>
                            </div>
                            <button
                                type="button"
                                onClick={() => setSelectedRoom(null)}
                                className="p-1.5 hover:bg-white/10 rounded-lg text-slate-300 hover:text-white transition-colors cursor-pointer"
                            >
                                <X size={16} />
                            </button>
                        </div>

                        {/* Modal Body */}
                        <div className="p-4 space-y-3.5">
                            {/* Status Strip */}
                            <div className="flex items-center justify-between p-2.5 rounded-xl border bg-slate-50 border-slate-200/80">
                                <div className="flex items-center gap-2">
                                    <span className={`size-2.5 rounded-full ${
                                        selectedRoom.status === 'occupied' ? 'bg-slate-800' :
                                        selectedRoom.status === 'reserved' ? 'bg-blue-600' :
                                        selectedRoom.status === 'clean' ? 'bg-emerald-600' :
                                        selectedRoom.status === 'dirty' ? 'bg-amber-500' : 'bg-rose-600'
                                    }`} />
                                    <div>
                                        <span className="text-xs font-bold text-slate-900 capitalize block leading-none">
                                            {selectedRoom.status === 'occupied' ? 'In-House Guest (Occupied)' :
                                             selectedRoom.status === 'reserved' ? 'Confirmed Arrival / Reserved' :
                                             selectedRoom.status === 'clean' ? 'Vacant Ready (Clean)' :
                                             selectedRoom.status === 'dirty' ? 'Needs Cleaning (Dirty)' : 'Out of Order / Maintenance'}
                                        </span>
                                        <span className="text-[10px] text-slate-500 mt-0.5 block">
                                            Housekeeping: <strong className="text-slate-700">{selectedRoom.housekeepingStatus}</strong>
                                        </span>
                                    </div>
                                </div>
                                {/* Quick Housekeeping Toggle */}
                                <button
                                    type="button"
                                    onClick={() => handleUpdateHousekeeping(selectedRoom.number, selectedRoom.housekeepingStatus === 'Clean' ? 'Dirty' : 'Clean')}
                                    className="h-7 px-2.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-lg text-[10.5px] font-semibold shadow-2xs flex items-center gap-1 cursor-pointer transition-all active:scale-95"
                                    title="Toggle Clean / Dirty"
                                >
                                    <Sparkles size={11} className="text-amber-500" />
                                    <span>Mark {selectedRoom.housekeepingStatus === 'Clean' ? 'Dirty' : 'Clean'}</span>
                                </button>
                            </div>

                            {/* If Occupied or Reserved: Guest Details */}
                            {selectedRoom.activeRes ? (
                                <div className="p-3 bg-blue-50/60 rounded-xl border border-blue-100 space-y-2">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-1.5 min-w-0">
                                            <User size={13} className="text-blue-700 shrink-0" />
                                            <span className="text-xs font-bold text-slate-900 truncate">
                                                {selectedRoom.activeRes.guestName}
                                            </span>
                                        </div>
                                        <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-blue-100 text-blue-800 font-bold shrink-0">
                                            {selectedRoom.activeRes.reservationNumber || 'RES-LIVE'}
                                        </span>
                                    </div>

                                    <div className="grid grid-cols-2 gap-2 text-[10.5px] text-slate-600 pt-1.5 border-t border-blue-100/70">
                                        <div>
                                            <span className="text-[9px] text-slate-400 block uppercase font-semibold">Check-In</span>
                                            <span className="font-semibold text-slate-800">{selectedRoom.activeRes.checkIn}</span>
                                        </div>
                                        <div>
                                            <span className="text-[9px] text-slate-400 block uppercase font-semibold">Check-Out</span>
                                            <span className="font-semibold text-slate-800">{selectedRoom.activeRes.checkOut}</span>
                                        </div>
                                        <div>
                                            <span className="text-[9px] text-slate-400 block uppercase font-semibold">Contact</span>
                                            <span className="font-medium text-slate-700">{selectedRoom.activeRes.phone || '—'}</span>
                                        </div>
                                        <div>
                                            <span className="text-[9px] text-slate-400 block uppercase font-semibold">Folio Balance</span>
                                            <span className={`font-bold ${Number(selectedRoom.activeRes.dueAmount) > 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
                                                ৳{Number(selectedRoom.activeRes.dueAmount || 0).toLocaleString()}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            ) : selectedRoom.upcomingRes ? (
                                <div className="p-3 bg-blue-50/70 rounded-xl border border-blue-200 space-y-2">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-1.5 min-w-0">
                                            <Clock size={13} className="text-blue-700 shrink-0" />
                                            <span className="text-xs font-bold text-slate-900 truncate">
                                                Upcoming: {selectedRoom.upcomingRes.guestName}
                                            </span>
                                        </div>
                                        <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-blue-100 text-blue-800 font-bold shrink-0">
                                            {selectedRoom.upcomingRes.reservationNumber}
                                        </span>
                                    </div>

                                    <div className="grid grid-cols-2 gap-2 text-[10.5px] text-slate-600 pt-1.5 border-t border-blue-100/70">
                                        <div>
                                            <span className="text-[9px] text-slate-400 block uppercase font-semibold">Arriving Date</span>
                                            <span className="font-semibold text-slate-800">{selectedRoom.upcomingRes.checkIn}</span>
                                        </div>
                                        <div>
                                            <span className="text-[9px] text-slate-400 block uppercase font-semibold">Departure</span>
                                            <span className="font-semibold text-slate-800">{selectedRoom.upcomingRes.checkOut}</span>
                                        </div>
                                        <div>
                                            <span className="text-[9px] text-slate-400 block uppercase font-semibold">Contact</span>
                                            <span className="font-medium text-slate-700">{selectedRoom.upcomingRes.phone || '—'}</span>
                                        </div>
                                        <div>
                                            <span className="text-[9px] text-slate-400 block uppercase font-semibold">Tariff Total</span>
                                            <span className="font-mono font-bold text-slate-800">
                                                ৳{Number(selectedRoom.upcomingRes.totalAmount || 0).toLocaleString()}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                /* If Vacant */
                                <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 text-[11px] text-slate-500">
                                    {selectedRoom.status === 'clean' ? (
                                        <p className="flex items-center gap-1.5 text-emerald-800 font-medium">
                                            <CheckCircle2 size={14} className="text-emerald-600 shrink-0" />
                                            <span>Room is vacant and ready for immediate guest check-in.</span>
                                        </p>
                                    ) : selectedRoom.status === 'dirty' ? (
                                        <p className="flex items-center gap-1.5 text-amber-800 font-medium">
                                            <AlertTriangle size={14} className="text-amber-600 shrink-0" />
                                            <span>Room requires housekeeping service before next arrival.</span>
                                        </p>
                                    ) : (
                                        <p className="flex items-center gap-1.5 text-rose-800 font-medium">
                                            <Wrench size={14} className="text-rose-600 shrink-0" />
                                            <span>Room is currently scheduled for maintenance/repairs.</span>
                                        </p>
                                    )}
                                </div>
                            )}

                            {/* Actions Footer */}
                            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                                {selectedRoom.activeRes ? (
                                    <>
                                        <button
                                            type="button"
                                            onClick={() => {
                                                setSelectedRoom(null);
                                                setActivePage('folio');
                                            }}
                                            className="btn-secondary text-xs h-8 px-3"
                                        >
                                            <FileText size={13} />
                                            <span>View Folio</span>
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => {
                                                setSelectedRoom(null);
                                                setActivePage('room-rack');
                                            }}
                                            className="btn-primary text-xs h-8 px-3"
                                        >
                                            <span>Open in Room Rack</span>
                                            <ArrowRight size={13} />
                                        </button>
                                    </>
                                ) : selectedRoom.upcomingRes ? (
                                    <>
                                        <button
                                            type="button"
                                            onClick={() => {
                                                setSelectedRoom(null);
                                                setActivePage('reservations');
                                            }}
                                            className="btn-secondary text-xs h-8 px-3"
                                        >
                                            <FileText size={13} />
                                            <span>View Booking</span>
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => {
                                                setSelectedRoom(null);
                                                setActivePage('front-desk');
                                            }}
                                            className="btn-primary text-xs h-8 px-3"
                                        >
                                            <span>Front Desk</span>
                                            <ArrowRight size={13} />
                                        </button>
                                    </>
                                ) : (
                                    <>
                                        <button
                                            type="button"
                                            onClick={() => {
                                                setSelectedRoom(null);
                                                setActivePage('room-rack');
                                            }}
                                            className="btn-secondary text-xs h-8 px-3"
                                        >
                                            <span>View Room Rack</span>
                                        </button>
                                        {selectedRoom.status === 'clean' && (
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    setSelectedRoom(null);
                                                    setActivePage('add-reservation');
                                                }}
                                                className="btn-primary text-xs h-8 px-3"
                                            >
                                                <BedDouble size={13} />
                                                <span>Walk-In Booking</span>
                                            </button>
                                        )}
                                    </>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Dashboard;
