ALTER TABLE "ui_component" ADD COLUMN parent_id BIGINT;
ALTER TABLE "ui_component" ADD CONSTRAINT FK_ui_component_parent FOREIGN KEY (parent_id) REFERENCES "ui_component" (id);
