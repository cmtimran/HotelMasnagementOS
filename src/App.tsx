import { useState, useEffect, useMemo, lazy, Suspense } from 'react';
import Dashboard from './components/Dashboard';
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import Login from './components/Login';
import GenericSectionModal, { type FormSection } from './components/GenericSectionModal';
import ErrorBoundary from './components/common/ErrorBoundary';
import { initNetworkSync } from './utils/pmsNetworkSync';
import { syncReservationsFromDB, syncRatesAndPlansFromDB } from './utils/roomInventoryEngine';
import { Devnotation } from 'devnotation';
import 'devnotation/style.css';

// Lazy-loaded feature modules & management consoles (Optimized On-Demand Bundling)
const POSDashboard = lazy(() => import('./components/POSDashboard'));
const ManagerDashboard = lazy(() => import('./components/ManagerDashboard'));
const FrontDesk = lazy(() => import('./components/FrontDesk'));
const StayView = lazy(() => import('./components/StayView'));
const AddProperty = lazy(() => import('./components/AddProperty'));
const HotelInfoView = lazy(() => import('./components/HotelInfoView'));
const RatePlanManagement = lazy(() => import('./components/RatePlanManagement'));
const MealPlanManagement = lazy(() => import('./components/MealPlanManagement'));
const Reports = lazy(() => import('./components/Reports'));
const MasterDataConfig = lazy(() => import('./components/MasterDataConfig'));
const RoomRack = lazy(() => import('./components/RoomRack'));
const ReservationsView = lazy(() => import('./components/reservations/ReservationsView'));
const ReservationSleepOut = lazy(() => import('./components/reservations/ReservationSleepOut'));
const ReservationHold = lazy(() => import('./components/reservations/ReservationHold'));
const ReservationUnassigned = lazy(() => import('./components/reservations/ReservationUnassigned'));
const ReservationCancel = lazy(() => import('./components/reservations/ReservationCancel'));
const HousekeepingGrid = lazy(() => import('./components/HousekeepingGrid'));
const LostAndFoundManagement = lazy(() => import('./components/LostAndFoundManagement'));
const RateCalendar = lazy(() => import('./components/RateCalendar'));
const OccupancyHeatmap = lazy(() => import('./components/OccupancyHeatmap'));
const RevenueDashboard = lazy(() => import('./components/RevenueDashboard'));
const MaintenanceKanban = lazy(() => import('./components/MaintenanceKanban'));
const FloorPlan = lazy(() => import('./components/FloorPlan'));
const CorporateProfileManagement = lazy(() => import('./components/CorporateProfileManagement'));
const BusinessOriginManagement = lazy(() => import('./components/BusinessOriginManagement'));
const AdvancedReports = lazy(() => import('./components/AdvancedReports'));
const AddReservation = lazy(() => import('./components/AddReservation'));
const GuestProfile = lazy(() => import('./components/GuestProfile'));
const PackageManagement = lazy(() => import('./components/PackageManagement'));
const ServiceManagement = lazy(() => import('./components/ServiceManagement'));
const NightAuditAutomation = lazy(() => import('./components/NightAuditAutomation'));
const ChannelManagerView = lazy(() => import('./components/ChannelManagerView'));
const GuestVoucherSystem = lazy(() => import('./components/GuestVoucherSystem'));
const GeneralSettings = lazy(() => import('./components/GeneralSettings'));
const BankingManagement = lazy(() => import('./components/BankingManagement'));
const RevenueManagement = lazy(() => import('./components/RevenueManagement'));
const ExtraChargesManagement = lazy(() => import('./components/ExtraChargesManagement'));
const DiscountManagement = lazy(() => import('./components/DiscountManagement'));
const DepartmentManagement = lazy(() => import('./components/DepartmentManagement'));
const ShiftManagement = lazy(() => import('./components/ShiftManagement'));
const RolesPermissionsManagement = lazy(() => import('./components/RolesPermissionsManagement'));
const UserStaffManagement = lazy(() => import('./components/UserStaffManagement'));
const RelationalDatabaseExplorer = lazy(() => import('./components/database/RelationalDatabaseExplorer'));
const AdvanceAccountingDashboard = lazy(() => import('./components/accounting/AdvanceAccountingDashboard'));
const HRMManagementDashboard = lazy(() => import('./components/hrm/HRMManagementDashboard'));
const MultiPropertyConsole = lazy(() => import('./components/chain/MultiPropertyConsole'));
const TenantIsolationHub = lazy(() => import('./components/chain/TenantIsolationHub'));
const TenantOnboardingWizard = lazy(() => import('./components/chain/TenantOnboardingWizard'));
const ConfigurationPage = lazy(() => import('./components/ConfigurationPage'));
const GuestFlowInbox = lazy(() => import('./components/guestflow/GuestFlowInbox'));
const ExpressCheckInView = lazy(() => import('./components/guestflow/ExpressCheckInView'));

