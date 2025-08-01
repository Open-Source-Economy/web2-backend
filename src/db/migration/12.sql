-- SQL Migration: Developer Onboarding Schema
-- This script sets up the necessary types, tables, and indexes for the developer profile.
-- It is designed to be run as a single atomic transaction.

BEGIN;

-- -----------------------------------------------------------------------------
-- ## 1. Custom Data Types (ENUMs)
-- -----------------------------------------------------------------------------

CREATE TYPE developer_role_type AS ENUM (
    'creator_founder',
    'project_lead',
    'core_developer',
    'maintainer'
    );

CREATE TYPE merge_rights_type AS ENUM (
    'full_rights',
    'no_rights',
    'formal_process'
    );

CREATE TYPE income_stream_type AS ENUM (
    'royalties',
    'services',
    'donations'
    );

CREATE TYPE open_to_other_opportunity_type AS ENUM (
    'yes',
    'maybe',
    'no'
    );

CREATE TYPE currency_type AS ENUM (
    'USD',
    'EUR',
    'GBP',
    'CHF'
    );


-- -----------------------------------------------------------------------------
-- ## 2. Developer Onboarding Tables
-- -----------------------------------------------------------------------------

-- Adds terms_accepted to app_user (all users need to accept terms).
ALTER TABLE app_user
    ADD COLUMN IF NOT EXISTS terms_accepted BOOLEAN NOT NULL DEFAULT FALSE;

-- Developer profile links a user to their developer-specific data.
CREATE TABLE IF NOT EXISTS developer_profile
(
    id                   UUID PRIMARY KEY NOT NULL DEFAULT gen_random_uuid(),
    user_id              UUID             NOT NULL UNIQUE,
    onboarding_completed BOOLEAN          NOT NULL DEFAULT FALSE,
    created_at           TIMESTAMP        NOT NULL DEFAULT now(),
    updated_at           TIMESTAMP        NOT NULL DEFAULT now(),
    CONSTRAINT fk_developer_profile_user FOREIGN KEY (user_id) REFERENCES app_user (id) ON DELETE CASCADE
);

-- Consolidated settings table for a developer's preferences.
CREATE TABLE IF NOT EXISTS developer_settings
(
    id                        UUID PRIMARY KEY               NOT NULL DEFAULT gen_random_uuid(),
    developer_profile_id      UUID                           NOT NULL UNIQUE,
    income_streams            income_stream_type[]           NOT NULL,
    hourly_weekly_commitment  INTEGER                        NOT NULL CHECK (hourly_weekly_commitment > 0),
    open_to_other_opportunity open_to_other_opportunity_type NOT NULL,
    hourly_rate               DECIMAL(10, 2)                 NOT NULL CHECK (hourly_rate >= 0),
    currency                  currency_type                  NOT NULL,
    created_at                TIMESTAMP                      NOT NULL DEFAULT now(),
    updated_at                TIMESTAMP                      NOT NULL DEFAULT now(),
    CONSTRAINT fk_developer_settings_profile FOREIGN KEY (developer_profile_id) REFERENCES developer_profile (id) ON DELETE CASCADE
);

-- This single table holds all service definitions, both predefined and custom.
CREATE TABLE IF NOT EXISTS services
(
    id                UUID PRIMARY KEY      DEFAULT gen_random_uuid(),
    name              VARCHAR(255) NOT NULL,
    parent_id         UUID,
    is_custom         BOOLEAN      NOT NULL,
    -- This flag indicates if a response time is relevant for this service.
    has_response_time BOOLEAN      NOT NULL,
    created_at        TIMESTAMP    NOT NULL DEFAULT now(),
    updated_at        TIMESTAMP    NOT NULL DEFAULT now(),
    CONSTRAINT fk_services_parent FOREIGN KEY (parent_id) REFERENCES services (id) ON DELETE CASCADE
);

