import React, { useState, useEffect } from 'react';
import { 
    Database, ShieldCheck, CheckCircle2, 
    Clock, Plus, RefreshCw, Trash2, 
    Terminal, Check, X, Layers, FileCode,
    Sparkles, Activity
} from 'lucide-react';
import { getApiBaseUrl } from '../../utils/apiUrl';
import { useToast } from '../../context/ToastContext';
import { useNavigation } from '../../context/NavigationContext';

interface TenantRecord {
    id: number;
    slug: string;
    name: string;
    db_name: string;
    db_host: string;
    db_port: number;
    status: 'ACTIVE' | 'PROVISIONING' | 'SUSPENDED';
    isolation_mode?: 'DEDICATED' | 'SHARED';
    property_id?: number;
    subscription_tier: string;
    admin_name: string;
    admin_email: string;
    created_at: string;
    total_rooms: number;
    occupied_rooms: number;
    revenue_bdt: string | number;
    active_plugins: string[];
}

interface ClusterOverview {
    totalTenants: number;
    dedicatedTenants: number;
    sharedTenants: number;
    scalingCapacity: string;
    activePoolsSaved: string;
}

interface PluginCatalogItem {
    id: number;
    plugin_key: string;
    name: string;
    description: string;
    version: string;
    category: string;
    is_system: boolean;
}

interface CustomRequestItem {
    id: number;
    tenant_slug: string;
    tenant_name: string;
    db_name: string;
    request_type: string;
    title: string;
    description: string;
    target_module: string | null;
    sql_migration: string | null;
    status: 'PENDING' | 'APPROVED' | 'DEPLOYED' | 'REJECTED';
    requested_by: string;
    admin_notes: string | null;
    approved_by: string | null;
    approved_at: string | null;
    deployed_at: string | null;
    execution_logs: string | null;
    created_at: string;
}

