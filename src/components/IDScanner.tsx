import { useState } from 'react';
import { Scan, Upload, CheckCircle, AlertCircle } from 'lucide-react';

interface IDScanResult {
    firstName: string;
    lastName: string;
    passportNumber: string;
    nationality: string;
    dateOfBirth: string;
    expiryDate: string;
    gender: string;
}

const IDScanner = () => {
    const [scanning, setScanning] = useState(false);
    const [scanResult, setScanResult] = useState<IDScanResult | null>(null);
    const [error, setError] = useState('');

    const handleScan = async () => {
        setScanning(true);
        setError('');

        // Mock scanning process
        setTimeout(() => {
            // Simulate OCR result
            const mockResult: IDScanResult = {
                firstName: 'John',
                lastName: 'Doe',
                passportNumber: 'P12345678',
                nationality: 'United States',
                dateOfBirth: '1990-01-15',
                expiryDate: '2030-01-15',
                gender: 'Male'
            };
            setScanResult(mockResult);
            setScanning(false);
        }, 2000);
    };

    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            // Mock OCR processing
            handleScan();
        }
    };

    const applyToForm = () => {
        if (scanResult) {
            // In production: Fill guest profile form with scanned data
            console.log('Applying scanned data to form:', scanResult);
            alert('Guest data applied to form!');
        }
    };

    return (
        <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center gap-2 mb-4">
                <Scan className="text-blue-600" size={24} />
                <h2 className="text-xl font-bold text-gray-900">ID Scanner</h2>
            </div>

            {/* Scan Options */}
            <div className="space-y-4 mb-6">
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                        Scan Method
                    </label>
                    <div className="grid grid-cols-2 gap-3">
                        <button
                            onClick={handleScan}
                            disabled={scanning}
                            className="flex items-center justify-center gap-2 px-4 py-3 border-2 border-blue-600 text-blue-600 rounded-lg hover:bg-blue-50 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            <Scan size={20} />
                            {scanning ? 'Scanning...' : 'Scan with Device'}
                        </button>
                        <label className="flex items-center justify-center gap-2 px-4 py-3 border-2 border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 cursor-pointer">
                            <Upload size={20} />
                            Upload Image
                            <input
                                type="file"
                                accept="image/*"
                                onChange={handleFileUpload}
                                className="hidden"
                            />
                        </label>
                    </div>
                </div>
            </div>

            {/* Scanning Progress */}
            {scanning && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
                    <div className="flex items-center gap-3">
                        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                        <div>
                            <p className="font-medium text-blue-900">Scanning document...</p>
                            <p className="text-sm text-blue-700">Please wait while we process the ID</p>
                        </div>
                    </div>
                </div>
            )}

            {/* Error */}
            {error && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
                    <div className="flex items-center gap-3">
                        <AlertCircle className="text-red-600" size={20} />
                        <p className="text-red-800">{error}</p>
                    </div>
                </div>
            )}

            {/* Scan Result */}
            {scanResult && !scanning && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-6 mb-6">
                    <div className="flex items-center gap-2 mb-4">
                        <CheckCircle className="text-green-600" size={20} />
                        <h3 className="font-semibold text-green-900">Scan Successful</h3>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <p className="text-sm text-gray-600">First Name</p>
                            <p className="font-medium text-gray-900">{scanResult.firstName}</p>
                        </div>
                        <div>
                            <p className="text-sm text-gray-600">Last Name</p>
                            <p className="font-medium text-gray-900">{scanResult.lastName}</p>
                        </div>
                        <div>
                            <p className="text-sm text-gray-600">Passport Number</p>
                            <p className="font-medium text-gray-900">{scanResult.passportNumber}</p>
                        </div>
                        <div>
                            <p className="text-sm text-gray-600">Nationality</p>
                            <p className="font-medium text-gray-900">{scanResult.nationality}</p>
                        </div>
                        <div>
                            <p className="text-sm text-gray-600">Date of Birth</p>
                            <p className="font-medium text-gray-900">{scanResult.dateOfBirth}</p>
                        </div>
                        <div>
                            <p className="text-sm text-gray-600">Gender</p>
                            <p className="font-medium text-gray-900">{scanResult.gender}</p>
                        </div>
                    </div>
                    <button
                        onClick={applyToForm}
                        className="mt-4 w-full px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                    >
                        Apply to Guest Form
                    </button>
                </div>
            )}

            {/* Instructions */}
            <div className="bg-gray-50 rounded-lg p-4">
                <h4 className="font-medium text-gray-900 mb-2">Instructions:</h4>
                <ul className="text-sm text-gray-600 space-y-1">
                    <li>• Place ID document on scanner or upload image</li>
                    <li>• System will automatically extract information</li>
                    <li>• Review extracted data before applying</li>
                    <li>• Supported: Passport, National ID, Driving License</li>
                </ul>
            </div>
        </div>
    );
};

export default IDScanner;
