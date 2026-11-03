import React, { useState, useEffect, useMemo } from 'react';
import { X, CreditCard, ChevronDown, CheckCircle2, AlertCircle, RefreshCw, Split, Check } from 'lucide-react';
import { getApiBaseUrl } from '../../../utils/apiUrl';
import { getCurrencySymbol } from '../../../utils/currencyUtils';
import type { FolioData } from '../folioTypes';

interface AddPaymentModalProps {
    isOpen: boolean;
    onClose: () => void;
    folios: FolioData[];
    activeFolioId: number | string;
    onSuccess: () => void;
}

type DistributionType = 'BALANCE' | 'PROPORTIONAL' | 'MANUAL';

export const AddPaymentModal: React.FC<AddPaymentModalProps> = ({
    isOpen,
    onClose,
    folios,
    activeFolioId,
    onSuccess
}) => {
    const currency = useMemo(() => getCurrencySymbol(), []);
    const isGroupEligible = folios.length > 1;

    // Target Selection: Single or Group
    const [paymentTarget, setPaymentTarget] = useState<'SINGLE' | 'GROUP'>(isGroupEligible ? 'GROUP' : 'SINGLE');
    const [selectedFolioId, setSelectedFolioId] = useState<number | string>(activeFolioId);

    // Common Payment Fields
    const [paymentMethod, setPaymentMethod] = useState<string>('Cash');
    const [referenceCode, setReferenceCode] = useState<string>('');
    const [totalPaymentAmount, setTotalPaymentAmount] = useState<string>('0');
    const [distributionType, setDistributionType] = useState<DistributionType>('BALANCE');

    // Group Allocation Map: { [folioId]: allocatedAmount }
    const [allocations, setAllocations] = useState<Record<string, number>>({});

    const [isSubmitting, setIsSubmitting] = useState(false);
    const [errorMsg, setErrorMsg] = useState('');
    const [successMsg, setSuccessMsg] = useState('');

    // Calculate total due across all folios
    const totalGroupDue = useMemo(() => {
        return folios.reduce((sum, f) => {
            const due = Number(f.balance ?? f.summary?.dueAmount ?? 0);
            return sum + Math.max(0, due);
        }, 0);
    }, [folios]);

    // Active single folio due
    const activeFolioDue = useMemo(() => {
        const target = folios.find(f => String(f.id) === String(selectedFolioId)) || folios[0];
        return target ? Math.max(0, Number(target.balance ?? target.summary?.dueAmount ?? 0)) : 0;
    }, [folios, selectedFolioId]);

    // Initialize fields when opened
    useEffect(() => {
        if (isOpen) {
            setSelectedFolioId(activeFolioId);
            setPaymentTarget(folios.length > 1 ? 'GROUP' : 'SINGLE');
            setPaymentMethod('Cash');
            setReferenceCode('');
            setErrorMsg('');
            setSuccessMsg('');

            const initialAmt = folios.length > 1 ? totalGroupDue : activeFolioDue;
            setTotalPaymentAmount(initialAmt > 0 ? initialAmt.toFixed(2) : '0');
            setDistributionType('BALANCE');
        }
    }, [isOpen, folios, activeFolioId, totalGroupDue, activeFolioDue]);

    // Automatically recalculate group allocations when total payment, distribution type, or folios change
    useEffect(() => {
        if (paymentTarget !== 'GROUP') return;

        const totalAmt = parseFloat(totalPaymentAmount) || 0;
        const newAllocations: Record<string, number> = {};

        if (distributionType === 'BALANCE') {
            // Sequential distribution: Fills folios sequentially from top to bottom
            let remaining = totalAmt;
            folios.forEach(f => {
                const due = Math.max(0, Number(f.balance ?? f.summary?.dueAmount ?? 0));
                if (remaining > 0) {
                    const toApply = Math.min(remaining, due > 0 ? due : remaining);
                    newAllocations[String(f.id)] = Math.round(toApply * 100) / 100;
                    remaining = Math.max(0, remaining - toApply);
                } else {
                    newAllocations[String(f.id)] = 0;
                }
            });
            // If any leftover amount, assign to primary folio
            if (remaining > 0 && folios.length > 0) {
                const pId = String(folios[0].id);
                newAllocations[pId] = Math.round(((newAllocations[pId] || 0) + remaining) * 100) / 100;
            }
        } else if (distributionType === 'PROPORTIONAL') {
            // Proportional distribution based on individual due balances
            if (totalGroupDue > 0) {
                let assignedSum = 0;
                folios.forEach((f, idx) => {
                    const due = Math.max(0, Number(f.balance ?? f.summary?.dueAmount ?? 0));
                    if (idx === folios.length - 1) {
                        // Last item absorbs rounding difference
                        const remainder = Math.max(0, totalAmt - assignedSum);
                        newAllocations[String(f.id)] = Math.round(remainder * 100) / 100;
                    } else {
                        const ratio = due / totalGroupDue;
                        const allocated = Math.round(totalAmt * ratio * 100) / 100;
                        newAllocations[String(f.id)] = allocated;
                        assignedSum += allocated;
                    }
                });
            } else {
                // Split evenly if no due
                const share = Math.round((totalAmt / folios.length) * 100) / 100;
                folios.forEach(f => {
                    newAllocations[String(f.id)] = share;
                });
            }
        }

        if (distributionType !== 'MANUAL') {
            setAllocations(newAllocations);
        }
    }, [totalPaymentAmount, distributionType, paymentTarget, folios, totalGroupDue]);

    // Handle manual allocation change
    const handleManualAllocChange = (folioId: string | number, value: string) => {
        const val = parseFloat(value) || 0;
        setAllocations(prev => ({
            ...prev,
            [String(folioId)]: Math.max(0, val)
        }));
    };

    // Calculate sum of allocations
    const currentAllocatedSum = useMemo(() => {
        return Object.values(allocations).reduce((sum, val) => sum + (Number(val) || 0), 0);
    }, [allocations]);

    const totalAmtNum = parseFloat(totalPaymentAmount) || 0;
    const allocationDifference = Math.round((totalAmtNum - currentAllocatedSum) * 100) / 100;

    // Submit Payment
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setErrorMsg('');
        setSuccessMsg('');

        if (totalAmtNum <= 0) {
            setErrorMsg('Payment amount must be greater than 0.');
            return;
        }

        setIsSubmitting(true);
        try {
            if (paymentTarget === 'GROUP') {
                // Group Payment Workflow
                if (Math.abs(allocationDifference) > 0.01) {
                    setErrorMsg(`Total allocated (${currency} ${currentAllocatedSum.toFixed(2)}) must equal collected total (${currency} ${totalAmtNum.toFixed(2)}). Difference: ${currency} ${allocationDifference.toFixed(2)}`);
                    setIsSubmitting(false);
                    return;
                }

                const allocationList = Object.entries(allocations)
                    .map(([fId, amt]) => ({ folioId: fId, amount: Number(amt) }))
                    .filter(a => a.amount > 0);

                if (allocationList.length === 0) {
                    setErrorMsg('Please allocate payment to at least one folio.');
                    setIsSubmitting(false);
                    return;
                }

                const res = await fetch(`${getApiBaseUrl()}/api/accounting/folios/group-payment`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        allocations: allocationList,
                        paymentMethod,
                        referenceCode: referenceCode || 'GROUP_SETTLEMENT',
                        userName: 'Front Desk'
                    })
                });

                const data = await res.json();
                if (data?.success) {
                    setSuccessMsg(data.message || 'Group payment processed successfully!');
                    setTimeout(() => {
                        onSuccess();
                        onClose();
                    }, 800);
                } else {
                    setErrorMsg(data?.error || 'Failed to process group payment');
                }
            } else {
                // Single Folio Payment Workflow
                const targetFolio = folios.find(f => String(f.id) === String(selectedFolioId)) || folios[0];
                const fId = targetFolio ? targetFolio.id : selectedFolioId;

                const res = await fetch(`${getApiBaseUrl()}/api/accounting/folios/${encodeURIComponent(String(fId))}/payments`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        amount: totalAmtNum,
                        paymentMethod,
                        referenceCode: referenceCode || 'DIRECT_SETTLEMENT',
                        userName: 'Front Desk'
                    })
                });

                const data = await res.json();
                if (data?.success) {
                    setSuccessMsg(data.message || 'Payment recorded successfully!');
                    setTimeout(() => {
                        onSuccess();
                        onClose();
                    }, 800);
                } else {
                    setErrorMsg(data?.error || 'Failed to record payment');
                }
            }
        } catch (err: any) {
            setErrorMsg(err?.message || 'Network error while processing payment');
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
            <div className="fixed inset-y-0 right-0 w-96 sm:w-[480px] bg-white shadow-2xl z-[100005] flex flex-col border-l border-gray-200 animate-in slide-in-from-right duration-200 text-gray-800 text-xs font-sans">
                {/* Header */}
                <div className="bg-[#1e3a8a] text-white px-4 py-3 flex items-center justify-between flex-shrink-0 shadow-xs">
                    <div className="flex items-center gap-2">
                        <CreditCard size={16} className="text-amber-300" />
                        <h3 className="text-xs font-bold tracking-wide uppercase">
                            {paymentTarget === 'GROUP' ? 'Take Payment for Group' : 'Add Folio Payment'}
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
                <form onSubmit={handleSubmit} className="flex-1 flex flex-col min-h-0 overflow-hidden">
                    <div className="flex-1 overflow-y-auto p-4 space-y-3.5">
                        {errorMsg && (
                            <div className="bg-rose-50 border border-rose-200 text-rose-700 px-3 py-2 rounded-lg text-xs flex items-center gap-2">
                                <AlertCircle size={14} className="shrink-0 text-rose-600" />
                                <span>{errorMsg}</span>
                            </div>
                        )}

                        {successMsg && (
                            <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 px-3 py-2 rounded-lg text-xs flex items-center gap-2">
                                <CheckCircle2 size={14} className="shrink-0 text-emerald-600" />
                                <span>{successMsg}</span>
                            </div>
                        )}

                        {/* Payment Target Radio / Segmented Control */}
                        {isGroupEligible && (
                            <div>
                                <label className="block text-[11px] font-bold text-gray-700 uppercase tracking-wide mb-1.5">
                                    Payment Scope
                                </label>
                                <div className="grid grid-cols-2 gap-2 bg-gray-100 p-1 rounded-lg border border-gray-200 text-xs">
                                    <button
                                        type="button"
                                        onClick={() => setPaymentTarget('GROUP')}
                                        className={`py-1.5 px-3 rounded-md font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                                            paymentTarget === 'GROUP'
                                                ? 'bg-blue-600 text-white shadow-xs'
                                                : 'text-gray-600 hover:text-gray-900'
                                        }`}
                                    >
                                        <Split size={13} />
                                        <span>Group Payment</span>
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setPaymentTarget('SINGLE')}
                                        className={`py-1.5 px-3 rounded-md font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                                            paymentTarget === 'SINGLE'
                                                ? 'bg-blue-600 text-white shadow-xs'
                                                : 'text-gray-600 hover:text-gray-900'
                                        }`}
                                    >
                                        <span>Single Folio</span>
                                    </button>
                                </div>
                            </div>
                        )}

                        {/* If Single: Select Folio Dropdown */}
                        {paymentTarget === 'SINGLE' && (
                            <div>
                                <label className="block text-[11px] font-bold text-gray-700 uppercase tracking-wide mb-1">
                                    Select Folio
                                </label>
                                <div className="relative">
                                    <select
                                        value={selectedFolioId}
                                        onChange={(e) => setSelectedFolioId(e.target.value)}
                                        className="w-full bg-white border border-gray-300 rounded px-2.5 py-1.5 text-xs text-gray-800 focus:ring-1 focus:ring-blue-500 appearance-none pr-8 cursor-pointer"
                                    >
                                        {folios.map((f) => (
                                            <option key={f.id} value={f.id}>
                                                {f.room_number ? `Room ${f.room_number} - ` : ''}{f.folio_number} (Due: {currency} {Number(f.balance ?? f.summary?.dueAmount ?? 0).toFixed(2)})
                                            </option>
                                        ))}
                                    </select>
                                    <ChevronDown size={14} className="absolute right-2.5 top-2.5 text-gray-400 pointer-events-none" />
                                </div>
                            </div>
                        )}

                        {/* Payment Method & Total Amount Grid */}
                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className="block text-[11px] font-bold text-gray-700 uppercase tracking-wide mb-1">
                                    Payment Method
                                </label>
                                <div className="relative">
                                    <select
                                        value={paymentMethod}
                                        onChange={(e) => setPaymentMethod(e.target.value)}
                                        className="w-full bg-white border border-gray-300 rounded px-2.5 py-1.5 text-xs text-gray-800 focus:ring-1 focus:ring-blue-500 appearance-none pr-8 cursor-pointer"
                                    >
                                        <option value="Cash">Cash</option>
                                        <option value="Credit Card">Credit Card</option>
                                        <option value="Debit Card">Debit Card</option>
                                        <option value="Business Source">Business Source</option>
                                        <option value="Bank Transfer">Bank Transfer</option>
                                        <option value="bKash">bKash</option>
                                        <option value="Nagad">Nagad</option>
                                    </select>
                                    <ChevronDown size={14} className="absolute right-2.5 top-2.5 text-gray-400 pointer-events-none" />
                                </div>
                            </div>

                            <div>
                                <label className="block text-[11px] font-bold text-gray-700 uppercase tracking-wide mb-1">
                                    {paymentTarget === 'GROUP' ? 'Total Group Amount' : 'Amount'}
                                </label>
                                <div className="relative">
                                    <span className="absolute left-2.5 top-1.5 text-gray-400 font-bold">{currency}</span>
                                    <input
                                        type="number"
                                        step="0.01"
                                        min="0"
                                        value={totalPaymentAmount}
                                        onChange={(e) => setTotalPaymentAmount(e.target.value)}
                                        className="w-full bg-white border border-gray-300 rounded pl-7 pr-2.5 py-1.5 text-xs text-gray-900 font-mono font-bold focus:ring-1 focus:ring-blue-500"
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Reference / Voucher Code */}
                        <div>
                            <label className="block text-[11px] font-bold text-gray-700 uppercase tracking-wide mb-1">
                                Reference / Transaction Code
                            </label>
                            <input
                                type="text"
                                value={referenceCode}
                                onChange={(e) => setReferenceCode(e.target.value)}
                                placeholder="e.g. TXN-998822 / Approval Code"
                                className="w-full bg-white border border-gray-300 rounded px-2.5 py-1.5 text-xs text-gray-800 focus:ring-1 focus:ring-blue-500"
                            />
                        </div>

                        {/* =========================================================================
                            GROUP ALLOCATION WORKFLOW (Yanolja Freshdesk Article 9000275535)
                        ========================================================================= */}
                        {paymentTarget === 'GROUP' && (
                            <div className="space-y-3 pt-1 border-t border-gray-200">
                                <div className="flex items-center justify-between">
                                    <label className="text-[11px] font-bold text-gray-800 uppercase tracking-wide">
                                        Allocation Method:
                                    </label>
                                    <div className="inline-flex rounded-lg border border-gray-200 bg-gray-50 p-0.5 text-xs">
                                        <button
                                            type="button"
                                            onClick={() => setDistributionType('BALANCE')}
                                            className={`px-2 py-1 rounded-md font-semibold transition-all cursor-pointer ${
                                                distributionType === 'BALANCE'
                                                    ? 'bg-blue-600 text-white shadow-xs'
                                                    : 'text-gray-600 hover:text-gray-900'
                                            }`}
                                        >
                                            Balance
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setDistributionType('PROPORTIONAL')}
                                            className={`px-2 py-1 rounded-md font-semibold transition-all cursor-pointer ${
                                                distributionType === 'PROPORTIONAL'
                                                    ? 'bg-blue-600 text-white shadow-xs'
                                                    : 'text-gray-600 hover:text-gray-900'
                                            }`}
                                        >
                                            Proportional
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setDistributionType('MANUAL')}
                                            className={`px-2 py-1 rounded-md font-semibold transition-all cursor-pointer ${
                                                distributionType === 'MANUAL'
                                                    ? 'bg-blue-600 text-white shadow-xs'
                                                    : 'text-gray-600 hover:text-gray-900'
                                            }`}
                                        >
                                            Manual
                                        </button>
                                    </div>
                                </div>

                                {/* Distribution Table */}
                                <div className="border border-gray-200 rounded-lg overflow-hidden shadow-2xs">
                                    <table className="w-full text-left text-xs border-collapse">
                                        <thead className="bg-gray-50 border-b border-gray-200 text-gray-600 font-semibold text-[10.5px]">
                                            <tr>
                                                <th className="py-1.5 px-2">Room</th>
                                                <th className="py-1.5 px-2">Folio</th>
                                                <th className="py-1.5 px-2 text-right">Due</th>
                                                <th className="py-1.5 px-2.5 text-right w-28">Allocated</th>
                                                <th className="py-1.5 px-2 text-right">Rem. Due</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-100 bg-white">
                                            {folios.map((f) => {
                                                const due = Math.max(0, Number(f.balance ?? f.summary?.dueAmount ?? 0));
                                                const allocated = allocations[String(f.id)] || 0;
                                                const remDue = Math.max(0, due - allocated);

                                                return (
                                                    <tr key={f.id} className="hover:bg-gray-50/70">
                                                        <td className="py-1.5 px-2 font-semibold text-gray-800">
                                                            {f.room_number || 'Room'}
                                                        </td>
                                                        <td className="py-1.5 px-2 truncate max-w-[120px] text-gray-600 text-[11px]" title={f.folio_number}>
                                                            {f.folio_number}
                                                        </td>
                                                        <td className="py-1.5 px-2 text-right font-mono text-gray-600">
                                                            {currency} {due.toFixed(2)}
                                                        </td>
                                                        <td className="py-1 px-2 text-right">
                                                            {distributionType === 'MANUAL' ? (
                                                                <input
                                                                    type="number"
                                                                    step="0.01"
                                                                    min="0"
                                                                    value={allocations[String(f.id)] ?? ''}
                                                                    onChange={(e) => handleManualAllocChange(f.id, e.target.value)}
                                                                    className="w-full bg-white border border-gray-300 rounded px-1.5 py-0.5 text-xs text-right font-mono font-bold focus:ring-1 focus:ring-blue-500"
                                                                />
                                                            ) : (
                                                                <span className="font-mono font-bold text-emerald-700">
                                                                    {currency} {allocated.toFixed(2)}
                                                                </span>
                                                            )}
                                                        </td>
                                                        <td className="py-1.5 px-2 text-right font-mono text-[11px] text-gray-500">
                                                            {currency} {remDue.toFixed(2)}
                                                        </td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                </div>

                                {/* Allocation Tracker Bar */}
                                <div className="bg-slate-50 border border-slate-200 rounded-lg p-2.5 space-y-1 font-mono text-xs">
                                    <div className="flex items-center justify-between text-gray-600">
                                        <span className="font-sans">Total Collected:</span>
                                        <span className="font-bold text-gray-800">{currency} {totalAmtNum.toFixed(2)}</span>
                                    </div>
                                    <div className="flex items-center justify-between text-emerald-700">
                                        <span className="font-sans">Total Allocated:</span>
                                        <span className="font-bold">{currency} {currentAllocatedSum.toFixed(2)}</span>
                                    </div>
                                    <div className="flex items-center justify-between pt-1 border-t border-slate-200">
                                        <span className="font-sans text-gray-600">Unallocated Difference:</span>
                                        <span className={`font-bold ${Math.abs(allocationDifference) < 0.01 ? 'text-emerald-600' : 'text-rose-600'}`}>
                                            {currency} {allocationDifference.toFixed(2)}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Footer Buttons */}
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
                            disabled={isSubmitting || (paymentTarget === 'GROUP' && Math.abs(allocationDifference) > 0.01)}
                            className="bg-blue-600 hover:bg-blue-700 text-white font-bold rounded px-4 py-1.5 text-xs shadow-xs transition-colors cursor-pointer flex items-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {isSubmitting ? <RefreshCw size={12} className="animate-spin" /> : <Check size={12} />}
                            <span>{paymentTarget === 'GROUP' ? 'Post Group Payment' : 'Post Payment'}</span>
                        </button>
                    </div>
                </form>
            </div>
        </>
    );
};
