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
      // Extended Data
      phone: '+1 305-555-0199',
      email: 'info@grandhotel.com',
      established: '1998',
      operations: {
        checkIn: '14:00',
        checkOut: '12:00',
        nightAudit: '02:00',
        weekends: ['Sat', 'Sun'],
        cancellation: 'Flexible (24h)',
        smoking: 'Non-Smoking Property'
      },
      finance: {
        taxRule: 'Exclusive (Plus Tax)',
        binNo: 'US-998877665',
        bankAccounts: [
          { id: 1, bankName: 'Chase Bank', accountNum: '9876543210', swift: 'CHASUS33' }
        ]
      },
      corporate: {
        address: '500 Corporate Blvd, New York, NY 10001',
        email: 'corp@grandhotelgroup.com',
        phone: '+1 212-555-9000'
      },
      pocs: [
        { id: 1, role: 'General Manager', name: 'Robert De Niro', phone: '+1 305-555-0101', email: 'gm@grandhotel.com' }
      ],
      automation: {
        autoRun: true,
        auditTime: '02:00',
        autoPostRent: true
      }
    },
    {
      id: 2,
      logo: 'https://placehold.co/40x40?text=CH',
      name: 'City Hub',
      address: '45 Downtown Ave',
      country: 'UK',
      city: 'London',
      currency: 'GBP',
      website: 'www.cityhub.co.uk',
      rooms: 85,
      grade: '4 Star',
      // Extended Data
      phone: '+44 20 7946 0958',
      email: 'stay@cityhub.co.uk',
      established: '2015',
      operations: {
        checkIn: '15:00',
        checkOut: '11:00',
        nightAudit: '03:00',
        weekends: ['Fri', 'Sat'],
        cancellation: 'Moderate (48h)',
        smoking: 'Designated Areas Only'
      },
      finance: {
        taxRule: 'Inclusive (Net Price)',
        binNo: 'UK-11223344',
        bankAccounts: [
          { id: 1, bankName: 'Barclays', accountNum: '20-45-67 88990011', swift: 'BARCGB22' }
        ]
      },
      corporate: {
        address: '10 Downing St, London SW1A 2AA',
        email: 'hq@cityhubinv.com',
        phone: '+44 20 7946 0000'
      },
      pocs: [
        { id: 1, role: 'Owner', name: 'James Smith', phone: '+44 7700 900077', email: 'owner@cityhub.co.uk' }
      ],
      automation: {
        autoRun: false,
        auditTime: '03:00',
        autoPostRent: false
      }
    },
  ];

  // --- Section Configurations ---



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
        { name: 'isFeatured', label: 'Is Featured?', type: 'checkbox', defaultValue: false },
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
        { name: 'linkedItem', label: 'Linked Raw Material', type: 'text', placeholder: 'Search inventory item...', colSpan: 2 },
      ]
    },
    {
      title: 'Selection Rules',
      fields: [
        { name: 'selectionType', label: 'Selection Type', type: 'select', options: ['Single Select', 'Multi Select'] },
        { name: 'minSelect', label: 'Min Selection', type: 'number', placeholder: '0' },
        { name: 'maxSelect', label: 'Max Selection', type: 'number', placeholder: '3' },
        { name: 'status', label: 'Active Status', type: 'checkbox', defaultValue: true }
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
        { name: 'sortOrder', label: 'Sort Order', type: 'number', placeholder: '1' },
        { name: 'description', label: 'Description', type: 'textarea', placeholder: 'Internal notes...', colSpan: 4 }
      ]
    }
  ];

  const counterSections: FormSection[] = [
    {
      title: 'Counter Identity',
      fields: [
        { name: 'name', label: 'Counter Name', type: 'text', placeholder: 'e.g. Main Counter', required: true, colSpan: 2 },
        { name: 'code', label: 'Counter Code', type: 'text', placeholder: 'e.g. CNT-01' },
        { name: 'outlet', label: 'Outlet', type: 'select', options: ['Main Branch'], required: true },
      ]
    },
    {
      title: 'Technical Config',
      fields: [
        { name: 'printer', label: 'Default Printer', type: 'select', options: ['Cash Printer 1', 'Bar Printer'] },
        { name: 'invoicePrefix', label: 'Invoice Prefix', type: 'text', placeholder: 'INV-A-' },
        { name: 'ip', label: 'Authorized IP', type: 'text', placeholder: '192.168.1.xxx' }
      ]
    }
  ];

  const kitchenSections: FormSection[] = [
    {
      title: 'Kitchen Info',
      fields: [
        { name: 'name', label: 'Kitchen Name', type: 'text', placeholder: 'e.g. Indian Kitchen', required: true, colSpan: 2 },
        { name: 'outlet', label: 'Outlet', type: 'select', options: ['Main Branch', 'Downtown', 'Airport'], required: true },
        { name: 'type', label: 'Kitchen Type', type: 'select', options: ['Main Kitchen', 'Bar', 'Pastry', 'Grill'] },
        { name: 'location', label: 'Location', type: 'text', placeholder: 'e.g. Ground Floor, Rooftop' },
        { name: 'categories', label: 'Associated Categories', type: 'text', placeholder: 'e.g. Burger, Pizza (Multi-select)', colSpan: 3 },
      ]
    },
    {
      title: 'Hardware & Notifications',
      fields: [
        { name: 'printerType', label: 'Printer Type', type: 'select', options: ['Network Printer', 'USB Printer', 'KDS Screen'] },
        { name: 'printer', label: 'Printer IP / Name', type: 'text', placeholder: '192.168.1.100' },
        { name: 'sound', label: 'Notification Sound', type: 'checkbox', defaultValue: true }
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
        { name: 'photo', label: 'Photo', type: 'file', colSpan: 2 },
      ]
    },
    {
      title: 'Login & Compensation',
      fields: [
        { name: 'pin', label: 'Login PIN (4-6 digit)', type: 'password', required: true },
        { name: 'commission', label: 'Commission (%)', type: 'number', placeholder: '0' },
        { name: 'status', label: 'Active Status', type: 'checkbox', defaultValue: true }
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
        // Find current property (mock: first one)
        const currentProperty = propertiesData[0];
        return <HotelInfoView property={currentProperty} currentUser={currentUser} onManageProperty={() => handleManageProperty(currentProperty)} />;
      case 'front-desk':
        return <FrontDesk />;
      case 'add-property':
        return <AddProperty onBack={() => setActivePage('dashboard')} />;
      case 'edit-property':
        return <AddProperty onBack={() => setActivePage('hotel-info')} initialData={editingProperty} />;
      case 'building-floor':
        return <BuildingManagement />;
      case 'manage-room-type':
        return <RoomTypeManagement />;
      case 'joint-room':
        return <ConnectingRoomManagement />;
      case 'properties':
        return (
          <>
            <ConfigurationPage
              title="Properties"
              description="Manage your hotel properties"
              columns={[
                {
                  key: 'name',
                  header: 'Property',
                  className: 'w-[40%]',
                  render: (row) => (
                    <div className="flex items-start gap-4">
                      <img src={row.logo} alt={row.name} className="w-12 h-12 rounded-lg object-cover border border-gray-100 shadow-sm" />
                      <div>
                        <p className="font-bold text-gray-900 text-base">{row.name}</p>
                        <div className="flex items-center gap-1 text-gray-500 text-xs mt-1">
                          <span>{row.address}</span>
                          <span>•</span>
                          <span>{row.city}</span>
                        </div>
                      </div>
                    </div>
                  )
                },
                {
                  key: 'status',
                  header: 'Status',
                  render: () => (
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                      Active
                    </span>
                  )
                },
                {
                  key: 'stats',
                  header: 'Overview',
                  render: (row) => (
                    <div className="flex items-center gap-4 text-sm">
                      <div className="flex flex-col">
                        <span className="text-gray-500 text-xs uppercase tracking-wider">Rooms</span>
                        <span className="font-medium">{row.rooms}</span>
                      </div>
                      <div className="h-8 w-px bg-gray-200"></div>
                      <div className="flex flex-col">
                        <span className="text-gray-500 text-xs uppercase tracking-wider">Grade</span>
                        <div className="flex items-center gap-1">
                          <span className="font-medium text-yellow-600">{row.grade}</span>
                        </div>
                      </div>
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
                        className="text-gray-600 hover:text-blue-600 hover:bg-blue-50 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors border border-gray-200 hover:border-blue-200"
                      >
                        View Details
                      </button>
                      <button className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors">
                        <span className="sr-only">Edit</span>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"></path></svg>
                      </button>
                      <button className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors">
                        <span className="sr-only">Delete</span>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
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
      case 'property-list':
        return (
          <ConfigurationPage
            title="Property List"
            description="View all registered properties"
            columns={[{ key: 'id', header: 'ID' }, { key: 'name', header: 'Name' }, { key: 'address', header: 'Address' }]}
            data={[]}
            onAdd={() => { }}
          />
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
                { key: 'area', header: 'Area' },
              ]}
              data={tablesData}
              onAdd={() => setIsTableModalOpen(true)}
            />
            <TableFormModal
              isOpen={isTableModalOpen}
              onClose={() => setIsTableModalOpen(false)}
            />
          </>
        );
      case 'categories':
        return (
          <ConfigurationPage
            title="Categories"
            description="Manage your food and beverage categories"
            columns={[
              { key: 'id', header: 'ID' },
              { key: 'name', header: 'Name' },
              { key: 'type', header: 'Type' },
              { key: 'status', header: 'Status', render: (row) => <span className="bg-green-100 text-green-700 px-2 py-1 rounded text-xs">{row.status}</span> }
            ]}
            data={categoriesData}
            onAdd={() => openModal('Add New Category', 'Organize your menu items', categorySections)}
          />
        );
      case 'addons':
        return (
          <ConfigurationPage
            title="Addons"
            description="Manage extra items and toppings"
            columns={[
              { key: 'id', header: 'ID' },
              { key: 'name', header: 'Name' },
              { key: 'price', header: 'Price' },
              { key: 'status', header: 'Status', render: (row) => <span className="bg-green-100 text-green-700 px-2 py-1 rounded text-xs">{row.status}</span> }
            ]}
            data={addonsData}
            onAdd={() => openModal('Add New Addon', 'Create toppings and modifiers', addonSections)}
          />
        );
      case 'units':
        return (
          <ConfigurationPage
            title="Product Units"
            description="Manage measurement units (kg, pc, ltr)"
            columns={[
              { key: 'id', header: 'ID' },
              { key: 'name', header: 'Unit Name' },
              { key: 'code', header: 'Short Code' },
              { key: 'status', header: 'Status', render: (row) => <span className="bg-green-100 text-green-700 px-2 py-1 rounded text-xs">{row.status}</span> }
            ]}
            data={unitsData}
            onAdd={() => openModal('Add Product Unit', 'Define measurement units', unitSections)}
          />
        );
      case 'floor':
        return (
          <ConfigurationPage
            title="Floor Plan"
            description="Manage restaurant floors and areas"
            columns={[
              { key: 'id', header: 'ID' },
              { key: 'name', header: 'Floor Name' },
              { key: 'area', header: 'Area Type' },
              { key: 'tables', header: 'Total Tables' },
            ]}
            data={floorPlanData}
            onAdd={() => openModal('Add New Floor/Area', 'Define restaurant zones', floorSections)}
          />
        );
      case 'counters':
        return (
          <ConfigurationPage
            title="Counters"
            description="Setup billing and service counters"
            columns={[
              { key: 'id', header: 'ID' },
              { key: 'name', header: 'Counter Name' },
              { key: 'type', header: 'Type' },
              { key: 'status', header: 'Status', render: (row) => <span className="bg-green-100 text-green-700 px-2 py-1 rounded text-xs">{row.status}</span> }
            ]}
            data={countersData}
            onAdd={() => openModal('Add New Counter', 'Configure POS stations', counterSections)}
          />
        );
      case 'kitchens':
        return (
          <ConfigurationPage
            title="Kitchens"
            description="Manage kitchen stations and printers"
            columns={[
              { key: 'id', header: 'ID' },
              { key: 'name', header: 'Kitchen Name' },
              { key: 'floor', header: 'Location' },
              { key: 'printer', header: 'Printer IP' },
            ]}
            data={kitchensData}
            onAdd={() => openModal('Add New Kitchen', 'Setup production areas', kitchenSections)}
          />
        );
      case 'waiters':
        return (
          <ConfigurationPage
            title="Waiters"
            description="Manage staff members"
            columns={[
              { key: 'id', header: 'ID' },
              { key: 'name', header: 'Name' },
              { key: 'phone', header: 'Phone' },
              { key: 'role', header: 'Role' },
            ]}
            data={waitersData}
            onAdd={() => openModal('Add New Waiter', 'Register staff members', waiterSections)}
          />
        );
      case 'building-floor':
        return <BuildingManagement />;
      case 'manage-room-type':
        return <RoomTypeManagement />;
      case 'manage-room':
        return <RoomManagement onBack={() => setActivePage('dashboard')} />;
      case 'joint-room':
        return <ConnectingRoomManagement />;
      case 'rate-plans':
        return <RatePlanManagement />;
      case 'meal-plans':
        return <MealPlanManagement />;
      case 'reports':
        return <Reports />;
      default:
        return null;
    }
  };

  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  // ... (existing code)

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

        {/* Top Header */}
        {activePage !== 'reports' && (
          <Header setActivePage={setActivePage} onLogout={handleLogout} user={currentUser} />
        )}

        {/* Scrollable Page Content */}
        <div className="flex-1 overflow-y-auto overflow-x-hidden bg-gray-50">
          {renderContent()}
        </div>

      </div>

      {/* Global Generic Section Modal */}
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
