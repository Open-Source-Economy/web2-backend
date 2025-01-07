import { Request, Response } from "express";
import { StatusCodes } from "http-status-codes";
import Stripe from "stripe";
import { StripeInvoice } from "../../model";
import { config, logger } from "../../config";
import { stripe } from "./index";
import { stripeInvoiceRepo } from "../../db";

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

    logger.debug(`🔔  Webhook received an event of type: ${eventType}!`);
    logger.debug(`🔔  Webhook received: ${data.object}!`);

    // Handle the event
    // Review important events for Billing webhooks
    // https://stripe.com/docs/billing/webhooks
    // Remove comment to see the various objects sent for this sample
    // Event types: https://docs.stripe.com/api/events/types
    switch (eventType) {
      case "checkout.session.completed":
        // Stripe comments:
        // Payment is successful and the subscription is created.
        // You should provision the subscription and save the customer ID to your database.

        // We already save the customer ID to our database when the customer is created.
        // => Do nothing here.
        break;
      case "invoice.paid":
        // Stripe comments:
        // Continue to provision the subscription as payments continue to be made.
        // Store the status in your database and check when a user accesses your service.
        // This approach helps you avoid hitting rate limits.

        // https://docs.stripe.com/billing/subscriptions/webhooks#active-subscriptions
        const invoice = StripeInvoice.fromStripeApi(data.object);
        if (invoice instanceof Error) {
          throw invoice;
        }

        await stripeInvoiceRepo.insert(invoice);
        break;
      case "invoice.payment_failed":
        // Stripe comments:
        // The payment failed or the customer does not have a valid payment method.
        // The subscription becomes past_due. Notify your customer and send them to the
        // customer portal to update their payment information.
        break;

      case "payment_intent.succeeded":
        // Stripe comments:
        // Cast the event into a PaymentIntent to make use of the types.
        // const pi: Stripe.PaymentIntent = data.object as Stripe.PaymentIntent;
        // Funds have been captured
        // Fulfill any orders, e-mail receipts, etc
        // To cancel the payment after capture you will need to issue a Refund (https://stripe.com/docs/api/refunds).
        logger.debug("💰 Payment captured!");
        break;

      case "payment_intent.payment_failed":
        // Stripe comments:
        // const paymentIntent = data as Stripe.PaymentIntent.DA;
        logger.debug("❌ Payment failed.");
        break;
      default:
    }

    res.sendStatus(StatusCodes.OK);
  }
}
