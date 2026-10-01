-- Friendly names for widget props in the properties panel, optionally grouped under a heading
ALTER TABLE widget_prop_definition ADD COLUMN label VARCHAR(255);
ALTER TABLE widget_prop_definition ADD COLUMN prop_group VARCHAR(255);

UPDATE widget_prop_definition SET label = 'Label' WHERE widget_type = 'button' AND prop_key = 'label';
UPDATE widget_prop_definition SET label = 'Color' WHERE widget_type = 'button' AND prop_key = 'color';
UPDATE widget_prop_definition SET label = 'Text' WHERE widget_type = 'label' AND prop_key = 'text';
UPDATE widget_prop_definition SET label = 'Color' WHERE widget_type = 'label' AND prop_key = 'color';
UPDATE widget_prop_definition SET label = 'X' WHERE widget_type = 'global' AND prop_key = 'x';
UPDATE widget_prop_definition SET label = 'Y' WHERE widget_type = 'global' AND prop_key = 'y';
UPDATE widget_prop_definition SET label = 'Width' WHERE widget_type = 'global' AND prop_key = 'w';
UPDATE widget_prop_definition SET label = 'Height' WHERE widget_type = 'global' AND prop_key = 'h';

-- The data table widget: shows (some columns of) a data source.
-- 'dataSource' and 'columns' are prop types with their own editors in the frontend (PROP_EDITORS);
-- columns are stored as a JSON array of column names, empty meaning all columns.
INSERT INTO widget_prop_definition (widget_type, prop_key, prop_type, default_value, label, prop_group) VALUES
('table', 'dataSourceId', 'dataSource', '', 'Data source', 'Data'),
('table', 'columns', 'columns', '[]', 'Columns', 'Data'),
('table', 'title', 'string', '', 'Title', 'Display'),
('table', 'maxRows', 'number', '10', 'Max rows', 'Display'),
('table', 'showHeader', 'boolean', 'true', 'Show header', 'Display'),
('table', 'striped', 'boolean', 'false', 'Striped rows', 'Display');
