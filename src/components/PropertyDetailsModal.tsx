import { useState } from 'react';
import { X, Building2, MapPin, Globe, CreditCard, LayoutGrid, Star, Clock, Moon, Monitor, User, Edit2 } from 'lucide-react';

interface PropertyDetailsModalProps {
    isOpen: boolean;
    onClose: () => void;
    property: any;
}

const PropertyDetailsModal = ({ isOpen, onClose, property }: PropertyDetailsModalProps) => {
    const [activeTab, setActiveTab] = useState('overview');

    if (!isOpen || !property) return null;

    const tabs = [
        { id: 'overview', label: 'Overview', icon: Building2 },
        { id: 'operations', label: 'Operations', icon: Clock },
        { id: 'finance', label: 'Finance', icon: CreditCard },
        { id: 'automation', label: 'Automation', icon: Monitor },
        { id: 'team', label: 'Team', icon: User },
    ];

    return (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl h-[75vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">

                {/* Header - Solid Blue */}
                <div className="relative h-32 bg-blue-600 flex-shrink-0">
                    <button
                        onClick={onClose}
                        className="absolute top-4 right-4 p-2 bg-white/20 hover:bg-white/30 text-white rounded-full transition-colors z-10"
                    >
                        <X size={20} />
                    </button>
                    <div className="absolute -bottom-12 left-8 flex items-end">
                        <div className="w-24 h-24 rounded-2xl bg-white shadow-lg p-1 flex-shrink-0">
                            <img
                                src={property.logo}
                                alt={property.name}
                                className="w-full h-full rounded-xl object-cover bg-gray-50 border border-gray-100"
                            />
                        </div>
                        <div className="mb-14 ml-5">
                            <h2 className="text-3xl font-bold text-white tracking-tight">{property.name}</h2>
                            <p className="text-blue-100 text-sm flex items-center gap-1.5 font-medium opacity-90">
                                <MapPin size={15} /> {property.city}, {property.country}
                            </p>
                        </div>
                    </div>
                </div>

                {/* Tabs */}
                <div className="mt-14 px-8 border-b flex gap-8 overflow-x-auto flex-shrink-0 scrollbar-hide">
                    {tabs.map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={`pb-4 text-sm font-medium flex items-center gap-2 border-b-2 transition-all whitespace-nowrap ${activeTab === tab.id
                                ? 'border-blue-600 text-blue-600'
                                : 'border-transparent text-gray-500 hover:text-gray-800'
                                }`}
                        >
                            <tab.icon size={16} strokeWidth={2.5} />
                            {tab.label}
                        </button>
                    ))}
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-8 bg-white">
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
                        <div className="space-y-8">
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

                {/* Footer */}
                <div className="p-6 border-t bg-gray-50 flex justify-end gap-3 flex-shrink-0">
                    <button onClick={onClose} className="px-5 py-2.5 text-gray-600 font-bold hover:bg-gray-200 rounded-lg transition-colors">Close</button>
                    <button className="px-5 py-2.5 bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-700 shadow-lg hover:shadow-xl transition-all flex items-center gap-2">
                        <Edit2 size={18} /> Edit Property
                    </button>
                </div>

            </div>
        </div>
    );
};

export default PropertyDetailsModal;
