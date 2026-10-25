import { useState, useMemo } from 'react';
import { User, Mail, Phone, MapPin, Calendar, Star, Heart, AlertCircle, TrendingUp, Award, Clock, MessageSquare, X, ChevronRight, Building2 } from 'lucide-react';
import { getAllStoredReservations } from '../utils/roomInventoryEngine';

interface GuestStay {
    id: number;
    checkIn: string;
    checkOut: string;
    roomNumber: string;
    roomType: string;
    nights: number;
    totalSpent: number;
    status: 'completed' | 'upcoming' | 'cancelled';
}

interface GuestPreference {
    category: string;
    items: string[];
}

interface Complaint {
    id: number;
    date: string;
    issue: string;
    status: 'resolved' | 'pending' | 'escalated';
    resolution?: string;
}

interface Guest {
    id: number;
    name: string;
    email: string;
    phone: string;
    address: string;
    dateOfBirth: string;
    nationality: string;
    vipStatus: 'Regular' | 'Silver' | 'Gold' | 'Platinum';
    totalStays: number;
    totalSpent: number;
    averageSpending: number;
    lastVisit: string;
    memberSince: string;
    stays: GuestStay[];
    preferences: GuestPreference[];
    complaints: Complaint[];
    notes: string;
}

interface GuestProfile360Props {
    guestId?: number;
    onClose: () => void;
}

