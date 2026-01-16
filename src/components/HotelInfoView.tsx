import { useState } from 'react';
import { Building2, MapPin, Globe, CreditCard, Star, Clock, Moon, Monitor, User, Edit2, Copy, Mail } from 'lucide-react';
import SendEmailModal from './SendEmailModal';

interface HotelInfoViewProps {
    property: any;
    currentUser: any;
    onManageProperty: () => void;
}

const HotelInfoView = ({ property, currentUser, onManageProperty }: HotelInfoViewProps) => {
    const [activeTab, setActiveTab] = useState('overview');
    const [isEmailModalOpen, setIsEmailModalOpen] = useState(false);

    const tabs = [
        { id: 'overview', label: 'Overview', icon: Building2 },
        { id: 'operations', label: 'Operations', icon: Clock },
        { id: 'finance', label: 'Finance', icon: CreditCard },
        { id: 'automation', label: 'Automation', icon: Monitor },
        { id: 'team', label: 'Team', icon: User },
    ];

    const handleCopyInfo = () => {
        const text = `
Property: ${property.name}
Address: ${property.address}, ${property.city}, ${property.country}
Contact: ${property.phone} | ${property.email}
Website: ${property.website}
        `.trim();
        navigator.clipboard.writeText(text);
        alert('Hotel information copied to clipboard!');
    };

    // Mock Transaction Data
    const transactions = [
        { id: 'TXN-001', date: '2024-03-15', desc: 'Monthly Subscription', amount: -299.00, type: 'debit', status: 'Completed' },
        { id: 'TXN-002', date: '2024-03-14', desc: 'Booking Commission Payout', amount: 1250.50, type: 'credit', status: 'Completed' },
        { id: 'TXN-003', date: '2024-03-10', desc: 'SMS Credits Top-up', amount: -50.00, type: 'debit', status: 'Completed' },
        { id: 'TXN-004', date: '2024-02-28', desc: 'Hardware Maintenance', amount: -120.00, type: 'debit', status: 'Pending' },
    ];

    return (
        <div className="p-6 max-w-7xl mx-auto space-y-6">
            {/* Header Card */}
            <div className="bg-blue-600 rounded-2xl overflow-hidden shadow-lg relative">
                {/* Action Buttons */}
                <div className="absolute top-6 right-6 z-20 flex items-center gap-2">
                    <button
                        onClick={handleCopyInfo}
                        className="p-2 bg-white/10 hover:bg-white/20 text-white rounded-lg backdrop-blur-md transition-colors border border-white/10"
                        title="Copy Information"
                    >
                        <Copy size={18} />
                    </button>
                    <button
                        onClick={() => setIsEmailModalOpen(true)}
                        className="p-2 bg-white/10 hover:bg-white/20 text-white rounded-lg backdrop-blur-md transition-colors border border-white/10"
                        title="Send via Email"
                    >
                        <Mail size={18} />
                    </button>
                    <button
                        onClick={onManageProperty}
                        className="flex items-center gap-2 px-4 py-2 bg-white text-blue-600 rounded-lg font-bold hover:bg-blue-50 transition-colors shadow-sm"
                    >
                        <Edit2 size={16} /> Manage Property
                    </button>
                </div>

                <div className="p-8 flex items-end gap-6 relative">
                    <div className="w-24 h-24 rounded-2xl bg-white shadow-lg p-1 flex-shrink-0 z-10">
                        <img
                            src={property.logo}
                            alt={property.name}
                            className="w-full h-full rounded-xl object-cover bg-gray-50 border border-gray-100"
                        />
                    </div>
                    <div className="mb-2 z-10 text-white">
                        <h2 className="text-3xl font-bold tracking-tight mb-1">{property.name}</h2>
                        <div className="flex items-center gap-4 text-blue-100 text-sm font-medium opacity-90">
                            <span className="flex items-center gap-1.5"><MapPin size={15} /> {property.city}, {property.country}</span>
                            <span className="flex items-center gap-1.5"><Globe size={15} /> {property.website}</span>
                        </div>
                    </div>
                    {/* Background Decorative Circles */}
                    <div className="absolute top-0 right-0 p-32 bg-blue-500 rounded-full blur-3xl opacity-20 pointer-events-none transform translate-x-10 -translate-y-10"></div>
                    <div className="absolute bottom-0 left-0 p-24 bg-blue-400 rounded-full blur-3xl opacity-20 pointer-events-none transform -translate-x-10 translate-y-10"></div>
                </div>

                {/* Tabs Bar */}
                <div className="bg-white px-8 flex gap-8 overflow-x-auto border-b border-gray-100">
                    {tabs.map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={`py-4 text-sm font-medium flex items-center gap-2 border-b-2 transition-all whitespace-nowrap ${activeTab === tab.id
                                ? 'border-blue-600 text-blue-600'
                                : 'border-transparent text-gray-500 hover:text-gray-800'
                                }`}
                        >
                            <tab.icon size={16} strokeWidth={2.5} />
                            {tab.label}
                        </button>
                    ))}
                </div>
            </div>

            {/* Main Content Area */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 min-h-[500px]">
                {activeTab === 'overview' && (
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
                        {/* Left Column: Details */}
                        <div className="space-y-8">
                            <div>
                                <h3 className="text-xs font-bold text-gray-900 uppercase tracking-widest mb-4">Business Details</h3>
                                <div className="space-y-4">
                                    <div className="flex justify-between py-1 border-b border-gray-50">
                                        <span className="text-gray-500 text-sm">Address</span>
                                        <span className="font-medium text-gray-900 text-sm text-right">{property.address}</span>
                                    </div>
                                    <div className="flex justify-between py-1 border-b border-gray-50">
                                        <span className="text-gray-500 text-sm">Website</span>
                                        <a href={`https://${property.website}`} target="_blank" rel="noreferrer" className="font-medium text-blue-600 hover:underline text-sm">{property.website}</a>
                                    </div>
                                </div>
                            </div>
                            <div>
                                <h3 className="text-xs font-bold text-gray-900 uppercase tracking-widest mb-4">Corporate Office</h3>
                                <div className="bg-gray-50 rounded-xl p-5 space-y-3 border border-gray-100">
                                    <div className="flex gap-3">
                                        <MapPin size={16} className="text-gray-400 mt-0.5" />
                                        <span className="text-gray-700 text-sm font-medium">{property.corporate?.address || 'N/A'}</span>
                                    </div>
                                    <div className="flex gap-3">
                                        <Globe size={16} className="text-gray-400 mt-0.5" />
                                        <span className="text-gray-700 text-sm font-medium">{property.corporate?.email || 'N/A'}</span>
                                    </div>
                                    <div className="flex gap-3">
                                        <CreditCard size={16} className="text-gray-400 mt-0.5" />
                                        <span className="text-gray-700 text-sm font-medium">{property.corporate?.phone || 'N/A'}</span>
                                    </div>
                                </div>
                            </div>

                            {/* Session Info Block */}
                            <div>
                                <h3 className="text-xs font-bold text-gray-900 uppercase tracking-widest mb-4">Current Session</h3>
                                <div className="flex items-center gap-4 p-4 rounded-lg bg-blue-50 border border-blue-100">
                                    <div className="w-12 h-12 rounded-full bg-blue-200 flex items-center justify-center text-blue-700 font-bold text-xl">
                                        {currentUser?.name?.charAt(0) || 'U'}
                                    </div>
                                    <div>
                                        <p className="text-xs text-blue-600 uppercase font-bold tracking-wider">Logged In As</p>
                                        <p className="font-bold text-gray-900">{currentUser?.name || 'Unknown User'}</p>
                                        <p className="text-sm text-gray-600">{currentUser?.role || 'Guest'}</p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Right Column: Stats */}
                        <div className="space-y-6">
                            <h3 className="text-xs font-bold text-gray-900 uppercase tracking-widest">Property Stats</h3>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="p-6 rounded-2xl border border-gray-100 shadow-sm bg-white hover:shadow-md transition-shadow">
                                    <p className="text-gray-500 text-xs font-medium uppercase">Total Rooms</p>
                                    <p className="text-4xl font-bold text-gray-900 mt-2">{property.rooms}</p>
                                </div>
                                <div className="p-6 rounded-2xl border border-gray-100 shadow-sm bg-white hover:shadow-md transition-shadow">
                                    <p className="text-gray-500 text-xs font-medium uppercase">Grade</p>
                                    <p className="text-3xl font-bold text-yellow-500 mt-2 flex items-center gap-2">
                                        <Star size={24} fill="currentColor" /> {property.grade}
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {activeTab === 'operations' && (
                    <div className="space-y-8">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            <div className="p-4 rounded-xl bg-blue-50/50 border border-blue-100 space-y-2">
                                <div className="flex items-center gap-2 text-blue-700 font-bold text-sm uppercase tracking-wide"> <Clock size={16} /> Check-in</div>
                                <p className="text-3xl font-bold text-gray-900">{property.operations?.checkIn || '14:00'}</p>
                            </div>
                            <div className="p-4 rounded-xl bg-orange-50/50 border border-orange-100 space-y-2">
                                <div className="flex items-center gap-2 text-orange-700 font-bold text-sm uppercase tracking-wide"> <Clock size={16} /> Check-out</div>
                                <p className="text-3xl font-bold text-gray-900">{property.operations?.checkOut || '12:00'}</p>
                            </div>
                            <div className="p-4 rounded-xl bg-purple-50/50 border border-purple-100 space-y-2">
                                <div className="flex items-center gap-2 text-purple-700 font-bold text-sm uppercase tracking-wide"> <Moon size={16} /> Night Audit</div>
                                <p className="text-3xl font-bold text-gray-900">{property.operations?.nightAudit || '02:00'}</p>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            <div className="space-y-4">
                                <h3 className="text-xs font-bold text-gray-900 uppercase tracking-widest border-b pb-2">Policies</h3>
                                <dl className="space-y-4">
                                    <div>
                                        <dt className="text-xs text-gray-500 mb-1">Cancellation Policy</dt>
                                        <dd className="font-medium text-gray-900 bg-gray-50 px-3 py-2 rounded-lg inline-block">{property.operations?.cancellation || 'Flexible'}</dd>
                                    </div>
                                    <div>
                                        <dt className="text-xs text-gray-500 mb-1">Weekend Days</dt>
                                        <dd className="flex gap-2">
                                            {property.operations?.weekends?.map((day: string) => (
                                                <span key={day} className="px-2.5 py-1 bg-gray-100 text-xs rounded-md font-bold text-gray-600 uppercase">{day}</span>
                                            )) || <span className="text-gray-400 text-sm">None set</span>}
                                        </dd>
                                    </div>
                                </dl>
                            </div>
                            <div className="space-y-4">
                                <h3 className="text-xs font-bold text-gray-900 uppercase tracking-widest border-b pb-2">House Rules</h3>
                                <dl className="space-y-4">
                                    <div>
                                        <dt className="text-xs text-gray-500 mb-1">Smoking Policy</dt>
                                        <dd className="font-medium text-gray-900">{property.operations?.smoking || 'N/A'}</dd>
                                    </div>
                                </dl>
                            </div>
                        </div>
                    </div>
                )}

                {activeTab === 'finance' && (
                    <div className="space-y-12">
                        <div className="grid grid-cols-1 gap-8">
                            <div className="p-6 border border-gray-100 rounded-xl bg-gray-50/50">
                                <h3 className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">Tax Configuration</h3>
                                <div className="flex items-baseline gap-4">
                                    <p className="text-2xl font-bold text-gray-900">{property.finance?.taxRule || 'Not Configured'}</p>
                                    <span className="text-sm font-medium text-gray-500 bg-white px-2 py-1 rounded border">BIN: {property.finance?.binNo || 'N/A'}</span>
                                </div>
                            </div>

                            <div>
                                <h3 className="text-xs font-bold text-gray-900 uppercase tracking-widest border-b pb-2 mb-4">Bank Accounts</h3>
                                <div className="grid grid-cols-1 gap-4">
                                    {property.finance?.bankAccounts?.map((acc: any) => (
                                        <div key={acc.id} className="p-5 border border-gray-200 rounded-xl flex justify-between items-center hover:shadow-md transition-shadow bg-white">
                                            <div>
                                                <p className="font-bold text-gray-900 text-lg">{acc.bankName}</p>
                                                <p className="text-sm text-gray-500 font-mono mt-1">{acc.accountNum}</p>
                                            </div>
                                            <div className="text-right bg-gray-50 px-4 py-2 rounded-lg">
                                                <p className="text-xs text-gray-400 uppercase font-bold">SWIFT</p>
                                                <p className="font-bold text-gray-700 font-mono">{acc.swift}</p>
                                            </div>
                                        </div>
                                    )) || <p className="text-gray-500 text-sm italic">No bank accounts linked.</p>}
                                </div>
                            </div>
                        </div>

                        {/* Payment Transaction History */}
                        <div>
                            <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                                <CreditCard size={20} className="text-blue-600" />
                                Transaction History
                            </h3>
                            <div className="border border-gray-200 rounded-xl overflow-hidden bg-white shadow-sm">
                                <table className="w-full text-sm text-left">
                                    <thead className="bg-gray-50 border-b border-gray-200 text-gray-600 font-medium">
                                        <tr>
                                            <th className="px-6 py-4">Transaction ID</th>
                                            <th className="px-6 py-4">Date</th>
                                            <th className="px-6 py-4">Description</th>
                                            <th className="px-6 py-4 text-right">Amount</th>
                                            <th className="px-6 py-4 text-center">Status</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100">
                                        {transactions.map(txn => (
                                            <tr key={txn.id} className="hover:bg-gray-50 transition-colors">
                                                <td className="px-6 py-4 font-mono text-gray-500">{txn.id}</td>
                                                <td className="px-6 py-4 text-gray-900">{txn.date}</td>
                                                <td className="px-6 py-4 text-gray-900 font-medium">{txn.desc}</td>
                                                <td className={`px-6 py-4 text-right font-bold ${txn.type === 'credit' ? 'text-green-600' : 'text-gray-900'}`}>
                                                    {txn.type === 'credit' ? '+' : ''}{txn.amount.toFixed(2)}
                                                </td>
                                                <td className="px-6 py-4 text-center">
                                                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${txn.status === 'Completed' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                                                        }`}>
                                                        {txn.status}
                                                    </span>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                    <tfoot className="bg-gray-50 border-t border-gray-200">
                                        <tr>
                                            <td colSpan={5} className="px-6 py-3 text-right text-xs text-gray-500">
                                                Showing recent transactions. <button className="text-blue-600 font-bold hover:underline ml-1">View All</button>
                                            </td>
                                        </tr>
                                    </tfoot>
                                </table>
                            </div>
                        </div>
                    </div>
                )}

                {activeTab === 'automation' && (
                    <div className="space-y-6">
                        <div className="bg-gray-900 text-white p-8 rounded-2xl shadow-lg relative overflow-hidden">
                            <div className="absolute top-0 right-0 p-32 bg-blue-500 rounded-full blur-3xl opacity-10 pointer-events-none transform translate-x-10 -translate-y-10"></div>

                            <div className="flex justify-between items-start relative z-10">
                                <div>
                                    <h3 className="text-2xl font-bold flex items-center gap-3"><Monitor className="text-blue-400" /> Night Audit Automation</h3>
                                    <p className="text-gray-400 text-base mt-2 max-w-md">Configuration for automated nightly system tasks and reporting.</p>
                                </div>
                                <div className={`px-4 py-1.5 rounded-full text-sm font-bold border ${property.automation?.autoRun ? 'bg-green-500/20 border-green-500 text-green-400' : 'bg-red-500/20 border-red-500 text-red-400'}`}>
                                    {property.automation?.autoRun ? 'ACTIVE' : 'INACTIVE'}
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-8 relative z-10">
                                <div className="bg-white/10 p-4 rounded-xl backdrop-blur-md border border-white/10">
                                    <p className="text-xs text-gray-400 uppercase tracking-wider font-bold">Audit Time</p>
                                    <p className="text-3xl font-mono mt-2">{property.automation?.auditTime || 'N/A'}</p>
                                </div>
                                <div className="bg-white/10 p-4 rounded-xl backdrop-blur-md border border-white/10">
                                    <p className="text-xs text-gray-400 uppercase tracking-wider font-bold">Auto Post Rent</p>
                                    <p className={`text-xl font-bold mt-2 ${property.automation?.autoPostRent ? 'text-green-400' : 'text-gray-500'}`}>
                                        {property.automation?.autoPostRent ? 'Enabled' : 'Disabled'}
                                    </p>
                                </div>
                                <div className="bg-white/10 p-4 rounded-xl backdrop-blur-md border border-white/10">
                                    <p className="text-xs text-gray-400 uppercase tracking-wider font-bold">Auto Backup</p>
                                    <p className="text-xl font-bold mt-2 text-green-400">Enabled</p>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {activeTab === 'team' && (
                    <div className="space-y-6">
                        <h3 className="text-xs font-bold text-gray-900 uppercase tracking-widest border-b pb-4">Key Contacts</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {property.pocs?.map((poc: any) => (
                                <div key={poc.id} className="p-5 border border-gray-200 rounded-xl flex items-start gap-4 hover:border-blue-300 transition-colors bg-white group">
                                    <div className="w-12 h-12 rounded-full bg-blue-50 flex items-center justify-center text-blue-600 font-bold text-lg shrink-0 group-hover:bg-blue-600 group-hover:text-white transition-colors">
                                        {poc.name.charAt(0)}
                                    </div>
                                    <div>
                                        <p className="font-bold text-gray-900 text-lg">{poc.name}</p>
                                        <p className="text-blue-600 text-xs font-bold uppercase tracking-wide mb-3">{poc.role}</p>
                                        <div className="space-y-1">
                                            <p className="text-sm text-gray-600 flex items-center gap-2"><User size={14} className="text-gray-400" /> {poc.phone}</p>
                                            <p className="text-sm text-gray-600 flex items-center gap-2"><Globe size={14} className="text-gray-400" /> {poc.email}</p>
                                        </div>
                                    </div>
                                </div>
                            )) || <p className="text-gray-500 italic">No contacts listed.</p>}
                        </div>
                    </div>
                )}
            </div>

            <SendEmailModal isOpen={isEmailModalOpen} onClose={() => setIsEmailModalOpen(false)} defaultSubject={`Inquiry regarding ${property.name}`} />
        </div>
    );
};

export default HotelInfoView;
