import React, { useState, useEffect, useMemo } from 'react';
import {
    Plus,
    Trash2,
    Landmark,
    Percent,
    CreditCard,
    Smartphone,
    Wallet,
    Building2,
    CheckCircle2
} from 'lucide-react';
import type { PaymentRow } from '../../../hooks/useReservationBilling';
import {
    resolveDynamicPropertyId,
    getPropertyPaymentConfig,
    getPaymentMethodsForOutlet,
    calculateMdrCommission,
    detectPaymentCategory,
    type PaymentOutletId,
    type PaymentMethodItem,
    type TenderCategory,
    type PropertyPaymentConfig
} from '../../../utils/propertyPaymentMethodEngine';

export interface PaymentTenderConsoleProps {
    paymentRows: PaymentRow[];
    totalDue: number;
    finalPayable: number;
    currencySymbol?: string;
    outletId?: PaymentOutletId;
    onAddRow: () => void;
    onRemoveRow: (id: number) => void;
    onUpdateRow: (id: number, fieldOrUpdates: keyof PaymentRow | Partial<PaymentRow>, value?: any) => void;
    onFillDue?: (rowId: number) => void;
    onFill50Percent?: (rowId: number) => void;
}

interface CategoryButtonDef {
    id: TenderCategory;
    label: string;
    icon: React.ReactNode;
    activeClass: string;
}

