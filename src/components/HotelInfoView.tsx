import { useState } from 'react';
import { Building2, MapPin, Globe, CreditCard, Star, Clock, Moon, Monitor, User, Edit2, Copy, Mail, ShieldCheck } from 'lucide-react';
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
        { id: 'policies', label: 'Policies', icon: ShieldCheck },
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
        <div className="p-3 sm:p-4 max-w-7xl mx-auto space-y-3 font-sans text-gray-800">
            {/* Header Card */}
            <div className="bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-700 rounded-xl overflow-hidden shadow-2xs relative">
                {/* Action Buttons */}
                <div className="absolute top-3 right-3 z-20 flex items-center gap-1.5">
                    <button
                        type="button"
                        onClick={handleCopyInfo}
                        className="w-7 h-7 flex items-center justify-center bg-white/10 hover:bg-white/20 text-white rounded-md backdrop-blur-md transition-colors border border-white/15 cursor-pointer shadow-2xs"
                        title="Copy Information"
                    >
                        <Copy size={13} />
                    </button>
                    <button
                        type="button"
                        onClick={() => setIsEmailModalOpen(true)}
                        className="w-7 h-7 flex items-center justify-center bg-white/10 hover:bg-white/20 text-white rounded-md backdrop-blur-md transition-colors border border-white/15 cursor-pointer shadow-2xs"
                        title="Send via Email"
                    >
                        <Mail size={13} />
                    </button>
                    <button
                        type="button"
                        onClick={onManageProperty}
                        className="h-7 px-3 bg-white hover:bg-blue-50 text-blue-600 rounded-md font-bold text-xs flex items-center gap-1.5 shadow-2xs transition-all cursor-pointer active:scale-[0.98]"
                    >
                        <Edit2 size={12} />
                        <span>Manage Property</span>
                    </button>
                </div>

                <div className="p-4 sm:p-4.5 flex items-center gap-3.5 relative">
                    <div className="w-13 h-13 sm:w-14 sm:h-14 rounded-xl bg-white shadow-xs p-1 flex-shrink-0 z-10 flex items-center justify-center">
                        {property.logo && !property.logo.includes('placehold.co') ? (
                            <img
                                src={property.logo}
                                alt={property.name}
                                className="w-full h-full rounded-lg object-cover bg-gray-50 border border-gray-100"
                            />
                        ) : (
                            <div className="w-full h-full rounded-lg bg-blue-50 text-blue-700 font-bold text-sm flex items-center justify-center">
                                {property.name?.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase() || 'GH'}
                            </div>
                        )}
                    </div>
                    <div className="z-10 text-white min-w-0 pr-32 sm:pr-44">
                        <h2 className="text-base sm:text-lg font-bold tracking-tight leading-tight truncate">{property.name}</h2>
                        <div className="flex flex-wrap items-center gap-3 text-blue-100 text-[11px] font-medium mt-0.5 opacity-90">
                            <span className="flex items-center gap-1"><MapPin size={11} /> {property.city}, {property.country}</span>
                            <span className="flex items-center gap-1"><Globe size={11} /> {property.website}</span>
                        </div>
                    </div>
                    {/* Background Decorative Circles */}
                    <div className="absolute top-0 right-0 p-20 bg-blue-500 rounded-full blur-2xl opacity-15 pointer-events-none transform translate-x-6 -translate-y-6"></div>
                </div>

                {/* Tabs Bar */}
                <div className="bg-white px-3.5 flex gap-5 overflow-x-auto border-b border-gray-100 no-scrollbar">
                    {tabs.map(tab => (
                        <button
                            key={tab.id}
                            type="button"
                            onClick={() => setActiveTab(tab.id)}
                            className={`py-2 text-xs font-semibold flex items-center gap-1.5 border-b-2 transition-all whitespace-nowrap cursor-pointer ${activeTab === tab.id
                                ? 'border-blue-600 text-blue-600'
                                : 'border-transparent text-gray-500 hover:text-gray-800'
                                }`}
                        >
                            <tab.icon size={13} strokeWidth={2.2} />
                            <span>{tab.label}</span>
                        </button>
                    ))}
                </div>
            </div>

            {/* Main Content Area */}
            <div className="bg-white rounded-xl shadow-2xs border border-gray-200/90 p-3.5 sm:p-4.5">
                {activeTab === 'overview' && (
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
                        {/* Left Column: Details */}
                        <div className="space-y-4">
                            <div>
                                <h3 className="text-[11px] font-bold text-gray-900 uppercase tracking-wider mb-2.5">Business Details</h3>
                                <div className="space-y-2">
                                    <div className="flex justify-between py-1 border-b border-gray-100 text-xs">
                                        <span className="text-gray-500">Address</span>
                                        <span className="font-semibold text-gray-900 text-right">{property.address}</span>
                                    </div>
                                    <div className="flex justify-between py-1 border-b border-gray-100 text-xs">
                                        <span className="text-gray-500">Website</span>
                                        <a href={`https://${property.website}`} target="_blank" rel="noreferrer" className="font-semibold text-blue-600 hover:underline">{property.website}</a>
                                    </div>
                                </div>
                            </div>

                            <div>
                                <h3 className="text-[11px] font-bold text-gray-900 uppercase tracking-wider mb-2.5">Corporate Office</h3>
                                <div className="bg-slate-50/80 rounded-lg p-3 space-y-2 border border-slate-100 text-xs">
                                    <div className="flex items-center gap-2">
                                        <MapPin size={13} className="text-gray-400 flex-shrink-0" />
                                        <span className="text-gray-700 font-medium">{property.corporate?.address || 'N/A'}</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <Globe size={13} className="text-gray-400 flex-shrink-0" />
                                        <span className="text-gray-700 font-medium">{property.corporate?.email || 'N/A'}</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <CreditCard size={13} className="text-gray-400 flex-shrink-0" />
                                        <span className="text-gray-700 font-medium">{property.corporate?.phone || 'N/A'}</span>
                                    </div>
                                </div>
                            </div>

                            {/* Session Info Block */}
                            <div>
                                <h3 className="text-[11px] font-bold text-gray-900 uppercase tracking-wider mb-2.5">Current Session</h3>
                                <div className="flex items-center gap-3 p-2.5 rounded-lg bg-blue-50/70 border border-blue-100/80">
                                    <div className="w-9 h-9 rounded-full bg-blue-200 text-blue-800 flex items-center justify-center font-bold text-xs flex-shrink-0">
                                        {currentUser?.name?.charAt(0) || 'U'}
                                    </div>
                                    <div className="min-w-0">
                                        <p className="text-[9.5px] text-blue-600 uppercase font-bold tracking-wider leading-none">Logged In As</p>
                                        <p className="font-bold text-gray-900 text-xs leading-tight mt-0.5 truncate">{currentUser?.name || 'Unknown User'}</p>
                                        <p className="text-[11px] text-gray-500 leading-none">{currentUser?.role || 'Guest'}</p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Right Column: Stats */}
                        <div className="space-y-4">
                            <h3 className="text-[11px] font-bold text-gray-900 uppercase tracking-wider">Property Metrics</h3>
                            <div className="grid grid-cols-2 gap-3">
                                <div className="p-3.5 rounded-xl border border-gray-100 shadow-2xs bg-slate-50/40">
                                    <p className="text-gray-500 text-[10.5px] font-semibold uppercase tracking-wider">Total Rooms</p>
                                    <p className="text-2xl font-bold text-gray-900 mt-1">{property.rooms}</p>
                                    <p className="text-[10px] text-gray-400 mt-0.5">Physical Inventory Units</p>
                                </div>
                                <div className="p-3.5 rounded-xl border border-gray-100 shadow-2xs bg-slate-50/40">
                                    <p className="text-gray-500 text-[10.5px] font-semibold uppercase tracking-wider">Property Grade</p>
                                    <p className="text-2xl font-bold text-amber-500 mt-1 flex items-center gap-1.5">
                                        <Star size={20} fill="currentColor" />
                                        <span>{property.grade}</span>
                                    </p>
                                    <p className="text-[10px] text-gray-400 mt-0.5">Hospitality Classification</p>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {activeTab === 'operations' && (
                    <div className="space-y-4">
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                            <div className="p-3 rounded-lg bg-blue-50/60 border border-blue-100/80 space-y-1">
                                <div className="flex items-center gap-1.5 text-blue-700 font-bold text-xs uppercase tracking-wide">
                                    <Clock size={13} />
                                    <span>Check-in</span>
                                </div>
                                <p className="text-xl font-bold text-gray-900 font-mono">{property.operations?.checkIn || '14:00'}</p>
                            </div>
                            <div className="p-3 rounded-lg bg-orange-50/60 border border-orange-100/80 space-y-1">
                                <div className="flex items-center gap-1.5 text-orange-700 font-bold text-xs uppercase tracking-wide">
                                    <Clock size={13} />
                                    <span>Check-out</span>
                                </div>
                                <p className="text-xl font-bold text-gray-900 font-mono">{property.operations?.checkOut || '12:00'}</p>
                            </div>
                            <div className="p-3 rounded-lg bg-purple-50/60 border border-purple-100/80 space-y-1">
                                <div className="flex items-center gap-1.5 text-purple-700 font-bold text-xs uppercase tracking-wide">
                                    <Moon size={13} />
                                    <span>Night Audit</span>
                                </div>
                                <p className="text-xl font-bold text-gray-900 font-mono">{property.operations?.nightAudit || '02:00'}</p>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                            <div className="space-y-2.5">
                                <h3 className="text-[11px] font-bold text-gray-900 uppercase tracking-wider border-b border-gray-100 pb-1.5">Policies</h3>
                                <dl className="space-y-2 text-xs">
                                    <div>
                                        <dt className="text-[11px] text-gray-500 mb-0.5">Cancellation Policy</dt>
                                        <dd className="font-semibold text-gray-900 bg-gray-50 px-2.5 py-1 rounded-md inline-block">{property.operations?.cancellation || 'Flexible'}</dd>
                                    </div>
                                    <div>
                                        <dt className="text-[11px] text-gray-500 mb-1">Weekend Days</dt>
                                        <dd className="flex flex-wrap gap-1.5">
                                            {property.operations?.weekends?.map((day: string) => (
                                                <span key={day} className="px-2 py-0.5 bg-gray-100 text-[10px] rounded font-bold text-gray-600 uppercase">{day}</span>
                                            )) || <span className="text-gray-400 text-xs">None set</span>}
                                        </dd>
                                    </div>
                                </dl>
                            </div>
                            <div className="space-y-2.5">
                                <h3 className="text-[11px] font-bold text-gray-900 uppercase tracking-wider border-b border-gray-100 pb-1.5">House Rules</h3>
                                <dl className="space-y-2 text-xs">
                                    <div>
                                        <dt className="text-[11px] text-gray-500 mb-0.5">Smoking Policy</dt>
                                        <dd className="font-semibold text-gray-900">{property.operations?.smoking || 'N/A'}</dd>
                                    </div>
                                </dl>
                            </div>
                        </div>
                    </div>
                )}

                {activeTab === 'policies' && (
                    <div className="space-y-3.5 animate-in fade-in duration-200">
                        <div className="flex items-center justify-between pb-2.5 border-b border-gray-100">
                            <div>
                                <h3 className="text-sm font-bold text-gray-900 tracking-tight">Reservation Rules & Policies</h3>
                                <p className="text-[11px] text-gray-500">Standard operating procedures for guest stays and financial protection.</p>
                            </div>
                            <div className="px-2.5 py-0.5 bg-blue-50 text-blue-600 rounded-full text-[9.5px] font-bold uppercase tracking-wider border border-blue-100">
                                Policy Engine v2.4
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                            {/* Cancellation & No-Show */}
                            <div className="p-3.5 rounded-xl border border-gray-100 bg-slate-50/30 shadow-2xs space-y-2.5">
                                <div className="flex items-center gap-2 text-rose-600">
                                    <div className="p-1 rounded-md bg-rose-50 text-rose-600"><Clock size={13} /></div>
                                    <h4 className="font-bold text-xs uppercase tracking-wider">Cancellation & No-Show</h4>
                                </div>
                                <div className="space-y-2 text-xs">
                                    <div>
                                        <label className="text-[9.5px] font-bold text-gray-400 uppercase tracking-wider">Cancellation Policy</label>
                                        <p className="font-semibold text-gray-900">{property.policies?.cancellation || 'Flexible: Free cancellation up to 48h before arrival'}</p>
                                    </div>
                                    <div>
                                        <label className="text-[9.5px] font-bold text-gray-400 uppercase tracking-wider">Grace Period</label>
                                        <p className="font-semibold text-gray-900">{property.policies?.gracePeriod || '4 Hours from booking time'}</p>
                                    </div>
                                    <div>
                                        <label className="text-[9.5px] font-bold text-gray-400 uppercase tracking-wider">No-Show Penalty</label>
                                        <p className="font-bold text-rose-600">{property.policies?.noShow || '100% of First Night Revenue'}</p>
                                    </div>
                                </div>
                            </div>

                            {/* Payment & Deposits */}
                            <div className="p-3.5 rounded-xl border border-gray-100 bg-slate-50/30 shadow-2xs space-y-2.5">
                                <div className="flex items-center gap-2 text-blue-600">
                                    <div className="p-1 rounded-md bg-blue-50 text-blue-600"><CreditCard size={13} /></div>
                                    <h4 className="font-bold text-xs uppercase tracking-wider">Payments & Deposits</h4>
                                </div>
                                <div className="space-y-2 text-xs">
                                    <div>
                                        <label className="text-[9.5px] font-bold text-gray-400 uppercase tracking-wider">Rate Plan Payment</label>
                                        <p className="font-semibold text-gray-900">{property.policies?.ratePayment || 'Advance Purchase: Full Prepayment Required'}</p>
                                    </div>
                                    <div>
                                        <label className="text-[9.5px] font-bold text-gray-400 uppercase tracking-wider">Security Deposit</label>
                                        <p className="font-semibold text-gray-900">{property.policies?.securityDeposit || '৳ 5,000 per stay (Refundable)'}</p>
                                    </div>
                                </div>
                            </div>

                            {/* Check-in & Departure */}
                            <div className="p-3.5 rounded-xl border border-gray-100 bg-slate-50/30 shadow-2xs space-y-2.5">
                                <div className="flex items-center gap-2 text-emerald-600">
                                    <div className="p-1 rounded-md bg-emerald-50 text-emerald-600"><Moon size={13} /></div>
                                    <h4 className="font-bold text-xs uppercase tracking-wider">Arrival & Departure</h4>
                                </div>
                                <div className="space-y-2 text-xs">
                                    <div>
                                        <label className="text-[9.5px] font-bold text-gray-400 uppercase tracking-wider">Early Check-in</label>
                                        <p className="font-semibold text-gray-900">{property.policies?.earlyCheckin || 'Subject to availability (৳ 1,500 before 10 AM)'}</p>
                                    </div>
                                    <div>
                                        <label className="text-[9.5px] font-bold text-gray-400 uppercase tracking-wider">Early Departure</label>
                                        <p className="font-semibold text-gray-900">{property.policies?.earlyDeparture || 'Full amount of the stay will be charged'}</p>
                                    </div>
                                </div>
                            </div>

                            {/* Guest & Age Policy */}
                            <div className="p-3.5 rounded-xl border border-gray-100 bg-slate-50/30 shadow-2xs space-y-2.5">
                                <div className="flex items-center gap-2 text-purple-600">
                                    <div className="p-1 rounded-md bg-purple-50 text-purple-600"><User size={13} /></div>
                                    <h4 className="font-bold text-xs uppercase tracking-wider">Guest & Age Policy</h4>
                                </div>
                                <div className="space-y-2 text-xs">
                                    <div>
                                        <label className="text-[9.5px] font-bold text-gray-400 uppercase tracking-wider">Minimum Age</label>
                                        <p className="font-semibold text-gray-900">{property.policies?.agePolicy || 'Primary guest must be 18+ years old'}</p>
                                    </div>
                                    <div>
                                        <label className="text-[9.5px] font-bold text-gray-400 uppercase tracking-wider">Child Policy</label>
                                        <p className="font-semibold text-gray-900">{property.policies?.childPolicy || 'Up to 2 children under 5 stay free'}</p>
                                    </div>
                                </div>
                            </div>

                            {/* Group Bookings */}
                            <div className="p-3.5 rounded-xl border border-gray-100 bg-slate-50/30 shadow-2xs space-y-2.5">
                                <div className="flex items-center gap-2 text-amber-600">
                                    <div className="p-1 rounded-md bg-amber-50 text-amber-600"><Building2 size={13} /></div>
                                    <h4 className="font-bold text-xs uppercase tracking-wider">Group Bookings</h4>
                                </div>
                                <div className="space-y-2 text-xs">
                                    <div>
                                        <label className="text-[9.5px] font-bold text-gray-400 uppercase tracking-wider">Definition</label>
                                        <p className="font-semibold text-gray-900">{property.policies?.groupDefinition || '5 or more rooms per night'}</p>
                                    </div>
                                    <div>
                                        <label className="text-[9.5px] font-bold text-gray-400 uppercase tracking-wider">Deposit Strategy</label>
                                        <p className="font-semibold text-gray-900">{property.policies?.groupDeposit || '50% non-refundable deposit'}</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {activeTab === 'finance' && (
                    <div className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            <div className="p-3.5 border border-gray-100 rounded-xl bg-slate-50/50 space-y-1">
                                <h3 className="text-[10.5px] font-bold text-gray-500 uppercase tracking-wider">Tax Configuration</h3>
                                <div className="flex items-center gap-3">
                                    <p className="text-base font-bold text-gray-900">{property.finance?.taxRule || 'Not Configured'}</p>
                                    <span className="text-[11px] font-semibold text-gray-600 bg-white px-2 py-0.5 rounded border border-gray-200">BIN: {property.finance?.binNo || 'N/A'}</span>
                                </div>
                            </div>

                            <div>
                                <h3 className="text-[10.5px] font-bold text-gray-500 uppercase tracking-wider mb-1.5">Linked Bank Accounts</h3>
                                <div className="space-y-2">
                                    {property.finance?.bankAccounts?.map((acc: any) => (
                                        <div key={acc.id} className="p-2.5 border border-gray-200/80 rounded-lg flex justify-between items-center bg-white shadow-2xs">
                                            <div>
                                                <p className="font-bold text-gray-900 text-xs">{acc.bankName}</p>
                                                <p className="text-[11px] text-gray-500 font-mono">{acc.accountNum}</p>
                                            </div>
                                            <div className="text-right bg-slate-50 px-2 py-1 rounded">
                                                <p className="text-[9.5px] text-gray-400 uppercase font-bold">SWIFT</p>
                                                <p className="font-bold text-gray-700 font-mono text-xs">{acc.swift}</p>
                                            </div>
                                        </div>
                                    )) || <p className="text-gray-400 text-xs italic">No bank accounts linked.</p>}
                                </div>
                            </div>
                        </div>

                        {/* Payment Transaction History */}
                        <div className="pt-2">
                            <h3 className="text-xs font-bold text-gray-900 mb-2 flex items-center gap-1.5">
                                <CreditCard size={14} className="text-blue-600" />
                                <span>Recent Transaction History</span>
                            </h3>
                            <div className="border border-gray-200/80 rounded-xl overflow-hidden bg-white shadow-2xs">
                                <table className="w-full text-xs text-left">
                                    <thead className="bg-slate-50/90 border-b border-gray-200/80 text-[10.5px] text-slate-500 font-bold uppercase tracking-wider">
                                        <tr>
                                            <th className="px-3.5 py-2">Transaction ID</th>
                                            <th className="px-3.5 py-2">Date</th>
                                            <th className="px-3.5 py-2">Description</th>
                                            <th className="px-3.5 py-2 text-right">Amount</th>
                                            <th className="px-3.5 py-2 text-center">Status</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100">
                                        {transactions.map(txn => (
                                            <tr key={txn.id} className="hover:bg-blue-50/30 transition-colors">
                                                <td className="px-3.5 py-2 font-mono text-gray-500 text-[11px]">{txn.id}</td>
                                                <td className="px-3.5 py-2 text-gray-900 text-[11px]">{txn.date}</td>
                                                <td className="px-3.5 py-2 text-gray-900 font-medium text-xs">{txn.desc}</td>
                                                <td className={`px-3.5 py-2 text-right font-bold text-xs ${txn.type === 'credit' ? 'text-emerald-600' : 'text-gray-900'}`}>
                                                    {txn.type === 'credit' ? '+' : ''}{txn.amount.toFixed(2)}
                                                </td>
                                                <td className="px-3.5 py-2 text-center">
                                                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold ${txn.status === 'Completed' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200/60' : 'bg-amber-50 text-amber-700 border border-amber-200/60'
                                                        }`}>
                                                        {txn.status}
                                                    </span>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                )}

                {activeTab === 'automation' && (
                    <div className="space-y-4">
                        <div className="bg-slate-900 text-white p-4 sm:p-5 rounded-xl shadow-xs relative overflow-hidden">
                            <div className="flex justify-between items-start relative z-10">
                                <div>
                                    <h3 className="text-sm sm:text-base font-bold flex items-center gap-2">
                                        <Monitor size={16} className="text-blue-400" />
                                        <span>Night Audit Automation</span>
                                    </h3>
                                    <p className="text-gray-400 text-xs mt-1 max-w-md">Configuration for automated nightly system tasks and reporting.</p>
                                </div>
                                <div className={`px-2.5 py-0.5 rounded-full text-[10.5px] font-bold border ${property.automation?.autoRun ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-300' : 'bg-rose-500/20 border-rose-500/50 text-rose-300'}`}>
                                    {property.automation?.autoRun ? 'ACTIVE' : 'INACTIVE'}
                                </div>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 mt-4 relative z-10">
                                <div className="bg-white/10 p-2.5 rounded-lg backdrop-blur-md border border-white/10">
                                    <p className="text-[10px] text-gray-400 uppercase tracking-wider font-bold">Audit Time</p>
                                    <p className="text-lg font-mono font-bold mt-1 text-white">{property.automation?.auditTime || '02:00 AM'}</p>
                                </div>
                                <div className="bg-white/10 p-2.5 rounded-lg backdrop-blur-md border border-white/10">
                                    <p className="text-[10px] text-gray-400 uppercase tracking-wider font-bold">Auto Post Rent</p>
                                    <p className={`text-sm font-bold mt-1 ${property.automation?.autoPostRent ? 'text-emerald-400' : 'text-gray-400'}`}>
                                        {property.automation?.autoPostRent ? 'Enabled' : 'Disabled'}
                                    </p>
                                </div>
                                <div className="bg-white/10 p-2.5 rounded-lg backdrop-blur-md border border-white/10">
                                    <p className="text-[10px] text-gray-400 uppercase tracking-wider font-bold">Auto Backup</p>
                                    <p className="text-sm font-bold mt-1 text-emerald-400">Enabled</p>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {activeTab === 'team' && (
                    <div className="space-y-3">
                        <h3 className="text-[11px] font-bold text-gray-900 uppercase tracking-wider border-b border-gray-100 pb-2">Key Contacts</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            {property.pocs?.map((poc: any) => (
                                <div key={poc.id} className="p-3 border border-gray-200/80 rounded-lg flex items-center gap-3 hover:border-blue-300 transition-colors bg-white shadow-2xs">
                                    <div className="w-9 h-9 rounded-full bg-blue-50 flex items-center justify-center text-blue-600 font-bold text-xs shrink-0">
                                        {poc.name.charAt(0)}
                                    </div>
                                    <div className="min-w-0">
                                        <p className="font-bold text-gray-900 text-xs truncate">{poc.name}</p>
                                        <p className="text-blue-600 text-[10px] font-bold uppercase tracking-wide">{poc.role}</p>
                                        <div className="flex flex-wrap items-center gap-3 text-[11px] text-gray-500 mt-1">
                                            <span className="flex items-center gap-1"><User size={11} className="text-gray-400" /> {poc.phone}</span>
                                            <span className="flex items-center gap-1"><Globe size={11} className="text-gray-400" /> {poc.email}</span>
                                        </div>
                                    </div>
                                </div>
                            )) || <p className="text-gray-400 text-xs italic">No contacts listed.</p>}
                        </div>
                    </div>
                )}
            </div>

            <SendEmailModal isOpen={isEmailModalOpen} onClose={() => setIsEmailModalOpen(false)} defaultSubject={`Inquiry regarding ${property.name}`} />
        </div>
    );
};

export default HotelInfoView;
