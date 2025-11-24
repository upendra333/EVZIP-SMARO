
# EVZIP Ops Console PWA – Product Requirements Document

## 1. Overview

EVZIP Ops Console is a supervisor-first web application to manage three ride types:

* Subscriptions (recurring commuters)
* Airport bookings (one-off scheduled rides)
* Rentals (2/4/8 hour packages)

This will be built as a PWA using React, Supabase (Postgres), and deployed via GitHub + Vercel.

MVP focus: a clean “Today” view, fast lists with filters, and simple assignment/status updates inside drawers. No heavy analytics in v1.

Branding: EVZIP colors and footer.

* Primary: `#6dc7ae`
* Text: `#141339`
* Footer text: `EVZIP Mobility • ISO 9001:2015`

---

## 2. Goals and Non-Goals

### Goals (MVP)

1. Give supervisors a “Today” screen with live view of rides and revenue.
2. Manage three ride modules in one UI:

   * Subscriptions
   * Airport bookings
   * Rentals
3. Let supervisors assign vehicles/drivers and update statuses quickly, without page reloads.
4. Offer basic CSV import and export.
5. Maintain an audit log of who changed what and when.
6. Support manager-only actions via a simple password, without full auth.

### Non-Goals (MVP)

* No customer-facing booking.
* No automatic pricing logic (all fares entered manually).
* No driver/customer mobile apps.
* No complex charts or BI dashboards.
* No full user auth system initially (Supabase Auth can come later).

---

## 3. Users and Roles

There is no login in v1. The app will ask for operator name and role locally. Manager actions gated by a password.

### Roles

1. Supervisor (Ops)

   * Can view all data.
   * Can assign vehicle/driver.
   * Can update trip statuses (except protected actions like delete, price override, refunds).
   * Can add notes.

2. Manager

   * Everything a Supervisor can do.
   * Can perform protected actions:

     * Delete bookings/trips.
     * Pricing overrides (editing fare after initial save).
     * Approve refunds.
     * Cancellations with refund reason.
   * Must enter a manager password once per session.

3. Read-only

   * Can view data and filters.
   * Cannot create, edit, assign, or delete.

---

## 4. Core Journeys

1. Supervisor opens /dashboard

   * Sees “Today” counts: Active trips, Due next 60 min, Delays, On-time %, Cancel/no-show, Total rides today, Total revenue today.
   * Clicks cards to filter the list below.

2. Assigning a subscription ride

   * Go to /subscriptions.
   * Filter by date/hub/route/status.
   * Click a row → drawer opens.
   * In drawer: pick driver, pick vehicle, update status to “assigned”, add notes.
   * App updates trip record and writes to audit log.

3. Airport booking handling

   * Go to /airport.
   * Filter by date range and hub.
   * Identify upcoming flights due in next 60 minutes.
   * Assign vehicle/driver, move to “enroute”, then “completed”.

4. Rental booking handling

   * Go to /rentals.
   * See all rental bookings with start/end times and packages.
   * Assign and track status: created → assigned → enroute → completed/cancelled.

5. Imports

   * Go to /imports.
   * Upload CSV (from Sheets).
   * Map columns visually and insert records into chosen table (e.g., subscription_rides).
   * Show success/failure rows.

6. Reports

   * Go to /reports.
   * Choose daily or weekly.
   * Select date range and hub.
   * View table of aggregated metrics.
   * Export CSV.

7. Audit

   * Go to /audit.
   * See list of actions (who, what, when, old vs new).
   * Filter by date, actor, object type.

---

## 5. Pages and Functional Requirements

### 5.1 Global Layout and Behaviour

* Left sidebar navigation:

  * Dashboard (Today)
  * Subscriptions
  * Airport
  * Rentals
  * Reports
  * Imports
  * Audit
* Top bar:

  * App title / logo (small EVZIP logo + “Ops Console” text)
  * Operator info (name, role)
  * Button to “Switch operator”
* Global fast filters (per list page):

  * Date range
  * Type (where applicable)
  * Hub/route
  * Status
  * Vehicle
  * Driver
  * Customer
* Booking drawer:

  * Slide-in from right.
  * Contains details, assignment, status changes, notes, timeline.
* Sticky bulk actions:

  * Checkbox per row.
  * Bulk bar pinned at bottom of list: Assign driver, Assign vehicle, Update status (for allowed transitions).

### 5.2 /dashboard – Today View

Route: `/`

Cards at top (for “today” relative to local time):

* Active trips count
* Due in next 60 minutes
* Delayed trips
* On-time percentage
* Cancelled / No-show count
* Total rides today
* Total revenue today

Below cards: a combined list of trips for today:

* Columns:

  * Start time
  * Type (subscription/airport/rental)
  * Hub/route
  * Customer
  * Driver
  * Vehicle
  * Status
  * Fare
* Filters:

  * Type
  * Status
  * Hub
  * Driver
  * Vehicle
* Row click → opens drawer (shared with module pages).

Data source:

* Metrics: Supabase RPC `today_metrics(hub_id, date)`
* List: `trips` joined with relevant type table (via `type` and `ref_id`).

