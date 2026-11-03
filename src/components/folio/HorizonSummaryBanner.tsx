import React, { useState } from 'react';
import {
    Calendar,
    Moon,
    Users,
    BedDouble,
    Printer,
    ChevronDown,
    Send,
    FileSpreadsheet,
    FileText
} from 'lucide-react';
import type { FolioData, FolioSubTab } from './folioTypes';
import type { AmendBookingData } from '../modals/AmendStayModal';

interface HorizonSummaryBannerProps {
    folio: FolioData | null;
    booking?: AmendBookingData | null;
    activeTab: FolioSubTab;
    onSelectTab: (tab: FolioSubTab) => void;
    onPrintFolio?: () => void;
    onEmailFolio?: () => void;
    onExportExcel?: () => void;
    isLoading?: boolean;
}

export const HorizonSummaryBanner: React.FC<HorizonSummaryBannerProps> = ({
    folio,
    booking,
    activeTab,
    onSelectTab,
    onPrintFolio,
    onEmailFolio,
    onExportExcel,
    isLoading
}) => {
    const [isPrintMenuOpen, setIsPrintMenuOpen] = useState(false);

    const firstRoom = folio?.rooms?.[0];
    const rawArrival = firstRoom?.check_in_date || folio?.check_in || booking?.arrivalDate || '';
    const rawDeparture = firstRoom?.check_out_date || folio?.check_out || booking?.departureDate || '';

    const formatDateDisplay = (dateStr?: string) => {
        if (!dateStr || dateStr === 'N/A' || dateStr === '') return 'N/A';
        try {
            const parts = dateStr.split('-');
            if (parts.length === 3) {
                const year = parts[0];
                const monthIdx = parseInt(parts[1], 10) - 1;
                const day = parts[2];
                const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
                if (monthIdx >= 0 && monthIdx < 12) {
                    return `${day} ${months[monthIdx]} ${year}`;
                }
            }
            const d = new Date(dateStr);
            if (!isNaN(d.getTime())) {
                return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
            }
        } catch {
            // fallback
        }
        return dateStr;
    };

    const arrivalDisplay = formatDateDisplay(rawArrival);
    const departureDisplay = formatDateDisplay(rawDeparture);

    const totalNights = firstRoom?.nights || booking?.nights || (
        rawArrival && rawDeparture && rawArrival !== 'N/A' && rawDeparture !== 'N/A'
            ? Math.max(1, Math.round((new Date(rawDeparture).getTime() - new Date(rawArrival).getTime()) / 86400000))
            : 1
    );

    const adultsCount = (folio?.rooms?.[0]?.adults ?? booking?.adults) || 1;
    const childrenCount = (folio?.rooms?.[0]?.children ?? booking?.children) || 0;
    const roomNumbers = folio?.rooms?.map(r => r.room_number).filter(Boolean).join(', ') || folio?.room_number || booking?.roomNumber || 'Unassigned';
    const roomTypeName = firstRoom?.room_type || folio?.room_type || booking?.roomType || 'Standard Suite';
    const ratePlanName = folio?.market_code || booking?.ratePlan || 'Standard Rate Plan';

    return (
        <div className="w-full space-y-1.5 select-none">
            {/* Top Horizon Stat Cards: Ultra-Compact PMS Horizon Row */}
            <div className="bg-white border border-slate-200/90 rounded-lg px-2.5 py-1 shadow-2xs flex items-center justify-between text-xs min-h-[38px]">
                {/* Left Metrics Strip */}
                <div className="flex items-center divide-x divide-slate-100 flex-1 min-w-0">
                    {/* Arrival */}
                    <div className="flex items-center gap-1.5 pr-3 flex-shrink-0">
                        <div className="w-5 h-5 rounded bg-blue-50 border border-blue-200/60 text-blue-600 flex items-center justify-center flex-shrink-0">
                            <Calendar size={12} />
                        </div>
                        <div className="min-w-0">
                            <div className="text-[9px] uppercase tracking-wider font-semibold text-slate-400 leading-none">Arrival</div>
                            <div className="text-[11px] font-bold text-slate-800 leading-tight mt-0.5 font-mono">{arrivalDisplay}</div>
                        </div>
                    </div>

                    {/* Nights */}
                    <div className="flex items-center gap-1.5 px-3 flex-shrink-0">
                        <div className="w-5 h-5 rounded bg-indigo-50 border border-indigo-200/60 text-indigo-600 flex items-center justify-center flex-shrink-0">
                            <Moon size={12} />
                        </div>
                        <div className="min-w-0">
                            <div className="text-[9px] uppercase tracking-wider font-semibold text-slate-400 leading-none">Nights</div>
                            <div className="text-[11px] font-bold text-slate-800 leading-tight mt-0.5 text-center font-mono">{totalNights}</div>
                        </div>
                    </div>

                    {/* Departure */}
                    <div className="flex items-center gap-1.5 px-3 flex-shrink-0">
                        <div className="w-5 h-5 rounded bg-blue-50 border border-blue-200/60 text-blue-600 flex items-center justify-center flex-shrink-0">
                            <Calendar size={12} />
                        </div>
                        <div className="min-w-0">
                            <div className="text-[9px] uppercase tracking-wider font-semibold text-slate-400 leading-none">Departure</div>
                            <div className="text-[11px] font-bold text-slate-800 leading-tight mt-0.5 font-mono">{departureDisplay}</div>
                        </div>
                    </div>

                    {/* Guests */}
                    <div className="flex items-center gap-1.5 px-3 flex-shrink-0">
                        <div className="w-5 h-5 rounded bg-purple-50 border border-purple-200/60 text-purple-600 flex items-center justify-center flex-shrink-0">
                            <Users size={12} />
                        </div>
                        <div className="min-w-0">
                            <div className="text-[9px] uppercase tracking-wider font-semibold text-slate-400 leading-none">Guests</div>
                            <div className="text-[11px] font-bold text-slate-800 leading-tight flex items-center gap-1 mt-0.5">
                                <span>{adultsCount} Adult{adultsCount !== 1 ? 's' : ''}</span>
                                {childrenCount > 0 && (
                                    <span className="text-purple-700 bg-purple-50 border border-purple-100 px-1 rounded text-[10px] font-semibold">
                                        {childrenCount} Child{childrenCount !== 1 ? 'ren' : ''}
                                    </span>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Room Details & Rate Badges */}
                    <div className="flex items-center gap-1.5 pl-3 min-w-0 flex-1 overflow-hidden">
                        <span className="text-[9px] uppercase tracking-wider font-semibold text-slate-400 mr-0.5 flex-shrink-0">Room Details</span>

                        <div className="flex items-center gap-1.5 overflow-hidden flex-nowrap">
                            {/* Rate Plan Badge */}
                            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium bg-slate-100 text-slate-700 border border-slate-200/80 shrink-0">
                                <FileText size={10} className="text-slate-500" />
                                <span className="truncate max-w-[120px]">{ratePlanName}</span>
                            </span>

                            {/* Room Type Badge */}
                            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-200/70 shrink-0">
                                <span className="font-bold text-[9px] text-emerald-600">$</span>
                                <span className="truncate max-w-[120px]">{roomTypeName}</span>
                            </span>

                            {/* Room Number Badge */}
                            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-200/80 shrink-0">
                                <BedDouble size={10} className="text-amber-700" />
                                <span>{roomNumbers}</span>
                            </span>
                        </div>
                    </div>
                </div>

                {/* Live Syncing Indicator */}
                {isLoading && (
                    <div className="flex items-center gap-1 pl-2 flex-shrink-0 border-l border-slate-100 ml-2">
                        <span className="text-[9.5px] text-blue-600 font-medium flex items-center gap-1 animate-pulse">
                            <span className="w-1.5 h-1.5 rounded-full bg-blue-600"></span>
                            <span className="hidden sm:inline">Syncing</span>
                        </span>
                    </div>
                )}
            </div>

            {/* Sub-Tabs Navigation Bar + Print/Send Dropdown */}
            <div className="flex items-center justify-between border-b border-slate-200/80 px-0.5 pt-0.5">
                {/* 5 Main Sub-Tabs */}
                <div className="flex items-center gap-4 sm:gap-5">
                    {[
                        { id: 'operations', label: 'Folio Operations' },
                        { id: 'booking', label: 'Booking Details' },
                        { id: 'guest', label: 'Guest Details' },
                        { id: 'charges', label: 'Room Charges' },
                        { id: 'credit_card', label: 'Credit Card' },
                        { id: 'audit', label: 'Audit Trail' },
                    ].map(tab => (
                        <button
                            key={tab.id}
                            type="button"
                            onClick={() => onSelectTab(tab.id as FolioSubTab)}
                            className={`text-[11px] pb-1.5 transition-all cursor-pointer font-medium relative ${
                                activeTab === tab.id
                                    ? 'text-blue-600 font-bold border-b-2 border-blue-600 -mb-[1px]'
                                    : 'text-slate-500 hover:text-slate-900'
                            }`}
                        >
                            {tab.label}
                        </button>
                    ))}
                </div>

                {/* Right Action Menu: Print/Send */}
                <div className="flex items-center gap-1.5 pb-1">
                    {/* Print/Send Dropdown */}
                    <div className="relative">
                        <button
                            type="button"
                            onClick={() => setIsPrintMenuOpen(!isPrintMenuOpen)}
                            className="bg-white hover:bg-slate-50 text-blue-700 border border-blue-200 text-[11px] font-semibold px-2 py-0.5 rounded flex items-center gap-1 shadow-2xs transition-colors cursor-pointer"
                        >
                            <span>Print/ Send</span>
                            <ChevronDown size={11} className={`transition-transform duration-200 ${isPrintMenuOpen ? 'rotate-180' : ''}`} />
                        </button>

                        {isPrintMenuOpen && (
                            <>
                                <div className="fixed inset-0 z-40" onClick={() => setIsPrintMenuOpen(false)} />
                                <div className="absolute right-0 top-full mt-1 w-48 bg-white border border-gray-200 rounded-lg shadow-xl py-1 z-50 text-gray-800 animate-in fade-in zoom-in-95 duration-100">
                                    <button
                                        type="button"
                                        onClick={() => { setIsPrintMenuOpen(false); if (onPrintFolio) onPrintFolio(); }}
                                        className="w-full text-left px-3 py-1.5 text-xs text-gray-700 hover:bg-blue-50 hover:text-blue-700 flex items-center gap-2 cursor-pointer"
                                    >
                                        <Printer size={13} className="text-gray-400" />
                                        <span>Print Folio Invoice</span>
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => { setIsPrintMenuOpen(false); if (onEmailFolio) onEmailFolio(); }}
                                        className="w-full text-left px-3 py-1.5 text-xs text-gray-700 hover:bg-blue-50 hover:text-blue-700 flex items-center gap-2 cursor-pointer"
                                    >
                                        <Send size={13} className="text-gray-400" />
                                        <span>Email Folio to Guest / TA</span>
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => { setIsPrintMenuOpen(false); if (onExportExcel) onExportExcel(); }}
                                        className="w-full text-left px-3 py-1.5 text-xs text-gray-700 hover:bg-blue-50 hover:text-blue-700 flex items-center gap-2 cursor-pointer"
                                    >
                                        <FileSpreadsheet size={13} className="text-gray-400" />
                                        <span>Export Excel (CSV)</span>
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => { setIsPrintMenuOpen(false); if (onPrintFolio) onPrintFolio(); }}
                                        className="w-full text-left px-3 py-1.5 text-xs text-gray-700 hover:bg-blue-50 hover:text-blue-700 flex items-center gap-2 cursor-pointer"
                                    >
                                        <FileText size={13} className="text-gray-400" />
                                        <span>Print Extra Charges Voucher</span>
                                    </button>
                                </div>
                            </>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};
