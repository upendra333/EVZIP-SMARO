# EVZIP Ops Console - Step-by-Step Implementation Guide

This document provides a detailed, step-by-step process for building the EVZIP Ops Console PWA based on the Product Requirements Document.

---

## Pre-Development Setup

### Step 1: Project Initialization

1. **Create new Vite + React + TypeScript project**
   ```bash
   npm create vite@latest evzip-ops-console -- --template react-ts
   cd evzip-ops-console
   ```

2. **Install core dependencies**
   ```bash
   npm install react-router-dom @tanstack/react-query @supabase/supabase-js
   npm install tailwindcss postcss autoprefixer
   npm install @headlessui/react @radix-ui/react-dialog
   npm install papaparse
   npm install vite-plugin-pwa
   ```

3. **Configure Tailwind CSS**
   - Initialize Tailwind: `npx tailwindcss init -p`
   - Update `tailwind.config.js` with content paths
   - Add Tailwind directives to CSS file

4. **Set up environment variables**
   - Create `.env` file:
     ```
     VITE_SUPABASE_URL=your_supabase_url
     VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
     ```
   - Add `.env` to `.gitignore`

---

### Step 2: Supabase Database Setup

1. **Create Supabase project**
   - Go to supabase.com and create new project
   - Note down URL and anon key

2. **Create database tables** (from Section 6 of PRD)
   - `users` (id, name, email, phone, role, hub_id, status, created_at)
   - `roles` (id, name, permissions_json)
   - `hubs` (id, name, city, lat, lng)
   - `vehicles` (id, reg_no, make, model, seats, current_hub_id, status)
   - `drivers` (id, name, phone, license_no, status, hub_id)
   - `customers` (id, name, phone, email, notes)
   - `plans` (id, name, kind, price, days, min_km, per_km, direction)
   - `subscriptions` (id, customer_id, start_date, end_date, pickup, drop, distance_km, schedule_json, status)
   - `subscription_rides` (id, subscription_id, date, direction, driver_id, vehicle_id, est_km, actual_km, fare, status, notes)
   - `airport_bookings` (id, customer_id, flight_no, pickup_at, pickup, drop, est_km, fare, status, driver_id, vehicle_id, notes)
   - `rental_bookings` (id, customer_id, package_hours, package_km, start_at, end_at, est_km, extra_km_rate, per_hour_rate, fare, status, driver_id, vehicle_id, notes)
   - `trips` (id, type, ref_id, created_at, started_at, ended_at, cancel_reason, otp, status)
   - `payments` (id, customer_id, trip_id, method, txn_ref, amount, status, received_at)
   - `settlements` (id, driver_id, period_start, period_end, amount, status)
   - `rosters` (id, driver_id, shift_date, shift_start, shift_end, hub_id)
   - `audit_log` (id, actor_user_id, object, object_id, action, diff_json, at)

3. **Set up relationships and foreign keys**
   - Link all foreign key relationships
   - Add indexes on frequently queried columns

4. **Create database functions (RPCs)**
   - `today_metrics(hub_id, date)` - Returns dashboard metrics
   - `daily_summary(from_date, to_date, hub_id)` - Daily reports
   - `weekly_summary(from_date, to_date, hub_id)` - Weekly reports
   - `advance_trip_status(trip_id, new_status, actor_id)` - Status transitions
   - `validate_manager_pin(pin)` - Manager password validation

5. **Create triggers**
   - Overlap check for trips (prevent same vehicle/driver conflicts)
   - Auto-create audit_log entries on status changes

6. **Add seed data for testing**
   - Create sample hubs, drivers, vehicles
   - Add sample bookings for all three types

---

## Phase 1: Application Foundation

### Step 3: Layout Scaffolding

1. **Create folder structure**
   ```
   src/
     components/
       layout/
         Sidebar.tsx
         TopBar.tsx
         Footer.tsx
       shared/
         Drawer.tsx
         FiltersBar.tsx
         StatusBadge.tsx
     pages/
       Dashboard.tsx
       Subscriptions.tsx
       Airport.tsx
       Rentals.tsx
       Reports.tsx
       Imports.tsx
       Audit.tsx
     hooks/
       useSupabase.ts
       useOperator.ts
     utils/
       constants.ts
       types.ts
     lib/
       supabase.ts
   ```

