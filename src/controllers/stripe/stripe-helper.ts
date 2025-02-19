import {
  stripeCustomerRepo,
  stripeCustomerUserRepo,
  userCompanyRepo,
} from "../../db/";
import Stripe from "stripe";
import {
  CompanyId,
  CompanyUserRole,
  StripeCustomer,
  StripeCustomerId,
  StripeCustomerUser,
  userUtils,
} from "../../model";
import { ApiError } from "../../model/error/ApiError";
import { StatusCodes } from "http-status-codes";
import { stripe } from "./index";
import { logger } from "../../config";
import { ValidationError } from "../../model/error";

export class StripeHelper {
  // to read:
  // Subscriptions with multiple products: https://docs.stripe.com/billing/subscriptions/multiple-products
  static async getOrCreateStripeCustomerUser(
    user: Express.User,
    countryCode: string | null,
  ): Promise<StripeCustomerUser | ApiError> {
    const exiting = await stripeCustomerUserRepo.getByUserId(user.id);

    if (exiting) {
      logger.debug("Stripe customer already exists", exiting);
      return exiting;
    } else {
      const companies: [CompanyId, CompanyUserRole][] =
        await userCompanyRepo.getByUserId(user.id);
      if (companies.length > 1) {
        return new ApiError(
          StatusCodes.NOT_IMPLEMENTED,
          "Multiple companies not supported",
        );
      } else if (companies.length === 1) {
        return new ApiError(
          StatusCodes.NOT_IMPLEMENTED,
          "Company user not supported yes ",
        );

        // const address = await addressRepo.getCompanyUserAddress(user.id);
      }

      let stripeAddress: Stripe.Emptyable<Stripe.AddressParam> = {
        country: countryCode ?? undefined,
      };

      const customerCreateParams: Stripe.CustomerCreateParams = {
        description: user.id.uuid,
        email: userUtils.email(user) ?? undefined,
        address: stripeAddress,
      };

      logger.debug("Creating Stripe customer", customerCreateParams);

      const customer: Stripe.Customer =
        await stripe.customers.create(customerCreateParams);
      const stripeCustomer = StripeCustomer.fromStripeApi(customer);
      if (stripeCustomer instanceof ValidationError) throw stripeCustomer;
      const stripeCustomerUser: StripeCustomerUser = new StripeCustomerUser(
        new StripeCustomerId(customer.id),
        user.id,
      );

      await stripeCustomerRepo.insert(stripeCustomer);
      await stripeCustomerUserRepo.insert(stripeCustomerUser);

      return stripeCustomerUser;
    }
  }
}
