import { useState } from 'react';
import { ChevronDown, ChevronRight, Plus, MoreHorizontal } from 'lucide-react';
import AddPaymentModal from './AddPaymentModal';

interface Transaction {
    id: number;
    date: string;
    refNo: string;
    particulars: string;
    description: string;
    user: string;
    amount: number;
}

interface Room {
    id: number;
    number: string;
    guest: string;
    folioNumber: string;
    expanded: boolean;
}

const FolioOperations = () => {
    const [showPaymentModal, setShowPaymentModal] = useState(false);
    const [activeTab, setActiveTab] = useState('folio');

    const [rooms, setRooms] = useState<Room[]>([
        { id: 1, number: '111', guest: 'Mr. test', folioNumber: '4040', expanded: true },
        { id: 2, number: '112', guest: 'Mr. Ariyan Nusrat', folioNumber: '4041', expanded: false }
    ]);

    const [transactions] = useState<Transaction[]>([
        {
            id: 1,
            date: '23/04/2024 Tuesday',
            refNo: '2285',
            particulars: 'Credit Card',
            description: '',
            user: 'helpdesksupport',
            amount: 4000.00
        },
        {
            id: 2,
            date: '23/05/2024 Thursday',
            refNo: '',
            particulars: 'Room Charges',
            description: '',
            user: 'helpdesksupport',
            amount: -1140.00
        },
        {
            id: 3,
            date: '24/05/2024 Friday',
            refNo: '',
            particulars: 'Room Charges',
            description: '',
            user: 'helpdesksupport',
            amount: -1140.00
        }
    ]);

    const totalAmount = 228.00;
    const balance = 456.00;

    const toggleRoom = (id: number) => {
        setRooms(rooms.map(r => r.id === id ? { ...r, expanded: !r.expanded } : r));
    };

    const tabs = ['Folio Operations', 'Booking Details', 'Guest Details', 'Room Charges', 'Credit Card', 'Audit Trail'];

    return (
        <div className="h-screen bg-gray-50 flex flex-col">
            {/* Top Header */}
            <div className="bg-white border-b px-6 py-3 flex items-center justify-between">
                <div>
                    <h1 className="text-xl font-semibold text-gray-900">Aniya Nusrat</h1>
                </div>
                <div className="text-right">
                    <p className="text-sm text-gray-600">Total</p>
                    <p className="text-2xl font-bold text-gray-900">${totalAmount.toFixed(2)}</p>
                </div>
            </div>

            {/* Tabs */}
            <div className="bg-white border-b">
                <div className="flex items-center px-4">
                    {tabs.map((tab) => (
                        <button
                            key={tab}
                            onClick={() => setActiveTab(tab.toLowerCase().replace(' ', '-'))}
                            className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${activeTab === tab.toLowerCase().replace(' ', '-')
                                ? 'border-blue-600 text-blue-600'
                                : 'border-transparent text-gray-600 hover:text-gray-900'
                                }`}
                        >
                            {tab}
                        </button>
                    ))}
                </div>
            </div>

            {/* Action Buttons */}
            <div className="bg-white border-b px-4 py-3 flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <button
                        onClick={() => setShowPaymentModal(true)}
                        className="px-3 py-1.5 text-sm bg-white border border-gray-300 rounded hover:bg-gray-50"
                    >
                        Add Payment
                    </button>
                    <button className="px-3 py-1.5 text-sm bg-white border border-gray-300 rounded hover:bg-gray-50">
                        Add Charges
                    </button>
                    <button className="px-3 py-1.5 text-sm bg-white border border-gray-300 rounded hover:bg-gray-50">
                        Add Discount
                    </button>
                    <button className="px-3 py-1.5 text-sm bg-white border border-gray-300 rounded hover:bg-gray-50">
                        Folio Operations
                    </button>
                    <button className="px-3 py-1.5 text-sm bg-white border border-gray-300 rounded hover:bg-gray-50">
                        More
                    </button>
                </div>
                <div className="flex items-center gap-2">
                    <div className="flex items-center gap-2">
                        <span className="w-3 h-3 bg-orange-500 rounded-full"></span>
                        <span className="text-xs text-gray-600">Unposted</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <span className="w-3 h-3 bg-blue-600 rounded-full"></span>
                        <span className="text-xs text-gray-600">Posted</span>
                    </div>
                    <button className="px-3 py-1.5 text-sm bg-white border border-gray-300 rounded hover:bg-gray-50 flex items-center gap-1">
                        Print/Send
                        <ChevronDown size={14} />
                    </button>
                    <button className="px-3 py-1.5 text-sm bg-white border border-gray-300 rounded hover:bg-gray-50 flex items-center gap-1">
                        More Options
                        <ChevronDown size={14} />
                    </button>
                </div>
            </div>

            {/* Content */}
            <div className="flex flex-1 overflow-hidden">
                {/* Room/Folio Sidebar */}
                <div className="w-56 bg-white border-r overflow-y-auto">
                    <div className="p-3 border-b flex items-center justify-between">
                        <h3 className="text-sm font-semibold text-gray-700">Room/ Folio</h3>
                        <button className="p-1 hover:bg-gray-100 rounded">
                            <Plus size={16} className="text-blue-600" />
                        </button>
                    </div>
                    <div className="p-2 space-y-1">
                        {rooms.map(room => (
                            <div key={room.id}>
                                <button
                                    onClick={() => toggleRoom(room.id)}
                                    className={`w-full flex items-center justify-between px-3 py-2 rounded text-sm ${room.expanded ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                        }`}
                                >
                                    <div className="flex items-center gap-2">
                                        {room.expanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                                        <span className="font-semibold">{room.number}</span>
                                    </div>
                                </button>
                                {room.expanded && (
                                    <div className="ml-6 mt-1 px-2 py-1.5 bg-blue-50 rounded text-xs">
                                        <p className="font-semibold text-blue-900">{room.folioNumber}: {room.guest}</p>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                </div>

                {/* Transaction Table */}
                <div className="flex-1 bg-white overflow-auto">
                    <table className="w-full text-sm">
                        <thead className="bg-gray-50 sticky top-0">
                            <tr className="border-b">
                                <th className="px-4 py-2 text-left text-xs font-semibold text-gray-700">Days</th>
                                <th className="px-4 py-2 text-left text-xs font-semibold text-gray-700">Ref No.</th>
                                <th className="px-4 py-2 text-left text-xs font-semibold text-gray-700">Particulars</th>
                                <th className="px-4 py-2 text-left text-xs font-semibold text-gray-700">Description</th>
                                <th className="px-4 py-2 text-left text-xs font-semibold text-gray-700">User</th>
                                <th className="px-4 py-2 text-right text-xs font-semibold text-gray-700">Amount</th>
                                <th className="px-4 py-2 text-center text-xs font-semibold text-gray-700"></th>
                            </tr>
                        </thead>
                        <tbody className="divide-y">
                            {transactions.map(txn => (
                                <tr key={txn.id} className="hover:bg-gray-50">
                                    <td className="px-4 py-2.5 text-gray-900">{txn.date}</td>
                                    <td className="px-4 py-2.5 text-gray-900">{txn.refNo}</td>
                                    <td className="px-4 py-2.5 font-medium text-gray-900">{txn.particulars}</td>
                                    <td className="px-4 py-2.5 text-gray-600">{txn.description}</td>
                                    <td className="px-4 py-2.5 text-gray-600">{txn.user}</td>
                                    <td className={`px-4 py-2.5 text-right font-semibold ${txn.amount > 0 ? 'text-green-600' : 'text-red-600'
                                        }`}>
                                        {txn.amount > 0 ? '+' : ''}{txn.amount.toFixed(2)}
                                    </td>
                                    <td className="px-4 py-2.5 text-center">
                                        <button className="text-gray-400 hover:text-gray-600">
                                            <MoreHorizontal size={16} />
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>

                    {/* Totals */}
                    <div className="sticky bottom-0 bg-white border-t p-4 flex justify-between">
                        <div>
                            <p className="text-sm text-gray-600">Total Amount</p>
                            <p className="text-xl font-bold text-gray-900">${totalAmount.toFixed(2)}</p>
                        </div>
                        <div className="text-right">
                            <p className="text-sm text-gray-600">Balance</p>
                            <p className="text-xl font-bold text-red-600">${balance.toFixed(2)}</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Add Payment Modal */}
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