2. **Build global layout**
   - Left sidebar with navigation:
     - Dashboard (Today)
     - Subscriptions
     - Airport
     - Rentals
     - Reports
     - Imports
     - Audit
   - Top bar with:
     - EVZIP logo + "Ops Console" text
     - Operator name/role display
     - "Switch operator" button
   - Footer: "EVZIP Mobility • ISO 9001:2015"
   - Content area for pages

3. **Set up React Router**
   - Configure routes for all pages
   - Set up navigation links

4. **Apply EVZIP branding**
   - Primary color: `#6dc7ae`
   - Text color: `#141339`
   - Update Tailwind config with brand colors

---

### Step 4: Supabase Client Setup

1. **Create Supabase client utility** (`src/lib/supabase.ts`)
   ```typescript
   import { createClient } from '@supabase/supabase-js'
   
   const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
   const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY
   
   export const supabase = createClient(supabaseUrl, supabaseAnonKey)
   ```

2. **Set up TanStack Query provider**
   - Wrap app with QueryClientProvider
   - Configure default query options

3. **Create custom hooks for data fetching**
   - `useTodayMetrics()` - Dashboard metrics
   - `useTrips()` - Fetch trips
   - `useSubscriptionRides()` - Fetch subscription rides
   - `useAirportBookings()` - Fetch airport bookings
   - `useRentalBookings()` - Fetch rental bookings

---

## Phase 2: Operator and Role Management

### Step 5: Operator Selection System

1. **Create operator selection modal** (first-time load)
   - Form with:
     - Operator name input
     - Role selector (supervisor/manager/read_only)
   - Show on app load if no operator stored

2. **Store in localStorage**
   - `operatorName` (string)
   - `role` (supervisor/manager/read_only)

3. **Create `useOperator` hook**
   - Manage operator state
   - Provide methods to get/set operator
   - Check role permissions

4. **Add "Switch operator" functionality**
   - Button in top bar
   - Opens operator selection modal
   - Updates localStorage and state

5. **Implement role-based UI visibility**
   - Hide/show buttons based on role
   - Disable actions for read-only users

---

### Step 6: Manager Password System

1. **Create manager password prompt component**
   - Modal/dialog for password entry
   - Show when manager action is attempted

2. **Store password in memory** (session only, not localStorage)
   - Use React state or context
   - Clear on page refresh

3. **Create `validate_manager_pin` RPC in Supabase**
   - Hash password in database
   - Return success/failure

4. **Gate protected actions**
   - Delete bookings
   - Price overrides after completion
   - Refund approvals
   - Cancellations with refund reason

---

## Phase 3: Dashboard (Today View)

### Step 7: Dashboard Metrics Cards

1. **Create 7 metric cards**
   - Active trips count
   - Due in next 60 minutes
   - Delayed trips
   - On-time percentage
   - Cancelled/No-show count
   - Total rides today
   - Total revenue today

2. **Wire to `today_metrics` RPC**
   - Call RPC on component mount
   - Handle loading and error states

3. **Make cards clickable**
   - Clicking a card filters the list below
   - Update filter state based on card clicked

---

### Step 8: Dashboard Trips List

1. **Create table component** with columns:
   - Start time
   - Type (subscription/airport/rental)
   - Hub/route
   - Customer
   - Driver
   - Vehicle
   - Status
   - Fare

2. **Add filters**
   - Type dropdown
   - Status dropdown
   - Hub dropdown
   - Driver dropdown
   - Vehicle dropdown

3. **Fetch today's trips**
   - Join `trips` with subscription_rides/airport_bookings/rental_bookings
   - Filter by today's date (local time)

4. **Implement row click**
   - Opens drawer with booking details
   - Use shared drawer component

5. **Add realtime subscription**
   - Subscribe to `trips` table changes
   - Update list automatically

---

## Phase 4: Shared Components

### Step 9: Booking Drawer Component

1. **Create reusable drawer component** (slides from right)
   - Use Headless UI or Radix Dialog
   - Animate slide-in from right

