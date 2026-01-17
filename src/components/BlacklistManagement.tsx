import { useState } from 'react';
import { AlertTriangle, Shield, Save, X } from 'lucide-react';

interface BlacklistedGuest {
    id: string;
    name: string;
    email: string;
    phone: string;
    reason: string;
    blacklistedBy: string;
    blacklistedDate: string;
    severity: 'low' | 'medium' | 'high';
}

const BlacklistManagement = () => {
    const [guests, setGuests] = useState<BlacklistedGuest[]>([
        {
            id: '1',
            name: 'John Smith',
            email: 'john.smith@example.com',
            phone: '+1 234 567 8900',
            reason: 'Damage to property - broke furniture',
            blacklistedBy: 'Manager - Sarah Johnson',
            blacklistedDate: '2024-01-10',
            severity: 'high'
        }
    ]);

    const [showAddForm, setShowAddForm] = useState(false);
    const [newGuest, setNewGuest] = useState({
        name: '',
        email: '',
        phone: '',
        reason: '',
        severity: 'medium' as 'low' | 'medium' | 'high'
    });

    const handleAdd = () => {
        if (newGuest.name && newGuest.reason) {
            const guest: BlacklistedGuest = {
                id: Date.now().toString(),
                name: newGuest.name,
                email: newGuest.email,
                phone: newGuest.phone,
                reason: newGuest.reason,
                blacklistedBy: 'Current User',
                blacklistedDate: new Date().toISOString().split('T')[0],
                severity: newGuest.severity
            };
            setGuests([...guests, guest]);
            setShowAddForm(false);
            setNewGuest({ name: '', email: '', phone: '', reason: '', severity: 'medium' });
        }
    };

    const removeFromBlacklist = (id: string) => {
        if (confirm('Are you sure you want to remove this guest from blacklist?')) {
            setGuests(guests.filter(g => g.id !== id));
        }
    };

    const getSeverityBadge = (severity: string) => {
        const badges = {
            'low': { color: 'bg-yellow-100 text-yellow-800', label: 'Low Risk' },
            'medium': { color: 'bg-orange-100 text-orange-800', label: 'Medium Risk' },
            'high': { color: 'bg-red-100 text-red-800', label: 'High Risk' }
        };
        return badges[severity as keyof typeof badges];
    };

    return (
        <div className="p-6 bg-gray-50 min-h-screen">
            <div className="max-w-6xl mx-auto">
                <div className="mb-6">
                    <div className="flex items-center justify-between">
                        <div>
                            <h1 className="text-2xl font-bold text-gray-900 mb-2 flex items-center gap-2">
                                <Shield size={28} className="text-red-600" />
                                Blacklist Management
                            </h1>
                            <p className="text-gray-600">Manage "Do Not Rent" guests for security</p>
                        </div>
                        <button
                            onClick={() => setShowAddForm(true)}
                            className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
                        >
                            <AlertTriangle size={18} />
                            Add to Blacklist
                        </button>
                    </div>
                </div>

                {showAddForm && (
                    <div className="bg-white rounded-lg shadow p-6 mb-6">
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="text-lg font-semibold text-gray-900">Add Guest to Blacklist</h2>
                            <button onClick={() => setShowAddForm(false)}>
                                <X size={20} className="text-gray-400 hover:text-gray-600" />
                            </button>
                        </div>
                        <div className="grid grid-cols-2 gap-4 mb-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Guest Name *</label>
                                <input
                                    type="text"
                                    value={newGuest.name}
                                    onChange={(e) => setNewGuest({ ...newGuest, name: e.target.value })}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                                <input
                                    type="email"
                                    value={newGuest.email}
                                    onChange={(e) => setNewGuest({ ...newGuest, email: e.target.value })}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                                <input
                                    type="tel"
                                    value={newGuest.phone}
                                    onChange={(e) => setNewGuest({ ...newGuest, phone: e.target.value })}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Severity</label>
                                <select
                                    value={newGuest.severity}
                                    onChange={(e) => setNewGuest({ ...newGuest, severity: e.target.value as any })}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                                >
                                    <option value="low">Low Risk</option>
                                    <option value="medium">Medium Risk</option>
                                    <option value="high">High Risk</option>
                                </select>
                            </div>
                            <div className="col-span-2">
                                <label className="block text-sm font-medium text-gray-700 mb-1">Reason *</label>
                                <textarea
                                    value={newGuest.reason}
                                    onChange={(e) => setNewGuest({ ...newGuest, reason: e.target.value })}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                                    rows={3}
                                    placeholder="Describe the reason for blacklisting..."
                                />
                            </div>
                        </div>
                        <button
                            onClick={handleAdd}
                            className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
                        >
                            <Save size={18} />
                            Add to Blacklist
                        </button>
                    </div>
                )}

                <div className="bg-white rounded-lg shadow">
                    <div className="p-6 border-b border-gray-200">
                        <h2 className="text-lg font-semibold text-gray-900">Blacklisted Guests ({guests.length})</h2>
                    </div>
                    <div className="divide-y divide-gray-200">
                        {guests.map((guest) => {
                            const badge = getSeverityBadge(guest.severity);
                            return (
                                <div key={guest.id} className="p-6 hover:bg-gray-50">
                                    <div className="flex items-start justify-between">
                                        <div className="flex gap-4 flex-1">
                                            <AlertTriangle className="text-red-600 mt-1" size={24} />
                                            <div className="flex-1">
                                                <div className="flex items-center gap-3 mb-2">
                                                    <h3 className="text-lg font-semibold text-gray-900">{guest.name}</h3>
                                                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${badge.color}`}>
                                                        {badge.label}
                                                    </span>
                                                </div>
                                                <div className="grid grid-cols-2 gap-2 text-sm text-gray-600 mb-3">
                                                    <p><strong>Email:</strong> {guest.email || 'N/A'}</p>
                                                    <p><strong>Phone:</strong> {guest.phone || 'N/A'}</p>
                                                    <p><strong>Blacklisted By:</strong> {guest.blacklistedBy}</p>
                                                    <p><strong>Date:</strong> {guest.blacklistedDate}</p>
                                                </div>
                                                <div className="p-3 bg-red-50 rounded-lg">
                                                    <p className="text-sm text-red-900"><strong>Reason:</strong> {guest.reason}</p>
                                                </div>
                                            </div>
                                        </div>
                                        <button
                                            onClick={() => removeFromBlacklist(guest.id)}
                                            className="ml-4 px-3 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                                        >
                                            Remove
                                        </button>
                                    </div>
                                </div>
                            );
                        })}
                        {guests.length === 0 && (
                            <div className="p-12 text-center text-gray-500">
                                <Shield size={48} className="mx-auto mb-3 text-gray-400" />
                                <p>No blacklisted guests</p>
                            </div>
                        )}
                    </div>
                </div>

                <div className="mt-6 bg-red-50 border border-red-200 rounded-lg p-4">
                    <h4 className="font-medium text-red-900 mb-2 flex items-center gap-2">
                        <AlertTriangle size={18} />
                        Important:
                    </h4>
                    <ul className="text-sm text-red-700 space-y-1">
                        <li>• System will alert when blacklisted guest attempts to book</li>
                        <li>• Booking will be blocked automatically</li>
                        <li>• Manager approval required to override</li>
                        <li>• All blacklist actions are logged for audit</li>
                    </ul>
                </div>
            </div>
        </div>
    );
};

export default BlacklistManagement;