export const PaymentTenderConsole: React.FC<PaymentTenderConsoleProps> = ({
    paymentRows,
    totalDue,
    finalPayable,
    currencySymbol = '৳',
    outletId = 'FRONT_OFFICE',
    onAddRow,
    onRemoveRow,
    onUpdateRow,
    onFillDue,
    onFill50Percent
}) => {
    // Dynamically resolve active property ID with zero hardcoded fallback
    const activePropertyId = useMemo(() => resolveDynamicPropertyId(), []);

    // Full property config and outlet-allowed methods
    const [config, setConfig] = useState<PropertyPaymentConfig>(() => {
        try {
            return getPropertyPaymentConfig(activePropertyId);
        } catch {
            return {
                propertyId: activePropertyId,
                propertyName: `Property #${activePropertyId}`,
                registeredBanks: [],
                corporateLedgers: [],
                houseLedgers: [],
                posTerminals: [],
                methods: [],
                lastUpdated: ''
            };
        }
    });

    const [configuredMethods, setConfiguredMethods] = useState<PaymentMethodItem[]>(() => {
        try {
            return getPaymentMethodsForOutlet(activePropertyId, outletId);
        } catch {
            return [];
        }
    });

    // Listen for live cross-component sync when payment settings change
    useEffect(() => {
        const handleSync = () => {
            try {
                const refreshedConfig = getPropertyPaymentConfig(activePropertyId);
                setConfig(refreshedConfig);
                setConfiguredMethods(getPaymentMethodsForOutlet(activePropertyId, outletId));
            } catch {}
        };
        window.addEventListener('hotel_payment_methods_updated', handleSync);
        return () => window.removeEventListener('hotel_payment_methods_updated', handleSync);
    }, [activePropertyId, outletId]);

    // Categorized Method Buckets
    const cashMethods = useMemo(() => configuredMethods.filter(m => m.category === 'CASH'), [configuredMethods]);
    const cardMethods = useMemo(() => configuredMethods.filter(m => m.category === 'CARD'), [configuredMethods]);
    const mfsMethods = useMemo(() => configuredMethods.filter(m => m.category === 'MOBILE_BANKING'), [configuredMethods]);
    const bankTransferMethods = useMemo(() => configuredMethods.filter(m => m.category === 'BANK_TRANSFER'), [configuredMethods]);
    const corporateMethods = useMemo(() => configuredMethods.filter(m => m.category === 'COMPANY_ACCOUNT'), [configuredMethods]);
    const houseMethods = useMemo(() => configuredMethods.filter(m => m.category === 'COMPLIMENTARY' || m.category === 'ENTERTAINMENT'), [configuredMethods]);

    // Find matched method item for a row
    const getMatchedMethod = (methodName: string): PaymentMethodItem | undefined => {
        return configuredMethods.find(m =>
            m.displayName === methodName ||
            m.subType === methodName ||
            (methodName === 'Cash' && m.category === 'CASH') ||
            (methodName.toLowerCase().includes('cash') && m.category === 'CASH') ||
            (methodName.toLowerCase().includes('card') && m.category === 'CARD')
        );
    };

    // Category button definitions
    const CATEGORY_BUTTONS: CategoryButtonDef[] = [
        {
            id: 'CASH',
            label: 'Cash',
            icon: <Wallet size={12} />,
            activeClass: 'bg-emerald-600 text-white border-emerald-600 shadow-2xs'
        },
        {
            id: 'CARD',
            label: 'Card (Visa/MC/Amex)',
            icon: <CreditCard size={12} />,
            activeClass: 'bg-indigo-600 text-white border-indigo-600 shadow-2xs'
        },
        {
            id: 'MOBILE_BANKING',
            label: 'Mobile Banking (MFS)',
            icon: <Smartphone size={12} />,
            activeClass: 'bg-pink-600 text-white border-pink-600 shadow-2xs'
        },
        {
            id: 'BANK_TRANSFER',
            label: 'Bank Wire / Cheque',
            icon: <Landmark size={12} />,
            activeClass: 'bg-blue-600 text-white border-blue-600 shadow-2xs'
        },
        {
            id: 'COMPANY_ACCOUNT',
            label: 'City Ledger (Corporate)',
            icon: <Building2 size={12} />,
            activeClass: 'bg-amber-600 text-white border-amber-600 shadow-2xs'
        }
    ];

    // Helper to switch category on a specific row atomically
    const handleCategorySwitch = (rowId: number, targetCategory: TenderCategory) => {
        if (targetCategory === 'CASH') {
            onUpdateRow(rowId, { method: 'Cash', reference: '' });
        } else if (targetCategory === 'CARD') {
            const defaultCard = cardMethods[0] || configuredMethods.find(m => m.category === 'CARD');
            const cardName = defaultCard ? defaultCard.displayName : 'Visa';
            const defaultBank = defaultCard?.acquiringBanks?.[0]?.bankName || config.registeredBanks[0]?.bankName || 'Asia Bank Plc.';
            onUpdateRow(rowId, {
                method: cardName,
                reference: `${defaultBank} | `
            });
        } else if (targetCategory === 'MOBILE_BANKING') {
            const defaultMfs = mfsMethods[0] || configuredMethods.find(m => m.category === 'MOBILE_BANKING');
            const mfsName = defaultMfs ? defaultMfs.displayName : 'bKash';
            onUpdateRow(rowId, {
                method: mfsName,
                reference: ''
            });
        } else if (targetCategory === 'BANK_TRANSFER') {
            const defaultBank = bankTransferMethods[0] || configuredMethods.find(m => m.category === 'BANK_TRANSFER');
            const name = defaultBank ? defaultBank.displayName : 'Direct Bank Wire / BEFTN / RTGS';
            const settlementBank = config.registeredBanks[0]?.bankName || 'Asia Bank Plc.';
            onUpdateRow(rowId, {
                method: name,
                reference: `${settlementBank} | BEFTN | `
            });
        } else if (targetCategory === 'COMPANY_ACCOUNT') {
            const defaultCorp = corporateMethods[0] || configuredMethods.find(m => m.category === 'COMPANY_ACCOUNT');
            const name = defaultCorp ? defaultCorp.displayName : 'Company Direct Billing (City Ledger)';
            const clientName = defaultCorp?.ledgerNames?.[0] || config.corporateLedgers[0]?.companyName || 'Corporate Client';
            onUpdateRow(rowId, {
                method: name,
                reference: `${clientName} | `
            });
        }
    };

    return (
        <div className="border border-slate-200 rounded-xl p-3 bg-white shadow-2xs space-y-2.5">
            {/* Header Strip */}
            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                <div className="flex items-center gap-2">
                    <span className="text-slate-900 text-xs font-bold uppercase tracking-wider flex items-center gap-1.5">
                        <CreditCard size={14} className="text-indigo-600" />
                        <span>Advance Settlement &amp; Tenders</span>
                    </span>
                    <span className="text-[10px] text-indigo-700 bg-indigo-50 border border-indigo-200 px-2 py-0.5 rounded-md font-semibold">
                        {outletId === 'FRONT_OFFICE' ? 'Front Desk Outlet' : 'F&B Cashier'}
                    </span>
                    <span className="text-[10px] text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded font-medium">
                        Multi-Tender
                    </span>
                </div>
                <span className="text-[11px] text-slate-500 font-mono">
                    Total Final: <strong>{currencySymbol}{finalPayable.toFixed(2)}</strong>
                </span>
            </div>

            {/* Payment Rows List */}
            <div className="space-y-2.5">
                {paymentRows.length === 0 ? (
                    <div className="py-5 px-4 text-center border border-dashed border-indigo-200 rounded-xl bg-indigo-50/30 flex flex-col items-center justify-center gap-2.5">
                        <div className="w-10 h-10 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center">
                            <Wallet size={18} />
                        </div>
                        <div>
                            <span className="text-xs font-bold text-slate-800 block">
                                No Advance Payment Added (Default: {currencySymbol}0.00 Unpaid)
                            </span>
                            <p className="text-[11px] text-slate-500 max-w-md mt-0.5">
                                Reservation balance remains <strong className="text-rose-600">{currencySymbol}{finalPayable.toFixed(2)} Due</strong>. Choose a payment tender below to record advance deposit.
                            </p>
                        </div>

                        {/* Interactive Direct Add Buttons inside the Empty Box */}
                        <div className="flex items-center gap-1.5 flex-wrap justify-center pt-1">
                            <button
                                type="button"
                                onClick={onAddRow}
                                className="h-7 px-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors shadow-2xs cursor-pointer"
                            >
                                <Plus size={13} />
                                <span>Add Tender ({currencySymbol}{finalPayable.toFixed(2)})</span>
                            </button>
                        </div>
                    </div>
                ) : (
                    paymentRows.map((pRow, index) => {
                        const matchedMethod = getMatchedMethod(pRow.method);
                        const rowCategory = detectPaymentCategory(pRow.method, configuredMethods);

                        // Parse reference: [Bank/Ledger/Type] | [Sub-reference / Auth / TrxID]
                        const rawRef = pRow.reference || '';
                        const refParts = rawRef.split(' | ');

                        // Available Acquiring Banks for this card/tender
                        const attachedAcquiringBanks = matchedMethod?.acquiringBanks && matchedMethod.acquiringBanks.length > 0
                            ? matchedMethod.acquiringBanks
                            : (config.registeredBanks.length > 0
                                ? config.registeredBanks.map(b => ({
                                    id: `dyn-${b.id}`,
                                    bankName: b.bankName,
                                    commissionRule: {
                                        commissionRatePercent: matchedMethod?.defaultCommissionRate || 1.50,
                                        flatFeeBdt: 0,
                                        vatOnCommissionPercent: 15.00,
                                        feeAbsorbedBy: 'HOTEL' as const,
                                        expenseGlCode: 'GL-5040 Bank Charges'
                                    },
                                    settlementAccount: b.accountTitle ? `${b.accountTitle} (${b.accountNumber})` : b.accountNumber,
                                    enabled: true
                                }))
                                : [{
                                    id: 'dyn-default',
                                    bankName: 'Asia Bank Plc.',
                                    commissionRule: {
                                        commissionRatePercent: matchedMethod?.defaultCommissionRate || 1.50,
                                        flatFeeBdt: 0,
                                        vatOnCommissionPercent: 15.00,
                                        feeAbsorbedBy: 'HOTEL' as const,
                                        expenseGlCode: 'GL-5040 Bank Charges'
                                    },
                                    settlementAccount: 'Hotel Operations A/C',
                                    enabled: true
                                }]
                            );

                        // Current selected Bank
                        const currentBankName = refParts.length > 1
                            ? refParts[0]
                            : (attachedAcquiringBanks[0]?.bankName || 'Asia Bank Plc.');

                        const pureUserRef = refParts.length > 1 ? refParts.slice(1).join(' | ') : (rowCategory === 'CARD' || rowCategory === 'BANK_TRANSFER' ? '' : rawRef);

                        // Matched Bank Object & Commission Rule
                        const matchedBankObj = attachedAcquiringBanks.find(b => b.bankName.toLowerCase() === currentBankName.toLowerCase()) || attachedAcquiringBanks[0];
                        const activeCommissionRule = matchedBankObj?.commissionRule || (matchedMethod?.defaultCommissionRate ? {
                            commissionRatePercent: matchedMethod.defaultCommissionRate,
                            flatFeeBdt: 0,
                            vatOnCommissionPercent: 15.00,
                            feeAbsorbedBy: 'HOTEL' as const,
                            expenseGlCode: 'GL-5040 Bank Charges'
                        } : null);

                        const mdrCalc = activeCommissionRule && Number(pRow.amount) > 0
                            ? calculateMdrCommission(Number(pRow.amount) || 0, activeCommissionRule)
                            : null;

                        return (
                            <div
                                key={pRow.id}
                                className="p-3 rounded-xl border border-slate-200 bg-white space-y-2.5 shadow-2xs hover:border-indigo-200 transition-colors"
                            >
                                {/* Category Segmented Pills (Switch tender type with 1 click) */}
                                <div className="flex items-center justify-between gap-2">
                                    <div className="flex items-center gap-1 overflow-x-auto scrollbar-none py-0.5">
                                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mr-1 flex-shrink-0">
                                            Tender #{index + 1}:
                                        </span>
                                        {CATEGORY_BUTTONS.map(cat => {
                                            const isSelected = rowCategory === cat.id;
                                            return (
                                                <button
                                                    key={cat.id}
                                                    type="button"
                                                    onClick={() => handleCategorySwitch(pRow.id, cat.id)}
                                                    className={`h-6 px-2 rounded-lg text-[10.5px] font-bold flex items-center gap-1 transition-all cursor-pointer whitespace-nowrap border ${
                                                        isSelected
                                                            ? cat.activeClass
                                                            : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100 hover:text-slate-900'
                                                    }`}
                                                >
                                                    {cat.icon}
                                                    <span>{cat.label}</span>
                                                </button>
                                            );
                                        })}
                                    </div>

                                    <button
                                        type="button"
                                        onClick={() => onRemoveRow(pRow.id)}
                                        className="text-slate-400 hover:text-red-600 p-1 rounded-md hover:bg-red-50 transition-colors cursor-pointer flex-shrink-0"
                                        title="Remove payment tender"
                                    >
                                        <Trash2 size={13} />
                                    </button>
                                </div>

                                {/* Main Selection Row (Grouped Dropdown + Amount) */}
                                <div className="grid grid-cols-1 sm:grid-cols-12 gap-2 pt-1 border-t border-slate-100 items-end">
                                    {/* Primary Method Selector (Grouped with optgroup) */}
                                    <div className="sm:col-span-7 flex flex-col gap-1">
                                        <div className="flex items-center justify-between">
                                            <label className="text-[10px] font-bold text-slate-700 uppercase tracking-wider">
                                                {rowCategory === 'CARD' ? 'Card Scheme' :
                                                 rowCategory === 'MOBILE_BANKING' ? 'MFS Provider' :
                                                 rowCategory === 'BANK_TRANSFER' ? 'Transfer Instrument' :
                                                 'Payment Method'}
                                            </label>
                                            {matchedMethod && (
                                                <span className="text-[9.5px] font-mono text-indigo-600 font-semibold">
                                                    Category: {rowCategory.replace('_', ' ')}
                                                </span>
                                            )}
                                        </div>

                                        <select
                                            value={matchedMethod?.displayName || pRow.method}
                                            onChange={e => {
                                                const selName = e.target.value;
                                                const selObj = configuredMethods.find(m => m.displayName === selName);
                                                if (selObj) {
                                                    if (selObj.category === 'CARD') {
                                                        const firstBank = selObj.acquiringBanks?.[0]?.bankName || config.registeredBanks[0]?.bankName || 'Asia Bank Plc.';
                                                        onUpdateRow(pRow.id, {
                                                            method: selObj.displayName,
                                                            reference: pureUserRef ? `${firstBank} | ${pureUserRef}` : `${firstBank} | `
                                                        });
                                                    } else if (selObj.category === 'MOBILE_BANKING') {
                                                        onUpdateRow(pRow.id, {
                                                            method: selObj.displayName,
                                                            reference: pureUserRef
                                                        });
                                                    } else {
                                                        onUpdateRow(pRow.id, {
                                                            method: selObj.displayName
                                                        });
                                                    }
                                                } else {
                                                    onUpdateRow(pRow.id, 'method', selName);
                                                }
                                            }}
                                            className="w-full h-8 px-2.5 bg-slate-50 border border-slate-300 rounded-lg text-xs font-bold text-slate-900 outline-none focus:border-indigo-500 focus:bg-white cursor-pointer transition-colors shadow-2xs"
                                        >
                                            {/* 1. Cash Tender */}
                                            <optgroup label="💵 Physical Cash (Counter Till)">
                                                {cashMethods.map(m => (
                                                    <option key={m.id} value={m.displayName}>
                                                        {m.displayName}
                                                    </option>
                                                ))}
                                                {cashMethods.length === 0 && <option value="Cash">Cash</option>}
                                            </optgroup>

                                            {/* 2. Card Schemes */}
                                            <optgroup label="💳 Credit &amp; Debit Card Schemes">
                                                {cardMethods.map(m => (
                                                    <option key={m.id} value={m.displayName}>
                                                        {m.displayName} {m.defaultCommissionRate ? `(${m.defaultCommissionRate}% Base MDR)` : ''}
                                                    </option>
                                                ))}
                                            </optgroup>

                                            {/* 3. Mobile Banking */}
                                            <optgroup label="📱 Mobile Banking (MFS)">
                                                {mfsMethods.map(m => (
                                                    <option key={m.id} value={m.displayName}>
                                                        {m.displayName} {m.walletNumber ? `[${m.walletNumber}]` : ''} {m.defaultCommissionRate ? `(${m.defaultCommissionRate}% MDR)` : ''}
                                                    </option>
                                                ))}
                                            </optgroup>

                                            {/* 4. Bank Transfer */}
                                            <optgroup label="🏦 Direct Bank Wire &amp; Cheques">
                                                {bankTransferMethods.map(m => (
                                                    <option key={m.id} value={m.displayName}>
                                                        {m.displayName}
                                                    </option>
                                                ))}
                                            </optgroup>

                                            {/* 5. Corporate & House Ledgers */}
                                            {corporateMethods.length > 0 && (
                                                <optgroup label="🏢 Corporate Direct Billing">
                                                    {corporateMethods.map(m => (
                                                        <option key={m.id} value={m.displayName}>
                                                            {m.displayName}
                                                        </option>
                                                    ))}
                                                </optgroup>
                                            )}

                                            {houseMethods.length > 0 && (
                                                <optgroup label="🏷️ House Ledgers &amp; Allowances">
                                                    {houseMethods.map(m => (
                                                        <option key={m.id} value={m.displayName}>
                                                            {m.displayName}
                                                        </option>
                                                    ))}
                                                </optgroup>
                                            )}
                                        </select>
                                    </div>

                                    {/* Amount Input */}
                                    <div className="sm:col-span-5 flex flex-col gap-1">
                                        <div className="flex items-center justify-between">
                                            <label className="text-[10px] font-bold text-slate-700 uppercase tracking-wider">
                                                Deposit Amount ({currencySymbol})
                                            </label>
                                            <div className="flex items-center gap-1.5">
                                                {totalDue > 0 && (
                                                    <button
                                                        type="button"
                                                        onClick={() => {
                                                            if (onFillDue) onFillDue(pRow.id);
                                                            else onUpdateRow(pRow.id, 'amount', Number(((pRow.amount || 0) + totalDue).toFixed(2)));
                                                        }}
                                                        className="text-[9.5px] text-blue-700 hover:text-blue-900 bg-blue-50 border border-blue-200 px-1.5 py-0.2 rounded font-bold cursor-pointer transition-colors"
                                                        title="Fill remaining balance due"
                                                    >
                                                        Fill Due
                                                    </button>
                                                )}
                                                {finalPayable > 0 && (
                                                    <button
                                                        type="button"
                                                        onClick={() => {
                                                            if (onFill50Percent) onFill50Percent(pRow.id);
                                                            else onUpdateRow(pRow.id, 'amount', Number((finalPayable * 0.5).toFixed(2)));
                                                        }}
                                                        className="text-[9.5px] text-slate-600 hover:text-slate-900 bg-slate-100 border border-slate-200 px-1.5 py-0.2 rounded font-semibold cursor-pointer transition-colors"
                                                        title="Set 50% advance deposit"
                                                    >
                                                        50% Adv
                                                    </button>
                                                )}
                                            </div>
                                        </div>

                                        <div className="relative">
                                            <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">
                                                {currencySymbol}
                                            </span>
                                            <input
                                                type="number"
                                                min={0}
                                                step="0.01"
                                                value={pRow.amount === 0 ? '' : pRow.amount}
                                                placeholder="0.00"
                                                onChange={e => onUpdateRow(pRow.id, 'amount', e.target.value === '' ? 0 : parseFloat(e.target.value) || 0)}
                                                className="w-full h-8 pl-6 pr-2.5 border border-slate-300 rounded-lg text-xs font-mono font-bold text-slate-900 bg-white outline-none focus:border-indigo-500 shadow-2xs"
                                            />
                                        </div>
                                    </div>
                                </div>

                                {/* HIERARCHICAL CONTEXT ROW 1: CARD HIERARCHY (Card > Visa > Asia Bank Plc.) */}
                                {rowCategory === 'CARD' && (
                                    <div className="p-2.5 rounded-lg bg-indigo-50/70 border border-indigo-100 space-y-2 text-xs">
                                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                                            {/* Acquiring Bank / POS Terminal Selector */}
                                            <div className="flex items-center gap-1.5 flex-1 min-w-0">
                                                <span className="text-[10px] font-bold text-indigo-950 uppercase tracking-wider flex items-center gap-1 flex-shrink-0">
                                                    <Landmark size={12} className="text-indigo-600" />
                                                    <span>Acquiring Bank / POS:</span>
                                                </span>
                                                <select
                                                    value={currentBankName}
                                                    onChange={e => {
                                                        const newBank = e.target.value;
                                                        onUpdateRow(pRow.id, 'reference', pureUserRef ? `${newBank} | ${pureUserRef}` : `${newBank} | `);
                                                    }}
                                                    className="h-7 px-2 border border-indigo-200 rounded-md bg-white text-xs font-bold text-indigo-950 outline-none focus:border-indigo-500 cursor-pointer min-w-44"
                                                >
                                                    {attachedAcquiringBanks.map(b => (
                                                        <option key={b.id} value={b.bankName}>
                                                            {b.bankName} {b.commissionRule?.commissionRatePercent ? `(${b.commissionRule.commissionRatePercent}% MDR)` : ''}
                                                        </option>
                                                    ))}
                                                </select>
                                            </div>

                                            {/* Reference / Auth Code Input */}
                                            <div className="flex items-center gap-1.5 flex-1">
                                                <span className="text-[10px] font-semibold text-slate-600 flex-shrink-0">
                                                    Last 4 &amp; Auth:
                                                </span>
                                                <input
                                                    type="text"
                                                    value={pureUserRef}
                                                    onChange={e => {
                                                        const val = e.target.value;
                                                        onUpdateRow(pRow.id, 'reference', `${currentBankName} | ${val}`);
                                                    }}
                                                    placeholder="e.g. 4242 / Auth: 88190"
                                                    className="w-full h-7 px-2 border border-indigo-200 rounded-md bg-white text-xs font-mono font-medium outline-none text-slate-800"
                                                />
                                            </div>
                                        </div>

                                        {/* Real-time MDR Calculation Badge */}
                                        {mdrCalc && mdrCalc.totalFee > 0 && (
                                            <div className="flex flex-wrap items-center justify-between gap-1 pt-1 border-t border-indigo-200/60 text-[10.5px]">
                                                <div className="flex items-center gap-1 font-mono text-indigo-900 font-bold">
                                                    <Percent size={11} className="text-indigo-600" />
                                                    <span>MDR Deduction: -{currencySymbol}{mdrCalc.totalFee.toFixed(2)} ({mdrCalc.commissionRatePercent}%)</span>
                                                </div>
                                                <div className="flex items-center gap-1 font-mono text-emerald-800 font-bold">
                                                    <CheckCircle2 size={11} className="text-emerald-600" />
                                                    <span>Net Hotel Realized: {currencySymbol}{mdrCalc.netSettlement.toFixed(2)} &bull; {matchedBankObj?.settlementAccount || 'Hotel Operations A/C'}</span>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                )}

                                {/* HIERARCHICAL CONTEXT ROW 2: MOBILE BANKING (MFS) */}
                                {rowCategory === 'MOBILE_BANKING' && (
                                    <div className="p-2.5 rounded-lg bg-pink-50/70 border border-pink-100 space-y-2 text-xs">
                                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                                            {/* Merchant Wallet Badge */}
                                            <div className="flex items-center gap-2">
                                                <span className="text-[10px] font-bold text-pink-950 uppercase tracking-wider flex items-center gap-1">
                                                    <Smartphone size={12} className="text-pink-600" />
                                                    <span>Merchant Wallet:</span>
                                                </span>
                                                <span className="text-xs font-mono font-bold text-pink-900 bg-white border border-pink-200 px-2 py-0.5 rounded-md">
                                                    {matchedMethod?.walletNumber || '01712-000000'} ({matchedMethod?.accountType || 'MERCHANT'})
                                                </span>
                                            </div>

                                            {/* TrxID Input */}
                                            <div className="flex items-center gap-1.5 flex-1 max-w-sm">
                                                <span className="text-[10px] font-semibold text-slate-600 flex-shrink-0">
                                                    TrxID:
                                                </span>
                                                <input
                                                    type="text"
                                                    value={pRow.reference || ''}
                                                    onChange={e => onUpdateRow(pRow.id, 'reference', e.target.value)}
                                                    placeholder="e.g. 9B82AX12"
                                                    className="w-full h-7 px-2 border border-pink-200 rounded-md bg-white text-xs font-mono font-bold text-pink-950 outline-none uppercase"
                                                />
                                            </div>
                                        </div>

                                        {/* Real-time MFS Fee Badge */}
                                        {mdrCalc && mdrCalc.totalFee > 0 && (
                                            <div className="flex flex-wrap items-center justify-between gap-1 pt-1 border-t border-pink-200/60 text-[10.5px]">
                                                <div className="flex items-center gap-1 font-mono text-pink-900 font-bold">
                                                    <Percent size={11} className="text-pink-600" />
                                                    <span>MFS Cashout Fee: -{currencySymbol}{mdrCalc.totalFee.toFixed(2)} ({mdrCalc.commissionRatePercent}%)</span>
                                                </div>
                                                <div className="flex items-center gap-1 font-mono text-emerald-800 font-bold">
                                                    <CheckCircle2 size={11} className="text-emerald-600" />
                                                    <span>Net Hotel Realized: {currencySymbol}{mdrCalc.netSettlement.toFixed(2)}</span>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                )}

                                {/* HIERARCHICAL CONTEXT ROW 3: CASH TENDER */}
                                {rowCategory === 'CASH' && (
                                    <div className="p-2.5 rounded-lg bg-emerald-50/70 border border-emerald-100 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                                        <div className="flex items-center gap-2">
                                            <span className="w-6 h-6 rounded-md bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold">
                                                ৳
                                            </span>
                                            <div>
                                                <span className="text-[11px] font-bold text-emerald-950 block">
                                                    Physical Currency Desk Collection
                                                </span>
                                                <p className="text-[10px] text-emerald-700">
                                                    Direct physical cash collected into front desk drawer with immediate guest folio credit.
                                                </p>
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-1.5">
                                            <span className="text-[10px] font-semibold text-slate-500">Memo:</span>
                                            <input
                                                type="text"
                                                value={pRow.reference || ''}
                                                onChange={e => onUpdateRow(pRow.id, 'reference', e.target.value)}
                                                placeholder="Cashier Till Receipt / Memo"
                                                className="h-7 px-2 border border-emerald-200 rounded-md bg-white text-xs outline-none w-48 text-slate-800"
                                            />
                                        </div>
                                    </div>
                                )}

                                {/* HIERARCHICAL CONTEXT ROW 4: BANK WIRE / CHEQUE */}
                                {rowCategory === 'BANK_TRANSFER' && (
                                    <div className="p-2.5 rounded-lg bg-blue-50/70 border border-blue-100 space-y-2 text-xs">
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                            <div>
                                                <label className="block text-[10px] font-bold text-blue-950 mb-0.5">
                                                    Beneficiary Hotel Bank Account
                                                </label>
                                                <select
                                                    value={currentBankName}
                                                    onChange={e => {
                                                        const newBank = e.target.value;
                                                        onUpdateRow(pRow.id, 'reference', `${newBank} | ${pureUserRef}`);
                                                    }}
                                                    className="w-full h-7 px-2 border border-blue-200 rounded-md bg-white text-xs font-semibold text-blue-950 outline-none cursor-pointer"
                                                >
                                                    {config.registeredBanks.map(b => (
                                                        <option key={b.id} value={b.bankName}>
                                                            {b.bankName} - {b.accountNumber} ({b.accountTitle})
                                                        </option>
                                                    ))}
                                                    {config.registeredBanks.length === 0 && (
                                                        <option value="Asia Bank Plc.">Asia Bank Plc. - Hotel Operations A/C</option>
                                                    )}
                                                </select>
                                            </div>

                                            <div>
                                                <label className="block text-[10px] font-bold text-blue-950 mb-0.5">
                                                    BEFTN / Cheque / Deposit Slip Ref
                                                </label>
                                                <input
                                                    type="text"
                                                    value={pureUserRef}
                                                    onChange={e => {
                                                        const val = e.target.value;
                                                        onUpdateRow(pRow.id, 'reference', `${currentBankName} | ${val}`);
                                                    }}
                                                    placeholder="Deposit Slip / Cheque No. / BEFTN TranID"
                                                    className="w-full h-7 px-2 border border-blue-200 rounded-md bg-white text-xs font-mono text-slate-800 outline-none"
                                                />
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {/* HIERARCHICAL CONTEXT ROW 5: CITY LEDGER / CORPORATE */}
                                {rowCategory === 'COMPANY_ACCOUNT' && (
                                    <div className="p-2.5 rounded-lg bg-amber-50/70 border border-amber-100 space-y-2 text-xs">
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                            <div>
                                                <label className="block text-[10px] font-bold text-amber-950 mb-0.5">
                                                    Corporate Client Account
                                                </label>
                                                <select
                                                    value={currentBankName}
                                                    onChange={e => {
                                                        const client = e.target.value;
                                                        onUpdateRow(pRow.id, 'reference', `${client} | ${pureUserRef}`);
                                                    }}
                                                    className="w-full h-7 px-2 border border-amber-200 rounded-md bg-white text-xs font-semibold text-amber-950 outline-none cursor-pointer"
                                                >
                                                    {config.corporateLedgers.map(c => (
                                                        <option key={c.id} value={c.companyName}>
                                                            {c.companyName} ({c.ledgerCode}) - Limit: {currencySymbol}{c.creditLimitBdt.toLocaleString()}
                                                        </option>
                                                    ))}
                                                    {config.corporateLedgers.length === 0 && (
                                                        <option value="Corporate Direct Billing">Corporate Direct Billing Account</option>
                                                    )}
                                                </select>
                                            </div>

                                            <div>
                                                <label className="block text-[10px] font-bold text-amber-950 mb-0.5">
                                                    Corporate PO / Voucher Reference
                                                </label>
                                                <input
                                                    type="text"
                                                    value={pureUserRef}
                                                    onChange={e => {
                                                        const val = e.target.value;
                                                        onUpdateRow(pRow.id, 'reference', `${currentBankName} | ${val}`);
                                                    }}
                                                    placeholder="Voucher / PO Number"
                                                    className="w-full h-7 px-2 border border-amber-200 rounded-md bg-white text-xs font-mono text-slate-800 outline-none"
                                                />
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        );
                    })
                )}
            </div>

            {/* Bottom Footer Bar */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-2 border-t border-slate-100">
                <button
                    type="button"
                    onClick={onAddRow}
                    className="px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 rounded-lg text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-colors shadow-2xs self-start"
                >
                    <Plus size={13} />
                    <span>Add Payment Tender</span>
                </button>

                <div className="flex items-center gap-3 text-xs font-mono">
                    <span className="text-slate-600">
                        Total Allocated: <strong className="text-slate-900 font-bold">{currencySymbol}{paymentRows.reduce((acc, p) => acc + (Number(p.amount) || 0), 0).toFixed(2)}</strong>
                    </span>
                    <span className={`px-2 py-0.5 rounded-md font-bold text-[11px] ${
                        totalDue <= 0
                            ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                            : 'bg-amber-50 text-amber-800 border border-amber-200'
                    }`}>
                        {totalDue <= 0 ? '✓ Fully Covered' : `Due: ${currencySymbol}${totalDue.toFixed(2)}`}
                    </span>
                </div>
            </div>
        </div>
    );
};

export default PaymentTenderConsole;
