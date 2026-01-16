# NICE Property Management System (PMS)

A comprehensive Web-based Property Management System (PMS) designed for hotels and restaurants. This application provides tools for managing properties, rooms, rates, point of sale (POS), finance, and staff operations.

![PMS Dashboard](public/logo.jpg)

## 📖 Project Overview & Workflow

The **NICE PMS** is designed to centralize hospitality operations, bridging the gap between hotel property management and restaurant point-of-sale systems.

### 🔄 Typical Workflow
1.  **Authentication**: Secure role-based login (Admin, Manager, Staff).
2.  **Dashboard**: Immediate view of critical KPIs (Occupancy, Revenue, Notifications).
3.  **Setup (One-time)**: configuration of Properties -> Buildings -> Rooms -> Rates.
4.  **Daily Operations**:
    *   **Front Desk**: Check-in guests, assign rooms, manage bookings.
    *   **Restaurant**: seated service, KOT generation, and billing.
5.  **Reporting**: End-of-day financial reconciliation.

---

## 🧭 Sidebar Navigation & Roadmap

Detailed breakdown of every module accessible via the sidebar, including current capabilities and the development roadmap.

### 🏠 Main

#### **HMS Overview**
*   **Current Functionality**: Central dashboard displaying aggregated data such as Total Bookings, Check-ins, Check-outs, and Total Revenue.
*   **Future Plan**: Implement date-range filtering, customizable widgets, and click-through analytics for deeper insights.

#### **Manager Dashboard**
*   **Current Functionality**: Specialized view for operational managers focusing on staff activity and active alerts.
*   **Future Plan**: Add staff performance metrics, shift management integration, and approval workflows.

---

### 🍽️ POS Management (Restaurant)

#### **POS Dashboard**
*   **Current Functionality**: Visual summary of restaurant performance (Top selling items, Daily sales count).
*   **Future Plan**: Real-time sales graphs, hourly footfall heatmaps, and inventory depletion alerts.

#### **POS / Billing**
*   **Current Functionality**: The core interface for taking orders. Features include table selection, category filtering, cart management, and receipt generation.
*   **Future Plan**: Support for Split Bills, Table Merge, Mobile view for waiters, and Kitchen Display System (KDS) integration.

#### **Menu Management**
*   **Categories**:
    *   *Current*: Create hierarchical categories (Food -> Fast Food).
    *   *Future*: Drag-and-drop reordering, seasonal category scheduling.
*   **Products**:
    *   *Current*: Add items with prices, tax rules, and descriptions.
    *   *Future*: Recipe management (ingredients), bundle offers, and happy hour pricing.
*   **Addons**:
    *   *Current*: Define modifiers (e.g., "Extra Cheese", "No Sugar").
    *   *Future*: Conditional logic (only show "Steak Doneness" if Steak is selected).
*   **Units**:
    *   *Current*: Define measurement units (kg, plate, glass).
    *   *Future*: Unit conversions for inventory tracking.

#### **Restaurant Setup**
*   **Tables**: Configure table names and capacities. (*Future: QR code generation for self-ordering*).
*   **Floor Plan**: Map tables to physical zones. (*Future: Drag-and-drop visual layout editor*).
*   **Kitchens**: Route items to specific printers/screens. (*Future: Multi-stage kitchen status tracking*).

#### **Staff & Users**
*   **Waiters**: Manage profiles and commission rates. (*Future: Tip tracking and payroll export*).

---

### 🏨 Property Management

#### **Properties**
*   **Current Functionality**: Add and configure multiple properties (Hotels, Resorts) with details like location, contact info, and tax rules.
*   **Future Plan**: Multi-currency support and localized settings per property.

#### **Hotel Info**
*   **Current Functionality**: Read-only view of key property configurations (Policies, Bank Accounts).
*   **Future Plan**: Direct edit capabilities and formatted PDF export of property details.

---

### 🛏️ Room Management

#### **Floors & Buildings**
*   **Current Functionality**: Define the physical hierarchy (e.g., Main Building -> Floor 1).
*   **Future Plan**: Visual building map.

#### **Room Types**
*   **Current Functionality**: Create classes of rooms (Deluxe, Standard) with base amenities and default occupancy.
*   **Future Plan**: Dynamic pricing rules based on room type demand.

#### **Rooms**
*   **Current Functionality**: Manage individual room inventory (Room 101, 102) and status.
*   **Future Plan**: Bulk room creation wizard and housekeeping status app.

#### **Connecting Rooms**
*   **Current Functionality**: Link two physical rooms to be sold as a single unit or separately.
*   **Future Plan**: Calendar availability sync for connected units.

---

### 🏷️ Rate Management

#### **Rate Plans**
*   **Current Functionality**: Define pricing strategies (e.g., "Rack Rate", "Corporate").
*   **Future Plan**: Channel manager integration (Booking.com, Expedia sync).

#### **Meal Plans**
*   **Current Functionality**: Set board types (EP, CP, MAP, AP).
*   **Future Plan**: Integration with POS to auto-allow meal credits.

---

### 👥 User Management
*   **Current Functionality**: Create system users and assign roles.
*   **Future Plan**: Granular permission matrix (checkbox-based access control).

### ⚙️ Settings
*   **General Settings**: Application-wide defaults.
*   **Future Plan**: White-labeling options (custom logo/theme) and data backup tools.

### 💰 Finance
*   **Overview**: Basic financial summary.
*   **Future Plan**: Full General Ledger (GL) integration, Expense tracking, and Tax filing reports.

 