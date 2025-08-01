-- Start a transaction: If any step fails, the entire process will be rolled back.
BEGIN;

-- ----------------------------------------------------------------------------------
-- ----------------------------- EXPECTED RESULT ------------------------------------
-- the new `project` table that serves as a container for polymorphic items,
-- allowing for different types of project items (e.g., GitHub repositories, owners, URLs) to be stored in a single table.
-- ----------------------------------------------------------------------------------

-- CREATE TABLE project
-- (
--     id         UUID PRIMARY KEY      DEFAULT gen_random_uuid(),
--     name       VARCHAR(255) NOT NULL,
--     created_at TIMESTAMP    NOT NULL DEFAULT now(),
--     updated_at TIMESTAMP    NOT NULL DEFAULT now()
-- );
--
-- -- Represents the type of a single item within a project list.
-- CREATE TYPE project_item_type AS ENUM (
--     'GITHUB_REPOSITORY',
--     'GITHUB_OWNER',
--     'URL'
--     );
--
-- CREATE TABLE project_item
-- (
--     id                     UUID PRIMARY KEY           DEFAULT gen_random_uuid(),
--     project_id             UUID              NOT NULL,
--
--     project_item_type      project_item_type NOT NULL,
--
--     -- Columns for GITHUB types
--     github_owner_id        BIGINT,
--     github_owner_login     VARCHAR(255),
--     github_repository_id   BIGINT,
--     github_repository_name VARCHAR(255),
--
--     -- Column for URL type
--     url                    TEXT,
--
--     created_at             TIMESTAMP         NOT NULL DEFAULT now(),
--
--     -- Link back to the parent project. If a project is deleted, its items are also deleted.
--     CONSTRAINT fk_project FOREIGN KEY (project_id) REFERENCES project (id) ON DELETE CASCADE,
--
--     -- This CHECK constraint ensures that the correct fields are filled for each item type.
--     CONSTRAINT check_item_type_attributes CHECK (
--             (project_item_type = 'GITHUB_REPOSITORY' AND github_owner_login IS NOT NULL AND
--              github_repository_name IS NOT NULL AND url IS NULL) OR
--             (project_item_type = 'GITHUB_OWNER' AND github_owner_login IS NOT NULL AND
--              github_repository_name IS NULL AND url IS NULL) OR
--             (project_item_type = 'URL' AND url IS NOT NULL AND github_owner_login IS NULL AND
--              github_repository_name IS NULL)
--         )
-- );

-- ----------------------------------------------------------------------------------
-- ----------------------------- END OF EXPECTED RESULT -----------------------------
-- ----------------------------------------------------------------------------------

-- Step 1: Rename the existing project table to avoid conflicts and for backup.
ALTER TABLE project
    RENAME TO project_old;
ALTER INDEX unique_project_owner_repo RENAME TO unique_project_owner_repo_old;
ALTER INDEX unique_owner_repo_coalesce RENAME TO unique_owner_repo_coalesce_old;


-- Step 2: Create the new, simplified `project` table (the container).
CREATE TABLE project
(
    id         UUID PRIMARY KEY      DEFAULT gen_random_uuid(),
    name       VARCHAR(255) NOT NULL,
    created_at TIMESTAMP    NOT NULL DEFAULT now(),
    updated_at TIMESTAMP    NOT NULL DEFAULT now()
);


-- Step 3: Create the ENUM type for the items.
CREATE TYPE project_item_type AS ENUM (
    'GITHUB_REPOSITORY',
    'GITHUB_OWNER',
    'URL'
    );


-- Step 4: Create the new `project_item` table for the polymorphic entities.
CREATE TABLE project_item
(
    id                     UUID PRIMARY KEY           DEFAULT gen_random_uuid(),
    project_id             UUID              NOT NULL,
    project_item_type      project_item_type NOT NULL,
    github_owner_id        BIGINT,
    github_owner_login     VARCHAR(255),
    github_repository_id   BIGINT,
    github_repository_name VARCHAR(255),
    url                    TEXT,
    created_at             TIMESTAMP         NOT NULL DEFAULT now(),

    CONSTRAINT fk_project FOREIGN KEY (project_id) REFERENCES project (id) ON DELETE CASCADE,
    CONSTRAINT check_item_type_attributes CHECK (
            (project_item_type = 'GITHUB_REPOSITORY' AND github_owner_login IS NOT NULL AND
             github_repository_name IS NOT NULL AND url IS NULL) OR
            (project_item_type = 'GITHUB_OWNER' AND github_owner_login IS NOT NULL AND
             github_repository_name IS NULL AND url IS NULL) OR
            (project_item_type = 'URL' AND url IS NOT NULL AND github_owner_login IS NULL AND
             github_repository_name IS NULL)
        )
);

CREATE INDEX idx_project_item_project_id ON project_item (project_id);


-- Step 5: Migrate the data from the old table to the new structure.
-- This part creates a new project for each row in the old table and a corresponding project_item.
WITH new_projects AS (
    INSERT INTO project (id, name, created_at, updated_at)
        SELECT id,
               -- Create a descriptive name for the new project.
               COALESCE(github_owner_login || '/' || github_repository_name, github_owner_login),
               created_at,
               updated_at
        FROM project_old
        RETURNING id, created_at)
INSERT
INTO project_item (project_id, project_item_type, github_owner_id, github_owner_login, github_repository_id,
                   github_repository_name, created_at)
SELECT p_old.id,
       -- Determine the item type based on whether a repository name exists.
       CASE
           WHEN p_old.github_repository_name IS NOT NULL THEN 'GITHUB_REPOSITORY'::project_item_type
           ELSE 'GITHUB_OWNER'::project_item_type
           END,
       p_old.github_owner_id,
       p_old.github_owner_login,
       p_old.github_repository_id,
       p_old.github_repository_name,
       p_old.created_at
FROM project_old p_old;


-- Step 6: Clean up the old table and its indexes.
-- It's best practice to run this command manually after you have verified the data migration was successful.
-- DROP TABLE project_old;
-- DROP INDEX unique_project_owner_repo_old;
-- DROP INDEX unique_owner_repo_coalesce_old;


-- Commit the transaction to make all changes permanent.
COMMIT;