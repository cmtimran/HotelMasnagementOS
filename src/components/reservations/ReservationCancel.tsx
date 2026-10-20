import React, { useState, useEffect } from 'react';
import {
    XCircle,
    Search,
    RotateCcw,
    CheckCircle2
} from 'lucide-react';

export interface CancelledItem {
    id: number;
    reservationNumber: string;
    guestName: string;
    roomType: string;
    stayDates: string;
    nights: number;
    cancellationDate: string;
    reason: string;
    cancelledBy: string;
    retentionFeeBDT: number;
    refundStatus: 'Full Refund Processed' | 'Non-Refundable Retained' | 'Partial 50% Fee Applied';
}

const INITIAL_CANCELLED: CancelledItem[] = [
    { id: 1, reservationNumber: 'RES-009180', guestName: 'Kamrul Hasan', roomType: 'Deluxe Double', stayDates: '2026-06-25 → 2026-06-28', nights: 3, cancellationDate: '2026-06-24 14:30', reason: 'Flight cancelled by airline due to adverse weather.', cancelledBy: 'FOM - Rafiqul Islam', retentionFeeBDT: 0, refundStatus: 'Full Refund Processed' },
    { id: 2, reservationNumber: 'RES-009181', guestName: 'Standard Chartered Corp Block', roomType: 'Executive Suite', stayDates: '2026-06-26 → 2026-06-29', nights: 3, cancellationDate: '2026-06-25 18:20', reason: 'Executive conference postponed by regional head office.', cancelledBy: 'OTA API / Channel', retentionFeeBDT: 7500, refundStatus: 'Partial 50% Fee Applied' },
    { id: 3, reservationNumber: 'RES-009182', guestName: 'Shahriar Kabir (No-Show)', roomType: 'Superior King', stayDates: '2026-06-28 → 2026-06-30', nights: 2, cancellationDate: '2026-06-29 02:00', reason: 'Guaranteed no-show charged during night audit.', cancelledBy: 'Night Auditor Pipeline', retentionFeeBDT: 4500, refundStatus: 'Non-Refundable Retained' }
];

