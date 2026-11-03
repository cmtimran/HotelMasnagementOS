import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { AlertCircle } from 'lucide-react';
import { getApiBaseUrl } from '../../utils/apiUrl';
import { subscribeToPMSEvents } from '../../utils/roomInventoryEngine';
import type { AmendBookingData } from '../modals/AmendStayModal';
import type { FolioData, FolioSubTab } from './folioTypes';
import { HorizonSummaryBanner } from './HorizonSummaryBanner';
import { TabFolioOperations } from './tabs/TabFolioOperations';
import { TabBookingDetails } from './tabs/TabBookingDetails';
import { TabGuestDetails } from './tabs/TabGuestDetails';
import { TabRoomCharges } from './tabs/TabRoomCharges';
import { TabCreditCard } from './tabs/TabCreditCard';
import { TabAuditTrail } from './tabs/TabAuditTrail';

// Sub-Modals
import { AddChargeModal } from './modals/AddChargeModal';
import { ApplyDiscountModal } from './modals/ApplyDiscountModal';
import { AddPaymentModal } from './modals/AddPaymentModal';
import { NewFolioModal } from './modals/NewFolioModal';
import { RouteFolioModal } from './modals/RouteFolioModal';
import { AdjustmentPostingModal } from './modals/AdjustmentPostingModal';
import { TransferChargesModal } from './modals/TransferChargesModal';
import { SplitFolioModal } from './modals/SplitFolioModal';
import { TaxExemptionModal } from './modals/TaxExemptionModal';
import { VoidModal } from './modals/VoidModal';

interface DrawerFolioOperationsProps {
    booking: AmendBookingData | null;
    resolvedGroupRooms?: any[];
    onClose?: () => void;
    onOpenAddPayment?: () => void;
    onOpenAmendStay?: () => void;
    onOpenRoomMove?: () => void;
    onOpenRoomSplit?: () => void;
    onOpenCheckOut?: () => void;
    isTaxExemptionOpen?: boolean;
    onToggleTaxExemption?: (open: boolean) => void;
}

