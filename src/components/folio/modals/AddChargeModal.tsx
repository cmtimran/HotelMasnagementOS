import React, { useState, useEffect, useMemo } from 'react';
import { X } from 'lucide-react';
import { getApiBaseUrl } from '../../../utils/apiUrl';
import { getCurrencySymbol } from '../../../utils/currencyUtils';
import type { FolioData, RevenueHead } from '../folioTypes';

interface AddChargeModalProps {
    isOpen: boolean;
    onClose: () => void;
    folios: FolioData[];
    activeFolioId: number | string;
    onSuccess: () => void;
}

export const AddChargeModal: React.FC<AddChargeModalProps> = ({
    isOpen,
    onClose,
    folios,
    activeFolioId,
    onSuccess
}) => {
    const currency = useMemo(() => getCurrencySymbol(), []);
    const [selectedFolioId, setSelectedFolioId] = useState<string | number>(activeFolioId);
    const [applyToGroup, setApplyToGroup] = useState(false);
    const [revenueHeads, setRevenueHeads] = useState<RevenueHead[]>([]);
    const [selectedHead, setSelectedHead] = useState<string>('Room Charges');
    const [amount, setAmount] = useState<string>('0');
    const [discount, setDiscount] = useState<string>('0');
    const [description, setDescription] = useState<string>('');
    const [taxApplicable, setTaxApplicable] = useState<boolean>(true);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [errorMsg, setErrorMsg] = useState<string>('');

    useEffect(() => {
        if (isOpen) {
            setSelectedFolioId(activeFolioId);
            setAmount('0');
            setDiscount('0');
            setDescription('');
            setTaxApplicable(true);
            setApplyToGroup(false);
            setErrorMsg('');

            // Fetch dynamic revenue heads from API
            fetch(`${getApiBaseUrl()}/api/accounting/revenue-heads`)
                .then(res => res.json())
                .then(data => {
                    if (data?.success && Array.isArray(data.data)) {
                        setRevenueHeads(data.data);
                        if (data.data.length > 0) {
                            setSelectedHead(data.data[0].name);
                        }
                    }
                })
                .catch(() => {
                    // Fallback to standard enterprise revenue heads if offline
                    setRevenueHeads([
                        { id: 1, code: 'ROOM_CHG', name: 'Room Charges' },
                        { id: 2, code: 'CITY_CHG', name: 'City Chargee' },
                        { id: 3, code: 'EXTRA_BED', name: 'Extra Bed' },
                        { id: 4, code: 'BANQUET', name: 'Banquet Venue Charges' },
                        { id: 5, code: 'LAUNDRY', name: 'Laundry' },
                        { id: 6, code: 'MINIBAR', name: 'Minibar' },
                        { id: 7, code: 'EARLY_CI', name: 'Early Check In' }
                    ]);
                });
        }
    }, [isOpen, activeFolioId]);

    // Financial calculations
    const numAmount = Math.max(0, parseFloat(amount) || 0);
    const numDiscount = Math.max(0, parseFloat(discount) || 0);
    const subTotal = Math.max(0, numAmount - numDiscount);
    
    // Taxes: 10% Service Charge + 15% VAT + 1% City Tax
    const taxTotal = taxApplicable ? subTotal * 0.26 : 0;
    const grandTotal = subTotal + taxTotal;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (numAmount <= 0) {
            setErrorMsg('Please enter a valid amount greater than 0');
            return;
        }

        setIsSubmitting(true);
        setErrorMsg('');

        try {
            const res = await fetch(`${getApiBaseUrl()}/api/accounting/folios/${selectedFolioId}/charges`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    revenueHead: selectedHead,
                    amount: numAmount,
                    discount: numDiscount,
                    taxApplicable,
                    description,
                    applyToGroup,
                    userName: 'Front Desk'
                })
            });

            const data = await res.json();
            if (data?.success) {
                onSuccess();
                onClose();
            } else {
                setErrorMsg(data?.error || 'Failed to post charge');
            }
        } catch (err: any) {
            setErrorMsg(err?.message || 'Network error while posting charge');
        } finally {
            setIsSubmitting(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[100005] bg-black/50 backdrop-blur-xs flex items-center justify-center p-3 animate-in fade-in duration-100">
            <div className="bg-white rounded-xl shadow-2xl border border-gray-200 w-full max-w-sm overflow-hidden flex flex-col text-gray-800">
                {/* Header matching Screenshot 681ab288.png */}
                <div className="bg-[#1e3a8a] text-white px-4 py-2.5 flex items-center justify-between">
                    <h3 className="text-xs font-bold tracking-wide">Add Charge</h3>
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

                    {/* Apply to Group Checkbox */}
                    <label className="flex items-center gap-2 cursor-pointer select-none text-gray-600 font-medium">
                        <input
                            type="checkbox"
                            checked={applyToGroup}
                            onChange={(e) => setApplyToGroup(e.target.checked)}
                            className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 w-3.5 h-3.5"
                        />
                        <span>Apply to Group</span>
                    </label>

                    {/* Folio Dropdown */}
                    <div>
                        <label className="block text-[11px] font-semibold text-gray-700 mb-1">
                            <span className="text-rose-500 mr-0.5">*</span> Folio
                        </label>
                        <select
                            value={selectedFolioId}
                            onChange={(e) => setSelectedFolioId(e.target.value)}
                            className="w-full bg-white border border-gray-300 rounded px-2.5 py-1.5 text-xs text-gray-800 focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
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
                            <span className="text-rose-500 mr-0.5">*</span> Revenue Head
                        </label>
                        <select
                            value={selectedHead}
                            onChange={(e) => setSelectedHead(e.target.value)}
                            className="w-full bg-white border border-gray-300 rounded px-2.5 py-1.5 text-xs text-gray-800 focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                        >
                            {revenueHeads.map((h) => (
                                <option key={h.id || h.code} value={h.name}>
                                    {h.name}
                                </option>
                            ))}
                        </select>
                    </div>

                    {/* Amount & Discount Inputs */}
                    <div className="grid grid-cols-2 gap-2">
                        <div>
                            <label className="block text-[11px] font-semibold text-gray-700 mb-1">
                                <span className="text-rose-500 mr-0.5">*</span> Amount
                            </label>
                            <input
                                type="number"
                                step="any"
                                min="0"
                                value={amount}
                                onChange={(e) => setAmount(e.target.value)}
                                className="w-full bg-white border border-gray-300 rounded px-2.5 py-1.5 text-xs text-gray-800 focus:ring-1 focus:ring-blue-500 focus:border-blue-500 font-mono"
                                placeholder="0.00"
                            />
                        </div>

                        <div>
                            <label className="block text-[11px] font-semibold text-gray-700 mb-1">
                                <span className="text-rose-500 mr-0.5">*</span> Discount
                            </label>
                            <input
                                type="number"
                                step="any"
                                min="0"
                                value={discount}
                                onChange={(e) => setDiscount(e.target.value)}
                                className="w-full bg-white border border-gray-300 rounded px-2.5 py-1.5 text-xs text-gray-800 focus:ring-1 focus:ring-blue-500 focus:border-blue-500 font-mono"
                                placeholder="0.00"
                            />
                        </div>
                    </div>

                    {/* Description */}
                    <div>
                        <label className="block text-[11px] font-semibold text-gray-700 mb-1">
                            Description
                        </label>
                        <textarea
                            rows={2}
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            className="w-full bg-white border border-gray-300 rounded px-2.5 py-1.5 text-xs text-gray-800 focus:ring-1 focus:ring-blue-500 focus:border-blue-500 resize-none"
                            placeholder="Enter charge particulars..."
                        />
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

                    {/* Calculation Summary Card */}
                    <div className="bg-slate-50 border border-slate-200/80 rounded-lg p-2.5 space-y-1 font-mono text-[11px]">
                        <div className="flex items-center justify-between text-gray-500">
                            <span>Amount:</span>
                            <span>{numAmount.toFixed(2)}</span>
                        </div>
                        <div className="flex items-center justify-between text-gray-700 font-semibold border-b border-gray-200 pb-1">
                            <span>Sub Total:</span>
                            <span>{subTotal.toFixed(2)}</span>
                        </div>
                        <div className="flex items-center justify-between text-rose-600 font-bold pt-0.5 text-xs">
                            <span>Grand Total:</span>
                            <span>{currency} {grandTotal.toFixed(2)}</span>
                        </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex items-center justify-end gap-2 pt-2 border-t border-gray-100">
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
                            {isSubmitting ? 'Posting...' : 'Add Charge'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};
