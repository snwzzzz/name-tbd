-- Whether a data table's rows can be selected several at a time (otherwise one at a time).
-- Rows are selected by clicking them while the page runs; workflow actions act on the selection.
INSERT INTO widget_prop_definition (widget_type, prop_key, prop_type, default_value, label, prop_group) VALUES
('table', 'multiSelect', 'boolean', 'false', 'Multi-select rows', 'Behavior');
