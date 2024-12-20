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
  CreateSubscriptionBody,
  CreateSubscriptionParams,
  CreateSubscriptionQuery,
  CreateSubscriptionResponse,
  ResponseBody,
  CheckoutBody,
  CheckoutParams,
  CheckoutQuery,
  CheckoutResponse,
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

export class StripeCheckoutController {


  // Save payment details: https://docs.stripe.com/payments/checkout/save-during-payment
  /**
   * Create a Checkout Session for the subscription, redirecting the user to the Stripe checkout page
   *
   * DOC: https://docs.stripe.com/billing/subscriptions/build-subscriptions?platform=web&ui=stripe-hosted&lang=node#create-session
   * @param req
   * @param res
   */
  static async subscriptionCheckout(
    req: Request<
      CheckoutParams,
      ResponseBody<CheckoutResponse>,
      CheckoutBody,
      CheckoutQuery
    >,
    res: Response<ResponseBody<CheckoutResponse>>,
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

      const items: Stripe.Checkout.SessionCreateParams.LineItem[] = [];
      for (const item of req.body.priceItems) {
        items.push({ price: item.priceId.toString(), quantity: item.quantity });
      }

      const params: Stripe.Checkout.SessionCreateParams = {
        mode: req.body.mode,
        customer: stripeCustomer.stripeId.toString(),
        line_items: items,
        ui_mode: 'embedded',
        // {CHECKOUT_SESSION_ID} is a string literal; do not change it!
        // the actual Session ID is returned in the query parameter when your customer
        // is redirected to the success page.
        success_url: `${req.body.successUrl}?session_id={CHECKOUT_SESSION_ID}&mode=${req.body.mode}`,
        cancel_url: `${req.body.cancelUrl}`,
      };
      const options: Stripe.RequestOptions = {};

      const session = await stripe.checkout.sessions.create(params, options);

      // Redirect to the URL returned on the Checkout Session.
      res.redirect(StatusCodes.SEE_OTHER, session.url!);
    }
  }
}
