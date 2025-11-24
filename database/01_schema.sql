-- EVZIP Ops Console - Database Schema
-- Run this in Supabase SQL Editor

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Enable PostGIS if needed for location data (optional)
-- CREATE EXTENSION IF NOT EXISTS "postgis";

-- ============================================
-- CORE TABLES
-- ============================================

-- Hubs (locations/offices)
CREATE TABLE IF NOT EXISTS hubs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    city VARCHAR(100),
    lat DECIMAL(10, 8),
    lng DECIMAL(11, 8),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Roles (for future use)
CREATE TABLE IF NOT EXISTS roles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL UNIQUE,
    permissions_json JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Users (operators/supervisors/managers)
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255),
    phone VARCHAR(20),
    role VARCHAR(50) DEFAULT 'supervisor', -- supervisor, manager, read_only
    hub_id UUID REFERENCES hubs(id) ON DELETE SET NULL,
    status VARCHAR(50) DEFAULT 'active', -- active, inactive
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Vehicles
CREATE TABLE IF NOT EXISTS vehicles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    reg_no VARCHAR(50) NOT NULL UNIQUE,
    make VARCHAR(100),
    model VARCHAR(100),
    seats INTEGER DEFAULT 4,
    current_hub_id UUID REFERENCES hubs(id) ON DELETE SET NULL,
    status VARCHAR(50) DEFAULT 'available', -- available, assigned, maintenance, inactive
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Drivers
CREATE TABLE IF NOT EXISTS drivers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    phone VARCHAR(20) NOT NULL,
    license_no VARCHAR(100),
    status VARCHAR(50) DEFAULT 'active', -- active, inactive, on_leave
    hub_id UUID REFERENCES hubs(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Customers
CREATE TABLE IF NOT EXISTS customers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    phone VARCHAR(20),
    email VARCHAR(255),
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Plans (subscription plans)
CREATE TABLE IF NOT EXISTS plans (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    kind VARCHAR(50), -- monthly, quarterly, yearly, etc.
    price INTEGER NOT NULL, -- in paise
    days INTEGER,
    min_km INTEGER,
    per_km INTEGER, -- in paise per km
    direction VARCHAR(50), -- to_office, from_office, both
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Subscriptions
CREATE TABLE IF NOT EXISTS subscriptions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
    plan_id UUID REFERENCES plans(id) ON DELETE SET NULL,
    start_date DATE NOT NULL,
    end_date DATE,
    pickup TEXT NOT NULL,
    drop TEXT NOT NULL,
    distance_km DECIMAL(10, 2),
    schedule_json JSONB DEFAULT '{}'::jsonb, -- e.g., {"days": [1,2,3,4,5], "times": ["09:00", "18:00"]}
    status VARCHAR(50) DEFAULT 'active', -- active, paused, cancelled, expired
    hub_id UUID REFERENCES hubs(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Subscription Rides (individual ride instances)
CREATE TABLE IF NOT EXISTS subscription_rides (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    subscription_id UUID NOT NULL REFERENCES subscriptions(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    direction VARCHAR(50) NOT NULL, -- to_office, from_office
    driver_id UUID REFERENCES drivers(id) ON DELETE SET NULL,
    vehicle_id UUID REFERENCES vehicles(id) ON DELETE SET NULL,
    est_km DECIMAL(10, 2),
    actual_km DECIMAL(10, 2),
    fare INTEGER, -- in paise
    status VARCHAR(50) DEFAULT 'created', -- created, assigned, enroute, completed, no_show, cancelled
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    deleted_at TIMESTAMP WITH TIME ZONE, -- soft delete
    UNIQUE(subscription_id, date, direction)
);

-- Airport Bookings
CREATE TABLE IF NOT EXISTS airport_bookings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
    flight_no VARCHAR(50),
    pickup_at TIMESTAMP WITH TIME ZONE NOT NULL,
    pickup TEXT NOT NULL,
    drop TEXT NOT NULL,
    est_km DECIMAL(10, 2),
    fare INTEGER, -- in paise
    status VARCHAR(50) DEFAULT 'created', -- created, assigned, enroute, completed, no_show, cancelled
    driver_id UUID REFERENCES drivers(id) ON DELETE SET NULL,
    vehicle_id UUID REFERENCES vehicles(id) ON DELETE SET NULL,
    notes TEXT,
    hub_id UUID REFERENCES hubs(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    deleted_at TIMESTAMP WITH TIME ZONE -- soft delete
);

-- Rental Bookings
CREATE TABLE IF NOT EXISTS rental_bookings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
    package_hours INTEGER NOT NULL, -- 2, 4, 8 hours
    package_km INTEGER NOT NULL,
    start_at TIMESTAMP WITH TIME ZONE NOT NULL,
    end_at TIMESTAMP WITH TIME ZONE NOT NULL,
    est_km DECIMAL(10, 2),
    extra_km_rate INTEGER, -- in paise per km
    per_hour_rate INTEGER, -- in paise per hour
    fare INTEGER, -- in paise (total)
    status VARCHAR(50) DEFAULT 'created', -- created, assigned, enroute, completed, cancelled
    driver_id UUID REFERENCES drivers(id) ON DELETE SET NULL,
    vehicle_id UUID REFERENCES vehicles(id) ON DELETE SET NULL,
    notes TEXT,
    hub_id UUID REFERENCES hubs(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    deleted_at TIMESTAMP WITH TIME ZONE -- soft delete
);

-- Trips (unified trip tracking)
CREATE TABLE IF NOT EXISTS trips (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    type VARCHAR(50) NOT NULL CHECK (type IN ('subscription', 'airport', 'rental')),
    ref_id UUID NOT NULL, -- references subscription_rides.id, airport_bookings.id, or rental_bookings.id
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    started_at TIMESTAMP WITH TIME ZONE,
    ended_at TIMESTAMP WITH TIME ZONE,
    cancel_reason TEXT,
    otp VARCHAR(10),
    status VARCHAR(50) DEFAULT 'created' -- created, assigned, enroute, completed, no_show, cancelled
    -- Note: Referential integrity for ref_id is enforced via triggers in 03_triggers.sql
);

-- Payments
CREATE TABLE IF NOT EXISTS payments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
    trip_id UUID REFERENCES trips(id) ON DELETE SET NULL,
    method VARCHAR(50), -- cash, online, card, upi
    txn_ref VARCHAR(255),
    amount INTEGER NOT NULL, -- in paise
    status VARCHAR(50) DEFAULT 'pending', -- pending, completed, failed, refunded
    received_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Settlements (driver payments)
CREATE TABLE IF NOT EXISTS settlements (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    driver_id UUID NOT NULL REFERENCES drivers(id) ON DELETE CASCADE,
    period_start DATE NOT NULL,
    period_end DATE NOT NULL,
    amount INTEGER NOT NULL, -- in paise
    status VARCHAR(50) DEFAULT 'pending', -- pending, paid, cancelled
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Rosters (driver shifts)
CREATE TABLE IF NOT EXISTS rosters (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    driver_id UUID NOT NULL REFERENCES drivers(id) ON DELETE CASCADE,
    shift_date DATE NOT NULL,
    shift_start TIME NOT NULL,
    shift_end TIME NOT NULL,
    hub_id UUID REFERENCES hubs(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(driver_id, shift_date)
);

-- Audit Log
CREATE TABLE IF NOT EXISTS audit_log (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    actor_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    actor_name VARCHAR(255), -- stored for reference even if user deleted
    object VARCHAR(100) NOT NULL, -- table name: trips, subscription_rides, airport_bookings, etc.
    object_id UUID NOT NULL,
    action VARCHAR(50) NOT NULL, -- create, update, delete, status_change, price_override
    diff_json JSONB DEFAULT '{}'::jsonb, -- before/after state
    at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- INDEXES
-- ============================================

-- Trips indexes
CREATE INDEX IF NOT EXISTS idx_trips_type_ref ON trips(type, ref_id);
CREATE INDEX IF NOT EXISTS idx_trips_status ON trips(status);
CREATE INDEX IF NOT EXISTS idx_trips_created_at ON trips(created_at);

-- Subscription rides indexes
CREATE INDEX IF NOT EXISTS idx_subscription_rides_date ON subscription_rides(date);
CREATE INDEX IF NOT EXISTS idx_subscription_rides_status ON subscription_rides(status);
CREATE INDEX IF NOT EXISTS idx_subscription_rides_driver ON subscription_rides(driver_id);
CREATE INDEX IF NOT EXISTS idx_subscription_rides_vehicle ON subscription_rides(vehicle_id);

-- Airport bookings indexes
CREATE INDEX IF NOT EXISTS idx_airport_bookings_pickup_at ON airport_bookings(pickup_at);
CREATE INDEX IF NOT EXISTS idx_airport_bookings_status ON airport_bookings(status);
CREATE INDEX IF NOT EXISTS idx_airport_bookings_driver ON airport_bookings(driver_id);
CREATE INDEX IF NOT EXISTS idx_airport_bookings_vehicle ON airport_bookings(vehicle_id);

-- Rental bookings indexes
CREATE INDEX IF NOT EXISTS idx_rental_bookings_start_at ON rental_bookings(start_at);
CREATE INDEX IF NOT EXISTS idx_rental_bookings_status ON rental_bookings(status);
CREATE INDEX IF NOT EXISTS idx_rental_bookings_driver ON rental_bookings(driver_id);
CREATE INDEX IF NOT EXISTS idx_rental_bookings_vehicle ON rental_bookings(vehicle_id);

-- Audit log indexes
CREATE INDEX IF NOT EXISTS idx_audit_log_at ON audit_log(at);
CREATE INDEX IF NOT EXISTS idx_audit_log_object ON audit_log(object, object_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_actor ON audit_log(actor_user_id);

-- Drivers and vehicles by hub
CREATE INDEX IF NOT EXISTS idx_drivers_hub ON drivers(hub_id);
CREATE INDEX IF NOT EXISTS idx_vehicles_hub ON vehicles(current_hub_id);

-- ============================================
-- UPDATED_AT TRIGGERS
-- ============================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_hubs_updated_at BEFORE UPDATE ON hubs
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_vehicles_updated_at BEFORE UPDATE ON vehicles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_drivers_updated_at BEFORE UPDATE ON drivers
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_customers_updated_at BEFORE UPDATE ON customers
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_subscriptions_updated_at BEFORE UPDATE ON subscriptions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_subscription_rides_updated_at BEFORE UPDATE ON subscription_rides
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_airport_bookings_updated_at BEFORE UPDATE ON airport_bookings
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_rental_bookings_updated_at BEFORE UPDATE ON rental_bookings
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_settlements_updated_at BEFORE UPDATE ON settlements
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

