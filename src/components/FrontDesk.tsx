import { Calendar } from 'lucide-react';

const FrontDesk = () => {
    return (
        <div className="p-6">
            <h1 className="text-2xl font-bold text-gray-800 mb-6">Front Desk Operations</h1>
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 flex flex-col items-center justify-center min-h-[400px]">
                <div className="bg-blue-50 p-4 rounded-full mb-4">
                    <Calendar size={48} className="text-blue-600" />
                </div>
                <h2 className="text-xl font-bold text-gray-900 mb-2">Room Rack & Booking Management</h2>
                <p className="text-gray-500 text-center max-w-md">
                    This module will allow front desk staff to manage room assignments, check-ins, check-outs, and view the live room rack status.
                </p>
                <button className="mt-6 px-6 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors">
                    Initialize Front Desk
                </button>
            </div>
        </div>
    );
};

export default FrontDesk;
