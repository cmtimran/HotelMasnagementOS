import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useProperty } from './PropertyContext';
import { useNavigation } from './NavigationContext';

export type PortalMode = 'super_admin' | 'property_pms';

interface PortalContextType {
    portalMode: PortalMode;
    setPortalMode: (mode: PortalMode) => void;
    togglePortal: () => void;
    switchToPropertyPMS: (propertyId?: number, targetPage?: string) => void;
    switchToSuperAdmin: (targetPage?: string) => void;
    isSuperAdminPortal: boolean;
    isPropertyPMSPortal: boolean;
}

const PortalContext = createContext<PortalContextType | undefined>(undefined);

export const PortalProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const { setActivePropertyId } = useProperty();
    const { activePage, setActivePage } = useNavigation();

    // Default to 'super_admin' unless previously set by user
    const [portalMode, setPortalModeState] = useState<PortalMode>(() => {
        if (typeof window !== 'undefined') {
            const saved = localStorage.getItem('hotel_portal_mode') as PortalMode;
            if (saved === 'super_admin' || saved === 'property_pms') {
                return saved;
            }
        }
        return 'super_admin';
    });

    const setPortalMode = useCallback((mode: PortalMode) => {
        setPortalModeState(mode);
        if (typeof window !== 'undefined') {
            localStorage.setItem('hotel_portal_mode', mode);
            window.dispatchEvent(new CustomEvent('hotel_portal_switched', { detail: { mode } }));
        }
    }, []);

    const togglePortal = useCallback(() => {
        const nextMode: PortalMode = portalMode === 'super_admin' ? 'property_pms' : 'super_admin';
        setPortalMode(nextMode);
        if (nextMode === 'super_admin') {
            setActivePage('multi-property');
        } else {
            setActivePage('front-desk');
        }
    }, [portalMode, setPortalMode, setActivePage]);

    const switchToPropertyPMS = useCallback((propertyId?: number, targetPage: string = 'front-desk') => {
        if (propertyId) {
            setActivePropertyId(propertyId);
        }
        setPortalMode('property_pms');
        setActivePage(targetPage);
    }, [setActivePropertyId, setPortalMode, setActivePage]);

    const switchToSuperAdmin = useCallback((targetPage: string = 'multi-property') => {
        setPortalMode('super_admin');
        setActivePage(targetPage);
    }, [setPortalMode, setActivePage]);

    // Safety fallback: if user navigates to a multi-property or super admin page while in property_pms mode,
    // or vice versa, ensure smooth UX without forcing hard page reloads
    useEffect(() => {
        const superAdminOnlyPages = ['multi-property', 'schema-explorer', 'taxes-vat', 'advance-accounting'];
        if (superAdminOnlyPages.includes(activePage) && portalMode === 'property_pms') {
            // Keep user informed, can either switch portal or retain
        }
    }, [activePage, portalMode]);

    return (
        <PortalContext.Provider
            value={{
                portalMode,
                setPortalMode,
                togglePortal,
                switchToPropertyPMS,
                switchToSuperAdmin,
                isSuperAdminPortal: portalMode === 'super_admin',
                isPropertyPMSPortal: portalMode === 'property_pms',
            }}
        >
            {children}
        </PortalContext.Provider>
    );
};

export const usePortal = (): PortalContextType => {
    const context = useContext(PortalContext);
    if (!context) {
        throw new Error('usePortal must be used within a PortalProvider');
    }
    return context;
};
