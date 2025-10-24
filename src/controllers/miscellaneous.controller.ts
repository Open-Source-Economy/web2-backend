import { Request, Response } from "express";
import { newsletterSubscriptionRepo } from "../db/";
import * as dto from "@open-source-economy/api-types";
import { NewsletterSubscription } from "@open-source-economy/api-types";
import { StatusCodes } from "http-status-codes";
import { mailService } from "../services";
import { logger } from "../config";

export interface MiscellaneousController {
  subscribeToNewsletter(
    req: Request<
      dto.NewsletterSubscriptionParams,
      dto.ResponseBody<dto.NewsletterSubscriptionResponse>,
      dto.NewsletterSubscriptionBody,
      dto.NewsletterSubscriptionQuery
    >,
    res: Response<dto.ResponseBody<dto.NewsletterSubscriptionResponse>>,
  ): Promise<void>;

  submitContactForm(
    req: Request<
      dto.ContactFormParams,
      dto.ResponseBody<dto.ContactFormResponse>,
      dto.ContactFormBody,
      dto.ContactFormQuery
    >,
    res: Response<dto.ResponseBody<dto.ContactFormResponse>>,
  ): Promise<void>;
}

export const MiscellaneousController: MiscellaneousController = {
  async subscribeToNewsletter(
    req: Request<
      dto.NewsletterSubscriptionParams,
      dto.ResponseBody<dto.NewsletterSubscriptionResponse>,
      dto.NewsletterSubscriptionBody,
      dto.NewsletterSubscriptionQuery
    >,
    res: Response<dto.ResponseBody<dto.NewsletterSubscriptionResponse>>,
  ) {
    const existingSubscription = await newsletterSubscriptionRepo.getByEmail(
      req.body.email,
    );

    if (existingSubscription) {
      const response: dto.NewsletterSubscriptionResponse = {};
      res.status(StatusCodes.OK).send({ success: response });
    } else {
      const subscription = new NewsletterSubscription(req.body.email);
      await newsletterSubscriptionRepo.create(subscription);

      mailService.sendWebsiteAdminNotification(
        "New newsletter subscription",
        `${req.body.email} just subscribed to the newsletter 😁`,
      );

      const response: dto.NewsletterSubscriptionResponse = {};
      res.status(StatusCodes.CREATED).send({ success: response });
    }
  },

  async submitContactForm(
    req: Request<
      dto.ContactFormParams,
      dto.ResponseBody<dto.ContactFormResponse>,
      dto.ContactFormBody,
      dto.ContactFormQuery
    >,
    res: Response<dto.ResponseBody<dto.ContactFormResponse>>,
  ) {
    try {
      // Send email with all the contact form data
      await mailService.sendContactFormEmail(req.body);

      const response: dto.ContactFormResponse = {};
      res.status(StatusCodes.OK).send({ success: response });
    } catch (error) {
      logger.error("Error submitting contact form:", error);
      res.status(StatusCodes.INTERNAL_SERVER_ERROR).send({
        error: {
          code: StatusCodes.INTERNAL_SERVER_ERROR,
          message:
            "Failed to send contact form. Please try again or email us directly at contact@open-source-economy.com",
        },
      });
    }
  },
};
