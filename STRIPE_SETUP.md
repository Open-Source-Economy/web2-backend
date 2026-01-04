# Stripe Configuration Guide

This guide explains how to configure your Stripe account to work with the Open Source Economy platform, including the newly integrated **Customer Portal** and **Subscription Synchronization**.

## 1. API Keys Configuration
Ensure your `.env` file in the `web2-backend` directory contains the correct Stripe keys.

```bash
# Stripe Secret Key (found in Dashboard -> Developers -> API keys)
STRIPE_SECRET_KEY=sk_test_...

# Stripe Webhook Secret (found in Dashboard -> Developers -> Webhooks -> [Target Webhook])
STRIPE_WEBHOOK_SECRET=whsec_...
```

## 2. Customer Portal Setup
The Stripe Customer Portal allows users to manage their billing details, download invoices, and update payment methods.

1.  **Go to the [Customer Portal Settings](https://dashboard.stripe.com/test/settings/billing/portal)** in your Stripe Dashboard.
2.  **Enable the features** you want users to have:
    - [x] **Payment methods**: Allow users to update their credit cards.
    - [x] **Invoices**: Allow users to download their past invoice PDFs.
    - [x] **Subscription management**: Allow users to cancel or switch plans (if applicable).
3.  **Configure the "Return URL"**: The platform is configured to send players back to the pricing page, but you can set a default return URL in the dashboard as a fallback.

## 3. Webhook Configuration
Webhooks are essential for keeping our database in sync with Stripe events.

1.  **Add a new endpoint** in [Developers -> Webhooks](https://dashboard.stripe.com/test/webhooks).
2.  **Endpoint URL**: `https://your-api.com/api/v1/stripe/webhook`
    - *For local development, use the [Stripe CLI](https://docs.stripe.com/stripe-cli) to forward events: `stripe listen --forward-to localhost:3001/api/v1/stripe/webhook`*
3.  **Select the following events to listen to**:
    - `checkout.session.completed` (Crucial for plan activation)
    - `invoice.paid` (Syncs payment status)
    - `customer.subscription.created`
    - `customer.subscription.updated`
    - `customer.subscription.deleted`
    - `price.created`, `price.updated`, `price.deleted`
    - `product.created`, `product.updated`, `product.deleted`

## 4. Products and Prices Mapping
To ensure the backend recognizes your plans, you **must use specific metadata** or types when creating products in Stripe.

### Plan Products
When creating a product for a subscription plan, the backend expects the `type` to match one of these values (case-insensitive in some logic, but use lowercase for safety):

- `individual_plan`
- `start_up_plan`
- `scale_up_plan`
- `enterprise_plan`

### Price Intervals
The system supports the following intervals:
- **Monthly**: Set the recurring interval to "Monthly".
- **Annually**: Set the recurring interval to "Yearly".

## 5. Testing with the CLI
To test the integration locally:
1.  Install the [Stripe CLI](https://docs.stripe.com/stripe-cli).
2.  Run `stripe login`.
3.  Run `stripe listen --forward-to localhost:3001/api/v1/stripe/webhook`.
4.  Copy the **Webhook Secret** provided by the CLI (starting with `whsec_`) and update your `.env` file.
