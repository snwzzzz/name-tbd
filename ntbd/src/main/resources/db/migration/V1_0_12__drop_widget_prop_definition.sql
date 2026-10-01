-- Widget settings now come from the widget catalog (shared/widget-catalog.json), which the
-- frontend and the backend both read; the table that held them (and its seeds) is gone.
DROP TABLE widget_prop_definition;
