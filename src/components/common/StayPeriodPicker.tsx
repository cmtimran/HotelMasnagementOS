import React, { useState, useRef, useEffect, useMemo } from 'react';
import {
    Calendar as CalendarIcon,
    ArrowRight,
    Minus,
    Plus,
    ChevronLeft,
    ChevronRight,
    RotateCcw,
    Check
} from 'lucide-react';

export interface StayPeriodPickerProps {
    checkIn: string; // YYYY-MM-DD
    checkOut: string; // YYYY-MM-DD
    nights: number;
    onDateChange: (checkIn: string, checkOut: string, nights: number) => void;
    minDate?: string;
    label?: string;
    compact?: boolean;
    dayUse?: boolean;
}

/**
 * Normalizes any format (e.g. "01 Jul 2026", "1 Jul 2026", or "2026-07-01")
 * into strict ISO YYYY-MM-DD string.
 */
export const normalizeToISO = (val: string): string => {
    if (!val) return '';
    const trimmed = val.trim();
    if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return trimmed;

    // Parse format like "01 Jul 2026" or "1 Jul 2026"
    const parts = trimmed.split(/\s+/);
    if (parts.length === 3) {
        const day = parseInt(parts[0], 10);
        const monthStr = parts[1].toLowerCase().slice(0, 3);
        const year = parseInt(parts[2], 10);
        const monthMap: Record<string, number> = {
            jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5,
            jul: 6, aug: 7, sep: 8, oct: 9, nov: 10, dec: 11
        };
        if (!isNaN(day) && !isNaN(year) && monthMap[monthStr] !== undefined) {
            const y = year;
            const m = String(monthMap[monthStr] + 1).padStart(2, '0');
            const d = String(day).padStart(2, '0');
            return `${y}-${m}-${d}`;
        }
    }

    const d = new Date(trimmed);
    if (!isNaN(d.getTime())) {
        const y = d.getFullYear();
        const m = String(d.getMonth() + 1).padStart(2, '0');
        const dStr = String(d.getDate()).padStart(2, '0');
        return `${y}-${m}-${dStr}`;
    }
    return '';
};

/**
 * Returns Hotel Operating System Date in strict YYYY-MM-DD
 */
export const getSystemDateISO = (): string => {
    try {
        const raw = localStorage.getItem('hotel_system_date_iso') || localStorage.getItem('hotel_system_date');
        const norm = normalizeToISO(raw || '');
        return norm || '2026-07-01';
    } catch {
        return '2026-07-01';
    }
};

/**
 * Calculates next day or n days from given ISO date
 */
export const getNextDayISO = (dateISO: string, daysToAdd: number = 1): string => {
    try {
        const norm = normalizeToISO(dateISO) || '2026-07-01';
        const parts = norm.split('-').map(Number);
        const d = new Date(parts[0], parts[1] - 1, parts[2]);
        d.setDate(d.getDate() + Math.max(1, daysToAdd));
        const y = d.getFullYear();
        const m = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        return `${y}-${m}-${day}`;
    } catch {
        return '2026-07-02';
    }
};

