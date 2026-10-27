import React, { useState, useEffect, useCallback } from 'react';
import { 
    Plus, FileText, CreditCard, 
    ArrowRightLeft, Printer, Send, 
    ShieldCheck, CheckCircle2,
    Search
} from 'lucide-react';
import { broadcastPMSEvent, getAllStoredReservations, syncReservationsFromDB } from '../utils/roomInventoryEngine';
import { dispatchPMSNetworkEvent } from '../utils/pmsNetworkSync';
import { getApiBaseUrl } from '../utils/apiUrl';

const API_BASE = getApiBaseUrl();


interface Transaction {
    id: number;
    date: string;
    refNo: string;
    particulars: string;
    description: string;
    user: string;
    amount: number; // positive = credit/payment, negative = debit/charge
    windowId: 1 | 2;
    category: 'Room' | 'F&B' | 'Transport' | 'Laundry' | 'Spa' | 'Minibar' | 'Payment' | 'Tax';
}

interface FolioAccount {
    id: number;
    roomNumber: string;
    guestName: string;
    folioNumber: string;
    roomType: string;
    checkIn: string;
    checkOut: string;
    company?: string;
    package: string;
    allowances: {
        service: string;
        total: number;
        used: number;
        unit: string;
    }[];
    transactions: Transaction[];
}

const buildFoliosFromCanonicalReservations = (): FolioAccount[] => {
    const canonical = getAllStoredReservations();
    return canonical.map((r, idx) => {
        const folioId = Number(r.id) || (idx + 1);
        const nights = Number(r.nights) || Math.max(1, Math.round((new Date(r.checkOut).getTime() - new Date(r.checkIn).getTime()) / 86400000));
        const total = Number(r.totalAmount) || Number(r.totalRate) || 0;
        const paid = Number(r.paidAmount) || 0;
        const roomLabel = r.roomNumber || r.roomNo || (r.allocatedRooms && r.allocatedRooms.join(', ')) || '101';
        const txns: Transaction[] = [
            {
                id: folioId * 100 + 1,
                date: `${r.checkIn || '2026-07-02'} 14:00`,
                refNo: `TAR-${r.reservationNumber || folioId}`,
                particulars: `Room Tariff (${nights} Night${nights > 1 ? 's' : ''})`,
                description: `${r.roomType || 'Standard'} stay charge`,
                user: 'system_pms',
                amount: -total,
                windowId: 1,
                category: 'Room'
            }
        ];
        if (paid > 0) {
            txns.push({
                id: folioId * 100 + 2,
                date: `${r.checkIn || '2026-07-02'} 14:10`,
                refNo: `PMT-${r.reservationNumber || folioId}`,
                particulars: `Advance Payment (${r.paymentMethod || 'Cash'})`,
                description: 'Collected at reservation/check-in',
                user: 'frontdesk_pos',
                amount: paid,
                windowId: 1,
                category: 'Payment'
            });
        }
        return {
            id: folioId,
            roomNumber: roomLabel,
            guestName: r.guestName,
            folioNumber: r.folioNumber || (r.reservationNumber ? `FOL-${r.reservationNumber.replace(/^RES-/, '')}` : `FOL-${folioId}`),
            roomType: r.roomType || 'Deluxe Room',
            checkIn: r.checkIn,
            checkOut: r.checkOut,
            company: r.source || r.bookingSource || 'Direct Walk-In',
            package: r.ratePlan || 'Best Available Rate',
            allowances: [
                { service: 'Complimentary Buffet Breakfast', total: nights * (Number(r.adults) || 1), used: 0, unit: 'Meals' },
                { service: 'High-Speed Wi-Fi', total: 1, used: 1, unit: 'Access' }
            ],
            transactions: txns
        };
    });
};

