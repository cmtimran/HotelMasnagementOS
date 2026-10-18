# Gap Analysis: HotelManagementOS Software Requirements Specification (SRS v2.0)
## Evaluation Against the Master Development Blueprint (v7.1) & IEEE 830 / ISO 29148 Standards

**Document Version:** 1.0  
**Evaluator:** Lead Systems Architect / Advanced Architecture Review  
**Target Document:** `Software_Requirements_Specification.md` (857 lines)  
**Benchmark Source:** `Channel_Manager_Development_Plan_v7.md` (9,547 lines, 121 sections)  
**Date:** October 2026  

---

## 1. Executive Summary

This Gap Analysis evaluates the current **HotelManagementOS Software Requirements Specification (SRS v2.0)** against the comprehensive 9,547-line master development blueprint (`Channel_Manager_Development_Plan_v7.md`) and international requirements standards (**IEEE Std 830-1998** / **ISO/IEC/IEEE 29148:2018**).

### High-Level Assessment
- **Current SRS Status:** The current SRS v2.0 successfully establishes the foundational IEEE structure, overarching microservices architecture, core functional definitions (FR-1 to FR-15), high-level C4 diagrams, and critical non-functional metrics.
- **Master Blueprint Scope:** The v7.1 blueprint is an exhaustive 121-section operational and implementation specification designed to allow engineers to code without any external reference documents.
- **Core Finding:** While the SRS v2.0 captures the **macro-architecture** and primary domain drivers (PMS, OTA Sync, Redlock Concurrency, ERP, HR, Compliance), there are significant **micro-specification gaps** in concrete database schemas, operational algorithms, specialized hospitality modules, integration wire protocols, error handling catalogs, and incident runbooks.

---

## 2. Quantitative Coverage Heatmap

| Architectural Dimension | Benchmark (v7.1 Blueprint) | Current SRS (v2.0) | Completeness Score | Gap Severity |
|:---|:---|:---|:---:|:---:|
| **1. Core PMS & Front Desk** | Complete check-in/out, room moves, key encoding, night audit | FR-2, FR-5, FR-6, FR-7 | **85%** | Low |
| **2. Concurrency & Overbooking** | Redlock + `SELECT FOR UPDATE` + Outbox + recovery | FR-4, BR-1, BR-2, App B.3 | **90%** | Low |
| **3. Channel Manager (OTA Sync)** | 10+ OTA adapters, XML schemas, ARI delta algorithm | FR-9, Int-OTA, App B | **65%** | Medium |
| **4. Central Calendar & ARI** | 90-day matrix, drag-select bulk, WebSocket live update | FR-3, UI-1.2, NFR-1.1 | **75%** | Low |
| **5. Multi-Outlet Retail & POS** | Framework + 10 outlet types (F&B, Spa, Gym, Laundry, etc.) | FR-11 | **45%** | High |
| **6. In-House ERP Accounting** | COA hierarchy, USALI schedules, AP 3-way match, Mushak 6.3 | FR-12, REG-1 | **60%** | Medium |
| **7. HR & Service Charge Payroll** | ATS, Biometric sync, 10% tip pool math, payslips, FnF | FR-13 | **55%** | Medium |
| **8. Specialized Hospitality Ops** | Concierge, Bell Desk, VIP, Walked Guest, BEO, SOPs, HACCP | Part XIV (Sec 102–116) | **20%** | Critical |
| **9. Database Schemas (DDL)** | 25+ detailed SQL tables with constraints, indexes, RLS | Sec 6.1 (Architecture only) | **30%** | Critical |
| **10. Algorithmic Pseudo-code** | 9 implementation algorithms with code (App L) | Conceptual descriptions | **25%** | Critical |
| **11. API & Event Catalog** | 100+ endpoints, 28 error codes, 19 domain events | 2 APIs, 2 Events | **20%** | Critical |
| **12. Hardware Integration Wire Specs** | VingCard/Salto RFID, ESC/POS sockets, ZKTeco biometrics | High-level interface table | **40%** | High |
| **13. SRE Runbooks & Operational DR** | 4 step-by-step incident runbooks, PITR recovery | NFR-3, DR-1 to DR-3 | **35%** | High |
| **14. Country Expansion Playbooks** | 10 country regulatory guides (BD, IN, UAE, KSA, MV, etc.) | BD & India specified | **30%** | Medium |
| **Overall Weighted Completeness** | **9,547 lines of operational depth** | **857 lines of baseline spec** | **48.2%** | **Substantial Expansion Required** |

