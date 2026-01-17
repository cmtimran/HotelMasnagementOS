import { useState } from 'react';
import { DollarSign, Calendar, Download, Mail, FileText } from 'lucide-react';

interface CityLedgerAccount {
    id: string;
    companyName: string;
    accountNumber: string;
    creditLimit: number;
    currentBalance: number;
    paymentTerms: string;
    status: string;
}

const CityLedgerDashboard = () => {
    const [accounts] = useState<CityLedgerAccount[]>([
        {
            id: '1',
            companyName: 'ABC Corporation',
            accountNumber: 'CL-001',
            creditLimit: 50000,
            currentBalance: 12500,
            paymentTerms: 'Net 30',
            status: 'active'
        },
        {
            id: '2',
            companyName: 'XYZ Industries',
            accountNumber: 'CL-002',
            creditLimit: 30000,
            currentBalance: 8750,
            paymentTerms: 'Net 60',
            status: 'active'
        }
    ]);

    const totalOutstanding = accounts.reduce((sum, acc) => sum + acc.currentBalance, 0);
    const aging30 = 5250;
    const aging60 = 8000;
    const aging90 = 8000;

    return (
        <div className="p-6 bg-gray-50 min-h-screen">
            <div className="mb-6">
                <h1 className="text-2xl font-bold text-gray-900 mb-2">City Ledger (Accounts Receivable)</h1>
                <p className="text-gray-600">Manage corporate accounts and invoicing</p>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                <div className="bg-white rounded-lg shadow p-6">
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium text-gray-600">Total Outstanding</span>
                        <DollarSign className="text-blue-500" size={20} />
                    </div>
                    <p className="text-2xl font-bold text-gray-900">${totalOutstanding.toLocaleString()}</p>
                    <p className="text-xs text-gray-500 mt-1">Across {accounts.length} accounts</p>
                </div>

                <div className="bg-white rounded-lg shadow p-6">
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium text-gray-600">0-30 Days</span>
                        <Calendar className="text-green-500" size={20} />
                    </div>
                    <p className="text-2xl font-bold text-gray-900">${aging30.toLocaleString()}</p>
                    <p className="text-xs text-green-600 mt-1">Current</p>
                </div>

                <div className="bg-white rounded-lg shadow p-6">
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium text-gray-600">31-60 Days</span>
                        <Calendar className="text-yellow-500" size={20} />
                    </div>
                    <p className="text-2xl font-bold text-gray-900">${aging60.toLocaleString()}</p>
                    <p className="text-xs text-yellow-600 mt-1">Due soon</p>
                </div>

                <div className="bg-white rounded-lg shadow p-6">
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium text-gray-600">60+ Days</span>
                        <Calendar className="text-red-500" size={20} />
                    </div>
                    <p className="text-2xl font-bold text-gray-900">${aging90.toLocaleString()}</p>
                    <p className="text-xs text-red-600 mt-1">Overdue</p>
                </div>
            </div>

            {/* Actions */}
            <div className="bg-white rounded-lg shadow p-6 mb-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h2>
                <div className="flex gap-3">
                    <button className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
                        <FileText size={18} />
                        Generate Invoices
                    </button>
                    <button className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700">
                        <Mail size={18} />
                        Email Statements
                    </button>
                    <button className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700">
                        <Download size={18} />
                        Aging Report
                    </button>
                </div>
            </div>

            {/* Accounts List */}
            <div className="bg-white rounded-lg shadow">
                <div className="p-6 border-b border-gray-200">
                    <h2 className="text-lg font-semibold text-gray-900">Active Accounts</h2>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Account #</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Company</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Credit Limit</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Balance</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Available</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Terms</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                            {accounts.map((account) => (
                                <tr key={account.id} className="hover:bg-gray-50">
                                    <td className="px-6 py-4 text-sm font-medium text-gray-900">{account.accountNumber}</td>
                                    <td className="px-6 py-4 text-sm text-gray-900">{account.companyName}</td>
                                    <td className="px-6 py-4 text-sm text-gray-900">${account.creditLimit.toLocaleString()}</td>
                                    <td className="px-6 py-4 text-sm font-medium text-red-600">${account.currentBalance.toLocaleString()}</td>
                                    <td className="px-6 py-4 text-sm text-green-600">
                                        ${(account.creditLimit - account.currentBalance).toLocaleString()}
                                    </td>
                                    <td className="px-6 py-4 text-sm text-gray-500">{account.paymentTerms}</td>
                                    <td className="px-6 py-4">
                                        <span className="px-2 py-1 text-xs font-medium rounded-full bg-green-100 text-green-800">
                                            {account.status}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-sm">
                                        <button className="text-blue-600 hover:text-blue-800 font-medium mr-3">View</button>
                                        <button className="text-green-600 hover:text-green-800 font-medium">Invoice</button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default CityLedgerDashboard;
