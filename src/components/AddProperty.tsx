import { useState } from 'react';
import {
    Save, ArrowLeft, Image as ImageIcon, Building2, MapPin, Clock,
    CreditCard, Settings, Monitor, Shield, User, Trash2, Plus, Moon
} from 'lucide-react';

interface AddPropertyProps {
    onBack: () => void;
    initialData?: any;
}

interface PosConfig {
    id: number;
    type: string;
    count: number;
}

interface BankAccount {
    id: number;
    bankName: string;
    accountName: string;
    accountNum: string;
    swift: string;
}

interface Poc {
    id: number;
    role: string;
    name: string;
    phone: string;
    email: string;
}

const AddProperty = ({ onBack, initialData }: AddPropertyProps) => {
    const [activeTab, setActiveTab] = useState('identity');
    const [posConfigs, setPosConfigs] = useState<PosConfig[]>([{ id: 1, type: 'Restaurant', count: 1 }]);
    const [bankAccounts, setBankAccounts] = useState<BankAccount[]>(initialData?.finance?.bankAccounts || [{ id: 1, bankName: '', accountName: '', accountNum: '', swift: '' }]);
    const [pocs, setPocs] = useState<Poc[]>(initialData?.pocs || [{ id: 1, role: 'General Manager', name: '', phone: '', email: '' }]);
    const [activeModules, setActiveModules] = useState<string[]>(['Front Office', 'Housekeeping']);
    const [weekends, setWeekends] = useState<string[]>(initialData?.operations?.weekends || ['Fri', 'Sat']);

    // --- New State Variables for Added Fields ---
    const [defaultNationality, setDefaultNationality] = useState('Bangladeshi');
    const [mapCoordinates, setMapCoordinates] = useState({ lat: '', lng: '' });
    const [stateCaption, setStateCaption] = useState('State');
    const [zipCaption, setZipCaption] = useState('Zip Code');

    // Operations
    const [timeFormat, setTimeFormat] = useState('24h');
    const [dateFormat, setDateFormat] = useState('DD-MM-YYYY');
    const [defaultSalutation, setDefaultSalutation] = useState('Mr.');
    const [defaultIdentity, setDefaultIdentity] = useState('NID');
    const [defaultBillTo, setDefaultBillTo] = useState('Guest');
    const [cancellationPolicyText, setCancellationPolicyText] = useState('');

    // Finance
    const [isTaxInclusive, setIsTaxInclusive] = useState(false);
    const [roundOffType, setRoundOffType] = useState('Nearest');
    const [roundOffLimit, setRoundOffLimit] = useState(1.00);
    const [addRoundOffToRate, setAddRoundOffToRate] = useState(false);
    const [serviceCharge, setServiceCharge] = useState(10);
    const [creditCardGateway, setCreditCardGateway] = useState('Stripe');

    // System
    const [webRateMode, setWebRateMode] = useState('Regular');
    const [webInventoryMode, setWebInventoryMode] = useState('Regular (Live)');
    const [autoEmailFolio, setAutoEmailFolio] = useState(true);
    const [posConfigType, setPosConfigType] = useState('Integrated POS'); // vs Third-party

    // POS Handlers
    const addPosConfig = () => setPosConfigs([...posConfigs, { id: Date.now(), type: 'Restaurant', count: 1 }]);
    const removePosConfig = (id: number) => setPosConfigs(posConfigs.filter(cfg => cfg.id !== id));
    const updatePosConfig = (id: number, field: keyof PosConfig, value: string | number) => {
        setPosConfigs(posConfigs.map(cfg => cfg.id === id ? { ...cfg, [field]: value } : cfg));
    };

    // Bank Handlers
    const addBank = () => setBankAccounts([...bankAccounts, { id: Date.now(), bankName: '', accountName: '', accountNum: '', swift: '' }]);
    const removeBank = (id: number) => setBankAccounts(bankAccounts.filter(b => b.id !== id));
    const updateBank = (id: number, field: keyof BankAccount, value: string) => {
        setBankAccounts(bankAccounts.map(b => b.id === id ? { ...b, [field]: value } : b));
    };

    // POC Handlers
    const addPoc = () => setPocs([...pocs, { id: Date.now(), role: 'General Manager', name: '', phone: '', email: '' }]);
    const removePoc = (id: number) => setPocs(pocs.filter(p => p.id !== id));
    const updatePoc = (id: number, field: keyof Poc, value: string) => {
        setPocs(pocs.map(p => p.id === id ? { ...p, [field]: value } : p));
    };

    // Module Handler
    const toggleModule = (module: string) => {
        setActiveModules(prev => prev.includes(module) ? prev.filter(m => m !== module) : [...prev, module]);
    };

    // Policy State
    const [cancellationPolicy, setCancellationPolicy] = useState(initialData?.operations?.cancellation || 'Flexible');
    const [noShowPolicy, setNoShowPolicy] = useState('Charge 1st Night');
    const [smokingPolicy, setSmokingPolicy] = useState(initialData?.operations?.smoking || 'Non-Smoking Property');
    const [petPolicy, setPetPolicy] = useState('Not Allowed');
    const [visitorPolicy, setVisitorPolicy] = useState('Not Allowed in Room');
    const [regCardTerms, setRegCardTerms] = useState(initialData?.operations?.regCardTerms || '');

    // Finance State
    const [invoiceTerms, setInvoiceTerms] = useState(initialData?.finance?.invoiceTerms || '');

    // Identity State
    const [selectedAmenities, setSelectedAmenities] = useState<string[]>(initialData?.amenities || ['WiFi', 'Parking']);
    const toggleAmenity = (item: string) => setSelectedAmenities(prev => prev.includes(item) ? prev.filter(a => a !== item) : [...prev, item]);

    // Automation State (Restored)
    const [auditTime, setAuditTime] = useState(initialData?.automation?.auditTime || "02:00");
    const [emailReports, setEmailReports] = useState(initialData?.automation?.email || "");
    const [autoRun, setAutoRun] = useState(initialData?.automation?.autoRun || false);
    const [autoPostRent, setAutoPostRent] = useState(initialData?.automation?.autoPostRent || true);
    const [forceClosePos, setForceClosePos] = useState(initialData?.automation?.forceClosePos || true);
    const [blockLogin, setBlockLogin] = useState(initialData?.automation?.blockLogin || false);
    const [autoBackup, setAutoBackup] = useState(initialData?.automation?.autoBackup || true);
    const [selectedReports, setSelectedReports] = useState<string[]>(initialData?.automation?.reports || ['Daily Revenue', 'Occupancy Report']);

    const toggleReport = (report: string) => {
        setSelectedReports(prev => prev.includes(report) ? prev.filter(r => r !== report) : [...prev, report]);
    };

    // Policy Descriptions
    const policyDescriptions: { [key: string]: { [key: string]: string } } = {
        cancellation: {
            'Flexible': 'Free cancellation up to 24h before check-in',
            'Moderate': 'Charge 1st night if cancelled within 48h',
            'Strict': 'Non-refundable booking (100% charge)'
        },
        noShow: {
            'Charge 1st Night': 'Guest charged for the first night only',
            'Charge Full Amount': 'Guest charged for the entire stay duration'
        },
        smoking: {
            'Non-Smoking Property': 'Smoking is strictly prohibited in all areas',
            'Smoking Allowed': 'Smoking is allowed in rooms and common areas',
            'Designated Areas Only': 'Smoking allowed only in specific zones (Balcony/Lobby)'
        },
        pet: {
            'Not Allowed': 'Pets are not permitted on the property',
            'Allowed (Free)': 'Pets allowed at no extra cost',
            'Allowed (Paid)': 'Pets allowed with a daily cleaning fee'
        },
        visitor: {
            'Not Allowed in Room': 'Visitors must meet guests in the lobby only',
            'Allowed till 10 PM': 'Visitors allowed in room until 10:00 PM',
            'ID Required': 'Visitors allowed with valid Photo ID registration'
        }
    };

    const tabs = [
        { id: 'identity', label: 'Identity & Location', icon: <Building2 size={18} /> },
        { id: 'operations', label: 'Operations & Policy', icon: <Clock size={18} /> },
        { id: 'finance', label: 'Finance & Accounts', icon: <CreditCard size={18} /> },
        { id: 'system', label: 'System & Interfaces', icon: <Monitor size={18} /> },
        { id: 'branding', label: 'Branding & POC', icon: <User size={18} /> },
    ];

    return (
        <div className="min-h-screen bg-gray-50 text-gray-800 font-sans">
            {/* Header */}
            <header className="bg-white border-b sticky top-0 z-10 px-4 py-3 flex justify-between items-center shadow-sm">
                <div className="flex items-center gap-3">
                    <button onClick={onBack} className="p-2 hover:bg-gray-100 rounded-full text-gray-600">
                        <ArrowLeft size={20} />
                    </button>
                    <div>
                        <h1 className="text-xl font-bold text-gray-800">{initialData ? 'Edit Property' : 'Add New Property'}</h1>
                        <p className="text-xs text-gray-500">Configure your hotel settings and details</p>
                    </div>
                </div>
                <div className="flex gap-2">
                    <button className="px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium text-sm">Save Draft</button>
                    <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium text-sm flex items-center gap-2">
                        <Save size={16} /> Save & Publish
                    </button>
                </div>
            </header>

            {/* Main Content */}
            <main className="max-w-7xl mx-auto p-4 md:p-6 lg:p-8">
                <div className="flex flex-col md:flex-row gap-6">
                    {/* Tabs Sidebar */}
                    <div className="w-full md:w-56 flex-shrink-0 space-y-3">
                        <nav className="bg-white rounded-lg shadow-sm border border-gray-200 flex flex-col sticky top-24 overflow-hidden">
                            {tabs.map((tab) => (
                                <button
                                    key={tab.id}
                                    onClick={() => setActiveTab(tab.id)}
                                    className={`flex items-center gap-3 px-4 py-4 text-sm font-medium transition-colors w-full text-left border-l-4 ${activeTab === tab.id
                                        ? 'border-blue-600 bg-blue-50 text-blue-700'
                                        : 'border-transparent text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                                        }`}
                                >
                                    {tab.icon}
                                    <span>{tab.label}</span>
                                </button>
                            ))}
                        </nav>

                        <div className="p-4 bg-blue-50/50 rounded-lg border border-blue-100 text-xs text-blue-800">
                            <strong>Tip:</strong> You can save as "Draft" at any time and resume later.
                        </div>
                    </div>

                    {/* Form Content */}
                    <div className="flex-1 bg-white rounded-lg shadow-sm border border-gray-200 p-6 min-h-[600px]">

                        {/* TAB 1: IDENTITY & LOCATION */}
                        {activeTab === 'identity' && (
                            <div className="space-y-8 animate-fadeIn">
                                {/* Section 1: General Info */}
                                <div>
                                    <h2 className="text-lg font-semibold border-b pb-2 mb-4 flex items-center gap-2"><Building2 size={20} className="text-gray-400" /> General Information</h2>
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                        <div className="space-y-1 col-span-2">
                                            <label className="text-sm font-medium text-gray-700">Hotel Name <span className="text-red-500">*</span></label>
                                            <input type="text" defaultValue={initialData?.name} placeholder="Official Property Name" className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" />
                                        </div>
                                        <div className="space-y-1">
                                            <label className="text-sm font-medium text-gray-700">Property Code <span className="text-red-500">*</span></label>
                                            <input type="text" defaultValue={initialData?.id ? `HTL-${initialData.id.toString().padStart(2, '0')}` : ''} placeholder="e.g. HTL-DHK-01" className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" />
                                        </div>

                                        <div className="space-y-1">
                                            <label className="text-sm font-medium text-gray-700">Property Type</label>
                                            <select defaultValue="Hotel" className="w-full px-3 py-2 border rounded-lg bg-white outline-none">
                                                <option>Hotel</option><option>Resort</option><option>Guest House</option><option>Motel</option><option>Apartment</option>
                                            </select>
                                        </div>
                                        <div className="space-y-1">
                                            <label className="text-sm font-medium text-gray-700">Grade / Star Rating</label>
                                            <select defaultValue={initialData?.grade || '5 Star'} className="w-full px-3 py-2 border rounded-lg bg-white outline-none">
                                                <option>5 Star</option><option>4 Star</option><option>3 Star</option><option>2 Star</option><option>1 Star</option><option>Luxury</option>
                                            </select>
                                        </div>
                                        <div className="space-y-1">
                                            <label className="text-sm font-medium text-gray-700">Total Rooms Count <span className="text-red-500">*</span></label>
                                            <input type="number" defaultValue={initialData?.rooms} className="w-full px-3 py-2 border rounded-lg outline-none" />
                                        </div>

                                        <div className="space-y-1">
                                            <label className="text-sm font-medium text-gray-700">Established Year</label>
                                            <input type="number" defaultValue={initialData?.established} placeholder="YYYY" className="w-full px-3 py-2 border rounded-lg outline-none" />
                                        </div>
                                        <div className="space-y-1 col-span-2">
                                            <label className="text-sm font-medium text-gray-700">Website</label>
                                            <input type="text" defaultValue={initialData?.website} placeholder="https://" className="w-full px-3 py-2 border rounded-lg outline-none" />
                                        </div>
                                        <div className="space-y-1">
                                            <label className="text-sm font-medium text-gray-700">Default Nationality</label>
                                            <select value={defaultNationality} onChange={(e) => setDefaultNationality(e.target.value)} className="w-full px-3 py-2 border rounded-lg bg-white outline-none">
                                                <option>Bangladeshi</option><option>Malaysian</option><option>Indian</option><option>American</option><option>British</option>
                                            </select>
                                        </div>
                                    </div>
                                </div>

                                {/* Section 2: Location */}
                                <div>
                                    <h2 className="text-lg font-semibold border-b pb-2 mb-4 flex items-center gap-2"><MapPin size={20} className="text-gray-400" /> Location & Contact</h2>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <div className="col-span-2 space-y-1">
                                            <label className="text-sm font-medium text-gray-700">Address <span className="text-red-500">*</span></label>
                                            <textarea rows={2} defaultValue={initialData?.address} className="w-full px-3 py-2 border rounded-lg outline-none"></textarea>
                                        </div>

                                        <div className="space-y-1"><label className="text-sm font-medium text-gray-700">City</label><select defaultValue={initialData?.city} className="w-full px-3 py-2 border rounded-lg bg-white outline-none"><option>Dhaka</option><option>Miami</option><option>London</option></select></div>
                                        <div className="space-y-1"><label className="text-sm font-medium text-gray-700">Country <span className="text-red-500">*</span></label><select defaultValue={initialData?.country} className="w-full px-3 py-2 border rounded-lg bg-white outline-none"><option>Bangladesh</option><option>Malaysia</option><option>USA</option><option>UK</option></select></div>

                                        {/* Dynamic Captions */}
                                        <div className="space-y-1">
                                            <label className="text-xs text-gray-500 flex justify-between"><span>Region Caption</span> <input type="text" value={stateCaption} onChange={(e) => setStateCaption(e.target.value)} className="w-20 text-right border-b outline-none text-[10px]" /></label>
                                            <input type="text" placeholder={stateCaption} className="w-full px-3 py-2 border rounded-lg outline-none" />
                                        </div>
                                        <div className="space-y-1">
                                            <label className="text-xs text-gray-500 flex justify-between"><span>Zip Caption</span> <input type="text" value={zipCaption} onChange={(e) => setZipCaption(e.target.value)} className="w-20 text-right border-b outline-none text-[10px]" /></label>
                                            <input type="text" placeholder={zipCaption} className="w-full px-3 py-2 border rounded-lg outline-none" />
                                        </div>

                                        <div className="space-y-1"><label className="text-sm font-medium text-gray-700">Map Latitude</label><input type="text" value={mapCoordinates.lat} onChange={(e) => setMapCoordinates({ ...mapCoordinates, lat: e.target.value })} placeholder="e.g. 23.8103" className="w-full px-3 py-2 border rounded-lg outline-none" /></div>
                                        <div className="space-y-1"><label className="text-sm font-medium text-gray-700">Map Longitude</label><input type="text" value={mapCoordinates.lng} onChange={(e) => setMapCoordinates({ ...mapCoordinates, lng: e.target.value })} placeholder="e.g. 90.4125" className="w-full px-3 py-2 border rounded-lg outline-none" /></div>

                                        <div className="space-y-1"><label className="text-sm font-medium text-gray-700">Timezone <span className="text-red-500">*</span></label><select className="w-full px-3 py-2 border rounded-lg bg-white outline-none"><option>GMT+6 (Asia/Dhaka)</option></select></div>
                                        <div className="space-y-1"><label className="text-sm font-medium text-gray-700">Phone</label><input type="text" defaultValue={initialData?.phone} className="w-full px-3 py-2 border rounded-lg outline-none" /></div>
                                        <div className="space-y-1"><label className="text-sm font-medium text-gray-700">Email</label><input type="email" defaultValue={initialData?.email} className="w-full px-3 py-2 border rounded-lg outline-none" /></div>

                                        <div className="col-span-1 md:col-span-2 mt-4 pt-4 border-t">
                                            <h3 className="text-sm font-bold text-gray-900 mb-4">Property Amenities</h3>
                                            <div className="flex flex-wrap gap-2">
                                                {['WiFi', 'Parking', 'Swimming Pool', 'Gym', 'Spa', 'Restaurant', 'Bar', 'Room Service', 'Conference Room', 'Airport Shuttle', 'Wheelchair Accessible', 'Elevator'].map(item => (
                                                    <label key={item} className={`flex items-center gap-2 px-3 py-2 rounded border cursor-pointer transition-colors ${selectedAmenities.includes(item) ? 'bg-blue-50 border-blue-200 text-blue-700' : 'hover:bg-gray-50'}`}>
                                                        <input type="checkbox" checked={selectedAmenities.includes(item)} onChange={() => toggleAmenity(item)} className="rounded text-blue-600" />
                                                        <span className="text-sm font-medium">{item}</span>
                                                    </label>
                                                ))}
                                            </div>
                                        </div>

                                        <div className="col-span-1 md:col-span-2 mt-4 pt-4 border-t">
                                            <h3 className="text-sm font-bold text-gray-900 mb-4">Corporate Office</h3>
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                                <div className="col-span-2 space-y-1">
                                                    <label className="text-sm font-medium text-gray-700">Corporate Address</label>
                                                    <textarea rows={2} defaultValue={initialData?.corporate?.address} placeholder="Office address..." className="w-full px-3 py-2 border rounded-lg outline-none"></textarea>
                                                </div>
                                                <div className="space-y-1"><label className="text-sm font-medium text-gray-700">Corporate Phone</label><input type="text" defaultValue={initialData?.corporate?.phone} className="w-full px-3 py-2 border rounded-lg outline-none" /></div>
                                                <div className="space-y-1"><label className="text-sm font-medium text-gray-700">Corporate Email</label><input type="email" defaultValue={initialData?.corporate?.email} className="w-full px-3 py-2 border rounded-lg outline-none" /></div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* TAB 2: OPERATIONS & POLICY */}
                        {activeTab === 'operations' && (
                            <div className="space-y-8 animate-fadeIn">

                                {/* 1. Timing & Schedules */}
                                <div>
                                    <h2 className="text-lg font-semibold border-b pb-2 mb-4 flex items-center gap-2"><Clock size={20} className="text-gray-400" /> 1. Operations & Defaults</h2>
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">

                                        {/* Formats */}
                                        <div className="space-y-1"><label className="text-sm font-medium text-gray-700">Time Format</label><select value={timeFormat} onChange={(e) => setTimeFormat(e.target.value)} className="w-full px-3 py-2 border rounded-lg bg-white outline-none"><option>24 Hours (14:00)</option><option>12 Hours (02:00 PM)</option></select></div>
                                        <div className="space-y-1"><label className="text-sm font-medium text-gray-700">Date Format</label><select value={dateFormat} onChange={(e) => setDateFormat(e.target.value)} className="w-full px-3 py-2 border rounded-lg bg-white outline-none"><option>DD-MM-YYYY</option><option>MM/DD/YYYY</option><option>YYYY-MM-DD</option></select></div>

                                        <div className="space-y-1"><label className="text-sm font-medium text-gray-700">Check-in Time</label><input type="time" defaultValue={initialData?.operations?.checkIn || "14:00"} className="w-full px-3 py-2 border rounded-lg outline-none" /></div>
                                        <div className="space-y-1"><label className="text-sm font-medium text-gray-700">Check-out Time</label><input type="time" defaultValue={initialData?.operations?.checkOut || "12:00"} className="w-full px-3 py-2 border rounded-lg outline-none" /></div>

                                        <div className="space-y-1"><label className="text-sm font-medium text-gray-700">Default Salutation</label><select value={defaultSalutation} onChange={(e) => setDefaultSalutation(e.target.value)} className="w-full px-3 py-2 border rounded-lg bg-white outline-none"><option>Mr.</option><option>Ms.</option><option>Mrs.</option><option>Dr.</option></select></div>
                                        <div className="space-y-1"><label className="text-sm font-medium text-gray-700">Default Identity</label><select value={defaultIdentity} onChange={(e) => setDefaultIdentity(e.target.value)} className="w-full px-3 py-2 border rounded-lg bg-white outline-none"><option>NID</option><option>Passport</option><option>Driving License</option></select></div>
                                        <div className="space-y-1"><label className="text-sm font-medium text-gray-700">Default Bill To</label><select value={defaultBillTo} onChange={(e) => setDefaultBillTo(e.target.value)} className="w-full px-3 py-2 border rounded-lg bg-white outline-none"><option>Guest</option><option>Company</option></select></div>

                                        <div className="col-span-1 md:col-span-2 lg:col-span-4 space-y-1">
                                            <label className="text-sm font-medium text-gray-700 block mb-2">Weekend Selection (for special pricing)</label>
                                            <div className="flex gap-2 flex-wrap">
                                                {['Fri', 'Sat', 'Sun', 'Thu'].map(day => (
                                                    <label key={day} className="flex items-center gap-2 text-sm bg-gray-50 px-3 py-2 rounded border cursor-pointer hover:bg-white hover:shadow-sm transition-all">
                                                        <input type="checkbox" checked={weekends.includes(day)} onChange={() => {
                                                            setWeekends(prev => prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day])
                                                        }} className="rounded text-blue-600 w-4 h-4" /> <span className="font-medium">{day}</span>
                                                    </label>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* 2. Policies */}
                                <div>
                                    <h2 className="text-lg font-semibold border-b pb-2 mb-4 flex items-center gap-2"><CreditCard size={20} className="text-gray-400" /> 2. Booking & Cancellation Policies</h2>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <div className="space-y-1">
                                            <label className="text-sm font-medium text-gray-700">Cancellation Rule</label>
                                            <select value={cancellationPolicy} onChange={(e) => setCancellationPolicy(e.target.value)} className="w-full px-3 py-2 border rounded-lg bg-white outline-none">
                                                <option value="Flexible">Flexible (24h)</option>
                                                <option value="Moderate">Moderate (48h)</option>
                                                <option value="Strict">Strict (Non-refundable)</option>
                                            </select>
                                            <p className="text-xs text-blue-600 mt-1">{policyDescriptions.cancellation[cancellationPolicy]}</p>
                                        </div>
                                        <div className="space-y-1">
                                            <label className="text-sm font-medium text-gray-700">No-Show Policy</label>
                                            <select value={noShowPolicy} onChange={(e) => setNoShowPolicy(e.target.value)} className="w-full px-3 py-2 border rounded-lg bg-white outline-none">
                                                <option>Charge 1st Night</option>
                                                <option>Charge Full Amount</option>
                                            </select>
                                            <p className="text-xs text-blue-600 mt-1">{policyDescriptions.noShow[noShowPolicy]}</p>
                                        </div>
                                        <div className="col-span-2 space-y-1">
                                            <label className="text-sm font-medium text-gray-700">Detailed Cancellation Policy Text</label>
                                            <textarea value={cancellationPolicyText} onChange={(e) => setCancellationPolicyText(e.target.value)} rows={4} className="w-full px-3 py-2 border rounded-lg outline-none" placeholder="Enter the full text of the cancellation policy to be displayed on booking confirmations..."></textarea>
                                        </div>
                                        <div className="col-span-2 space-y-1">
                                            <label className="text-sm font-medium text-gray-700">Guest Registration Card Terms</label>
                                            <textarea value={regCardTerms} onChange={(e) => setRegCardTerms(e.target.value)} rows={3} className="w-full px-3 py-2 border rounded-lg outline-none" placeholder="Terms & Conditions printed on the Guest Registration Card..."></textarea>
                                        </div>
                                    </div>
                                </div>

                                {/* 3. House Rules */}
                                <div>
                                    <h2 className="text-lg font-semibold border-b pb-2 mb-4 flex items-center gap-2"><Shield size={20} className="text-gray-400" /> 3. House Rules</h2>
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                                        <div className="space-y-1">
                                            <label className="text-sm font-medium text-gray-700">Smoking Policy</label>
                                            <select value={smokingPolicy} onChange={(e) => setSmokingPolicy(e.target.value)} className="w-full px-3 py-2 border rounded-lg bg-white outline-none">
                                                <option>Non-Smoking Property</option>
                                                <option>Smoking Allowed</option>
                                                <option>Designated Areas Only</option>
                                            </select>
                                            <p className="text-xs text-blue-600 mt-1">{policyDescriptions.smoking[smokingPolicy]}</p>
                                        </div>
                                        <div className="space-y-1">
                                            <label className="text-sm font-medium text-gray-700">Pet Policy</label>
                                            <select value={petPolicy} onChange={(e) => setPetPolicy(e.target.value)} className="w-full px-3 py-2 border rounded-lg bg-white outline-none">
                                                <option>Not Allowed</option>
                                                <option>Allowed (Free)</option>
                                                <option>Allowed (Paid)</option>
                                            </select>
                                            <p className="text-xs text-blue-600 mt-1">{policyDescriptions.pet[petPolicy]}</p>
                                        </div>
                                        <div className="space-y-1 col-span-2">
                                            <label className="text-sm font-medium text-gray-700">Visitor Policy</label>
                                            <select value={visitorPolicy} onChange={(e) => setVisitorPolicy(e.target.value)} className="w-full px-3 py-2 border rounded-lg bg-white outline-none">
                                                <option>Not Allowed in Room</option>
                                                <option>Allowed till 10 PM</option>
                                                <option>ID Required</option>
                                            </select>
                                            <p className="text-xs text-blue-600 mt-1">{policyDescriptions.visitor[visitorPolicy]}</p>
                                        </div>
                                    </div>
                                </div>

                                {/* 6. Night Audit Automation */}
                                <div>
                                    <h2 className="text-lg font-semibold border-b pb-2 mb-4 flex items-center gap-2"><Moon size={20} className="text-gray-400" /> 4. Night Audit Automation</h2>
                                    <div className="space-y-6">
                                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                                            <div className="space-y-1">
                                                <label className="text-sm font-medium text-gray-700">Audit Time</label>
                                                <input type="time" value={auditTime} onChange={(e) => setAuditTime(e.target.value)} className="w-full px-3 py-2 border rounded-lg outline-none" />
                                                <p className="text-xs text-gray-500">When the business date changes (e.g., 02:00 AM)</p>
                                            </div>
                                            <div className="space-y-1 col-span-2">
                                                <label className="text-sm font-medium text-gray-700">Email Reports To</label>
                                                <input type="email" value={emailReports} onChange={(e) => setEmailReports(e.target.value)} placeholder="owner@hotel.com, manager@hotel.com" className="w-full px-3 py-2 border rounded-lg outline-none" />
                                                <p className="text-xs text-gray-500">Comma separated emails for daily reports</p>
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                            <label className="flex flex-col p-3 bg-gray-50 rounded border cursor-pointer hover:bg-gray-100 transition-colors gap-2">
                                                <div className="flex justify-between items-center w-full">
                                                    <span className="text-sm font-medium text-gray-700">Auto-Run Audit?</span>
                                                    <input type="checkbox" checked={autoRun} onChange={() => setAutoRun(!autoRun)} className="toggle toggle-sm text-blue-600" />
                                                </div>
                                                <span className="text-xs text-gray-500">If ON, system runs audit automatically at set time</span>
                                            </label>

                                            <label className="flex flex-col p-3 bg-gray-50 rounded border cursor-pointer hover:bg-gray-100 transition-colors gap-2">
                                                <div className="flex justify-between items-center w-full">
                                                    <span className="text-sm font-medium text-gray-700">Auto-Post Room Rent?</span>
                                                    <input type="checkbox" checked={autoPostRent} onChange={() => setAutoPostRent(!autoPostRent)} className="toggle toggle-sm text-blue-600" />
                                                </div>
                                                <span className="text-xs text-gray-500">Automatically post room charges during audit</span>
                                            </label>

                                            <label className="flex flex-col p-3 bg-gray-50 rounded border cursor-pointer hover:bg-gray-100 transition-colors gap-2">
                                                <div className="flex justify-between items-center w-full">
                                                    <span className="text-sm font-medium text-gray-700">Force Close POS?</span>
                                                    <input type="checkbox" checked={forceClosePos} onChange={() => setForceClosePos(!forceClosePos)} className="toggle toggle-sm text-blue-600" />
                                                </div>
                                                <span className="text-xs text-gray-500">Close all open POS sessions automatically</span>
                                            </label>

                                            <label className="flex flex-col p-3 bg-gray-50 rounded border cursor-pointer hover:bg-gray-100 transition-colors gap-2">
                                                <div className="flex justify-between items-center w-full">
                                                    <span className="text-sm font-medium text-gray-700">Block User Login?</span>
                                                    <input type="checkbox" checked={blockLogin} onChange={() => setBlockLogin(!blockLogin)} className="toggle toggle-sm text-blue-600" />
                                                </div>
                                                <span className="text-xs text-gray-500">Prevent logins during audit process (approx 5m)</span>
                                            </label>

                                            <label className="flex flex-col p-3 bg-gray-50 rounded border cursor-pointer hover:bg-gray-100 transition-colors gap-2">
                                                <div className="flex justify-between items-center w-full">
                                                    <span className="text-sm font-medium text-gray-700">Auto-Backup?</span>
                                                    <input type="checkbox" checked={autoBackup} onChange={() => setAutoBackup(!autoBackup)} className="toggle toggle-sm text-blue-600" />
                                                </div>
                                                <span className="text-xs text-gray-500">Backup database before running audit</span>
                                            </label>
                                        </div>

                                        <div className="pt-4 border-t">
                                            <span className="text-sm font-medium text-gray-700 block mb-2">Reports to Generate & Email</span>
                                            <div className="flex flex-wrap gap-2">
                                                {['Daily Revenue', 'Occupancy Report', 'Arrival List', 'Departure List', 'In-House Guest List', 'Manager Report'].map(report => (
                                                    <label key={report} className={`flex items-center gap-2 px-3 py-2 rounded border cursor-pointer transition-colors ${selectedReports.includes(report) ? 'bg-blue-50 border-blue-200 text-blue-700' : 'hover:bg-gray-50'}`}>
                                                        <input type="checkbox" checked={selectedReports.includes(report)} onChange={() => toggleReport(report)} className="rounded text-blue-600 w-4 h-4" />
                                                        <span className="text-xs font-medium">{report}</span>
                                                    </label>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                </div>

                            </div>
                        )}

                        {/* TAB 3: FINANCE */}
                        {activeTab === 'finance' && (
                            <div className="space-y-8 animate-fadeIn">
                                <div>
                                    <h2 className="text-lg font-semibold border-b pb-2 mb-4 flex items-center gap-2"><CreditCard size={20} className="text-gray-400" /> Financial Settings</h2>
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                        <div className="space-y-1"><label className="text-sm font-medium text-gray-700">Base Currency *</label><select defaultValue={initialData?.currency || "BDT"} className="w-full px-3 py-2 border rounded-lg bg-white outline-none"><option>BDT</option><option>USD</option><option>MYR</option><option>GBP</option></select></div>

                                        <div className="flex items-center gap-3 md:pt-6">
                                            <div className="form-control">
                                                <label className="label cursor-pointer gap-2">
                                                    <input type="checkbox" checked={isTaxInclusive} onChange={() => setIsTaxInclusive(!isTaxInclusive)} className="toggle toggle-primary toggle-sm" />
                                                    <span className="label-text text-sm font-medium">Is Tax Inclusive?</span>
                                                </label>
                                            </div>
                                        </div>

                                        <div className="space-y-1"><label className="text-sm font-medium text-gray-700">BIN / VAT No</label><input type="text" defaultValue={initialData?.finance?.binNo} className="w-full px-3 py-2 border rounded-lg outline-none" /></div>

                                        <div className="space-y-1"><label className="text-sm font-medium text-gray-700">Service Charge %</label><input type="number" value={serviceCharge} onChange={(e) => setServiceCharge(Number(e.target.value))} placeholder="10" className="w-full px-3 py-2 border rounded-lg outline-none" /></div>

                                        <div className="space-y-1"><label className="text-sm font-medium text-gray-700">Credit Card Gateway</label><select value={creditCardGateway} onChange={(e) => setCreditCardGateway(e.target.value)} className="w-full px-3 py-2 border rounded-lg bg-white outline-none"><option>Stripe</option><option>Shift4</option><option>SSLCommerz</option><option>Razorpay</option></select></div>

                                        <div className="col-span-1 md:col-span-3 border-t pt-4 grid grid-cols-3 gap-6">
                                            <div className="space-y-1"><label className="text-sm font-medium text-gray-700">Round Off Type</label><select value={roundOffType} onChange={(e) => setRoundOffType(e.target.value)} className="w-full px-3 py-2 border rounded-lg bg-white outline-none"><option>No Round Off</option><option>Nearest</option><option>Up</option><option>Down</option></select></div>
                                            <div className="space-y-1"><label className="text-sm font-medium text-gray-700">Round Off Limit</label><input type="number" value={roundOffLimit} onChange={(e) => setRoundOffLimit(Number(e.target.value))} className="w-full px-3 py-2 border rounded-lg outline-none" /></div>
                                            <div className="flex items-center gap-3 md:pt-6">
                                                <label className="label cursor-pointer gap-2">
                                                    <input type="checkbox" checked={addRoundOffToRate} onChange={() => setAddRoundOffToRate(!addRoundOffToRate)} className="toggle toggle-primary toggle-sm" />
                                                    <span className="label-text text-sm font-medium">Add Round Off to Rate?</span>
                                                </label>
                                            </div>
                                            <div className="col-span-3 space-y-1">
                                                <label className="text-sm font-medium text-gray-700">Invoice / Bill Notes (Terms)</label>
                                                <textarea value={invoiceTerms} onChange={(e) => setInvoiceTerms(e.target.value)} rows={2} className="w-full px-3 py-2 border rounded-lg outline-none" placeholder="Detailed terms or notes to appear on every invoice..."></textarea>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div>
                                    <div className="flex justify-between items-center border-b pb-2 mb-4">
                                        <h2 className="text-lg font-semibold flex items-center gap-2"><Building2 size={20} className="text-gray-400" /> Bank Accounts</h2>
                                        <button onClick={addBank} className="text-sm text-blue-600 hover:text-blue-800 font-medium flex items-center gap-1"><Plus size={16} /> Add Bank</button>
                                    </div>
                                    <div className="space-y-4">
                                        {bankAccounts.map((bank) => (
                                            <div key={bank.id} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-3 p-4 bg-gray-50 rounded-lg border border-gray-200 relative group">
                                                <div className="space-y-1"><label className="text-xs font-medium text-gray-500">Bank Name</label><input type="text" value={bank.bankName} onChange={e => updateBank(bank.id, 'bankName', e.target.value)} className="w-full px-2 py-1.5 border rounded outline-none text-sm" /></div>
                                                <div className="space-y-1"><label className="text-xs font-medium text-gray-500">Account Name</label><input type="text" value={bank.accountName} onChange={e => updateBank(bank.id, 'accountName', e.target.value)} className="w-full px-2 py-1.5 border rounded outline-none text-sm" /></div>
                                                <div className="space-y-1"><label className="text-xs font-medium text-gray-500">Account Number</label><input type="text" value={bank.accountNum} onChange={e => updateBank(bank.id, 'accountNum', e.target.value)} className="w-full px-2 py-1.5 border rounded outline-none text-sm" /></div>
                                                <div className="space-y-1"><label className="text-xs font-medium text-gray-500">Swift/Routing</label><input type="text" value={bank.swift} onChange={e => updateBank(bank.id, 'swift', e.target.value)} className="w-full px-2 py-1.5 border rounded outline-none text-sm" /></div>
                                                <div className="flex items-end justify-end pb-1">
                                                    <button onClick={() => removeBank(bank.id)} className="p-1.5 text-red-500 hover:bg-red-100 rounded transition-colors"><Trash2 size={16} /></button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* TAB 4: SYSTEM */}
                        {activeTab === 'system' && (
                            <div className="space-y-8 animate-fadeIn">
                                <div>
                                    <h2 className="text-lg font-semibold border-b pb-2 mb-4 flex items-center gap-2"><Monitor size={20} className="text-gray-400" /> System Configuration</h2>
                                    <div className="grid grid-cols-1 gap-6">

                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                            <div className="space-y-1"><label className="text-sm font-medium text-gray-700">Web Rate Mode</label><select value={webRateMode} onChange={(e) => setWebRateMode(e.target.value)} className="w-full px-3 py-2 border rounded-lg bg-white outline-none"><option>Regular</option><option>Corporate</option><option>Promo</option></select></div>
                                            <div className="space-y-1"><label className="text-sm font-medium text-gray-700">Web Inventory Mode</label><select value={webInventoryMode} onChange={(e) => setWebInventoryMode(e.target.value)} className="w-full px-3 py-2 border rounded-lg bg-white outline-none"><option>Regular (Live)</option><option>Allotted</option></select></div>
                                            <div className="space-y-1"><label className="text-sm font-medium text-gray-700">POS Configuration</label><select value={posConfigType} onChange={(e) => setPosConfigType(e.target.value)} className="w-full px-3 py-2 border rounded-lg bg-white outline-none"><option>Integrated POS</option><option>Third-party</option></select></div>
                                        </div>

                                        <div className="space-y-2">
                                            <label className="text-sm font-medium text-gray-700">Active Modules</label>
                                            <div className="flex flex-wrap gap-3">
                                                {['Front Office', 'POS', 'Housekeeping', 'HR/Payroll', 'Banquets'].map(mod => (
                                                    <label key={mod} className={`flex items-center gap-2 px-3 py-2 rounded border cursor-pointer transition-colors ${activeModules.includes(mod) ? 'bg-blue-50 border-blue-200 text-blue-700' : 'hover:bg-gray-50'}`}>
                                                        <input type="checkbox" checked={activeModules.includes(mod)} onChange={() => toggleModule(mod)} className="rounded text-blue-600" />
                                                        <span className="text-sm font-medium">{mod}</span>
                                                    </label>
                                                ))}
                                            </div>
                                        </div>

                                        <div className="space-y-3 pt-4 border-t">
                                            <div className="flex justify-between items-center">
                                                <label className="text-sm font-medium text-gray-700">POS Outlets Setup</label>
                                                <button onClick={addPosConfig} className="text-sm text-blue-600 hover:text-blue-800 font-medium flex items-center gap-1">
                                                    <Plus size={16} /> Add Config
                                                </button>
                                            </div>
                                            {posConfigs.map((config) => (
                                                <div key={config.id} className="flex gap-3 items-center">
                                                    <select
                                                        value={config.type}
                                                        onChange={(e) => updatePosConfig(config.id, 'type', e.target.value)}
                                                        className="flex-1 px-3 py-2 border rounded-lg bg-white outline-none"
                                                    >
                                                        <option>Restaurant</option>
                                                        <option>Gym</option>
                                                        <option>Spa</option>
                                                        <option>Boutique</option>
                                                        <option>Bar</option>
                                                    </select>
                                                    <input
                                                        type="number"
                                                        value={config.count}
                                                        onChange={(e) => updatePosConfig(config.id, 'count', parseInt(e.target.value))}
                                                        className="w-20 px-3 py-2 border rounded-lg outline-none"
                                                        min="1"
                                                    />
                                                    <button
                                                        onClick={() => removePosConfig(config.id)}
                                                        className="p-2 text-red-500 hover:bg-red-50 rounded-lg border border-red-200"
                                                    >
                                                        <Trash2 size={18} />
                                                    </button>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-8 pt-4 border-t">
                                        <label className="flex items-center gap-2 p-3 border rounded hover:bg-gray-50 cursor-pointer">
                                            <input type="checkbox" checked={autoEmailFolio} onChange={() => setAutoEmailFolio(!autoEmailFolio)} className="w-4 h-4 text-blue-600 rounded" />
                                            <span className="text-sm text-gray-700">Auto-Email Folio on Checkout</span>
                                        </label>
                                    </div>
                                </div>

                                <div>
                                    <h2 className="text-lg font-semibold border-b pb-2 mb-4 flex items-center gap-2"><Settings size={20} className="text-gray-400" /> Interfaces & APIs</h2>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <div className="space-y-1"><label className="text-sm font-medium text-gray-700">Key Card System</label><select className="w-full px-3 py-2 border rounded-lg bg-white outline-none"><option>VingCard</option><option>Salto</option><option>Onity</option></select></div>
                                        <div className="space-y-1"><label className="text-sm font-medium text-gray-700">Channel Manager</label><select className="w-full px-3 py-2 border rounded-lg bg-white outline-none"><option>SiteMinder</option><option>Staah</option></select></div>
                                        <div className="col-span-2 space-y-1"><label className="text-sm font-medium text-gray-700">SMS Gateway API Key</label><input type="text" className="w-full px-3 py-2 border rounded-lg outline-none font-mono text-xs" /></div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* TAB 5: BRANDING & POC */}
                        {activeTab === 'branding' && (
                            <div className="space-y-8 animate-fadeIn">
                                <div>
                                    <h2 className="text-lg font-semibold border-b pb-2 mb-4 flex items-center gap-2"><ImageIcon size={20} className="text-gray-400" /> Branding & Assets</h2>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <div className="space-y-2">
                                            <span className="text-sm font-medium text-gray-700 block">Primary Logo *</span>
                                            <div className="border-2 border-dashed border-gray-300 rounded-lg h-32 flex flex-col items-center justify-center text-gray-500 hover:bg-gray-50 cursor-pointer">
                                                <ImageIcon size={24} /> <span className="text-xs mt-1">Upload Main Logo (Dashboard/Footer)</span>
                                            </div>
                                        </div>
                                        <div className="space-y-2">
                                            <span className="text-sm font-medium text-gray-700 block">Report Header</span>
                                            <div className="border-2 border-dashed border-gray-300 rounded-lg h-32 flex flex-col items-center justify-center text-gray-500 hover:bg-gray-50 cursor-pointer">
                                                <ImageIcon size={24} /> <span className="text-xs mt-1">Upload Report Banner</span>
                                            </div>
                                        </div>
                                        <div className="space-y-2">
                                            <span className="text-sm font-medium text-gray-700 block">Report Footer</span>
                                            <div className="border-2 border-dashed border-gray-300 rounded-lg h-32 flex flex-col items-center justify-center text-gray-500 hover:bg-gray-50 cursor-pointer">
                                                <ImageIcon size={24} /> <span className="text-xs mt-1">Upload Footer Image</span>
                                            </div>
                                        </div>
                                        <div className="space-y-2">
                                            <span className="text-sm font-medium text-gray-700 block">Login / Guest Portal Screen</span>
                                            <div className="border-2 border-dashed border-gray-300 rounded-lg h-32 flex flex-col items-center justify-center text-gray-500 hover:bg-gray-50 cursor-pointer">
                                                <ImageIcon size={24} /> <span className="text-xs mt-1">Upload Cover Image</span>
                                            </div>
                                        </div>
                                        <div className="col-span-2 grid grid-cols-3 gap-4">
                                            <div className="space-y-1"><label className="text-sm font-medium text-gray-700">Facebook URL</label><input type="text" placeholder="facebook.com/page" className="w-full px-3 py-2 border rounded-lg outline-none" /></div>
                                            <div className="space-y-1"><label className="text-sm font-medium text-gray-700">Instagram URL</label><input type="text" placeholder="instagram.com/page" className="w-full px-3 py-2 border rounded-lg outline-none" /></div>
                                            <div className="space-y-1"><label className="text-sm font-medium text-gray-700">TripAdvisor Link</label><input type="text" placeholder="tripadvisor.com/hotel" className="w-full px-3 py-2 border rounded-lg outline-none" /></div>
                                        </div>
                                    </div>
                                </div>

                                <div>
                                    <div className="flex justify-between items-center border-b pb-2 mb-4">
                                        <h2 className="text-lg font-semibold flex items-center gap-2"><User size={20} className="text-gray-400" /> Key Contacts (POC)</h2>
                                        <button onClick={addPoc} className="text-sm text-blue-600 hover:text-blue-800 font-medium flex items-center gap-1">
                                            <Plus size={16} /> Add Contact
                                        </button>
                                    </div>
                                    <div className="space-y-4">
                                        {pocs.map((poc) => (
                                            <div key={poc.id} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 p-4 bg-gray-50 rounded-lg border border-gray-200 relative group">
                                                <div className="space-y-1">
                                                    <label className="text-xs font-medium text-gray-500">Role</label>
                                                    <select
                                                        value={poc.role}
                                                        onChange={(e) => updatePoc(poc.id, 'role', e.target.value)}
                                                        className="w-full px-2 py-1.5 border rounded outline-none text-sm bg-white"
                                                    >
                                                        <option>Owner</option>
                                                        <option>Managing Director (MD)</option>
                                                        <option>CEO</option>
                                                        <option>General Manager (GM)</option>
                                                        <option>IT Manager</option>
                                                        <option>Front Office Manager</option>
                                                        <option>Restaurant Manager</option>
                                                        <option>Accounts Manager</option>
                                                    </select>
                                                </div>
                                                <div className="space-y-1"><label className="text-xs font-medium text-gray-500">Name</label><input type="text" value={poc.name} onChange={e => updatePoc(poc.id, 'name', e.target.value)} className="w-full px-2 py-1.5 border rounded outline-none text-sm" /></div>
                                                <div className="space-y-1"><label className="text-xs font-medium text-gray-500">Phone</label><input type="text" value={poc.phone} onChange={e => updatePoc(poc.id, 'phone', e.target.value)} className="w-full px-2 py-1.5 border rounded outline-none text-sm" /></div>
                                                <div className="space-y-1">
                                                    <label className="text-xs font-medium text-gray-500">Email</label>
                                                    <div className="flex gap-2">
                                                        <input type="email" value={poc.email} onChange={e => updatePoc(poc.id, 'email', e.target.value)} className="w-full px-2 py-1.5 border rounded outline-none text-sm flex-1" />
                                                        <button onClick={() => removePoc(poc.id)} className="p-1.5 text-red-500 hover:bg-red-100 rounded transition-colors self-end"><Trash2 size={16} /></button>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        )}

                    </div>
                </div>
            </main >
            <style>{`
                @keyframes fadeIn { from { opacity: 0; transform: translateY(5px); } to { opacity: 1; transform: translateY(0); } }
                .animate-fadeIn { animation: fadeIn 0.3s ease-out forwards; }
            `}</style>
        </div >
    );
};

export default AddProperty;
