# WingsCRM / HotelOS Reference Screens & UI Architecture

This directory contains the reference UI screenshots provided by the client, renamed meaningfully according to their exact function in the Hotel Management OS:

## 1. Sidebar Modal & Action Drawers
- `01-add-payment-modal.png`: **Add Payment** modal panel (Folio selection, Payment method selector with `+ Add`, Payment summary breakdown, Payment remarks textarea, Cancel & Save Payment buttons).
- `02-room-split-modal.png`: **Room Split** modal panel (New room assignment, room/guest selector, from/to dates, room type & rate type, `+ Add Room`, Cancel & Save Room Split buttons).
- `03-stop-room-move-modal.png`: **Stop Room Move** modal panel (Action description, `Allow room move` checkbox, Cancel & Submit buttons).
- `04-add-new-booking-modal.png`: **Add New Booking** modal panel (Owner Folio, Group Owner, Cancel & Proceed to Full Form buttons).
- `05-void-reservation-modal.png`: **Void Reservation** modal panel (Apply changes on group vs selected reservations, reason for voiding textarea, Cancel & Confirm Void red button).
- `06-ungroup-reservation-modal.png`: **Ungroup Reservation** modal panel (Group / selected reservations selection, Cancel & Confirm Ungroup buttons).
- `07-change-group-owner-modal.png`: **Change Group Owner** modal panel (Select new group owner dropdown, group-level update notice, Cancel & Confirm Change buttons).
- `08-cancel-reservation-modal.png`: **Cancel Reservation** modal panel (Cancellation type full vs room, cancellation fee, refund amount, cancellation reason, Cancel & Confirm Cancellation buttons).
- `09-reservation-hold-modal.png`: **Reservation Hold** modal panel (Hold start date, hold end date, hold reason, Cancel & Confirm Hold buttons).
- `10-unassign-room-modal.png`: **Unassign Room** modal panel (Select room to unassign, Cancel & Submit buttons).
- `11-options-dropdown-menu.png`: **Options ∨ Dropdown Menu** (9 options list: Add Payment, Amend Stay, Room Move, Room Split, Stop Room Move, Add New Booking, Cancel Reservation, Reservation Hold, Unassign).
- `12-amend-stay-extend-modal.png`: **Amend Stay / Extend** modal panel (Room checkbox, arrival & departure dates, nights selector, Cancel & Save Changes buttons).
- `13-room-move-modal.png`: **Room Move** modal panel (Room assignment, dates, room type, rate type, room selector, Cancel & Save Room Move buttons).
- `14-reservation-details-drawer.png`: **Reservation Details Drawer** (Compact single-column overview cards with room net balance highlight).

## 2. Stay View & Timeline Grid
- `15-stayview-options-button-header.png`: Header bar layout with `[Edit]` and `[Options ∨]` action buttons.
- `16-stayview-indicators-and-grid.png`: Timeline reservation bars with 4 key indicators (Group Owner crown, Group Booking people icon, Payment Due dollar icon, VIP/Single Lady star icon).
- `17-floorwise-room-count-badges.png`: Floor-wise Available (green), Assigned (blue), and Unassigned (red) status counters.
- `18-assign-rooms-slim-sidebar.png`: Compact & slim Assign Rooms right-side drawer.
- `19-add-reservation-compact-design.png`: Add Reservation page compact layout.
- `20-stayview-timeline-grid.png`: Stay View timeline room tree & day columns.
- `21-system-date-setting-bar.png`: System operating date setting bar.
- `22-stayview-top-toolbar.png`: Top toolbar with quick jump, search, filters.
- `23-room-types-and-occupancy-summary.png`: Occupancy % and room type breakdown summary.
- `24-extend-reservation-prompt.png`: Drag-to-extend interaction on timeline.
- `25-drag-extend-stayview.png`: Dragging timeline reservation handle to extend/shorten nights.
- `26-assign-rooms-header-gap.png`: Assign Rooms drawer header spacing.
- `27-assign-rooms-drawer-reference.png`: Full Assign Rooms drawer reference.
- `28-stayview-15-days-overflow-and-icon-cutoff.png`: 15 days window width overflow & icon clipping reference.
- `29-stayview-backdates-today-holidays-marking.png`: Distinct markings for Today (blue), Backdates/Past dates (grey background, audit locked read-only), and Weekends/Holidays (red/pink headers and cell washes).
- `30-add-reservation-stepper-and-check-availability-box.png`: Add Reservation 3-step wizard bar and check availability parameters box optimization reference.
- `31-single-date-range-picker-checkin-checkout-nights.png`: Consolidated single Date Range / Stay Period selector request for Check-in, Nights, and Check-out across Add Reservation and Quick Reservation.
- `32-interactive-date-range-calendar-picker.png`: Visual Interactive Month Calendar Date Range Picker showing Check-in (solid blue left pill), duration stay days (shaded background), and Check-out (solid blue right pill).
- `33-calendar-compact-backdate-restriction-default-date-bug.png`: Feedback screen showing calendar cutoff on screen, check-in blank input format issue (`mm/dd/yyyy`), default system date (01 Jul 2026) requirement, checkout default 1 night later (02 Jul 2026), and backdate booking prevention.
- `34-room-count-total-rooms-and-nights-calculation-bug.png`: Discrepancy where top `ROOM(S)` showed 3 while table row rooms were 1 + 2 + 1 = 4, along with nights calculation (`1N` while checkin was blank `mm/dd/yyyy` and checkout was `07/01/2026`).
- `35-native-browser-datepicker-overlapping-custom-calendar.png`: Browser native HTML5 datepicker popover popping up simultaneously and overlapping with our custom visual Range Calendar picker.
- `36-assign-auto-room-allocation-and-room-dropdown-select.png`: Room column should normally be a `<select>` dropdown of available rooms; when the `Assign` checkbox is checked, the Room selector becomes disabled (Auto-Assign on reservation save), and when unchecked, front desk can manually select a specific room.
- `37-child-age-popover-cutoff-and-add-room-button-placement.png`: Children & Ages floating popover getting clipped by the table container's `overflow-hidden` / `overflow-x-auto`, and request to position `+ Add Room` button lower with better breathing room.
- `38-duplicate-room-allocation-auto-assign-clash.png`: Both rows in table showing `Auto (102)` instead of unique auto-allocated room numbers (`Auto (101)`, `Auto (102)`, `Auto (201)` etc.).
- `39-calendar-popover-cutoff-at-screen-bottom-in-quick-reservation-modal.png`: Calendar popover in Quick Reservation modal jumping down to the bottom edge of the screen and getting cut off due to `position: fixed` relative to transformed modal container.
- `40-calendar-popover-cutoff-at-bottom-in-add-reservation.png`: Calendar popover in Add Reservation page jumping down to bottom-left corner and getting cut off below the viewport.
- `41-horizontal-scrollbar-in-rooms-table-of-quick-reservation-modal.png`: Horizontal scrollbar appearing across the Rooms table in Quick Reservation modal on Windows viewports.
