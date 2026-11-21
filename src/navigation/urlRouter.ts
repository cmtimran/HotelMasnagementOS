import type { NavigationState } from '../types/navigation';
import {
  getRouteBySlug,
  getReportBySlug,
  getRouteByPageId,
  reportTitleToSlug,
} from './routesRegistry';

export const parseLocation = (): NavigationState => {
  const rawPathname = window.location.pathname.toLowerCase();
  const pathname = (rawPathname.length > 1 && rawPathname.endsWith('/')) ? rawPathname.slice(0, -1) : rawPathname;
  const searchParams = new URLSearchParams(window.location.search);
  const pageParam = searchParams.get('page')?.toLowerCase();
  const reportParam = searchParams.get('report')?.toLowerCase();

  // 1. Check for Report Panel Routes: /reports or /reports/:slug
  if (pathname.startsWith('/reports') || pageParam === 'reports') {
    let reportSlug = pathname;
    if (pathname === '/reports' || pathname === '/reports/') {
      if (reportParam) {
        reportSlug = `/reports/${reportParam}`;
      } else {
        return {
          currentSlug: '/reports',
          activePanel: 'reports',
          activePage: 'reports',
          activeReport: 'overview',
        };
      }
    }

    const matchedReport = getReportBySlug(reportSlug);
    if (matchedReport) {
      return {
        currentSlug: matchedReport.slug,
        activePanel: 'reports',
        activePage: 'reports',
        activeReport: matchedReport.title,
      };
    }

    return {
      currentSlug: '/reports',
      activePanel: 'reports',
      activePage: 'reports',
      activeReport: 'overview',
    };
  }

  // 2. Check for Main Panel Routes by Pathname
  if (pathname && pathname !== '/') {
    const matchedRoute = getRouteBySlug(pathname) || getRouteByPageId(pathname.replace(/^\//, ''));
    if (matchedRoute) {
      return {
        currentSlug: `${matchedRoute.slug}${window.location.search || ''}`,
        activePanel: matchedRoute.panel,
        activePage: matchedRoute.id,
      };
    }

    // Dynamic Resilience Fallback: If route is not explicitly in registry, preserve user's current URL and page!
    const cleanId = pathname.replace(/^\//, '');
    return {
      currentSlug: `${pathname}${window.location.search || ''}`,
      activePanel: 'main',
      activePage: cleanId,
    };
  }

  // 3. Check for Legacy Query Param: ?page=...
  if (pageParam) {
    const matchedRoute = getRouteByPageId(pageParam);
    if (matchedRoute) {
      return {
        currentSlug: matchedRoute.slug,
        activePanel: matchedRoute.panel,
        activePage: matchedRoute.id,
      };
    }
    return {
      currentSlug: `/${pageParam}`,
      activePanel: 'main',
      activePage: pageParam,
    };
  }

  // 4. Default Home Route
  return {
    currentSlug: '/dashboard',
    activePanel: 'main',
    activePage: 'dashboard',
  };
};

export const pushNavigation = (slug: string, options?: { replace?: boolean; title?: string }) => {
  const currentFull = window.location.pathname + window.location.search + window.location.hash;
  if (currentFull === slug || (window.location.pathname === slug && !slug.includes('?'))) return;

  if (options?.replace) {
    window.history.replaceState({ slug }, options?.title || '', slug);
  } else {
    window.history.pushState({ slug }, options?.title || '', slug);
  }

  if (options?.title) {
    document.title = `${options.title} | HotelManagementOS`;
  }
};

export const createReportUrl = (reportTitle: string): string => {
  return reportTitleToSlug(reportTitle);
};

export const subscribeToHistory = (onNavigate: (state: NavigationState) => void): (() => void) => {
  const handlePopState = () => {
    const parsed = parseLocation();
    onNavigate(parsed);
  };

  window.addEventListener('popstate', handlePopState);
  return () => {
    window.removeEventListener('popstate', handlePopState);
  };
};
