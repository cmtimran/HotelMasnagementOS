import React, { useState, useEffect } from 'react';
import { X, Sliders, Check, RefreshCw, AlertCircle } from 'lucide-react';
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
        <>
            {/* Backdrop */}
            <div
                className="fixed inset-0 z-[100004] bg-black/25 backdrop-blur-2xs transition-opacity animate-in fade-in duration-100"
                onClick={onClose}
            />

            {/* Slide-out Drawer Panel (Right Side) */}
            <div className="fixed inset-y-0 right-0 w-80 sm:w-96 bg-white shadow-2xl z-[100005] flex flex-col border-l border-gray-200 animate-in slide-in-from-right duration-200 text-gray-800 text-xs font-sans">
                {/* Header */}
                <div className="bg-[#1e3a8a] text-white px-4 py-3 flex items-center justify-between flex-shrink-0 shadow-xs">
                    <div className="flex items-center gap-2">
                        <Sliders size={16} className="text-amber-300" />
                        <h3 className="text-xs font-bold tracking-wide uppercase">Adjustment Posting</h3>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        className="text-white/80 hover:text-white transition-colors cursor-pointer"
                    >
                        <X size={16} />
                    </button>
                </div>

                {/* Form Body - Scrollable */}
                <form onSubmit={handleSubmit} className="flex-1 flex flex-col min-h-0 overflow-hidden">
                    <div className="flex-1 overflow-y-auto p-4 space-y-3.5">
                        {errorMsg && (
                            <div className="bg-rose-50 border border-rose-200 text-rose-700 px-3 py-2 rounded-lg text-xs flex items-center gap-2">
                                <AlertCircle size={14} className="shrink-0 text-rose-600" />
                                <span>{errorMsg}</span>
                            </div>
                        )}

                        {/* Folio Dropdown */}
                        <div>
                            <label className="block text-[11px] font-bold text-gray-700 uppercase tracking-wide mb-1">
                                <span className="text-rose-500 mr-0.5">*</span> Folio
                            </label>
                            <select
                                value={selectedFolioId}
                                onChange={(e) => setSelectedFolioId(e.target.value)}
                                className="w-full bg-white border border-gray-300 rounded px-2.5 py-1.5 text-xs text-gray-800 focus:ring-1 focus:ring-blue-500 cursor-pointer"
                            >
                                {folios.map((f) => (
                                    <option key={f.id} value={f.id}>
                                        {f.room_number ? `Room ${f.room_number} - ` : ''}{f.folio_number} {f.guest_name ? `- ${f.guest_name}` : ''}
                                    </option>
                                ))}
                            </select>
                        </div>

                        {/* Revenue Head Dropdown */}
                        <div>
                            <label className="block text-[11px] font-bold text-gray-700 uppercase tracking-wide mb-1">
                                Revenue Head
                            </label>
                            <select
                                value={selectedHead}
                                onChange={(e) => setSelectedHead(e.target.value)}
                                className="w-full bg-white border border-gray-300 rounded px-2.5 py-1.5 text-xs text-gray-800 focus:ring-1 focus:ring-blue-500 cursor-pointer"
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
                        <label className="flex items-center gap-2 cursor-pointer select-none text-gray-700 font-semibold pt-1">
                            <input
                                type="checkbox"
                                checked={taxApplicable}
                                onChange={(e) => setTaxApplicable(e.target.checked)}
                                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 w-4 h-4 cursor-pointer"
                            />
                            <span>Tax Applicable</span>
                        </label>

                        {/* Amount */}
                        <div>
                            <label className="block text-[11px] font-bold text-gray-700 uppercase tracking-wide mb-1">
                                Amount (Use negative sign - for rebate)
                            </label>
                            <input
                                type="number"
                                step="any"
                                value={amount}
                                onChange={(e) => setAmount(e.target.value)}
                                className="w-full bg-white border border-gray-300 rounded px-2.5 py-1.5 text-xs text-gray-800 focus:ring-1 focus:ring-blue-500 font-mono font-bold"
                                placeholder="0.00"
                            />
                        </div>

                        {/* Comment */}
                        <div>
                            <label className="block text-[11px] font-bold text-gray-700 uppercase tracking-wide mb-1">
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
                    </div>

                    {/* Footer Actions */}
                    <div className="bg-gray-50 border-t border-gray-200 px-4 py-3 flex items-center justify-end gap-2 flex-shrink-0">
                        <button
                            type="button"
                            onClick={onClose}
                            className="bg-white hover:bg-gray-100 text-gray-700 border border-gray-300 font-semibold rounded px-4 py-1.5 text-xs shadow-xs transition-colors cursor-pointer"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={isSubmitting}
                            className="bg-blue-600 hover:bg-blue-700 text-white font-bold rounded px-4 py-1.5 text-xs shadow-xs transition-colors cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
                        >
                            {isSubmitting ? <RefreshCw size={12} className="animate-spin" /> : <Check size={12} />}
                            <span>Add Adjustment</span>
                        </button>
                    </div>
                </form>
            </div>
        </>
    );
};
