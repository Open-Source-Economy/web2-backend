import { Request, Response } from "express";
import { StatusCodes } from "http-status-codes";
import Stripe from "stripe";
import {
  Address,
  StripeCustomer,
  StripeCustomerId,
  StripeInvoice,
  StripePrice,
} from "../../model";
import { config, logger } from "../../config";
import { stripe } from "./index";
import {
  addressRepo,
  stripeCustomerRepo,
  stripeInvoiceRepo,
  stripePriceRepo,
} from "../../db";
import { ValidationError } from "../../model/error";
import { CreateAddressBody } from "../../dtos";

export class StripeWebhookController {
  static async webhook(req: Request, res: Response) {
    let event: Stripe.Event;
    try {
      event = stripe.webhooks.constructEvent(
        req.body,
        req.headers["stripe-signature"] as string,
        config.stripe.webhookSecret,
      );
    } catch (err) {
      logger.error(`⚠️  Webhook signature verification failed.`, err);
      return res.sendStatus(StatusCodes.BAD_REQUEST);
    }

    const data = event.data;
    const object = data.object;
    const eventType: string = event.type;

    logger.debug(`🔔  Webhook received an event of type: ${eventType}!`);
    logger.debug(`🔔  Webhook data:`, data);

    try {
      // Handle the event
      // Review important events for Billing webhooks
      // https://stripe.com/docs/billing/webhooks
      // Remove comment to see the various objects sent for this sample
      // Event types: https://docs.stripe.com/api/events/types
      switch (eventType) {
        // TODO: https://docs.stripe.com/checkout/fulfillment?payment-ui=embedded-form#create-payment-event-handler
        case "checkout.session.completed": {
          logger.debug("🔔 checkout.session.completed, starting!");
          await StripeWebhookController.checkoutSessionCompleted(
            event.data.object as Stripe.Checkout.Session,
          );
          logger.debug("🔔 checkout.session.completed, done!");
          break;
        }

        case "invoice.paid": {
          logger.debug(`🔔 invoice.paid, starting!`);
          await StripeWebhookController.invoicePaid(object as Stripe.Invoice);
          logger.debug(`🔔 invoice.paid, done!`);
          break;
        }

        case "invoice.payment_failed":
          // TODO: Implement payment failure handling
          break;

        case "payment_intent.succeeded": {
          const paymentIntent = data.object as Stripe.PaymentIntent;
          logger.debug(
            `💰 Payment captured for amount: ${paymentIntent.amount}!`,
          );
          break;
        }

        case "payment_intent.payment_failed": {
          const paymentIntent = data.object as Stripe.PaymentIntent;
          logger.debug(`❌ Payment failed for amount: ${paymentIntent.amount}`);
          break;
        }

        case "price.created": {
          const price = data.object as Stripe.Price;
          logger.debug(`🔔 price.created`, price);
          await StripeWebhookController.createOrUpdateStripePrice(price);
          break;
        }

        case "price.updated": {
          const price = data.object as Stripe.Price;
          logger.debug(`🔔 price.updated`, price);
          await StripeWebhookController.createOrUpdateStripePrice(price);
          break;
        }

        case "price.deleted": {
          const price = data.object as Stripe.Price;
          logger.debug(`🔔 price.deleted`, price);
          await StripeWebhookController.createOrUpdateStripePrice(price);
          break;
        }
      }

      res.sendStatus(StatusCodes.OK);
    } catch (error) {
      logger.error("Error processing webhook:", error);
      res.sendStatus(StatusCodes.INTERNAL_SERVER_ERROR);
    }
  }

