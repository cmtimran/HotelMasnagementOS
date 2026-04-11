import { useState, useEffect } from 'react';
import {
    Plus,
    Search,
    Edit,
    Trash2,
    Save,
    X,
    ChevronDown,
    Monitor,
    Wifi,
    AlertCircle,
    Copy,
    Lock,
    Download,
    Printer,
    ArrowLeft,
    User,
    MapPin,
    CreditCard,
    Briefcase,
    Shield,
    Image as ImageIcon,
    PlusSquare,
    MinusSquare,
    Check
} from 'lucide-react';


const PermissionNode = ({ node, level = 0, expandedNodes, toggleExpand, checkedNodes, onCheck }: any) => {
    const hasChildren = node.children && node.children.length > 0;
    const isExpanded = expandedNodes.includes(node.id);

    // Calculate check state: checked, unchecked, or indeterminate
    const getCheckState = (n: any): 'checked' | 'unchecked' | 'indeterminate' => {
        if (!n.children || n.children.length === 0) {
            return checkedNodes.includes(n.id) ? 'checked' : 'unchecked';
        }
        const childrenStates = n.children.map((c: any) => getCheckState(c));
        const allChecked = childrenStates.every((s: string) => s === 'checked');
        const allUnchecked = childrenStates.every((s: string) => s === 'unchecked');

        if (allChecked) return 'checked';
        if (allUnchecked) return 'unchecked';
        return 'indeterminate';
    };

    const checkState = getCheckState(node);

    return (
        <div className="select-none">
            <div className={`flex items-center gap-2 py-1.5 hover:bg-gray-50/80 rounded px-2 transition-colors group`}>
                {/* Indentation logic with vertical lines */}
                <div className="flex">
                    {Array.from({ length: level }).map((_, i) => (
                        <div key={i} className="w-6 border-r border-gray-200 h-6 -ml-px mr-3" />
                    ))}
                </div>

                {/* Expand Toggle */}
                <button
                    onClick={() => hasChildren && toggleExpand(node.id)}
                    className={`w-5 h-5 flex items-center justify-center border rounded border-gray-300 bg-white hover:border-blue-400 hover:text-blue-500 transition-colors ${!hasChildren && 'opacity-0 cursor-default'}`}
                >
                    {hasChildren && (isExpanded ? <MinusSquare size={12} strokeWidth={3} /> : <PlusSquare size={12} strokeWidth={3} />)}
                </button>

                {/* Checkbox */}
                <div
                    onClick={() => onCheck(node)}
                    className={`w-5 h-5 rounded flex items-center justify-center cursor-pointer border transition-all ${checkState === 'checked' ? 'bg-blue-600 border-blue-600 shadow-sm' :
                        checkState === 'indeterminate' ? 'bg-blue-600 border-blue-600 shadow-sm' :
                            'bg-white border-gray-300'
                        }`}
                >
                    {checkState === 'checked' && <Check size={12} className="text-white" />}
                    {checkState === 'indeterminate' && <div className="w-1.5 h-1.5 bg-white rounded-sm" />}
                </div>

                {/* Label */}
                <span className={`text-[13px] ${checkState !== 'unchecked' ? 'text-gray-900 font-semibold' : 'text-gray-600 font-medium'} flex-1`}>
                    {node.name}
                </span>
            </div>

            {/* Children container */}
            {hasChildren && isExpanded && (
                <div className="mt-0.5">
                    {node.children.map((child: any) => (
                        <PermissionNode
                            key={child.id}
                            node={child}
                            level={level + 1}
                            expandedNodes={expandedNodes}
                            toggleExpand={toggleExpand}
                            checkedNodes={checkedNodes}
                            onCheck={onCheck}
                        />
                    ))}
                </div>
            )}
        </div>
    );
};

