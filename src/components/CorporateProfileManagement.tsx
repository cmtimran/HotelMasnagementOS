import { useState } from 'react';
import { Building2, Plus, Edit, Trash2, Search, X, Save } from 'lucide-react';

interface CorporateProfile {
    id: number;
    companyName: string;
    accountType: 'Corporate' | 'Travel Agent' | 'Government';
    creditLimit: number;
    paymentTerm: 'Net 15 Days' | 'Net 30 Days' | 'Net 45 Days' | 'Net 60 Days';
    taxRegistration: string; // BIN/TIN number
    contactPerson: string;
    billingEmail: string;
    linkedRateCode: string;
    isBlacklisted: boolean;
    currentBalance: number; // Outstanding amount
    phone: string;
    address: string;
    contractStartDate: string;
    contractEndDate: string;
    specialTerms: string;
}

const CorporateProfileManagement = () => {
    const [profiles, setProfiles] = useState<CorporateProfile[]>([
        {
            id: 1,
            companyName: 'Unilever Bangladesh Ltd',
            accountType: 'Corporate',
            creditLimit: 500000,
            paymentTerm: 'Net 30 Days',
            taxRegistration: 'BIN-000123456',
            contactPerson: 'Mr. Rahman (HR Manager)',
            billingEmail: 'accounts@unilever.com.bd',
            linkedRateCode: 'CORP_UL',
            isBlacklisted: false,
            currentBalance: 125000,
            phone: '+880 1711-123456',
            address: 'Gulshan-1, Dhaka',
            contractStartDate: '2025-01-01',
            contractEndDate: '2026-12-31',
            specialTerms: '20% discount on BAR, Free breakfast for 2'
        },
        {
            id: 2,
            companyName: 'Grameenphone Ltd',
            accountType: 'Corporate',
            creditLimit: 1000000,
            paymentTerm: 'Net 15 Days',
            taxRegistration: 'BIN-000987654',
            contactPerson: 'Ms. Sultana (Business Dev)',
            billingEmail: 'billing@grameenphone.com',
            linkedRateCode: 'CORP_GP',
            isBlacklisted: false,
            currentBalance: 0,
            phone: '+880 1700-987654',
            address: 'Bashundhara, Dhaka',
            contractStartDate: '2024-06-01',
            contractEndDate: '2026-05-31',
            specialTerms: '15% discount, Complimentary airport transfer'
        },
        {
            id: 3,
            companyName: 'US Embassy',
            accountType: 'Government',
            creditLimit: 2000000,
            paymentTerm: 'Net 45 Days',
            taxRegistration: 'EXEMPT',
            contactPerson: 'Embassy Admin Office',
            billingEmail: 'admin@usembassy.gov',
            linkedRateCode: 'GOV_US',
            isBlacklisted: false,
            currentBalance: 450000,
            phone: '+880 2-5566-2000',
            address: 'Madani Avenue, Dhaka',
            contractStartDate: '2023-01-01',
            contractEndDate: '2027-12-31',
            specialTerms: 'Government rate, Tax exempt, Monthly billing'
        },
        {
            id: 4,
            companyName: 'Travel World BD',
            accountType: 'Travel Agent',
            creditLimit: 300000,
            paymentTerm: 'Net 30 Days',
            taxRegistration: 'BIN-000555888',
            contactPerson: 'Mr. Karim (Operations)',
            billingEmail: 'accounts@travelworld.com',
            linkedRateCode: 'AGENT_TW',
            isBlacklisted: true,
            currentBalance: 350000, // Over limit!
            phone: '+880 1555-888999',
            address: 'Dhanmondi, Dhaka',
            contractStartDate: '2024-01-01',
            contractEndDate: '2025-12-31',
            specialTerms: '10% commission on bookings'
        }
    ]);

    const [searchTerm, setSearchTerm] = useState('');
    const [showForm, setShowForm] = useState(false);
    const [editingProfile, setEditingProfile] = useState<CorporateProfile | null>(null);
    const [formData, setFormData] = useState<Partial<CorporateProfile>>({
        companyName: '',
        accountType: 'Corporate',
        creditLimit: 0,
        paymentTerm: 'Net 30 Days',
        taxRegistration: '',
        contactPerson: '',
        billingEmail: '',
        linkedRateCode: '',
        isBlacklisted: false,
        currentBalance: 0,
        phone: '',
        address: '',
        contractStartDate: '',
        contractEndDate: '',
        specialTerms: ''
    });

    const filteredProfiles = profiles.filter(p =>
        p.companyName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.contactPerson.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const handleSave = () => {
        if (!formData.companyName || !formData.billingEmail) {
            alert('Company name and billing email are required!');
            return;
        }

        if (editingProfile) {
            setProfiles(profiles.map(p => p.id === editingProfile.id ? { ...editingProfile, ...formData } : p));
        } else {
            const newProfile: CorporateProfile = {
                ...formData,
                id: Date.now(),
            } as CorporateProfile;
            setProfiles([...profiles, newProfile]);
        }

        resetForm();
    };

    const handleEdit = (profile: CorporateProfile) => {
        setEditingProfile(profile);
        setFormData(profile);
        setShowForm(true);
    };

    const handleDelete = (id: number) => {
        if (confirm('Are you sure you want to delete this corporate profile?')) {
            setProfiles(profiles.filter(p => p.id !== id));
        }
    };

    const resetForm = () => {
        setFormData({
            companyName: '',
            accountType: 'Corporate',
            creditLimit: 0,
            paymentTerm: 'Net 30 Days',
            taxRegistration: '',
            contactPerson: '',
            billingEmail: '',
            linkedRateCode: '',
            isBlacklisted: false,
            currentBalance: 0,
            phone: '',
            address: '',
            contractStartDate: '',
            contractEndDate: '',
            specialTerms: ''
        });
        setEditingProfile(null);
        setShowForm(false);
    };

    const getCreditStatus = (profile: CorporateProfile) => {
        const utilization = (profile.currentBalance / profile.creditLimit) * 100;
        if (profile.isBlacklisted) return { color: 'bg-red-500', text: 'Blacklisted', textColor: 'text-red-700' };
        if (utilization >= 100) return { color: 'bg-red-500', text: 'Over Limit', textColor: 'text-red-700' };
        if (utilization >= 80) return { color: 'bg-amber-500', text: 'High Usage', textColor: 'text-amber-700' };
        if (utilization >= 50) return { color: 'bg-yellow-500', text: 'Medium', textColor: 'text-yellow-700' };
        return { color: 'bg-emerald-500', text: 'Good', textColor: 'text-emerald-700' };
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50/20 to-gray-50 p-4 md:p-6 lg:p-8">
            {/* Header */}
            <div className="mb-8">
                <div className="flex items-center gap-3 mb-2">
                    <div className="w-12 h-12 bg-gradient-to-br from-blue-600 to-blue-700 rounded-xl flex items-center justify-center shadow-lg shadow-blue-600/30">
                        <Building2 size={24} className="text-white" />
                    </div>
                    <div>
                        <h1 className="text-3xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent">Corporate Profiles (City Ledger)</h1>
                        <p className="text-sm text-gray-500">B2B accounts with credit facilities</p>
                    </div>
                </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
                <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm">
                    <p className="text-xs font-semibold text-gray-500 uppercase mb-2">Total Accounts</p>
                    <p className="text-3xl font-bold text-gray-900">{profiles.length}</p>
                </div>
                <div className="bg-gradient-to-br from-emerald-500 to-emerald-600 p-5 rounded-2xl shadow-lg shadow-emerald-500/30">
                    <p className="text-xs font-semibold text-emerald-100 uppercase mb-2">Active</p>
                    <p className="text-3xl font-bold text-white">{profiles.filter(p => !p.isBlacklisted).length}</p>
                </div>
                <div className="bg-gradient-to-br from-red-500 to-red-600 p-5 rounded-2xl shadow-lg shadow-red-500/30">
                    <p className="text-xs font-semibold text-red-100 uppercase mb-2">Blacklisted</p>
                    <p className="text-3xl font-bold text-white">{profiles.filter(p => p.isBlacklisted).length}</p>
                </div>
                <div className="bg-gradient-to-br from-blue-500 to-blue-600 p-5 rounded-2xl shadow-lg shadow-blue-500/30">
                    <p className="text-xs font-semibold text-blue-100 uppercase mb-2">Total Outstanding</p>
                    <p className="text-3xl font-bold text-white">৳{(profiles.reduce((sum, p) => sum + p.currentBalance, 0) / 1000).toFixed(0)}K</p>
                </div>
            </div>

            {/* Search & Add */}
            <div className="bg-white/80 backdrop-blur-sm p-6 rounded-2xl border border-gray-200 shadow-lg mb-6">
                <div className="flex items-center justify-between gap-4">
                    <div className="flex-1 relative">
                        <Search size={20} className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400" />
                        <input
                            type="text"
                            placeholder="Search by company name or contact person..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-12 pr-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                    </div>
                    <button
                        onClick={() => setShowForm(true)}
                        className="px-6 py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-xl font-semibold hover:from-blue-700 hover:to-blue-800 transition-all shadow-lg flex items-center gap-2"
                    >
                        <Plus size={20} />
                        Add Corporate Profile
                    </button>
                </div>
            </div>

            {/* Profiles Table */}
            <div className="bg-white rounded-2xl border border-gray-200 shadow-xl overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead className="bg-gradient-to-r from-gray-50 to-gray-100 border-b border-gray-200">
                            <tr>
                                <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase">Company</th>
                                <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase">Type</th>
                                <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase">Contact</th>
                                <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase">Credit Limit</th>
                                <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase">Outstanding</th>
                                <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase">Payment Term</th>
                                <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase">Status</th>
                                <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {filteredProfiles.map((profile) => {
                                const status = getCreditStatus(profile);
                                const utilization = (profile.currentBalance / profile.creditLimit) * 100;

                                return (
                                    <tr key={profile.id} className="hover:bg-blue-50/50 transition-colors">
                                        <td className="px-6 py-4">
                                            <div>
                                                <p className="text-sm font-bold text-gray-900">{profile.companyName}</p>
                                                <p className="text-xs text-gray-500">Rate: {profile.linkedRateCode}</p>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-semibold">
                                                {profile.accountType}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div>
                                                <p className="text-sm font-semibold text-gray-700">{profile.contactPerson}</p>
                                                <p className="text-xs text-gray-500">{profile.billingEmail}</p>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className="text-sm font-bold text-gray-900">৳{profile.creditLimit.toLocaleString()}</span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div>
                                                <p className="text-sm font-bold text-gray-900">৳{profile.currentBalance.toLocaleString()}</p>
                                                <div className="w-full bg-gray-200 rounded-full h-2 mt-1">
                                                    <div
                                                        className={`${status.color} h-2 rounded-full transition-all`}
                                                        style={{ width: `${Math.min(utilization, 100)}%` }}
                                                    />
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className="text-sm font-semibold text-gray-700">{profile.paymentTerm}</span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className={`px-3 py-1 rounded-full text-xs font-bold ${status.textColor} bg-opacity-20`} style={{ backgroundColor: status.color.replace('bg-', '') + '20' }}>
                                                {status.text}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-2">
                                                <button
                                                    onClick={() => handleEdit(profile)}
                                                    className="p-2 hover:bg-blue-100 rounded-lg transition-colors"
                                                    title="Edit"
                                                >
                                                    <Edit size={16} className="text-blue-600" />
                                                </button>
                                                <button
                                                    onClick={() => handleDelete(profile.id)}
                                                    className="p-2 hover:bg-red-100 rounded-lg transition-colors"
                                                    title="Delete"
                                                >
                                                    <Trash2 size={16} className="text-red-600" />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Add/Edit Form Modal */}
            {showForm && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-3xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
                        {/* Header */}
                        <div className="bg-gradient-to-r from-blue-600 to-blue-700 p-6 text-white">
                            <div className="flex items-center justify-between">
                                <h2 className="text-2xl font-bold">{editingProfile ? 'Edit' : 'Add'} Corporate Profile</h2>
                                <button onClick={resetForm} className="p-2 hover:bg-white/20 rounded-lg transition-colors">
                                    <X size={24} />
                                </button>
                            </div>
                        </div>

                        {/* Form Content */}
                        <div className="flex-1 overflow-y-auto p-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                {/* Company Name */}
                                <div className="md:col-span-2">
                                    <label className="block text-sm font-semibold text-gray-700 mb-2">Company Name *</label>
                                    <input
                                        type="text"
                                        value={formData.companyName}
                                        onChange={(e) => setFormData({ ...formData, companyName: e.target.value })}
                                        className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                                        placeholder="e.g., Unilever Bangladesh Ltd"
                                    />
                                </div>

                                {/* Account Type */}
                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-2">Account Type *</label>
                                    <select
                                        value={formData.accountType}
                                        onChange={(e) => setFormData({ ...formData, accountType: e.target.value as any })}
                                        className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    >
                                        <option value="Corporate">Corporate</option>
                                        <option value="Travel Agent">Travel Agent</option>
                                        <option value="Government">Government</option>
                                    </select>
                                </div>

                                {/* Credit Limit */}
                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-2">Credit Limit (৳) *</label>
                                    <input
                                        type="number"
                                        value={formData.creditLimit}
                                        onChange={(e) => setFormData({ ...formData, creditLimit: Number(e.target.value) })}
                                        className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                                        placeholder="500000"
                                    />
                                </div>

                                {/* Payment Term */}
                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-2">Payment Term *</label>
                                    <select
                                        value={formData.paymentTerm}
                                        onChange={(e) => setFormData({ ...formData, paymentTerm: e.target.value as any })}
                                        className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    >
                                        <option value="Net 15 Days">Net 15 Days</option>
                                        <option value="Net 30 Days">Net 30 Days</option>
                                        <option value="Net 45 Days">Net 45 Days</option>
                                        <option value="Net 60 Days">Net 60 Days</option>
                                    </select>
                                </div>

                                {/* Tax Registration (BIN) */}
                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-2">Tax Registration (BIN/TIN)</label>
                                    <input
                                        type="text"
                                        value={formData.taxRegistration}
                                        onChange={(e) => setFormData({ ...formData, taxRegistration: e.target.value })}
                                        className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                                        placeholder="BIN-000123456"
                                    />
                                </div>

                                {/* Contact Person */}
                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-2">Contact Person</label>
                                    <input
                                        type="text"
                                        value={formData.contactPerson}
                                        onChange={(e) => setFormData({ ...formData, contactPerson: e.target.value })}
                                        className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                                        placeholder="Mr. Rahman (HR Manager)"
                                    />
                                </div>

                                {/* Billing Email */}
                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-2">Billing Email *</label>
                                    <input
                                        type="email"
                                        value={formData.billingEmail}
                                        onChange={(e) => setFormData({ ...formData, billingEmail: e.target.value })}
                                        className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                                        placeholder="accounts@company.com"
                                    />
                                </div>

                                {/* Phone */}
                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-2">Phone</label>
                                    <input
                                        type="text"
                                        value={formData.phone}
                                        onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                                        className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                                        placeholder="+880 1711-123456"
                                    />
                                </div>

                                {/* Linked Rate Code */}
                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-2">Linked Rate Code</label>
                                    <input
                                        type="text"
                                        value={formData.linkedRateCode}
                                        onChange={(e) => setFormData({ ...formData, linkedRateCode: e.target.value })}
                                        className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                                        placeholder="CORP_UL"
                                    />
                                </div>

                                {/* Contract Dates */}
                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-2">Contract Start Date</label>
                                    <input
                                        type="date"
                                        value={formData.contractStartDate}
                                        onChange={(e) => setFormData({ ...formData, contractStartDate: e.target.value })}
                                        className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-2">Contract End Date</label>
                                    <input
                                        type="date"
                                        value={formData.contractEndDate}
                                        onChange={(e) => setFormData({ ...formData, contractEndDate: e.target.value })}
                                        className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    />
                                </div>

                                {/* Address */}
                                <div className="md:col-span-2">
                                    <label className="block text-sm font-semibold text-gray-700 mb-2">Address</label>
                                    <input
                                        type="text"
                                        value={formData.address}
                                        onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                                        className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                                        placeholder="Gulshan-1, Dhaka"
                                    />
                                </div>

                                {/* Special Terms */}
                                <div className="md:col-span-2">
                                    <label className="block text-sm font-semibold text-gray-700 mb-2">Special Terms & Conditions</label>
                                    <textarea
                                        value={formData.specialTerms}
                                        onChange={(e) => setFormData({ ...formData, specialTerms: e.target.value })}
                                        className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                                        rows={3}
                                        placeholder="20% discount on BAR, Free breakfast for 2 guests..."
                                    />
                                </div>

                                {/* Blacklisted Toggle */}
                                <div className="md:col-span-2">
                                    <label className="flex items-center gap-3 cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={formData.isBlacklisted}
                                            onChange={(e) => setFormData({ ...formData, isBlacklisted: e.target.checked })}
                                            className="w-5 h-5 text-red-600 border-gray-300 rounded focus:ring-red-500"
                                        />
                                        <span className="text-sm font-semibold text-gray-700">Blacklist this company (Block future bookings)</span>
                                    </label>
                                </div>
                            </div>
                        </div>

                        {/* Footer */}
                        <div className="bg-gray-50 border-t border-gray-200 p-6 flex items-center justify-end gap-3">
                            <button
                                onClick={resetForm}
                                className="px-6 py-3 border border-gray-300 text-gray-700 rounded-xl font-semibold hover:bg-gray-100 transition-all"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleSave}
                                className="px-6 py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-xl font-semibold hover:from-blue-700 hover:to-blue-800 transition-all shadow-lg flex items-center gap-2"
                            >
                                <Save size={20} />
                                Save Profile
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default CorporateProfileManagement;
