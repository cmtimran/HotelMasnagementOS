import { useState, useEffect, useMemo } from 'react';
import Dashboard from './components/Dashboard';
import POSDashboard from './components/POSDashboard';
import ManagerDashboard from './components/ManagerDashboard';
import Sidebar from './components/Sidebar';
import AddProductMockup from './components/AddProductMockup';
import ConfigurationPage from './components/ConfigurationPage';
import POSPage from './components/POSPage';
import TableFormModal from './components/TableFormModal';
import GenericSectionModal, { type FormSection } from './components/GenericSectionModal';
import Header from './components/Header';
import Login from './components/Login';
import AddProperty from './components/AddProperty';
import HotelInfoView from './components/HotelInfoView';
import FrontDesk from './components/FrontDesk';
import RatePlanManagement from './components/RatePlanManagement';
import MealPlanManagement from './components/MealPlanManagement';
import Reports from './components/Reports';
import MasterDataConfig from './components/MasterDataConfig';
import RoomRack from './components/RoomRack';
import ReservationsView from './components/reservations/ReservationsView';
import ReservationSleepOut from './components/reservations/ReservationSleepOut';
import ReservationHold from './components/reservations/ReservationHold';
import ReservationUnassigned from './components/reservations/ReservationUnassigned';
import ReservationCancel from './components/reservations/ReservationCancel';
import HousekeepingGrid from './components/HousekeepingGrid';
import LostAndFoundManagement from './components/LostAndFoundManagement';
import RateCalendar from './components/RateCalendar';
import OccupancyHeatmap from './components/OccupancyHeatmap';
import RevenueDashboard from './components/RevenueDashboard';
import KitchenDisplay from './components/KitchenDisplay';
import StayView from './components/StayView';
import MaintenanceKanban from './components/MaintenanceKanban';
import FloorPlan from './components/FloorPlan';
import TableLayout from './components/TableLayout';
import CorporateProfileManagement from './components/CorporateProfileManagement';
import BusinessOriginManagement from './components/BusinessOriginManagement';
import AdvancedReports from './components/AdvancedReports';
import AddReservation from './components/AddReservation';
import FolioOperations from './components/FolioOperations';
import FolioHub from './components/FolioHub';
import GuestProfile from './components/GuestProfile';
import PackageManagement from './components/PackageManagement';
import ServiceManagement from './components/ServiceManagement';
import NightAuditAutomation from './components/NightAuditAutomation';
import GuestVoucherSystem from './components/GuestVoucherSystem';
import GeneralSettings from './components/GeneralSettings';
import BankingManagement from './components/BankingManagement';
import RevenueManagement from './components/RevenueManagement';
import ExtraChargesManagement from './components/ExtraChargesManagement';
import DiscountManagement from './components/DiscountManagement';
import DepartmentManagement from './components/DepartmentManagement';
import ShiftManagement from './components/ShiftManagement';
import RolesPermissionsManagement from './components/RolesPermissionsManagement';
import UserStaffManagement from './components/UserStaffManagement';
import RelationalDatabaseExplorer from './components/database/RelationalDatabaseExplorer';
import AdvanceAccountingDashboard from './components/accounting/AdvanceAccountingDashboard';
import HRMManagementDashboard from './components/hrm/HRMManagementDashboard';
import MultiPropertyConsole from './components/chain/MultiPropertyConsole';
import TenantIsolationHub from './components/chain/TenantIsolationHub';
import TenantOnboardingWizard from './components/chain/TenantOnboardingWizard';
import ErrorBoundary from './components/common/ErrorBoundary';
import { initNetworkSync } from './utils/pmsNetworkSync';
import { syncReservationsFromDB } from './utils/roomInventoryEngine';
import { Devnotation } from 'devnotation';
import 'devnotation/style.css';

import { useNavigation } from './context/NavigationContext';
import { usePortal, type UserData } from './context/PortalContext';
import { useProperty } from './context/PropertyContext';