export const ReservationCancel: React.FC = () => {
    const [toastMessage, setToastMessage] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedType, setSelectedType] = useState<'ALL' | 'FIT' | 'GROUP'>('ALL');
    const [dateFilter, setDateFilter] = useState<'all' | 'today' | 'yesterday' | '7days'>('all');

    const showToast = (msg: string) => {
        setToastMessage(msg);
        setTimeout(() => setToastMessage(null), 3500);
    };

    // Hydrate state
    const [cancelledList, setCancelledList] = useState<CancelledItem[]>(() => {
        const saved = localStorage.getItem('hotel_cancelled_v2');
        return saved ? JSON.parse(saved) : INITIAL_CANCELLED;
    });

    useEffect(() => {
        localStorage.setItem('hotel_cancelled_v2', JSON.stringify(cancelledList));
    }, [cancelledList]);

    const handleReinstate = (id: number) => {
        const item = cancelledList.find(c => c.id === id);
        if (window.confirm(`Reinstate reservation ${item?.reservationNumber} back to active reservations?`)) {
            setCancelledList(prev => prev.filter(c => c.id !== id));
            showToast(`Reservation ${item?.reservationNumber} reinstated successfully.`);
        }
    };

    const filtered = cancelledList.filter(c => {
        const matchesQuery =
            c.guestName.toLowerCase().includes(searchQuery.toLowerCase()) ||
            c.reservationNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
            c.reason.toLowerCase().includes(searchQuery.toLowerCase());
        return matchesQuery;
    });

    const totalRetained = cancelledList.reduce((acc, c) => acc + c.retentionFeeBDT, 0);

    return (
        <div className="p-4 md:p-6 max-w-7xl mx-auto space-y-4 animate-in fade-in duration-150">
            {toastMessage && (
                <div className="fixed top-5 right-5 z-50 bg-gray-900 text-white px-4 py-2.5 rounded-xl shadow-lg border border-gray-700 text-xs font-semibold flex items-center gap-2">
                    <CheckCircle2 size={16} className="text-emerald-400" />
                    <span>{toastMessage}</span>
                </div>
            )}

            {/* Header */}
            <div className="bg-white rounded-2xl border border-gray-200/90 shadow-2xs p-4 md:p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-start md:items-center gap-3.5">
                    <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-rose-600 to-red-700 text-white flex items-center justify-center shadow-md flex-shrink-0">
                        <XCircle size={22} />
                    </div>
                    <div>
                        <div className="flex items-center gap-2 flex-wrap">
                            <h1 className="text-lg md:text-xl font-bold text-gray-900 tracking-tight">
                                Cancelled Reservations & Forfeiture Ledger
                            </h1>
                            <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-rose-50 text-rose-700 border border-rose-200">
                                Audit Log
                            </span>
                        </div>
                        <p className="text-xs text-gray-500 mt-0.5">
                            Audit trail of cancelled bookings, stated cancellation reasons, operator signatures, and GL-4501 retention fees.
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    <div className="bg-rose-50 border border-rose-200 px-3 py-1.5 rounded-xl text-right">
                        <span className="text-[10px] font-semibold text-rose-800 uppercase block">Total Cancellation Fees Retained</span>
                        <span className="text-sm font-bold text-rose-900 font-mono">৳ {totalRetained.toLocaleString()}</span>
                    </div>
                </div>
            </div>

            {/* Filter Bar */}
            <div className="bg-white rounded-xl border border-gray-200 shadow-2xs p-3.5 flex flex-col md:flex-row md:items-center justify-between gap-3">
                <div className="flex items-center gap-2 flex-wrap">
                    <div className="flex items-center bg-gray-100 p-0.5 rounded-lg border border-gray-200 text-xs">
                        <button
                            type="button"
                            onClick={() => setSelectedType('ALL')}
                            className={`px-2.5 py-1 rounded-md font-semibold cursor-pointer ${selectedType === 'ALL' ? 'bg-white text-gray-900 shadow-2xs' : 'text-gray-500'}`}
                        >
                            All ({cancelledList.length})
                        </button>
                        <button
                            type="button"
                            onClick={() => setSelectedType('FIT')}
                            className={`px-2.5 py-1 rounded-md font-semibold cursor-pointer ${selectedType === 'FIT' ? 'bg-white text-gray-900 shadow-2xs' : 'text-gray-500'}`}
                        >
                            Individual (FIT)
                        </button>
                        <button
                            type="button"
                            onClick={() => setSelectedType('GROUP')}
                            className={`px-2.5 py-1 rounded-md font-semibold cursor-pointer ${selectedType === 'GROUP' ? 'bg-white text-gray-900 shadow-2xs' : 'text-gray-500'}`}
                        >
                            Corporate / Group
                        </button>
                    </div>

                    <div className="flex items-center gap-1">
                        {['all', 'today', 'yesterday', '7days'].map(btn => (
                            <button
                                key={btn}
                                type="button"
                                onClick={() => setDateFilter(btn as any)}
                                className={`h-7 px-2.5 rounded-lg text-[11px] font-semibold capitalize cursor-pointer transition-colors ${dateFilter === btn ? 'bg-rose-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
                            >
                                {btn === '7days' ? 'Last 7 Days' : btn}
                            </button>
                        ))}
                    </div>
                </div>

                <div className="relative">
                    <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input
                        type="text"
                        placeholder="Search cancelled reservations..."
                        value={searchQuery}
                        onChange={e => setSearchQuery(e.target.value)}
                        className="h-8 pl-8 pr-3 text-xs border border-gray-200 rounded-lg bg-white outline-none w-56 lg:w-64 focus:border-rose-500"
                    />
                </div>
            </div>

            {/* Table */}
            <div className="bg-white rounded-2xl border border-gray-200 shadow-2xs overflow-hidden text-xs">
                <div className="overflow-x-auto no-scrollbar">
                    <table className="w-full text-left min-w-[950px]">
                        <thead>
                            <tr className="bg-rose-950 text-white text-[10.5px] font-bold uppercase tracking-wider">
                                <th className="px-3.5 py-3">Reservation #</th>
                                <th className="px-3.5 py-3">Guest Name</th>
                                <th className="px-3.5 py-3">Room Category</th>
                                <th className="px-3.5 py-3">Stay Dates</th>
                                <th className="px-3.5 py-3">Cancelled At</th>
                                <th className="px-3.5 py-3">Reason For Cancellation</th>
                                <th className="px-3.5 py-3">Cancelled By</th>
                                <th className="px-3.5 py-3">Retention Fee</th>
                                <th className="px-3.5 py-3">Refund Status</th>
                                <th className="px-3.5 py-3 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {filtered.length === 0 ? (
                                <tr>
                                    <td colSpan={10} className="px-4 py-8 text-center text-gray-500">
                                        No cancelled reservations recorded.
                                    </td>
                                </tr>
                            ) : (
                                filtered.map(c => (
                                    <tr key={c.id} className="hover:bg-rose-50/20 transition-colors">
                                        <td className="px-3.5 py-2.5 font-mono font-bold text-rose-800">
                                            {c.reservationNumber}
                                        </td>
                                        <td className="px-3.5 py-2.5 font-semibold text-gray-900">
                                            {c.guestName}
                                        </td>
                                        <td className="px-3.5 py-2.5 text-gray-700">
                                            {c.roomType}
                                        </td>
                                        <td className="px-3.5 py-2.5 text-gray-600">
                                            {c.stayDates} ({c.nights}N)
                                        </td>
                                        <td className="px-3.5 py-2.5 font-mono text-gray-500 text-[11px]">
                                            {c.cancellationDate}
                                        </td>
                                        <td className="px-3.5 py-2.5 text-gray-700 max-w-xs">
                                            <div className="truncate" title={c.reason}>{c.reason}</div>
                                        </td>
                                        <td className="px-3.5 py-2.5 text-gray-600 text-[11px]">
                                            {c.cancelledBy}
                                        </td>
                                        <td className="px-3.5 py-2.5 font-mono font-bold text-gray-900">
                                            {c.retentionFeeBDT > 0 ? `৳ ${c.retentionFeeBDT.toLocaleString()}` : '৳ 0'}
                                        </td>
                                        <td className="px-3.5 py-2.5">
                                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${c.refundStatus.includes('Full') ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-rose-50 text-rose-700 border border-rose-200'}`}>
                                                {c.refundStatus}
                                            </span>
                                        </td>
                                        <td className="px-3.5 py-2.5 text-right">
                                            <button
                                                type="button"
                                                onClick={() => handleReinstate(c.id)}
                                                className="h-6 px-2 text-[10.5px] font-bold bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 rounded shadow-2xs cursor-pointer inline-flex items-center gap-1"
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
        </div>
    );
};

export default ReservationCancel;
