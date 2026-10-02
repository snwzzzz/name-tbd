-- The artboard went from 1440 × 720 (72 × 36 cells) to a real browser window's page area,
-- 1920 × 940 (96 × 47 cells), with the same 20px cells. Saved widgets stretch to the new width
-- (columns × 4/3) and keep their height, so a design that filled the old width fills the new one.
-- A widget's left and right edge are rounded on their own, so widgets that sat flush against each
-- other (or against their container's edge) still do.
UPDATE ui_component SET
    pos_x = ROUND(pos_x * 4 / 3),
    pos_w = ROUND((pos_x + pos_w) * 4 / 3) - ROUND(pos_x * 4 / 3);

-- A container's edges were rounded in its parent's cells, its children's in its own: a child
-- that now sticks out by a cell is cut back to the container's edge
UPDATE ui_component c SET
    pos_w = GREATEST(1, (SELECT p.pos_w FROM ui_component p WHERE p.id = c.parent_id) - c.pos_x)
WHERE c.parent_id IS NOT NULL
  AND c.pos_x + c.pos_w > (SELECT p.pos_w FROM ui_component p WHERE p.id = c.parent_id);