const GuestProfile360 = ({ guestId, onClose }: GuestProfile360Props) => {
    const [activeTab, setActiveTab] = useState<'overview' | 'history' | 'preferences' | 'complaints'>('overview');

    const guest = useMemo<Guest>(() => {
        const allRes = getAllStoredReservations();
        const targetRes = (guestId ? allRes[guestId - 1] : allRes[0]) || allRes[0];
        const guestName = targetRes?.guestName || 'Valued Guest';
        const matchingStays = allRes.filter(r => r.guestName?.toLowerCase() === guestName.toLowerCase());
        const staysList: GuestStay[] = (matchingStays.length > 0 ? matchingStays : allRes.slice(0, 3)).map((r, idx) => {
            const nights = Math.max(1, Math.round((new Date(r.checkOut).getTime() - new Date(r.checkIn).getTime()) / 86400000));
            return {
                id: idx + 1,
                checkIn: r.checkIn,
                checkOut: r.checkOut,
                roomNumber: r.roomNo || '101',
                roomType: r.roomType || 'Deluxe Room',
                nights,
                totalSpent: Number(r.totalRate) || 0,
                status: r.status === 'CANCELLED' ? 'cancelled' : r.status === 'CONFIRMED' ? 'upcoming' : 'completed'
            };
        });
        const totalSpent = staysList.reduce((s, st) => s + st.totalSpent, 0);
        const totalStays = Math.max(1, staysList.length);

        return {
            id: guestId || 1,
            name: guestName,
            email: targetRes?.guestEmail || `${guestName.toLowerCase().replace(/[^a-z0-9]/g, '.')}@guest.com`,
            phone: targetRes?.guestPhone || '+880 1711-000000',
            address: 'Dhaka, Bangladesh',
            dateOfBirth: '1988-05-15',
            nationality: targetRes?.nationality || 'Bangladeshi',
            vipStatus: totalSpent > 80000 ? 'Platinum' : totalSpent > 40000 ? 'Gold' : 'Silver',
            totalStays,
            totalSpent,
            averageSpending: Math.round(totalSpent / totalStays),
            lastVisit: targetRes?.checkIn || new Date().toISOString().slice(0, 10),
            memberSince: '2024-01-15',
            stays: staysList,
            preferences: [
                { category: 'Room', items: [targetRes?.roomType || 'Deluxe', 'Non-Smoking', 'High Floor'] },
                { category: 'Amenities', items: ['Extra Pillows', 'High-Speed Wi-Fi', 'Coffee Machine'] },
                { category: 'Dietary', items: ['Halal Certified', 'Fresh Fruit Platter'] },
                { category: 'Services', items: ['Express Check-in', 'Airport Transfer'] },
            ],
            complaints: [],
            notes: targetRes?.notes || 'Guest profile synchronized from live reservation ledger.',
        };
    }, [guestId]);

    const getVIPColor = (status: Guest['vipStatus']) => {
        switch (status) {
            case 'Platinum': return 'from-purple-500 to-purple-700';
            case 'Gold': return 'from-yellow-500 to-yellow-600';
            case 'Silver': return 'from-gray-400 to-gray-500';
            default: return 'from-blue-500 to-blue-600';
        }
    };

    const getVIPBadge = (status: Guest['vipStatus']) => {
        switch (status) {
            case 'Platinum': return 'bg-purple-100 text-purple-700 border-purple-300';
            case 'Gold': return 'bg-yellow-100 text-yellow-700 border-yellow-300';
            case 'Silver': return 'bg-gray-100 text-gray-700 border-gray-300';
            default: return 'bg-blue-100 text-blue-700 border-blue-300';
        }
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'completed': return 'bg-emerald-100 text-emerald-700 border-emerald-200';
            case 'upcoming': return 'bg-blue-100 text-blue-700 border-blue-200';
            case 'cancelled': return 'bg-red-100 text-red-700 border-red-200';
            case 'resolved': return 'bg-emerald-100 text-emerald-700 border-emerald-200';
            case 'pending': return 'bg-amber-100 text-amber-700 border-amber-200';
            case 'escalated': return 'bg-red-100 text-red-700 border-red-200';
            default: return 'bg-gray-100 text-gray-700 border-gray-200';
        }
    };

    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-3xl shadow-2xl w-full max-w-6xl max-h-[90vh] overflow-hidden flex flex-col">
                {/* Header */}
                <div className={`bg-gradient-to-r ${getVIPColor(guest.vipStatus)} p-8 text-white relative overflow-hidden`}>
                    <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -mr-32 -mt-32" />
                    <div className="absolute bottom-0 left-0 w-48 h-48 bg-white/10 rounded-full -ml-24 -mb-24" />

                    <div className="relative z-10 flex items-start justify-between">
                        <div className="flex items-center gap-6">
                            <div className="w-24 h-24 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center border-4 border-white/30">
                                <User size={48} className="text-white" />
                            </div>
                            <div>
                                <div className="flex items-center gap-3 mb-2">
                                    <h2 className="text-3xl font-bold">{guest.name}</h2>
                                    <span className={`px-4 py-1.5 rounded-full text-sm font-bold border-2 ${getVIPBadge(guest.vipStatus)} bg-white`}>
                                        <Award size={14} className="inline mr-1" />
                                        {guest.vipStatus}
                                    </span>
                                </div>
                                <div className="flex items-center gap-6 text-white/90">
                                    <div className="flex items-center gap-2">
                                        <Mail size={16} />
                                        <span className="text-sm">{guest.email}</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <Phone size={16} />
                                        <span className="text-sm">{guest.phone}</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <MapPin size={16} />
                                        <span className="text-sm">{guest.nationality}</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <button
                            onClick={onClose}
                            className="w-10 h-10 bg-white/20 hover:bg-white/30 rounded-xl flex items-center justify-center transition-all"
                        >
                            <X size={20} />
                        </button>
                    </div>

                    {/* Quick Stats */}
                    <div className="grid grid-cols-4 gap-4 mt-8 relative z-10">
                        <div className="bg-white/20 backdrop-blur-sm rounded-xl p-4 border border-white/30">
                            <p className="text-white/80 text-xs font-medium mb-1">Total Stays</p>
                            <p className="text-2xl font-bold">{guest.totalStays}</p>
                        </div>
                        <div className="bg-white/20 backdrop-blur-sm rounded-xl p-4 border border-white/30">
                            <p className="text-white/80 text-xs font-medium mb-1">Total Spent</p>
                            <p className="text-2xl font-bold">৳ {guest.totalSpent.toLocaleString()}</p>
                        </div>
                        <div className="bg-white/20 backdrop-blur-sm rounded-xl p-4 border border-white/30">
                            <p className="text-white/80 text-xs font-medium mb-1">Avg. Spending</p>
                            <p className="text-2xl font-bold">৳ {guest.averageSpending.toLocaleString()}</p>
                        </div>
                        <div className="bg-white/20 backdrop-blur-sm rounded-xl p-4 border border-white/30">
                            <p className="text-white/80 text-xs font-medium mb-1">Member Since</p>
                            <p className="text-2xl font-bold">{new Date(guest.memberSince).getFullYear()}</p>
                        </div>
                    </div>
                </div>

                {/* Tabs */}
                <div className="bg-gray-50 border-b border-gray-200 px-8 flex gap-2">
                    {[
                        { id: 'overview', label: 'Overview', icon: <User size={16} /> },
                        { id: 'history', label: 'Stay History', icon: <Calendar size={16} /> },
                        { id: 'preferences', label: 'Preferences', icon: <Heart size={16} /> },
                        { id: 'complaints', label: 'Complaints', icon: <MessageSquare size={16} /> },
                    ].map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id as any)}
                            className={`px-6 py-4 font-semibold text-sm flex items-center gap-2 border-b-2 transition-all ${activeTab === tab.id
                                ? 'border-blue-600 text-blue-600'
                                : 'border-transparent text-gray-500 hover:text-gray-700'
                                }`}
                        >
                            {tab.icon}
                            {tab.label}
                        </button>
                    ))}
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-8">
                    {activeTab === 'overview' && (
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                            {/* Personal Information */}
                            <div className="bg-gradient-to-br from-blue-50 to-blue-100/50 rounded-2xl p-6 border border-blue-200">
                                <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                                    <User size={20} className="text-blue-600" />
                                    Personal Information
                                </h3>
                                <div className="space-y-3">
                                    <div className="flex justify-between">
                                        <span className="text-sm text-gray-600">Date of Birth</span>
                                        <span className="text-sm font-semibold text-gray-900">{guest.dateOfBirth}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-sm text-gray-600">Nationality</span>
                                        <span className="text-sm font-semibold text-gray-900">{guest.nationality}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-sm text-gray-600">Address</span>
                                        <span className="text-sm font-semibold text-gray-900 text-right max-w-xs">{guest.address}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-sm text-gray-600">Last Visit</span>
                                        <span className="text-sm font-semibold text-gray-900">{guest.lastVisit}</span>
                                    </div>
                                </div>
                            </div>

                            {/* Spending Analytics */}
                            <div className="bg-gradient-to-br from-emerald-50 to-emerald-100/50 rounded-2xl p-6 border border-emerald-200">
                                <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                                    <TrendingUp size={20} className="text-emerald-600" />
                                    Spending Analytics
                                </h3>
                                <div className="space-y-4">
                                    <div>
                                        <div className="flex justify-between mb-2">
                                            <span className="text-sm text-gray-600">Lifetime Value</span>
                                            <span className="text-lg font-bold text-emerald-600">৳ {guest.totalSpent.toLocaleString()}</span>
                                        </div>
                                        <div className="w-full bg-emerald-200 rounded-full h-2">
                                            <div className="bg-gradient-to-r from-emerald-500 to-emerald-600 h-2 rounded-full" style={{ width: '75%' }} />
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-2 gap-3">
                                        <div className="bg-white rounded-xl p-3 border border-emerald-200">
                                            <p className="text-xs text-gray-600 mb-1">Avg. per Stay</p>
                                            <p className="text-lg font-bold text-gray-900">৳ {guest.averageSpending.toLocaleString()}</p>
                                        </div>
                                        <div className="bg-white rounded-xl p-3 border border-emerald-200">
                                            <p className="text-xs text-gray-600 mb-1">Total Nights</p>
                                            <p className="text-lg font-bold text-gray-900">{guest.stays.reduce((sum, stay) => sum + stay.nights, 0)}</p>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Special Notes */}
                            <div className="lg:col-span-2 bg-gradient-to-br from-amber-50 to-amber-100/50 rounded-2xl p-6 border border-amber-200">
                                <h3 className="text-lg font-bold text-gray-900 mb-3 flex items-center gap-2">
                                    <AlertCircle size={20} className="text-amber-600" />
                                    Special Notes & Alerts
                                </h3>
                                <p className="text-sm text-gray-700 leading-relaxed">{guest.notes}</p>
                            </div>
                        </div>
                    )}

                    {activeTab === 'history' && (
                        <div className="space-y-4">
                            {guest.stays.map(stay => (
                                <div key={stay.id} className="bg-white rounded-2xl border border-gray-200 p-6 hover:shadow-lg transition-all">
                                    <div className="flex items-start justify-between mb-4">
                                        <div className="flex items-center gap-4">
                                            <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
                                                <Building2 size={24} className="text-blue-600" />
                                            </div>
                                            <div>
                                                <h4 className="text-lg font-bold text-gray-900">{stay.roomType}</h4>
                                                <p className="text-sm text-gray-500">Room {stay.roomNumber}</p>
                                            </div>
                                        </div>
                                        <span className={`px-3 py-1.5 rounded-full text-xs font-bold border ${getStatusColor(stay.status)}`}>
                                            {stay.status}
                                        </span>
                                    </div>
                                    <div className="grid grid-cols-3 gap-4">
                                        <div>
                                            <p className="text-xs text-gray-500 mb-1">Check-in</p>
                                            <p className="text-sm font-semibold text-gray-900">{stay.checkIn}</p>
                                        </div>
                                        <div>
                                            <p className="text-xs text-gray-500 mb-1">Check-out</p>
                                            <p className="text-sm font-semibold text-gray-900">{stay.checkOut}</p>
                                        </div>
                                        <div>
                                            <p className="text-xs text-gray-500 mb-1">Total Spent</p>
                                            <p className="text-sm font-bold text-emerald-600">
                                                {stay.totalSpent > 0 ? `৳ ${stay.totalSpent.toLocaleString()}` : 'Upcoming'}
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}

                    {activeTab === 'preferences' && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {guest.preferences.map((pref, idx) => (
                                <div key={idx} className="bg-gradient-to-br from-purple-50 to-purple-100/50 rounded-2xl p-6 border border-purple-200">
                                    <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                                        <Star size={18} className="text-purple-600" />
                                        {pref.category}
                                    </h3>
                                    <div className="flex flex-wrap gap-2">
                                        {pref.items.map((item, i) => (
                                            <span key={i} className="px-3 py-1.5 bg-white rounded-lg text-sm font-medium text-gray-700 border border-purple-200">
                                                {item}
                                            </span>
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}

                    {activeTab === 'complaints' && (
                        <div className="space-y-4">
                            {guest.complaints.length > 0 ? (
                                guest.complaints.map(complaint => (
                                    <div key={complaint.id} className="bg-white rounded-2xl border border-gray-200 p-6">
                                        <div className="flex items-start justify-between mb-3">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center">
                                                    <AlertCircle size={20} className="text-red-600" />
                                                </div>
                                                <div>
                                                    <h4 className="font-bold text-gray-900">{complaint.issue}</h4>
                                                    <p className="text-xs text-gray-500 flex items-center gap-1">
                                                        <Clock size={12} />
                                                        {complaint.date}
                                                    </p>
                                                </div>
                                            </div>
                                            <span className={`px-3 py-1 rounded-full text-xs font-bold border ${getStatusColor(complaint.status)}`}>
                                                {complaint.status}
                                            </span>
                                        </div>
                                        {complaint.resolution && (
                                            <div className="bg-emerald-50 rounded-lg p-3 border border-emerald-200">
                                                <p className="text-xs font-semibold text-emerald-700 mb-1">Resolution</p>
                                                <p className="text-sm text-gray-700">{complaint.resolution}</p>
                                            </div>
                                        )}
                                    </div>
                                ))
                            ) : (
                                <div className="text-center py-12">
                                    <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                        <Star size={32} className="text-emerald-600" />
                                    </div>
                                    <h3 className="text-lg font-bold text-gray-700 mb-2">No Complaints</h3>
                                    <p className="text-sm text-gray-500">This guest has a perfect satisfaction record!</p>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* Footer Actions */}
                <div className="bg-gray-50 border-t border-gray-200 p-6 flex items-center justify-between">
                    <button className="px-6 py-3 bg-white border border-gray-300 text-gray-700 rounded-xl font-semibold hover:bg-gray-50 transition-all">
                        Edit Profile
                    </button>
                    <div className="flex gap-3">
                        <button className="px-6 py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-xl font-semibold hover:from-blue-700 hover:to-blue-800 transition-all shadow-lg shadow-blue-600/30 flex items-center gap-2">
                            New Booking
                            <ChevronRight size={18} />
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default GuestProfile360;
