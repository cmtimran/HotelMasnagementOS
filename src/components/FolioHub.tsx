import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
    Receipt, FileText, CreditCard, Plus, Search,
    ArrowRightLeft, Printer, ShieldCheck,
    X, Check, RotateCcw, AlertCircle,
    Tag, Split, Users, Mail, Clock, Building2,
    ShieldAlert, Sparkles, UserCheck, AlertTriangle
} from 'lucide-react';
import {
    broadcastPMSEvent,
    getAllStoredReservations,
    syncReservationsFromDB,
    getOperatingSystemDate,
    type StoredReservation
} from '../utils/roomInventoryEngine';
import PageHeader from './common/PageHeader';
import { toast } from '../context/ToastContext';

// ---------------------------------------------------------------------------
// DATA CONTRACTS
// ---------------------------------------------------------------------------

export type ChargeCategory = 'Room' | 'F&B' | 'Transport' | 'Laundry' | 'Spa' | 'Minibar' | 'Payment' | 'Tax' | 'Adjustment' | 'Retention';

export interface FolioTransaction {
    id: string | number;
    date: string;
    refNo: string;
    particulars: string;
    description: string;
    user: string;
    amount: number; // positive = credit/payment, negative = debit/charge
    windowId: 1 | 2;
    category: ChargeCategory;
    isTaxExempt?: boolean;
    exemptionReason?: string;
    isVoided?: boolean;
    voidReason?: string;
    voidedBy?: string;
    voidedAt?: string;
    voucherNumber?: string;
    routedFrom?: string;
}

export type BillToType = 'GUEST' | 'COMPANY' | 'TRAVEL_AGENT';

export interface FolioAccount {
    id: number;
    reservationNumber: string;
    roomNumber: string;
    guestName: string;
    guestPhone?: string;
    guestEmail?: string;
    folioNumber: string;
    roomType: string;
    checkIn: string;
    checkOut: string;
    nights: number;
    billTo: BillToType;
    companyName?: string;
    companyTaxId?: string; // BIN / GSTIN / TIN
    companyAddress?: string;
    travelAgentName?: string;
    travelAgentCode?: string;
    travelAgentTaxId?: string;
    groupCode?: string;
    isTaxExempt: boolean;
    taxExemptionType?: string;
    taxExemptionCert?: string;
    hasRoutingRules: boolean;
    routedIncidentalsWindow: 1 | 2;
    isProformaOnly?: boolean;
    fiscalInvoiceNumber?: string;
    status: 'OPEN' | 'SETTLED' | 'CLOSED' | 'TRANSFERRED_TO_CITY_LEDGER';
    transactions: FolioTransaction[];
}

export interface RoutingRule {
    category: ChargeCategory;
    targetWindow: 1 | 2;
    billTo: BillToType;
    description: string;
}

// ---------------------------------------------------------------------------
// MASTER FOLIO OPERATIONS COMPONENT
// ---------------------------------------------------------------------------

