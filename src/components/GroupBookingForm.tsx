import { useState } from 'react';
import { Users, Upload, FileText, Plus, X, Check } from 'lucide-react';

interface RoomingListEntry {
    guestName: string;
    roomType: string;
    adults: number;
    children: number;
    specialRequests?: string;
}

const GroupBookingForm = () => {
    const [groupName, setGroupName] = useState('');
    const [contactPerson, setContactPerson] = useState('');
    const [email, setEmail] = useState('');
    const [phone, setPhone] = useState('');
    const [checkIn, setCheckIn] = useState('');
    const [checkOut, setCheckOut] = useState('');
    const [roomingList, setRoomingList] = useState<RoomingListEntry[]>([]);
    const [showUpload, setShowUpload] = useState(false);

    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            // Mock CSV parsing
            const mockData: RoomingListEntry[] = [
                { guestName: 'John Doe', roomType: 'Deluxe King', adults: 2, children: 0 },
                { guestName: 'Jane Smith', roomType: 'Executive Suite', adults: 2, children: 1 },
                { guestName: 'Bob Johnson', roomType: 'Deluxe King', adults: 2, children: 0 },
            ];
            setRoomingList(mockData);
            setShowUpload(false);
        }
    };

    const addManualEntry = () => {
        setRoomingList([...roomingList, {
            guestName: '',
            roomType: 'Deluxe King',
            adults: 2,
            children: 0
        }]);
    };

    const removeEntry = (index: number) => {
        setRoomingList(roomingList.filter((_, i) => i !== index));
    };

    return (
        <div className="p-6 bg-gray-50 min-h-screen">
            <div className="max-w-6xl mx-auto">
                {/* Header */}
                <div className="mb-6">
                    <h1 className="text-2xl font-bold text-gray-900 mb-2">Group Booking</h1>
                    <p className="text-gray-600">Create reservation for 5+ rooms</p>
                </div>

                {/* Group Information */}
                <div className="bg-white rounded-lg shadow p-6 mb-6">
                    <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                        <Users size={20} />
                        Group Information
                    </h2>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Group Name</label>
                            <input
                                type="text"
                                value={groupName}
                                onChange={(e) => setGroupName(e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                placeholder="e.g., ABC Corporation Annual Meeting"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Contact Person</label>
                            <input
                                type="text"
                                value={contactPerson}
                                onChange={(e) => setContactPerson(e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                            <input
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                            <input
                                type="tel"
                                value={phone}
                                onChange={(e) => setPhone(e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Check-in Date</label>
                            <input
                                type="date"
                                value={checkIn}
                                onChange={(e) => setCheckIn(e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Check-out Date</label>
                            <input
                                type="date"
                                value={checkOut}
                                onChange={(e) => setCheckOut(e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                        </div>
                    </div>
                </div>

                {/* Rooming List */}
                <div className="bg-white rounded-lg shadow p-6">
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                            <FileText size={20} />
                            Rooming List ({roomingList.length} rooms)
                        </h2>
                        <div className="flex gap-2">
                            <button
                                onClick={() => setShowUpload(true)}
                                className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                            >
                                <Upload size={18} />
                                Upload Excel/CSV
                            </button>
                            <button
                                onClick={addManualEntry}
                                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                            >
                                <Plus size={18} />
                                Add Manually
                            </button>
                        </div>
                    </div>

                    {/* Upload Modal */}
                    {showUpload && (
                        <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                            <div className="flex items-center justify-between mb-2">
                                <h3 className="font-medium text-blue-900">Upload Rooming List</h3>
                                <button onClick={() => setShowUpload(false)}>
                                    <X size={20} className="text-blue-600" />
                                </button>
                            </div>
                            <p className="text-sm text-blue-700 mb-3">
                                Upload Excel or CSV file with columns: Guest Name, Room Type, Adults, Children, Special Requests
                            </p>
                            <input
                                type="file"
                                accept=".xlsx,.xls,.csv"
                                onChange={handleFileUpload}
                                className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-blue-600 file:text-white hover:file:bg-blue-700"
                            />
                        </div>
                    )}

                    {/* Rooming List Table */}
                    {roomingList.length > 0 ? (
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead className="bg-gray-50">
                                    <tr>
                                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">#</th>
                                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Guest Name</th>
                                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Room Type</th>
                                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Adults</th>
                                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Children</th>
                                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Special Requests</th>
                                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-200">
                                    {roomingList.map((entry, index) => (
                                        <tr key={index}>
                                            <td className="px-4 py-3 text-sm text-gray-900">{index + 1}</td>
                                            <td className="px-4 py-3">
                                                <input
                                                    type="text"
                                                    value={entry.guestName}
                                                    onChange={(e) => {
                                                        const updated = [...roomingList];
                                                        updated[index].guestName = e.target.value;
                                                        setRoomingList(updated);
                                                    }}
                                                    className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                                                />
                                            </td>
                                            <td className="px-4 py-3">
                                                <select
                                                    value={entry.roomType}
                                                    onChange={(e) => {
                                                        const updated = [...roomingList];
                                                        updated[index].roomType = e.target.value;
                                                        setRoomingList(updated);
                                                    }}
                                                    className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                                                >
                                                    <option>Deluxe King</option>
                                                    <option>Executive Suite</option>
                                                    <option>Standard Twin</option>
                                                </select>
                                            </td>
                                            <td className="px-4 py-3">
                                                <input
                                                    type="number"
                                                    value={entry.adults}
                                                    onChange={(e) => {
                                                        const updated = [...roomingList];
                                                        updated[index].adults = parseInt(e.target.value);
                                                        setRoomingList(updated);
                                                    }}
                                                    className="w-16 px-2 py-1 border border-gray-300 rounded text-sm"
                                                />
                                            </td>
                                            <td className="px-4 py-3">
                                                <input
                                                    type="number"
                                                    value={entry.children}
                                                    onChange={(e) => {
                                                        const updated = [...roomingList];
                                                        updated[index].children = parseInt(e.target.value);
                                                        setRoomingList(updated);
                                                    }}
                                                    className="w-16 px-2 py-1 border border-gray-300 rounded text-sm"
                                                />
                                            </td>
                                            <td className="px-4 py-3">
                                                <input
                                                    type="text"
                                                    value={entry.specialRequests || ''}
                                                    onChange={(e) => {
                                                        const updated = [...roomingList];
                                                        updated[index].specialRequests = e.target.value;
                                                        setRoomingList(updated);
                                                    }}
                                                    className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                                                    placeholder="Optional"
                                                />
                                            </td>
                                            <td className="px-4 py-3">
                                                <button
                                                    onClick={() => removeEntry(index)}
                                                    className="text-red-600 hover:text-red-800"
                                                >
                                                    <X size={18} />
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    ) : (
                        <div className="text-center py-12 text-gray-500">
                            <FileText size={48} className="mx-auto mb-3 text-gray-400" />
                            <p>No rooming list entries yet</p>
                            <p className="text-sm">Upload a file or add entries manually</p>
                        </div>
                    )}

                    {/* Action Buttons */}
                    <div className="flex justify-end gap-3 mt-6 pt-6 border-t border-gray-200">
                        <button className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50">
                            Cancel
                        </button>
                        <button className="flex items-center gap-2 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
                            <Check size={18} />
                            Create Group Booking
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default GroupBookingForm;
