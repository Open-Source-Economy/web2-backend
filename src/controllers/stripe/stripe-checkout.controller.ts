import { Request, Response } from "express";
import { StatusCodes } from "http-status-codes";
import Stripe from "stripe";
import * as dto from "@open-source-economy/api-types";
// userUtils removed from api-types
import { StripeHelper } from "./stripe.helper";
import { stripe } from "./index";
import { logger } from "../../config";
import { ApiError } from "../../errors";

export interface StripeCheckoutController {
  checkout(
    req: Request<
      dto.CheckoutParams,
      dto.CheckoutResponse,
      dto.CheckoutBody,
      dto.CheckoutQuery
    >,
    res: Response<dto.CheckoutResponse>,
  ): Promise<void>;
}

export const StripeCheckoutController: StripeCheckoutController = {
  // TODO ? : Save payment details: https://docs.stripe.com/payments/checkout/save-during-payment
  /**
   * Create a Checkout Session for the subscription, redirecting the user to the Stripe checkout page
   *
   * DOC + TEST: https://docs.stripe.com/billing/subscriptions/build-subscriptions?platform=web&ui=stripe-hosted&lang=node#create-session
   * @param req
   * @param res
   */
  async checkout(
    req: Request<
      dto.CheckoutParams,
      dto.CheckoutResponse,
      dto.CheckoutBody,
      dto.CheckoutQuery
    >,
    res: Response<dto.CheckoutResponse>,
  ) {
    let customer: any = null;
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
      items.push({ price: item.priceId as string, quantity: item.quantity });
    }
    logger.debug("Creating checkout session with items:", items);

    const params: Stripe.Checkout.SessionCreateParams = {
      mode: req.body.mode,
      invoice_creation:
        req.body.mode === `payment` ? { enabled: true } : undefined,
      line_items: items,
      customer: customer?.stripeCustomerId,
      customer_email: customer
        ? undefined
        : req.user
          ? ((req.user as any)?.email ?? undefined)
          : undefined,
      allow_promotion_codes: true,
      metadata: req.body.metadata,
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
        const response: dto.CheckoutResponse = {
          redirectUrl: session.url,
        };
        res.status(StatusCodes.CREATED).send(response);
      } else {
        logger.error("No redirect URL available", session);
        throw ApiError.internal("Failed to create checkout session");
      }
    } catch (error) {
      logger.error("Failed to create checkout session", error);
      throw ApiError.internal("Failed to create checkout session");
    }
  },
};
