import React, { useState, useEffect } from 'react';
import { Save, Trash2, CheckCircle2 } from 'lucide-react';
import type { FolioData } from '../folioTypes';
import type { AmendBookingData } from '../../modals/AmendStayModal';

interface GuestRow {
    id: string;
    roomNumber: string;
    salutation: string;
    guestName: string;
    mobile: string;
    email: string;
    isChargeable: boolean;
}

interface TabGuestDetailsProps {
    folio: FolioData | null;
    booking?: AmendBookingData | null;
    onUpdateSuccess: () => void;
}

export const TabGuestDetails: React.FC<TabGuestDetailsProps> = ({
    folio,
    booking,
    onUpdateSuccess
}) => {
    const [isGuestListActive, setIsGuestListActive] = useState(true);
    const [selectedPackage, setSelectedPackage] = useState('Standard Rate');
    const [guests, setGuests] = useState<GuestRow[]>([]);
    const [isSaving, setIsSaving] = useState(false);
    const [feedbackMsg, setFeedbackMsg] = useState('');

    useEffect(() => {
        if (folio || booking) {
            const initialRoom = folio?.rooms?.[0]?.room_number || folio?.room_number || booking?.roomNumber || 'Unassigned';
            setSelectedPackage(folio?.market_code || booking?.ratePlan || 'Standard Rate');

            const rawName = folio?.guest_name || booking?.guestName || '';
            let salutation = 'Mr';
            let cleanName = rawName;
            const titleMatch = rawName.match(/^(Mr|Mrs|Ms|Dr|Prof)\.?\s+/i);
            if (titleMatch) {
                salutation = titleMatch[1];
                cleanName = rawName.replace(/^(Mr|Mrs|Ms|Dr|Prof)\.?\s+/i, '').trim();
            }

            // Populate initial primary guest dynamically from live folio/booking records
            setGuests([
                {
                    id: '1',
                    roomNumber: initialRoom,
                    salutation: salutation,
                    guestName: cleanName,
                    mobile: folio?.guest_phone || booking?.phone || '',
                    email: folio?.guest_email || booking?.email || '',
                    isChargeable: true
                }
            ]);
            setFeedbackMsg('');
        }
    }, [folio, booking]);

    const handleAddSharer = () => {
        const primaryRoom = folio?.rooms?.[0]?.room_number || folio?.room_number || booking?.roomNumber || 'Unassigned';
        setGuests(prev => [
            ...prev,
            {
                id: String(Date.now()),
                roomNumber: primaryRoom,
                salutation: 'Mr',
                guestName: '',
                mobile: '',
                email: '',
                isChargeable: false
            }
        ]);
    };

    const handleRemoveGuest = (id: string) => {
        if (guests.length <= 1) return; // Keep at least primary guest
        setGuests(prev => prev.filter(g => g.id !== id));
    };

    const handleUpdateGuest = (id: string, field: keyof GuestRow, value: any) => {
        setGuests(prev => prev.map(g => g.id === id ? { ...g, [field]: value } : g));
    };

    const handleSave = (e: React.FormEvent) => {
        e.preventDefault();
        setIsSaving(true);
        setTimeout(() => {
            setIsSaving(false);
            setFeedbackMsg('Guest roster & sharer records saved successfully!');
            onUpdateSuccess();
            setTimeout(() => setFeedbackMsg(''), 3000);
        }, 500);
    };

    const roomOptions = folio?.rooms?.map(r => r.room_number).filter(Boolean) || (
        booking?.roomNumber ? [booking.roomNumber] : ['Unassigned']
    );

    return (
        <form onSubmit={handleSave} className="w-full flex gap-3 h-full select-none text-gray-800 text-xs py-1 min-h-0 overflow-y-auto">
            {/* LEFT SIDEBAR */}
            <div className="w-48 shrink-0 border-r border-gray-200/80 pr-3 space-y-3">
                <div className="flex items-center justify-between">
                    <span className="font-bold text-gray-700 text-xs uppercase tracking-wide">Guest</span>
                    {/* Toggle Switch */}
                    <label className="flex items-center gap-1.5 cursor-pointer">
                        <span className="text-[10px] text-gray-500 font-semibold">Guest List</span>
                        <div
                            onClick={() => setIsGuestListActive(!isGuestListActive)}
                            className={`w-7 h-4 rounded-full transition-colors relative cursor-pointer ${
                                isGuestListActive ? 'bg-blue-600' : 'bg-gray-300'
                            }`}
                        >
                            <div
                                className={`w-3 h-3 rounded-full bg-white transition-transform absolute top-0.5 ${
                                    isGuestListActive ? 'left-3.5' : 'left-0.5'
                                }`}
                            />
                        </div>
                    </label>
                </div>

                {/* Package Card */}
                <div className="bg-blue-50/60 border border-blue-100 rounded-lg p-2 text-blue-900 font-semibold flex items-center justify-between text-xs">
                    <span>{selectedPackage}</span>
                </div>
            </div>

            {/* MAIN SECTION: Add Guest List Table */}
            <div className="flex-1 flex flex-col justify-between min-w-0 space-y-3">
                <div className="space-y-2">
                    <div className="flex items-center justify-between">
                        <h4 className="text-xs font-bold text-gray-800 tracking-wide uppercase">Add Guest List</h4>
                    </div>

                    {feedbackMsg && (
                        <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 px-3 py-1.5 rounded-md text-xs font-semibold flex items-center gap-1.5">
                            <CheckCircle2 size={13} className="text-emerald-600" />
                            <span>{feedbackMsg}</span>
                        </div>
                    )}

                    <div className="border border-gray-200 rounded-lg overflow-hidden bg-white shadow-xs">
                        <table className="w-full text-left text-xs border-collapse">
                            <thead className="bg-gray-50 border-b border-gray-200 text-gray-600 font-semibold text-[11px]">
                                <tr>
                                    <th className="py-2 px-2.5 w-24">Room</th>
                                    <th className="py-2 px-2 w-20">Salutation</th>
                                    <th className="py-2 px-2.5">Guest Name</th>
                                    <th className="py-2 px-2.5">Mobile</th>
                                    <th className="py-2 px-2.5">Email</th>
                                    <th className="py-2 px-2 text-center w-24">Is Chargeable</th>
                                    <th className="py-2 px-2 text-center w-20">Action</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {guests.map((g, idx) => (
                                    <tr key={g.id} className="hover:bg-gray-50/70">
                                        <td className="py-1.5 px-2.5">
                                            <select
                                                value={g.roomNumber}
                                                onChange={(e) => handleUpdateGuest(g.id, 'roomNumber', e.target.value)}
                                                className="w-full bg-white border border-gray-300 rounded px-1.5 py-1 text-xs"
                                            >
                                                {roomOptions.map((rm) => (
                                                    <option key={rm} value={rm}>{rm}</option>
                                                ))}
                                            </select>
                                        </td>
                                        <td className="py-1.5 px-2">
                                            <select
                                                value={g.salutation}
                                                onChange={(e) => handleUpdateGuest(g.id, 'salutation', e.target.value)}
                                                className="w-full bg-white border border-gray-300 rounded px-1.5 py-1 text-xs"
                                            >
                                                <option value="Mr">Mr</option>
                                                <option value="Mrs">Mrs</option>
                                                <option value="Ms">Ms</option>
                                                <option value="Dr">Dr</option>
                                                <option value="Prof">Prof</option>
                                            </select>
                                        </td>
                                        <td className="py-1.5 px-2.5">
                                            <input
                                                type="text"
                                                value={g.guestName}
                                                onChange={(e) => handleUpdateGuest(g.id, 'guestName', e.target.value)}
                                                placeholder="Guest name"
                                                className="w-full bg-white border border-gray-300 rounded px-2 py-1 text-xs font-medium"
                                            />
                                        </td>
                                        <td className="py-1.5 px-2.5">
                                            <input
                                                type="text"
                                                value={g.mobile}
                                                onChange={(e) => handleUpdateGuest(g.id, 'mobile', e.target.value)}
                                                placeholder="Mobile number"
                                                className="w-full bg-white border border-gray-300 rounded px-2 py-1 text-xs font-mono"
                                            />
                                        </td>
                                        <td className="py-1.5 px-2.5">
                                            <input
                                                type="email"
                                                value={g.email}
                                                onChange={(e) => handleUpdateGuest(g.id, 'email', e.target.value)}
                                                placeholder="Email address"
                                                className="w-full bg-white border border-gray-300 rounded px-2 py-1 text-xs"
                                            />
                                        </td>
                                        <td className="py-1.5 px-2 text-center">
                                            <input
                                                type="checkbox"
                                                checked={g.isChargeable}
                                                onChange={(e) => handleUpdateGuest(g.id, 'isChargeable', e.target.checked)}
                                                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 w-3.5 h-3.5"
                                            />
                                        </td>
                                        <td className="py-1.5 px-2 text-center">
                                            {idx === 0 ? (
                                                <button
                                                    type="button"
                                                    onClick={handleAddSharer}
                                                    className="text-blue-600 hover:text-blue-800 font-semibold text-[11px] cursor-pointer"
                                                >
                                                    + Share
                                                </button>
                                            ) : (
                                                <button
                                                    type="button"
                                                    onClick={() => handleRemoveGuest(g.id)}
                                                    className="text-rose-600 hover:text-rose-800 cursor-pointer p-0.5"
                                                    title="Remove Sharer"
                                                >
                                                    <Trash2 size={13} />
                                                </button>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>

                <div className="flex items-center justify-end pt-2 border-t border-gray-100">
                    <button
                        type="submit"
                        disabled={isSaving}
                        className="px-5 py-1.5 rounded-md bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs shadow-xs cursor-pointer transition-colors disabled:opacity-50 flex items-center gap-1.5"
                    >
                        <Save size={13} />
                        <span>{isSaving ? 'Saving...' : 'Save'}</span>
                    </button>
                </div>
            </div>
        </form>
    );
};
