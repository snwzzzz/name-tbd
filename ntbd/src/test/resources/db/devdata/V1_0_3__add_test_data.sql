-- Insert an application
INSERT INTO "application" (id, created_at, title, description) VALUES (-1, now(), 'Test Application', 'App for testing');

-- Insert a user
INSERT INTO "user" (id, created_at, email, first_name, last_name, password, username) VALUES (-1, now(), 'migration_test@example.com', 'Test', 'User', 'Password123!', 'migration_testuser');

-- Insert a branch
INSERT INTO "branch" (id, created_at, application_id, created_by_id, name, description) VALUES (-1, now(), -1, -1, 'main', 'Main branch');

-- Insert a page
INSERT INTO "page" (id, created_at, branch_id, name, path) VALUES (-1, now(), -1, 'Home Page', '/home');