---

## 3. Deep-Dive Gap Analysis Across 8 Core Dimensions

### Dimension 1: Specialized Hospitality Operations (Critical Gap)
The blueprint v7.1 establishes that a modern hotel operations platform cannot rely on generic PMS logic alone. The current SRS misses several specialized operational modules:
1. **Banquet & Conference Event Management (BEO - Section 80):**
   - *Missing in SRS:* Function Diary calendar, room block + hall combo bookings, setup styles (theater, classroom, U-shape), audiovisual equipment rental tracking, and multi-day wedding package milestone payments.
2. **Spa & Wellness Scheduling (Section 81):**
   - *Missing in SRS:* Slot-based therapist appointment calendar, therapist commission calculations, treatment room buffer sanitization times, and pre-treatment medical consultation forms.
3. **Retail Gift Shop & Attraction Ticketing (Sections 82 & 83):**
   - *Missing in SRS:* SKU barcode checkout, stock replenishment reorder alerts, time-slot visitor capacity, and gate QR-code scanning via mobile.
4. **Three-Tier Laundry Operations (Section 84):**
   - *Missing in SRS:* (1) Hotel linen internal wash cycles, (2) Outsourced vendor count and reconciliation vouchers, (3) Guest laundry garment tracking with express surcharges.
5. **Concierge, Bell Desk & Luggage Management (Section 102):**
   - *Missing in SRS:* Luggage check-in QR tagging, pre-arrival/post-departure baggage storage logs, and lost baggage compensation tracking.
6. **Walked Guest Overbooking Recovery Protocol (Section 116):**
   - *Missing in SRS:* Standard Operating Procedure for selecting who to walk when an overbooking occurs (e.g. flight delays, room damage), booking alternative partner hotels, transport compensation, and GM apology credit workflows.
7. **Owner & Investor Reporting Portal (Section 103):**
   - *Missing in SRS:* Multi-owner equity split, base management fee (3% of revenue) + incentive fee (10% of GOP), FF&E reserve (4%), and distribution waterfall statements.
8. **Brand Standards, SOPs & Quality Assurance (Section 104):**
   - *Missing in SRS:* Departmental SOP versioning, mandatory shift handover notes, and Forbes/Five-Star pre-audit checklists.
9. **Food Safety (HACCP) & Regulatory Compliance (Sections 105 & 106):**
   - *Missing in SRS:* Multi-time daily refrigeration temperature logs, kitchen allergen cross-contamination matrix, fire equipment logs, and state liquor excise bottle registers.

---

### Dimension 2: Database Schema & Data Dictionary (Critical Gap)
- **Current State:** The SRS v2.0 illustrates a high-level relational and in-memory architecture diagram in Section 6.1.
- **The Gap:** Software engineers cannot write migrations or entity code without concrete database table definitions.
- **Missing Specifications in SRS:**
  - Full PostgreSQL DDL for core business entities: `tenants`, `properties`, `users`, `user_property_roles`, `room_types`, `rooms`, `rate_plans`, `inventory_daily` (with date partitioning), `rate_daily`, `restrictions_daily`, `reservations`, `reservation_rooms`, `guests`, `folios`, `folio_postings`, `payments`, `channels`, `channel_mappings`, and `sync_jobs`.
  - Full DDL for ERP and retail tables: `chart_of_accounts`, `journal_entries`, `vendors`, `purchase_orders`, `employees`, `vehicles`, `trips`, `outlets`, and `outlet_orders`.
  - Column data types, exact check constraints (e.g. `departure_date > arrival_date`), unique compound keys, and foreign key cascade rules.

---

