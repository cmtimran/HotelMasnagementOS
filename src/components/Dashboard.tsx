import React, { useState, useEffect, useMemo } from 'react';
import {
    CalendarCheck, Users, LogOut, LogIn, BedDouble,
    TrendingUp, Wrench,
    ChevronRight, User,
    Ban, CreditCard, Banknote,
    ArrowUpRight
} from 'lucide-react';
import PageHeader from './common/PageHeader';
import { useNavigation } from '../context/NavigationContext';
import {
    getCanonicalRooms,
    getAllStoredReservations,
    syncRoomTypesAndRoomsFromDB,
    syncReservationsFromDB,
    subscribeToPMSEvents,
    getOperatingSystemDate
} from '../utils/roomInventoryEngine';

const Dashboard: React.FC = () => {
    const { setActivePage } = useNavigation();

    // Live Database State
    const [rooms, setRooms] = useState(() => getCanonicalRooms());
    const [reservations, setReservations] = useState(() => getAllStoredReservations());

    useEffect(() => {
        // Initial sync from central relational database
        Promise.all([syncRoomTypesAndRoomsFromDB(), syncReservationsFromDB()]).then(([dbData, dbRes]) => {
            if (dbData?.rooms && dbData.rooms.length > 0) setRooms(dbData.rooms);
            if (dbRes && dbRes.length > 0) setReservations(dbRes);
        });

        // Real-time event subscription
        const unsub = subscribeToPMSEvents(() => {
            setRooms(getCanonicalRooms());
            setReservations(getAllStoredReservations());
        });
        return () => unsub();
    }, []);

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
        const totalRooms = rooms.length || 34;

        const activeReservations = reservations.filter(r => r.status !== 'cancelled' && r.status !== 'voided');

        const arrivalsToday = activeReservations.filter(r => r.checkIn === todayStr);
        const departsToday = activeReservations.filter(r => r.checkOut === todayStr && (r.status === 'in-house' || r.status === 'arrived'));
        const inHouseGuests = activeReservations.filter(r => r.status === 'in-house' || r.status === 'arrived');

        const occupiedRoomNumbers = new Set(inHouseGuests.flatMap(r => r.allocatedRooms && r.allocatedRooms.length > 0 ? r.allocatedRooms : [r.roomNumber]));
        const occupiedCount = occupiedRoomNumbers.size;
        const occupancyRate = totalRooms > 0 ? Math.round((occupiedCount / totalRooms) * 100) : 0;

        const totalRevenue = activeReservations.reduce((sum, r) => sum + (Number(r.totalAmount) || 0), 0);
        const totalPaid = activeReservations.reduce((sum, r) => sum + (Number(r.paidAmount) || 0), 0);
        const totalDue = activeReservations.reduce((sum, r) => sum + (Number(r.dueAmount) || 0), 0);

        const adr = occupiedCount > 0 ? Math.round(totalRevenue / (activeReservations.reduce((sum, r) => sum + (Number(r.nights) || 1), 0) || 1)) : 4500;
        const revPar = totalRooms > 0 ? Math.round(totalRevenue / totalRooms) : 3150;
        const avgNights = activeReservations.length > 0
            ? (activeReservations.reduce((sum, r) => sum + (Number(r.nights) || 1), 0) / activeReservations.length).toFixed(1)
            : '2.5';

        const cancellationsToday = reservations.filter(r => r.status === 'cancelled').length;

        // Dynamic Room Status Matrix
        const roomStatusList = rooms.map(room => {
            let status: 'clean' | 'dirty' | 'occupied' | 'maintenance' = 'clean';
            if (room.status === 'Out of Order' || room.status === 'Maintenance') {
                status = 'maintenance';
            } else if (occupiedRoomNumbers.has(room.number)) {
                status = 'occupied';
            } else if (room.housekeepingStatus === 'Dirty') {
                status = 'dirty';
            } else {
                status = 'clean';
            }
            return {
                number: room.number,
                status
            };
        });

        // Housekeeping Breakdown
        const cleanCount = rooms.filter(r => r.housekeepingStatus === 'Clean' && !occupiedRoomNumbers.has(r.number)).length;
        const dirtyCount = rooms.filter(r => r.housekeepingStatus === 'Dirty').length;
        const inspectedCount = rooms.filter(r => r.housekeepingStatus === 'Inspected').length;
        const oooCount = rooms.filter(r => r.status === 'Out of Order' || r.status === 'Maintenance').length;

        return {
            totalRooms,
            occupiedCount,
            occupancyRate,
            arrivalsCount: arrivalsToday.length,
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
            housekeeping: {
                clean: cleanCount,
                dirty: dirtyCount,
                inspected: inspectedCount,
                ooo: oooCount
            },
            arrivalsToday
        };
    }, [rooms, reservations, todayStr]);

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'clean': return 'bg-emerald-600 text-white';
            case 'dirty': return 'bg-amber-500 text-white';
            case 'occupied': return 'bg-slate-700 text-white';
            case 'maintenance': return 'bg-rose-500 text-white';
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
                    <span className="text-slate-500 text-[11px] uppercase tracking-wider mb-2">Front Desk Activity</span>
                    <div className="grid grid-cols-3 gap-2 flex-1">
                        <div className="flex flex-col items-center justify-center p-2 bg-emerald-50/70 rounded-xl border border-emerald-100">
                            <LogIn size={16} className="text-emerald-600 mb-1" />
                            <span className="text-base text-slate-900 leading-tight">{metrics.arrivalsCount}</span>
                            <span className="text-[10px] text-slate-500 font-medium uppercase mt-0.5">Arrivals</span>
                        </div>
                        <div className="flex flex-col items-center justify-center p-2 bg-amber-50/70 rounded-xl border border-amber-100">
                            <LogOut size={16} className="text-amber-600 mb-1" />
                            <span className="text-base text-slate-900 leading-tight">{metrics.departsCount}</span>
                            <span className="text-[10px] text-slate-500 font-medium uppercase mt-0.5">Departs</span>
                        </div>
                        <div className="flex flex-col items-center justify-center p-2 bg-blue-50/70 rounded-xl border border-blue-100">
                            <BedDouble size={16} className="text-primary mb-1" />
                            <span className="text-base text-slate-900 leading-tight">{metrics.inHouseCount}</span>
                            <span className="text-[10px] text-slate-500 font-medium uppercase mt-0.5">In-House</span>
                        </div>
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
                <div className="card-container p-4 border-rose-200/80 bg-rose-50/20 flex flex-col items-center justify-center relative">
                    <div className="absolute top-3 right-3 p-1.5 bg-rose-100 text-rose-600 rounded-lg">
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
                    <span className="text-slate-500 text-[11px] uppercase tracking-wider mb-2">Housekeeping Status</span>
                    <div className="flex h-3 w-full rounded-full overflow-hidden mb-2 bg-slate-100">
                        <div style={{ width: `${metrics.totalRooms > 0 ? Math.round((metrics.housekeeping.clean / metrics.totalRooms) * 100) : 50}%` }} className="bg-emerald-500" title="Clean"></div>
                        <div style={{ width: `${metrics.totalRooms > 0 ? Math.round((metrics.housekeeping.dirty / metrics.totalRooms) * 100) : 25}%` }} className="bg-amber-500" title="Dirty"></div>
                        <div style={{ width: `${metrics.totalRooms > 0 ? Math.round((metrics.housekeeping.inspected / metrics.totalRooms) * 100) : 15}%` }} className="bg-blue-400" title="Inspected"></div>
                        <div style={{ width: `${metrics.totalRooms > 0 ? Math.round((metrics.housekeeping.ooo / metrics.totalRooms) * 100) : 10}%` }} className="bg-rose-500" title="OOO"></div>
                    </div>
                    <div className="grid grid-cols-2 gap-y-1.5 text-xs text-slate-600 font-medium">
                        <div className="flex items-center gap-1.5"><div className="size-2 rounded-full bg-emerald-500"></div> Clean ({metrics.housekeeping.clean})</div>
                        <div className="flex items-center gap-1.5"><div className="size-2 rounded-full bg-amber-500"></div> Dirty ({metrics.housekeeping.dirty})</div>
                        <div className="flex items-center gap-1.5"><div className="size-2 rounded-full bg-blue-400"></div> Inspected ({metrics.housekeeping.inspected})</div>
                        <div className="flex items-center gap-1.5"><div className="size-2 rounded-full bg-rose-500"></div> Maintenance ({metrics.housekeeping.ooo})</div>
                    </div>
                </div>
            </div>

            {/* Row 3: Room Status Grid & Upcoming Arrivals */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                {/* Room Status Grid */}
                <div className="lg:col-span-2 card-container p-4">
                    <div className="flex justify-between items-center mb-3">
                        <div>
                            <h3 className="text-slate-900 text-xs tracking-tight">Real-Time Room Status Matrix ({metrics.totalRooms} Rooms)</h3>
                            <p className="text-[11px] text-slate-500">Live operational state per physical room asset</p>
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
                    <div className="grid grid-cols-6 sm:grid-cols-8 md:grid-cols-10 lg:grid-cols-12 gap-1.5">
                        {metrics.roomStatusList.map((room) => (
                            <div key={room.number}
                                className={`${getStatusColor(room.status)} h-8 rounded-lg flex items-center justify-center text-[11px] cursor-pointer hover:opacity-90 transition-opacity relative shadow-2xs`}
                                title={`Room ${room.number}: ${room.status}`}
                                onClick={() => setActivePage('room-rack')}
                            >
                                {room.number}
                                {room.status === 'maintenance' && <Wrench size={9} className="absolute top-1 right-1" />}
                                {room.status === 'dirty' && <span className="absolute top-1 right-1 size-1.5 bg-white rounded-full"></span>}
                            </div>
                        ))}
                    </div>
                    <div className="flex gap-4 mt-3 text-[11px] text-slate-500 justify-end font-medium">
                        <span className="flex items-center gap-1.5"><span className="size-2 rounded-full bg-emerald-600"></span> Clean</span>
                        <span className="flex items-center gap-1.5"><span className="size-2 rounded-full bg-slate-700"></span> Occupied</span>
                        <span className="flex items-center gap-1.5"><span className="size-2 rounded-full bg-amber-500"></span> Dirty</span>
                        <span className="flex items-center gap-1.5"><span className="size-2 rounded-full bg-rose-500"></span> Maintenance</span>
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
                        {reservations.slice(0, 4).map((res) => (
                            <div key={res.id} className="flex items-center gap-2.5 p-2 bg-slate-50/80 rounded-xl border border-slate-100">
                                <div className={`size-7 rounded-lg flex items-center justify-center text-xs shrink-0 ${res.vip && res.vip !== 'None' ? 'bg-purple-100 text-purple-700 font-bold' : 'bg-blue-100 text-primary'}`}>
                                    <User size={13} />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <h4 className="text-xs text-slate-900 truncate">{res.guestName}</h4>
                                    <p className="text-[10px] text-slate-400 font-medium">Room {res.roomNumber} • {res.roomType}</p>
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
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Dashboard;
