-- The artboard went from 1440 × 810 (24 × 18 cells of 60 × 45px) to 1440 × 720 (72 × 36 square
-- cells of 20px). Saved widgets keep their size and place in px: columns × 3 exactly, rows × 2.25
-- rounded. A widget's top and bottom edge are rounded on their own, so widgets that sat flush
-- against each other (or against their container's edge) still do.
UPDATE ui_component SET
    pos_x = pos_x * 3,
    pos_w = pos_w * 3,
    pos_y = ROUND(pos_y * 2.25),
    pos_h = ROUND((pos_y + pos_h) * 2.25) - ROUND(pos_y * 2.25);

-- The artboard is 90px lower: top-level widgets past its bottom move up onto it
UPDATE ui_component SET pos_h = 36 WHERE parent_id IS NULL AND pos_h > 36;
UPDATE ui_component SET pos_y = 36 - pos_h WHERE parent_id IS NULL AND pos_y + pos_h > 36;

-- The widgets' old default colors become the new (Fluent) ones
UPDATE ui_component_property SET prop_value = '#0f6cbd'
WHERE prop_key = 'color' AND prop_value IN ('#3b82f6', '#2f89ff')
  AND component_id IN (SELECT id FROM ui_component WHERE type IN ('button', 'link'));
UPDATE ui_component_property SET prop_value = '#242424'
WHERE prop_key = 'color' AND prop_value = '#1f1f1f'
  AND component_id IN (SELECT id FROM ui_component WHERE type IN ('label', 'nav'));
