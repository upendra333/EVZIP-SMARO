-- Migration: Add pickup and drop columns to rental_bookings table
-- Run this in Supabase SQL Editor

-- ============================================
-- ADD PICKUP AND DROP COLUMNS TO RENTAL_BOOKINGS
-- ============================================

ALTER TABLE rental_bookings
ADD COLUMN IF NOT EXISTS pickup TEXT,
ADD COLUMN IF NOT EXISTS drop TEXT;

-- Make pickup and drop required (NOT NULL) for new records
-- Note: Existing records will have NULL values, but new records must have these fields
-- If you want to enforce NOT NULL immediately, you'll need to update existing records first

-- Optional: Update existing records with placeholder values if needed
-- UPDATE rental_bookings SET pickup = 'TBD', drop = 'TBD' WHERE pickup IS NULL OR drop IS NULL;

-- Add indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_rental_bookings_pickup ON rental_bookings(pickup);
CREATE INDEX IF NOT EXISTS idx_rental_bookings_drop ON rental_bookings(drop);

