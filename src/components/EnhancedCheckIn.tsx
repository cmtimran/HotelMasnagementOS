import { useState } from 'react';
import { UserCheck, CheckCircle } from 'lucide-react';
import IDScanner from './IDScanner';
import KeyCardEncoder from './KeyCardEncoder';

const EnhancedCheckIn = () => {
    const [step, setStep] = useState<'search' | 'scan' | 'details' | 'payment' | 'keycard' | 'complete'>('search');
    const [reservationId, setReservationId] = useState('');
    const [guestData, setGuestData] = useState({
        firstName: '',
        lastName: '',
        email: '',
        phone: '',
        passportNumber: '',
        nationality: ''
    });

    // const handleIDScan = (data: any) => {
    //     setGuestData({
    //         ...guestData,
    //         firstName: data.firstName,
    //         lastName: data.lastName,
    //         passportNumber: data.passportNumber,
    //         nationality: data.nationality
    //     });
    //     setStep('details');
    // };

    const handleCheckIn = () => {
        console.log('Checking in guest:', guestData);
        setStep('keycard');
    };

    const handleKeyCardComplete = () => {
        setStep('complete');
    };

    return (
        <div className="p-6 bg-gray-50 min-h-screen">
            <div className="max-w-4xl mx-auto">
                {/* Header */}
                <div className="mb-6">
                    <h1 className="text-2xl font-bold text-gray-900 mb-2 flex items-center gap-2">
                        <UserCheck size={28} />
                        Enhanced Check-In
                    </h1>
                    <p className="text-gray-600">Complete check-in process with ID scanning and key card encoding</p>
                </div>

                {/* Progress Steps */}
                <div className="bg-white rounded-lg shadow p-6 mb-6">
                    <div className="flex items-center justify-between">
                        {['Search', 'ID Scan', 'Details', 'Payment', 'Key Card', 'Complete'].map((label, index) => {
                            const stepValues = ['search', 'scan', 'details', 'payment', 'keycard', 'complete'];
                            const currentIndex = stepValues.indexOf(step);
                            const isActive = index === currentIndex;
                            const isComplete = index < currentIndex;

                            return (
                                <div key={label} className="flex items-center">
                                    <div className={`flex items-center justify-center w-10 h-10 rounded-full ${isComplete ? 'bg-green-600 text-white' :
                                        isActive ? 'bg-blue-600 text-white' :
                                            'bg-gray-200 text-gray-600'
                                        }`}>
                                        {isComplete ? <CheckCircle size={20} /> : index + 1}
                                    </div>
                                    <span className={`ml-2 text-sm font-medium ${isActive ? 'text-blue-600' : 'text-gray-600'
                                        }`}>
                                        {label}
                                    </span>
                                    {index < 5 && <div className="w-12 h-0.5 bg-gray-300 mx-2" />}
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* Step Content */}
                {step === 'search' && (
                    <div className="bg-white rounded-lg shadow p-6">
                        <h2 className="text-lg font-semibold text-gray-900 mb-4">Find Reservation</h2>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Reservation ID / Guest Name / Phone
                                </label>
                                <input
                                    type="text"
                                    value={reservationId}
                                    onChange={(e) => setReservationId(e.target.value)}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    placeholder="Enter reservation details..."
                                />
                            </div>
                            <button
                                onClick={() => setStep('scan')}
                                className="w-full px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                            >
                                Search & Continue
                            </button>
                        </div>
                    </div>
                )}

                {step === 'scan' && (
                    <div className="space-y-4">
                        <div className="bg-white rounded-lg shadow p-6">
                            <IDScanner />
                            <div className="flex gap-3 mt-4">
                                <button
                                    onClick={() => setStep('details')}
                                    className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                                >
                                    Continue without Scan
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {step === 'details' && (
                    <div className="bg-white rounded-lg shadow p-6">
                        <h2 className="text-lg font-semibold text-gray-900 mb-4">Guest Details</h2>
                        <div className="grid grid-cols-2 gap-4 mb-6">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">First Name</label>
                                <input
                                    type="text"
                                    value={guestData.firstName}
                                    onChange={(e) => setGuestData({ ...guestData, firstName: e.target.value })}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Last Name</label>
                                <input
                                    type="text"
                                    value={guestData.lastName}
                                    onChange={(e) => setGuestData({ ...guestData, lastName: e.target.value })}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                                <input
                                    type="email"
                                    value={guestData.email}
                                    onChange={(e) => setGuestData({ ...guestData, email: e.target.value })}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                                <input
                                    type="tel"
                                    value={guestData.phone}
                                    onChange={(e) => setGuestData({ ...guestData, phone: e.target.value })}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                />
                            </div>
                        </div>
                        <button
                            onClick={handleCheckIn}
                            className="w-full px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                        >
                            Proceed to Key Card
                        </button>
                    </div>
                )}

                {step === 'keycard' && (
                    <div className="bg-white rounded-lg shadow p-6">
                        <KeyCardEncoder />
                        <button
                            onClick={handleKeyCardComplete}
                            className="w-full mt-4 px-4 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700"
                        >
                            Complete Check-In
                        </button>
                    </div>
                )}

                {step === 'complete' && (
                    <div className="bg-white rounded-lg shadow p-6 text-center">
                        <CheckCircle className="mx-auto mb-4 text-green-600" size={64} />
                        <h2 className="text-2xl font-bold text-gray-900 mb-2">Check-In Complete!</h2>
                        <p className="text-gray-600 mb-6">Guest has been successfully checked in</p>
                        <div className="flex gap-3 justify-center">
                            <button
                                onClick={() => window.print()}
                                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                            >
                                Print Registration Card
                            </button>
                            <button
                                onClick={() => setStep('search')}
                                className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                            >
                                New Check-In
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default EnhancedCheckIn;
