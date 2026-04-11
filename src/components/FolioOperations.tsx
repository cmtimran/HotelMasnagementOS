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
    windowId: 1 | 2; // Window 1: Package/Master, Window 2: Extra
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

    const [rooms, setRooms] = useState<Room[]>([
        { id: 1, number: '111', guest: 'Aniya Nusrat', folioNumber: 'FOL-2025-001', expanded: true, package: 'Ultimate Honeymoon Package' },
        { id: 2, number: '112', guest: 'Mr. Ariyan Nusrat', folioNumber: 'FOL-2025-002', expanded: false, package: 'Standard Room Only' }
    ]);

    const [allowances] = useState<Allowance[]>([
        { service: 'Daily Laundry', total: 3, used: 1, unit: 'Items' },
        { service: 'Airport Transfer', total: 1, used: 1, unit: 'Trip' },
        { service: 'Pool Access', total: 100, used: 2, unit: 'Times' }, // Unlimited mock
        { service: 'Candle Light Dinner', total: 1, used: 0, unit: 'Event' }
    ]);

    const [transactions] = useState<Transaction[]>([
        {
            id: 1,
            date: '05/04/2025 Saturday',
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
            date: '05/04/2025 Saturday',
            refNo: 'SYS-01',
            particulars: 'Room Charges (Package)',
            description: 'Night 1: Honeymoon Suite Bundled',
            user: 'system_post',
            amount: -8500.00,
            windowId: 1,
            category: 'Room'
        },
        {
            id: 3,
            date: '06/04/2025 Sunday',
            refNo: 'POS-4428',
            particulars: 'Extra Lunch (Ala Carte)',
            description: 'Seafood Platter - Outside Package Inclusion',
            user: 'waiter_01',
            amount: -2450.00,
            windowId: 2,
            category: 'F&B'
        },
        {
            id: 4,
            date: '06/04/2025 Sunday',
            refNo: 'LND-881',
            particulars: 'Laundry Surcharge',
            description: '4th Item (Package Limit 3 exceeded)',
            user: 'laundry_ops',
            amount: -150.00,
            windowId: 2,
            category: 'Laundry'
        }
    ]);

    const getWindowTransactions = (winId: 1 | 2) => transactions.filter(t => t.windowId === winId);

    const calcTotal = (winId: 1 | 2) => getWindowTransactions(winId).reduce((sum, t) => sum + t.amount, 0);


    const tabs = [
        { id: 'folio-operations', label: 'Folio Operations', icon: <FileText size={16} /> },
        { id: 'booking-details', label: 'Booking Details', icon: <Layout size={16} /> },
        { id: 'allowance-checker', label: 'Package Allowances', icon: <ShieldCheck size={16} /> },
        { id: 'audit-trail', label: 'Audit Trail', icon: <Info size={16} /> }
    ];

    return (
        <div className="h-screen bg-gray-50 flex flex-col font-sans overflow-hidden">
            {/* Main Header - Enterprise Style */}
            <header className="bg-gray-900 text-white px-6 py-4 flex items-center justify-between shadow-lg z-20">
                <div className="flex items-center gap-6">
                    <div className="flex flex-col">
                        <span className="text-[10px] uppercase font-black tracking-[0.2em] text-blue-400 leading-none mb-1">Guest Master Folio</span>
                        <h1 className="text-xl font-black tracking-tight">{rooms[0].guest} <span className="text-gray-500 font-medium">| RM {rooms[0].number}</span></h1>
                    </div>
                </div>
                <div className="flex items-center gap-8">
                    <div className="text-right border-r border-gray-800 pr-8">
                        <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Master Balance (W1)</p>
                        <p className="text-xl font-black text-blue-400">৳ {calcTotal(1).toLocaleString()}</p>
                    </div>
                    <div className="text-right border-r border-gray-800 pr-8">
                        <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Extra Charges (W2)</p>
                        <p className="text-xl font-black text-rose-500">৳ {calcTotal(2).toLocaleString()}</p>
                    </div>
                    <div className="flex gap-2">
                        <button className="p-2.5 bg-gray-800 hover:bg-blue-600 rounded-xl transition-all shadow-lg text-white">
                            <Printer size={20} />
                        </button>
                        <button className="p-2.5 bg-gray-800 hover:bg-emerald-600 rounded-xl transition-all shadow-lg text-white">
                            <Send size={20} />
                        </button>
                    </div>
                </div>
            </header>

            {/* Navigation & Controls */}
            <div className="bg-white border-b flex items-center justify-between px-6 z-10">
                <div className="flex">
                    {tabs.map((tab) => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={`flex items-center gap-2 px-6 py-4 text-xs font-bold uppercase tracking-widest transition-all border-b-2 ${activeTab === tab.id
                                ? 'border-blue-600 text-blue-600 bg-blue-50/30'
                                : 'border-transparent text-gray-400 hover:text-gray-900'
                                }`}
                        >
                            {tab.icon}
                            {tab.label}
                        </button>
                    ))}
                </div>
                <div className="flex items-center gap-2 py-3">
                    <button onClick={() => setShowPaymentModal(true)} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-xl font-bold text-xs uppercase tracking-wider hover:bg-blue-700 transition-all shadow-blue-600/20 shadow-lg">
                        <Plus size={16} /> Add Payment
                    </button>
                    <button className="flex items-center gap-2 px-4 py-2 bg-gray-900 text-white rounded-xl font-bold text-xs uppercase tracking-wider hover:bg-gray-800 transition-all shadow-gray-900/20 shadow-lg">
                        <ArrowRightLeft size={16} /> Split/Move
                    </button>
                </div>
            </div>

            {/* Main Content Area */}
            <main className="flex flex-1 overflow-hidden bg-white">
                {/* Secondary Sidebar - Package & Routing Status */}
                <div className="w-80 bg-gray-50 border-r flex flex-col overflow-y-auto">
                    <div className="p-6 space-y-6">
                        {/* Package Card */}
                        <div className="bg-white p-5 rounded-2xl border border-blue-100 shadow-sm relative overflow-hidden group">
                            <div className="absolute top-0 right-0 w-20 h-20 bg-blue-50 -mr-10 -mt-10 rounded-full group-hover:bg-blue-600 transition-all duration-500" />
                            <div className="relative z-10">
                                <span className="text-[10px] font-black text-blue-600 uppercase tracking-widest bg-blue-50 px-2 py-0.5 rounded-md">Assigned Package</span>
                                <h4 className="text-sm font-black text-gray-900 mt-2 mb-1">{rooms[0].package}</h4>
                                <p className="text-[10px] text-gray-400 font-bold uppercase tracking-tighter">Stay Dates: 05 Apr - 07 Apr</p>
                            </div>
                        </div>

                        {/* Allowance Tracker - The Logic Engine Visual */}
                        <div className="space-y-4">
                            <h5 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] px-1">Package Allowances</h5>
                            <div className="space-y-3">
                                {allowances.map((allow, idx) => (
                                    <div key={idx} className="bg-white p-3 rounded-xl border border-gray-100 shadow-sm">
                                        <div className="flex justify-between items-center mb-2">
                                            <span className="text-xs font-bold text-gray-700">{allow.service}</span>
                                            <span className="text-[10px] font-black px-1.5 py-0.5 bg-gray-100 text-gray-600 rounded">
                                                {allow.used}/{allow.total} {allow.unit}
                                            </span>
                                        </div>
                                        <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden">
                                            <div 
                                                className={`h-full transition-all duration-1000 ${
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
                        <div className="space-y-3 pt-4 border-t border-gray-200">
                            <h5 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] px-1">Split Routing (Windows)</h5>
                            <div className="flex flex-col gap-2">
                                <button 
                                    onClick={() => setActiveWindow(1)}
                                    className={`flex items-center justify-between p-4 rounded-2xl border-2 transition-all ${
                                        activeWindow === 1 ? 'border-blue-600 bg-blue-50/50 shadow-md' : 'border-gray-100 bg-white'
                                    }`}
                                >
                                    <div className="flex items-center gap-3">
                                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold ${activeWindow === 1 ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-400'}`}>1</div>
                                        <div className="text-left">
                                            <p className="text-xs font-black text-gray-900 uppercase">Master Folio</p>
                                            <p className="text-[10px] text-gray-400 font-bold uppercase tracking-tighter">Package Inclusions</p>
                                        </div>
                                    </div>
                                    <Tag size={16} className={activeWindow === 1 ? 'text-blue-600' : 'text-gray-200'} />
                                </button>
                                <button 
                                    onClick={() => setActiveWindow(2)}
                                    className={`flex items-center justify-between p-4 rounded-2xl border-2 transition-all ${
                                        activeWindow === 2 ? 'border-rose-600 bg-rose-50/50 shadow-md' : 'border-gray-100 bg-white'
                                    }`}
                                >
                                    <div className="flex items-center gap-3">
                                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold ${activeWindow === 2 ? 'bg-rose-600 text-white' : 'bg-gray-100 text-gray-400'}`}>2</div>
                                        <div className="text-left">
                                            <p className="text-xs font-black text-gray-900 uppercase">Extra Charges</p>
                                            <p className="text-[10px] text-gray-400 font-bold uppercase tracking-tighter">Guest Personal Expenses</p>
                                        </div>
                                    </div>
                                    <CreditCard size={16} className={activeWindow === 2 ? 'text-rose-600' : 'text-gray-200'} />
                                </button>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Transaction Ledger Grid */}
                <div className="flex-1 flex flex-col min-w-0">
                    <div className="flex-1 overflow-auto">
                        <table className="w-full text-left border-collapse">
                            <thead className="sticky top-0 bg-white border-b border-gray-100 z-10">
                                <tr>
                                    <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Post Date</th>
                                    <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Source/Ref</th>
                                    <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Particulars</th>
                                    <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Ledger Group</th>
                                    <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest text-right">Debit</th>
                                    <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest text-right">Credit</th>
                                    <th className="px-6 py-4"></th>
                                </tr>
                            </thead>
                            <tbody>
                                {getWindowTransactions(activeWindow).map((txn) => (
                                    <tr key={txn.id} className="group border-b border-gray-50 hover:bg-gray-50/50 transition-colors">
                                        <td className="px-6 py-5">
                                            <p className="text-xs font-bold text-gray-900">{txn.date}</p>
                                            <p className="text-[10px] text-gray-400 font-medium">Auto-posted via POS</p>
                                        </td>
                                        <td className="px-6 py-5">
                                            <span className="text-[10px] font-black text-gray-900 bg-gray-100 px-2 py-1 rounded border border-gray-200 uppercase tracking-tighter">{txn.refNo}</span>
                                        </td>
                                        <td className="px-6 py-5">
                                            <p className="text-xs font-bold text-gray-900">{txn.particulars}</p>
                                            <p className="text-[10px] text-gray-400 font-medium italic mt-0.5">{txn.description}</p>
                                        </td>
                                        <td className="px-6 py-5">
                                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${
                                                txn.category === 'Room' ? 'bg-blue-50 text-blue-600' :
                                                txn.category === 'F&B' ? 'bg-orange-50 text-orange-600' :
                                                txn.category === 'Laundry' ? 'bg-emerald-50 text-emerald-600' : 'bg-gray-50 text-gray-600'
                                            }`}>
                                                {txn.category}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            {txn.amount < 0 && <span className="text-sm font-black text-gray-900">৳ {Math.abs(txn.amount).toLocaleString()}</span>}
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            {txn.amount > 0 && <span className="text-sm font-black text-emerald-600">৳ {txn.amount.toLocaleString()}</span>}
                                        </td>
                                        <td className="px-6 py-4 text-right opacity-0 group-hover:opacity-100 transition-opacity">
                                            <button className="p-2 text-gray-400 hover:text-blue-600 hover:bg-white rounded-lg transition-all shadow-sm">
                                                <MoreHorizontal size={16} />
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    {/* Ledger Summary Bar */}
                    <div className="bg-gray-50 border-t border-gray-200 p-8 flex justify-between items-center">
                        <div className="flex gap-12">
                            <div>
                                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Window {activeWindow} Net Posting</p>
                                <p className={`text-3xl font-black ${calcTotal(activeWindow) >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                                    ৳ {calcTotal(activeWindow).toLocaleString()}
                                </p>
                            </div>
                            <div className="border-l border-gray-200 pl-12">
                                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Total Audit Status</p>
                                <div className="flex items-center gap-2">
                                    <div className="flex items-center gap-1.5 px-2 py-1 bg-blue-50 text-blue-600 rounded-lg text-[10px] font-black uppercase">
                                        <ShieldCheck size={12} />
                                        Department Balanced
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div className="flex gap-3">
                            <button className="px-6 py-3 bg-white border border-gray-200 text-gray-900 font-bold rounded-2xl hover:bg-gray-50 transition-all text-xs uppercase tracking-widest flex items-center gap-2">
                                <Printer size={16} /> Print Window {activeWindow}
                            </button>
                            <button className="px-8 py-3 bg-gray-900 text-white font-bold rounded-2xl hover:bg-blue-600 transition-all shadow-xl shadow-gray-900/10 text-xs uppercase tracking-widest">
                                Close Window & Settle
                            </button>
                        </div>
                    </div>
                </div>
            </main>

            {/* Add Payment Modal Component */}
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
