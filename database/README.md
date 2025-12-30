# Database Setup Instructions

This directory contains SQL migration files for setting up the EVZIP Ops Console database in Supabase.

## Setup Order

Run these SQL files in Supabase SQL Editor in the following order:

1. **01_schema.sql** - Creates all tables, indexes, and basic triggers
2. **02_functions.sql** - Creates RPC functions (today_metrics, advance_trip_status, etc.)
3. **03_triggers.sql** - Creates advanced triggers (overlap checking, auto-create trips, etc.)
4. **04_seed_data.sql** - Inserts sample data for testing (optional)
5. **22_create_keep_alive_function.sql** - Creates keep_alive function for preventing Supabase project pause (for free plan)

## Steps

### 1. Create Supabase Project

1. Go to [supabase.com](https://supabase.com)
2. Create a new project
3. Note down your:
   - Project URL (e.g., `https://xxxxx.supabase.co`)
   - Anon/Public Key (found in Settings > API)

### 2. Run Migrations

1. Open Supabase Dashboard
2. Go to SQL Editor
3. Run each SQL file in order:
   - Copy contents of `01_schema.sql` → Run
   - Copy contents of `02_functions.sql` → Run
   - Copy contents of `03_triggers.sql` → Run
   - Copy contents of `04_seed_data.sql` → Run (optional, for testing)

### 3. Configure Environment Variables

Update your `.env` file in the project root:

```env
VITE_SUPABASE_URL=https://xxxxx.supabase.co
VITE_SUPABASE_ANON_KEY=your_anon_key_here
```

### 4. Enable Realtime (Optional but Recommended)

In Supabase Dashboard:
1. Go to Database → Replication
2. Enable replication for:
   - `trips`
   - `subscription_rides`
   - `airport_bookings`
   - `rental_bookings`

### 5. Set Row Level Security (RLS)

For MVP, you can disable RLS or set permissive policies. In production, configure proper RLS policies.

To disable RLS temporarily (for MVP testing):
```sql
ALTER TABLE trips DISABLE ROW LEVEL SECURITY;
ALTER TABLE subscription_rides DISABLE ROW LEVEL SECURITY;
ALTER TABLE airport_bookings DISABLE ROW LEVEL SECURITY;
ALTER TABLE rental_bookings DISABLE ROW LEVEL SECURITY;
-- Repeat for other tables as needed
```

## Important Notes

### Manager PIN

The default manager PIN is set to `manager123` in the seed data. **CHANGE THIS IN PRODUCTION!**

To update:
```sql
UPDATE app_config SET value = 'your_new_pin' WHERE key = 'manager_pin_hash';
```

**Note:** The current implementation uses simple string comparison. For production, implement proper password hashing (bcrypt, etc.).

### Money Fields

All money fields are stored as **integers in paise** (1 rupee = 100 paise).

Example:
- ₹500.00 = 50000 paise
- ₹1,250.50 = 125050 paise

### Status Values

Valid status values:
- `created` - Initial state
- `assigned` - Driver and vehicle assigned
- `enroute` - Trip in progress
- `completed` - Trip completed successfully
- `no_show` - Customer didn't show up
- `cancelled` - Trip cancelled

### Trip Types

Valid trip types:
- `subscription` - Links to `subscription_rides`
- `airport` - Links to `airport_bookings`
- `rental` - Links to `rental_bookings`

## Testing

After running seed data, you can test:

1. **Today Metrics:**
   ```sql
   SELECT * FROM today_metrics();
   ```

2. **Daily Summary:**
   ```sql
   SELECT * FROM daily_summary(CURRENT_DATE - 7, CURRENT_DATE);
   ```

3. **Status Change:**
   ```sql
   SELECT advance_trip_status(
     'trip_id_here'::uuid,
     'assigned',
     '90000000-0000-0000-0000-000000000001'::uuid,
     'Supervisor Test'
   );
   ```

4. **Manager PIN Validation:**
   ```sql
   SELECT validate_manager_pin('manager123'); -- Should return true
   ```

## Troubleshooting

### Overlap Check Errors

If you get overlap errors, ensure:
- Trips don't have the same driver/vehicle at overlapping times
- Status is set correctly (only 'assigned' and 'enroute' are checked)

### Missing Trips

Trips are auto-created by triggers when bookings are inserted. If trips are missing:
- Check that triggers are enabled
- Verify the booking was inserted successfully
- Check trigger logs in Supabase

### Function Errors

If RPC functions fail:
- Ensure all tables exist (run 01_schema.sql first)
- Check function permissions
- Verify data types match

## Keep Supabase Active (Free Plan)

To prevent your Supabase project from pausing after 7 days of inactivity:

1. **Run the keep-alive function:**
   - Execute `22_create_keep_alive_function.sql` in Supabase SQL Editor

2. **Set up GitHub Actions:**
   - Go to your GitHub repository → Settings → Secrets and variables → Actions
   - Add two secrets:
     - `SUPABASE_URL`: Your Supabase project URL (e.g., `https://xxxxx.supabase.co`)
     - `SUPABASE_ANON_KEY`: Your Supabase anon/public key (found in Settings > API)
   - The workflow (`.github/workflows/keep-supabase-active.yml`) will automatically run every 6 days

3. **Test the workflow:**
   - Go to Actions tab in GitHub
   - Find "Keep Supabase Active" workflow
   - Click "Run workflow" to test manually

## Next Steps

After database setup:
1. Configure environment variables in `.env`
2. Set up Supabase client in the app (see `src/lib/supabase.ts`)
3. Test connection from the frontend
4. Proceed with building the UI components
5. Set up GitHub Actions secrets for keep-alive (see above)

