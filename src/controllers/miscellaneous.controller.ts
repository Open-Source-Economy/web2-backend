import { Request, Response } from "express";
import { newsletterSubscriptionRepo } from "../db/";
import * as dto from "@open-source-economy/api-types";
import { StatusCodes } from "http-status-codes";
import { mailService } from "../services";
import { logger } from "../config";

export interface MiscellaneousController {
  subscribeToNewsletter(
    req: Request<
      dto.SubscribeNewsletterParams,
      dto.SubscribeNewsletterResponse,
      dto.SubscribeNewsletterBody,
      dto.SubscribeNewsletterQuery
    >,
    res: Response<dto.SubscribeNewsletterResponse>,
  ): Promise<void>;

  submitContactForm(
    req: Request<
      dto.SubmitContactFormParams,
      dto.SubmitContactFormResponse,
      dto.SubmitContactFormBody,
      dto.SubmitContactFormQuery
    >,
    res: Response<dto.SubmitContactFormResponse>,
  ): Promise<void>;
}

export const MiscellaneousController: MiscellaneousController = {
  async subscribeToNewsletter(
    req: Request<
      dto.SubscribeNewsletterParams,
      dto.SubscribeNewsletterResponse,
      dto.SubscribeNewsletterBody,
      dto.SubscribeNewsletterQuery
    >,
    res: Response<dto.SubscribeNewsletterResponse>,
  ) {
    const existingSubscription = await newsletterSubscriptionRepo.getByEmail(
      req.body.email,
    );

    if (existingSubscription) {
      const response: dto.SubscribeNewsletterResponse = {};
      res.status(StatusCodes.OK).send(response);
    } else {
      const subscription = { email: req.body.email } as any;
      await newsletterSubscriptionRepo.create(subscription);

      mailService.sendWebsiteAdminNotification(
        "New newsletter subscription",
        `${req.body.email} just subscribed to the newsletter`,
      );

      const response: dto.SubscribeNewsletterResponse = {};
      res.status(StatusCodes.CREATED).send(response);
    }
  },

  async submitContactForm(
    req: Request<
      dto.SubmitContactFormParams,
      dto.SubmitContactFormResponse,
      dto.SubmitContactFormBody,
      dto.SubmitContactFormQuery
    >,
    res: Response<dto.SubmitContactFormResponse>,
  ) {
    try {
      // Send email with all the contact form data
      await mailService.sendContactFormEmail(req.body);

      const response: dto.SubmitContactFormResponse = {};
      res.status(StatusCodes.OK).send(response);
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
