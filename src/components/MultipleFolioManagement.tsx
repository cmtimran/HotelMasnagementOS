import { useState } from 'react';
import { FileText, Plus, DollarSign, CreditCard, Split } from 'lucide-react';

interface Transaction {
    id: string;
    date: string;
    description: string;
    amount: number;
    type: 'charge' | 'payment';
}

interface Folio {
    id: string;
    name: string;
    label: 'A' | 'B' | 'C';
    transactions: Transaction[];
    balance: number;
    paymentMethod?: string;
}

const MultipleFolioManagement = ({ roomNumber = '305' }: { roomNumber?: string }) => {
    const [activeFolio, setActiveFolio] = useState<'A' | 'B' | 'C'>('A');
    const [folios] = useState<Folio[]>([
        {
            id: 'A',
            name: 'Room Charges',
            label: 'A',
            transactions: [
                { id: '1', date: '2024-01-15', description: 'Room Rent - Night 1', amount: 150, type: 'charge' },
                { id: '2', date: '2024-01-16', description: 'Room Rent - Night 2', amount: 150, type: 'charge' },
                { id: '3', date: '2024-01-16', description: 'Tax (10%)', amount: 30, type: 'charge' }
            ],
            balance: 330,
            paymentMethod: 'Company Bill'
        },
        {
            id: 'B',
            name: 'Food & Beverage',
            label: 'B',
            transactions: [
                { id: '4', date: '2024-01-15', description: 'Restaurant - Dinner', amount: 45, type: 'charge' },
                { id: '5', date: '2024-01-16', description: 'Room Service - Breakfast', amount: 25, type: 'charge' },
                { id: '6', date: '2024-01-16', description: 'Bar - Drinks', amount: 30, type: 'charge' }
            ],
            balance: 100,
            paymentMethod: 'Guest Credit Card'
        },
        {
            id: 'C',
            name: 'Minibar & Extras',
            label: 'C',
            transactions: [
                { id: '7', date: '2024-01-15', description: 'Minibar - Beverages', amount: 15, type: 'charge' },
                { id: '8', date: '2024-01-16', description: 'Laundry Service', amount: 20, type: 'charge' }
            ],
            balance: 35,
            paymentMethod: 'Cash'
        }
    ]);

    const currentFolio = folios.find(f => f.label === activeFolio)!;
    const totalBalance = folios.reduce((sum, f) => sum + f.balance, 0);

    const getFolioColor = (label: 'A' | 'B' | 'C') => {
        const colors = {
            'A': 'bg-blue-600',
            'B': 'bg-green-600',
            'C': 'bg-purple-600'
        };
        return colors[label];
    };

    const handleSplitBill = () => {
        alert('Split Bill: Configure which folio pays for which charges');
    };

    const handleMergeFolios = () => {
        alert('Merge Folios: Combine multiple folios into one');
    };

    return (
        <div className="p-6 bg-gray-50 min-h-screen">
            <div className="max-w-6xl mx-auto">
                {/* Header */}
                <div className="mb-6">
                    <div className="flex items-center justify-between">
                        <div>
                            <h1 className="text-2xl font-bold text-gray-900 mb-2 flex items-center gap-2">
                                <FileText size={28} />
                                Multiple Folio Management
                            </h1>
                            <p className="text-gray-600">Room {roomNumber} - Split billing across multiple folios</p>
                        </div>
                        <div className="flex gap-2">
                            <button
                                onClick={handleSplitBill}
                                className="flex items-center gap-2 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                            >
                                <Split size={18} />
                                Split Bill
                            </button>
                            <button
                                onClick={handleMergeFolios}
                                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                            >
                                <Plus size={18} />
                                Merge Folios
                            </button>
                        </div>
                    </div>
                </div>

                {/* Summary Cards */}
                <div className="grid grid-cols-4 gap-4 mb-6">
                    {folios.map((folio) => (
                        <div
                            key={folio.id}
                            className={`bg-white rounded-lg shadow p-4 cursor-pointer transition-all ${activeFolio === folio.label ? 'ring-2 ring-blue-500' : ''
                                }`}
                            onClick={() => setActiveFolio(folio.label)}
                        >
                            <div className="flex items-center justify-between mb-2">
                                <span className={`w-8 h-8 rounded-full ${getFolioColor(folio.label)} text-white flex items-center justify-center font-bold`}>
                                    {folio.label}
                                </span>
                                <span className="text-xs text-gray-500">{folio.transactions.length} items</span>
                            </div>
                            <h3 className="text-sm font-medium text-gray-900 mb-1">{folio.name}</h3>
                            <p className="text-2xl font-bold text-gray-900">${folio.balance.toFixed(2)}</p>
                            <p className="text-xs text-gray-600 mt-1">{folio.paymentMethod}</p>
                        </div>
                    ))}
                    <div className="bg-gradient-to-br from-blue-600 to-blue-700 rounded-lg shadow p-4 text-white">
                        <div className="flex items-center justify-between mb-2">
                            <DollarSign size={24} />
                            <span className="text-xs opacity-80">Total</span>
                        </div>
                        <h3 className="text-sm font-medium mb-1">Grand Total</h3>
                        <p className="text-2xl font-bold">${totalBalance.toFixed(2)}</p>
                        <p className="text-xs opacity-80 mt-1">All Folios</p>
                    </div>
                </div>

                {/* Folio Tabs */}
                <div className="bg-white rounded-lg shadow">
                    <div className="border-b border-gray-200">
                        <div className="flex">
                            {folios.map((folio) => (
                                <button
                                    key={folio.id}
                                    onClick={() => setActiveFolio(folio.label)}
                                    className={`flex-1 px-6 py-4 text-center font-medium transition-colors ${activeFolio === folio.label
                                        ? 'border-b-2 border-blue-600 text-blue-600'
                                        : 'text-gray-600 hover:text-gray-900'
                                        }`}
                                >
                                    <div className="flex items-center justify-center gap-2">
                                        <span className={`w-6 h-6 rounded-full ${getFolioColor(folio.label)} text-white flex items-center justify-center text-xs font-bold`}>
                                            {folio.label}
                                        </span>
                                        <span>{folio.name}</span>
                                    </div>
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Transactions Table */}
                    <div className="p-6">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-lg font-semibold text-gray-900">
                                Folio {currentFolio.label} - {currentFolio.name}
                            </h3>
                            <div className="flex gap-2">
                                <button className="flex items-center gap-2 px-3 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 text-sm">
                                    <Plus size={16} />
                                    Add Charge
                                </button>
                                <button className="flex items-center gap-2 px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm">
                                    <CreditCard size={16} />
                                    Post Payment
                                </button>
                            </div>
                        </div>

                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead className="bg-gray-50">
                                    <tr>
                                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Description</th>
                                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Debit</th>
                                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Credit</th>
                                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Balance</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-200">
                                    {currentFolio.transactions.map((txn, index) => {
                                        const runningBalance = currentFolio.transactions
                                            .slice(0, index + 1)
                                            .reduce((sum, t) => sum + (t.type === 'charge' ? t.amount : -t.amount), 0);

                                        return (
                                            <tr key={txn.id} className="hover:bg-gray-50">
                                                <td className="px-4 py-3 text-sm text-gray-900">{txn.date}</td>
                                                <td className="px-4 py-3 text-sm text-gray-900">{txn.description}</td>
                                                <td className="px-4 py-3 text-sm text-right text-red-600">
                                                    {txn.type === 'charge' ? `$${txn.amount.toFixed(2)}` : '-'}
                                                </td>
                                                <td className="px-4 py-3 text-sm text-right text-green-600">
                                                    {txn.type === 'payment' ? `$${txn.amount.toFixed(2)}` : '-'}
                                                </td>
                                                <td className="px-4 py-3 text-sm text-right font-medium text-gray-900">
                                                    ${runningBalance.toFixed(2)}
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                                <tfoot className="bg-gray-50">
                                    <tr>
                                        <td colSpan={4} className="px-4 py-3 text-right text-sm font-semibold text-gray-900">
                                            Folio {currentFolio.label} Balance:
                                        </td>
                                        <td className="px-4 py-3 text-right text-lg font-bold text-blue-600">
                                            ${currentFolio.balance.toFixed(2)}
                                        </td>
                                    </tr>
                                </tfoot>
                            </table>
                        </div>

                        <div className="mt-4 p-4 bg-blue-50 rounded-lg">
                            <p className="text-sm text-blue-900">
                                <strong>Payment Method:</strong> {currentFolio.paymentMethod}
                            </p>
                        </div>
                    </div>
                </div>

                {/* Info */}
                <div className="mt-6 bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                    <h4 className="font-medium text-yellow-900 mb-2">Split Billing Example:</h4>
                    <ul className="text-sm text-yellow-700 space-y-1">
                        <li>• <strong>Folio A:</strong> Room charges → Company pays</li>
                        <li>• <strong>Folio B:</strong> Food & Beverage → Guest credit card</li>
                        <li>• <strong>Folio C:</strong> Minibar & Extras → Cash payment</li>
                    </ul>
                </div>
            </div>
        </div>
    );
};

export default MultipleFolioManagement;
