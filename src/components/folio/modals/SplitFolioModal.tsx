import React, { useState, useEffect, useMemo } from 'react';
import { X, ChevronRight, Inbox, Scissors } from 'lucide-react';
import { getApiBaseUrl } from '../../../utils/apiUrl';
import { getCurrencySymbol } from '../../../utils/currencyUtils';
import type { FolioData } from '../folioTypes';

interface SplitFolioModalProps {
    isOpen: boolean;
    onClose: () => void;
    currentFolio: FolioData | null;
    allFolios: FolioData[];
    onSuccess: () => void;
}

export const SplitFolioModal: React.FC<SplitFolioModalProps> = ({
    isOpen,
    onClose,
    currentFolio,
    allFolios,
    onSuccess
}) => {
    const currency = useMemo(() => getCurrencySymbol(), []);
    const [sourceFolioId, setSourceFolioId] = useState<string | number>('');
    const [destFolioId, setDestFolioId] = useState<string | number>('');
    const [selectedChargeIds, setSelectedChargeIds] = useState<Array<number | string>>([]);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [errorMsg, setErrorMsg] = useState('');

    useEffect(() => {
        if (isOpen && currentFolio) {
            setSourceFolioId(currentFolio.id);
            setSelectedChargeIds([]);
            setErrorMsg('');

            const otherFolio = allFolios.find(f => f.id !== currentFolio.id && f.reservation_id === currentFolio.reservation_id);
            setDestFolioId(otherFolio ? otherFolio.id : 'NEW_CUT_FOLIO');
        }
    }, [isOpen, currentFolio, allFolios]);

    const activeSourceFolio = useMemo(() => {
        return allFolios.find(f => String(f.id) === String(sourceFolioId)) || currentFolio;
    }, [allFolios, sourceFolioId, currentFolio]);

    const activeDestFolio = useMemo(() => {
        return allFolios.find(f => String(f.id) === String(destFolioId));
    }, [allFolios, destFolioId]);

    const toggleSelectCharge = (id: number | string) => {
        setSelectedChargeIds(prev =>
            prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
        );
    };

    const toggleSelectAll = () => {
        const available = activeSourceFolio?.charges?.filter(c => !c.is_voided) || [];
        if (selectedChargeIds.length === available.length) {
            setSelectedChargeIds([]);
        } else {
            setSelectedChargeIds(available.map(c => c.id));
        }
    };

    const handleSplit = async () => {
        if (selectedChargeIds.length === 0) {
            setErrorMsg('Please select at least one charge to split into the destination folio.');
            return;
        }

        setIsSubmitting(true);
        setErrorMsg('');

        try {
            const res = await fetch(`${getApiBaseUrl()}/api/accounting/folios/split`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    sourceFolioId: activeSourceFolio?.id,
                    destFolioId: destFolioId === 'NEW_CUT_FOLIO' ? null : destFolioId,
                    chargeIds: selectedChargeIds,
                    newFolioName: destFolioId === 'NEW_CUT_FOLIO' ? `${activeSourceFolio?.folio_number}-2` : undefined,
                    userName: 'Front Desk'
                })
            });

            const data = await res.json();
            if (data?.success) {
                onSuccess();
                onClose();
            } else {
                setErrorMsg(data?.error || 'Failed to split folio');
            }
        } catch (err: any) {
            setErrorMsg(err?.message || 'Network error while splitting folio');
        } finally {
            setIsSubmitting(false);
        }
    };

    if (!isOpen) return null;

    const sourceCharges = activeSourceFolio?.charges?.filter(c => !c.is_voided) || [];
    const destCharges = activeDestFolio?.charges?.filter(c => !c.is_voided) || [];

    return (
        <>
            {/* Backdrop */}
            <div
                className="fixed inset-0 z-[100004] bg-black/25 backdrop-blur-2xs transition-opacity animate-in fade-in duration-100"
                onClick={onClose}
            />

            {/* Slide-out Drawer Panel (Right Side) */}
            <div className="fixed inset-y-0 right-0 w-[580px] sm:w-[720px] max-w-full bg-white shadow-2xl z-[100005] flex flex-col border-l border-gray-200 animate-in slide-in-from-right duration-200 text-gray-800 text-xs font-sans">
                {/* Header */}
                <div className="bg-[#1e3a8a] text-white px-4 py-3 flex items-center justify-between flex-shrink-0 shadow-xs">
                    <div className="flex items-center gap-2">
                        <Scissors size={16} className="text-amber-300" />
                        <h3 className="text-xs font-bold tracking-wide uppercase">Split Folio</h3>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        className="text-white/80 hover:text-white transition-colors cursor-pointer"
                    >
                        <X size={16} />
                    </button>
                </div>

                {errorMsg && (
                    <div className="bg-rose-50 border-b border-rose-200 text-rose-700 px-4 py-2 text-xs flex-shrink-0">
                        {errorMsg}
                    </div>
                )}

                {/* Body: Two columns side-by-side with transfer button in middle */}
                <div className="p-3 grid grid-cols-12 gap-2.5 flex-1 min-h-0 overflow-y-auto items-stretch">
                    {/* LEFT COLUMN: Source Folio */}
                    <div className="col-span-5 flex flex-col border border-gray-200 rounded-lg p-2.5 space-y-2 bg-gray-50/40 min-h-0 overflow-hidden">
                        <div className="text-xs font-bold text-gray-800 uppercase tracking-wide">Source Folio</div>

                        <div className="grid grid-cols-2 gap-2 text-xs">
                            <div>
                                <label className="block text-[10px] text-gray-500 font-semibold mb-0.5">Room</label>
                                <select
                                    value={activeSourceFolio?.room_number || ''}
                                    disabled
                                    className="w-full bg-white border border-gray-300 rounded px-2 py-1 text-xs text-gray-700"
                                >
                                    <option>{activeSourceFolio?.room_number ? `Room ${activeSourceFolio.room_number}` : 'Room Unassigned'}</option>
                                </select>
                            </div>

                            <div>
                                <label className="block text-[10px] text-gray-500 font-semibold mb-0.5">Guest Folio</label>
                                <select
                                    value={sourceFolioId}
                                    onChange={(e) => setSourceFolioId(e.target.value)}
                                    className="w-full bg-white border border-gray-300 rounded px-2 py-1 text-xs text-gray-700 font-mono truncate cursor-pointer"
                                >
                                    {allFolios.map((f) => (
                                        <option key={f.id} value={f.id}>
                                            {f.folio_number}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        {/* Source Ledger Table */}
                        <div className="flex-1 border border-gray-200 rounded-md overflow-y-auto bg-white min-h-[220px]">
                            {sourceCharges.length === 0 ? (
                                <div className="h-full flex flex-col items-center justify-center p-6 text-gray-400">
                                    <Inbox size={28} className="opacity-40 mb-1" />
                                    <span className="text-xs">No charges in source folio</span>
                                </div>
                            ) : (
                                <table className="w-full text-left text-[11px] border-collapse">
                                    <thead className="bg-gray-50 border-b border-gray-200 text-gray-500 font-semibold sticky top-0 z-10">
                                        <tr>
                                            <th className="py-1 px-1.5 w-6 text-center">
                                                <input
                                                    type="checkbox"
                                                    checked={selectedChargeIds.length === sourceCharges.length && sourceCharges.length > 0}
                                                    onChange={toggleSelectAll}
                                                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 w-3 h-3 cursor-pointer"
                                                />
                                            </th>
                                            <th className="py-1 px-1.5">Date</th>
                                            <th className="py-1 px-1.5">Particulars</th>
                                            <th className="py-1 px-1.5 text-right">Amount</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100">
                                        {sourceCharges.map((c) => {
                                            const isSelected = selectedChargeIds.includes(c.id);
                                            return (
                                                <tr
                                                    key={c.id}
                                                    onClick={() => toggleSelectCharge(c.id)}
                                                    className={`hover:bg-blue-50/60 cursor-pointer transition-colors ${
                                                        isSelected ? 'bg-blue-50 font-medium' : ''
                                                    }`}
                                                >
                                                    <td className="py-1 px-1.5 text-center" onClick={(e) => e.stopPropagation()}>
                                                        <input
                                                            type="checkbox"
                                                            checked={isSelected}
                                                            onChange={() => toggleSelectCharge(c.id)}
                                                            className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 w-3 h-3 cursor-pointer"
                                                        />
                                                    </td>
                                                    <td className="py-1 px-1.5 font-mono text-[10px] text-gray-600">{c.charge_date}</td>
                                                    <td className="py-1 px-1.5 truncate max-w-[120px]" title={c.description}>
                                                        {c.revenue_head || c.description}
                                                    </td>
                                                    <td className="py-1 px-1.5 text-right font-mono font-medium text-rose-600">
                                                        {currency} {Number(c.total_amount || c.amount || 0).toFixed(2)}
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            )}
                        </div>
                    </div>

                    {/* MIDDLE TRANSFER BUTTON */}
                    <div className="col-span-2 flex flex-col items-center justify-center p-1">
                        <button
                            type="button"
                            onClick={handleSplit}
                            disabled={selectedChargeIds.length === 0 || isSubmitting}
                            className="bg-[#1e3a8a] hover:bg-blue-900 text-white rounded-full p-2.5 shadow-md transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center"
                            title="Split Selected Charges into Target Folio"
                        >
                            <ChevronRight size={18} />
                        </button>
                        <span className="text-[10px] text-gray-500 font-medium mt-1 text-center">Move</span>
                    </div>

                    {/* RIGHT COLUMN: Target Destination Folio */}
                    <div className="col-span-5 flex flex-col border border-gray-200 rounded-lg p-2.5 space-y-2 bg-gray-50/40 min-h-0 overflow-hidden">
                        <div className="text-xs font-bold text-gray-800 uppercase tracking-wide">Destination Folio</div>

                        <div className="grid grid-cols-2 gap-2 text-xs">
                            <div>
                                <label className="block text-[10px] text-gray-500 font-semibold mb-0.5">Room</label>
                                <select
                                    value={activeDestFolio?.room_number || activeSourceFolio?.room_number || ''}
                                    disabled
                                    className="w-full bg-white border border-gray-300 rounded px-2 py-1 text-xs text-gray-700"
                                >
                                    <option>{activeDestFolio?.room_number ? `Room ${activeDestFolio.room_number}` : (activeSourceFolio?.room_number ? `Room ${activeSourceFolio.room_number}` : 'Room Unassigned')}</option>
                                </select>
                            </div>

                            <div>
                                <label className="block text-[10px] text-gray-500 font-semibold mb-0.5">Target Folio</label>
                                <select
                                    value={destFolioId}
                                    onChange={(e) => setDestFolioId(e.target.value)}
                                    className="w-full bg-white border border-gray-300 rounded px-2 py-1 text-xs text-gray-700 font-mono truncate cursor-pointer"
                                >
                                    <option value="NEW_CUT_FOLIO">+ Create New Sub-Folio (Folio-2)</option>
                                    {allFolios
                                        .filter(f => f.id !== activeSourceFolio?.id)
                                        .map((f) => (
                                            <option key={f.id} value={f.id}>
                                                {f.folio_number}
                                            </option>
                                        ))}
                                </select>
                            </div>
                        </div>

                        {/* Destination Ledger Table */}
                        <div className="flex-1 border border-gray-200 rounded-md overflow-y-auto bg-white min-h-[220px]">
                            {destCharges.length === 0 ? (
                                <div className="h-full flex flex-col items-center justify-center p-6 text-gray-400">
                                    <Inbox size={28} className="opacity-40 mb-1" />
                                    <span className="text-xs">
                                        {destFolioId === 'NEW_CUT_FOLIO' ? 'New folio will receive selected charges' : 'No charges in destination folio'}
                                    </span>
                                </div>
                            ) : (
                                <table className="w-full text-left text-[11px] border-collapse">
                                    <thead className="bg-gray-50 border-b border-gray-200 text-gray-500 font-semibold sticky top-0 z-10">
                                        <tr>
                                            <th className="py-1 px-1.5">Date</th>
                                            <th className="py-1 px-1.5">Ref No.</th>
                                            <th className="py-1 px-1.5">Revenue Head</th>
                                            <th className="py-1 px-1.5 text-right">Amount</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100">
                                        {destCharges.map((c) => (
                                            <tr key={c.id} className="hover:bg-gray-50">
                                                <td className="py-1 px-1.5 font-mono text-[10px] text-gray-600">{c.charge_date}</td>
                                                <td className="py-1 px-1.5 font-mono text-[10px]">{c.ref_no}</td>
                                                <td className="py-1 px-1.5 truncate max-w-[120px]">{c.revenue_head}</td>
                                                <td className="py-1 px-1.5 text-right font-mono font-medium text-rose-600">
                                                    {currency} {Number(c.total_amount || c.amount || 0).toFixed(2)}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            )}
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div className="p-3 bg-gray-50 border-t border-gray-200 flex items-center justify-end gap-2 flex-shrink-0">
                    <button
                        type="button"
                        onClick={onClose}
                        className="px-4 py-1.5 rounded-md border border-gray-300 bg-white hover:bg-gray-100 text-gray-700 font-semibold text-xs cursor-pointer shadow-xs"
                    >
                        Close
                    </button>
                    <button
                        type="button"
                        onClick={handleSplit}
                        disabled={selectedChargeIds.length === 0 || isSubmitting}
                        className="px-5 py-1.5 rounded-md bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs cursor-pointer shadow-xs disabled:opacity-50"
                    >
                        {isSubmitting ? 'Splitting...' : 'Apply Split Folio'}
                    </button>
                </div>
            </div>
        </>
    );
};
