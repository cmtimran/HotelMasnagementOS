import { useState, useEffect } from 'react';
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
import AdminSecurity from './components/AdminSecurity';
import MasterDataConfig from './components/MasterDataConfig';
import RoomRack from './components/RoomRack';
import ReservationList from './components/ReservationList';
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
import QuickReservation from './components/QuickReservation';
import FolioOperations from './components/FolioOperations';
import GuestProfile from './components/GuestProfile';
import PackageManagement from './components/PackageManagement';
import ServiceManagement from './components/ServiceManagement';
import NightAuditAutomation from './components/NightAuditAutomation';
import GuestVoucherSystem from './components/GuestVoucherSystem';
import PolicyManagement from './components/PolicyManagement';

interface UserData {
  name: string;
  role: string;
  property: string;
  image?: string;
  email?: string;
}

function App() {
  const [activePage, setActivePage] = useState('dashboard');
  const [isTableModalOpen, setIsTableModalOpen] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [currentUser, setCurrentUser] = useState<UserData | null>(null);
  const [viewingProperty, setViewingProperty] = useState<any>(null);

  // Session Management: Check localStorage on mount
  useEffect(() => {
    // Check for Deep Link (e.g. ?page=reports)
    const params = new URLSearchParams(window.location.search);
    const pageParam = params.get('page');
    if (pageParam) {
      setActivePage(pageParam);
    }

    const storedAuth = localStorage.getItem('auth_token');
    const storedUser = localStorage.getItem('user_data');
    if (storedAuth) {
      setIsAuthenticated(true);
      if (storedUser) {
        setCurrentUser(JSON.parse(storedUser));
      }
    }
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

  const handleManageProperty = (property: any) => {
    setEditingProperty(property);
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
        return <AddProperty onBack={() => setActivePage('properties')} />;
      case 'hotel-info':
        return <HotelInfoView property={propertiesData[0]} currentUser={currentUser} onManageProperty={() => handleManageProperty(propertiesData[0])} />;
      case 'front-desk':
        return <FrontDesk />;
      case 'add-property':
        return <AddProperty onBack={() => setActivePage('dashboard')} />;
      case 'edit-property':
        return <AddProperty onBack={() => setActivePage('hotel-info')} initialData={editingProperty} />;
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
                  className: 'w-[40%]',
                  render: (row) => (
                    <div className="flex items-start gap-4">
                      <img
                        src={row.logo}
                        alt={row.name}
                        className="w-12 h-12 rounded-lg object-cover border border-gray-100 shadow-sm"
                      />
                      <div>
                        <p className="font-bold text-gray-900 text-base">{row.name}</p>
                        <p className="text-gray-500 text-xs mt-1 leading-relaxed">
                          {row.address}<br />
                          {row.city}, {row.country}
                        </p>
                      </div>
                    </div>
                  )
                },
                {
                  key: 'rooms',
                  header: 'Inventory',
                  className: 'w-[15%]',
                  render: (row) => (
                    <div className="flex flex-col">
                      <span className="font-bold text-gray-900">{row.rooms} Rooms</span>
                      <span className="text-xs text-gray-400 mt-0.5">Physical Units</span>
                    </div>
                  )
                },
                {
                  key: 'grade',
                  header: 'Grade',
                  className: 'w-[15%]',
                  render: (row) => (
                    <div className="flex items-center gap-1.5 px-3 py-1 bg-yellow-50 text-yellow-700 rounded-full w-fit">
                      <span className="text-xs font-bold uppercase tracking-wider">{row.grade}</span>
                    </div>
                  )
                },
                {
                  key: 'actions',
                  header: 'Actions',
                  className: 'text-right',
                  render: (row) => (
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => setViewingProperty(row)}
                        className="flex items-center gap-2 text-gray-600 hover:text-blue-600 border border-gray-200 hover:border-blue-200 hover:bg-blue-50 px-3 py-1.5 rounded-lg text-sm font-medium transition-all"
                      >
                        View Details
                      </button>
                    </div>
                  )
                }
              ]}
              data={propertiesData}
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
        return <BuildingManagement />;
      case 'manage-room-type':
        return <RoomTypeManagement />;
      case 'manage-room':
        return <RoomManagement onBack={() => setActivePage('dashboard')} />;
      case 'room-rack':
        return <RoomRack />;
      case 'reservations':
        return <ReservationList />;
      case 'housekeeping':
        return <HousekeepingGrid />;
      case 'stay-view':
        return <StayView />;
      case 'floor-plan':
        return <FloorPlan />;
      case 'joint-room':
        return <ConnectingRoomManagement />;
      case 'rate-plans':
        return <RatePlanManagement />;
      case 'rate-calendar':
        return <RateCalendar />;
      case 'meal-plans':
        return <MealPlanManagement />;
      case 'package-builder':
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
      case 'quick-reservation':
        return <QuickReservation />;
      case 'folio-operations':
      case 'allowance-checker':
        return <FolioOperations />;
      case 'guest-profile':
        return <GuestProfile />;
      case 'night-audit':
        return <NightAuditAutomation />;
      case 'service-vouchers':
        return <GuestVoucherSystem />;
      case 'users':
        return <AdminSecurity initialTab="users" />;
      case 'roles-permissions':
        return <AdminSecurity initialTab="roles" />;
      case 'occupancy-heatmap':
        return <OccupancyHeatmap />;
      case 'master-data':
        return <MasterDataConfig />;
      case 'policy-management':
        return <PolicyManagement />;
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
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    setCurrentUser(null);
    localStorage.removeItem('auth_token');
    localStorage.removeItem('user_data');
    setActivePage('dashboard');
  };

  if (!isAuthenticated) {
    return <Login onLogin={handleLogin} />;
  }

  return (
    <div className="flex min-h-screen bg-gray-50 font-sans text-gray-900">
      {activePage !== 'reports' && (
        <Sidebar
          activePage={activePage}
          setActivePage={setActivePage}
          isCollapsed={isSidebarCollapsed}
          toggleSidebar={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
        />
      )}
      <div className="flex-1 flex flex-col min-h-screen min-w-0 transition-all duration-300">
        {activePage !== 'reports' && (
          <Header activePage={activePage} setActivePage={setActivePage} onLogout={handleLogout} user={currentUser} />
        )}
        <div className="flex-1 overflow-y-auto overflow-x-hidden bg-gray-50">
          {renderContent()}
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
