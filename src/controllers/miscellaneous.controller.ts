import { Request, Response } from "express";
import { newsletterSubscriptionRepo } from "../db/";
import {
  NewsletterSubscriptionBody,
  NewsletterSubscriptionParams,
  NewsletterSubscriptionQuery,
  NewsletterSubscriptionResponse,
  ResponseBody,
} from "../dtos";
import { StatusCodes } from "http-status-codes";
import { NewsletterSubscription } from "../model/NewsletterSubscription";
import { mailService } from "../services";

export class MiscellaneousController {
  static async subscribeToNewsletter(
    req: Request<
      NewsletterSubscriptionParams,
      ResponseBody<NewsletterSubscriptionResponse>,
      NewsletterSubscriptionBody,
      NewsletterSubscriptionQuery
    >,
    res: Response<ResponseBody<NewsletterSubscriptionResponse>>,
  ) {
    const existingSubscription = await newsletterSubscriptionRepo.getByEmail(
      req.body.email,
    );

    if (existingSubscription) {
      const response: NewsletterSubscriptionResponse = {};
      return res.status(StatusCodes.OK).send({ success: response });
    } else {
      const subscription = new NewsletterSubscription(req.body.email);
      await newsletterSubscriptionRepo.create(subscription);

      mailService.sendWebsiteAdminNotification(
        "New newsletter subscription",
        `${req.body.email} just subscribed to the newsletter 😁`,
      );

      const response: NewsletterSubscriptionResponse = {};
      return res.status(StatusCodes.CREATED).send({ success: response });
    }
  }
}