export const TenantIsolationHub: React.FC = () => {
    const [activeTab, setActiveTab] = useState<'databases' | 'requests' | 'plugins'>('databases');
    const [tenants, setTenants] = useState<TenantRecord[]>([]);
    const [plugins, setPlugins] = useState<PluginCatalogItem[]>([]);
    const [requests, setRequests] = useState<CustomRequestItem[]>([]);
    const [clusterOverview, setClusterOverview] = useState<ClusterOverview | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [healthStatus, setHealthStatus] = useState<Record<string, { status: string; latencyMs: number; roomCount: number; bookingCount: number }>>({});
    const [pingingSlug, setPingingSlug] = useState<string | null>(null);

    // Provisioning Modal State
    const [isProvisionModalOpen, setIsProvisionModalOpen] = useState(false);
    const [isProvisioning, setIsProvisioning] = useState(false);
    const [provForm, setProvForm] = useState({
        name: '',
        slug: '',
        adminName: '',
        adminEmail: '',
        address: '',
        city: 'Dhaka',
        totalRooms: 10,
        tier: 'STANDARD' as 'STANDARD' | 'ENTERPRISE'
    });

    // Custom Request Modal State
    const [isRequestModalOpen, setIsRequestModalOpen] = useState(false);
    const [isSubmittingRequest, setIsSubmittingRequest] = useState(false);
    const [reqForm, setReqForm] = useState({
        tenantSlug: '',
        requestType: 'PLUGIN_ACTIVATION',
        title: '',
        description: '',
        targetModule: 'banquet_events',
        sqlMigration: '',
        requestedBy: 'Property General Manager'
    });

    // Approval / Rejection Action State
    const [selectedRequestForAction, setSelectedRequestForAction] = useState<CustomRequestItem | null>(null);
    const [actionModalType, setActionModalType] = useState<'APPROVE' | 'REJECT' | null>(null);
    const [actionNotes, setActionNotes] = useState('');
    const [isExecutingAction, setIsExecutingAction] = useState(false);

    const { showToast } = useToast();
    const { setActivePage } = useNavigation();
    const API_BASE = getApiBaseUrl();

    // 1. Fetch Tenants
    const fetchTenants = async () => {
        try {
            setIsLoading(true);
            const res = await fetch(`${API_BASE}/api/central/tenants`);
            const data = await res.json();
            if (data.success) {
                setTenants(data.data);
                if (data.clusterOverview) {
                    setClusterOverview(data.clusterOverview);
                }
            }
        } catch (err: any) {
            console.error('Failed to load tenants:', err);
        } finally {
            setIsLoading(false);
        }
    };

    // Promote Standard (Shared) Tenant to Dedicated Physical Database
    const handleUpgradeTenant = async (slug: string) => {
        try {
            setIsLoading(true);
            const res = await fetch(`${API_BASE}/api/central/tenants/${slug}/upgrade`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' }
            });
            const data = await res.json();
            if (!data.success) throw new Error(data.error);
            showToast(data.data.message || 'Tenant successfully promoted to dedicated database!', {
                type: 'success',
                title: 'Dedicated Database Allocated'
            });
            await fetchTenants();
        } catch (err: any) {
            showToast(err.message, { type: 'error', title: 'Upgrade Failed' });
        } finally {
            setIsLoading(false);
        }
    };

    // 2. Fetch Plugins
    const fetchPlugins = async () => {
        try {
            const res = await fetch(`${API_BASE}/api/central/plugins`);
            const data = await res.json();
            if (data.success) {
                setPlugins(data.data);
            }
        } catch {}
    };

    // 3. Fetch Custom Requests
    const fetchRequests = async () => {
        try {
            const res = await fetch(`${API_BASE}/api/central/custom-requests`);
            const data = await res.json();
            if (data.success) {
                setRequests(data.data);
            }
        } catch {}
    };

    useEffect(() => {
        fetchTenants();
        fetchPlugins();
        fetchRequests();
    }, []);

    // Ping Tenant Health
    const handlePingHealth = async (slug: string) => {
        try {
            setPingingSlug(slug);
            const res = await fetch(`${API_BASE}/api/central/tenants/${slug}/health`);
            const data = await res.json();
            if (data.success) {
                setHealthStatus(prev => ({ ...prev, [slug]: data.data }));
                showToast(`Database '${data.data.dbName}' response time: ${data.data.latencyMs}ms (${data.data.roomCount} rooms active)`, {
                    type: 'success',
                    title: 'Live Isolation Health Check'
                });
            } else {
                throw new Error(data.error);
            }
        } catch (err: any) {
            showToast(`Health check error: ${err.message}`, { type: 'error', title: 'Connection Failure' });
        } finally {
            setPingingSlug(null);
        }
    };

    // Auto slug generator
    const handleNameChange = (name: string) => {
        const generatedSlug = name.toLowerCase()
            .replace(/[^a-z0-9\s-]/g, '')
            .trim()
            .replace(/\s+/g, '-');
        setProvForm(prev => ({ ...prev, name, slug: generatedSlug }));
    };

    // Provision New Tenant Database
    const handleProvisionDatabase = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            setIsProvisioning(true);
            const res = await fetch(`${API_BASE}/api/central/tenants`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(provForm)
            });
            const data = await res.json();
            if (!data.success) throw new Error(data.error);

            showToast(data.data.message || `Database '${data.data.dbName}' provisioned successfully!`, {
                type: 'success',
                title: 'Isolated Database Allocated'
            });

            setIsProvisionModalOpen(false);
            setProvForm({
                name: '',
                slug: '',
                adminName: '',
                adminEmail: '',
                address: '',
                city: 'Cox\'s Bazar',
                totalRooms: 15,
                tier: 'STANDARD'
            });
            await fetchTenants();
        } catch (err: any) {
            showToast(err.message, { type: 'error', title: 'Provisioning Failed' });
        } finally {
            setIsProvisioning(false);
        }
    };

    // Submit Custom Feature Request
    const handleSubmitCustomRequest = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            setIsSubmittingRequest(true);
            const res = await fetch(`${API_BASE}/api/central/custom-requests`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(reqForm)
            });
            const data = await res.json();
            if (!data.success) throw new Error(data.error);

            showToast('Custom feature request submitted. Awaiting Super Admin approval.', {
                type: 'success',
                title: 'Request Dispatched'
            });
            setIsRequestModalOpen(false);
            setReqForm({
                tenantSlug: '',
                requestType: 'PLUGIN_ACTIVATION',
                title: '',
                description: '',
                targetModule: 'banquet_events',
                sqlMigration: '',
                requestedBy: 'Property General Manager'
            });
            await fetchRequests();
            setActiveTab('requests');
        } catch (err: any) {
            showToast(err.message, { type: 'error', title: 'Submission Failed' });
        } finally {
            setIsSubmittingRequest(false);
        }
    };

    // Approve Custom Request & Trigger Isolated Migration
    const handleConfirmApproval = async () => {
        if (!selectedRequestForAction) return;
        try {
            setIsExecutingAction(true);
            const res = await fetch(`${API_BASE}/api/central/custom-requests/${selectedRequestForAction.id}/approve`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    adminNotes: actionNotes,
                    approvedBy: 'Alexander Vance (Super Admin)'
                })
            });
            const data = await res.json();
            if (!data.success) throw new Error(data.error);

            showToast(data.message, {
                type: 'success',
                title: 'Migration Deployed to Isolated Database'
            });

            setSelectedRequestForAction(null);
            setActionModalType(null);
            setActionNotes('');
            await fetchRequests();
            await fetchTenants();
        } catch (err: any) {
            showToast(err.message, { type: 'error', title: 'Approval Failed' });
        } finally {
            setIsExecutingAction(false);
        }
    };

    // Reject Custom Request
    const handleConfirmRejection = async () => {
        if (!selectedRequestForAction) return;
        try {
            setIsExecutingAction(true);
            const res = await fetch(`${API_BASE}/api/central/custom-requests/${selectedRequestForAction.id}/reject`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    adminNotes: actionNotes,
                    approvedBy: 'Alexander Vance (Super Admin)'
                })
            });
            const data = await res.json();
            if (!data.success) throw new Error(data.error);

            showToast('Request rejected with feedback.', { type: 'info', title: 'Request Rejected' });
            setSelectedRequestForAction(null);
            setActionModalType(null);
            setActionNotes('');
            await fetchRequests();
        } catch (err: any) {
            showToast(err.message, { type: 'error', title: 'Rejection Failed' });
        } finally {
            setIsExecutingAction(false);
        }
    };

    // Drop Tenant Database
    const handleDropTenant = async (slug: string, dbName: string) => {
        if (!window.confirm(`CAUTION: Are you sure you want to completely DROP physical database '${dbName}' for property '${slug}'? All isolated tables and room records will be permanently removed!`)) {
            return;
        }

        try {
            const res = await fetch(`${API_BASE}/api/central/tenants/${slug}`, {
                method: 'DELETE'
            });
            const data = await res.json();
            if (!data.success) throw new Error(data.error);

            showToast(data.data.message || `Database '${dbName}' dropped.`, {
                type: 'success',
                title: 'Isolated Database Destroyed'
            });
            await fetchTenants();
        } catch (err: any) {
            showToast(err.message, { type: 'error', title: 'Drop Operation Failed' });
        }
    };

    const pendingRequestsCount = requests.filter(r => r.status === 'PENDING').length;

    return (
        <div className="space-y-6">
            {/* Control Plane Banner */}
            <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-blue-950 text-white rounded-2xl p-6 shadow-xl border border-slate-800">
                <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                    <div className="space-y-1">
                        <div className="flex items-center gap-2">
                            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center gap-1.5">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                                Hybrid Clustered Multi-Tenancy (Standard &amp; Enterprise VIP)
                            </span>
                            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono bg-blue-500/20 text-blue-300 border border-blue-500/30">
                                TiDB Cloud PG Gateway 17
                            </span>
                        </div>
                        <h2 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
                            <Database size={22} className="text-blue-400" />
                            <span>Central Control Plane &amp; Multi-Tenant Database Governance</span>
                        </h2>
                        <p className="text-xs text-slate-300 max-w-3xl leading-relaxed">
                            Engineered to scale from 1 to 10,000+ properties using Hybrid Multi-Tenancy: high-density shared clustering for standard hotels with zero connection pool overhead, and physical dedicated databases for VIP enterprise properties.
                        </p>
                    </div>

                    <div className="flex items-center gap-2.5 flex-wrap">
                        <button
                            type="button"
                            onClick={() => setActivePage('property-create')}
                            className="px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white text-xs font-bold rounded-xl shadow-md flex items-center gap-1.5 cursor-pointer transition-all ring-1 ring-white/20"
                        >
                            <Plus size={15} />
                            <span>Launch Onboarding Wizard</span>
                        </button>
                        <button
                            type="button"
                            onClick={() => {
                                fetchTenants();
                                fetchRequests();
                                fetchPlugins();
                            }}
                            className="p-2 bg-white/10 hover:bg-white/20 text-white rounded-xl transition cursor-pointer"
                            title="Refresh Multi-Tenant Registry"
                        >
                            <RefreshCw size={15} className={isLoading ? 'animate-spin' : ''} />
                        </button>
                    </div>
                </div>

                {/* KPI Chips */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6 pt-5 border-t border-white/10 text-xs">
                    <div className="bg-white/5 rounded-xl p-3 border border-white/10">
                        <span className="text-slate-400 text-[10.5px] uppercase font-bold block">Portfolio Density</span>
                        <div className="text-xl font-bold font-mono text-white mt-0.5">{tenants.length} Properties Active</div>
                        <span className="text-[10px] text-emerald-400 flex items-center gap-1 mt-0.5">
                            <ShieldCheck size={11} /> {clusterOverview?.dedicatedTenants ?? 2} Dedicated DBs • {clusterOverview?.sharedTenants ?? 1} Shared
                        </span>
                    </div>

                    <div className="bg-white/5 rounded-xl p-3 border border-white/10">
                        <span className="text-slate-400 text-[10.5px] uppercase font-bold block">Scaling Capacity</span>
                        <div className="text-xl font-bold font-mono text-cyan-300 mt-0.5">10,000+ Tenants</div>
                        <span className="text-[10px] text-slate-300 mt-0.5 block">High-Density Hybrid Clustered</span>
                    </div>

                    <div className="bg-white/5 rounded-xl p-3 border border-white/10">
                        <span className="text-slate-400 text-[10.5px] uppercase font-bold block">Pool Efficiency</span>
                        <div className="text-xl font-bold font-mono text-emerald-300 mt-0.5">LRU + Shared Cluster</div>
                        <span className="text-[10px] text-emerald-400 mt-0.5 block">0 Connection Leaks • Fast Lookups</span>
                    </div>

                    <div className="bg-white/5 rounded-xl p-3 border border-white/10">
                        <span className="text-slate-400 text-[10.5px] uppercase font-bold block">Pending Custom Requests</span>
                        <div className="text-xl font-bold font-mono text-amber-300 mt-0.5">{pendingRequestsCount} Pending Approval</div>
                        <span className="text-[10px] text-slate-300 mt-0.5 block">Requires Super Admin Review</span>
                    </div>
                </div>
            </div>

            {/* Navigation Tabs */}
            <div className="flex items-center gap-2 border-b border-slate-200 text-xs font-semibold">
                <button
                    type="button"
                    onClick={() => setActiveTab('databases')}
                    className={`pb-3 px-3.5 flex items-center gap-2 cursor-pointer transition-colors relative ${
                        activeTab === 'databases'
                            ? 'text-blue-700 border-b-2 border-blue-700 font-bold'
                            : 'text-slate-500 hover:text-slate-900'
                    }`}
                >
                    <Database size={15} />
                    <span>Isolated Databases &amp; Properties ({tenants.length})</span>
                </button>

                <button
                    type="button"
                    onClick={() => setActiveTab('requests')}
                    className={`pb-3 px-3.5 flex items-center gap-2 cursor-pointer transition-colors relative ${
                        activeTab === 'requests'
                            ? 'text-blue-700 border-b-2 border-blue-700 font-bold'
                            : 'text-slate-500 hover:text-slate-900'
                    }`}
                >
                    <Clock size={15} />
                    <span>Custom Feature Approval Portal</span>
                    {pendingRequestsCount > 0 && (
                        <span className="px-1.5 py-0.2 rounded-full bg-amber-500 text-white text-[10px] font-bold">
                            {pendingRequestsCount}
                        </span>
                    )}
                </button>

                <button
                    type="button"
                    onClick={() => setActiveTab('plugins')}
                    className={`pb-3 px-3.5 flex items-center gap-2 cursor-pointer transition-colors relative ${
                        activeTab === 'plugins'
                            ? 'text-blue-700 border-b-2 border-blue-700 font-bold'
                            : 'text-slate-500 hover:text-slate-900'
                    }`}
                >
                    <Layers size={15} />
                    <span>Modular Plugin Catalog ({plugins.length})</span>
                </button>
            </div>

            {/* TAB 1: Isolated Databases & Properties Grid */}
            {activeTab === 'databases' && (
                <div className="space-y-4">
                    <div className="flex items-center justify-between">
                        <div>
                            <h3 className="text-sm font-bold text-slate-900">Provisioned Tenant Databases</h3>
                            <p className="text-xs text-slate-500">Each database contains an independent relational schema (1NF–4NF) with dedicated sequences and tables.</p>
                        </div>
                        <button
                            type="button"
                            onClick={() => {
                                setReqForm({
                                    tenantSlug: tenants[0]?.slug || '',
                                    requestType: 'PLUGIN_ACTIVATION',
                                    title: '',
                                    description: '',
                                    targetModule: 'banquet_events',
                                    sqlMigration: '',
                                    requestedBy: 'Property General Manager'
                                });
                                setIsRequestModalOpen(true);
                            }}
                            className="px-3.5 py-1.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold rounded-xl shadow-2xs flex items-center gap-1.5 cursor-pointer transition"
                        >
                            <FileCode size={13} className="text-blue-600" />
                            <span>Request Custom Module / Schema</span>
                        </button>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                        {tenants.map(tenant => {
                            const isMaster = tenant.slug === 'grand-palace' || tenant.slug === 'default';
                            const health = healthStatus[tenant.slug];
                            const isPinging = pingingSlug === tenant.slug;

                            return (
                                <div 
                                    key={tenant.id}
                                    className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 space-y-4 flex flex-col justify-between hover:shadow-md transition-all relative overflow-hidden"
                                >
                                    <div className="space-y-3">
                                        {/* Header Row */}
                                        <div className="flex items-start justify-between gap-3">
                                            <div className="flex items-center gap-3">
                                                <div className={`w-11 h-11 rounded-xl flex items-center justify-center font-bold text-white shadow-sm ring-2 ${
                                                    isMaster ? 'bg-gradient-to-br from-blue-700 to-indigo-900 ring-blue-100' : 'bg-gradient-to-br from-emerald-600 to-teal-800 ring-emerald-100'
                                                }`}>
                                                    <Database size={20} />
                                                </div>
                                                <div>
                                                    <div className="flex items-center gap-2">
                                                        <h4 className="text-sm font-bold text-slate-900">{tenant.name}</h4>
                                                        {isMaster ? (
                                                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
                                                                HQ Master Cluster
                                                            </span>
                                                        ) : tenant.isolation_mode === 'SHARED' ? (
                                                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-sky-50 text-sky-700 border border-sky-200 flex items-center gap-1">
                                                                <span className="w-1.5 h-1.5 rounded-full bg-sky-500"></span>
                                                                Standard (High-Density Shared)
                                                            </span>
                                                        ) : (
                                                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1">
                                                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                                                                Enterprise (Dedicated DB)
                                                            </span>
                                                        )}
                                                    </div>
                                                    <div className="flex items-center gap-2 mt-0.5">
                                                        <span className="font-mono text-[11px] text-slate-500 font-semibold bg-slate-100 px-2 py-0.2 rounded">
                                                            slug: {tenant.slug}
                                                        </span>
                                                        <span className="text-[11px] text-slate-400">•</span>
                                                        <span className="text-[11px] text-slate-500 font-mono">
                                                            {tenant.admin_email}
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="text-right flex flex-col items-end">
                                                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Storage Target</span>
                                                <span className="font-mono text-xs font-bold text-slate-800 bg-slate-50 px-2 py-0.5 rounded border border-slate-200 mt-0.5">
                                                    {tenant.isolation_mode === 'SHARED' ? `Shared DB: ${tenant.db_name} (PID: ${tenant.property_id ?? 'N/A'})` : tenant.db_name}
                                                </span>
                                            </div>
                                        </div>

                                        {/* Database Specs Grid */}
                                        <div className="bg-slate-50/80 rounded-xl p-3 border border-slate-200/80 grid grid-cols-3 gap-2 text-xs">
                                            <div>
                                                <span className="text-[10px] font-bold text-slate-400 uppercase block">Port &amp; Cluster</span>
                                                <span className="font-mono text-slate-800 font-semibold text-[11.5px] mt-0.5 block truncate">
                                                    {tenant.db_port} (AWS US-East)
                                                </span>
                                            </div>

                                            <div>
                                                <span className="text-[10px] font-bold text-slate-400 uppercase block">Physical Rooms</span>
                                                <span className="font-mono text-emerald-700 font-bold text-sm mt-0.5 block">
                                                    {health ? health.roomCount : tenant.total_rooms} Rooms
                                                </span>
                                            </div>

                                            <div>
                                                <span className="text-[10px] font-bold text-slate-400 uppercase block">Active Bookings</span>
                                                <span className="font-mono text-blue-700 font-bold text-sm mt-0.5 block">
                                                    {health ? health.bookingCount : '0'} In-System
                                                </span>
                                            </div>
                                        </div>

                                        {/* Active Modular Plugins */}
                                        <div className="space-y-1.5">
                                            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                                                Active Addon Modules in Dedicated Schema
                                            </span>
                                            <div className="flex flex-wrap gap-1.5">
                                                {tenant.active_plugins && tenant.active_plugins.length > 0 ? (
                                                    tenant.active_plugins.map(pKey => (
                                                        <span 
                                                            key={pKey}
                                                            className="px-2.5 py-0.5 rounded-md text-[11px] font-medium bg-indigo-50 text-indigo-700 border border-indigo-200 flex items-center gap-1"
                                                        >
                                                            <Sparkles size={11} className="text-indigo-500" />
                                                            <span>{pKey.replace(/_/g, ' ')}</span>
                                                        </span>
                                                    ))
                                                ) : (
                                                    <span className="text-[11px] text-slate-400 italic">
                                                        No optional addon plugins enabled (Core PMS tables only)
                                                    </span>
                                                )}
                                            </div>
                                        </div>

                                        {/* Health Ping Feedback */}
                                        {health && (
                                            <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-2.5 text-xs text-emerald-900 flex items-center justify-between">
                                                <div className="flex items-center gap-2">
                                                    <CheckCircle2 size={14} className="text-emerald-600 flex-shrink-0" />
                                                    <span>Live Ping: <strong className="font-mono">{health.latencyMs}ms</strong> latency. Database connection responsive.</span>
                                                </div>
                                                <span className="text-[10.5px] font-bold uppercase text-emerald-700 bg-emerald-100 px-2 py-0.2 rounded-full">
                                                    Healthy
                                                </span>
                                            </div>
                                        )}
                                    </div>

                                    {/* Action Bar */}
                                    <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-2 text-xs">
                                        <button
                                            type="button"
                                            onClick={() => handlePingHealth(tenant.slug)}
                                            disabled={isPinging}
                                            className="px-3 py-1.5 border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-xl font-semibold flex items-center gap-1.5 cursor-pointer shadow-2xs transition disabled:opacity-50"
                                        >
                                            <Activity size={13} className={isPinging ? 'animate-spin text-blue-600' : 'text-slate-500'} />
                                            <span>{isPinging ? 'Pinging DB...' : 'Test Isolation Health'}</span>
                                        </button>

                                        <div className="flex items-center gap-2">
                                            {tenant.isolation_mode === 'SHARED' && (
                                                <button
                                                    type="button"
                                                    onClick={() => handleUpgradeTenant(tenant.slug)}
                                                    className="px-2.5 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 rounded-xl font-semibold flex items-center gap-1 cursor-pointer transition shadow-2xs"
                                                    title="Promote tenant to enterprise dedicated physical database"
                                                >
                                                    <Sparkles size={12} className="text-amber-600" />
                                                    <span>Upgrade DB</span>
                                                </button>
                                            )}

                                            <button
                                                type="button"
                                                onClick={() => {
                                                    setReqForm(prev => ({ ...prev, tenantSlug: tenant.slug }));
                                                    setIsRequestModalOpen(true);
                                                }}
                                                className="px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 rounded-xl font-semibold flex items-center gap-1 cursor-pointer transition shadow-2xs"
                                            >
                                                <Plus size={12} />
                                                <span>Request Feature</span>
                                            </button>

                                            {!isMaster && (
                                                <button
                                                    type="button"
                                                    onClick={() => handleDropTenant(tenant.slug, tenant.db_name)}
                                                    className="p-1.5 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded-lg transition cursor-pointer"
                                                    title={`Drop physical database ${tenant.db_name}`}
                                                >
                                                    <Trash2 size={15} />
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* TAB 2: Custom Feature Requests & Approval Portal */}
            {activeTab === 'requests' && (
                <div className="space-y-4">
                    <div className="flex items-center justify-between">
                        <div>
                            <h3 className="text-sm font-bold text-slate-900">Custom Feature &amp; Schema Migration Requests</h3>
                            <p className="text-xs text-slate-500">
                                Review client modification requests. Approving a request triggers isolated migration exclusively on that tenant's database without touching other properties.
                            </p>
                        </div>
                        <button
                            type="button"
                            onClick={() => setIsRequestModalOpen(true)}
                            className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-sm flex items-center gap-1.5 cursor-pointer transition"
                        >
                            <Plus size={13} />
                            <span>New Client Feature Request</span>
                        </button>
                    </div>

                    {requests.length === 0 ? (
                        <div className="text-center py-12 bg-white rounded-2xl border border-slate-200">
                            <Clock size={32} className="text-slate-300 mx-auto mb-2" />
                            <p className="text-xs text-slate-700 font-semibold">No custom requests in queue</p>
                            <p className="text-[11px] text-slate-400 mt-0.5">Properties can submit requests for custom tables, schema additions, or optional addon modules.</p>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {requests.map(req => {
                                const isPending = req.status === 'PENDING';
                                const isDeployed = req.status === 'DEPLOYED';
                                const isRejected = req.status === 'REJECTED';

                                return (
                                    <div 
                                        key={req.id}
                                        className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 space-y-3 hover:shadow-md transition-all"
                                    >
                                        {/* Top Row */}
                                        <div className="flex items-start justify-between gap-4">
                                            <div className="space-y-1">
                                                <div className="flex items-center gap-2">
                                                    <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                                                        isPending 
                                                            ? 'bg-amber-100 text-amber-800 border border-amber-200' 
                                                            : isDeployed 
                                                            ? 'bg-emerald-100 text-emerald-800 border border-emerald-200' 
                                                            : 'bg-rose-100 text-rose-800 border border-rose-200'
                                                    }`}>
                                                        {req.status}
                                                    </span>
                                                    <span className="text-[11px] font-mono text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200 font-semibold">
                                                        {req.request_type}
                                                    </span>
                                                    <span className="text-xs text-slate-400">•</span>
                                                    <span className="text-xs text-slate-500 font-medium">
                                                        Submitted by <strong>{req.requested_by}</strong> on {new Date(req.created_at).toLocaleDateString()}
                                                    </span>
                                                </div>
                                                <h4 className="text-sm font-bold text-slate-900">{req.title}</h4>
                                                <p className="text-xs text-slate-600 leading-relaxed">{req.description}</p>
                                            </div>

                                            <div className="text-right">
                                                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Target Isolated DB</span>
                                                <span className="font-mono text-xs font-bold text-slate-800 bg-slate-50 px-2.5 py-1 rounded-lg border border-slate-200 inline-block mt-0.5">
                                                    {req.db_name} ({req.tenant_slug})
                                                </span>
                                            </div>
                                        </div>

                                        {/* SQL Migration or Target Module Preview */}
                                        {req.sql_migration && (
                                            <div className="bg-slate-900 text-slate-200 rounded-xl p-3 font-mono text-[11px] overflow-x-auto border border-slate-800 shadow-inner">
                                                <div className="text-slate-400 text-[10px] uppercase font-bold mb-1 flex items-center gap-1.5">
                                                    <Terminal size={12} className="text-blue-400" />
                                                    <span>Isolated SQL DDL Script (Applies only to {req.db_name})</span>
                                                </div>
                                                <pre className="text-emerald-400 whitespace-pre-wrap">{req.sql_migration.trim()}</pre>
                                            </div>
                                        )}

                                        {req.target_module && (
                                            <div className="bg-indigo-50/70 border border-indigo-200/80 rounded-xl p-2.5 text-xs text-indigo-950 flex items-center gap-2">
                                                <Sparkles size={14} className="text-indigo-600 flex-shrink-0" />
                                                <span>Target Core Module: <strong>{req.target_module}</strong>. Approving will automatically execute schema DDL and register active state.</span>
                                            </div>
                                        )}

                                        {/* Deployment / Rejection Logs */}
                                        {req.execution_logs && (
                                            <div className="bg-emerald-50/70 border border-emerald-200/70 rounded-xl p-2.5 text-xs text-emerald-950">
                                                <strong className="text-emerald-800 block text-[10.5px] uppercase">Execution Logs:</strong>
                                                <p className="font-mono text-[11px] text-emerald-900 mt-0.5">{req.execution_logs}</p>
                                                {req.approved_by && (
                                                    <span className="text-[10px] text-emerald-700 mt-1 block">
                                                        Approved &amp; verified by {req.approved_by} at {new Date(req.deployed_at || req.approved_at || '').toLocaleString()}
                                                    </span>
                                                )}
                                            </div>
                                        )}

                                        {req.admin_notes && isRejected && (
                                            <div className="bg-rose-50 border border-rose-200 rounded-xl p-2.5 text-xs text-rose-950">
                                                <strong className="text-rose-800 block text-[10.5px] uppercase">Super Admin Feedback:</strong>
                                                <p className="text-[11px] text-rose-900 mt-0.5">{req.admin_notes}</p>
                                            </div>
                                        )}

                                        {/* Admin Action Bar (Only for PENDING) */}
                                        {isPending && (
                                            <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                                                <span className="text-xs text-slate-500 italic">
                                                    Action Required: Manual review by Super Administrator.
                                                </span>

                                                <div className="flex items-center gap-2">
                                                    <button
                                                        type="button"
                                                        onClick={() => {
                                                            setSelectedRequestForAction(req);
                                                            setActionModalType('REJECT');
                                                            setActionNotes('Request does not comply with data architecture standards.');
                                                        }}
                                                        className="px-3 py-1.5 border border-slate-200 hover:bg-rose-50 text-rose-700 rounded-xl text-xs font-semibold cursor-pointer transition shadow-2xs"
                                                    >
                                                        Reject
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() => {
                                                            setSelectedRequestForAction(req);
                                                            setActionModalType('APPROVE');
                                                            setActionNotes('Approved during architectural review. Safe for isolated tenant migration.');
                                                        }}
                                                        className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-sm transition"
                                                    >
                                                        <Check size={14} className="stroke-[3]" />
                                                        <span>Approve &amp; Deploy to Isolated DB</span>
                                                    </button>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            )}

            {/* TAB 3: Modular Plugin Catalog */}
            {activeTab === 'plugins' && (
                <div className="space-y-4">
                    <div>
                        <h3 className="text-sm font-bold text-slate-900">Modular Addon Plugin Store</h3>
                        <p className="text-xs text-slate-500">Official versioned plugins with self-contained schema DDL and business logic for dynamic tenant activation.</p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {plugins.map(plugin => (
                            <div key={plugin.id} className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 space-y-3 flex flex-col justify-between hover:shadow-md transition-all">
                                <div className="space-y-2">
                                    <div className="flex items-center justify-between">
                                        <span className="font-mono text-xs text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200 font-semibold">
                                            {plugin.plugin_key}
                                        </span>
                                        <span className="text-[10px] font-mono text-slate-500 font-bold bg-slate-100 px-2 py-0.5 rounded">
                                            v{plugin.version}
                                        </span>
                                    </div>
                                    <h4 className="text-sm font-bold text-slate-900">{plugin.name}</h4>
                                    <p className="text-xs text-slate-600 leading-relaxed">{plugin.description}</p>
                                </div>

                                <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                                    <span className="text-[10px] font-bold text-slate-500 uppercase">
                                        Category: {plugin.category}
                                    </span>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setReqForm(prev => ({
                                                ...prev,
                                                targetModule: plugin.plugin_key,
                                                title: `Enable ${plugin.name}`,
                                                description: `Enable the ${plugin.name} module for our property database.`
                                            }));
                                            setIsRequestModalOpen(true);
                                        }}
                                        className="px-3 py-1 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-lg font-semibold flex items-center gap-1 cursor-pointer transition shadow-2xs"
                                    >
                                        <Plus size={12} />
                                        <span>Request for Property</span>
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Modal: Automated Provisioning */}
            {isProvisionModalOpen && (
                <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 sm:p-6 overflow-y-auto animate-in fade-in duration-150">
                    <div className="bg-white rounded-2xl shadow-2xl border border-slate-200/90 max-w-[540px] w-full overflow-hidden animate-in zoom-in-95 duration-150 my-auto">
                        <div className="px-6 py-4.5 border-b border-slate-100 flex items-center justify-between bg-slate-50/70">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-700 text-white flex items-center justify-center font-bold shadow-sm ring-2 ring-blue-100">
                                    <Database size={18} />
                                </div>
                                <div>
                                    <h3 className="text-sm font-bold text-slate-900">Provision Dedicated Tenant Database</h3>
                                    <p className="text-xs text-slate-500 font-medium mt-0.5">Automated PostgreSQL physical database creation with 1NF–4NF schema</p>
                                </div>
                            </div>
                            <button
                                type="button"
                                onClick={() => setIsProvisionModalOpen(false)}
                                className="w-8 h-8 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 flex items-center justify-center cursor-pointer transition-colors"
                            >
                                <X size={18} />
                            </button>
                        </div>

                        <form onSubmit={handleProvisionDatabase} className="p-6 space-y-4 text-xs">
                            <div className="space-y-1">
                                <label className="text-[10px] font-bold text-slate-600 uppercase tracking-wider block">Property / Hotel Name</label>
                                <input
                                    type="text"
                                    value={provForm.name}
                                    onChange={e => handleNameChange(e.target.value)}
                                    placeholder="e.g. Radisson Blu Bay Resort"
                                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs outline-none focus:border-blue-500 shadow-2xs font-medium"
                                    required
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="text-[10px] font-bold text-slate-600 uppercase tracking-wider block mb-1">Tenant Slug (Identifier)</label>
                                    <input
                                        type="text"
                                        value={provForm.slug}
                                        onChange={e => setProvForm({ ...provForm, slug: e.target.value.toLowerCase().replace(/[^a-z0-9_-]/g, '') })}
                                        placeholder="radisson-blu-bay"
                                        className="w-full px-3 py-2 border border-slate-200 rounded-xl font-mono text-xs outline-none focus:border-blue-500 shadow-2xs"
                                        required
                                    />
                                    <span className="text-[10px] text-slate-400 mt-1 block">DB Name: tenant_{provForm.slug.replace(/-/g, '_') || '...'}</span>
                                </div>

                                <div>
                                    <label className="text-[10px] font-bold text-slate-600 uppercase tracking-wider block mb-1">City / Region</label>
                                    <input
                                        type="text"
                                        value={provForm.city}
                                        onChange={e => setProvForm({ ...provForm, city: e.target.value })}
                                        placeholder="Cox's Bazar"
                                        className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs outline-none focus:border-blue-500 shadow-2xs"
                                        required
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="text-[10px] font-bold text-slate-600 uppercase tracking-wider block mb-1">Admin Full Name</label>
                                    <input
                                        type="text"
                                        value={provForm.adminName}
                                        onChange={e => setProvForm({ ...provForm, adminName: e.target.value })}
                                        placeholder="Rashid Khan"
                                        className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs outline-none focus:border-blue-500 shadow-2xs"
                                        required
                                    />
                                </div>

                                <div>
                                    <label className="text-[10px] font-bold text-slate-600 uppercase tracking-wider block mb-1">Admin Email</label>
                                    <input
                                        type="email"
                                        value={provForm.adminEmail}
                                        onChange={e => setProvForm({ ...provForm, adminEmail: e.target.value })}
                                        placeholder="gm@radissonblu.com"
                                        className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs outline-none focus:border-blue-500 shadow-2xs"
                                        required
                                    />
                                </div>
                            </div>

                            <div className="space-y-1">
                                <label className="text-[10px] font-bold text-slate-600 uppercase tracking-wider block">Physical Property Address</label>
                                <input
                                    type="text"
                                    value={provForm.address}
                                    onChange={e => setProvForm({ ...provForm, address: e.target.value })}
                                    placeholder="Marine Drive Road, Inani Beach, Cox's Bazar"
                                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs outline-none focus:border-blue-500 shadow-2xs"
                                />
                            </div>

                            <div className="space-y-1">
                                <label className="text-[10px] font-bold text-slate-600 uppercase tracking-wider block">
                                    Initial Starter Room Inventory Count: <strong className="text-blue-700">{provForm.totalRooms} Rooms</strong>
                                </label>
                                <input
                                    type="range"
                                    min="5"
                                    max="30"
                                    value={provForm.totalRooms}
                                    onChange={e => setProvForm({ ...provForm, totalRooms: parseInt(e.target.value, 10) })}
                                    className="w-full cursor-pointer accent-blue-600"
                                />
                                <div className="flex justify-between text-[10px] text-slate-400">
                                    <span>5 Rooms</span>
                                    <span>15 Standard</span>
                                    <span>30 Maximum Starter</span>
                                </div>
                            </div>

                            <div className="pt-3 -mx-6 -mb-6 px-6 py-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
                                <button
                                    type="button"
                                    onClick={() => setIsProvisionModalOpen(false)}
                                    className="h-9 px-4 border border-slate-200 bg-white hover:bg-slate-100 text-slate-700 rounded-xl text-xs font-semibold cursor-pointer transition-colors shadow-2xs"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={isProvisioning}
                                    className="h-9 px-5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-xl text-xs font-bold flex items-center gap-2 cursor-pointer shadow-sm transition-all disabled:opacity-50"
                                >
                                    {isProvisioning ? (
                                        <>
                                            <RefreshCw size={14} className="animate-spin" />
                                            <span>Allocating Physical Database...</span>
                                        </>
                                    ) : (
                                        <>
                                            <Database size={14} />
                                            <span>Create &amp; Provision Database</span>
                                        </>
                                    )}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Modal: New Custom Feature / Module Request */}
            {isRequestModalOpen && (
                <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 sm:p-6 overflow-y-auto animate-in fade-in duration-150">
                    <div className="bg-white rounded-2xl shadow-2xl border border-slate-200/90 max-w-[540px] w-full overflow-hidden animate-in zoom-in-95 duration-150 my-auto">
                        <div className="px-6 py-4.5 border-b border-slate-100 flex items-center justify-between bg-slate-50/70">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center font-bold shadow-sm ring-2 ring-blue-100">
                                    <FileCode size={18} />
                                </div>
                                <div>
                                    <h3 className="text-sm font-bold text-slate-900">Submit Custom Module / Schema Request</h3>
                                    <p className="text-xs text-slate-500 font-medium mt-0.5">Request features or schema modifications for approval</p>
                                </div>
                            </div>
                            <button
                                type="button"
                                onClick={() => setIsRequestModalOpen(false)}
                                className="w-8 h-8 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 flex items-center justify-center cursor-pointer transition-colors"
                            >
                                <X size={18} />
                            </button>
                        </div>

                        <form onSubmit={handleSubmitCustomRequest} className="p-6 space-y-4 text-xs">
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="text-[10px] font-bold text-slate-600 uppercase tracking-wider block mb-1">Target Property / Tenant</label>
                                    <select
                                        value={reqForm.tenantSlug}
                                        onChange={e => setReqForm({ ...reqForm, tenantSlug: e.target.value })}
                                        className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-semibold bg-white outline-none focus:border-blue-500 shadow-2xs cursor-pointer"
                                        required
                                    >
                                        <option value="">Select Property...</option>
                                        {tenants.map(t => (
                                            <option key={t.slug} value={t.slug}>{t.name} ({t.db_name})</option>
                                        ))}
                                    </select>
                                </div>

                                <div>
                                    <label className="text-[10px] font-bold text-slate-600 uppercase tracking-wider block mb-1">Request Type</label>
                                    <select
                                        value={reqForm.requestType}
                                        onChange={e => setReqForm({ ...reqForm, requestType: e.target.value })}
                                        className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-semibold bg-white outline-none focus:border-blue-500 shadow-2xs cursor-pointer"
                                    >
                                        <option value="PLUGIN_ACTIVATION">Plugin / Addon Activation</option>
                                        <option value="CUSTOM_SCHEMA">Custom SQL Schema Alteration</option>
                                        <option value="FEATURE_FLAG">Custom Feature Flag Toggle</option>
                                    </select>
                                </div>
                            </div>

                            {reqForm.requestType === 'PLUGIN_ACTIVATION' && (
                                <div className="space-y-1">
                                    <label className="text-[10px] font-bold text-slate-600 uppercase tracking-wider block">Select Plugin from Catalog</label>
                                    <select
                                        value={reqForm.targetModule || ''}
                                        onChange={e => {
                                            const mod = e.target.value;
                                            const p = plugins.find(x => x.plugin_key === mod);
                                            setReqForm(prev => ({
                                                ...prev,
                                                targetModule: mod,
                                                title: p ? `Enable ${p.name}` : prev.title,
                                                description: p ? p.description : prev.description
                                            }));
                                        }}
                                        className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-semibold bg-white outline-none focus:border-blue-500 shadow-2xs cursor-pointer"
                                    >
                                        {plugins.map(p => (
                                            <option key={p.plugin_key} value={p.plugin_key}>{p.name} ({p.category})</option>
                                        ))}
                                    </select>
                                </div>
                            )}

                            <div className="space-y-1">
                                <label className="text-[10px] font-bold text-slate-600 uppercase tracking-wider block">Request Title</label>
                                <input
                                    type="text"
                                    value={reqForm.title}
                                    onChange={e => setReqForm({ ...reqForm, title: e.target.value })}
                                    placeholder="e.g. Add Convention &amp; Banquet Booking Module"
                                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs outline-none focus:border-blue-500 shadow-2xs font-semibold"
                                    required
                                />
                            </div>

                            <div className="space-y-1">
                                <label className="text-[10px] font-bold text-slate-600 uppercase tracking-wider block">Business Justification / Details</label>
                                <textarea
                                    rows={2}
                                    value={reqForm.description}
                                    onChange={e => setReqForm({ ...reqForm, description: e.target.value })}
                                    placeholder="Describe why this property requires this feature..."
                                    className="w-full p-3 border border-slate-200 rounded-xl text-xs outline-none focus:border-blue-500 shadow-2xs resize-none"
                                    required
                                />
                            </div>

                            {reqForm.requestType === 'CUSTOM_SCHEMA' && (
                                <div className="space-y-1">
                                    <label className="text-[10px] font-bold text-slate-600 uppercase tracking-wider block">Custom SQL DDL Script (Isolated to this Tenant)</label>
                                    <textarea
                                        rows={4}
                                        value={reqForm.sqlMigration}
                                        onChange={e => setReqForm({ ...reqForm, sqlMigration: e.target.value })}
                                        placeholder="CREATE TABLE IF NOT EXISTS custom_table (...);"
                                        className="w-full p-3 border border-slate-200 rounded-xl font-mono text-xs outline-none focus:border-blue-500 shadow-2xs resize-none bg-slate-900 text-emerald-400"
                                        required
                                    />
                                </div>
                            )}

                            <div className="pt-3 -mx-6 -mb-6 px-6 py-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
                                <button
                                    type="button"
                                    onClick={() => setIsRequestModalOpen(false)}
                                    className="h-9 px-4 border border-slate-200 bg-white hover:bg-slate-100 text-slate-700 rounded-xl text-xs font-semibold cursor-pointer transition-colors shadow-2xs"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={isSubmittingRequest}
                                    className="h-9 px-4.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold flex items-center gap-2 cursor-pointer shadow-sm transition-all disabled:opacity-50"
                                >
                                    <Check size={14} className="stroke-[3]" />
                                    <span>{isSubmittingRequest ? 'Submitting...' : 'Submit for Super Admin Approval'}</span>
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Modal: Super Admin Approval / Rejection Confirmation */}
            {selectedRequestForAction && actionModalType && (
                <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 sm:p-6 overflow-y-auto animate-in fade-in duration-150">
                    <div className="bg-white rounded-2xl shadow-2xl border border-slate-200/90 max-w-[500px] w-full overflow-hidden animate-in zoom-in-95 duration-150 my-auto">
                        <div className={`px-6 py-4.5 border-b border-slate-100 flex items-center justify-between ${
                            actionModalType === 'APPROVE' ? 'bg-emerald-50/70' : 'bg-rose-50/70'
                        }`}>
                            <div className="flex items-center gap-3">
                                <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-white shadow-sm ring-2 ${
                                    actionModalType === 'APPROVE' ? 'bg-emerald-600 ring-emerald-100' : 'bg-rose-600 ring-rose-100'
                                }`}>
                                    {actionModalType === 'APPROVE' ? <Check size={20} className="stroke-[3]" /> : <X size={20} />}
                                </div>
                                <div>
                                    <h3 className="text-sm font-bold text-slate-900">
                                        {actionModalType === 'APPROVE' ? 'Approve & Execute Migration' : 'Reject Custom Request'}
                                    </h3>
                                    <p className="text-xs text-slate-500 font-medium mt-0.5">
                                        Target: <strong>{selectedRequestForAction.db_name}</strong> ({selectedRequestForAction.tenant_slug})
                                    </p>
                                </div>
                            </div>
                            <button
                                type="button"
                                onClick={() => {
                                    setSelectedRequestForAction(null);
                                    setActionModalType(null);
                                }}
                                className="w-8 h-8 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 flex items-center justify-center cursor-pointer transition-colors"
                            >
                                <X size={18} />
                            </button>
                        </div>

                        <div className="p-6 space-y-4 text-xs">
                            <div className="bg-slate-50 rounded-xl p-3 border border-slate-200/80 space-y-1">
                                <span className="text-[10px] font-bold text-slate-500 uppercase block">Request Summary</span>
                                <h4 className="font-bold text-slate-900 text-sm">{selectedRequestForAction.title}</h4>
                                <p className="text-slate-600">{selectedRequestForAction.description}</p>
                            </div>

                            {actionModalType === 'APPROVE' && (
                                <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-950 space-y-1">
                                    <strong className="text-emerald-800 font-bold block flex items-center gap-1.5">
                                        <ShieldCheck size={14} className="text-emerald-600" />
                                        <span>Fault-Isolated Deployment</span>
                                    </strong>
                                    <p className="text-[11px] text-emerald-800 leading-relaxed">
                                        This migration will execute exclusively inside <strong>{selectedRequestForAction.db_name}</strong>. If any query fails, the rollback occurs solely within this database. Other hotel properties will experience zero disruption.
                                    </p>
                                </div>
                            )}

                            <div className="space-y-1">
                                <label className="text-[10px] font-bold text-slate-600 uppercase tracking-wider block">Super Admin Notes / Feedback</label>
                                <textarea
                                    rows={2}
                                    value={actionNotes}
                                    onChange={e => setActionNotes(e.target.value)}
                                    placeholder="Enter administrative approval comments..."
                                    className="w-full p-3 border border-slate-200 rounded-xl text-xs outline-none focus:border-blue-500 shadow-2xs resize-none"
                                />
                            </div>

                            <div className="pt-3 -mx-6 -mb-6 px-6 py-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
                                <button
                                    type="button"
                                    onClick={() => {
                                        setSelectedRequestForAction(null);
                                        setActionModalType(null);
                                    }}
                                    className="h-9 px-4 border border-slate-200 bg-white hover:bg-slate-100 text-slate-700 rounded-xl text-xs font-semibold cursor-pointer transition-colors shadow-2xs"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="button"
                                    onClick={actionModalType === 'APPROVE' ? handleConfirmApproval : handleConfirmRejection}
                                    disabled={isExecutingAction}
                                    className={`h-9 px-5 text-white rounded-xl text-xs font-bold flex items-center gap-2 cursor-pointer shadow-sm transition-all disabled:opacity-50 ${
                                        actionModalType === 'APPROVE' 
                                            ? 'bg-emerald-600 hover:bg-emerald-700' 
                                            : 'bg-rose-600 hover:bg-rose-700'
                                    }`}
                                >
                                    {isExecutingAction ? (
                                        <>
                                            <RefreshCw size={14} className="animate-spin" />
                                            <span>Executing on Database...</span>
                                        </>
                                    ) : (
                                        <>
                                            <Check size={14} className="stroke-[3]" />
                                            <span>{actionModalType === 'APPROVE' ? 'Execute Migration' : 'Confirm Rejection'}</span>
                                        </>
                                    )}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default TenantIsolationHub;
