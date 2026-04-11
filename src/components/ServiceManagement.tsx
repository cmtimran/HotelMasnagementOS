import { useState } from 'react';
import {
    Plus, Edit2, Trash2, Save, X,
    Truck, WashingMachine, Waves, Car, Coffee,
    DollarSign, Laptop, HeartPulse, Music, Info,
    ArrowRight, Tag
} from 'lucide-react';

interface HotelService {
    id: number;
    name: string;
    category: 'Transportation' | 'Laundry' | 'Recreation' | 'F&B Extra' | 'Business' | 'Wellness' | 'Entertainment';
    shortCode: string;
    description: string;
    status: 'Active' | 'Inactive';

    // Pricing
    unitName: string; // e.g., 'Per Unit', 'Per KM', 'Per Hour'
    internalCost: number;
    sellingPrice: number;
    revenueCode: string;
    taxInclusive: boolean;

    // Operations
    isOutsourced: boolean;
    vendorName?: string;
    allowanceType: 'Quantity' | 'Credit' | 'Unlimited';
}

export default function ServiceManagement() {
    const [view, setView] = useState<'list' | 'form'>('list');
    const [services, setServices] = useState<HotelService[]>([
        {
            id: 1,
            name: 'Airport Pickup (Standard)',
            category: 'Transportation',
            shortCode: 'TR-AIR-IN',
            description: 'One-way airport pick-up via standard sedan',
            status: 'Active',
            unitName: 'Per Trip',
            internalCost: 800,
            sellingPrice: 1500,
            revenueCode: 'REV-TRANS-GUEST',
            taxInclusive: false,
            isOutsourced: false,
            allowanceType: 'Quantity'
        },
        {
            id: 2,
            name: 'Laundry - Shirt & Trouser',
            category: 'Laundry',
            shortCode: 'LND-ST',
            description: 'Wash & Iron for single shirt or trouser',
            status: 'Active',
            unitName: 'Per Piece',
            internalCost: 50,
            sellingPrice: 250,
            revenueCode: 'REV-LND-VALET',
            taxInclusive: true,
            isOutsourced: true,
            vendorName: 'QuickClean Valet',
            allowanceType: 'Quantity'
        },
        {
            id: 3,
            name: 'Deep Tissue Massage (60m)',
            category: 'Wellness',
            shortCode: 'W-SPA-DT',
            description: 'Complete therapeutic full body massage by professional therapists',
            status: 'Active',
            unitName: 'Per Session',
            internalCost: 1500,
            sellingPrice: 4500,
            revenueCode: 'REV-WELL-SPA',
            taxInclusive: true,
            isOutsourced: false,
            allowanceType: 'Credit'
        },
        {
            id: 4,
            name: 'Full Day Gym Access',
            category: 'Recreation',
            shortCode: 'REC-GYM-D',
            description: 'Full access to weight room, treadmill and steam bath',
            status: 'Active',
            unitName: 'Per Day',
            internalCost: 0,
            sellingPrice: 800,
            revenueCode: 'REV-REC-GYM',
            taxInclusive: true,
            isOutsourced: false,
            allowanceType: 'Unlimited'
        },
        {
            id: 5,
            name: 'Rollaway Extra Bed',
            category: 'F&B Extra',
            shortCode: 'RM-EXTRA-BED',
            description: 'Premium folding extra bed with orthopedic mattress',
            status: 'Active',
            unitName: 'Per Night',
            internalCost: 400,
            sellingPrice: 2500,
            revenueCode: 'REV-ROOM-EXTRA',
            taxInclusive: false,
            isOutsourced: false,
            allowanceType: 'Quantity'
        },
        {
            id: 6,
            name: 'Minibar - Non-Alcoholic Mix',
            category: 'F&B Extra',
            shortCode: 'MINI-NOMIX',
            description: 'Pack of 2 water, 2 sodas, and 1 juice',
            status: 'Active',
            unitName: 'Per Stay',
            internalCost: 200,
            sellingPrice: 750,
            revenueCode: 'REV-FB-MINI',
            taxInclusive: true,
            isOutsourced: false,
            allowanceType: 'Quantity'
        }
    ]);
    const [formData, setFormData] = useState<Partial<HotelService>>({});
    const [editingService, setEditingService] = useState<HotelService | null>(null);

    const openCreate = () => {
        setFormData({
            status: 'Active',
            taxInclusive: false,
            isOutsourced: false,
            allowanceType: 'Quantity',
            category: 'Transportation'
        });
        setEditingService(null);
        setView('form');
    };

    const openEdit = (service: HotelService) => {
        setFormData({ ...service });
        setEditingService(service);
        setView('form');
    };

    const handleSave = () => {
        if (formData.name && formData.shortCode) {
            if (editingService) {
                setServices(services.map(s => s.id === editingService.id ? { ...formData, id: editingService.id } as HotelService : s));
            } else {
                const newService = { ...formData, id: Date.now() } as HotelService;
                setServices([...services, newService]);
            }
            setView('list');
            setFormData({});
            setEditingService(null);
        }
    };

    const handleDelete = (id: number) => {
        setServices(services.filter(s => s.id !== id));
    };

    const getIcon = (category: string) => {
        switch (category) {
            case 'Transportation': return <Car size={16} />;
            case 'Laundry': return <WashingMachine size={16} />;
            case 'Recreation': return <Waves size={16} />;
            case 'F&B Extra': return <Coffee size={16} />;
            case 'Business': return <Laptop size={16} />;
            case 'Wellness': return <HeartPulse size={16} />;
            case 'Entertainment': return <Music size={16} />;
            default: return <Tag size={16} />;
        }
    };

    const renderList = () => (
        <div className="p-6 max-w-7xl mx-auto">
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Service Master Data</h1>
                    <p className="text-sm text-gray-500">Manage non-room services, transport, and ancillary revenue items</p>
                </div>
                <button
                    onClick={openCreate}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition shadow-sm font-bold"
                >
                    <Plus size={18} />
                    Create Service
                </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {services.map(service => (
                    <div key={service.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-all overflow-hidden group">
                        <div className="p-5">
                            <div className="flex justify-between items-start mb-4">
                                <div className={`p-2 rounded-xl ${service.status === 'Active' ? 'bg-blue-50 text-blue-600' : 'bg-gray-50 text-gray-400'}`}>
                                    {getIcon(service.category)}
                                </div>
                                <span className={`text-[10px] font-bold px-2 py-1 rounded-full uppercase border ${
                                    service.status === 'Active' ? 'bg-green-50 text-green-700 border-green-100' : 'bg-gray-50 text-gray-400 border-gray-100'
                                }`}>
                                    {service.status}
                                </span>
                            </div>
                            <div>
                                <h3 className="font-bold text-gray-900 group-hover:text-blue-600 transition-colors">{service.name}</h3>
                                <p className="text-xs text-gray-400 font-mono mt-1">{service.shortCode}</p>
                                <p className="text-xs text-gray-500 mt-3 line-clamp-2 leading-relaxed h-8">
                                    {service.description}
                                </p>
                            </div>
                        </div>
                        
                        <div className="px-5 py-4 bg-gray-50/50 border-t border-gray-50 flex items-center justify-between mt-auto">
                            <div>
                                <div className="text-[10px] font-bold text-gray-400 uppercase tracking-tighter">Rate ({service.unitName})</div>
                                <div className="text-lg font-black text-gray-900">৳{service.sellingPrice}</div>
                            </div>
                            <div className="flex gap-2">
                                <button 
                                    onClick={() => openEdit(service)}
                                    className="p-2 text-gray-400 hover:text-blue-600 hover:bg-white rounded-lg transition-all shadow-sm"
                                >
                                    <Edit2 size={16} />
                                </button>
                                <button 
                                    onClick={() => handleDelete(service.id)}
                                    className="p-2 text-gray-400 hover:text-red-600 hover:bg-white rounded-lg transition-all shadow-sm"
                                >
                                    <Trash2 size={16} />
                                </button>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );

    const renderForm = () => (
        <div className="min-h-screen flex flex-col bg-gray-50">
            {/* Header */}
            <div className="bg-white border-b px-8 py-6 flex justify-between items-center sticky top-0 z-10">
                <div className="flex items-center gap-6">
                    <button onClick={() => setView('list')} className="p-3 hover:bg-gray-50 rounded-2xl transition-all border border-gray-100 text-gray-400 hover:text-gray-900">
                        <X size={20} />
                    </button>
                    <div>
                        <h1 className="text-2xl font-black text-gray-900 tracking-tight">
                            {formData.id ? 'Refine Service' : 'Define New Service'}
                        </h1>
                        <p className="text-sm font-medium text-gray-400">Master Data Configuration (Layer 1)</p>
                    </div>
                </div>
                <div className="flex gap-4">
                    <button onClick={() => setView('list')} className="px-6 py-2.5 text-gray-500 font-bold hover:text-gray-900">Discard</button>
                    <button onClick={handleSave} className="flex items-center gap-2 px-8 py-2.5 bg-gray-900 text-white rounded-2xl hover:bg-blue-600 transition-all shadow-lg font-bold">
                        <Save size={18} />
                        Save Service
                    </button>
                </div>
            </div>

            <div className="flex-1 p-10">
                <div className="max-w-5xl mx-auto grid grid-cols-12 gap-8">
                    {/* Left Panel: Basic Data */}
                    <div className="col-span-8 space-y-8">
                        <div className="bg-white rounded-3xl p-8 border border-gray-100 shadow-sm space-y-8">
                            <div className="flex items-center gap-3 border-b border-gray-50 pb-6">
                                <div className="p-2 bg-blue-50 text-blue-600 rounded-xl">
                                    <Info size={20} />
                                </div>
                                <h2 className="text-xl font-bold text-gray-900 tracking-tight">Service Identity</h2>
                            </div>

                            <div className="grid grid-cols-2 gap-8">
                                <div className="col-span-2 space-y-3">
                                    <label className="text-xs font-black text-gray-400 uppercase tracking-widest pl-1">Official Service Name</label>
                                    <input
                                        type="text"
                                        className="w-full px-5 py-4 bg-gray-50 border-0 rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none text-base font-bold transition-all"
                                        placeholder="e.g. VIP Airport Transfer (Tesla Model S)"
                                        value={formData.name || ''}
                                        onChange={e => setFormData({ ...formData, name: e.target.value })}
                                    />
                                </div>

                                <div className="space-y-3">
                                    <label className="text-xs font-black text-gray-400 uppercase tracking-widest pl-1">Category</label>
                                    <select
                                        className="w-full px-5 py-4 bg-gray-50 border-0 rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none text-sm font-bold"
                                        value={formData.category || ''}
                                        onChange={e => setFormData({ ...formData, category: e.target.value as any })}
                                    >
                                        <option value="Transportation">Transportation</option>
                                        <option value="Laundry">Valet & Laundry</option>
                                        <option value="Recreation">Recreation & Pool</option>
                                        <option value="F&B Extra">F&B Ancillary</option>
                                        <option value="Business">Business Center</option>
                                        <option value="Wellness">Wellness & Spa</option>
                                        <option value="Entertainment">Entertainment</option>
                                    </select>
                                </div>

                                <div className="space-y-3">
                                    <label className="text-xs font-black text-gray-400 uppercase tracking-widest pl-1">Internal Code</label>
                                    <input
                                        type="text"
                                        className="w-full px-5 py-4 bg-gray-50 border-0 rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none text-sm font-mono font-bold"
                                        placeholder="e.g. TR-V-001"
                                        value={formData.shortCode || ''}
                                        onChange={e => setFormData({ ...formData, shortCode: e.target.value.toUpperCase() })}
                                    />
                                </div>

                                <div className="col-span-2 space-y-3">
                                    <label className="text-xs font-black text-gray-400 uppercase tracking-widest pl-1">Service Description</label>
                                    <textarea
                                        className="w-full px-5 py-4 bg-gray-50 border-0 rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none text-sm font-medium resize-none h-32"
                                        placeholder="Briefly describe the service for the guest folio and booking summaries..."
                                        value={formData.description || ''}
                                        onChange={e => setFormData({ ...formData, description: e.target.value })}
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="bg-white rounded-3xl p-8 border border-gray-100 shadow-sm space-y-8">
                            <div className="flex items-center gap-3 border-b border-gray-50 pb-6">
                                <div className="p-2 bg-emerald-50 text-emerald-600 rounded-xl">
                                    <DollarSign size={20} />
                                </div>
                                <h2 className="text-xl font-bold text-gray-900 tracking-tight">Commercials & Accounting</h2>
                            </div>

                            <div className="grid grid-cols-2 gap-8">
                                <div className="space-y-3">
                                    <label className="text-xs font-black text-gray-400 uppercase tracking-widest pl-1">Selling Price (Guest Rate)</label>
                                    <div className="relative">
                                        <span className="absolute left-5 top-4 text-gray-400 font-bold">৳</span>
                                        <input
                                            type="number"
                                            className="w-full pl-10 pr-5 py-4 bg-emerald-50/30 border-2 border-emerald-50 rounded-2xl focus:ring-2 focus:ring-emerald-500 outline-none text-lg font-black text-emerald-900"
                                            placeholder="0.00"
                                            value={formData.sellingPrice || ''}
                                            onChange={e => setFormData({ ...formData, sellingPrice: parseFloat(e.target.value) })}
                                        />
                                    </div>
                                </div>

                                <div className="space-y-3">
                                    <label className="text-xs font-black text-gray-400 uppercase tracking-widest pl-1">Unit of Measure</label>
                                    <select
                                        className="w-full px-5 py-4 bg-gray-50 border-0 rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none text-sm font-bold"
                                        value={formData.unitName || 'Per Unit'}
                                        onChange={e => setFormData({ ...formData, unitName: e.target.value })}
                                    >
                                        <option value="Per Item">Per Item</option>
                                        <option value="Per Trip">Per Trip</option>
                                        <option value="Per Piece">Per Piece</option>
                                        <option value="Per KM">Per Kilometre</option>
                                        <option value="Per Hour">Per Hour</option>
                                        <option value="Per Stay">Per Stay</option>
                                    </select>
                                </div>

                                <div className="col-span-2 space-y-3">
                                    <label className="text-xs font-black text-gray-400 uppercase tracking-widest pl-1">Revenue Code Mapping</label>
                                    <select
                                        className="w-full px-5 py-4 bg-gray-50 border-0 rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none text-sm font-mono font-bold"
                                        value={formData.revenueCode || ''}
                                        onChange={e => setFormData({ ...formData, revenueCode: e.target.value })}
                                    >
                                        <option value="">Select Ledger Group...</option>
                                        <option value="REV-TRANS-GUEST">REV-TRANS-GUEST (Guest Transport)</option>
                                        <option value="REV-LND-VALET">REV-LND-VALET (Valet Laundry)</option>
                                        <option value="REV-REC-POOL">REV-REC-POOL (Pool/Gym Access)</option>
                                        <option value="REV-MINBAR">REV-MINBAR (Minibar Sales)</option>
                                    </select>
                                </div>

                                <div className="col-span-2 flex items-center justify-between p-4 bg-blue-50/30 rounded-2xl border border-blue-50">
                                    <div className="flex items-center gap-3">
                                        <input
                                            type="checkbox"
                                            className="w-6 h-6 rounded-lg text-blue-600 focus:ring-0"
                                            checked={formData.taxInclusive || false}
                                            onChange={e => setFormData({ ...formData, taxInclusive: e.target.checked })}
                                        />
                                        <div>
                                            <span className="text-sm font-bold text-blue-900 block">Tax Inclusive Price</span>
                                            <span className="text-[10px] text-blue-500 font-bold uppercase">Finance Rule</span>
                                        </div>
                                    </div>
                                    <ArrowRight size={20} className="text-blue-200" />
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Right Panel: Operations & Outsourcing */}
                    <div className="col-span-4 space-y-8">
                        <div className="bg-gray-900 rounded-3xl p-8 border border-gray-800 shadow-xl space-y-8">
                            <div className="flex items-center gap-3 border-b border-gray-800 pb-6">
                                <div className="p-2 bg-blue-500 text-white rounded-xl shadow-lg shadow-blue-500/20">
                                    <Truck size={20} />
                                </div>
                                <h2 className="text-xl font-bold text-white tracking-tight">Operations</h2>
                            </div>

                            <div className="space-y-6">
                                <div className="space-y-4">
                                    <label className="flex items-center justify-between cursor-pointer group">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-6 bg-gray-800 rounded-full relative transition-all group-hover:bg-gray-700">
                                                <div className={`absolute top-1 w-4 h-4 rounded-full transition-all ${formData.isOutsourced ? 'left-5 bg-blue-500 shadow-lg shadow-blue-500/50' : 'left-1 bg-gray-500'}`} />
                                            </div>
                                            <span className="text-sm font-bold text-gray-300">Outsourced</span>
                                        </div>
                                        <input
                                            type="checkbox"
                                            className="hidden"
                                            checked={formData.isOutsourced || false}
                                            onChange={e => setFormData({ ...formData, isOutsourced: e.target.checked })}
                                        />
                                    </label>
                                    <p className="text-[10px] text-gray-500 leading-relaxed font-medium">Enable this if the service is provided by a 3rd party vendor. Automated voucher/PO can be generated upon guest order.</p>
                                </div>

                                {formData.isOutsourced && (
                                    <div className="space-y-3 animate-in fade-in slide-in-from-top-2 duration-300">
                                        <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest pl-1">Vendor Partner</label>
                                        <input
                                            type="text"
                                            className="w-full px-4 py-3 bg-gray-800 border-0 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-sm font-bold text-white"
                                            placeholder="e.g. Dhaka Car Rental Co."
                                            value={formData.vendorName || ''}
                                            onChange={e => setFormData({ ...formData, vendorName: e.target.value })}
                                        />
                                    </div>
                                )}

                                <div className="pt-6 border-t border-gray-800 space-y-4">
                                    <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest pl-1">Default Allowance Behavior</label>
                                    <div className="grid grid-cols-1 gap-2">
                                        {['Quantity', 'Credit', 'Unlimited'].map(type => (
                                            <button
                                                key={type}
                                                onClick={() => setFormData({ ...formData, allowanceType: type as any })}
                                                className={`flex items-center justify-between px-4 py-3 rounded-xl border transition-all text-xs font-bold ${
                                                    formData.allowanceType === type 
                                                    ? 'bg-blue-600 border-blue-600 text-white shadow-lg shadow-blue-600/20' 
                                                    : 'bg-gray-800 border-gray-800 text-gray-400 hover:border-gray-700'
                                                }`}
                                            >
                                                {type}
                                                {formData.allowanceType === type && <ArrowRight size={14} />}
                                            </button>
                                        ))}
                                    </div>
                                    <p className="text-[10px] text-gray-600 font-medium italic">Determines how this service behaves when bundled into a Room Package (Layer 2).</p>
                                </div>
                            </div>
                        </div>

                        <div className="bg-white rounded-3xl p-8 border border-gray-100 shadow-sm">
                            <div className="flex items-center gap-3 mb-4">
                                <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
                                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest leading-none">Smart Helper</span>
                            </div>
                            <p className="text-xs text-gray-500 leading-relaxed">
                                Defining clear <span className="text-gray-900 font-bold">Service Masters</span> allows the <span className="text-blue-600 font-bold">Allowance Engine</span> to automatically track guest consumption against their room package limits without manual staff override.
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );

    return view === 'list' ? renderList() : renderForm();
}
