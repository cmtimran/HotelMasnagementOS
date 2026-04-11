import { useState } from 'react';
import { X } from 'lucide-react';

interface RoomSelection {
    id: number;
    roomType: string;
    quantity: number;
    rateType: string;
    roomNumber: string;
    assigned: boolean;
    adult: number;
    child: number;
    rate: number;
}

const QuickReservation = () => {
    const [checkIn, setCheckIn] = useState('2025-04-05');
    const [checkInTime, setCheckInTime] = useState('11:30');
    const [checkOut, setCheckOut] = useState('2025-04-07');
    const [checkOutTime, setCheckOutTime] = useState('11:35');
    const [paymentMethod, setPaymentMethod] = useState('');
    const [businessSource, setBusinessSource] = useState('');

    const [rooms, setRooms] = useState<RoomSelection[]>([
        {
            id: 1,
            roomType: 'Extreme Deluxe',
            quantity: 2,
            rateType: 'Deluxe Plan',
            roomNumber: '105, Bat. Deluxe',
            assigned: true,
            adult: 2,
            child: 1,
            rate: 450
        },
        {
            id: 2,
            roomType: 'Super Deluxe',
            quantity: 3,
            rateType: 'Super Room',
            roomNumber: '205, Sup. Deluxe',
            assigned: true,
            adult: 6,
            child: 6,
            rate: 450
        }
    ]);

    const [guestTitle, setGuestTitle] = useState('Mr.');
    const [guestName, setGuestName] = useState('Aniya Nusrat');
    const [guestMobile, setGuestMobile] = useState('');
    const [guestEmail, setGuestEmail] = useState('nusrat@gmail.com');
    const [guestCompany, setGuestCompany] = useState('Company-001');

    const calculateNights = () => {
        const start = new Date(checkIn);
        const end = new Date(checkOut);
        const diff = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
        return diff > 0 ? diff : 0;
    };

    const nights = calculateNights();

    const calculateTotal = () => {
        return rooms.reduce((sum, room) => sum + (room.rate * room.quantity * nights), 0);
    };

    const totalAmount = calculateTotal();

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
            rate: 0
        }]);
    };

    return (
        <div className="h-screen bg-gray-50 flex flex-col">
            {/* Top Header - Blue */}
            <div className="bg-blue-600 px-6 py-3 flex items-center justify-between">
                <h1 className="text-white text-lg font-semibold">Quick Reservation</h1>
                <button className="text-white hover:bg-blue-700 p-1 rounded">
                    <X size={20} />
                </button>
            </div>

            {/* Main Content */}
            <div className="flex-1 overflow-auto p-6">
                <div className="bg-white rounded shadow-sm">
                    {/* Date Section */}
                    <div className="grid grid-cols-5 gap-4 p-4 border-b">
                        <div>
                            <label className="block text-xs font-medium text-gray-700 mb-1">Check-in</label>
                            <div className="flex gap-1">
                                <input
                                    type="date"
                                    value={checkIn}
                                    onChange={(e) => setCheckIn(e.target.value)}
                                    className="flex-1 px-2 py-1.5 text-sm border border-gray-300 rounded focus:outline-none focus:border-blue-500"
                                />
                                <input
                                    type="time"
                                    value={checkInTime}
                                    onChange={(e) => setCheckInTime(e.target.value)}
                                    className="w-20 px-2 py-1.5 text-sm border border-gray-300 rounded focus:outline-none focus:border-blue-500"
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-xs font-medium text-gray-700 mb-1">Nights</label>
                            <input
                                type="number"
                                value={nights}
                                readOnly
                                className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded bg-gray-50 font-semibold"
                            />
                        </div>

                        <div>
                            <label className="block text-xs font-medium text-gray-700 mb-1">Check-out</label>
                            <div className="flex gap-1">
                                <input
                                    type="date"
                                    value={checkOut}
                                    onChange={(e) => setCheckOut(e.target.value)}
                                    className="flex-1 px-2 py-1.5 text-sm border border-gray-300 rounded focus:outline-none focus:border-blue-500"
                                />
                                <input
                                    type="time"
                                    value={checkOutTime}
                                    onChange={(e) => setCheckOutTime(e.target.value)}
                                    className="w-20 px-2 py-1.5 text-sm border border-gray-300 rounded focus:outline-none focus:border-blue-500"
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-xs font-medium text-gray-700 mb-1">Payment Method</label>
                            <select
                                value={paymentMethod}
                                onChange={(e) => setPaymentMethod(e.target.value)}
                                className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:outline-none focus:border-blue-500"
                            >
                                <option value="">Please select</option>
                                <option value="cash">Cash</option>
                                <option value="card">Credit Card</option>
                            </select>
                        </div>

                        <div>
                            <label className="block text-xs font-medium text-gray-700 mb-1">Business Source</label>
                            <select
                                value={businessSource}
                                onChange={(e) => setBusinessSource(e.target.value)}
                                className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:outline-none focus:border-blue-500"
                            >
                                <option value="">Please select</option>
                                <option value="direct">Direct</option>
                                <option value="ota">OTA</option>
                            </select>
                        </div>
                    </div>

                    {/* Room Selection Table */}
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead className="bg-gray-50 border-b">
                                <tr>
                                    <th className="px-3 py-2 text-left text-xs font-semibold text-gray-700">Room Type</th>
                                    <th className="px-3 py-2 text-left text-xs font-semibold text-gray-700">No. of Rooms</th>
                                    <th className="px-3 py-2 text-left text-xs font-semibold text-gray-700">Rate Type/Plan</th>
                                    <th className="px-3 py-2 text-left text-xs font-semibold text-gray-700">Room No.</th>
                                    <th className="px-3 py-2 text-center text-xs font-semibold text-gray-700">Assign</th>
                                    <th className="px-3 py-2 text-center text-xs font-semibold text-gray-700">Adult</th>
                                    <th className="px-3 py-2 text-center text-xs font-semibold text-gray-700">Child</th>
                                    <th className="px-3 py-2 text-right text-xs font-semibold text-gray-700">Rate (฿) [Tax Inc.]</th>
                                    <th className="px-3 py-2 text-center text-xs font-semibold text-gray-700"></th>
                                </tr>
                            </thead>
                            <tbody className="divide-y">
                                {rooms.map((room) => (
                                    <tr key={room.id} className="hover:bg-gray-50">
                                        <td className="px-3 py-2">
                                            <select
                                                value={room.roomType}
                                                onChange={(e) => updateRoom(room.id, 'roomType', e.target.value)}
                                                className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:border-blue-500"
                                            >
                                                <option value="">Select</option>
                                                <option value="Extreme Deluxe">Extreme Deluxe</option>
                                                <option value="Super Deluxe">Super Deluxe</option>
                                            </select>
                                        </td>
                                        <td className="px-3 py-2">
                                            <input
                                                type="number"
                                                value={room.quantity}
                                                onChange={(e) => updateRoom(room.id, 'quantity', Number(e.target.value))}
                                                className="w-16 px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:border-blue-500"
                                                min="1"
                                            />
                                        </td>
                                        <td className="px-3 py-2">
                                            <select
                                                value={room.rateType}
                                                onChange={(e) => updateRoom(room.id, 'rateType', e.target.value)}
                                                className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:border-blue-500"
                                            >
                                                <option value="">Select</option>
                                                <option value="Deluxe Plan">Deluxe Plan</option>
                                                <option value="Super Room">Super Room</option>
                                            </select>
                                        </td>
                                        <td className="px-3 py-2">
                                            <input
                                                type="text"
                                                value={room.roomNumber}
                                                onChange={(e) => updateRoom(room.id, 'roomNumber', e.target.value)}
                                                className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:border-blue-500"
                                            />
                                        </td>
                                        <td className="px-3 py-2 text-center">
                                            <input
                                                type="checkbox"
                                                checked={room.assigned}
                                                onChange={(e) => updateRoom(room.id, 'assigned', e.target.checked)}
                                                className="w-4 h-4"
                                            />
                                        </td>
                                        <td className="px-3 py-2">
                                            <input
                                                type="number"
                                                value={room.adult}
                                                onChange={(e) => updateRoom(room.id, 'adult', Number(e.target.value))}
                                                className="w-14 px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:border-blue-500 text-center"
                                                min="0"
                                            />
                                        </td>
                                        <td className="px-3 py-2">
                                            <input
                                                type="number"
                                                value={room.child}
                                                onChange={(e) => updateRoom(room.id, 'child', Number(e.target.value))}
                                                className="w-14 px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:border-blue-500 text-center"
                                                min="0"
                                            />
                                        </td>
                                        <td className="px-3 py-2 text-right">
                                            <input
                                                type="number"
                                                value={room.rate}
                                                onChange={(e) => updateRoom(room.id, 'rate', Number(e.target.value))}
                                                className="w-20 px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:border-blue-500 text-right"
                                                min="0"
                                            />
                                        </td>
                                        <td className="px-3 py-2 text-center">
                                            <button
                                                onClick={() => removeRoom(room.id)}
                                                className="text-red-600 hover:text-red-800"
                                            >
                                                <X size={16} />
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    {/* Add Room Button */}
                    <div className="px-4 py-2 border-t">
                        <button
                            onClick={addRoom}
                            className="text-sm text-blue-600 hover:text-blue-800 font-medium"
                        >
                            + Add Room
                        </button>
                    </div>

                    {/* Total Amount */}
                    <div className="px-4 py-3 border-t bg-gray-50 flex justify-end">
                        <div className="text-right">
                            <span className="text-sm text-gray-600 mr-4">Total Amount:</span>
                            <span className="text-lg font-bold text-gray-900">฿{totalAmount}</span>
                        </div>
                    </div>

                    {/* Guest Details */}
                    <div className="p-4 border-t">
                        <div className="grid grid-cols-5 gap-4">
                            <div>
                                <label className="block text-xs font-medium text-gray-700 mb-1">Title</label>
                                <select
                                    value={guestTitle}
                                    onChange={(e) => setGuestTitle(e.target.value)}
                                    className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:outline-none focus:border-blue-500"
                                >
                                    <option>Mr.</option>
                                    <option>Mrs.</option>
                                    <option>Ms.</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-gray-700 mb-1">Name*</label>
                                <input
                                    type="text"
                                    value={guestName}
                                    onChange={(e) => setGuestName(e.target.value)}
                                    className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:outline-none focus:border-blue-500"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-gray-700 mb-1">Mobile No.*</label>
                                <input
                                    type="text"
                                    value={guestMobile}
                                    onChange={(e) => setGuestMobile(e.target.value)}
                                    placeholder="Regular Guest"
                                    className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:outline-none focus:border-blue-500"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-gray-700 mb-1">Email</label>
                                <input
                                    type="email"
                                    value={guestEmail}
                                    onChange={(e) => setGuestEmail(e.target.value)}
                                    className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:outline-none focus:border-blue-500"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-gray-700 mb-1">Company Name</label>
                                <input
                                    type="text"
                                    value={guestCompany}
                                    onChange={(e) => setGuestCompany(e.target.value)}
                                    className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:outline-none focus:border-blue-500"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="px-4 py-3 border-t bg-gray-50 flex items-center justify-end gap-2">
                        <button className="px-4 py-2 text-sm border border-blue-600 text-blue-600 rounded hover:bg-blue-50">
                            Add Payment
                        </button>
                        <button className="px-4 py-2 text-sm border border-purple-600 text-purple-600 rounded hover:bg-purple-50">
                            Hold Till
                        </button>
                        <button className="px-4 py-2 text-sm border border-orange-600 text-orange-600 rounded hover:bg-orange-50">
                            Temporary Reserve
                        </button>
                        <button className="px-4 py-2 text-sm bg-green-600 text-white rounded hover:bg-green-700">
                            Reserve
                        </button>
                        <button className="px-4 py-2 text-sm bg-blue-600 text-white rounded hover:bg-blue-700">
                            Check In
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default QuickReservation;
