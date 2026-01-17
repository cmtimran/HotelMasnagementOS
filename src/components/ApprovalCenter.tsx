import { useState } from 'react';
import { CheckCircle, XCircle, Clock, DollarSign, Percent, FileText } from 'lucide-react';

interface ApprovalRequest {
    id: string;
    type: 'discount' | 'refund' | 'void' | 'adjustment';
    requestedBy: string;
    requestedAt: string;
    amount: number;
    reason: string;
    status: 'pending' | 'approved' | 'rejected';
    referenceId: string;
}

const ApprovalCenter = () => {
    const [requests, setRequests] = useState<ApprovalRequest[]>([
        {
            id: '1',
            type: 'discount',
            requestedBy: 'John Doe (Front Desk)',
            requestedAt: '2024-01-17 10:30 AM',
            amount: 50,
            reason: 'Guest complained about room cleanliness',
            status: 'pending',
            referenceId: 'FO-2024-001'
        },
        {
            id: '2',
            type: 'refund',
            requestedBy: 'Jane Smith (Cashier)',
            requestedAt: '2024-01-17 09:15 AM',
            amount: 150,
            reason: 'Duplicate payment posted',
            status: 'pending',
            referenceId: 'TXN-5678'
        }
    ]);

    const handleApprove = (id: string) => {
        setRequests(requests.map(req =>
            req.id === id ? { ...req, status: 'approved' as const } : req
        ));
    };

    const handleReject = (id: string) => {
        setRequests(requests.map(req =>
            req.id === id ? { ...req, status: 'rejected' as const } : req
        ));
    };

    const getTypeIcon = (type: string) => {
        switch (type) {
            case 'discount': return <Percent className="text-blue-500" size={20} />;
            case 'refund': return <DollarSign className="text-green-500" size={20} />;
            case 'void': return <XCircle className="text-red-500" size={20} />;
            case 'adjustment': return <FileText className="text-purple-500" size={20} />;
            default: return null;
        }
    };

    const getStatusBadge = (status: string) => {
        const colors = {
            pending: 'bg-yellow-100 text-yellow-800',
            approved: 'bg-green-100 text-green-800',
            rejected: 'bg-red-100 text-red-800'
        };
        return colors[status as keyof typeof colors];
    };

    const pendingCount = requests.filter(r => r.status === 'pending').length;

    return (
        <div className="p-6 bg-gray-50 min-h-screen">
            <div className="mb-6">
                <h1 className="text-2xl font-bold text-gray-900 mb-2">Approval Center</h1>
                <p className="text-gray-600">Review and approve pending requests</p>
            </div>

            {/* Summary */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <div className="bg-white rounded-lg shadow p-6">
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium text-gray-600">Pending Approvals</span>
                        <Clock className="text-yellow-500" size={20} />
                    </div>
                    <p className="text-3xl font-bold text-gray-900">{pendingCount}</p>
                </div>
                <div className="bg-white rounded-lg shadow p-6">
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium text-gray-600">Approved Today</span>
                        <CheckCircle className="text-green-500" size={20} />
                    </div>
                    <p className="text-3xl font-bold text-gray-900">8</p>
                </div>
                <div className="bg-white rounded-lg shadow p-6">
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium text-gray-600">Rejected Today</span>
                        <XCircle className="text-red-500" size={20} />
                    </div>
                    <p className="text-3xl font-bold text-gray-900">2</p>
                </div>
            </div>

            {/* Requests List */}
            <div className="bg-white rounded-lg shadow">
                <div className="p-6 border-b border-gray-200">
                    <h2 className="text-lg font-semibold text-gray-900">Pending Requests</h2>
                </div>
                <div className="divide-y divide-gray-200">
                    {requests.filter(r => r.status === 'pending').map((request) => (
                        <div key={request.id} className="p-6 hover:bg-gray-50">
                            <div className="flex items-start justify-between">
                                <div className="flex gap-4 flex-1">
                                    <div className="mt-1">
                                        {getTypeIcon(request.type)}
                                    </div>
                                    <div className="flex-1">
                                        <div className="flex items-center gap-3 mb-2">
                                            <h3 className="text-lg font-semibold text-gray-900 capitalize">
                                                {request.type} Request
                                            </h3>
                                            <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusBadge(request.status)}`}>
                                                {request.status}
                                            </span>
                                        </div>
                                        <div className="space-y-1 text-sm text-gray-600">
                                            <p><span className="font-medium">Requested by:</span> {request.requestedBy}</p>
                                            <p><span className="font-medium">Time:</span> {request.requestedAt}</p>
                                            <p><span className="font-medium">Amount:</span> ${request.amount.toFixed(2)}</p>
                                            <p><span className="font-medium">Reference:</span> {request.referenceId}</p>
                                            <p><span className="font-medium">Reason:</span> {request.reason}</p>
                                        </div>
                                    </div>
                                </div>
                                <div className="flex gap-2 ml-4">
                                    <button
                                        onClick={() => handleApprove(request.id)}
                                        className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                                    >
                                        <CheckCircle size={18} />
                                        Approve
                                    </button>
                                    <button
                                        onClick={() => handleReject(request.id)}
                                        className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
                                    >
                                        <XCircle size={18} />
                                        Reject
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))}
                    {pendingCount === 0 && (
                        <div className="p-12 text-center text-gray-500">
                            <CheckCircle size={48} className="mx-auto mb-3 text-gray-400" />
                            <p>No pending approvals</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default ApprovalCenter;
