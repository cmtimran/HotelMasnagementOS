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
}

export const StayPeriodPicker: React.FC<StayPeriodPickerProps> = ({
    checkIn,
    checkOut,
    nights,
    onDateChange,
    minDate,
    label = 'Stay Period (Check In - Check Out)',
    compact = false
}) => {
    const [isOpen, setIsOpen] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);

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

    // Calendar navigation state (which month/year is being viewed)
    const initialNav = useMemo(() => {
        const parsed = parseYMD(checkIn);
        if (parsed) return { year: parsed.year, month: parsed.month };
        return { year: 2026, month: 6 }; // Default July 2026
    }, [checkIn]);

    const [viewYear, setViewYear] = useState<number>(initialNav.year);
    const [viewMonth, setViewMonth] = useState<number>(initialNav.month);

    // Keep calendar view synced when checkIn changes externally and popup is closed
    useEffect(() => {
        if (!isOpen) {
            const p = parseYMD(checkIn);
            if (p) {
                setViewYear(p.year);
                setViewMonth(p.month);
            }
        }
    }, [checkIn, isOpen]);

    // Interactive range picking state
    // 'idle' -> user clicks first date to pick checkIn
    // 'picking_checkout' -> user clicked checkIn, next click sets checkOut
    const [rangePhase, setRangePhase] = useState<'idle' | 'picking_checkout'>('idle');
    const [tempCheckIn, setTempCheckIn] = useState<string>(checkIn);
    const [hoverDate, setHoverDate] = useState<string | null>(null);

    // Reset range selection phase when opening/closing
    useEffect(() => {
        if (isOpen) {
            setTempCheckIn(checkIn);
            setRangePhase('idle');
            setHoverDate(null);
        }
    }, [isOpen, checkIn]);

    // Close popover when clicking outside
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

    // Format display helpers
    const formatDisplayDate = (isoStr: string) => {
        if (!isoStr) return '--';
        const p = parseYMD(isoStr);
        if (!p) return isoStr;
        const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        return `${String(p.day).padStart(2, '0')} ${months[p.month]} ${p.year}`;
    };

    const getDayName = (isoStr: string) => {
        const p = parseYMD(isoStr);
        if (!p) return '';
        const d = new Date(p.year, p.month, p.day);
        return d.toLocaleDateString('en-US', { weekday: 'short' });
    };

    // Calculate checkout from checkin + nights
    const calculateCheckOut = (inDate: string, n: number): string => {
        const p = parseYMD(inDate);
        if (!p) return checkOut;
        const d = new Date(p.year, p.month, p.day);
        d.setDate(d.getDate() + Math.max(1, n));
        return toYMD(d.getFullYear(), d.getMonth(), d.getDate());
    };

    // Calculate nights between two dates
    const calculateNights = (inDate: string, outDate: string): number => {
        const pIn = parseYMD(inDate);
        const pOut = parseYMD(outDate);
        if (!pIn || !pOut) return 1;
        const dIn = new Date(pIn.year, pIn.month, pIn.day);
        const dOut = new Date(pOut.year, pOut.month, pOut.day);
        const diffDays = Math.round((dOut.getTime() - dIn.getTime()) / (1000 * 60 * 60 * 24));
        return Math.max(1, diffDays);
    };

    // Fast Stepper Handlers
    const handleNightsChange = (newNights: number) => {
        const safeNights = Math.max(1, newNights);
        const newOut = calculateCheckOut(checkIn, safeNights);
        onDateChange(checkIn, newOut, safeNights);
    };

    const handleDirectCheckInChange = (newIn: string) => {
        const newOut = calculateCheckOut(newIn, nights);
        onDateChange(newIn, newOut, nights);
    };

    const handleDirectCheckOutChange = (newOut: string) => {
        const safeNights = calculateNights(checkIn, newOut);
        onDateChange(checkIn, newOut, safeNights);
    };

    // Month Navigation
    const handlePrevMonth = () => {
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
        const sys = localStorage.getItem('hotel_system_date') || '2026-07-01';
        const p = parseYMD(sys);
        if (p) {
            setViewYear(p.year);
            setViewMonth(p.month);
        }
    };

    // Calendar Grid Days Calculation
    const monthNames = [
        'January', 'February', 'March', 'April', 'May', 'June',
        'July', 'August', 'September', 'October', 'November', 'December'
    ];

    const calendarDays = useMemo(() => {
        // Days in viewed month
        const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
        
        // Day of week for 1st of month: 0=Sun, 1=Mon, ..., 6=Sat
        // Screenshot starts with Monday! (Mon Tue Wed Thu Fri Sat Sun)
        const firstDayDow = new Date(viewYear, viewMonth, 1).getDay();
        // Convert to Mon=0 ... Sun=6
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

    // Active Range for rendering (handles hover preview when selecting checkout)
    const effectiveStart = rangePhase === 'picking_checkout' ? tempCheckIn : checkIn;
    const effectiveEnd = useMemo(() => {
        if (rangePhase === 'picking_checkout') {
            if (hoverDate && hoverDate > effectiveStart) {
                return hoverDate;
            }
            return effectiveStart;
        }
        return checkOut;
    }, [rangePhase, hoverDate, effectiveStart, checkOut]);

    // Interactive Day Click Handler (Exact Range Picker flow like Screenshot)
    const handleDayClick = (dateStr: string) => {
        if (rangePhase === 'idle') {
            // First click: sets Check-in, prompts user to click Check-out
            setTempCheckIn(dateStr);
            setRangePhase('picking_checkout');
        } else {
            // Second click:
            if (dateStr > tempCheckIn) {
                // Valid checkout selected
                const newNights = calculateNights(tempCheckIn, dateStr);
                onDateChange(tempCheckIn, dateStr, newNights);
                setRangePhase('idle');
                setIsOpen(false);
            } else if (dateStr === tempCheckIn) {
                // Same day clicked: default to 1 night stay
                const nextDayOut = calculateCheckOut(dateStr, 1);
                onDateChange(dateStr, nextDayOut, 1);
                setRangePhase('idle');
                setIsOpen(false);
            } else {
                // Clicked earlier date: reset check-in to this new date
                setTempCheckIn(dateStr);
            }
        }
    };

    const quickNightPresets = [1, 2, 3, 4, 5, 7, 14];

    return (
        <div ref={containerRef} className="relative flex flex-col gap-1 select-none">
            {/* Top Label & Day-of-Week Summary */}
            {label && (
                <div className="flex items-center justify-between">
                    <label className="text-[10px] font-bold text-gray-700 uppercase tracking-wider flex items-center gap-1">
                        <CalendarIcon size={11} className="text-blue-600" />
                        <span>{label}</span>
                        <span className="text-red-500">*</span>
                    </label>
                    <span className="text-[9.5px] font-semibold text-blue-700">
                        {getDayName(checkIn)} ➔ {getDayName(checkOut)} ({nights}N)
                    </span>
                </div>
            )}

            {/* Single Consolidated Control Bar */}
            <div
                className={`flex items-center bg-white border border-slate-200 hover:border-blue-400 rounded-md shadow-2xs transition-all ${
                    compact ? 'h-7.5' : 'h-8'
                } overflow-hidden focus-within:ring-2 focus-within:ring-blue-500/20 focus-within:border-blue-500`}
            >
                {/* 1. Check In Date Input */}
                <div className="flex-1 flex items-center gap-1.5 px-2 min-w-0">
                    <CalendarIcon size={12} className="text-blue-600 flex-shrink-0" />
                    <div className="flex items-center gap-1 min-w-0 flex-1">
                        <input
                            type="date"
                            value={checkIn}
                            min={minDate}
                            onChange={e => handleDirectCheckInChange(e.target.value)}
                            className="w-full text-[11px] font-bold text-slate-800 bg-transparent outline-none cursor-pointer p-0"
                            title="Check-In Date"
                        />
                    </div>
                </div>

                {/* 2. Middle Nights Stepper & Calendar Popover Trigger */}
                <div className="flex items-center gap-0.5 px-1.5 py-0.5 bg-slate-100 border-x border-slate-200 flex-shrink-0">
                    <button
                        type="button"
                        onClick={() => handleNightsChange(nights - 1)}
                        disabled={nights <= 1}
                        className="w-4.5 h-4.5 rounded flex items-center justify-center text-slate-600 hover:bg-white hover:text-blue-700 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer transition-colors"
                        title="Decrease 1 night"
                    >
                        <Minus size={10} className="stroke-[2.5]" />
                    </button>

                    <button
                        type="button"
                        onClick={() => setIsOpen(!isOpen)}
                        className={`px-2 py-0.5 rounded text-center cursor-pointer transition-all ${
                            isOpen
                                ? 'bg-blue-600 text-white shadow-xs'
                                : 'hover:bg-white text-blue-900'
                        }`}
                        title="Click to open interactive Date Range Calendar"
                    >
                        <span className="text-[11px] font-black font-mono flex items-center gap-1">
                            <span>{nights}N</span>
                            <span className="text-[8px] opacity-75">📅</span>
                        </span>
                    </button>

                    <button
                        type="button"
                        onClick={() => handleNightsChange(nights + 1)}
                        className="w-4.5 h-4.5 rounded flex items-center justify-center text-slate-600 hover:bg-white hover:text-blue-700 cursor-pointer transition-colors"
                        title="Increase 1 night"
                    >
                        <Plus size={10} className="stroke-[2.5]" />
                    </button>
                </div>

                {/* 3. Check Out Date Input with automatic sync */}
                <div className="flex-1 flex items-center gap-1.5 px-2 min-w-0 bg-slate-50/50">
                    <ArrowRight size={11} className="text-slate-400 flex-shrink-0" />
                    <div className="flex items-center gap-1 min-w-0 flex-1">
                        <input
                            type="date"
                            value={checkOut}
                            min={checkIn}
                            onChange={e => handleDirectCheckOutChange(e.target.value)}
                            className="w-full text-[11px] font-bold text-slate-800 bg-transparent outline-none cursor-pointer p-0"
                            title="Check-Out Date (Auto-calculated or custom departure)"
                        />
                    </div>
                </div>
            </div>

            {/* Interactive Visual Date Range Calendar Popover (Matches Client Screenshot) */}
            {isOpen && (
                <div className="absolute top-full left-0 z-[100060] mt-1.5 w-[330px] sm:w-[350px] bg-white rounded-xl shadow-2xl border border-slate-200 p-3 animate-in fade-in zoom-in-95 duration-100">
                    {/* Top Blue Accent Line (matching reference screenshot) */}
                    <div className="h-1 bg-blue-600 rounded-t-lg -mx-3 -mt-3 mb-2.5"></div>

                    {/* Month Header with Navigation */}
                    <div className="flex items-center justify-between px-1 mb-2">
                        <button
                            type="button"
                            onClick={handlePrevMonth}
                            className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-600 hover:bg-slate-100 hover:text-slate-900 cursor-pointer transition-colors"
                            title="Previous Month"
                        >
                            <ChevronLeft size={16} />
                        </button>

                        <div className="text-center">
                            <h3 className="text-sm font-bold text-slate-900 tracking-tight">
                                {monthNames[viewMonth]} {viewYear}
                            </h3>
                            {rangePhase === 'picking_checkout' && (
                                <p className="text-[9.5px] font-bold text-blue-600 animate-pulse">
                                    Click departure date (Check-out)
                                </p>
                            )}
                        </div>

                        <div className="flex items-center gap-1">
                            <button
                                type="button"
                                onClick={handleJumpToSystemDate}
                                className="px-1.5 py-0.5 rounded text-[9.5px] font-semibold text-slate-500 hover:text-blue-700 hover:bg-blue-50 transition-colors cursor-pointer"
                                title="Jump to Hotel System Operating Date"
                            >
                                <RotateCcw size={10} className="inline mr-0.5" />
                                Today
                            </button>
                            <button
                                type="button"
                                onClick={handleNextMonth}
                                className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-600 hover:bg-slate-100 hover:text-slate-900 cursor-pointer transition-colors"
                                title="Next Month"
                            >
                                <ChevronRight size={16} />
                            </button>
                        </div>
                    </div>

                    {/* Weekday Names Header (Mon Tue Wed Thu Fri Sat Sun - matching reference) */}
                    <div className="grid grid-cols-7 text-center text-[11px] font-medium text-slate-500 py-1 mb-1">
                        <div>Mon</div>
                        <div>Tue</div>
                        <div>Wed</div>
                        <div>Thu</div>
                        <div>Fri</div>
                        <div>Sat</div>
                        <div>Sun</div>
                    </div>

                    {/* Calendar Day Grid */}
                    <div className="grid grid-cols-7 gap-y-1 text-center select-none">
                        {calendarDays.map((item, idx) => {
                            if (!item) {
                                return <div key={`empty-${idx}`} className="h-8"></div>;
                            }

                            const { day, dateStr } = item;
                            const isStart = dateStr === effectiveStart;
                            const isEnd = dateStr === effectiveEnd && effectiveEnd > effectiveStart;
                            const isInRange = dateStr > effectiveStart && dateStr < effectiveEnd;
                            const isSingleSelected = isStart && effectiveStart === effectiveEnd;
                            const isToday = dateStr === (localStorage.getItem('hotel_system_date') || '2026-07-01');

                            return (
                                <div
                                    key={dateStr}
                                    onMouseEnter={() => setHoverDate(dateStr)}
                                    className={`relative h-8 flex items-center justify-center ${
                                        isInRange ? 'bg-slate-100/90' : ''
                                    } ${
                                        isStart && effectiveEnd > effectiveStart
                                            ? 'rounded-l-lg bg-gradient-to-r from-transparent to-slate-100/90'
                                            : ''
                                    } ${
                                        isEnd && effectiveEnd > effectiveStart
                                            ? 'rounded-r-lg bg-gradient-to-l from-transparent to-slate-100/90'
                                            : ''
                                    }`}
                                >
                                    <button
                                        type="button"
                                        onClick={() => handleDayClick(dateStr)}
                                        className={`w-7.5 h-7.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center justify-center relative ${
                                            isStart || isEnd
                                                ? 'bg-[#0066ff] text-white shadow-xs font-black z-10 scale-105'
                                                : isInRange
                                                    ? 'text-slate-900 font-bold hover:bg-slate-200/80'
                                                    : 'text-slate-700 hover:bg-slate-100 hover:text-blue-600'
                                        } ${isSingleSelected ? 'ring-2 ring-blue-500 ring-offset-1' : ''}`}
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

                    {/* Quick Presets Chips */}
                    <div className="mt-3 pt-2 border-t border-slate-100 flex items-center justify-between gap-1">
                        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                            Presets:
                        </span>
                        <div className="flex flex-wrap gap-1">
                            {quickNightPresets.map(presetNights => {
                                const isSelected = nights === presetNights;
                                return (
                                    <button
                                        key={presetNights}
                                        type="button"
                                        onClick={() => {
                                            handleNightsChange(presetNights);
                                            setIsOpen(false);
                                        }}
                                        className={`px-2 py-0.5 rounded text-[10px] font-bold transition-all cursor-pointer ${
                                            isSelected
                                                ? 'bg-[#1e3a8a] text-white shadow-2xs'
                                                : 'bg-slate-100 text-slate-600 hover:bg-blue-50 hover:text-blue-700'
                                        }`}
                                    >
                                        {presetNights}N
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    {/* Bottom Status / Summary & Actions Bar */}
                    <div className="mt-2.5 pt-2 border-t border-slate-100 flex items-center justify-between text-[11px]">
                        <div className="text-slate-600">
                            <span>
                                <strong className="text-slate-900">{formatDisplayDate(effectiveStart)}</strong>
                                {' ➔ '}
                                <strong className="text-slate-900">{formatDisplayDate(effectiveEnd)}</strong>
                            </span>
                            <span className="ml-1.5 text-blue-700 font-bold">
                                ({calculateNights(effectiveStart, effectiveEnd)} {calculateNights(effectiveStart, effectiveEnd) > 1 ? 'Nights' : 'Night'})
                            </span>
                        </div>

                        <button
                            type="button"
                            onClick={() => setIsOpen(false)}
                            className="px-2.5 py-1 rounded-md bg-[#1e3a8a] text-white font-bold text-[10.5px] hover:bg-blue-900 cursor-pointer shadow-2xs transition-colors flex items-center gap-1"
                        >
                            <Check size={11} className="stroke-[3]" />
                            <span>Done</span>
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default StayPeriodPicker;
