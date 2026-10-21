import React, { useState, useRef, useEffect } from 'react';
import { Minus, Plus, ChevronDown, X, Check, Baby } from 'lucide-react';

export interface ChildAgeSelectorProps {
    childrenCount: number;
    childrenAges?: number[];
    onChange: (count: number, ages: number[]) => void;
    compact?: boolean;
}

export const ChildAgeSelector: React.FC<ChildAgeSelectorProps> = ({
    childrenCount,
    childrenAges = [],
    onChange,
    compact = false
}) => {
    const [isOpen, setIsOpen] = useState(false);
    const triggerRef = useRef<HTMLDivElement>(null);
    const [popoverStyle, setPopoverStyle] = useState<React.CSSProperties>({});

    // Calculate fixed viewport coordinates when opened so table overflow NEVER clips it
    useEffect(() => {
        if (isOpen && triggerRef.current) {
            const rect = triggerRef.current.getBoundingClientRect();
            const popoverWidth = 240;
            const popoverHeight = 220;

            // Horizontal position clamped to viewport
            let left = rect.left + rect.width / 2 - popoverWidth / 2;
            if (left < 10) left = 10;
            if (left + popoverWidth > window.innerWidth - 10) {
                left = window.innerWidth - popoverWidth - 10;
            }

            // Vertical position: drop below trigger if space allows, else flip above
            const spaceBelow = window.innerHeight - rect.bottom;
            let top = rect.bottom + 6;
            if (spaceBelow < popoverHeight && rect.top > popoverHeight) {
                top = rect.top - popoverHeight - 6;
            }

            setPopoverStyle({
                position: 'fixed',
                top: `${top}px`,
                left: `${left}px`,
                width: `${popoverWidth}px`,
                zIndex: 100090
            });
        }
    }, [isOpen]);

    const handleCountChange = (newCount: number) => {
        const safeCount = Math.max(0, Math.min(6, newCount));
        let newAges = [...childrenAges];
        if (safeCount > newAges.length) {
            for (let i = newAges.length; i < safeCount; i++) {
                newAges.push(5); // Default 5 years old
            }
        } else {
            newAges = newAges.slice(0, safeCount);
        }
        onChange(safeCount, newAges);
        if (safeCount > 0 && !isOpen) {
            setIsOpen(true);
        }
        if (safeCount === 0) {
            setIsOpen(false);
        }
    };

    const handleAgeChange = (childIndex: number, age: number) => {
        const newAges = [...childrenAges];
        newAges[childIndex] = age;
        onChange(childrenCount, newAges);
    };

    const getAgeCategory = (age: number) => {
        if (age <= 2) return 'Infant';
        if (age <= 11) return 'Kid';
        return 'Teen';
    };

    return (
        <div ref={triggerRef} className="relative inline-block text-left select-none">
            {/* Table Cell Trigger Badge / Stepper */}
            {childrenCount === 0 ? (
                <div className="flex items-center justify-center">
                    <button
                        type="button"
                        onClick={() => handleCountChange(1)}
                        className={`h-7 px-2.5 rounded border border-slate-200 hover:border-blue-400 bg-white hover:bg-blue-50/50 text-[11px] font-semibold text-slate-600 hover:text-blue-700 flex items-center gap-1 cursor-pointer transition-all ${
                            compact ? 'h-6 px-2 text-[10px]' : ''
                        }`}
                        title="Click to add children"
                    >
                        <span>0 Child</span>
                        <Plus size={10} className="text-slate-400" />
                    </button>
                </div>
            ) : (
                <div className="flex items-center justify-center">
                    <button
                        type="button"
                        onClick={() => setIsOpen(!isOpen)}
                        className={`h-7 px-2 rounded-md bg-blue-50/90 hover:bg-blue-100 border border-blue-200 text-blue-900 font-bold text-[11px] flex items-center gap-1.5 shadow-2xs cursor-pointer transition-all ${
                            compact ? 'h-6 px-1.5 text-[10.5px]' : ''
                        } ${isOpen ? 'ring-2 ring-blue-500/30 border-blue-500' : ''}`}
                        title="Click to adjust child ages"
                    >
                        <Baby size={12} className="text-blue-600 flex-shrink-0" />
                        <span>{childrenCount}</span>
                        <span className="text-[9.5px] font-normal text-blue-700 bg-blue-100/70 px-1 py-0.2 rounded border border-blue-200">
                            {childrenAges.slice(0, 2).map(a => `${a}y`).join(', ')}
                            {childrenAges.length > 2 ? '...' : ''}
                        </span>
                        <ChevronDown size={11} className="text-blue-500 opacity-70" />
                    </button>
                </div>
            )}

            {/* Smart Floating Child Age Manager Popover (Fixed in Viewport - NEVER clipped by table overflow) */}
            {isOpen && (
                <>
                    {/* Transparent Click-Catcher Backdrop */}
                    <div
                        className="fixed inset-0 z-[100085]"
                        onClick={() => setIsOpen(false)}
                    />

                    {/* Popover Card */}
                    <div
                        style={popoverStyle}
                        className="bg-white rounded-xl shadow-2xl border border-slate-200 p-3 animate-in fade-in zoom-in-95 duration-100 text-left"
                    >
                        {/* Header */}
                        <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                            <div className="flex items-center gap-1.5">
                                <div className="w-5 h-5 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center">
                                    <Baby size={12} />
                                </div>
                                <span className="text-xs font-bold text-slate-800 tracking-tight">
                                    Children &amp; Ages
                                </span>
                            </div>
                            <button
                                type="button"
                                onClick={() => setIsOpen(false)}
                                className="p-1 text-slate-400 hover:text-slate-600 rounded-md cursor-pointer hover:bg-slate-100 transition-colors"
                            >
                                <X size={12} />
                            </button>
                        </div>

                        {/* Children Count Stepper */}
                        <div className="flex items-center justify-between py-2 border-b border-slate-100">
                            <span className="text-[11px] font-medium text-slate-600">Total Children</span>
                            <div className="flex items-center gap-1 bg-slate-100 border border-slate-200 rounded-md p-0.5">
                                <button
                                    type="button"
                                    onClick={() => handleCountChange(childrenCount - 1)}
                                    className="w-5 h-5 rounded bg-white text-slate-700 hover:text-blue-700 flex items-center justify-center font-bold text-xs shadow-2xs cursor-pointer"
                                >
                                    <Minus size={9} />
                                </button>
                                <span className="w-6 text-center text-xs font-black text-slate-900">
                                    {childrenCount}
                                </span>
                                <button
                                    type="button"
                                    onClick={() => handleCountChange(childrenCount + 1)}
                                    disabled={childrenCount >= 6}
                                    className="w-5 h-5 rounded bg-white text-slate-700 hover:text-blue-700 disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center font-bold text-xs shadow-2xs cursor-pointer"
                                >
                                    <Plus size={9} />
                                </button>
                            </div>
                        </div>

                        {/* Age Selectors for each child */}
                        {childrenCount > 0 && (
                            <div className="py-2 space-y-1.5 max-h-[160px] overflow-y-auto">
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                                    Specify Age for each Child:
                                </p>
                                {childrenAges.map((age, idx) => (
                                    <div
                                        key={idx}
                                        className="flex items-center justify-between bg-slate-50 border border-slate-200/80 rounded-lg px-2 py-1"
                                    >
                                        <div className="flex items-center gap-1.5">
                                            <span className="w-4.5 h-4.5 rounded-full bg-blue-100 text-blue-800 text-[10px] font-black flex items-center justify-center">
                                                {idx + 1}
                                            </span>
                                            <span className="text-[11px] font-semibold text-slate-700">
                                                Child {idx + 1}
                                            </span>
                                        </div>

                                        <div className="flex items-center gap-1">
                                            <span className="text-[9px] font-medium text-slate-400">
                                                ({getAgeCategory(age)})
                                            </span>
                                            <select
                                                value={age}
                                                onChange={e => handleAgeChange(idx, Number(e.target.value))}
                                                className="h-6 px-1.5 border border-slate-200 rounded text-[11px] font-bold text-blue-900 bg-white outline-none cursor-pointer focus:border-blue-500"
                                            >
                                                <option value={0}>&lt; 1 yr</option>
                                                {Array.from({ length: 17 }, (_, i) => i + 1).map(y => (
                                                    <option key={y} value={y}>
                                                        {y} yr{y > 1 ? 's' : ''}
                                                    </option>
                                                ))}
                                            </select>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}

                        {/* Done Action Button */}
                        <div className="pt-2 border-t border-slate-100 flex justify-end">
                            <button
                                type="button"
                                onClick={() => setIsOpen(false)}
                                className="px-3 py-1 bg-[#1e3a8a] hover:bg-blue-900 text-white font-bold text-[10.5px] rounded-md shadow-2xs flex items-center gap-1 cursor-pointer transition-colors"
                            >
                                <Check size={11} className="stroke-[3]" />
                                <span>Done</span>
                            </button>
                        </div>
                    </div>
                </>
            )}
        </div>
    );
};

export default ChildAgeSelector;
