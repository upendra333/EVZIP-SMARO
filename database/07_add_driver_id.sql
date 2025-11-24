-- Migration: Add driver_id field to drivers table
-- Run this in Supabase SQL Editor

-- ============================================
-- ADD DRIVER ID FIELD TO DRIVERS TABLE
-- ============================================

ALTER TABLE drivers 
ADD COLUMN IF NOT EXISTS driver_id VARCHAR(100);

-- Add comment to explain the field
COMMENT ON COLUMN drivers.driver_id IS 'Unique driver identification number/code';

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_drivers_driver_id ON drivers(driver_id);

