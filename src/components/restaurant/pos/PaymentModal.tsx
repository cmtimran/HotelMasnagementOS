import React, { useState, useEffect } from 'react';
import {
    X,
    Banknote,
    CreditCard,
    QrCode,
    Split,
    Plus,
    Trash2,
    BedDouble,
    ShieldCheck,
    Check,
    Building2,
    Briefcase,
    Gift,
    Wallet
} from 'lucide-react';
import {
    getPaymentMethodsForOutlet,
    type PaymentMethodItem,
    type TenderCategory,
    type PaymentOutletId
} from '../../../utils/propertyPaymentMethodEngine';

export interface PaymentItem {
    id: string;
    methodId: string;
    method: string;
    category: TenderCategory;
    amount: number;
    trxId?: string;
    roomNumber?: string;
    cardLast4?: string;
    acquiringBank?: string;
    ledgerName?: string;
}

interface PaymentModalProps {
    isOpen: boolean;
    onClose: () => void;
    total: number;
    subtotal: number;
    discountAmount: number;
    vatAmount: number;
    serviceChargeAmount: number;
    cityTaxAmount?: number;
    customerName: string;
    customerPhone: string;
    selectedTable: string;
    orderType: string;
    isSubmitting: boolean;
    outletId?: string;
    onOpenSplitBill?: () => void;
    onConfirmPayment: (paymentDetails: {
        method: string;
        methodId?: string;
        category: TenderCategory | 'MULTI_TENDER';
        tendered: number;
        change: number;
        trxId?: string;
        roomNumber?: string;
        cardLast4?: string;
        acquiringBank?: string;
        ledgerName?: string;
        customerName: string;
        customerPhone: string;
        autoPrint: boolean;
        payments?: Array<{
            method: string;
            methodId?: string;
            category?: TenderCategory;
            amount: number;
            trxId?: string;
            roomNumber?: string;
            cardLast4?: string;
            acquiringBank?: string;
            ledgerName?: string;
        }>;
    }) => void;
}

