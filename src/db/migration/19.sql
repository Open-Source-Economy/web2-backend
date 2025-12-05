-- SQL Migration: Create sponsor table
-- This migration creates a table to link stripe_customer_id with GitHub owner sponsor information
-- Currently only supports github_owner sponsor type

BEGIN;

CREATE TABLE IF NOT EXISTS sponsor
(
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    stripe_customer_id VARCHAR(50) NOT NULL,
    github_owner_id BIGINT NOT NULL,
    github_owner_login VARCHAR(255) NOT NULL,
    is_public BOOLEAN NOT NULL DEFAULT true,
    
    created_at TIMESTAMP NOT NULL DEFAULT now(),
    updated_at TIMESTAMP NOT NULL DEFAULT now(),
    
    CONSTRAINT fk_stripe_customer FOREIGN KEY (stripe_customer_id) REFERENCES stripe_customer (stripe_id) ON DELETE CASCADE,
    CONSTRAINT fk_github_owner_id FOREIGN KEY (github_owner_id) REFERENCES github_owner (github_id) ON DELETE RESTRICT,
    CONSTRAINT fk_github_owner_login FOREIGN KEY (github_owner_login) REFERENCES github_owner (github_login) ON DELETE RESTRICT,
    CONSTRAINT unique_sponsor_per_customer UNIQUE (stripe_customer_id, github_owner_login)
);

COMMIT;
