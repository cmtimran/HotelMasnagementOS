import { useState } from 'react';
import {
    Building2, MapPin, Globe, CreditCard, Star, Clock, Moon, Monitor,
    User, Edit2, Copy, Mail, ShieldCheck, Phone, CheckCircle2, AlertCircle,
    Layers, Check
} from 'lucide-react';
import SendEmailModal from './SendEmailModal';

interface HotelInfoViewProps {
    property: any;
    currentUser: any;
    onManageProperty: () => void;
}

const HotelInfoView = ({ property, currentUser, onManageProperty }: HotelInfoViewProps) => {
    const [activeTab, setActiveTab] = useState('overview');
    const [isEmailModalOpen, setIsEmailModalOpen] = useState(false);
    const [copied, setCopied] = useState(false);

    const tabs = [
        { id: 'overview', label: 'Overview', icon: Building2 },
        { id: 'operations', label: 'Operations', icon: Clock },
        { id: 'policies', label: 'Policies', icon: ShieldCheck },
        { id: 'finance', label: 'Finance', icon: CreditCard },
        { id: 'automation', label: 'Automation', icon: Monitor },
        { id: 'team', label: 'Team', icon: User },
    ];

    const handleCopyInfo = () => {
        const text = `Property: ${property.name}\nAddress: ${property.address}, ${property.city}, ${property.country}\nContact: ${property.phone || 'N/A'} | ${property.email || 'N/A'}\nWebsite: ${property.website || 'N/A'}`;
        navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    // Mock Transaction Data
    const transactions = [
        { id: 'TXN-001', date: '2026-10-15', desc: 'Monthly SaaS Enterprise Plan', amount: -299.00, type: 'debit', status: 'Completed' },
        { id: 'TXN-002', date: '2026-10-14', desc: 'Booking Commission Settlement', amount: 1250.50, type: 'credit', status: 'Completed' },
        { id: 'TXN-003', date: '2026-10-10', desc: 'SMS Gateway Credits Top-up', amount: -50.00, type: 'debit', status: 'Completed' },
        { id: 'TXN-004', date: '2026-09-28', desc: 'Channel Manager Sync Fee', amount: -120.00, type: 'debit', status: 'Pending' },
    ];

    return (
        <div className="p-3 sm:p-4 max-w-7xl mx-auto space-y-3 font-sans text-gray-800">
            {/* Consistent Property Header Card */}
            <div className="bg-white rounded-xl border border-gray-200/90 shadow-2xs overflow-hidden">
                <div className="p-3.5 sm:p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-gray-100">
                    <div className="flex items-center gap-3">
                        <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-xl bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-100/80 flex items-center justify-center text-blue-700 font-bold text-sm shadow-2xs flex-shrink-0 overflow-hidden">
                            {property.logo && !property.logo.includes('placehold.co') ? (
                                <img
                                    src={property.logo}
                                    alt={property.name}
                                    className="w-full h-full object-cover"
                                />
                            ) : (
                                <span>{property.name?.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase() || 'GH'}</span>
                            )}
                        </div>
                        <div className="min-w-0">
                            <div className="flex items-center gap-2">
                                <h1 className="text-base sm:text-lg font-bold text-gray-900 tracking-tight leading-tight truncate">
                                    {property.name}
                                </h1>
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200/60 flex-shrink-0">
                                    <Star size={10} fill="currentColor" />
                                    <span>{property.grade || '5 Star'}</span>
                                </span>
                            </div>
                            <div className="flex flex-wrap items-center gap-3 text-[11px] text-gray-500 mt-1 font-medium">
                                <span className="flex items-center gap-1">
                                    <MapPin size={11} className="text-gray-400" />
                                    <span>{property.city}, {property.country}</span>
                                </span>
                                <span className="flex items-center gap-1">
                                    <Globe size={11} className="text-gray-400" />
                                    <a href={`https://${property.website}`} target="_blank" rel="noreferrer" className="text-blue-600 hover:underline">
                                        {property.website}
                                    </a>
                                </span>
                                {property.phone && (
                                    <span className="hidden md:flex items-center gap-1">
                                        <Phone size={11} className="text-gray-400" />
                                        <span>{property.phone}</span>
                                    </span>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Header Action Buttons */}
                    <div className="flex items-center gap-1.5 self-start sm:self-auto flex-shrink-0">
                        <button
                            type="button"
                            onClick={handleCopyInfo}
                            className="h-7 px-2.5 bg-white hover:bg-gray-50 border border-gray-200 text-gray-700 rounded-lg text-xs font-medium flex items-center gap-1.5 shadow-2xs transition-colors cursor-pointer"
                            title="Copy Hotel Information"
                        >
                            {copied ? <Check size={12} className="text-emerald-600" /> : <Copy size={12} className="text-gray-400" />}
                            <span>{copied ? 'Copied' : 'Copy'}</span>
                        </button>
                        <button
                            type="button"
                            onClick={() => setIsEmailModalOpen(true)}
                            className="h-7 px-2.5 bg-white hover:bg-gray-50 border border-gray-200 text-gray-700 rounded-lg text-xs font-medium flex items-center gap-1.5 shadow-2xs transition-colors cursor-pointer"
                            title="Send Details via Email"
                        >
                            <Mail size={12} className="text-gray-400" />
                            <span>Email</span>
                        </button>
                        <button
                            type="button"
                            onClick={onManageProperty}
                            className="h-7 px-3 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white rounded-lg font-semibold text-xs flex items-center gap-1.5 shadow-2xs hover:shadow-xs transition-all cursor-pointer active:scale-[0.98]"
                        >
                            <Edit2 size={11} />
                            <span>Manage Property</span>
                        </button>
                    </div>
                </div>

                {/* Unified Tab Bar Navigation */}
                <div className="px-3.5 flex items-center gap-2 overflow-x-auto no-scrollbar bg-slate-50/60 py-1.5">
                    {tabs.map(tab => {
                        const Icon = tab.icon;
                        const isSelected = activeTab === tab.id;
                        return (
                            <button
                                key={tab.id}
                                type="button"
                                onClick={() => setActiveTab(tab.id)}
                                className={`
                                    h-7 px-3 rounded-md text-xs font-medium flex items-center gap-1.5 transition-all whitespace-nowrap cursor-pointer select-none
                                    ${isSelected
                                        ? 'bg-white text-blue-600 font-semibold shadow-2xs border border-gray-200/80'
                                        : 'text-gray-600 hover:text-gray-900 hover:bg-gray-200/60'}
                                `}
                            >
                                <Icon size={13} className={isSelected ? 'text-blue-600' : 'text-gray-400'} />
                                <span>{tab.label}</span>
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* Consistent Main Content Container */}
            <div className="bg-white rounded-xl shadow-2xs border border-gray-200/90 p-3.5 sm:p-4">
                {/* 1. OVERVIEW TAB */}
                {activeTab === 'overview' && (
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                        {/* Left Column: Business & Corporate Info */}
                        <div className="space-y-3.5">
                            <div className="bg-slate-50/50 rounded-lg p-3 border border-slate-100">
                                <div className="flex items-center gap-2 pb-2 mb-2 border-b border-slate-200/60">
                                    <div className="w-5 h-5 rounded bg-blue-50 text-blue-600 flex items-center justify-center">
                                        <Building2 size={12} />
                                    </div>
                                    <span className="text-xs font-bold text-gray-900 uppercase tracking-wider">Business Details</span>
                                </div>
                                <div className="space-y-1.5">
                                    <div className="flex items-center justify-between py-1 border-b border-gray-100 text-xs">
                                        <span className="text-gray-500 font-medium">Physical Address</span>
                                        <span className="font-semibold text-gray-900 text-right">{property.address}</span>
                                    </div>
                                    <div className="flex items-center justify-between py-1 border-b border-gray-100 text-xs">
                                        <span className="text-gray-500 font-medium">City & Country</span>
                                        <span className="font-semibold text-gray-900">{property.city}, {property.country}</span>
                                    </div>
                                    <div className="flex items-center justify-between py-1 border-b border-gray-100 text-xs">
                                        <span className="text-gray-500 font-medium">Official Website</span>
                                        <a href={`https://${property.website}`} target="_blank" rel="noreferrer" className="font-semibold text-blue-600 hover:underline">
                                            {property.website}
                                        </a>
                                    </div>
                                    <div className="flex items-center justify-between py-1 text-xs">
                                        <span className="text-gray-500 font-medium">Operating Currency</span>
                                        <span className="font-semibold text-gray-900">{property.currency || 'USD ($)'}</span>
                                    </div>
                                </div>
                            </div>

                            <div className="bg-slate-50/50 rounded-lg p-3 border border-slate-100">
                                <div className="flex items-center gap-2 pb-2 mb-2 border-b border-slate-200/60">
                                    <div className="w-5 h-5 rounded bg-blue-50 text-blue-600 flex items-center justify-center">
                                        <Globe size={12} />
                                    </div>
                                    <span className="text-xs font-bold text-gray-900 uppercase tracking-wider">Corporate Headquarters</span>
                                </div>
                                <div className="space-y-1.5 text-xs">
                                    <div className="flex items-center gap-2 py-1 border-b border-gray-100 text-gray-700">
                                        <MapPin size={12} className="text-gray-400 flex-shrink-0" />
                                        <span className="font-medium truncate">{property.corporate?.address || '100 Hospitality Blvd, Suite 400, Miami, USA'}</span>
                                    </div>
                                    <div className="flex items-center gap-2 py-1 border-b border-gray-100 text-gray-700">
                                        <Mail size={12} className="text-gray-400 flex-shrink-0" />
                                        <span className="font-medium truncate">{property.corporate?.email || 'corporate@grandhotel.com'}</span>
                                    </div>
                                    <div className="flex items-center gap-2 py-1 text-gray-700">
                                        <Phone size={12} className="text-gray-400 flex-shrink-0" />
                                        <span className="font-medium">{property.corporate?.phone || '+1 (305) 555-0100'}</span>
                                    </div>
                                </div>
                            </div>

                            {/* Active User Session Block */}
                            <div className="bg-blue-50/60 rounded-lg p-3 border border-blue-100 flex items-center justify-between">
                                <div className="flex items-center gap-2.5">
                                    <div className="w-8 h-8 rounded-full bg-blue-200 text-blue-800 flex items-center justify-center font-bold text-xs flex-shrink-0">
                                        {currentUser?.name?.charAt(0) || 'U'}
                                    </div>
                                    <div>
                                        <p className="text-[9.5px] text-blue-600 uppercase font-bold tracking-wider leading-none">Active Session</p>
                                        <p className="font-bold text-gray-900 text-xs mt-0.5 leading-tight">{currentUser?.name || 'John Smith'}</p>
                                        <p className="text-[10.5px] text-gray-500 leading-none">{currentUser?.role || 'Administrator'}</p>
                                    </div>
                                </div>
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-white text-emerald-700 rounded-md text-[10px] font-semibold border border-emerald-200/60 shadow-2xs">
                                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                                    Active Token
                                </span>
                            </div>
                        </div>

                        {/* Right Column: Key Stats & Features */}
                        <div className="space-y-3.5">
                            <div className="grid grid-cols-2 gap-3">
                                <div className="bg-slate-50/60 p-3 rounded-lg border border-slate-200/70">
                                    <div className="flex items-center justify-between text-blue-600 mb-1">
                                        <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Total Inventory</span>
                                        <Layers size={13} />
                                    </div>
                                    <p className="text-xl font-bold text-gray-900 leading-tight">{property.rooms} Rooms</p>
                                    <p className="text-[10px] text-gray-400 mt-0.5">Physical Operating Units</p>
                                </div>

                                <div className="bg-slate-50/60 p-3 rounded-lg border border-slate-200/70">
                                    <div className="flex items-center justify-between text-amber-500 mb-1">
                                        <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Classification</span>
                                        <Star size={13} fill="currentColor" />
                                    </div>
                                    <p className="text-xl font-bold text-gray-900 leading-tight">{property.grade}</p>
                                    <p className="text-[10px] text-gray-400 mt-0.5">Hospitality Star Rating</p>
                                </div>
                            </div>

                            {/* Property Description */}
                            <div className="bg-slate-50/50 rounded-lg p-3 border border-slate-100">
                                <div className="flex items-center gap-2 pb-2 mb-2 border-b border-slate-200/60">
                                    <div className="w-5 h-5 rounded bg-blue-50 text-blue-600 flex items-center justify-center">
                                        <Building2 size={12} />
                                    </div>
                                    <span className="text-xs font-bold text-gray-900 uppercase tracking-wider">Property Description</span>
                                </div>
                                <p className="text-xs text-gray-600 leading-relaxed">
                                    {property.description || 'Modern luxury hospitality establishment delivering world-class guest accommodation, fine dining, and automated guest operations.'}
                                </p>
                            </div>

                            {/* Amenities / Features */}
                            <div className="bg-slate-50/50 rounded-lg p-3 border border-slate-100">
                                <div className="flex items-center gap-2 pb-2 mb-2 border-b border-slate-200/60">
                                    <div className="w-5 h-5 rounded bg-blue-50 text-blue-600 flex items-center justify-center">
                                        <CheckCircle2 size={12} />
                                    </div>
                                    <span className="text-xs font-bold text-gray-900 uppercase tracking-wider">Property Amenities</span>
                                </div>
                                <div className="flex flex-wrap gap-1.5">
                                    {(property.features || ['Beach Access', 'Spa', 'Pool', 'Fine Dining', 'Fitness Center']).map((feat: string) => (
                                        <span key={feat} className="px-2 py-0.5 bg-white border border-gray-200 rounded text-[11px] font-medium text-gray-700 shadow-2xs">
                                            {feat}
                                        </span>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* 2. OPERATIONS TAB */}
                {activeTab === 'operations' && (
                    <div className="space-y-3.5">
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                            <div className="bg-slate-50/60 p-3 rounded-lg border border-slate-200/70">
                                <div className="flex items-center justify-between text-blue-600 mb-1">
                                    <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Standard Check-In</span>
                                    <Clock size={13} />
                                </div>
                                <p className="text-xl font-bold text-gray-900 font-mono leading-tight">{property.operations?.checkIn || '14:00'}</p>
                                <p className="text-[10px] text-gray-400 mt-0.5">Official Guest Arrival Time</p>
                            </div>

                            <div className="bg-slate-50/60 p-3 rounded-lg border border-slate-200/70">
                                <div className="flex items-center justify-between text-amber-600 mb-1">
                                    <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Standard Check-Out</span>
                                    <Clock size={13} />
                                </div>
                                <p className="text-xl font-bold text-gray-900 font-mono leading-tight">{property.operations?.checkOut || '12:00'}</p>
                                <p className="text-[10px] text-gray-400 mt-0.5">Folio Settlement Deadline</p>
                            </div>

                            <div className="bg-slate-50/60 p-3 rounded-lg border border-slate-200/70">
                                <div className="flex items-center justify-between text-purple-600 mb-1">
                                    <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Night Audit Rollover</span>
                                    <Moon size={13} />
                                </div>
                                <p className="text-xl font-bold text-gray-900 font-mono leading-tight">{property.operations?.nightAudit || '02:00'}</p>
                                <p className="text-[10px] text-gray-400 mt-0.5">Automated Business Day Rollover</p>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 pt-1">
                            <div className="bg-slate-50/50 rounded-lg p-3 border border-slate-100 space-y-2">
                                <div className="flex items-center gap-2 pb-1.5 border-b border-slate-200/60">
                                    <div className="w-5 h-5 rounded bg-blue-50 text-blue-600 flex items-center justify-center">
                                        <ShieldCheck size={12} />
                                    </div>
                                    <span className="text-xs font-bold text-gray-900 uppercase tracking-wider">Operational Parameters</span>
                                </div>
                                <div className="space-y-1.5 text-xs">
                                    <div className="flex items-center justify-between py-1 border-b border-gray-100">
                                        <span className="text-gray-500 font-medium">Cancellation Terms</span>
                                        <span className="font-semibold text-gray-900">{property.operations?.cancellation || 'Flexible: 48h Prior'}</span>
                                    </div>
                                    <div className="flex items-center justify-between py-1 border-b border-gray-100">
                                        <span className="text-gray-500 font-medium">Designated Weekend Days</span>
                                        <div className="flex gap-1">
                                            {(property.operations?.weekends || ['Friday', 'Saturday']).map((d: string) => (
                                                <span key={d} className="px-1.5 py-0.2 bg-white border border-gray-200 rounded text-[10px] font-semibold text-gray-700">
                                                    {d}
                                                </span>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="bg-slate-50/50 rounded-lg p-3 border border-slate-100 space-y-2">
                                <div className="flex items-center gap-2 pb-1.5 border-b border-slate-200/60">
                                    <div className="w-5 h-5 rounded bg-blue-50 text-blue-600 flex items-center justify-center">
                                        <AlertCircle size={12} />
                                    </div>
                                    <span className="text-xs font-bold text-gray-900 uppercase tracking-wider">House Policies</span>
                                </div>
                                <div className="space-y-1.5 text-xs">
                                    <div className="flex items-center justify-between py-1 border-b border-gray-100">
                                        <span className="text-gray-500 font-medium">Smoking Policy</span>
                                        <span className="font-semibold text-gray-900">{property.operations?.smoking || 'Non-Smoking Throughout'}</span>
                                    </div>
                                    <div className="flex items-center justify-between py-1">
                                        <span className="text-gray-500 font-medium">Pet Policy</span>
                                        <span className="font-semibold text-gray-900">Service Animals Only</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* 3. POLICIES TAB */}
                {activeTab === 'policies' && (
                    <div className="space-y-3.5">
                        <div className="flex items-center justify-between pb-2 border-b border-gray-100">
                            <div className="flex items-center gap-2">
                                <div className="w-5 h-5 rounded bg-blue-50 text-blue-600 flex items-center justify-center">
                                    <ShieldCheck size={12} />
                                </div>
                                <span className="text-xs font-bold text-gray-900 uppercase tracking-wider">Hospitality Rules & Regulatory Policies</span>
                            </div>
                            <span className="px-2 py-0.5 rounded-full text-[9.5px] font-bold bg-blue-50 text-blue-700 border border-blue-200/60">
                                Engine v2.4
                            </span>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                            {/* Cancellation & No-Show */}
                            <div className="bg-slate-50/50 rounded-lg p-3 border border-slate-100 space-y-2">
                                <div className="flex items-center gap-1.5 text-rose-600 pb-1 border-b border-slate-200/60">
                                    <Clock size={12} />
                                    <span className="text-[11px] font-bold uppercase tracking-wider text-gray-900">Cancellation & No-Show</span>
                                </div>
                                <div className="space-y-1.5 text-xs">
                                    <div>
                                        <span className="text-[9.5px] font-bold text-gray-400 uppercase tracking-wider">Cancellation Window</span>
                                        <p className="font-semibold text-gray-900 text-[11.5px]">{property.policies?.cancellation || 'Free cancellation up to 48h prior'}</p>
                                    </div>
                                    <div>
                                        <span className="text-[9.5px] font-bold text-gray-400 uppercase tracking-wider">Grace Period</span>
                                        <p className="font-semibold text-gray-900 text-[11.5px]">{property.policies?.gracePeriod || '4 Hours from booking creation'}</p>
                                    </div>
                                    <div>
                                        <span className="text-[9.5px] font-bold text-gray-400 uppercase tracking-wider">No-Show Penalty</span>
                                        <p className="font-bold text-rose-600 text-[11.5px]">{property.policies?.noShow || '100% of First Night Charge'}</p>
                                    </div>
                                </div>
                            </div>

                            {/* Payment & Deposits */}
                            <div className="bg-slate-50/50 rounded-lg p-3 border border-slate-100 space-y-2">
                                <div className="flex items-center gap-1.5 text-blue-600 pb-1 border-b border-slate-200/60">
                                    <CreditCard size={12} />
                                    <span className="text-[11px] font-bold uppercase tracking-wider text-gray-900">Payments & Deposits</span>
                                </div>
                                <div className="space-y-1.5 text-xs">
                                    <div>
                                        <span className="text-[9.5px] font-bold text-gray-400 uppercase tracking-wider">Rate Plan Payment</span>
                                        <p className="font-semibold text-gray-900 text-[11.5px]">{property.policies?.ratePayment || 'Advance Purchase: Full Prepayment'}</p>
                                    </div>
                                    <div>
                                        <span className="text-[9.5px] font-bold text-gray-400 uppercase tracking-wider">Security Deposit</span>
                                        <p className="font-semibold text-gray-900 text-[11.5px]">{property.policies?.securityDeposit || '৳ 5,000 per stay (Refundable)'}</p>
                                    </div>
                                </div>
                            </div>

                            {/* Check-in & Departure */}
                            <div className="bg-slate-50/50 rounded-lg p-3 border border-slate-100 space-y-2">
                                <div className="flex items-center gap-1.5 text-emerald-600 pb-1 border-b border-slate-200/60">
                                    <Moon size={12} />
                                    <span className="text-[11px] font-bold uppercase tracking-wider text-gray-900">Arrival & Departure</span>
                                </div>
                                <div className="space-y-1.5 text-xs">
                                    <div>
                                        <span className="text-[9.5px] font-bold text-gray-400 uppercase tracking-wider">Early Check-In</span>
                                        <p className="font-semibold text-gray-900 text-[11.5px]">{property.policies?.earlyCheckin || 'Subject to availability (৳ 1,500 fee)'}</p>
                                    </div>
                                    <div>
                                        <span className="text-[9.5px] font-bold text-gray-400 uppercase tracking-wider">Early Departure</span>
                                        <p className="font-semibold text-gray-900 text-[11.5px]">{property.policies?.earlyDeparture || 'Full amount of stay applicable'}</p>
                                    </div>
                                </div>
                            </div>

                            {/* Guest & Age Policy */}
                            <div className="bg-slate-50/50 rounded-lg p-3 border border-slate-100 space-y-2">
                                <div className="flex items-center gap-1.5 text-purple-600 pb-1 border-b border-slate-200/60">
                                    <User size={12} />
                                    <span className="text-[11px] font-bold uppercase tracking-wider text-gray-900">Guest & Age Rules</span>
                                </div>
                                <div className="space-y-1.5 text-xs">
                                    <div>
                                        <span className="text-[9.5px] font-bold text-gray-400 uppercase tracking-wider">Minimum Age</span>
                                        <p className="font-semibold text-gray-900 text-[11.5px]">{property.policies?.agePolicy || 'Primary guest must be 18+ years'}</p>
                                    </div>
                                    <div>
                                        <span className="text-[9.5px] font-bold text-gray-400 uppercase tracking-wider">Child Policy</span>
                                        <p className="font-semibold text-gray-900 text-[11.5px]">{property.policies?.childPolicy || 'Up to 2 children under 5 stay free'}</p>
                                    </div>
                                </div>
                            </div>

                            {/* Group Bookings */}
                            <div className="bg-slate-50/50 rounded-lg p-3 border border-slate-100 space-y-2">
                                <div className="flex items-center gap-1.5 text-amber-600 pb-1 border-b border-slate-200/60">
                                    <Building2 size={12} />
                                    <span className="text-[11px] font-bold uppercase tracking-wider text-gray-900">Group Reservations</span>
                                </div>
                                <div className="space-y-1.5 text-xs">
                                    <div>
                                        <span className="text-[9.5px] font-bold text-gray-400 uppercase tracking-wider">Group Definition</span>
                                        <p className="font-semibold text-gray-900 text-[11.5px]">{property.policies?.groupDefinition || '5 or more rooms per booking'}</p>
                                    </div>
                                    <div>
                                        <span className="text-[9.5px] font-bold text-gray-400 uppercase tracking-wider">Deposit Terms</span>
                                        <p className="font-semibold text-gray-900 text-[11.5px]">{property.policies?.groupDeposit || '50% non-refundable deposit'}</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* 4. FINANCE TAB */}
                {activeTab === 'finance' && (
                    <div className="space-y-3.5">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            <div className="bg-slate-50/50 p-3 rounded-lg border border-slate-100">
                                <div className="flex items-center gap-2 pb-1.5 mb-2 border-b border-slate-200/60">
                                    <div className="w-5 h-5 rounded bg-blue-50 text-blue-600 flex items-center justify-center">
                                        <CreditCard size={12} />
                                    </div>
                                    <span className="text-xs font-bold text-gray-900 uppercase tracking-wider">Tax & Regulatory Rule</span>
                                </div>
                                <div className="flex items-center justify-between text-xs py-1">
                                    <span className="text-gray-500 font-medium">Applied Tax Rule</span>
                                    <span className="font-bold text-gray-900">{property.finance?.taxRule || '15% VAT + 10% Service Charge'}</span>
                                </div>
                                <div className="flex items-center justify-between text-xs py-1 border-t border-gray-100">
                                    <span className="text-gray-500 font-medium">Business Identification (BIN)</span>
                                    <span className="font-mono font-semibold text-gray-700 bg-white px-2 py-0.5 rounded border border-gray-200">
                                        {property.finance?.binNo || 'BIN-9042-8819'}
                                    </span>
                                </div>
                            </div>

                            <div className="bg-slate-50/50 p-3 rounded-lg border border-slate-100">
                                <div className="flex items-center gap-2 pb-1.5 mb-2 border-b border-slate-200/60">
                                    <div className="w-5 h-5 rounded bg-blue-50 text-blue-600 flex items-center justify-center">
                                        <Building2 size={12} />
                                    </div>
                                    <span className="text-xs font-bold text-gray-900 uppercase tracking-wider">Connected Bank Accounts</span>
                                </div>
                                <div className="space-y-1.5">
                                    {(property.finance?.bankAccounts || [
                                        { id: '1', bankName: 'Standard Chartered Bank', accountNum: '01-8849201-01', swift: 'SCBLBDDX' }
                                    ]).map((acc: any) => (
                                        <div key={acc.id} className="p-2 border border-gray-200/80 rounded bg-white flex justify-between items-center text-xs">
                                            <div>
                                                <p className="font-bold text-gray-900 leading-tight">{acc.bankName}</p>
                                                <p className="text-[10.5px] text-gray-500 font-mono">{acc.accountNum}</p>
                                            </div>
                                            <span className="font-mono text-[10.5px] font-bold text-gray-600 bg-slate-50 px-2 py-0.5 rounded border border-gray-100">
                                                {acc.swift}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>

                        {/* Transaction History Table */}
                        <div>
                            <div className="flex items-center justify-between pb-2 mb-1.5">
                                <span className="text-xs font-bold text-gray-900 uppercase tracking-wider">Recent Financial Activity</span>
                                <span className="text-[11px] text-gray-400">Showing last 4 transactions</span>
                            </div>
                            <div className="border border-gray-200/80 rounded-lg overflow-hidden bg-white shadow-2xs">
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
                                                    {txn.type === 'credit' ? '+' : ''}${Math.abs(txn.amount).toFixed(2)}
                                                </td>
                                                <td className="px-3.5 py-2 text-center">
                                                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold ${txn.status === 'Completed' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200/60' : 'bg-amber-50 text-amber-700 border border-amber-200/60'}`}>
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

                {/* 5. AUTOMATION TAB (Clean light enterprise card consistent with HotelManagementOS) */}
                {activeTab === 'automation' && (
                    <div className="space-y-3.5">
                        <div className="bg-slate-50/60 rounded-xl p-3.5 border border-slate-200/80">
                            <div className="flex items-center justify-between pb-2.5 mb-3 border-b border-slate-200/60">
                                <div className="flex items-center gap-2">
                                    <div className="w-6 h-6 rounded-md bg-blue-50 text-blue-600 flex items-center justify-center">
                                        <Monitor size={13} />
                                    </div>
                                    <div>
                                        <h3 className="text-xs font-bold text-gray-900 uppercase tracking-wider leading-none">Night Audit Automation</h3>
                                        <p className="text-[11px] text-gray-500 mt-0.5 leading-none">Automated nightly rollover schedules, room charge postings & backup routines</p>
                                    </div>
                                </div>
                                <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${property.automation?.autoRun !== false ? 'bg-emerald-50 text-emerald-700 border-emerald-200/60' : 'bg-rose-50 text-rose-700 border-rose-200/60'}`}>
                                    {property.automation?.autoRun !== false ? 'ACTIVE ENGINE' : 'MANUAL TRIGGER'}
                                </span>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                <div className="bg-white p-3 rounded-lg border border-gray-200/80 shadow-2xs">
                                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Scheduled Run Time</span>
                                    <p className="text-xl font-bold font-mono text-gray-900 mt-1">{property.automation?.auditTime || '02:00 AM'}</p>
                                    <p className="text-[10px] text-gray-400 mt-0.5">Local Property Timezone</p>
                                </div>

                                <div className="bg-white p-3 rounded-lg border border-gray-200/80 shadow-2xs">
                                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Auto Post Room Charges</span>
                                    <p className="text-xl font-bold text-emerald-600 mt-1">Enabled</p>
                                    <p className="text-[10px] text-gray-400 mt-0.5">Automated Daily Folio Posting</p>
                                </div>

                                <div className="bg-white p-3 rounded-lg border border-gray-200/80 shadow-2xs">
                                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Cloud Ledger Backup</span>
                                    <p className="text-xl font-bold text-emerald-600 mt-1">Active</p>
                                    <p className="text-[10px] text-gray-400 mt-0.5">Nightly Snapshot Retention</p>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* 6. TEAM TAB */}
                {activeTab === 'team' && (
                    <div className="space-y-3.5">
                        <div className="flex items-center justify-between pb-2 border-b border-gray-100">
                            <div className="flex items-center gap-2">
                                <div className="w-5 h-5 rounded bg-blue-50 text-blue-600 flex items-center justify-center">
                                    <User size={12} />
                                </div>
                                <span className="text-xs font-bold text-gray-900 uppercase tracking-wider">Key Property Contacts & Stakeholders</span>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            {(property.pocs || [
                                { id: 1, name: 'John Smith', role: 'General Manager', phone: '+1 (305) 555-0101', email: 'gm@grandhotel.com' },
                                { id: 2, name: 'Alice Walker', role: 'Front Desk Lead', phone: '+1 (305) 555-0102', email: 'frontdesk@grandhotel.com' },
                                { id: 3, name: 'David Miller', role: 'Head of Housekeeping', phone: '+1 (305) 555-0103', email: 'housekeeping@grandhotel.com' },
                                { id: 4, name: 'Sarah Jenkins', role: 'Chief Financial Officer', phone: '+1 (305) 555-0104', email: 'finance@grandhotel.com' },
                            ]).map((poc: any) => (
                                <div key={poc.id} className="p-3 border border-gray-200/80 rounded-lg flex items-center gap-3 bg-white shadow-2xs hover:border-blue-300 transition-colors">
                                    <div className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-100 flex items-center justify-center text-blue-700 font-bold text-xs shrink-0">
                                        {poc.name.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase()}
                                    </div>
                                    <div className="min-w-0">
                                        <p className="font-bold text-gray-900 text-xs truncate leading-tight">{poc.name}</p>
                                        <p className="text-blue-600 text-[10px] font-semibold uppercase tracking-wide leading-none mt-0.5">{poc.role}</p>
                                        <div className="flex flex-wrap items-center gap-3 text-[11px] text-gray-500 mt-1">
                                            <span className="flex items-center gap-1">
                                                <Phone size={10} className="text-gray-400" />
                                                <span>{poc.phone}</span>
                                            </span>
                                            <span className="flex items-center gap-1">
                                                <Mail size={10} className="text-gray-400" />
                                                <span>{poc.email}</span>
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>

            <SendEmailModal
                isOpen={isEmailModalOpen}
                onClose={() => setIsEmailModalOpen(false)}
                defaultSubject={`Inquiry regarding ${property.name}`}
            />
        </div>
    );
};

export default HotelInfoView;
