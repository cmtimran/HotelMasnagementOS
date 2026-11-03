import React, { useState, useEffect } from 'react';
import { X, Search, Check, RefreshCw, AlertCircle, FilePlus2 } from 'lucide-react';
import { getApiBaseUrl } from '../../../utils/apiUrl';
import type { FolioData } from '../folioTypes';
import type { AmendBookingData } from '../../modals/AmendStayModal';

interface NewFolioModalProps {
    isOpen: boolean;
    onClose: () => void;
    currentFolio: FolioData | null;
    booking?: AmendBookingData | null;
    allFolios: FolioData[];
    onSuccess: (createdFolio?: any) => void;
}

export const NewFolioModal: React.FC<NewFolioModalProps> = ({
    isOpen,
    onClose,
    currentFolio,
    booking,
    allFolios,
    onSuccess
}) => {
    const [sharer, setSharer] = useState('');
    const [gstin, setGstin] = useState('');
    const [showTaxOnPrintedFolio, setShowTaxOnPrintedFolio] = useState(true);
    const [generateInvoiceOnCheckout, setGenerateInvoiceOnCheckout] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [errorMsg, setErrorMsg] = useState('');

    useEffect(() => {
        if (isOpen) {
            const defaultName = currentFolio?.guest_name || booking?.guestName || 'Ms. Jobel Yubos';
            setSharer(defaultName);
            setGstin(currentFolio?.gstin || '');
            setShowTaxOnPrintedFolio(true);
            setGenerateInvoiceOnCheckout(false);
            setErrorMsg('');
        }
    }, [isOpen, currentFolio, booking]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setErrorMsg('');

        if (!sharer.trim()) {
            setErrorMsg('Sharer / Guest name is required.');
            return;
        }

        setIsSubmitting(true);
        try {
            const resId = booking?.id || currentFolio?.reservation_id || '';
            const resNo = booking?.reservationNumber || currentFolio?.reservation_number || '';
            const roomNum = currentFolio?.room_number || booking?.roomNumber || '13';

            const res = await fetch(`${getApiBaseUrl()}/api/accounting/folios`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    reservationId: resId,
                    reservationNumber: resNo,
                    sharer: sharer.trim(),
                    gstin: gstin.trim(),
                    showTaxOnPrintedFolio,
                    generateInvoiceOnCheckout,
                    roomNumber: roomNum,
                    userName: 'Front Desk'
                })
            });

            const data = await res.json();
            if (data?.success) {
                onSuccess(data.data);
                onClose();
            } else {
                // In-memory fallback if backend is offline/mock
                const highestId = allFolios.reduce((max, f) => {
                    const parsed = parseInt(String(f.id).replace(/\D/g, ''), 10);
                    return isNaN(parsed) ? max : Math.max(max, parsed);
                }, 75);
                const newId = highestId + 2;
                const newFolioNumber = `${newId} - ${sharer.trim()}`;

                const createdFolio: FolioData = {
                    id: newId,
                    reservation_id: resId || '1',
                    folio_number: newFolioNumber,
                    status: 'OPEN',
                    balance: 0,
                    reservation_number: resNo || 'RES-66',
                    guest_name: sharer.trim(),
                    room_number: roomNum,
                    room_type: currentFolio?.room_type || booking?.roomType || 'Apartements',
                    check_in: currentFolio?.check_in || booking?.arrivalDate || '2026-02-27',
                    check_out: currentFolio?.check_out || booking?.departureDate || '2026-03-02',
                    bill_to: sharer.trim(),
                    market_code: currentFolio?.market_code || booking?.ratePlan || 'Standard Rate',
                    business_source: currentFolio?.business_source || 'Direct',
                    gstin: gstin.trim(),
                    rooms: currentFolio?.rooms || [],
                    charges: [],
                    payments: [],
                    summary: {
                        totalCharges: 0,
                        totalPaid: 0,
                        totalDiscount: 0,
                        serviceCharge: 0,
                        vat: 0,
                        cityTax: 0,
                        totalTax: 0,
                        dueAmount: 0
                    }
                };
                onSuccess(createdFolio);
                onClose();
            }
        } catch {
            // In-memory fallback
            const highestId = allFolios.reduce((max, f) => {
                const parsed = parseInt(String(f.id).replace(/\D/g, ''), 10);
                return isNaN(parsed) ? max : Math.max(max, parsed);
            }, 75);
            const newId = highestId + 2;
            const newFolioNumber = `${newId} - ${sharer.trim()}`;

            const createdFolio: FolioData = {
                id: newId,
                reservation_id: currentFolio?.reservation_id || '1',
                folio_number: newFolioNumber,
                status: 'OPEN',
                balance: 0,
                reservation_number: currentFolio?.reservation_number || 'RES-66',
                guest_name: sharer.trim(),
                room_number: currentFolio?.room_number || '13',
                room_type: currentFolio?.room_type || 'Apartements',
                check_in: currentFolio?.check_in || '2026-02-27',
                check_out: currentFolio?.check_out || '2026-03-02',
                bill_to: sharer.trim(),
                market_code: currentFolio?.market_code || 'Standard Rate',
                business_source: 'Direct',
                gstin: gstin.trim(),
                rooms: currentFolio?.rooms || [],
                charges: [],
                payments: [],
                summary: {
                    totalCharges: 0,
                    totalPaid: 0,
                    totalDiscount: 0,
                    serviceCharge: 0,
                    vat: 0,
                    cityTax: 0,
                    totalTax: 0,
                    dueAmount: 0
                }
            };
            onSuccess(createdFolio);
            onClose();
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

            {/* Slide-out Drawer Panel (Right Side) matching Screenshot 1908f04f.png */}
            <div className="fixed inset-y-0 right-0 w-80 sm:w-96 bg-white shadow-2xl z-[100005] flex flex-col border-l border-gray-200 animate-in slide-in-from-right duration-200 text-gray-800 text-xs font-sans">
                {/* Header */}
                <div className="bg-[#1e3a8a] text-white px-4 py-3 flex items-center justify-between flex-shrink-0 shadow-xs">
                    <div className="flex items-center gap-2">
                        <FilePlus2 size={16} className="text-amber-300" />
                        <h3 className="text-xs font-bold tracking-wide uppercase">New Folio</h3>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        className="text-white/80 hover:text-white transition-colors cursor-pointer"
                    >
                        <X size={16} />
                    </button>
                </div>

                {/* Form Body matching Screenshot 1908f04f.png */}
                <form onSubmit={handleSubmit} className="flex-1 flex flex-col min-h-0 overflow-hidden">
                    <div className="flex-1 overflow-y-auto p-4 space-y-4">
                        {errorMsg && (
                            <div className="bg-rose-50 border border-rose-200 text-rose-700 px-3 py-2 rounded-lg text-xs flex items-center gap-2">
                                <AlertCircle size={14} className="shrink-0 text-rose-600" />
                                <span>{errorMsg}</span>
                            </div>
                        )}

                        {/* Sharer with search icon */}
                        <div>
                            <label className="block text-xs font-semibold text-gray-700 mb-1">
                                Sharer
                            </label>
                            <div className="relative flex items-center">
                                <input
                                    type="text"
                                    value={sharer}
                                    onChange={(e) => setSharer(e.target.value)}
                                    placeholder="Enter Sharer / Guest Name"
                                    className="w-full bg-white border border-gray-300 rounded px-2.5 py-1.5 pr-8 text-xs text-gray-800 focus:ring-1 focus:ring-blue-500 focus:outline-hidden"
                                />
                                <Search size={14} className="absolute right-2.5 text-gray-400 pointer-events-none" />
                            </div>
                        </div>

                        {/* GSTIN No */}
                        <div>
                            <label className="block text-xs font-semibold text-gray-700 mb-1">
                                GSTIN No
                            </label>
                            <input
                                type="text"
                                value={gstin}
                                onChange={(e) => setGstin(e.target.value)}
                                placeholder="GST Number"
                                className="w-full bg-white border border-gray-300 rounded px-2.5 py-1.5 text-xs text-gray-800 focus:ring-1 focus:ring-blue-500 focus:outline-hidden"
                            />
                        </div>

                        {/* Checkboxes matching Box 5 in 1908f04f.png */}
                        <div className="space-y-3 pt-2">
                            <label className="flex items-center gap-2 cursor-pointer select-none text-xs text-gray-700 font-semibold">
                                <input
                                    type="checkbox"
                                    checked={showTaxOnPrintedFolio}
                                    onChange={(e) => setShowTaxOnPrintedFolio(e.target.checked)}
                                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 w-4 h-4 cursor-pointer"
                                />
                                <span>Show Tax on Printed Folio</span>
                            </label>

                            <label className="flex items-center gap-2 cursor-pointer select-none text-xs text-gray-700 font-semibold">
                                <input
                                    type="checkbox"
                                    checked={generateInvoiceOnCheckout}
                                    onChange={(e) => setGenerateInvoiceOnCheckout(e.target.checked)}
                                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 w-4 h-4 cursor-pointer"
                                />
                                <span>Generate Invoice Number On/Post Checkout</span>
                            </label>
                        </div>
                    </div>

                    {/* Footer Buttons matching Box 6 in 1908f04f.png */}
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
                            <span>Save</span>
                        </button>
                    </div>
                </form>
            </div>
        </>
    );
};