  static async checkoutSessionCompleted(session: Stripe.Checkout.Session) {
    // Stripe comments:
    // Payment is successful and the subscription is created.
    // You should provision the subscription and save the customer ID to your database.

    const email = session.customer_details?.email ?? session.customer_email;
    const currency = session.currency ?? undefined;

    const stripeCustomerId: StripeCustomerId | null = session.customer
      ? new StripeCustomerId(
          typeof session.customer === "string"
            ? session.customer
            : session.customer.id, // based on testing, it should be a string
        )
      : null;

    if (stripeCustomerId) {
      const stripeCustomerUser =
        await stripeCustomerRepo.getByStripeId(stripeCustomerId);

      if (stripeCustomerUser !== null) {
        logger.debug(
          `🔔 Stripe customer, already registered: ${stripeCustomerUser?.stripeId.id}`,
        );
      } else {
        logger.debug(
          `🔔 Stripe customer creation, not registered: ${stripeCustomerId}`,
        );
        await StripeWebhookController.saveAddressAndStripeCustomer(
          stripeCustomerId,
          email,
          session.customer_details,
          currency,
        );
      }
    } else {
      if (email === null) {
        logger.error("No email in checkout session");
        throw new Error("No email in checkout session");
      } else {
        logger.debug(`🔔  Email in checkout session: ${email}`);
        const stripeCustomer = await stripeCustomerRepo.getByEmail(email);

        if (stripeCustomer) {
          logger.debug(
            `🔔  Stripe customer, already registered with email ${email}:`,
            stripeCustomer,
          );
        } else {
          logger.debug(
            `🔔  Stripe customer, not registered with email ${email}`,
          );
          const customerId =
            await StripeWebhookController.createAddressAndStripeCustomer(
              email,
              session.customer_details,
            );
          await StripeWebhookController.saveAddressAndStripeCustomer(
            customerId,
            email,
            session.customer_details,
            currency,
          );
        }
      }
    }
  }

  private static async createAddressAndStripeCustomer(
    email: string | null,
    customerDetails: Stripe.Checkout.Session.CustomerDetails | null,
  ): Promise<StripeCustomerId> {
    let stripeAddress: Stripe.Emptyable<Stripe.AddressParam> = {
      city: customerDetails?.address?.city ?? undefined,
      country: customerDetails?.address?.country ?? undefined,
      line1: customerDetails?.address?.line1 ?? undefined,
      line2: customerDetails?.address?.line2 ?? undefined,
      postal_code: customerDetails?.address?.postal_code ?? undefined,
      state: customerDetails?.address?.state ?? undefined,
    };

    const customerCreateParams: Stripe.CustomerCreateParams = {
      email: email ?? undefined,
      address: stripeAddress,
    };

    logger.debug("Creating stripe customer...", customerCreateParams);

    const customer: Stripe.Customer =
      await stripe.customers.create(customerCreateParams);
    return new StripeCustomerId(customer.id);
  }

  private static async saveAddressAndStripeCustomer(
    customerId: StripeCustomerId,
    email: string | null,
    customerDetails: Stripe.Checkout.Session.CustomerDetails | null,
    currency?: string,
  ) {
    const name = customerDetails?.name ?? undefined;
    const phone = customerDetails?.phone ?? undefined;

    let address: Address | null = null;
    if (customerDetails?.address) {
      const createAddressBody: CreateAddressBody = {
        line1: customerDetails?.address?.line1 ?? undefined,
        line2: customerDetails?.address?.line2 ?? undefined,
        city: customerDetails?.address?.city ?? undefined,
        state: customerDetails?.address?.state ?? undefined,
        postalCode: customerDetails?.address?.postal_code ?? undefined,
        country: customerDetails?.address?.country ?? undefined,
      };
      address = await addressRepo.create(createAddressBody);
    }

    const newStripeCustomer = new StripeCustomer(
      customerId,
      currency,
      email ?? undefined,
      name,
      phone,
      [],
      address ? address.id : null,
    );

    logger.debug(
      `🔔  Stripe customer, not registered, created: ${newStripeCustomer}`,
    );
    await stripeCustomerRepo.insert(newStripeCustomer);
  }

  private static async invoicePaid(
    stripeInvoice: Stripe.Invoice,
  ): Promise<void> {
    const invoice = StripeInvoice.fromStripeApi(stripeInvoice);
    if (invoice instanceof ValidationError) {
      throw invoice;
    }
    await stripeInvoiceRepo.insert(invoice);
  }

  private static async createOrUpdateStripePrice(
    price: Stripe.Price,
  ): Promise<void> {
    const stripePrice = StripePrice.fromStripeApi(price);
    if (stripePrice instanceof ValidationError) {
      throw stripePrice;
    }
    await stripePriceRepo.createOrUpdate(stripePrice);
  }
}
