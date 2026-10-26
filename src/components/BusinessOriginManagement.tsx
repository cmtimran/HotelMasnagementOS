import { useState, useMemo } from 'react';
import { Target, Plus, Edit, Trash2, Search, X, Save, CheckCircle2, DollarSign, Percent } from 'lucide-react';
import { toast } from '../context/ToastContext';
import PageHeader from './common/PageHeader';
import { getAllStoredReservations } from '../utils/roomInventoryEngine';

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

    // Calculate stats dynamically from stored reservations
    const storedReservations = useMemo(() => getAllStoredReservations(), []);
    const totalRevenue = useMemo(() => {
        const sum = storedReservations.reduce((acc, r: any) => acc + (Number(r?.totalAmount || r?.summary?.grandTotal) || 0), 0);
        return sum > 0 ? sum : 0;
    }, [storedReservations]);
    const sourceStats = useMemo(() => sources.map(source => {
        const matching = storedReservations.filter((r: any) =>
            String(r?.source || r?.guest?.reservationType || '').toLowerCase().includes(source.sourceName.toLowerCase())
        );
        const revenue = matching.reduce((acc, r: any) => acc + (Number(r?.totalAmount || r?.summary?.grandTotal) || 0), 0);
        const commission = source.commissionType === 'Percentage'
            ? (revenue * source.commissionValue / 100)
            : (matching.length * source.commissionValue);
        return { source: source.sourceName, revenue, commission, net: revenue - commission };
    }), [sources, storedReservations]);

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
        <div className="page-container">
            <PageHeader
                title="Business Origins & Market Segments"
                subtitle="Track booking channels, OTA commissions & guest demographic segmentation"
                icon={<Target size={20} />}
                actions={
                    <button
                        type="button"
                        onClick={() => activeTab === 'sources' ? setShowSourceForm(true) : setShowSegmentForm(true)}
                        className="btn-primary"
                    >
                        <Plus size={14} className="stroke-[2.5]" />
                        <span>{activeTab === 'sources' ? 'Add Source' : 'Add Segment'}</span>
                    </button>
                }
            />

            {/* Standardized Segmented Tabs */}
            <div className="bg-slate-100/90 p-1 rounded-xl border border-slate-200/80 inline-flex gap-1">
                <button
                    type="button"
                    onClick={() => setActiveTab('sources')}
                    className={`px-4 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${activeTab === 'sources'
                        ? 'bg-white text-primary shadow-2xs font-bold'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                >
                    Business Sources ({sources.length})
                </button>
                <button
                    type="button"
                    onClick={() => setActiveTab('segments')}
                    className={`px-4 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${activeTab === 'segments'
                        ? 'bg-white text-primary shadow-2xs font-bold'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                >
                    Market Segments ({segments.length})
                </button>
            </div>

            {activeTab === 'sources' ? (
                <>
                    {/* Stats */}
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                        <div className="kpi-card">
                            <div>
                                <p className="text-[11px] text-slate-400 uppercase tracking-wider">Total Sources</p>
                                <p className="text-xl sm:text-2xl text-slate-900 mt-1">{sources.length}</p>
                                <p className="text-[11px] text-slate-500 mt-0.5">Configured channels</p>
                            </div>
                            <div className="size-9 rounded-xl bg-primary-subtle text-primary flex items-center justify-center shrink-0">
                                <Target size={17} />
                            </div>
                        </div>
                        <div className="kpi-card">
                            <div>
                                <p className="text-[11px] text-slate-400 uppercase tracking-wider">Active Channels</p>
                                <p className="text-xl sm:text-2xl text-emerald-600 mt-1">{sources.filter(s => s.active).length}</p>
                                <p className="text-[11px] text-emerald-600 font-medium mt-0.5">Accepting bookings</p>
                            </div>
                            <div className="size-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                                <CheckCircle2 size={17} />
                            </div>
                        </div>
                        <div className="kpi-card">
                            <div>
                                <p className="text-[11px] text-slate-400 uppercase tracking-wider">Total Revenue</p>
                                <p className="text-xl sm:text-2xl text-slate-900 mt-1">৳{totalRevenue.toLocaleString()}</p>
                                <p className="text-[11px] text-slate-500 mt-0.5">Tracked reservation yield</p>
                            </div>
                            <div className="size-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                                <DollarSign size={17} />
                            </div>
                        </div>
                        <div className="kpi-card">
                            <div>
                                <p className="text-[11px] text-slate-400 uppercase tracking-wider">OTA Commissions</p>
                                <p className="text-xl sm:text-2xl text-rose-600 mt-1">৳{Math.round(sourceStats.reduce((sum, s) => sum + s.commission, 0)).toLocaleString()}</p>
                                <p className="text-[11px] text-slate-500 mt-0.5">Estimated agency fee</p>
                            </div>
                            <div className="size-9 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center shrink-0">
                                <Percent size={17} />
                            </div>
                        </div>
                    </div>

                    {/* Search & Add */}
                    <div className="card-container !p-3.5">
                        <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
                            <div className="w-full sm:w-80 relative">
                                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                                <input
                                    type="text"
                                    placeholder="Search sources..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="input-standard pl-9"
                                />
                            </div>
                            <button
                                type="button"
                                onClick={() => setShowSourceForm(true)}
                                className="btn-primary"
                            >
                                <Plus size={14} />
                                <span>Add Source</span>
                            </button>
                        </div>
                    </div>

                    {/* Sources Table */}
                    <div className="table-container">
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead>
                                    <tr>
                                        <th>Source Name</th>
                                        <th>Group</th>
                                        <th>Commission</th>
                                        <th>Voucher Required</th>
                                        <th>Linked Rate</th>
                                        <th>Status</th>
                                        <th className="text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filteredSources.map((source) => (
                                        <tr key={source.id} className="hover:bg-slate-50 transition-colors">
                                            <td>
                                                <p className="text-xs text-slate-900">{source.sourceName}</p>
                                                {source.contractNumber && (
                                                    <p className="text-[11px] text-slate-500">Contract: {source.contractNumber}</p>
                                                )}
                                            </td>
                                            <td>
                                                <span className="px-2.5 py-0.5 bg-blue-50 text-primary border border-blue-200 rounded-full text-[10px] font-bold">
                                                    {source.sourceGroup}
                                                </span>
                                            </td>
                                            <td>
                                                <p className="text-xs text-slate-900">
                                                    {source.commissionType === 'Percentage'
                                                        ? `${source.commissionValue}%`
                                                        : `৳${source.commissionValue}`
                                                    }
                                                </p>
                                            </td>
                                            <td>
                                                {source.voucherRequired ? (
                                                    <span className="px-2.5 py-0.5 bg-amber-50 text-amber-700 border border-amber-200 rounded-full text-[10px] font-bold">Yes</span>
                                                ) : (
                                                    <span className="px-2.5 py-0.5 bg-slate-100 text-slate-600 border border-slate-200 rounded-full text-[10px] font-bold">No</span>
                                                )}
                                            </td>
                                            <td>
                                                <span className="badge-code">{source.linkedRateCode || 'BAR'}</span>
                                            </td>
                                            <td>
                                                {source.active ? (
                                                    <span className="badge-status-active">Active</span>
                                                ) : (
                                                    <span className="badge-status-inactive">Inactive</span>
                                                )}
                                            </td>
                                            <td className="text-right">
                                                <div className="flex items-center justify-end gap-1">
                                                    <button
                                                        type="button"
                                                        onClick={() => handleEditSource(source)}
                                                        className="btn-icon"
                                                    >
                                                        <Edit size={13} />
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() => handleDeleteSource(source.id)}
                                                        className="btn-icon-danger"
                                                    >
                                                        <Trash2 size={13} />
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
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="kpi-card">
                            <div>
                                <p className="text-[11px] text-slate-400 uppercase tracking-wider">Total Segments</p>
                                <p className="text-xl sm:text-2xl text-slate-900 mt-1">{segments.length}</p>
                            </div>
                            <div className="size-9 rounded-xl bg-primary-subtle text-primary flex items-center justify-center shrink-0">
                                <Target size={17} />
                            </div>
                        </div>
                        <div className="kpi-card">
                            <div>
                                <p className="text-[11px] text-slate-400 uppercase tracking-wider">Transient</p>
                                <p className="text-xl sm:text-2xl text-primary mt-1">{segments.filter(s => s.reportCategory === 'Transient').length}</p>
                            </div>
                            <div className="size-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                                <CheckCircle2 size={17} />
                            </div>
                        </div>
                        <div className="kpi-card">
                            <div>
                                <p className="text-[11px] text-slate-400 uppercase tracking-wider">Group</p>
                                <p className="text-xl sm:text-2xl text-amber-600 mt-1">{segments.filter(s => s.reportCategory === 'Group').length}</p>
                            </div>
                            <div className="size-9 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
                                <Target size={17} />
                            </div>
                        </div>
                    </div>

                    {/* Search & Add */}
                    <div className="card-container !p-3.5">
                        <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
                            <div className="w-full sm:w-80 relative">
                                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                                <input
                                    type="text"
                                    placeholder="Search segments..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="input-standard pl-9"
                                />
                            </div>
                            <button
                                type="button"
                                onClick={() => setShowSegmentForm(true)}
                                className="btn-primary"
                            >
                                <Plus size={14} />
                                <span>Add Segment</span>
                            </button>
                        </div>
                    </div>

                    {/* Segments Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {filteredSegments.map((segment) => (
                            <div key={segment.id} className="card-container flex flex-col justify-between">
                                <div>
                                    <div className="flex items-start justify-between mb-3">
                                        <div className="flex items-center gap-3">
                                            <div className="size-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: segment.color + '18' }}>
                                                <span className="text-sm font-bold" style={{ color: segment.color }}>{segment.marketCode.substring(0, 3)}</span>
                                            </div>
                                            <div>
                                                <h3 className="text-sm text-slate-900">{segment.marketCode}</h3>
                                                <p className="text-[11px] text-slate-500">{segment.reportCategory}</p>
                                            </div>
                                        </div>
                                        {segment.isComplimentary && (
                                            <span className="px-2 py-0.5 bg-pink-50 text-pink-700 border border-pink-200 rounded-full text-[10px] font-bold">COMP</span>
                                        )}
                                    </div>
                                    <p className="text-xs text-slate-600 mb-4">{segment.description}</p>
                                </div>
                                <div className="flex items-center gap-2 pt-3 border-t border-slate-100">
                                    <button
                                        type="button"
                                        onClick={() => handleEditSegment(segment)}
                                        className="btn-secondary flex-1"
                                    >
                                        <Edit size={13} />
                                        <span>Edit</span>
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => handleDeleteSegment(segment.id)}
                                        className="btn-icon-danger border border-slate-200"
                                    >
                                        <Trash2 size={13} />
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