// Restaurant & F&B Suite (Thesis Architecture Integration)
const RestaurantOutletsPage = lazy(() => import('./components/restaurant/outlets/OutletsPage').then(m => ({ default: m.OutletsPage })));
const RestaurantPOSPage = lazy(() => import('./components/restaurant/pos/POSPage').then(m => ({ default: m.POSPage })));
const RestaurantCategoriesPage = lazy(() => import('./components/restaurant/categories/CategoriesPage').then(m => ({ default: m.CategoriesPage })));
const RestaurantMenuItemsPage = lazy(() => import('./components/restaurant/menu-items/MenuItemsPage').then(m => ({ default: m.MenuItemsPage })));
const RestaurantAddonsPage = lazy(() => import('./components/restaurant/addons/AddonsPage').then(m => ({ default: m.AddonsPage })));
const RestaurantTablesPage = lazy(() => import('./components/restaurant/tables/TablesPage').then(m => ({ default: m.TablesPage })));
const RestaurantFloorsPage = lazy(() => import('./components/restaurant/floors/FloorsPage').then(m => ({ default: m.FloorsPage })));
const RestaurantKitchenStationsPage = lazy(() => import('./components/restaurant/kitchens/KitchenStationsPage').then(m => ({ default: m.KitchenStationsPage })));
const RestaurantKitchenDisplayPage = lazy(() => import('./components/restaurant/kds/KitchenDisplayPage').then(m => ({ default: m.KitchenDisplayPage })));
const BanquetVenuesPage = lazy(() => import('./components/banquet/BanquetVenuesPage').then(m => ({ default: m.BanquetVenuesPage })));
const BanquetPOSPage = lazy(() => import('./components/banquet/BanquetPOSPage').then(m => ({ default: m.BanquetPOSPage })));
const SpaPOSPage = lazy(() => import('./components/spa/SpaPOSPage').then(m => ({ default: m.SpaPOSPage })));
const SpaServicesPage = lazy(() => import('./components/spa/SpaServicesPage').then(m => ({ default: m.SpaServicesPage })));
const RetailPOSPage = lazy(() => import('./components/retail/RetailPOSPage').then(m => ({ default: m.RetailPOSPage })));
const RetailInventoryPage = lazy(() => import('./components/retail/RetailInventoryPage').then(m => ({ default: m.RetailInventoryPage })));
const FitnessPOSPage = lazy(() => import('./components/fitness/FitnessPOSPage').then(m => ({ default: m.FitnessPOSPage })));
const DirectBookingEngine = lazy(() => import('./components/booking-engine/DirectBookingEngine').then(m => ({ default: m.DirectBookingEngine })));

import { useNavigation } from './context/NavigationContext';
import { usePortal, type UserData } from './context/PortalContext';
import { useProperty } from './context/PropertyContext';

