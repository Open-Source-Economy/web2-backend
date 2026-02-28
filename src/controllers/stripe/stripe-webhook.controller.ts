import { Request, Response } from "express";
import { StatusCodes } from "http-status-codes";
import Stripe from "stripe";
import {
  Address,
  OwnerId,
  StripeCustomer,
  StripeCustomerId,
  StripeInvoice,
  StripePrice,
} from "@open-source-economy/api-types";
import { config, logger } from "../../config";
import { stripe } from "./index";
import { addressRepo, sponsorRepo, stripeCustomerRepo, stripeInvoiceRepo, stripePriceRepo } from "../../db";
import { githubSyncService } from "../../services";
import { parseCurrency, requireCurrency } from "../../utils/enum-utils";

export interface StripeWebhookController {
  webhook(req: Request, res: Response): Promise<void>;
}

// Helper functions
const StripeWebhookHelpers = {
  async checkoutSessionCompleted(session: Stripe.Checkout.Session): Promise<void> {
    // Stripe comments:
    // Payment is successful and the subscription is created.
    // You should provision the subscription and save the customer ID to your database.

    const email = session.customer_details?.email ?? session.customer_email;
    const currency = session.currency ?? undefined;

    const stripeCustomerId: StripeCustomerId | null = session.customer
      ? ((typeof session.customer === "string" ? session.customer : session.customer.id) as StripeCustomerId) // based on testing, it should be a string
      : null;

    if (stripeCustomerId) {
      const stripeCustomerUser = await stripeCustomerRepo.getByStripeId(stripeCustomerId);

      if (stripeCustomerUser !== null) {
        logger.debug(`Stripe customer, already registered: ${stripeCustomerUser?.stripeId}`);
      } else {
        logger.debug(`Stripe customer creation, not registered: ${stripeCustomerId}`);
        await StripeWebhookHelpers.saveAddressAndStripeCustomer(
          stripeCustomerId,
          email,
          session.customer_details,
          currency
        );
      }
    } else {
      if (email === null) {
        logger.error("No email in checkout session");
        throw new Error("No email in checkout session");
      } else {
        logger.debug(`Email in checkout session: ${email}`);
        const stripeCustomer = await stripeCustomerRepo.getByEmail(email);

        if (stripeCustomer) {
          logger.debug(`Stripe customer, already registered with email ${email}:`, stripeCustomer);
        } else {
          logger.debug(`Stripe customer, not registered with email ${email}`);
          const customerId = await StripeWebhookHelpers.createAddressAndStripeCustomer(email, session.customer_details);
          await StripeWebhookHelpers.saveAddressAndStripeCustomer(
            customerId,
            email,
            session.customer_details,
            currency
          );
        }
      }
    }

    // Extract sponsor metadata from checkout session if available
    const githubOwnerLogin = session.metadata?.githubOwnerLogin;
    if (githubOwnerLogin && stripeCustomerId) {
      try {
        logger.debug(`Sponsor GitHub owner: ${githubOwnerLogin} for customer ${stripeCustomerId}`);
        const ownerId: OwnerId = { login: githubOwnerLogin };

        // Ensure the owner exists in the database before creating sponsor record
        await githubSyncService.syncOwner(ownerId);

        await sponsorRepo.createOrUpdate(stripeCustomerId, ownerId, true);
      } catch (error) {
        logger.error(`Failed to create sponsor for customer ${stripeCustomerId}:`, error);
        // Don't throw - this is just for sponsor recognition, not critical for payment processing
      }
    }
  },

  async createAddressAndStripeCustomer(
    email: string | null,
    customerDetails: Stripe.Checkout.Session.CustomerDetails | null
  ): Promise<StripeCustomerId> {
    const stripeAddress: Stripe.Emptyable<Stripe.AddressParam> = {
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

    const customer: Stripe.Customer = await stripe.customers.create(customerCreateParams);
    return customer.id as StripeCustomerId;
  },

  async saveAddressAndStripeCustomer(
    customerId: StripeCustomerId,
    email: string | null,
    customerDetails: Stripe.Checkout.Session.CustomerDetails | null,
    currency?: string
  ): Promise<void> {
    const name = customerDetails?.name ?? undefined;
    const _phone = customerDetails?.phone ?? undefined;

    let _address: Address | null = null;
    if (customerDetails?.address) {
      const createAddressBody = {
        line1: customerDetails?.address?.line1 ?? undefined,
        line2: customerDetails?.address?.line2 ?? undefined,
        city: customerDetails?.address?.city ?? undefined,
        state: customerDetails?.address?.state ?? undefined,
        postalCode: customerDetails?.address?.postal_code ?? undefined,
        country: customerDetails?.address?.country ?? undefined,
      };
      _address = await addressRepo.create(createAddressBody);
    }

    const newStripeCustomer: StripeCustomer = {
      stripeId: customerId,
      currency: parseCurrency(currency) ?? undefined,
      email: email ?? undefined,
      name,
    };

    logger.debug(`Stripe customer, not registered, created: ${JSON.stringify(newStripeCustomer)}`);
    await stripeCustomerRepo.insert(newStripeCustomer);
  },

  async invoicePaid(stripeInvoice: Stripe.Invoice): Promise<void> {
    const invoice: StripeInvoice = {
      id: stripeInvoice.id as any,
      stripeCustomerId: (typeof stripeInvoice.customer === "string"
        ? stripeInvoice.customer
        : stripeInvoice.customer?.id) as StripeCustomerId,
      amountPaid: stripeInvoice.amount_paid,
      currency: requireCurrency(stripeInvoice.currency, "stripe invoice"),
      status: stripeInvoice.status ?? "paid",
      lines: [],
    } as any;
    await stripeInvoiceRepo.insert(invoice, []);
  },

  async createOrUpdateStripePrice(price: Stripe.Price): Promise<void> {
    const stripePrice: StripePrice = {
      id: price.id as any,
      stripeProductId: (typeof price.product === "string" ? price.product : (price.product as any)?.id) as any,
      currency: requireCurrency(price.currency, "stripe price"),
      unitAmount: price.unit_amount ?? 0,
      recurring: price.recurring ? true : false,
      interval: price.recurring?.interval ?? null,
      active: price.active,
    } as any;
    await stripePriceRepo.createOrUpdate(stripePrice);
  },
};

export const StripeWebhookController: StripeWebhookController = {
  async webhook(req: Request, res: Response) {
    let event: Stripe.Event;
    try {
      event = stripe.webhooks.constructEvent(
        req.body,
        req.headers["stripe-signature"] as string,
        config.stripe.webhookSecret
      );
    } catch (err) {
      logger.error(`Webhook signature verification failed.`, err);
      res.sendStatus(StatusCodes.BAD_REQUEST);
      return;
    }

    const data = event.data;
    const object = data.object;
    const eventType: string = event.type;

    logger.debug(`Webhook received an event of type: ${eventType}!`);
    logger.debug(`Webhook data:`, data);

    try {
      // Handle the event
      // Review important events for Billing webhooks
      // https://stripe.com/docs/billing/webhooks
      // Remove comment to see the various objects sent for this sample
      // Event types: https://docs.stripe.com/api/events/types
      switch (eventType) {
        // TODO: https://docs.stripe.com/checkout/fulfillment?payment-ui=embedded-form#create-payment-event-handler
        case "checkout.session.completed": {
          logger.debug("checkout.session.completed, starting!");
          await StripeWebhookHelpers.checkoutSessionCompleted(event.data.object as Stripe.Checkout.Session);
          logger.debug("checkout.session.completed, done!");
          break;
        }

        case "invoice.paid": {
          logger.debug(`invoice.paid, starting!`);
          await StripeWebhookHelpers.invoicePaid(object as Stripe.Invoice);
          logger.debug(`invoice.paid, done!`);
          break;
        }

        case "invoice.payment_failed":
          // TODO: Implement payment failure handling
          break;

        case "payment_intent.succeeded": {
          const paymentIntent = data.object as Stripe.PaymentIntent;
          logger.debug(`Payment captured for amount: ${paymentIntent.amount}!`);
          break;
        }

        case "payment_intent.payment_failed": {
          const paymentIntent = data.object as Stripe.PaymentIntent;
          logger.debug(`Payment failed for amount: ${paymentIntent.amount}`);
          break;
        }

        case "price.created": {
          const price = data.object as Stripe.Price;
          logger.debug(`price.created`, price);
          await StripeWebhookHelpers.createOrUpdateStripePrice(price);
          break;
        }

        case "price.updated": {
          const price = data.object as Stripe.Price;
          logger.debug(`price.updated`, price);
          await StripeWebhookHelpers.createOrUpdateStripePrice(price);
          break;
        }

        case "price.deleted": {
          const price = data.object as Stripe.Price;
          logger.debug(`price.deleted`, price);
          await StripeWebhookHelpers.createOrUpdateStripePrice(price);
          break;
        }

        case "product.created": {
          const product = data.object as Stripe.Price;
          logger.debug(`product.created`, product);
          // await StripeWebhookHelpers.createOrUpdateStripeProduct(product);
          break;
        }

        case "product.updated": {
          const product = data.object as Stripe.Product;
          logger.debug(`product.updated`, product);
          // await StripeWebhookHelpers.createOrUpdateStripeProduct(product);
          break;
        }

        case "product.deleted": {
          const product = data.object as Stripe.Product;
          logger.debug(`product.deleted`, product);
          // await StripeWebhookHelpers.createOrUpdateStripeProduct(product);
          break;
        }

        case "customer.subscription.created": {
          const subscription = data.object as Stripe.Subscription;
          logger.debug(`subscription.deleted`, subscription);
          break;
        }
      }

      res.sendStatus(StatusCodes.OK);
    } catch (error) {
      logger.error("Error processing webhook:", error);
      res.sendStatus(StatusCodes.INTERNAL_SERVER_ERROR);
    }
  },
};