function App() {
  const { activePage, setActivePage } = useNavigation();
  const { updateUserSession } = usePortal();
  const { properties, activeProperty } = useProperty();
  const [isTableModalOpen, setIsTableModalOpen] = useState(false);
  // Session Management: Synchronous initialization eliminates login screen flash/flicker on reload
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => {
    try {
      return Boolean(localStorage.getItem('auth_token'));
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
    if (localStorage.getItem('auth_token')) {
      syncReservationsFromDB().catch(console.error);
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
      if (e.key === 'auth_token') {
        setIsAuthenticated(Boolean(e.newValue));
      }
      if (e.key === 'user_data') {
        try {
          setCurrentUser(e.newValue ? JSON.parse(e.newValue) : null);
        } catch {
          setCurrentUser(null);
        }
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  // Auto-Logout on Inactivity
  useEffect(() => {
    if (!isAuthenticated) return;

    let timeoutId: number;

    const resetTimer = () => {
      if (timeoutId) clearTimeout(timeoutId);
      timeoutId = window.setTimeout(() => {
        handleLogout();
      }, 15 * 60 * 1000); // 15 Minutes
    };

    const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart'];
    events.forEach(event => document.addEventListener(event, resetTimer));

    resetTimer(); // Start timer

    return () => {
      if (timeoutId) clearTimeout(timeoutId);
      events.forEach(event => document.removeEventListener(event, resetTimer));
    };
  }, [isAuthenticated]);

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
  const [categoriesData] = useState<any[]>([]);
  const [tablesData] = useState<any[]>([]);
  const [addonsData] = useState<any[]>([]);
  const [unitsData] = useState<any[]>([]);
  const [floorPlanData] = useState<any[]>([]);
  const [countersData] = useState<any[]>([]);
  const [kitchensData] = useState<any[]>([]);
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

  const categorySections: FormSection[] = [
    {
      title: 'Basic Information',
      fields: [
        { name: 'name', label: 'Category Name', type: 'text', placeholder: 'e.g. Burger', required: true, colSpan: 2 },
        { name: 'parent', label: 'Parent Category', type: 'select', options: ['None', 'Fast Food', 'Beverage', 'Main Course'] },
        { name: 'image', label: 'Category Image', type: 'file', colSpan: 3 },
      ]
    },
    {
      title: 'Operations & Display',
      fields: [
        { name: 'kitchen', label: 'Default Kitchen', type: 'select', options: ['Main Kitchen', 'Bar', 'Grill Section'] },
        { name: 'sortOrder', label: 'Sort Order', type: 'number', placeholder: '1' },
        { name: 'printKot', label: 'Print KOT?', type: 'checkbox', defaultValue: true },
        { name: 'status', label: 'Active Status', type: 'checkbox', defaultValue: true }
      ]
    }
  ];

  const addonSections: FormSection[] = [
    {
      title: 'Addon Details',
      fields: [
        { name: 'name', label: 'Addon Name', type: 'text', placeholder: 'e.g. Extra Cheese', required: true, colSpan: 2 },
        { name: 'price', label: 'Price', type: 'number', placeholder: '0.00', required: true },
        { name: 'group', label: 'Addon Group', type: 'select', options: ['Toppings', 'Crusts', 'Sauces', 'Drinks'], required: true },
      ]
    }
  ];

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

  const floorSections: FormSection[] = [
    {
      title: 'Floor Info',
      fields: [
        { name: 'name', label: 'Floor Name', type: 'text', placeholder: 'e.g. 1st Floor', required: true },
        { name: 'number', label: 'Floor Number', type: 'number', placeholder: '1', required: true },
        { name: 'outlet', label: 'Outlet / Branch', type: 'select', options: ['Main Branch', 'Downtown'], required: true },
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

  const kitchenSections: FormSection[] = [
    {
      title: 'Kitchen Info',
      fields: [
        { name: 'name', label: 'Kitchen Name', type: 'text', placeholder: 'e.g. Indian Kitchen', required: true, colSpan: 2 },
        { name: 'outlet', label: 'Outlet', type: 'select', options: ['Main Branch', 'Downtown', 'Airport'], required: true },
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
      case 'pos':
        return <POSPage />;
      case 'products':
        return <AddProductMockup />;
      case 'tables':
        return (
          <>
            <ConfigurationPage
              title="Tables"
              description="Setup restaurant tables and seating areas"
              columns={[
                { key: 'id', header: 'Table No' },
                { key: 'name', header: 'Table Name' },
                { key: 'capacity', header: 'Capacity' },
                { key: 'area', header: 'Area' }
              ]}
              data={tablesData}
              onAdd={() => setIsTableModalOpen(true)}
            />
            <TableFormModal isOpen={isTableModalOpen} onClose={() => setIsTableModalOpen(false)} />
          </>
        );
      case 'categories':
        return (
          <ConfigurationPage
            title="Categories"
            description="Manage Food Categories"
            columns={[{ key: 'name', header: 'Name' }, { key: 'type', header: 'Type' }, { key: 'status', header: 'Status' }]}
            data={categoriesData}
            onAdd={() => openModal('Add New Category', 'Organize menu', categorySections)}
          />
        );
      case 'addons':
        return (
          <ConfigurationPage
            title="Addons"
            description="Manage Extra Items"
            columns={[{ key: 'name', header: 'Name' }, { key: 'price', header: 'Price' }, { key: 'status', header: 'Status' }]}
            data={addonsData}
            onAdd={() => openModal('Add New Addon', 'Create toppings', addonSections)}
          />
        );
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
        return (
          <ConfigurationPage
            title="Floor Plan"
            description="Manage Areas"
            columns={[{ key: 'name', header: 'Floor Name' }, { key: 'area', header: 'Type' }, { key: 'tables', header: 'Tables' }]}
            data={floorPlanData}
            onAdd={() => openModal('Add New Floor/Area', 'Define zones', floorSections)}
          />
        );
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
        return (
          <ConfigurationPage
            title="Kitchens"
            description="Manage Kitchen Stations"
            columns={[{ key: 'name', header: 'Kitchen Name' }, { key: 'floor', header: 'Floor' }, { key: 'printer', header: 'Printer IP' }]}
            data={kitchensData}
            onAdd={() => openModal('Add New Kitchen', 'Setup production', kitchenSections)}
          />
        );
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
        return <KitchenDisplay />;
      case 'table-layout':
        return <TableLayout />;
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
        return <FolioOperations />;
      case 'folio-hub':
        return <FolioHub />;
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
      localStorage.setItem('auth_token', 'valid_session');
    }
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
    updateUserSession(null);
    setActivePage('dashboard');
  };

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
              {renderContent()}
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
