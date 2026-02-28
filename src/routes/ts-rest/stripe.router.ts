import { s } from "../../ts-rest";
import { contract } from "@open-source-economy/api-types";
import Stripe from "stripe";
import { StripeHelper, stripe } from "../../controllers/stripe";
import { ApiError } from "../../errors";
import { logger } from "../../config";

export const stripeRouter = s.router(contract.stripe, {
  checkout: async ({ body, req }) => {
    let customer: any = null;

    if (req.user) {
      const stripeCustomerUser = await StripeHelper.getOrCreateStripeCustomerUser(req.user as any, body.countryCode);
      if (stripeCustomerUser instanceof ApiError) {
        throw ApiError.internal("Failed to get or create Stripe customer");
      } else {
        customer = stripeCustomerUser;
      }
    }

    const items: Stripe.Checkout.SessionCreateParams.LineItem[] = [];
    for (const item of (body as any).priceItems) {
      items.push({
        price: item.priceId.id ?? item.priceId,
        quantity: item.quantity,
      });
    }

    const params: Stripe.Checkout.SessionCreateParams = {
      mode: (body as any).mode,
      invoice_creation: (body as any).mode === "payment" ? { enabled: true } : undefined,
      line_items: items,
      customer: customer?.stripeCustomerId,
      customer_email: customer ? undefined : req.user ? ((req.user as any).email ?? undefined) : undefined,
      allow_promotion_codes: true,
      metadata: (body as any).metadata,
      success_url: `${body.successUrl}?session_id={CHECKOUT_SESSION_ID}&mode=${(body as any).mode}`,
      cancel_url: `${body.cancelUrl}`,
    };

    try {
      const session = await stripe.checkout.sessions.create(params);

      if (session.url) {
        return {
          status: 201 as const,
          body: { redirectUrl: session.url },
        };
      } else {
        throw ApiError.internal("Failed to create checkout session");
      }
    } catch (error) {
      if (error instanceof ApiError) throw error;
      logger.error("Failed to create checkout session", error);
      throw ApiError.internal("Failed to create checkout session");
    }
  },
});
