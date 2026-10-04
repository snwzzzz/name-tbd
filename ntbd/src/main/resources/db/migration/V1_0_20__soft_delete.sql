-- Deleting widgets, workflow nodes and edges, and data sources only marks them (deleted_at), so an
-- undo can bring them back with the same ids. Rows deleted together share one deleted_at, so they
-- come back together. SoftDeletePurge removes marked rows for good after a day.
ALTER TABLE "ui_component" ADD COLUMN deleted_at timestamp(6);
ALTER TABLE "node" ADD COLUMN deleted_at timestamp(6);
ALTER TABLE "edge" ADD COLUMN deleted_at timestamp(6);
ALTER TABLE "data_source" ADD COLUMN deleted_at timestamp(6);

create index ix_ui_component_deleted on "ui_component" (deleted_at);
create index ix_node_deleted on "node" (deleted_at);
create index ix_edge_deleted on "edge" (deleted_at);
create index ix_data_source_deleted on "data_source" (deleted_at);
