import { useState } from 'react';
import { 
    Calendar, User, LogIn, 
    MoreVertical, ShieldAlert, DollarSign, 
    Clock, CheckCircle2, XCircle, AlertCircle
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
        <div className="min-h-screen bg-[#fcfcfd] flex flex-col p-8 lg:p-12 animate-fadeIn font-sans">
            <div className="max-w-7xl mx-auto w-full space-y-12">
                
                {/* Header */}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 border-b border-gray-100 pb-12">
                    <div>
                        <h1 className="text-5xl font-black text-gray-900 tracking-tighter uppercase italic leading-none">Arrivals</h1>
                        <p className="text-xs text-indigo-500 font-bold uppercase tracking-[0.4em] mt-3 flex items-center gap-2">
                             <Clock size={12} /> Live Operational Desk / {new Date().toLocaleDateString()}
                        </p>
                    </div>
                    <div className="flex gap-4">
                        <div className="px-6 py-4 bg-white border border-gray-100 rounded-3xl shadow-sm">
                            <p className="text-[10px] text-gray-400 font-black uppercase tracking-widest mb-1">Expected</p>
                            <p className="text-2xl font-black italic">12 <span className="text-xs text-indigo-200">/ 48</span></p>
                        </div>
                        <div className="px-6 py-4 bg-indigo-600 text-white rounded-3xl shadow-xl shadow-indigo-600/20">
                            <p className="text-[10px] text-indigo-200 font-black uppercase tracking-widest mb-1">Occupancy</p>
                            <p className="text-2xl font-black italic">84%</p>
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-1 xl:grid-cols-3 gap-12">
                    
                    {/* List Section */}
                    <div className="xl:col-span-2 space-y-6">
                        {reservations.map((res) => (
                            <div 
                                key={res.id} 
                                className={`group bg-white border border-gray-100 rounded-[2.5rem] p-6 lg:p-8 flex items-center justify-between transition-all hover:shadow-2xl hover:-translate-y-1 cursor-pointer ${selectedRes?.id === res.id ? 'ring-2 ring-indigo-500 shadow-xl' : ''}`}
                                onClick={() => handleCheckIn(res)}
                            >
                                <div className="flex items-center gap-6">
                                    <div className={`w-16 h-16 rounded-3xl flex items-center justify-center text-white shadow-lg ${res.status === 'Checked In' ? 'bg-emerald-500 shadow-emerald-500/20' : 'bg-gray-100 text-gray-400 group-hover:bg-indigo-600 group-hover:text-white transition-all'}`}>
                                        {res.status === 'Checked In' ? <CheckCircle2 size={28} /> : <User size={28} />}
                                    </div>
                                    <div>
                                        <div className="flex items-center gap-3">
                                            <h3 className="text-lg font-black text-gray-900 uppercase italic tracking-tight">{res.guest}</h3>
                                            <span className="px-2 py-0.5 bg-gray-50 text-gray-400 text-[9px] font-black rounded-md">{res.type}</span>
                                        </div>
                                        <p className="text-xs text-gray-400 font-bold mt-1">Room {res.room} • Reserved via Web Engine</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-12">
                                    <div className="text-right hidden sm:block">
                                        <p className="text-[10px] text-gray-400 font-black uppercase tracking-widest leading-none mb-1">Arrival</p>
                                        <p className="text-lg font-black italic text-gray-900">{res.arrival}</p>
                                    </div>
                                    <div className="px-6 py-3 bg-gray-50 rounded-2xl border border-gray-200 group-hover:bg-indigo-50 group-hover:border-indigo-100 transition-all">
                                        <p className="text-[10px] font-black text-gray-400 uppercase group-hover:text-indigo-600">{res.status}</p>
                                    </div>
                                    <button className="p-3 text-gray-300 hover:text-gray-900 transition-colors"><MoreVertical size={20} /></button>
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Operational Sidebar / Panel */}
                    <div className="space-y-8">
                        {selectedRes ? (
                            <div className="bg-slate-900 rounded-[3rem] p-10 text-white shadow-2xl animate-in zoom-in-95 duration-300 relative overflow-hidden">
                                <div className="relative z-10 space-y-8">
                                    <div className="flex items-center justify-between">
                                        <h2 className="text-2xl font-black uppercase italic tracking-tighter">Check-in Terminal</h2>
                                        <button onClick={() => setSelectedRes(null)} className="text-slate-500 hover:text-white"><XCircle size={24} /></button>
                                    </div>

                                    {/* Policy Notification */}
                                    <div className={`p-6 rounded-[2rem] border ${selectedRes.policy.charge > 0 ? 'bg-amber-500/10 border-amber-500/20 text-amber-500' : 'bg-emerald-500/10 border-emerald-500/20 text-emerald-500'}`}>
                                        <div className="flex items-center gap-3 mb-2">
                                            {selectedRes.policy.charge > 0 ? <AlertCircle size={20} /> : <CheckCircle2 size={20} />}
                                            <span className="text-xs font-black uppercase tracking-widest">Policy Engine Evaluated</span>
                                        </div>
                                        <h4 className="text-lg font-black italic leading-tight">{selectedRes.policy.label}</h4>
                                        {selectedRes.policy.charge > 0 && <p className="text-2xl font-black mt-2">+ ${selectedRes.policy.charge}.00 <span className="text-xs font-bold opacity-60">ADDITIONAL FEE</span></p>}
                                    </div>

                                    {/* Quick Actions */}
                                    <div className="space-y-4 pt-4">
                                        <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest text-center">Adjust Folio Balance</p>
                                        <div className="grid grid-cols-2 gap-4">
                                            <button 
                                                onClick={() => triggerAdjustment(5)}
                                                className="py-4 bg-slate-800 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-700 transition-all flex flex-col items-center gap-2"
                                            >
                                                <DollarSign size={16} className="text-emerald-500" />
                                                Discount $5
                                            </button>
                                            <button 
                                                onClick={() => triggerAdjustment(50)}
                                                className="py-4 bg-slate-800 rounded-2xl text-[10px] font-black uppercase tracking-widest border border-amber-500/30 hover:bg-amber-500/10 transition-all flex flex-col items-center gap-2 group"
                                            >
                                                <ShieldAlert size={16} className="text-amber-500 group-hover:animate-pulse" />
                                                Waive $50
                                            </button>
                                        </div>
                                    </div>

                                    <button className="w-full bg-white text-slate-900 py-6 rounded-[2rem] text-sm font-black uppercase tracking-[0.2em] shadow-xl hover:bg-indigo-50 transition-all flex items-center justify-center gap-3">
                                        Proceed to Registration <LogIn size={18} />
                                    </button>
                                </div>
                                <Calendar size={200} className="absolute -right-20 -bottom-20 text-white/[0.03] rotate-12" />
                            </div>
                        ) : (
                            <div className="h-[500px] border-2 border-dashed border-gray-100 rounded-[3rem] flex flex-col items-center justify-center text-center p-12 transition-all hover:bg-white hover:border-indigo-100 group">
                                <div className="w-20 h-20 bg-gray-50 text-gray-300 rounded-full flex items-center justify-center mb-8 group-hover:scale-110 transition-all group-hover:bg-indigo-50 group-hover:text-indigo-400">
                                    <LogIn size={40} />
                                </div>
                                <h3 className="text-xl font-black text-gray-300 uppercase italic mb-2 group-hover:text-indigo-900">Operator Terminal</h3>
                                <p className="text-xs text-gray-300 font-bold uppercase tracking-widest group-hover:text-indigo-400">Select a due-in guest to evaluate stay policies and begin registration.</p>
                            </div>
                        )}

                        {/* Audit Log / Sec Log */}
                        <div className="bg-white border border-gray-100 rounded-[2.5rem] p-8 space-y-6">
                            <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest border-b border-gray-50 pb-4 flex items-center gap-2">
                                <ShieldAlert size={14} className="text-indigo-500" /> Session Security Log
                            </h4>
                            <div className="space-y-4 max-h-[160px] overflow-y-auto no-scrollbar">
                                {actionLog.length > 0 ? actionLog.map((log, i) => (
                                    <div key={i} className={`flex gap-3 text-[10px] font-bold ${log.startsWith('[SEC]') ? 'text-amber-600' : 'text-gray-500'}`}>
                                        <div className="w-1.5 h-1.5 rounded-full bg-current mt-1.5 flex-shrink-0" />
                                        <p className="leading-relaxed">{log}</p>
                                    </div>
                                )) : (
                                    <p className="text-[10px] text-gray-300 font-bold italic text-center py-4">No security events in current session.</p>
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Legend / Info Footer */}
                <div className="flex items-center justify-center gap-8 pt-12 border-t border-gray-50">
                    <div className="flex items-center gap-2">
                         <div className="w-2 h-2 rounded-full bg-indigo-500" />
                         <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Policy Engine v2.4</span>
                    </div>
                    <div className="flex items-center gap-2">
                         <div className="w-2 h-2 rounded-full bg-emerald-500" />
                         <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Financial Guard Active</span>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default FrontDesk;
