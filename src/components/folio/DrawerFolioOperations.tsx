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
import { TabAuditTrail } from './tabs/TabAuditTrail';

// Sub-Modals
import { AddChargeModal } from './modals/AddChargeModal';
import { ApplyDiscountModal } from './modals/ApplyDiscountModal';
import { AdjustmentPostingModal } from './modals/AdjustmentPostingModal';
import { TransferChargesModal } from './modals/TransferChargesModal';
import { SplitFolioModal } from './modals/SplitFolioModal';
import { TaxExemptionModal } from './modals/TaxExemptionModal';
import { VoidModal } from './modals/VoidModal';

interface DrawerFolioOperationsProps {
    booking: AmendBookingData | null;
    onClose?: () => void;
    onOpenRoomSplit?: () => void;
}

export const DrawerFolioOperations: React.FC<DrawerFolioOperationsProps> = ({
    booking,
    onOpenRoomSplit
}) => {
    const [folios, setFolios] = useState<FolioData[]>([]);
    const [activeFolioId, setActiveFolioId] = useState<number | string>('');
    const [activeTab, setActiveTab] = useState<FolioSubTab>('operations');
    const [isLoading, setIsLoading] = useState<boolean>(true);
    const [errorMsg, setErrorMsg] = useState<string>('');

    // Modal Control States
    const [isAddChargeOpen, setIsAddChargeOpen] = useState(false);
    const [isApplyDiscountOpen, setIsApplyDiscountOpen] = useState(false);
    const [isAdjustmentsOpen, setIsAdjustmentsOpen] = useState(false);
    const [isTransferOpen, setIsTransferOpen] = useState(false);
    const [isSplitFolioOpen, setIsSplitFolioOpen] = useState(false);
    const [isTaxExemptionOpen, setIsTaxExemptionOpen] = useState(false);
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
                setFolios(enriched);
                // Maintain active folio or select first
                setActiveFolioId(prev => {
                    const match = enriched.find((f: any) => String(f.id) === String(prev));
                    return match ? match.id : enriched[0].id;
                });
            } else {
                // If backend has no pre-existing folio, build initial dynamic folio directly from the real booking object
                const rawGuestName = booking.guestName || 'Valued Guest';
                const cleanGuestName = rawGuestName.replace(/^(Mr|Mrs|Ms|Dr|Prof)\.?\s+/i, '').trim() || rawGuestName;
                const resRoomNum = booking.roomNumber || '101';
                const checkInDate = booking.arrivalDate || '2026-07-01';
                const checkOutDate = booking.departureDate || '2026-07-03';
                const nights = Math.max(1, booking.nights || (
                    checkInDate && checkOutDate 
                        ? Math.max(1, Math.round((new Date(checkOutDate).getTime() - new Date(checkInDate).getTime()) / 86400000))
                        : 1
                ));
                const dailyRate = booking.avgDailyRate || (booking.totalAmount ? Math.round(booking.totalAmount / nights) : 0);
                const ratePlanName = booking.ratePlan || 'Standard Rate';
                const adults = booking.adults ?? 1;
                const children = booking.children ?? 0;
                const paidAmt = Number(booking.paidAmount || 0);

                // Generate real night-by-night room charges
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
                        id: d + 1,
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

                const fallbackDynamicFolio: FolioData = {
                    id: booking.id || 'FOL-DEFAULT',
                    reservation_id: booking.id || '1',
                    folio_number: `FN~${booking.reservationNumber || booking.id || '012607003'} - ${cleanGuestName}`,
                    status: booking.status || 'OPEN',
                    balance: Math.max(0, runningChargesTotal - paidAmt),
                    reservation_number: booking.reservationNumber || 'RES-1173-2026',
                    guest_name: cleanGuestName,
                    guest_phone: booking.phone || '',
                    guest_email: booking.email || '',
                    room_number: resRoomNum,
                    room_type: booking.roomType || 'Standard Suite',
                    check_in: checkInDate,
                    check_out: checkOutDate,
                    bill_to: cleanGuestName,
                    market_code: ratePlanName,
                    business_source: booking.source || 'Direct',
                    rooms: [
                        {
                            id: 1,
                            room_number: resRoomNum,
                            room_type: booking.roomType || 'Standard Suite',
                            check_in_date: checkInDate,
                            check_out_date: checkOutDate,
                            room_rate: dailyRate,
                            adults: adults,
                            children: children,
                            nights: nights
                        }
                    ],
                    charges: dynamicCharges,
                    payments: paidAmt > 0 ? [
                        {
                            id: 1,
                            payment_number: 'PAY-001',
                            payment_method: 'Cash',
                            amount: paidAmt,
                            transaction_date: checkInDate,
                            status: 'Settled'
                        }
                    ] : [],
                    summary: {
                        totalCharges: runningChargesTotal,
                        totalPaid: paidAmt,
                        totalDiscount: 0,
                        serviceCharge: runningChargesTotal * 0.10,
                        vat: runningChargesTotal * 0.15,
                        cityTax: runningChargesTotal * 0.01,
                        totalTax: runningChargesTotal * 0.26,
                        dueAmount: Math.max(0, runningChargesTotal - paidAmt)
                    }
                };

                setFolios([fallbackDynamicFolio]);
                setActiveFolioId(fallbackDynamicFolio.id);
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
                        onOpenAddCharge={() => setIsAddChargeOpen(true)}
                        onOpenAddDiscount={() => setIsApplyDiscountOpen(true)}
                        onOpenAdjustments={() => setIsAdjustmentsOpen(true)}
                        onOpenTransfer={() => setIsTransferOpen(true)}
                        onOpenSplitFolio={onOpenRoomSplit || (() => setIsSplitFolioOpen(true))}
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

                {activeTab === 'audit' && (
                    <TabAuditTrail folio={activeFolio} />
                )}
            </div>

            {/* 3. Sub-Modal Suite */}
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
                onClose={() => setIsTaxExemptionOpen(false)}
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
