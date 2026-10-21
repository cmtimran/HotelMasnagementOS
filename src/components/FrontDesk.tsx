import React, { useState, useMemo } from 'react';
import { 
    User, LogIn, LogOut, Search,
    DollarSign, Clock, CheckCircle2, XCircle, AlertCircle, Monitor,
    BedDouble, Key, Printer, Calendar,
    Plus, RefreshCw, CreditCard, Wallet, Check,
    AlertTriangle, Sparkles
} from 'lucide-react';
import { useNavigation } from '../context/NavigationContext';
import { evaluateEarlyCheckIn } from '../utils/policyEvaluator';
import { QuickReservationModal } from './modals/QuickReservationModal';
import PageHeader from './common/PageHeader';

export interface FrontDeskGuestRecord {
    id: string | number;
    reservationNumber: string;
    guestName: string;
    phone: string;
    email?: string;
    roomNumber: string;
    roomType: string;
    roomStatus?: 'clean' | 'dirty' | 'inspected';
    checkIn: string;
    checkOut: string;
    eta?: string;
    etd?: string;
    nights: number;
    adults: number;
    children: number;
    totalAmount: number;
    paidAmount: number;
    dueAmount: number;
    status: 'arriving' | 'in-house' | 'checked-out' | 'hold' | 'cancelled';
    source: string;
    vip?: string;
    keyCard?: string;
    specialRequests?: string;
    folioItems?: Array<{ id: number; desc: string; amount: number; time: string; type: string }>;
}

const DEFAULT_FRONT_DESK_DATA: FrontDeskGuestRecord[] = [
    {
        id: 'RES-892101',
        reservationNumber: 'RES-892101',
        guestName: 'Mahmudul Hasan',
        phone: '+880 1711-234567',
        email: 'mahmud.hasan@gmail.com',
        roomNumber: '102',
        roomType: 'Deluxe Double',
        roomStatus: 'clean',
        checkIn: '2026-07-01',
        checkOut: '2026-07-04',
        eta: '10:30',
        nights: 3,
        adults: 2,
        children: 1,
        totalAmount: 9000,
        paidAmount: 3000,
        dueAmount: 6000,
        status: 'arriving',
        source: 'Booking.com',
        vip: 'Gold VIP',
        specialRequests: 'High floor, quiet room, baby cot required',
        folioItems: [
            { id: 1, desc: 'Room Tariff (3 Nights)', amount: 9000, time: '2026-07-01 08:00', type: 'Room' },
            { id: 2, desc: 'Advance Deposit Received (Cash)', amount: -3000, time: '2026-07-01 08:05', type: 'Payment' }
        ]
    },
    {
        id: 'RES-892102',
        reservationNumber: 'RES-892102',
        guestName: 'Sara Islam',
        phone: '+880 1819-876543',
        email: 'sara.islam@corp.bd',
        roomNumber: '201',
        roomType: 'Superior King',
        roomStatus: 'inspected',
        checkIn: '2026-07-01',
        checkOut: '2026-07-03',
        eta: '11:15',
        nights: 2,
        adults: 1,
        children: 0,
        totalAmount: 8000,
        paidAmount: 8000,
        dueAmount: 0,
        status: 'arriving',
        source: 'Corporate (Grameenphone)',
        vip: 'Corporate Diamond',
        specialRequests: 'Late check-out request, airport pickup arranged',
        folioItems: [
            { id: 1, desc: 'Room Tariff (2 Nights)', amount: 8000, time: '2026-07-01 08:00', type: 'Room' },
            { id: 2, desc: 'Company Direct Billing (Full)', amount: -8000, time: '2026-07-01 08:10', type: 'Payment' }
        ]
    },
    {
        id: 'RES-892103',
        reservationNumber: 'RES-892103',
        guestName: 'Farhana Chowdhury',
        phone: '+880 1912-345678',
        email: 'farhana.c@gmail.com',
        roomNumber: '305',
        roomType: 'Deluxe Double',
        roomStatus: 'dirty',
        checkIn: '2026-07-01',
        checkOut: '2026-07-02',
        eta: '14:00',
        nights: 1,
        adults: 2,
        children: 0,
        totalAmount: 3500,
        paidAmount: 0,
        dueAmount: 3500,
        status: 'arriving',
        source: 'Direct Walk-In',
        vip: 'Regular',
        specialRequests: 'Non-smoking floor',
        folioItems: [
            { id: 1, desc: 'Room Tariff (1 Night)', amount: 3500, time: '2026-07-01 09:00', type: 'Room' }
        ]
    },
    {
        id: 'RES-892104',
        reservationNumber: 'RES-892104',
        guestName: 'Zubair Ahmed',
        phone: '+880 1611-987654',
        email: 'zubair.ahmed@fintech.com',
        roomNumber: '101',
        roomType: 'Deluxe Double',
        roomStatus: 'clean',
        checkIn: '2026-06-29',
        checkOut: '2026-07-02',
        eta: '12:00',
        nights: 3,
        adults: 2,
        children: 1,
        totalAmount: 10500,
        paidAmount: 10500,
        dueAmount: 0,
        status: 'in-house',
        source: 'Agoda',
        vip: 'VIP',
        keyCard: 'KC-101A',
        folioItems: [
            { id: 1, desc: 'Room Tariff (3 Nights)', amount: 9000, time: '2026-06-29 14:00', type: 'Room' },
            { id: 2, desc: 'Mini Bar Consumption', amount: 1500, time: '2026-06-30 20:30', type: 'Charge' },
            { id: 3, desc: 'Settled via Credit Card', amount: -10500, time: '2026-06-29 14:10', type: 'Payment' }
        ]
    },
    {
        id: 'RES-892105',
        reservationNumber: 'RES-892105',
        guestName: 'Mim Akter',
        phone: '+880 1733-456789',
        email: 'mim.akter@dhaka.edu',
        roomNumber: '410',
        roomType: 'Executive Suite',
        roomStatus: 'clean',
        checkIn: '2026-06-28',
        checkOut: '2026-07-01',
        etd: '11:30',
        nights: 3,
        adults: 2,
        children: 2,
        totalAmount: 16500,
        paidAmount: 12000,
        dueAmount: 4500,
        status: 'in-house',
        source: 'Corporate',
        vip: 'Platinum VIP',
        keyCard: 'KC-410A',
        folioItems: [
            { id: 1, desc: 'Suite Tariff (3 Nights)', amount: 15000, time: '2026-06-28 15:00', type: 'Room' },
            { id: 2, desc: 'Laundry Express Service', amount: 1500, time: '2026-06-30 11:00', type: 'Charge' },
            { id: 3, desc: 'Advance Cash Paid', amount: -12000, time: '2026-06-28 15:15', type: 'Payment' }
        ]
    },
    {
        id: 'RES-892106',
        reservationNumber: 'RES-892106',
        guestName: 'Tanvir Hossain',
        phone: '+880 1552-678901',
        email: 'tanvir.h@bdmail.com',
        roomNumber: '302',
        roomType: 'Standard Single',
        roomStatus: 'clean',
        checkIn: '2026-06-30',
        checkOut: '2026-07-01',
        etd: '12:00',
        nights: 1,
        adults: 1,
        children: 0,
        totalAmount: 2800,
        paidAmount: 2800,
        dueAmount: 0,
        status: 'checked-out',
        source: 'Walk-In',
        vip: 'Regular',
        keyCard: 'Returned',
        folioItems: [
            { id: 1, desc: 'Single Room (1 Night)', amount: 2800, time: '2026-06-30 18:00', type: 'Room' },
            { id: 2, desc: 'Settled via bKash', amount: -2800, time: '2026-07-01 10:15', type: 'Payment' }
        ]
    }
];

