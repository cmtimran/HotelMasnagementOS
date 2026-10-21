import React from 'react';
import {
    CalendarCheck, Users, LogOut, LogIn, BedDouble,
    TrendingUp, AlertTriangle, Wrench,
    MoreHorizontal, ChevronRight, User,
    Star, Ban, CreditCard, Banknote, Landmark,
    ArrowUpRight
} from 'lucide-react';
import PageHeader from './common/PageHeader';
import { useNavigation } from '../context/NavigationContext';

const Dashboard: React.FC = () => {
    const { setActivePage } = useNavigation();

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
            case 'clean': return 'bg-emerald-600 text-white';
            case 'dirty': return 'bg-amber-500 text-white';
            case 'occupied': return 'bg-slate-700 text-white';
            case 'maintenance': return 'bg-rose-500 text-white';
            default: return 'bg-slate-200 text-slate-700';
        }
    };

    return (
        <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-5 font-sans">
            {/* Standardized Thesis Page Header */}
            <PageHeader
                title="HMS Executive Overview"
                subtitle="Real-time property operations, guest arrival flows, live occupancy, and revenue pacing"
                icon={<TrendingUp size={22} />}
                badge={
                    <span className="badge-status-active">
                        <span className="size-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                        Live Desk Active
                    </span>
                }
                actions={
                    <>
                        <div className="btn-secondary text-xs">
                            <CalendarCheck size={14} className="text-slate-400" />
                            <span>{new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}</span>
                        </div>
                        <button
                            type="button"
                            onClick={() => setActivePage('front-desk')}
                            className="btn-primary"
                        >
                            <Users size={14} />
                            <span>Front Desk Hub</span>
                        </button>
                    </>
                }
            />

            {/* Row 1: Operations High-Level (Occupancy, Front Desk, KPI, Cancellations) */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* Occupancy Rate - Radial Gauge */}
                <div className="card-container p-4 flex flex-col items-center justify-between">
                    <div className="flex items-center justify-between w-full mb-1">
                        <span className="text-slate-500 text-[11px] font-bold uppercase tracking-wider">Occupancy</span>
                        <span className="badge-status-active">Live</span>
                    </div>
                    <div className="relative size-24 flex items-center justify-center my-2">
                        <svg className="w-full h-full transform -rotate-90">
                            <circle cx="48" cy="48" r="40" stroke="currentColor" strokeWidth="8" fill="transparent" className="text-slate-100" />
                            <circle cx="48" cy="48" r="40" stroke="currentColor" strokeWidth="8" fill="transparent" strokeDasharray={251.32} strokeDashoffset={251.32 * (1 - 0.78)} className="text-primary transition-all duration-500" />
                        </svg>
                        <div className="absolute flex flex-col items-center">
                            <span className="text-xl font-black text-slate-900 leading-none">78%</span>
                            <span className="text-[10px] text-slate-400 font-medium mt-0.5">Capacity</span>
                        </div>
                    </div>
                    <p className="text-[11px] text-slate-500 text-center font-medium">45 of 58 Rooms Active</p>
                </div>

                {/* Front Desk Activity */}
                <div className="card-container p-4 flex flex-col justify-between">
                    <span className="text-slate-500 text-[11px] font-bold uppercase tracking-wider mb-2">Front Desk Activity</span>
                    <div className="grid grid-cols-3 gap-2 flex-1">
                        <div className="flex flex-col items-center justify-center p-2 bg-emerald-50/70 rounded-xl border border-emerald-100">
                            <LogIn size={16} className="text-emerald-600 mb-1" />
                            <span className="text-base font-bold text-slate-900 leading-tight">12</span>
                            <span className="text-[10px] text-slate-500 font-medium uppercase mt-0.5">Arrivals</span>
                        </div>
                        <div className="flex flex-col items-center justify-center p-2 bg-amber-50/70 rounded-xl border border-amber-100">
                            <LogOut size={16} className="text-amber-600 mb-1" />
                            <span className="text-base font-bold text-slate-900 leading-tight">8</span>
                            <span className="text-[10px] text-slate-500 font-medium uppercase mt-0.5">Departs</span>
                        </div>
                        <div className="flex flex-col items-center justify-center p-2 bg-blue-50/70 rounded-xl border border-blue-100">
                            <BedDouble size={16} className="text-primary mb-1" />
                            <span className="text-base font-bold text-slate-900 leading-tight">45</span>
                            <span className="text-[10px] text-slate-500 font-medium uppercase mt-0.5">In-House</span>
                        </div>
                    </div>
                    <p className="text-[11px] text-slate-500 mt-2 text-center font-medium">8 Pending Departures</p>
                </div>

                {/* KPIs (ADR, RevPAR, ALOS) */}
                <div className="grid grid-rows-3 gap-2">
                    <div className="card-container px-3.5 py-2.5 flex items-center justify-between">
                        <div>
                            <p className="text-slate-400 text-[10px] font-bold uppercase tracking-wider">ADR</p>
                            <h4 className="text-xs font-bold text-slate-900 leading-tight">৳ 4,500</h4>
                        </div>
                        <span className="text-[10.5px] text-emerald-600 font-semibold flex items-center bg-emerald-50 px-1.5 py-0.5 rounded-full border border-emerald-100">
                            <TrendingUp size={10} className="mr-0.5" /> +5%
                        </span>
                    </div>
                    <div className="card-container px-3.5 py-2.5 flex items-center justify-between">
                        <div>
                            <p className="text-slate-400 text-[10px] font-bold uppercase tracking-wider">RevPAR</p>
                            <h4 className="text-xs font-bold text-slate-900 leading-tight">৳ 3,150</h4>
                        </div>
                        <span className="text-[10.5px] text-emerald-600 font-semibold flex items-center bg-emerald-50 px-1.5 py-0.5 rounded-full border border-emerald-100">
                            <TrendingUp size={10} className="mr-0.5" /> +8%
                        </span>
                    </div>
                    <div className="card-container px-3.5 py-2.5 flex items-center justify-between">
                        <div>
                            <p className="text-slate-400 text-[10px] font-bold uppercase tracking-wider">ALOS</p>
                            <h4 className="text-xs font-bold text-slate-900 leading-tight">2.4 Days</h4>
                        </div>
                        <span className="text-[10px] text-slate-400 font-medium">Target: 2.5</span>
                    </div>
                </div>

                {/* Cancellation Watch */}
                <div className="card-container p-4 border-rose-200/80 bg-rose-50/20 flex flex-col items-center justify-center relative">
                    <div className="absolute top-3 right-3 p-1.5 bg-rose-100 text-rose-600 rounded-lg">
                        <Ban size={14} />
                    </div>
                    <span className="text-3xl font-black text-slate-900 leading-none">5</span>
                    <span className="text-xs font-semibold text-slate-600 mt-1">Cancellations Today</span>
                    <span className="text-[10.5px] text-rose-700 font-semibold mt-1 flex items-center bg-rose-100 px-2 py-0.5 rounded-full border border-rose-200">
                        <TrendingUp size={10} className="mr-0.5" /> +2 vs Avg
                    </span>
                </div>
            </div>

            {/* Row 2: Financials & Trends */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                {/* Revenue Pace/Trend */}
                <div className="card-container p-4">
                    <div className="flex justify-between items-center mb-2">
                        <h3 className="text-slate-900 font-bold text-xs tracking-tight">Revenue Pace (OTB vs Budget)</h3>
                        <span className="text-[10.5px] text-slate-400 font-medium">This Month</span>
                    </div>
                    <div className="relative h-28 w-full mt-2">
                        <svg viewBox="0 0 100 50" className="w-full h-full overflow-visible" preserveAspectRatio="none">
                            <path d="M0,45 Q25,35 50,30 T100,20" fill="none" stroke="#cbd5e1" strokeWidth="1.5" strokeDasharray="3,3" />
                            <path d="M0,48 Q25,40 50,25 T100,10" fill="none" stroke="#0074d9" strokeWidth="2" />
                            <circle cx="50" cy="25" r="2" fill="white" stroke="#0074d9" strokeWidth="1.5" />
                            <circle cx="100" cy="10" r="2" fill="white" stroke="#0074d9" strokeWidth="1.5" />
                        </svg>
                        <div className="flex justify-between text-[10px] text-slate-400 font-mono mt-1">
                            <span>W1</span><span>W2</span><span>W3</span><span>W4</span>
                        </div>
                        <div className="flex gap-4 justify-center mt-2 text-[11px] text-slate-600 font-medium">
                            <div className="flex items-center gap-1.5"><span className="w-2.5 h-1.5 bg-primary rounded-full"></span> OTB</div>
                            <div className="flex items-center gap-1.5"><span className="w-2.5 h-1.5 bg-slate-300 rounded-full"></span> Budget</div>
                        </div>
                    </div>
                </div>

                {/* Today's Collections */}
                <div className="card-container p-4">
                    <div className="flex justify-between items-center mb-2">
                        <h3 className="text-slate-900 font-bold text-xs tracking-tight">Today's Collections</h3>
                        <span className="font-mono font-bold text-sm text-slate-900">৳ 125,000</span>
                    </div>
                    <div className="space-y-2.5 mt-3">
                        <div>
                            <div className="flex justify-between text-[11px] mb-1">
                                <span className="flex items-center gap-1.5 font-medium text-slate-700">
                                    <Banknote size={13} className="text-emerald-600" /> Cash
                                </span>
                                <span className="font-bold text-slate-900 font-mono">৳ 45k (36%)</span>
                            </div>
                            <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                                <div className="bg-emerald-500 h-1.5 rounded-full w-[36%]"></div>
                            </div>
                        </div>
                        <div>
                            <div className="flex justify-between text-[11px] mb-1">
                                <span className="flex items-center gap-1.5 font-medium text-slate-700">
                                    <CreditCard size={13} className="text-primary" /> Card
                                </span>
                                <span className="font-bold text-slate-900 font-mono">৳ 55k (44%)</span>
                            </div>
                            <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                                <div className="bg-primary h-1.5 rounded-full w-[44%]"></div>
                            </div>
                        </div>
                        <div>
                            <div className="flex justify-between text-[11px] mb-1">
                                <span className="flex items-center gap-1.5 font-medium text-slate-700">
                                    <Landmark size={13} className="text-purple-600" /> City Ledger
                                </span>
                                <span className="font-bold text-slate-900 font-mono">৳ 25k (20%)</span>
                            </div>
                            <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                                <div className="bg-purple-500 h-1.5 rounded-full w-[20%]"></div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Guest Sentiment */}
                <div className="card-container p-4 flex flex-col items-center justify-center">
                    <span className="text-slate-500 text-[11px] font-bold uppercase tracking-wider mb-1 w-full text-left">Guest Rating</span>
                    <div className="text-3xl font-black text-slate-900 leading-none">4.8</div>
                    <div className="flex gap-1 my-2">
                        {[1, 2, 3, 4].map(i => <Star key={i} size={15} className="fill-amber-400 text-amber-400" />)}
                        <Star size={15} className="fill-amber-400 text-amber-400" style={{ clipPath: 'inset(0 20% 0 0)' }} />
                    </div>
                    <p className="text-[11px] text-slate-500">Based on <strong className="text-slate-900 font-semibold">128 verified reviews</strong></p>
                    <div className="mt-2.5 flex gap-2 text-[10.5px]">
                        <span className="px-2 py-0.5 bg-emerald-50 text-emerald-700 rounded-full border border-emerald-200 font-semibold">Clean 5.0</span>
                        <span className="px-2 py-0.5 bg-blue-50 text-blue-700 rounded-full border border-blue-200 font-semibold">Service 4.7</span>
                    </div>
                </div>
            </div>

            {/* Row 3: Forecast, Housekeeping & Channels */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                {/* 14-Day Forecast */}
                <div className="card-container p-4">
                    <div className="flex justify-between items-center mb-2">
                        <h3 className="text-slate-900 font-bold text-xs tracking-tight">14-Day Demand Forecast</h3>
                    </div>
                    <div className="flex items-end justify-between h-20 gap-1 mt-2">
                        {[60, 75, 80, 90, 85, 70, 65, 60, 55, 70, 80, 85, 90, 95].map((h, i) => (
                            <div key={i} className="w-full bg-slate-100 rounded-t relative group">
                                <div className="absolute bottom-0 w-full bg-primary rounded-t transition-all hover:bg-primary-hover" style={{ height: `${h}%` }}></div>
                                <div className="hidden group-hover:block absolute bottom-full left-1/2 transform -translate-x-1/2 mb-1 bg-slate-900 text-white text-[10px] font-mono py-0.5 px-1.5 rounded-md whitespace-nowrap z-10">
                                    {h}%
                                </div>
                            </div>
                        ))}
                    </div>
                    <div className="flex justify-between text-[10px] text-slate-400 font-mono mt-1.5">
                        <span>Today</span>
                        <span>+7d</span>
                        <span>+14d</span>
                    </div>
                </div>

                {/* Housekeeping Status */}
                <div className="card-container p-4 flex flex-col justify-between">
                    <span className="text-slate-500 text-[11px] font-bold uppercase tracking-wider mb-2">Housekeeping Status</span>
                    <div className="flex h-3 w-full rounded-full overflow-hidden mb-2">
                        <div className="bg-emerald-500 w-[60%]" title="Clean: 60%"></div>
                        <div className="bg-amber-500 w-[25%]" title="Dirty: 25%"></div>
                        <div className="bg-blue-400 w-[10%]" title="Inspected: 10%"></div>
                        <div className="bg-rose-500 w-[5%]" title="OOO: 5%"></div>
                    </div>
                    <div className="grid grid-cols-2 gap-y-1.5 text-xs text-slate-600 font-medium">
                        <div className="flex items-center gap-1.5"><div className="size-2 rounded-full bg-emerald-500"></div> Clean (32)</div>
                        <div className="flex items-center gap-1.5"><div className="size-2 rounded-full bg-amber-500"></div> Dirty (14)</div>
                        <div className="flex items-center gap-1.5"><div className="size-2 rounded-full bg-blue-400"></div> Inspected (6)</div>
                        <div className="flex items-center gap-1.5"><div className="size-2 rounded-full bg-rose-500"></div> OOO (3)</div>
                    </div>
                </div>

                {/* Booking Source Distribution */}
                <div className="card-container p-4">
                    <div className="flex justify-between items-center mb-2">
                        <h3 className="text-slate-900 font-bold text-xs tracking-tight">Distribution Channels</h3>
                        <MoreHorizontal size={14} className="text-slate-400 cursor-pointer" />
                    </div>
                    <div className="flex items-center gap-3">
                        <div className="relative size-20 rounded-full shrink-0"
                            style={{ background: 'conic-gradient(#0074d9 0% 45%, #9333ea 45% 70%, #16a34a 70% 90%, #ea580c 90% 100%)' }}>
                            <div className="absolute inset-4 bg-white rounded-full"></div>
                        </div>
                        <div className="space-y-1.5 flex-1 text-xs">
                            <div className="flex justify-between"><span className="flex items-center gap-1.5"><span className="size-2 bg-primary rounded-full"></span> OTA</span> <span className="font-bold text-slate-800 font-mono">45%</span></div>
                            <div className="flex justify-between"><span className="flex items-center gap-1.5"><span className="size-2 bg-purple-600 rounded-full"></span> Walk-in</span> <span className="font-bold text-slate-800 font-mono">25%</span></div>
                            <div className="flex justify-between"><span className="flex items-center gap-1.5"><span className="size-2 bg-emerald-600 rounded-full"></span> Corporate</span> <span className="font-bold text-slate-800 font-mono">20%</span></div>
                            <div className="flex justify-between"><span className="flex items-center gap-1.5"><span className="size-2 bg-orange-600 rounded-full"></span> Direct</span> <span className="font-bold text-slate-800 font-mono">10%</span></div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Row 4: Room Status Grid & Upcoming Arrivals */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                {/* Room Status Grid */}
                <div className="lg:col-span-2 card-container p-4">
                    <div className="flex justify-between items-center mb-3">
                        <div>
                            <h3 className="text-slate-900 font-bold text-xs tracking-tight">Real-Time Room Status Matrix</h3>
                            <p className="text-[11px] text-slate-500">Live occupancy state per room inventory</p>
                        </div>
                        <button
                            type="button"
                            onClick={() => setActivePage('room-rack')}
                            className="text-xs text-primary hover:text-primary-hover font-semibold inline-flex items-center gap-1 cursor-pointer"
                        >
                            <span>Open Room Rack</span>
                            <ArrowUpRight size={13} />
                        </button>
                    </div>
                    <div className="grid grid-cols-8 gap-1.5">
                        {roomStatus.map((room) => (
                            <div key={room.number}
                                className={`${getStatusColor(room.status)} h-8 rounded-lg flex items-center justify-center text-[11px] font-bold cursor-pointer hover:opacity-90 transition-opacity relative shadow-2xs`}
                                title={`Room ${room.number}: ${room.status}`}
                            >
                                {room.number}
                                {room.status === 'maintenance' && <Wrench size={9} className="absolute top-1 right-1" />}
                                {room.status === 'dirty' && <span className="absolute top-1 right-1 size-1.5 bg-white rounded-full"></span>}
                            </div>
                        ))}
                    </div>
                    <div className="flex gap-4 mt-3 text-[11px] text-slate-500 justify-end font-medium">
                        <span className="flex items-center gap-1.5"><span className="size-2 rounded-full bg-emerald-600"></span> Clean</span>
                        <span className="flex items-center gap-1.5"><span className="size-2 rounded-full bg-slate-700"></span> Occupied</span>
                        <span className="flex items-center gap-1.5"><span className="size-2 rounded-full bg-amber-500"></span> Dirty</span>
                        <span className="flex items-center gap-1.5"><span className="size-2 rounded-full bg-rose-500"></span> Maintenance</span>
                    </div>
                </div>

                {/* Upcoming Arrivals & Maintenance Alerts */}
                <div className="card-container p-4 space-y-3">
                    <div className="flex justify-between items-center border-b border-slate-100 pb-2">
                        <h3 className="text-slate-900 font-bold text-xs tracking-tight">VIP Arrivals & Alerts</h3>
                        <ChevronRight size={14} className="text-slate-400" />
                    </div>
                    <div className="space-y-2">
                        {guests.slice(0, 2).map((guest) => (
                            <div key={guest.id} className="flex items-center gap-2.5 p-2 bg-slate-50/80 rounded-xl border border-slate-100">
                                <div className={`size-7 rounded-lg flex items-center justify-center text-xs shrink-0 ${guest.type === 'VIP' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-primary'}`}>
                                    <User size={13} />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <h4 className="text-xs font-bold text-slate-900 truncate">{guest.name}</h4>
                                    <p className="text-[10px] text-slate-400 font-medium">Room {guest.room} • {guest.type}</p>
                                </div>
                                <span className="text-[10px] font-semibold px-2 py-0.5 bg-white border border-slate-200 rounded-full text-slate-600 shadow-2xs">{guest.status}</span>
                            </div>
                        ))}

                        {maintenance.slice(0, 1).map((item) => (
                            <div key={item.id} className="flex items-center gap-2.5 p-2 bg-rose-50/60 rounded-xl border border-rose-100 text-rose-700">
                                <AlertTriangle size={14} className="text-rose-500 shrink-0" />
                                <div className="flex-1 min-w-0">
                                    <p className="text-xs font-bold truncate">Room {item.room}: {item.issue}</p>
                                </div>
                                <span className="text-[9px] font-bold uppercase bg-rose-200/70 text-rose-800 px-1.5 py-0.5 rounded-full">{item.priority}</span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Dashboard;
