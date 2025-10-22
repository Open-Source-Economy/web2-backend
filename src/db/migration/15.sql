
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

COMMIT;

