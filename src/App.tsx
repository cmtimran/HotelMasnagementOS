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
import PropertyDetailsModal from './components/PropertyDetailsModal';
import AddProperty from './components/AddProperty';
import HotelInfoView from './components/HotelInfoView';
import FrontDesk from './components/FrontDesk';
import BuildingManagement from './components/BuildingManagement';
import RoomTypeManagement from './components/RoomTypeManagement';
import ConnectingRoomManagement from './components/ConnectingRoomManagement';
import RoomManagement from './components/RoomManagement';
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
import GuestProfile from './components/GuestProfile';
import PackageManagement from './components/PackageManagement';
import ServiceManagement from './components/ServiceManagement';
import NightAuditAutomation from './components/NightAuditAutomation';
import GuestVoucherSystem from './components/GuestVoucherSystem';
import PolicyManagement from './components/PolicyManagement';
import GeneralSettings from './components/GeneralSettings';
import BankingManagement from './components/BankingManagement';
import RevenueManagement from './components/RevenueManagement';
import ExtraChargesManagement from './components/ExtraChargesManagement';
import DiscountManagement from './components/DiscountManagement';
import DepartmentManagement from './components/DepartmentManagement';
import ShiftManagement from './components/ShiftManagement';
import HolidayManagement from './components/HolidayManagement';
import TaxVatManagement from './components/TaxVatManagement';
import PrinterSettingsManagement from './components/PrinterSettingsManagement';
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

import { useNavigation } from './context/NavigationContext';
import { usePortal, type UserData } from './context/PortalContext';
import { useProperty } from './context/PropertyContext';

