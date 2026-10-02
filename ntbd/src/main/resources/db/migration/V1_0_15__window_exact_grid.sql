-- The artboard went from 1920 × 940 (96 × 47 cells of 20px) to exactly a 1920 × 945 browser
-- window (128 × 63 cells of 15px). Saved widgets keep their size and place in px: cells × 4/3.
-- Each edge is rounded on its own, so widgets that sat flush against each other (or against
-- their container's or the page's edge) still do.
UPDATE ui_component SET
    pos_x = ROUND(pos_x * 4 / 3),
    pos_w = ROUND((pos_x + pos_w) * 4 / 3) - ROUND(pos_x * 4 / 3),
    pos_y = ROUND(pos_y * 4 / 3),
    pos_h = ROUND((pos_y + pos_h) * 4 / 3) - ROUND(pos_y * 4 / 3);

-- A container's edges were rounded in its parent's cells, its children's in its own: a child
-- that now sticks out by a cell is cut back to the container's edge
UPDATE ui_component c SET
    pos_w = GREATEST(1, (SELECT p.pos_w FROM ui_component p WHERE p.id = c.parent_id) - c.pos_x)
WHERE c.parent_id IS NOT NULL
  AND c.pos_x + c.pos_w > (SELECT p.pos_w FROM ui_component p WHERE p.id = c.parent_id);
UPDATE ui_component c SET
    pos_h = GREATEST(1, (SELECT p.pos_h FROM ui_component p WHERE p.id = c.parent_id) - c.pos_y)
WHERE c.parent_id IS NOT NULL
  AND c.pos_y + c.pos_h > (SELECT p.pos_h FROM ui_component p WHERE p.id = c.parent_id);
