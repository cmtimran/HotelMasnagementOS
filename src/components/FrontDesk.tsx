import React, { useState, useMemo, useEffect } from 'react';
import {
    User, LogIn, LogOut, Search,
    DollarSign, Clock, CheckCircle2, XCircle, AlertCircle, Monitor,
    BedDouble, Key, Printer, Calendar,
    Plus, RefreshCw, CreditCard, Wallet, Check,
    AlertTriangle, Sparkles, Car, Plane, Utensils, Gift
} from 'lucide-react';
import { useNavigation } from '../context/NavigationContext';
import { evaluateEarlyCheckIn } from '../utils/policyEvaluator';
import { QuickReservationModal } from './modals/QuickReservationModal';
import { RoomAddonServicesModal, type ServiceTabType } from './modals/RoomAddonServicesModal';
import {
    syncReservationsFromDB,
    updateReservationStatusInDB,
    getCanonicalRooms,
    getOperatingSystemDate,
    formatToDisplayDate,
    generateRegistrationNumber,
    generateFolioNumber,
    getAllStoredReservations,
    saveStoredReservations,
    broadcastPMSEvent,
    subscribeToPMSEvents
} from '../utils/roomInventoryEngine';
import type {
    RoomServicesBundle,
    ExtraBedConfig,
    PickupConfig,
    MealPlanConfig,
    CelebrationDecorConfig,
    SpaWellnessConfig,
    TimingFlexConfig,
    CustomAddonItem
} from '../types/reservationServices';
import { getRoomBundleTotal } from '../types/reservationServices';
import PageHeader from './common/PageHeader';

export interface FrontDeskGuestRecord {
    id: string | number;
    reservationNumber: string;
    registrationNumber?: string;
    registeredAt?: string;
    folioNumber?: string;
    groupCode?: string;
    subBookingNumber?: string;
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
    status: 'arriving' | 'confirmed' | 'in-house' | 'arrived' | 'checked-out' | 'hold' | 'cancelled';
    source: string;
    vip?: string;
    keyCard?: string;
    specialRequests?: string;
    folioItems?: Array<{ id: number; desc: string; amount: number; time: string; type: string }>;
    servicesBundle?: RoomServicesBundle;
    extraBed?: ExtraBedConfig | null;
    pickup?: PickupConfig | null;
    mealPlan?: MealPlanConfig | null;
    celebration?: CelebrationDecorConfig | null;
    spaWellness?: SpaWellnessConfig | null;
    timingFlex?: TimingFlexConfig | null;
    customAddons?: CustomAddonItem[];
    addonCharges?: any;
}

const DEFAULT_FRONT_DESK_DATA: FrontDeskGuestRecord[] = [];

const mapToFrontDeskRecords = (rawList: any[]): FrontDeskGuestRecord[] => {
    if (!Array.isArray(rawList)) return [];
    return rawList.flatMap((item: any) => {
        const rooms = (item.roomsList && item.roomsList.length > 0)
            ? item.roomsList
            : (item.groupRoomsList && item.groupRoomsList.length > 0)
                ? item.groupRoomsList
                : null;

        if (rooms && rooms.length > 1) {
            return rooms.map((rm: any, subIdx: number) => {
                const subNo = rm.subBookingNumber || `${item.reservationNumber}-${String(subIdx + 1).padStart(2, '0')}`;
                const regNo = rm.registrationNumber || (item.status === 'in-house' || item.status === 'arrived' ? (rm.registrationNumber || `REG-${subNo.replace(/^RES-/, '')}`) : undefined);
                const folioNo = rm.folioNumber || `FOL-${subNo.replace(/^RES-/, '')}`;
                const rTariff = Number(rm.totalAmount || rm.amount || (Number(item.totalAmount) / rooms.length)) || 0;
                const rIn = rm.checkInDate || rm.checkIn || item.checkIn || item.arrivalDate;
                const rOut = rm.checkOutDate || rm.checkOut || item.checkOut || item.departureDate;
                const rNights = Number(rm.nights || item.nights || 1);
                const rStatus = (rm.status || item.status || 'confirmed');
                const uiStatus = (rStatus === 'in-house' || rStatus === 'arrived' ? 'in-house' : rStatus === 'checked-out' ? 'checked-out' : rStatus === 'hold' ? 'hold' : 'confirmed');

                return {
                    id: `${item.id || item.reservationNumber}-${rm.roomNumber || subIdx}`,
                    reservationNumber: item.reservationNumber,
                    registrationNumber: regNo,
                    registeredAt: rm.registeredAt || item.registeredAt || item.registrationDate,
                    folioNumber: folioNo,
                    groupCode: item.groupCode,
                    subBookingNumber: subNo,
                    guestName: rm.guestName || item.guestName,
                    phone: item.phone,
                    email: item.email,
                    roomNumber: String(rm.roomNumber || 'Unassigned'),
                    roomType: rm.roomType || item.roomType || 'Standard Room',
                    roomStatus: 'clean' as const,
                    checkIn: rIn,
                    checkOut: rOut,
                    eta: '12:00',
                    nights: rNights,
                    adults: Number(rm.adults || item.adults || 1),
                    children: Number(rm.children || item.children || 0),
                    totalAmount: rTariff,
                    paidAmount: subIdx === 0 ? (Number(item.paidAmount) || 0) : 0,
                    dueAmount: subIdx === 0 ? (Number(item.dueAmount) || 0) : 0,
                    status: uiStatus,
                    source: item.source || 'Direct',
                    vip: item.vip || 'None',
                    specialRequests: item.specialRequests || '',
                    servicesBundle: rm.servicesBundle || item.servicesBundle,
                    extraBed: rm.extraBed || item.extraBed,
                    pickup: rm.pickup || item.pickup,
                    mealPlan: rm.mealPlan || item.mealPlan,
                    celebration: rm.celebration || item.celebration,
                    spaWellness: rm.spaWellness || item.spaWellness,
                    timingFlex: rm.timingFlex || item.timingFlex,
                    customAddons: rm.customAddons || item.customAddons || []
                };
            });
        }

        const subNo = item.subBookingNumber || (item.reservationNumber ? `${item.reservationNumber}-01` : undefined);
        const regNo = item.registrationNumber || (item.status === 'in-house' || item.status === 'arrived' ? (item.registrationNumber || `REG-${(subNo || item.reservationNumber || '').replace(/^RES-/, '')}`) : undefined);
        const folioNo = item.folioNumber || `FOL-${(subNo || item.reservationNumber || '').replace(/^RES-/, '')}`;
        const st = (item.status === 'in-house' || item.status === 'arrived' ? 'in-house' : item.status === 'checked-out' ? 'checked-out' : item.status === 'hold' ? 'hold' : 'confirmed');

        return [{
            id: item.id || `RES-${item.reservationNumber || Date.now()}`,
            reservationNumber: item.reservationNumber || `RES-${Date.now()}`,
            registrationNumber: regNo,
            registeredAt: item.registeredAt || item.registrationDate,
            folioNumber: folioNo,
            groupCode: item.groupCode,
            subBookingNumber: subNo,
            guestName: item.guestName,
            phone: item.phone,
            email: item.email,
            roomNumber: String(item.roomNumber || (item.allocatedRooms && item.allocatedRooms[0]) || 'Unassigned'),
            roomType: item.roomType || 'Standard Single',
            roomStatus: 'clean' as const,
            checkIn: item.checkIn || item.arrivalDate,
            checkOut: item.checkOut || item.departureDate,
            eta: '12:00',
            nights: Number(item.nights || 1),
            adults: Number(item.adults || 1),
            children: Number(item.children || 0),
            totalAmount: Number(item.totalAmount) || 0,
            paidAmount: Number(item.paidAmount) || 0,
            dueAmount: Number(item.dueAmount) || 0,
            status: st,
            source: item.source || 'Direct',
            vip: item.vip || 'None',
            specialRequests: item.specialRequests || '',
            servicesBundle: item.servicesBundle,
            extraBed: item.extraBed || item.servicesBundle?.extraBed || null,
            pickup: item.pickup || item.servicesBundle?.pickup || null,
            mealPlan: item.mealPlan || item.servicesBundle?.mealPlan || null,
            celebration: item.celebration || item.servicesBundle?.celebration || null,
            spaWellness: item.spaWellness || item.servicesBundle?.spaWellness || null,
            timingFlex: item.timingFlex || item.servicesBundle?.timingFlex || null,
            customAddons: item.customAddons || item.servicesBundle?.customAddons || [],
            addonCharges: item.addonCharges
        }];
    });
};

