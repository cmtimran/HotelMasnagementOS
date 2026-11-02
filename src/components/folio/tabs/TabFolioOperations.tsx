import React, { useState, useMemo } from 'react';
import {
    ChevronDown,
    Plus,
    Minus,
    Crown,
    DoorClosed,
    Eye,
    Scissors,
    ArrowRightLeft,
    Sliders
} from 'lucide-react';
import { getCurrencySymbol } from '../../../utils/currencyUtils';
import type { FolioData } from '../folioTypes';

interface TabFolioOperationsProps {
    folio: FolioData | null;
    allFolios: FolioData[];
    activeFolioId: number | string;
    onSelectFolio: (id: number | string) => void;
    onOpenAddCharge: () => void;
    onOpenAddDiscount: () => void;
    onOpenAdjustments: () => void;
    onOpenTransfer: () => void;
    onOpenSplitFolio: () => void;
    onOpenVoid: (type: 'charge' | 'payment', id: number | string, desc: string, amt: number) => void;
}

export const TabFolioOperations: React.FC<TabFolioOperationsProps> = ({
    folio,
    allFolios,
    activeFolioId,
    onSelectFolio,
    onOpenAddCharge,
    onOpenAddDiscount,
    onOpenAdjustments,
    onOpenTransfer,
    onOpenSplitFolio,
    onOpenVoid
}) => {
    const currency = useMemo(() => getCurrencySymbol(), []);
    const [isMoreDropdownOpen, setIsMoreDropdownOpen] = useState(false);
    const [expandedRowIds, setExpandedRowIds] = useState<Array<number | string>>([]);
    const [selectedItemIds, setSelectedItemIds] = useState<Array<number | string>>([]);

    const toggleRowExpand = (id: number | string) => {
        setExpandedRowIds(prev =>
            prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
        );
    };

    const toggleSelectItem = (id: number | string) => {
        setSelectedItemIds(prev =>
            prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
        );
    };

    // Grouping rooms and folios for tree view
    const roomNumber = folio?.rooms?.[0]?.room_number || folio?.room_number || '505';
    const ratePlanCode = folio?.market_code || 'WRP';

    const nonVoidedCharges = folio?.charges?.filter(c => !c.is_voided) || [];
    const totalCharges = folio?.summary?.totalCharges ?? nonVoidedCharges.reduce((sum, c) => sum + Number(c.total_amount || c.amount || 0), 0);
    const totalPaid = folio?.summary?.totalPaid ?? (folio?.payments?.reduce((sum, p) => sum + Number(p.amount || 0), 0) || 0);
    const totalDiscount = folio?.summary?.totalDiscount ?? nonVoidedCharges.reduce((sum, c) => sum + Number(c.discount_amount || 0), 0);
    const dueAmount = folio?.summary?.dueAmount ?? Math.max(0, totalCharges - totalPaid);

    // Merge charges and payments into chronological ledger items
    const ledgerItems = useMemo(() => {
        const list: Array<{
            id: number | string;
            type: 'charge' | 'payment';
            date: string;
            refNo: string;
            revenueHead: string;
            description: string;
            user: string;
            status: string;
            amount: number;
            isVoided: boolean;
            discountAmount: number;
            serviceCharge: number;
            vat: number;
            cityTax: number;
            totalTax: number;
            totalAmount: number;
            rawItem: any;
        }> = [];

        folio?.charges?.forEach((c) => {
            list.push({
                id: c.id,
                type: 'charge',
                date: c.charge_date,
                refNo: c.ref_no || String(c.id),
                revenueHead: c.revenue_head || 'Room Charges',
                description: c.description || 'Charge',
                user: c.user_name || 'Front Desk',
                status: c.status || (c.is_voided ? 'Voided' : 'Posted'),
                amount: Number(c.total_amount || c.amount || 0),
                isVoided: Boolean(c.is_voided),
                discountAmount: Number(c.discount_amount || 0),
                serviceCharge: Number(c.service_charge || 0),
                vat: Number(c.vat || 0),
                cityTax: Number(c.city_tax || 0),
                totalTax: Number(c.total_tax || 0),
                totalAmount: Number(c.total_amount || c.amount || 0),
                rawItem: c
            });
        });

        folio?.payments?.forEach((p) => {
            list.push({
                id: p.id,
                type: 'payment',
                date: p.transaction_date ? p.transaction_date.split('T')[0] : '2026-07-01',
                refNo: p.payment_number || String(p.id),
                revenueHead: p.payment_method || 'Payment',
                description: `Payment (${p.payment_method || 'Cash'})`,
                user: 'Front Desk',
                status: p.status || 'Settled',
                amount: Number(p.amount || 0),
                isVoided: false,
                discountAmount: 0,
                serviceCharge: 0,
                vat: 0,
                cityTax: 0,
                totalTax: 0,
                totalAmount: Number(p.amount || 0),
                rawItem: p
            });
        });

        return list.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    }, [folio?.charges, folio?.payments]);

    return (
        <div className="w-full flex gap-3 h-full min-h-[460px] select-none text-gray-800">
            {/* LEFT SIDEBAR: Room / Folio Hierarchical Tree & Balance Summary */}
            <div className="w-56 shrink-0 flex flex-col justify-between border-r border-gray-200/80 pr-3">
                {/* Tree View matching ff92009c.png */}
                <div className="space-y-1 text-xs">
                    <div className="text-[10.5px] font-bold text-gray-400 uppercase tracking-wider mb-2">
                        Room/ Folio
                    </div>

                    {/* Rate Group Accordion Header */}
                    <div className="bg-blue-50/60 border border-blue-100 rounded-lg p-2 text-blue-900 font-semibold flex items-center justify-between shadow-2xs">
                        <span className="font-bold">{ratePlanCode}</span>
                        <ChevronDown size={14} className="text-blue-500" />
                    </div>

                    {/* Room Level Sub-header */}
                    <div className="pl-2 pt-1 space-y-1">
                        <div className="text-gray-700 font-medium text-[11px] flex items-center justify-between py-1 px-1.5 rounded hover:bg-gray-50">
                            <div className="flex items-center gap-1.5">
                                <DoorClosed size={13} className="text-gray-500" />
                                <span>{roomNumber} ({allFolios.length} folio{allFolios.length > 1 ? 's' : ''})</span>
                            </div>
                            <ChevronDown size={12} className="text-gray-400" />
                        </div>

                        {/* Folio Pills (Active & Inactive) */}
                        <div className="space-y-1 pl-2">
                            {allFolios.map((f) => {
                                const isActive = String(f.id) === String(activeFolioId);
                                return (
                                    <button
                                        key={f.id}
                                        type="button"
                                        onClick={() => onSelectFolio(f.id)}
                                        className={`w-full text-left py-1.5 px-2 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer shadow-xs ${
                                            isActive
                                                ? 'bg-blue-600 text-white font-bold'
                                                : 'bg-white hover:bg-blue-50/70 border border-gray-200 text-gray-700'
                                        }`}
                                    >
                                        <Crown size={12} className={isActive ? 'text-amber-300' : 'text-gray-400'} />
                                        <span className="truncate">{f.folio_number}</span>
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                </div>

                {/* Sidebar Bottom Summary Card matching ff92009c.png */}
                <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-2.5 space-y-1.5 font-mono text-xs">
                    <div className="flex items-center justify-between text-gray-500">
                        <span className="font-sans text-[11px]">Total Charges:</span>
                        <span className="font-semibold text-gray-800">{currency} {totalCharges.toFixed(2)}</span>
                    </div>
                    <div className="flex items-center justify-between text-emerald-700">
                        <span className="font-sans text-[11px]">Total Paid:</span>
                        <span className="font-semibold">{currency} {totalPaid.toFixed(2)}</span>
                    </div>
                    <div className="flex items-center justify-between text-blue-700">
                        <span className="font-sans text-[11px]">Total Discount:</span>
                        <span className="font-semibold">{currency} {totalDiscount.toFixed(2)}</span>
                    </div>
                    <div className="flex items-center justify-between text-rose-600 font-bold border-t border-slate-200 pt-1.5 text-xs">
                        <span className="font-sans text-[11px]">Due Amount:</span>
                        <span>{currency} {dueAmount.toFixed(2)}</span>
                    </div>
                </div>
            </div>

            {/* RIGHT MAIN: Action Bar + Transaction Ledger Grid */}
            <div className="flex-1 flex flex-col justify-between min-w-0">
                <div className="space-y-2">
                    {/* Action Bar matching ff92009c.png */}
                    <div className="flex items-center gap-2">
                        <button
                            type="button"
                            onClick={onOpenAddCharge}
                            className="bg-white hover:bg-gray-50 text-gray-700 border border-gray-300 rounded px-3 py-1 text-xs font-semibold shadow-xs transition-colors cursor-pointer"
                        >
                            Add Charges
                        </button>

                        <button
                            type="button"
                            onClick={onOpenAddDiscount}
                            className="bg-white hover:bg-gray-50 text-gray-700 border border-gray-300 rounded px-3 py-1 text-xs font-semibold shadow-xs transition-colors cursor-pointer"
                        >
                            Add Discount
                        </button>

                        {/* More Actions Dropdown (Adjustments, Transfer, Split Folio) */}
                        <div className="relative">
                            <button
                                type="button"
                                onClick={() => setIsMoreDropdownOpen(!isMoreDropdownOpen)}
                                className="bg-white hover:bg-gray-50 text-gray-700 border border-gray-300 rounded px-3 py-1 text-xs font-semibold shadow-xs transition-colors cursor-pointer flex items-center gap-1"
                            >
                                <span>More</span>
                                <ChevronDown size={11} className={`transition-transform duration-200 ${isMoreDropdownOpen ? 'rotate-180' : ''}`} />
                            </button>

                            {isMoreDropdownOpen && (
                                <>
                                    <div className="fixed inset-0 z-40" onClick={() => setIsMoreDropdownOpen(false)} />
                                    <div className="absolute left-0 top-full mt-1 w-44 bg-white border border-gray-200 rounded-lg shadow-xl py-1 z-50 text-gray-800 animate-in fade-in zoom-in-95 duration-100">
                                        <button
                                            type="button"
                                            onClick={() => { setIsMoreDropdownOpen(false); onOpenAdjustments(); }}
                                            className="w-full text-left px-3 py-1.5 text-xs text-gray-700 hover:bg-blue-50 hover:text-blue-700 flex items-center gap-2 cursor-pointer"
                                        >
                                            <Sliders size={13} className="text-gray-400" />
                                            <span>Adjustments</span>
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => { setIsMoreDropdownOpen(false); onOpenTransfer(); }}
                                            className="w-full text-left px-3 py-1.5 text-xs text-gray-700 hover:bg-blue-50 hover:text-blue-700 flex items-center gap-2 cursor-pointer"
                                        >
                                            <ArrowRightLeft size={13} className="text-gray-400" />
                                            <span>Transfer</span>
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => { setIsMoreDropdownOpen(false); onOpenSplitFolio(); }}
                                            className="w-full text-left px-3 py-1.5 text-xs text-gray-700 hover:bg-blue-50 hover:text-blue-700 flex items-center gap-2 cursor-pointer"
                                        >
                                            <Scissors size={13} className="text-gray-400" />
                                            <span>Split Folio</span>
                                        </button>
                                    </div>
                                </>
                            )}
                        </div>

                        <button
                            type="button"
                            disabled={selectedItemIds.length === 0}
                            onClick={() => {
                                const firstSelected = ledgerItems.find(i => selectedItemIds.includes(i.id));
                                if (firstSelected) {
                                    onOpenVoid(firstSelected.type, firstSelected.id, firstSelected.description, firstSelected.amount);
                                }
                            }}
                            className="bg-white hover:bg-rose-50 text-gray-500 hover:text-rose-600 border border-gray-300 disabled:opacity-40 rounded px-3 py-1 text-xs font-semibold shadow-xs transition-colors cursor-pointer disabled:cursor-not-allowed"
                        >
                            Void Charge
                        </button>
                    </div>

                    {/* Transaction Ledger Table matching ff92009c.png */}
                    <div className="border border-gray-200/90 rounded-lg overflow-hidden bg-white shadow-xs">
                        <table className="w-full text-left text-xs border-collapse">
                            <thead className="bg-gray-50/90 border-b border-gray-200 text-gray-600 font-semibold text-[11px]">
                                <tr>
                                    <th className="py-2 px-2 w-8 text-center"></th>
                                    <th className="py-2 px-2.5">Date</th>
                                    <th className="py-2 px-2">Ref No.</th>
                                    <th className="py-2 px-2.5">Revenue Head</th>
                                    <th className="py-2 px-3">Description</th>
                                    <th className="py-2 px-2.5">User</th>
                                    <th className="py-2 px-2">Status</th>
                                    <th className="py-2 px-2.5 text-right">Amount</th>
                                    <th className="py-2 px-2 text-center w-10">Receipt</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {ledgerItems.length === 0 ? (
                                    <tr>
                                        <td colSpan={9} className="py-12 text-center text-gray-400">
                                            No charges or payments recorded yet for this folio.
                                        </td>
                                    </tr>
                                ) : (
                                    ledgerItems.map((item) => {
                                        const isExpanded = expandedRowIds.includes(item.id);
                                        const isChecked = selectedItemIds.includes(item.id);

                                        return (
                                            <React.Fragment key={`${item.type}-${item.id}`}>
                                                <tr className={`hover:bg-gray-50/80 transition-colors ${isChecked ? 'bg-blue-50/40' : ''}`}>
                                                    {/* Expand + / - and Checkbox */}
                                                    <td className="py-1.5 px-2 text-center">
                                                        <div className="flex items-center gap-1.5">
                                                            {item.type === 'charge' ? (
                                                                <button
                                                                    type="button"
                                                                    onClick={() => toggleRowExpand(item.id)}
                                                                    className="w-4 h-4 rounded text-gray-500 hover:text-blue-600 hover:bg-blue-50 flex items-center justify-center font-bold text-xs cursor-pointer"
                                                                >
                                                                    {isExpanded ? <Minus size={11} /> : <Plus size={11} />}
                                                                </button>
                                                            ) : (
                                                                <span className="w-4" />
                                                            )}
                                                            <input
                                                                type="checkbox"
                                                                checked={isChecked}
                                                                onChange={() => toggleSelectItem(item.id)}
                                                                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 w-3 h-3"
                                                            />
                                                        </div>
                                                    </td>

                                                    <td className="py-1.5 px-2.5 font-mono text-[11px] text-gray-600">{item.date}</td>
                                                    <td className="py-1.5 px-2 font-mono text-[11px] text-gray-700">{item.refNo}</td>
                                                    <td className="py-1.5 px-2.5 font-medium text-gray-800">{item.revenueHead}</td>
                                                    <td className="py-1.5 px-3 text-gray-700 truncate max-w-[200px]">{item.description}</td>
                                                    <td className="py-1.5 px-2.5 text-gray-600 text-[11px]">{item.user}</td>
                                                    <td className="py-1.5 px-2">
                                                        {item.status === 'Posted' && (
                                                            <span className="bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-semibold px-1.5 py-0.2 rounded">
                                                                Posted
                                                            </span>
                                                        )}
                                                        {item.status === 'Voided' && (
                                                            <span className="bg-rose-50 text-rose-700 border border-rose-200 text-[10px] font-semibold px-1.5 py-0.2 rounded">
                                                                Voided
                                                            </span>
                                                        )}
                                                        {item.status !== 'Posted' && item.status !== 'Voided' && (
                                                            <span className="text-gray-400 font-mono">-</span>
                                                        )}
                                                    </td>
                                                    <td className={`py-1.5 px-2.5 text-right font-mono font-bold text-xs ${
                                                        item.type === 'payment' || item.amount < 0
                                                            ? 'text-emerald-600'
                                                            : 'text-rose-600'
                                                    }`}>
                                                        {Math.abs(item.amount).toFixed(2)}
                                                    </td>
                                                    <td className="py-1.5 px-2 text-center">
                                                        {item.type === 'payment' ? (
                                                            <button
                                                                type="button"
                                                                title="View Payment Receipt"
                                                                className="text-blue-600 hover:text-blue-800 cursor-pointer inline-flex items-center justify-center"
                                                            >
                                                                <Eye size={13} />
                                                            </button>
                                                        ) : (
                                                            <span className="text-gray-300">-</span>
                                                        )}
                                                    </td>
                                                </tr>

                                                {/* Expanded Tax Breakdown Accordion Row matching ff92009c.png */}
                                                {isExpanded && item.type === 'charge' && (
                                                    <tr className="bg-blue-50/20 border-b border-blue-100/80">
                                                        <td colSpan={9} className="px-8 py-2.5 text-xs font-mono">
                                                            <div className="bg-white border border-blue-200/80 rounded-lg p-2.5 space-y-1.5 shadow-2xs max-w-xl">
                                                                {item.discountAmount > 0 && (
                                                                    <div className="flex items-center justify-between text-gray-600 text-[11px]">
                                                                        <span>Discount Amount:</span>
                                                                        <span>{item.discountAmount.toFixed(2)}</span>
                                                                    </div>
                                                                )}
                                                                <div className="flex items-center justify-between text-gray-500 text-[11px]">
                                                                    <span>(+) Service Charge (10%):</span>
                                                                    <span>{item.serviceCharge.toFixed(2)}</span>
                                                                </div>
                                                                <div className="flex items-center justify-between text-gray-500 text-[11px]">
                                                                    <span>(+) VAT (15%):</span>
                                                                    <span>{item.vat.toFixed(2)}</span>
                                                                </div>
                                                                <div className="flex items-center justify-between text-gray-500 text-[11px]">
                                                                    <span>(+) CITY TAX (1%):</span>
                                                                    <span>{item.cityTax.toFixed(2)}</span>
                                                                </div>
                                                                <div className="flex items-center justify-between text-gray-700 font-semibold text-[11px] border-t border-gray-100 pt-1">
                                                                    <span>Total Tax:</span>
                                                                    <span>{item.totalTax.toFixed(2)}</span>
                                                                </div>
                                                                <div className="flex items-center justify-between text-blue-700 font-bold border-t border-blue-100 pt-1 text-xs">
                                                                    <span>GRAND TOTAL (NET AMOUNT):</span>
                                                                    <span>{currency} {item.totalAmount.toFixed(2)}</span>
                                                                </div>
                                                            </div>
                                                        </td>
                                                    </tr>
                                                )}
                                            </React.Fragment>
                                        );
                                    })
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Bottom Right Net Due Amount Footer matching ff92009c.png */}
                <div className="flex items-center justify-end pt-3 pb-1">
                    <div className="flex items-center gap-2">
                        <span className="text-xs uppercase font-bold text-gray-600 tracking-wide">Net Due Amount</span>
                        <span className="text-base font-black text-rose-600 font-mono tracking-tight">
                            {currency} {dueAmount.toFixed(2)}
                        </span>
                    </div>
                </div>
            </div>
        </div>
    );
};
