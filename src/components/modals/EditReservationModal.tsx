import React, { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import {
    X,
    Calendar,
    User,
    CreditCard,
    FileText,
    AlertTriangle,
    BedDouble,
    Check,
    Loader2
} from 'lucide-react';
import {
    getAllStoredReservations,
    saveStoredReservations,
    updateReservationInDB,
    getCanonicalRooms,
    getDynamicRoomTypes,
    broadcastPMSEvent,
    type StoredReservation
} from '../../utils/roomInventoryEngine';
import { parseTitleAndName } from '../GuestProfile';

export interface EditReservationModalProps {
    isOpen: boolean;
    onClose: () => void;
    reservation: StoredReservation | null;
    onSaved?: (updated: StoredReservation) => void;
}

export const EditReservationModal: React.FC<EditReservationModalProps> = ({
    isOpen,
    onClose,
    reservation,
    onSaved
}) => {
    if (!isOpen || !reservation) return null;

    // Active sub-tab state
    const [activeTab, setActiveTab] = useState<'stay' | 'guest' | 'billing' | 'notes'>('stay');
    const [isSaving, setIsSaving] = useState(false);
    const [saveSuccess, setSaveSuccess] = useState(false);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);

    // Initial parsing of title & clean name
    const initialNameParsed = useMemo(() => {
        return parseTitleAndName(reservation.guestName || '');
    }, [reservation.guestName]);

    // Form State
    const [formData, setFormData] = useState({
        // 1. Stay & Room
        checkIn: reservation.checkIn || new Date().toISOString().slice(0, 10),
        checkOut: reservation.checkOut || new Date(Date.now() + 86400000).toISOString().slice(0, 10),
        nights: Number(reservation.nights) || 1,
        roomType: reservation.roomType || 'Deluxe Room',
        roomNumber: reservation.roomNumber || reservation.roomNo || (Array.isArray(reservation.allocatedRooms) ? reservation.allocatedRooms[0] : '') || '',
        adults: Number(reservation.adults) || 1,
        children: Number(reservation.children) || 0,
        status: (reservation.status || 'CONFIRMED').toUpperCase(),

        // 2. Guest & CRM
        title: (reservation.salutation || initialNameParsed.title || 'Mr.') as 'Mr.' | 'Mrs.' | 'Ms.' | 'Dr.' | 'Prof.' | 'Engr.',
        guestName: initialNameParsed.cleanName || reservation.guestName || '',
        phone: reservation.phone || reservation.guestPhone || '',
        altPhone: reservation.altPhone || '',
        email: reservation.email || reservation.guestEmail || '',
        vip: reservation.vip || reservation.vipTier || 'NONE',
        nationality: reservation.nationality || 'Bangladesh',
        idType: reservation.idType || 'National ID (NID)',
        idNumber: reservation.idNumber || reservation.nidNumber || reservation.passportNo || '',
        company: reservation.company || reservation.companyName || '',
        designation: reservation.designation || '',
        syncWithCRM: true,

        // 3. Rates & Billing
        ratePlan: reservation.ratePlan || 'Best Available Rate',
        roomRate: Number(reservation.roomRate) || Number(reservation.nightlyRate) || (Number(reservation.totalAmount) ? Math.round(Number(reservation.totalAmount) / Math.max(1, Number(reservation.nights) || 1)) : 3500),
        discount: Number(reservation.discount) || 0,
        totalAmount: Number(reservation.totalAmount) || Number(reservation.totalRate) || 3500,
        paidAmount: Number(reservation.paidAmount) || 0,
        paymentMethod: reservation.paymentMethod || 'Credit Card',
        billingRoute: reservation.billingRoute || 'Self-Pay (Guest Folio)',

        // 4. Hospitality & Notes
        bedType: reservation.bedType || 'King Bed',
        smoking: reservation.smoking || 'Non-Smoking',
        floorPreference: reservation.floorPreference || 'High Floor',
        dietary: reservation.dietary || 'Standard Halal',
        bookingSource: reservation.bookingSource || reservation.source || 'Direct Walk-In',
        eta: reservation.eta || '14:00',
        etd: reservation.etd || '12:00',
        specialRequests: reservation.specialRequests || reservation.notes || ''
    });

    // Reset form data when reservation prop changes
    useEffect(() => {
        if (reservation) {
            const parsed = parseTitleAndName(reservation.guestName || '');
            const calcNights = Math.max(1, Math.round((new Date(reservation.checkOut).getTime() - new Date(reservation.checkIn).getTime()) / 86400000));
            const calculatedTotal = Number(reservation.totalAmount) || Number(reservation.totalRate) || 0;
            const calculatedRate = Number(reservation.roomRate) || (calculatedTotal ? Math.round(calculatedTotal / calcNights) : 3500);

            setFormData({
                checkIn: reservation.checkIn,
                checkOut: reservation.checkOut,
                nights: Number(reservation.nights) || calcNights,
                roomType: reservation.roomType || 'Deluxe Room',
                roomNumber: reservation.roomNumber || reservation.roomNo || (Array.isArray(reservation.allocatedRooms) ? reservation.allocatedRooms[0] : '') || '',
                adults: Number(reservation.adults) || 1,
                children: Number(reservation.children) || 0,
                status: (reservation.status || 'CONFIRMED').toUpperCase(),

                title: (reservation.salutation || parsed.title || 'Mr.') as any,
                guestName: parsed.cleanName || reservation.guestName || '',
                phone: reservation.phone || reservation.guestPhone || '',
                altPhone: reservation.altPhone || '',
                email: reservation.email || reservation.guestEmail || '',
                vip: reservation.vip || reservation.vipTier || 'NONE',
                nationality: reservation.nationality || 'Bangladesh',
                idType: reservation.idType || 'National ID (NID)',
                idNumber: reservation.idNumber || reservation.nidNumber || reservation.passportNo || '',
                company: reservation.company || reservation.companyName || '',
                designation: reservation.designation || '',
                syncWithCRM: true,

                ratePlan: reservation.ratePlan || 'Best Available Rate',
                roomRate: calculatedRate,
                discount: Number(reservation.discount) || 0,
                totalAmount: calculatedTotal || (calculatedRate * calcNights),
                paidAmount: Number(reservation.paidAmount) || 0,
                paymentMethod: reservation.paymentMethod || 'Credit Card',
                billingRoute: reservation.billingRoute || 'Self-Pay (Guest Folio)',

                bedType: reservation.bedType || 'King Bed',
                smoking: reservation.smoking || 'Non-Smoking',
                floorPreference: reservation.floorPreference || 'High Floor',
                dietary: reservation.dietary || 'Standard Halal',
                bookingSource: reservation.bookingSource || reservation.source || 'Direct Walk-In',
                eta: reservation.eta || '14:00',
                etd: reservation.etd || '12:00',
                specialRequests: reservation.specialRequests || reservation.notes || ''
            });
            setActiveTab('stay');
            setErrorMessage(null);
            setSaveSuccess(false);
        }
    }, [reservation]);

    // Available rooms & types
    const dynamicRoomTypes = useMemo(() => getDynamicRoomTypes(), []);
    const canonicalRooms = useMemo(() => getCanonicalRooms(), []);

    // Filter rooms for the selected Room Type
    const roomsOfSelectedType = useMemo(() => {
        if (!formData.roomType) return canonicalRooms;
        return canonicalRooms.filter(r =>
            (r.roomTypeName || '').toLowerCase().trim() === formData.roomType.toLowerCase().trim() ||
            formData.roomType.toLowerCase().includes((r.roomTypeName || '').toLowerCase())
        );
    }, [canonicalRooms, formData.roomType]);

    // Check collision for assigned room in the new date range
    const roomCollisionInfo = useMemo(() => {
        if (!formData.roomNumber) return null;
        const allRes = getAllStoredReservations();
        const targetStart = new Date(formData.checkIn).getTime();
        const targetEnd = new Date(formData.checkOut).getTime();

        const collision = allRes.find(r => {
            const isSameRes = String(r.id) === String(reservation.id) || r.reservationNumber === reservation.reservationNumber;
            if (isSameRes) return false;
            if (r.status === 'CANCELLED' || r.status === 'CHECKED_OUT') return false;

            const resRoom = r.roomNumber || r.roomNo || (Array.isArray(r.allocatedRooms) ? r.allocatedRooms[0] : '');
            if (String(resRoom) !== String(formData.roomNumber)) return false;

            const resStart = new Date(r.checkIn).getTime();
            const resEnd = new Date(r.checkOut).getTime();
            return (targetStart < resEnd && targetEnd > resStart);
        });

        if (collision) {
            return {
                collidingRes: collision,
                message: `Room ${formData.roomNumber} is occupied by ${collision.guestName} (${collision.checkIn} to ${collision.checkOut})`
            };
        }
        return null;
    }, [formData.roomNumber, formData.checkIn, formData.checkOut, reservation]);

    // Handlers for Dates & Pricing recalculations
    const handleCheckInChange = (newIn: string) => {
        const inDate = new Date(newIn);
        let outDate = new Date(formData.checkOut);
        if (outDate <= inDate) {
            outDate = new Date(inDate.getTime() + 86400000);
        }
        const nights = Math.max(1, Math.round((outDate.getTime() - inDate.getTime()) / 86400000));
        const outStr = outDate.toISOString().slice(0, 10);
        const newTotal = (formData.roomRate * nights) - formData.discount;

        setFormData(prev => ({
            ...prev,
            checkIn: newIn,
            checkOut: outStr,
            nights,
            totalAmount: Math.max(0, newTotal)
        }));
    };

    const handleCheckOutChange = (newOut: string) => {
        const inDate = new Date(formData.checkIn);
        const outDate = new Date(newOut);
        if (outDate <= inDate) {
            alert('Check-out date must be after check-in date.');
            return;
        }
        const nights = Math.max(1, Math.round((outDate.getTime() - inDate.getTime()) / 86400000));
        const newTotal = (formData.roomRate * nights) - formData.discount;

        setFormData(prev => ({
            ...prev,
            checkOut: newOut,
            nights,
            totalAmount: Math.max(0, newTotal)
        }));
    };

    const handleRoomTypeChange = (newType: string) => {
        const matched = dynamicRoomTypes.find(t => t.name.toLowerCase() === newType.toLowerCase());
        const newRate = matched?.baseRate || formData.roomRate;
        const newTotal = (newRate * formData.nights) - formData.discount;

        // Auto select first available room of that type if current room doesn't match
        const availableInType = canonicalRooms.filter(r =>
            (r.roomTypeName || '').toLowerCase().trim() === newType.toLowerCase().trim() ||
            newType.toLowerCase().includes((r.roomTypeName || '').toLowerCase())
        );
        const newRoomNumber = availableInType.some(r => r.number === formData.roomNumber)
            ? formData.roomNumber
            : (availableInType[0]?.number || '');

        setFormData(prev => ({
            ...prev,
            roomType: newType,
            roomRate: newRate,
            roomNumber: newRoomNumber,
            totalAmount: Math.max(0, newTotal)
        }));
    };

    const handleRateChange = (newRate: number) => {
        const newTotal = (newRate * formData.nights) - formData.discount;
        setFormData(prev => ({
            ...prev,
            roomRate: newRate,
            totalAmount: Math.max(0, newTotal)
        }));
    };

    const handleDiscountChange = (newDiscount: number) => {
        const newTotal = (formData.roomRate * formData.nights) - newDiscount;
        setFormData(prev => ({
            ...prev,
            discount: newDiscount,
            totalAmount: Math.max(0, newTotal)
        }));
    };

    const balanceDue = useMemo(() => {
        return Math.max(0, formData.totalAmount - formData.paidAmount);
    }, [formData.totalAmount, formData.paidAmount]);

    // Save & Persist
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setErrorMessage(null);

        if (!formData.guestName.trim()) {
            setErrorMessage('Guest legal name is required.');
            setActiveTab('guest');
            return;
        }

        if (!formData.phone.trim()) {
            setErrorMessage('Primary contact phone is required.');
            setActiveTab('guest');
            return;
        }

        if (roomCollisionInfo) {
            const confirmed = window.confirm(
                `Warning: ${roomCollisionInfo.message}. Are you sure you want to assign Room ${formData.roomNumber} despite this collision?`
            );
            if (!confirmed) {
                setActiveTab('stay');
                return;
            }
        }

        setIsSaving(true);
        try {
            const cleanName = formData.guestName.replace(/^(Mr|Mrs|Ms|Miss|Dr|Prof|Engr)\.?\s+/i, '').trim();
            const fullNameWithTitle = `${formData.title} ${cleanName}`;

            const updatedReservation: StoredReservation = {
                ...reservation,
                guestName: fullNameWithTitle,
                salutation: formData.title,
                phone: formData.phone.trim(),
                guestPhone: formData.phone.trim(),
                altPhone: formData.altPhone.trim() || undefined,
                email: formData.email.trim(),
                guestEmail: formData.email.trim(),
                vip: formData.vip,
                vipTier: formData.vip,
                nationality: formData.nationality,
                idType: formData.idType,
                idNumber: formData.idNumber,
                company: formData.company.trim() || undefined,
                companyName: formData.company.trim() || undefined,
                designation: formData.designation.trim() || undefined,

                checkIn: formData.checkIn,
                checkOut: formData.checkOut,
                nights: formData.nights,
                roomType: formData.roomType,
                roomNumber: formData.roomNumber,
                roomNo: formData.roomNumber,
                allocatedRooms: formData.roomNumber ? [formData.roomNumber] : [],
                adults: formData.adults,
                children: formData.children,
                status: formData.status,

                ratePlan: formData.ratePlan,
                roomRate: formData.roomRate,
                nightlyRate: formData.roomRate,
                discount: formData.discount,
                totalAmount: formData.totalAmount,
                totalRate: formData.totalAmount,
                paidAmount: formData.paidAmount,
                balanceDue,
                paymentMethod: formData.paymentMethod,
                billingRoute: formData.billingRoute,

                bedType: formData.bedType,
                smoking: formData.smoking,
                floorPreference: formData.floorPreference,
                dietary: formData.dietary,
                bookingSource: formData.bookingSource,
                source: formData.bookingSource,
                eta: formData.eta,
                etd: formData.etd,
                specialRequests: formData.specialRequests,
                notes: formData.specialRequests,
                updatedAt: new Date().toISOString()
            };

            // 1. Immediately update local storage reservations cache
            const allStored = getAllStoredReservations();
            const idx = allStored.findIndex(r =>
                String(r.id) === String(reservation.id) || r.reservationNumber === reservation.reservationNumber
            );
            let updatedList: StoredReservation[];
            if (idx !== -1) {
                updatedList = allStored.map((r, i) => i === idx ? updatedReservation : r);
            } else {
                updatedList = [updatedReservation, ...allStored];
            }
            saveStoredReservations(updatedList);

            // 2. Synchronize with Server Database via REST API
            try {
                await updateReservationInDB(reservation.reservationNumber || reservation.id, {
                    guestName: fullNameWithTitle,
                    salutation: formData.title,
                    phone: formData.phone.trim(),
                    email: formData.email.trim(),
                    vip: formData.vip,
                    checkIn: formData.checkIn,
                    checkOut: formData.checkOut,
                    nights: formData.nights,
                    roomType: formData.roomType,
                    roomNumber: formData.roomNumber,
                    adults: formData.adults,
                    children: formData.children,
                    status: formData.status,
                    ratePlan: formData.ratePlan,
                    roomRate: formData.roomRate,
                    discount: formData.discount,
                    totalAmount: formData.totalAmount,
                    paidAmount: formData.paidAmount,
                    notes: formData.specialRequests
                });
            } catch (apiErr) {
                console.warn('Backend update error (offline fallback used):', apiErr);
            }

            // 3. Synchronize with Guest 360 CRM Master Profiles if enabled
            if (formData.syncWithCRM) {
                try {
                    const savedProfilesRaw = localStorage.getItem('hotel_guest_profiles_v2');
                    let profiles: any[] = savedProfilesRaw ? JSON.parse(savedProfilesRaw) : [];
                    const profileKey = cleanName.toLowerCase();
                    const pIdx = profiles.findIndex(p =>
                        (p.name && parseTitleAndName(p.name).cleanName.toLowerCase() === profileKey) ||
                        (p.phone && p.phone === formData.phone.trim())
                    );

                    if (pIdx !== -1) {
                        profiles[pIdx] = {
                            ...profiles[pIdx],
                            title: formData.title,
                            name: cleanName,
                            phone: formData.phone.trim(),
                            altPhone: formData.altPhone.trim() || profiles[pIdx].altPhone,
                            email: formData.email.trim() || profiles[pIdx].email,
                            vipTier: formData.vip !== 'NONE' ? formData.vip : profiles[pIdx].vipTier,
                            nationality: formData.nationality || profiles[pIdx].nationality,
                            idType: formData.idType || profiles[pIdx].idType,
                            idNumber: formData.idNumber || profiles[pIdx].idNumber,
                            company: formData.company.trim() || profiles[pIdx].company,
                            designation: formData.designation.trim() || profiles[pIdx].designation,
                            preferences: {
                                ...profiles[pIdx].preferences,
                                roomType: formData.roomType,
                                bedType: formData.bedType,
                                smoking: formData.smoking,
                                floorPreference: formData.floorPreference,
                                dietary: formData.dietary
                            }
                        };
                    }
                    localStorage.setItem('hotel_guest_profiles_v2', JSON.stringify(profiles));
                } catch (crmErr) {
                    console.warn('CRM sync warning:', crmErr);
                }
            }

            // 4. Synchronize linked Folio in hotel_folios_v2 if it exists
            try {
                const foliosRaw = localStorage.getItem('hotel_folios_v2');
                if (foliosRaw) {
                    const folios = JSON.parse(foliosRaw);
                    if (Array.isArray(folios)) {
                        const targetFolioIdx = folios.findIndex((f: any) =>
                            f.reservationNumber === reservation.reservationNumber ||
                            (f.guestName && f.guestName.toLowerCase().includes(cleanName.toLowerCase()))
                        );
                        if (targetFolioIdx !== -1) {
                            folios[targetFolioIdx] = {
                                ...folios[targetFolioIdx],
                                guestName: fullNameWithTitle,
                                roomNumber: formData.roomNumber,
                                totalAmount: formData.totalAmount,
                                balance: balanceDue
                            };
                            localStorage.setItem('hotel_folios_v2', JSON.stringify(folios));
                        }
                    }
                }
            } catch (folioErr) {
                console.warn('Folio sync warning:', folioErr);
            }

            // 5. Broadcast PMS Events to refresh StayView, ReservationsView, FrontDesk live
            broadcastPMSEvent({
                type: 'RESERVATION_UPDATED',
                reservationId: reservation.reservationNumber || reservation.id
            });
            broadcastPMSEvent({ type: 'INVENTORY_REFRESH' });

            setSaveSuccess(true);
            setTimeout(() => {
                if (onSaved) onSaved(updatedReservation);
                onClose();
            }, 600);
        } catch (err: any) {
            console.error('Failed to save amended reservation', err);
            setErrorMessage(err?.message || 'Failed to save changes. Please try again.');
        } finally {
            setIsSaving(false);
        }
    };

    return createPortal(
        <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/60 backdrop-blur-xs p-2 sm:p-4 animate-in fade-in duration-150 select-none">
            <div className="bg-white rounded-xl shadow-2xl border border-gray-200 w-full max-w-2xl max-h-[92vh] flex flex-col overflow-hidden text-xs">
                {/* Header */}
                <div className="px-4 py-3 bg-slate-900 text-white flex items-center justify-between flex-shrink-0">
                    <div className="flex items-center gap-2.5">
                        <div className="p-1.5 rounded-lg bg-blue-600/30 text-blue-400 border border-blue-500/30">
                            <BedDouble size={16} />
                        </div>
                        <div>
                            <div className="flex items-center gap-2">
                                <h2 className="font-bold text-sm text-white leading-tight">
                                    Edit Reservation: {reservation.reservationNumber || `#${reservation.id}`}
                                </h2>
                                <span className={`px-2 py-0.5 rounded text-[9.5px] font-semibold uppercase tracking-wider ${
                                    formData.status.includes('CHECKED_IN') || formData.status.includes('IN-HOUSE')
                                        ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                                        : formData.status.includes('CANCEL')
                                        ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                                        : 'bg-blue-500/20 text-blue-300 border border-blue-500/30'
                                }`}>
                                    {formData.status.replace('_', ' ')}
                                </span>
                            </div>
                            <p className="text-[10.5px] text-slate-400 mt-0.5">
                                Modify stay dates, room allocations, guest contact, negotiated rates & billing.
                            </p>
                        </div>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
                    >
                        <X size={16} />
                    </button>
                </div>

                {/* Sub-Tabs Bar */}
                <div className="flex items-center border-b border-gray-200 bg-slate-50/80 px-4 pt-1.5 gap-1 flex-shrink-0">
                    {[
                        { key: 'stay', label: '1. Stay & Room', icon: <Calendar size={13} /> },
                        { key: 'guest', label: '2. Guest & CRM', icon: <User size={13} /> },
                        { key: 'billing', label: '3. Rates & Billing', icon: <CreditCard size={13} /> },
                        { key: 'notes', label: '4. Preferences & Channel', icon: <FileText size={13} /> }
                    ].map(t => (
                        <button
                            key={t.key}
                            type="button"
                            onClick={() => setActiveTab(t.key as any)}
                            className={`px-3 py-2 border-b-2 text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                                activeTab === t.key
                                    ? 'border-blue-600 text-blue-600 bg-white shadow-2xs rounded-t-md'
                                    : 'border-transparent text-gray-500 hover:text-gray-900 hover:bg-gray-100/60'
                            }`}
                        >
                            {t.icon}
                            <span>{t.label}</span>
                        </button>
                    ))}
                </div>

                {/* Collision Warning Banner */}
                {roomCollisionInfo && activeTab === 'stay' && (
                    <div className="mx-4 mt-3 p-2.5 rounded-lg bg-amber-50 border border-amber-300/80 flex items-start gap-2 text-amber-800 text-[11px]">
                        <AlertTriangle size={15} className="text-amber-600 flex-shrink-0 mt-0.5" />
                        <div>
                            <span className="font-bold">Inventory Conflict Warning:</span> {roomCollisionInfo.message}.
                            <span className="block text-[10px] text-amber-700 mt-0.5">
                                Please re-assign an available clean room or shift dates to prevent overbooking collision.
                            </span>
                        </div>
                    </div>
                )}

                {/* Error Banner */}
                {errorMessage && (
                    <div className="mx-4 mt-3 p-2.5 rounded-lg bg-rose-50 border border-rose-200 flex items-center gap-2 text-rose-700 text-xs">
                        <AlertTriangle size={14} className="flex-shrink-0" />
                        <span>{errorMessage}</span>
                    </div>
                )}

                {/* Form Body */}
                <form onSubmit={handleSubmit} className="flex-1 flex flex-col overflow-hidden">
                    <div className="flex-1 overflow-y-auto p-4 space-y-3.5">
                        {/* TAB 1: Stay & Room Allocation */}
                        {activeTab === 'stay' && (
                            <div className="space-y-3 animate-in fade-in duration-100">
                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                                    <div>
                                        <label className="block text-[10.5px] font-semibold text-gray-700 mb-1">
                                            Check-In Date *
                                        </label>
                                        <input
                                            type="date"
                                            value={formData.checkIn}
                                            onChange={e => handleCheckInChange(e.target.value)}
                                            className="w-full h-8 px-2.5 bg-gray-50 border border-gray-300 rounded text-xs outline-none focus:bg-white focus:border-blue-500 font-mono"
                                            required
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-[10.5px] font-semibold text-gray-700 mb-1">
                                            Check-Out Date *
                                        </label>
                                        <input
                                            type="date"
                                            value={formData.checkOut}
                                            onChange={e => handleCheckOutChange(e.target.value)}
                                            className="w-full h-8 px-2.5 bg-gray-50 border border-gray-300 rounded text-xs outline-none focus:bg-white focus:border-blue-500 font-mono"
                                            required
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-[10.5px] font-semibold text-gray-700 mb-1">
                                            Total Nights
                                        </label>
                                        <div className="h-8 px-2.5 bg-slate-100 border border-gray-200 rounded text-xs font-mono font-bold text-gray-800 flex items-center">
                                            {formData.nights} Night{formData.nights !== 1 ? 's' : ''}
                                        </div>
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                                    <div>
                                        <label className="block text-[10.5px] font-semibold text-gray-700 mb-1">
                                            Room Category / Type *
                                        </label>
                                        <select
                                            value={formData.roomType}
                                            onChange={e => handleRoomTypeChange(e.target.value)}
                                            className="w-full h-8 px-2.5 bg-gray-50 border border-gray-300 rounded text-xs outline-none focus:bg-white focus:border-blue-500 font-medium"
                                        >
                                            {dynamicRoomTypes.map(t => (
                                                <option key={t.id} value={t.name}>
                                                    {t.name} (৳ {t.baseRate?.toLocaleString()}/nt)
                                                </option>
                                            ))}
                                            {/* Fallback option if not in dynamic list */}
                                            {!dynamicRoomTypes.some(t => t.name === formData.roomType) && (
                                                <option value={formData.roomType}>{formData.roomType}</option>
                                            )}
                                        </select>
                                    </div>

                                    <div>
                                        <label className="block text-[10.5px] font-semibold text-gray-700 mb-1">
                                            Allocated Room Number
                                        </label>
                                        <select
                                            value={formData.roomNumber}
                                            onChange={e => setFormData(prev => ({ ...prev, roomNumber: e.target.value }))}
                                            className={`w-full h-8 px-2.5 bg-gray-50 border rounded text-xs outline-none focus:bg-white font-mono ${
                                                roomCollisionInfo
                                                    ? 'border-amber-500 bg-amber-50/50 text-amber-900 focus:border-amber-600'
                                                    : 'border-gray-300 focus:border-blue-500'
                                            }`}
                                        >
                                            <option value="">Unassigned (Allocate at Check-In)</option>
                                            {roomsOfSelectedType.map(r => (
                                                <option key={r.id || r.number} value={r.number}>
                                                    Room {r.number} ({r.roomTypeName || 'Room'} - {r.status || 'Available'})
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                                    <div>
                                        <label className="block text-[10.5px] font-semibold text-gray-700 mb-1">
                                            Adults (Pax)
                                        </label>
                                        <input
                                            type="number"
                                            min={1}
                                            max={6}
                                            value={formData.adults}
                                            onChange={e => setFormData(prev => ({ ...prev, adults: Math.max(1, Number(e.target.value) || 1) }))}
                                            className="w-full h-8 px-2.5 bg-gray-50 border border-gray-300 rounded text-xs outline-none focus:bg-white focus:border-blue-500 font-mono"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-[10.5px] font-semibold text-gray-700 mb-1">
                                            Children
                                        </label>
                                        <input
                                            type="number"
                                            min={0}
                                            max={4}
                                            value={formData.children}
                                            onChange={e => setFormData(prev => ({ ...prev, children: Math.max(0, Number(e.target.value) || 0) }))}
                                            className="w-full h-8 px-2.5 bg-gray-50 border border-gray-300 rounded text-xs outline-none focus:bg-white focus:border-blue-500 font-mono"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-[10.5px] font-semibold text-gray-700 mb-1">
                                            Reservation Status
                                        </label>
                                        <select
                                            value={formData.status}
                                            onChange={e => setFormData(prev => ({ ...prev, status: e.target.value }))}
                                            className="w-full h-8 px-2.5 bg-gray-50 border border-gray-300 rounded text-xs outline-none focus:bg-white focus:border-blue-500 font-semibold"
                                        >
                                            <option value="CONFIRMED">Confirmed</option>
                                            <option value="GUARANTEED">Guaranteed</option>
                                            <option value="CHECKED_IN">Checked-In (In-House)</option>
                                            <option value="CHECKED_OUT">Checked-Out</option>
                                            <option value="CANCELLED">Cancelled</option>
                                            <option value="NO_SHOW">No Show</option>
                                        </select>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* TAB 2: Guest & CRM Profile */}
                        {activeTab === 'guest' && (
                            <div className="space-y-3 animate-in fade-in duration-100">
                                <div className="grid grid-cols-1 sm:grid-cols-4 gap-2.5">
                                    <div>
                                        <label className="block text-[10.5px] font-semibold text-gray-700 mb-1">Title</label>
                                        <select
                                            value={formData.title}
                                            onChange={e => setFormData(prev => ({ ...prev, title: e.target.value as any }))}
                                            className="w-full h-8 px-2 bg-gray-50 border border-gray-300 rounded text-xs outline-none focus:bg-white focus:border-blue-500"
                                        >
                                            <option>Mr.</option>
                                            <option>Mrs.</option>
                                            <option>Ms.</option>
                                            <option>Dr.</option>
                                            <option>Prof.</option>
                                            <option>Engr.</option>
                                        </select>
                                    </div>
                                    <div className="sm:col-span-3">
                                        <label className="block text-[10.5px] font-semibold text-gray-700 mb-1">
                                            Full Legal Name *
                                        </label>
                                        <input
                                            type="text"
                                            value={formData.guestName}
                                            onChange={e => setFormData(prev => ({ ...prev, guestName: e.target.value }))}
                                            className="w-full h-8 px-2.5 bg-gray-50 border border-gray-300 rounded text-xs outline-none focus:bg-white focus:border-blue-500 font-medium"
                                            placeholder="Guest Legal Name"
                                            required
                                        />
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                                    <div>
                                        <label className="block text-[10.5px] font-semibold text-gray-700 mb-1">
                                            Primary Phone *
                                        </label>
                                        <input
                                            type="tel"
                                            value={formData.phone}
                                            onChange={e => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                                            className="w-full h-8 px-2.5 bg-gray-50 border border-gray-300 rounded text-xs outline-none focus:bg-white focus:border-blue-500 font-mono"
                                            placeholder="+880 1711-000000"
                                            required
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-[10.5px] font-semibold text-gray-700 mb-1">
                                            Alt Mobile / WhatsApp
                                        </label>
                                        <input
                                            type="tel"
                                            value={formData.altPhone}
                                            onChange={e => setFormData(prev => ({ ...prev, altPhone: e.target.value }))}
                                            className="w-full h-8 px-2.5 bg-gray-50 border border-gray-300 rounded text-xs outline-none focus:bg-white focus:border-blue-500 font-mono"
                                            placeholder="+880 1819-000000"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-[10.5px] font-semibold text-gray-700 mb-1">
                                            Email Address
                                        </label>
                                        <input
                                            type="email"
                                            value={formData.email}
                                            onChange={e => setFormData(prev => ({ ...prev, email: e.target.value }))}
                                            className="w-full h-8 px-2.5 bg-gray-50 border border-gray-300 rounded text-xs outline-none focus:bg-white focus:border-blue-500 font-mono"
                                            placeholder="guest@example.com"
                                        />
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                                    <div>
                                        <label className="block text-[10.5px] font-semibold text-gray-700 mb-1">
                                            VIP Tier
                                        </label>
                                        <select
                                            value={formData.vip}
                                            onChange={e => setFormData(prev => ({ ...prev, vip: e.target.value }))}
                                            className="w-full h-8 px-2 bg-gray-50 border border-gray-300 rounded text-xs outline-none focus:bg-white focus:border-blue-500 font-semibold"
                                        >
                                            <option value="NONE">Regular Guest</option>
                                            <option value="Silver">Silver Tier</option>
                                            <option value="Gold">Gold VIP</option>
                                            <option value="Platinum VIP">Platinum VIP</option>
                                            <option value="Corporate VIP">Corporate VIP</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-[10.5px] font-semibold text-gray-700 mb-1">
                                            Corporate Partner / Company
                                        </label>
                                        <input
                                            type="text"
                                            value={formData.company}
                                            onChange={e => setFormData(prev => ({ ...prev, company: e.target.value }))}
                                            className="w-full h-8 px-2.5 bg-gray-50 border border-gray-300 rounded text-xs outline-none focus:bg-white focus:border-blue-500"
                                            placeholder="e.g. Grameenphone / Direct"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-[10.5px] font-semibold text-gray-700 mb-1">
                                            Designation
                                        </label>
                                        <input
                                            type="text"
                                            value={formData.designation}
                                            onChange={e => setFormData(prev => ({ ...prev, designation: e.target.value }))}
                                            className="w-full h-8 px-2.5 bg-gray-50 border border-gray-300 rounded text-xs outline-none focus:bg-white focus:border-blue-500"
                                            placeholder="Executive / Director"
                                        />
                                    </div>
                                </div>

                                <div className="pt-2 border-t border-gray-100 flex items-center justify-between">
                                    <label className="flex items-center gap-2 cursor-pointer select-none text-[11px] text-gray-700 font-medium">
                                        <input
                                            type="checkbox"
                                            checked={formData.syncWithCRM}
                                            onChange={e => setFormData(prev => ({ ...prev, syncWithCRM: e.target.checked }))}
                                            className="rounded text-blue-600 focus:ring-blue-500 h-3.5 w-3.5"
                                        />
                                        <span>Automatically synchronize changes with Guest 360 Master Profile</span>
                                    </label>
                                </div>
                            </div>
                        )}

                        {/* TAB 3: Rates, Pricing & Billing */}
                        {activeTab === 'billing' && (
                            <div className="space-y-3 animate-in fade-in duration-100">
                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                                    <div>
                                        <label className="block text-[10.5px] font-semibold text-gray-700 mb-1">
                                            Rate Plan
                                        </label>
                                        <select
                                            value={formData.ratePlan}
                                            onChange={e => setFormData(prev => ({ ...prev, ratePlan: e.target.value }))}
                                            className="w-full h-8 px-2 bg-gray-50 border border-gray-300 rounded text-xs outline-none focus:bg-white focus:border-blue-500 font-medium"
                                        >
                                            <option value="Best Available Rate">Best Available Rate (BAR)</option>
                                            <option value="Corporate Negotiated">Corporate Negotiated</option>
                                            <option value="Bed & Breakfast (CP)">Bed & Breakfast (CP)</option>
                                            <option value="Half Board (MAP)">Half Board (MAP)</option>
                                            <option value="Full Board (AP)">Full Board (AP)</option>
                                            <option value="Complimentary VIP">Complimentary (0 Rate)</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-[10.5px] font-semibold text-gray-700 mb-1">
                                            Nightly Base Rate (৳)
                                        </label>
                                        <input
                                            type="number"
                                            min={0}
                                            value={formData.roomRate}
                                            onChange={e => handleRateChange(Number(e.target.value) || 0)}
                                            className="w-full h-8 px-2.5 bg-gray-50 border border-gray-300 rounded text-xs outline-none focus:bg-white focus:border-blue-500 font-mono font-bold"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-[10.5px] font-semibold text-gray-700 mb-1">
                                            Discount (৳)
                                        </label>
                                        <input
                                            type="number"
                                            min={0}
                                            value={formData.discount}
                                            onChange={e => handleDiscountChange(Number(e.target.value) || 0)}
                                            className="w-full h-8 px-2.5 bg-gray-50 border border-gray-300 rounded text-xs outline-none focus:bg-white focus:border-blue-500 font-mono"
                                        />
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 bg-slate-50 p-2.5 rounded-lg border border-slate-200">
                                    <div>
                                        <span className="text-[10px] text-gray-500 block uppercase font-medium">Total Gross Amount</span>
                                        <span className="text-sm font-bold text-gray-900 font-mono">
                                            ৳ {formData.totalAmount.toLocaleString()}
                                        </span>
                                    </div>
                                    <div>
                                        <span className="text-[10px] text-gray-500 block uppercase font-medium">Paid / Advance Deposit</span>
                                        <input
                                            type="number"
                                            min={0}
                                            value={formData.paidAmount}
                                            onChange={e => setFormData(prev => ({ ...prev, paidAmount: Number(e.target.value) || 0 }))}
                                            className="w-full h-7 px-2 bg-white border border-gray-300 rounded text-xs outline-none focus:border-blue-500 font-mono font-bold text-emerald-700 mt-0.5"
                                        />
                                    </div>
                                    <div>
                                        <span className="text-[10px] text-gray-500 block uppercase font-medium">Balance Due</span>
                                        <span className="text-sm font-bold text-rose-600 font-mono block mt-1">
                                            ৳ {balanceDue.toLocaleString()}
                                        </span>
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                                    <div>
                                        <label className="block text-[10.5px] font-semibold text-gray-700 mb-1">
                                            Payment Method
                                        </label>
                                        <select
                                            value={formData.paymentMethod}
                                            onChange={e => setFormData(prev => ({ ...prev, paymentMethod: e.target.value }))}
                                            className="w-full h-8 px-2 bg-gray-50 border border-gray-300 rounded text-xs outline-none focus:bg-white focus:border-blue-500"
                                        >
                                            <option value="Credit Card">Credit Card</option>
                                            <option value="Debit Card">Debit Card</option>
                                            <option value="Cash">Cash (Front Desk)</option>
                                            <option value="bKash">bKash (MFS)</option>
                                            <option value="Nagad">Nagad (MFS)</option>
                                            <option value="Bank Transfer">Bank Wire Transfer</option>
                                            <option value="City Ledger">Bill to Company (BTC)</option>
                                        </select>
                                    </div>

                                    <div>
                                        <label className="block text-[10.5px] font-semibold text-gray-700 mb-1">
                                            Folio Billing Route
                                        </label>
                                        <select
                                            value={formData.billingRoute}
                                            onChange={e => setFormData(prev => ({ ...prev, billingRoute: e.target.value }))}
                                            className="w-full h-8 px-2 bg-gray-50 border border-gray-300 rounded text-xs outline-none focus:bg-white focus:border-blue-500 font-medium"
                                        >
                                            <option value="Self-Pay (Guest Folio)">Self-Pay (Guest Folio)</option>
                                            <option value="Bill to Company (BTC / City Ledger)">Bill to Company (BTC / City Ledger)</option>
                                            <option value="Split: Room to Company, Extras to Guest">Split: Room to Company, Extras to Guest</option>
                                        </select>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* TAB 4: Hospitality Preferences & Notes */}
                        {activeTab === 'notes' && (
                            <div className="space-y-3 animate-in fade-in duration-100">
                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                                    <div>
                                        <label className="block text-[10.5px] font-semibold text-gray-700 mb-1">Bed Setup</label>
                                        <select
                                            value={formData.bedType}
                                            onChange={e => setFormData(prev => ({ ...prev, bedType: e.target.value }))}
                                            className="w-full h-8 px-2 bg-gray-50 border border-gray-300 rounded text-xs outline-none focus:bg-white focus:border-blue-500"
                                        >
                                            <option>King Bed</option>
                                            <option>Twin Beds</option>
                                            <option>Queen Bed</option>
                                            <option>Extra Rollaway Bed</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-[10.5px] font-semibold text-gray-700 mb-1">Smoking Rule</label>
                                        <select
                                            value={formData.smoking}
                                            onChange={e => setFormData(prev => ({ ...prev, smoking: e.target.value }))}
                                            className="w-full h-8 px-2 bg-gray-50 border border-gray-300 rounded text-xs outline-none focus:bg-white focus:border-blue-500"
                                        >
                                            <option>Non-Smoking</option>
                                            <option>Smoking Room</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-[10.5px] font-semibold text-gray-700 mb-1">Floor Preference</label>
                                        <select
                                            value={formData.floorPreference}
                                            onChange={e => setFormData(prev => ({ ...prev, floorPreference: e.target.value }))}
                                            className="w-full h-8 px-2 bg-gray-50 border border-gray-300 rounded text-xs outline-none focus:bg-white focus:border-blue-500"
                                        >
                                            <option>High Floor</option>
                                            <option>Low / Ground Floor</option>
                                            <option>Quiet / Corner Room</option>
                                            <option>Pool / Garden View</option>
                                        </select>
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                                    <div>
                                        <label className="block text-[10.5px] font-semibold text-gray-700 mb-1">Booking Channel / Source</label>
                                        <select
                                            value={formData.bookingSource}
                                            onChange={e => setFormData(prev => ({ ...prev, bookingSource: e.target.value }))}
                                            className="w-full h-8 px-2 bg-gray-50 border border-gray-300 rounded text-xs outline-none focus:bg-white focus:border-blue-500 font-medium"
                                        >
                                            <option value="Direct Walk-In">Direct Walk-In (Front Desk)</option>
                                            <option value="Direct Phone">Direct Phone Reservation</option>
                                            <option value="Brand Website">Hotel Brand Website</option>
                                            <option value="Booking.com">Booking.com OTA</option>
                                            <option value="Agoda">Agoda OTA</option>
                                            <option value="Expedia">Expedia</option>
                                            <option value="Corporate Partner">Corporate Contract Partner</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-[10.5px] font-semibold text-gray-700 mb-1">Estimated Arrival (ETA)</label>
                                        <input
                                            type="time"
                                            value={formData.eta}
                                            onChange={e => setFormData(prev => ({ ...prev, eta: e.target.value }))}
                                            className="w-full h-8 px-2 bg-gray-50 border border-gray-300 rounded text-xs outline-none focus:bg-white focus:border-blue-500 font-mono"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-[10.5px] font-semibold text-gray-700 mb-1">Estimated Departure (ETD)</label>
                                        <input
                                            type="time"
                                            value={formData.etd}
                                            onChange={e => setFormData(prev => ({ ...prev, etd: e.target.value }))}
                                            className="w-full h-8 px-2 bg-gray-50 border border-gray-300 rounded text-xs outline-none focus:bg-white focus:border-blue-500 font-mono"
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-[10.5px] font-semibold text-gray-700 mb-1">
                                        Special Requests & Front Desk Remarks
                                    </label>
                                    <textarea
                                        rows={3}
                                        value={formData.specialRequests}
                                        onChange={e => setFormData(prev => ({ ...prev, specialRequests: e.target.value }))}
                                        className="w-full p-2.5 bg-gray-50 border border-gray-300 rounded text-xs outline-none focus:bg-white focus:border-blue-500 resize-none"
                                        placeholder="e.g. Airport pick-up requested at 18:00, honeymoon cake setup, late checkout till 14:00 approved."
                                    />
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Footer */}
                    <div className="px-4 py-2.5 bg-slate-50 border-t border-gray-200 flex items-center justify-between flex-shrink-0">
                        <div className="flex items-center gap-2 text-xs">
                            <span className="font-semibold text-gray-800">
                                {formData.nights} Nts • {formData.roomNumber ? `Room ${formData.roomNumber}` : 'Unassigned'}
                            </span>
                            <span className="text-gray-400">•</span>
                            <span className="font-mono font-bold text-gray-900">
                                ৳ {formData.totalAmount.toLocaleString()}
                            </span>
                            {balanceDue > 0 && (
                                <span className="text-[10px] text-rose-600 font-mono">
                                    (Due: ৳ {balanceDue.toLocaleString()})
                                </span>
                            )}
                        </div>

                        <div className="flex items-center gap-2">
                            <button
                                type="button"
                                onClick={onClose}
                                disabled={isSaving}
                                className="px-3 py-1.5 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-100 font-semibold text-xs transition-colors cursor-pointer"
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                disabled={isSaving || saveSuccess}
                                className={`px-4 py-1.5 rounded-lg font-bold text-xs flex items-center gap-1.5 shadow-sm transition-all cursor-pointer ${
                                    saveSuccess
                                        ? 'bg-emerald-600 text-white'
                                        : 'bg-blue-600 hover:bg-blue-700 text-white'
                                }`}
                            >
                                {isSaving ? (
                                    <>
                                        <Loader2 size={13} className="animate-spin" />
                                        <span>Saving...</span>
                                    </>
                                ) : saveSuccess ? (
                                    <>
                                        <Check size={13} />
                                        <span>Updated!</span>
                                    </>
                                ) : (
                                    <span>Save & Apply Changes</span>
                                )}
                            </button>
                        </div>
                    </div>
                </form>
            </div>
        </div>,
        document.body
    );
};
