import {Request, Response} from "express";
import {
  getAddressRepository,
  getStripeCustomerRepository,
  getStripeInvoiceRepository,
  getStripeProductRepository,
  getUserRepository,
} from "../../db";
import {StatusCodes} from "http-status-codes";
import Stripe from "stripe";
import {
  CreateCustomerBody,
  CreateCustomerParams,
  CreateCustomerQuery,
  CreateCustomerResponse,
  CreateSubscriptionBody,
  CreateSubscriptionParams,
  CreateSubscriptionQuery,
  CreateSubscriptionResponse,
  ResponseBody,
} from "../../dtos";
import {StripeCustomer, StripeCustomerId,} from "../../model";
import {config} from "../../config";
import {ApiError} from "../../model/error/ApiError";

// https://github.com/stripe-samples/subscriptions-with-card-and-direct-debit/blob/main/server/node/server.js
const userRepo = getUserRepository();

const stripe = new Stripe(config.stripe.secretKey);
const stripeInvoiceRepo = getStripeInvoiceRepository();
const stripeCustomerRepo = getStripeCustomerRepository();

const addressRepo = getAddressRepository();
const stripeProductRepo = getStripeProductRepository();

// Build-subscriptions: https://docs.stripe.com/billing/subscriptions/build-subscriptions?lang=node
// 1. createCustomer
// 2. createSubscription
//
export class StripeSubscriptionController {
  // to read:
  // Subscriptions with multiple products: https://docs.stripe.com/billing/subscriptions/multiple-products

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

      const customerCreateParams: Stripe.CustomerCreateParams = {
        description: req.user.id.toString(),
        email: req.user.email() ?? undefined,
        address: stripeAddress,
      };

      const customer: Stripe.Customer = await stripe.customers.create(customerCreateParams);
      const stripeCustomer: StripeCustomer = new StripeCustomer(
        new StripeCustomerId(customer.id),
        req.user.id,
      );

      await stripeCustomerRepo.insert(stripeCustomer);

      const response: CreateCustomerResponse = {
        stripeCustomer: stripeCustomer,
      };

      return res.status(StatusCodes.CREATED).send({ success: response });
    }
  }

  static async subscriptionCheckout(
    req: Request<
      CreateSubscriptionParams,
      ResponseBody<CreateSubscriptionResponse>,
      CreateSubscriptionBody,
      CreateSubscriptionQuery
    >,
    res: Response<ResponseBody<CreateSubscriptionResponse>>,
  ) {
    // TODO: Check if the user is authenticated
    // TODO: Check if the user has a Stripe customer ID and it is valid

    const items: Stripe.SubscriptionCreateParams.Item[] = [];
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

  // https://docs.stripe.com/billing/subscriptions/build-subscriptions?platform=web&ui=stripe-hosted&lang=node#create-session
  /**
   * Create a Checkout Session for the subscription, redirecting the user to the Stripe checkout page
   * @param req
   * @param res
   */
  static async subscriptionCheckout(
      req: Request<
          CreateSubscriptionParams,
          ResponseBody<CreateSubscriptionResponse>,
          CreateSubscriptionBody,
          CreateSubscriptionQuery
      >,
      res: Response<ResponseBody<CreateSubscriptionResponse>>,
  ) {

    const stripeCustomer: StripeCustomer | null = await stripeCustomerRepo.getById(req.body.stripeCustomerId);
    if (!stripeCustomer) {
      throw new ApiError(StatusCodes.NOT_FOUND, `Stripe customer not found for user ${req.user?.id?.uuid}`);
    }
    if (stripeCustomer.userId !== req.user?.id) {
      throw new ApiError(StatusCodes.FORBIDDEN, `User ${req.user?.id?.uuid} is not allowed to access this resource`);
    }

    const items: Stripe.Checkout.SessionCreateParams.LineItem[] = [];
    for (const item of req.body.priceItems) {
      items.push({price: item.priceId.toString(), quantity: item.quantity});
    }
    const params: Stripe.Checkout.SessionCreateParams = {
      mode: 'subscription',
      customer: req.body.stripeCustomerId.toString(),
      line_items: items,
      // {CHECKOUT_SESSION_ID} is a string literal; do not change it!
      // the actual Session ID is returned in the query parameter when your customer
      // is redirected to the success page.
      success_url: 'https://example.com/success.html?session_id={CHECKOUT_SESSION_ID}',
      cancel_url: 'https://example.com/canceled.html',
    }
    const options: Stripe.RequestOptions = {}

    const session = await stripe.checkout.sessions.create(params, options);

    // Redirect to the URL returned on the Checkout Session.
    res.redirect(StatusCodes.SEE_OTHER, session.url!);
  }
}