2. **Sections in drawer:**
   - **Booking details** (type-specific):
     - Subscription: Subscription ID, Plan, Customer, Pickup/Drop, Schedule
     - Airport: Flight number, Customer, Pickup/Drop, Est_km
     - Rental: Package info, Start/end times, Est_km
   - **Assignment:**
     - Driver dropdown (filtered by hub)
     - Vehicle dropdown (filtered by hub)
   - **Status changes:**
     - Current status display
     - Available transitions buttons
     - Cancel reason input (if cancelling)
   - **Notes field:**
     - Textarea for notes
   - **Timeline:**
     - Show status change history from audit_log

3. **Handle different booking types**
   - Conditional rendering based on type
   - Type-specific fields and actions

4. **Implement save functionality**
   - Update booking record
   - Create audit_log entry
   - Show success/error feedback

---

### Step 10: Filters Bar Component

1. **Create reusable filters component**
   - Horizontal bar above lists
   - Responsive design

2. **Filters to include:**
   - Date range picker
   - Type dropdown
   - Hub/route dropdown
   - Status dropdown
   - Vehicle dropdown
   - Driver dropdown
   - Customer search/select

3. **Make it work across all list pages**
   - Accept filter config as props
   - Emit filter changes to parent

4. **Store filter state**
   - Use URL params or local state
   - Persist across navigation

---

### Step 11: Status Management

1. **Create status badge component**
   - Color-coded badges for each status
   - Visual status indicators

2. **Implement status transition logic**
   - `created → assigned` (always allowed)
   - `assigned → enroute` (requires driver + vehicle)
   - `enroute → completed` or `no_show`
   - Any → `cancelled` (requires reason)

3. **Create `advance_trip_status` RPC call**
   - Validate transition
   - Update status
   - Return success/error

4. **Auto-create audit_log entries**
   - Trigger on status change
   - Store old_status, new_status, actor

---

### Step 12: Bulk Actions

1. **Add checkbox column to all lists**
   - Select individual rows
   - Select all checkbox in header

2. **Create sticky bottom bar**
   - Appears when rows are selected
   - Pinned to bottom of viewport

3. **Bulk actions:**
   - Assign driver (opens modal with driver select)
   - Assign vehicle (opens modal with vehicle select)
   - Update status (shows allowed transitions)

4. **Show only allowed transitions**
   - Filter based on selected rows' current statuses
   - Disable invalid actions

---

## Phase 5: Module Pages

### Step 13: Subscriptions Page (`/subscriptions`)

1. **Create list** with columns:
   - Date
   - Direction (to office / from office / both)
   - Customer name
   - Pickup
   - Drop
   - Distance (est_km or distance_km)
   - Driver
   - Vehicle
   - Status
   - Fare

2. **Add filters:**
   - Date range
   - Hub/route (based on pickup/drop/hub_id)
   - Status
   - Driver
   - Vehicle
   - Customer

3. **Implement drawer** with:
   - **Subscription details:**
     - Subscription ID
     - Plan (name, kind)
     - Customer info
     - Pickup/drop
     - Schedule JSON summary
   - **Ride instance** (`subscription_rides`):
     - Date
     - Direction
     - Est_km, actual_km
     - Fare (editable)
     - Status
     - Driver (select from drivers table filtered by hub)
     - Vehicle (select from vehicles table filtered by hub)
     - Notes

4. **Actions:**
   - Change status with allowed transitions
   - Assign or reassign driver/vehicle
   - Save notes
   - Manager-only:
     - Edit fare after completion (price override)
     - Cancel ride
     - Delete ride (soft delete flag, not hard delete)

5. **Wire to Supabase queries**
   - Fetch subscription_rides with joins
   - Implement mutations for updates

---

### Step 14: Airport Bookings Page (`/airport`)

1. **Create list** with columns:
   - Pickup_at (date/time)
   - Flight no
   - Customer
   - Pickup
   - Drop
   - Est_km
   - Driver
   - Vehicle
   - Status
   - Fare

2. **Add filters:**
   - Date range (by pickup_at)
   - Status
   - Driver
   - Vehicle
   - Customer
   - Hub

3. **Implement drawer** with:
   - **Booking details:**
     - Flight number
     - Customer details
     - Pickup/drop
     - Est_km
   - **Assignment:**
     - Driver
     - Vehicle
   - **Operations:**
     - Status changes
     - Fare (manual)
     - Notes
     - Timeline of status changes