function App() {
  const { activePage, setActivePage } = useNavigation();
  const { updateUserSession } = usePortal();
  const { properties, activeProperty, setActivePropertyId } = useProperty();
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

  const [viewingProperty, setViewingProperty] = useState<any>(null);

  // Global Event-Driven Realtime Network Sync & PostgreSQL Database Hydration on Application Boot
  useEffect(() => {
    initNetworkSync();
    syncReservationsFromDB().catch(console.error);
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


  // Mock Data
  const categoriesData = [
    { id: 1, name: 'Burger', type: 'Food', status: 'Active' },
    { id: 2, name: 'Pizza', type: 'Food', status: 'Active' },
  ];

  const tablesData = [
    { id: 101, name: 'Table 1', capacity: 4, area: 'Main Hall' },
  ];

  const addonsData = [
    { id: 1, name: 'Extra Cheese', price: 50, status: 'Active' },
  ];

  const unitsData = [
    { id: 1, name: 'Kilogram', code: 'kg', status: 'Active' },
  ];

  const floorPlanData = [
    { id: 1, name: 'Ground Floor', area: 'Indoor', tables: 12 },
  ];

  const countersData = [
    { id: 1, name: 'Main Counter', type: 'General', status: 'Active' },
  ];

  const kitchensData = [
    { id: 1, name: 'Main Kitchen', floor: 'Ground', printer: '192.168.1.100' },
  ];

  const waitersData = [
    { id: 1, name: 'John Doe', phone: '555-0101', role: 'Senior Waiter' },
  ];

  const propertiesData = [
    {
      id: 1,
      logo: 'https://placehold.co/40x40?text=GH',
      name: 'Grand Hotel',
      address: '123 Ocean Drive',
      country: 'USA',
      city: 'Miami',
      currency: 'USD',
      website: 'www.grandhotel.com',
      rooms: 120,
      grade: '5 Star',
      phone: '+1 305-555-0199',
      email: 'info@grandhotel.com',
      description: 'The Grand Hotel offers luxurious accommodations with stunning ocean views. Located in the heart of Miami, our 5-star property features world-class dining, a full-service spa, and private beach access.',
      features: ['Beach Access', 'Spa', 'Pool', 'Fine Dining', 'Fitness Center']
    },
    {
      id: 2,
      logo: 'https://placehold.co/40x40?text=CH',
      name: 'City Hub',
      address: '45 Downtown Ave',
      country: 'UK',
      city: 'London',
      currency: 'GBP',
      website: 'www.cityhublondon.com',
      rooms: 85,
      grade: '4 Star',
      phone: '+44 20 7946 0958',
      email: 'london@cityhub.com',
      description: 'Modern urban hotel in central London. Perfect for business travelers and city explorers.',
      features: ['Free WiFi', 'Coworking Space', 'Central Location', 'Smart Rooms']
    }
  ];

  const livePropertiesData = useMemo(() => {
    if (properties && properties.length > 0) {
      return properties.map(p => ({
        id: p.id,
        logo: `https://placehold.co/40x40?text=${p.code || 'GH'}`,
        name: p.name,
        code: p.code,
        address: p.address || 'Dhaka, Bangladesh',
        country: p.country || 'Bangladesh',
        city: p.city || 'Dhaka',
        currency: p.currency || 'BDT',
        website: 'www.grandhospitality.com',
        rooms: p.total_rooms || 34,
        grade: `${p.star_rating || 5} Star`,
        phone: p.phone || '+880 2 9882200',
        email: p.email || 'dhaka@grandhospitality.com',
        description: `${p.name} - Luxury accommodation and professional hospitality management.`,
        features: ['High-speed WiFi', 'Executive Lounge', 'Room Service', 'Fine Dining', 'Concierge Desk'],
        buildings: p.total_buildings || 1,
        staff: p.total_staff || 0,
        raw: p
      }));
    }
    return propertiesData;
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
        return (
          <>
            <ConfigurationPage
              title="Properties"
              description="Manage your hotel properties and physical locations"
              columns={[
                {
                  key: 'name',
                  header: 'Property',
                  className: 'w-[42%]',
                  render: (row) => (
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-slate-100 to-slate-200 border border-slate-200/80 flex items-center justify-center text-slate-700 text-xs flex-shrink-0 shadow-2xs overflow-hidden">
                        {row.logo && !row.logo.includes('placehold.co') ? (
                          <img src={row.logo} alt={row.name} className="w-full h-full object-cover" />
                        ) : (
                          <span>{row.name.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase()}</span>
                        )}
                      </div>
                      <div className="min-w-0">
                        <p className="text-gray-900 text-xs sm:text-[13px] leading-tight truncate">{row.name}</p>
                        <p className="text-gray-500 text-[11px] mt-0.5 leading-tight truncate">
                          {row.address}, {row.city}, {row.country}
                        </p>
                      </div>
                    </div>
                  )
                },
                {
                  key: 'rooms',
                  header: 'Inventory',
                  className: 'w-[18%]',
                  render: (row) => (
                    <div className="flex flex-col">
                      <span className="text-gray-900 text-xs">{row.rooms} Rooms</span>
                      <span className="text-[10px] text-gray-400">Physical Units</span>
                    </div>
                  )
                },
                {
                  key: 'grade',
                  header: 'Grade',
                  className: 'w-[15%]',
                  render: (row) => (
                    <div className="inline-flex items-center gap-1 px-2 py-0.5 bg-amber-50 text-amber-700 border border-amber-200/60 rounded-full">
                      <span className="text-[10px] uppercase tracking-wider">{row.grade}</span>
                    </div>
                  )
                },
                {
                  key: 'actions',
                  header: 'Actions',
                  className: 'text-right',
                  render: (row) => (
                    <div className="flex items-center justify-end gap-1.5">
                      {row.id !== activeProperty?.id && (
                        <button
                          type="button"
                          onClick={() => {
                            setActivePropertyId(row.id);
                          }}
                          className="h-7 px-2 rounded-lg text-[11px] text-blue-700 hover:text-blue-800 bg-blue-50 hover:bg-blue-100 border border-blue-200 transition cursor-pointer"
                        >
                          Switch Hotel
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => handleManageProperty(row.raw || row)}
                        className="h-7 px-2.5 rounded-lg text-[11.5px] font-semibold text-blue-700 hover:text-blue-800 bg-blue-50/70 hover:bg-blue-100 border border-blue-200/90 transition-all cursor-pointer active:scale-[0.98]"
                      >
                        Manage Property
                      </button>
                      <button
                        type="button"
                        onClick={() => setViewingProperty(row.raw || row)}
                        className="h-7 px-2.5 rounded-lg text-[11.5px] font-semibold text-gray-700 hover:text-blue-600 bg-white hover:bg-blue-50/50 border border-gray-200/90 hover:border-blue-300 shadow-2xs hover:shadow-xs transition-all cursor-pointer active:scale-[0.98]"
                      >
                        View Details
                      </button>
                    </div>
                  )
                }
              ]}
              data={livePropertiesData}
              onAdd={() => setActivePage('property-create')}
            />
            <PropertyDetailsModal
              isOpen={!!viewingProperty}
              onClose={() => setViewingProperty(null)}
              property={viewingProperty}
            />
          </>
        );
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
      case 'amenities-safety':
      case 'amenities':
      case 'safety':
      case 'buildings':
      case 'floors':
      case 'buildings-floors':
      case 'building':
      case 'floor-setup':
        return (
          <BuildingManagement
            initialTab={
              activePage === 'floor-management' || activePage === 'floors' || activePage === 'floor-setup'
                ? 'floors'
                : activePage === 'amenities-safety' || activePage === 'amenities' || activePage === 'safety'
                ? 'amenities'
                : 'buildings'
            }
          />
        );
      case 'manage-room-type':
      case 'room-types':
      case 'room-type':
        return <RoomTypeManagement />;
      case 'manage-room':
      case 'manage-rooms':
      case 'rooms':
        return <RoomManagement onBack={() => setActivePage('dashboard')} />;
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
      case 'stay-view':
      case 'stayview':
        return <StayView />;
      case 'floor-plan':
        return <FloorPlan />;
      case 'joint-room':
      case 'connecting-rooms':
      case 'connecting-room':
        return <ConnectingRoomManagement />;
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
      case 'guest-profile':
        return <GuestProfile />;
      case 'night-audit':
        return <NightAuditAutomation />;
      case 'service-vouchers':
        return <GuestVoucherSystem />;
      case 'holiday-management':
      case 'holidays':
      case 'holiday':
        return <HolidayManagement />;
      case 'taxes-vat':
      case 'tax-vat-settings':
      case 'taxes':
      case 'vat':
        return <TaxVatManagement />;
      case 'printer-settings':
      case 'printers':
      case 'hardware-printers':
        return <PrinterSettingsManagement />;
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
        return <PolicyManagement onNavigate={setActivePage} />;
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
    localStorage.setItem('auth_token', 'valid_token_placeholder');
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
    return <Login onLogin={handleLogin} />;
  }

  return (
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
  );
}

export default App;
