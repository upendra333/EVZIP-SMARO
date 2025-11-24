-- Migration: Create initial admin user
-- Run this in Supabase SQL Editor after running 09_add_user_authentication.sql

-- ============================================
-- CREATE INITIAL ADMIN USER
-- ============================================

-- Insert admin user
-- Replace 'admin' with your desired username
-- Replace 'admin123' with your desired password
-- Note: In production, passwords should be hashed. For MVP, storing as plain text.
INSERT INTO users (name, username, password_hash, role, status, email)
VALUES (
  'Admin User',
  'admin',
  'admin123',  -- Change this password!
  'admin',
  'active',
  'admin@evzip.com'  -- Optional: Update with your admin email
)
ON CONFLICT (username) DO NOTHING;

-- Verify the user was created
SELECT id, name, username, role, status, email, created_at
FROM users
WHERE username = 'admin';

