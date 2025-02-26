BEGIN;

ALTER TABLE stripe_price
    DROP CONSTRAINT IF EXISTS stripe_price_type_check;

ALTER TABLE stripe_price
    ADD CONSTRAINT stripe_price_type_check
        CHECK (type IN ('one_time', 'monthly', 'annually'));

ALTER TABLE stripe_product
    DROP CONSTRAINT IF EXISTS stripe_product_type_check;

ALTER TABLE stripe_product
    ADD CONSTRAINT stripe_product_type_check
        CHECK (type IN ('credit', 'donation',
                        'individual_plan', 'start_up_plan', 'scale_up_plan', 'enterprise_plan'));

COMMIT;