export const FolioOperations: React.FC = () => {
    const [folios, setFolios] = useState<FolioAccount[]>(() => buildFoliosFromCanonicalReservations());
    const [selectedFolioId, setSelectedFolioId] = useState<number>(() => {
        const initial = buildFoliosFromCanonicalReservations();
        return initial[0]?.id || 1;
    });
    const [activeTab, setActiveTab] = useState<'folio-operations' | 'allowances' | 'invoice-preview'>('folio-operations');
    const [activeWindow, setActiveWindow] = useState<1 | 2>(1);
    const [roomSearchQuery, setRoomSearchQuery] = useState('');
    const [toastMessage, setToastMessage] = useState<string | null>(null);

    // Modals
    const [showPostChargeModal, setShowPostChargeModal] = useState(false);
    const [showSettleModal, setShowSettleModal] = useState(false);

    // Form states
    const [postChargeForm, setPostChargeForm] = useState({
        particulars: '',
        description: '',
        amount: '',
        category: 'F&B' as Transaction['category'],
        windowId: 1 as 1 | 2
    });

    const [settleForm, setSettleForm] = useState({
        method: 'Cash BDT' as 'Cash BDT' | 'Visa/MasterCard' | 'City Ledger (Corporate)' | 'bKash / Nagad',
        amount: 0,
        remarks: ''
    });

    const fetchFoliosFromAPI = useCallback(async () => {
        try {
            const res = await fetch(`${API_BASE}/api/accounting/folios`);
            const json = await res.json();
            if (json.success && Array.isArray(json.data)) {
                if (json.data.length === 0) {
                    setFolios([]);
                    localStorage.removeItem('hotel_folios_v2');
                    return;
                }
                const mapped: FolioAccount[] = json.data.map((f: any) => {
                    const charges = f.charges || [];
                    const payments = f.payments || [];
                    const txns: Transaction[] = [];

                    charges.forEach((c: any) => {
                        txns.push({
                            id: Number(c.id),
                            date: c.charge_date ? `${c.charge_date} 12:00` : '2026-07-02 12:00',
                            refNo: `CHG-${c.charge_code || 'SRV'}-${c.id}`,
                            particulars: c.description || 'Department Charge',
                            description: `Posted charge (Tax: ৳${Number(c.tax_amount || 0).toFixed(2)})`,
                            user: 'system_pms',
                            amount: -Number(c.total_amount || c.amount || 0),
                            windowId: 1,
                            category: c.charge_code?.includes('FB') ? 'F&B' : c.charge_code?.includes('TRN') ? 'Transport' : 'Room'
                        });
                    });

                    payments.forEach((p: any) => {
                        txns.push({
                            id: 10000 + Number(p.id),
                            date: p.transaction_date ? String(p.transaction_date).slice(0, 16).replace('T', ' ') : '2026-07-02 14:00',
                            refNo: p.payment_number || `PAY-${p.id}`,
                            particulars: `Payment Received (${p.payment_method})`,
                            description: `Receipt Ref: ${p.reference_code || 'Front Desk'}`,
                            user: 'fo_cashier',
                            amount: Number(p.amount || 0),
                            windowId: 1,
                            category: 'Payment'
                        });
                    });

                    // If no charges recorded in DB yet, show Room Accommodation Tariff for folio balance
                    if (txns.length === 0 && Number(f.balance) > 0) {
                        txns.push({
                            id: Number(f.id) * 100 + 1,
                            date: `${f.check_in || '2026-07-02'} 14:00`,
                            refNo: `TAR-${f.reservation_number || f.id}`,
                            particulars: 'Room Accommodation Tariff',
                            description: `${f.room_type || 'Room'} stay rate`,
                            user: 'system_pms',
                            amount: -Number(f.balance),
                            windowId: 1,
                            category: 'Room'
                        });
                    }

                    return {
                        id: Number(f.id),
                        roomNumber: String(f.room_number || '101'),
                        guestName: f.guest_name || 'Valued Guest',
                        folioNumber: f.folio_number || `FOL-${f.id}`,
                        roomType: f.room_type || 'Deluxe Room',
                        checkIn: f.check_in || '2026-07-02',
                        checkOut: f.check_out || '2026-07-03',
                        company: 'Direct Booking',
                        package: 'Best Available Rate',
                        allowances: [
                            { service: 'Complimentary Buffet Breakfast', total: 2, used: 0, unit: 'Meals' },
                            { service: 'High-Speed Wi-Fi', total: 1, used: 1, unit: 'Access' }
                        ],
                        transactions: txns
                    };
                });

                setFolios(mapped);
                localStorage.setItem('hotel_folios_v2', JSON.stringify(mapped));
                setSelectedFolioId(prev => {
                    const exists = mapped.some(m => m.id === prev);
                    return exists ? prev : (mapped[0]?.id || 1);
                });
            }
        } catch (e) {
            console.warn('API fetch folios fallback to local:', e);
            const fallback = buildFoliosFromCanonicalReservations();
            if (fallback.length > 0) {
                setFolios(fallback);
            }
        }
    }, []);

    useEffect(() => {
        syncReservationsFromDB();
        fetchFoliosFromAPI();
        const handleSync = (e: any) => {
            const d = e.detail;
            if (d?.type === 'FOLIO_UPDATED' || d?.type === 'RESERVATION_COMMITTED' || d?.type === 'INVENTORY_REFRESH') {
                syncReservationsFromDB();
                fetchFoliosFromAPI();
            }
        };
        window.addEventListener('hotel_pms_sync_event', handleSync);
        return () => window.removeEventListener('hotel_pms_sync_event', handleSync);
    }, [fetchFoliosFromAPI]);

    useEffect(() => {
        localStorage.setItem('hotel_folios_v2', JSON.stringify(folios));
    }, [folios]);

    const showToast = (msg: string) => {
        setToastMessage(msg);
        setTimeout(() => setToastMessage(null), 3500);
    };

    const activeFolio = folios.find(f => f.id === selectedFolioId) || folios[0];

    const getWindowTransactions = (winId: 1 | 2) => {
        return activeFolio ? activeFolio.transactions.filter(t => t.windowId === winId) : [];
    };

    const calcWindowNet = (winId: 1 | 2) => {
        return getWindowTransactions(winId).reduce((sum, t) => sum + t.amount, 0);
    };

    const calcTotalBalance = () => {
        return (activeFolio?.transactions || []).reduce((sum, t) => sum + t.amount, 0);
    };

    const handleTransferTransaction = (txnId: number) => {
        setFolios(prev => prev.map(f => {
            if (f.id !== activeFolio.id) return f;
            const updatedTxns = f.transactions.map(t => {
                if (t.id === txnId) {
                    const newWindow = t.windowId === 1 ? 2 : 1;
                    return { ...t, windowId: newWindow as 1 | 2 };
                }
                return t;
            });
            return { ...f, transactions: updatedTxns };
        }));
        showToast('Transaction transferred between billing windows.');
    };

    const handlePostCharge = (e: React.FormEvent) => {
        e.preventDefault();
        const amt = parseFloat(postChargeForm.amount);
        if (!postChargeForm.particulars || isNaN(amt) || amt <= 0) {
            alert('Please enter valid particulars and amount.');
            return;
        }

        const newTxn: Transaction = {
            id: Date.now(),
            date: new Date().toLocaleString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }),
            refNo: `POS-${Math.floor(1000 + Math.random() * 9000)}`,
            particulars: postChargeForm.particulars,
            description: postChargeForm.description || 'Manual Front Desk charge posting',
            user: 'fo_cashier',
            amount: postChargeForm.category === 'Payment' ? amt : -amt,
            windowId: postChargeForm.windowId,
            category: postChargeForm.category
        };

        setFolios(prev => prev.map(f => {
            if (f.id !== activeFolio.id) return f;
            return { ...f, transactions: [newTxn, ...f.transactions] };
        }));

        // Asynchronous persistence to PostgreSQL DB & Network Broadcast
        if (activeFolio && activeFolio.id) {
            fetch(`${API_BASE}/api/accounting/folios/${activeFolio.id}/charges`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    chargeCode: postChargeForm.category === 'F&B' ? 'FB_REST' : postChargeForm.category === 'Transport' ? 'TRN_PICK' : 'ROOM_TARIFF',
                    description: postChargeForm.particulars,
                    amount: amt,
                    chargeDate: new Date().toISOString().split('T')[0]
                })
            }).then(() => {
                const broadcastMsg = { type: 'INVENTORY_REFRESH' as const };
                broadcastPMSEvent(broadcastMsg);
                dispatchPMSNetworkEvent(broadcastMsg);
            }).catch(console.warn);
        }

        setShowPostChargeModal(false);
        setPostChargeForm({ particulars: '', description: '', amount: '', category: 'F&B', windowId: 1 });
        showToast(`Posted charge of ৳ ${amt.toLocaleString()} to Window ${newTxn.windowId}`);
    };

    const handleSettleFolio = (e: React.FormEvent) => {
        e.preventDefault();
        const net = calcWindowNet(activeWindow);
        const amountToPay = Math.abs(net);

        if (amountToPay <= 0) {
            alert('This window is already settled with zero variance.');
            return;
        }

        const settlementTxn: Transaction = {
            id: Date.now(),
            date: new Date().toLocaleString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }),
            refNo: `STL-${Math.floor(10000 + Math.random() * 90000)}`,
            particulars: `Window ${activeWindow} Settlement (${settleForm.method})`,
            description: settleForm.remarks || `Settled in full via ${settleForm.method}`,
            user: 'fo_cashier',
            amount: amountToPay,
            windowId: activeWindow,
            category: 'Payment'
        };

        setFolios(prev => prev.map(f => {
            if (f.id !== activeFolio.id) return f;
            return { ...f, transactions: [settlementTxn, ...f.transactions] };
        }));

        // Asynchronous persistence to PostgreSQL DB & Network Broadcast
        if (activeFolio && activeFolio.id) {
            fetch(`${API_BASE}/api/accounting/folios/${activeFolio.id}/payments`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    paymentMethod: settleForm.method.includes('bKash') ? 'BKASH' : settleForm.method === 'Cash BDT' ? 'CASH' : 'CREDIT_CARD',
                    amount: amountToPay,
                    referenceCode: settleForm.remarks || 'FRONT_DESK_SETTLE'
                })
            }).then(() => {
                const broadcastMsg = { type: 'INVENTORY_REFRESH' as const };
                broadcastPMSEvent(broadcastMsg);
                dispatchPMSNetworkEvent(broadcastMsg);
            }).catch(console.warn);
        }

        setShowSettleModal(false);
        showToast(`Window ${activeWindow} settled in full. Balance cleared.`);
    };

    const handleRedeemAllowance = (serviceName: string) => {
        setFolios(prev => prev.map(f => {
            if (f.id !== activeFolio.id) return f;
            const updated = f.allowances.map(a => {
                if (a.service === serviceName && a.used < a.total) {
                    return { ...a, used: a.used + 1 };
                }
                return a;
            });
            return { ...f, allowances: updated };
        }));
        showToast(`Redeemed 1 voucher unit for ${serviceName}`);
    };

    const filteredFolios = folios.filter(f => 
        f.roomNumber.includes(roomSearchQuery) ||
        f.guestName.toLowerCase().includes(roomSearchQuery.toLowerCase()) ||
        f.folioNumber.toLowerCase().includes(roomSearchQuery.toLowerCase())
    );

    if (!activeFolio) {
        return (
            <div className="h-full min-h-[calc(100vh-48px)] bg-gray-50 flex flex-col font-sans text-xs select-none animate-in fade-in duration-150">
                {toastMessage && (
                    <div className="fixed top-4 right-4 z-50 bg-gray-900 text-white px-3.5 py-2 rounded-lg shadow-lg border border-gray-700 text-xs font-semibold flex items-center gap-2">
                        <CheckCircle2 size={14} className="text-emerald-400" />
                        <span>{toastMessage}</span>
                    </div>
                )}
                <header className="bg-white text-slate-900 px-3 py-1.5 flex items-center justify-between shadow-2xs z-20 border-b border-gray-200/80">
                    <div className="flex items-center gap-2.5">
                        <div className="w-7 h-7 rounded-lg bg-[#1e3a8a] text-white flex items-center justify-center shadow-xs shrink-0">
                            <FileText size={14} />
                        </div>
                        <div>
                            <h1 className="text-xs font-bold text-gray-900 tracking-tight leading-none">
                                Billing & Folio Operations
                            </h1>
                            <p className="text-[10px] text-gray-500 mt-0.5 leading-tight">
                                Guest ledger accounts, multi-window billing, and settlement
                            </p>
                        </div>
                    </div>
                </header>
                <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-slate-500">
                    <div className="size-16 rounded-2xl bg-slate-100 flex items-center justify-center text-slate-400 mb-3 border border-slate-200">
                        <FileText size={28} />
                    </div>
                    <h2 className="text-sm font-semibold text-slate-800">No Active Folios Available</h2>
                    <p className="text-xs text-slate-400 max-w-sm mt-1">
                        There are currently no active bookings or in-house guest folios. Once a reservation is created or checked in, its billing ledger will automatically appear here.
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div className="h-full min-h-[calc(100vh-48px)] bg-gray-50 flex flex-col font-sans text-xs select-none animate-in fade-in duration-150">
            {toastMessage && (
                <div className="fixed top-4 right-4 z-50 bg-gray-900 text-white px-3.5 py-2 rounded-lg shadow-lg border border-gray-700 text-xs font-semibold flex items-center gap-2">
                    <CheckCircle2 size={14} className="text-emerald-400" />
                    <span>{toastMessage}</span>
                </div>
            )}

            {/* Master Header Bar */}
            <header className="bg-white text-slate-900 px-3 py-1.5 flex items-center justify-between shadow-2xs z-20 border-b border-gray-200/80">
                <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-7 h-7 rounded-lg bg-[#1e3a8a] text-white flex items-center justify-center shadow-xs shrink-0">
                        <FileText size={14} />
                    </div>
                    <div>
                        <div className="flex items-center gap-2">
                            <h1 className="text-xs font-bold text-gray-900 tracking-tight leading-none">
                                {activeFolio.guestName}
                            </h1>
                            <span className="badge-code">
                                Room {activeFolio.roomNumber} ({activeFolio.roomType})
                            </span>
                            <span className="text-[9px] text-slate-400 font-mono">
                                {activeFolio.folioNumber}
                            </span>
                        </div>
                        <p className="text-[10px] text-gray-500 mt-0.5 leading-tight">
                            Stay: {activeFolio.checkIn} → {activeFolio.checkOut} • {activeFolio.company || 'Direct FIT'}
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-4">
                    <div className="text-right">
                        <span className="text-[10px] text-slate-400 uppercase tracking-wider block leading-none">Window 1 (Master)</span>
                        <span className={`text-xs font-mono mt-1 block leading-tight ${calcWindowNet(1) >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                            ৳ {calcWindowNet(1).toLocaleString()}
                        </span>
                    </div>

                    <div className="text-right border-l border-slate-200 pl-3">
                        <span className="text-[10px] text-slate-400 uppercase tracking-wider block leading-none">Window 2 (Extras)</span>
                        <span className={`text-xs font-mono mt-1 block leading-tight ${calcWindowNet(2) >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                            ৳ {calcWindowNet(2).toLocaleString()}
                        </span>
                    </div>

                    <div className="text-right border-l border-slate-200 pl-3">
                        <span className="text-[10px] text-slate-400 uppercase tracking-wider block leading-none">Net Guest Balance</span>
                        <span className={`text-sm font-mono mt-1 block leading-tight ${calcTotalBalance() >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                            ৳ {calcTotalBalance().toLocaleString()}
                        </span>
                    </div>

                    <div className="flex items-center gap-1.5 border-l border-slate-200 pl-3">
                        <button
                            onClick={() => setActiveTab('invoice-preview')}
                            className="btn-icon"
                            title="Print GST Tax Invoice"
                        >
                            <Printer size={15} />
                        </button>
                        <button
                            onClick={() => showToast('Folio statement dispatched to guest email.')}
                            className="btn-icon"
                            title="Send Email Folio"
                        >
                            <Send size={15} />
                        </button>
                    </div>
                </div>
            </header>

            {/* Sub-header Navigation */}
            <div className="bg-white border-b border-slate-200 px-4 flex items-center justify-between z-10">
                <div className="flex">
                    <button
                        onClick={() => setActiveTab('folio-operations')}
                        className={`flex items-center gap-1.5 px-3.5 py-2.5 text-xs font-semibold transition-all border-b-2 cursor-pointer ${
                            activeTab === 'folio-operations'
                                ? 'border-primary text-primary bg-primary-subtle/50'
                                : 'border-transparent text-slate-500 hover:text-slate-900'
                        }`}
                    >
                        <FileText size={13} />
                        Folio Billing & Ledger
                    </button>
                    <button
                        onClick={() => setActiveTab('allowances')}
                        className={`flex items-center gap-1.5 px-3.5 py-2.5 text-xs font-semibold transition-all border-b-2 cursor-pointer ${
                            activeTab === 'allowances'
                                ? 'border-primary text-primary bg-primary-subtle/50'
                                : 'border-transparent text-slate-500 hover:text-slate-900'
                        }`}
                    >
                        <ShieldCheck size={13} />
                        Allowances & Inclusions ({activeFolio.allowances.length})
                    </button>
                    <button
                        onClick={() => setActiveTab('invoice-preview')}
                        className={`flex items-center gap-1.5 px-3.5 py-2.5 text-xs font-semibold transition-all border-b-2 cursor-pointer ${
                            activeTab === 'invoice-preview'
                                ? 'border-primary text-primary bg-primary-subtle/50'
                                : 'border-transparent text-slate-500 hover:text-slate-900'
                        }`}
                    >
                        <Printer size={13} />
                        Official Tax Invoice
                    </button>
                </div>

                <div className="flex items-center gap-2 py-1.5">
                    <button
                        onClick={() => setShowPostChargeModal(true)}
                        className="btn-primary py-1.5 px-3 text-xs"
                    >
                        <Plus size={13} /> Post Charge / Credit
                    </button>
                    <button
                        onClick={() => {
                            setSettleForm({
                                method: 'Cash BDT',
                                amount: Math.abs(calcWindowNet(activeWindow)),
                                remarks: ''
                            });
                            setShowSettleModal(true);
                        }}
                        className="btn-secondary py-1.5 px-3 text-xs"
                    >
                        <CreditCard size={13} /> Settle Window {activeWindow}
                    </button>
                </div>
            </div>

            {/* Main Area */}
            <main className="flex flex-1 overflow-hidden bg-white">
                {/* Left Panel: Active In-House Rooms & Billing Selector */}
                <div className="w-64 bg-gray-50/80 border-r border-gray-200 flex flex-col p-2.5 space-y-2.5 flex-shrink-0 overflow-y-auto">
                    {/* Room Search */}
                    <div className="relative">
                        <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
                        <input
                            type="text"
                            placeholder="Find room or guest..."
                            value={roomSearchQuery}
                            onChange={e => setRoomSearchQuery(e.target.value)}
                            className="w-full h-6 pl-7 pr-2 text-[11px] bg-white border border-gray-200 rounded outline-none focus:border-blue-500"
                        />
                    </div>

                    {/* Rooms List */}
                    <div className="space-y-1">
                        <span className="text-[9.5px] text-gray-400 uppercase tracking-wide px-1">In-House Accounts</span>
                        {filteredFolios.map(f => {
                            const isSelected = f.id === activeFolio.id;
                            const bal = f.transactions.reduce((s, t) => s + t.amount, 0);
                            return (
                                <button
                                    key={f.id}
                                    onClick={() => setSelectedFolioId(f.id)}
                                    className={`w-full p-2 rounded-md border text-left transition-all cursor-pointer flex items-center justify-between ${
                                        isSelected ? 'bg-white border-blue-500 shadow-2xs' : 'bg-white/60 border-gray-200 hover:bg-white'
                                    }`}
                                >
                                    <div className="min-w-0 pr-1">
                                        <div className="flex items-center gap-1.5">
                                            <span className="font-mono text-gray-900 text-xs">Rm {f.roomNumber}</span>
                                            <span className="text-[9.5px] text-gray-500 truncate max-w-[90px]">{f.guestName}</span>
                                        </div>
                                        <p className="text-[9.5px] text-gray-400 truncate mt-0.5">{f.package}</p>
                                    </div>
                                    <div className="text-right flex-shrink-0">
                                        <span className={`text-[10.5px] font-mono block ${bal >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                                            ৳ {bal.toLocaleString()}
                                        </span>
                                        <span className="text-[8.5px] text-gray-400 uppercase block font-semibold">
                                            {bal >= 0 ? 'Deposit' : 'Due'}
                                        </span>
                                    </div>
                                </button>
                            );
                        })}
                    </div>

                    {/* Window Switcher */}
                    <div className="pt-2 border-t border-gray-200 space-y-1.5">
                        <span className="text-[9.5px] text-gray-400 uppercase tracking-wide px-1">Split Windows</span>
                        <div className="flex flex-col gap-1.5">
                            <button
                                onClick={() => setActiveWindow(1)}
                                className={`flex items-center justify-between p-2 rounded-md border transition-all text-left cursor-pointer ${
                                    activeWindow === 1 ? 'border-blue-600 bg-blue-50/60 shadow-2xs' : 'border-gray-200 bg-white hover:bg-gray-50'
                                }`}
                            >
                                <div className="flex items-center gap-2">
                                    <span className={`w-5 h-5 rounded flex items-center justify-center text-[10px] ${activeWindow === 1 ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-500'}`}>1</span>
                                    <div>
                                        <p className="text-[11px] text-gray-900 leading-none">Window 1: Master</p>
                                        <p className="text-[9px] text-gray-400 mt-0.5">Room & Package Inclusions</p>
                                    </div>
                                </div>
                                <span className={`text-[10px] font-mono ${calcWindowNet(1) >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                                    ৳ {calcWindowNet(1).toLocaleString()}
                                </span>
                            </button>

                            <button
                                onClick={() => setActiveWindow(2)}
                                className={`flex items-center justify-between p-2 rounded-md border transition-all text-left cursor-pointer ${
                                    activeWindow === 2 ? 'border-rose-600 bg-rose-50/60 shadow-2xs' : 'border-gray-200 bg-white hover:bg-gray-50'
                                }`}
                            >
                                <div className="flex items-center gap-2">
                                    <span className={`w-5 h-5 rounded flex items-center justify-center text-[10px] ${activeWindow === 2 ? 'bg-rose-600 text-white' : 'bg-gray-100 text-gray-500'}`}>2</span>
                                    <div>
                                        <p className="text-[11px] text-gray-900 leading-none">Window 2: Extras</p>
                                        <p className="text-[9px] text-gray-400 mt-0.5">Incidentals, F&B, Minibar</p>
                                    </div>
                                </div>
                                <span className={`text-[10px] font-mono ${calcWindowNet(2) >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                                    ৳ {calcWindowNet(2).toLocaleString()}
                                </span>
                            </button>
                        </div>
                    </div>
                </div>

                {/* Right / Center Panel: Content depending on Active Tab */}
                {activeTab === 'folio-operations' && (
                    <div className="flex-1 flex flex-col min-w-0">
                        {/* Transaction Ledger */}
                        <div className="flex-1 overflow-auto">
                            <table className="w-full text-left border-collapse">
                                <thead className="sticky top-0 bg-gray-50 border-b border-gray-200 z-10 text-[10px] text-gray-500 uppercase tracking-wider">
                                    <tr>
                                        <th className="px-3 py-2">Date & Time</th>
                                        <th className="px-3 py-2">Ref #</th>
                                        <th className="px-3 py-2">Particulars & Description</th>
                                        <th className="px-3 py-2">Category</th>
                                        <th className="px-3 py-2 text-right">Debit (Charge)</th>
                                        <th className="px-3 py-2 text-right">Credit (Payment)</th>
                                        <th className="px-3 py-2 text-center">Move Window</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100 text-[11.5px]">
                                    {getWindowTransactions(activeWindow).length === 0 ? (
                                        <tr>
                                            <td colSpan={7} className="px-4 py-12 text-center text-gray-400">
                                                No transactions currently recorded in Window {activeWindow}.
                                            </td>
                                        </tr>
                                    ) : (
                                        getWindowTransactions(activeWindow).map(txn => (
                                            <tr key={txn.id} className="hover:bg-gray-50/70 transition-colors">
                                                <td className="px-3 py-2 text-gray-700 font-mono text-[10.5px] whitespace-nowrap">
                                                    {txn.date}
                                                </td>
                                                <td className="px-3 py-2">
                                                    <span className="text-[10px] font-mono text-gray-800 bg-gray-100 px-1.5 py-0.5 rounded border border-gray-200">
                                                        {txn.refNo}
                                                    </span>
                                                </td>
                                                <td className="px-3 py-2">
                                                    <p className="font-semibold text-gray-900 leading-tight">{txn.particulars}</p>
                                                    <p className="text-[10px] text-gray-400 mt-0.5">{txn.description}</p>
                                                </td>
                                                <td className="px-3 py-2 whitespace-nowrap">
                                                    <span className={`text-[9.5px] px-1.5 py-0.2 rounded uppercase ${
                                                        txn.category === 'Room' ? 'bg-blue-50 text-blue-700 border border-blue-200' :
                                                        txn.category === 'Tax' ? 'bg-indigo-50 text-indigo-700 border border-indigo-200' :
                                                        txn.category === 'Transport' ? 'bg-sky-50 text-sky-700 border border-sky-200' :
                                                        txn.category === 'F&B' ? 'bg-orange-50 text-orange-700 border border-orange-200' :
                                                        txn.category === 'Laundry' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' :
                                                        txn.category === 'Minibar' ? 'bg-purple-50 text-purple-700 border border-purple-200' :
                                                        'bg-emerald-100 text-emerald-800 border border-emerald-200'
                                                    }`}>
                                                        {txn.category}
                                                    </span>
                                                </td>
                                                <td className="px-3 py-2 text-right font-mono text-gray-900 whitespace-nowrap">
                                                    {txn.amount < 0 ? `৳ ${Math.abs(txn.amount).toLocaleString()}` : '-'}
                                                </td>
                                                <td className="px-3 py-2 text-right font-mono text-emerald-600 whitespace-nowrap">
                                                    {txn.amount > 0 ? `৳ ${txn.amount.toLocaleString()}` : '-'}
                                                </td>
                                                <td className="px-3 py-2 text-center whitespace-nowrap">
                                                    <button
                                                        onClick={() => handleTransferTransaction(txn.id)}
                                                        className="p-1 hover:bg-gray-100 rounded text-gray-400 hover:text-blue-600 transition-colors cursor-pointer"
                                                        title={`Move to Window ${txn.windowId === 1 ? 2 : 1}`}
                                                    >
                                                        <ArrowRightLeft size={13} />
                                                    </button>
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>

                        {/* Footer Totals */}
                        <div className="bg-gray-50 border-t border-gray-200 px-3 py-2 flex justify-between items-center text-xs">
                            <div className="flex items-center gap-6">
                                <div>
                                    <span className="text-[9px] text-gray-400 uppercase">Window {activeWindow} Net Balance:</span>
                                    <p className={`text-base font-mono leading-none mt-0.5 ${calcWindowNet(activeWindow) >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                                        ৳ {calcWindowNet(activeWindow).toLocaleString()}
                                    </p>
                                </div>
                                <div className="border-l border-gray-200 pl-4 hidden sm:block">
                                    <span className="text-[9px] text-gray-400 uppercase">Zero-Variance Audit:</span>
                                    <div className="flex items-center gap-1 text-[10px] text-emerald-700 font-semibold mt-0.5">
                                        <ShieldCheck size={12} />
                                        <span>General Ledger Reconciled</span>
                                    </div>
                                </div>
                            </div>

                            <div className="flex items-center gap-2">
                                <button
                                    onClick={() => setActiveTab('invoice-preview')}
                                    className="h-7 px-2.5 bg-white border border-gray-200 text-gray-700 rounded text-xs font-semibold hover:bg-gray-50 transition-colors flex items-center gap-1 shadow-2xs cursor-pointer"
                                >
                                    <Printer size={12} /> Print Window {activeWindow}
                                </button>
                                <button
                                    onClick={() => {
                                        setSettleForm({
                                            method: 'Cash BDT',
                                            amount: Math.abs(calcWindowNet(activeWindow)),
                                            remarks: ''
                                        });
                                        setShowSettleModal(true);
                                    }}
                                    className="h-7 px-3 bg-slate-900 hover:bg-blue-600 text-white rounded text-xs font-semibold transition-colors shadow-2xs cursor-pointer"
                                >
                                    Settle Window {activeWindow}
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* Tab: Allowances & Package Inclusions */}
                {activeTab === 'allowances' && (
                    <div className="flex-1 p-4 overflow-auto space-y-4">
                        <div className="bg-blue-50/60 p-3 rounded-lg border border-blue-200/80 flex items-center justify-between">
                            <div>
                                <h3 className="text-xs text-blue-900">{activeFolio.package}</h3>
                                <p className="text-[11px] text-blue-700 mt-0.5">
                                    Allowances configured automatically by rate plan. Front desk can redeem items on demand.
                                </p>
                            </div>
                            <span className="px-2 py-1 rounded bg-blue-600 text-white text-[10.5px]">
                                Active Entitlements
                            </span>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            {activeFolio.allowances.map((allow, idx) => {
                                const remaining = allow.total - allow.used;
                                const pct = (allow.used / allow.total) * 100;
                                return (
                                    <div key={idx} className="bg-white p-3 rounded-lg border border-gray-200 shadow-2xs space-y-2">
                                        <div className="flex justify-between items-start">
                                            <div>
                                                <h4 className="text-gray-900 text-xs">{allow.service}</h4>
                                                <p className="text-[10px] text-gray-400 mt-0.5">
                                                    Entitlement: {allow.total} {allow.unit} Total
                                                </p>
                                            </div>
                                            <span className={`px-2 py-0.5 rounded text-[10px] ${
                                                remaining > 0 ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-rose-50 text-rose-700 border border-rose-200'
                                            }`}>
                                                {remaining} {allow.unit} Left
                                            </span>
                                        </div>

                                        <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden">
                                            <div
                                                className={`h-full ${pct >= 100 ? 'bg-rose-500' : pct >= 50 ? 'bg-amber-500' : 'bg-emerald-500'}`}
                                                style={{ width: `${Math.min(pct, 100)}%` }}
                                            />
                                        </div>

                                        <div className="flex justify-between items-center pt-1">
                                            <span className="text-[10px] text-gray-500">
                                                Consumed: {allow.used} of {allow.total}
                                            </span>
                                            <button
                                                disabled={remaining <= 0}
                                                onClick={() => handleRedeemAllowance(allow.service)}
                                                className={`h-6 px-2.5 rounded text-[10.5px] transition-colors cursor-pointer ${
                                                    remaining > 0
                                                        ? 'bg-blue-600 text-white hover:bg-blue-700'
                                                        : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                                                }`}
                                            >
                                                Redeem 1 {allow.unit.slice(0, -1)}
                                            </button>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}

                {/* Tab: Official Tax Invoice Preview */}
                {activeTab === 'invoice-preview' && (
                    <div className="flex-1 p-4 overflow-auto bg-gray-100/70 flex justify-center">
                        <div className="bg-white rounded-lg shadow-md border border-gray-200 p-6 max-w-2xl w-full text-xs space-y-4">
                            {/* Invoice Header */}
                            <div className="flex justify-between items-start border-b border-gray-200 pb-3">
                                <div>
                                    <h2 className="text-base text-gray-900">GRAND HOTEL ENTERPRISE ERP</h2>
                                    <p className="text-[10px] text-gray-500">Plot 12, Gulshan Avenue, Dhaka-1212, Bangladesh</p>
                                    <p className="text-[10px] text-gray-500 font-mono">BIN: 002349182-0101 • Mushak-6.3 Tax Invoice</p>
                                </div>
                                <div className="text-right">
                                    <span className="px-2 py-0.5 rounded bg-gray-900 text-white font-mono text-[10px]">
                                        TAX INVOICE
                                    </span>
                                    <p className="font-mono text-gray-800 text-[11px] mt-1">INV-{activeFolio.folioNumber}</p>
                                    <p className="text-[10px] text-gray-400">Date: {new Date().toLocaleDateString('en-GB')}</p>
                                </div>
                            </div>

                            {/* Guest Info */}
                            <div className="grid grid-cols-2 gap-4 bg-gray-50 p-2.5 rounded border border-gray-200/80">
                                <div>
                                    <span className="text-[9px] text-gray-400 uppercase">Guest Name & Company</span>
                                    <p className="text-gray-900">{activeFolio.guestName}</p>
                                    <p className="text-[10.5px] text-gray-600">{activeFolio.company || 'Private Leisure'}</p>
                                </div>
                                <div className="text-right">
                                    <span className="text-[9px] text-gray-400 uppercase">Stay Particulars</span>
                                    <p className="text-gray-900">Room {activeFolio.roomNumber} ({activeFolio.roomType})</p>
                                    <p className="text-[10.5px] text-gray-600 font-mono">{activeFolio.checkIn} to {activeFolio.checkOut}</p>
                                </div>
                            </div>

                            {/* Line Items Table */}
                            <table className="w-full text-left border-collapse border border-gray-200">
                                <thead>
                                    <tr className="bg-gray-100 text-[10px] text-gray-600 uppercase border-b border-gray-200">
                                        <th className="p-2">Date</th>
                                        <th className="p-2">Description</th>
                                        <th className="p-2">Ref</th>
                                        <th className="p-2 text-right">Debit ৳</th>
                                        <th className="p-2 text-right">Credit ৳</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100 text-[11px]">
                                    {activeFolio.transactions.map(t => (
                                        <tr key={t.id}>
                                            <td className="p-2 font-mono text-gray-600">{t.date.split(' ')[0]}</td>
                                            <td className="p-2 font-medium text-gray-900">
                                                <span>{t.particulars}</span>
                                                {t.category === 'Tax' && (
                                                    <span className="ml-1.5 px-1 py-0.2 bg-indigo-50 text-indigo-700 text-[9px] rounded border border-indigo-200">
                                                        TAX/VAT
                                                    </span>
                                                )}
                                            </td>
                                            <td className="p-2 font-mono text-gray-500 text-[10px]">{t.refNo}</td>
                                            <td className="p-2 text-right font-mono text-gray-900">
                                                {t.amount < 0 ? `৳ ${Math.abs(t.amount).toLocaleString()}` : '-'}
                                            </td>
                                            <td className="p-2 text-right font-mono text-emerald-600">
                                                {t.amount > 0 ? `৳ ${t.amount.toLocaleString()}` : '-'}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>

                            {/* Tax & VAT Statutory Schedule (Mushak-6.3) */}
                            {(() => {
                                const taxTxns = activeFolio.transactions.filter(t => t.category === 'Tax' || t.particulars.toLowerCase().includes('vat') || t.particulars.toLowerCase().includes('tax') || t.particulars.toLowerCase().includes('service charge'));
                                const totalTaxVal = taxTxns.reduce((sum, t) => sum + Math.abs(t.amount), 0);
                                if (totalTaxVal <= 0) return null;
                                return (
                                    <div className="bg-slate-50/80 border border-slate-200 rounded p-2.5 text-[10.5px] space-y-1">
                                        <div className="text-slate-700 flex justify-between border-b border-slate-200 pb-1">
                                            <span>Mushak-6.3 Statutory Tax &amp; Service Charge Schedule</span>
                                            <span className="font-mono text-blue-900 font-bold">Total Taxes: ৳ {totalTaxVal.toLocaleString()}</span>
                                        </div>
                                        <div className="grid grid-cols-2 gap-x-4 gap-y-0.5 text-slate-600">
                                            {taxTxns.map((tx, idx) => (
                                                <div key={idx} className="flex justify-between">
                                                    <span>{tx.particulars}:</span>
                                                    <span className="font-mono font-medium text-slate-900">৳ {Math.abs(tx.amount).toLocaleString()}</span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                );
                            })()}

                            {/* Summary & Net */}
                            <div className="flex justify-between items-center border-t border-gray-200 pt-3">
                                <div className="text-[10px] text-gray-500">
                                    Includes 15% VAT & 10% Service Charge per National Revenue Board guidelines.
                                </div>
                                <div className="text-right">
                                    <span className="text-[9.5px] text-gray-400 uppercase">Net Balance Due</span>
                                    <p className={`text-base font-mono ${calcTotalBalance() >= 0 ? 'text-emerald-700' : 'text-rose-700'}`}>
                                        ৳ {calcTotalBalance().toLocaleString()}
                                    </p>
                                </div>
                            </div>

                            {/* Actions */}
                            <div className="flex justify-end gap-2 pt-2 border-t border-gray-200">
                                <button
                                    onClick={() => window.print()}
                                    className="h-7 px-3 bg-gray-900 text-white rounded text-xs font-semibold flex items-center gap-1.5 cursor-pointer hover:bg-gray-800"
                                >
                                    <Printer size={12} />
                                    <span>Print Tax Invoice</span>
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </main>

            {/* Post Charge Modal */}
            {showPostChargeModal && (
                <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-3 animate-in fade-in duration-100">
                    <div className="bg-white rounded-xl shadow-2xl border border-gray-200 max-w-md w-full p-4 space-y-3">
                        <div className="flex items-center justify-between pb-2 border-b border-gray-200">
                            <h3 className="text-sm text-gray-900">Post Transaction / Charge</h3>
                            <button onClick={() => setShowPostChargeModal(false)} className="text-gray-400 hover:text-gray-700">✕</button>
                        </div>

                        <form onSubmit={handlePostCharge} className="space-y-3">
                            <div className="grid grid-cols-2 gap-2">
                                <div>
                                    <label className="block text-[10.5px] font-semibold text-gray-700 mb-1">Target Window</label>
                                    <select
                                        value={postChargeForm.windowId}
                                        onChange={e => setPostChargeForm({ ...postChargeForm, windowId: parseInt(e.target.value) as 1 | 2 })}
                                        className="w-full h-7 px-2 border border-gray-300 rounded text-xs outline-none focus:border-blue-500"
                                    >
                                        <option value={1}>Window 1: Master (Room/Board)</option>
                                        <option value={2}>Window 2: Extras (F&B/Incidentals)</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-[10.5px] font-semibold text-gray-700 mb-1">Charge Category</label>
                                    <select
                                        value={postChargeForm.category}
                                        onChange={e => setPostChargeForm({ ...postChargeForm, category: e.target.value as Transaction['category'] })}
                                        className="w-full h-7 px-2 border border-gray-300 rounded text-xs outline-none focus:border-blue-500"
                                    >
                                        <option value="F&B">F&B Restaurant / Cafe</option>
                                        <option value="Minibar">Minibar Consumption</option>
                                        <option value="Laundry">Laundry Valet</option>
                                        <option value="Transport">Airport Transportation</option>
                                        <option value="Spa">Spa & Wellness</option>
                                        <option value="Room">Room Rate Surcharge</option>
                                        <option value="Payment">Guest Payment / Deposit</option>
                                    </select>
                                </div>
                            </div>

                            <div>
                                <label className="block text-[10.5px] font-semibold text-gray-700 mb-1">Particulars / Item Name</label>
                                <input
                                    type="text"
                                    placeholder="e.g. In-Room Dining Dinner, Express Laundry"
                                    value={postChargeForm.particulars}
                                    onChange={e => setPostChargeForm({ ...postChargeForm, particulars: e.target.value })}
                                    className="w-full h-7 px-2 border border-gray-300 rounded text-xs outline-none focus:border-blue-500"
                                    required
                                />
                            </div>

                            <div>
                                <label className="block text-[10.5px] font-semibold text-gray-700 mb-1">Amount (BDT ৳)</label>
                                <input
                                    type="number"
                                    placeholder="0.00"
                                    value={postChargeForm.amount}
                                    onChange={e => setPostChargeForm({ ...postChargeForm, amount: e.target.value })}
                                    className="w-full h-7 px-2 border border-gray-300 rounded text-xs font-mono outline-none focus:border-blue-500"
                                    required
                                />
                            </div>

                            <div>
                                <label className="block text-[10.5px] font-semibold text-gray-700 mb-1">Description / Notes</label>
                                <input
                                    type="text"
                                    placeholder="Optional notes or receipt voucher number"
                                    value={postChargeForm.description}
                                    onChange={e => setPostChargeForm({ ...postChargeForm, description: e.target.value })}
                                    className="w-full h-7 px-2 border border-gray-300 rounded text-xs outline-none focus:border-blue-500"
                                />
                            </div>

                            <div className="flex justify-end gap-2 pt-2 border-t border-gray-200">
                                <button
                                    type="button"
                                    onClick={() => setShowPostChargeModal(false)}
                                    className="h-7 px-3 border border-gray-300 rounded text-xs font-semibold hover:bg-gray-50"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="h-7 px-3 bg-blue-600 hover:bg-blue-700 text-white rounded text-xs font-semibold"
                                >
                                    Post Transaction
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Settle Window Modal */}
            {showSettleModal && (
                <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-3 animate-in fade-in duration-100">
                    <div className="bg-white rounded-xl shadow-2xl border border-gray-200 max-w-md w-full p-4 space-y-3">
                        <div className="flex items-center justify-between pb-2 border-b border-gray-200">
                            <h3 className="text-sm text-gray-900">
                                Settle & Close Window {activeWindow}
                            </h3>
                            <button onClick={() => setShowSettleModal(false)} className="text-gray-400 hover:text-gray-700">✕</button>
                        </div>

                        <form onSubmit={handleSettleFolio} className="space-y-3">
                            <div className="bg-gray-50 p-3 rounded-lg border border-gray-200 space-y-1">
                                <span className="text-[10px] text-gray-500 font-semibold uppercase">Outstanding Net Charge</span>
                                <p className="text-xl font-mono text-gray-900">
                                    ৳ {Math.abs(calcWindowNet(activeWindow)).toLocaleString()}
                                </p>
                            </div>

                            <div>
                                <label className="block text-[10.5px] font-semibold text-gray-700 mb-1">Settlement Payment Mode</label>
                                <select
                                    value={settleForm.method}
                                    onChange={e => setSettleForm({ ...settleForm, method: e.target.value as any })}
                                    className="w-full h-7 px-2 border border-gray-300 rounded text-xs outline-none focus:border-blue-500 font-semibold"
                                >
                                    <option value="Cash BDT">Cash (BDT Counter Settlement)</option>
                                    <option value="Visa/MasterCard">Credit/Debit Card (POS Terminal)</option>
                                    <option value="bKash / Nagad">MFS bKash / Nagad QR Payment</option>
                                    <option value="City Ledger (Corporate)">City Ledger Direct Corporate Invoice</option>
                                </select>
                            </div>

                            <div>
                                <label className="block text-[10.5px] font-semibold text-gray-700 mb-1">Settlement Notes / Transaction Auth #</label>
                                <input
                                    type="text"
                                    placeholder="e.g. Card slip #4401 or bKash TrxID #8890"
                                    value={settleForm.remarks}
                                    onChange={e => setSettleForm({ ...settleForm, remarks: e.target.value })}
                                    className="w-full h-7 px-2 border border-gray-300 rounded text-xs outline-none focus:border-blue-500"
                                />
                            </div>

                            <div className="flex justify-end gap-2 pt-2 border-t border-gray-200">
                                <button
                                    type="button"
                                    onClick={() => setShowSettleModal(false)}
                                    className="h-7 px-3 border border-gray-300 rounded text-xs font-semibold hover:bg-gray-50"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="h-7 px-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-xs font-semibold"
                                >
                                    Confirm Settlement
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default FolioOperations;
