# HotelManagementOS - System Context & Domain Model

## 1. System Vision
HotelManagementOS is an Enterprise-Grade Multi-Tenant Cloud Property Management System (PMS) designed for 3-star to 5-star hotels, resorts, and hotel chains. It delivers real-time sub-second synchronization between Front Desk terminals, Housekeeping mobile grids, Back-Office Accounting, and Online Travel Agencies (OTAs).

## 2. Technical Stack
- **Frontend:** React 19, TypeScript, Tailwind CSS, Vite, Lucide Icons
- **Backend:** Node.js, Express, TypeScript (dual standalone HTTP and Vercel Serverless Function support)
- **Primary Database:** Cloud PostgreSQL 17 (TiDB Cloud High-Availability Cluster with RLS & Connection Pooling)
- **Distributed Cache & Bus:** Redis 7 (Pub/Sub & Redlock) with automatic in-memory fallback for local/serverless environments
- **Real-Time Synchronization:** Server-Sent Events (SSE) `/api/realtime/stream`

## 3. Core Subsystems
1. **Front Desk & Reservations:** High-speed room rack, multi-room group stays, split stays, tentative holds, blacklists, check-in/out, digital registration cards.
2. **Folio & Cashiering:** Multi-folio routing, split folios, payments, credit card MDR commissions, VAT/Service charge accounting, money receipts, refund vouchers.
3. **Inventory & Tariff Engine:** Dynamic pricing, occupancy tiers, extra bed policies, meal plans, packages, rate calendar overrides, holiday surges.
4. **Housekeeping & Engineering:** Room status workflows, discrepancies, auto-assignment, maintenance orders, lost & found.
5. **Back-Office Accounting:** Multi-currency Chart of Accounts, Double-Entry General Ledger, Journal Entries, Night Audit automation.
6. **GuestFlow & Omnichannel AI:** Automated WhatsApp/Email notifications, OCR passport/NID scanning, AI concierge.
