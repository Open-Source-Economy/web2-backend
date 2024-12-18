

import {Request, Response} from "express";
import {
    getAddressRepository,
    getStripeCustomerRepository,
    getStripeInvoiceRepository,
    getStripeProductRepository,
    getUserRepository,
} from "../../db/";
import {StatusCodes} from "http-status-codes";
import Stripe from "stripe";
import {
    CreateCustomerBody,
    CreateCustomerParams,
    CreateCustomerQuery,
    CreateCustomerResponse,
    CreatePaymentIntentBody,
    CreatePaymentIntentParams,
    CreatePaymentIntentQuery,
    CreatePaymentIntentResponse,
    CreateSubscriptionBody,
    CreateSubscriptionParams,
    CreateSubscriptionQuery,
    CreateSubscriptionResponse,
    GetDowPricesBody,
    GetDowPricesParams,
    GetDowPricesQuery,
    GetDowPricesResponse,
    ResponseBody,
} from "../../dtos";
import {StripeCustomer, StripeCustomerId, StripeInvoice, StripeProduct,} from "../../model";
import {config, logger} from "../../config";

// https://github.com/stripe-samples/subscriptions-with-card-and-direct-debit/blob/main/server/node/server.js
const userRepo = getUserRepository();

const stripe = new Stripe(config.stripe.secretKey);
const stripeInvoiceRepo = getStripeInvoiceRepository();
const stripeCustomerRepo = getStripeCustomerRepository();

const addressRepo = getAddressRepository();
const stripeProductRepo = getStripeProductRepository();

export class StripeWebhookController {

    static async webhook(req: Request, res: Response) {
        let event: Stripe.Event;
        try {
            event = stripe.webhooks.constructEvent(
                req.body,
                // @ts-ignore
                req.headers["stripe-signature"],
                config.stripe.webhookSecret,
            );
        } catch (err) {
            logger.error(`⚠️  Webhook signature verification failed.`, err);
            return res.sendStatus(StatusCodes.BAD_REQUEST);
        }

        const data = event.data;
        const eventType: string = event.type;

        // Handle the event
        // Review important events for Billing webhooks
        // https://stripe.com/docs/billing/webhooks
        // Remove comment to see the various objects sent for this sample
        // Event types: https://docs.stripe.com/api/events/types
        switch (eventType) {
            case 'checkout.session.completed':
                // Payment is successful and the subscription is created.
                // You should provision the subscription and save the customer ID to your database.
                break;
            case 'invoice.paid':
                // Continue to provision the subscription as payments continue to be made.
                // Store the status in your database and check when a user accesses your service.
                // This approach helps you avoid hitting rate limits.

                // https://docs.stripe.com/billing/subscriptions/webhooks#active-subscriptions
                const invoice = StripeInvoice.fromStripeApi(data.object);
                if (invoice instanceof Error) {
                    throw invoice;
                }

                logger.debug(`🔔  Webhook received: ${eventType}!`);

                await stripeInvoiceRepo.insert(invoice);
                break;

                break;
            case 'invoice.payment_failed':
                // The payment failed or the customer does not have a valid payment method.
                // The subscription becomes past_due. Notify your customer and send them to the
                // customer portal to update their payment information.
                break;


            case "payment_intent.succeeded":
                // Cast the event into a PaymentIntent to make use of the types.
                // const pi: Stripe.PaymentIntent = data.object as Stripe.PaymentIntent;
                // Funds have been captured
                // Fulfill any orders, e-mail receipts, etc
                // To cancel the payment after capture you will need to issue a Refund (https://stripe.com/docs/api/refunds).
                logger.debug(`🔔  Webhook received: ${data.object}!`);
                logger.debug("💰 Payment captured!");
                break;

            case "payment_intent.payment_failed":
                // const paymentIntent = data as Stripe.PaymentIntent.DA;
                logger.debug(`🔔  Webhook received: ${data.object}!`);
                logger.debug("❌ Payment failed.");
                break;
            default:
        }

        res.sendStatus(StatusCodes.OK);
    }
}
