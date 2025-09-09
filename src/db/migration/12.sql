-- Start a transaction: If any step fails, the entire process will be rolled back.
BEGIN;

-- the new `project` table that serves as a container for polymorphic items,
-- allowing for different types of project items (e.g., GitHub repositories, owners, URLs) to be stored in a single table.

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
    project_item_type      project_item_type NOT NULL,

    -- Columns for GITHUB types
    github_owner_id        BIGINT,
    github_owner_login     VARCHAR(255),
    github_repository_id   BIGINT,
    github_repository_name VARCHAR(255),

    -- Column for URL type
    url                    TEXT,

    created_at             TIMESTAMP         NOT NULL DEFAULT now(),
    updated_at             TIMESTAMP         NOT NULL DEFAULT now(),

    -- These will only be checked when the corresponding columns are NOT NULL.
    CONSTRAINT fk_github_owner FOREIGN KEY (github_owner_id) REFERENCES github_owner (github_id) ON DELETE RESTRICT,
    CONSTRAINT fk_github_repository FOREIGN KEY (github_repository_id) REFERENCES github_repository (github_id) ON DELETE RESTRICT,

    CONSTRAINT check_item_type_attributes CHECK (
            (
                -- For a repository, we need all repository and owner details.
                        project_item_type = 'GITHUB_REPOSITORY' AND
                        github_repository_id IS NOT NULL AND github_repository_name IS NOT NULL AND
                        github_owner_id IS NOT NULL AND github_owner_login IS NOT NULL AND
                        url IS NULL
                ) OR
            (
                -- For an owner, we only need owner details.
                        project_item_type = 'GITHUB_OWNER' AND
                        github_owner_id IS NOT NULL AND github_owner_login IS NOT NULL AND
                        github_repository_id IS NULL AND github_repository_name IS NULL AND
                        url IS NULL
                ) OR
            (
                -- For a URL, we only need the URL.
                        project_item_type = 'URL' AND
                        url IS NOT NULL AND
                        github_owner_id IS NULL AND github_owner_login IS NULL AND
                        github_repository_id IS NULL AND github_repository_name IS NULL
                )
        )
);

COMMIT;
