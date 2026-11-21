/**
 * HotelManagementOS - Dynamic Reservation & Room Status Color Engine
 * 
 * Provides:
 * 1. Single Source of Truth (SSOT) for all status colors across StayView, FrontDesk, RoomRack, ReservationsView.
 * 2. Property-scoped persistence in PostgreSQL (properties.settings.statusColors) & localStorage.
 * 3. Reactive updates across tabs and views via window event & PMS sync bus.
 * 4. Curated industry-standard hospitality presets (Opera PMS Classic, Modern Luxury, Vibrant High-Contrast).
 */

import { useState, useEffect } from 'react';
import { getApiBaseUrl } from './apiUrl';

export type StatusCategory = 'reservation' | 'frontdesk' | 'room';

export interface StatusColorConfig {
    key: string;
    label: string;
    category: StatusCategory;
    bg: string;            // Hex color e.g. #2563EB
    text: string;          // Hex text e.g. #FFFFFF
    border: string;        // Hex border e.g. #1D4ED8
    description: string;
}

export const DEFAULT_STATUS_COLORS: Record<string, StatusColorConfig> = {
    'confirmed': {
        key: 'confirmed',
        label: 'Confirmed',
        category: 'reservation',
        bg: '#2563EB', // Royal Blue
        text: '#FFFFFF',
        border: '#1D4ED8',
        description: 'Guaranteed reservation ready for guest arrival (Standard Opera Blue)'
    },
    'tentative': {
        key: 'tentative',
        label: 'Tentative / Unconfirmed',
        category: 'reservation',
        bg: '#64748B', // Cool Slate
        text: '#FFFFFF',
        border: '#475569',
        description: 'Inquiry or unverified booking without payment/guarantee'
    },
    'reserved': {
        key: 'reserved',
        label: 'Reserved (Pre-Arrival)',
        category: 'reservation',
        bg: '#4F46E5', // Indigo
        text: '#FFFFFF',
        border: '#4338CA',
        description: 'Allocated room reservation awaiting physical arrival'
    },
    'hold': {
        key: 'hold',
        label: 'Hold (Courtesy / 6 PM Release)',
        category: 'reservation',
        bg: '#D97706', // Amber Gold
        text: '#FFFFFF',
        border: '#B45309',
        description: 'Time-limited courtesy hold that auto-releases if deposit unpaid'
    },
    'arriving': {
        key: 'arriving',
        label: 'Arriving / Due In Today',
        category: 'frontdesk',
        bg: '#0284C7', // Sky Blue
        text: '#FFFFFF',
        border: '#0369A1',
        description: 'Expected to check-in on the current PMS business date'
    },
    'in-house': {
        key: 'in-house',
        label: 'In-House / Checked In',
        category: 'frontdesk',
        bg: '#059669', // Emerald Green
        text: '#FFFFFF',
        border: '#047857',
        description: 'Physically checked in and currently occupying the room'
    },
    'stayover': {
        key: 'stayover',
        label: 'Stayover',
        category: 'frontdesk',
        bg: '#0D9488', // Teal
        text: '#FFFFFF',
        border: '#0F766E',
        description: 'Continuing guest staying over multiple nights'
    },
    'departing': {
        key: 'departing',
        label: 'Departing / Due Out',
        category: 'frontdesk',
        bg: '#EA580C', // Vibrant Orange
        text: '#FFFFFF',
        border: '#C2410C',
        description: 'Scheduled to check out on the current PMS business date'
    },
    'checked-out': {
        key: 'checked-out',
        label: 'Checked Out / Departed',
        category: 'frontdesk',
        bg: '#475569', // Dark Slate Charcoal
        text: '#FFFFFF',
        border: '#334155',
        description: 'Completed stay, vacated and ready for housekeeping turnover'
    },
    'day-use': {
        key: 'day-use',
        label: 'Day Use',
        category: 'reservation',
        bg: '#8B5CF6', // Purple
        text: '#FFFFFF',
        border: '#7C3AED',
        description: 'Same-day arrival and departure without overnight stay'
    },
    'out-of-order': {
        key: 'out-of-order',
        label: 'Out of Order (OOO)',
        category: 'room',
        bg: '#DC2626', // Crimson Red
        text: '#FFFFFF',
        border: '#B91C1C',
        description: 'Major defect or construction; removed from total sellable inventory'
    },
    'out-of-service': {
        key: 'out-of-service',
        label: 'Out of Service (OOS)',
        category: 'room',
        bg: '#F59E0B', // Amber Alert
        text: '#FFFFFF',
        border: '#D97706',
        description: 'Minor maintenance or inspection; remains in gross inventory'
    },
    'cancelled': {
        key: 'cancelled',
        label: 'Cancelled / Void',
        category: 'reservation',
        bg: '#94A3B8', // Light Slate Grey
        text: '#1E293B',
        border: '#CBD5E1',
        description: 'Cancelled reservation or voided booking'
    }
};

