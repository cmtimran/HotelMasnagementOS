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
        <div className="p-3 sm:p-4 max-w-full space-y-2.5 animate-in fade-in duration-150 text-xs">
            {toastMessage && (
                <div className="fixed top-4 right-4 z-50 bg-gray-900 text-white px-3.5 py-2 rounded-lg shadow-lg border border-gray-700 text-xs font-semibold flex items-center gap-2">
                    <CheckCircle2 size={14} className="text-emerald-400" />
                    <span>{toastMessage}</span>
                </div>
            )}

            {/* Compact Header Bar */}
            <div className="bg-white rounded-lg border border-gray-200/90 shadow-2xs px-3.5 py-2 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-8 h-8 rounded-lg bg-rose-50 text-rose-700 border border-rose-200 flex items-center justify-center flex-shrink-0">
                        <XCircle size={18} />
                    </div>
                    <div className="min-w-0">
                        <div className="flex items-center gap-2">
                            <h1 className="text-sm font-bold text-gray-900 tracking-tight truncate">
                                Cancelled Reservations & Forfeiture Ledger
                            </h1>
                            <span className="px-1.5 py-0.2 text-[9.5px] font-bold rounded bg-rose-50 text-rose-700 border border-rose-200">
                                Audit Log
                            </span>
                        </div>
                        <p className="text-[11px] text-gray-500 truncate">
                            Audit trail of cancelled bookings, reasons, operator signatures, and GL-4501 fees.
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-2 flex-shrink-0">
                    <div className="bg-rose-50/80 border border-rose-200/90 px-2.5 py-1 rounded-md text-right">
                        <span className="text-[9.5px] font-semibold text-rose-700 uppercase block leading-none">Total Fees Retained</span>
                        <span className="text-xs font-bold text-rose-900 font-mono mt-0.5 block leading-none">৳ {totalRetained.toLocaleString()}</span>
                    </div>
                </div>
            </div>

            {/* Compact Filter Bar */}
            <div className="bg-white rounded-lg border border-gray-200 shadow-2xs px-3 py-1.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="flex items-center gap-2 flex-wrap">
                    <div className="flex items-center bg-gray-100 p-0.5 rounded border border-gray-200 text-[11px]">
                        <button
                            type="button"
                            onClick={() => setSelectedType('ALL')}
                            className={`h-6 px-2 rounded font-semibold cursor-pointer transition-colors ${selectedType === 'ALL' ? 'bg-white text-gray-900 shadow-2xs' : 'text-gray-500 hover:text-gray-900'}`}
                        >
                            All ({cancelledList.length})
                        </button>
                        <button
                            type="button"
                            onClick={() => setSelectedType('FIT')}
                            className={`h-6 px-2 rounded font-semibold cursor-pointer transition-colors ${selectedType === 'FIT' ? 'bg-white text-gray-900 shadow-2xs' : 'text-gray-500 hover:text-gray-900'}`}
                        >
                            Individual (FIT)
                        </button>
                        <button
                            type="button"
                            onClick={() => setSelectedType('GROUP')}
                            className={`h-6 px-2 rounded font-semibold cursor-pointer transition-colors ${selectedType === 'GROUP' ? 'bg-white text-gray-900 shadow-2xs' : 'text-gray-500 hover:text-gray-900'}`}
                        >
                            Corporate / Group
                        </button>
                    </div>

                    <div className="flex items-center gap-1">
                        {(['all', 'today', 'yesterday', '7days'] as const).map(btn => (
                            <button
                                key={btn}
                                type="button"
                                onClick={() => setDateFilter(btn)}
                                className={`h-6 px-2 rounded text-[10.5px] font-semibold capitalize cursor-pointer transition-colors ${dateFilter === btn ? 'bg-rose-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
                            >
                                {btn === '7days' ? 'Last 7 Days' : btn}
                            </button>
                        ))}
                    </div>
                </div>

                <div className="relative">
                    <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input
                        type="text"
                        placeholder="Search cancelled reservations..."
                        value={searchQuery}
                        onChange={e => setSearchQuery(e.target.value)}
                        className="h-7 pl-7 pr-2.5 text-[11px] border border-gray-200 rounded-md bg-white outline-none w-52 sm:w-60 focus:border-rose-500"
                    />
                </div>
            </div>

            {/* Compact Table */}
            <div className="bg-white rounded-lg border border-gray-200 shadow-2xs overflow-hidden">
                <div className="overflow-x-auto no-scrollbar">
                    <table className="w-full text-left min-w-[900px] border-collapse">
                        <thead>
                            <tr className="bg-gray-50/80 border-b border-gray-200 text-[10.5px] font-bold text-gray-600 uppercase tracking-wider">
                                <th className="px-3 py-2">Reservation #</th>
                                <th className="px-3 py-2">Guest Name</th>
                                <th className="px-3 py-2">Room Category</th>
                                <th className="px-3 py-2">Stay Dates</th>
                                <th className="px-3 py-2">Cancelled At</th>
                                <th className="px-3 py-2">Reason For Cancellation</th>
                                <th className="px-3 py-2">Cancelled By</th>
                                <th className="px-3 py-2">Retention Fee</th>
                                <th className="px-3 py-2">Refund Status</th>
                                <th className="px-3 py-2 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 text-[11.5px]">
                            {filtered.length === 0 ? (
                                <tr>
                                    <td colSpan={10} className="px-4 py-6 text-center text-gray-400">
                                        No cancelled reservations recorded.
                                    </td>
                                </tr>
                            ) : (
                                filtered.map(c => (
                                    <tr key={c.id} className="hover:bg-rose-50/20 transition-colors">
                                        <td className="px-3 py-1.5 font-mono font-bold text-rose-800">
                                            {c.reservationNumber}
                                        </td>
                                        <td className="px-3 py-1.5 font-semibold text-gray-900">
                                            {c.guestName}
                                        </td>
                                        <td className="px-3 py-1.5 text-gray-700">
                                            {c.roomType}
                                        </td>
                                        <td className="px-3 py-1.5 text-gray-600 whitespace-nowrap">
                                            {c.stayDates} ({c.nights}N)
                                        </td>
                                        <td className="px-3 py-1.5 font-mono text-gray-500 text-[10.5px] whitespace-nowrap">
                                            {c.cancellationDate}
                                        </td>
                                        <td className="px-3 py-1.5 text-gray-700 max-w-xs truncate" title={c.reason}>
                                            {c.reason}
                                        </td>
                                        <td className="px-3 py-1.5 text-gray-600 text-[10.5px] whitespace-nowrap">
                                            {c.cancelledBy}
                                        </td>
                                        <td className="px-3 py-1.5 font-mono font-bold text-gray-900 whitespace-nowrap">
                                            {c.retentionFeeBDT > 0 ? `৳ ${c.retentionFeeBDT.toLocaleString()}` : '৳ 0'}
                                        </td>
                                        <td className="px-3 py-1.5 whitespace-nowrap">
                                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${c.refundStatus.includes('Full') ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-rose-50 text-rose-700 border border-rose-200'}`}>
                                                {c.refundStatus}
                                            </span>
                                        </td>
                                        <td className="px-3 py-1.5 text-right whitespace-nowrap">
                                            <button
                                                type="button"
                                                onClick={() => handleReinstate(c.id)}
                                                className="h-5 px-2 text-[10px] font-bold bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 rounded shadow-2xs cursor-pointer inline-flex items-center gap-1"
                                                title="Reinstate to Active Booking"
                                            >
                                                <RotateCcw size={10} className="text-blue-600" />
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
