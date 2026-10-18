import { useState } from 'react';
import { 
    Plus, MoreHorizontal, FileText, CreditCard, 
    Layout, ArrowRightLeft, Printer, Send, 
    ShieldCheck, Tag, Info
} from 'lucide-react';
import AddPaymentModal from './AddPaymentModal';

interface Transaction {
    id: number;
    date: string;
    refNo: string;
    particulars: string;
    description: string;
    user: string;
    amount: number;
    windowId: 1 | 2;
    category: 'Room' | 'F&B' | 'Transport' | 'Laundry' | 'Misc';
}

interface Room {
    id: number;
    number: string;
    guest: string;
    folioNumber: string;
    expanded: boolean;
    package: string;
}

interface Allowance {
    service: string;
    total: number;
    used: number;
    unit: string;
}

const FolioOperations = () => {
    const [showPaymentModal, setShowPaymentModal] = useState(false);
    const [activeTab, setActiveTab] = useState('folio-operations');
    const [activeWindow, setActiveWindow] = useState<1 | 2>(1);

    const [rooms] = useState<Room[]>([
        { id: 1, number: '111', guest: 'Aniya Nusrat', folioNumber: 'FOL-2025-001', expanded: true, package: 'Ultimate Honeymoon Package' },
        { id: 2, number: '112', guest: 'Mr. Ariyan Nusrat', folioNumber: 'FOL-2025-002', expanded: false, package: 'Standard Room Only' }
    ]);

    const [allowances] = useState<Allowance[]>([
        { service: 'Daily Laundry', total: 3, used: 1, unit: 'Items' },
        { service: 'Airport Transfer', total: 1, used: 1, unit: 'Trip' },
        { service: 'Pool Access', total: 100, used: 2, unit: 'Times' },
        { service: 'Candle Light Dinner', total: 1, used: 0, unit: 'Event' }
    ]);

    const [transactions] = useState<Transaction[]>([
        {
            id: 1,
            date: '05/04/2025 Sat',
            refNo: 'P-9921',
            particulars: 'Package Deposit',
            description: 'Advance Payment for Honeymoon Package',
            user: 'admin_imran',
            amount: 15000.00,
            windowId: 1,
            category: 'Misc'
        },
        {
            id: 2,
            date: '05/04/2025 Sat',
            refNo: 'SYS-01',
            particulars: 'Room Charges (Package)',
            description: 'Night 1 Room Allocation',
            user: 'system_audit',
            amount: -8500.00,
            windowId: 1,
            category: 'Room'
        },
        {
            id: 3,
            date: '06/04/2025 Sun',
            refNo: 'POS-4401',
            particulars: 'Mini Bar Inclusions',
            description: 'Red Wine & Dry Fruit Set',
            user: 'pos_cashier',
            amount: -2500.00,
            windowId: 2,
            category: 'F&B'
        }
    ]);

    const getWindowTransactions = (winId: 1 | 2) => transactions.filter(t => t.windowId === winId);
    const calcTotal = (winId: 1 | 2) => getWindowTransactions(winId).reduce((sum, t) => sum + t.amount, 0);

    const tabs = [
        { id: 'folio-operations', label: 'Folio Operations', icon: <FileText size={12} /> },
        { id: 'booking-details', label: 'Booking Details', icon: <Layout size={12} /> },
        { id: 'allowance-checker', label: 'Allowances', icon: <ShieldCheck size={12} /> },
        { id: 'audit-trail', label: 'Audit Trail', icon: <Info size={12} /> }
    ];

    return (
        <div className="h-full min-h-[calc(100vh-44px)] bg-gray-50 flex flex-col font-sans select-none">
            {/* Compact Header Bar */}
            <header className="bg-slate-900 text-white px-3 py-2 flex items-center justify-between shadow-2xs z-20 border-b border-slate-800">
                <div className="flex items-center gap-3">
                    <div>
                        <span className="text-[9px] uppercase font-bold tracking-widest text-blue-400 leading-none">Guest Master Folio</span>
                        <h1 className="text-sm font-bold tracking-tight text-white mt-0.5">
                            {rooms[0].guest} <span className="text-slate-400 font-normal">| Room {rooms[0].number} ({rooms[0].folioNumber})</span>
                        </h1>
                    </div>
                </div>

                <div className="flex items-center gap-4">
                    <div className="text-right">
                        <p className="text-[9px] font-bold text-slate-400 uppercase leading-none">Master Balance (W1)</p>
                        <p className="text-xs font-bold text-blue-400 leading-tight mt-0.5">৳ {calcTotal(1).toLocaleString()}</p>
                    </div>
                    <div className="text-right border-l border-slate-800 pl-4">
                        <p className="text-[9px] font-bold text-slate-400 uppercase leading-none">Extra Charges (W2)</p>
                        <p className="text-xs font-bold text-rose-400 leading-tight mt-0.5">৳ {calcTotal(2).toLocaleString()}</p>
                    </div>
                    <div className="flex gap-1 border-l border-slate-800 pl-4">
                        <button className="p-1 bg-slate-800 hover:bg-blue-600 rounded text-slate-300 hover:text-white transition-colors" title="Print Folio">
                            <Printer size={13} />
                        </button>
                        <button className="p-1 bg-slate-800 hover:bg-emerald-600 rounded text-slate-300 hover:text-white transition-colors" title="Send Email Invoice">
                            <Send size={13} />
                        </button>
                    </div>
                </div>
            </header>

            {/* Compact Navigation & Controls */}
            <div className="bg-white border-b border-gray-200 flex items-center justify-between px-3 z-10">
                <div className="flex">
                    {tabs.map((tab) => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={`flex items-center gap-1.5 px-3 py-2 text-[11px] font-semibold transition-all border-b-2 ${activeTab === tab.id
                                ? 'border-blue-600 text-blue-600 bg-blue-50/20'
                                : 'border-transparent text-gray-500 hover:text-gray-900'
                                }`}
                        >
                            {tab.icon}
                            {tab.label}
                        </button>
                    ))}
                </div>
                <div className="flex items-center gap-1.5 py-1">
                    <button 
                        onClick={() => setShowPaymentModal(true)} 
                        className="flex items-center gap-1 h-6 px-2.5 bg-blue-600 text-white rounded text-[10.5px] font-semibold hover:bg-blue-700 transition-colors shadow-2xs"
                    >
                        <Plus size={12} /> Post Payment
                    </button>
                    <button className="flex items-center gap-1 h-6 px-2.5 bg-gray-900 text-white rounded text-[10.5px] font-semibold hover:bg-gray-800 transition-colors shadow-2xs">
                        <ArrowRightLeft size={12} /> Split Folio
                    </button>
                </div>
            </div>

            {/* Main Content Area */}
            <main className="flex flex-1 overflow-hidden bg-white">
                {/* Secondary Sidebar - Package & Routing Status */}
                <div className="w-64 bg-gray-50/80 border-r border-gray-200 flex flex-col overflow-y-auto p-2.5 space-y-2.5 flex-shrink-0">
                    {/* Package Card */}
                    <div className="bg-white p-2.5 rounded-lg border border-blue-100 shadow-2xs">
                        <span className="text-[9px] font-bold text-blue-600 uppercase tracking-wider bg-blue-50 px-1.5 py-0.2 rounded">
                            Assigned Package
                        </span>
                        <h4 className="text-xs font-bold text-gray-900 mt-1 leading-snug">{rooms[0].package}</h4>
                        <p className="text-[10px] text-gray-400 mt-0.5">Stay: 05 Apr - 07 Apr</p>
                    </div>

                    {/* Allowance Tracker */}
                    <div className="space-y-1.5">
                        <span className="text-[9px] font-bold text-gray-400 uppercase tracking-wider px-1">Package Allowances</span>
                        <div className="space-y-1.5">
                            {allowances.map((allow, idx) => (
                                <div key={idx} className="bg-white p-2 rounded-md border border-gray-200/70 shadow-2xs">
                                    <div className="flex justify-between items-center text-[10.5px] mb-1">
                                        <span className="font-semibold text-gray-700">{allow.service}</span>
                                        <span className="font-bold text-gray-500">
                                            {allow.used}/{allow.total} {allow.unit}
                                        </span>
                                    </div>
                                    <div className="w-full h-1 bg-gray-100 rounded-full overflow-hidden">
                                        <div 
                                            className={`h-full ${
                                                (allow.used / allow.total) >= 1 ? 'bg-orange-500' : 'bg-blue-600'
                                            }`}
                                            style={{ width: `${Math.min((allow.used / allow.total) * 100, 100)}%` }}
                                        />
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Billing Windows Selector */}
                    <div className="space-y-1.5 pt-2 border-t border-gray-200">
                        <span className="text-[9px] font-bold text-gray-400 uppercase tracking-wider px-1">Folio Windows</span>
                        <div className="flex flex-col gap-1.5">
                            <button 
                                onClick={() => setActiveWindow(1)}
                                className={`flex items-center justify-between p-2 rounded-md border transition-all text-left ${
                                    activeWindow === 1 ? 'border-blue-600 bg-blue-50/50 shadow-2xs' : 'border-gray-200 bg-white'
                                }`}
                            >
                                <div className="flex items-center gap-2">
                                    <span className={`w-5 h-5 rounded flex items-center justify-center font-bold text-[10px] ${activeWindow === 1 ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-500'}`}>1</span>
                                    <div>
                                        <p className="text-[11px] font-bold text-gray-900 leading-none">Window 1: Master</p>
                                        <p className="text-[9px] text-gray-400 mt-0.5">Room & Package Inclusions</p>
                                    </div>
                                </div>
                                <Tag size={12} className={activeWindow === 1 ? 'text-blue-600' : 'text-gray-300'} />
                            </button>
                            <button 
                                onClick={() => setActiveWindow(2)}
                                className={`flex items-center justify-between p-2 rounded-md border transition-all text-left ${
                                    activeWindow === 2 ? 'border-rose-600 bg-rose-50/50 shadow-2xs' : 'border-gray-200 bg-white'
                                }`}
                            >
                                <div className="flex items-center gap-2">
                                    <span className={`w-5 h-5 rounded flex items-center justify-center font-bold text-[10px] ${activeWindow === 2 ? 'bg-rose-600 text-white' : 'bg-gray-100 text-gray-500'}`}>2</span>
                                    <div>
                                        <p className="text-[11px] font-bold text-gray-900 leading-none">Window 2: Extras</p>
                                        <p className="text-[9px] text-gray-400 mt-0.5">Incidentals & Minibar</p>
                                    </div>
                                </div>
                                <CreditCard size={12} className={activeWindow === 2 ? 'text-rose-600' : 'text-gray-300'} />
                            </button>
                        </div>
                    </div>
                </div>

                {/* Transaction Ledger Grid */}
                <div className="flex-1 flex flex-col min-w-0">
                    <div className="flex-1 overflow-auto">
                        <table className="w-full text-left border-collapse">
                            <thead className="sticky top-0 bg-gray-50 border-b border-gray-200 z-10 text-[10px] font-bold text-gray-500 uppercase tracking-wider">
                                <tr>
                                    <th className="px-3 py-2">Date</th>
                                    <th className="px-3 py-2">Ref / Voucher</th>
                                    <th className="px-3 py-2">Particulars</th>
                                    <th className="px-3 py-2">Category</th>
                                    <th className="px-3 py-2 text-right">Debit (Charge)</th>
                                    <th className="px-3 py-2 text-right">Credit (Paid)</th>
                                    <th className="px-3 py-2 text-right">Action</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100 text-xs">
                                {getWindowTransactions(activeWindow).map((txn) => (
                                    <tr key={txn.id} className="hover:bg-gray-50/70 transition-colors">
                                        <td className="px-3 py-2 font-medium text-gray-800">
                                            {txn.date}
                                        </td>
                                        <td className="px-3 py-2">
                                            <span className="text-[10px] font-mono font-bold text-gray-800 bg-gray-100 px-1.5 py-0.5 rounded border border-gray-200">
                                                {txn.refNo}
                                            </span>
                                        </td>
                                        <td className="px-3 py-2">
                                            <p className="font-semibold text-gray-900">{txn.particulars}</p>
                                            <p className="text-[10px] text-gray-400 mt-0.5">{txn.description}</p>
                                        </td>
                                        <td className="px-3 py-2">
                                            <span className={`text-[10px] font-semibold px-1.5 py-0.2 rounded uppercase ${
                                                txn.category === 'Room' ? 'bg-blue-50 text-blue-700' :
                                                txn.category === 'F&B' ? 'bg-orange-50 text-orange-700' :
                                                txn.category === 'Laundry' ? 'bg-emerald-50 text-emerald-700' : 'bg-gray-100 text-gray-700'
                                            }`}>
                                                {txn.category}
                                            </span>
                                        </td>
                                        <td className="px-3 py-2 text-right">
                                            {txn.amount < 0 && (
                                                <span className="font-bold text-gray-900">৳ {Math.abs(txn.amount).toLocaleString()}</span>
                                            )}
                                        </td>
                                        <td className="px-3 py-2 text-right">
                                            {txn.amount > 0 && (
                                                <span className="font-bold text-emerald-600">৳ {txn.amount.toLocaleString()}</span>
                                            )}
                                        </td>
                                        <td className="px-3 py-2 text-right">
                                            <button className="p-1 text-gray-400 hover:text-gray-700 rounded transition-colors">
                                                <MoreHorizontal size={13} />
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    {/* Compact Ledger Summary Footer */}
                    <div className="bg-gray-50 border-t border-gray-200 px-3 py-2 flex justify-between items-center text-xs">
                        <div className="flex items-center gap-6">
                            <div>
                                <span className="text-[9px] font-bold text-gray-400 uppercase">Window {activeWindow} Net Balance:</span>
                                <p className={`text-base font-bold leading-none mt-0.5 ${calcTotal(activeWindow) >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                                    ৳ {calcTotal(activeWindow).toLocaleString()}
                                </p>
                            </div>
                            <div className="border-l border-gray-200 pl-4 hidden sm:block">
                                <span className="text-[9px] font-bold text-gray-400 uppercase">Zero-Variance Audit:</span>
                                <div className="flex items-center gap-1 text-[10px] text-emerald-700 font-semibold mt-0.5">
                                    <ShieldCheck size={11} /> Balanced
                                </div>
                            </div>
                        </div>

                        <div className="flex items-center gap-2">
                            <button className="h-7 px-2.5 bg-white border border-gray-200 text-gray-700 rounded text-xs font-semibold hover:bg-gray-50 transition-colors flex items-center gap-1 shadow-2xs">
                                <Printer size={12} /> Print
                            </button>
                            <button className="h-7 px-3 bg-slate-900 hover:bg-blue-600 text-white rounded text-xs font-semibold transition-colors shadow-2xs">
                                Settle Window {activeWindow}
                            </button>
                        </div>
                    </div>
                </div>
            </main>

            <AddPaymentModal
                isOpen={showPaymentModal}
                onClose={() => setShowPaymentModal(false)}
                onSave={(payment) => {
                    console.log('Payment saved:', payment);
                    setShowPaymentModal(false);
                }}
            />
        </div>
    );
};

export default FolioOperations;
