import { useState } from 'react';
import { User, TrendingUp, Calendar, DollarSign, Star, MapPin, Heart, AlertTriangle } from 'lucide-react';

interface GuestAnalytics {
    totalVisits: number;
    totalSpent: number;
    lastVisit: string;
    lastRoomStayed: string;
    averageSpend: number;
    lifetimeValue: number;
    frequency: 'first-time' | 'occasional' | 'frequent' | 'vip';
}

interface GuestPreference {
    category: string;
    preference: string;
    icon: React.ReactNode;
}

const Guest360View = () => {
    const [guestId] = useState('G-2024-001');
    const [guestName] = useState('John Doe');

    const [analytics] = useState<GuestAnalytics>({
        totalVisits: 12,
        totalSpent: 45600,
        lastVisit: '2024-01-10',
        lastRoomStayed: '305 - Deluxe King',
        averageSpend: 3800,
        lifetimeValue: 45600,
        frequency: 'vip'
    });

    const [preferences] = useState<GuestPreference[]>([
        { category: 'Room', preference: 'Sea View preferred', icon: <MapPin size={16} /> },
        { category: 'Pillow', preference: 'Extra firm pillow', icon: <Heart size={16} /> },
        { category: 'Temperature', preference: '22°C preferred', icon: <TrendingUp size={16} /> },
        { category: 'Dietary', preference: 'Vegetarian', icon: <AlertTriangle size={16} /> },
        { category: 'Allergies', preference: 'Allergic to nuts', icon: <AlertTriangle size={16} className="text-red-600" /> }
    ]);

    const [visitHistory] = useState([
        { date: '2024-01-10', room: '305', nights: 3, spent: 1200, purpose: 'Business' },
        { date: '2023-12-15', room: '412', nights: 5, spent: 2500, purpose: 'Leisure' },
        { date: '2023-11-20', room: '305', nights: 2, spent: 800, purpose: 'Business' },
        { date: '2023-10-05', room: '508', nights: 4, spent: 1800, purpose: 'Leisure' }
    ]);

    const getFrequencyBadge = (frequency: string) => {
        const badges = {
            'first-time': { color: 'bg-gray-100 text-gray-800', label: 'First Time' },
            'occasional': { color: 'bg-blue-100 text-blue-800', label: 'Occasional' },
            'frequent': { color: 'bg-purple-100 text-purple-800', label: 'Frequent' },
            'vip': { color: 'bg-yellow-100 text-yellow-800', label: 'VIP Guest' }
        };
        return badges[frequency as keyof typeof badges];
    };

    const frequencyBadge = getFrequencyBadge(analytics.frequency);

    return (
        <div className="p-6 bg-gray-50 min-h-screen">
            <div className="max-w-6xl mx-auto">
                {/* Header */}
                <div className="mb-6">
                    <div className="flex items-center gap-3 mb-2">
                        <User size={28} className="text-blue-600" />
                        <h1 className="text-2xl font-bold text-gray-900">Guest 360° View</h1>
                    </div>
                    <p className="text-gray-600">Complete guest profile and analytics</p>
                </div>

                {/* Guest Info Card */}
                <div className="bg-white rounded-lg shadow p-6 mb-6">
                    <div className="flex items-start justify-between mb-4">
                        <div>
                            <h2 className="text-2xl font-bold text-gray-900 mb-1">{guestName}</h2>
                            <p className="text-gray-600">Guest ID: {guestId}</p>
                        </div>
                        <span className={`px-3 py-1 text-sm font-medium rounded-full ${frequencyBadge.color}`}>
                            <Star size={14} className="inline mr-1" />
                            {frequencyBadge.label}
                        </span>
                    </div>
                </div>

                {/* Analytics Cards */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                    <div className="bg-white rounded-lg shadow p-6">
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-sm font-medium text-gray-600">Total Visits</span>
                            <Calendar className="text-blue-500" size={20} />
                        </div>
                        <p className="text-3xl font-bold text-gray-900">{analytics.totalVisits}</p>
                        <p className="text-xs text-gray-500 mt-1">Since first visit</p>
                    </div>

                    <div className="bg-white rounded-lg shadow p-6">
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-sm font-medium text-gray-600">Lifetime Value</span>
                            <DollarSign className="text-green-500" size={20} />
                        </div>
                        <p className="text-3xl font-bold text-gray-900">${analytics.lifetimeValue.toLocaleString()}</p>
                        <p className="text-xs text-gray-500 mt-1">Total spent</p>
                    </div>

                    <div className="bg-white rounded-lg shadow p-6">
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-sm font-medium text-gray-600">Average Spend</span>
                            <TrendingUp className="text-purple-500" size={20} />
                        </div>
                        <p className="text-3xl font-bold text-gray-900">${analytics.averageSpend.toLocaleString()}</p>
                        <p className="text-xs text-gray-500 mt-1">Per visit</p>
                    </div>

                    <div className="bg-white rounded-lg shadow p-6">
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-sm font-medium text-gray-600">Last Visit</span>
                            <Calendar className="text-orange-500" size={20} />
                        </div>
                        <p className="text-xl font-bold text-gray-900">{analytics.lastVisit}</p>
                        <p className="text-xs text-gray-500 mt-1">{analytics.lastRoomStayed}</p>
                    </div>
                </div>

                {/* Preferences */}
                <div className="bg-white rounded-lg shadow p-6 mb-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Guest Preferences</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {preferences.map((pref, index) => (
                            <div key={index} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                                <div className="text-blue-600">{pref.icon}</div>
                                <div>
                                    <p className="text-xs text-gray-600">{pref.category}</p>
                                    <p className="font-medium text-gray-900">{pref.preference}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Visit History */}
                <div className="bg-white rounded-lg shadow">
                    <div className="p-6 border-b border-gray-200">
                        <h3 className="text-lg font-semibold text-gray-900">Visit History</h3>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Room</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Nights</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Spent</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Purpose</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200">
                                {visitHistory.map((visit, index) => (
                                    <tr key={index} className="hover:bg-gray-50">
                                        <td className="px-6 py-4 text-sm text-gray-900">{visit.date}</td>
                                        <td className="px-6 py-4 text-sm text-gray-900">{visit.room}</td>
                                        <td className="px-6 py-4 text-sm text-gray-900">{visit.nights}</td>
                                        <td className="px-6 py-4 text-sm font-medium text-gray-900">${visit.spent}</td>
                                        <td className="px-6 py-4 text-sm text-gray-600">{visit.purpose}</td>
                                        <td className="px-6 py-4 text-sm">
                                            <button className="text-blue-600 hover:text-blue-800 font-medium">
                                                View Details
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Guest360View;
