-- A branch can have one layout page: its widgets (navbar, sidebar, ...) show on every other page
ALTER TABLE "page" ADD COLUMN is_layout BOOLEAN NOT NULL DEFAULT FALSE;

-- Navigation widgets. 'page' and 'pages' are prop types with their own editors in the frontend
-- (PROP_EDITORS); pages are stored as a JSON array of page ids.
INSERT INTO widget_prop_definition (widget_type, prop_key, prop_type, default_value, label, prop_group) VALUES
('link', 'text', 'string', 'Link', 'Text', 'Content'),
('link', 'pageId', 'page', '', 'Page', 'Target'),
('link', 'url', 'string', '', 'URL (when no page is picked)', 'Target'),
('link', 'newTab', 'boolean', 'false', 'Open in new tab', 'Target'),
('link', 'color', 'color', '#2f89ff', 'Color', 'Style'),
('nav', 'pages', 'pages', '[]', 'Pages', 'Links'),
('nav', 'vertical', 'boolean', 'false', 'Vertical', 'Style'),
('nav', 'highlightCurrent', 'boolean', 'true', 'Highlight current page', 'Style'),
('nav', 'color', 'color', '#1f1f1f', 'Color', 'Style');
