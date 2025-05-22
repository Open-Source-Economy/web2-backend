BEGIN;

CREATE TABLE IF NOT EXISTS project
(
    id                         UUID          NOT NULL DEFAULT gen_random_uuid(),

    github_owner_id            BIGINT        NOT NULL,
    github_owner_login         VARCHAR(255)  NOT NULL,

    github_repository_id       BIGINT,
    github_repository_name     VARCHAR(255),

    ecosystem                  VARCHAR(255),

    created_at                 TIMESTAMP     NOT NULL DEFAULT now(),
    updated_at                 TIMESTAMP     NOT NULL DEFAULT now(),

    -- Add this unique constraint
    CONSTRAINT unique_project_owner_repo UNIQUE (github_owner_login, github_repository_name),

    CONSTRAINT fk_github_owner_id FOREIGN KEY (github_owner_id) REFERENCES github_owner (github_id) ON DELETE RESTRICT,
    CONSTRAINT fk_github_owner_login FOREIGN KEY (github_owner_login) REFERENCES github_owner (github_login) ON DELETE RESTRICT,

    CONSTRAINT fk_github_repository_id FOREIGN KEY (github_repository_id) REFERENCES github_repository (github_id) ON DELETE RESTRICT,
    CONSTRAINT fk_github_repository FOREIGN KEY (github_owner_login, github_repository_name) REFERENCES github_repository (github_owner_login, github_name) ON DELETE RESTRICT
);

CREATE UNIQUE INDEX unique_owner_repo_coalesce
    ON project (
                github_owner_login,
                COALESCE(github_repository_name, '')
        );

COMMIT;