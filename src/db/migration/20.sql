CREATE TABLE password_reset_token
(
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_email    VARCHAR(255) NOT NULL,
    token         TEXT         NOT NULL,
    expires_at    TIMESTAMP    NOT NULL,
    has_been_used BOOLEAN      NOT NULL DEFAULT FALSE,
    created_at    TIMESTAMP    NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_password_reset_token ON password_reset_token (token);
CREATE INDEX idx_password_reset_user_email ON password_reset_token (user_email);
