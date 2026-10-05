-- Live data: data sources that read and write where the customer keeps the data (a database, a
-- spreadsheet, an API) instead of rows stored here.

-- How to reach a customer's system; belongs to a workspace, so every app (and every copy of an app) in
-- it can use it. `settings` is JSON without secrets; `secret` is JSON encrypted with the server's key
-- (SecretBox: "<key id>:<base64 of iv and ciphertext>"), never sent to a client or into an export.
create table "data_connection" (
    id bigserial primary key,
    workspace_id bigint not null references "workspace" (id) on delete cascade,
    name varchar(255) not null,
    kind varchar(30) not null,
    settings text not null,
    secret text,
    created_at timestamp(6) not null,
    last_modified timestamp(6)
);
create index idx_data_connection_workspace on "data_connection" (workspace_id);

-- A data source is "embedded" (its rows stored here, as before) or read through a connection.
-- `settings` is JSON naming what to read there (a table, a sheet range, an API path); `key_column`
-- identifies rows, so concurrent changes hit the right one. A live source keeps its columns (not its
-- rows) in data_source_column, so the editor knows them without asking the customer's system.
alter table "data_source" add column kind varchar(30) not null default 'embedded';
alter table "data_source" add column connection_id bigint references "data_connection" (id) on delete set null;
alter table "data_source" add column settings text;
alter table "data_source" add column key_column varchar(255);
alter table "data_source" add column read_only boolean not null default false;

-- Keys that exported apps call /api/data with (their bearer token). Only a hash is stored; `hint` is
-- the key's start, to tell keys apart in the editor. Revoked keys stay, so the editor can list them.
create table "app_key" (
    id bigserial primary key,
    application_id bigint not null references "application" (id) on delete cascade,
    key_hash varchar(64) not null unique,
    hint varchar(16) not null,
    label varchar(255) not null,
    allow_writes boolean not null default true,
    created_at timestamp(6) not null,
    revoked_at timestamp(6)
);
create index idx_app_key_application on "app_key" (application_id);

-- The data choice last made when exporting the app: embed, live_cached or live.
alter table "application" add column export_data_mode varchar(20) not null default 'embed';
