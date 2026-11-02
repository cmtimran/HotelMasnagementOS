import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { getApiBaseUrl } from '../../../utils/apiUrl';
import type { FolioData, RevenueHead } from '../folioTypes';

interface ApplyDiscountModalProps {
    isOpen: boolean;
    onClose: () => void;
    folios: FolioData[];
    activeFolioId: number | string;
    onSuccess: () => void;
}

export const ApplyDiscountModal: React.FC<ApplyDiscountModalProps> = ({
    isOpen,
    onClose,
    folios,
    activeFolioId,
    onSuccess
}) => {
    const [selectedFolioId, setSelectedFolioId] = useState<string | number>(activeFolioId);
    const [discountType, setDiscountType] = useState<string>('Manager Discretion');
    const [revenueHeads, setRevenueHeads] = useState<RevenueHead[]>([]);
    const [selectedHead, setSelectedHead] = useState<string>('Room Charges');
    const [discountAmount, setDiscountAmount] = useState<string>('');
    const [taxApplicable, setTaxApplicable] = useState<boolean>(false);
    const [comment, setComment] = useState<string>('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [errorMsg, setErrorMsg] = useState<string>('');

    useEffect(() => {
        if (isOpen) {
            setSelectedFolioId(activeFolioId);
            setDiscountType('Manager Discretion');
            setDiscountAmount('');
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
        const amt = parseFloat(discountAmount);
        if (isNaN(amt) || amt <= 0) {
            setErrorMsg('Please enter a valid discount amount');
            return;
        }

        setIsSubmitting(true);
        setErrorMsg('');

        try {
            const res = await fetch(`${getApiBaseUrl()}/api/accounting/folios/${selectedFolioId}/discounts`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    discountType,
                    revenueHead: selectedHead,
                    taxApplicable,
                    discountAmount: amt,
                    comment,
                    userName: 'Front Desk'
                })
            });

            const data = await res.json();
            if (data?.success) {
                onSuccess();
                onClose();
            } else {
                setErrorMsg(data?.error || 'Failed to apply discount');
            }
        } catch (err: any) {
            setErrorMsg(err?.message || 'Network error while applying discount');
        } finally {
            setIsSubmitting(false);
        }
    };

    if (!isOpen) return null;

    return (
        <>
            {/* Backdrop */}
            <div
                className="fixed inset-0 z-[100004] bg-black/20 backdrop-blur-2xs transition-opacity animate-in fade-in duration-100"
                onClick={onClose}
            />

            {/* Slide-out Drawer Panel (Right Side) */}
            <div className="fixed inset-y-0 right-0 w-80 sm:w-96 bg-white shadow-2xl z-[100005] flex flex-col border-l border-gray-200 animate-in slide-in-from-right duration-200 text-gray-800 text-xs">
                {/* Header matching Screenshot 523da607.png */}
                <div className="bg-[#1e3a8a] text-white px-4 py-2.5 flex items-center justify-between flex-shrink-0 shadow-xs">
                    <h3 className="text-xs font-bold tracking-wide">Apply Discount</h3>
                    <button
                        type="button"
                        onClick={onClose}
                        className="text-white/80 hover:text-white transition-colors cursor-pointer"
                    >
                        <X size={15} />
                    </button>
                </div>

                {/* Form Body - Scrollable */}
                <form onSubmit={handleSubmit} className="flex-1 flex flex-col min-h-0 overflow-hidden">
                    <div className="flex-1 overflow-y-auto p-4 space-y-3.5">
                        {errorMsg && (
                            <div className="bg-rose-50 border border-rose-200 text-rose-700 px-3 py-1.5 rounded text-[11px]">
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

                        {/* Discount Dropdown */}
                        <div>
                            <label className="block text-[11px] font-semibold text-gray-700 mb-1">
                                <span className="text-rose-500 mr-0.5">*</span> Discount
                            </label>
                            <select
                                value={discountType}
                                onChange={(e) => setDiscountType(e.target.value)}
                                className="w-full bg-white border border-gray-300 rounded px-2.5 py-1.5 text-xs text-gray-800 focus:ring-1 focus:ring-blue-500"
                            >
                                <option value="Manager Discretion">Manager Discretion Discount</option>
                                <option value="Corporate Partner">Corporate Partner Discount (10%)</option>
                                <option value="Promotional Voucher">Promotional Voucher</option>
                                <option value="VIP Guest">VIP Guest Courtesy</option>
                                <option value="Service Recovery">Service Recovery Goodwill</option>
                            </select>
                        </div>

                        {/* Revenue Head Dropdown */}
                        <div>
                            <label className="block text-[11px] font-semibold text-gray-700 mb-1">
                                <span className="text-rose-500 mr-0.5">*</span> Revenue Head
                            </label>
                            <select
                                value={selectedHead}
                                onChange={(e) => setSelectedHead(e.target.value)}
                                className="w-full bg-white border border-gray-300 rounded px-2.5 py-1.5 text-xs text-gray-800 focus:ring-1 focus:ring-blue-500"
                            >
                                <option value="Room Charges">Room Charges</option>
                                {revenueHeads.filter(h => h.name !== 'Room Charges').map((h) => (
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
                                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 w-3.5 h-3.5 cursor-pointer"
                            />
                            <span>Tax Applicable</span>
                        </label>

                        {/* Discount Amount */}
                        <div>
                            <label className="block text-[11px] font-semibold text-gray-700 mb-1">
                                <span className="text-rose-500 mr-0.5">*</span> Discount Amount
                            </label>
                            <input
                                type="number"
                                step="any"
                                min="0"
                                value={discountAmount}
                                onChange={(e) => setDiscountAmount(e.target.value)}
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
                                placeholder="Enter discount justification..."
                            />
                        </div>
                    </div>

                    {/* Pinned Action Buttons Footer */}
                    <div className="p-3 border-t border-gray-200 flex items-center justify-end gap-2 bg-white flex-shrink-0">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-3.5 py-1.5 rounded-md border border-gray-300 bg-white hover:bg-gray-50 text-gray-700 font-semibold text-xs cursor-pointer transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={isSubmitting}
                            className="px-4 py-1.5 rounded-md bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs shadow-xs cursor-pointer transition-colors disabled:opacity-50"
                        >
                            {isSubmitting ? 'Applying...' : 'Apply Discount'}
                        </button>
                    </div>
                </form>
            </div>
        </>
    );
};
