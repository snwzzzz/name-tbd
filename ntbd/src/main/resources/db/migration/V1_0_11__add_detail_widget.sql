-- The detail section: shows one row (sent to it by a workflow's "Show row in detail" action) as
-- label/value pairs. Its data source is only used to pick and order the fields it shows.
INSERT INTO widget_prop_definition (widget_type, prop_key, prop_type, default_value, label, prop_group) VALUES
('detail', 'dataSourceId', 'dataSource', '', 'Data source (for its fields)', 'Data'),
('detail', 'columns', 'columns', '[]', 'Fields', 'Data'),
('detail', 'title', 'string', '', 'Title', 'Display'),
('detail', 'emptyText', 'string', 'Nothing selected yet.', 'Text when empty', 'Display');
