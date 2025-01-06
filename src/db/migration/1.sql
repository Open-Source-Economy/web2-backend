CREATE TABLE IF NOT EXISTS github_owner
(
    id                UUID         NOT NULL DEFAULT gen_random_uuid(),
    github_id         BIGSERIAL PRIMARY KEY,
    github_login      VARCHAR(255) NOT NULL UNIQUE,

    github_type       VARCHAR(127) NOT NULL,
    github_html_url   VARCHAR(510) NOT NULL,
    github_avatar_url VARCHAR(510),

    email             VARCHAR(255),

    created_at        TIMESTAMP    NOT NULL DEFAULT now(),
    updated_at        TIMESTAMP    NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS github_repository
(
    id                 UUID          NOT NULL DEFAULT gen_random_uuid(),
    github_id          BIGINT UNIQUE NOT NULL,

    github_owner_id    BIGINT        NOT NULL,
    github_owner_login VARCHAR(255)  NOT NULL,

    github_name        VARCHAR(255)  NOT NULL,

    github_html_url    VARCHAR(510),
    github_description VARCHAR(510),

    created_at         TIMESTAMP     NOT NULL DEFAULT now(),
    updated_at         TIMESTAMP     NOT NULL DEFAULT now(),

    CONSTRAINT pk_github_repository PRIMARY KEY (github_owner_login, github_name),

    CONSTRAINT fk_github_owner_id FOREIGN KEY (github_owner_id) REFERENCES github_owner (github_id) ON DELETE RESTRICT,
    CONSTRAINT fk_github_owner_login FOREIGN KEY (github_owner_login) REFERENCES github_owner (github_login) ON DELETE RESTRICT
);

-- TODO: deal with the date format
-- github_created_at TIMESTAMP,
-- github_closed_at TIMESTAMP,
CREATE TABLE IF NOT EXISTS github_issue
(
    id                         UUID          NOT NULL DEFAULT gen_random_uuid(),
    github_id                  BIGINT UNIQUE NOT NULL,

    github_owner_id            BIGINT        NOT NULL,
    github_owner_login         VARCHAR(255)  NOT NULL,

    github_repository_id       BIGINT        NOT NULL,
    github_repository_name     VARCHAR(255)  NOT NULL,

    github_number              INTEGER       NOT NULL,

    github_open_by_owner_id    BIGINT,      -- ID of the owner who opened the issue
    github_open_by_owner_login VARCHAR(255),-- Login of the owner who opened the issue

    github_title               VARCHAR(510),
    github_body                TEXT,
    github_html_url            VARCHAR(510),
    github_created_at          VARCHAR(510),
    github_closed_at           VARCHAR(510),

    created_at                 TIMESTAMP     NOT NULL DEFAULT now(),
    updated_at                 TIMESTAMP     NOT NULL DEFAULT now(),

    CONSTRAINT pk_github_issue_key PRIMARY KEY (github_owner_login, github_repository_name, github_number),

    CONSTRAINT fk_github_owner_id FOREIGN KEY (github_owner_id) REFERENCES github_owner (github_id) ON DELETE RESTRICT,
    CONSTRAINT fk_github_owner_login FOREIGN KEY (github_owner_login) REFERENCES github_owner (github_login) ON DELETE RESTRICT,

    CONSTRAINT fk_github_repository_id FOREIGN KEY (github_repository_id) REFERENCES github_repository (github_id) ON DELETE RESTRICT,
    CONSTRAINT fk_github_repository FOREIGN KEY (github_owner_login, github_repository_name) REFERENCES github_repository (github_owner_login, github_name) ON DELETE RESTRICT,

    CONSTRAINT fk_github_open_by_owner_id FOREIGN KEY (github_open_by_owner_id) REFERENCES github_owner (github_id) ON DELETE RESTRICT,
    CONSTRAINT fk_github_open_by_owner_login FOREIGN KEY (github_open_by_owner_login) REFERENCES github_owner (github_login) ON DELETE RESTRICT
);


-- User authentication tables --

-- from passportjs.org
CREATE TABLE IF NOT EXISTS "user_session"
(
    "sid"    character varying NOT NULL COLLATE "default",
    "sess"   json              NOT NULL,
    "expire" TIMESTAMP         NOT NULL
) WITH (OIDS= FALSE);
ALTER TABLE "user_session"
    ADD CONSTRAINT "session_pkey" PRIMARY KEY ("sid") NOT DEFERRABLE INITIALLY IMMEDIATE;
CREATE INDEX "IDX_session_expire" ON "user_session" ("expire");

CREATE TABLE IF NOT EXISTS app_user
(
    id                 UUID PRIMARY KEY NOT NULL DEFAULT gen_random_uuid(),
    provider           VARCHAR(50),         -- Optional, used for third-party users
    third_party_id     VARCHAR(100) UNIQUE, -- Optional, used for third-party users
    name               VARCHAR(255),
    email              VARCHAR(255) UNIQUE,
    is_email_verified  BOOLEAN          NOT NULL,
    hashed_password    VARCHAR(255),        -- Optional, used for local users
    role               VARCHAR(50)      NOT NULL CHECK (role IN ('super_admin', 'user')),
    github_owner_id    BIGINT,
    github_owner_login VARCHAR(255),

    created_at         TIMESTAMP        NOT NULL DEFAULT now(),
    updated_at         TIMESTAMP        NOT NULL DEFAULT now(),

    CONSTRAINT fk_github_owner_id FOREIGN KEY (github_owner_id) REFERENCES github_owner (github_id) ON DELETE SET NULL,
    CONSTRAINT fk_github_owner_login FOREIGN KEY (github_owner_login) REFERENCES github_owner (github_login) ON DELETE RESTRICT,

    CONSTRAINT chk_provider CHECK (
            (provider IS NOT NULL AND third_party_id IS NOT NULL) OR
            (provider IS NULL AND third_party_id IS NULL)
        ),
    CONSTRAINT chk_github_provider_data CHECK (
            (provider = 'github' AND github_owner_id IS NOT NULL AND github_owner_login IS NOT NULL) OR
            (provider <> 'github' AND github_owner_id IS NULL AND github_owner_login IS NULL)
        )
);

CREATE TABLE IF NOT EXISTS address
(
    id          UUID PRIMARY KEY NOT NULL DEFAULT gen_random_uuid(),
    name        VARCHAR(255),
    line_1      VARCHAR(255),
    line_2      VARCHAR(255),
    city        VARCHAR(100),
    state       VARCHAR(100),
    postal_code VARCHAR(20),
    country     VARCHAR(100),

    created_at  TIMESTAMP        NOT NULL DEFAULT now(),
    updated_at  TIMESTAMP        NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS company
(
    id         UUID PRIMARY KEY NOT NULL DEFAULT gen_random_uuid(),
    tax_id     VARCHAR(50) UNIQUE,
    name       VARCHAR(255)     NOT NULL,
    address_id UUID,

    created_at TIMESTAMP        NOT NULL DEFAULT now(),
    updated_at TIMESTAMP        NOT NULL DEFAULT now(),

    CONSTRAINT fk_address_id FOREIGN KEY (address_id) REFERENCES address (id) ON DELETE RESTRICT
);

------------------------------------------------------
--- Junction tables for many-to-many relationships ---
------------------------------------------------------

CREATE TABLE IF NOT EXISTS user_company
(
    user_id    UUID        NOT NULL,
    company_id UUID        NOT NULL,
    role       VARCHAR(50) NOT NULL CHECK (role IN ('admin', 'suggest', 'read')),

    created_at TIMESTAMP   NOT NULL DEFAULT now(),
    updated_at TIMESTAMP   NOT NULL DEFAULT now(),

    PRIMARY KEY (user_id, company_id),

    CONSTRAINT fk_user_id FOREIGN KEY (user_id) REFERENCES app_user (id) ON DELETE CASCADE,
    CONSTRAINT fk_company_id FOREIGN KEY (company_id) REFERENCES company (id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS user_repository
(
    user_id                UUID         NOT NULL,

    github_owner_id        BIGINT       NOT NULL,
    github_owner_login     VARCHAR(255) NOT NULL,

    github_repository_id   BIGINT       NOT NULL,
    github_repository_name VARCHAR(255) NOT NULL,

    repository_user_role   VARCHAR(50)  NOT NULL CHECK (repository_user_role IN ('admin', 'read')),
    dow_rate               NUMERIC      NOT NULL CHECK (dow_rate > 0),
    dow_currency           VARCHAR(10)  NOT NULL,

    created_at             TIMESTAMP    NOT NULL DEFAULT now(),
    updated_at             TIMESTAMP    NOT NULL DEFAULT now(),

    PRIMARY KEY (user_id, github_owner_login, github_repository_name),

    CONSTRAINT fk_user_id FOREIGN KEY (user_id) REFERENCES app_user (id) ON DELETE CASCADE,

    CONSTRAINT fk_github_owner_id FOREIGN KEY (github_owner_id) REFERENCES github_owner (github_id) ON DELETE RESTRICT,
    CONSTRAINT fk_github_owner_login FOREIGN KEY (github_owner_login) REFERENCES github_owner (github_login) ON DELETE RESTRICT,

    CONSTRAINT fk_github_repository_id FOREIGN KEY (github_repository_id) REFERENCES github_repository (github_id) ON DELETE RESTRICT,
    CONSTRAINT fk_github_repository FOREIGN KEY (github_owner_login, github_repository_name) REFERENCES github_repository (github_owner_login, github_name) ON DELETE RESTRICT
);
-----------------------------
--- Manual invoice tables ---
-----------------------------

CREATE TABLE IF NOT EXISTS manual_invoice
(
    id         UUID      NOT NULL DEFAULT gen_random_uuid(),
    number     INTEGER   NOT NULL,
    company_id UUID,
    user_id    UUID,
    paid       BOOLEAN   NOT NULL,
    dow_amount NUMERIC   NOT NULL, -- changed to milli_dow_amount, type integer, in migration 2.sql

    created_at TIMESTAMP NOT NULL DEFAULT now(),
    updated_at TIMESTAMP NOT NULL DEFAULT now(),

    CONSTRAINT fk_user_id FOREIGN KEY (user_id) REFERENCES app_user (id) ON DELETE CASCADE,
    CONSTRAINT fk_company_id FOREIGN KEY (company_id) REFERENCES company (id) ON DELETE CASCADE,

    CONSTRAINT chk_company_nor_user CHECK (
            (company_id IS NOT NULL AND user_id IS NULL) OR
            (company_id IS NULL AND user_id IS NOT NULL)
        )
);

----------------------------
--- Issue funding tables ---
----------------------------

CREATE TABLE IF NOT EXISTS managed_issue
(
    id                     UUID PRIMARY KEY NOT NULL DEFAULT gen_random_uuid(),

    github_owner_id        BIGINT           NOT NULL,
    github_owner_login     VARCHAR(255)     NOT NULL,

    github_repository_id   BIGINT           NOT NULL,
    github_repository_name VARCHAR(255)     NOT NULL,

    github_issue_id        BIGINT           NOT NULL,
    github_issue_number    INTEGER          NOT NULL,

    requested_dow_amount   NUMERIC          NOT NULL, -- changed to requested_milli_dow_amount, type integer, in migration 2.sql

    manager_id             UUID             NOT NULL,
    contributor_visibility VARCHAR(50)      NOT NULL, -- 'public' or 'private'
    state                  VARCHAR(50)      NOT NULL, -- 'open', 'rejected', 'solved'

    created_at             TIMESTAMP        NOT NULL DEFAULT now(),
    updated_at             TIMESTAMP        NOT NULL DEFAULT now(),

    CONSTRAINT fk_github_owner_id FOREIGN KEY (github_owner_id) REFERENCES github_owner (github_id) ON DELETE RESTRICT,
    CONSTRAINT fk_github_repository_id FOREIGN KEY (github_repository_id) REFERENCES github_repository (github_id) ON DELETE RESTRICT,
    CONSTRAINT fk_github_issue_id FOREIGN KEY (github_issue_id) REFERENCES github_issue (github_id) ON DELETE RESTRICT,

    CONSTRAINT fk_github_owner_login FOREIGN KEY (github_owner_login) REFERENCES github_owner (github_login) ON DELETE RESTRICT,
    CONSTRAINT fk_github_repository FOREIGN KEY (github_owner_login, github_repository_name) REFERENCES github_repository (github_owner_login, github_name) ON DELETE RESTRICT,
    CONSTRAINT fk_github_issue FOREIGN KEY (github_owner_login, github_repository_name, github_issue_number) REFERENCES github_issue (github_owner_login, github_repository_name, github_number) ON DELETE RESTRICT,

    CONSTRAINT fk_manager FOREIGN KEY (manager_id) REFERENCES app_user (id) ON DELETE CASCADE
);

-- this table is used as event source events
CREATE TABLE IF NOT EXISTS issue_funding
(
    id                     UUID PRIMARY KEY NOT NULL DEFAULT gen_random_uuid(),

    github_owner_id        BIGINT           NOT NULL,
    github_owner_login     VARCHAR(255)     NOT NULL,

    github_repository_id   BIGINT           NOT NULL,
    github_repository_name VARCHAR(255)     NOT NULL,

    github_issue_id        BIGINT           NOT NULL,
    github_issue_number    INTEGER          NOT NULL,

    user_id                UUID             NOT NULL,
    dow_amount             NUMERIC          NOT NULL, -- changed to milli_dow_amount, type integer, in migration 2.sql

    created_at             TIMESTAMP        NOT NULL DEFAULT now(),
    updated_at             TIMESTAMP        NOT NULL DEFAULT now(),

    CONSTRAINT fk_github_owner_id FOREIGN KEY (github_owner_id) REFERENCES github_owner (github_id) ON DELETE RESTRICT,
    CONSTRAINT fk_github_repository_id FOREIGN KEY (github_repository_id) REFERENCES github_repository (github_id) ON DELETE RESTRICT,
    CONSTRAINT fk_github_issue_id FOREIGN KEY (github_issue_id) REFERENCES github_issue (github_id) ON DELETE RESTRICT,

    CONSTRAINT fk_github_owner_login FOREIGN KEY (github_owner_login) REFERENCES github_owner (github_login) ON DELETE RESTRICT,
    CONSTRAINT fk_github_repository FOREIGN KEY (github_owner_login, github_repository_name) REFERENCES github_repository (github_owner_login, github_name) ON DELETE RESTRICT,
    CONSTRAINT fk_github_issue FOREIGN KEY (github_owner_login, github_repository_name, github_issue_number) REFERENCES github_issue (github_owner_login, github_repository_name, github_number) ON DELETE RESTRICT,

    CONSTRAINT fk_user_id FOREIGN KEY (user_id) REFERENCES app_user (id) ON DELETE CASCADE
);


-----------------------------------------
--- Tables to invite user to register ---
-----------------------------------------

CREATE TABLE IF NOT EXISTS company_user_permission_token
(
    id                UUID PRIMARY KEY NOT NULL DEFAULT gen_random_uuid(),
    user_name         VARCHAR(255),
    user_email        VARCHAR(255)     NOT NULL,

    token             TEXT             NOT NULL UNIQUE,

    company_id        UUID             NOT NULL,
    company_user_role VARCHAR(50)      NOT NULL CHECK (company_user_role IN ('admin', 'suggest', 'read')),

    expires_at        TIMESTAMP        NOT NULL,
    created_at        TIMESTAMP        NOT NULL DEFAULT now(),
    updated_at        TIMESTAMP        NOT NULL DEFAULT now(),

    has_been_used     BOOLEAN          NOT NULL DEFAULT FALSE,

    CONSTRAINT fk_company_id FOREIGN KEY (company_id) REFERENCES company (id) ON DELETE RESTRICT,
    CONSTRAINT unique_user_company UNIQUE (user_email, company_id)
);

CREATE TABLE IF NOT EXISTS repository_user_permission_token
(
    id                      UUID PRIMARY KEY NOT NULL DEFAULT gen_random_uuid(),
    user_name               VARCHAR(255),
    user_email              VARCHAR(255)     NOT NULL,
    user_github_owner_login VARCHAR(255)     NOT NULL,

    token                   TEXT             NOT NULL UNIQUE,

    github_owner_id         BIGINT           NOT NULL,
    github_owner_login      VARCHAR(255)     NOT NULL,

    github_repository_id    BIGINT           NOT NULL,
    github_repository_name  VARCHAR(255)     NOT NULL,

    repository_user_role    VARCHAR(50)      NOT NULL CHECK (repository_user_role IN ('admin', 'read')),
    dow_rate                NUMERIC          NOT NULL CHECK (dow_rate > 0),
    dow_currency            VARCHAR(10)      NOT NULL,

    has_been_used           BOOLEAN          NOT NULL DEFAULT FALSE,

    expires_at              TIMESTAMP        NOT NULL,
    created_at              TIMESTAMP        NOT NULL DEFAULT now(),
    updated_at              TIMESTAMP        NOT NULL DEFAULT now(),

    CONSTRAINT fk_github_owner_id FOREIGN KEY (github_owner_id) REFERENCES github_owner (github_id) ON DELETE RESTRICT,
    CONSTRAINT fk_github_owner_login FOREIGN KEY (github_owner_login) REFERENCES github_owner (github_login) ON DELETE RESTRICT,

    CONSTRAINT fk_github_repository_id FOREIGN KEY (github_repository_id) REFERENCES github_repository (github_id) ON DELETE RESTRICT,
    CONSTRAINT fk_github_repository FOREIGN KEY (github_owner_login, github_repository_name) REFERENCES github_repository (github_owner_login, github_name) ON DELETE RESTRICT
);

