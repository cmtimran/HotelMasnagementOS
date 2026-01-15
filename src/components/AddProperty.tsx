import { useState } from 'react';
import {
    Save, ArrowLeft, Image as ImageIcon, Building2, MapPin, Clock,
    CreditCard, Settings, Monitor, Shield, User, Trash2, Plus, Moon
} from 'lucide-react';

interface AddPropertyProps {
    onBack: () => void;
}

const AddProperty = ({ onBack }: AddPropertyProps) => {
    const [activeTab, setActiveTab] = useState('identity');
    const [posConfigs, setPosConfigs] = useState([{ id: 1, type: 'Restaurant', count: 1 }]);
    const [bankAccounts, setBankAccounts] = useState([{ id: 1, bankName: '', accountName: '', accountNum: '', swift: '' }]);
    const [pocs, setPocs] = useState([{ id: 1, role: 'General Manager', name: '', phone: '', email: '' }]);
    const [activeModules, setActiveModules] = useState<string[]>(['Front Office', 'Housekeeping']);
    const [weekends, setWeekends] = useState<string[]>(['Fri', 'Sat']);

    // POS Handlers
    const addPosConfig = () => setPosConfigs([...posConfigs, { id: Date.now(), type: 'Restaurant', count: 1 }]);
    const removePosConfig = (id: number) => setPosConfigs(posConfigs.filter(cfg => cfg.id !== id));
    const updatePosConfig = (id: number, field: 'type' | 'count', value: string | number) => {
        setPosConfigs(posConfigs.map(cfg => cfg.id === id ? { ...cfg, [field]: value } : cfg));
    };

    // Bank Handlers
    const addBank = () => setBankAccounts([...bankAccounts, { id: Date.now(), bankName: '', accountName: '', accountNum: '', swift: '' }]);
    const removeBank = (id: number) => setBankAccounts(bankAccounts.filter(b => b.id !== id));
    const updateBank = (id: number, field: keyof typeof bankAccounts[0], value: string) => {
        setBankAccounts(bankAccounts.map(b => b.id === id ? { ...b, [field]: value } : b));
    };

    // POC Handlers
    const addPoc = () => setPocs([...pocs, { id: Date.now(), role: 'General Manager', name: '', phone: '', email: '' }]);
    const removePoc = (id: number) => setPocs(pocs.filter(p => p.id !== id));
    const updatePoc = (id: number, field: keyof typeof pocs[0], value: string) => {
        setPocs(pocs.map(p => p.id === id ? { ...p, [field]: value } : p));
    };

    // Module Handler
    const toggleModule = (module: string) => {
        setActiveModules(prev => prev.includes(module) ? prev.filter(m => m !== module) : [...prev, module]);
    };

    // Policy State
    const [cancellationPolicy, setCancellationPolicy] = useState('Flexible');
    const [noShowPolicy, setNoShowPolicy] = useState('Charge 1st Night');
    const [smokingPolicy, setSmokingPolicy] = useState('Non-Smoking Property');
    const [petPolicy, setPetPolicy] = useState('Not Allowed');
    const [visitorPolicy, setVisitorPolicy] = useState('Not Allowed in Room');

    // Policy Descriptions
    const policyDescriptions: any = {
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
                        <h1 className="text-xl font-bold text-gray-800">Add New Property</h1>
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
                    <div className="w-full md:w-40 flex-shrink-0 space-y-3">
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
                                            <input type="text" placeholder="Official Property Name" className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" />
                                        </div>
                                        <div className="space-y-1">
                                            <label className="text-sm font-medium text-gray-700">Property Code</label>
                                            <input type="text" placeholder="e.g. HTL-01" className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" />
                                        </div>
                                        <div className="space-y-1">
                                            <label className="text-sm font-medium text-gray-700">Type</label>
                                            <select className="w-full px-3 py-2 border rounded-lg bg-white outline-none">
                                                <option>Hotel</option><option>Resort</option><option>Guest House</option>
                                            </select>
                                        </div>
                                        <div className="space-y-1">
                                            <label className="text-sm font-medium text-gray-700">Grade</label>
                                            <select className="w-full px-3 py-2 border rounded-lg bg-white outline-none">
                                                <option>5 Star</option><option>4 Star</option><option>3 Star</option>
                                            </select>
                                        </div>
                                        <div className="space-y-1">
                                            <label className="text-sm font-medium text-gray-700">Total Rooms</label>
                                            <input type="number" className="w-full px-3 py-2 border rounded-lg outline-none" />
                                        </div>
                                        <div className="space-y-1">
                                            <label className="text-sm font-medium text-gray-700">Established Year</label>
                                            <input type="number" placeholder="YYYY" className="w-full px-3 py-2 border rounded-lg outline-none" />
                                        </div>
                                        <div className="space-y-1 col-span-2">
                                            <label className="text-sm font-medium text-gray-700">Website</label>
                                            <input type="text" placeholder="https://" className="w-full px-3 py-2 border rounded-lg outline-none" />
                                        </div>
                                    </div>
                                </div>

                                {/* Section 2: Location */}
                                <div>
                                    <h2 className="text-lg font-semibold border-b pb-2 mb-4 flex items-center gap-2"><MapPin size={20} className="text-gray-400" /> Location & Contact</h2>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <div className="col-span-2 space-y-1">
                                            <label className="text-sm font-medium text-gray-700">Address</label>
                                            <textarea rows={2} className="w-full px-3 py-2 border rounded-lg outline-none"></textarea>
                                        </div>
                                        <div className="space-y-1"><label className="text-sm font-medium text-gray-700">City</label><select className="w-full px-3 py-2 border rounded-lg bg-white outline-none"><option>Dhaka</option></select></div>
                                        <div className="space-y-1"><label className="text-sm font-medium text-gray-700">Country</label><select className="w-full px-3 py-2 border rounded-lg bg-white outline-none"><option>Bangladesh</option></select></div>
                                        <div className="space-y-1"><label className="text-sm font-medium text-gray-700">Postal Code</label><input type="text" className="w-full px-3 py-2 border rounded-lg outline-none" /></div>
                                        <div className="space-y-1"><label className="text-sm font-medium text-gray-700">Timezone</label><select className="w-full px-3 py-2 border rounded-lg bg-white outline-none"><option>GMT+6</option></select></div>
                                        <div className="space-y-1"><label className="text-sm font-medium text-gray-700">Phone</label><input type="text" className="w-full px-3 py-2 border rounded-lg outline-none" /></div>
                                        <div className="space-y-1"><label className="text-sm font-medium text-gray-700">Email</label><input type="email" className="w-full px-3 py-2 border rounded-lg outline-none" /></div>

                                        <div className="col-span-1 md:col-span-2 mt-4 pt-4 border-t">
                                            <h3 className="text-sm font-bold text-gray-900 mb-4">Corporate Office</h3>
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                                <div className="col-span-2 space-y-1">
                                                    <label className="text-sm font-medium text-gray-700">Corporate Address</label>
                                                    <textarea rows={2} placeholder="Office address..." className="w-full px-3 py-2 border rounded-lg outline-none"></textarea>
                                                </div>
                                                <div className="space-y-1"><label className="text-sm font-medium text-gray-700">Corporate Phone</label><input type="text" className="w-full px-3 py-2 border rounded-lg outline-none" /></div>
                                                <div className="space-y-1"><label className="text-sm font-medium text-gray-700">Corporate Email</label><input type="email" className="w-full px-3 py-2 border rounded-lg outline-none" /></div>
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
                                    <h2 className="text-lg font-semibold border-b pb-2 mb-4 flex items-center gap-2"><Clock size={20} className="text-gray-400" /> 1. Timing & Schedules</h2>
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                                        <div className="space-y-1"><label className="text-sm font-medium text-gray-700">Standard Check-in Time <span className="text-red-500">*</span></label><input type="time" defaultValue="14:00" className="w-full px-3 py-2 border rounded-lg outline-none" /></div>
                                        <div className="space-y-1"><label className="text-sm font-medium text-gray-700">Standard Check-out Time <span className="text-red-500">*</span></label><input type="time" defaultValue="12:00" className="w-full px-3 py-2 border rounded-lg outline-none" /></div>
                                        <div className="space-y-1"><label className="text-sm font-medium text-gray-700">Breakfast Timing</label><div className="flex gap-2 items-center"><input type="time" defaultValue="07:00" className="w-full px-2 py-2 border rounded-lg outline-none text-xs" /><span className="text-gray-400">-</span><input type="time" defaultValue="10:30" className="w-full px-2 py-2 border rounded-lg outline-none text-xs" /></div></div>

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

                                {/* 2. Early Check-in & Late Check-out Policy */}
                                <div>
                                    <h2 className="text-lg font-semibold border-b pb-2 mb-4 flex items-center gap-2"><Clock size={20} className="text-gray-400" /> 2. Early Check-in & Late Check-out</h2>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                        <div className="space-y-4 p-4 bg-blue-50/50 rounded-lg border border-blue-100">
                                            <div className="flex justify-between items-center">
                                                <label className="text-sm font-bold text-gray-800">Early Check-in Allowed?</label>
                                                <input type="checkbox" className="toggle toggle-sm text-blue-600" defaultChecked />
                                            </div>
                                            <div className="space-y-3">
                                                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider border-b pb-1">Charge Logic</p>

                                                <div className="flex items-center gap-2 text-sm">
                                                    <span className="w-20 text-gray-600 text-xs">Before</span>
                                                    <input type="time" defaultValue="06:00" className="w-24 px-2 py-1 border rounded text-xs bg-white" />
                                                    <select className="flex-1 px-2 py-1 border rounded text-xs bg-white outline-none">
                                                        <option>Full Day Charge</option>
                                                        <option>Half Day Charge</option>
                                                        <option>Flat Rate</option>
                                                    </select>
                                                </div>

                                                <div className="flex items-center gap-2 text-sm">
                                                    <span className="w-20 text-gray-600 text-xs">06:00 - 10:00</span>
                                                    <div className="flex-1 flex gap-2">
                                                        <select className="w-full px-2 py-1 border rounded text-xs bg-white outline-none">
                                                            <option>Half Day Charge</option>
                                                            <option>Full Day Charge</option>
                                                            <option>Flat Rate</option>
                                                        </select>
                                                    </div>
                                                </div>

                                                <div className="flex items-center gap-2 text-sm">
                                                    <span className="w-20 text-gray-600 text-xs">10:00 - 13:00</span>
                                                    <div className="flex-1 flex gap-2">
                                                        <select className="w-full px-2 py-1 border rounded text-xs bg-white outline-none">
                                                            <option>Free of Charge</option>
                                                            <option>Flat Rate</option>
                                                        </select>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="space-y-4 p-4 bg-orange-50/50 rounded-lg border border-orange-100">
                                            <div className="flex justify-between items-center">
                                                <label className="text-sm font-bold text-gray-800">Late Check-out Allowed?</label>
                                                <input type="checkbox" className="toggle toggle-sm text-blue-600" defaultChecked />
                                            </div>
                                            <div className="flex items-center gap-3">
                                                <label className="text-xs font-medium text-gray-600 whitespace-nowrap">Grace Period (Mins)</label>
                                                <input type="number" defaultValue="30" className="w-20 px-2 py-1 border rounded text-sm bg-white" />
                                            </div>
                                            <div className="space-y-3">
                                                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider border-b pb-1">Charge Logic</p>

                                                <div className="flex items-center gap-2 text-sm">
                                                    <span className="w-20 text-gray-600 text-xs">Up to</span>
                                                    <input type="time" defaultValue="16:00" className="w-24 px-2 py-1 border rounded text-xs bg-white" />
                                                    <select className="flex-1 px-2 py-1 border rounded text-xs bg-white outline-none">
                                                        <option>Half Day Charge</option>
                                                        <option>Full Day Charge</option>
                                                        <option>Flat Rate</option>
                                                    </select>
                                                </div>

                                                <div className="flex items-center gap-2 text-sm">
                                                    <span className="w-20 text-gray-600 text-xs">After</span>
                                                    <input type="time" defaultValue="16:00" className="w-24 px-2 py-1 border rounded text-xs bg-white" />
                                                    <select className="flex-1 px-2 py-1 border rounded text-xs bg-white outline-none">
                                                        <option>Full Day Charge</option>
                                                        <option>Half Day Charge</option>
                                                        <option>Flat Rate</option>
                                                    </select>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* 3. Child & Extra Bed Policy */}
                                <div>
                                    <h2 className="text-lg font-semibold border-b pb-2 mb-4 flex items-center gap-2"><User size={20} className="text-gray-400" /> 3. Child & Extra Bed Policy</h2>
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                        <div className="space-y-1"><label className="text-sm font-medium text-gray-700">Infant Age Limit (Free)</label><input type="number" placeholder="2" className="w-full px-3 py-2 border rounded-lg outline-none" /><span className="text-xs text-gray-500">Years (0 to X)</span></div>
                                        <div className="space-y-1"><label className="text-sm font-medium text-gray-700">Child Age Limit</label><input type="number" placeholder="12" className="w-full px-3 py-2 border rounded-lg outline-none" /><span className="text-xs text-gray-500">Years (X to Y)</span></div>

                                        <div className="flex items-center gap-3 md:pt-6">
                                            <input type="checkbox" className="w-4 h-4 text-blue-600" id="childFree" />
                                            <label htmlFor="childFree" className="text-sm font-medium text-gray-700 cursor-pointer">Child Stay Free (Existing Bed)?</label>
                                        </div>

                                        <div className="space-y-1"><label className="text-sm font-medium text-gray-700">Extra Bed Charge</label><input type="number" placeholder="1500" className="w-full px-3 py-2 border rounded-lg outline-none" /></div>
                                        <div className="space-y-1"><label className="text-sm font-medium text-gray-700">Max Extra Beds</label><input type="number" placeholder="1" className="w-full px-3 py-2 border rounded-lg outline-none" /></div>
                                    </div>
                                </div>

                                {/* 4. Booking & Cancellation */}
                                <div>
                                    <h2 className="text-lg font-semibold border-b pb-2 mb-4 flex items-center gap-2"><CreditCard size={20} className="text-gray-400" /> 4. Booking & Cancellation</h2>
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
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
                                        <div className="space-y-1"><label className="text-sm font-medium text-gray-700">Deposit Requirement (%)</label><input type="number" placeholder="50" className="w-full px-3 py-2 border rounded-lg outline-none" /></div>

                                        <div className="space-y-1"><label className="text-sm font-medium text-gray-700">Min. Length of Stay</label><input type="number" defaultValue="1" className="w-full px-3 py-2 border rounded-lg outline-none" /></div>
                                        <div className="space-y-1"><label className="text-sm font-medium text-gray-700">Overbooking Limit (Rooms)</label><input type="number" placeholder="0" className="w-full px-3 py-2 border rounded-lg outline-none" /></div>

                                        <div className="flex items-center gap-3 md:pt-6">
                                            <div className="form-control">
                                                <label className="label cursor-pointer gap-2">
                                                    <input type="checkbox" className="toggle toggle-primary toggle-sm" />
                                                    <span className="label-text text-sm font-medium">Allow Overbooking?</span>
                                                </label>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* 5. House Rules */}
                                <div>
                                    <h2 className="text-lg font-semibold border-b pb-2 mb-4 flex items-center gap-2"><Shield size={20} className="text-gray-400" /> 5. House Rules</h2>
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
                                        <div className="space-y-1"><label className="text-sm font-medium text-gray-700">Smoking Fine</label><input type="number" placeholder="5000" className="w-full px-3 py-2 border rounded-lg outline-none" /></div>

                                        <div className="space-y-1">
                                            <label className="text-sm font-medium text-gray-700">Pet Policy</label>
                                            <select value={petPolicy} onChange={(e) => setPetPolicy(e.target.value)} className="w-full px-3 py-2 border rounded-lg bg-white outline-none">
                                                <option>Not Allowed</option>
                                                <option>Allowed (Free)</option>
                                                <option>Allowed (Paid)</option>
                                            </select>
                                            <p className="text-xs text-blue-600 mt-1">{policyDescriptions.pet[petPolicy]}</p>
                                        </div>
                                        <div className="space-y-1"><label className="text-sm font-medium text-gray-700">Pet Charge (Daily)</label><input type="number" placeholder="0" className="w-full px-3 py-2 border rounded-lg outline-none" /></div>

                                        <div className="space-y-1 col-span-2">
                                            <label className="text-sm font-medium text-gray-700">Visitor Policy</label>
                                            <select value={visitorPolicy} onChange={(e) => setVisitorPolicy(e.target.value)} className="w-full px-3 py-2 border rounded-lg bg-white outline-none">
                                                <option>Not Allowed in Room</option>
                                                <option>Allowed till 10 PM</option>
                                                <option>ID Required</option>
                                            </select>
                                            <p className="text-xs text-blue-600 mt-1">{policyDescriptions.visitor[visitorPolicy]}</p>
                                        </div>
                                        <div className="space-y-1"><label className="text-sm font-medium text-gray-700">Lost & Found Period (Days)</label><input type="number" defaultValue="90" className="w-full px-3 py-2 border rounded-lg outline-none" /></div>
                                    </div>
                                </div>

                                {/* 6. Night Audit Automation */}
                                <div>
                                    <h2 className="text-lg font-semibold border-b pb-2 mb-4 flex items-center gap-2"><Moon size={20} className="text-gray-400" /> 6. Night Audit Automation</h2>
                                    <div className="space-y-6">
                                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                                            <div className="space-y-1">
                                                <label className="text-sm font-medium text-gray-700">Audit Time</label>
                                                <input type="time" defaultValue="02:00" className="w-full px-3 py-2 border rounded-lg outline-none" />
                                                <p className="text-xs text-gray-500">When the business date changes (e.g., 02:00 AM)</p>
                                            </div>
                                            <div className="space-y-1 col-span-2">
                                                <label className="text-sm font-medium text-gray-700">Email Reports To</label>
                                                <input type="text" placeholder="owner@hotel.com, gm@hotel.com" className="w-full px-3 py-2 border rounded-lg outline-none" />
                                                <p className="text-xs text-gray-500">Comma separated emails (Owner, GM) to send Daily Sales Report</p>
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                            <label className="flex flex-col p-3 bg-gray-50 rounded border cursor-pointer hover:bg-gray-100 transition-colors gap-2">
                                                <div className="flex justify-between items-center w-full">
                                                    <span className="text-sm font-medium text-gray-700">Auto-Run Audit?</span>
                                                    <input type="checkbox" className="toggle toggle-sm text-blue-600" />
                                                </div>
                                                <span className="text-xs text-gray-500">If ON, system runs audit automatically at set time</span>
                                            </label>

                                            <label className="flex flex-col p-3 bg-gray-50 rounded border cursor-pointer hover:bg-gray-100 transition-colors gap-2">
                                                <div className="flex justify-between items-center w-full">
                                                    <span className="text-sm font-medium text-gray-700">Auto-Post Room Rent</span>
                                                    <input type="checkbox" className="toggle toggle-sm text-blue-600" defaultChecked />
                                                </div>
                                                <span className="text-xs text-gray-500">Automatically post room charges for all Checked-In guests?</span>
                                            </label>

                                            <label className="flex flex-col p-3 bg-gray-50 rounded border cursor-pointer hover:bg-gray-100 transition-colors gap-2">
                                                <div className="flex justify-between items-center w-full">
                                                    <span className="text-sm font-medium text-gray-700">Force Close POS</span>
                                                    <input type="checkbox" className="toggle toggle-sm text-blue-600" defaultChecked />
                                                </div>
                                                <span className="text-xs text-gray-500">Auto-close open shifts/terminals in POS/Restaurant?</span>
                                            </label>

                                            <label className="flex flex-col p-3 bg-gray-50 rounded border cursor-pointer hover:bg-gray-100 transition-colors gap-2">
                                                <div className="flex justify-between items-center w-full">
                                                    <span className="text-sm font-medium text-gray-700">Block User Login</span>
                                                    <input type="checkbox" className="toggle toggle-sm text-blue-600" />
                                                </div>
                                                <span className="text-xs text-gray-500">Prevent staff login during audit process (approx 10-15 mins)</span>
                                            </label>

                                            <label className="flex flex-col p-3 bg-gray-50 rounded border cursor-pointer hover:bg-gray-100 transition-colors gap-2">
                                                <div className="flex justify-between items-center w-full">
                                                    <span className="text-sm font-medium text-gray-700">Auto-Backup</span>
                                                    <input type="checkbox" className="toggle toggle-sm text-blue-600" defaultChecked />
                                                </div>
                                                <span className="text-xs text-gray-500">Trigger database backup immediately after audit?</span>
                                            </label>
                                        </div>

                                        <div className="space-y-2">
                                            <label className="text-sm font-medium text-gray-700">Reports to Generate</label>
                                            <div className="flex flex-wrap gap-2">
                                                {['Manager Report', 'Occupancy Report', 'Revenue Report', 'Tax Report', 'Detailed Postings', 'Arrival/Departure'].map(report => (
                                                    <label key={report} className="flex items-center gap-2 px-3 py-1.5 bg-white border rounded shadow-sm text-sm cursor-pointer hover:border-blue-300">
                                                        <input type="checkbox" className="rounded text-blue-600" defaultChecked={['Manager Report', 'Occupancy Report'].includes(report)} />
                                                        {report}
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
                                        <div className="space-y-1"><label className="text-sm font-medium text-gray-700">Base Currency *</label><select className="w-full px-3 py-2 border rounded-lg bg-white outline-none"><option>BDT</option><option>USD</option><option>EUR</option></select></div>
                                        <div className="space-y-1"><label className="text-sm font-medium text-gray-700">Tax/VAT Rule</label><select className="w-full px-3 py-2 border rounded-lg bg-white outline-none"><option>Exclusive (Plus Tax)</option><option>Inclusive (Net Price)</option></select></div>
                                        <div className="space-y-1"><label className="text-sm font-medium text-gray-700">Fiscal Year Start</label><input type="date" className="w-full px-3 py-2 border rounded-lg outline-none" /></div>

                                        <div className="space-y-1"><label className="text-sm font-medium text-gray-700">BIN / VAT No</label><input type="text" className="w-full px-3 py-2 border rounded-lg outline-none" /></div>
                                        <div className="space-y-1"><label className="text-sm font-medium text-gray-700">Service Charge %</label><input type="number" placeholder="10" className="w-full px-3 py-2 border rounded-lg outline-none" /></div>
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
                                                <label className="text-sm font-medium text-gray-700">POS Configuration</label>
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
                                        {['Auto-Email Folio'].map(item => (
                                            <label key={item} className="flex items-center gap-2 p-3 border rounded hover:bg-gray-50 cursor-pointer">
                                                <input type="checkbox" defaultChecked className="w-4 h-4 text-blue-600 rounded" />
                                                <span className="text-sm text-gray-700">{item}</span>
                                            </label>
                                        ))}
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
                                    <h2 className="text-lg font-semibold border-b pb-2 mb-4 flex items-center gap-2"><ImageIcon size={20} className="text-gray-400" /> Branding & Socials</h2>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <div className="space-y-2">
                                            <span className="text-sm font-medium text-gray-700 block">Primary Logo *</span>
                                            <div className="border-2 border-dashed border-gray-300 rounded-lg h-32 flex flex-col items-center justify-center text-gray-500 hover:bg-gray-50 cursor-pointer">
                                                <ImageIcon size={24} /> <span className="text-xs mt-1">Upload Main Logo</span>
                                            </div>
                                        </div>
                                        <div className="space-y-2">
                                            <span className="text-sm font-medium text-gray-700 block">Report Header</span>
                                            <div className="border-2 border-dashed border-gray-300 rounded-lg h-32 flex flex-col items-center justify-center text-gray-500 hover:bg-gray-50 cursor-pointer">
                                                <ImageIcon size={24} /> <span className="text-xs mt-1">Upload Banner</span>
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
            </main>
            <style>{`
                @keyframes fadeIn { from { opacity: 0; transform: translateY(5px); } to { opacity: 1; transform: translateY(0); } }
                .animate-fadeIn { animation: fadeIn 0.3s ease-out forwards; }
            `}</style>
        </div>
    );
};

export default AddProperty;
