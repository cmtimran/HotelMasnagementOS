import { useState, useEffect, useCallback, useMemo } from 'react';
import { getCurrencySymbol } from '../utils/currencyUtils';
import { Calendar, Users, MapPin, Phone, Mail, Download, CheckCircle, ArrowUpDown, Edit3 } from 'lucide-react';
import GuestProfile360 from './GuestProfile360';
import { useNavigation } from '../context/NavigationContext';
import {
    getAllStoredReservations,
    syncReservationsFromDB,
    updateReservationStatusInDB,
    getOperatingSystemDate,
    subscribeToPMSEvents,
    isRoomUnassigned,
    type StoredReservation
} from '../utils/roomInventoryEngine';
import { toast } from '../context/ToastContext';

interface Reservation {
    id: number | string;
    reservationNumber?: string;
    subBookingNumber?: string;
    groupCode?: string;
    registrationNumber?: string;
    folioNumber?: string;
    guestName: string;
    roomNumber: string;
    roomType: string;
    checkIn: string;
    checkOut: string;
    nights: number;
    adults: number;
    children: number;
    status: 'confirmed' | 'arriving' | 'in-house' | 'arrived' | 'departing' | 'checked-out' | 'hold' | 'cancelled';
    phone: string;
    email: string;
    totalAmount: number;
    source: string;
}

