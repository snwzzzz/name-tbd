-- The old form widget (a fixed-size placeholder without settings, shown as "Dynamic Form") is
-- retired: its type is now the form container, which groups fields and saves them into a data
-- source row. Saved old forms had no props and no children, so they become empty form containers
-- (with the catalog's defaults); they only need to be at least as big as a form container can be.
UPDATE ui_component SET pos_w = GREATEST(pos_w, 8), pos_h = GREATEST(pos_h, 5) WHERE type = 'form';
