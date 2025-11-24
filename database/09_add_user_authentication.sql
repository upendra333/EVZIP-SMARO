-- Migration: Add username and password authentication to users table
-- Run this in Supabase SQL Editor

-- ============================================
-- ADD USERNAME AND PASSWORD TO USERS TABLE
-- ============================================

-- Add username and password_hash columns
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS username VARCHAR(100) UNIQUE,
ADD COLUMN IF NOT EXISTS password_hash TEXT;

-- Create index on username for faster lookups
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);

-- Add comment to explain the fields
COMMENT ON COLUMN users.username IS 'Unique username for login';
COMMENT ON COLUMN users.password_hash IS 'Hashed password (use bcrypt or similar)';

-- ============================================
-- AUTHENTICATION FUNCTION
-- ============================================

-- Function to authenticate user by username and password
-- Note: In production, use proper password hashing (bcrypt, argon2, etc.)
CREATE OR REPLACE FUNCTION authenticate_user(
    p_username VARCHAR(100),
    p_password TEXT
)
RETURNS TABLE (
    user_id UUID,
    user_name VARCHAR(255),
    user_username VARCHAR(100),
    user_role VARCHAR(50),
    user_hub_id UUID,
    user_status VARCHAR(50)
) AS $$
DECLARE
    v_user users%ROWTYPE;
BEGIN
    -- Find user by username
    SELECT * INTO v_user
    FROM users
    WHERE users.username = p_username
    AND users.status = 'active';
    
    -- If user not found, return empty
    IF NOT FOUND THEN
        RETURN;
    END IF;
    
    -- For MVP: Simple password comparison (REPLACE WITH PROPER HASHING IN PRODUCTION!)
    -- In production, use: password_hash = crypt(p_password, password_hash)
    -- This requires pgcrypto extension: CREATE EXTENSION IF NOT EXISTS pgcrypto;
    IF v_user.password_hash IS NULL OR v_user.password_hash = '' THEN
        -- No password set, allow login (for initial setup)
        RETURN QUERY SELECT v_user.id, v_user.name, v_user.username, v_user.role, v_user.hub_id, v_user.status;
    ELSIF v_user.password_hash = p_password THEN
        -- Simple comparison for MVP (NOT SECURE - use proper hashing!)
        RETURN QUERY SELECT v_user.id, v_user.name, v_user.username, v_user.role, v_user.hub_id, v_user.status;
    END IF;
    
    -- Password doesn't match, return empty
    RETURN;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- UPDATE EXISTING USERS (OPTIONAL)
-- ============================================

-- You can set default usernames for existing users
-- UPDATE users SET username = LOWER(REPLACE(name, ' ', '_')) WHERE username IS NULL;

