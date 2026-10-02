-- The widgets' main color is now the editor's primary (#2f89ff) instead of Fluent's darker blue:
-- buttons and links that still have the old default get the new one.
UPDATE ui_component_property SET prop_value = '#2f89ff'
WHERE prop_key = 'color' AND LOWER(prop_value) = '#0f6cbd'
  AND component_id IN (SELECT id FROM ui_component WHERE type IN ('button', 'link'));
