import { useState } from 'react';
import { Target, Plus, Edit, Trash2, Search, X, Save } from 'lucide-react';
import { toast } from '../context/ToastContext';

interface BusinessSource {
    id: number;
    sourceName: string;
    sourceGroup: 'OTA' | 'Direct' | 'GDS' | 'Corporate' | 'Walk-in';
    commissionType: 'Percentage' | 'Flat Amount';
    commissionValue: number;
    voucherRequired: boolean;
    active: boolean;
    linkedRateCode: string;
    contactEmail: string;
    contractNumber: string;
    notes: string;
}

interface MarketSegment {
    id: number;
    marketCode: string;
    description: string;
    reportCategory: 'Transient' | 'Group';
    isComplimentary: boolean;
    color: string;
}

const BusinessOriginManagement = () => {
    const [activeTab, setActiveTab] = useState<'sources' | 'segments'>('sources');

    // Business Sources
    const [sources, setSources] = useState<BusinessSource[]>([
        {
            id: 1,
            sourceName: 'Booking.com',
            sourceGroup: 'OTA',
            commissionType: 'Percentage',
            commissionValue: 15,
            voucherRequired: true,
            active: true,
            linkedRateCode: 'OTA_RATE',
            contactEmail: 'partner@booking.com',
            contractNumber: 'BDC-2024-001',
            notes: 'Standard OTA commission, monthly settlement'
        },
        {
            id: 2,
            sourceName: 'Agoda',
            sourceGroup: 'OTA',
            commissionType: 'Percentage',
            commissionValue: 18,
            voucherRequired: true,
            active: true,
            linkedRateCode: 'OTA_RATE',
            contactEmail: 'support@agoda.com',
            contractNumber: 'AGD-2024-002',
            notes: 'Higher commission but good volume'
        },
        {
            id: 3,
            sourceName: 'Hotel Website',
            sourceGroup: 'Direct',
            commissionType: 'Flat Amount',
            commissionValue: 0,
            voucherRequired: false,
            active: true,
            linkedRateCode: 'BAR',
            contactEmail: '',
            contractNumber: '',
            notes: 'Direct bookings, no commission'
        },
        {
            id: 4,
            sourceName: 'Walk-in',
            sourceGroup: 'Walk-in',
            commissionType: 'Flat Amount',
            commissionValue: 0,
            voucherRequired: false,
            active: true,
            linkedRateCode: 'WALK_IN',
            contactEmail: '',
            contractNumber: '',
            notes: 'Front desk walk-in guests'
        },
        {
            id: 5,
            sourceName: 'Amadeus GDS',
            sourceGroup: 'GDS',
            commissionType: 'Percentage',
            commissionValue: 10,
            voucherRequired: true,
            active: true,
            linkedRateCode: 'GDS_RATE',
            contactEmail: 'gds@amadeus.com',
            contractNumber: 'AMD-2024-003',
            notes: 'Global Distribution System'
        },
        {
            id: 6,
            sourceName: 'Corporate Direct',
            sourceGroup: 'Corporate',
            commissionType: 'Flat Amount',
            commissionValue: 0,
            voucherRequired: false,
            active: true,
            linkedRateCode: 'CORP_RATE',
            contactEmail: '',
            contractNumber: '',
            notes: 'Direct corporate bookings'
        }
    ]);

    // Market Segments
    const [segments, setSegments] = useState<MarketSegment[]>([
        { id: 1, marketCode: 'CORP', description: 'Corporate / Business Traveler', reportCategory: 'Transient', isComplimentary: false, color: '#3b82f6' },
        { id: 2, marketCode: 'LEIS', description: 'Leisure / Vacation', reportCategory: 'Transient', isComplimentary: false, color: '#10b981' },
        { id: 3, marketCode: 'GRP', description: 'Group Booking', reportCategory: 'Group', isComplimentary: false, color: '#f59e0b' },
        { id: 4, marketCode: 'NGO', description: 'NGO / Non-Profit', reportCategory: 'Transient', isComplimentary: false, color: '#8b5cf6' },
        { id: 5, marketCode: 'GOVT', description: 'Government Official', reportCategory: 'Transient', isComplimentary: false, color: '#ef4444' },
        { id: 6, marketCode: 'HOUSE', description: 'House Use / Owner', reportCategory: 'Transient', isComplimentary: true, color: '#6b7280' },
        { id: 7, marketCode: 'COMP', description: 'Complimentary Guest', reportCategory: 'Transient', isComplimentary: true, color: '#ec4899' }
    ]);

    const [searchTerm, setSearchTerm] = useState('');
    const [showSourceForm, setShowSourceForm] = useState(false);
    const [showSegmentForm, setShowSegmentForm] = useState(false);
    const [editingSource, setEditingSource] = useState<BusinessSource | null>(null);
    const [editingSegment, setEditingSegment] = useState<MarketSegment | null>(null);

    const [sourceForm, setSourceForm] = useState<Partial<BusinessSource>>({
        sourceName: '',
        sourceGroup: 'OTA',
        commissionType: 'Percentage',
        commissionValue: 0,
        voucherRequired: false,
        active: true,
        linkedRateCode: '',
        contactEmail: '',
        contractNumber: '',
        notes: ''
    });

    const [segmentForm, setSegmentForm] = useState<Partial<MarketSegment>>({
        marketCode: '',
        description: '',
        reportCategory: 'Transient',
        isComplimentary: false,
        color: '#3b82f6'
    });

    const filteredSources = sources.filter(s =>
        s.sourceName.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const filteredSegments = segments.filter(s =>
        s.marketCode.toLowerCase().includes(searchTerm.toLowerCase()) ||
        s.description.toLowerCase().includes(searchTerm.toLowerCase())
    );

    // Calculate stats
    const totalRevenue = 1000000;
    const sourceStats = sources.map(source => {
        const revenue = Math.random() * 200000;
        const commission = source.commissionType === 'Percentage'
            ? (revenue * source.commissionValue / 100)
            : source.commissionValue;
        return { source: source.sourceName, revenue, commission, net: revenue - commission };
    });

    // Source handlers
    const handleSaveSource = () => {
        if (!sourceForm.sourceName) {
            toast.error('Source name is required!');
            return;
        }

        if (editingSource) {
            setSources(sources.map(s => s.id === editingSource.id ? { ...editingSource, ...sourceForm } as BusinessSource : s));
        } else {
            const newSource: BusinessSource = {
                ...sourceForm,
                id: Date.now(),
            } as BusinessSource;
            setSources([...sources, newSource]);
        }
        resetSourceForm();
    };

    const handleEditSource = (source: BusinessSource) => {
        setEditingSource(source);
        setSourceForm(source);
        setShowSourceForm(true);
    };

    const handleDeleteSource = (id: number) => {
        if (confirm('Are you sure you want to delete this source?')) {
            setSources(sources.filter(s => s.id !== id));
        }
    };

    const resetSourceForm = () => {
        setSourceForm({
            sourceName: '',
            sourceGroup: 'OTA',
            commissionType: 'Percentage',
            commissionValue: 0,
            voucherRequired: false,
            active: true,
            linkedRateCode: '',
            contactEmail: '',
            contractNumber: '',
            notes: ''
        });
        setEditingSource(null);
        setShowSourceForm(false);
    };

    // Segment handlers
    const handleSaveSegment = () => {
        if (!segmentForm.marketCode) {
            toast.error('Market code is required!');
            return;
        }

        if (editingSegment) {
            setSegments(segments.map(s => s.id === editingSegment.id ? { ...editingSegment, ...segmentForm } as MarketSegment : s));
        } else {
            const newSegment: MarketSegment = {
                ...segmentForm,
                id: Date.now(),
            } as MarketSegment;
            setSegments([...segments, newSegment]);
        }
        resetSegmentForm();
    };

    const handleEditSegment = (segment: MarketSegment) => {
        setEditingSegment(segment);
        setSegmentForm(segment);
        setShowSegmentForm(true);
    };

    const handleDeleteSegment = (id: number) => {
        if (confirm('Are you sure you want to delete this segment?')) {
            setSegments(segments.filter(s => s.id !== id));
        }
    };

    const resetSegmentForm = () => {
        setSegmentForm({
            marketCode: '',
            description: '',
            reportCategory: 'Transient',
            isComplimentary: false,
            color: '#3b82f6'
        });
        setEditingSegment(null);
        setShowSegmentForm(false);
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-50 via-purple-50/20 to-gray-50 p-4 md:p-6 lg:p-8">
            {/* Header */}
            <div className="mb-8">
                <div className="flex items-center gap-3 mb-2">
                    <div className="w-12 h-12 bg-gradient-to-br from-purple-600 to-purple-700 rounded-xl flex items-center justify-center shadow-lg shadow-purple-600/30">
                        <Target size={24} className="text-white" />
                    </div>
                    <div>
                        <h1 className="text-3xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent">Business Origins & Market Segments</h1>
                        <p className="text-sm text-gray-500">Track booking sources and guest demographics</p>
                    </div>
                </div>
            </div>

            {/* Tabs */}
            <div className="bg-white/80 backdrop-blur-sm p-2 rounded-2xl border border-gray-200 shadow-lg mb-6 inline-flex">
                <button
                    onClick={() => setActiveTab('sources')}
                    className={`px-6 py-3 rounded-xl font-semibold transition-all ${activeTab === 'sources'
                            ? 'bg-gradient-to-r from-purple-600 to-purple-700 text-white shadow-lg'
                            : 'text-gray-700 hover:bg-gray-100'
                        }`}
                >
                    Business Sources
                </button>
                <button
                    onClick={() => setActiveTab('segments')}
                    className={`px-6 py-3 rounded-xl font-semibold transition-all ${activeTab === 'segments'
                            ? 'bg-gradient-to-r from-purple-600 to-purple-700 text-white shadow-lg'
                            : 'text-gray-700 hover:bg-gray-100'
                        }`}
                >
                    Market Segments
                </button>
            </div>

            {activeTab === 'sources' ? (
                <>
                    {/* Stats */}
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
                        <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm">
                            <p className="text-xs font-semibold text-gray-500 uppercase mb-2">Total Sources</p>
                            <p className="text-3xl font-bold text-gray-900">{sources.length}</p>
                        </div>
                        <div className="bg-gradient-to-br from-emerald-500 to-emerald-600 p-5 rounded-2xl shadow-lg shadow-emerald-500/30">
                            <p className="text-xs font-semibold text-emerald-100 uppercase mb-2">Active</p>
                            <p className="text-3xl font-bold text-white">{sources.filter(s => s.active).length}</p>
                        </div>
                        <div className="bg-gradient-to-br from-blue-500 to-blue-600 p-5 rounded-2xl shadow-lg shadow-blue-500/30">
                            <p className="text-xs font-semibold text-blue-100 uppercase mb-2">Total Revenue</p>
                            <p className="text-3xl font-bold text-white">৳{(totalRevenue / 1000).toFixed(0)}K</p>
                        </div>
                        <div className="bg-gradient-to-br from-red-500 to-red-600 p-5 rounded-2xl shadow-lg shadow-red-500/30">
                            <p className="text-xs font-semibold text-red-100 uppercase mb-2">Total Commission</p>
                            <p className="text-3xl font-bold text-white">৳{(sourceStats.reduce((sum, s) => sum + s.commission, 0) / 1000).toFixed(0)}K</p>
                        </div>
                    </div>

                    {/* Search & Add */}
                    <div className="bg-white/80 backdrop-blur-sm p-6 rounded-2xl border border-gray-200 shadow-lg mb-6">
                        <div className="flex items-center justify-between gap-4">
                            <div className="flex-1 relative">
                                <Search size={20} className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400" />
                                <input
                                    type="text"
                                    placeholder="Search sources..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="w-full pl-12 pr-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500"
                                />
                            </div>
                            <button
                                onClick={() => setShowSourceForm(true)}
                                className="px-6 py-3 bg-gradient-to-r from-purple-600 to-purple-700 text-white rounded-xl font-semibold hover:from-purple-700 hover:to-purple-800 transition-all shadow-lg flex items-center gap-2"
                            >
                                <Plus size={20} />
                                Add Source
                            </button>
                        </div>
                    </div>

                    {/* Sources Table */}
                    <div className="bg-white rounded-2xl border border-gray-200 shadow-xl overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead className="bg-gradient-to-r from-gray-50 to-gray-100 border-b border-gray-200">
                                    <tr>
                                        <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase">Source Name</th>
                                        <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase">Group</th>
                                        <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase">Commission</th>
                                        <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase">Voucher Required</th>
                                        <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase">Linked Rate</th>
                                        <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase">Status</th>
                                        <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {filteredSources.map((source) => (
                                        <tr key={source.id} className="hover:bg-purple-50/50 transition-colors">
                                            <td className="px-6 py-4">
                                                <p className="text-sm font-bold text-gray-900">{source.sourceName}</p>
                                                {source.contractNumber && (
                                                    <p className="text-xs text-gray-500">Contract: {source.contractNumber}</p>
                                                )}
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className="px-3 py-1 bg-purple-100 text-purple-700 rounded-full text-xs font-semibold">
                                                    {source.sourceGroup}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4">
                                                <p className="text-sm font-bold text-gray-900">
                                                    {source.commissionType === 'Percentage'
                                                        ? `${source.commissionValue}%`
                                                        : `৳${source.commissionValue}`
                                                    }
                                                </p>
                                            </td>
                                            <td className="px-6 py-4">
                                                {source.voucherRequired ? (
                                                    <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-semibold">Yes</span>
                                                ) : (
                                                    <span className="px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-xs font-semibold">No</span>
                                                )}
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className="text-sm font-semibold text-gray-700">{source.linkedRateCode}</span>
                                            </td>
                                            <td className="px-6 py-4">
                                                {source.active ? (
                                                    <span className="px-3 py-1 bg-emerald-100 text-emerald-700 rounded-full text-xs font-bold">Active</span>
                                                ) : (
                                                    <span className="px-3 py-1 bg-red-100 text-red-700 rounded-full text-xs font-bold">Inactive</span>
                                                )}
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-2">
                                                    <button
                                                        onClick={() => handleEditSource(source)}
                                                        className="p-2 hover:bg-purple-100 rounded-lg transition-colors"
                                                    >
                                                        <Edit size={16} className="text-purple-600" />
                                                    </button>
                                                    <button
                                                        onClick={() => handleDeleteSource(source.id)}
                                                        className="p-2 hover:bg-red-100 rounded-lg transition-colors"
                                                    >
                                                        <Trash2 size={16} className="text-red-600" />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </>
            ) : (
                <>
                    {/* Market Segments Stats */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
                        <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm">
                            <p className="text-xs font-semibold text-gray-500 uppercase mb-2">Total Segments</p>
                            <p className="text-3xl font-bold text-gray-900">{segments.length}</p>
                        </div>
                        <div className="bg-gradient-to-br from-blue-500 to-blue-600 p-5 rounded-2xl shadow-lg shadow-blue-500/30">
                            <p className="text-xs font-semibold text-blue-100 uppercase mb-2">Transient</p>
                            <p className="text-3xl font-bold text-white">{segments.filter(s => s.reportCategory === 'Transient').length}</p>
                        </div>
                        <div className="bg-gradient-to-br from-amber-500 to-amber-600 p-5 rounded-2xl shadow-lg shadow-amber-500/30">
                            <p className="text-xs font-semibold text-amber-100 uppercase mb-2">Group</p>
                            <p className="text-3xl font-bold text-white">{segments.filter(s => s.reportCategory === 'Group').length}</p>
                        </div>
                    </div>

                    {/* Search & Add */}
                    <div className="bg-white/80 backdrop-blur-sm p-6 rounded-2xl border border-gray-200 shadow-lg mb-6">
                        <div className="flex items-center justify-between gap-4">
                            <div className="flex-1 relative">
                                <Search size={20} className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400" />
                                <input
                                    type="text"
                                    placeholder="Search segments..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="w-full pl-12 pr-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500"
                                />
                            </div>
                            <button
                                onClick={() => setShowSegmentForm(true)}
                                className="px-6 py-3 bg-gradient-to-r from-purple-600 to-purple-700 text-white rounded-xl font-semibold hover:from-purple-700 hover:to-purple-800 transition-all shadow-lg flex items-center gap-2"
                            >
                                <Plus size={20} />
                                Add Segment
                            </button>
                        </div>
                    </div>

                    {/* Segments Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {filteredSegments.map((segment) => (
                            <div key={segment.id} className="bg-white rounded-2xl border border-gray-200 shadow-lg hover:shadow-xl transition-all p-6">
                                <div className="flex items-start justify-between mb-4">
                                    <div className="flex items-center gap-3">
                                        <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ backgroundColor: segment.color + '20' }}>
                                            <span className="text-2xl font-bold" style={{ color: segment.color }}>{segment.marketCode.substring(0, 2)}</span>
                                        </div>
                                        <div>
                                            <h3 className="text-lg font-bold text-gray-900">{segment.marketCode}</h3>
                                            <p className="text-xs text-gray-500">{segment.reportCategory}</p>
                                        </div>
                                    </div>
                                    {segment.isComplimentary && (
                                        <span className="px-3 py-1 bg-pink-100 text-pink-700 rounded-full text-xs font-bold">FREE</span>
                                    )}
                                </div>
                                <p className="text-sm text-gray-700 mb-4">{segment.description}</p>
                                <div className="flex items-center gap-2">
                                    <button
                                        onClick={() => handleEditSegment(segment)}
                                        className="flex-1 py-2 border border-purple-300 text-purple-700 rounded-lg font-semibold hover:bg-purple-50 transition-all flex items-center justify-center gap-2"
                                    >
                                        <Edit size={16} />
                                        Edit
                                    </button>
                                    <button
                                        onClick={() => handleDeleteSegment(segment.id)}
                                        className="p-2 border border-red-300 text-red-700 rounded-lg hover:bg-red-50 transition-all"
                                    >
                                        <Trash2 size={16} />
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                </>
            )}

            {/* Source Form Modal */}
            {showSourceForm && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
                        <div className="bg-gradient-to-r from-purple-600 to-purple-700 p-6 text-white">
                            <div className="flex items-center justify-between">
                                <h2 className="text-2xl font-bold">{editingSource ? 'Edit' : 'Add'} Business Source</h2>
                                <button onClick={resetSourceForm} className="p-2 hover:bg-white/20 rounded-lg transition-colors">
                                    <X size={24} />
                                </button>
                            </div>
                        </div>

                        <div className="flex-1 overflow-y-auto p-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="md:col-span-2">
                                    <label className="block text-sm font-semibold text-gray-700 mb-2">Source Name *</label>
                                    <input
                                        type="text"
                                        value={sourceForm.sourceName}
                                        onChange={(e) => setSourceForm({ ...sourceForm, sourceName: e.target.value })}
                                        className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500"
                                        placeholder="e.g., Booking.com"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-2">Source Group *</label>
                                    <select
                                        value={sourceForm.sourceGroup}
                                        onChange={(e) => setSourceForm({ ...sourceForm, sourceGroup: e.target.value as any })}
                                        className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500"
                                    >
                                        <option value="OTA">OTA (Online Travel Agent)</option>
                                        <option value="Direct">Direct</option>
                                        <option value="GDS">GDS (Global Distribution)</option>
                                        <option value="Corporate">Corporate</option>
                                        <option value="Walk-in">Walk-in</option>
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-2">Commission Type *</label>
                                    <select
                                        value={sourceForm.commissionType}
                                        onChange={(e) => setSourceForm({ ...sourceForm, commissionType: e.target.value as any })}
                                        className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500"
                                    >
                                        <option value="Percentage">Percentage (%)</option>
                                        <option value="Flat Amount">Flat Amount (৳)</option>
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                                        Commission Value ({sourceForm.commissionType === 'Percentage' ? '%' : '৳'})
                                    </label>
                                    <input
                                        type="number"
                                        value={sourceForm.commissionValue}
                                        onChange={(e) => setSourceForm({ ...sourceForm, commissionValue: Number(e.target.value) })}
                                        className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500"
                                        placeholder="15"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-2">Linked Rate Code</label>
                                    <input
                                        type="text"
                                        value={sourceForm.linkedRateCode}
                                        onChange={(e) => setSourceForm({ ...sourceForm, linkedRateCode: e.target.value })}
                                        className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500"
                                        placeholder="OTA_RATE"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-2">Contact Email</label>
                                    <input
                                        type="email"
                                        value={sourceForm.contactEmail}
                                        onChange={(e) => setSourceForm({ ...sourceForm, contactEmail: e.target.value })}
                                        className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500"
                                        placeholder="partner@booking.com"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-2">Contract Number</label>
                                    <input
                                        type="text"
                                        value={sourceForm.contractNumber}
                                        onChange={(e) => setSourceForm({ ...sourceForm, contractNumber: e.target.value })}
                                        className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500"
                                        placeholder="BDC-2024-001"
                                    />
                                </div>

                                <div className="md:col-span-2">
                                    <label className="block text-sm font-semibold text-gray-700 mb-2">Notes</label>
                                    <textarea
                                        value={sourceForm.notes}
                                        onChange={(e) => setSourceForm({ ...sourceForm, notes: e.target.value })}
                                        className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500"
                                        rows={3}
                                        placeholder="Additional notes..."
                                    />
                                </div>

                                <div className="md:col-span-2 flex items-center gap-6">
                                    <label className="flex items-center gap-3 cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={sourceForm.voucherRequired}
                                            onChange={(e) => setSourceForm({ ...sourceForm, voucherRequired: e.target.checked })}
                                            className="w-5 h-5 text-purple-600 border-gray-300 rounded focus:ring-purple-500"
                                        />
                                        <span className="text-sm font-semibold text-gray-700">Voucher Required</span>
                                    </label>

                                    <label className="flex items-center gap-3 cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={sourceForm.active}
                                            onChange={(e) => setSourceForm({ ...sourceForm, active: e.target.checked })}
                                            className="w-5 h-5 text-purple-600 border-gray-300 rounded focus:ring-purple-500"
                                        />
                                        <span className="text-sm font-semibold text-gray-700">Active</span>
                                    </label>
                                </div>
                            </div>
                        </div>

                        <div className="bg-gray-50 border-t border-gray-200 p-6 flex items-center justify-end gap-3">
                            <button
                                onClick={resetSourceForm}
                                className="px-6 py-3 border border-gray-300 text-gray-700 rounded-xl font-semibold hover:bg-gray-100 transition-all"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleSaveSource}
                                className="px-6 py-3 bg-gradient-to-r from-purple-600 to-purple-700 text-white rounded-xl font-semibold hover:from-purple-700 hover:to-purple-800 transition-all shadow-lg flex items-center gap-2"
                            >
                                <Save size={20} />
                                Save Source
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Segment Form Modal */}
            {showSegmentForm && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-3xl shadow-2xl w-full max-w-xl max-h-[90vh] overflow-hidden flex flex-col">
                        <div className="bg-gradient-to-r from-purple-600 to-purple-700 p-6 text-white">
                            <div className="flex items-center justify-between">
                                <h2 className="text-2xl font-bold">{editingSegment ? 'Edit' : 'Add'} Market Segment</h2>
                                <button onClick={resetSegmentForm} className="p-2 hover:bg-white/20 rounded-lg transition-colors">
                                    <X size={24} />
                                </button>
                            </div>
                        </div>

                        <div className="flex-1 overflow-y-auto p-6">
                            <div className="space-y-6">
                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-2">Market Code *</label>
                                    <input
                                        type="text"
                                        value={segmentForm.marketCode}
                                        onChange={(e) => setSegmentForm({ ...segmentForm, marketCode: e.target.value.toUpperCase() })}
                                        className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500"
                                        placeholder="CORP"
                                        maxLength={10}
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-2">Description *</label>
                                    <input
                                        type="text"
                                        value={segmentForm.description}
                                        onChange={(e) => setSegmentForm({ ...segmentForm, description: e.target.value })}
                                        className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500"
                                        placeholder="Corporate / Business Traveler"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-2">Report Category *</label>
                                    <select
                                        value={segmentForm.reportCategory}
                                        onChange={(e) => setSegmentForm({ ...segmentForm, reportCategory: e.target.value as any })}
                                        className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500"
                                    >
                                        <option value="Transient">Transient (Individual)</option>
                                        <option value="Group">Group (Multiple Rooms)</option>
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-2">Color</label>
                                    <div className="flex items-center gap-3">
                                        <input
                                            type="color"
                                            value={segmentForm.color}
                                            onChange={(e) => setSegmentForm({ ...segmentForm, color: e.target.value })}
                                            className="w-16 h-12 border border-gray-300 rounded-xl cursor-pointer"
                                        />
                                        <input
                                            type="text"
                                            value={segmentForm.color}
                                            onChange={(e) => setSegmentForm({ ...segmentForm, color: e.target.value })}
                                            className="flex-1 px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500"
                                            placeholder="#3b82f6"
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label className="flex items-center gap-3 cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={segmentForm.isComplimentary}
                                            onChange={(e) => setSegmentForm({ ...segmentForm, isComplimentary: e.target.checked })}
                                            className="w-5 h-5 text-purple-600 border-gray-300 rounded focus:ring-purple-500"
                                        />
                                        <span className="text-sm font-semibold text-gray-700">Complimentary (Free Stay)</span>
                                    </label>
                                </div>
                            </div>
                        </div>

                        <div className="bg-gray-50 border-t border-gray-200 p-6 flex items-center justify-end gap-3">
                            <button
                                onClick={resetSegmentForm}
                                className="px-6 py-3 border border-gray-300 text-gray-700 rounded-xl font-semibold hover:bg-gray-100 transition-all"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleSaveSegment}
                                className="px-6 py-3 bg-gradient-to-r from-purple-600 to-purple-700 text-white rounded-xl font-semibold hover:from-purple-700 hover:to-purple-800 transition-all shadow-lg flex items-center gap-2"
                            >
                                <Save size={20} />
                                Save Segment
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default BusinessOriginManagement;
