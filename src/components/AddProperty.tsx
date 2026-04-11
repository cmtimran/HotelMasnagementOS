import { useState } from 'react';
import {
    ArrowLeft, Building2, Clock,
    CreditCard, Monitor, User,
    Briefcase, MapPin, Shield, Settings,
    Zap, CheckCircle2, LogIn, ShieldCheck, ShieldAlert,
    DollarSign, Calendar, AlertCircle, FileText,
    Image, Trash2, Plus
} from 'lucide-react';

interface AddPropertyProps {
    onBack: () => void;
    initialData?: any;
}

const AddProperty = ({ onBack, initialData }: AddPropertyProps) => {
    const [activeTab, setActiveTab] = useState('identity');
    const [activePolicyPillar, setActivePolicyPillar] = useState('booking');

    // --- State Management ---


    const tabs = [
        { id: 'identity', label: 'Identity & Location', icon: <Building2 size={18} /> },
        { id: 'operations', label: 'Operations & Policy', icon: <Clock size={18} /> },
        { id: 'finance', label: 'Finance & Accounts', icon: <CreditCard size={18} /> },
        { id: 'system', label: 'System & Interfaces', icon: <Monitor size={18} /> },
        { id: 'branding', label: 'Branding & POC', icon: <User size={18} /> },
    ];

    const pillars = [
        { id: 'booking', label: 'Booking & Cancel', icon: <Calendar size={14} /> },
        { id: 'corporate', label: 'Corporate & Agency', icon: <Briefcase size={14} /> },
        { id: 'revenue', label: 'Revenue & Inventory', icon: <Zap size={14} /> },
        { id: 'arrival', label: 'Arrival & Departure', icon: <LogIn size={14} /> },
        { id: 'occupancy', label: 'Guest & Occupancy', icon: <User size={14} /> },
        { id: 'finance_sec', label: 'Finance & Security', icon: <DollarSign size={14} /> },
        { id: 'ops', label: 'Operational & Safety', icon: <Settings size={14} /> },
        { id: 'legal', label: 'Legal & Compliance', icon: <Shield size={14} /> },
    ];

    const SectionTitle = ({ icon: Icon, title }: { icon: any, title: string }) => (
        <div className="flex items-center gap-2 mb-6 pb-2 border-b border-gray-100">
            <Icon size={18} className="text-gray-400" />
            <h3 className="text-sm font-bold text-gray-700 uppercase tracking-tight">{title}</h3>
        </div>
    );

    const FormField = ({ label, required, children }: any) => (
        <div className="space-y-1.5 flex flex-col">
            <label className="text-[11px] font-bold text-gray-500 ml-1">
                {label} {required && <span className="text-red-500">*</span>}
            </label>
            {children}
        </div>
    );

    const Input = (props: any) => (
        <input {...props} className={`w-full px-4 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-100 focus:border-blue-400 outline-none transition-all placeholder:text-gray-300 ${props.className}`} />
    );

    const Select = (props: any) => (
        <select {...props} className="w-full px-4 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-100 focus:border-blue-400 outline-none appearance-none cursor-pointer">
            {props.children}
        </select>
    );

    const Checkbox = ({ label, checked, onChange, sub }: any) => (
        <label className="flex items-start gap-3 cursor-pointer group p-2 hover:bg-gray-50 rounded-lg transition-all">
            <div className={`mt-0.5 w-4 h-4 rounded border flex items-center justify-center flex-shrink-0 transition-all ${checked ? 'bg-blue-600 border-blue-600' : 'bg-white border-gray-300 group-hover:border-blue-400'}`}>
                {checked && <div className="w-1.5 h-2.5 border-r-2 border-b-2 border-white rotate-45 mb-0.5" />}
            </div>
            <input type="checkbox" className="hidden" checked={checked} onChange={onChange} />
            <div className="flex flex-col">
                <span className={`text-xs font-bold ${checked ? 'text-blue-700' : 'text-gray-600'}`}>{label}</span>
                {sub && <span className="text-[9px] text-gray-400 leading-tight font-medium">{sub}</span>}
            </div>
        </label>
    );

    const PillarButton = ({ pillar }: any) => (
        <button 
            onClick={() => setActivePolicyPillar(pillar.id)}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all ${activePolicyPillar === pillar.id ? 'bg-blue-600 text-white shadow-md' : 'text-gray-500 hover:bg-white'}`}
        >
            {pillar.icon} <span>{pillar.label}</span>
        </button>
    );

    return (
        <div className="min-h-screen bg-[#f8f9fc] text-slate-700 font-sans">
            {/* Header */}
            <header className="bg-white border-b px-8 py-3 flex justify-between items-center sticky top-0 z-30">
                <div className="flex items-center gap-4">
                    <button onClick={onBack} className="p-2 hover:bg-gray-100 rounded-lg border border-gray-100 transition-all">
                        <ArrowLeft size={18} className="text-gray-500" />
                    </button>
                    <div>
                        <h1 className="text-lg font-bold text-slate-800 tracking-tight">Add New Property</h1>
                        <p className="text-[10px] text-slate-400 font-medium">Enterprise Policy Architecture Hub</p>
                    </div>
                </div>
                <div className="flex gap-2">
                    <button className="px-5 py-2 hover:bg-gray-50 border border-gray-200 rounded-lg text-xs font-bold text-gray-600 transition-all">Save Draft</button>
                    <button className="px-6 py-2 bg-[#0052cc] text-white rounded-lg text-xs font-bold flex items-center gap-2 shadow-sm shadow-blue-500/20 active:scale-95 transition-all">
                        <CheckCircle2 size={16} /> Save & Publish
                    </button>
                </div>
            </header>

            <main className="max-w-[1500px] mx-auto p-6 lg:p-10 flex flex-col lg:flex-row gap-8">
                {/* Left Sidebar Nav */}
                <aside className="w-full lg:w-72 flex-shrink-0">
                    <nav className="bg-white rounded-2xl border border-gray-200 p-2 shadow-sm sticky top-24">
                        {tabs.map((tab) => (
                            <button key={tab.id} onClick={() => setActiveTab(tab.id)} className={`w-full flex items-center gap-3 px-5 py-3 rounded-xl text-xs font-bold transition-all ${activeTab === tab.id ? 'bg-[#e9f0ff] text-[#0052cc] border-l-4 border-[#0052cc]' : 'text-gray-400 hover:bg-gray-50'}`}>
                                {tab.icon} <span>{tab.label}</span>
                            </button>
                        ))}
                    </nav>
                </aside>

                {/* Content Area */}
                <div className="flex-1 bg-white rounded-2xl border border-gray-200 shadow-sm min-h-[850px] overflow-hidden flex flex-col">
                    
                    {activeTab === 'identity' && (
                        <div className="p-10 space-y-12 animate-in fade-in duration-300">
                            <div>
                                <SectionTitle icon={Building2} title="General Information" />
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                                    <FormField label="Hotel Name" required><Input defaultValue={initialData?.name} placeholder="Official Property Name" /></FormField>
                                    <FormField label="Property Code" required><Input defaultValue={initialData?.code} placeholder="e.g. HTL-DHK-01" /></FormField>
                                    <FormField label="Property Type"><Select defaultValue={initialData?.type}><option>Hotel</option><option>Resort</option><option>Apartment</option></Select></FormField>
                                    <FormField label="Grade / Star Rating"><Select defaultValue={initialData?.starRating}><option>5 Star</option><option>4 Star</option><option>3 Star</option></Select></FormField>
                                    <FormField label="Total Rooms Count" required><Input type="number" defaultValue={initialData?.totalRooms} /></FormField>
                                    <FormField label="Established Year"><Input placeholder="YYYY" /></FormField>
                                    <FormField label="Website"><Input placeholder="https://..." /></FormField>
                                    <FormField label="Default Nationality"><Select><option>Bangladeshi</option><option>American</option></Select></FormField>
                                </div>
                            </div>
                            
                            <div>
                                <SectionTitle icon={MapPin} title="Location & Contact" />
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                                    <div className="md:col-span-2 lg:col-span-4"><FormField label="Address" required><textarea className="w-full px-4 py-2 border border-gray-200 rounded-lg text-sm min-h-[80px]" defaultValue={initialData?.address} /></FormField></div>
                                    <FormField label="City"><Input placeholder="Dhaka" /></FormField>
                                    <FormField label="Country" required><Input defaultValue="Bangladesh" /></FormField>
                                    <FormField label="State"><Input placeholder="State" /></FormField>
                                    <FormField label="Zip Code"><Input placeholder="Zip Code" /></FormField>
                                    <FormField label="Map Latitude"><Input placeholder="e.g. 23.8103" /></FormField>
                                    <FormField label="Map Longitude"><Input placeholder="e.g. 90.4125" /></FormField>
                                    <FormField label="Timezone" required><Select><option>GMT+6 (Asia/Dhaka)</option></Select></FormField>
                                    <FormField label="Phone"><Input placeholder="Property Phone" /></FormField>
                                    <FormField label="Email"><Input type="email" placeholder="Property Email" /></FormField>
                                </div>
                            </div>

                            <div>
                                <SectionTitle icon={Zap} title="Property Amenities" />
                                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                                    <Checkbox label="WiFi" checked={true} />
                                    <Checkbox label="Parking" checked={true} />
                                    <Checkbox label="Swimming Pool" />
                                    <Checkbox label="Gym" />
                                    <Checkbox label="Spa" />
                                    <Checkbox label="Restaurant" checked={true} />
                                    <Checkbox label="Bar" />
                                    <Checkbox label="Room Service" checked={true} />
                                    <Checkbox label="Conference Room" />
                                    <Checkbox label="Airport Shuttle" />
                                    <Checkbox label="Wheelchair Accessible" />
                                    <Checkbox label="Elevator" checked={true} />
                                </div>
                            </div>

                            <div>
                                <SectionTitle icon={Briefcase} title="Corporate Office" />
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                    <FormField label="Corporate Address"><textarea className="w-full px-4 py-2 border border-gray-200 rounded-lg text-sm min-h-[80px]" placeholder="Office address..." /></FormField>
                                    <FormField label="Corporate Phone"><Input placeholder="Corporate Phone" /></FormField>
                                    <FormField label="Corporate Email"><Input type="email" placeholder="Corporate Email" /></FormField>
                                </div>
                            </div>
                        </div>
                    )}

                    {activeTab === 'operations' && (
                        <div className="flex-1 flex overflow-hidden">
                            {/* Inner Pillar Nav */}
                            <div className="w-64 bg-gray-50 border-r border-gray-100 p-4 space-y-2 overflow-y-auto no-scrollbar">
                                <p className="px-4 text-[9px] font-black text-gray-400 uppercase tracking-widest mb-4">Policy Engine Pillars</p>
                                {pillars.map(pillar => <PillarButton key={pillar.id} pillar={pillar} />)}
                            </div>

                            {/* Inner Pillar Content */}
                            <div className="flex-1 p-10 overflow-y-auto animate-in slide-in-from-right-2 duration-300">
                                {activePolicyPillar === 'booking' && (
                                    <div className="space-y-10">
                                        <SectionTitle icon={Calendar} title="1. Booking & Cancellation Policies" />
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                            <FormField label="Cancellation Rule"><Select><option>Flexible (24h)</option><option>Moderate (48h)</option><option>Non-Refundable</option></Select></FormField>
                                            <FormField label="No-Show Policy"><Select><option>First Night Charge</option><option>Total Price Charge</option><option>Flat Fee ($50)</option></Select></FormField>
                                            <div className="md:col-span-2"><FormField label="Auto-Release Timing"><Select><option>Release at 6:00 PM (Local Time)</option><option>Hold Until Midnight</option></Select></FormField></div>
                                            <div className="md:col-span-2"><FormField label="Detailed Cancellation Text"><textarea className="w-full px-4 py-3 border border-gray-200 rounded-lg text-sm min-h-[100px]" placeholder="Terms displayed on confirmation emails..." /></FormField></div>
                                        </div>
                                        <div className="bg-blue-50/50 p-6 rounded-xl border border-blue-100 space-y-4">
                                            <p className="text-[10px] font-bold text-blue-800 uppercase italic">Automation & Grace Period</p>
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                <Checkbox label="Allow Grace Period?" sub="Policy override for instant booking errors" checked={true} />
                                                <FormField label="Grace Period Duration (Hours)"><Input type="number" defaultValue={2} /></FormField>
                                                <Checkbox label="Require Booking Guarantee?" sub="Mandatory CC for all non-corporate bookings" checked={true} />
                                                <Checkbox label="Auto-Charge No-Show?" sub="Execute charge during Night Audit" checked={true} />
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {activePolicyPillar === 'corporate' && (
                                    <div className="space-y-10">
                                        <SectionTitle icon={Briefcase} title="2. Corporate & Agency Management" />
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                            <FormField label="Default City Ledger (AR) Limit"><div className="flex items-center gap-2 font-bold text-gray-400"><span>$</span><Input type="number" defaultValue={5000} /></div></FormField>
                                            <FormField label="IATA Agency Commission %"><div className="flex items-center gap-2 font-bold text-gray-400"><Input type="number" defaultValue={10} /><span>%</span></div></FormField>
                                        </div>
                                        <Checkbox label="Allow Bill-to-Company?" sub="Enable direct billing for recognized corporate entities" checked={true} />
                                    </div>
                                )}

                                {activePolicyPillar === 'revenue' && (
                                    <div className="space-y-10">
                                        <SectionTitle icon={Zap} title="3. Revenue & Inventory controls" />
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                            <FormField label="Waitlist Retention Days"><Input type="number" defaultValue={3} /></FormField>
                                            <FormField label="Overbooking Limit (Rooms/%)"><Input placeholder="e.g. 5 or 5%" defaultValue="5%" /></FormField>
                                            <div className="md:col-span-2">
                                                <Checkbox label="Allow Overbooking?" sub="Trigger dashboard warnings when inventory > 100%" checked={false} />
                                            </div>
                                        </div>
                                        <div className="bg-[#fff9e6] p-6 rounded-[2rem] border border-[#ffeeba] space-y-3">
                                            <div className="flex items-center gap-2 text-[#856404] font-black uppercase text-[10px] italic"><AlertCircle size={14} /> Waitlist Automation</div>
                                            <p className="text-[10px] text-[#856404]/80">If rooms are full, bookings go to 'Waitlist'. System will auto-email payment links if a cancellation occurs.</p>
                                            <Checkbox label="Enable Dynamic Waitlist?" checked={true} />
                                        </div>
                                    </div>
                                )}

                                {activePolicyPillar === 'arrival' && (
                                    <div className="space-y-10">
                                        <SectionTitle icon={LogIn} title="4. Arrival & Departure Protocols" />
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                            <FormField label="Global Check-in Time"><Input type="time" defaultValue="14:00" /></FormField>
                                            <FormField label="Global Check-out Time"><Input type="time" defaultValue="12:00" /></FormField>
                                        </div>
                                        <div className="p-6 bg-slate-50 rounded-2xl border border-gray-100 space-y-4">
                                            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Early Check-in Matrix</p>
                                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                                <FormField label="Before 06:00 AM"><Select><option>Full Night Charge</option><option>Half Night</option></Select></FormField>
                                                <FormField label="06:00 AM - 10:00 AM"><Select><option>50% Night Charge</option><option>Flat Fee</option></Select></FormField>
                                                <FormField label="10:00 AM - 01:00 PM"><Select><option>Complimentary</option><option>Fixed $20</option></Select></FormField>
                                            </div>
                                        </div>
                                        <div className="p-6 bg-red-50/30 rounded-2xl border border-red-100/50 space-y-4">
                                            <p className="text-[10px] font-black text-red-600 uppercase tracking-widest">Early Departure (Penalty)</p>
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                <FormField label="Departure Penalty Logic"><Select><option>Next Night/24h Rule</option><option>Charge Full Amount</option><option>Flat Fee $100</option><option>No Penalty</option></Select></FormField>
                                                <Checkbox label="Show Manager Override?" sub="Staff can waive fee with Manager reason" checked={true} />
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {activePolicyPillar === 'occupancy' && (
                                    <div className="space-y-10">
                                        <SectionTitle icon={User} title="5. Guest & Occupancy Rules" />
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                            <FormField label="Child Age Threshold (Years)"><Input type="number" defaultValue={12} /></FormField>
                                            <FormField label="Mandatory Visitor Identity"><Select><option>All Visitors (Photo ID)</option><option>Lobby Meetings Only</option></Select></FormField>
                                        </div>
                                        <Checkbox label="Enforce 10PM Visitor Curfew?" sub="Visitors must exit guest rooms by 10:00 PM" checked={true} />
                                    </div>
                                )}

                                {activePolicyPillar === 'finance_sec' && (
                                    <div className="space-y-10">
                                        <SectionTitle icon={DollarSign} title="6. Finance & Anti-Fraud controls" />
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                            <FormField label="Security Deposit Logic"><Select><option>Fixed Amount ($)</option><option>% of Stay Total</option></Select></FormField>
                                            <FormField label="Deposit Amount"><Input type="number" defaultValue={100} /></FormField>
                                            <FormField label="Staff Adjustment Limit"><div className="flex items-center gap-2 font-bold text-gray-400"><span>$</span><Input type="number" defaultValue={10} /></div></FormField>
                                            <FormField label="Tax Adjustment Mode"><Select><option>Auto-Update with Base Rent</option><option>Manual Adjustment</option></Select></FormField>
                                        </div>
                                        <div className="bg-slate-900 p-6 rounded-[2rem] text-white space-y-4">
                                            <div className="flex items-center gap-3"><ShieldAlert className="text-amber-400" /> <span className="text-xs font-black uppercase italic tracking-tighter">Financial Security Protocol</span></div>
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                <Checkbox label="Enable Deposit Ledger?" sub="Keep deposits separate from room revenue" checked={true} />
                                                <Checkbox label="Strict Refund Approval?" sub="Requires Manager/Accountant sign-off" checked={true} />
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {activePolicyPillar === 'ops' && (
                                    <div className="space-y-10">
                                        <SectionTitle icon={Settings} title="7. Operational Protocols" />
                                        <div className="p-6 bg-indigo-50/50 rounded-2xl border border-indigo-100 space-y-6">
                                            <div className="flex items-center gap-2 text-indigo-700 font-black uppercase text-[10px] italic"><FileText size={14} /> Meal & Resource Mapping</div>
                                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                                <FormField label="Meal Plan Sync"><Select><option>Sync with POS & KOT</option><option>Voucher Based</option></Select></FormField>
                                                <FormField label="Parking Surcharge"><Input type="number" defaultValue={10} /></FormField>
                                                <FormField label="Minibar Check-in Logic"><Select><option>Daily Restock</option><option>Post-Departure</option></Select></FormField>
                                            </div>
                                        </div>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            <Checkbox label="Enforce Smoking Penalty?" sub="Auto-add $200 penalty and mark OOO for deep clean" checked={true} />
                                            <Checkbox label="Enable Welfare Checks?" sub="HK alert if DND/No-Entry for 24h" checked={true} />
                                        </div>
                                    </div>
                                )}

                                {activePolicyPillar === 'legal' && (
                                    <div className="space-y-10">
                                        <SectionTitle icon={ShieldCheck} title="8. Legal & Compliance" />
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                            <FormField label="GDPR Retention (Months)"><Input type="number" defaultValue={24} /></FormField>
                                        </div>
                                        <div className="bg-red-50 p-6 rounded-xl border border-red-100 space-y-2">
                                            <div className="flex items-center gap-2 text-red-700 font-bold text-xs"><Zap size={14} /> Force Majeure Emergency</div>
                                            <p className="text-[10px] text-red-500">Enable global override for disaster events to bypass all standard cancellation fees.</p>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {activeTab === 'finance' && (
                        <div className="p-10 space-y-12 animate-in fade-in duration-300">
                            <div>
                                <SectionTitle icon={CreditCard} title="Financial Settings" />
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                                    <div className="flex items-end gap-4 col-span-2">
                                        <div className="flex-1">
                                            <FormField label="Base Currency" required>
                                                <Select><option>BDT</option><option>USD</option></Select>
                                            </FormField>
                                        </div>
                                        <div className="pb-3">
                                            <label className="flex items-center gap-2 cursor-pointer">
                                                <input type="checkbox" className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500" />
                                                <span className="text-xs font-medium text-gray-600">Is Tax Inclusive?</span>
                                            </label>
                                        </div>
                                    </div>
                                    <FormField label="BIN / VAT No"><Input /></FormField>

                                    <FormField label="Service Charge %"><Input type="number" defaultValue="10" /></FormField>
                                    <FormField label="Credit Card Gateway">
                                        <Select><option>Stripe</option><option>SSLCommerz</option><option>PayPal</option></Select>
                                    </FormField>
                                    <div className="hidden lg:block"></div> {/* Spacer */}

                                    <FormField label="Round Off Type">
                                        <Select><option>Nearest</option><option>Up</option><option>Down</option></Select>
                                    </FormField>
                                    <div className="flex items-end gap-4">
                                        <div className="flex-1">
                                            <FormField label="Round Off Limit"><Input type="number" defaultValue="1" /></FormField>
                                        </div>
                                        <div className="pb-3 text-nowrap">
                                            <label className="flex items-center gap-2 cursor-pointer">
                                                <input type="checkbox" className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500" />
                                                <span className="text-xs font-medium text-gray-600">Add Round Off to Rate?</span>
                                            </label>
                                        </div>
                                    </div>
                                    <div className="hidden lg:block"></div> {/* Spacer */}

                                    <div className="col-span-1 md:col-span-2 lg:col-span-3">
                                        <FormField label="Invoice / Bill Notes (Terms)">
                                            <textarea className="w-full px-4 py-3 border border-gray-200 rounded-lg text-sm min-h-[100px] outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all" placeholder="Detailed terms or notes to appear on every invoice..." />
                                        </FormField>
                                    </div>
                                </div>
                            </div>

                            <div>
                                <div className="flex items-center justify-between mb-6 pb-2 border-b border-gray-100">
                                    <div className="flex items-center gap-2">
                                        <Building2 size={18} className="text-gray-400" />
                                        <h3 className="text-sm font-bold text-gray-700 uppercase tracking-tight">Bank Accounts</h3>
                                    </div>
                                    <button className="text-blue-600 text-xs font-bold hover:underline flex items-center gap-1">
                                        <Plus size={14} /> Add Bank
                                    </button>
                                </div>
                                <div className="bg-gray-50/50 rounded-2xl border border-gray-100 p-6 overflow-x-auto">
                                    <table className="w-full border-spacing-x-4 border-separate">
                                        <thead>
                                            <tr className="text-left">
                                                <th className="text-[10px] font-black text-gray-400 uppercase tracking-widest pb-3">Bank Name</th>
                                                <th className="text-[10px] font-black text-gray-400 uppercase tracking-widest pb-3">Account Name</th>
                                                <th className="text-[10px] font-black text-gray-400 uppercase tracking-widest pb-3">Account Number</th>
                                                <th className="text-[10px] font-black text-gray-400 uppercase tracking-widest pb-3">Swift/Routing</th>
                                                <th className="w-10"></th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            <tr>
                                                <td className="pb-2"><Input className="!py-1.5" /></td>
                                                <td className="pb-2"><Input className="!py-1.5" /></td>
                                                <td className="pb-2"><Input className="!py-1.5" /></td>
                                                <td className="pb-2"><Input className="!py-1.5" /></td>
                                                <td className="pb-2 text-center">
                                                    <button className="text-red-400 hover:text-red-600 transition-colors">
                                                        <Trash2 size={16} />
                                                    </button>
                                                </td>
                                            </tr>
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>
                    )}

                    {activeTab === 'system' && (
                        <div className="p-10 space-y-12 animate-in fade-in duration-300">
                            <div>
                                <SectionTitle icon={Monitor} title="System Configuration" />
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                    <FormField label="Web Rate Mode">
                                        <Select><option>Regular</option><option>Dynamic</option></Select>
                                    </FormField>
                                    <FormField label="Web Inventory Mode">
                                        <Select><option>Regular (Live)</option><option>Manual Override</option></Select>
                                    </FormField>
                                    <div className="md:col-span-2">
                                        <FormField label="POS Configuration">
                                            <Select><option>Integrated POS</option><option>External Interface</option></Select>
                                        </FormField>
                                    </div>
                                </div>

                                <div className="mt-8">
                                    <p className="text-[11px] font-bold text-gray-500 mb-3 ml-1">Active Modules</p>
                                    <div className="flex flex-wrap gap-4">
                                        <Checkbox label="Front Office" checked={true} />
                                        <Checkbox label="POS" checked={false} />
                                        <Checkbox label="Housekeeping" checked={true} />
                                        <Checkbox label="HR/Payroll" checked={false} />
                                        <Checkbox label="Banquets" checked={false} />
                                    </div>
                                </div>

                                <div className="mt-10">
                                    <div className="flex items-center justify-between mb-4">
                                        <p className="text-[11px] font-bold text-gray-500 ml-1 uppercase tracking-tight">POS Outlets Setup</p>
                                        <button className="text-blue-600 text-xs font-bold hover:underline flex items-center gap-1">
                                            <Plus size={14} /> Add Config
                                        </button>
                                    </div>
                                    <div className="flex gap-4 items-center bg-gray-50/30 p-2 rounded-xl">
                                        <div className="flex-1"><Select><option>Restaurant</option><option>Spa</option><option>Gym</option></Select></div>
                                        <div className="w-24"><Input type="number" defaultValue="1" /></div>
                                        <button className="p-2 text-red-200 hover:text-red-500 transition-colors border border-gray-100 rounded-lg hover:bg-white"><Trash2 size={16} /></button>
                                    </div>
                                </div>

                                <div className="mt-10">
                                    <div className="bg-gray-50/50 p-4 rounded-xl border border-gray-100 inline-block">
                                        <Checkbox label="Auto-Email Folio on Checkout" checked={true} />
                                    </div>
                                </div>
                            </div>

                            <div>
                                <div className="flex items-center gap-2 mb-6 pb-2 border-b border-gray-100">
                                    <Settings size={18} className="text-gray-400" />
                                    <h3 className="text-sm font-bold text-gray-700 uppercase tracking-tight">Interfaces & APIs</h3>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                    <FormField label="Key Card System">
                                        <Select><option>VingCard</option><option>Assa Abloy</option><option>Manual Keys</option></Select>
                                    </FormField>
                                    <FormField label="Channel Manager">
                                        <Select><option>SiteMinder</option><option>Cloudbeds</option><option>Staah</option></Select>
                                    </FormField>
                                    <div className="md:col-span-2">
                                        <FormField label="SMS Gateway API Key">
                                            <Input placeholder="Enter API Key provided by your SMS vendor" />
                                        </FormField>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {activeTab === 'branding' && (
                        <div className="p-10 space-y-12 animate-in fade-in duration-300">
                            <div>
                                <SectionTitle icon={Image} title="Branding & Assets" />
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div className="space-y-2">
                                        <label className="text-[11px] font-bold text-gray-500 ml-1">Primary Logo *</label>
                                        <div className="border-2 border-dashed border-gray-200 rounded-2xl p-8 flex flex-col items-center justify-center gap-3 hover:border-blue-400 hover:bg-blue-50/30 transition-all cursor-pointer group">
                                            <div className="w-10 h-10 bg-gray-50 rounded-full flex items-center justify-center text-gray-400 group-hover:text-blue-500 transition-colors">
                                                <Image size={24} />
                                            </div>
                                            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest text-center">Upload Main Logo (Dashboard/Footer)</p>
                                        </div>
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[11px] font-bold text-gray-500 ml-1">Report Header</label>
                                        <div className="border-2 border-dashed border-gray-200 rounded-2xl p-8 flex flex-col items-center justify-center gap-3 hover:border-blue-400 hover:bg-blue-50/30 transition-all cursor-pointer group">
                                            <div className="w-10 h-10 bg-gray-50 rounded-full flex items-center justify-center text-gray-400 group-hover:text-blue-500 transition-colors">
                                                <Image size={24} />
                                            </div>
                                            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest text-center">Upload Report Banner</p>
                                        </div>
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[11px] font-bold text-gray-500 ml-1">Report Footer</label>
                                        <div className="border-2 border-dashed border-gray-200 rounded-2xl p-8 flex flex-col items-center justify-center gap-3 hover:border-blue-400 hover:bg-blue-50/30 transition-all cursor-pointer group">
                                            <div className="w-10 h-10 bg-gray-50 rounded-full flex items-center justify-center text-gray-400 group-hover:text-blue-500 transition-colors">
                                                <Image size={24} />
                                            </div>
                                            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest text-center">Upload Footer Image</p>
                                        </div>
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[11px] font-bold text-gray-500 ml-1">Login / Guest Portal Screen</label>
                                        <div className="border-2 border-dashed border-gray-200 rounded-2xl p-8 flex flex-col items-center justify-center gap-3 hover:border-blue-400 hover:bg-blue-50/30 transition-all cursor-pointer group">
                                            <div className="w-10 h-10 bg-gray-50 rounded-full flex items-center justify-center text-gray-400 group-hover:text-blue-500 transition-colors">
                                                <Image size={24} />
                                            </div>
                                            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest text-center">Upload Cover Image</p>
                                        </div>
                                    </div>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-10">
                                    <FormField label="Facebook URL"><Input placeholder="facebook.com/page" /></FormField>
                                    <FormField label="Instagram URL"><Input placeholder="instagram.com/page" /></FormField>
                                    <FormField label="TripAdvisor Link"><Input placeholder="tripadvisor.com/hotel" /></FormField>
                                </div>
                            </div>

                            <div>
                                <div className="flex items-center justify-between mb-6 pb-2 border-b border-gray-100">
                                    <div className="flex items-center gap-2">
                                        <User size={18} className="text-gray-400" />
                                        <h3 className="text-sm font-bold text-gray-700 uppercase tracking-tight">Key Contacts (POC)</h3>
                                    </div>
                                    <button className="text-blue-600 text-xs font-bold hover:underline flex items-center gap-1">
                                        <Plus size={14} /> Add Contact
                                    </button>
                                </div>
                                <div className="bg-gray-50/50 rounded-2xl border border-gray-100 p-6 overflow-x-auto">
                                    <table className="w-full border-spacing-x-4 border-separate">
                                        <thead>
                                            <tr className="text-left">
                                                <th className="text-[10px] font-black text-gray-400 uppercase tracking-widest pb-3">Role</th>
                                                <th className="text-[10px] font-black text-gray-400 uppercase tracking-widest pb-3">Name</th>
                                                <th className="text-[10px] font-black text-gray-400 uppercase tracking-widest pb-3">Phone</th>
                                                <th className="text-[10px] font-black text-gray-400 uppercase tracking-widest pb-3">Email</th>
                                                <th className="w-10"></th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            <tr>
                                                <td className="pb-2"><Select className="!py-1.5"><option>Owner</option><option>GM</option><option>Manager</option></Select></td>
                                                <td className="pb-2"><Input className="!py-1.5" /></td>
                                                <td className="pb-2"><Input className="!py-1.5" /></td>
                                                <td className="pb-2"><Input className="!py-1.5" /></td>
                                                <td className="pb-2 text-center">
                                                    <button className="text-red-400 hover:text-red-600 transition-colors">
                                                        <Trash2 size={16} />
                                                    </button>
                                                </td>
                                            </tr>
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>
                    )}

                </div>
            </main>
        </div>
    );
};

export default AddProperty;
