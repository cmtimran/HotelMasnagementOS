import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Search, ChevronDown, Check, X, Plus } from 'lucide-react';

export interface SearchableOption {
    value: string;
    label: string;
    subLabel?: string;
    group?: string;
    badge?: string;
}

interface SearchableSelectProps {
    value: string;
    onChange: (value: string) => void;
    options: Array<SearchableOption | string>;
    placeholder?: string;
    searchPlaceholder?: string;
    allowCustom?: boolean;
    customPromptText?: string;
    disabled?: boolean;
    required?: boolean;
    className?: string;
    compact?: boolean;
    autoFocusSearch?: boolean;
}

export const SearchableSelect: React.FC<SearchableSelectProps> = ({
    value,
    onChange,
    options,
    placeholder = 'Select an option...',
    searchPlaceholder = 'Search...',
    allowCustom = false,
    customPromptText = 'Use custom:',
    disabled = false,
    required = false,
    className = '',
    compact = false,
    autoFocusSearch = true
}) => {
    const [isOpen, setIsOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const containerRef = useRef<HTMLDivElement | null>(null);
    const searchInputRef = useRef<HTMLInputElement | null>(null);
    const listRef = useRef<HTMLDivElement | null>(null);

    // Normalize options into SearchableOption[]
    const normalizedOptions = useMemo<SearchableOption[]>(() => {
        if (!Array.isArray(options)) return [];
        return options.filter(Boolean).map(opt => {
            if (typeof opt === 'string') {
                return { value: opt, label: opt };
            }
            return {
                value: String(opt.value ?? ''),
                label: String(opt.label ?? opt.value ?? ''),
                subLabel: opt.subLabel ? String(opt.subLabel) : undefined,
                group: opt.group ? String(opt.group) : undefined,
                badge: opt.badge ? String(opt.badge) : undefined
            };
        });
    }, [options]);

    // Active selected label
    const selectedOption = useMemo(() => {
        return normalizedOptions.find(o => o.value === value) || (value ? { value, label: value } : null);
    }, [normalizedOptions, value]);

    // Filtered options based on search query
    const filteredOptions = useMemo(() => {
        if (!searchQuery.trim()) return normalizedOptions;
        const q = searchQuery.toLowerCase().trim();
        return normalizedOptions.filter(o =>
            (o.label && String(o.label).toLowerCase().includes(q)) ||
            (o.value && String(o.value).toLowerCase().includes(q)) ||
            (o.subLabel && String(o.subLabel).toLowerCase().includes(q)) ||
            (o.group && String(o.group).toLowerCase().includes(q))
        );
    }, [normalizedOptions, searchQuery]);

    // Handle outside click
    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
                setIsOpen(false);
                setSearchQuery('');
            }
        };
        if (isOpen) {
            document.addEventListener('mousedown', handleClickOutside);
        }
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [isOpen]);

    // Auto focus search input on open
    useEffect(() => {
        if (isOpen && autoFocusSearch) {
            setTimeout(() => {
                searchInputRef.current?.focus();
            }, 50);
        }
    }, [isOpen, autoFocusSearch]);

    const handleSelect = (val: string) => {
        onChange(val);
        setIsOpen(false);
        setSearchQuery('');
    };

    const handleCustomSelect = () => {
        if (searchQuery.trim()) {
            onChange(searchQuery.trim());
            setIsOpen(false);
            setSearchQuery('');
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Escape') {
            setIsOpen(false);
            setSearchQuery('');
        } else if (e.key === 'Enter') {
            e.preventDefault();
            if (filteredOptions.length > 0) {
                handleSelect(filteredOptions[0].value);
            } else if (allowCustom && searchQuery.trim()) {
                handleCustomSelect();
            }
        }
    };

    const isCustomMatch = allowCustom && searchQuery.trim() && !filteredOptions.some(
        o => String(o.value || '').toLowerCase() === searchQuery.trim().toLowerCase() ||
             String(o.label || '').toLowerCase() === searchQuery.trim().toLowerCase()
    );

    const triggerHeight = compact ? 'h-7 text-[11px] px-2' : 'h-8 sm:h-9 text-xs px-2.5';

    return (
        <div ref={containerRef} className={`relative w-full min-w-0 ${className}`}>
            {/* Hidden Input for Form Validity */}
            {required && (
                <input
                    type="text"
                    value={value}
                    required={required}
                    onChange={() => {}}
                    className="sr-only"
                    tabIndex={-1}
                />
            )}

            {/* Trigger Button */}
            <button
                type="button"
                disabled={disabled}
                onClick={() => {
                    if (!disabled) setIsOpen(prev => !prev);
                }}
                className={`w-full min-w-0 ${triggerHeight} flex items-center justify-between gap-1.5 rounded-lg border bg-white text-left font-medium transition-all ${
                    disabled
                        ? 'bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed'
                        : isOpen
                        ? 'border-blue-500 ring-2 ring-blue-500/20 shadow-xs'
                        : 'border-slate-300 hover:border-slate-400 shadow-2xs'
                }`}
            >
                <div className="flex-1 min-w-0 truncate">
                    {selectedOption ? (
                        <div className="flex items-center gap-1.5 min-w-0 truncate">
                            <span className="text-slate-900 font-semibold truncate leading-tight">{selectedOption.label}</span>
                            {selectedOption.badge && (
                                <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-slate-100 text-slate-600 border border-slate-200 shrink-0">
                                    {selectedOption.badge}
                                </span>
                            )}
                        </div>
                    ) : (
                        <span className="text-slate-400 font-normal truncate">{placeholder}</span>
                    )}
                </div>
                <div className="flex items-center gap-1 text-slate-400 shrink-0">
                    <ChevronDown size={compact ? 12 : 14} className={`transition-transform duration-150 ${isOpen ? 'rotate-180 text-blue-600' : ''}`} />
                </div>
            </button>

            {/* Dropdown Popover */}
            {isOpen && (
                <div
                    onKeyDown={handleKeyDown}
                    className="absolute z-50 mt-1 w-full min-w-[240px] max-w-[420px] rounded-xl border border-slate-200 bg-white p-1.5 shadow-xl transition-all animate-in fade-in zoom-in-95 duration-100 left-0"
                >
                    {/* Search Input */}
                    <div className="relative mb-1.5">
                        <Search
                            size={14}
                            className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
                        />
                        <input
                            ref={searchInputRef}
                            type="text"
                            value={searchQuery}
                            onChange={e => setSearchQuery(e.target.value)}
                            placeholder={searchPlaceholder}
                            className="w-full rounded-md border border-slate-200 bg-slate-50/80 py-1.5 pl-8 pr-7 text-xs text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-500/30"
                        />
                        {searchQuery && (
                            <button
                                type="button"
                                onClick={() => setSearchQuery('')}
                                className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer p-0.5"
                            >
                                <X size={12} />
                            </button>
                        )}
                    </div>

                    {/* Options List */}
                    <div ref={listRef} className="max-h-60 overflow-y-auto space-y-0.5 pr-0.5 scrollbar-thin">
                        {/* Custom Entry Option */}
                        {isCustomMatch && (
                            <button
                                type="button"
                                onClick={handleCustomSelect}
                                className="w-full px-2.5 py-1.5 rounded-lg text-left text-xs bg-blue-50/90 text-blue-900 hover:bg-blue-100 border border-blue-200/80 font-medium flex items-center justify-between gap-1.5 transition-colors cursor-pointer mb-1"
                            >
                                <span className="flex items-center gap-1.5 truncate">
                                    <Plus size={13} className="text-blue-600 shrink-0" />
                                    <span>{customPromptText} <strong className="font-bold">"{searchQuery.trim()}"</strong></span>
                                </span>
                                <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-blue-600 text-white shrink-0">
                                    Add Custom
                                </span>
                            </button>
                        )}

                        {filteredOptions.length > 0 ? (
                            filteredOptions.map((opt) => {
                                const isSelected = opt.value === value;
                                return (
                                    <button
                                        key={opt.value}
                                        type="button"
                                        onClick={() => handleSelect(opt.value)}
                                        className={`w-full px-2.5 py-1.5 rounded-lg text-left text-xs flex items-center justify-between gap-2 transition-colors cursor-pointer ${
                                            isSelected
                                                ? 'bg-blue-600 text-white font-semibold'
                                                : 'text-slate-700 hover:bg-slate-100/80 hover:text-slate-900'
                                        }`}
                                    >
                                        <div className="flex flex-col min-w-0">
                                            <span className="truncate leading-snug">{opt.label}</span>
                                            {opt.subLabel && (
                                                <span className={`text-[10px] truncate leading-tight ${isSelected ? 'text-blue-100' : 'text-slate-400'}`}>
                                                    {opt.subLabel}
                                                </span>
                                            )}
                                        </div>
                                        <div className="flex items-center gap-1 shrink-0">
                                            {opt.badge && (
                                                <span className={`px-1.5 py-0.2 rounded text-[8.5px] font-bold ${
                                                    isSelected ? 'bg-blue-700 text-white' : 'bg-slate-100 text-slate-600'
                                                }`}>
                                                    {opt.badge}
                                                </span>
                                            )}
                                            {isSelected && <Check size={14} className="shrink-0" />}
                                        </div>
                                    </button>
                                );
                            })
                        ) : !isCustomMatch ? (
                            <div className="py-4 text-center text-xs text-slate-400">
                                No matching results found
                            </div>
                        ) : null}
                    </div>
                </div>
            )}
        </div>
    );
};