### 5.3 /subscriptions

Route: `/subscriptions`

List:

* Columns:

  * Date
  * Direction (to office / from office / both)
  * Customer name
  * Pickup
  * Drop
  * Distance (est_km or distance_km)
  * Driver
  * Vehicle
  * Status
  * Fare
* Filters:

  * Date range
  * Hub/route (based on pickup/drop/hub_id)
  * Status
  * Driver
  * Vehicle
  * Customer

Drawer fields:

* Subscription details:

  * Subscription ID
  * Plan (name, kind)
  * Customer info
  * Pickup/drop
  * Schedule JSON summary
* Ride instance (`subscription_rides`):

  * Date
  * Direction
  * Est_km, actual_km
  * Fare (editable)
  * Status
  * Driver (select from drivers table filtered by hub)
  * Vehicle (select from vehicles table filtered by hub)
  * Notes

Actions:

* Change status with allowed transitions.
* Assign or reassign driver/vehicle.
* Save notes.
* Manager-only:

  * Edit fare after completion (price override).
  * Cancel ride.
  * Delete ride (soft delete flag, not hard delete).

Each action must create an audit_log entry.

### 5.4 /airport

Route: `/airport`

List:

* Columns:

  * Pickup_at (date/time)
  * Flight no
  * Customer
  * Pickup
  * Drop
  * Est_km
  * Driver
  * Vehicle
  * Status
  * Fare
* Filters:

  * Date range (by pickup_at)
  * Status
  * Driver
  * Vehicle
  * Customer
  * Hub

Drawer:

* Booking details:

  * Flight number
  * Customer details
  * Pickup/drop
  * Est_km
* Assignment:

  * Driver
  * Vehicle
* Operations:

  * Status changes
  * Fare (manual)
  * Notes
  * Timeline of status changes

### 5.5 /rentals

Route: `/rentals`

List:

* Columns:

  * Start_at
  * End_at
  * Package_hours
  * Package_km
  * Customer
  * Driver
  * Vehicle
  * Status
  * Fare
* Filters:

  * Date range
  * Status
  * Driver
  * Vehicle
  * Customer
  * Hub

Drawer:

* Booking details:

  * Package info: hours, km, extra_km_rate, per_hour_rate
  * Start/end times
  * Est_km
* Assignment:

  * Driver
  * Vehicle
* Operations:

  * Status changes
  * Fare (manual total, no auto calculation)
  * Notes
  * Timeline

### 5.6 /reports

Route: `/reports`

Two sub-tabs:

1. Daily report
2. Weekly report

Inputs:

* Date (for daily)
* Start date + end date (for weekly)
* Hub (optional)

Outputs in table:

* Date
* Total rides
* Total revenue
* By type (subscription/airport/rental) – count and revenue

Actions:

* Export CSV (current report view).
* Simple totals at bottom.

Data via views or RPC:

* `daily_summary(from_date, to_date, hub_id)`
* `weekly_summary(from_date, to_date, hub_id)`

### 5.7 /imports

Route: `/imports`

Functions:

1. Upload CSV

   * Choose target table:

     * subscription_rides
     * airport_bookings
     * rental_bookings
     * customers
     * drivers
     * vehicles
   * Parse CSV client-side (PapaParse).
   * Column mapping screen:

     * Left: CSV headers.
     * Right: database fields.

2. Preview

   * Show first N rows with mapped columns.
   * Show validation errors (missing required fields, invalid dates).

3. Confirm import

   * Insert via Supabase `insert`.
   * Show summary:

     * Records inserted.
     * Errors list (row index, reason).

### 5.8 /audit

Route: `/audit`

List:

* Columns:

  * Timestamp
  * Actor (name)
  * Object (e.g. trips, airport_bookings)
  * Object ID
  * Action (create/update/delete/status_change/price_override)
  * Summary (short human text, e.g. “Status: assigned → enroute”)

Details drawer:

* Full `diff_json` for before/after state (pretty-printed key changes).

Filters:

* Date range
* Actor
* Object
* Action type

---

## 6. Data Model (Postgres via Supabase)

Use the provided schema as base.

Tables (from spec):

* users(id, name, email, phone, role, hub_id, status, created_at)
* roles(id, name, permissions_json)
* hubs(id, name, city, lat, lng)
* vehicles(id, reg_no, make, model, seats, current_hub_id, status)
* drivers(id, name, phone, license_no, status, hub_id)
* customers(id, name, phone, email, notes)
* plans(id, name, kind, price, days, min_km, per_km, direction)
* subscriptions(id, customer_id, start_date, end_date, pickup, drop, distance_km, schedule_json, status)
* subscription_rides(id, subscription_id, date, direction, driver_id, vehicle_id, est_km, actual_km, fare, status, notes)
* airport_bookings(id, customer_id, flight_no, pickup_at, pickup, drop, est_km, fare, status, driver_id, vehicle_id, notes)
* rental_bookings(id, customer_id, package_hours, package_km, start_at, end_at, est_km, extra_km_rate, per_hour_rate, fare, status, driver_id, vehicle_id, notes)
* trips(id, type, ref_id, created_at, started_at, ended_at, cancel_reason, otp, status)
* payments(id, customer_id, trip_id, method, txn_ref, amount, status, received_at)
* settlements(id, driver_id, period_start, period_end, amount, status)
* rosters(id, driver_id, shift_date, shift_start, shift_end, hub_id)
* audit_log(id, actor_user_id, object, object_id, action, diff_json, at)

