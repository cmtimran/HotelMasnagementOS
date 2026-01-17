import { useState } from 'react';
import { Shield, Download, Mail, FileText, Filter } from 'lucide-react';

interface ForeignGuest {
    id: string;
    guestName: string;
    nationality: string;
    passportNumber: string;
    visaNumber: string;
    arrivalDate: string;
    departureDate: string;
    roomNumber: string;
    purpose: string;
}

const PoliceReport = () => {
    const [guests] = useState<ForeignGuest[]>([
        {
            id: '1',
            guestName: 'John Smith',
            nationality: 'United States',
            passportNumber: 'US123456789',
            visaNumber: 'V-2024-001',
            arrivalDate: '2024-01-15',
            departureDate: '2024-01-20',
            roomNumber: '305',
            purpose: 'Business'
        },
        {
            id: '2',
            guestName: 'Emma Wilson',
            nationality: 'United Kingdom',
            passportNumber: 'UK987654321',
            visaNumber: 'V-2024-002',
            arrivalDate: '2024-01-16',
            departureDate: '2024-01-22',
            roomNumber: '412',
            purpose: 'Tourism'
        }
    ]);

    const [dateFrom, setDateFrom] = useState('');
    const [dateTo, setDateTo] = useState('');

    const exportReport = () => {
        console.log('📄 Exporting Police Report (C-Form)...');
        // In production: Generate government-compliant format
    };

    const emailReport = () => {
        console.log('📧 Emailing Police Report...');
        // In production: Email to authorities
    };

    return (
        <div className="p-6 bg-gray-50 min-h-screen">
            <div className="mb-6">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900 mb-2 flex items-center gap-2">
                            <Shield size={28} />
                            Police Report (C-Form)
                        </h1>
                        <p className="text-gray-600">Foreign guest registration for government compliance</p>
                    </div>
                    <div className="flex gap-2">
                        <button
                            onClick={exportReport}
                            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                        >
                            <Download size={18} />
                            Export Report
                        </button>
                        <button
                            onClick={emailReport}
                            className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                        >
                            <Mail size={18} />
                            Email to Authorities
                        </button>
                    </div>
                </div>
            </div>

            {/* Summary */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                <div className="bg-white rounded-lg shadow p-6">
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium text-gray-600">Total Foreign Guests</span>
                        <Shield className="text-blue-500" size={20} />
                    </div>
                    <p className="text-3xl font-bold text-gray-900">{guests.length}</p>
                </div>
                <div className="bg-white rounded-lg shadow p-6">
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium text-gray-600">Checked In Today</span>
                        <FileText className="text-green-500" size={20} />
                    </div>
                    <p className="text-3xl font-bold text-gray-900">5</p>
                </div>
                <div className="bg-white rounded-lg shadow p-6">
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium text-gray-600">Departing Today</span>
                        <FileText className="text-yellow-500" size={20} />
                    </div>
                    <p className="text-3xl font-bold text-gray-900">3</p>
                </div>
                <div className="bg-white rounded-lg shadow p-6">
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium text-gray-600">Currently In-house</span>
                        <FileText className="text-purple-500" size={20} />
                    </div>
                    <p className="text-3xl font-bold text-gray-900">18</p>
                </div>
            </div>

            {/* Filters */}
            <div className="bg-white rounded-lg shadow p-4 mb-6">
                <div className="flex items-center gap-3">
                    <Filter size={20} className="text-gray-400" />
                    <div className="flex gap-3 flex-1">
                        <div>
                            <label className="block text-xs font-medium text-gray-600 mb-1">From Date</label>
                            <input
                                type="date"
                                value={dateFrom}
                                onChange={(e) => setDateFrom(e.target.value)}
                                className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-medium text-gray-600 mb-1">To Date</label>
                            <input
                                type="date"
                                value={dateTo}
                                onChange={(e) => setDateTo(e.target.value)}
                                className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-medium text-gray-600 mb-1">Nationality</label>
                            <select className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500">
                                <option>All Countries</option>
                                <option>United States</option>
                                <option>United Kingdom</option>
                                <option>Canada</option>
                            </select>
                        </div>
                        <div className="flex items-end">
                            <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
                                Apply Filters
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Guest List */}
            <div className="bg-white rounded-lg shadow">
                <div className="p-6 border-b border-gray-200">
                    <h2 className="text-lg font-semibold text-gray-900">Foreign Guest List</h2>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Guest Name</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Nationality</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Passport No</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Visa No</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Arrival</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Departure</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Room</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Purpose</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                            {guests.map((guest) => (
                                <tr key={guest.id} className="hover:bg-gray-50">
                                    <td className="px-6 py-4 text-sm font-medium text-gray-900">{guest.guestName}</td>
                                    <td className="px-6 py-4 text-sm text-gray-900">{guest.nationality}</td>
                                    <td className="px-6 py-4 text-sm text-gray-900">{guest.passportNumber}</td>
                                    <td className="px-6 py-4 text-sm text-gray-900">{guest.visaNumber}</td>
                                    <td className="px-6 py-4 text-sm text-gray-900">{guest.arrivalDate}</td>
                                    <td className="px-6 py-4 text-sm text-gray-900">{guest.departureDate}</td>
                                    <td className="px-6 py-4 text-sm text-gray-900">{guest.roomNumber}</td>
                                    <td className="px-6 py-4 text-sm text-gray-900">{guest.purpose}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default PoliceReport;
