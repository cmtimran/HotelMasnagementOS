import { useState } from 'react';
import {
    Save, Building2, MapPin, Clock,
    CreditCard, Monitor, Moon
} from 'lucide-react';

interface PropertyConfig {
    // Basic Info
    propertyName: string;
    propertyCode: string;
    grade: string;
    totalRooms: number;

    // Location
    address: string;
    city: string;
    state: string;
    zipCode: string;
    country: string;
    timezone: string;
    phone: string;
    email: string;

    // Timing
    checkInTime: string;
    checkOutTime: string;
    nightAuditTime: string;

    // Financial
    currency: string;
    vatRate: number;
    serviceChargeRate: number;
    isTaxInclusive: boolean;

    // Policies
    earlyCheckInCharge: number;
    lateCheckOutCharge: number;
    noShowCharge: number;
    overbookingAllowed: boolean;

    // Automation
    autoRun: boolean;
    autoPostRent: boolean;
    emailReports: string;
}

const PropertySetup = () => {
    const [activeTab, setActiveTab] = useState('identity');
    const [config, setConfig] = useState<PropertyConfig>({
        propertyName: 'NICE Hotel & Suites',
        propertyCode: 'NICE001',
        grade: '5-Star',
        totalRooms: 100,
        address: '123 Main Street',
        city: 'New York',
        state: 'NY',
        zipCode: '10001',
        country: 'United States',
        timezone: 'America/New_York',
        phone: '+1 234 567 8900',
        email: 'info@nicehotel.com',
        checkInTime: '14:00',
        checkOutTime: '11:00',
        nightAuditTime: '02:00',
        currency: 'USD',
        vatRate: 10,
        serviceChargeRate: 5,
        isTaxInclusive: false,
        earlyCheckInCharge: 50,
        lateCheckOutCharge: 50,
        noShowCharge: 100,
        overbookingAllowed: false,
        autoRun: true,
        autoPostRent: true,
        emailReports: ''
    });

    const [selectedAmenities, setSelectedAmenities] = useState<string[]>(['WiFi', 'Parking']);
    const toggleAmenity = (item: string) => setSelectedAmenities(prev => prev.includes(item) ? prev.filter(a => a !== item) : [...prev, item]);

    const handleSave = () => {
        console.log('Saving property configuration:', config);
        alert('Property configuration saved successfully!');
    };

    const tabs = [
        { id: 'identity', label: 'Identity & Location', icon: <Building2 size={18} /> },
        { id: 'operations', label: 'Operations & Policy', icon: <Clock size={18} /> },
        { id: 'finance', label: 'Finance & Accounts', icon: <CreditCard size={18} /> },
        { id: 'system', label: 'System & Interfaces', icon: <Monitor size={18} /> },
    ];

    return (
        <div className="min-h-screen bg-gray-50 text-gray-800 font-sans">
            {/* Header */}
            <header className="bg-white border-b sticky top-0 z-10 px-4 py-3 flex justify-between items-center shadow-sm">
                <div className="flex items-center gap-3">
                    <div>
                        <h1 className="text-xl font-bold text-gray-800">Property Setup</h1>
                        <p className="text-xs text-gray-500">Configure your hotel settings and details</p>
                    </div>
                </div>
                <div className="flex gap-2">
                    <button className="px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium text-sm">Save Draft</button>
                    <button onClick={handleSave} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium text-sm flex items-center gap-2">
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
                                            <input type="text" value={config.propertyName} onChange={(e) => setConfig({ ...config, propertyName: e.target.value })} placeholder="Official Property Name" className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" />
                                        </div>
                                        <div className="space-y-1">
                                            <label className="text-sm font-medium text-gray-700">Property Code <span className="text-red-500">*</span></label>
                                            <input type="text" value={config.propertyCode} onChange={(e) => setConfig({ ...config, propertyCode: e.target.value })} placeholder="e.g. HTL-DHK-01" className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" />
                                        </div>

                                        <div className="space-y-1">
                                            <label className="text-sm font-medium text-gray-700">Grade / Star Rating</label>
                                            <select value={config.grade} onChange={(e) => setConfig({ ...config, grade: e.target.value })} className="w-full px-3 py-2 border rounded-lg bg-white outline-none">
                                                <option>5-Star</option><option>4-Star</option><option>3-Star</option><option>2-Star</option><option>1-Star</option><option>Luxury</option>
                                            </select>
                                        </div>
                                        <div className="space-y-1">
                                            <label className="text-sm font-medium text-gray-700">Total Rooms Count <span className="text-red-500">*</span></label>
                                            <input type="number" value={config.totalRooms} onChange={(e) => setConfig({ ...config, totalRooms: parseInt(e.target.value) })} className="w-full px-3 py-2 border rounded-lg outline-none" />
                                        </div>
                                    </div>
                                </div>

                                {/* Section 2: Location */}
                                <div>
                                    <h2 className="text-lg font-semibold border-b pb-2 mb-4 flex items-center gap-2"><MapPin size={20} className="text-gray-400" /> Location & Contact</h2>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <div className="col-span-2 space-y-1">
                                            <label className="text-sm font-medium text-gray-700">Address <span className="text-red-500">*</span></label>
                                            <textarea rows={2} value={config.address} onChange={(e) => setConfig({ ...config, address: e.target.value })} className="w-full px-3 py-2 border rounded-lg outline-none"></textarea>
                                        </div>

                                        <div className="space-y-1"><label className="text-sm font-medium text-gray-700">City</label><input type="text" value={config.city} onChange={(e) => setConfig({ ...config, city: e.target.value })} className="w-full px-3 py-2 border rounded-lg outline-none" /></div>
                                        <div className="space-y-1"><label className="text-sm font-medium text-gray-700">State/Province</label><input type="text" value={config.state} onChange={(e) => setConfig({ ...config, state: e.target.value })} className="w-full px-3 py-2 border rounded-lg outline-none" /></div>
                                        <div className="space-y-1"><label className="text-sm font-medium text-gray-700">Zip/Postal Code</label><input type="text" value={config.zipCode} onChange={(e) => setConfig({ ...config, zipCode: e.target.value })} className="w-full px-3 py-2 border rounded-lg outline-none" /></div>
                                        <div className="space-y-1"><label className="text-sm font-medium text-gray-700">Country <span className="text-red-500">*</span></label><input type="text" value={config.country} onChange={(e) => setConfig({ ...config, country: e.target.value })} className="w-full px-3 py-2 border rounded-lg outline-none" /></div>

                                        <div className="space-y-1"><label className="text-sm font-medium text-gray-700">Timezone <span className="text-red-500">*</span></label><select value={config.timezone} onChange={(e) => setConfig({ ...config, timezone: e.target.value })} className="w-full px-3 py-2 border rounded-lg bg-white outline-none"><option value="America/New_York">Eastern Time (US)</option><option value="America/Chicago">Central Time (US)</option><option value="Asia/Dhaka">Dhaka (BST)</option></select></div>
                                        <div className="space-y-1"><label className="text-sm font-medium text-gray-700">Phone</label><input type="text" value={config.phone} onChange={(e) => setConfig({ ...config, phone: e.target.value })} className="w-full px-3 py-2 border rounded-lg outline-none" /></div>
                                        <div className="space-y-1"><label className="text-sm font-medium text-gray-700">Email</label><input type="email" value={config.email} onChange={(e) => setConfig({ ...config, email: e.target.value })} className="w-full px-3 py-2 border rounded-lg outline-none" /></div>

                                        <div className="col-span-1 md:col-span-2 mt-4 pt-4 border-t">
                                            <h3 className="text-sm font-bold text-gray-900 mb-4">Property Amenities</h3>
                                            <div className="flex flex-wrap gap-2">
                                                {['WiFi', 'Parking', 'Swimming Pool', 'Gym', 'Spa', 'Restaurant', 'Bar', 'Room Service', 'Conference Room', 'Airport Shuttle'].map(item => (
                                                    <label key={item} className={`flex items-center gap-2 px-3 py-2 rounded border cursor-pointer transition-colors ${selectedAmenities.includes(item) ? 'bg-blue-50 border-blue-200 text-blue-700' : 'hover:bg-gray-50'}`}>
                                                        <input type="checkbox" checked={selectedAmenities.includes(item)} onChange={() => toggleAmenity(item)} className="rounded text-blue-600" />
                                                        <span className="text-sm font-medium">{item}</span>
                                                    </label>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* TAB 2: OPERATIONS & POLICY */}
                        {activeTab === 'operations' && (
                            <div className="space-y-8 animate-fadeIn">
                                <div>
                                    <h2 className="text-lg font-semibold border-b pb-2 mb-4 flex items-center gap-2"><Clock size={20} className="text-gray-400" /> Operations & Defaults</h2>
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                        <div className="space-y-1"><label className="text-sm font-medium text-gray-700">Check-in Time</label><input type="time" value={config.checkInTime} onChange={(e) => setConfig({ ...config, checkInTime: e.target.value })} className="w-full px-3 py-2 border rounded-lg outline-none" /></div>
                                        <div className="space-y-1"><label className="text-sm font-medium text-gray-700">Check-out Time</label><input type="time" value={config.checkOutTime} onChange={(e) => setConfig({ ...config, checkOutTime: e.target.value })} className="w-full px-3 py-2 border rounded-lg outline-none" /></div>
                                        <div className="space-y-1"><label className="text-sm font-medium text-gray-700">Night Audit Time</label><input type="time" value={config.nightAuditTime} onChange={(e) => setConfig({ ...config, nightAuditTime: e.target.value })} className="w-full px-3 py-2 border rounded-lg outline-none" /><p className="text-xs text-gray-500 mt-1">Automated audit time</p></div>
                                    </div>
                                </div>

                                <div>
                                    <h2 className="text-lg font-semibold border-b pb-2 mb-4 flex items-center gap-2"><CreditCard size={20} className="text-gray-400" /> Policies & Charges</h2>
                                    <div className="grid grid-cols-2 gap-6">
                                        <div className="space-y-1"><label className="text-sm font-medium text-gray-700">Early Check-In Charge ($)</label><input type="number" min="0" value={config.earlyCheckInCharge} onChange={(e) => setConfig({ ...config, earlyCheckInCharge: parseFloat(e.target.value) })} className="w-full px-3 py-2 border rounded-lg outline-none" /><p className="text-xs text-gray-500 mt-1">Charge for check-in before standard time</p></div>
                                        <div className="space-y-1"><label className="text-sm font-medium text-gray-700">Late Check-Out Charge ($)</label><input type="number" min="0" value={config.lateCheckOutCharge} onChange={(e) => setConfig({ ...config, lateCheckOutCharge: parseFloat(e.target.value) })} className="w-full px-3 py-2 border rounded-lg outline-none" /><p className="text-xs text-gray-500 mt-1">Charge for check-out after standard time</p></div>
                                        <div className="space-y-1"><label className="text-sm font-medium text-gray-700">No-Show Charge ($)</label><input type="number" min="0" value={config.noShowCharge} onChange={(e) => setConfig({ ...config, noShowCharge: parseFloat(e.target.value) })} className="w-full px-3 py-2 border rounded-lg outline-none" /><p className="text-xs text-gray-500 mt-1">Penalty for no-show reservations</p></div>
                                        <div className="flex items-center p-4 bg-gray-50 rounded-lg">
                                            <label className="flex items-center gap-3 cursor-pointer">
                                                <input type="checkbox" checked={config.overbookingAllowed} onChange={(e) => setConfig({ ...config, overbookingAllowed: e.target.checked })} className="w-5 h-5 text-blue-600 rounded focus:ring-2 focus:ring-blue-500" />
                                                <div><span className="font-medium text-gray-900">Allow Overbooking</span><p className="text-sm text-gray-600">Enable accepting more reservations</p></div>
                                            </label>
                                        </div>
                                    </div>
                                </div>

                                <div>
                                    <h2 className="text-lg font-semibold border-b pb-2 mb-4 flex items-center gap-2"><Moon size={20} className="text-gray-400" /> Night Audit Automation</h2>
                                    <div className="space-y-6">
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                            <div className="space-y-1 col-span-2"><label className="text-sm font-medium text-gray-700">Email Reports To</label><input type="email" value={config.emailReports} onChange={(e) => setConfig({ ...config, emailReports: e.target.value })} placeholder="owner@hotel.com, manager@hotel.com" className="w-full px-3 py-2 border rounded-lg outline-none" /><p className="text-xs text-gray-500">Comma separated emails for daily reports</p></div>
                                        </div>

                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            <label className="flex flex-col p-3 bg-gray-50 rounded border cursor-pointer hover:bg-gray-100 transition-colors gap-2">
                                                <div className="flex justify-between items-center w-full"><span className="text-sm font-medium text-gray-700">Auto-Run Audit?</span><input type="checkbox" checked={config.autoRun} onChange={() => setConfig({ ...config, autoRun: !config.autoRun })} className="toggle toggle-sm text-blue-600" /></div>
                                                <span className="text-xs text-gray-500">If ON, system runs audit automatically at set time</span>
                                            </label>

                                            <label className="flex flex-col p-3 bg-gray-50 rounded border cursor-pointer hover:bg-gray-100 transition-colors gap-2">
                                                <div className="flex justify-between items-center w-full"><span className="text-sm font-medium text-gray-700">Auto-Post Room Rent?</span><input type="checkbox" checked={config.autoPostRent} onChange={() => setConfig({ ...config, autoPostRent: !config.autoPostRent })} className="toggle toggle-sm text-blue-600" /></div>
                                                <span className="text-xs text-gray-500">Automatically post room charges during audit</span>
                                            </label>
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
                                        <div className="space-y-1"><label className="text-sm font-medium text-gray-700">Base Currency *</label><select value={config.currency} onChange={(e) => setConfig({ ...config, currency: e.target.value })} className="w-full px-3 py-2 border rounded-lg bg-white outline-none"><option value="USD">USD - US Dollar ($)</option><option value="EUR">EUR - Euro (€)</option><option value="BDT">BDT - Bangladeshi Taka (৳)</option></select></div>

                                        <div className="space-y-1"><label className="text-sm font-medium text-gray-700">VAT/Tax Rate (%)</label><input type="number" min="0" max="100" step="0.1" value={config.vatRate} onChange={(e) => setConfig({ ...config, vatRate: parseFloat(e.target.value) })} className="w-full px-3 py-2 border rounded-lg outline-none" /></div>

                                        <div className="space-y-1"><label className="text-sm font-medium text-gray-700">Service Charge (%)</label><input type="number" min="0" max="100" step="0.1" value={config.serviceChargeRate} onChange={(e) => setConfig({ ...config, serviceChargeRate: parseFloat(e.target.value) })} className="w-full px-3 py-2 border rounded-lg outline-none" /></div>

                                        <div className="flex items-center gap-3 md:pt-6">
                                            <label className="label cursor-pointer gap-2">
                                                <input type="checkbox" checked={config.isTaxInclusive} onChange={() => setConfig({ ...config, isTaxInclusive: !config.isTaxInclusive })} className="toggle toggle-primary toggle-sm" />
                                                <span className="label-text text-sm font-medium">Is Tax Inclusive?</span>
                                            </label>
                                        </div>
                                    </div>

                                    <div className="mt-6 p-4 bg-green-50 rounded-lg">
                                        <p className="text-sm text-green-900">
                                            <strong>Example:</strong> Room rate $100 + VAT {config.vatRate}% (${(100 * config.vatRate / 100).toFixed(2)}) + Service {config.serviceChargeRate}% (${(100 * config.serviceChargeRate / 100).toFixed(2)}) = <strong>${(100 + (100 * config.vatRate / 100) + (100 * config.serviceChargeRate / 100)).toFixed(2)}</strong>
                                        </p>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* TAB 4: SYSTEM */}
                        {activeTab === 'system' && (
                            <div className="space-y-8 animate-fadeIn">
                                <div>
                                    <h2 className="text-lg font-semibold border-b pb-2 mb-4 flex items-center gap-2"><Monitor size={20} className="text-gray-400" /> System Configuration</h2>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <div className="space-y-1"><label className="text-sm font-medium text-gray-700">Key Card System</label><select className="w-full px-3 py-2 border rounded-lg bg-white outline-none"><option>VingCard</option><option>Salto</option><option>Onity</option></select></div>
                                        <div className="space-y-1"><label className="text-sm font-medium text-gray-700">Channel Manager</label><select className="w-full px-3 py-2 border rounded-lg bg-white outline-none"><option>SiteMinder</option><option>Staah</option></select></div>
                                        <div className="col-span-2 space-y-1"><label className="text-sm font-medium text-gray-700">SMS Gateway API Key</label><input type="text" className="w-full px-3 py-2 border rounded-lg outline-none font-mono text-xs" /></div>
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

export default PropertySetup;