### Dimension 3: Algorithmic & Mathematical Specifications (Critical Gap)
- **Current State:** The SRS describes business rules conceptually (e.g., "enforce Redlock concurrency", "calculate 10% service charge tip distribution").
- **The Gap:** Developers need exact mathematical formulas, boundary conditions, and execution pseudo-code.
- **Missing Algorithms from Blueprint Appendix L:**
  1. **Algorithm L.1 (Overbooking-Safe Reservation Creation):** Step-by-step transaction flow combining Redis distributed lock, PostgreSQL `SELECT FOR UPDATE`, restriction validation, atomic decrement, and transactional outbox insertion.
  2. **Algorithm L.2 (ARI Delta Computation):** Fast hash comparison algorithm against Redis `hgetall` state cache to push only modified delta cells to OTAs.
  3. **Algorithm L.3 (Pricing & Tax Calculation):** Multi-line cascading tax computation (e.g., Bangladesh VAT 15% on base + 10% service charge; India GST 12%/18% rate slab thresholding).
  4. **Algorithm L.4 (Cancellation Tier Refund Calculation):** Date-difference hours computation and tiered penalty deduction.
  5. **Algorithm L.5 (Night Audit Execution Pipeline):** Sequential 6-step automated processing pipeline with idempotent error handling.
  6. **Algorithm L.6 (Booking Engine Availability Query):** Optimized single SQL query joining room types, daily inventory, rate plans, and restrictions with `HAVING MIN(available) > 0`.
  7. **Algorithm L.7 (Inventory Quote Hold):** 10-minute temporary block decrement and delayed RabbitMQ cleanup job.
  8. **Algorithm L.8 (Rate Parity Discrepancy Auditing):** Scraping/API comparison algorithm alerting on $\ge 2\%$ rate discrepancies between direct rates and OTAs.
  9. **Algorithm L.9 (Service Charge Tip Pool Allocation):** Formula allocating monthly collected service charges based on employee attendance and designation weighting points.

---

### Dimension 4: API & Event Catalog Completeness (Critical Gap)
- **Current State:** The SRS specifies 2 REST API endpoints (`POST /reservations`, `POST /reservations/{id}/check-in`) and 2 CloudEvent schemas (`reservation.created.v1`, `inventory.updated.v1`).
- **The Gap:** The v7.1 blueprint details over **100+ endpoints across 21 modules**, **28 HTTP error codes**, and **19 domain events**.
- **Missing Endpoint Specifications:**
  - `POST /properties/{id}/channels/{chId}/mappings` (Auto-discovery and manual OTA room mapping).
  - `POST /folios/{id}/postings` and `POST /folios/{id}/postings/{pId}/reverse` (Immutable posting and compensatory reversal).
  - `POST /night-audit/run` and `GET /night-audit/preview` (End-of-day execution).
  - `POST /pos/outlets/{id}/orders` and `POST /pos/orders/{id}/kot` (Restaurant table order and kitchen print dispatch).
  - `POST /front-desk/cashier/shifts/close` (Cash float variance reconciliation).
  - Standardized error catalog (`OVERBOOKING_PREVENTED`, `FOLIO_HAS_BALANCE`, `RESTRICTION_VIOLATED`, `IDEMPOTENCY_KEY_REUSED`, etc.).

---

### Dimension 5: Hardware & Peripheral Wire Protocols (High Gap)
- **Current State:** Section 3.2 lists hardware devices (ESC/POS printers, RFID encoders, ZKTeco terminals, barcode scanners) in summary format.
- **The Gap:** Integration engineers require explicit wire protocol details, payload formats, and communication channels:
  - **RFID Key Card Encoders:** VingCard Visionline TCP/IP socket interface, Salto Space API, Mifare 1K/4K sector mapping rules.
  - **Biometric Terminals:** ZKTeco standalone SDK TCP/IP listener (port 4370) and ESSL push API data structures for staff attendance punches.
  - **Thermal Kitchen Printers:** Raw network socket ESC/POS command strings (`GS V 66 0` cut commands, character codepages).
  - **OTA Payloads:** Exact Booking.com XML (`OTA_HotelAvailNotifRQ`) and Agoda YCS JSON message contracts.

---

### Dimension 6: Full In-House ERP Accounting Depth (Medium Gap)
- **Current State:** FR-12 specifies automated journal entries, USALI alignment, 3-way matching, and Mushak 6.3 / GST invoices.
- **The Gap:** Blueprint Section 92 specifies a **complete standalone accounting software replacement** (eliminating Tally/QuickBooks):
  - Standard 5-digit Chart of Accounts (COA) hierarchical template (1xxxx Assets, 2xxxx Liabilities, 3xxxx Equity, 4xxxx Revenue, 5xxxx Expenses).
  - Fixed Asset Register with straight-line and written-down value (WDV) depreciation calculation schedules.
  - Multi-entity legal company consolidation and inter-company elimination journals.
  - Bank statement reconciliation (MT940/CSV ingestion and automated transaction matching).

---

