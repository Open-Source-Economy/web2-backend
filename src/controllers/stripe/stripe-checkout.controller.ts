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
import { logger } from "../../config";
import { StripeCustomerUser } from "../../model";

export class StripeCheckoutController {
  // TODO ? : Save payment details: https://docs.stripe.com/payments/checkout/save-during-payment
  /**
   * Create a Checkout Session for the subscription, redirecting the user to the Stripe checkout page
   *
   * DOC + TEST: https://docs.stripe.com/billing/subscriptions/build-subscriptions?platform=web&ui=stripe-hosted&lang=node#create-session
   * @param req
   * @param res
   */
  static async checkout(
    req: Request<
      CheckoutParams,
      ResponseBody<CheckoutResponse>,
      CheckoutBody,
      CheckoutQuery
    >,
    res: Response<ResponseBody<CheckoutResponse>>,
  ) {
    let customer: StripeCustomerUser | null = null;
    if (req.user) {
      logger.debug("Checkout request received", req.body);
      const stripeCustomerUser =
        await StripeHelper.getOrCreateStripeCustomerUser(
          req.user,
          req.body.countryCode,
        );
      if (stripeCustomerUser instanceof ApiError) {
        throw stripeCustomerUser;
      } else {
        customer = stripeCustomerUser;
      }
    }

    const items: Stripe.Checkout.SessionCreateParams.LineItem[] = [];
    for (const item of req.body.priceItems) {
      items.push({ price: item.priceId.id, quantity: item.quantity });
    }
    logger.debug("Creating checkout session with items:", items);

    const params: Stripe.Checkout.SessionCreateParams = {
      mode: req.body.mode,
      line_items: items,
      customer: customer?.stripeCustomerId.id,
      customer_email: customer ? undefined : req.user?.email() ?? undefined,
      // {CHECKOUT_SESSION_ID} is a string literal; do not change it!
      // the actual Session ID is returned in the query parameter when your customer
      // is redirected to the success page.
      success_url: `${req.body.successUrl}?session_id={CHECKOUT_SESSION_ID}&mode=${req.body.mode}`,
      cancel_url: `${req.body.cancelUrl}`,
    };

    logger.debug(`Creating checkout session with params:`, params);
    try {
      const session = await stripe.checkout.sessions.create(params);

      if (session.url) {
        // Needs to redirect returned on the Checkout Session.
        logger.debug("Redirecting to checkout session", session);
        const response: CheckoutResponse = {
          redirectUrl: session.url,
        };
        res.status(StatusCodes.CREATED).send({ success: response });
      } else {
        logger.error("No redirect URL available", session);
        throw new ApiError(
          StatusCodes.INTERNAL_SERVER_ERROR,
          "Failed to create checkout session",
        );
      }
    } catch (error) {
      logger.error("Failed to create checkout session", error);
      throw new ApiError(
        StatusCodes.INTERNAL_SERVER_ERROR,
        "Failed to create checkout session",
      );
    }
  }
}
