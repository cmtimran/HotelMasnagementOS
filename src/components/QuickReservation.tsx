import { useState } from 'react';
import { 
    X, Plus, Tag, CheckCircle2, 
    Coffee, ShieldCheck, Trash2
} from 'lucide-react';

interface RoomSelection {
    id: number;
    roomType: string;
    quantity: number;
    rateType: string; 
    packageId?: number; 
    roomNumber: string;
    assigned: boolean;
    adult: number;
    child: number;
    infant: number;
    rate: number;
}

interface AddOn {
    id: number;
    name: string;
    price: number;
    category: string;
}

const QuickReservation = () => {
    const [checkIn, setCheckIn] = useState('2025-04-05');
    const [checkInTime, setCheckInTime] = useState('11:30');
    const [checkOut, setCheckOut] = useState('2025-04-07');
    const [checkOutTime, setCheckOutTime] = useState('11:35');
    const [businessSource, setBusinessSource] = useState('');

    const [rooms, setRooms] = useState<RoomSelection[]>([
        {
            id: 1,
            roomType: 'Extreme Deluxe',
            quantity: 1,
            rateType: 'Winter Bundle',
            roomNumber: '105',
            assigned: true,
            adult: 2,
            child: 1,
            infant: 0,
            rate: 15500
        }
    ]);

    const [selectedAddOns] = useState<AddOn[]>([
        { id: 1, name: 'Extra Bed', price: 1500, category: 'Room' }
    ]);

    const [guestTitle, setGuestTitle] = useState('Mr.');
    const [guestName, setGuestName] = useState('Aniya Nusrat');
    const [guestMobile, setGuestMobile] = useState('');
    const [guestEmail, setGuestEmail] = useState('nusrat@gmail.com');
    const [guestCompany, setGuestCompany] = useState('NEXUS-IT');

    const calculateNights = () => {
        const start = new Date(checkIn);
        const end = new Date(checkOut);
        const diff = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
        return diff > 0 ? diff : 1;
    };

    const nights = calculateNights();

    const roomTotal = rooms.reduce((sum, room) => sum + (room.rate * room.quantity * nights), 0);
    const addOnTotal = selectedAddOns.reduce((sum, ad) => sum + ad.price, 0);
    const grandTotal = roomTotal + addOnTotal;

    const updateRoom = (id: number, field: keyof RoomSelection, value: any) => {
        setRooms(rooms.map(r => r.id === id ? { ...r, [field]: value } : r));
    };

    const removeRoom = (id: number) => {
        setRooms(rooms.filter(r => r.id !== id));
    };

    const addRoom = () => {
        setRooms([...rooms, {
            id: Date.now(),
            roomType: '',
            quantity: 1,
            rateType: '',
            roomNumber: '',
            assigned: false,
            adult: 1,
            child: 0,
            infant: 0,
            rate: 6500
        }]);
    };

    return (
        <div className="h-screen bg-gray-50 flex flex-col font-sans">
            {/* Premium Header */}
            <div className="bg-gray-900 px-8 py-5 flex items-center justify-between shadow-lg">
                <div className="flex items-center gap-4">
                    <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-blue-500/20">
                        <CheckCircle2 size={24} />
                    </div>
                    <div>
                        <h1 className="text-xl font-black text-white tracking-tight">Express Guest Onboarding</h1>
                        <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest leading-none mt-1">NICE HMS Integrated Package Engine</p>
                    </div>
                </div>
                <div className="flex items-center gap-8">
                    <div className="text-right">
                        <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Est. Settlement</p>
                        <p className="text-2xl font-black text-blue-400">৳ {grandTotal.toLocaleString()}</p>
                    </div>
                    <button className="text-gray-400 hover:text-white transition-colors bg-gray-800 p-2 rounded-xl">
                        <X size={24} />
                    </button>
                </div>
            </div>

            {/* Main Content Layout */}
            <div className="flex-1 overflow-hidden flex flex-col md:flex-row gap-6 p-6">
                {/* Left Side: Stay & Inventory */}
                <div className="flex-1 overflow-auto space-y-6">
                    {/* Stay Config */}
                    <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100 grid grid-cols-4 gap-6">
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Check-In Arrival</label>
                            <div className="flex border border-gray-100 rounded-xl overflow-hidden shadow-sm">
                                <input type="date" value={checkIn} onChange={e => setCheckIn(e.target.value)} className="flex-1 px-3 py-3 text-sm font-bold bg-white" />
                                <input type="time" value={checkInTime} onChange={e => setCheckInTime(e.target.value)} className="w-24 px-3 py-3 text-sm font-bold bg-gray-50 border-l border-gray-100" />
                            </div>
                        </div>
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Nights</label>
                            <div className="px-5 py-3 bg-blue-50 rounded-xl text-blue-600 font-black text-sm text-center border border-blue-100 shadow-sm">{nights} Nights Stay</div>
                        </div>
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Check-Out Departure</label>
                            <div className="flex border border-gray-100 rounded-xl overflow-hidden shadow-sm">
                                <input type="date" value={checkOut} onChange={e => setCheckOut(e.target.value)} className="flex-1 px-3 py-3 text-sm font-bold bg-white" />
                                <input type="time" value={checkOutTime} onChange={e => setCheckOutTime(e.target.value)} className="w-24 px-3 py-3 text-sm font-bold bg-gray-50 border-l border-gray-100" />
                            </div>
                        </div>
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Revenue Source</label>
                            <select value={businessSource} onChange={e => setBusinessSource(e.target.value)} className="w-full px-5 py-3 bg-white border border-gray-100 rounded-xl text-sm font-bold shadow-sm">
                                <option value="direct">Direct Guest</option>
                                <option value="ota">OTA / Booking.com</option>
                                <option value="corporate">Corporate Contract</option>
                            </select>
                        </div>
                    </div>

                    {/* Room & Package Selection */}
                    <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
                        <table className="w-full text-left">
                            <thead className="bg-gray-50 border-b border-gray-100">
                                <tr>
                                    <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Room Config</th>
                                    <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Pax</th>
                                    <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Package / Rate</th>
                                    <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest text-right">Nightly Rate</th>
                                    <th className="px-6 py-4"></th>
                                </tr>
                            </thead>
                            <tbody>
                                {rooms.map(room => (
                                    <tr key={room.id} className="border-b border-gray-50 group hover:bg-gray-50/50 transition-all">
                                        <td className="px-6 py-4">
                                            <div className="space-y-1">
                                                <select value={room.roomType} onChange={e => updateRoom(room.id, 'roomType', e.target.value)} className="w-full text-sm font-black text-gray-900 bg-transparent border-0 p-0 focus:ring-0">
                                                    <option>Extreme Deluxe</option>
                                                    <option>Executive Suite</option>
                                                    <option>Super Room</option>
                                                </select>
                                                <div className="flex items-center gap-2">
                                                    <span className="text-[10px] font-bold text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded uppercase">Room {room.roomNumber}</span>
                                                    <span className="text-[10px] font-bold text-gray-400">Assigned</span>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-2">
                                                <div className="flex flex-col items-center">
                                                    <span className="text-[10px] text-gray-400 font-bold uppercase">A</span>
                                                    <span className="text-xs font-black">{room.adult}</span>
                                                </div>
                                                <div className="w-[1px] h-4 bg-gray-200 mx-1" />
                                                <div className="flex flex-col items-center text-pink-500">
                                                    <span className="text-[10px] text-gray-400 font-bold uppercase">C</span>
                                                    <span className="text-xs font-black">{room.child}</span>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="space-y-1">
                                                <select value={room.rateType} onChange={e => updateRoom(room.id, 'rateType', e.target.value)} className="text-sm font-black text-blue-600 bg-transparent border-0 p-0 focus:ring-0">
                                                    <option value="Winter Bundle">Ultimate Honeymoon Package</option>
                                                    <option value="BAR">Best Available Rate</option>
                                                </select>
                                                <div className="flex gap-1">
                                                    <Tag size={10} className="text-emerald-500 mt-0.5" />
                                                    <span className="text-[9px] font-bold text-emerald-600 uppercase tracking-tighter">Meals + Pool + Transport Included</span>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <p className="text-sm font-black text-gray-900">৳ {room.rate.toLocaleString()}</p>
                                            <p className="text-[9px] text-gray-400 font-bold uppercase tracking-widest mt-0.5">Tax Inclusve</p>
                                        </td>
                                        <td className="px-6 py-4 text-right opacity-0 group-hover:opacity-100 transition-opacity">
                                            <button onClick={() => removeRoom(room.id)} className="p-2 text-gray-300 hover:text-red-500">
                                                <X size={16} />
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                        <button onClick={addRoom} className="w-full py-4 text-xs font-black text-gray-400 uppercase tracking-[0.2em] hover:bg-gray-50 hover:text-blue-600 transition-all border-t border-gray-50">
                            + Add New Room Strategy
                        </button>
                    </div>

                    {/* Dynamic Add-Ons Section */}
                    <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100 space-y-4">
                        <div className="flex justify-between items-center">
                            <h3 className="text-sm font-black text-gray-900 uppercase tracking-widest flex items-center gap-2">
                                <Coffee size={16} className="text-rose-500" />
                                Incremental Services (Add-ons)
                            </h3>
                            <span className="text-[10px] font-black text-gray-400 bg-gray-50 px-2 py-1 rounded-md uppercase tracking-widest">Layer 1 Master Service Integration</span>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            {selectedAddOns.map((ad, idx) => (
                                <div key={idx} className="flex items-center justify-between p-4 rounded-2xl border border-gray-100 bg-gray-50 group hover:border-blue-200 transition-all">
                                    <div className="flex items-center gap-4">
                                        <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center border border-gray-100 shadow-sm text-gray-400">
                                            <Plus size={16} />
                                        </div>
                                        <div>
                                            <p className="text-xs font-black text-gray-900">{ad.name}</p>
                                            <p className="text-[10px] text-gray-400 font-bold uppercase">{ad.category}</p>
                                        </div>
                                    </div>
                                    <div className="text-right flex items-center gap-4">
                                        <p className="text-sm font-black text-gray-900">৳ {ad.price}</p>
                                        <button className="text-gray-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <Trash2 size={14} />
                                        </button>
                                    </div>
                                </div>
                            ))}
                            <button className="flex items-center justify-center p-4 rounded-2xl border-2 border-dashed border-gray-200 text-gray-400 hover:border-blue-400 hover:text-blue-600 transition-all">
                                <Plus size={20} className="mb-0.5" />
                                <span className="ml-2 text-xs font-black uppercase tracking-widest">Browse Master Services</span>
                            </button>
                        </div>
                    </div>
                </div>

                {/* Right Side: Guest Info & Summary Container */}
                <div className="w-96 flex flex-col gap-6">
                    {/* Guest Profile Mini */}
                    <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100 space-y-6">
                        <h3 className="text-sm font-black text-gray-900 uppercase tracking-widest">Primary Guest Identity</h3>
                        <div className="space-y-4">
                            <div className="flex gap-2">
                                <select value={guestTitle} onChange={e => setGuestTitle(e.target.value)} className="w-20 px-4 py-3 bg-gray-50 border-0 rounded-xl text-sm font-black focus:ring-2 focus:ring-blue-500">
                                    <option>Mr.</option>
                                    <option>Mrs.</option>
                                    <option>Ms.</option>
                                </select>
                                <input type="text" value={guestName} onChange={e => setGuestName(e.target.value)} placeholder="Full Name *" className="flex-1 px-4 py-3 bg-gray-50 border-0 rounded-xl text-sm font-black focus:ring-2 focus:ring-blue-500" />
                            </div>
                            <input 
                                type="text" 
                                value={guestMobile} 
                                onChange={e => setGuestMobile(e.target.value)} 
                                placeholder="Mobile Communication *" 
                                className="w-full px-4 py-3 bg-gray-50 border-0 rounded-xl text-sm font-black focus:ring-2 focus:ring-blue-500" 
                            />
                            <input type="email" value={guestEmail} onChange={e => setGuestEmail(e.target.value)} placeholder="Email Address" className="w-full px-4 py-3 bg-gray-50 border-0 rounded-xl text-sm font-black focus:ring-2 focus:ring-blue-500" />
                            <input type="text" value={guestCompany} onChange={e => setGuestCompany(e.target.value)} placeholder="Corporate/Agent (NEXUS-IT)" className="w-full px-4 py-3 bg-emerald-50 border-0 rounded-xl text-sm font-black text-emerald-900 focus:ring-2 focus:ring-emerald-500 placeholder-emerald-300" />
                        </div>
                    </div>

                    {/* Price Summary Breakdown */}
                    <div className="bg-gray-900 rounded-3xl p-8 text-white shadow-xl shadow-gray-900/40 relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-blue-600/10 -mr-16 -mt-16 rounded-full blur-3xl" />
                        
                        <h3 className="text-xs font-black text-gray-500 uppercase tracking-[0.2em] mb-6">Reservation Summary</h3>
                        
                        <div className="space-y-4 mb-8">
                            <div className="flex justify-between items-center bg-white/5 p-3 rounded-xl border border-white/5">
                                <span className="text-xs font-bold text-gray-400">Total Room Nights ({nights})</span>
                                <span className="text-sm font-black tracking-tight">৳ {roomTotal.toLocaleString()}</span>
                            </div>
                            <div className="flex justify-between items-center bg-white/5 p-3 rounded-xl border border-white/5">
                                <span className="text-xs font-bold text-gray-400">Selected Add-ons</span>
                                <span className="text-sm font-black tracking-tight">৳ {addOnTotal.toLocaleString()}</span>
                            </div>
                            <div className="flex justify-between items-center bg-emerald-500/10 p-3 rounded-xl border border-emerald-500/20">
                                <div className="flex items-center gap-2">
                                    <ShieldCheck size={14} className="text-emerald-500" />
                                    <span className="text-xs font-bold text-emerald-400">Package Savings Applied</span>
                                </div>
                                <span className="text-xs font-black text-emerald-500">- ৳ 2,400</span>
                            </div>
                        </div>

                        <div className="border-t border-white/10 pt-6">
                            <div className="flex justify-between items-end">
                                <div>
                                    <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1">Grand Estimated Total</p>
                                    <p className="text-4xl font-black text-white tracking-tighter">৳ {grandTotal.toLocaleString()}</p>
                                </div>
                                <div className="bg-blue-600 px-3 py-1.5 rounded-lg text-[10px] font-black uppercase text-white shadow-lg shadow-blue-600/40">
                                    Confirmed
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Final Action Buttons */}
                    <div className="grid grid-cols-2 gap-4">
                        <button className="py-4 bg-white border border-gray-200 text-gray-900 font-bold rounded-2xl hover:bg-gray-50 transition-all text-xs uppercase tracking-widest shadow-sm">
                            Temporary Hold
                        </button>
                        <button className="py-4 bg-blue-600 text-white font-bold rounded-2xl hover:bg-blue-700 transition-all text-xs uppercase tracking-widest shadow-lg shadow-blue-600/20">
                            Check-In Now
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default QuickReservation;
