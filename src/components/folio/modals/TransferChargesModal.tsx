import React, { useState, useEffect, useMemo } from 'react';
import { X, Search, ArrowRight } from 'lucide-react';
import { getApiBaseUrl } from '../../../utils/apiUrl';
import { getCurrencySymbol } from '../../../utils/currencyUtils';
import type { FolioData } from '../folioTypes';

interface TransferChargesModalProps {
    isOpen: boolean;
    onClose: () => void;
    currentFolio: FolioData | null;
    allFolios: FolioData[];
    onSuccess: () => void;
}

export const TransferChargesModal: React.FC<TransferChargesModalProps> = ({
    isOpen,
    onClose,
    currentFolio,
    allFolios,
    onSuccess
}) => {
    const currency = useMemo(() => getCurrencySymbol(), []);
    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState<'all' | 'inhouse' | 'reservation' | 'checkedout'>('all');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [errorMsg, setErrorMsg] = useState('');

    useEffect(() => {
        if (isOpen) {
            setSearchQuery('');
            setStatusFilter('all');
            setErrorMsg('');
        }
    }, [isOpen]);

    // Filter available destination folios (excluding current folio)
    const availableFolios = useMemo(() => {
        return allFolios.filter(f => {
            if (f.id === currentFolio?.id) return false;

            // Status filter
            if (statusFilter === 'inhouse' && f.status !== 'IN-HOUSE' && f.status !== 'OPEN') return false;
            if (statusFilter === 'reservation' && f.status !== 'CONFIRMED' && f.status !== 'HOLD') return false;
            if (statusFilter === 'checkedout' && f.status !== 'CHECKED-OUT' && f.status !== 'SETTLED') return false;

            // Search query
            if (searchQuery.trim()) {
                const q = searchQuery.toLowerCase();
                const folioMatch = f.folio_number?.toLowerCase().includes(q);
                const guestMatch = f.guest_name?.toLowerCase().includes(q);
                const roomMatch = f.room_number?.toLowerCase().includes(q) || f.rooms?.some(r => r.room_number?.toLowerCase().includes(q));
                const phoneMatch = f.guest_phone?.toLowerCase().includes(q);
                return folioMatch || guestMatch || roomMatch || phoneMatch;
            }

            return true;
        });
    }, [allFolios, currentFolio?.id, statusFilter, searchQuery]);

    const handleTransfer = async (destId: number | string) => {
        setIsSubmitting(true);
        setErrorMsg('');

        try {
            const res = await fetch(`${getApiBaseUrl()}/api/accounting/folios/transfer`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    sourceFolioId: currentFolio?.id,
                    destFolioId: destId,
                    userName: 'Front Desk'
                })
            });

            const data = await res.json();
            if (data?.success) {
                onSuccess();
                onClose();
            } else {
                setErrorMsg(data?.error || 'Failed to transfer charges');
            }
        } catch (err: any) {
            setErrorMsg(err?.message || 'Network error while transferring charges');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleTransferToGroupOwner = async () => {
        setIsSubmitting(true);
        setErrorMsg('');

        try {
            const res = await fetch(`${getApiBaseUrl()}/api/accounting/folios/transfer`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    sourceFolioId: currentFolio?.id,
                    transferToGroupOwner: true,
                    userName: 'Front Desk'
                })
            });

            const data = await res.json();
            if (data?.success) {
                onSuccess();
                onClose();
            } else {
                setErrorMsg(data?.error || 'Failed to transfer to group owner');
            }
        } catch (err: any) {
            setErrorMsg(err?.message || 'Network error');
        } finally {
            setIsSubmitting(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[100005] bg-black/50 backdrop-blur-xs flex items-center justify-center p-3 animate-in fade-in duration-100">
            <div className="bg-white rounded-xl shadow-2xl border border-gray-200 w-full max-w-3xl overflow-hidden flex flex-col text-gray-800 max-h-[85vh]">
                {/* Header matching Screenshot c4f14f4f.png */}
                <div className="bg-[#1e3a8a] text-white px-4 py-2.5 flex items-center justify-between">
                    <h3 className="text-xs font-bold tracking-wide">Transfer Folio Charges/Payments</h3>
                    <button
                        type="button"
                        onClick={onClose}
                        className="text-white/80 hover:text-white transition-colors cursor-pointer"
                    >
                        <X size={15} />
                    </button>
                </div>

                {/* Filter and Search Bar */}
                <div className="p-3 border-b border-gray-100 space-y-2">
                    {errorMsg && (
                        <div className="bg-rose-50 border border-rose-200 text-rose-700 px-2.5 py-1 rounded text-[11px]">
                            {errorMsg}
                        </div>
                    )}

                    <div className="flex items-center gap-3">
                        {/* Search Input */}
                        <div className="relative flex-1">
                            <input
                                type="text"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                placeholder="Search Folio, Room, Guest"
                                className="w-full bg-white border border-gray-300 rounded px-2.5 py-1.5 pl-8 text-xs text-gray-800 focus:ring-1 focus:ring-blue-500"
                            />
                            <Search size={14} className="absolute left-2.5 top-2 text-gray-400" />
                        </div>

                        {/* Status Radio Filters */}
                        <div className="flex items-center gap-3 text-xs text-gray-700 select-none">
                            <label className="flex items-center gap-1 cursor-pointer">
                                <input
                                    type="radio"
                                    name="statusFilter"
                                    checked={statusFilter === 'all'}
                                    onChange={() => setStatusFilter('all')}
                                    className="text-blue-600 focus:ring-blue-500"
                                />
                                <span>All</span>
                            </label>
                            <label className="flex items-center gap-1 cursor-pointer">
                                <input
                                    type="radio"
                                    name="statusFilter"
                                    checked={statusFilter === 'inhouse'}
                                    onChange={() => setStatusFilter('inhouse')}
                                    className="text-blue-600 focus:ring-blue-500"
                                />
                                <span>InHouse</span>
                            </label>
                            <label className="flex items-center gap-1 cursor-pointer">
                                <input
                                    type="radio"
                                    name="statusFilter"
                                    checked={statusFilter === 'reservation'}
                                    onChange={() => setStatusFilter('reservation')}
                                    className="text-blue-600 focus:ring-blue-500"
                                />
                                <span>Reservation</span>
                            </label>
                            <label className="flex items-center gap-1 cursor-pointer">
                                <input
                                    type="radio"
                                    name="statusFilter"
                                    checked={statusFilter === 'checkedout'}
                                    onChange={() => setStatusFilter('checkedout')}
                                    className="text-blue-600 focus:ring-blue-500"
                                />
                                <span>Checked Out</span>
                            </label>
                        </div>
                    </div>
                </div>

                {/* Table: Source / Destination Folio List */}
                <div className="flex-1 overflow-y-auto p-3">
                    <div className="text-[11px] font-bold text-gray-700 uppercase tracking-wide mb-2 flex items-center justify-between">
                        <span>Select Target Destination Folio</span>
                        <button
                            type="button"
                            onClick={handleTransferToGroupOwner}
                            disabled={isSubmitting}
                            className="text-blue-600 hover:text-blue-800 text-[11px] font-semibold underline flex items-center gap-1 cursor-pointer"
                        >
                            <ArrowRight size={12} />
                            <span>Transfer All Charges to Group Owner</span>
                        </button>
                    </div>

                    <div className="border border-gray-200 rounded-lg overflow-hidden">
                        <table className="w-full text-left text-xs border-collapse">
                            <thead className="bg-gray-50/80 border-b border-gray-200 text-gray-500 font-semibold text-[11px]">
                                <tr>
                                    <th className="py-2 px-2.5">Folio No</th>
                                    <th className="py-2 px-2.5">Room</th>
                                    <th className="py-2 px-2.5">Guest</th>
                                    <th className="py-2 px-2.5">Billing Contact</th>
                                    <th className="py-2 px-2.5">Arrival</th>
                                    <th className="py-2 px-2.5">Departure</th>
                                    <th className="py-2 px-2.5 text-right">Balance</th>
                                    <th className="py-2 px-2.5 text-center">Action</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {availableFolios.length === 0 ? (
                                    <tr>
                                        <td colSpan={8} className="py-8 text-center text-gray-400">
                                            No eligible destination folios found matching criteria.
                                        </td>
                                    </tr>
                                ) : (
                                    availableFolios.map((f) => (
                                        <tr key={f.id} className="hover:bg-blue-50/50 transition-colors">
                                            <td className="py-2 px-2.5 font-mono font-medium text-gray-900">{f.folio_number}</td>
                                            <td className="py-2 px-2.5">{f.room_number || f.rooms?.[0]?.room_number || '-'}</td>
                                            <td className="py-2 px-2.5 font-medium">{f.guest_name}</td>
                                            <td className="py-2 px-2.5 text-gray-600 font-mono text-[11px]">{f.guest_phone || '-'}</td>
                                            <td className="py-2 px-2.5 font-mono text-[11px]">{f.check_in || '-'}</td>
                                            <td className="py-2 px-2.5 font-mono text-[11px]">{f.check_out || '-'}</td>
                                            <td className="py-2 px-2.5 text-right font-mono font-semibold text-gray-900">
                                                {currency} {Number(f.calculatedBalance !== undefined ? f.calculatedBalance : f.balance || 0).toFixed(2)}
                                            </td>
                                            <td className="py-2 px-2.5 text-center">
                                                <button
                                                    type="button"
                                                    disabled={isSubmitting}
                                                    onClick={() => handleTransfer(f.id)}
                                                    className="bg-[#1e3a8a] hover:bg-blue-900 text-white px-3 py-1 rounded text-[11px] font-semibold transition-colors cursor-pointer disabled:opacity-50"
                                                >
                                                    Select
                                                </button>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Footer */}
                <div className="p-3 bg-gray-50 border-t border-gray-100 flex items-center justify-between text-xs text-gray-500">
                    <span>Current Source: <strong className="text-gray-800">{currentFolio?.folio_number}</strong> ({currentFolio?.guest_name})</span>
                    <button
                        type="button"
                        onClick={onClose}
                        className="px-4 py-1.5 rounded-md border border-gray-300 bg-white hover:bg-gray-100 text-gray-700 font-medium text-xs cursor-pointer"
                    >
                        Close
                    </button>
                </div>
            </div>
        </div>
    );
};