export const COLOR_PRESETS: Record<string, { name: string; description: string; colors: Record<string, Partial<StatusColorConfig>> }> = {
    'opera': {
        name: 'Opera PMS Enterprise (Industry Standard)',
        description: 'Classic high-contrast hotel management palette used by 5-star global chains',
        colors: {
            'confirmed': { bg: '#2563EB', text: '#FFFFFF', border: '#1D4ED8' },
            'tentative': { bg: '#64748B', text: '#FFFFFF', border: '#475569' },
            'reserved': { bg: '#4F46E5', text: '#FFFFFF', border: '#4338CA' },
            'hold': { bg: '#D97706', text: '#FFFFFF', border: '#B45309' },
            'arriving': { bg: '#0284C7', text: '#FFFFFF', border: '#0369A1' },
            'in-house': { bg: '#059669', text: '#FFFFFF', border: '#047857' },
            'stayover': { bg: '#0D9488', text: '#FFFFFF', border: '#0F766E' },
            'departing': { bg: '#EA580C', text: '#FFFFFF', border: '#C2410C' },
            'checked-out': { bg: '#475569', text: '#FFFFFF', border: '#334155' },
            'day-use': { bg: '#8B5CF6', text: '#FFFFFF', border: '#7C3AED' },
            'out-of-order': { bg: '#DC2626', text: '#FFFFFF', border: '#B91C1C' },
            'out-of-service': { bg: '#F59E0B', text: '#FFFFFF', border: '#D97706' },
            'cancelled': { bg: '#94A3B8', text: '#1E293B', border: '#CBD5E1' }
        }
    },
    'modern_vibrant': {
        name: 'Modern High-Vibrancy PMS',
        description: 'High-visibility vibrant neon colors designed for high-density fast-paced front desks',
        colors: {
            'confirmed': { bg: '#3B82F6', text: '#FFFFFF', border: '#2563EB' },
            'tentative': { bg: '#94A3B8', text: '#0F172A', border: '#64748B' },
            'reserved': { bg: '#6366F1', text: '#FFFFFF', border: '#4F46E5' },
            'hold': { bg: '#F59E0B', text: '#FFFFFF', border: '#D97706' },
            'arriving': { bg: '#06B6D4', text: '#FFFFFF', border: '#0891B2' },
            'in-house': { bg: '#10B981', text: '#FFFFFF', border: '#059669' },
            'stayover': { bg: '#14B8A6', text: '#FFFFFF', border: '#0D9488' },
            'departing': { bg: '#F97316', text: '#FFFFFF', border: '#EA580C' },
            'checked-out': { bg: '#64748B', text: '#FFFFFF', border: '#475569' },
            'day-use': { bg: '#A855F7', text: '#FFFFFF', border: '#9333EA' },
            'out-of-order': { bg: '#EF4444', text: '#FFFFFF', border: '#DC2626' },
            'out-of-service': { bg: '#FBBF24', text: '#78350F', border: '#F59E0B' },
            'cancelled': { bg: '#E2E8F0', text: '#475569', border: '#CBD5E1' }
        }
    },
    'pastel_luxury': {
        name: 'Pastel Luxury Resort',
        description: 'Soft, elegant tones with dark contrasting typography for boutique & luxury resorts',
        colors: {
            'confirmed': { bg: '#BFDBFE', text: '#1E3A8A', border: '#93C5FD' },
            'tentative': { bg: '#E2E8F0', text: '#334155', border: '#CBD5E1' },
            'reserved': { bg: '#C7D2FE', text: '#312E81', border: '#A5B4FC' },
            'hold': { bg: '#FDE68A', text: '#78350F', border: '#FCD34D' },
            'arriving': { bg: '#BAE6FD', text: '#0C4A6E', border: '#7DD3FC' },
            'in-house': { bg: '#A7F3D0', text: '#064E3B', border: '#6EE7B7' },
            'stayover': { bg: '#99F6E4', text: '#134E4A', border: '#5EEAD4' },
            'departing': { bg: '#FED7AA', text: '#7C2D12', border: '#FDBA74' },
            'checked-out': { bg: '#CBD5E1', text: '#0F172A', border: '#94A3B8' },
            'day-use': { bg: '#DDD6FE', text: '#4C1D95', border: '#C4B5FD' },
            'out-of-order': { bg: '#FECDD3', text: '#881337', border: '#FDA4AF' },
            'out-of-service': { bg: '#FEF08A', text: '#713F12', border: '#FDE047' },
            'cancelled': { bg: '#F1F5F9', text: '#64748B', border: '#E2E8F0' }
        }
    }
};

