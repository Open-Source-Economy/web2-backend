import { Request, Response } from "express";
import { newsletterSubscriptionRepo } from "../db/";
import * as dto from "@open-source-economy/api-types";
import { NewsletterSubscription } from "@open-source-economy/api-types";
import { StatusCodes } from "http-status-codes";
import { mailService } from "../services";

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
};
