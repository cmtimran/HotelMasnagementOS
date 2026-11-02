import React, { useState, useMemo, useEffect } from 'react';
import { DoorClosed, RefreshCw, X, CheckCircle2 } from 'lucide-react';
import { getCurrencySymbol } from '../../../utils/currencyUtils';
import { getApiBaseUrl } from '../../../utils/apiUrl';
import { broadcastPMSEvent } from '../../../utils/roomInventoryEngine';
import type { FolioData } from '../folioTypes';
import type { AmendBookingData } from '../../modals/AmendStayModal';

interface TabRoomChargesProps {
    folio: FolioData | null;
    booking?: AmendBookingData | null;
    onRefresh: () => void;
}

export const TabRoomCharges: React.FC<TabRoomChargesProps> = ({
    folio,
    booking,
    onRefresh
}) => {
    const currency = useMemo(() => getCurrencySymbol(), []);
    const ratePlanCode = folio?.market_code || booking?.ratePlan || 'Standard Rate';
    const roomNumber = folio?.rooms?.[0]?.room_number || folio?.room_number || booking?.roomNumber || 'Unassigned';
    const roomTypeName = folio?.rooms?.[0]?.room_type || folio?.room_type || booking?.roomType || 'Standard Suite';
    const adults = (folio?.rooms?.[0]?.adults ?? booking?.adults) || 1;
    const children = (folio?.rooms?.[0]?.children ?? booking?.children) || 0;

    // Slide-out Drawer Modal State for "Update Details" matching Screenshot ba116327.png
    const [isUpdateModalOpen, setIsUpdateModalOpen] = useState(false);
    const [modalDate, setModalDate] = useState('');
    const [modalAdults, setModalAdults] = useState(adults);
    const [modalChildren, setModalChildren] = useState(children);
    const [isComplimentary, setIsComplimentary] = useState(false);
    const [modalCurrency, setModalCurrency] = useState('USD');
    const [modalRate, setModalRate] = useState('0');
    const [ratesInclusiveTax, setRatesInclusiveTax] = useState(false);
    const [scope, setScope] = useState<'SELECTED_DATES' | 'WHOLE_STAY'>('SELECTED_DATES');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [feedbackMsg, setFeedbackMsg] = useState('');
    const [errorMsg, setErrorMsg] = useState('');

    // Filter room tariff charges from ledger or calculate nights from stay dates
    const roomChargesList = useMemo(() => {
        const tariffCharges = folio?.charges?.filter(
            c => !c.is_voided && (c.charge_code === 'ROOM_CHG' || c.revenue_head === 'Room Charges' || c.revenue_head === 'Room Tariff')
        ) || [];

        const firstRoom = folio?.rooms?.[0];
        const defaultRate = Number(firstRoom?.room_rate ?? booking?.avgDailyRate ?? (booking?.totalAmount && booking?.nights ? booking.totalAmount / booking.nights : 0));

        if (tariffCharges.length > 0) {
            return tariffCharges.map(c => ({
                id: c.id,
                stayDate: c.charge_date,
                roomNumber: roomNumber,
                rateType: roomTypeName,
                pax: `${adults}/${children}`,
                charge: Number(c.amount ?? defaultRate),
                taxVat: Number(c.total_tax || 0),
                netAmount: Number(c.total_amount ?? c.amount ?? defaultRate)
            }));
        }

        // Dynamically compute nights from reservation room dates
        const checkIn = new Date(firstRoom?.check_in_date || folio?.check_in || booking?.arrivalDate || new Date().toISOString().split('T')[0]);
        const checkOut = new Date(firstRoom?.check_out_date || folio?.check_out || booking?.departureDate || new Date().toISOString().split('T')[0]);
        const nights = Math.max(1, Math.round((checkOut.getTime() - checkIn.getTime()) / 86400000));
        const dailyRate = defaultRate;

        const list = [];
        for (let i = 0; i < nights; i++) {
            const d = new Date(checkIn);
            d.setDate(d.getDate() + i);
            const dateStr = d.toISOString().split('T')[0];
            list.push({
                id: `calc-${i}`,
                stayDate: dateStr,
                roomNumber: roomNumber,
                rateType: roomTypeName,
                pax: `${adults}/${children}`,
                charge: dailyRate,
                taxVat: 0,
                netAmount: dailyRate
            });
        }
        return list;
    }, [folio?.charges, folio?.rooms, folio?.check_in, folio?.check_out, booking, roomNumber, roomTypeName, adults, children]);

    useEffect(() => {
        if (roomChargesList.length > 0 && !modalDate) {
            setModalDate(roomChargesList[0].stayDate);
            setModalRate(String(roomChargesList[0].charge));
        }
    }, [roomChargesList, modalDate]);

    const handleOpenUpdateDetails = (specificDate?: string, specificRate?: number) => {
        if (specificDate) {
            setModalDate(specificDate);
        } else if (roomChargesList.length > 0) {
            setModalDate(roomChargesList[0].stayDate);
        } else {
            setModalDate(new Date().toISOString().split('T')[0]);
        }

        if (specificRate !== undefined) {
            setModalRate(String(specificRate));
        } else if (roomChargesList.length > 0) {
            setModalRate(String(roomChargesList[0].charge));
        }

        setModalAdults(adults);
        setModalChildren(children);
        setIsComplimentary(false);
        setScope('SELECTED_DATES');
        setErrorMsg('');
        setIsUpdateModalOpen(true);
    };

    const handleApplyUpdateDetails = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!folio?.id) {
            setErrorMsg('No active folio found to update');
            return;
        }

        setIsSubmitting(true);
        setErrorMsg('');

        try {
            const numRate = parseFloat(modalRate) || 0;
            const res = await fetch(`${getApiBaseUrl()}/api/accounting/folios/${folio.id}/room-charges`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    stayDate: modalDate,
                    adults: modalAdults,
                    children: modalChildren,
                    isComplimentary,
                    currency: modalCurrency,
                    rate: isComplimentary ? 0 : numRate,
                    ratesInclusiveTax,
                    scope,
                    userName: 'Front Desk'
                })
            });

            const data = await res.json();
            if (data?.success) {
                setFeedbackMsg('Room charges updated successfully!');
                setIsUpdateModalOpen(false);
                onRefresh();
                broadcastPMSEvent({ type: 'FOLIO_UPDATED', folioId: folio.id });
                setTimeout(() => setFeedbackMsg(''), 4000);
            } else {
                setErrorMsg(data?.error || 'Failed to update room charges');
            }
        } catch (err: any) {
            setErrorMsg(err?.message || 'Network error while updating room charges');
        } finally {
            setIsSubmitting(false);
        }
    };

    const totalCharges = roomChargesList.reduce((sum, item) => sum + item.charge, 0);
    const totalTaxVat = roomChargesList.reduce((sum, item) => sum + item.taxVat, 0);
    const netBalance = totalCharges + totalTaxVat;

    return (
        <div className="relative w-full flex gap-3 h-full select-none text-gray-800 text-xs py-1 min-h-0 overflow-hidden">
            {/* LEFT SIDEBAR */}
            <div className="w-56 shrink-0 flex flex-col justify-between border-r border-gray-200/80 pr-3">
                <div className="space-y-2">
                    <div className="text-[10.5px] font-bold text-gray-400 uppercase tracking-wider">Rooms</div>

                    {/* Rate Group Accordion Header */}
                    <div className="bg-blue-50/60 border border-blue-100 rounded-lg p-2 text-blue-900 font-semibold text-xs">
                        <span>{ratePlanCode}</span>
                    </div>

                    {/* Room Pill */}
                    <div className="pl-2">
                        <div className="bg-blue-600 text-white rounded-lg p-2 font-bold text-xs flex items-center gap-2 shadow-xs">
                            <DoorClosed size={14} className="text-amber-300" />
                            <span>Room {roomNumber}</span>
                        </div>
                    </div>
                </div>

                {/* Sidebar Bottom Summary */}
                <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-2.5 space-y-1.5 font-mono text-xs">
                    <div className="flex items-center justify-between text-gray-500">
                        <span className="font-sans text-[11px]">Total Charges:</span>
                        <span className="font-semibold text-gray-800">{currency} {totalCharges.toFixed(2)}</span>
                    </div>
                    <div className="flex items-center justify-between text-gray-500">
                        <span className="font-sans text-[11px]">Total Tax + Vat:</span>
                        <span className="font-semibold text-gray-800">{currency} {totalTaxVat.toFixed(2)}</span>
                    </div>
                    <div className="flex items-center justify-between text-rose-600 font-bold border-t border-slate-200 pt-1.5 text-xs">
                        <span className="font-sans text-[11px]">Net Balance:</span>
                        <span>{currency} {netBalance.toFixed(2)}</span>
                    </div>
                </div>
            </div>

            {/* MAIN RIGHT: Update Details button & Night-by-night table */}
            <div className="flex-1 flex flex-col justify-between min-w-0 space-y-2.5 overflow-y-auto">
                <div className="space-y-2">
                    <div className="flex items-center justify-between">
                        <button
                            type="button"
                            onClick={() => handleOpenUpdateDetails()}
                            className="bg-white hover:bg-gray-50 text-gray-700 border border-gray-300 rounded px-3 py-1 text-xs font-semibold shadow-xs transition-colors cursor-pointer flex items-center gap-1.5"
                        >
                            <RefreshCw size={12} className="text-gray-400" />
                            <span>Update Details</span>
                        </button>

                        {feedbackMsg && (
                            <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 px-2.5 py-0.5 rounded text-[11px] font-semibold flex items-center gap-1">
                                <CheckCircle2 size={12} className="text-emerald-600" />
                                <span>{feedbackMsg}</span>
                            </div>
                        )}
                    </div>

                    <div className="border border-gray-200 rounded-lg overflow-hidden bg-white shadow-xs">
                        <table className="w-full text-left text-xs border-collapse">
                            <thead className="bg-gray-50 border-b border-gray-200 text-gray-600 font-semibold text-[11px]">
                                <tr>
                                    <th className="py-2 px-3">Stay</th>
                                    <th className="py-2 px-2.5">Room</th>
                                    <th className="py-2 px-3">Rate Type</th>
                                    <th className="py-2 px-2.5 text-center">Pax (A/C)</th>
                                    <th className="py-2 px-3 text-right">Charge</th>
                                    <th className="py-2 px-3 text-right">Tax + Vat</th>
                                    <th className="py-2 px-3 text-right">Net Amount</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100 font-mono text-[11px]">
                                {roomChargesList.map((row) => (
                                    <tr
                                        key={row.id}
                                        onClick={() => handleOpenUpdateDetails(row.stayDate, row.charge)}
                                        className="hover:bg-blue-50/50 cursor-pointer transition-colors"
                                        title="Click to edit rate for this date"
                                    >
                                        <td className="py-2 px-3 font-semibold text-gray-800">{row.stayDate}</td>
                                        <td className="py-2 px-2.5 font-bold text-blue-700">{row.roomNumber}</td>
                                        <td className="py-2 px-3 font-sans font-medium text-gray-700">{row.rateType}</td>
                                        <td className="py-2 px-2.5 text-center text-gray-600">{row.pax}</td>
                                        <td className="py-2 px-3 text-right font-medium text-gray-800">{row.charge.toFixed(2)}</td>
                                        <td className="py-2 px-3 text-right text-gray-500">{row.taxVat.toFixed(2)}</td>
                                        <td className="py-2 px-3 text-right font-bold text-rose-600">{row.netAmount.toFixed(2)}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Bottom Right Net Balance */}
                <div className="flex items-center justify-end pt-2 pb-1 border-t border-gray-100 flex-shrink-0">
                    <div className="flex items-center gap-2">
                        <span className="text-xs uppercase font-bold text-gray-600 tracking-wide font-sans">Net Balance</span>
                        <span className="text-base font-black text-rose-600 font-mono tracking-tight">
                            {currency} {netBalance.toFixed(2)}
                        </span>
                    </div>
                </div>
            </div>

            {/* Slide-out Drawer Panel: Update Details matching Screenshot ba116327.png */}
            {isUpdateModalOpen && (
                <>
                    <div
                        className="fixed inset-0 z-[100004] bg-black/20 backdrop-blur-2xs transition-opacity"
                        onClick={() => setIsUpdateModalOpen(false)}
                    />
                    <div className="fixed inset-y-0 right-0 w-80 bg-white shadow-2xl z-[100005] flex flex-col border-l border-gray-200 animate-in slide-in-from-right duration-200 text-gray-800 text-xs">
                        {/* Header matching Screenshot ba116327.png */}
                        <div className="bg-[#1e3a8a] text-white px-4 py-2.5 flex items-center justify-between flex-shrink-0 shadow-xs">
                            <h3 className="text-xs font-bold tracking-wide">Update Details</h3>
                            <button
                                type="button"
                                onClick={() => setIsUpdateModalOpen(false)}
                                className="text-white/80 hover:text-white transition-colors cursor-pointer"
                            >
                                <X size={15} />
                            </button>
                        </div>

                        {errorMsg && (
                            <div className="bg-rose-50 border-b border-rose-200 text-rose-700 px-4 py-2 text-[11px]">
                                {errorMsg}
                            </div>
                        )}

                        {/* Body Form matching Screenshot ba116327.png */}
                        <form onSubmit={handleApplyUpdateDetails} className="flex-1 overflow-y-auto p-4 space-y-3.5">
                            {/* Date */}
                            <div>
                                <label className="block text-[11px] font-medium text-gray-700 mb-1">Date</label>
                                <input
                                    type="date"
                                    value={modalDate}
                                    onChange={(e) => setModalDate(e.target.value)}
                                    className="w-full bg-white border border-gray-300 rounded px-2.5 py-1.5 text-xs text-gray-800 focus:ring-1 focus:ring-blue-500 font-mono"
                                />
                            </div>

                            {/* Adults & Children */}
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-[11px] font-medium text-gray-700 mb-1">Adults</label>
                                    <input
                                        type="number"
                                        min={1}
                                        value={modalAdults}
                                        onChange={(e) => setModalAdults(parseInt(e.target.value, 10) || 1)}
                                        className="w-full bg-white border border-gray-300 rounded px-2.5 py-1.5 text-xs text-gray-800 focus:ring-1 focus:ring-blue-500 font-mono"
                                    />
                                </div>
                                <div>
                                    <label className="block text-[11px] font-medium text-gray-700 mb-1">Children</label>
                                    <input
                                        type="number"
                                        min={0}
                                        value={modalChildren}
                                        onChange={(e) => setModalChildren(parseInt(e.target.value, 10) || 0)}
                                        className="w-full bg-white border border-gray-300 rounded px-2.5 py-1.5 text-xs text-gray-800 focus:ring-1 focus:ring-blue-500 font-mono"
                                    />
                                </div>
                            </div>

                            {/* Complimentary Room */}
                            <label className="flex items-center gap-2 cursor-pointer select-none text-xs text-gray-700 font-normal">
                                <input
                                    type="checkbox"
                                    checked={isComplimentary}
                                    onChange={(e) => {
                                        setIsComplimentary(e.target.checked);
                                        if (e.target.checked) setModalRate('0');
                                    }}
                                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 w-3.5 h-3.5"
                                />
                                <span>Complimentary Room</span>
                            </label>

                            {/* Currency & Rate */}
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-[11px] font-medium text-gray-700 mb-1">Currency</label>
                                    <select
                                        value={modalCurrency}
                                        onChange={(e) => setModalCurrency(e.target.value)}
                                        className="w-full bg-white border border-gray-300 rounded px-2.5 py-1.5 text-xs text-gray-800 focus:ring-1 focus:ring-blue-500"
                                    >
                                        <option value="USD">USD</option>
                                        <option value="BDT">BDT</option>
                                        <option value="EUR">EUR</option>
                                        <option value="GBP">GBP</option>
                                        <option value="INR">INR</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-[11px] font-medium text-gray-700 mb-1">Rate</label>
                                    <input
                                        type="number"
                                        step="any"
                                        disabled={isComplimentary}
                                        value={modalRate}
                                        onChange={(e) => setModalRate(e.target.value)}
                                        className="w-full bg-white border border-gray-300 rounded px-2.5 py-1.5 text-xs text-gray-800 focus:ring-1 focus:ring-blue-500 font-mono disabled:bg-gray-100 disabled:text-gray-400"
                                    />
                                </div>
                            </div>

                            {/* Rates Inclusive Tax */}
                            <label className="flex items-center gap-2 cursor-pointer select-none text-xs text-gray-700 font-normal">
                                <input
                                    type="checkbox"
                                    checked={ratesInclusiveTax}
                                    onChange={(e) => setRatesInclusiveTax(e.target.checked)}
                                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 w-3.5 h-3.5"
                                />
                                <span>Rates Inclusive Tax</span>
                            </label>

                            {/* Application Scope */}
                            <div className="space-y-1.5 pt-1">
                                <label className="block text-[11px] font-semibold text-gray-700">Application Scope</label>
                                <div className="space-y-1.5 pl-0.5">
                                    <label className="flex items-center gap-2 cursor-pointer select-none text-xs text-gray-700">
                                        <input
                                            type="radio"
                                            name="applicationScope"
                                            value="SELECTED_DATES"
                                            checked={scope === 'SELECTED_DATES'}
                                            onChange={() => setScope('SELECTED_DATES')}
                                            className="text-blue-600 focus:ring-blue-500 w-3.5 h-3.5"
                                        />
                                        <span>Apply on Selected Dates</span>
                                    </label>
                                    <label className="flex items-center gap-2 cursor-pointer select-none text-xs text-gray-700">
                                        <input
                                            type="radio"
                                            name="applicationScope"
                                            value="WHOLE_STAY"
                                            checked={scope === 'WHOLE_STAY'}
                                            onChange={() => setScope('WHOLE_STAY')}
                                            className="text-blue-600 focus:ring-blue-500 w-3.5 h-3.5"
                                        />
                                        <span>Apply on whole stay</span>
                                    </label>
                                </div>
                            </div>
                        </form>

                        {/* Footer Action matching Screenshot ba116327.png */}
                        <div className="p-3 border-t border-gray-200 flex items-center justify-end bg-white flex-shrink-0">
                            <button
                                type="button"
                                disabled={isSubmitting}
                                onClick={handleApplyUpdateDetails}
                                className="px-6 py-1.5 rounded-md bg-[#1e3a8a] hover:bg-blue-900 text-white font-semibold text-xs shadow-xs transition-colors cursor-pointer disabled:opacity-50"
                            >
                                {isSubmitting ? 'Applying...' : 'Apply'}
                            </button>
                        </div>
                    </div>
                </>
            )}
        </div>
    );
};
