import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Search, ChevronDown, Check, X } from 'lucide-react';
import { COUNTRIES_DATABASE, type CountryInfo } from '../../utils/geoData';

export function getCountryFlagEmoji(countryCode: string): string {
    if (!countryCode || countryCode.length !== 2) return '🌐';
    const codePoints = countryCode
        .toUpperCase()
        .split('')
        .map(char => 127397 + char.charCodeAt(0));
    return String.fromCodePoint(...codePoints);
}

export interface PhoneInputWithCountryProps {
    value: string;
    onChange: (fullPhoneNumber: string, parsed?: { dialCode: string; nationalNumber: string; countryCode: string }) => void;
    defaultCountryCode?: string;
    placeholder?: string;
    disabled?: boolean;
    required?: boolean;
    compact?: boolean;
    className?: string;
    inputClassName?: string;
    name?: string;
    id?: string;
    autoComplete?: string;
    onFocus?: (e: React.FocusEvent<HTMLInputElement>) => void;
    onBlur?: (e: React.FocusEvent<HTMLInputElement>) => void;
    onKeyDown?: (e: React.KeyboardEvent<HTMLInputElement>) => void;
    children?: React.ReactNode;
}

export const PhoneInputWithCountry: React.FC<PhoneInputWithCountryProps> = ({
    value,
    onChange,
    defaultCountryCode = 'BD',
    placeholder = '1711-000000',
    disabled = false,
    required = false,
    compact = false,
    className = '',
    inputClassName = '',
    name = 'phone',
    id,
    autoComplete = 'tel',
    onFocus,
    onBlur,
    onKeyDown,
    children
}) => {
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const containerRef = useRef<HTMLDivElement | null>(null);
    const searchInputRef = useRef<HTMLInputElement | null>(null);
    const numberInputRef = useRef<HTMLInputElement | null>(null);

    // Initial country resolution
    const defaultCountry = useMemo(() => {
        return (
            COUNTRIES_DATABASE.find(c => c.code.toUpperCase() === defaultCountryCode.toUpperCase()) ||
            COUNTRIES_DATABASE[0]
        );
    }, [defaultCountryCode]);

    // Parse incoming value to separate dialCode and nationalNumber
    const { currentCountry, nationalNumber } = useMemo(() => {
        if (!value) {
            return { currentCountry: defaultCountry, nationalNumber: '' };
        }

        const trimmed = value.trim();

        // Check if value starts with a known dial code
        if (trimmed.startsWith('+')) {
            // Sort countries by dialCode length descending so +880 matches before +88
            const sortedCountries = [...COUNTRIES_DATABASE].sort(
                (a, b) => b.dialCode.length - a.dialCode.length
            );
            const matched = sortedCountries.find(c => trimmed.startsWith(c.dialCode));
            if (matched) {
                const rest = trimmed.slice(matched.dialCode.length).trim();
                return { currentCountry: matched, nationalNumber: rest };
            }
        }

        // If it starts with domestic zero (e.g. "017...")
        if (trimmed.startsWith('0')) {
            return { currentCountry: defaultCountry, nationalNumber: trimmed.replace(/^0+/, '') };
        }

        return { currentCountry: defaultCountry, nationalNumber: trimmed };
    }, [value, defaultCountry]);

    const [selectedCountry, setSelectedCountry] = useState<CountryInfo>(currentCountry);

    // Keep selectedCountry in sync if currentCountry changes from outside (e.g. user selected different Country in form)
    useEffect(() => {
        if (currentCountry && currentCountry.code !== selectedCountry.code) {
            setSelectedCountry(currentCountry);
        }
    }, [currentCountry]);

    // Filtered countries for dropdown
    const filteredCountries = useMemo(() => {
        if (!searchQuery.trim()) return COUNTRIES_DATABASE;
        const q = searchQuery.toLowerCase().trim();
        return COUNTRIES_DATABASE.filter(c =>
            c.name.toLowerCase().includes(q) ||
            c.dialCode.toLowerCase().includes(q) ||
            c.code.toLowerCase().includes(q) ||
            c.nationality.toLowerCase().includes(q)
        );
    }, [searchQuery]);

    // Close dropdown on outside click
    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
                setIsDropdownOpen(false);
                setSearchQuery('');
            }
        };
        if (isDropdownOpen) {
            document.addEventListener('mousedown', handleClickOutside);
        }
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [isDropdownOpen]);

    // Focus search on dropdown open
    useEffect(() => {
        if (isDropdownOpen) {
            setTimeout(() => {
                searchInputRef.current?.focus();
            }, 50);
        }
    }, [isDropdownOpen]);

    const emitChange = (country: CountryInfo, number: string) => {
        // Strip non-digits and leading zeros
        let clean = number.replace(/[^\d\s\-]/g, '');
        if (clean.startsWith('0')) {
            clean = clean.replace(/^0+/, '');
        }
        const full = clean ? `${country.dialCode} ${clean}` : '';
        onChange(full, {
            dialCode: country.dialCode,
            nationalNumber: clean,
            countryCode: country.code
        });
    };

    const handleSelectCountry = (country: CountryInfo) => {
        setSelectedCountry(country);
        setIsDropdownOpen(false);
        setSearchQuery('');
        emitChange(country, nationalNumber);
        setTimeout(() => {
            numberInputRef.current?.focus();
        }, 50);
    };

    const handleNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const raw = e.target.value;

        // Auto-detect if user pasted a number with a country code (+...)
        if (raw.startsWith('+')) {
            const sorted = [...COUNTRIES_DATABASE].sort((a, b) => b.dialCode.length - a.dialCode.length);
            const found = sorted.find(c => raw.startsWith(c.dialCode));
            if (found) {
                const rest = raw.slice(found.dialCode.length).trim();
                setSelectedCountry(found);
                emitChange(found, rest);
                return;
            }
        }

        emitChange(selectedCountry, raw);
    };

    const handleClear = () => {
        onChange('', {
            dialCode: selectedCountry.dialCode,
            nationalNumber: '',
            countryCode: selectedCountry.code
        });
        numberInputRef.current?.focus();
    };

    const heightClass = compact ? 'h-7 text-[11px]' : 'h-8 sm:h-9 text-xs';
    const flagSize = compact ? 'text-[11px]' : 'text-sm';

    return (
        <div ref={containerRef} className={`relative flex items-center w-full min-w-0 ${className}`}>
            {/* Hidden Input for Form Validity */}
            {required && (
                <input
                    type="text"
                    value={nationalNumber}
                    required={required}
                    onChange={() => {}}
                    className="sr-only"
                    tabIndex={-1}
                />
            )}

            {/* Country Selector Trigger */}
            <button
                type="button"
                disabled={disabled}
                onClick={() => {
                    if (!disabled) setIsDropdownOpen(prev => !prev);
                }}
                title={`${selectedCountry.name} (${selectedCountry.dialCode})`}
                className={`flex items-center gap-1 ${heightClass} ${compact ? 'px-1.5' : 'px-2'} bg-slate-50 hover:bg-slate-100 border border-r-0 border-slate-300 rounded-l-lg text-slate-700 font-mono font-semibold shrink-0 transition-colors cursor-pointer select-none ${
                    disabled ? 'opacity-50 cursor-not-allowed' : ''
                }`}
            >
                <span className={flagSize}>{getCountryFlagEmoji(selectedCountry.code)}</span>
                <span className={`${compact ? 'text-[10px]' : 'text-[11px]'} font-bold text-slate-800 font-mono`}>{selectedCountry.dialCode}</span>
                <ChevronDown size={compact ? 10 : 12} className={`text-slate-400 transition-transform ${isDropdownOpen ? 'rotate-180' : ''}`} />
            </button>

            {/* National Phone Number Input */}
            <div className="relative flex-1 min-w-0">
                <input
                    ref={numberInputRef}
                    id={id}
                    name={name}
                    type="tel"
                    autoComplete={autoComplete}
                    disabled={disabled}
                    placeholder={placeholder}
                    value={nationalNumber}
                    onChange={handleNumberChange}
                    onFocus={onFocus}
                    onBlur={onBlur}
                    onKeyDown={onKeyDown}
                    className={`w-full min-w-0 ${heightClass} ${compact ? 'px-2 pr-6' : 'px-2.5 pr-7'} border border-slate-300 rounded-r-lg bg-white text-slate-900 font-mono font-medium outline-none transition-all placeholder:text-slate-400 ${
                        disabled
                            ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                            : 'focus:border-blue-500 focus:ring-1 focus:ring-blue-500/30'
                    } ${inputClassName}`}
                />
                {nationalNumber && !disabled && (
                    <button
                        type="button"
                        onClick={handleClear}
                        className={`absolute ${compact ? 'right-1.5' : 'right-2'} top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5 rounded cursor-pointer transition-colors`}
                        title="Clear phone number"
                    >
                        <X size={compact ? 11 : 12} />
                    </button>
                )}
            </div>

            {/* Dropdown Popover */}
            {isDropdownOpen && (
                <div className="absolute top-full left-0 z-50 mt-1 w-72 rounded-xl border border-slate-200 bg-white p-1.5 shadow-xl animate-in fade-in zoom-in-95 duration-100">
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
                            placeholder="Search country or code (+971)..."
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

                    {/* Country List */}
                    <div className="max-h-60 overflow-y-auto space-y-0.5 pr-0.5 scrollbar-thin">
                        {filteredCountries.length > 0 ? (
                            filteredCountries.map(c => {
                                const isSelected = c.code === selectedCountry.code;
                                return (
                                    <button
                                        key={c.code}
                                        type="button"
                                        onClick={() => handleSelectCountry(c)}
                                        className={`w-full px-2.5 py-1.5 rounded-lg text-left text-xs flex items-center justify-between gap-2 transition-colors cursor-pointer ${
                                            isSelected
                                                ? 'bg-blue-600 text-white font-semibold'
                                                : 'text-slate-700 hover:bg-slate-100/80 hover:text-slate-900'
                                        }`}
                                    >
                                        <div className="flex items-center gap-2 truncate min-w-0">
                                            <span className="text-sm shrink-0">{getCountryFlagEmoji(c.code)}</span>
                                            <span className="truncate">{c.name}</span>
                                        </div>
                                        <div className="flex items-center gap-1.5 shrink-0">
                                            <span className={`font-mono text-[11px] font-bold ${isSelected ? 'text-white' : 'text-slate-500'}`}>
                                                {c.dialCode}
                                            </span>
                                            {isSelected && <Check size={13} className="shrink-0" />}
                                        </div>
                                    </button>
                                );
                            })
                        ) : (
                            <div className="py-4 text-center text-xs text-slate-400">
                                No matching country found
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Optional Children (e.g. Suggestions popover) */}
            {children}
        </div>
    );
};