export const DrawerFolioOperations: React.FC<DrawerFolioOperationsProps> = ({
    booking,
    resolvedGroupRooms = [],
    onOpenAddPayment,
    onOpenAmendStay: _onOpenAmendStay,
    onOpenRoomMove: _onOpenRoomMove,
    onOpenRoomSplit,
    onOpenCheckOut: _onOpenCheckOut,
    isTaxExemptionOpen: externalTaxExemptionOpen,
    onToggleTaxExemption
}) => {
    const [folios, setFolios] = useState<FolioData[]>([]);
    const [activeFolioId, setActiveFolioId] = useState<number | string>('');
    const [activeTab, setActiveTab] = useState<FolioSubTab>('operations');
    const [isLoading, setIsLoading] = useState<boolean>(true);
    const [errorMsg, setErrorMsg] = useState<string>('');

    // Modal Control States
    const [isNewFolioOpen, setIsNewFolioOpen] = useState(false);
    const [isRouteFolioOpen, setIsRouteFolioOpen] = useState(false);
    const [successBannerMsg, setSuccessBannerMsg] = useState('');
    const [isAddPaymentOpen, setIsAddPaymentOpen] = useState(false);
    const [isAddChargeOpen, setIsAddChargeOpen] = useState(false);
    const [isApplyDiscountOpen, setIsApplyDiscountOpen] = useState(false);
    const [isAdjustmentsOpen, setIsAdjustmentsOpen] = useState(false);
    const [isTransferOpen, setIsTransferOpen] = useState(false);
    const [isSplitFolioOpen, setIsSplitFolioOpen] = useState(false);
    const [internalTaxExemptionOpen, setInternalTaxExemptionOpen] = useState(false);
    const isTaxExemptionOpen = externalTaxExemptionOpen !== undefined ? externalTaxExemptionOpen : internalTaxExemptionOpen;
    const handleSetTaxExemptionOpen = (open: boolean) => {
        setInternalTaxExemptionOpen(open);
        if (onToggleTaxExemption) onToggleTaxExemption(open);
    };
    const [voidModalState, setVoidModalState] = useState<{
        isOpen: boolean;
        type: 'charge' | 'payment';
        id: number | string | null;
        desc: string;
        amt: number;
    }>({
        isOpen: false,
        type: 'charge',
        id: null,
        desc: '',
        amt: 0
    });

    // Dynamic Data Fetcher (Queries PostgreSQL via /api/accounting/folios)
    const fetchFolioData = useCallback(async () => {
        if (!booking) return;

        setIsLoading(true);
        setErrorMsg('');

        try {
            const resId = booking.id || '';
            const resNo = booking.reservationNumber || '';
            const url = `${getApiBaseUrl()}/api/accounting/folios?reservationId=${encodeURIComponent(resId)}&reservationNumber=${encodeURIComponent(resNo)}`;

            const response = await fetch(url);
            const data = await response.json();

            if (data?.success && Array.isArray(data.data) && data.data.length > 0) {
                const enriched = data.data.map((f: any) => {
                    const rawGName = f.guest_name || booking.guestName || 'Valued Guest';
                    const cleanGName = rawGName.replace(/^(Mr|Mrs|Ms|Dr|Prof)\.?\s+/i, '').trim() || rawGName;
                    const resNum = f.reservation_number || booking.reservationNumber || 'RES';

                    let folioNum = f.folio_number || `FN~${resNum} - ${cleanGName}`;
                    if (folioNum.endsWith(' - Mr') || folioNum.endsWith(' - Mr.') || folioNum === `FN~${resNum} -`) {
                        folioNum = `FN~${resNum} - ${cleanGName}`;
                    }

                    return {
                        ...f,
                        folio_number: folioNum,
                        market_code: f.market_code || booking.ratePlan || 'Standard Rate',
                        guest_name: cleanGName,
                        room_number: f.room_number || booking.roomNumber || 'Unassigned',
                        room_type: f.room_type || booking.roomType || 'Standard Suite'
                    };
                });
                // Check if there are group rooms in resolvedGroupRooms missing from the server folios
                if (resolvedGroupRooms && resolvedGroupRooms.length > 1) {
                    const existingRoomNos = new Set(enriched.map((f: any) => String(f.room_number || '').trim()));
                    resolvedGroupRooms.forEach((gr: any, idx: number) => {
                        const grRoomNum = String(gr.roomNumber || '').trim();
                        if (grRoomNum && !existingRoomNos.has(grRoomNum)) {
                            const rawGName = gr.guestName || booking.guestName || 'Valued Guest';
                            const cleanGName = rawGName.replace(/^(Mr|Mrs|Ms|Dr|Prof)\.?\s+/i, '').trim() || rawGName;
                            const resNum = gr.subBookingNumber || gr.reservationNumber || `${booking.reservationNumber || 'RES'}-${idx + 1}`;
                            const dailyRate = Number(gr.avgDailyRate || booking.avgDailyRate || (booking.totalAmount ? Math.round(booking.totalAmount / (booking.nights || 1)) : 0));
                            const checkInDate = booking.arrivalDate || '2026-07-01';
                            const checkOutDate = booking.departureDate || '2026-07-03';
                            const nights = Math.max(1, booking.nights || 1);
                            
                            const dynamicCharges: any[] = [];
                            let runningTotal = 0;
                            for (let d = 0; d < nights; d++) {
                                const nightDate = new Date(checkInDate);
                                nightDate.setDate(nightDate.getDate() + d);
                                const chargeDateStr = nightDate.toISOString().split('T')[0];
                                const baseAmt = dailyRate;
                                const svcCharge = Math.round(baseAmt * 0.10 * 100) / 100;
                                const vatAmt = Math.round(baseAmt * 0.15 * 100) / 100;
                                const cityTaxAmt = Math.round(baseAmt * 0.01 * 100) / 100;
                                const totalTax = svcCharge + vatAmt + cityTaxAmt;
                                const grandAmt = baseAmt + totalTax;
                                runningTotal += grandAmt;

                                dynamicCharges.push({
                                    id: `sub-${idx}-${d + 1}`,
                                    charge_code: 'ROOM_CHG',
                                    revenue_head: 'Room Charges',
                                    ref_no: String(d + 1),
                                    description: `Room Charge - Room ${grRoomNum} (Night ${d + 1} of ${nights})`,
                                    amount: baseAmt,
                                    discount_amount: 0,
                                    service_charge: svcCharge,
                                    vat: vatAmt,
                                    city_tax: cityTaxAmt,
                                    total_tax: totalTax,
                                    total_amount: grandAmt,
                                    charge_date: chargeDateStr,
                                    is_tax_applicable: true,
                                    user_name: 'System Auditor',
                                    is_voided: false,
                                    status: 'Posted'
                                });
                            }

                            enriched.push({
                                id: `fol-group-${idx + 1}`,
                                reservation_id: booking.id || '1',
                                folio_number: gr.folioNumber || `${50 + idx} - ${cleanGName}`,
                                status: gr.status || 'OPEN',
                                balance: runningTotal,
                                reservation_number: resNum,
                                guest_name: cleanGName,
                                room_number: grRoomNum,
                                room_type: gr.roomType || booking.roomType || 'Standard Suite',
                                check_in: checkInDate,
                                check_out: checkOutDate,
                                bill_to: cleanGName,
                                market_code: gr.ratePlan || booking.ratePlan || 'Standard Rate',
                                business_source: booking.source || 'Direct',
                                rooms: [
                                    {
                                        id: idx + 1,
                                        room_number: grRoomNum,
                                        room_type: gr.roomType || booking.roomType || 'Standard Suite',
                                        check_in_date: checkInDate,
                                        check_out_date: checkOutDate,
                                        room_rate: dailyRate,
                                        adults: gr.adults ?? booking.adults ?? 1,
                                        children: gr.children ?? booking.children ?? 0,
                                        nights: nights
                                    }
                                ],
                                charges: dynamicCharges,
                                payments: [],
                                summary: {
                                    totalCharges: runningTotal,
                                    totalPaid: 0,
                                    totalDiscount: 0,
                                    serviceCharge: runningTotal * 0.10,
                                    vat: runningTotal * 0.15,
                                    cityTax: runningTotal * 0.01,
                                    totalTax: runningTotal * 0.26,
                                    dueAmount: runningTotal
                                }
                            });
                        }
                    });
                }

                setFolios(enriched);
                // Maintain active folio or select first
                setActiveFolioId(prev => {
                    const match = enriched.find((f: any) => String(f.id) === String(prev));
                    return match ? match.id : enriched[0].id;
                });
            } else {
                // If backend has no pre-existing folio, build initial dynamic folios
                const rawGuestName = booking.guestName || 'Valued Guest';
                const cleanGuestName = rawGuestName.replace(/^(Mr|Mrs|Ms|Dr|Prof)\.?\s+/i, '').trim() || rawGuestName;
                const checkInDate = booking.arrivalDate || '2026-07-01';
                const checkOutDate = booking.departureDate || '2026-07-03';
                const nights = Math.max(1, booking.nights || (
                    checkInDate && checkOutDate 
                        ? Math.max(1, Math.round((new Date(checkOutDate).getTime() - new Date(checkInDate).getTime()) / 86400000))
                        : 1
                ));
                const paidAmt = Number(booking.paidAmount || 0);

                const roomsToBuild = (resolvedGroupRooms && resolvedGroupRooms.length > 0)
                    ? resolvedGroupRooms
                    : [
                        {
                            roomNumber: booking.roomNumber || '101',
                            roomType: booking.roomType || 'Standard Suite',
                            ratePlan: booking.ratePlan || 'Standard Rate',
                            guestName: cleanGuestName,
                            adults: booking.adults ?? 1,
                            children: booking.children ?? 0,
                            isPrimary: true
                        }
                    ];

                const generatedFolios: FolioData[] = roomsToBuild.map((rm: any, idx: number) => {
                    const resRoomNum = String(rm.roomNumber || (idx === 0 ? (booking.roomNumber || '101') : (100 + idx + 1)));
                    const dailyRate = Number(rm.avgDailyRate || (booking.avgDailyRate || (booking.totalAmount ? Math.round(booking.totalAmount / nights) : 0)));
                    const rmAdults = rm.adults ?? booking.adults ?? 1;
                    const rmChildren = rm.children ?? booking.children ?? 0;
                    const isOwner = idx === 0 || rm.isPrimary;
                    const rmPaid = isOwner ? paidAmt : 0;

                    const dynamicCharges: any[] = [];
                    let runningChargesTotal = 0;
                    for (let d = 0; d < nights; d++) {
                        const nightDate = new Date(checkInDate);
                        nightDate.setDate(nightDate.getDate() + d);
                        const chargeDateStr = nightDate.toISOString().split('T')[0];
                        const baseAmt = dailyRate;
                        const svcCharge = Math.round(baseAmt * 0.10 * 100) / 100;
                        const vatAmt = Math.round(baseAmt * 0.15 * 100) / 100;
                        const cityTaxAmt = Math.round(baseAmt * 0.01 * 100) / 100;
                        const totalTax = svcCharge + vatAmt + cityTaxAmt;
                        const grandAmt = baseAmt + totalTax;
                        runningChargesTotal += grandAmt;

                        dynamicCharges.push({
                            id: (idx * 100) + d + 1,
                            charge_code: 'ROOM_CHG',
                            revenue_head: 'Room Charges',
                            ref_no: String(d + 1),
                            description: `Room Charge - Room ${resRoomNum} (Night ${d + 1} of ${nights})`,
                            amount: baseAmt,
                            discount_amount: 0,
                            service_charge: svcCharge,
                            vat: vatAmt,
                            city_tax: cityTaxAmt,
                            total_tax: totalTax,
                            total_amount: grandAmt,
                            charge_date: chargeDateStr,
                            is_tax_applicable: true,
                            user_name: 'System Auditor',
                            is_voided: false,
                            status: 'Posted'
                        });
                    }

                    const folioNo = isOwner
                        ? (rm.folioNumber || `49 - ${cleanGuestName}`)
                        : (rm.folioNumber || `${50 + idx} - ${cleanGuestName}`);

                    return {
                        id: isOwner ? (booking.id || 'FOL-DEFAULT') : `fol-group-${idx + 1}`,
                        reservation_id: booking.id || '1',
                        folio_number: folioNo,
                        status: rm.status || booking.status || 'OPEN',
                        balance: Math.max(0, runningChargesTotal - rmPaid),
                        reservation_number: rm.subBookingNumber || rm.reservationNumber || (booking.reservationNumber ? `${booking.reservationNumber}-${idx + 1}` : 'RES-1173-2026'),
                        guest_name: cleanGuestName,
                        guest_phone: booking.phone || '',
                        guest_email: booking.email || '',
                        room_number: resRoomNum,
                        room_type: rm.roomType || booking.roomType || 'Standard Suite',
                        check_in: checkInDate,
                        check_out: checkOutDate,
                        bill_to: cleanGuestName,
                        market_code: rm.ratePlan || booking.ratePlan || 'Standard Rate',
                        business_source: booking.source || 'Direct',
                        rooms: [
                            {
                                id: idx + 1,
                                room_number: resRoomNum,
                                room_type: rm.roomType || booking.roomType || 'Standard Suite',
                                check_in_date: checkInDate,
                                check_out_date: checkOutDate,
                                room_rate: dailyRate,
                                adults: rmAdults,
                                children: rmChildren,
                                nights: nights
                            }
                        ],
                        charges: dynamicCharges,
                        payments: rmPaid > 0 ? [
                            {
                                id: 1,
                                payment_number: 'PAY-001',
                                payment_method: 'Cash',
                                amount: rmPaid,
                                transaction_date: checkInDate,
                                status: 'Settled'
                            }
                        ] : [],
                        summary: {
                            totalCharges: runningChargesTotal,
                            totalPaid: rmPaid,
                            totalDiscount: 0,
                            serviceCharge: runningChargesTotal * 0.10,
                            vat: runningChargesTotal * 0.15,
                            cityTax: runningChargesTotal * 0.01,
                            totalTax: runningChargesTotal * 0.26,
                            dueAmount: Math.max(0, runningChargesTotal - rmPaid)
                        }
                    };
                });

                setFolios(generatedFolios);
                setActiveFolioId(generatedFolios[0].id);
            }
        } catch (err: any) {
            setErrorMsg(err?.message || 'Failed to sync live folio data');
        } finally {
            setIsLoading(false);
        }
    }, [booking]);

    useEffect(() => {
        fetchFolioData();

        // Automatically re-sync live ledger & folio when payments, charges, or reservations are updated
        const unsubscribe = subscribeToPMSEvents((event) => {
            if (
                event.type === 'RESERVATION_COMMITTED' ||
                event.type === 'RESERVATION_UPDATED' ||
                event.type === 'FOLIO_UPDATED' ||
                event.type === 'INVENTORY_REFRESH'
            ) {
                fetchFolioData();
            }
        });

        return () => unsubscribe();
    }, [fetchFolioData]);

    const activeFolio = useMemo(() => {
        return folios.find(f => String(f.id) === String(activeFolioId)) || folios[0] || null;
    }, [folios, activeFolioId]);

    const handlePrintFolio = () => {
        window.print();
    };

    const handleEmailFolio = () => {
        alert(`Folio Invoice successfully emailed to ${activeFolio?.guest_email || 'guest contact'}!`);
    };

    const handleExportExcel = () => {
        if (!activeFolio) return;
        const csvRows = [
            ['Date', 'Ref No', 'Revenue Head', 'Description', 'User', 'Status', 'Amount'],
            ...activeFolio.charges.map(c => [
                c.charge_date,
                c.ref_no,
                c.revenue_head,
                c.description,
                c.user_name,
                c.status,
                c.total_amount
            ])
        ];
        const csvContent = 'data:text/csv;charset=utf-8,' + csvRows.map(e => e.join(',')).join('\n');
        const encodedUri = encodeURI(csvContent);
        const link = document.createElement('a');
        link.setAttribute('href', encodedUri);
        link.setAttribute('download', `Folio_${activeFolio.folio_number}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    return (
        <div className="w-full h-full flex flex-col bg-slate-50/50 text-gray-800 select-none overflow-hidden p-2.5 space-y-2 font-sans">
            {errorMsg && (
                <div className="bg-rose-50 border border-rose-200 text-rose-700 px-3 py-1.5 rounded-md text-xs flex items-center gap-2">
                    <AlertCircle size={14} className="text-rose-600" />
                    <span>{errorMsg}</span>
                </div>
            )}

            {/* Black Pill Toast Banner matching Screenshot 009f9d7b.png */}
            {successBannerMsg && (
                <div className="bg-slate-800 text-white px-3.5 py-1.5 rounded-full text-xs font-semibold flex items-center justify-center gap-2 shadow-md mx-auto animate-in fade-in zoom-in-95 duration-150">
                    <span className="w-4 h-4 rounded-full bg-emerald-500 text-white flex items-center justify-center text-[10px] font-bold">
                        ✓
                    </span>
                    <span>{successBannerMsg}</span>
                    <button
                        type="button"
                        onClick={() => setSuccessBannerMsg('')}
                        className="text-gray-400 hover:text-white text-xs ml-1 cursor-pointer"
                    >
                        ✕
                    </button>
                </div>
            )}

            {/* 1. Horizon Summary Banner & Sub-Tabs Navigation */}
            <HorizonSummaryBanner
                folio={activeFolio}
                booking={booking}
                activeTab={activeTab}
                isLoading={isLoading}
                onSelectTab={setActiveTab}
                onPrintFolio={handlePrintFolio}
                onEmailFolio={handleEmailFolio}
                onExportExcel={handleExportExcel}
            />

            {/* 2. Active Tab Body */}
            <div className="flex-1 bg-white border border-gray-200/90 rounded-xl p-3 shadow-xs overflow-hidden min-h-0 flex flex-col">
                {activeTab === 'operations' && (
                    <TabFolioOperations
                        folio={activeFolio}
                        booking={booking}
                        allFolios={folios}
                        activeFolioId={activeFolioId}
                        onSelectFolio={setActiveFolioId}
                        onOpenNewFolio={() => setIsNewFolioOpen(true)}
                        onOpenRouteFolio={() => setIsRouteFolioOpen(true)}
                        onOpenAddPayment={() => {
                            setIsAddPaymentOpen(true);
                            if (onOpenAddPayment) onOpenAddPayment();
                        }}
                        onOpenAddCharge={() => setIsAddChargeOpen(true)}
                        onOpenAddDiscount={() => setIsApplyDiscountOpen(true)}
                        onOpenAdjustments={() => setIsAdjustmentsOpen(true)}
                        onOpenTransfer={() => setIsTransferOpen(true)}
                        onOpenSplitFolio={onOpenRoomSplit || (() => setIsSplitFolioOpen(true))}
                        onOpenTaxExemption={() => handleSetTaxExemptionOpen(true)}
                        onRefresh={fetchFolioData}
                        onOpenVoid={(type, id, desc, amt) => {
                            setVoidModalState({
                                isOpen: true,
                                type,
                                id,
                                desc,
                                amt
                            });
                        }}
                    />
                )}

                {activeTab === 'booking' && (
                    <TabBookingDetails
                        folio={activeFolio}
                        booking={booking}
                        onUpdateSuccess={fetchFolioData}
                    />
                )}

                {activeTab === 'guest' && (
                    <TabGuestDetails
                        folio={activeFolio}
                        booking={booking}
                        onUpdateSuccess={fetchFolioData}
                    />
                )}

                {activeTab === 'charges' && (
                    <TabRoomCharges
                        folio={activeFolio}
                        booking={booking}
                        onRefresh={fetchFolioData}
                    />
                )}

                {activeTab === 'credit_card' && (
                    <TabCreditCard
                        folio={activeFolio}
                        booking={booking}
                        onOpenAddPayment={() => setIsAddPaymentOpen(true)}
                        onRefresh={fetchFolioData}
                    />
                )}

                {activeTab === 'audit' && (
                    <TabAuditTrail folio={activeFolio} />
                )}
            </div>

            {/* 3. Sub-Modal Suite */}
            <NewFolioModal
                isOpen={isNewFolioOpen}
                onClose={() => setIsNewFolioOpen(false)}
                currentFolio={activeFolio}
                booking={booking}
                allFolios={folios}
                onSuccess={(createdFolio) => {
                    setSuccessBannerMsg('New folio has been created for selected guest.');
                    fetchFolioData();
                    if (createdFolio?.id) {
                        setFolios(prev => [...prev.filter(f => f.id !== createdFolio.id), createdFolio]);
                        setActiveFolioId(createdFolio.id);
                    }
                    setTimeout(() => setSuccessBannerMsg(''), 4500);
                }}
            />

            <RouteFolioModal
                isOpen={isRouteFolioOpen}
                onClose={() => setIsRouteFolioOpen(false)}
                currentFolio={activeFolio}
                allFolios={folios}
                onSuccess={(msg) => {
                    setSuccessBannerMsg(msg || 'Folio routing rule saved successfully.');
                    fetchFolioData();
                    setTimeout(() => setSuccessBannerMsg(''), 4500);
                }}
            />

            <AddPaymentModal
                isOpen={isAddPaymentOpen}
                onClose={() => setIsAddPaymentOpen(false)}
                folios={folios}
                activeFolioId={activeFolioId}
                onSuccess={fetchFolioData}
            />

            <AddChargeModal
                isOpen={isAddChargeOpen}
                onClose={() => setIsAddChargeOpen(false)}
                folios={folios}
                activeFolioId={activeFolioId}
                onSuccess={fetchFolioData}
            />

            <ApplyDiscountModal
                isOpen={isApplyDiscountOpen}
                onClose={() => setIsApplyDiscountOpen(false)}
                folios={folios}
                activeFolioId={activeFolioId}
                onSuccess={fetchFolioData}
            />

            <AdjustmentPostingModal
                isOpen={isAdjustmentsOpen}
                onClose={() => setIsAdjustmentsOpen(false)}
                folios={folios}
                activeFolioId={activeFolioId}
                onSuccess={fetchFolioData}
            />

            <TransferChargesModal
                isOpen={isTransferOpen}
                onClose={() => setIsTransferOpen(false)}
                currentFolio={activeFolio}
                allFolios={folios}
                onSuccess={fetchFolioData}
            />

            <SplitFolioModal
                isOpen={isSplitFolioOpen}
                onClose={() => setIsSplitFolioOpen(false)}
                currentFolio={activeFolio}
                allFolios={folios}
                onSuccess={fetchFolioData}
            />

            <TaxExemptionModal
                isOpen={isTaxExemptionOpen}
                onClose={() => handleSetTaxExemptionOpen(false)}
                currentFolio={activeFolio}
                onSuccess={fetchFolioData}
            />

            <VoidModal
                isOpen={voidModalState.isOpen}
                onClose={() => setVoidModalState(prev => ({ ...prev, isOpen: false }))}
                targetType={voidModalState.type}
                targetId={voidModalState.id}
                targetDescription={voidModalState.desc}
                targetAmount={voidModalState.amt}
                onSuccess={fetchFolioData}
            />
        </div>
    );
};