4. **Highlight upcoming flights**
   - Show flights due in next 60 minutes
   - Visual indicator (badge or highlight)

5. **Wire to Supabase queries**
   - Fetch airport_bookings with joins
   - Implement mutations for updates

---

### Step 15: Rentals Page (`/rentals`)

1. **Create list** with columns:
   - Start_at
   - End_at
   - Package_hours
   - Package_km
   - Customer
   - Driver
   - Vehicle
   - Status
   - Fare

2. **Add filters:**
   - Date range
   - Status
   - Driver
   - Vehicle
   - Customer
   - Hub

3. **Implement drawer** with:
   - **Booking details:**
     - Package info: hours, km, extra_km_rate, per_hour_rate
     - Start/end times
     - Est_km
   - **Assignment:**
     - Driver
     - Vehicle
   - **Operations:**
     - Status changes
     - Fare (manual total, no auto calculation)
     - Notes
     - Timeline

4. **Wire to Supabase queries**
   - Fetch rental_bookings with joins
   - Implement mutations for updates

---

## Phase 6: Additional Features

### Step 16: Reports Page (`/reports`)

1. **Create two tabs:**
   - Daily Report
   - Weekly Report

2. **Daily report:**
   - **Inputs:**
     - Date picker
     - Hub selector (optional)
   - **Call `daily_summary` RPC**
   - **Display table:**
     - Date
     - Total rides
     - Total revenue
     - By type (subscription/airport/rental) – count and revenue

3. **Weekly report:**
   - **Inputs:**
     - Start date picker
     - End date picker
     - Hub selector (optional)
   - **Call `weekly_summary` RPC**
   - **Display aggregated data** in table format

4. **Add CSV export button**
   - Export current report view
   - Use PapaParse or similar

5. **Show totals at bottom**
   - Grand totals row
   - Summary statistics

---

### Step 17: Imports Page (`/imports`)

1. **Create CSV upload interface**
   - File input or drag-and-drop
   - Accept .csv files

2. **Target table selector:**
   - Dropdown with options:
     - subscription_rides
     - airport_bookings
     - rental_bookings
     - customers
     - drivers
     - vehicles

3. **Column mapping screen:**
   - **Left side:** CSV headers (from uploaded file)
   - **Right side:** Database fields (dropdowns)
   - Visual mapping interface
   - Mark required fields

4. **Preview section:**
   - Show first N rows (e.g., 10) with mapped columns
   - Display validation errors:
     - Missing required fields
     - Invalid dates
     - Invalid data types

5. **Confirm import:**
   - Insert via Supabase `insert`
   - Show summary:
     - Records inserted count
     - Errors list (row index, reason)
   - Allow retry for failed rows

---

### Step 18: Audit Log Page (`/audit`)

1. **Create list** with columns:
   - Timestamp
   - Actor (name)
   - Object (e.g. trips, airport_bookings)
   - Object ID
   - Action (create/update/delete/status_change/price_override)
   - Summary (short human text, e.g. "Status: assigned → enroute")

2. **Add filters:**
   - Date range
   - Actor dropdown
   - Object type dropdown
   - Action type dropdown

3. **Create details drawer:**
   - Display full `diff_json`
   - Pretty-print before/after state
   - Highlight changed fields

4. **Wire to `audit_log` table queries**
   - Fetch with pagination
   - Sort by timestamp (newest first)

---

## Phase 7: PWA and Polish

### Step 19: PWA Configuration

1. **Install and configure `vite-plugin-pwa`**
   ```bash
   npm install vite-plugin-pwa -D
   ```
   - Update `vite.config.ts` with plugin configuration

2. **Create manifest.json:**
   - Name: "EVZIP Ops Console"
   - Short name: "EVZIP Ops"
   - Theme color: `#6dc7ae`
   - Background color: `#141339`
   - Icons (generate from EVZIP logo):
     - 192x192
     - 512x512
     - Apple touch icon

3. **Set up service worker:**
   - Cache app shell
   - Basic offline support for viewing cached lists
   - Update strategy

4. **Test installability**
   - Desktop (Chrome, Edge)
   - Android (Chrome)
   - Verify install prompt appears

---

### Step 20: Realtime Updates

1. **Enable Supabase Realtime** on:
   - `trips` table
   - `subscription_rides` table
   - `airport_bookings` table
   - `rental_bookings` table

