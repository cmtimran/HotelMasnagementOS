import React, { useState } from 'react';
import {
    ShieldCheck,
    Calendar,
    Clock,
    CreditCard,
    Users,
    AlertTriangle,
    Save,
    CheckCircle2,
    Plus,
    Edit2,
    Trash2,
    X,
    Info,
    Check
} from 'lucide-react';
import SecuritySettingsHubNav from './SecuritySettingsHubNav';

interface PolicyManagementProps {
    onNavigate?: (page: string) => void;
}

interface PolicyRule {
    id: string;
    title: string;
    category: 'cancellation' | 'checkin' | 'deposits' | 'occupancy' | 'damages';
    condition: string;
    action: string;
    penaltyAmount: string;
    requiresApproval: boolean;
    isActive: boolean;
}

export const PolicyManagement: React.FC<PolicyManagementProps> = ({ onNavigate }) => {
    const [activeTab, setActiveTab] = useState<'cancellation' | 'checkin' | 'deposits' | 'occupancy' | 'damages'>('cancellation');
    const [toastMessage, setToastMessage] = useState<string | null>(null);

    const showToast = (msg: string) => {
        setToastMessage(msg);
        setTimeout(() => setToastMessage(null), 3500);
    };

    // Pre-configured Hotel Operational Policy Rules
    const [policies, setPolicies] = useState<PolicyRule[]>([
        // Cancellation
        {
            id: 'pol-101',
            title: 'Standard Transient Flexible Cancellation',
            category: 'cancellation',
            condition: 'Cancellation received > 48 Hours before 14:00 check-in',
            action: 'Full 100% Refund of advance payment, Zero Penalty',
            penaltyAmount: '0%',
            requiresApproval: false,
            isActive: true,
        },
        {
            id: 'pol-102',
            title: 'Late Notice Cancellation Window (24 - 48 Hours)',
            category: 'cancellation',
            condition: 'Cancellation received between 24h and 48h prior to arrival',
            action: 'Charge 50% of the first night room tariff + taxes',
            penaltyAmount: '50% First Night',
            requiresApproval: false,
            isActive: true,
        },
        {
            id: 'pol-103',
            title: 'Same-Day Cancellation & Guest No-Show Penalty',
            category: 'cancellation',
            condition: 'Cancellation < 24 Hours or Guest fails to arrive by 23:59',
            action: 'Full 100% forfeiture of 1st night room charge; release room rack',
            penaltyAmount: '100% 1st Night',
            requiresApproval: true,
            isActive: true,
        },
        {
            id: 'pol-104',
            title: 'Non-Refundable Promotional Rate Rule',
            category: 'cancellation',
            condition: 'Bookings tagged with "PROMO-NONREF" or "FLASH-SALE"',
            action: '100% Non-refundable under all circumstances',
            penaltyAmount: '100% Full Stay',
            requiresApproval: true,
            isActive: true,
        },

        // Check-in & Check-out
        {
            id: 'pol-201',
            title: 'Early Arrival Morning Slot (06:00 - 10:00 AM)',
            category: 'checkin',
            condition: 'Guest arrives between 06:00 and 10:00 AM',
            action: 'Apply Early Check-In Surcharge of 50% room tariff (Subject to clean room)',
            penaltyAmount: '50% Room Rate',
            requiresApproval: false,
            isActive: true,
        },
        {
            id: 'pol-202',
            title: 'Mid-Day Courtesy Check-in (10:00 AM - 14:00 PM)',
            category: 'checkin',
            condition: 'Guest arrives between 10:00 AM and standard 14:00 PM',
            action: 'Complimentary early access granted if room is inspected & vacant',
            penaltyAmount: '৳ 0 (Complimentary)',
            requiresApproval: false,
            isActive: true,
        },
        {
            id: 'pol-203',
            title: 'Afternoon Late Check-Out (12:00 - 15:00 PM)',
            category: 'checkin',
            condition: 'Guest requests departure extension up to 15:00 PM',
            action: 'Charge 25% of prevailing daily room tariff',
            penaltyAmount: '25% Room Rate',
            requiresApproval: false,
            isActive: true,
        },
        {
            id: 'pol-204',
            title: 'Evening Extended Stay Check-Out (15:00 - 18:00 PM)',
            category: 'checkin',
            condition: 'Guest requests departure extension up to 18:00 PM',
            action: 'Charge 50% of room tariff; blocks room for evening turnaround',
            penaltyAmount: '50% Room Rate',
            requiresApproval: true,
            isActive: true,
        },
        {
            id: 'pol-205',
            title: 'Late Night Departure (> 18:00 PM)',
            category: 'checkin',
            condition: 'Guest departs hotel after 18:00 PM',
            action: 'Full 100% additional 1-night room charge automatically billed',
            penaltyAmount: '100% Full Night',
            requiresApproval: false,
            isActive: true,
        },

        // Deposits & Guarantees
        {
            id: 'pol-301',
            title: 'Incidental Security Deposit Requirement',
            category: 'deposits',
            condition: 'Mandatory upon check-in registration for all transient guests',
            action: 'Collect ৳ 5,000 / $50 per room via Card Pre-Auth or Cash Float',
            penaltyAmount: '৳ 5,000 / night',
            requiresApproval: false,
            isActive: true,
        },
        {
            id: 'pol-302',
            title: 'Credit Limit Threshold & Auto-Folio Suspension',
            category: 'deposits',
            condition: 'Guest room charges exceed ৳ 35,000 / $300 without interim payment',
            action: 'Suspends further room service / POS posting until payment top-up',
            penaltyAmount: 'Limit ৳ 35,000',
            requiresApproval: false,
            isActive: true,
        },

        // Occupancy & Extra Beds
        {
            id: 'pol-401',
            title: 'Infant & Child Policy (< 6 Years)',
            category: 'occupancy',
            condition: 'Up to 2 children under 6 years sharing existing adult bedding',
            action: 'Complimentary stay and complimentary buffet breakfast',
            penaltyAmount: 'Free',
            requiresApproval: false,
            isActive: true,
        },
        {
            id: 'pol-402',
            title: 'Junior Child Extra Bed & Breakfast (6 - 12 Years)',
            category: 'occupancy',
            condition: 'Children aged 6 to 12 requiring rollaway bed',
            action: 'Billed at ৳ 1,500 + tax per night inclusive of breakfast',
            penaltyAmount: '৳ 1,500 / night',
            requiresApproval: false,
            isActive: true,
        },
        {
            id: 'pol-403',
            title: 'Adult Extra Person Surcharge (> 12 Years)',
            category: 'occupancy',
            condition: 'Third adult in King or Twin Room category',
            action: 'Rollaway extra bed and full breakfast package provided',
            penaltyAmount: '৳ 2,500 / night',
            requiresApproval: false,
            isActive: true,
        },

        // Damages & Minibar
        {
            id: 'pol-501',
            title: 'Strict Non-Smoking Room Violation Penalty',
            category: 'damages',
            condition: 'Evidence of smoking, vaping or incense in non-smoking suites',
            action: 'Automated ৳ 25,000 / $250 deep cleaning and ozone sanitization fee',
            penaltyAmount: '৳ 25,000',
            requiresApproval: true,
            isActive: true,
        },
        {
            id: 'pol-502',
            title: 'Linen & Property Asset Staining / Damage',
            category: 'damages',
            condition: 'Irreparable damage or missing linen, bathrobes, or electronics',
            action: 'Charged at statutory standard master replacement asset price + 20%',
            penaltyAmount: 'Cost + 20%',
            requiresApproval: true,
            isActive: true,
        },
    ]);

    // Modal State for New Rule
    const [isAddRuleOpen, setIsAddRuleOpen] = useState(false);
    const [editingRule, setEditingRule] = useState<PolicyRule | null>(null);

    const toggleRuleStatus = (ruleId: string) => {
        setPolicies(prev =>
            prev.map(p => {
                if (p.id === ruleId) {
                    const next = !p.isActive;
                    showToast(`Policy "${p.title}" ${next ? 'activated' : 'deactivated'}.`);
                    return { ...p, isActive: next };
                }
                return p;
            })
        );
    };

    const handleDeleteRule = (ruleId: string) => {
        setPolicies(prev => prev.filter(p => p.id !== ruleId));
        showToast('Policy rule removed.');
    };

    const handleSaveRule = (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        const formData = new FormData(e.currentTarget);
        const title = formData.get('title') as string;
        const condition = formData.get('condition') as string;
        const action = formData.get('action') as string;
        const penaltyAmount = formData.get('penaltyAmount') as string;
        const requiresApproval = formData.get('requiresApproval') === 'on';

        if (editingRule) {
            setPolicies(prev =>
                prev.map(p =>
                    p.id === editingRule.id
                        ? { ...p, title, condition, action, penaltyAmount, requiresApproval }
                        : p
                )
            );
            showToast(`Policy "${title}" updated successfully.`);
        } else {
            const newRule: PolicyRule = {
                id: `pol-${Date.now().toString().slice(-3)}`,
                title,
                category: activeTab,
                condition,
                action,
                penaltyAmount,
                requiresApproval,
                isActive: true,
            };
            setPolicies(prev => [newRule, ...prev]);
            showToast(`New policy "${title}" added.`);
        }

        setIsAddRuleOpen(false);
        setEditingRule(null);
    };

    const currentPolicies = policies.filter(p => p.category === activeTab);

    return (
        <div className="p-3 sm:p-4 max-w-7xl mx-auto space-y-3 font-sans text-gray-800">
            {/* Toast Notification */}
            {toastMessage && (
                <div className="fixed bottom-4 right-4 z-[120] bg-gray-900 text-white px-4 py-2.5 rounded-xl shadow-xl flex items-center gap-2.5 text-xs font-medium animate-in fade-in slide-in-from-bottom-2 duration-200 border border-gray-700">
                    <CheckCircle2 size={16} className="text-emerald-400" />
                    <span>{toastMessage}</span>
                </div>
            )}

            {/* Security & Settings Suite Unified Navigation */}
            <SecuritySettingsHubNav activeHub="policy" onNavigate={onNavigate} />

            {/* Informative Micro-guide for Front Desk & Management */}
            <div className="bg-gradient-to-r from-blue-50/70 via-indigo-50/50 to-white p-3 rounded-xl border border-blue-200/60 shadow-2xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5 text-xs">
                <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-blue-600 text-white flex items-center justify-center flex-shrink-0 font-bold shadow-2xs">
                        <Info size={16} />
                    </div>
                    <div>
                        <div className="flex items-center gap-2">
                            <span className="font-bold text-gray-900">Hotel Policy Automation Engine</span>
                            <span className="text-[10px] font-semibold bg-blue-100 text-blue-800 px-1.5 py-0.2 rounded">Live Active</span>
                        </div>
                        <p className="text-[11px] text-gray-600 mt-0.5">
                            এখানকার রুলস অনুযায়ী গেস্টদের ক্যান্সেলেশন ফি, আর্লি চেক-ইন এবং লেট চেক-আউট পেনাল্টি অটোমেটিক্যালি বিল ফোলিওতে যোগ হবে।
                        </p>
                    </div>
                </div>
                <div className="flex items-center gap-2 text-[11px] text-gray-600 flex-shrink-0 font-medium">
                    <span className="inline-flex items-center gap-1 text-blue-700 bg-white px-2 py-1 rounded-md border border-blue-200 shadow-2xs">
                        <Check size={11} className="text-emerald-600" />
                        <span>Zero Manual Calculation</span>
                    </span>
                </div>
            </div>

            {/* Elevated Header Card */}
            <div className="bg-white rounded-xl border border-gray-200/90 shadow-2xs overflow-hidden">
                <div className="p-3.5 sm:p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-gray-100">
                    <div className="flex items-center gap-3">
                        <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-xl bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-100/80 flex items-center justify-center text-blue-700 font-bold text-sm shadow-2xs flex-shrink-0">
                            <ShieldCheck size={22} className="text-blue-600" />
                        </div>
                        <div className="min-w-0">
                            <div className="flex items-center gap-2">
                                <h1 className="text-base sm:text-lg font-bold text-gray-900 tracking-tight leading-tight truncate">
                                    Hotel Operations & Guest Policy Governance
                                </h1>
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200/60 flex-shrink-0">
                                    Automated Rules Engine
                                </span>
                                <span className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200/60">
                                    {policies.filter(p => p.isActive).length} Active Rules
                                </span>
                            </div>
                            <div className="flex flex-wrap items-center gap-3 text-[11px] text-gray-500 mt-1 font-medium">
                                <span className="flex items-center gap-1">
                                    <Calendar size={11} className="text-gray-400" />
                                    <span>Free Cancel: 48h Window</span>
                                </span>
                                <span className="flex items-center gap-1">
                                    <Clock size={11} className="text-gray-400" />
                                    <span>Standard Check-in: 14:00 | Out: 12:00</span>
                                </span>
                                <span className="hidden sm:flex items-center gap-1">
                                    <CreditCard size={11} className="text-gray-400" />
                                    <span>Incidental Deposit: ৳ 5,000 / Night</span>
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex items-center gap-2 self-start sm:self-auto flex-shrink-0">
                        <button
                            type="button"
                            onClick={() => {
                                setEditingRule(null);
                                setIsAddRuleOpen(true);
                            }}
                            className="h-7 px-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow-2xs transition-colors cursor-pointer"
                        >
                            <Plus size={13} />
                            <span>+ Add Policy Rule</span>
                        </button>
                    </div>
                </div>

                {/* Segmented Navigation Tabs */}
                <div className="px-3 sm:px-4 py-2 bg-gray-50/70 border-t border-gray-100 flex items-center justify-between gap-2 overflow-x-auto no-scrollbar">
                    <div className="flex items-center gap-1 sm:gap-1.5">
                        {[
                            { id: 'cancellation', label: 'Booking & Cancellation', icon: Calendar, count: policies.filter(p => p.category === 'cancellation').length },
                            { id: 'checkin', label: 'Check-In / Out & Early/Late', icon: Clock, count: policies.filter(p => p.category === 'checkin').length },
                            { id: 'deposits', label: 'Incidental Deposits & Credit', icon: CreditCard, count: policies.filter(p => p.category === 'deposits').length },
                            { id: 'occupancy', label: 'Children, Extra Beds & Pax', icon: Users, count: policies.filter(p => p.category === 'occupancy').length },
                            { id: 'damages', label: 'Smoking, Minibar & Damages', icon: AlertTriangle, count: policies.filter(p => p.category === 'damages').length },
                        ].map(t => (
                            <button
                                key={t.id}
                                type="button"
                                onClick={() => setActiveTab(t.id as any)}
                                className={`h-7 px-3 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer whitespace-nowrap ${activeTab === t.id
                                    ? 'bg-white text-blue-700 shadow-2xs border border-gray-200 font-bold'
                                    : 'text-gray-600 hover:text-gray-900 hover:bg-white/60'
                                    }`}
                            >
                                <t.icon size={13} />
                                <span>{t.label}</span>
                                <span className="ml-0.5 px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-100">
                                    {t.count}
                                </span>
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {/* Policy Rules List */}
            <div className="space-y-2.5">
                {currentPolicies.map((rule, index) => (
                    <div
                        key={rule.id}
                        className={`bg-white rounded-xl border p-3.5 shadow-2xs transition-all space-y-2.5 ${rule.isActive ? 'border-gray-200/90 hover:border-blue-200' : 'border-gray-200/60 opacity-60 bg-gray-50/50'}`}
                    >
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-gray-100 pb-2">
                            <div className="flex items-center gap-2">
                                <span className="w-5 h-5 rounded-md bg-blue-50 text-blue-700 font-bold text-[10px] flex items-center justify-center font-mono">
                                    #{index + 1}
                                </span>
                                <h3 className="text-xs font-bold text-gray-900">{rule.title}</h3>
                                {rule.requiresApproval && (
                                    <span className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                                        Manager Override Req.
                                    </span>
                                )}
                            </div>

                            <div className="flex items-center gap-2 self-end sm:self-auto">
                                <span className="px-2 py-0.5 rounded text-[11px] font-mono font-bold bg-gray-100 text-gray-800 border border-gray-200">
                                    {rule.penaltyAmount}
                                </span>
                                <button
                                    type="button"
                                    onClick={() => toggleRuleStatus(rule.id)}
                                    className={`px-2 py-0.5 rounded-full text-[10px] font-bold cursor-pointer transition-colors ${rule.isActive
                                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100'
                                        : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}
                                >
                                    {rule.isActive ? 'Active' : 'Disabled'}
                                </button>
                                <button
                                    type="button"
                                    onClick={() => {
                                        setEditingRule(rule);
                                        setIsAddRuleOpen(true);
                                    }}
                                    className="p-1 text-gray-400 hover:text-blue-600 rounded transition-colors cursor-pointer"
                                    title="Edit Rule"
                                >
                                    <Edit2 size={13} />
                                </button>
                                <button
                                    type="button"
                                    onClick={() => handleDeleteRule(rule.id)}
                                    className="p-1 text-gray-400 hover:text-rose-600 rounded transition-colors cursor-pointer"
                                    title="Delete Rule"
                                >
                                    <Trash2 size={13} />
                                </button>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                            <div className="p-2.5 bg-gray-50/70 border border-gray-200/70 rounded-lg space-y-1">
                                <span className="text-[10px] uppercase font-bold text-gray-400 tracking-wider">Trigger Condition (IF):</span>
                                <p className="font-medium text-gray-800">{rule.condition}</p>
                            </div>
                            <div className="p-2.5 bg-blue-50/40 border border-blue-200/70 rounded-lg space-y-1">
                                <span className="text-[10px] uppercase font-bold text-blue-500 tracking-wider">Automated Consequence (THEN):</span>
                                <p className="font-medium text-blue-900">{rule.action}</p>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {/* ADD / EDIT POLICY RULE MODAL */}
            {isAddRuleOpen && (
                <div className="fixed inset-0 bg-gray-900/40 backdrop-blur-xs z-[100] flex items-center justify-center p-3 sm:p-4">
                    <div className="bg-white rounded-xl shadow-2xl w-full max-w-xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-200 border border-gray-200 text-xs">
                        <div className="px-4 py-3 border-b border-gray-200 flex items-center justify-between bg-gray-50/80">
                            <div className="flex items-center gap-2">
                                <ShieldCheck size={16} className="text-blue-600" />
                                <h3 className="font-bold text-gray-900">
                                    {editingRule ? `Edit Rule: ${editingRule.title}` : 'Define New Operational Policy'}
                                </h3>
                            </div>
                            <button
                                type="button"
                                onClick={() => {
                                    setIsAddRuleOpen(false);
                                    setEditingRule(null);
                                }}
                                className="p-1 hover:bg-gray-200 rounded text-gray-400"
                            >
                                <X size={15} />
                            </button>
                        </div>

                        <form onSubmit={handleSaveRule} className="p-4 space-y-3">
                            <div className="space-y-1">
                                <label className="font-semibold text-gray-700">Policy Title <span className="text-red-500">*</span></label>
                                <input
                                    type="text"
                                    name="title"
                                    required
                                    defaultValue={editingRule?.title || ''}
                                    placeholder="e.g. 7-Day Group Booking Non-Refundable Rule"
                                    className="w-full h-8 px-2.5 border border-gray-200 rounded-lg outline-none text-xs font-semibold"
                                />
                            </div>

                            <div className="space-y-1">
                                <label className="font-semibold text-gray-700">Trigger Condition (When to apply) <span className="text-red-500">*</span></label>
                                <textarea
                                    name="condition"
                                    required
                                    rows={2}
                                    defaultValue={editingRule?.condition || ''}
                                    placeholder="e.g. Cancellation requested between 48h and 7 days prior to check-in"
                                    className="w-full p-2 border border-gray-200 rounded-lg outline-none text-xs resize-none"
                                />
                            </div>

                            <div className="space-y-1">
                                <label className="font-semibold text-gray-700">Consequence / Enforcement Action <span className="text-red-500">*</span></label>
                                <textarea
                                    name="action"
                                    required
                                    rows={2}
                                    defaultValue={editingRule?.action || ''}
                                    placeholder="e.g. Surcharge 50% room rent; return remaining 50% to guest payment method"
                                    className="w-full p-2 border border-gray-200 rounded-lg outline-none text-xs resize-none"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-3 pt-1">
                                <div className="space-y-1">
                                    <label className="font-semibold text-gray-700">Fee / Penalty Formula</label>
                                    <input
                                        type="text"
                                        name="penaltyAmount"
                                        defaultValue={editingRule?.penaltyAmount || '50% Room Rate'}
                                        placeholder="e.g. 50% or ৳ 2,500"
                                        className="w-full h-8 px-2.5 border border-gray-200 rounded-lg outline-none text-xs font-mono font-bold"
                                    />
                                </div>

                                <div className="space-y-2 pt-4">
                                    <label className="flex items-center gap-2 cursor-pointer">
                                        <input
                                            type="checkbox"
                                            name="requiresApproval"
                                            defaultChecked={editingRule?.requiresApproval ?? false}
                                            className="w-4 h-4 accent-blue-600 rounded"
                                        />
                                        <span className="font-semibold text-gray-700">Requires Manager PIN Override</span>
                                    </label>
                                </div>
                            </div>

                            <div className="pt-2 flex items-center justify-end gap-2 border-t border-gray-100">
                                <button
                                    type="button"
                                    onClick={() => {
                                        setIsAddRuleOpen(false);
                                        setEditingRule(null);
                                    }}
                                    className="h-8 px-3 border border-gray-200 text-gray-700 rounded-lg hover:bg-gray-50 font-semibold cursor-pointer"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="h-8 px-4 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold flex items-center gap-1.5 shadow-2xs cursor-pointer"
                                >
                                    <Save size={13} />
                                    <span>{editingRule ? 'Update Rule' : 'Save Rule'}</span>
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default PolicyManagement;
