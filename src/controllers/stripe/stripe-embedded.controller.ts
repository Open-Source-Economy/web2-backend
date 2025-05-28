import { Request, Response } from "express";
import { StatusCodes } from "http-status-codes";
import Stripe from "stripe";
import * as dto from "../../api/dto";
import { ApiError } from "../../api/model/error/ApiError";
import { StripeHelper } from "./stripe.helper";
import { stripe } from "./index";

export interface StripeEmbeddedController {
  createSubscription(
    req: Request<
      dto.CreateSubscriptionParams,
      dto.ResponseBody<dto.CreateSubscriptionResponse>,
      dto.CreateSubscriptionBody,
      dto.CreateSubscriptionQuery
    >,
    res: Response<dto.ResponseBody<dto.CreateSubscriptionResponse>>,
  ): Promise<void>;

  createPaymentIntentWIP(
    req: Request<
      dto.CreatePaymentIntentParams,
      dto.ResponseBody<dto.CreatePaymentIntentResponse>,
      dto.CreatePaymentIntentBody,
      dto.CreatePaymentIntentQuery
    >,
    res: Response<dto.ResponseBody<dto.CreatePaymentIntentResponse>>,
  ): Promise<void>;
}

export const StripeEmbeddedController: StripeEmbeddedController = {
  // Build-subscriptions: https://docs.stripe.com/billing/subscriptions/build-subscriptions?lang=node
  // 1. createCustomer
  // 2. createSubscription
  async createSubscription(
    req: Request<
      dto.CreateSubscriptionParams,
      dto.ResponseBody<dto.CreateSubscriptionResponse>,
      dto.CreateSubscriptionBody,
      dto.CreateSubscriptionQuery
    >,
    res: Response<dto.ResponseBody<dto.CreateSubscriptionResponse>>,
  ) {
    if (!req.user) {
      throw new ApiError(StatusCodes.UNAUTHORIZED, "User not authenticated");
    } else {
      const stripeCustomerUser =
        await StripeHelper.getOrCreateStripeCustomerUser(
          req.user,
          req.body.countryCode,
        );
      if (stripeCustomerUser instanceof ApiError) {
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
          customer: stripeCustomerUser.stripeCustomerId.id,
          items: items,
          payment_behavior: "default_incomplete",
          payment_settings: { save_default_payment_method: "on_subscription" },
          expand: ["latest_invoice.payment_intent"],
        });

      const response: dto.CreateSubscriptionResponse = {
        subscription: subscription,
      };

      // At this point the Subscription is inactive and awaiting payment.
      res.status(StatusCodes.CREATED).send({ success: response });
    }
  },

  // this function in is WIP
  async createPaymentIntentWIP(
    req: Request<
      dto.CreatePaymentIntentParams,
      dto.ResponseBody<dto.CreatePaymentIntentResponse>,
      dto.CreatePaymentIntentBody,
      dto.CreatePaymentIntentQuery
    >,
    res: Response<dto.ResponseBody<dto.CreatePaymentIntentResponse>>,
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

    const response: dto.CreatePaymentIntentResponse = {
      paymentIntent: paymentIntent,
    };
    // Send publishable key and PaymentIntent client_secret to client.
    res.status(StatusCodes.OK).send({ success: response });
  },
};
