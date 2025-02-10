import { Request, Response } from "express";
import { dowNumberRepo, newsletterSubscriptionRepo, userRepo } from "../db/";
import {
  GetAvailableDowBody,
  GetAvailableDowParams,
  GetAvailableDowQuery,
  GetAvailableDowResponse,
  ResponseBody,
  SetUserPreferredCurrencyBody,
  SetUserPreferredCurrencyParams,
  SetUserPreferredCurrencyQuery,
  SetUserPreferredCurrencyResponse,
} from "../dtos";
import { StatusCodes } from "http-status-codes";
import { CompanyId, Currency, UserId } from "../model";
import { ApiError } from "../model/error/ApiError";
import {
  NewsletterSubscriptionBody,
  NewsletterSubscriptionParams,
  NewsletterSubscriptionQuery,
  NewsletterSubscriptionResponse,
} from "../dtos/NewsletterSubscription.dto";
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
