import { useState, useEffect } from 'react';
import { Calendar, Clock, CheckCircle, XCircle, AlertTriangle, Play, RefreshCw, Mail, Lock, Unlock } from 'lucide-react';

interface AuditLog {
    id: string;
    auditDate: string;
    startTime: string;
    endTime: string;
    status: 'running' | 'completed' | 'failed';
    roomsPosted: number;
    noShowsProcessed: number;
    errors: any[];
    runBy: string;
}

const NightAuditDashboard = () => {
    const [currentAudit, setCurrentAudit] = useState<AuditLog | null>(null);
    const [auditHistory, setAuditHistory] = useState<AuditLog[]>([]);
    const [isRunning, setIsRunning] = useState(false);
    const [systemLocked, setSystemLocked] = useState(false);

    // Mock data
    useEffect(() => {
        setAuditHistory([
            {
                id: '1',
                auditDate: '2024-01-16',
                startTime: '02:00:15',
                endTime: '02:05:42',
                status: 'completed',
                roomsPosted: 85,
                noShowsProcessed: 3,
                errors: [],
                runBy: 'System (Auto)'
            },
            {
                id: '2',
                auditDate: '2024-01-15',
                startTime: '02:00:10',
                endTime: '02:04:55',
                status: 'completed',
                roomsPosted: 92,
                noShowsProcessed: 1,
                errors: [],
                runBy: 'System (Auto)'
            }
        ]);
    }, []);

    const runManualAudit = async () => {
        setIsRunning(true);
        setSystemLocked(true);

        // Mock audit process
        const newAudit: AuditLog = {
            id: Date.now().toString(),
            auditDate: new Date().toISOString().split('T')[0],
            startTime: new Date().toLocaleTimeString(),
            endTime: '',
            status: 'running',
            roomsPosted: 0,
            noShowsProcessed: 0,
            errors: [],
            runBy: 'Admin (Manual)'
        };

        setCurrentAudit(newAudit);

        // Simulate audit steps
        setTimeout(() => {
            newAudit.roomsPosted = 88;
            newAudit.noShowsProcessed = 2;
            newAudit.endTime = new Date().toLocaleTimeString();
            newAudit.status = 'completed';
            setCurrentAudit({ ...newAudit });
            setAuditHistory([newAudit, ...auditHistory]);
            setIsRunning(false);
            setSystemLocked(false);
        }, 5000);
    };

    const getStatusIcon = (status: string) => {
        switch (status) {
            case 'completed':
                return <CheckCircle className="text-green-500" size={20} />;
            case 'failed':
                return <XCircle className="text-red-500" size={20} />;
            case 'running':
                return <RefreshCw className="text-blue-500 animate-spin" size={20} />;
            default:
                return <AlertTriangle className="text-yellow-500" size={20} />;
        }
    };

    const getStatusBadge = (status: string) => {
        const colors = {
            completed: 'bg-green-100 text-green-800',
            failed: 'bg-red-100 text-red-800',
            running: 'bg-blue-100 text-blue-800'
        };
        return colors[status as keyof typeof colors] || 'bg-gray-100 text-gray-800';
    };

    return (
        <div className="p-6 bg-gray-50 min-h-screen">
            {/* Header */}
            <div className="mb-6">
                <h1 className="text-2xl font-bold text-gray-900 mb-2">Night Audit Dashboard</h1>
                <p className="text-gray-600">Automated end-of-day processing and reporting</p>
            </div>

            {/* System Status */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <div className="bg-white rounded-lg shadow p-6">
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium text-gray-600">System Status</span>
                        {systemLocked ? <Lock className="text-red-500" size={20} /> : <Unlock className="text-green-500" size={20} />}
                    </div>
                    <p className="text-2xl font-bold text-gray-900">
                        {systemLocked ? 'Locked' : 'Active'}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                        {systemLocked ? 'Audit in progress' : 'Ready for operations'}
                    </p>
                </div>

                <div className="bg-white rounded-lg shadow p-6">
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium text-gray-600">Next Scheduled Audit</span>
                        <Clock className="text-blue-500" size={20} />
                    </div>
                    <p className="text-2xl font-bold text-gray-900">02:00 AM</p>
                    <p className="text-xs text-gray-500 mt-1">Tonight (Automatic)</p>
                </div>

                <div className="bg-white rounded-lg shadow p-6">
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium text-gray-600">Last Audit</span>
                        <Calendar className="text-purple-500" size={20} />
                    </div>
                    <p className="text-2xl font-bold text-gray-900">
                        {auditHistory[0]?.auditDate || 'N/A'}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                        {auditHistory[0]?.status === 'completed' ? 'Successful' : 'Failed'}
                    </p>
                </div>
            </div>

            {/* Current Audit Progress */}
            {currentAudit && currentAudit.status === 'running' && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mb-6">
                    <div className="flex items-center gap-3 mb-4">
                        <RefreshCw className="text-blue-600 animate-spin" size={24} />
                        <h2 className="text-lg font-semibold text-blue-900">Audit in Progress</h2>
                    </div>
                    <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                            <span className="text-blue-700">Posting room charges...</span>
                            <span className="text-blue-900 font-medium">{currentAudit.roomsPosted} rooms</span>
                        </div>
                        <div className="flex justify-between text-sm">
                            <span className="text-blue-700">Processing no-shows...</span>
                            <span className="text-blue-900 font-medium">{currentAudit.noShowsProcessed} processed</span>
                        </div>
                        <div className="w-full bg-blue-200 rounded-full h-2 mt-4">
                            <div className="bg-blue-600 h-2 rounded-full animate-pulse" style={{ width: '60%' }}></div>
                        </div>
                    </div>
                </div>
            )}

            {/* Actions */}
            <div className="bg-white rounded-lg shadow p-6 mb-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">Manual Actions</h2>
                <div className="flex gap-3">
                    <button
                        onClick={runManualAudit}
                        disabled={isRunning || systemLocked}
                        className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
                    >
                        <Play size={18} />
                        Run Audit Now
                    </button>
                    <button
                        disabled={isRunning}
                        className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
                    >
                        <Mail size={18} />
                        Email Reports
                    </button>
                    <button
                        className="flex items-center gap-2 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
                    >
                        <Calendar size={18} />
                        View Schedule
                    </button>
                </div>
            </div>

            {/* Audit History */}
            <div className="bg-white rounded-lg shadow">
                <div className="p-6 border-b border-gray-200">
                    <h2 className="text-lg font-semibold text-gray-900">Audit History</h2>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Status
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Date
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Time
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Rooms Posted
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    No-Shows
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Run By
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Actions
                                </th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {auditHistory.map((audit) => (
                                <tr key={audit.id} className="hover:bg-gray-50">
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="flex items-center gap-2">
                                            {getStatusIcon(audit.status)}
                                            <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusBadge(audit.status)}`}>
                                                {audit.status}
                                            </span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                        {audit.auditDate}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                        {audit.startTime} - {audit.endTime}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                        {audit.roomsPosted}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                        {audit.noShowsProcessed}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                        {audit.runBy}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm">
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
    );
};

export default NightAuditDashboard;
