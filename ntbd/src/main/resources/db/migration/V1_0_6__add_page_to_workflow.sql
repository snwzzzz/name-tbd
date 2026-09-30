-- Each page owns the workflow that holds its UI logic (click triggers, actions, ...)
ALTER TABLE "workflow" ADD COLUMN page_id BIGINT;
ALTER TABLE "workflow" ADD CONSTRAINT fk_workflow_page FOREIGN KEY (page_id) REFERENCES "page" (id);
