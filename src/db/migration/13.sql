-- SQL Migration: Developer Onboarding Schema
-- This script sets up the necessary types, tables, and indexes for the developer profile.
-- It is designed to be run as a single atomic transaction.
-- This version has been modified to reflect a new, flattened 'services' table structure.

BEGIN;

-- -----------------------------------------------------------------------------
-- ## 1. Custom Data Types (ENUMs)
-- -----------------------------------------------------------------------------

CREATE TYPE developer_role_type AS ENUM (
    'none',
    'occasional_contributor',
    'active_contributor',
    'committer',
    'maintainer',
    'core_team_member',
    'founder',
    'board_member',
    'steering_committee_member',
    'project_lead',
    'working_group_chair',
    'benevolent_dictator_for_life',
    'asf_contributor',
    'asf_committer',
    'asf_pmc_member',
    'lf_governing_board_member',
    'tsc_member',
    'cncf_toc_member',
    'linux_foundation_fellow',
    'strategic_member',
    'contributing_member',
    'associate_member'
    );

CREATE TYPE merge_rights_type AS ENUM (
    'none',
    'reviewer',
    'limited',
    'maintainer',-- note: not used in API type
    'full_committer',
    'subsystem_maintainer',-- note: not used in API type
    'delegated_committer',-- note: not used in API type
    'vote_based_committer',
    'release_manager',
    'emeritus'
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
    'usd',
    'eur',
    'gbp',
    'chf'
    );

CREATE TYPE response_time_type AS ENUM (
    'none',
    '4_hours',
    '12_hours',
    '1_business_day',
    '2_business_day',
    '3_business_day',
    '4_business_day',
    '5_business_day',
    '7_business_day'
    );

-- New enum type for the flattened services table.
CREATE TYPE service_type AS ENUM (
    'support',
    'development',
    'advisory',
    'security_and_compliance',
    'custom'
    );


-- -----------------------------------------------------------------------------
-- ## 2. Developer Onboarding Tables
-- -----------------------------------------------------------------------------

-- Developer profile links a user to their developer-specific data.
CREATE TABLE IF NOT EXISTS developer_profile
(
    id                   UUID PRIMARY KEY NOT NULL DEFAULT gen_random_uuid(),
    user_id              UUID             NOT NULL UNIQUE,
    contact_email        VARCHAR(255)     NOT NULL,
    onboarding_completed BOOLEAN          NOT NULL DEFAULT FALSE,
    created_at           TIMESTAMP        NOT NULL DEFAULT now(),
    updated_at           TIMESTAMP        NOT NULL DEFAULT now(),
    CONSTRAINT fk_developer_profile_user FOREIGN KEY (user_id) REFERENCES app_user (id) ON DELETE CASCADE
);

