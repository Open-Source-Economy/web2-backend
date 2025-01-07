import { Request, Response } from "express";
import { StatusCodes } from "http-status-codes";
import Stripe from "stripe";
import {
  CheckoutBody,
  CheckoutParams,
  CheckoutQuery,
  CheckoutResponse,
  ResponseBody,
} from "../../dtos";
import { ApiError } from "../../model/error/ApiError";
import { StripeHelper } from "./stripe-helper";
import { stripe } from "./index";

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
      const stripeCustomer = await StripeHelper.getOrCreateStripeCustomer(
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
        ui_mode: "embedded",
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
