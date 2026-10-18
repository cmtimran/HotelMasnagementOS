import { useState } from 'react';
import { 
    User, LogIn, 
    MoreVertical, ShieldAlert, DollarSign, 
    Clock, CheckCircle2, XCircle, AlertCircle, Monitor
} from 'lucide-react';
import { evaluateEarlyCheckIn, requiresApproval } from '../utils/policyEvaluator';

const FrontDesk = () => {
    const [reservations] = useState([
        { id: 'RES-001', guest: 'Mahmudul Hasan', room: '102', arrival: '08:30', status: 'Due In', type: 'Premium' },
        { id: 'RES-002', guest: 'Sara Islam', room: '305', arrival: '11:15', status: 'Due In', type: 'Standard' },
        { id: 'RES-003', guest: 'John Doe', room: '201', arrival: '14:00', status: 'Due In', type: 'Agent' },
        { id: 'RES-004', guest: 'Mim Akter', room: '410', arrival: '11:30', status: 'Checked In', type: 'Corporate' },
    ]);

    const [selectedRes, setSelectedRes] = useState<any>(null);
    const [actionLog, setActionLog] = useState<string[]>([]);

    const handleCheckIn = (res: any) => {
        const policy = evaluateEarlyCheckIn(res.arrival);
        setSelectedRes({ ...res, policy });
    };

    const triggerAdjustment = (amount: number) => {
        const needsApproval = requiresApproval(amount, 'staff');
        if (needsApproval) {
            setActionLog(prev => [`[SEC] Folio Adjustment of $${amount} for ${selectedRes.id} sent to Manager Approval queue.`, ...prev]);
        } else {
            setActionLog(prev => [`[FIN] Adjusted $${amount} successfully.`, ...prev]);
        }
    };

    return (
        <div className="p-3 sm:p-4 max-w-7xl mx-auto space-y-3 font-sans">
            {/* Header & Quick Status */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-gray-200">
                <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-md bg-blue-600 flex items-center justify-center text-white shadow-xs">
                        <Monitor size={15} />
                    </div>
                    <div>
                        <h1 className="text-base font-bold text-gray-900 tracking-tight leading-none">Front Desk Arrivals & Due-In</h1>
                        <p className="text-[11px] text-gray-500 font-medium leading-none mt-1 flex items-center gap-1.5">
                            <Clock size={11} className="text-blue-500" /> Live Desk • {new Date().toLocaleDateString()}
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    <div className="px-2.5 py-1 bg-white border border-gray-200 rounded-md text-xs flex items-center gap-2">
                        <span className="text-[10px] text-gray-400 font-bold uppercase">Expected:</span>
                        <span className="font-bold text-gray-800">12 / 48</span>
                    </div>
                    <div className="px-2.5 py-1 bg-blue-600 text-white rounded-md text-xs font-semibold flex items-center gap-2 shadow-xs">
                        <span className="text-[10px] text-blue-200 uppercase">Occ:</span>
                        <span>84%</span>
                    </div>
                </div>
            </div>

            {/* Main Content Layout */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
                {/* Due In Reservations List */}
                <div className="lg:col-span-2 space-y-1.5">
                    <div className="flex items-center justify-between px-1 text-xs text-gray-500 font-semibold uppercase tracking-wider">
                        <span>Arrival Queue ({reservations.length})</span>
                        <span className="text-[10px] text-gray-400">Click to evaluate stay policy</span>
                    </div>

                    {reservations.map((res) => {
                        const isSelected = selectedRes?.id === res.id;
                        const isCheckedIn = res.status === 'Checked In';

                        return (
                            <div 
                                key={res.id} 
                                onClick={() => handleCheckIn(res)}
                                className={`
                                    bg-white border rounded-lg p-2.5 flex items-center justify-between transition-all cursor-pointer
                                    ${isSelected 
                                        ? 'border-blue-600 ring-1 ring-blue-500 bg-blue-50/20 shadow-xs' 
                                        : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50/70'}
                                `}
                            >
                                <div className="flex items-center gap-2.5 min-w-0">
                                    <div className={`w-8 h-8 rounded-md flex items-center justify-center flex-shrink-0 ${isCheckedIn ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-600'}`}>
                                        {isCheckedIn ? <CheckCircle2 size={16} /> : <User size={16} />}
                                    </div>
                                    <div className="min-w-0">
                                        <div className="flex items-center gap-2">
                                            <h3 className="text-xs font-bold text-gray-900 truncate">{res.guest}</h3>
                                            <span className="px-1.5 py-0.2 bg-gray-100 text-gray-600 text-[9px] font-semibold rounded">
                                                {res.type}
                                            </span>
                                        </div>
                                        <p className="text-[11px] text-gray-500 mt-0.5">
                                            Room <strong className="text-gray-800">{res.room}</strong> • {res.id}
                                        </p>
                                    </div>
                                </div>

                                <div className="flex items-center gap-3 flex-shrink-0">
                                    <div className="text-right">
                                        <p className="text-[9px] text-gray-400 font-bold uppercase leading-none">Arrival</p>
                                        <p className="text-xs font-bold text-gray-800 leading-tight mt-0.5">{res.arrival}</p>
                                    </div>
                                    <span className={`px-2 py-0.5 text-[10px] font-semibold rounded ${isCheckedIn ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-amber-50 text-amber-700 border border-amber-200'}`}>
                                        {res.status}
                                    </span>
                                    <button className="p-1 text-gray-400 hover:text-gray-700 rounded transition-colors">
                                        <MoreVertical size={14} />
                                    </button>
                                </div>
                            </div>
                        );
                    })}
                </div>

                {/* Operator Terminal Sidebar */}
                <div className="space-y-3">
                    {selectedRes ? (
                        <div className="bg-slate-900 rounded-lg p-3.5 text-white shadow-md space-y-3">
                            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                                <div>
                                    <span className="text-[9px] font-bold text-blue-400 uppercase tracking-widest leading-none">Check-In Terminal</span>
                                    <h2 className="text-sm font-bold text-white truncate mt-0.5">{selectedRes.guest}</h2>
                                </div>
                                <button 
                                    onClick={() => setSelectedRes(null)} 
                                    className="p-1 text-slate-400 hover:text-white rounded transition-colors"
                                    title="Close panel"
                                >
                                    <XCircle size={16} />
                                </button>
                            </div>

                            {/* Policy Notification */}
                            <div className={`p-2.5 rounded-md border text-xs ${selectedRes.policy.charge > 0 ? 'bg-amber-500/10 border-amber-500/20 text-amber-300' : 'bg-emerald-500/10 border-emerald-500/20 text-emerald-300'}`}>
                                <div className="flex items-center gap-1.5 font-semibold text-[10px] uppercase tracking-wider mb-1">
                                    {selectedRes.policy.charge > 0 ? <AlertCircle size={13} /> : <CheckCircle2 size={13} />}
                                    <span>Policy Engine Evaluated</span>
                                </div>
                                <p className="font-semibold">{selectedRes.policy.label}</p>
                                {selectedRes.policy.charge > 0 && (
                                    <p className="text-sm font-bold mt-1 text-amber-400">
                                        + ${selectedRes.policy.charge}.00 <span className="text-[10px] font-normal opacity-80">Additional Fee</span>
                                    </p>
                                )}
                            </div>

                            {/* Folio Quick Adjustment */}
                            <div className="space-y-1.5 pt-1">
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Quick Adjust Folio</p>
                                <div className="grid grid-cols-2 gap-1.5">
                                    <button 
                                        onClick={() => triggerAdjustment(5)}
                                        className="py-1.5 px-2 bg-slate-800 hover:bg-slate-700 rounded-md text-[11px] font-medium transition-all flex items-center justify-center gap-1 border border-slate-700"
                                    >
                                        <DollarSign size={12} className="text-emerald-400" />
                                        Discount $5
                                    </button>
                                    <button 
                                        onClick={() => triggerAdjustment(50)}
                                        className="py-1.5 px-2 bg-slate-800 hover:bg-amber-950/40 rounded-md text-[11px] font-medium transition-all flex items-center justify-center gap-1 border border-amber-500/30 text-amber-200"
                                    >
                                        <ShieldAlert size={12} className="text-amber-400" />
                                        Waive $50
                                    </button>
                                </div>
                            </div>

                            <button className="w-full bg-blue-600 hover:bg-blue-500 text-white py-2 rounded-md text-xs font-semibold shadow-xs transition-all flex items-center justify-center gap-1.5">
                                <span>Complete Check-In</span>
                                <LogIn size={13} />
                            </button>
                        </div>
                    ) : (
                        <div className="border border-dashed border-gray-200 bg-white rounded-lg flex flex-col items-center justify-center text-center p-6 space-y-2">
                            <div className="w-9 h-9 bg-gray-100 text-gray-400 rounded-full flex items-center justify-center">
                                <LogIn size={16} />
                            </div>
                            <h3 className="text-xs font-bold text-gray-700">Check-In Terminal</h3>
                            <p className="text-[10px] text-gray-400 max-w-[200px]">Select a guest from the arrivals list to evaluate stay policy & proceed.</p>
                        </div>
                    )}

                    {/* Compact Session Security Log */}
                    <div className="bg-white border border-gray-200 rounded-lg p-2.5 space-y-2">
                        <div className="flex items-center justify-between border-b border-gray-100 pb-1.5">
                            <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider flex items-center gap-1.5">
                                <ShieldAlert size={12} className="text-blue-600" /> Session Audit Log
                            </span>
                            <span className="text-[9px] text-gray-400">{actionLog.length} events</span>
                        </div>
                        <div className="space-y-1.5 max-h-[110px] overflow-y-auto scrollbar-thin">
                            {actionLog.length > 0 ? actionLog.map((log, i) => (
                                <div key={i} className={`flex items-start gap-1.5 text-[10px] leading-tight ${log.startsWith('[SEC]') ? 'text-amber-700 font-medium' : 'text-gray-600'}`}>
                                    <div className="w-1 h-1 rounded-full bg-current mt-1 flex-shrink-0" />
                                    <p>{log}</p>
                                </div>
                            )) : (
                                <p className="text-[10px] text-gray-400 italic text-center py-2">No security events logged in this session.</p>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default FrontDesk;
