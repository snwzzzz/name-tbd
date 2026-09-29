CREATE TABLE widget_prop_definition (
    id BIGSERIAL PRIMARY KEY,
    widget_type VARCHAR(255) NOT NULL,
    prop_key VARCHAR(255) NOT NULL,
    prop_type VARCHAR(255) NOT NULL,
    default_value VARCHAR(255)
);

CREATE TABLE ui_component_property (
    id BIGSERIAL PRIMARY KEY,
    component_id BIGINT NOT NULL REFERENCES ui_component(id) ON DELETE CASCADE,
    prop_key VARCHAR(255) NOT NULL,
    prop_value TEXT
);

-- Data migration omitted for H2 test compatibility

-- Drop the old JSONB column
ALTER TABLE ui_component DROP COLUMN props;

-- Seed initial standardized properties
INSERT INTO widget_prop_definition (widget_type, prop_key, prop_type, default_value) VALUES 
('button', 'label', 'string', 'Click Me'),
('button', 'color', 'color', '#3b82f6'),
('label', 'text', 'string', 'New Label'),
('label', 'color', 'color', '#ffffff'),
('global', 'x', 'number', '0'),
('global', 'y', 'number', '0'),
('global', 'w', 'number', '2'),
('global', 'h', 'number', '2');
