import { s } from "../../ts-rest";
import { contract } from "@open-source-economy/api-types";
import { newsletterSubscriptionRepo } from "../../db/";
import { combinedStripeRepo } from "../../db";
import { mailService } from "../../services";
import { ApiError } from "../../errors";

export const miscRouter = s.router(contract.misc, {
  subscribeNewsletter: async ({ body }) => {
    const existingSubscription = await newsletterSubscriptionRepo.getByEmail(body.email);

    if (!existingSubscription) {
      const subscription = { email: body.email } as any;
      await newsletterSubscriptionRepo.create(subscription);

      mailService.sendWebsiteAdminNotification(
        "New newsletter subscription",
        `${body.email} just subscribed to the newsletter`
      );
    }

    return { status: 201 as const, body: {} };
  },

  submitContactForm: async ({ body }) => {
    try {
      await mailService.sendContactFormEmail(body);
      return { status: 201 as const, body: {} };
    } catch (_error) {
      throw ApiError.internal(
        "Failed to send contact form. Please try again or email us directly at contact@open-source-economy.com"
      );
    }
  },

  getPlans: async () => {
    const prices = await combinedStripeRepo.getPlanProductsWithPrices();
    return {
      status: 200 as const,
      body: { plans: prices },
    };
  },
});
