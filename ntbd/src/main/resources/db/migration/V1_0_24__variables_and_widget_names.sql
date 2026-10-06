-- Variables: an app's on its branch, a page's on the page (JSON lists of {name, type, initial}).
ALTER TABLE "branch" ADD COLUMN variables TEXT;
ALTER TABLE "page" ADD COLUMN variables TEXT;

-- Expressions name widgets (orderForm.amount): every widget gets a name, its type and id (e.g.
-- input12), unless it has one. The editor names new widgets the same way; names can be changed.
INSERT INTO ui_component_property (component_id, prop_key, prop_value)
SELECT c.id, 'name', CONCAT(c.type, CAST(c.id AS VARCHAR(20)))
FROM ui_component c
WHERE NOT EXISTS (SELECT 1 FROM ui_component_property p WHERE p.component_id = c.id AND p.prop_key = 'name');
