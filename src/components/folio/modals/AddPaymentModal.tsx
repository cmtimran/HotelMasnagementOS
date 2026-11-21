import React, { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { X, CreditCard, ChevronDown, CheckCircle2, AlertCircle, RefreshCw, Split, Check, Landmark, Smartphone, Percent } from 'lucide-react';
import { getApiBaseUrl } from '../../../utils/apiUrl';
import { useActiveCurrency } from '../../../utils/currencyUtils';
import type { FolioData } from '../folioTypes';
import { MoneyReceiptModal } from './MoneyReceiptModal';
import {
    resolveDynamicPropertyId,
    getPropertyPaymentConfig,
    getPaymentMethodsForOutlet,
    calculateMdrCommission,
    detectPaymentCategory,
    getDynamicTaxVatRate,
    getDynamicExpenseGlCode,
    getDynamicMasterBanks,
    type PaymentMethodItem,
    type PropertyPaymentConfig
} from '../../../utils/propertyPaymentMethodEngine';

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
    const { currencySymbol: currency } = useActiveCurrency();
    const isGroupEligible = folios.length > 1;

    // Target Selection: Single or Group
    const [paymentTarget, setPaymentTarget] = useState<'SINGLE' | 'GROUP'>(isGroupEligible ? 'GROUP' : 'SINGLE');
    const [selectedFolioId, setSelectedFolioId] = useState<number | string>(activeFolioId);

    // Common Payment Fields
    const [paymentMethod, setPaymentMethod] = useState<string>('Cash');
    const [referenceCode, setReferenceCode] = useState<string>('');
    const [totalPaymentAmount, setTotalPaymentAmount] = useState<string>('0');
    const [distributionType, setDistributionType] = useState<DistributionType>('BALANCE');
    const [selectedAcquiringBank, setSelectedAcquiringBank] = useState<string>('');
    const [receiptToPrompt, setReceiptToPrompt] = useState<{ payment: any; folio: FolioData | null } | null>(null);

    // Dynamic Payment Configuration for Front Office
    const activePropertyId = useMemo(() => resolveDynamicPropertyId(), []);
    const [config, setConfig] = useState<PropertyPaymentConfig>(() => getPropertyPaymentConfig(activePropertyId));
    const [configuredMethods, setConfiguredMethods] = useState<PaymentMethodItem[]>(() => getPaymentMethodsForOutlet(activePropertyId, 'FRONT_OFFICE'));

    useEffect(() => {
        const handleSync = () => {
            try {
                setConfig(getPropertyPaymentConfig(activePropertyId));
                setConfiguredMethods(getPaymentMethodsForOutlet(activePropertyId, 'FRONT_OFFICE'));
            } catch {}
        };
        window.addEventListener('hotel_payment_methods_updated', handleSync);
        return () => window.removeEventListener('hotel_payment_methods_updated', handleSync);
    }, [activePropertyId]);

    // Active method item & category
    const matchedMethod = useMemo(() => {
        return configuredMethods.find(m => m.displayName === paymentMethod || m.subType === paymentMethod);
    }, [configuredMethods, paymentMethod]);

    const activeCategory = useMemo(() => {
        return detectPaymentCategory(paymentMethod, configuredMethods);
    }, [paymentMethod, configuredMethods]);

    // Dynamic Active VAT & Expense GL
    const dynamicVatRate = useMemo(() => getDynamicTaxVatRate(), []);
    const dynamicExpenseGl = useMemo(() => getDynamicExpenseGlCode('BANK_CHARGES'), []);

    // Attached acquiring banks (Zero hardcoded defaults)
    const attachedBanks = useMemo(() => {
        if (matchedMethod?.acquiringBanks && matchedMethod.acquiringBanks.length > 0) {
            return matchedMethod.acquiringBanks;
        }
        const availableBanks = (config.registeredBanks && config.registeredBanks.length > 0)
            ? config.registeredBanks
            : getDynamicMasterBanks(activePropertyId);

        if (availableBanks.length > 0) {
            return availableBanks.map(b => ({
                id: `dyn-${b.id}`,
                bankName: b.bankName,
                commissionRule: {
                    commissionRatePercent: matchedMethod?.defaultCommissionRate ?? 0,
                    flatFeeBdt: 0,
                    vatOnCommissionPercent: dynamicVatRate,
                    feeAbsorbedBy: 'HOTEL' as const,
                    expenseGlCode: b.linkedGlCode || dynamicExpenseGl
                },
                settlementAccount: b.accountTitle ? `${b.accountTitle} (${b.accountNumber})` : b.accountNumber,
                enabled: true
            }));
        }
        return [];
    }, [matchedMethod, config.registeredBanks, activePropertyId, dynamicVatRate, dynamicExpenseGl]);

    // Keep bank selected
    useEffect(() => {
        if (attachedBanks.length > 0 && !selectedAcquiringBank) {
            setSelectedAcquiringBank(attachedBanks[0].bankName);
        }
    }, [attachedBanks, selectedAcquiringBank]);

    // Real-time MDR calculation for Card or MFS
    const mdrCalculation = useMemo(() => {
        const amt = parseFloat(totalPaymentAmount) || 0;
        if (amt <= 0) return null;
        const bankObj = attachedBanks.find(b => b.bankName === selectedAcquiringBank) || attachedBanks[0];
        const rule = bankObj?.commissionRule || (matchedMethod?.defaultCommissionRate !== undefined ? {
            commissionRatePercent: matchedMethod.defaultCommissionRate,
            flatFeeBdt: 0,
            vatOnCommissionPercent: dynamicVatRate,
            feeAbsorbedBy: 'HOTEL' as const,
            expenseGlCode: dynamicExpenseGl
        } : null);
        return rule ? calculateMdrCommission(amt, rule) : null;
    }, [totalPaymentAmount, attachedBanks, selectedAcquiringBank, matchedMethod, dynamicVatRate, dynamicExpenseGl]);

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

                const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
                const currentUserStr = typeof window !== 'undefined' ? localStorage.getItem('currentUser') : null;
                let activeUserName = 'Front Desk';
                if (currentUserStr) {
                    try {
                        const parsedUser = JSON.parse(currentUserStr);
                        if (parsedUser.name) activeUserName = parsedUser.name;
                    } catch {}
                }

                const finalReference = (activeCategory === 'CARD' || activeCategory === 'BANK_TRANSFER')
                    ? (selectedAcquiringBank ? `${selectedAcquiringBank} | ${referenceCode || 'POS_SETTLEMENT'}` : referenceCode || 'POS_SETTLEMENT')
                    : (referenceCode || 'DIRECT_SETTLEMENT');

                const idempotencyKey = `pay_grp_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

                const res = await fetch(`${getApiBaseUrl()}/api/accounting/folios/group-payment`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'X-Idempotency-Key': idempotencyKey,
                        ...(token ? { 'Authorization': `Bearer ${token}` } : {})
                    },
                    body: JSON.stringify({
                        allocations: allocationList,
                        paymentMethod,
                        referenceCode: finalReference,
                        userName: activeUserName
                    })
                });

                const data = await res.json();
                if (data?.success) {
                    const now = new Date();
                    const dateStr = now.toISOString().slice(0, 10).replace(/-/g, '');
                    const seqNo = String(Math.floor(1000 + Math.random() * 9000));
                    const genReceiptNo = data.data?.payment_number || `MR-${dateStr}-${seqNo}`;

                    const paymentObj = {
                        id: data.data?.id || Date.now(),
                        payment_number: genReceiptNo,
                        payment_method: paymentMethod,
                        amount: totalAmtNum,
                        reference_code: finalReference,
                        transaction_date: now.toISOString(),
                        status: 'Settled',
                        user: 'Front Desk'
                    };

                    onSuccess();
                    setSuccessMsg(data.message || 'Group payment processed successfully!');
                    setTimeout(() => {
                        setReceiptToPrompt({
                            payment: paymentObj,
                            folio: folios[0] || null
                        });
                    }, 300);
                } else {
                    setErrorMsg(data?.error || 'Failed to process group payment');
                }
            } else {
                // Single Folio Payment Workflow
                const targetFolio = folios.find(f => String(f.id) === String(selectedFolioId)) || folios[0];
                const fId = targetFolio ? targetFolio.id : selectedFolioId;

                const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
                const currentUserStr = typeof window !== 'undefined' ? localStorage.getItem('currentUser') : null;
                let activeUserName = 'Front Desk';
                if (currentUserStr) {
                    try {
                        const parsedUser = JSON.parse(currentUserStr);
                        if (parsedUser.name) activeUserName = parsedUser.name;
                    } catch {}
                }

                const finalReference = (activeCategory === 'CARD' || activeCategory === 'BANK_TRANSFER')
                    ? (selectedAcquiringBank ? `${selectedAcquiringBank} | ${referenceCode || 'POS_SETTLEMENT'}` : referenceCode || 'POS_SETTLEMENT')
                    : (referenceCode || 'DIRECT_SETTLEMENT');

                const idempotencyKey = `pay_single_${fId}_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

                const res = await fetch(`${getApiBaseUrl()}/api/accounting/folios/${encodeURIComponent(String(fId))}/payments`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'X-Idempotency-Key': idempotencyKey,
                        ...(token ? { 'Authorization': `Bearer ${token}` } : {})
                    },
                    body: JSON.stringify({
                        amount: totalAmtNum,
                        paymentMethod,
                        referenceCode: finalReference,
                        userName: activeUserName
                    })
                });

                const data = await res.json();
                if (data?.success) {
                    const now = new Date();
                    const dateStr = now.toISOString().slice(0, 10).replace(/-/g, '');
                    const seqNo = String(Math.floor(1000 + Math.random() * 9000));
                    const genReceiptNo = data.data?.payment_number || `MR-${dateStr}-${seqNo}`;

                    const paymentObj = {
                        id: data.data?.id || Date.now(),
                        payment_number: genReceiptNo,
                        payment_method: paymentMethod,
                        amount: totalAmtNum,
                        reference_code: finalReference,
                        transaction_date: now.toISOString(),
                        status: 'Settled',
                        user: 'Front Desk'
                    };

                    onSuccess();
                    setSuccessMsg(data.message || 'Payment recorded successfully!');
                    setTimeout(() => {
                        setReceiptToPrompt({
                            payment: paymentObj,
                            folio: targetFolio || null
                        });
                    }, 300);
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

    return createPortal(
        <>
            {/* Backdrop */}
            <div
                className="fixed inset-0 z-[100010] bg-black/40 backdrop-blur-2xs transition-opacity animate-in fade-in duration-100"
                onClick={onClose}
            />

            {/* Slide-out Drawer Panel (Right Side) */}
            <div className="fixed inset-y-0 right-0 w-96 sm:w-[480px] bg-white shadow-2xl z-[100011] flex flex-col border-l border-gray-200 animate-in slide-in-from-right duration-200 text-gray-800 text-xs font-sans">
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
                                        onChange={(e) => {
                                            const newMethod = e.target.value;
                                            setPaymentMethod(newMethod);
                                            const matched = configuredMethods.find(m => m.displayName === newMethod);
                                            if (matched?.acquiringBanks && matched.acquiringBanks.length > 0) {
                                                setSelectedAcquiringBank(matched.acquiringBanks[0].bankName);
                                            }
                                        }}
                                        className="w-full bg-white border border-gray-300 rounded px-2.5 py-1.5 text-xs text-gray-900 font-bold focus:ring-1 focus:ring-blue-500 appearance-none pr-8 cursor-pointer"
                                    >
                                        {/* Physical Cash */}
                                        <optgroup label="💵 Cash Counter Till">
                                            {configuredMethods.filter(m => m.category === 'CASH').map(m => (
                                                <option key={m.id} value={m.displayName}>{m.displayName}</option>
                                            ))}
                                            {configuredMethods.filter(m => m.category === 'CASH').length === 0 && (
                                                <option value="Cash">Cash</option>
                                            )}
                                        </optgroup>

                                        {/* Card Schemes */}
                                        <optgroup label="💳 Credit &amp; Debit Card Schemes">
                                            {configuredMethods.filter(m => m.category === 'CARD').map(m => (
                                                <option key={m.id} value={m.displayName}>
                                                    {m.displayName} {m.defaultCommissionRate ? `(${m.defaultCommissionRate}% MDR)` : ''}
                                                </option>
                                            ))}
                                        </optgroup>

                                        {/* Mobile Banking */}
                                        <optgroup label="📱 Mobile Financial Services (MFS)">
                                            {configuredMethods.filter(m => m.category === 'MOBILE_BANKING').map(m => (
                                                <option key={m.id} value={m.displayName}>
                                                    {m.displayName} {m.walletNumber ? `[${m.walletNumber}]` : ''} {m.defaultCommissionRate ? `(${m.defaultCommissionRate}%)` : ''}
                                                </option>
                                            ))}
                                        </optgroup>

                                        {/* Bank Transfer */}
                                        <optgroup label="🏦 Direct Bank Wire &amp; Cheque">
                                            {configuredMethods.filter(m => m.category === 'BANK_TRANSFER').map(m => (
                                                <option key={m.id} value={m.displayName}>{m.displayName}</option>
                                            ))}
                                        </optgroup>

                                        {/* Corporate Accounts */}
                                        {configuredMethods.filter(m => m.category === 'COMPANY_ACCOUNT').length > 0 && (
                                            <optgroup label="🏢 Corporate Direct Billing">
                                                {configuredMethods.filter(m => m.category === 'COMPANY_ACCOUNT').map(m => (
                                                    <option key={m.id} value={m.displayName}>{m.displayName}</option>
                                                ))}
                                            </optgroup>
                                        )}
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

                        {/* Hierarchical Card Acquiring Bank Selector & MDR Breakdown */}
                        {activeCategory === 'CARD' && (
                            <div className="p-2.5 rounded-lg bg-indigo-50/70 border border-indigo-200 space-y-2 text-xs">
                                <div className="flex items-center justify-between">
                                    <label className="text-[10px] font-bold text-indigo-950 uppercase tracking-wider flex items-center gap-1">
                                        <Landmark size={12} className="text-indigo-600" />
                                        <span>Acquiring Bank / POS Terminal *</span>
                                    </label>
                                    <span className="text-[9.5px] font-mono text-indigo-700 font-semibold">
                                        Card: {paymentMethod}
                                    </span>
                                </div>
                                <select
                                    value={selectedAcquiringBank}
                                    onChange={(e) => setSelectedAcquiringBank(e.target.value)}
                                    className="w-full bg-white border border-indigo-200 rounded px-2.5 py-1.5 text-xs text-indigo-950 font-bold focus:ring-1 focus:ring-indigo-500 cursor-pointer"
                                >
                                    {attachedBanks.map(b => (
                                        <option key={b.id} value={b.bankName}>
                                            {b.bankName} {b.commissionRule?.commissionRatePercent ? `(${b.commissionRule.commissionRatePercent}% MDR)` : ''}
                                        </option>
                                    ))}
                                </select>

                                {mdrCalculation && mdrCalculation.totalFee > 0 && (
                                    <div className="flex items-center justify-between pt-1 border-t border-indigo-200/60 text-[10px] font-mono">
                                        <span className="text-indigo-800 font-bold flex items-center gap-0.5">
                                            <Percent size={10} /> Bank Fee: -{currency}{mdrCalculation.totalFee.toFixed(2)} ({mdrCalculation.commissionRatePercent}%)
                                        </span>
                                        <span className="text-emerald-800 font-bold flex items-center gap-0.5">
                                            <CheckCircle2 size={10} className="text-emerald-600" /> Net Settled: {currency}{mdrCalculation.netSettlement.toFixed(2)}
                                        </span>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Mobile Banking (MFS) Wallet Details */}
                        {activeCategory === 'MOBILE_BANKING' && (
                            <div className="p-2.5 rounded-lg bg-pink-50/70 border border-pink-200 space-y-1.5 text-xs">
                                <div className="flex items-center justify-between">
                                    <span className="text-[10px] font-bold text-pink-950 uppercase tracking-wider flex items-center gap-1">
                                        <Smartphone size={12} className="text-pink-600" />
                                        <span>Merchant Wallet A/C:</span>
                                    </span>
                                    <span className="text-xs font-mono font-bold text-pink-900 bg-white border border-pink-200 px-2 py-0.5 rounded">
                                        {matchedMethod?.walletNumber || '01712-000000'} ({matchedMethod?.accountType || 'MERCHANT'})
                                    </span>
                                </div>
                                {mdrCalculation && mdrCalculation.totalFee > 0 && (
                                    <div className="flex items-center justify-between pt-1 border-t border-pink-200/60 text-[10px] font-mono text-pink-800 font-bold">
                                        <span>Fee: -{currency}{mdrCalculation.totalFee.toFixed(2)} ({mdrCalculation.commissionRatePercent}%)</span>
                                        <span className="text-emerald-800">Net: {currency}{mdrCalculation.netSettlement.toFixed(2)}</span>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Reference / Voucher Code */}
                        <div>
                            <label className="block text-[11px] font-bold text-gray-700 uppercase tracking-wide mb-1">
                                {activeCategory === 'CARD' ? 'Card Last 4 & Approval / Auth Code' :
                                 activeCategory === 'MOBILE_BANKING' ? 'MFS TrxID / Transaction Code' :
                                 activeCategory === 'BANK_TRANSFER' ? 'BEFTN Ref / Cheque Number' :
                                 'Reference / Transaction Code'}
                            </label>
                            <input
                                type="text"
                                value={referenceCode}
                                onChange={(e) => setReferenceCode(e.target.value)}
                                placeholder={
                                    activeCategory === 'CARD' ? 'e.g. 4242 / Auth: 88190' :
                                    activeCategory === 'MOBILE_BANKING' ? 'e.g. TrxID 9B82AX12' :
                                    activeCategory === 'BANK_TRANSFER' ? 'e.g. BEFTN-991823 / Cheque #109283' :
                                    'e.g. TXN-998822 / Desk Receipt Memo'
                                }
                                className="w-full bg-white border border-gray-300 rounded px-2.5 py-1.5 text-xs text-gray-800 focus:ring-1 focus:ring-blue-500 font-mono"
                            />
                        </div>

                        {/* =========================================================================
                            GROUP ALLOCATION WORKFLOW (Multi-Room Ledger Settlement)
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

                    {/* Modern Executive Footer Buttons */}
                    <div className="bg-slate-50/90 border-t border-slate-200 px-4 py-3 flex items-center justify-between gap-3 flex-shrink-0">
                        <button
                            type="button"
                            onClick={onClose}
                            className="h-8.5 px-4 bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 font-semibold rounded-lg text-xs shadow-xs transition-all cursor-pointer active:scale-95"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={isSubmitting || (paymentTarget === 'GROUP' && Math.abs(allocationDifference) > 0.01)}
                            className="h-8.5 px-5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold rounded-lg text-xs shadow-md transition-all cursor-pointer flex items-center gap-1.5 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none"
                        >
                            {isSubmitting ? <RefreshCw size={13} className="animate-spin" /> : <Check size={13} />}
                            <span>{paymentTarget === 'GROUP' ? 'Post Group Payment' : 'Post Payment'}</span>
                        </button>
                    </div>
                </form>
            </div>

            {/* Real-Time Auto-Prompt Money Receipt Modal */}
            {receiptToPrompt && (
                <MoneyReceiptModal
                    isOpen={Boolean(receiptToPrompt)}
                    onClose={() => {
                        setReceiptToPrompt(null);
                        onClose();
                    }}
                    payment={receiptToPrompt.payment}
                    folio={receiptToPrompt.folio}
                />
            )}
        </>,
        document.body
    );
};
