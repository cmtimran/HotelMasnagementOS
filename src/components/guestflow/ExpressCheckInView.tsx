import React, { useState, useEffect, useRef } from 'react';
import { getApiBaseUrl } from '../../utils/apiUrl';
import {
    CheckCircle2,
    Upload,
    QrCode,
    Sparkles,
    AlertCircle,
    ShieldCheck,
    RotateCcw,
    Check
} from 'lucide-react';

interface ReservationDetails {
    id: number;
    reservation_number: string;
    check_in_date: string;
    check_out_date: string;
    total_amount: number;
    balance_due: number;
    is_pre_checked_in: boolean;
    kyc_verified: boolean;
    pre_checkin_eta?: string;
    first_name: string;
    last_name: string;
    email?: string;
    phone?: string;
    room_number?: string;
    room_type_name?: string;
    property_name: string;
    property_address?: string;
}

export const ExpressCheckInView: React.FC = () => {
    const [token, setToken] = useState<string>('');
    const [loading, setLoading] = useState<boolean>(true);
    const [submitting, setSubmitting] = useState<boolean>(false);
    const [reservation, setReservation] = useState<ReservationDetails | null>(null);
    const [error, setError] = useState<string | null>(null);

    // Form State
    const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
    const [eta, setEta] = useState<string>('2:00 PM (Standard)');
    const [documentType, setDocumentType] = useState<string>('NID');
    const [documentNumber, setDocumentNumber] = useState<string>('');
    const [frontFile, setFrontFile] = useState<string>('');
    const [backFile, setBackFile] = useState<string>('');
    const [termsAccepted, setTermsAccepted] = useState<boolean>(false);

    // Fast-pass confirmation data
    const [fastPassCode, setFastPassCode] = useState<string>('');

    // Canvas Signature Pad
    const canvasRef = useRef<HTMLCanvasElement | null>(null);
    const isDrawing = useRef<boolean>(false);
    const [hasSignature, setHasSignature] = useState<boolean>(false);

    // 1. Parse token from URL query string on mount
    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        const t = params.get('token') || '';
        setToken(t);

        if (!t) {
            setError('Pre-check-in security token is missing. Please open the link sent to your WhatsApp or SMS.');
            setLoading(false);
            return;
        }

        // Fetch reservation details
        fetch(`${getApiBaseUrl()}/api/cx/express-checkin-details?token=${encodeURIComponent(t)}`)
            .then(res => res.json())
            .then(data => {
                if (data.success && data.data) {
                    setReservation(data.data);
                    if (data.data.is_pre_checked_in) {
                        setFastPassCode(`FP-${data.data.id}-${data.data.reservation_number?.slice(-4) || '2026'}`);
                        setStep(4); // Already pre-checked in
                    }
                } else {
                    setError(data.error || 'Invalid or expired pre-check-in link.');
                }
            })
            .catch(err => {
                console.error(err);
                setError('Failed to connect to hotel reservation server.');
            })
            .finally(() => setLoading(false));
    }, []);

    // Signature Canvas Handlers
    const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        isDrawing.current = true;
        const rect = canvas.getBoundingClientRect();
        const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
        const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;

        ctx.beginPath();
        ctx.moveTo(clientX - rect.left, clientY - rect.top);
    };

    const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
        if (!isDrawing.current) return;
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const rect = canvas.getBoundingClientRect();
        const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
        const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;

        ctx.lineWidth = 2.5;
        ctx.lineCap = 'round';
        ctx.strokeStyle = '#0f172a';
        ctx.lineTo(clientX - rect.left, clientY - rect.top);
        ctx.stroke();
        setHasSignature(true);
    };

    const stopDrawing = () => {
        isDrawing.current = false;
    };

    const clearSignature = () => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        setHasSignature(false);
    };

    // File Mock Handler
    const handleFilePick = (setter: (val: string) => void) => (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            setter(file.name);
        }
    };

    // Submit KYC to API
    const handleSubmit = async () => {
        if (!termsAccepted) {
            alert('Please accept the guest registration terms to proceed.');
            return;
        }

        const signatureData = canvasRef.current?.toDataURL() || '';
        setSubmitting(true);

        try {
            const res = await fetch(`${getApiBaseUrl()}/api/cx/express-checkin/submit`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    token,
                    eta,
                    documentType,
                    documentNumber,
                    frontUrl: frontFile,
                    backUrl: backFile,
                    signatureData
                })
            });

            const data = await res.json();
            if (data.success) {
                setFastPassCode(data.data?.fastPassCode || `FP-${reservation?.id}-${Date.now().toString().slice(-4)}`);
                setStep(4);
            } else {
                alert(data.error || 'Failed to submit pre-check-in');
            }
        } catch (err: any) {
            console.error('Pre-checkin submission failed:', err);
            alert('Network error submitting pre-check-in.');
        } finally {
            setSubmitting(false);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-slate-900 text-white flex flex-col items-center justify-center p-4">
                <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center animate-spin mb-4">
                    <Sparkles className="w-6 h-6" />
                </div>
                <p className="text-sm font-semibold tracking-wide">Securing Fast-Pass Session...</p>
            </div>
        );
    }

    if (error || !reservation) {
        return (
            <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
                <div className="bg-white max-w-md w-full p-6 rounded-3xl border border-slate-200 shadow-xl text-center space-y-4">
                    <div className="w-14 h-14 mx-auto rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center">
                        <AlertCircle className="w-7 h-7" />
                    </div>
                    <h2 className="text-lg font-bold text-slate-900">Pre-Check-In Link Notice</h2>
                    <p className="text-xs text-slate-600 leading-relaxed">{error}</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-100 flex flex-col items-center justify-center p-3 md:p-6 font-sans">
            <div className="bg-white w-full max-w-lg rounded-3xl border border-slate-200/80 shadow-2xl overflow-hidden flex flex-col">
                {/* Header */}
                <div className="bg-gradient-to-r from-slate-900 to-slate-800 text-white p-6 relative">
                    <div className="flex items-center space-x-2 text-emerald-400 text-xs font-semibold uppercase tracking-wider mb-1">
                        <ShieldCheck className="w-4 h-4" />
                        <span>15-Second Fast-Pass</span>
                    </div>
                    <h1 className="text-xl font-bold tracking-tight">{reservation.property_name}</h1>
                    <p className="text-xs text-slate-300 mt-0.5">Express Digital Pre-Arrival Verification</p>

                    {/* Stepper Progress */}
                    {step < 4 && (
                        <div className="flex items-center justify-between mt-5 pt-4 border-t border-slate-700/60 text-xs">
                            {[
                                { s: 1, label: 'Arrival' },
                                { s: 2, label: 'KYC Identity' },
                                { s: 3, label: 'Sign & Confirm' }
                            ].map((item) => (
                                <div key={item.s} className="flex items-center space-x-1.5">
                                    <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${
                                        step >= item.s ? 'bg-emerald-500 text-slate-900' : 'bg-slate-700 text-slate-400'
                                    }`}>
                                        {step > item.s ? <Check className="w-3 h-3" /> : item.s}
                                    </span>
                                    <span className={`text-[11px] font-medium ${step >= item.s ? 'text-white' : 'text-slate-400'}`}>
                                        {item.label}
                                    </span>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Body Content */}
                <div className="p-6 flex-1 space-y-6">
                    {/* Booking Card Summary */}
                    <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200 space-y-2 text-xs">
                        <div className="flex justify-between items-center">
                            <span className="text-slate-500 font-medium">Guest Name:</span>
                            <span className="font-bold text-slate-900">{reservation.first_name} {reservation.last_name}</span>
                        </div>
                        <div className="flex justify-between items-center">
                            <span className="text-slate-500 font-medium">Reservation:</span>
                            <span className="font-mono font-bold text-emerald-700">#{reservation.reservation_number}</span>
                        </div>
                        <div className="flex justify-between items-center">
                            <span className="text-slate-500 font-medium">Dates:</span>
                            <span className="text-slate-800">{reservation.check_in_date} → {reservation.check_out_date}</span>
                        </div>
                        {reservation.room_type_name && (
                            <div className="flex justify-between items-center">
                                <span className="text-slate-500 font-medium">Category:</span>
                                <span className="font-semibold text-slate-900">{reservation.room_type_name}</span>
                            </div>
                        )}
                    </div>

                    {/* STEP 1: Arrival Time (ETA) */}
                    {step === 1 && (
                        <div className="space-y-4">
                            <div>
                                <h3 className="font-bold text-slate-900 text-sm">When do you expect to arrive?</h3>
                                <p className="text-xs text-slate-500 mt-0.5">
                                    Helps our Housekeeping and Front Desk prepare your keycard in advance.
                                </p>
                            </div>

                            <div className="grid grid-cols-1 gap-2 text-xs">
                                {[
                                    '10:30 AM (Early Arrival - Luggage Storage)',
                                    '12:00 PM (Prioritize Inspection)',
                                    '2:00 PM (Standard Check-in Time)',
                                    '5:00 PM (Evening Arrival)',
                                    'After 8:00 PM (Late Night Arrival)'
                                ].map((t) => (
                                    <button
                                        key={t}
                                        type="button"
                                        onClick={() => setEta(t)}
                                        className={`p-3 rounded-xl border text-left font-medium transition-all ${
                                            eta === t
                                                ? 'border-emerald-600 bg-emerald-50/70 text-emerald-900 font-bold'
                                                : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                                        }`}
                                    >
                                        {t}
                                    </button>
                                ))}
                            </div>

                            <button
                                onClick={() => setStep(2)}
                                className="w-full py-3 bg-slate-900 text-white rounded-xl text-xs font-bold hover:bg-slate-800 transition-colors shadow-sm"
                            >
                                Continue to KYC Identity
                            </button>
                        </div>
                    )}

                    {/* STEP 2: Digital Identity (KYC) */}
                    {step === 2 && (
                        <div className="space-y-4">
                            <div>
                                <h3 className="font-bold text-slate-900 text-sm">Identity Verification (KYC)</h3>
                                <p className="text-xs text-slate-500 mt-0.5">
                                    Complies with Tourist Police & Hotel Regulatory requirements.
                                </p>
                            </div>

                            <div className="space-y-3 text-xs">
                                <div>
                                    <label className="font-semibold text-slate-700 block mb-1">Document Type</label>
                                    <div className="grid grid-cols-3 gap-2">
                                        {['NID', 'Passport', 'Driving License'].map((type) => (
                                            <button
                                                key={type}
                                                type="button"
                                                onClick={() => setDocumentType(type)}
                                                className={`py-2 px-3 rounded-xl border text-center font-semibold text-xs ${
                                                    documentType === type
                                                        ? 'border-emerald-600 bg-emerald-50 text-emerald-800'
                                                        : 'border-slate-200 bg-white text-slate-600'
                                                }`}
                                            >
                                                {type}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                <div>
                                    <label className="font-semibold text-slate-700 block mb-1">ID Number</label>
                                    <input
                                        type="text"
                                        placeholder="Enter NID or Passport Number"
                                        value={documentNumber}
                                        onChange={(e) => setDocumentNumber(e.target.value)}
                                        className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-emerald-500"
                                    />
                                </div>

                                <div>
                                    <label className="font-semibold text-slate-700 block mb-1">Upload Photo / Document (Front)</label>
                                    <label className="flex flex-col items-center justify-center border-2 border-dashed border-slate-200 rounded-xl p-3.5 cursor-pointer hover:bg-slate-50 transition-colors">
                                        <Upload className="w-5 h-5 text-slate-400 mb-1" />
                                        <span className="text-xs text-slate-600 font-medium">
                                            {frontFile || 'Tap to choose front photo'}
                                        </span>
                                        <input type="file" accept="image/*,.pdf" onChange={handleFilePick(setFrontFile)} className="hidden" />
                                    </label>
                                </div>

                                <div>
                                    <label className="font-semibold text-slate-700 block mb-1">Upload Photo / Document (Back - Optional)</label>
                                    <label className="flex flex-col items-center justify-center border-2 border-dashed border-slate-200 rounded-xl p-3.5 cursor-pointer hover:bg-slate-50 transition-colors">
                                        <Upload className="w-5 h-5 text-slate-400 mb-1" />
                                        <span className="text-xs text-slate-600 font-medium">
                                            {backFile || 'Tap to choose back photo'}
                                        </span>
                                        <input type="file" accept="image/*,.pdf" onChange={handleFilePick(setBackFile)} className="hidden" />
                                    </label>
                                </div>
                            </div>

                            <div className="flex items-center space-x-2 pt-2">
                                <button
                                    onClick={() => setStep(1)}
                                    className="w-1/3 py-3 border border-slate-200 text-slate-700 rounded-xl text-xs font-semibold hover:bg-slate-50"
                                >
                                    Back
                                </button>
                                <button
                                    onClick={() => setStep(3)}
                                    className="w-2/3 py-3 bg-slate-900 text-white rounded-xl text-xs font-bold hover:bg-slate-800"
                                >
                                    Proceed to Sign
                                </button>
                            </div>
                        </div>
                    )}

                    {/* STEP 3: Touch Signature & Terms */}
                    {step === 3 && (
                        <div className="space-y-4">
                            <div>
                                <h3 className="font-bold text-slate-900 text-sm">Digital Registration Signature</h3>
                                <p className="text-xs text-slate-500 mt-0.5">
                                    Please draw your signature below using your finger or stylus.
                                </p>
                            </div>

                            <div className="relative border border-slate-300 rounded-2xl overflow-hidden bg-white shadow-inner">
                                <canvas
                                    ref={canvasRef}
                                    width={400}
                                    height={160}
                                    onMouseDown={startDrawing}
                                    onMouseMove={draw}
                                    onMouseUp={stopDrawing}
                                    onMouseLeave={stopDrawing}
                                    onTouchStart={startDrawing}
                                    onTouchMove={draw}
                                    onTouchEnd={stopDrawing}
                                    className="w-full h-40 touch-none cursor-crosshair bg-white"
                                />
                                <button
                                    type="button"
                                    onClick={clearSignature}
                                    className="absolute top-2 right-2 px-2 py-1 text-[11px] font-semibold text-slate-500 bg-slate-100 hover:bg-slate-200 rounded-lg flex items-center space-x-1"
                                >
                                    <RotateCcw className="w-3 h-3" />
                                    <span>Clear</span>
                                </button>
                            </div>

                            <label className="flex items-start space-x-2 text-xs text-slate-600 cursor-pointer pt-1">
                                <input
                                    type="checkbox"
                                    checked={termsAccepted}
                                    onChange={(e) => setTermsAccepted(e.target.checked)}
                                    className="mt-0.5 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                                />
                                <span>
                                    I agree to the hotel guest rules, check-out times, and declare that the identity information provided is accurate.
                                </span>
                            </label>

                            <div className="flex items-center space-x-2 pt-2">
                                <button
                                    onClick={() => setStep(2)}
                                    className="w-1/3 py-3 border border-slate-200 text-slate-700 rounded-xl text-xs font-semibold hover:bg-slate-50"
                                >
                                    Back
                                </button>
                                <button
                                    onClick={handleSubmit}
                                    disabled={submitting || !termsAccepted || !hasSignature}
                                    className="w-2/3 py-3 bg-emerald-600 text-white rounded-xl text-xs font-bold hover:bg-emerald-700 disabled:opacity-50 transition-colors shadow-sm"
                                >
                                    {submitting ? 'Activating Fast-Pass...' : 'Activate Fast-Pass'}
                                </button>
                            </div>
                        </div>
                    )}

                    {/* STEP 4: Success Fast-Pass Card */}
                    {step === 4 && (
                        <div className="text-center space-y-5 py-4">
                            <div className="w-16 h-16 mx-auto rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center">
                                <CheckCircle2 className="w-10 h-10" />
                            </div>

                            <div>
                                <h3 className="text-lg font-bold text-slate-900">Pre-Check-In Complete!</h3>
                                <p className="text-xs text-slate-500 mt-1">
                                    Your 15-second Fast-Pass has been activated and linked to your reservation.
                                </p>
                            </div>

                            {/* Digital Fast-Pass Ticket Card */}
                            <div className="bg-gradient-to-tr from-slate-900 to-slate-800 text-white p-6 rounded-3xl shadow-xl space-y-4 border border-slate-700/80 text-left">
                                <div className="flex justify-between items-center border-b border-slate-700/60 pb-3">
                                    <div>
                                        <span className="text-[10px] text-emerald-400 font-bold uppercase tracking-wider block">Express Pass</span>
                                        <span className="font-bold text-sm">{reservation.first_name} {reservation.last_name}</span>
                                    </div>
                                    <QrCode className="w-9 h-9 text-emerald-400" />
                                </div>

                                <div className="grid grid-cols-2 gap-3 text-xs">
                                    <div>
                                        <span className="text-slate-400 text-[10px] block">Fast-Pass Code:</span>
                                        <span className="font-mono font-bold text-white text-xs">{fastPassCode}</span>
                                    </div>
                                    <div>
                                        <span className="text-slate-400 text-[10px] block">Expected Arrival:</span>
                                        <span className="font-semibold text-emerald-400 text-xs">{eta}</span>
                                    </div>
                                </div>

                                <div className="bg-slate-800/80 p-3 rounded-xl border border-slate-700 text-[11px] text-slate-300">
                                    ⚡ Upon arrival, bypass the regular queue and proceed directly to <strong>Front Desk Counter 1</strong>. Show this screen or mention your Fast-Pass code for instant keycard pickup!
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default ExpressCheckInView;
