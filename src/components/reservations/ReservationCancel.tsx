import React, { useState, useEffect } from 'react';
import {
    XCircle,
    Search,
    RotateCcw,
    CheckCircle2,
    DollarSign,
    Printer,
    FileSpreadsheet,
    ShieldAlert,
    FileText
} from 'lucide-react';
import PageHeader from '../common/PageHeader';
import { updateReservationStatusInDB, broadcastPMSEvent, saveStoredReservations, getAllStoredReservations } from '../../utils/roomInventoryEngine';

export interface CancelledItem {
    id: number;
    reservationNumber: string;
    guestName: string;
    phone: string;
    email: string;
    roomType: string;
    roomNumber?: string;
    stayDates: string;
    checkIn: string;
    checkOut: string;
    nights: number;
    cancellationDate: string;
    reason: string;
    reasonCategory: 'Guest Request' | 'Flight/Weather' | 'Corporate Postponement' | 'No-Show Forfeiture' | 'OTA Cancellation';
    cancelledBy: string;
    retentionFeeBDT: number;
    originalTotalBDT: number;
    refundStatus: 'Full Refund Processed' | 'Non-Refundable Retained' | 'Partial 50% Fee Applied';
    refundMethod: 'Original Payment' | 'City Ledger Credit' | 'Retained in GL-4501' | 'MFS bKash Refund';
}

