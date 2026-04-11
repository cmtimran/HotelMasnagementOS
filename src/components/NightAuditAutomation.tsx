import { useState } from 'react';
import { 
    Moon, Sun, ShieldCheck, 
    TrendingUp, RefreshCw, AlertTriangle, CheckCircle2, 
    Landmark, History
} from 'lucide-react';

interface RevenuePosting {
    id: number;
    department: string;
    description: string;
    glCode: string;
    amount: number;
    status: 'Pending' | 'Posted';
}

const NightAuditAutomation = () => {
    const [isProcessing, setIsProcessing] = useState(false);

    const [postings] = useState<RevenuePosting[]>([
        { id: 1, department: 'Rooms', description: 'Base Room Rent (FOL-2025-001)', glCode: '10010', amount: 8500, status: 'Pending' },
        { id: 2, department: 'F&B', description: 'Package Meal Allocation (Honeymoon Pkg)', glCode: '40010', amount: 3500, status: 'Pending' },
        { id: 3, department: 'Transport', description: 'Airport Drop Allocation', glCode: '50020', amount: 2000, status: 'Pending' },
        { id: 4, department: 'Laundry', description: 'Included Valet Service', glCode: '60010', amount: 500, status: 'Pending' },
        { id: 5, department: 'Other', description: 'Pool Maintenance Chargeback', glCode: '90020', amount: 500, status: 'Pending' }
    ]);

    const totalRevenue = postings.reduce((sum, p) => sum + p.amount, 0);

    const runAudit = () => {
        setIsProcessing(true);
        setTimeout(() => {
            setIsProcessing(false);
        }, 3000);
    };

    return (
        <div className="min-h-screen bg-gray-50 p-10 font-sans">
            <div className="max-w-6xl mx-auto space-y-8">
                {/* Audit Control Header */}
                <div className="bg-gray-900 rounded-[2.5rem] p-10 text-white relative overflow-hidden shadow-2xl">
                    <div className="absolute top-0 right-0 w-96 h-96 bg-blue-600/10 -mr-32 -mt-32 rounded-full blur-[100px]" />
                    
                    <div className="relative z-10 flex flex-col md:flex-row justify-between items-center gap-8">
                        <div className="space-y-4 text-center md:text-left">
                            <div className="inline-flex items-center gap-2 px-4 py-2 bg-blue-500/10 border border-blue-500/20 rounded-full text-blue-400 text-xs font-black uppercase tracking-widest">
                                <Moon size={14} />
                                Automated Night Audit Engine
                            </div>
                            <h1 className="text-4xl font-black tracking-tighter">Day End Reconciliation <span className="text-gray-500">| April 11, 2026</span></h1>
                            <p className="text-gray-400 font-medium max-w-xl">
                                System will now split <span className="text-white font-bold">৳ {totalRevenue.toLocaleString()}</span> from package bundles and route them to their respective General Ledger (GL) departments.
                            </p>
                        </div>
                        
                        <div className="flex flex-col items-center gap-3">
                            <button 
                                onClick={runAudit}
                                disabled={isProcessing}
                                className={`px-10 py-5 rounded-2xl font-black text-sm uppercase tracking-widest flex items-center gap-3 transition-all ${
                                    isProcessing ? 'bg-gray-800 text-gray-500 cursor-not-allowed' : 'bg-blue-600 hover:bg-white hover:text-blue-600 shadow-xl shadow-blue-600/20'
                                }`}
                            >
                                {isProcessing ? <RefreshCw className="animate-spin" /> : <Sun size={20} />}
                                {isProcessing ? 'Processing Re-Routing...' : 'Initialize Day-End Audit'}
                            </button>
                            <span className="text-[10px] font-bold text-gray-600 uppercase tracking-tighter">Last Audit: 12 April 2025 00:01 AM</span>
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-12 gap-8">
                    {/* Audit Progress & Validation */}
                    <div className="col-span-8 space-y-6">
                        <div className="bg-white rounded-[2rem] p-8 border border-gray-100 shadow-sm space-y-8">
                            <div className="flex justify-between items-center pb-6 border-b border-gray-50">
                                <h3 className="text-lg font-black text-gray-900 tracking-tight flex items-center gap-3">
                                    <TrendingUp className="text-blue-600" />
                                    Revenue Distribution (Package Split)
                                </h3>
                                <div className="flex gap-2">
                                    <span className="px-3 py-1 bg-emerald-50 text-emerald-600 text-[10px] font-black uppercase rounded-lg border border-emerald-100 italic">GL Balanced</span>
                                </div>
                            </div>

                            <div className="space-y-4">
                                {postings.map(post => (
                                    <div key={post.id} className="flex items-center justify-between p-4 rounded-xl hover:bg-gray-50 transition-colors group">
                                        <div className="flex items-center gap-5">
                                            <div className="w-12 h-12 bg-gray-50 rounded-2xl flex items-center justify-center font-black text-blue-600 border border-gray-100 uppercase text-[10px] tracking-tighter group-hover:bg-blue-600 group-hover:text-white transition-all">
                                                {post.department}
                                            </div>
                                            <div>
                                                <h4 className="text-sm font-black text-gray-900">{post.description}</h4>
                                                <div className="flex items-center gap-2 mt-0.5">
                                                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest leading-none">GL: {post.glCode}</span>
                                                    <Landmark size={12} className="text-gray-300" />
                                                </div>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-sm font-black text-gray-900">৳ {post.amount.toLocaleString()}</p>
                                            <div className="flex items-center gap-1 justify-end text-[9px] font-bold text-gray-400 uppercase tracking-tighter mt-1">
                                                <div className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                                                Pre-Audit Posting
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            <div className="pt-8 border-t border-gray-100 flex justify-between items-center text-gray-900">
                                <span className="text-xs font-black uppercase tracking-widest text-gray-400">Total Settlement Balance</span>
                                <span className="text-2xl font-black">৳ {totalRevenue.toLocaleString()}</span>
                            </div>
                        </div>
                    </div>

                    {/* Operational Compliance Sidebar */}
                    <div className="col-span-4 space-y-6">
                        <div className="bg-white rounded-[2rem] p-8 border border-gray-100 shadow-sm">
                            <h3 className="text-sm font-black text-gray-900 uppercase tracking-widest mb-6">Compliance Checklist</h3>
                            <div className="space-y-6">
                                <div className="flex items-start gap-4">
                                    <div className="mt-1"><CheckCircle2 size={18} className="text-emerald-500" /></div>
                                    <div>
                                        <p className="text-xs font-black text-gray-900">All Charges Posted</p>
                                        <p className="text-[10px] text-gray-400 font-medium">Verified through POS Cross-Outlet Connectivity</p>
                                    </div>
                                </div>
                                <div className="flex items-start gap-4">
                                    <div className="mt-1"><AlertTriangle size={18} className="text-orange-500" /></div>
                                    <div>
                                        <p className="text-xs font-black text-gray-900">Pending Void Transfers</p>
                                        <p className="text-[10px] text-gray-400 font-medium italic">2 Unreconciled Minibar items detected</p>
                                    </div>
                                </div>
                                <div className="flex items-start gap-4">
                                    <div className="mt-1"><ShieldCheck size={18} className="text-blue-500" /></div>
                                    <div>
                                        <p className="text-xs font-black text-gray-900">Ledger Auto-Route</p>
                                        <p className="text-[10px] text-gray-400 font-medium uppercase tracking-tighter">Finance Standard: FASB 606 Ready</p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="bg-gray-900 rounded-[2rem] p-8 text-white relative overflow-hidden group">
                            <div className="relative z-10">
                                <History className="text-blue-400 mb-4" />
                                <h4 className="text-sm font-black uppercase tracking-widest mb-2">Audit Snapshots</h4>
                                <p className="text-[10px] text-gray-500 leading-relaxed font-medium">Audit logs are archived for 7 years. You can download the PDF breakdown for each department's revenue share.</p>
                                <button className="mt-6 w-full py-3 bg-white/10 hover:bg-white/20 border border-white/10 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all">
                                    View Archived Logs
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default NightAuditAutomation;
