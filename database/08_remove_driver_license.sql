-- Migration: Remove license_no field from drivers table
-- Run this in Supabase SQL Editor

-- ============================================
-- REMOVE LICENSE FIELD FROM DRIVERS TABLE
-- ============================================

ALTER TABLE drivers 
DROP COLUMN IF EXISTS license_no;

