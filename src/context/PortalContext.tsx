import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useProperty } from './PropertyContext';
import { useNavigation } from './NavigationContext';

export type PortalMode = 'super_admin' | 'property_pms';

export interface UserData {
    id?: number;
    name: string;
    role: string;
    property: string;
    property_id?: number;
    image?: string;
    email?: string;
}

interface PortalContextType {
    portalMode: PortalMode;
    setPortalMode: (mode: PortalMode) => void;
    togglePortal: () => void;
    switchToPropertyPMS: (propertyId?: number, targetPage?: string) => void;
    switchToSuperAdmin: (targetPage?: string) => void;
    isSuperAdminPortal: boolean;
    isPropertyPMSPortal: boolean;
    currentUser: UserData | null;
    isSuperAdmin: boolean;
    isPropertyStaff: boolean;
    updateUserSession: (user: UserData | null) => void;
}

const PortalContext = createContext<PortalContextType | undefined>(undefined);

export const PortalProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const { setActivePropertyId } = useProperty();
    const { activePage, setActivePage } = useNavigation();

    // Authenticated user state
    const [currentUser, setCurrentUser] = useState<UserData | null>(() => {
        if (typeof window !== 'undefined') {
            try {
                const stored = localStorage.getItem('user_data');
                return stored ? JSON.parse(stored) : null;
            } catch {
                return null;
            }
        }
        return null;
    });

    const isSuperAdmin = currentUser?.role === 'super_admin';
    const isPropertyStaff = !isSuperAdmin;

    // Portal mode state: if not Super Admin, strictly lock to 'property_pms'
    const [portalModeState, setPortalModeState] = useState<PortalMode>(() => {
        if (typeof window !== 'undefined') {
            const storedUser = localStorage.getItem('user_data');
            if (storedUser) {
                try {
                    const u = JSON.parse(storedUser);
                    if (u.role !== 'super_admin') return 'property_pms';
                } catch {
                    // Fall through
                }
            }
            const saved = localStorage.getItem('hotel_portal_mode') as PortalMode;
            if (saved === 'super_admin' || saved === 'property_pms') {
                return saved;
            }
        }
        return 'super_admin';
    });

    // Effective portal mode: non-super-admins can NEVER be in 'super_admin' mode
    const portalMode: PortalMode = isSuperAdmin ? portalModeState : 'property_pms';

    const setPortalMode = useCallback((mode: PortalMode) => {
        // Enforce RBAC: property staff can never switch to super_admin
        if (!isSuperAdmin && mode === 'super_admin') {
            console.warn('Access denied: User does not have Super Admin authority.');
            return;
        }
        setPortalModeState(mode);
        if (typeof window !== 'undefined') {
            localStorage.setItem('hotel_portal_mode', mode);
            window.dispatchEvent(new CustomEvent('hotel_portal_switched', { detail: { mode } }));
        }
    }, [isSuperAdmin]);

    const togglePortal = useCallback(() => {
        if (!isSuperAdmin) return;
        const nextMode: PortalMode = portalMode === 'super_admin' ? 'property_pms' : 'super_admin';
        setPortalMode(nextMode);
        if (nextMode === 'super_admin') {
            setActivePage('multi-property');
        } else {
            setActivePage('front-desk');
        }
    }, [isSuperAdmin, portalMode, setPortalMode, setActivePage]);

    const switchToPropertyPMS = useCallback((propertyId?: number, targetPage: string = 'front-desk') => {
        if (propertyId) {
            setActivePropertyId(propertyId);
        }
        setPortalMode('property_pms');
        setActivePage(targetPage);
    }, [setActivePropertyId, setPortalMode, setActivePage]);

    const switchToSuperAdmin = useCallback((targetPage: string = 'multi-property') => {
        if (!isSuperAdmin) {
            console.warn('Access denied: Only Super Admin can access Master HQ Console.');
            return;
        }
        setPortalMode('super_admin');
        setActivePage(targetPage);
    }, [isSuperAdmin, setPortalMode, setActivePage]);

    const updateUserSession = useCallback((user: UserData | null) => {
        setCurrentUser(user);
        if (user) {
            if (user.role === 'super_admin') {
                setPortalModeState('super_admin');
                localStorage.setItem('hotel_portal_mode', 'super_admin');
            } else {
                setPortalModeState('property_pms');
                localStorage.setItem('hotel_portal_mode', 'property_pms');
                if (user.property_id) {
                    setActivePropertyId(user.property_id);
                }
            }
        }
    }, [setActivePropertyId]);

    // Listen to localStorage user changes (e.g. login/logout in other tabs)
    useEffect(() => {
        const handleStorage = (e: StorageEvent) => {
            if (e.key === 'user_data') {
                try {
                    const u = e.newValue ? JSON.parse(e.newValue) : null;
                    updateUserSession(u);
                } catch {
                    updateUserSession(null);
                }
            }
        };
        window.addEventListener('storage', handleStorage);
        return () => window.removeEventListener('storage', handleStorage);
    }, [updateUserSession]);

    // RBAC Security Route Guard: Redirect unauthorized users away from Super Admin pages
    useEffect(() => {
        const superAdminOnlyPages = [
            'multi-property',
            'schema-explorer',
            'taxes-vat',
            'advance-accounting',
            'properties',
            'property-create'
        ];

        if (!isSuperAdmin && superAdminOnlyPages.includes(activePage)) {
            setActivePage('front-desk');
        }
    }, [activePage, isSuperAdmin, setActivePage]);

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
                currentUser,
                isSuperAdmin,
                isPropertyStaff,
                updateUserSession
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
