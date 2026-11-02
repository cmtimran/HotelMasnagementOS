import React, { useState, useEffect, useMemo } from 'react';
import { X, ChevronRight, Inbox } from 'lucide-react';
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

            // If another folio exists for this reservation, pre-select it; otherwise set to '' (which will create Cut Folio - 2)
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
        <div className="fixed inset-0 z-[100005] bg-black/50 backdrop-blur-xs flex items-center justify-center p-3 animate-in fade-in duration-100">
            <div className="bg-white rounded-xl shadow-2xl border border-gray-200 w-full max-w-5xl overflow-hidden flex flex-col text-gray-800 max-h-[85vh]">
                {/* Header matching Screenshot e9217c7a.png */}
                <div className="bg-[#1e3a8a] text-white px-4 py-2.5 flex items-center justify-between">
                    <h3 className="text-xs font-bold tracking-wide">Split Folio</h3>
                    <button
                        type="button"
                        onClick={onClose}
                        className="text-white/80 hover:text-white transition-colors cursor-pointer"
                    >
                        <X size={15} />
                    </button>
                </div>

                {errorMsg && (
                    <div className="bg-rose-50 border-b border-rose-200 text-rose-700 px-4 py-1.5 text-xs">
                        {errorMsg}
                    </div>
                )}

                {/* Body: Two columns side-by-side with transfer button in middle */}
                <div className="p-3 grid grid-cols-12 gap-3 flex-1 overflow-y-auto items-stretch">
                    {/* LEFT COLUMN: Source Folio */}
                    <div className="col-span-5 flex flex-col border border-gray-200 rounded-lg p-2.5 space-y-2 bg-gray-50/30">
                        <div className="text-xs font-bold text-gray-800 uppercase tracking-wide">Source Folio</div>

                        <div className="grid grid-cols-2 gap-2 text-xs">
                            <div>
                                <label className="block text-[10px] text-gray-500 font-semibold mb-0.5">Room</label>
                                <select
                                    value={activeSourceFolio?.room_number || ''}
                                    disabled
                                    className="w-full bg-white border border-gray-300 rounded px-2 py-1 text-xs text-gray-700"
                                >
                                    <option>{activeSourceFolio?.room_number || 'Room 505'}</option>
                                </select>
                            </div>

                            <div>
                                <label className="block text-[10px] text-gray-500 font-semibold mb-0.5">Guest Folio</label>
                                <select
                                    value={sourceFolioId}
                                    onChange={(e) => setSourceFolioId(e.target.value)}
                                    className="w-full bg-white border border-gray-300 rounded px-2 py-1 text-xs text-gray-700 font-mono truncate"
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
                        <div className="flex-1 border border-gray-200 rounded-md overflow-hidden bg-white min-h-[220px]">
                            {sourceCharges.length === 0 ? (
                                <div className="h-full flex flex-col items-center justify-center p-6 text-gray-400">
                                    <Inbox size={28} className="opacity-40 mb-1" />
                                    <span className="text-xs">No charges in source folio</span>
                                </div>
                            ) : (
                                <table className="w-full text-left text-[11px] border-collapse">
                                    <thead className="bg-gray-50 border-b border-gray-200 text-gray-500 font-semibold">
                                        <tr>
                                            <th className="py-1 px-2 w-6">
                                                <input
                                                    type="checkbox"
                                                    checked={selectedChargeIds.length > 0 && selectedChargeIds.length === sourceCharges.length}
                                                    onChange={toggleSelectAll}
                                                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 w-3 h-3"
                                                />
                                            </th>
                                            <th className="py-1 px-1.5">Date</th>
                                            <th className="py-1 px-1.5">Ref No.</th>
                                            <th className="py-1 px-1.5">Revenue Head</th>
                                            <th className="py-1 px-1.5 text-right">Amount</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100">
                                        {sourceCharges.map((c) => {
                                            const isChecked = selectedChargeIds.includes(c.id);
                                            return (
                                                <tr
                                                    key={c.id}
                                                    onClick={() => toggleSelectCharge(c.id)}
                                                    className={`cursor-pointer transition-colors ${
                                                        isChecked ? 'bg-blue-50/70 font-semibold' : 'hover:bg-gray-50'
                                                    }`}
                                                >
                                                    <td className="py-1 px-2" onClick={(e) => e.stopPropagation()}>
                                                        <input
                                                            type="checkbox"
                                                            checked={isChecked}
                                                            onChange={() => toggleSelectCharge(c.id)}
                                                            className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 w-3 h-3"
                                                        />
                                                    </td>
                                                    <td className="py-1 px-1.5 font-mono text-[10px] text-gray-600">{c.charge_date}</td>
                                                    <td className="py-1 px-1.5 font-mono text-[10px]">{c.ref_no}</td>
                                                    <td className="py-1 px-1.5 truncate max-w-[100px]">{c.revenue_head}</td>
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

                    {/* CENTER ACTION: Transfer Arrow */}
                    <div className="col-span-2 flex flex-col items-center justify-center gap-2">
                        <button
                            type="button"
                            onClick={handleSplit}
                            disabled={selectedChargeIds.length === 0 || isSubmitting}
                            title="Transfer selected charges to Destination Folio"
                            className="w-10 h-10 rounded-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-200 text-white flex items-center justify-center shadow-md transition-all cursor-pointer disabled:cursor-not-allowed"
                        >
                            <ChevronRight size={18} />
                        </button>
                        <span className="text-[10px] text-gray-500 font-medium text-center">
                            {selectedChargeIds.length} item(s) selected
                        </span>
                    </div>

                    {/* RIGHT COLUMN: Destination Folio */}
                    <div className="col-span-5 flex flex-col border border-gray-200 rounded-lg p-2.5 space-y-2 bg-gray-50/30">
                        <div className="text-xs font-bold text-gray-800 uppercase tracking-wide">Destination Folio</div>

                        <div className="grid grid-cols-2 gap-2 text-xs">
                            <div>
                                <label className="block text-[10px] text-gray-500 font-semibold mb-0.5">Room</label>
                                <select
                                    value={activeDestFolio?.room_number || activeSourceFolio?.room_number || ''}
                                    disabled
                                    className="w-full bg-white border border-gray-300 rounded px-2 py-1 text-xs text-gray-700"
                                >
                                    <option>{activeDestFolio?.room_number || activeSourceFolio?.room_number || 'Room 505'}</option>
                                </select>
                            </div>

                            <div>
                                <label className="block text-[10px] text-gray-500 font-semibold mb-0.5">Folio</label>
                                <select
                                    value={destFolioId}
                                    onChange={(e) => setDestFolioId(e.target.value)}
                                    className="w-full bg-white border border-gray-300 rounded px-2 py-1 text-xs text-gray-700 font-mono truncate"
                                >
                                    <option value="NEW_CUT_FOLIO">+ Create New Folio (Cut Folio 2)</option>
                                    {allFolios.filter(f => f.id !== activeSourceFolio?.id).map((f) => (
                                        <option key={f.id} value={f.id}>
                                            {f.folio_number}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        {/* Destination Ledger Table */}
                        <div className="flex-1 border border-gray-200 rounded-md overflow-hidden bg-white min-h-[220px]">
                            {destCharges.length === 0 ? (
                                <div className="h-full flex flex-col items-center justify-center p-6 text-gray-400">
                                    <Inbox size={28} className="opacity-40 mb-1" />
                                    <span className="text-xs">
                                        {destFolioId === 'NEW_CUT_FOLIO'
                                            ? 'New Folio will be generated on transfer'
                                            : 'No charges in destination folio'}
                                    </span>
                                </div>
                            ) : (
                                <table className="w-full text-left text-[11px] border-collapse">
                                    <thead className="bg-gray-50 border-b border-gray-200 text-gray-500 font-semibold">
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
                <div className="p-3 bg-gray-50 border-t border-gray-100 flex items-center justify-end gap-2">
                    <button
                        type="button"
                        onClick={onClose}
                        className="px-4 py-1.5 rounded-md border border-gray-300 bg-white hover:bg-gray-100 text-gray-700 font-semibold text-xs cursor-pointer"
                    >
                        Close
                    </button>
                    <button
                        type="button"
                        onClick={handleSplit}
                        disabled={selectedChargeIds.length === 0 || isSubmitting}
                        className="px-5 py-1.5 rounded-md bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs cursor-pointer shadow-xs disabled:opacity-50"
                    >
                        {isSubmitting ? 'Splitting...' : 'Apply Split Folio'}
                    </button>
                </div>
            </div>
        </div>
    );
};