export const ReservationCancel: React.FC = () => {
    const [toastMessage, setToastMessage] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
    const [selectedRefundFilter, setSelectedRefundFilter] = useState<string>('ALL');
    const [viewVoucherItem, setViewVoucherItem] = useState<CancelledItem | null>(null);

    const showToast = (msg: string) => {
        setToastMessage(msg);
        setTimeout(() => setToastMessage(null), 3500);
    };

    // Derive live cancellations from central database/store
    const deriveLiveCancelled = (): CancelledItem[] => {
        try {
            const stored = getAllStoredReservations();
            const list: CancelledItem[] = [];
            stored.forEach((res: any, index: number) => {
                const st = String(res?.status || '').toLowerCase();
                if (st === 'cancelled' || st === 'voided') {
                    list.push({
                        id: Number(res?.id) || index + 1,
                        reservationNumber: res?.reservationNumber || `RES-${res?.id}`,
                        guestName: res?.guestName || res?.guest?.fullName || 'Valued Guest',
                        phone: res?.phone || res?.guest?.phone || '',
                        email: res?.email || res?.guest?.email || '',
                        roomType: res?.roomType || 'Deluxe Room',
                        roomNumber: res?.roomNumber,
                        stayDates: `${res?.checkIn || '2026-07-01'} → ${res?.checkOut || '2026-07-02'}`,
                        checkIn: res?.checkIn || '2026-07-01',
                        checkOut: res?.checkOut || '2026-07-02',
                        nights: Number(res?.nights) || 1,
                        cancellationDate: res?.cancelledAt || res?.updatedAt || '2026-07-01 12:00',
                        reason: res?.cancellationReason || 'Cancelled by guest request',
                        reasonCategory: 'Guest Request',
                        cancelledBy: res?.cancelledBy || 'Front Office Staff',
                        retentionFeeBDT: Number(res?.retentionFee) || 0,
                        originalTotalBDT: Number(res?.totalAmount) || 0,
                        refundStatus: 'Full Refund Processed',
                        refundMethod: 'Original Payment'
                    });
                }
            });
            return list;
        } catch {
            return [];
        }
    };

    // Hydrate state from database and local storage - Zero Mock Fallback
    const [cancelledList, setCancelledList] = useState<CancelledItem[]>(() => {
        const liveList = deriveLiveCancelled();
        if (liveList.length > 0) return liveList;

        try {
            const saved = localStorage.getItem('hotel_cancelled_v2');
            if (saved) {
                const parsed = JSON.parse(saved);
                if (Array.isArray(parsed) && parsed.length > 0) {
                    const cleaned = parsed
                        .filter((c: any) => !String(c.reservationNumber || '').startsWith('RES-00918'))
                        .map((c: any, index: number) => ({
                            id: c.id || index + 1,
                            reservationNumber: c.reservationNumber || `RES-${index}`,
                            guestName: c.guestName || 'Valued Guest',
                            phone: c.phone || '+880 1712-000000',
                            email: c.email || 'guest@hospitality.com',
                            roomType: c.roomType || 'Deluxe Room',
                            roomNumber: c.roomNumber || undefined,
                            stayDates: c.stayDates || '2026-07-01 → 2026-07-02',
                            checkIn: c.checkIn || '2026-07-01',
                            checkOut: c.checkOut || '2026-07-02',
                            nights: typeof c.nights === 'number' ? c.nights : 1,
                            cancellationDate: c.cancellationDate || '2026-07-01 12:00',
                            reason: c.reason || 'Reservation cancelled by guest request.',
                            reasonCategory: c.reasonCategory || 'Guest Request',
                            cancelledBy: c.cancelledBy || 'Front Office Supervisor',
                            retentionFeeBDT: typeof c.retentionFeeBDT === 'number' ? c.retentionFeeBDT : 0,
                            originalTotalBDT: typeof c.originalTotalBDT === 'number' ? c.originalTotalBDT : 0,
                            refundStatus: c.refundStatus || 'Full Refund Processed',
                            refundMethod: c.refundMethod || 'Original Payment'
                        }));
                    if (cleaned.length > 0) return cleaned;
                }
            }
        } catch (e) {
            console.error('Error hydrating hotel_cancelled_v2:', e);
        }
        return [];
    });

    useEffect(() => {
        try {
            localStorage.setItem('hotel_cancelled_v2', JSON.stringify(cancelledList));
        } catch (e) {
            console.error('Failed to save hotel_cancelled_v2:', e);
        }
    }, [cancelledList]);

    const handleReinstate = (id: number) => {
        const item = cancelledList.find(c => c.id === id);
        if (!item) return;

        if (window.confirm(`Reinstate reservation ${item.reservationNumber} (${item.guestName}) back to Active Reservations?`)) {
            // Remove from cancelled list
            setCancelledList(prev => prev.filter(c => c.id !== id));

            try {
                const resList = [...getAllStoredReservations()];
                
                const origTotal = item.originalTotalBDT || 12000;
                const retFee = item.retentionFeeBDT || 0;
                const restoredReservation = {
                    id: Date.now(),
                    reservationNumber: item.reservationNumber,
                    guestName: item.guestName,
                    phone: item.phone || '+880 1712-000000',
                    email: item.email || 'guest@hospitality.com',
                    roomType: item.roomType || 'Deluxe Room',
                    roomNumber: item.roomNumber || 'UNASSIGNED',
                    checkIn: item.checkIn || '2026-06-25',
                    checkOut: item.checkOut || '2026-06-28',
                    nights: item.nights || 2,
                    status: 'CONFIRMED' as const,
                    paidAmount: Math.max(0, origTotal - retFee),
                    totalAmount: origTotal,
                    dueAmount: 0,
                    notes: `Reinstated on ${new Date().toLocaleDateString('en-GB')} by FOM. Reason: Guest renewed arrival.`
                };
                
                resList.push(restoredReservation as any);
                saveStoredReservations(resList);
                
                // Relational PostgreSQL DB synchronization & SSE broadcast
                updateReservationStatusInDB(item.reservationNumber, 'CONFIRMED').catch(console.warn);
                broadcastPMSEvent({ type: 'INVENTORY_REFRESH' });
            } catch (e) {
                console.error('Failed to sync restored reservation', e);
            }

            showToast(`Reservation ${item.reservationNumber} reinstated and transferred to Active Ledger.`);
        }
    };

    const filtered = cancelledList.filter(c => {
        const q = (searchQuery || '').toLowerCase().trim();
        const matchesQuery = !q ||
            (c.guestName || '').toLowerCase().includes(q) ||
            (c.reservationNumber || '').toLowerCase().includes(q) ||
            (c.reason || '').toLowerCase().includes(q) ||
            (c.phone || '').toLowerCase().includes(q) ||
            (c.roomType || '').toLowerCase().includes(q);

        const matchesCategory =
            selectedCategory === 'ALL' || c.reasonCategory === selectedCategory;

        const matchesRefund =
            selectedRefundFilter === 'ALL' ||
            (selectedRefundFilter === 'FULL' && (c.refundStatus || '').includes('Full')) ||
            (selectedRefundFilter === 'PARTIAL' && (c.refundStatus || '').includes('Partial')) ||
            (selectedRefundFilter === 'FORFEITED' && (c.refundStatus || '').includes('Non-Refundable'));

        return matchesQuery && matchesCategory && matchesRefund;
    });

    const totalRetainedBDT = cancelledList.reduce((acc, c) => acc + (c.retentionFeeBDT || 0), 0);
    const totalOriginalBDT = cancelledList.reduce((acc, c) => acc + (c.originalTotalBDT || 0), 0);
    const fullRefundsCount = cancelledList.filter(c => (c.refundStatus || '').includes('Full')).length;
    const penaltyAppliedCount = cancelledList.filter(c => (c.retentionFeeBDT || 0) > 0).length;

    const handlePrintVoucher = () => {
        window.print();
    };

    return (
        <div className="p-3 sm:p-4 max-w-full space-y-2.5 animate-in fade-in duration-150 text-xs">
            {toastMessage && (
                <div className="fixed top-4 right-4 z-50 bg-gray-900 text-white px-3.5 py-2 rounded-lg shadow-lg border border-gray-700 text-xs font-semibold flex items-center gap-2">
                    <CheckCircle2 size={14} className="text-emerald-400" />
                    <span>{toastMessage}</span>
                </div>
            )}

            {/* Standardized Thesis Page Header */}
            <PageHeader
                title="Cancelled Reservations & Forfeiture Ledger"
                subtitle="Track cancelled bookings, cancellation reason telemetry, retention penalties, and refund disbursements"
                icon={<XCircle size={22} className="text-rose-600" />}
                badge={
                    <span className="badge-status-active">
                        <span className="size-1.5 rounded-full bg-rose-500 animate-pulse"></span>
                        GL-4501 Audit
                    </span>
                }
                actions={
                    <>
                        <button
                            type="button"
                            onClick={() => {
                                const csvContent = "data:text/csv;charset=utf-8," + 
                                    ["Res#,Guest,RoomType,Nights,CancelDate,Reason,RetentionBDT,RefundStatus"].join(",") + "\n" +
                                    cancelledList.map(c => `"${c.reservationNumber}","${c.guestName}","${c.roomType}",${c.nights},"${c.cancellationDate}","${c.reason}",${c.retentionFeeBDT},"${c.refundStatus}"`).join("\n");
                                const encodedUri = encodeURI(csvContent);
                                const link = document.createElement("a");
                                link.setAttribute("href", encodedUri);
                                link.setAttribute("download", `Cancellation_Audit_Report_${new Date().toISOString().slice(0, 10)}.csv`);
                                document.body.appendChild(link);
                                link.click();
                                document.body.removeChild(link);
                                showToast("Exported Cancellation Audit CSV.");
                            }}
                            className="btn-secondary"
                        >
                            <FileSpreadsheet size={13} className="text-emerald-600" />
                            <span>Export CSV</span>
                        </button>
                        <button
                            type="button"
                            onClick={() => window.print()}
                            className="btn-secondary"
                        >
                            <Printer size={13} className="text-slate-500" />
                            <span>Print Log</span>
                        </button>
                    </>
                }
            />

            {/* KPI Metric Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div className="card-container p-4 flex items-center justify-between">
                    <div>
                        <span className="text-[11px] text-slate-400 uppercase tracking-wider">Total Cancelled</span>
                        <p className="text-2xl font-black text-slate-900 mt-1 font-mono">{cancelledList.length} <span className="text-xs font-normal text-slate-400">Bookings</span></p>
                    </div>
                    <div className="size-10 rounded-xl bg-rose-50 text-rose-600 border border-rose-100 flex items-center justify-center">
                        <XCircle size={18} />
                    </div>
                </div>

                <div className="card-container p-4 flex items-center justify-between">
                    <div>
                        <span className="text-[11px] text-slate-400 uppercase tracking-wider">Fees Retained (GL-4501)</span>
                        <p className="text-2xl font-black text-rose-700 font-mono mt-1">৳ {totalRetainedBDT.toLocaleString()}</p>
                        <p className="text-[11px] text-slate-400 font-mono mt-0.5">Booked: ৳ {totalOriginalBDT.toLocaleString()}</p>
                    </div>
                    <div className="size-10 rounded-xl bg-amber-50 text-amber-600 border border-amber-100 flex items-center justify-center">
                        <DollarSign size={18} />
                    </div>
                </div>

                <div className="card-container p-4 flex items-center justify-between">
                    <div>
                        <span className="text-[11px] text-slate-400 uppercase tracking-wider">Full Refunds Disbursed</span>
                        <p className="text-2xl font-black text-emerald-700 mt-1 font-mono">{fullRefundsCount} <span className="text-xs font-normal text-slate-400">Waivers</span></p>
                    </div>
                    <div className="size-10 rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-100 flex items-center justify-center">
                        <CheckCircle2 size={18} />
                    </div>
                </div>

                <div className="card-container p-4 flex items-center justify-between">
                    <div>
                        <span className="text-[11px] text-slate-400 uppercase tracking-wider">Penalties / Forfeitures</span>
                        <p className="text-2xl font-black text-slate-900 mt-1 font-mono">{penaltyAppliedCount} <span className="text-xs font-normal text-slate-400">Accounts</span></p>
                    </div>
                    <div className="size-10 rounded-xl bg-purple-50 text-purple-600 border border-purple-100 flex items-center justify-center">
                        <ShieldAlert size={18} />
                    </div>
                </div>
            </div>

            {/* Filter and Search Bar */}
            <div className="bg-white rounded-lg border border-gray-200 shadow-2xs px-3 py-2 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="flex items-center gap-2 flex-wrap">
                    <div className="flex items-center bg-gray-100 p-0.5 rounded border border-gray-200 text-[11px]">
                        <button
                            type="button"
                            onClick={() => setSelectedCategory('ALL')}
                            className={`h-6 px-2.5 rounded font-semibold cursor-pointer transition-colors ${selectedCategory === 'ALL' ? 'bg-white text-gray-900 shadow-2xs' : 'text-gray-500 hover:text-gray-900'}`}
                        >
                            All Reasons ({cancelledList.length})
                        </button>
                        <button
                            type="button"
                            onClick={() => setSelectedCategory('Flight/Weather')}
                            className={`h-6 px-2.5 rounded font-semibold cursor-pointer transition-colors ${selectedCategory === 'Flight/Weather' ? 'bg-white text-gray-900 shadow-2xs' : 'text-gray-500 hover:text-gray-900'}`}
                        >
                            Weather/Flight
                        </button>
                        <button
                            type="button"
                            onClick={() => setSelectedCategory('Corporate Postponement')}
                            className={`h-6 px-2.5 rounded font-semibold cursor-pointer transition-colors ${selectedCategory === 'Corporate Postponement' ? 'bg-white text-gray-900 shadow-2xs' : 'text-gray-500 hover:text-gray-900'}`}
                        >
                            Corporate
                        </button>
                        <button
                            type="button"
                            onClick={() => setSelectedCategory('No-Show Forfeiture')}
                            className={`h-6 px-2.5 rounded font-semibold cursor-pointer transition-colors ${selectedCategory === 'No-Show Forfeiture' ? 'bg-white text-gray-900 shadow-2xs' : 'text-gray-500 hover:text-gray-900'}`}
                        >
                            No-Show
                        </button>
                    </div>

                    <div className="flex items-center gap-1">
                        <span className="text-[10px] text-gray-400 uppercase mr-1">Status:</span>
                        {[
                            { key: 'ALL', label: 'All' },
                            { key: 'FULL', label: 'Full Refund' },
                            { key: 'PARTIAL', label: '50% Fee' },
                            { key: 'FORFEITED', label: 'Non-Refundable' }
                        ].map(f => (
                            <button
                                key={f.key}
                                type="button"
                                onClick={() => setSelectedRefundFilter(f.key)}
                                className={`h-6 px-2 rounded text-[10.5px] font-semibold cursor-pointer transition-colors ${selectedRefundFilter === f.key ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
                            >
                                {f.label}
                            </button>
                        ))}
                    </div>
                </div>

                <div className="relative">
                    <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input
                        type="text"
                        placeholder="Search by res#, guest name, reason, phone..."
                        value={searchQuery}
                        onChange={e => setSearchQuery(e.target.value)}
                        className="h-7 pl-7 pr-2.5 text-[11px] border border-gray-200 rounded-md bg-white outline-none w-56 sm:w-72 focus:border-rose-500 transition-colors"
                    />
                </div>
            </div>

            {/* Table */}
            <div className="bg-white rounded-lg border border-gray-200 shadow-2xs overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left min-w-[1180px] border-collapse">
                        <thead>
                            <tr className="bg-gray-50/80 border-b border-gray-200 text-[10.5px] text-gray-600 uppercase tracking-wider">
                                <th className="px-3.5 py-2.5 w-24">Res #</th>
                                <th className="px-3.5 py-2.5 w-44">Guest Identity</th>
                                <th className="px-3.5 py-2.5 w-36">Room Details</th>
                                <th className="px-3.5 py-2.5 w-36">Original Dates</th>
                                <th className="px-3.5 py-2.5 min-w-[220px]">Cancellation Details & Reason</th>
                                <th className="px-3.5 py-2.5 w-32">Operator</th>
                                <th className="px-3.5 py-2.5 w-36 text-right">Original / Retained</th>
                                <th className="px-3.5 py-2.5 w-40">Refund Status</th>
                                <th className="px-3.5 py-2.5 w-44 text-right pr-4">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 text-[11.5px]">
                            {filtered.length === 0 ? (
                                <tr>
                                    <td colSpan={9} className="px-4 py-8 text-center text-gray-400">
                                        No cancelled reservations matching current criteria.
                                    </td>
                                </tr>
                            ) : (
                                filtered.map(c => (
                                    <tr key={c.id} className="hover:bg-rose-50/20 transition-colors">
                                        <td className="px-3.5 py-2.5 font-mono text-rose-800">
                                            {c.reservationNumber}
                                        </td>
                                        <td className="px-3.5 py-2.5">
                                            <p className="font-semibold text-gray-900 leading-tight">{c.guestName}</p>
                                            <p className="text-[10px] text-gray-500 font-mono mt-0.5">{c.phone}</p>
                                        </td>
                                        <td className="px-3.5 py-2.5">
                                            <span className="font-medium text-gray-800">{c.roomType}</span>
                                            {c.roomNumber && (
                                                <span className="ml-1.5 px-1 py-0.2 bg-gray-100 text-gray-700 rounded text-[9.5px] font-mono">
                                                    Rm {c.roomNumber}
                                                </span>
                                            )}
                                        </td>
                                        <td className="px-3.5 py-2.5 text-gray-600 whitespace-nowrap">
                                            <span className="font-mono text-[10.5px]">{c.stayDates}</span>
                                            <span className="ml-1 text-[10px] font-semibold text-gray-400">({c.nights}N)</span>
                                        </td>
                                        <td className="px-3.5 py-2.5 max-w-xs">
                                            <div className="flex items-center gap-1.5 mb-0.5">
                                                <span className="px-1.5 py-0.2 rounded text-[9px] uppercase bg-gray-100 text-gray-700 border border-gray-200">
                                                    {c.reasonCategory}
                                                </span>
                                                <span className="text-[10px] text-gray-400 font-mono">{c.cancellationDate}</span>
                                            </div>
                                            <p className="text-[11px] text-gray-700 truncate" title={c.reason}>
                                                {c.reason}
                                            </p>
                                        </td>
                                        <td className="px-3.5 py-2.5 text-gray-600 text-[10.5px] whitespace-nowrap">
                                            {c.cancelledBy}
                                        </td>
                                        <td className="px-3.5 py-2.5 text-right whitespace-nowrap">
                                            <div className="font-mono text-rose-700">
                                                ৳ {(c.retentionFeeBDT || 0).toLocaleString()}
                                            </div>
                                            <div className="text-[9.5px] text-gray-400 font-mono">
                                                Orig: ৳ {(c.originalTotalBDT || 0).toLocaleString()}
                                            </div>
                                        </td>
                                        <td className="px-3.5 py-2.5 whitespace-nowrap">
                                            <span className={`px-2 py-0.5 rounded text-[10px] ${
                                                (c.refundStatus || '').includes('Full')
                                                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                                    : (c.refundStatus || '').includes('Partial')
                                                    ? 'bg-amber-50 text-amber-700 border border-amber-200'
                                                    : 'bg-rose-50 text-rose-700 border border-rose-200'
                                            }`}>
                                                {c.refundStatus || 'Refund Pending'}
                                            </span>
                                            <span className="block text-[9px] text-gray-400 mt-0.5">{c.refundMethod || 'Direct Method'}</span>
                                        </td>
                                        <td className="px-3.5 py-2.5 text-right whitespace-nowrap pr-4 space-x-1">
                                            <button
                                                type="button"
                                                onClick={() => setViewVoucherItem(c)}
                                                className="h-6.5 px-2.5 text-[10.5px] font-semibold bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 rounded shadow-2xs cursor-pointer inline-flex items-center gap-1"
                                                title="View Cancellation & Refund Voucher"
                                            >
                                                <FileText size={11} className="text-gray-500" />
                                                <span>Voucher</span>
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => handleReinstate(c.id)}
                                                className="h-6.5 px-2.5 text-[10.5px] bg-white border border-blue-200 hover:bg-blue-50 text-blue-700 rounded shadow-2xs cursor-pointer inline-flex items-center gap-1"
                                                title="Reinstate to Active Booking"
                                            >
                                                <RotateCcw size={11} className="text-blue-600" />
                                                <span>Reinstate</span>
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Cancellation Certificate & GL Voucher Modal */}
            {viewVoucherItem && (
                <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-3 animate-in fade-in duration-100">
                    <div className="bg-white rounded-xl shadow-2xl border border-gray-200 max-w-lg w-full p-4 space-y-3.5">
                        <div className="flex items-center justify-between pb-2 border-b border-gray-200">
                            <div className="flex items-center gap-2">
                                <div className="w-7 h-7 rounded-md bg-rose-50 text-rose-700 border border-rose-200 flex items-center justify-center">
                                    <FileText size={15} />
                                </div>
                                <div>
                                    <h3 className="text-sm text-gray-900 leading-none">
                                        Cancellation & GL Forfeiture Voucher
                                    </h3>
                                    <p className="text-[10px] text-gray-400 font-mono mt-0.5">
                                        Voucher #{viewVoucherItem.reservationNumber}-CNL
                                    </p>
                                </div>
                            </div>
                            <button
                                type="button"
                                onClick={() => setViewVoucherItem(null)}
                                className="w-6 h-6 rounded-md hover:bg-gray-100 text-gray-400 hover:text-gray-700 flex items-center justify-center cursor-pointer"
                            >
                                ✕
                            </button>
                        </div>

                        <div className="bg-gray-50 p-3 rounded-lg border border-gray-200/80 space-y-2 text-xs">
                            <div className="grid grid-cols-2 gap-2">
                                <div>
                                    <span className="text-[9.5px] text-gray-400 uppercase">Guest Name</span>
                                    <p className="text-gray-900">{viewVoucherItem.guestName}</p>
                                    <p className="text-[10px] text-gray-500 font-mono">{viewVoucherItem.phone}</p>
                                </div>
                                <div className="text-right">
                                    <span className="text-[9.5px] text-gray-400 uppercase">Room Category</span>
                                    <p className="text-gray-900">{viewVoucherItem.roomType}</p>
                                    <p className="text-[10px] text-gray-500 font-mono">Stay: {viewVoucherItem.stayDates}</p>
                                </div>
                            </div>

                            <div className="border-t border-gray-200 pt-2 grid grid-cols-2 gap-2">
                                <div>
                                    <span className="text-[9.5px] text-gray-400 uppercase">Cancellation Recorded</span>
                                    <p className="font-mono text-gray-800 text-[11px]">{viewVoucherItem.cancellationDate}</p>
                                    <p className="text-[10px] text-gray-500">By: {viewVoucherItem.cancelledBy}</p>
                                </div>
                                <div className="text-right">
                                    <span className="text-[9.5px] text-gray-400 uppercase">Reason Classification</span>
                                    <p className="text-gray-800">{viewVoucherItem.reasonCategory}</p>
                                </div>
                            </div>

                            <div className="border-t border-gray-200 pt-2">
                                <span className="text-[9.5px] text-gray-400 uppercase">Official Cancellation Note</span>
                                <p className="text-gray-700 text-[11px] italic bg-white p-2 rounded border border-gray-200 mt-1">
                                    "{viewVoucherItem.reason}"
                                </p>
                            </div>

                            <div className="border-t border-gray-200 pt-2 flex justify-between items-center">
                                <div>
                                    <span className="text-[9.5px] text-gray-400 uppercase">Refund Mode</span>
                                    <p className="font-semibold text-emerald-700">{viewVoucherItem.refundMethod}</p>
                                </div>
                                <div className="text-right">
                                    <span className="text-[9.5px] text-gray-400 uppercase">GL Retention Fee</span>
                                    <p className="text-base text-rose-700 font-mono leading-none mt-0.5">
                                        ৳ {(viewVoucherItem.retentionFeeBDT || 0).toLocaleString()}
                                    </p>
                                </div>
                            </div>
                        </div>

                        <div className="flex justify-between items-center pt-2">
                            <span className="text-[10px] text-gray-400">Authorized by Front Office Controller</span>
                            <div className="flex items-center gap-2">
                                <button
                                    type="button"
                                    onClick={handlePrintVoucher}
                                    className="h-7 px-3 bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 rounded-md text-xs font-semibold flex items-center gap-1.5 shadow-2xs cursor-pointer"
                                >
                                    <Printer size={12} />
                                    <span>Print Voucher</span>
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setViewVoucherItem(null)}
                                    className="h-7 px-3 bg-gray-900 hover:bg-gray-800 text-white rounded-md text-xs font-semibold cursor-pointer"
                                >
                                    Close
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ReservationCancel;
