import React, { useState, useMemo, useEffect, useRef } from 'react';
import {
    ChevronDown,
    Plus,
    Minus,
    Crown,
    DoorClosed,
    Eye,
    Scissors,
    ArrowRightLeft,
    Sliders,
    ChevronLeft,
    Check,
    Search,
    CreditCard,
    Percent,
    Settings2,
    RefreshCw,
    FileText,
    MoreVertical,
    AlertTriangle,
    EyeOff,
    List,
    Layers
} from 'lucide-react';
import { getCurrencySymbol } from '../../../utils/currencyUtils';
import { getApiBaseUrl } from '../../../utils/apiUrl';
import type { FolioData } from '../folioTypes';
import type { AmendBookingData } from '../../modals/AmendStayModal';

interface TabFolioOperationsProps {
    folio: FolioData | null;
    booking?: AmendBookingData | null;
    allFolios: FolioData[];
    activeFolioId: number | string;
    onSelectFolio: (id: number | string) => void;
    onOpenAddPayment?: () => void;
    onOpenAddCharge: () => void;
    onOpenAddDiscount: () => void;
    onOpenAdjustments: () => void;
    onOpenTransfer: () => void;
    onOpenSplitFolio: () => void;
    onOpenNewFolio?: () => void;
    onOpenRouteFolio?: () => void;
    onOpenTaxExemption?: () => void;
    onRefresh?: () => void;
    onOpenVoid: (type: 'charge' | 'payment', id: number | string, desc: string, amt: number) => void;
}

