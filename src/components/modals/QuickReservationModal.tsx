import React, { useState } from 'react';
import {
    X,
    BedDouble,
    Check,
    Clock
} from 'lucide-react';

export interface QuickReservationModalProps {
    isOpen: boolean;
    onClose: () => void;
    roomInfo?: {
        room: string;
        startDate: string;
        endDate: string;
        nights: number;
        startIndex?: number;
        endIndex?: number;
    };
    onReserve?: (booking: { room: string; startIndex: number; endIndex: number; guestName: string; status: string }) => void;
}

export const QuickReservationModal: React.FC<QuickReservationModalProps> = ({
    isOpen,
    onClose,
    roomInfo,
    onReserve
}) => {
    const [activeTab, setActiveTab] = useState<'reservation' | 'payment'>('reservation');

    const [guestName, setGuestName] = useState('');
    const [phone, setPhone] = useState('');
    const [businessSource, setBusinessSource] = useState('Direct Walk-In');
    const [isDayUse, setIsDayUse] = useState(false);
    const [taxApplicable, setTaxApplicable] = useState(true);

    const [dailyRate, setDailyRate] = useState(3500);
    const [discountBDT, setDiscountBDT] = useState(0);
    const [paymentMethod, setPaymentMethod] = useState<'Cash' | 'Card' | 'bKash' | 'Bank'>('Cash');
    const [paidAmount, setPaidAmount] = useState(0);

    if (!isOpen) return null;

    const nights = roomInfo?.nights || 1;
    const grossTotal = dailyRate * nights;
    const netTotal = grossTotal - discountBDT;
    const balanceDue = Math.max(0, netTotal - paidAmount);

    const handleConfirm = (status: 'confirmed' | 'hold' | 'in-house') => {
        const finalName = guestName.trim() || 'Express Walk-In Guest';

        const newReservation = {
            id: Date.now(),
            reservationNumber: `RES-${Date.now().toString().slice(-6)}`,
            guestName: finalName,
            phone: phone || 'N/A',
            roomNumber: roomInfo?.room || '101',
            roomType: 'Deluxe Room',
            checkIn: roomInfo?.startDate || new Date().toISOString().split('T')[0],
            checkOut: roomInfo?.endDate || new Date(Date.now() + 86400000).toISOString().split('T')[0],
            nights,
            adults: 2,
            children: 0,
            status,
            totalAmount: netTotal,
            paidAmount: status === 'hold' ? 0 : paidAmount,
            dueAmount: status === 'hold' ? netTotal : balanceDue,
            source: businessSource,
            createdAt: new Date().toISOString()
        };

        try {
            const existing = localStorage.getItem('hotel_reservations_v2');
            const list = existing ? JSON.parse(existing) : [];
            list.unshift(newReservation);
            localStorage.setItem('hotel_reservations_v2', JSON.stringify(list));
        } catch (e) {
            console.error('Failed to save quick reservation', e);
        }

        if (onReserve && roomInfo?.startIndex !== undefined && roomInfo?.endIndex !== undefined) {
            onReserve({
                room: roomInfo.room,
                startIndex: roomInfo.startIndex,
                endIndex: roomInfo.endIndex,
                guestName: finalName,
                status
            });
        }
        onClose();
    };

    return (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-3 md:p-6 overflow-y-auto">
            <div className="bg-white rounded-2xl max-w-2xl w-full border border-gray-200 shadow-2xl overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-150">
                {/* Header */}
                <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between bg-gradient-to-r from-blue-800 to-indigo-900 text-white">
                    <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center">
                            <BedDouble size={18} />
                        </div>
                        <div>
                            <h3 className="text-sm md:text-base font-bold">Quick Reservation (Room {roomInfo?.room || 'Selected'})</h3>
                            <p className="text-[11px] text-blue-200">
                                {roomInfo?.startDate} → {roomInfo?.endDate} ({nights} Night{nights > 1 ? 's' : ''})
                            </p>
                        </div>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        className="p-1 rounded-lg text-white/70 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
                    >
                        <X size={18} />
                    </button>
                </div>

                {/* Tabs */}
                <div className="bg-gray-50 border-b border-gray-200 px-5 flex items-center gap-4 text-xs font-semibold">
                    <button
                        type="button"
                        onClick={() => setActiveTab('reservation')}
                        className={`py-3 border-b-2 transition-colors cursor-pointer ${activeTab === 'reservation' ? 'border-blue-600 text-blue-700 font-bold' : 'border-transparent text-gray-500 hover:text-gray-800'}`}
                    >
                        Reservation & Room Details
                    </button>
                    <button
                        type="button"
                        onClick={() => setActiveTab('payment')}
                        className={`py-3 border-b-2 transition-colors cursor-pointer ${activeTab === 'payment' ? 'border-blue-600 text-blue-700 font-bold' : 'border-transparent text-gray-500 hover:text-gray-800'}`}
                    >
                        Payment & Folio Deposit
                    </button>
                </div>

                {/* Body */}
                <div className="p-5 overflow-y-auto max-h-[65vh] text-xs space-y-4">
                    {activeTab === 'reservation' && (
                        <div className="space-y-4">
                            <div className="flex items-center gap-4 pt-1">
                                <label className="flex items-center gap-2 cursor-pointer font-medium text-gray-700">
                                    <input
                                        type="checkbox"
                                        checked={isDayUse}
                                        onChange={e => setIsDayUse(e.target.checked)}
                                        className="rounded text-blue-600 focus:ring-blue-500"
                                    />
                                    <span>Day Use Only</span>
                                </label>
                                <label className="flex items-center gap-2 cursor-pointer font-medium text-gray-700">
                                    <input
                                        type="checkbox"
                                        checked={taxApplicable}
                                        onChange={e => setTaxApplicable(e.target.checked)}
                                        className="rounded text-blue-600 focus:ring-blue-500"
                                    />
                                    <span>Apply Standard Tax (15% VAT)</span>
                                </label>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                <div className="space-y-1">
                                    <label className="font-semibold text-gray-700">Guest Full Name *</label>
                                    <input
                                        type="text"
                                        required
                                        value={guestName}
                                        onChange={e => setGuestName(e.target.value)}
                                        placeholder="e.g. Mahfuzur Rahman"
                                        className="w-full h-8 px-2.5 border border-gray-200 rounded-lg outline-none font-medium"
                                    />
                                </div>
                                <div className="space-y-1">
                                    <label className="font-semibold text-gray-700">Phone Number</label>
                                    <input
                                        type="text"
                                        value={phone}
                                        onChange={e => setPhone(e.target.value)}
                                        placeholder="+880 1711-xxxxxx"
                                        className="w-full h-8 px-2.5 border border-gray-200 rounded-lg outline-none font-mono"
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-3 gap-3">
                                <div className="space-y-1">
                                    <label className="font-semibold text-gray-700">Assigned Room</label>
                                    <input
                                        type="text"
                                        readOnly
                                        value={roomInfo?.room || '101'}
                                        className="w-full h-8 px-2.5 bg-gray-50 border border-gray-200 rounded-lg font-mono font-bold text-blue-700"
                                    />
                                </div>
                                <div className="space-y-1">
                                    <label className="font-semibold text-gray-700">Night Tariff (BDT ৳)</label>
                                    <input
                                        type="number"
                                        min={0}
                                        value={dailyRate}
                                        onChange={e => setDailyRate(Number(e.target.value))}
                                        className="w-full h-8 px-2.5 border border-gray-200 rounded-lg outline-none font-bold text-gray-900"
                                    />
                                </div>
                                <div className="space-y-1">
                                    <label className="font-semibold text-gray-700">Business Source</label>
                                    <select
                                        value={businessSource}
                                        onChange={e => setBusinessSource(e.target.value)}
                                        className="w-full h-8 px-2 border border-gray-200 rounded-lg bg-white outline-none font-medium"
                                    >
                                        <option value="Direct Walk-In">Direct Walk-In</option>
                                        <option value="OTA Booking">Online Travel Agency (OTA)</option>
                                        <option value="Corporate">Corporate Contract</option>
                                    </select>
                                </div>
                            </div>

                            <div className="p-3 bg-blue-50/70 border border-blue-200 rounded-xl flex items-center justify-between">
                                <div>
                                    <span className="text-gray-500 font-medium">Estimated Gross Folio Tariff:</span>
                                    <div className="text-sm font-bold text-gray-900">
                                        ৳ {grossTotal.toLocaleString()} ({nights} Nights × ৳{dailyRate.toLocaleString()})
                                    </div>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => setActiveTab('payment')}
                                    className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold"
                                >
                                    Proceed to Payment →
                                </button>
                            </div>
                        </div>
                    )}

                    {activeTab === 'payment' && (
                        <div className="space-y-4">
                            <div className="grid grid-cols-3 gap-3">
                                <div className="space-y-1">
                                    <label className="font-semibold text-gray-700">Payment Gateway / Mode</label>
                                    <select
                                        value={paymentMethod}
                                        onChange={e => setPaymentMethod(e.target.value as any)}
                                        className="w-full h-8 px-2.5 border border-gray-200 rounded-lg outline-none bg-white font-medium"
                                    >
                                        <option value="Cash">Cash at Desk</option>
                                        <option value="Card">Credit / Debit Card POS</option>
                                        <option value="bKash">bKash Merchant Pay</option>
                                        <option value="Bank">Bank Wire Transfer</option>
                                    </select>
                                </div>
                                <div className="space-y-1">
                                    <label className="font-semibold text-gray-700">Discount (BDT ৳)</label>
                                    <input
                                        type="number"
                                        min={0}
                                        value={discountBDT}
                                        onChange={e => setDiscountBDT(Number(e.target.value))}
                                        className="w-full h-8 px-2.5 border border-gray-200 rounded-lg outline-none font-bold text-rose-600 text-sm"
                                    />
                                </div>
                                <div className="space-y-1">
                                    <label className="font-semibold text-gray-700">Deposit Amount Paid (BDT ৳)</label>
                                    <input
                                        type="number"
                                        min={0}
                                        value={paidAmount}
                                        onChange={e => setPaidAmount(Number(e.target.value))}
                                        className="w-full h-8 px-2.5 border border-gray-200 rounded-lg outline-none font-bold text-emerald-700 text-sm"
                                    />
                                </div>
                            </div>

                            <div className="flex items-center gap-2">
                                <button
                                    type="button"
                                    onClick={() => setPaidAmount(netTotal)}
                                    className="h-7 px-2.5 text-xs font-semibold bg-blue-50 text-blue-700 hover:bg-blue-100 rounded border border-blue-200"
                                >
                                    Pay Full (৳{netTotal.toLocaleString()})
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setPaidAmount(Math.round(netTotal / 2))}
                                    className="h-7 px-2.5 text-xs font-semibold bg-gray-100 text-gray-700 hover:bg-gray-200 rounded"
                                >
                                    Pay 50% Deposit
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setPaidAmount(0)}
                                    className="h-7 px-2.5 text-xs font-semibold bg-gray-100 text-gray-600 hover:bg-gray-200 rounded"
                                >
                                    Zero Deposit
                                </button>
                            </div>

                            {/* Summary Box */}
                            <div className="bg-gray-50 p-4 rounded-xl border border-gray-200 space-y-2 text-xs">
                                <div className="flex justify-between text-gray-600">
                                    <span>Total Rate:</span>
                                    <span className="font-bold text-gray-900">৳ {grossTotal.toLocaleString()}</span>
                                </div>
                                <div className="flex justify-between text-gray-600">
                                    <span>Discount / Rebate:</span>
                                    <span>- ৳ {discountBDT.toLocaleString()}</span>
                                </div>
                                <div className="flex justify-between text-gray-600">
                                    <span>Deposit Paid:</span>
                                    <span className="font-semibold text-emerald-700">৳ {paidAmount.toLocaleString()}</span>
                                </div>
                                <div className="flex justify-between text-gray-900 font-bold pt-2 border-t border-gray-200 text-sm">
                                    <span>Remaining Balance Due:</span>
                                    <span className="text-rose-600">৳ {balanceDue.toLocaleString()}</span>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer Actions */}
                <div className="px-5 py-3.5 border-t border-gray-100 flex items-center justify-between bg-gray-50/80">
                    <button
                        type="button"
                        onClick={() => handleConfirm('hold')}
                        className="h-8 px-3 border border-amber-300 bg-amber-50 text-amber-800 hover:bg-amber-100 rounded-lg text-xs font-bold flex items-center gap-1 cursor-pointer"
                    >
                        <Clock size={13} />
                        <span>Hold Till</span>
                    </button>

                    <div className="flex items-center gap-2">
                        <button
                            type="button"
                            onClick={() => handleConfirm('confirmed')}
                            className="h-8 px-4 bg-blue-700 hover:bg-blue-800 text-white rounded-lg text-xs font-bold shadow-2xs cursor-pointer"
                        >
                            Confirm Reservation
                        </button>
                        <button
                            type="button"
                            onClick={() => handleConfirm('in-house')}
                            className="h-8 px-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold shadow-2xs flex items-center gap-1 cursor-pointer"
                        >
                            <Check size={14} />
                            <span>Instant Check-In</span>
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default QuickReservationModal;
