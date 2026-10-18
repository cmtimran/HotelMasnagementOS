import {
    CalendarCheck, Users, LogOut, LogIn, BedDouble,
    TrendingUp, AlertTriangle, Wrench,
    MoreHorizontal, ChevronRight, User,
    Star, Ban, CreditCard, Banknote, Landmark
} from 'lucide-react';

const Dashboard = () => {
    // Mock Data
    const guests = [
        { id: 1, name: 'Mr. John Smith', room: '104', type: 'VIP', status: 'Arriving' },
        { id: 2, name: 'Sarah Connor', room: '202', type: 'Corporate', status: 'Checked In' },
        { id: 3, name: 'James Bund', room: '305', type: 'Regular', status: 'Arriving' },
    ];

    const maintenance = [
        { id: 1, room: '102', issue: 'AC not cooling', priority: 'High', time: '2h ago' },
        { id: 2, room: '205', issue: 'Leaky faucet', priority: 'Medium', time: '4h ago' },
        { id: 3, room: '301', issue: 'WiFi signal weak', priority: 'Low', time: '1d ago' },
    ];

    const roomStatus = [
        { number: '101', status: 'clean' }, { number: '102', status: 'dirty' }, { number: '103', status: 'occupied' }, { number: '104', status: 'clean' },
        { number: '105', status: 'clean' }, { number: '106', status: 'maintenance' }, { number: '107', status: 'occupied' }, { number: '108', status: 'clean' },
        { number: '201', status: 'occupied' }, { number: '202', status: 'occupied' }, { number: '203', status: 'dirty' }, { number: '204', status: 'clean' },
        { number: '205', status: 'clean' }, { number: '206', status: 'occupied' }, { number: '207', status: 'occupied' }, { number: '208', status: 'clean' },
    ];

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'clean': return 'bg-emerald-600';
            case 'dirty': return 'bg-amber-500';
            case 'occupied': return 'bg-slate-700';
            case 'maintenance': return 'bg-rose-500';
            default: return 'bg-gray-200';
        }
    };

    return (
        <div className="p-3 sm:p-4 max-w-7xl mx-auto space-y-3 font-sans">
            {/* Compact Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-gray-200">
                <div>
                    <h1 className="text-base font-bold text-gray-900 tracking-tight leading-none">HMS Executive Overview</h1>
                    <p className="text-[11px] text-gray-500 font-medium leading-none mt-1">Real-time property operations & performance metrics</p>
                </div>
                <div className="flex items-center gap-2">
                    <button className="flex items-center gap-1.5 h-7 px-2.5 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-xs font-semibold transition-colors shadow-xs">
                        <Users size={13} />
                        <span>Front Desk</span>
                    </button>
                    <button className="flex items-center gap-1.5 h-7 px-2.5 bg-white border border-gray-200 text-gray-700 rounded-md hover:bg-gray-50 text-xs font-medium transition-colors">
                        <CalendarCheck size={13} className="text-gray-400" />
                        <span>{new Date().toLocaleDateString()}</span>
                    </button>
                </div>
            </div>

            {/* Row 1: Operations High-Level (Occupancy, Front Desk, KPI, Cancellations) */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
                {/* Occupancy Rate - Compact Radial Gauge */}
                <div className="bg-white p-3 rounded-lg shadow-2xs border border-gray-200/80 flex flex-col items-center justify-between">
                    <div className="flex items-center justify-between w-full mb-1">
                        <span className="text-gray-500 text-[10px] font-bold uppercase tracking-wider">Occupancy</span>
                        <span className="text-[10px] text-emerald-600 font-semibold bg-emerald-50 px-1.5 py-0.2 rounded">Live</span>
                    </div>
                    <div className="relative w-24 h-24 flex items-center justify-center my-1">
                        <svg className="w-full h-full transform -rotate-90">
                            <circle cx="48" cy="48" r="40" stroke="currentColor" strokeWidth="8" fill="transparent" className="text-gray-100" />
                            <circle cx="48" cy="48" r="40" stroke="currentColor" strokeWidth="8" fill="transparent" strokeDasharray={251.32} strokeDashoffset={251.32 * (1 - 0.78)} className="text-blue-600 transition-all duration-500" />
                        </svg>
                        <div className="absolute flex flex-col items-center">
                            <span className="text-xl font-bold text-gray-900 leading-none">78%</span>
                            <span className="text-[9px] text-gray-400 font-medium mt-0.5">Capacity</span>
                        </div>
                    </div>
                    <p className="text-[10px] text-gray-400 text-center">45 of 58 Rooms Active</p>
                </div>

                {/* Front Desk Activity */}
                <div className="bg-white p-3 rounded-lg shadow-2xs border border-gray-200/80 flex flex-col justify-between">
                    <span className="text-gray-500 text-[10px] font-bold uppercase tracking-wider mb-2">Front Desk Activity</span>
                    <div className="grid grid-cols-3 gap-1.5 flex-1">
                        <div className="flex flex-col items-center justify-center p-1.5 bg-emerald-50/70 rounded-md border border-emerald-100">
                            <LogIn size={15} className="text-emerald-600 mb-0.5" />
                            <span className="text-base font-bold text-gray-900 leading-tight">12</span>
                            <span className="text-[9px] text-gray-500 font-medium uppercase">Arrivals</span>
                        </div>
                        <div className="flex flex-col items-center justify-center p-1.5 bg-amber-50/70 rounded-md border border-amber-100">
                            <LogOut size={15} className="text-amber-600 mb-0.5" />
                            <span className="text-base font-bold text-gray-900 leading-tight">8</span>
                            <span className="text-[9px] text-gray-500 font-medium uppercase">Departs</span>
                        </div>
                        <div className="flex flex-col items-center justify-center p-1.5 bg-blue-50/70 rounded-md border border-blue-100">
                            <BedDouble size={15} className="text-blue-600 mb-0.5" />
                            <span className="text-base font-bold text-gray-900 leading-tight">45</span>
                            <span className="text-[9px] text-gray-500 font-medium uppercase">In-House</span>
                        </div>
                    </div>
                    <p className="text-[10px] text-gray-400 mt-2 text-center">8 Pending Departures</p>
                </div>

                {/* KPIs (ADR, RevPAR, ALOS) */}
                <div className="grid grid-rows-3 gap-1.5">
                    <div className="bg-white px-3 py-1.5 rounded-lg shadow-2xs border border-gray-200/80 flex items-center justify-between">
                        <div>
                            <p className="text-gray-400 text-[9px] font-bold uppercase">ADR</p>
                            <h4 className="text-xs font-bold text-gray-900 leading-tight">৳ 4,500</h4>
                        </div>
                        <span className="text-[10px] text-emerald-600 font-semibold flex items-center bg-emerald-50 px-1 py-0.2 rounded"><TrendingUp size={9} className="mr-0.5" /> +5%</span>
                    </div>
                    <div className="bg-white px-3 py-1.5 rounded-lg shadow-2xs border border-gray-200/80 flex items-center justify-between">
                        <div>
                            <p className="text-gray-400 text-[9px] font-bold uppercase">RevPAR</p>
                            <h4 className="text-xs font-bold text-gray-900 leading-tight">৳ 3,150</h4>
                        </div>
                        <span className="text-[10px] text-emerald-600 font-semibold flex items-center bg-emerald-50 px-1 py-0.2 rounded"><TrendingUp size={9} className="mr-0.5" /> +8%</span>
                    </div>
                    <div className="bg-white px-3 py-1.5 rounded-lg shadow-2xs border border-gray-200/80 flex items-center justify-between">
                        <div>
                            <p className="text-gray-400 text-[9px] font-bold uppercase">ALOS</p>
                            <h4 className="text-xs font-bold text-gray-900 leading-tight">2.4 Days</h4>
                        </div>
                        <span className="text-[9px] text-gray-400">Target: 2.5</span>
                    </div>
                </div>

                {/* Cancellation Watch */}
                <div className="bg-white p-3 rounded-lg shadow-2xs border border-rose-100 flex flex-col items-center justify-center relative bg-rose-50/20">
                    <div className="absolute top-2 right-2 p-1 bg-rose-100 text-rose-500 rounded-md">
                        <Ban size={13} />
                    </div>
                    <span className="text-2xl font-bold text-gray-900 leading-none">5</span>
                    <span className="text-xs font-medium text-gray-600 mt-1">Cancellations Today</span>
                    <span className="text-[10px] text-rose-600 font-semibold mt-1 flex items-center bg-rose-100 px-1.5 py-0.2 rounded"><TrendingUp size={9} className="mr-0.5" /> +2 vs Avg</span>
                </div>
            </div>

            {/* Row 2: Financials & Trends */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
                {/* Revenue Pace/Trend */}
                <div className="bg-white p-3 rounded-lg shadow-2xs border border-gray-200/80">
                    <div className="flex justify-between items-center mb-2">
                        <h3 className="text-gray-800 font-bold text-xs">Revenue Pace (OTB vs Budget)</h3>
                        <span className="text-[10px] text-gray-400">This Month</span>
                    </div>
                    <div className="relative h-28 w-full mt-2">
                        <svg viewBox="0 0 100 50" className="w-full h-full overflow-visible" preserveAspectRatio="none">
                            <path d="M0,45 Q25,35 50,30 T100,20" fill="none" stroke="#9ca3af" strokeWidth="1.5" strokeDasharray="3,3" />
                            <path d="M0,48 Q25,40 50,25 T100,10" fill="none" stroke="#2563eb" strokeWidth="2" />
                            <circle cx="50" cy="25" r="2" fill="white" stroke="#2563eb" strokeWidth="1.5" />
                            <circle cx="100" cy="10" r="2" fill="white" stroke="#2563eb" strokeWidth="1.5" />
                        </svg>
                        <div className="flex justify-between text-[9px] text-gray-400 mt-1">
                            <span>W1</span><span>W2</span><span>W3</span><span>W4</span>
                        </div>
                        <div className="flex gap-3 justify-center mt-1 text-[10px] text-gray-500">
                            <div className="flex items-center gap-1"><span className="w-2.5 h-1 bg-blue-600 rounded"></span> OTB</div>
                            <div className="flex items-center gap-1"><span className="w-2.5 h-1 bg-gray-400 rounded border-dashed border-b"></span> Budget</div>
                        </div>
                    </div>
                </div>

                {/* Today's Collections */}
                <div className="bg-white p-3 rounded-lg shadow-2xs border border-gray-200/80">
                    <div className="flex justify-between items-center mb-2">
                        <h3 className="text-gray-800 font-bold text-xs">Today's Collections</h3>
                        <span className="font-bold text-sm text-gray-900">৳ 125,000</span>
                    </div>
                    <div className="space-y-2 mt-2">
                        <div>
                            <div className="flex justify-between text-[11px] mb-0.5">
                                <span className="flex items-center gap-1.5 font-medium text-gray-700"><Banknote size={12} className="text-emerald-600" /> Cash</span>
                                <span className="font-bold text-gray-900">৳ 45k (36%)</span>
                            </div>
                            <div className="w-full bg-gray-100 rounded-full h-1.5">
                                <div className="bg-emerald-500 h-1.5 rounded-full w-[36%]"></div>
                            </div>
                        </div>
                        <div>
                            <div className="flex justify-between text-[11px] mb-0.5">
                                <span className="flex items-center gap-1.5 font-medium text-gray-700"><CreditCard size={12} className="text-blue-600" /> Card</span>
                                <span className="font-bold text-gray-900">৳ 55k (44%)</span>
                            </div>
                            <div className="w-full bg-gray-100 rounded-full h-1.5">
                                <div className="bg-blue-600 h-1.5 rounded-full w-[44%]"></div>
                            </div>
                        </div>
                        <div>
                            <div className="flex justify-between text-[11px] mb-0.5">
                                <span className="flex items-center gap-1.5 font-medium text-gray-700"><Landmark size={12} className="text-purple-600" /> City Ledger</span>
                                <span className="font-bold text-gray-900">৳ 25k (20%)</span>
                            </div>
                            <div className="w-full bg-gray-100 rounded-full h-1.5">
                                <div className="bg-purple-500 h-1.5 rounded-full w-[20%]"></div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Guest Sentiment */}
                <div className="bg-white p-3 rounded-lg shadow-2xs border border-gray-200/80 flex flex-col items-center justify-center">
                    <span className="text-gray-500 text-[10px] font-bold uppercase tracking-wider mb-1 w-full text-left">Guest Rating</span>
                    <div className="text-3xl font-bold text-gray-900 leading-none">4.8</div>
                    <div className="flex gap-1 my-1.5">
                        {[1, 2, 3, 4].map(i => <Star key={i} size={15} className="fill-amber-400 text-amber-400" />)}
                        <Star size={15} className="fill-amber-400 text-amber-400" style={{ clipPath: 'inset(0 20% 0 0)' }} />
                    </div>
                    <p className="text-[11px] text-gray-500">Based on <strong className="text-gray-900">128 verified reviews</strong></p>
                    <div className="mt-2 flex gap-1.5 text-[10px]">
                        <span className="px-1.5 py-0.5 bg-emerald-50 text-emerald-700 rounded font-medium">Clean 5.0</span>
                        <span className="px-1.5 py-0.5 bg-blue-50 text-blue-700 rounded font-medium">Service 4.7</span>
                    </div>
                </div>
            </div>

            {/* Row 3: Forecast, Housekeeping & Channels */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
                {/* 14-Day Forecast */}
                <div className="bg-white p-3 rounded-lg shadow-2xs border border-gray-200/80">
                    <div className="flex justify-between items-center mb-2">
                        <h3 className="text-gray-900 font-bold text-xs">14-Day Demand Forecast</h3>
                    </div>
                    <div className="flex items-end justify-between h-20 gap-1 mt-2">
                        {[60, 75, 80, 90, 85, 70, 65, 60, 55, 70, 80, 85, 90, 95].map((h, i) => (
                            <div key={i} className="w-full bg-blue-50 rounded-t relative group">
                                <div className="absolute bottom-0 w-full bg-blue-600 rounded-t transition-all hover:bg-blue-700" style={{ height: `${h}%` }}></div>
                                <div className="hidden group-hover:block absolute bottom-full left-1/2 transform -translate-x-1/2 mb-1 bg-gray-900 text-white text-[9px] py-0.5 px-1 rounded whitespace-nowrap z-10">
                                    {h}%
                                </div>
                            </div>
                        ))}
                    </div>
                    <div className="flex justify-between text-[9px] text-gray-400 mt-1">
                        <span>Today</span>
                        <span>+7d</span>
                        <span>+14d</span>
                    </div>
                </div>

                {/* Housekeeping Status */}
                <div className="bg-white p-3 rounded-lg shadow-2xs border border-gray-200/80 flex flex-col justify-between">
                    <span className="text-gray-500 text-[10px] font-bold uppercase tracking-wider mb-2">Housekeeping Status</span>
                    <div className="flex h-3 w-full rounded-full overflow-hidden mb-2">
                        <div className="bg-emerald-500 w-[60%]" title="Clean: 60%"></div>
                        <div className="bg-amber-500 w-[25%]" title="Dirty: 25%"></div>
                        <div className="bg-blue-400 w-[10%]" title="Inspected: 10%"></div>
                        <div className="bg-rose-500 w-[5%]" title="OOO: 5%"></div>
                    </div>
                    <div className="grid grid-cols-2 gap-y-1 text-[11px] text-gray-600">
                        <div className="flex items-center gap-1.5"><div className="w-1.5 h-1.5 rounded-full bg-emerald-500"></div> Clean (32)</div>
                        <div className="flex items-center gap-1.5"><div className="w-1.5 h-1.5 rounded-full bg-amber-500"></div> Dirty (14)</div>
                        <div className="flex items-center gap-1.5"><div className="w-1.5 h-1.5 rounded-full bg-blue-400"></div> Inspected (6)</div>
                        <div className="flex items-center gap-1.5"><div className="w-1.5 h-1.5 rounded-full bg-rose-500"></div> OOO (3)</div>
                    </div>
                </div>

                {/* Booking Source Distribution */}
                <div className="bg-white p-3 rounded-lg shadow-2xs border border-gray-200/80">
                    <div className="flex justify-between items-center mb-2">
                        <h3 className="text-gray-800 font-bold text-xs">Distribution Channels</h3>
                        <MoreHorizontal size={14} className="text-gray-400 cursor-pointer" />
                    </div>
                    <div className="flex items-center gap-3">
                        <div className="relative w-20 h-20 rounded-full flex-shrink-0"
                            style={{ background: 'conic-gradient(#2563eb 0% 45%, #9333ea 45% 70%, #16a34a 70% 90%, #ea580c 90% 100%)' }}>
                            <div className="absolute inset-5 bg-white rounded-full"></div>
                        </div>
                        <div className="space-y-1 flex-1 text-[11px]">
                            <div className="flex justify-between"><span className="flex items-center gap-1"><span className="w-1.5 h-1.5 bg-blue-600 rounded-full"></span> OTA</span> <span className="font-bold text-gray-800">45%</span></div>
                            <div className="flex justify-between"><span className="flex items-center gap-1"><span className="w-1.5 h-1.5 bg-purple-600 rounded-full"></span> Walk-in</span> <span className="font-bold text-gray-800">25%</span></div>
                            <div className="flex justify-between"><span className="flex items-center gap-1"><span className="w-1.5 h-1.5 bg-green-600 rounded-full"></span> Corp</span> <span className="font-bold text-gray-800">20%</span></div>
                            <div className="flex justify-between"><span className="flex items-center gap-1"><span className="w-1.5 h-1.5 bg-orange-600 rounded-full"></span> Direct</span> <span className="font-bold text-gray-800">10%</span></div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Row 4: Room Status Grid & Upcoming Arrivals */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
                {/* Room Status Grid */}
                <div className="lg:col-span-2 bg-white p-3 rounded-lg shadow-2xs border border-gray-200/80">
                    <div className="flex justify-between items-center mb-2">
                        <h3 className="text-gray-800 font-bold text-xs">Real-Time Room Status Matrix</h3>
                        <span className="text-[10px] text-blue-600 hover:underline font-semibold cursor-pointer">Room Rack →</span>
                    </div>
                    <div className="grid grid-cols-8 gap-1.5">
                        {roomStatus.map((room) => (
                            <div key={room.number}
                                className={`${getStatusColor(room.status)} h-8 rounded-md flex items-center justify-center text-white text-[11px] font-bold cursor-pointer hover:opacity-90 transition-opacity relative`}
                                title={`Room ${room.number}: ${room.status}`}
                            >
                                {room.number}
                                {room.status === 'maintenance' && <Wrench size={8} className="absolute top-0.5 right-0.5" />}
                                {room.status === 'dirty' && <span className="absolute top-0.5 right-0.5 w-1 h-1 bg-white rounded-full"></span>}
                            </div>
                        ))}
                    </div>
                    <div className="flex gap-3 mt-2 text-[10px] text-gray-500 justify-end">
                        <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-emerald-600"></span> Clean</span>
                        <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-slate-700"></span> Occupied</span>
                        <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span> Dirty</span>
                        <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-rose-500"></span> OOO</span>
                    </div>
                </div>

                {/* Upcoming Arrivals & Maintenance Alerts */}
                <div className="bg-white p-3 rounded-lg shadow-2xs border border-gray-200/80 space-y-2">
                    <div className="flex justify-between items-center border-b border-gray-100 pb-1.5">
                        <h3 className="text-gray-800 font-bold text-xs">VIP Arrivals & Alerts</h3>
                        <ChevronRight size={13} className="text-gray-400" />
                    </div>
                    <div className="space-y-1.5">
                        {guests.slice(0, 2).map((guest) => (
                            <div key={guest.id} className="flex items-center gap-2 p-1.5 bg-gray-50/80 rounded-md border border-gray-100">
                                <div className={`w-5 h-5 rounded flex items-center justify-center text-xs flex-shrink-0 ${guest.type === 'VIP' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'}`}>
                                    <User size={11} />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <h4 className="text-[11px] font-bold text-gray-800 truncate">{guest.name}</h4>
                                    <p className="text-[9px] text-gray-400 font-medium">Room {guest.room} • {guest.type}</p>
                                </div>
                                <span className="text-[9px] font-semibold px-1.5 py-0.2 bg-white border border-gray-200 rounded text-gray-600">{guest.status}</span>
                            </div>
                        ))}

                        {maintenance.slice(0, 1).map((item) => (
                            <div key={item.id} className="flex items-center gap-2 p-1.5 bg-rose-50/60 rounded-md border border-rose-100 text-rose-700">
                                <AlertTriangle size={12} className="text-rose-500 flex-shrink-0" />
                                <div className="flex-1 min-w-0">
                                    <p className="text-[10px] font-bold truncate">Room {item.room}: {item.issue}</p>
                                </div>
                                <span className="text-[8px] font-bold uppercase bg-rose-200/70 text-rose-800 px-1 py-0.2 rounded">{item.priority}</span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Dashboard;