Key rules:

* `trips.type ∈ {subscription, airport, rental}`
* `trips.ref_id` points to the respective table primary key.
* No overlapping active trips for same vehicle/driver (enforced via trigger).
* All money fields stored as integer (paise) or numeric; entered manually in UI.

---

## 7. Status Model and Rules

Hard statuses:
`created → assigned → enroute → completed | no_show | cancelled`

Rules:

* `created` → `assigned`
  Allowed for all three types.

* `assigned` → `enroute`
  Only if driver_id and vehicle_id are set.

* `enroute` → `completed`
  Trip done.

* `enroute` → `no_show`
  Customer did not show.

* Any non-completed → `cancelled`
  Requires cancel_reason.

Additional:

* Overwrite fare allowed only:

  * In `created` or `assigned` without special checks.
  * After completion only for Manager with password.

All transitions written to `audit_log` with diff_json (old_status, new_status, actor).

---

## 8. Permissions

Front-end enforcement plus limited back-end checks.

Front-end:

* Role stored in localStorage after user picks:

  * `operatorName`
  * `role` (supervisor/manager/read_only)
* Manager password stored in memory (not localStorage) for session.

Back-end:

* Protected RPCs (e.g., `manager_actions`) require valid manager password, stored as hashed value in DB or Supabase config.
* Critical operations like price override and delete go through RPC, not direct table updates.

---

## 9. Tech Stack and Architecture

### Client

* React + Vite
* TypeScript (recommended)
* UI: Tailwind CSS + Headless UI/Radix for drawer, dialog, tabs
* Routing: `react-router-dom`
* Data fetching: TanStack Query
* CSV parsing: PapaParse
* PWA: `vite-plugin-pwa`

### Backend

* Supabase:

  * Postgres (schema above)
  * PostgREST for CRUD
  * Functions (RPC) for:

    * `today_metrics`
    * `daily_summary`
    * `weekly_summary`
    * `advance_trip_status`
    * `validate_manager_pin`
  * Realtime on `trips` and `*_bookings`/`subscription_rides` for live updates.

No separate Node backend in MVP.

### Deployment

* Code hosted on GitHub.
* Vercel for frontend:

  * Build: `npm run build`
  * Output: `dist`
* Environment variables:

  * `VITE_SUPABASE_URL`
  * `VITE_SUPABASE_ANON_KEY`
* `vercel.json` rewrite to support SPA routing:

```json
{
  "rewrites": [
    { "source": "/(.*)", "destination": "/" }
  ]
}
```

---

## 10. PWA Requirements

* Installable on desktop and Android.
* Manifest:

  * Name: EVZIP Ops Console
  * Short name: EVZIP Ops
  * Theme color: `#6dc7ae`
  * Background color: `#141339`
* Icons from EVZIP logo.
* Service worker:

  * Cache app shell.
  * Basic offline support for viewing previously loaded lists (full offline write sync can be later).

---

## 11. Implementation Plan (for Cursor)

Use this as high level roadmap inside Cursor tasks.

### Phase 1: Setup

* Initialise Vite + React + TS.
* Add Tailwind, React Router, TanStack Query, Supabase client.
* Configure Supabase env vars.
* Layout scaffolding:

  * Sidebar
  * Top bar
  * Content area
  * Footer with “EVZIP Mobility • ISO 9001:2015”.

### Phase 2: Data layer

* Set up Supabase tables (migrate schema).
* Implement RPC:

  * `today_metrics`
  * `advance_trip_status`
  * Overlap check trigger for trips.
* Add basic seed data for testing.

### Phase 3: Dashboard Today

* Build `/` route.
* Implement cards + list.
* Wire to Supabase queries + `today_metrics`.
* Add drawer with shared component.

### Phase 4: Module Pages

* `/subscriptions`:

  * List, filters, drawer actions.
* `/airport`:

  * List, filters, drawer actions.
* `/rentals`:

  * List, filters, drawer actions.
* Shared components:

  * Filters bar.
  * Booking drawer.
  * Status change UI.

### Phase 5: Reports, Imports, Audit

* `/reports`:

  * Use report RPC/views.
  * CSV export.
* `/imports`:

  * Upload, map, preview, insert.
* `/audit`:

  * List and drawer for diff_json.

### Phase 6: Roles, Manager Password, PWA

* Operator selection modal on first load.
* Manager password flow for protected actions.
* Add PWA plugin and manifest.
* Final polish with EVZIP brand colors.

---

If you want, next step I can turn this into a folder structure and first few Cursor tasks (like “Task 1: Scaffold Vite + Supabase + Layout”) so you can literally copy-paste them into Cursor and start building.



