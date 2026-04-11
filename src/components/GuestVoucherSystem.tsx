
import { 
    QrCode, Ticket, Clock, 
    Share2, Download, Smartphone, 
    Zap, Info, ShieldCheck
} from 'lucide-react';

interface Voucher {
    id: string;
    guestName: string;
    roomNo: string;
    serviceName: string;
    status: 'Valid' | 'Redeemed' | 'Expired';
    expiryDate: string;
    qrData: string;
    benefit: string;
}

const GuestVoucherSystem = () => {

    const vouchers: Voucher[] = [
        {
            id: 'V-2025-AX1',
            guestName: 'Aniya Nusrat',
            roomNo: '105',
            serviceName: 'Pool & Spa Access',
            status: 'Valid',
            expiryDate: '07 Apr 2025',
            qrData: 'NICE-HMS-VOUCH-AX1',
            benefit: '2 Adults + 1 Child'
        },
        {
            id: 'V-2025-TR2',
            guestName: 'Aniya Nusrat',
            roomNo: '105',
            serviceName: 'Airport Drop-off',
            status: 'Redeemed',
            expiryDate: '07 Apr 2025',
            qrData: 'NICE-HMS-VOUCH-TR2',
            benefit: 'Standard Sedan Pickup'
        }
    ];

    return (
        <div className="min-h-screen bg-gray-50 flex flex-col font-sans overflow-hidden">
            {/* Enterprise Header */}
            <div className="bg-white border-b px-8 py-6 flex justify-between items-center z-10 shadow-sm">
                <div>
                    <h1 className="text-2xl font-black text-gray-900 tracking-tighter uppercase">Digital Service Vouchers</h1>
                    <p className="text-[10px] font-bold text-gray-400 tracking-widest uppercase mt-1">NICE-HMS In-Stay Package Verification</p>
                </div>
                <div className="flex gap-3">
                    <button className="flex items-center gap-2 px-6 py-3 bg-gray-900 text-white rounded-2xl font-bold text-xs uppercase tracking-widest hover:bg-blue-600 transition-all shadow-lg shadow-gray-900/10">
                        <Smartphone size={16} />
                        Sync to Guest App
                    </button>
                    <button className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-2xl font-bold text-xs uppercase tracking-widest hover:bg-gray-900 transition-all shadow-lg shadow-blue-600/10">
                        <Zap size={16} />
                        Issue New Pass
                    </button>
                </div>
            </div>

            <div className="flex-1 p-8 grid grid-cols-12 gap-8 overflow-auto">
                {/* Voucher Inventory - Mobile App Preview Style */}
                <div className="col-span-12 lg:col-span-8 flex flex-wrap gap-6 items-start">
                    {vouchers.map(vouch => (
                        <div key={vouch.id} className="w-[380px] bg-white rounded-[2.5rem] border border-gray-100 shadow-xl overflow-hidden relative group transition-all hover:scale-[1.02]">
                            {/* Voucher Header - Ticket Style cut-outs */}
                            <div className="bg-gray-900 p-8 text-white relative">
                                <div className="absolute -bottom-4 -left-4 w-8 h-8 bg-gray-50 rounded-full" />
                                <div className="absolute -bottom-4 -right-4 w-8 h-8 bg-gray-50 rounded-full" />
                                
                                <div className="flex justify-between items-start mb-6">
                                    <div className="p-2 bg-blue-600 rounded-xl">
                                        <Ticket size={24} />
                                    </div>
                                    <span className={`text-[10px] font-black px-2 py-1 rounded-md uppercase tracking-widest ${
                                        vouch.status === 'Valid' ? 'bg-emerald-500 text-white' : 'bg-gray-700 text-gray-400'
                                    }`}>
                                        {vouch.status}
                                    </span>
                                </div>
                                <h3 className="text-xl font-black tracking-tight">{vouch.serviceName}</h3>
                                <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mt-1">Package Inclusion: {vouch.benefit}</p>
                            </div>

                            {/* Ticket Divider Line */}
                            <div className="px-8 flex items-center gap-2">
                                <div className="flex-1 border-t-2 border-dashed border-gray-100" />
                            </div>

                            {/* Voucher Details */}
                            <div className="p-8 space-y-6">
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Guest Identity</p>
                                        <p className="text-sm font-black text-gray-900">{vouch.guestName}</p>
                                        <p className="text-[10px] text-gray-400 font-bold uppercase">Room {vouch.roomNo}</p>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Valid Until</p>
                                        <p className="text-sm font-black text-gray-900">{vouch.expiryDate}</p>
                                        <p className="text-[10px] text-rose-500 font-bold uppercase tracking-tighter">72h Remaining</p>
                                    </div>
                                </div>

                                <div className="flex items-center gap-4 pt-4 border-t border-gray-50">
                                    <div className="w-16 h-16 bg-gray-50 border border-gray-100 rounded-xl flex items-center justify-center text-gray-400">
                                        <QrCode size={32} />
                                    </div>
                                    <div className="flex-1">
                                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Unique Pass ID</p>
                                        <p className="text-xs font-mono font-bold text-gray-900">{vouch.id}</p>
                                        <div className="flex gap-2 mt-2">
                                            <button className="p-1.5 bg-gray-100 text-gray-400 hover:text-gray-900 rounded-lg transition-colors"><Download size={14} /></button>
                                            <button className="p-1.5 bg-gray-100 text-gray-400 hover:text-gray-900 rounded-lg transition-colors"><Share2 size={14} /></button>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Verification Overlay (Hover) */}
                            {vouch.status === 'Valid' && (
                                <div className="absolute inset-0 bg-blue-600/95 flex flex-col items-center justify-center text-white p-10 opacity-0 group-hover:opacity-100 transition-all duration-300">
                                    <QrCode size={64} className="mb-6" />
                                    <h4 className="text-xl font-black mb-2">Scan to Verify</h4>
                                    <p className="text-xs font-bold text-blue-100 text-center mb-8 uppercase tracking-widest">Present this code at the service counter to redeem your benefit.</p>
                                    <button className="w-full py-4 bg-white text-blue-600 font-black rounded-2xl text-xs uppercase tracking-widest shadow-xl">
                                        Generate Dynamic Code
                                    </button>
                                </div>
                            )}
                        </div>
                    ))}
                </div>

                {/* Redemption Stats Sidebar */}
                <div className="col-span-12 lg:col-span-4 space-y-6">
                    <div className="bg-white rounded-[2.5rem] p-8 border border-gray-100 shadow-xl space-y-8">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-emerald-50 text-emerald-600 rounded-xl animate-pulse">
                                <ShieldCheck size={20} />
                            </div>
                            <h3 className="text-sm font-black text-gray-900 uppercase tracking-widest">Security & Verification</h3>
                        </div>
                        
                        <div className="space-y-6">
                            <div className="p-4 bg-gray-50 rounded-2xl border border-gray-100 space-y-4">
                                <div className="flex items-center gap-3">
                                    <Clock size={16} className="text-gray-400" />
                                    <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Recent Activity</span>
                                </div>
                                <div className="space-y-3">
                                    <div className="flex justify-between items-center text-xs">
                                        <span className="font-bold text-gray-600 tracking-tight">V-TR2 Redeemed</span>
                                        <span className="text-[10px] font-bold text-gray-400 uppercase">2m ago</span>
                                    </div>
                                    <div className="flex justify-between items-center text-xs">
                                        <span className="font-bold text-gray-600 tracking-tight">V-AX1 Code Refresh</span>
                                        <span className="text-[10px] font-bold text-gray-400 uppercase">10m ago</span>
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-4">
                                <div className="flex justify-between">
                                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Daily Redemption Load</p>
                                    <p className="text-[10px] font-black text-blue-600 uppercase">82% Capacity</p>
                                </div>
                                <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                                    <div className="w-[82%] h-full bg-blue-600 rounded-full shadow-lg shadow-blue-600/20" />
                                </div>
                            </div>
                        </div>

                        <div className="pt-8 border-t border-gray-100">
                            <div className="flex items-start gap-4 text-gray-500">
                                <Info size={16} className="mt-1 flex-shrink-0" />
                                <p className="text-[10px] font-medium leading-relaxed italic">
                                    These vouchers are single-use assets linked to the guest's folio. System will automatically update the allowance engine upon scanning.
                                </p>
                            </div>
                        </div>
                    </div>

                    <div className="bg-gradient-to-br from-blue-600 to-indigo-700 rounded-[2.5rem] p-8 text-white shadow-xl relative overflow-hidden group">
                        <Smartphone className="absolute -right-8 -bottom-8 w-48 h-48 text-white/5 rotate-12 transition-transform duration-700 group-hover:scale-110" />
                        <div className="relative z-10">
                            <h4 className="text-xl font-black mb-4 tracking-tighter uppercase leading-none">Guest Mobile <br/> Experience</h4>
                            <p className="text-xs text-blue-100 font-bold uppercase tracking-widest mb-6 leading-relaxed">Boost guest satisfaction by <br/> enabling self-discovery <br/> of package contents.</p>
                            <button className="px-6 py-3 bg-white text-blue-600 font-black rounded-2xl text-[10px] uppercase tracking-widest shadow-lg">
                                Enable Guest App Sync
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default GuestVoucherSystem;
