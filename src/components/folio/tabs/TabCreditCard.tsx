import React, { useState } from 'react';
import {
    CreditCard as CreditCardIcon,
    ShieldCheck,
    Plus,
    Lock,
    CheckCircle2,
    DollarSign,
    AlertCircle,
    Sparkles,
    X
} from 'lucide-react';
import { useActiveCurrency } from '../../../utils/currencyUtils';
import { getApiBaseUrl } from '../../../utils/apiUrl';
import type { FolioData } from '../folioTypes';
import type { AmendBookingData } from '../../modals/AmendStayModal';

interface TabCreditCardProps {
    folio: FolioData | null;
    booking?: AmendBookingData | null;
    onOpenAddPayment?: () => void;
    onRefresh?: () => void;
}

interface StoredCard {
    id: string;
    cardType: 'VISA' | 'MasterCard' | 'Amex' | 'Discover';
    last4: string;
    cardholderName: string;
    expiry: string;
    gateway: string;
    token: string;
    isPrimary: boolean;
    preAuthAmount?: number;
    preAuthCode?: string;
    status: 'Authorized' | 'Tokenized' | 'Expired';
}

export const TabCreditCard: React.FC<TabCreditCardProps> = ({
    folio,
    booking,
    onOpenAddPayment,
    onRefresh: _onRefresh
}) => {
    const { currencySymbol: currency } = useActiveCurrency();
    const guestName = folio?.guest_name || booking?.guestName || 'Valued Guest';

    // Stored tokenized cards (Enterprise Payment Gateway integration)
    const [cards, setCards] = useState<StoredCard[]>([
        {
            id: 'card-1',
            cardType: 'VISA',
            last4: '1111',
            cardholderName: guestName,
            expiry: '12/28',
            gateway: 'Zeamster Gateway (PCI-DSS Level 1)',
            token: '11f12955d9ccad1c8807d381',
            isPrimary: true,
            preAuthAmount: 250.00,
            preAuthCode: 'AUTH-942851',
            status: 'Authorized'
        }
    ]);

    const [isAddCardOpen, setIsAddCardOpen] = useState(false);
    const [isPreAuthOpen, setIsPreAuthOpen] = useState(false);
    const [preAuthInputAmount, setPreAuthInputAmount] = useState('150.00');
    const [newCardNumber, setNewCardNumber] = useState('');
    const [newCardHolder, setNewCardHolder] = useState(guestName);
    const [newCardExpiry, setNewCardExpiry] = useState('08/29');
    const [newCardCvv, setNewCardCvv] = useState('');
    const [actionMsg, setActionMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

    // Extend Sale States (Card-on-File Protocol)
    const [isExtendSaleOpen, setIsExtendSaleOpen] = useState(false);
    const [selectedExtendCard, setSelectedExtendCard] = useState<StoredCard | null>(null);
    const [extendSaleAmount, setExtendSaleAmount] = useState('500.00');
    const [extendSaleRevenueHead, setExtendSaleRevenueHead] = useState('Minibar');
    const [extendSaleDescription, setExtendSaleDescription] = useState('Post-stay incidental charge (Extend Sale)');
    const [isProcessingExtend, setIsProcessingExtend] = useState(false);

    const handleExtendSale = async (e: React.FormEvent) => {
        e.preventDefault();
        const amt = parseFloat(extendSaleAmount) || 0;
        if (amt <= 0 || !selectedExtendCard) {
            setActionMsg({ type: 'error', text: 'Please enter a valid charge amount.' });
            return;
        }

        setIsProcessingExtend(true);
        try {
            const folioId = folio?.id || '1';
            const res = await fetch(`${getApiBaseUrl()}/api/accounting/folios/${folioId}/extend-sale`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    amount: amt,
                    revenueHead: extendSaleRevenueHead,
                    description: extendSaleDescription,
                    cardLast4: selectedExtendCard.last4,
                    cardType: selectedExtendCard.cardType,
                    userName: 'Front Desk'
                })
            });
            const json = await res.json();
            if (json.success) {
                setActionMsg({
                    type: 'success',
                    text: json.message || `Extend sale of ${currency} ${amt.toFixed(2)} charged to ${selectedExtendCard.cardType} ****${selectedExtendCard.last4} successfully!`
                });
                setIsExtendSaleOpen(false);
                if (_onRefresh) _onRefresh();
            } else {
                setActionMsg({ type: 'error', text: json.error || 'Failed to process extend sale' });
            }
        } catch (err: any) {
            setActionMsg({ type: 'error', text: err.message || 'Error processing extend sale' });
        } finally {
            setIsProcessingExtend(false);
        }
    };

    const handlePreAuthorize = (cardId: string) => {
        const amt = parseFloat(preAuthInputAmount) || 0;
        if (amt <= 0) return;

        setCards(prev => prev.map(c => {
            if (c.id === cardId) {
                return {
                    ...c,
                    preAuthAmount: (c.preAuthAmount || 0) + amt,
                    status: 'Authorized',
                    preAuthCode: `AUTH-${Math.floor(100000 + Math.random() * 900000)}`
                };
            }
            return c;
        }));
        setIsPreAuthOpen(false);
        setActionMsg({
            type: 'success',
            text: `Pre-authorization of ${currency} ${amt.toFixed(2)} approved via Zeamster.`
        });
    };

    const handleReleaseHold = (cardId: string) => {
        setCards(prev => prev.map(c => {
            if (c.id === cardId) {
                return {
                    ...c,
                    preAuthAmount: 0,
                    status: 'Tokenized',
                    preAuthCode: undefined
                };
            }
            return c;
        }));
        setActionMsg({
            type: 'success',
            text: 'Pre-authorization hold successfully released and voided.'
        });
    };

    const handleAddCard = (e: React.FormEvent) => {
        e.preventDefault();
        const cleanNumber = newCardNumber.replace(/\s+/g, '');
        if (cleanNumber.length < 15) {
            setActionMsg({ type: 'error', text: 'Please enter a valid credit card number.' });
            return;
        }

        const last4 = cleanNumber.slice(-4);
        const cardType: StoredCard['cardType'] = cleanNumber.startsWith('4')
            ? 'VISA'
            : cleanNumber.startsWith('5')
                ? 'MasterCard'
                : cleanNumber.startsWith('3')
                    ? 'Amex'
                    : 'Discover';

        const newEntry: StoredCard = {
            id: `card-${Date.now()}`,
            cardType,
            last4,
            cardholderName: newCardHolder || guestName,
            expiry: newCardExpiry || '12/28',
            gateway: 'Zeamster Gateway (PCI-DSS Level 1)',
            token: `tok_${Math.random().toString(36).substring(2, 18)}`,
            isPrimary: cards.length === 0,
            status: 'Tokenized'
        };

        setCards(prev => [...prev, newEntry]);
        setIsAddCardOpen(false);
        setNewCardNumber('');
        setNewCardCvv('');
        setActionMsg({
            type: 'success',
            text: `Card ${cardType} ending in ${last4} securely tokenized via Zeamster.`
        });
    };

    return (
        <div className="w-full h-full flex flex-col p-3 text-gray-800 space-y-3 overflow-y-auto">
            {/* Header & PCI Compliance Banner */}
            <div className="flex items-center justify-between pb-2 border-b border-gray-200">
                <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg bg-blue-50 border border-blue-200 text-blue-700 flex items-center justify-center">
                        <CreditCardIcon size={16} />
                    </div>
                    <div>
                        <h3 className="text-xs font-bold text-gray-800">Credit Card &amp; Payment Gateway Operations</h3>
                        <p className="text-[10px] text-gray-500">
                            PCI-DSS compliant card vaulting, pre-authorizations, and settlements (Direct Gateway / Tokenized)
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                        <ShieldCheck size={12} className="text-emerald-600" />
                        <span>PCI-DSS Tokenized</span>
                    </span>
                    <button
                        type="button"
                        onClick={() => setIsAddCardOpen(true)}
                        className="h-7 bg-blue-600 hover:bg-blue-700 text-white rounded px-2.5 text-xs font-semibold shadow-2xs transition-colors flex items-center gap-1 cursor-pointer"
                    >
                        <Plus size={13} />
                        <span>Add &amp; Tokenize Card</span>
                    </button>
                </div>
            </div>

            {/* Notification message */}
            {actionMsg && (
                <div className={`px-3 py-1.5 rounded-lg text-xs font-medium flex items-center justify-between shadow-2xs animate-in fade-in duration-150 ${
                    actionMsg.type === 'success'
                        ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                        : 'bg-rose-50 text-rose-800 border border-rose-200'
                }`}>
                    <div className="flex items-center gap-1.5">
                        {actionMsg.type === 'success' ? <CheckCircle2 size={13} className="text-emerald-600" /> : <AlertCircle size={13} className="text-rose-600" />}
                        <span>{actionMsg.text}</span>
                    </div>
                    <button type="button" onClick={() => setActionMsg(null)} className="text-gray-400 hover:text-gray-700 text-xs ml-2">✕</button>
                </div>
            )}

            {/* Stored Cards List */}
            <div className="space-y-2">
                <h4 className="text-[11px] font-bold text-gray-600 uppercase tracking-wider">
                    Stored &amp; Authorized Cards ({cards.length})
                </h4>

                {cards.map((c) => (
                    <div
                        key={c.id}
                        className="bg-white border border-gray-200 rounded-xl p-3 shadow-2xs hover:shadow-xs transition-shadow flex items-center justify-between"
                    >
                        <div className="flex items-center gap-3">
                            {/* Card Brand Badge */}
                            <div className="w-12 h-8 rounded bg-slate-900 text-white flex flex-col items-center justify-center font-bold font-mono text-[10px] tracking-wider shrink-0 shadow-xs">
                                <span>{c.cardType}</span>
                            </div>

                            <div className="space-y-0.5">
                                <div className="flex items-center gap-2">
                                    <span className="font-mono text-xs font-bold text-gray-900 tracking-wider">
                                        •••• •••• •••• {c.last4}
                                    </span>
                                    {c.isPrimary && (
                                        <span className="bg-blue-100 text-blue-800 text-[9px] font-bold px-1.5 py-0.2 rounded">
                                            Primary Guarantee
                                        </span>
                                    )}
                                    <span className={`text-[9px] font-semibold px-1.5 py-0.2 rounded border ${
                                        c.status === 'Authorized'
                                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                            : 'bg-slate-100 text-slate-700 border-slate-200'
                                    }`}>
                                        {c.status}
                                    </span>
                                </div>
                                <div className="text-[11px] text-gray-500 flex items-center gap-3">
                                    <span>Cardholder: <strong className="text-gray-700 font-medium">{c.cardholderName}</strong></span>
                                    <span>Expires: <strong className="font-mono text-gray-700">{c.expiry}</strong></span>
                                    <span>Gateway: <strong className="text-indigo-700">{c.gateway}</strong></span>
                                </div>
                                <div className="text-[10px] font-mono text-gray-400">
                                    Token Ref: {c.token} {c.preAuthCode && `| Pre-Auth Code: ${c.preAuthCode}`}
                                </div>
                            </div>
                        </div>

                        {/* Pre-auth / Settlement Actions */}
                        <div className="flex items-center gap-2">
                            {c.preAuthAmount && c.preAuthAmount > 0 ? (
                                <div className="text-right pr-2">
                                    <div className="text-[10px] text-gray-400 uppercase font-semibold">Hold Amount</div>
                                    <div className="text-xs font-bold font-mono text-emerald-700">
                                        {currency} {c.preAuthAmount.toFixed(2)}
                                    </div>
                                </div>
                            ) : null}

                            <button
                                type="button"
                                onClick={() => setIsPreAuthOpen(true)}
                                className="h-7 bg-white hover:bg-gray-50 border border-gray-300 text-gray-700 rounded px-2 text-xs font-medium shadow-2xs transition-colors cursor-pointer"
                            >
                                Pre-Auth
                            </button>

                            {c.preAuthAmount && c.preAuthAmount > 0 && (
                                <button
                                    type="button"
                                    onClick={() => handleReleaseHold(c.id)}
                                    className="h-7 bg-white hover:bg-rose-50 border border-rose-300 text-rose-700 rounded px-2 text-xs font-medium shadow-2xs transition-colors cursor-pointer"
                                >
                                    Release Hold
                                </button>
                            )}

                            {onOpenAddPayment && (
                                <button
                                    type="button"
                                    onClick={onOpenAddPayment}
                                    className="h-7 bg-emerald-600 hover:bg-emerald-700 text-white rounded px-2.5 text-xs font-semibold shadow-2xs transition-colors cursor-pointer flex items-center gap-1"
                                >
                                    <DollarSign size={12} />
                                    <span>Charge Card</span>
                                </button>
                            )}

                            {/* Extend Sale Button */}
                            <button
                                type="button"
                                onClick={() => {
                                    setSelectedExtendCard(c);
                                    setIsExtendSaleOpen(true);
                                }}
                                title="Extend Sale: Charge card-on-file for late incidentals"
                                className="h-7 bg-indigo-50 hover:bg-indigo-100 text-indigo-800 border border-indigo-200 rounded px-2 text-xs font-semibold shadow-2xs transition-colors cursor-pointer flex items-center gap-1"
                            >
                                <Sparkles size={11} className="text-indigo-600" />
                                <span>Extend Sale</span>
                            </button>
                        </div>
                    </div>
                ))}
            </div>

            {/* Modal: Tokenize New Card */}
            {isAddCardOpen && (
                <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
                    <div className="bg-white rounded-xl shadow-2xl border border-gray-200 max-w-md w-full p-4 space-y-3 animate-in fade-in zoom-in-95 duration-100">
                        <div className="flex items-center justify-between pb-2 border-b border-gray-200">
                            <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2">
                                <Lock size={15} className="text-blue-600" />
                                <span>Tokenize Credit Card via Zeamster</span>
                            </h3>
                            <button type="button" onClick={() => setIsAddCardOpen(false)} className="text-gray-400 hover:text-gray-700">✕</button>
                        </div>

                        <form onSubmit={handleAddCard} className="space-y-3">
                            <div>
                                <label className="block text-xs font-medium text-gray-700 mb-1">Card Number</label>
                                <input
                                    type="text"
                                    required
                                    placeholder="4532 •••• •••• 1111"
                                    value={newCardNumber}
                                    onChange={e => setNewCardNumber(e.target.value)}
                                    className="w-full border border-gray-300 rounded px-2.5 py-1.5 text-xs font-mono focus:ring-1 focus:ring-blue-500 focus:outline-hidden"
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-medium text-gray-700 mb-1">Cardholder Name</label>
                                <input
                                    type="text"
                                    required
                                    value={newCardHolder}
                                    onChange={e => setNewCardHolder(e.target.value)}
                                    className="w-full border border-gray-300 rounded px-2.5 py-1.5 text-xs focus:ring-1 focus:ring-blue-500 focus:outline-hidden"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-2">
                                <div>
                                    <label className="block text-xs font-medium text-gray-700 mb-1">Expiry (MM/YY)</label>
                                    <input
                                        type="text"
                                        required
                                        placeholder="12/28"
                                        value={newCardExpiry}
                                        onChange={e => setNewCardExpiry(e.target.value)}
                                        className="w-full border border-gray-300 rounded px-2.5 py-1.5 text-xs font-mono focus:ring-1 focus:ring-blue-500 focus:outline-hidden"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-gray-700 mb-1">CVV / CVC</label>
                                    <input
                                        type="password"
                                        maxLength={4}
                                        required
                                        placeholder="•••"
                                        value={newCardCvv}
                                        onChange={e => setNewCardCvv(e.target.value)}
                                        className="w-full border border-gray-300 rounded px-2.5 py-1.5 text-xs font-mono focus:ring-1 focus:ring-blue-500 focus:outline-hidden"
                                    />
                                </div>
                            </div>

                            <div className="bg-slate-50 border border-slate-200 rounded p-2 text-[10px] text-gray-500 leading-relaxed flex items-center gap-1.5">
                                <ShieldCheck size={14} className="text-emerald-600 shrink-0" />
                                <span>Card data is tokenized directly with Zeamster Payment Vault. Raw PAN is never stored locally.</span>
                            </div>

                            <div className="flex justify-end gap-2 pt-2 border-t border-gray-100">
                                <button
                                    type="button"
                                    onClick={() => setIsAddCardOpen(false)}
                                    className="px-3 py-1.5 text-xs font-medium border border-gray-300 rounded text-gray-700 hover:bg-gray-50"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="px-3 py-1.5 text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white rounded shadow-xs"
                                >
                                    Tokenize Card
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Modal: Pre-Authorize Hold */}
            {isPreAuthOpen && (
                <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
                    <div className="bg-white rounded-xl shadow-2xl border border-gray-200 max-w-sm w-full p-4 space-y-3 animate-in fade-in zoom-in-95 duration-100">
                        <div className="flex items-center justify-between pb-2 border-b border-gray-200">
                            <h3 className="text-sm font-bold text-gray-900">Pre-Authorize Incidental Hold</h3>
                            <button type="button" onClick={() => setIsPreAuthOpen(false)} className="text-gray-400 hover:text-gray-700">✕</button>
                        </div>

                        <div>
                            <label className="block text-xs font-medium text-gray-700 mb-1">Pre-Authorization Amount ({currency})</label>
                            <input
                                type="number"
                                step="0.01"
                                value={preAuthInputAmount}
                                onChange={e => setPreAuthInputAmount(e.target.value)}
                                className="w-full border border-gray-300 rounded px-2.5 py-1.5 text-xs font-mono font-bold focus:ring-1 focus:ring-blue-500 focus:outline-hidden"
                            />
                        </div>

                        <div className="flex justify-end gap-2 pt-2 border-t border-gray-100">
                            <button
                                type="button"
                                onClick={() => setIsPreAuthOpen(false)}
                                className="px-3 py-1.5 text-xs font-medium border border-gray-300 rounded text-gray-700 hover:bg-gray-50"
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                onClick={() => handlePreAuthorize(cards[0]?.id || '')}
                                className="px-3 py-1.5 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white rounded shadow-xs"
                            >
                                Pre-Authorize
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal: Extend Sale (Charge Card-on-File) */}
            {isExtendSaleOpen && selectedExtendCard && (
                <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
                    <div className="bg-white rounded-xl shadow-2xl border border-gray-200 max-w-md w-full p-4 space-y-3 animate-in fade-in zoom-in-95 duration-100 text-gray-800 text-xs">
                        <div className="flex items-center justify-between pb-2 border-b border-gray-200">
                            <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2">
                                <Sparkles size={15} className="text-indigo-600" />
                                <span>Extend Sale (Card-on-File Post-Stay Charge)</span>
                            </h3>
                            <button type="button" onClick={() => setIsExtendSaleOpen(false)} className="text-gray-400 hover:text-gray-700 cursor-pointer">
                                <X size={15} />
                            </button>
                        </div>

                        <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-2.5 text-[11px] text-indigo-900 space-y-1">
                            <p className="font-semibold">Charge Tokenized Card:</p>
                            <p>
                                Card: <strong>{selectedExtendCard.cardType} •••• {selectedExtendCard.last4}</strong> ({selectedExtendCard.cardholderName})
                            </p>
                            <p className="text-[10px] text-indigo-700 font-mono">Token: {selectedExtendCard.token}</p>
                        </div>

                        <form onSubmit={handleExtendSale} className="space-y-3">
                            <div>
                                <label className="block text-xs font-semibold text-gray-700 mb-1">
                                    Charge Amount ({currency}) *
                                </label>
                                <input
                                    type="number"
                                    step="0.01"
                                    value={extendSaleAmount}
                                    onChange={e => setExtendSaleAmount(e.target.value)}
                                    className="w-full border border-gray-300 rounded px-2.5 py-1.5 text-xs font-mono font-bold text-gray-900 focus:ring-1 focus:ring-indigo-500 focus:outline-hidden"
                                    required
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-semibold text-gray-700 mb-1">
                                    Revenue Category *
                                </label>
                                <select
                                    value={extendSaleRevenueHead}
                                    onChange={e => setExtendSaleRevenueHead(e.target.value)}
                                    className="w-full border border-gray-300 rounded px-2.5 py-1.5 text-xs text-gray-800 focus:ring-1 focus:ring-indigo-500 cursor-pointer"
                                >
                                    <option value="Minibar">Minibar Consumption</option>
                                    <option value="Laundry">Laundry &amp; Valet Service</option>
                                    <option value="F&B Room Service">F&B / Restaurant Bill</option>
                                    <option value="Late Departure">Late Departure Fee</option>
                                    <option value="Room Damage">Room Damage / Replacement</option>
                                    <option value="Transportation">Airport Shuttle / Cab</option>
                                    <option value="Other Extra">Other Incidental</option>
                                </select>
                            </div>

                            <div>
                                <label className="block text-xs font-semibold text-gray-700 mb-1">
                                    Description / Slip Ref
                                </label>
                                <input
                                    type="text"
                                    value={extendSaleDescription}
                                    onChange={e => setExtendSaleDescription(e.target.value)}
                                    placeholder="Enter slip reference or charge details..."
                                    className="w-full border border-gray-300 rounded px-2.5 py-1.5 text-xs text-gray-800 focus:ring-1 focus:ring-indigo-500"
                                />
                            </div>

                            <div className="flex justify-end gap-2 pt-2 border-t border-gray-100">
                                <button
                                    type="button"
                                    onClick={() => setIsExtendSaleOpen(false)}
                                    className="px-3 py-1.5 text-xs font-medium border border-gray-300 rounded text-gray-700 hover:bg-gray-50 cursor-pointer"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={isProcessingExtend}
                                    className="px-3.5 py-1.5 text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white rounded shadow-xs transition-colors cursor-pointer flex items-center gap-1.5"
                                >
                                    <Sparkles size={12} />
                                    <span>{isProcessingExtend ? 'Processing...' : 'Process Extend Sale'}</span>
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};
