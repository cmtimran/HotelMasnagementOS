import { useState, useEffect } from 'react';

/**
 * HotelManagementOS - Centralized Currency Management
 * Dynamically resolves currency code and symbol based on active property configuration.
 * All properties and modules across the PMS strictly inherit this base currency.
 */

const CURRENCY_SYMBOLS: Record<string, string> = {
    BDT: '৳',
    USD: '$',
    EUR: '€',
    GBP: '£',
    INR: '₹',
    AUD: 'A$',
    CAD: 'C$',
    AED: 'AED',
    SAR: 'SAR',
    JPY: '¥',
    CNY: '¥',
    SGD: 'S$',
    MYR: 'RM',
    THB: '฿',
};

/**
 * Normalizes any currency string (e.g. "BDT (৳ - Bangladeshi Taka)", "bdt", "USD ($)") to a clean 3-letter ISO code
 */
export const normalizeCurrencyCode = (val?: string | null): string => {
    if (!val || typeof val !== 'string') return '';
    const trimmed = val.trim();
    if (!trimmed) return '';
    // If format like "BDT (৳ - Bangladeshi Taka)", extract the first 3 letters
    const match = trimmed.match(/^([A-Z]{3})/i);
    if (match) {
        return match[1].toUpperCase();
    }
    return trimmed.slice(0, 3).toUpperCase();
};

/**
 * Get current active property base currency code (e.g. 'BDT', 'USD', 'EUR')
 * Resolves with multi-tier failover:
 * 1. Explicit active property currency override in localStorage
 * 2. Active property unified settings in localStorage
 * 3. General settings configuration in localStorage
 * 4. Master Data Catalog primary base currency
 * 5. Default operational fallback: 'BDT' (Grand Palace Hotel & Resort standard)
 */
export const getActiveCurrencyCode = (): string => {
    if (typeof window !== 'undefined') {
        // 1. Direct explicit active property currency override
        try {
            const explicit = localStorage.getItem('hotel_active_property_currency');
            const clean = normalizeCurrencyCode(explicit);
            if (clean) return clean;
        } catch {}

        // 2. Active property specific unified settings
        try {
            const activePropId = localStorage.getItem('hotel_active_property_id') || '1';
            const propSettingsRaw = localStorage.getItem(`hotel_unified_settings_prop_${activePropId}`);
            if (propSettingsRaw) {
                const parsed = JSON.parse(propSettingsRaw);
                const base = parsed?.settings?.baseCurrency || parsed?.baseCurrency || parsed?.currency;
                const clean = normalizeCurrencyCode(base);
                if (clean) return clean;
            }
        } catch {}

        // 3. Global general settings cache (Settings > Currency, VAT & Tax)
        try {
            const genSettingsRaw = localStorage.getItem('hotel_general_settings_v1');
            if (genSettingsRaw) {
                const parsed = JSON.parse(genSettingsRaw);
                const base = parsed?.baseCurrency || parsed?.currency;
                const clean = normalizeCurrencyCode(base);
                if (clean) return clean;
            }
        } catch {}

        // 4. Master data config currencies
        try {
            const masterCurrenciesRaw = localStorage.getItem('hotel_master_currencies_v1');
            if (masterCurrenciesRaw) {
                const list = JSON.parse(masterCurrenciesRaw);
                if (Array.isArray(list)) {
                    const base = list.find((c: any) => c.isBase || c.is_base);
                    const clean = normalizeCurrencyCode(base?.code);
                    if (clean) return clean;
                }
            }
        } catch {}
    }

    // Default enterprise base currency is BDT (Bangladeshi Taka)
    return 'BDT';
};

/**
 * Get currency symbol for a given currency code or the active property's base currency
 */
export const getCurrencySymbol = (currencyCode?: string): string => {
    const code = normalizeCurrencyCode(currencyCode) || getActiveCurrencyCode();
    return CURRENCY_SYMBOLS[code] || code;
};

/**
 * Explicitly sets and broadcasts the active operational base currency across all open tabs & components
 */
export const setActiveCurrencyCode = (currencyCode: string): void => {
    if (typeof window === 'undefined' || !currencyCode) return;
    const cleanCode = normalizeCurrencyCode(currencyCode);
    if (!cleanCode) return;

    localStorage.setItem('hotel_active_property_currency', cleanCode);
    const sym = getCurrencySymbol(cleanCode);

    window.dispatchEvent(new CustomEvent('hotel_currency_changed', {
        detail: { currency: cleanCode, symbol: sym }
    }));
};

/**
 * Formats a numeric monetary value with the appropriate currency symbol
 */
export const formatMoney = (amount: number | string | undefined | null, currencyCode?: string): string => {
    const num = Number(amount) || 0;
    const symbol = getCurrencySymbol(currencyCode);
    return `${symbol} ${num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

/**
 * Custom React Hook: Returns reactive live currency code & symbol.
 * Automatically triggers component re-render whenever the base currency is modified in Settings or Property is switched.
 */
export const useActiveCurrency = (): { currencyCode: string; currencySymbol: string } => {
    const [currencyCode, setCurrencyCode] = useState<string>(() => getActiveCurrencyCode());

    useEffect(() => {
        const handleUpdate = () => {
            setCurrencyCode(getActiveCurrencyCode());
        };

        window.addEventListener('hotel_currency_changed', handleUpdate);
        window.addEventListener('storage', handleUpdate);
        window.addEventListener('hotel_property_switched', handleUpdate);

        return () => {
            window.removeEventListener('hotel_currency_changed', handleUpdate);
            window.removeEventListener('storage', handleUpdate);
            window.removeEventListener('hotel_property_switched', handleUpdate);
        };
    }, []);

    return {
        currencyCode,
        currencySymbol: getCurrencySymbol(currencyCode)
    };
};
