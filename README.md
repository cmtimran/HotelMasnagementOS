# HotelManagementOS

<div align="center">

### Next-Generation Cloud PMS, Real-Time Channel Manager & Hospitality ERP Suite

[![React](https://img.shields.io/badge/React-19.2-blue?logo=react&logoColor=white)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.9-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Vite](https://img.shields.io/badge/Vite-7.2-646CFF?logo=vite&logoColor=white)](https://vitejs.dev/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-3.4-38B2AC?logo=tailwind-css&logoColor=white)](https://tailwindcss.com/)
[![Specification](https://img.shields.io/badge/SRS-v4.0_Master_(IEEE_830)-success)](./Software_Requirements_Specification.md)
[![Database](https://img.shields.io/badge/PostgreSQL-16_RLS-336791?logo=postgresql&logoColor=white)](https://www.postgresql.org/)
[![License](https://img.shields.io/badge/License-Proprietary-red.svg)](LICENSE)

</div>

---

## 📌 Executive Overview

**HotelManagementOS** is an autonomous, enterprise-grade hospitality operating system architected to unify the fragmented software ecosystem of modern hotels and resorts. 

Traditionally, hospitality operators are forced to stitch together 5+ disparate third-party tools:
- **Property Management System (PMS):** OPERA / Cloudbeds
- **Channel Manager:** SiteMinder / RateGain
- **Restaurant POS:** Petpooja / Toast
- **Accounting & ERP:** Tally / QuickBooks
- **Staff & HR:** BambooHR

**HotelManagementOS** replaces this fragmented landscape with a single, high-performance, multi-tenant platform featuring PostgreSQL 16 Row-Level Security (RLS), sub-second 2-way OTA distribution (Booking.com, Agoda, Expedia, Airbnb), overbooking-safe distributed locking (Redlock), and an integrated 5-digit ERP General Ledger.

---

## 🌟 Core System Capabilities

### 1. Front Desk & Tape Chart Operations
* **Stay View & Room Rack:** Visual interactive Gantt-style tape chart for room allocations, early check-ins, late check-outs, and room moves with instant folio reassignment.
* **Quick Reservation Engine:** Rapid reservation modal supporting multi-room bookings, group reservations, dynamic price overrides, and promo codes.
* **Guest 360° Profiles:** Comprehensive guest history tracking preferences, VIP statuses, corporate bill-to entities, ID verification records, and guest vouchers.

### 2. Real-Time 2-Way Channel Manager
* **Zero-Overbooking Guarantee:** Distributed concurrency control combining Redis 7 Redlock and database `SELECT FOR UPDATE` transaction isolation.
* **Instant ARI Distribution:** Sub-second Availability, Rates, and Inventory (ARI) synchronization across top OTAs (Booking.com, Agoda, Expedia, Airbnb, Hotelbeds).
* **Temporary Quote Holds:** 10-minute inventory reservations backed by Redis TTL keyspace notifications to prevent race conditions during web checkout.
* **Rate Parity Auditing:** Automated background jobs detecting OTA undercut pricing and disparity violations.

### 3. Food & Beverage POS & Kitchen Display System (KDS)
* **Restaurant POS:** Table floor-plan mapping, guest seat management, split-bill capability, and fast receipt generation.
* **Kitchen Display System (KDS):** Real-time order routing by kitchen prep station with multi-stage fulfillment tracking.
* **Room Service & Folio Routing:** Direct posting of restaurant and minibar charges to the guest's hotel room folio with electronic signature validation.

### 4. Folio Accounting & ERP General Ledger
* **Multi-Folio Billing:** Up to 4 isolated folios per reservation (Room & Taxes, Incidentals, Corporate/Master, Banquet).
* **5-Digit Hospitality Chart of Accounts (COA):** Built-in accounting tree spanning Assets (1xxxx), Liabilities (2xxxx), Equity (3xxxx), Revenue (4xxxx), and Expenses (5xxxx).
* **Statutory Tax Engine:** Country-specific cascading tax support including Bangladesh Mushak 6.3 (15% VAT + 10% Service Charge) and India GST (12%/18% slabs).
* **Automated Night Audit:** 6-step sequential pipeline with automated room charge posting, tax computation, no-show processing, and zero-balance variance verification.

### 5. Housekeeping & Maintenance Kanban
* **Housekeeping Grid:** Real-time room cleanliness states (`Clean`, `Dirty`, `Inspected`, `Out of Order`, `Out of Service`) synced directly with front desk check-in eligibility.
* **Maintenance Kanban:** Work order ticketing system with priority tagging, maintenance technician assignments, and room out-of-order downtime tracking.

---

## 📐 System Architecture & Specifications

The engineering baseline of **HotelManagementOS** is governed by extensive IEEE 830 / ISO/IEC/IEEE 29148 documentation available directly in the repository:

* 📄 **[Software Requirements Specification (SRS v4.0)](./Software_Requirements_Specification.md)**: 2,000+ lines covering 36+ production DDL tables with PostgreSQL RLS, 4 finite-state machines (FSM), 9 core algorithms, 23 background cron jobs, and 4 SRE disaster recovery runbooks.
* 🔍 **[Forensic Gap Analysis & Technical Audit](./HotelManagementOS_SRS_Gap_Analysis_Expert.md)**: Architectural evaluation matrix assessing system parity against global enterprise PMS standards.
* 🗺️ **[Channel Manager Master Blueprint (Plan v7)](./Channel_Manager_Development_Plan_v7.md)**: Complete operational plan for OTA integration adapters, rate parity engines, and webhook distribution.

```
                           ┌─────────────────────────────┐
                           │      HotelManagementOS      │
                           │   Next.js / React 19 SPA    │
                           └──────────────┬──────────────┘
                                          │ HTTPS / WSS
                                          ▼
                           ┌─────────────────────────────┐
                           │    NestJS API Gateway       │
                           │ (JWT Auth, RBAC, Tenancy)   │
                           └───────┬─────────────┬───────┘
                                   │             │
        ┌──────────────────────────┘             └──────────────────────────┐
        ▼                                                                   ▼
┌─────────────────────────────────┐                       ┌─────────────────────────────────┐
│     PostgreSQL 16 Cluster       │                       │       Go Sync Engine / OTA      │
│  - Multi-tenant RLS Isolation   │                       │  - OTA XML/JSON Adapter Bus     │
│  - Monthly Table Partitioning   │                       │  - Rate Parity Scanner          │
│  - Transactional Outbox Pattern │                       │  - RabbitMQ Queue Consumer      │
└─────────────────────────────────┘                       └────────────────┬────────────────┘
        ▲                                                                  │
        │ Redis 7 Redlock & Caching                                        ▼
┌────────────────────────────────────────────────────────┐ ┌─────────────────────────────────┐
│ - 10-Minute Temporary Hold Keyspace Notifications       │ │ External Distribution:          │
│ - Rate Plan & Daily Inventory Sub-Second Cache         │ │ Booking.com | Expedia | Agoda   │
│ - Distributed Lock Manager for Overbooking Prevention  │ │ Airbnb | Hotelbeds             │
└────────────────────────────────────────────────────────┘ └─────────────────────────────────┘
```

---

## 💻 Tech Stack

| Layer | Technologies |
|---|---|
| **Frontend Framework** | [React 19](https://react.dev/) + [TypeScript 5.9](https://www.typescriptlang.org/) |
| **Build & Tooling** | [Vite 7](https://vitejs.dev/) + [PostCSS](https://postcss.org/) |
| **Styling & Design** | [Tailwind CSS 3.4](https://tailwindcss.com/) + [Lucide React](https://lucide.dev/) |
| **Document & Reports** | [jsPDF](https://github.com/parallax/jsPDF), [jsPDF-AutoTable](https://github.com/simonbengtsson/jsPDF-AutoTable), [XLSX](https://docs.sheetjs.com/), [html2canvas](https://html2canvas.hertzen.com/) |
| **Date & Time Engine** | [date-fns 4.1](https://date-fns.org/) |
| **Backend & Microservices** *(SRS v4.0)* | NestJS (API Gateway), Go (High-Throughput OTA Sync Service) |
| **Database & Cache** *(SRS v4.0)* | PostgreSQL 16 (RLS, Range Partitioning), Redis 7 (Redlock, Key Invalidation) |
| **Event Broker** *(SRS v4.0)* | RabbitMQ (Transactional Outbox Pattern, Channel Sync Queues) |

---

## 📂 Project Directory Structure

```text
HotelManagementOS/
├── .gemini/                                # Custom agent and development configurations
├── public/                                 # Static public assets (branding, icons, favicons)
│   └── vite.svg
├── src/
│   ├── assets/                             # Image assets and graphics
│   ├── components/                         # 50+ Modular PMS, POS, and ERP UI Components
│   │   ├── AddProperty.tsx                 # Property onboarding & config
│   │   ├── AdminSecurity.tsx               # Security, RBAC & audit log viewer
│   │   ├── AdvancedReports.tsx             # Financial, tax & operational reports
│   │   ├── BuildingManagement.tsx          # Physical property & building structure
│   │   ├── Dashboard.tsx                   # Central operational executive dashboard
│   │   ├── FloorPlan.tsx                   # Visual restaurant floor plan & table layout
│   │   ├── FolioOperations.tsx             # Multi-folio billing & cashiering
│   │   ├── FrontDesk.tsx                   # Daily check-in/out & guest lifecycle
│   │   ├── GuestProfile360.tsx             # Unified guest profile management
│   │   ├── HousekeepingGrid.tsx            # Room status & cleaning assignments
│   │   ├── KitchenDisplay.tsx              # Kitchen Display System (KDS) order terminal
│   │   ├── MaintenanceKanban.tsx           # Work orders & facility maintenance
│   │   ├── ManagerDashboard.tsx            # Operational KPIs & shift management
│   │   ├── MealPlanManagement.tsx          # EP, CP, MAP, AP board configurations
│   │   ├── NightAuditAutomation.tsx        # Automated 6-step night audit runner
│   │   ├── OccupancyHeatmap.tsx            # Visual room occupancy forecasting
│   │   ├── PackageManagement.tsx           # Stay packages & dynamic inclusions
│   │   ├── POSDashboard.tsx                # F&B revenue & item performance
│   │   ├── POSPage.tsx                     # Restaurant point-of-sale terminal
│   │   ├── QuickReservation.tsx            # 60-second reservation booking modal
│   │   ├── RateCalendar.tsx                # Multi-channel ARI calendar matrix
│   │   ├── RatePlanManagement.tsx          # Pricing policies & rate plans
│   │   ├── RevenueDashboard.tsx            # RevPAR, ADR & occupancy metrics
│   │   ├── RoomManagement.tsx              # Room inventory & operational states
│   │   ├── RoomRack.tsx                    # Interactive room status rack
│   │   ├── RoomTypeManagement.tsx          # Room classifications & amenities
│   │   ├── ServiceManagement.tsx           # Ancillary services & extra charges
│   │   └── StayView.tsx                    # Multi-day tape chart / Gantt visualizer
│   ├── styles/                             # Global styling definitions
│   ├── utils/                              # Export helpers, math, and date formatters
│   ├── App.tsx                             # Master routing & module orchestration
│   ├── index.css                           # Tailwind CSS directives
│   └── main.tsx                            # React 19 entry point
├── Channel_Manager_Development_Plan_v7.md  # 9,500+ Line Channel Manager Master Blueprint
├── HotelManagementOS_SRS_Gap_Analysis_Expert.md # Forensic gap analysis re-audit report
├── package.json                            # Package dependencies and npm scripts
├── Software_Requirements_Specification.md  # Comprehensive IEEE 830 SRS Document (v4.0)
├── tailwind.config.js                      # Tailwind CSS design system configuration
├── tsconfig.json                           # TypeScript compiler configuration
└── vite.config.ts                          # Vite bundler configuration
```

---

## 🚀 Getting Started

### Prerequisites

Ensure you have the following installed on your machine:
* **Node.js**: `v20.x` or higher
* **npm**: `v10.x` or higher (or `pnpm` / `yarn`)

### Installation

1. **Clone the repository:**
   ```bash
   git clone https://github.com/cmtimran/HotelMasnagementOS.git
   cd HotelMasnagementOS
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Launch the development server:**
   ```bash
   npm run dev
   ```
   Open your browser and navigate to `http://localhost:5173`.

4. **Build for production:**
   ```bash
   npm run build
   ```

5. **Run TypeScript linting:**
   ```bash
   npm run lint
   ```

---

## 📊 Core Operational Workflows

### Daily Guest Lifecycle
```
[Inquiry / Direct Booking / OTA]
               │
               ▼
   [Temporary 10-Min Hold] ──(TTL Expired)──> [Inventory Released]
               │
          (Confirmed)
               ▼
   [Reservation Confirmed] ──> [Pre-Arrival Notification]
               │
               ▼
     [Front Desk Check-In] ──> [Room Status: Occupied] ──> [Active Folio 80000+]
               │
               ├── (Incidentals: Restaurant POS, Minibar, Laundry)
               │
               ▼
    [Front Desk Check-Out] ──> [Zero-Balance Folio Settlement]
               │
               ▼
     [Housekeeping Alert] ──> [Room Status: Dirty] ──> [Cleaned & Inspected]
```

### Night Audit Sequence (02:00 AM Daily)
```
1. Trial Balance Audit ────> Check total Debits == total Credits
2. Auto Room Post ─────────> Post nightly room rate + taxes to active folios
3. F&B POS Reconciliation ─> Verify all restaurant checks closed/billed to room
4. No-Show Processing ─────> Mark un-arrived reservations and apply cancellation policy
5. Inventory Roll-Forward ─> Advance system business date (Audit Date + 1)
6. Trial Balance Final ────> Lock business date and generate Manager Daily Report
```

---

## 🛡️ Security & Compliance

* **Tenant Isolation:** Enforced via PostgreSQL 16 Row-Level Security (`app.current_tenant_id`) ensuring zero cross-property data leakage.
* **Audit Logging:** Every critical transaction (rate modifications, room status overrides, folio charge reversals) is immutably logged with timestamp, user ID, and IP address.
* **Financial Integrity:** Zero hard deletes on financial postings. Adjustments are processed strictly as compensating debit/credit journal entries.

---

## 🤝 Contributing

Contributions to **HotelManagementOS** are welcome! Please follow these steps:
1. Fork the repository.
2. Create your feature branch (`git checkout -b feature/amazing-feature`).
3. Commit your changes using Conventional Commits (`git commit -m 'feat: add folio split-bill preview'`).
4. Push to the branch (`git push origin feature/amazing-feature`).
5. Open a Pull Request referencing the corresponding SRS section.

---

## 📄 License

This software and its accompanying architectural documentation are proprietary. Unauthorized copying, distribution, or modification of this project is strictly prohibited. For licensing inquiries, contact the repository maintainers.