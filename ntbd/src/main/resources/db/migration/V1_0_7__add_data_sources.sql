-- Tabular data (imported from CSV, ...) that a branch's pages can use.
-- A data source owns its columns and rows; each cell is the value of one row in one column.
create sequence data_source_seq start with 1 increment by 50;

create table "data_source" (
    id bigint not null,
    branch_id bigint not null,
    name varchar(255) not null,
    format varchar(50) not null,
    created_at timestamp(6) not null,
    last_modified timestamp(6),
    primary key (id)
);
alter table "data_source" add constraint fk_data_source_branch foreign key (branch_id) references "branch" (id);

create table data_source_column (
    id bigserial primary key,
    data_source_id bigint not null references "data_source" (id) on delete cascade,
    column_index int not null,
    name varchar(255) not null
);

create table data_source_row (
    id bigserial primary key,
    data_source_id bigint not null references "data_source" (id) on delete cascade,
    row_index int not null
);

create table data_source_cell (
    id bigserial primary key,
    row_id bigint not null references data_source_row (id) on delete cascade,
    column_id bigint not null references data_source_column (id) on delete cascade,
    cell_value text
);
