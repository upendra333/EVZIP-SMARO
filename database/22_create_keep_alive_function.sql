-- Keep Alive Function for Supabase Free Plan
-- This function is called periodically to prevent project from pausing
-- Run this in Supabase SQL Editor

CREATE OR REPLACE FUNCTION keep_alive()
RETURNS json AS $$
  SELECT json_build_object(
    'timestamp', NOW(),
    'status', 'active',
    'message', 'Supabase project is active'
  );
$$ LANGUAGE sql SECURITY DEFINER;

-- Grant execute permission to anon role
GRANT EXECUTE ON FUNCTION keep_alive() TO anon;

-- Optional: Add a comment
COMMENT ON FUNCTION keep_alive() IS 'Function to keep Supabase project active by preventing 7-day inactivity pause';

