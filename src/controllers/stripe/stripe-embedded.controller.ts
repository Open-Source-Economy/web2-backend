import { Request, Response } from "express";
import { StatusCodes } from "http-status-codes";
import Stripe from "stripe";
import * as dto from "@open-source-economy/api-types";
import { StripeHelper } from "./stripe.helper";
import { stripe } from "./index";
import { ApiError } from "../../errors";

// NOTE: CreateSubscription and CreatePaymentIntent types have been removed from api-types.
// These endpoints are WIP and use inline types until proper replacements are defined.

interface CreateSubscriptionBody {
  countryCode: string | null;
  priceItems: Array<{ priceId: { id: string }; quantity: number }>;
}

interface CreatePaymentIntentBody {
  stripeCustomerId: { id: string };
  priceItems: Array<{ priceId: { id: string }; quantity: number }>;
}

export interface StripeEmbeddedController {
  createSubscription(
    req: Request<{}, any, CreateSubscriptionBody, {}>,
    res: Response<any>,
  ): Promise<void>;

  createPaymentIntentWIP(
    req: Request<{}, any, CreatePaymentIntentBody, {}>,
    res: Response<any>,
  ): Promise<void>;
}

export const StripeEmbeddedController: StripeEmbeddedController = {
  // Build-subscriptions: https://docs.stripe.com/billing/subscriptions/build-subscriptions?lang=node
  // 1. createCustomer
  // 2. createSubscription
  async createSubscription(
    req: Request<{}, any, CreateSubscriptionBody, {}>,
    res: Response<any>,
  ) {
    if (!req.user) {
      throw ApiError.unauthorized("User not authenticated");
    } else {
      const stripeCustomerUser =
        await StripeHelper.getOrCreateStripeCustomerUser(
          req.user,
          req.body.countryCode,
        );
      if (stripeCustomerUser instanceof Error) {
        throw stripeCustomerUser;
      }

      const items: Stripe.SubscriptionCreateParams.Item[] = [];
      for (const item of req.body.priceItems) {
        items.push({ price: item.priceId.id, quantity: item.quantity });
      }

      // Create the subscription.
      // Note we're expanding the Subscription's latest invoice and that invoice's payment_intent,
      // so we can pass it to the front end to confirm the payment
      const subscription: Stripe.Subscription =
        await stripe.subscriptions.create({
          customer: stripeCustomerUser.stripeCustomerId,
          items: items,
          payment_behavior: "default_incomplete",
          payment_settings: { save_default_payment_method: "on_subscription" },
          expand: ["latest_invoice.payment_intent"],
        });

      const response = {
        subscription: subscription,
      };

      // At this point the Subscription is inactive and awaiting payment.
      res.status(StatusCodes.CREATED).send(response);
    }
  },

  // this function in is WIP
  async createPaymentIntentWIP(
    req: Request<{}, any, CreatePaymentIntentBody, {}>,
    res: Response<any>,
  ) {
    // Step 1: Create an invoice
    // Step 2: Create an invoice item
    // Step 3: Finalize the invoice and get the payment intent
    // Step 4: Request the payment intent for the invoice.
    const invoice: Stripe.Response<Stripe.Invoice> =
      await stripe.invoices.create({
        customer: req.body.stripeCustomerId.id,
        automatic_tax: {
          enabled: false,
        },
      });

    for (const item of req.body.priceItems) {
      await stripe.invoiceItems.create({
        customer: req.body.stripeCustomerId.id,
        invoice: invoice.id,
        price: item.priceId.id,
        quantity: item.quantity,
      });
    }

    // TODO: should not happen, but just for compilation issue
    if (invoice.id === undefined)
      throw ApiError.badRequest("Invoice ID is undefined");

    const finalizedInvoice: Stripe.Response<Stripe.Invoice> =
      await stripe.invoices.finalizeInvoice(invoice.id);

    const paymentIntentId: string = finalizedInvoice.payment_intent as string;

    const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);

    const response = {
      paymentIntent: paymentIntent,
    };
    // Send publishable key and PaymentIntent client_secret to client.
    res.status(StatusCodes.OK).send(response);
  },
};
