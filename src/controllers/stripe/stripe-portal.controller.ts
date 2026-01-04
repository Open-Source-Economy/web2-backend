import { Request, Response } from "express";
import { StatusCodes } from "http-status-codes";
import * as dto from "@open-source-economy/api-types";
import { ApiError, StripeCustomerUser } from "@open-source-economy/api-types";
import { StripeHelper } from "./stripe.helper";
import { stripe } from "./index";
import { logger } from "../../config";

// Temporary local definitions until api-types package is updated/linked
export interface CreatePortalSessionBody {
  returnUrl: string;
}
export interface CreatePortalSessionResponse {
  url: string;
}

export interface StripePortalController {
  createPortalSession(
    req: Request<
      {},
      dto.ResponseBody<CreatePortalSessionResponse>,
      CreatePortalSessionBody,
      {}
    >,
    res: Response<dto.ResponseBody<CreatePortalSessionResponse>>,
  ): Promise<void>;
}

export const StripePortalController: StripePortalController = {
  /**
   * Create a Stripe Billing Portal session for the customer
   *
   * DOC: https://docs.stripe.com/billing/subscriptions/customer-portal
   * @param req
   * @param res
   */
  async createPortalSession(
    req: Request<
      {},
      dto.ResponseBody<CreatePortalSessionResponse>,
      CreatePortalSessionBody,
      {}
    >,
    res: Response<dto.ResponseBody<CreatePortalSessionResponse>>,
  ) {
    if (!req.user) {
      throw new ApiError(StatusCodes.UNAUTHORIZED, "User not authenticated");
    }

    logger.debug("Stripe portal session request received", req.body);

    const stripeCustomerUser = await StripeHelper.getOrCreateStripeCustomerUser(
      req.user,
      null, // countryCode is optional here as it should already exist or we use defaults
    );

    if (stripeCustomerUser instanceof ApiError) {
      throw stripeCustomerUser;
    }

    try {
      const session = await stripe.billingPortal.sessions.create({
        customer: stripeCustomerUser.stripeCustomerId.id,
        return_url: req.body.returnUrl,
      });

      if (session.url) {
        logger.debug("Created portal session", session);
        const response: CreatePortalSessionResponse = {
          url: session.url,
        };
        res.status(StatusCodes.CREATED).send({ success: response });
      } else {
        logger.error("No portal URL available", session);
        throw new ApiError(
          StatusCodes.INTERNAL_SERVER_ERROR,
          "Failed to create portal session",
        );
      }
    } catch (error) {
      logger.error("Failed to create portal session", error);
      throw new ApiError(
        StatusCodes.INTERNAL_SERVER_ERROR,
        "Failed to create portal session",
      );
    }
  },
};