const STORAGE_KEY = 'hotel_status_colors_v1';

export const getStatusColors = (propertyId?: number): Record<string, StatusColorConfig> => {
    if (typeof window === 'undefined') return { ...DEFAULT_STATUS_COLORS };
    const propId = propertyId || Number(localStorage.getItem('hotel_active_property_id')) || 1;
    const scopedKey = `hotel_status_colors_prop_${propId}`;
    try {
        const saved = localStorage.getItem(scopedKey) || localStorage.getItem(STORAGE_KEY);
        if (saved) {
            const parsed = JSON.parse(saved);
            return { ...DEFAULT_STATUS_COLORS, ...parsed };
        }
    } catch {}
    return { ...DEFAULT_STATUS_COLORS };
};

export const getContrastTextColor = (hexColor: string): string => {
    const clean = (hexColor || '').replace('#', '').trim();
    if (clean.length !== 6 && clean.length !== 3) return '#FFFFFF';
    const r = parseInt(clean.length === 3 ? clean[0] + clean[0] : clean.substring(0, 2), 16);
    const g = parseInt(clean.length === 3 ? clean[1] + clean[1] : clean.substring(2, 4), 16);
    const b = parseInt(clean.length === 3 ? clean[2] + clean[2] : clean.substring(4, 6), 16);
    const yiq = (r * 299 + g * 587 + b * 114) / 1000;
    return yiq >= 165 ? '#0F172A' : '#FFFFFF';
};

export const getDarkenedBorderColor = (hexColor: string, amount: number = 18): string => {
    const clean = (hexColor || '').replace('#', '').trim();
    if (clean.length !== 6 && clean.length !== 3) return hexColor;
    let r = parseInt(clean.length === 3 ? clean[0] + clean[0] : clean.substring(0, 2), 16);
    let g = parseInt(clean.length === 3 ? clean[1] + clean[1] : clean.substring(2, 4), 16);
    let b = parseInt(clean.length === 3 ? clean[2] + clean[2] : clean.substring(4, 6), 16);
    r = Math.max(0, Math.min(255, Math.floor(r * (1 - amount / 100))));
    g = Math.max(0, Math.min(255, Math.floor(g * (1 - amount / 100))));
    b = Math.max(0, Math.min(255, Math.floor(b * (1 - amount / 100))));
    return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
};

