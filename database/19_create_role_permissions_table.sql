-- Create role_permissions table to store custom permissions for each role
-- This allows dynamic permission management without code changes

CREATE TABLE IF NOT EXISTS role_permissions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    role VARCHAR(50) NOT NULL UNIQUE, -- 'read_only', 'supervisor', 'manager', 'admin'
    permissions JSONB NOT NULL DEFAULT '[]'::jsonb, -- Array of permission strings
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index on role for faster lookups
CREATE INDEX IF NOT EXISTS idx_role_permissions_role ON role_permissions(role);

-- Insert default permissions for each role (matching the hardcoded defaults)
-- Note: Admin gets all permissions, so we'll insert all available permissions
INSERT INTO role_permissions (role, permissions) VALUES
    ('read_only', '["view_dashboard"]'::jsonb),
    ('supervisor', '["view_dashboard","view_bookings","create_booking","edit_booking","assign_driver","assign_vehicle","update_status","update_timing","cancel_booking","view_reports","export_reports","view_analytics","view_customers","create_customer","edit_customer","view_drivers","view_vehicles","view_hubs","view_rides","view_subscriptions","view_imports","import_data","view_audit"]'::jsonb),
    ('manager', '["view_dashboard","view_bookings","create_booking","edit_booking","delete_booking","assign_driver","assign_vehicle","update_status","update_fare","update_timing","cancel_booking","view_reports","export_reports","view_analytics","view_customers","create_customer","edit_customer","delete_customer","view_drivers","create_driver","edit_driver","delete_driver","view_vehicles","create_vehicle","edit_vehicle","delete_vehicle","view_hubs","create_hub","edit_hub","delete_hub","view_rides","view_subscriptions","create_subscription","edit_subscription","delete_subscription","view_imports","import_data","view_audit"]'::jsonb),
    ('admin', '["view_dashboard","view_bookings","create_booking","edit_booking","delete_booking","assign_driver","assign_vehicle","update_status","update_fare","update_timing","cancel_booking","view_reports","export_reports","view_analytics","view_customers","create_customer","edit_customer","delete_customer","view_drivers","create_driver","edit_driver","delete_driver","view_vehicles","create_vehicle","edit_vehicle","delete_vehicle","view_hubs","create_hub","edit_hub","delete_hub","view_rides","edit_ride","delete_ride","view_subscriptions","create_subscription","edit_subscription","delete_subscription","view_imports","import_data","view_audit","view_users","create_user","edit_user","delete_user","manage_users","manage_roles","manage_permissions"]'::jsonb)
ON CONFLICT (role) DO NOTHING;

-- Create function to update role permissions
CREATE OR REPLACE FUNCTION update_role_permissions(
    p_role VARCHAR(50),
    p_permissions JSONB
)
RETURNS JSONB AS $$
DECLARE
    v_result JSONB;
BEGIN
    -- Ensure p_permissions is a JSONB array
    IF jsonb_typeof(p_permissions) != 'array' THEN
        RAISE EXCEPTION 'p_permissions must be a JSONB array';
    END IF;
    
    INSERT INTO role_permissions (role, permissions, updated_at)
    VALUES (p_role, p_permissions, NOW())
    ON CONFLICT (role) 
    DO UPDATE SET 
        permissions = p_permissions,
        updated_at = NOW();
    
    RETURN jsonb_build_object('success', true, 'role', p_role);
EXCEPTION
    WHEN OTHERS THEN
        RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$ LANGUAGE plpgsql;

-- Create function to get role permissions
CREATE OR REPLACE FUNCTION get_role_permissions(p_role VARCHAR(50))
RETURNS JSONB AS $$
DECLARE
    v_permissions JSONB;
BEGIN
    SELECT permissions INTO v_permissions
    FROM role_permissions
    WHERE role = p_role;
    
    RETURN COALESCE(v_permissions, '[]'::jsonb);
END;
$$ LANGUAGE plpgsql;

-- Create function to get all role permissions
CREATE OR REPLACE FUNCTION get_all_role_permissions()
RETURNS TABLE (
    role VARCHAR(50),
    permissions JSONB
) AS $$
BEGIN
    RETURN QUERY
    SELECT rp.role, rp.permissions
    FROM role_permissions rp
    ORDER BY 
        CASE rp.role
            WHEN 'read_only' THEN 1
            WHEN 'supervisor' THEN 2
            WHEN 'manager' THEN 3
            WHEN 'admin' THEN 4
            ELSE 5
        END;
END;
$$ LANGUAGE plpgsql;

