-- Migration: Add additional fields to subscriptions table
-- Run this in Supabase SQL Editor

-- ============================================
-- ADD NEW FIELDS TO SUBSCRIPTIONS TABLE
-- ============================================

-- Client Name (stored directly for quick access, can also use customer relationship)
ALTER TABLE subscriptions 
ADD COLUMN IF NOT EXISTS client_name VARCHAR(255);

-- Client Mobile No (stored directly for quick access, can also use customer relationship)
ALTER TABLE subscriptions 
ADD COLUMN IF NOT EXISTS client_mobile VARCHAR(20);

-- Subscription Month & Year (stored explicitly)
ALTER TABLE subscriptions 
ADD COLUMN IF NOT EXISTS subscription_month INTEGER CHECK (subscription_month >= 1 AND subscription_month <= 12);

ALTER TABLE subscriptions 
ADD COLUMN IF NOT EXISTS subscription_year INTEGER CHECK (subscription_year >= 2000 AND subscription_year <= 2100);

-- No of Days (can be calculated but storing for quick access)
ALTER TABLE subscriptions 
ADD COLUMN IF NOT EXISTS no_of_days INTEGER CHECK (no_of_days > 0);

-- Pickup Location Time
ALTER TABLE subscriptions 
ADD COLUMN IF NOT EXISTS pickup_time TIME;

-- Subscription Amount in INR (stored in paise for consistency with other amounts)
ALTER TABLE subscriptions 
ADD COLUMN IF NOT EXISTS subscription_amount INTEGER CHECK (subscription_amount >= 0);

-- Subscription Amount Paid Date
ALTER TABLE subscriptions 
ADD COLUMN IF NOT EXISTS amount_paid_date DATE;

-- Subscription Amount Invoice No
ALTER TABLE subscriptions 
ADD COLUMN IF NOT EXISTS invoice_no VARCHAR(255);

-- Remarks
ALTER TABLE subscriptions 
ADD COLUMN IF NOT EXISTS remarks TEXT;

-- ============================================
-- POPULATE EXISTING DATA (if needed)
-- ============================================

-- Populate client_name and client_mobile from customers table
UPDATE subscriptions s
SET 
    client_name = c.name,
    client_mobile = c.phone
FROM customers c
WHERE s.customer_id = c.id 
  AND (s.client_name IS NULL OR s.client_mobile IS NULL);

-- Populate subscription_month and subscription_year from start_date
UPDATE subscriptions
SET 
    subscription_month = EXTRACT(MONTH FROM start_date)::INTEGER,
    subscription_year = EXTRACT(YEAR FROM start_date)::INTEGER
WHERE subscription_month IS NULL OR subscription_year IS NULL;

-- Calculate and populate no_of_days from start_date and end_date
UPDATE subscriptions
SET no_of_days = (end_date - start_date + 1)::INTEGER
WHERE end_date IS NOT NULL 
  AND (no_of_days IS NULL OR no_of_days = 0);

-- ============================================
-- CREATE INDEXES FOR PERFORMANCE
-- ============================================

CREATE INDEX IF NOT EXISTS idx_subscriptions_client_mobile ON subscriptions(client_mobile);
CREATE INDEX IF NOT EXISTS idx_subscriptions_month_year ON subscriptions(subscription_year, subscription_month);
CREATE INDEX IF NOT EXISTS idx_subscriptions_invoice_no ON subscriptions(invoice_no);
CREATE INDEX IF NOT EXISTS idx_subscriptions_amount_paid_date ON subscriptions(amount_paid_date);

-- ============================================
-- VERIFICATION QUERY
-- ============================================

-- View sample subscriptions with all new fields
SELECT 
    s.id,
    s.client_name,
    s.client_mobile,
    s.subscription_month,
    s.subscription_year,
    s.start_date AS subscription_date,
    s.no_of_days,
    s.distance_km AS total_kms,
    s.pickup AS pick_location,
    s.pickup_time AS pickup_location_time,
    s.drop AS drop_location,
    s.subscription_amount,
    s.amount_paid_date AS subscription_amount_paid_date,
    s.invoice_no AS subscription_amount_invoice_no,
    s.end_date AS subscription_validity_date,
    s.remarks,
    s.status,
    c.name AS customer_name_from_relation,
    c.phone AS customer_mobile_from_relation
FROM subscriptions s
LEFT JOIN customers c ON s.customer_id = c.id
ORDER BY s.created_at DESC
LIMIT 10;