2. **Update lists automatically**
   - Subscribe to table changes
   - Update React Query cache
   - Show visual indicators for live updates

3. **Handle connection issues**
   - Show connection status
   - Reconnect automatically

---

### Step 21: Final Polish

1. **Apply EVZIP branding throughout**
   - Consistent color scheme
   - Logo placement
   - Typography

2. **Add loading states**
   - Skeleton loaders
   - Spinner components
   - Progress indicators

3. **Add error handling**
   - Error boundaries
   - User-friendly error messages
   - Retry mechanisms

4. **Optimize performance**
   - Lazy loading for routes
   - Pagination for large lists
   - Debounce search inputs
   - Memoize expensive computations

5. **Add keyboard shortcuts**
   - Common actions (e.g., Ctrl+S to save)
   - Navigation shortcuts

6. **Responsive design testing**
   - Mobile view
   - Tablet view
   - Desktop view

7. **Accessibility checks**
   - ARIA labels
   - Keyboard navigation
   - Screen reader compatibility
   - Color contrast

---

## Phase 8: Deployment

### Step 22: GitHub Setup

1. **Initialize git repository**
   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   ```

2. **Create `.gitignore`**
   ```
   node_modules/
   .env
   dist/
   .DS_Store
   *.log
   ```

3. **Push to GitHub repository**
   - Create new repo on GitHub
   - Add remote origin
   - Push code

---

### Step 23: Vercel Deployment

1. **Connect GitHub repo to Vercel**
   - Import project from GitHub
   - Select repository

2. **Configure build settings:**
   - Framework preset: Vite
   - Build command: `npm run build`
   - Output directory: `dist`
   - Install command: `npm install`

3. **Add environment variables:**
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`

4. **Create `vercel.json`** for SPA routing:
   ```json
   {
     "rewrites": [
       { "source": "/(.*)", "destination": "/" }
     ]
   }
   ```

5. **Deploy and test**
   - Trigger deployment
   - Test all routes work correctly
   - Verify environment variables are set
   - Test PWA installation

---

## Phase 9: Testing and Documentation

### Step 24: Testing

1. **Test all user journeys:**
   - ✅ Dashboard view and filtering
   - ✅ Assigning rides (all three types)
   - ✅ Status transitions
   - ✅ Manager actions with password
   - ✅ CSV imports
   - ✅ Reports generation
   - ✅ Audit log viewing

2. **Test role permissions:**
   - ✅ Supervisor can assign and update status
   - ✅ Manager can perform protected actions
   - ✅ Read-only cannot edit

3. **Test PWA:**
   - ✅ Installation works
   - ✅ Offline mode works
   - ✅ Service worker updates

4. **Cross-browser testing:**
   - ✅ Chrome
   - ✅ Firefox
   - ✅ Safari
   - ✅ Edge

---

### Step 25: Documentation

1. **Create README.md** with:
   - Project overview
   - Setup instructions
   - Environment variables
   - Database schema reference
   - Deployment guide
   - Development workflow

2. **Document RPC functions:**
   - Function signatures
   - Parameters
   - Return values
   - Usage examples

3. **Add code comments:**
   - Complex logic explanations
   - Component props documentation
   - Hook usage examples

---

## Summary Checklist

- [ ] Project initialized with Vite + React + TypeScript
- [ ] Supabase database schema created
- [ ] RPC functions implemented
- [ ] Layout and navigation built
- [ ] Operator/role system working
- [ ] Dashboard with metrics and list
- [ ] All three module pages (Subscriptions, Airport, Rentals)
- [ ] Reports page
- [ ] Imports page
- [ ] Audit log page
- [ ] Manager password protection
- [ ] PWA configured and working
- [ ] Deployed to Vercel
- [ ] Tested and documented

---

## Notes

- This is an MVP implementation - focus on core functionality first
- All money fields stored as integer (paise) or numeric
- No overlapping active trips for same vehicle/driver (enforced via trigger)
- All actions must create audit_log entries
- Manager password stored in memory (session only)
- Operator info stored in localStorage
- Realtime updates enabled on key tables
- PWA must be installable on desktop and Android

---

**Last Updated:** [Current Date]
**Version:** 1.0
**Status:** Ready for Implementation

