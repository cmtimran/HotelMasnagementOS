import React, { useRef, useState, useEffect } from 'react';
import { X, Check, Printer, RotateCcw, PenTool, ShieldCheck } from 'lucide-react';
import { getCurrencySymbol } from '../../utils/currencyUtils';

interface DigitalRegCardModalProps {
    isOpen: boolean;
    onClose: () => void;
    booking: any;
    onSuccess?: () => void;
}

export const DigitalRegCardModal: React.FC<DigitalRegCardModalProps> = ({
    isOpen,
    onClose,
    booking,
    onSuccess
}) => {
    const currency = getCurrencySymbol();
    const canvasRef = useRef<HTMLCanvasElement | null>(null);
    const [isDrawing, setIsDrawing] = useState(false);
    const [hasSigned, setHasSigned] = useState(false);
    const [termsAccepted, setTermsAccepted] = useState(true);
    const [isSaving, setIsSaving] = useState(false);

    // Initialize or load signature if already signed
    useEffect(() => {
        if (isOpen && booking?.signatureData) {
            setHasSigned(true);
            setTimeout(() => {
                const canvas = canvasRef.current;
                if (!canvas) return;
                const ctx = canvas.getContext('2d');
                if (!ctx) return;
                const img = new Image();
                img.onload = () => {
                    ctx.drawImage(img, 0, 0);
                };
                img.src = booking.signatureData;
            }, 100);
        } else if (isOpen) {
            setHasSigned(false);
            setTimeout(() => {
                const canvas = canvasRef.current;
                if (!canvas) return;
                const ctx = canvas.getContext('2d');
                if (!ctx) return;
                ctx.clearRect(0, 0, canvas.width, canvas.height);
                ctx.strokeStyle = '#0e3592';
                ctx.lineWidth = 2.5;
                ctx.lineCap = 'round';
                ctx.lineJoin = 'round';
            }, 50);
        }
    }, [isOpen, booking]);

    if (!isOpen || !booking) return null;

    const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        setIsDrawing(true);
        const rect = canvas.getBoundingClientRect();
        const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
        const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
        const x = clientX - rect.left;
        const y = clientY - rect.top;

        ctx.beginPath();
        ctx.moveTo(x, y);
    };

    const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
        if (!isDrawing) return;
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const rect = canvas.getBoundingClientRect();
        const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
        const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
        const x = clientX - rect.left;
        const y = clientY - rect.top;

        ctx.lineTo(x, y);
        ctx.stroke();
        setHasSigned(true);
    };

    const stopDrawing = () => {
        setIsDrawing(false);
    };

    const clearSignature = () => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        setHasSigned(false);
    };

    const handleSave = async () => {
        if (!termsAccepted) {
            alert('Please accept the hotel stay terms & conditions.');
            return;
        }

        setIsSaving(true);
        try {
            const canvas = canvasRef.current;
            const signatureUrl = canvas ? canvas.toDataURL('image/png') : '';

            // Update in local storage
            booking.registrationCardSigned = true;
            booking.registrationCardSignedAt = new Date().toISOString();
            booking.signatureData = signatureUrl;

            if (onSuccess) onSuccess();
            onClose();
        } catch {
            onClose();
        } finally {
            setIsSaving(false);
        }
    };

    const handlePrint = () => {
        window.print();
    };

    const arrival = booking.arrivalDate || booking.checkIn || '2026-07-02';
    const departure = booking.departureDate || booking.checkOut || '2026-07-04';
    const regNo = booking.registrationNumber || `REG-${(booking.reservationNumber || '842365').replace(/^RES-/, '')}`;
    const folioNo = booking.folioNumber || `FOL-${(booking.reservationNumber || '842365').replace(/^RES-/, '')}`;

    return (
        <div className="fixed inset-0 z-[100050] flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
            <div className="relative w-full max-w-3xl max-h-[92vh] bg-white rounded-2xl shadow-2xl flex flex-col overflow-hidden text-gray-800 border border-gray-200">
                {/* 1. Header Bar */}
                <div className="px-6 py-3.5 bg-gradient-to-r from-[#0e3592] to-[#1e40af] text-white flex items-center justify-between shrink-0 shadow-sm">
                    <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center border border-white/20">
                            <PenTool size={16} className="text-amber-300" />
                        </div>
                        <div>
                            <h2 className="text-sm font-bold tracking-tight">Guest Digital Registration Card (e-Reg Card)</h2>
                            <p className="text-[10px] text-blue-200">Official Hotel Guest Registration & Terms Acceptance</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <button
                            type="button"
                            onClick={handlePrint}
                            className="px-2.5 py-1 text-xs bg-white/10 hover:bg-white/20 rounded-md transition-colors flex items-center gap-1.5 font-medium cursor-pointer"
                            title="Print Registration Card"
                        >
                            <Printer size={13} />
                            <span>Print</span>
                        </button>
                        <button
                            type="button"
                            onClick={onClose}
                            className="p-1 hover:bg-white/20 rounded-lg transition-colors cursor-pointer"
                        >
                            <X size={16} />
                        </button>
                    </div>
                </div>

                {/* 2. Scrollable Registration Card Document */}
                <div className="p-6 overflow-y-auto space-y-5 text-xs">
                    {/* Hotel Info & Document Identification Banner */}
                    <div className="flex items-start justify-between border-b border-gray-200 pb-3">
                        <div>
                            <h3 className="text-base font-black tracking-tight text-gray-900">HOTEL HAVENS & SUITES</h3>
                            <p className="text-[11px] text-gray-500">Plot 14, Diplomatic Zone, Baridhara, Dhaka 1212</p>
                            <p className="text-[10px] text-gray-400">Tel: +880 2 988-5544 | Email: frontdesk@hotelhavens.com</p>
                        </div>
                        <div className="text-right space-y-0.5 font-mono text-[11px]">
                            <div className="text-gray-500 font-sans text-[10px] uppercase font-bold tracking-wider">Registration Card</div>
                            <div className="font-bold text-blue-700">{regNo}</div>
                            <div className="text-gray-500 text-[10px]">Res: {booking.reservationNumber}</div>
                            <div className="text-gray-500 text-[10px]">Folio: {folioNo}</div>
                        </div>
                    </div>

                    {/* Guest Information Grid */}
                    <div className="bg-gray-50/70 border border-gray-200 rounded-xl p-3.5 space-y-2.5">
                        <div className="text-[11px] font-bold text-gray-700 uppercase tracking-wider flex items-center gap-1.5 border-b border-gray-200/70 pb-1">
                            <span>1. Guest Profile Information</span>
                            {booking.vip && booking.vip !== 'None' && (
                                <span className="ml-auto text-[9px] bg-amber-100 text-amber-800 font-bold px-1.5 py-0.2 rounded border border-amber-300">
                                    VIP {booking.vip}
                                </span>
                            )}
                        </div>
                        <div className="grid grid-cols-3 gap-3">
                            <div>
                                <span className="text-[10px] text-gray-400 block">Full Name</span>
                                <span className="font-bold text-gray-800 block">{booking.salutation || 'Mr.'} {booking.guestName}</span>
                            </div>
                            <div>
                                <span className="text-[10px] text-gray-400 block">Phone Number</span>
                                <span className="font-semibold text-gray-700 block">{booking.phone || '+880 1711-000000'}</span>
                            </div>
                            <div>
                                <span className="text-[10px] text-gray-400 block">Email Address</span>
                                <span className="font-semibold text-gray-700 block truncate">{booking.email || 'guest@example.com'}</span>
                            </div>
                            <div>
                                <span className="text-[10px] text-gray-400 block">Nationality</span>
                                <span className="font-semibold text-gray-700 block">{booking.nationality || 'Bangladeshi'}</span>
                            </div>
                            <div>
                                <span className="text-[10px] text-gray-400 block">ID / Passport Type</span>
                                <span className="font-semibold text-gray-700 block">{booking.idType || 'National ID (NID)'}</span>
                            </div>
                            <div>
                                <span className="text-[10px] text-gray-400 block">ID / Document Number</span>
                                <span className="font-mono font-semibold text-gray-700 block">{booking.idNumber || 'NID-9482710492'}</span>
                            </div>
                        </div>
                    </div>

                    {/* Stay & Room Details Grid */}
                    <div className="bg-blue-50/40 border border-blue-100 rounded-xl p-3.5 space-y-2.5">
                        <div className="text-[11px] font-bold text-blue-900 uppercase tracking-wider border-b border-blue-200/60 pb-1">
                            2. Stay & Tariff Details
                        </div>
                        <div className="grid grid-cols-4 gap-3 font-mono text-[11px]">
                            <div>
                                <span className="text-[10px] text-gray-500 font-sans block">Assigned Room</span>
                                <span className="font-bold text-blue-700 text-sm block">#{booking.roomNumber}</span>
                            </div>
                            <div>
                                <span className="text-[10px] text-gray-500 font-sans block">Room Type</span>
                                <span className="font-semibold text-gray-800 font-sans text-xs block">{booking.roomType}</span>
                            </div>
                            <div>
                                <span className="text-[10px] text-gray-500 font-sans block">Arrival Date</span>
                                <span className="font-semibold text-gray-700 block">{arrival}</span>
                            </div>
                            <div>
                                <span className="text-[10px] text-gray-500 font-sans block">Departure Date</span>
                                <span className="font-semibold text-gray-700 block">{departure}</span>
                            </div>
                            <div>
                                <span className="text-[10px] text-gray-500 font-sans block">Nights</span>
                                <span className="font-bold text-gray-800 block">{booking.nights || 1} Night(s)</span>
                            </div>
                            <div>
                                <span className="text-[10px] text-gray-500 font-sans block">Occupants</span>
                                <span className="font-semibold text-gray-700 font-sans block">{booking.adults || 1} Adult(s), {booking.children || 0} Child</span>
                            </div>
                            <div>
                                <span className="text-[10px] text-gray-500 font-sans block">Rate Plan</span>
                                <span className="font-bold text-amber-700 font-sans block">{booking.ratePlan || 'BAR'}</span>
                            </div>
                            <div>
                                <span className="text-[10px] text-gray-500 font-sans block">Daily Rate</span>
                                <span className="font-bold text-emerald-700 block">{currency} {Number(booking.rateAmount || booking.totalAmount || 0).toFixed(2)}</span>
                            </div>
                        </div>
                    </div>

                    {/* Terms & Policies */}
                    <div className="space-y-1.5 bg-gray-50 p-3 rounded-lg border border-gray-200 text-[10.5px] text-gray-600 leading-relaxed">
                        <div className="font-bold text-gray-800 uppercase text-[10px] flex items-center gap-1">
                            <ShieldCheck size={12} className="text-emerald-600" />
                            <span>Hotel Havens Policy & Guest Declaration</span>
                        </div>
                        <ul className="list-disc pl-4 space-y-0.5">
                            <li>Check-in time is 02:00 PM; Check-out time is 11:00 AM sharp. Late checkout is subject to availability and extra charges.</li>
                            <li>The management is not responsible for valuables left in guest rooms unless deposited in the hotel main safe.</li>
                            <li>Smoking is strictly prohibited inside non-smoking guest rooms. A cleaning fee of {currency} 2,500 will be charged for violations.</li>
                            <li>I agree that I am solely responsible for all room charges, taxes, and incidentals incurred during my stay.</li>
                        </ul>
                        <label className="flex items-center gap-2 pt-1 font-semibold text-gray-800 cursor-pointer select-none">
                            <input
                                type="checkbox"
                                checked={termsAccepted}
                                onChange={e => setTermsAccepted(e.target.checked)}
                                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 w-3.5 h-3.5 cursor-pointer"
                            />
                            <span>I have read, understood, and accept all hotel terms, conditions, and payment liability.</span>
                        </label>
                    </div>

                    {/* HTML5 Canvas Signature Pad */}
                    <div className="space-y-1.5">
                        <div className="flex items-center justify-between">
                            <span className="text-[11px] font-bold text-gray-700 uppercase tracking-wider flex items-center gap-1">
                                <PenTool size={12} className="text-blue-600" />
                                <span>Guest Digital Signature (Sign Below with Mouse / Finger / Stylus)</span>
                            </span>
                            <button
                                type="button"
                                onClick={clearSignature}
                                className="text-[10px] text-rose-600 hover:text-rose-800 flex items-center gap-1 cursor-pointer font-semibold"
                            >
                                <RotateCcw size={11} />
                                <span>Clear Signature</span>
                            </button>
                        </div>
                        <div className="border-2 border-dashed border-gray-300 rounded-xl bg-white overflow-hidden relative shadow-inner">
                            <canvas
                                ref={canvasRef}
                                width={680}
                                height={130}
                                onMouseDown={startDrawing}
                                onMouseMove={draw}
                                onMouseUp={stopDrawing}
                                onMouseLeave={stopDrawing}
                                onTouchStart={startDrawing}
                                onTouchMove={draw}
                                onTouchEnd={stopDrawing}
                                className="w-full h-[120px] cursor-crosshair touch-none"
                            />
                            {!hasSigned && (
                                <div className="absolute inset-0 flex items-center justify-center pointer-events-none text-gray-300 text-xs italic select-none">
                                    ✍️ Please sign here inside the box...
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* 3. Footer Action Bar */}
                <div className="px-6 py-3 bg-gray-50 border-t border-gray-200 flex items-center justify-between shrink-0">
                    <div className="flex items-center gap-2">
                        {booking.registrationCardSigned ? (
                            <span className="bg-emerald-100 text-emerald-800 border border-emerald-300 px-2.5 py-1 rounded-md text-[11px] font-bold flex items-center gap-1">
                                <Check size={12} />
                                <span>Signed & Archived on {new Date(booking.registrationCardSignedAt || Date.now()).toLocaleDateString()}</span>
                            </span>
                        ) : (
                            <span className="text-[11px] text-gray-500 italic">Pending guest digital signature</span>
                        )}
                    </div>
                    <div className="flex items-center gap-2.5">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-4 py-1.5 text-xs text-gray-700 hover:bg-gray-200/80 rounded-lg font-semibold transition-colors cursor-pointer"
                        >
                            Close
                        </button>
                        <button
                            type="button"
                            disabled={!hasSigned || !termsAccepted || isSaving}
                            onClick={handleSave}
                            className="px-5 py-1.5 text-xs bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg shadow-sm transition-colors cursor-pointer flex items-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            <Check size={13} />
                            <span>{isSaving ? 'Archiving...' : 'Confirm & Archive Reg Card'}</span>
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};