export const PaymentModal: React.FC<PaymentModalProps> = ({
    isOpen,
    onClose,
    total,
    subtotal,
    discountAmount,
    vatAmount,
    serviceChargeAmount,
    cityTaxAmount = 0,
    customerName: initialCustomerName,
    customerPhone: initialCustomerPhone,
    selectedTable,
    orderType,
    isSubmitting,
    outletId: _outletId,
    onOpenSplitBill,
    onConfirmPayment
}) => {
    // Dynamic payment methods loaded from Payment Settings
    const [availableMethods, setAvailableMethods] = useState<PaymentMethodItem[]>([]);
    const [selectedMethodId, setSelectedMethodId] = useState<string>('');
    const [tenderedInput, setTenderedInput] = useState<string>('');
    const [trxId, setTrxId] = useState('');
    const [roomNumber, setRoomNumber] = useState('');
    const [roomGuestName, setRoomGuestName] = useState('');
    const [selectedAcquiringBank, setSelectedAcquiringBank] = useState('');
    const [selectedLedger, setSelectedLedger] = useState('');
    const [customerName, setCustomerName] = useState(initialCustomerName || 'Walk-in Guest');
    const [customerPhone, setCustomerPhone] = useState(initialCustomerPhone || '');
    const [autoPrint, setAutoPrint] = useState(true);

    // Multi-Tender splits
    const [appliedPayments, setAppliedPayments] = useState<PaymentItem[]>([]);

    // In-house rooms for Bill to Room
    const [inHouseRooms, setInHouseRooms] = useState<{ roomNumber: string; guestName: string; resId: string }[]>([]);

    // Load dynamic payment methods from settings
    useEffect(() => {
        const loadMethods = () => {
            const isRoomService = orderType?.toLowerCase().includes('room');
            const targetOutlet: PaymentOutletId = isRoomService ? 'ROOM_SERVICE' : 'FOOD_AND_BEVERAGE';
            const methods = getPaymentMethodsForOutlet(undefined, targetOutlet);
            setAvailableMethods(methods);

            if (methods.length > 0 && !selectedMethodId) {
                // Default to cash or first active method
                const cashMethod = methods.find((m) => m.category === 'CASH');
                setSelectedMethodId(cashMethod ? cashMethod.id : methods[0].id);
            }
        };

        if (isOpen) {
            loadMethods();
            setAppliedPayments([]);
            setTenderedInput(Math.ceil(total).toString());
            setCustomerName(initialCustomerName || 'Walk-in Guest');
            setCustomerPhone(initialCustomerPhone || '');
            setTrxId('');
            setRoomNumber('');
            setRoomGuestName('');
            setSelectedAcquiringBank('');
            setSelectedLedger('');

            // Fetch in-house rooms for Bill to Room
            fetch('/api/reservations?status=CHECKED_IN')
                .then((r) => r.json())
                .then((d) => {
                    if (d && Array.isArray(d.data)) {
                        const rooms = d.data
                            .filter((r: any) => r.room_number)
                            .map((r: any) => ({
                                roomNumber: String(r.room_number),
                                guestName: `${r.first_name || ''} ${r.last_name || ''}`.trim() || 'In-House Guest',
                                resId: r.id
                            }));
                        setInHouseRooms(rooms);
                    }
                })
                .catch(() => {});
        }

        const handleSync = () => loadMethods();
        window.addEventListener('hotel_payment_methods_updated', handleSync);
        return () => window.removeEventListener('hotel_payment_methods_updated', handleSync);
    }, [isOpen, total, initialCustomerName, initialCustomerPhone, orderType]);

    if (!isOpen) return null;

    const currentMethod = availableMethods.find((m) => m.id === selectedMethodId) || availableMethods[0] || {
        id: 'fallback-cash',
        category: 'CASH' as TenderCategory,
        displayName: 'Cash',
        subType: 'Cash',
        allowedOutlets: ['FOOD_AND_BEVERAGE'] as PaymentOutletId[],
        enabled: true
    };

    const totalPaidSoFar = appliedPayments.reduce((sum, p) => sum + p.amount, 0);
    const remainingDue = Math.max(0, +(total - totalPaidSoFar).toFixed(2));
    const currentTenderAmount = parseFloat(tenderedInput) || 0;
    const isCash = currentMethod.category === 'CASH';
    const isRoomCharge = currentMethod.category === 'ROOM_CREDIT';
    const isCard = currentMethod.category === 'CARD';
    const isMfs = currentMethod.category === 'MOBILE_BANKING';
    const isCompany = currentMethod.category === 'COMPANY_ACCOUNT';
    const isHouseLedger = currentMethod.category === 'COMPLIMENTARY' || currentMethod.category === 'ENTERTAINMENT';
    const isBankTransfer = currentMethod.category === 'BANK_TRANSFER';

    const changeAmount = isCash ? Math.max(0, +(currentTenderAmount - remainingDue).toFixed(2)) : 0;

    const handleRoomSelect = (rmNum: string) => {
        setRoomNumber(rmNum);
        const match = inHouseRooms.find((r) => r.roomNumber === rmNum);
        if (match) {
            setRoomGuestName(match.guestName);
            setCustomerName(match.guestName);
        }
    };

    const handleExactCash = () => {
        setTenderedInput(remainingDue.toString());
    };

    const handleAddAmount = (add: number) => {
        const cur = parseFloat(tenderedInput) || 0;
        setTenderedInput((cur + add).toString());
    };

    const handleAddSplitPayment = () => {
        if (currentTenderAmount <= 0) return;
        const newPayment: PaymentItem = {
            id: `pay-${Date.now()}`,
            methodId: currentMethod.id,
            method: currentMethod.displayName,
            category: currentMethod.category,
            amount: Math.min(currentTenderAmount, remainingDue),
            trxId: trxId || undefined,
            roomNumber: isRoomCharge ? roomNumber : undefined,
            acquiringBank: isCard ? selectedAcquiringBank : undefined,
            ledgerName: (isCompany || isHouseLedger) ? selectedLedger : undefined
        };
        const updated = [...appliedPayments, newPayment];
        setAppliedPayments(updated);
        const newPaid = updated.reduce((s, p) => s + p.amount, 0);
        const newRem = Math.max(0, +(total - newPaid).toFixed(2));
        setTenderedInput(newRem.toString());
        setTrxId('');
    };

    const handleRemoveSplitPayment = (id: string) => {
        const updated = appliedPayments.filter((p) => p.id !== id);
        setAppliedPayments(updated);
        const newPaid = updated.reduce((s, p) => s + p.amount, 0);
        const newRem = Math.max(0, +(total - newPaid).toFixed(2));
        setTenderedInput(newRem.toString());
    };

    const handleFinalConfirm = () => {
        if (appliedPayments.length > 0) {
            // Multi-tender flow
            onConfirmPayment({
                method: 'Multi-Tender',
                category: 'MULTI_TENDER',
                tendered: totalPaidSoFar,
                change: 0,
                customerName: customerName.trim() || 'Guest',
                customerPhone: customerPhone.trim(),
                autoPrint,
                payments: appliedPayments.map((p) => ({
                    method: p.method,
                    methodId: p.methodId,
                    category: p.category,
                    amount: p.amount,
                    trxId: p.trxId,
                    roomNumber: p.roomNumber,
                    acquiringBank: p.acquiringBank,
                    ledgerName: p.ledgerName
                }))
            });
        } else {
            // Single tender flow
            onConfirmPayment({
                method: currentMethod.displayName,
                methodId: currentMethod.id,
                category: currentMethod.category,
                tendered: isCash ? currentTenderAmount : total,
                change: changeAmount,
                trxId: trxId || undefined,
                roomNumber: isRoomCharge ? roomNumber : undefined,
                cardLast4: isCard ? trxId : undefined,
                acquiringBank: isCard ? selectedAcquiringBank : undefined,
                ledgerName: (isCompany || isHouseLedger) ? selectedLedger : undefined,
                customerName: customerName.trim() || 'Guest',
                customerPhone: customerPhone.trim(),
                autoPrint
            });
        }
    };

    const getMethodIcon = (category: TenderCategory) => {
        switch (category) {
            case 'CASH':
                return <Banknote className="size-4" />;
            case 'CARD':
                return <CreditCard className="size-4" />;
            case 'MOBILE_BANKING':
                return <QrCode className="size-4" />;
            case 'ROOM_CREDIT':
                return <BedDouble className="size-4" />;
            case 'BANK_TRANSFER':
                return <Building2 className="size-4" />;
            case 'COMPANY_ACCOUNT':
                return <Briefcase className="size-4" />;
            case 'COMPLIMENTARY':
            case 'ENTERTAINMENT':
                return <Gift className="size-4" />;
            default:
                return <Wallet className="size-4" />;
        }
    };

    return (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-150">
            <div className="bg-white dark:bg-[#16161d] border border-slate-200 dark:border-slate-800 rounded-3xl w-full max-w-xl shadow-2xl overflow-hidden flex flex-col max-h-[94vh]">
                {/* Header */}
                <div className="p-4 sm:p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/70 dark:bg-[#1c1c24]/70">
                    <div>
                        <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                            <span>Checkout & Settle Payment</span>
                            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20">
                                Dynamic Tender Engine
                            </span>
                        </h3>
                        <p className="text-xs text-slate-400">
                            {orderType} • Table: {selectedTable || 'Counter'}
                        </p>
                    </div>
                    <button
                        onClick={onClose}
                        className="size-8 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-500 hover:text-slate-900 dark:hover:text-white flex items-center justify-center transition cursor-pointer"
                    >
                        <X className="size-4" />
                    </button>
                </div>

                {/* Body */}
                <div className="p-5 overflow-y-auto space-y-4 flex-1 text-xs">
                    {/* Bill Summary Banner */}
                    <div className="p-4 rounded-2xl bg-primary/5 dark:bg-primary/10 border border-primary/20 flex items-center justify-between">
                        <div>
                            <span className="text-xs text-slate-500 dark:text-slate-400 block">Total Due</span>
                            <span className="text-2xl font-black text-slate-900 dark:text-white font-mono">
                                ৳{remainingDue.toFixed(2)}
                            </span>
                            {appliedPayments.length > 0 && (
                                <span className="text-[11px] text-emerald-600 dark:text-emerald-400 block font-medium">
                                    Paid: ৳{totalPaidSoFar.toFixed(2)} of ৳{total.toFixed(2)}
                                </span>
                            )}
                        </div>
                        <div className="text-right text-[11px] text-slate-500 dark:text-slate-400 space-y-0.5">
                            <div>Subtotal: ৳{subtotal.toFixed(2)}</div>
                            {discountAmount > 0 && <div>Discount: -৳{discountAmount.toFixed(2)}</div>}
                            <div>Tax & SC: ৳{(vatAmount + serviceChargeAmount + cityTaxAmount).toFixed(2)}</div>
                        </div>
                    </div>

                    {/* Multi-Tender Applied Payments List */}
                    {appliedPayments.length > 0 && (
                        <div className="p-3.5 rounded-2xl bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800 space-y-2">
                            <div className="flex items-center justify-between text-xs font-bold text-emerald-800 dark:text-emerald-300">
                                <span>Applied Split Payments</span>
                                <span>Total Paid: ৳{totalPaidSoFar.toFixed(2)}</span>
                            </div>
                            <div className="space-y-1.5">
                                {appliedPayments.map((p) => (
                                    <div
                                        key={p.id}
                                        className="flex items-center justify-between p-2 rounded-xl bg-white dark:bg-[#1a1a24] border border-emerald-200/60 dark:border-emerald-900/40 text-slate-700 dark:text-slate-300 text-xs"
                                    >
                                        <div className="flex items-center gap-2">
                                            {getMethodIcon(p.category)}
                                            <span className="font-semibold">{p.method}</span>
                                            {p.trxId && (
                                                <span className="text-[10px] font-mono text-slate-400">({p.trxId})</span>
                                            )}
                                            {p.roomNumber && (
                                                <span className="text-[10px] font-mono text-indigo-500 font-bold">
                                                    (Room #{p.roomNumber})
                                                </span>
                                            )}
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <span className="font-mono font-bold">৳{p.amount.toFixed(2)}</span>
                                            <button
                                                type="button"
                                                onClick={() => handleRemoveSplitPayment(p.id)}
                                                className="text-rose-500 hover:text-rose-700 p-1 cursor-pointer"
                                            >
                                                <Trash2 className="size-3.5" />
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Dynamic Payment Method Selector (From System Payment Settings) */}
                    <div>
                        <div className="flex items-center justify-between mb-2">
                            <label className="block font-bold text-slate-700 dark:text-slate-300">
                                Select Payment Method (Configured via Settings)
                            </label>
                            <span className="text-[11px] text-slate-400 font-medium">
                                {availableMethods.length} Methods Active
                            </span>
                        </div>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                            {availableMethods.map((m) => {
                                const isSelected = m.id === currentMethod.id;
                                return (
                                    <button
                                        key={m.id}
                                        type="button"
                                        onClick={() => {
                                            setSelectedMethodId(m.id);
                                            setTrxId('');
                                            setSelectedAcquiringBank('');
                                            setSelectedLedger('');
                                        }}
                                        className={`p-2.5 rounded-2xl border text-center flex flex-col items-center justify-center gap-1.5 transition cursor-pointer ${
                                            isSelected
                                                ? 'border-primary bg-primary/10 text-primary ring-2 ring-primary/20 font-bold shadow-xs'
                                                : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-[#1a1a24] text-slate-600 dark:text-slate-400 hover:border-slate-300'
                                        }`}
                                    >
                                        {getMethodIcon(m.category)}
                                        <span className="truncate max-w-[110px] text-xs">{m.displayName}</span>
                                        {m.walletNumber && (
                                            <span className="text-[9px] text-slate-400 font-mono -mt-1 truncate max-w-[100px]">
                                                {m.walletNumber}
                                            </span>
                                        )}
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    {/* Method Specific Inputs */}
                    {isCash && (
                        <div className="space-y-3 p-4 rounded-2xl bg-slate-50 dark:bg-[#1a1a24] border border-slate-200 dark:border-slate-800">
                            <div>
                                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                                    Tendered Cash Amount (৳)
                                </label>
                                <input
                                    type="number"
                                    step="0.01"
                                    value={tenderedInput}
                                    onChange={(e) => setTenderedInput(e.target.value)}
                                    placeholder="Enter cash amount"
                                    className="w-full bg-white dark:bg-[#202028] border border-slate-200 dark:border-slate-700 rounded-xl px-3.5 py-2.5 text-slate-900 dark:text-white font-mono font-bold text-base focus:outline-none focus:border-primary"
                                />
                            </div>

                            {/* Quick Note Denominations */}
                            <div className="flex flex-wrap items-center gap-2">
                                <button
                                    type="button"
                                    onClick={handleExactCash}
                                    className="px-3 py-1.5 rounded-xl border border-primary/40 bg-primary/10 text-primary font-bold text-xs hover:bg-primary/20 transition cursor-pointer"
                                >
                                    Exact ৳{remainingDue.toFixed(2)}
                                </button>
                                <button
                                    type="button"
                                    onClick={() => handleAddAmount(100)}
                                    className="px-2.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#202028] text-slate-700 dark:text-slate-300 font-mono font-semibold hover:bg-slate-100 transition cursor-pointer"
                                >
                                    +100
                                </button>
                                <button
                                    type="button"
                                    onClick={() => handleAddAmount(500)}
                                    className="px-2.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#202028] text-slate-700 dark:text-slate-300 font-mono font-semibold hover:bg-slate-100 transition cursor-pointer"
                                >
                                    +500
                                </button>
                                <button
                                    type="button"
                                    onClick={() => handleAddAmount(1000)}
                                    className="px-2.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#202028] text-slate-700 dark:text-slate-300 font-mono font-semibold hover:bg-slate-100 transition cursor-pointer"
                                >
                                    +1000
                                </button>
                            </div>

                            {/* Change Due Display */}
                            <div className="flex items-center justify-between pt-2 border-t border-slate-200/80 dark:border-slate-700/80">
                                <span className="font-semibold text-slate-500">Change Due to Customer</span>
                                <span className="font-mono font-black text-base text-emerald-600 dark:text-emerald-400">
                                    ৳{changeAmount.toFixed(2)}
                                </span>
                            </div>
                        </div>
                    )}

                    {/* Room Charge (Bill to Room / Hotel Folio) */}
                    {isRoomCharge && (
                        <div className="space-y-3 p-4 rounded-2xl bg-indigo-50/50 dark:bg-indigo-950/20 border border-indigo-200 dark:border-indigo-900/60">
                            <div className="flex items-center gap-2 text-indigo-700 dark:text-indigo-300 font-bold">
                                <ShieldCheck className="size-4" />
                                <span>Hotel Folio Charge Integration</span>
                            </div>
                            <p className="text-[11px] text-slate-500 dark:text-slate-400">
                                This food charge will be posted directly to the guest's hotel room folio under USALI Head 10020-01.
                            </p>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                <div>
                                    <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                                        Hotel Room Number <span className="text-rose-500">*</span>
                                    </label>
                                    <input
                                        type="text"
                                        required
                                        value={roomNumber}
                                        onChange={(e) => handleRoomSelect(e.target.value)}
                                        placeholder="e.g. 101, 204..."
                                        className="w-full bg-white dark:bg-[#202028] border border-indigo-300 dark:border-indigo-800 rounded-xl px-3.5 py-2.5 text-slate-900 dark:text-white font-mono font-bold focus:outline-none focus:border-indigo-500"
                                    />
                                </div>
                                <div>
                                    <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                                        In-House Guest Quick Select
                                    </label>
                                    <select
                                        value={roomNumber}
                                        onChange={(e) => handleRoomSelect(e.target.value)}
                                        className="w-full bg-white dark:bg-[#202028] border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2.5 text-slate-900 dark:text-white cursor-pointer font-medium"
                                    >
                                        <option value="">Select in-house room…</option>
                                        {inHouseRooms.map((r) => (
                                            <option key={r.roomNumber} value={r.roomNumber}>
                                                Room {r.roomNumber} ({r.guestName})
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            {roomGuestName && (
                                <div className="p-2.5 rounded-xl bg-white dark:bg-[#1a1a24] border border-indigo-200 text-xs font-semibold text-indigo-700 flex items-center justify-between">
                                    <span>Guest: {roomGuestName}</span>
                                    <span className="text-[10px] text-slate-400 font-mono">Room #{roomNumber}</span>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Card Configuration & EDC Terminal */}
                    {isCard && (
                        <div className="p-4 rounded-2xl bg-slate-50 dark:bg-[#1a1a24] border border-slate-200 dark:border-slate-800 space-y-3">
                            {currentMethod.acquiringBanks && currentMethod.acquiringBanks.length > 0 && (
                                <div>
                                    <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                                        Acquiring Bank / EDC Terminal
                                    </label>
                                    <select
                                        value={selectedAcquiringBank}
                                        onChange={(e) => setSelectedAcquiringBank(e.target.value)}
                                        className="w-full bg-white dark:bg-[#202028] border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-slate-900 dark:text-white cursor-pointer"
                                    >
                                        <option value="">Select acquiring terminal…</option>
                                        {currentMethod.acquiringBanks.map((b) => (
                                            <option key={b.id} value={b.bankName}>
                                                {b.bankName} {b.posTerminalName ? `(${b.posTerminalName})` : ''} - MDR {b.commissionRule?.commissionRatePercent || 0}%
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            )}
                            <div>
                                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                                    Card Last 4 Digits / Approval Auth Code
                                </label>
                                <input
                                    type="text"
                                    value={trxId}
                                    onChange={(e) => setTrxId(e.target.value.toUpperCase())}
                                    placeholder={currentMethod.referencePlaceholder || 'e.g. 4829 or AUTH-9921'}
                                    className="w-full bg-white dark:bg-[#202028] border border-slate-200 dark:border-slate-700 rounded-xl px-3.5 py-2.5 text-slate-900 dark:text-white font-mono uppercase focus:outline-none focus:border-primary"
                                />
                            </div>
                        </div>
                    )}

                    {/* Mobile Banking (MFS) Configuration */}
                    {isMfs && (
                        <div className="p-4 rounded-2xl bg-slate-50 dark:bg-[#1a1a24] border border-slate-200 dark:border-slate-800 space-y-3">
                            {currentMethod.walletNumber && (
                                <div className="p-2.5 rounded-xl bg-pink-50 dark:bg-pink-950/20 border border-pink-200 dark:border-pink-900/40 flex items-center justify-between text-xs text-pink-700 dark:text-pink-300">
                                    <span className="font-semibold">{currentMethod.displayName} Merchant Account:</span>
                                    <span className="font-mono font-bold">{currentMethod.walletNumber}</span>
                                </div>
                            )}
                            <div>
                                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                                    {currentMethod.displayName} Transaction ID (TrxID) <span className="text-rose-500">*</span>
                                </label>
                                <input
                                    type="text"
                                    value={trxId}
                                    onChange={(e) => setTrxId(e.target.value.toUpperCase())}
                                    placeholder={currentMethod.referencePlaceholder || 'e.g. 9B82AX12'}
                                    className="w-full bg-white dark:bg-[#202028] border border-slate-200 dark:border-slate-700 rounded-xl px-3.5 py-2.5 text-slate-900 dark:text-white font-mono uppercase focus:outline-none focus:border-primary"
                                />
                            </div>
                        </div>
                    )}

                    {/* Corporate Direct Billing / House Ledger */}
                    {(isCompany || isHouseLedger) && (
                        <div className="p-4 rounded-2xl bg-slate-50 dark:bg-[#1a1a24] border border-slate-200 dark:border-slate-800 space-y-3">
                            {currentMethod.ledgerNames && currentMethod.ledgerNames.length > 0 && (
                                <div>
                                    <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                                        Select Corporate / Internal Ledger
                                    </label>
                                    <select
                                        value={selectedLedger}
                                        onChange={(e) => setSelectedLedger(e.target.value)}
                                        className="w-full bg-white dark:bg-[#202028] border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-slate-900 dark:text-white cursor-pointer"
                                    >
                                        <option value="">Select ledger…</option>
                                        {currentMethod.ledgerNames.map((l) => (
                                            <option key={l} value={l}>
                                                {l}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            )}
                            <div>
                                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                                    Authorization Reference / PO / Approval Voucher
                                </label>
                                <input
                                    type="text"
                                    value={trxId}
                                    onChange={(e) => setTrxId(e.target.value)}
                                    placeholder={currentMethod.referencePlaceholder || 'e.g. PO-8921 or GM Approved'}
                                    className="w-full bg-white dark:bg-[#202028] border border-slate-200 dark:border-slate-700 rounded-xl px-3.5 py-2 text-slate-900 dark:text-white focus:outline-none focus:border-primary"
                                />
                            </div>
                        </div>
                    )}

                    {/* Bank Wire / Cheque */}
                    {isBankTransfer && (
                        <div className="p-4 rounded-2xl bg-slate-50 dark:bg-[#1a1a24] border border-slate-200 dark:border-slate-800 space-y-3">
                            <div>
                                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                                    Bank Transfer / Cheque / BEFTN Reference
                                </label>
                                <input
                                    type="text"
                                    value={trxId}
                                    onChange={(e) => setTrxId(e.target.value)}
                                    placeholder={currentMethod.referencePlaceholder || 'Cheque No / Deposit Slip Ref'}
                                    className="w-full bg-white dark:bg-[#202028] border border-slate-200 dark:border-slate-700 rounded-xl px-3.5 py-2 text-slate-900 dark:text-white focus:outline-none focus:border-primary"
                                />
                            </div>
                        </div>
                    )}

                    {/* Add to Split Payment Button */}
                    {remainingDue > 0 && (
                        <div className="flex items-center justify-between pt-1">
                            <span className="text-[11px] text-slate-400">
                                Need to split between Cash + Card or multiple payers?
                            </span>
                            <button
                                type="button"
                                onClick={handleAddSplitPayment}
                                className="px-3 py-1.5 rounded-xl border border-primary/40 bg-primary/10 text-primary font-bold text-xs hover:bg-primary/20 transition cursor-pointer flex items-center gap-1"
                            >
                                <Plus className="size-3.5" />
                                <span>Add Part Payment</span>
                            </button>
                        </div>
                    )}

                    {/* Guest Contact Details */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                        <div>
                            <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                                Guest / Customer Name
                            </label>
                            <input
                                type="text"
                                value={customerName}
                                onChange={(e) => setCustomerName(e.target.value)}
                                placeholder="Walk-in Guest"
                                className="w-full bg-slate-50 dark:bg-[#202028] border border-slate-200 dark:border-slate-700 rounded-xl px-3.5 py-2 text-slate-900 dark:text-white focus:outline-none focus:border-primary"
                            />
                        </div>
                        <div>
                            <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                                Phone Number (SMS Receipt)
                            </label>
                            <input
                                type="tel"
                                value={customerPhone}
                                onChange={(e) => setCustomerPhone(e.target.value)}
                                placeholder="017xxxxxxxx"
                                className="w-full bg-slate-50 dark:bg-[#202028] border border-slate-200 dark:border-slate-700 rounded-xl px-3.5 py-2 text-slate-900 dark:text-white font-mono focus:outline-none focus:border-primary"
                            />
                        </div>
                    </div>

                    {/* Auto-print thermal slip toggle */}
                    <div className="flex items-center justify-between pt-1">
                        <label className="flex items-center gap-2 cursor-pointer font-medium text-slate-700 dark:text-slate-300">
                            <input
                                type="checkbox"
                                checked={autoPrint}
                                onChange={(e) => setAutoPrint(e.target.checked)}
                                className="size-4 rounded-md text-primary focus:ring-primary border-slate-300"
                            />
                            <span>Print Thermal Mushak 6.3 Tax Receipt on Complete</span>
                        </label>
                        {onOpenSplitBill && (
                            <button
                                type="button"
                                onClick={() => {
                                    onClose();
                                    onOpenSplitBill();
                                }}
                                className="text-primary hover:underline font-bold text-xs flex items-center gap-1 cursor-pointer"
                            >
                                <Split className="size-3.5" />
                                <span>Split Bill</span>
                            </button>
                        )}
                    </div>
                </div>

                {/* Footer */}
                <div className="p-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-[#1c1c24]/50 flex items-center justify-end gap-2.5">
                    <button
                        type="button"
                        onClick={onClose}
                        className="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-semibold text-xs hover:bg-slate-100 transition cursor-pointer"
                    >
                        Cancel
                    </button>
                    <button
                        type="button"
                        onClick={handleFinalConfirm}
                        disabled={
                            isSubmitting ||
                            (isRoomCharge && !roomNumber) ||
                            (appliedPayments.length > 0 && remainingDue > 0)
                        }
                        className="px-6 py-2.5 rounded-xl bg-primary text-white font-bold text-xs hover:opacity-90 transition disabled:opacity-50 cursor-pointer shadow-md shadow-primary/20 flex items-center gap-1.5"
                    >
                        <Check className="size-4" />
                        <span>
                            {isSubmitting
                                ? 'Processing…'
                                : appliedPayments.length > 0
                                ? `Complete Split Settlement (৳${totalPaidSoFar.toFixed(2)})`
                                : `Complete & Settle ৳${total.toFixed(2)}`}
                        </span>
                    </button>
                </div>
            </div>
        </div>
    );
};
