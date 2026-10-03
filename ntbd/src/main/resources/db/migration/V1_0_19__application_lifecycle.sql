-- Applications as the editor manages them: each has a default branch (the one the editor opens),
-- remembers who changed it last, and can be deleted with everything in it.

ALTER TABLE "application" ADD COLUMN default_branch_id bigint;
ALTER TABLE "application" ADD COLUMN last_modified_by_id bigint;

-- Existing applications open their oldest branch
UPDATE "application" a SET default_branch_id = (SELECT min(b.id) FROM "branch" b WHERE b.application_id = a.id);

alter table "application" add constraint fk_application_default_branch
    foreign key (default_branch_id) references "branch" (id) on delete set null;
alter table "application" add constraint fk_application_last_modified_by
    foreign key (last_modified_by_id) references "user" (id) on delete set null;

-- Deleting an application deletes its branches, and a branch everything in it
alter table "branch" drop constraint FK3ecj8c3ui097jp6oo422qav7c;
alter table "branch" add constraint fk_branch_application
    foreign key (application_id) references "application" (id) on delete cascade;

alter table "page" drop constraint FKovfpkikgwvbs2h4fsp0smalbe;
alter table "page" add constraint fk_page_branch
    foreign key (branch_id) references "branch" (id) on delete cascade;

alter table "ui_component" drop constraint FKerhgi44pov98x3jtu9hogiie6;
alter table "ui_component" add constraint fk_ui_component_page
    foreign key (page_id) references "page" (id) on delete cascade;

alter table "ui_component" drop constraint FK_ui_component_parent;
alter table "ui_component" add constraint fk_ui_component_parent_cascade
    foreign key (parent_id) references "ui_component" (id) on delete cascade;

-- A widget keeps existing when the workflow it runs goes away
alter table "ui_component" drop constraint FKcw8fh4mv5pq1r7vt5hsjwcobg;
alter table "ui_component" add constraint fk_ui_component_workflow
    foreign key (workflow_id) references "workflow" (id) on delete set null;

alter table "workflow" drop constraint FKnsi7ivo97nf2e6pfm2yi461j4;
alter table "workflow" add constraint fk_workflow_branch
    foreign key (branch_id) references "branch" (id) on delete cascade;

alter table "workflow" drop constraint fk_workflow_page;
alter table "workflow" add constraint fk_workflow_page_cascade
    foreign key (page_id) references "page" (id) on delete cascade;

alter table "node" drop constraint FKkeprq4go94pqb95cno3x0t2y;
alter table "node" add constraint fk_node_workflow
    foreign key (workflow_id) references "workflow" (id) on delete cascade;

alter table "edge" drop constraint FK6cwe12ocngcyxpxennwohwnfl;
alter table "edge" add constraint fk_edge_source_node
    foreign key (source_node_id) references "node" (id) on delete cascade;

alter table "edge" drop constraint FKcnmjexckol0ed8sglmq6fgd0e;
alter table "edge" add constraint fk_edge_target_node
    foreign key (target_node_id) references "node" (id) on delete cascade;

alter table "data_source" drop constraint fk_data_source_branch;
alter table "data_source" add constraint fk_data_source_branch_cascade
    foreign key (branch_id) references "branch" (id) on delete cascade;

alter table "version_control" drop constraint FK99g6udp26dhjxoqgfia67vdd1;
alter table "version_control" add constraint fk_version_control_branch
    foreign key (branch_id) references "branch" (id) on delete cascade;
