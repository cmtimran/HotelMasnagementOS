import React, { useState, useEffect } from 'react';
import {
    Ticket, Search, Plus, QrCode, CheckCircle2,
    Printer, Coffee, Sparkles, Car, Plane, Utensils,
    ShieldCheck
} from 'lucide-react';
import { getAllStoredReservations, syncReservationsFromDB, type StoredReservation } from '../utils/roomInventoryEngine';

export interface GuestVoucher {
    id: string;
    voucherCode: string;
    guestName: string;
    roomNumber: string;
    serviceCategory: 'Breakfast' | 'F&B Dining' | 'Spa & Wellness' | 'Airport Transport' | 'Airport Pickup' | 'Airport Drop' | 'VIP Lounge';
    serviceName: string;
    benefitDetails: string;
    paxCount: number;
    issueDate: string;
    expiryDate: string;
    status: 'ACTIVE' | 'REDEEMED' | 'EXPIRED';
    redeemedAt?: string;
    redeemedBy?: string;
}

const deriveVouchersFromReservations = (reservations: StoredReservation[]): GuestVoucher[] => {
    const list: GuestVoucher[] = [];
    reservations.forEach((res: any, idx) => {
        const st = String(res?.status || '').toLowerCase();
        if (st === 'cancelled' || st === 'voided') return;
        const guestName = res?.guest?.fullName || res?.guestName || 'Guest';
        const rooms = Array.isArray(res?.rooms) ? res.rooms : Array.isArray(res?.roomsList) ? res.roomsList : [];
        const firstRoom = rooms[0] || {};
        const roomNo = firstRoom?.roomNo || firstRoom?.roomNumber || res?.roomNumber || '101';
        const checkIn = firstRoom?.checkIn || firstRoom?.checkInDate || res?.checkIn || '2026-07-01';
        const checkOut = firstRoom?.checkOut || firstRoom?.checkOutDate || res?.checkOut || '2026-07-03';
        const paxCount = Math.max(1, (Number(firstRoom?.adults ?? res?.adults) || 1) + (Number(firstRoom?.children ?? res?.children) || 0));
        const resNo = String(res?.reservationNumber || `RES-${res?.id || idx}`);

        // Complimentary Breakfast Voucher for every active/confirmed stay
        list.push({
            id: `vch-bf-${res?.id || idx}`,
            voucherCode: `VCH-${resNo.slice(-4)}-BF`,
            guestName,
            roomNumber: roomNo,
            serviceCategory: 'Breakfast',
            serviceName: 'Complimentary International Buffet Breakfast',
            benefitDetails: 'Full buffet spread at The Grand Restaurant (06:30 - 10:30 AM)',
            paxCount,
            issueDate: checkIn,
            expiryDate: checkOut,
            status: st === 'checked out' || st === 'checked-out' ? 'REDEEMED' : 'ACTIVE',
            ...(st === 'checked out' || st === 'checked-out' ? { redeemedAt: `${checkIn} 08:45`, redeemedBy: 'F&B Host Desk' } : {})
        });

        // Add-on specific vouchers from reservation services
        (res?.services || []).forEach((srv: any, sIdx: number) => {
            const nameLower = String(srv?.name || '').toLowerCase();
            let cat: GuestVoucher['serviceCategory'] = 'F&B Dining';
            if (nameLower.includes('pickup')) cat = 'Airport Pickup';
            else if (nameLower.includes('drop') || nameLower.includes('transfer')) cat = 'Airport Drop';
            else if (nameLower.includes('spa') || nameLower.includes('massage')) cat = 'Spa & Wellness';
            else if (nameLower.includes('lounge')) cat = 'VIP Lounge';
            else if (nameLower.includes('breakfast')) cat = 'Breakfast';

            list.push({
                id: `vch-srv-${res?.id || idx}-${sIdx}`,
                voucherCode: `VCH-${resNo.slice(-4)}-S${sIdx + 1}`,
                guestName,
                roomNumber: roomNo,
                serviceCategory: cat,
                serviceName: srv?.name || 'Add-on Service',
                benefitDetails: `Included package entitlement (${srv?.Rule || 'Standard'})`,
                paxCount: Number(srv?.qty) || paxCount,
                issueDate: checkIn,
                expiryDate: checkOut,
                status: idx % 3 === 1 ? 'REDEEMED' : 'ACTIVE',
                ...(idx % 3 === 1 ? { redeemedAt: `${checkIn} 14:20`, redeemedBy: 'Concierge Desk' } : {})
            });
        });
    });
    return list;
};

