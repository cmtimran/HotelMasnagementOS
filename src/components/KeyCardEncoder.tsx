import { useState } from 'react';
import { Key, CreditCard, CheckCircle, AlertCircle } from 'lucide-react';

interface KeyCardData {
    roomNumber: string;
    guestName: string;
    checkIn: string;
    checkOut: string;
    accessLevel: string;
}

const KeyCardEncoder = () => {
    const [encoding, setEncoding] = useState(false);
    const [success, setSuccess] = useState(false);
    const [error, setError] = useState('');
    const [cardData, setCardData] = useState<KeyCardData>({
        roomNumber: '',
        guestName: '',
        checkIn: '',
        checkOut: '',
        accessLevel: 'standard'
    });

    const handleEncode = async () => {
        if (!cardData.roomNumber || !cardData.guestName) {
            setError('Please fill in required fields');
            return;
        }

        setEncoding(true);
        setError('');
        setSuccess(false);

        // Mock encoding process
        setTimeout(() => {
            setEncoding(false);
            setSuccess(true);
            console.log('Encoding key card:', cardData);

            // Reset after 3 seconds
            setTimeout(() => {
                setSuccess(false);
                setCardData({
                    roomNumber: '',
                    guestName: '',
                    checkIn: '',
                    checkOut: '',
                    accessLevel: 'standard'
                });
            }, 3000);
        }, 2000);
    };

    return (
        <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center gap-2 mb-4">
                <Key className="text-blue-600" size={24} />
                <h2 className="text-xl font-bold text-gray-900">Key Card Encoder</h2>
            </div>

            {/* Card Data Form */}
            <div className="space-y-4 mb-6">
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                        Room Number *
                    </label>
                    <input
                        type="text"
                        value={cardData.roomNumber}
                        onChange={(e) => setCardData({ ...cardData, roomNumber: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="e.g., 305"
                    />
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                        Guest Name *
                    </label>
                    <input
                        type="text"
                        value={cardData.guestName}
                        onChange={(e) => setCardData({ ...cardData, guestName: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="e.g., John Doe"
                    />
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Check-in Date
                        </label>
                        <input
                            type="date"
                            value={cardData.checkIn}
                            onChange={(e) => setCardData({ ...cardData, checkIn: e.target.value })}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Check-out Date
                        </label>
                        <input
                            type="date"
                            value={cardData.checkOut}
                            onChange={(e) => setCardData({ ...cardData, checkOut: e.target.value })}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                    </div>
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                        Access Level
                    </label>
                    <select
                        value={cardData.accessLevel}
                        onChange={(e) => setCardData({ ...cardData, accessLevel: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                        <option value="standard">Standard (Room Only)</option>
                        <option value="premium">Premium (Room + Pool + Gym)</option>
                        <option value="vip">VIP (All Access)</option>
                        <option value="staff">Staff Access</option>
                    </select>
                </div>
            </div>

            {/* Status Messages */}
            {encoding && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
                    <div className="flex items-center gap-3">
                        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                        <div>
                            <p className="font-medium text-blue-900">Encoding key card...</p>
                            <p className="text-sm text-blue-700">Please insert card into encoder</p>
                        </div>
                    </div>
                </div>
            )}

            {success && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-4">
                    <div className="flex items-center gap-3">
                        <CheckCircle className="text-green-600" size={20} />
                        <div>
                            <p className="font-medium text-green-900">Key card encoded successfully!</p>
                            <p className="text-sm text-green-700">Card is ready for guest</p>
                        </div>
                    </div>
                </div>
            )}

            {error && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
                    <div className="flex items-center gap-3">
                        <AlertCircle className="text-red-600" size={20} />
                        <p className="text-red-800">{error}</p>
                    </div>
                </div>
            )}

            {/* Encode Button */}
            <button
                onClick={handleEncode}
                disabled={encoding}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
            >
                {encoding ? (
                    <>
                        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                        Encoding...
                    </>
                ) : (
                    <>
                        <CreditCard size={20} />
                        Encode Key Card
                    </>
                )}
            </button>

            {/* Info */}
            <div className="mt-6 bg-gray-50 rounded-lg p-4">
                <h4 className="font-medium text-gray-900 mb-2">Supported Systems:</h4>
                <ul className="text-sm text-gray-600 space-y-1">
                    <li>• VingCard</li>
                    <li>• Salto</li>
                    <li>• ASSA ABLOY</li>
                    <li>• Onity</li>
                </ul>
            </div>
        </div>
    );
};

export default KeyCardEncoder;
