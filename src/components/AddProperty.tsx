import { useState } from 'react';
import {
    ArrowLeft, Building2, Clock,
    CreditCard, Monitor, User,
    Briefcase, MapPin, Shield, Settings,
    Zap, CheckCircle2, LogIn, ShieldCheck, ShieldAlert,
    DollarSign, Calendar, AlertCircle, FileText,
    Image, Trash2, Plus, Check
} from 'lucide-react';

interface AddPropertyProps {
    onBack: () => void;
    initialData?: any;
}

interface BankAccount {
    id: string;
    bankName: string;
    accountName: string;
    accountNum: string;
    swift: string;
}

interface PosOutlet {
    id: string;
    type: string;
    count: number;
}

interface PocContact {
    id: string;
    role: string;
    name: string;
    phone: string;
    email: string;
}

const AddProperty = ({ onBack, initialData }: AddPropertyProps) => {
    const [activeTab, setActiveTab] = useState('identity');
    const [activePolicyPillar, setActivePolicyPillar] = useState('booking');
    const [notification, setNotification] = useState<string | null>(null);

    // Dynamic Lists State
    const [bankAccounts, setBankAccounts] = useState<BankAccount[]>([
        { id: '1', bankName: 'Standard Chartered Bank', accountName: 'Grand Palace Operations', accountNum: '01-8849201-01', swift: 'SCBLBDDX' },
        { id: '2', bankName: 'Eastern Bank Ltd', accountName: 'Grand Palace Corporate', accountNum: '104-120-9481', swift: 'EBLBBDDH' }
    ]);

    const [posOutlets, setPosOutlets] = useState<PosOutlet[]>([
        { id: '1', type: 'Restaurant', count: 1 },
        { id: '2', type: 'Spa', count: 1 }
    ]);

    const [contacts, setContacts] = useState<PocContact[]>([
        { id: '1', role: 'General Manager', name: 'John Smith', phone: '+880 1711 000001', email: 'gm@grandhotel.com' },
        { id: '2', role: 'Front Desk Lead', name: 'Alice Walker', phone: '+880 1711 000002', email: 'frontdesk@grandhotel.com' }
    ]);

    // Amenities
    const [amenities, setAmenities] = useState<Record<string, boolean>>({
        WiFi: true,
        Parking: true,
        'Swimming Pool': false,
        Gym: false,
        Spa: false,
        Restaurant: true,
        Bar: false,
        'Room Service': true,
        'Conference Room': false,
        'Airport Shuttle': false,
        'Wheelchair Accessible': false,
        Elevator: true
    });

    const toggleAmenity = (key: string) => {
        setAmenities(prev => ({ ...prev, [key]: !prev[key] }));
    };

    const handleSave = (type: 'draft' | 'publish') => {
        setNotification(type === 'publish' ? 'Property profile saved and published successfully!' : 'Draft configuration saved successfully!');
        setTimeout(() => setNotification(null), 3000);
    };

    const tabs = [
        { id: 'identity', label: 'Identity & Location', icon: <Building2 size={16} /> },
        { id: 'operations', label: 'Operations & Policy', icon: <Clock size={16} /> },
        { id: 'finance', label: 'Finance & Accounts', icon: <CreditCard size={16} /> },
        { id: 'system', label: 'System & Interfaces', icon: <Monitor size={16} /> },
        { id: 'branding', label: 'Branding & POC', icon: <User size={16} /> },
    ];

    const pillars = [
        { id: 'booking', label: 'Booking & Cancel', icon: <Calendar size={13} /> },
        { id: 'corporate', label: 'Corporate & Agency', icon: <Briefcase size={13} /> },
        { id: 'revenue', label: 'Revenue & Inventory', icon: <Zap size={13} /> },
        { id: 'arrival', label: 'Arrival & Departure', icon: <LogIn size={13} /> },
        { id: 'occupancy', label: 'Guest & Occupancy', icon: <User size={13} /> },
        { id: 'finance_sec', label: 'Finance & Security', icon: <DollarSign size={13} /> },
        { id: 'ops', label: 'Operational & Safety', icon: <Settings size={13} /> },
        { id: 'legal', label: 'Legal & Compliance', icon: <Shield size={13} /> },
    ];

    // Compact Section Title
    const SectionTitle = ({ icon: Icon, title }: { icon: any, title: string }) => (
        <div className="flex items-center gap-2 mb-3.5 pb-1.5 border-b border-gray-100">
            <Icon size={15} className="text-gray-400" />
            <h3 className="text-xs font-bold text-gray-700 uppercase tracking-tight">{title}</h3>
        </div>
    );

    // Compact Form Field
    const FormField = ({ label, required, children }: any) => (
        <div className="space-y-1 flex flex-col">
            <label className="text-[10.5px] font-bold text-gray-500 ml-0.5">
                {label} {required && <span className="text-red-500">*</span>}
            </label>
            {children}
        </div>
    );

    // Compact Input Field
    const Input = (props: any) => (
        <input
            {...props}
            className={`w-full h-8 px-3 bg-white border border-gray-200 rounded-lg text-xs focus:ring-1 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all placeholder:text-gray-300 text-gray-800 ${props.className || ''}`}
        />
    );

    // Compact Select Field
    const Select = (props: any) => (
        <select
            {...props}
            className={`w-full h-8 px-2.5 bg-white border border-gray-200 rounded-lg text-xs focus:ring-1 focus:ring-blue-500 focus:border-blue-500 outline-none cursor-pointer text-gray-800 ${props.className || ''}`}
        >
            {props.children}
        </select>
    );

    // Compact Checkbox
    const Checkbox = ({ label, checked, onChange, sub }: any) => (
        <label className="flex items-start gap-2.5 cursor-pointer group p-1.5 hover:bg-gray-50/80 rounded-lg transition-all select-none">
            <div className={`mt-0.5 w-3.5 h-3.5 rounded border flex items-center justify-center flex-shrink-0 transition-all ${checked ? 'bg-blue-600 border-blue-600' : 'bg-white border-gray-300 group-hover:border-blue-400'}`}>
                {checked && <div className="w-1 h-2 border-r-2 border-b-2 border-white rotate-45 mb-0.5" />}
            </div>
            <input type="checkbox" className="hidden" checked={checked} onChange={onChange} />
            <div className="flex flex-col min-w-0">
                <span className={`text-[11.5px] font-bold ${checked ? 'text-blue-700' : 'text-gray-700'}`}>{label}</span>
                {sub && <span className="text-[9px] text-gray-400 leading-tight font-medium mt-0.5">{sub}</span>}
            </div>
        </label>
    );

    // Compact Pillar Button
    const PillarButton = ({ pillar }: any) => (
        <button
            type="button"
            onClick={() => setActivePolicyPillar(pillar.id)}
            className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all text-left ${activePolicyPillar === pillar.id ? 'bg-blue-600 text-white shadow-xs' : 'text-gray-500 hover:bg-white hover:text-gray-800'}`}
        >
            {pillar.icon} <span className="truncate">{pillar.label}</span>
        </button>
    );

    return (
        <div className="min-h-screen bg-[#f8f9fc] text-slate-700 font-sans">
            {/* Notification Toast */}
            {notification && (
                <div className="fixed top-4 right-4 z-50 bg-emerald-600 text-white px-3.5 py-2 rounded-lg shadow-lg flex items-center gap-2 text-xs font-semibold animate-in fade-in slide-in-from-top-2">
                    <Check size={13} className="text-white" />
                    <span>{notification}</span>
                </div>
            )}

            {/* Header (Original style made compact) */}
            <header className="bg-white border-b border-gray-200/90 px-5 sm:px-6 py-2.5 flex justify-between items-center sticky top-0 z-30">
                <div className="flex items-center gap-3">
                    <button
                        type="button"
                        onClick={onBack}
                        className="p-1.5 hover:bg-gray-100 rounded-lg border border-gray-200 transition-all cursor-pointer"
                        title="Back"
                    >
                        <ArrowLeft size={16} className="text-gray-500" />
                    </button>
                    <div>
                        <div className="flex items-center gap-2">
                            <h1 className="text-base font-bold text-slate-800 tracking-tight leading-tight">
                                {initialData ? `Edit Property: ${initialData.name}` : 'Add New Property'}
                            </h1>
                            {initialData?.code && (
                                <span className="px-1.5 py-0.2 bg-blue-50 text-blue-700 border border-blue-200 rounded text-[9.5px] font-bold">
                                    {initialData.code}
                                </span>
                            )}
                        </div>
                        <p className="text-[10px] text-slate-400 font-medium leading-tight">Enterprise Policy Architecture Hub</p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <button
                        type="button"
                        onClick={() => handleSave('draft')}
                        className="px-3.5 py-1.5 hover:bg-gray-50 border border-gray-200 rounded-lg text-xs font-bold text-gray-600 transition-all cursor-pointer shadow-2xs"
                    >
                        Save Draft
                    </button>
                    <button
                        type="button"
                        onClick={() => handleSave('publish')}
                        className="px-4 py-1.5 bg-[#0052cc] hover:bg-[#0047b3] text-white rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-xs shadow-blue-500/20 active:scale-95 transition-all cursor-pointer"
                    >
                        <CheckCircle2 size={14} /> Save & Publish
                    </button>
                </div>
            </header>

            {/* Main Content Area (Original two-column structure made compact) */}
            <main className="max-w-[1500px] mx-auto p-3 sm:p-4 lg:p-5 flex flex-col lg:flex-row gap-4">
                {/* Left Sidebar Nav (Original Style made compact) */}
                <aside className="w-full lg:w-60 flex-shrink-0">
                    <nav className="bg-white rounded-xl border border-gray-200 p-1.5 shadow-2xs sticky top-16 space-y-1">
                        {tabs.map((tab) => (
                            <button
                                key={tab.id}
                                type="button"
                                onClick={() => setActiveTab(tab.id)}
                                className={`w-full flex items-center gap-2.5 px-3.5 py-2.5 rounded-lg text-xs font-bold transition-all text-left ${activeTab === tab.id ? 'bg-[#e9f0ff] text-[#0052cc] border-l-4 border-[#0052cc]' : 'text-gray-500 hover:bg-gray-50 hover:text-gray-800'}`}
                            >
                                <span className={activeTab === tab.id ? 'text-[#0052cc]' : 'text-gray-400'}>{tab.icon}</span>
                                <span className="truncate">{tab.label}</span>
                            </button>
                        ))}
                    </nav>
                </aside>

                {/* Content Card (Original Style made compact) */}
                <div className="flex-1 bg-white rounded-xl border border-gray-200 shadow-2xs min-h-[700px] overflow-hidden flex flex-col">
                    {/* TAB 1: IDENTITY & LOCATION */}
                    {activeTab === 'identity' && (
                        <div className="p-4 sm:p-5 lg:p-6 space-y-6 animate-in fade-in duration-200">
                            <div>
                                <SectionTitle icon={Building2} title="General Information" />
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3.5">
                                    <FormField label="Hotel Name" required><Input defaultValue={initialData?.name || 'Grand Palace Hotel & Suites'} placeholder="Official Property Name" /></FormField>
                                    <FormField label="Property Code" required><Input defaultValue={initialData?.code || 'GPH-DHK-01'} placeholder="e.g. HTL-DHK-01" /></FormField>
                                    <FormField label="Property Type"><Select defaultValue={initialData?.type || 'Hotel'}><option>Hotel</option><option>Resort</option><option>Apartment</option></Select></FormField>
                                    <FormField label="Grade / Star Rating"><Select defaultValue={initialData?.grade || '5 Star'}><option>5 Star</option><option>4 Star</option><option>3 Star</option></Select></FormField>
                                    <FormField label="Total Rooms Count" required><Input type="number" defaultValue={initialData?.rooms || 120} /></FormField>
                                    <FormField label="Established Year"><Input defaultValue="2018" placeholder="YYYY" /></FormField>
                                    <FormField label="Website"><Input defaultValue={initialData?.website || 'grandpalacehotel.com'} placeholder="https://..." /></FormField>
                                    <FormField label="Default Nationality"><Select><option>Bangladeshi</option><option>American</option><option>British</option></Select></FormField>
                                </div>
                            </div>

                            <div>
                                <SectionTitle icon={MapPin} title="Location & Contact" />
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3.5">
                                    <div className="md:col-span-2 lg:col-span-4">
                                        <FormField label="Address" required>
                                            <textarea className="w-full px-3 py-1.5 border border-gray-200 rounded-lg text-xs min-h-[50px] outline-none focus:ring-1 focus:ring-blue-500 text-gray-800" defaultValue={initialData?.address || 'Plot 42, Road 11, Block C, Banani'} />
                                        </FormField>
                                    </div>
                                    <FormField label="City"><Input defaultValue={initialData?.city || 'Dhaka'} placeholder="Dhaka" /></FormField>
                                    <FormField label="Country" required><Input defaultValue={initialData?.country || 'Bangladesh'} /></FormField>
                                    <FormField label="State"><Input defaultValue="Dhaka Division" placeholder="State" /></FormField>
                                    <FormField label="Zip Code"><Input defaultValue="1213" placeholder="Zip Code" /></FormField>
                                    <FormField label="Map Latitude"><Input defaultValue="23.7937" placeholder="e.g. 23.8103" /></FormField>
                                    <FormField label="Map Longitude"><Input defaultValue="90.4066" placeholder="e.g. 90.4125" /></FormField>
                                    <FormField label="Timezone" required><Select><option>GMT+6 (Asia/Dhaka)</option><option>UTC-5 (New York)</option></Select></FormField>
                                    <FormField label="Phone"><Input defaultValue={initialData?.phone || '+880 2 9876543'} placeholder="Property Phone" /></FormField>
                                    <div className="md:col-span-2">
                                        <FormField label="Email"><Input type="email" defaultValue={initialData?.email || 'reservation@grandpalace.com'} placeholder="Property Email" /></FormField>
                                    </div>
                                </div>
                            </div>

                            <div>
                                <SectionTitle icon={Zap} title="Property Amenities" />
                                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2">
                                    {Object.entries(amenities).map(([key, checked]) => (
                                        <Checkbox
                                            key={key}
                                            label={key}
                                            checked={checked}
                                            onChange={() => toggleAmenity(key)}
                                        />
                                    ))}
                                </div>
                            </div>

                            <div>
                                <SectionTitle icon={Briefcase} title="Corporate Office" />
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
                                    <FormField label="Corporate Address"><textarea className="w-full px-3 py-1.5 border border-gray-200 rounded-lg text-xs min-h-[50px] outline-none focus:ring-1 focus:ring-blue-500 text-gray-800" defaultValue={initialData?.corporate?.address || '100 Hospitality Blvd, Suite 400, Dhaka'} placeholder="Office address..." /></FormField>
                                    <FormField label="Corporate Phone"><Input defaultValue={initialData?.corporate?.phone || '+880 2 9876540'} placeholder="Corporate Phone" /></FormField>
                                    <FormField label="Corporate Email"><Input type="email" defaultValue={initialData?.corporate?.email || 'corporate@grandpalace.com'} placeholder="Corporate Email" /></FormField>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* TAB 2: OPERATIONS & POLICY */}
                    {activeTab === 'operations' && (
                        <div className="flex-1 flex overflow-hidden">
                            {/* Inner Pillar Nav (Original structure made compact) */}
                            <div className="w-56 bg-gray-50/90 border-r border-gray-100 p-2.5 space-y-1 overflow-y-auto no-scrollbar flex-shrink-0">
                                <p className="px-2.5 py-1 text-[9px] font-black text-gray-400 uppercase tracking-widest">Policy Engine Pillars</p>
                                {pillars.map(pillar => <PillarButton key={pillar.id} pillar={pillar} />)}
                            </div>

                            {/* Inner Pillar Content (Original structure made compact) */}
                            <div className="flex-1 p-4 sm:p-5 lg:p-6 overflow-y-auto animate-in slide-in-from-right-1 duration-200">
                                {activePolicyPillar === 'booking' && (
                                    <div className="space-y-5">
                                        <SectionTitle icon={Calendar} title="1. Booking & Cancellation Policies" />
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                                            <FormField label="Cancellation Rule"><Select><option>Flexible (24h)</option><option selected>Flexible (48h)</option><option>Moderate (72h)</option><option>Non-Refundable</option></Select></FormField>
                                            <FormField label="No-Show Policy"><Select><option selected>First Night Charge</option><option>Total Price Charge</option><option>Flat Fee ($50)</option></Select></FormField>
                                            <div className="md:col-span-2"><FormField label="Auto-Release Timing"><Select><option>Release at 6:00 PM (Local Time)</option><option>Hold Until Midnight</option></Select></FormField></div>
                                            <div className="md:col-span-2"><FormField label="Detailed Cancellation Text"><textarea className="w-full px-3 py-2 border border-gray-200 rounded-lg text-xs min-h-[60px] outline-none focus:ring-1 focus:ring-blue-500 text-gray-800" defaultValue="Free cancellation up to 48 hours prior to check-in date." placeholder="Terms displayed on confirmation emails..." /></FormField></div>
                                        </div>
                                        <div className="bg-blue-50/50 p-3.5 rounded-xl border border-blue-100 space-y-2.5">
                                            <p className="text-[10px] font-bold text-blue-800 uppercase italic">Automation & Grace Period</p>
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                                                <Checkbox label="Allow Grace Period?" sub="Policy override for instant booking errors" checked={true} />
                                                <FormField label="Grace Period Duration (Hours)"><Input type="number" defaultValue={2} /></FormField>
                                                <Checkbox label="Require Booking Guarantee?" sub="Mandatory CC for all non-corporate bookings" checked={true} />
                                                <Checkbox label="Auto-Charge No-Show?" sub="Execute charge during Night Audit" checked={true} />
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {activePolicyPillar === 'corporate' && (
                                    <div className="space-y-5">
                                        <SectionTitle icon={Briefcase} title="2. Corporate & Agency Management" />
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                                            <FormField label="Default City Ledger (AR) Limit"><div className="flex items-center gap-1.5 font-bold text-gray-400 text-xs"><span>$</span><Input type="number" defaultValue={5000} /></div></FormField>
                                            <FormField label="IATA Agency Commission %"><div className="flex items-center gap-1.5 font-bold text-gray-400 text-xs"><Input type="number" defaultValue={10} /><span>%</span></div></FormField>
                                        </div>
                                        <Checkbox label="Allow Bill-to-Company?" sub="Enable direct billing for recognized corporate entities" checked={true} />
                                    </div>
                                )}

                                {activePolicyPillar === 'revenue' && (
                                    <div className="space-y-5">
                                        <SectionTitle icon={Zap} title="3. Revenue & Inventory controls" />
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                                            <FormField label="Waitlist Retention Days"><Input type="number" defaultValue={3} /></FormField>
                                            <FormField label="Overbooking Limit (Rooms/%)"><Input placeholder="e.g. 5 or 5%" defaultValue="5%" /></FormField>
                                            <div className="md:col-span-2">
                                                <Checkbox label="Allow Overbooking?" sub="Trigger dashboard warnings when inventory > 100%" checked={false} />
                                            </div>
                                        </div>
                                        <div className="bg-[#fff9e6] p-3.5 rounded-xl border border-[#ffeeba] space-y-2">
                                            <div className="flex items-center gap-1.5 text-[#856404] font-black uppercase text-[10px] italic"><AlertCircle size={13} /> Waitlist Automation</div>
                                            <p className="text-[10px] text-[#856404]/80 leading-relaxed">If rooms are full, bookings go to 'Waitlist'. System will auto-email payment links if a cancellation occurs.</p>
                                            <Checkbox label="Enable Dynamic Waitlist?" checked={true} />
                                        </div>
                                    </div>
                                )}

                                {activePolicyPillar === 'arrival' && (
                                    <div className="space-y-5">
                                        <SectionTitle icon={LogIn} title="4. Arrival & Departure Protocols" />
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                                            <FormField label="Global Check-in Time"><Input type="time" defaultValue="14:00" /></FormField>
                                            <FormField label="Global Check-out Time"><Input type="time" defaultValue="12:00" /></FormField>
                                        </div>
                                        <div className="p-3.5 bg-slate-50 rounded-xl border border-gray-100 space-y-2.5">
                                            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Early Check-in Matrix</p>
                                            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                                                <FormField label="Before 06:00 AM"><Select><option>Full Night Charge</option><option>Half Night</option></Select></FormField>
                                                <FormField label="06:00 AM - 10:00 AM"><Select><option>50% Night Charge</option><option>Flat Fee</option></Select></FormField>
                                                <FormField label="10:00 AM - 01:00 PM"><Select><option>Complimentary</option><option>Fixed $20</option></Select></FormField>
                                            </div>
                                        </div>
                                        <div className="p-3.5 bg-red-50/40 rounded-xl border border-red-100 space-y-2.5">
                                            <p className="text-[10px] font-black text-red-600 uppercase tracking-widest">Early Departure (Penalty)</p>
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                                <FormField label="Departure Penalty Logic"><Select><option>Next Night/24h Rule</option><option>Charge Full Amount</option><option>Flat Fee $100</option><option>No Penalty</option></Select></FormField>
                                                <Checkbox label="Show Manager Override?" sub="Staff can waive fee with Manager reason" checked={true} />
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {activePolicyPillar === 'occupancy' && (
                                    <div className="space-y-5">
                                        <SectionTitle icon={User} title="5. Guest & Occupancy Rules" />
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                                            <FormField label="Child Age Threshold (Years)"><Input type="number" defaultValue={12} /></FormField>
                                            <FormField label="Mandatory Visitor Identity"><Select><option>All Visitors (Photo ID)</option><option>Lobby Meetings Only</option></Select></FormField>
                                        </div>
                                        <Checkbox label="Enforce 10PM Visitor Curfew?" sub="Visitors must exit guest rooms by 10:00 PM" checked={true} />
                                    </div>
                                )}

                                {activePolicyPillar === 'finance_sec' && (
                                    <div className="space-y-5">
                                        <SectionTitle icon={DollarSign} title="6. Finance & Anti-Fraud controls" />
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                                            <FormField label="Security Deposit Logic"><Select><option>Fixed Amount ($)</option><option>% of Stay Total</option></Select></FormField>
                                            <FormField label="Deposit Amount"><Input type="number" defaultValue={100} /></FormField>
                                            <FormField label="Staff Adjustment Limit"><div className="flex items-center gap-1.5 font-bold text-gray-400 text-xs"><span>$</span><Input type="number" defaultValue={10} /></div></FormField>
                                            <FormField label="Tax Adjustment Mode"><Select><option>Auto-Update with Base Rent</option><option>Manual Adjustment</option></Select></FormField>
                                        </div>
                                        <div className="bg-slate-900 p-4 rounded-xl text-white space-y-2.5">
                                            <div className="flex items-center gap-2"><ShieldAlert className="text-amber-400" size={15} /> <span className="text-xs font-black uppercase italic tracking-tight">Financial Security Protocol</span></div>
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                                <Checkbox label="Enable Deposit Ledger?" sub="Keep deposits separate from room revenue" checked={true} />
                                                <Checkbox label="Strict Refund Approval?" sub="Requires Manager/Accountant sign-off" checked={true} />
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {activePolicyPillar === 'ops' && (
                                    <div className="space-y-5">
                                        <SectionTitle icon={Settings} title="7. Operational Protocols" />
                                        <div className="p-3.5 bg-indigo-50/50 rounded-xl border border-indigo-100 space-y-3">
                                            <div className="flex items-center gap-1.5 text-indigo-700 font-black uppercase text-[10px] italic"><FileText size={13} /> Meal & Resource Mapping</div>
                                            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                                                <FormField label="Meal Plan Sync"><Select><option>Sync with POS & KOT</option><option>Voucher Based</option></Select></FormField>
                                                <FormField label="Parking Surcharge"><Input type="number" defaultValue={10} /></FormField>
                                                <FormField label="Minibar Check-in Logic"><Select><option>Daily Restock</option><option>Post-Departure</option></Select></FormField>
                                            </div>
                                        </div>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                                            <Checkbox label="Enforce Smoking Penalty?" sub="Auto-add $200 penalty and mark OOO for deep clean" checked={true} />
                                            <Checkbox label="Enable Welfare Checks?" sub="HK alert if DND/No-Entry for 24h" checked={true} />
                                        </div>
                                    </div>
                                )}

                                {activePolicyPillar === 'legal' && (
                                    <div className="space-y-5">
                                        <SectionTitle icon={ShieldCheck} title="8. Legal & Compliance" />
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                                            <FormField label="GDPR Retention (Months)"><Input type="number" defaultValue={24} /></FormField>
                                        </div>
                                        <div className="bg-red-50 p-3.5 rounded-xl border border-red-100 space-y-1.5">
                                            <div className="flex items-center gap-1.5 text-red-700 font-bold text-xs"><Zap size={13} /> Force Majeure Emergency</div>
                                            <p className="text-[10px] text-red-500">Enable global override for disaster events to bypass all standard cancellation fees.</p>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {/* TAB 3: FINANCE & ACCOUNTS */}
                    {activeTab === 'finance' && (
                        <div className="p-4 sm:p-5 lg:p-6 space-y-6 animate-in fade-in duration-200">
                            <div>
                                <SectionTitle icon={CreditCard} title="Financial Settings" />
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
                                    <div className="flex items-end gap-3 col-span-2">
                                        <div className="flex-1">
                                            <FormField label="Base Currency" required>
                                                <Select defaultValue={initialData?.currency || 'BDT'}><option>BDT</option><option>USD</option><option>EUR</option></Select>
                                            </FormField>
                                        </div>
                                        <div className="pb-1.5">
                                            <label className="flex items-center gap-1.5 cursor-pointer">
                                                <input type="checkbox" className="w-3.5 h-3.5 rounded border-gray-300 text-blue-600" />
                                                <span className="text-xs font-medium text-gray-600">Is Tax Inclusive?</span>
                                            </label>
                                        </div>
                                    </div>
                                    <FormField label="BIN / VAT No"><Input defaultValue={initialData?.finance?.binNo || 'BIN-9042-8819'} /></FormField>

                                    <FormField label="Service Charge %"><Input type="number" defaultValue="10" /></FormField>
                                    <FormField label="Credit Card Gateway">
                                        <Select><option>SSLCommerz</option><option>Stripe</option><option>PayPal</option></Select>
                                    </FormField>
                                    <div className="hidden lg:block"></div>

                                    <FormField label="Round Off Type">
                                        <Select><option>Nearest</option><option>Up</option><option>Down</option></Select>
                                    </FormField>
                                    <div className="flex items-end gap-3">
                                        <div className="flex-1">
                                            <FormField label="Round Off Limit"><Input type="number" defaultValue="1" /></FormField>
                                        </div>
                                        <div className="pb-1.5 whitespace-nowrap">
                                            <label className="flex items-center gap-1.5 cursor-pointer">
                                                <input type="checkbox" className="w-3.5 h-3.5 rounded border-gray-300 text-blue-600" defaultChecked />
                                                <span className="text-xs font-medium text-gray-600">Add Round Off to Rate?</span>
                                            </label>
                                        </div>
                                    </div>
                                    <div className="hidden lg:block"></div>

                                    <div className="col-span-1 md:col-span-2 lg:col-span-3">
                                        <FormField label="Invoice / Bill Notes (Terms)">
                                            <textarea className="w-full px-3 py-1.5 border border-gray-200 rounded-lg text-xs min-h-[60px] outline-none focus:ring-1 focus:ring-blue-500 text-gray-800" defaultValue="Payment due upon checkout. Government taxes and service charges are applicable per regulations." placeholder="Detailed terms or notes to appear on every invoice..." />
                                        </FormField>
                                    </div>
                                </div>
                            </div>

                            <div>
                                <div className="flex items-center justify-between mb-3 pb-1.5 border-b border-gray-100">
                                    <div className="flex items-center gap-2">
                                        <Building2 size={16} className="text-gray-400" />
                                        <h3 className="text-xs font-bold text-gray-700 uppercase tracking-tight">Bank Accounts</h3>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => setBankAccounts(prev => [...prev, { id: Date.now().toString(), bankName: '', accountName: '', accountNum: '', swift: '' }])}
                                        className="text-blue-600 text-xs font-bold hover:underline flex items-center gap-1 cursor-pointer"
                                    >
                                        <Plus size={13} /> Add Bank
                                    </button>
                                </div>
                                <div className="bg-gray-50/50 rounded-xl border border-gray-100 p-3 overflow-x-auto">
                                    <table className="w-full border-spacing-x-2 border-separate text-xs">
                                        <thead>
                                            <tr className="text-left">
                                                <th className="text-[9.5px] font-black text-gray-400 uppercase tracking-wider pb-2">Bank Name</th>
                                                <th className="text-[9.5px] font-black text-gray-400 uppercase tracking-wider pb-2">Account Name</th>
                                                <th className="text-[9.5px] font-black text-gray-400 uppercase tracking-wider pb-2">Account Number</th>
                                                <th className="text-[9.5px] font-black text-gray-400 uppercase tracking-wider pb-2">Swift/Routing</th>
                                                <th className="w-8"></th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {bankAccounts.map((acc) => (
                                                <tr key={acc.id}>
                                                    <td className="pb-1.5"><Input className="!h-7 !py-1 text-xs" defaultValue={acc.bankName} /></td>
                                                    <td className="pb-1.5"><Input className="!h-7 !py-1 text-xs" defaultValue={acc.accountName} /></td>
                                                    <td className="pb-1.5"><Input className="!h-7 !py-1 text-xs font-mono" defaultValue={acc.accountNum} /></td>
                                                    <td className="pb-1.5"><Input className="!h-7 !py-1 text-xs font-mono" defaultValue={acc.swift} /></td>
                                                    <td className="pb-1.5 text-center">
                                                        <button
                                                            type="button"
                                                            onClick={() => setBankAccounts(prev => prev.filter(b => b.id !== acc.id))}
                                                            className="text-gray-400 hover:text-red-500 transition-colors p-1"
                                                        >
                                                            <Trash2 size={14} />
                                                        </button>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* TAB 4: SYSTEM & INTERFACES */}
                    {activeTab === 'system' && (
                        <div className="p-4 sm:p-5 lg:p-6 space-y-6 animate-in fade-in duration-200">
                            <div>
                                <SectionTitle icon={Monitor} title="System Configuration" />
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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

                                <div className="mt-4">
                                    <p className="text-[11px] font-bold text-gray-500 mb-2 ml-0.5">Active Modules</p>
                                    <div className="flex flex-wrap gap-2">
                                        <Checkbox label="Front Office" checked={true} />
                                        <Checkbox label="POS" checked={true} />
                                        <Checkbox label="Housekeeping" checked={true} />
                                        <Checkbox label="HR/Payroll" checked={false} />
                                        <Checkbox label="Banquets" checked={true} />
                                    </div>
                                </div>

                                <div className="mt-5">
                                    <div className="flex items-center justify-between mb-2">
                                        <p className="text-[11px] font-bold text-gray-500 ml-0.5 uppercase tracking-tight">POS Outlets Setup</p>
                                        <button
                                            type="button"
                                            onClick={() => setPosOutlets(prev => [...prev, { id: Date.now().toString(), type: 'New Outlet', count: 1 }])}
                                            className="text-blue-600 text-xs font-bold hover:underline flex items-center gap-1 cursor-pointer"
                                        >
                                            <Plus size={13} /> Add Config
                                        </button>
                                    </div>
                                    <div className="space-y-2">
                                        {posOutlets.map((outlet) => (
                                            <div key={outlet.id} className="flex gap-3 items-center bg-gray-50/50 p-2 rounded-lg border border-gray-100">
                                                <div className="flex-1">
                                                    <Select defaultValue={outlet.type} className="!h-7.5">
                                                        <option>Restaurant</option>
                                                        <option>Rooftop Cafe & Lounge</option>
                                                        <option>Spa</option>
                                                        <option>Gym</option>
                                                    </Select>
                                                </div>
                                                <div className="w-20"><Input type="number" defaultValue={outlet.count} className="!h-7.5" /></div>
                                                <button
                                                    type="button"
                                                    onClick={() => setPosOutlets(prev => prev.filter(o => o.id !== outlet.id))}
                                                    className="p-1.5 text-gray-400 hover:text-red-500 transition-colors border border-gray-100 rounded-lg hover:bg-white"
                                                >
                                                    <Trash2 size={14} />
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                <div className="mt-4">
                                    <div className="bg-gray-50/50 p-2.5 rounded-lg border border-gray-100 inline-block">
                                        <Checkbox label="Auto-Email Folio on Checkout" checked={true} />
                                    </div>
                                </div>
                            </div>

                            <div>
                                <SectionTitle icon={Settings} title="Interfaces & APIs" />
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <FormField label="Key Card System">
                                        <Select><option>VingCard</option><option>Assa Abloy</option><option>Manual Keys</option></Select>
                                    </FormField>
                                    <FormField label="Channel Manager">
                                        <Select><option>SiteMinder</option><option>Cloudbeds</option><option>Staah</option></Select>
                                    </FormField>
                                    <div className="md:col-span-2">
                                        <FormField label="SMS Gateway API Key">
                                            <Input placeholder="Enter API Key provided by your SMS vendor" defaultValue="sk_sms_live_9024817a0b8f2c" />
                                        </FormField>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* TAB 5: BRANDING & POC */}
                    {activeTab === 'branding' && (
                        <div className="p-4 sm:p-5 lg:p-6 space-y-6 animate-in fade-in duration-200">
                            <div>
                                <SectionTitle icon={Image} title="Branding & Assets" />
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                                    {[
                                        { label: 'Primary Logo *', desc: 'Main Logo (Dashboard/Footer)' },
                                        { label: 'Report Header', desc: 'Report Banner (Header)' },
                                        { label: 'Report Footer', desc: 'Official Stamped Footer' },
                                        { label: 'Portal Cover', desc: 'Guest Portal / Login Cover' }
                                    ].map((box) => (
                                        <div key={box.label} className="space-y-1">
                                            <label className="text-[10.5px] font-bold text-gray-500 ml-0.5">{box.label}</label>
                                            <div className="border border-dashed border-gray-200 rounded-xl p-3.5 flex flex-col items-center justify-center gap-1.5 hover:border-blue-400 hover:bg-blue-50/20 transition-all cursor-pointer group">
                                                <div className="w-8 h-8 bg-gray-50 rounded-full flex items-center justify-center text-gray-400 group-hover:text-blue-500 transition-colors">
                                                    <Image size={16} />
                                                </div>
                                                <p className="text-[9.5px] font-bold text-gray-400 uppercase tracking-wider text-center">{box.desc}</p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5 mt-4">
                                    <FormField label="Facebook URL"><Input defaultValue="https://facebook.com/grandpalacehotel" placeholder="facebook.com/page" /></FormField>
                                    <FormField label="Instagram URL"><Input defaultValue="https://instagram.com/grandpalacehotel" placeholder="instagram.com/page" /></FormField>
                                    <FormField label="TripAdvisor Link"><Input defaultValue="https://tripadvisor.com/hotel_review" placeholder="tripadvisor.com/hotel" /></FormField>
                                </div>
                            </div>

                            <div>
                                <div className="flex items-center justify-between mb-3 pb-1.5 border-b border-gray-100">
                                    <div className="flex items-center gap-2">
                                        <User size={16} className="text-gray-400" />
                                        <h3 className="text-xs font-bold text-gray-700 uppercase tracking-tight">Key Contacts (POC)</h3>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => setContacts(prev => [...prev, { id: Date.now().toString(), role: 'Manager', name: '', phone: '', email: '' }])}
                                        className="text-blue-600 text-xs font-bold hover:underline flex items-center gap-1 cursor-pointer"
                                    >
                                        <Plus size={13} /> Add Contact
                                    </button>
                                </div>
                                <div className="bg-gray-50/50 rounded-xl border border-gray-100 p-3 overflow-x-auto">
                                    <table className="w-full border-spacing-x-2 border-separate text-xs">
                                        <thead>
                                            <tr className="text-left">
                                                <th className="text-[9.5px] font-black text-gray-400 uppercase tracking-wider pb-2">Role</th>
                                                <th className="text-[9.5px] font-black text-gray-400 uppercase tracking-wider pb-2">Name</th>
                                                <th className="text-[9.5px] font-black text-gray-400 uppercase tracking-wider pb-2">Phone</th>
                                                <th className="text-[9.5px] font-black text-gray-400 uppercase tracking-wider pb-2">Email</th>
                                                <th className="w-8"></th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {contacts.map((c) => (
                                                <tr key={c.id}>
                                                    <td className="pb-1.5"><Input className="!h-7 !py-1 text-xs" defaultValue={c.role} /></td>
                                                    <td className="pb-1.5"><Input className="!h-7 !py-1 text-xs" defaultValue={c.name} /></td>
                                                    <td className="pb-1.5"><Input className="!h-7 !py-1 text-xs" defaultValue={c.phone} /></td>
                                                    <td className="pb-1.5"><Input className="!h-7 !py-1 text-xs" defaultValue={c.email} /></td>
                                                    <td className="pb-1.5 text-center">
                                                        <button
                                                            type="button"
                                                            onClick={() => setContacts(prev => prev.filter(x => x.id !== c.id))}
                                                            className="text-gray-400 hover:text-red-500 transition-colors p-1"
                                                        >
                                                            <Trash2 size={14} />
                                                        </button>
                                                    </td>
                                                </tr>
                                            ))}
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