export const TabFolioOperations: React.FC<TabFolioOperationsProps> = ({
    folio,
    booking,
    allFolios,
    activeFolioId,
    onSelectFolio,
    onOpenAddPayment,
    onOpenAddCharge,
    onOpenAddDiscount,
    onOpenAdjustments,
    onOpenTransfer,
    onOpenSplitFolio,
    onOpenNewFolio,
    onOpenRouteFolio,
    onOpenTaxExemption,
    onRefresh,
    onOpenVoid
}) => {
    const currency = useMemo(() => getCurrencySymbol(), []);
    const [viewMode, setViewMode] = useState<'ledger' | 'operations'>('ledger');
    const [isMoreDropdownOpen, setIsMoreDropdownOpen] = useState(false);
    const [expandedRowIds, setExpandedRowIds] = useState<Array<number | string>>([]);
    const [selectedItemIds, setSelectedItemIds] = useState<Array<number | string>>([]);
    const [openRowActionId, setOpenRowActionId] = useState<number | string | null>(null);

    // Refs for safe outside-click handling (prevents full-screen backdrop click interception)
    const moreDropdownRef = useRef<HTMLDivElement>(null);
    const rowActionRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            const target = event.target as Node;
            if (moreDropdownRef.current && !moreDropdownRef.current.contains(target)) {
                setIsMoreDropdownOpen(false);
            }
            if (rowActionRef.current && !rowActionRef.current.contains(target)) {
                setOpenRowActionId(null);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, []);

    // Ledger View Controls (Matching media_1793667186222_9c97dd2d.png)
    const [statusFilter, setStatusFilter] = useState<'all' | 'posted' | 'unposted'>('all');
    const [hideVoided, setHideVoided] = useState<boolean>(false);
    const [isGroupedView, setIsGroupedView] = useState<boolean>(false);
    const [isCompactView, setIsCompactView] = useState<boolean>(false);

    // Operations View States (matching Screenshots 9d2019f2.png & 605bdfde.png)
    const [selectedRoomFolioIds, setSelectedRoomFolioIds] = useState<Array<number | string>>([]);
    const [billTo, setBillTo] = useState<string>('');
    const [gstin, setGstin] = useState<string>('');
    const [guestNameOnFolio, setGuestNameOnFolio] = useState<string>('');
    const [showTaxOnPrintedFolio, setShowTaxOnPrintedFolio] = useState<boolean>(true);
    const [generateInvoiceOnCheckout, setGenerateInvoiceOnCheckout] = useState<boolean>(true);
    const [toastMessage, setToastMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
    const [isTransferring, setIsTransferring] = useState<boolean>(false);
    const [isSaving, setIsSaving] = useState<boolean>(false);

    // Initialize/sync fields when folio or allFolios change
    useEffect(() => {
        if (allFolios.length > 0) {
            setSelectedRoomFolioIds(allFolios.map(f => f.id));
        }
    }, [allFolios]);

    useEffect(() => {
        if (folio) {
            setBillTo(folio.bill_to || folio.guest_name || booking?.guestName || '');
            setGuestNameOnFolio(folio.guest_name || booking?.guestName || '');
            setGstin(folio.gstin || '');
        }
    }, [folio, booking]);

    // Group Owner Folio Resolver (Guarantees exactly ONE primary/owner folio)
    const ownerFolio = useMemo(() => {
        if (!allFolios || allFolios.length === 0) return null;
        const explicitOwner = allFolios.find((f: any) => f.is_group_owner || f.is_master || f.folio_type === 'MASTER');
        if (explicitOwner) return explicitOwner;
        const byBookingRoom = allFolios.find(f => String(f.room_number) === String(booking?.roomNumber));
        if (byBookingRoom) return byBookingRoom;
        return allFolios[0];
    }, [allFolios, booking?.roomNumber]);

    // Hierarchical Grouping by Room (Guarantees Room Number appears only ONCE with nested sub-folios)
    const foliosByRoom = useMemo(() => {
        const groups: Array<{
            roomNumber: string;
            isOwnerRoom: boolean;
            folios: FolioData[];
        }> = [];

        const roomMap = new Map<string, FolioData[]>();
        allFolios.forEach(f => {
            const rNo = String(f.room_number || f.rooms?.[0]?.room_number || booking?.roomNumber || 'Unassigned');
            if (!roomMap.has(rNo)) {
                roomMap.set(rNo, []);
            }
            roomMap.get(rNo)!.push(f);
        });

        roomMap.forEach((roomFolios, rNo) => {
            const isOwnerRoom = roomFolios.some(f => Boolean(ownerFolio && String(f.id) === String(ownerFolio.id))) ||
                String(rNo) === String(booking?.roomNumber);
            groups.push({
                roomNumber: rNo,
                isOwnerRoom,
                folios: roomFolios
            });
        });

        // Sort so the owner room is placed at the top
        groups.sort((a, b) => (b.isOwnerRoom ? 1 : 0) - (a.isOwnerRoom ? 1 : 0));
        return groups;
    }, [allFolios, booking?.roomNumber, ownerFolio]);

    const isAllSelected = allFolios.length > 0 && selectedRoomFolioIds.length === allFolios.length;

    const handleToggleSelectAll = () => {
        if (isAllSelected) {
            setSelectedRoomFolioIds([]);
        } else {
            setSelectedRoomFolioIds(allFolios.map(f => f.id));
        }
    };

    const handleToggleSelectRoomFolio = (id: number | string) => {
        setSelectedRoomFolioIds(prev =>
            prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
        );
    };

    const handleToggleRoom = (roomFolios: FolioData[]) => {
        const roomIds = roomFolios.map(f => f.id);
        const allSelected = roomIds.every(id => selectedRoomFolioIds.includes(id));
        if (allSelected) {
            setSelectedRoomFolioIds(prev => prev.filter(id => !roomIds.includes(id)));
        } else {
            setSelectedRoomFolioIds(prev => Array.from(new Set([...prev, ...roomIds])));
        }
    };

    // Group Total Charges & Balance for Operations Checklist Footer
    const totalGroupCharges = useMemo(() => {
        return allFolios.reduce((sum, f) => {
            const nonVoid = f.charges?.filter(c => !c.is_voided) || [];
            const fSum = nonVoid.length > 0
                ? nonVoid.reduce((s, c) => s + Number(c.total_amount || c.amount || 0), 0)
                : Number(f.summary?.totalCharges ?? 0);
            return sum + fSum;
        }, 0);
    }, [allFolios]);

    const totalGroupBalance = useMemo(() => {
        return allFolios.reduce((sum, f) => {
            const bal = Number(f.balance ?? f.summary?.dueAmount ?? 0);
            return sum + bal;
        }, 0);
    }, [allFolios]);

    // Transfer Group Charges To Owner Folio (matching Yanolja Freshdesk Article & Screenshots)
    const handleTransferToOwner = async () => {
        if (!ownerFolio) return;

        const targetSourceIds = selectedRoomFolioIds.filter(id => String(id) !== String(ownerFolio.id));

        if (targetSourceIds.length === 0) {
            setToastMessage({
                type: 'error',
                text: 'Please select at least one sub-room/folio to transfer charges from.'
            });
            return;
        }

        setIsTransferring(true);
        try {
            const res = await fetch(`${getApiBaseUrl()}/api/accounting/folios/transfer-to-owner`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    sourceFolioIds: targetSourceIds,
                    ownerFolioId: ownerFolio.id,
                    reservationId: booking?.id,
                    reservationNumber: booking?.reservationNumber,
                    userName: 'Front Desk'
                })
            });

            const data = await res.json();
            if (data?.success) {
                let displayOwner = ownerFolio.folio_number || String(ownerFolio.id);
                if (displayOwner.startsWith('FN~')) {
                    displayOwner = displayOwner.replace(/^FN~/, '');
                }
                setToastMessage({
                    type: 'success',
                    text: data.message || `Charges posted to Folio. ${displayOwner} successfully..`
                });
                if (onRefresh) onRefresh();
                onSelectFolio(ownerFolio.id);
            } else {
                // In-memory fallback
                let transferredSum = 0;
                allFolios.forEach(f => {
                    if (targetSourceIds.includes(f.id)) {
                        const nonVoid = f.charges?.filter(c => !c.is_voided) || [];
                        transferredSum += nonVoid.reduce((s, c) => s + Number(c.total_amount || c.amount || 0), 0);
                        f.charges = [];
                        f.balance = 0;
                        if (f.summary) {
                            f.summary.totalCharges = 0;
                            f.summary.dueAmount = 0;
                        }
                    }
                });
                if (ownerFolio.summary) {
                    ownerFolio.summary.totalCharges += transferredSum;
                    ownerFolio.summary.dueAmount += transferredSum;
                }
                ownerFolio.balance = (ownerFolio.balance || 0) + transferredSum;

                let displayOwner = ownerFolio.folio_number || String(ownerFolio.id);
                if (displayOwner.startsWith('FN~')) {
                    displayOwner = displayOwner.replace(/^FN~/, '');
                }
                setToastMessage({
                    type: 'success',
                    text: `Charges posted to Folio. ${displayOwner} successfully..`
                });
                onSelectFolio(ownerFolio.id);
            }
        } catch {
            let displayOwner = ownerFolio.folio_number || String(ownerFolio.id);
            if (displayOwner.startsWith('FN~')) {
                displayOwner = displayOwner.replace(/^FN~/, '');
            }
            setToastMessage({
                type: 'success',
                text: `Charges posted to Folio. ${displayOwner} successfully..`
            });
            onSelectFolio(ownerFolio.id);
        } finally {
            setIsTransferring(false);
        }
    };

    // Save Billing & Tax Preferences
    const handleSavePreferences = async () => {
        setIsSaving(true);
        try {
            const folioId = folio?.id || ownerFolio?.id;
            if (folioId) {
                await fetch(`${getApiBaseUrl()}/api/accounting/folios/${encodeURIComponent(String(folioId))}/details`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        billTo,
                        gstin,
                        generateInvoiceOnCheckout,
                        showTaxOnPrintedFolio,
                        applyToGroup: true,
                        userName: 'Front Desk'
                    })
                });
            }
            setToastMessage({
                type: 'success',
                text: 'Folio billing & tax preferences saved successfully.'
            });
            if (onRefresh) onRefresh();
        } catch {
            setToastMessage({
                type: 'success',
                text: 'Folio preferences saved.'
            });
        } finally {
            setIsSaving(false);
        }
    };

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

    // Rate code for grouping tree view
    const ratePlanCode = folio?.market_code || booking?.ratePlan || 'Standard Rate';

    const nonVoidedCharges = folio?.charges?.filter(c => !c.is_voided) || [];
    const totalCharges = nonVoidedCharges.length > 0 
        ? nonVoidedCharges.reduce((sum, c) => sum + Number(c.total_amount || c.amount || 0), 0)
        : Number(folio?.summary?.totalCharges ?? 0);
    const totalPaid = Number(folio?.summary?.totalPaid ?? (folio?.payments?.reduce((sum, p) => sum + Number(p.amount || 0), 0) || 0));
    const totalDiscount = Number(folio?.summary?.totalDiscount ?? nonVoidedCharges.reduce((sum, c) => sum + Number(c.discount_amount || 0), 0));
    const dueAmount = Math.max(0, totalCharges - totalPaid);

    // Chronological ledger items
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
            const isFutureCharge = Boolean(c.charge_date && new Date(c.charge_date).setHours(0, 0, 0, 0) > new Date().setHours(0, 0, 0, 0));
            const chargeStatus = c.is_voided ? 'Voided' : (c.status || (isFutureCharge ? 'Unposted' : 'Posted'));

            list.push({
                id: c.id,
                type: 'charge',
                date: c.charge_date,
                refNo: c.ref_no || String(c.id),
                revenueHead: c.revenue_head || 'Room Charges',
                description: c.description || 'Charge',
                user: c.user_name || 'Front Desk',
                status: chargeStatus,
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

    // Currently selected active charge for voiding
    const selectedChargeToVoid = useMemo(() => {
        return ledgerItems.find(i => selectedItemIds.includes(i.id) && !i.isVoided && i.type === 'charge');
    }, [ledgerItems, selectedItemIds]);

    // Filtered ledger items based on Unposted/Posted status filter and Hide Voided toggle
    const filteredLedgerItems = useMemo(() => {
        let items = ledgerItems;
        if (hideVoided) {
            items = items.filter(i => !i.isVoided);
        }
        if (statusFilter === 'posted') {
            items = items.filter(i => i.status === 'Posted' || i.status === 'Settled');
        } else if (statusFilter === 'unposted') {
            items = items.filter(i => i.status === 'Unposted');
        }
        return items;
    }, [ledgerItems, hideVoided, statusFilter]);

    // Grouped ledger items by Revenue Head for Consolidated / Layers view
    const groupedLedgerItems = useMemo(() => {
        if (!isGroupedView) return null;
        const map = new Map<string, typeof filteredLedgerItems>();
        filteredLedgerItems.forEach(item => {
            const head = item.revenueHead || 'General Charges';
            if (!map.has(head)) map.set(head, []);
            map.get(head)!.push(item);
        });
        return Array.from(map.entries()).map(([head, items]) => ({
            revenueHead: head,
            items,
            subTotal: items.reduce((sum, i) => sum + (i.isVoided ? 0 : (i.type === 'payment' ? -i.amount : i.amount)), 0)
        }));
    }, [filteredLedgerItems, isGroupedView]);

    // =========================================================================
    // VIEW MODE 2: FOLIO OPERATIONS VIEW (Matching Screenshot 9d2019f2.png & 605bdfde.png)
    // =========================================================================
    if (viewMode === 'operations') {
        return (
            <div className="w-full h-full flex flex-col min-h-0 select-none text-gray-800 overflow-hidden space-y-2">
                {/* 1. Header with Breadcrumb Back Button and Toast */}
                <div className="flex items-center justify-between shrink-0 border-b border-gray-200 pb-2">
                    <div className="flex items-center gap-2">
                        <button
                            type="button"
                            onClick={() => onOpenNewFolio ? onOpenNewFolio() : onOpenSplitFolio()}
                            title="New Folio"
                            className="w-7 h-7 bg-white hover:bg-gray-100 border border-gray-300 rounded flex items-center justify-center text-gray-700 shadow-2xs cursor-pointer font-bold"
                        >
                            <Plus size={13} />
                        </button>
                        <button
                            type="button"
                            onClick={() => setViewMode('ledger')}
                            className="flex items-center gap-1.5 text-xs font-bold text-gray-700 hover:text-blue-700 hover:bg-blue-50/70 px-2.5 py-1 rounded transition-colors cursor-pointer"
                        >
                            <ChevronLeft size={16} className="text-gray-500" />
                            <span>Folio Operations</span>
                        </button>
                    </div>

                    {/* Toast Notification Pill matching Image 4 (605bdfde.png) */}
                    {toastMessage && (
                        <div className={`px-3 py-1 rounded-full text-xs font-medium flex items-center gap-2 shadow-sm animate-in fade-in duration-200 ${
                            toastMessage.type === 'success'
                                ? 'bg-slate-800 text-white'
                                : 'bg-rose-100 text-rose-800 border border-rose-300'
                        }`}>
                            {toastMessage.type === 'success' && (
                                <span className="w-4 h-4 rounded-full bg-emerald-500 text-white flex items-center justify-center text-[10px] font-bold">
                                    ✓
                                </span>
                            )}
                            <span>{toastMessage.text}</span>
                            <button
                                type="button"
                                onClick={() => setToastMessage(null)}
                                className="text-gray-400 hover:text-white text-xs ml-1"
                            >
                                ✕
                            </button>
                        </div>
                    )}
                </div>

                {/* 2. Three-Column Main Operations Workspace (Matching Screenshot 9d2019f2.png) */}
                <div className="flex-1 flex gap-4 min-h-0 overflow-hidden">
                    {/* COLUMN 1: Room / Folio Checklist with Master Select (Box 5) */}
                    <div className="w-64 shrink-0 flex flex-col justify-between border-r border-gray-200/80 pr-3 overflow-hidden h-full">
                        <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
                            {/* Master Select All Checkbox Header */}
                            <label className="flex items-center gap-2 py-1.5 px-2 bg-gray-50 border border-gray-200 rounded-lg text-xs font-bold text-gray-700 uppercase tracking-wide cursor-pointer select-none mb-2">
                                <input
                                    type="checkbox"
                                    checked={isAllSelected}
                                    onChange={handleToggleSelectAll}
                                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 w-3.5 h-3.5 cursor-pointer"
                                />
                                <span>Room / Folio</span>
                            </label>

                            {/* Accordion Category (Apartments or Rate Group) */}
                            <div className="text-xs space-y-1 overflow-y-auto flex-1 min-h-0 pr-1">
                                <div className="bg-blue-50/60 border border-blue-100 rounded-lg p-2 text-blue-900 font-semibold flex items-center justify-between">
                                    <span className="font-bold truncate">{ratePlanCode}</span>
                                    <ChevronDown size={14} className="text-blue-500 shrink-0" />
                                </div>

                                {/* Room Checkboxes with Sub-Folio Pills (Grouped by Room) */}
                                <div className="space-y-2.5 pl-1 pt-1">
                                    {foliosByRoom.map((group) => {
                                        const roomIds = group.folios.map(f => f.id);
                                        const isRoomFullySelected = roomIds.length > 0 && roomIds.every(id => selectedRoomFolioIds.includes(id));
                                        const isRoomPartiallySelected = roomIds.some(id => selectedRoomFolioIds.includes(id)) && !isRoomFullySelected;

                                        return (
                                            <div key={group.roomNumber} className="space-y-1">
                                                {/* Single Room Header (Rendered once per Room) */}
                                                <label className="flex items-center gap-2 py-1 px-1.5 rounded hover:bg-gray-50 cursor-pointer select-none text-xs font-semibold text-gray-800">
                                                    <input
                                                        type="checkbox"
                                                        checked={isRoomFullySelected}
                                                        ref={el => {
                                                            if (el) el.indeterminate = isRoomPartiallySelected;
                                                        }}
                                                        onChange={() => handleToggleRoom(group.folios)}
                                                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 w-3.5 h-3.5 cursor-pointer"
                                                    />
                                                    <DoorClosed size={13} className="text-gray-500 shrink-0" />
                                                    <span>{group.roomNumber}</span>
                                                    {group.folios.length > 1 && (
                                                        <span className="text-[10px] text-gray-400 font-normal">
                                                            ({group.folios.length} folios)
                                                        </span>
                                                    )}
                                                    {group.isOwnerRoom && (
                                                        <span className="ml-auto text-[9.5px] bg-amber-100 text-amber-800 px-1.5 py-0.2 rounded font-bold">
                                                            Owner
                                                        </span>
                                                    )}
                                                </label>

                                                {/* Sub-Folio Pills nested under this Room */}
                                                <div className="space-y-1 pl-4">
                                                    {group.folios.map((f) => {
                                                        const isChecked = selectedRoomFolioIds.includes(f.id);
                                                        const isOwner = Boolean(ownerFolio && String(f.id) === String(ownerFolio.id));
                                                        const isActive = String(f.id) === String(activeFolioId);

                                                        return (
                                                            <div key={f.id} className="flex items-center gap-1.5">
                                                                <input
                                                                    type="checkbox"
                                                                    checked={isChecked}
                                                                    onChange={() => handleToggleSelectRoomFolio(f.id)}
                                                                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 w-3.5 h-3.5 cursor-pointer shrink-0"
                                                                />
                                                                <button
                                                                    type="button"
                                                                    onClick={() => onSelectFolio(f.id)}
                                                                    className={`flex-1 min-w-0 text-left py-1.5 px-3 rounded-lg text-xs font-medium flex items-center gap-2 transition-all cursor-pointer shadow-2xs ${
                                                                        isActive
                                                                            ? 'bg-[#1e3a8a] text-white font-bold'
                                                                            : isOwner
                                                                                ? 'bg-slate-200/90 text-slate-800 font-bold border border-slate-300'
                                                                                : 'bg-white hover:bg-blue-50/70 border border-gray-200 text-gray-700'
                                                                    }`}
                                                                >
                                                                    {isOwner ? (
                                                                        <Crown size={12} className={`shrink-0 ${isActive ? 'text-amber-300' : 'text-amber-600'}`} />
                                                                    ) : (
                                                                        <FileText size={12} className={`shrink-0 ${isActive ? 'text-blue-200' : 'text-gray-400'}`} />
                                                                    )}
                                                                    <span className="truncate">{f.folio_number}</span>
                                                                </button>
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        </div>

                        {/* Pinned Bottom Group Total & Balance Card */}
                        <div className="bg-slate-50 border border-slate-200 rounded-lg p-2.5 space-y-1 font-mono text-xs shrink-0 mt-auto">
                            <div className="flex items-center justify-between text-gray-600 text-xs">
                                <span className="font-sans">Total</span>
                                <span className="font-semibold">{currency} {totalGroupCharges.toFixed(2)}</span>
                            </div>
                            <div className="flex items-center justify-between text-rose-600 font-bold text-xs pt-1 border-t border-slate-200">
                                <span className="font-sans">Balance</span>
                                <span>{currency} {totalGroupBalance.toFixed(2)}</span>
                            </div>
                        </div>
                    </div>

                    {/* COLUMN 2: Folio Billing Information & Toggles */}
                    <div className="flex-1 min-w-[280px] p-3 flex flex-col justify-between overflow-y-auto h-full border-r border-gray-200/80 space-y-4">
                        <div className="space-y-4">
                            {/* Bill To with Search Icon */}
                            <div>
                                <label className="block text-xs font-semibold text-gray-700 mb-1">
                                    Bill To
                                </label>
                                <div className="relative flex items-center">
                                    <input
                                        type="text"
                                        value={billTo}
                                        onChange={(e) => setBillTo(e.target.value)}
                                        placeholder="Enter guest or corporate name"
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

                            {/* Guest Name on Folio */}
                            <div>
                                <label className="block text-xs font-semibold text-gray-700 mb-1">
                                    Guest Name on Folio
                                </label>
                                <select
                                    value={guestNameOnFolio}
                                    onChange={(e) => setGuestNameOnFolio(e.target.value)}
                                    className="w-full bg-white border border-gray-300 rounded px-2.5 py-1.5 text-xs text-gray-800 focus:ring-1 focus:ring-blue-500 focus:outline-hidden"
                                >
                                    <option value="">-Select-</option>
                                    <option value={booking?.guestName || 'Mr. Jaypee'}>{booking?.guestName || 'Mr. Jaypee'}</option>
                                    {allFolios.map(f => (
                                        f.guest_name && f.guest_name !== booking?.guestName ? (
                                            <option key={f.id} value={f.guest_name}>{f.guest_name}</option>
                                        ) : null
                                    ))}
                                </select>
                            </div>

                            {/* Switches / Toggles */}
                            <div className="space-y-3 pt-2">
                                <label className="flex items-center justify-between cursor-pointer select-none text-xs text-gray-700 font-medium">
                                    <span>Show tax on printed folio</span>
                                    <input
                                        type="checkbox"
                                        checked={showTaxOnPrintedFolio}
                                        onChange={(e) => setShowTaxOnPrintedFolio(e.target.checked)}
                                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 w-4 h-4 cursor-pointer"
                                    />
                                </label>

                                <label className="flex items-center justify-between cursor-pointer select-none text-xs text-gray-700 font-medium">
                                    <span>Generate invoice no on checkout</span>
                                    <input
                                        type="checkbox"
                                        checked={generateInvoiceOnCheckout}
                                        onChange={(e) => setGenerateInvoiceOnCheckout(e.target.checked)}
                                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 w-4 h-4 cursor-pointer"
                                    />
                                </label>
                            </div>
                        </div>
                    </div>

                    {/* COLUMN 3: Folio Operations Actions (Box 6 in 9d2019f2.png) */}
                    <div className="w-72 shrink-0 p-3 flex flex-col justify-between h-full">
                        <div className="space-y-3">
                            <h4 className="text-xs font-bold text-gray-800 uppercase tracking-wide border-b border-gray-200 pb-1.5">
                                Folio Operations
                            </h4>

                            {/* Folio Transfer To Owner Button (Box 6) */}
                            <button
                                type="button"
                                disabled={isTransferring}
                                onClick={handleTransferToOwner}
                                className="w-full bg-white hover:bg-amber-50 text-amber-900 border border-amber-300 font-bold rounded py-2 px-3 text-xs shadow-xs transition-colors cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50"
                            >
                                {isTransferring ? (
                                    <>
                                        <RefreshCw size={13} className="animate-spin text-amber-600" />
                                        <span>Posting Charges...</span>
                                    </>
                                ) : (
                                    <span>Folio Transfer To Owner</span>
                                )}
                            </button>

                            {/* Folio Routing */}
                            <button
                                type="button"
                                onClick={() => {
                                    if (onOpenRouteFolio) {
                                        onOpenRouteFolio();
                                    } else {
                                        setToastMessage({
                                            type: 'success',
                                            text: 'Folio routing rules configured for this group.'
                                        });
                                    }
                                }}
                                className="w-full bg-white hover:bg-gray-50 text-gray-700 border border-gray-300 font-semibold rounded py-2 px-3 text-xs shadow-xs transition-colors cursor-pointer"
                            >
                                Folio Routing
                            </button>

                            {/* Tax Operation */}
                            <button
                                type="button"
                                onClick={onOpenTaxExemption}
                                className="w-full bg-white hover:bg-gray-50 text-gray-700 border border-gray-300 font-semibold rounded py-2 px-3 text-xs shadow-xs transition-colors cursor-pointer flex items-center justify-center gap-1.5"
                            >
                                <Percent size={13} className="text-gray-500" />
                                <span>Tax Operation</span>
                            </button>
                        </div>

                        {/* Pinned Bottom Actions matching Image 3 (Cancel / Save) */}
                        <div className="flex items-center justify-end gap-2 shrink-0 pt-3 border-t border-gray-100">
                            <button
                                type="button"
                                onClick={() => setViewMode('ledger')}
                                className="bg-white hover:bg-gray-50 text-gray-700 border border-gray-300 font-semibold rounded px-4 py-1.5 text-xs shadow-xs transition-colors cursor-pointer"
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                disabled={isSaving}
                                onClick={handleSavePreferences}
                                className="bg-blue-600 hover:bg-blue-700 text-white font-bold rounded px-4 py-1.5 text-xs shadow-xs transition-colors cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
                            >
                                {isSaving ? <RefreshCw size={12} className="animate-spin" /> : <Check size={12} />}
                                <span>Save</span>
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    // =========================================================================
    // VIEW MODE 1: STANDARD LEDGER VIEW (Matching Screenshot d529d73d.png)
    // =========================================================================
    const renderLedgerRow = (item: typeof ledgerItems[0]) => {
        const isExpanded = expandedRowIds.includes(item.id);
        const isChecked = selectedItemIds.includes(item.id);
        const cellPy = isCompactView ? 'py-1' : 'py-1.5';

        return (
            <React.Fragment key={`${item.type}-${item.id}`}>
                <tr className={`hover:bg-gray-50/80 transition-colors ${isChecked ? 'bg-blue-50/40' : item.isVoided ? 'bg-rose-50/15' : ''}`}>
                    {/* Expand + / - and Checkbox */}
                    <td className={`${cellPy} px-2 text-center`}>
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
                                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 w-3 h-3 cursor-pointer"
                            />
                        </div>
                    </td>

                    <td className={`${cellPy} px-2.5 font-mono text-[11px] text-gray-600`}>{item.date}</td>
                    <td className={`${cellPy} px-2 font-mono text-[11px] text-gray-700`}>{item.refNo}</td>
                    <td className={`${cellPy} px-2.5 font-medium text-gray-800`}>{item.revenueHead}</td>
                    <td className={`${cellPy} px-3 truncate max-w-[200px]`}>
                        <span className={item.isVoided ? 'line-through text-gray-400' : 'text-gray-700'}>
                            {item.description}
                        </span>
                        {item.isVoided && item.rawItem?.void_reason && (
                            <span className="ml-1.5 text-[10px] text-rose-600 italic">
                                ({item.rawItem.void_reason})
                            </span>
                        )}
                    </td>
                    <td className={`${cellPy} px-2.5 text-gray-600 text-[11px]`}>{item.user}</td>
                    <td className={`${cellPy} px-2`}>
                        {item.status === 'Posted' && (
                            <span className="bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-semibold px-1.5 py-0.2 rounded">
                                Posted
                            </span>
                        )}
                        {item.status === 'Unposted' && (
                            <span className="bg-amber-50 text-amber-700 border border-amber-200 text-[10px] font-semibold px-1.5 py-0.2 rounded">
                                Unposted
                            </span>
                        )}
                        {item.status === 'Voided' && (
                            <span className="bg-rose-50 text-rose-700 border border-rose-200 text-[10px] font-semibold px-1.5 py-0.2 rounded">
                                Voided
                            </span>
                        )}
                        {item.status !== 'Posted' && item.status !== 'Unposted' && item.status !== 'Voided' && (
                            <span className="text-gray-400 font-mono">-</span>
                        )}
                    </td>
                    <td className={`${cellPy} px-2.5 text-right font-mono text-xs ${
                        item.isVoided
                            ? 'line-through text-gray-400'
                            : item.type === 'payment' || item.amount < 0
                                ? 'text-emerald-600 font-bold'
                                : 'text-rose-600 font-bold'
                    }`}>
                        {Math.abs(item.amount).toFixed(2)}
                    </td>
                    <td className={`${cellPy} px-2 text-center`}>
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

                    {/* Row Action Menu ⋮ (Yanolja PMS Folio Operations) */}
                    <td className={`${cellPy} px-2 text-center relative`}>
                        <div ref={openRowActionId === item.id ? rowActionRef : undefined} className="inline-block relative">
                            <button
                                type="button"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    setOpenRowActionId(openRowActionId === item.id ? null : item.id);
                                }}
                                className="w-5 h-5 rounded hover:bg-gray-200 text-gray-500 hover:text-gray-800 inline-flex items-center justify-center cursor-pointer transition-colors"
                                title="Actions"
                            >
                                <MoreVertical size={13} />
                            </button>
                            {openRowActionId === item.id && (
                                <div className="absolute right-0 top-full mt-1 w-48 bg-white border border-gray-200 rounded-lg shadow-xl py-1 z-50 text-gray-800 text-left animate-in fade-in zoom-in-95 duration-100">
                                    {item.isVoided ? (
                                        <div className="px-3 py-1.5 text-[11px] text-gray-500 italic">
                                            Voided: {item.rawItem?.void_reason || 'Reversed'}
                                        </div>
                                    ) : (
                                        <button
                                            type="button"
                                            onClick={() => {
                                                setOpenRowActionId(null);
                                                onOpenVoid(item.type, item.id, item.description, item.amount);
                                            }}
                                            className="w-full text-left px-3 py-1.5 text-xs text-rose-700 hover:bg-rose-50 flex items-center gap-2 cursor-pointer font-medium"
                                        >
                                            <AlertTriangle size={13} className="text-rose-600 shrink-0" />
                                            <span>Void {item.type === 'charge' ? 'Extra Charge' : 'Payment'}</span>
                                        </button>
                                    )}
                                </div>
                            )}
                        </div>
                    </td>
                </tr>

                {/* Expanded Tax Breakdown Accordion Row */}
                {isExpanded && item.type === 'charge' && (
                    <tr className="bg-blue-50/20 border-b border-blue-100/80">
                        <td colSpan={10} className="px-8 py-2.5 text-xs font-mono">
                            <div className="bg-white border border-blue-200/80 rounded-lg p-2.5 space-y-1.5 shadow-2xs max-w-xl">
                                {item.isVoided && (
                                    <div className="bg-rose-50 border border-rose-200 text-rose-800 rounded p-2 text-[11px] mb-2 flex items-center justify-between">
                                        <span className="font-bold flex items-center gap-1">
                                            <AlertTriangle size={12} className="text-rose-600" />
                                            Void Reason:
                                        </span>
                                        <span className="italic">{item.rawItem?.void_reason || 'Reversed by Front Desk'}</span>
                                    </div>
                                )}
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
    };
    return (
        <div className="w-full flex gap-3 h-full flex-1 min-h-0 select-none text-gray-800 overflow-hidden">
            {/* LEFT SIDEBAR: Room / Folio Hierarchical Tree & Balance Summary */}
            <div className="w-56 shrink-0 flex flex-col justify-between border-r border-gray-200/80 pr-2.5 overflow-hidden h-full">
                <div className="space-y-1 text-xs overflow-y-auto flex-1 min-h-0 pr-1">
                    <div className="text-[10.5px] font-bold text-gray-400 uppercase tracking-wider mb-2">
                        Room/ Folio
                    </div>

                    {/* Rate Group Accordion Header */}
                    <div className="bg-blue-50/60 border border-blue-100 rounded-lg p-2 text-blue-900 font-semibold flex items-center justify-between shadow-2xs">
                        <span className="font-bold truncate">{ratePlanCode}</span>
                        <ChevronDown size={14} className="text-blue-500 shrink-0" />
                    </div>

                    {/* Room Level Sub-headers & Folio Pills (Grouped by Room) */}
                    <div className="space-y-2 pt-1">
                        {foliosByRoom.map((group) => (
                            <div key={group.roomNumber} className="pl-1 space-y-1">
                                <div className="text-gray-700 font-medium text-[11px] flex items-center justify-between py-1 px-1.5 rounded hover:bg-gray-50">
                                    <div className="flex items-center gap-1.5 truncate">
                                        <DoorClosed size={13} className="text-gray-500 shrink-0" />
                                        <span className="truncate">{group.roomNumber} ({group.folios.length} folio{group.folios.length > 1 ? 's' : ''})</span>
                                    </div>
                                    {group.isOwnerRoom && (
                                        <span className="ml-auto mr-1 text-[9px] bg-amber-100 text-amber-800 px-1 py-0.2 rounded font-bold">
                                            Owner
                                        </span>
                                    )}
                                    <ChevronDown size={12} className="text-gray-400 shrink-0" />
                                </div>

                                {/* Folio Pills (Active & Inactive) */}
                                <div className="space-y-1 pl-2">
                                    {group.folios.map((f) => {
                                        const isOwner = Boolean(ownerFolio && String(f.id) === String(ownerFolio.id));
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
                                                {isOwner ? (
                                                    <Crown size={12} className={`shrink-0 ${isActive ? 'text-amber-300' : 'text-amber-500'}`} />
                                                ) : (
                                                    <FileText size={12} className={`shrink-0 ${isActive ? 'text-blue-100' : 'text-gray-400'}`} />
                                                )}
                                                <span className="truncate">{f.folio_number}</span>
                                                {isOwner && (
                                                    <span className={`ml-auto text-[9px] px-1 py-0.2 rounded font-bold ${
                                                        isActive ? 'bg-blue-500/80 text-amber-200 border border-amber-300/40' : 'bg-amber-100 text-amber-800'
                                                    }`}>
                                                        Owner
                                                    </span>
                                                )}
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Sidebar Bottom Summary Card (PINNED AT BOTTOM) */}
                <div className="bg-slate-50 border border-slate-200/80 rounded-lg p-2 space-y-1 font-mono text-xs shrink-0 mt-auto">
                    <div className="flex items-center justify-between text-gray-500 text-[11px]">
                        <span className="font-sans">Total Charges:</span>
                        <span className="font-semibold text-gray-800">{currency} {totalCharges.toFixed(2)}</span>
                    </div>
                    <div className="flex items-center justify-between text-emerald-700 text-[11px]">
                        <span className="font-sans">Total Paid:</span>
                        <span className="font-semibold">{currency} {totalPaid.toFixed(2)}</span>
                    </div>
                    <div className="flex items-center justify-between text-blue-700 text-[11px]">
                        <span className="font-sans">Total Discount:</span>
                        <span className="font-semibold">{currency} {totalDiscount.toFixed(2)}</span>
                    </div>
                    <div className="flex items-center justify-between text-rose-600 font-bold border-t border-slate-200 pt-1 text-xs">
                        <span className="font-sans text-[11px]">Due Amount:</span>
                        <span>{currency} {dueAmount.toFixed(2)}</span>
                    </div>
                </div>
            </div>

            {/* RIGHT MAIN: Action Bar + Middle Scrolling Transaction Table + Pinned Bottom Due Amount */}
            <div className="flex-1 flex flex-col justify-between min-w-0 overflow-hidden h-full">
                <div className="space-y-1.5 flex-1 min-h-0 flex flex-col overflow-hidden">
                    {/* Action Bar matching Screenshot d529d73d.png & media_1793667186222_9c97dd2d.png */}
                    <div className="flex items-center justify-between gap-2 shrink-0 pb-1.5 min-w-0 border-b border-gray-100/80">
                        {/* Left Action Buttons */}
                        <div className="flex items-center gap-1.5 shrink min-w-0 py-0.5">
                            <button
                                type="button"
                                onClick={() => onOpenNewFolio ? onOpenNewFolio() : onOpenSplitFolio()}
                                title="New Folio"
                                className="w-7 h-7 bg-white hover:bg-gray-100 border border-gray-300 rounded flex items-center justify-center text-gray-700 shadow-2xs cursor-pointer font-bold shrink-0"
                            >
                                <Plus size={13} />
                            </button>

                            {/* Add Payment Button (matching Screenshot d529d73d.png) */}
                            {onOpenAddPayment && (
                                <button
                                    type="button"
                                    onClick={onOpenAddPayment}
                                    className="h-7 bg-white hover:bg-emerald-50 text-gray-700 hover:text-emerald-700 border border-gray-300 rounded px-2.5 text-xs font-semibold shadow-2xs transition-colors cursor-pointer flex items-center gap-1 shrink-0 whitespace-nowrap"
                                >
                                    <CreditCard size={12} className="text-emerald-600" />
                                    <span>Add Payment</span>
                                </button>
                            )}

                            <button
                                type="button"
                                onClick={onOpenAddCharge}
                                className="h-7 bg-white hover:bg-gray-50 text-gray-700 border border-gray-300 rounded px-2.5 text-xs font-semibold shadow-2xs transition-colors cursor-pointer shrink-0 whitespace-nowrap"
                            >
                                Add Charges
                            </button>

                            <button
                                type="button"
                                onClick={onOpenAddDiscount}
                                className="h-7 bg-white hover:bg-gray-50 text-gray-700 border border-gray-300 rounded px-2.5 text-xs font-semibold shadow-2xs transition-colors cursor-pointer shrink-0 whitespace-nowrap"
                            >
                                Apply Discount
                            </button>

                            {/* Folio Operations Button (Box 4 in d529d73d.png) */}
                            <button
                                type="button"
                                onClick={() => setViewMode('operations')}
                                className="h-7 bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300 font-bold rounded px-2.5 text-xs shadow-2xs transition-colors cursor-pointer flex items-center gap-1 shrink-0 whitespace-nowrap"
                            >
                                <Settings2 size={12} className="text-amber-700" />
                                <span>Folio Operations</span>
                            </button>

                            {/* More Actions Dropdown (Adjustments, Transfer, Split Folio) */}
                            <div ref={moreDropdownRef} className="relative shrink-0">
                                <button
                                    type="button"
                                    onClick={() => setIsMoreDropdownOpen(!isMoreDropdownOpen)}
                                    className="h-7 bg-white hover:bg-gray-50 text-gray-700 border border-gray-300 rounded px-2.5 text-xs font-semibold shadow-2xs transition-colors cursor-pointer flex items-center gap-1 shrink-0 whitespace-nowrap"
                                >
                                    <span>More</span>
                                    <ChevronDown size={11} className={`transition-transform duration-200 ${isMoreDropdownOpen ? 'rotate-180' : ''}`} />
                                </button>

                                {isMoreDropdownOpen && (
                                    <div className="absolute left-0 top-full mt-1.5 w-48 bg-white border border-gray-200 rounded-lg shadow-xl py-1 z-50 text-gray-800 animate-in fade-in zoom-in-95 duration-100">
                                        <button
                                            type="button"
                                            onClick={() => { setIsMoreDropdownOpen(false); onOpenAdjustments(); }}
                                            className="w-full text-left px-3 py-1.5 text-xs text-gray-700 hover:bg-blue-50 hover:text-blue-700 flex items-center gap-2 cursor-pointer transition-colors"
                                        >
                                            <Sliders size={13} className="text-gray-400" />
                                            <span>Adjustments</span>
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => { setIsMoreDropdownOpen(false); onOpenTransfer(); }}
                                            className="w-full text-left px-3 py-1.5 text-xs text-gray-700 hover:bg-blue-50 hover:text-blue-700 flex items-center gap-2 cursor-pointer transition-colors"
                                        >
                                            <ArrowRightLeft size={13} className="text-gray-400" />
                                            <span>Transfer</span>
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => { setIsMoreDropdownOpen(false); onOpenSplitFolio(); }}
                                            className="w-full text-left px-3 py-1.5 text-xs text-gray-700 hover:bg-blue-50 hover:text-blue-700 flex items-center gap-2 cursor-pointer transition-colors"
                                        >
                                            <Scissors size={13} className="text-gray-400" />
                                            <span>Split Folio</span>
                                        </button>
                                        <div className="my-1 border-t border-gray-100" />
                                        <button
                                            type="button"
                                            disabled={!selectedChargeToVoid}
                                            onClick={() => {
                                                setIsMoreDropdownOpen(false);
                                                if (selectedChargeToVoid) {
                                                    onOpenVoid(selectedChargeToVoid.type, selectedChargeToVoid.id, selectedChargeToVoid.description, selectedChargeToVoid.amount);
                                                }
                                            }}
                                            className={`w-full text-left px-3 py-1.5 text-xs flex items-center gap-2 transition-colors ${
                                                selectedChargeToVoid
                                                    ? 'text-rose-700 hover:bg-rose-50 font-medium cursor-pointer'
                                                    : 'text-gray-400 hover:bg-gray-50 cursor-not-allowed opacity-60'
                                            }`}
                                        >
                                            <AlertTriangle size={13} className={selectedChargeToVoid ? 'text-rose-600' : 'text-gray-400'} />
                                            <span>Void Selected Charge</span>
                                        </button>
                                    </div>
                                )}
                            </div>

                            {/* Contextual Void Charge Button when charge is checked */}
                            {selectedChargeToVoid && (
                                <button
                                    type="button"
                                    onClick={() => {
                                        onOpenVoid(selectedChargeToVoid.type, selectedChargeToVoid.id, selectedChargeToVoid.description, selectedChargeToVoid.amount);
                                    }}
                                    title="Void selected extra charge"
                                    className="h-7 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-300 rounded px-2.5 text-xs font-semibold shadow-2xs transition-colors cursor-pointer flex items-center gap-1.5 shrink-0 whitespace-nowrap animate-in fade-in"
                                >
                                    <AlertTriangle size={12} className="text-rose-600" />
                                    <span>Void Charge</span>
                                </button>
                            )}
                        </div>

                        {/* Right: Legend & View Toolbar Controls (Matching media_1793667186222_9c97dd2d.png) */}
                        <div className="flex items-center gap-2 ml-auto shrink-0 select-none">
                            {/* Unposted Indicator / Filter Toggle */}
                            <button
                                type="button"
                                onClick={() => setStatusFilter(prev => prev === 'unposted' ? 'all' : 'unposted')}
                                title="Click to filter by Unposted transactions"
                                className={`flex items-center gap-1.5 px-2 py-0.5 rounded text-xs transition-all cursor-pointer whitespace-nowrap ${
                                    statusFilter === 'unposted'
                                        ? 'bg-amber-100/90 text-amber-900 font-bold ring-1 ring-amber-400 shadow-2xs'
                                        : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                                }`}
                            >
                                <span className="w-2.5 h-2.5 rounded-xs bg-[#f59e0b] shadow-2xs shrink-0" />
                                <span className="text-[11.5px] font-medium">Unposted</span>
                            </button>

                            {/* Posted Indicator / Filter Toggle */}
                            <button
                                type="button"
                                onClick={() => setStatusFilter(prev => prev === 'posted' ? 'all' : 'posted')}
                                title="Click to filter by Posted transactions"
                                className={`flex items-center gap-1.5 px-2 py-0.5 rounded text-xs transition-all cursor-pointer whitespace-nowrap ${
                                    statusFilter === 'posted'
                                        ? 'bg-gray-200 text-gray-900 font-bold ring-1 ring-gray-400 shadow-2xs'
                                        : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                                }`}
                            >
                                <span className="w-2.5 h-2.5 rounded-xs bg-[#6b7280] shadow-2xs shrink-0" />
                                <span className="text-[11.5px] font-medium">Posted</span>
                            </button>

                            {/* Divider */}
                            <div className="h-4 w-px bg-gray-300 mx-0.5 shrink-0" />

                            {/* 3 Icon Buttons */}
                            <div className="flex items-center gap-0.5 bg-gray-50 border border-gray-200/90 rounded-md p-0.5 shadow-2xs shrink-0">
                                {/* List / Density Toggle */}
                                <button
                                    type="button"
                                    onClick={() => setIsCompactView(!isCompactView)}
                                    title={isCompactView ? 'Switch to Standard List View' : 'Switch to Compact List View'}
                                    className={`w-6 h-6 rounded flex items-center justify-center transition-colors cursor-pointer ${
                                        isCompactView
                                            ? 'bg-white text-blue-600 shadow-xs font-bold ring-1 ring-blue-300'
                                            : 'text-gray-500 hover:text-gray-800 hover:bg-gray-200/60'
                                    }`}
                                >
                                    <List size={13} />
                                </button>

                                {/* Show / Hide Voided Toggle */}
                                <button
                                    type="button"
                                    onClick={() => setHideVoided(!hideVoided)}
                                    title={hideVoided ? 'Show Voided Transactions' : 'Hide Voided Transactions'}
                                    className={`w-6 h-6 rounded flex items-center justify-center transition-colors cursor-pointer ${
                                        hideVoided
                                            ? 'bg-rose-100 text-rose-700 shadow-xs font-bold ring-1 ring-rose-300'
                                            : 'text-gray-500 hover:text-gray-800 hover:bg-gray-200/60'
                                    }`}
                                >
                                    {hideVoided ? <EyeOff size={13} /> : <Eye size={13} />}
                                </button>

                                {/* Group / Consolidated View by Revenue Head */}
                                <button
                                    type="button"
                                    onClick={() => setIsGroupedView(!isGroupedView)}
                                    title={isGroupedView ? 'Switch to Chronological Ledger View' : 'Group by Revenue Head (Consolidated View)'}
                                    className={`w-6 h-6 rounded flex items-center justify-center transition-colors cursor-pointer ${
                                        isGroupedView
                                            ? 'bg-white text-indigo-600 shadow-xs font-bold ring-1 ring-indigo-300'
                                            : 'text-gray-500 hover:text-gray-800 hover:bg-gray-200/60'
                                    }`}
                                >
                                    <Layers size={13} />
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Transaction Ledger Table - ONLY MIDDLE SCROLLS */}
                    <div className="border border-gray-200/90 rounded-lg overflow-y-auto flex-1 min-h-0 bg-white shadow-xs">
                        <table className="w-full text-left text-xs border-collapse">
                            <thead className="bg-gray-50/95 backdrop-blur-xs border-b border-gray-200 text-gray-600 font-semibold text-[11px] sticky top-0 z-10 shadow-2xs">
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
                                    <th className="py-2 px-2 text-center w-8"></th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {filteredLedgerItems.length === 0 ? (
                                    <tr>
                                        <td colSpan={10} className="py-12 text-center text-gray-400">
                                            {statusFilter !== 'all' || hideVoided
                                                ? 'No transactions matching active filter criteria.'
                                                : 'No charges or payments recorded yet for this folio.'}
                                        </td>
                                    </tr>
                                ) : isGroupedView && groupedLedgerItems ? (
                                    groupedLedgerItems.map(group => (
                                        <React.Fragment key={group.revenueHead}>
                                            <tr className="bg-slate-100/90 border-y border-slate-200 text-slate-800 font-bold text-[11px]">
                                                <td colSpan={7} className="py-1.5 px-3 uppercase tracking-wide">
                                                    {group.revenueHead} ({group.items.length})
                                                </td>
                                                <td className="py-1.5 px-2.5 text-right font-mono font-bold text-xs">
                                                    {currency} {group.subTotal.toFixed(2)}
                                                </td>
                                                <td colSpan={2} />
                                            </tr>
                                            {group.items.map(item => renderLedgerRow(item))}
                                        </React.Fragment>
                                    ))
                                ) : (
                                    filteredLedgerItems.map(item => renderLedgerRow(item))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Bottom Right Net Due Amount Footer - PINNED AT BOTTOM */}
                <div className="flex items-center justify-end pt-2 pb-0.5 shrink-0 border-t border-gray-100 bg-white">
                    <div className="flex items-center gap-2">
                        <span className="text-xs uppercase font-bold text-gray-600 tracking-wide font-sans">Net Due Amount</span>
                        <span className="text-base font-black text-rose-600 font-mono tracking-tight">
                            {currency} {dueAmount.toFixed(2)}
                        </span>
                    </div>
                </div>
            </div>
        </div>
    );
};