export const saveStatusColors = async (
    newColors: Record<string, Partial<StatusColorConfig>>,
    propertyId?: number
): Promise<void> => {
    if (typeof window === 'undefined') return;
    const propId = propertyId || Number(localStorage.getItem('hotel_active_property_id')) || 1;
    const current = getStatusColors(propId);
    const merged: Record<string, StatusColorConfig> = { ...current };

    Object.entries(newColors).forEach(([key, val]) => {
        const bg = (val.bg || (val as any).color || current[key]?.bg || DEFAULT_STATUS_COLORS[key]?.bg || '#2563EB').trim();
        const text = val.text || getContrastTextColor(bg);
        const border = val.border || getDarkenedBorderColor(bg);

        merged[key] = {
            ...(DEFAULT_STATUS_COLORS[key] || {
                key,
                label: key,
                category: 'reservation',
                bg,
                text,
                border,
                description: ''
            }),
            ...(merged[key] || {}),
            ...val,
            bg,
            text,
            border
        };
    });

    // 1. LocalStorage
    localStorage.setItem(`hotel_status_colors_prop_${propId}`, JSON.stringify(merged));
    if (propId === 1) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(merged));
    }

    // 2. Broadcast local event
    window.dispatchEvent(new CustomEvent('hotel_status_colors_updated', { detail: { propertyId: propId, colors: merged } }));

    // 3. Persist to PostgreSQL property settings
    try {
        const baseUrl = getApiBaseUrl();
        const propRes = await fetch(`${baseUrl}/api/properties/${propId}`);
        const propJson = await propRes.json();
        if (propJson.success && propJson.data?.property) {
            const p = propJson.data.property;
            const currentSettings = typeof p.settings === 'string' ? JSON.parse(p.settings || '{}') : (p.settings || {});
            await fetch(`${baseUrl}/api/properties/${propId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    settings: {
                        ...currentSettings,
                        statusColors: merged
                    }
                })
            });
        }
    } catch (err) {
        console.warn('Could not sync status colors to PostgreSQL properties.settings:', err);
    }
};

export const resetStatusColors = (propertyId?: number): void => {
    if (typeof window === 'undefined') return;
    const propId = propertyId || Number(localStorage.getItem('hotel_active_property_id')) || 1;
    localStorage.removeItem(`hotel_status_colors_prop_${propId}`);
    if (propId === 1) localStorage.removeItem(STORAGE_KEY);
    window.dispatchEvent(new CustomEvent('hotel_status_colors_updated', { detail: { propertyId: propId, colors: DEFAULT_STATUS_COLORS } }));
};

/**
 * Normalizes any variation of status string (e.g. 'in_house', 'In-House', 'checkedIn', 'arrived')
 * to standard color key
 */
export const normalizeStatusKey = (rawStatus?: string): string => {
    if (!rawStatus) return 'confirmed';
    const s = String(rawStatus).toLowerCase().trim().replace(/_/g, '-');
    if (s === 'arrived' || s === 'checked-in' || s === 'inhouse' || s === 'in-house' || s === 'occupied') {
        return 'in-house';
    }
    if (s === 'confirm' || s === 'confirmed' || s === 'active') {
        return 'confirmed';
    }
    if (s === 'tentative' || s === 'unconfirmed') {
        return 'tentative';
    }
    if (s === 'reserved' || s === 'pending') {
        return 'reserved';
    }
    if (s === 'hold' || s === 'held' || s === 'courtesy-hold') {
        return 'hold';
    }
    if (s === 'arriving' || s === 'due-in' || s === 'expected') {
        return 'arriving';
    }
    if (s === 'departing' || s === 'due-out' || s === 'departuring') {
        return 'departing';
    }
    if (s === 'checked-out' || s === 'departed' || s === 'completed' || s === 'checkout') {
        return 'checked-out';
    }
    if (s === 'day-use' || s === 'dayuse') {
        return 'day-use';
    }
    if (s === 'out-of-order' || s === 'ooo' || s === 'maintenance') {
        return 'out-of-order';
    }
    if (s === 'out-of-service' || s === 'oos' || s === 'inspection') {
        return 'out-of-service';
    }
    if (s === 'cancelled' || s === 'canceled' || s === 'void') {
        return 'cancelled';
    }
    return s;
};

/**
 * Resolves exact CSS style object for inline rendering (timeline bars, badges, cards)
 */
export const getStatusColorStyle = (
    rawStatus?: string,
    propertyId?: number
): { backgroundColor: string; color: string; borderColor: string } => {
    const key = normalizeStatusKey(rawStatus);
    const colors = getStatusColors(propertyId);
    const config = colors[key] || DEFAULT_STATUS_COLORS[key] || DEFAULT_STATUS_COLORS['confirmed'];
    return {
        backgroundColor: config.bg,
        color: config.text,
        borderColor: config.border || config.bg
    };
};

/**
 * Custom React hook that subscribes to status color updates in real time
 */
export const useStatusColors = (propertyId?: number) => {
    const [colors, setColors] = useState<Record<string, StatusColorConfig>>(() => getStatusColors(propertyId));

    useEffect(() => {
        const handleUpdate = () => {
            setColors(getStatusColors(propertyId));
        };

        window.addEventListener('hotel_status_colors_updated', handleUpdate);
        window.addEventListener('storage', handleUpdate);
        return () => {
            window.removeEventListener('hotel_status_colors_updated', handleUpdate);
            window.removeEventListener('storage', handleUpdate);
        };
    }, [propertyId]);

    const getStyle = (rawStatus?: string) => {
        const key = normalizeStatusKey(rawStatus);
        const config = colors[key] || DEFAULT_STATUS_COLORS[key] || DEFAULT_STATUS_COLORS['confirmed'];
        return {
            backgroundColor: config.bg,
            color: config.text,
            borderColor: config.border || config.bg
        };
    };

    return {
        colors,
        getStyle,
        updateSingleColor: (statusKey: string, newHexColor: string) => {
            const cleanHex = newHexColor.startsWith('#') ? newHexColor : `#${newHexColor}`;
            return saveStatusColors({
                [statusKey]: {
                    bg: cleanHex,
                    text: getContrastTextColor(cleanHex),
                    border: getDarkenedBorderColor(cleanHex)
                }
            }, propertyId);
        },
        saveColors: (newColors: Record<string, Partial<StatusColorConfig>>) => saveStatusColors(newColors, propertyId),
        resetColors: () => resetStatusColors(propertyId)
    };
};
