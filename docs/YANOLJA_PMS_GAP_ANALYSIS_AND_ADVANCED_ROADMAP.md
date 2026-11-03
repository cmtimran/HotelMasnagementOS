# Yanolja Cloud Solution (eZee Technosys) PMS Gap Analysis & Advanced Implementation Roadmap

> **Author**: HotelManagementOS Engineering Architecture Team  
> **Source Benchmark**: [Yanolja Cloud Solution Support & Knowledge Base](https://yanoljacloudsolution.freshdesk.com/en/support/solutions) (eZee Absolute PMS, eZee Centrix, eZee BurrP! POS, eZee Mint RMS, eZee Rise)  
> **Target Version**: HotelManagementOS Enterprise v3.0  
> **Status**: Comprehensive Architectural Blueprint & Production Roadmap  

---

## 1. Executive Summary & Comparative Matrix

Yanolja Cloud Solution (incorporating the internationally deployed **eZee Absolute Cloud Hotel PMS**, **eZee Centrix Channel Manager**, and **eZee BurrP! F&B/POS**) represents one of global hospitality's most comprehensive enterprise platforms.

While **HotelManagementOS** currently possesses strong foundations in Stay View tape chart visual management, basic folio charges/payments, room move, room split, void management, and hierarchical room grouping, multiple advanced operational and mission-critical enterprise capabilities documented in the Yanolja portal remain unbuilt or can be significantly modernized with next-generation AI and real-time event-driven architecture.

### Feature Benchmark Matrix

| Domain / Topic | Yanolja PMS Feature Set | HotelManagementOS Current State | Roadmap Target & Next-Gen Advantage |
|---|---|---|---|
| **Front Office & Lifecycle** | Sharer bookings, e-Registration card with signature, Stop Room Move, Day-Use/Hourly rooms, Undo Check-in/Out, Overbooking logic | Basic reservation, Check-in/out, Move/Split modal, Hold till | **AI Digital e-Reg Card**, One-click Room Swap, Multi-tier Sharer profiles, Hourly transit room matrix |
| **Folio Cashiering & Billing** | Multi-folio routing matrix, Group Owner transfer, Void with reversal audit, Split by %, City Ledger ageing, Advance deposits | Basic charges/payments, Group owner transfer, Void drawer, Adjustments | **Rule-based Auto-Routing Engine**, Advance Deposit Escrow Ledger, 30/60/90-day Corporate Ageing, Fiscal QR E-Invoicing |
| **Rate & Revenue Management** | Occupancy-based dynamic pricing (eZee Mint), MLOS/CTA/CTD restrictions, Package revenue unbundling | Rate plan dropdown, static rates, package items | **Algorithmic Dynamic Yield Engine**, Automated restriction triggers, Multi-department revenue split |
| **Housekeeping & Engineering** | Cleaning credit auto-assignment, Mobile HK interface, Minibar auto-posting, Work orders, Lost & Found | Status badges, basic HK grid, simple lost & found | **Weighted Cleaning Credit Dispatcher**, Mobile Attendant PWA, Direct-to-Folio Minibar barcode scanner, Preventive maintenance kanban |
| **Night Audit & Day-End** | 6-step automated audit, automated room charge & tax posting, no-show automated penalty, trial balance, flash report | Basic date display, partial manual night audit | **Autonomous One-Click Night Audit Engine**, Pre-audit health validator, Automated revenue dispatch to C-suite |
| **F&B POS & Banquet / Events** | Charge-to-room with signature check, Banquet Event Order (BEO) generator, hall scheduling | POS page, KDS mockup, table view | **Biometric / Signature Room Charge Validation**, Full BEO Event Master with per-pax catering tiers |
| **Hardware & IoT Interfaces** | Keycard encoders (Salto/VingCard/Onity), PBX call accounting, Passport MRZ scanner, Fiscal printer | Keycard mock routes, printer settings | **WebUSB / WebSocket Direct Keycard Encoder**, On-device Passport OCR, Real-time PBX socket listener |
| **Security & Governance** | Role-based limits (max discount, max void amount), immutable audit trail | Basic roles, session auth | **Granular Action-Level RBAC**, Cryptographic audit log with before/after visual diffs |

---

## 2. Topic 1: Front Office & Advanced Room Lifecycle Management

### 2.1 Digital Registration Card (e-Reg Card) with Sign-on-Glass
* **Yanolja Standard**: Front desk prints physical registration cards or opens a tablet view where guests confirm personal details, terms of stay, vehicle license plate, and sign with a stylus.
* **Our Advanced Implementation**:
  - **Self-Service QR / Web View**: Upon reservation confirmation or check-in, generate a dynamic link/QR code. The guest opens the e-Reg card on their smartphone or on the front desk iPad.
  - **Auto-population via Passport/NID Scanner**: Optical character recognition (OCR) extracts full name, nationality, date of birth, document number, and expiry date.
  - **HTML5 Canvas Digital Signature**: Signature captured directly in vector format, stamped with timestamp, client IP, and GPS coordinate (for contactless web check-in).
  - **Immutable PDF Storage**: Automatically rendered into an official hotel registration PDF, permanently linked to the guest's profile and booking history.

### 2.2 Sharer Reservations & Multi-Guest Room Allocation
* **Yanolja Standard**: Multiple guests staying in the same room can have independent profiles, arrival/departure dates, and separate folios.
* **Our Advanced Implementation**:
  - **Primary vs Secondary Sharer Roles**: Assign one Primary Booker (responsible for base room tariff) and multiple Secondary Sharers (responsible for incidental extras).
  - **Independent Stay Dates**: Sharer B can arrive on Day 2 and depart on Day 4 while Sharer A stays Day 1 to Day 5. Room rack visually represents overlapping sharer periods.
  - **Keycard Split**: Encode distinct keycards per sharer with unique RFID access windows.

### 2.3 Stop Room Move & Atomic Room Swap
* **Yanolja Standard**: "Stop Room Move" locks a room assignment so other receptionists cannot move the reservation without entering a supervisor override PIN.
* **Our Advanced Implementation**:
  - **Visual Lock Badge**: Rooms marked with a golden padlock icon on the Stay View tape chart with lock reason (e.g., "Guest requested high floor near elevator", "Connecting room with family in 103").
  - **Atomic Room Swap**: Moving Room 101 to occupied Room 102 currently requires moving 102 to a temporary room first. Our engine implements an atomic two-way swap transaction: swapping Room 101 and Room 102 in a single database transaction with instant keycard re-issuance alerts.

### 2.4 Day-Use & Hourly Transit Bookings
* **Yanolja Standard**: Hotels near airports, transit hubs, or conference centers sell rooms in 3-hour, 6-hour, or 12-hour slots during daytime (9 AM - 6 PM) without occupying the night slot.
* **Our Advanced Implementation**:
  - **Time-Slot Grid View**: Split the Stay View tape chart into 24-hour time slices for Day-Use room types.
  - **Double Occupancy in a Single Date**: Same physical room can have a Day-Use guest (10:00 AM - 4:00 PM), quick housekeeping turnover (4:00 PM - 5:30 PM), and an overnight guest (6:00 PM onwards).
  - **Automated Rapid Housekeeping Trigger**: Immediate priority notification to housekeeping upon Day-Use check-out for express cleaning turnover.

### 2.5 Undo Check-In & Undo Check-Out
* **Yanolja Standard**: Allows reverting an accidental check-in (returns room to Clean/Reserved, preserves deposit) or accidental check-out (re-opens folio, restores occupied room status).
* **Our Advanced Implementation**:
  - **One-Click Reversal with Audit Reason**: Restores reservation status, re-opens closed folios, and rolls back posted check-in tariff or check-out payments.
  - **Room Status Conflict Detection**: If Room 102 was already cleaned and assigned to another guest after check-out, prompt the receptionist to assign an alternate clean room before executing Undo Check-out.

---

## 3. Topic 2: Folio Cashiering, Advanced Auto-Routing & Multi-Folio Accounting

```
+-------------------------------------------------------------------------------------------------+
|                                    MASTER RESERVATION                                           |
|                                                                                                 |
|   +--------------------------+      Auto-Route Rules       +--------------------------------+   |
|   |         FOLIO 1          | --------------------------> |            FOLIO 2             |   |
|   |   (Corporate / Master)   |                             |      (Guest Personal)          |   |
|   |                          |                             |                                |   |
|   |  - Room Tariffs          |                             |  - Restaurant & Bar Charges    |   |
|   |  - Mandatory Taxes       |                             |  - Minibar Consumptions        |   |
|   |  - Airport Transfers     |                             |  - Laundry & Spa Treatments    |   |
|   |  - Contract Inclusions   |                             |  - Extra Person Charges        |   |
|   |                          |                             |                                |   |
|   |  Balance: $2,450.00      |                             |  Balance: $310.00              |   |
|   |  Settlement: Direct Bill |                             |  Settlement: Credit Card / Cash|   |
|   +--------------------------+                             +--------------------------------+   |
+-------------------------------------------------------------------------------------------------+
```

### 3.1 Advanced Rule-Based Folio Routing Engine
* **Yanolja Standard**: Directs room charges and taxes to Folio 1 (billed to Company/OTA) and extra charges (food, beverages, minibar) to Folio 2 (billed to Guest).
* **Our Advanced Implementation**:
  - **Granular Routing Matrix**:
    - Route by **Revenue Head**: Room Tariff, Food & Beverage, Telephone, Laundry, Spa, Miscellaneous.
    - Route by **Charge Code**: Specific items (e.g., Breakfast included in corporate rate routed to Folio 1, alcoholic beverages routed to Folio 2).
    - Route by **Amount Limit**: Company pays room tariff up to $150/night; any room tariff excess auto-routes to Guest Folio 2.
    - Route by **Time Window**: Breakfast before 10 AM routed to Corporate; midnight snacks routed to Guest.
  - **Visual Rule Builder**: Drag-and-drop rule configuration inside `RouteFolioModal` with real-time preview of how future transactions will split.

### 3.2 Group Master Billing & Proportional Group Payment
* **Yanolja Standard**: A travel agent or tour leader booking 20 rooms wants one combined invoice for all room tariffs, while guests pay their own incidental expenses.
* **Our Advanced Implementation**:
  - **One-Click Transfer to Master**: Automatically inspect all linked group rooms, calculate outstanding room charges, transfer them to Master Folio with zero-net ledger entries, and post a confirmation badge on each sub-folio.
  - **Multi-Room Group Payment Allocator**:
    - *Sequential Mode*: Payment settles Room 1 balance first, then Room 2, etc.
    - *Proportional Mode*: Distributes a $5,000 lump sum payment across all 15 rooms proportional to each room's outstanding balance.
    - *Selective Mode*: Cashier clicks individual checkboxes for the exact rooms/charges being settled.

### 3.3 Advance Deposit Escrow Ledger
* **Yanolja Standard**: Collects deposit prior to arrival, holds it in a deposit ledger, and auto-settles it against room charges on check-in.
* **Our Advanced Implementation**:
  - **Deposit Escrow Account**: Deposits do not contaminate active in-house revenue before arrival; stored in liability account `2100 - Guest Deposits Held`.
  - **Automated Check-in Redemption**: At the instant of check-in, system prompts: *"Advance Deposit of $500 detected. Apply to Folio 1?"* Single click transfers deposit to folio credit.
  - **Automated Forfeiture Rules**: If reservation is cancelled past the free cancellation window or marked as No-Show, system prompts to forfeit the deposit into `4900 - Cancellation Fee Revenue` with full GST/VAT compliance.

### 3.4 Direct Billing / City Ledger & Corporate Ageing Engine
* **Yanolja Standard**: Allows checking out corporate guests without immediate payment by transferring folio balance to Company City Ledger.
* **Our Advanced Implementation**:
  - **Corporate Credit Limit Verification**: Real-time check against corporate profile credit limit (e.g., Google LLC limit: $50,000; current outstanding: $42,000; allowable new charge: $8,000). Blocks check-out if credit limit exceeded without manager override.
  - **Ageing Analysis Dashboard**: Interactive aging buckets (0-30 days, 31-60 days, 61-90 days, 90+ days) with automated payment reminders and interest/penalty calculations.
  - **Batch Invoicing & Statement Generation**: Generate consolidated monthly invoices with itemized reservation attachments for corporate accounts payable departments.

### 3.5 Multi-Currency & Foreign Exchange (Forex) Engine
* **Yanolja Standard**: Accepts foreign currency payments (USD, EUR, GBP) using configured hotel exchange rates and calculates change in local currency.
* **Our Advanced Implementation**:
  - **Live Central Bank API Rates**: Automatically fetch official central bank exchange rates daily with customizable hotel markup margins (e.g. +2.5% exchange fee).
  - **Dual Currency Folio Presentation**: Receipts print total charges in both Local Currency (BDT/INR/AED) and Guest Billing Currency (USD/EUR) with explicit conversion rate and timestamp.
  - **Forex Gain / Loss Ledger**: Automatically posts currency variance adjustments to general ledger account `5300 - Foreign Exchange Variance`.

---

## 4. Topic 3: Revenue Management & Algorithmic Dynamic Pricing (eZee Mint Architecture)

### 4.1 Occupancy-Hurdle Dynamic Pricing
* **Yanolja Standard**: eZee Mint adjusts rate plans based on real-time occupancy percentages.
* **Our Advanced Implementation**:
  - **Rule-Based Dynamic Tiers**:
    ```
    Occupancy 00% - 40%  --> Standard BAR Rate ($100)
    Occupancy 41% - 65%  --> Tier 1 Rate (+15% -> $115)
    Occupancy 66% - 80%  --> Tier 2 Rate (+30% -> $130)
    Occupancy 81% - 95%  --> Tier 3 Peak (+50% -> $150)
    Occupancy 96% - 100% --> Last-Room Luxury (+80% -> $180)
    ```
  - **Lead-Time Discount Curve**: Guests booking > 30 days in advance receive 10% Early Bird; bookings within 4 hours of arrival receive dynamic flash rates if occupancy < 50%.
  - **Channel Parity Controller**: Instantly broadcasts updated dynamic rates across Direct Web Engine, Booking.com, Expedia, and Agoda simultaneously.

### 4.2 Automated Length of Stay (LOS) & Revenue Restrictions
* **Yanolja Standard**: Sets MLOS, CTA, CTD restrictions manually or via seasonal rules.
* **Our Advanced Implementation**:
  - **Automated Gap-Fill MLOS**: When high-demand event dates (e.g., New Year's Eve) are booked, system automatically sets MLOS = 3 nights to prevent "island dates" (unsellable 1-night gaps).
  - **Closed to Arrival (CTA)**: Block check-ins on peak event days while keeping rooms bookable for guests checking in 2 days prior.
  - **Stop-Sell Safeguard**: When unassigned room count reaches safety threshold (e.g., 2 rooms left for walk-ins/maintenance buffer), automatically broadcast Stop-Sell to high-commission OTAs while keeping direct booking engine open.

---

## 5. Topic 4: Smart Housekeeping & Maintenance Engineering

```
+-------------------------------------------------------------------------------------------------+
|                               HOUSEKEEPING DISPATCH ENGINE                                      |
|                                                                                                 |
|   Attendant: Maria Santos (Capacity: 16 Credits)                                                |
|   -------------------------------------------------------------------------------------------   |
|   Room 101 [Checkout Dirty]  --> 3.0 Credits (Deep clean, linen strip, full sanitize)           |
|   Room 102 [Stayover Dirty]  --> 1.5 Credits (Tidy up, towel change, trash removal)             |
|   Room 204 [Suite Checkout]  --> 5.0 Credits (Master suite, jacuzzi, balcony setup)             |
|   Room 305 [Stayover Dirty]  --> 1.5 Credits (Standard refresh)                                 |
|   Room 306 [Stayover Dirty]  --> 1.5 Credits (Standard refresh)                                 |
|   Room 401 [Stayover Dirty]  --> 1.5 Credits (Standard refresh)                                 |
|   Room 402 [Stayover Dirty]  --> 1.5 Credits (Standard refresh)                                 |
|   -------------------------------------------------------------------------------------------   |
|   Total Assigned: 15.5 / 16.0 Credits | Status: Optimized | Floor Distribution: Floors 1, 2, 3  |
+-------------------------------------------------------------------------------------------------+
```

### 5.1 Cleaning Credit & Weighted Task Auto-Dispatcher
* **Yanolja Standard**: Housekeeping supervisor assigns rooms to attendants manually or via basic room count.
* **Our Advanced Implementation**:
  - **Credit-Based Allocation**:
    - Checkout Clean (Full Turn): `3.0 Credits` (45 mins)
    - Stayover Clean (Refresh): `1.5 Credits` (20 mins)
    - Suite / Villa Checkout: `5.0 Credits` (75 mins)
    - Deep Sanitization / Pet Room: `4.0 Credits` (60 mins)
  - **Geographic Floor Clustering**: Algorithm minimizes elevator travel by assigning contiguous blocks of rooms on the same floor to individual attendants up to their 8-hour shift capacity (typically 15-18 credits).

### 5.2 Housekeeper Mobile PWA & Minibar Direct-to-Folio Posting
* **Yanolja Standard**: Attendants carry printed room sheets, mark room status on paper, and submit minibar consumption slips to reception at end of shift.
* **Our Advanced Implementation**:
  - **Mobile Attendant Web-App**: Responsive mobile interface for smartphones/tablets. Attendant taps "Start Cleaning" (sets room status to *Cleaning in Progress* on Stay View), then "Complete" (sets room to *Vacant Clean* or *Inspected*).
  - **Minibar Digital Checklist**: Attendant checks inventory with one tap (e.g. 2x Heineken, 1x Pringles). System immediately posts the charge to the guest's active room folio with item description, attendant ID, and timestamp. Zero lost minibar revenue!
  - **Defect Photo Capture**: If TV is broken or faucet leaks, attendant snaps a photo on their phone, selects priority (Low/High/Urgent), and logs a maintenance ticket that instantly alerts engineering.

### 5.3 Preventive Maintenance & Asset Lifecycle
* **Yanolja Standard**: Manages basic Out of Order (OOO) and Out of Service (OOS) room blocks.
* **Our Advanced Implementation**:
  - **Preventive Maintenance Schedules**: Schedule recurring maintenance (e.g. AC Filter Clean every 60 days, Mattress Rotation every 90 days). System automatically blocks room for 4 hours during scheduled maintenance windows.
  - **Asset Registry**: Track serial numbers, installation dates, and warranty status for in-room assets (TV, Air Conditioner, Mini-Fridge, Electronic Safe, Smart Lock).

---

## 6. Topic 5: Autonomous Night Audit & Financial Day-End Roll

```
[23:59:00] Step 1: Pre-Audit Validation (0 pending check-ins, 0 pending check-outs, 0 unposted charges) -> PASS
[23:59:15] Step 2: Automated Room Charge Posting (84 Occupied Rooms) -> SUCCESS ($11,240.00 posted)
[23:59:30] Step 3: Tax & Service Charge Calculation (10% Service + 15% VAT + 1% City Tax) -> SUCCESS ($2,922.40 posted)
[23:59:45] Step 4: No-Show Auto-Processing (2 Tentative reservations charged 1-night penalty) -> SUCCESS ($240.00 posted)
[00:00:00] Step 5: Ledger Balancing (Guest Ledger + City Ledger + Deposit Ledger == General Ledger) -> RECONCILED
[00:00:15] Step 6: Automated Night Audit Package Email Dispatched (CEO, GM, Financial Controller) -> DISPATCHED
[00:00:30] Step 7: System Operating Date Advanced: 02/07/2026 -> 03/07/2026 -> COMPLETE
```

### 6.1 Pre-Audit Health Check Validation
* **Yanolja Standard**: Warns receptionist if guests are due in or due out before allowing night audit to run.
* **Our Advanced Implementation**:
  - **Interactive Checklist**:
    - *Due-In Arrivals*: Shows guests who haven't arrived. Options: Mark No-Show, Extend Reservation, Check-in Now.
    - *Due-Out Departures*: Shows guests who haven't checked out. Options: Check-Out, Extend Stay by 1 Night, Settle Folio.
    - *Unassigned Reservations*: Prevents room charge calculation failures by forcing room allocation.
    - *Open Cashier Shifts*: Ensures all daytime cashiers have closed and reconciled their shift drawers.

### 6.2 Autonomous Room Charge & Tax Posting Engine
* **Yanolja Standard**: Traverses all occupied rooms and posts daily room charge plus taxes based on assigned rate plan.
* **Our Advanced Implementation**:
  - **Package-Aware Revenue Breakdown**: If rate is CP ($120 including breakfast), system automatically splits:
    - `Room Revenue`: $100.00 -> Credit Account 4010
    - `F&B Breakfast Revenue`: $20.00 -> Credit Account 4020
    - `VAT on Room (15%)`: $15.00 -> Credit Account 2210
    - `VAT on F&B (15%)`: $3.00 -> Credit Account 2220
  - **Idempotency Guarantee**: Night audit engine cannot double-post charges even if run twice or interrupted by network drop.

### 6.3 Executive Automated Reporting Package
* **Yanolja Standard**: Generates PDF reports in the night audit tab.
* **Our Advanced Implementation**:
  - Automatically compile and email the **Executive Night Audit Dossier** at 00:05 AM to General Manager and Owner:
    1. **Manager's Flash Report**: Total Revenue, ADR (Average Daily Rate), RevPAR (Revenue Per Available Room), Occupancy %.
    2. **Trial Balance Summary**: Debits = Credits verification across all ledger accounts.
    3. **Room Revenue by Category**: Revenue distribution across Deluxe, Suite, Apartment rooms.
    4. **Audit Trail Exception Log**: All discounts > 10%, voided charges, and rate overrides executed during the day.

---

## 7. Topic 6: Point of Sale (POS) & Banquet Event Order (BEO) System

### 7.1 Real-Time "Charge to Room" with Signature Validation
* **Yanolja Standard**: Waiter in restaurant or spa enters room number and guest name; bill posts to folio.
* **Our Advanced Implementation**:
  - **Live Room Validation**: Checks in real-time:
    - Is Room 102 currently Occupied? (Rejects if Vacant or Checked Out).
    - Does guest name match in-house registration?
    - Does room have open credit privileges? (Rejects if guest is on "Cash-Only / No Room Charge" status).
    - Is balance within guest's credit limit?
  - **Digital Guest Signature on POS Terminal**: Guest signs on POS screen or waiter's tablet; signature image embeds directly into the folio ledger row.

### 7.2 Banquet Event Order (BEO) & Conference Hall Management
* **Yanolja Standard**: eZee BurrP! handles banquet halls, table layouts, and event billing.
* **Our Advanced Implementation**:
  - **Banquet Space Calendar**: Hour-by-hour scheduling for Ballrooms, Conference Rooms, Boardrooms, and Poolside Venues.
  - **Interactive BEO Builder**:
    - Event Header: Host Name, Company, Event Type (Wedding, Seminar, Gala Dinner), Guaranteed Pax vs Expected Pax.
    - Function Timing: Setup Time (08:00 AM), Event Start (10:00 AM), Lunch Break (01:00 PM), Teardown (06:00 PM).
    - Catering Menu: Per-person menu packages (Silver/Gold/Platinum), live counters, welcome drinks.
    - Equipment & AV: Projectors, LED Wall, Wireless Mics, Podium, Stage Lighting.
  - **One-Click Event Folio Generation**: Generates master event folio with advance deposit billing, milestone payments, and post-event settlement.

---

## 8. Topic 7: Hardware & Device Hub Integrations

```
+-------------------------------------------------------------------------------------------------+
|                                 PMS HARDWARE DEVICE HUB                                         |
|                                                                                                 |
|   [ RFID Keycard Encoder ]       [ Passport / ID Scanner ]         [ PBX Telephone System ]     |
|   - Protocol: Salto / VingCard   - Protocol: TWAIN / MRZ OCR       - Protocol: Mitel / Asterisk |
|   - Interface: WebUSB / TCP/IP   - Interface: WebHID / Native SDK  - Interface: TCP Socket 5038 |
|   - Status: Connected (Port 80)  - Status: Ready (MRZ v3)          - Status: Listening (Live)   |
|   - Function: 1-Click Encode     - Function: Auto-populate Profile - Function: Auto Call Billing|
+-------------------------------------------------------------------------------------------------+
```

### 8.1 Direct RFID Keycard Encoder Integration (Salto, VingCard, Onity)
* **Yanolja Standard**: Front desk runs a local desktop utility (`eZee Interface Server`) that translates PMS commands into RS-232/TCP socket commands for keycard encoders.
* **Our Advanced Implementation**:
  - **WebUSB / WebSocket Direct Bridge**: A lightweight background service (`hotel-device-bridge`) connecting directly to USB/LAN encoders without cumbersome third-party software.
  - **One-Click Key Encoding on Check-In**: When receptionist clicks "Check In", system automatically transmits Room Number, Check-In Date, Check-Out Date, and Sharer Count to the encoder. Encoder beeps and burns card in 1.2 seconds.
  - **Duplicate / Master / Maid Card Encoding**: Encode duplicate guest keys, temporary maintenance keys, or housekeeping floor master cards with customized validity hours.

### 8.2 Automated Passport & National ID Scanner (MRZ OCR)
* **Yanolja Standard**: Supports physical 3M/Desko passport readers via local drivers.
* **Our Advanced Implementation**:
  - **Cross-Platform MRZ Reader**: Supports standard USB document scanners via WebHID or high-resolution camera capture.
  - **Instant Parser**: Decodes Machine Readable Zone (MRZ lines 1 & 2) in 300ms, extracting:
    - Document Type (Passport, Visa, ID)
    - Issuing Country & Nationality
    - Full Name (Surname, Given Names)
    - Document Number & Expiry Date
    - Date of Birth & Gender
  - **C-Form / Foreigner Police Reporting**: Automatically formats scanned foreign guest data into regulatory immigration reports with one-click export.

### 8.3 PBX / IP-Telephony Call Accounting & Room Status Dialing
* **Yanolja Standard**: Connects to hotel PBX systems for call accounting and telephone maid status dialing.
* **Our Advanced Implementation**:
  - **Automated Call Billing**: Captures SMDR/CDR call records from IP-PBX (Asterisk, 3CX, Cisco, Mitel, Avaya) over TCP/IP socket and auto-posts call charges to room folio.
  - **Dial-in Room Status Codes**: Housekeeper dials `*21` from room telephone to mark room as Clean, `*22` for Inspected, `*99` for Minibar consumed ($10). System instantly reflects status on Stay View!

---

## 9. Topic 8: Enterprise Security, RBAC & Immutable Audit Trail

### 9.1 Granular Action-Level Permissions
* **Yanolja Standard**: User roles with module-level permissions (Can access Front Office, Can access Back Office).
* **Our Advanced Implementation**:
  - **Fine-Grained Capability Keys**:
    - `FOLIO_APPLY_DISCOUNT_PERCENT`: Max discount user can apply without supervisor PIN (e.g. Front Desk: 10%, Supervisor: 25%, GM: 100%).
    - `FOLIO_VOID_CHARGE`: Permission to void charges with mandatory reason code.
    - `FOLIO_TAX_EXEMPTION`: Permission to waive VAT/GST.
    - `ROOM_RATE_OVERRIDE`: Permission to manually change daily room tariff.
    - `ROOM_STATUS_FORCE_CLEAN`: Permission to override maintenance blocks.
    - `NIGHT_AUDIT_EXECUTE`: Restricted strictly to designated Night Auditors.

### 9.2 Cryptographic Immutable Audit Trail
* **Yanolja Standard**: Basic log of user actions stored in database.
* **Our Advanced Implementation**:
  - **Visual Before / After Diff Viewer**: Audit trail records previous state and new state in JSON format, rendered with GitHub-style visual diffs (green = added, red = removed).
  - **Immutable Append-Only Log**: Every sensitive action (Void, Discount, Rate Override, Room Move, Folio Split) is hashed with SHA-256 and chained to previous log entry to prevent database tampering.

---

## 10. Database Schema Additions (PostgreSQL Migration Blueprint)

To support these advanced enterprise capabilities, the following relational schemas are designed for addition to `server/src/database`:

```sql
-- 1. Folio Routing Rules Table
CREATE TABLE IF NOT EXISTS folio_routing_rules (
    id SERIAL PRIMARY KEY,
    reservation_id VARCHAR(100) NOT NULL REFERENCES reservations(id) ON DELETE CASCADE,
    source_folio_id INTEGER NOT NULL REFERENCES folios(id) ON DELETE CASCADE,
    target_folio_id INTEGER NOT NULL REFERENCES folios(id) ON DELETE CASCADE,
    routing_type VARCHAR(50) NOT NULL, -- 'ALL', 'ROOM_ONLY', 'TAX_ONLY', 'INCIDENTALS', 'CUSTOM'
    revenue_heads TEXT[] DEFAULT '{}', -- e.g. ARRAY['Restaurant', 'Minibar', 'Spa']
    charge_codes TEXT[] DEFAULT '{}',
    max_amount_limit NUMERIC(12,2) DEFAULT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_by VARCHAR(100) NOT NULL
);

-- 2. Digital Registration Cards & Guest Signatures
CREATE TABLE IF NOT EXISTS guest_registration_cards (
    id SERIAL PRIMARY KEY,
    reservation_id VARCHAR(100) NOT NULL REFERENCES reservations(id) ON DELETE CASCADE,
    guest_id VARCHAR(100) NOT NULL,
    terms_accepted BOOLEAN NOT NULL DEFAULT TRUE,
    id_document_type VARCHAR(50) NOT NULL, -- 'PASSPORT', 'NATIONAL_ID', 'DRIVING_LICENSE'
    id_document_number VARCHAR(100) NOT NULL,
    id_document_expiry DATE,
    id_document_scan_url TEXT,
    signature_vector_data TEXT NOT NULL, -- Base64 vector SVG or PNG canvas data
    signed_ip_address VARCHAR(45),
    signed_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    pdf_archive_url TEXT
);

-- 3. Housekeeping Task Credits & Assignments
CREATE TABLE IF NOT EXISTS housekeeping_tasks (
    id SERIAL PRIMARY KEY,
    property_id VARCHAR(100) NOT NULL,
    room_number VARCHAR(50) NOT NULL REFERENCES rooms(room_number) ON DELETE CASCADE,
    task_type VARCHAR(50) NOT NULL, -- 'CHECKOUT_CLEAN', 'STAYOVER_REFRESH', 'DEEP_SANITIZE', 'INSPECTION'
    credit_weight NUMERIC(4,2) NOT NULL DEFAULT 1.5,
    assigned_attendant_id VARCHAR(100),
    assigned_at TIMESTAMP WITH TIME ZONE,
    started_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    inspected_by VARCHAR(100),
    inspected_at TIMESTAMP WITH TIME ZONE,
    status VARCHAR(50) NOT NULL DEFAULT 'PENDING', -- 'PENDING', 'IN_PROGRESS', 'COMPLETED', 'INSPECTED'
    inspection_score INTEGER, -- 1 to 100
    notes TEXT
);

-- 4. Engineering Work Orders & Asset Maintenance
CREATE TABLE IF NOT EXISTS maintenance_work_orders (
    id SERIAL PRIMARY KEY,
    ticket_number VARCHAR(50) UNIQUE NOT NULL,
    property_id VARCHAR(100) NOT NULL,
    room_number VARCHAR(50),
    asset_name VARCHAR(100) NOT NULL, -- e.g. 'Daikin AC Unit 1.5 Ton'
    category VARCHAR(50) NOT NULL, -- 'PLUMBING', 'ELECTRICAL', 'HVAC', 'CARPENTRY', 'ELECTRONICS'
    priority VARCHAR(50) NOT NULL DEFAULT 'MEDIUM', -- 'LOW', 'MEDIUM', 'HIGH', 'CRITICAL'
    issue_description TEXT NOT NULL,
    photo_urls TEXT[] DEFAULT '{}',
    reported_by VARCHAR(100) NOT NULL,
    assigned_technician_id VARCHAR(100),
    status VARCHAR(50) NOT NULL DEFAULT 'OPEN', -- 'OPEN', 'IN_PROGRESS', 'ON_HOLD', 'RESOLVED', 'CLOSED'
    blocks_room BOOLEAN DEFAULT FALSE,
    resolved_at TIMESTAMP WITH TIME ZONE,
    resolution_notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 5. Banquet Event Orders (BEO) Table
CREATE TABLE IF NOT EXISTS banquet_event_orders (
    id SERIAL PRIMARY KEY,
    beo_number VARCHAR(50) UNIQUE NOT NULL,
    property_id VARCHAR(100) NOT NULL,
    function_hall_id VARCHAR(50) NOT NULL,
    client_name VARCHAR(150) NOT NULL,
    client_company VARCHAR(150),
    client_phone VARCHAR(50),
    client_email VARCHAR(100),
    event_name VARCHAR(150) NOT NULL,
    event_type VARCHAR(50) NOT NULL, -- 'WEDDING', 'CORPORATE_MEETING', 'SEMINAR', 'BIRTHDAY', 'EXHIBITION'
    event_date DATE NOT NULL,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    guaranteed_pax INTEGER NOT NULL,
    expected_pax INTEGER NOT NULL,
    seating_layout VARCHAR(50) NOT NULL, -- 'THEATER', 'CLASSROOM', 'ROUND_TABLE', 'U_SHAPED', 'BOARDROOM'
    per_pax_rate NUMERIC(10,2) NOT NULL,
    total_catering_charge NUMERIC(12,2) NOT NULL,
    hall_rental_charge NUMERIC(12,2) NOT NULL DEFAULT 0.00,
    av_equipment_charge NUMERIC(12,2) NOT NULL DEFAULT 0.00,
    total_event_cost NUMERIC(12,2) NOT NULL,
    deposit_paid NUMERIC(12,2) DEFAULT 0.00,
    status VARCHAR(50) NOT NULL DEFAULT 'CONFIRMED', -- 'INQUIRY', 'TENTATIVE', 'CONFIRMED', 'COMPLETED', 'CANCELLED'
    special_instructions TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 6. Hardware Keycard Encoder Profiles
CREATE TABLE IF NOT EXISTS keycard_encoder_profiles (
    id SERIAL PRIMARY KEY,
    property_id VARCHAR(100) NOT NULL,
    encoder_name VARCHAR(100) NOT NULL, -- e.g. 'Front Desk 1 - Salto RFID'
    manufacturer VARCHAR(50) NOT NULL, -- 'SALTO', 'VINGCARD', 'ONITY', 'DORMAKABA', 'BE_TECH'
    connection_type VARCHAR(50) NOT NULL, -- 'TCP_IP', 'USB', 'COM_PORT'
    ip_address VARCHAR(45),
    port INTEGER,
    building_code VARCHAR(20),
    is_active BOOLEAN DEFAULT TRUE,
    last_ping TIMESTAMP WITH TIME ZONE
);
```

---

## 11. Implementation Roadmap & Recommended Phase Rollout

```
+---------------------------------------------------------------------------------------------------------+
|                                    RECOMMENDED EXECUTION PHASES                                         |
+---------------------------------------------------------------------------------------------------------+
|                                                                                                         |
|  [PHASE 1: Immediate Sprint - High-Impact Front Office & Billing Enablers]                             |
|  * Rule-Based Auto-Routing Matrix (`folio_routing_rules` integration in RouteFolioModal)               |
|  * Stop Room Move (Lock Badge on Stay View & prevention prompt)                                         |
|  * Atomic Room Swap (Two-way room switch modal)                                                         |
|  * Advance Deposit Escrow Account & Auto-Application upon Check-In                                      |
|                                                                                                         |
|  [PHASE 2: Mid Sprint - Autonomous Operations & Housekeeping Mobility]                                 |
|  * Autonomous Night Audit Engine (Health Validator + Automated Room Charge/Tax Posting)                |
|  * Weighted Housekeeping Credit Dispatcher & Mobile Housekeeper PWA Screen                              |
|  * Direct-to-Folio Minibar & Laundry Barcode Posting                                                    |
|  * Preventive Maintenance Work Order Kanban                                                             |
|                                                                                                         |
|  [PHASE 3: Enterprise Integration - Hardware, CRM & Revenue Engine]                                    |
|  * Digital Registration Card (e-Reg Card) with HTML5 Canvas Signature & OCR Document Capture            |
|  * RFID Keycard Encoder Direct WebUSB/WebSocket Bridge                                                  |
|  * Banquet Event Order (BEO) Module & Function Space Booking                                            |
|  * Occupancy-Hurdle Dynamic Pricing & Restriction Engine (MLOS/CTA/CTD)                                  |
+---------------------------------------------------------------------------------------------------------+
```

---

## 12. Conclusion & Architectural Readiness

By implementing these prioritized capabilities, **HotelManagementOS** will not only match the global standard set by Yanolja Cloud Solution (eZee Absolute / Centrix / BurrP!) across all 8 operational domains, but will leapfrog traditional legacy PMS software with:
- **Instant Reactive UI**: React 18 + Tailwind single-line zero-wrap desktop performance.
- **Real-Time Synchronized State**: PostgreSQL + WebSockets ensuring zero stale data across front desk, mobile housekeepers, and managers.
- **Zero-Friction Front Office Workflows**: 1-click room swap, instant digital registration, and automated group charge transfers.
- **Enterprise Financial Integrity**: Strict void reasons, immutable before/after audit tracking, and automated night audit reconciliations.
