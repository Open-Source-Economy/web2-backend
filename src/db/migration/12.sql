-- Developer onboarding tables migration
-- Migration 12: Developer profile, projects, income preferences, availability, and services

-- First, add terms_accepted to app_user (all users need to accept terms)
ALTER TABLE app_user 
ADD COLUMN IF NOT EXISTS terms_accepted BOOLEAN NOT NULL DEFAULT FALSE;

-- Developer profile (tracks which users are developers and their onboarding status)
-- Removed duplicates: name, email (already in app_user), github_username (redundant with github_owner_login)
-- Moved terms_accepted to app_user (all users need this)
-- Kept onboarding_completed here (only developers have onboarding)
CREATE TABLE IF NOT EXISTS developer_profile (
    id UUID PRIMARY KEY NOT NULL DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL UNIQUE,
    onboarding_completed BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP NOT NULL DEFAULT now(),
    updated_at TIMESTAMP NOT NULL DEFAULT now(),
    
    CONSTRAINT fk_developer_profile_user_id FOREIGN KEY (user_id) REFERENCES app_user (id) ON DELETE CASCADE
);

-- Developer projects (both GitHub and manual)
CREATE TABLE IF NOT EXISTS developer_project (
    id UUID PRIMARY KEY NOT NULL DEFAULT gen_random_uuid(),
    developer_profile_id UUID NOT NULL,
    project_type VARCHAR(20) NOT NULL CHECK (project_type IN ('github', 'manual')),
    
    -- GitHub project fields
    github_org VARCHAR(255),
    github_repo VARCHAR(255),
    
    -- Manual project fields
    project_name VARCHAR(255),
    project_url VARCHAR(500),
    
    -- Common fields
    role VARCHAR(50) NOT NULL CHECK (role IN ('creator_founder', 'project_lead', 'core_developer', 'maintainer')),
    merge_rights VARCHAR(50) NOT NULL CHECK (merge_rights IN ('full_rights', 'specific_areas', 'no_rights', 'formal_process')),
    
    created_at TIMESTAMP NOT NULL DEFAULT now(),
    updated_at TIMESTAMP NOT NULL DEFAULT now(),
    
    CONSTRAINT fk_developer_project_profile_id FOREIGN KEY (developer_profile_id) REFERENCES developer_profile (id) ON DELETE CASCADE,
    CONSTRAINT chk_github_project CHECK (
        (project_type = 'github' AND github_org IS NOT NULL AND github_repo IS NOT NULL AND project_name IS NULL AND project_url IS NULL) OR
        (project_type = 'manual' AND github_org IS NULL AND github_repo IS NULL AND project_name IS NOT NULL AND project_url IS NOT NULL)
    )
);

-- Income preferences
CREATE TABLE IF NOT EXISTS developer_income_preference (
    id UUID PRIMARY KEY NOT NULL DEFAULT gen_random_uuid(),
    developer_profile_id UUID NOT NULL UNIQUE,
    income_type VARCHAR(20) NOT NULL CHECK (income_type IN ('royalties', 'services', 'donations')),
    
    created_at TIMESTAMP NOT NULL DEFAULT now(),
    updated_at TIMESTAMP NOT NULL DEFAULT now(),
    
    CONSTRAINT fk_developer_income_profile_id FOREIGN KEY (developer_profile_id) REFERENCES developer_profile (id) ON DELETE CASCADE
);

-- Availability and rates
CREATE TABLE IF NOT EXISTS developer_availability (
    id UUID PRIMARY KEY NOT NULL DEFAULT gen_random_uuid(),
    developer_profile_id UUID NOT NULL UNIQUE,
    weekly_commitment INTEGER NOT NULL CHECK (weekly_commitment > 0),
    larger_opportunities VARCHAR(10) NOT NULL CHECK (larger_opportunities IN ('yes', 'maybe', 'no')),
    hourly_rate DECIMAL(10,2) NOT NULL CHECK (hourly_rate > 0),
    currency VARCHAR(10) NOT NULL DEFAULT 'USD',
    
    created_at TIMESTAMP NOT NULL DEFAULT now(),
    updated_at TIMESTAMP NOT NULL DEFAULT now(),
    
    CONSTRAINT fk_developer_availability_profile_id FOREIGN KEY (developer_profile_id) REFERENCES developer_profile (id) ON DELETE CASCADE
);

-- Service categories
CREATE TABLE IF NOT EXISTS service_category (
    id UUID PRIMARY KEY NOT NULL DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL UNIQUE,
    parent_category VARCHAR(100),
    has_response_time BOOLEAN NOT NULL DEFAULT FALSE,
    
    created_at TIMESTAMP NOT NULL DEFAULT now(),
    updated_at TIMESTAMP NOT NULL DEFAULT now()
);

-- Developer services
CREATE TABLE IF NOT EXISTS developer_service (
    id UUID PRIMARY KEY NOT NULL DEFAULT gen_random_uuid(),
    developer_profile_id UUID NOT NULL,
    service_category_id UUID NOT NULL,
    service_name VARCHAR(200),
    hourly_rate DECIMAL(10,2) NOT NULL CHECK (hourly_rate > 0),
    currency VARCHAR(10) NOT NULL DEFAULT 'USD',
    response_time_hours INTEGER DEFAULT 12,
    
    created_at TIMESTAMP NOT NULL DEFAULT now(),
    updated_at TIMESTAMP NOT NULL DEFAULT now(),
    
    CONSTRAINT fk_developer_service_profile_id FOREIGN KEY (developer_profile_id) REFERENCES developer_profile (id) ON DELETE CASCADE,
    CONSTRAINT fk_developer_service_category_id FOREIGN KEY (service_category_id) REFERENCES service_category (id) ON DELETE CASCADE
);

-- Projects associated with services (many-to-many)
CREATE TABLE IF NOT EXISTS service_project (
    id UUID PRIMARY KEY NOT NULL DEFAULT gen_random_uuid(),
    developer_service_id UUID NOT NULL,
    developer_project_id UUID NOT NULL,
    
    created_at TIMESTAMP NOT NULL DEFAULT now(),
    
    CONSTRAINT fk_service_project_service_id FOREIGN KEY (developer_service_id) REFERENCES developer_service (id) ON DELETE CASCADE,
    CONSTRAINT fk_service_project_project_id FOREIGN KEY (developer_project_id) REFERENCES developer_project (id) ON DELETE CASCADE,
    
    UNIQUE(developer_service_id, developer_project_id)
);

-- Indexes for better performance
CREATE INDEX IF NOT EXISTS idx_developer_profile_user_id ON developer_profile(user_id);
CREATE INDEX IF NOT EXISTS idx_developer_project_profile_id ON developer_project(developer_profile_id);
CREATE INDEX IF NOT EXISTS idx_developer_project_github ON developer_project(github_org, github_repo) WHERE project_type = 'github';
CREATE INDEX IF NOT EXISTS idx_developer_income_profile_id ON developer_income_preference(developer_profile_id);
CREATE INDEX IF NOT EXISTS idx_developer_availability_profile_id ON developer_availability(developer_profile_id);
CREATE INDEX IF NOT EXISTS idx_developer_service_profile_id ON developer_service(developer_profile_id);
CREATE INDEX IF NOT EXISTS idx_developer_service_category_id ON developer_service(service_category_id);
CREATE INDEX IF NOT EXISTS idx_service_project_service_id ON service_project(developer_service_id);
CREATE INDEX IF NOT EXISTS idx_service_project_project_id ON service_project(developer_project_id);

-- Update the migration tracking if it exists
-- INSERT INTO migration_version (version) VALUES (12) ON CONFLICT DO NOTHING;