function App() {
  const { activePage, setActivePage } = useNavigation();
  const { updateUserSession } = usePortal();
  const { properties, activeProperty } = useProperty();
  // Session Management: Synchronous initialization verifies both active token and user record
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => {
    try {
      const token = localStorage.getItem('auth_token');
      const user = localStorage.getItem('user_data');
      return Boolean(token && user);
    } catch {
      return false;
    }
  });

  const [currentUser, setCurrentUser] = useState<UserData | null>(() => {
    try {
      const storedUser = localStorage.getItem('user_data');
      return storedUser ? JSON.parse(storedUser) : null;
    } catch {
      return null;
    }
  });

  // Global Event-Driven Realtime Network Sync & PostgreSQL Database Hydration on Application Boot
  useEffect(() => {
    initNetworkSync();
    if (localStorage.getItem('auth_token') || localStorage.getItem('user_data')) {
      syncReservationsFromDB().catch(console.error);
      syncRatesAndPlansFromDB().catch(console.error);
    }

    // Auto-heal Devnotation toolbar position if dragged off-screen or corrupted in localStorage
    try {
      const savedPos = localStorage.getItem('devnotation_toolbar_pos_v2');
      if (savedPos) {
        const parsed = JSON.parse(savedPos);
        if (
          typeof parsed.x !== 'number' ||
          typeof parsed.y !== 'number' ||
          parsed.x < 0 ||
          parsed.y < 0 ||
          parsed.x > (window.innerWidth || 1920) - 50 ||
          parsed.y > (window.innerHeight || 1080) - 40
        ) {
          localStorage.removeItem('devnotation_toolbar_pos_v2');
        }
      }
    } catch {
      localStorage.removeItem('devnotation_toolbar_pos_v2');
    }
    // Flush stale Devnotation update cache so live version is reflected
    localStorage.removeItem('devnotation_update_check_v1');
  }, []);

  // Sync session across multiple browser tabs
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'auth_token' || e.key === 'user_data') {
        const hasAuth = Boolean(localStorage.getItem('auth_token') || localStorage.getItem('user_data'));
        setIsAuthenticated(hasAuth);
        if (!hasAuth) {
          setCurrentUser(null);
        } else if (e.key === 'user_data' && e.newValue) {
          try {
            setCurrentUser(JSON.parse(e.newValue));
          } catch {
            // Keep existing
          }
        }
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  // Enterprise Shift-Aware Inactivity Session Tracker (Cross-Tab Synchronized)
  useEffect(() => {
    if (!isAuthenticated) return;

    // Configurable timeout: reads from property settings or localStorage, defaults to 12 Hours (720 min)
    // 0 means auto-logout is disabled (keep logged in).
    const getTimeoutMs = (): number => {
      try {
        const propSetting = (activeProperty as any)?.settings?.sessionTimeoutMinutes;
        if (typeof propSetting === 'number') {
          if (propSetting === 0) return 0;
          return propSetting * 60 * 1000;
        }
        const customMinutes = localStorage.getItem('hotel_session_timeout_minutes');
        if (customMinutes !== null) {
          const parsed = Number(customMinutes);
          if (parsed === 0) return 0;
          if (!isNaN(parsed) && parsed > 0) return parsed * 60 * 1000;
        }
      } catch {}
      // Standard 12 Hours (covers an entire 8-12 hour hotel operational shift)
      return 12 * 60 * 60 * 1000;
    };

    // Update last activity timestamp in shared storage
    const markActivity = () => {
      try {
        localStorage.setItem('hotel_last_activity_time', String(Date.now()));
      } catch {}
    };

    if (!localStorage.getItem('hotel_last_activity_time')) {
      markActivity();
    }

    let lastRecorded = 0;
    const handleUserActivity = () => {
      const now = Date.now();
      // Throttle localStorage writes to at most once every 15 seconds to avoid overhead
      if (now - lastRecorded > 15000) {
        lastRecorded = now;
        markActivity();
      }
    };

    // Listen to comprehensive user interaction events across the entire window
    const activityEvents = [
      'mousedown',
      'mouseup',
      'mousemove',
      'click',
      'keydown',
      'keyup',
      'input',
      'change',
      'focus',
      'scroll',
      'wheel',
      'touchstart',
      'touchend',
      'pointerdown'
    ];

    activityEvents.forEach(evt => {
      window.addEventListener(evt, handleUserActivity, { passive: true, capture: true });
    });

    // Check every 60 seconds if the shared cross-tab session has truly expired
    const intervalId = window.setInterval(() => {
      const timeoutMs = getTimeoutMs();
      if (timeoutMs <= 0) return; // Inactivity timeout disabled

      const lastActivityStr = localStorage.getItem('hotel_last_activity_time');
      const lastActivity = lastActivityStr ? Number(lastActivityStr) : Date.now();
      const elapsed = Date.now() - lastActivity;

      if (elapsed >= timeoutMs) {
        console.warn(`[Session Management] Inactivity auto-logout triggered after ${Math.round(elapsed / (60 * 1000))} minutes of complete inactivity across all tabs.`);
        handleLogout();
      }
    }, 60 * 1000);

    return () => {
      activityEvents.forEach(evt => {
        window.removeEventListener(evt, handleUserActivity, { capture: true });
      });
      clearInterval(intervalId);
    };
  }, [isAuthenticated, activeProperty]);

  // New Modal States
  const [modalConfig, setModalConfig] = useState<{
    isOpen: boolean;
    title: string;
    subtitle: string;
    sections: FormSection[];
  }>({ isOpen: false, title: '', subtitle: '', sections: [] });

  const openModal = (title: string, subtitle: string, sections: FormSection[]) => {
    setModalConfig({ isOpen: true, title, subtitle, sections });
  };

  const closeModal = () => {
    setModalConfig({ ...modalConfig, isOpen: false });
  };


  // Dynamic Master Configuration Data (Clean Zero-Mock State)
  const [unitsData] = useState<any[]>([]);
  const [countersData] = useState<any[]>([]);
  const [waitersData] = useState<any[]>([]);

  const livePropertiesData = useMemo(() => {
    if (properties && properties.length > 0) {
      return properties.map(p => ({
        id: p.id,
        logo: `https://placehold.co/40x40?text=${p.code || 'GH'}`,
        name: p.name,
        code: p.code,
        address: p.address || '—',
        country: p.country || 'Bangladesh',
        city: p.city || '—',
        currency: p.currency || 'BDT',
        website: '—',
        rooms: p.total_rooms || 0,
        grade: `${p.star_rating || 5} Star`,
        phone: p.phone || '—',
        email: p.email || '—',
        description: `${p.name} - Hotel property management.`,
        features: ['High-speed WiFi', 'Room Service', 'Concierge Desk'],
        buildings: p.total_buildings || 1,
        staff: p.total_staff || 0,
        raw: p
      }));
    }
    return [];
  }, [properties]);

  const unitSections: FormSection[] = [
    {
      title: 'Unit Details',
      fields: [
        { name: 'name', label: 'Unit Name', type: 'text', placeholder: 'e.g. Kilogram', required: true, colSpan: 2 },
        { name: 'code', label: 'Short Code', type: 'text', placeholder: 'e.g. kg', required: true },
        { name: 'status', label: 'Active Status', type: 'checkbox', defaultValue: true }
      ]
    }
  ];

  const counterSections: FormSection[] = [
    {
      title: 'Counter Identity',
      fields: [
        { name: 'name', label: 'Counter Name', type: 'text', placeholder: 'e.g. Main Counter', required: true, colSpan: 2 },
        { name: 'outlet', label: 'Outlet', type: 'select', options: ['Main Branch'], required: true },
      ]
    }
  ];

  const waiterSections: FormSection[] = [
    {
      title: 'Staff Profile',
      fields: [
        { name: 'name', label: 'Full Name', type: 'text', required: true, colSpan: 2 },
        { name: 'designation', label: 'Designation', type: 'select', options: ['Waiter', 'Captain', 'Manager'] },
        { name: 'phone', label: 'Mobile Number', type: 'text', required: true },
      ]
    }
  ];

  // Handle Property Management
  const [editingProperty, setEditingProperty] = useState<any>(null);
  const [editingPropertyTab, setEditingPropertyTab] = useState<string>('identity');

  const handleManageProperty = (property: any, initialTab = 'identity') => {
    setEditingProperty(property);
    setEditingPropertyTab(initialTab);
    setActivePage('edit-property');
  };

  const renderContent = () => {
    switch (activePage) {
      case 'dashboard':
        return <Dashboard />;
      case 'pos-dashboard':
        return <POSDashboard />;
      case 'manager-dashboard':
        return <ManagerDashboard />;
      case 'property-create':
      case 'add-property':
      case 'tenant-onboarding':
        return <TenantOnboardingWizard onBack={() => setActivePage('multi-property')} onNavigate={setActivePage} />;
      case 'hotel-info':
      case 'hotel-profile':
        return (
          <HotelInfoView
            property={activeProperty || livePropertiesData[0]}
            currentUser={currentUser}
            onManageProperty={(tab) => handleManageProperty(activeProperty || livePropertiesData[0], tab || 'identity')}
          />
        );
      case 'front-desk':
        return <FrontDesk />;
      case 'guestflow':
      case 'staypulse':
        return <GuestFlowInbox />;
      case 'express-checkin':
        return <ExpressCheckInView />;
      case 'edit-property':
        return (
          <AddProperty
            onBack={() => setActivePage('hotel-info')}
            initialData={editingProperty || activeProperty || livePropertiesData[0]}
            initialTab={editingPropertyTab}
            isCreateMode={false}
            currentUser={currentUser}
            onNavigate={setActivePage}
          />
        );
      case 'property-list':
      case 'all-properties':
      case 'properties':
        return <MultiPropertyConsole />;
      case 'book':
      case 'direct-booking':
      case 'web-booking':
        return <DirectBookingEngine onBack={() => setActivePage('dashboard')} propertyId={activeProperty?.id || 1} />;
      case 'restaurant-outlets':
      case 'dining-outlets':
      case 'outlets':
        return <RestaurantOutletsPage onNavigate={setActivePage} />;
      case 'pos':
      case 'restaurant-pos':
        return <RestaurantPOSPage />;
      case 'products':
      case 'menu-items':
      case 'menu':
        return <RestaurantMenuItemsPage />;
      case 'tables':
      case 'table-layout':
      case 'table-management':
        return <RestaurantTablesPage />;
      case 'categories':
        return <RestaurantCategoriesPage />;
      case 'addons':
      case 'modifiers':
        return <RestaurantAddonsPage />;
      case 'units':
        return (
          <ConfigurationPage
            title="Units"
            description="Manage Product Units"
            columns={[{ key: 'name', header: 'Unit Name' }, { key: 'code', header: 'Code' }, { key: 'status', header: 'Status' }]}
            data={unitsData}
            onAdd={() => openModal('Add Product Unit', 'Define units', unitSections)}
          />
        );
      case 'floor':
      case 'dining-floor':
      case 'dining-floors':
      case 'restaurant-floors':
        return <RestaurantFloorsPage />;
      case 'counters':
        return (
          <ConfigurationPage
            title="Counters"
            description="Setup Billing Counters"
            columns={[{ key: 'name', header: 'Counter Name' }, { key: 'type', header: 'Type' }, { key: 'status', header: 'Status' }]}
            data={countersData}
            onAdd={() => openModal('Add New Counter', 'Configure POS station', counterSections)}
          />
        );
      case 'kitchens':
      case 'kitchen-stations':
        return <RestaurantKitchenStationsPage />;
      case 'banquet-venues':
      case 'banquet-halls':
        return <BanquetVenuesPage onNavigate={setActivePage} />;
      case 'banquet-pos':
      case 'banquet-events':
        return <BanquetPOSPage />;
      case 'spa-pos':
        return <SpaPOSPage />;
      case 'spa-services':
      case 'spa-treatments':
        return <SpaServicesPage />;
      case 'retail-pos':
      case 'giftshop-pos':
        return <RetailPOSPage />;
      case 'retail-inventory':
      case 'giftshop-inventory':
        return <RetailInventoryPage />;
      case 'fitness-pos':
      case 'pool-pos':
        return <FitnessPOSPage />;
      case 'waiters':
        return (
          <ConfigurationPage
            title="Waiters"
            description="Manage Staff"
            columns={[{ key: 'name', header: 'Name' }, { key: 'phone', header: 'Phone' }, { key: 'role', header: 'Role' }]}
            data={waitersData}
            onAdd={() => openModal('Add New Waiter', 'Register staff', waiterSections)}
          />
        );
      case 'building-floor':
      case 'building-management':
      case 'floor-management':
      case 'floors':
      case 'buildings-floors':
      case 'building':
      case 'floor-setup':
        return <GeneralSettings initialTab="floors-wings" onNavigate={setActivePage} currentUser={currentUser} />;
      case 'amenities-safety':
      case 'amenities':
      case 'safety':
        return <GeneralSettings initialTab="amenities" onNavigate={setActivePage} currentUser={currentUser} />;
      case 'manage-room-type':
      case 'room-types':
      case 'room-type':
        return <GeneralSettings initialTab="room-types" onNavigate={setActivePage} currentUser={currentUser} />;
      case 'manage-room':
      case 'manage-rooms':
      case 'rooms':
        return <GeneralSettings initialTab="rooms" onNavigate={setActivePage} currentUser={currentUser} />;
      case 'room-rack':
        return <RoomRack />;
      case 'reservations':
      case 'reservations-view':
        return <ReservationsView />;
      case 'reservations-sleep-out':
      case 'reservations/sleep-out':
      case 'reservations/sleepout':
        return <ReservationSleepOut />;
      case 'reservations-hold':
      case 'reservations/hold':
        return <ReservationHold />;
      case 'reservations-unassigned':
      case 'reservations/unassigned':
        return <ReservationUnassigned />;
      case 'reservations-cancel':
      case 'reservations/cancel':
      case 'reservations/cancelled':
      case 'reservations-cancelled':
      case 'cancel':
      case 'cancelled':
        return <ReservationCancel />;
      case 'housekeeping':
        return <HousekeepingGrid />;
      case 'lost-and-found':
        return <LostAndFoundManagement />;
      case 'stay-view':
      case 'stayview':
        return <StayView />;
      case 'floor-plan':
        return <FloorPlan />;
      case 'joint-room':
      case 'connecting-rooms':
      case 'connecting-room':
        return <GeneralSettings initialTab="connecting-rooms" onNavigate={setActivePage} currentUser={currentUser} />;
      case 'rate-plans':
      case 'rate-plan':
        return <RatePlanManagement />;
      case 'rate-calendar':
        return <RateCalendar />;
      case 'channel-manager':
      case 'channels':
      case 'ota':
        return <ChannelManagerView activeView="channels" onNavigate={setActivePage} />;
      case 'channel-manager-ari':
      case 'channel-ari':
        return <ChannelManagerView activeView="ari-matrix" onNavigate={setActivePage} />;
      case 'channel-manager-wizard':
      case 'channel-wizard':
        return <ChannelManagerView activeView="bulk-update" onNavigate={setActivePage} />;
      case 'channel-manager-mappings':
      case 'channel-mappings':
        return <ChannelManagerView activeView="mappings" onNavigate={setActivePage} />;
      case 'channel-manager-bookings':
      case 'channel-bookings':
        return <ChannelManagerView activeView="bookings" onNavigate={setActivePage} />;
      case 'channel-manager-logs':
      case 'channel-logs':
        return <ChannelManagerView activeView="logs" onNavigate={setActivePage} />;
      case 'meal-plans':
      case 'meal-plan':
        return <MealPlanManagement />;
      case 'package-builder':
      case 'packages':
        return <PackageManagement />;
      case 'service-master':
        return <ServiceManagement />;
      case 'reports':
        return <Reports user={currentUser} onLogout={handleLogout} setActivePage={setActivePage} />;
      case 'revenue-dashboard':
        return <RevenueDashboard />;
      case 'kds':
      case 'kitchen-display':
        return <RestaurantKitchenDisplayPage />;
      case 'out-of-order':
      case 'maintenance':
        return <MaintenanceKanban />;
      case 'corporate-profiles':
        return <CorporateProfileManagement />;
      case 'business-origins':
        return <BusinessOriginManagement />;
      case 'advanced-reports':
        return <AdvancedReports />;
      case 'add-reservation':
      case 'quick-reservation':
        return <AddReservation />;
      case 'folio-operations':
      case 'allowance-checker':
      case 'folio-hub':
        return <StayView />;
      case 'guest-profile':
        return <GuestProfile />;
      case 'night-audit':
        return <NightAuditAutomation />;
      case 'service-vouchers':
        return <GuestVoucherSystem />;
      case 'holiday-management':
      case 'holidays':
      case 'holiday':
        return <GeneralSettings initialTab="holidays" onNavigate={setActivePage} currentUser={currentUser} />;
      case 'taxes-vat':
      case 'tax-vat-settings':
      case 'taxes':
      case 'vat':
        return <GeneralSettings initialTab="taxes-vat" onNavigate={setActivePage} currentUser={currentUser} />;
      case 'printer-settings':
      case 'printers':
      case 'hardware-printers':
        return <GeneralSettings initialTab="printer-settings" onNavigate={setActivePage} currentUser={currentUser} />;
      case 'user-management':
      case 'users':
      case 'staff':
      case 'pos-users':
      case 'admin-users':
        return <UserStaffManagement />;
      case 'roles-permissions':
      case 'roles':
      case 'permissions':
        return <RolesPermissionsManagement />;
      case 'departments':
        return <DepartmentManagement />;
      case 'shifts':
        return <ShiftManagement />;
      case 'banking':
        return <BankingManagement />;
      case 'discounts':
        return <DiscountManagement />;
      case 'extra-charges':
        return <ExtraChargesManagement />;
      case 'revenue-heads':
      case 'revenue-groups':
        return <RevenueManagement />;
      case 'finance-overview':
      case 'finance':
        return <MasterDataConfig initialTab="revenue" onNavigate={setActivePage} />;
      case 'occupancy-heatmap':
        return <OccupancyHeatmap />;
      case 'master-data':
      case 'master-data-config':
        return <MasterDataConfig onNavigate={setActivePage} />;
      case 'policy-management':
      case 'policy-settings':
        return <GeneralSettings initialTab="operations" onNavigate={setActivePage} currentUser={currentUser} />;
      case 'general-settings':
      case 'system-settings':
        return <GeneralSettings onNavigate={setActivePage} currentUser={currentUser} />;
      case 'advance-accounting':
        return <AdvanceAccountingDashboard />;
      case 'hrm-dashboard':
        return <HRMManagementDashboard />;
      case 'chain-console':
      case 'chain':
      case 'multi-property':
        return <MultiPropertyConsole />;
      case 'tenant-isolation':
      case 'tenant-hub':
        return <TenantIsolationHub />;
      case 'schema-explorer':
        return <RelationalDatabaseExplorer />;
      default:
        return <Dashboard />;
    }
  };

  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  const handleLogin = (user: UserData) => {
    setIsAuthenticated(true);
    setCurrentUser(user);
    if (!localStorage.getItem('auth_token')) {
      localStorage.setItem('auth_token', 'hotel_session_' + Date.now());
    }
    localStorage.setItem('hotel_last_activity_time', String(Date.now()));
    localStorage.setItem('user_data', JSON.stringify(user));
    updateUserSession(user);
    setActivePage('front-desk');
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    setCurrentUser(null);
    localStorage.removeItem('auth_token');
    localStorage.removeItem('user_data');
    localStorage.removeItem('hotel_portal_mode');
    localStorage.removeItem('hotel_last_activity_time');
    updateUserSession(null);
    setActivePage('dashboard');
  };

  // Public Guest-Facing Route Bypass: Pre-Arrival KYC Fast-Pass doesn't require staff login
  if (typeof window !== 'undefined' && (window.location.pathname.startsWith('/express-checkin') || window.location.search.includes('token='))) {
    return (
      <Suspense fallback={<div className="min-h-screen bg-slate-900 flex items-center justify-center text-white">Loading Fast-Pass...</div>}>
        <ExpressCheckInView />
      </Suspense>
    );
  }

  // Public Guest-Facing Route Bypass: Direct Web Booking Engine (/book)
  if (typeof window !== 'undefined' && (
    window.location.pathname.startsWith('/book') || 
    window.location.search.includes('page=book') ||
    (!isAuthenticated && (activePage === 'book' || activePage === 'direct-booking'))
  )) {
    return (
      <Suspense fallback={<div className="min-h-screen bg-slate-900 flex items-center justify-center text-white">Loading Luxury Booking Engine...</div>}>
        <DirectBookingEngine propertyId={activeProperty?.id || 1} />
        <Devnotation />
      </Suspense>
    );
  }

  if (!isAuthenticated) {
    return (
      <>
        <Login onLogin={handleLogin} />
        <Devnotation />
      </>
    );
  }

  return (
    <>
      <div className="flex h-screen overflow-hidden bg-[#fafafc] font-sans text-slate-900">
        <Sidebar
          activePage={activePage}
          setActivePage={setActivePage}
          isCollapsed={isSidebarCollapsed}
          toggleSidebar={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
        />
        <div className="flex-1 flex flex-col h-screen min-w-0 overflow-hidden transition-all duration-300">
          <Header activePage={activePage} setActivePage={setActivePage} onLogout={handleLogout} user={currentUser} />
          <div className="flex-1 overflow-y-auto overflow-x-hidden bg-[#fafafc] flex flex-col min-h-0 [&>*]:w-full [&>*]:min-w-0">
            <ErrorBoundary onReset={() => setActivePage('dashboard')}>
              <Suspense
                fallback={
                  <div className="flex-1 flex items-center justify-center min-h-[400px]">
                    <div className="flex flex-col items-center gap-2.5">
                      <div className="size-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                      <span className="text-xs text-slate-400 font-medium">Loading workspace module...</span>
                    </div>
                  </div>
                }
              >
                {renderContent()}
              </Suspense>
            </ErrorBoundary>
          </div>
        </div>
        <GenericSectionModal
          isOpen={modalConfig.isOpen}
          onClose={closeModal}
          title={modalConfig.title}
          subtitle={modalConfig.subtitle}
          sections={modalConfig.sections}
        />
      </div>
      <Devnotation />
    </>
  );
}

export default App;
