-- Accounts: users sign in with an identity provider (OIDC), own their work through workspaces,
-- and every application belongs to exactly one workspace.

-- Users no longer have passwords or chosen usernames; they're created on first sign-in
ALTER TABLE "user" DROP COLUMN password;
ALTER TABLE "user" ALTER COLUMN username DROP NOT NULL;
ALTER TABLE "user" ADD COLUMN avatar_url varchar(1024);

-- One sign-in at an identity provider: the token's issuer plus the user's id there (subject)
create sequence user_identity_seq start with 1 increment by 50;
create table "user_identity" (
    id bigint not null,
    user_id bigint not null,
    issuer varchar(512) not null,
    subject varchar(255) not null,
    created_at timestamp(6) not null,
    last_modified timestamp(6),
    primary key (id),
    constraint uq_user_identity_issuer_subject unique (issuer, subject)
);
alter table "user_identity" add constraint fk_user_identity_user foreign key (user_id) references "user" (id) on delete cascade;

create sequence workspace_seq start with 1 increment by 50;
create table "workspace" (
    id bigint not null,
    name varchar(255) not null,
    personal boolean not null default false,
    created_at timestamp(6) not null,
    last_modified timestamp(6),
    primary key (id)
);

create sequence workspace_member_seq start with 1 increment by 50;
create table "workspace_member" (
    id bigint not null,
    workspace_id bigint not null,
    user_id bigint not null,
    role varchar(20) not null check (role in ('OWNER', 'EDITOR', 'VIEWER')),
    created_at timestamp(6) not null,
    last_modified timestamp(6),
    primary key (id),
    constraint uq_workspace_member unique (workspace_id, user_id)
);
alter table "workspace_member" add constraint fk_workspace_member_workspace foreign key (workspace_id) references "workspace" (id) on delete cascade;
alter table "workspace_member" add constraint fk_workspace_member_user foreign key (user_id) references "user" (id) on delete cascade;

-- Applications that exist before accounts (local sample data) move into one shared workspace,
-- with every existing user as its owner
INSERT INTO "workspace" (id, name, personal, created_at)
SELECT -1, 'Existing applications', false, now()
WHERE EXISTS (SELECT 1 FROM "application");

INSERT INTO "workspace_member" (id, workspace_id, user_id, role, created_at)
-- Negative ids stay clear of the ids the sequence hands out
SELECT -(row_number() over (order by u.id)), -1, u.id, 'OWNER', now()
FROM "user" u
WHERE EXISTS (SELECT 1 FROM "workspace" WHERE id = -1);

ALTER TABLE "application" ADD COLUMN workspace_id bigint;
UPDATE "application" SET workspace_id = -1;
ALTER TABLE "application" ALTER COLUMN workspace_id SET NOT NULL;
alter table "application" add constraint fk_application_workspace foreign key (workspace_id) references "workspace" (id);
create index ix_application_workspace on "application" (workspace_id);
