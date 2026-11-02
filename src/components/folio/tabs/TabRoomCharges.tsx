import React, { useMemo } from 'react';
import { DoorClosed, RefreshCw } from 'lucide-react';
import { getCurrencySymbol } from '../../../utils/currencyUtils';
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

    const totalCharges = roomChargesList.reduce((sum, item) => sum + item.charge, 0);
    const totalTaxVat = roomChargesList.reduce((sum, item) => sum + item.taxVat, 0);
    const netBalance = totalCharges + totalTaxVat;

    return (
        <div className="w-full flex gap-3 h-full select-none text-gray-800 text-xs py-1 min-h-0 overflow-y-auto">
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
            <div className="flex-1 flex flex-col justify-between min-w-0 space-y-3">
                <div className="space-y-2">
                    <div className="flex items-center justify-between">
                        <button
                            type="button"
                            onClick={onRefresh}
                            className="bg-white hover:bg-gray-50 text-gray-700 border border-gray-300 rounded px-3 py-1 text-xs font-semibold shadow-xs transition-colors cursor-pointer flex items-center gap-1.5"
                        >
                            <RefreshCw size={12} className="text-gray-400" />
                            <span>Update Details</span>
                        </button>
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
                                    <tr key={row.id} className="hover:bg-gray-50/70">
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
                <div className="flex items-center justify-end pt-2 pb-1 border-t border-gray-100">
                    <div className="flex items-center gap-2">
                        <span className="text-xs uppercase font-bold text-gray-600 tracking-wide font-sans">Net Balance</span>
                        <span className="text-base font-black text-rose-600 font-mono tracking-tight">
                            {currency} {netBalance.toFixed(2)}
                        </span>
                    </div>
                </div>
            </div>
        </div>
    );
};
