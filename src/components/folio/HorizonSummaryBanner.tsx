import React, { useState } from 'react';
import {
    Calendar,
    Moon,
    Users,
    BedDouble,
    Printer,
    Edit3,
    ChevronDown,
    Send,
    FileSpreadsheet,
    FileText,
    LogOut,
    CreditCard,
    ArrowRightLeft,
    Scissors,
    Percent
} from 'lucide-react';
import type { FolioData, FolioSubTab } from './folioTypes';

interface HorizonSummaryBannerProps {
    folio: FolioData | null;
    activeTab: FolioSubTab;
    onSelectTab: (tab: FolioSubTab) => void;
    onOpenAddPayment?: () => void;
    onOpenCheckOut?: () => void;
    onOpenAmendStay?: () => void;
    onOpenRoomMove?: () => void;
    onOpenSplitFolio?: () => void;
    onOpenTaxExemption?: () => void;
    onPrintFolio?: () => void;
    onEmailFolio?: () => void;
    onExportExcel?: () => void;
}

export const HorizonSummaryBanner: React.FC<HorizonSummaryBannerProps> = ({
    folio,
    activeTab,
    onSelectTab,
    onOpenAddPayment,
    onOpenCheckOut,
    onOpenAmendStay,
    onOpenRoomMove,
    onOpenSplitFolio,
    onOpenTaxExemption,
    onPrintFolio,
    onEmailFolio,
    onExportExcel
}) => {
    const [isPrintMenuOpen, setIsPrintMenuOpen] = useState(false);
    const [isMoreOptionsOpen, setIsMoreOptionsOpen] = useState(false);

    const firstRoom = folio?.rooms?.[0];
    const arrivalDate = firstRoom?.check_in_date || folio?.check_in || 'N/A';
    const departureDate = firstRoom?.check_out_date || folio?.check_out || 'N/A';
    const totalNights = firstRoom?.nights || (
        arrivalDate !== 'N/A' && departureDate !== 'N/A'
            ? Math.max(1, Math.round((new Date(departureDate).getTime() - new Date(arrivalDate).getTime()) / 86400000))
            : 1
    );

    const adultsCount = folio?.rooms?.reduce((acc, r) => acc + (r.adults || 1), 0) || 1;
    const childrenCount = folio?.rooms?.reduce((acc, r) => acc + (r.children || 0), 0) || 0;
    const roomNumbers = folio?.rooms?.map(r => r.room_number).filter(Boolean).join(', ') || folio?.room_number || 'Unassigned';
    const roomTypeName = firstRoom?.room_type || folio?.room_type || 'Standard Suite';
    const ratePlanName = folio?.market_code || 'Standard Rate Plan';

    return (
        <div className="w-full space-y-2 select-none">
            {/* Top Horizon Stat Cards */}
            <div className="bg-white border border-blue-100 rounded-xl p-2 shadow-xs grid grid-cols-12 gap-2 items-center">
                {/* Arrival */}
                <div className="col-span-2.5 flex items-center gap-2 border-r border-gray-100 pr-2">
                    <div className="w-7 h-7 rounded-lg bg-blue-50 border border-blue-200/80 text-blue-600 flex items-center justify-center flex-shrink-0">
                        <Calendar size={14} />
                    </div>
                    <div className="min-w-0">
                        <div className="text-[9px] uppercase tracking-wider font-semibold text-gray-400">Arrival</div>
                        <div className="text-xs font-bold text-gray-800 truncate font-mono">{arrivalDate}</div>
                    </div>
                </div>

                {/* Nights */}
                <div className="col-span-1.5 flex items-center gap-1.5 border-r border-gray-100 pr-2">
                    <div className="w-7 h-7 rounded-lg bg-indigo-50 border border-indigo-200/80 text-indigo-600 flex items-center justify-center flex-shrink-0">
                        <Moon size={14} />
                    </div>
                    <div className="min-w-0">
                        <div className="text-[9px] uppercase tracking-wider font-semibold text-gray-400">Nights</div>
                        <div className="text-xs font-bold text-gray-800 font-mono">{totalNights}</div>
                    </div>
                </div>

                {/* Departure */}
                <div className="col-span-2.5 flex items-center gap-2 border-r border-gray-100 pr-2">
                    <div className="w-7 h-7 rounded-lg bg-blue-50 border border-blue-200/80 text-blue-600 flex items-center justify-center flex-shrink-0">
                        <Calendar size={14} />
                    </div>
                    <div className="min-w-0">
                        <div className="text-[9px] uppercase tracking-wider font-semibold text-gray-400">Departure</div>
                        <div className="text-xs font-bold text-gray-800 truncate font-mono">{departureDate}</div>
                    </div>
                </div>

                {/* Guests */}
                <div className="col-span-2 flex items-center gap-2 border-r border-gray-100 pr-2">
                    <div className="w-7 h-7 rounded-lg bg-purple-50 border border-purple-200/80 text-purple-600 flex items-center justify-center flex-shrink-0">
                        <Users size={14} />
                    </div>
                    <div className="min-w-0">
                        <div className="text-[9px] uppercase tracking-wider font-semibold text-gray-400">Guests</div>
                        <div className="text-xs font-bold text-gray-800 flex items-center gap-1.5">
                            <span>{adultsCount} Adults</span>
                            {childrenCount > 0 && <span className="text-gray-500 font-normal">| {childrenCount} Ch</span>}
                        </div>
                    </div>
                </div>

                {/* Room Details & Actions */}
                <div className="col-span-3.5 flex items-center justify-between pl-1">
                    <div className="min-w-0 flex items-center gap-2">
                        <div className="w-7 h-7 rounded-lg bg-emerald-50 border border-emerald-200/80 text-emerald-600 flex items-center justify-center flex-shrink-0">
                            <BedDouble size={14} />
                        </div>
                        <div className="min-w-0">
                            <div className="text-[9px] uppercase tracking-wider font-semibold text-gray-400">Room Details</div>
                            <div className="text-[11px] font-bold text-gray-800 truncate flex items-center gap-1.5">
                                <span className="text-blue-700 bg-blue-50 px-1 py-0.2 rounded border border-blue-100">Room {roomNumbers}</span>
                                <span className="text-gray-600 truncate">{roomTypeName}</span>
                                <span className="text-gray-400 font-normal truncate">| {ratePlanName}</span>
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center gap-1 flex-shrink-0">
                        <button
                            type="button"
                            onClick={onPrintFolio}
                            title="Print Folio Document"
                            className="w-7 h-7 rounded-lg border border-gray-200 bg-gray-50 hover:bg-gray-100 text-gray-600 flex items-center justify-center transition-colors cursor-pointer"
                        >
                            <Printer size={13} />
                        </button>
                        <button
                            type="button"
                            onClick={onOpenAmendStay}
                            title="Edit Reservation (Amend Stay)"
                            className="w-7 h-7 rounded-lg border border-gray-200 bg-gray-50 hover:bg-gray-100 text-gray-600 flex items-center justify-center transition-colors cursor-pointer"
                        >
                            <Edit3 size={13} />
                        </button>
                    </div>
                </div>
            </div>

            {/* Sub-Tabs Navigation Bar + Print/Send & More Options Dropdowns */}
            <div className="flex items-center justify-between border-b border-gray-200/80 pb-0 px-1">
                {/* 5 Main Sub-Tabs */}
                <div className="flex items-center gap-6">
                    <button
                        type="button"
                        onClick={() => onSelectTab('operations')}
                        className={`text-xs pb-2 transition-all cursor-pointer font-medium relative ${
                            activeTab === 'operations'
                                ? 'text-blue-600 font-bold border-b-2 border-blue-600'
                                : 'text-gray-500 hover:text-gray-900'
                        }`}
                    >
                        Folio Operations
                    </button>

                    <button
                        type="button"
                        onClick={() => onSelectTab('booking')}
                        className={`text-xs pb-2 transition-all cursor-pointer font-medium relative ${
                            activeTab === 'booking'
                                ? 'text-blue-600 font-bold border-b-2 border-blue-600'
                                : 'text-gray-500 hover:text-gray-900'
                        }`}
                    >
                        Booking Details
                    </button>

                    <button
                        type="button"
                        onClick={() => onSelectTab('guest')}
                        className={`text-xs pb-2 transition-all cursor-pointer font-medium relative ${
                            activeTab === 'guest'
                                ? 'text-blue-600 font-bold border-b-2 border-blue-600'
                                : 'text-gray-500 hover:text-gray-900'
                        }`}
                    >
                        Guest Details
                    </button>

                    <button
                        type="button"
                        onClick={() => onSelectTab('charges')}
                        className={`text-xs pb-2 transition-all cursor-pointer font-medium relative ${
                            activeTab === 'charges'
                                ? 'text-blue-600 font-bold border-b-2 border-blue-600'
                                : 'text-gray-500 hover:text-gray-900'
                        }`}
                    >
                        Room Charges
                    </button>

                    <button
                        type="button"
                        onClick={() => onSelectTab('audit')}
                        className={`text-xs pb-2 transition-all cursor-pointer font-medium relative ${
                            activeTab === 'audit'
                                ? 'text-blue-600 font-bold border-b-2 border-blue-600'
                                : 'text-gray-500 hover:text-gray-900'
                        }`}
                    >
                        Audit Trail
                    </button>
                </div>

                {/* Right Action Menus: Print/Send & More Options */}
                <div className="flex items-center gap-2 pb-1.5">
                    {/* Print/Send Dropdown */}
                    <div className="relative">
                        <button
                            type="button"
                            onClick={() => {
                                setIsPrintMenuOpen(!isPrintMenuOpen);
                                setIsMoreOptionsOpen(false);
                            }}
                            className="bg-white hover:bg-gray-50 text-blue-700 border border-blue-200 text-xs font-semibold px-2.5 py-1 rounded-md flex items-center gap-1 shadow-xs transition-colors cursor-pointer"
                        >
                            <span>Print/ Send</span>
                            <ChevronDown size={12} className={`transition-transform duration-200 ${isPrintMenuOpen ? 'rotate-180' : ''}`} />
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

                    {/* More Options Dropdown */}
                    <div className="relative">
                        <button
                            type="button"
                            onClick={() => {
                                setIsMoreOptionsOpen(!isMoreOptionsOpen);
                                setIsPrintMenuOpen(false);
                            }}
                            className="bg-white hover:bg-gray-50 text-blue-700 border border-blue-200 text-xs font-semibold px-2.5 py-1 rounded-md flex items-center gap-1 shadow-xs transition-colors cursor-pointer"
                        >
                            <span>More Options</span>
                            <ChevronDown size={12} className={`transition-transform duration-200 ${isMoreOptionsOpen ? 'rotate-180' : ''}`} />
                        </button>

                        {isMoreOptionsOpen && (
                            <>
                                <div className="fixed inset-0 z-40" onClick={() => setIsMoreOptionsOpen(false)} />
                                <div className="absolute right-0 top-full mt-1 w-52 bg-white border border-gray-200 rounded-lg shadow-xl py-1 z-50 text-gray-800 animate-in fade-in zoom-in-95 duration-100">
                                    <button
                                        type="button"
                                        onClick={() => { setIsMoreOptionsOpen(false); if (onOpenCheckOut) onOpenCheckOut(); }}
                                        className="w-full text-left px-3 py-1.5 text-xs text-gray-700 hover:bg-blue-50 hover:text-blue-700 flex items-center gap-2 cursor-pointer"
                                    >
                                        <LogOut size={13} className="text-emerald-600" />
                                        <span>Check Out</span>
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => { setIsMoreOptionsOpen(false); if (onOpenAddPayment) onOpenAddPayment(); }}
                                        className="w-full text-left px-3 py-1.5 text-xs text-gray-700 hover:bg-blue-50 hover:text-blue-700 flex items-center gap-2 cursor-pointer"
                                    >
                                        <CreditCard size={13} className="text-blue-600" />
                                        <span>Add Payment</span>
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => { setIsMoreOptionsOpen(false); if (onOpenAmendStay) onOpenAmendStay(); }}
                                        className="w-full text-left px-3 py-1.5 text-xs text-gray-700 hover:bg-blue-50 hover:text-blue-700 flex items-center gap-2 cursor-pointer"
                                    >
                                        <Edit3 size={13} className="text-amber-600" />
                                        <span>Amend Stay</span>
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => { setIsMoreOptionsOpen(false); if (onOpenRoomMove) onOpenRoomMove(); }}
                                        className="w-full text-left px-3 py-1.5 text-xs text-gray-700 hover:bg-blue-50 hover:text-blue-700 flex items-center gap-2 cursor-pointer"
                                    >
                                        <ArrowRightLeft size={13} className="text-purple-600" />
                                        <span>Room Move</span>
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => { setIsMoreOptionsOpen(false); if (onOpenSplitFolio) onOpenSplitFolio(); }}
                                        className="w-full text-left px-3 py-1.5 text-xs text-gray-700 hover:bg-blue-50 hover:text-blue-700 flex items-center gap-2 cursor-pointer"
                                    >
                                        <Scissors size={13} className="text-indigo-600" />
                                        <span>Cut / Split Folio</span>
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => { setIsMoreOptionsOpen(false); if (onOpenTaxExemption) onOpenTaxExemption(); }}
                                        className="w-full text-left px-3 py-1.5 text-xs text-gray-700 hover:bg-blue-50 hover:text-blue-700 flex items-center gap-2 cursor-pointer"
                                    >
                                        <Percent size={13} className="text-teal-600" />
                                        <span>Tax Operation / Exemption</span>
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
