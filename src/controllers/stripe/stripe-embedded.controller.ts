import { Request, Response } from "express";
import {
  getAddressRepository,
  getStripeCustomerRepository,
  getStripeInvoiceRepository,
  getStripeProductRepository,
  getUserRepository,
} from "../../db";
import { StatusCodes } from "http-status-codes";
import Stripe from "stripe";
import {
  CreatePaymentIntentBody,
  CreatePaymentIntentParams,
  CreatePaymentIntentQuery,
  CreatePaymentIntentResponse,
  CreateSubscriptionBody,
  CreateSubscriptionParams,
  CreateSubscriptionQuery,
  CreateSubscriptionResponse,
  ResponseBody,
} from "../../dtos";
import { config } from "../../config";
import { ApiError } from "../../model/error/ApiError";
import { StripeController } from "./stripe.controller";

// https://github.com/stripe-samples/subscriptions-with-card-and-direct-debit/blob/main/server/node/server.js
const userRepo = getUserRepository();

const stripe = new Stripe(config.stripe.secretKey);
const stripeInvoiceRepo = getStripeInvoiceRepository();
const stripeCustomerRepo = getStripeCustomerRepository();

const addressRepo = getAddressRepository();
const stripeProductRepo = getStripeProductRepository();

export class StripeEmbeddedController {
  // Build-subscriptions: https://docs.stripe.com/billing/subscriptions/build-subscriptions?lang=node
  // 1. createCustomer
  // 2. createSubscription
  static async createSubscription(
    req: Request<
      CreateSubscriptionParams,
      ResponseBody<CreateSubscriptionResponse>,
      CreateSubscriptionBody,
      CreateSubscriptionQuery
    >,
    res: Response<ResponseBody<CreateSubscriptionResponse>>,
  ) {
    if (!req.user) {
      return new ApiError(StatusCodes.UNAUTHORIZED, "User not authenticated");
    } else {
      const stripeCustomer = await StripeController.getOrCreateStripeCustomer(
        req.user,
        req.body.countryCode,
      );
      if (stripeCustomer instanceof ApiError) {
        throw stripeCustomer;
      }

      const items: Stripe.SubscriptionCreateParams.Item[] = [];
      for (const item of req.body.priceItems) {
        items.push({ price: item.priceId.toString(), quantity: item.quantity });
      }

      // Create the subscription.
      // Note we're expanding the Subscription's latest invoice and that invoice's payment_intent,
      // so we can pass it to the front end to confirm the payment
      const subscription: Stripe.Subscription =
        await stripe.subscriptions.create({
          customer: stripeCustomer.stripeId.toString(),
          items: items,
          payment_behavior: "default_incomplete",
          payment_settings: { save_default_payment_method: "on_subscription" },
          expand: ["latest_invoice.payment_intent"],
        });

      const response: CreateSubscriptionResponse = {
        subscription: subscription,
      };

      // At this point the Subscription is inactive and awaiting payment.
      res.status(StatusCodes.CREATED).send({ success: response });
    }
  }

  // this function in is WIP
  static async createPaymentIntentWIP(
    req: Request<
      CreatePaymentIntentParams,
      ResponseBody<CreatePaymentIntentResponse>,
      CreatePaymentIntentBody,
      CreatePaymentIntentQuery
    >,
    res: Response<ResponseBody<CreatePaymentIntentResponse>>,
  ) {
    // Step 1: Create an invoice
    // Step 2: Create an invoice item
    // Step 3: Finalize the invoice and get the payment intent
    // Step 4: Request the payment intent for the invoice.
    const invoice: Stripe.Response<Stripe.Invoice> =
      await stripe.invoices.create({
        customer: req.body.stripeCustomerId.toString(),
        automatic_tax: {
          enabled: false,
        },
      });

    for (const item of req.body.priceItems) {
      await stripe.invoiceItems.create({
        customer: req.body.stripeCustomerId.toString(),
        invoice: invoice.id,
        price: item.priceId.toString(),
        quantity: item.quantity,
        // tax_behavior: "exclusive",
        // tax_rates: [taxCalculation.tax_rates[0].id],
        // tax_code: "txcd_30011000",
        // metadata: { tax_calculation: taxCalculation.id },
      });
    }

    const finalizedInvoice: Stripe.Response<Stripe.Invoice> =
      await stripe.invoices.finalizeInvoice(invoice.id);

    const paymentIntentId: string = finalizedInvoice.payment_intent as string;

    const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);

    const response: CreatePaymentIntentResponse = {
      paymentIntent: paymentIntent,
    };
    // Send publishable key and PaymentIntent client_secret to client.
    res.status(StatusCodes.OK).send({ success: response });
  }
}