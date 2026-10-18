import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import type { NavigationState, GuardContext, RouteDefinition } from '../types/navigation';
import {
  parseLocation,
  pushNavigation,
  subscribeToHistory,
} from '../navigation/urlRouter';
import {
  getRouteBySlug,
  getRouteByPageId,
  getReportBySlug,
  getReportByTitle,
  reportTitleToSlug,
  canAccessRoute,
} from '../navigation/routesRegistry';

interface NavigationContextValue {
  currentSlug: string;
  activePanel: 'main' | 'reports';
  activePage: string;
  activeReport: string;
  setActivePage: (page: string) => void;
  setActiveReport: (report: string) => void;
  navigateTo: (target: string, options?: { newTab?: boolean }) => void;
  navigateToReport: (reportNameOrSlug: string, options?: { newTab?: boolean }) => void;
  canAccess: (target: string) => boolean;
  guardContext: GuardContext;
  setGuardContext: React.Dispatch<React.SetStateAction<GuardContext>>;
}

const NavigationContext = createContext<NavigationContextValue | null>(null);

export const NavigationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [navState, setNavState] = useState<NavigationState>(() => parseLocation());

  // Scaffold for future Theme, RBAC, Multi-Property & SaaS Tiers
  const [guardContext, setGuardContext] = useState<GuardContext>({
    role: 'super_admin',
    subscriptionTier: 'enterprise',
    theme: 'light',
  });

  // Sync with browser history (Back / Forward)
  useEffect(() => {
    const unsubscribe = subscribeToHistory((state) => {
      setNavState(state);
    });
    return unsubscribe;
  }, []);

  // Check initial URL on mount and push clean slug if at root or ?page
  useEffect(() => {
    const initial = parseLocation();
    setNavState(initial);
    // If browser URL is at root '/' or had '?page=' query string, rewrite to clean slug
    if (window.location.pathname === '/' || window.location.search.includes('page=')) {
      pushNavigation(initial.currentSlug, { replace: true });
    }
  }, []);

  // Navigate to any main page or slug
  const navigateTo = useCallback((target: string, options?: { newTab?: boolean }) => {
    let resolvedSlug = target;
    let resolvedPage = target;
    let resolvedPanel: 'main' | 'reports' = 'main';

    if (options?.newTab) {
      const fullUrl = target.startsWith('/') ? target : `/${target}`;
      window.open(fullUrl, '_blank');
      return;
    }

    if (target.startsWith('/reports')) {
      resolvedPanel = 'reports';
      resolvedPage = 'reports';
      resolvedSlug = target;
    } else if (target === 'reports') {
      resolvedPanel = 'reports';
      resolvedPage = 'reports';
      resolvedSlug = '/reports';
    } else {
      const bySlug = getRouteBySlug(target);
      const byId = getRouteByPageId(target);
      const route = bySlug || byId;
      if (route) {
        resolvedSlug = route.slug;
        resolvedPage = route.id;
        resolvedPanel = route.panel;
      } else {
        resolvedSlug = target.startsWith('/') ? target : `/${target}`;
        resolvedPage = target.replace(/^\//, '');
      }
    }

    pushNavigation(resolvedSlug);
    setNavState((prev) => ({
      ...prev,
      currentSlug: resolvedSlug,
      activePage: resolvedPage,
      activePanel: resolvedPanel,
    }));
  }, []);

  // Navigate to any specific report in Report Center
  const navigateToReport = useCallback((reportNameOrSlug: string, options?: { newTab?: boolean }) => {
    let reportTitle = reportNameOrSlug;
    let reportSlug = reportNameOrSlug;

    const matchedBySlug = getReportBySlug(reportNameOrSlug);
    const matchedByTitle = getReportByTitle(reportNameOrSlug);

    if (matchedBySlug) {
      reportTitle = matchedBySlug.title;
      reportSlug = matchedBySlug.slug;
    } else if (matchedByTitle) {
      reportTitle = matchedByTitle.title;
      reportSlug = matchedByTitle.slug;
    } else {
      reportSlug = reportTitleToSlug(reportNameOrSlug);
    }

    if (options?.newTab) {
      window.open(reportSlug, '_blank');
      return;
    }

    pushNavigation(reportSlug, { title: reportTitle });
    setNavState((prev) => ({
      ...prev,
      currentSlug: reportSlug,
      activePanel: 'reports',
      activePage: 'reports',
      activeReport: reportTitle,
    }));
  }, []);

  const setActivePage = useCallback((page: string) => {
    navigateTo(page);
  }, [navigateTo]);

  const setActiveReport = useCallback((report: string) => {
    navigateToReport(report);
  }, [navigateToReport]);

  const canAccess = useCallback((target: string): boolean => {
    const route: RouteDefinition | undefined =
      getRouteBySlug(target) ||
      getRouteByPageId(target) ||
      getReportBySlug(target) ||
      getReportByTitle(target);

    if (!route) return true;
    return canAccessRoute(route, guardContext).allowed;
  }, [guardContext]);

  return (
    <NavigationContext.Provider
      value={{
        currentSlug: navState.currentSlug,
        activePanel: navState.activePanel,
        activePage: navState.activePage,
        activeReport: navState.activeReport || 'Cancelled Reservation',
        setActivePage,
        setActiveReport,
        navigateTo,
        navigateToReport,
        canAccess,
        guardContext,
        setGuardContext,
      }}
    >
      {children}
    </NavigationContext.Provider>
  );
};

export const useNavigation = (): NavigationContextValue => {
  const context = useContext(NavigationContext);
  if (!context) {
    throw new Error('useNavigation must be used within a NavigationProvider');
  }
  return context;
};
