-- A nav menu's text and current-page colors now default to Auto (''): readable on its background.
-- Saved menus that still have the old defaults get Auto, so they adapt to their background too.
UPDATE ui_component_property SET prop_value = ''
WHERE prop_key = 'color' AND LOWER(prop_value) = '#242424'
  AND component_id IN (SELECT id FROM ui_component WHERE type = 'nav');
UPDATE ui_component_property SET prop_value = ''
WHERE prop_key = 'accentColor' AND LOWER(prop_value) = '#0f6cbd'
  AND component_id IN (SELECT id FROM ui_component WHERE type = 'nav');