-- Consolidated settings table for a developer's preferences.
CREATE TABLE IF NOT EXISTS developer_settings
(
    id                                UUID PRIMARY KEY NOT NULL DEFAULT gen_random_uuid(),
    developer_profile_id              UUID             NOT NULL UNIQUE,
    income_streams                    income_stream_type[],
    hourly_weekly_commitment          INTEGER CHECK (hourly_weekly_commitment BETWEEN 1 AND 80),
    hourly_weekly_commitment_comment  TEXT,
    open_to_other_opportunity         open_to_other_opportunity_type,
    open_to_other_opportunity_comment TEXT,
    hourly_rate                       DECIMAL(10, 2) CHECK (hourly_rate BETWEEN 1 AND 1000),
    hourly_rate_comment               TEXT,
    currency                          currency_type,
    created_at                        TIMESTAMP        NOT NULL DEFAULT now(),
    updated_at                        TIMESTAMP        NOT NULL DEFAULT now(),
    CONSTRAINT fk_developer_settings_profile FOREIGN KEY (developer_profile_id) REFERENCES developer_profile (id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS developer_project_items
(
    id                   UUID PRIMARY KEY      NOT NULL DEFAULT gen_random_uuid(),
    developer_profile_id UUID                  NOT NULL,
    project_item_id      UUID                  NOT NULL,
    merge_rights         merge_rights_type[]   NOT NULL,
    roles                developer_role_type[] NOT NULL,
    comment              TEXT,
    created_at           TIMESTAMP             NOT NULL DEFAULT now(),
    updated_at           TIMESTAMP             NOT NULL DEFAULT now(),
    CONSTRAINT unique_developer_project UNIQUE (developer_profile_id, project_item_id),
    CONSTRAINT fk_developer_service_profile FOREIGN KEY (developer_profile_id) REFERENCES developer_profile (id) ON DELETE CASCADE,
    CONSTRAINT fk_developer_service_project_item FOREIGN KEY (project_item_id) REFERENCES project_item (id) ON DELETE CASCADE
);

-- This single table now holds all service definitions in a flattened structure.
CREATE TABLE IF NOT EXISTS services
(
    id                UUID PRIMARY KEY      DEFAULT gen_random_uuid(),
    service_type      service_type,
    name              VARCHAR(255) NOT NULL UNIQUE,
    description       TEXT,
    is_custom         BOOLEAN      NOT NULL,
    -- This flag indicates if a response time is relevant for this service.
    has_response_time BOOLEAN      NOT NULL,
    created_at        TIMESTAMP    NOT NULL DEFAULT now(),
    updated_at        TIMESTAMP    NOT NULL DEFAULT now()
);

-- Services offered by developers (renamed from developer_service to developer_service)
CREATE TABLE IF NOT EXISTS developer_service
(
    id                   UUID PRIMARY KEY NOT NULL DEFAULT gen_random_uuid(),
    developer_profile_id UUID             NOT NULL,
    service_id           UUID             NOT NULL,
    hourly_rate          DECIMAL(10, 2) CHECK (hourly_rate BETWEEN 1 AND 1000),
    response_time_type   response_time_type,
    comment              TEXT,
    created_at           TIMESTAMP        NOT NULL DEFAULT now(),
    updated_at           TIMESTAMP        NOT NULL DEFAULT now(),


    CONSTRAINT unique_developer_service UNIQUE (developer_profile_id, service_id),
    CONSTRAINT fk_developer_service_profile FOREIGN KEY (developer_profile_id) REFERENCES developer_profile (id) ON DELETE CASCADE,
    CONSTRAINT fk_developer_service_definition FOREIGN KEY (service_id) REFERENCES services (id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS developer_service_developer_project_item_link
(
    developer_service_id      UUID NOT NULL,
    developer_project_item_id UUID NOT NULL,
    PRIMARY KEY (developer_service_id, developer_project_item_id), -- Composite primary key for uniqueness
    CONSTRAINT fk_developer_service_id FOREIGN KEY (developer_service_id) REFERENCES developer_service (id) ON DELETE CASCADE,
    CONSTRAINT fk_developer_project_item_id FOREIGN KEY (developer_project_item_id) REFERENCES developer_project_items (id) ON DELETE CASCADE
);


-- -----------------------------------------------------------------------------
-- ## 3. Data Population for Predefined Services
-- -----------------------------------------------------------------------------

-- Insert services using the new, flattened structure.
INSERT INTO services (service_type, name, description, is_custom, has_response_time)
VALUES
    -- support services
    ('support',
     'Technical Support',
     'Respond to technical questions.',
     FALSE, TRUE),
    ('support',
     'Customer Support',
     'Respond to general questions.',
     FALSE, TRUE),
    ('support',
     'Operational Support',
     'Assist with deployment, performance issues, or reliability concerns.',
     FALSE, TRUE),
    ('support',
     'Long Supported Version',
     'Provide long-term support for a specific version of the project.',
     FALSE, FALSE),

    -- development services
    ('development',
     'Bug Fixing',
     'Prioritize addressing issues.',
     FALSE, FALSE),
    ('development',
     'New Feature',
     'Development of additional features in a oss project.',
     FALSE, FALSE),
    ('development',
     'Documentation',
     'Development of additional features in a oss project.',
     FALSE, FALSE),
    ('development',
     'OSS Plugin / Library',
     'Create and open-source new plugins or libraries.',
     FALSE, FALSE),
    ('development',
     'Legacy System Migration',
     'Help enterprises migrate their systems.',
     FALSE, FALSE),

    -- advisory services
    ('advisory',
     'Architectural & Performance Consulting',
     'Expert guidance on designing scalable and high-performance solutions.',
     FALSE, FALSE),
    ('advisory',
     'Roadmap & Strategy Workshops',
     'Collaborative sessions to align enterprise needs with project roadmap.',
     FALSE, FALSE),
    ('advisory',
     'Developer Mentorship',
     'Personalized mentorship and guidance for enterprise development teams.',
     FALSE, FALSE),
    ('advisory',
     'Training',
     'Customized training for enterprise teams.',
     FALSE, FALSE),
    ('advisory',
     'Speaking Engagements',
     'Provide talks and presentations at conferences, ' ||
     'meetups, ' ||
     'or internal company events.',
     FALSE, FALSE),

    -- security and compliance services
    ('security_and_compliance',
     'Security Audits',
     'In-depth security analysis and review of the project and its dependencies.',
     FALSE, FALSE),
    ('security_and_compliance',
     'VEX Reports',
     'Generate VEX (Vulnerability Exploitability eXchange) reports for the project.',
     FALSE, FALSE),
    ('security_and_compliance',
     'CVE Management',
     'Assistance with tracking and managing CVEs (Common Vulnerabilities and Exposures).',
     FALSE, FALSE),
    ('security_and_compliance',
     'Compliance Consulting',
     'Consulting on compliance with regulations like the EU Cyber Resilience Act.',
     FALSE, FALSE),
    ('security_and_compliance',
     'Secure Code Review',
     'Detailed review of code for security vulnerabilities and weaknesses.',
     FALSE, FALSE),
    ('security_and_compliance',
     'Threat Modeling',
     'Identify and prioritize potential threats to the project and its ecosystem.',
     FALSE, FALSE)
--        ('security_and_compliance',
--        'Incident Response',
--        'Assistance with responding to and mitigating security incidents.',
--        FALSE, TRUE)

ON CONFLICT (name) DO NOTHING;

-- -----------------------------------------------------------------------------
-- ## 4. Indexes
-- -----------------------------------------------------------------------------

-- B-tree indexes for foreign keys and frequent lookups.
CREATE INDEX IF NOT EXISTS idx_developer_profile_user_id ON developer_profile (user_id);
CREATE INDEX IF NOT EXISTS idx_developer_settings_profile_id ON developer_settings (developer_profile_id);

-- Add a B-tree index on the services table to speed up lookups by service type.
CREATE INDEX IF NOT EXISTS idx_services_service_type ON services (service_type);

-- Use GIN indexes for array columns on developer_project_items.
-- GIN indexes are a must-have for efficiently searching for elements within an array.
CREATE INDEX IF NOT EXISTS idx_developer_project_items_roles ON developer_project_items USING GIN (roles);
CREATE INDEX IF NOT EXISTS idx_developer_project_items_merge_rights ON developer_project_items USING GIN (merge_rights);


COMMIT;
