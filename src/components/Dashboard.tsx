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
            case 'clean': return 'bg-green-500';
            case 'dirty': return 'bg-orange-500';
            case 'occupied': return 'bg-gray-600';
            case 'maintenance': return 'bg-red-500';
            default: return 'bg-gray-200';
        }
    };

    return (
        <div className="p-6 max-w-7xl mx-auto space-y-6">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-800">HMS Overview</h1>
                    <p className="text-gray-500 text-sm">Real-time property operations dashboard.</p>
                </div>
                <div className="flex items-center gap-3">
                    <button className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium transition-colors shadow-sm">
                        <Users size={16} />
                        <span>Front Desk View</span>
                    </button>
                    <button className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 text-gray-700 rounded-lg hover:bg-gray-50 text-sm font-medium transition-colors">
                        <CalendarCheck size={16} />
                        <span>{new Date().toLocaleDateString()}</span>
                    </button>
                </div>
            </div>

            {/* Row 1: Operations High-Level (Occupancy, Front Desk, KPI, Cancellations) */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">

                {/* Occupancy Rate - Radial Gauge */}
                <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-200 flex flex-col items-center justify-center relative overflow-hidden">
                    <h3 className="text-gray-500 text-xs font-semibold uppercase tracking-wider mb-2 w-full text-left">Occupancy Rate</h3>
                    <div className="relative w-32 h-32 flex items-center justify-center">
                        <svg className="w-full h-full transform -rotate-90">
                            <circle cx="64" cy="64" r="56" stroke="currentColor" strokeWidth="12" fill="transparent" className="text-gray-100" />
                            <circle cx="64" cy="64" r="56" stroke="currentColor" strokeWidth="12" fill="transparent" strokeDasharray={351.86} strokeDashoffset={351.86 * (1 - 0.78)} className="text-blue-600" />
                        </svg>
                        <div className="absolute flex flex-col items-center">
                            <span className="text-3xl font-bold text-gray-800">78%</span>
                            <span className="text-xs text-gray-400">Real-time</span>
                        </div>
                    </div>
                </div>

                {/* Front Desk Activity */}
                <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-200 flex flex-col">
                    <h3 className="text-gray-500 text-xs font-semibold uppercase tracking-wider mb-4">Front Desk Activity</h3>
                    <div className="grid grid-cols-3 gap-2 flex-1">
                        <div className="flex flex-col items-center justify-center p-2 bg-green-50 rounded-lg">
                            <LogIn size={20} className="text-green-600 mb-1" />
                            <span className="text-lg font-semibold text-gray-800">12</span>
                            <span className="text-[10px] text-gray-500 uppercase">Arrivals</span>
                        </div>
                        <div className="flex flex-col items-center justify-center p-2 bg-orange-50 rounded-lg">
                            <LogOut size={20} className="text-orange-600 mb-1" />
                            <span className="text-lg font-semibold text-gray-800">8</span>
                            <span className="text-[10px] text-gray-500 uppercase">Departures</span>
                        </div>
                        <div className="flex flex-col items-center justify-center p-2 bg-blue-50 rounded-lg">
                            <BedDouble size={20} className="text-blue-600 mb-1" />
                            <span className="text-lg font-semibold text-gray-800">45</span>
                            <span className="text-[10px] text-gray-500 uppercase">In-House</span>
                        </div>
                    </div>
                </div>

                {/* KPIs (ADR, RevPAR, ALOS) */}
                <div className="grid grid-rows-3 gap-3">
                    <div className="bg-white px-4 py-3 rounded-lg shadow-sm border border-gray-200 flex items-center justify-between">
                        <div>
                            <p className="text-gray-500 text-[10px] font-bold uppercase">ADR</p>
                            <h4 className="text-lg font-bold text-gray-900">৳ 4,500</h4>
                        </div>
                        <span className="text-xs text-green-600 flex items-center bg-green-50 px-1.5 py-0.5 rounded"><TrendingUp size={10} className="mr-1" /> +5%</span>
                    </div>
                    <div className="bg-white px-4 py-3 rounded-lg shadow-sm border border-gray-200 flex items-center justify-between">
                        <div>
                            <p className="text-gray-500 text-[10px] font-bold uppercase">RevPAR</p>
                            <h4 className="text-lg font-bold text-gray-900">৳ 3,150</h4>
                        </div>
                        <span className="text-xs text-green-600 flex items-center bg-green-50 px-1.5 py-0.5 rounded"><TrendingUp size={10} className="mr-1" /> +8%</span>
                    </div>
                    <div className="bg-white px-4 py-3 rounded-lg shadow-sm border border-gray-200 flex items-center justify-between">
                        <div>
                            <p className="text-gray-500 text-[10px] font-bold uppercase">ALOS</p>
                            <h4 className="text-lg font-bold text-gray-900">2.4 Days</h4>
                        </div>
                        <span className="text-xs text-gray-500">Target: 2.5</span>
                    </div>
                </div>

                {/* Cancellation Watch */}
                <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-200 flex flex-col items-center justify-center relative bg-red-50/30">
                    <div className="absolute top-4 right-4 p-2 bg-red-100 rounded-full text-red-500">
                        <Ban size={20} />
                    </div>
                    <span className="text-4xl font-bold text-gray-800 mb-1">5</span>
                    <span className="text-sm font-medium text-gray-600">Cancellations Today</span>
                    <span className="text-xs text-red-500 mt-2 font-medium flex items-center bg-red-100 px-2 py-1 rounded-full"><TrendingUp size={10} className="mr-1" /> +2 vs Avg</span>
                </div>
            </div>

            {/* Row 2: Financials & Sentiment */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

                {/* Revenue Pace/Trend */}
                <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-200">
                    <div className="flex justify-between items-center mb-4">
                        <h3 className="text-gray-800 font-semibold text-sm">Revenue Pace (OTB vs Budget)</h3>
                        <span className="text-xs text-gray-500">This Month</span>
                    </div>
                    {/* Simple Line Chart Visualization */}
                    <div className="relative h-40 w-full mt-4">
                        <svg viewBox="0 0 100 50" className="w-full h-full overflow-visible" preserveAspectRatio="none">
                            {/* Budget Line (Dashed) */}
                            <path d="M0,45 Q25,35 50,30 T100,20" fill="none" stroke="#9ca3af" strokeWidth="2" strokeDasharray="4,4" />
                            {/* OTB Line (Solid) */}
                            <path d="M0,48 Q25,40 50,25 T100,10" fill="none" stroke="#3b82f6" strokeWidth="2" />
                            {/* Points */}
                            <circle cx="50" cy="25" r="2" fill="white" stroke="#3b82f6" strokeWidth="2" />
                            <circle cx="100" cy="10" r="2" fill="white" stroke="#3b82f6" strokeWidth="2" />
                        </svg>
                        <div className="flex justify-between text-xs text-gray-400 mt-2">
                            <span>Week 1</span><span>Week 2</span><span>Week 3</span><span>Week 4</span>
                        </div>
                        <div className="flex gap-4 justify-center mt-2 text-xs">
                            <div className="flex items-center gap-1"><span className="w-3 h-1 bg-blue-500"></span> OTB</div>
                            <div className="flex items-center gap-1"><span className="w-3 h-1 bg-gray-400 border-dashed border-b-2"></span> Budget</div>
                        </div>
                    </div>
                </div>

                {/* Today's Collections */}
                <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-200">
                    <div className="flex justify-between items-center mb-4">
                        <h3 className="text-gray-800 font-semibold text-sm">Today's Collections</h3>
                        <span className="font-semibold text-lg text-gray-800">৳ 125k</span>
                    </div>
                    <div className="space-y-4 mt-2">
                        <div>
                            <div className="flex justify-between text-xs mb-1">
                                <span className="flex items-center gap-2 font-medium text-gray-700"><Banknote size={14} /> Cash</span>
                                <span className="font-bold">৳ 45k (36%)</span>
                            </div>
                            <div className="w-full bg-gray-100 rounded-full h-2">
                                <div className="bg-green-500 h-2 rounded-full w-[36%]"></div>
                            </div>
                        </div>
                        <div>
                            <div className="flex justify-between text-xs mb-1">
                                <span className="flex items-center gap-2 font-medium text-gray-700"><CreditCard size={14} /> Card</span>
                                <span className="font-bold">৳ 55k (44%)</span>
                            </div>
                            <div className="w-full bg-gray-100 rounded-full h-2">
                                <div className="bg-blue-500 h-2 rounded-full w-[44%]"></div>
                            </div>
                        </div>
                        <div>
                            <div className="flex justify-between text-xs mb-1">
                                <span className="flex items-center gap-2 font-medium text-gray-700"><Landmark size={14} /> City Ledger</span>
                                <span className="font-bold">৳ 25k (20%)</span>
                            </div>
                            <div className="w-full bg-gray-100 rounded-full h-2">
                                <div className="bg-purple-500 h-2 rounded-full w-[20%]"></div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Guest Sentiment */}
                <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-200 flex flex-col items-center justify-center">
                    <h3 className="text-gray-500 text-xs font-semibold uppercase tracking-wider mb-4 w-full text-center">Guest Sentiment</h3>
                    <div className="text-5xl font-bold text-gray-800 mb-2">4.8</div>
                    <div className="flex gap-1 mb-4">
                        {[1, 2, 3, 4].map(i => <Star key={i} size={24} className="fill-yellow-400 text-yellow-400" />)}
                        <Star size={24} className="fill-yellow-400 text-yellow-400" style={{ clipPath: 'inset(0 20% 0 0)' }} />
                    </div>
                    <p className="text-sm text-gray-500 text-center">Based on <strong className="text-gray-900">128 reviews</strong> this month.</p>
                    <div className="mt-4 flex gap-2 text-xs">
                        <span className="px-2 py-1 bg-green-100 text-green-700 rounded-full">Cleanliness 5.0</span>
                        <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded-full">Service 4.7</span>
                    </div>
                </div>
            </div>

            {/* Row 3: Planning & Status */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

                {/* 14-Day Forecast */}
                <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-200 lg:col-span-1">
                    <div className="flex justify-between items-center mb-4">
                        <h3 className="text-gray-900 font-bold text-sm">14-Day Forecast</h3>
                    </div>
                    {/* Simplified Barchart for Forecast */}
                    <div className="flex items-end justify-between h-32 gap-1 mt-4">
                        {[60, 75, 80, 90, 85, 70, 65, 60, 55, 70, 80, 85, 90, 95].map((h, i) => (
                            <div key={i} className="w-full bg-blue-100 rounded-t-sm relative group">
                                <div className="absolute bottom-0 w-full bg-blue-500 rounded-t-sm transition-all hover:bg-blue-600" style={{ height: `${h}%` }}></div>
                                {/* Hover Tooltip */}
                                <div className="hidden group-hover:block absolute bottom-full left-1/2 transform -translate-x-1/2 mb-1 bg-gray-800 text-white text-[10px] py-1 px-2 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10">
                                    {h}% Occ
                                </div>
                            </div>
                        ))}
                    </div>
                    <div className="flex justify-between text-[10px] text-gray-400 mt-2">
                        <span>Today</span>
                        <span>+7 Days</span>
                        <span>+14 Days</span>
                    </div>
                </div>

                {/* Housekeeping Status */}
                <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-200">
                    <h3 className="text-gray-500 text-xs font-semibold uppercase tracking-wider mb-4">Housekeeping Status</h3>
                    <div className="flex-1 flex flex-col justify-center space-y-4">
                        <div className="flex h-4 w-full rounded-full overflow-hidden">
                            <div className="bg-green-500 w-[60%]" title="Clean: 60%"></div>
                            <div className="bg-orange-500 w-[25%]" title="Dirty: 25%"></div>
                            <div className="bg-blue-400 w-[10%]" title="Inspected: 10%"></div>
                            <div className="bg-red-500 w-[5%]" title="OOO: 5%"></div>
                        </div>
                        <div className="grid grid-cols-2 gap-y-2 text-xs">
                            <div className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-green-500"></div> Clean (32)</div>
                            <div className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-orange-500"></div> Dirty (14)</div>
                            <div className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-blue-400"></div> Insp. (6)</div>
                            <div className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-red-500"></div> OOO (3)</div>
                        </div>
                    </div>
                </div>

                {/* Booking Source */}
                <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-200">
                    <div className="flex justify-between items-center mb-4">
                        <h3 className="text-gray-800 font-semibold text-sm">Booking Source</h3>
                        <MoreHorizontal size={16} className="text-gray-400 cursor-pointer" />
                    </div>
                    <div className="flex items-center gap-6">
                        {/* CSS Pie Chart */}
                        <div className="relative w-32 h-32 rounded-full flex-shrink-0"
                            style={{ background: 'conic-gradient(#3b82f6 0% 45%, #a855f7 45% 70%, #22c55e 70% 90%, #f97316 90% 100%)' }}>
                            <div className="absolute inset-8 bg-white rounded-full"></div>
                        </div>
                        <div className="space-y-2 flex-1">
                            <div className="flex justify-between text-xs"><span className="flex items-center gap-2"><span className="w-2 h-2 bg-blue-500 rounded-full"></span> OTA</span> <span className="font-bold">45%</span></div>
                            <div className="flex justify-between text-xs"><span className="flex items-center gap-2"><span className="w-2 h-2 bg-purple-500 rounded-full"></span> Walk-in</span> <span className="font-bold">25%</span></div>
                            <div className="flex justify-between text-xs"><span className="flex items-center gap-2"><span className="w-2 h-2 bg-green-500 rounded-full"></span> Corp</span> <span className="font-bold">20%</span></div>
                            <div className="flex justify-between text-xs"><span className="flex items-center gap-2"><span className="w-2 h-2 bg-orange-500 rounded-full"></span> Direct</span> <span className="font-bold">10%</span></div>
                        </div>
                    </div>
                </div>

            </div>

            {/* Row 4: Operational Details */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

                {/* Room Grid / Tape Chart */}
                <div className="lg:col-span-2 bg-white p-5 rounded-xl shadow-sm border border-gray-200">
                    <div className="flex justify-between items-center mb-4">
                        <h3 className="text-gray-800 font-semibold text-sm">Room Status Grid</h3>
                        <span className="text-xs text-blue-600 hover:underline cursor-pointer">View All Floors</span>
                    </div>
                    <div className="grid grid-cols-8 gap-2">
                        {roomStatus.map((room) => (
                            <div key={room.number}
                                className={`${getStatusColor(room.status)} h-12 rounded-lg flex items-center justify-center text-white text-xs font-semibold cursor-pointer hover:opacity-90 transition-opacity relative group`}
                                title={`Room ${room.number}: ${room.status}`}
                            >
                                {room.number}
                                {room.status === 'maintenance' && <Wrench size={10} className="absolute top-1 right-1" />}
                                {room.status === 'dirty' && <span className="absolute top-1 right-1 w-1.5 h-1.5 bg-white rounded-full"></span>}
                            </div>
                        ))}
                    </div>
                    <div className="flex gap-4 mt-4 text-xs text-gray-500 justify-end">
                        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded bg-green-500"></span> Clean</span>
                        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded bg-gray-600"></span> Occupied</span>
                        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded bg-orange-500"></span> Dirty</span>
                        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded bg-red-500"></span> Maintenance</span>
                    </div>
                </div>

                {/* Combined Guests & Maintenance Column */}
                <div className="space-y-6">
                    {/* Upcoming Guests */}
                    <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-200">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-gray-800 font-semibold text-sm">Upcoming / VIP Guests</h3>
                            <ChevronRight size={16} className="text-gray-400" />
                        </div>
                        <div className="space-y-3">
                            {guests.slice(0, 2).map((guest) => (
                                <div key={guest.id} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                                    <div className={`w-8 h-8 rounded-full flex items-center justify-center ${guest.type === 'VIP' ? 'bg-purple-100 text-purple-600' : 'bg-blue-100 text-blue-600'}`}>
                                        <User size={14} />
                                    </div>
                                    <div className="flex-1">
                                        <h4 className="text-xs font-semibold text-gray-800">{guest.name}</h4>
                                        <p className="text-[10px] text-gray-500">{guest.type} • {guest.room}</p>
                                    </div>
                                    <span className="text-[10px] font-medium px-2 py-1 bg-white border border-gray-200 rounded text-gray-600">{guest.status}</span>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Maintenance Issues */}
                    <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-200">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-gray-800 font-semibold text-sm">Maintenance Alerts</h3>
                            <span className="text-xs text-red-600 font-medium">3 Pending</span>
                        </div>
                        <div className="space-y-3">
                            {maintenance.slice(0, 2).map((item) => (
                                <div key={item.id} className="flex items-start gap-3 p-3 border border-red-100 bg-red-50/50 rounded-lg">
                                    <div className="p-1.5 bg-white rounded text-red-500 shadow-sm">
                                        <AlertTriangle size={14} />
                                    </div>
                                    <div className="flex-1">
                                        <div className="flex justify-between items-start">
                                            <h4 className="text-xs font-semibold text-gray-800">Room {item.room}</h4>
                                            <span className={`text-[10px] uppercase font-semibold px-1.5 py-0.5 rounded ${item.priority === 'High' ? 'bg-red-100 text-red-600' : 'bg-orange-100 text-orange-600'}`}>{item.priority}</span>
                                        </div>
                                        <p className="text-[11px] text-gray-600 mt-0.5">{item.issue}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

            </div>
        </div>
    );
};

export default Dashboard;
