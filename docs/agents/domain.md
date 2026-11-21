# Domain Architecture & Layout

- **Layout Model:** Single-Context Architecture
- **Root Context File:** `CONTEXT.md`
- **Architectural Decision Records (ADR):** `docs/adr/`
- **Core Domain Entities:**
  - Property & Multi-Tenant Organization (`organizations`, `properties`, `central_tenants`)
  - Inventory & Rooms (`room_types`, `rooms`, `floors`, `buildings`, `connecting_rooms`)
  - Reservations & Stays (`reservations`, `reservation_rooms`, `room_stay_splits`)
  - Front Desk & Cashiering (`folios`, `folio_charges`, `payments`, `folio_audit_trail`)
  - General Ledger Accounting (`chart_of_accounts`, `journal_entries`, `journal_lines`)
  - Housekeeping & Maintenance (`housekeeping_tasks`, `maintenance_orders`, `lost_and_found`)
  - Channel Manager & ARI Distribution (`channel_connections`, `channel_room_mappings`, `channel_bookings`)
  - Guest Experience & Omnichannel (`guests`, `cx_conversations`, `cx_messages`, `cx_guest_journeys`)
