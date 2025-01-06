import { Request, Response } from "express";
import {
  getAddressRepository,
  getStripeCustomerRepository,
  getStripeInvoiceRepository,
  getStripeProductRepository,
  getUserRepository,
} from "../db/";
import { StatusCodes } from "http-status-codes";
import Stripe from "stripe";
import {
  CreateCustomerBody,
  CreatePaymentIntentBody,
  CreateSubscriptionBody,
} from "../dtos/stripe";
import { StripeCustomer, StripeCustomerId, StripeInvoice } from "../model";
import { ValidationError } from "express-validator";
import { GetDowPricesResponse, ResponseBody } from "../dtos";
import { config, logger } from "../config";

// https://github.com/stripe-samples/subscriptions-with-card-and-direct-debit/blob/main/server/node/server.js
const userRepo = getUserRepository();

const stripe = new Stripe(config.stripe.secretKey);
const stripeInvoiceRepo = getStripeInvoiceRepository();
const stripeCustomerRepo = getStripeCustomerRepository();

const addressRepo = getAddressRepository();
const stripeProductRepo = getStripeProductRepository();

export class StripeController {
  private static async calculateTax(orderAmount: number, currency: string) {
    const taxCalculation: Stripe.Tax.Calculation =
      await stripe.tax.calculations.create({
        currency,
        customer_details: {
          address: {
            line1: "10709 Cleary Blvd",
            city: "Plantation",
            state: "FL",
            postal_code: "33322",
            country: "US",
          },
          address_source: "shipping",
        },
        line_items: [
          {
            amount: orderAmount,
            reference: "ProductRef",
            tax_behavior: "exclusive",
            tax_code: "txcd_30011000",
          },
        ],
      });

    return taxCalculation;
  }

  static async getDowPrices(
    req: Request,
    res: Response<ResponseBody<GetDowPricesResponse>>,
  ) {
    // const products = await stripeProductRepo.getAll();
    //
    // // TODO: For the POC, we should have only one product of each type
    // const subscriptionProducts = products.find((p) => p.recurring);
    // const oneTimeProducts = products.find((p) => !p.recurring);
    //
    // if (!subscriptionProducts) {
    //   throw new Error("No subscription product found");
    // }
    // if (!oneTimeProducts) {
    //   throw new Error("No one-time product found");
    // }
    //
    // const prices: Stripe.ApiList<Stripe.Price> = await stripe.prices.list({
    //   limit: 100,
    // });
    //
    // // TODO: For the POC, we should have less than 100 prices
    // if (prices.has_more) {
    //   logger.warn("More than 100 prices found");
    // }
    //
    // const subscriptionPrices: Stripe.Price[] = prices.data.filter((price) => {
    //   return price.product === subscriptionProducts.stripeId.toString();
    // });
    //
    // const oneTimePrices: Stripe.Price[] = prices.data.filter((price) => {
    //   return price.product === oneTimeProducts.stripeId.toString();
    // });
    //
    // const response: GetDowPricesResponse = {
    //   subscriptionPrices: subscriptionPrices,
    //   oneTimePrices: oneTimePrices,
    // };
    //
    // res.send({ success: response });
  }

  static async createCustomer(
    req: Request<{}, {}, CreateCustomerBody, {}>,
    res: Response<StripeCustomer | ValidationError[]>,
  ) {
    if (!req.user) {
      return res.status(StatusCodes.UNAUTHORIZED).send();
    } else {
      const address = await addressRepo.getCompanyUserAddress(req.user.id);
      let stripeAddress: Stripe.Emptyable<Stripe.AddressParam>;
      if (address) {
        stripeAddress = address;
      } else {
        stripeAddress = {
          country: req.body.countryCode,
        };
      }

      const customer: Stripe.Customer = await stripe.customers.create({
        description: req.user.id.toString(),
        email: req.user.email() ?? undefined,
        address: stripeAddress,
        tax: {
          validate_location: "immediately",
        },
        expand: ["tax"],
      });

      if (customer.tax?.automatic_tax === "unrecognized_location") {
        return res.status(StatusCodes.BAD_REQUEST).send();
      } else if (customer.tax?.automatic_tax === "failed") {
        return res.status(StatusCodes.INTERNAL_SERVER_ERROR).send();
      } else {
        const stripeCustomer = new StripeCustomer(
          new StripeCustomerId(customer.id),
          req.user.id,
        );

        await stripeCustomerRepo.insert(stripeCustomer);

        // Create a SetupIntent to set up our payment methods recurring usage
        const setupIntent = await stripe.setupIntents.create({
          payment_method_types: ["card"], // TODO: lolo
          customer: customer.id,
        });

        return res.status(StatusCodes.CREATED).send(stripeCustomer);
      }
    }
  }

  static async createSubscription(
    req: Request<{}, {}, CreateSubscriptionBody, {}>,
    res: Response<Stripe.Subscription | ValidationError[]>,
  ) {
    const items = [];
    for (const item of req.body.priceItems) {
      items.push({ price: item.priceId.toString(), quantity: item.quantity });
    }

    // Create the subscription.
    // Note we're expanding the Subscription's latest invoice and that invoice's payment_intent so we can pass it to the front end to confirm the payment
    const subscription = await stripe.subscriptions.create({
      customer: req.body.stripeCustomerId.toString(),
      items: items,
      payment_behavior: "default_incomplete",
      payment_settings: { save_default_payment_method: "on_subscription" },
      expand: ["latest_invoice.payment_intent"],
    });

    // At this point the Subscription is inactive and awaiting payment.
    res.send(subscription);
  }

  static async createPaymentIntent(
    req: Request<{}, {}, CreatePaymentIntentBody, {}>,
    res: Response<Stripe.PaymentIntent | ValidationError[]>,
  ) {
    // Step 1: Create an invoice
    // Step 2: Create an invoice item
    // Step 3: Finalize the invoice and get the payment intent
    // Step 4: Request the payment intent for the invoice.
    const invoice: Stripe.Response<Stripe.Invoice> =
      await stripe.invoices.create({
        customer: req.body.stripeCustomerId.toString(),
        automatic_tax: {
          enabled: true,
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

    // Send publishable key and PaymentIntent client_secret to client.
    res.status(StatusCodes.OK).send(paymentIntent);
  }

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
      // https://docs.stripe.com/billing/subscriptions/webhooks#active-subscriptions
      case "invoice.paid":
        const invoice = StripeInvoice.fromStripeApi(data.object);
        if (invoice instanceof Error) {
          throw invoice;
        }

        logger.info(`🔔  Webhook received: ${eventType}!`);

        await stripeInvoiceRepo.insert(invoice);
        break;

      case "payment_intent.succeeded":
        // Cast the event into a PaymentIntent to make use of the types.
        // const pi: Stripe.PaymentIntent = data.object as Stripe.PaymentIntent;
        // Funds have been captured
        // Fulfill any orders, e-mail receipts, etc
        // To cancel the payment after capture you will need to issue a Refund (https://stripe.com/docs/api/refunds).
        logger.info(`🔔  Webhook received: ${data.object}!`);
        logger.info("💰 Payment captured!");
        break;

      case "payment_intent.payment_failed":
        // const paymentIntent = data as Stripe.PaymentIntent.DA;
        logger.info(`🔔  Webhook received: ${data.object}!`);
        logger.info("❌ Payment failed.");
        break;
      default:
    }

    res.sendStatus(StatusCodes.OK);
  }
}
