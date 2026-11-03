import React, { useState } from 'react';
import { X, AlertTriangle } from 'lucide-react';
import { getApiBaseUrl } from '../../../utils/apiUrl';

interface VoidModalProps {
    isOpen: boolean;
    onClose: () => void;
    targetType: 'charge' | 'payment';
    targetId: number | string | null;
    targetDescription?: string;
    targetAmount?: number;
    onSuccess: () => void;
}

export const VoidModal: React.FC<VoidModalProps> = ({
    isOpen,
    onClose,
    targetType,
    targetId,
    targetDescription,
    targetAmount,
    onSuccess
}) => {
    const [voidReason, setVoidReason] = useState('Erroneous posting / Double entry');
    const [customReason, setCustomReason] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [errorMsg, setErrorMsg] = useState('');

    if (!isOpen || !targetId) return null;

    const handleConfirmVoid = async (e: React.FormEvent) => {
        e.preventDefault();
        const reason = voidReason === 'Other' ? customReason.trim() : voidReason;
        if (!reason) {
            setErrorMsg('Mandatory reason required for audit compliance');
            return;
        }

        setIsSubmitting(true);
        setErrorMsg('');

        try {
            const endpoint = targetType === 'charge'
                ? `${getApiBaseUrl()}/api/accounting/folios/charges/${targetId}/void`
                : `${getApiBaseUrl()}/api/accounting/folios/payments/${targetId}/void`;

            const res = await fetch(endpoint, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    voidReason: reason,
                    userName: 'Front Desk'
                })
            });

            const data = await res.json();
            if (data?.success) {
                onSuccess();
                onClose();
            } else {
                setErrorMsg(data?.error || `Failed to void ${targetType}`);
            }
        } catch (err: any) {
            setErrorMsg(err?.message || 'Network error');
        } finally {
            setIsSubmitting(false);
        }
    };

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
                <div className="bg-rose-700 text-white px-4 py-3 flex items-center justify-between flex-shrink-0 shadow-xs">
                    <div className="flex items-center gap-2">
                        <AlertTriangle size={16} className="text-rose-200" />
                        <h3 className="text-xs font-bold tracking-wide uppercase">
                            Void {targetType === 'charge' ? 'Charge' : 'Payment'}
                        </h3>
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
                <form onSubmit={handleConfirmVoid} className="flex-1 flex flex-col min-h-0 overflow-hidden">
                    <div className="flex-1 overflow-y-auto p-4 space-y-3.5">
                        {errorMsg && (
                            <div className="bg-rose-50 border border-rose-200 text-rose-700 px-3 py-2 rounded-lg text-xs">
                                {errorMsg}
                            </div>
                        )}

                        <div className="bg-rose-50/60 border border-rose-100 rounded-lg p-3 text-xs text-rose-900">
                            <span>Target: </span>
                            <strong>{targetDescription || `#${targetId}`}</strong>
                            {targetAmount !== undefined && (
                                <span className="ml-1 text-rose-700 font-mono font-bold">(৳{targetAmount.toFixed(2)})</span>
                            )}
                            <p className="text-rose-800 text-[11px] mt-1.5 leading-relaxed">
                                Voiding will immediately reverse the ledger entry and balance. This action cannot be undone.
                            </p>
                        </div>

                        <div>
                            <label className="block text-[11px] font-bold text-gray-700 uppercase tracking-wide mb-1">
                                <span className="text-rose-500 mr-0.5">*</span> Reason for Void
                            </label>
                            <select
                                value={voidReason}
                                onChange={(e) => setVoidReason(e.target.value)}
                                className="w-full bg-white border border-gray-300 rounded px-2.5 py-1.5 text-xs text-gray-800 focus:ring-1 focus:ring-rose-500"
                            >
                                <option value="Erroneous posting / Double entry">Erroneous posting / Double entry</option>
                                <option value="Guest dispute resolved">Guest dispute resolved</option>
                                <option value="Incorrect room number charged">Incorrect room number charged</option>
                                <option value="Service not provided / Guest dissatisfaction">Service not provided / Guest dissatisfaction</option>
                                <option value="Rate adjustment / Courtesy discount">Rate adjustment / Courtesy discount</option>
                                <option value="Manager authorized courtesy reversal">Manager authorized courtesy reversal</option>
                                <option value="System glitch / Duplicate sync">System glitch / Duplicate sync</option>
                                <option value="Other">Other (Specify below)</option>
                            </select>
                        </div>

                        {voidReason === 'Other' && (
                            <div>
                                <label className="block text-[11px] font-bold text-gray-700 uppercase tracking-wide mb-1">
                                    Specific Reason
                                </label>
                                <textarea
                                    rows={3}
                                    value={customReason}
                                    onChange={(e) => setCustomReason(e.target.value)}
                                    className="w-full bg-white border border-gray-300 rounded px-2.5 py-1.5 text-xs text-gray-800 focus:ring-1 focus:ring-rose-500 resize-none"
                                    placeholder="Explain why this entry is being voided..."
                                />
                            </div>
                        )}
                    </div>

                    {/* Footer Actions */}
                    <div className="flex items-center justify-end gap-2 p-3 bg-gray-50 border-t border-gray-200 flex-shrink-0">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-3.5 py-1.5 rounded-md border border-gray-300 bg-white hover:bg-gray-50 text-gray-700 font-semibold text-xs cursor-pointer"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={isSubmitting}
                            className="px-4 py-1.5 rounded-md bg-rose-600 hover:bg-rose-700 text-white font-semibold text-xs shadow-xs cursor-pointer disabled:opacity-50"
                        >
                            {isSubmitting ? 'Voiding...' : 'Confirm Void'}
                        </button>
                    </div>
                </form>
            </div>
        </>
    );
};
