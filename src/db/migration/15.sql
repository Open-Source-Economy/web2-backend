
BEGIN;

-- Add new columns to github_owner table to store additional GitHub user/organization information
ALTER TABLE github_owner
    ADD COLUMN github_followers INTEGER,
    ADD COLUMN github_following INTEGER,
    ADD COLUMN github_public_repos INTEGER,
    ADD COLUMN github_public_gists INTEGER,
    ADD COLUMN github_name VARCHAR(255),
    ADD COLUMN github_twitter_username VARCHAR(255),
    ADD COLUMN github_company VARCHAR(255),
    ADD COLUMN github_blog VARCHAR(510),
    ADD COLUMN github_location VARCHAR(255),
    ADD COLUMN github_email VARCHAR(255);

-- Add new columns to github_repository table to store additional GitHub repository information
ALTER TABLE github_repository
    ADD COLUMN github_homepage VARCHAR(510),
    ADD COLUMN github_language VARCHAR(100),
    ADD COLUMN github_forks_count INTEGER,
    ADD COLUMN github_stargazers_count INTEGER,
    ADD COLUMN github_watchers_count INTEGER,
    ADD COLUMN github_full_name VARCHAR(510),
    ADD COLUMN github_fork BOOLEAN,
    ADD COLUMN github_topics TEXT[],
    ADD COLUMN github_open_issues_count INTEGER,
    ADD COLUMN github_visibility VARCHAR(50),
    ADD COLUMN github_subscribers_count INTEGER,
    ADD COLUMN github_network_count INTEGER;

COMMIT;

