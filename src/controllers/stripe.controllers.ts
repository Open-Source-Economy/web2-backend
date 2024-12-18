import {Request, Response} from "express";
import {
  getAddressRepository,
  getStripeCustomerRepository,
  getStripeInvoiceRepository,
  getStripeProductRepository,
  getUserRepository,
} from "../db/";
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
} from "../dtos";
import {StripeCustomer, StripeCustomerId, StripeInvoice, StripeProduct,} from "../model";
import {config, logger} from "../config";

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
    req: Request<
      GetDowPricesParams,
      ResponseBody<GetDowPricesResponse>,
      GetDowPricesBody,
      GetDowPricesQuery
    >,
    res: Response<ResponseBody<GetDowPricesResponse>>,
  ) {
    const products: StripeProduct[] = await stripeProductRepo.getAll();

    // TODO: For the POC, we should have only one product of each type
    const subscriptionProducts = products.find((p) => p.recurring);
    const oneTimeProducts = products.find((p) => !p.recurring);

    if (!subscriptionProducts) {
      throw new Error("No subscription product found");
    }
    if (!oneTimeProducts) {
      throw new Error("No one-time product found");
    }

    const prices: Stripe.ApiList<Stripe.Price> = await stripe.prices.list({
      limit: 100,
    });

    // TODO: For the POC, we should have less than 100 prices
    if (prices.has_more) {
      logger.warn("More than 100 prices found");
    }

    const subscriptionPrices: Stripe.Price[] = prices.data.filter((price) => {
      return price.product === subscriptionProducts.stripeId.toString();
    });

    const oneTimePrices: Stripe.Price[] = prices.data.filter((price) => {
      return price.product === oneTimeProducts.stripeId.toString();
    });

    const response: GetDowPricesResponse = {
      subscriptionPrices: subscriptionPrices,
      oneTimePrices: oneTimePrices,
    };

    res.send({ success: response });
  }

  static async createCustomer(
    req: Request<
      CreateCustomerParams,
      ResponseBody<CreateCustomerResponse>,
      CreateCustomerBody,
      CreateCustomerQuery
    >,
    res: Response<ResponseBody<CreateCustomerResponse>>,
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

        const response: CreateCustomerResponse = {
          stripeCustomer: stripeCustomer,
        };

        return res.status(StatusCodes.CREATED).send({ success: response });
      }
    }
  }

  static async createSubscription(
    req: Request<
      CreateSubscriptionParams,
      ResponseBody<CreateSubscriptionResponse>,
      CreateSubscriptionBody,
      CreateSubscriptionQuery
    >,
    res: Response<ResponseBody<CreateSubscriptionResponse>>,
  ) {
    const items = [];
    for (const item of req.body.priceItems) {
      items.push({ price: item.priceId.toString(), quantity: item.quantity });
    }

    // Create the subscription.
    // Note we're expanding the Subscription's latest invoice and that invoice's payment_intent,
    // so we can pass it to the front end to confirm the payment
    const subscription: Stripe.Subscription = await stripe.subscriptions.create(
      {
        customer: req.body.stripeCustomerId.toString(),
        items: items,
        payment_behavior: "default_incomplete",
        payment_settings: { save_default_payment_method: "on_subscription" },
        expand: ["latest_invoice.payment_intent"],
      },
    );

    const response: CreateSubscriptionResponse = {
      subscription: subscription,
    };
    // At this point the Subscription is inactive and awaiting payment.
    res.status(StatusCodes.CREATED).send({ success: response });
  }

  static async createPaymentIntent(
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