const ReservationList = () => {
    const currencySymbol = useMemo(() => getCurrencySymbol(), []);
    const { setActivePage } = useNavigation();
    const [activeTab, setActiveTab] = useState<'arrivals' | 'in-house' | 'departures' | 'all'>('arrivals');
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedReservations, setSelectedReservations] = useState<(number | string)[]>([]);
    const [showGuestProfile, setShowGuestProfile] = useState(false);

    const handleOpenEdit = (res: Reservation) => {
        const resId = res.reservationNumber || String(res.id);
        sessionStorage.setItem('hotel_edit_reservation_id', resId);
        setActivePage('add-reservation');
    };

    const mapStoredToUi = useCallback((stored: StoredReservation[]): Reservation[] => {
        const operatingDate = getOperatingSystemDate();
        if (!Array.isArray(stored)) return [];
        return stored.flatMap((r, idx) => {
            const isConnectingSuite = Boolean(
                r.isConnectingSuite ||
                (r.roomType && (r.roomType.toLowerCase().includes('connecting') || r.roomType.toLowerCase().includes('interconnecting')))
            );

            const rooms = (r.roomsList && r.roomsList.length > 0)
                ? r.roomsList
                : (r.groupRoomsList && r.groupRoomsList.length > 0)
                    ? r.groupRoomsList
                    : null;

            if (!isConnectingSuite && rooms && rooms.length > 1) {
                return rooms.map((rm: any, subIdx: number) => {
                    const rawSt = (rm.status && rm.status !== 'ASSIGNED' && rm.status !== 'UNASSIGNED') ? rm.status : (r.status || 'confirmed');
                    let st = String(rawSt || 'confirmed').toLowerCase() as any;
                    const rIn = rm.checkInDate || rm.checkIn || r.checkIn;
                    const rOut = rm.checkOutDate || rm.checkOut || r.checkOut;
                    if (st === 'in-house' || st === 'arrived' || st === 'stayover') {
                        st = rOut === operatingDate ? 'departing' : 'in-house';
                    } else if (st === 'confirmed' || st === 'arriving' || st === 'assigned') {
                        st = rIn === operatingDate ? 'arriving' : 'confirmed';
                    }
                    const subNum = rm.subBookingNumber || (r.reservationNumber ? `${r.reservationNumber}-${String(subIdx + 1).padStart(2, '0')}` : undefined);
                    const regNo = rm.registrationNumber || r.registrationNumber || (st === 'in-house' || st === 'departing' ? `REG-${(subNum || r.reservationNumber || '').replace(/^RES-/, '')}` : undefined);
                    const folioNo = rm.folioNumber || r.folioNumber || `FOL-${(subNum || r.reservationNumber || '').replace(/^RES-/, '')}`;
                    const rTariff = Number(rm.totalAmount || rm.amount || (Number(r.totalAmount) / rooms.length)) || 0;

                    return {
                        id: String(`${r.id || idx + 1}-${rm.roomNumber || subIdx}`),
                        reservationNumber: r.reservationNumber,
                        subBookingNumber: subNum,
                        groupCode: r.groupCode,
                        registrationNumber: regNo,
                        folioNumber: folioNo,
                        guestName: rm.guestName || r.guestName || 'Valued Guest',
                        roomNumber: String(rm.roomNumber || 'Unassigned'),
                        roomType: rm.roomType || r.roomType || 'Standard Room',
                        checkIn: rIn,
                        checkOut: rOut,
                        nights: Number(rm.nights) || Number(r.nights) || 1,
                        adults: Number(rm.adults) || Number(r.adults) || 2,
                        children: Number(rm.children) || Number(r.children) || 0,
                        status: st,
                        phone: r.phone || 'N/A',
                        email: r.email || 'N/A',
                        totalAmount: rTariff,
                        source: r.source || 'Direct'
                    };
                });
            }

            let st = String(r.status || 'confirmed').toLowerCase() as any;
            if (st === 'in-house' || st === 'arrived' || st === 'stayover') {
                st = r.checkOut === operatingDate ? 'departing' : 'in-house';
            } else if (st === 'confirmed' || st === 'arriving' || st === 'assigned') {
                st = r.checkIn === operatingDate ? 'arriving' : 'confirmed';
            }

            const roomNumbers = (r.allocatedRooms && r.allocatedRooms.length > 0)
                ? r.allocatedRooms
                : (rooms && rooms.length > 0 ? rooms.map((x: any) => x.roomNumber).filter(Boolean) : [r.roomNumber]);
            const roomDisplay = isConnectingSuite && roomNumbers.length > 1
                ? roomNumbers.join(' + ')
                : String(r.roomNumber || (r.allocatedRooms && r.allocatedRooms[0]) || (rooms && rooms[0]?.roomNumber) || 'Unassigned');

            const subNum = isConnectingSuite ? undefined : (r.subBookingNumber || (r.reservationNumber ? `${r.reservationNumber}-01` : undefined));
            const regNo = r.registrationNumber || (st === 'in-house' || st === 'departing' ? `REG-${(subNum || r.reservationNumber || '').replace(/^RES-/, '')}` : undefined);
            const folioNo = r.folioNumber || `FOL-${(subNum || r.reservationNumber || '').replace(/^RES-/, '')}`;

            return [{
                id: String(r.id || idx + 1),
                reservationNumber: r.reservationNumber,
                subBookingNumber: subNum,
                groupCode: isConnectingSuite ? undefined : r.groupCode,
                registrationNumber: regNo,
                folioNumber: folioNo,
                guestName: r.guestName || (rooms && rooms[0]?.guestName) || 'Valued Guest',
                roomNumber: roomDisplay,
                roomType: r.roomType || 'Standard Room',
                checkIn: r.checkIn,
                checkOut: r.checkOut,
                nights: Number(r.nights) || 1,
                adults: Number(r.adults) || 2,
                children: Number(r.children) || 0,
                status: st,
                phone: r.phone || 'N/A',
                email: r.email || 'N/A',
                totalAmount: Number(r.totalAmount) || 0,
                source: r.source || 'Direct'
            }];
        });
    }, []);

    const [reservations, setReservations] = useState<Reservation[]>(() => {
        return mapStoredToUi(getAllStoredReservations());
    });

    const loadData = useCallback(async () => {
        const dbData = await syncReservationsFromDB();
        setReservations(mapStoredToUi(dbData));
    }, [mapStoredToUi]);

    useEffect(() => {
        loadData();
        const unsub = subscribeToPMSEvents(() => {
            setReservations(mapStoredToUi(getAllStoredReservations()));
        });
        return () => unsub();
    }, [loadData, mapStoredToUi]);

    const filteredReservations = reservations.filter(res => {
        const matchesTab = activeTab === 'all' || res.status === activeTab ||
            (activeTab === 'arrivals' && (res.status === 'arriving' || res.status === 'confirmed')) ||
            (activeTab === 'departures' && res.status === 'departing') ||
            (activeTab === 'in-house' && (res.status === 'in-house' || res.status === 'arrived'));
        const matchesSearch = res.guestName.toLowerCase().includes(searchTerm.toLowerCase()) ||
            res.roomNumber.includes(searchTerm) ||
            res.phone.includes(searchTerm);
        return matchesTab && matchesSearch;
    });

    const stats = {
        arrivals: reservations.filter(r => r.status === 'arriving' || r.status === 'confirmed').length,
        inHouse: reservations.filter(r => r.status === 'in-house' || r.status === 'arrived').length,
        departures: reservations.filter(r => r.status === 'departing').length,
        total: reservations.length,
    };

    const toggleSelection = (id: number | string) => {
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

    const handleActionClick = async (res: Reservation) => {
        const targetId = res.reservationNumber || res.id;
        if (res.status === 'arriving' || res.status === 'confirmed') {
            if (isRoomUnassigned(res.roomNumber)) {
                toast.error(`Cannot check in ${res.guestName}: Room is unassigned. Please assign a room first.`);
                return;
            }
            const ok = await updateReservationStatusInDB(targetId, 'IN_HOUSE');
            if (!ok) {
                toast.error(`Cannot check in ${res.guestName}: Room is unassigned.`);
                return;
            }
            toast.success(`Guest ${res.guestName} checked in to Room ${res.roomNumber}!`);
            loadData();
        } else if (res.status === 'departing' || res.status === 'in-house' || res.status === 'arrived') {
            await updateReservationStatusInDB(targetId, 'COMPLETED');
            toast.success(`Guest ${res.guestName} checked out of Room ${res.roomNumber}!`);
            loadData();
        } else {
            setShowGuestProfile(true);
        }
    };

    const getStatusColor = (status: Reservation['status']) => {
        switch (status) {
            case 'confirmed': return 'bg-blue-100 text-blue-700 border-blue-200';
            case 'arriving': return 'bg-sky-100 text-sky-700 border-sky-200';
            case 'in-house':
            case 'arrived': return 'bg-emerald-100 text-emerald-700 border-emerald-200';
            case 'departing': return 'bg-amber-100 text-amber-700 border-amber-200';
            case 'checked-out': return 'bg-slate-100 text-slate-700 border-slate-200';
            case 'hold': return 'bg-purple-100 text-purple-700 border-purple-200';
            default: return 'bg-gray-100 text-gray-700 border-gray-200';
        }
    };

    const getStatusLabel = (status: Reservation['status']) => {
        switch (status) {
            case 'confirmed': return 'Confirmed';
            case 'arriving': return 'Arriving Today';
            case 'in-house':
            case 'arrived': return 'In-House';
            case 'departing': return 'Departing Today';
            case 'checked-out': return 'Checked Out';
            case 'hold': return 'Hold';
            default: return status;
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50/20 to-gray-50 p-4 md:p-6 lg:p-8">
            {/* Header */}
            <div className="mb-8">
                <div className="flex items-center gap-3 mb-2">
                    <div className="w-12 h-12 bg-gradient-to-br from-indigo-600 to-indigo-700 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-600/30">
                        <Calendar className="text-white" size={24} />
                    </div>
                    <div>
                        <h1 className="text-2xl md:text-3xl text-gray-900 tracking-tight">Reservations</h1>
                        <p className="text-sm text-gray-600">Manage and track all guest bookings</p>
                    </div>
                </div>

                {/* Stats Cards */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
                    <button
                        onClick={() => setActiveTab('arrivals')}
                        className={`p-4 rounded-xl border text-left transition-all ${
                            activeTab === 'arrivals'
                                ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30 border-blue-600'
                                : 'bg-white text-gray-700 border-gray-200 hover:border-blue-300 shadow-sm'
                        }`}
                    >
                        <p className={`text-xs font-semibold uppercase tracking-wider ${activeTab === 'arrivals' ? 'text-blue-100' : 'text-gray-500'}`}>Arrivals / Confirmed</p>
                        <p className="text-2xl mt-1">{stats.arrivals}</p>
                    </button>
                    <button
                        onClick={() => setActiveTab('in-house')}
                        className={`p-4 rounded-xl border text-left transition-all ${
                            activeTab === 'in-house'
                                ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-600/30 border-emerald-600'
                                : 'bg-white text-gray-700 border-gray-200 hover:border-emerald-300 shadow-sm'
                        }`}
                    >
                        <p className={`text-xs font-semibold uppercase tracking-wider ${activeTab === 'in-house' ? 'text-emerald-100' : 'text-gray-500'}`}>In-House</p>
                        <p className="text-2xl mt-1">{stats.inHouse}</p>
                    </button>
                    <button
                        onClick={() => setActiveTab('departures')}
                        className={`p-4 rounded-xl border text-left transition-all ${
                            activeTab === 'departures'
                                ? 'bg-amber-600 text-white shadow-lg shadow-amber-600/30 border-amber-600'
                                : 'bg-white text-gray-700 border-gray-200 hover:border-amber-300 shadow-sm'
                        }`}
                    >
                        <p className={`text-xs font-semibold uppercase tracking-wider ${activeTab === 'departures' ? 'text-amber-100' : 'text-gray-500'}`}>Departures</p>
                        <p className="text-2xl mt-1">{stats.departures}</p>
                    </button>
                    <button
                        onClick={() => setActiveTab('all')}
                        className={`p-4 rounded-xl border text-left transition-all ${
                            activeTab === 'all'
                                ? 'bg-gray-800 text-white shadow-lg shadow-gray-800/30 border-gray-800'
                                : 'bg-white text-gray-700 border-gray-200 hover:border-gray-400 shadow-sm'
                        }`}
                    >
                        <p className={`text-xs font-semibold uppercase tracking-wider ${activeTab === 'all' ? 'text-gray-300' : 'text-gray-500'}`}>All Bookings</p>
                        <p className="text-2xl mt-1">{stats.total}</p>
                    </button>
                </div>
            </div>

            {/* Filter and Search Bar */}
            <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-sm mb-6">
                <div className="flex flex-col md:flex-row gap-4 justify-between items-center">
                    <div className="relative w-full md:w-96">
                        <input
                            type="text"
                            placeholder="Search by name, room, or phone..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-4 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none text-sm bg-white shadow-sm"
                        />
                    </div>
                    <div className="flex gap-3">
                        {selectedReservations.length > 0 && (
                            <button className="px-5 py-3 bg-gradient-to-r from-emerald-600 to-emerald-700 text-white rounded-xl text-sm font-semibold hover:from-emerald-700 hover:to-emerald-800 transition-all shadow-lg shadow-emerald-600/30 flex items-center gap-2">
                                <CheckCircle size={18} />
                                Group Action ({selectedReservations.length})
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
                                <th className="px-6 py-4 text-left text-xs text-gray-700 uppercase tracking-wider">
                                    <div className="flex items-center gap-2">
                                        Guest <ArrowUpDown size={14} />
                                    </div>
                                </th>
                                <th className="px-6 py-4 text-left text-xs text-gray-700 uppercase tracking-wider">Room</th>
                                <th className="px-6 py-4 text-left text-xs text-gray-700 uppercase tracking-wider">Check-in</th>
                                <th className="px-6 py-4 text-left text-xs text-gray-700 uppercase tracking-wider">Check-out</th>
                                <th className="px-6 py-4 text-left text-xs text-gray-700 uppercase tracking-wider">Guests</th>
                                <th className="px-6 py-4 text-left text-xs text-gray-700 uppercase tracking-wider">Amount</th>
                                <th className="px-6 py-4 text-left text-xs text-gray-700 uppercase tracking-wider">Status</th>
                                <th className="px-6 py-4 text-right text-xs text-gray-700 uppercase tracking-wider">Actions</th>
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
                                                className="text-sm text-blue-600 hover:text-blue-700 hover:underline text-left"
                                            >
                                                {res.guestName}
                                            </button>
                                            {res.subBookingNumber && res.subBookingNumber !== res.reservationNumber ? (
                                                <span className="ml-2 text-[10px] font-mono text-blue-700 bg-blue-50 border border-blue-200 px-1 py-0.5 rounded font-bold" title="Sub-Booking Number">
                                                    {res.subBookingNumber}
                                                </span>
                                            ) : res.reservationNumber ? (
                                                <span className="ml-2 text-[10px] font-mono text-slate-500 bg-slate-100 px-1 py-0.5 rounded">
                                                    {res.reservationNumber}
                                                </span>
                                            ) : null}
                                            {res.groupCode && (
                                                <span className="ml-1 text-[10px] font-mono text-purple-700 bg-purple-50 border border-purple-200 px-1 py-0.5 rounded font-bold" title="Group Booking Code">
                                                    {res.groupCode}
                                                </span>
                                            )}
                                            {res.registrationNumber && (
                                                <span className="ml-1 text-[10px] font-mono text-emerald-700 bg-emerald-50 border border-emerald-300 px-1 py-0.5 rounded font-bold" title="Registration Number (GRC)">
                                                    {res.registrationNumber}
                                                </span>
                                            )}
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
                                            <span className="text-sm text-gray-900">{res.roomNumber}</span>
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
                                        <p className="text-sm text-gray-900">{currencySymbol} {res.totalAmount.toLocaleString()}</p>
                                        <p className="text-xs text-gray-500">{res.source}</p>
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className={`px-3 py-1.5 rounded-full text-xs font-semibold border ${getStatusColor(res.status)}`}>
                                            {getStatusLabel(res.status)}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <div className="flex items-center justify-end gap-2">
                                            <button
                                                type="button"
                                                onClick={() => handleOpenEdit(res)}
                                                className="px-3 py-1.5 bg-white border border-gray-200 text-blue-700 hover:bg-blue-50 hover:border-blue-300 rounded-lg text-xs font-semibold transition-all shadow-2xs cursor-pointer flex items-center gap-1"
                                                title="Edit Reservation Details"
                                            >
                                                <Edit3 size={13} />
                                                <span>Edit</span>
                                            </button>
                                            {(() => {
                                                const isArrivalOrConfirmed = res.status === 'arriving' || res.status === 'confirmed';
                                                const unassigned = isArrivalOrConfirmed && isRoomUnassigned(res.roomNumber);
                                                return (
                                                    <button
                                                        type="button"
                                                        disabled={unassigned}
                                                        onClick={() => {
                                                            if (unassigned) {
                                                                toast.error(`Cannot check in guest "${res.guestName}": Room is unassigned. Please assign a room first.`);
                                                                return;
                                                            }
                                                            handleActionClick(res);
                                                        }}
                                                        className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all shadow-md ${
                                                            unassigned
                                                                ? 'bg-slate-200 text-slate-400 cursor-not-allowed opacity-60'
                                                                : 'bg-gradient-to-r from-indigo-600 to-indigo-700 text-white hover:from-indigo-700 hover:to-indigo-800 opacity-90 group-hover:opacity-100 cursor-pointer'
                                                        }`}
                                                        title={unassigned ? 'Cannot check in: Room is unassigned. Please assign a room first.' : 'Action'}
                                                    >
                                                        {isArrivalOrConfirmed
                                                            ? (unassigned ? 'Unassigned' : 'Check-in')
                                                            : (res.status === 'departing' || res.status === 'in-house' || res.status === 'arrived')
                                                                ? 'Check-out'
                                                                : 'View'}
                                                    </button>
                                                );
                                            })()}
                                        </div>
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
                    <h3 className="text-xl text-gray-700 mb-2">No reservations found</h3>
                    <p className="text-sm text-gray-500">Try adjusting your search or filters</p>
                </div>
            )}

            {/* Guest Profile Modal */}
            {showGuestProfile && <GuestProfile360 onClose={() => setShowGuestProfile(false)} />}
        </div>
    );
};

export default ReservationList;
