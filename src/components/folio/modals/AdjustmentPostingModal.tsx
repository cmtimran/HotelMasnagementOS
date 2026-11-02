import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { getApiBaseUrl } from '../../../utils/apiUrl';
import type { FolioData, RevenueHead } from '../folioTypes';

interface AdjustmentPostingModalProps {
    isOpen: boolean;
    onClose: () => void;
    folios: FolioData[];
    activeFolioId: number | string;
    onSuccess: () => void;
}

export const AdjustmentPostingModal: React.FC<AdjustmentPostingModalProps> = ({
    isOpen,
    onClose,
    folios,
    activeFolioId,
    onSuccess
}) => {
    const [selectedFolioId, setSelectedFolioId] = useState<string | number>(activeFolioId);
    const [revenueHeads, setRevenueHeads] = useState<RevenueHead[]>([]);
    const [selectedHead, setSelectedHead] = useState<string>('Adjustments');
    const [taxApplicable, setTaxApplicable] = useState<boolean>(false);
    const [amount, setAmount] = useState<string>('0.00');
    const [comment, setComment] = useState<string>('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [errorMsg, setErrorMsg] = useState<string>('');

    useEffect(() => {
        if (isOpen) {
            setSelectedFolioId(activeFolioId);
            setAmount('0.00');
            setTaxApplicable(false);
            setComment('');
            setErrorMsg('');

            fetch(`${getApiBaseUrl()}/api/accounting/revenue-heads`)
                .then(res => res.json())
                .then(data => {
                    if (data?.success && Array.isArray(data.data)) {
                        setRevenueHeads(data.data);
                    }
                })
                .catch(() => {});
        }
    }, [isOpen, activeFolioId]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const numAmt = parseFloat(amount);
        if (isNaN(numAmt) || numAmt === 0) {
            setErrorMsg('Adjustment amount cannot be zero');
            return;
        }

        setIsSubmitting(true);
        setErrorMsg('');

        try {
            const res = await fetch(`${getApiBaseUrl()}/api/accounting/folios/${selectedFolioId}/adjustments`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    revenueHead: selectedHead,
                    amount: numAmt,
                    taxApplicable,
                    comment,
                    userName: 'Front Desk'
                })
            });

            const data = await res.json();
            if (data?.success) {
                onSuccess();
                onClose();
            } else {
                setErrorMsg(data?.error || 'Failed to post adjustment');
            }
        } catch (err: any) {
            setErrorMsg(err?.message || 'Network error while posting adjustment');
        } finally {
            setIsSubmitting(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[100005] bg-black/50 backdrop-blur-xs flex items-center justify-center p-3 animate-in fade-in duration-100">
            <div className="bg-white rounded-xl shadow-2xl border border-gray-200 w-full max-w-sm overflow-hidden flex flex-col text-gray-800">
                {/* Header matching Screenshot da923e60.png */}
                <div className="bg-[#1e3a8a] text-white px-4 py-2.5 flex items-center justify-between">
                    <h3 className="text-xs font-bold tracking-wide">Adjustment Posting</h3>
                    <button
                        type="button"
                        onClick={onClose}
                        className="text-white/80 hover:text-white transition-colors cursor-pointer"
                    >
                        <X size={15} />
                    </button>
                </div>

                {/* Form Body */}
                <form onSubmit={handleSubmit} className="p-3.5 space-y-2.5 text-xs">
                    {errorMsg && (
                        <div className="bg-rose-50 border border-rose-200 text-rose-700 px-2.5 py-1 rounded text-[11px]">
                            {errorMsg}
                        </div>
                    )}

                    {/* Folio Dropdown */}
                    <div>
                        <label className="block text-[11px] font-semibold text-gray-700 mb-1">
                            <span className="text-rose-500 mr-0.5">*</span> Folio
                        </label>
                        <select
                            value={selectedFolioId}
                            onChange={(e) => setSelectedFolioId(e.target.value)}
                            className="w-full bg-white border border-gray-300 rounded px-2.5 py-1.5 text-xs text-gray-800 focus:ring-1 focus:ring-blue-500"
                        >
                            {folios.map((f) => (
                                <option key={f.id} value={f.id}>
                                    {f.folio_number} {f.guest_name ? `- ${f.guest_name}` : ''}
                                </option>
                            ))}
                        </select>
                    </div>

                    {/* Revenue Head Dropdown */}
                    <div>
                        <label className="block text-[11px] font-semibold text-gray-700 mb-1">
                            Revenue Head
                        </label>
                        <select
                            value={selectedHead}
                            onChange={(e) => setSelectedHead(e.target.value)}
                            className="w-full bg-white border border-gray-300 rounded px-2.5 py-1.5 text-xs text-gray-800 focus:ring-1 focus:ring-blue-500"
                        >
                            <option value="Adjustments">Adjustments</option>
                            <option value="Room Tariff Correction">Room Tariff Correction</option>
                            <option value="Minibar Discrepancy">Minibar Discrepancy</option>
                            <option value="Laundry Rebate">Laundry Rebate</option>
                            <option value="F&B Billing Correction">F&B Billing Correction</option>
                            {revenueHeads.map((h) => (
                                <option key={h.id || h.code} value={h.name}>
                                    {h.name}
                                </option>
                            ))}
                        </select>
                    </div>

                    {/* Tax Applicable Checkbox */}
                    <label className="flex items-center gap-2 cursor-pointer select-none text-gray-700 font-medium">
                        <input
                            type="checkbox"
                            checked={taxApplicable}
                            onChange={(e) => setTaxApplicable(e.target.checked)}
                            className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 w-3.5 h-3.5"
                        />
                        <span>Tax Applicable</span>
                    </label>

                    {/* Amount */}
                    <div>
                        <label className="block text-[11px] font-semibold text-gray-700 mb-1">
                            Amount (Use negative sign - for rebate)
                        </label>
                        <input
                            type="number"
                            step="any"
                            value={amount}
                            onChange={(e) => setAmount(e.target.value)}
                            className="w-full bg-white border border-gray-300 rounded px-2.5 py-1.5 text-xs text-gray-800 focus:ring-1 focus:ring-blue-500 font-mono"
                            placeholder="0.00"
                        />
                    </div>

                    {/* Comment */}
                    <div>
                        <label className="block text-[11px] font-semibold text-gray-700 mb-1">
                            Comment
                        </label>
                        <textarea
                            rows={3}
                            value={comment}
                            onChange={(e) => setComment(e.target.value)}
                            className="w-full bg-white border border-gray-300 rounded px-2.5 py-1.5 text-xs text-gray-800 focus:ring-1 focus:ring-blue-500 resize-none"
                            placeholder="Enter adjustment reason..."
                        />
                    </div>

                    {/* Footer Actions matching Screenshot da923e60.png */}
                    <div className="flex items-center justify-end gap-2 pt-3 border-t border-gray-100">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-4 py-1.5 rounded-md border border-gray-200 bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium text-xs transition-colors cursor-pointer"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={isSubmitting}
                            className="px-5 py-1.5 rounded-md bg-[#1e3a8a] hover:bg-blue-900 text-white font-semibold text-xs transition-colors cursor-pointer shadow-xs disabled:opacity-50"
                        >
                            {isSubmitting ? 'Saving...' : 'Add'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};