export const FrontDesk: React.FC = () => {
    const { setActivePage } = useNavigation();

    // Data State (synced with localStorage)
    const [reservations, setReservations] = useState<FrontDeskGuestRecord[]>(() => {
        try {
            const stored = localStorage.getItem('hotel_reservations_v2');
            if (stored) {
                const parsed = JSON.parse(stored);
                if (Array.isArray(parsed) && parsed.length > 0) {
                    // Merge parsed stored reservations with default front desk records
                    const merged = [...DEFAULT_FRONT_DESK_DATA];
                    parsed.forEach(item => {
                        if (!merged.some(m => m.reservationNumber === item.reservationNumber)) {
                            merged.unshift({
                                id: item.id || `RES-${item.reservationNumber || Date.now()}`,
                                reservationNumber: item.reservationNumber || `RES-${Date.now()}`,
                                guestName: item.guestName || 'Valued Guest',
                                phone: item.phone || '+880 1711-000000',
                                email: item.email || '',
                                roomNumber: item.roomNumber || '101',
                                roomType: item.roomType || 'Deluxe Double',
                                roomStatus: 'clean',
                                checkIn: item.checkIn || '2026-07-01',
                                checkOut: item.checkOut || '2026-07-02',
                                eta: '12:00',
                                nights: item.nights || 1,
                                adults: item.adults || 1,
                                children: item.children || 0,
                                totalAmount: Number(item.totalAmount) || 3000,
                                paidAmount: Number(item.paidAmount) || 0,
                                dueAmount: Number(item.dueAmount) || Number(item.totalAmount) || 3000,
                                status: item.status || 'arriving',
                                source: item.source || 'Direct',
                                vip: item.vip || 'None',
                                specialRequests: item.specialRequests || ''
                            });
                        }
                    });
                    return merged;
                }
            }
        } catch (e) {
            console.error('Error reading hotel reservations', e);
        }
        return DEFAULT_FRONT_DESK_DATA;
    });

    // Save back to localStorage whenever reservations change
    const persistReservations = (updated: FrontDeskGuestRecord[]) => {
        setReservations(updated);
        try {
            localStorage.setItem('hotel_reservations_v2', JSON.stringify(updated));
        } catch (e) {
            console.error('Failed to sync to local storage', e);
        }
    };

    // Tabs & Filters
    const [activeTab, setActiveTab] = useState<'arrivals' | 'in-house' | 'departures' | 'cashier'>('arrivals');
    const [searchTerm, setSearchTerm] = useState('');
    const [filterSource, setFilterSource] = useState('all');
    const [filterPayment, setFilterPayment] = useState('all');

    // Modals & Panels
    const [isQuickReserveOpen, setIsQuickReserveOpen] = useState(false);
    const [checkInModalRecord, setCheckInModalRecord] = useState<FrontDeskGuestRecord | null>(null);
    const [checkOutModalRecord, setCheckOutModalRecord] = useState<FrontDeskGuestRecord | null>(null);
    const [regCardRecord, setRegCardRecord] = useState<FrontDeskGuestRecord | null>(null);
    const [folioModalRecord, setFolioModalRecord] = useState<FrontDeskGuestRecord | null>(null);

    // Interactive Check-In Fields
    const [checkInKeyCard, setCheckInKeyCard] = useState('');
    const [checkInDepositAmount, setCheckInDepositAmount] = useState<number>(0);
    const [checkInDepositMethod, setCheckInDepositMethod] = useState<'Cash' | 'Card' | 'bKash' | 'None'>('Cash');
    const [overrideEarlyFee, setOverrideEarlyFee] = useState(false);

    // Folio Post Charge Fields
    const [chargeDesc, setChargeDesc] = useState('');
    const [chargeAmount, setChargeAmount] = useState<number>(0);
    const [chargeType, setChargeType] = useState('Restaurant & Dining');

    // Security & Audit Log
    const [actionLog, setActionLog] = useState<string[]>([
        `[SYS] Morning shift initialized by Front Desk Cashier.`,
        `[AUDIT] Room 102 inspection confirmed clean by Housekeeping.`,
        `[FIN] Float verified at BDT 15,000.00 cash drawer balance.`
    ]);

    // System Date
    const systemDate = localStorage.getItem('hotel_system_date') || '01 Jul 2026';

    // Counts & KPIs
    const arrivalsList = useMemo(() => reservations.filter(r => r.status === 'arriving'), [reservations]);
    const inHouseList = useMemo(() => reservations.filter(r => r.status === 'in-house'), [reservations]);
    const departuresList = useMemo(() => reservations.filter(r => r.status === 'in-house' && r.checkOut <= '2026-07-01'), [reservations]);
    const checkedOutToday = useMemo(() => reservations.filter(r => r.status === 'checked-out'), [reservations]);

    const totalOccupied = inHouseList.length;
    const totalCapacity = 48;
    const occupancyRate = Math.round((totalOccupied / totalCapacity) * 100);

    const totalCollectionsToday = useMemo(() => {
        return reservations.reduce((acc, r) => acc + (Number(r.paidAmount) || 0), 0);
    }, [reservations]);

    // Active Display List based on current tab and search filters
    const currentTabList = useMemo(() => {
        let base: FrontDeskGuestRecord[] = [];
        if (activeTab === 'arrivals') base = arrivalsList;
        else if (activeTab === 'in-house') base = inHouseList;
        else if (activeTab === 'departures') {
            // Include due departures or already checked out today
            base = reservations.filter(r => r.status === 'checked-out' || (r.status === 'in-house' && r.checkOut <= '2026-07-01'));
        }

        return base.filter(r => {
            const matchesSearch = 
                r.guestName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                r.roomNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
                r.reservationNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
                r.phone.includes(searchTerm);
            
            const matchesSource = filterSource === 'all' || r.source.toLowerCase().includes(filterSource.toLowerCase());
            
            const matchesPayment = 
                filterPayment === 'all' ||
                (filterPayment === 'due' && r.dueAmount > 0) ||
                (filterPayment === 'settled' && r.dueAmount <= 0);

            return matchesSearch && matchesSource && matchesPayment;
        });
    }, [activeTab, arrivalsList, inHouseList, departuresList, reservations, searchTerm, filterSource, filterPayment]);

    // Handlers
    const handleOpenCheckInModal = (record: FrontDeskGuestRecord) => {
        setCheckInModalRecord(record);
        setCheckInKeyCard(`KC-${record.roomNumber}`);
        setCheckInDepositAmount(record.dueAmount > 0 ? record.dueAmount : 0);
        setCheckInDepositMethod(record.dueAmount > 0 ? 'Cash' : 'None');
        setOverrideEarlyFee(false);
    };

    const handleConfirmCheckIn = () => {
        if (!checkInModalRecord) return;

        const earlyPolicy = evaluateEarlyCheckIn(checkInModalRecord.eta || '12:00');
        const earlyFeeBDT = overrideEarlyFee ? 0 : (earlyPolicy.charge * 100);

        const updated = reservations.map(r => {
            if (r.id === checkInModalRecord.id) {
                const newTotal = r.totalAmount + earlyFeeBDT;
                const newPaid = r.paidAmount + (checkInDepositMethod !== 'None' ? checkInDepositAmount : 0);
                const newDue = Math.max(0, newTotal - newPaid);

                const newFolio = [...(r.folioItems || [])];
                if (earlyFeeBDT > 0) {
                    newFolio.push({
                        id: Date.now() + 1,
                        desc: `Early Check-in Surcharge (${earlyPolicy.label})`,
                        amount: earlyFeeBDT,
                        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                        type: 'Surcharge'
                    });
                }
                if (checkInDepositMethod !== 'None' && checkInDepositAmount > 0) {
                    newFolio.push({
                        id: Date.now() + 2,
                        desc: `Advance Payment (${checkInDepositMethod}) at Check-In`,
                        amount: -checkInDepositAmount,
                        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                        type: 'Payment'
                    });
                }

                return {
                    ...r,
                    status: 'in-house' as const,
                    keyCard: checkInKeyCard || `KC-${r.roomNumber}`,
                    totalAmount: newTotal,
                    paidAmount: newPaid,
                    dueAmount: newDue,
                    folioItems: newFolio
                };
            }
            return r;
        });

        persistReservations(updated);
        setActionLog(prev => [
            `[IN-HOUSE] Guest ${checkInModalRecord.guestName} successfully checked into Room ${checkInModalRecord.roomNumber}. KeyCard: ${checkInKeyCard}.`,
            ...prev
        ]);
        setCheckInModalRecord(null);
    };

    const handleOpenCheckOutModal = (record: FrontDeskGuestRecord) => {
        setCheckOutModalRecord(record);
    };

    const handleConfirmCheckOut = (paymentMethod: 'Cash' | 'Card' | 'bKash') => {
        if (!checkOutModalRecord) return;

        const updated = reservations.map(r => {
            if (r.id === checkOutModalRecord.id) {
                return {
                    ...r,
                    status: 'checked-out' as const,
                    paidAmount: r.totalAmount,
                    dueAmount: 0,
                    keyCard: 'Returned & Deactivated'
                };
            }
            return r;
        });

        persistReservations(updated);
        setActionLog(prev => [
            `[CHECK-OUT] Room ${checkOutModalRecord.roomNumber} vacated by ${checkOutModalRecord.guestName}. Balance of BDT ${checkOutModalRecord.dueAmount} settled via ${paymentMethod}. Room flagged DIRTY for housekeeping.`,
            ...prev
        ]);
        setCheckOutModalRecord(null);
    };

    const handlePostCharge = () => {
        if (!folioModalRecord || chargeAmount <= 0 || !chargeDesc.trim()) return;

        const updated = reservations.map(r => {
            if (r.id === folioModalRecord.id) {
                const newTotal = r.totalAmount + chargeAmount;
                const newDue = r.dueAmount + chargeAmount;
                const newFolio = [
                    ...(r.folioItems || []),
                    {
                        id: Date.now(),
                        desc: `${chargeType}: ${chargeDesc}`,
                        amount: chargeAmount,
                        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                        type: chargeType
                    }
                ];
                return {
                    ...r,
                    totalAmount: newTotal,
                    dueAmount: newDue,
                    folioItems: newFolio
                };
            }
            return r;
        });

        persistReservations(updated);
        setActionLog(prev => [
            `[FOLIO] Posted BDT ${chargeAmount} (${chargeDesc}) to Room ${folioModalRecord.roomNumber} folio.`,
            ...prev
        ]);
        setFolioModalRecord(null);
        setChargeDesc('');
        setChargeAmount(0);
    };

    return (
        <div className="p-3 sm:p-4 max-w-[1400px] mx-auto space-y-3 font-sans select-none animate-in fade-in duration-150">
            {/* Standardized Thesis Page Header */}
            <PageHeader
                title="Front Desk Operations Hub"
                subtitle={
                    <div className="flex flex-wrap items-center gap-2.5 text-xs text-slate-500 font-medium">
                        <span className="flex items-center gap-1 font-semibold text-slate-700">
                            <Calendar size={12} className="text-primary" /> System Date: <strong>{systemDate}</strong>
                        </span>
                        <span>•</span>
                        <span className="flex items-center gap-1">
                            <Clock size={12} className="text-amber-600" /> Morning Shift (07:00 - 15:00)
                        </span>
                        <span>•</span>
                        <span className="text-primary font-semibold">Cashier Drawer #1</span>
                    </div>
                }
                icon={<Monitor size={22} />}
                badge={
                    <span className="badge-status-active">
                        <span className="size-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                        Live Desk Active
                    </span>
                }
                actions={
                    <>
                        <button
                            type="button"
                            onClick={() => setIsQuickReserveOpen(true)}
                            className="btn-primary"
                        >
                            <Plus size={14} className="stroke-[2.5]" />
                            <span>Walk-In Booking</span>
                        </button>

                        <button
                            type="button"
                            onClick={() => setActivePage('add-reservation')}
                            className="btn-secondary text-primary font-semibold border-primary/30 hover:bg-primary-subtle"
                        >
                            <Calendar size={13} className="text-primary" />
                            <span>Add Reservation</span>
                        </button>

                        <button
                            type="button"
                            onClick={() => setActivePage('room-rack')}
                            className="btn-secondary"
                            title="Open Interactive Room Rack Grid"
                        >
                            <BedDouble size={13} className="text-slate-500" />
                            <span>Room Rack</span>
                        </button>

                        <button
                            type="button"
                            onClick={() => setActivePage('stay-view')}
                            className="btn-secondary"
                            title="Open Stay View Tape Chart"
                        >
                            <Calendar size={13} className="text-slate-500" />
                            <span>Stay View</span>
                        </button>
                    </>
                }
            />

            {/* Real-Time Front Office Operational Metric Tiles */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
                {/* 1. Occupancy */}
                <div className="bg-white p-3 rounded-xl border border-slate-200/90 shadow-2xs">
                    <div className="flex items-center justify-between text-slate-500">
                        <span className="text-[10px] font-bold uppercase tracking-wider">Occupancy</span>
                        <BedDouble size={13} className="text-blue-600" />
                    </div>
                    <div className="mt-1 flex items-baseline gap-1.5">
                        <span className="text-xl font-black text-slate-900 font-mono">{occupancyRate}%</span>
                        <span className="text-[10.5px] text-slate-500 font-medium">({totalOccupied}/{totalCapacity})</span>
                    </div>
                    <div className="w-full bg-slate-100 rounded-full h-1.5 mt-2 overflow-hidden">
                        <div className="bg-blue-600 h-1.5 rounded-full" style={{ width: `${occupancyRate}%` }}></div>
                    </div>
                </div>

                {/* 2. Arrivals Due */}
                <div 
                    onClick={() => setActiveTab('arrivals')}
                    className={`bg-white p-3 rounded-xl border transition-all cursor-pointer shadow-2xs ${
                        activeTab === 'arrivals' ? 'border-blue-500 ring-2 ring-blue-500/20 bg-blue-50/20' : 'border-slate-200/90 hover:border-slate-300'
                    }`}
                >
                    <div className="flex items-center justify-between text-blue-700">
                        <span className="text-[10px] font-bold uppercase tracking-wider">Arrivals (Due)</span>
                        <LogIn size={13} className="text-blue-600" />
                    </div>
                    <div className="mt-1 flex items-baseline gap-1.5">
                        <span className="text-xl font-black text-blue-900 font-mono">{arrivalsList.length}</span>
                        <span className="text-[10.5px] text-blue-600 font-bold">Pending In</span>
                    </div>
                    <p className="text-[10px] text-slate-500 mt-1.5">Click to view arrival queue</p>
                </div>

                {/* 3. In-House Guests */}
                <div 
                    onClick={() => setActiveTab('in-house')}
                    className={`bg-white p-3 rounded-xl border transition-all cursor-pointer shadow-2xs ${
                        activeTab === 'in-house' ? 'border-emerald-500 ring-2 ring-emerald-500/20 bg-emerald-50/20' : 'border-slate-200/90 hover:border-slate-300'
                    }`}
                >
                    <div className="flex items-center justify-between text-emerald-700">
                        <span className="text-[10px] font-bold uppercase tracking-wider">In-House Guests</span>
                        <User size={13} className="text-emerald-600" />
                    </div>
                    <div className="mt-1 flex items-baseline gap-1.5">
                        <span className="text-xl font-black text-emerald-900 font-mono">{inHouseList.length}</span>
                        <span className="text-[10.5px] text-emerald-600 font-bold">Active Stays</span>
                    </div>
                    <p className="text-[10px] text-slate-500 mt-1.5">Manage folios &amp; room moves</p>
                </div>

                {/* 4. Departures Due */}
                <div 
                    onClick={() => setActiveTab('departures')}
                    className={`bg-white p-3 rounded-xl border transition-all cursor-pointer shadow-2xs ${
                        activeTab === 'departures' ? 'border-amber-500 ring-2 ring-amber-500/20 bg-amber-50/20' : 'border-slate-200/90 hover:border-slate-300'
                    }`}
                >
                    <div className="flex items-center justify-between text-amber-700">
                        <span className="text-[10px] font-bold uppercase tracking-wider">Departures (Due)</span>
                        <LogOut size={13} className="text-amber-600" />
                    </div>
                    <div className="mt-1 flex items-baseline gap-1.5">
                        <span className="text-xl font-black text-amber-900 font-mono">{departuresList.length}</span>
                        <span className="text-[10.5px] text-amber-700 font-bold">Due Out Today</span>
                    </div>
                    <p className="text-[10px] text-slate-500 mt-1.5">{checkedOutToday.length} completed checkout</p>
                </div>

                {/* 5. Clean Rooms Ready */}
                <div className="bg-white p-3 rounded-xl border border-slate-200/90 shadow-2xs">
                    <div className="flex items-center justify-between text-emerald-700">
                        <span className="text-[10px] font-bold uppercase tracking-wider">Clean &amp; Ready</span>
                        <Sparkles size={13} className="text-emerald-600" />
                    </div>
                    <div className="mt-1 flex items-baseline gap-1.5">
                        <span className="text-xl font-black text-emerald-800 font-mono">18</span>
                        <span className="text-[10.5px] text-emerald-600 font-semibold">Vacant Ready</span>
                    </div>
                    <p className="text-[10px] text-slate-500 mt-1.5">4 rooms in housekeeping</p>
                </div>

                {/* 6. Today's Collections */}
                <div className="bg-white p-3 rounded-xl border border-slate-200/90 shadow-2xs">
                    <div className="flex items-center justify-between text-slate-500">
                        <span className="text-[10px] font-bold uppercase tracking-wider">Shift Collections</span>
                        <Wallet size={13} className="text-primary" />
                    </div>
                    <div className="mt-1 flex items-baseline gap-1">
                        <span className="text-[11px] font-bold text-slate-400">BDT</span>
                        <span className="text-lg font-black font-mono tracking-tight text-slate-900">{totalCollectionsToday.toLocaleString()}</span>
                    </div>
                    <p className="text-[10px] text-slate-500 mt-1.5 font-medium">Cash: ৳15k • Card: ৳18k</p>
                </div>
            </div>

            {/* Main Operational Workflow Tabs & Search Filter Header */}
            <div className="bg-white rounded-xl border border-slate-200/90 shadow-2xs overflow-hidden">
                {/* Tabs Row */}
                <div className="bg-slate-50/80 border-b border-slate-200 px-3 py-2 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                    <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none">
                        <button
                            type="button"
                            onClick={() => setActiveTab('arrivals')}
                            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
                                activeTab === 'arrivals'
                                    ? 'bg-primary text-white shadow-xs'
                                    : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-100'
                            }`}
                        >
                            <LogIn size={13} />
                            <span>1. Arrivals / Due-In</span>
                            <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono ${
                                activeTab === 'arrivals' ? 'bg-primary-hover text-white' : 'bg-slate-100 text-slate-600'
                            }`}>
                                {arrivalsList.length}
                            </span>
                        </button>

                        <button
                            type="button"
                            onClick={() => setActiveTab('in-house')}
                            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
                                activeTab === 'in-house'
                                    ? 'bg-primary text-white shadow-xs'
                                    : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-100'
                            }`}
                        >
                            <User size={13} />
                            <span>2. In-House Guests</span>
                            <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono ${
                                activeTab === 'in-house' ? 'bg-primary-hover text-white' : 'bg-slate-100 text-slate-600'
                            }`}>
                                {inHouseList.length}
                            </span>
                        </button>

                        <button
                            type="button"
                            onClick={() => setActiveTab('departures')}
                            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
                                activeTab === 'departures'
                                    ? 'bg-primary text-white shadow-xs'
                                    : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-100'
                            }`}
                        >
                            <LogOut size={13} />
                            <span>3. Departures / Due-Out</span>
                            <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono ${
                                activeTab === 'departures' ? 'bg-primary-hover text-white' : 'bg-slate-100 text-slate-600'
                            }`}>
                                {departuresList.length}
                            </span>
                        </button>

                        <button
                            type="button"
                            onClick={() => setActiveTab('cashier')}
                            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
                                activeTab === 'cashier'
                                    ? 'bg-primary text-white shadow-xs'
                                    : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-100'
                            }`}
                        >
                            <Wallet size={13} />
                            <span>4. Shift Cashier &amp; Float</span>
                        </button>
                    </div>

                    <div className="flex items-center gap-2">
                        <span className="text-[11px] text-slate-500 font-medium hidden md:inline">
                            Showing <strong className="text-slate-800">{currentTabList.length}</strong> records
                        </span>
                        <button
                            type="button"
                            onClick={() => {
                                const stored = localStorage.getItem('hotel_reservations_v2');
                                if (stored) setReservations(JSON.parse(stored));
                            }}
                            className="p-1.5 rounded-lg text-slate-500 hover:text-blue-700 hover:bg-slate-200/60 transition-colors cursor-pointer"
                            title="Refresh Data"
                        >
                            <RefreshCw size={13} />
                        </button>
                    </div>
                </div>

                {/* Filter & Search Bar */}
                {activeTab !== 'cashier' && (
                    <div className="p-2.5 sm:p-3 bg-white border-b border-slate-100 flex flex-col md:flex-row items-center justify-between gap-2.5">
                        <div className="relative w-full md:w-80">
                            <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                            <input
                                type="text"
                                placeholder="Search by guest name, room, phone, RES #..."
                                value={searchTerm}
                                onChange={e => setSearchTerm(e.target.value)}
                                className="w-full h-8 pl-8 pr-3 bg-slate-50/60 border border-slate-200 rounded-lg text-xs text-slate-800 placeholder-slate-400 outline-none focus:bg-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500/20 transition-all font-medium"
                            />
                        </div>

                        <div className="flex items-center gap-2 w-full md:w-auto">
                            <div className="flex items-center gap-1.5">
                                <span className="text-[10px] font-bold text-slate-400 uppercase">Source:</span>
                                <select
                                    value={filterSource}
                                    onChange={e => setFilterSource(e.target.value)}
                                    className="h-8 px-2 bg-white border border-slate-200 rounded-lg text-xs font-semibold text-slate-700 outline-none cursor-pointer focus:border-blue-500"
                                >
                                    <option value="all">All Sources</option>
                                    <option value="direct">Direct / Walk-In</option>
                                    <option value="booking">Booking.com</option>
                                    <option value="agoda">Agoda</option>
                                    <option value="corporate">Corporate</option>
                                </select>
                            </div>

                            <div className="flex items-center gap-1.5">
                                <span className="text-[10px] font-bold text-slate-400 uppercase">Billing:</span>
                                <select
                                    value={filterPayment}
                                    onChange={e => setFilterPayment(e.target.value)}
                                    className="h-8 px-2 bg-white border border-slate-200 rounded-lg text-xs font-semibold text-slate-700 outline-none cursor-pointer focus:border-blue-500"
                                >
                                    <option value="all">All Payments</option>
                                    <option value="due">Has Balance Due</option>
                                    <option value="settled">Fully Settled</option>
                                </select>
                            </div>
                        </div>
                    </div>
                )}

                {/* Main Tab Content View */}
                {activeTab !== 'cashier' ? (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse text-xs">
                            <thead>
                                <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold text-[10px] uppercase tracking-wider">
                                    <th className="py-2.5 px-3.5">Guest &amp; Reference</th>
                                    <th className="py-2.5 px-3">Room &amp; Status</th>
                                    <th className="py-2.5 px-3">Stay Period</th>
                                    <th className="py-2.5 px-2.5 text-center">Pax</th>
                                    <th className="py-2.5 px-3">Source &amp; VIP</th>
                                    <th className="py-2.5 px-3 text-right">Tariff / Balance</th>
                                    <th className="py-2.5 px-3.5 text-right">Front Desk Action</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {currentTabList.length > 0 ? (
                                    currentTabList.map(item => {
                                        const earlyEval = evaluateEarlyCheckIn(item.eta || '12:00');
                                        const isDueDeparture = item.checkOut <= '2026-07-01' && item.status === 'in-house';
                                        const isCheckedOut = item.status === 'checked-out';

                                        return (
                                            <tr key={item.id} className="hover:bg-blue-50/20 transition-colors">
                                                {/* Guest & Reference */}
                                                <td className="py-2.5 px-3.5">
                                                    <div className="flex items-center gap-2.5">
                                                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-xs flex-shrink-0 ${
                                                            item.status === 'in-house' 
                                                                ? 'bg-emerald-100 text-emerald-800 border border-emerald-200' 
                                                                : isCheckedOut 
                                                                    ? 'bg-slate-100 text-slate-600'
                                                                    : 'bg-blue-100 text-blue-800 border border-blue-200'
                                                        }`}>
                                                            {item.guestName.charAt(0)}
                                                        </div>
                                                        <div>
                                                            <div className="flex items-center gap-1.5">
                                                                <span className="font-bold text-slate-900">{item.guestName}</span>
                                                                {item.vip && item.vip !== 'None' && item.vip !== 'Regular' && (
                                                                    <span className="px-1.5 py-0.2 rounded text-[9px] font-black bg-amber-100 text-amber-800 border border-amber-300">
                                                                        {item.vip}
                                                                    </span>
                                                                )}
                                                            </div>
                                                            <div className="flex items-center gap-2 text-[10.5px] text-slate-500 mt-0.5">
                                                                <span className="font-mono text-blue-700 font-semibold">{item.reservationNumber}</span>
                                                                <span>•</span>
                                                                <span>{item.phone}</span>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </td>

                                                {/* Room & Status */}
                                                <td className="py-2.5 px-3">
                                                    <div className="flex items-center gap-2">
                                                        <div className="w-10 h-7 rounded border border-blue-200 bg-blue-50 text-blue-900 font-mono font-bold flex items-center justify-center text-xs">
                                                            {item.roomNumber}
                                                        </div>
                                                        <div>
                                                            <div className="font-semibold text-slate-800 text-[11px] leading-tight">
                                                                {item.roomType}
                                                            </div>
                                                            <div className="text-[10px] text-slate-500 mt-0.5 flex items-center gap-1">
                                                                {item.roomStatus === 'clean' && (
                                                                    <span className="text-emerald-700 font-bold flex items-center gap-0.5">
                                                                        <Sparkles size={9} /> Clean &amp; Ready
                                                                    </span>
                                                                )}
                                                                {item.roomStatus === 'inspected' && (
                                                                    <span className="text-blue-700 font-bold flex items-center gap-0.5">
                                                                        <CheckCircle2 size={9} /> Inspected
                                                                    </span>
                                                                )}
                                                                {item.roomStatus === 'dirty' && (
                                                                    <span className="text-rose-600 font-bold flex items-center gap-0.5">
                                                                        <AlertCircle size={9} /> Turnover Dirty
                                                                    </span>
                                                                )}
                                                                {item.keyCard && (
                                                                    <span className="text-slate-400 font-mono">({item.keyCard})</span>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </div>
                                                </td>

                                                {/* Stay Period */}
                                                <td className="py-2.5 px-3">
                                                    <div className="text-[11px] font-medium text-slate-800 leading-tight">
                                                        <span>{item.checkIn}</span> ➔ <span>{item.checkOut}</span>
                                                    </div>
                                                    <div className="text-[10px] text-slate-500 mt-0.5 flex items-center gap-1.5">
                                                        <span className="font-bold text-blue-700">{item.nights} Night{item.nights > 1 ? 's' : ''}</span>
                                                        {item.eta && (
                                                            <span>• ETA: <strong className="text-slate-700">{item.eta}</strong></span>
                                                        )}
                                                        {earlyEval.charge > 0 && item.status === 'arriving' && (
                                                            <span className="px-1 py-0.2 rounded bg-amber-50 text-amber-800 font-bold text-[9px] border border-amber-200">
                                                                Early In
                                                            </span>
                                                        )}
                                                    </div>
                                                </td>

                                                {/* Pax */}
                                                <td className="py-2.5 px-2.5 text-center">
                                                    <span className="font-bold text-slate-700 text-xs">
                                                        {item.adults}A {item.children > 0 ? `+ ${item.children}C` : ''}
                                                    </span>
                                                </td>

                                                {/* Source */}
                                                <td className="py-2.5 px-3">
                                                    <span className="text-[11px] font-semibold text-slate-700 block">
                                                        {item.source}
                                                    </span>
                                                    <span className="text-[9.5px] text-slate-400 truncate max-w-[120px] block">
                                                        {item.specialRequests || 'No special notes'}
                                                    </span>
                                                </td>

                                                {/* Tariff & Balance */}
                                                <td className="py-2.5 px-3 text-right">
                                                    <div className="font-mono font-bold text-slate-900 text-xs">
                                                        ৳{item.totalAmount.toLocaleString()}
                                                    </div>
                                                    <div className="mt-0.5">
                                                        {item.dueAmount > 0 ? (
                                                            <span className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
                                                                Due: ৳{item.dueAmount.toLocaleString()}
                                                            </span>
                                                        ) : (
                                                            <span className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                                                Settled
                                                            </span>
                                                        )}
                                                    </div>
                                                </td>

                                                {/* Actions */}
                                                <td className="py-2.5 px-3.5 text-right">
                                                    <div className="flex items-center justify-end gap-1.5">
                                                        {item.status === 'arriving' && (
                                                            <button
                                                                type="button"
                                                                onClick={() => handleOpenCheckInModal(item)}
                                                                className="h-7 px-3 bg-primary hover:bg-primary-hover text-white font-bold rounded-lg text-xs flex items-center gap-1 cursor-pointer transition-colors shadow-2xs"
                                                            >
                                                                <LogIn size={11} className="stroke-[2.5]" />
                                                                <span>Check In</span>
                                                            </button>
                                                        )}

                                                        {item.status === 'in-house' && (
                                                            <>
                                                                <button
                                                                    type="button"
                                                                    onClick={() => setFolioModalRecord(item)}
                                                                    className="h-7 px-2.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 font-semibold rounded-lg text-xs flex items-center gap-1 cursor-pointer transition-colors shadow-2xs"
                                                                    title="Add Restaurant / Laundry charge to Folio"
                                                                >
                                                                    <Plus size={11} className="text-blue-600" />
                                                                    <span>Charge</span>
                                                                </button>

                                                                <button
                                                                    type="button"
                                                                    onClick={() => handleOpenCheckOutModal(item)}
                                                                    className={`h-7 px-3 font-bold rounded-lg text-xs flex items-center gap-1 cursor-pointer transition-colors shadow-2xs ${
                                                                        isDueDeparture
                                                                            ? 'bg-amber-600 hover:bg-amber-700 text-white'
                                                                            : 'bg-white border border-slate-300 hover:bg-slate-100 text-slate-800'
                                                                    }`}
                                                                >
                                                                    <LogOut size={11} className="stroke-[2.5]" />
                                                                    <span>Check Out</span>
                                                                </button>
                                                            </>
                                                        )}

                                                        {item.status === 'checked-out' && (
                                                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-600 border border-slate-200">
                                                                Departed
                                                            </span>
                                                        )}

                                                        {/* Registration Card Print Button */}
                                                        <button
                                                            type="button"
                                                            onClick={() => setRegCardRecord(item)}
                                                            className="p-1.5 text-slate-400 hover:text-blue-700 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                                                            title="Print Registration Card"
                                                        >
                                                            <Printer size={13} />
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    })
                                ) : (
                                    <tr>
                                        <td colSpan={7} className="py-10 text-center text-slate-400">
                                            <div className="flex flex-col items-center justify-center gap-1.5">
                                                <BedDouble size={24} className="text-slate-300" />
                                                <p className="text-xs font-bold text-slate-600">No records found matching criteria</p>
                                                <p className="text-[11px] text-slate-400">Try adjusting your search query or tab selection</p>
                                            </div>
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                ) : (
                    /* Cashier Shift Tab */
                    <div className="p-4 space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                            <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 space-y-2">
                                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Opening Float</span>
                                <div className="text-xl font-black text-slate-900 font-mono">BDT 15,000.00</div>
                                <p className="text-xs text-slate-500">Verified by Front Desk Cashier at 07:00 AM</p>
                            </div>

                            <div className="bg-emerald-50/60 border border-emerald-200 rounded-xl p-3.5 space-y-2">
                                <span className="text-[10px] font-bold text-emerald-700 uppercase tracking-wider block">Collections Received</span>
                                <div className="text-xl font-black text-emerald-900 font-mono">BDT {totalCollectionsToday.toLocaleString()}.00</div>
                                <p className="text-xs text-emerald-700">Cash: BDT 42,000 • Card: BDT 76,500 • bKash: BDT 30,000</p>
                            </div>

                            <div className="bg-blue-50/60 border border-blue-200 rounded-xl p-3.5 space-y-2">
                                <span className="text-[10px] font-bold text-blue-700 uppercase tracking-wider block">Current Drawer Total</span>
                                <div className="text-xl font-black text-blue-900 font-mono">BDT {(15000 + totalCollectionsToday).toLocaleString()}.00</div>
                                <p className="text-xs text-blue-700">Audit in balance • Zero float variance</p>
                            </div>
                        </div>

                        {/* Recent Cashier Events */}
                        <div className="border border-slate-200 rounded-xl p-3 bg-white space-y-2">
                            <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">Session Audit Trail</h3>
                            <div className="space-y-1.5 max-h-48 overflow-y-auto">
                                {actionLog.map((log, i) => (
                                    <div key={i} className="text-xs flex items-start gap-2 text-slate-600">
                                        <div className="w-1.5 h-1.5 rounded-full bg-blue-600 mt-1.5 flex-shrink-0"></div>
                                        <span>{log}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Quick Reservation Express Modal */}
            <QuickReservationModal
                isOpen={isQuickReserveOpen}
                onClose={() => {
                    setIsQuickReserveOpen(false);
                    const stored = localStorage.getItem('hotel_reservations_v2');
                    if (stored) setReservations(JSON.parse(stored));
                }}
            />

            {/* Interactive Check-In Modal Terminal */}
            {checkInModalRecord && (
                <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-3 animate-in fade-in duration-150">
                    <div className="bg-white rounded-xl shadow-2xl border border-slate-200 max-w-[500px] w-full p-4 space-y-3.5 animate-in zoom-in-95 duration-150">
                        <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                            <div className="flex items-center gap-2">
                                <div className="w-8 h-8 rounded-lg bg-primary text-white flex items-center justify-center font-bold">
                                    <LogIn size={15} />
                                </div>
                                <div>
                                    <h3 className="text-sm font-bold text-slate-900">Check-In Registration</h3>
                                    <p className="text-[11px] text-slate-500 font-mono">{checkInModalRecord.reservationNumber}</p>
                                </div>
                            </div>
                            <button
                                type="button"
                                onClick={() => setCheckInModalRecord(null)}
                                className="p-1 text-slate-400 hover:text-slate-700 rounded-lg cursor-pointer"
                            >
                                <XCircle size={18} />
                            </button>
                        </div>

                        {/* Guest Summary Card */}
                        <div className="bg-slate-50 rounded-lg p-3 border border-slate-200/80 space-y-1.5 text-xs">
                            <div className="flex justify-between">
                                <span className="text-slate-500">Guest Name:</span>
                                <strong className="text-slate-900 font-bold">{checkInModalRecord.guestName}</strong>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-slate-500">Allocated Room:</span>
                                <strong className="text-blue-700 font-mono font-bold">
                                    Room {checkInModalRecord.roomNumber} ({checkInModalRecord.roomType})
                                </strong>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-slate-500">Stay Duration:</span>
                                <span className="font-medium text-slate-800">
                                    {checkInModalRecord.checkIn} to {checkInModalRecord.checkOut} ({checkInModalRecord.nights}N)
                                </span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-slate-500">Outstanding Balance:</span>
                                <strong className="text-rose-700 font-mono font-bold">
                                    BDT {checkInModalRecord.dueAmount.toLocaleString()}
                                </strong>
                            </div>
                        </div>

                        {/* Early Check-In Evaluation */}
                        {(() => {
                            const earlyEval = evaluateEarlyCheckIn(checkInModalRecord.eta || '12:00');
                            if (earlyEval.charge > 0) {
                                return (
                                    <div className="p-2.5 rounded-lg border border-amber-300 bg-amber-50 text-amber-900 text-xs space-y-1">
                                        <div className="flex items-center justify-between font-bold">
                                            <span className="flex items-center gap-1">
                                                <AlertTriangle size={13} className="text-amber-600" />
                                                <span>Early Arrival Policy Triggered</span>
                                            </span>
                                            <span>+ BDT {(earlyEval.charge * 100).toLocaleString()}</span>
                                        </div>
                                        <p className="text-[11px] text-amber-800">
                                            Guest arrived at {checkInModalRecord.eta || '10:30'} before regular 14:00 check-in time.
                                        </p>
                                        <label className="flex items-center gap-1.5 pt-1 text-[11px] font-semibold text-amber-900 cursor-pointer">
                                            <input
                                                type="checkbox"
                                                checked={overrideEarlyFee}
                                                onChange={e => setOverrideEarlyFee(e.target.checked)}
                                                className="w-3.5 h-3.5 rounded text-amber-600"
                                            />
                                            <span>Waive / Complimentary early check-in (Manager Discretion)</span>
                                        </label>
                                    </div>
                                );
                            }
                            return null;
                        })()}

                        {/* Key Card & Deposit Form */}
                        <div className="grid grid-cols-2 gap-2 text-xs">
                            <div className="space-y-1">
                                <label className="text-[10px] font-bold text-slate-600 uppercase flex items-center gap-1">
                                    <Key size={11} className="text-blue-600" /> Key Card ID
                                </label>
                                <input
                                    type="text"
                                    value={checkInKeyCard}
                                    onChange={e => setCheckInKeyCard(e.target.value)}
                                    placeholder="e.g. KC-102A"
                                    className="w-full h-8 px-2 border border-slate-200 rounded-lg font-mono font-bold text-xs"
                                />
                            </div>

                            <div className="space-y-1">
                                <label className="text-[10px] font-bold text-slate-600 uppercase flex items-center gap-1">
                                    <DollarSign size={11} className="text-emerald-600" /> Collect Deposit
                                </label>
                                <div className="flex gap-1">
                                    <input
                                        type="number"
                                        value={checkInDepositAmount}
                                        onChange={e => setCheckInDepositAmount(Number(e.target.value))}
                                        className="w-full h-8 px-2 border border-slate-200 rounded-lg font-mono font-bold text-xs"
                                    />
                                    <select
                                        value={checkInDepositMethod}
                                        onChange={e => setCheckInDepositMethod(e.target.value as any)}
                                        className="h-8 px-1.5 border border-slate-200 rounded-lg text-xs font-semibold"
                                    >
                                        <option value="Cash">Cash</option>
                                        <option value="Card">Card</option>
                                        <option value="bKash">bKash</option>
                                        <option value="None">None</option>
                                    </select>
                                </div>
                            </div>
                        </div>

                        {/* Submit Button */}
                        <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-100">
                            <button
                                type="button"
                                onClick={() => setCheckInModalRecord(null)}
                                className="h-8 px-3 border border-slate-200 hover:bg-slate-50 text-slate-700 font-bold rounded-lg text-xs cursor-pointer"
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                onClick={handleConfirmCheckIn}
                                className="h-8 px-4 bg-primary hover:bg-primary-hover text-white font-bold rounded-lg text-xs flex items-center gap-1.5 cursor-pointer shadow-xs"
                            >
                                <Check size={14} className="stroke-[3]" />
                                <span>Complete Check-In</span>
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Interactive Check-Out Modal / Settlement */}
            {checkOutModalRecord && (
                <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-3 animate-in fade-in duration-150">
                    <div className="bg-white rounded-xl shadow-2xl border border-slate-200 max-w-[460px] w-full p-4 space-y-3.5 animate-in zoom-in-95 duration-150">
                        <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                            <div className="flex items-center gap-2">
                                <div className="w-8 h-8 rounded-lg bg-amber-600 text-white flex items-center justify-center font-bold">
                                    <LogOut size={15} />
                                </div>
                                <div>
                                    <h3 className="text-sm font-bold text-slate-900">Check-Out &amp; Folio Settlement</h3>
                                    <p className="text-[11px] text-slate-500 font-mono">Room {checkOutModalRecord.roomNumber} • {checkOutModalRecord.guestName}</p>
                                </div>
                            </div>
                            <button
                                type="button"
                                onClick={() => setCheckOutModalRecord(null)}
                                className="p-1 text-slate-400 hover:text-slate-700 rounded-lg cursor-pointer"
                            >
                                <XCircle size={18} />
                            </button>
                        </div>

                        {/* Bill Breakdown */}
                        <div className="bg-slate-50 rounded-lg p-3 border border-slate-200/80 space-y-2 text-xs">
                            <div className="flex justify-between">
                                <span className="text-slate-500">Gross Tariff &amp; Charges:</span>
                                <span className="font-mono font-bold text-slate-900">BDT {checkOutModalRecord.totalAmount.toLocaleString()}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-slate-500">Paid to Date:</span>
                                <span className="font-mono text-emerald-700 font-bold">BDT {checkOutModalRecord.paidAmount.toLocaleString()}</span>
                            </div>
                            <div className="border-t border-slate-200 pt-1.5 flex justify-between text-sm">
                                <span className="font-bold text-slate-800">Final Balance Due:</span>
                                <span className="font-mono font-black text-rose-700">BDT {checkOutModalRecord.dueAmount.toLocaleString()}</span>
                            </div>
                        </div>

                        {/* Return Key Confirmation */}
                        <div className="p-2.5 bg-blue-50/70 border border-blue-200 rounded-lg flex items-center gap-2 text-xs text-blue-900">
                            <Key size={14} className="text-blue-600 flex-shrink-0" />
                            <span>Room key card <strong>{checkOutModalRecord.keyCard || 'KC-101'}</strong> received and deactivated.</span>
                        </div>

                        {/* Settle Actions */}
                        <div className="pt-2 flex flex-col gap-2">
                            <div className="grid grid-cols-3 gap-2">
                                <button
                                    type="button"
                                    onClick={() => handleConfirmCheckOut('Cash')}
                                    className="py-2 bg-white border border-slate-300 hover:border-blue-500 hover:bg-blue-50/60 text-slate-800 font-bold rounded-lg text-xs flex flex-col items-center gap-0.5 cursor-pointer transition-all"
                                >
                                    <DollarSign size={13} className="text-emerald-600" />
                                    <span>Cash</span>
                                </button>
                                <button
                                    type="button"
                                    onClick={() => handleConfirmCheckOut('Card')}
                                    className="py-2 bg-white border border-slate-300 hover:border-blue-500 hover:bg-blue-50/60 text-slate-800 font-bold rounded-lg text-xs flex flex-col items-center gap-0.5 cursor-pointer transition-all"
                                >
                                    <CreditCard size={13} className="text-blue-600" />
                                    <span>Credit Card</span>
                                </button>
                                <button
                                    type="button"
                                    onClick={() => handleConfirmCheckOut('bKash')}
                                    className="py-2 bg-white border border-slate-300 hover:border-pink-500 hover:bg-pink-50/60 text-slate-800 font-bold rounded-lg text-xs flex flex-col items-center gap-0.5 cursor-pointer transition-all"
                                >
                                    <Wallet size={13} className="text-pink-600" />
                                    <span>bKash / Nagad</span>
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Folio Post Charge Modal */}
            {folioModalRecord && (
                <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-3 animate-in fade-in duration-150">
                    <div className="bg-white rounded-xl shadow-2xl border border-slate-200 max-w-[420px] w-full p-4 space-y-3.5 animate-in zoom-in-95 duration-150">
                        <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                            <div>
                                <h3 className="text-sm font-bold text-slate-900">Post Charge to Room Folio</h3>
                                <p className="text-[11px] text-slate-500 font-mono">Room {folioModalRecord.roomNumber} • {folioModalRecord.guestName}</p>
                            </div>
                            <button
                                type="button"
                                onClick={() => setFolioModalRecord(null)}
                                className="p-1 text-slate-400 hover:text-slate-700 rounded-lg cursor-pointer"
                            >
                                <XCircle size={18} />
                            </button>
                        </div>

                        <div className="space-y-2.5 text-xs">
                            <div className="space-y-1">
                                <label className="text-[10px] font-bold text-slate-600 uppercase">Charge Department</label>
                                <select
                                    value={chargeType}
                                    onChange={e => setChargeType(e.target.value)}
                                    className="w-full h-8 px-2 border border-slate-200 rounded-lg font-medium text-xs bg-white outline-none"
                                >
                                    <option value="Restaurant & Dining">Restaurant &amp; Dining</option>
                                    <option value="Mini Bar">Mini Bar</option>
                                    <option value="Laundry & Dry Clean">Laundry &amp; Dry Clean</option>
                                    <option value="Spa & Wellness">Spa &amp; Wellness</option>
                                    <option value="Airport Transfer">Airport Transfer</option>
                                    <option value="Miscellaneous">Miscellaneous Service</option>
                                </select>
                            </div>

                            <div className="space-y-1">
                                <label className="text-[10px] font-bold text-slate-600 uppercase">Description</label>
                                <input
                                    type="text"
                                    value={chargeDesc}
                                    onChange={e => setChargeDesc(e.target.value)}
                                    placeholder="e.g. Dinner Buffet (2 Pax) - Receipt #458"
                                    className="w-full h-8 px-2 border border-slate-200 rounded-lg text-xs"
                                />
                            </div>

                            <div className="space-y-1">
                                <label className="text-[10px] font-bold text-slate-600 uppercase">Amount (BDT)</label>
                                <input
                                    type="number"
                                    value={chargeAmount}
                                    onChange={e => setChargeAmount(Number(e.target.value))}
                                    className="w-full h-8 px-2 border border-slate-200 rounded-lg font-mono font-bold text-xs"
                                />
                            </div>
                        </div>

                        <div className="pt-2 flex justify-end gap-2 border-t border-slate-100">
                            <button
                                type="button"
                                onClick={() => setFolioModalRecord(null)}
                                className="h-8 px-3 border border-slate-200 hover:bg-slate-50 text-slate-700 font-bold rounded-lg text-xs cursor-pointer"
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                onClick={handlePostCharge}
                                disabled={chargeAmount <= 0 || !chargeDesc.trim()}
                                className="h-8 px-4 bg-primary hover:bg-primary-hover disabled:opacity-50 text-white font-bold rounded-lg text-xs cursor-pointer shadow-xs"
                            >
                                Post to Folio
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Printable Registration Card Modal */}
            {regCardRecord && (
                <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 animate-in fade-in duration-150">
                    <div className="bg-white rounded-xl shadow-2xl border border-slate-200 max-w-[620px] w-full p-6 space-y-4 animate-in zoom-in-95 duration-150">
                        {/* Reg Card Printable Frame */}
                        <div className="border border-slate-300 p-4 rounded-lg space-y-3">
                            <div className="flex items-center justify-between border-b pb-3 border-slate-300">
                                <div>
                                    <h2 className="text-base font-black text-slate-900 uppercase tracking-wider">HotelOS International</h2>
                                    <p className="text-[10px] text-slate-500">Dhaka, Bangladesh • Official Guest Registration Card</p>
                                </div>
                                <div className="text-right">
                                    <span className="font-mono text-sm font-bold text-blue-700">{regCardRecord.reservationNumber}</span>
                                    <p className="text-[9.5px] text-slate-400">Date: {systemDate}</p>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-3 text-xs">
                                <div>
                                    <span className="text-[10px] text-slate-400 uppercase font-bold">Guest Full Name</span>
                                    <p className="font-bold text-slate-900">{regCardRecord.guestName}</p>
                                </div>
                                <div>
                                    <span className="text-[10px] text-slate-400 uppercase font-bold">Phone Number</span>
                                    <p className="font-bold text-slate-900">{regCardRecord.phone}</p>
                                </div>
                                <div>
                                    <span className="text-[10px] text-slate-400 uppercase font-bold">Assigned Room</span>
                                    <p className="font-bold text-blue-800 font-mono">Room {regCardRecord.roomNumber} ({regCardRecord.roomType})</p>
                                </div>
                                <div>
                                    <span className="text-[10px] text-slate-400 uppercase font-bold">Period of Stay</span>
                                    <p className="font-medium text-slate-800">{regCardRecord.checkIn} to {regCardRecord.checkOut} ({regCardRecord.nights} Nights)</p>
                                </div>
                            </div>

                            <div className="border-t border-slate-200 pt-2 text-[10px] text-slate-500 leading-relaxed">
                                I agree to the hotel rules and regulations. The hotel reserves the right to charge my payment method for any damages or unsettled folio services during my stay.
                            </div>

                            <div className="pt-6 flex justify-between items-end border-t border-slate-200">
                                <div className="text-center w-40 border-t border-slate-400 pt-1 text-[10px] text-slate-500">
                                    Front Desk Agent Signature
                                </div>
                                <div className="text-center w-40 border-t border-slate-400 pt-1 text-[10px] text-slate-500">
                                    Guest Signature
                                </div>
                            </div>
                        </div>

                        <div className="flex justify-end gap-2">
                            <button
                                type="button"
                                onClick={() => setRegCardRecord(null)}
                                className="h-8 px-4 border border-slate-200 hover:bg-slate-50 text-slate-700 font-bold rounded-lg text-xs cursor-pointer"
                            >
                                Close
                            </button>
                            <button
                                type="button"
                                onClick={() => window.print()}
                                className="h-8 px-4 bg-primary hover:bg-primary-hover text-white font-bold rounded-lg text-xs flex items-center gap-1.5 cursor-pointer shadow-xs"
                            >
                                <Printer size={13} />
                                <span>Print Reg Card</span>
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default FrontDesk;