export const GuestVoucherSystem: React.FC = () => {
    const [vouchers, setVouchers] = useState<GuestVoucher[]>(() => {
        const derived = deriveVouchersFromReservations(getAllStoredReservations());
        if (derived.length > 0) return derived;
        const saved = localStorage.getItem('hotel_vouchers_v2');
        return saved ? JSON.parse(saved) : [];
    });

    const [searchQuery, setSearchQuery] = useState('');
    const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
    const [selectedStatus, setSelectedStatus] = useState<string>('ALL');
    const [printVoucher, setPrintVoucher] = useState<GuestVoucher | null>(null);
    const [showIssueModal, setShowIssueModal] = useState(false);
    const [toastMessage, setToastMessage] = useState<string | null>(null);

    const firstActiveRes = getAllStoredReservations()[0];
    const [issueForm, setIssueForm] = useState({
        guestName: firstActiveRes?.guest?.fullName || '',
        roomNumber: firstActiveRes?.rooms?.[0]?.roomNo || '101',
        serviceCategory: 'Breakfast' as GuestVoucher['serviceCategory'],
        serviceName: 'Complimentary Buffet Breakfast',
        benefitDetails: 'Valid at main restaurant during regular hours',
        paxCount: 2,
        expiryDate: firstActiveRes?.rooms?.[0]?.checkOut || new Date().toISOString().split('T')[0]
    });

    useEffect(() => {
        syncReservationsFromDB().then(latest => {
            if (latest && latest.length > 0) {
                const derived = deriveVouchersFromReservations(latest);
                if (derived.length > 0) setVouchers(derived);
            }
        }).catch(() => {});
    }, []);

    useEffect(() => {
        localStorage.setItem('hotel_vouchers_v2', JSON.stringify(vouchers));
    }, [vouchers]);

    const showToast = (msg: string) => {
        setToastMessage(msg);
        setTimeout(() => setToastMessage(null), 3500);
    };

    const handleRedeem = (id: string) => {
        setVouchers(prev => prev.map(v => {
            if (v.id === id) {
                return {
                    ...v,
                    status: 'REDEEMED',
                    redeemedAt: new Date().toLocaleString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }),
                    redeemedBy: 'Front Desk - Imran'
                };
            }
            return v;
        }));
        showToast('Voucher verified & redeemed successfully!');
    };

    const handleIssueVoucher = (e: React.FormEvent) => {
        e.preventDefault();
        const newVoucher: GuestVoucher = {
            id: String(Date.now()),
            voucherCode: `VCH-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`,
            guestName: issueForm.guestName,
            roomNumber: issueForm.roomNumber,
            serviceCategory: issueForm.serviceCategory,
            serviceName: issueForm.serviceName,
            benefitDetails: issueForm.benefitDetails,
            paxCount: issueForm.paxCount,
            issueDate: new Date().toISOString().slice(0, 10),
            expiryDate: issueForm.expiryDate,
            status: 'ACTIVE'
        };

        setVouchers(prev => [newVoucher, ...prev]);
        setShowIssueModal(false);
        showToast(`Issued Voucher ${newVoucher.voucherCode} for Room ${newVoucher.roomNumber}`);
    };

    const filtered = vouchers.filter(v => {
        const matchesQuery =
            v.voucherCode.toLowerCase().includes(searchQuery.toLowerCase()) ||
            v.guestName.toLowerCase().includes(searchQuery.toLowerCase()) ||
            v.roomNumber.includes(searchQuery) ||
            v.serviceName.toLowerCase().includes(searchQuery.toLowerCase());

        const matchesCat =
            selectedCategory === 'ALL' || v.serviceCategory === selectedCategory;

        const matchesStat =
            selectedStatus === 'ALL' || v.status === selectedStatus;

        return matchesQuery && matchesCat && matchesStat;
    });

    const activeCount = vouchers.filter(v => v.status === 'ACTIVE').length;
    const redeemedCount = vouchers.filter(v => v.status === 'REDEEMED').length;

    const getCategoryIcon = (category: GuestVoucher['serviceCategory']) => {
        switch (category) {
            case 'Breakfast': return <Coffee size={14} className="text-amber-600" />;
            case 'F&B Dining': return <Utensils size={14} className="text-orange-600" />;
            case 'Spa & Wellness': return <Sparkles size={14} className="text-purple-600" />;
            case 'Airport Transport': return <Car size={14} className="text-blue-600" />;
            case 'Airport Pickup': return <Car size={14} className="text-blue-600" />;
            case 'Airport Drop': return <Plane size={14} className="text-sky-600" />;
            case 'VIP Lounge': return <ShieldCheck size={14} className="text-emerald-600" />;
        }
    };

    return (
        <div className="h-full min-h-[calc(100vh-48px)] bg-gray-50 flex flex-col font-sans text-xs select-none animate-in fade-in duration-150">
            {toastMessage && (
                <div className="fixed top-4 right-4 z-50 bg-gray-900 text-white px-3.5 py-2 rounded-lg shadow-lg border border-gray-700 text-xs font-semibold flex items-center gap-2">
                    <CheckCircle2 size={14} className="text-emerald-400" />
                    <span>{toastMessage}</span>
                </div>
            )}

            {/* Header */}
            <header className="bg-white border-b border-slate-200/90 px-4 py-3 flex items-center justify-between shadow-2xs z-20">
                <div className="flex items-center gap-3">
                    <div className="size-10 rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center justify-center shrink-0">
                        <Ticket size={18} />
                    </div>
                    <div>
                        <div className="flex items-center gap-2">
                            <h1 className="text-base font-bold text-slate-900 tracking-tight">
                                Digital Guest Service Vouchers & Passes
                            </h1>
                            <span className="badge-status-active">
                                In-Stay Privileges
                            </span>
                        </div>
                        <p className="text-xs text-slate-500 mt-0.5">
                            Issuance and real-time QR redemption of breakfast passes, dining coupons, spa sessions, and airport transfers.
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    <button
                        onClick={() => setShowIssueModal(true)}
                        className="btn-primary"
                    >
                        <Plus size={14} />
                        <span>Issue Voucher Pass</span>
                    </button>
                    <button
                        onClick={() => window.print()}
                        className="btn-secondary"
                    >
                        <Printer size={13} />
                        <span>Print Sheet</span>
                    </button>
                </div>
            </header>

            {/* Top KPI Metrics */}
            <div className="bg-white border-b border-slate-200 px-4 py-3 grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div className="card-container p-3 flex justify-between items-center">
                    <div>
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Active Valid Vouchers</span>
                        <p className="text-lg font-black text-emerald-700 mt-0.5 font-mono">{activeCount} <span className="text-xs font-normal text-slate-400">Passes</span></p>
                    </div>
                    <div className="size-9 rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-100 flex items-center justify-center">
                        <Ticket size={16} />
                    </div>
                </div>

                <div className="card-container p-3 flex justify-between items-center">
                    <div>
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Redeemed Today</span>
                        <p className="text-lg font-black text-slate-900 mt-0.5 font-mono">{redeemedCount} <span className="text-xs font-normal text-slate-400">Used</span></p>
                    </div>
                    <div className="size-9 rounded-xl bg-blue-50 text-primary border border-blue-100 flex items-center justify-center">
                        <CheckCircle2 size={16} />
                    </div>
                </div>

                <div className="bg-gray-50/80 p-2 rounded-lg border border-gray-200/90 flex justify-between items-center">
                    <div>
                        <span className="text-[9.5px] font-bold text-gray-400 uppercase">Total Issued</span>
                        <p className="text-base font-bold text-gray-900 mt-0.5">{vouchers.length} <span className="text-[10px] text-gray-400 font-normal">Passes</span></p>
                    </div>
                    <div className="w-7 h-7 rounded bg-purple-50 text-purple-600 flex items-center justify-center">
                        <QrCode size={14} />
                    </div>
                </div>

                <div className="bg-gray-50/80 p-2 rounded-lg border border-gray-200/90 flex justify-between items-center">
                    <div>
                        <span className="text-[9.5px] font-bold text-gray-400 uppercase">Redemption Rate</span>
                        <p className="text-base font-bold text-blue-700 mt-0.5">
                            {Math.round((redeemedCount / (vouchers.length || 1)) * 100)}%
                        </p>
                    </div>
                    <span className="text-[9.5px] text-gray-400 uppercase">Live Pacing</span>
                </div>
            </div>

            {/* Filter and Search Bar */}
            <div className="bg-white rounded-none border-b border-gray-200 px-3.5 py-1.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="flex items-center gap-2 flex-wrap">
                    <div className="flex items-center bg-gray-100 p-0.5 rounded border border-gray-200 text-[11px]">
                        {['ALL', 'Breakfast', 'Spa & Wellness', 'Airport Pickup', 'Airport Drop', 'VIP Lounge', 'F&B Dining'].map(cat => (
                            <button
                                key={cat}
                                onClick={() => setSelectedCategory(cat)}
                                className={`h-6 px-2.5 rounded font-semibold cursor-pointer transition-colors ${
                                    selectedCategory === cat ? 'bg-white text-gray-900 shadow-2xs' : 'text-gray-500 hover:text-gray-900'
                                }`}
                            >
                                {cat === 'ALL' ? 'All Services' : cat}
                            </button>
                        ))}
                    </div>

                    <div className="flex items-center gap-1">
                        {['ALL', 'ACTIVE', 'REDEEMED'].map(stat => (
                            <button
                                key={stat}
                                onClick={() => setSelectedStatus(stat)}
                                className={`h-6 px-2 rounded text-[10.5px] font-semibold cursor-pointer transition-colors ${
                                    selectedStatus === stat ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                }`}
                            >
                                {stat}
                            </button>
                        ))}
                    </div>
                </div>

                <div className="relative">
                    <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input
                        type="text"
                        placeholder="Search voucher code, guest, room..."
                        value={searchQuery}
                        onChange={e => setSearchQuery(e.target.value)}
                        className="h-7 pl-7 pr-2.5 text-[11px] border border-gray-200 rounded-md bg-white outline-none w-56 sm:w-64 focus:border-emerald-500"
                    />
                </div>
            </div>

            {/* Vouchers Grid */}
            <div className="flex-1 p-3.5 overflow-y-auto">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                    {filtered.map(v => {
                        const isActive = v.status === 'ACTIVE';
                        return (
                            <div
                                key={v.id}
                                className={`bg-white rounded-xl border transition-all shadow-2xs overflow-hidden flex flex-col justify-between ${
                                    isActive ? 'border-gray-200 hover:border-emerald-300' : 'border-gray-200/60 opacity-80'
                                }`}
                            >
                                {/* Pass Top Strip */}
                                <div className="p-3 bg-gray-50/70 border-b border-gray-100 flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <div className="w-6 h-6 rounded bg-white border border-gray-200 flex items-center justify-center">
                                            {getCategoryIcon(v.serviceCategory)}
                                        </div>
                                        <div>
                                            <span className="font-mono font-bold text-gray-900 text-xs">{v.voucherCode}</span>
                                            <span className="text-[10px] text-gray-400 block -mt-0.5">{v.serviceCategory}</span>
                                        </div>
                                    </div>

                                    <span className={`px-2 py-0.5 rounded text-[9.5px] font-bold ${
                                        isActive ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-gray-100 text-gray-600'
                                    }`}>
                                        {v.status}
                                    </span>
                                </div>

                                {/* Pass Body */}
                                <div className="p-3 space-y-2">
                                    <h4 className="font-bold text-gray-900 text-xs leading-snug">{v.serviceName}</h4>
                                    <p className="text-[11px] text-gray-500 leading-normal">{v.benefitDetails}</p>

                                    <div className="bg-gray-50 p-2 rounded-lg border border-gray-100 flex justify-between items-center text-[10.5px]">
                                        <div>
                                            <span className="text-gray-400 text-[9px] uppercase font-bold block">Assigned Guest</span>
                                            <span className="font-bold text-gray-900">{v.guestName}</span>
                                        </div>
                                        <div className="text-right">
                                            <span className="text-gray-400 text-[9px] uppercase font-bold block">Room & Pax</span>
                                            <span className="font-mono font-bold text-gray-900">Rm {v.roomNumber} ({v.paxCount} Pax)</span>
                                        </div>
                                    </div>

                                    <div className="flex justify-between items-center text-[10px] text-gray-400 font-mono pt-1">
                                        <span>Issued: {v.issueDate}</span>
                                        <span>Valid until: {v.expiryDate}</span>
                                    </div>

                                    {v.redeemedAt && (
                                        <div className="text-[10px] text-emerald-700 bg-emerald-50 p-1.5 rounded border border-emerald-100">
                                            Redeemed: {v.redeemedAt} by {v.redeemedBy}
                                        </div>
                                    )}
                                </div>

                                {/* Pass Footer Action Strip */}
                                <div className="p-2 bg-gray-50/50 border-t border-gray-100 flex items-center justify-between">
                                    <button
                                        onClick={() => setPrintVoucher(v)}
                                        className="h-6 px-2 text-[10.5px] font-semibold text-gray-600 hover:text-gray-900 flex items-center gap-1 cursor-pointer"
                                    >
                                        <Printer size={11} />
                                        <span>Print Pass</span>
                                    </button>

                                    {isActive ? (
                                        <button
                                            onClick={() => handleRedeem(v.id)}
                                            className="h-6 px-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-[10.5px] font-bold flex items-center gap-1 shadow-2xs cursor-pointer transition-colors"
                                        >
                                            <CheckCircle2 size={11} />
                                            <span>Redeem Pass</span>
                                        </button>
                                    ) : (
                                        <span className="text-[10px] text-gray-400 font-semibold px-2">
                                            Redeemed
                                        </span>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Issue Voucher Modal */}
            {showIssueModal && (
                <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-3 animate-in fade-in duration-100">
                    <div className="bg-white rounded-xl shadow-2xl border border-gray-200 max-w-md w-full p-4 space-y-3">
                        <div className="flex items-center justify-between pb-2 border-b border-gray-200">
                            <h3 className="text-sm font-bold text-gray-900">Issue Digital Guest Voucher</h3>
                            <button onClick={() => setShowIssueModal(false)} className="text-gray-400 hover:text-gray-700">✕</button>
                        </div>

                        <form onSubmit={handleIssueVoucher} className="space-y-2.5">
                            <div className="grid grid-cols-2 gap-2">
                                <div>
                                    <label className="block text-[10.5px] font-semibold text-gray-700 mb-1">Guest Name</label>
                                    <input
                                        type="text"
                                        value={issueForm.guestName}
                                        onChange={e => setIssueForm({ ...issueForm, guestName: e.target.value })}
                                        className="w-full h-7 px-2 border border-gray-300 rounded text-xs outline-none focus:border-emerald-500"
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="block text-[10.5px] font-semibold text-gray-700 mb-1">Room Number</label>
                                    <input
                                        type="text"
                                        value={issueForm.roomNumber}
                                        onChange={e => setIssueForm({ ...issueForm, roomNumber: e.target.value })}
                                        className="w-full h-7 px-2 border border-gray-300 rounded text-xs outline-none focus:border-emerald-500 font-mono"
                                        required
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-2">
                                <div>
                                    <label className="block text-[10.5px] font-semibold text-gray-700 mb-1">Service Category</label>
                                    <select
                                        value={issueForm.serviceCategory}
                                        onChange={e => setIssueForm({ ...issueForm, serviceCategory: e.target.value as any })}
                                        className="w-full h-7 px-2 border border-gray-300 rounded text-xs outline-none focus:border-emerald-500"
                                    >
                                        <option value="Breakfast">Breakfast Coupon</option>
                                        <option value="Spa & Wellness">Spa & Wellness Pass</option>
                                        <option value="Airport Pickup">Airport Pickup Transfer (Inbound)</option>
                                        <option value="Airport Drop">Airport Drop Transfer (Outbound)</option>
                                        <option value="VIP Lounge">VIP Club Lounge Pass</option>
                                        <option value="F&B Dining">F&B Restaurant Voucher</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-[10.5px] font-semibold text-gray-700 mb-1">Pax Count</label>
                                    <input
                                        type="number"
                                        min={1}
                                        max={10}
                                        value={issueForm.paxCount}
                                        onChange={e => setIssueForm({ ...issueForm, paxCount: parseInt(e.target.value) || 1 })}
                                        className="w-full h-7 px-2 border border-gray-300 rounded text-xs outline-none focus:border-emerald-500"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-[10.5px] font-semibold text-gray-700 mb-1">Service Title</label>
                                <input
                                    type="text"
                                    value={issueForm.serviceName}
                                    onChange={e => setIssueForm({ ...issueForm, serviceName: e.target.value })}
                                    className="w-full h-7 px-2 border border-gray-300 rounded text-xs outline-none focus:border-emerald-500"
                                    required
                                />
                            </div>

                            <div>
                                <label className="block text-[10.5px] font-semibold text-gray-700 mb-1">Benefit Details & Terms</label>
                                <textarea
                                    value={issueForm.benefitDetails}
                                    onChange={e => setIssueForm({ ...issueForm, benefitDetails: e.target.value })}
                                    className="w-full px-2 py-1.5 border border-gray-300 rounded text-xs outline-none focus:border-emerald-500"
                                    rows={2}
                                />
                            </div>

                            <div>
                                <label className="block text-[10.5px] font-semibold text-gray-700 mb-1">Valid Until (Expiry Date)</label>
                                <input
                                    type="date"
                                    value={issueForm.expiryDate}
                                    onChange={e => setIssueForm({ ...issueForm, expiryDate: e.target.value })}
                                    className="w-full h-7 px-2 border border-gray-300 rounded text-xs outline-none focus:border-emerald-500"
                                />
                            </div>

                            <div className="flex justify-end gap-2 pt-2 border-t border-gray-200">
                                <button
                                    type="button"
                                    onClick={() => setShowIssueModal(false)}
                                    className="h-7 px-3 border border-gray-300 rounded text-xs font-semibold hover:bg-gray-50"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="h-7 px-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-xs font-semibold"
                                >
                                    Issue Pass
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Print Voucher Modal */}
            {printVoucher && (
                <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-3 animate-in fade-in duration-100">
                    <div className="bg-white rounded-xl shadow-2xl border border-gray-200 max-w-sm w-full p-5 space-y-4">
                        <div className="text-center border-b border-gray-200 pb-3">
                            <h3 className="text-sm font-bold text-gray-900 uppercase">Grand Hotel Hospitality</h3>
                            <p className="text-[10px] text-gray-500">Official Guest Service Privilege Pass</p>
                            <span className="font-mono font-bold text-xs text-emerald-700 mt-1 block">
                                {printVoucher.voucherCode}
                            </span>
                        </div>

                        <div className="space-y-2 text-xs">
                            <div className="bg-gray-50 p-2.5 rounded border border-gray-200">
                                <p className="font-bold text-gray-900">{printVoucher.serviceName}</p>
                                <p className="text-[10.5px] text-gray-600 mt-0.5">{printVoucher.benefitDetails}</p>
                            </div>

                            <div className="flex justify-between items-center text-xs">
                                <span className="text-gray-500">Guest Name:</span>
                                <span className="font-bold text-gray-900">{printVoucher.guestName}</span>
                            </div>
                            <div className="flex justify-between items-center text-xs">
                                <span className="text-gray-500">Room Number:</span>
                                <span className="font-bold font-mono text-gray-900">Room {printVoucher.roomNumber}</span>
                            </div>
                            <div className="flex justify-between items-center text-xs">
                                <span className="text-gray-500">Valid Until:</span>
                                <span className="font-mono text-gray-900">{printVoucher.expiryDate}</span>
                            </div>
                        </div>

                        <div className="border-t border-dashed border-gray-200 pt-3 flex flex-col items-center justify-center space-y-1">
                            <QrCode size={48} className="text-gray-700" />
                            <span className="text-[9px] text-gray-400 font-mono">Present code to outlet attendant to redeem</span>
                        </div>

                        <div className="flex justify-end gap-2 pt-2 border-t border-gray-200">
                            <button
                                onClick={() => setPrintVoucher(null)}
                                className="h-7 px-3 border border-gray-300 rounded text-xs font-semibold hover:bg-gray-50"
                            >
                                Close
                            </button>
                            <button
                                onClick={() => window.print()}
                                className="h-7 px-3 bg-gray-900 hover:bg-gray-800 text-white rounded text-xs font-semibold flex items-center gap-1"
                            >
                                <Printer size={12} />
                                <span>Print Pass</span>
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default GuestVoucherSystem;
