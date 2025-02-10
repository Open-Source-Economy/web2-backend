CREATE TABLE IF NOT EXISTS newsletter_subscription
(
    email      VARCHAR(255) PRIMARY KEY NOT NULL,
    created_at TIMESTAMP    NOT NULL DEFAULT now(),
    updated_at TIMESTAMP    NOT NULL DEFAULT now()
);