### Dimension 7: SRE Runbooks, Operational Failure Modes & DR (High Gap)
- **Current State:** Sections 5.3 and 6.3 define HA targets (99.95%), RPO ($\le 1\text{m}$), and RTO ($\le 15\text{m}$).
- **The Gap:** Blueprint Section 60 details actionable step-by-step SRE runbooks for production emergencies:
  - *Runbook 1: Channel Sync Error Spike:* Diagnosing credential expiration vs schema changes vs rate-limiting, and replaying dead-letter queues.
  - *Runbook 2: Overbooking Incident Resolution:* Triage, guest relocation to partner hotels, compensatory refund execution, and audit root-cause analysis.
  - *Runbook 3: Payment Gateway Outage:* Automatic failover to secondary merchant aggregators.
  - *Runbook 4: Offline Emergency Mode:* Front-desk operations during total property broadband failure.

---

### Dimension 8: Country-Specific Expansion Playbooks (Medium Gap)
- **Current State:** Bangladesh (Mushak 6.3, Special Branch) and India (GST, Form-C) are specified.
- **The Gap:** Blueprint Section 108 provides complete statutory, tax, and cultural rules for regional expansion:
  - *UAE / Dubai:* Tourism Dirham per room/night, DET registration, TADBEER reporting, Friday-Saturday weekend, and Ramadan F&B restrictions.
  - *Saudi Arabia:* ZATCA Phase-2 e-invoicing compliance, Absher reporting, and Hajj/Umrah seasonal pricing models.
  - *Maldives:* Green Tax ($12/night), Tourism GST (16%), and seaplane/speedboat transfer scheduling.
  - *Sri Lanka, Nepal, Indonesia, Thailand, Malaysia:* Local tourism levies, mandatory service charge laws, and police foreigner registration rules.

---

## 4. Prioritized Action Plan & Upgrade Recommendations

To evolve the SRS from its current high-level baseline (v2.0) into an **Exhaustive Enterprise Specification (v3.0)** that fully matches the 9,547-line master blueprint, the following phased upgrades are recommended:

### Phase 1: Algorithmic & Concurrency Rigor (Immediate Priority)
- [ ] Incorporate the full pseudo-code and boundary invariants from Appendix L for:
  - Overbooking-Safe Reservation Creation (`SELECT FOR UPDATE` + Redlock).
  - Night Audit 6-step sequential automated rollover.
  - Dynamic cascading tax and service charge calculations (Mushak 6.3 & GST).
  - 10-minute quote hold lifecycle with Redis TTL workers.

### Phase 2: Complete Relational Data Dictionary (DDL)
- [ ] Add an exhaustive Data Dictionary section detailing the full PostgreSQL DDL, data types, indexes, and constraints for all 25+ domain tables.
- [ ] Document table partitioning strategies for `inventory_daily`, `reservations`, and `folio_postings`.

### Phase 3: Specialized Hospitality Outlets Specification
- [ ] Expand FR-11 into dedicated functional sub-sections for:
  - Banquet & Conference Event Management (BEO & Function Diary).
  - Spa & Wellness Appointment Scheduling.
  - Three-tier Laundry Management (Linen, Outsourced, Guest).
  - Retail Gift Shop & Attraction QR Ticketing.
  - Walked Guest Overbooking Recovery SOP.

### Phase 4: API, Error Catalog & Hardware Protocol Expansion
- [ ] Document the top 30 critical REST API endpoint contracts across Front Desk, Folio Cashiering, Channel Mapping, and Night Audit.
- [ ] Formalize the 28-code HTTP error catalog.
- [ ] Specify hardware integration byte-level and socket protocols for VingCard/Salto RFID door locks and ZKTeco biometric terminals.

### Phase 5: Complete ERP Accounting & SRE Operational Runbooks
- [ ] Detail the 5-digit Chart of Accounts (COA) master and monthly depreciation schedules.
- [ ] Add the 4 core SRE Incident Response Runbooks for Channel Sync Failure, Overbooking Triage, Gateway Outage, and Offline Contingency.

---

## 5. Conclusion

The current SRS v2.0 represents a **solid architectural framework** conforming to IEEE 830 standards, with an accurate architectural paradigm and clear domain drivers. However, compared to the operational reality captured in the 9,547-line blueprint, the SRS is currently at **~48% operational completeness**.

Implementing the 5-phase expansion outlined above will transform the SRS into an authoritative, production-grade engineering master specification that completely eliminates architectural ambiguity for developers, QA engineers, and operations teams.
