---------------------
--- Stripe tables ---
---------------------

CREATE TABLE IF NOT EXISTS stripe_customer
(
    id         UUID        NOT NULL DEFAULT gen_random_uuid(),
    stripe_id  VARCHAR(50) NOT NULL PRIMARY KEY,
    user_id    UUID        NOT NULL,

    created_at TIMESTAMP   NOT NULL DEFAULT now(),
    updated_at TIMESTAMP   NOT NULL DEFAULT now(),

    CONSTRAINT fk_user FOREIGN KEY (user_id) REFERENCES app_user (id) ON DELETE CASCADE
);

-- example: represent the product 0.001 DoW
CREATE TABLE IF NOT EXISTS stripe_product
(
    id         UUID        NOT NULL DEFAULT gen_random_uuid(),
    stripe_id  VARCHAR(50) NOT NULL PRIMARY KEY,
    type       VARCHAR(50) NOT NULL CHECK (type IN ('milli_dow', 'donation')),

    created_at TIMESTAMP   NOT NULL DEFAULT now(),
    updated_at TIMESTAMP   NOT NULL DEFAULT now() -- Removed trailing comma
);

CREATE TABLE IF NOT EXISTS stripe_invoice
(
    id                 UUID         NOT NULL DEFAULT gen_random_uuid(),
    stripe_id          VARCHAR(50)  NOT NULL PRIMARY KEY,
    customer_id        VARCHAR(50)  NOT NULL,
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

    CONSTRAINT fk_customer FOREIGN KEY (customer_id) REFERENCES stripe_customer (stripe_id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS stripe_invoice_line
(
    id          UUID        NOT NULL DEFAULT gen_random_uuid(),
    stripe_id   VARCHAR(50) NOT NULL PRIMARY KEY,
    invoice_id  VARCHAR(50) NOT NULL,
    customer_id VARCHAR(50) NOT NULL,
    product_id  VARCHAR(50) NOT NULL,
    price_id    VARCHAR(50) NOT NULL,
    quantity    INTEGER     NOT NULL, -- Quantity of the product

    created_at  TIMESTAMP   NOT NULL DEFAULT now(),
    updated_at  TIMESTAMP   NOT NULL DEFAULT now(),

    CONSTRAINT fk_invoice FOREIGN KEY (invoice_id) REFERENCES stripe_invoice (stripe_id) ON DELETE CASCADE,
    CONSTRAINT fk_customer FOREIGN KEY (customer_id) REFERENCES stripe_customer (stripe_id) ON DELETE CASCADE,
    CONSTRAINT fk_product FOREIGN KEY (product_id) REFERENCES stripe_product (stripe_id) ON DELETE CASCADE,

    CONSTRAINT positive_quantity CHECK (quantity > 0)
);