-- Services offered by developers, linked to a project item.
CREATE TABLE IF NOT EXISTS developer_service
(
    id                    UUID PRIMARY KEY NOT NULL DEFAULT gen_random_uuid(),
    developer_profile_id  UUID             NOT NULL,
    project_item_id       UUID             NOT NULL,
    service_id            UUID             NOT NULL,
    hourly_rate           DECIMAL(10, 2)   NOT NULL CHECK (hourly_rate >= 0),
    currency              currency_type    NOT NULL,
    response_time_hours   INTEGER CHECK (response_time_hours IS NULL OR response_time_hours > 0),
    created_at            TIMESTAMP        NOT NULL DEFAULT now(),
    updated_at            TIMESTAMP        NOT NULL DEFAULT now(),
    CONSTRAINT fk_developer_service_profile FOREIGN KEY (developer_profile_id) REFERENCES developer_profile (id) ON DELETE CASCADE,
    CONSTRAINT fk_developer_service_project_item FOREIGN KEY (project_item_id) REFERENCES project_item (id) ON DELETE CASCADE,
    CONSTRAINT fk_developer_service_definition FOREIGN KEY (service_id) REFERENCES services (id) ON DELETE CASCADE
);



-- -----------------------------------------------------------------------------
-- ## 3. Data Population for Predefined Services
-- -----------------------------------------------------------------------------

-- Use a CTE to insert main categories and then use their returned IDs to insert sub-categories.
WITH main_services AS (
    INSERT INTO services (name, parent_id, is_custom, has_response_time)
        VALUES
            ('Support', NULL, FALSE, TRUE),
            ('Development', NULL, FALSE, FALSE),
            ('Operation', NULL, FALSE, TRUE),
            ('Advisory', NULL, FALSE, FALSE)
        ON CONFLICT (name) DO NOTHING -- Avoid errors on re-runs
        RETURNING id, name
)
INSERT INTO services (name, parent_id, is_custom, has_response_time)
VALUES
    -- Support (Response time is relevant)
    ('Bug Fixes', (SELECT id FROM main_services WHERE name = 'Support'), FALSE, TRUE),
    ('New Features', (SELECT id FROM main_services WHERE name = 'Support'), FALSE, TRUE),
    ('Code Maintenance', (SELECT id FROM main_services WHERE name = 'Support'), FALSE, TRUE),
    -- Development (Response time is not typically relevant)
    ('Technical Assistance', (SELECT id FROM main_services WHERE name = 'Development'), FALSE, FALSE),
    ('Deployment Guidance', (SELECT id FROM main_services WHERE name = 'Development'), FALSE, FALSE),
    ('Customer Support', (SELECT id FROM main_services WHERE name = 'Development'), FALSE, FALSE),
    -- Operation (Response time is relevant)
    ('Incident Response', (SELECT id FROM main_services WHERE name = 'Operation'), FALSE, TRUE),
    ('Proactive Monitoring', (SELECT id FROM main_services WHERE name = 'Operation'), FALSE, TRUE),
    ('24/7 Supervision', (SELECT id FROM main_services WHERE name = 'Operation'), FALSE, TRUE),
    -- Advisory (Response time is not typically relevant)
    ('Architecture Design', (SELECT id FROM main_services WHERE name = 'Advisory'), FALSE, FALSE),
    ('Technology Assessment', (SELECT id FROM main_services WHERE name = 'Advisory'), FALSE, FALSE),
    ('Security & Performance', (SELECT id FROM main_services WHERE name = 'Advisory'), FALSE, FALSE)
ON CONFLICT (name) DO NOTHING; -- Avoid errors on re-runs

-- -----------------------------------------------------------------------------
-- ## 4. Indexes
-- -----------------------------------------------------------------------------

CREATE INDEX IF NOT EXISTS idx_services_parent_id ON services (parent_id);
CREATE INDEX IF NOT EXISTS idx_developer_service_profile_id ON developer_service (developer_profile_id);
CREATE INDEX IF NOT EXISTS idx_developer_service_project_item_id ON developer_service (project_item_id);
CREATE INDEX IF NOT EXISTS idx_developer_service_definition_id ON developer_service (service_id);


COMMIT;