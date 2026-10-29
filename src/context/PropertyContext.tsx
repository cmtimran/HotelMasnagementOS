import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { getApiBaseUrl } from '../utils/apiUrl';
import { syncRoomTypesAndRoomsFromDB } from '../utils/roomInventoryEngine';

export interface Property {
    id: number;
    organization_id: number;
    code: string;
    name: string;
    star_rating: number;
    address: string;
    city: string;
    country: string;
    phone: string;
    email: string;
    currency: string;
    organization_name?: string;
    total_rooms?: number;
    total_buildings?: number;
    total_staff?: number;
}

export interface ChainOverview {
    totalProperties: number;
    totalRooms: number;
    totalStaff: number;
    totalReservations: number;
    totalRevenue: number;
    chainHealth: string;
}

interface PropertyContextType {
    properties: Property[];
    activeProperty: Property | null;
    activePropertyId: number;
    setActivePropertyId: (id: number) => void;
    chainOverview: ChainOverview | null;
    loading: boolean;
    error: string | null;
    refreshProperties: () => Promise<void>;
}

const DEFAULT_PROPERTIES: Property[] = [
    {
        id: 1,
        organization_id: 1,
        code: 'GPD',
        name: 'Grand Palace Hotel & Resort',
        star_rating: 5,
        address: 'Plot 12, Road 45, Gulshan-2, Dhaka',
        city: 'Dhaka',
        country: 'Bangladesh',
        phone: '+880 2 9882200',
        email: 'dhaka@grandhospitality.com',
        currency: 'BDT',
        total_rooms: 0,
        total_buildings: 0,
        total_staff: 0
    }
];

const PropertyContext = createContext<PropertyContextType | undefined>(undefined);

export const PropertyProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [properties, setProperties] = useState<Property[]>(DEFAULT_PROPERTIES);
    const [activePropertyId, setActivePropertyIdState] = useState<number>(() => {
        if (typeof window !== 'undefined') {
            const saved = localStorage.getItem('hotel_active_property_id');
            if (saved) {
                const parsed = Number(saved);
                if (!isNaN(parsed) && parsed > 0) return parsed;
            }
        }
        return 1;
    });
    const [chainOverview, setChainOverview] = useState<ChainOverview | null>(null);
    const [loading, setLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);

    const loadProperties = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const baseUrl = getApiBaseUrl();
            const res = await fetch(`${baseUrl}/api/properties`);
            const data = await res.json();
            if (data.success && Array.isArray(data.data) && data.data.length > 0) {
                setProperties(data.data);
            }

            // Fetch chain overview KPIs
            try {
                const ovRes = await fetch(`${baseUrl}/api/properties/chain/overview`);
                const ovData = await ovRes.json();
                if (ovData.success && ovData.data) {
                    setChainOverview(ovData.data);
                }
            } catch {
                // Non-critical fallback
            }
        } catch (err: any) {
            setError(err?.message || 'Failed to load properties');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        loadProperties();
    }, [loadProperties]);

    const setActivePropertyId = useCallback((id: number) => {
        setActivePropertyIdState(id);
        if (typeof window !== 'undefined') {
            localStorage.setItem('hotel_active_property_id', String(id));
            const targetProp = properties.find(p => p.id === id);
            const tenantSlug = targetProp?.code?.toLowerCase() === 'gor' || (targetProp?.name && targetProp.name.toLowerCase().includes('cox'))
                ? 'cox-bazar-sea-resort'
                : 'grand-palace';
            localStorage.setItem('hotel_active_tenant_slug', tenantSlug);
            window.dispatchEvent(new CustomEvent('hotel_property_switched', { detail: { propertyId: id, tenantSlug } }));
        }
        // Automatically sync room inventory and room types for the active hotel
        syncRoomTypesAndRoomsFromDB(id).catch(err => {
            console.warn('Could not sync rooms for switched property:', err);
        });
    }, [properties]);

    const activeProperty = properties.find(p => p.id === activePropertyId) || properties[0] || DEFAULT_PROPERTIES[0];

    return (
        <PropertyContext.Provider
            value={{
                properties,
                activeProperty,
                activePropertyId,
                setActivePropertyId,
                chainOverview,
                loading,
                error,
                refreshProperties: loadProperties
            }}
        >
            {children}
        </PropertyContext.Provider>
    );
};

export const useProperty = (): PropertyContextType => {
    const context = useContext(PropertyContext);
    if (!context) {
        throw new Error('useProperty must be used within a PropertyProvider');
    }
    return context;
};
