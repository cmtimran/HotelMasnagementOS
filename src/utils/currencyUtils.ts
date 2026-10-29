/**
 * HotelManagementOS - Centralized Currency Management
 * Dynamically resolves currency and symbol based on active property configuration
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
 * Get current active property currency code (e.g. 'BDT', 'USD')
 */
export const getActiveCurrencyCode = (): string => {
    if (typeof window !== 'undefined') {
        const custom = localStorage.getItem('hotel_active_property_currency');
        if (custom) return custom;
    }
    return 'USD';
};

/**
 * Get currency symbol for a given currency code or the active property's currency
 */
export const getCurrencySymbol = (currencyCode?: string): string => {
    const code = (currencyCode || getActiveCurrencyCode()).toUpperCase();
    return CURRENCY_SYMBOLS[code] || code;
};

/**
 * Formats a numeric monetary value with the appropriate currency symbol
 */
export const formatMoney = (amount: number | string | undefined | null, currencyCode?: string): string => {
    const num = Number(amount) || 0;
    const symbol = getCurrencySymbol(currencyCode);
    return `${symbol}${num.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
};
