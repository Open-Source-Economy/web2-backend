---------------------
--- Stripe tables ---
---------------------

CREATE TABLE IF NOT EXISTS stripe_customer_user
(
    id         UUID        NOT NULL DEFAULT gen_random_uuid(),
    stripe_customer_id  VARCHAR(50) NOT NULL PRIMARY KEY,
    user_id    UUID        NOT NULL,
    company_id UUID,
    created_at TIMESTAMP   NOT NULL DEFAULT now(),
    updated_at TIMESTAMP   NOT NULL DEFAULT now(),

    CONSTRAINT fk_user FOREIGN KEY (user_id) REFERENCES app_user (id) ON DELETE CASCADE,
    CONSTRAINT fk_company FOREIGN KEY (company_id) REFERENCES company (id) ON DELETE CASCADE,
    CONSTRAINT fk_user_company FOREIGN KEY (user_id, company_id) REFERENCES user_company (user_id, company_id) ON DELETE CASCADE
);

-- example: represent the product 0.001 DoW or a donation
CREATE TABLE IF NOT EXISTS stripe_product
(
    id                     UUID        NOT NULL DEFAULT gen_random_uuid(),
    stripe_id              VARCHAR(50) NOT NULL PRIMARY KEY,
    type                   VARCHAR(50) NOT NULL CHECK (type IN ('milli_dow', 'donation')),

    github_owner_id        BIGINT,
    github_owner_login     VARCHAR(255),

    github_repository_id   BIGINT,
    github_repository_name VARCHAR(255),

    CONSTRAINT fk_github_owner_id FOREIGN KEY (github_owner_id) REFERENCES github_owner (github_id) ON DELETE RESTRICT,
    CONSTRAINT fk_github_repository_id FOREIGN KEY (github_repository_id) REFERENCES github_repository (github_id) ON DELETE RESTRICT,

    CONSTRAINT fk_github_owner_login FOREIGN KEY (github_owner_login) REFERENCES github_owner (github_login) ON DELETE RESTRICT,
    CONSTRAINT fk_github_repository FOREIGN KEY (github_owner_login, github_repository_name) REFERENCES github_repository (github_owner_login, github_name) ON DELETE RESTRICT,

    CONSTRAINT unique_type_per_repo UNIQUE (github_owner_login, github_repository_name, type),

    created_at             TIMESTAMP   NOT NULL DEFAULT now(),
    updated_at             TIMESTAMP   NOT NULL DEFAULT now() -- Removed trailing comma
);

CREATE TABLE IF NOT EXISTS stripe_price
(
    id          UUID        NOT NULL DEFAULT gen_random_uuid(),
    stripe_id   VARCHAR(50) NOT NULL PRIMARY KEY,
    product_id  VARCHAR(50) NOT NULL,
    unit_amount INTEGER     NOT NULL, -- Amount in cents
    currency    VARCHAR(10) NOT NULL,
    active      BOOLEAN     NOT NULL,
    type        VARCHAR(50) NOT NULL CHECK (type IN ('monthly', 'one_time')),

    created_at  TIMESTAMP   NOT NULL DEFAULT now(),
    updated_at  TIMESTAMP   NOT NULL DEFAULT now(),

    CONSTRAINT fk_product FOREIGN KEY (product_id) REFERENCES stripe_product (stripe_id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS stripe_invoice
(
    id                 UUID         NOT NULL DEFAULT gen_random_uuid(),
    stripe_id          VARCHAR(50)  NOT NULL PRIMARY KEY,
    stripe_customer_id        VARCHAR(50)  NOT NULL,
    paid               BOOLEAN      NOT NULL,
    account_country    VARCHAR(255) NOT NULL,
    currency           VARCHAR(10)  NOT NULL,
    total              NUMERIC      NOT NULL,
    total_excl_tax     NUMERIC      NOT NULL,
    subtotal           NUMERIC      NOT NULL,
    subtotal_excl_tax  NUMERIC      NOT NULL,
    hosted_invoice_url TEXT         NOT NULL,
    invoice_pdf        TEXT         NOT NULL,

    created_at         TIMESTAMP    NOT NULL DEFAULT now(),
    updated_at         TIMESTAMP    NOT NULL DEFAULT now(),

    CONSTRAINT fk_customer FOREIGN KEY (stripe_customer_id) REFERENCES stripe_customer_user (stripe_customer_id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS stripe_invoice_line
(
    id          UUID        NOT NULL DEFAULT gen_random_uuid(),
    stripe_id   VARCHAR(50) NOT NULL PRIMARY KEY,
    invoice_id  VARCHAR(50) NOT NULL,
    stripe_customer_id VARCHAR(50) NOT NULL,
    product_id  VARCHAR(50) NOT NULL,
    price_id    VARCHAR(50) NOT NULL,
    quantity    INTEGER     NOT NULL, -- Quantity of the product

    created_at  TIMESTAMP   NOT NULL DEFAULT now(),
    updated_at  TIMESTAMP   NOT NULL DEFAULT now(),

    CONSTRAINT fk_invoice FOREIGN KEY (invoice_id) REFERENCES stripe_invoice (stripe_id) ON DELETE CASCADE,
    CONSTRAINT fk_customer FOREIGN KEY (stripe_customer_id) REFERENCES stripe_customer_user (stripe_customer_id) ON DELETE CASCADE,
    CONSTRAINT fk_product FOREIGN KEY (product_id) REFERENCES stripe_product (stripe_id) ON DELETE CASCADE,
    CONSTRAINT fk_price FOREIGN KEY (price_id) REFERENCES stripe_price (stripe_id) ON DELETE CASCADE,

    CONSTRAINT positive_quantity CHECK (quantity > 0)
);