const AdminSecurity = ({ initialTab = 'users' }: { initialTab?: 'users' | 'roles' | 'audit' }) => {
    const [activeTab, setActiveTab] = useState<'users' | 'roles' | 'audit'>(initialTab);
    const [view, setView] = useState<'list' | 'add-user' | 'edit-user'>('list');
    const [userTab, setUserTab] = useState<'core' | 'personal' | 'professional' | 'banking'>('core');
    const [isRoleModalOpen, setIsRoleModalOpen] = useState(false);

    const [checkedNodes, setCheckedNodes] = useState<string[]>(['prop-read', 'prop-update', 'rate-read']);
    const [expandedNodes, setExpandedNodes] = useState<string[]>(['master-data', 'property-mgmt', 'rate-mgmt']);

    useEffect(() => {
        setActiveTab(initialTab);
    }, [initialTab]);

    const toggleExpand = (id: string) => {
        setExpandedNodes(prev =>
            prev.includes(id) ? prev.filter(nodeId => nodeId !== id) : [...prev, id]
        );
    };

    const handleCheck = (node: any) => {
        const getAllChildIds = (n: any): string[] => {
            let ids = [n.id];
            if (n.children) {
                n.children.forEach((c: any) => {
                    ids = [...ids, ...getAllChildIds(c)];
                });
            }
            return ids;
        };

        const nodeIds = getAllChildIds(node);
        const isCurrentlyChecked = checkedNodes.includes(node.id);

        if (isCurrentlyChecked) {
            setCheckedNodes(prev => prev.filter((id: string) => !nodeIds.includes(id)));
        } else {
            setCheckedNodes(prev => [...new Set([...prev, ...nodeIds])]);
        }
    };

    // Mock Data
    const roles = [
        { id: '1', name: 'Super Admin', description: 'Full access to all modules', status: 'Active' },
        { id: '2', name: 'General Manager', description: 'Access to reports and management', status: 'Active' },
        { id: '3', name: 'Front Desk Officer', description: 'Reservation and guest management', status: 'Active' },
        { id: '4', name: 'Accountant', description: 'Financial reports and accounts', status: 'Active' },
    ];

    const users = [
        { id: '1', name: 'Imran Hossain', email: 'imran@example.com', role: 'Super Admin', status: 'Active', lastLogin: '10 mins ago' },
        { id: '2', name: 'John Doe', email: 'john@example.com', role: 'Front Desk Officer', status: 'Active', lastLogin: '2 hours ago' },
        { id: '3', name: 'Sarah Wilson', email: 'sarah@example.com', role: 'Accountant', status: 'Inactive', lastLogin: '2 days ago' },
    ];

    const auditLogs = [
        { id: '1', user: 'Imran Hossain', action: 'Created New Reservation', module: 'Reservation', time: '2026-01-16 10:30 AM', ip: '192.168.1.1' },
        { id: '2', user: 'John Doe', action: 'Modified Room Rate', module: 'Rate Management', time: '2026-01-16 09:15 AM', ip: '192.168.1.5' },
        { id: '3', user: 'Imran Hossain', action: 'Deleted User account', module: 'User Management', time: '2026-01-15 04:45 PM', ip: '192.168.1.1' },
    ];

    const permissionTree = [
        {
            id: 'master-data',
            name: 'Master Data Configuration',
            children: [
                {
                    id: 'property-mgmt',
                    name: 'Property Management',
                    children: [
                        {
                            id: 'property-creation',
                            name: 'Property Creation',
                            children: [
                                { id: 'prop-create', name: 'Create' },
                                { id: 'prop-read', name: 'Read' },
                                { id: 'prop-update', name: 'Update' },
                                { id: 'prop-delete', name: 'Delete' },
                            ]
                        },
                        { id: 'hotel-info', name: 'Hotel Info' }
                    ]
                },
                { id: 'room-mgmt', name: 'Room Management' },
                {
                    id: 'rate-mgmt',
                    name: 'Rate Management',
                    children: [
                        {
                            id: 'rate-type-manage',
                            name: 'Rate Type Manage',
                            children: [
                                { id: 'rate-create', name: 'Create' },
                                { id: 'rate-read', name: 'Read' },
                                { id: 'rate-update', name: 'Update' },
                                { id: 'rate-delete', name: 'Delete' },
                            ]
                        },
                        { id: 'season-manage', name: 'Season Manage' }
                    ]
                }
            ]
        }
    ];

    const renderUsersTab = () => (
        <div className="space-y-4">
            <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
                <div className="relative flex-1 w-full max-w-md">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                    <input
                        type="text"
                        placeholder="Search users..."
                        className="w-full pl-10 pr-4 py-2 border border-blue-100 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all shadow-sm"
                    />
                </div>
                <button
                    onClick={() => setView('add-user')}
                    className="w-full sm:w-auto flex items-center justify-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-xl hover:bg-blue-700 transition-all shadow-lg shadow-blue-200 active:scale-95 whitespace-nowrap"
                >
                    <Plus size={20} /> Add New User
                </button>
            </div>

            <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden overflow-x-auto no-scrollbar">
                <table className="w-full text-left min-w-[800px]">
                    <thead className="bg-[#f8fafc] border-b border-gray-200 text-[12px] uppercase tracking-wider text-gray-500 font-semibold">
                        <tr>
                            <th className="px-6 py-4">User Details</th>
                            <th className="px-6 py-4">Role</th>
                            <th className="px-6 py-4">Status</th>
                            <th className="px-6 py-4">Last Activity</th>
                            <th className="px-6 py-4 text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                        {users.map(user => (
                            <tr key={user.id} className="hover:bg-blue-50/30 transition-colors">
                                <td className="px-6 py-4 whitespace-nowrap">
                                    <div className="flex items-center gap-3">
                                        <div className="h-10 w-10 rounded-full bg-blue-50 flex items-center justify-center text-blue-600 font-semibold">
                                            {user.name.charAt(0)}
                                        </div>
                                        <div>
                                            <div className="font-semibold text-gray-800">{user.name}</div>
                                            <div className="text-xs text-gray-500">{user.email}</div>
                                        </div>
                                    </div>
                                </td>
                                <td className="px-6 py-4">
                                    <span className="px-3 py-1 bg-blue-50 text-blue-700 rounded-full text-xs font-medium border border-blue-100">
                                        {user.role}
                                    </span>
                                </td>
                                <td className="px-6 py-4">
                                    <span className={`px-2 py-1 rounded-full text-[10px] font-semibold uppercase tracking-tight ${user.status === 'Active' ? 'bg-emerald-50 text-emerald-600' : 'bg-gray-100 text-gray-500'}`}>
                                        {user.status}
                                    </span>
                                </td>
                                <td className="px-6 py-4 text-xs text-slate-500">
                                    {user.lastLogin}
                                </td>
                                <td className="px-6 py-4 text-right">
                                    <div className="flex justify-end gap-2">
                                        <button className="p-2 hover:bg-blue-100 rounded-lg text-blue-600 transition-colors"><Edit size={16} /></button>
                                        <button className="p-2 hover:bg-red-50 rounded-lg text-red-500 transition-colors"><Trash2 size={16} /></button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );

    const renderRolesTab = () => (
        <div className="space-y-4">
            <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
                <div className="relative flex-1 w-full max-w-md">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                    <input
                        type="text"
                        placeholder="Search roles..."
                        className="w-full pl-10 pr-4 py-2 border border-blue-100 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all shadow-sm"
                    />
                </div>
                <button
                    onClick={() => setIsRoleModalOpen(true)}
                    className="w-full sm:w-auto flex items-center justify-center gap-2 bg-slate-800 text-white px-4 py-2 rounded-xl hover:bg-slate-900 transition-all shadow-lg shadow-slate-200 active:scale-95 whitespace-nowrap"
                >
                    <Plus size={20} /> Create Security Role
                </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {roles.map(role => (
                    <div key={role.id} className="bg-white p-5 rounded-2xl border border-blue-50 shadow-sm hover:shadow-md transition-all group">
                        <div className="flex justify-between items-start mb-3">
                            <div className="flex items-center gap-3">
                                <div className="h-12 w-12 rounded-lg bg-blue-50 flex items-center justify-center text-blue-600 group-hover:bg-blue-600 group-hover:text-white transition-all">
                                    <Shield size={24} />
                                </div>
                                <div>
                                    <h3 className="font-semibold text-gray-800">{role.name}</h3>
                                    <span className={`text-[10px] font-semibold uppercase ${role.status === 'Active' ? 'text-emerald-500' : 'text-gray-400'}`}>
                                        {role.status}
                                    </span>
                                </div>
                            </div>
                            <div className="flex gap-2">
                                <button className="p-2 hover:bg-blue-50 rounded-lg text-blue-600 transition-colors"><Edit size={18} /></button>
                                <button className="p-2 hover:bg-blue-50 rounded-lg text-slate-400 transition-colors" title="Clone Role"><Copy size={18} /></button>
                            </div>
                        </div>
                        <p className="text-sm text-slate-500 leading-relaxed mb-4">
                            {role.description}
                        </p>
                        <div className="flex items-center justify-between pt-4 border-t border-blue-50">
                            <div className="flex -space-x-2">
                                {[1, 2, 3].map(i => (
                                    <div key={i} className="h-7 w-7 rounded-full border-2 border-white bg-slate-200 flex items-center justify-center text-[10px] font-bold">
                                        JD
                                    </div>
                                ))}
                                <div className="h-7 w-7 rounded-full border-2 border-white bg-blue-50 text-blue-600 flex items-center justify-center text-[10px] font-bold">
                                    +5
                                </div>
                            </div>
                            <button className="text-xs font-bold text-blue-600 hover:underline">View Permissions Matrix</button>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );

    const renderAuditTab = () => (
        <div className="space-y-4">
            <div className="flex flex-col md:flex-row justify-between items-stretch md:items-center bg-white p-4 rounded-2xl border border-blue-50 shadow-sm gap-4">
                <div className="flex flex-col sm:flex-row items-center gap-6">
                    <div className="flex flex-col w-full sm:w-auto">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Date Range</span>
                        <span className="text-sm font-bold text-slate-700 flex items-center gap-1">Today, Jan 16 <ChevronDown size={14} /></span>
                    </div>
                    <div className="hidden sm:block h-8 w-px bg-blue-50"></div>
                    <div className="flex flex-col w-full sm:w-auto">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Modules</span>
                        <span className="text-sm font-bold text-slate-700 flex items-center gap-1">All Modules <ChevronDown size={14} /></span>
                    </div>
                </div>
                <div className="flex justify-end gap-2 text-slate-600">
                    <button className="p-2 hover:bg-gray-100 rounded-xl border border-gray-100"><Download size={18} /></button>
                    <button className="p-2 hover:bg-gray-100 rounded-xl border border-gray-100"><Printer size={18} /></button>
                </div>
            </div>

            <div className="bg-white rounded-2xl shadow-sm border border-blue-50 overflow-hidden overflow-x-auto no-scrollbar">
                <table className="w-full text-left min-w-[900px]">
                    <thead className="bg-[#f8fafc] border-b border-gray-200 text-[11px] uppercase tracking-wider text-gray-500 font-semibold">
                        <tr>
                            <th className="px-6 py-4">User</th>
                            <th className="px-6 py-4">Activity Description</th>
                            <th className="px-6 py-4">Module</th>
                            <th className="px-6 py-4">Timestamp</th>
                            <th className="px-6 py-4">IP Address</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                        {auditLogs.map(log => (
                            <tr key={log.id} className="hover:bg-blue-50/20 transition-colors">
                                <td className="px-6 py-4 whitespace-nowrap">
                                    <span className="font-semibold text-gray-700">{log.user}</span>
                                </td>
                                <td className="px-6 py-4">
                                    <div className="flex flex-col">
                                        <span className="text-sm text-gray-600">{log.action}</span>
                                    </div>
                                </td>
                                <td className="px-6 py-4">
                                    <span className="text-xs font-medium px-2 py-0.5 bg-gray-100 rounded text-gray-500">{log.module}</span>
                                </td>
                                <td className="px-6 py-4 text-xs text-gray-500">
                                    {log.time}
                                </td>
                                <td className="px-6 py-4 text-[11px] font-mono text-gray-400">
                                    {log.ip}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );

    const renderAddUserView = () => (
        <div className="min-h-screen bg-slate-50">
            {/* Header */}
            <header className="bg-white border-b sticky top-0 z-10 px-4 md:px-6 py-4 flex justify-between items-center shadow-sm">
                <div className="flex items-center gap-4">
                    <button onClick={() => setView('list')} className="p-2 hover:bg-slate-100 rounded-lg text-slate-600 transition-all active:scale-90">
                        <ArrowLeft size={20} />
                    </button>
                    <div>
                        <h1 className="text-xl font-bold text-gray-800 tracking-tight">Register Staff Member</h1>
                        <p className="text-xs text-gray-500 mt-0.5">Setup new employee profile & security</p>
                    </div>
                </div>
                <div className="flex gap-2">
                    <button onClick={() => setView('list')} className="hidden sm:block px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-all font-medium text-sm shadow-sm active:scale-95">Save Draft</button>
                    <button onClick={() => setView('list')} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all font-medium text-sm flex items-center gap-2 shadow-sm active:scale-95">
                        <Save size={16} /> Save & Publish
                    </button>
                </div>
            </header>

            {/* Content Area */}
            <div className="max-w-7xl mx-auto p-4 md:p-6 lg:p-8">
                <div className="flex flex-col md:flex-row gap-8">
                    {/* Navigation Sidebar */}
                    <div className="w-full md:w-56 flex-shrink-0 space-y-3">
                        <nav className="bg-white rounded-lg shadow-sm border border-gray-200 flex flex-col sticky top-24 overflow-hidden">
                            {[
                                { id: 'core', label: 'Core Identity', icon: <User size={18} /> },
                                { id: 'personal', label: 'Contact & Personal', icon: <MapPin size={18} /> },
                                { id: 'professional', label: 'Professional Role', icon: <Briefcase size={18} /> },
                                { id: 'banking', label: 'Banking & Docs', icon: <CreditCard size={18} /> },
                            ].map((tab) => (
                                <button
                                    key={tab.id}
                                    onClick={() => setUserTab(tab.id as any)}
                                    className={`flex items-center gap-3 px-4 py-4 text-sm font-medium transition-colors w-full text-left border-l-4 ${userTab === tab.id
                                        ? 'border-blue-600 bg-blue-50 text-blue-700'
                                        : 'border-transparent text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                                        }`}
                                >
                                    {tab.icon}
                                    <span className="text-sm">{tab.label}</span>
                                </button>
                            ))}
                        </nav>
                        <div className="p-4 bg-blue-50/50 rounded-lg border border-blue-100 text-xs text-blue-800">
                            <strong>Tip:</strong> Ensure all mandatory (*) fields are filled before saving.
                        </div>
                    </div>

                    {/* Form Fields Area */}
                    <div className="flex-1 bg-white rounded-lg shadow-sm border border-gray-200 p-6 sm:p-10 animate-in fade-in slide-in-from-bottom-4 duration-500">
                        {userTab === 'core' && (
                            <div className="space-y-8">
                                <div className="space-y-6">
                                    <h3 className="text-lg font-semibold border-b pb-2 mb-4 flex items-center gap-2">
                                        <User size={20} className="text-gray-400" /> Core Identity & Login
                                    </h3>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <div className="space-y-1">
                                            <label className="text-sm font-medium text-gray-700">Full Name <span className="text-red-500">*</span></label>
                                            <input type="text" placeholder="e.g. Imran Hossain" className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition-all" />
                                        </div>
                                        <div className="space-y-1">
                                            <label className="text-sm font-medium text-gray-700">Username <span className="text-red-500">*</span></label>
                                            <input type="text" placeholder="imran.hms" className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition-all" />
                                        </div>
                                        <div className="space-y-1">
                                            <label className="text-sm font-medium text-gray-700">Password <span className="text-red-500">*</span></label>
                                            <div className="relative">
                                                <input type="password" placeholder="••••••••" className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition-all" />
                                                <Lock size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-300" />
                                            </div>
                                        </div>
                                        <div className="space-y-1">
                                            <label className="text-sm font-medium text-gray-700">Work Email Address <span className="text-red-500">*</span></label>
                                            <input type="email" placeholder="staff@hotel.com" className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition-all" />
                                        </div>
                                        <div className="space-y-2 md:col-span-2">
                                            <label className="text-sm font-medium text-gray-700 block">Profile Picture</label>
                                            <div className="border-2 border-dashed border-gray-200 rounded-lg h-32 flex flex-col items-center justify-center text-gray-400 hover:border-blue-400 hover:bg-blue-50/30 cursor-pointer transition-all group">
                                                <ImageIcon size={28} className="group-hover:text-blue-500 group-hover:scale-110 transition-all mb-2" />
                                                <span className="text-xs font-medium text-gray-500 group-hover:text-blue-600 transition-colors">Upload Staff Photo (JPG/PNG)</span>
                                                <p className="text-[10px] text-gray-400 mt-1">Recommended size: 400x400px</p>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {userTab === 'personal' && (
                            <div className="space-y-8">
                                <div className="space-y-6">
                                    <h3 className="text-lg font-semibold border-b pb-2 mb-4 flex items-center gap-2">
                                        <MapPin size={20} className="text-gray-400" /> Contact & Personal Details
                                    </h3>
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                        <div className="space-y-1">
                                            <label className="text-sm font-medium text-gray-700">Mobile Number <span className="text-red-500">*</span></label>
                                            <input type="text" placeholder="+880 1XXX XXXXXX" className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition-all" />
                                        </div>
                                        <div className="space-y-1">
                                            <label className="text-sm font-medium text-gray-700">Contact Number</label>
                                            <input type="text" placeholder="Landline or Secondary" className="w-full px-3 py-2 border rounded-lg outline-none" />
                                        </div>
                                        <div className="space-y-1">
                                            <label className="text-sm font-medium text-gray-700">Alternative Contact</label>
                                            <input type="text" placeholder="Emergency Person Number" className="w-full px-3 py-2 border rounded-lg outline-none" />
                                        </div>
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-sm font-medium text-gray-700">Physical Address</label>
                                        <textarea rows={3} placeholder="Full residential address" className="w-full px-3 py-2 border rounded-lg outline-none resize-none"></textarea>
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                        <div className="space-y-1">
                                            <label className="text-sm font-medium text-gray-700">Nationality</label>
                                            <input type="text" placeholder="e.g. Bangladeshi" className="w-full px-3 py-2 border rounded-lg outline-none" />
                                        </div>
                                        <div className="space-y-1">
                                            <label className="text-sm font-medium text-gray-700">Identification Type</label>
                                            <select className="w-full px-3 py-2 border rounded-lg bg-white outline-none">
                                                <option>NID (National ID)</option>
                                                <option>Passport</option>
                                                <option>Driving License</option>
                                                <option>Birth Certificate</option>
                                            </select>
                                        </div>
                                        <div className="space-y-1">
                                            <label className="text-sm font-medium text-gray-700">Identification Number</label>
                                            <input type="text" placeholder="Enter ID Number" className="w-full px-3 py-2 border rounded-lg outline-none" />
                                        </div>
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-sm font-medium text-gray-700 block mb-2">Profile Status</label>
                                        <div className="flex items-center gap-6">
                                            <label className="flex items-center gap-2 cursor-pointer group">
                                                <input type="radio" name="status" defaultChecked className="w-4 h-4 accent-blue-600" />
                                                <span className="text-sm font-medium text-gray-700">Active</span>
                                            </label>
                                            <label className="flex items-center gap-2 cursor-pointer group">
                                                <input type="radio" name="status" className="w-4 h-4 accent-red-600" />
                                                <span className="text-sm font-medium text-gray-700">Disabled</span>
                                            </label>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {userTab === 'professional' && (
                            <div className="space-y-8">
                                <div className="space-y-6">
                                    <h3 className="text-lg font-semibold border-b pb-2 mb-4 flex items-center gap-2">
                                        <Briefcase size={20} className="text-gray-400" /> Professional Designation
                                    </h3>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <div className="space-y-1">
                                            <label className="text-sm font-medium text-gray-700">Designation</label>
                                            <input type="text" placeholder="e.g. SR. Receptionist" className="w-full px-3 py-2 border rounded-lg outline-none" />
                                        </div>
                                        <div className="space-y-1">
                                            <label className="text-sm font-medium text-gray-700">Department</label>
                                            <select className="w-full px-3 py-2 border rounded-lg bg-white outline-none">
                                                <option>Front Office</option>
                                                <option>Housekeeping</option>
                                                <option>Food & Beverage</option>
                                                <option>Accounts</option>
                                                <option>IT & Systems</option>
                                            </select>
                                        </div>
                                        <div className="space-y-1">
                                            <label className="text-sm font-medium text-gray-700">Assign User Role</label>
                                            <select className="w-full px-3 py-2 border rounded-lg bg-white outline-none">
                                                <option>Front Desk Officer</option>
                                                <option>General Manager</option>
                                                <option>Super Admin</option>
                                                <option>Accountant</option>
                                            </select>
                                        </div>
                                        <div className="space-y-1">
                                            <label className="text-sm font-medium text-gray-700">Property Access</label>
                                            <select className="w-full px-3 py-2 border rounded-lg bg-white outline-none">
                                                <option>NICE Hotel, Dhaka</option>
                                                <option>All Properties</option>
                                            </select>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {userTab === 'banking' && (
                            <div className="space-y-8">
                                <div className="space-y-6">
                                    <h3 className="text-lg font-semibold border-b pb-2 mb-4 flex items-center gap-2">
                                        <CreditCard size={20} className="text-gray-400" /> Banking & Documents
                                    </h3>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                                        <div className="space-y-6">
                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                                <div className="space-y-1">
                                                    <label className="text-sm font-medium text-gray-700">Bank Name</label>
                                                    <input type="text" placeholder="e.g. Dutch Bangla Bank" className="w-full px-3 py-2 border rounded-lg outline-none" />
                                                </div>
                                                <div className="space-y-1">
                                                    <label className="text-sm font-medium text-gray-700">Branch Name</label>
                                                    <input type="text" placeholder="e.g. Banani Branch" className="w-full px-3 py-2 border rounded-lg outline-none" />
                                                </div>
                                                <div className="space-y-1 col-span-1 sm:col-span-2">
                                                    <label className="text-sm font-medium text-gray-700">Salary Account Number</label>
                                                    <input type="text" placeholder="Enter bank account no." className="w-full px-3 py-2 border rounded-lg outline-none" />
                                                </div>
                                                <div className="space-y-1 col-span-1 sm:col-span-2">
                                                    <label className="text-sm font-medium text-gray-700">MFS Number</label>
                                                    <input type="text" placeholder="bkash / Nagad / Rocket number" className="w-full px-3 py-2 border rounded-lg outline-none" />
                                                </div>
                                            </div>
                                        </div>
                                        <div className="space-y-6">
                                            <div className="space-y-1">
                                                <label className="text-sm font-medium text-gray-700">CV Attachment URL</label>
                                                <input type="text" placeholder="Link to CV (Google Drive/Dropbox)" className="w-full px-3 py-2 border rounded-lg outline-none" />
                                            </div>
                                            <div className="p-8 border-2 border-dashed border-gray-200 rounded-lg bg-gray-50 flex flex-col items-center justify-center text-center group cursor-pointer hover:border-blue-400 hover:bg-white transition-all">
                                                <div className="w-12 h-12 rounded-lg bg-white shadow-sm border flex items-center justify-center text-gray-400 group-hover:text-blue-600 transition-all mb-3">
                                                    <Printer size={24} />
                                                </div>
                                                <p className="text-sm font-medium text-gray-700">Upload Profile Document</p>
                                                <p className="text-xs text-gray-500 mt-1">PDF, JPG or PNG (Limit 5MB)</p>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}
                        {/* Footer in Card */}
                        <div className="mt-8 pt-6 border-t flex flex-col sm:flex-row justify-end gap-3">
                            <button onClick={() => setView('list')} className="px-6 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-all font-medium text-sm">Abandon Entry</button>
                            <button onClick={() => setView('list')} className="px-8 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all font-medium text-sm flex items-center justify-center gap-2">
                                <Save size={16} /> Save Profile & Grant Access
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );

    return (
        <div className="p-4 sm:p-6 bg-[#f8fafc] min-h-screen">
            {view === 'list' ? (
                <>
                    {/* Header */}
                    <div className="mb-8">
                        <h1 className="text-2xl font-bold text-gray-800 tracking-tight mb-1">Security Console</h1>
                        <p className="text-gray-500 text-sm">Manage user identities, system roles, and audit security events.</p>
                    </div>

                    {/* Tab Content */}
                    <div className="animate-in fade-in duration-500">
                        {activeTab === 'users' && renderUsersTab()}
                        {activeTab === 'roles' && renderRolesTab()}
                        {activeTab === 'audit' && renderAuditTab()}
                    </div>
                </>
            ) : (
                renderAddUserView()
            )}

            {/* Role Creation/Edit Modal */}
            {isRoleModalOpen && (
                <div className="fixed inset-0 bg-gray-900/40 backdrop-blur-sm z-[100] flex items-center justify-center p-4 transition-all duration-300">
                    <div className="bg-white rounded-xl shadow-2xl w-full max-w-5xl max-h-[90vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-300">
                        {/* Modal Header */}
                        <div className="p-5 border-b flex justify-between items-center bg-white">
                            <div>
                                <h2 className="text-lg font-bold text-gray-800 tracking-tight">System Security Role</h2>
                                <p className="text-gray-500 text-xs mt-0.5">Configure module-specific access and operation permissions.</p>
                            </div>
                            <button onClick={() => setIsRoleModalOpen(false)} className="hover:bg-gray-100 p-2 rounded-lg text-gray-400 transition-all">
                                <X size={20} />
                            </button>
                        </div>

                        {/* Modal Body */}
                        <div className="flex-1 overflow-y-auto no-scrollbar p-6 space-y-8">
                            {/* Section 1: Identity */}
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                <div className="space-y-1.5">
                                    <label className="text-[11px] font-bold uppercase text-gray-500 tracking-wider">Role Identity Name</label>
                                    <input type="text" placeholder="e.g. Reservation Manager" className="w-full px-4 py-2.5 bg-gray-50 border-gray-200 border rounded-lg focus:ring-2 focus:ring-blue-500/10 focus:bg-white outline-none font-medium transition-all" />
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-[11px] font-bold uppercase text-gray-500 tracking-wider">Copy From (Template)</label>
                                    <select className="w-full px-4 py-2.5 bg-gray-50 border-gray-200 border rounded-lg outline-none font-medium appearance-none">
                                        <option>Select Existing Role</option>
                                        <option>Receptionist</option>
                                        <option>Admin</option>
                                    </select>
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-[11px] font-bold uppercase text-gray-500 tracking-wider">Dashboard Default View</label>
                                    <select className="w-full px-4 py-2.5 bg-gray-50 border-gray-200 border rounded-lg outline-none font-medium appearance-none">
                                        <option>Front Desk View</option>
                                        <option>Management View</option>
                                        <option>Owner View</option>
                                    </select>
                                </div>
                            </div>

                            {/* Section 2: Permission Tree */}
                            <div className="space-y-4">
                                <h3 className="text-sm font-semibold text-gray-800 flex items-center gap-2">
                                    <Shield className="text-blue-500" size={18} /> Module Access Matrix
                                </h3>
                                <div className="border border-gray-200 rounded-lg p-4 bg-white shadow-sm max-h-[450px] overflow-y-auto no-scrollbar">
                                    <h4 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-4">Permissions</h4>
                                    <div className="space-y-1">
                                        {permissionTree.map(node => (
                                            <PermissionNode
                                                key={node.id}
                                                node={node}
                                                expandedNodes={expandedNodes}
                                                toggleExpand={toggleExpand}
                                                checkedNodes={checkedNodes}
                                                onCheck={handleCheck}
                                            />
                                        ))}
                                    </div>
                                </div>
                            </div>

                            {/* Section 3: POS & Advanced Security */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                <div className="space-y-4 bg-blue-50/20 p-5 rounded-lg border border-blue-100">
                                    <h3 className="text-sm font-semibold text-blue-800 flex items-center gap-2">
                                        <AlertCircle size={18} /> POS & Restaurant Controls
                                    </h3>
                                    <div className="space-y-3">
                                        <div className="flex items-center justify-between">
                                            <span className="text-xs font-medium text-gray-700">Allow Bill Void / Cancellation</span>
                                            <div className="flex items-center">
                                                <input type="checkbox" className="w-5 h-5 accent-blue-600" />
                                            </div>
                                        </div>
                                        <div className="flex items-center justify-between">
                                            <span className="text-xs font-medium text-gray-700">Maximum Discount Allowed</span>
                                            <div className="flex items-center gap-2">
                                                <input type="number" defaultValue={0} className="w-16 px-2 py-1 border border-gray-200 rounded bg-white text-xs font-semibold outline-none" />
                                                <span className="text-xs font-semibold text-gray-500">%</span>
                                            </div>
                                        </div>
                                        <div className="flex items-center justify-between">
                                            <span className="text-xs font-medium text-gray-700">Allow Split Bill Operation</span>
                                            <input type="checkbox" className="w-5 h-5 accent-blue-600" defaultChecked />
                                        </div>
                                    </div>
                                </div>

                                <div className="space-y-4 bg-emerald-50/20 p-5 rounded-lg border border-emerald-100">
                                    <h3 className="text-sm font-semibold text-emerald-800 flex items-center gap-2">
                                        <Lock size={18} /> Advanced Security Policy
                                    </h3>
                                    <div className="space-y-3">
                                        <div className="flex items-center justify-between">
                                            <span className="text-xs font-medium text-gray-700">Allow Back Date Entry</span>
                                            <input type="checkbox" className="w-5 h-5 accent-emerald-500" />
                                        </div>
                                        <div className="flex items-center justify-between">
                                            <span className="text-xs font-medium text-gray-700">Restrict Access by IP Address</span>
                                            <div className="flex items-center gap-2">
                                                <Wifi size={14} className="text-gray-400" />
                                                <input type="text" placeholder="192.168.1.10" className="w-32 px-2 py-1 border border-gray-200 rounded bg-white text-xs font-medium outline-none" />
                                            </div>
                                        </div>
                                        <div className="flex items-center justify-between">
                                            <span className="text-xs font-medium text-gray-700">Concurrent Sessions Limit</span>
                                            <div className="flex items-center gap-2">
                                                <Monitor size={14} className="text-gray-400" />
                                                <input type="number" defaultValue={1} className="w-12 px-2 py-1 border border-gray-200 rounded bg-white text-xs font-semibold outline-none" />
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Modal Footer */}
                        <div className="p-6 border-t bg-gray-50 flex flex-col sm:flex-row justify-end gap-3">
                            <button
                                onClick={() => setIsRoleModalOpen(false)}
                                className="px-8 py-2.5 border border-gray-300 text-gray-700 rounded-lg hover:bg-white transition-all font-semibold active:scale-95 shadow-sm"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={() => setIsRoleModalOpen(false)}
                                className="px-8 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all font-semibold shadow-lg shadow-blue-100 active:scale-95 flex items-center justify-center gap-2"
                            >
                                <Save size={20} /> Deploy Policy
                            </button>
                        </div>
                    </div>
                </div>
            )}


        </div>
    );
};

export default AdminSecurity;
