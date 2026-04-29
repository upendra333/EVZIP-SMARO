-- Shared ride hailing source config (used across all users/roles)

CREATE TABLE IF NOT EXISTS ride_hailing_source_config (
    id SMALLINT PRIMARY KEY CHECK (id = 1),
    column_map JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

INSERT INTO ride_hailing_source_config (id, column_map)
VALUES (1, '{}'::jsonb)
ON CONFLICT (id) DO NOTHING;

CREATE OR REPLACE FUNCTION get_ride_hailing_column_map()
RETURNS JSONB AS $$
DECLARE
    v_map JSONB;
BEGIN
    SELECT column_map
    INTO v_map
    FROM ride_hailing_source_config
    WHERE id = 1;

    RETURN COALESCE(v_map, '{}'::jsonb);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION update_ride_hailing_column_map(p_column_map JSONB)
RETURNS JSONB AS $$
BEGIN
    IF jsonb_typeof(p_column_map) != 'object' THEN
        RAISE EXCEPTION 'p_column_map must be a JSON object';
    END IF;

    INSERT INTO ride_hailing_source_config (id, column_map, updated_at)
    VALUES (1, p_column_map, NOW())
    ON CONFLICT (id)
    DO UPDATE SET
        column_map = p_column_map,
        updated_at = NOW();

    RETURN jsonb_build_object('success', true);
EXCEPTION
    WHEN OTHERS THEN
        RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION get_ride_hailing_column_map() TO anon, authenticated;
GRANT EXECUTE ON FUNCTION update_ride_hailing_column_map(JSONB) TO anon, authenticated;
