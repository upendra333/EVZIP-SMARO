-- Migration: Add function to change user password
-- Run this in Supabase SQL Editor

-- ============================================
-- CHANGE PASSWORD FUNCTION
-- ============================================

-- Function to change user password
-- For users changing their own password: requires old password verification
-- For admins resetting password: no old password required
CREATE OR REPLACE FUNCTION change_user_password(
    p_user_id UUID,
    p_new_password TEXT,
    p_old_password TEXT DEFAULT NULL,
    p_require_old_password BOOLEAN DEFAULT true
)
RETURNS JSONB AS $$
DECLARE
    v_user users%ROWTYPE;
    v_result JSONB;
BEGIN
    -- Find user by ID
    SELECT * INTO v_user
    FROM users
    WHERE users.id = p_user_id;
    
    -- If user not found, return error
    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'User not found');
    END IF;
    
    -- If old password is required, verify it
    IF p_require_old_password AND p_old_password IS NOT NULL THEN
        -- For MVP: Simple password comparison (REPLACE WITH PROPER HASHING IN PRODUCTION!)
        IF v_user.password_hash IS NULL OR v_user.password_hash = '' THEN
            -- No password set, allow change
        ELSIF v_user.password_hash != p_old_password THEN
            -- Old password doesn't match
            RETURN jsonb_build_object('success', false, 'error', 'Current password is incorrect');
        END IF;
    END IF;
    
    -- Update password
    -- For MVP: Store password as plain text (REPLACE WITH PROPER HASHING IN PRODUCTION!)
    UPDATE users
    SET password_hash = p_new_password,
        updated_at = NOW()
    WHERE id = p_user_id;
    
    RETURN jsonb_build_object('success', true, 'message', 'Password changed successfully');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

