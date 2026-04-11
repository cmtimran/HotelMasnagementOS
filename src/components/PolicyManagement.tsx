import { useState } from 'react';
import { 
    Settings, XCircle, CreditCard, 
    EyeOff, LogOut, LogIn, User,
    BedDouble, ShieldCheck, Save, Info,
    Calendar, Users, Zap, Heart,
    Ban, FileText,
    ChevronRight, DollarSign, Percent,
    Briefcase, ShieldAlert,
    Download, Plus, Trash2, 
    AlertCircle, History
} from 'lucide-react';

const PolicyManagement = () => {
    const [activeTab, setActiveTab] = useState('booking');
    const [activeSubTab, setActiveSubTab] = useState('cancellation');
    const [showApprovalCenter, setShowApprovalCenter] = useState(false);

    // --- State for Dynamic Rules ---
    const [rules] = useState<any[]>([
        { id: 1, type: 'cancellation', name: 'Flexible Rule', conditions: { days_before: 30 }, action: { type: 'REFUND', value: 100 }, priority: 1 },
        { id: 2, type: 'cancellation', name: 'Standard Rule', conditions: { days_before: 14 }, action: { type: 'REFUND', value: 50 }, priority: 2 },
    ]);

    const Utensils = ({ size }: any) => <Zap size={size} />; // Defined before usage in categories

    const categories = [
        { id: 'booking', label: 'Booking & Cancel', icon: <Calendar size={18} /> },
        { id: 'stay', label: 'Front Desk & Stay', icon: <BedDouble size={18} /> },
        { id: 'finance', label: 'Finance & Controls', icon: <DollarSign size={18} /> },
        { id: 'outlets', label: 'Services & Outlets', icon: <Utensils size={18} /> },
        { id: 'ops', label: 'Internal Ops', icon: <Settings size={18} /> },
    ];

    const subTabs: Record<string, { id: string; label: string; icon: any }[]> = {
        booking: [
            { id: 'cancellation', label: 'Cancellation Policy', icon: <XCircle size={16} /> },
            { id: 'no-show', label: 'No-Show Strategy', icon: <EyeOff size={16} /> },
            { id: 'overbooking', label: 'Overbooking/Waitlist', icon: <AlertCircle size={16} /> },
            { id: 'group', label: 'Group Booking Rules', icon: <Users size={16} /> },
        ],
        stay: [
            { id: 'checkin-early', label: 'Early Check-in', icon: <LogIn size={16} /> },
            { id: 'checkout-early', label: 'Early Departure', icon: <LogOut size={16} /> },
            { id: 'age-policy', label: 'Age & Child Extra Bed', icon: <User size={16} /> },
            { id: 'smoking', label: 'Smoking & Penalties', icon: <Ban size={16} /> },
        ],
        finance: [
            { id: 'deposit', label: 'Security & Incidental', icon: <CreditCard size={16} /> },
            { id: 'refund', label: 'Refund Workflow', icon: <History size={16} /> },
            { id: 'adjustment', label: 'Adjustment & Void', icon: <Percent size={16} /> },
            { id: 'currency', label: 'Currency/Exchange', icon: <DollarSign size={16} /> },
        ],
        outlets: [
            { id: 'meal-plan', label: 'Meal Plan Policy', icon: <FileText size={16} /> },
            { id: 'parking', label: 'Parking Management', icon: <Zap size={16} /> },
            { id: 'res-booking', label: 'Gym/Spa Resources', icon: <History size={16} /> },
            { id: 'minibar', label: 'Minibar Restock', icon: <ShieldAlert size={16} /> },
        ],
        ops: [
            { id: 'loyalty', label: 'Loyalty & Agents', icon: <Heart size={16} /> },
            { id: 'house-use', label: 'Comp/House Use', icon: <Briefcase size={16} /> },
            { id: 'maintenance', label: 'Maintenance Blocking', icon: <Settings size={16} /> },
            { id: 'legal', label: 'Security & Legal', icon: <ShieldCheck size={16} /> },
        ]
    };

    const SectionTitle = ({ title, sub }: { title: string, sub: string }) => (
        <div className="mb-10">
            <h1 className="text-4xl font-black text-gray-900 tracking-tighter uppercase italic">{title}</h1>
            <p className="text-xs text-gray-400 font-bold uppercase tracking-[0.3em] mt-2">{sub}</p>
        </div>
    );

    const RuleCard = ({ rule }: any) => (
        <div className="bg-white border border-gray-100 rounded-[2rem] p-8 shadow-sm hover:shadow-xl transition-all group">
            <div className="flex justify-between items-start mb-6">
                <div className="flex items-center gap-4">
                    <div className="w-10 h-10 bg-indigo-50 rounded-2xl flex items-center justify-center text-indigo-600 font-black">
                        #{rule.priority}
                    </div>
                    <div>
                        <h4 className="font-black text-gray-900 uppercase italic tracking-tight">{rule.name}</h4>
                        <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">Rule ID: {rule.id}</p>
                    </div>
                </div>
                <div className="flex gap-2">
                    <button className="p-2 text-gray-300 hover:text-indigo-600 transition-colors"><Settings size={16} /></button>
                    <button className="p-2 text-gray-300 hover:text-red-600 transition-colors"><Trash2 size={16} /></button>
                </div>
            </div>
            
            <div className="space-y-4">
                <div className="bg-gray-50 p-4 rounded-2xl border border-dashed border-gray-200">
                    <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-2">Conditions (IF)</p>
                    <div className="flex flex-wrap gap-2">
                        {Object.entries(rule.conditions).map(([key, val]) => (
                            <span key={key} className="px-3 py-1 bg-white border border-gray-100 rounded-lg text-[10px] font-bold text-gray-600">
                                {key.replace('_', ' ')}: <span className="text-indigo-600">{val as string}</span>
                            </span>
                        ))}
                    </div>
                </div>
                <div className="bg-indigo-600 p-4 rounded-2xl text-white">
                    <p className="text-[9px] font-black text-indigo-200 uppercase tracking-widest mb-2">Action (THEN)</p>
                    <p className="text-xs font-black uppercase italic tracking-wider">Apply {rule.action.type}: {rule.action.value}%</p>
                </div>
            </div>
        </div>
    );

    const ApprovalItem = ({ request }: any) => (
        <div className="bg-white border border-gray-100 rounded-3xl p-6 flex items-center justify-between shadow-sm">
            <div className="flex items-center gap-6">
                <div className="w-14 h-14 bg-amber-50 rounded-2xl flex items-center justify-center text-amber-600">
                    <ShieldAlert size={28} />
                </div>
                <div>
                    <h4 className="text-sm font-black text-gray-900 uppercase italic leading-tight">{request.type} Request</h4>
                    <p className="text-xs text-gray-500 font-bold mt-1">Requested by {request.staff} • <span className="text-amber-600">${request.amount}</span></p>
                </div>
            </div>
            <div className="flex gap-3">
                <button className="px-5 py-2.5 bg-gray-900 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-black transition-all">Reject</button>
                <button className="px-5 py-2.5 bg-indigo-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-indigo-600/30 hover:bg-indigo-700 transition-all">Approve</button>
            </div>
        </div>
    );

    return (
        <div className="min-h-screen bg-[#fcfcfd] flex animate-fadeIn font-sans selection:bg-indigo-100 selection:text-indigo-900">
            {/* Sidebar */}
            <div className="w-80 bg-white border-r border-gray-100 flex flex-col shadow-sm fixed h-full z-10">
                <div className="p-8 border-b border-gray-50 bg-gradient-to-br from-indigo-50/50 to-white">
                    <div className="flex items-center gap-4 mb-8">
                        <div className="w-12 h-12 bg-indigo-600 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-indigo-600/30">
                            <ShieldCheck size={28} />
                        </div>
                        <div>
                            <h2 className="text-xl font-black text-gray-900 tracking-tighter uppercase italic leading-none">Control</h2>
                            <p className="text-[9px] text-indigo-500 font-bold uppercase tracking-widest mt-1">Global Policy Hub</p>
                        </div>
                    </div>

                    <button 
                        onClick={() => setShowApprovalCenter(!showApprovalCenter)}
                        className={`w-full flex items-center justify-between px-4 py-3 rounded-2xl border transition-all ${showApprovalCenter ? 'bg-amber-600 border-amber-600 text-white shadow-lg shadow-amber-600/30' : 'bg-white border-amber-100 text-amber-600 hover:bg-amber-50'}`}
                    >
                        <div className="flex items-center gap-3 text-[10px] font-black uppercase tracking-widest">
                            <ShieldAlert size={16} />
                            <span>Approval Center</span>
                        </div>
                        {!showApprovalCenter && <span className="w-5 h-5 bg-amber-600 text-white flex items-center justify-center rounded-full text-[10px] font-black animate-pulse">3</span>}
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto p-4 space-y-2 no-scrollbar">
                    {!showApprovalCenter ? categories.map((cat) => (
                        <div key={cat.id} className="space-y-1">
                            <button
                                onClick={() => {
                                    setActiveTab(cat.id);
                                    setActiveSubTab(subTabs[cat.id]?.[0]?.id || '');
                                }}
                                className={`w-full flex items-center justify-between px-5 py-4 rounded-2xl transition-all ${
                                    activeTab === cat.id 
                                    ? 'bg-indigo-600 text-white shadow-xl shadow-indigo-600/30 translate-x-1' 
                                    : 'text-gray-500 hover:bg-gray-50 font-bold'
                                }`}
                            >
                                <div className="flex items-center gap-4 text-xs tracking-widest uppercase font-black">
                                    {cat.icon}
                                    <span>{cat.label}</span>
                                </div>
                                {activeTab === cat.id && <ChevronRight size={16} className="text-indigo-200" />}
                            </button>

                            {activeTab === cat.id && (
                                <div className="ml-8 space-y-1 p-2 animate-slideDown">
                                    {subTabs[cat.id]?.map((sub) => (
                                        <button
                                            key={sub.id}
                                            onClick={() => setActiveSubTab(sub.id)}
                                            className={`w-full text-left px-4 py-3 rounded-xl text-[11px] font-black tracking-wide capitalize transition-all ${
                                                activeSubTab === sub.id 
                                                ? 'bg-indigo-50 text-indigo-700' 
                                                : 'text-gray-400 hover:text-gray-600'
                                            }`}
                                        >
                                            <div className="flex items-center gap-3">
                                                {sub.icon}
                                                {sub.label}
                                            </div>
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>
                    )) : (
                        <div className="p-4 bg-gray-50 rounded-3xl border border-gray-100">
                            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-4">Quick Stats</p>
                            <div className="space-y-4">
                                <div className="flex justify-between items-center text-xs font-bold">
                                    <span className="text-gray-600">Avg. Delay</span>
                                    <span className="text-amber-600">12m</span>
                                </div>
                                <div className="flex justify-between items-center text-xs font-bold">
                                    <span className="text-gray-600">Reject Rate</span>
                                    <span className="text-red-500">4.2%</span>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                <div className="p-6 border-t border-gray-50 bg-gray-50/50">
                    <button className="w-full bg-slate-900 text-white py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-lg flex items-center justify-center gap-3 hover:bg-black transition-all">
                        <Save size={16} className="text-indigo-400" /> 
                        Deploy System Wide
                    </button>
                </div>
            </div>

            {/* Main Content Area */}
            <div className="flex-1 ml-80 overflow-y-auto p-12 lg:p-20 bg-white min-h-screen">
                <div className="max-w-5xl mx-auto">
                    
                    {showApprovalCenter ? (
                        <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                            <SectionTitle title="Gatekeeper Queue" sub="Verification Layer / Manager Override" />
                            
                            <div className="grid grid-cols-1 gap-4">
                                <div className="bg-amber-50 h-10 px-6 rounded-full flex items-center gap-3 border border-amber-100 text-amber-700 text-[10px] font-black uppercase tracking-widest mb-4">
                                    <AlertCircle size={14} />
                                    Sensitive transactions detected above staff threshold ($10.00)
                                </div>
                                
                                <ApprovalItem request={{ type: 'Folio Adjustment', staff: 'Rashedul (Front Desk)', amount: 250, id: 'REQ-01' }} />
                                <ApprovalItem request={{ type: 'Refund Request', staff: 'Mim (Accounts)', amount: 1500, id: 'REQ-02' }} />
                                <ApprovalItem request={{ type: 'Waive Late Fee', staff: 'Tanvir (Duty Mgr)', amount: 45, id: 'REQ-03' }} />
                                
                                <div className="mt-12 p-8 border border-dashed border-gray-200 rounded-[3rem] text-center">
                                    <p className="text-xs text-gray-400 font-bold uppercase tracking-widest">End of Pending Queue</p>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="animate-in fade-in duration-500">
                            <div className="flex items-center justify-between mb-16">
                                <div className="flex items-center gap-6">
                                    <div className="w-20 h-20 bg-gray-50 rounded-[2rem] flex items-center justify-center text-gray-900 border border-gray-100 shadow-sm relative rotate-3 transition-transform hover:rotate-0">
                                        {categories.find(c => c.id === activeTab)?.icon}
                                        <div className="absolute -top-1 -right-1 w-5 h-5 bg-indigo-600 rounded-full border-4 border-white animate-pulse" />
                                    </div>
                                    <SectionTitle title={activeSubTab.replace('-', ' ')} sub={`Operational Protocol / ${activeTab}`} />
                                </div>
                                <div className="flex gap-4">
                                    <button className="flex items-center gap-2 px-6 py-3 bg-indigo-50 text-indigo-600 rounded-2xl text-[10px] font-black uppercase tracking-widest border border-indigo-100 hover:bg-indigo-100 transition-all">
                                        <History size={16} /> Audit Logs
                                    </button>
                                    <button className="flex items-center gap-2 px-8 py-3 bg-indigo-600 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-indigo-600/30 hover:bg-indigo-700 transition-all">
                                        <Plus size={16} /> Add New Rule
                                    </button>
                                </div>
                            </div>

                            {/* Active Module Logic Shell */}
                            <div className="space-y-12">
                                {/* Rule Engine Display */}
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                    {rules.filter(r => r.type === activeSubTab).map(rule => (
                                        <RuleCard key={rule.id} rule={rule} />
                                    ))}
                                    
                                    <div className="border-2 border-dashed border-indigo-50 rounded-[2rem] p-12 flex flex-col items-center justify-center text-center group cursor-pointer hover:border-indigo-200 hover:bg-indigo-50/30 transition-all">
                                        <div className="w-16 h-16 bg-indigo-50 text-indigo-400 rounded-full flex items-center justify-center mb-6 border border-indigo-100 group-hover:scale-110 transition-transform">
                                            <Plus size={32} />
                                        </div>
                                        <h4 className="text-xl font-black text-indigo-900 uppercase italic mb-2">Create Global Override</h4>
                                        <p className="text-xs text-indigo-400 font-bold uppercase tracking-widest max-w-[200px]">Define a new automated policy for this module.</p>
                                    </div>
                                </div>

                                {/* Placeholder for Detailed Inputs based on activeSubTab */}
                                <div className="p-16 bg-gray-900 rounded-[4rem] text-white relative overflow-hidden">
                                    <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-12">
                                        <div className="flex-1 space-y-6">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 bg-indigo-600 rounded-2xl flex items-center justify-center shadow-lg"><Zap size={20} /></div>
                                                <h3 className="text-3xl font-black uppercase italic tracking-tighter">AI Rule Evaluator</h3>
                                            </div>
                                            <p className="text-sm text-gray-400 font-medium leading-relaxed">
                                                The current <span className="text-indigo-400">"{activeSubTab}"</span> state is being evaluated against the enterprise rule engine. 
                                                All triggers will respond within <span className="text-white">12ms</span> across your global property network.
                                            </p>
                                            <div className="flex gap-4">
                                                <button className="px-6 py-3 bg-white text-gray-900 rounded-full text-[10px] font-black uppercase tracking-widest hover:bg-indigo-50 transition-all">Test Simulation</button>
                                                <button className="px-6 py-3 bg-gray-800 text-gray-400 rounded-full text-[10px] font-black uppercase tracking-widest border border-gray-700 hover:text-white transition-all">View Schema</button>
                                            </div>
                                        </div>
                                        <div className="w-full md:w-80 h-80 bg-gradient-to-br from-indigo-500/20 to-transparent rounded-[3rem] border border-white/10 p-8 flex flex-col justify-center gap-4">
                                            {[1, 2, 3].map(i => (
                                                <div key={i} className="h-12 bg-white/5 rounded-2xl border border-white/10 animate-pulse flex items-center px-4">
                                                    <div className="w-2 h-2 rounded-full bg-indigo-500 mr-4" />
                                                    <div className="h-2 w-32 bg-white/10 rounded-full" />
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                    <Zap size={300} className="absolute -right-20 -bottom-20 text-white/[0.03] rotate-12" />
                                </div>
                            </div>
                        </div>
                    )}

                    <div className="mt-24 pt-12 border-t border-gray-100 flex items-center justify-between">
                        <div className="flex items-center gap-4 text-gray-300">
                            <Info size={16} />
                            <p className="text-[10px] uppercase font-black tracking-widest leading-none">Security Protocol: SHA-256 Policy Encryption Active</p>
                        </div>
                        <div className="flex gap-4">
                            <button className="p-4 bg-gray-50 text-gray-400 rounded-2xl hover:bg-indigo-50 hover:text-indigo-600 transition-all shadow-sm">
                                <Download size={20} />
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default PolicyManagement;

