-- Applications get an app-wide theme (shared/app-themes.json), as JSON; null: the default preset.
ALTER TABLE "application" ADD COLUMN theme TEXT;

-- Widgets take their colors from the theme now ('' is Auto). Buttons and links still on the old
-- default primary, and labels on the old default text color, follow the theme from here on.
UPDATE ui_component_property SET prop_value = ''
WHERE prop_key = 'color' AND LOWER(prop_value) = '#2f89ff'
  AND component_id IN (SELECT id FROM ui_component WHERE type IN ('button', 'link'));

UPDATE ui_component_property SET prop_value = ''
WHERE prop_key = 'color' AND LOWER(prop_value) = '#242424'
  AND component_id IN (SELECT id FROM ui_component WHERE type = 'label');
