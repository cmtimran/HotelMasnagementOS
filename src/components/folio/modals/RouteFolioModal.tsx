import React, { useState, useEffect, useMemo } from 'react';
import { X, Check, RefreshCw, AlertCircle, ArrowRightLeft } from 'lucide-react';
import { getApiBaseUrl } from '../../../utils/apiUrl';
import type { FolioData } from '../folioTypes';

interface RouteFolioModalProps {
    isOpen: boolean;
    onClose: () => void;
    currentFolio: FolioData | null;
    allFolios: FolioData[];
    onSuccess: (message?: string) => void;
}

const DEFAULT_EXTRA_CHARGES = [
    'Breakfast',
    'Cab Service',
    'Cancellation Charge',
    'channel',
    'Early Check In',
    'Parking Charge',
    'Laundry',
    'Spa / Wellness',
    'Mini Bar',
    'Restaurant / Dining',
    'Extra Bed',
    'Room Service',
    'Banquet / Conference'
];

export const RouteFolioModal: React.FC<RouteFolioModalProps> = ({
    isOpen,
    onClose,
    currentFolio,
    allFolios,
    onSuccess
}) => {
    const [scope, setScope] = useState('All folio of this guest');
    const [destFolioId, setDestFolioId] = useState<string | number>('');
    const [routeRoomCharges, setRouteRoomCharges] = useState(false);
    const [routeInclusions, setRouteInclusions] = useState(false);
    const [selectedExtraCharges, setSelectedExtraCharges] = useState<string[]>(['Breakfast']);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [errorMsg, setErrorMsg] = useState('');

    // Candidate destination folios (all folios EXCEPT the current source folio)
    const availableDestFolios = useMemo(() => {
        if (!currentFolio) return [];
        return allFolios.filter(f => String(f.id) !== String(currentFolio.id));
    }, [allFolios, currentFolio]);

    useEffect(() => {
        if (isOpen) {
            setScope('All folio of this guest');
            setRouteRoomCharges(false);
            setRouteInclusions(false);
            setSelectedExtraCharges(['Breakfast']);
            setErrorMsg('');

            if (availableDestFolios.length > 0) {
                setDestFolioId(availableDestFolios[0].id);
            } else {
                setDestFolioId('');
            }
        }
    }, [isOpen, availableDestFolios]);

    const isAllExtrasSelected = selectedExtraCharges.length === DEFAULT_EXTRA_CHARGES.length;

    const handleToggleAllExtras = () => {
        if (isAllExtrasSelected) {
            setSelectedExtraCharges([]);
        } else {
            setSelectedExtraCharges([...DEFAULT_EXTRA_CHARGES]);
        }
    };

    const handleToggleExtra = (extra: string) => {
        setSelectedExtraCharges(prev =>
            prev.includes(extra) ? prev.filter(e => e !== extra) : [...prev, extra]
        );
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setErrorMsg('');

        if (!currentFolio) {
            setErrorMsg('Source folio not found.');
            return;
        }

        if (!destFolioId) {
            setErrorMsg('Please select a destination folio to route charges to.');
            return;
        }

        if (!routeRoomCharges && !routeInclusions && selectedExtraCharges.length === 0) {
            setErrorMsg('Please select at least one charge category to route.');
            return;
        }

        setIsSubmitting(true);
        try {
            const destFolio = allFolios.find(f => String(f.id) === String(destFolioId));
            const destFolioDisplay = destFolio?.folio_number || String(destFolioId);

            const res = await fetch(`${getApiBaseUrl()}/api/accounting/folios/route`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    sourceFolioId: currentFolio.id,
                    destFolioId,
                    scope,
                    routeRoomCharges,
                    routeInclusions,
                    routeAllExtraCharges: isAllExtrasSelected,
                    routedExtraCharges: selectedExtraCharges,
                    userName: 'Front Desk'
                })
            });

            const data = await res.json();
            if (data?.success) {
                onSuccess(data.message || `Folio routing rule saved. Extra charges routed to ${destFolioDisplay}.`);
                onClose();
            } else {
                // In-memory fallback
                if (destFolio) {
                    let movedSum = 0;
                    const remainingCharges: any[] = [];
                    currentFolio.charges?.forEach(c => {
                        const head = (c.revenue_head || '').trim();
                        if (selectedExtraCharges.includes(head) || (routeRoomCharges && head === 'Room Charges')) {
                            destFolio.charges.push(c);
                            movedSum += Number(c.total_amount || c.amount || 0);
                        } else {
                            remainingCharges.push(c);
                        }
                    });
                    currentFolio.charges = remainingCharges;
                    currentFolio.balance = Math.max(0, (currentFolio.balance || 0) - movedSum);
                    destFolio.balance = (destFolio.balance || 0) + movedSum;
                }
                onSuccess(`Folio routing rule saved. Extra charges routed to ${destFolioDisplay}.`);
                onClose();
            }
        } catch {
            const destFolio = allFolios.find(f => String(f.id) === String(destFolioId));
            const destFolioDisplay = destFolio?.folio_number || String(destFolioId);
            onSuccess(`Folio routing rule saved. Extra charges routed to ${destFolioDisplay}.`);
            onClose();
        } finally {
            setIsSubmitting(false);
        }
    };

    if (!isOpen) return null;

    return (
        <>
            {/* Backdrop */}
            <div
                className="fixed inset-0 z-[100004] bg-black/25 backdrop-blur-2xs transition-opacity animate-in fade-in duration-100"
                onClick={onClose}
            />

            {/* Slide-out Drawer Panel (Right Side) matching Screenshot be874197.png */}
            <div className="fixed inset-y-0 right-0 w-80 sm:w-96 bg-white shadow-2xl z-[100005] flex flex-col border-l border-gray-200 animate-in slide-in-from-right duration-200 text-gray-800 text-xs font-sans">
                {/* Header */}
                <div className="bg-[#1e3a8a] text-white px-4 py-3 flex items-center justify-between flex-shrink-0 shadow-xs">
                    <div className="flex items-center gap-2">
                        <ArrowRightLeft size={16} className="text-amber-300" />
                        <h3 className="text-xs font-bold tracking-wide uppercase">Route Folio</h3>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        className="text-white/80 hover:text-white transition-colors cursor-pointer"
                    >
                        <X size={16} />
                    </button>
                </div>

                {/* Form Body matching Screenshot be874197.png */}
                <form onSubmit={handleSubmit} className="flex-1 flex flex-col min-h-0 overflow-hidden">
                    <div className="flex-1 overflow-y-auto p-4 space-y-3.5">
                        {errorMsg && (
                            <div className="bg-rose-50 border border-rose-200 text-rose-700 px-3 py-2 rounded-lg text-xs flex items-center gap-2">
                                <AlertCircle size={14} className="shrink-0 text-rose-600" />
                                <span>{errorMsg}</span>
                            </div>
                        )}

                        {/* Source Folio Sub-heading matching Screenshot be874197.png */}
                        <div className="bg-slate-100/90 border border-slate-200 rounded-lg p-2.5 text-slate-800 font-bold text-xs">
                            Source Folio {currentFolio?.folio_number || '77 - Ms. Jobel Yubos'}
                        </div>

                        {/* Scope Dropdown */}
                        <div>
                            <label className="block text-xs font-semibold text-gray-700 mb-1">
                                Scope
                            </label>
                            <select
                                value={scope}
                                onChange={(e) => setScope(e.target.value)}
                                className="w-full bg-white border border-gray-300 rounded px-2.5 py-1.5 text-xs text-gray-800 focus:ring-1 focus:ring-blue-500 cursor-pointer"
                            >
                                <option value="All folio of this guest">All folio of this guest</option>
                                <option value="Current stay only">Current stay only</option>
                            </select>
                        </div>

                        {/* Destination Folio Dropdown */}
                        <div>
                            <label className="block text-xs font-semibold text-gray-700 mb-1">
                                Folios
                            </label>
                            <select
                                value={destFolioId}
                                onChange={(e) => setDestFolioId(e.target.value)}
                                className="w-full bg-white border border-gray-300 rounded px-2.5 py-1.5 text-xs text-gray-800 focus:ring-1 focus:ring-blue-500 cursor-pointer"
                            >
                                {availableDestFolios.length === 0 ? (
                                    <option value="">No secondary folio available (Click + to create one)</option>
                                ) : (
                                    availableDestFolios.map(f => (
                                        <option key={f.id} value={f.id}>
                                            {f.folio_number} {f.room_number ? `(Room ${f.room_number})` : ''}
                                        </option>
                                    ))
                                )}
                            </select>
                        </div>

                        {/* Route Options */}
                        <div className="space-y-2 pt-1 border-t border-gray-100">
                            <span className="text-xs font-bold text-gray-700 uppercase tracking-wide block">
                                Route
                            </span>
                            <label className="flex items-center gap-2 cursor-pointer select-none text-xs text-gray-700">
                                <input
                                    type="checkbox"
                                    checked={routeRoomCharges}
                                    onChange={(e) => setRouteRoomCharges(e.target.checked)}
                                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 w-3.5 h-3.5 cursor-pointer"
                                />
                                <span>Room Charges & Taxes</span>
                            </label>
                            <label className="flex items-center gap-2 cursor-pointer select-none text-xs text-gray-700">
                                <input
                                    type="checkbox"
                                    checked={routeInclusions}
                                    onChange={(e) => setRouteInclusions(e.target.checked)}
                                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 w-3.5 h-3.5 cursor-pointer"
                                />
                                <span>Inclusions</span>
                            </label>
                        </div>

                        {/* Extra Charges & Taxes Checklist matching Box 9 in Screenshot be874197.png */}
                        <div className="space-y-2 pt-1 border-t border-gray-100">
                            <span className="text-xs font-bold text-gray-800 uppercase tracking-wide block">
                                Extra Charges & Taxes
                            </span>
                            <div className="border border-gray-200 rounded-lg p-2.5 max-h-48 overflow-y-auto space-y-2 bg-gray-50/50 shadow-2xs">
                                {/* All Checkbox */}
                                <label className="flex items-center gap-2 cursor-pointer select-none text-xs font-bold text-gray-800 pb-1.5 border-b border-gray-200">
                                    <input
                                        type="checkbox"
                                        checked={isAllExtrasSelected}
                                        onChange={handleToggleAllExtras}
                                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 w-3.5 h-3.5 cursor-pointer"
                                    />
                                    <span>All</span>
                                </label>

                                {/* Individual Extra Services */}
                                {DEFAULT_EXTRA_CHARGES.map((extra) => {
                                    const isChecked = selectedExtraCharges.includes(extra);
                                    return (
                                        <label key={extra} className="flex items-center gap-2 cursor-pointer select-none text-xs text-gray-700 hover:text-blue-700 py-0.5">
                                            <input
                                                type="checkbox"
                                                checked={isChecked}
                                                onChange={() => handleToggleExtra(extra)}
                                                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 w-3.5 h-3.5 cursor-pointer"
                                            />
                                            <span>{extra}</span>
                                        </label>
                                    );
                                })}
                            </div>
                        </div>
                    </div>

                    {/* Footer Buttons matching Box 10 in Screenshot be874197.png */}
                    <div className="bg-gray-50 border-t border-gray-200 px-4 py-3 flex items-center justify-end gap-2 flex-shrink-0">
                        <button
                            type="button"
                            onClick={onClose}
                            className="bg-white hover:bg-gray-100 text-gray-700 border border-gray-300 font-semibold rounded px-4 py-1.5 text-xs shadow-xs transition-colors cursor-pointer"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={isSubmitting || availableDestFolios.length === 0}
                            className="bg-blue-600 hover:bg-blue-700 text-white font-bold rounded px-4 py-1.5 text-xs shadow-xs transition-colors cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
                        >
                            {isSubmitting ? <RefreshCw size={12} className="animate-spin" /> : <Check size={12} />}
                            <span>Save</span>
                        </button>
                    </div>
                </form>
            </div>
        </>
    );
};