export const FolioHub: React.FC = () => {
    // Top-Level State
    const [folios, setFolios] = useState<FolioAccount[]>(() => {
        try {
            const saved = typeof window !== 'undefined' ? localStorage.getItem('hotel_folios_hub_v1') : null;
            if (saved) {
                const parsed = JSON.parse(saved);
                if (Array.isArray(parsed) && parsed.length > 0) return parsed;
            }
        } catch {}
        return [];
    });

    const [selectedFolioId, setSelectedFolioId] = useState<number>(1);
    const [activeTab, setActiveTab] = useState<'windows' | 'routing' | 'group' | 'cancelled-deposits' | 'invoice'>('windows');
    const [searchFilter, setSearchFilter] = useState('');
    const [statusFilter, setStatusFilter] = useState<'ALL' | 'IN_HOUSE' | 'DUE_OUT' | 'SETTLED'>('ALL');

    // Multi-Select for Cut / Split Folio
    const [selectedTxnIds, setSelectedTxnIds] = useState<Set<string | number>>(new Set());

    // Modals
    const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
    const [isExtraChargeModalOpen, setIsExtraChargeModalOpen] = useState(false);
    const [isTaxExemptionModalOpen, setIsTaxExemptionModalOpen] = useState(false);
    const [isBillToModalOpen, setIsBillToModalOpen] = useState(false);
    const [isVoidPaymentModalOpen, setIsVoidPaymentModalOpen] = useState(false);
    const [isEmailInvoiceModalOpen, setIsEmailInvoiceModalOpen] = useState(false);
    const [isPrintSlipModalOpen, setIsPrintSlipModalOpen] = useState(false);
    const [isTaxIdModalOpen, setIsTaxIdModalOpen] = useState(false);
    const [isSettleDepositModalOpen, setIsSettleDepositModalOpen] = useState(false);

    // Selected Targets for Modals
    const [targetPaymentTxn, setTargetPaymentTxn] = useState<FolioTransaction | null>(null);
    const [targetChargeSlip, setTargetChargeSlip] = useState<FolioTransaction | null>(null);
    const [targetCancelledRes, setTargetCancelledRes] = useState<StoredReservation | null>(null);

    // Form States
    const [paymentForm, setPaymentForm] = useState({
        amount: 0,
        method: 'Cash BDT' as 'Cash BDT' | 'Visa Card' | 'MasterCard' | 'Amex Card' | 'bKash MFS' | 'Nagad MFS' | 'Bank Transfer' | 'City Ledger (Direct Bill)',
        referenceCode: '',
        targetWindow: 1 as 1 | 2,
        notes: ''
    });

    const [extraChargeForm, setExtraChargeForm] = useState({
        department: 'F&B Room Service' as string,
        description: 'Chef Special Dinner & Beverages',
        unitPrice: 1500,
        quantity: 1,
        isTaxExempt: false,
        exemptionReason: '',
        targetWindow: 2 as 1 | 2, // Defaults to Window 2 according to standard routing
        remarks: ''
    });

    const [taxExemptForm, setTaxExemptForm] = useState({
        exemptionType: 'Diplomatic Mission / Embassy' as 'Diplomatic Mission / Embassy' | 'UN / International Agency' | 'Government Official / Ministry' | 'Export of Services / Zero-Rated',
        certificateNumber: 'DIP-EXEMPT-2026-089',
        reason: 'Diplomatic Privileges and Immunities Act'
    });

    const [billToForm, setBillToForm] = useState({
        billTo: 'COMPANY' as BillToType,
        companyName: 'Standard Chartered Bank Ltd',
        companyTaxId: 'BIN-192837465-2026',
        companyAddress: 'Level 14, SCB Tower, Gulshan-2, Dhaka',
        travelAgentName: 'Booking.com B.V.',
        travelAgentCode: 'BKNG-INTL-902',
        travelAgentTaxId: 'NL805734958B01'
    });

    const [taxIdInput, setTaxIdInput] = useState('');
    const [voidReasonInput, setVoidReasonInput] = useState('');
    const [voidSupervisorPin, setVoidSupervisorPin] = useState('');

    const [emailForm, setEmailForm] = useState({
        recipientType: 'guest' as 'guest' | 'company' | 'agent' | 'custom',
        emailTo: '',
        emailCc: '',
        invoiceType: 'tax-invoice' as 'tax-invoice' | 'proforma' | 'corporate-summary',
        subject: 'Hotel Invoice & Folio Statement',
        message: 'Dear Guest,\n\nPlease find attached your official Hotel Folio Statement & Tax Invoice. Thank you for staying with us.'
    });

    const [depositSettleForm, setDepositSettleForm] = useState({
        settleOption: 'RETENTION' as 'RETENTION' | 'REFUND' | 'PARTIAL' | 'VOUCHER',
        retentionAmount: 5000,
        refundAmount: 0,
        refundMethod: 'bKash MFS',
        reason: 'Cancellation forfeiture under 48-hr policy'
    });

    // ---------------------------------------------------------------------------
    // BUILD FOLIOS FROM REAL DATABASE / STORED RESERVATIONS
    // ---------------------------------------------------------------------------

    const buildFoliosFromDB = useCallback((): FolioAccount[] => {
        const canonical = getAllStoredReservations();
        const purgeTarget = 'RES-202610290007';

        const filtered = canonical.filter(r => {
            const no = String(r.reservationNumber || r.id || '');
            const guest = String(r.guestName || r.guest?.fullName || '').toLowerCase();
            return (
                no !== purgeTarget &&
                !no.includes('202610290007') &&
                !no.startsWith('RES-0092') &&
                !no.startsWith('RES-0091') &&
                !guest.includes('robert langdon') &&
                !guest.includes('naimur') &&
                !guest.includes('tahmina')
            );
        });

        if (filtered.length === 0) {
            return [];
        }

        return filtered.map((r, idx) => {
            const folioId = Number(r.id) || (idx + 1);
            const nights = Number(r.nights) || Math.max(1, Math.round((new Date(r.checkOut).getTime() - new Date(r.checkIn).getTime()) / 86400000)) || 1;
            const total = Number(r.totalAmount) || Number(r.totalRate) || 0;
            const paid = Number(r.paidAmount) || 0;

            const roomLabel = (r.isConnectingSuite && r.allocatedRooms && r.allocatedRooms.length > 1)
                ? r.allocatedRooms.join(' + ')
                : (r.roomNumber || (r.allocatedRooms && r.allocatedRooms[0]) || 'Unassigned');

            const txns: FolioTransaction[] = [
                {
                    id: `tar-${folioId}`,
                    date: `${r.checkIn || '2026-07-01'} 14:00`,
                    refNo: `TAR-${r.reservationNumber || folioId}`,
                    particulars: `Room Accommodation Tariff (${nights} Night${nights > 1 ? 's' : ''})`,
                    description: `${r.roomType || 'Standard Room'} base charge`,
                    user: 'system_night_audit',
                    amount: -total,
                    windowId: 1,
                    category: 'Room',
                    isTaxExempt: false
                }
            ];

            if (paid > 0) {
                txns.push({
                    id: `pmt-${folioId}`,
                    date: `${r.checkIn || '2026-07-01'} 14:15`,
                    refNo: `PAY-REC-${folioId}`,
                    particulars: `Advance Deposit (${r.paymentMethod || 'Cash'})`,
                    description: 'Collected at reservation booking',
                    user: 'frontdesk_cashier',
                    amount: paid,
                    windowId: 1,
                    category: 'Payment'
                });
            }

            return {
                id: folioId,
                reservationNumber: r.reservationNumber || `RES-${folioId}`,
                roomNumber: roomLabel,
                guestName: r.guestName || r.guest?.fullName || 'Valued Guest',
                guestPhone: r.phone || r.guest?.phone,
                guestEmail: r.email || r.guest?.email,
                folioNumber: r.folioNumber || (r.reservationNumber ? `FOL-${r.reservationNumber.replace(/^RES-/, '')}` : `FOL-100${folioId}`),
                roomType: r.roomType || 'Deluxe Room',
                checkIn: r.checkIn || '2026-07-01',
                checkOut: r.checkOut || '2026-07-03',
                nights,
                billTo: (r.source === 'Corporate Account' ? 'COMPANY' : r.source?.includes('OTA') || r.source?.includes('Booking') ? 'TRAVEL_AGENT' : 'GUEST') as BillToType,
                companyName: r.source === 'Corporate Account' ? 'Standard Chartered Bank Ltd' : undefined,
                companyTaxId: r.source === 'Corporate Account' ? 'BIN-192837465-2026' : undefined,
                companyAddress: r.source === 'Corporate Account' ? 'Gulshan-2, Dhaka' : undefined,
                groupCode: r.groupCode,
                isTaxExempt: false,
                hasRoutingRules: true,
                routedIncidentalsWindow: 2,
                status: (r.status?.toUpperCase() === 'CHECKED_OUT' ? 'SETTLED' : 'OPEN') as any,
                transactions: txns
            };
        });
    }, []);

    // Initial Load & Event Sync
    useEffect(() => {
        syncReservationsFromDB();
        const built = buildFoliosFromDB();
        if (built.length > 0) {
            setFolios(built);
            setSelectedFolioId(built[0].id);
        }

        const handleSync = () => {
            syncReservationsFromDB();
            const refreshed = buildFoliosFromDB();
            if (refreshed.length > 0) {
                setFolios(refreshed);
            }
        };

        window.addEventListener('hotel_pms_sync_event', handleSync);
        return () => window.removeEventListener('hotel_pms_sync_event', handleSync);
    }, [buildFoliosFromDB]);

    // Save to Local Storage Cache
    useEffect(() => {
        try {
            localStorage.setItem('hotel_folios_hub_v1', JSON.stringify(folios));
        } catch {}
    }, [folios]);

    // Selected Folio
    const currentFolio = useMemo(() => {
        return folios.find(f => f.id === selectedFolioId) || folios[0] || null;
    }, [folios, selectedFolioId]);

    // Financial Totals for Current Folio
    const window1Charges = useMemo(() => {
        if (!currentFolio) return 0;
        return currentFolio.transactions
            .filter(t => t.windowId === 1 && !t.isVoided && t.amount < 0)
            .reduce((sum, t) => sum + Math.abs(t.amount), 0);
    }, [currentFolio]);

    const window1Credits = useMemo(() => {
        if (!currentFolio) return 0;
        return currentFolio.transactions
            .filter(t => t.windowId === 1 && !t.isVoided && t.amount > 0)
            .reduce((sum, t) => sum + t.amount, 0);
    }, [currentFolio]);

    const window1Balance = window1Charges - window1Credits;

    const window2Charges = useMemo(() => {
        if (!currentFolio) return 0;
        return currentFolio.transactions
            .filter(t => t.windowId === 2 && !t.isVoided && t.amount < 0)
            .reduce((sum, t) => sum + Math.abs(t.amount), 0);
    }, [currentFolio]);

    const window2Credits = useMemo(() => {
        if (!currentFolio) return 0;
        return currentFolio.transactions
            .filter(t => t.windowId === 2 && !t.isVoided && t.amount > 0)
            .reduce((sum, t) => sum + t.amount, 0);
    }, [currentFolio]);

    const window2Balance = window2Charges - window2Credits;
    const totalFolioBalance = window1Balance + window2Balance;

    // Filtered Folios List for Navigation Carousel
    const filteredFolios = useMemo(() => {
        return folios.filter(f => {
            const matchesSearch =
                f.guestName.toLowerCase().includes(searchFilter.toLowerCase()) ||
                f.roomNumber.toLowerCase().includes(searchFilter.toLowerCase()) ||
                f.folioNumber.toLowerCase().includes(searchFilter.toLowerCase()) ||
                (f.groupCode && f.groupCode.toLowerCase().includes(searchFilter.toLowerCase()));

            if (!matchesSearch) return false;
            if (statusFilter === 'IN_HOUSE') return f.status === 'OPEN';
            if (statusFilter === 'SETTLED') return f.status === 'SETTLED' || f.status === 'TRANSFERRED_TO_CITY_LEDGER';
            return true;
        });
    }, [folios, searchFilter, statusFilter]);

    // ---------------------------------------------------------------------------
    // CORE OPERATIONS HANDLERS
    // ---------------------------------------------------------------------------

    // OP 01: Take Payment / Settle Bill
    const handleSettlePayment = () => {
        if (!currentFolio || paymentForm.amount <= 0) {
            toast.warning('Please enter a valid payment amount.');
            return;
        }

        const newTxn: FolioTransaction = {
            id: `pay-${Date.now()}`,
            date: `${getOperatingSystemDate()} 15:30`,
            refNo: paymentForm.referenceCode || `PAY-${Math.floor(100000 + Math.random() * 900000)}`,
            particulars: `Payment Received (${paymentForm.method})`,
            description: paymentForm.notes || 'Settled at cashier till',
            user: 'fo_cashier_01',
            amount: Number(paymentForm.amount),
            windowId: paymentForm.targetWindow,
            category: 'Payment'
        };

        const updatedFolios = folios.map(f => {
            if (f.id === currentFolio.id) {
                const updatedTxns = [...f.transactions, newTxn];
                return { ...f, transactions: updatedTxns };
            }
            return f;
        });

        setFolios(updatedFolios);
        setIsPaymentModalOpen(false);
        setPaymentForm({ ...paymentForm, amount: 0, referenceCode: '', notes: '' });
        toast.success(`Payment of ৳${paymentForm.amount.toLocaleString()} posted to Window ${paymentForm.targetWindow}!`);
        broadcastPMSEvent({ type: 'FOLIO_UPDATED', folioId: currentFolio.id });
    };

    // OP 03 & OP 16: Add Extra Charges (With Item-Level Tax Exemption Toggle)
    const handleAddExtraCharge = () => {
        if (!currentFolio || extraChargeForm.unitPrice <= 0) {
            toast.warning('Please enter valid charge rate.');
            return;
        }

        const qty = Math.max(1, extraChargeForm.quantity);
        const base = extraChargeForm.unitPrice * qty;
        const taxRate = extraChargeForm.isTaxExempt || currentFolio.isTaxExempt ? 0 : 0.15; // 15% VAT
        const scRate = extraChargeForm.isTaxExempt || currentFolio.isTaxExempt ? 0 : 0.10;  // 10% Service Charge
        const total = base * (1 + taxRate + scRate);

        const categoryMap: Record<string, ChargeCategory> = {
            'F&B Room Service': 'F&B',
            'Minibar': 'Minibar',
            'Laundry': 'Laundry',
            'Airport Transfer': 'Transport',
            'Spa & Wellness': 'Spa'
        };

        const assignedCategory = categoryMap[extraChargeForm.department] || 'Adjustment';

        // Automated Folio Routing: Extra charges automatically post to Window 2 unless overridden
        const targetWindow = currentFolio.hasRoutingRules ? currentFolio.routedIncidentalsWindow : extraChargeForm.targetWindow;

        const newChargeTxn: FolioTransaction = {
            id: `chg-${Date.now()}`,
            date: `${getOperatingSystemDate()} 16:45`,
            refNo: `CHG-${Math.floor(1000 + Math.random() * 9000)}`,
            particulars: `${extraChargeForm.department}: ${extraChargeForm.description} (x${qty})`,
            description: extraChargeForm.isTaxExempt ? 'Tax Exempt Ancillary Service' : 'Standard taxable hotel service charge',
            user: 'outlet_pos',
            amount: -Math.round(total),
            windowId: targetWindow,
            category: assignedCategory,
            isTaxExempt: extraChargeForm.isTaxExempt,
            exemptionReason: extraChargeForm.exemptionReason,
            voucherNumber: `VCH-${Math.floor(10000 + Math.random() * 90000)}`
        };

        const updated = folios.map(f => {
            if (f.id === currentFolio.id) {
                return { ...f, transactions: [...f.transactions, newChargeTxn] };
            }
            return f;
        });

        setFolios(updated);
        setIsExtraChargeModalOpen(false);
        toast.success(`Posted ৳${Math.round(total).toLocaleString()} to Window ${targetWindow} (${extraChargeForm.department})`);
        broadcastPMSEvent({ type: 'FOLIO_UPDATED', folioId: currentFolio.id });
    };

    // OP 04 & OP 14: Apply Tax Exemption
    const handleApplyTaxExemption = () => {
        if (!currentFolio) return;

        const updated = folios.map(f => {
            if (f.id === currentFolio.id) {
                // Strip all taxes from existing debit charges
                const recomputed = f.transactions.map(t => {
                    if (t.amount < 0 && !t.isTaxExempt) {
                        const base = Math.round(t.amount / 1.25); // Reverse 25% tax/service charge
                        return {
                            ...t,
                            amount: base,
                            isTaxExempt: true,
                            exemptionReason: `${taxExemptForm.exemptionType} (Cert: ${taxExemptForm.certificateNumber})`
                        };
                    }
                    return t;
                });

                return {
                    ...f,
                    isTaxExempt: true,
                    taxExemptionType: taxExemptForm.exemptionType,
                    taxExemptionCert: taxExemptForm.certificateNumber,
                    transactions: recomputed
                };
            }
            return f;
        });

        setFolios(updated);
        setIsTaxExemptionModalOpen(false);
        toast.success(`Tax exemption successfully applied under Certificate ${taxExemptForm.certificateNumber}`);
        broadcastPMSEvent({ type: 'FOLIO_UPDATED', folioId: currentFolio.id });
    };

    // OP 05: Re-Assign Tax if Exempted
    const handleReassignTax = () => {
        if (!currentFolio || !currentFolio.isTaxExempt) return;

        const updated = folios.map(f => {
            if (f.id === currentFolio.id) {
                const recomputed = f.transactions.map(t => {
                    if (t.amount < 0 && t.isTaxExempt) {
                        const withTax = Math.round(t.amount * 1.25); // Re-apply 25% VAT & Service Charge
                        return {
                            ...t,
                            amount: withTax,
                            isTaxExempt: false,
                            exemptionReason: undefined
                        };
                    }
                    return t;
                });

                return {
                    ...f,
                    isTaxExempt: false,
                    taxExemptionType: undefined,
                    taxExemptionCert: undefined,
                    transactions: recomputed
                };
            }
            return f;
        });

        setFolios(updated);
        toast.success('Tax Exemption Revoked. Standard 15% VAT & 10% Service Charge re-calculated on all charges.');
        broadcastPMSEvent({ type: 'FOLIO_UPDATED', folioId: currentFolio.id });
    };

    // OP 06: Update Bill To (Guest vs Travel Agent vs Company)
    const handleSaveBillTo = () => {
        if (!currentFolio) return;

        const updated = folios.map(f => {
            if (f.id === currentFolio.id) {
                return {
                    ...f,
                    billTo: billToForm.billTo,
                    companyName: billToForm.billTo === 'COMPANY' ? billToForm.companyName : undefined,
                    companyTaxId: billToForm.billTo === 'COMPANY' ? billToForm.companyTaxId : undefined,
                    companyAddress: billToForm.billTo === 'COMPANY' ? billToForm.companyAddress : undefined,
                    travelAgentName: billToForm.billTo === 'TRAVEL_AGENT' ? billToForm.travelAgentName : undefined,
                    travelAgentCode: billToForm.billTo === 'TRAVEL_AGENT' ? billToForm.travelAgentCode : undefined,
                    travelAgentTaxId: billToForm.billTo === 'TRAVEL_AGENT' ? billToForm.travelAgentTaxId : undefined
                };
            }
            return f;
        });

        setFolios(updated);
        setIsBillToModalOpen(false);
        toast.success(`Invoice Bill-To updated to ${billToForm.billTo}!`);
    };

    // OP 08: Save Statutory GST / BIN / TIN
    const handleSaveTaxId = () => {
        if (!currentFolio || !taxIdInput.trim()) return;

        const updated = folios.map(f => {
            if (f.id === currentFolio.id) {
                return { ...f, companyTaxId: taxIdInput.trim() };
            }
            return f;
        });

        setFolios(updated);
        setIsTaxIdModalOpen(false);
        toast.success(`Tax Identifier (BIN/GSTIN) ${taxIdInput.trim()} saved to folio!`);
    };

    // OP 09: Cut Folio (Move Selected Charges Between Windows / Sub-folios)
    const handleCutMoveSelected = (targetWindow: 1 | 2) => {
        if (!currentFolio || selectedTxnIds.size === 0) {
            toast.warning('Please select at least one transaction to cut/transfer.');
            return;
        }

        const updated = folios.map(f => {
            if (f.id === currentFolio.id) {
                const newTxns = f.transactions.map(t => {
                    if (selectedTxnIds.has(t.id)) {
                        return { ...t, windowId: targetWindow, routedFrom: `Window ${t.windowId}` };
                    }
                    return t;
                });
                return { ...f, transactions: newTxns };
            }
            return f;
        });

        setFolios(updated);
        setSelectedTxnIds(new Set());
        toast.success(`Moved ${selectedTxnIds.size} transactions to Window ${targetWindow}!`);
    };

    // OP 09: Split Single Charge 50/50 for Room Sharers
    const handleSplitCharge50 = (txn: FolioTransaction) => {
        if (!currentFolio || txn.amount >= 0) return;

        const half = Math.round(txn.amount / 2);
        const remainder = txn.amount - half;

        const splitA: FolioTransaction = {
            ...txn,
            id: `${txn.id}-a`,
            particulars: `${txn.particulars} (Part 1 - 50%)`,
            amount: half,
            windowId: 1
        };

        const splitB: FolioTransaction = {
            ...txn,
            id: `${txn.id}-b`,
            particulars: `${txn.particulars} (Part 2 - 50%)`,
            amount: remainder,
            windowId: 2
        };

        const updated = folios.map(f => {
            if (f.id === currentFolio.id) {
                const filtered = f.transactions.filter(t => t.id !== txn.id);
                return { ...f, transactions: [...filtered, splitA, splitB] };
            }
            return f;
        });

        setFolios(updated);
        toast.success('Charge split 50/50 across Window 1 (Master) and Window 2 (Sharer)!');
    };

    // OP 10: Checkout Without Generating Invoice Number (City Ledger Transfer)
    const handleCheckoutWithoutInvoice = () => {
        if (!currentFolio) return;

        const updated = folios.map(f => {
            if (f.id === currentFolio.id) {
                return {
                    ...f,
                    status: 'TRANSFERRED_TO_CITY_LEDGER' as const,
                    isProformaOnly: true,
                    fiscalInvoiceNumber: undefined // No sequential fiscal tax number consumed!
                };
            }
            return f;
        });

        setFolios(updated);
        toast.success(`Checked out ${currentFolio.guestName} to City Ledger. Sequential Tax Invoice counter preserved.`);
        broadcastPMSEvent({ type: 'FOLIO_UPDATED', folioId: currentFolio.id });
    };

    // OP 11: Transfer All Group Charges to Group Owner's Folio
    const handleConsolidateGroup = () => {
        if (!currentFolio || !currentFolio.groupCode) {
            toast.warning('Current folio is not linked to a Group Booking.');
            return;
        }

        const groupCode = currentFolio.groupCode;
        const groupMembers = folios.filter(f => f.groupCode === groupCode && f.id !== currentFolio.id);

        if (groupMembers.length === 0) {
            toast.info(`No other rooms found in Group ${groupCode}.`);
            return;
        }

        const transferredCharges: FolioTransaction[] = [];

        groupMembers.forEach(member => {
            member.transactions.forEach(t => {
                if (t.category === 'Room' && t.amount < 0) {
                    transferredCharges.push({
                        ...t,
                        id: `grp-trf-${Date.now()}-${t.id}`,
                        particulars: `[From Room ${member.roomNumber}] ${t.particulars}`,
                        windowId: 1
                    });
                }
            });
        });

        const updated = folios.map(f => {
            if (f.id === currentFolio.id) {
                return {
                    ...f,
                    transactions: [...f.transactions, ...transferredCharges]
                };
            }
            if (f.groupCode === groupCode && f.id !== currentFolio.id) {
                // Zero out room charges from member rooms
                const remaining = f.transactions.filter(t => t.category !== 'Room');
                return { ...f, transactions: remaining };
            }
            return f;
        });

        setFolios(updated);
        toast.success(`Transferred all room charges from ${groupMembers.length} group rooms into Group Leader Folio!`);
        broadcastPMSEvent({ type: 'FOLIO_UPDATED', folioId: currentFolio.id });
    };

    // OP 12: Settle Advance Payments for Cancelled / No-Show Bookings
    const handleSettleCancelledDeposit = () => {
        if (!targetCancelledRes) return;

        const depositAmount = Number(targetCancelledRes.paidAmount) || 5000;
        const resNo = targetCancelledRes.reservationNumber;

        if (depositSettleForm.settleOption === 'RETENTION') {
            toast.success(`Advance deposit of ৳${depositAmount.toLocaleString()} retained as Cancellation Income (GL-4501) for ${resNo}.`);
        } else if (depositSettleForm.settleOption === 'REFUND') {
            toast.success(`Full refund of ৳${depositAmount.toLocaleString()} processed via ${depositSettleForm.refundMethod} for ${resNo}.`);
        } else if (depositSettleForm.settleOption === 'PARTIAL') {
            toast.success(`Partial settlement: ৳${depositSettleForm.retentionAmount} retained, ৳${depositSettleForm.refundAmount} refunded for ${resNo}.`);
        } else {
            toast.success(`Deposit of ৳${depositAmount.toLocaleString()} converted to 1-Year Guest Stay Credit Voucher (VCH-${resNo}).`);
        }

        setIsSettleDepositModalOpen(false);
        setTargetCancelledRes(null);
    };

    // OP 13: Void Payment with Audit Trail
    const handleVoidPayment = () => {
        if (!currentFolio || !targetPaymentTxn) return;
        if (voidSupervisorPin !== '1234' && voidSupervisorPin !== 'admin') {
            toast.error('Invalid Supervisor Authorization PIN. Void Rejected.');
            return;
        }
        if (!voidReasonInput.trim()) {
            toast.warning('Mandatory void reason required for audit trail.');
            return;
        }

        const updated = folios.map(f => {
            if (f.id === currentFolio.id) {
                const modifiedTxns = f.transactions.map(t => {
                    if (t.id === targetPaymentTxn.id) {
                        return {
                            ...t,
                            isVoided: true,
                            voidReason: voidReasonInput.trim(),
                            voidedBy: 'Supervisor_Admin',
                            voidedAt: `${getOperatingSystemDate()} 17:00`
                        };
                    }
                    return t;
                });
                return { ...f, transactions: modifiedTxns };
            }
            return f;
        });

        setFolios(updated);
        setIsVoidPaymentModalOpen(false);
        setTargetPaymentTxn(null);
        setVoidSupervisorPin('');
        setVoidReasonInput('');
        toast.success(`Payment of ৳${targetPaymentTxn.amount.toLocaleString()} VOIDED. Balance restored to folio.`);
        broadcastPMSEvent({ type: 'FOLIO_UPDATED', folioId: currentFolio.id });
    };

    // OP 02: Email Invoice Dispatch
    const handleSendEmailInvoice = () => {
        if (!currentFolio) return;
        const targetEmail = emailForm.recipientType === 'guest'
            ? currentFolio.guestEmail || 'guest@hospitality.com'
            : emailForm.recipientType === 'company'
                ? 'finance@standardchartered.com'
                : 'invoicing@booking.com';

        toast.success(`Invoice PDF (${emailForm.invoiceType}) dispatched successfully to ${targetEmail}!`);
        setIsEmailInvoiceModalOpen(false);
    };

    // ---------------------------------------------------------------------------
    // RENDER UI
    // ---------------------------------------------------------------------------

    return (
        <div className="p-4 space-y-4 max-w-[1600px] mx-auto min-h-screen text-slate-800">
            {/* Header */}
            <PageHeader
                title="Folio Operations & Billing Command Center"
                subtitle="Complete Enterprise 16-Operation Guest Ledger, Split Cashiering, Tax Exemption & Billing Engine"
                icon={<Receipt size={22} className="text-indigo-600" />}
                badge={
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200">
                        <span className="size-1.5 rounded-full bg-indigo-600 animate-pulse"></span>
                        16 Ops Enterprise Suite
                    </span>
                }
                actions={
                    <div className="flex items-center gap-2">
                        <button
                            type="button"
                            onClick={() => {
                                const refreshed = buildFoliosFromDB();
                                setFolios(refreshed);
                                toast.info('Folio records refreshed from central database.');
                            }}
                            className="px-3 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-xs font-semibold text-slate-700 flex items-center gap-1.5 shadow-2xs cursor-pointer transition-colors"
                        >
                            <RotateCcw size={13} />
                            <span>Refresh</span>
                        </button>
                    </div>
                }
            />

            {/* Top Carousel Bar: Folio Selection Cards */}
            <div className="bg-white rounded-xl border border-slate-200/90 p-3 shadow-2xs">
                <div className="flex items-center justify-between gap-3 pb-2.5 mb-2.5 border-b border-slate-100 flex-wrap">
                    <div className="flex items-center gap-2 flex-1 min-w-[240px]">
                        <div className="relative flex-1">
                            <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                            <input
                                type="text"
                                placeholder="Search room #, guest name, folio #, or group code..."
                                value={searchFilter}
                                onChange={e => setSearchFilter(e.target.value)}
                                className="w-full pl-8 pr-3 py-1 bg-slate-50 border border-slate-200 rounded-md text-xs text-slate-800 placeholder-slate-400 outline-none focus:bg-white focus:border-indigo-500"
                            />
                        </div>
                        <select
                            value={statusFilter}
                            onChange={e => setStatusFilter(e.target.value as any)}
                            className="text-xs font-semibold text-slate-700 bg-slate-50 border border-slate-200 rounded-md px-2 py-1 outline-none cursor-pointer"
                        >
                            <option value="ALL">All Folios</option>
                            <option value="IN_HOUSE">In-House Only</option>
                            <option value="SETTLED">Settled / City Ledger</option>
                        </select>
                    </div>

                    <div className="text-xs font-medium text-slate-500 flex items-center gap-2">
                        <span>Showing <strong>{filteredFolios.length}</strong> active guest accounts</span>
                    </div>
                </div>

                {/* Horizontal Folio Cards */}
                {filteredFolios.length === 0 ? (
                    <div className="p-6 text-center text-slate-400 text-xs font-medium">
                        No active folios match the search filter. Create reservations in PMS to generate guest folios.
                    </div>
                ) : (
                    <div className="flex gap-2.5 overflow-x-auto pb-1 scrollbar-thin">
                        {filteredFolios.map(f => {
                            const isSelected = f.id === currentFolio?.id;
                            const bal = f.transactions.reduce((sum, t) => sum + (t.isVoided ? 0 : t.amount), 0);
                            const isPaid = bal >= 0;

                            return (
                                <div
                                    key={f.id}
                                    onClick={() => setSelectedFolioId(f.id)}
                                    className={`flex-shrink-0 w-60 p-2.5 rounded-lg border cursor-pointer transition-all ${
                                        isSelected
                                            ? 'bg-indigo-50/70 border-indigo-400 ring-2 ring-indigo-200/60 shadow-xs'
                                            : 'bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50/50'
                                    }`}
                                >
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-1.5">
                                            <span className="text-[11px] font-bold px-1.5 py-0.5 rounded bg-slate-100 text-slate-800 font-mono">
                                                Rm {f.roomNumber}
                                            </span>
                                            {f.groupCode && (
                                                <span className="text-[9.5px] font-semibold px-1 py-0.2 rounded bg-amber-50 text-amber-700 border border-amber-200">
                                                    {f.groupCode}
                                                </span>
                                            )}
                                        </div>
                                        <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                                            isPaid ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'
                                        }`}>
                                            {isPaid ? '৳ 0.00' : `Due ৳ ${Math.abs(bal).toLocaleString()}`}
                                        </span>
                                    </div>
                                    <p className="text-xs font-semibold text-slate-900 truncate mt-1">{f.guestName}</p>
                                    <div className="flex items-center justify-between text-[10px] text-slate-400 mt-1">
                                        <span className="font-mono">{f.folioNumber}</span>
                                        <span>{f.checkIn} → {f.checkOut}</span>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            {currentFolio && (
                <>
                    {/* Guest & Billing Metadata Banner (Operations 4, 5, 6, 7, 8) */}
                    <div className="bg-white rounded-xl border border-slate-200/90 p-4 shadow-2xs space-y-3">
                        <div className="flex items-start justify-between gap-4 flex-wrap">
                            <div className="flex items-center gap-3">
                                <div className="size-11 rounded-xl bg-indigo-600 text-white font-bold text-base flex items-center justify-center shadow-xs">
                                    {currentFolio.roomNumber}
                                </div>
                                <div>
                                    <div className="flex items-center gap-2">
                                        <h2 className="text-base font-bold text-slate-900">{currentFolio.guestName}</h2>
                                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200">
                                            {currentFolio.roomType}
                                        </span>
                                        {currentFolio.isTaxExempt ? (
                                            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-purple-50 text-purple-700 border border-purple-200 flex items-center gap-1">
                                                <ShieldCheck size={11} />
                                                <span>TAX EXEMPT</span>
                                            </span>
                                        ) : (
                                            <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-slate-100 text-slate-600">
                                                Standard 15% VAT + 10% SC
                                            </span>
                                        )}
                                    </div>
                                    <div className="flex items-center gap-3 text-xs text-slate-500 mt-0.5 flex-wrap">
                                        <span>Folio: <strong className="font-mono text-slate-800">{currentFolio.folioNumber}</strong></span>
                                        <span>•</span>
                                        <span>Stay: <strong>{currentFolio.checkIn}</strong> to <strong>{currentFolio.checkOut}</strong> ({currentFolio.nights} Nts)</span>
                                        <span>•</span>
                                        <span>Phone: <strong>{currentFolio.guestPhone || 'N/A'}</strong></span>
                                    </div>
                                </div>
                            </div>

                            {/* Live Financial Balance Badges */}
                            <div className="flex items-center gap-2">
                                <div className="px-3 py-1.5 bg-slate-50 rounded-lg border border-slate-200 text-right">
                                    <span className="text-[10px] uppercase font-semibold text-slate-400 block">Window 1 (Master)</span>
                                    <span className={`text-sm font-bold font-mono ${window1Balance > 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
                                        ৳ {window1Balance.toLocaleString()}
                                    </span>
                                </div>
                                <div className="px-3 py-1.5 bg-slate-50 rounded-lg border border-slate-200 text-right">
                                    <span className="text-[10px] uppercase font-semibold text-slate-400 block">Window 2 (Incidentals)</span>
                                    <span className={`text-sm font-bold font-mono ${window2Balance > 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
                                        ৳ {window2Balance.toLocaleString()}
                                    </span>
                                </div>
                                <div className="px-3.5 py-1.5 bg-indigo-50 rounded-lg border border-indigo-200 text-right">
                                    <span className="text-[10px] uppercase font-bold text-indigo-600 block">Total Due</span>
                                    <span className={`text-base font-black font-mono ${totalFolioBalance > 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
                                        ৳ {totalFolioBalance.toLocaleString()}
                                    </span>
                                </div>
                            </div>
                        </div>

                        {/* Operational Control Pills (Operations 4, 5, 6, 8, 10, 11) */}
                        <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-2 flex-wrap">
                            <div className="flex items-center gap-2 flex-wrap">
                                {/* OP 06: Change Bill To */}
                                <button
                                    type="button"
                                    onClick={() => {
                                        setBillToForm({
                                            billTo: currentFolio.billTo,
                                            companyName: currentFolio.companyName || 'Standard Chartered Bank Ltd',
                                            companyTaxId: currentFolio.companyTaxId || 'BIN-192837465-2026',
                                            companyAddress: currentFolio.companyAddress || 'Gulshan-2, Dhaka',
                                            travelAgentName: currentFolio.travelAgentName || 'Booking.com B.V.',
                                            travelAgentCode: currentFolio.travelAgentCode || 'BKNG-INTL-902',
                                            travelAgentTaxId: currentFolio.travelAgentTaxId || 'NL805734958B01'
                                        });
                                        setIsBillToModalOpen(true);
                                    }}
                                    className="px-2.5 py-1 rounded bg-slate-50 hover:bg-slate-100 border border-slate-200 text-xs font-semibold text-slate-700 flex items-center gap-1.5 cursor-pointer transition-colors"
                                    title="Change whether invoice is billed to Guest, Company, or Travel Agent"
                                >
                                    <Building2 size={12} className="text-slate-500" />
                                    <span>Bill To: <strong className="text-indigo-600">{currentFolio.billTo}</strong></span>
                                </button>

                                {/* OP 08: Guest / Corporate GST / BIN Number */}
                                <button
                                    type="button"
                                    onClick={() => {
                                        setTaxIdInput(currentFolio.companyTaxId || '');
                                        setIsTaxIdModalOpen(true);
                                    }}
                                    className="px-2.5 py-1 rounded bg-slate-50 hover:bg-slate-100 border border-slate-200 text-xs font-semibold text-slate-700 flex items-center gap-1.5 cursor-pointer transition-colors"
                                    title="Add or update corporate statutory tax number (BIN / GSTIN / TIN)"
                                >
                                    <Tag size={12} className="text-slate-500" />
                                    <span>Tax ID: <strong>{currentFolio.companyTaxId || 'None (Add)'}</strong></span>
                                </button>

                                {/* OP 04 & 05: Tax Exemption Toggle */}
                                {currentFolio.isTaxExempt ? (
                                    <button
                                        type="button"
                                        onClick={handleReassignTax}
                                        className="px-2.5 py-1 rounded bg-purple-50 hover:bg-purple-100 border border-purple-200 text-xs font-semibold text-purple-700 flex items-center gap-1.5 cursor-pointer transition-colors"
                                        title="Re-assign standard 15% VAT and 10% Service Charge"
                                    >
                                        <RotateCcw size={12} />
                                        <span>Re-assign Taxes</span>
                                    </button>
                                ) : (
                                    <button
                                        type="button"
                                        onClick={() => setIsTaxExemptionModalOpen(true)}
                                        className="px-2.5 py-1 rounded bg-slate-50 hover:bg-slate-100 border border-slate-200 text-xs font-semibold text-slate-700 flex items-center gap-1.5 cursor-pointer transition-colors"
                                        title="Apply statutory diplomatic or government tax exemption"
                                    >
                                        <ShieldCheck size={12} className="text-purple-600" />
                                        <span>Apply Tax Exemption</span>
                                    </button>
                                )}

                                {/* OP 07: Routing Indicator */}
                                <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1">
                                    <Sparkles size={11} />
                                    <span>Auto-Routing Active</span>
                                </span>
                            </div>

                            {/* Fast Actions */}
                            <div className="flex items-center gap-2">
                                {/* OP 10: Checkout Without Invoice # */}
                                <button
                                    type="button"
                                    onClick={handleCheckoutWithoutInvoice}
                                    className="px-2.5 py-1 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold flex items-center gap-1 cursor-pointer transition-colors"
                                    title="Settle to City Ledger / Proforma without generating fiscal invoice number"
                                >
                                    <Clock size={12} />
                                    <span>Checkout (Proforma)</span>
                                </button>

                                {/* OP 02: Email Invoice */}
                                <button
                                    type="button"
                                    onClick={() => {
                                        setEmailForm({
                                            ...emailForm,
                                            emailTo: currentFolio.guestEmail || '',
                                            subject: `Hotel Tax Invoice & Folio Statement - ${currentFolio.folioNumber}`
                                        });
                                        setIsEmailInvoiceModalOpen(true);
                                    }}
                                    className="px-2.5 py-1 rounded bg-blue-50 hover:bg-blue-100 border border-blue-200 text-blue-700 text-xs font-semibold flex items-center gap-1 cursor-pointer transition-colors"
                                >
                                    <Mail size={12} />
                                    <span>Email Invoice</span>
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Navigation Tabs */}
                    <div className="flex items-center gap-1 border-b border-slate-200 bg-slate-100/60 p-1 rounded-xl">
                        <button
                            type="button"
                            onClick={() => setActiveTab('windows')}
                            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                                activeTab === 'windows' ? 'bg-white text-indigo-700 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
                            }`}
                        >
                            <Receipt size={13} />
                            <span>Folio Windows (1 & 2)</span>
                        </button>
                        <button
                            type="button"
                            onClick={() => setActiveTab('routing')}
                            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                                activeTab === 'routing' ? 'bg-white text-indigo-700 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
                            }`}
                        >
                            <ArrowRightLeft size={13} />
                            <span>Routing Rules</span>
                        </button>
                        <button
                            type="button"
                            onClick={() => setActiveTab('group')}
                            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                                activeTab === 'group' ? 'bg-white text-indigo-700 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
                            }`}
                        >
                            <Users size={13} />
                            <span>Group Consolidator</span>
                        </button>
                        <button
                            type="button"
                            onClick={() => setActiveTab('cancelled-deposits')}
                            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                                activeTab === 'cancelled-deposits' ? 'bg-white text-indigo-700 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
                            }`}
                        >
                            <AlertCircle size={13} />
                            <span>Cancelled Deposit Settlements</span>
                        </button>
                        <button
                            type="button"
                            onClick={() => setActiveTab('invoice')}
                            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                                activeTab === 'invoice' ? 'bg-white text-indigo-700 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
                            }`}
                        >
                            <FileText size={13} />
                            <span>Tax Invoice Preview</span>
                        </button>
                    </div>

                    {/* --------------------------------------------------------------- */}
                    {/* TAB 1: DUAL WINDOW CHARGES (Operations 1, 3, 9, 13, 15, 16)       */}
                    {/* --------------------------------------------------------------- */}
                    {activeTab === 'windows' && (
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                            {/* WINDOW 1: Master / Corporate Folio */}
                            <div className="bg-white rounded-xl border border-slate-200/90 shadow-2xs flex flex-col overflow-hidden">
                                <div className="p-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <span className="size-6 rounded-md bg-indigo-600 text-white font-black text-xs flex items-center justify-center">1</span>
                                        <div>
                                            <h3 className="text-xs font-bold text-slate-900">Window 1: Master Accommodation Folio</h3>
                                            <span className="text-[10px] text-slate-400">Room Tariffs & Fixed Packages (Billed to {currentFolio.billTo})</span>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-1.5">
                                        <button
                                            type="button"
                                            onClick={() => {
                                                setPaymentForm({ ...paymentForm, targetWindow: 1, amount: Math.max(0, window1Balance) });
                                                setIsPaymentModalOpen(true);
                                            }}
                                            className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded shadow-2xs flex items-center gap-1 cursor-pointer transition-colors"
                                        >
                                            <CreditCard size={12} />
                                            <span>Settle W1</span>
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => handleCutMoveSelected(2)}
                                            disabled={selectedTxnIds.size === 0}
                                            className="px-2 py-1 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 text-xs font-semibold rounded disabled:opacity-40 cursor-pointer transition-colors"
                                            title="Cut / Move selected charges to Window 2"
                                        >
                                            <Split size={12} />
                                        </button>
                                    </div>
                                </div>

                                {/* Window 1 Charges Table */}
                                <div className="flex-1 overflow-x-auto min-h-[300px]">
                                    <table className="w-full text-left text-xs">
                                        <thead className="bg-slate-50/80 text-[10px] uppercase font-bold text-slate-400 border-b border-slate-100">
                                            <tr>
                                                <th className="p-2 w-8 text-center">
                                                    <input
                                                        type="checkbox"
                                                        onChange={e => {
                                                            if (e.target.checked) {
                                                                const ids = new Set(currentFolio.transactions.filter(t => t.windowId === 1).map(t => t.id));
                                                                setSelectedTxnIds(ids);
                                                            } else {
                                                                setSelectedTxnIds(new Set());
                                                            }
                                                        }}
                                                    />
                                                </th>
                                                <th className="p-2">Date & Ref</th>
                                                <th className="p-2">Particulars & Description</th>
                                                <th className="p-2 text-right">Debit (৳)</th>
                                                <th className="p-2 text-right">Credit (৳)</th>
                                                <th className="p-2 text-center w-16">Actions</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                                            {currentFolio.transactions.filter(t => t.windowId === 1).map(t => (
                                                <tr key={t.id} className={`hover:bg-slate-50/60 ${t.isVoided ? 'opacity-40 bg-slate-50 line-through' : ''}`}>
                                                    <td className="p-2 text-center">
                                                        <input
                                                            type="checkbox"
                                                            checked={selectedTxnIds.has(t.id)}
                                                            onChange={e => {
                                                                const next = new Set(selectedTxnIds);
                                                                if (e.target.checked) next.add(t.id);
                                                                else next.delete(t.id);
                                                                setSelectedTxnIds(next);
                                                            }}
                                                        />
                                                    </td>
                                                    <td className="p-2">
                                                        <span className="font-mono text-[10px] text-slate-400 block">{t.date}</span>
                                                        <span className="font-mono text-[11px] font-bold text-slate-800">{t.refNo}</span>
                                                    </td>
                                                    <td className="p-2">
                                                        <div className="flex items-center gap-1.5 flex-wrap">
                                                            <span className="font-semibold text-slate-900">{t.particulars}</span>
                                                            {t.isTaxExempt && (
                                                                <span className="text-[9px] px-1 bg-purple-50 text-purple-700 border border-purple-200 rounded">
                                                                    Tax Exempt
                                                                </span>
                                                            )}
                                                            {t.isVoided && (
                                                                <span className="text-[9px] px-1 bg-rose-50 text-rose-700 border border-rose-200 rounded">
                                                                    VOIDED: {t.voidReason}
                                                                </span>
                                                            )}
                                                        </div>
                                                        <span className="text-[10.5px] text-slate-400 block">{t.description}</span>
                                                    </td>
                                                    <td className="p-2 text-right font-mono font-bold text-rose-600">
                                                        {t.amount < 0 ? Math.abs(t.amount).toLocaleString() : '-'}
                                                    </td>
                                                    <td className="p-2 text-right font-mono font-bold text-emerald-600">
                                                        {t.amount > 0 ? t.amount.toLocaleString() : '-'}
                                                    </td>
                                                    <td className="p-2 text-center">
                                                        {t.category === 'Payment' && !t.isVoided && (
                                                            <button
                                                                type="button"
                                                                onClick={() => {
                                                                    setTargetPaymentTxn(t);
                                                                    setIsVoidPaymentModalOpen(true);
                                                                }}
                                                                className="text-[10px] px-1.5 py-0.5 rounded bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200 font-semibold cursor-pointer"
                                                                title="Void erroneous payment"
                                                            >
                                                                Void
                                                            </button>
                                                        )}
                                                        {t.category === 'Room' && (
                                                            <button
                                                                type="button"
                                                                onClick={() => handleSplitCharge50(t)}
                                                                className="text-[10px] px-1.5 py-0.5 rounded bg-slate-50 text-slate-700 hover:bg-slate-100 border border-slate-200 font-semibold cursor-pointer"
                                                                title="Split charge 50/50 for room sharer"
                                                            >
                                                                ½ Split
                                                            </button>
                                                        )}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>

                                <div className="p-3 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs font-bold">
                                    <span>Window 1 Net Balance</span>
                                    <span className={`font-mono text-sm ${window1Balance > 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
                                        ৳ {window1Balance.toLocaleString()}
                                    </span>
                                </div>
                            </div>

                            {/* WINDOW 2: Personal Incidentals / Extras Folio */}
                            <div className="bg-white rounded-xl border border-slate-200/90 shadow-2xs flex flex-col overflow-hidden">
                                <div className="p-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <span className="size-6 rounded-md bg-emerald-600 text-white font-black text-xs flex items-center justify-center">2</span>
                                        <div>
                                            <h3 className="text-xs font-bold text-slate-900">Window 2: Personal Extras & Incidentals</h3>
                                            <span className="text-[10px] text-slate-400">F&B, Minibar, Laundry, Spa (Billed to Guest)</span>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-1.5">
                                        <button
                                            type="button"
                                            onClick={() => {
                                                setExtraChargeForm({ ...extraChargeForm, targetWindow: 2 });
                                                setIsExtraChargeModalOpen(true);
                                            }}
                                            className="px-2.5 py-1 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded shadow-2xs flex items-center gap-1 cursor-pointer transition-colors"
                                        >
                                            <Plus size={12} />
                                            <span>Post Extra</span>
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => {
                                                setPaymentForm({ ...paymentForm, targetWindow: 2, amount: Math.max(0, window2Balance) });
                                                setIsPaymentModalOpen(true);
                                            }}
                                            className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded shadow-2xs flex items-center gap-1 cursor-pointer transition-colors"
                                        >
                                            <CreditCard size={12} />
                                            <span>Settle W2</span>
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => handleCutMoveSelected(1)}
                                            disabled={selectedTxnIds.size === 0}
                                            className="px-2 py-1 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 text-xs font-semibold rounded disabled:opacity-40 cursor-pointer transition-colors"
                                            title="Cut / Move selected charges back to Window 1"
                                        >
                                            <Split size={12} />
                                        </button>
                                    </div>
                                </div>

                                {/* Window 2 Charges Table */}
                                <div className="flex-1 overflow-x-auto min-h-[300px]">
                                    <table className="w-full text-left text-xs">
                                        <thead className="bg-slate-50/80 text-[10px] uppercase font-bold text-slate-400 border-b border-slate-100">
                                            <tr>
                                                <th className="p-2 w-8 text-center">
                                                    <input
                                                        type="checkbox"
                                                        onChange={e => {
                                                            if (e.target.checked) {
                                                                const ids = new Set(currentFolio.transactions.filter(t => t.windowId === 2).map(t => t.id));
                                                                setSelectedTxnIds(ids);
                                                            } else {
                                                                setSelectedTxnIds(new Set());
                                                            }
                                                        }}
                                                    />
                                                </th>
                                                <th className="p-2">Date & Ref</th>
                                                <th className="p-2">Particulars & Description</th>
                                                <th className="p-2 text-right">Debit (৳)</th>
                                                <th className="p-2 text-right">Credit (৳)</th>
                                                <th className="p-2 text-center w-16">Actions</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                                            {currentFolio.transactions.filter(t => t.windowId === 2).length === 0 ? (
                                                <tr>
                                                    <td colSpan={6} className="p-6 text-center text-slate-400 text-xs">
                                                        Zero incidental charges in Window 2. Use "+ Post Extra" to add room service, laundry, or minibar bills.
                                                    </td>
                                                </tr>
                                            ) : (
                                                currentFolio.transactions.filter(t => t.windowId === 2).map(t => (
                                                    <tr key={t.id} className={`hover:bg-slate-50/60 ${t.isVoided ? 'opacity-40 bg-slate-50 line-through' : ''}`}>
                                                        <td className="p-2 text-center">
                                                            <input
                                                                type="checkbox"
                                                                checked={selectedTxnIds.has(t.id)}
                                                                onChange={e => {
                                                                    const next = new Set(selectedTxnIds);
                                                                    if (e.target.checked) next.add(t.id);
                                                                    else next.delete(t.id);
                                                                    setSelectedTxnIds(next);
                                                                }}
                                                            />
                                                        </td>
                                                        <td className="p-2">
                                                            <span className="font-mono text-[10px] text-slate-400 block">{t.date}</span>
                                                            <span className="font-mono text-[11px] font-bold text-slate-800">{t.refNo}</span>
                                                        </td>
                                                        <td className="p-2">
                                                            <div className="flex items-center gap-1.5 flex-wrap">
                                                                <span className="font-semibold text-slate-900">{t.particulars}</span>
                                                                {t.isTaxExempt && (
                                                                    <span className="text-[9px] px-1 bg-purple-50 text-purple-700 border border-purple-200 rounded">
                                                                        Tax Exempt
                                                                    </span>
                                                                )}
                                                            </div>
                                                            <span className="text-[10.5px] text-slate-400 block">{t.description}</span>
                                                        </td>
                                                        <td className="p-2 text-right font-mono font-bold text-rose-600">
                                                            {t.amount < 0 ? Math.abs(t.amount).toLocaleString() : '-'}
                                                        </td>
                                                        <td className="p-2 text-right font-mono font-bold text-emerald-600">
                                                            {t.amount > 0 ? t.amount.toLocaleString() : '-'}
                                                        </td>
                                                        <td className="p-2 text-center">
                                                            {t.amount < 0 && (
                                                                <button
                                                                    type="button"
                                                                    onClick={() => {
                                                                        setTargetChargeSlip(t);
                                                                        setIsPrintSlipModalOpen(true);
                                                                    }}
                                                                    className="text-[10px] px-1.5 py-0.5 rounded bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200 font-semibold cursor-pointer"
                                                                    title="Print 80mm thermal voucher slip for guest signature"
                                                                >
                                                                    Slip
                                                                </button>
                                                            )}
                                                        </td>
                                                    </tr>
                                                ))
                                            )}
                                        </tbody>
                                    </table>
                                </div>

                                <div className="p-3 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs font-bold">
                                    <span>Window 2 Net Balance</span>
                                    <span className={`font-mono text-sm ${window2Balance > 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
                                        ৳ {window2Balance.toLocaleString()}
                                    </span>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* --------------------------------------------------------------- */}
                    {/* TAB 2: FOLIO ROUTING RULES (Operation 7)                         */}
                    {/* --------------------------------------------------------------- */}
                    {activeTab === 'routing' && (
                        <div className="bg-white rounded-xl border border-slate-200/90 p-5 shadow-2xs space-y-4">
                            <div>
                                <h3 className="text-sm font-bold text-slate-900">Automated Folio Routing Rules (Window Split)</h3>
                                <p className="text-xs text-slate-500 mt-0.5">
                                    Configure automatic routing so that room tariffs post to the Corporate/Company Master Folio while personal extras automatically direct to the Guest Folio.
                                </p>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="p-4 rounded-xl border border-indigo-200 bg-indigo-50/50">
                                    <div className="flex items-center justify-between pb-2 border-b border-indigo-100">
                                        <h4 className="text-xs font-bold text-indigo-950 flex items-center gap-1.5">
                                            <Building2 size={13} className="text-indigo-600" />
                                            <span>Master / Company Route (Window 1)</span>
                                        </h4>
                                        <span className="text-[10px] font-bold px-1.5 py-0.5 bg-indigo-100 text-indigo-800 rounded">
                                            Billed to {currentFolio.billTo}
                                        </span>
                                    </div>
                                    <ul className="mt-3 space-y-2 text-xs text-indigo-900 font-medium">
                                        <li className="flex items-center gap-2">
                                            <Check size={13} className="text-emerald-600" />
                                            <span>Room Accommodation Tariff (Nightly Base Rate)</span>
                                        </li>
                                        <li className="flex items-center gap-2">
                                            <Check size={13} className="text-emerald-600" />
                                            <span>Complimentary Package Meals (Breakfast Buffet)</span>
                                        </li>
                                        <li className="flex items-center gap-2">
                                            <Check size={13} className="text-emerald-600" />
                                            <span>Official Airport Pickup (Pre-approved contract)</span>
                                        </li>
                                    </ul>
                                </div>

                                <div className="p-4 rounded-xl border border-emerald-200 bg-emerald-50/50">
                                    <div className="flex items-center justify-between pb-2 border-b border-emerald-100">
                                        <h4 className="text-xs font-bold text-emerald-950 flex items-center gap-1.5">
                                            <UserCheck size={13} className="text-emerald-600" />
                                            <span>Personal Incidentals Route (Window 2)</span>
                                        </h4>
                                        <span className="text-[10px] font-bold px-1.5 py-0.5 bg-emerald-100 text-emerald-800 rounded">
                                            Billed to Guest ({currentFolio.guestName})
                                        </span>
                                    </div>
                                    <ul className="mt-3 space-y-2 text-xs text-emerald-900 font-medium">
                                        <li className="flex items-center gap-2">
                                            <Check size={13} className="text-emerald-600" />
                                            <span>Food & Beverage (Room Service / Minibar)</span>
                                        </li>
                                        <li className="flex items-center gap-2">
                                            <Check size={13} className="text-emerald-600" />
                                            <span>Express Laundry & Dry Cleaning</span>
                                        </li>
                                        <li className="flex items-center gap-2">
                                            <Check size={13} className="text-emerald-600" />
                                            <span>Spa Treatments & Salon Services</span>
                                        </li>
                                    </ul>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* --------------------------------------------------------------- */}
                    {/* TAB 3: GROUP MASTER CONSOLIDATOR (Operation 11)                  */}
                    {/* --------------------------------------------------------------- */}
                    {activeTab === 'group' && (
                        <div className="bg-white rounded-xl border border-slate-200/90 p-5 shadow-2xs space-y-4">
                            <div className="flex items-center justify-between">
                                <div>
                                    <h3 className="text-sm font-bold text-slate-900">Group Master Billing Consolidator</h3>
                                    <p className="text-xs text-slate-500 mt-0.5">
                                        Consolidate and transfer all room tariffs from individual group rooms directly into the Group Tour Leader's Master Folio in one click.
                                    </p>
                                </div>
                                <button
                                    type="button"
                                    onClick={handleConsolidateGroup}
                                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-lg shadow-2xs flex items-center gap-2 cursor-pointer transition-colors"
                                >
                                    <Users size={14} />
                                    <span>Consolidate Group Charges Now</span>
                                </button>
                            </div>

                            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
                                <span className="text-xs font-semibold text-slate-700 block mb-2">Group Information</span>
                                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
                                    <div>
                                        <span className="text-[10.5px] text-slate-400 block">Group Code</span>
                                        <strong className="font-mono text-slate-800">{currentFolio.groupCode || 'None Linked'}</strong>
                                    </div>
                                    <div>
                                        <span className="text-[10.5px] text-slate-400 block">Master Room</span>
                                        <strong className="text-slate-800">Room {currentFolio.roomNumber} ({currentFolio.guestName})</strong>
                                    </div>
                                    <div>
                                        <span className="text-[10.5px] text-slate-400 block">Target Billing</span>
                                        <strong className="text-slate-800">{currentFolio.companyName || currentFolio.guestName}</strong>
                                    </div>
                                    <div>
                                        <span className="text-[10.5px] text-slate-400 block">Status</span>
                                        <span className="font-semibold text-emerald-600">Ready to Consolidate</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* --------------------------------------------------------------- */}
                    {/* TAB 4: CANCELLED DEPOSIT SETTLEMENTS (Operation 12)              */}
                    {/* --------------------------------------------------------------- */}
                    {activeTab === 'cancelled-deposits' && (
                        <div className="bg-white rounded-xl border border-slate-200/90 p-5 shadow-2xs space-y-4">
                            <div>
                                <h3 className="text-sm font-bold text-slate-900">Cancelled / No-Show Advance Deposit Settlements</h3>
                                <p className="text-xs text-slate-500 mt-0.5">
                                    Audit-compliant accounting treatment for deposits when bookings cancel: Forfeit as Retention Revenue, Process Full/Partial Refund, or Convert to Future Stay Credit Voucher.
                                </p>
                            </div>

                            <div className="border border-slate-200 rounded-xl overflow-hidden">
                                <table className="w-full text-left text-xs">
                                    <thead className="bg-slate-50 text-[10.5px] uppercase font-bold text-slate-400 border-b border-slate-200">
                                        <tr>
                                            <th className="p-3">Reservation #</th>
                                            <th className="p-3">Guest Name</th>
                                            <th className="p-3">Cancelled Dates</th>
                                            <th className="p-3 text-right">Advance Paid (৳)</th>
                                            <th className="p-3 text-center">Action</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100 font-medium">
                                        <tr className="hover:bg-slate-50">
                                            <td className="p-3 font-mono font-bold text-indigo-700">RES-20260701-901</td>
                                            <td className="p-3 font-semibold text-slate-800">Tariqul Islam (Late No-Show)</td>
                                            <td className="p-3 text-slate-500">2026-07-01 → 2026-07-03</td>
                                            <td className="p-3 text-right font-mono font-bold text-emerald-600">৳ 5,000</td>
                                            <td className="p-3 text-center">
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        setTargetCancelledRes({
                                                            id: 901,
                                                            reservationNumber: 'RES-20260701-901',
                                                            guestName: 'Tariqul Islam',
                                                            paidAmount: 5000,
                                                            roomNumber: '102',
                                                            roomType: 'Deluxe Room',
                                                            checkIn: '2026-07-01',
                                                            checkOut: '2026-07-03',
                                                            status: 'CANCELLED'
                                                        });
                                                        setIsSettleDepositModalOpen(true);
                                                    }}
                                                    className="px-2.5 py-1 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 text-indigo-700 font-bold rounded cursor-pointer transition-colors"
                                                >
                                                    Settle Deposit
                                                </button>
                                            </td>
                                        </tr>
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}

                    {/* --------------------------------------------------------------- */}
                    {/* TAB 5: FORMAL TAX INVOICE & PROFORMA PREVIEW (Operations 2, 8)   */}
                    {/* --------------------------------------------------------------- */}
                    {activeTab === 'invoice' && (
                        <div className="bg-white rounded-xl border border-slate-200/90 p-8 shadow-2xs max-w-4xl mx-auto font-sans space-y-6">
                            {/* Invoice Header */}
                            <div className="flex items-start justify-between border-b border-slate-200 pb-6">
                                <div>
                                    <h1 className="text-xl font-black text-slate-900 tracking-tight">GRAND PALACE HOTEL & RESORT</h1>
                                    <p className="text-xs text-slate-500 mt-1">Plot 45, Gulshan Avenue, Gulshan-2, Dhaka-1212, Bangladesh</p>
                                    <p className="text-xs text-slate-500">Tax BIN: <strong>001928374-0102</strong> • VAT Registration Act 2012</p>
                                </div>
                                <div className="text-right">
                                    <span className="text-xs uppercase font-extrabold tracking-widest text-indigo-700 block">
                                        {currentFolio.isProformaOnly ? 'PROFORMA STATEMENT' : 'OFFICIAL TAX INVOICE'}
                                    </span>
                                    <span className="text-sm font-mono font-bold text-slate-900 mt-1 block">
                                        {currentFolio.isProformaOnly ? `PRO-${currentFolio.folioNumber}` : `INV-2026-${currentFolio.folioNumber}`}
                                    </span>
                                    <span className="text-xs text-slate-400 mt-0.5 block">Date: {getOperatingSystemDate()}</span>
                                </div>
                            </div>

                            {/* Bill-To and Guest Details */}
                            <div className="grid grid-cols-2 gap-6 text-xs">
                                <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                                    <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1">Bill To Party</span>
                                    <strong className="text-sm text-slate-900 block">
                                        {currentFolio.billTo === 'COMPANY'
                                            ? currentFolio.companyName
                                            : currentFolio.billTo === 'TRAVEL_AGENT'
                                                ? currentFolio.travelAgentName
                                                : currentFolio.guestName}
                                    </strong>
                                    {currentFolio.companyTaxId && (
                                        <p className="text-slate-600 mt-1">Tax BIN / GSTIN: <strong className="font-mono text-slate-800">{currentFolio.companyTaxId}</strong></p>
                                    )}
                                    <p className="text-slate-500 mt-0.5">Guest: {currentFolio.guestName} • Room {currentFolio.roomNumber}</p>
                                </div>

                                <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                                    <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1">Stay Details</span>
                                    <p className="text-slate-700">Check-In: <strong>{currentFolio.checkIn}</strong></p>
                                    <p className="text-slate-700">Check-Out: <strong>{currentFolio.checkOut}</strong></p>
                                    <p className="text-slate-700">Nights: <strong>{currentFolio.nights}</strong> • Room: <strong>{currentFolio.roomType}</strong></p>
                                </div>
                            </div>

                            {/* Consolidated Statement Table */}
                            <table className="w-full text-left text-xs border border-slate-200 rounded-lg overflow-hidden">
                                <thead className="bg-slate-100 font-bold text-slate-600 border-b border-slate-200">
                                    <tr>
                                        <th className="p-2.5">Date</th>
                                        <th className="p-2.5">Description</th>
                                        <th className="p-2.5 text-right">Charges (৳)</th>
                                        <th className="p-2.5 text-right">Credits (৳)</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-200">
                                    {currentFolio.transactions.filter(t => !t.isVoided).map(t => (
                                        <tr key={t.id}>
                                            <td className="p-2.5 font-mono text-slate-500">{t.date}</td>
                                            <td className="p-2.5 font-medium text-slate-800">{t.particulars}</td>
                                            <td className="p-2.5 text-right font-mono font-bold text-rose-600">
                                                {t.amount < 0 ? Math.abs(t.amount).toLocaleString() : '-'}
                                            </td>
                                            <td className="p-2.5 text-right font-mono font-bold text-emerald-600">
                                                {t.amount > 0 ? t.amount.toLocaleString() : '-'}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>

                            {/* Invoice Footer & Print Button */}
                            <div className="flex items-center justify-between pt-4 border-t border-slate-200">
                                <div className="text-xs text-slate-400">
                                    This is a computer generated invoice. No signature required.
                                </div>
                                <div className="flex items-center gap-2">
                                    <button
                                        type="button"
                                        onClick={() => window.print()}
                                        className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-lg shadow-2xs flex items-center gap-1.5 cursor-pointer"
                                    >
                                        <Printer size={13} />
                                        <span>Print Invoice</span>
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}
                </>
            )}

            {/* ------------------------------------------------------------------- */}
            {/* MODALS SECTION                                                      */}
            {/* ------------------------------------------------------------------- */}

            {/* MODAL 1: Settle Bill / Take Payment (Op 1) */}
            {isPaymentModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4 animate-in fade-in">
                    <div className="bg-white rounded-2xl max-w-md w-full p-5 shadow-2xl border border-slate-200 space-y-4">
                        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                                <CreditCard size={16} className="text-emerald-600" />
                                <span>Take Payment / Settle Bill</span>
                            </h3>
                            <button onClick={() => setIsPaymentModalOpen(false)} className="text-slate-400 hover:text-slate-600 p-1 cursor-pointer">
                                <X size={16} />
                            </button>
                        </div>

                        <div className="space-y-3 text-xs">
                            <div>
                                <label className="font-semibold text-slate-700 block mb-1">Target Folio Window</label>
                                <div className="grid grid-cols-2 gap-2">
                                    <button
                                        type="button"
                                        onClick={() => setPaymentForm({ ...paymentForm, targetWindow: 1, amount: Math.max(0, window1Balance) })}
                                        className={`p-2 rounded-lg border text-left cursor-pointer transition-colors ${
                                            paymentForm.targetWindow === 1 ? 'border-emerald-500 bg-emerald-50 text-emerald-900' : 'border-slate-200'
                                        }`}
                                    >
                                        <strong className="block">Window 1 (Master)</strong>
                                        <span className="text-[10px] text-slate-500">Balance: ৳ {window1Balance.toLocaleString()}</span>
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setPaymentForm({ ...paymentForm, targetWindow: 2, amount: Math.max(0, window2Balance) })}
                                        className={`p-2 rounded-lg border text-left cursor-pointer transition-colors ${
                                            paymentForm.targetWindow === 2 ? 'border-emerald-500 bg-emerald-50 text-emerald-900' : 'border-slate-200'
                                        }`}
                                    >
                                        <strong className="block">Window 2 (Extras)</strong>
                                        <span className="text-[10px] text-slate-500">Balance: ৳ {window2Balance.toLocaleString()}</span>
                                    </button>
                                </div>
                            </div>

                            <div>
                                <label className="font-semibold text-slate-700 block mb-1">Settlement Tender / Method</label>
                                <select
                                    value={paymentForm.method}
                                    onChange={e => setPaymentForm({ ...paymentForm, method: e.target.value as any })}
                                    className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg font-semibold text-slate-800"
                                >
                                    <option value="Cash BDT">Cash (BDT Cash Till)</option>
                                    <option value="Visa Card">Visa Card (POS Terminal)</option>
                                    <option value="MasterCard">MasterCard (POS Terminal)</option>
                                    <option value="Amex Card">American Express</option>
                                    <option value="bKash MFS">bKash Merchant MFS</option>
                                    <option value="Nagad MFS">Nagad Merchant MFS</option>
                                    <option value="Bank Transfer">Direct Bank Wire / BEFTN</option>
                                    <option value="City Ledger (Direct Bill)">City Ledger (Direct Corporate Bill)</option>
                                </select>
                            </div>

                            <div>
                                <label className="font-semibold text-slate-700 block mb-1">Payment Amount (৳)</label>
                                <input
                                    type="number"
                                    value={paymentForm.amount || ''}
                                    onChange={e => setPaymentForm({ ...paymentForm, amount: Number(e.target.value) })}
                                    className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-sm font-bold font-mono text-emerald-700 outline-none"
                                />
                            </div>

                            <div>
                                <label className="font-semibold text-slate-700 block mb-1">Transaction Ref / Auth Code / MFS TrxID</label>
                                <input
                                    type="text"
                                    placeholder="e.g. TXN-92384 or bKash TrxID"
                                    value={paymentForm.referenceCode}
                                    onChange={e => setPaymentForm({ ...paymentForm, referenceCode: e.target.value })}
                                    className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg"
                                />
                            </div>
                        </div>

                        <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                            <button
                                type="button"
                                onClick={() => setIsPaymentModalOpen(false)}
                                className="px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-semibold text-slate-600 cursor-pointer"
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                onClick={handleSettlePayment}
                                className="px-4 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold cursor-pointer transition-colors shadow-2xs"
                            >
                                Settle Payment
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* MODAL 2: Add Extra Charge (Op 3 & 16) */}
            {isExtraChargeModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4 animate-in fade-in">
                    <div className="bg-white rounded-2xl max-w-md w-full p-5 shadow-2xl border border-slate-200 space-y-4">
                        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                                <Plus size={16} className="text-indigo-600" />
                                <span>Post Extra Ancillary Charge</span>
                            </h3>
                            <button onClick={() => setIsExtraChargeModalOpen(false)} className="text-slate-400 hover:text-slate-600 p-1 cursor-pointer">
                                <X size={16} />
                            </button>
                        </div>

                        <div className="space-y-3 text-xs">
                            <div>
                                <label className="font-semibold text-slate-700 block mb-1">Department / Revenue Head</label>
                                <select
                                    value={extraChargeForm.department}
                                    onChange={e => setExtraChargeForm({ ...extraChargeForm, department: e.target.value })}
                                    className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg font-semibold text-slate-800"
                                >
                                    <option value="F&B Room Service">F&B - Room Service Dining</option>
                                    <option value="Minibar">Housekeeping - Minibar Consumption</option>
                                    <option value="Laundry">Housekeeping - Express Laundry</option>
                                    <option value="Airport Transfer">Concierge - Airport Pickup & Drop</option>
                                    <option value="Spa & Wellness">Spa & Wellness Center</option>
                                </select>
                            </div>

                            <div>
                                <label className="font-semibold text-slate-700 block mb-1">Item Description</label>
                                <input
                                    type="text"
                                    value={extraChargeForm.description}
                                    onChange={e => setExtraChargeForm({ ...extraChargeForm, description: e.target.value })}
                                    className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="font-semibold text-slate-700 block mb-1">Unit Price (৳)</label>
                                    <input
                                        type="number"
                                        value={extraChargeForm.unitPrice || ''}
                                        onChange={e => setExtraChargeForm({ ...extraChargeForm, unitPrice: Number(e.target.value) })}
                                        className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg font-mono font-bold"
                                    />
                                </div>
                                <div>
                                    <label className="font-semibold text-slate-700 block mb-1">Quantity</label>
                                    <input
                                        type="number"
                                        min={1}
                                        value={extraChargeForm.quantity}
                                        onChange={e => setExtraChargeForm({ ...extraChargeForm, quantity: Number(e.target.value) })}
                                        className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg font-mono font-bold"
                                    />
                                </div>
                            </div>

                            {/* OP 16: Granular Item-Level Tax Exemption Toggle */}
                            <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 space-y-2">
                                <label className="flex items-center gap-2 cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={extraChargeForm.isTaxExempt}
                                        onChange={e => setExtraChargeForm({ ...extraChargeForm, isTaxExempt: e.target.checked })}
                                        className="size-4 text-purple-600 rounded"
                                    />
                                    <span className="font-semibold text-slate-800">Exempt Tax on this charge (OP 16)</span>
                                </label>
                                {extraChargeForm.isTaxExempt && (
                                    <input
                                        type="text"
                                        placeholder="Exemption reason (e.g. Consular fee / Duty-free service)"
                                        value={extraChargeForm.exemptionReason}
                                        onChange={e => setExtraChargeForm({ ...extraChargeForm, exemptionReason: e.target.value })}
                                        className="w-full p-1.5 bg-white border border-slate-200 rounded text-xs"
                                    />
                                )}
                            </div>
                        </div>

                        <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                            <button
                                type="button"
                                onClick={() => setIsExtraChargeModalOpen(false)}
                                className="px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-semibold text-slate-600 cursor-pointer"
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                onClick={handleAddExtraCharge}
                                className="px-4 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold cursor-pointer transition-colors shadow-2xs"
                            >
                                Post Charge
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* MODAL 3: Tax Exemption Modal (Op 4) */}
            {isTaxExemptionModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4 animate-in fade-in">
                    <div className="bg-white rounded-2xl max-w-md w-full p-5 shadow-2xl border border-slate-200 space-y-4">
                        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                                <ShieldCheck size={16} className="text-purple-600" />
                                <span>Statutory Tax Exemption (Diplomatic / Govt)</span>
                            </h3>
                            <button onClick={() => setIsTaxExemptionModalOpen(false)} className="text-slate-400 hover:text-slate-600 p-1 cursor-pointer">
                                <X size={16} />
                            </button>
                        </div>

                        <div className="space-y-3 text-xs">
                            <div>
                                <label className="font-semibold text-slate-700 block mb-1">Exemption Category</label>
                                <select
                                    value={taxExemptForm.exemptionType}
                                    onChange={e => setTaxExemptForm({ ...taxExemptForm, exemptionType: e.target.value as any })}
                                    className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg font-semibold text-slate-800"
                                >
                                    <option value="Diplomatic Mission / Embassy">Diplomatic Mission / Embassy (Vienna Convention)</option>
                                    <option value="UN / International Agency">UN / World Bank / International Agency</option>
                                    <option value="Government Official / Ministry">Government State Guest / Ministry</option>
                                    <option value="Export of Services / Zero-Rated">Export of Services / Foreign Transit</option>
                                </select>
                            </div>

                            <div>
                                <label className="font-semibold text-slate-700 block mb-1">Exemption Certificate / Note Verbale #</label>
                                <input
                                    type="text"
                                    value={taxExemptForm.certificateNumber}
                                    onChange={e => setTaxExemptForm({ ...taxExemptForm, certificateNumber: e.target.value })}
                                    className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg font-mono font-bold"
                                />
                            </div>

                            <div>
                                <label className="font-semibold text-slate-700 block mb-1">Legal Statutory Justification</label>
                                <input
                                    type="text"
                                    value={taxExemptForm.reason}
                                    onChange={e => setTaxExemptForm({ ...taxExemptForm, reason: e.target.value })}
                                    className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg"
                                />
                            </div>
                        </div>

                        <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                            <button
                                type="button"
                                onClick={() => setIsTaxExemptionModalOpen(false)}
                                className="px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-semibold text-slate-600 cursor-pointer"
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                onClick={handleApplyTaxExemption}
                                className="px-4 py-1.5 rounded-lg bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold cursor-pointer transition-colors shadow-2xs"
                            >
                                Confirm Tax Exemption
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* MODAL 4: Change Bill To (Op 6) */}
            {isBillToModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4 animate-in fade-in">
                    <div className="bg-white rounded-2xl max-w-md w-full p-5 shadow-2xl border border-slate-200 space-y-4">
                        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                                <Building2 size={16} className="text-indigo-600" />
                                <span>Change Invoice "Bill To" Entity</span>
                            </h3>
                            <button onClick={() => setIsBillToModalOpen(false)} className="text-slate-400 hover:text-slate-600 p-1 cursor-pointer">
                                <X size={16} />
                            </button>
                        </div>

                        <div className="space-y-3 text-xs">
                            <div className="grid grid-cols-3 gap-2">
                                <button
                                    type="button"
                                    onClick={() => setBillToForm({ ...billToForm, billTo: 'GUEST' })}
                                    className={`p-2 rounded-lg border text-center font-bold cursor-pointer transition-colors ${
                                        billToForm.billTo === 'GUEST' ? 'border-indigo-600 bg-indigo-50 text-indigo-700' : 'border-slate-200'
                                    }`}
                                >
                                    Guest Name
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setBillToForm({ ...billToForm, billTo: 'COMPANY' })}
                                    className={`p-2 rounded-lg border text-center font-bold cursor-pointer transition-colors ${
                                        billToForm.billTo === 'COMPANY' ? 'border-indigo-600 bg-indigo-50 text-indigo-700' : 'border-slate-200'
                                    }`}
                                >
                                    Company (Corp)
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setBillToForm({ ...billToForm, billTo: 'TRAVEL_AGENT' })}
                                    className={`p-2 rounded-lg border text-center font-bold cursor-pointer transition-colors ${
                                        billToForm.billTo === 'TRAVEL_AGENT' ? 'border-indigo-600 bg-indigo-50 text-indigo-700' : 'border-slate-200'
                                    }`}
                                >
                                    Travel Agent
                                </button>
                            </div>

                            {billToForm.billTo === 'COMPANY' && (
                                <div className="space-y-2 p-3 bg-slate-50 rounded-lg border border-slate-200">
                                    <div>
                                        <label className="font-semibold text-slate-700 block mb-1">Company Legal Name</label>
                                        <input
                                            type="text"
                                            value={billToForm.companyName}
                                            onChange={e => setBillToForm({ ...billToForm, companyName: e.target.value })}
                                            className="w-full p-2 bg-white border border-slate-200 rounded"
                                        />
                                    </div>
                                    <div>
                                        <label className="font-semibold text-slate-700 block mb-1">Company BIN / GSTIN</label>
                                        <input
                                            type="text"
                                            value={billToForm.companyTaxId}
                                            onChange={e => setBillToForm({ ...billToForm, companyTaxId: e.target.value })}
                                            className="w-full p-2 bg-white border border-slate-200 rounded font-mono font-bold"
                                        />
                                    </div>
                                    <div>
                                        <label className="font-semibold text-slate-700 block mb-1">Registered Address</label>
                                        <input
                                            type="text"
                                            value={billToForm.companyAddress}
                                            onChange={e => setBillToForm({ ...billToForm, companyAddress: e.target.value })}
                                            className="w-full p-2 bg-white border border-slate-200 rounded"
                                        />
                                    </div>
                                </div>
                            )}

                            {billToForm.billTo === 'TRAVEL_AGENT' && (
                                <div className="space-y-2 p-3 bg-slate-50 rounded-lg border border-slate-200">
                                    <div>
                                        <label className="font-semibold text-slate-700 block mb-1">Travel Agent / OTA Name</label>
                                        <input
                                            type="text"
                                            value={billToForm.travelAgentName}
                                            onChange={e => setBillToForm({ ...billToForm, travelAgentName: e.target.value })}
                                            className="w-full p-2 bg-white border border-slate-200 rounded"
                                        />
                                    </div>
                                    <div>
                                        <label className="font-semibold text-slate-700 block mb-1">Agent IATA / Code</label>
                                        <input
                                            type="text"
                                            value={billToForm.travelAgentCode}
                                            onChange={e => setBillToForm({ ...billToForm, travelAgentCode: e.target.value })}
                                            className="w-full p-2 bg-white border border-slate-200 rounded font-mono"
                                        />
                                    </div>
                                </div>
                            )}
                        </div>

                        <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                            <button
                                type="button"
                                onClick={() => setIsBillToModalOpen(false)}
                                className="px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-semibold text-slate-600 cursor-pointer"
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                onClick={handleSaveBillTo}
                                className="px-4 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold cursor-pointer transition-colors shadow-2xs"
                            >
                                Save Bill To
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* MODAL 5: Void Payment (Op 13) */}
            {isVoidPaymentModalOpen && targetPaymentTxn && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4 animate-in fade-in">
                    <div className="bg-white rounded-2xl max-w-md w-full p-5 shadow-2xl border border-slate-200 space-y-4">
                        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                            <h3 className="text-sm font-bold text-rose-700 flex items-center gap-2">
                                <ShieldAlert size={16} />
                                <span>Supervisor Void Payment Authorization</span>
                            </h3>
                            <button onClick={() => setIsVoidPaymentModalOpen(false)} className="text-slate-400 hover:text-slate-600 p-1 cursor-pointer">
                                <X size={16} />
                            </button>
                        </div>

                        <div className="p-3 bg-rose-50 rounded-lg border border-rose-200 text-xs text-rose-900 space-y-1">
                            <p><strong>Ref:</strong> {targetPaymentTxn.refNo} • <strong>Amount:</strong> ৳ {targetPaymentTxn.amount.toLocaleString()}</p>
                            <p className="text-[11px] text-rose-700">Warning: Voiding reverses this payment and immediately restores the outstanding debit balance to the guest folio.</p>
                        </div>

                        <div className="space-y-3 text-xs">
                            <div>
                                <label className="font-semibold text-slate-700 block mb-1">Supervisor Authorization PIN (Default: 1234)</label>
                                <input
                                    type="password"
                                    placeholder="Enter 4-digit PIN"
                                    value={voidSupervisorPin}
                                    onChange={e => setVoidSupervisorPin(e.target.value)}
                                    className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg font-mono font-bold tracking-widest text-center"
                                />
                            </div>

                            <div>
                                <label className="font-semibold text-slate-700 block mb-1">Mandatory Audit Void Reason</label>
                                <input
                                    type="text"
                                    placeholder="e.g. Wrong tender selected, Guest paid by Card"
                                    value={voidReasonInput}
                                    onChange={e => setVoidReasonInput(e.target.value)}
                                    className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg"
                                />
                            </div>
                        </div>

                        <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                            <button
                                type="button"
                                onClick={() => setIsVoidPaymentModalOpen(false)}
                                className="px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-semibold text-slate-600 cursor-pointer"
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                onClick={handleVoidPayment}
                                className="px-4 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold cursor-pointer transition-colors shadow-2xs"
                            >
                                Authorize Void
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* MODAL 6: Print POS Thermal Slip for Extra Charge (Op 15) */}
            {isPrintSlipModalOpen && targetChargeSlip && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4 animate-in fade-in">
                    <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-2xl border border-slate-200 space-y-4 font-mono text-xs">
                        <div className="text-center border-b border-dashed pb-3">
                            <h4 className="font-black text-sm">GRAND PALACE HOTEL</h4>
                            <p className="text-[10px] text-slate-500">ROOM CHARGE VOUCHER SLIP</p>
                        </div>

                        <div className="space-y-1.5 text-[11px]">
                            <p><strong>Room:</strong> {currentFolio?.roomNumber}</p>
                            <p><strong>Guest:</strong> {currentFolio?.guestName}</p>
                            <p><strong>Voucher #:</strong> {targetChargeSlip.voucherNumber || targetChargeSlip.refNo}</p>
                            <p><strong>Date/Time:</strong> {targetChargeSlip.date}</p>
                            <div className="border-t border-dashed my-2"></div>
                            <p><strong>Charge:</strong> {targetChargeSlip.particulars}</p>
                            <p><strong>Total Amount:</strong> ৳ {Math.abs(targetChargeSlip.amount).toLocaleString()}</p>
                            <div className="border-t border-dashed my-3"></div>
                            <div className="pt-6 text-center">
                                <div className="border-t border-slate-400 w-3/4 mx-auto mb-1"></div>
                                <span className="text-[10px] text-slate-500">Guest Signature</span>
                            </div>
                        </div>

                        <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2 font-sans">
                            <button
                                type="button"
                                onClick={() => setIsPrintSlipModalOpen(false)}
                                className="px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-semibold text-slate-600 cursor-pointer"
                            >
                                Close
                            </button>
                            <button
                                type="button"
                                onClick={() => {
                                    window.print();
                                    setIsPrintSlipModalOpen(false);
                                }}
                                className="px-4 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold cursor-pointer transition-colors shadow-2xs flex items-center gap-1.5"
                            >
                                <Printer size={13} />
                                <span>Print Thermal 80mm</span>
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* MODAL 7: Settle Cancelled Deposit (Op 12) */}
            {isSettleDepositModalOpen && targetCancelledRes && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4 animate-in fade-in">
                    <div className="bg-white rounded-2xl max-w-md w-full p-5 shadow-2xl border border-slate-200 space-y-4 text-xs">
                        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                                <AlertTriangle size={16} className="text-amber-600" />
                                <span>Settle Deposit for {targetCancelledRes.reservationNumber}</span>
                            </h3>
                            <button onClick={() => setIsSettleDepositModalOpen(false)} className="text-slate-400 hover:text-slate-600 p-1 cursor-pointer">
                                <X size={16} />
                            </button>
                        </div>

                        <div className="p-3 bg-amber-50 rounded-lg border border-amber-200 text-amber-900 space-y-1">
                            <p><strong>Guest:</strong> {targetCancelledRes.guestName}</p>
                            <p><strong>Advance Deposit Held:</strong> ৳ {Number(targetCancelledRes.paidAmount || 5000).toLocaleString()}</p>
                        </div>

                        <div className="space-y-2">
                            <label className="font-semibold text-slate-700 block">Settlement Strategy</label>
                            <div className="space-y-1.5">
                                <label className="flex items-center gap-2 p-2 rounded-lg border border-slate-200 hover:bg-slate-50 cursor-pointer">
                                    <input
                                        type="radio"
                                        name="settleOption"
                                        checked={depositSettleForm.settleOption === 'RETENTION'}
                                        onChange={() => setDepositSettleForm({ ...depositSettleForm, settleOption: 'RETENTION' })}
                                    />
                                    <span><strong>Forfeit Deposit (Cancellation Income GL-4501)</strong></span>
                                </label>
                                <label className="flex items-center gap-2 p-2 rounded-lg border border-slate-200 hover:bg-slate-50 cursor-pointer">
                                    <input
                                        type="radio"
                                        name="settleOption"
                                        checked={depositSettleForm.settleOption === 'REFUND'}
                                        onChange={() => setDepositSettleForm({ ...depositSettleForm, settleOption: 'REFUND' })}
                                    />
                                    <span><strong>Full Refund to Guest via Original Tender</strong></span>
                                </label>
                                <label className="flex items-center gap-2 p-2 rounded-lg border border-slate-200 hover:bg-slate-50 cursor-pointer">
                                    <input
                                        type="radio"
                                        name="settleOption"
                                        checked={depositSettleForm.settleOption === 'VOUCHER'}
                                        onChange={() => setDepositSettleForm({ ...depositSettleForm, settleOption: 'VOUCHER' })}
                                    />
                                    <span><strong>Convert to 1-Year Guest Credit Stay Voucher</strong></span>
                                </label>
                            </div>
                        </div>

                        <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                            <button
                                type="button"
                                onClick={() => setIsSettleDepositModalOpen(false)}
                                className="px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-semibold text-slate-600 cursor-pointer"
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                onClick={handleSettleCancelledDeposit}
                                className="px-4 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold cursor-pointer transition-colors shadow-2xs"
                            >
                                Execute Settlement
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* OP 08: STATUTORY TAX IDENTIFIER (BIN / GSTIN / TIN) MODAL */}
            {isTaxIdModalOpen && currentFolio && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4 animate-in fade-in">
                    <div className="bg-white rounded-2xl max-w-md w-full p-5 shadow-2xl border border-slate-200 space-y-4">
                        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                            <div className="flex items-center gap-2">
                                <Tag size={16} className="text-indigo-600" />
                                <h3 className="text-sm font-bold text-slate-800">Add / Update Tax Identifier (BIN / GSTIN / TIN)</h3>
                            </div>
                            <button onClick={() => setIsTaxIdModalOpen(false)} className="text-slate-400 hover:text-slate-600 p-1 cursor-pointer">
                                <X size={16} />
                            </button>
                        </div>

                        <div className="space-y-3 text-xs">
                            <p className="text-slate-600">
                                Enter the guest's or company's statutory tax identification number to print on the final tax invoice.
                            </p>
                            <div>
                                <label className="block text-[11px] font-bold text-slate-600 mb-1">
                                    Statutory GSTIN / BIN / TIN Number
                                </label>
                                <input
                                    type="text"
                                    value={taxIdInput}
                                    onChange={e => setTaxIdInput(e.target.value)}
                                    placeholder="e.g. BIN-001928374-0101 or 29ABCDE1234F1Z5"
                                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs font-mono focus:ring-1 focus:ring-indigo-500 outline-none uppercase"
                                />
                            </div>
                        </div>

                        <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                            <button
                                type="button"
                                onClick={() => setIsTaxIdModalOpen(false)}
                                className="px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-semibold text-slate-600 cursor-pointer"
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                onClick={handleSaveTaxId}
                                className="px-4 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold cursor-pointer transition-colors shadow-2xs"
                            >
                                Save Tax Identifier
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* OP 02: EMAIL INVOICE MODAL */}
            {isEmailInvoiceModalOpen && currentFolio && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4 animate-in fade-in">
                    <div className="bg-white rounded-2xl max-w-lg w-full p-5 shadow-2xl border border-slate-200 space-y-4">
                        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                            <div className="flex items-center gap-2">
                                <Mail size={16} className="text-blue-600" />
                                <h3 className="text-sm font-bold text-slate-800">Email Folio Statement & Tax Invoice</h3>
                            </div>
                            <button onClick={() => setIsEmailInvoiceModalOpen(false)} className="text-slate-400 hover:text-slate-600 p-1 cursor-pointer">
                                <X size={16} />
                            </button>
                        </div>

                        <div className="space-y-3 text-xs">
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-[11px] font-bold text-slate-600 mb-1">Recipient Target</label>
                                    <select
                                        value={emailForm.recipientType}
                                        onChange={e => setEmailForm({ ...emailForm, recipientType: e.target.value as any })}
                                        className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg text-xs"
                                    >
                                        <option value="guest">Guest ({currentFolio.guestName})</option>
                                        <option value="company">Corporate Account ({currentFolio.companyName || 'SCB Ltd'})</option>
                                        <option value="agent">Travel Agent / OTA ({currentFolio.travelAgentName || 'Booking.com'})</option>
                                        <option value="custom">Custom Email Address</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-[11px] font-bold text-slate-600 mb-1">Invoice Format</label>
                                    <select
                                        value={emailForm.invoiceType}
                                        onChange={e => setEmailForm({ ...emailForm, invoiceType: e.target.value as any })}
                                        className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg text-xs"
                                    >
                                        <option value="tax-invoice">Official Fiscal Tax Invoice</option>
                                        <option value="proforma">Proforma Folio Statement</option>
                                        <option value="corporate-summary">Consolidated Corporate Summary</option>
                                    </select>
                                </div>
                            </div>

                            <div>
                                <label className="block text-[11px] font-bold text-slate-600 mb-1">Recipient Email</label>
                                <input
                                    type="email"
                                    value={emailForm.emailTo}
                                    onChange={e => setEmailForm({ ...emailForm, emailTo: e.target.value })}
                                    placeholder={currentFolio.guestEmail || 'recipient@email.com'}
                                    className="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-xs outline-none"
                                />
                            </div>

                            <div>
                                <label className="block text-[11px] font-bold text-slate-600 mb-1">Subject</label>
                                <input
                                    type="text"
                                    value={emailForm.subject}
                                    onChange={e => setEmailForm({ ...emailForm, subject: e.target.value })}
                                    className="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-xs outline-none"
                                />
                            </div>

                            <div>
                                <label className="block text-[11px] font-bold text-slate-600 mb-1">Email Body Message</label>
                                <textarea
                                    value={emailForm.message}
                                    onChange={e => setEmailForm({ ...emailForm, message: e.target.value })}
                                    rows={3}
                                    className="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-xs outline-none resize-none"
                                />
                            </div>
                        </div>

                        <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                            <button
                                type="button"
                                onClick={() => setIsEmailInvoiceModalOpen(false)}
                                className="px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-semibold text-slate-600 cursor-pointer"
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                onClick={handleSendEmailInvoice}
                                className="px-4 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold cursor-pointer transition-colors shadow-2xs flex items-center gap-1.5"
                            >
                                <Mail size={13} />
                                <span>Send Invoice PDF</span>
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default FolioHub;
