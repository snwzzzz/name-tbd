-- A version is a snapshot of a branch's content (BranchContent as JSON) that can be previewed and
-- restored. Versions saved before (any JSON, never written by the editor) can't be restored: they
-- become LEGACY and aren't listed.
alter table "version_control" rename column application_definition to content;

alter table "version_control" add column kind varchar(20) not null default 'LEGACY';
alter table "version_control" add column label varchar(200);
alter table "version_control" add column content_hash varchar(64);
alter table "version_control" add column size_bytes bigint not null default 0;

-- Numbered 1, 2, 3, ... per branch, in the order they were made
alter table "version_control" add column version_number integer;
update "version_control" v set version_number = (
    select count(*) from "version_control" o
    where o.branch_id = v.branch_id and (o.created_at < v.created_at or (o.created_at = v.created_at and o.id <= v.id)));
alter table "version_control" alter column version_number set not null;
alter table "version_control" add constraint uq_version_control_number unique (branch_id, version_number);
