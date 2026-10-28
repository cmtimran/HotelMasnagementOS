import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
    X,
    Check,
    CheckCircle2,
    AlertTriangle,
    Sparkles,
    BedDouble,
    RotateCcw,
    CalendarRange,
    Calendar,
    ArrowRight
} from 'lucide-react';
import { getAvailableRoomsForStay, isMatchingRoomType } from '../../utils/roomInventoryEngine';
import { getNextDayISO } from '../common/StayPeriodPicker';

export interface RoomStayConfig {
    roomNumber: string;
    checkIn: string;
    checkOut: string;
    nights: number;
}

export interface MultiRoomSelectorModalProps {
    isOpen: boolean;
    onClose: () => void;
    roomType: string;
    requiredCount: number;
    checkIn: string;
    checkOut: string;
    currentSelected: string[];
    onConfirm: (
        selectedRooms: string[],
        roomDatesMap?: Record<string, { checkIn: string; checkOut: string; nights: number }>,
        isAuto?: boolean
    ) => void;
    otherRowsTakenRooms?: string[];
    isAutoMode?: boolean;
    initialRoomDatesMap?: Record<string, { checkIn: string; checkOut: string; nights: number }>;
}

export const MultiRoomSelectorModal: React.FC<MultiRoomSelectorModalProps> = ({
    isOpen,
    onClose,
    roomType,
    requiredCount,
    checkIn,
    checkOut,
    currentSelected,
    onConfirm,
    otherRowsTakenRooms = [],
    isAutoMode = false,
    initialRoomDatesMap = {}
}) => {
    const [selectedRooms, setSelectedRooms] = useState<string[]>([]);
    const [roomDatesMap, setRoomDatesMap] = useState<Record<string, { checkIn: string; checkOut: string; nights: number }>>({});
    const [customDatesEnabled, setCustomDatesEnabled] = useState<boolean>(false);
    const [isAuto, setIsAuto] = useState<boolean>(isAutoMode);
    const prevIsOpenRef = useRef(false);

    // Default duration for group
    const defaultGroupNights = useMemo(() => {
        const diff = Math.round((new Date(checkOut).getTime() - new Date(checkIn).getTime()) / (1000 * 60 * 60 * 24));
        return Math.max(1, isNaN(diff) ? 1 : diff);
    }, [checkIn, checkOut]);

    // Fetch live availability for this stay window
    const report = useMemo(() => {
        return getAvailableRoomsForStay(checkIn, checkOut, roomType);
    }, [checkIn, checkOut, roomType, isOpen]);

    // Matching rooms of this category
    const categoryRooms = useMemo(() => {
        return report.allRoomsStatus.filter(st => isMatchingRoomType(st.room.roomTypeName, roomType));
    }, [report, roomType]);

    // Available rooms in this category (excluding other rows)
    const availableRooms = useMemo(() => {
        const otherSet = new Set(otherRowsTakenRooms || []);
        return categoryRooms.filter(st => st.isAvailable && !otherSet.has(st.room.number));
    }, [categoryRooms, otherRowsTakenRooms]);

    // Initialize selection on modal open (ONLY when modal transitions from closed to open)
    useEffect(() => {
        if (isOpen && !prevIsOpenRef.current) {
            setIsAuto(Boolean(isAutoMode));
            const defaultN = Math.max(1, Math.round((new Date(checkOut).getTime() - new Date(checkIn).getTime()) / (1000 * 60 * 60 * 24)));
            const datesMap: Record<string, { checkIn: string; checkOut: string; nights: number }> = { ...(initialRoomDatesMap || {}) };

            let picked: string[] = [];
            if (currentSelected && currentSelected.length > 0) {
                const valid = currentSelected.filter(rm => 
                    availableRooms.some(ar => ar.room.number === rm)
                );
                if (valid.length < requiredCount) {
                    const needed = requiredCount - valid.length;
                    const pool = availableRooms
                        .map(ar => ar.room.number)
                        .filter(rm => !valid.includes(rm));
                    picked = [...valid, ...pool.slice(0, needed)];
                } else {
                    picked = valid.slice(0, requiredCount);
                }
            } else {
                picked = availableRooms.slice(0, requiredCount).map(ar => ar.room.number);
            }

            let hasCustomDates = false;
            picked.forEach(rm => {
                if (!datesMap[rm]) {
                    datesMap[rm] = { checkIn, checkOut, nights: defaultN };
                } else {
                    const c = datesMap[rm];
                    if (c.checkIn !== checkIn || c.checkOut !== checkOut || c.nights !== defaultN) {
                        hasCustomDates = true;
                    }
                }
            });

            setSelectedRooms(picked);
            setRoomDatesMap(datesMap);
            setCustomDatesEnabled(hasCustomDates);
        }
        prevIsOpenRef.current = isOpen;
    }, [isOpen]);

    if (!isOpen) return null;

    const isComplete = selectedRooms.length === requiredCount;
    const remainingToPick = requiredCount - selectedRooms.length;

    // Summary calculations across assigned rooms
    const staySummary = (() => {
        let minIn = checkIn;
        let maxOut = checkOut;
        let totalRoomNights = 0;

        selectedRooms.forEach(rm => {
            const conf = roomDatesMap[rm] || { checkIn, checkOut, nights: defaultGroupNights };
            totalRoomNights += conf.nights;
            if (!minIn || conf.checkIn < minIn) minIn = conf.checkIn;
            if (!maxOut || conf.checkOut > maxOut) maxOut = conf.checkOut;
        });

        return {
            minIn,
            maxOut,
            totalRoomNights: totalRoomNights || selectedRooms.length * defaultGroupNights
        };
    })();

    const handleToggleRoom = (roomNum: string, isAvailable: boolean) => {
        if (!isAvailable) return;
        setIsAuto(false);

        if (selectedRooms.includes(roomNum)) {
            setSelectedRooms(prev => prev.filter(r => r !== roomNum));
        } else {
            if (selectedRooms.length >= requiredCount) {
                // Replace last room if already reached required count
                setSelectedRooms(prev => [...prev.slice(0, requiredCount - 1), roomNum]);
            } else {
                setSelectedRooms(prev => [...prev, roomNum]);
            }
            if (!roomDatesMap[roomNum]) {
                setRoomDatesMap(prev => ({
                    ...prev,
                    [roomNum]: { checkIn, checkOut, nights: defaultGroupNights }
                }));
            }
        }
    };

    const handleAutoSelectAll = () => {
        setIsAuto(true);
        const picked = availableRooms.slice(0, requiredCount).map(ar => ar.room.number);
        setSelectedRooms(picked);
        const newDates = { ...roomDatesMap };
        picked.forEach(rm => {
            if (!newDates[rm]) newDates[rm] = { checkIn, checkOut, nights: defaultGroupNights };
        });
        setRoomDatesMap(newDates);
    };

    const handleClearAll = () => {
        setSelectedRooms([]);
        setIsAuto(false);
    };

    const handleSyncAllToMaster = () => {
        const synced: Record<string, { checkIn: string; checkOut: string; nights: number }> = {};
        selectedRooms.forEach(rm => {
            synced[rm] = { checkIn, checkOut, nights: defaultGroupNights };
        });
        setRoomDatesMap(synced);
    };

    const handleToggleCustomDates = (enabled: boolean) => {
        setCustomDatesEnabled(enabled);
        if (!enabled) {
            handleSyncAllToMaster();
        }
    };

    const handleRoomCheckInChange = (rm: string, newIn: string) => {
        const curOut = roomDatesMap[rm]?.checkOut || checkOut;
        const newOut = newIn >= curOut ? getNextDayISO(newIn, 1) : curOut;
        const diff = Math.max(1, Math.round((new Date(newOut).getTime() - new Date(newIn).getTime()) / (1000 * 60 * 60 * 24)));
        setRoomDatesMap(prev => ({
            ...prev,
            [rm]: { checkIn: newIn, checkOut: newOut, nights: diff }
        }));
    };

    const handleRoomCheckOutChange = (rm: string, newOut: string) => {
        const curIn = roomDatesMap[rm]?.checkIn || checkIn;
        const diff = Math.max(1, Math.round((new Date(newOut).getTime() - new Date(curIn).getTime()) / (1000 * 60 * 60 * 24)));
        setRoomDatesMap(prev => ({
            ...prev,
            [rm]: { checkIn: curIn, checkOut: newOut, nights: diff }
        }));
    };

    const handleSave = () => {
        let finalSelection: string[] = [];
        if (selectedRooms.length < requiredCount) {
            const needed = requiredCount - selectedRooms.length;
            const extra = availableRooms
                .map(ar => ar.room.number)
                .filter(rm => !selectedRooms.includes(rm))
                .slice(0, needed);
            finalSelection = [...selectedRooms, ...extra];
        } else {
            finalSelection = selectedRooms.slice(0, requiredCount);
        }

        const finalDatesMap: Record<string, { checkIn: string; checkOut: string; nights: number }> = { ...roomDatesMap };
        finalSelection.forEach(rm => {
            if (!finalDatesMap[rm]) {
                finalDatesMap[rm] = { checkIn, checkOut, nights: defaultGroupNights };
            }
        });

        onConfirm(finalSelection, customDatesEnabled ? finalDatesMap : undefined, isAuto);
        onClose();
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4 animate-in fade-in duration-150">
            <div 
                className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-3xl flex flex-col max-h-[92vh] overflow-hidden transition-all"
                onClick={e => e.stopPropagation()}
            >
                {/* Header */}
                <div className="px-6 py-4 bg-gradient-to-r from-slate-50 via-blue-50/30 to-indigo-50/20 border-b border-slate-200 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-xs">
                            <BedDouble size={22} />
                        </div>
                        <div>
                            <div className="flex items-center gap-2">
                                <h3 className="text-base font-extrabold text-slate-800 tracking-tight">
                                    {requiredCount > 1 ? 'Multi-Room Assignment' : 'Room Assignment'}: {roomType}
                                </h3>
                                {isAuto ? (
                                    <button
                                        type="button"
                                        onClick={() => setIsAuto(false)}
                                        className="text-[10px] px-2 py-0.5 rounded-full bg-blue-100 hover:bg-blue-200 text-blue-800 flex items-center gap-1 border border-blue-200 cursor-pointer transition-colors"
                                        title="Auto Allocation mode. Click to switch to Manual mode"
                                    >
                                        <Sparkles size={11} className="text-blue-600" />
                                        <span className="font-bold">Auto Mode</span>
                                    </button>
                                ) : (
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setIsAuto(true);
                                            handleAutoSelectAll();
                                        }}
                                        className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-100 hover:bg-emerald-200 text-emerald-800 flex items-center gap-1 border border-emerald-200 cursor-pointer transition-colors"
                                        title="Manual Assignment mode. Click to switch to Auto Pick"
                                    >
                                        <CheckCircle2 size={11} className="text-emerald-600" />
                                        <span className="font-bold">Manual Mode</span>
                                    </button>
                                )}
                            </div>
                            <div className="flex items-center gap-2 mt-0.5 text-xs text-slate-500">
                                <span>Target: <strong className="text-blue-700 font-bold">{requiredCount} {requiredCount > 1 ? 'rooms' : 'room'}</strong></span>
                                <span className="text-slate-300">•</span>
                                <span className="flex items-center gap-1 font-medium text-slate-700 bg-white/90 px-2 py-0.5 rounded border border-slate-200/80 shadow-2xs">
                                    <Calendar size={12} className="text-blue-600" />
                                    Master Stay: <strong className="text-blue-950 font-bold">{checkIn}</strong> ➔ <strong className="text-blue-950 font-bold">{checkOut}</strong> ({defaultGroupNights}N)
                                </span>
                            </div>
                        </div>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 rounded-lg transition-colors cursor-pointer"
                        title="Close modal"
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* Status & Control Toolbar */}
                <div className="px-6 py-3 bg-slate-50/80 border-b border-slate-200/90 flex flex-wrap items-center justify-between gap-3 text-xs">
                    <div className="flex items-center gap-3">
                        <div className={`flex items-center gap-1.5 px-3 py-1 rounded-full border shadow-2xs transition-all ${
                            isComplete 
                                ? 'bg-emerald-50 text-emerald-800 border-emerald-300' 
                                : 'bg-amber-50 text-amber-800 border-amber-300'
                        }`}>
                            {isComplete ? <CheckCircle2 size={15} className="text-emerald-600" /> : <AlertTriangle size={15} className="text-amber-600" />}
                            <span>{selectedRooms.length} of {requiredCount} {requiredCount === 1 ? 'Room' : 'Rooms'} Selected</span>
                        </div>
                        {!isComplete && remainingToPick > 0 && (
                            <span className="text-[11.5px] text-amber-700 font-semibold">
                                (Pick {remainingToPick} more)
                            </span>
                        )}
                        <span className={`text-[10.5px] font-semibold px-2 py-0.5 rounded-md ${
                            isAuto ? 'bg-blue-100/90 text-blue-700' : 'bg-emerald-100/90 text-emerald-800'
                        }`}>
                            {isAuto ? '✨ Auto' : '✓ Manual'}
                        </span>
                    </div>

                    <div className="flex items-center gap-2">
                        {/* Toggle Custom Stay Dates per Room */}
                        <button
                            type="button"
                            onClick={() => handleToggleCustomDates(!customDatesEnabled)}
                            className={`px-3 py-1.5 rounded-lg text-xs flex items-center gap-1.5 border shadow-2xs cursor-pointer transition-all ${
                                customDatesEnabled
                                    ? 'bg-blue-600 text-white border-blue-600 hover:bg-blue-700'
                                    : 'bg-white hover:bg-blue-50 text-blue-800 border-blue-300 hover:border-blue-400'
                            }`}
                            title="Toggle custom check-in & check-out dates for each room"
                        >
                            <CalendarRange size={13} className={customDatesEnabled ? "text-white" : "text-blue-600"} />
                            <span>{customDatesEnabled ? "Custom Dates: ON" : "Custom Dates per Room"}</span>
                        </button>

                        <button
                            type="button"
                            onClick={handleAutoSelectAll}
                            className="px-3 py-1.5 bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow-2xs cursor-pointer transition-all"
                            title="Automatically assign first available rooms"
                        >
                            <Sparkles size={12} className="text-blue-600" />
                            <span>Auto Pick</span>
                        </button>

                        {selectedRooms.length > 0 && (
                            <button
                                type="button"
                                onClick={handleClearAll}
                                className="px-2.5 py-1.5 bg-white hover:bg-red-50 text-slate-600 hover:text-red-700 border border-slate-200 rounded-lg text-xs font-semibold flex items-center gap-1 shadow-2xs cursor-pointer transition-all"
                                title="Clear all selected rooms"
                            >
                                <RotateCcw size={11} />
                                <span>Clear</span>
                            </button>
                        )}
                    </div>
                </div>

                {/* Middle Section: Assigned Rooms & Stay Schedule */}
                <div className="px-6 py-4 bg-white border-b border-slate-200">
                    {!customDatesEnabled ? (
                        /* Standard Mode: Clean, elegant room chips ribbon */
                        <div>
                            <div className="flex items-center justify-between mb-2">
                                <div className="flex items-center gap-2">
                                    <span className="text-xs uppercase tracking-wider text-slate-700">
                                        Assigned Rooms ({selectedRooms.length} of {requiredCount})
                                    </span>
                                    <span className="text-[11px] text-slate-500 font-medium">
                                        All rooms stay: <strong className="text-blue-900">{checkIn}</strong> to <strong className="text-blue-900">{checkOut}</strong> ({defaultGroupNights}N)
                                    </span>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => handleToggleCustomDates(true)}
                                    className="text-xs text-blue-700 hover:text-blue-900 hover:underline flex items-center gap-1 cursor-pointer"
                                >
                                    <span>Different dates per room?</span>
                                    <ArrowRight size={12} />
                                </button>
                            </div>

                            {selectedRooms.length === 0 ? (
                                <div className="py-3 px-4 rounded-xl border border-dashed border-slate-300 bg-slate-50/50 text-center text-xs text-slate-400 italic">
                                    No rooms selected yet. Click any available room in the floor grid below or click "Auto Pick".
                                </div>
                            ) : (
                                <div className="flex flex-wrap items-center gap-2">
                                    {selectedRooms.map((rm, idx) => (
                                        <div 
                                            key={rm}
                                            className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-blue-50/90 border border-blue-200 text-blue-950 shadow-2xs font-semibold text-xs transition-all hover:bg-blue-100 group"
                                        >
                                            <span className="w-5 h-5 rounded bg-blue-600 text-white font-mono text-[10px] flex items-center justify-center">
                                                {idx + 1}
                                            </span>
                                            <span className="font-mono text-sm tracking-tight">Rm {rm}</span>
                                            <span className="text-[10px] text-blue-800 bg-white px-1.5 py-0.5 rounded border border-blue-200/80 font-mono">
                                                {defaultGroupNights}N
                                            </span>
                                            <button
                                                type="button"
                                                onClick={() => setSelectedRooms(prev => prev.filter(r => r !== rm))}
                                                className="text-slate-400 hover:text-red-600 p-0.5 rounded cursor-pointer transition-colors ml-0.5"
                                                title={`Remove Room ${rm}`}
                                            >
                                                <X size={13} />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    ) : (
                        /* Custom Dates Mode: Professional Schedule Matrix Table */
                        <div className="border border-blue-200/90 rounded-xl overflow-hidden bg-white shadow-2xs">
                            <div className="px-4 py-2.5 bg-gradient-to-r from-blue-50/90 via-indigo-50/50 to-blue-50/90 border-b border-blue-200 flex flex-wrap items-center justify-between gap-2">
                                <div className="flex items-center gap-2">
                                    <CalendarRange size={15} className="text-blue-600" />
                                    <span className="text-xs font-extrabold text-blue-950">
                                        Per-Room Stay Schedule ({selectedRooms.length} Rooms)
                                    </span>
                                    <span className="text-[11px] text-slate-500 font-medium">
                                        Adjust individual check-in and check-out dates below
                                    </span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <button
                                        type="button"
                                        onClick={handleSyncAllToMaster}
                                        className="text-[11px] text-blue-700 hover:text-blue-900 bg-white hover:bg-blue-50 px-2.5 py-1 rounded-md border border-blue-200 shadow-2xs flex items-center gap-1 cursor-pointer transition-all"
                                        title={`Reset all room dates to ${checkIn} ➔ ${checkOut}`}
                                    >
                                        <RotateCcw size={11} className="text-blue-600" />
                                        <span>Reset to Master ({checkIn} ➔ {checkOut})</span>
                                    </button>
                                </div>
                            </div>

                            {selectedRooms.length === 0 ? (
                                <div className="py-4 text-center text-xs text-slate-400 italic">
                                    No rooms selected yet. Select rooms from the grid below to customize their stay dates.
                                </div>
                            ) : (
                                <div className="overflow-x-auto max-h-52 overflow-y-auto">
                                    <table className="w-full text-left border-collapse text-xs">
                                        <thead>
                                            <tr className="bg-slate-50/90 border-b border-slate-200 text-slate-600 text-[10.5px] uppercase tracking-wider">
                                                <th className="py-2 px-3 w-32">Assigned Room</th>
                                                <th className="py-2 px-3 text-center w-40">Check-In Date</th>
                                                <th className="py-2 px-1 text-center w-6"></th>
                                                <th className="py-2 px-3 text-center w-40">Check-Out Date</th>
                                                <th className="py-2 px-3 text-center w-28">Nights</th>
                                                <th className="py-2 px-3 text-center w-16">Action</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100">
                                            {selectedRooms.map((rm, idx) => {
                                                const conf = roomDatesMap[rm] || {
                                                    checkIn,
                                                    checkOut,
                                                    nights: defaultGroupNights
                                                };
                                                const isDifferentFromMaster = conf.checkIn !== checkIn || conf.checkOut !== checkOut || conf.nights !== defaultGroupNights;

                                                return (
                                                    <tr key={rm} className={`hover:bg-blue-50/30 transition-colors ${isDifferentFromMaster ? 'bg-blue-50/20' : ''}`}>
                                                        <td className="py-2 px-3">
                                                            <div className="flex items-center gap-2">
                                                                <span className="w-5 h-5 rounded bg-blue-600 text-white font-mono text-[10px] flex items-center justify-center flex-shrink-0">
                                                                    #{idx + 1}
                                                                </span>
                                                                <div>
                                                                    <span className="font-mono text-sm text-slate-900 block leading-tight">
                                                                        Room {rm}
                                                                    </span>
                                                                    <span className="text-[9.5px] text-slate-500 font-medium">
                                                                        {roomType}
                                                                    </span>
                                                                </div>
                                                            </div>
                                                        </td>
                                                        <td className="py-2 px-3 text-center">
                                                            <input
                                                                type="date"
                                                                value={conf.checkIn}
                                                                onChange={e => handleRoomCheckInChange(rm, e.target.value)}
                                                                className="w-36 h-8 px-2 text-xs font-mono border border-slate-200 rounded-md bg-white text-slate-800 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-400 shadow-2xs"
                                                                title="Check-In Date"
                                                            />
                                                        </td>
                                                        <td className="py-2 px-1 text-center text-slate-400 font-bold">
                                                            ➔
                                                        </td>
                                                        <td className="py-2 px-3 text-center">
                                                            <input
                                                                type="date"
                                                                value={conf.checkOut}
                                                                min={getNextDayISO(conf.checkIn, 1)}
                                                                onChange={e => handleRoomCheckOutChange(rm, e.target.value)}
                                                                className="w-36 h-8 px-2 text-xs font-mono border border-slate-200 rounded-md bg-white text-slate-800 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-400 shadow-2xs"
                                                                title="Check-Out Date"
                                                            />
                                                        </td>
                                                        <td className="py-2 px-3 text-center">
                                                            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-mono border shadow-2xs ${
                                                                isDifferentFromMaster
                                                                    ? 'bg-indigo-100 text-indigo-900 border-indigo-300'
                                                                    : 'bg-blue-100 text-blue-900 border-blue-200'
                                                            }`}>
                                                                {conf.nights} Night{conf.nights > 1 ? 's' : ''}
                                                            </span>
                                                        </td>
                                                        <td className="py-2 px-3 text-center">
                                                            <button
                                                                type="button"
                                                                onClick={() => setSelectedRooms(prev => prev.filter(r => r !== rm))}
                                                                className="p-1 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-md cursor-pointer transition-colors"
                                                                title="Remove room"
                                                            >
                                                                <X size={15} />
                                                            </button>
                                                        </td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* Bottom Section: Physical Room Cards Grid */}
                <div className="p-6 overflow-y-auto flex-1 bg-slate-50/50">
                    <div className="text-[11px] uppercase tracking-wider text-slate-500 mb-3 flex items-center justify-between">
                        <span>Available Physical Rooms ({availableRooms.length} Available)</span>
                        <div className="flex items-center gap-3 text-[10px] font-semibold lowercase text-slate-500">
                            <span className="flex items-center gap-1.5">
                                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block shadow-2xs"></span> Ready &amp; Free
                            </span>
                            <span className="flex items-center gap-1.5">
                                <span className="w-2.5 h-2.5 rounded-full bg-blue-600 inline-block shadow-2xs"></span> Selected
                            </span>
                            <span className="flex items-center gap-1.5">
                                <span className="w-2.5 h-2.5 rounded-full bg-slate-300 inline-block shadow-2xs"></span> Occupied / In Form
                            </span>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                        {categoryRooms.map(st => {
                            const isTakenInOther = otherRowsTakenRooms.includes(st.room.number);
                            const isSelectable = st.isAvailable && !isTakenInOther;
                            const isSelected = selectedRooms.includes(st.room.number);

                            let cardStyle = 'border-slate-200 bg-white hover:border-blue-400 hover:shadow-xs cursor-pointer';
                            if (isSelected) {
                                cardStyle = 'border-blue-500 bg-blue-50/90 text-blue-950 ring-2 ring-blue-500/60 shadow-xs cursor-pointer scale-[1.02]';
                            } else if (!isSelectable) {
                                cardStyle = 'border-slate-200 bg-slate-100/80 text-slate-400 opacity-60 cursor-not-allowed';
                            }

                            return (
                                <div
                                    key={st.room.number}
                                    onClick={() => handleToggleRoom(st.room.number, isSelectable)}
                                    className={`relative p-3.5 rounded-xl border flex flex-col justify-between transition-all select-none ${cardStyle}`}
                                >
                                    <div className="flex items-center justify-between">
                                        <span className="text-lg font-extrabold font-mono tracking-tight text-slate-900">
                                            {st.room.number}
                                        </span>
                                        {isSelected ? (
                                            <span className="w-6 h-6 rounded-full bg-blue-600 text-white flex items-center justify-center shadow-xs">
                                                <Check size={14} strokeWidth={3} />
                                            </span>
                                        ) : (
                                            <span className={`text-[10px] px-2 py-0.5 rounded-md font-semibold ${
                                                isSelectable 
                                                    ? 'bg-emerald-100 text-emerald-800' 
                                                    : isTakenInOther 
                                                        ? 'bg-amber-100 text-amber-800' 
                                                        : st.reason === 'Out of Order'
                                                            ? 'bg-rose-100 text-rose-800'
                                                            : 'bg-red-100 text-red-800'
                                            }`}>
                                                {isSelectable
                                                    ? ((st as any).isOOSWarning ? 'OOS (Warn)' : 'Free')
                                                    : isTakenInOther
                                                        ? 'In Form'
                                                        : st.reason === 'Out of Order'
                                                            ? 'Out of Order'
                                                            : st.reason === 'Maintenance'
                                                                ? 'Maintenance'
                                                                : 'Booked'}
                                            </span>
                                        )}
                                    </div>

                                    <div className="mt-2.5 text-[11px] space-y-0.5">
                                        <div className="text-slate-600 font-semibold">Floor {st.room.floorId || '1'}</div>
                                        <div className="text-slate-500 text-[10.5px] truncate">{st.room.name}</div>
                                        {st.room.isConnecting && (
                                            <div className="pt-0.5">
                                                <span className="text-[9.5px] font-semibold text-blue-700 bg-blue-50 px-1.5 py-0.5 rounded border border-blue-200 inline-flex items-center gap-1">
                                                    🔗 Connecting {st.room.connectedTo ? `to Room ${st.room.connectedTo}` : ""}
                                                </span>
                                            </div>
                                        )}
                                        {!isSelectable && (
                                            <div className="text-rose-600 font-medium text-[10px] truncate mt-1">
                                                {isTakenInOther
                                                    ? 'Used in another row'
                                                    : st.reason === 'Out of Order'
                                                        ? `🔧 Out of Order (${(st as any).maintenanceBlock?.reasonCategory || 'Maintenance'})`
                                                        : (st.reason || 'Occupied')}
                                            </div>
                                        )}
                                        {isSelectable && (st as any).isOOSWarning && (
                                            <div className="text-amber-700 font-medium text-[10px] truncate mt-1">
                                                ⚠️ Out of Service ({(st as any).maintenanceBlock?.reasonCategory || 'Minor Service'})
                                            </div>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* Footer Bar */}
                <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex flex-wrap items-center justify-between gap-3">
                    <div className="text-xs">
                        {customDatesEnabled ? (
                            <div className="flex items-center gap-2">
                                <span className="text-blue-900 bg-blue-50 px-2 py-1 rounded border border-blue-200 flex items-center gap-1.5 font-mono">
                                    <CalendarRange size={13} className="text-blue-600" />
                                    Horizon: <strong>{staySummary.minIn}</strong> ➔ <strong>{staySummary.maxOut}</strong> ({staySummary.totalRoomNights} Total Room-Nights)
                                </span>
                            </div>
                        ) : (
                            <div className="flex items-center gap-1.5 text-slate-600">
                                {isComplete ? (
                                    <span className="text-emerald-700 flex items-center gap-1 font-semibold">
                                        <CheckCircle2 size={15} /> {requiredCount === 1 ? `Room ready (${staySummary.totalRoomNights} Night${staySummary.totalRoomNights > 1 ? 's' : ''})` : `All ${requiredCount} rooms ready (${staySummary.totalRoomNights} Room-Nights)`}
                                    </span>
                                ) : (
                                    <span className="text-amber-700 font-semibold">
                                        Tip: Confirming now will automatically pick the remaining {remainingToPick} room(s).
                                    </span>
                                )}
                            </div>
                        )}
                    </div>

                    <div className="flex items-center gap-2.5">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-4 py-2 border border-slate-300 bg-white hover:bg-slate-100 text-slate-700 rounded-xl text-xs font-semibold cursor-pointer transition-colors shadow-2xs"
                        >
                            Cancel
                        </button>
                        <button
                            type="button"
                            onClick={handleSave}
                            className={`px-5 py-2 text-white rounded-xl text-xs font-bold shadow-xs flex items-center gap-1.5 cursor-pointer transition-all ${
                                isAuto ? 'bg-blue-600 hover:bg-blue-700' : 'bg-emerald-600 hover:bg-emerald-700'
                            }`}
                        >
                            <Check size={15} />
                            <span>Confirm {isAuto ? 'Auto' : 'Manual'} Assignment ({selectedRooms.length || requiredCount} {requiredCount === 1 ? 'Room' : 'Rooms'})</span>
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};