export const StayPeriodPicker: React.FC<StayPeriodPickerProps> = ({
    checkIn,
    checkOut,
    nights,
    onDateChange,
    minDate,
    label = 'Stay Period (Check In - Check Out)',
    compact = false,
    dayUse = false
}) => {
    const [isOpen, setIsOpen] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);

    // Minimum allowed booking date is System Date (No Backdate bookings allowed)
    const systemDateISO = useMemo(() => getSystemDateISO(), []);
    const effectiveMinDate = minDate ? normalizeToISO(minDate) : systemDateISO;

    // Strict sanitized check-in and check-out values
    const safeCheckIn = useMemo(() => {
        const norm = normalizeToISO(checkIn);
        return norm || effectiveMinDate;
    }, [checkIn, effectiveMinDate]);

    const safeCheckOut = useMemo(() => {
        if (dayUse) return safeCheckIn;
        const norm = normalizeToISO(checkOut);
        return norm || getNextDayISO(safeCheckIn, Math.max(1, nights));
    }, [checkOut, safeCheckIn, dayUse, nights]);

    // Parse YYYY-MM-DD safely into [year, monthIndex, day]
    const parseYMD = (ymdStr: string) => {
        if (!ymdStr) return null;
        const parts = ymdStr.split('-').map(Number);
        if (parts.length === 3 && !isNaN(parts[0]) && !isNaN(parts[1]) && !isNaN(parts[2])) {
            return { year: parts[0], month: parts[1] - 1, day: parts[2] };
        }
        return null;
    };

    const toYMD = (year: number, monthIndex: number, day: number): string => {
        const y = year;
        const m = String(monthIndex + 1).padStart(2, '0');
        const d = String(day).padStart(2, '0');
        return `${y}-${m}-${d}`;
    };

    // Calendar navigation state (which month/year is currently displayed)
    const initialNav = useMemo(() => {
        const parsed = parseYMD(safeCheckIn);
        if (parsed) return { year: parsed.year, month: parsed.month };
        const sysParsed = parseYMD(effectiveMinDate);
        if (sysParsed) return { year: sysParsed.year, month: sysParsed.month };
        return { year: 2026, month: 6 }; // Default July 2026
    }, [safeCheckIn, effectiveMinDate]);

    const [viewYear, setViewYear] = useState<number>(initialNav.year);
    const [viewMonth, setViewMonth] = useState<number>(initialNav.month);

    // Keep calendar view synced when checkIn changes externally
    useEffect(() => {
        if (!isOpen) {
            const p = parseYMD(safeCheckIn);
            if (p) {
                setViewYear(p.year);
                setViewMonth(p.month);
            }
        }
    }, [safeCheckIn, isOpen]);

    // Range picking state
    const [rangePhase, setRangePhase] = useState<'idle' | 'picking_checkout'>('idle');
    const [tempCheckIn, setTempCheckIn] = useState<string>(safeCheckIn);
    const [hoverDate, setHoverDate] = useState<string | null>(null);

    useEffect(() => {
        if (isOpen) {
            setTempCheckIn(safeCheckIn);
            setRangePhase('idle');
            setHoverDate(null);
        }
    }, [isOpen, safeCheckIn]);

    // Close on outside click
    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
                setIsOpen(false);
            }
        };
        if (isOpen) {
            document.addEventListener('mousedown', handleClickOutside);
        }
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [isOpen]);

    // Display helpers
    const formatDisplayDate = (isoStr: string) => {
        if (!isoStr) return '--';
        const p = parseYMD(isoStr);
        if (!p) return isoStr;
        const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        return `${String(p.day).padStart(2, '0')} ${months[p.month]} ${p.year}`;
    };

    const formatInputDate = (isoStr: string) => {
        if (!isoStr) return '--/--/----';
        const p = parseYMD(isoStr);
        if (!p) return isoStr;
        const m = String(p.month + 1).padStart(2, '0');
        const d = String(p.day).padStart(2, '0');
        return `${m}/${d}/${p.year}`;
    };

    const getDayName = (isoStr: string) => {
        const p = parseYMD(isoStr);
        if (!p) return '';
        const d = new Date(p.year, p.month, p.day);
        return d.toLocaleDateString('en-US', { weekday: 'short' });
    };

    const calculateCheckOut = (inDate: string, n: number): string => {
        return getNextDayISO(inDate, n);
    };

    const calculateNights = (inDate: string, outDate: string): number => {
        const pIn = parseYMD(inDate);
        const pOut = parseYMD(outDate);
        if (!pIn || !pOut) return 1;
        const dIn = new Date(pIn.year, pIn.month, pIn.day);
        const dOut = new Date(pOut.year, pOut.month, pOut.day);
        const diffDays = Math.round((dOut.getTime() - dIn.getTime()) / (1000 * 60 * 60 * 24));
        return Math.max(1, diffDays);
    };

    // Stepper Handlers (Disabled during Day Use)
    const handleNightsChange = (newNights: number) => {
        if (dayUse) return;
        const safeNights = Math.max(1, newNights);
        const newOut = calculateCheckOut(safeCheckIn, safeNights);
        onDateChange(safeCheckIn, newOut, safeNights);
    };

    // Month Navigation: Disable navigating to months prior to system date
    const isAtOrBeforeSystemMonth = useMemo(() => {
        const p = parseYMD(effectiveMinDate);
        if (!p) return false;
        return (viewYear < p.year) || (viewYear === p.year && viewMonth <= p.month);
    }, [viewYear, viewMonth, effectiveMinDate]);

    const handlePrevMonth = () => {
        if (isAtOrBeforeSystemMonth) return;
        if (viewMonth === 0) {
            setViewMonth(11);
            setViewYear(v => v - 1);
        } else {
            setViewMonth(v => v - 1);
        }
    };

    const handleNextMonth = () => {
        if (viewMonth === 11) {
            setViewMonth(0);
            setViewYear(v => v + 1);
        } else {
            setViewMonth(v => v + 1);
        }
    };

    const handleJumpToSystemDate = () => {
        const p = parseYMD(effectiveMinDate);
        if (p) {
            setViewYear(p.year);
            setViewMonth(p.month);
        }
    };

    const monthNames = [
        'January', 'February', 'March', 'April', 'May', 'June',
        'July', 'August', 'September', 'October', 'November', 'December'
    ];

    // Calendar Days (Monday as start of week)
    const calendarDays = useMemo(() => {
        const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
        const firstDayDow = new Date(viewYear, viewMonth, 1).getDay();
        const leadingEmptyDays = (firstDayDow + 6) % 7;

        const days: Array<{ day: number; dateStr: string } | null> = [];
        for (let i = 0; i < leadingEmptyDays; i++) {
            days.push(null);
        }
        for (let d = 1; d <= daysInMonth; d++) {
            days.push({
                day: d,
                dateStr: toYMD(viewYear, viewMonth, d)
            });
        }
        return days;
    }, [viewYear, viewMonth]);

    // Active Range for Rendering
    const effectiveStart = rangePhase === 'picking_checkout' ? tempCheckIn : safeCheckIn;
    const effectiveEnd = useMemo(() => {
        if (dayUse) return effectiveStart;
        if (rangePhase === 'picking_checkout') {
            if (hoverDate && hoverDate > effectiveStart) {
                return hoverDate;
            }
            return effectiveStart;
        }
        return safeCheckOut;
    }, [dayUse, rangePhase, hoverDate, effectiveStart, safeCheckOut]);

    // Day Click Handler with Strict Backdate Protection & Day Use Support
    const handleDayClick = (dateStr: string) => {
        // Disallow clicking backdates
        if (dateStr < effectiveMinDate) {
            return;
        }

        if (dayUse) {
            // Day Use: Click sets both check-in and check-out to same day
            onDateChange(dateStr, dateStr, 0);
            setIsOpen(false);
            return;
        }

        if (rangePhase === 'idle') {
            setTempCheckIn(dateStr);
            setRangePhase('picking_checkout');
        } else {
            if (dateStr > tempCheckIn) {
                const newNights = calculateNights(tempCheckIn, dateStr);
                onDateChange(tempCheckIn, dateStr, newNights);
                setRangePhase('idle');
                setIsOpen(false);
            } else if (dateStr === tempCheckIn) {
                // Same day clicked: default to 1 night
                const nextDayOut = calculateCheckOut(dateStr, 1);
                onDateChange(dateStr, nextDayOut, 1);
                setRangePhase('idle');
                setIsOpen(false);
            } else {
                // Clicked earlier valid date: restart range from this date
                setTempCheckIn(dateStr);
            }
        }
    };

    return (
        <div ref={containerRef} className={`relative flex flex-col gap-1 select-none ${isOpen ? 'z-40' : ''}`}>
            {/* Top Label & Day Summary */}
            {label && (
                <div className="flex items-center justify-between">
                    <label className="text-[10px] text-gray-700 uppercase tracking-wider flex items-center gap-1">
                        <CalendarIcon size={11} className="text-blue-600" />
                        <span>{label}</span>
                        <span className="text-red-500">*</span>
                    </label>
                    <span className="text-[9px] font-semibold text-blue-700">
                        {dayUse ? (
                            <span className="text-amber-700 bg-amber-50 px-1 py-0.2 rounded border border-amber-200">
                                {getDayName(safeCheckIn)} (Day Use)
                            </span>
                        ) : (
                            <span>
                                {getDayName(safeCheckIn)} ➔ {getDayName(safeCheckOut)} ({nights}N)
                            </span>
                        )}
                    </span>
                </div>
            )}

            {/* Single Consolidated Custom Control Bar (NO native input to avoid browser datepicker overlapping) */}
            <div
                className={`flex items-center bg-white border border-slate-200 hover:border-blue-400 rounded-md shadow-2xs transition-all ${
                    compact ? 'h-7.5' : 'h-8'
                } overflow-hidden cursor-pointer focus-within:ring-2 focus-within:ring-blue-500/20 focus-within:border-blue-500`}
            >
                {/* 1. Custom Check In Date Display Button */}
                <button
                    type="button"
                    onClick={() => {
                        setRangePhase('idle');
                        setIsOpen(!isOpen);
                    }}
                    className="flex-1 flex items-center gap-1.5 px-2.5 h-full text-left hover:bg-blue-50/40 transition-colors cursor-pointer"
                    title={`Check-In Date: ${formatDisplayDate(safeCheckIn)} (Click to select)`}
                >
                    <CalendarIcon size={12} className="text-blue-600 flex-shrink-0" />
                    <span className="text-[11px] text-slate-800 tracking-tight">
                        {formatInputDate(safeCheckIn)}
                    </span>
                </button>

                {/* 2. Middle Nights Stepper / Day Use Badge & Calendar Popover Trigger */}
                <div className="flex items-center gap-0.5 px-1 py-0.5 bg-slate-100 border-x border-slate-200 flex-shrink-0 h-full">
                    {dayUse ? (
                        <button
                            type="button"
                            onClick={() => setIsOpen(!isOpen)}
                            className="px-2 py-0.5 rounded bg-amber-100 text-amber-900 border border-amber-300 font-black text-[10px] tracking-tight cursor-pointer hover:bg-amber-200 transition-colors"
                            title="Day Use Active: Check-In and Check-Out are same day"
                        >
                            Day Use
                        </button>
                    ) : (
                        <>
                            <button
                                type="button"
                                onClick={e => {
                                    e.stopPropagation();
                                    handleNightsChange(nights - 1);
                                }}
                                disabled={nights <= 1}
                                className="w-4 h-4 rounded flex items-center justify-center text-slate-600 hover:bg-white hover:text-blue-700 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer transition-colors"
                                title="Decrease 1 night"
                            >
                                <Minus size={9} className="stroke-[2.5]" />
                            </button>

                            <button
                                type="button"
                                onClick={() => setIsOpen(!isOpen)}
                                className={`px-1.5 py-0.5 rounded text-center cursor-pointer transition-all ${
                                    isOpen
                                        ? 'bg-blue-600 text-white shadow-xs'
                                        : 'hover:bg-white text-blue-900'
                                }`}
                                title="Click to open Date Range Calendar"
                            >
                                <span className="text-[10.5px] font-black font-mono flex items-center gap-0.5">
                                    <span>{nights}N</span>
                                    <span className="text-[8px] opacity-75">📅</span>
                                </span>
                            </button>

                            <button
                                type="button"
                                onClick={e => {
                                    e.stopPropagation();
                                    handleNightsChange(nights + 1);
                                }}
                                className="w-4 h-4 rounded flex items-center justify-center text-slate-600 hover:bg-white hover:text-blue-700 cursor-pointer transition-colors"
                                title="Increase 1 night"
                            >
                                <Plus size={9} className="stroke-[2.5]" />
                            </button>
                        </>
                    )}
                </div>

                {/* 3. Custom Check Out Date Display Button */}
                <button
                    type="button"
                    onClick={() => {
                        if (!dayUse) {
                            setRangePhase('picking_checkout');
                            setIsOpen(true);
                        }
                    }}
                    disabled={dayUse}
                    className={`flex-1 flex items-center gap-1.5 px-2.5 h-full text-left transition-colors ${
                        dayUse
                            ? 'bg-amber-50/50 cursor-not-allowed text-amber-900'
                            : 'bg-slate-50/50 hover:bg-blue-50/40 cursor-pointer text-slate-800'
                    }`}
                    title={
                        dayUse
                            ? 'Check-Out date matches Check-In for Day Use'
                            : `Check-Out Date: ${formatDisplayDate(safeCheckOut)} (Click to select departure)`
                    }
                >
                    <ArrowRight size={11} className={`${dayUse ? 'text-amber-500' : 'text-slate-400'} flex-shrink-0`} />
                    <span className="text-[11px] tracking-tight">
                        {formatInputDate(safeCheckOut)}
                    </span>
                </button>
            </div>

            {/* Visual Date Range Calendar Popover (Directly anchored below input) */}
            {isOpen && (
                <div
                    className="absolute top-full left-0 mt-1 z-50 w-[285px] bg-white rounded-xl shadow-2xl border border-slate-200 p-2.5 select-none animate-in fade-in zoom-in-95 duration-100"
                >
                    {/* Top Blue Accent Line */}
                    <div className="h-0.5 bg-blue-600 rounded-t-lg -mx-2.5 -mt-2.5 mb-1.5"></div>

                    {/* Month Header with Navigation */}
                    <div className="flex items-center justify-between px-0.5 mb-1">
                        <button
                            type="button"
                            onClick={handlePrevMonth}
                            disabled={isAtOrBeforeSystemMonth}
                            className="w-5.5 h-5.5 rounded flex items-center justify-center text-slate-600 hover:bg-slate-100 hover:text-slate-900 disabled:opacity-20 disabled:cursor-not-allowed cursor-pointer transition-colors"
                            title={isAtOrBeforeSystemMonth ? 'Cannot view past months' : 'Previous Month'}
                        >
                            <ChevronLeft size={14} />
                        </button>

                        <div className="text-center">
                            <h3 className="text-xs text-slate-900 tracking-tight leading-tight">
                                {monthNames[viewMonth]} {viewYear}
                            </h3>
                            {rangePhase === 'picking_checkout' && !dayUse && (
                                <p className="text-[8.5px] text-blue-600 leading-none">
                                    Click Check-Out Date
                                </p>
                            )}
                            {dayUse && (
                                <p className="text-[8.5px] text-amber-700 leading-none">
                                    Click date for Day Use
                                </p>
                            )}
                        </div>

                        <div className="flex items-center gap-0.5">
                            <button
                                type="button"
                                onClick={handleJumpToSystemDate}
                                className="px-1 py-0.2 rounded text-[8.5px] font-semibold text-slate-500 hover:text-blue-700 hover:bg-blue-50 transition-colors cursor-pointer"
                                title="Jump to System Date"
                            >
                                <RotateCcw size={8} className="inline mr-0.5" />
                                Today
                            </button>
                            <button
                                type="button"
                                onClick={handleNextMonth}
                                className="w-5.5 h-5.5 rounded flex items-center justify-center text-slate-600 hover:bg-slate-100 hover:text-slate-900 cursor-pointer transition-colors"
                                title="Next Month"
                            >
                                <ChevronRight size={14} />
                            </button>
                        </div>
                    </div>

                    {/* Weekday Names Header (Mon - Sun) */}
                    <div className="grid grid-cols-7 text-center text-[9.5px] font-semibold text-slate-400 py-0.5 mb-0.5 border-b border-slate-100">
                        <div>Mon</div>
                        <div>Tue</div>
                        <div>Wed</div>
                        <div>Thu</div>
                        <div>Fri</div>
                        <div>Sat</div>
                        <div>Sun</div>
                    </div>

                    {/* Calendar Day Grid (Compact) */}
                    <div className="grid grid-cols-7 gap-y-0.5 text-center">
                        {calendarDays.map((item, idx) => {
                            if (!item) {
                                return <div key={`empty-${idx}`} className="h-6"></div>;
                            }

                            const { day, dateStr } = item;
                            const isPastDate = dateStr < effectiveMinDate;
                            const isStart = dateStr === effectiveStart;
                            const isEnd = !dayUse && dateStr === effectiveEnd && effectiveEnd > effectiveStart;
                            const isInRange = !dayUse && dateStr > effectiveStart && dateStr < effectiveEnd;
                            const isSingleSelected = isStart && (dayUse || effectiveStart === effectiveEnd);
                            const isToday = dateStr === effectiveMinDate;

                            if (isPastDate) {
                                return (
                                    <div
                                        key={dateStr}
                                        className="h-6 flex items-center justify-center"
                                        title={`Backdate (${dateStr}) cannot be booked. Audit locked.`}
                                    >
                                        <span className="w-6 h-6 rounded text-[10px] text-slate-300 font-normal line-through cursor-not-allowed flex items-center justify-center select-none opacity-40">
                                            {day}
                                        </span>
                                    </div>
                                );
                            }

                            return (
                                <div
                                    key={dateStr}
                                    onMouseEnter={() => setHoverDate(dateStr)}
                                    className={`relative h-6 flex items-center justify-center ${
                                        isInRange ? 'bg-slate-100/90' : ''
                                    } ${
                                        isStart && effectiveEnd > effectiveStart && !dayUse
                                            ? 'rounded-l-md bg-gradient-to-r from-transparent to-slate-100/90'
                                            : ''
                                    } ${
                                        isEnd && effectiveEnd > effectiveStart
                                            ? 'rounded-r-md bg-gradient-to-l from-transparent to-slate-100/90'
                                            : ''
                                    }`}
                                >
                                    <button
                                        type="button"
                                        onClick={() => handleDayClick(dateStr)}
                                        className={`w-6 h-6 rounded-md text-[10.5px] transition-all cursor-pointer flex items-center justify-center relative ${
                                            isStart || isEnd
                                                ? 'bg-[#0066ff] text-white shadow-xs font-black z-10 scale-105'
                                                : isInRange
                                                    ? 'text-slate-900 hover:bg-slate-200/80'
                                                    : 'text-slate-700 hover:bg-slate-100 hover:text-blue-600'
                                        } ${isSingleSelected ? 'ring-2 ring-blue-500 ring-offset-0' : ''}`}
                                    >
                                        {day}
                                        {isToday && !isStart && !isEnd && (
                                            <span className="absolute bottom-0.5 w-1 h-1 rounded-full bg-blue-600"></span>
                                        )}
                                    </button>
                                </div>
                            );
                        })}
                    </div>

                    {/* Integrated Presets & Done Bar (Single Line) */}
                    <div className="mt-1.5 pt-1.5 border-t border-slate-100 flex items-center justify-between gap-1">
                        {!dayUse ? (
                            <div className="flex items-center gap-0.5">
                                <span className="text-[8.5px] text-slate-400 uppercase tracking-tight mr-0.5">
                                    Nights:
                                </span>
                                {[1, 2, 3, 5, 7].map(n => (
                                    <button
                                        key={n}
                                        type="button"
                                        onClick={() => {
                                            handleNightsChange(n);
                                            setIsOpen(false);
                                        }}
                                        className={`px-1.5 py-0.2 rounded text-[9.5px] transition-all cursor-pointer ${
                                            nights === n
                                                ? 'bg-blue-600 text-white shadow-2xs'
                                                : 'bg-slate-100 text-slate-600 hover:bg-blue-50 hover:text-blue-700'
                                        }`}
                                    >
                                        {n}N
                                    </button>
                                ))}
                            </div>
                        ) : (
                            <div className="text-[9.5px] text-amber-800">
                                Single-Day Use (No Overnight)
                            </div>
                        )}

                        <button
                            type="button"
                            onClick={() => setIsOpen(false)}
                            className="px-2 py-0.5 rounded bg-[#1e3a8a] text-white text-[9.5px] hover:bg-blue-900 shadow-2xs cursor-pointer flex items-center gap-0.5 transition-colors"
                        >
                            <Check size={9} className="stroke-[3]" />
                            <span>Done</span>
                        </button>
                    </div>

                    {/* Subtle Summary Row */}
                    <div className="mt-1 pt-1 border-t border-slate-100 flex items-center justify-between text-[9px] text-slate-500">
                        {dayUse ? (
                            <span className="font-semibold text-amber-800">
                                {formatDisplayDate(effectiveStart)} (Same Day Check-in & Check-out)
                            </span>
                        ) : (
                            <>
                                <span>
                                    {formatDisplayDate(effectiveStart)} ➔ {formatDisplayDate(effectiveEnd)}
                                </span>
                                <span className="text-blue-700 font-bold">
                                    {calculateNights(effectiveStart, effectiveEnd)} Night{calculateNights(effectiveStart, effectiveEnd) > 1 ? 's' : ''}
                                </span>
                            </>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export default StayPeriodPicker;
