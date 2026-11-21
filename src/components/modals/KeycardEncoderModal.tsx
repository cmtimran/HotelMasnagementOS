import React, { useState } from 'react';
import { 
    X, Key, CheckCircle2, AlertTriangle, RefreshCw, 
    Printer, Clock, Lock, CreditCard, Building2
} from 'lucide-react';

export interface KeycardModalProps {
    isOpen: boolean;
    onClose: () => void;
    propertyId: number | string;
    roomNumber: string;
    guestName: string;
    reservationNumber?: string;
    checkInDate?: string;
    checkOutDate?: string;
    onKeycardIssued?: (data: any) => void;
}

export const KeycardEncoderModal: React.FC<KeycardModalProps> = ({
    isOpen,
    onClose,
    propertyId,
    roomNumber,
    guestName,
    reservationNumber,
    checkInDate,
    checkOutDate,
    onKeycardIssued
}) => {
    const [encoderType, setEncoderType] = useState<'RFID_GENERIC' | 'TTLOCK' | 'IP_ENCODER' | 'SALTO'>('IP_ENCODER');
    const [cardCopyCount, setCardCopyCount] = useState<number>(1);
    const [validFrom] = useState<string>(checkInDate || new Date().toISOString().slice(0, 16));
    const [validUntil, setValidUntil] = useState<string>(() => {
        if (checkOutDate) {
            return `${checkOutDate}T12:00`;
        }
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        tomorrow.setHours(12, 0, 0, 0);
        return tomorrow.toISOString().slice(0, 16);
    });

    const [accessZones, setAccessZones] = useState({
        elevator: true,
        mainEntrance: true,
        poolGym: true,
        executiveLounge: false
    });

    const [status, setStatus] = useState<'IDLE' | 'ENCODING' | 'SUCCESS' | 'ERROR'>('IDLE');
    const [issuedKeyData, setIssuedKeyData] = useState<any>(null);
    const [errorMessage, setErrorMessage] = useState<string>('');

    if (!isOpen) return null;

    const handleEncodeKeycard = async () => {
        setStatus('ENCODING');
        setErrorMessage('');

        try {
            const token = localStorage.getItem('auth_token');
            const res = await fetch('/api/keycard/issue', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': token ? `Bearer ${token}` : '',
                    'X-Property-Id': String(propertyId)
                },
                body: JSON.stringify({
                    propertyId: Number(propertyId) || 1,
                    roomNumber: String(roomNumber),
                    guestName: guestName || 'Hotel Guest',
                    reservationNumber: reservationNumber || `RES-${roomNumber}`,
                    validFrom: new Date(validFrom).toISOString(),
                    validUntil: new Date(validUntil).toISOString(),
                    encoderType,
                    cardCopyCount
                })
            });

            const data = await res.json();
            if (data.success) {
                setStatus('SUCCESS');
                setIssuedKeyData(data);
                if (onKeycardIssued) {
                    onKeycardIssued(data);
                }
            } else {
                setStatus('ERROR');
                setErrorMessage(data.error || 'Failed to encode keycard. Check encoder connection.');
            }
        } catch (err: any) {
            setStatus('ERROR');
            setErrorMessage(err.message || 'Network error communicating with keycard hardware service.');
        }
    };

    const handleRevokeKeycard = async () => {
        if (!confirm(`Are you sure you want to deactivate all active keycards for Room ${roomNumber}?`)) return;

        setStatus('ENCODING');
        try {
            const token = localStorage.getItem('auth_token');
            const res = await fetch('/api/keycard/revoke', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': token ? `Bearer ${token}` : '',
                    'X-Property-Id': String(propertyId)
                },
                body: JSON.stringify({
                    propertyId: Number(propertyId) || 1,
                    roomNumber: String(roomNumber)
                })
            });

            const data = await res.json();
            if (data.success) {
                alert(`Keycards for Room ${roomNumber} have been revoked and voided successfully.`);
                setStatus('IDLE');
                setIssuedKeyData(null);
            } else {
                alert(`Revoke failed: ${data.error}`);
                setStatus('IDLE');
            }
        } catch (err: any) {
            alert(`Error: ${err.message}`);
            setStatus('IDLE');
        }
    };

    const handlePrintKeySleeve = () => {
        const printWindow = window.open('', '_blank', 'width=450,height=550');
        if (!printWindow) return;

        printWindow.document.write(`
            <html>
                <head>
                    <title>Keycard Sleeve - Room ${roomNumber}</title>
                    <style>
                        body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; padding: 24px; text-align: center; }
                        .card { border: 2px dashed #0f172a; border-radius: 12px; padding: 24px; max-width: 320px; margin: 0 auto; }
                        .hotel-title { font-size: 16px; font-weight: 800; color: #1e3a8a; text-transform: uppercase; margin-bottom: 4px; }
                        .room-badge { font-size: 42px; font-weight: 900; color: #0f172a; margin: 12px 0; }
                        .label { font-size: 11px; text-transform: uppercase; color: #64748b; font-weight: 600; }
                        .guest-name { font-size: 15px; font-weight: 700; color: #334155; margin-bottom: 12px; }
                        .divider { border-top: 1px solid #e2e8f0; margin: 16px 0; }
                        .info-row { display: flex; justify-content: space-between; font-size: 12px; margin-bottom: 6px; }
                        .wifi-box { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; padding: 8px; margin-top: 12px; font-size: 11px; }
                    </style>
                </head>
                <body>
                    <div class="card">
                        <div class="hotel-title">Grand Palace Hotel & Resort</div>
                        <div class="label">Guest Keycard Welcome Sleeve</div>
                        <div class="room-badge">${roomNumber}</div>
                        <div class="guest-name">${guestName || 'Valued Guest'}</div>
                        <div class="divider"></div>
                        <div class="info-row">
                            <span class="label">Check-Out:</span>
                            <span style="font-weight:700;">${new Date(validUntil).toLocaleDateString()} @ 12:00 PM</span>
                        </div>
                        <div class="info-row">
                            <span class="label">Card UID:</span>
                            <span style="font-family:monospace; font-weight:700;">${issuedKeyData?.cardUid || 'RFID-948271'}</span>
                        </div>
                        ${issuedKeyData?.passcode ? `
                        <div class="info-row" style="color:#0284c7;">
                            <span class="label">Digital PIN:</span>
                            <span style="font-weight:900; font-size:14px;">${issuedKeyData.passcode}</span>
                        </div>
                        ` : ''}
                        <div class="wifi-box">
                            <strong>High-Speed Guest Wi-Fi</strong><br/>
                            SSID: <em>GrandPalace_Guest</em><br/>
                            Password: <em>Welcome2026</em>
                        </div>
                    </div>
                    <script>
                        window.onload = function() { window.print(); window.close(); }
                    </script>
                </body>
            </html>
        `);
        printWindow.document.close();
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-xs animate-in fade-in duration-200">
            <div className="relative w-full max-w-xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh]">
                
                {/* Header */}
                <div className="px-6 py-4 bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 text-white flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-blue-500/20 border border-blue-400/30 flex items-center justify-center text-blue-300">
                            <Key size={22} className="animate-pulse" />
                        </div>
                        <div>
                            <div className="flex items-center gap-2">
                                <h2 className="text-base font-bold text-white tracking-wide">Keycard Encoder & Smart Lock Bridge</h2>
                                <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 flex items-center gap-1">
                                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping"></span>
                                    ONLINE
                                </span>
                            </div>
                            <p className="text-xs text-blue-200/80">Issue physical RFID cards, magnetic stripes, and cloud PIN locks</p>
                        </div>
                    </div>
                    <button 
                        onClick={onClose}
                        className="p-1.5 rounded-lg text-blue-200 hover:text-white hover:bg-white/10 transition-colors"
                    >
                        <X size={18} />
                    </button>
                </div>

                {/* Body Content */}
                <div className="p-6 overflow-y-auto space-y-5 text-slate-700">

                    {/* Room & Guest Context Summary Card */}
                    <div className="bg-gradient-to-br from-slate-50 to-blue-50/50 border border-slate-200/80 rounded-xl p-4 flex items-center justify-between">
                        <div>
                            <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Assigned Room</div>
                            <div className="text-2xl font-black text-slate-800 flex items-center gap-2">
                                Room {roomNumber}
                                <span className="text-xs font-medium px-2 py-0.5 rounded-md bg-blue-100 text-blue-700 border border-blue-200">
                                    Physical Lock Active
                                </span>
                            </div>
                            <div className="text-xs font-medium text-slate-600 mt-0.5">
                                Guest: <span className="font-semibold text-slate-900">{guestName || 'Hotel Guest'}</span>
                            </div>
                        </div>

                        <div className="text-right">
                            <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Reservation Ref</div>
                            <div className="text-sm font-bold text-indigo-700 font-mono">
                                {reservationNumber || `RES-${roomNumber}`}
                            </div>
                            <div className="text-xs text-slate-500 mt-0.5 flex items-center justify-end gap-1">
                                <Clock size={12} className="text-slate-400" />
                                Valid: {new Date(validUntil).toLocaleDateString()}
                            </div>
                        </div>
                    </div>

                    {/* Encoder Hardware Bridge Selector */}
                    <div className="space-y-1.5">
                        <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                            <Building2 size={14} className="text-blue-600" />
                            Lock Protocol & Hardware Encoder
                        </label>
                        <div className="grid grid-cols-2 gap-2.5">
                            {[
                                { id: 'IP_ENCODER', name: 'VingCard / VisionLine TCP', desc: 'Direct Network TCP/IP Encoder' },
                                { id: 'TTLOCK', name: 'TTLock Smart Lock Cloud', desc: 'BLE & Cyclic 6-Digit Passcode' },
                                { id: 'SALTO', name: 'Salto Space / Virtual Net', desc: 'SVN Card Data Exchange' },
                                { id: 'RFID_GENERIC', name: 'Generic USB 13.56MHz RFID', desc: 'Mifare Classic & Ultralight' }
                            ].map(item => (
                                <button
                                    key={item.id}
                                    type="button"
                                    onClick={() => setEncoderType(item.id as any)}
                                    className={`p-2.5 rounded-xl border text-left transition-all ${
                                        encoderType === item.id
                                            ? 'border-blue-600 bg-blue-50/70 text-blue-900 ring-2 ring-blue-500/20'
                                            : 'border-slate-200 hover:border-slate-300 bg-white text-slate-700'
                                    }`}
                                >
                                    <div className="text-xs font-bold">{item.name}</div>
                                    <div className="text-[10px] text-slate-500 mt-0.5">{item.desc}</div>
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Card Configuration & Expiration */}
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="text-xs font-semibold text-slate-600 block mb-1">
                                Keycard Copies
                            </label>
                            <select
                                value={cardCopyCount}
                                onChange={(e) => setCardCopyCount(Number(e.target.value))}
                                className="w-full text-xs font-medium border border-slate-200 rounded-lg p-2 bg-white text-slate-800 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                            >
                                <option value={1}>1 Card (Single Guest)</option>
                                <option value={2}>2 Cards (Double Occupancy)</option>
                                <option value={3}>3 Cards (Family Stay)</option>
                                <option value={4}>4 Cards (Suite Group)</option>
                            </select>
                        </div>

                        <div>
                            <label className="text-xs font-semibold text-slate-600 block mb-1">
                                Check-Out Cutoff Time
                            </label>
                            <input
                                type="datetime-local"
                                value={validUntil}
                                onChange={(e) => setValidUntil(e.target.value)}
                                className="w-full text-xs font-medium border border-slate-200 rounded-lg p-2 bg-white text-slate-800 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                            />
                        </div>
                    </div>

                    {/* Zone Access Permissions (Elevator, Amenities) */}
                    <div>
                        <div className="text-xs font-semibold text-slate-600 mb-2">Zone & Peripheral Access Flags</div>
                        <div className="grid grid-cols-2 gap-2 text-xs">
                            <label className="flex items-center gap-2 p-2 rounded-lg border border-slate-200 hover:bg-slate-50 cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={accessZones.mainEntrance}
                                    onChange={(e) => setAccessZones({ ...accessZones, mainEntrance: e.target.checked })}
                                    className="rounded text-blue-600 focus:ring-blue-500"
                                />
                                <span className="font-medium text-slate-700">24/7 Hotel Main Entrance</span>
                            </label>
                            <label className="flex items-center gap-2 p-2 rounded-lg border border-slate-200 hover:bg-slate-50 cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={accessZones.elevator}
                                    onChange={(e) => setAccessZones({ ...accessZones, elevator: e.target.checked })}
                                    className="rounded text-blue-600 focus:ring-blue-500"
                                />
                                <span className="font-medium text-slate-700">Guest Elevator Access</span>
                            </label>
                            <label className="flex items-center gap-2 p-2 rounded-lg border border-slate-200 hover:bg-slate-50 cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={accessZones.poolGym}
                                    onChange={(e) => setAccessZones({ ...accessZones, poolGym: e.target.checked })}
                                    className="rounded text-blue-600 focus:ring-blue-500"
                                />
                                <span className="font-medium text-slate-700">Swimming Pool & Gym</span>
                            </label>
                            <label className="flex items-center gap-2 p-2 rounded-lg border border-slate-200 hover:bg-slate-50 cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={accessZones.executiveLounge}
                                    onChange={(e) => setAccessZones({ ...accessZones, executiveLounge: e.target.checked })}
                                    className="rounded text-blue-600 focus:ring-blue-500"
                                />
                                <span className="font-medium text-slate-700">Executive Club Lounge</span>
                            </label>
                        </div>
                    </div>

                    {/* Status Feedback Banners */}
                    {status === 'SUCCESS' && issuedKeyData && (
                        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl space-y-2 text-emerald-900 animate-in fade-in">
                            <div className="flex items-center gap-2 font-bold text-sm text-emerald-800">
                                <CheckCircle2 size={18} className="text-emerald-600" />
                                Keycard Successfully Encoded & Ready!
                            </div>
                            <div className="text-xs text-emerald-700">
                                Card UID: <span className="font-mono font-bold">{issuedKeyData.cardUid || 'RFID-GEN-9481'}</span>
                                {' • '}
                                Encoder Bridge: <span className="font-semibold">{issuedKeyData.bridgeType || encoderType}</span>
                            </div>
                            {issuedKeyData.passcode && (
                                <div className="mt-2 p-2 bg-white rounded-lg border border-emerald-200 flex items-center justify-between">
                                    <span className="text-xs font-semibold text-slate-600">Door Keypad PIN:</span>
                                    <span className="text-base font-black tracking-widest text-emerald-700 font-mono">
                                        {issuedKeyData.passcode}
                                    </span>
                                </div>
                            )}
                        </div>
                    )}

                    {status === 'ERROR' && (
                        <div className="p-3 bg-red-50 border border-red-200 rounded-xl flex items-center gap-2 text-red-800 text-xs">
                            <AlertTriangle size={16} className="text-red-600 shrink-0" />
                            <span>{errorMessage}</span>
                        </div>
                    )}
                </div>

                {/* Footer Controls */}
                <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <button
                            type="button"
                            onClick={handleRevokeKeycard}
                            disabled={status === 'ENCODING'}
                            className="px-3 py-2 text-xs font-semibold text-red-600 hover:text-red-700 hover:bg-red-50 border border-red-200 rounded-lg transition-colors flex items-center gap-1.5"
                        >
                            <Lock size={13} />
                            Deactivate Room Keys
                        </button>

                        {status === 'SUCCESS' && (
                            <button
                                type="button"
                                onClick={handlePrintKeySleeve}
                                className="px-3 py-2 text-xs font-semibold text-slate-700 hover:text-slate-900 hover:bg-slate-100 border border-slate-200 rounded-lg transition-colors flex items-center gap-1.5"
                            >
                                <Printer size={13} />
                                Print Key Sleeve
                            </button>
                        )}
                    </div>

                    <div className="flex items-center gap-2.5">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 hover:bg-slate-200/60 rounded-lg transition-colors"
                        >
                            Cancel
                        </button>

                        <button
                            type="button"
                            onClick={handleEncodeKeycard}
                            disabled={status === 'ENCODING'}
                            className="px-5 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 rounded-lg shadow-sm hover:shadow transition-all flex items-center gap-2"
                        >
                            {status === 'ENCODING' ? (
                                <>
                                    <RefreshCw size={14} className="animate-spin" />
                                    Encoding Key...
                                </>
                            ) : (
                                <>
                                    <CreditCard size={14} />
                                    Encode & Burn Keycard
                                </>
                            )}
                        </button>
                    </div>
                </div>

            </div>
        </div>
    );
};