export const FrontDesk: React.FC = () => {
    const { setActivePage } = useNavigation();

    // Data State (synced with localStorage & database)
    const [reservations, setReservations] = useState<FrontDeskGuestRecord[]>(() => {
        try {
            const activePropertyId = Number(localStorage.getItem('hotel_active_property_id')) || 1;
            const stored = getAllStoredReservations(activePropertyId);
            if (Array.isArray(stored) && stored.length > 0) {
                return mapToFrontDeskRecords(stored);
            }
            const localV2 = localStorage.getItem('hotel_reservations_v2');
            if (localV2 !== null) {
                const parsed = JSON.parse(localV2);
                if (Array.isArray(parsed) && parsed.length > 0) {
                    return mapToFrontDeskRecords(parsed);
                }
            }
        } catch (e) {
            console.error('Error reading hotel reservations', e);
        }
        return DEFAULT_FRONT_DESK_DATA;
    });

    // Sync with PostgreSQL Database on Mount and on Real-Time Events
    const fetchDB = React.useCallback(async () => {
        try {
            const activePropertyId = Number(localStorage.getItem('hotel_active_property_id')) || 1;
            const dbList = await syncReservationsFromDB(activePropertyId);
            if (Array.isArray(dbList) && dbList.length > 0) {
                setReservations(mapToFrontDeskRecords(dbList));
            } else {
                const fallback = getAllStoredReservations(activePropertyId);
                if (fallback.length > 0) {
                    setReservations(mapToFrontDeskRecords(fallback));
                }
            }
        } catch (err) {
            console.warn('FrontDesk DB sync fallback:', err);
            const fallback = getAllStoredReservations();
            if (fallback.length > 0) {
                setReservations(mapToFrontDeskRecords(fallback));
            }
        }
    }, []);

    useEffect(() => {
        fetchDB();

        const unsub = subscribeToPMSEvents(() => {
            fetchDB();
        });
        const handleSyncEvent = () => fetchDB();
        window.addEventListener('hotel_pms_sync_event', handleSyncEvent);
        return () => {
            unsub();
            window.removeEventListener('hotel_pms_sync_event', handleSyncEvent);
        };
    }, [fetchDB]);

    // Save back to localStorage and PostgreSQL DB (Single Targeted DB Update)
    const persistReservations = (updated: FrontDeskGuestRecord[], changedItem?: { id: string | number; status: string }) => {
        setReservations(updated);
        try {
            const activePropertyId = Number(localStorage.getItem('hotel_active_property_id')) || 1;
            saveStoredReservations(updated as any, activePropertyId);
            localStorage.setItem('hotel_reservations_v2', JSON.stringify(updated));
            broadcastPMSEvent({ type: 'INVENTORY_REFRESH' });
            // Trigger database update only for the specific reservation that changed
            if (changedItem?.id && changedItem?.status) {
                updateReservationStatusInDB(changedItem.id, changedItem.status);
            }
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
    const [serviceModalConfig, setServiceModalConfig] = useState<{
        isOpen: boolean;
        guestRecord: FrontDeskGuestRecord | null;
        initialTab: ServiceTabType;
    }>({
        isOpen: false,
        guestRecord: null,
        initialTab: 'pickup'
    });

    const handleSaveGuestServices = (bundle: RoomServicesBundle) => {
        if (!serviceModalConfig.guestRecord) return;
        const targetRecord = serviceModalConfig.guestRecord;
        const nights = Math.max(1, targetRecord.nights || 1);

        const newAddonsTotal = getRoomBundleTotal(bundle, nights);
        const oldAddonsTotal = getRoomBundleTotal(targetRecord.servicesBundle || {
            extraBed: targetRecord.extraBed || undefined,
            pickup: targetRecord.pickup || undefined,
            mealPlan: targetRecord.mealPlan || undefined,
            celebration: targetRecord.celebration || undefined,
            spaWellness: targetRecord.spaWellness || undefined,
            timingFlex: targetRecord.timingFlex || undefined,
            customAddons: targetRecord.customAddons || []
        }, nights);
        const diff = newAddonsTotal - oldAddonsTotal;

        const updated = reservations.map(r => {
            if (r.id !== targetRecord.id) return r;
            const newTotal = Math.max(0, (r.totalAmount || 0) + diff);
            const newDue = Math.max(0, (r.dueAmount || 0) + diff);

            const updatedFolios = [...(r.folioItems || [])];
            if (diff > 0) {
                updatedFolios.push({
                    id: Date.now(),
                    desc: 'Guest Add-On Services (Transfer / Bed / Dining / Spa)',
                    amount: diff,
                    time: new Date().toISOString().replace('T', ' ').slice(0, 16),
                    type: 'Services'
                });
            }

            return {
                ...r,
                servicesBundle: bundle,
                extraBed: bundle.extraBed,
                pickup: bundle.pickup,
                mealPlan: bundle.mealPlan,
                celebration: bundle.celebration,
                spaWellness: bundle.spaWellness,
                timingFlex: bundle.timingFlex,
                customAddons: bundle.customAddons,
                totalAmount: newTotal,
                dueAmount: newDue,
                folioItems: updatedFolios
            };
        });

        persistReservations(updated);
        setActionLog(prev => [
            `[${new Date().toLocaleTimeString()}] Services updated for Room ${targetRecord.roomNumber} (${targetRecord.guestName}) - Svc total: ৳${newAddonsTotal.toLocaleString()}`,
            ...prev
        ]);
        setServiceModalConfig({ isOpen: false, guestRecord: null, initialTab: 'pickup' });
    };

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

    // System Date (realtime synchronized)
    const [systemDateISO, setSystemDateISO] = useState<string>(() => getOperatingSystemDate());
    const systemDate = formatToDisplayDate(systemDateISO);

    useEffect(() => {
        const handleSync = (e: any) => {
            if (e?.detail?.type === 'SYSTEM_DATE_CHANGED' && e?.detail?.systemDate) {
                setSystemDateISO(e.detail.systemDate);
            }
        };
        window.addEventListener('hotel_pms_sync_event', handleSync);
        return () => window.removeEventListener('hotel_pms_sync_event', handleSync);
    }, []);

    // Counts & KPIs
    const arrivalsList = useMemo(() => reservations.filter(r => r.status === 'arriving' || r.status === 'confirmed'), [reservations]);
    const inHouseList = useMemo(() => reservations.filter(r => r.status === 'in-house' || r.status === 'arrived'), [reservations]);
    const departuresList = useMemo(() => reservations.filter(r => (r.status === 'in-house' || r.status === 'arrived') && r.checkOut <= systemDateISO), [reservations, systemDateISO]);
    const checkedOutToday = useMemo(() => reservations.filter(r => r.status === 'checked-out'), [reservations]);

    const canonicalRooms = useMemo(() => getCanonicalRooms(), [reservations]);
    const totalOccupied = inHouseList.length;
    const totalCapacity = Math.max(1, canonicalRooms.length || 34);
    const occupancyRate = Math.round((totalOccupied / totalCapacity) * 100);
    const cleanVacantCount = useMemo(
        () => canonicalRooms.filter(r => r.status === 'Active' && r.housekeepingStatus !== 'Dirty').length,
        [canonicalRooms]
    );
    const dirtyRoomsCount = useMemo(
        () => canonicalRooms.filter(r => r.housekeepingStatus === 'Dirty').length,
        [canonicalRooms]
    );

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
            base = reservations.filter(r => r.status === 'checked-out' || ((r.status === 'in-house' || r.status === 'arrived') && r.checkOut <= systemDateISO));
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
    }, [activeTab, arrivalsList, inHouseList, departuresList, reservations, searchTerm, filterSource, filterPayment, systemDateISO]);

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

                const regNo = r.registrationNumber || generateRegistrationNumber(r.subBookingNumber || r.reservationNumber);
                const folioNo = r.folioNumber || generateFolioNumber(r.subBookingNumber || r.reservationNumber);

                return {
                    ...r,
                    status: 'in-house' as const,
                    registrationNumber: regNo,
                    folioNumber: folioNo,
                    registeredAt: new Date().toISOString(),
                    keyCard: checkInKeyCard || `KC-${r.roomNumber}`,
                    totalAmount: newTotal,
                    paidAmount: newPaid,
                    dueAmount: newDue,
                    folioItems: newFolio
                };
            }
            return r;
        });

        const activeRegNo = checkInModalRecord.registrationNumber || generateRegistrationNumber(checkInModalRecord.subBookingNumber || checkInModalRecord.reservationNumber);
        const activeFolioNo = checkInModalRecord.folioNumber || generateFolioNumber(checkInModalRecord.subBookingNumber || checkInModalRecord.reservationNumber);

        persistReservations(updated, { id: checkInModalRecord.id, status: 'in-house' });
        setActionLog(prev => [
            `[IN-HOUSE] Guest ${checkInModalRecord.guestName} checked into Room ${checkInModalRecord.roomNumber}. Reg #: ${activeRegNo} | KeyCard: ${checkInKeyCard} | Folio: ${activeFolioNo}.`,
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

        persistReservations(updated, { id: checkOutModalRecord.id, status: 'checked-out' });
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
        <div className="page-container select-none animate-in fade-in duration-150">
            {/* Standardized Thesis Page Header */}
            <PageHeader
                title="Front Desk Overview"
                icon={<Monitor size={20} />}
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
                        <span className="text-[10px] uppercase tracking-wider">Occupancy</span>
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
                    className={`bg-white p-3 rounded-xl border transition-all cursor-pointer shadow-2xs ${activeTab === 'arrivals' ? 'border-blue-500 ring-2 ring-blue-500/20 bg-blue-50/20' : 'border-slate-200/90 hover:border-slate-300'
                        }`}
                >
                    <div className="flex items-center justify-between text-blue-700">
                        <span className="text-[10px] uppercase tracking-wider">Arrivals (Due)</span>
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
                    className={`bg-white p-3 rounded-xl border transition-all cursor-pointer shadow-2xs ${activeTab === 'in-house' ? 'border-emerald-500 ring-2 ring-emerald-500/20 bg-emerald-50/20' : 'border-slate-200/90 hover:border-slate-300'
                        }`}
                >
                    <div className="flex items-center justify-between text-emerald-700">
                        <span className="text-[10px] uppercase tracking-wider">In-House Guests</span>
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
                    className={`bg-white p-3 rounded-xl border transition-all cursor-pointer shadow-2xs ${activeTab === 'departures' ? 'border-amber-500 ring-2 ring-amber-500/20 bg-amber-50/20' : 'border-slate-200/90 hover:border-slate-300'
                        }`}
                >
                    <div className="flex items-center justify-between text-amber-700">
                        <span className="text-[10px] uppercase tracking-wider">Departures (Due)</span>
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
                        <span className="text-[10px] uppercase tracking-wider">Clean &amp; Ready</span>
                        <Sparkles size={13} className="text-emerald-600" />
                    </div>
                    <div className="mt-1 flex items-baseline gap-1.5">
                        <span className="text-xl font-black text-emerald-800 font-mono">{cleanVacantCount}</span>
                        <span className="text-[10.5px] text-emerald-600 font-semibold">Vacant Ready</span>
                    </div>
                    <p className="text-[10px] text-slate-500 mt-1.5">{dirtyRoomsCount} rooms in housekeeping</p>
                </div>

                {/* 6. Today's Collections */}
                <div className="bg-white p-3 rounded-xl border border-slate-200/90 shadow-2xs">
                    <div className="flex items-center justify-between text-slate-500">
                        <span className="text-[10px] uppercase tracking-wider">Shift Collections</span>
                        <Wallet size={13} className="text-primary" />
                    </div>
                    <div className="mt-1 flex items-baseline gap-1">
                        <span className="text-[11px] text-slate-400">BDT</span>
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
                            className={`px-3 py-1.5 rounded-lg text-xs transition-all cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${activeTab === 'arrivals'
                                ? 'bg-primary text-white shadow-xs'
                                : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-100'
                                }`}
                        >
                            <LogIn size={13} />
                            <span>1. Arrivals / Due-In</span>
                            <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono ${activeTab === 'arrivals' ? 'bg-primary-hover text-white' : 'bg-slate-100 text-slate-600'
                                }`}>
                                {arrivalsList.length}
                            </span>
                        </button>

                        <button
                            type="button"
                            onClick={() => setActiveTab('in-house')}
                            className={`px-3 py-1.5 rounded-lg text-xs transition-all cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${activeTab === 'in-house'
                                ? 'bg-primary text-white shadow-xs'
                                : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-100'
                                }`}
                        >
                            <User size={13} />
                            <span>2. In-House Guests</span>
                            <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono ${activeTab === 'in-house' ? 'bg-primary-hover text-white' : 'bg-slate-100 text-slate-600'
                                }`}>
                                {inHouseList.length}
                            </span>
                        </button>

                        <button
                            type="button"
                            onClick={() => setActiveTab('departures')}
                            className={`px-3 py-1.5 rounded-lg text-xs transition-all cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${activeTab === 'departures'
                                ? 'bg-primary text-white shadow-xs'
                                : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-100'
                                }`}
                        >
                            <LogOut size={13} />
                            <span>3. Departures / Due-Out</span>
                            <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono ${activeTab === 'departures' ? 'bg-primary-hover text-white' : 'bg-slate-100 text-slate-600'
                                }`}>
                                {departuresList.length}
                            </span>
                        </button>

                        <button
                            type="button"
                            onClick={() => setActiveTab('cashier')}
                            className={`px-3 py-1.5 rounded-lg text-xs transition-all cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${activeTab === 'cashier'
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
                            onClick={() => fetchDB()}
                            className="p-1.5 rounded-lg text-slate-500 hover:text-blue-700 hover:bg-slate-200/60 transition-colors cursor-pointer"
                            title="Refresh Data from Database"
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
                                <span className="text-[10px] text-slate-400 uppercase">Source:</span>
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
                                <span className="text-[10px] text-slate-400 uppercase">Billing:</span>
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
                                <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 text-[10px] uppercase tracking-wider">
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
                                        const isDueDeparture = item.checkOut <= systemDateISO && (item.status === 'in-house' || item.status === 'arrived');
                                        const isCheckedOut = item.status === 'checked-out';

                                        return (
                                            <tr key={item.id} className="hover:bg-blue-50/20 transition-colors">
                                                {/* Guest & Reference */}
                                                <td className="py-2.5 px-3.5">
                                                    <div className="flex items-center gap-2.5">
                                                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs flex-shrink-0 ${item.status === 'in-house' || item.status === 'arrived'
                                                            ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                                                            : isCheckedOut
                                                                ? 'bg-slate-100 text-slate-600'
                                                                : 'bg-blue-100 text-blue-800 border border-blue-200'
                                                            }`}>
                                                            {item.guestName.charAt(0)}
                                                        </div>
                                                        <div>
                                                            <div className="flex items-center gap-1.5">
                                                                <span className="text-slate-900">{item.guestName}</span>
                                                                {item.vip && item.vip !== 'None' && item.vip !== 'Regular' && (
                                                                    <span className="px-1.5 py-0.2 rounded text-[9px] font-black bg-amber-100 text-amber-800 border border-amber-300">
                                                                        {item.vip}
                                                                    </span>
                                                                )}
                                                            </div>
                                                            <div className="flex items-center gap-1.5 text-[10.5px] text-slate-500 mt-0.5 flex-wrap">
                                                                <span className="font-mono text-blue-700 font-semibold">{item.reservationNumber}</span>
                                                                {item.groupCode && (
                                                                    <span className="font-mono text-purple-700 font-bold bg-purple-50 px-1 py-0.2 rounded border border-purple-200 text-[9.5px]" title="Group Booking Code">
                                                                        {item.groupCode}
                                                                    </span>
                                                                )}
                                                                {item.registrationNumber && (
                                                                    <span className="font-mono text-emerald-700 font-bold bg-emerald-50 px-1 py-0.2 rounded border border-emerald-300 text-[9.5px]" title="Guest Registration Number (GRC)">
                                                                        {item.registrationNumber}
                                                                    </span>
                                                                )}
                                                                <span>•</span>
                                                                <span>{item.phone}</span>
                                                            </div>

                                                            {/* Active Add-on Services Badges */}
                                                            {(() => {
                                                                const b = item.servicesBundle || {
                                                                    extraBed: item.extraBed || undefined,
                                                                    pickup: item.pickup || undefined,
                                                                    mealPlan: item.mealPlan || undefined,
                                                                    celebration: item.celebration || undefined,
                                                                    spaWellness: item.spaWellness || undefined,
                                                                    timingFlex: item.timingFlex || undefined,
                                                                    customAddons: item.customAddons || []
                                                                };
                                                                const hasAnyService = b.pickup?.enabled || b.pickup?.dropEnabled || b.extraBed?.enabled || b.mealPlan?.enabled || b.celebration?.enabled || b.spaWellness?.enabled || b.timingFlex?.earlyCheckIn || b.timingFlex?.lateCheckOut || (b.customAddons && b.customAddons.length > 0);
                                                                if (!hasAnyService) return null;

                                                                return (
                                                                    <div className="flex flex-wrap items-center gap-1 mt-1.5">
                                                                        {b.pickup?.enabled && (
                                                                            <button
                                                                                type="button"
                                                                                onClick={() => setServiceModalConfig({ isOpen: true, guestRecord: item, initialTab: 'pickup' })}
                                                                                className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] bg-blue-50 text-blue-700 border border-blue-200 hover:bg-blue-100 transition-colors cursor-pointer shadow-2xs"
                                                                                title={`Inbound Airport Pickup: ${b.pickup.flightNumber || 'Arr'} (${b.pickup.pickupDateTime || ''})`}
                                                                            >
                                                                                <Car size={9} />
                                                                                <span>Pickup {b.pickup.flightNumber ? `#${b.pickup.flightNumber}` : ''}</span>
                                                                            </button>
                                                                        )}
                                                                        {b.pickup?.dropEnabled && (
                                                                            <button
                                                                                type="button"
                                                                                onClick={() => setServiceModalConfig({ isOpen: true, guestRecord: item, initialTab: 'pickup' })}
                                                                                className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] bg-sky-50 text-sky-700 border border-sky-200 hover:bg-sky-100 transition-colors cursor-pointer shadow-2xs"
                                                                                title={`Outbound Airport Drop: ${b.pickup.dropFlightNumber || 'Dept'} (${b.pickup.dropDateTime || ''})`}
                                                                            >
                                                                                <Plane size={9} />
                                                                                <span>Drop {b.pickup.dropFlightNumber ? `#${b.pickup.dropFlightNumber}` : ''}</span>
                                                                            </button>
                                                                        )}
                                                                        {b.extraBed?.enabled && (
                                                                            <button
                                                                                type="button"
                                                                                onClick={() => setServiceModalConfig({ isOpen: true, guestRecord: item, initialTab: 'extrabed' })}
                                                                                className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] bg-indigo-50 text-indigo-700 border border-indigo-200 hover:bg-indigo-100 transition-colors cursor-pointer shadow-2xs"
                                                                                title="Extra Bed / Cot Assigned"
                                                                            >
                                                                                <BedDouble size={9} />
                                                                                <span>Extra Bed</span>
                                                                            </button>
                                                                        )}
                                                                        {b.mealPlan?.enabled && (
                                                                            <button
                                                                                type="button"
                                                                                onClick={() => setServiceModalConfig({ isOpen: true, guestRecord: item, initialTab: 'mealplan' })}
                                                                                className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] bg-amber-50 text-amber-700 border border-amber-200 hover:bg-amber-100 transition-colors cursor-pointer shadow-2xs"
                                                                                title={`Meal Plan: ${b.mealPlan.planType || 'Meal Plan'}`}
                                                                            >
                                                                                <Utensils size={9} />
                                                                                <span>{b.mealPlan.planType ? b.mealPlan.planType.split(' ')[0] : 'Meal'}</span>
                                                                            </button>
                                                                        )}
                                                                        {b.celebration?.enabled && (
                                                                            <button
                                                                                type="button"
                                                                                onClick={() => setServiceModalConfig({ isOpen: true, guestRecord: item, initialTab: 'celebration' })}
                                                                                className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] bg-rose-50 text-rose-700 border border-rose-200 hover:bg-rose-100 transition-colors cursor-pointer shadow-2xs"
                                                                                title="Celebration Setup"
                                                                            >
                                                                                <Gift size={9} />
                                                                                <span>Decor</span>
                                                                            </button>
                                                                        )}
                                                                        {b.spaWellness?.enabled && (
                                                                            <button
                                                                                type="button"
                                                                                onClick={() => setServiceModalConfig({ isOpen: true, guestRecord: item, initialTab: 'spa' })}
                                                                                className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] bg-teal-50 text-teal-700 border border-teal-200 hover:bg-teal-100 transition-colors cursor-pointer shadow-2xs"
                                                                                title="Spa Treatment"
                                                                            >
                                                                                <Sparkles size={9} />
                                                                                <span>Spa</span>
                                                                            </button>
                                                                        )}
                                                                        {(b.timingFlex?.earlyCheckIn || b.timingFlex?.lateCheckOut) && (
                                                                            <button
                                                                                type="button"
                                                                                onClick={() => setServiceModalConfig({ isOpen: true, guestRecord: item, initialTab: 'timing' })}
                                                                                className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100 transition-colors cursor-pointer shadow-2xs"
                                                                                title="Early/Late Flex"
                                                                            >
                                                                                <Clock size={9} />
                                                                                <span>Flex</span>
                                                                            </button>
                                                                        )}
                                                                    </div>
                                                                );
                                                            })()}
                                                        </div>
                                                    </div>
                                                </td>

                                                {/* Room & Status */}
                                                <td className="py-2.5 px-3">
                                                    <div className="flex items-center gap-2">
                                                        <div className="w-10 h-7 rounded border border-blue-200 bg-blue-50 text-blue-900 font-mono flex items-center justify-center text-xs">
                                                            {item.roomNumber}
                                                        </div>
                                                        <div>
                                                            <div className="font-semibold text-slate-800 text-[11px] leading-tight">
                                                                {item.roomType}
                                                            </div>
                                                            <div className="text-[10px] text-slate-500 mt-0.5 flex items-center gap-1">
                                                                {item.roomStatus === 'clean' && (
                                                                    <span className="text-emerald-700 flex items-center gap-0.5">
                                                                        <Sparkles size={9} /> Clean &amp; Ready
                                                                    </span>
                                                                )}
                                                                {item.roomStatus === 'inspected' && (
                                                                    <span className="text-blue-700 flex items-center gap-0.5">
                                                                        <CheckCircle2 size={9} /> Inspected
                                                                    </span>
                                                                )}
                                                                {item.roomStatus === 'dirty' && (
                                                                    <span className="text-rose-600 flex items-center gap-0.5">
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
                                                <td className="py-2.5 px-3 whitespace-nowrap">
                                                    <div className="text-[11px] font-medium text-slate-800 leading-tight">
                                                        <span>{item.checkIn}</span> ➔ <span>{item.checkOut}</span>
                                                    </div>
                                                    <div className="text-[10px] text-slate-500 mt-0.5 flex items-center gap-1.5">
                                                        <span className="text-blue-700">{item.nights} Night{item.nights > 1 ? 's' : ''}</span>
                                                        {item.eta && (
                                                            <span>• ETA: <strong className="text-slate-700">{item.eta}</strong></span>
                                                        )}
                                                        {earlyEval.charge > 0 && item.status === 'arriving' && (
                                                            <span className="px-1 py-0.2 rounded bg-amber-50 text-amber-800 text-[9px] border border-amber-200">
                                                                Early In
                                                            </span>
                                                        )}
                                                    </div>
                                                </td>

                                                {/* Pax */}
                                                <td className="py-2.5 px-2.5 text-center whitespace-nowrap">
                                                    <span className="text-slate-700 text-xs">
                                                        {item.adults}A {item.children > 0 ? `+ ${item.children}C` : ''}
                                                    </span>
                                                </td>

                                                {/* Source */}
                                                <td className="py-2.5 px-3 whitespace-nowrap">
                                                    <span className="text-[11px] font-semibold text-slate-700 block">
                                                        {item.source}
                                                    </span>
                                                    <span className="text-[9.5px] text-slate-400 truncate max-w-[120px] block">
                                                        {item.specialRequests || 'No special notes'}
                                                    </span>
                                                </td>

                                                {/* Tariff & Balance */}
                                                <td className="py-2.5 px-3 text-right whitespace-nowrap">
                                                    <div className="font-mono text-slate-900 text-xs">
                                                        ৳{item.totalAmount.toLocaleString()}
                                                    </div>
                                                    <div className="mt-0.5">
                                                        {item.dueAmount > 0 ? (
                                                            <span className="px-1.5 py-0.2 rounded text-[10px] bg-rose-50 text-rose-700 border border-rose-200">
                                                                Due: ৳{item.dueAmount.toLocaleString()}
                                                            </span>
                                                        ) : (
                                                            <span className="px-1.5 py-0.2 rounded text-[10px] bg-emerald-50 text-emerald-700 border border-emerald-200">
                                                                Settled
                                                            </span>
                                                        )}
                                                    </div>
                                                </td>

                                                {/* Actions */}
                                                <td className="py-2.5 px-3.5 text-right whitespace-nowrap">
                                                    <div className="flex items-center justify-end gap-1.5">
                                                        {(item.status === 'arriving' || item.status === 'confirmed') && (
                                                            <button
                                                                type="button"
                                                                onClick={() => handleOpenCheckInModal(item)}
                                                                className="h-7 px-3 bg-primary hover:bg-primary-hover text-white rounded-lg text-xs flex items-center gap-1 cursor-pointer transition-colors shadow-2xs whitespace-nowrap"
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
                                                                    className="h-7 px-2.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 font-semibold rounded-lg text-xs flex items-center gap-1 cursor-pointer transition-colors shadow-2xs whitespace-nowrap"
                                                                    title="Add Restaurant / Laundry charge to Folio"
                                                                >
                                                                    <Plus size={11} className="text-blue-600" />
                                                                    <span>Charge</span>
                                                                </button>

                                                                <button
                                                                    type="button"
                                                                    onClick={() => handleOpenCheckOutModal(item)}
                                                                    className={`h-7 px-3 rounded-lg text-xs flex items-center gap-1 cursor-pointer transition-colors shadow-2xs whitespace-nowrap ${isDueDeparture
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
                                                            <span className="px-2 py-0.5 rounded text-[10px] bg-slate-100 text-slate-600 border border-slate-200">
                                                                Departed
                                                            </span>
                                                        )}

                                                        {/* Addon Services Modal Launcher */}
                                                        <button
                                                            type="button"
                                                            onClick={() => setServiceModalConfig({ isOpen: true, guestRecord: item, initialTab: 'pickup' })}
                                                            className="h-7 px-2 bg-white border border-slate-200 hover:bg-blue-50 hover:border-blue-300 text-slate-700 hover:text-blue-700 font-semibold rounded-lg text-xs flex items-center gap-1 cursor-pointer transition-colors shadow-2xs"
                                                            title="Manage Room Add-on Services (Airport Pickup, Airport Drop, Extra Bed, Meals, Spa, Decor, Time-Flex)"
                                                        >
                                                            <Sparkles size={11} className="text-blue-600" />
                                                            <span className="hidden sm:inline">Addons</span>
                                                        </button>

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
                                                <p className="text-xs text-slate-600">No records found matching criteria</p>
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
                                <span className="text-[10px] text-slate-500 uppercase tracking-wider block">Opening Float</span>
                                <div className="text-xl font-black text-slate-900 font-mono">BDT 15,000.00</div>
                                <p className="text-xs text-slate-500">Verified by Front Desk Cashier at 07:00 AM</p>
                            </div>

                            <div className="bg-emerald-50/60 border border-emerald-200 rounded-xl p-3.5 space-y-2">
                                <span className="text-[10px] text-emerald-700 uppercase tracking-wider block">Collections Received</span>
                                <div className="text-xl font-black text-emerald-900 font-mono">BDT {totalCollectionsToday.toLocaleString()}.00</div>
                                <p className="text-xs text-emerald-700">Cash: BDT 42,000 • Card: BDT 76,500 • bKash: BDT 30,000</p>
                            </div>

                            <div className="bg-blue-50/60 border border-blue-200 rounded-xl p-3.5 space-y-2">
                                <span className="text-[10px] text-blue-700 uppercase tracking-wider block">Current Drawer Total</span>
                                <div className="text-xl font-black text-blue-900 font-mono">BDT {(15000 + totalCollectionsToday).toLocaleString()}.00</div>
                                <p className="text-xs text-blue-700">Audit in balance • Zero float variance</p>
                            </div>
                        </div>

                        {/* Recent Cashier Events */}
                        <div className="border border-slate-200 rounded-xl p-3 bg-white space-y-2">
                            <h3 className="text-xs text-slate-800 uppercase tracking-wider">Session Audit Trail</h3>
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
                                    <h3 className="text-sm text-slate-900">Check-In Registration</h3>
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

                        {/* Concierge Services & Add-ons Briefing */}
                        {(() => {
                            const b = checkInModalRecord.servicesBundle || {
                                extraBed: checkInModalRecord.extraBed || undefined,
                                pickup: checkInModalRecord.pickup || undefined,
                                mealPlan: checkInModalRecord.mealPlan || undefined
                            };
                            const hasBriefing = b.pickup?.enabled || b.pickup?.dropEnabled || b.extraBed?.enabled || b.mealPlan?.enabled;
                            if (!hasBriefing) return null;

                            return (
                                <div className="bg-blue-50/60 rounded-lg p-2.5 border border-blue-200/80 space-y-1 text-[11px]">
                                    <div className="text-blue-900 text-[10px] uppercase tracking-wider flex items-center gap-1">
                                        <Sparkles size={11} className="text-blue-600" />
                                        <span>Concierge &amp; Room Add-ons Briefing</span>
                                    </div>
                                    {b.pickup?.enabled && (
                                        <div className="flex items-center gap-1.5 text-blue-800">
                                            <Car size={11} className="text-blue-600" />
                                            <span><strong>Inbound Pickup:</strong> Flight {b.pickup.flightNumber || 'N/A'} at {b.pickup.pickupDateTime || 'TBD'} ({b.pickup.vehicleType || 'Executive Vehicle'})</span>
                                        </div>
                                    )}
                                    {b.pickup?.dropEnabled && (
                                        <div className="flex items-center gap-1.5 text-sky-800">
                                            <Plane size={11} className="text-sky-600" />
                                            <span><strong>Scheduled Departure Drop:</strong> Flight {b.pickup.dropFlightNumber || 'N/A'} on {b.pickup.dropDateTime || checkInModalRecord.checkOut}</span>
                                        </div>
                                    )}
                                    {b.extraBed?.enabled && (
                                        <div className="flex items-center gap-1.5 text-indigo-800">
                                            <BedDouble size={11} className="text-indigo-600" />
                                            <span><strong>Extra Bed:</strong> {b.extraBed.bedType || 'Rollaway'} ({b.extraBed.quantity || 1} Bed) configured</span>
                                        </div>
                                    )}
                                    {b.mealPlan?.enabled && (
                                        <div className="flex items-center gap-1.5 text-amber-800">
                                            <Utensils size={11} className="text-amber-600" />
                                            <span><strong>Meal Plan:</strong> {b.mealPlan.planType || 'Meal Plan'} ({b.mealPlan.guestsCount || 1} Covers)</span>
                                        </div>
                                    )}
                                </div>
                            );
                        })()}

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
                                <label className="text-[10px] text-slate-600 uppercase flex items-center gap-1">
                                    <Key size={11} className="text-blue-600" /> Key Card ID
                                </label>
                                <input
                                    type="text"
                                    value={checkInKeyCard}
                                    onChange={e => setCheckInKeyCard(e.target.value)}
                                    placeholder="e.g. KC-102A"
                                    className="w-full h-8 px-2 border border-slate-200 rounded-lg font-mono text-xs"
                                />
                            </div>

                            <div className="space-y-1">
                                <label className="text-[10px] text-slate-600 uppercase flex items-center gap-1">
                                    <DollarSign size={11} className="text-emerald-600" /> Collect Deposit
                                </label>
                                <div className="flex gap-1">
                                    <input
                                        type="number"
                                        value={checkInDepositAmount}
                                        onChange={e => setCheckInDepositAmount(Number(e.target.value))}
                                        className="w-full h-8 px-2 border border-slate-200 rounded-lg font-mono text-xs"
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
                                className="h-8 px-3 border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-lg text-xs cursor-pointer"
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                onClick={handleConfirmCheckIn}
                                className="h-8 px-4 bg-primary hover:bg-primary-hover text-white rounded-lg text-xs flex items-center gap-1.5 cursor-pointer shadow-xs"
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
                                    <h3 className="text-sm text-slate-900">Check-Out &amp; Folio Settlement</h3>
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
                                <span className="font-mono text-slate-900">BDT {checkOutModalRecord.totalAmount.toLocaleString()}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-slate-500">Paid to Date:</span>
                                <span className="font-mono text-emerald-700 font-bold">BDT {checkOutModalRecord.paidAmount.toLocaleString()}</span>
                            </div>
                            <div className="border-t border-slate-200 pt-1.5 flex justify-between text-sm">
                                <span className="text-slate-800">Final Balance Due:</span>
                                <span className="font-mono font-black text-rose-700">BDT {checkOutModalRecord.dueAmount.toLocaleString()}</span>
                            </div>
                        </div>

                        {/* Outbound Airport Drop Concierge Notification */}
                        {(() => {
                            const p = checkOutModalRecord.servicesBundle?.pickup || checkOutModalRecord.pickup;
                            if (!p?.dropEnabled) return null;

                            return (
                                <div className="p-2.5 bg-sky-50 border border-sky-200 rounded-lg flex items-start gap-2 text-xs text-sky-900">
                                    <Plane size={15} className="text-sky-600 mt-0.5 flex-shrink-0" />
                                    <div>
                                        <div className="flex items-center gap-1">
                                            <span>Outbound Airport Drop Chauffeur Dispatched</span>
                                            <span className="px-1.5 py-0.2 rounded text-[9.5px] bg-sky-100 text-sky-800 border border-sky-300 font-mono">
                                                Flight {p.dropFlightNumber || 'N/A'}
                                            </span>
                                        </div>
                                        <p className="text-[11px] text-sky-800 mt-0.5">
                                            Chauffeur waiting at Main Entrance Porch • {p.dropVehicleType || 'Executive Sedan'} • Dep: {p.dropDateTime || '14:00'} ({p.dropLocation || 'T2'})
                                        </p>
                                    </div>
                                </div>
                            );
                        })()}

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
                                    className="py-2 bg-white border border-slate-300 hover:border-blue-500 hover:bg-blue-50/60 text-slate-800 rounded-lg text-xs flex flex-col items-center gap-0.5 cursor-pointer transition-all"
                                >
                                    <DollarSign size={13} className="text-emerald-600" />
                                    <span>Cash</span>
                                </button>
                                <button
                                    type="button"
                                    onClick={() => handleConfirmCheckOut('Card')}
                                    className="py-2 bg-white border border-slate-300 hover:border-blue-500 hover:bg-blue-50/60 text-slate-800 rounded-lg text-xs flex flex-col items-center gap-0.5 cursor-pointer transition-all"
                                >
                                    <CreditCard size={13} className="text-blue-600" />
                                    <span>Credit Card</span>
                                </button>
                                <button
                                    type="button"
                                    onClick={() => handleConfirmCheckOut('bKash')}
                                    className="py-2 bg-white border border-slate-300 hover:border-pink-500 hover:bg-pink-50/60 text-slate-800 rounded-lg text-xs flex flex-col items-center gap-0.5 cursor-pointer transition-all"
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
                                <h3 className="text-sm text-slate-900 font-bold">Post Charge to Room Folio</h3>
                                <p className="text-[11px] text-slate-500 font-mono">
                                    Room {folioModalRecord.roomNumber} • {folioModalRecord.guestName} • Folio: {folioModalRecord.folioNumber || `FOL-${folioModalRecord.reservationNumber.replace(/^RES-/, '')}-1`}
                                </p>
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
                                <label className="text-[10px] text-slate-600 uppercase">Charge Department</label>
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
                                <label className="text-[10px] text-slate-600 uppercase">Description</label>
                                <input
                                    type="text"
                                    value={chargeDesc}
                                    onChange={e => setChargeDesc(e.target.value)}
                                    placeholder="e.g. Dinner Buffet (2 Pax) - Receipt #458"
                                    className="w-full h-8 px-2 border border-slate-200 rounded-lg text-xs"
                                />
                            </div>

                            <div className="space-y-1">
                                <label className="text-[10px] text-slate-600 uppercase">Amount (BDT)</label>
                                <input
                                    type="number"
                                    value={chargeAmount}
                                    onChange={e => setChargeAmount(Number(e.target.value))}
                                    className="w-full h-8 px-2 border border-slate-200 rounded-lg font-mono text-xs"
                                />
                            </div>
                        </div>

                        <div className="pt-2 flex justify-end gap-2 border-t border-slate-100">
                            <button
                                type="button"
                                onClick={() => setFolioModalRecord(null)}
                                className="h-8 px-3 border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-lg text-xs cursor-pointer"
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                onClick={handlePostCharge}
                                disabled={chargeAmount <= 0 || !chargeDesc.trim()}
                                className="h-8 px-4 bg-primary hover:bg-primary-hover disabled:opacity-50 text-white rounded-lg text-xs cursor-pointer shadow-xs"
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
                                    <div className="font-mono text-sm text-blue-700 font-bold">{regCardRecord.reservationNumber}</div>
                                    <div className="font-mono text-xs text-emerald-700 font-bold">
                                        Reg: {regCardRecord.registrationNumber || `REG-${regCardRecord.reservationNumber.replace(/^RES-/, '')}`}
                                    </div>
                                    <div className="font-mono text-[10px] text-slate-500">
                                        Folio: {regCardRecord.folioNumber || `FOL-${regCardRecord.reservationNumber.replace(/^RES-/, '')}-1`}
                                    </div>
                                    <p className="text-[9.5px] text-slate-400 mt-0.5">Date: {systemDate}</p>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-3 text-xs">
                                <div>
                                    <span className="text-[10px] text-slate-400 uppercase font-bold">Guest Full Name</span>
                                    <p className="text-slate-900">{regCardRecord.guestName}</p>
                                </div>
                                <div>
                                    <span className="text-[10px] text-slate-400 uppercase font-bold">Phone Number</span>
                                    <p className="text-slate-900">{regCardRecord.phone}</p>
                                </div>
                                <div>
                                    <span className="text-[10px] text-slate-400 uppercase font-bold">Assigned Room</span>
                                    <p className="text-blue-800 font-mono">Room {regCardRecord.roomNumber} ({regCardRecord.roomType})</p>
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
                                className="h-8 px-4 border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-lg text-xs cursor-pointer"
                            >
                                Close
                            </button>
                            <button
                                type="button"
                                onClick={() => window.print()}
                                className="h-8 px-4 bg-primary hover:bg-primary-hover text-white rounded-lg text-xs flex items-center gap-1.5 cursor-pointer shadow-xs"
                            >
                                <Printer size={13} />
                                <span>Print Reg Card</span>
                            </button>
                        </div>
                    </div>
                </div>
            )}
            {/* Room Add-On Services Modal for Front Desk Management */}
            {serviceModalConfig.isOpen && serviceModalConfig.guestRecord && (
                <RoomAddonServicesModal
                    isOpen={serviceModalConfig.isOpen}
                    onClose={() => setServiceModalConfig({ isOpen: false, guestRecord: null, initialTab: 'pickup' })}
                    roomNumber={serviceModalConfig.guestRecord.roomNumber}
                    roomType={serviceModalConfig.guestRecord.roomType}
                    baseRate={3000}
                    initialTab={serviceModalConfig.initialTab}
                    nights={serviceModalConfig.guestRecord.nights || 1}
                    currentServices={serviceModalConfig.guestRecord.servicesBundle || {
                        extraBed: serviceModalConfig.guestRecord.extraBed || undefined,
                        pickup: serviceModalConfig.guestRecord.pickup || undefined,
                        mealPlan: serviceModalConfig.guestRecord.mealPlan || undefined,
                        celebration: serviceModalConfig.guestRecord.celebration || undefined,
                        spaWellness: serviceModalConfig.guestRecord.spaWellness || undefined,
                        timingFlex: serviceModalConfig.guestRecord.timingFlex || undefined,
                        customAddons: serviceModalConfig.guestRecord.customAddons || []
                    }}
                    currentExtraBed={serviceModalConfig.guestRecord.extraBed || undefined}
                    currentPickup={serviceModalConfig.guestRecord.pickup || undefined}
                    onSave={handleSaveGuestServices}
                />
            )}
        </div>
    );
};

export default FrontDesk;
